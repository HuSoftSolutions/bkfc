"use client";

import { useEffect, useState } from "react";
import { collection, query, orderBy, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Apparatus } from "@/types";
import Hero from "@/components/Hero";
import Image from "next/image";

const DEFAULT_APPARATUS: Omit<Apparatus, "id">[] = [
  {
    name: "Engine 212",
    designation: "212",
    description:
      "Primary pumper for structure fires and alarm activations. Delivered March 8, 2025, replacing a 2005 HME 1871 Series Engine Tank.",
    specs: [
      "1,500 GPM Hale Side-Mount Pump",
      "Deck Gun",
      "6 MSA G1 Air Packs, 5 Spare Bottles",
      "100' of 1-3/4\" Hose (Trashline)",
      "750' of 2-1/2\" Hose",
      "800' of 1-3/4\" Hose",
      "1,000' of 4\" Hydrant Lay",
    ],
    image: "",
    images: [],
    order: 1,
  },
];

export default function ApparatusPage() {
  const [apparatus, setApparatus] = useState<Apparatus[]>([]);

  useEffect(() => {
    async function fetchApparatus() {
      try {
        const q = query(collection(db, "apparatus"), orderBy("order", "asc"));
        const snapshot = await getDocs(q);
        if (snapshot.size > 0) {
          setApparatus(
            snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as Apparatus[]
          );
        }
      } catch {
        // Fallback to static data
      }
    }
    fetchApparatus();
  }, []);

  const displayApparatus =
    apparatus.length > 0
      ? apparatus
      : DEFAULT_APPARATUS.map((a, i) => ({ ...a, id: String(i) }));

  return (
    <>
      <Hero title="Apparatus" subtitle="Our fleet of fire apparatus" />

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-12">
        {displayApparatus.map((unit) => (
          <div
            key={unit.id}
            className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden"
          >
            {unit.image && (
              <div className="relative w-full h-64 md:h-96">
                <Image
                  src={unit.image}
                  alt={unit.name}
                  fill
                  className="object-cover"
                />
              </div>
            )}
            <div className="p-6 md:p-8">
              <h2 className="text-2xl font-bold text-white mb-1">
                {unit.name}
              </h2>
              <p className="text-red-400 text-sm font-medium mb-4">
                Unit #{unit.designation}
              </p>
              <p className="text-gray-300 leading-relaxed mb-6">
                {unit.description}
              </p>
              {unit.specs.length > 0 && (
                <>
                  <h3 className="text-white font-semibold mb-2">
                    Specifications
                  </h3>
                  <ul className="list-disc list-inside text-gray-400 text-sm space-y-1">
                    {unit.specs.map((spec, i) => (
                      <li key={i}>{spec}</li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          </div>
        ))}
      </section>
    </>
  );
}
