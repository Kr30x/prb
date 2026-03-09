"use client";

import { useState } from "react";
import type { BillAnalysis } from "@prb/shared";

interface AiSummaryProps {
  analysis: BillAnalysis | null;
}

export function AiSummary({ analysis }: AiSummaryProps) {
  const [expanded, setExpanded] = useState(false);

  if (!analysis) {
    return (
      <div className="card p-5 border-dashed">
        <div className="flex items-center gap-2 text-gray-400">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
          </svg>
          <span className="text-sm">AI-анализ не проведён</span>
        </div>
        <p className="text-xs text-gray-400 mt-1">
          Запустите: <code className="font-mono">npm run analyze -- --billId={"{id}"}</code>
        </p>
      </div>
    );
  }

  if (analysis.status === "pending") {
    return (
      <div className="card p-5">
        <div className="flex items-center gap-2 text-blue-600">
          <div className="animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full" />
          <span className="text-sm">Анализ выполняется...</span>
        </div>
      </div>
    );
  }

  if (analysis.status === "failed") {
    return (
      <div className="card p-5 border-red-200 bg-red-50">
        <p className="text-sm text-red-600">Ошибка при анализе законопроекта</p>
      </div>
    );
  }

  return (
    <div className="card overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <svg className="h-4 w-4 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
          </svg>
          <span className="text-sm font-medium text-gray-900">AI-анализ</span>
          <span className="text-xs text-gray-400">{analysis.aiModel}</span>
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-xs text-blue-600 hover:text-blue-800"
        >
          {expanded ? "Свернуть" : "Развернуть"}
        </button>
      </div>

      <div className="px-5 py-4">
        {/* Summary */}
        <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
          {analysis.summary}
        </div>

        {/* Expanded content */}
        {expanded && (
          <>
            {/* Key changes */}
            {analysis.keyChanges && analysis.keyChanges.length > 0 && (
              <div className="mt-5">
                <h4 className="text-sm font-medium text-gray-900 mb-2">
                  Ключевые изменения
                </h4>
                <ul className="space-y-1.5">
                  {analysis.keyChanges.map((change, i) => (
                    <li key={i} className="flex gap-2 text-sm text-gray-700">
                      <span className="text-blue-500 flex-shrink-0 mt-0.5">•</span>
                      <span>{change}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Affected laws */}
            {analysis.affectedLaws && analysis.affectedLaws.length > 0 && (
              <div className="mt-5">
                <h4 className="text-sm font-medium text-gray-900 mb-2">
                  Затронутые законы
                </h4>
                <div className="space-y-3">
                  {analysis.affectedLaws.map((law, i) => (
                    <div key={i} className="bg-gray-50 rounded-md p-3">
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-sm font-medium text-gray-900">
                          {law.name}
                        </span>
                        {law.articles && law.articles.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {law.articles.map((art, j) => (
                              <span
                                key={j}
                                className="text-xs bg-blue-100 text-blue-700 rounded px-1.5 py-0.5"
                              >
                                {art}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      {law.description && (
                        <p className="text-xs text-gray-600 mt-1">
                          {law.description}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
