"use client";
import CIDSearch from "./CIDSearch";

export default function DiagnosisSection({ patientId, current, currentCode }: { patientId: string; current: string | null; currentCode: string | null }) {
  return (
    <section style={panel}>
      <div style={ph}><b>Diagnóstico / condição (CID)</b></div>
      <div style={{ padding: 16 }}>
        <CIDSearch patientId={patientId} current={current} currentCode={currentCode} />
      </div>
    </section>
  );
}

const panel: React.CSSProperties = { background: "#fff", border: "1px solid #E7E9E7", borderRadius: 18, overflow: "hidden", marginBottom: 18 };
const ph: React.CSSProperties = { padding: "14px 18px", borderBottom: "1px solid #E7E9E7", fontSize: 15 };
