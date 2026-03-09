import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

import { extractPdfText } from "./pdf-extractor";
import { analyzeBill } from "./analyzer";
import { getAdminFirestore } from "@prb/shared";

const args = process.argv.slice(2);
const billIdArg = args.find((a) => a.startsWith("--billId="));
const modeArg = args.find((a) => a.startsWith("--mode="));
const billId = billIdArg?.split("=")[1];
const mode = modeArg?.split("=")[1];

async function analyzeOneBill(id: string): Promise<void> {
  const db = getAdminFirestore();
  const billDoc = await db.collection("bills").doc(id).get();

  if (!billDoc.exists) {
    throw new Error(`Bill ${id} not found in Firestore`);
  }

  const billData = billDoc.data()!;
  const documents: Array<{ type: string; url: string; name: string }> =
    billData.documents || [];

  // Find the main bill text PDF
  const pdfDoc =
    documents.find((d) =>
      d.type?.toLowerCase().includes("текст законопроекта")
    ) ||
    documents.find((d) => d.url?.toLowerCase().endsWith(".pdf")) ||
    documents[0];

  if (!pdfDoc || !pdfDoc.url) {
    throw new Error(`No PDF document found for bill ${id}`);
  }

  console.log(`Extracting PDF text from: ${pdfDoc.url}`);
  const pdfText = await extractPdfText(pdfDoc.url);
  console.log(`Extracted ${pdfText.length} characters`);

  await analyzeBill(id, pdfText, pdfDoc.url);
}

async function runQueue(): Promise<void> {
  const db = getAdminFirestore();

  // Get all bills without analysis
  const billsSnap = await db.collection("bills").limit(50).get();

  let processed = 0;
  for (const doc of billsSnap.docs) {
    const id = doc.id;

    // Check if analysis already exists
    const analysisDoc = await db.collection("billAnalysis").doc(id).get();
    if (analysisDoc.exists && analysisDoc.data()?.status === "done") {
      console.log(`Skipping ${id} — already analyzed`);
      continue;
    }

    try {
      await analyzeOneBill(id);
      processed++;
    } catch (err) {
      console.error(`Failed to analyze ${id}:`, err);
    }
  }

  console.log(`Queue processing complete. Analyzed: ${processed}`);
}

async function main(): Promise<void> {
  if (billId) {
    console.log(`Analyzing bill: ${billId}`);
    await analyzeOneBill(billId);
  } else if (mode === "queue") {
    console.log("Processing analysis queue...");
    await runQueue();
  } else {
    console.error("Usage: --billId=<id> or --mode=queue");
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
