"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import type { SkipReason } from "@/types/db";

const REASONS: { v: SkipReason; label: string; hint: string }[] = [
  { v: "forgot", label: "Esqueci", hint: "" },
  { v: "side_effect", label: "Efeito colateral", hint: "seu médico será avisado" },
  { v: "ran_out", label: "Acabou o remédio", hint: "seu médico será avisado" },
  { v: "felt_better", label: "Me senti melhor", hint: "" },
  { v: "other", label: "Outro motivo", hint: "" },
];

export default function ConfirmDose({ dose }: { dose: { id: string; name: string; dose: string | null; detail?: string; shape?: string; colorBg?: string; colorInk?: string } }) {
  const router = useRouter();
  const supabase = createClient();
  const [phase, setPhase] = useState<"main" | "skip" | "done">("main");
  const [busy, setBusy] = useState(false);

  async function take() {
    setBusy(true);
    const { data: { user } } = await supabase.auth.getUser();
    const late = new Date() > new Date(new Date(dose.scheduled_at).getTime() + 60 * 6e4);
    await supabase.from("doses").update({
      status: "taken", acted_at: new Date().toISOString(),
      confirmed_by: user?.id ?? null, confirmed_role: "patient", was_delayed: late,
    }).eq("id", dose.id);
    setPhase("done");
    setTimeout(() => router.push("/app"), 700);
  }
  async function snooze() {
    setBusy(true);
    await supabase.from("doses").update({ status: "snoozed", scheduled_at: new Date(Date.now() + 30 * 6e4).toISOString() }).eq("id", dose.id);
    router.push("/app");
  }
  async function skip(reason: SkipReason) {
    setBusy(true);
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("doses").update({
      status: "skipped", acted_at: new Date().toISOString(), skip_reason: reason,
      confirmed_by: user?.id ?? null, confirmed_role: "patient",
    }).eq("id", dose.id);
    setPhase("done");
    setTimeout(() => router.push("/app"), 700);
  }

  if (phase === "done") {
    return (
      <main style={center}>
        <div style={{ fontSize: 60 }}>💚</div>
        <p style={{ fontSize: 18, fontWeight: 700, marginTop: 10 }}>Registrado.</p>
        <p style={{ color: "var(--label-2)" }}>Cuide-se bem hoje.</p>
      </main>
    );
  }

  return (
    <main style={{ minHeight: "100vh", display: "flex", flexDirection: "column", justifyContent: "flex-end", background: "#3A4540" }}>
      <div style={sheet}>
        <div style={grabber} />
        {phase === "main" ? (
          <>
            <div style={{ textAlign: "center", padding: "18px 0 4px" }}>
              <div style={{ ...bigpill, background: dose.colorBg ?? "var(--accent-soft)", color: dose.colorInk ?? "inherit" }}>{dose.shape ?? "💊"}</div>
              <div style={{ fontSize: 23, fontWeight: 800, letterSpacing: "-.02em" }}>{dose.name}</div>
              <p style={{ color: "var(--label-2)", fontSize: 14, margin: "6px 0 10px" }}>{dose.detail ?? dose.dose}</p>
              <span style={badge}>No horário</span>
            </div>
            <button style={btn} onClick={take} disabled={busy}>Registrar que tomei</button>
            <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
              <button style={{ ...btn, background: "var(--accent-soft)", color: "var(--accent-ink)" }} onClick={snooze} disabled={busy}>Lembrar em 30 min</button>
              <button style={{ ...btn, background: "var(--card)", color: "var(--label-2)" }} onClick={() => setPhase("skip")} disabled={busy}>Não tomei</button>
            </div>
            <p style={{ textAlign: "center", color: "#A4A8B2", fontSize: 12.5, marginTop: 16 }}>
              Seu registro ajuda seu médico. Sem julgamento — só cuidado.
            </p>
          </>
        ) : (
          <>
            <div style={{ fontSize: 19, fontWeight: 800, padding: "8px 4px 4px" }}>O que aconteceu desta vez?</div>
            <p style={{ color: "var(--label-2)", fontSize: 13.5, padding: "0 4px 14px" }}>Isso ajuda seu médico a entender — sem cobrança.</p>
            {REASONS.map((r) => (
              <button key={r.v} style={reasonBtn} onClick={() => skip(r.v)} disabled={busy}>
                <span style={{ fontWeight: 600 }}>{r.label}</span>
                {r.hint && <span style={{ fontSize: 12, color: "var(--label-2)" }}>{r.hint}</span>}
              </button>
            ))}
            <button style={{ background: "none", border: "none", color: "var(--label-2)", padding: 12, fontWeight: 600, cursor: "pointer" }} onClick={() => setPhase("main")}>Voltar</button>
          </>
        )}
      </div>
    </main>
  );
}

const sheet: React.CSSProperties = { background: "var(--sys-bg)", borderRadius: "32px 32px 0 0", padding: "0 18px 28px", boxShadow: "0 -10px 40px rgba(0,0,0,.3)" };
const grabber: React.CSSProperties = { width: 38, height: 5, borderRadius: 3, background: "#A4A8B2", opacity: .5, margin: "10px auto 0" };
const bigpill: React.CSSProperties = { width: 74, height: 74, borderRadius: 22, background: "var(--accent-soft)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 34, margin: "0 auto 14px" };
const badge: React.CSSProperties = { background: "#E2F3EC", color: "#1E7A58", padding: "4px 12px", borderRadius: 20, fontWeight: 700, fontSize: 12 };
const btn: React.CSSProperties = { flex: 1, width: "100%", background: "var(--accent)", color: "#fff", border: "none", borderRadius: 16, padding: 16, fontWeight: 700, fontSize: 15, cursor: "pointer", marginTop: 6 };
const reasonBtn: React.CSSProperties = { width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--card)", border: "none", borderRadius: 14, padding: 15, marginBottom: 9, cursor: "pointer", fontSize: 15 };
const center: React.CSSProperties = { minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center" };
