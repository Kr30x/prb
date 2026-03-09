"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getStatsByStatus, getTopAuthors, getAnalyzedBillsCount, getBillActivityByDay, getBillsByDate } from "@/lib/bills";
import type { StatusStats } from "@/lib/bills";
import type { Bill } from "@prb/shared";
import { StatusBarChart, StatusPieChart } from "@/components/StatsChart";
import { ActivityCalendar } from "@/components/ActivityCalendar";
import { BillCard } from "@/components/BillCard";


const AUTHOR_TYPE_COLOR: Record<string, string> = {
  deputy:     "bg-blue-100 text-blue-700",
  senator:    "bg-purple-100 text-purple-700",
  government: "bg-amber-100 text-amber-700",
  other:      "bg-gray-100 text-gray-600",
};
const AUTHOR_TYPE_LABEL: Record<string, string> = {
  deputy: "Депутат", senator: "Сенатор", government: "Правительство", other: "Иной",
};

export default function StatsPage() {
  const [statusStats, setStatusStats] = useState<StatusStats[]>([]);
  const [topAuthors, setTopAuthors] = useState<Array<{ name: string; count: number; type: string }>>([]);
  const [analyzedCount, setAnalyzedCount] = useState<number>(0);
  const [activityData, setActivityData] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  // Day click state
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [dayBills, setDayBills] = useState<Bill[]>([]);
  const [dayLoading, setDayLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      const [stats, authors, analyzed, activity] = await Promise.allSettled([
        getStatsByStatus(),
        getTopAuthors(20),
        getAnalyzedBillsCount(),
        getBillActivityByDay(),
      ]);
      if (cancelled) return;
      if (stats.status === "fulfilled") setStatusStats(stats.value);
      else console.error("getStatsByStatus:", stats.reason);
      if (authors.status === "fulfilled") setTopAuthors(authors.value);
      else console.error("getTopAuthors:", authors.reason);
      if (analyzed.status === "fulfilled") setAnalyzedCount(analyzed.value);
      else console.error("getAnalyzedBillsCount:", analyzed.reason);
      if (activity.status === "fulfilled") setActivityData(activity.value);
      else console.error("getBillActivityByDay:", activity.reason);
      setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, []);

  async function handleDayClick(date: string) {
    setSelectedDate(date);
    setDayLoading(true);
    setDayBills([]);
    try {
      const bills = await getBillsByDate(date);
      setDayBills(bills);
    } catch (err) {
      console.error("getBillsByDate:", err);
    } finally {
      setDayLoading(false);
    }
  }

  function formatDateRu(iso: string) {
    const [y, m, d] = iso.split("-");
    return `${d}.${m}.${y}`;
  }

  const totalBills = statusStats.reduce((s, d) => s + d.count, 0);

  if (loading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-8 bg-gray-200 rounded w-1/4" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 bg-gray-200 rounded-lg" />
          ))}
        </div>
        <div className="h-32 bg-gray-100 rounded-lg" />
        <div className="h-80 bg-gray-100 rounded-lg" />
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Статистика</h1>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="card p-4 text-center">
          <div className="text-3xl font-bold text-gray-900">{totalBills.toLocaleString("ru")}</div>
          <div className="text-sm text-gray-500 mt-1">Всего законопроектов</div>
        </div>
        <div className="card p-4 text-center">
          <div className="text-3xl font-bold text-purple-700">{analyzedCount.toLocaleString("ru")}</div>
          <div className="flex items-center justify-center gap-1 mt-1">
            <svg className="w-3 h-3 text-purple-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
            </svg>
            <span className="text-sm text-gray-500">Проанализировано AI</span>
          </div>
        </div>
        {statusStats.slice(0, 2).map((s) => (
          <div key={s.status} className="card p-4 text-center">
            <div className="text-3xl font-bold text-gray-900">{s.count.toLocaleString("ru")}</div>
            <div className="text-sm text-gray-500 mt-1">{s.status || "Неизвестно"}</div>
          </div>
        ))}
      </div>

      {/* Activity calendar */}
      <div className="card p-5 mb-4">
        <h2 className="text-base font-semibold text-gray-900 mb-4">
          Активность регистрации законопроектов (последний год)
        </h2>
        <ActivityCalendar
          data={activityData}
          onDayClick={handleDayClick}
          selectedDate={selectedDate ?? undefined}
        />
      </div>

      {/* Day drill-down panel */}
      {selectedDate && (
        <div className="card p-5 mb-8 border-blue-200 bg-blue-50/30">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-900">
              Законопроекты за {formatDateRu(selectedDate)}
              {!dayLoading && <span className="text-gray-400 font-normal ml-2">({dayBills.length})</span>}
            </h3>
            <button onClick={() => setSelectedDate(null)} className="text-xs text-gray-400 hover:text-gray-600">
              ✕ Закрыть
            </button>
          </div>
          {dayLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-14 bg-gray-100 rounded animate-pulse" />
              ))}
            </div>
          ) : dayBills.length === 0 ? (
            <p className="text-sm text-gray-500">Нет данных за этот день</p>
          ) : (
            <div className="space-y-2">
              {dayBills.map((bill) => <BillCard key={bill.id} bill={bill} />)}
            </div>
          )}
        </div>
      )}

      {/* Status charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="card p-5">
          <h2 className="text-base font-semibold text-gray-900 mb-4">По статусу (диаграмма)</h2>
          <StatusPieChart data={statusStats} />
        </div>
        <div className="card p-5">
          <h2 className="text-base font-semibold text-gray-900 mb-4">По статусу (гистограмма)</h2>
          <StatusBarChart data={statusStats} />
        </div>
      </div>

      {/* Leaderboard */}
      {topAuthors.length > 0 && (
        <div className="card overflow-hidden mb-8">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="text-base font-semibold text-gray-900">Лидерборд авторов</h2>
          </div>
          <div className="divide-y divide-gray-50">
            {topAuthors.map((author, i) => (
              <Link
                key={author.name}
                href={`/authors/${encodeURIComponent(author.name)}`}
                className="flex items-center gap-4 px-5 py-3 hover:bg-gray-50 transition-colors"
              >
                {/* Rank */}
                <span className={`w-7 text-center text-sm font-bold flex-shrink-0 ${
                  i === 0 ? "text-yellow-500" : i === 1 ? "text-gray-400" : i === 2 ? "text-amber-600" : "text-gray-300"
                }`}>
                  {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}`}
                </span>

                {/* Name + type badge */}
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium text-gray-900 truncate block">{author.name}</span>
                </div>
                <span className={`text-[10px] font-medium rounded-full px-2 py-0.5 flex-shrink-0 ${AUTHOR_TYPE_COLOR[author.type] || "bg-gray-100 text-gray-600"}`}>
                  {AUTHOR_TYPE_LABEL[author.type] || author.type}
                </span>

                {/* Bar */}
                <div className="w-32 flex-shrink-0 hidden md:block">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                      <div
                        className="bg-blue-500 h-1.5 rounded-full"
                        style={{ width: `${(author.count / topAuthors[0].count) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-500 w-8 text-right">{author.count}</span>
                  </div>
                </div>

                <span className="text-xs text-gray-400 md:hidden">{author.count}</span>
                <svg className="h-4 w-4 text-gray-300 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
