"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import type { Match } from "@/lib/supabase";

export default function SchedulePage() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("matches")
      .select("*")
      .order("round_order")
      .order("slot_in_round")
      .order("scheduled_at", { ascending: true, nullsFirst: true })
      .then(({ data }) => {
        const list = data ?? [];
        setMatches(list);
        const ids = new Set<string>();
        list.forEach((m) => {
          if (m.player1_id) ids.add(m.player1_id);
          if (m.player2_id) ids.add(m.player2_id);
        });
        if (ids.size > 0) {
          supabase.from("registrations").select("id, full_name").in("id", [...ids]).then(({ data: regs }) => {
            const map: Record<string, string> = {};
            (regs ?? []).forEach((r) => { map[r.id] = r.full_name; });
            setNames(map);
          });
        }
        setLoading(false);
      });
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
      <h1 className="page-title">Schedule</h1>
      <p className="page-subtitle">Matches appear here once the draw is published.</p>
      {matches.length > 0 && (
        <p className="mt-2">
          <Link href="/draws" className="text-sm font-semibold text-brand hover:text-brand-dark">
            View full draws by event →
          </Link>
        </p>
      )}

      {matches.length === 0 ? (
        <div className="card mt-8 text-center">
          <p className="text-gray-600">No matches scheduled yet.</p>
          <p className="mt-2 text-sm text-gray-500">Generate a draw from the Admin page, then view it on Draws.</p>
        </div>
      ) : (
        <div className="mt-8 space-y-3">
          {matches.map((m) => (
            <div
              key={m.id}
              className="card flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <span className="font-semibold text-gray-900">{m.round}</span>
                <span className="mx-2 text-gray-400">·</span>
                <span className="text-gray-700">{m.event}</span>
                <div className="mt-1 text-sm text-gray-600">
                  {names[m.player1_id ?? ""] ?? "—"} vs {names[m.player2_id ?? ""] ?? "—"}
                  {(m.score1 != null || m.score2 != null) && (
                    <span className="ml-2 font-medium text-gray-800">
                      {m.score1 ?? "–"}–{m.score2 ?? "–"}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3 text-sm">
                {m.scheduled_at && (
                  <span className="text-gray-500">
                    {new Date(m.scheduled_at).toLocaleString()}
                  </span>
                )}
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                    m.status === "completed"
                      ? "bg-green-100 text-green-800"
                      : m.status === "in_progress"
                        ? "bg-amber-100 text-amber-800"
                        : "bg-gray-100 text-gray-700"
                  }`}
                >
                  {m.status.replace("_", " ")}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
