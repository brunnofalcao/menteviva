"use client";
import { useState } from "react";

type Patient = { id: string; name: string; phone: string | null; diag: string | null; adh: number; missed: number };

const SEGMENTS = [
  { key: "all", label: "Todos os pacientes", filter: () => true },
  { key: "low", label: "Baixa adesão (<60%)", filter: (p: Patient) => p.adh < 60 },
  { key: "missed", label: "Faltaram doses no mês", filter: (p: Patient) => p.missed > 0 },
];

const TEMPLATES = [
  { label: "Lembrete de consulta", text: "Olá, {nome}! Passando para lembrar da sua consulta. Qualquer dúvida, estou à disposição." },
  { label: "Reforço de adesão", text: "Oi, {nome}! Vi que faltaram algumas doses. Está tudo bem? Lembre-se: seu tratamento funciona melhor com constância. 💚" },
  { label: "Acabou o remédio?", text: "Olá, {nome}! Seu medicamento está acabando? Vamos garantir que você não fique sem. Me avise se precisar de receita." },
];

export default function MessageComposer({ patients }: { patients: Patient[] }) {
  const [segment, setSegment] = useState("all");
  const [text, setText] = useState("");
  const [sent, setSent] = useState(false);

  const seg = SEGMENTS.find((s) => s.key === segment)!;
  const targets = patients.filter(seg.filter);
  const withPhone = targets.filter((p) => p.phone);

  function send() {
    // STUB: o disparo real via WhatsApp Cloud API será plugado depois.
    // Aqui apenas confirmamos visualmente o envio.
    setSent(true);
    setTimeout(() => setSent(false), 4000);
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }} className="mv-split">
      {/* Composer */}
      <section style={panel}>
        <div style={ph}><b>Nova mensagem</b></div>
        <div style={{ padding: 18 }}>
          <label style={lbl}>Enviar para</label>
          <div style={{ display: "flex", flexDirection: "column", gap: 7, marginBottom: 14 }}>
            {SEGMENTS.map((s) => {
              const count = patients.filter(s.filter).length;
              const on = segment === s.key;
              return (
                <button key={s.key} onClick={() => setSegment(s.key)} style={{ ...segBtn, ...(on ? segOn : {}) }}>
                  <span>{s.label}</span>
                  <span style={{ fontWeight: 700, color: on ? "#fff" : "#9BA29D" }}>{count}</span>
                </button>
              );
            })}
          </div>

          <label style={lbl}>Modelos rápidos</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginBottom: 14 }}>
            {TEMPLATES.map((t) => (
              <button key={t.label} onClick={() => setText(t.text)} style={tmplChip}>{t.label}</button>
            ))}
          </div>

          <label style={lbl}>Mensagem</label>
          <textarea value={text} onChange={(e) => setText(e.target.value)} rows={5}
            placeholder="Escreva sua mensagem. Use {nome} para personalizar."
            style={{ width: "100%", border: "1px solid #E7E9E7", borderRadius: 12, padding: 13, fontSize: 14, resize: "vertical", fontFamily: "inherit" }} />
          <p style={{ fontSize: 12, color: "#9BA29D", marginTop: 6 }}>{"{nome}"} será trocado pelo primeiro nome de cada paciente.</p>

          <button onClick={send} disabled={!text.trim() || withPhone.length === 0}
            style={{ ...sendBtn, opacity: (!text.trim() || withPhone.length === 0) ? 0.5 : 1 }}>
            {sent ? "✓ Enviado para a fila" : `Enviar para ${withPhone.length} paciente(s)`}
          </button>
          {sent && <p style={{ fontSize: 12.5, color: "#1E7A58", marginTop: 8 }}>As mensagens entraram na fila de envio. (Disparo real será ativado quando a API do WhatsApp for conectada.)</p>}
        </div>
      </section>

      {/* Prévia / destinatários */}
      <section style={panel}>
        <div style={ph}><b>Quem vai receber ({withPhone.length})</b></div>
        <div style={{ padding: "6px 0", maxHeight: 360, overflow: "auto" }}>
          {withPhone.length === 0 && <p style={{ padding: "12px 18px", fontSize: 13.5, color: "#646B67" }}>Nenhum paciente com WhatsApp neste grupo.</p>}
          {withPhone.map((p) => (
            <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 11, padding: "10px 18px", borderBottom: "1px solid #F0F1F0" }}>
              <span style={{ width: 34, height: 34, borderRadius: "50%", background: "var(--accent)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 12 }}>
                {p.name.split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase()}
              </span>
              <div style={{ flex: 1 }}>
                <b style={{ fontSize: 13.5 }}>{p.name}</b>
                <div style={{ fontSize: 12, color: "#9BA29D" }}>{p.diag ?? "—"} · adesão {p.adh}%</div>
              </div>
            </div>
          ))}
        </div>
        {text.trim() && withPhone[0] && (
          <div style={{ padding: 16, borderTop: "1px solid #E7E9E7" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#9BA29D", textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 8 }}>Prévia para {withPhone[0].name.split(" ")[0]}</div>
            <div style={{ background: "#DCF8C6", borderRadius: "14px 14px 14px 4px", padding: "11px 14px", fontSize: 13.5, lineHeight: 1.5, maxWidth: 280 }}>
              {text.replace(/\{nome\}/g, withPhone[0].name.split(" ")[0])}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

const panel: React.CSSProperties = { background: "#fff", border: "1px solid #E7E9E7", borderRadius: 18, overflow: "hidden" };
const ph: React.CSSProperties = { padding: "14px 18px", borderBottom: "1px solid #E7E9E7", fontSize: 15 };
const lbl: React.CSSProperties = { display: "block", fontSize: 12, fontWeight: 700, color: "#646B67", textTransform: "uppercase", letterSpacing: ".05em", margin: "4px 0 9px" };
const segBtn: React.CSSProperties = { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 14px", borderRadius: 11, border: "1.5px solid #E7E9E7", background: "#fff", fontSize: 13.5, fontWeight: 600, color: "#1A1D1C", cursor: "pointer" };
const segOn: React.CSSProperties = { background: "var(--accent)", borderColor: "var(--accent)", color: "#fff" };
const tmplChip: React.CSSProperties = { padding: "8px 12px", borderRadius: 9, border: "1px solid #E7E9E7", background: "#F8F9F8", fontSize: 12.5, fontWeight: 600, color: "#646B67", cursor: "pointer" };
const sendBtn: React.CSSProperties = { width: "100%", background: "var(--accent)", color: "#fff", border: "none", borderRadius: 12, padding: 14, fontWeight: 700, fontSize: 15, cursor: "pointer", marginTop: 18 };
