"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { getDraws } from "@/lib/api";
import type { Group, Match, Tournament } from "@/lib/supabase";

export default function DrawsPage() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [tournamentId, setTournamentId] = useState<string>("");
  const [eventFilter, setEventFilter] = useState<string>("");
  const [standardFilter, setStandardFilter] = useState<string>("");
  const [ageGroupFilter, setAgeGroupFilter] = useState<string>("");
  const [events, setEvents] = useState<string[]>([]);
  const [standards, setStandards] = useState<string[]>([]);
  const [ageGroups, setAgeGroups] = useState<string[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingDraw, setLoadingDraw] = useState(false);
  const [drawError, setDrawError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    Promise.resolve(
      supabase
        .from("tournaments")
        .select("*")
        .order("start_date", { ascending: true })
    )
      .then(({ data }) => {
        setTournaments(data ?? []);
        if (data?.length && !tournamentId) setTournamentId(data[0].id);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [tournamentId]);

  useEffect(() => {
    if (!tournamentId) return;
    setLoadingDraw(true);
    setDrawError(null);
    getDraws(tournamentId, eventFilter || undefined, standardFilter || undefined, ageGroupFilter || undefined)
      .then((d) => {
        setMatches(d.matches);
        setGroups(d.groups ?? []);
        setEvents(d.events);
        setStandards(d.standards ?? []);
        setAgeGroups(d.age_groups ?? []);
        if (d.events.length && !eventFilter) setEventFilter(d.events[0]);
        if (d.events.length && eventFilter && !d.events.includes(eventFilter)) setEventFilter(d.events[0]);
        if ((d.standards?.length ?? 0) > 0 && !standardFilter) setStandardFilter(d.standards[0]);
        if ((d.standards?.length ?? 0) > 0 && standardFilter && !d.standards?.includes(standardFilter)) setStandardFilter(d.standards[0]);
        if ((d.age_groups?.length ?? 0) > 0 && !ageGroupFilter) setAgeGroupFilter(d.age_groups[0]);
        if ((d.age_groups?.length ?? 0) > 0 && ageGroupFilter && !d.age_groups?.includes(ageGroupFilter)) setAgeGroupFilter(d.age_groups[0]);
      })
      .catch((e) => {
        setMatches([]);
        const msg = e instanceof Error ? e.message : "Could not load draws. Is the API running?";
        setDrawError(msg);
      })
      .finally(() => setLoadingDraw(false));
  }, [tournamentId, eventFilter, standardFilter, ageGroupFilter, retryCount]);

  const byRound = matches.reduce<Record<number, Match[]>>((acc, m) => {
    if (m.group_id) return acc;
    const r = m.round_order ?? 0;
    if (!acc[r]) acc[r] = [];
    acc[r].push(m);
    acc[r].sort((a, b) => (a.slot_in_round ?? 0) - (b.slot_in_round ?? 0));
    return acc;
  }, {});
  const roundOrder = Object.keys(byRound)
    .map(Number)
    .sort((a, b) => a - b);

  const matchesByGroup = groups.map((g) => ({ group: g, matches: matches.filter((m) => m.group_id === g.id) })).filter((x) => x.matches.length > 0);

  function standingsForMatches(groupMatches: Match[]): { id: string; name: string; wins: number }[] {
    const wins: Record<string, number> = {};
    const names: Record<string, string> = {};
    groupMatches.forEach((m) => {
      if (m.player1_id) {
        wins[m.player1_id] = (wins[m.player1_id] ?? 0) + 0;
        names[m.player1_id] = m.player1_name ?? "—";
      }
      if (m.player2_id) {
        wins[m.player2_id] = (wins[m.player2_id] ?? 0) + 0;
        names[m.player2_id] = m.player2_name ?? "—";
      }
      if (m.status === "completed" && m.winner_id) wins[m.winner_id] = (wins[m.winner_id] ?? 0) + 1;
    });
    return Object.entries(wins)
      .map(([id, w]) => ({ id, name: names[id] ?? "—", wins: w }))
      .sort((a, b) => b.wins - a.wins);
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
      <h1 className="page-title">Draws</h1>
      <p className="page-subtitle">View brackets by tournament, event, standard, and age group.</p>

      <div className="mt-6 flex flex-wrap gap-4">
        <div>
          <label htmlFor="draw-tournament" className="mb-1 block text-sm font-medium text-gray-700">
            Tournament
          </label>
          <select
            id="draw-tournament"
            value={tournamentId}
            onChange={(e) => setTournamentId(e.target.value)}
            className="min-w-[220px]"
          >
            <option value="">Select tournament</option>
            {tournaments.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="draw-event" className="mb-1 block text-sm font-medium text-gray-700">
            Event
          </label>
          <select
            id="draw-event"
            value={eventFilter}
            onChange={(e) => setEventFilter(e.target.value)}
            className="min-w-[200px]"
          >
            <option value="">All events</option>
            {events.map((e) => (
              <option key={e} value={e}>
                {e}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="draw-standard" className="mb-1 block text-sm font-medium text-gray-700">
            Standard
          </label>
          <select
            id="draw-standard"
            value={standardFilter}
            onChange={(e) => setStandardFilter(e.target.value)}
            className="min-w-[160px]"
          >
            <option value="">All standards</option>
            {standards.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="draw-age-group" className="mb-1 block text-sm font-medium text-gray-700">
            Age group
          </label>
          <select
            id="draw-age-group"
            value={ageGroupFilter}
            onChange={(e) => setAgeGroupFilter(e.target.value)}
            className="min-w-[120px]"
          >
            <option value="">All age groups</option>
            {ageGroups.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loadingDraw ? (
        <div className="mt-10 flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand border-t-transparent" />
        </div>
      ) : drawError ? (
        <div className="card mt-10 border-amber-200 bg-amber-50 text-center">
          <p className="font-medium text-amber-800">{drawError}</p>
          <p className="mt-2 text-xs text-amber-600">
            API URL: {process.env.NEXT_PUBLIC_API_URL || "not set"}
          </p>
          <button
            type="button"
            onClick={() => setRetryCount((c) => c + 1)}
            className="btn-primary mt-4"
          >
            Retry
          </button>
          <p className="mt-4 text-sm text-amber-700">
            <strong>Local:</strong> Run the API with <code className="rounded bg-amber-100 px-1">cd api && source venv/bin/activate && uvicorn main:app --reload --port 8000</code> and set <code className="rounded bg-amber-100 px-1">NEXT_PUBLIC_API_URL=http://localhost:8000</code> in <code className="rounded bg-amber-100 px-1">web/.env.local</code>.
          </p>
          <p className="mt-1 text-sm text-amber-700">
            <strong>Production (e.g. Render):</strong> Set <code className="rounded bg-amber-100 px-1">NEXT_PUBLIC_API_URL</code> for the web service to your deployed API URL (e.g. <code className="rounded bg-amber-100 px-1">https://tournament-api.onrender.com</code>). Redeploy the web service after changing env vars.
          </p>
        </div>
      ) : matches.length === 0 ? (
        <div className="card mt-10 text-center">
          <p className="text-gray-600">No draw yet for this selection.</p>
          <p className="mt-2 text-sm text-gray-500">
            Create groups and assign players in Admin (round-robin), or generate an elimination bracket, then refresh.
          </p>
        </div>
      ) : (
        <div className="mt-10 space-y-10">
          {(eventFilter || standardFilter || ageGroupFilter) && (
            <p className="text-sm font-medium text-gray-700">
              {[eventFilter, standardFilter, ageGroupFilter].filter(Boolean).join(" — ")}
            </p>
          )}

          {matchesByGroup.length > 0 && (
            <div className="space-y-8">
              <h2 className="text-base font-semibold text-gray-900">Round-robin groups</h2>
              {matchesByGroup.map(({ group, matches: groupMatches }) => {
                const standings = standingsForMatches(groupMatches);
                return (
                  <div key={group.id} className="card">
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-brand">{group.name}</h3>
                    {standings.length > 0 && (
                      <div className="mt-3 overflow-x-auto">
                        <table className="min-w-full text-sm">
                          <thead>
                            <tr className="border-b border-gray-200 text-left text-gray-500">
                              <th className="pb-2 pr-4">Player</th>
                              <th className="pb-2">Wins</th>
                            </tr>
                          </thead>
                          <tbody>
                            {standings.map((s) => (
                              <tr key={s.id} className="border-b border-gray-100">
                                <td className="py-1.5 pr-4 font-medium text-gray-900">{s.name}</td>
                                <td className="py-1.5 text-gray-600">{s.wins}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                    <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                      {groupMatches.map((m) => (
                        <div key={m.id} className="rounded-lg border border-gray-200 bg-gray-50/50 px-3 py-2 text-sm">
                          <div className="flex items-center justify-between gap-2">
                            <span className={m.winner_id === m.player1_id ? "font-semibold text-gray-900" : "text-gray-600"}>{m.player1_name ?? "—"}</span>
                            {(m.score1 != null || m.score2 != null) && (
                              <span className="font-mono text-gray-700">{m.score1 ?? "–"}–{m.score2 ?? "–"}</span>
                            )}
                          </div>
                          <div className="flex items-center justify-between gap-2">
                            <span className={m.winner_id === m.player2_id ? "font-semibold text-gray-900" : "text-gray-600"}>{m.player2_name ?? "—"}</span>
                            {m.status === "completed" && <span className="text-xs text-green-700">Done</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {roundOrder.length > 0 && (
            <div className="overflow-x-auto">
              <h2 className="mb-4 text-base font-semibold text-gray-900">Elimination bracket</h2>
              <div className="flex gap-8 min-w-max pb-4">
                {roundOrder.map((r) => (
                  <div key={r} className="flex flex-col gap-4">
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500 sticky top-0 bg-gray-50 py-1">
                      {byRound[r][0]?.round ?? `Round ${r}`}
                    </h3>
                    <div className="flex flex-col gap-2">
                      {byRound[r].map((m) => (
                        <div key={m.id} className="card min-w-[200px] border-brand/20 bg-white py-2 px-3">
                          <div className="flex items-center justify-between gap-2 text-sm">
                            <span className={m.winner_id === m.player1_id ? "font-semibold text-gray-900" : "text-gray-600"}>{m.player1_name ?? "—"}</span>
                            {(m.score1 != null || m.score2 != null) && (
                              <span className="shrink-0 font-mono text-gray-700">{m.score1 ?? "–"}–{m.score2 ?? "–"}</span>
                            )}
                          </div>
                          <div className="mt-0.5 flex items-center justify-between gap-2 text-sm">
                            <span className={m.winner_id === m.player2_id ? "font-semibold text-gray-900" : "text-gray-600"}>{m.player2_name ?? "—"}</span>
                            {m.status === "completed" && m.winner_name && <span className="text-xs text-green-700">Winner</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
