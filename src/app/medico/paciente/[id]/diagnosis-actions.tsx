"use server";
import { createServerSupabase } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";

export async function searchCID(term: string, version = "10") {
  const supabase = await createServerSupabase();
  const t = term.trim();
  if (t.length < 2) return [];
  const { data } = await supabase
    .from("cid_catalog")
    .select("code, description, chapter, version")
    .eq("version", version)
    .or(`code.ilike.${t}%,description.ilike.%${t}%`)
    .limit(20);
  return data ?? [];
}

export async function setDiagnosisWithCID(patientId: string, label: string, cid: string, version: string) {
  const supabase = await createServerSupabase();
  await supabase.rpc("set_diagnosis", { p_patient: patientId, p_text: label, p_cid: cid, p_version: version });
  // aplica o protocolo de módulos com base no capítulo/diagnóstico
  await supabase.rpc("apply_protocol", { p_patient: patientId, p_protocol: label });
  revalidatePath(`/medico/paciente/${patientId}`);
}
