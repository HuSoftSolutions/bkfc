/**
 * Client-side helper for obtaining a reCAPTCHA v3 token.
 *
 * `executeRecaptcha` from react-google-recaptcha-v3 throws when Google's
 * script hasn't loaded yet (slow connection) or was blocked (Safari privacy
 * features, content blockers, Lockdown Mode). This waits briefly for a late
 * load and, if it still fails while a site key is configured, throws a
 * message the form can show to the user instead of submitting a blank token.
 */

export const RECAPTCHA_CONFIGURED = !!cleanEnvValue(process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY);

import { cleanEnvValue } from "@/lib/cleanEnv";

export class RecaptchaUnavailableError extends Error {
  constructor() {
    super(
      "We couldn't load the spam-protection check. Turn off content blockers or private browsing for this site."
    );
    this.name = "RecaptchaUnavailableError";
  }
}

type Execute = ((action?: string) => Promise<string>) | undefined;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function getRecaptchaToken(executeRecaptcha: Execute, action: string): Promise<string> {
  if (!RECAPTCHA_CONFIGURED) return "";

  // Retry a few times to cover the script still downloading on a slow link.
  const attempts = 4;
  for (let i = 0; i < attempts; i++) {
    try {
      if (executeRecaptcha) {
        const token = await executeRecaptcha(action);
        if (token) return token;
      }
    } catch {
      // fall through to retry
    }
    if (i < attempts - 1) await sleep(750 * (i + 1));
  }
  throw new RecaptchaUnavailableError();
}
