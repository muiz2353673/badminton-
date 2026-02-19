"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { generateBracket } from "@/lib/api";
import type { Registration, Tournament } from "@/lib/supabase";

const EVENTS = [
  "Singles (Woodhouse)",
  "Women's Doubles (Woodhouse)",
  "Mixed Doubles (Woodhouse)",
  "Men's Doubles (Wren)",
];

const STANDARDS = ["Recreational", "Intermediate", "Advanced"];
const AGE_GROUPS = ["U11", "U13", "U15", "U17", "U19", "Senior"];

export default function AdminPage() {
  const router = useRouter();
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawTournamentId, setDrawTournamentId] = useState("");
  const [drawEvent, setDrawEvent] = useState(EVENTS[0]);
  const [drawStandard, setDrawStandard] = useState(STANDARDS[0]);
  const [drawAgeGroup, setDrawAgeGroup] = useState(AGE_GROUPS[0]);
  const [drawMessage, setDrawMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [drawLoading, setDrawLoading] = useState(false);

  async function handleLogout() {
    await fetch("/api/auth/admin-logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  }

  useEffect(() => {
    (async () => {
      const [r, t] = await Promise.all([
        supabase.from("registrations").select("*").order("created_at", { ascending: false }),
        supabase.from("tournaments").select("*"),
      ]);
      if (!r.error) setRegistrations(r.data ?? []);
      if (!t.error) {
        const data = t.data ?? [];
        setTournaments(data);
        if (data.length && !drawTournamentId) setDrawTournamentId(data[0].id);
      }
      setLoading(false);
    })();
  }, [drawTournamentId]);

  async function handleGenerateDraw() {
    if (!drawTournamentId || !drawEvent || !drawStandard || !drawAgeGroup) return;
    setDrawMessage(null);
    setDrawLoading(true);
    try {
      const res = await generateBracket(drawTournamentId, drawEvent, drawStandard, drawAgeGroup);
      setDrawMessage({
        ok: true,
        text: `Draw generated: ${res.matches_created ?? 0} matches for ${res.count ?? 0} players. View on the Draws page.`,
      });
    } catch (e) {
      setDrawMessage({ ok: false, text: e instanceof Error ? e.message : "Failed to generate draw." });
    } finally {
      setDrawLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="page-container flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="page-title">Admin</h1>
          <p className="page-subtitle">Registrations, draw generation, and tournament info.</p>
        </div>
        <button type="button" onClick={handleLogout} className="btn-secondary text-sm">
          Log out
        </button>
      </div>

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-gray-900">Generate draw</h2>
        <p className="mt-1 text-sm text-gray-600">Create a single-elimination bracket for an event + standard + age group. Existing draw for that combination will be replaced.</p>
        <div className="mt-4 flex flex-wrap items-end gap-4">
          <div>
            <label htmlFor="admin-tournament" className="mb-1 block text-sm font-medium text-gray-700">Tournament</label>
            <select id="admin-tournament" value={drawTournamentId} onChange={(e) => setDrawTournamentId(e.target.value)} className="min-w-[220px]">
              <option value="">Select</option>
              {tournaments.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="admin-event" className="mb-1 block text-sm font-medium text-gray-700">Event</label>
            <select id="admin-event" value={drawEvent} onChange={(e) => setDrawEvent(e.target.value)} className="min-w-[200px]">
              {EVENTS.map((e) => (
                <option key={e} value={e}>{e}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="admin-standard" className="mb-1 block text-sm font-medium text-gray-700">Standard</label>
            <select id="admin-standard" value={drawStandard} onChange={(e) => setDrawStandard(e.target.value)} className="min-w-[160px]">
              {STANDARDS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="admin-age-group" className="mb-1 block text-sm font-medium text-gray-700">Age group</label>
            <select id="admin-age-group" value={drawAgeGroup} onChange={(e) => setDrawAgeGroup(e.target.value)} className="min-w-[120px]">
              {AGE_GROUPS.map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </div>
          <button type="button" onClick={handleGenerateDraw} disabled={drawLoading || !drawTournamentId} className="btn-primary">
            {drawLoading ? "Generating…" : "Generate draw"}
          </button>
        </div>
        {drawMessage && (
          <div className={`mt-3 rounded-lg border p-3 text-sm ${drawMessage.ok ? "border-green-200 bg-green-50 text-green-800" : "border-red-200 bg-red-50 text-red-800"}`}>
            {drawMessage.text}
          </div>
        )}
      </section>

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
