/**
 * Computes and writes pre-aggregated statistics to Firestore.
 * Called at the end of each scrape run so the web app just reads one doc.
 *
 * Firestore path: stats/global
 */
import * as admin from "firebase-admin";
import { getAdminFirestore } from "@prb/shared";

interface DayActivity {
  [date: string]: number; // "YYYY-MM-DD" -> count
}

interface AuthorStat {
  name: string;
  type: string;
  count: number;
}

export interface GlobalStats {
  totalBills: number;
  statusCounts: Record<string, number>;
  topAuthors: AuthorStat[];
  activityByDay: DayActivity;
  computedAt: admin.firestore.Timestamp;
}

export async function computeAndWriteStats(): Promise<void> {
  const db = getAdminFirestore();
  console.log("Computing global stats...");

  // Fetch all bills (server-side, no limit needed here)
  const snap = await db.collection("bills").get();
  const totalBills = snap.size;

  const statusCounts: Record<string, number> = {};
  const authorMap: Record<string, { type: string; count: number }> = {};
  const activityByDay: DayActivity = {};

  snap.docs.forEach((doc) => {
    const data = doc.data();

    // Status
    const status = data.status || "Неизвестно";
    statusCounts[status] = (statusCounts[status] || 0) + 1;

    // Authors
    (data.authors || []).forEach((a: { name: string; type: string }) => {
      if (!authorMap[a.name]) authorMap[a.name] = { type: a.type, count: 0 };
      authorMap[a.name].count++;
    });

    // Activity by day (past 365 days only to keep the doc small)
    const cutoff = Date.now() - 365 * 24 * 60 * 60 * 1000;
    const ts = data.registrationDate;
    let date: Date | null = null;
    if (ts instanceof admin.firestore.Timestamp) date = ts.toDate();
    else if (ts instanceof Date) date = ts;
    if (date && date.getTime() >= cutoff) {
      const key = date.toISOString().slice(0, 10);
      activityByDay[key] = (activityByDay[key] || 0) + 1;
    }
  });

  // Top 30 authors
  const topAuthors: AuthorStat[] = Object.entries(authorMap)
    .map(([name, { type, count }]) => ({ name, type, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 30);

  const stats: GlobalStats = {
    totalBills,
    statusCounts,
    topAuthors,
    activityByDay,
    computedAt: admin.firestore.Timestamp.now(),
  };

  await db.collection("stats").doc("global").set(stats);
  console.log(`Stats written: ${totalBills} bills, ${Object.keys(activityByDay).length} active days`);
}
