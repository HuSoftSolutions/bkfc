"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, sendPasswordResetEmail } from "firebase/auth";
import { getAppAuth } from "@/lib/firebase";
import AdminGuard from "@/components/AdminGuard";
import { useState, useEffect } from "react";
import { AdminBadgeProvider, useAdminBadgeContext } from "@/lib/AdminBadgeContext";
import type { AdminBadges } from "@/lib/useAdminBadges";
import {
  LayoutDashboard,
  Siren,
  Newspaper,
  Truck,
  Users,
  Mail,
  UserPlus,
  LogOut,
  Settings,
  ImageIcon,
  CalendarDays,
  Ticket,
  Heart,
  Radio,
  Menu,
  X,
  Shield,
  KeyRound,
  DollarSign,
} from "lucide-react";

type BadgeKey = keyof AdminBadges;
type BadgeStyle = "alert" | "count";

interface NavItem {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  badgeKey?: BadgeKey;
  badgeStyle?: BadgeStyle;
}

const ADMIN_NAV: NavItem[] = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/active-call", label: "Live Status", icon: Radio },
  { href: "/admin/call-config", label: "Dispatch Config", icon: Settings },
  { href: "/admin/calls", label: "Calls", icon: Siren, badgeKey: "calls", badgeStyle: "count" },
  { href: "/admin/news", label: "News", icon: Newspaper, badgeKey: "news", badgeStyle: "count" },
  { href: "/admin/apparatus", label: "Apparatus", icon: Truck },
  { href: "/admin/officers", label: "Officers", icon: Users },
  { href: "/admin/messages", label: "Messages", icon: Mail, badgeKey: "messages", badgeStyle: "alert" },
  { href: "/admin/events", label: "Events", icon: CalendarDays, badgeKey: "events", badgeStyle: "count" },
  { href: "/admin/registrations", label: "Registrations", icon: Ticket, badgeKey: "registrations", badgeStyle: "count" },
  { href: "/admin/donations", label: "Donations", icon: Heart, badgeKey: "donations", badgeStyle: "count" },
  { href: "/admin/finances", label: "Finances", icon: DollarSign },
  { href: "/admin/volunteers", label: "Volunteers", icon: UserPlus, badgeKey: "volunteers", badgeStyle: "alert" },
  { href: "/admin/gallery", label: "Gallery", icon: ImageIcon },
  { href: "/admin/media", label: "Media", icon: ImageIcon },
  { href: "/admin/users", label: "Site Admins", icon: Shield },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

function Badge({ count, style }: { count: number; style: BadgeStyle }) {
  if (count === 0) return null;

  if (style === "alert") {
    return (
      <span className="bg-red-600 text-white text-[10px] font-bold min-w-[18px] h-[18px] rounded-full flex items-center justify-center px-1">
        {count}
      </span>
    );
  }

  return (
    <span className="bg-gray-700 text-gray-300 text-[10px] font-medium min-w-[18px] h-[18px] rounded-full flex items-center justify-center px-1">
      {count}
    </span>
  );
}

function NavLinks({ pathname, badges }: { pathname: string; badges: AdminBadges }) {
  return (
    <>
      <nav className="space-y-1">
        {ADMIN_NAV.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;
          const badgeCount = item.badgeKey ? badges[item.badgeKey] : 0;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                active
                  ? "bg-red-600/20 text-red-400"
                  : "text-gray-400 hover:text-white hover:bg-gray-800"
              }`}
            >
              <Icon size={18} />
              <span className="flex-1">{item.label}</span>
              {item.badgeKey && item.badgeStyle && badgeCount > 0 && (
                <Badge count={badgeCount} style={item.badgeStyle} />
              )}
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto pt-4 border-t border-gray-800 space-y-1">
        <button
          onClick={async () => {
            const auth = getAppAuth();
            const email = auth.currentUser?.email;
            if (!email) return;
            try {
              await sendPasswordResetEmail(auth, email);
              alert("Password reset email sent. Check your inbox.");
            } catch {
              alert("Failed to send reset email. Please try again.");
            }
          }}
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-gray-800 transition-colors w-full"
        >
          <KeyRound size={18} />
          Reset Password
        </button>
        <button
          onClick={() => signOut(getAppAuth())}
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-gray-800 transition-colors w-full"
        >
          <LogOut size={18} />
          Sign Out
        </button>
      </div>
    </>
  );
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  if (pathname === "/admin/login") {
    return <>{children}</>;
  }

  return (
    <AdminGuard>
      <AdminBadgeProvider>
        <AdminLayoutInner>{children}</AdminLayoutInner>
      </AdminBadgeProvider>
    </AdminGuard>
  );
}

function AdminLayoutInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { badges, refresh } = useAdminBadgeContext();

  // Close mobile menu and refresh badges when route changes
  useEffect(() => {
    setMobileOpen(false); // eslint-disable-line react-hooks/set-state-in-effect
    refresh();
  }, [pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  // Total unread alerts for mobile header dot
  const totalAlerts = badges.messages + badges.volunteers;

  return (
    <>
      <div className="flex flex-1 min-h-screen bg-gray-950">
        {/* Desktop sidebar */}
        <aside className="w-64 bg-gray-900 border-r border-gray-800 p-4 hidden md:flex md:flex-col shrink-0 sticky top-0 h-screen overflow-y-auto">
          <div className="mb-8">
            <Link href="/admin" className="text-red-500 font-bold text-lg">BKFC Admin</Link>
          </div>
          <NavLinks pathname={pathname} badges={badges} />
        </aside>

        {/* Mobile header */}
        <div className="md:hidden fixed top-0 left-0 right-0 z-[60] bg-gray-900 border-b border-gray-800 px-4 py-3 flex items-center justify-between">
          <Link href="/admin" className="text-red-500 font-bold text-lg">BKFC Admin</Link>
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="relative text-gray-400 hover:text-white p-1"
            aria-label="Toggle admin menu"
          >
            {mobileOpen ? <X size={24} /> : <Menu size={24} />}
            {!mobileOpen && totalAlerts > 0 && (
              <span className="absolute -top-0.5 -right-0.5 bg-red-600 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                {totalAlerts}
              </span>
            )}
          </button>
        </div>

        {/* Mobile full-screen nav */}
        {mobileOpen && (
          <div className="md:hidden fixed inset-0 z-[60] bg-gray-950 flex flex-col overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800 shrink-0">
              <Link href="/admin" className="text-red-500 font-bold text-lg">BKFC Admin</Link>
              <button
                onClick={() => setMobileOpen(false)}
                className="text-gray-400 hover:text-white p-1"
                aria-label="Close menu"
              >
                <X size={24} />
              </button>
            </div>

            {/* Nav grid */}
            <div className="flex-1 px-3 py-4">
              <div className="grid grid-cols-3 gap-2">
                {ADMIN_NAV.map((item) => {
                  const Icon = item.icon;
                  const active = pathname === item.href;
                  const badgeCount = item.badgeKey ? badges[item.badgeKey] : 0;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`relative flex flex-col items-center justify-center gap-1.5 rounded-xl p-3 text-center transition-colors ${
                        active
                          ? "bg-red-600/20 text-red-400"
                          : "bg-gray-900 text-gray-400 hover:text-white hover:bg-gray-800"
                      }`}
                    >
                      <div className="relative">
                        <Icon size={20} />
                        {item.badgeStyle === "alert" && badgeCount > 0 && (
                          <span className="absolute -top-1.5 -right-2.5 bg-red-600 text-white text-[8px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                            {badgeCount}
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] font-medium leading-tight">{item.label}</span>
                      {item.badgeStyle === "count" && badgeCount > 0 && (
                        <span className="text-[9px] text-gray-500">{badgeCount}</span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* Account actions */}
            <div className="px-4 py-4 border-t border-gray-800 shrink-0 space-y-2">
              <button
                onClick={async () => {
                  const auth = getAppAuth();
                  const email = auth.currentUser?.email;
                  if (!email) return;
                  try {
                    await sendPasswordResetEmail(auth, email);
                    alert("Password reset email sent. Check your inbox.");
                  } catch {
                    alert("Failed to send reset email. Please try again.");
                  }
                }}
                className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-xl text-sm text-gray-400 hover:text-white bg-gray-900 hover:bg-gray-800 transition-colors"
              >
                <KeyRound size={16} />
                Reset Password
              </button>
              <button
                onClick={() => signOut(getAppAuth())}
                className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-xl text-sm text-gray-400 hover:text-white bg-gray-900 hover:bg-gray-800 transition-colors"
              >
                <LogOut size={16} />
                Sign Out
              </button>
            </div>
          </div>
        )}

        {/* Main content */}
        <div className="flex-1 p-4 pt-16 md:p-8 md:pt-8 overflow-auto min-w-0">{children}</div>
      </div>
    </>
  );
}
