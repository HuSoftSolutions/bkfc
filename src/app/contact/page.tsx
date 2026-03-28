"use client";

import { useState, useCallback } from "react";
import { useGoogleReCaptcha } from "react-google-recaptcha-v3";
import Hero from "@/components/Hero";
import { Phone, Mail, MapPin } from "lucide-react";

export default function ContactPage() {
  const { executeRecaptcha } = useGoogleReCaptcha();
  const [form, setForm] = useState({ name: "", email: "", phone: "", message: "" });
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setStatus("sending");

      try {
        let recaptchaToken = "";
        if (executeRecaptcha) {
          recaptchaToken = await executeRecaptcha("contact");
        }

        const res = await fetch("/api/contact", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...form, recaptchaToken }),
        });

        if (!res.ok) throw new Error("Failed to send");
        setStatus("sent");
        setForm({ name: "", email: "", phone: "", message: "" });
      } catch {
        setStatus("error");
      }
    },
    [form, executeRecaptcha]
  );

  return (
    <>
      <Hero title="Contact Us" subtitle="Get in touch with the department" />

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          {/* Contact Info */}
          <div>
            <div className="bg-red-700/20 border border-red-700/40 rounded-lg p-4 mb-8">
              <p className="text-red-400 font-bold text-lg">
                IN CASE OF EMERGENCY DIAL 9-1-1
              </p>
            </div>

            <h2 className="text-2xl font-bold text-white mb-6">
              Department Information
            </h2>
            <div className="space-y-4 text-gray-300">
              <div className="flex items-center gap-3">
                <Phone size={20} className="text-red-500 shrink-0" />
                <div>
                  <p className="font-medium text-white">Station Phone</p>
                  <p>(518) 883-3611</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Mail size={20} className="text-red-500 shrink-0" />
                <div>
                  <p className="font-medium text-white">Email</p>
                  <a
                    href="mailto:Contact@BroadalbinFire.com"
                    className="hover:text-red-400 transition-colors"
                  >
                    Contact@BroadalbinFire.com
                  </a>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <MapPin size={20} className="text-red-500 shrink-0" />
                <div>
                  <p className="font-medium text-white">Address</p>
                  <p>14 Pine Street</p>
                  <p>Broadalbin, NY 12025</p>
                  <p className="text-sm text-gray-500">
                    Mailing: PO Box 295, Broadalbin, NY 12025
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Contact Form */}
          <div>
            <h2 className="text-2xl font-bold text-white mb-6">
              Send a Message
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Name *</label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:border-red-500 focus:outline-none transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Email *</label>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:border-red-500 focus:outline-none transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Phone</label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:border-red-500 focus:outline-none transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Message *</label>
                <textarea
                  required
                  rows={5}
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:border-red-500 focus:outline-none transition-colors resize-none"
                />
              </div>
              <button
                type="submit"
                disabled={status === "sending"}
                className="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-semibold px-8 py-3 rounded-lg transition-colors w-full"
              >
                {status === "sending" ? "Sending..." : "Send Message"}
              </button>
              {status === "sent" && (
                <p className="text-green-400 text-sm">
                  Message sent successfully! We&apos;ll get back to you soon.
                </p>
              )}
              {status === "error" && (
                <p className="text-red-400 text-sm">
                  Something went wrong. Please try again or email us directly.
                </p>
              )}
            </form>
          </div>
        </div>
      </section>
    </>
  );
}
