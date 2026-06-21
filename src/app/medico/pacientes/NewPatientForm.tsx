"use client";
import { useState } from "react";
import { createPatient } from "./actions";

export default function NewPatientForm() {
  const [open, setOpen] = useState(false);
  if (!open) return <button onClick={() => setOpen(true)} style={openBtn}>+ Cadastrar paciente</button>;

  return (
    <form action={createPatient} style={card} onSubmit={() => setTimeout(() => setOpen(false), 100)}>
      <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 14 }}>Novo paciente</div>
      <label style={lbl}>Nome completo</label>
      <input name="full_name" required placeholder="Nome do paciente" style={inp} />
      <div style={{ display: "flex", gap: 10 }}>
        <div style={{ flex: 1 }}><label style={lbl}>CPF</label><input name="cpf" required inputMode="numeric" placeholder="000.000.000-00" style={inp} /></div>
        <div style={{ flex: 1 }}><label style={lbl}>WhatsApp (com DDD)</label><input name="phone" required inputMode="numeric" placeholder="(11) 99999-9999" style={inp} /></div>
      </div>
      <label style={lbl}>Diagnóstico (opcional)</label>
      <select name="diagnosis" style={inp} defaultValue="">
        <option value="">Definir depois</option>
        <option>Depressão</option><option>Transtorno bipolar</option><option>Ansiedade</option><option>TDAH</option>
      </select>
      <div style={{ background: "var(--accent-soft)", color: "var(--accent-ink)", borderRadius: 10, padding: "10px 13px", fontSize: 12.5, margin: "14px 0 4px" }}>
        O paciente acessará com <b>CPF</b> (login) e <b>telefone</b> (senha). Passe esses dados a ele.
      </div>
      <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
        <button type="submit" style={saveBtn}>Cadastrar</button>
        <button type="button" onClick={() => setOpen(false)} style={cancelBtn}>Cancelar</button>
      </div>
    </form>
  );
}

const openBtn: React.CSSProperties = { background: "var(--accent)", color: "#fff", border: "none", borderRadius: 11, padding: "11px 17px", fontWeight: 700, fontSize: 14, cursor: "pointer" };
const card: React.CSSProperties = { background: "#fff", border: "1px solid #E7E9E7", borderRadius: 16, padding: 18, marginBottom: 18 };
const lbl: React.CSSProperties = { display: "block", fontSize: 12, fontWeight: 700, color: "#646B67", textTransform: "uppercase", letterSpacing: ".05em", margin: "12px 0 7px" };
const inp: React.CSSProperties = { width: "100%", border: "1px solid #E7E9E7", borderRadius: 11, padding: 11, fontSize: 14 };
const saveBtn: React.CSSProperties = { background: "var(--accent)", color: "#fff", border: "none", borderRadius: 11, padding: "11px 20px", fontWeight: 700, fontSize: 14, cursor: "pointer" };
const cancelBtn: React.CSSProperties = { background: "transparent", color: "#646B67", border: "none", padding: "11px 16px", fontWeight: 600, fontSize: 14, cursor: "pointer" };
