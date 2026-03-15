import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type RevokeSessionBody = {
  studioId?: string;
  loginEmail?: string;
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

    const body = (await request.json()) as RevokeSessionBody;

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
      where: studioId
        ? { id: studioId }
        : { loginEmail },
      select: {
        id: true,
        studioName: true,
        loginEmail: true,
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

    const revokeResult = await prisma.clientSession.updateMany({
      where: {
        studioId: studio.id,
        isRevoked: false,
      },
      data: {
        isRevoked: true,
      },
    });

    await prisma.auditEvent.create({
      data: {
        studioId: studio.id,
        eventType: "admin_revoke_all_sessions",
        eventPayload: {
          revokedCount: revokeResult.count,
          loginEmail: studio.loginEmail,
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
      revokedCount: revokeResult.count,
    });
  } catch (error) {
    console.error("Admin revoke-session API error:", error);

    return NextResponse.json(
      {
        ok: false,
        error: "Errore interno del server",
      },
      { status: 500 }
    );
  }
}