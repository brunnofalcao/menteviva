import { createServerSupabase } from "@/lib/supabase-server";
import Link from "next/link";

export default async function DashboardPage() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: prof } = await supabase.from("profiles").select("full_name").eq("id", user.id).single();
  const first = (prof?.full_name ?? "").replace(/^Dra?\.?\s*/, "").split(" ")[0];
  const h = new Date().getHours();
  const greet = h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite";

  const { data: patients } = await supabase
    .from("patients").select("id, diagnosis_label, profiles(full_name)");

  const since7 = new Date(Date.now() - 7 * 864e5).toISOString();
  const since2 = new Date(Date.now() - 2 * 864e5).toISOString();
  const todayStr = new Date().toISOString().slice(0, 10);
  const yesterdayStr = new Date(Date.now() - 864e5).toISOString().slice(0, 10);

  const enriched = await Promise.all((patients ?? []).map(async (p) => {
    const { data: adh } = await supabase.rpc("adherence_rate", { p_patient: p.id, p_days: 30 });
    const { data: doses } = await supabase
      .from("doses").select("status, skip_reason, scheduled_at")
      .eq("patient_id", p.id).gte("scheduled_at", since7);
    const missed = (doses ?? []).filter((d) => d.status === "skipped").length;
    const ranOut = (doses ?? []).some((d) => d.skip_reason === "ran_out");
    // faltas recentes (últimas 48h) = sinal do que mudou
    const missedRecent = (doses ?? []).filter((d) => d.status === "skipped" && d.scheduled_at >= since2).length;

    // último check-in: humor baixo é sinal clínico
    const { data: lastCk } = await supabase
      .from("checkins").select("mood, day, side_effects, free_note")
      .eq("patient_id", p.id).order("day", { ascending: false }).limit(1).single();
    const lowMood = (lastCk?.mood ?? 5) <= 2;
    const checkedToday = lastCk?.day === todayStr;

    const risk = missed >= 3 || ranOut || lowMood;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const prof: any = p.profiles;
    return {
      id: p.id, name: prof?.full_name ?? "Paciente", diag: p.diagnosis_label,
      adh: Number(adh ?? 0), missed, missedRecent, ranOut, lowMood, risk,
      mood: lastCk?.mood ?? null, checkedToday,
      effects: lastCk?.side_effects ?? [], note: lastCk?.free_note ?? null,
    };
  }));

  // ordenação clínica: risco primeiro, depois menor adesão
  enriched.sort((a, b) => (a.risk === b.risk ? a.adh - b.adh : a.risk ? -1 : 1));
  const atRisk = enriched.filter((e) => e.risk);
  const avgAdh = enriched.length ? Math.round(enriched.reduce((s, e) => s + e.adh, 0) / enriched.length) : 0;

  // CAMADA "O QUE MUDOU" — sinais das últimas 48h
  const changes: { id: string; name: string; text: string; tone: "alert" | "info" | "good" }[] = [];
  for (const e of enriched) {
    if (e.ranOut) changes.push({ id: e.id, name: e.name, text: "relatou que o remédio acabou", tone: "alert" });
    else if (e.missedRecent >= 2) changes.push({ id: e.id, name: e.name, text: `faltou ${e.missedRecent} doses nas últimas 48h`, tone: "alert" });
    else if (e.lowMood) changes.push({ id: e.id, name: e.name, text: `registrou humor baixo ${e.mood ? `(${["😣","😔","😐","🙂","😄"][e.mood-1]})` : ""}`, tone: "info" });
    else if ((e.effects?.length ?? 0) > 0 && !e.effects.includes("Sem efeitos")) changes.push({ id: e.id, name: e.name, text: `relatou: ${e.effects.join(", ")}`, tone: "info" });
  }

  const { count: checkinsToday } = await supabase
    .from("checkins").select("id", { count: "exact", head: true }).eq("day", todayStr);

  return (
    <div className="mv-page">
      <div style={{ fontSize: 12.5, color: "#9BA29D", fontWeight: 600 }}>Painel clínico</div>
      <h1 className="mv-title" style={{ fontSize: 30, fontWeight: 700, margin: "6px 0 4px" }}>{greet}{first ? `, ${first}` : ""}</h1>
      <p style={{ color: "#646B67", fontSize: 14, marginBottom: 22 }}>
        {atRisk.length > 0
          ? `${atRisk.length} ${atRisk.length === 1 ? "paciente precisa" : "pacientes precisam"} da sua atenção hoje`
          : `Acompanhando ${enriched.length} paciente(s) — tudo estável agora`}
      </p>

      {/* ════ CAMADA 1: QUEM PRECISA DE MIM AGORA ════ */}
      <section style={{ ...panel, marginBottom: 18, border: atRisk.length ? "1px solid #EAD9B8" : "1px solid #E7E9E7" }}>
        <div style={{ ...ph, background: atRisk.length ? "#FFFBF2" : "#fff" }}>
          <b style={{ color: atRisk.length ? "#8A6212" : "#1A1D1C" }}>
            {atRisk.length ? "⚑ Precisam de você agora" : "✓ Ninguém em risco agora"}
          </b>
          {atRisk.length > 0 && <span style={{ fontSize: 12.5, color: "#8A6212", fontWeight: 600 }}>{atRisk.length}</span>}
        </div>
        <div style={{ padding: atRisk.length ? "4px 0" : "16px 19px" }}>
          {atRisk.length === 0 && <p style={{ fontSize: 13.5, color: "#646B67" }}>Todos os pacientes estão dentro do esperado. Você pode usar este tempo para revisar protocolos.</p>}
          {atRisk.map((e) => (
            <Link key={e.id} href={`/medico/paciente/${e.id}`} style={rowLink}>
              <span style={{ ...avatar, background: "#FBF0E3", color: "#9A6320" }}>{initials(e.name)}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <b style={{ fontSize: 14.5 }}>{e.name}</b>
                <p style={{ fontSize: 12.5, color: "#8A6212", marginTop: 1 }}>
                  {e.ranOut && "Remédio acabou — risco de interrupção. "}
                  {e.missed >= 3 && `Faltou ${e.missed} doses na semana. `}
                  {e.lowMood && "Humor baixo no último check-in. "}
                </p>
              </div>
              <span style={{ textAlign: "right", flexShrink: 0 }}>
                <b style={{ fontSize: 17, color: e.adh < 60 ? "#C0853B" : "#646B67" }}>{e.adh}%</b>
                <small style={{ display: "block", fontSize: 10.5, color: "#9BA29D" }}>adesão 30d</small>
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* ════ CAMADA 2: O QUE MUDOU ════ */}
      <section style={{ ...panel, marginBottom: 18 }}>
        <div style={ph}><b>O que mudou nas últimas 48h</b></div>
        <div style={{ padding: "4px 0" }}>
          {changes.length === 0 && <p style={{ fontSize: 13.5, color: "#646B67", padding: "12px 19px" }}>Sem novos sinais. Nenhuma mudança relevante registrada.</p>}
          {changes.slice(0, 8).map((c, i) => (
            <Link key={i} href={`/medico/paciente/${c.id}`} style={{ ...rowLink, padding: "11px 19px" }}>
              <span style={{ width: 8, height: 8, borderRadius: 4, marginTop: 6, flexShrink: 0, background: c.tone === "alert" ? "#C0853B" : c.tone === "good" ? "#43A57C" : "#9AA0A6" }} />
              <div style={{ flex: 1 }}>
                <span style={{ fontSize: 13.5 }}><b>{c.name}</b> <span style={{ color: "#646B67" }}>{c.text}</span></span>
              </div>
              <span style={{ color: "#C4C8CE", flexShrink: 0 }}>›</span>
            </Link>
          ))}
        </div>
      </section>

      {/* ════ CAMADA 3: VISÃO GERAL DA POPULAÇÃO ════ */}
      <div style={sectionLabel}>Visão geral</div>
      <div className="mv-kpis" style={{ marginBottom: 18 }}>
        <Kpi n={`${avgAdh}%`} l="Adesão média" accent />
        <Kpi n={String(enriched.length)} l="Pacientes ativos" />
        <Kpi n={String(atRisk.length)} l="Em risco" bad={atRisk.length > 0} />
        <Kpi n={`${checkinsToday ?? 0}`} l="Check-ins hoje" />
      </div>

      <section style={panel}>
        <div style={ph}><b>Todos os pacientes</b><Link href="/medico/pacientes" style={{ color: "var(--accent)", fontSize: 12.5, fontWeight: 600, textDecoration: "none" }}>Ver lista completa →</Link></div>
        <div style={{ padding: "4px 0" }}>
          {enriched.slice(0, 8).map((e) => (
            <Link key={e.id} href={`/medico/paciente/${e.id}`} style={{ ...rowLink, padding: "11px 19px" }}>
              <span style={{ ...avatar, width: 34, height: 34, background: e.risk ? "#FBF0E3" : "var(--accent)", color: e.risk ? "#9A6320" : "#fff", fontSize: 12 }}>{initials(e.name)}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <b style={{ fontSize: 14 }}>{e.name}</b>
                <small style={{ display: "block", color: "#9BA29D", fontSize: 12 }}>{e.diag ?? "Sem diagnóstico"}{e.checkedToday ? " · check-in hoje ✓" : ""}</small>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
                <div style={bar} className="mv-hide-sm"><i style={{ display: "block", height: "100%", borderRadius: 5, width: `${e.adh}%`, background: e.adh < 60 ? "#D4A24A" : e.adh < 80 ? "#E0B65E" : "#43A57C" }} /></div>
                {e.risk ? <span style={badgeR}>Risco</span> : e.adh < 80 ? <span style={badgeY}>Atenção</span> : <span style={badgeG}>Estável</span>}
              </div>
            </Link>
          ))}
          {enriched.length === 0 && <p style={{ fontSize: 13.5, color: "#646B67", padding: "14px 19px" }}>Nenhum paciente ainda. Cadastre em Pacientes.</p>}
        </div>
      </section>
    </div>
  );
}

function initials(n: string) { return n.split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase(); }
function Kpi({ n, l, accent, bad }: { n: string; l: string; accent?: boolean; bad?: boolean }) {
  return (
    <div style={{ background: "#fff", border: "1px solid #E7E9E7", borderRadius: 16, padding: 17 }}>
      <div style={{ fontSize: 30, fontWeight: 700, lineHeight: 1, color: bad ? "#B5793A" : accent ? "var(--accent)" : "#1A1D1C" }}>{n}</div>
      <div style={{ fontSize: 12.5, color: "#646B67", marginTop: 7, fontWeight: 600 }}>{l}</div>
    </div>
  );
}

const panel: React.CSSProperties = { background: "#fff", border: "1px solid #E7E9E7", borderRadius: 18, overflow: "hidden" };
const ph: React.CSSProperties = { padding: "14px 19px", borderBottom: "1px solid #E7E9E7", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 15 };
const rowLink: React.CSSProperties = { display: "flex", alignItems: "center", gap: 12, padding: "12px 19px", borderBottom: "1px solid #F0F1F0", textDecoration: "none", color: "inherit" };
const avatar: React.CSSProperties = { width: 40, height: 40, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 13, flexShrink: 0 };
const bar: React.CSSProperties = { height: 7, borderRadius: 5, background: "#E7E9E7", width: 90, overflow: "hidden" };
const sectionLabel: React.CSSProperties = { fontSize: 12.5, fontWeight: 700, letterSpacing: ".04em", textTransform: "uppercase", color: "#9BA29D", padding: "4px 4px 12px", marginTop: 8 };
const badgeR: React.CSSProperties = { background: "#FBF0E3", color: "#9A6320", padding: "4px 10px", borderRadius: 20, fontWeight: 700, fontSize: 11 };
const badgeY: React.CSSProperties = { background: "#FAF0DA", color: "#8A6212", padding: "4px 10px", borderRadius: 20, fontWeight: 700, fontSize: 11 };
const badgeG: React.CSSProperties = { background: "#E2F3EC", color: "#1E7A58", padding: "4px 10px", borderRadius: 20, fontWeight: 700, fontSize: 11 };
