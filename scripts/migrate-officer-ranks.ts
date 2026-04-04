/**
 * One-time migration: converts legacy officer rank/title string fields
 * into the new `ranks` string[] array field in Firestore.
 *
 * Usage: npx tsx scripts/migrate-officer-ranks.ts
 *
 * Safe to run multiple times — skips officers that already have a `ranks` array.
 */

import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n");

if (!projectId || !clientEmail || !privateKey) {
  console.error("Missing FIREBASE_ADMIN_PROJECT_ID, FIREBASE_ADMIN_CLIENT_EMAIL, or FIREBASE_ADMIN_PRIVATE_KEY");
  process.exit(1);
}

initializeApp({
  credential: cert({ projectId, clientEmail, privateKey }),
});

const db = getFirestore();

async function migrate() {
  const snapshot = await db.collection("officers").get();
  console.log(`Found ${snapshot.size} officers`);

  let migrated = 0;
  let skipped = 0;

  for (const doc of snapshot.docs) {
    const data = doc.data();

    // Skip if already migrated
    if (data.ranks && Array.isArray(data.ranks) && data.ranks.length > 0) {
      skipped++;
      continue;
    }

    // Build ranks array from legacy fields
    const parts: string[] = [];

    if (data.rank && typeof data.rank === "string") {
      data.rank.split(",").forEach((r: string) => {
        const trimmed = r.trim();
        if (trimmed && !parts.includes(trimmed)) parts.push(trimmed);
      });
    }

    if (data.title && typeof data.title === "string") {
      data.title.split(",").forEach((t: string) => {
        const trimmed = t.trim();
        if (trimmed && !parts.includes(trimmed)) parts.push(trimmed);
      });
    }

    if (parts.length === 0) {
      console.log(`  ⚠ ${data.name || doc.id}: no rank/title found, setting empty ranks`);
    }

    await doc.ref.update({ ranks: parts });
    console.log(`  ✓ ${data.name || doc.id}: ${parts.join(", ") || "(none)"}`);
    migrated++;
  }

  console.log(`\nDone. Migrated: ${migrated}, Already migrated: ${skipped}`);
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
