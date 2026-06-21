"use server";
import { createServerSupabase } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";

export async function saveWhatsappConfig(formData: FormData) {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const phone_number_id = String(formData.get("phone_number_id") || "").trim() || null;
  const waba_id = String(formData.get("waba_id") || "").trim() || null;
  const access_token = String(formData.get("access_token") || "").trim() || null;
  const display_name = String(formData.get("display_name") || "").trim() || null;
  // connected = true só se tiver os dados essenciais
  const connected = !!(phone_number_id && access_token);

  await supabase.from("whatsapp_config").upsert({
    doctor_id: user.id, phone_number_id, waba_id, access_token, display_name,
    connected, updated_at: new Date().toISOString(),
  });
  // já semeia os templates padrão
  await supabase.rpc("seed_whatsapp_templates", { p_doctor: user.id });
  revalidatePath("/medico/whatsapp");
}
