"use server";
import { createServerSupabase } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";

export async function caregiverConfirmDose(formData: FormData) {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const doseId = String(formData.get("doseId"));
  const patientId = String(formData.get("patientId"));
  const kind = String(formData.get("kind")); // taken | refused

  const status = kind === "refused" ? "refused" : "given_by_caregiver";
  await supabase.from("doses").update({
    status, acted_at: new Date().toISOString(),
    confirmed_by: user.id, confirmed_role: "caregiver",
  }).eq("id", doseId);

  await supabase.rpc("log_action", {
    p_action: kind === "refused" ? "dose_refused" : "dose_given_by_caregiver",
    p_entity: "dose", p_entity_id: doseId, p_patient: patientId, p_detail: {},
  });
  revalidatePath("/cuidador");
}

export async function caregiverRegisterEvent(formData: FormData) {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const patientId = String(formData.get("patientId"));
  const type = String(formData.get("type"));
  const category = String(formData.get("category") || "clinical");
  const note = String(formData.get("note") || "").trim() || null;

  await supabase.from("patient_events").insert({
    patient_id: patientId, category, type, severity: "medium",
    note, reported_by: user.id, reporter_role: "caregiver",
  });
  await supabase.rpc("log_action", {
    p_action: "register_event", p_entity: "event", p_entity_id: null,
    p_patient: patientId, p_detail: { type },
  });
  revalidatePath("/cuidador");
}
