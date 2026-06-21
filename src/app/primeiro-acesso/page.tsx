"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";

export default function PrimeiroAcessoPage() {
  const router = useRouter();
  const supabase = createClient();
  const [step, setStep] = useState<"email" | "create">("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [member, setMember] = useState<{ full_name: string; role: string } | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function checkEmail() {
    setErr(null); setBusy(true);
    const { data, error } = await supabase.rpc("team_email_status", { p_email: email.trim() });
    setBusy(false);
    const row = Array.isArray(data) ? data[0] : data;
    if (error || !row?.exists_pending) {
      setErr("Este e-mail não está autorizado, ou o acesso já foi criado. Confira com o médico responsável.");
      return;
    }
    setMember({ full_name: row.full_name, role: row.role });
    setStep("create");
  }

  async function createAccount() {
    setErr(null); setBusy(true);
    // cria a conta com o e-mail autorizado
    const { error: signErr } = await supabase.auth.signUp({
      email: email.trim(), password,
      options: { data: { full_name: member?.full_name, role: "patient" } },
    });
    if (signErr) { setErr(signErr.message); setBusy(false); return; }
    // garante sessão (caso confirmação de e-mail esteja desligada no Supabase)
    await supabase.auth.signInWithPassword({ email: email.trim(), password });
    // vincula ao registro de membro
    const { data: claimed } = await supabase.rpc("claim_team_membership");
    setBusy(false);
    if (!claimed) { setErr("Não foi possível vincular o acesso. Fale com o médico."); return; }
    router.push("/medico");
  }

  const ROLE: Record<string, string> = { secretary: "Secretária", nurse: "Enfermeiro(a)", reception: "Recepção", clinic_admin: "Admin da clínica", doctor: "Médico" };

  return (
    <main style={{ minHeight: "100vh", display: "flex", flexDirection: "column", justifyContent: "center", padding: 26, maxWidth: 420, margin: "0 auto" }}>
      <div style={{ width: 56, height: 56, borderRadius: 17, background: "var(--accent)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, fontWeight: 800, marginBottom: 20 }}>M</div>

      {step === "email" && (
        <>
          <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-.02em" }}>Primeiro acesso da equipe</h1>
          <p style={{ color: "var(--label-2)", margin: "8px 0 22px" }}>
            Digite o e-mail que o médico cadastrou para você. Você criará sua senha em seguida.
          </p>
          <input style={inp} type="email" placeholder="Seu e-mail" value={email} onChange={(e) => setEmail(e.target.value)} />
          {err && <p style={{ color: "var(--bad)", fontSize: 13, margin: "2px 4px 12px" }}>⚠ {err}</p>}
          <button style={btn} onClick={checkEmail} disabled={busy || !email}>{busy ? "..." : "Continuar"}</button>
          <a href="/login" style={{ color: "var(--accent)", marginTop: 16, fontWeight: 600, textAlign: "center", textDecoration: "none" }}>Já tenho conta — entrar</a>
        </>
      )}

      {step === "create" && member && (
        <>
          <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: "-.02em" }}>Olá, {member.full_name.split(" ")[0]}</h1>
          <p style={{ color: "var(--label-2)", margin: "8px 0 20px" }}>
            Você entrará como <b>{ROLE[member.role] ?? member.role}</b>. Crie sua senha de acesso.
          </p>
          <input style={inp} type="password" placeholder="Crie uma senha" value={password} onChange={(e) => setPassword(e.target.value)} />
          {err && <p style={{ color: "var(--bad)", fontSize: 13, margin: "2px 4px 12px" }}>⚠ {err}</p>}
          <button style={btn} onClick={createAccount} disabled={busy || password.length < 6}>{busy ? "..." : "Criar acesso e entrar"}</button>
          <button onClick={() => setStep("email")} style={{ background: "none", border: "none", color: "var(--label-2)", marginTop: 14, cursor: "pointer" }}>Voltar</button>
        </>
      )}
    </main>
  );
}

const inp: React.CSSProperties = { width: "100%", background: "var(--card)", border: "1px solid #E4E3EA", borderRadius: 15, padding: 15, fontSize: 16, marginBottom: 11 };
const btn: React.CSSProperties = { width: "100%", background: "var(--accent)", color: "#fff", border: "none", borderRadius: 15, padding: 16, fontWeight: 700, fontSize: 16, cursor: "pointer" };
