"use client";

export interface ActivityCalendarProps {
  data: Record<string, number>; // "YYYY-MM-DD" -> count
  isLoading?: boolean;
  onDayClick?: (date: string) => void;
  selectedDate?: string;
}

const MONTH_NAMES_RU = ["янв", "фев", "мар", "апр", "май", "июн",
                         "июл", "авг", "сен", "окт", "ноя", "дек"];
const DAY_LABELS = ["Пн", "", "Ср", "", "Пт", "", ""];

interface DayCell {
  date: string; // "YYYY-MM-DD" or "" for padding
  count: number;
}

function getColorClass(count: number): string {
  if (count === 0) return "bg-gray-100";
  if (count === 1) return "bg-green-200";
  if (count <= 3) return "bg-green-400";
  if (count <= 6) return "bg-green-600";
  return "bg-green-800";
}

function toYMD(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

// Returns array of week-columns (each = 7 days Mon..Sun)
// spanning from ~52 weeks ago up to today, padded so grid starts on Monday.
function buildGrid(data: Record<string, number>): { weeks: DayCell[][]; monthLabels: (string | null)[] } {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Walk back to the Monday at or before (today - 364 days)
  const start = addDays(today, -364);
  const dow = start.getDay(); // 0=Sun
  const backToMonday = dow === 0 ? 6 : dow - 1;
  const gridStart = addDays(start, -backToMonday);

  const weeks: DayCell[][] = [];
  const monthLabels: (string | null)[] = [];
  let cursor = new Date(gridStart);

  while (cursor <= today) {
    const week: DayCell[] = [];
    const firstOfWeek = new Date(cursor);

    for (let d = 0; d < 7; d++) {
      const key = toYMD(cursor);
      week.push({
        date: cursor <= today ? key : "",
        count: cursor <= today ? (data[key] || 0) : 0,
      });
      cursor = addDays(cursor, 1);
    }

    // Show month label when the first day of this week is in a new month vs previous week
    const prevWeekFirst = addDays(firstOfWeek, -7);
    if (weeks.length === 0 || prevWeekFirst.getMonth() !== firstOfWeek.getMonth()) {
      monthLabels.push(MONTH_NAMES_RU[firstOfWeek.getMonth()]);
    } else {
      monthLabels.push(null);
    }

    weeks.push(week);
  }

  return { weeks, monthLabels };
}

function formatDateRu(iso: string): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${d}.${m}.${y}`;
}

export function ActivityCalendar({ data, isLoading, onDayClick, selectedDate }: ActivityCalendarProps) {
  const { weeks, monthLabels } = buildGrid(isLoading ? {} : data);

  const totalActivity = Object.values(data).reduce((s, v) => s + v, 0);
  const activeDays = Object.values(data).filter((v) => v > 0).length;

  return (
    <div>
      <div className="overflow-x-auto">
        <div className="inline-flex gap-0.5">
          {/* Weekday labels column */}
          <div className="flex flex-col gap-0.5 mr-1 pt-5">
            {DAY_LABELS.map((label, i) => (
              <div key={i} className="h-[11px] w-6 text-[9px] text-gray-400 leading-[11px]">
                {label}
              </div>
            ))}
          </div>

          {/* Week columns */}
          {weeks.map((week, wi) => (
            <div key={wi} className="flex flex-col gap-0.5">
              {/* Month label */}
              <div className="h-4 text-[9px] text-gray-400 leading-4 whitespace-nowrap select-none">
                {monthLabels[wi] || ""}
              </div>
              {/* Day cells */}
              {week.map((day, di) => (
                <div
                  key={di}
                  onClick={() => day.date && day.count > 0 && onDayClick?.(day.date)}
                  className={`h-[11px] w-[11px] rounded-sm transition-all ${
                    isLoading
                      ? "bg-gray-100 animate-pulse"
                      : !day.date
                      ? "bg-transparent"
                      : selectedDate === day.date
                      ? "ring-2 ring-offset-1 ring-blue-500 " + getColorClass(day.count)
                      : getColorClass(day.count)
                  } ${day.date && day.count > 0 && onDayClick ? "cursor-pointer hover:ring-2 hover:ring-offset-1 hover:ring-blue-400" : ""}`}
                  title={day.date && day.count > 0
                    ? `${day.count} законопроект${day.count > 4 ? "ов" : day.count > 1 ? "а" : ""} — ${formatDateRu(day.date)}`
                    : day.date ? formatDateRu(day.date) : ""}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Footer: legend + summary */}
      <div className="flex items-center justify-between mt-2 flex-wrap gap-2">
        <div className="flex items-center gap-1 text-[10px] text-gray-400">
          <span>Меньше</span>
          {[0, 1, 2, 4, 7].map((n, i) => (
            <div key={i} className={`h-[11px] w-[11px] rounded-sm ${getColorClass(n)}`} />
          ))}
          <span>Больше</span>
        </div>
        {!isLoading && totalActivity > 0 && (
          <span className="text-[10px] text-gray-400">
            {totalActivity} законопроектов за {activeDays} дней
          </span>
        )}
      </div>
    </div>
  );
}
