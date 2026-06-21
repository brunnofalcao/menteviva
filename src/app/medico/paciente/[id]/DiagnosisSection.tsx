"use client";
import { useState } from "react";
import CIDSearch from "./CIDSearch";

export default function DiagnosisSection({ patientId, current, currentCode }: { patientId: string; current: string | null; currentCode: string | null }) {
  const [locked, setLocked] = useState(true);

  return (
    <section style={panel}>
      <div style={{ ...ph, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <b>Diagnóstico / condição (CID)</b>
        <button onClick={() => setLocked(!locked)} style={{
          display: "flex", alignItems: "center", gap: 6, padding: "7px 12px", borderRadius: 9,
          border: locked ? "1px solid #E7E9E7" : "1.5px solid var(--accent)",
          background: locked ? "#fff" : "var(--accent-soft, #EEF3F1)",
          color: locked ? "#646B67" : "var(--accent-ink, #2C6BBF)", fontWeight: 700, fontSize: 12.5, cursor: "pointer",
        }}>{locked ? "🔒 Editar" : "🔓 Editando"}</button>
      </div>
      <div style={{ padding: 16 }}>
        {locked ? (
          <div style={{ display: "flex", alignItems: "center", gap: 11, background: "#F6F7F6", borderRadius: 12, padding: "13px 15px" }}>
            {currentCode && <span style={{ fontWeight: 800, fontSize: 13, color: "var(--accent-ink, #2C6BBF)", fontFamily: "monospace" }}>{currentCode}</span>}
            <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: current ? "#1A1D1C" : "#9BA29D" }}>
              {current ?? "Nenhum diagnóstico definido. Toque em Editar para buscar no CID."}
            </span>
          </div>
        ) : (
          <CIDSearch patientId={patientId} current={current} currentCode={currentCode} />
        )}
      </div>
    </section>
  );
}

const panel: React.CSSProperties = { background: "#fff", border: "1px solid #E7E9E7", borderRadius: 18, overflow: "hidden", marginBottom: 18 };
const ph: React.CSSProperties = { padding: "14px 18px", borderBottom: "1px solid #E7E9E7", fontSize: 15 };
