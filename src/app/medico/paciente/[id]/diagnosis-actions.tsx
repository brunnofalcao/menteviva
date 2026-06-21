"use server";
import { createServerSupabase } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";

export async function searchCID(term: string, version = "10") {
  const supabase = await createServerSupabase();
  const t = term.trim();
  if (t.length < 2) return [];

  // sanitiza o termo para o PostgREST (remove vírgulas e parênteses que quebram o .or())
  const safe = t.replace(/[(),]/g, " ").trim();

  // busca por descrição (mais comum) — ilike é case-insensitive
  const byDesc = await supabase
    .from("cid_catalog")
    .select("code, description, chapter, version")
    .eq("version", version)
    .ilike("description", `%${safe}%`)
    .limit(20);

  // busca por código (prefixo) — ex.: "F41"
  const byCode = await supabase
    .from("cid_catalog")
    .select("code, description, chapter, version")
    .eq("version", version)
    .ilike("code", `${safe}%`)
    .limit(20);

  // junta sem duplicar
  const map = new Map<string, { code: string; description: string; chapter: string; version: string }>();
  for (const r of [...(byCode.data ?? []), ...(byDesc.data ?? [])]) map.set(r.code, r);
  return [...map.values()].slice(0, 20);
}

export async function setDiagnosisWithCID(patientId: string, label: string, cid: string, version: string) {
  const supabase = await createServerSupabase();
  await supabase.rpc("set_diagnosis", { p_patient: patientId, p_text: label, p_cid: cid, p_version: version });
  // aplica o protocolo de módulos com base no capítulo/diagnóstico
  await supabase.rpc("apply_protocol", { p_patient: patientId, p_protocol: label });
  revalidatePath(`/medico/paciente/${patientId}`);
}
