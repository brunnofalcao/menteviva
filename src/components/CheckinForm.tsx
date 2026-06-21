"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import type { ActivityLevel, Checkin } from "@/types/db";

const SIDE_EFFECTS = ["Ansiedade", "Enjoo", "Insônia", "Boca seca", "Sem efeitos"];

export default function CheckinForm({ enabled, existing }: { enabled: string[]; existing: Checkin | null }) {
  const router = useRouter();
  const supabase = createClient();
  const has = (m: string) => enabled.includes(m);

  const [mood, setMood] = useState<number>(existing?.mood ?? 0);
  const [anxiety, setAnxiety] = useState<number>(existing?.anxiety ?? 0);
  const [energy, setEnergy] = useState<number>(existing?.energy ?? 0);
  const [appetite, setAppetite] = useState<number>(existing?.appetite ?? 0);
  const [sleep, setSleep] = useState<number>(existing?.sleep_hours ?? 7);
  const [activity, setActivity] = useState<ActivityLevel | null>(existing?.activity ?? null);
  const [water, setWater] = useState<number>(existing?.water_count ?? 0);
  const [meals, setMeals] = useState<number>(existing?.meal_count ?? 0);
  const [effects, setEffects] = useState<string[]>(existing?.side_effects ?? []);
  const [note, setNote] = useState<string>(existing?.free_note ?? "");
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("checkins").upsert({
      patient_id: user.id,
      day: new Date().toISOString().slice(0, 10),
      mood: has("mood") ? mood || null : null,
      anxiety: has("anxiety") ? anxiety || null : null,
      energy: has("energy") ? energy || null : null,
      appetite: has("appetite") ? appetite || null : null,
      sleep_hours: has("sleep") ? sleep : null,
      activity: has("activity") ? activity : null,
      water_count: has("hydration") ? water : 0,
      meal_count: has("hydration") ? meals : 0,
      side_effects: has("side_effects") ? effects : [],
      free_note: has("free_note") ? note : null,
    }, { onConflict: "patient_id,day" });
    setDone(true);
    setTimeout(() => router.push("/app"), 800);
  }

  if (done) return (
    <main style={{ minHeight: "80vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center" }}>
      <div style={{ fontSize: 56 }}>🌙</div>
      <p style={{ fontSize: 18, fontWeight: 700, marginTop: 8 }}>Obrigado por registrar</p>
      <p style={{ color: "var(--label-2)" }}>Isso ajuda seu médico a cuidar de você.</p>
    </main>
  );

  return (
    <main style={wrap}>
      <h1 style={{ fontSize: 30, fontWeight: 800, padding: "8px 4px 2px" }}>Check-in</h1>
      <p style={{ color: "var(--label-2)", padding: "0 4px 14px", fontWeight: 600 }}>Só o que seu médico escolheu. Nada é obrigatório.</p>

      {has("mood") && (
        <Card title="Como você está hoje?">
          <Faces options={["😣", "😔", "😐", "🙂", "😄"]} value={mood} onChange={setMood} />
        </Card>
      )}
      {has("anxiety") && (
        <Card title="Seu nível de ansiedade">
          <Faces options={["😌", "🙂", "😐", "😟", "😰"]} value={anxiety} onChange={setAnxiety} />
          <p style={hintc}>Tranquilo → muito ansioso</p>
        </Card>
      )}
      {has("energy") && (
        <Card title="Sua energia hoje">
          <Faces options={["🪫", "▂", "▄", "▆", "█"]} value={energy} onChange={setEnergy} small />
          <p style={hintc}>Sem energia → cheio de energia</p>
        </Card>
      )}
      {has("appetite") && (
        <Card title="Seu apetite hoje">
          <Faces options={["🍽️", "🥄", "😐", "🙂", "😋"]} value={appetite} onChange={setAppetite} />
          <p style={hintc}>Sem apetite → ótimo apetite</p>
        </Card>
      )}
      {has("sleep") && (
        <Card title="Como foi seu sono?">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <span style={{ color: "var(--label-2)" }}>Dormiu</span>
            <b style={{ fontSize: 24, fontWeight: 800, color: "var(--accent)" }}>{sleep.toFixed(1)}h</b>
          </div>
          <input type="range" min={3} max={10} step={0.5} value={sleep} onChange={(e) => setSleep(+e.target.value)} style={{ width: "100%", accentColor: "var(--accent)" }} />
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#A4A8B2", fontWeight: 600 }}><span>3h</span><span>10h+</span></div>
        </Card>
      )}
      {has("activity") && (
        <Card title="Você se moveu hoje?">
          <div style={{ display: "flex", gap: 8 }}>
            {([["still", "😴 Parado"], ["moved", "🚶 Me movi"], ["exercised", "🏃 Exercitei"]] as const).map(([v, l]) => (
              <button key={v} onClick={() => setActivity(v)} style={{ ...chip, ...(activity === v ? chipOn : {}) }}>{l}</button>
            ))}
          </div>
        </Card>
      )}
      {has("hydration") && (
        <Card title="Água & alimentação">
          <div style={{ display: "flex", gap: 10 }}>
            <Counter icon="💧" label="copos" value={water} onAdd={() => setWater(water + 1)} onSub={() => setWater(Math.max(0, water - 1))} />
            <Counter icon="🍽️" label="refeições" value={meals} onAdd={() => setMeals(meals + 1)} onSub={() => setMeals(Math.max(0, meals - 1))} />
          </div>
        </Card>
      )}
      {has("side_effects") && (
        <Card title="Efeitos colaterais? (opcional)">
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {SIDE_EFFECTS.map((s) => (
              <button key={s} onClick={() => setEffects(effects.includes(s) ? effects.filter((x) => x !== s) : [...effects, s])}
                style={{ ...chip, ...(effects.includes(s) ? chipOn : {}) }}>{s}</button>
            ))}
          </div>
        </Card>
      )}
      {has("free_note") && (
        <Card title="Uma linha sobre seu dia (opcional)">
          <input style={{ width: "100%", background: "#F0F0F3", border: "none", borderRadius: 12, padding: 13, fontSize: 14 }}
            value={note} onChange={(e) => setNote(e.target.value)} placeholder="O que marcou hoje?" />
        </Card>
      )}

      <button onClick={save} disabled={busy} style={saveBtn}>{busy ? "..." : "Salvar meu dia"}</button>
    </main>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: "var(--card)", borderRadius: 22, padding: 17, marginBottom: 13 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: "#A4A8B2", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 10 }}>{title}</div>
      {children}
    </div>
  );
}
function Faces({ options, value, onChange, small }: { options: string[]; value: number; onChange: (n: number) => void; small?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 7 }}>
      {options.map((o, i) => {
        const on = value === i + 1;
        return (
          <button key={i} onClick={() => onChange(i + 1)} style={{
            flex: 1, aspectRatio: "1", borderRadius: 16, fontSize: small ? 15 : 27,
            background: on ? "var(--accent-soft)" : "#F0F0F3",
            border: on ? "2px solid var(--accent)" : "2px solid transparent",
            transform: on ? "translateY(-4px) scale(1.04)" : "none", cursor: "pointer",
            fontWeight: small ? 700 : 400, color: small && !on ? "#A4A8B2" : undefined,
          }}>{o}</button>
        );
      })}
    </div>
  );
}
function Counter({ icon, label, value, onAdd, onSub }: { icon: string; label: string; value: number; onAdd: () => void; onSub: () => void }) {
  return (
    <div style={{ flex: 1, background: "#F0F0F3", borderRadius: 15, padding: 12, textAlign: "center" }}>
      <div style={{ fontSize: 22 }}>{icon}</div>
      <div style={{ fontSize: 20, fontWeight: 800, color: "var(--accent)" }}>{value}</div>
      <div style={{ fontSize: 11, color: "var(--label-2)", fontWeight: 600 }}>{label}</div>
      <div style={{ display: "flex", gap: 6, justifyContent: "center", marginTop: 8 }}>
        <button onClick={onSub} style={ctrBtn}>−</button>
        <button onClick={onAdd} style={ctrBtn}>+</button>
      </div>
    </div>
  );
}

const wrap: React.CSSProperties = { maxWidth: 440, margin: "0 auto", padding: "16px 16px 96px" };
const hintc: React.CSSProperties = { textAlign: "center", color: "#A4A8B2", fontSize: 11.5, marginTop: 8 };
const chip: React.CSSProperties = { flex: 1, padding: "11px 8px", borderRadius: 13, background: "#F0F0F3", border: "1.5px solid transparent", fontSize: 13, fontWeight: 600, cursor: "pointer" };
const chipOn: React.CSSProperties = { background: "var(--accent)", color: "#fff", borderColor: "var(--accent)" };
const ctrBtn: React.CSSProperties = { width: 28, height: 28, borderRadius: 8, background: "var(--accent)", color: "#fff", border: "none", fontWeight: 700, fontSize: 16, cursor: "pointer" };
const saveBtn: React.CSSProperties = { width: "100%", background: "var(--accent)", color: "#fff", border: "none", borderRadius: 16, padding: 16, fontWeight: 700, fontSize: 15, cursor: "pointer" };
