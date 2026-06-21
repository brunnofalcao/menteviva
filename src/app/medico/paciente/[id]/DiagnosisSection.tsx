"use client";
import { useState } from "react";
import { setDiagnosis, applyProtocol } from "./actions";

// Presets organizados por área. São atalhos que ligam módulos de check-in.
const PRESETS = {
  Psiquiatria: ["Depressão", "Transtorno bipolar", "Ansiedade", "TDAH", "Transtorno de pânico", "TOC", "Esquizofrenia", "Transtorno de estresse pós-traumático", "Transtorno de personalidade", "Dependência química", "Insônia", "Transtorno alimentar"],
  Geriatria: ["Geriátrico", "Demência", "Alzheimer", "Parkinson", "Depressão geriátrica", "Polifarmácia", "Declínio cognitivo"],
};

export default function DiagnosisSection({ patientId, current }: { patientId: string; current: string | null }) {
  const [value, setValue] = useState(current ?? "");
  const [area, setArea] = useState<"Psiquiatria" | "Geriatria">("Psiquiatria");

  return (
    <section style={panel}>
      <div style={ph}><b>Diagnóstico / condição</b></div>
      <div style={{ padding: 16 }}>
        {/* Campo livre */}
        <form action={setDiagnosis} style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          <input type="hidden" name="patientId" value={patientId} />
          <input
            name="diagnosis"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Digite o diagnóstico do paciente"
            style={{ flex: 1, border: "1px solid #E7E9E7", borderRadius: 11, padding: "11px 13px", fontSize: 14 }}
          />
          <button style={saveBtn}>Salvar</button>
        </form>

        {/* Presets como atalho */}
        <div style={{ fontSize: 12, fontWeight: 700, color: "#9BA29D", textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 9 }}>Atalhos comuns</div>
        <div style={{ display: "flex", gap: 7, marginBottom: 11 }}>
          {(["Psiquiatria", "Geriatria"] as const).map((a) => (
            <button key={a} type="button" onClick={() => setArea(a)} style={{ ...areaTab, ...(area === a ? areaOn : {}) }}>{a}</button>
          ))}
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
          {PRESETS[area].map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={async () => {
                setValue(preset);
                const fd = new FormData();
                fd.set("patientId", patientId);
                fd.set("diagnosis", preset);
                await setDiagnosis(fd);
                const fd2 = new FormData();
                fd2.set("patientId", patientId);
                fd2.set("protocol", preset);
                await applyProtocol(fd2);
              }}
              style={{ ...chip, ...(value === preset ? chipOn : {}) }}
            >
              {preset}
            </button>
          ))}
        </div>
        <p style={{ fontSize: 12.5, color: "#646B67", marginTop: 12 }}>
          Digite qualquer diagnóstico, ou use um atalho — ele preenche o diagnóstico e já liga os módulos de check-in sugeridos. Você ajusta os módulos abaixo.
        </p>
      </div>
    </section>
  );
}

const panel: React.CSSProperties = { background: "#fff", border: "1px solid #E7E9E7", borderRadius: 18, overflow: "hidden", marginBottom: 18 };
const ph: React.CSSProperties = { padding: "14px 18px", borderBottom: "1px solid #E7E9E7", fontSize: 15 };
const saveBtn: React.CSSProperties = { background: "var(--accent)", color: "#fff", border: "none", borderRadius: 11, padding: "0 20px", fontWeight: 700, fontSize: 14, cursor: "pointer", whiteSpace: "nowrap" };
const areaTab: React.CSSProperties = { padding: "7px 14px", borderRadius: 9, border: "1px solid #E7E9E7", background: "#fff", fontSize: 13, fontWeight: 600, color: "#646B67", cursor: "pointer" };
const areaOn: React.CSSProperties = { background: "#1A1D1C", color: "#fff", borderColor: "#1A1D1C" };
const chip: React.CSSProperties = { padding: "8px 13px", borderRadius: 10, border: "1px solid #E7E9E7", background: "#F8F9F8", fontSize: 13, fontWeight: 600, color: "#646B67", cursor: "pointer" };
const chipOn: React.CSSProperties = { background: "var(--accent-soft, #EEF3F1)", color: "var(--accent-ink, #2C6BBF)", borderColor: "var(--accent)" };
