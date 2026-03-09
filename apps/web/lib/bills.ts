import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  DocumentSnapshot,
  QueryConstraint,
  Timestamp,
} from "firebase/firestore";
import { db } from "./firebase";
import type { Bill, BillAnalysis, BillFilters } from "@prb/shared";

const PAGE_SIZE = 20;

export interface BillsPage {
  bills: Bill[];
  lastDoc: DocumentSnapshot | null;
  hasMore: boolean;
}

export interface StatusStats {
  status: string;
  count: number;
}

function timestampToString(value: unknown): string {
  if (!value) return "";
  if (value instanceof Timestamp) return value.toDate().toLocaleDateString("ru-RU");
  if (value instanceof Date) return value.toLocaleDateString("ru-RU");
  return String(value);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeBill(id: string, data: any): Bill {
  return {
    ...data,
    id,
    registrationDate: timestampToString(data.registrationDate),
    scrapedAt: timestampToString(data.scrapedAt),
    updatedAt: timestampToString(data.updatedAt),
    lastEvent: data.lastEvent
      ? {
          ...data.lastEvent,
          date: timestampToString(data.lastEvent.date),
        }
      : { stage: "", date: "" },
  } as Bill;
}

export async function getBills(
  filters: BillFilters = {},
  pageSize = PAGE_SIZE,
  afterDoc?: DocumentSnapshot
): Promise<BillsPage> {
  const constraints: QueryConstraint[] = [];

  if (filters.status) {
    constraints.push(where("status", "==", filters.status));
  }

  if (filters.convocation) {
    constraints.push(where("convocation", "==", filters.convocation));
  }

  constraints.push(orderBy("registrationDate", "desc"));
  constraints.push(limit(pageSize + 1));

  if (afterDoc) {
    constraints.push(startAfter(afterDoc));
  }

  const q = query(collection(db, "bills"), ...constraints);
  const snap = await getDocs(q);

  const hasMore = snap.docs.length > pageSize;
  const docs = hasMore ? snap.docs.slice(0, pageSize) : snap.docs;

  const bills = docs.map((d) => normalizeBill(d.id, d.data()));

  // Client-side filter for search (Firestore doesn't support full-text)
  const filtered = filters.search
    ? bills.filter((b) =>
        b.title.toLowerCase().includes(filters.search!.toLowerCase()) ||
        b.id.includes(filters.search!)
      )
    : bills;

  return {
    bills: filtered,
    lastDoc: docs[docs.length - 1] ?? null,
    hasMore,
  };
}

export async function getBill(id: string): Promise<Bill | null> {
  const snap = await getDoc(doc(db, "bills", id));
  if (!snap.exists()) return null;
  return normalizeBill(snap.id, snap.data());
}

export async function getBillAnalysis(id: string): Promise<BillAnalysis | null> {
  const snap = await getDoc(doc(db, "billAnalysis", id));
  if (!snap.exists()) return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data = snap.data() as any;
  return {
    ...data,
    analyzedAt: timestampToString(data.analyzedAt),
  } as BillAnalysis;
}

export async function getStatsByStatus(): Promise<StatusStats[]> {
  const snap = await getDocs(query(collection(db, "bills"), limit(1000)));
  const counts: Record<string, number> = {};

  snap.docs.forEach((d) => {
    const status = d.data().status || "Неизвестно";
    counts[status] = (counts[status] || 0) + 1;
  });

  return Object.entries(counts)
    .map(([status, count]) => ({ status, count }))
    .sort((a, b) => b.count - a.count);
}

export async function getBillsByAuthor(authorName: string): Promise<Bill[]> {
  // Firestore doesn't support array contains on nested objects directly,
  // so we fetch recent bills and filter client-side
  const snap = await getDocs(
    query(collection(db, "bills"), orderBy("registrationDate", "desc"), limit(500))
  );

  return snap.docs
    .map((d) => normalizeBill(d.id, d.data()))
    .filter((b) =>
      b.authors?.some((a) =>
        a.name.toLowerCase().includes(authorName.toLowerCase())
      )
    );
}

export async function getTopAuthors(
  topN = 20
): Promise<Array<{ name: string; count: number; type: string }>> {
  const snap = await getDocs(
    query(collection(db, "bills"), orderBy("registrationDate", "desc"), limit(1000))
  );

  const authorMap: Record<string, { count: number; type: string }> = {};

  snap.docs.forEach((d) => {
    const bill = d.data();
    (bill.authors || []).forEach(
      (a: { name: string; type: string }) => {
        if (!authorMap[a.name]) {
          authorMap[a.name] = { count: 0, type: a.type };
        }
        authorMap[a.name].count++;
      }
    );
  });

  return Object.entries(authorMap)
    .map(([name, { count, type }]) => ({ name, count, type }))
    .sort((a, b) => b.count - a.count)
    .slice(0, topN);
}
