const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

export async function generateBracket(tournamentId: string, event: string, standard: string, ageGroup: string): Promise<{
  message: string;
  count?: number;
  matches_created?: number;
  matches?: unknown[];
}> {
  const res = await fetch(`${API_URL}/generate-bracket`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tournament_id: tournamentId, event, standard, age_group: ageGroup }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "Failed to generate bracket");
  }
  return res.json();
}

export async function getDraws(
  tournamentId: string,
  event?: string,
  standard?: string,
  ageGroup?: string
): Promise<{ tournament_id: string; event_filter: string | null; standard_filter: string | null; age_group_filter: string | null; events: string[]; standards: string[]; age_groups: string[]; matches: import("./supabase").Match[] }> {
  const params = new URLSearchParams({ tournament_id: tournamentId });
  if (event) params.set("event", event);
  if (standard) params.set("standard", standard);
  if (ageGroup) params.set("age_group", ageGroup);
  const res = await fetch(`${API_URL}/draws?${params}`);
  if (!res.ok) throw new Error("Failed to load draws");
  return res.json();
}
