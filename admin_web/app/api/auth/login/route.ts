import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/auth";
import { generateSessionToken, hashSessionToken } from "@/lib/session";

type LoginBody = {
  email?: string;
  password?: string;
  machineFingerprint?: string;
  machineName?: string;
  osName?: string;
  appVersion?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as LoginBody;

    const email = body.email?.trim().toLowerCase() ?? "";
    const password = body.password?.trim() ?? "";
    const machineFingerprint =
      body.machineFingerprint?.trim() || "dev-local-machine";
    const machineName = body.machineName?.trim() || "Local Dev Machine";
    const osName = body.osName?.trim() || "Windows";
    const appVersion = body.appVersion?.trim() || "dev";

    if (!email || !password) {
      return NextResponse.json(
        {
          ok: false,
          error: "Email e password sono obbligatorie",
        },
        { status: 400 }
      );
    }

    const studio = await prisma.studio.findUnique({
      where: {
        loginEmail: email,
      },
      select: {
        id: true,
        studioName: true,
        loginEmail: true,
        passwordHash: true,
        licenseStatus: true,
        billingCycle: true,
        licenseStartsAt: true,
        licenseExpiresAt: true,
      },
    });

    if (!studio) {
      return NextResponse.json(
        {
          ok: false,
          error: "Credenziali non valide",
        },
        { status: 401 }
      );
    }

    const passwordOk = await verifyPassword(password, studio.passwordHash);

    if (!passwordOk) {
      return NextResponse.json(
        {
          ok: false,
          error: "Credenziali non valide",
        },
        { status: 401 }
      );
    }

    const now = new Date();
    const isExpired = studio.licenseExpiresAt < now;

    if (studio.licenseStatus === "suspended") {
      return NextResponse.json(
        {
          ok: false,
          error: "Licenza sospesa",
          licenseStatus: "suspended",
        },
        { status: 403 }
      );
    }

    if (studio.licenseStatus === "expired" || isExpired) {
      return NextResponse.json(
        {
          ok: false,
          error: "Licenza scaduta",
          licenseStatus: "expired",
          licenseExpiresAt: studio.licenseExpiresAt,
        },
        { status: 403 }
      );
    }

    const installation = await prisma.installation.upsert({
      where: {
        studioId_machineFingerprint: {
          studioId: studio.id,
          machineFingerprint,
        },
      },
      update: {
        machineName,
        osName,
        appVersion,
        lastSeenAt: now,
      },
      create: {
        studioId: studio.id,
        machineFingerprint,
        machineName,
        osName,
        appVersion,
        firstSeenAt: now,
        lastSeenAt: now,
      },
    });

    const sessionToken = generateSessionToken();
    const sessionTokenHash = hashSessionToken(sessionToken);

    const clientSession = await prisma.clientSession.create({
      data: {
        studioId: studio.id,
        installationId: installation.id,
        sessionTokenHash,
        issuedAt: now,
        lastValidatedAt: now,
        isRevoked: false,
      },
    });

    await prisma.studio.update({
      where: {
        id: studio.id,
      },
      data: {
        lastSuccessfulCheckAt: now,
      },
    });

    await prisma.auditEvent.create({
      data: {
        studioId: studio.id,
        eventType: "client_login_success",
        eventPayload: {
          email: studio.loginEmail,
          installationId: installation.id,
          machineFingerprint,
          machineName,
          osName,
          appVersion,
          clientSessionId: clientSession.id,
        },
      },
    });

    return NextResponse.json({
      ok: true,
      studio: {
        id: studio.id,
        studioName: studio.studioName,
        loginEmail: studio.loginEmail,
      },
      license: {
        status: "active",
        billingCycle: studio.billingCycle,
        licenseStartsAt: studio.licenseStartsAt,
        licenseExpiresAt: studio.licenseExpiresAt,
      },
      session: {
        token: sessionToken,
        issuedAt: clientSession.issuedAt,
      },
      installation: {
        id: installation.id,
        machineFingerprint: installation.machineFingerprint,
        machineName: installation.machineName,
        osName: installation.osName,
        appVersion: installation.appVersion,
      },
    });
  } catch (error) {
    console.error("Login API error:", error);

    return NextResponse.json(
      {
        ok: false,
        error: "Errore interno del server",
      },
      { status: 500 }
    );
  }
}