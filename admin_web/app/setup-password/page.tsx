import { setupPasswordAction, type SetupPasswordActionState } from "./actions";
import SetupPasswordForm from "./setup-password-form";

type SetupPasswordPageProps = {
  searchParams?: Promise<{
    token?: string;
  }>;
};

const initialState: SetupPasswordActionState = {
  ok: false,
  message: "",
};

export default async function SetupPasswordPage({
  searchParams,
}: SetupPasswordPageProps) {
  const params = searchParams ? await searchParams : undefined;
  const token = typeof params?.token === "string" ? params.token.trim() : "";

  return (
    <main className="min-h-screen bg-neutral-950 text-white">
      <div className="mx-auto flex min-h-screen w-full max-w-xl items-center px-6 py-12">
        <div className="w-full rounded-2xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur">
          <div className="mb-6">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-white/50">
              PECNOT
            </p>
            <h1 className="text-2xl font-semibold">Imposta la password</h1>
            <p className="mt-2 text-sm leading-6 text-white/70">
              Completa l’attivazione dell’account impostando una nuova password
              per accedere al client desktop PECNOT.
            </p>
          </div>

          {!token ? (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
              Link non valido: token mancante. Apri il collegamento completo
              ricevuto dopo l’acquisto.
            </div>
          ) : (
            <SetupPasswordForm initialState={initialState} token={token} />
          )}
        </div>
      </div>
    </main>
  );
}