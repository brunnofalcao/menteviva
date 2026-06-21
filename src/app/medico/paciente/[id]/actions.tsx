"use server";
import { createServerSupabase } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";

export async function prescribeMedication(formData: FormData) {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const patientId = String(formData.get("patientId"));
  const name = String(formData.get("name")).trim();
  const dose = String(formData.get("dose")).trim();
  const form = String(formData.get("form"));
  const frequency = String(formData.get("frequency"));
  const channel = String(formData.get("channel"));
  const endsAtRaw = String(formData.get("ends_at") || "").trim();
  const ends_at = endsAtRaw || null;
  const active_ingredient = String(formData.get("active_ingredient") || "").trim() || null;
  const indication = String(formData.get("indication") || "").trim() || null;
  const instructions = String(formData.get("instructions") || "").trim() || null;
  const caregiver_instructions = String(formData.get("caregiver_instructions") || "").trim() || null;
  const stockRaw = String(formData.get("stock_units") || "").trim();
  const stock_units = stockRaw ? parseInt(stockRaw) : null;
  const refillRaw = String(formData.get("refill_alert_days") || "").trim();
  const refill_alert_days = refillRaw ? parseInt(refillRaw) : null;
  const times = String(formData.get("times"))
    .split(",").map((t) => t.trim()).filter(Boolean);

  if (!name || times.length === 0) return;

  const { data: med } = await supabase.from("medications").insert({
    patient_id: patientId,
    source: "doctor",
    name, dose, form, frequency, times, channel, ends_at,
    active_ingredient, indication, instructions, caregiver_instructions,
    stock_units, refill_alert_days,
    created_by: user.id,
  }).select("id").single();

  // auditoria
  await supabase.rpc("log_action", {
    p_action: "prescribe_medication", p_entity: "medication",
    p_entity_id: med?.id ?? null, p_patient: patientId,
    p_detail: { name, dose },
  });
  revalidatePath(`/medico/paciente/${patientId}`);
}

export async function editMedication(formData: FormData) {
  const supabase = await createServerSupabase();
  const medId = String(formData.get("medId"));
  const patientId = String(formData.get("patientId"));
  const name = String(formData.get("name")).trim();
  const dose = String(formData.get("dose")).trim();
  const form = String(formData.get("form"));
  const frequency = String(formData.get("frequency"));
  const channel = String(formData.get("channel"));
  const endsAtRaw = String(formData.get("ends_at") || "").trim();
  const ends_at = endsAtRaw || null;
  const times = String(formData.get("times")).split(",").map((t) => t.trim()).filter(Boolean);
  if (!name || times.length === 0) return;

  await supabase.from("medications")
    .update({ name, dose, form, frequency, times, channel, ends_at })
    .eq("id", medId);
  // regenera doses futuras conforme a edição
  await supabase.rpc("generate_doses", { p_med: medId });
  revalidatePath(`/medico/paciente/${patientId}`);
}

export async function applyProtocol(formData: FormData) {
  const supabase = await createServerSupabase();
  const patientId = String(formData.get("patientId"));
  const protocol = String(formData.get("protocol"));
  await supabase.rpc("apply_protocol", { p_patient: patientId, p_protocol: protocol });
  revalidatePath(`/medico/paciente/${patientId}`);
}

export async function setDiagnosis(formData: FormData) {
  const supabase = await createServerSupabase();
  const patientId = String(formData.get("patientId"));
  const text = String(formData.get("diagnosis") || "");
  await supabase.rpc("set_diagnosis", { p_patient: patientId, p_text: text });
  revalidatePath(`/medico/paciente/${patientId}`);
}

export async function toggleModule(formData: FormData) {
  const supabase = await createServerSupabase();
  const patientId = String(formData.get("patientId"));
  const module = String(formData.get("module"));
  const enabled = String(formData.get("enabled")) === "true";
  // liga/desliga o módulo para este paciente (upsert)
  await supabase.from("patient_modules")
    .upsert({ patient_id: patientId, module, enabled: !enabled }, { onConflict: "patient_id,module" });
  revalidatePath(`/medico/paciente/${patientId}`);
}

export async function pauseMedication(formData: FormData) {
  const supabase = await createServerSupabase();
  const medId = String(formData.get("medId"));
  const patientId = String(formData.get("patientId"));
  const active = String(formData.get("active")) === "true";
  await supabase.from("medications").update({ active: !active }).eq("id", medId);
  revalidatePath(`/medico/paciente/${patientId}`);
}

export async function deleteMedication(formData: FormData) {
  const supabase = await createServerSupabase();
  const medId = String(formData.get("medId"));
  const patientId = String(formData.get("patientId"));
  await supabase.from("medications").delete().eq("id", medId);
  revalidatePath(`/medico/paciente/${patientId}`);
}

export async function editPatientInfo(formData: FormData) {
  const supabase = await createServerSupabase();
  const patientId = String(formData.get("patientId"));
  const full_name = String(formData.get("full_name") || "").trim();
  const phone = String(formData.get("phone") || "").trim();
  if (full_name) await supabase.from("profiles").update({ full_name }).eq("id", patientId);
  if (phone) await supabase.from("patients").update({ phone }).eq("id", patientId);
  revalidatePath(`/medico/paciente/${patientId}`);
}
