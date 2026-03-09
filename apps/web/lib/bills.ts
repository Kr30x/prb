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
export { type DocumentSnapshot };
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

// Fetch which bill IDs from a given list have a completed AI analysis
export async function getAnalysisStatuses(billIds: string[]): Promise<Set<string>> {
  if (billIds.length === 0) return new Set();
  const results = await Promise.all(
    billIds.map((id) => getDoc(doc(db, "billAnalysis", id)))
  );
  const done = new Set<string>();
  results.forEach((snap) => {
    if (snap.exists() && snap.data()?.status === "done") done.add(snap.id);
  });
  return done;
}

export async function getBills(
  filters: BillFilters = {},
  pageSize = PAGE_SIZE,
  afterDoc?: DocumentSnapshot
): Promise<BillsPage> {
  const constraints: QueryConstraint[] = [];

  // "Неизвестно" is stored as empty string "" in Firestore
  const statusValue = filters.status === "Неизвестно" ? "" : filters.status;
  if (statusValue !== undefined) {
    constraints.push(where("status", "==", statusValue));
  }

  if (filters.convocation) {
    constraints.push(where("convocation", "==", filters.convocation));
  }

  constraints.push(orderBy("registrationDate", "desc"));
  constraints.push(limit(pageSize + 1));

  if (afterDoc) {
    constraints.push(startAfter(afterDoc));
  }

  console.log("[getBills] filters:", filters, "statusValue:", statusValue, "constraints:", constraints.length);
  const q = query(collection(db, "bills"), ...constraints);

  let snap;
  try {
    snap = await getDocs(q);
    console.log("[getBills] got", snap.docs.length, "docs");
  } catch (err: unknown) {
    // Composite index not ready — surface the Firestore console link
    const msg = err instanceof Error ? err.message : String(err);
    const linkMatch = msg.match(/https:\/\/console\.firebase\.google\.com[^\s]*/);
    if (linkMatch) {
      throw new Error(`Нужен Firestore индекс. Создайте по ссылке:\n${linkMatch[0]}`);
    }
    throw err;
  }

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

export interface GlobalStats {
  totalBills: number;
  statusCounts: Record<string, number>;
  topAuthors: Array<{ name: string; type: string; count: number }>;
  activityByDay: Record<string, number>;
  computedAt?: string;
}

export async function getGlobalStats(): Promise<GlobalStats | null> {
  const snap = await getDoc(doc(db, "stats", "global"));
  if (!snap.exists()) return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data = snap.data() as any;
  return {
    ...data,
    computedAt: timestampToString(data.computedAt),
  } as GlobalStats;
}

export async function getStatsByStatus(): Promise<StatusStats[]> {
  // Try cached stats first
  const cached = await getGlobalStats();
  if (cached) {
    return Object.entries(cached.statusCounts)
      .map(([status, count]) => ({ status, count }))
      .sort((a, b) => b.count - a.count);
  }
  // Fallback: live query
  const snap = await getDocs(query(collection(db, "bills"), limit(10000)));
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
  topN = 20,
): Promise<Array<{ name: string; count: number; type: string }>> {
  // Use cached stats if available
  const cached = await getGlobalStats();
  if (cached?.topAuthors) return cached.topAuthors.slice(0, topN);

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

export async function getAnalyzedBillsCount(): Promise<number> {
  const snap = await getDocs(
    query(collection(db, "billAnalysis"), where("status", "==", "done"), limit(10000))
  );
  return snap.size;
}

export async function getBillsByDate(date: string): Promise<Bill[]> {
  // date = "YYYY-MM-DD"
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);

  const snap = await getDocs(
    query(
      collection(db, "bills"),
      where("registrationDate", ">=", Timestamp.fromDate(start)),
      where("registrationDate", "<=", Timestamp.fromDate(end)),
      orderBy("registrationDate", "asc"),
      limit(100)
    )
  );
  return snap.docs.map((d) => normalizeBill(d.id, d.data()));
}

// Returns "YYYY-MM-DD" -> count for bills registered in the past 365 days.
// Pass authorName to filter to a specific author.
export async function getBillActivityByDay(
  authorName?: string,
): Promise<Record<string, number>> {
  // For global activity (no author filter) use cached stats
  if (!authorName) {
    const cached = await getGlobalStats();
    if (cached?.activityByDay) return cached.activityByDay;
  }
  const cutoff = new Date();
  cutoff.setFullYear(cutoff.getFullYear() - 1);

  const snap = await getDocs(
    query(
      collection(db, "bills"),
      where("registrationDate", ">=", Timestamp.fromDate(cutoff)),
      orderBy("registrationDate", "desc"),
      limit(2000)
    )
  );

  const counts: Record<string, number> = {};
  snap.docs.forEach((d) => {
    const data = d.data();
    if (authorName) {
      const match = (data.authors || []).some((a: { name: string }) =>
        a.name.toLowerCase().includes(authorName.toLowerCase())
      );
      if (!match) return;
    }
    const ts = data.registrationDate;
    let date: Date | null = null;
    if (ts instanceof Timestamp) date = ts.toDate();
    else if (ts instanceof Date) date = ts;
    if (!date) return;
    const key = date.toISOString().slice(0, 10);
    counts[key] = (counts[key] || 0) + 1;
  });

  return counts;
}
