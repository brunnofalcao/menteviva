import { createServerSupabase } from "@/lib/supabase-server";
import PrescribeForm from "./PrescribeForm";
import EditMedForm from "./EditMedForm";
import { applyProtocol, pauseMedication, deleteMedication } from "./actions";
import { medVisual, medSubtitle } from "@/lib/med-visual";

const PROTOCOLS = ["Depressão", "Transtorno bipolar", "Ansiedade", "TDAH", "Personalizado"];

export default async function FichaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createServerSupabase();

  const { data: patient } = await supabase
    .from("patients")
    .select("diagnosis_label, profiles(full_name), checkins(day, mood, energy, sleep_hours, side_effects, free_note)")
    .eq("id", id)
    .single();

  // medicamentos (prescritos e auto-incluídos) com tudo p/ gerenciar
  const { data: meds } = await supabase
    .from("medications")
    .select("id, name, dose, form, times, frequency, source, active, channel, ends_at")
    .eq("patient_id", id)
    .order("source");

  const { data: adh } = await supabase.rpc("adherence_rate", { p_patient: id, p_days: 30 });

  // doses recentes p/ detectar padrão de abandono
  const { data: doses } = await supabase
    .from("doses")
    .select("scheduled_at, status, skip_reason, medications(name)")
    .eq("patient_id", id)
    .order("scheduled_at", { ascending: false })
    .limit(40);

  const missed7 = (doses ?? []).filter(
    (d) => d.status === "skipped" &&
    new Date(d.scheduled_at) > new Date(Date.now() - 7 * 864e5)
  ).length;
  const ranOut = (doses ?? []).some((d) => d.skip_reason === "ran_out");
  const atRisk = missed7 >= 3 || ranOut;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const p: any = patient;
  const first = p?.profiles?.full_name?.split(" ")[0] ?? "Paciente";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const selfMeds = (meds ?? []).filter((m: any) => m.source === "patient");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const docMeds = (meds ?? []).filter((m: any) => m.source === "doctor");
  const checkins = (p?.checkins ?? []).slice(-7);

  return (
    <main className="mv-page" style={{ maxWidth: 900 }}>
      <div style={{ fontSize: 12.5, color: "#9BA29D", fontWeight: 600 }}>Pacientes › {p?.profiles?.full_name}</div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12, margin: "6px 0 20px" }}>
        <div>
          <h1 className="mv-title" style={{ fontSize: 28, fontWeight: 700 }}>{p?.profiles?.full_name}</h1>
          <p style={{ color: "#646B67", fontSize: 14 }}>{p?.diagnosis_label ?? "Sem protocolo definido"}</p>
        </div>
        {atRisk && <span style={badgeRisk}>⚠ Em risco de abandono</span>}
      </div>

      {atRisk && (
        <div style={noteRisk}>
          <b>Padrão detectado</b><br />
          {missed7 >= 3 && `Faltou ${missed7} doses nos últimos 7 dias. `}
          {ranOut && `"Acabou o remédio" registrado — possível abandono por acesso, não por vontade. `}
          Considere contato.
        </div>
      )}

      {/* KPIs */}
      <div className="mv-kpis" style={{ marginBottom: 20 }}>
        <Kpi n={`${Number(adh ?? 0)}%`} l="Adesão 30 dias" bad={Number(adh ?? 0) < 60} />
        <Kpi n={String(missed7)} l="Faltas 7 dias" bad={missed7 >= 3} />
        <Kpi n={String(checkins.length)} l="Check-ins 7d" />
        <Kpi n={String(selfMeds.length)} l="Auto-incluídos" />
      </div>

      {/* PROTOCOLO POR DIAGNÓSTICO */}
      <section style={{ ...panel, marginBottom: 18 }}>
        <div style={ph}><b>Protocolo / diagnóstico</b></div>
        <div style={{ padding: 16, display: "flex", gap: 9, flexWrap: "wrap" }}>
          {PROTOCOLS.map((proto) => (
            <form key={proto} action={applyProtocol}>
              <input type="hidden" name="patientId" value={id} />
              <input type="hidden" name="protocol" value={proto} />
              <button style={{ ...protoChip, ...(p?.diagnosis_label === proto ? protoOn : {}) }}>{proto}</button>
            </form>
          ))}
        </div>
        <p style={{ padding: "0 16px 14px", fontSize: 12.5, color: "#646B67" }}>
          Define quais módulos de check-in o paciente verá (humor, energia, sono, atividade…).
        </p>
      </section>

      {/* PRESCRIÇÕES (gerenciáveis) */}
      <section style={{ ...panel, marginBottom: 18 }}>
        <div style={ph}><b>Medicamentos prescritos</b></div>
        <div style={{ padding: 16 }}>
          {docMeds.length === 0 && <p style={{ fontSize: 13.5, color: "#646B67", marginBottom: 14 }}>Nenhuma prescrição ainda. Prescreva abaixo — as doses são geradas automaticamente.</p>}
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          {docMeds.map((m: any) => {
            const v = medVisual(m.name, m.form);
            return (
            <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 0", borderBottom: "1px solid #E7E9E7" }}>
              <span style={{ width: 38, height: 38, borderRadius: 11, background: v.color.bg, color: v.color.ink, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>{v.shape}</span>
              <div style={{ flex: 1 }}>
                <b style={{ fontSize: 14, opacity: m.active ? 1 : 0.5 }}>{m.name} {m.dose}</b>
                <div style={{ fontSize: 12.5, color: "#646B67" }}>{(m.times ?? []).join(" e ")} · {fmtFreq(m.frequency)} · {m.channel === "whatsapp" ? "WhatsApp" : "Notificação"}{m.ends_at ? ` · até ${new Date(m.ends_at + "T00:00:00").toLocaleDateString("pt-BR")}` : " · contínuo"}</div>
              </div>
              {!m.active && <span style={badgeY}>Pausado</span>}
              <EditMedForm med={m} patientId={id} />
              <form action={pauseMedication}>
                <input type="hidden" name="medId" value={m.id} />
                <input type="hidden" name="patientId" value={id} />
                <input type="hidden" name="active" value={String(m.active)} />
                <button style={miniBtn}>{m.active ? "Pausar" : "Reativar"}</button>
              </form>
              <form action={deleteMedication}>
                <input type="hidden" name="medId" value={m.id} />
                <input type="hidden" name="patientId" value={id} />
                <button style={{ ...miniBtn, color: "#B5793A" }}>Excluir</button>
              </form>
            </div>
          ); })}
          <div style={{ marginTop: 16 }}>
            <PrescribeForm patientId={id} />
          </div>
        </div>
      </section>

      <div className="mv-split">
        {/* doses recentes */}
        <section style={panel}>
          <div style={ph}><b>Doses recentes</b></div>
          <div style={{ padding: "4px 0" }}>
            {(doses ?? []).slice(0, 8).map((d, i) => {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const med: any = d.medications;
              const color = d.status === "taken" ? "#43A57C" : d.status === "skipped" ? "#B5793A" : "#D4A24A";
              return (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 11, padding: "10px 19px", borderBottom: "1px solid #E7E9E7" }}>
                  <span style={{ width: 8, height: 8, borderRadius: 4, background: color }} />
                  <span style={{ flex: 1, fontSize: 14 }}>{med?.name}</span>
                  <span style={{ fontSize: 12.5, color: "#646B67" }}>
                    {new Date(d.scheduled_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })} ·{" "}
                    {d.status === "taken" ? "tomada" : d.status === "skipped" ? `pulada${d.skip_reason ? ` (${d.skip_reason})` : ""}` : d.status}
                  </span>
                </div>
              );
            })}
          </div>
        </section>

        {/* auto-incluídos + checkins */}
        <section style={panel}>
          <div style={ph}><b>Incluídos pelo paciente</b></div>
          <div style={{ padding: "10px 19px 16px" }}>
            {selfMeds.length === 0 && <p style={{ fontSize: 13, color: "#646B67" }}>Nenhum.</p>}
            {selfMeds.map((m: any, i: number) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", fontSize: 14 }}>
                <b>{m.name}</b><span style={badgeY}>Revisar</span>
              </div>
            ))}
            <div style={{ fontSize: 11, fontWeight: 700, color: "#646B67", textTransform: "uppercase", letterSpacing: ".06em", margin: "14px 0 8px" }}>Últimos check-ins</div>
            {checkins.length === 0 && <p style={{ fontSize: 13, color: "#646B67" }}>Sem registros ainda.</p>}
            {checkins.map((c: any, i: number) => (
              <div key={i} style={{ fontSize: 13, padding: "6px 0", borderTop: i ? "1px solid #E7E9E7" : "none" }}>
                <b>{new Date(c.day).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}</b>{" "}
                {c.mood ? `humor ${c.mood}/5` : ""} {c.sleep_hours ? `· ${c.sleep_hours}h sono` : ""}
                {c.side_effects?.length ? <span style={{ color: "#C8902F" }}> · {c.side_effects.join(", ")}</span> : ""}
                {c.free_note ? <div style={{ color: "#646B67", fontStyle: "italic" }}>"{c.free_note}"</div> : ""}
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

function Kpi({ n, l, bad }: { n: string; l: string; bad?: boolean }) {
  return (
    <div style={{ background: "#fff", border: "1px solid #E7E9E7", borderRadius: 16, padding: 16 }}>
      <div style={{ fontSize: 30, fontWeight: 700, color: bad ? "#B5793A" : "#1A1D1C" }}>{n}</div>
      <div style={{ fontSize: 12.5, color: "#646B67", marginTop: 6, fontWeight: 600 }}>{l}</div>
    </div>
  );
}

const panel: React.CSSProperties = { background: "#fff", border: "1px solid #E7E9E7", borderRadius: 18, overflow: "hidden" };
const ph: React.CSSProperties = { padding: "15px 19px", borderBottom: "1px solid #E7E9E7", fontSize: 15 };
const badgeRisk: React.CSSProperties = { background: "#FBF0E3", color: "#9A6320", padding: "7px 13px", borderRadius: 20, fontWeight: 700, fontSize: 13 };
const badgeY: React.CSSProperties = { background: "#FAF0DA", color: "#8A6212", padding: "3px 9px", borderRadius: 20, fontWeight: 700, fontSize: 11 };
const noteRisk: React.CSSProperties = { background: "#FBF0E3", color: "#9A6320", borderRadius: 13, padding: "13px 16px", fontSize: 13.5, marginBottom: 18, lineHeight: 1.5 };
const protoChip: React.CSSProperties = { padding: "9px 14px", borderRadius: 11, border: "1.5px solid #E7E9E7", background: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" };
const protoOn: React.CSSProperties = { borderColor: "var(--accent)", background: "var(--accent-soft)", color: "var(--accent-ink)" };
const miniBtn: React.CSSProperties = { background: "transparent", border: "1px solid #E7E9E7", borderRadius: 9, padding: "7px 12px", fontSize: 12.5, fontWeight: 600, color: "#646B67", cursor: "pointer" };

function fmtFreq(f: string) {
  return ({ daily: "diário", alternate: "dias alternados", weekly: "semanal", as_needed: "quando precisar" } as Record<string, string>)[f] ?? f;
}
