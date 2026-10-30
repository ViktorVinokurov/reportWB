import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { Providers } from "@/app/providers";
import "@/app/styles/globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin", "cyrillic"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin", "cyrillic"],
});

export const metadata: Metadata = {
  title: "Сводный отчёт WB",
  description: "Сводный отчёт по еженедельным детализированным отчётам Wildberries",
};

// Роутинг Next.js — только тонкая обёртка: вся логика живёт в src/ по FSD.
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ru"
      // next-themes ставит класс темы до гидрации
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col font-sans">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
