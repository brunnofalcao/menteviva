"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import type { MedFrequency, ReminderChannel } from "@/types/db";
import { medVisual, medSubtitle } from "@/lib/med-visual";

export default function AddMedPage() {
  const router = useRouter();
  const supabase = createClient();
  const [name, setName] = useState("");
  const [dose, setDose] = useState("");
  const [form, setForm] = useState("Comprimido");
  const [freq, setFreq] = useState<MedFrequency>("daily");
  const [times, setTimes] = useState<string[]>(["08:00"]);
  const [channel, setChannel] = useState<ReminderChannel>("push");
  const [busy, setBusy] = useState(false);

  const valid = name.trim() && times.length > 0;

  async function save() {
    setBusy(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("medications").insert({
      patient_id: user.id, source: "patient", name, dose, form,
      frequency: freq, times, channel, created_by: user.id,
    });
    router.push("/app/medicamentos");
  }

  return (
    <main style={{ maxWidth: 440, margin: "0 auto", padding: "16px 16px 40px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0 16px" }}>
        <button onClick={() => router.back()} style={{ background: "none", border: "none", color: "var(--label-2)", fontSize: 16, cursor: "pointer" }}>Cancelar</button>
        <b>Adicionar</b>
        <button onClick={save} disabled={!valid || busy} style={{ background: "none", border: "none", color: valid ? "var(--accent)" : "#C4C8CE", fontWeight: 700, fontSize: 16, cursor: valid ? "pointer" : "default" }}>Salvar</button>
      </div>

      <label style={lbl}>Nome do medicamento</label>
      <input style={inp} value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Vitamina D" />

      {name.trim() && (() => {
        const v = medVisual(name, form);
        return (
          <div style={{ display: "flex", alignItems: "center", gap: 12, background: "var(--card)", borderRadius: 16, padding: "12px 14px", marginTop: 11, boxShadow: "0 1px 3px rgba(0,0,0,.04)" }}>
            <span style={{ width: 44, height: 44, borderRadius: 13, background: v.color.bg, color: v.color.ink, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 21 }}>{v.shape}</span>
            <div>
              <b style={{ display: "block", fontSize: 15 }}>{name}{dose ? ` ${dose}` : ""}</b>
              <span style={{ fontSize: 12.5, color: "var(--label-2)" }}>{medSubtitle(name, form)}</span>
            </div>
          </div>
        );
      })()}

      <div style={{ display: "flex", gap: 11 }}>
        <div style={{ flex: 1 }}><label style={lbl}>Dose</label><input style={inp} value={dose} onChange={(e) => setDose(e.target.value)} placeholder="50 mg" /></div>
        <div style={{ flex: 1 }}><label style={lbl}>Forma</label>
          <select style={inp} value={form} onChange={(e) => setForm(e.target.value)}>
            <option>Comprimido</option><option>Cápsula</option><option>Gota</option><option>Mililitro</option>
          </select>
        </div>
      </div>

      <label style={lbl}>Frequência</label>
      <div style={seg}>
        {([["daily", "Diário"], ["alternate", "Alternado"], ["weekly", "Semanal"], ["as_needed", "S.O.S."]] as const).map(([v, l]) => (
          <button key={v} onClick={() => setFreq(v)} style={{ ...segBtn, ...(freq === v ? segOn : {}) }}>{l}</button>
        ))}
      </div>

      <label style={lbl}>Horários</label>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {times.map((t, i) => (
          <span key={i} style={timechip}>
            <input type="time" value={t} onChange={(e) => setTimes(times.map((x, j) => j === i ? e.target.value : x))}
              style={{ border: "none", background: "transparent", fontWeight: 700, color: "var(--accent-ink)", fontSize: 14 }} />
            {times.length > 1 && <button onClick={() => setTimes(times.filter((_, j) => j !== i))} style={x}>✕</button>}
          </span>
        ))}
        <button onClick={() => setTimes([...times, "12:00"])} style={{ ...timechip, background: "#F0F0F3", color: "var(--label-2)", border: "none", cursor: "pointer" }}>+ horário</button>
      </div>

      <label style={lbl}>Avisar por</label>
      <div style={seg}>
        <button onClick={() => setChannel("push")} style={{ ...segBtn, ...(channel === "push" ? segOn : {}) }}>🔔 Notificação</button>
        <button onClick={() => setChannel("whatsapp")} style={{ ...segBtn, ...(channel === "whatsapp" ? segOn : {}) }}>💬 WhatsApp</button>
      </div>

      <button onClick={save} disabled={!valid || busy} style={saveBtn}>
        {busy ? "..." : "Salvar e ativar lembretes"}
      </button>
    </main>
  );
}

const lbl: React.CSSProperties = { display: "block", fontSize: 13, fontWeight: 700, color: "var(--label-2)", padding: "14px 6px 7px" };
const inp: React.CSSProperties = { width: "100%", background: "var(--card)", border: "none", borderRadius: 15, padding: 15, fontSize: 16, boxShadow: "0 1px 3px rgba(0,0,0,.04)" };
const seg: React.CSSProperties = { display: "flex", background: "#F0F0F3", borderRadius: 13, padding: 3, gap: 2 };
const segBtn: React.CSSProperties = { flex: 1, padding: "10px 4px", border: "none", background: "transparent", borderRadius: 10, fontSize: 12.5, fontWeight: 700, color: "var(--label-2)", cursor: "pointer" };
const segOn: React.CSSProperties = { background: "#fff", color: "var(--label)", boxShadow: "0 1px 3px rgba(0,0,0,.1)" };
const timechip: React.CSSProperties = { padding: "10px 13px", borderRadius: 13, background: "var(--accent-soft)", display: "flex", alignItems: "center", gap: 6 };
const x: React.CSSProperties = { background: "none", border: "none", color: "var(--accent-ink)", cursor: "pointer", fontSize: 12 };
const saveBtn: React.CSSProperties = { width: "100%", background: "var(--accent)", color: "#fff", border: "none", borderRadius: 16, padding: 16, fontWeight: 700, fontSize: 15, cursor: "pointer", marginTop: 24 };
