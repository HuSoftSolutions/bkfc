"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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
  const pathname = usePathname();

  // Close mobile menu when route changes
  useEffect(() => {
    setOpen(false); // eslint-disable-line react-hooks/set-state-in-effect
  }, [pathname]); // eslint-disable-line react-hooks/exhaustive-deps

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

      {/* Mobile full-screen menu */}
      {open && (
        <div className="md:hidden fixed inset-0 top-0 z-50 bg-white flex flex-col">
          {/* Header mirroring navbar */}
          <div className="flex items-center justify-between px-4 h-16 border-b border-gray-100 shrink-0">
            <Link href="/" className="flex items-center gap-3" onClick={() => setOpen(false)}>
              <img src="/bkfc-patch.png" alt="BKFC" className="w-10 h-10 object-contain" />
            </Link>
            <button
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-600"
              onClick={() => setOpen(false)}
              aria-label="Close menu"
            >
              <X size={24} />
            </button>
          </div>

          {/* Nav links */}
          <div className="flex-1 overflow-y-auto px-4 py-6 space-y-1">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="block py-3 px-4 text-lg font-medium text-gray-700 hover:text-red-700 hover:bg-red-50 rounded-xl transition-all"

              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Footer info */}
          <div className="shrink-0 px-6 py-4 border-t border-gray-100 text-xs text-gray-400 space-y-1">
            <p>Non-Emergency: (518) 736-2100</p>
            <p>Station: (518) 883-3611</p>
          </div>
        </div>
      )}
    </nav>
  );
}
