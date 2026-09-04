import { Fund } from "@/types";

export const GENERAL_FUND_SLUG = "general";
export const GENERAL_FUND_NAME = "General Fund";

export function slugifyFund(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

/** Resolve a donation's fund slug, treating missing values as the general fund. */
export function donationFundSlug(fund?: string | null) {
  return fund && fund.trim() ? fund : GENERAL_FUND_SLUG;
}

/** Human-readable fund name for a slug, falling back to the slug itself. */
export function fundLabel(slug: string | undefined, funds: Fund[]) {
  const resolved = donationFundSlug(slug);
  if (resolved === GENERAL_FUND_SLUG) return GENERAL_FUND_NAME;
  return funds.find((f) => f.slug === resolved)?.name ?? resolved;
}

export function formatMoney(amount: number, fractionDigits = 0) {
  return amount.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });
}
