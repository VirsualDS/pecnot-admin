import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import StudioActions from "./studio-actions";

export const dynamic = "force-dynamic";
export const revalidate = 0;

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

type StudioDetailPageProps = {
  params: Promise<{
    studioId: string;
  }>;
};

export default async function StudioDetailPage({ params }: StudioDetailPageProps) {
  const { studioId } = await params;

  const studio = await prisma.studio.findUnique({
    where: {
      id: studioId,
    },
    select: {
      id: true,
      studioName: true,
      loginEmail: true,
      licenseStatus: true,
      billingCycle: true,
      licenseStartsAt: true,
      licenseExpiresAt: true,
      notes: true,
      lastSuccessfulCheckAt: true,
      createdAt: true,
      updatedAt: true,
      installations: {
        orderBy: {
          lastSeenAt: "desc",
        },
        take: 20,
        select: {
          id: true,
          machineFingerprint: true,
          machineName: true,
          osName: true,
          appVersion: true,
          firstSeenAt: true,
          lastSeenAt: true,
          lastIp: true,
          isRevoked: true,
        },
      },
      clientSessions: {
        orderBy: {
          lastValidatedAt: "desc",
        },
        take: 20,
        select: {
          id: true,
          installationId: true,
          issuedAt: true,
          lastValidatedAt: true,
          expiresAt: true,
          isRevoked: true,
        },
      },
      _count: {
        select: {
          installations: true,
          clientSessions: true,
          auditEvents: true,
        },
      },
    },
  });

  if (!studio) {
    notFound();
  }

  const activeInstallations = studio.installations.filter((item) => !item.isRevoked).length;
  const activeSessions = studio.clientSessions.filter((item) => !item.isRevoked).length;

  return (
    <main className="min-h-screen bg-zinc-50 text-zinc-900">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-6 py-10 lg:px-8">
        <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.18em] text-zinc-500">
              PECNOT
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-950">
              {studio.studioName}
            </h1>
            <p className="mt-2 text-sm text-zinc-600">{studio.loginEmail}</p>
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

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-zinc-500">Stato licenza</p>
            <div className="mt-3">
              <span
                className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getLicenseBadgeClass(
                  studio.licenseStatus
                )}`}
              >
                {getLicenseLabel(studio.licenseStatus)}
              </span>
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-zinc-500">Installazioni attive</p>
            <p className="mt-3 text-3xl font-semibold tracking-tight">{activeInstallations}</p>
            <p className="mt-2 text-xs text-zinc-500">
              Totali registrate: {studio._count.installations}
            </p>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-zinc-500">Sessioni attive</p>
            <p className="mt-3 text-3xl font-semibold tracking-tight">{activeSessions}</p>
            <p className="mt-2 text-xs text-zinc-500">
              Totali registrate: {studio._count.clientSessions}
            </p>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-zinc-500">Audit events</p>
            <p className="mt-3 text-3xl font-semibold tracking-tight">{studio._count.auditEvents}</p>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm">
            <div className="border-b border-zinc-200 px-5 py-4">
              <h2 className="text-lg font-semibold tracking-tight text-zinc-950">
                Dati licenza e studio
              </h2>
            </div>

            <div className="grid gap-x-6 gap-y-4 px-5 py-5 sm:grid-cols-2">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                  Studio ID
                </p>
                <p className="mt-1 break-all text-sm text-zinc-800">{studio.id}</p>
              </div>

              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                  Ciclo billing
                </p>
                <p className="mt-1 text-sm text-zinc-800">{studio.billingCycle}</p>
              </div>

              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                  Inizio licenza
                </p>
                <p className="mt-1 text-sm text-zinc-800">{formatDate(studio.licenseStartsAt)}</p>
              </div>

              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                  Scadenza licenza
                </p>
                <p className="mt-1 text-sm text-zinc-800">{formatDate(studio.licenseExpiresAt)}</p>
              </div>

              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                  Ultimo check riuscito
                </p>
                <p className="mt-1 text-sm text-zinc-800">
                  {formatDate(studio.lastSuccessfulCheckAt)}
                </p>
              </div>

              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                  Ultimo aggiornamento record
                </p>
                <p className="mt-1 text-sm text-zinc-800">{formatDate(studio.updatedAt)}</p>
              </div>

              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                  Creato il
                </p>
                <p className="mt-1 text-sm text-zinc-800">{formatDate(studio.createdAt)}</p>
              </div>

              <div className="sm:col-span-2">
                <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Note</p>
                <p className="mt-1 whitespace-pre-wrap text-sm text-zinc-800">
                  {studio.notes?.trim() || "Nessuna nota presente."}
                </p>
              </div>
            </div>
          </div>

          <StudioActions studioId={studio.id} licenseStatus={studio.licenseStatus} />
        </section>

        <section className="rounded-2xl border border-zinc-200 bg-white shadow-sm">
          <div className="border-b border-zinc-200 px-5 py-4">
            <h2 className="text-lg font-semibold tracking-tight text-zinc-950">
              Installazioni recenti
            </h2>
            <p className="mt-1 text-sm text-zinc-500">
              Mostrate fino a 20 installazioni ordinate per ultimo contatto.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-zinc-200 text-sm">
              <thead className="bg-zinc-50">
                <tr className="text-left text-zinc-500">
                  <th className="px-5 py-3 font-medium">Macchina</th>
                  <th className="px-5 py-3 font-medium">OS</th>
                  <th className="px-5 py-3 font-medium">Versione app</th>
                  <th className="px-5 py-3 font-medium">IP</th>
                  <th className="px-5 py-3 font-medium">Fingerprint</th>
                  <th className="px-5 py-3 font-medium">Primo avvistamento</th>
                  <th className="px-5 py-3 font-medium">Ultimo avvistamento</th>
                  <th className="px-5 py-3 font-medium">Stato</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {studio.installations.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-5 py-8 text-center text-zinc-500">
                      Nessuna installazione registrata.
                    </td>
                  </tr>
                ) : (
                  studio.installations.map((item) => (
                    <tr key={item.id} className="align-top">
                      <td className="px-5 py-4 text-zinc-900">
                        {item.machineName?.trim() || "—"}
                      </td>
                      <td className="px-5 py-4 text-zinc-600">{item.osName?.trim() || "—"}</td>
                      <td className="px-5 py-4 text-zinc-600">
                        {item.appVersion?.trim() || "—"}
                      </td>
                      <td className="px-5 py-4 text-zinc-600">{item.lastIp?.trim() || "—"}</td>
                      <td className="px-5 py-4 break-all text-zinc-600">
                        {item.machineFingerprint}
                      </td>
                      <td className="px-5 py-4 text-zinc-600">
                        {formatDate(item.firstSeenAt)}
                      </td>
                      <td className="px-5 py-4 text-zinc-600">
                        {formatDate(item.lastSeenAt)}
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                            item.isRevoked
                              ? "bg-rose-50 text-rose-700 ring-1 ring-rose-200"
                              : "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                          }`}
                        >
                          {item.isRevoked ? "Revocata" : "Attiva"}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-2xl border border-zinc-200 bg-white shadow-sm">
          <div className="border-b border-zinc-200 px-5 py-4">
            <h2 className="text-lg font-semibold tracking-tight text-zinc-950">
              Sessioni recenti
            </h2>
            <p className="mt-1 text-sm text-zinc-500">
              Mostrate fino a 20 sessioni ordinate per ultima validazione.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-zinc-200 text-sm">
              <thead className="bg-zinc-50">
                <tr className="text-left text-zinc-500">
                  <th className="px-5 py-3 font-medium">Sessione ID</th>
                  <th className="px-5 py-3 font-medium">Installation ID</th>
                  <th className="px-5 py-3 font-medium">Emessa il</th>
                  <th className="px-5 py-3 font-medium">Ultima validazione</th>
                  <th className="px-5 py-3 font-medium">Scadenza</th>
                  <th className="px-5 py-3 font-medium">Stato</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {studio.clientSessions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-8 text-center text-zinc-500">
                      Nessuna sessione registrata.
                    </td>
                  </tr>
                ) : (
                  studio.clientSessions.map((session) => (
                    <tr key={session.id} className="align-top">
                      <td className="px-5 py-4 break-all text-zinc-900">{session.id}</td>
                      <td className="px-5 py-4 break-all text-zinc-600">
                        {session.installationId || "—"}
                      </td>
                      <td className="px-5 py-4 text-zinc-600">{formatDate(session.issuedAt)}</td>
                      <td className="px-5 py-4 text-zinc-600">
                        {formatDate(session.lastValidatedAt)}
                      </td>
                      <td className="px-5 py-4 text-zinc-600">
                        {formatDate(session.expiresAt)}
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                            session.isRevoked
                              ? "bg-rose-50 text-rose-700 ring-1 ring-rose-200"
                              : "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                          }`}
                        >
                          {session.isRevoked ? "Revocata" : "Attiva"}
                        </span>
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