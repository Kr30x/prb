"use client";

import { useEffect, useState } from "react";
import { getStatsByStatus, getTopAuthors } from "@/lib/bills";
import type { StatusStats } from "@/lib/bills";
import { StatusBarChart, StatusPieChart, AuthorBarChart } from "@/components/StatsChart";

export default function StatsPage() {
  const [statusStats, setStatusStats] = useState<StatusStats[]>([]);
  const [topAuthors, setTopAuthors] = useState<
    Array<{ name: string; count: number; type: string }>
  >([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [stats, authors] = await Promise.all([
          getStatsByStatus(),
          getTopAuthors(20),
        ]);
        setStatusStats(stats);
        setTopAuthors(authors);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

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
          <div className="text-3xl font-bold text-gray-900">{totalBills}</div>
          <div className="text-sm text-gray-500 mt-1">Всего законопроектов</div>
        </div>
        {statusStats.slice(0, 3).map((s) => (
          <div key={s.status} className="card p-4 text-center">
            <div className="text-3xl font-bold text-gray-900">{s.count}</div>
            <div className="text-sm text-gray-500 mt-1">{s.status}</div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="card p-5">
          <h2 className="text-base font-semibold text-gray-900 mb-4">
            По статусу (диаграмма)
          </h2>
          <StatusPieChart data={statusStats} />
        </div>

        <div className="card p-5">
          <h2 className="text-base font-semibold text-gray-900 mb-4">
            По статусу (гистограмма)
          </h2>
          <StatusBarChart data={statusStats} />
        </div>
      </div>

      {/* Top authors */}
      {topAuthors.length > 0 && (
        <div className="card p-5">
          <h2 className="text-base font-semibold text-gray-900 mb-4">
            Топ авторов (по числу законопроектов)
          </h2>
          <AuthorBarChart data={topAuthors} />
        </div>
      )}
    </div>
  );
}
