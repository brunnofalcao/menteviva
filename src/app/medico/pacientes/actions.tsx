"use server";
import { createServerSupabase } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";

export async function createPatient(formData: FormData) {
  const supabase = await createServerSupabase();
  const full_name = String(formData.get("full_name")).trim();
  const cpf = String(formData.get("cpf"));
  const phone = String(formData.get("phone"));
  const diagnosis = String(formData.get("diagnosis") || "") || null;
  if (!full_name || !cpf || !phone) return;

  await supabase.rpc("create_patient_invite", {
    p_full_name: full_name, p_cpf: cpf, p_phone: phone, p_diagnosis: diagnosis,
  });
  revalidatePath("/medico/pacientes");
}
