"use client";

import { useEffect, useState } from "react";
import { collection, query, orderBy, limit, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Call } from "@/types";
import Hero from "@/components/Hero";
import CallCard from "@/components/CallCard";
import CallModal from "@/components/CallModal";

export default function HomePage() {
  const [calls, setCalls] = useState<Call[]>([]);
  const [selectedCall, setSelectedCall] = useState<Call | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchCalls() {
      try {
        const q = query(
          collection(db, "calls"),
          orderBy("date", "desc"),
          limit(12)
        );
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Call[];
        setCalls(data);
      } catch (err) {
        console.error("Error fetching calls:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchCalls();
  }, []);

  return (
    <>
      <Hero
        title="Broadalbin-Kennyetto Fire Company"
        subtitle="Proudly serving the communities of Broadalbin and Mayfield in Fulton County, New York"
        ctaText="Become a Volunteer"
        ctaHref="/volunteer"
      />

      {/* Recent Calls */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h2 className="text-3xl font-bold text-white mb-8">Recent Calls</h2>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="bg-gray-900 border border-gray-800 rounded-lg h-72 animate-pulse"
              />
            ))}
          </div>
        ) : calls.length === 0 ? (
          <p className="text-gray-400">No recent calls to display.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {calls.map((call) => (
              <CallCard key={call.id} call={call} onSelect={setSelectedCall} />
            ))}
          </div>
        )}
      </section>

      {/* Modal */}
      {selectedCall && (
        <CallModal call={selectedCall} onClose={() => setSelectedCall(null)} />
      )}
    </>
  );
}
