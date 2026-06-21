"use server";
import { createServerSupabase } from "@/lib/supabase-server";

// Gera um resumo clínico pré-consulta a partir dos dados reais do paciente.
// Usa a API da Anthropic. A chave fica em ANTHROPIC_API_KEY (env do servidor).
export async function generatePreConsultSummary(patientId: string): Promise<{ ok: boolean; summary?: string; error?: string }> {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Não autenticado." };

  // coleta os dados
  const { data: patient } = await supabase
    .from("patients").select("diagnosis_label, profiles(full_name)").eq("id", patientId).single();
  const { data: adh } = await supabase.rpc("adherence_rate", { p_patient: patientId, p_days: 30 });
  const { data: meds } = await supabase
    .from("medications").select("name, dose, frequency, started_at").eq("patient_id", patientId).eq("active", true);
  const { data: events } = await supabase
    .from("patient_events").select("type, occurred_at, note").eq("patient_id", patientId).order("occurred_at", { ascending: false }).limit(10);
  const { data: checkins } = await supabase
    .from("checkins").select("day, mood, anxiety, sleep_hours, appetite").eq("patient_id", patientId).order("day", { ascending: false }).limit(14);
  const { data: warnings } = await supabase.rpc("early_warnings", { p_patient: patientId });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pProf: any = patient?.profiles;

  // monta o contexto factual (nada inventado — só dados)
  const context = {
    paciente: pProf?.full_name ?? "Paciente",
    diagnostico: patient?.diagnosis_label ?? "não informado",
    adesao_30d: `${Number(adh ?? 0)}%`,
    medicamentos: (meds ?? []).map((m) => `${m.name} ${m.dose ?? ""} (${m.frequency})`),
    eventos_recentes: (events ?? []).map((e) => `${e.type}${e.note ? ": " + e.note : ""}`),
    checkins_recentes: (checkins ?? []).map((c) => ({ dia: c.day, humor: c.mood, ansiedade: c.anxiety, sono: c.sleep_hours, apetite: c.appetite })),
    sinais_alerta: (warnings ?? []).map((w: { label: string }) => w.label),
  };

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return { ok: false, error: "missing_key" };
  }

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 700,
        messages: [{
          role: "user",
          content: `Você é um assistente clínico. Gere um resumo pré-consulta CONCISO e objetivo para o médico, em português, a partir destes dados reais do paciente. Não invente nada além do fornecido. Estruture em: Adesão, Medicamentos, Sintomas/check-ins, Eventos, e "Sugestões de revisão" (2-3 tópicos que o médico deveria investigar nesta consulta). Seja direto e clínico.\n\nDADOS:\n${JSON.stringify(context, null, 2)}`,
        }],
      }),
    });
    const data = await res.json();
    const text = (data?.content ?? []).filter((b: { type: string }) => b.type === "text").map((b: { text: string }) => b.text).join("\n");
    if (!text) return { ok: false, error: "Resposta vazia da IA." };
    return { ok: true, summary: text };
  } catch {
    return { ok: false, error: "Falha ao conectar com a IA." };
  }
}
