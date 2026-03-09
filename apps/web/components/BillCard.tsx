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
}

export function BillCard({ bill }: BillCardProps) {
  const primaryAuthors = (bill.authors || []).slice(0, 3);
  const extraAuthors = (bill.authors || []).length - primaryAuthors.length;

  return (
    <div className="card p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs text-gray-400 font-mono">№{bill.id}</span>
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
