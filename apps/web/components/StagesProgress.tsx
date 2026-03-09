"use client";

import type { BillEvent } from "@prb/shared";

const STAGES = [
  { num: 1, label: "Внесение",            icon: "→" },
  { num: 2, label: "Предв. рассмотрение", icon: "≡" },
  { num: 3, label: "1-е чтение",          icon: "1" },
  { num: 4, label: "2-е чтение",          icon: "2" },
  { num: 5, label: "3-е чтение",          icon: "3" },
  { num: 6, label: "Совет Федерации",     icon: "⊞" },
  { num: 7, label: "Президент",           icon: "✦" },
  { num: 8, label: "Опубликование",       icon: "⊡" },
];

// Which stages belong to each group and where to render the label
const GROUPS = [
  { label: "ГОСУДАРСТВЕННАЯ ДУМА", from: 1, to: 5 },
  { label: "СОВЕТ ФЕДЕРАЦИИ",      from: 6, to: 6 },
  { label: "ПРЕЗИДЕНТ",            from: 7, to: 7 },
  { label: "ОПУБЛИКОВАНИЕ",        from: 8, to: 8 },
];

function getActiveStage(events: BillEvent[], status: string): number {
  if (!events?.length) return 1;
  const nums = events.map((e) => parseFloat(e.eventNum || "0")).filter(Boolean);
  const max = Math.max(...nums, 0);
  if (status?.includes("Подписан") || max >= 8) return 8;
  if (max >= 7 || status?.includes("Президент")) return 7;
  if (max >= 6 || status?.includes("Совет Федерации")) return 6;
  if (max >= 5) return 5;
  if (max >= 4) return 4;
  if (max >= 3) return 3;
  if (max >= 2) return 2;
  return 1;
}

interface StagesProgressProps {
  events: BillEvent[];
  status: string;
}

export function StagesProgress({ events, status }: StagesProgressProps) {
  const active = getActiveStage(events, status);

  return (
    <div className="card p-6">
      <p className="text-[11px] font-semibold tracking-widest text-gray-400 uppercase mb-5">
        Стадии рассмотрения
      </p>

      {/* Use CSS grid with 8 equal columns so everything lines up */}
      <div className="grid" style={{ gridTemplateColumns: "repeat(8, 1fr)" }}>

        {/* Row 1: group labels (span multiple columns) */}
        {GROUPS.map((g) => (
          <div
            key={g.label}
            className="flex flex-col items-center gap-0.5 pb-2"
            style={{
              gridColumn: `${g.from} / ${g.to + 1}`,
            }}
          >
            <span className="text-[9px] font-bold tracking-wider text-gray-400 uppercase text-center leading-tight">
              {g.label}
            </span>
            {/* underline spanning the group */}
            <div className={`w-4/5 h-px mt-1 ${g.from <= active && active <= g.to ? "bg-gray-400" : "bg-gray-200"}`} />
          </div>
        ))}

        {/* Row 2: circles + connectors */}
        {STAGES.map((stage) => {
          const isActive   = stage.num < active;
          const isCurrent  = stage.num === active;
          const isUpcoming = stage.num > active;

          return (
            <div key={stage.num} className="flex flex-col items-center gap-2 relative">
              {/* connector line to the left */}
              {stage.num > 1 && (
                <div
                  className={`absolute top-5 right-1/2 w-full h-px -translate-y-1/2 ${
                    isActive || isCurrent ? "bg-gray-400" : "bg-gray-200"
                  }`}
                />
              )}

              {/* circle */}
              <div
                className={`
                  relative z-10 w-10 h-10 rounded-full border-2 flex items-center justify-center
                  text-sm font-bold select-none transition-all
                  ${isCurrent  ? "bg-green-500 border-green-500 text-white shadow-md shadow-green-200 scale-110"
                  : isActive   ? "bg-gray-500  border-gray-500  text-white"
                               : "bg-white     border-gray-300  text-gray-400"}
                `}
              >
                {stage.icon}
              </div>

              {/* label */}
              <span
                className={`text-[11px] text-center leading-tight px-1 ${
                  isCurrent ? "text-gray-900 font-semibold"
                : isActive  ? "text-gray-600"
                            : "text-gray-400"
                }`}
              >
                {stage.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
