import { getAdminFirestore } from "@prb/shared";
import type { Bill } from "@prb/shared";
import * as admin from "firebase-admin";

export async function upsertBill(bill: Partial<Bill>): Promise<void> {
  const db = getAdminFirestore();
  const ref = db.collection("bills").doc(bill.id!);

  const now = admin.firestore.Timestamp.now();

  // Parse date strings to Timestamps
  function toTimestamp(
    value: unknown
  ): admin.firestore.Timestamp {
    if (!value) return now;
    if (value instanceof admin.firestore.Timestamp) return value;
    if (value instanceof Date) return admin.firestore.Timestamp.fromDate(value);
    if (typeof value === "string") {
      const parts = value.match(/(\d{2})\.(\d{2})\.(\d{4})/);
      if (parts) {
        const d = new Date(`${parts[3]}-${parts[2]}-${parts[1]}`);
        return admin.firestore.Timestamp.fromDate(d);
      }
      const d = new Date(value);
      if (!isNaN(d.getTime())) return admin.firestore.Timestamp.fromDate(d);
    }
    return now;
  }

  const data: Record<string, unknown> = {
    ...bill,
    registrationDate: toTimestamp(bill.registrationDate),
    scrapedAt: toTimestamp(bill.scrapedAt),
    updatedAt: now,
  };

  if (bill.lastEvent) {
    data.lastEvent = {
      ...bill.lastEvent,
      date: toTimestamp(bill.lastEvent.date),
    };
  }

  await ref.set(data, { merge: true });
  console.log(`  Upserted bill ${bill.id}`);
}

export async function billExists(billId: string): Promise<boolean> {
  const db = getAdminFirestore();
  const doc = await db.collection("bills").doc(billId).get();
  return doc.exists;
}
