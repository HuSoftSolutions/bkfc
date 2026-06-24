// Optional "pass the card processing fee to the customer" surcharge.
//
// Stripe charges its fee on the FULL amount it captures — including any
// surcharge we add — so a naive `subtotal * percent + fixed` slightly
// under-recovers the cost. We instead "gross up": find the charge total G
// such that, after Stripe's cut, the company nets exactly the subtotal.
//
//   G - (G * percent + fixed) = subtotal
//   G (1 - percent) = subtotal + fixed
//   G = (subtotal + fixed) / (1 - percent)
//   surcharge = G - subtotal
//
// This module is pure (no Firebase) so it can run on both the client (for the
// order-summary preview) and the server (for the authoritative charge).

export interface StripeFeeConfig {
  /** Percent fee, e.g. 2.9 for 2.9%. */
  percent: number;
  /** Fixed per-transaction fee in dollars, e.g. 0.30. */
  fixed: number;
}

export const DEFAULT_STRIPE_FEE: StripeFeeConfig = { percent: 2.9, fixed: 0.3 };

/** Line-item label shown to the customer and on receipts. */
export const CARD_FEE_LABEL = "Card Processing Fee";

/** Synthetic option id used for the fee line item. */
export const CARD_FEE_OPTION_ID = "card-processing-fee";

/**
 * The surcharge (in dollars, rounded to cents) to add so the company nets the
 * full subtotal after Stripe's fee. Returns 0 for non-positive subtotals or a
 * nonsensical config.
 */
export function computeCardFee(
  subtotal: number,
  config: StripeFeeConfig = DEFAULT_STRIPE_FEE
): number {
  if (!(subtotal > 0)) return 0;
  const percent = Number(config.percent) / 100;
  const fixed = Number(config.fixed) || 0;
  if (!(percent >= 0) || percent >= 1) return 0;
  const gross = (subtotal + fixed) / (1 - percent);
  const surcharge = gross - subtotal;
  return Math.round(surcharge * 100) / 100;
}

/** Normalize a raw Firestore `settings/fees` doc into a StripeFeeConfig. */
export function normalizeFeeConfig(data: unknown): StripeFeeConfig {
  const d = (data || {}) as Partial<Record<keyof StripeFeeConfig, unknown>>;
  const percent = Number(d.percent);
  const fixed = Number(d.fixed);
  return {
    percent: Number.isFinite(percent) ? percent : DEFAULT_STRIPE_FEE.percent,
    fixed: Number.isFinite(fixed) ? fixed : DEFAULT_STRIPE_FEE.fixed,
  };
}
