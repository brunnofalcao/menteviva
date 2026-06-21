import { createServerSupabase } from "@/lib/supabase-server";
import MessageComposer from "./MessageComposer";

export default async function MensagensPage() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // pacientes do médico para os grupos de envio
  const { data: patients } = await supabase
    .from("patients").select("id, phone, diagnosis_label, profiles(full_name)");

  const since30 = new Date(Date.now() - 30 * 864e5).toISOString();

  // classifica pacientes em grupos úteis para disparo
  const list = await Promise.all((patients ?? []).map(async (p) => {
    const { data: adh } = await supabase.rpc("adherence_rate", { p_patient: p.id, p_days: 30 });
    const { data: doses } = await supabase
      .from("doses").select("status, scheduled_at").eq("patient_id", p.id).gte("scheduled_at", since30);
    const missed = (doses ?? []).filter((d) => d.status === "skipped").length;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const prof: any = p.profiles;
    return { id: p.id, name: prof?.full_name ?? "Paciente", phone: p.phone, diag: p.diagnosis_label, adh: Number(adh ?? 0), missed };
  }));

  return (
    <main className="mv-page" style={{ maxWidth: 820 }}>
      <div style={{ fontSize: 12.5, color: "#9BA29D", fontWeight: 600 }}>Mensagens</div>
      <h1 className="mv-title" style={{ fontSize: 30, fontWeight: 700, margin: "6px 0 4px" }}>Mensagens diretas</h1>
      <p style={{ color: "#646B67", fontSize: 14, marginBottom: 22 }}>
        Envie um WhatsApp para um grupo de pacientes — avisos, campanhas, lembretes pontuais.
        Os módulos de check-in agora ficam na ficha de cada paciente.
      </p>

      <MessageComposer patients={list} />
    </main>
  );
}
