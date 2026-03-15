import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashSessionToken } from "@/lib/session";

type LogoutBody = {
  sessionToken?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as LogoutBody;

    const sessionToken = body.sessionToken?.trim() ?? "";

    if (!sessionToken) {
      return NextResponse.json(
        {
          ok: false,
          error: "sessionToken è obbligatorio",
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

    if (!clientSession) {
      return NextResponse.json(
        {
          ok: false,
          error: "Sessione non trovata",
        },
        { status: 404 }
      );
    }

    if (clientSession.isRevoked) {
      return NextResponse.json({
        ok: true,
        revoked: true,
        alreadyRevoked: true,
      });
    }

    await prisma.clientSession.update({
      where: {
        id: clientSession.id,
      },
      data: {
        isRevoked: true,
      },
    });

    await prisma.auditEvent.create({
      data: {
        studioId: clientSession.studioId,
        eventType: "client_logout",
        eventPayload: {
          clientSessionId: clientSession.id,
          installationId: clientSession.installationId,
          machineFingerprint:
            clientSession.installation?.machineFingerprint ?? null,
        },
      },
    });

    return NextResponse.json({
      ok: true,
      revoked: true,
    });
  } catch (error) {
    console.error("Logout API error:", error);

    return NextResponse.json(
      {
        ok: false,
        error: "Errore interno del server",
      },
      { status: 500 }
    );
  }
}