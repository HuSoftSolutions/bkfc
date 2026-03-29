"use client";

import { useState, useCallback } from "react";
import { useGoogleReCaptcha } from "react-google-recaptcha-v3";
import Hero from "@/components/Hero";
import { formatPhoneNumber } from "@/lib/formatPhone";

export default function VolunteerPage() {
  const { executeRecaptcha } = useGoogleReCaptcha();
  const [errorMsg, setErrorMsg] = useState("");
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    state: "NY",
    zip: "",
    position: "",
    message: "",
  });
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  const update = (field: string, value: string) => {
    if (field === "phone") value = formatPhoneNumber(value);
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setStatus("sending");

      try {
        let recaptchaToken = "";
        try {
          if (executeRecaptcha) {
            recaptchaToken = await executeRecaptcha("volunteer");
          }
        } catch {
          // reCAPTCHA not configured — continue without it
        }

        const res = await fetch("/api/volunteer", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...form, recaptchaToken }),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.details || data.error || "Failed to send");
        }
        setStatus("sent");
        setForm({
          firstName: "",
          lastName: "",
          email: "",
          phone: "",
          address: "",
          city: "",
          state: "NY",
          zip: "",
          position: "",
          message: "",
        });
      } catch (err) {
        setErrorMsg(err instanceof Error ? err.message : "Unknown error");
        setStatus("error");
      }
    },
    [form, executeRecaptcha]
  );

  const inputClass =
    "w-full bg-white border border-gray-300 rounded-lg px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:border-red-500 focus:outline-none transition-colors";

  return (
    <>
      <Hero
        title="Become a Volunteer"
        subtitle="Join the Broadalbin-Kennyetto Fire Company and make a difference in your community"
      />

      <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-8 text-center">
          <p className="text-red-700 font-bold text-lg">
            IN CASE OF EMERGENCY DIAL 9-1-1
          </p>
          <p className="text-gray-500 text-sm mt-1">
            Station: (518) 883-3611
          </p>
        </div>

        <div className="mb-10 text-gray-600 leading-relaxed space-y-4">
          <p>
            The Broadalbin-Kennyetto Fire Company is always looking for dedicated
            individuals to join our team of volunteers. Whether you&apos;re
            interested in firefighting, emergency medical services, fire police,
            or support roles, there&apos;s a place for you.
          </p>
          <p>
            No experience is necessary — we provide all the training you need.
            Fill out the form below and a member of our department will be in
            touch.
          </p>
        </div>

        <h2 className="text-2xl font-bold text-gray-900 mb-6">
          Volunteer Interest Form
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-500 mb-1">First Name *</label>
              <input
                type="text"
                required
                value={form.firstName}
                onChange={(e) => update("firstName", e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-sm text-gray-500 mb-1">Last Name *</label>
              <input
                type="text"
                required
                value={form.lastName}
                onChange={(e) => update("lastName", e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-500 mb-1">Email *</label>
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => update("email", e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-sm text-gray-500 mb-1">Phone *</label>
              <input
                type="tel"
                required
                value={form.phone}
                onChange={(e) => update("phone", e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-500 mb-1">Address *</label>
            <input
              type="text"
              required
              value={form.address}
              onChange={(e) => update("address", e.target.value)}
              className={inputClass}
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm text-gray-500 mb-1">City *</label>
              <input
                type="text"
                required
                value={form.city}
                onChange={(e) => update("city", e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-sm text-gray-500 mb-1">State</label>
              <input
                type="text"
                value={form.state}
                onChange={(e) => update("state", e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-sm text-gray-500 mb-1">ZIP *</label>
              <input
                type="text"
                required
                value={form.zip}
                onChange={(e) => update("zip", e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-500 mb-1">Position *</label>
            <select
              required
              value={form.position}
              onChange={(e) => update("position", e.target.value)}
              className={inputClass}
            >
              <option value="">Select a position...</option>
              <option value="Active Firefighter">Active Firefighter</option>
              <option value="Administrative">Administrative</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-sm text-gray-500 mb-1">
              Why are you interested in volunteering?
            </label>
            <textarea
              rows={4}
              value={form.message}
              onChange={(e) => update("message", e.target.value)}
              className={`${inputClass} resize-none`}
            />
          </div>

          <button
            type="submit"
            disabled={status === "sending"}
            className="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-semibold px-8 py-3 rounded-lg transition-colors w-full"
          >
            {status === "sending" ? "Submitting..." : "Submit Application"}
          </button>

          {status === "sent" && (
            <p className="text-green-600 text-sm text-center">
              Application submitted! A member of our department will contact you soon.
            </p>
          )}
          {status === "error" && (
            <p className="text-red-600 text-sm text-center">
              {errorMsg || "Something went wrong."} Please try again or call us at (518) 883-3611.
            </p>
          )}
        </form>
      </section>
    </>
  );
}
