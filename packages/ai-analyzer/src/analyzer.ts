import Anthropic from "@anthropic-ai/sdk";
import { getAdminFirestore } from "@prb/shared";
import type { BillAnalysis } from "@prb/shared";
import * as admin from "firebase-admin";
import { ANALYSIS_PROMPT, MODEL, MAX_TOKENS, MAX_TEXT_LENGTH } from "./prompts";

function buildPrompt(pdfText: string): string {
  return ANALYSIS_PROMPT.replace("{pdfText}", pdfText.slice(0, MAX_TEXT_LENGTH));
}

export async function analyzeBill(
  billId: string,
  pdfText: string,
  pdfUrl: string
): Promise<void> {
  const db = getAdminFirestore();
  const ref = db.collection("billAnalysis").doc(billId);

  await ref.set({
    billId,
    status: "pending",
    pdfUrl,
    analyzedAt: admin.firestore.Timestamp.now(),
    aiModel: MODEL,
  } satisfies Partial<BillAnalysis>, { merge: true });

  const client = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
    baseURL: process.env.ANTHROPIC_BASE_URL,
  });

  console.log(`Analyzing bill ${billId} with ${MODEL}...`);

  try {
    const message = await client.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      messages: [{ role: "user", content: buildPrompt(pdfText) }],
    });

    const responseText =
      message.content[0].type === "text" ? message.content[0].text : "";

    let parsed: {
      summary: string;
      keyChanges: string[];
      affectedLaws: BillAnalysis["affectedLaws"];
      importance: number;
      importanceReason: string;
    };

    try {
      const clean = responseText
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/\s*```$/i, "")
        .trim();
      parsed = JSON.parse(clean);
    } catch {
      console.error("Failed to parse AI response as JSON:", responseText.slice(0, 200));
      parsed = {
        summary: responseText,
        keyChanges: [],
        affectedLaws: [],
        importance: 3,
        importanceReason: "Не удалось разобрать ответ AI",
      };
    }

    // Clamp importance to 1–5
    const importance = Math.max(1, Math.min(5, Math.round(parsed.importance || 3)));

    const analysis: BillAnalysis = {
      billId,
      summary: parsed.summary || "",
      keyChanges: parsed.keyChanges || [],
      affectedLaws: parsed.affectedLaws || [],
      importance,
      importanceReason: parsed.importanceReason || "",
      rawText: pdfText.slice(0, 50000),
      pdfUrl,
      aiModel: MODEL,
      analyzedAt: admin.firestore.Timestamp.now(),
      status: "done",
    };

    await ref.set(analysis);
    console.log(`  ✓ Bill ${billId} — importance: ${"★".repeat(importance)}${"☆".repeat(5 - importance)} — ${parsed.importanceReason}`);
  } catch (err) {
    console.error(`Analysis failed for bill ${billId}:`, err);
    await ref.set({
      billId,
      status: "failed",
      pdfUrl,
      aiModel: MODEL,
      analyzedAt: admin.firestore.Timestamp.now(),
      summary: "",
      keyChanges: [],
      affectedLaws: [],
      importance: 0,
      importanceReason: "",
      rawText: "",
    } satisfies BillAnalysis);
    throw err;
  }
}
