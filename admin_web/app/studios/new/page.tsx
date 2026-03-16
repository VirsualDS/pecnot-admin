import Link from "next/link";
import NewStudioForm from "./studio-form";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function Page() {
  return (
    <main className="min-h-screen bg-zinc-50 text-zinc-900">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-6 py-10 lg:px-8">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.18em] text-zinc-500">
              PECNOT
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-950">
              Crea studio
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-600">
              Creazione manuale di uno studio dal pannello admin con licenza,
              credenziali e scadenza impostate direttamente da te.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/studios"
              className="inline-flex items-center rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 shadow-sm transition hover:bg-zinc-100"
            >
              Torna agli studi
            </Link>
            <Link
              href="/"
              className="inline-flex items-center rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 shadow-sm transition hover:bg-zinc-100"
            >
              Dashboard
            </Link>
          </div>
        </header>

        <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <NewStudioForm />
        </section>
      </div>
    </main>
  );
}