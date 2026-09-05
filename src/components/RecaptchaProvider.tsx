"use client";

import { GoogleReCaptchaProvider } from "react-google-recaptcha-v3";
import { cleanEnvValue } from "@/lib/cleanEnv";

export default function RecaptchaProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  // Strip stray whitespace or a pasted "\n"; Google rejects a key that
  // doesn't match the one the script was loaded with byte for byte.
  const siteKey = cleanEnvValue(process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY);

  // Always wrap with provider so useGoogleReCaptcha hook doesn't crash.
  // If no key is configured, reCAPTCHA simply won't execute.
  return (
    <GoogleReCaptchaProvider reCaptchaKey={siteKey || "not-configured"}>
      {children}
    </GoogleReCaptchaProvider>
  );
}
