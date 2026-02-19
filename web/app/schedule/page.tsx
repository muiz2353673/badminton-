"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Match } from "@/lib/supabase";

export default function SchedulePage() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("matches")
      .select("*")
      .order("scheduled_at", { ascending: true, nullsFirst: false })
      .then(({ data }) => {
        setMatches(data ?? []);
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

      {matches.length === 0 ? (
        <div className="card mt-8 text-center">
          <p className="text-gray-600">No matches scheduled yet.</p>
          <p className="mt-2 text-sm text-gray-500">Use the Admin page and the Python API to generate brackets.</p>
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
