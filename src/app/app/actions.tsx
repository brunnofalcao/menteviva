"use server";
import { createServerSupabase } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";
import type { SkipReason } from "@/types/db";

export async function confirmDose(formData: FormData) {
  const doseId = String(formData.get("doseId"));
  const supabase = await createServerSupabase();
  await supabase
    .from("doses")
    .update({ status: "taken", acted_at: new Date().toISOString() })
    .eq("id", doseId);
  revalidatePath("/app");
}

export async function skipDose(formData: FormData) {
  const doseId = String(formData.get("doseId"));
  const reason = String(formData.get("reason")) as SkipReason;
  const supabase = await createServerSupabase();
  await supabase
    .from("doses")
    .update({ status: "skipped", acted_at: new Date().toISOString(), skip_reason: reason })
    .eq("id", doseId);
  // "ran_out" é o sinal de abandono por acesso — o painel do médico já o destaca.
  revalidatePath("/app");
}

export async function snoozeDose(formData: FormData) {
  const doseId = String(formData.get("doseId"));
  const supabase = await createServerSupabase();
  const newTime = new Date(Date.now() + 30 * 60 * 1000).toISOString();
  await supabase
    .from("doses")
    .update({ status: "snoozed", scheduled_at: newTime })
    .eq("id", doseId);
  revalidatePath("/app");
}
