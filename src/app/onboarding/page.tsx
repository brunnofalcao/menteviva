"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";

export default function OnboardingPage() {
  const router = useRouter();
  const supabase = createClient();
  const [step, setStep] = useState<"code" | "consent">("code");
  const [code, setCode] = useState("");
  const [doctor, setDoctor] = useState<{ id: string; brand_name: string; brand_accent: string } | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function checkCode() {
    setErr(null); setLoading(true);
    const { data, error } = await supabase
      .from("doctors")
      .select("id, brand_name, brand_accent")
      .eq("invite_code", code.trim().toUpperCase())
      .single();
    setLoading(false);
    if (error || !data) { setErr("Código não encontrado. Confira com seu médico."); return; }
    setDoctor(data);
    setStep("consent");
  }

  async function accept() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !doctor) { setLoading(false); return; }
    // cria o vínculo paciente -> médico, registra consentimento
    const { error } = await supabase.from("patients").insert({
      id: user.id,
      doctor_id: doctor.id,
      consent_at: new Date().toISOString(),
    });
    setLoading(false);
    if (error) { setErr(error.message); return; }
    router.push("/app");
  }

  return (
    <main style={{ minHeight: "100vh", display: "flex", flexDirection: "column", justifyContent: "center", padding: 26, maxWidth: 440, margin: "0 auto" }}>
      {step === "code" && (
        <>
          <h1 style={{ fontSize: 27, fontWeight: 800, letterSpacing: "-.02em" }}>Vincule-se ao seu médico</h1>
          <p style={{ color: "var(--label-2)", margin: "8px 0 22px" }}>
            Digite o código que seu médico passou. Ele acompanhará seu tratamento por aqui.
          </p>
          <input style={{ ...inp, textAlign: "center", letterSpacing: ".2em", fontWeight: 700 }}
            placeholder="DR-0000" value={code} onChange={(e) => setCode(e.target.value)} />
          {err && <p style={{ color: "var(--bad)", fontSize: 13, margin: "2px 4px 12px" }}>⚠ {err}</p>}
          <button style={btn} onClick={checkCode} disabled={loading || code.length < 3}>
            {loading ? "..." : "Continuar"}
          </button>
        </>
      )}

      {step === "consent" && doctor && (
        <>
          <h1 style={{ fontSize: 25, fontWeight: 800, letterSpacing: "-.02em" }}>
            Você está se vinculando a {doctor.brand_name}
          </h1>
          <div style={{ background: "var(--card)", borderRadius: 18, padding: 18, margin: "18px 0" }}>
            <b style={{ fontSize: 14 }}>O que seu médico poderá ver:</b>
            <ul style={{ margin: "10px 0 0", paddingLeft: 18, color: "var(--label-2)", fontSize: 14, lineHeight: 1.7 }}>
              <li>Quais doses você tomou, pulou ou adiou</li>
              <li>Seus check-ins (humor, sono e o que você registrar)</li>
              <li>Os medicamentos que você adicionar</li>
            </ul>
            <p style={{ fontSize: 13, color: "var(--label-2)", marginTop: 12 }}>
              Seus dados são protegidos e usados apenas para seu acompanhamento clínico (LGPD).
              Você pode revogar este consentimento a qualquer momento no seu perfil.
            </p>
          </div>
          {err && <p style={{ color: "var(--bad)", fontSize: 13, marginBottom: 10 }}>⚠ {err}</p>}
          <button style={btn} onClick={accept} disabled={loading}>
            {loading ? "..." : "Concordo e quero começar"}
          </button>
          <button style={{ background: "none", border: "none", color: "var(--label-2)", marginTop: 14, cursor: "pointer" }}
            onClick={() => setStep("code")}>Voltar</button>
        </>
      )}
    </main>
  );
}

const inp: React.CSSProperties = { width: "100%", background: "var(--card)", border: "1px solid #E4E3EA", borderRadius: 15, padding: 16, fontSize: 18, marginBottom: 12 };
const btn: React.CSSProperties = { width: "100%", background: "var(--accent)", color: "#fff", border: "none", borderRadius: 15, padding: 16, fontWeight: 700, fontSize: 16, cursor: "pointer" };
