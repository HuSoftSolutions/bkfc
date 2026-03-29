"use client";

import { useEffect, useState } from "react";
import { collection, query, orderBy, limit, getDocs } from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import Link from "next/link";
import { Siren, Newspaper, Mail, UserPlus } from "lucide-react";

interface DashboardStats {
  calls: number;
  news: number;
  messages: number;
  volunteers: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    calls: 0,
    news: 0,
    messages: 0,
    volunteers: 0,
  });

  useEffect(() => {
    async function fetchStats() {
      try {
        const [callsSnap, newsSnap, messagesSnap, volunteersSnap] =
          await Promise.all([
            getDocs(query(collection(getDb(), "calls"), limit(1000))),
            getDocs(query(collection(getDb(), "news"), limit(1000))),
            getDocs(query(collection(getDb(), "contactSubmissions"), limit(1000))),
            getDocs(query(collection(getDb(), "volunteerApplications"), limit(1000))),
          ]);
        setStats({
          calls: callsSnap.size,
          news: newsSnap.size,
          messages: messagesSnap.size,
          volunteers: volunteersSnap.size,
        });
      } catch (err) {
        console.error("Error fetching stats:", err);
      }
    }
    fetchStats();
  }, []);

  const cards = [
    { label: "Total Calls", value: stats.calls, icon: Siren, href: "/admin/calls", color: "text-red-400" },
    { label: "News Articles", value: stats.news, icon: Newspaper, href: "/admin/news", color: "text-blue-400" },
    { label: "Messages", value: stats.messages, icon: Mail, href: "/admin/messages", color: "text-green-400" },
    { label: "Volunteer Apps", value: stats.volunteers, icon: UserPlus, href: "/admin/volunteers", color: "text-yellow-400" },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-8">Dashboard</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Link
              key={card.href}
              href={card.href}
              className="bg-gray-900 border border-gray-800 rounded-lg p-5 hover:border-gray-600 transition-colors"
            >
              <div className="flex items-center justify-between mb-3">
                <Icon size={24} className={card.color} />
                <span className="text-3xl font-bold text-white">
                  {card.value}
                </span>
              </div>
              <p className="text-gray-400 text-sm">{card.label}</p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
