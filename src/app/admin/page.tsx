"use client";

import { useEffect, useState } from "react";
import { collection, query, getDocs, where } from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import Link from "next/link";
import {
  Siren,
  Newspaper,
  Mail,
  UserPlus,
  Users,
  CalendarDays,
  Heart,
  TrendingUp,
  Clock,
} from "lucide-react";
import { Call } from "@/types";
import {
  WeatherData,
  DailyForecast,
  fetchWeather,
  fetchWeekForecast,
  getWeatherDescription,
  getWeatherIcon,
  celsiusToFahrenheit,
} from "@/lib/weather";
import { doc, getDoc } from "firebase/firestore";
import { Droplets } from "lucide-react";

interface DashboardStats {
  calls: number;
  news: number;
  messages: number;
  volunteers: number;
  officers: number;
  honorary: number;
  events: number;
  donations: number;
  donationTotal: number;
  galleryPhotos: number;
  callsByMonth: { label: string; count: number }[];
  unreadMessages: number;
  unreviewedVolunteers: number;
  recentCalls: Call[];
}

const EMPTY: DashboardStats = {
  calls: 0,
  news: 0,
  messages: 0,
  volunteers: 0,
  officers: 0,
  honorary: 0,
  events: 0,
  donations: 0,
  donationTotal: 0,
  galleryPhotos: 0,
  callsByMonth: [],
  unreadMessages: 0,
  unreviewedVolunteers: 0,
  recentCalls: [],
};

const DEFAULT_LAT = 43.06;
const DEFAULT_LNG = -74.19;
const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [forecast, setForecast] = useState<DailyForecast[]>([]);
  const [weatherLocation, setWeatherLocation] = useState("Broadalbin, NY");

  useEffect(() => {
    async function fetchStats() {
      try {
        const now = new Date();
        const MONTH_NAMES_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

        const [
          callsSnap,
          newsSnap,
          messagesSnap,
          volunteersSnap,
          officersSnap,
          eventsSnap,
          donationsSnap,
          gallerySnap,
        ] = await Promise.all([
          getDocs(collection(getDb(), "calls")),
          getDocs(collection(getDb(), "news")),
          getDocs(collection(getDb(), "contactSubmissions")),
          getDocs(collection(getDb(), "volunteerApplications")),
          getDocs(collection(getDb(), "officers")),
          getDocs(query(collection(getDb(), "events"), where("published", "==", true))),
          getDocs(collection(getDb(), "donations")),
          getDocs(collection(getDb(), "gallery")),
        ]);

        const currentYear = now.getFullYear().toString();
        const allCalls = (callsSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as Call[])
          .filter((c) => c.date.startsWith(currentYear));

        // Build 6-month rolling call volume
        const callsByMonth: { label: string; count: number }[] = [];
        for (let i = 5; i >= 0; i--) {
          const mDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
          const start = mDate.toISOString().split("T")[0];
          const endDate = new Date(mDate.getFullYear(), mDate.getMonth() + 1, 1);
          const end = endDate.toISOString().split("T")[0];
          const count = allCalls.filter((c) => c.date >= start && c.date < end).length;
          callsByMonth.push({ label: MONTH_NAMES_SHORT[mDate.getMonth()], count });
        }

        const recentCalls = [...allCalls]
          .sort((a, b) => {
            const dateCmp = b.date.localeCompare(a.date);
            if (dateCmp !== 0) return dateCmp;
            return (b.time || "").localeCompare(a.time || "");
          })
          .slice(0, 5);

        const donationDocs = donationsSnap.docs.map((d) => d.data());
        const donationTotal = donationDocs
          .filter((d) => d.paymentStatus === "paid")
          .reduce((sum, d) => sum + (d.amount || 0), 0);

        const honorary = officersSnap.docs.filter((d) => {
          const data = d.data();
          const ranks: string[] = data.ranks || [];
          const legacy = (data.rank || data.title || "").toLowerCase();
          const allRanks = ranks.length > 0 ? ranks.map((r: string) => r.toLowerCase()) : [legacy];
          return allRanks.some((r: string) => r.includes("honorary"));
        }).length;

        setStats({
          calls: allCalls.length,
          news: newsSnap.size,
          messages: messagesSnap.size,
          volunteers: volunteersSnap.size,
          officers: officersSnap.size - honorary,
          honorary,
          events: eventsSnap.size,
          donations: donationsSnap.size,
          donationTotal,
          galleryPhotos: gallerySnap.size,
          callsByMonth,
          unreadMessages: messagesSnap.docs.filter((d) => !d.data().read).length,
          unreviewedVolunteers: volunteersSnap.docs.filter((d) => !d.data().reviewed).length,
          recentCalls,
        });
      } catch (err) {
        console.error("Error fetching stats:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, []);

  // Weather
  useEffect(() => {
    async function loadWeather() {
      try {
        let lat = DEFAULT_LAT;
        let lng = DEFAULT_LNG;
        let locName = "Broadalbin, NY";

        const settingsSnap = await getDoc(doc(getDb(), "settings", "weather"));
        if (settingsSnap.exists()) {
          const d = settingsSnap.data();
          if (d.lat && d.lng) { lat = d.lat; lng = d.lng; }
          if (d.locationName) locName = d.locationName;
        }

        const [cur, fc] = await Promise.all([fetchWeather(lat, lng), fetchWeekForecast(lat, lng)]);
        setWeather(cur);
        setForecast(fc);
        setWeatherLocation(locName);
      } catch {
        // silent
      }
    }
    loadWeather();
  }, []);

  const cards: { label: string; value: number | string; icon: typeof Siren; href: string; color: string; subtitle?: string }[] = [
    { label: "Total Calls", value: stats.calls, icon: Siren, href: "/admin/calls", color: "text-red-400" },
    { label: "Active Members", value: stats.officers, icon: Users, href: "/admin/officers", color: "text-blue-400", subtitle: stats.honorary > 0 ? `${stats.honorary} honorary` : undefined },
    { label: "News Articles", value: stats.news, icon: Newspaper, href: "/admin/news", color: "text-cyan-400" },
    { label: "Upcoming Events", value: stats.events, icon: CalendarDays, href: "/admin/events", color: "text-purple-400" },
    { label: "Messages", value: stats.messages, icon: Mail, href: "/admin/messages", color: "text-green-400" },
    { label: "Volunteer Apps", value: stats.volunteers, icon: UserPlus, href: "/admin/volunteers", color: "text-yellow-400" },
    { label: "Donations", value: stats.donations, icon: Heart, href: "/admin/donations", color: "text-pink-400" },
    { label: "Raised", value: loading ? "—" : `$${stats.donationTotal.toFixed(2)}`, icon: Heart, href: "/admin/donations", color: "text-green-400" },
  ];

  const maxCallMonth = Math.max(...stats.callsByMonth.map((m) => m.count), 1);

  const formatTime = (time: string) => {
    if (!time) return "";
    const [h, m] = time.split(":");
    const hour = parseInt(h);
    const ampm = hour >= 12 ? "PM" : "AM";
    const h12 = hour % 12 || 12;
    return `${h12}:${m} ${ampm}`;
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + "T12:00:00");
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  return (
    <div>
      {/* Weather bar */}
      {weather && forecast.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 sm:p-5 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
            {/* Current */}
            <div className="flex items-center gap-3">
              <span className="text-4xl">{getWeatherIcon(weather.weathercode, weather.is_day === 1)}</span>
              <div>
                <p className="text-2xl font-bold text-white">{celsiusToFahrenheit(weather.temperature)}°F</p>
                <p className="text-gray-400 text-xs">{getWeatherDescription(weather.weathercode)} · {weatherLocation}</p>
              </div>
            </div>

            {/* Forecast strip */}
            <div className="flex gap-2 sm:gap-3 overflow-x-auto sm:ml-auto">
              {forecast.slice(0, 5).map((day) => {
                const d = new Date(day.date + "T12:00:00");
                return (
                  <div key={day.date} className="flex flex-col items-center min-w-[52px] bg-gray-800/50 rounded-lg px-2 py-2">
                    <p className="text-gray-400 text-[10px] font-medium">{DAY_NAMES[d.getDay()]}</p>
                    <span className="text-lg my-0.5">{getWeatherIcon(day.weathercode, true)}</span>
                    <p className="text-white text-[11px] font-medium">{celsiusToFahrenheit(day.tempMax)}°</p>
                    <p className="text-gray-500 text-[10px]">{celsiusToFahrenheit(day.tempMin)}°</p>
                    <div className="flex items-center gap-0.5 mt-0.5">
                      <Droplets size={8} className="text-cyan-500" />
                      <span className="text-gray-500 text-[9px]">{day.precipitationProbMax}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Unread alerts */}
      {!loading && (stats.unreadMessages > 0 || stats.unreviewedVolunteers > 0) && (
        <div className="space-y-3 mb-6">
          {stats.unreadMessages > 0 && (
            <Link
              href="/admin/messages"
              className="flex items-center gap-3 bg-red-900/30 border border-red-800 rounded-xl px-4 py-3 hover:bg-red-900/50 transition-colors"
            >
              <div className="w-9 h-9 rounded-full bg-red-600 flex items-center justify-center shrink-0">
                <Mail size={16} className="text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-semibold text-sm">
                  {stats.unreadMessages} unread message{stats.unreadMessages !== 1 ? "s" : ""}
                </p>
                <p className="text-red-300/70 text-xs">New contact submissions need attention</p>
              </div>
              <span className="bg-red-600 text-white text-xs font-bold px-2.5 py-1 rounded-full shrink-0">
                {stats.unreadMessages}
              </span>
            </Link>
          )}
          {stats.unreviewedVolunteers > 0 && (
            <Link
              href="/admin/volunteers"
              className="flex items-center gap-3 bg-yellow-900/20 border border-yellow-800/50 rounded-xl px-4 py-3 hover:bg-yellow-900/30 transition-colors"
            >
              <div className="w-9 h-9 rounded-full bg-yellow-600 flex items-center justify-center shrink-0">
                <UserPlus size={16} className="text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-semibold text-sm">
                  {stats.unreviewedVolunteers} unreviewed volunteer app{stats.unreviewedVolunteers !== 1 ? "s" : ""}
                </p>
                <p className="text-yellow-300/70 text-xs">New volunteer applications pending review</p>
              </div>
              <span className="bg-yellow-600 text-white text-xs font-bold px-2.5 py-1 rounded-full shrink-0">
                {stats.unreviewedVolunteers}
              </span>
            </Link>
          )}
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-8">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Link
              key={card.label}
              href={card.href}
              className="bg-gray-900 border border-gray-800 rounded-lg p-4 sm:p-5 hover:border-gray-600 transition-colors"
            >
              <div className="flex items-center justify-between mb-2">
                <Icon size={20} className={card.color} />
                <span className={`${typeof card.value === "string" ? "text-xl sm:text-2xl" : "text-2xl sm:text-3xl"} font-bold text-white`}>
                  {loading ? "—" : card.value}
                </span>
              </div>
              <p className="text-gray-400 text-xs sm:text-sm">{card.label}</p>
              {card.subtitle && !loading && (
                <p className="text-gray-600 text-[10px] mt-0.5">{card.subtitle}</p>
              )}
            </Link>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Call volume - 6 month bar chart */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-5">
            <TrendingUp size={18} className="text-red-400" />
            <h2 className="text-white font-semibold">Call Volume</h2>
            <span className="text-gray-600 text-xs ml-auto">Last 6 months</span>
          </div>
          {loading ? (
            <div className="h-40 bg-gray-800 rounded-lg animate-pulse" />
          ) : (
            <div className="flex items-end gap-2 sm:gap-3 h-40">
              {stats.callsByMonth.map((month, i) => {
                const heightPct = maxCallMonth > 0 ? (month.count / maxCallMonth) * 100 : 0;
                const isCurrentMonth = i === stats.callsByMonth.length - 1;
                return (
                  <div key={month.label} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                    <span className="text-white text-xs font-bold">{month.count}</span>
                    <div
                      className={`w-full rounded-t-md transition-all ${isCurrentMonth ? "bg-red-500" : "bg-gray-700"}`}
                      style={{ height: `${Math.max(heightPct, 4)}%` }}
                    />
                    <span className={`text-[10px] ${isCurrentMonth ? "text-red-400 font-medium" : "text-gray-500"}`}>
                      {month.label}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Recent calls */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Clock size={18} className="text-red-400" />
              <h2 className="text-white font-semibold">Recent Calls</h2>
            </div>
            <Link href="/admin/calls" className="text-red-400 hover:text-red-300 text-xs font-medium">
              View All
            </Link>
          </div>
          <div className="space-y-2">
            {loading ? (
              [...Array(5)].map((_, i) => (
                <div key={i} className="h-10 bg-gray-800 rounded-lg animate-pulse" />
              ))
            ) : stats.recentCalls.length === 0 ? (
              <p className="text-gray-500 text-sm">No calls yet.</p>
            ) : (
              stats.recentCalls.map((call) => (
                <div
                  key={call.id}
                  className="flex items-center justify-between bg-gray-800/50 rounded-lg px-3 py-2"
                >
                  <p className="text-white text-sm font-medium truncate mr-3">{call.title}</p>
                  <p className="text-gray-500 text-xs whitespace-nowrap">
                    {formatDate(call.date)}
                    {call.time && ` ${formatTime(call.time)}`}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
