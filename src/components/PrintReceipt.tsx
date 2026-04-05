"use client";

import { useCallback } from "react";
import { Printer } from "lucide-react";

interface ReceiptItem {
  name: string;
  quantity: number;
  price: number;
}

interface PrintReceiptProps {
  type: "donation" | "registration";
  receiptId: string;
  date: string;
  name: string;
  email: string;
  eventTitle?: string;
  items?: ReceiptItem[];
  total: number;
  paymentMethod?: string;
  paymentStatus?: string;
}

export default function PrintReceipt(props: PrintReceiptProps) {
  const handlePrint = useCallback(() => {
    const {
      type,
      receiptId,
      date,
      name,
      email,
      eventTitle,
      items,
      total,
      paymentMethod,
      paymentStatus,
    } = props;

    const formattedDate = new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const isDonation = type === "donation";
    const title = isDonation
      ? "Donation Receipt"
      : `Event Registration Receipt`;

    const itemRows = (items || [])
      .map(
        (item) =>
          `<tr>
            <td style="padding:6px 0;border-bottom:1px solid #eee">${item.name}</td>
            <td style="padding:6px 0;border-bottom:1px solid #eee;text-align:center">${item.quantity}</td>
            <td style="padding:6px 0;border-bottom:1px solid #eee;text-align:right">$${(item.quantity * item.price).toFixed(2)}</td>
          </tr>`
      )
      .join("");

    const html = `<!DOCTYPE html>
<html>
<head>
  <title>${title} — BKFC</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #111; padding: 40px; max-width: 600px; margin: 0 auto; }
    .header { text-align: center; margin-bottom: 32px; padding-bottom: 24px; border-bottom: 2px solid #dc2626; }
    .header h1 { font-size: 20px; margin-bottom: 4px; }
    .header p { color: #666; font-size: 13px; }
    .badge { display: inline-block; background: #fef2f2; color: #dc2626; font-size: 11px; font-weight: 600; padding: 3px 10px; border-radius: 999px; margin-top: 8px; text-transform: uppercase; letter-spacing: 0.5px; }
    .section { margin-bottom: 24px; }
    .section-title { font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #999; margin-bottom: 8px; font-weight: 600; }
    .field { display: flex; justify-content: space-between; padding: 4px 0; font-size: 14px; }
    .field .label { color: #666; }
    .field .value { font-weight: 500; }
    table { width: 100%; border-collapse: collapse; font-size: 14px; margin-bottom: 12px; }
    th { text-align: left; padding: 6px 0; border-bottom: 2px solid #ddd; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; color: #666; }
    th:last-child { text-align: right; }
    th:nth-child(2) { text-align: center; }
    .total-row { display: flex; justify-content: space-between; padding: 12px 0; border-top: 2px solid #111; font-size: 18px; font-weight: 700; margin-top: 4px; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; color: #999; font-size: 12px; }
    .footer p { margin-bottom: 4px; }
    .tax-note { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px 16px; font-size: 12px; color: #666; margin-top: 20px; }
    @media print {
      body { padding: 20px; }
      .no-print { display: none !important; }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>Broadalbin-Kennyetto Fire Co.</h1>
    <p>14 Pine Street, Broadalbin, NY 12025</p>
    <p>(518) 883-3611</p>
    <div class="badge">${title}</div>
  </div>

  <div class="section">
    <div class="section-title">Receipt Details</div>
    <div class="field"><span class="label">Receipt #</span><span class="value">${receiptId.slice(0, 8).toUpperCase()}</span></div>
    <div class="field"><span class="label">Date</span><span class="value">${formattedDate}</span></div>
    <div class="field"><span class="label">Name</span><span class="value">${name}</span></div>
    <div class="field"><span class="label">Email</span><span class="value">${email}</span></div>
    ${eventTitle ? `<div class="field"><span class="label">Event</span><span class="value">${eventTitle}</span></div>` : ""}
    ${paymentMethod ? `<div class="field"><span class="label">Payment</span><span class="value">${paymentMethod === "stripe" ? "Credit Card" : "In Person"}</span></div>` : ""}
    ${paymentStatus ? `<div class="field"><span class="label">Status</span><span class="value">${paymentStatus === "paid" ? "Paid" : "Pending"}</span></div>` : ""}
  </div>

  ${
    items && items.length > 0
      ? `
  <div class="section">
    <div class="section-title">Items</div>
    <table>
      <thead><tr><th>Item</th><th style="text-align:center">Qty</th><th style="text-align:right">Amount</th></tr></thead>
      <tbody>${itemRows}</tbody>
    </table>
  </div>`
      : ""
  }

  <div class="total-row">
    <span>${isDonation ? "Donation Amount" : "Total"}</span>
    <span>$${total.toFixed(2)}</span>
  </div>

  ${
    isDonation
      ? `<div class="tax-note">
    <strong>Tax Deduction Notice:</strong> The Broadalbin-Kennyetto Fire Company is a tax-exempt volunteer fire company.
    This receipt may be used for tax purposes. No goods or services were provided in exchange for this contribution.
    Please consult your tax advisor regarding deductibility.
  </div>`
      : ""
  }

  <div class="footer">
    <p>Broadalbin-Kennyetto Fire Company</p>
    <p>14 Pine Street, Broadalbin, NY 12025</p>
    <p>Thank you for your support!</p>
  </div>

  <div class="no-print" style="text-align:center;margin-top:32px">
    <button onclick="window.print()" style="background:#dc2626;color:white;border:none;padding:12px 32px;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer">
      Print Receipt
    </button>
  </div>
</body>
</html>`;

    const win = window.open("", "_blank");
    if (win) {
      win.document.write(html);
      win.document.close();
    }
  }, [props]);

  return (
    <button
      onClick={handlePrint}
      className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white font-semibold px-6 py-3 rounded-xl transition-colors"
    >
      <Printer size={18} />
      Save / Print Receipt
    </button>
  );
}
