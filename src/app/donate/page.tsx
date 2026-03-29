"use client";

import { useState } from "react";
import Hero from "@/components/Hero";
import { Heart, DollarSign, CheckCircle } from "lucide-react";

const PRESET_AMOUNTS = [25, 50, 100, 250, 500];

export default function DonatePage() {
  const [amount, setAmount] = useState<number | "">("");
  const [customAmount, setCustomAmount] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const selectedAmount =
    typeof amount === "number" ? amount : parseFloat(customAmount) || 0;

  const handlePreset = (val: number) => {
    setAmount(val);
    setCustomAmount("");
  };

  const handleCustom = (val: string) => {
    setCustomAmount(val);
    setAmount("");
  };

  const handleSubmit = async () => {
    if (selectedAmount < 1) {
      setError("Please enter a donation amount of at least $1.00.");
      return;
    }
    if (!email) {
      setError("Please enter your email address.");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/donate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: selectedAmount,
          name: name || "Anonymous",
          email,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong.");
        return;
      }

      if (data.url) {
        window.location.href = data.url;
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass =
    "w-full bg-white border border-gray-300 rounded-lg px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:border-red-500 focus:outline-none transition-colors";

  return (
    <>
      <Hero
        title="Support BKFC"
        subtitle="Help us protect our community"
      />

      <section className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <Heart size={28} className="text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">
            Make a Donation
          </h2>
          <p className="text-gray-500 leading-relaxed max-w-md mx-auto">
            Your generous contribution helps us maintain equipment, fund
            training, and continue serving the communities of Broadalbin and
            Mayfield. Every dollar makes a difference.
          </p>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-6 sm:p-8 shadow-sm">
          {/* Amount selection */}
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Select Amount
          </label>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 mb-4">
            {PRESET_AMOUNTS.map((val) => (
              <button
                key={val}
                onClick={() => handlePreset(val)}
                className={`py-3 rounded-xl text-sm font-semibold transition-colors ${
                  amount === val
                    ? "bg-red-600 text-white"
                    : "bg-gray-50 border border-gray-200 text-gray-700 hover:bg-gray-100"
                }`}
              >
                ${val}
              </button>
            ))}
          </div>

          <div className="relative mb-6">
            <DollarSign
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="number"
              min="1"
              step="0.01"
              placeholder="Custom amount"
              value={customAmount}
              onChange={(e) => handleCustom(e.target.value)}
              className={`${inputClass} pl-8`}
            />
          </div>

          {/* Contact info */}
          <div className="space-y-3 mb-6">
            <div>
              <label className="block text-sm text-gray-500 mb-1">
                Name (optional)
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-sm text-gray-500 mb-1">
                Email *
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className={inputClass}
              />
            </div>
          </div>

          {error && <p className="text-red-600 text-sm mb-4">{error}</p>}

          <button
            onClick={handleSubmit}
            disabled={submitting || selectedAmount < 1}
            className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-semibold py-3.5 rounded-xl transition-colors"
          >
            <Heart size={18} />
            {submitting
              ? "Processing..."
              : selectedAmount > 0
              ? `Donate $${selectedAmount.toFixed(2)}`
              : "Donate"}
          </button>

          <p className="text-gray-400 text-xs text-center mt-4">
            Payments processed securely by Stripe. Tax-deductible receipt
            provided via email.
          </p>
        </div>

        {/* Why donate */}
        <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            {
              title: "Equipment",
              desc: "Help us maintain and upgrade life-saving equipment.",
            },
            {
              title: "Training",
              desc: "Fund critical training programs for our volunteers.",
            },
            {
              title: "Community",
              desc: "Support community outreach and fire prevention programs.",
            },
          ].map((item) => (
            <div
              key={item.title}
              className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-center"
            >
              <CheckCircle size={20} className="text-red-600 mx-auto mb-2" />
              <h4 className="text-gray-900 font-semibold text-sm mb-1">
                {item.title}
              </h4>
              <p className="text-gray-500 text-xs">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
