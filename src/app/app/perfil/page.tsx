"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { enablePush } from "@/lib/push";

export default function PerfilPage() {
  const router = useRouter();
  const supabase = createClient();
  const [name, setName] = useState("");
  const [discreet, setDiscreet] = useState(false);
  const [pushOn, setPushOn] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: prof } = await supabase.from("profiles").select("full_name").eq("id", user.id).single();
      const { data: pat } = await supabase.from("patients").select("discreet_mode").eq("id", user.id).single();
      setName(prof?.full_name ?? "");
      setDiscreet(pat?.discreet_mode ?? false);
      if ("Notification" in window) setPushOn(Notification.permission === "granted");
    })();
  }, []);

  async function toggleDiscreet() {
    const v = !discreet; setDiscreet(v);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) await supabase.from("patients").update({ discreet_mode: v }).eq("id", user.id);
  }
  async function activatePush() {
    const r = await enablePush();
    if (r.ok) { setPushOn(true); setMsg("Lembretes ativados ✓"); }
    else setMsg(r.reason === "denied" ? "Permissão negada nas configurações do navegador." : "Não foi possível ativar.");
  }
  async function logout() { await supabase.auth.signOut(); router.push("/login"); }

  return (
    <main style={{ maxWidth: 440, margin: "0 auto", padding: "16px 16px 96px" }}>
      <h1 style={{ fontSize: 30, fontWeight: 800, padding: "8px 4px 2px" }}>Perfil</h1>
      <p style={{ color: "var(--label-2)", padding: "0 4px 16px", fontWeight: 600 }}>{name}</p>

      {!pushOn && (
        <button onClick={activatePush} style={{ width: "100%", background: "var(--accent)", color: "#fff", border: "none", borderRadius: 16, padding: 15, fontWeight: 700, fontSize: 15, marginBottom: 14, cursor: "pointer" }}>
          🔔 Ativar lembretes no celular
        </button>
      )}
      {msg && <p style={{ fontSize: 13, color: "var(--accent-ink)", padding: "0 4px 12px" }}>{msg}</p>}

      <div style={sect}>Privacidade</div>
      <div style={list}>
        <Row icon="🕶️" title="Modo discreto" hint='Notificação diz "Hora do seu cuidado"'>
          <Toggle on={discreet} onClick={toggleDiscreet} />
        </Row>
        <Row icon="🔔" title="Lembretes" hint={pushOn ? "Ativados neste aparelho" : "Toque no botão acima"}>
          <Toggle on={pushOn} onClick={() => {}} />
        </Row>
      </div>

      <div style={sect}>Conta</div>
      <div style={list}>
        <Row icon="📄" title="O que meu médico vê" hint="Suas doses e check-ins. Nada além disso."><span style={{ color: "#C4C8CE", fontSize: 12 }}>em breve</span></Row>
        <Row icon="👥" title="Avisar um familiar" hint="Seu médico pode ativar isso para você"><span style={{ color: "#C4C8CE", fontSize: 12 }}>em breve</span></Row>
      </div>

      <button onClick={logout} style={{ width: "100%", background: "var(--card)", color: "var(--bad)", border: "none", borderRadius: 16, padding: 15, fontWeight: 700, fontSize: 15, marginTop: 20, cursor: "pointer" }}>Sair</button>
    </main>
  );
}

function Row({ icon, title, hint, children }: { icon: string; title: string; hint: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 13, padding: "14px 15px", borderBottom: "1px solid #E4E3EA" }}>
      <span style={{ width: 38, height: 38, borderRadius: 11, background: "#F0F0F3", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>{icon}</span>
      <span style={{ flex: 1 }}>
        <b style={{ display: "block", fontSize: 15 }}>{title}</b>
        <span style={{ fontSize: 12.5, color: "var(--label-2)" }}>{hint}</span>
      </span>
      {children}
    </div>
  );
}
function Toggle({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} aria-label="toggle" style={{
      width: 50, height: 30, borderRadius: 20, border: "none", cursor: "pointer",
      background: on ? "var(--accent)" : "#E4E3EA", position: "relative", flexShrink: 0,
    }}>
      <span style={{ position: "absolute", width: 25, height: 25, borderRadius: "50%", background: "#fff", top: 2.5, left: on ? 22 : 2.5, transition: ".2s", boxShadow: "0 1px 4px rgba(0,0,0,.25)" }} />
    </button>
  );
}

const sect: React.CSSProperties = { fontSize: 13, fontWeight: 700, color: "var(--label-2)", padding: "18px 8px 8px" };
const list: React.CSSProperties = { background: "var(--card)", borderRadius: 20, overflow: "hidden" };
