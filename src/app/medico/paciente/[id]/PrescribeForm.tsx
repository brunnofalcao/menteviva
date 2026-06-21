"use client";
import { useState } from "react";
import { prescribeMedication } from "./actions";

export default function PrescribeForm({ patientId }: { patientId: string }) {
  const [open, setOpen] = useState(false);
  const [times, setTimes] = useState<string[]>(["08:00"]);

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} style={openBtn}>+ Prescrever medicamento</button>
    );
  }

  return (
    <form action={prescribeMedication} style={card}>
      <input type="hidden" name="patientId" value={patientId} />
      <input type="hidden" name="times" value={times.join(",")} />
      <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 14 }}>Nova prescrição</div>

      <label style={lbl}>Medicamento</label>
      <input name="name" required placeholder="Ex.: Sertralina" style={inp} />

      <div style={{ display: "flex", gap: 10 }}>
        <div style={{ flex: 1 }}><label style={lbl}>Dose</label><input name="dose" placeholder="50mg" style={inp} /></div>
        <div style={{ flex: 1 }}><label style={lbl}>Forma</label>
          <select name="form" style={inp}><option>Comprimido</option><option>Cápsula</option><option>Gota</option><option>Mililitro</option></select>
        </div>
      </div>

      <label style={lbl}>Frequência</label>
      <select name="frequency" style={inp} defaultValue="daily">
        <option value="daily">Diário</option>
        <option value="alternate">Dias alternados</option>
        <option value="weekly">Semanal</option>
        <option value="as_needed">Quando precisar (S.O.S.)</option>
      </select>

      <label style={lbl}>Horários</label>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        {times.map((t, i) => (
          <span key={i} style={chip}>
            <input type="time" value={t} onChange={(e) => setTimes(times.map((x, j) => j === i ? e.target.value : x))}
              style={{ border: "none", background: "transparent", fontWeight: 700, fontSize: 13 }} />
            {times.length > 1 && <button type="button" onClick={() => setTimes(times.filter((_, j) => j !== i))} style={x}>✕</button>}
          </span>
        ))}
        <button type="button" onClick={() => setTimes([...times, "20:00"])} style={addChip}>+ horário</button>
      </div>

      <label style={lbl}>Avisar por</label>
      <select name="channel" style={inp} defaultValue="push">
        <option value="push">🔔 Notificação (grátis)</option>
        <option value="whatsapp">💬 WhatsApp</option>
      </select>

      <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
        <button type="submit" style={saveBtn}>Prescrever</button>
        <button type="button" onClick={() => setOpen(false)} style={cancelBtn}>Cancelar</button>
      </div>
    </form>
  );
}

const openBtn: React.CSSProperties = { background: "var(--accent)", color: "#fff", border: "none", borderRadius: 11, padding: "12px 18px", fontWeight: 700, fontSize: 14, cursor: "pointer" };
const card: React.CSSProperties = { background: "#fff", border: "1px solid #E7E9E7", borderRadius: 16, padding: 18, marginTop: 4 };
const lbl: React.CSSProperties = { display: "block", fontSize: 12, fontWeight: 700, color: "#646B67", textTransform: "uppercase", letterSpacing: ".05em", margin: "14px 0 7px" };
const inp: React.CSSProperties = { width: "100%", border: "1px solid #E7E9E7", borderRadius: 11, padding: 11, fontSize: 14 };
const chip: React.CSSProperties = { padding: "8px 12px", borderRadius: 11, background: "var(--accent-soft)", display: "flex", alignItems: "center", gap: 6 };
const addChip: React.CSSProperties = { padding: "9px 13px", borderRadius: 11, background: "#F4F5F4", border: "none", color: "#646B67", fontWeight: 600, fontSize: 13, cursor: "pointer" };
const x: React.CSSProperties = { background: "none", border: "none", color: "var(--accent-ink)", cursor: "pointer", fontSize: 12 };
const saveBtn: React.CSSProperties = { background: "var(--accent)", color: "#fff", border: "none", borderRadius: 11, padding: "12px 20px", fontWeight: 700, fontSize: 14, cursor: "pointer" };
const cancelBtn: React.CSSProperties = { background: "transparent", color: "#646B67", border: "none", padding: "12px 16px", fontWeight: 600, fontSize: 14, cursor: "pointer" };
