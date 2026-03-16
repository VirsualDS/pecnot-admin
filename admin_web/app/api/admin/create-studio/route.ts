import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";

type LicenseStatus = "active" | "suspended" | "expired";
type BillingCycle = "monthly" | "semiannual" | "annual";

type CreateStudioBody = {
  studioName?: string;
  loginEmail?: string;
  password?: string;
  billingCycle?: BillingCycle;
  licenseStatus?: LicenseStatus;
  licenseStartsAt?: string;
  licenseExpiresAt?: string;
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

function computeDefaultLicenseExpiresAt(
  startsAt: Date,
  billingCycle: BillingCycle
): Date {
  switch (billingCycle) {
    case "monthly":
      return addMonths(startsAt, 1);
    case "semiannual":
      return addMonths(startsAt, 6);
    case "annual":
      return addMonths(startsAt, 12);
  }
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

    const body = (await request.json()) as CreateStudioBody;

    const studioName = body.studioName?.trim() ?? "";
    const loginEmail = body.loginEmail?.trim().toLowerCase() ?? "";
    const password = body.password?.trim() ?? "";
    const billingCycleRaw = body.billingCycle?.trim() ?? "";
    const licenseStatusRaw = body.licenseStatus?.trim() ?? "active";
    const notes = body.notes?.trim() ?? "";

    if (!studioName) {
      return NextResponse.json(
        {
          ok: false,
          error: "studioName è obbligatorio",
        },
        { status: 400 }
      );
    }

    if (!loginEmail) {
      return NextResponse.json(
        {
          ok: false,
          error: "loginEmail è obbligatoria",
        },
        { status: 400 }
      );
    }

    if (!loginEmail.includes("@")) {
      return NextResponse.json(
        {
          ok: false,
          error: "loginEmail non valida",
        },
        { status: 400 }
      );
    }

    if (!password) {
      return NextResponse.json(
        {
          ok: false,
          error: "password è obbligatoria",
        },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        {
          ok: false,
          error: "La password deve contenere almeno 8 caratteri",
        },
        { status: 400 }
      );
    }

    if (!isValidBillingCycle(billingCycleRaw)) {
      return NextResponse.json(
        {
          ok: false,
          error: "billingCycle non valido",
        },
        { status: 400 }
      );
    }

    if (!isValidLicenseStatus(licenseStatusRaw)) {
      return NextResponse.json(
        {
          ok: false,
          error: "licenseStatus non valido",
        },
        { status: 400 }
      );
    }

    const licenseStartsAt = body.licenseStartsAt?.trim()
      ? new Date(body.licenseStartsAt)
      : new Date();

    if (Number.isNaN(licenseStartsAt.getTime())) {
      return NextResponse.json(
        {
          ok: false,
          error: "licenseStartsAt non valida",
        },
        { status: 400 }
      );
    }

    const licenseExpiresAt = body.licenseExpiresAt?.trim()
      ? new Date(body.licenseExpiresAt)
      : computeDefaultLicenseExpiresAt(licenseStartsAt, billingCycleRaw);

    if (Number.isNaN(licenseExpiresAt.getTime())) {
      return NextResponse.json(
        {
          ok: false,
          error: "licenseExpiresAt non valida",
        },
        { status: 400 }
      );
    }

    if (licenseExpiresAt <= licenseStartsAt) {
      return NextResponse.json(
        {
          ok: false,
          error: "licenseExpiresAt deve essere successiva a licenseStartsAt",
        },
        { status: 400 }
      );
    }

    const existingStudio = await prisma.studio.findUnique({
      where: {
        loginEmail,
      },
      select: {
        id: true,
      },
    });

    if (existingStudio) {
      return NextResponse.json(
        {
          ok: false,
          error: "Esiste già uno studio con questa email",
        },
        { status: 409 }
      );
    }

    const passwordHash = await hashPassword(password);

    const studio = await prisma.studio.create({
      data: {
        studioName,
        loginEmail,
        passwordHash,
        billingCycle: billingCycleRaw,
        licenseStatus: licenseStatusRaw,
        licenseStartsAt,
        licenseExpiresAt,
        notes: notes || null,
      },
      select: {
        id: true,
        studioName: true,
        loginEmail: true,
        billingCycle: true,
        licenseStatus: true,
        licenseStartsAt: true,
        licenseExpiresAt: true,
        createdAt: true,
      },
    });

    await prisma.auditEvent.create({
      data: {
        studioId: studio.id,
        eventType: "admin_create_studio",
        eventPayload: {
          studioName: studio.studioName,
          loginEmail: studio.loginEmail,
          billingCycle: studio.billingCycle,
          licenseStatus: studio.licenseStatus,
          licenseStartsAt: studio.licenseStartsAt.toISOString(),
          licenseExpiresAt: studio.licenseExpiresAt.toISOString(),
          notes: notes || null,
          createdManually: true,
        },
      },
    });

    return NextResponse.json({
      ok: true,
      studio,
    });
  } catch (error) {
    console.error("Admin create-studio API error:", error);

    return NextResponse.json(
      {
        ok: false,
        error: "Errore interno del server",
      },
      { status: 500 }
    );
  }
}