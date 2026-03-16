import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type LicenseStatus = "active" | "suspended" | "expired";
type BillingCycle = "monthly" | "semiannual" | "annual";

type UpdateStudioLicenseBody = {
  studioId?: string;
  loginEmail?: string;
  billingCycle?: BillingCycle;
  licenseStatus?: LicenseStatus;
  licenseStartsAt?: string;
  notes?: string;
};

function getAdminApiKey(request: Request): string {
  return request.headers.get("x-admin-api-key")?.trim() ?? "";
}

function isValidBillingCycle(value: string): value is BillingCycle {
  return value === "monthly" || value === "semiannual" || value === "annual";
}

function isValidLicenseStatus(value: string): value is LicenseStatus {
  return value === "active" || value === "suspended" || value === "expired";
}

function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setUTCMonth(result.getUTCMonth() + months);
  return result;
}

function computeLicenseExpiresAt(
  licenseStartsAt: Date,
  billingCycle: BillingCycle
): Date {
  switch (billingCycle) {
    case "monthly":
      return addMonths(licenseStartsAt, 1);
    case "semiannual":
      return addMonths(licenseStartsAt, 6);
    case "annual":
      return addMonths(licenseStartsAt, 12);
  }
}

export async function POST(request: Request) {
  try {
    const expectedKey = process.env.ADMIN_API_KEY?.trim() ?? "";
    const providedKey = getAdminApiKey(request);

    if (!expectedKey) {
      return NextResponse.json(
        { ok: false, error: "ADMIN_API_KEY non configurata sul server" },
        { status: 500 }
      );
    }

    if (!providedKey || providedKey !== expectedKey) {
      return NextResponse.json(
        { ok: false, error: "Non autorizzato" },
        { status: 401 }
      );
    }

    const body = (await request.json()) as UpdateStudioLicenseBody;

    const studioId = body.studioId?.trim() ?? "";
    const loginEmail = body.loginEmail?.trim().toLowerCase() ?? "";
    const billingCycleRaw = body.billingCycle?.trim() ?? "";
    const licenseStatusRaw = body.licenseStatus?.trim() ?? "";
    const licenseStartsAtRaw = body.licenseStartsAt?.trim() ?? "";
    const notesRaw = body.notes ?? "";

    if (!studioId && !loginEmail) {
      return NextResponse.json(
        { ok: false, error: "studioId o loginEmail sono obbligatori" },
        { status: 400 }
      );
    }

    if (!isValidBillingCycle(billingCycleRaw)) {
      return NextResponse.json(
        { ok: false, error: "billingCycle non valido" },
        { status: 400 }
      );
    }

    if (!isValidLicenseStatus(licenseStatusRaw)) {
      return NextResponse.json(
        { ok: false, error: "licenseStatus non valido" },
        { status: 400 }
      );
    }

    if (!licenseStartsAtRaw) {
      return NextResponse.json(
        { ok: false, error: "licenseStartsAt è obbligatoria" },
        { status: 400 }
      );
    }

    const licenseStartsAt = new Date(licenseStartsAtRaw);

    if (Number.isNaN(licenseStartsAt.getTime())) {
      return NextResponse.json(
        { ok: false, error: "licenseStartsAt non valida" },
        { status: 400 }
      );
    }

    const licenseExpiresAt = computeLicenseExpiresAt(
      licenseStartsAt,
      billingCycleRaw
    );

    const studio = await prisma.studio.findFirst({
      where: studioId ? { id: studioId } : { loginEmail },
      select: {
        id: true,
        studioName: true,
        loginEmail: true,
        billingCycle: true,
        licenseStatus: true,
        licenseStartsAt: true,
        licenseExpiresAt: true,
        notes: true,
      },
    });

    if (!studio) {
      return NextResponse.json(
        { ok: false, error: "Studio non trovato" },
        { status: 404 }
      );
    }

    const notes =
      typeof notesRaw === "string" ? notesRaw.trim() || null : null;

    await prisma.studio.update({
      where: {
        id: studio.id,
      },
      data: {
        billingCycle: billingCycleRaw,
        licenseStatus: licenseStatusRaw,
        licenseStartsAt,
        licenseExpiresAt,
        notes,
      },
    });

    await prisma.auditEvent.create({
      data: {
        studioId: studio.id,
        eventType: "admin_update_studio_license",
        eventPayload: {
          loginEmail: studio.loginEmail,
          previous: {
            billingCycle: studio.billingCycle,
            licenseStatus: studio.licenseStatus,
            licenseStartsAt: studio.licenseStartsAt.toISOString(),
            licenseExpiresAt: studio.licenseExpiresAt.toISOString(),
            notes: studio.notes,
          },
          next: {
            billingCycle: billingCycleRaw,
            licenseStatus: licenseStatusRaw,
            licenseStartsAt: licenseStartsAt.toISOString(),
            licenseExpiresAt: licenseExpiresAt.toISOString(),
            notes,
          },
          expiresAtDerivedFromCycle: true,
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
      billingCycle: billingCycleRaw,
      licenseStatus: licenseStatusRaw,
      licenseStartsAt: licenseStartsAt.toISOString(),
      licenseExpiresAt: licenseExpiresAt.toISOString(),
      notes,
    });
  } catch (error) {
    console.error("Admin update-studio-license API error:", error);

    return NextResponse.json(
      { ok: false, error: "Errore interno del server" },
      { status: 500 }
    );
  }
}