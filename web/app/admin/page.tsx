"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  generateBracket,
  getDraws,
  updateRegistration,
  deleteRegistration,
  updateMatch,
  deleteMatch,
  type RegistrationUpdate,
  type MatchUpdate,
} from "@/lib/api";
import type { Registration, Tournament } from "@/lib/supabase";
import type { Match } from "@/lib/supabase";

const EVENTS = [
  "Singles (Woodhouse)",
  "Women's Doubles (Woodhouse)",
  "Mixed Doubles (Woodhouse)",
  "Men's Doubles (Wren)",
];

const STANDARDS = ["Recreational", "Intermediate", "Advanced"];
const AGE_GROUPS = ["U11", "U13", "U15", "U17", "U19", "Senior"];
const MATCH_STATUSES = ["scheduled", "in_progress", "completed"];

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

  const [editingRegistration, setEditingRegistration] = useState<Registration | null>(null);
  const [editRegSaving, setEditRegSaving] = useState(false);
  const [editRegError, setEditRegError] = useState<string | null>(null);

  const [deletingRegId, setDeletingRegId] = useState<string | null>(null);

  const [manageTournamentId, setManageTournamentId] = useState("");
  const [manageEvent, setManageEvent] = useState("");
  const [manageStandard, setManageStandard] = useState("");
  const [manageAgeGroup, setManageAgeGroup] = useState("");
  const [adminMatches, setAdminMatches] = useState<Match[]>([]);
  const [loadingMatches, setLoadingMatches] = useState(false);

  const [editingMatch, setEditingMatch] = useState<Match | null>(null);
  const [editMatchSaving, setEditMatchSaving] = useState(false);
  const [editMatchError, setEditMatchError] = useState<string | null>(null);
  const [deletingMatchId, setDeletingMatchId] = useState<string | null>(null);

  const [recordingResultMatch, setRecordingResultMatch] = useState<Match | null>(null);
  const [resultScore1, setResultScore1] = useState<string>("");
  const [resultScore2, setResultScore2] = useState<string>("");
  const [resultWinnerId, setResultWinnerId] = useState<string>("");
  const [recordResultSaving, setRecordResultSaving] = useState(false);
  const [recordResultError, setRecordResultError] = useState<string | null>(null);

  async function handleLogout() {
    await fetch("/api/auth/admin-logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  }

  function refreshRegistrations() {
    supabase.from("registrations").select("*").order("created_at", { ascending: false }).then(({ data }) => {
      if (!data) return;
      setRegistrations(data);
    });
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
        if (data.length && !manageTournamentId) setManageTournamentId(data[0].id);
      }
      setLoading(false);
    })();
  }, [drawTournamentId, manageTournamentId]);

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
      if (manageTournamentId === drawTournamentId) {
        setManageEvent(drawEvent);
        setManageStandard(drawStandard);
        setManageAgeGroup(drawAgeGroup);
      }
    } catch (e) {
      setDrawMessage({ ok: false, text: e instanceof Error ? e.message : "Failed to generate draw." });
    } finally {
      setDrawLoading(false);
    }
  }

  async function handleSaveRegistration() {
    if (!editingRegistration) return;
    setEditRegError(null);
    setEditRegSaving(true);
    try {
      const data: RegistrationUpdate = {
        full_name: editingRegistration.full_name,
        email: editingRegistration.email,
        phone: editingRegistration.phone ?? undefined,
        age_group: editingRegistration.age_group,
        event: editingRegistration.event,
        standard: editingRegistration.standard ?? undefined,
        partner_name: editingRegistration.partner_name ?? undefined,
        notes: editingRegistration.notes ?? undefined,
      };
      await updateRegistration(editingRegistration.id, data);
      setEditingRegistration(null);
      refreshRegistrations();
    } catch (e) {
      setEditRegError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setEditRegSaving(false);
    }
  }

  async function handleDeleteRegistration(id: string) {
    if (!confirm("Delete this player? This cannot be undone.")) return;
    setDeletingRegId(id);
    try {
      await deleteRegistration(id);
      refreshRegistrations();
    } finally {
      setDeletingRegId(null);
    }
  }

  useEffect(() => {
    if (!manageTournamentId) return;
    setLoadingMatches(true);
    getDraws(manageTournamentId, manageEvent || undefined, manageStandard || undefined, manageAgeGroup || undefined)
      .then((d) => setAdminMatches(d.matches))
      .catch(() => setAdminMatches([]))
      .finally(() => setLoadingMatches(false));
  }, [manageTournamentId, manageEvent, manageStandard, manageAgeGroup]);

  async function handleSaveMatch() {
    if (!editingMatch) return;
    setEditMatchError(null);
    setEditMatchSaving(true);
    try {
      const data: MatchUpdate = {
        score1: editingMatch.score1 ?? undefined,
        score2: editingMatch.score2 ?? undefined,
        winner_id: editingMatch.winner_id ?? undefined,
        status: editingMatch.status,
      };
      await updateMatch(editingMatch.id, data);
      setEditingMatch(null);
      getDraws(manageTournamentId, manageEvent || undefined, manageStandard || undefined, manageAgeGroup || undefined).then((d) => setAdminMatches(d.matches));
    } catch (e) {
      setEditMatchError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setEditMatchSaving(false);
    }
  }

  async function handleDeleteMatch(id: string) {
    if (!confirm("Delete this match? This cannot be undone.")) return;
    setDeletingMatchId(id);
    try {
      await deleteMatch(id);
      getDraws(manageTournamentId, manageEvent || undefined, manageStandard || undefined, manageAgeGroup || undefined).then((d) => setAdminMatches(d.matches));
    } finally {
      setDeletingMatchId(null);
    }
  }

  function openRecordResult(m: Match) {
    setRecordingResultMatch(m);
    setResultScore1(m.score1 != null ? String(m.score1) : "");
    setResultScore2(m.score2 != null ? String(m.score2) : "");
    setResultWinnerId(m.winner_id ?? "");
    setRecordResultError(null);
  }

  async function handleRecordResult() {
    if (!recordingResultMatch) return;
    const score1 = resultScore1 === "" ? null : parseInt(resultScore1, 10);
    const score2 = resultScore2 === "" ? null : parseInt(resultScore2, 10);
    if (score1 != null && isNaN(score1)) {
      setRecordResultError("Enter a valid score for player 1");
      return;
    }
    if (score2 != null && isNaN(score2)) {
      setRecordResultError("Enter a valid score for player 2");
      return;
    }
    setRecordResultError(null);
    setRecordResultSaving(true);
    try {
      await updateMatch(recordingResultMatch.id, {
        score1: score1 ?? undefined,
        score2: score2 ?? undefined,
        winner_id: resultWinnerId || undefined,
        status: "completed",
      });
      setRecordingResultMatch(null);
      getDraws(manageTournamentId, manageEvent || undefined, manageStandard || undefined, manageAgeGroup || undefined).then((d) => setAdminMatches(d.matches));
    } catch (e) {
      setRecordResultError(e instanceof Error ? e.message : "Failed to save result");
    } finally {
      setRecordResultSaving(false);
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
          <p className="page-subtitle">Registrations, draw generation, and tournament info. Edit players and draws here only.</p>
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
        <p className="mt-1 text-sm text-gray-600">Edit player info (e.g. standard: Recreational / Intermediate / Advanced) or delete a player. Changes apply to this registration only.</p>
        <div className="card mt-4 overflow-x-auto p-0">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Name</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Email</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Age</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Event</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Standard</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Date</th>
                <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {registrations.map((r) => (
                <tr key={r.id} className="transition-colors hover:bg-gray-50">
                  <td className="whitespace-nowrap px-6 py-4 font-medium text-gray-900">{r.full_name}</td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600">{r.email}</td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <span className="rounded-full bg-brand-light px-2.5 py-1 text-xs font-semibold text-brand">{r.age_group}</span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{r.event}</td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600">{r.standard ?? "—"}</td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">{new Date(r.created_at).toLocaleDateString()}</td>
                  <td className="whitespace-nowrap px-6 py-4 text-right">
                    <button type="button" onClick={() => setEditingRegistration({ ...r })} className="text-sm font-medium text-brand hover:text-brand-dark mr-3">Edit</button>
                    <button type="button" onClick={() => handleDeleteRegistration(r.id)} disabled={deletingRegId === r.id} className="text-sm font-medium text-red-600 hover:text-red-800 disabled:opacity-50">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Edit registration modal */}
      {editingRegistration && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => !editRegSaving && setEditingRegistration(null)}>
          <div className="card max-h-[90vh] w-full max-w-lg overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-gray-900">Edit player</h3>
            {editRegError && <p className="mt-2 text-sm text-red-600">{editRegError}</p>}
            <div className="mt-4 space-y-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Full name</label>
                <input value={editingRegistration.full_name} onChange={(e) => setEditingRegistration({ ...editingRegistration, full_name: e.target.value })} className="w-full" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Email</label>
                <input type="email" value={editingRegistration.email} onChange={(e) => setEditingRegistration({ ...editingRegistration, email: e.target.value })} className="w-full" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Phone</label>
                <input value={editingRegistration.phone ?? ""} onChange={(e) => setEditingRegistration({ ...editingRegistration, phone: e.target.value || null })} className="w-full" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Age group</label>
                <select value={editingRegistration.age_group} onChange={(e) => setEditingRegistration({ ...editingRegistration, age_group: e.target.value })} className="w-full">
                  {AGE_GROUPS.map((g) => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Event</label>
                <select value={editingRegistration.event} onChange={(e) => setEditingRegistration({ ...editingRegistration, event: e.target.value })} className="w-full">
                  {EVENTS.map((e) => <option key={e} value={e}>{e}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Standard</label>
                <select value={editingRegistration.standard ?? ""} onChange={(e) => setEditingRegistration({ ...editingRegistration, standard: e.target.value || null })} className="w-full">
                  <option value="">—</option>
                  {STANDARDS.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Partner name</label>
                <input value={editingRegistration.partner_name ?? ""} onChange={(e) => setEditingRegistration({ ...editingRegistration, partner_name: e.target.value || null })} className="w-full" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Notes</label>
                <textarea value={editingRegistration.notes ?? ""} onChange={(e) => setEditingRegistration({ ...editingRegistration, notes: e.target.value || null })} className="w-full" rows={2} />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button type="button" onClick={() => !editRegSaving && setEditingRegistration(null)} className="btn-secondary">Cancel</button>
              <button type="button" onClick={handleSaveRegistration} disabled={editRegSaving} className="btn-primary">{editRegSaving ? "Saving…" : "Save"}</button>
            </div>
          </div>
        </div>
      )}

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-gray-900">Manage draws</h2>
        <p className="mt-1 text-sm text-gray-600">When a match is finished, use &quot;Enter score&quot; to record the result (scores + winner) and mark it completed. You can also Edit or Delete matches.</p>
        <div className="mt-4 flex flex-wrap items-end gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Tournament</label>
            <select value={manageTournamentId} onChange={(e) => setManageTournamentId(e.target.value)} className="min-w-[220px]">
              <option value="">Select</option>
              {tournaments.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Event</label>
            <select value={manageEvent} onChange={(e) => setManageEvent(e.target.value)} className="min-w-[200px]">
              <option value="">All</option>
              {EVENTS.map((e) => <option key={e} value={e}>{e}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Standard</label>
            <select value={manageStandard} onChange={(e) => setManageStandard(e.target.value)} className="min-w-[160px]">
              <option value="">All</option>
              {STANDARDS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Age group</label>
            <select value={manageAgeGroup} onChange={(e) => setManageAgeGroup(e.target.value)} className="min-w-[120px]">
              <option value="">All</option>
              {AGE_GROUPS.map((g) => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
        </div>
        {loadingMatches ? (
          <div className="mt-4 flex justify-center py-8">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand border-t-transparent" />
          </div>
        ) : adminMatches.length === 0 ? (
          <p className="mt-4 text-sm text-gray-500">No matches for this selection. Generate a draw above first.</p>
        ) : (
          <div className="mt-4 space-y-2">
            {adminMatches.map((m) => (
              <div key={m.id} className="card flex flex-wrap items-center justify-between gap-3 py-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium text-gray-500">{m.round}</span>
                  <span className="text-gray-700">{m.player1_name ?? "—"}</span>
                  <span className="text-gray-400">vs</span>
                  <span className="text-gray-700">{m.player2_name ?? "—"}</span>
                  {(m.score1 != null || m.score2 != null) && (
                    <span className="font-mono text-sm font-medium text-gray-800">{m.score1 ?? "–"}–{m.score2 ?? "–"}</span>
                  )}
                  {m.status === "completed" && (
                    <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">Finished</span>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => openRecordResult(m)} className="btn-primary text-sm">
                    {m.status === "completed" ? "Change score" : "Enter score"}
                  </button>
                  <button type="button" onClick={() => setEditingMatch({ ...m })} className="btn-secondary text-sm">Edit</button>
                  <button type="button" onClick={() => handleDeleteMatch(m.id)} disabled={deletingMatchId === m.id} className="rounded-lg border border-red-200 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50">Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Record result (enter score) modal */}
      {recordingResultMatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => !recordResultSaving && setRecordingResultMatch(null)}>
          <div className="card w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-gray-900">Enter score – match finished</h3>
            <p className="mt-1 text-sm text-gray-600">{recordingResultMatch.player1_name ?? "—"} vs {recordingResultMatch.player2_name ?? "—"}</p>
            {recordResultError && <p className="mt-2 text-sm text-red-600">{recordResultError}</p>}
            <div className="mt-4 space-y-3">
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <label className="mb-1 block text-sm font-medium text-gray-700">Score ({recordingResultMatch.player1_name ?? "Player 1"})</label>
                  <input
                    type="number"
                    min={0}
                    value={resultScore1}
                    onChange={(e) => setResultScore1(e.target.value)}
                    placeholder="0"
                    className="w-full"
                  />
                </div>
                <span className="pt-6 text-gray-400">–</span>
                <div className="flex-1">
                  <label className="mb-1 block text-sm font-medium text-gray-700">Score ({recordingResultMatch.player2_name ?? "Player 2"})</label>
                  <input
                    type="number"
                    min={0}
                    value={resultScore2}
                    onChange={(e) => setResultScore2(e.target.value)}
                    placeholder="0"
                    className="w-full"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Winner</label>
                <select value={resultWinnerId} onChange={(e) => setResultWinnerId(e.target.value)} className="w-full">
                  <option value="">Select winner</option>
                  {recordingResultMatch.player1_id && <option value={recordingResultMatch.player1_id}>{recordingResultMatch.player1_name ?? "Player 1"}</option>}
                  {recordingResultMatch.player2_id && <option value={recordingResultMatch.player2_id}>{recordingResultMatch.player2_name ?? "Player 2"}</option>}
                </select>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button type="button" onClick={() => !recordResultSaving && setRecordingResultMatch(null)} className="btn-secondary">Cancel</button>
              <button type="button" onClick={handleRecordResult} disabled={recordResultSaving} className="btn-primary">{recordResultSaving ? "Saving…" : "Save result"}</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit match modal */}
      {editingMatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => !editMatchSaving && setEditingMatch(null)}>
          <div className="card w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-gray-900">Edit match</h3>
            <p className="mt-1 text-sm text-gray-600">{editingMatch.player1_name ?? "—"} vs {editingMatch.player2_name ?? "—"}</p>
            {editMatchError && <p className="mt-2 text-sm text-red-600">{editMatchError}</p>}
            <div className="mt-4 space-y-3">
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="mb-1 block text-sm font-medium text-gray-700">Score 1</label>
                  <input type="number" min={0} value={editingMatch.score1 ?? ""} onChange={(e) => setEditingMatch({ ...editingMatch, score1: e.target.value === "" ? null : parseInt(e.target.value, 10) })} className="w-full" />
                </div>
                <div className="flex-1">
                  <label className="mb-1 block text-sm font-medium text-gray-700">Score 2</label>
                  <input type="number" min={0} value={editingMatch.score2 ?? ""} onChange={(e) => setEditingMatch({ ...editingMatch, score2: e.target.value === "" ? null : parseInt(e.target.value, 10) })} className="w-full" />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Winner</label>
                <select
                  value={editingMatch.winner_id ?? ""}
                  onChange={(e) => setEditingMatch({ ...editingMatch, winner_id: e.target.value || null })}
                  className="w-full"
                >
                  <option value="">No winner yet</option>
                  {editingMatch.player1_id && <option value={editingMatch.player1_id}>{editingMatch.player1_name ?? "Player 1"}</option>}
                  {editingMatch.player2_id && <option value={editingMatch.player2_id}>{editingMatch.player2_name ?? "Player 2"}</option>}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Status</label>
                <select value={editingMatch.status} onChange={(e) => setEditingMatch({ ...editingMatch, status: e.target.value })} className="w-full">
                  {MATCH_STATUSES.map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
                </select>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button type="button" onClick={() => !editMatchSaving && setEditingMatch(null)} className="btn-secondary">Cancel</button>
              <button type="button" onClick={handleSaveMatch} disabled={editMatchSaving} className="btn-primary">{editMatchSaving ? "Saving…" : "Save"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
