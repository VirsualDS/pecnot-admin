export default function CheckoutCancelPage() {
  return (
    <main className="min-h-screen bg-neutral-950 text-white">
      <div className="mx-auto flex min-h-screen w-full max-w-2xl items-center px-6 py-12">
        <div className="w-full rounded-2xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-white/50">
            PECNOT
          </p>

          <h1 className="text-3xl font-semibold">Pagamento annullato</h1>

          <p className="mt-4 text-sm leading-7 text-white/75">
            Il pagamento non è stato completato e nessuna attivazione è stata finalizzata.
          </p>

          <p className="mt-3 text-sm leading-7 text-white/75">
            Puoi chiudere questa pagina e ripetere l’acquisto quando vuoi.
          </p>

          <div className="mt-8 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-200">
            Operazione annullata prima del completamento del checkout.
          </div>
        </div>
      </div>
    </main>
  );
}