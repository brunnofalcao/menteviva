import { createServerSupabase } from "@/lib/supabase-server";

export default async function HojePage() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // doses de hoje
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);

  const { data: doses } = await supabase
    .from("doses")
    .select("id, scheduled_at, status, medications(name, dose)")
    .gte("scheduled_at", today.toISOString())
    .lt("scheduled_at", tomorrow.toISOString())
    .order("scheduled_at");

  const { data: profile } = await supabase
    .from("profiles").select("full_name").eq("id", user.id).single();

  const { data: adh } = await supabase.rpc("adherence_rate", { p_patient: user.id, p_days: 1 });

  const taken = doses?.filter((d) => d.status === "taken").length ?? 0;
  const total = doses?.length ?? 0;
  const first = (profile?.full_name ?? "").split(" ")[0];

  return (
    <main style={{ maxWidth: 440, margin: "0 auto", padding: "16px 16px 96px" }}>
      <h1 style={{ fontSize: 30, fontWeight: 800, padding: "8px 4px 2px" }}>
        Bom dia{first ? `, ${first}` : ""}
      </h1>
      <p style={{ color: "var(--label-2)", padding: "0 4px 16px", fontWeight: 600 }}>
        {total} {total === 1 ? "dose" : "doses"} hoje · {total - taken} restante(s)
      </p>

      <div style={card}>
        <div style={{ textAlign: "center", fontWeight: 800, fontSize: 30, color: "var(--accent)" }}>
          {taken}<span style={{ color: "#A4A8B2" }}>/{total}</span>
        </div>
        <div style={{ textAlign: "center", color: "var(--label-2)", fontSize: 13, marginTop: 4 }}>
          doses tomadas hoje · adesão {Number(adh ?? 0)}%
        </div>
      </div>

      {(doses ?? []).map((d) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const med = d.medications as any;
        const time = new Date(d.scheduled_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
        const done = d.status === "taken";
        return (
          <div key={d.id} style={{ ...dose, opacity: done ? 0.55 : 1 }}>
            <span style={{ fontWeight: 700, width: 52 }}>{time}</span>
            <span style={pill}>💊</span>
            <span style={{ flex: 1 }}>
              <b style={{ display: "block", fontSize: 15 }}>{med?.name}</b>
              <span style={{ fontSize: 13, color: "var(--label-2)" }}>
                {done ? "Tomado ✓" : med?.dose ?? ""}
              </span>
            </span>
            {!done && (
              <a href={`/app/dose/${d.id}`} style={{ ...btn, textDecoration: "none", display: "inline-block" }}>Tomei</a>
            )}
          </div>
        );
      })}

      {total === 0 && (
        <div style={{ ...card, textAlign: "center", color: "var(--label-2)" }}>
          Nenhuma dose para hoje. Aproveite seu dia. 💚
        </div>
      )}

      <a href="/app/checkin" style={{ display: "flex", alignItems: "center", gap: 11, background: "var(--accent-soft)", borderRadius: 18, padding: "14px 15px", marginTop: 12, textDecoration: "none" }}>
        <span style={{ fontSize: 20 }}>🌙</span>
        <span style={{ flex: 1 }}>
          <b style={{ display: "block", fontSize: 14, color: "var(--accent-ink)" }}>Check-in de hoje</b>
          <span style={{ fontSize: 12.5, color: "var(--accent-ink)", opacity: .8 }}>Como você está? Leva 10 segundos.</span>
        </span>
        <span style={{ color: "var(--accent-ink)" }}>›</span>
      </a>
    </main>
  );
}

const card: React.CSSProperties = { background: "var(--card)", borderRadius: 22, padding: 17, marginBottom: 13 };
const dose: React.CSSProperties = { display: "flex", alignItems: "center", gap: 13, background: "var(--card)", borderRadius: 20, padding: "14px 15px", marginBottom: 10 };
const pill: React.CSSProperties = { width: 42, height: 42, borderRadius: 13, background: "var(--accent-soft)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 };
const btn: React.CSSProperties = { background: "var(--accent)", color: "#fff", border: "none", borderRadius: 12, padding: "10px 16px", fontWeight: 700, fontSize: 14 };
