"use server";
import { createServerSupabase } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";

// Busca no catálogo CID por código ou descrição.
export async function searchCID(term: string, version = "10") {
  const supabase = await createServerSupabase();
  const t = term.trim();
  if (!t) return [];
  // busca por código (prefixo) OU descrição (texto)
  const { data } = await supabase
    .from("cid_catalog")
    .select("code, description, chapter, version")
    .eq("version", version)
    .or(`code.ilike.${t}%,description.ilike.%${t}%`)
    .limit(20);
  return data ?? [];
}

// Salva dados do médico (nome, CRM) — com confirmação no front.
export async function saveDoctorInfo(formData: FormData) {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const full_name = String(formData.get("full_name") || "").trim();
  const crm = String(formData.get("crm") || "").trim();
  if (full_name) await supabase.from("profiles").update({ full_name }).eq("id", user.id);
  await supabase.from("doctors").update({ crm }).eq("id", user.id);
  revalidatePath("/medico/marca");
}

export async function addSpecialty(formData: FormData) {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const profession = String(formData.get("profession") || "Médico");
  const specialty = String(formData.get("specialty") || "").trim();
  const rqe = String(formData.get("rqe") || "").trim() || null;
  if (!specialty) return;
  await supabase.from("doctor_specialties").insert({ doctor_id: user.id, profession, specialty, rqe });
  revalidatePath("/medico/marca");
}

export async function removeSpecialty(formData: FormData) {
  const supabase = await createServerSupabase();
  const id = String(formData.get("id"));
  await supabase.from("doctor_specialties").delete().eq("id", id);
  revalidatePath("/medico/marca");
}
