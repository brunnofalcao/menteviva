import { createServerSupabase } from "@/lib/supabase-server";

export default async function JornadaPage() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: adh } = await supabase.rpc("adherence_rate", { p_patient: user.id, p_days: 30 });

  // doses dos últimos 21 dias agrupadas por dia -> status do dia
  const since = new Date(Date.now() - 21 * 864e5).toISOString();
  const { data: doses } = await supabase
    .from("doses").select("scheduled_at, status").eq("patient_id", user.id).gte("scheduled_at", since);

  const byDay: Record<string, { total: number; taken: number }> = {};
  (doses ?? []).forEach((d) => {
    const k = d.scheduled_at.slice(0, 10);
    byDay[k] ??= { total: 0, taken: 0 };
    byDay[k].total++;
    if (d.status === "taken") byDay[k].taken++;
  });
  const days = Array.from({ length: 21 }, (_, i) => {
    const dt = new Date(Date.now() - (20 - i) * 864e5).toISOString().slice(0, 10);
    const r = byDay[dt];
    const cls = !r ? "none" : r.taken === r.total ? "f" : r.taken === 0 ? "m" : "p";
    return { n: new Date(dt).getDate(), cls };
  });

  // humor últimos 7 checkins
  const { data: checkins } = await supabase
    .from("checkins").select("day, mood, sleep_hours, activity").eq("patient_id", user.id)
    .order("day", { ascending: false }).limit(7);
  const moods = (checkins ?? []).reverse();
  const activeDays = moods.filter((c) => c.activity && c.activity !== "still").length;

  const color = (c: string) => ({ f: "#43A57C", p: "#D4A24A", m: "#C2C6CB", none: "#EEF0F2" }[c]!);

  return (
    <main style={{ maxWidth: 440, margin: "0 auto", padding: "16px 16px 96px" }}>
      <h1 style={{ fontSize: 30, fontWeight: 800, padding: "8px 4px 16px" }}>Sua jornada</h1>

      <div style={{ ...card, textAlign: "center" }}>
        <div style={eyebrow}>Adesão · últimos 30 dias</div>
        <div style={{ fontSize: 46, fontWeight: 800, color: "var(--accent)", lineHeight: 1 }}>{Number(adh ?? 0)}%</div>
        {Number(adh ?? 0) >= 80 && <span style={badge}>No seu ritmo</span>}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 6, marginTop: 14 }}>
          {days.map((d, i) => (
            <div key={i} style={{ aspectRatio: "1", borderRadius: 8, background: color(d.cls), display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 600, color: d.cls === "none" ? "#A4A8B2" : "#fff" }}>{d.n}</div>
          ))}
        </div>
        <div style={{ display: "flex", gap: 13, justifyContent: "center", fontSize: 11, color: "var(--label-2)", fontWeight: 600, marginTop: 10 }}>
          <span><i style={{ display: "inline-block", width: 9, height: 9, borderRadius: 3, background: "#43A57C", marginRight: 4 }} />Completo</span>
          <span><i style={{ display: "inline-block", width: 9, height: 9, borderRadius: 3, background: "#D4A24A", marginRight: 4 }} />Parcial</span>
          <span><i style={{ display: "inline-block", width: 9, height: 9, borderRadius: 3, background: "#C2C6CB", marginRight: 4 }} />Sem registro</span>
        </div>
      </div>

      {moods.length > 0 && (
        <div style={card}>
          <div style={eyebrow}>Seu humor na semana</div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 7, height: 74, padding: "8px 4px 0" }}>
            {moods.map((c, i) => (
              <div key={i} style={{ flex: 1, background: "var(--accent)", borderRadius: "5px 5px 0 0", height: `${((c.mood ?? 1) / 5) * 100}%`, minHeight: 6, opacity: .88 }} title={`${c.mood ?? "-"}/5`} />
            ))}
          </div>
          <p style={{ color: "var(--label-2)", fontSize: 13, padding: "6px 4px 0" }}>
            {activeDays > 0
              ? `Nos ${activeDays} dia(s) em que você se moveu, seu humor tendeu a ficar mais alto.`
              : "Registre seu humor e atividade alguns dias para ver padrões aqui."}
          </p>
        </div>
      )}
    </main>
  );
}

const card: React.CSSProperties = { background: "var(--card)", borderRadius: 22, padding: 17, marginBottom: 13 };
const eyebrow: React.CSSProperties = { fontSize: 12, fontWeight: 700, color: "#A4A8B2", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 6 };
const badge: React.CSSProperties = { display: "inline-block", background: "#E2F3EC", color: "#1E7A58", padding: "4px 12px", borderRadius: 20, fontWeight: 700, fontSize: 12, marginTop: 6 };
