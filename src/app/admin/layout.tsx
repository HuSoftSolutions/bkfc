"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "firebase/auth";
import { getAppAuth } from "@/lib/firebase";
import AdminGuard from "@/components/AdminGuard";
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
} from "lucide-react";

const ADMIN_NAV = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/active-call", label: "Live Status", icon: Radio },
  { href: "/admin/call-config", label: "Dispatch Config", icon: Settings },
  { href: "/admin/calls", label: "Calls", icon: Siren },
  { href: "/admin/news", label: "News", icon: Newspaper },
  { href: "/admin/apparatus", label: "Apparatus", icon: Truck },
  { href: "/admin/officers", label: "Officers", icon: Users },
  { href: "/admin/messages", label: "Messages", icon: Mail },
  { href: "/admin/events", label: "Events", icon: CalendarDays },
  { href: "/admin/registrations", label: "Registrations", icon: Ticket },
  { href: "/admin/donations", label: "Donations", icon: Heart },
  { href: "/admin/volunteers", label: "Volunteers", icon: UserPlus },
  { href: "/admin/gallery", label: "Gallery", icon: ImageIcon },
  { href: "/admin/media", label: "Media", icon: ImageIcon },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

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
      <div className="flex min-h-screen bg-gray-950">
        {/* Sidebar */}
        <aside className="w-64 bg-gray-900 border-r border-gray-800 p-4 hidden md:block">
          <div className="mb-8">
            <h2 className="text-red-500 font-bold text-lg">BKFC Admin</h2>
          </div>
          <nav className="space-y-1">
            {ADMIN_NAV.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href;
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
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <button
            onClick={() => signOut(getAppAuth())}
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-gray-800 transition-colors mt-8 w-full"
          >
            <LogOut size={18} />
            Sign Out
          </button>
        </aside>

        {/* Main content */}
        <div className="flex-1 p-6 md:p-8 overflow-auto">{children}</div>
      </div>
    </AdminGuard>
  );
}
