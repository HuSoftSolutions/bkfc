import { Resend } from "resend";
import { getAdminDb } from "@/lib/firebaseAdmin";

let _resend: Resend | undefined;

function getResend(): Resend {
  if (!_resend) {
    const key = process.env.RESEND_API_KEY;
    if (!key) throw new Error("RESEND_API_KEY not configured");
    _resend = new Resend(key);
  }
  return _resend;
}

const FROM = process.env.EMAIL_FROM || "BKFC <noreply@broadalbinfire.com>";
const FALLBACK_TO = process.env.NOTIFICATION_EMAIL || "Contact@BroadalbinFire.com";

export type NotificationType =
  | "contact"
  | "volunteer"
  | "donation"
  | "registration"
  | "general";

let _emailRoutes: Record<string, string> | null = null;
let _routesFetchedAt = 0;

async function getRecipient(type: NotificationType): Promise<string> {
  // Cache for 5 minutes
  if (_emailRoutes && Date.now() - _routesFetchedAt < 5 * 60 * 1000) {
    return _emailRoutes[type] || _emailRoutes.general || FALLBACK_TO;
  }

  try {
    const db = getAdminDb();
    const snap = await db.collection("settings").doc("emailRouting").get();
    if (snap.exists) {
      _emailRoutes = snap.data() as Record<string, string>;
      _routesFetchedAt = Date.now();
      return _emailRoutes[type] || _emailRoutes.general || FALLBACK_TO;
    }
  } catch {
    // Fall back to env var
  }

  return FALLBACK_TO;
}

export async function sendNotificationEmail(
  subject: string,
  html: string,
  type: NotificationType = "general"
) {
  const resend = getResend();
  const to = await getRecipient(type);
  return resend.emails.send({ from: FROM, to, subject, html });
}

export async function sendEmail(to: string, subject: string, html: string) {
  const resend = getResend();
  return resend.emails.send({ from: FROM, to, subject, html });
}
