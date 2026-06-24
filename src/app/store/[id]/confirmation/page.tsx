"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { collection, query, where, getDocs } from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import { ProductOrder } from "@/types";
import Link from "next/link";
import { CheckCircle, Mail, CreditCard, Clock } from "lucide-react";
import PrintReceipt from "@/components/PrintReceipt";

export default function StoreConfirmationPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-lg mx-auto px-4 py-20 text-center text-gray-400">Loading...</div>
      }
    >
      <ConfirmationContent />
    </Suspense>
  );
}

function ConfirmationContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session");

  const [order, setOrder] = useState<ProductOrder | null>(null);
  const [loading, setLoading] = useState(Boolean(sessionId));

  useEffect(() => {
    if (!sessionId) return;
    // The order is created by the Stripe webhook moments after redirect, so
    // poll a few times until it appears (looked up by checkout session id).
    let attempts = 0;
    let timer: ReturnType<typeof setTimeout>;

    async function fetchOrder() {
      try {
        const snap = await getDocs(
          query(collection(getDb(), "orders"), where("stripeSessionId", "==", sessionId))
        );
        if (!snap.empty) {
          const d = snap.docs[0];
          setOrder({ id: d.id, ...d.data() } as ProductOrder);
          setLoading(false);
          return;
        }
        if (attempts < 6) {
          attempts += 1;
          timer = setTimeout(fetchOrder, 2000);
        } else {
          setLoading(false);
        }
      } catch (err) {
        console.error("Error:", err);
        setLoading(false);
      }
    }
    fetchOrder();
    return () => clearTimeout(timer);
  }, [sessionId]);

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

  const isPaid = order?.paymentStatus === "paid";

  return (
    <div className="max-w-lg mx-auto px-4 py-20 text-center">
      <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6">
        <CheckCircle size={32} className="text-green-600" />
      </div>

      <h1 className="text-3xl font-extrabold text-gray-900 mb-2">Order Received!</h1>
      <p className="text-gray-500 mb-8">
        Thank you for your order{order?.productTitle ? ` — ${order.productTitle}` : ""}.
      </p>

      {order && (
        <div className="bg-gray-50 border border-gray-200 rounded-2xl p-6 text-left mb-8">
          <h3 className="font-bold text-gray-900 mb-4">Order Details</h3>

          <div className="space-y-2 mb-4">
            {order.items.map((item, i) => (
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
              <span>${order.total.toFixed(2)}</span>
            </div>
          </div>

          {order.address && (
            <div className="border-t border-gray-200 pt-4 mb-4 text-sm">
              <p className="text-gray-500 mb-1">Mailing Address</p>
              <p className="text-gray-900">
                {order.address.line1}
                <br />
                {order.address.city}, {order.address.state} {order.address.zip}
              </p>
            </div>
          )}

          {order.fields && order.fields.length > 0 && (
            <div className="border-t border-gray-200 pt-4 mb-4 space-y-1">
              {order.fields.map((f, i) => (
                <div key={i} className="flex justify-between gap-4 text-sm">
                  <span className="text-gray-500 shrink-0">{f.label}</span>
                  <span className="text-gray-900 text-right">{f.value}</span>
                </div>
              ))}
            </div>
          )}

          <div className="border-t border-gray-200 pt-4 space-y-2 text-sm">
            <div className="flex items-center gap-2 text-gray-500">
              <Mail size={14} />
              <span>{order.email}</span>
            </div>
            <div className="flex items-center gap-2 text-gray-500">
              <CreditCard size={14} />
              <span>Payment: Online (Card)</span>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`text-xs font-medium px-2 py-0.5 rounded-full inline-flex items-center gap-1 ${
                  isPaid ? "bg-green-50 text-green-700" : "bg-yellow-50 text-yellow-700"
                }`}
              >
                {isPaid ? "Paid" : <><Clock size={11} /> Processing</>}
              </span>
            </div>
          </div>
        </div>
      )}

      {order && (
        <div className="bg-green-50 border border-green-200 rounded-2xl p-5 mb-4 text-left flex items-start gap-3">
          <Mail size={18} className="text-green-600 mt-0.5 shrink-0" />
          <p className="text-green-800 text-sm">
            A confirmation email has been sent to <span className="font-medium">{order.email}</span>. Please check your inbox for your receipt.
          </p>
        </div>
      )}

      {order && (
        <div className="bg-gray-50 border border-gray-200 rounded-2xl p-5 mb-8 text-left">
          <p className="text-gray-600 text-sm mb-4">
            You can also save or screenshot this page for your records.
          </p>
          <PrintReceipt
            type="registration"
            receiptId={order.id}
            date={order.createdAt}
            name={order.name}
            email={order.email}
            eventTitle={order.productTitle}
            items={order.items}
            total={order.total}
            paymentMethod={order.paymentMethod}
            paymentStatus={order.paymentStatus}
          />
        </div>
      )}

      <Link
        href="/store"
        className="inline-flex items-center gap-2 text-red-600 hover:text-red-700 font-medium transition-colors"
      >
        &larr; Back to Store
      </Link>
    </div>
  );
}
