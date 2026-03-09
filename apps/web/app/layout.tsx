import type { Metadata } from "next";
import "./globals.css";
import Link from "next/link";

export const metadata: Metadata = {
  title: "PRB — Законопроекты Государственной Думы",
  description:
    "Поиск и анализ законопроектов Государственной Думы РФ с AI-резюме",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru">
      <body>
        <nav className="bg-white border-b border-gray-200 sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center gap-8">
                <Link
                  href="/"
                  className="text-xl font-bold text-blue-700 hover:text-blue-800"
                >
                  PRB
                </Link>
                <div className="hidden sm:flex items-center gap-6">
                  <Link
                    href="/"
                    className="text-sm text-gray-600 hover:text-gray-900"
                  >
                    Законопроекты
                  </Link>
                  <Link
                    href="/stats"
                    className="text-sm text-gray-600 hover:text-gray-900"
                  >
                    Статистика
                  </Link>
                </div>
              </div>
              <a
                href="https://sozd.duma.gov.ru"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-gray-400 hover:text-gray-600"
              >
                sozd.duma.gov.ru ↗
              </a>
            </div>
          </div>
        </nav>
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>
      </body>
    </html>
  );
}
