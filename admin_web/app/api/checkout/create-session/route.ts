import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getPecnotCancelUrl,
  getPecnotSuccessUrl,
  getStripePriceId,
  getStripeServerClient,
  isValidPecnotPlan,
  normalizeCustomerEmail,
} from "@/lib/stripe";

type CreateCheckoutSessionBody = {
  email?: string;
  plan?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CreateCheckoutSessionBody;

    const rawEmail = body.email ?? "";
    const rawPlan = body.plan ?? "";

    const email = normalizeCustomerEmail(rawEmail);
    const plan = rawPlan.trim().toLowerCase();

    if (!email) {
      return NextResponse.json(
        {
          ok: false,
          error: "Email obbligatoria",
        },
        { status: 400 }
      );
    }

    if (!isValidPecnotPlan(plan)) {
      return NextResponse.json(
        {
          ok: false,
          error: "Piano non valido",
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
            "Questa email risulta già registrata. Per il rinnovo usa il flusso dedicato.",
          code: "EMAIL_ALREADY_REGISTERED",
        },
        { status: 409 }
      );
    }

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
        plan,
        email,
      },
      subscription_data: {
        metadata: {
          app: "pecnot",
          flow: "first_purchase",
          plan,
          email,
        },
      },
    });

    return NextResponse.json({
      ok: true,
      url: session.url,
      sessionId: session.id,
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