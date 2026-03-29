import Link from "next/link";
import { Phone, Mail, MapPin, ExternalLink } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-400">
      {/* Emergency banner */}
      <div className="bg-red-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-6 text-sm">
          <span className="text-red-200 font-bold uppercase tracking-wider text-xs">
            In case of emergency
          </span>
          <a
            href="tel:911"
            className="text-white font-bold text-lg hover:text-red-200 transition-colors"
          >
            Dial 9-1-1
          </a>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
          {/* Brand */}
          <div className="md:col-span-1">
            <div className="flex items-center gap-3 mb-4">
              <img
                src="/bkfc-patch.png"
                alt="BKFC"
                className="w-10 h-10 object-contain"
              />
              <div>
                <p className="font-bold text-white text-sm leading-tight">
                  Broadalbin-Kennyetto
                </p>
                <p className="text-[11px] text-gray-500 leading-tight">
                  Fire Company
                </p>
              </div>
            </div>
            <p className="text-sm leading-relaxed text-gray-500">
              Proudly serving the communities of Broadalbin and Mayfield in
              Fulton County, New York. 54 volunteer members strong.
            </p>
          </div>

          {/* Navigation */}
          <div>
            <h4 className="text-white font-semibold text-sm uppercase tracking-wider mb-4">
              Navigation
            </h4>
            <ul className="space-y-2.5 text-sm">
              {[
                { href: "/about", label: "About Us" },
                { href: "/apparatus", label: "Apparatus" },
                { href: "/news", label: "News" },
                { href: "/events", label: "Events" },
                { href: "/volunteer", label: "Volunteer" },
              ].map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="hover:text-white transition-colors inline-flex items-center gap-1 group"
                  >
                    {link.label}
                    <ExternalLink
                      size={10}
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                    />
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-white font-semibold text-sm uppercase tracking-wider mb-4">
              Contact
            </h4>
            <ul className="space-y-3 text-sm">
              <li className="flex items-start gap-2.5">
                <Phone size={14} className="text-red-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-gray-500 text-xs">Station</p>
                  <a
                    href="tel:5188833611"
                    className="text-gray-300 hover:text-white transition-colors"
                  >
                    (518) 883-3611
                  </a>
                </div>
              </li>
              <li className="flex items-start gap-2.5">
                <Phone size={14} className="text-red-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-gray-500 text-xs">Non-Emergency</p>
                  <a
                    href="tel:5187362100"
                    className="text-gray-300 hover:text-white transition-colors"
                  >
                    (518) 736-2100
                  </a>
                </div>
              </li>
              <li className="flex items-start gap-2.5">
                <Mail size={14} className="text-red-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-gray-500 text-xs">Email</p>
                  <a
                    href="mailto:Contact@BroadalbinFire.com"
                    className="text-gray-300 hover:text-white transition-colors"
                  >
                    Contact@BroadalbinFire.com
                  </a>
                </div>
              </li>
              <li className="flex items-start gap-2.5">
                <MapPin size={14} className="text-red-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-gray-500 text-xs">Address</p>
                  <p className="text-gray-300">14 Pine Street</p>
                  <p className="text-gray-300">Broadalbin, NY 12025</p>
                </div>
              </li>
            </ul>
          </div>

          {/* CTA */}
          <div>
            <h4 className="text-white font-semibold text-sm uppercase tracking-wider mb-4">
              Get Involved
            </h4>
            <p className="text-sm text-gray-500 mb-4 leading-relaxed">
              We&apos;re always looking for dedicated volunteers to serve our
              community. No experience necessary.
            </p>
            <Link
              href="/volunteer"
              className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium px-5 py-2.5 rounded-xl transition-colors"
            >
              Join Our Team
            </Link>
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-gray-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-gray-600">
          <p>
            &copy; {new Date().getFullYear()} Broadalbin-Kennyetto Fire
            Company. All rights reserved.
          </p>
          <Link
            href="/admin/login"
            className="hover:text-gray-400 transition-colors"
          >
            Admin
          </Link>
        </div>
      </div>
    </footer>
  );
}
