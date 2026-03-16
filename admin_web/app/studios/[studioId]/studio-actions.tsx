"use client";

import { useActionState } from "react";
import {
  changeStudioPasswordAction,
  deleteStudioAction,
  reactivateLicenseAction,
  revokeSessionsAction,
  suspendLicenseAction,
  updateStudioLicenseAction,
} from "./actions";

type StudioActionsProps = {
  studioId: string;
  licenseStatus: "active" | "suspended" | "expired";
  billingCycle: "monthly" | "semiannual" | "annual";
  licenseStartsAt: string;
  licenseExpiresAt: string;
  notes: string;
};

const initialState = {
  ok: false,
  message: "",
};

function MessageBox({
  ok,
  message,
}: {
  ok: boolean;
  message: string;
}) {
  if (!message) return null;

  return (
    <div
      className={`rounded-xl px-4 py-3 text-sm ${
        ok
          ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
          : "border border-rose-200 bg-rose-50 text-rose-700"
      }`}
    >
      {message}
    </div>
  );
}

export default function StudioActions({
  studioId,
  licenseStatus,
  billingCycle,
  licenseStartsAt,
  licenseExpiresAt,
  notes,
}: StudioActionsProps) {
  const [revokeState, revokeFormAction, revokePending] = useActionState(
    revokeSessionsAction,
    initialState
  );

  const [suspendState, suspendFormAction, suspendPending] = useActionState(
    suspendLicenseAction,
    initialState
  );

  const [reactivateState, reactivateFormAction, reactivatePending] =
    useActionState(reactivateLicenseAction, initialState);

  const [passwordState, passwordFormAction, passwordPending] = useActionState(
    changeStudioPasswordAction,
    initialState
  );

  const [licenseState, licenseFormAction, licensePending] = useActionState(
    updateStudioLicenseAction,
    initialState
  );

  const [deleteState, deleteFormAction, deletePending] = useActionState(
    deleteStudioAction,
    initialState
  );

  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        <h3 className="text-base font-semibold tracking-tight text-zinc-950">
          Revoca sessioni
        </h3>
        <p className="mt-2 text-sm leading-6 text-zinc-600">
          Invalida tutte le sessioni client attive dello studio. Il client dovrà
          autenticarsi di nuovo al controllo successivo.
        </p>

        <form action={revokeFormAction} className="mt-4 flex flex-col gap-3">
          <input type="hidden" name="studioId" value={studioId} />
          <button
            type="submit"
            disabled={revokePending}
            className="inline-flex items-center justify-center rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {revokePending ? "Revoca in corso..." : "Revoca tutte le sessioni"}
          </button>
          <MessageBox ok={revokeState.ok} message={revokeState.message} />
        </form>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        <h3 className="text-base font-semibold tracking-tight text-zinc-950">
          Modifica licenza
        </h3>
        <p className="mt-2 text-sm leading-6 text-zinc-600">
          Aggiorna manualmente ciclo, stato, data di inizio, data di scadenza e
          note dello studio.
        </p>

        <form action={licenseFormAction} className="mt-4 flex flex-col gap-4">
          <input type="hidden" name="studioId" value={studioId} />

          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex flex-col gap-2">
              <label htmlFor="billingCycle" className="text-sm font-medium text-zinc-700">
                Ciclo licenza
              </label>
              <select
                id="billingCycle"
                name="billingCycle"
                defaultValue={billingCycle}
                disabled={licensePending}
                className="rounded-xl border border-zinc-300 px-4 py-2.5 text-sm outline-none transition focus:border-zinc-500"
              >
                <option value="monthly">Mensile</option>
                <option value="semiannual">Semestrale</option>
                <option value="annual">Annuale</option>
              </select>
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="licenseStatus" className="text-sm font-medium text-zinc-700">
                Stato licenza
              </label>
              <select
                id="licenseStatus"
                name="licenseStatus"
                defaultValue={licenseStatus}
                disabled={licensePending}
                className="rounded-xl border border-zinc-300 px-4 py-2.5 text-sm outline-none transition focus:border-zinc-500"
              >
                <option value="active">Attiva</option>
                <option value="suspended">Sospesa</option>
                <option value="expired">Scaduta</option>
              </select>
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="licenseStartsAt" className="text-sm font-medium text-zinc-700">
                Inizio licenza
              </label>
              <input
                id="licenseStartsAt"
                name="licenseStartsAt"
                type="date"
                defaultValue={licenseStartsAt}
                disabled={licensePending}
                className="rounded-xl border border-zinc-300 px-4 py-2.5 text-sm outline-none transition focus:border-zinc-500"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="licenseExpiresAt" className="text-sm font-medium text-zinc-700">
                Scadenza licenza
              </label>
              <input
                id="licenseExpiresAt"
                name="licenseExpiresAt"
                type="date"
                defaultValue={licenseExpiresAt}
                disabled={licensePending}
                className="rounded-xl border border-zinc-300 px-4 py-2.5 text-sm outline-none transition focus:border-zinc-500"
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="notes" className="text-sm font-medium text-zinc-700">
              Note
            </label>
            <textarea
              id="notes"
              name="notes"
              rows={4}
              defaultValue={notes}
              disabled={licensePending}
              className="rounded-xl border border-zinc-300 px-4 py-2.5 text-sm outline-none transition placeholder:text-zinc-400 focus:border-zinc-500"
              placeholder="Note admin sulla licenza"
            />
          </div>

          <button
            type="submit"
            disabled={licensePending}
            className="inline-flex items-center justify-center rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {licensePending ? "Aggiornamento in corso..." : "Aggiorna licenza"}
          </button>

          <MessageBox ok={licenseState.ok} message={licenseState.message} />
        </form>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        <h3 className="text-base font-semibold tracking-tight text-zinc-950">
          Sospensione / riattivazione licenza
        </h3>
        <p className="mt-2 text-sm leading-6 text-zinc-600">
          Sospendi la licenza oppure riattivala in base alla scadenza già
          registrata nello studio.
        </p>

        <div className="mt-4 grid gap-4">
          <form
            action={suspendFormAction}
            className="flex flex-col gap-3 rounded-xl border border-zinc-200 p-4"
          >
            <input type="hidden" name="studioId" value={studioId} />
            <label className="flex items-center gap-3 text-sm text-zinc-700">
              <input
                type="checkbox"
                name="revokeSessions"
                className="h-4 w-4 rounded border-zinc-300"
              />
              Revoca anche le sessioni attive
            </label>
            <button
              type="submit"
              disabled={suspendPending || licenseStatus === "suspended"}
              className="inline-flex items-center justify-center rounded-xl bg-amber-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-amber-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {suspendPending ? "Sospensione in corso..." : "Sospendi licenza"}
            </button>
            <MessageBox ok={suspendState.ok} message={suspendState.message} />
          </form>

          <form
            action={reactivateFormAction}
            className="flex flex-col gap-3 rounded-xl border border-zinc-200 p-4"
          >
            <input type="hidden" name="studioId" value={studioId} />
            <button
              type="submit"
              disabled={reactivatePending || licenseStatus === "active"}
              className="inline-flex items-center justify-center rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {reactivatePending ? "Riattivazione in corso..." : "Riattiva licenza"}
            </button>
            <MessageBox ok={reactivateState.ok} message={reactivateState.message} />
          </form>
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        <h3 className="text-base font-semibold tracking-tight text-zinc-950">
          Cambio password studio
        </h3>
        <p className="mt-2 text-sm leading-6 text-zinc-600">
          Imposta una nuova password per lo studio. Il backend accetta password di
          almeno 8 caratteri.
        </p>

        <form action={passwordFormAction} className="mt-4 flex flex-col gap-3">
          <input type="hidden" name="studioId" value={studioId} />

          <div className="flex flex-col gap-2">
            <label htmlFor="newPassword" className="text-sm font-medium text-zinc-700">
              Nuova password
            </label>
            <input
              id="newPassword"
              name="newPassword"
              type="text"
              minLength={8}
              required
              className="rounded-xl border border-zinc-300 px-4 py-2.5 text-sm outline-none ring-0 transition placeholder:text-zinc-400 focus:border-zinc-500"
              placeholder="Inserisci la nuova password"
            />
          </div>

          <label className="flex items-center gap-3 text-sm text-zinc-700">
            <input
              type="checkbox"
              name="revokeSessions"
              defaultChecked
              className="h-4 w-4 rounded border-zinc-300"
            />
            Revoca anche le sessioni attive
          </label>

          <button
            type="submit"
            disabled={passwordPending}
            className="inline-flex items-center justify-center rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {passwordPending ? "Aggiornamento in corso..." : "Cambia password"}
          </button>

          <MessageBox ok={passwordState.ok} message={passwordState.message} />
        </form>
      </div>

      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 shadow-sm">
        <h3 className="text-base font-semibold tracking-tight text-rose-800">
          Elimina studio
        </h3>
        <p className="mt-2 text-sm leading-6 text-rose-700">
          Questa azione elimina definitivamente lo studio e i dati collegati.
          Usala solo se sei sicuro. Per confermare devi scrivere esattamente
          <span className="mx-1 font-semibold">ELIMINA</span>.
        </p>

        <form action={deleteFormAction} className="mt-4 flex flex-col gap-3">
          <input type="hidden" name="studioId" value={studioId} />

          <div className="flex flex-col gap-2">
            <label htmlFor="confirmText" className="text-sm font-medium text-rose-800">
              Conferma eliminazione
            </label>
            <input
              id="confirmText"
              name="confirmText"
              type="text"
              required
              className="rounded-xl border border-rose-300 bg-white px-4 py-2.5 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-rose-500"
              placeholder='Scrivi "ELIMINA"'
            />
          </div>

          <button
            type="submit"
            disabled={deletePending}
            className="inline-flex items-center justify-center rounded-xl bg-rose-700 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-rose-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {deletePending ? "Eliminazione in corso..." : "Elimina studio"}
          </button>

          <MessageBox ok={deleteState.ok} message={deleteState.message} />
        </form>
      </div>
    </div>
  );
}