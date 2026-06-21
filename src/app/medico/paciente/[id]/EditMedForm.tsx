"use client";
import { useState } from "react";
import { editMedication } from "./actions";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function EditMedForm({ med, patientId }: { med: any; patientId: string }) {
  const [open, setOpen] = useState(false);
  const [times, setTimes] = useState<string[]>(med.times ?? ["08:00"]);
  const [duration, setDuration] = useState<"continuous" | "until">(med.ends_at ? "until" : "continuous");

  if (!open) {
    return <button onClick={() => setOpen(true)} style={miniBtn}>Editar</button>;
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.35)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: 16 }}>
      <form action={editMedication} style={card} onSubmit={() => setTimeout(() => setOpen(false), 100)}>
        <input type="hidden" name="medId" value={med.id} />
        <input type="hidden" name="patientId" value={patientId} />
        <input type="hidden" name="times" value={times.join(",")} />
        <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 14 }}>Editar {med.name}</div>

        <label style={lbl}>Medicamento</label>
        <input name="name" required defaultValue={med.name} style={inp} />

        <div style={{ display: "flex", gap: 10 }}>
          <div style={{ flex: 1 }}><label style={lbl}>Dose</label><input name="dose" defaultValue={med.dose ?? ""} style={inp} /></div>
          <div style={{ flex: 1 }}><label style={lbl}>Forma</label>
            <select name="form" defaultValue={med.form ?? "Comprimido"} style={inp}>
              <option>Comprimido</option><option>Cápsula</option><option>Gota</option><option>Mililitro</option>
            </select>
          </div>
        </div>

        <label style={lbl}>Frequência</label>
        <select name="frequency" defaultValue={med.frequency ?? "daily"} style={inp}>
          <option value="daily">Diário</option>
          <option value="alternate">Dias alternados</option>
          <option value="weekly">Semanal</option>
          <option value="as_needed">Quando precisar (S.O.S.)</option>
        </select>

        <label style={lbl}>Horários</label>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 4 }}>
          {times.map((t, i) => (
            <span key={i} style={chip}>
              <input type="time" value={t} onChange={(e) => setTimes(times.map((x, j) => j === i ? e.target.value : x))}
                style={{ border: "none", background: "transparent", fontWeight: 700, fontSize: 13 }} />
              {times.length > 1 && <button type="button" onClick={() => setTimes(times.filter((_, j) => j !== i))} style={x}>✕</button>}
            </span>
          ))}
          <button type="button" onClick={() => setTimes([...times, "20:00"])} style={addChip}>+ horário</button>
        </div>

        <label style={lbl}>Duração</label>
        <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
          <button type="button" onClick={() => setDuration("continuous")} style={{ ...durBtn, ...(duration === "continuous" ? durOn : {}) }}>Contínuo</button>
          <button type="button" onClick={() => setDuration("until")} style={{ ...durBtn, ...(duration === "until" ? durOn : {}) }}>Por um período</button>
        </div>
        {duration === "until" && (
          <>
            <label style={lbl}>Tomar até o dia</label>
            <input type="date" name="ends_at" defaultValue={med.ends_at ?? ""} style={inp} />
          </>
        )}

        <label style={lbl}>Avisar por</label>
        <select name="channel" defaultValue={med.channel ?? "push"} style={inp}>
          <option value="push">🔔 Notificação</option>
          <option value="whatsapp">💬 WhatsApp</option>
        </select>

        <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
          <button type="submit" style={saveBtn}>Salvar alterações</button>
          <button type="button" onClick={() => setOpen(false)} style={cancelBtn}>Cancelar</button>
        </div>
      </form>
    </div>
  );
}

const card: React.CSSProperties = { background: "#fff", borderRadius: 18, padding: 20, width: "100%", maxWidth: 440, maxHeight: "90vh", overflow: "auto" };
const lbl: React.CSSProperties = { display: "block", fontSize: 12, fontWeight: 700, color: "#646B67", textTransform: "uppercase", letterSpacing: ".05em", margin: "13px 0 7px" };
const inp: React.CSSProperties = { width: "100%", border: "1px solid #E7E9E7", borderRadius: 11, padding: 11, fontSize: 14 };
const chip: React.CSSProperties = { padding: "8px 12px", borderRadius: 11, background: "var(--accent-soft, #EEF3F1)", display: "flex", alignItems: "center", gap: 6 };
const addChip: React.CSSProperties = { padding: "9px 13px", borderRadius: 11, background: "#F4F5F4", border: "none", color: "#646B67", fontWeight: 600, fontSize: 13, cursor: "pointer" };
const x: React.CSSProperties = { background: "none", border: "none", color: "var(--accent-ink, #2C6BBF)", cursor: "pointer", fontSize: 12 };
const durBtn: React.CSSProperties = { flex: 1, padding: "11px 8px", borderRadius: 11, border: "1.5px solid #E7E9E7", background: "#fff", fontSize: 13.5, fontWeight: 600, color: "#646B67", cursor: "pointer" };
const durOn: React.CSSProperties = { borderColor: "var(--accent)", background: "var(--accent-soft, #EEF3F1)", color: "var(--accent-ink, #2C6BBF)" };
const saveBtn: React.CSSProperties = { flex: 1, background: "var(--accent)", color: "#fff", border: "none", borderRadius: 11, padding: "12px 20px", fontWeight: 700, fontSize: 14, cursor: "pointer" };
const cancelBtn: React.CSSProperties = { background: "transparent", color: "#646B67", border: "none", padding: "12px 16px", fontWeight: 600, fontSize: 14, cursor: "pointer" };
const miniBtn: React.CSSProperties = { background: "transparent", border: "1px solid #E7E9E7", borderRadius: 9, padding: "7px 12px", fontSize: 12.5, fontWeight: 600, color: "#646B67", cursor: "pointer" };
