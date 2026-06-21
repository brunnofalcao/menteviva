import { createServerSupabase } from "@/lib/supabase-server";
import Link from "next/link";

export default async function MedsPage() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: meds } = await supabase
    .from("medications")
    .select("id, name, dose, times, frequency, source, active")
    .eq("patient_id", user.id)
    .eq("active", true)
    .order("source");

  const byDoctor = (meds ?? []).filter((m) => m.source === "doctor");
  const byPatient = (meds ?? []).filter((m) => m.source === "patient");

  const Item = ({ m, mine }: { m: any; mine?: boolean }) => (
    <div style={item}>
      <span style={{ ...icon, background: mine ? "#F7EFDE" : "var(--accent-soft)" }}>{mine ? "🟡" : "💊"}</span>
      <span style={{ flex: 1 }}>
        <b style={{ display: "block", fontSize: 15 }}>{m.name} {m.dose ? <span style={{ fontWeight: 400, color: "var(--label-2)" }}>{m.dose}</span> : null}</b>
        <span style={{ fontSize: 12.5, color: "var(--label-2)" }}>{(m.times ?? []).join(" e ")} · {fmtFreq(m.frequency)}</span>
      </span>
      <span style={mine ? badgeY : badgeG}>{mine ? "Você" : "Ativo"}</span>
    </div>
  );

  return (
    <main style={wrap}>
      <h1 style={{ fontSize: 30, fontWeight: 800, padding: "8px 4px 16px" }}>Medicamentos</h1>

      <div style={sect}>🩺 Prescritos pelo médico</div>
      <div style={list}>
        {byDoctor.length ? byDoctor.map((m) => <Item key={m.id} m={m} />) :
          <p style={empty}>Nenhuma prescrição ativa.</p>}
      </div>

      <div style={sect}>✋ Adicionados por você</div>
      <div style={list}>
        {byPatient.length ? byPatient.map((m) => <Item key={m.id} m={m} mine />) :
          <p style={empty}>Você ainda não adicionou nada.</p>}
      </div>

      <Link href="/app/medicamentos/adicionar" style={addBtn}>+ Adicionar medicamento</Link>
      <p style={{ textAlign: "center", color: "#A4A8B2", fontSize: 12.5, marginTop: 11 }}>
        O que você adicionar aparece para seu médico.
      </p>
    </main>
  );
}

function fmtFreq(f: string) {
  return { daily: "diário", alternate: "dias alternados", weekly: "semanal", as_needed: "quando precisar" }[f] ?? f;
}

const wrap: React.CSSProperties = { maxWidth: 440, margin: "0 auto", padding: "16px 16px 96px" };
const sect: React.CSSProperties = { fontSize: 13, fontWeight: 700, color: "var(--label-2)", padding: "18px 8px 8px" };
const list: React.CSSProperties = { background: "var(--card)", borderRadius: 20, overflow: "hidden" };
const item: React.CSSProperties = { display: "flex", alignItems: "center", gap: 13, padding: "14px 15px", borderBottom: "1px solid #E4E3EA" };
const icon: React.CSSProperties = { width: 38, height: 38, borderRadius: 11, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 };
const badgeG: React.CSSProperties = { background: "#E2F3EC", color: "#1E7A58", padding: "4px 10px", borderRadius: 20, fontWeight: 700, fontSize: 11 };
const badgeY: React.CSSProperties = { background: "#FAF0DA", color: "#8A6212", padding: "4px 10px", borderRadius: 20, fontWeight: 700, fontSize: 11 };
const empty: React.CSSProperties = { padding: 15, fontSize: 13.5, color: "var(--label-2)" };
const addBtn: React.CSSProperties = { display: "block", textAlign: "center", background: "var(--accent)", color: "#fff", borderRadius: 16, padding: 16, fontWeight: 700, fontSize: 15, textDecoration: "none", marginTop: 16 };
