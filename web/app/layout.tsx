import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Link from "next/link";

const inter = Inter({ subsets: ["latin"], variable: "--font-geist-sans" });

export const metadata: Metadata = {
  title: "North London Badminton Tournament",
  description: "March 2026 – Woodhouse & Wren, 8 courts. Register, view players and schedule.",
};

export default function RootLayout({
  children,
}: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`min-h-screen flex flex-col ${inter.className}`}>
        <header className="sticky top-0 z-50 border-b border-gray-200 bg-white/95 shadow-sm backdrop-blur">
          <div className="page-container flex flex-wrap items-center justify-between gap-3 py-4">
            <Link href="/" className="flex items-center gap-2.5 font-bold text-gray-900">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand text-sm font-extrabold text-white">NL</span>
              <span className="hidden sm:inline">North London Tournament</span>
              <span className="sm:hidden">NL Tournament</span>
            </Link>
            <nav className="flex flex-wrap items-center gap-1 sm:gap-2">
              <Link href="/" className="rounded-lg px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900">Home</Link>
              <Link href="/register" className="rounded-lg px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900">Register</Link>
              <Link href="/players" className="rounded-lg px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900">Players</Link>
              <Link href="/schedule" className="rounded-lg px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900">Schedule</Link>
              <Link href="/draws" className="rounded-lg px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900">Draws</Link>
              <Link href="/register" className="btn-primary ml-2 text-sm">Register now</Link>
            </nav>
          </div>
        </header>
        <main className="flex-1">{children}</main>
        <footer className="border-t border-gray-200 bg-white py-6">
          <div className="page-container flex flex-col items-center justify-between gap-4 sm:flex-row text-sm text-gray-500">
            <span>© {new Date().getFullYear()} North London Badminton Tournament</span>
            <div className="flex items-center gap-6">
              <Link href="/" className="hover:text-gray-900">Home</Link>
              <Link href="/register" className="hover:text-gray-900">Register</Link>
              <Link href="/players" className="hover:text-gray-900">Players</Link>
              <Link href="/schedule" className="hover:text-gray-900">Schedule</Link>
              <Link href="/draws" className="hover:text-gray-900">Draws</Link>
              <Link href="/admin" className="ml-4 border-l border-gray-300 pl-4 text-xs text-gray-400 hover:text-gray-600">Staff</Link>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
