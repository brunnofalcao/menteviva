import { createServerSupabase } from "@/lib/supabase-server";
import ConfirmDose from "@/components/ConfirmDose";
import { redirect } from "next/navigation";
import { medVisual, medSubtitle } from "@/lib/med-visual";

export default async function ConfirmPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createServerSupabase();
  const { data: dose } = await supabase
    .from("doses")
    .select("id, status, scheduled_at, medications(name, dose, form)")
    .eq("id", id)
    .single();

  if (!dose) redirect("/app");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const med: any = dose.medications;
  const v = medVisual(med?.name, med?.form);

  return (
    <ConfirmDose
      dose={{
        id: dose.id,
        name: med?.name ?? "Medicamento",
        dose: med?.dose ?? null,
        detail: [med?.dose, medSubtitle(med?.name, med?.form)].filter(Boolean).join(" · "),
        shape: v.shape,
        colorBg: v.color.bg,
        colorInk: v.color.ink,
      }}
    />
  );
}
