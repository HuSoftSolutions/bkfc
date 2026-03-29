"use client";

import { MapPin, Phone, Mail, Navigation } from "lucide-react";
import { useContactEmail } from "@/lib/useContactEmail";

const MAPS_QUERY = "14+Pine+Street,+Broadalbin,+NY+12025";
const STATION_LAT = 43.0594;
const STATION_LNG = -74.1935;

export default function MapSection() {
  const contactEmail = useContactEmail();
  return (
    <section className="relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="flex items-center gap-3 mb-10">
          <div className="w-10 h-10 rounded-xl bg-red-50 border border-red-200 flex items-center justify-center text-red-600">
            <MapPin size={20} />
          </div>
          <h2 className="text-3xl font-bold text-gray-900">Find Us</h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 rounded-2xl overflow-hidden border border-gray-200 h-[400px] shadow-sm">
            <iframe
              src={`https://www.google.com/maps/embed/v1/place?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY || ""}&q=${MAPS_QUERY}&center=${STATION_LAT},${STATION_LNG}&zoom=15&maptype=roadmap`}
              width="100%"
              height="100%"
              style={{ border: 0 }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title="Broadalbin-Kennyetto Fire Company Location"
            />
          </div>

          <div className="bg-white border border-gray-200 rounded-2xl p-6 flex flex-col justify-between shadow-sm">
            <div>
              <h3 className="text-gray-900 font-bold text-xl mb-1">Station Location</h3>
              <p className="text-gray-400 text-sm mb-6">Broadalbin-Kennyetto Fire Company</p>

              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-red-50 border border-red-200 flex items-center justify-center shrink-0">
                    <MapPin size={16} className="text-red-600" />
                  </div>
                  <div>
                    <p className="text-gray-400 text-xs font-medium uppercase tracking-wider mb-0.5">Address</p>
                    <p className="text-gray-900 text-sm">14 Pine Street</p>
                    <p className="text-gray-900 text-sm">Broadalbin, NY 12025</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center shrink-0">
                    <Phone size={16} className="text-blue-600" />
                  </div>
                  <div>
                    <p className="text-gray-400 text-xs font-medium uppercase tracking-wider mb-0.5">Station Phone</p>
                    <a href="tel:5188833611" className="text-gray-900 text-sm hover:text-red-600 transition-colors">
                      (518) 883-3611
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center shrink-0">
                    <Phone size={16} className="text-amber-600" />
                  </div>
                  <div>
                    <p className="text-gray-400 text-xs font-medium uppercase tracking-wider mb-0.5">Non-Emergency</p>
                    <a href="tel:5187362100" className="text-gray-900 text-sm hover:text-red-600 transition-colors">
                      (518) 736-2100
                    </a>
                  </div>
                </div>

                {contactEmail && (
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-green-50 border border-green-200 flex items-center justify-center shrink-0">
                      <Mail size={16} className="text-green-600" />
                    </div>
                    <div>
                      <p className="text-gray-400 text-xs font-medium uppercase tracking-wider mb-0.5">Email</p>
                      <a href={`mailto:${contactEmail}`} className="text-gray-900 text-sm hover:text-red-600 transition-colors">
                        {contactEmail}
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <a
              href={`https://www.google.com/maps/dir/?api=1&destination=${MAPS_QUERY}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white font-medium px-6 py-3 rounded-xl transition-colors w-full"
            >
              <Navigation size={16} />
              Get Directions
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
