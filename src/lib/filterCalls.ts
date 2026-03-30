import { Call } from "@/types";

/**
 * Filter calls for public display.
 * Calls with a releaseAt in the future are hidden (pending disclosure).
 * Calls without releaseAt (manually created) are always visible.
 */
export function filterPublicCalls(calls: Call[]): Call[] {
  const now = new Date().toISOString();
  return calls.filter((call) => {
    // No releaseAt = manually created, always visible
    if (!call.releaseAt) return true;
    // releaseAt in the past = released
    return call.releaseAt <= now;
  });
}
