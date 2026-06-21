import { createServerSupabase } from "@/lib/supabase-server";
import Link from "next/link";

export default async function PacientesPage() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: patients } = await supabase
    .from("patients").select("id, diagnosis_label, profiles(full_name)");

  const rows = await Promise.all((patients ?? []).map(async (p) => {
    const { data: adh } = await supabase.rpc("adherence_rate", { p_patient: p.id, p_days: 30 });
    const { data: lastCheckin } = await supabase
      .from("checkins").select("mood, day").eq("patient_id", p.id).order("day", { ascending: false }).limit(1).single();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const prof: any = p.profiles;
    return { id: p.id, name: prof?.full_name ?? "Paciente", diag: p.diagnosis_label, adh: Number(adh ?? 0), mood: lastCheckin?.mood ?? null };
  }));
  rows.sort((a, b) => a.adh - b.adh);

  const moodEmoji = (m: number | null) => m ? ["😣", "😔", "😐", "🙂", "😄"][m - 1] : "—";

  return (
    <div style={{ padding: "26px 32px 60px", maxWidth: 1000 }}>
      <div style={{ fontSize: 12.5, color: "#9BA29D", fontWeight: 600 }}>Pacientes</div>
      <h1 style={{ fontSize: 30, fontWeight: 700, margin: "6px 0 4px" }}>Pacientes</h1>
      <p style={{ color: "#646B67", fontSize: 14, marginBottom: 22 }}>{rows.length} ativo(s) · ordenados por adesão</p>

      <div style={{ background: "#fff", border: "1px solid #E7E9E7", borderRadius: 18, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr>{["Paciente", "Diagnóstico", "Adesão 30d", "Humor", ""].map((h) => <th key={h} style={th}>{h}</th>)}</tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td style={td}>
                  <Link href={`/medico/paciente/${r.id}`} style={{ display: "flex", alignItems: "center", gap: 11, textDecoration: "none", color: "inherit" }}>
                    <span style={{ ...avatar, background: r.adh < 60 ? "#FBE6E4" : "var(--accent)", color: r.adh < 60 ? "#A8392F" : "#fff" }}>
                      {r.name.split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase()}
                    </span>
                    <b style={{ fontSize: 14 }}>{r.name}</b>
                  </Link>
                </td>
                <td style={{ ...td, color: "#646B67" }}>{r.diag ?? "—"}</td>
                <td style={td}>
                  <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                    <div style={bar}><i style={{ display: "block", height: "100%", borderRadius: 5, width: `${r.adh}%`, background: r.adh < 60 ? "#D2554C" : r.adh < 80 ? "#C8902F" : "#2FA37C" }} /></div>
                    <span style={{ fontSize: 12.5, color: "#646B67" }}>{r.adh}%</span>
                  </div>
                </td>
                <td style={{ ...td, fontSize: 18 }}>{moodEmoji(r.mood)}</td>
                <td style={{ ...td, textAlign: "right" }}><Link href={`/medico/paciente/${r.id}`} style={{ color: "var(--accent)", textDecoration: "none", fontWeight: 600, fontSize: 13 }}>Ver ficha →</Link></td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td style={{ ...td, color: "#646B67" }} colSpan={5}>Nenhum paciente vinculado ainda. Compartilhe seu código de convite.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const th: React.CSSProperties = { textAlign: "left", fontSize: 11, textTransform: "uppercase", letterSpacing: ".06em", color: "#9BA29D", fontWeight: 700, padding: "11px 19px", background: "#F8F9F8" };
const td: React.CSSProperties = { padding: "13px 19px", borderBottom: "1px solid #E7E9E7", fontSize: 14 };
const avatar: React.CSSProperties = { width: 38, height: 38, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 13 };
const bar: React.CSSProperties = { height: 7, borderRadius: 5, background: "#E7E9E7", width: 96, overflow: "hidden" };
