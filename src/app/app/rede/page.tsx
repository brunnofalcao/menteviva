import { createServerSupabase } from "@/lib/supabase-server";
import Link from "next/link";

const REL_LABEL: Record<string, string> = {
  son: "Filho", daughter: "Filha", father: "Pai", mother: "Mãe", spouse: "Cônjuge",
  partner: "Companheiro(a)", brother: "Irmão", sister: "Irmã", grandchild: "Neto(a)",
  caregiver: "Cuidador(a)", nurse: "Enfermeiro(a)", other: "Familiar",
};

export default async function MinhaRedePage() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // médico responsável
  const { data: patient } = await supabase
    .from("patients").select("doctor_id").eq("id", user.id).single();
  let doctorName = "Seu médico";
  let brandName = "";
  if (patient?.doctor_id) {
    const { data: docProf } = await supabase.from("profiles").select("full_name").eq("id", patient.doctor_id).single();
    const { data: docRow } = await supabase.from("doctors").select("brand_name").eq("id", patient.doctor_id).single();
    if (docProf?.full_name) doctorName = docProf.full_name;
    if (docRow?.brand_name) brandName = docRow.brand_name;
  }

  // rede de apoio
  const { data: network } = await supabase
    .from("support_network")
    .select("full_name, relationship, is_caregiver, is_nurse")
    .eq("patient_id", user.id);

  return (
    <main style={{ paddingBottom: 90 }}>
      <header style={{ padding: "8px 4px 18px" }}>
        <Link href="/app/perfil" style={{ color: "var(--label-2)", textDecoration: "none", fontSize: 14 }}>‹ Perfil</Link>
        <h1 style={{ fontSize: 26, fontWeight: 800, marginTop: 8 }}>Minha rede</h1>
        <p style={{ color: "var(--label-2)", marginTop: 4 }}>As pessoas que cuidam de você.</p>
      </header>

      {/* Médico */}
      <div style={sect}>Cuidado médico</div>
      <div style={card}>
        <span style={{ ...avatar, background: "var(--accent)", color: "#fff" }}>
          {doctorName.replace(/^Dra?\.?\s*/, "").split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase()}
        </span>
        <div>
          <b style={{ fontSize: 15 }}>{doctorName}</b>
          <div style={{ fontSize: 13, color: "var(--label-2)" }}>{brandName || "Médico responsável"}</div>
        </div>
      </div>

      {/* Rede de apoio */}
      <div style={sect}>Rede de apoio</div>
      {(network ?? []).length === 0 ? (
        <div style={{ ...card, display: "block", textAlign: "center", color: "var(--label-2)", fontSize: 13.5 }}>
          Ninguém na sua rede ainda. Seu médico pode adicionar familiares e cuidadores para acompanhar seu tratamento junto com você.
        </div>
      ) : (
        (network ?? []).map((m, i) => (
          <div key={i} style={card}>
            <span style={{ ...avatar, background: "var(--accent-soft, #EEF3F1)", color: "var(--accent-ink, #2C6BBF)" }}>
              {m.full_name.split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase()}
            </span>
            <div>
              <b style={{ fontSize: 15 }}>{m.full_name}</b>
              <div style={{ fontSize: 13, color: "var(--label-2)" }}>
                {REL_LABEL[m.relationship] ?? "Familiar"}
                {m.is_caregiver && " · Cuidador"}{m.is_nurse && " · Enfermeiro"}
              </div>
            </div>
          </div>
        ))
      )}

      <p style={{ fontSize: 12.5, color: "var(--label-3)", textAlign: "center", marginTop: 18, padding: "0 20px" }}>
        Quem cuida de você é definido pelo seu médico. Fale com ele para incluir ou remover alguém.
      </p>
    </main>
  );
}

const sect: React.CSSProperties = { fontSize: 12, fontWeight: 700, color: "var(--label-3)", textTransform: "uppercase", letterSpacing: ".05em", margin: "18px 4px 9px" };
const card: React.CSSProperties = { display: "flex", alignItems: "center", gap: 13, background: "var(--card, #fff)", borderRadius: 16, padding: 15, marginBottom: 9, boxShadow: "0 1px 3px rgba(0,0,0,.04)" };
const avatar: React.CSSProperties = { width: 44, height: 44, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 14, flexShrink: 0 };
