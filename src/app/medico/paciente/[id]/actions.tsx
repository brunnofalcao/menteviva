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
  const times = String(formData.get("times"))
    .split(",").map((t) => t.trim()).filter(Boolean);

  if (!name || times.length === 0) return;

  await supabase.from("medications").insert({
    patient_id: patientId,
    source: "doctor",
    name, dose, form, frequency, times, channel,
    created_by: user.id,
  });
  // o trigger no banco gera as doses automaticamente
  revalidatePath(`/medico/paciente/${patientId}`);
}

export async function applyProtocol(formData: FormData) {
  const supabase = await createServerSupabase();
  const patientId = String(formData.get("patientId"));
  const protocol = String(formData.get("protocol"));
  await supabase.rpc("apply_protocol", { p_patient: patientId, p_protocol: protocol });
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
