import Link from "next/link";
import { prisma } from "@/lib/prisma";

function formatDate(value: Date | null): string {
  if (!value) return "—";

  return new Intl.DateTimeFormat("it-IT", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

function getLicenseBadgeClass(status: "active" | "suspended" | "expired"): string {
  switch (status) {
    case "active":
      return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200";
    case "suspended":
      return "bg-amber-50 text-amber-700 ring-1 ring-amber-200";
    case "expired":
      return "bg-rose-50 text-rose-700 ring-1 ring-rose-200";
    default:
      return "bg-zinc-100 text-zinc-700 ring-1 ring-zinc-200";
  }
}

function getLicenseLabel(status: "active" | "suspended" | "expired"): string {
  switch (status) {
    case "active":
      return "Attiva";
    case "suspended":
      return "Sospesa";
    case "expired":
      return "Scaduta";
    default:
      return status;
  }
}

export default async function StudiosPage() {
  const studios = await prisma.studio.findMany({
    orderBy: [{ updatedAt: "desc" }, { studioName: "asc" }],
    select: {
      id: true,
      studioName: true,
      loginEmail: true,
      licenseStatus: true,
      billingCycle: true,
      licenseStartsAt: true,
      licenseExpiresAt: true,
      lastSuccessfulCheckAt: true,
      updatedAt: true,
      _count: {
        select: {
          installations: true,
          clientSessions: true,
        },
      },
    },
  });

  return (
    <main className="min-h-screen bg-zinc-50 text-zinc-900">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-6 py-10 lg:px-8">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.18em] text-zinc-500">
              PECNOT
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-950">
              Studi
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-600">
              Vista operativa di tutti gli studi presenti nel sistema licensing.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="inline-flex items-center rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 shadow-sm transition hover:bg-zinc-100"
            >
              Torna alla dashboard
            </Link>
          </div>
        </header>

        <section className="rounded-2xl border border-zinc-200 bg-white shadow-sm">
          <div className="border-b border-zinc-200 px-5 py-4">
            <h2 className="text-lg font-semibold tracking-tight text-zinc-950">
              Elenco studi
            </h2>
            <p className="mt-1 text-sm text-zinc-500">Totale record: {studios.length}</p>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-zinc-200 text-sm">
              <thead className="bg-zinc-50">
                <tr className="text-left text-zinc-500">
                  <th className="px-5 py-3 font-medium">Studio</th>
                  <th className="px-5 py-3 font-medium">Email login</th>
                  <th className="px-5 py-3 font-medium">Licenza</th>
                  <th className="px-5 py-3 font-medium">Ciclo</th>
                  <th className="px-5 py-3 font-medium">Inizio</th>
                  <th className="px-5 py-3 font-medium">Scadenza</th>
                  <th className="px-5 py-3 font-medium">Ultimo check</th>
                  <th className="px-5 py-3 font-medium">Installazioni</th>
                  <th className="px-5 py-3 font-medium">Sessioni</th>
                  <th className="px-5 py-3 font-medium">Aggiornato</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-zinc-100">
                {studios.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-5 py-8 text-center text-zinc-500">
                      Nessuno studio presente.
                    </td>
                  </tr>
                ) : (
                  studios.map((studio) => (
                    <tr key={studio.id} className="align-top">
                      <td className="px-5 py-4 font-medium text-zinc-900">
                        <Link
                          href={`/studios/${studio.id}`}
                          className="underline decoration-zinc-300 underline-offset-4 hover:text-zinc-700"
                        >
                          {studio.studioName}
                        </Link>
                      </td>
                      <td className="px-5 py-4 text-zinc-600">{studio.loginEmail}</td>
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getLicenseBadgeClass(
                            studio.licenseStatus
                          )}`}
                        >
                          {getLicenseLabel(studio.licenseStatus)}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-zinc-600">{studio.billingCycle}</td>
                      <td className="px-5 py-4 text-zinc-600">
                        {formatDate(studio.licenseStartsAt)}
                      </td>
                      <td className="px-5 py-4 text-zinc-600">
                        {formatDate(studio.licenseExpiresAt)}
                      </td>
                      <td className="px-5 py-4 text-zinc-600">
                        {formatDate(studio.lastSuccessfulCheckAt)}
                      </td>
                      <td className="px-5 py-4 text-zinc-600">
                        {studio._count.installations}
                      </td>
                      <td className="px-5 py-4 text-zinc-600">
                        {studio._count.clientSessions}
                      </td>
                      <td className="px-5 py-4 text-zinc-600">
                        {formatDate(studio.updatedAt)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}