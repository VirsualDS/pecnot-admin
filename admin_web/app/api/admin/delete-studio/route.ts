import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type DeleteStudioBody = {
  studioId?: string;
  loginEmail?: string;
  confirmText?: string;
};

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

    const body = (await request.json()) as DeleteStudioBody;

    const studioId = body.studioId?.trim() ?? "";
    const loginEmail = body.loginEmail?.trim().toLowerCase() ?? "";
    const confirmText = body.confirmText?.trim() ?? "";

    if (!studioId && !loginEmail) {
      return NextResponse.json(
        {
          ok: false,
          error: "studioId o loginEmail sono obbligatori",
        },
        { status: 400 }
      );
    }

    if (confirmText !== "ELIMINA") {
      return NextResponse.json(
        {
          ok: false,
          error: 'Conferma non valida. Scrivi esattamente "ELIMINA".',
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

    await prisma.auditEvent.create({
      data: {
        studioId: studio.id,
        eventType: "admin_delete_studio_requested",
        eventPayload: {
          studioName: studio.studioName,
          loginEmail: studio.loginEmail,
          billingCycle: studio.billingCycle,
          licenseStatus: studio.licenseStatus,
          confirmedWith: confirmText,
        },
      },
    });

    await prisma.studio.delete({
      where: {
        id: studio.id,
      },
    });

    return NextResponse.json({
      ok: true,
      deleted: true,
      studio: {
        id: studio.id,
        studioName: studio.studioName,
        loginEmail: studio.loginEmail,
      },
    });
  } catch (error) {
    console.error("Admin delete-studio API error:", error);

    return NextResponse.json(
      {
        ok: false,
        error: "Errore interno del server",
      },
      { status: 500 }
    );
  }
}