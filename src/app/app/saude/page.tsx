import { createServerSupabase } from "@/lib/supabase-server";
import HealthConsent from "./HealthConsent";

const METRIC_LABEL: Record<string, { label: string; unit: string; icon: string }> = {
  sleep_hours: { label: "Sono", unit: "h", icon: "🌙" },
  steps: { label: "Passos", unit: "", icon: "👟" },
  heart_rate: { label: "Frequência cardíaca", unit: "bpm", icon: "❤️" },
  active_energy: { label: "Atividade", unit: "kcal", icon: "🔥" },
  resting_hr: { label: "FC repouso", unit: "bpm", icon: "💗" },
  hrv: { label: "Variabilidade FC", unit: "ms", icon: "📈" },
};

export default async function SaudePage() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: me } = user
    ? await supabase.from("patients").select("health_consent, healthkit_consent").eq("id", user.id).maybeSingle()
    : { data: null };

  // últimos sinais (vazio até o app nativo enviar)
  const { data: signals } = await supabase
    .from("health_signals").select("metric, value, unit, measured_at")
    .order("measured_at", { ascending: false }).limit(30);

  // agrupa por métrica, pega o mais recente de cada
  const latest = new Map<string, { value: number; unit: string; at: string }>();
  for (const s of signals ?? []) {
    if (!latest.has(s.metric)) latest.set(s.metric, { value: s.value, unit: s.unit, at: s.measured_at });
  }

  return (
    <main style={{ maxWidth: 560, margin: "0 auto", padding: "20px 16px 90px" }}>
      <h1 style={{ fontSize: 26, fontWeight: 800, margin: "6px 0 4px" }}>Saúde</h1>
      <p style={{ color: "#646B67", fontSize: 14, marginBottom: 20 }}>
        Conecte o app de saúde do seu celular (Apple Saúde no iPhone, Health Connect no Android) para que seu médico acompanhe sono, passos e batimentos — de forma passiva e segura.
      </p>

      <HealthConsent consent={(me?.health_consent ?? me?.healthkit_consent) ?? false} />

      {/* sinais */}
      <div style={{ fontSize: 12, fontWeight: 700, color: "#9BA29D", textTransform: "uppercase", letterSpacing: ".05em", margin: "22px 0 11px" }}>
        Seus sinais recentes
      </div>
      {latest.size === 0 ? (
        <div style={{ background: "#F8F9F8", border: "1px dashed #DcDdDc", borderRadius: 14, padding: 20, textAlign: "center", color: "#646B67", fontSize: 13.5 }}>
          Nenhum dado ainda. Quando o app estiver conectado ao Apple Saúde ou Health Connect, seus sinais aparecerão aqui.
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 10 }}>
          {[...latest.entries()].map(([metric, v]) => {
            const m = METRIC_LABEL[metric] ?? { label: metric, unit: "", icon: "•" };
            return (
              <div key={metric} style={{ background: "#fff", border: "1px solid #E7E9E7", borderRadius: 14, padding: 15 }}>
                <div style={{ fontSize: 20 }}>{m.icon}</div>
                <div style={{ fontSize: 22, fontWeight: 800, marginTop: 6 }}>{v.value}<span style={{ fontSize: 13, fontWeight: 600, color: "#646B67" }}> {m.unit || v.unit}</span></div>
                <div style={{ fontSize: 12, color: "#646B67" }}>{m.label}</div>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
