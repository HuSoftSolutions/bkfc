"use client";

import { useEffect, useState } from "react";
import { collection, query, orderBy, getDocs } from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import { Officer } from "@/types";
import Hero from "@/components/Hero";
import Image from "next/image";
import { User, ExternalLink, Download, X } from "lucide-react";

// Group members by rank for display
const RANK_ORDER = [
  "Chief",
  "Assistant Chief",
  "2nd Assistant Chief",
  "Fire Police Chief",
  "Captain",
  "Lieutenant",
  "Safety Officer",
  "Accountability Officer",
  "President",
  "Vice President",
  "Treasurer",
  "Secretary",
  "Firefighter",
  "Fire Police",
  "Probationary",
  "Junior Firefighter",
  "Administrative",
  "Honorary Member",
];

/** Normalize legacy single-rank data to ranks array */
function getMemberRanks(officer: Officer): string[] {
  if (officer.ranks && officer.ranks.length > 0) return officer.ranks;
  const parts: string[] = [];
  if (officer.rank) {
    officer.rank.split(",").forEach((r) => {
      const trimmed = r.trim();
      if (trimmed) parts.push(trimmed);
    });
  }
  if (officer.title) {
    officer.title.split(",").forEach((t) => {
      const trimmed = t.trim();
      if (trimmed && !parts.includes(trimmed)) parts.push(trimmed);
    });
  }
  return parts.length > 0 ? parts : ["Other"];
}

/** Map a rank string to the closest RANK_ORDER entry */
function matchRankGroup(rank: string): string {
  const normalized = rank.toLowerCase();
  if (normalized.includes("fire police chief")) return "Fire Police Chief";
  if (normalized.includes("2nd assistant chief") || normalized.includes("2nd asst")) return "2nd Assistant Chief";
  for (const r of RANK_ORDER) {
    if (normalized.includes(r.toLowerCase())) return r;
  }
  if (normalized.includes("fire police")) return "Fire Police";
  return "Other";
}

export default function AboutPage() {
  const [officers, setOfficers] = useState<Officer[]>([]);
  const [loading, setLoading] = useState(true);
  const [mapOpen, setMapOpen] = useState(false);

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

  // Build groups: each member appears in every rank group they belong to
  const groupMap = new Map<string, Officer[]>();
  for (const member of officers) {
    const ranks = getMemberRanks(member);
    for (const rank of ranks) {
      const group = matchRankGroup(rank);
      if (!groupMap.has(group)) groupMap.set(group, []);
      groupMap.get(group)!.push(member);
    }
  }

  // Sort groups by RANK_ORDER, then sort members within each group by order
  const groups = [...groupMap.entries()]
    .sort(([a], [b]) => {
      const ai = RANK_ORDER.indexOf(a);
      const bi = RANK_ORDER.indexOf(b);
      return (ai >= 0 ? ai : RANK_ORDER.length) - (bi >= 0 ? bi : RANK_ORDER.length);
    })
    .map(([label, members]) => ({
      label,
      members: [...members].sort((a, b) => (a.order || 0) - (b.order || 0)),
    }));

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
              County, New York. With {officers.length || 54} dedicated volunteer
              members and one station, we respond to a wide range of emergencies
              including structure fires, motor vehicle accidents, hazmat
              incidents, and more.
            </p>
          </div>
        </div>

        {/* History */}
        <div className="max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">Our History</h2>
          <div className="text-gray-600 space-y-4 leading-relaxed">
            <p>
              On November 18, 1877 a very destructive fire consumed the
              Broadalbin Baptist Church, its horse sheds, four barns, three
              houses, one cow and other miscellaneous items. At that time
              Broadalbin was without any organized means of combating the flames!
            </p>
            <p>
              The severity of this conflagration stirred the local citizens into
              joining together to investigate the need, and process, of forming a
              fire company.
            </p>
            <p>
              On June 8, 1878 the citizens of Broadalbin and Vail Mills met in
              the upper room of W. H. Halliday&apos;s harness shop for the purpose of
              organizing a fire company. One month later they took delivery of a
              &quot;Little Giant&quot; fire engine. It used a &quot;chemical
              fluid&quot; and it cost $500.00.
            </p>
            <p>
              The equipment was stored in rented barns until October 1886 when a
              new frame structure firehouse was built on School Street, to
              provide the first firehouse for Broadalbin. The cost was $419.04.
            </p>
            <p>
              Our company was incorporated following a meeting on October 2,
              1886. Broadalbin was the third community in Fulton County to have a
              fire company, having been preceded by the villages of Gloversville
              and Johnstown (now cities).
            </p>
            <p>
              Our first motorized fire fighting unit was a 1924 Reo Speedwagon
              truck, outfitted by the Foamite-Childs Corporation of Utica, NY as
              a fire truck.
            </p>
            <p>
              A big step forward in the combating of village fires came when a
              municipal water system was installed in 1928.
            </p>
            <p>
              When you see the equipment available to the firefighters of today
              and compare it to the very limited tools and machines of the early
              twentieth century it is easy to understand why there were so many
              large and serious fires in earlier days.
            </p>
          </div>
        </div>

        {/* District Map */}
        <div className="max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">Our District</h2>
          <p className="text-gray-600 mb-6 leading-relaxed">
            The Broadalbin Fire District covers the Town of Broadalbin in Fulton
            County, New York, including the communities of Broadalbin, Vail Mills,
            North Broadalbin, and Hagedorns Mills.
          </p>
          <button
            onClick={() => setMapOpen(true)}
            className="border border-gray-200 rounded-xl overflow-hidden bg-white block w-full cursor-zoom-in hover:shadow-lg transition-shadow"
          >
            <Image
              src="/broadalbin-fire-district-map.png"
              alt="Broadalbin Fire District Map"
              width={1800}
              height={1200}
              className="w-full h-auto"
              priority={false}
            />
          </button>

          {mapOpen && (
            <div
              className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
              onClick={() => setMapOpen(false)}
            >
              <button
                onClick={() => setMapOpen(false)}
                className="absolute top-4 right-4 text-white/70 hover:text-white z-10"
              >
                <X size={28} />
              </button>
              <div
                className="relative max-w-[95vw] max-h-[90vh] overflow-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <Image
                  src="/broadalbin-fire-district-map.png"
                  alt="Broadalbin Fire District Map"
                  width={3600}
                  height={2400}
                  className="w-auto h-auto max-h-[90vh]"
                  priority
                />
              </div>
            </div>
          )}
          <div className="flex gap-4 mt-4">
            <a
              href="/Broadalbin_Fire_District.pdf"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-red-600 hover:text-red-700 font-medium transition-colors text-sm"
            >
              <ExternalLink size={16} />
              Open Full Map
            </a>
            <a
              href="/Broadalbin_Fire_District.pdf"
              download
              className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-700 font-medium transition-colors text-sm"
            >
              <Download size={16} />
              Download PDF
            </a>
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
                  {group.label.endsWith("Police") || group.label.endsWith("s") ? group.label : `${group.label}s`}
                  <span className="text-gray-400 font-normal text-sm ml-2">
                    ({group.members.length})
                  </span>
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {group.members.map((member) => (
                    <div
                      key={`${group.label}-${member.id}`}
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
