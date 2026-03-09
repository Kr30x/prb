"use client";

import { useState, useEffect, useCallback } from "react";
import type { Bill, BillFilters } from "@prb/shared";
import { getBills } from "@/lib/bills";
import type { DocumentSnapshot } from "firebase/firestore";
import { BillCard } from "@/components/BillCard";
import { SearchBar } from "@/components/SearchBar";
import { FilterPanel } from "@/components/FilterPanel";

export default function BillsListPage() {
  const [bills, setBills] = useState<Bill[]>([]);
  const [filters, setFilters] = useState<BillFilters>({});
  const [loading, setLoading] = useState(false);
  const [lastDoc, setLastDoc] = useState<DocumentSnapshot | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const loadBills = useCallback(
    async (reset = true) => {
      setLoading(true);
      setError(null);
      try {
        const after = reset ? undefined : (lastDoc ?? undefined);
        const result = await getBills(filters, 20, after);
        setBills((prev) => (reset ? result.bills : [...prev, ...result.bills]));
        setLastDoc(result.lastDoc);
        setHasMore(result.hasMore);
      } catch (err) {
        console.error(err);
        setError("Ошибка загрузки данных. Проверьте настройки Firebase.");
      } finally {
        setLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [filters]
  );

  useEffect(() => {
    loadBills(true);
  }, [loadBills]);

  const handleFiltersChange = (newFilters: BillFilters) => {
    setFilters(newFilters);
  };

  const handleSearch = (search: string) => {
    setFilters((f) => ({ ...f, search }));
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Законопроекты Государственной Думы
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Данные: sozd.duma.gov.ru
        </p>
      </div>

      <div className="flex gap-6">
        {/* Filters sidebar (desktop) */}
        <div className="hidden lg:block w-64 flex-shrink-0">
          <FilterPanel filters={filters} onChange={handleFiltersChange} />
        </div>

        <div className="flex-1 min-w-0">
          {/* Search + filter toggle */}
          <div className="flex gap-2 mb-4">
            <div className="flex-1">
              <SearchBar
                value={filters.search || ""}
                onChange={handleSearch}
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

          {/* Mobile filters */}
          {showFilters && (
            <div className="lg:hidden mb-4">
              <FilterPanel filters={filters} onChange={handleFiltersChange} />
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Bills list */}
          {loading && bills.length === 0 ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="card p-5 animate-pulse"
                >
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
                  <BillCard key={bill.id} bill={bill} />
                ))}
              </div>

              {hasMore && (
                <div className="mt-6 text-center">
                  <button
                    onClick={() => loadBills(false)}
                    disabled={loading}
                    className="btn-secondary"
                  >
                    {loading ? "Загрузка..." : "Загрузить ещё"}
                  </button>
                </div>
              )}

              <p className="text-xs text-gray-400 mt-4 text-center">
                Показано {bills.length} законопроектов
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
