import { NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { getStripeServerClient, requireEnv } from "@/lib/stripe";

export const runtime = "nodejs";

function addMonths(base: Date, months: number): Date {
  const d = new Date(base);
  d.setUTCMonth(d.getUTCMonth() + months);
  return d;
}

function getBillingCycleAndExpiry(
  plan: string,
  startsAt: Date
): {
  billingCycle: "monthly" | "semiannual" | "annual";
  expiresAt: Date;
} {
  switch (plan) {
    case "monthly":
      return {
        billingCycle: "monthly",
        expiresAt: addMonths(startsAt, 1),
      };
    case "semiannual":
      return {
        billingCycle: "semiannual",
        expiresAt: addMonths(startsAt, 6),
      };
    case "annual":
      return {
        billingCycle: "annual",
        expiresAt: addMonths(startsAt, 12),
      };
    default:
      throw new Error(`Piano Stripe non supportato: ${plan}`);
  }
}

async function handleCheckoutSessionCompleted(event: Stripe.Event) {
  const session = event.data.object as Stripe.Checkout.Session;

  const metadata = session.metadata ?? {};
  const customerId = typeof session.customer === "string" ? session.customer : null;
  const subscriptionId =
    typeof session.subscription === "string" ? session.subscription : null;
  const app = metadata.app ?? "";
  const flow = metadata.flow ?? "";
  const plan = (metadata.plan ?? "").trim().toLowerCase();
  const pendingCheckoutId = (metadata.pendingCheckoutId ?? "").trim();
  const email = (
    session.customer_details?.email ||
    metadata.email ||
    ""
  )
    .trim()
    .toLowerCase();

  if (app !== "pecnot" || flow !== "first_purchase") {
    return;
  }

  if (!pendingCheckoutId) {
    throw new Error("pendingCheckoutId mancante nei metadata Stripe");
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

  const pendingCheckout = await prisma.pendingStudioCheckout.findUnique({
    where: {
      id: pendingCheckoutId,
    },
    select: {
      id: true,
      studioName: true,
      loginEmail: true,
      passwordHash: true,
      billingCycle: true,
      status: true,
      expiresAt: true,
      completedStudioId: true,
      billingName: true,
      vatNumber: true,
      taxCode: true,
      billingEmail: true,
      recipientCode: true,
      addressLine1: true,
      city: true,
      province: true,
      postalCode: true,
      country: true,
    },
  });

  if (!pendingCheckout) {
    throw new Error(`Pending checkout non trovato: ${pendingCheckoutId}`);
  }

  if (pendingCheckout.status === "completed" && pendingCheckout.completedStudioId) {
    await prisma.stripeWebhookEvent.create({
      data: {
        stripeEventId: event.id,
        eventType: event.type,
        payload: event as unknown as object,
      },
    });

    return;
  }

  const now = new Date();

  if (pendingCheckout.status !== "pending") {
    throw new Error(
      `Pending checkout non utilizzabile. Stato attuale: ${pendingCheckout.status}`
    );
  }

  if (pendingCheckout.expiresAt <= now) {
    await prisma.pendingStudioCheckout.update({
      where: {
        id: pendingCheckout.id,
      },
      data: {
        status: "expired",
      },
    });

    throw new Error(`Pending checkout scaduto: ${pendingCheckout.id}`);
  }

  if (pendingCheckout.loginEmail !== email) {
    throw new Error(
      `Email checkout non coerente con pending checkout. Pending: ${pendingCheckout.loginEmail}, Stripe: ${email}`
    );
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
    await prisma.$transaction(async (tx) => {
      await tx.pendingStudioCheckout.update({
        where: {
          id: pendingCheckout.id,
        },
        data: {
          stripeCustomerId: customerId,
          stripeSubscriptionId: subscriptionId,
        },
      });

      await tx.stripeWebhookEvent.create({
        data: {
          stripeEventId: event.id,
          eventType: event.type,
          payload: event as unknown as object,
        },
      });

      await tx.auditEvent.create({
        data: {
          studioId: existingStudio.id,
          eventType: "stripe_checkout_completed_existing_email",
          eventPayload: {
            email,
            sessionId: session.id,
            customerId,
            subscriptionId,
            plan,
            pendingCheckoutId: pendingCheckout.id,
          },
        },
      });
    });

    return;
  }

  const startsAt = new Date();
  const { billingCycle, expiresAt } = getBillingCycleAndExpiry(plan, startsAt);

  if (billingCycle !== pendingCheckout.billingCycle) {
    throw new Error(
      `Billing cycle non coerente tra pending checkout e Stripe. Pending: ${pendingCheckout.billingCycle}, Stripe: ${billingCycle}`
    );
  }

  await prisma.$transaction(async (tx) => {
    const studio = await tx.studio.create({
      data: {
        studioName: pendingCheckout.studioName,
        loginEmail: pendingCheckout.loginEmail,
        passwordHash: pendingCheckout.passwordHash,
        licenseStatus: "active",
        billingCycle,
        licenseStartsAt: startsAt,
        licenseExpiresAt: expiresAt,
        billingName: pendingCheckout.billingName,
        vatNumber: pendingCheckout.vatNumber,
        taxCode: pendingCheckout.taxCode,
        billingEmail: pendingCheckout.billingEmail,
        recipientCode: pendingCheckout.recipientCode,
        addressLine1: pendingCheckout.addressLine1,
        city: pendingCheckout.city,
        province: pendingCheckout.province,
        postalCode: pendingCheckout.postalCode,
        country: pendingCheckout.country,
        stripeCustomerId: customerId,
        stripeSubscriptionId: subscriptionId,
        notes: "Creato automaticamente da checkout Stripe PECNOT",
      },
      select: {
        id: true,
        loginEmail: true,
      },
    });

    await tx.pendingStudioCheckout.update({
      where: {
        id: pendingCheckout.id,
      },
      data: {
        status: "completed",
        stripeCustomerId: customerId,
        stripeSubscriptionId: subscriptionId,
        completedStudioId: studio.id,
        completedAt: startsAt,
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
          pendingCheckoutId: pendingCheckout.id,
          billingName: pendingCheckout.billingName,
          vatNumber: pendingCheckout.vatNumber,
          taxCode: pendingCheckout.taxCode,
          billingEmail: pendingCheckout.billingEmail,
          recipientCode: pendingCheckout.recipientCode,
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