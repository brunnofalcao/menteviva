"use server";
import { createServerSupabase } from "@/lib/supabase-server";

// Emite e salva um relatório versionado (autor, data, status, histórico).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function issueReport(patientId: string, kind: string, title: string, content: any) {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase.rpc("save_report", {
    p_patient: patientId,
    p_kind: kind,
    p_title: title,
    p_content: content,
    p_status: "issued",
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true, reportId: data };
}
