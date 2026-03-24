import { NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { getStripeServerClient, requireEnv } from "@/lib/stripe";

export const runtime = "nodejs";

type BillingCycle = "monthly" | "semiannual" | "annual";
type LicenseStatus = "active" | "suspended" | "expired";

type StripeInvoiceLineWithMaybePrice = Stripe.InvoiceLineItem & {
  price?: Stripe.Price | Stripe.DeletedPrice | null;
  type?: string;
};

type StripeSubscriptionWithMaybePeriods = Stripe.Subscription & {
  current_period_start?: number;
  current_period_end?: number;
};

type StripeInvoiceWithMaybeRefs = Stripe.Invoice & {
  subscription?: string | Stripe.Subscription | null;
  customer?: string | Stripe.Customer | Stripe.DeletedCustomer | null;
  next_payment_attempt?: number | null;
};

function addMonths(base: Date, months: number): Date {
  const d = new Date(base);
  d.setUTCMonth(d.getUTCMonth() + months);
  return d;
}

function getBillingCycleAndExpiry(
  plan: string,
  startsAt: Date
): {
  billingCycle: BillingCycle;
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

function unixToDate(value: number | null | undefined): Date | null {
  if (!value || !Number.isFinite(value)) {
    return null;
  }

  return new Date(value * 1000);
}

function getBillingCycleFromPrice(
  price: Stripe.Price | Stripe.DeletedPrice | null | undefined
): BillingCycle | null {
  if (!price || price.deleted) {
    return null;
  }

  const recurring = price.recurring;
  if (!recurring) {
    return null;
  }

  const interval = recurring.interval;
  const intervalCount = recurring.interval_count ?? 1;

  if (interval === "month" && intervalCount === 1) {
    return "monthly";
  }

  if (interval === "month" && intervalCount === 6) {
    return "semiannual";
  }

  if (interval === "month" && intervalCount === 12) {
    return "annual";
  }

  if (interval === "year" && intervalCount === 1) {
    return "annual";
  }

  return null;
}

function getBillingCycleFromSubscription(
  subscription: Stripe.Subscription
): BillingCycle | null {
  const firstItem = subscription.items.data[0];
  return getBillingCycleFromPrice(firstItem?.price);
}

function getInvoiceLinePrice(
  line: Stripe.InvoiceLineItem
): Stripe.Price | Stripe.DeletedPrice | null {
  const maybePricedLine = line as StripeInvoiceLineWithMaybePrice;
  return maybePricedLine.price ?? null;
}

function getBillingCycleFromInvoice(invoice: Stripe.Invoice): BillingCycle | null {
  const subscriptionLine = invoice.lines.data.find((line) => {
    const price = getInvoiceLinePrice(line);
    const typedLine = line as StripeInvoiceLineWithMaybePrice;
    return Boolean(price) && typedLine.type === "subscription";
  });

  const subscriptionLinePrice = subscriptionLine
    ? getInvoiceLinePrice(subscriptionLine)
    : null;

  if (subscriptionLinePrice) {
    return getBillingCycleFromPrice(subscriptionLinePrice);
  }

  const firstPricedLine = invoice.lines.data.find((line) =>
    Boolean(getInvoiceLinePrice(line))
  );

  if (!firstPricedLine) {
    return null;
  }

  return getBillingCycleFromPrice(getInvoiceLinePrice(firstPricedLine));
}

function getInvoicePeriod(invoice: Stripe.Invoice): {
  startsAt: Date | null;
  expiresAt: Date | null;
} {
  const subscriptionLine =
    invoice.lines.data.find((line) => {
      const typedLine = line as StripeInvoiceLineWithMaybePrice;
      return typedLine.type === "subscription";
    }) ?? invoice.lines.data[0];

  const startsAt = unixToDate(subscriptionLine?.period?.start);
  const expiresAt = unixToDate(subscriptionLine?.period?.end);

  return { startsAt, expiresAt };
}

function getSubscriptionPeriod(subscription: Stripe.Subscription): {
  startsAt: Date | null;
  expiresAt: Date | null;
} {
  const typedSubscription = subscription as StripeSubscriptionWithMaybePeriods;

  return {
    startsAt: unixToDate(typedSubscription.current_period_start),
    expiresAt: unixToDate(typedSubscription.current_period_end),
  };
}

function mapStripeSubscriptionStatusToLicenseStatus(
  status: Stripe.Subscription.Status
): LicenseStatus {
  switch (status) {
    case "active":
    case "trialing":
      return "active";
    case "past_due":
    case "unpaid":
    case "incomplete":
    case "incomplete_expired":
    case "paused":
      return "suspended";
    case "canceled":
      return "expired";
    default:
      return "suspended";
  }
}

async function hasProcessedWebhookEvent(stripeEventId: string): Promise<boolean> {
  const existing = await prisma.stripeWebhookEvent.findUnique({
    where: {
      stripeEventId,
    },
    select: {
      id: true,
    },
  });

  return Boolean(existing);
}

async function recordWebhookEvent(event: Stripe.Event) {
  await prisma.stripeWebhookEvent.create({
    data: {
      stripeEventId: event.id,
      eventType: event.type,
      payload: event as unknown as object,
    },
  });
}

async function findStudioByStripeReferences(params: {
  subscriptionId?: string | null;
  customerId?: string | null;
}) {
  const subscriptionId = params.subscriptionId?.trim() || "";
  const customerId = params.customerId?.trim() || "";

  if (subscriptionId) {
    const studioBySubscription = await prisma.studio.findFirst({
      where: {
        stripeSubscriptionId: subscriptionId,
      },
      select: {
        id: true,
        studioName: true,
        loginEmail: true,
        billingCycle: true,
        licenseStatus: true,
        licenseStartsAt: true,
        licenseExpiresAt: true,
        stripeCustomerId: true,
        stripeSubscriptionId: true,
      },
    });

    if (studioBySubscription) {
      return studioBySubscription;
    }
  }

  if (customerId) {
    const studioByCustomer = await prisma.studio.findFirst({
      where: {
        stripeCustomerId: customerId,
      },
      select: {
        id: true,
        studioName: true,
        loginEmail: true,
        billingCycle: true,
        licenseStatus: true,
        licenseStartsAt: true,
        licenseExpiresAt: true,
        stripeCustomerId: true,
        stripeSubscriptionId: true,
      },
    });

    if (studioByCustomer) {
      return studioByCustomer;
    }
  }

  return null;
}

async function handleCheckoutSessionCompleted(event: Stripe.Event) {
  if (await hasProcessedWebhookEvent(event.id)) {
    return;
  }

  const session = event.data.object as Stripe.Checkout.Session;

  const metadata = session.metadata ?? {};
  const customerId = typeof session.customer === "string" ? session.customer : null;
  const subscriptionId =
    typeof session.subscription === "string" ? session.subscription : null;
  const app = metadata.app ?? "";
  const flow = metadata.flow ?? "";
  const plan = (metadata.plan ?? "").trim().toLowerCase();
  const pendingCheckoutId = (metadata.pendingCheckoutId ?? "").trim();
  const email = (session.customer_details?.email || metadata.email || "")
    .trim()
    .toLowerCase();

  if (app !== "pecnot" || flow !== "first_purchase") {
    await recordWebhookEvent(event);
    return;
  }

  if (!pendingCheckoutId) {
    throw new Error("pendingCheckoutId mancante nei metadata Stripe");
  }

  if (!email) {
    throw new Error("Email mancante nel checkout Stripe");
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
    await recordWebhookEvent(event);
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

async function handleInvoicePaid(event: Stripe.Event) {
  if (await hasProcessedWebhookEvent(event.id)) {
    return;
  }

  const invoice = event.data.object as StripeInvoiceWithMaybeRefs;
  const subscriptionId =
    typeof invoice.subscription === "string" ? invoice.subscription : null;
  const customerId =
    typeof invoice.customer === "string" ? invoice.customer : null;

  const studio = await findStudioByStripeReferences({
    subscriptionId,
    customerId,
  });

  if (!studio) {
    await recordWebhookEvent(event);
    return;
  }

  const period = getInvoicePeriod(invoice);
  const billingCycle = getBillingCycleFromInvoice(invoice) ?? studio.billingCycle;
  const licenseStartsAt = period.startsAt ?? studio.licenseStartsAt;
  const licenseExpiresAt =
    period.expiresAt ??
    getBillingCycleAndExpiry(billingCycle, licenseStartsAt).expiresAt;

  await prisma.$transaction(async (tx) => {
    await tx.studio.update({
      where: {
        id: studio.id,
      },
      data: {
        stripeCustomerId: customerId ?? studio.stripeCustomerId,
        stripeSubscriptionId: subscriptionId ?? studio.stripeSubscriptionId,
        billingCycle,
        licenseStatus: "active",
        licenseStartsAt,
        licenseExpiresAt,
      },
    });

    await tx.auditEvent.create({
      data: {
        studioId: studio.id,
        eventType: "stripe_invoice_paid",
        eventPayload: {
          stripeEventId: event.id,
          invoiceId: invoice.id,
          subscriptionId,
          customerId,
          billingReason: invoice.billing_reason,
          amountPaid: invoice.amount_paid,
          currency: invoice.currency,
          billingCycle,
          licenseStartsAt: licenseStartsAt.toISOString(),
          licenseExpiresAt: licenseExpiresAt.toISOString(),
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

async function handleInvoicePaymentFailed(event: Stripe.Event) {
  if (await hasProcessedWebhookEvent(event.id)) {
    return;
  }

  const invoice = event.data.object as StripeInvoiceWithMaybeRefs;
  const subscriptionId =
    typeof invoice.subscription === "string" ? invoice.subscription : null;
  const customerId =
    typeof invoice.customer === "string" ? invoice.customer : null;

  const studio = await findStudioByStripeReferences({
    subscriptionId,
    customerId,
  });

  if (!studio) {
    await recordWebhookEvent(event);
    return;
  }

  await prisma.$transaction(async (tx) => {
    await tx.auditEvent.create({
      data: {
        studioId: studio.id,
        eventType: "stripe_invoice_payment_failed",
        eventPayload: {
          stripeEventId: event.id,
          invoiceId: invoice.id,
          subscriptionId,
          customerId,
          billingReason: invoice.billing_reason,
          amountDue: invoice.amount_due,
          attemptCount: invoice.attempt_count,
          nextPaymentAttempt:
            unixToDate(invoice.next_payment_attempt)?.toISOString() ?? null,
          statusBefore: studio.licenseStatus,
          note: "Licenza non sospesa automaticamente su invoice.payment_failed. La sospensione è demandata agli eventi subscription.",
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

async function handleSubscriptionUpdated(event: Stripe.Event) {
  if (await hasProcessedWebhookEvent(event.id)) {
    return;
  }

  const subscription = event.data.object as Stripe.Subscription;
  const subscriptionId = subscription.id;
  const customerId =
    typeof subscription.customer === "string" ? subscription.customer : null;

  const studio = await findStudioByStripeReferences({
    subscriptionId,
    customerId,
  });

  if (!studio) {
    await recordWebhookEvent(event);
    return;
  }

  const period = getSubscriptionPeriod(subscription);
  const billingCycle =
    getBillingCycleFromSubscription(subscription) ?? studio.billingCycle;

  const licenseStartsAt = period.startsAt ?? studio.licenseStartsAt;
  const licenseExpiresAt =
    period.expiresAt ??
    getBillingCycleAndExpiry(billingCycle, licenseStartsAt).expiresAt;

  const licenseStatus = mapStripeSubscriptionStatusToLicenseStatus(
    subscription.status
  );

  await prisma.$transaction(async (tx) => {
    await tx.studio.update({
      where: {
        id: studio.id,
      },
      data: {
        stripeCustomerId: customerId ?? studio.stripeCustomerId,
        stripeSubscriptionId: subscriptionId,
        billingCycle,
        licenseStatus,
        licenseStartsAt,
        licenseExpiresAt,
      },
    });

    await tx.auditEvent.create({
      data: {
        studioId: studio.id,
        eventType: "stripe_subscription_updated",
        eventPayload: {
          stripeEventId: event.id,
          subscriptionId,
          customerId,
          stripeStatus: subscription.status,
          cancelAtPeriodEnd: subscription.cancel_at_period_end,
          canceledAt: unixToDate(subscription.canceled_at)?.toISOString() ?? null,
          currentPeriodStart: licenseStartsAt.toISOString(),
          currentPeriodEnd: licenseExpiresAt.toISOString(),
          mappedLicenseStatus: licenseStatus,
          billingCycle,
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

async function handleSubscriptionDeleted(event: Stripe.Event) {
  if (await hasProcessedWebhookEvent(event.id)) {
    return;
  }

  const subscription = event.data.object as Stripe.Subscription;
  const subscriptionId = subscription.id;
  const customerId =
    typeof subscription.customer === "string" ? subscription.customer : null;

  const studio = await findStudioByStripeReferences({
    subscriptionId,
    customerId,
  });

  if (!studio) {
    await recordWebhookEvent(event);
    return;
  }

  const now = new Date();
  const period = getSubscriptionPeriod(subscription);
  const effectiveExpiry =
    period.expiresAt && period.expiresAt > now ? period.expiresAt : now;

  await prisma.$transaction(async (tx) => {
    await tx.studio.update({
      where: {
        id: studio.id,
      },
      data: {
        stripeCustomerId: customerId ?? studio.stripeCustomerId,
        stripeSubscriptionId: subscriptionId,
        licenseStatus: "expired",
        licenseExpiresAt: effectiveExpiry,
      },
    });

    await tx.auditEvent.create({
      data: {
        studioId: studio.id,
        eventType: "stripe_subscription_deleted",
        eventPayload: {
          stripeEventId: event.id,
          subscriptionId,
          customerId,
          canceledAt: unixToDate(subscription.canceled_at)?.toISOString() ?? null,
          currentPeriodEnd: period.expiresAt?.toISOString() ?? null,
          effectiveLicenseExpiresAt: effectiveExpiry.toISOString(),
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

    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutSessionCompleted(event);
        break;
      case "invoice.paid":
        await handleInvoicePaid(event);
        break;
      case "invoice.payment_failed":
        await handleInvoicePaymentFailed(event);
        break;
      case "customer.subscription.updated":
        await handleSubscriptionUpdated(event);
        break;
      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(event);
        break;
      default:
        if (!(await hasProcessedWebhookEvent(event.id))) {
          await recordWebhookEvent(event);
        }
        break;
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