import { createServerSupabase } from "@/lib/supabase-server";
import { applyProtocol, toggleModule } from "./actions";
import type { CheckinModule } from "@/types/db";

const MODULE_LABELS: Record<CheckinModule, { icon: string; label: string; hint: string; group: string }> = {
  mood:         { icon: "😐", label: "Humor", hint: "Escala de 5 · diário", group: "Núcleo clínico" },
  sleep:        { icon: "🌙", label: "Sono", hint: "Horas dormidas", group: "Núcleo clínico" },
  side_effects: { icon: "⚠️", label: "Efeitos colaterais", hint: "Alerta após 3 dias seguidos", group: "Núcleo clínico" },
  energy:       { icon: "🔋", label: "Energia / disposição", hint: "Separa sedação de humor", group: "Comportamental (manual)" },
  activity:     { icon: "🚶", label: "Atividade física", hint: "Parado / movi / exercitei", group: "Comportamental (manual)" },
  hydration:    { icon: "💧", label: "Água & alimentação", hint: "Contador de toques", group: "Comportamental (manual)" },
  free_note:    { icon: "✍️", label: "Anotação livre", hint: "Uma linha sobre o dia", group: "Comportamental (manual)" },
};

const PROTOCOLS = ["Depressão", "Transtorno bipolar", "Ansiedade", "TDAH", "Personalizado"];

export default async function ConfigPage({ searchParams }: { searchParams: Promise<{ patient?: string }> }) {
  const { patient } = await searchParams;
  const supabase = await createServerSupabase();

  // lista pacientes do médico p/ seletor
  const { data: patients } = await supabase
    .from("patients").select("id, diagnosis_label, profiles(full_name)");

  const current = patient ?? patients?.[0]?.id;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const curPatient: any = patients?.find((p: any) => p.id === current);

  const { data: modules } = await supabase
    .from("patient_modules").select("module, enabled").eq("patient_id", current ?? "");

  const enabledMap = new Map((modules ?? []).map((m) => [m.module, m.enabled]));
  const groups = ["Núcleo clínico", "Comportamental (manual)"];

  return (
    <main className="mv-page" style={{ maxWidth: 760 }}>
      <div style={{ fontSize: 12.5, color: "#9BA29D", fontWeight: 600 }}>
        Lembretes & módulos › {curPatient?.profiles?.full_name ?? "Paciente"}
      </div>
      <h1 style={{ fontSize: 28, fontWeight: 700, margin: "6px 0 4px" }}>
        Check-in de {curPatient?.profiles?.full_name?.split(" ")[0] ?? "—"}
      </h1>
      <p style={{ color: "#646B67", fontSize: 14, marginBottom: 20 }}>
        Você define o que o paciente registra. Menos campos = mais adesão.
      </p>

      {/* protocolo por diagnóstico */}
      <section style={panel}>
        <div style={ph}><b>Aplicar protocolo por diagnóstico</b></div>
        <div style={{ padding: 16, display: "flex", gap: 9, flexWrap: "wrap" }}>
          {PROTOCOLS.map((p) => (
            <form key={p} action={applyProtocol}>
              <input type="hidden" name="patientId" value={current} />
              <input type="hidden" name="protocol" value={p} />
              <button style={{ ...chip, ...(curPatient?.diagnosis_label === p ? chipOn : {}) }}>{p}</button>
            </form>
          ))}
        </div>
      </section>

      {/* módulos */}
      <section style={panel}>
        <div style={ph}><b>Módulos do check-in</b></div>
        <div style={{ padding: "6px 19px 16px" }}>
          {groups.map((g) => (
            <div key={g}>
              <div style={modsect}>{g}</div>
              {(Object.keys(MODULE_LABELS) as CheckinModule[])
                .filter((m) => MODULE_LABELS[m].group === g)
                .map((m) => {
                  const on = enabledMap.get(m) ?? false;
                  return (
                    <form key={m} action={toggleModule} style={mod}>
                      <input type="hidden" name="patientId" value={current} />
                      <input type="hidden" name="module" value={m} />
                      <input type="hidden" name="enabled" value={String(!on)} />
                      <span style={micon}>{MODULE_LABELS[m].icon}</span>
                      <span style={{ flex: 1 }}>
                        <b style={{ display: "block", fontSize: 14.5 }}>{MODULE_LABELS[m].label}</b>
                        <span style={{ fontSize: 12.5, color: "#646B67" }}>{MODULE_LABELS[m].hint}</span>
                      </span>
                      <button style={{ ...tog, ...(on ? togOn : {}) }} aria-label="toggle" />
                    </form>
                  );
                })}
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

const panel: React.CSSProperties = { background: "#fff", border: "1px solid #E7E9E7", borderRadius: 18, overflow: "hidden", marginBottom: 18 };
const ph: React.CSSProperties = { padding: "15px 19px", borderBottom: "1px solid #E7E9E7", fontSize: 15 };
const chip: React.CSSProperties = { padding: "9px 14px", borderRadius: 11, border: "1.5px solid #E7E9E7", background: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" };
const chipOn: React.CSSProperties = { borderColor: "var(--accent)", background: "var(--accent-soft)", color: "var(--accent-ink)" };
const modsect: React.CSSProperties = { fontSize: 12, fontWeight: 700, color: "#646B67", padding: "16px 0 2px", textTransform: "uppercase", letterSpacing: ".05em" };
const mod: React.CSSProperties = { display: "flex", alignItems: "center", gap: 13, padding: "13px 0", borderBottom: "1px solid #E7E9E7", margin: 0 };
const micon: React.CSSProperties = { width: 38, height: 38, borderRadius: 11, background: "var(--accent-soft)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 };
const tog: React.CSSProperties = { width: 48, height: 28, borderRadius: 20, background: "#E7E9E7", border: "none", position: "relative", cursor: "pointer", flexShrink: 0 };
const togOn: React.CSSProperties = { background: "var(--accent)" };
