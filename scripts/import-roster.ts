/**
 * One-time import script for Roster from Wix CSV export.
 * Usage: npx tsx scripts/import-roster.ts /path/to/Roster.csv
 */

import { readFileSync } from "fs";
import { resolve } from "path";
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { config } from "dotenv";

config({ path: resolve(process.cwd(), ".env") });

const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n");

if (!projectId || !clientEmail || !privateKey) {
  console.error("Missing Firebase Admin credentials in .env");
  process.exit(1);
}

initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
const db = getFirestore();

function parseCSVLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (inQuotes) {
      if (char === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
    } else {
      if (char === '"') inQuotes = true;
      else if (char === ",") { fields.push(current); current = ""; }
      else current += char;
    }
  }
  fields.push(current);
  return fields;
}

function parseCSV(content: string): string[][] {
  const rows: string[][] = [];
  let currentLine = "";
  let inQuotes = false;
  for (const line of content.split("\n")) {
    if (!currentLine && !inQuotes) {
      const quoteCount = (line.match(/"/g) || []).length;
      if (quoteCount % 2 !== 0) { inQuotes = true; currentLine = line; continue; }
      rows.push(parseCSVLine(line));
    } else {
      currentLine += "\n" + line;
      const quoteCount = (currentLine.match(/"/g) || []).length;
      if (quoteCount % 2 === 0) { inQuotes = false; rows.push(parseCSVLine(currentLine)); currentLine = ""; }
    }
  }
  return rows;
}

// Rank ordering for display
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

function getRankOrder(rank: string): number {
  const primary = rank.split(",")[0].trim();
  for (let i = 0; i < RANK_ORDER.length; i++) {
    if (primary.toLowerCase().includes(RANK_ORDER[i].toLowerCase())) return i;
  }
  return RANK_ORDER.length;
}

async function main() {
  const csvPath = process.argv[2];
  if (!csvPath) { console.error("Usage: npx tsx scripts/import-roster.ts <csv>"); process.exit(1); }

  const content = readFileSync(csvPath, "utf-8").replace(/^\uFEFF/, "");
  const rows = parseCSV(content);
  const header = rows[0];
  console.log("Headers:", header);
  console.log(`Found ${rows.length - 1} data rows\n`);

  const idx = {
    name: header.indexOf("Name"),
    rank: header.indexOf("Rank"),
    servingSince: header.indexOf("Serving Since"),
  };

  let imported = 0;
  let skipped = 0;
  const batch = db.batch();
  const ref = db.collection("officers");

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length < 3) { skipped++; continue; }

    const name = row[idx.name]?.trim();
    const rank = row[idx.rank]?.trim();
    const servingSince = row[idx.servingSince]?.trim();

    if (!name) { skipped++; continue; }

    // Determine title from rank (for combined ranks like "Lieutenant, Secretary")
    const title = rank || "";

    const doc = {
      name,
      rank: rank || "",
      title,
      servingSince: servingSince || "",
      image: "",
      order: getRankOrder(rank || "") * 100 + imported, // Group by rank, then insertion order
    };

    batch.set(ref.doc(), doc);
    imported++;
    console.log(`  [${i}] ${rank || "—"} — ${name} ${servingSince ? `(since ${servingSince})` : ""}`);
  }

  console.log(`\nImporting ${imported} members (skipped ${skipped})...`);
  await batch.commit();
  console.log("Done!");
}

main().catch((err) => { console.error("Import failed:", err); process.exit(1); });
