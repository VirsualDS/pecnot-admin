import Link from "next/link";

type CheckoutSuccessPageProps = {
  searchParams?: Promise<{
    session_id?: string;
    mode?: string;
  }>;
};

export default async function CheckoutSuccessPage({
  searchParams,
}: CheckoutSuccessPageProps) {
  const params = searchParams ? await searchParams : undefined;
  const sessionId =
    typeof params?.session_id === "string" ? params.session_id.trim() : "";
  const mode = typeof params?.mode === "string" ? params.mode.trim().toLowerCase() : "";
  const isTrial = mode === "trial";

  const downloadUrl = process.env.PECNOT_DOWNLOAD_URL?.trim() || "";

  return (
    <main className="min-h-screen bg-[#f3f5f9] text-[#0b1320]">
      <div className="mx-auto flex min-h-screen w-full max-w-5xl items-center px-6 py-12 lg:px-8">
        <div className="w-full rounded-[28px] border border-[#d9e2ef] bg-white p-6 shadow-[0_18px_50px_rgba(11,19,32,0.08)] md:p-10">
          <div className="flex flex-col gap-6 md:flex-row md:items-start">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-white shadow-[0_10px_25px_rgba(5,53,128,0.12)] ring-1 ring-[#dce5f3]">
              <img
                src="/favicon.ico"
                alt="PECNOT"
                className="h-14 w-14 object-contain"
              />
            </div>

            <div className="flex-1">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#5c6c86]">
                PECNOT
              </p>
              <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-[#0b1320] md:text-4xl">
                {isTrial ? "Prova gratuita attivata" : "Pagamento completato"}
              </h1>
              <p className="mt-4 max-w-3xl text-[17px] leading-8 text-[#34445d]">
                {isTrial
                  ? "La prova gratuita di PECNOT è attiva. L’account creato in fase di attivazione è già pronto e può essere usato nel client desktop per il login."
                  : "L’acquisto è andato a buon fine. La licenza PECNOT viene attivata automaticamente e l’account creato in fase di acquisto è quello da usare nel client desktop per il login."}
              </p>
            </div>
          </div>

          <div className="mt-8 rounded-2xl border border-[rgba(5,53,128,0.16)] bg-[#eef4ff] p-5">
            <p className="text-sm font-semibold text-[#053580]">
              {isTrial
                ? "Puoi accedere subito al client PECNOT con l’email e la password inserite durante l’attivazione della prova."
                : "Puoi accedere al client PECNOT con l’email e la password inserite durante l’attivazione."}
            </p>
            <p className="mt-2 text-sm text-[#24406e]">
              {isTrial
                ? "La prova gratuita dura 7 giorni e non prevede addebiti automatici."
                : "Non è necessario impostare di nuovo la password dopo il pagamento."}
            </p>
          </div>

          <div className="mt-8 grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="space-y-4 text-[16px] leading-8 text-[#34445d]">
              <p>
                {isTrial
                  ? "Il prossimo passo è scaricare il client PECNOT, installarlo sul tuo PC e accedere con le credenziali appena create per iniziare la prova."
                  : "Il prossimo passo è scaricare il client PECNOT, installarlo sul tuo PC e accedere con le credenziali appena create."}
              </p>
              <p>
                Una volta dentro, potrai configurare la casella PEC e iniziare
                l’archiviazione automatica.
              </p>
              <p>
                PECNOT archivia in locale e non sostituisce il controllo umano:
                prima di eliminare messaggi dal provider PEC bisogna sempre
                verificare completezza e leggibilità dell’archivio creato.
              </p>

              {isTrial ? (
                <p className="text-sm leading-7 text-[#41526d]">
                  Alla scadenza della prova potrai scegliere un piano a pagamento
                  per continuare a usare PECNOT senza interruzioni.
                </p>
              ) : null}

              {!isTrial && sessionId ? (
                <p className="break-all text-xs leading-6 text-[#6a7890]">
                  Riferimento sessione checkout: {sessionId}
                </p>
              ) : null}
            </div>

            <div className="rounded-2xl border border-[#dce5f3] bg-[#f8fafc] p-5">
              <h2 className="text-lg font-bold text-[#0b1320]">
                Prossimi passaggi
              </h2>

              <div className="mt-4 space-y-3 text-sm leading-7 text-[#41526d]">
                <p>1. Scarica e installa PECNOT.</p>
                <p>2. Apri il client desktop.</p>
                <p>
                  {isTrial
                    ? "3. Accedi con email e password create durante l’attivazione della prova."
                    : "3. Accedi con email e password create durante l’acquisto."}
                </p>
                <p>4. Configura la tua casella PEC e avvia il monitoraggio.</p>
              </div>

              <div className="mt-6 flex flex-col gap-3">
                {downloadUrl ? (
                  <a
                    href={downloadUrl}
                    className="inline-flex items-center justify-center rounded-xl bg-[#053580] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#042d6d]"
                  >
                    Scarica PECNOT e installa
                  </a>
                ) : null}

                <Link
                  href="/activate"
                  className="inline-flex items-center justify-center rounded-xl border border-[#cfd9e8] bg-white px-4 py-3 text-sm font-semibold text-[#053580] transition hover:bg-[#f3f7fd]"
                >
                  Torna alla pagina di attivazione
                </Link>

                <a
                  href="mailto:supporto.pecnot@virsual.it"
                  className="inline-flex items-center justify-center rounded-xl border border-[#cfd9e8] bg-white px-4 py-3 text-sm font-semibold text-[#0b1320] transition hover:bg-[#f8fafc]"
                >
                  Contatta il supporto
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}