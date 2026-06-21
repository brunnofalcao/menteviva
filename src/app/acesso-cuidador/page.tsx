"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";

const onlyDigits = (s: string) => s.replace(/\D/g, "");
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";

export default function AcessoCuidadorPage() {
  const router = useRouter();
  const supabase = createClient();
  const [code, setCode] = useState("");
  const [phone, setPhone] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function entrar() {
    setErr(null); setBusy(true);
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/patient-access`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "caregiver_login", code: code.trim(), phone: onlyDigits(phone) }),
      });
      let data: { ok?: boolean; email?: string; error?: string } = {};
      try { data = await res.json(); } catch { data = {}; }
      if (!res.ok || !data.ok || !data.email) {
        setErr(data.error ?? `Falha no acesso (código ${res.status}).`);
        setBusy(false); return;
      }
      const { error } = await supabase.auth.signInWithPassword({ email: data.email, password: onlyDigits(phone) });
      if (error) { setErr(`Não foi possível entrar: ${error.message}`); setBusy(false); return; }
      router.push("/cuidador");
    } catch (e) {
      setErr(`Erro de conexão: ${e instanceof Error ? e.message : "tente novamente"}.`);
      setBusy(false);
    }
  }

  return (
    <main style={{ minHeight: "100vh", display: "flex", flexDirection: "column", justifyContent: "center", padding: 26, maxWidth: 420, margin: "0 auto" }}>
      <div style={{ width: 60, height: 60, borderRadius: 18, background: "var(--accent)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, fontWeight: 800, marginBottom: 20 }}>♥</div>
      <h1 style={{ fontSize: 27, fontWeight: 800, letterSpacing: "-.02em" }}>Acesso do cuidador</h1>
      <p style={{ color: "var(--label-2)", margin: "8px 0 22px" }}>
        Entre com o código que o médico passou e o seu telefone.
      </p>

      <label style={lbl}>Código de acesso</label>
      <input style={inp} value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="Ex.: A1B2C3" autoComplete="off" />

      <label style={lbl}>Telefone</label>
      <input style={inp} type="password" inputMode="numeric" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="off" />

      {err && <p style={{ color: "var(--bad, #B5485E)", fontSize: 13, margin: "4px 4px 12px" }}>⚠ {err}</p>}

      <button style={btn} onClick={entrar} disabled={busy || !code}>{busy ? "Entrando..." : "Entrar"}</button>
    </main>
  );
}

const lbl: React.CSSProperties = { display: "block", fontSize: 12, fontWeight: 700, color: "var(--label-2)", textTransform: "uppercase", letterSpacing: ".05em", margin: "12px 0 7px" };
const inp: React.CSSProperties = { width: "100%", border: "1px solid #E7E9E7", borderRadius: 12, padding: 13, fontSize: 15, marginBottom: 4 };
const btn: React.CSSProperties = { width: "100%", background: "var(--accent)", color: "#fff", border: "none", borderRadius: 12, padding: 15, fontWeight: 700, fontSize: 16, cursor: "pointer", marginTop: 14 };
