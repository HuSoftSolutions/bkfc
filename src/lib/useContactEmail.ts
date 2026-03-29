"use client";

import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { getDb } from "@/lib/firebase";

let _cached: string | null = null;

export function useContactEmail(): string | null {
  const [email, setEmail] = useState<string | null>(_cached);

  useEffect(() => {
    if (_cached !== null) return;

    async function load() {
      try {
        const snap = await getDoc(doc(getDb(), "settings", "contact"));
        if (snap.exists()) {
          const val = snap.data().email || null;
          _cached = val;
          setEmail(val);
        } else {
          _cached = "";
          setEmail("");
        }
      } catch {
        _cached = "";
        setEmail("");
      }
    }
    load();
  }, []);

  // Return null while loading, empty string if not set, or the email
  return email === "" ? null : email;
}
