"use client";

import { useEffect, useState } from "react";
import { collection, query, orderBy, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Officer } from "@/types";
import Hero from "@/components/Hero";
import Image from "next/image";
import { User } from "lucide-react";

const LEADERSHIP = [
  { title: "Chief", name: "Bill Robinson" },
  { title: "1st Asst. Chief", name: "Archie Rose" },
  { title: "2nd Asst. Chief", name: "Robert Lindsay Jr." },
  { title: "1st Captain", name: "Ron Miller" },
  { title: "2nd Captain", name: "Tim Chace" },
  { title: "1st Lieutenant", name: "Grant Rauch" },
  { title: "2nd Lieutenant", name: "Maria Oakden" },
  { title: "3rd Lieutenant", name: "Megan Sherman" },
  { title: "4th Lieutenant", name: "Dave Sherman" },
  { title: "Safety Officer", name: "Bob Wells" },
  { title: "Safety Officer", name: "Jason Flego" },
  { title: "Accountability Officer", name: "Michelle Robbins" },
  { title: "Fire Police Chief", name: "Robert Zurlo" },
  { title: "President", name: "Bob Wells" },
];

export default function AboutPage() {
  const [officers, setOfficers] = useState<Officer[]>([]);

  useEffect(() => {
    async function fetchOfficers() {
      try {
        const q = query(collection(db, "officers"), orderBy("order", "asc"));
        const snapshot = await getDocs(q);
        if (snapshot.size > 0) {
          setOfficers(
            snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as Officer[]
          );
        }
      } catch {
        // Fallback to static data
      }
    }
    fetchOfficers();
  }, []);

  const displayOfficers: { name: string; title: string; image?: string }[] =
    officers.length > 0 ? officers : LEADERSHIP;

  return (
    <>
      <Hero title="About BKFC" subtitle="Serving our community since day one" />

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* About text */}
        <div className="max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl font-bold text-white mb-6">Our Department</h2>
          <div className="text-gray-300 space-y-4 leading-relaxed">
            <p>
              The Broadalbin-Kennyetto Fire Company (BKFC) is a volunteer fire
              department located at 14 Pine Street, Broadalbin, NY 12025. We
              proudly serve the communities of Broadalbin and Mayfield in Fulton
              County, New York.
            </p>
            <p>
              With 54 dedicated volunteer members and one station, we respond to
              a wide range of emergencies including structure fires, motor
              vehicle accidents, hazmat incidents, and more. Our members are
              committed to protecting life and property in our community.
            </p>
          </div>
        </div>

        {/* Officers */}
        <h2 className="text-3xl font-bold text-white mb-8 text-center">
          Officers &amp; Leadership
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {displayOfficers.map((officer, i) => (
              <div
                key={i}
                className="bg-gray-900 border border-gray-800 rounded-lg p-5 text-center"
              >
                {officer.image ? (
                  <div className="relative w-20 h-20 mx-auto mb-3 rounded-full overflow-hidden">
                    <Image
                      src={officer.image}
                      alt={officer.name}
                      fill
                      className="object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-20 h-20 mx-auto mb-3 rounded-full bg-gray-800 flex items-center justify-center">
                    <User size={32} className="text-gray-600" />
                  </div>
                )}
                <h3 className="text-white font-semibold">{officer.name}</h3>
                <p className="text-red-400 text-sm">{officer.title}</p>
              </div>
            ))}
        </div>
      </section>
    </>
  );
}
