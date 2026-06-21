import { createServerSupabase } from "@/lib/supabase-server";
import ConfirmDose from "@/components/ConfirmDose";
import { redirect } from "next/navigation";

export default async function ConfirmPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createServerSupabase();
  const { data: dose } = await supabase
    .from("doses")
    .select("id, status, medications(name, dose, form)")
    .eq("id", id)
    .single();

  if (!dose) redirect("/app");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const med: any = dose.medications;

  return (
    <ConfirmDose
      dose={{
        id: dose.id,
        name: med?.name ?? "Medicamento",
        dose: med?.dose ?? null,
        detail: [med?.dose, med?.form].filter(Boolean).join(" · "),
      }}
    />
  );
}
