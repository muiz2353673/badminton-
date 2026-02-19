import Link from "next/link";

export default function HomePage() {
  return (
    <div className="page-container">
      {/* Hero */}
      <section className="rounded-2xl border border-gray-200 bg-white p-8 shadow-card sm:p-10">
        <p className="text-sm font-semibold uppercase tracking-wider text-brand">
          North London • 8 Courts • March 2026
        </p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
          North London Tournament
        </h1>
        <p className="mt-3 max-w-2xl text-lg text-gray-600">
          Our first tournament — end of March 2026. Singles, doubles and mixed across six age groups from U11 to Senior. Two venues, eight courts.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/register" className="btn-primary">
            Register now
          </Link>
          <Link href="/players" className="btn-secondary">
            View players
          </Link>
          <Link href="/schedule" className="btn-secondary">
            Schedule
          </Link>
        </div>
      </section>

      {/* Info cards */}
      <section className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <div className="card transition-shadow hover:shadow-cardHover">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500">Venues</h2>
          <p className="mt-2 font-semibold text-gray-900">Woodhouse & Wren</p>
          <p className="mt-1 text-sm text-gray-600">4 courts each. North London.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="rounded-full bg-brand-light px-2.5 py-1 text-xs font-semibold text-brand">Woodhouse: Singles, WD, XD</span>
            <span className="rounded-full bg-brand-light px-2.5 py-1 text-xs font-semibold text-brand">Wren: Men&apos;s Doubles</span>
          </div>
        </div>
        <div className="card transition-shadow hover:shadow-cardHover">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500">Age groups</h2>
          <p className="mt-2 font-semibold text-gray-900">U11 → Senior</p>
          <p className="mt-1 text-sm text-gray-600">U11, U13, U15, U17, U19 and Senior (21+).</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700">U11</span>
            <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700">U13</span>
            <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700">U15</span>
            <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700">U17</span>
            <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700">U19</span>
            <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700">Senior</span>
          </div>
        </div>
        <div className="card transition-shadow hover:shadow-cardHover sm:col-span-2 lg:col-span-1">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500">Dates</h2>
          <p className="mt-2 font-semibold text-gray-900">End of March 2026</p>
          <p className="mt-1 text-sm text-gray-600">Full schedule and draw published once entries close.</p>
          <Link href="/schedule" className="mt-3 inline-block text-sm font-semibold text-brand hover:text-brand-dark">
            View schedule →
          </Link>
        </div>
      </section>
    </div>
  );
}
