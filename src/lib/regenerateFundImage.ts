import { GENERAL_FUND_SLUG } from "@/lib/funds";

/** Ask the server to re-render a fund's stored progress images. Best effort. */
export async function regenerateFundImage(slug?: string | null) {
  if (!slug || slug === GENERAL_FUND_SLUG) return;
  try {
    await fetch(`/api/funds/${slug}/regenerate`, { method: "POST" });
  } catch (err) {
    console.error("Failed to refresh fund image", err);
  }
}
