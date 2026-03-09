import * as admin from "firebase-admin";
import { getAdminFirestore } from "@prb/shared";
import type { TgSubscription, StatusChange } from "@prb/shared";
import { Telegraf } from "telegraf";

const BASE_WEB_URL = process.env.WEB_URL || "http://localhost:3001";

export async function sendStatusChangeNotifications(
  bot: Telegraf,
  change: StatusChange
): Promise<void> {
  const db = getAdminFirestore();

  // Find all subscriptions that include this bill or its authors
  const billDoc = await db.collection("bills").doc(change.billId).get();
  const bill = billDoc.data();
  const authorNames: string[] = (bill?.authors || []).map((a: { name: string }) => a.name);

  const subsSnap = await db.collection("subscriptions").get();

  for (const doc of subsSnap.docs) {
    const sub = doc.data() as TgSubscription;
    const watchesBill = sub.billIds?.includes(change.billId);
    const watchesAuthor = sub.authorNames?.some((name) =>
      authorNames.some((a) => a.toLowerCase().includes(name.toLowerCase()))
    );

    if (!watchesBill && !watchesAuthor) continue;

    const reason = watchesBill
      ? `вы подписаны на законопроект №${change.billId}`
      : `вы подписаны на автора`;

    const msg =
      `🔔 *Изменение статуса законопроекта*\n\n` +
      `📋 *№${change.billId}*\n` +
      `${change.billTitle || ""}\n\n` +
      `${change.oldStatus} → *${change.newStatus}*\n\n` +
      `_${reason}_\n` +
      `[Открыть](${BASE_WEB_URL}/bills/${change.billId})`;

    try {
      await bot.telegram.sendMessage(sub.chatId, msg, { parse_mode: "Markdown" });
    } catch (err) {
      console.error(`Failed to notify chat ${sub.chatId}:`, err);
    }
  }
}

export async function saveSubscription(
  chatId: number,
  userId: number,
  username: string | undefined,
  update: { addBillId?: string; addAuthor?: string; removeBillId?: string; removeAuthor?: string }
): Promise<TgSubscription> {
  const db = getAdminFirestore();
  const ref = db.collection("subscriptions").doc(String(userId));
  const snap = await ref.get();
  const now = admin.firestore.Timestamp.now();

  const existing: TgSubscription = snap.exists
    ? (snap.data() as TgSubscription)
    : { chatId, userId, username, billIds: [], authorNames: [], createdAt: now, updatedAt: now };

  if (update.addBillId && !existing.billIds.includes(update.addBillId)) {
    existing.billIds.push(update.addBillId);
  }
  if (update.removeBillId) {
    existing.billIds = existing.billIds.filter((id) => id !== update.removeBillId);
  }
  if (update.addAuthor && !existing.authorNames.includes(update.addAuthor)) {
    existing.authorNames.push(update.addAuthor);
  }
  if (update.removeAuthor) {
    existing.authorNames = existing.authorNames.filter((n) => n !== update.removeAuthor);
  }

  existing.updatedAt = now;
  await ref.set(existing);
  return existing;
}

export async function getSubscription(userId: number): Promise<TgSubscription | null> {
  const db = getAdminFirestore();
  const snap = await db.collection("subscriptions").doc(String(userId)).get();
  return snap.exists ? (snap.data() as TgSubscription) : null;
}
