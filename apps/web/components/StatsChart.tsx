"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
  Legend,
} from "recharts";
import type { StatusStats } from "@/lib/bills";

const STATUS_COLORS: Record<string, string> = {
  "На рассмотрении": "#3b82f6",
  "Отклонён": "#ef4444",
  "Принят": "#22c55e",
  "Подписан Президентом": "#a855f7",
  "Снят с рассмотрения": "#9ca3af",
};

const DEFAULT_COLOR = "#6b7280";

interface StatusChartProps {
  data: StatusStats[];
}

export function StatusPieChart({ data }: StatusChartProps) {
  const chartData = data.map((d) => ({
    ...d,
    fill: STATUS_COLORS[d.status] || DEFAULT_COLOR,
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={chartData}
          dataKey="count"
          nameKey="status"
          cx="50%"
          cy="50%"
          outerRadius={100}
          label={({ status, percent }) =>
            `${status} (${(percent * 100).toFixed(0)}%)`
          }
          labelLine={false}
        >
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.fill} />
          ))}
        </Pie>
        <Tooltip formatter={(value: number) => [value, "Количество"]} />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function StatusBarChart({ data }: StatusChartProps) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 60 }}>
        <XAxis
          dataKey="status"
          angle={-30}
          textAnchor="end"
          tick={{ fontSize: 12 }}
          interval={0}
        />
        <YAxis tick={{ fontSize: 12 }} />
        <Tooltip />
        <Bar dataKey="count" name="Количество">
          {data.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={STATUS_COLORS[entry.status] || DEFAULT_COLOR}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

interface AuthorBarChartProps {
  data: Array<{ name: string; count: number; type: string }>;
}

export function AuthorBarChart({ data }: AuthorBarChartProps) {
  const AUTHOR_TYPE_COLORS: Record<string, string> = {
    deputy: "#3b82f6",
    senator: "#8b5cf6",
    government: "#f59e0b",
    other: "#6b7280",
  };

  return (
    <ResponsiveContainer width="100%" height={400}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 5, right: 30, left: 200, bottom: 5 }}
      >
        <XAxis type="number" tick={{ fontSize: 12 }} />
        <YAxis
          dataKey="name"
          type="category"
          tick={{ fontSize: 11 }}
          width={190}
        />
        <Tooltip />
        <Bar dataKey="count" name="Законопроектов">
          {data.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={AUTHOR_TYPE_COLORS[entry.type] || DEFAULT_COLOR}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
