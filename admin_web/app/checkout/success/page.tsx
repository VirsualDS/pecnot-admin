import Link from "next/link";

type CheckoutSuccessPageProps = {
  searchParams?: Promise<{
    session_id?: string;
  }>;
};

export default async function CheckoutSuccessPage({
  searchParams,
}: CheckoutSuccessPageProps) {
  const params = searchParams ? await searchParams : undefined;
  const sessionId =
    typeof params?.session_id === "string" ? params.session_id.trim() : "";

  return (
    <main className="min-h-screen bg-neutral-950 text-white">
      <div className="mx-auto flex min-h-screen w-full max-w-3xl items-center px-6 py-12">
        <div className="w-full rounded-2xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur md:p-8">
          <div className="mb-6">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-white/50">
              PECNOT
            </p>
            <h1 className="text-2xl font-semibold">Pagamento completato</h1>
            <p className="mt-3 text-sm leading-6 text-white/70">
              L’acquisto è andato a buon fine. La licenza PECNOT viene attivata
              automaticamente e l’account creato in fase di acquisto è quello da
              usare nel client desktop per il login.
            </p>
          </div>

          <div className="space-y-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-100">
            <p>
              Puoi accedere al client PECNOT con l’email e la password inserite
              durante l’attivazione.
            </p>
            <p>
              Non è necessario impostare di nuovo la password dopo il pagamento.
            </p>
          </div>

          <div className="mt-6 space-y-4 text-sm leading-6 text-white/70">
            <p>
              Se hai già installato il client desktop, aprilo e usa le credenziali
              appena create.
            </p>
            <p>
              Se non hai ancora il client o hai bisogno di supporto, contatta
              l’assistenza PECNOT.
            </p>
            {sessionId ? (
              <p className="break-all text-xs text-white/45">
                Riferimento sessione checkout: {sessionId}
              </p>
            ) : null}
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/activate"
              className="inline-flex items-center justify-center rounded-xl border border-white/15 bg-white px-4 py-3 text-sm font-semibold text-black transition hover:bg-white/90"
            >
              Torna alla pagina di attivazione
            </Link>

            <a
              href="mailto:supporto.pecnot@virsual.it"
              className="inline-flex items-center justify-center rounded-xl border border-white/15 bg-transparent px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/5"
            >
              Contatta il supporto
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}