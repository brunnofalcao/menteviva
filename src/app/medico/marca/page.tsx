"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";

const PRESETS = ["#3B7A6B", "#3F5DAE", "#7A4BB5", "#C4892B", "#B5485E", "#1A1B2E"];

export default function MarcaPage() {
  const supabase = createClient();
  const [name, setName] = useState("Mente Viva");
  const [accent, setAccent] = useState("#3B7A6B");
  const [code, setCode] = useState("");
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from("doctors").select("brand_name, brand_accent, invite_code").eq("id", user.id).single();
      if (data) { setName(data.brand_name); setAccent(data.brand_accent); setCode(data.invite_code); }
    })();
  }, []);

  function contrastOk(hex: string) {
    const h = hex.replace("#", "");
    const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
    const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return lum < 0.6; // escuro o suficiente p/ texto branco
  }

  async function save() {
    setBusy(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("doctors").update({ brand_name: name, brand_accent: accent }).eq("id", user.id);
    setSaved(true); setBusy(false);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="mv-page" style={{ maxWidth: 820 }}>
      <div style={{ fontSize: 12.5, color: "#9BA29D", fontWeight: 600 }}>Marca & whitelabel</div>
      <h1 className="mv-title" style={{ fontSize: 30, fontWeight: 700, margin: "6px 0 4px" }}>Sua marca</h1>
      <p style={{ color: "#646B67", fontSize: 14, marginBottom: 22 }}>O app do paciente assume a identidade da sua clínica.</p>

      <div className="mv-split-2">
        <section style={panel}>
          <div style={ph}><b>Identidade</b></div>
          <div style={{ padding: 19 }}>
            <label style={lbl}>Nome exibido</label>
            <input style={inp} value={name} onChange={(e) => setName(e.target.value)} maxLength={20} />

            <label style={lbl}>Cor da marca</label>
            <div style={{ display: "flex", gap: 9, marginBottom: 8 }}>
              {PRESETS.map((c) => (
                <button key={c} onClick={() => setAccent(c)} aria-label={c}
                  style={{ width: 30, height: 30, borderRadius: 9, background: c, border: accent === c ? "2px solid #1A1D1C" : "2px solid transparent", cursor: "pointer" }} />
              ))}
              <input type="color" value={accent} onChange={(e) => setAccent(e.target.value)} style={{ width: 36, height: 30, border: "none", background: "none", cursor: "pointer" }} />
            </div>
            {contrastOk(accent)
              ? <div style={{ ...note, background: "#E2F3EC", color: "#1E7A58" }}>✓ Contraste aprovado.</div>
              : <div style={{ ...note, background: "#FAF0DA", color: "#8A6212" }}>⚠ Cor clara: o texto sobre ela será escurecido automaticamente para manter a legibilidade.</div>}

            <label style={lbl}>Código de convite</label>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <code style={{ background: "#F4F5F4", padding: "10px 14px", borderRadius: 10, fontWeight: 700, letterSpacing: ".1em" }}>{code || "—"}</code>
              <span style={{ fontSize: 12.5, color: "#646B67" }}>Compartilhe com seus pacientes para vincularem.</span>
            </div>

            <button onClick={save} disabled={busy} style={{ marginTop: 22, background: "var(--accent)", color: "#fff", border: "none", borderRadius: 11, padding: "12px 18px", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
              {busy ? "..." : saved ? "Salvo ✓" : "Salvar marca"}
            </button>
          </div>
        </section>

        <section style={panel}>
          <div style={ph}><b>Prévia no app do paciente</b></div>
          <div style={{ padding: 22, display: "flex", justifyContent: "center" }}>
            <div style={{ width: 180, background: "#10160F", borderRadius: 30, padding: 8 }}>
              <div style={{ background: "#EFEEF3", borderRadius: 24, padding: "18px 14px", minHeight: 290 }}>
                <div style={{ width: 44, height: 44, borderRadius: 13, background: accent, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 21, marginBottom: 12 }}>{(name[0] || "M").toUpperCase()}</div>
                <div style={{ fontSize: 18, fontWeight: 800 }}>{name}</div>
                <div style={{ fontSize: 12, color: "#9BA29D", marginBottom: 14 }}>Bom dia, Helena</div>
                <div style={{ background: "#fff", borderRadius: 16, padding: 12, textAlign: "center" }}>
                  <div style={{ fontSize: 22, fontWeight: 800, color: accent }}>2/3</div>
                  <div style={{ fontSize: 10, color: "#9BA29D", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em" }}>doses hoje</div>
                </div>
                <div style={{ background: accent, color: "#fff", borderRadius: 13, padding: 11, textAlign: "center", fontSize: 13, fontWeight: 700, marginTop: 10 }}>Confirmar dose</div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

const panel: React.CSSProperties = { background: "#fff", border: "1px solid #E7E9E7", borderRadius: 18, overflow: "hidden" };
const ph: React.CSSProperties = { padding: "15px 19px", borderBottom: "1px solid #E7E9E7", fontSize: 15 };
const lbl: React.CSSProperties = { display: "block", fontSize: 12, fontWeight: 700, color: "#646B67", textTransform: "uppercase", letterSpacing: ".05em", margin: "16px 0 8px" };
const inp: React.CSSProperties = { width: "100%", border: "1px solid #E7E9E7", borderRadius: 11, padding: 12, fontSize: 15 };
const note: React.CSSProperties = { borderRadius: 10, padding: "10px 13px", fontSize: 13, fontWeight: 600 };
