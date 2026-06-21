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
  const { data: network } = await supabase
    .from("support_network").select("relationship, is_caregiver, is_nurse").eq("patient_id", patientId);
  const { data: activeMeds } = await supabase
    .from("medications").select("id").eq("patient_id", patientId).eq("active", true);

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
    total_medicamentos_ativos: (activeMeds ?? []).length,
    tamanho_rede_apoio: (network ?? []).length,
    tem_cuidador: (network ?? []).some((n: { is_caregiver: boolean }) => n.is_caregiver),
    tem_enfermeiro: (network ?? []).some((n: { is_nurse: boolean }) => n.is_nurse),
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
        max_tokens: 1100,
        messages: [{
          role: "user",
          content: `Você é um assistente clínico de apoio à decisão (NUNCA decide, apenas sugere). Em português, a partir dos dados reais do paciente, gere uma análise pré-consulta estruturada nestas seções:

1. RESUMO — adesão, medicamentos ativos, sintomas e eventos recentes (objetivo, clínico).
2. RISCOS — classifique e justifique: risco de abandono, de queda, de recaída, de crise, por polifarmácia. Só cite os que os dados sustentam.
3. PADRÕES — se houver, aponte correlações (ex.: piora de sono antes de crise, queda de adesão, ausência de check-ins como desengajamento).
4. PRÓXIMA MELHOR AÇÃO — 2 a 4 sugestões práticas (ex.: revisar medicamento, contatar cuidador, antecipar consulta, reforçar adesão).

REGRAS OBRIGATÓRIAS:
- Nunca apresente decisão como ordem. Use "Considere…", "Pode merecer atenção…", "Revisão recomendada…".
- Não invente nada além dos dados fornecidos.
- Ao fim, escreva: "⚠ Análise de apoio. A decisão clínica é do médico."

DADOS:\n${JSON.stringify(context, null, 2)}`,
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
