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

// --- Registration email templates ---

interface RegistrationEmailData {
  name: string;
  email: string;
  phone: string;
  eventTitle: string;
  eventDate: string;
  eventTime?: string;
  eventLocation?: string;
  items: { name: string; quantity: number; price: number }[];
  total: number;
  paymentMethod: "stripe" | "in-person";
  paymentStatus: "pending" | "paid";
  registrationId: string;
}

function formatEmailDate(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatEmailTime(time: string): string {
  if (!time) return "";
  const [h, m] = time.split(":");
  const hour = parseInt(h);
  const ampm = hour >= 12 ? "PM" : "AM";
  const h12 = hour % 12 || 12;
  return `${h12}:${m} ${ampm}`;
}

function buildItemsTable(items: RegistrationEmailData["items"], total: number): string {
  const rows = items
    .map(
      (item) =>
        `<tr>
          <td style="padding:10px 16px;border-bottom:1px solid #eee;font-size:14px;color:#333">${item.name}</td>
          <td style="padding:10px 16px;border-bottom:1px solid #eee;font-size:14px;color:#333;text-align:center">${item.quantity}</td>
          <td style="padding:10px 16px;border-bottom:1px solid #eee;font-size:14px;color:#333;text-align:right">$${(item.quantity * item.price).toFixed(2)}</td>
        </tr>`
    )
    .join("");

  return `<table style="width:100%;border-collapse:collapse;margin:16px 0">
    <thead>
      <tr style="background:#f9fafb">
        <th style="padding:8px 16px;text-align:left;font-size:12px;text-transform:uppercase;color:#666;letter-spacing:0.5px">Item</th>
        <th style="padding:8px 16px;text-align:center;font-size:12px;text-transform:uppercase;color:#666;letter-spacing:0.5px">Qty</th>
        <th style="padding:8px 16px;text-align:right;font-size:12px;text-transform:uppercase;color:#666;letter-spacing:0.5px">Amount</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
    <tfoot>
      <tr>
        <td colspan="2" style="padding:12px 16px;font-weight:700;font-size:16px;color:#111">Total</td>
        <td style="padding:12px 16px;font-weight:700;font-size:16px;color:#111;text-align:right">$${total.toFixed(2)}</td>
      </tr>
    </tfoot>
  </table>`;
}

function buildEventDetails(data: RegistrationEmailData): string {
  let details = `<td style="padding:8px 16px;font-size:14px;color:#333">${formatEmailDate(data.eventDate)}</td>`;
  if (data.eventTime) {
    details = `<td style="padding:8px 16px;font-size:14px;color:#333">${formatEmailDate(data.eventDate)} at ${formatEmailTime(data.eventTime)}</td>`;
  }

  return `<table style="width:100%;border-collapse:collapse;margin:16px 0;background:#f9fafb;border-radius:8px">
    <tr>
      <td style="padding:8px 16px;font-size:12px;color:#666;font-weight:600;width:100px">Event</td>
      <td style="padding:8px 16px;font-size:14px;color:#333;font-weight:600">${data.eventTitle}</td>
    </tr>
    <tr>
      <td style="padding:8px 16px;font-size:12px;color:#666;font-weight:600">Date</td>
      ${details}
    </tr>
    ${data.eventLocation ? `<tr>
      <td style="padding:8px 16px;font-size:12px;color:#666;font-weight:600">Location</td>
      <td style="padding:8px 16px;font-size:14px;color:#333">${data.eventLocation}</td>
    </tr>` : ""}
  </table>`;
}

export function buildCustomerReceiptHtml(data: RegistrationEmailData): string {
  const isPaid = data.paymentStatus === "paid";
  const statusColor = isPaid ? "#16a34a" : "#ca8a04";
  const statusText = isPaid ? "PAID" : "PAYMENT DUE IN PERSON";

  return `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:560px;margin:0 auto;color:#111">
    <div style="text-align:center;padding:32px 0 24px;border-bottom:3px solid #dc2626">
      <h1 style="margin:0 0 4px;font-size:20px;color:#111">Broadalbin-Kennyetto Fire Co.</h1>
      <p style="margin:0;font-size:13px;color:#666">14 Pine Street, Broadalbin, NY 12025</p>
    </div>

    <div style="text-align:center;padding:24px 0">
      <div style="display:inline-block;background:#fef2f2;color:#dc2626;font-size:11px;font-weight:700;padding:4px 14px;border-radius:999px;text-transform:uppercase;letter-spacing:0.5px">Event Registration</div>
      <h2 style="margin:16px 0 4px;font-size:22px;color:#111">Registration Confirmed</h2>
      <p style="margin:0;font-size:14px;color:#666">Present this email at the event to redeem your order.</p>
    </div>

    ${buildEventDetails(data)}

    <div style="margin:16px 0;padding:12px 16px;background:#f9fafb;border-radius:8px">
      <table style="width:100%;border-collapse:collapse">
        <tr>
          <td style="padding:4px 0;font-size:12px;color:#666;font-weight:600">Name</td>
          <td style="padding:4px 0;font-size:14px;color:#333">${data.name}</td>
        </tr>
        <tr>
          <td style="padding:4px 0;font-size:12px;color:#666;font-weight:600">Email</td>
          <td style="padding:4px 0;font-size:14px;color:#333">${data.email}</td>
        </tr>
        ${data.phone ? `<tr>
          <td style="padding:4px 0;font-size:12px;color:#666;font-weight:600">Phone</td>
          <td style="padding:4px 0;font-size:14px;color:#333">${data.phone}</td>
        </tr>` : ""}
        <tr>
          <td style="padding:4px 0;font-size:12px;color:#666;font-weight:600">Receipt #</td>
          <td style="padding:4px 0;font-size:14px;color:#333;font-family:monospace">${data.registrationId.slice(0, 8).toUpperCase()}</td>
        </tr>
      </table>
    </div>

    ${buildItemsTable(data.items, data.total)}

    <div style="text-align:center;margin:20px 0">
      <div style="display:inline-block;background:${statusColor};color:white;font-size:13px;font-weight:700;padding:8px 24px;border-radius:8px;letter-spacing:0.5px">${statusText}</div>
    </div>

    <div style="text-align:center;margin:32px 0 0;padding:20px 0;border-top:1px solid #eee;color:#999;font-size:12px">
      <p style="margin:0 0 4px">Broadalbin-Kennyetto Fire Company</p>
      <p style="margin:0 0 4px">14 Pine Street, Broadalbin, NY 12025</p>
      <p style="margin:0">Thank you for your support!</p>
    </div>
  </div>`;
}

export function buildAdminNotificationHtml(data: RegistrationEmailData): string {
  const isPaid = data.paymentStatus === "paid";
  const paymentLabel = data.paymentMethod === "stripe" ? "Credit Card" : "Pay In Person";
  const statusLabel = isPaid ? "Paid" : "Pending";

  return `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:560px;margin:0 auto;color:#111">
    <h2 style="margin:0 0 16px;font-size:18px">New Registration: ${data.eventTitle}</h2>

    ${buildEventDetails(data)}

    <div style="margin:16px 0;padding:12px 16px;background:#f9fafb;border-radius:8px">
      <table style="width:100%;border-collapse:collapse">
        <tr>
          <td style="padding:4px 0;font-size:12px;color:#666;font-weight:600;width:100px">Name</td>
          <td style="padding:4px 0;font-size:14px;color:#333">${data.name}</td>
        </tr>
        <tr>
          <td style="padding:4px 0;font-size:12px;color:#666;font-weight:600">Email</td>
          <td style="padding:4px 0;font-size:14px;color:#333">${data.email}</td>
        </tr>
        ${data.phone ? `<tr>
          <td style="padding:4px 0;font-size:12px;color:#666;font-weight:600">Phone</td>
          <td style="padding:4px 0;font-size:14px;color:#333">${data.phone}</td>
        </tr>` : ""}
        <tr>
          <td style="padding:4px 0;font-size:12px;color:#666;font-weight:600">Payment</td>
          <td style="padding:4px 0;font-size:14px;color:#333">${paymentLabel} — ${statusLabel}</td>
        </tr>
        <tr>
          <td style="padding:4px 0;font-size:12px;color:#666;font-weight:600">Receipt #</td>
          <td style="padding:4px 0;font-size:14px;color:#333;font-family:monospace">${data.registrationId.slice(0, 8).toUpperCase()}</td>
        </tr>
      </table>
    </div>

    ${buildItemsTable(data.items, data.total)}
  </div>`;
}
