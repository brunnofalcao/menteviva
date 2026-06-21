"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit() {
    setErr(null); setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: { data: { full_name: name, role: "patient" } }, // paciente por padrão
        });
        if (error) throw error;
        router.push("/onboarding");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        const { data: { user } } = await supabase.auth.getUser();
        const { data: p } = await supabase.from("profiles").select("role").eq("id", user!.id).single();
        if (p?.role === "doctor") { router.push("/medico"); return; }
        // é membro de equipe? então vai pro painel também
        const { data: tm } = await supabase
          .from("team_members").select("id").eq("member_id", user!.id).not("accepted_at", "is", null).limit(1);
        router.push(tm?.length ? "/medico" : "/app");
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Algo deu errado.");
    } finally { setLoading(false); }
  }

  return (
    <main style={{ minHeight: "100vh", display: "flex", flexDirection: "column", justifyContent: "center", padding: 26, maxWidth: 440, margin: "0 auto" }}>
      <div style={{ width: 60, height: 60, borderRadius: 18, background: "var(--accent)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, fontWeight: 800, marginBottom: 22 }}>M</div>
      <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-.02em" }}>
        {mode === "login" ? "Bem-vindo de volta" : "Você não está sozinho nisso."}
      </h1>
      <p style={{ color: "var(--label-2)", margin: "8px 0 24px" }}>
        {mode === "login" ? "Entre para continuar seu acompanhamento." : "Crie sua conta e vincule-se ao seu médico."}
      </p>

      {mode === "signup" && (
        <input style={inp} placeholder="Seu nome" value={name} onChange={(e) => setName(e.target.value)} />
      )}
      <input style={inp} type="email" placeholder="E-mail" value={email} onChange={(e) => setEmail(e.target.value)} />
      <input style={inp} type="password" placeholder="Senha" value={password} onChange={(e) => setPassword(e.target.value)} />

      {err && <p style={{ color: "var(--bad)", fontSize: 13, margin: "4px 4px 12px" }}>⚠ {err}</p>}

      <button style={btn} onClick={submit} disabled={loading}>
        {loading ? "..." : mode === "login" ? "Entrar" : "Criar conta"}
      </button>
      <button style={{ background: "none", border: "none", color: "var(--accent)", marginTop: 16, fontWeight: 600, cursor: "pointer" }}
        onClick={() => setMode(mode === "login" ? "signup" : "login")}>
        {mode === "login" ? "Não tenho conta — criar" : "Já tenho conta — entrar"}
      </button>
      <a href="/primeiro-acesso" style={{ color: "var(--label-2)", marginTop: 10, fontWeight: 600, textAlign: "center", textDecoration: "none", fontSize: 14 }}>
        Sou da equipe de um médico — primeiro acesso
      </a>
    </main>
  );
}

const inp: React.CSSProperties = { width: "100%", background: "var(--card)", border: "1px solid #E4E3EA", borderRadius: 15, padding: 15, fontSize: 16, marginBottom: 11 };
const btn: React.CSSProperties = { width: "100%", background: "var(--accent)", color: "#fff", border: "none", borderRadius: 15, padding: 16, fontWeight: 700, fontSize: 16, cursor: "pointer" };
