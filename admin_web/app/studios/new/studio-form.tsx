"use client";

import { useActionState } from "react";
import { createStudioAction, type CreateStudioActionState } from "./actions";

const initialState: CreateStudioActionState = {
  ok: false,
  message: "",
};

export default function NewStudioForm() {
  const [state, formAction, isPending] = useActionState(
    createStudioAction,
    initialState
  );

  const today = new Date().toISOString().slice(0, 10);

  return (
    <form action={formAction} className="grid gap-6">
      <div
        className={
          state.message
            ? state.ok
              ? "rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700"
              : "rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"
            : "hidden"
        }
      >
        {state.message}
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <div>
          <label
            htmlFor="studioName"
            className="mb-2 block text-sm font-medium text-zinc-800"
          >
            Nome studio
          </label>
          <input
            id="studioName"
            name="studioName"
            type="text"
            required
            disabled={isPending}
            className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-900 outline-none transition focus:border-zinc-500"
            placeholder="Es. Studio Legale Rossi"
          />
        </div>

        <div>
          <label
            htmlFor="loginEmail"
            className="mb-2 block text-sm font-medium text-zinc-800"
          >
            Email login
          </label>
          <input
            id="loginEmail"
            name="loginEmail"
            type="email"
            required
            disabled={isPending}
            className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-900 outline-none transition focus:border-zinc-500"
            placeholder="studio@example.it"
          />
        </div>

        <div>
          <label
            htmlFor="password"
            className="mb-2 block text-sm font-medium text-zinc-800"
          >
            Password iniziale
          </label>
          <input
            id="password"
            name="password"
            type="text"
            required
            disabled={isPending}
            className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-900 outline-none transition focus:border-zinc-500"
            placeholder="Minimo 8 caratteri"
          />
        </div>

        <div>
          <label
            htmlFor="billingCycle"
            className="mb-2 block text-sm font-medium text-zinc-800"
          >
            Ciclo licenza
          </label>
          <select
            id="billingCycle"
            name="billingCycle"
            required
            disabled={isPending}
            defaultValue="annual"
            className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-900 outline-none transition focus:border-zinc-500"
          >
            <option value="monthly">Mensile</option>
            <option value="semiannual">Semestrale</option>
            <option value="annual">Annuale</option>
          </select>
        </div>

        <div>
          <label
            htmlFor="licenseStatus"
            className="mb-2 block text-sm font-medium text-zinc-800"
          >
            Stato licenza
          </label>
          <select
            id="licenseStatus"
            name="licenseStatus"
            required
            disabled={isPending}
            defaultValue="active"
            className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-900 outline-none transition focus:border-zinc-500"
          >
            <option value="active">Attiva</option>
            <option value="suspended">Sospesa</option>
            <option value="expired">Scaduta</option>
          </select>
        </div>

        <div>
          <label
            htmlFor="licenseStartsAt"
            className="mb-2 block text-sm font-medium text-zinc-800"
          >
            Inizio licenza
          </label>
          <input
            id="licenseStartsAt"
            name="licenseStartsAt"
            type="date"
            defaultValue={today}
            disabled={isPending}
            className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-900 outline-none transition focus:border-zinc-500"
          />
        </div>

        <div>
          <label
            htmlFor="licenseExpiresAt"
            className="mb-2 block text-sm font-medium text-zinc-800"
          >
            Scadenza licenza
          </label>
          <input
            id="licenseExpiresAt"
            name="licenseExpiresAt"
            type="date"
            disabled={isPending}
            className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-900 outline-none transition focus:border-zinc-500"
          />
          <p className="mt-2 text-xs text-zinc-500">
            Se lasci vuoto, viene calcolata automaticamente dal ciclo scelto.
          </p>
        </div>
      </div>

      <div>
        <label
          htmlFor="notes"
          className="mb-2 block text-sm font-medium text-zinc-800"
        >
          Note
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={5}
          disabled={isPending}
          className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-900 outline-none transition focus:border-zinc-500"
          placeholder="Es. Licenza omaggio per un amico, creata manualmente dall’admin."
        />
      </div>

      <div className="flex items-center justify-end">
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex items-center rounded-xl bg-zinc-950 px-5 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? "Creazione in corso..." : "Crea studio"}
        </button>
      </div>
    </form>
  );
}