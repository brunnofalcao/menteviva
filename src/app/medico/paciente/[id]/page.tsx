import { createServerSupabase } from "@/lib/supabase-server";
import PrescribeForm from "./PrescribeForm";
import EditMedForm from "./EditMedForm";
import AddSupportForm from "./AddSupportForm";
import EventForm from "./EventForm";
import PreConsultAI from "./PreConsultAI";
import DiagnosisSection from "./DiagnosisSection";
import EditPatientButton from "./EditPatientButton";
import { applyProtocol, toggleModule, pauseMedication, deleteMedication } from "./actions";
import { removeSupportMember, generateMemberAccess } from "./support-actions";
import { medVisual, medSubtitle } from "@/lib/med-visual";

const REL_LABEL: Record<string, string> = {
  son: "Filho", daughter: "Filha", father: "Pai", mother: "Mãe", spouse: "Cônjuge",
  partner: "Companheiro(a)", brother: "Irmão", sister: "Irmã", grandchild: "Neto(a)",
  caregiver: "Cuidador(a)", nurse: "Enfermeiro(a)", other: "Familiar",
};
const EVENT_LABEL: Record<string, string> = {
  fall: "Queda", near_fall: "Quase queda", dizziness: "Tontura", confusion: "Confusão",
  delirium_suspected: "Delirium suspeito", anxiety_crisis: "Crise de ansiedade",
  panic_attack: "Ataque de pânico", mood_change: "Piora de humor", hallucination: "Alucinação",
  insomnia: "Insônia", pain: "Dor", appetite_loss: "Perda de apetite", weight_loss: "Perda de peso",
  excessive_sleepiness: "Sonolência", suicidal_ideation: "Ideação suicida", self_harm: "Automutilação",
  aggression: "Agressividade", agitation: "Agitação", alcohol_relapse: "Recaída álcool",
  drug_relapse: "Recaída drogas", side_effect: "Efeito colateral", constipation: "Constipação",
  dehydration_suspected: "Desidratação suspeita", infection_suspected: "Infecção suspeita",
  functional_decline: "Piora funcional", medication_refused: "Recusou medicação",
  medication_forgotten: "Esqueceu medicação", medication_unavailable: "Medicação em falta",
  medication_abandonment: "Abandono de medicação", food_refusal: "Recusa alimentar",
  emergency_visit: "Pronto-socorro", hospitalization: "Internação", observation: "Observação",
};

const PROTOCOLS = ["Depressão", "Transtorno bipolar", "Ansiedade", "TDAH", "Personalizado"];

export default async function FichaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createServerSupabase();

  const { data: patient } = await supabase
    .from("patients")
    .select("diagnosis_label, cid_code, phone, profiles(full_name), checkins(day, mood, energy, sleep_hours, side_effects, free_note)")
    .eq("id", id)
    .single();

  // medicamentos (prescritos e auto-incluídos) com tudo p/ gerenciar
  const { data: meds } = await supabase
    .from("medications")
    .select("id, name, dose, form, times, frequency, source, active, channel, ends_at")
    .eq("patient_id", id)
    .order("source");

  // rede de apoio
  const { data: support } = await supabase
    .from("support_network")
    .select("id, full_name, relationship, phone, is_caregiver, is_nurse, access_code")
    .eq("patient_id", id);

  // eventos recentes
  const { data: events } = await supabase
    .from("patient_events")
    .select("id, type, category, severity, note, occurred_at, reporter_role")
    .eq("patient_id", id)
    .order("occurred_at", { ascending: false })
    .limit(8);

  // timeline longitudinal
  const { data: timeline } = await supabase
    .rpc("patient_timeline", { p_patient: id, p_limit: 20 });

  // detecção precoce de sinais de alerta
  const { data: warnings } = await supabase
    .rpc("early_warnings", { p_patient: id });

  // especialidade do médico (geriatria mostra polifarmácia)
  const { data: { user: docUser } } = await supabase.auth.getUser();
  const { data: docInfo } = await supabase
    .from("doctors").select("specialty").eq("id", docUser?.id ?? "").single();
  const isGeriatrics = docInfo?.specialty === "geriatrics";
  const { data: poly } = isGeriatrics
    ? await supabase.rpc("polypharmacy_review", { p_patient: id })
    : { data: null };

  // módulos de check-in ativos do paciente
  const { data: patientModules } = await supabase
    .from("patient_modules").select("module, enabled").eq("patient_id", id);
  const moduleState = new Map((patientModules ?? []).map((m) => [m.module, m.enabled]));

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
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {atRisk && <span style={badgeRisk}>⚠ Em risco de abandono</span>}
          <EditPatientButton patientId={id} name={p?.profiles?.full_name ?? ""} phone={p?.phone ?? null} />
          <a href={`/medico/paciente/${id}/relatorio`} style={{ padding: "9px 15px", borderRadius: 10, background: "#fff", border: "1px solid #E7E9E7", fontSize: 13.5, fontWeight: 600, color: "#1A1D1C", textDecoration: "none" }}>📄 Gerar relatório</a>
        </div>
      </div>

      {atRisk && (
        <div style={noteRisk}>
          <b>Padrão detectado</b><br />
          {missed7 >= 3 && `Faltou ${missed7} doses nos últimos 7 dias. `}
          {ranOut && `"Acabou o remédio" registrado — possível abandono por acesso, não por vontade. `}
          Considere contato.
        </div>
      )}

      {/* ════ DETECÇÃO PRECOCE ════ */}
      {(warnings ?? []).length > 0 && (
        <div style={{ background: "#FFFBF2", border: "1px solid #EAD9B8", borderRadius: 16, padding: "14px 16px", marginBottom: 18 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#8A6212", textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 10 }}>⚑ Sinais de alerta</div>
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          {(warnings ?? []).map((w: any, i: number) => (
            <div key={i} style={{ display: "flex", gap: 10, padding: "7px 0", borderTop: i ? "1px solid #F0E6D0" : "none" }}>
              <span style={{ width: 8, height: 8, borderRadius: 4, marginTop: 6, flexShrink: 0, background: w.severity === "high" ? "#C0853B" : "#D4A24A" }} />
              <div>
                <b style={{ fontSize: 13.5, color: "#6B4E1A" }}>{w.label}</b>
                {w.detail && <p style={{ fontSize: 12.5, color: "#8A6212" }}>{w.detail}</p>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ════ POLIFARMÁCIA (geriatria) ════ */}
      {isGeriatrics && poly && poly[0] && (
        <div style={{ background: poly[0].is_polypharmacy ? "#FFFBF2" : "#F4F7F5", border: `1px solid ${poly[0].is_polypharmacy ? "#EAD9B8" : "#DDE5E0"}`, borderRadius: 16, padding: "14px 16px", marginBottom: 18, display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ fontSize: 30, fontWeight: 800, color: poly[0].is_polypharmacy ? "#B5793A" : "#2C7A56" }}>{poly[0].total_meds}</div>
          <div>
            <b style={{ fontSize: 14, color: poly[0].is_polypharmacy ? "#8A6212" : "#2C7A56" }}>{poly[0].label}</b>
            <p style={{ fontSize: 12.5, color: "#646B67" }}>{poly[0].detail}</p>
          </div>
        </div>
      )}

      {/* KPIs */}
      <div className="mv-kpis" style={{ marginBottom: 20 }}>
        <Kpi n={`${Number(adh ?? 0)}%`} l="Adesão 30 dias" bad={Number(adh ?? 0) < 60} />
        <Kpi n={String(missed7)} l="Faltas 7 dias" bad={missed7 >= 3} />
        <Kpi n={String(checkins.length)} l="Check-ins 7d" />
        <Kpi n={String(selfMeds.length)} l="Auto-incluídos" />
      </div>

      {/* DIAGNÓSTICO (livre + atalhos) */}
      <DiagnosisSection patientId={id} current={p?.diagnosis_label ?? null} currentCode={p?.cid_code ?? null} />

      {/* MÓDULOS DE CHECK-IN */}
      <section style={{ ...panel, marginBottom: 18 }}>
        <div style={ph}><b>O que o paciente registra no check-in</b></div>
        <div style={{ padding: 16 }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, paddingBottom: 14 }}>
            {([
              ["mood", "Humor"], ["anxiety", "Ansiedade"], ["sleep", "Sono"],
              ["energy", "Energia"], ["appetite", "Apetite"], ["irritability", "Irritabilidade"],
              ["activity", "Atividade"], ["side_effects", "Efeitos colaterais"], ["free_note", "Observação livre"],
            ] as const).map(([mod, label]) => {
              const on = moduleState.get(mod) ?? false;
              return (
                <form key={mod} action={toggleModule}>
                  <input type="hidden" name="patientId" value={id} />
                  <input type="hidden" name="module" value={mod} />
                  <input type="hidden" name="enabled" value={String(on)} />
                  <button style={{
                    display: "flex", alignItems: "center", gap: 7, padding: "8px 13px", borderRadius: 10,
                    border: on ? "1.5px solid var(--accent)" : "1.5px solid #E7E9E7",
                    background: on ? "var(--accent-soft, #EEF3F1)" : "#fff",
                    color: on ? "var(--accent-ink, #2C6BBF)" : "#646B67",
                    fontSize: 13, fontWeight: 600, cursor: "pointer",
                  }}>
                    <span style={{ width: 16, height: 16, borderRadius: 5, background: on ? "var(--accent)" : "#D4D7D4", color: "#fff", fontSize: 11, display: "flex", alignItems: "center", justifyContent: "center" }}>{on ? "✓" : ""}</span>
                    {label}
                  </button>
                </form>
              );
            })}
          </div>
          <p style={{ fontSize: 12.5, color: "#646B67" }}>
            Ligue ou desligue o que o paciente vê no check-in. Menos campos = mais adesão.
          </p>
        </div>
      </section>

      {/* RESUMO IA PRÉ-CONSULTA */}
      <PreConsultAI patientId={id} />

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

      {/* ════ REDE DE APOIO ════ */}
      <section style={{ ...panel, marginTop: 18 }}>
        <div style={ph}><b>Rede de apoio</b></div>
        <div style={{ padding: 16 }}>
          {(support ?? []).length === 0 && <p style={{ fontSize: 13.5, color: "#646B67", marginBottom: 14 }}>Ninguém na rede ainda. Adicione familiares, cuidadores ou enfermeiros para acompanhar o tratamento.</p>}
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          {(support ?? []).map((s: any) => (
            <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 0", borderBottom: "1px solid #F0F1F0" }}>
              <span style={{ width: 38, height: 38, borderRadius: "50%", background: "var(--accent-soft, #EEF3F1)", color: "var(--accent-ink, #2C6BBF)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 13 }}>
                {s.full_name.split(" ").map((x: string) => x[0]).slice(0, 2).join("").toUpperCase()}
              </span>
              <div style={{ flex: 1 }}>
                <b style={{ fontSize: 14 }}>{s.full_name}</b>
                <div style={{ fontSize: 12.5, color: "#646B67" }}>
                  {REL_LABEL[s.relationship] ?? "Familiar"}
                  {s.is_caregiver && " · Cuidador"}{s.is_nurse && " · Enfermeiro"}
                  {s.phone ? ` · ${s.phone}` : ""}
                </div>
                {s.access_code && (
                  <div style={{ marginTop: 5, fontSize: 12, color: "var(--accent-ink, #2C6BBF)" }}>
                    Acesso: <b style={{ fontFamily: "monospace", letterSpacing: ".05em" }}>{s.access_code}</b> <span style={{ color: "#9BA29D" }}>(senha: telefone)</span>
                  </div>
                )}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {(s.is_caregiver || s.is_nurse) && !s.access_code && (
                  <form action={generateMemberAccess}>
                    <input type="hidden" name="memberId" value={s.id} />
                    <input type="hidden" name="patientId" value={id} />
                    <button style={{ ...miniBtn, borderColor: "var(--accent)", color: "var(--accent-ink, #2C6BBF)" }}>Gerar acesso</button>
                  </form>
                )}
                <form action={removeSupportMember}>
                  <input type="hidden" name="memberId" value={s.id} />
                  <input type="hidden" name="patientId" value={id} />
                  <button style={miniBtn}>Remover</button>
                </form>
              </div>
            </div>
          ))}
          <div style={{ marginTop: 14 }}><AddSupportForm patientId={id} /></div>
        </div>
      </section>

      {/* ════ EVENTOS + TIMELINE ════ */}
      <div className="mv-split" style={{ marginTop: 18 }}>
        <section style={panel}>
          <div style={ph}><b>Eventos recentes</b></div>
          <div style={{ padding: 16 }}>
            {(events ?? []).length === 0 && <p style={{ fontSize: 13.5, color: "#646B67", marginBottom: 12 }}>Nenhum evento registrado.</p>}
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {(events ?? []).map((e: any) => (
              <div key={e.id} style={{ display: "flex", gap: 10, padding: "10px 0", borderBottom: "1px solid #F0F1F0" }}>
                <span style={{ width: 8, height: 8, borderRadius: 4, marginTop: 6, flexShrink: 0, background: e.severity === "high" ? "#C0853B" : e.severity === "medium" ? "#D4A24A" : "#9AA0A6" }} />
                <div style={{ flex: 1 }}>
                  <b style={{ fontSize: 13.5 }}>{EVENT_LABEL[e.type] ?? e.type}</b>
                  {e.note && <p style={{ fontSize: 12.5, color: "#646B67" }}>{e.note}</p>}
                  <small style={{ fontSize: 11.5, color: "#9BA29D" }}>{new Date(e.occurred_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</small>
                </div>
              </div>
            ))}
            <div style={{ marginTop: 14 }}><EventForm patientId={id} /></div>
          </div>
        </section>

        <section style={panel}>
          <div style={ph}><b>Linha do tempo</b></div>
          <div style={{ padding: "8px 16px 16px" }}>
            {(timeline ?? []).length === 0 && <p style={{ fontSize: 13.5, color: "#646B67", padding: "8px 0" }}>O histórico do paciente aparecerá aqui conforme o tratamento avança.</p>}
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {(timeline ?? []).map((t: any, i: number) => (
              <div key={i} style={{ display: "flex", gap: 11, padding: "9px 0" }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
                  <span style={{ width: 9, height: 9, borderRadius: 5, background: t.kind === "event" ? "#C0853B" : t.kind === "medication" ? "var(--accent)" : "#9AA0A6" }} />
                  <span style={{ width: 1.5, flex: 1, background: "#E7E9E7", marginTop: 3 }} />
                </div>
                <div style={{ flex: 1, paddingBottom: 4 }}>
                  <b style={{ fontSize: 13 }}>{t.kind === "medication" ? `Iniciou ${t.label}` : t.kind === "event" ? (EVENT_LABEL[t.label] ?? t.label) : t.label}</b>
                  {t.detail && <span style={{ fontSize: 12.5, color: "#646B67" }}> · {t.detail}</span>}
                  <small style={{ display: "block", fontSize: 11.5, color: "#9BA29D" }}>{t.at ? new Date(t.at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }) : ""}</small>
                </div>
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
