import Link from "next/link";
import type { Bill } from "@prb/shared";
import { StatusBadge } from "./StatusBadge";

const AUTHOR_TYPE_LABEL: Record<string, string> = {
  deputy: "Депутат",
  senator: "Сенатор",
  government: "Правительство",
  other: "Иной",
};

interface BillCardProps {
  bill: Bill;
  hasAnalysis?: boolean;
}

export function BillCard({ bill, hasAnalysis }: BillCardProps) {
  const primaryAuthors = (bill.authors || []).slice(0, 3);
  const extraAuthors = (bill.authors || []).length - primaryAuthors.length;

  return (
    <div className="card p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs text-gray-400 font-mono">№{bill.id}</span>
            {hasAnalysis && (
              <span title="Есть AI-анализ" className="inline-flex items-center gap-0.5 text-[10px] font-medium bg-purple-100 text-purple-700 rounded-full px-1.5 py-0.5">
                <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                </svg>
                AI
              </span>
            )}
            {bill.registrationDate && (
              <span className="text-xs text-gray-400">
                {String(bill.registrationDate)}
              </span>
            )}
          </div>
          <Link
            href={`/bills/${bill.id}`}
            className="text-sm font-medium text-gray-900 hover:text-blue-700 line-clamp-2"
          >
            {bill.title}
          </Link>

          {primaryAuthors.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {primaryAuthors.map((author, i) => (
                <Link
                  key={i}
                  href={`/authors/${encodeURIComponent(author.name)}`}
                  className="inline-flex items-center gap-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded px-2 py-0.5"
                >
                  <span className="text-gray-400">
                    {AUTHOR_TYPE_LABEL[author.type] || author.type}
                  </span>
                  {author.name}
                </Link>
              ))}
              {extraAuthors > 0 && (
                <span className="text-xs text-gray-400 px-2 py-0.5">
                  +{extraAuthors}
                </span>
              )}
            </div>
          )}

          {bill.committees && bill.committees.length > 0 && (
            <div className="mt-1.5 text-xs text-gray-500 truncate">
              {bill.committees[0]}
            </div>
          )}
        </div>

        <div className="flex-shrink-0">
          <StatusBadge status={bill.status} />
        </div>
      </div>
    </div>
  );
}
