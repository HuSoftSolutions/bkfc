import twilio from "twilio";

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

export async function sendSMS(to: string, body: string) {
  return client.messages.create({
    body,
    from: process.env.TWILIO_PHONE_NUMBER,
    to,
  });
}

export async function sendNotification(body: string) {
  const to = process.env.NOTIFICATION_PHONE_NUMBER;
  if (!to) throw new Error("NOTIFICATION_PHONE_NUMBER not configured");
  return sendSMS(to, body);
}
