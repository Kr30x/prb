"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import type { Bill, BillAnalysis } from "@prb/shared";
import { getBill, getBillAnalysis } from "@/lib/bills";
import { StatusBadge } from "@/components/StatusBadge";
import { AiSummary } from "@/components/AiSummary";
import { StagesProgress } from "@/components/StagesProgress";
import { EventsTimeline } from "@/components/EventsTimeline";

const AUTHOR_TYPE_LABEL: Record<string, string> = {
  deputy: "Депутат ГД",
  senator: "Сенатор СФ",
  government: "Правительство",
  other: "Иной субъект",
};

export default function BillDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [bill, setBill] = useState<Bill | null>(null);
  const [analysis, setAnalysis] = useState<BillAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [b, a] = await Promise.all([getBill(id), getBillAnalysis(id)]);
        setBill(b);
        setAnalysis(a);
      } catch (err) {
        console.error(err);
        setError("Ошибка загрузки");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  if (loading) {
    return (
      <div className="animate-pulse space-y-4 max-w-5xl">
        <div className="h-4 bg-gray-200 rounded w-1/4" />
        <div className="h-8 bg-gray-200 rounded w-3/4" />
        <div className="h-32 bg-gray-100 rounded" />
        <div className="h-24 bg-gray-100 rounded" />
      </div>
    );
  }

  if (error || !bill) {
    return (
      <div className="card p-8 text-center">
        <p className="text-gray-500 mb-4">{error || "Законопроект не найден"}</p>
        <Link href="/" className="btn-primary text-sm">Назад к списку</Link>
      </div>
    );
  }

  const events = bill.events || [];

  return (
    <div className="max-w-5xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
        <Link href="/" className="hover:text-gray-700">Законопроекты</Link>
        <span>/</span>
        <span className="text-gray-700">№{bill.id}</span>
      </div>

      {/* Header */}
      <div className="mb-5">
        <div className="text-sm text-gray-400 mb-1">Законопроект</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-1">№ {bill.id}</h1>
        {bill.title && (
          <p className="text-base text-gray-700 mb-3">{bill.title}</p>
        )}
        <div className="flex items-center gap-3 flex-wrap">
          <StatusBadge status={bill.status} />
          {bill.registrationDate && (
            <span className="text-sm text-gray-500">
              Зарегистрирован: {String(bill.registrationDate)}
            </span>
          )}
          {bill.convocation && (
            <span className="text-sm text-gray-500">{bill.convocation}-й созыв</span>
          )}
        </div>
      </div>

      {/* Passport data table */}
      <div className="card mb-5 overflow-hidden">
        <div
          className="px-5 py-3 bg-gray-50 border-b border-gray-100 text-sm font-medium text-blue-700 cursor-pointer hover:bg-gray-100"
        >
          Паспортные данные
        </div>
        <table className="w-full text-sm">
          <tbody className="divide-y divide-gray-50">
            {/* Authors */}
            {bill.authors && bill.authors.length > 0 && (
              <tr>
                <td className="px-5 py-3 w-64 text-gray-500 align-top font-medium">
                  Субъект права законодательной инициативы
                </td>
                <td className="px-5 py-3 text-gray-900">
                  <div className="flex flex-wrap gap-1">
                    {bill.authors.map((a, i) => (
                      <Link
                        key={i}
                        href={`/authors/${encodeURIComponent(a.name)}`}
                        className="hover:text-blue-700"
                      >
                        {a.name}{i < bill.authors.length - 1 ? "," : ""}
                      </Link>
                    ))}
                  </div>
                  {bill.authors[0]?.role && (
                    <div className="text-xs text-gray-400 mt-0.5">
                      {AUTHOR_TYPE_LABEL[bill.authors[0].type] || bill.authors[0].role}
                    </div>
                  )}
                </td>
              </tr>
            )}

            {/* Law form */}
            {bill.lawForm && (
              <tr>
                <td className="px-5 py-3 w-64 text-gray-500 font-medium">Форма законопроекта</td>
                <td className="px-5 py-3 text-gray-900 font-medium">{bill.lawForm}</td>
              </tr>
            )}

            {/* Committee */}
            {bill.committees && bill.committees.length > 0 && (
              <tr>
                <td className="px-5 py-3 w-64 text-gray-500 font-medium">Профильный комитет</td>
                <td className="px-5 py-3 text-gray-900 font-medium">{bill.committees.join(", ")}</td>
              </tr>
            )}

            {/* Documents */}
            {bill.documents && bill.documents.length > 0 && (
              <tr className="bg-green-50">
                <td className="px-5 py-3 w-64 text-gray-500 font-medium align-top">
                  Пакет документов при внесении
                </td>
                <td className="px-5 py-3">
                  <div className="flex flex-wrap gap-3">
                    {bill.documents.map((doc, i) => (
                      <a
                        key={i}
                        href={doc.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-sm text-red-600 hover:text-red-800"
                      >
                        <svg className="h-7 w-7" viewBox="0 0 32 32" fill="none">
                          <rect width="32" height="32" rx="4" fill="#dc2626" />
                          <text x="50%" y="55%" dominantBaseline="middle" textAnchor="middle" fill="white" fontSize="9" fontWeight="bold">PDF</text>
                        </svg>
                        <span>{doc.name}</span>
                      </a>
                    ))}
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Stages progress bar */}
      <div className="mb-5">
        <StagesProgress events={events} status={bill.status} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          {/* Events timeline */}
          {events.length > 0 && <EventsTimeline events={events} />}

          {/* AI Summary */}
          <AiSummary analysis={analysis} />
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <a
            href={bill.url}
            target="_blank"
            rel="noopener noreferrer"
            className="card p-4 flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 hover:shadow-md transition-shadow block"
          >
            <svg className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            Открыть на сайте СОЗД
          </a>

          <div className="card p-4 text-xs text-gray-400 space-y-1">
            <div>Обновлено: {String(bill.updatedAt)}</div>
            <div>Спарсено: {String(bill.scrapedAt)}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
