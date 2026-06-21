"use server";
import { createServerSupabase } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";

export async function setHealthConsent(consent: boolean, platform: string | null) {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.rpc("set_health_consent", { p_consent: consent, p_platform: platform });
  revalidatePath("/app/saude");
}
