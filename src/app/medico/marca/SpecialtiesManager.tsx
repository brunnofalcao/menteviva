"use client";
import { useState } from "react";
import { addSpecialty, removeSpecialty } from "./doctor-actions";

// Profissões e suas especialidades comuns (médico é o foco).
const PROFESSIONS: Record<string, string[]> = {
  "Médico": [
    "Psiquiatria", "Geriatria", "Clínica Médica", "Neurologia", "Cardiologia",
    "Endocrinologia", "Pediatria", "Ginecologia", "Medicina de Família",
    "Medicina do Sono", "Nutrologia", "Outra",
  ],
  "Nutricionista": ["Clínica", "Esportiva", "Comportamental", "Outra"],
  "Psicólogo": ["Clínica", "Neuropsicologia", "TCC", "Outra"],
  "Enfermeiro": ["Geral", "Saúde Mental", "Geriatria", "Outra"],
};

type Spec = { id: string; profession: string; specialty: string; rqe: string | null };

export default function SpecialtiesManager({ specialties, locked }: { specialties: Spec[]; locked: boolean }) {
  const [profession, setProfession] = useState("Médico");
  const [adding, setAdding] = useState(false);

  return (
    <div>
      {/* lista atual */}
      {specialties.length === 0 && <p style={{ fontSize: 13.5, color: "#646B67", marginBottom: 12 }}>Nenhuma especialidade cadastrada ainda.</p>}
      {specialties.map((s) => (
        <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 11, padding: "11px 0", borderBottom: "1px solid #F0F1F0" }}>
          <div style={{ flex: 1 }}>
            <b style={{ fontSize: 14 }}>{s.specialty}</b>
            <div style={{ fontSize: 12.5, color: "#646B67" }}>{s.profession}{s.rqe ? ` · RQE ${s.rqe}` : " · sem RQE"}</div>
          </div>
          {!locked && (
            <form action={removeSpecialty}>
              <input type="hidden" name="id" value={s.id} />
              <button style={miniBtn}>Remover</button>
            </form>
          )}
        </div>
      ))}

      {/* adicionar (só quando destravado) */}
      {!locked && (
        adding ? (
          <form action={addSpecialty} style={{ marginTop: 14, background: "#F8F9F8", borderRadius: 12, padding: 14 }} onSubmit={() => setTimeout(() => setAdding(false), 100)}>
            <label style={lbl}>Profissão</label>
            <select name="profession" value={profession} onChange={(e) => setProfession(e.target.value)} style={inp}>
              {Object.keys(PROFESSIONS).map((p) => <option key={p}>{p}</option>)}
            </select>
            <div style={{ display: "flex", gap: 10 }}>
              <div style={{ flex: 1 }}>
                <label style={lbl}>Especialidade</label>
                <select name="specialty" style={inp}>
                  {(PROFESSIONS[profession] ?? ["Outra"]).map((e) => <option key={e}>{e}</option>)}
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label style={lbl}>RQE (opcional)</label>
                <input name="rqe" placeholder="00000" style={inp} />
              </div>
            </div>
            <div style={{ display: "flex", gap: 9, marginTop: 12 }}>
              <button type="submit" style={addBtn}>Adicionar</button>
              <button type="button" onClick={() => setAdding(false)} style={cancelBtn}>Cancelar</button>
            </div>
          </form>
        ) : (
          <button type="button" onClick={() => setAdding(true)} style={{ ...addBtn, marginTop: 14 }}>+ Adicionar especialidade</button>
        )
      )}
    </div>
  );
}

const lbl: React.CSSProperties = { display: "block", fontSize: 12, fontWeight: 700, color: "#646B67", textTransform: "uppercase", letterSpacing: ".05em", margin: "12px 0 7px" };
const inp: React.CSSProperties = { width: "100%", border: "1px solid #E7E9E7", borderRadius: 11, padding: 11, fontSize: 14, background: "#fff" };
const miniBtn: React.CSSProperties = { background: "transparent", border: "1px solid #E7E9E7", borderRadius: 9, padding: "7px 12px", fontSize: 12.5, fontWeight: 600, color: "#646B67", cursor: "pointer" };
const addBtn: React.CSSProperties = { background: "var(--accent)", color: "#fff", border: "none", borderRadius: 11, padding: "10px 18px", fontWeight: 700, fontSize: 13.5, cursor: "pointer" };
const cancelBtn: React.CSSProperties = { background: "transparent", color: "#646B67", border: "none", padding: "10px 14px", fontWeight: 600, fontSize: 13.5, cursor: "pointer" };
