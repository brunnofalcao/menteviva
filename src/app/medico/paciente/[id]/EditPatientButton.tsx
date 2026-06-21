"use client";
import { useState } from "react";
import { editPatientInfo } from "./actions";

export default function EditPatientButton({ patientId, name, phone }: { patientId: string; name: string; phone: string | null }) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return <button onClick={() => setOpen(true)} style={btn}>🔒 Editar dados</button>;
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.35)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: 16 }}>
      <form
        action={editPatientInfo}
        style={card}
        onSubmit={(e) => {
          if (!confirm("Salvar as alterações nos dados do paciente?")) { e.preventDefault(); return; }
          setTimeout(() => setOpen(false), 100);
        }}
      >
        <input type="hidden" name="patientId" value={patientId} />
        <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 14 }}>Editar dados do paciente</div>
        <label style={lbl}>Nome completo</label>
        <input name="full_name" defaultValue={name} required style={inp} />
        <label style={lbl}>Telefone (também é a senha de acesso)</label>
        <input name="phone" defaultValue={phone ?? ""} inputMode="numeric" style={inp} />
        <p style={{ fontSize: 12.5, color: "#8A6212", background: "#FAF0DA", borderRadius: 9, padding: "9px 12px", margin: "12px 0 4px" }}>
          ⚠ Mudar o telefone altera a senha de acesso do paciente. Avise-o do novo número.
        </p>
        <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
          <button type="submit" style={saveBtn}>Salvar alterações</button>
          <button type="button" onClick={() => setOpen(false)} style={cancelBtn}>Cancelar</button>
        </div>
      </form>
    </div>
  );
}

const btn: React.CSSProperties = { padding: "9px 15px", borderRadius: 10, background: "#fff", border: "1px solid #E7E9E7", fontSize: 13.5, fontWeight: 600, color: "#1A1D1C", cursor: "pointer" };
const card: React.CSSProperties = { background: "#fff", borderRadius: 18, padding: 20, width: "100%", maxWidth: 420 };
const lbl: React.CSSProperties = { display: "block", fontSize: 12, fontWeight: 700, color: "#646B67", textTransform: "uppercase", letterSpacing: ".05em", margin: "13px 0 7px" };
const inp: React.CSSProperties = { width: "100%", border: "1px solid #E7E9E7", borderRadius: 11, padding: 11, fontSize: 14 };
const saveBtn: React.CSSProperties = { flex: 1, background: "var(--accent)", color: "#fff", border: "none", borderRadius: 11, padding: "12px 20px", fontWeight: 700, fontSize: 14, cursor: "pointer" };
const cancelBtn: React.CSSProperties = { background: "transparent", color: "#646B67", border: "none", padding: "12px 16px", fontWeight: 600, fontSize: 14, cursor: "pointer" };
