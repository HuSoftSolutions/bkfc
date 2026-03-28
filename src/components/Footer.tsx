import Link from "next/link";
import { Phone, Mail, MapPin } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-gray-950 text-gray-400 border-t border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Info */}
          <div>
            <h3 className="text-white font-bold text-lg mb-3">
              Broadalbin-Kennyetto Fire Company
            </h3>
            <p className="text-sm leading-relaxed">
              Proudly serving the communities of Broadalbin and Mayfield in
              Fulton County, New York. 54 volunteer members strong.
            </p>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-white font-semibold mb-3">Contact</h4>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <Phone size={14} className="text-red-500" />
                <span>Emergency: 911</span>
              </li>
              <li className="flex items-center gap-2">
                <Phone size={14} className="text-red-500" />
                <span>Station: (518) 883-3611</span>
              </li>
              <li className="flex items-center gap-2">
                <Mail size={14} className="text-red-500" />
                <a
                  href="mailto:Contact@BroadalbinFire.com"
                  className="hover:text-white transition-colors"
                >
                  Contact@BroadalbinFire.com
                </a>
              </li>
              <li className="flex items-center gap-2">
                <MapPin size={14} className="text-red-500" />
                <span>14 Pine Street, Broadalbin, NY 12025</span>
              </li>
            </ul>
          </div>

          {/* Links */}
          <div>
            <h4 className="text-white font-semibold mb-3">Quick Links</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/about" className="hover:text-white transition-colors">
                  About Us
                </Link>
              </li>
              <li>
                <Link href="/apparatus" className="hover:text-white transition-colors">
                  Apparatus
                </Link>
              </li>
              <li>
                <Link href="/volunteer" className="hover:text-white transition-colors">
                  Volunteer
                </Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-white transition-colors">
                  Contact Us
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-gray-800 text-center text-xs text-gray-500">
          &copy; {new Date().getFullYear()} Broadalbin-Kennyetto Fire Company.
          All rights reserved.
        </div>
      </div>
    </footer>
  );
}
