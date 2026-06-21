"use server";
import { createServerSupabase } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";

export async function addSupportMember(formData: FormData) {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const patientId = String(formData.get("patientId"));
  const full_name = String(formData.get("full_name")).trim();
  const relationship = String(formData.get("relationship"));
  const phone = String(formData.get("phone") || "").trim() || null;
  const email = String(formData.get("email") || "").trim() || null;
  const role = String(formData.get("role") || "family"); // family | caregiver | nurse

  if (!full_name) return;

  await supabase.from("support_network").insert({
    patient_id: patientId,
    full_name, relationship, phone, email,
    is_caregiver: role === "caregiver",
    is_nurse: role === "nurse",
    // cuidador e enfermeiro já entram com mais permissões
    can_view_symptoms: role !== "family",
    can_register_events: role !== "family",
    can_view_reports: role === "caregiver" || role === "nurse",
    notify_priority: role === "caregiver" ? 1 : role === "nurse" ? 2 : 5,
    created_by: user.id,
  });
  revalidatePath(`/medico/paciente/${patientId}`);
}

export async function toggleSupportPerm(formData: FormData) {
  const supabase = await createServerSupabase();
  const id = String(formData.get("memberId"));
  const patientId = String(formData.get("patientId"));
  const field = String(formData.get("field"));
  const value = String(formData.get("value")) === "true";
  const allowed = ["can_view_schedule", "can_view_adherence", "can_view_symptoms", "can_register_events", "can_view_reports"];
  if (!allowed.includes(field)) return;
  await supabase.from("support_network").update({ [field]: value }).eq("id", id);
  revalidatePath(`/medico/paciente/${patientId}`);
}

export async function removeSupportMember(formData: FormData) {
  const supabase = await createServerSupabase();
  const id = String(formData.get("memberId"));
  const patientId = String(formData.get("patientId"));
  await supabase.from("support_network").delete().eq("id", id);
  revalidatePath(`/medico/paciente/${patientId}`);
}

export async function registerEvent(formData: FormData) {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const patientId = String(formData.get("patientId"));
  const category = String(formData.get("category"));
  const type = String(formData.get("type"));
  const severity = String(formData.get("severity") || "low");
  const note = String(formData.get("note") || "").trim() || null;

  await supabase.from("patient_events").insert({
    patient_id: patientId, category, type, severity, note,
    reported_by: user.id, reporter_role: "doctor",
  });
  revalidatePath(`/medico/paciente/${patientId}`);
}

export async function generateMemberAccess(formData: FormData) {
  const supabase = await createServerSupabase();
  const memberId = String(formData.get("memberId"));
  const patientId = String(formData.get("patientId"));
  // gera o código e já marca permissões operacionais básicas
  await supabase.rpc("grant_member_access", { p_member: memberId });
  await supabase.from("support_network")
    .update({ can_confirm_dose: true, can_register_events: true, can_view_schedule: true })
    .eq("id", memberId);
  revalidatePath(`/medico/paciente/${patientId}`);
}
