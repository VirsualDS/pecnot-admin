import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type SuspendLicenseBody = {
  studioId?: string;
  loginEmail?: string;
  revokeSessions?: boolean;
};

type LicenseStatus = "active" | "trial" | "suspended" | "expired";

function getAdminApiKey(request: Request): string {
  return request.headers.get("x-admin-api-key")?.trim() ?? "";
}

export async function POST(request: Request) {
  try {
    const expectedKey = process.env.ADMIN_API_KEY?.trim() ?? "";
    const providedKey = getAdminApiKey(request);

    if (!expectedKey) {
      return NextResponse.json(
        {
          ok: false,
          error: "ADMIN_API_KEY non configurata sul server",
        },
        { status: 500 }
      );
    }

    if (!providedKey || providedKey !== expectedKey) {
      return NextResponse.json(
        {
          ok: false,
          error: "Non autorizzato",
        },
        { status: 401 }
      );
    }

    const body = (await request.json()) as SuspendLicenseBody;

    const studioId = body.studioId?.trim() ?? "";
    const loginEmail = body.loginEmail?.trim().toLowerCase() ?? "";
    const revokeSessions = Boolean(body.revokeSessions);

    if (!studioId && !loginEmail) {
      return NextResponse.json(
        {
          ok: false,
          error: "studioId o loginEmail sono obbligatori",
        },
        { status: 400 }
      );
    }

    const studio = await prisma.studio.findFirst({
      where: studioId ? { id: studioId } : { loginEmail },
      select: {
        id: true,
        studioName: true,
        loginEmail: true,
        licenseStatus: true,
      },
    });

    if (!studio) {
      return NextResponse.json(
        {
          ok: false,
          error: "Studio non trovato",
        },
        { status: 404 }
      );
    }

    await prisma.studio.update({
      where: {
        id: studio.id,
      },
      data: {
        licenseStatus: "suspended",
      },
    });

    let revokedCount = 0;

    if (revokeSessions) {
      const revokeResult = await prisma.clientSession.updateMany({
        where: {
          studioId: studio.id,
          isRevoked: false,
        },
        data: {
          isRevoked: true,
        },
      });

      revokedCount = revokeResult.count;
    }

    await prisma.auditEvent.create({
      data: {
        studioId: studio.id,
        eventType: "admin_suspend_license",
        eventPayload: {
          loginEmail: studio.loginEmail,
          previousLicenseStatus: studio.licenseStatus as LicenseStatus,
          newLicenseStatus: "suspended" as LicenseStatus,
          revokeSessions,
          revokedCount,
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
      licenseStatus: "suspended",
      revokeSessions,
      revokedCount,
    });
  } catch (error) {
    console.error("Admin suspend-license API error:", error);

    return NextResponse.json(
      {
        ok: false,
        error: "Errore interno del server",
      },
      { status: 500 }
    );
  }
}