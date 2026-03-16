"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

type AdminActionState = {
  ok: boolean;
  message: string;
};

async function callAdminApi(
  path: string,
  payload: Record<string, unknown>
): Promise<{
  ok: boolean;
  error?: string;
  licenseStatus?: string;
  revokedCount?: number;
  studio?: { id: string };
  billingCycle?: string;
  licenseStartsAt?: string;
  licenseExpiresAt?: string;
  notes?: string | null;
}> {
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
          licenseStatus?: string;
          revokedCount?: number;
          studio?: { id: string };
          billingCycle?: string;
          licenseStartsAt?: string;
          licenseExpiresAt?: string;
          notes?: string | null;
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
      licenseStatus: data.licenseStatus,
      revokedCount: data.revokedCount,
      studio: data.studio,
      billingCycle: data.billingCycle,
      licenseStartsAt: data.licenseStartsAt,
      licenseExpiresAt: data.licenseExpiresAt,
      notes: data.notes,
    };
  } catch (error) {
    console.error("Admin action bridge error:", error);

    return {
      ok: false,
      error: "Errore di comunicazione con le API admin",
    };
  }
}

export async function revokeSessionsAction(
  _prevState: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  const studioId = String(formData.get("studioId") ?? "").trim();

  if (!studioId) {
    return {
      ok: false,
      message: "studioId mancante",
    };
  }

  const result = await callAdminApi("/api/admin/revoke-session", {
    studioId,
  });

  revalidatePath(`/studios/${studioId}`);
  revalidatePath("/studios");
  revalidatePath("/");

  if (!result.ok) {
    return {
      ok: false,
      message: result.error || "Revoca sessioni fallita",
    };
  }

  return {
    ok: true,
    message: `Sessioni revocate correttamente${typeof result.revokedCount === "number" ? `: ${result.revokedCount}` : ""}.`,
  };
}

export async function suspendLicenseAction(
  _prevState: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  const studioId = String(formData.get("studioId") ?? "").trim();
  const revokeSessions = String(formData.get("revokeSessions") ?? "") === "on";

  if (!studioId) {
    return {
      ok: false,
      message: "studioId mancante",
    };
  }

  const result = await callAdminApi("/api/admin/suspend-license", {
    studioId,
    revokeSessions,
  });

  revalidatePath(`/studios/${studioId}`);
  revalidatePath("/studios");
  revalidatePath("/");

  if (!result.ok) {
    return {
      ok: false,
      message: result.error || "Sospensione licenza fallita",
    };
  }

  return {
    ok: true,
    message: `Licenza sospesa correttamente${typeof result.revokedCount === "number" ? `; sessioni revocate: ${result.revokedCount}` : ""}.`,
  };
}

export async function reactivateLicenseAction(
  _prevState: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  const studioId = String(formData.get("studioId") ?? "").trim();

  if (!studioId) {
    return {
      ok: false,
      message: "studioId mancante",
    };
  }

  const result = await callAdminApi("/api/admin/reactivate-license", {
    studioId,
  });

  revalidatePath(`/studios/${studioId}`);
  revalidatePath("/studios");
  revalidatePath("/");

  if (!result.ok) {
    return {
      ok: false,
      message: result.error || "Riattivazione licenza fallita",
    };
  }

  return {
    ok: true,
    message: `Licenza aggiornata correttamente. Nuovo stato: ${result.licenseStatus || "ok"}.`,
  };
}

export async function changeStudioPasswordAction(
  _prevState: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  const studioId = String(formData.get("studioId") ?? "").trim();
  const newPassword = String(formData.get("newPassword") ?? "").trim();
  const revokeSessions = String(formData.get("revokeSessions") ?? "") === "on";

  if (!studioId) {
    return {
      ok: false,
      message: "studioId mancante",
    };
  }

  if (!newPassword) {
    return {
      ok: false,
      message: "Nuova password obbligatoria",
    };
  }

  const result = await callAdminApi("/api/admin/change-studio-password", {
    studioId,
    newPassword,
    revokeSessions,
  });

  revalidatePath(`/studios/${studioId}`);
  revalidatePath("/studios");
  revalidatePath("/");

  if (!result.ok) {
    return {
      ok: false,
      message: result.error || "Cambio password fallito",
    };
  }

  return {
    ok: true,
    message: `Password aggiornata correttamente${typeof result.revokedCount === "number" ? `; sessioni revocate: ${result.revokedCount}` : ""}.`,
  };
}

export async function updateStudioLicenseAction(
  _prevState: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  const studioId = String(formData.get("studioId") ?? "").trim();
  const billingCycle = String(formData.get("billingCycle") ?? "").trim();
  const licenseStatus = String(formData.get("licenseStatus") ?? "").trim();
  const licenseStartsAt = String(formData.get("licenseStartsAt") ?? "").trim();
  const notes = String(formData.get("notes") ?? "");

  if (!studioId) {
    return {
      ok: false,
      message: "studioId mancante",
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

  if (!licenseStartsAt) {
    return {
      ok: false,
      message: "Data inizio licenza obbligatoria",
    };
  }

  const result = await callAdminApi("/api/admin/update-studio-license", {
    studioId,
    billingCycle,
    licenseStatus,
    licenseStartsAt,
    notes,
  });

  revalidatePath(`/studios/${studioId}`);
  revalidatePath("/studios");
  revalidatePath("/");

  if (!result.ok) {
    return {
      ok: false,
      message: result.error || "Aggiornamento licenza fallito",
    };
  }

  return {
    ok: true,
    message: "Licenza aggiornata correttamente.",
  };
}

export async function deleteStudioAction(
  _prevState: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  const studioId = String(formData.get("studioId") ?? "").trim();
  const confirmText = String(formData.get("confirmText") ?? "").trim();

  if (!studioId) {
    return {
      ok: false,
      message: "studioId mancante",
    };
  }

  if (confirmText !== "ELIMINA") {
    return {
      ok: false,
      message: 'Per confermare la cancellazione devi scrivere esattamente "ELIMINA".',
    };
  }

  const result = await callAdminApi("/api/admin/delete-studio", {
    studioId,
    confirmText,
  });

  revalidatePath("/studios");
  revalidatePath("/");

  if (!result.ok) {
    return {
      ok: false,
      message: result.error || "Eliminazione studio fallita",
    };
  }

  redirect("/studios");
}