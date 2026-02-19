"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Registration } from "@/lib/supabase";

const EVENT_OPTIONS = [
  "all",
  "Singles (Woodhouse)",
  "Women's Doubles (Woodhouse)",
  "Mixed Doubles (Woodhouse)",
  "Men's Doubles (Wren)",
];

export default function PlayersPage() {
  const [list, setList] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("registrations")
        .select("*")
        .order("created_at", { ascending: false });
      if (!error) setList(data ?? []);
      setLoading(false);
    })();
  }, []);

  const filtered = filter === "all" ? list : list.filter((r) => r.event === filter);

  if (loading) {
    return (
      <div className="page-container flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="page-title">Players</h1>
          <p className="page-subtitle">{list.length} registration{list.length !== 1 ? "s" : ""}</p>
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="filter" className="text-sm font-medium text-gray-700">Filter:</label>
          <select
            id="filter"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="w-full min-w-[180px] sm:w-auto"
          >
            <option value="all">All events</option>
            {EVENT_OPTIONS.slice(1).map((e) => (
              <option key={e} value={e}>{e}</option>
            ))}
          </select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="card mt-8 text-center text-gray-500">
          No registrations yet. <a href="/register" className="font-semibold text-brand hover:text-brand-dark">Register here</a>.
        </div>
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((r) => (
            <div key={r.id} className="card transition-shadow hover:shadow-cardHover">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-semibold text-gray-900">{r.full_name}</h3>
                  <p className="mt-0.5 text-sm text-gray-600">{r.email}</p>
                </div>
                <span className="shrink-0 rounded-full bg-brand-light px-2.5 py-1 text-xs font-semibold text-brand">
                  {r.age_group}
                </span>
              </div>
              <p className="mt-2 text-sm font-medium text-gray-700">{r.event}</p>
              {r.partner_name && (
                <p className="mt-1 text-sm text-gray-500">Partner: {r.partner_name}</p>
              )}
              <p className="mt-2 text-xs text-gray-400">
                Registered {new Date(r.created_at).toLocaleDateString()}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
