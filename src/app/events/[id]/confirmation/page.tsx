"use client";

import { Suspense, useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import { EventRegistration } from "@/types";
import Link from "next/link";
import { CheckCircle, Calendar, Mail, Download } from "lucide-react";
import PrintReceipt from "@/components/PrintReceipt";

export default function ConfirmationPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-lg mx-auto px-4 py-20 text-center text-gray-400">
          Loading...
        </div>
      }
    >
      <ConfirmationContent />
    </Suspense>
  );
}

function ConfirmationContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const eventId = params.id as string;
  const registrationId = searchParams.get("registration");
  const sessionId = searchParams.get("session");

  const [registration, setRegistration] = useState<EventRegistration | null>(
    null
  );
  const [resolvedRegId, setResolvedRegId] = useState<string | null>(registrationId);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchReg() {
      if (!registrationId && !sessionId) {
        setLoading(false);
        return;
      }
      try {
        if (registrationId) {
          // Direct lookup (in-person registrations)
          const snap = await getDoc(
            doc(getDb(), "registrations", registrationId)
          );
          if (snap.exists()) {
            setRegistration({ id: snap.id, ...snap.data() } as EventRegistration);
            setResolvedRegId(snap.id);
          }
        } else if (sessionId) {
          // Lookup by Stripe session ID (card payments)
          const q = query(
            collection(getDb(), "registrations"),
            where("stripeSessionId", "==", sessionId)
          );
          const snap = await getDocs(q);
          if (!snap.empty) {
            const d = snap.docs[0];
            setRegistration({ id: d.id, ...d.data() } as EventRegistration);
            setResolvedRegId(d.id);
          }
        }
      } catch (err) {
        console.error("Error:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchReg();
  }, [registrationId, sessionId]);

  if (loading) {
    return (
      <div className="max-w-lg mx-auto px-4 py-20">
        <div className="animate-pulse space-y-4">
          <div className="h-16 bg-gray-200 rounded-full w-16 mx-auto" />
          <div className="h-8 bg-gray-200 rounded w-3/4 mx-auto" />
          <div className="h-40 bg-gray-200 rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-20 text-center">
      <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6">
        <CheckCircle size={32} className="text-green-600" />
      </div>

      <h1 className="text-3xl font-extrabold text-gray-900 mb-2">
        Registration Confirmed!
      </h1>
      <p className="text-gray-500 mb-8">
        Thank you for registering
        {registration?.eventTitle
          ? ` for ${registration.eventTitle}`
          : ""}
        .
      </p>

      {registration && (
        <div className="bg-gray-50 border border-gray-200 rounded-2xl p-6 text-left mb-8">
          <h3 className="font-bold text-gray-900 mb-4">Order Details</h3>

          <div className="space-y-2 mb-4">
            {registration.items.map((item, i) => (
              <div key={i} className="flex justify-between text-sm">
                <span className="text-gray-600">
                  {item.name} x{item.quantity}
                </span>
                <span className="text-gray-900 font-medium">
                  ${(item.quantity * item.price).toFixed(2)}
                </span>
              </div>
            ))}
            <div className="border-t border-gray-200 pt-2 flex justify-between font-bold text-gray-900">
              <span>Total</span>
              <span>${registration.total.toFixed(2)}</span>
            </div>
          </div>

          <div className="border-t border-gray-200 pt-4 space-y-2 text-sm">
            <div className="flex items-center gap-2 text-gray-500">
              <Mail size={14} />
              <span>{registration.email}</span>
            </div>
            <div className="flex items-center gap-2 text-gray-500">
              <Calendar size={14} />
              <span>
                Payment:{" "}
                {registration.paymentMethod === "stripe"
                  ? "Online (Card)"
                  : "Pay In Person"}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                  registration.paymentStatus === "paid"
                    ? "bg-green-50 text-green-700"
                    : "bg-yellow-50 text-yellow-700"
                }`}
              >
                {registration.paymentStatus === "paid" ? "Paid" : "Pending"}
              </span>
            </div>
          </div>
        </div>
      )}

      {registration && resolvedRegId && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-5 mb-8 text-left">
          <h3 className="font-bold text-red-900 mb-1 flex items-center gap-2">
            <Download size={18} className="text-red-600" />
            Save Your Receipt
          </h3>
          <p className="text-red-700 text-sm mb-4">
            Your receipt is your proof of purchase. Save or print it now — you will need to present it at the event to claim your order.
          </p>
          <PrintReceipt
            type="registration"
            receiptId={resolvedRegId}
            date={registration.createdAt}
            name={registration.name}
            email={registration.email}
            eventTitle={registration.eventTitle}
            items={registration.items}
            total={registration.total}
            paymentMethod={registration.paymentMethod}
            paymentStatus={registration.paymentStatus}
          />
        </div>
      )}

      <Link
        href={`/events/${eventId}`}
        className="inline-flex items-center gap-2 text-red-600 hover:text-red-700 font-medium transition-colors"
      >
        &larr; Back to Event
      </Link>
    </div>
  );
}
