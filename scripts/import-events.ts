/**
 * One-time import script for Events from Wix CSV export.
 * Usage: npx tsx scripts/import-events.ts /path/to/Events.csv
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

function stripHTML(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>\s*<p[^>]*>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

async function main() {
  const csvPath = process.argv[2];
  if (!csvPath) { console.error("Usage: npx tsx scripts/import-events.ts <csv>"); process.exit(1); }

  const content = readFileSync(csvPath, "utf-8").replace(/^\uFEFF/, "");
  const rows = parseCSV(content);
  const header = rows[0];
  console.log("Headers:", header);
  console.log(`Found ${rows.length - 1} data rows\n`);

  const idx = {
    title: header.indexOf("Title"),
    date: header.indexOf("Date"),
    story: header.indexOf("Story"),
  };

  let imported = 0;
  let skipped = 0;
  const batch = db.batch();
  const ref = db.collection("events");

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length < 3) { skipped++; continue; }

    const title = row[idx.title]?.trim();
    const rawDate = row[idx.date]?.trim();
    const rawStory = row[idx.story]?.trim();

    if (!title) { skipped++; continue; }

    const date = rawDate ? rawDate.split("T")[0] : "";
    const time = rawDate && rawDate.includes("T")
      ? rawDate.split("T")[1]?.substring(0, 5) || ""
      : "";
    const description = stripHTML(rawStory || "");

    const doc = {
      title,
      date,
      time,
      endDate: "",
      endTime: "",
      location: "",
      image: "",
      description,
      published: true,
    };

    batch.set(ref.doc(), doc);
    imported++;
    console.log(`  [${i}] ${date} — ${title}`);
  }

  console.log(`\nImporting ${imported} events (skipped ${skipped})...`);
  await batch.commit();
  console.log("Done!");
}

main().catch((err) => { console.error("Import failed:", err); process.exit(1); });
