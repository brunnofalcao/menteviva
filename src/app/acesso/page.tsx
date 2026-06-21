"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";

const onlyDigits = (s: string) => s.replace(/\D/g, "");
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";

export default function AcessoPacientePage() {
  const router = useRouter();
  const supabase = createClient();
  const [cpf, setCpf] = useState("");
  const [phone, setPhone] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function entrar() {
    setErr(null); setBusy(true);
    try {
      // chama a Edge Function que cria (1º acesso) ou valida o paciente
      const res = await fetch(`${SUPABASE_URL}/functions/v1/patient-access`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cpf: onlyDigits(cpf), phone: onlyDigits(phone) }),
      });
      const data = await res.json();
      if (!data.ok) { setErr(data.error ?? "Não foi possível acessar."); setBusy(false); return; }

      // faz login com as credenciais internas (e-mail derivado do CPF + telefone)
      const { error } = await supabase.auth.signInWithPassword({
        email: data.email, password: onlyDigits(phone),
      });
      if (error) { setErr("Telefone não confere com o cadastro."); setBusy(false); return; }
      router.push("/app");
    } catch {
      setErr("Erro de conexão. Tente novamente."); setBusy(false);
    }
  }

  return (
    <main style={{ minHeight: "100vh", display: "flex", flexDirection: "column", justifyContent: "center", padding: 26, maxWidth: 420, margin: "0 auto" }}>
      <div style={{ width: 60, height: 60, borderRadius: 18, background: "var(--accent)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, fontWeight: 800, marginBottom: 20 }}>M</div>
      <h1 style={{ fontSize: 27, fontWeight: 800, letterSpacing: "-.02em" }}>Acesso do paciente</h1>
      <p style={{ color: "var(--label-2)", margin: "8px 0 22px" }}>
        Entre com seu <b>CPF</b> e seu <b>telefone</b> (o mesmo que seu médico cadastrou).
      </p>

      <label style={lbl}>CPF</label>
      <input style={inp} inputMode="numeric" placeholder="000.000.000-00" value={cpf} onChange={(e) => setCpf(e.target.value)} />

      <label style={lbl}>Telefone (com DDD)</label>
      <input style={inp} inputMode="numeric" placeholder="(11) 99999-9999" value={phone} onChange={(e) => setPhone(e.target.value)} />

      {err && <p style={{ color: "var(--bad)", fontSize: 13, margin: "4px 4px 12px" }}>⚠ {err}</p>}
      <button style={btn} onClick={entrar} disabled={busy || cpf.length < 11}>{busy ? "Entrando..." : "Entrar"}</button>
      <p style={{ color: "var(--label-3)", fontSize: 12.5, textAlign: "center", marginTop: 14 }}>
        Não tem cadastro? Peça ao seu médico para incluir você.
      </p>
    </main>
  );
}

const lbl: React.CSSProperties = { display: "block", fontSize: 12, fontWeight: 700, color: "var(--label-2)", textTransform: "uppercase", letterSpacing: ".05em", margin: "12px 0 7px" };
const inp: React.CSSProperties = { width: "100%", background: "var(--card)", border: "1px solid #E4E3EA", borderRadius: 15, padding: 15, fontSize: 16 };
const btn: React.CSSProperties = { width: "100%", background: "var(--accent)", color: "#fff", border: "none", borderRadius: 15, padding: 16, fontWeight: 700, fontSize: 16, cursor: "pointer", marginTop: 14 };
