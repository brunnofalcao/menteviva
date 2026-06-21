import { createServerSupabase } from "@/lib/supabase-server";
import CaregiverActions from "./CaregiverActions";

export default async function CuidadorHome() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: prof } = await supabase.from("profiles").select("full_name").eq("id", user.id).single();
  const first = (prof?.full_name ?? "").split(" ")[0];

  // pacientes que este cuidador acompanha
  const { data: cares } = await supabase.rpc("my_care_patients");

  // doses de hoje dos pacientes que ele cuida
  const today0 = new Date(); today0.setHours(0, 0, 0, 0);
  const today1 = new Date(); today1.setHours(23, 59, 59, 999);
  const patientIds = (cares ?? []).map((c: { patient_id: string }) => c.patient_id);

  let doses: { id: string; patient_id: string; medication_id: string; scheduled_at: string; status: string }[] = [];
  if (patientIds.length) {
    const { data } = await supabase
      .from("doses")
      .select("id, patient_id, medication_id, scheduled_at, status")
      .in("patient_id", patientIds)
      .gte("scheduled_at", today0.toISOString())
      .lte("scheduled_at", today1.toISOString())
      .order("scheduled_at");
    doses = data ?? [];
  }

  // nomes dos medicamentos e pacientes
  const { data: meds } = patientIds.length
    ? await supabase.from("medications").select("id, name, dose").in("patient_id", patientIds)
    : { data: [] };
  const medMap = new Map((meds ?? []).map((m) => [m.id, m]));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const patMap = new Map((cares ?? []).map((c: any) => [c.patient_id, c]));

  const pending = doses.filter((d) => d.status === "pending");
  const late = pending.filter((d) => new Date(d.scheduled_at) < new Date());
  const done = doses.filter((d) => ["taken", "given_by_caregiver"].includes(d.status));

  const h = new Date().getHours();
  const greet = h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite";

  return (
    <main style={{ maxWidth: 560, margin: "0 auto", padding: "20px 16px 90px" }}>
      <div style={{ fontSize: 12.5, color: "#9BA29D", fontWeight: 600 }}>Portal do cuidador</div>
      <h1 style={{ fontSize: 28, fontWeight: 800, margin: "6px 0 4px" }}>{greet}{first ? `, ${first}` : ""}</h1>
      <p style={{ color: "#646B67", fontSize: 14, marginBottom: 20 }}>
        {pending.length ? `${pending.length} dose(s) pendente(s) hoje` : "Tudo em dia por aqui 💚"}
      </p>

      {/* resumo */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginBottom: 20 }}>
        <Stat n={pending.length} l="Pendentes" tone={pending.length ? "amber" : "ok"} />
        <Stat n={late.length} l="Atrasadas" tone={late.length ? "amber" : "ok"} />
        <Stat n={done.length} l="Concluídas" tone="ok" />
      </div>

      {/* doses de hoje */}
      <div style={sect}>Doses de hoje</div>
      {doses.length === 0 && <p style={{ fontSize: 13.5, color: "#646B67" }}>Nenhuma dose programada para hoje.</p>}
      {doses.map((d) => {
        const med = medMap.get(d.medication_id);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const pat: any = patMap.get(d.patient_id);
        const time = new Date(d.scheduled_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
        const isDone = ["taken", "given_by_caregiver"].includes(d.status);
        return (
          <div key={d.id} style={{ background: "#fff", border: "1px solid #E7E9E7", borderRadius: 14, padding: 14, marginBottom: 9, opacity: isDone ? 0.6 : 1 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: isDone ? 0 : 10 }}>
              <div>
                <b style={{ fontSize: 15 }}>{med?.name ?? "Medicamento"} {med?.dose && <span style={{ fontWeight: 400, color: "#646B67" }}>{med.dose}</span>}</b>
                <div style={{ fontSize: 12.5, color: "#646B67" }}>{pat?.patient_name ?? ""} · {time}</div>
              </div>
              {isDone && <span style={{ fontSize: 13, color: "#1E7A58", fontWeight: 700 }}>✓ Feita</span>}
            </div>
            {!isDone && pat?.can_confirm && <CaregiverActions doseId={d.id} patientId={d.patient_id} />}
          </div>
        );
      })}

      {/* ações rápidas de evento */}
      {(cares ?? []).some((c: { can_register: boolean }) => c.can_register) && (
        <>
          <div style={sect}>Registrar ocorrência</div>
          <p style={{ fontSize: 12.5, color: "#646B67", marginBottom: 10 }}>Aconteceu algo? Registre rápido para o médico ver.</p>
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          {(cares ?? []).filter((c: any) => c.can_register).map((c: any) => (
            <CaregiverActions key={c.patient_id} patientId={c.patient_id} eventOnly patientName={c.patient_name} />
          ))}
        </>
      )}
    </main>
  );
}

function Stat({ n, l, tone }: { n: number; l: string; tone: "amber" | "ok" }) {
  return (
    <div style={{ background: "#fff", border: "1px solid #E7E9E7", borderRadius: 14, padding: "14px 12px", textAlign: "center" }}>
      <div style={{ fontSize: 26, fontWeight: 800, color: tone === "amber" ? "#B5793A" : "#2C7A56" }}>{n}</div>
      <div style={{ fontSize: 11.5, color: "#646B67", fontWeight: 600, marginTop: 3 }}>{l}</div>
    </div>
  );
}

const sect: React.CSSProperties = { fontSize: 12, fontWeight: 700, color: "#9BA29D", textTransform: "uppercase", letterSpacing: ".05em", margin: "20px 0 11px" };
