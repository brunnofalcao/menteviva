"use client";
import { useState } from "react";
import { caregiverConfirmDose, caregiverRegisterEvent } from "./actions";

const QUICK_EVENTS = [
  ["fall", "Queda"], ["confusion", "Confusão"], ["excessive_sleepiness", "Sonolência"],
  ["medication_refused", "Recusou remédio"], ["pain", "Dor"], ["appetite_loss", "Sem apetite"],
];

export default function CaregiverActions({ doseId, patientId, eventOnly, patientName }: {
  doseId?: string; patientId: string; eventOnly?: boolean; patientName?: string;
}) {
  const [eventOpen, setEventOpen] = useState(false);

  if (eventOnly) {
    return (
      <div style={{ background: "#fff", border: "1px solid #E7E9E7", borderRadius: 14, padding: 14, marginBottom: 9 }}>
        <b style={{ fontSize: 14 }}>{patientName}</b>
        {!eventOpen ? (
          <button onClick={() => setEventOpen(true)} style={{ ...evBtn, marginTop: 9 }}>+ Registrar ocorrência</button>
        ) : (
          <div style={{ marginTop: 10 }}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
              {QUICK_EVENTS.map(([type, label]) => (
                <form key={type} action={caregiverRegisterEvent} onSubmit={() => setTimeout(() => setEventOpen(false), 100)}>
                  <input type="hidden" name="patientId" value={patientId} />
                  <input type="hidden" name="type" value={type} />
                  <input type="hidden" name="category" value={type === "medication_refused" ? "treatment" : "clinical"} />
                  <button style={chip}>{label}</button>
                </form>
              ))}
            </div>
            <button onClick={() => setEventOpen(false)} style={{ ...cancelMini, marginTop: 8 }}>Cancelar</button>
          </div>
        )}
      </div>
    );
  }

  // ações de dose
  return (
    <div style={{ display: "flex", gap: 8 }}>
      <form action={caregiverConfirmDose} style={{ flex: 1 }}>
        <input type="hidden" name="doseId" value={doseId} />
        <input type="hidden" name="patientId" value={patientId} />
        <input type="hidden" name="kind" value="taken" />
        <button style={takeBtn}>✓ Dei o remédio</button>
      </form>
      <form action={caregiverConfirmDose}>
        <input type="hidden" name="doseId" value={doseId} />
        <input type="hidden" name="patientId" value={patientId} />
        <input type="hidden" name="kind" value="refused" />
        <button style={refuseBtn}>Recusou</button>
      </form>
    </div>
  );
}

const takeBtn: React.CSSProperties = { width: "100%", background: "var(--accent)", color: "#fff", border: "none", borderRadius: 11, padding: "11px", fontWeight: 700, fontSize: 14, cursor: "pointer" };
const refuseBtn: React.CSSProperties = { background: "#fff", color: "#B5793A", border: "1px solid #EAD9B8", borderRadius: 11, padding: "11px 16px", fontWeight: 600, fontSize: 14, cursor: "pointer" };
const evBtn: React.CSSProperties = { background: "#fff", color: "var(--accent)", border: "1.5px solid var(--accent)", borderRadius: 11, padding: "10px 16px", fontWeight: 700, fontSize: 13.5, cursor: "pointer" };
const chip: React.CSSProperties = { padding: "9px 13px", borderRadius: 10, border: "1px solid #E7E9E7", background: "#F8F9F8", fontSize: 13, fontWeight: 600, color: "#1A1D1C", cursor: "pointer" };
const cancelMini: React.CSSProperties = { background: "transparent", border: "none", color: "#646B67", fontSize: 13, fontWeight: 600, cursor: "pointer" };
