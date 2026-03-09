"use client";

import type { BillEvent } from "@prb/shared";

function formatDate(iso: string): { date: string; time: string } {
  if (!iso) return { date: "", time: "" };
  const d = new Date(iso);
  if (isNaN(d.getTime())) return { date: iso, time: "" };
  const date = d.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" });
  const time = d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
  return { date, time };
}

// Group events by their top-level stage number (e.g. "1.1", "1.2" → group 1)
function groupEvents(events: BillEvent[]): Array<{ groupNum: string; label: string; events: BillEvent[] }> {
  const STAGE_LABELS: Record<string, string> = {
    "1": "Внесение законопроекта в Государственную Думу",
    "2": "Предварительное рассмотрение",
    "3": "Рассмотрение в первом чтении",
    "4": "Рассмотрение во втором чтении",
    "5": "Рассмотрение в третьем чтении",
    "6": "Рассмотрение в Совете Федерации",
    "7": "Рассмотрение Президентом",
    "8": "Опубликование закона",
  };

  const groups: Record<string, BillEvent[]> = {};
  for (const event of events) {
    const top = (event.eventNum || "0").split(".")[0];
    if (!groups[top]) groups[top] = [];
    groups[top].push(event);
  }

  return Object.entries(groups)
    .sort(([a], [b]) => parseFloat(a) - parseFloat(b))
    .map(([num, evs]) => ({
      groupNum: num,
      label: STAGE_LABELS[num] || `Стадия ${num}`,
      events: evs.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    }));
}

interface EventsTimelineProps {
  events: BillEvent[];
}

export function EventsTimeline({ events }: EventsTimelineProps) {
  if (!events || events.length === 0) return null;

  const groups = groupEvents(events);

  return (
    <div>
      <h2 className="text-base font-semibold text-gray-900 mb-4">ЭРК по событиям</h2>
      <div className="space-y-4">
        {groups.map((group) => (
          <div key={group.groupNum} className="card overflow-hidden">
            {/* Group header */}
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                  →
                </div>
                <span className="text-sm font-medium text-gray-800 uppercase tracking-wide">
                  {group.label}
                </span>
              </div>
            </div>

            {/* Events in group */}
            <div className="divide-y divide-gray-50">
              {group.events.map((event, i) => {
                const { date, time } = formatDate(event.date);
                return (
                  <div key={i} className="flex gap-4 px-4 py-3">
                    {/* Date column */}
                    <div className="flex-shrink-0 w-24 text-right">
                      <div className="text-xs font-medium text-gray-700">{date}</div>
                      <div className="text-xs text-gray-400">{time}</div>
                    </div>

                    {/* Dot + content */}
                    <div className="flex gap-3 flex-1 min-w-0">
                      <div className="flex flex-col items-center">
                        <div className="w-2.5 h-2.5 rounded-full bg-green-400 mt-1 flex-shrink-0" />
                        {i < group.events.length - 1 && (
                          <div className="w-0.5 bg-gray-200 flex-1 mt-1" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0 pb-2">
                        <p className="text-sm text-gray-800">{event.name}</p>
                        {event.documents && event.documents.length > 0 && (
                          <div className="mt-1.5 flex flex-wrap gap-2">
                            {event.documents.map((doc, j) => (
                              <a
                                key={j}
                                href={doc.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-xs text-red-600 hover:text-red-800"
                              >
                                <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                                </svg>
                                {doc.name || "PDF"}
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
