import Anthropic from "@anthropic-ai/sdk";
import { getAdminFirestore } from "@prb/shared";
import type { BillAnalysis } from "@prb/shared";
import * as admin from "firebase-admin";

const MODEL = "claude-sonnet-4-6";
const MAX_TEXT_LENGTH = 100000; // ~100k chars to stay within context

function buildPrompt(pdfText: string): string {
  const truncated = pdfText.slice(0, MAX_TEXT_LENGTH);

  return `Ты — юридический аналитик. Проанализируй текст российского законопроекта и предоставь структурированный анализ.

ТЕКСТ ЗАКОНОПРОЕКТА:
${truncated}

Предоставь анализ в следующем JSON формате (только JSON, без markdown-блоков):
{
  "summary": "Краткое изложение законопроекта на понятном языке (2-3 абзаца). Объясни суть изменений, цели и кто затронут.",
  "keyChanges": [
    "Ключевое изменение 1",
    "Ключевое изменение 2",
    "Ключевое изменение 3"
  ],
  "affectedLaws": [
    {
      "name": "Название закона (например: Трудовой кодекс РФ)",
      "articles": ["ст. 123", "ст. 124"],
      "description": "Краткое описание изменений в данном законе"
    }
  ]
}

Требования:
- Пиши на русском языке
- Summary должен быть понятен обычному гражданину, без юридического жаргона
- keyChanges — список конкретных изменений (от 3 до 10 пунктов)
- affectedLaws — только те законы, которые явно упомянуты в тексте
- Если текст не является законопроектом или не читается, верни summary с объяснением проблемы и пустые массивы`;
}

export async function analyzeBill(
  billId: string,
  pdfText: string,
  pdfUrl: string
): Promise<void> {
  const db = getAdminFirestore();
  const ref = db.collection("billAnalysis").doc(billId);

  // Mark as pending
  await ref.set({
    billId,
    status: "pending",
    pdfUrl,
    analyzedAt: admin.firestore.Timestamp.now(),
    aiModel: MODEL,
  } satisfies Partial<BillAnalysis>, { merge: true });

  const client = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  console.log(`Analyzing bill ${billId} with ${MODEL}...`);

  try {
    const message = await client.messages.create({
      model: MODEL,
      max_tokens: 4096,
      messages: [
        {
          role: "user",
          content: buildPrompt(pdfText),
        },
      ],
    });

    const responseText =
      message.content[0].type === "text" ? message.content[0].text : "";

    // Parse JSON response
    let parsed: { summary: string; keyChanges: string[]; affectedLaws: BillAnalysis["affectedLaws"] };
    try {
      // Strip markdown code blocks if present
      const clean = responseText
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/\s*```$/i, "")
        .trim();
      parsed = JSON.parse(clean);
    } catch {
      console.error("Failed to parse AI response as JSON:", responseText);
      parsed = {
        summary: responseText,
        keyChanges: [],
        affectedLaws: [],
      };
    }

    const analysis: BillAnalysis = {
      billId,
      summary: parsed.summary || "",
      keyChanges: parsed.keyChanges || [],
      affectedLaws: parsed.affectedLaws || [],
      rawText: pdfText.slice(0, 50000), // store first 50k chars
      pdfUrl,
      aiModel: MODEL,
      analyzedAt: admin.firestore.Timestamp.now(),
      status: "done",
    };

    await ref.set(analysis);
    console.log(`  Analysis saved for bill ${billId}`);
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
      rawText: "",
    } satisfies BillAnalysis);
    throw err;
  }
}
