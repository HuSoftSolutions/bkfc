"use client";

import { useEffect, useState } from "react";
import {
  collection,
  query,
  orderBy,
  getDocs,
  where,
} from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import { Call, NewsArticle, Event } from "@/types";
import Hero from "@/components/Hero";
import CallCard from "@/components/CallCard";
import WeatherForecast from "@/components/WeatherForecast";
import MapSection from "@/components/MapSection";
import FacebookFeed from "@/components/FacebookFeed";
import PlaceholderImage from "@/components/PlaceholderImage";
import { sortPinned } from "@/lib/sortPinned";
import { filterPublicCalls } from "@/lib/filterCalls";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  ArrowUpRight,
  Calendar,
  Clock,
  MapPin,
  Newspaper,
  Siren,
  Heart,
  CalendarDays,
  Pin,
} from "lucide-react";

export default function HomePage() {
  const [calls, setCalls] = useState<Call[]>([]);
  const [news, setNews] = useState<NewsArticle[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [loadingCalls, setLoadingCalls] = useState(true);
  const [loadingNews, setLoadingNews] = useState(true);
  const [loadingEvents, setLoadingEvents] = useState(true);

  useEffect(() => {
    async function fetchCalls() {
      try {
        const q = query(
          collection(getDb(), "calls"),
          orderBy("date", "desc")
        );
        const snapshot = await getDocs(q);
        const allCalls = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as Call[];
        const publicCalls = filterPublicCalls(allCalls);
        setCalls(sortPinned(publicCalls).slice(0, 6));
      } catch (err) {
        console.error("Error fetching calls:", err);
      } finally {
        setLoadingCalls(false);
      }
    }

    async function fetchNews() {
      try {
        const q = query(
          collection(getDb(), "news"),
          where("published", "==", true),
          orderBy("date", "desc")
        );
        const snapshot = await getDocs(q);
        const all = sortPinned(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as NewsArticle[]);
        setNews(all.slice(0, 6));
      } catch (err) {
        console.error("Error fetching news:", err);
      } finally {
        setLoadingNews(false);
      }
    }

    async function fetchEvents() {
      try {
        const today = new Date().toISOString().split("T")[0];
        const q = query(
          collection(getDb(), "events"),
          where("published", "==", true),
          where("date", ">=", today),
          orderBy("date", "desc")
        );
        const snapshot = await getDocs(q);
        const all = sortPinned(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as Event[]);
        setEvents(all.slice(0, 6));
      } catch (err) {
        console.error("Error fetching events:", err);
      } finally {
        setLoadingEvents(false);
      }
    }

    fetchCalls();
    fetchNews();
    fetchEvents();
  }, []);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + "T12:00:00");
    return d.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  const formatTime = (time: string) => {
    if (!time) return "";
    const [h, m] = time.split(":");
    const hour = parseInt(h);
    const ampm = hour >= 12 ? "PM" : "AM";
    const h12 = hour % 12 || 12;
    return `${h12}:${m} ${ampm}`;
  };

  return (
    <>
      <Hero
        title="Broadalbin-Kennyetto Fire Co."
        subtitle="Proudly serving the communities of Broadalbin and Mayfield in Fulton County, New York"
        ctaText="Become a Volunteer"
        ctaHref="/volunteer"
        useSettingsImage
        showCallCount
        showStats
        fullHeight
      />

      {/* Weather */}
      <WeatherForecast />

      {/* Donate section */}
      <section className="relative bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-20">
          <div className="max-w-2xl mx-auto text-center">
            <div className="w-14 h-14 bg-red-50 border border-red-200 rounded-full flex items-center justify-center mx-auto mb-6">
              <Heart size={24} className="text-red-600" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">
              Support Your Local Fire Company
            </h2>
            <p className="text-gray-500 leading-relaxed mb-8">
              As an all-volunteer department, we rely on the generosity of our
              community to maintain equipment, fund training, and keep our
              firefighters safe. Every contribution helps us continue protecting
              Broadalbin and Mayfield.
            </p>
            <Link
              href="/donate"
              className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white font-semibold px-8 py-3.5 rounded-xl transition-colors"
            >
              <Heart size={18} />
              Make a Donation
            </Link>
          </div>
        </div>
      </section>

      {/* Upcoming Events */}
      <section className="relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-20">
          <SectionHeader
            icon={<CalendarDays size={20} />}
            title="Upcoming Events"
            href="/events"
          />

          {loadingEvents ? (
            <SkeletonGrid count={3} height="h-48" />
          ) : events.length === 0 ? (
            <EmptyState text="No upcoming events." />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {events.map((event) => (
                <Link
                  key={event.id}
                  href={`/events/${event.id}`}
                  className="group bg-white border border-gray-200 rounded-2xl overflow-hidden hover:border-red-300 hover:shadow-md transition-all duration-300"
                >
                  <div className="relative w-full h-40 overflow-hidden">
                    {event.image ? (
                      <Image
                        src={event.image}
                        alt={event.title}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <PlaceholderImage variant="event" className="h-40" />
                    )}
                    {event.pinned && (
                      <div className="absolute top-3 right-3 bg-yellow-500 rounded-full p-1 shadow">
                        <Pin size={12} className="text-white rotate-45" />
                      </div>
                    )}
                  </div>
                  <div className="p-5">
                    <h3 className="text-gray-900 font-bold text-lg mb-3 group-hover:text-red-700 transition-colors">
                      {event.title}
                    </h3>
                    <div className="space-y-2 text-sm text-gray-400">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-red-50 flex items-center justify-center">
                          <Calendar size={13} className="text-red-600" />
                        </div>
                        <span>{formatDate(event.date)}</span>
                      </div>
                      {event.time && (
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-red-50 flex items-center justify-center">
                            <Clock size={13} className="text-red-600" />
                          </div>
                          <span>
                            {formatTime(event.time)}
                            {event.endTime &&
                              ` — ${formatTime(event.endTime)}`}
                          </span>
                        </div>
                      )}
                      {event.location && (
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-red-50 flex items-center justify-center">
                            <MapPin size={13} className="text-red-600" />
                          </div>
                          <span>{event.location}</span>
                        </div>
                      )}
                    </div>
                    {event.description && (
                      <p className="text-gray-500 text-sm mt-3 line-clamp-2">
                        {event.description}
                      </p>
                    )}
                    <div className="mt-4 flex items-center gap-1 text-red-600 text-sm font-medium whitespace-nowrap">
                      View Details <ArrowUpRight size={14} />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Latest News */}
      <section className="relative bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-20">
          <SectionHeader
            icon={<Newspaper size={20} />}
            title="Latest News"
            href="/news"
          />

          {loadingNews ? (
            <SkeletonGrid count={3} height="h-72" />
          ) : news.length === 0 ? (
            <EmptyState text="No news articles to display." />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {news.map((article) => (
                <Link
                  key={article.id}
                  href={`/news/${article.slug}`}
                  className="group bg-white border border-gray-200 rounded-2xl overflow-hidden hover:border-red-300 hover:shadow-md transition-all duration-300"
                >
                  <div className="relative w-full h-48 overflow-hidden">
                    {article.image ? (
                      <Image
                        src={article.image}
                        alt={article.title}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <PlaceholderImage variant="news" className="h-48" />
                    )}
                    <div className="absolute bottom-3 left-3">
                      <span className="bg-red-600 text-white text-[10px] font-semibold px-2.5 py-1 rounded-full">
                        {article.date}
                      </span>
                    </div>
                    {article.pinned && (
                      <div className="absolute top-3 right-3 bg-yellow-500 rounded-full p-1 shadow">
                        <Pin size={12} className="text-white rotate-45" />
                      </div>
                    )}
                  </div>
                  <div className="p-5">
                    <h3 className="text-gray-900 font-bold mb-2 group-hover:text-red-700 transition-colors leading-snug">
                      {article.title}
                    </h3>
                    <p className="text-gray-500 text-sm line-clamp-2">
                      {article.excerpt}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Recent Calls */}
      <section className="relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-20">
          <SectionHeader
            icon={<Siren size={20} />}
            title="Recent Calls"
            href="/calls"
          />

          {loadingCalls ? (
            <SkeletonGrid count={6} height="h-72" />
          ) : calls.length === 0 ? (
            <EmptyState text="No recent calls to display." />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {calls.map((call) => (
                <CallCard
                  key={call.id}
                  call={call}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Facebook Feed */}
      <FacebookFeed />

      {/* Map */}
      <MapSection />

      {/* Volunteer CTA band */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-red-700 to-red-900" />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PHBhdGggZD0iTTM2IDM0djItSDI0di0yaDEyek0zNiAyNHYySDI0di0yaDEyeiIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left">
          <div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-2">
              Ready to Make a Difference?
            </h2>
            <p className="text-red-200 text-base sm:text-lg">
              Join our volunteers protecting the community. No experience necessary.
            </p>
          </div>
          <Link
            href="/volunteer"
            className="shrink-0 bg-white text-red-700 font-bold px-8 py-4 rounded-xl hover:bg-gray-100 transition-all whitespace-nowrap"
          >
            Apply Now
          </Link>
        </div>
      </section>

    </>
  );
}

/* ── Shared sub-components ── */

function SectionHeader({
  icon,
  title,
  href,
}: {
  icon: React.ReactNode;
  title: string;
  href?: string;
}) {
  return (
    <div className="flex items-center justify-between mb-8 sm:mb-10 gap-4">
      <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-red-50 border border-red-200 flex items-center justify-center text-red-600 shrink-0">
          {icon}
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 truncate">{title}</h2>
      </div>
      {href && (
        <Link
          href={href}
          className="flex items-center gap-1 text-red-600 hover:text-red-700 text-sm font-medium transition-colors group whitespace-nowrap shrink-0"
        >
          View All{" "}
          <ArrowRight
            size={14}
            className="group-hover:translate-x-0.5 transition-transform"
          />
        </Link>
      )}
    </div>
  );
}

function SkeletonGrid({
  count,
  height,
}: {
  count: number;
  height: string;
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {[...Array(count)].map((_, i) => (
        <div
          key={i}
          className={`bg-gray-100 border border-gray-200 rounded-2xl ${height} animate-pulse`}
        />
      ))}
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="text-center py-12">
      <p className="text-gray-500">{text}</p>
    </div>
  );
}
