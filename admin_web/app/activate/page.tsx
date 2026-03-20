"use client";

import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

type PecnotPlan = "monthly" | "semiannual" | "annual";

type FieldErrors = {
  studioName?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  plan?: string;
  general?: string;
};

const PLAN_OPTIONS: Array<{
  value: PecnotPlan;
  title: string;
  price: string;
  subtitle: string;
}> = [
  {
    value: "monthly",
    title: "Mensile",
    price: "€9,99",
    subtitle: "Fatturazione mensile",
  },
  {
    value: "semiannual",
    title: "Semestrale",
    price: "€59,99",
    subtitle: "6 mesi di licenza",
  },
  {
    value: "annual",
    title: "Annuale",
    price: "€99,00",
    subtitle: "12 mesi di licenza",
  },
];

const MIN_PASSWORD_LENGTH = 8;

function isValidPlan(value: string | null): value is PecnotPlan {
  return value === "monthly" || value === "semiannual" || value === "annual";
}

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

function ActivatePageInner() {
  const searchParams = useSearchParams();

  const initialPlan = useMemo<PecnotPlan>(() => {
    const fromQuery = searchParams.get("plan");
    return isValidPlan(fromQuery) ? fromQuery : "annual";
  }, [searchParams]);

  const [selectedPlan, setSelectedPlan] = useState<PecnotPlan>(initialPlan);
  const [studioName, setStudioName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [message, setMessage] = useState("");

  function validate(): boolean {
    const nextErrors: FieldErrors = {};
    const normalizedEmail = normalizeEmail(email);

    if (!studioName.trim()) {
      nextErrors.studioName = "Inserisci il nome dello studio.";
    }

    if (!normalizedEmail) {
      nextErrors.email = "Inserisci l’email di accesso.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      nextErrors.email = "Inserisci un’email valida.";
    }

    if (!password.trim()) {
      nextErrors.password = "Inserisci una password.";
    } else if (password.trim().length < MIN_PASSWORD_LENGTH) {
      nextErrors.password = `La password deve contenere almeno ${MIN_PASSWORD_LENGTH} caratteri.`;
    }

    if (!confirmPassword.trim()) {
      nextErrors.confirmPassword = "Conferma la password.";
    } else if (password !== confirmPassword) {
      nextErrors.confirmPassword = "Le password non coincidono.";
    }

    if (!selectedPlan) {
      nextErrors.plan = "Seleziona un piano.";
    }

    setFieldErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setMessage("");
    setFieldErrors({});

    if (!validate()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/checkout/create-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          studioName: studioName.trim(),
          email: normalizeEmail(email),
          password,
          confirmPassword,
          plan: selectedPlan,
        }),
      });

      const data = (await response.json()) as {
        ok: boolean;
        url?: string;
        error?: string;
        field?: string;
        code?: string;
      };

      if (!response.ok || !data.ok || !data.url) {
        const nextErrors: FieldErrors = {};

        if (
          data.field &&
          ["studioName", "email", "password", "confirmPassword", "plan"].includes(
            data.field
          )
        ) {
          nextErrors[data.field as keyof FieldErrors] =
            data.error || "Controlla il campo indicato.";
        } else {
          nextErrors.general =
            data.error || "Errore durante la preparazione del checkout.";
        }

        setFieldErrors(nextErrors);
        setMessage(data.error || "Impossibile avviare il checkout.");
        setIsSubmitting(false);
        return;
      }

      window.location.href = data.url;
    } catch (error) {
      console.error("Activate page checkout error:", error);
      setFieldErrors({
        general: "Errore di rete o server durante l’avvio del checkout.",
      });
      setMessage("Errore di rete o server durante l’avvio del checkout.");
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-neutral-950 text-white">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-10 lg:px-8">
        <header className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/50">
            PECNOT
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight">
            Attiva PECNOT
          </h1>
          <p className="mt-3 text-sm leading-6 text-white/70">
            Crea il tuo account licenza, scegli il piano e completa il pagamento.
            Dopo la conferma potrai accedere al client desktop PECNOT con le
            credenziali inserite qui.
          </p>
        </header>

        <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur">
            <h2 className="text-xl font-semibold">Crea il tuo account</h2>
            <p className="mt-2 text-sm text-white/65">
              Questo account sarà quello da usare nel client PECNOT per il login
              licenza.
            </p>

            <form onSubmit={handleSubmit} className="mt-6 space-y-5">
              {message ? (
                <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
                  {message}
                </div>
              ) : null}

              <div className="space-y-2">
                <label
                  htmlFor="studioName"
                  className="block text-sm font-medium text-white/90"
                >
                  Nome studio
                </label>
                <input
                  id="studioName"
                  name="studioName"
                  type="text"
                  value={studioName}
                  onChange={(e) => setStudioName(e.target.value)}
                  disabled={isSubmitting}
                  className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-white/30"
                  placeholder="Es. Studio Legale Rossi"
                />
                {fieldErrors.studioName ? (
                  <p className="text-sm text-red-300">{fieldErrors.studioName}</p>
                ) : null}
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-white/90"
                >
                  Email di accesso
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isSubmitting}
                  className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-white/30"
                  placeholder="nome@studio.it"
                />
                {fieldErrors.email ? (
                  <p className="text-sm text-red-300">{fieldErrors.email}</p>
                ) : null}
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div className="space-y-2">
                  <label
                    htmlFor="password"
                    className="block text-sm font-medium text-white/90"
                  >
                    Password
                  </label>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isSubmitting}
                    className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-white/30"
                    placeholder="Almeno 8 caratteri"
                  />
                  {fieldErrors.password ? (
                    <p className="text-sm text-red-300">{fieldErrors.password}</p>
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
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={isSubmitting}
                    className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-white/30"
                    placeholder="Ripeti la password"
                  />
                  {fieldErrors.confirmPassword ? (
                    <p className="text-sm text-red-300">
                      {fieldErrors.confirmPassword}
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-sm font-medium text-white/90">Scegli il piano</p>

                <div className="grid gap-3">
                  {PLAN_OPTIONS.map((plan) => {
                    const active = selectedPlan === plan.value;

                    return (
                      <button
                        key={plan.value}
                        type="button"
                        onClick={() => setSelectedPlan(plan.value)}
                        disabled={isSubmitting}
                        className={`rounded-2xl border px-4 py-4 text-left transition ${
                          active
                            ? "border-white bg-white text-black"
                            : "border-white/10 bg-black/20 text-white hover:border-white/30"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-4">
                          <div>
                            <p className="text-sm font-semibold">{plan.title}</p>
                            <p
                              className={`mt-1 text-xs ${
                                active ? "text-black/70" : "text-white/55"
                              }`}
                            >
                              {plan.subtitle}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-base font-semibold">{plan.price}</p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {fieldErrors.plan ? (
                  <p className="text-sm text-red-300">{fieldErrors.plan}</p>
                ) : null}
              </div>

              {fieldErrors.general ? (
                <p className="text-sm text-red-300">{fieldErrors.general}</p>
              ) : null}

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex w-full items-center justify-center rounded-xl bg-white px-4 py-3 text-sm font-semibold text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmitting ? "Preparazione checkout..." : "Continua al pagamento"}
                </button>
              </div>
            </form>
          </section>

          <aside className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur">
            <h2 className="text-xl font-semibold">Cosa succede dopo</h2>
            <div className="mt-4 space-y-4 text-sm leading-6 text-white/70">
              <p>1. Inserisci i dati del tuo account PECNOT e scegli il piano.</p>
              <p>
                2. Verrai reindirizzato al checkout sicuro Stripe per completare il
                pagamento.
              </p>
              <p>3. Dopo il pagamento la licenza verrà attivata automaticamente.</p>
              <p>
                4. Potrai accedere al client desktop PECNOT con l’email e la password
                scelte qui.
              </p>
            </div>

            <div className="mt-6 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-100">
              PECNOT archivia le PEC in locale ma non sostituisce il controllo umano.
              Prima di eliminare messaggi dal provider PEC va sempre verificata
              completezza e leggibilità dell’archivio creato.
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}

function ActivatePageFallback() {
  return (
    <main className="min-h-screen bg-neutral-950 text-white">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl items-center px-6 py-10 lg:px-8">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-white/70 shadow-2xl backdrop-blur">
          Caricamento pagina attivazione...
        </div>
      </div>
    </main>
  );
}

export default function ActivatePage() {
  return (
    <Suspense fallback={<ActivatePageFallback />}>
      <ActivatePageInner />
    </Suspense>
  );
}