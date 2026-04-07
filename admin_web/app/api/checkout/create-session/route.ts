import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import {
  getPecnotBaseUrl,
  getPecnotCancelUrl,
  getPecnotSuccessUrl,
  getStripePriceId,
  getStripeServerClient,
  isPaidPecnotPlan,
  isValidPecnotPlan,
  normalizeCustomerEmail,
} from "@/lib/stripe";

type BillingCycle = "trial" | "monthly" | "semiannual" | "annual";

type CreateCheckoutSessionBody = {
  studioName?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  plan?: string;
  billingName?: string;
  vatNumber?: string;
  taxCode?: string;
  billingEmail?: string;
  recipientCode?: string;
  addressLine1?: string;
  city?: string;
  province?: string;
  postalCode?: string;
  country?: string;
};

const MIN_PASSWORD_LENGTH = 8;
const PENDING_CHECKOUT_TTL_HOURS = 48;
const TRIAL_DURATION_DAYS = 7;

function normalizeText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function addHours(base: Date, hours: number): Date {
  return new Date(base.getTime() + hours * 60 * 60 * 1000);
}

function addDays(base: Date, days: number): Date {
  return new Date(base.getTime() + days * 24 * 60 * 60 * 1000);
}

function mapPlanToBillingCycle(plan: string): BillingCycle {
  switch (plan) {
    case "trial":
      return "trial";
    case "monthly":
      return "monthly";
    case "semiannual":
      return "semiannual";
    case "annual":
      return "annual";
    default:
      throw new Error(`Piano non supportato: ${plan}`);
  }
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function getTrialSuccessUrl(): string {
  return `${getPecnotBaseUrl()}/checkout/success?mode=trial`;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CreateCheckoutSessionBody;

    const studioName = normalizeText(body.studioName);
    const rawEmail = normalizeText(body.email);
    const password = typeof body.password === "string" ? body.password : "";
    const confirmPassword =
      typeof body.confirmPassword === "string" ? body.confirmPassword : "";
    const rawPlan = normalizeText(body.plan).toLowerCase();

    const billingName = normalizeText(body.billingName);
    const vatNumber = normalizeText(body.vatNumber);
    const taxCode = normalizeText(body.taxCode);
    const billingEmail = normalizeCustomerEmail(normalizeText(body.billingEmail));
    const recipientCode = normalizeText(body.recipientCode);
    const addressLine1 = normalizeText(body.addressLine1);
    const city = normalizeText(body.city);
    const province = normalizeText(body.province).toUpperCase();
    const postalCode = normalizeText(body.postalCode);
    const country = normalizeText(body.country);

    const email = normalizeCustomerEmail(rawEmail);
    const plan = rawPlan;

    if (!studioName) {
      return NextResponse.json(
        { ok: false, error: "Nome studio obbligatorio", field: "studioName" },
        { status: 400 }
      );
    }

    if (!email) {
      return NextResponse.json(
        { ok: false, error: "Email obbligatoria", field: "email" },
        { status: 400 }
      );
    }

    if (!isValidEmail(email)) {
      return NextResponse.json(
        { ok: false, error: "Email non valida", field: "email" },
        { status: 400 }
      );
    }

    if (!isValidPecnotPlan(plan)) {
      return NextResponse.json(
        { ok: false, error: "Piano non valido", field: "plan" },
        { status: 400 }
      );
    }

    if (!password.trim()) {
      return NextResponse.json(
        { ok: false, error: "Password obbligatoria", field: "password" },
        { status: 400 }
      );
    }

    if (password.trim().length < MIN_PASSWORD_LENGTH) {
      return NextResponse.json(
        {
          ok: false,
          error: `La password deve contenere almeno ${MIN_PASSWORD_LENGTH} caratteri`,
          field: "password",
        },
        { status: 400 }
      );
    }

    if (!confirmPassword.trim()) {
      return NextResponse.json(
        {
          ok: false,
          error: "Conferma password obbligatoria",
          field: "confirmPassword",
        },
        { status: 400 }
      );
    }

    if (password !== confirmPassword) {
      return NextResponse.json(
        {
          ok: false,
          error: "Le password non coincidono",
          field: "confirmPassword",
        },
        { status: 400 }
      );
    }

    if (!billingName) {
      return NextResponse.json(
        {
          ok: false,
          error: "Intestazione fattura obbligatoria",
          field: "billingName",
        },
        { status: 400 }
      );
    }

    if (!vatNumber && !taxCode) {
      return NextResponse.json(
        {
          ok: false,
          error: "Inserisci almeno Partita IVA o Codice Fiscale",
          field: "vatNumber",
        },
        { status: 400 }
      );
    }

    if (!billingEmail) {
      return NextResponse.json(
        {
          ok: false,
          error: "Email o PEC di fatturazione obbligatoria",
          field: "billingEmail",
        },
        { status: 400 }
      );
    }

    if (!isValidEmail(billingEmail)) {
      return NextResponse.json(
        {
          ok: false,
          error: "Email o PEC di fatturazione non valida",
          field: "billingEmail",
        },
        { status: 400 }
      );
    }

    if (!addressLine1) {
      return NextResponse.json(
        {
          ok: false,
          error: "Indirizzo obbligatorio",
          field: "addressLine1",
        },
        { status: 400 }
      );
    }

    if (!city) {
      return NextResponse.json(
        {
          ok: false,
          error: "Città obbligatoria",
          field: "city",
        },
        { status: 400 }
      );
    }

    if (!province) {
      return NextResponse.json(
        {
          ok: false,
          error: "Provincia obbligatoria",
          field: "province",
        },
        { status: 400 }
      );
    }

    if (!postalCode) {
      return NextResponse.json(
        {
          ok: false,
          error: "CAP obbligatorio",
          field: "postalCode",
        },
        { status: 400 }
      );
    }

    if (!country) {
      return NextResponse.json(
        {
          ok: false,
          error: "Nazione obbligatoria",
          field: "country",
        },
        { status: 400 }
      );
    }

    const existingStudio = await prisma.studio.findUnique({
      where: {
        loginEmail: email,
      },
      select: {
        id: true,
        studioName: true,
        loginEmail: true,
        licenseStatus: true,
        licenseExpiresAt: true,
      },
    });

    if (existingStudio) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Questa email risulta già registrata. Per il rinnovo o il recupero accesso usa il flusso dedicato.",
          code: "EMAIL_ALREADY_REGISTERED",
          field: "email",
        },
        { status: 409 }
      );
    }

    const billingCycle = mapPlanToBillingCycle(plan);
    const passwordHash = await hashPassword(password);
    const now = new Date();

    if (plan === "trial") {
      const licenseStartsAt = now;
      const licenseExpiresAt = addDays(now, TRIAL_DURATION_DAYS);

      const studio = await prisma.$transaction(async (tx) => {
        const createdStudio = await tx.studio.create({
          data: {
            studioName,
            loginEmail: email,
            passwordHash,
            licenseStatus: "trial",
            billingCycle,
            licenseStartsAt,
            licenseExpiresAt,
            billingName,
            vatNumber: vatNumber || null,
            taxCode: taxCode || null,
            billingEmail,
            recipientCode: recipientCode || null,
            addressLine1,
            city,
            province,
            postalCode,
            country,
            notes: `Trial gratuita PECNOT attivata automaticamente per ${TRIAL_DURATION_DAYS} giorni`,
          },
          select: {
            id: true,
            studioName: true,
            loginEmail: true,
            licenseStatus: true,
            billingCycle: true,
            licenseStartsAt: true,
            licenseExpiresAt: true,
          },
        });

        await tx.auditEvent.create({
          data: {
            studioId: createdStudio.id,
            eventType: "trial_activated_from_public_flow",
            eventPayload: {
              plan: "trial",
              studioName,
              loginEmail: email,
              billingName,
              vatNumber: vatNumber || null,
              taxCode: taxCode || null,
              billingEmail,
              recipientCode: recipientCode || null,
              addressLine1,
              city,
              province,
              postalCode,
              country,
              licenseStartsAt: licenseStartsAt.toISOString(),
              licenseExpiresAt: licenseExpiresAt.toISOString(),
              durationDays: TRIAL_DURATION_DAYS,
            },
          },
        });

        return createdStudio;
      });

      return NextResponse.json({
        ok: true,
        mode: "trial",
        url: getTrialSuccessUrl(),
        studioId: studio.id,
        licenseStatus: studio.licenseStatus,
        billingCycle: studio.billingCycle,
        licenseStartsAt: studio.licenseStartsAt.toISOString(),
        licenseExpiresAt: studio.licenseExpiresAt.toISOString(),
      });
    }

    if (!isPaidPecnotPlan(plan)) {
      return NextResponse.json(
        { ok: false, error: "Piano non valido", field: "plan" },
        { status: 400 }
      );
    }

    const expiresAt = addHours(now, PENDING_CHECKOUT_TTL_HOURS);

    const existingPending = await prisma.pendingStudioCheckout.findFirst({
      where: {
        loginEmail: email,
        status: "pending",
        expiresAt: {
          gt: now,
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
      },
    });

    const pendingCheckout = existingPending
      ? await prisma.pendingStudioCheckout.update({
          where: {
            id: existingPending.id,
          },
          data: {
            studioName,
            passwordHash,
            billingCycle,
            status: "pending",
            billingName,
            vatNumber: vatNumber || null,
            taxCode: taxCode || null,
            billingEmail,
            recipientCode: recipientCode || null,
            addressLine1,
            city,
            province,
            postalCode,
            country,
            expiresAt,
            stripeCheckoutSessionId: null,
            stripeCustomerId: null,
            stripeSubscriptionId: null,
            completedStudioId: null,
            completedAt: null,
          },
          select: {
            id: true,
            studioName: true,
            loginEmail: true,
            billingCycle: true,
          },
        })
      : await prisma.pendingStudioCheckout.create({
          data: {
            studioName,
            loginEmail: email,
            passwordHash,
            billingCycle,
            status: "pending",
            billingName,
            vatNumber: vatNumber || null,
            taxCode: taxCode || null,
            billingEmail,
            recipientCode: recipientCode || null,
            addressLine1,
            city,
            province,
            postalCode,
            country,
            expiresAt,
          },
          select: {
            id: true,
            studioName: true,
            loginEmail: true,
            billingCycle: true,
          },
        });

    const stripe = getStripeServerClient();
    const priceId = getStripePriceId(plan);

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      success_url: `${getPecnotSuccessUrl()}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: getPecnotCancelUrl(),
      customer_email: email,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      allow_promotion_codes: false,
      billing_address_collection: "auto",
      metadata: {
        app: "pecnot",
        flow: "first_purchase",
        pendingCheckoutId: pendingCheckout.id,
        plan,
        email,
      },
      subscription_data: {
        metadata: {
          app: "pecnot",
          flow: "first_purchase",
          pendingCheckoutId: pendingCheckout.id,
          plan,
          email,
        },
      },
    });

    await prisma.pendingStudioCheckout.update({
      where: {
        id: pendingCheckout.id,
      },
      data: {
        stripeCheckoutSessionId: session.id,
      },
    });

    return NextResponse.json({
      ok: true,
      mode: "paid",
      url: session.url,
      sessionId: session.id,
      pendingCheckoutId: pendingCheckout.id,
    });
  } catch (error) {
    console.error("Create checkout session API error:", error);

    return NextResponse.json(
      {
        ok: false,
        error: "Errore interno durante la creazione della sessione checkout",
      },
      { status: 500 }
    );
  }
}