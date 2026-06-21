"use client";

const EVENT_LABEL: Record<string, string> = {
  fall: "Queda", dizziness: "Tontura", confusion: "Confusão", anxiety_crisis: "Crise de ansiedade",
  panic_attack: "Ataque de pânico", mood_change: "Mudança de humor", hallucination: "Alucinação",
  insomnia: "Insônia", pain: "Dor", appetite_loss: "Perda de apetite", excessive_sleepiness: "Sonolência",
  medication_refused: "Recusou medicação", medication_forgotten: "Esqueceu medicação",
  medication_unavailable: "Medicação em falta", emergency_visit: "Pronto-socorro", hospitalization: "Internação",
  observation: "Observação",
};
const FREQ: Record<string, string> = { daily: "diário", alternate: "dias alternados", weekly: "semanal", as_needed: "quando necessário" };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function ReportView({ kind, data }: { kind: string; data: any }) {
  const isFamily = kind === "familia";
  const today = new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });

  return (
    <div style={{ background: "#F2F3F2", minHeight: "100vh", padding: "20px 0" }}>
      {/* Barra de ações — some na impressão */}
      <div className="no-print" style={{ maxWidth: 760, margin: "0 auto 16px", display: "flex", gap: 10, justifyContent: "space-between", alignItems: "center", padding: "0 16px" }}>
        <div style={{ display: "flex", gap: 8 }}>
          <a href={`/medico/paciente/${data.patientId}/relatorio?tipo=clinico`} style={{ ...tab, ...(!isFamily ? tabOn : {}) }}>Clínico</a>
          <a href={`/medico/paciente/${data.patientId}/relatorio?tipo=familia`} style={{ ...tab, ...(isFamily ? tabOn : {}) }}>Família</a>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <a href={`/medico/paciente/${data.patientId}`} style={btnGhost}>← Voltar</a>
          <button onClick={() => window.print()} style={btnPrimary}>Imprimir / Salvar PDF</button>
        </div>
      </div>

      {/* Folha A4 */}
      <div className="sheet" style={sheet}>
        {/* Cabeçalho */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "2px solid #1A1D1C", paddingBottom: 16, marginBottom: 22 }}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 800 }}>{data.brandName}</div>
            <div style={{ fontSize: 13, color: "#555" }}>{data.doctorName}{data.crm ? ` · CRM ${data.crm}` : ""}</div>
            <div style={{ fontSize: 12, color: "#888" }}>{data.specialty === "geriatrics" ? "Geriatria" : "Psiquiatria"}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".05em", color: "#555" }}>
              {isFamily ? "Relatório para a família" : "Relatório clínico"}
            </div>
            <div style={{ fontSize: 12, color: "#888" }}>{today}</div>
          </div>
        </div>

        {/* Identificação */}
        <h1 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 4px" }}>{data.patientName}</h1>
        <p style={{ color: "#555", marginBottom: 22, fontSize: 14 }}>
          {isFamily ? "Resumo do acompanhamento" : `Diagnóstico: ${data.diagnosis}`}
        </p>

        {/* Adesão */}
        <Section title={isFamily ? "Como está a adesão ao tratamento" : "Adesão (últimos 30 dias)"}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ fontSize: 38, fontWeight: 800, color: data.adherence < 70 ? "#B5793A" : "#2C7A56" }}>{data.adherence}%</div>
            <div style={{ fontSize: 14, color: "#555" }}>
              {isFamily
                ? (data.adherence >= 80 ? "O tratamento está sendo seguido bem. Continue incentivando." : "A adesão pode melhorar. Seu apoio nos lembretes faz diferença.")
                : (data.adherence >= 80 ? "Adesão adequada." : "Adesão abaixo do ideal — considerar reforço.")}
            </div>
          </div>
        </Section>

        {/* Medicamentos */}
        <Section title={isFamily ? "Medicamentos em uso" : "Prescrição atual"}>
          {data.meds.length === 0 && <p style={pEmpty}>Nenhum medicamento ativo.</p>}
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          {data.meds.map((m: any, i: number) => (
            <div key={i} style={{ padding: "10px 0", borderBottom: i < data.meds.length - 1 ? "1px solid #eee" : "none" }}>
              <div style={{ fontWeight: 700, fontSize: 15 }}>{m.name} {m.dose && <span style={{ fontWeight: 400, color: "#555" }}>{m.dose}</span>}</div>
              <div style={{ fontSize: 13, color: "#555" }}>
                {(m.times ?? []).join(" e ")} · {FREQ[m.frequency] ?? m.frequency}
                {m.ends_at ? ` · até ${new Date(m.ends_at + "T00:00:00").toLocaleDateString("pt-BR")}` : " · contínuo"}
              </div>
              {!isFamily && m.indication && <div style={{ fontSize: 12.5, color: "#888" }}>Indicação: {m.indication}</div>}
              {m.instructions && <div style={{ fontSize: 12.5, color: "#888", fontStyle: "italic" }}>{m.instructions}</div>}
            </div>
          ))}
        </Section>

        {/* Eventos (só clínico) */}
        {!isFamily && (
          <Section title="Eventos recentes">
            {data.events.length === 0 && <p style={pEmpty}>Nenhum evento registrado.</p>}
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {data.events.map((e: any, i: number) => (
              <div key={i} style={{ fontSize: 13.5, padding: "5px 0" }}>
                <b>{EVENT_LABEL[e.type] ?? e.type}</b>
                <span style={{ color: "#888" }}> · {new Date(e.occurred_at).toLocaleDateString("pt-BR")}</span>
                {e.note && <span style={{ color: "#555" }}> — {e.note}</span>}
              </div>
            ))}
          </Section>
        )}

        {/* Sinais de alerta (só clínico) */}
        {!isFamily && data.warnings.length > 0 && (
          <Section title="Sinais de atenção">
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {data.warnings.map((w: any, i: number) => (
              <div key={i} style={{ fontSize: 13.5, padding: "4px 0" }}>• {w.label}{w.detail ? ` — ${w.detail}` : ""}</div>
            ))}
          </Section>
        )}

        {/* Recomendações família */}
        {isFamily && (
          <Section title="Como você pode ajudar">
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 14, color: "#444", lineHeight: 1.7 }}>
              <li>Ajude a manter os horários dos medicamentos.</li>
              <li>Observe mudanças de humor, sono ou apetite e avise o médico.</li>
              <li>Mantenha o estoque de medicamentos em dia.</li>
              <li>Compareça às consultas de acompanhamento.</li>
            </ul>
          </Section>
        )}

        {/* Rodapé */}
        <div style={{ marginTop: 32, paddingTop: 16, borderTop: "1px solid #ddd", fontSize: 11, color: "#999", textAlign: "center" }}>
          Documento gerado por {data.brandName} em {today}. {!isFamily && "Uso clínico."}
        </div>
      </div>

      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: #fff !important; }
          .sheet { box-shadow: none !important; margin: 0 !important; max-width: 100% !important; border-radius: 0 !important; }
          @page { margin: 1.4cm; }
        }
      `}</style>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 22 }}>
      <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", color: "#999", marginBottom: 9, borderBottom: "1px solid #eee", paddingBottom: 5 }}>{title}</div>
      {children}
    </div>
  );
}

const sheet: React.CSSProperties = { background: "#fff", maxWidth: 760, margin: "0 auto", padding: "40px 44px", borderRadius: 4, boxShadow: "0 2px 16px rgba(0,0,0,.08)" };
const tab: React.CSSProperties = { padding: "8px 16px", borderRadius: 9, background: "#fff", border: "1px solid #DcDdDc", fontSize: 13.5, fontWeight: 600, color: "#555", textDecoration: "none" };
const tabOn: React.CSSProperties = { background: "#1A1D1C", color: "#fff", borderColor: "#1A1D1C" };
const btnPrimary: React.CSSProperties = { padding: "9px 16px", borderRadius: 9, background: "#2C7A56", color: "#fff", border: "none", fontSize: 13.5, fontWeight: 700, cursor: "pointer" };
const btnGhost: React.CSSProperties = { padding: "9px 14px", borderRadius: 9, background: "#fff", border: "1px solid #DcDdDc", fontSize: 13.5, fontWeight: 600, color: "#555", textDecoration: "none" };
const pEmpty: React.CSSProperties = { fontSize: 13.5, color: "#999" };
