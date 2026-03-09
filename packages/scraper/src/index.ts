import * as dotenv from "dotenv";
import * as path from "path";

// Load .env from project root
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

import { scrapeBillList, scrapeBillDetail } from "./scraper";
import { upsertBill, billExists } from "./firebase-writer";
import { runParallelScrape } from "./parallel-scraper";
import { computeAndWriteStats } from "./stats-writer";

const args = process.argv.slice(2);
const modeArg = args.find((a) => a.startsWith("--mode="));
const mode = modeArg ? modeArg.split("=")[1] : "incremental";

const MAX_FULL_PAGES = 100;
const INCREMENTAL_PAGES = 5;

async function scrapeAndSave(billId: string, billUrl: string, title: string, registrationDate: string, status: string): Promise<void> {
  try {
    const detail = await scrapeBillDetail(billId);
    const bill = {
      ...detail,
      id: billId,
      url: billUrl,
      title: detail.title || title,
      registrationDate: detail.registrationDate || registrationDate,
      status: detail.status || status,
    };
    await upsertBill(bill);
  } catch (err) {
    console.error(`Failed to scrape detail for ${billId}:`, err);
    // Still save basic info
    await upsertBill({
      id: billId,
      url: billUrl,
      title,
      registrationDate,
      status,
      authors: [],
      committees: [],
      convocation: 8,
      documents: [],
      lastEvent: { stage: "", date: new Date() },
      scrapedAt: new Date(),
      updatedAt: new Date(),
    });
  }
}

async function runFull(): Promise<void> {
  console.log("Starting FULL scrape...");
  let totalBills = 0;

  for (let page = 1; page <= MAX_FULL_PAGES; page++) {
    const bills = await scrapeBillList(page);
    if (bills.length === 0) {
      console.log(`No bills found on page ${page}, stopping.`);
      break;
    }

    for (const bill of bills) {
      await scrapeAndSave(bill.id, bill.url, bill.title, bill.registrationDate, bill.status);
      totalBills++;
    }

    console.log(`Processed page ${page}, total bills: ${totalBills}`);
  }

  console.log(`Full scrape complete. Total bills: ${totalBills}`);
}

async function runIncremental(): Promise<void> {
  console.log("Starting INCREMENTAL scrape...");
  let totalNew = 0;
  let allExist = false;

  for (let page = 1; page <= INCREMENTAL_PAGES; page++) {
    const bills = await scrapeBillList(page);
    if (bills.length === 0) {
      console.log(`No bills found on page ${page}, stopping.`);
      break;
    }

    let pageAllExist = true;
    for (const bill of bills) {
      const exists = await billExists(bill.id);
      if (!exists) {
        pageAllExist = false;
        await scrapeAndSave(bill.id, bill.url, bill.title, bill.registrationDate, bill.status);
        totalNew++;
      }
    }

    if (pageAllExist) {
      console.log(`All bills on page ${page} already exist, stopping.`);
      allExist = true;
      break;
    }

    console.log(`Processed page ${page}, new bills so far: ${totalNew}`);
  }

  if (!allExist) {
    console.log(`Incremental scrape complete. New bills added: ${totalNew}`);
  }
}

async function runRefresh(): Promise<void> {
  console.log("Starting REFRESH scrape (re-scrapes pages 1-5 regardless of existing)...");
  let total = 0;
  for (let page = 1; page <= INCREMENTAL_PAGES; page++) {
    const bills = await scrapeBillList(page);
    if (bills.length === 0) break;
    for (const bill of bills) {
      await scrapeAndSave(bill.id, bill.url, bill.title, bill.registrationDate, bill.status);
      total++;
    }
    console.log(`Refreshed page ${page}, total: ${total}`);
  }
  console.log(`Refresh complete. Updated: ${total}`);
}

async function runSample(): Promise<void> {
  console.log("Starting SAMPLE scrape (3 bills, no Firestore write)...");
  const bills = await scrapeBillList(1);
  const sample = bills.slice(0, 3);
  for (const bill of sample) {
    const detail = await scrapeBillDetail(bill.id);
    console.log("\n--- BILL ---");
    console.log(JSON.stringify({ ...bill, ...detail }, null, 2));
  }
  console.log("\nSample done. Nothing written to Firestore.");
}

async function main(): Promise<void> {
  console.log(`Mode: ${mode}`);

  try {
    if (mode === "stats") {
      await computeAndWriteStats();
    } else if (mode === "parallel-full") {
      await runParallelScrape("full");
    } else if (mode === "parallel-incremental") {
      await runParallelScrape("incremental");
    } else if (mode === "full") {
      await runFull();
    } else if (mode === "refresh") {
      await runRefresh();
    } else if (mode === "sample") {
      await runSample();
    } else {
      await runIncremental();
    }
  } catch (err) {
    console.error("Scrape failed:", err);
    process.exit(1);
  }
}

main();
