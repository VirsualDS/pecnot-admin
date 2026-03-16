"use client";

import { useActionState } from "react";
import {
  setupPasswordAction,
  type SetupPasswordActionState,
} from "./actions";

type SetupPasswordFormProps = {
  token: string;
  initialState: SetupPasswordActionState;
};

export default function SetupPasswordForm({
  token,
  initialState,
}: SetupPasswordFormProps) {
  const [state, formAction, isPending] = useActionState(
    setupPasswordAction,
    initialState
  );

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="token" value={token} />

      {state.message ? (
        <div
          className={
            state.ok
              ? "rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-200"
              : "rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200"
          }
        >
          {state.message}
        </div>
      ) : null}

      <div className="space-y-2">
        <label htmlFor="password" className="block text-sm font-medium text-white/90">
          Nuova password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          disabled={isPending || state.ok}
          className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-white/30"
          placeholder="Almeno 8 caratteri"
        />
        {state.fieldErrors?.password ? (
          <p className="text-sm text-red-300">{state.fieldErrors.password}</p>
        ) : null}
      </div>

      <div className="space-y-2">
        <label
          htmlFor="confirmPassword"
          className="block text-sm font-medium text-white/90"
        >
          Conferma password
        </label>
        <input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          disabled={isPending || state.ok}
          className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-white/30"
          placeholder="Ripeti la password"
        />
        {state.fieldErrors?.confirmPassword ? (
          <p className="text-sm text-red-300">
            {state.fieldErrors.confirmPassword}
          </p>
        ) : null}
      </div>

      {state.fieldErrors?.token ? (
        <p className="text-sm text-red-300">{state.fieldErrors.token}</p>
      ) : null}

      {state.fieldErrors?.general ? (
        <p className="text-sm text-red-300">{state.fieldErrors.general}</p>
      ) : null}

      <div className="pt-2">
        <button
          type="submit"
          disabled={isPending || state.ok}
          className="inline-flex w-full items-center justify-center rounded-xl bg-white px-4 py-3 text-sm font-semibold text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending
            ? "Salvataggio in corso..."
            : state.ok
            ? "Password salvata"
            : "Salva password"}
        </button>
      </div>
    </form>
  );
}