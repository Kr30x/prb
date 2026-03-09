"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import type { Bill } from "@prb/shared";
import { getBillsByAuthor } from "@/lib/bills";
import { BillCard } from "@/components/BillCard";
import { ActivityCalendar } from "@/components/ActivityCalendar";

function parseDateRu(dateStr: string): string | null {
  // "дд.мм.гггг" → "YYYY-MM-DD"
  const parts = String(dateStr).split(".");
  if (parts.length !== 3) return null;
  const [d, m, y] = parts;
  if (!y || y.length !== 4) return null;
  return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
}

function billsToActivityMap(bills: Bill[]): Record<string, number> {
  const counts: Record<string, number> = {};
  bills.forEach((b) => {
    const key = parseDateRu(String(b.registrationDate));
    if (!key) return;
    counts[key] = (counts[key] || 0) + 1;
  });
  return counts;
}

export default function AuthorPage() {
  const { name } = useParams<{ name: string }>();
  const decodedName = decodeURIComponent(name);
  const [bills, setBills] = useState<Bill[]>([]);
  const [activityData, setActivityData] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const result = await getBillsByAuthor(decodedName);
        if (cancelled) return;
        setBills(result);
        setActivityData(billsToActivityMap(result));
      } catch (err) {
        console.error(err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [decodedName]);

  const acceptedCount = bills.filter(
    (b) => b.status === "Принят" || b.status === "Подписан Президентом"
  ).length;
  const rejectedCount = bills.filter((b) => b.status === "Отклонён").length;
  const pendingCount = bills.filter((b) => b.status === "На рассмотрении").length;

  return (
    <div className="max-w-4xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
        <Link href="/" className="hover:text-gray-700">Законопроекты</Link>
        <span>/</span>
        <span className="text-gray-700">{decodedName}</span>
      </div>

      {/* Header */}
      <h1 className="text-xl font-bold text-gray-900 mb-1">{decodedName}</h1>
      <p className="text-sm text-gray-500 mb-5">
        {loading ? "Загрузка..." : `${bills.length} законопроектов`}
      </p>

      {/* Stat cards */}
      {!loading && bills.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <div className="card p-4 text-center">
            <div className="text-2xl font-bold text-gray-900">{bills.length}</div>
            <div className="text-xs text-gray-500 mt-1">Всего</div>
          </div>
          <div className="card p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{pendingCount}</div>
            <div className="text-xs text-gray-500 mt-1">На рассмотрении</div>
          </div>
          <div className="card p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{acceptedCount}</div>
            <div className="text-xs text-gray-500 mt-1">Принято</div>
          </div>
          <div className="card p-4 text-center">
            <div className="text-2xl font-bold text-red-500">{rejectedCount}</div>
            <div className="text-xs text-gray-500 mt-1">Отклонено</div>
          </div>
        </div>
      )}

      {/* Activity calendar */}
      <div className="card p-5 mb-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">
          Активность (последний год)
        </h2>
        <ActivityCalendar data={activityData} isLoading={loading} />
      </div>

      {/* Bills list */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="card p-5 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
              <div className="h-3 bg-gray-100 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : bills.length === 0 ? (
        <div className="card p-8 text-center text-gray-500">
          Законопроекты не найдены
        </div>
      ) : (
        <div className="space-y-3">
          {bills.map((bill) => (
            <BillCard key={bill.id} bill={bill} />
          ))}
        </div>
      )}
    </div>
  );
}
