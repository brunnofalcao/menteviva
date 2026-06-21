"use client";
import { useState } from "react";
import { registerEvent } from "./support-actions";

const EVENTS = {
  clinical: {
    label: "Clínico",
    types: [
      ["fall", "Queda", "high"], ["dizziness", "Tontura", "medium"], ["confusion", "Confusão", "high"],
      ["anxiety_crisis", "Crise de ansiedade", "medium"], ["panic_attack", "Ataque de pânico", "high"],
      ["mood_change", "Mudança de humor", "medium"], ["hallucination", "Alucinação", "high"],
      ["insomnia", "Insônia", "low"], ["pain", "Dor", "medium"], ["appetite_loss", "Perda de apetite", "medium"],
      ["excessive_sleepiness", "Sonolência excessiva", "medium"],
    ],
  },
  treatment: {
    label: "Tratamento",
    types: [
      ["medication_refused", "Recusou medicação", "high"], ["medication_forgotten", "Esqueceu medicação", "medium"],
      ["medication_unavailable", "Medicação em falta", "high"], ["emergency_visit", "Foi ao pronto-socorro", "high"],
      ["hospitalization", "Internação", "high"],
    ],
  },
} as const;

export default function EventForm({ patientId }: { patientId: string }) {
  const [open, setOpen] = useState(false);
  const [cat, setCat] = useState<"clinical" | "treatment">("clinical");
  const [type, setType] = useState<string>("");

  if (!open) return <button onClick={() => setOpen(true)} style={openBtn}>+ Registrar evento</button>;

  const types = EVENTS[cat].types;
  const selected = types.find((t) => t[0] === type);

  return (
    <form action={registerEvent} style={card} onSubmit={() => setTimeout(() => setOpen(false), 100)}>
      <input type="hidden" name="patientId" value={patientId} />
      <input type="hidden" name="category" value={cat} />
      <input type="hidden" name="type" value={type} />
      <input type="hidden" name="severity" value={selected?.[2] ?? "low"} />
      <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 14 }}>Registrar evento</div>

      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        {(["clinical", "treatment"] as const).map((c) => (
          <button key={c} type="button" onClick={() => { setCat(c); setType(""); }} style={{ ...tab, ...(cat === c ? tabOn : {}) }}>{EVENTS[c].label}</button>
        ))}
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginBottom: 14 }}>
        {types.map(([v, l, sev]) => (
          <button key={v} type="button" onClick={() => setType(v)}
            style={{ ...chip, ...(type === v ? { ...chipOn, background: sev === "high" ? "#C0853B" : "var(--accent)" } : {}) }}>{l}</button>
        ))}
      </div>

      <label style={lbl}>Observação (opcional)</label>
      <textarea name="note" rows={2} placeholder="O que aconteceu?" style={{ width: "100%", border: "1px solid #E7E9E7", borderRadius: 11, padding: 11, fontSize: 14, resize: "vertical", fontFamily: "inherit" }} />

      <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
        <button type="submit" disabled={!type} style={{ ...saveBtn, opacity: type ? 1 : 0.5 }}>Registrar</button>
        <button type="button" onClick={() => setOpen(false)} style={cancelBtn}>Cancelar</button>
      </div>
    </form>
  );
}

const openBtn: React.CSSProperties = { background: "#fff", color: "var(--accent)", border: "1.5px solid var(--accent)", borderRadius: 11, padding: "11px 17px", fontWeight: 700, fontSize: 14, cursor: "pointer" };
const card: React.CSSProperties = { background: "#fff", border: "1px solid #E7E9E7", borderRadius: 16, padding: 18, marginTop: 8 };
const lbl: React.CSSProperties = { display: "block", fontSize: 12, fontWeight: 700, color: "#646B67", textTransform: "uppercase", letterSpacing: ".05em", margin: "4px 0 7px" };
const tab: React.CSSProperties = { flex: 1, padding: "10px", borderRadius: 10, border: "1.5px solid #E7E9E7", background: "#fff", fontSize: 13.5, fontWeight: 600, color: "#646B67", cursor: "pointer" };
const tabOn: React.CSSProperties = { borderColor: "var(--accent)", background: "var(--accent-soft, #EEF3F1)", color: "var(--accent-ink, #2C6BBF)" };
const chip: React.CSSProperties = { padding: "9px 13px", borderRadius: 10, border: "1px solid #E7E9E7", background: "#F8F9F8", fontSize: 13, fontWeight: 600, color: "#646B67", cursor: "pointer" };
const chipOn: React.CSSProperties = { color: "#fff", borderColor: "transparent" };
const saveBtn: React.CSSProperties = { background: "var(--accent)", color: "#fff", border: "none", borderRadius: 11, padding: "11px 20px", fontWeight: 700, fontSize: 14, cursor: "pointer" };
const cancelBtn: React.CSSProperties = { background: "transparent", color: "#646B67", border: "none", padding: "11px 16px", fontWeight: 600, fontSize: 14, cursor: "pointer" };
