import { createServerSupabase } from "@/lib/supabase-server";
import Link from "next/link";

export default async function DashboardPage() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: prof } = await supabase.from("profiles").select("full_name").eq("id", user.id).single();
  const first = (prof?.full_name ?? "").replace(/^Dra?\.?\s*/, "").split(" ")[0];

  // pacientes do médico + adesão de cada um
  const { data: patients } = await supabase
    .from("patients").select("id, diagnosis_label, profiles(full_name)");

  const enriched = await Promise.all((patients ?? []).map(async (p) => {
    const { data: adh } = await supabase.rpc("adherence_rate", { p_patient: p.id, p_days: 30 });
    const since = new Date(Date.now() - 7 * 864e5).toISOString();
    const { data: doses } = await supabase
      .from("doses").select("status, skip_reason, acted_at")
      .eq("patient_id", p.id).gte("scheduled_at", since);
    const missed = (doses ?? []).filter((d) => d.status === "skipped").length;
    const ranOut = (doses ?? []).some((d) => d.skip_reason === "ran_out");
    const risk = missed >= 3 || ranOut;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const prof: any = p.profiles;
    return { id: p.id, name: prof?.full_name ?? "Paciente", diag: p.diagnosis_label, adh: Number(adh ?? 0), missed, ranOut, risk };
  }));

  enriched.sort((a, b) => (a.risk === b.risk ? a.adh - b.adh : a.risk ? -1 : 1));
  const atRisk = enriched.filter((e) => e.risk);
  const avgAdh = enriched.length ? Math.round(enriched.reduce((s, e) => s + e.adh, 0) / enriched.length) : 0;

  // check-ins de hoje
  const today = new Date().toISOString().slice(0, 10);
  const { count: checkinsToday } = await supabase
    .from("checkins").select("id", { count: "exact", head: true }).eq("day", today);

  return (
    <div style={{ padding: "26px 32px 60px", maxWidth: 1000 }}>
      <div style={{ fontSize: 12.5, color: "#9BA29D", fontWeight: 600 }}>Visão geral</div>
      <h1 style={{ fontSize: 30, fontWeight: 700, margin: "6px 0 4px" }}>Bom dia{first ? `, ${first}` : ""}</h1>
      <p style={{ color: "#646B67", fontSize: 14, marginBottom: 22 }}>
        {enriched.length} paciente(s) ativo(s) · {atRisk.length} precisa(m) de atenção
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 15, marginBottom: 22 }}>
        <Kpi n={`${avgAdh}%`} l="Adesão média" accent />
        <Kpi n={String(enriched.length)} l="Pacientes ativos" />
        <Kpi n={String(atRisk.length)} l="Em risco" bad={atRisk.length > 0} />
        <Kpi n={String(checkinsToday ?? 0)} l="Check-ins hoje" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 18 }}>
        <section style={panel}>
          <div style={ph}><b>Pacientes — por quem precisa de você</b><Link href="/medico/pacientes" style={{ color: "var(--accent)", fontSize: 12, fontWeight: 600, textDecoration: "none" }}>Ver todos →</Link></div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr>{["Paciente", "Adesão 30d", "Status"].map((h) => <th key={h} style={th}>{h}</th>)}</tr></thead>
            <tbody>
              {enriched.slice(0, 6).map((e) => (
                <tr key={e.id}>
                  <td style={td}>
                    <Link href={`/medico/paciente/${e.id}`} style={{ display: "flex", alignItems: "center", gap: 11, textDecoration: "none", color: "inherit" }}>
                      <span style={{ ...avatar, background: e.risk ? "#FBE6E4" : "var(--accent)", color: e.risk ? "#A8392F" : "#fff" }}>{initials(e.name)}</span>
                      <span><b style={{ fontSize: 14 }}>{e.name}</b><small style={{ display: "block", color: "#9BA29D", fontSize: 12 }}>{e.diag ?? "—"}</small></span>
                    </Link>
                  </td>
                  <td style={td}><div style={bar}><i style={{ display: "block", height: "100%", borderRadius: 5, width: `${e.adh}%`, background: e.adh < 60 ? "#D2554C" : e.adh < 80 ? "#C8902F" : "#2FA37C" }} /></div></td>
                  <td style={td}>{e.risk ? <span style={badgeR}>Em risco</span> : e.adh < 80 ? <span style={badgeY}>Atenção</span> : <span style={badgeG}>Estável</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section style={panel}>
          <div style={ph}><b>Precisa de atenção</b></div>
          <div style={{ padding: "6px 19px 14px" }}>
            {atRisk.length === 0 && <p style={{ fontSize: 13.5, color: "#646B67", padding: "10px 0" }}>Ninguém em risco agora. 💚</p>}
            {atRisk.map((e) => (
              <Link key={e.id} href={`/medico/paciente/${e.id}`} style={{ display: "flex", gap: 11, padding: "12px 0", borderBottom: "1px solid #E7E9E7", textDecoration: "none", color: "inherit" }}>
                <span style={{ width: 9, height: 9, borderRadius: 5, background: "#D2554C", marginTop: 5, flexShrink: 0 }} />
                <div>
                  <b style={{ fontSize: 13.5 }}>{e.name}</b>
                  <p style={{ fontSize: 12.5, color: "#646B67" }}>
                    {e.missed >= 3 && `Faltou ${e.missed} doses esta semana. `}
                    {e.ranOut && `Relatou "acabou o remédio". `}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function initials(n: string) { return n.split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase(); }
function Kpi({ n, l, accent, bad }: { n: string; l: string; accent?: boolean; bad?: boolean }) {
  return (
    <div style={{ background: "#fff", border: "1px solid #E7E9E7", borderRadius: 16, padding: 17 }}>
      <div style={{ fontSize: 32, fontWeight: 700, lineHeight: 1, color: bad ? "#D2554C" : accent ? "var(--accent)" : "#1A1D1C" }}>{n}</div>
      <div style={{ fontSize: 12.5, color: "#646B67", marginTop: 7, fontWeight: 600 }}>{l}</div>
    </div>
  );
}

const panel: React.CSSProperties = { background: "#fff", border: "1px solid #E7E9E7", borderRadius: 18, overflow: "hidden" };
const ph: React.CSSProperties = { padding: "15px 19px", borderBottom: "1px solid #E7E9E7", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 15 };
const th: React.CSSProperties = { textAlign: "left", fontSize: 11, textTransform: "uppercase", letterSpacing: ".06em", color: "#9BA29D", fontWeight: 700, padding: "11px 19px", background: "#F8F9F8" };
const td: React.CSSProperties = { padding: "13px 19px", borderBottom: "1px solid #E7E9E7", fontSize: 14 };
const avatar: React.CSSProperties = { width: 38, height: 38, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 13, flexShrink: 0 };
const bar: React.CSSProperties = { height: 7, borderRadius: 5, background: "#E7E9E7", width: 96, overflow: "hidden" };
const badgeR: React.CSSProperties = { background: "#FBE6E4", color: "#A8392F", padding: "4px 10px", borderRadius: 20, fontWeight: 700, fontSize: 11 };
const badgeY: React.CSSProperties = { background: "#FAF0DA", color: "#8A6212", padding: "4px 10px", borderRadius: 20, fontWeight: 700, fontSize: 11 };
const badgeG: React.CSSProperties = { background: "#E2F3EC", color: "#1E7A58", padding: "4px 10px", borderRadius: 20, fontWeight: 700, fontSize: 11 };
