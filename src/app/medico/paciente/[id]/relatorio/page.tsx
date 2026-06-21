import { createServerSupabase } from "@/lib/supabase-server";
import ReportView from "./ReportView";

export default async function RelatorioPage({
  params, searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tipo?: string }>;
}) {
  const { id } = await params;
  const { tipo } = await searchParams;
  const kind = tipo === "familia" ? "familia" : "clinico";
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // médico (cabeçalho do relatório)
  const { data: doc } = await supabase
    .from("doctors").select("brand_name, specialty").eq("id", user.id).single();
  const { data: docProf } = await supabase
    .from("profiles").select("full_name").eq("id", user.id).single();
  const { data: docRow } = await supabase
    .from("doctors").select("crm").eq("id", user.id).single();

  // paciente
  const { data: patient } = await supabase
    .from("patients").select("diagnosis_label, profiles(full_name)").eq("id", id).single();

  const { data: meds } = await supabase
    .from("medications")
    .select("name, dose, times, frequency, indication, instructions, ends_at, active")
    .eq("patient_id", id).eq("active", true).eq("source", "doctor");

  const { data: adh } = await supabase.rpc("adherence_rate", { p_patient: id, p_days: 30 });

  const { data: events } = await supabase
    .from("patient_events")
    .select("type, severity, note, occurred_at")
    .eq("patient_id", id).order("occurred_at", { ascending: false }).limit(10);

  const { data: warnings } = await supabase.rpc("early_warnings", { p_patient: id });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pProf: any = patient?.profiles;

  return (
    <ReportView
      kind={kind}
      data={{
        doctorName: docProf?.full_name ?? "—",
        brandName: doc?.brand_name ?? "Mente Viva",
        specialty: doc?.specialty ?? "psychiatry",
        crm: docRow?.crm ?? "",
        patientName: pProf?.full_name ?? "Paciente",
        diagnosis: patient?.diagnosis_label ?? "—",
        adherence: Number(adh ?? 0),
        meds: meds ?? [],
        events: events ?? [],
        warnings: warnings ?? [],
        patientId: id,
      }}
    />
  );
}
