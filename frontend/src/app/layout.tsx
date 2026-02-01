import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DiplomAI — помощь с дипломом",
  description: "Генератор целей и задач дипломной работы"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
