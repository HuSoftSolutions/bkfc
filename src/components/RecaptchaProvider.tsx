"use client";

import { GoogleReCaptchaProvider } from "react-google-recaptcha-v3";

export default function RecaptchaProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;

  // Always wrap with provider so useGoogleReCaptcha hook doesn't crash.
  // If no key is configured, reCAPTCHA simply won't execute.
  return (
    <GoogleReCaptchaProvider reCaptchaKey={siteKey || "not-configured"}>
      {children}
    </GoogleReCaptchaProvider>
  );
}
