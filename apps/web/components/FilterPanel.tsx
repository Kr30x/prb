"use client";

import type { BillFilters } from "@prb/shared";

const STATUSES = [
  "На рассмотрении",
  "Отклонён",
  "Принят",
  "Подписан Президентом",
  "Снят с рассмотрения",
  "Неизвестно",
];

const AUTHOR_TYPES = [
  { value: "deputy", label: "Депутат ГД" },
  { value: "senator", label: "Сенатор СФ" },
  { value: "government", label: "Правительство" },
  { value: "other", label: "Иной субъект" },
];

const CONVOCATIONS = [8, 7, 6, 5];

interface FilterPanelProps {
  filters: BillFilters;
  onChange: (filters: BillFilters) => void;
}

export function FilterPanel({ filters, onChange }: FilterPanelProps) {
  const set = (key: keyof BillFilters, value: unknown) => {
    onChange({ ...filters, [key]: value || undefined });
  };

  const hasFilters = filters.status || filters.authorType || filters.convocation;

  return (
    <div className="card p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-700">Фильтры</h3>
        {hasFilters && (
          <button
            onClick={() => onChange({})}
            className="text-xs text-blue-600 hover:text-blue-800"
          >
            Сбросить
          </button>
        )}
      </div>

      {/* Status */}
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1.5">
          Статус
        </label>
        <select
          value={filters.status || ""}
          onChange={(e) => set("status", e.target.value)}
          className="block w-full text-sm border border-gray-300 rounded-md py-1.5 px-2 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="">Все статусы</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      {/* Author type */}
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1.5">
          Тип автора
        </label>
        <select
          value={filters.authorType || ""}
          onChange={(e) =>
            set("authorType", e.target.value as BillFilters["authorType"])
          }
          className="block w-full text-sm border border-gray-300 rounded-md py-1.5 px-2 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="">Все авторы</option>
          {AUTHOR_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </div>

      {/* Convocation */}
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1.5">
          Созыв
        </label>
        <select
          value={filters.convocation || ""}
          onChange={(e) =>
            set("convocation", e.target.value ? parseInt(e.target.value) : undefined)
          }
          className="block w-full text-sm border border-gray-300 rounded-md py-1.5 px-2 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="">Все созывы</option>
          {CONVOCATIONS.map((c) => (
            <option key={c} value={c}>
              {c}-й созыв
            </option>
          ))}
        </select>
      </div>

      {/* Date range */}
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1.5">
          Дата регистрации
        </label>
        <div className="space-y-1.5">
          <input
            type="date"
            value={filters.dateFrom || ""}
            onChange={(e) => set("dateFrom", e.target.value)}
            placeholder="От"
            className="block w-full text-sm border border-gray-300 rounded-md py-1.5 px-2 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <input
            type="date"
            value={filters.dateTo || ""}
            onChange={(e) => set("dateTo", e.target.value)}
            placeholder="До"
            className="block w-full text-sm border border-gray-300 rounded-md py-1.5 px-2 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>
    </div>
  );
}
