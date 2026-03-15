import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";

type ChangeStudioPasswordBody = {
  studioId?: string;
  loginEmail?: string;
  newPassword?: string;
  revokeSessions?: boolean;
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

    const body = (await request.json()) as ChangeStudioPasswordBody;

    const studioId = body.studioId?.trim() ?? "";
    const loginEmail = body.loginEmail?.trim().toLowerCase() ?? "";
    const newPassword = body.newPassword?.trim() ?? "";
    const revokeSessions = body.revokeSessions !== false;

    if (!studioId && !loginEmail) {
      return NextResponse.json(
        {
          ok: false,
          error: "studioId o loginEmail sono obbligatori",
        },
        { status: 400 }
      );
    }

    if (!newPassword) {
      return NextResponse.json(
        {
          ok: false,
          error: "newPassword è obbligatoria",
        },
        { status: 400 }
      );
    }

    if (newPassword.length < 8) {
      return NextResponse.json(
        {
          ok: false,
          error: "La nuova password deve contenere almeno 8 caratteri",
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

    const passwordHash = await hashPassword(newPassword);

    await prisma.studio.update({
      where: {
        id: studio.id,
      },
      data: {
        passwordHash,
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
        eventType: "admin_change_studio_password",
        eventPayload: {
          loginEmail: studio.loginEmail,
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
      passwordChanged: true,
      revokeSessions,
      revokedCount,
    });
  } catch (error) {
    console.error("Admin change-studio-password API error:", error);

    return NextResponse.json(
      {
        ok: false,
        error: "Errore interno del server",
      },
      { status: 500 }
    );
  }
}