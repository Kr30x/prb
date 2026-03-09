"use client";

const STATUS_COLORS: Record<string, string> = {
  "На рассмотрении": "bg-blue-100 text-blue-800",
  "Отклонён": "bg-red-100 text-red-800",
  "Принят": "bg-green-100 text-green-800",
  "Подписан Президентом": "bg-purple-100 text-purple-800",
  "Снят с рассмотрения": "bg-gray-100 text-gray-600",
};

export function StatusBadge({ status }: { status: string }) {
  const colorClass = STATUS_COLORS[status] || "bg-gray-100 text-gray-700";
  return (
    <span className={`badge ${colorClass}`}>
      {status || "—"}
    </span>
  );
}
