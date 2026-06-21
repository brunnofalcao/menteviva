"use client";
import { useState } from "react";
import { generatePreConsultSummary } from "./ai-actions";

export default function PreConsultAI({ patientId }: { patientId: string }) {
  const [state, setState] = useState<"idle" | "loading" | "done" | "error" | "nokey">("idle");
  const [summary, setSummary] = useState("");

  async function run() {
    setState("loading");
    const r = await generatePreConsultSummary(patientId);
    if (r.ok && r.summary) { setSummary(r.summary); setState("done"); }
    else if (r.error === "missing_key") setState("nokey");
    else setState("error");
  }

  return (
    <section style={panel}>
      <div style={{ ...ph, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <b>Resumo pré-consulta (IA)</b>
        {state !== "done" && state !== "loading" && (
          <button onClick={run} style={genBtn}>Gerar resumo</button>
        )}
        {state === "done" && <button onClick={run} style={genGhost}>Atualizar</button>}
      </div>
      <div style={{ padding: 18 }}>
        {state === "idle" && <p style={{ fontSize: 13.5, color: "#646B67" }}>Gera um resumo automático do paciente — adesão, sintomas, eventos e sugestões de revisão — para você abrir a consulta já situado.</p>}
        {state === "loading" && <p style={{ fontSize: 13.5, color: "#646B67" }}>Analisando os dados do paciente…</p>}
        {state === "error" && <p style={{ fontSize: 13.5, color: "#B5793A" }}>Não foi possível gerar agora. Tente novamente em instantes.</p>}
        {state === "nokey" && <p style={{ fontSize: 13.5, color: "#B5793A" }}>A chave da IA ainda não foi configurada no servidor (ANTHROPIC_API_KEY). Quando estiver, este resumo funciona automaticamente.</p>}
        {state === "done" && (
          <div style={{ fontSize: 13.5, lineHeight: 1.65, color: "#1A1D1C", whiteSpace: "pre-wrap" }}>{summary}</div>
        )}
      </div>
    </section>
  );
}

const panel: React.CSSProperties = { background: "#fff", border: "1px solid #E7E9E7", borderRadius: 18, overflow: "hidden", marginTop: 18 };
const ph: React.CSSProperties = { padding: "14px 18px", borderBottom: "1px solid #E7E9E7", fontSize: 15 };
const genBtn: React.CSSProperties = { padding: "8px 15px", borderRadius: 9, background: "var(--accent)", color: "#fff", border: "none", fontSize: 13, fontWeight: 700, cursor: "pointer" };
const genGhost: React.CSSProperties = { padding: "8px 14px", borderRadius: 9, background: "#fff", border: "1px solid #E7E9E7", fontSize: 13, fontWeight: 600, color: "#646B67", cursor: "pointer" };
