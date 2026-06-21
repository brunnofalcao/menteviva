// Tipos do domínio Mente Viva (espelham o schema Postgres)

export type UserRole = "patient" | "doctor";
export type MedSource = "doctor" | "patient";
export type MedFrequency = "daily" | "alternate" | "weekly" | "as_needed";
export type DoseStatus = "pending" | "taken" | "skipped" | "snoozed";
export type SkipReason = "forgot" | "side_effect" | "ran_out" | "felt_better" | "other";
export type ReminderKind = "medication" | "water" | "mood_checkin" | "breathing" | "care_message";
export type ReminderChannel = "push" | "whatsapp";
export type CheckinModule =
  | "mood" | "sleep" | "side_effects" | "energy" | "activity" | "hydration" | "free_note" | "anxiety" | "appetite" | "irritability";
export type ActivityLevel = "still" | "moved" | "exercised";

export interface Doctor {
  id: string;
  crm: string | null;
  clinic_name: string;
  invite_code: string;
  brand_name: string;
  brand_accent: string;
  brand_logo_url: string | null;
}

export interface Patient {
  id: string;
  doctor_id: string;
  diagnosis_label: string | null;
  discreet_mode: boolean;
  consent_at: string | null;
  caregiver_phone: string | null;
  caregiver_alert_after: number;
}

export interface Medication {
  id: string;
  patient_id: string;
  source: MedSource;
  name: string;
  dose: string | null;
  form: string | null;
  frequency: MedFrequency;
  times: string[];
  channel: ReminderChannel;
  active: boolean;
}

export interface Dose {
  id: string;
  medication_id: string;
  patient_id: string;
  scheduled_at: string;
  status: DoseStatus;
  acted_at: string | null;
  skip_reason: SkipReason | null;
}

export interface Checkin {
  id: string;
  patient_id: string;
  day: string;
  mood: number | null;
  energy: number | null;
  anxiety: number | null;
  appetite: number | null;
  irritability: number | null;
  sleep_hours: number | null;
  activity: ActivityLevel | null;
  side_effects: string[];
  water_count: number;
  meal_count: number;
  free_note: string | null;
}

export interface PatientModule {
  patient_id: string;
  module: CheckinModule;
  enabled: boolean;
}
