import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import {
  getPecnotCancelUrl,
  getPecnotSuccessUrl,
  getStripePriceId,
  getStripeServerClient,
  isValidPecnotPlan,
  normalizeCustomerEmail,
} from "@/lib/stripe";

type CreateCheckoutSessionBody = {
  studioName?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  plan?: string;
};

const MIN_PASSWORD_LENGTH = 8;
const PENDING_CHECKOUT_TTL_HOURS = 48;

function normalizeText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function addHours(base: Date, hours: number): Date {
  return new Date(base.getTime() + hours * 60 * 60 * 1000);
}

function mapPlanToBillingCycle(plan: string): "monthly" | "semiannual" | "annual" {
  switch (plan) {
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

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CreateCheckoutSessionBody;

    const studioName = normalizeText(body.studioName);
    const rawEmail = normalizeText(body.email);
    const password = typeof body.password === "string" ? body.password : "";
    const confirmPassword =
      typeof body.confirmPassword === "string" ? body.confirmPassword : "";
    const rawPlan = normalizeText(body.plan).toLowerCase();

    const email = normalizeCustomerEmail(rawEmail);
    const plan = rawPlan;

    if (!studioName) {
      return NextResponse.json(
        {
          ok: false,
          error: "Nome studio obbligatorio",
          field: "studioName",
        },
        { status: 400 }
      );
    }

    if (!email) {
      return NextResponse.json(
        {
          ok: false,
          error: "Email obbligatoria",
          field: "email",
        },
        { status: 400 }
      );
    }

    if (!isValidPecnotPlan(plan)) {
      return NextResponse.json(
        {
          ok: false,
          error: "Piano non valido",
          field: "plan",
        },
        { status: 400 }
      );
    }

    if (!password.trim()) {
      return NextResponse.json(
        {
          ok: false,
          error: "Password obbligatoria",
          field: "password",
        },
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