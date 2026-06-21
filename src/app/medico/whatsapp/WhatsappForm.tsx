"use client";
import { useState } from "react";
import { saveWhatsappConfig } from "./actions";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function WhatsappForm({ cfg }: { cfg: any }) {
  const [locked, setLocked] = useState(true);

  return (
    <section style={{ background: "#fff", border: "1px solid #E7E9E7", borderRadius: 18, overflow: "hidden" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 18px", borderBottom: "1px solid #E7E9E7" }}>
        <b style={{ fontSize: 15 }}>Credenciais da Meta (WhatsApp Cloud API)</b>
        <button onClick={() => setLocked(!locked)} style={{
          display: "flex", alignItems: "center", gap: 6, padding: "8px 13px", borderRadius: 9,
          border: locked ? "1px solid #E7E9E7" : "1.5px solid var(--accent)",
          background: locked ? "#fff" : "var(--accent-soft, #EEF3F1)",
          color: locked ? "#646B67" : "var(--accent-ink, #2C6BBF)", fontWeight: 700, fontSize: 13, cursor: "pointer",
        }}>{locked ? "🔒 Editar" : "🔓 Editando"}</button>
      </div>

      <form action={saveWhatsappConfig} style={{ padding: 18 }} onSubmit={() => setTimeout(() => setLocked(true), 100)}>
        <label style={lbl}>Nome de exibição</label>
        <input name="display_name" defaultValue={cfg?.display_name ?? ""} placeholder="Ex.: Clínica Mente Viva" style={inp(locked)} disabled={locked} />

        <label style={lbl}>Phone Number ID</label>
        <input name="phone_number_id" defaultValue={cfg?.phone_number_id ?? ""} placeholder="ID do número na Meta" style={inp(locked)} disabled={locked} />

        <label style={lbl}>WABA ID (WhatsApp Business Account)</label>
        <input name="waba_id" defaultValue={cfg?.waba_id ?? ""} placeholder="ID da conta business" style={inp(locked)} disabled={locked} />

        <label style={lbl}>Access Token</label>
        <input name="access_token" type="password" defaultValue={cfg?.access_token ?? ""} placeholder="Token de acesso (permanente)" style={inp(locked)} disabled={locked} />
        <p style={{ fontSize: 12.5, color: "#8A6212", background: "#FAF0DA", borderRadius: 9, padding: "9px 12px", margin: "10px 0 0" }}>
          ⚠ O token é sensível. Guarde-o apenas aqui. Ao salvar com Phone Number ID + Token preenchidos, o envio é ativado automaticamente.
        </p>

        {!locked && (
          <button type="submit" style={{ marginTop: 16, background: "var(--accent)", color: "#fff", border: "none", borderRadius: 11, padding: "12px 20px", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
            Salvar e ativar
          </button>
        )}
      </form>
    </section>
  );
}

const lbl: React.CSSProperties = { display: "block", fontSize: 12, fontWeight: 700, color: "#646B67", textTransform: "uppercase", letterSpacing: ".05em", margin: "13px 0 7px" };
const inp = (locked: boolean): React.CSSProperties => ({ width: "100%", border: "1px solid #E7E9E7", borderRadius: 11, padding: 11, fontSize: 14, background: locked ? "#F4F5F4" : "#fff" });
