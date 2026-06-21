"use client";
import { useState } from "react";
import { addSupportMember } from "./support-actions";

const RELATIONSHIPS = [
  ["son", "Filho"], ["daughter", "Filha"], ["father", "Pai"], ["mother", "Mãe"],
  ["spouse", "Cônjuge"], ["partner", "Companheiro(a)"], ["brother", "Irmão"], ["sister", "Irmã"],
  ["grandchild", "Neto(a)"], ["caregiver", "Cuidador(a)"], ["nurse", "Enfermeiro(a)"], ["other", "Outro"],
];

export default function AddSupportForm({ patientId }: { patientId: string }) {
  const [open, setOpen] = useState(false);
  if (!open) return <button onClick={() => setOpen(true)} style={openBtn}>+ Adicionar à rede de apoio</button>;

  return (
    <form action={addSupportMember} style={card} onSubmit={() => setTimeout(() => setOpen(false), 100)}>
      <input type="hidden" name="patientId" value={patientId} />
      <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 14 }}>Nova pessoa na rede de apoio</div>

      <label style={lbl}>Nome</label>
      <input name="full_name" required placeholder="Nome completo" style={inp} />

      <div style={{ display: "flex", gap: 10 }}>
        <div style={{ flex: 1 }}><label style={lbl}>Relação</label>
          <select name="relationship" style={inp}>
            {RELATIONSHIPS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
        <div style={{ flex: 1 }}><label style={lbl}>Papel</label>
          <select name="role" style={inp}>
            <option value="family">Família (só acompanha)</option>
            <option value="caregiver">Cuidador (portal + eventos)</option>
            <option value="nurse">Enfermeiro (portal + eventos)</option>
          </select>
        </div>
      </div>

      <div style={{ display: "flex", gap: 10 }}>
        <div style={{ flex: 1 }}><label style={lbl}>WhatsApp</label><input name="phone" inputMode="numeric" placeholder="(11) 99999-9999" style={inp} /></div>
        <div style={{ flex: 1 }}><label style={lbl}>E-mail (opcional)</label><input name="email" type="email" placeholder="email@exemplo.com" style={inp} /></div>
      </div>

      <div style={{ background: "var(--accent-soft, #EEF3F1)", color: "var(--accent-ink, #2C6BBF)", borderRadius: 10, padding: "10px 13px", fontSize: 12.5, margin: "14px 0 4px" }}>
        Cuidadores e enfermeiros recebem permissões para ver sintomas e registrar eventos. Família entra só acompanhando — você ajusta depois.
      </div>

      <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
        <button type="submit" style={saveBtn}>Adicionar</button>
        <button type="button" onClick={() => setOpen(false)} style={cancelBtn}>Cancelar</button>
      </div>
    </form>
  );
}

const openBtn: React.CSSProperties = { background: "var(--accent)", color: "#fff", border: "none", borderRadius: 11, padding: "11px 17px", fontWeight: 700, fontSize: 14, cursor: "pointer" };
const card: React.CSSProperties = { background: "#fff", border: "1px solid #E7E9E7", borderRadius: 16, padding: 18, marginTop: 8 };
const lbl: React.CSSProperties = { display: "block", fontSize: 12, fontWeight: 700, color: "#646B67", textTransform: "uppercase", letterSpacing: ".05em", margin: "12px 0 7px" };
const inp: React.CSSProperties = { width: "100%", border: "1px solid #E7E9E7", borderRadius: 11, padding: 11, fontSize: 14 };
const saveBtn: React.CSSProperties = { background: "var(--accent)", color: "#fff", border: "none", borderRadius: 11, padding: "11px 20px", fontWeight: 700, fontSize: 14, cursor: "pointer" };
const cancelBtn: React.CSSProperties = { background: "transparent", color: "#646B67", border: "none", padding: "11px 16px", fontWeight: 600, fontSize: 14, cursor: "pointer" };
