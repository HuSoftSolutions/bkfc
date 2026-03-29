"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import Link from "next/link";
import { Heart, CheckCircle } from "lucide-react";

export default function ThankYouPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-lg mx-auto px-4 py-20 text-center text-gray-400">
          Loading...
        </div>
      }
    >
      <ThankYouContent />
    </Suspense>
  );
}

function ThankYouContent() {
  const searchParams = useSearchParams();
  const donationId = searchParams.get("donation");
  const [amount, setAmount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDonation() {
      if (!donationId) {
        setLoading(false);
        return;
      }
      try {
        const snap = await getDoc(doc(getDb(), "donations", donationId));
        if (snap.exists()) {
          setAmount(snap.data().amount);
        }
      } catch {
        // ok
      } finally {
        setLoading(false);
      }
    }
    fetchDonation();
  }, [donationId]);

  if (loading) {
    return (
      <div className="max-w-lg mx-auto px-4 py-20">
        <div className="animate-pulse space-y-4">
          <div className="h-16 bg-gray-200 rounded-full w-16 mx-auto" />
          <div className="h-8 bg-gray-200 rounded w-3/4 mx-auto" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-20 text-center">
      <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6">
        <CheckCircle size={32} className="text-green-600" />
      </div>

      <h1 className="text-3xl font-extrabold text-gray-900 mb-3">
        Thank You!
      </h1>
      <p className="text-gray-500 mb-2">
        Your generous donation
        {amount ? ` of $${amount.toFixed(2)}` : ""} to the
        Broadalbin-Kennyetto Fire Company has been received.
      </p>
      <p className="text-gray-400 text-sm mb-8">
        A receipt has been sent to your email address.
      </p>

      <div className="bg-red-50 border border-red-200 rounded-2xl p-6 mb-8">
        <Heart size={24} className="text-red-600 mx-auto mb-2" />
        <p className="text-gray-700 text-sm leading-relaxed">
          Your support helps us maintain equipment, fund training, and continue
          protecting the communities of Broadalbin and Mayfield. We are deeply
          grateful for your generosity.
        </p>
      </div>

      <Link
        href="/"
        className="inline-flex items-center gap-2 text-red-600 hover:text-red-700 font-medium transition-colors"
      >
        &larr; Return to Home
      </Link>
    </div>
  );
}
