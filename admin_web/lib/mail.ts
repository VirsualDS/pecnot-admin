import nodemailer from "nodemailer";

export type PecnotBillingCycle = "monthly" | "semiannual" | "annual";

type SendPecnotActivationEmailParams = {
  studioName: string;
  recipientEmail: string;
  loginEmail: string;
  billingCycle: PecnotBillingCycle;
  licenseStartsAt: Date;
  licenseExpiresAt: Date;
  downloadUrl: string;
};

function requireMailEnv(name: string): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`Variabile ambiente mail mancante: ${name}`);
  }

  return value;
}

function parseSmtpPort(value: string): number {
  const port = Number.parseInt(value, 10);

  if (!Number.isFinite(port) || port <= 0) {
    throw new Error(`SMTP_PORT non valida: ${value}`);
  }

  return port;
}

function parseBooleanEnv(value: string): boolean {
  const normalized = value.trim().toLowerCase();

  if (["1", "true", "yes", "y", "on"].includes(normalized)) {
    return true;
  }

  if (["0", "false", "no", "n", "off"].includes(normalized)) {
    return false;
  }

  throw new Error(`Valore booleano non valido: ${value}`);
}

function getMailFrom(): string {
  return process.env.MAIL_FROM?.trim() || "info@virsual.it";
}

function getMailFromName(): string {
  return process.env.MAIL_FROM_NAME?.trim() || "PECNOT by Virsual";
}

function getSmtpConfig() {
  const host = requireMailEnv("SMTP_HOST");
  const port = parseSmtpPort(requireMailEnv("SMTP_PORT"));
  const secure = parseBooleanEnv(requireMailEnv("SMTP_SECURE"));
  const user = requireMailEnv("SMTP_USER");
  const pass = requireMailEnv("SMTP_PASS");

  return {
    host,
    port,
    secure,
    auth: {
      user,
      pass,
    },
  };
}

let cachedTransporter: nodemailer.Transporter | null = null;

function getMailerTransporter(): nodemailer.Transporter {
  if (cachedTransporter) {
    return cachedTransporter;
  }

  cachedTransporter = nodemailer.createTransport(getSmtpConfig());
  return cachedTransporter;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatDateTimeItalian(value: Date): string {
  return new Intl.DateTimeFormat("it-IT", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "Europe/Rome",
  }).format(value);
}

function getBillingCycleLabel(value: PecnotBillingCycle): string {
  switch (value) {
    case "monthly":
      return "Mensile";
    case "semiannual":
      return "Semestrale";
    case "annual":
      return "Annuale";
    default: {
      const _never: never = value;
      return String(_never);
    }
  }
}

function buildActivationEmailSubject(studioName: string): string {
  return `PECNOT attivato con successo — ${studioName}`;
}

function buildActivationEmailText(
  params: SendPecnotActivationEmailParams
): string {
  const planLabel = getBillingCycleLabel(params.billingCycle);
  const startsAt = formatDateTimeItalian(params.licenseStartsAt);
  const expiresAt = formatDateTimeItalian(params.licenseExpiresAt);

  return [
    `Gentile cliente,`,
    ``,
    `l'attivazione della licenza PECNOT è stata completata con successo.`,
    ``,
    `Riepilogo attivazione`,
    `- Studio: ${params.studioName}`,
    `- Piano: ${planLabel}`,
    `- Email di accesso al client: ${params.loginEmail}`,
    `- Data attivazione: ${startsAt}`,
    `- Prossima scadenza / rinnovo: ${expiresAt}`,
    ``,
    `Prossimi passaggi`,
    `1. Scarica PECNOT: ${params.downloadUrl}`,
    `2. Segui la guida di installazione: https://www.virsual.it/guida-allinstallazione-di-pecnot/`,
    `3. Guarda il video dimostrativo: https://www.virsual.it/pecnot/#video`,
    ``,
    `Supporto`,
    `Per assistenza puoi contattarci a: supporto.pecnot@virsual.it`,
    ``,
    `Nota di sicurezza: per ragioni di sicurezza, la password scelta in fase di attivazione non viene mai inviata via email.`,
    ``,
    `PECNOT by Virsual`,
  ].join("\n");
}

function buildActivationEmailHtml(
  params: SendPecnotActivationEmailParams
): string {
  const planLabel = escapeHtml(getBillingCycleLabel(params.billingCycle));
  const studioName = escapeHtml(params.studioName);
  const loginEmail = escapeHtml(params.loginEmail);
  const startsAt = escapeHtml(formatDateTimeItalian(params.licenseStartsAt));
  const expiresAt = escapeHtml(formatDateTimeItalian(params.licenseExpiresAt));
  const downloadUrl = escapeHtml(params.downloadUrl);
  const installationGuideUrl =
    "https://www.virsual.it/guida-allinstallazione-di-pecnot/";
  const demoVideoUrl = "https://www.virsual.it/pecnot/#video";
  const supportEmail = "supporto.pecnot@virsual.it";

  return `
<!DOCTYPE html>
<html lang="it">
  <body style="margin:0;padding:0;background:#f3f5f9;font-family:Arial,Helvetica,sans-serif;color:#0b1320;">
    <div style="max-width:720px;margin:0 auto;padding:32px 20px;">
      <div style="background:#ffffff;border:1px solid #d9e2ef;border-radius:20px;padding:32px;">
        <p style="margin:0 0 8px 0;font-size:12px;letter-spacing:0.18em;text-transform:uppercase;color:#5c6c86;font-weight:700;">
          PECNOT
        </p>
        <h1 style="margin:0 0 20px 0;font-size:28px;line-height:1.2;color:#0b1320;">
          Attivazione completata con successo
        </h1>
        <p style="margin:0 0 18px 0;font-size:16px;line-height:1.7;color:#34445d;">
          La tua licenza PECNOT è stata attivata correttamente. Puoi procedere con il download del client desktop e accedere con le credenziali create in fase di acquisto.
        </p>

        <div style="margin:24px 0;padding:20px;border:1px solid rgba(5,53,128,0.16);background:#eef4ff;border-radius:16px;">
          <p style="margin:0 0 12px 0;font-size:15px;font-weight:700;color:#053580;">
            Riepilogo attivazione
          </p>
          <p style="margin:0 0 8px 0;font-size:15px;line-height:1.6;color:#24406e;"><strong>Studio:</strong> ${studioName}</p>
          <p style="margin:0 0 8px 0;font-size:15px;line-height:1.6;color:#24406e;"><strong>Piano:</strong> ${planLabel}</p>
          <p style="margin:0 0 8px 0;font-size:15px;line-height:1.6;color:#24406e;"><strong>Email di accesso:</strong> ${loginEmail}</p>
          <p style="margin:0 0 8px 0;font-size:15px;line-height:1.6;color:#24406e;"><strong>Data attivazione:</strong> ${startsAt}</p>
          <p style="margin:0;font-size:15px;line-height:1.6;color:#24406e;"><strong>Prossima scadenza / rinnovo:</strong> ${expiresAt}</p>
        </div>

        <h2 style="margin:0 0 14px 0;font-size:20px;color:#0b1320;">Prossimi passaggi</h2>
        <ol style="margin:0 0 24px 22px;padding:0;color:#34445d;font-size:15px;line-height:1.8;">
          <li>
            <a href="${downloadUrl}" style="color:#053580;font-weight:700;text-decoration:none;">
              Scarica PECNOT
            </a>
          </li>
          <li>
            Consulta la guida di installazione:
            <a href="${installationGuideUrl}" style="color:#053580;text-decoration:none;">
              ${installationGuideUrl}
            </a>
          </li>
          <li>
            Guarda il video dimostrativo:
            <a href="${demoVideoUrl}" style="color:#053580;text-decoration:none;">
              ${demoVideoUrl}
            </a>
          </li>
        </ol>

        <div style="margin-top:24px;padding-top:20px;border-top:1px solid #e5ebf3;">
          <p style="margin:0 0 10px 0;font-size:15px;line-height:1.7;color:#34445d;">
            Per assistenza puoi contattarci a
            <a href="mailto:${supportEmail}" style="color:#053580;text-decoration:none;font-weight:700;">
              ${supportEmail}
            </a>.
          </p>
          <p style="margin:0;font-size:14px;line-height:1.7;color:#5c6c86;">
            Nota di sicurezza: per ragioni di sicurezza, la password scelta in fase di attivazione non viene mai inviata via email.
          </p>
        </div>
      </div>
    </div>
  </body>
</html>
  `.trim();
}

export async function sendPecnotActivationEmail(
  params: SendPecnotActivationEmailParams
): Promise<void> {
  const transporter = getMailerTransporter();
  const fromAddress = getMailFrom();
  const fromName = getMailFromName();

  await transporter.sendMail({
    from: `"${fromName}" <${fromAddress}>`,
    to: params.recipientEmail,
    subject: buildActivationEmailSubject(params.studioName),
    text: buildActivationEmailText(params),
    html: buildActivationEmailHtml(params),
    replyTo: "supporto.pecnot@virsual.it",
  });
}