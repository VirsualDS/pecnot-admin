import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashSessionToken } from "@/lib/session";

type LicenseCheckBody = {
  sessionToken?: string;
  machineFingerprint?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as LicenseCheckBody;

    const sessionToken = body.sessionToken?.trim() ?? "";
    const machineFingerprint = body.machineFingerprint?.trim() ?? "";

    if (!sessionToken || !machineFingerprint) {
      return NextResponse.json(
        {
          ok: false,
          error: "sessionToken e machineFingerprint sono obbligatori",
        },
        { status: 400 }
      );
    }

    const sessionTokenHash = hashSessionToken(sessionToken);

    const clientSession = await prisma.clientSession.findUnique({
      where: {
        sessionTokenHash,
      },
      include: {
        studio: true,
        installation: true,
      },
    });

    if (!clientSession || clientSession.isRevoked) {
      return NextResponse.json(
        {
          ok: false,
          error: "Sessione non valida",
        },
        { status: 401 }
      );
    }

    if (!clientSession.installation) {
      return NextResponse.json(
        {
          ok: false,
          error: "Installazione non trovata",
        },
        { status: 401 }
      );
    }

    if (clientSession.installation.machineFingerprint !== machineFingerprint) {
      return NextResponse.json(
        {
          ok: false,
          error: "Machine fingerprint non valido",
        },
        { status: 401 }
      );
    }

    const now = new Date();
    const studio = clientSession.studio;
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

    await prisma.clientSession.update({
      where: {
        id: clientSession.id,
      },
      data: {
        lastValidatedAt: now,
      },
    });

    await prisma.installation.update({
      where: {
        id: clientSession.installation.id,
      },
      data: {
        lastSeenAt: now,
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
        eventType: "license_check_success",
        eventPayload: {
          clientSessionId: clientSession.id,
          installationId: clientSession.installation.id,
          machineFingerprint,
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
        valid: true,
        lastValidatedAt: now,
      },
    });
  } catch (error) {
    console.error("License check API error:", error);

    return NextResponse.json(
      {
        ok: false,
        error: "Errore interno del server",
      },
      { status: 500 }
    );
  }
}