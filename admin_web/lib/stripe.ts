import Stripe from "stripe";

export type PecnotPlan = "monthly" | "semiannual" | "annual";

export function requireEnv(name: string): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`Variabile ambiente mancante: ${name}`);
  }

  return value;
}

export function getStripeServerClient(): Stripe {
  return new Stripe(requireEnv("STRIPE_SECRET_KEY"), {
    apiVersion: "2026-02-25.clover",
  });
}

export function getPecnotBaseUrl(): string {
  return requireEnv("PECNOT_PUBLIC_BASE_URL").replace(/\/+$/, "");
}

export function getPecnotSuccessUrl(): string {
  return requireEnv("PECNOT_PUBLIC_SUCCESS_URL");
}

export function getPecnotCancelUrl(): string {
  return requireEnv("PECNOT_PUBLIC_CANCEL_URL");
}

export function getStripePriceId(plan: PecnotPlan): string {
  switch (plan) {
    case "monthly":
      return requireEnv("STRIPE_PRICE_MONTHLY");
    case "semiannual":
      return requireEnv("STRIPE_PRICE_SEMIANNUAL");
    case "annual":
      return requireEnv("STRIPE_PRICE_ANNUAL");
    default: {
      const _never: never = plan;
      throw new Error(`Piano non supportato: ${String(_never)}`);
    }
  }
}

export function isValidPecnotPlan(value: string): value is PecnotPlan {
  return value === "monthly" || value === "semiannual" || value === "annual";
}

export function normalizeCustomerEmail(value: string): string {
  return value.trim().toLowerCase();
}