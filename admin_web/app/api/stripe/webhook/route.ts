import { NextResponse } from "next/server";
import crypto from "node:crypto";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import { getPecnotBaseUrl, getStripeServerClient, requireEnv } from "@/lib/stripe";

export const runtime = "nodejs";

function addMonths(base: Date, months: number): Date {
  const d = new Date(base);
  d.setUTCMonth(d.getUTCMonth() + months);
  return d;
}

function getBillingCycleAndExpiry(plan: string, startsAt: Date) {
  switch (plan) {
    case "monthly":
      return {
        billingCycle: "monthly" as const,
        expiresAt: addMonths(startsAt, 1),
      };
    case "semiannual":
      return {
        billingCycle: "semiannual" as const,
        expiresAt: addMonths(startsAt, 6),
      };
    case "annual":
      return {
        billingCycle: "annual" as const,
        expiresAt: addMonths(startsAt, 12),
      };
    default:
      throw new Error(`Piano Stripe non supportato: ${plan}`);
  }
}

function sha256(value: string): string {
  return crypto.createHash("sha256").update(value, "utf8").digest("hex");
}

function buildStudioNameFromEmail(email: string): string {
  const local = email.split("@")[0]?.trim() || "Studio";
  return `Studio ${local}`;
}

async function handleCheckoutSessionCompleted(event: Stripe.Event) {
  const session = event.data.object as Stripe.Checkout.Session;

  const metadata = session.metadata ?? {};
    const customerId =
    typeof session.customer === "string" ? session.customer : null;
  const subscriptionId =
    typeof session.subscription === "string" ? session.subscription : null;
  const app = metadata.app ?? "";
  const flow = metadata.flow ?? "";
  const plan = metadata.plan ?? "";
  const email =
    (session.customer_details?.email || metadata.email || "").trim().toLowerCase();

  if (app !== "pecnot" || flow !== "first_purchase") {
    return;
  }

  if (!email) {
    throw new Error("Email mancante nel checkout Stripe");
  }

  const alreadyProcessed = await prisma.stripeWebhookEvent.findUnique({
    where: {
      stripeEventId: event.id,
    },
    select: {
      id: true,
    },
  });

  if (alreadyProcessed) {
    return;
  }

  const existingStudio = await prisma.studio.findUnique({
    where: {
      loginEmail: email,
    },
    select: {
      id: true,
      loginEmail: true,
    },
  });

  if (existingStudio) {
    await prisma.stripeWebhookEvent.create({
      data: {
        stripeEventId: event.id,
        eventType: event.type,
        payload: event as unknown as object,
      },
    });

    await prisma.auditEvent.create({
      data: {
        studioId: existingStudio.id,
        eventType: "stripe_checkout_completed_existing_email",
        eventPayload: {
          email,
          sessionId: session.id,
          customerId,
          subscriptionId,
          plan,
        },
      },
    });

    return;
  }

  const startsAt = new Date();
  const { billingCycle, expiresAt } = getBillingCycleAndExpiry(plan, startsAt);

  const rawSetupToken = crypto.randomUUID() + crypto.randomBytes(24).toString("hex");
  const tokenHash = sha256(rawSetupToken);
  const tempPassword = crypto.randomBytes(24).toString("hex");
  const passwordHash = await hashPassword(tempPassword);

  const created = await prisma.$transaction(async (tx) => {
    const studio = await tx.studio.create({
      data: {
        studioName: buildStudioNameFromEmail(email),
        loginEmail: email,
        passwordHash,
        licenseStatus: "active",
        billingCycle,
        licenseStartsAt: startsAt,
        licenseExpiresAt: expiresAt,
        stripeCustomerId:
          typeof session.customer === "string" ? session.customer : null,
        stripeSubscriptionId:
          typeof session.subscription === "string" ? session.subscription : null,
        notes: "Creato automaticamente da checkout Stripe PECNOT",
      },
      select: {
        id: true,
        loginEmail: true,
      },
    });

    await tx.passwordSetupToken.create({
      data: {
        studioId: studio.id,
        tokenHash,
        expiresAt: addMonths(startsAt, 1),
      },
    });

    await tx.auditEvent.create({
      data: {
        studioId: studio.id,
        eventType: "stripe_checkout_completed_new_studio",
        eventPayload: {
          email,
          sessionId: session.id,
          customerId,
          subscriptionId,
          plan,
        },
      },
    });

    await tx.stripeWebhookEvent.create({
      data: {
        stripeEventId: event.id,
        eventType: event.type,
        payload: event as unknown as object,
      },
    });

    return studio;
  });

  const setupPasswordUrl = `${getPecnotBaseUrl()}/setup-password?token=${encodeURIComponent(
    rawSetupToken
  )}`;

  console.log("PECNOT setup-password URL:", {
    studioId: created.id,
    email: created.loginEmail,
    setupPasswordUrl,
  });
}

export async function POST(request: Request) {
  try {
    const stripe = getStripeServerClient();
    const webhookSecret = requireEnv("STRIPE_WEBHOOK_SECRET");
    const signature = request.headers.get("stripe-signature");

    if (!signature) {
      return NextResponse.json(
        {
          ok: false,
          error: "Header stripe-signature mancante",
        },
        { status: 400 }
      );
    }

    const rawBody = await request.text();

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
    } catch (error) {
      console.error("Stripe webhook signature error:", error);

      return NextResponse.json(
        {
          ok: false,
          error: "Firma webhook Stripe non valida",
        },
        { status: 400 }
      );
    }

    if (event.type === "checkout.session.completed") {
      await handleCheckoutSessionCompleted(event);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Stripe webhook error:", error);

    return NextResponse.json(
      {
        ok: false,
        error: "Errore interno webhook Stripe",
      },
      { status: 500 }
    );
  }
}