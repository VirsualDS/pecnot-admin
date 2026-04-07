import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type ReactivateLicenseBody = {
  studioId?: string;
  loginEmail?: string;
};

type BillingCycle = "trial" | "monthly" | "semiannual" | "annual";
type LicenseStatus = "active" | "trial" | "suspended" | "expired";

function getAdminApiKey(request: Request): string {
  return request.headers.get("x-admin-api-key")?.trim() ?? "";
}

function getReactivatedStatus(params: {
  billingCycle: BillingCycle;
  licenseExpiresAt: Date;
  now: Date;
}): LicenseStatus {
  const { billingCycle, licenseExpiresAt, now } = params;

  if (licenseExpiresAt < now) {
    return "expired";
  }

  if (billingCycle === "trial") {
    return "trial";
  }

  return "active";
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

    const body = (await request.json()) as ReactivateLicenseBody;

    const studioId = body.studioId?.trim() ?? "";
    const loginEmail = body.loginEmail?.trim().toLowerCase() ?? "";

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
        billingCycle: true,
        licenseStatus: true,
        licenseExpiresAt: true,
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

    const now = new Date();
    const nextStatus = getReactivatedStatus({
      billingCycle: studio.billingCycle as BillingCycle,
      licenseExpiresAt: studio.licenseExpiresAt,
      now,
    });

    await prisma.studio.update({
      where: {
        id: studio.id,
      },
      data: {
        licenseStatus: nextStatus,
      },
    });

    await prisma.auditEvent.create({
      data: {
        studioId: studio.id,
        eventType: "admin_reactivate_license",
        eventPayload: {
          loginEmail: studio.loginEmail,
          billingCycle: studio.billingCycle,
          previousLicenseStatus: studio.licenseStatus,
          newLicenseStatus: nextStatus,
          licenseExpiresAt: studio.licenseExpiresAt.toISOString(),
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
      licenseStatus: nextStatus,
    });
  } catch (error) {
    console.error("Admin reactivate-license API error:", error);

    return NextResponse.json(
      {
        ok: false,
        error: "Errore interno del server",
      },
      { status: 500 }
    );
  }
}