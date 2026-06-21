import { createServerSupabase } from "@/lib/supabase-server";
import { inviteMember, togglePermission, removeMember } from "./actions";

const ROLE_LABELS: Record<string, string> = {
  doctor: "Médico", secretary: "Secretária", nurse: "Enfermeiro(a)",
  reception: "Recepção", clinic_admin: "Admin da clínica",
};

const PERMS: { cat: string; label: string; hint: string; sensitive?: boolean }[] = [
  { cat: "view_adherence", label: "Ver adesão e doses", hint: "Quem tomou/faltou" },
  { cat: "view_clinical", label: "Ver dados clínicos", hint: "Humor, sono, anotações", sensitive: true },
  { cat: "manage_patients", label: "Gerenciar pacientes", hint: "Cadastrar, convidar, editar" },
  { cat: "manage_medications", label: "Gerenciar medicamentos", hint: "Prescrever e editar" },
  { cat: "manage_modules", label: "Configurar módulos", hint: "Protocolos e check-in" },
  { cat: "manage_reminders", label: "Configurar avisos", hint: "Canais e lembretes" },
  { cat: "manage_brand", label: "Editar marca", hint: "Whitelabel" },
  { cat: "manage_team", label: "Gerenciar equipe", hint: "Convidar outros membros" },
];

export default async function EquipePage() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: members } = await supabase
    .from("team_members")
    .select("id, full_name, email, role, accepted_at, team_permissions(category, granted)")
    .eq("owner_doctor_id", user.id)
    .order("created_at");

  return (
    <div style={{ padding: "26px 32px 60px", maxWidth: 920 }}>
      <div style={{ fontSize: 12.5, color: "#9BA29D", fontWeight: 600 }}>Equipe & permissões</div>
      <h1 style={{ fontSize: 30, fontWeight: 700, margin: "6px 0 4px" }}>Sua equipe</h1>
      <p style={{ color: "#646B67", fontSize: 14, marginBottom: 22 }}>
        Cadastre quem opera o painel e defina o que cada pessoa vê e faz. A pessoa cria a senha no primeiro acesso em <b>/primeiro-acesso</b> usando o e-mail que você cadastrar — sem precisar de e-mail de convite.
      </p>

      {/* Convidar */}
      <section style={panel}>
        <div style={ph}><b>Convidar membro</b></div>
        <form action={inviteMember} style={{ padding: 19 }}>
          <div style={{ display: "flex", gap: 11, marginBottom: 12 }}>
            <input name="full_name" required placeholder="Nome" style={inp} />
            <input name="email" type="email" required placeholder="E-mail" style={inp} />
            <select name="role" style={{ ...inp, flex: "0 0 170px" }}>
              {Object.entries(ROLE_LABELS).filter(([k]) => k !== "doctor").map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#646B67", textTransform: "uppercase", letterSpacing: ".05em", margin: "6px 0 10px" }}>
            Permissões deste membro
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {PERMS.map((p) => (
              <label key={p.cat} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", border: "1px solid #E7E9E7", borderRadius: 11, cursor: "pointer", background: p.sensitive ? "#FEF8F2" : "#fff" }}>
                <input type="checkbox" name="perm" value={p.cat} defaultChecked={p.cat === "view_adherence"} style={{ width: 17, height: 17, accentColor: "var(--accent)" }} />
                <span>
                  <b style={{ fontSize: 13.5 }}>{p.label} {p.sensitive && <span style={{ color: "#C8902F", fontSize: 11 }}>· sensível</span>}</b>
                  <span style={{ display: "block", fontSize: 12, color: "#646B67" }}>{p.hint}</span>
                </span>
              </label>
            ))}
          </div>
          <button style={{ marginTop: 16, background: "var(--accent)", color: "#fff", border: "none", borderRadius: 11, padding: "12px 18px", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
            Enviar convite
          </button>
        </form>
      </section>

      {/* Membros atuais */}
      <section style={panel}>
        <div style={ph}><b>Membros ({members?.length ?? 0})</b></div>
        <div style={{ padding: "6px 0" }}>
          {(members ?? []).length === 0 && <p style={{ padding: "14px 19px", color: "#646B67", fontSize: 13.5 }}>Ninguém na equipe ainda. Você opera sozinho(a) por enquanto.</p>}
          {(members ?? []).map((m) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const perms: any[] = m.team_permissions ?? [];
            const granted = new Set(perms.filter((p) => p.granted).map((p) => p.category));
            return (
              <div key={m.id} style={{ padding: "15px 19px", borderBottom: "1px solid #E7E9E7" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 38, height: 38, borderRadius: "50%", background: "var(--accent)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 13 }}>
                    {m.full_name.split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase()}
                  </div>
                  <div style={{ flex: 1 }}>
                    <b style={{ fontSize: 14.5 }}>{m.full_name}</b>
                    <div style={{ fontSize: 12.5, color: "#646B67" }}>{ROLE_LABELS[m.role]} · {m.email}</div>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 20, background: m.accepted_at ? "#E2F3EC" : "#FAF0DA", color: m.accepted_at ? "#1E7A58" : "#8A6212" }}>
                    {m.accepted_at ? "Ativo" : "Aguardando 1º acesso"}
                  </span>
                  <form action={removeMember}>
                    <input type="hidden" name="memberRowId" value={m.id} />
                    <button style={{ background: "none", border: "none", color: "#D2554C", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>Remover</button>
                  </form>
                </div>
                {/* toggles de permissão por membro */}
                <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginTop: 12, paddingLeft: 50 }}>
                  {PERMS.map((p) => {
                    const on = granted.has(p.cat);
                    return (
                      <form key={p.cat} action={togglePermission}>
                        <input type="hidden" name="memberRowId" value={m.id} />
                        <input type="hidden" name="category" value={p.cat} />
                        <input type="hidden" name="granted" value={String(!on)} />
                        <button style={{
                          padding: "6px 11px", borderRadius: 9, fontSize: 12, fontWeight: 600, cursor: "pointer",
                          border: on ? "1.5px solid var(--accent)" : "1.5px solid #E7E9E7",
                          background: on ? "var(--accent)" : "#fff", color: on ? "#fff" : "#646B67",
                        }}>{on ? "✓ " : ""}{p.label}</button>
                      </form>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

const panel: React.CSSProperties = { background: "#fff", border: "1px solid #E7E9E7", borderRadius: 18, overflow: "hidden", marginBottom: 18 };
const ph: React.CSSProperties = { padding: "15px 19px", borderBottom: "1px solid #E7E9E7", fontSize: 15 };
const inp: React.CSSProperties = { flex: 1, border: "1px solid #E7E9E7", borderRadius: 11, padding: 11, fontSize: 14 };
