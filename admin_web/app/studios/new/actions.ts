"use server";

import { revalidatePath } from "next/cache";

export type CreateStudioActionState = {
  ok: boolean;
  message: string;
};

async function callAdminApi(
  path: string,
  payload: Record<string, unknown>
): Promise<{ ok: boolean; error?: string; studio?: { id: string } }> {
  const adminApiKey = process.env.ADMIN_API_KEY?.trim() ?? "";
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim() ?? "";

  if (!adminApiKey) {
    return {
      ok: false,
      error: "ADMIN_API_KEY non configurata sul server",
    };
  }

  if (!appUrl) {
    return {
      ok: false,
      error: "NEXT_PUBLIC_APP_URL non configurata sul server",
    };
  }

  try {
    const response = await fetch(`${appUrl}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-admin-api-key": adminApiKey,
      },
      body: JSON.stringify(payload),
      cache: "no-store",
    });

    const data = (await response.json().catch(() => null)) as
      | {
          ok?: boolean;
          error?: string;
          studio?: { id: string };
        }
      | null;

    if (!response.ok || !data?.ok) {
      return {
        ok: false,
        error: data?.error || `Richiesta fallita (${response.status})`,
      };
    }

    return {
      ok: true,
      studio: data.studio,
    };
  } catch (error) {
    console.error("Create studio action bridge error:", error);

    return {
      ok: false,
      error: "Errore di comunicazione con le API admin",
    };
  }
}

export async function createStudioAction(
  _prevState: CreateStudioActionState,
  formData: FormData
): Promise<CreateStudioActionState> {
  const studioName = String(formData.get("studioName") ?? "").trim();
  const loginEmail = String(formData.get("loginEmail") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "").trim();
  const billingCycle = String(formData.get("billingCycle") ?? "").trim();
  const licenseStatus = String(formData.get("licenseStatus") ?? "").trim();
  const licenseStartsAt = String(formData.get("licenseStartsAt") ?? "").trim();
  const licenseExpiresAt = String(formData.get("licenseExpiresAt") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();

  if (!studioName) {
    return {
      ok: false,
      message: "Nome studio obbligatorio",
    };
  }

  if (!loginEmail) {
    return {
      ok: false,
      message: "Email login obbligatoria",
    };
  }

  if (!password) {
    return {
      ok: false,
      message: "Password obbligatoria",
    };
  }

  if (password.length < 8) {
    return {
      ok: false,
      message: "La password deve contenere almeno 8 caratteri",
    };
  }

  if (!billingCycle) {
    return {
      ok: false,
      message: "Ciclo licenza obbligatorio",
    };
  }

  if (!licenseStatus) {
    return {
      ok: false,
      message: "Stato licenza obbligatorio",
    };
  }

  const result = await callAdminApi("/api/admin/create-studio", {
    studioName,
    loginEmail,
    password,
    billingCycle,
    licenseStatus,
    licenseStartsAt: licenseStartsAt || undefined,
    licenseExpiresAt: licenseExpiresAt || undefined,
    notes: notes || undefined,
  });

  revalidatePath("/studios");
  revalidatePath("/");

  if (result.studio?.id) {
    revalidatePath(`/studios/${result.studio.id}`);
  }

  if (!result.ok) {
    return {
      ok: false,
      message: result.error || "Creazione studio fallita",
    };
  }

  return {
    ok: true,
    message: "Studio creato correttamente.",
  };
}