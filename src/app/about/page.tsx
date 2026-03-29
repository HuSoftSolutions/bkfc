"use client";

import { useEffect, useState } from "react";
import { collection, query, orderBy, getDocs } from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import { Officer } from "@/types";
import Hero from "@/components/Hero";
import Image from "next/image";
import { User } from "lucide-react";

// Group members by rank for display
const RANK_ORDER = [
  "Chief",
  "Assistant Chief",
  "Captain",
  "Lieutenant",
  "Safety Officer",
  "Accountability Officer",
  "Fire Police Chief",
  "President",
  "Vice President",
  "Treasurer",
  "Secretary",
  "Firefighter",
  "Probationary",
  "Junior Firefighter",
  "Administrative",
  "Honorary Member",
];

function getRankGroup(rank: string): string {
  // Some entries have combined ranks like "Lieutenant, Secretary"
  const primary = rank.split(",")[0].trim();
  for (const r of RANK_ORDER) {
    if (primary.toLowerCase().includes(r.toLowerCase())) return r;
  }
  return "Other";
}

function getRankSortOrder(rank: string): number {
  const group = getRankGroup(rank);
  const idx = RANK_ORDER.indexOf(group);
  return idx >= 0 ? idx : RANK_ORDER.length;
}

export default function AboutPage() {
  const [officers, setOfficers] = useState<Officer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchOfficers() {
      try {
        const q = query(collection(getDb(), "officers"), orderBy("order", "asc"));
        const snapshot = await getDocs(q);
        setOfficers(
          snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as Officer[]
        );
      } catch (err) {
        console.error("Error fetching roster:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchOfficers();
  }, []);

  // Sort by rank hierarchy, then by order field
  const sorted = [...officers].sort((a, b) => {
    const rankDiff = getRankSortOrder(a.rank || a.title) - getRankSortOrder(b.rank || b.title);
    if (rankDiff !== 0) return rankDiff;
    return (a.order || 0) - (b.order || 0);
  });

  // Group by rank
  const groups: { label: string; members: Officer[] }[] = [];
  const seen = new Set<string>();
  for (const member of sorted) {
    const group = getRankGroup(member.rank || member.title);
    if (!seen.has(group)) {
      seen.add(group);
      groups.push({ label: group, members: [] });
    }
    groups.find((g) => g.label === group)?.members.push(member);
  }

  return (
    <>
      <Hero title="About BKFC" subtitle="Serving our community since day one" />

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* About text */}
        <div className="max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">Our Department</h2>
          <div className="text-gray-600 space-y-4 leading-relaxed">
            <p>
              The Broadalbin-Kennyetto Fire Company (BKFC) is a volunteer fire
              department located at 14 Pine Street, Broadalbin, NY 12025. We
              proudly serve the communities of Broadalbin and Mayfield in Fulton
              County, New York.
            </p>
            <p>
              With {officers.length || 54} dedicated volunteer members and one station, we respond to
              a wide range of emergencies including structure fires, motor
              vehicle accidents, hazmat incidents, and more. Our members are
              committed to protecting life and property in our community.
            </p>
          </div>
        </div>

        {/* Roster */}
        <h2 className="text-3xl font-bold text-gray-900 mb-10 text-center">
          Our Roster
        </h2>

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="bg-gray-50 border border-gray-200 rounded-xl h-48 animate-pulse" />
            ))}
          </div>
        ) : groups.length === 0 ? (
          <p className="text-gray-400 text-center">No roster data available.</p>
        ) : (
          <div className="space-y-12">
            {groups.map((group) => (
              <div key={group.label}>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 border-b border-gray-200 pb-2">
                  {group.label}s
                  <span className="text-gray-400 font-normal text-sm ml-2">
                    ({group.members.length})
                  </span>
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {group.members.map((member) => (
                    <div
                      key={member.id}
                      className="bg-white border border-gray-200 rounded-xl p-4 text-center"
                    >
                      {member.image ? (
                        <div className="relative w-16 h-16 mx-auto mb-3 rounded-full overflow-hidden">
                          <Image
                            src={member.image}
                            alt={member.name}
                            fill
                            className="object-cover"
                          />
                        </div>
                      ) : (
                        <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-gray-100 flex items-center justify-center">
                          <User size={24} className="text-gray-300" />
                        </div>
                      )}
                      <h4 className="text-gray-900 font-semibold text-sm">
                        {member.name}
                      </h4>
                      {member.title && member.title !== member.rank && (
                        <p className="text-red-600 text-xs mt-0.5">{member.title}</p>
                      )}
                      {member.servingSince && (
                        <p className="text-gray-400 text-xs mt-1">
                          Since {member.servingSince}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
