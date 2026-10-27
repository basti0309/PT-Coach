// Zeilentypen der Datenbank (von Hand gepflegt, siehe supabase/migrations).
import type { PlanContent } from "@/lib/plan/schema";

export type TestKind = "run_5k" | "bench_3rm" | "deadlift_3rm" | "squat_3rm" | "mobility" | "body_weight";
export type WorkoutKind = "strength" | "wod" | "endurance";

export interface ProfileRow {
  id: string;
  role: "coach" | "client";
  full_name: string;
  short_code: string | null;
  email: string | null;
  created_at: string;
}

export interface ClientProfileRow {
  client_id: string;
  sex: "m" | "w" | null;
  birth_date: string | null;
  height_cm: number | null;
  equipment_home: string;
  gym_access: boolean | null;
  training_days_per_week: number | null;
  max_minutes_per_workout: number | null;
  notes: string;
  pal_factor: number;
  protein_g: number | null;
  fat_g: number | null;
  carbs_g: number | null;
  updated_at: string;
  updated_by: string | null;
}

export interface TestResultRow {
  id: string;
  client_id: string;
  kind: TestKind;
  tested_on: string;
  value: number | null;
  scale: number | null;
  note: string;
  created_at: string;
  created_by: string | null;
}

export interface PlanRow {
  id: string;
  client_id: string;
  title: string;
  is_active: boolean;
  current_version: number;
  created_at: string;
  updated_at: string;
}

export interface PlanVersionRow {
  id: string;
  plan_id: string;
  client_id: string;
  version: number;
  content: PlanContent;
  change_note: string;
  source: "editor" | "import" | "restore" | "seed";
  created_at: string;
  created_by: string | null;
}

export interface WodResult {
  timeSeconds?: number;
  rounds?: number;
  reps?: number;
}

export interface WorkoutLogRow {
  id: string;
  client_id: string;
  kind: WorkoutKind;
  performed_on: string;
  title: string;
  plan_id: string | null;
  plan_version: number | null;
  session_id: string | null;
  source: "manual" | "strava";
  completed: boolean;
  sport: string | null;
  duration_seconds: number | null;
  distance_m: number | null;
  avg_hr: number | null;
  is_test: boolean;
  wod_id: string | null;
  wod_movements_key: string | null;
  wod_result: WodResult | null;
  wod_weights: string;
  notes: string;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
}

export interface SetLogRow {
  id: string;
  workout_log_id: string;
  client_id: string;
  performed_on: string;
  exercise_id: string;
  exercise_name: string;
  set_no: number;
  weight_kg: number | null;
  reps: number | null;
  done: boolean;
  created_at: string;
}

export interface StravaActivityRow {
  id: string;
  client_id: string;
  strava_activity_id: number;
  workout_log_id: string | null;
  strava_sport_type: string;
  sport: string | null;
  start_time: string;
  start_date_local: string;
  moving_time_seconds: number;
  distance_m: number | null;
  avg_hr: number | null;
  is_test: boolean;
  matched: boolean;
  planned_duration_seconds: number | null;
  planned_distance_m: number | null;
}

export interface MessageRow {
  id: string;
  client_id: string;
  sender: "client" | "coach" | "ai" | "system";
  author_id: string | null;
  body: string;
  ai_action: "answer" | "escalate" | null;
  ai_reason: string | null;
  needs_coach: boolean;
  resolved_at: string | null;
  created_at: string;
}

export interface KnowledgeEntryRow {
  id: string;
  kind: "wissen" | "faq";
  title: string;
  content: string;
  updated_at: string;
}

export interface EscalationRuleRow {
  id: string;
  rule: string;
  active: boolean;
  locked: boolean;
  sort: number;
}
