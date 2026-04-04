"use client";

import { useEffect, useState, useCallback } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { getDb } from "@/lib/firebase";

export interface AdminBadges {
  calls: number;
  news: number;
  events: number;
  messages: number;       // unread count
  volunteers: number;     // unreviewed count
  registrations: number;
  donations: number;
}

const EMPTY: AdminBadges = {
  calls: 0,
  news: 0,
  events: 0,
  messages: 0,
  volunteers: 0,
  registrations: 0,
  donations: 0,
};

export function useAdminBadges() {
  const [badges, setBadges] = useState<AdminBadges>(EMPTY);

  const refresh = useCallback(async () => {
    try {
      const [
        callsSnap,
        newsSnap,
        eventsSnap,
        messagesSnap,
        volunteersSnap,
        registrationsSnap,
        donationsSnap,
      ] = await Promise.all([
        getDocs(collection(getDb(), "calls")),
        getDocs(collection(getDb(), "news")),
        getDocs(query(collection(getDb(), "events"), where("published", "==", true))),
        getDocs(collection(getDb(), "contactSubmissions")),
        getDocs(collection(getDb(), "volunteerApplications")),
        getDocs(collection(getDb(), "registrations")),
        getDocs(collection(getDb(), "donations")),
      ]);

      const currentYear = new Date().getFullYear().toString();
      const currentYearCalls = callsSnap.docs.filter((d) => (d.data().date || "").startsWith(currentYear));
      const unreadMessages = messagesSnap.docs.filter((d) => !d.data().read).length;
      const unreviewedVolunteers = volunteersSnap.docs.filter((d) => !d.data().reviewed).length;

      setBadges({
        calls: currentYearCalls.length,
        news: newsSnap.size,
        events: eventsSnap.size,
        messages: unreadMessages,
        volunteers: unreviewedVolunteers,
        registrations: registrationsSnap.size,
        donations: donationsSnap.size,
      });
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    refresh(); // eslint-disable-line react-hooks/set-state-in-effect
  }, [refresh]); // eslint-disable-line react-hooks/exhaustive-deps

  return { badges, refresh };
}
