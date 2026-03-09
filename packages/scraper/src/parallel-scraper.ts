/**
 * Parallel scraper — Producer/Consumer architecture
 *
 * Producer:  fetches list pages sequentially, enqueues bill IDs
 * Consumers: CONCURRENCY workers process bill details in parallel
 *
 * Progress is checkpointed to /tmp/prb-scrape-progress.json
 * so large runs can be resumed after interruption.
 */
import * as fs from "fs";
import pLimit from "p-limit";
import { scrapeBillList, scrapeBillDetail } from "./scraper";
import { upsertBill, billExists } from "./firebase-writer";
import { computeAndWriteStats } from "./stats-writer";

const CONCURRENCY = 10;         // parallel detail workers
const LIST_DELAY_MS = 600;      // delay between list page fetches
const PROGRESS_FILE = "/tmp/prb-scrape-progress.json";

interface Progress {
  lastListPage: number;
  processedIds: string[];
  failedIds: string[];
  startedAt: string;
}

function loadProgress(): Progress | null {
  try {
    if (fs.existsSync(PROGRESS_FILE)) {
      return JSON.parse(fs.readFileSync(PROGRESS_FILE, "utf-8")) as Progress;
    }
  } catch { /* ignore */ }
  return null;
}

function saveProgress(p: Progress): void {
  fs.writeFileSync(PROGRESS_FILE, JSON.stringify(p, null, 2));
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function processBill(
  id: string,
  url: string,
  title: string,
  registrationDate: string,
  status: string,
  progress: Progress,
  mode: "full" | "incremental"
): Promise<void> {
  if (progress.processedIds.includes(id)) return;

  if (mode === "incremental") {
    const exists = await billExists(id);
    if (exists) {
      progress.processedIds.push(id);
      return;
    }
  }

  try {
    const detail = await scrapeBillDetail(id);
    await upsertBill({
      ...detail,
      id,
      url,
      title: detail.title || title,
      registrationDate: detail.registrationDate || registrationDate,
      status: detail.status || status,
    });
    progress.processedIds.push(id);
  } catch (err) {
    console.error(`  ✗ ${id}: ${(err as Error).message}`);
    progress.failedIds.push(id);
    // Still save basic info
    try {
      await upsertBill({
        id, url, title, registrationDate, status,
        authors: [], committees: [], convocation: 8,
        documents: [], events: [],
        lastEvent: { stage: "", date: new Date() },
        scrapedAt: new Date(), updatedAt: new Date(),
      });
    } catch { /* ignore */ }
  }
}

export async function runParallelScrape(mode: "full" | "incremental" = "full"): Promise<void> {
  const progress: Progress = loadProgress() || {
    lastListPage: 0,
    processedIds: [],
    failedIds: [],
    startedAt: new Date().toISOString(),
  };

  const startPage = progress.lastListPage + 1;
  const maxPages = mode === "full" ? 3000 : 5;

  console.log(`\n🚀 Parallel scrape (mode=${mode}, workers=${CONCURRENCY})`);
  console.log(`   Resuming from page ${startPage}, already processed: ${progress.processedIds.length}\n`);

  const limit = pLimit(CONCURRENCY);
  let totalNew = 0;
  let pagesDone = 0;
  let stopped = false;

  // Handle graceful shutdown
  process.on("SIGINT", () => {
    console.log("\n⚠  Interrupted — saving progress...");
    saveProgress(progress);
    process.exit(0);
  });

  for (let page = startPage; page <= startPage + maxPages - 1; page++) {
    const bills = await scrapeBillList(page);

    if (bills.length === 0) {
      console.log(`\nNo bills on page ${page} — reached end of data.`);
      break;
    }

    // In incremental mode: if all bills on this page already exist, stop
    if (mode === "incremental") {
      const existChecks = await Promise.all(bills.map((b) => billExists(b.id)));
      if (existChecks.every(Boolean)) {
        console.log(`Page ${page}: all bills already exist — stopping incremental scrape.`);
        stopped = true;
        break;
      }
    }

    // Queue all bills on this page for parallel processing
    const tasks = bills.map((bill) =>
      limit(() => processBill(bill.id, bill.url, bill.title, bill.registrationDate, bill.status, progress, mode))
    );

    await Promise.all(tasks);

    pagesDone++;
    totalNew = progress.processedIds.length;

    progress.lastListPage = page;
    saveProgress(progress);

    const rate = (totalNew / ((Date.now() - new Date(progress.startedAt).getTime()) / 1000)).toFixed(1);
    console.log(`  Page ${page} ✓  total=${totalNew}  failed=${progress.failedIds.length}  rate=${rate}/s`);

    if (mode === "full") await sleep(LIST_DELAY_MS);
  }

  if (!stopped) {
    // Reset checkpoint on clean completion
    fs.unlinkSync(PROGRESS_FILE);
  }

  console.log(`\n✅ Done. Processed: ${progress.processedIds.length}, Failed: ${progress.failedIds.length}`);
  if (progress.failedIds.length > 0) {
    console.log(`   Failed IDs: ${progress.failedIds.slice(0, 10).join(", ")}${progress.failedIds.length > 10 ? "..." : ""}`);
  }

  // Always recompute stats after a scrape run
  await computeAndWriteStats();
}
