"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

const AGE_GROUPS = ["U11", "U13", "U15", "U17", "U19", "Senior"];
const EVENTS = [
  "Singles (Woodhouse)",
  "Women's Doubles (Woodhouse)",
  "Mixed Doubles (Woodhouse)",
  "Men's Doubles (Wren)",
];

export default function RegisterPage() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [tournamentId, setTournamentId] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from("tournaments")
      .select("id")
      .eq("slug", "north-london-march-2026")
      .single()
      .then(({ data }) => data && setTournamentId(data.id));
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage(null);
    setLoading(true);

    const form = e.currentTarget;
    const formData = new FormData(form);

    let tid = tournamentId;
    if (!tid) {
      const { data } = await supabase.from("tournaments").select("id").eq("slug", "north-london-march-2026").single();
      tid = data?.id ?? null;
    }

    if (!tid) {
      setMessage({ ok: false, text: "Tournament not found. Please try again later." });
      setLoading(false);
      return;
    }

    const { error } = await supabase.from("registrations").insert({
      tournament_id: tid,
      full_name: formData.get("fullName") as string,
      email: formData.get("email") as string,
      phone: (formData.get("phone") as string) || null,
      age_group: formData.get("ageGroup") as string,
      event: formData.get("event") as string,
      partner_name: (formData.get("partner") as string) || null,
      standard: (formData.get("standard") as string) || null,
      notes: (formData.get("notes") as string) || null,
    });

    setLoading(false);
    if (error) {
      setMessage({ ok: false, text: error.message || "Registration failed." });
      return;
    }
    setMessage({ ok: true, text: "Registration submitted. Thank you!" });
    form.reset();
  }

  return (
    <div className="page-container">
      <div className="mx-auto max-w-2xl">
        <h1 className="page-title">Register</h1>
        <p className="page-subtitle">Age groups U11–Senior. Events at Woodhouse and Wren.</p>

        <div className="card mt-8">
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            {message && (
              <div
                className={`rounded-lg border p-4 text-sm font-medium ${
                  message.ok
                    ? "border-green-200 bg-green-50 text-green-800"
                    : "border-red-200 bg-red-50 text-red-800"
                }`}
              >
                {message.text}
              </div>
            )}

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label htmlFor="fullName" className="mb-1.5 block text-sm font-medium text-gray-700">
                  Full name *
                </label>
                <input id="fullName" name="fullName" required placeholder="e.g. Alex Smith" />
              </div>
              <div>
                <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-gray-700">
                  Email *
                </label>
                <input id="email" name="email" type="email" required placeholder="alex@example.com" />
              </div>
            </div>

            <div>
              <label htmlFor="phone" className="mb-1.5 block text-sm font-medium text-gray-700">
                Phone
              </label>
              <input id="phone" name="phone" placeholder="07xxx xxxxxx" />
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label htmlFor="ageGroup" className="mb-1.5 block text-sm font-medium text-gray-700">
                  Age group *
                </label>
                <select id="ageGroup" name="ageGroup" required>
                  <option value="">Select…</option>
                  {AGE_GROUPS.map((g) => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="event" className="mb-1.5 block text-sm font-medium text-gray-700">
                  Event *
                </label>
                <select id="event" name="event" required>
                  <option value="">Select…</option>
                  {EVENTS.map((e) => (
                    <option key={e} value={e}>{e}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="partner" className="mb-1.5 block text-sm font-medium text-gray-700">
                Partner name (if doubles)
              </label>
              <input id="partner" name="partner" placeholder="Leave blank if singles" />
            </div>

            <div>
              <label htmlFor="standard" className="mb-1.5 block text-sm font-medium text-gray-700">
                Standard
              </label>
              <select id="standard" name="standard">
                <option>Recreational</option>
                <option>League (Div 4–6)</option>
                <option>League (Div 1–3)</option>
                <option>County / Performance</option>
              </select>
            </div>

            <div>
              <label htmlFor="notes" className="mb-1.5 block text-sm font-medium text-gray-700">
                Notes
              </label>
              <textarea id="notes" name="notes" rows={3} placeholder="Injuries, preferred times, etc." />
            </div>

            <button type="submit" disabled={loading} className="btn-primary mt-2 w-full sm:w-auto">
              {loading ? "Submitting…" : "Submit registration"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
