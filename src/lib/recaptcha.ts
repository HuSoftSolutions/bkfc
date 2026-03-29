export async function verifyRecaptcha(token: string): Promise<boolean> {
  const secret = process.env.RECAPTCHA_SECRET_KEY;

  // Skip verification if not configured or no token provided
  if (!secret || !token) return true;

  try {
    const res = await fetch("https://www.google.com/recaptcha/api/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `secret=${secret}&response=${token}`,
    });

    const data = await res.json();

    // Log for debugging
    if (!data.success) {
      console.error("reCAPTCHA verification failed:", data["error-codes"]);
    }

    return data.success && (data.score === undefined || data.score >= 0.5);
  } catch (err) {
    console.error("reCAPTCHA verification error:", err);
    // Don't block submissions if reCAPTCHA service is down
    return true;
  }
}
