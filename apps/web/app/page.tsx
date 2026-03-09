"use client";

import { useState, useEffect, useCallback } from "react";
import type { Bill, BillFilters } from "@prb/shared";
import { getBills, getAnalysisStatuses } from "@/lib/bills";
import type { DocumentSnapshot } from "@/lib/bills";
import { BillCard } from "@/components/BillCard";
import { SearchBar } from "@/components/SearchBar";
import { FilterPanel } from "@/components/FilterPanel";

const PAGE_SIZE = 20;

export default function BillsListPage() {
  const [bills, setBills] = useState<Bill[]>([]);
  const [analyzedIds, setAnalyzedIds] = useState<Set<string>>(new Set());
  const [filters, setFilters] = useState<BillFilters>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  // Pagination: store cursor for each page so we can go back
  const [page, setPage] = useState(1);
  const [pageCursors, setPageCursors] = useState<(DocumentSnapshot | null)[]>([null]); // index = page-1
  const [hasNext, setHasNext] = useState(false);

  const loadPage = useCallback(async (targetPage: number, cursors: (DocumentSnapshot | null)[]) => {
    setLoading(true);
    setError(null);
    try {
      const cursor = cursors[targetPage - 1] ?? undefined;
      const result = await getBills(filters, PAGE_SIZE, cursor);
      setBills(result.bills);
      setHasNext(result.hasMore);

      // Store cursor for the next page if we don't have it yet
      if (result.hasMore && result.lastDoc && !cursors[targetPage]) {
        setPageCursors((prev) => {
          const next = [...prev];
          next[targetPage] = result.lastDoc;
          return next;
        });
      }

      getAnalysisStatuses(result.bills.map((b) => b.id)).then(setAnalyzedIds);
    } catch (err) {
      console.error(err);
      setError("Ошибка загрузки данных. Проверьте настройки Firebase.");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1);
    setPageCursors([null]);
    loadPage(1, [null]);
  }, [filters]); // eslint-disable-line react-hooks/exhaustive-deps

  const goToPage = (newPage: number) => {
    setPage(newPage);
    loadPage(newPage, pageCursors);
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Законопроекты Государственной Думы
        </h1>
        <p className="text-sm text-gray-500 mt-1">Данные: sozd.duma.gov.ru</p>
      </div>

      <div className="flex gap-6">
        <div className="hidden lg:block w-64 flex-shrink-0">
          <FilterPanel filters={filters} onChange={setFilters} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex gap-2 mb-4">
            <div className="flex-1">
              <SearchBar
                value={filters.search || ""}
                onChange={(search) => setFilters((f) => ({ ...f, search }))}
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="lg:hidden btn-secondary flex items-center gap-1.5 text-sm"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              Фильтры
            </button>
          </div>

          {showFilters && (
            <div className="lg:hidden mb-4">
              <FilterPanel filters={filters} onChange={setFilters} />
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4 text-sm text-red-700">
              {error}
            </div>
          )}

          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="card p-5 animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
                  <div className="h-3 bg-gray-100 rounded w-1/2" />
                </div>
              ))}
            </div>
          ) : bills.length === 0 ? (
            <div className="card p-10 text-center text-gray-500">
              <p className="text-lg mb-1">Законопроекты не найдены</p>
              <p className="text-sm">Попробуйте изменить фильтры или запустите скрапер</p>
            </div>
          ) : (
            <>
              <div className="space-y-3">
                {bills.map((bill) => (
                  <BillCard key={bill.id} bill={bill} hasAnalysis={analyzedIds.has(bill.id)} />
                ))}
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between mt-6">
                <p className="text-xs text-gray-400">
                  Страница {page} · {PAGE_SIZE} записей
                </p>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => goToPage(page - 1)}
                    disabled={page === 1 || loading}
                    className="px-3 py-1.5 text-sm rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    ← Назад
                  </button>
                  <span className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-blue-50 border border-blue-200 rounded-md min-w-[2.5rem] text-center">
                    {page}
                  </span>
                  <button
                    onClick={() => goToPage(page + 1)}
                    disabled={!hasNext || loading}
                    className="px-3 py-1.5 text-sm rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Вперёд →
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
