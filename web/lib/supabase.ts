import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(url, anonKey);

export type Group = {
  id: string;
  tournament_id: string;
  event: string;
  standard: string | null;
  age_group: string | null;
  name: string;
  sort_order: number;
};

export type Registration = {
  id: string;
  tournament_id: string;
  full_name: string;
  email: string;
  phone: string | null;
  age_group: string;
  event: string;
  partner_name: string | null;
  standard: string | null;
  notes: string | null;
  group_id: string | null;
  created_at: string;
};

export type Tournament = {
  id: string;
  name: string;
  slug: string | null;
  start_date: string | null;
  end_date: string | null;
  status: string;
  location: string | null;
  details: Record<string, unknown>;
};

export type Match = {
  id: string;
  tournament_id: string;
  round: string;
  event: string;
  standard?: string | null;
  age_group?: string | null;
  group_id?: string | null;
  round_order?: number | null;
  slot_in_round?: number | null;
  player1_id: string | null;
  player2_id: string | null;
  score1: number | null;
  score2: number | null;
  winner_id: string | null;
  scheduled_at: string | null;
  status: string;
  // From API /draws
  player1_name?: string;
  player2_name?: string;
  winner_name?: string | null;
};

export type Venue = {
  id: string;
  name: string;
  court_count: number;
  address: string | null;
};
