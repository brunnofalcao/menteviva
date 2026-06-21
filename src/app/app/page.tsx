import { createServerSupabase } from "@/lib/supabase-server";
import { medVisual, medSubtitle, CALM } from "@/lib/med-visual";

export default async function HojePage() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);

  const { data: doses } = await supabase
    .from("doses")
    .select("id, scheduled_at, status, medications(name, dose, form)")
    .gte("scheduled_at", today.toISOString())
    .lt("scheduled_at", tomorrow.toISOString())
    .order("scheduled_at");

  const { data: profile } = await supabase
    .from("profiles").select("full_name").eq("id", user.id).single();
  const { data: adhWeek } = await supabase.rpc("adherence_rate", { p_patient: user.id, p_days: 7 });

  const first = (profile?.full_name ?? "").split(" ")[0];
  const list = doses ?? [];
  const now = new Date();
  const h = now.getHours();
  const greet = h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite";

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const enrich = list.map((d: any) => {
    const when = new Date(d.scheduled_at);
    return { ...d, when, isPast: when < now, done: d.status === "taken" || d.status === "skipped" };
  });

  const pending = enrich.filter((d) => !d.done).sort((a, b) => +a.when - +b.when);
  const concluded = enrich.filter((d) => d.done);
  const next = pending[0] ?? null;
  const total = enrich.length;
  const takenCount = enrich.filter((d) => d.status === "taken").length;
  const allDone = total > 0 && pending.length === 0;

  const fmtTime = (dt: Date) => dt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

  return (
    <main style={{ maxWidth: 440, margin: "0 auto", padding: "16px 16px 96px" }}>
      <h1 style={{ fontSize: 30, fontWeight: 800, padding: "8px 4px 2px", letterSpacing: "-.02em" }}>
        {greet}{first ? `, ${first}` : ""}
      </h1>
      <p style={{ color: "var(--label-2)", padding: "0 4px 18px", fontWeight: 600 }}>
        {total === 0 ? "Sem doses hoje"
          : allDone ? CALM.allDone
          : `${pending.length} ${pending.length === 1 ? "dose" : "doses"} a registrar`}
      </p>

      {next && (() => {
        const med = next.medications;
        const v = medVisual(med?.name, med?.form);
        return (
          <a href={`/app/dose/${next.id}`} style={{ ...hero, textDecoration: "none" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
              <span style={{ width: 7, height: 7, borderRadius: 4, background: next.isPast ? "#9AA0A6" : "#43A57C" }} />
              <span style={{ fontSize: 12.5, fontWeight: 700, letterSpacing: ".04em", textTransform: "uppercase", color: "var(--label-2)" }}>
                {next.isPast ? CALM.missedDose : `${CALM.now} · ${fmtTime(next.when)}`}
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 15 }}>
              <span style={{ width: 58, height: 58, borderRadius: 18, background: v.color.bg, color: v.color.ink, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 27 }}>{v.shape}</span>
              <div style={{ flex: 1 }}>
                <b style={{ display: "block", fontSize: 21, letterSpacing: "-.01em" }}>{med?.name}</b>
                <span style={{ fontSize: 14, color: "var(--label-2)" }}>{med?.dose ? `${med.dose} · ` : ""}{medSubtitle(med?.name, med?.form)}</span>
              </div>
            </div>
            <div style={heroBtn}>Registrar dose</div>
          </a>
        );
      })()}

      {allDone && (
        <div style={{ ...hero, textAlign: "center" }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>💚</div>
          <b style={{ fontSize: 19 }}>{CALM.allDone}</b>
          <p style={{ color: "var(--label-2)", fontSize: 14, marginTop: 4 }}>{CALM.allDoneHint}</p>
        </div>
      )}

      {total > 0 && (
        <div style={{ display: "flex", gap: 11, marginBottom: 20 }}>
          <div style={miniCard}>
            <div style={{ fontSize: 24, fontWeight: 800 }}>{takenCount}<span style={{ color: "#A4A8B2", fontSize: 17 }}>/{total}</span></div>
            <div style={{ fontSize: 12, color: "var(--label-2)", fontWeight: 600, marginTop: 2 }}>doses hoje</div>
          </div>
          <div style={miniCard}>
            <div style={{ fontSize: 24, fontWeight: 800, color: "var(--accent)" }}>{Number(adhWeek ?? 0)}%</div>
            <div style={{ fontSize: 12, color: "var(--label-2)", fontWeight: 600, marginTop: 2 }}>adesão na semana</div>
          </div>
        </div>
      )}

      {pending.length > 1 && (
        <>
          <div style={sectionLabel}>Ainda hoje</div>
          {pending.slice(1).map((d) => <DoseRow key={d.id} d={d} fmtTime={fmtTime} />)}
        </>
      )}

      {concluded.length > 0 && (
        <>
          <div style={sectionLabel}>{CALM.done}s</div>
          {concluded.map((d) => <DoseRow key={d.id} d={d} fmtTime={fmtTime} />)}
        </>
      )}

      {total === 0 && (
        <div style={{ ...card, textAlign: "center", color: "var(--label-2)" }}>{CALM.noneToday}</div>
      )}

      <a href="/app/checkin" style={{ display: "flex", alignItems: "center", gap: 11, background: "var(--accent-soft)", borderRadius: 18, padding: "14px 15px", marginTop: 18, textDecoration: "none" }}>
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function DoseRow({ d, fmtTime }: { d: any; fmtTime: (dt: Date) => string }) {
  const med = d.medications;
  const v = medVisual(med?.name, med?.form);
  const taken = d.status === "taken";
  const skipped = d.status === "skipped";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 13, background: "var(--card)", borderRadius: 18, padding: "13px 15px", marginBottom: 9, opacity: d.done ? 0.7 : 1 }}>
      <span style={{ fontWeight: 700, width: 48, fontSize: 14, color: "var(--label-2)" }}>{fmtTime(d.when)}</span>
      <span style={{ width: 40, height: 40, borderRadius: 12, background: v.color.bg, color: v.color.ink, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 19 }}>{v.shape}</span>
      <span style={{ flex: 1 }}>
        <b style={{ display: "block", fontSize: 15 }}>{med?.name}</b>
        <span style={{ fontSize: 12.5, color: "var(--label-2)" }}>
          {taken ? "Registrada ✓" : skipped ? "Pulada" : med?.dose ?? ""}
        </span>
      </span>
      {!d.done && (
        <a href={`/app/dose/${d.id}`} style={{ background: "var(--accent)", color: "#fff", borderRadius: 12, padding: "9px 15px", fontWeight: 700, fontSize: 14, textDecoration: "none" }}>Registrar</a>
      )}
      {taken && <span style={{ width: 26, height: 26, borderRadius: 13, background: "#E6F3EC", color: "#43A57C", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15 }}>✓</span>}
    </div>
  );
}

const hero: React.CSSProperties = { display: "block", background: "var(--card)", borderRadius: 26, padding: 20, marginBottom: 13, color: "inherit", boxShadow: "0 1px 3px rgba(0,0,0,.04)" };
const heroBtn: React.CSSProperties = { background: "var(--accent)", color: "#fff", borderRadius: 15, padding: "15px", textAlign: "center", fontWeight: 700, fontSize: 16, marginTop: 18 };
const miniCard: React.CSSProperties = { flex: 1, background: "var(--card)", borderRadius: 18, padding: "14px 16px" };
const card: React.CSSProperties = { background: "var(--card)", borderRadius: 22, padding: 17, marginBottom: 13 };
const sectionLabel: React.CSSProperties = { fontSize: 12.5, fontWeight: 700, letterSpacing: ".04em", textTransform: "uppercase", color: "var(--label-3)", padding: "6px 4px 10px", marginTop: 6 };
