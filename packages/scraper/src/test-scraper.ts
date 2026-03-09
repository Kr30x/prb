/**
 * Scraper integration test — runs against real sozd.duma.gov.ru
 * Usage: npx ts-node src/test-scraper.ts
 */
import * as dotenv from "dotenv";
import * as path from "path";
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

import { scrapeBillDetail } from "./scraper";

// Known bill with full data on СОЗД: 1159193-8
// Expected (from the actual СОЗД page):
//   title:      "О внесении изменений в Кодекс Российской Федерации об административных правонарушениях..."
//   lawForm:    "Федеральный закон"
//   status:     "На рассмотрении"
//   authors:    non-empty, type=deputy
//   committees: includes "государственному строительству"
//   documents:  non-empty (PDF at /download/...)
//   events:     non-empty, first event has date + name
const TEST_BILL_ID = "1159193-8";

interface Check {
  field: string;
  expected: string;
  actual: string;
  pass: boolean;
}

function check(field: string, actual: unknown, test: (v: unknown) => boolean, expected: string): Check {
  const pass = test(actual);
  return {
    field,
    expected,
    actual: JSON.stringify(actual)?.slice(0, 120) ?? "undefined",
    pass,
  };
}

async function runTests(): Promise<void> {
  console.log(`\nFetching bill ${TEST_BILL_ID} from sozd.duma.gov.ru...\n`);

  const bill = await scrapeBillDetail(TEST_BILL_ID);

  const checks: Check[] = [
    check(
      "title",
      bill.title,
      (v) => typeof v === "string" && v.length > 20 && !v.includes("Законопроект №"),
      "non-empty real title (not just 'Законопроект № ...')"
    ),
    check(
      "lawForm",
      bill.lawForm,
      (v) => typeof v === "string" && (v as string).includes("закон"),
      "'Федеральный закон'"
    ),
    check(
      "status",
      bill.status,
      (v) => typeof v === "string" && (v as string).length > 0,
      "non-empty string"
    ),
    check(
      "authors",
      bill.authors,
      (v) => Array.isArray(v) && (v as unknown[]).length > 0,
      "non-empty array"
    ),
    check(
      "authors[0].name",
      bill.authors?.[0]?.name,
      (v) => typeof v === "string" && (v as string).length > 3,
      "a real name"
    ),
    check(
      "authors[0].type",
      bill.authors?.[0]?.type,
      (v) => ["deputy", "senator", "government", "other"].includes(v as string),
      "deputy | senator | government | other"
    ),
    check(
      "committees",
      bill.committees,
      (v) => Array.isArray(v) && (v as unknown[]).length > 0,
      "non-empty array"
    ),
    check(
      "committees[0]",
      bill.committees?.[0],
      (v) => typeof v === "string" && (v as string).length > 5,
      "committee name string"
    ),
    check(
      "documents",
      bill.documents,
      (v) => Array.isArray(v) && (v as unknown[]).length > 0,
      "non-empty array (PDF links)"
    ),
    check(
      "documents[0].url",
      bill.documents?.[0]?.url,
      (v) => typeof v === "string" && (v as string).includes("sozd.duma.gov.ru"),
      "full URL to sozd.duma.gov.ru"
    ),
    check(
      "events",
      bill.events,
      (v) => Array.isArray(v) && (v as unknown[]).length > 0,
      "non-empty array"
    ),
    check(
      "events[0].date",
      bill.events?.[0]?.date,
      (v) => typeof v === "string" && (v as string).includes("2026"),
      "ISO date string with year 2026"
    ),
    check(
      "events[0].name",
      bill.events?.[0]?.name,
      (v) => typeof v === "string" && (v as string).length > 5,
      "event name string"
    ),
    check(
      "registrationDate",
      bill.registrationDate,
      (v) => typeof v === "string" && (v as string).includes("2026"),
      "ISO date string"
    ),
  ];

  const maxField = Math.max(...checks.map((c) => c.field.length));
  let passed = 0;

  for (const c of checks) {
    const icon = c.pass ? "✅" : "❌";
    const fieldPadded = c.field.padEnd(maxField + 2);
    console.log(`${icon} ${fieldPadded} ${c.pass ? c.actual : `GOT: ${c.actual}`}`);
    if (!c.pass) {
      console.log(`   expected: ${c.expected}`);
    }
    if (c.pass) passed++;
  }

  console.log(`\n${passed}/${checks.length} checks passed\n`);

  if (passed < checks.length) {
    console.log("--- Full parsed bill ---");
    console.log(JSON.stringify(bill, null, 2));
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error(err);
  process.exit(1);
});
