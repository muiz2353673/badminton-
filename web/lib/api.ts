const API_URL = process.env.NEXT_PUBLIC_API_URL || "";
const API_TIMEOUT_MS = 10000; // 10 seconds – avoid hanging if API is down

async function fetchWithTimeout(url: string, options: RequestInit = {}): Promise<Response> {
  if (!url.startsWith("http")) {
    return fetch(url, options);
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), API_TIMEOUT_MS);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    return res;
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error("Request timed out. Is the API running? (e.g. uvicorn main:app --reload --port 8000)");
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

export async function generateBracket(tournamentId: string, event: string, standard: string, ageGroup: string): Promise<{
  message: string;
  count?: number;
  matches_created?: number;
  matches?: unknown[];
}> {
  const res = await fetchWithTimeout(`${API_URL}/generate-bracket`, {
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
  const res = await fetchWithTimeout(`${API_URL}/draws?${params}`);
  if (!res.ok) throw new Error("Failed to load draws");
  return res.json();
}

// Admin-only: edit/delete registrations and matches (call from admin UI only)
export type RegistrationUpdate = {
  full_name?: string;
  email?: string;
  phone?: string | null;
  age_group?: string;
  event?: string;
  standard?: string | null;
  partner_name?: string | null;
  notes?: string | null;
};

export type MatchUpdate = {
  score1?: number | null;
  score2?: number | null;
  winner_id?: string | null;
  status?: string;
  scheduled_at?: string | null;
};

export async function updateRegistration(id: string, data: RegistrationUpdate): Promise<{ message: string; registration: unknown }> {
  const res = await fetchWithTimeout(`${API_URL}/registrations/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "Failed to update");
  }
  return res.json();
}

export async function deleteRegistration(id: string): Promise<{ message: string; id: string }> {
  const res = await fetchWithTimeout(`${API_URL}/registrations/${id}`, { method: "DELETE" });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "Failed to delete");
  }
  return res.json();
}

export async function updateMatch(id: string, data: MatchUpdate): Promise<{ message: string; match: unknown }> {
  const res = await fetchWithTimeout(`${API_URL}/matches/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "Failed to update match");
  }
  return res.json();
}

export async function deleteMatch(id: string): Promise<{ message: string; id: string }> {
  const res = await fetchWithTimeout(`${API_URL}/matches/${id}`, { method: "DELETE" });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "Failed to delete match");
  }
  return res.json();
}
