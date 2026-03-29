"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { Menu, X, Phone } from "lucide-react";
import WeatherWidget from "@/components/WeatherWidget";

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About" },
  { href: "/apparatus", label: "Apparatus" },
  { href: "/calls", label: "Calls" },
  { href: "/news", label: "News" },
  { href: "/events", label: "Events" },
  { href: "/volunteer", label: "Volunteer" },
  { href: "/gallery", label: "Gallery" },
  { href: "/donate", label: "Donate" },
  { href: "/contact", label: "Contact" },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <nav
      className={`sticky top-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-white/95 backdrop-blur-xl shadow-sm border-b border-gray-200"
          : "bg-white border-b border-gray-100"
      }`}
    >
      {/* Top utility bar */}
      <div className="border-b border-gray-100 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-1.5 flex items-center justify-between">
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-gray-500">
            <Phone size={10} className="text-red-600" />
            <span>
              Emergency: <strong className="text-gray-900">911</strong>
            </span>
            <span className="mx-2 text-gray-300">|</span>
            <span>Non-Emergency: (518) 736-2100</span>
            <span className="mx-2 text-gray-300">|</span>
            <span>Station: (518) 883-3611</span>
          </div>
          <WeatherWidget />
        </div>
      </div>

      {/* Main nav */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <img
              src="/bkfc-patch.png"
              alt="BKFC"
              className="w-10 h-10 object-contain"
            />
            <div className="hidden sm:block">
              <p className="font-bold text-gray-900 text-sm leading-tight">
                Broadalbin-Kennyetto
              </p>
              <p className="text-[11px] text-gray-500 leading-tight">
                Fire Company
              </p>
            </div>
          </Link>

          {/* Desktop links */}
          <div className="hidden md:flex items-center gap-1">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-gray-600 hover:text-red-700 px-3 py-2 rounded-lg hover:bg-red-50 transition-all"
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Mobile toggle */}
          <button
            className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-600"
            onClick={() => setOpen(!open)}
            aria-label="Toggle menu"
          >
            {open ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden bg-white border-t border-gray-100">
          <div className="px-4 py-4 space-y-1">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="block py-2.5 px-3 text-gray-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-all"
                onClick={() => setOpen(false)}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </nav>
  );
}
