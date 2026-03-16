"use server";

import { createHash } from "crypto";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";

export type SetupPasswordActionState = {
  ok: boolean;
  message: string;
  fieldErrors?: {
    token?: string;
    password?: string;
    confirmPassword?: string;
    general?: string;
  };
};

const MIN_PASSWORD_LENGTH = 8;

function hashSetupToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function normalizeToken(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizePassword(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value : "";
}

export async function setupPasswordAction(
  _prevState: SetupPasswordActionState,
  formData: FormData
): Promise<SetupPasswordActionState> {
  const token = normalizeToken(formData.get("token"));
  const password = normalizePassword(formData.get("password"));
  const confirmPassword = normalizePassword(formData.get("confirmPassword"));

  const fieldErrors: NonNullable<SetupPasswordActionState["fieldErrors"]> = {};

  if (!token) {
    fieldErrors.token = "Token mancante o non valido.";
  }

  if (!password.trim()) {
    fieldErrors.password = "Inserisci una password.";
  } else if (password.trim().length < MIN_PASSWORD_LENGTH) {
    fieldErrors.password = `La password deve contenere almeno ${MIN_PASSWORD_LENGTH} caratteri.`;
  }

  if (!confirmPassword.trim()) {
    fieldErrors.confirmPassword = "Conferma la password.";
  } else if (password !== confirmPassword) {
    fieldErrors.confirmPassword = "Le password non coincidono.";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return {
      ok: false,
      message: "Controlla i campi evidenziati.",
      fieldErrors,
    };
  }

  const tokenHash = hashSetupToken(token);
  const now = new Date();

  try {
    const setupToken = await prisma.passwordSetupToken.findFirst({
      where: {
        tokenHash,
        usedAt: null,
        expiresAt: {
          gt: now,
        },
      },
      include: {
        studio: true,
      },
    });

    if (!setupToken) {
      return {
        ok: false,
        message: "Il link non è valido, è scaduto oppure è già stato usato.",
        fieldErrors: {
          token: "Token non valido, scaduto o già utilizzato.",
        },
      };
    }

    const newPasswordHash = await hashPassword(password);
    const usedAt = new Date();

    await prisma.$transaction(async (tx) => {
      const consumeResult = await tx.passwordSetupToken.updateMany({
        where: {
          id: setupToken.id,
          tokenHash,
          usedAt: null,
          expiresAt: {
            gt: usedAt,
          },
        },
        data: {
          usedAt,
        },
      });

      if (consumeResult.count !== 1) {
        throw new Error("TOKEN_ALREADY_USED_OR_EXPIRED");
      }

      await tx.studio.update({
        where: {
          id: setupToken.studioId,
        },
        data: {
          passwordHash: newPasswordHash,
        },
      });

      await tx.clientSession.updateMany({
        where: {
          studioId: setupToken.studioId,
          isRevoked: false,
        },
        data: {
          isRevoked: true,
        },
      });

      await tx.auditEvent.create({
        data: {
          studioId: setupToken.studioId,
          eventType: "password_setup_completed",
          eventPayload: {
            email: setupToken.studio.loginEmail,
            tokenId: setupToken.id,
            completedAt: usedAt.toISOString(),
            revokedExistingSessions: true,
          },
        },
      });
    });

    revalidatePath("/");
    revalidatePath("/studios");
    revalidatePath(`/studios/${setupToken.studioId}`);

    return {
      ok: true,
      message: "Password impostata correttamente. Adesso puoi accedere al client PECNOT con le nuove credenziali.",
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "UNKNOWN_SETUP_PASSWORD_ERROR";

    if (message === "TOKEN_ALREADY_USED_OR_EXPIRED") {
      return {
        ok: false,
        message: "Il link non è più utilizzabile. Richiedi un nuovo collegamento.",
        fieldErrors: {
          token: "Token già usato o scaduto durante la conferma.",
        },
      };
    }

    console.error("PECNOT setup-password action error:", error);

    return {
      ok: false,
      message: "Errore interno durante l'impostazione della password.",
      fieldErrors: {
        general: "Errore interno durante il salvataggio. Riprova.",
      },
    };
  }
}