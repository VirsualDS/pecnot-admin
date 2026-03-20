import Link from "next/link";

export default function CheckoutCancelPage() {
  return (
    <main className="min-h-screen bg-neutral-950 text-white">
      <div className="mx-auto flex min-h-screen w-full max-w-3xl items-center px-6 py-12">
        <div className="w-full rounded-2xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur md:p-8">
          <div className="mb-6">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-white/50">
              PECNOT
            </p>
            <h1 className="text-2xl font-semibold">Pagamento non completato</h1>
            <p className="mt-3 text-sm leading-6 text-white/70">
              Il checkout è stato interrotto prima della conferma del pagamento.
              Nessuna licenza è stata attivata.
            </p>
          </div>

          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-100">
            Puoi tornare alla pagina di attivazione, controllare i dati inseriti e
            riprovare quando vuoi.
          </div>

          <div className="mt-6 space-y-4 text-sm leading-6 text-white/70">
            <p>
              Se avevi già iniziato la registrazione, puoi ripartire dalla stessa
              pagina di attivazione e generare un nuovo checkout.
            </p>
            <p>
              Se il problema continua, contatta il supporto PECNOT prima di fare
              altri tentativi.
            </p>
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