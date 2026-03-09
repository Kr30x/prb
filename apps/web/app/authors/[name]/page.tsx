"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import type { Bill } from "@prb/shared";
import { getBillsByAuthor } from "@/lib/bills";
import { BillCard } from "@/components/BillCard";

export default function AuthorPage() {
  const { name } = useParams<{ name: string }>();
  const decodedName = decodeURIComponent(name);
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const result = await getBillsByAuthor(decodedName);
        setBills(result);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [decodedName]);

  return (
    <div className="max-w-3xl">
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
        <Link href="/" className="hover:text-gray-700">
          Законопроекты
        </Link>
        <span>/</span>
        <span className="text-gray-700">Авторы</span>
        <span>/</span>
        <span className="text-gray-700">{decodedName}</span>
      </div>

      <h1 className="text-xl font-bold text-gray-900 mb-1">{decodedName}</h1>
      <p className="text-sm text-gray-500 mb-6">
        {loading ? "Загрузка..." : `${bills.length} законопроектов`}
      </p>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="card p-5 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
              <div className="h-3 bg-gray-100 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : bills.length === 0 ? (
        <div className="card p-8 text-center text-gray-500">
          Законопроекты не найдены
        </div>
      ) : (
        <div className="space-y-3">
          {bills.map((bill) => (
            <BillCard key={bill.id} bill={bill} />
          ))}
        </div>
      )}
    </div>
  );
}
