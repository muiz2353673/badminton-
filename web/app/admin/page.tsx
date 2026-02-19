"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Registration, Tournament } from "@/lib/supabase";

export default function AdminPage() {
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [r, t] = await Promise.all([
        supabase.from("registrations").select("*").order("created_at", { ascending: false }),
        supabase.from("tournaments").select("*"),
      ]);
      if (!r.error) setRegistrations(r.data ?? []);
      if (!t.error) setTournaments(t.data ?? []);
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <div className="page-container flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="page-container">
      <h1 className="page-title">Admin</h1>
      <p className="page-subtitle">Registrations and tournament info. Use the Python API for bracket generation.</p>

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-gray-900">Tournaments</h2>
        <div className="mt-4 space-y-3">
          {tournaments.map((t) => (
            <div key={t.id} className="card flex flex-wrap items-center gap-3">
              <span className="font-semibold text-gray-900">{t.name}</span>
              <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700">
                {t.status}
              </span>
              <span className="text-sm text-gray-600">{t.location}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-gray-900">Registrations ({registrations.length})</h2>
        <div className="card mt-4 overflow-x-auto p-0">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                  Age
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                  Event
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                  Date
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {registrations.map((r) => (
                <tr key={r.id} className="transition-colors hover:bg-gray-50">
                  <td className="whitespace-nowrap px-6 py-4 font-medium text-gray-900">{r.full_name}</td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600">{r.email}</td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <span className="rounded-full bg-brand-light px-2.5 py-1 text-xs font-semibold text-brand">
                      {r.age_group}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{r.event}</td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                    {new Date(r.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
