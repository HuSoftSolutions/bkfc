import { Resend } from "resend";

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
const NOTIFY_TO = process.env.NOTIFICATION_EMAIL || "Contact@BroadalbinFire.com";

export async function sendNotificationEmail(subject: string, html: string) {
  const resend = getResend();
  return resend.emails.send({
    from: FROM,
    to: NOTIFY_TO,
    subject,
    html,
  });
}

export async function sendEmail(to: string, subject: string, html: string) {
  const resend = getResend();
  return resend.emails.send({
    from: FROM,
    to,
    subject,
    html,
  });
}
