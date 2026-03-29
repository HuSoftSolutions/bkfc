/**
 * One-time import script for Recent Calls from Wix CSV export.
 *
 * Usage:
 *   npx tsx scripts/import-calls.ts /path/to/Recent+Calls.csv
 *
 * Requires .env.local with Firebase Admin credentials.
 */

import { readFileSync } from "fs";
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { config } from "dotenv";
import { resolve } from "path";

// Load .env.local
config({ path: resolve(process.cwd(), ".env") });

const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(
  /\\n/g,
  "\n"
);

if (!projectId || !clientEmail || !privateKey) {
  console.error(
    "Missing Firebase Admin credentials in .env.local. Need FIREBASE_ADMIN_PROJECT_ID, FIREBASE_ADMIN_CLIENT_EMAIL, FIREBASE_ADMIN_PRIVATE_KEY."
  );
  process.exit(1);
}

initializeApp({
  credential: cert({ projectId, clientEmail, privateKey }),
});

const db = getFirestore();

// ── CSV Parsing ──

function parseCSVLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (inQuotes) {
      if (char === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          // Escaped quote
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ",") {
        fields.push(current);
        current = "";
      } else {
        current += char;
      }
    }
  }
  fields.push(current);
  return fields;
}

// Handle multiline CSV fields (quoted fields with newlines)
function parseCSV(content: string): string[][] {
  const rows: string[][] = [];
  let currentLine = "";
  let inQuotes = false;

  for (const line of content.split("\n")) {
    if (!currentLine && !inQuotes) {
      // Count quotes to determine if we're starting a multiline field
      const quoteCount = (line.match(/"/g) || []).length;
      if (quoteCount % 2 !== 0) {
        // Odd number of quotes — field spans multiple lines
        inQuotes = true;
        currentLine = line;
        continue;
      }
      rows.push(parseCSVLine(line));
    } else {
      currentLine += "\n" + line;
      const quoteCount = (currentLine.match(/"/g) || []).length;
      if (quoteCount % 2 === 0) {
        // All quotes closed
        inQuotes = false;
        rows.push(parseCSVLine(currentLine));
        currentLine = "";
      }
    }
  }

  return rows;
}

// ── HTML Stripping ──

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

// ── Slug Generation ──

function generateSlug(title: string, date: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  // Append date fragment to avoid duplicates
  const datePart = date.split("T")[0];
  return `${slug}-${datePart}`;
}

// ── Main ──

async function main() {
  const csvPath = process.argv[2];
  if (!csvPath) {
    console.error("Usage: npx tsx scripts/import-calls.ts <path-to-csv>");
    process.exit(1);
  }

  const content = readFileSync(csvPath, "utf-8").replace(/^\uFEFF/, "");
  const rows = parseCSV(content);

  // First row is header
  const header = rows[0];
  console.log("CSV Headers:", header);
  console.log(`Found ${rows.length - 1} data rows\n`);

  // Map header to indices
  const idx = {
    title: header.indexOf("Title"),
    date: header.indexOf("Date"),
    description: header.indexOf("Description"),
    image: header.indexOf("Image"),
  };

  let imported = 0;
  let skipped = 0;

  const batch = db.batch();
  const callsRef = db.collection("calls");

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length < 4) {
      skipped++;
      continue;
    }

    const title = row[idx.title]?.trim();
    const rawDate = row[idx.date]?.trim();
    const rawDescription = row[idx.description]?.trim();

    if (!title || !rawDate) {
      skipped++;
      continue;
    }

    // Parse date
    const dateObj = new Date(rawDate);
    const date = dateObj.toISOString().split("T")[0]; // YYYY-MM-DD
    const hours = dateObj.getUTCHours();
    const minutes = dateObj.getUTCMinutes();
    const time = `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;

    // Strip HTML from description
    const description = stripHTML(rawDescription || "");

    // Generate slug
    const slug = generateSlug(title, rawDate);

    const doc = {
      title,
      date,
      time,
      description,
      location: "", // Not in CSV, extracted from description text
      image: "", // Wix image URLs won't work — leave empty
      slug,
    };

    const ref = callsRef.doc();
    batch.set(ref, doc);
    imported++;

    console.log(`  [${i}] ${date} — ${title}`);
  }

  console.log(`\nImporting ${imported} calls (skipped ${skipped})...`);

  // Firestore batch limit is 500, split if needed
  await batch.commit();

  console.log("Done! All calls imported to Firestore.");
}

main().catch((err) => {
  console.error("Import failed:", err);
  process.exit(1);
});
