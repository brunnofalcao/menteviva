"use server";
import { createServerSupabase } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";

export async function createPatient(formData: FormData) {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const full_name = String(formData.get("full_name")).trim();
  const cpf = String(formData.get("cpf"));
  const phone = String(formData.get("phone"));
  const diagnosis = String(formData.get("diagnosis") || "") || null;
  if (!full_name || !cpf || !phone) return;

  // descobre a clínica/médico dono
  const { data: doctorId } = await supabase.rpc("my_owner_doctor");

  // Cria o paciente JÁ ATIVO via Edge Function (ficha existe na hora, editável).
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  let created = false;
  if (url && anon) {
    try {
      const res = await fetch(`${url}/functions/v1/patient-access`, {
        method: "POST",
        headers: { "content-type": "application/json", "authorization": `Bearer ${anon}` },
        body: JSON.stringify({ action: "create", full_name, cpf, phone, diagnosis, doctor_id: doctorId }),
      });
      const out = await res.json();
      created = !!out?.ok;
    } catch {
      created = false;
    }
  }

  // Fallback: se a função não estiver disponível, mantém o pré-cadastro antigo.
  if (!created) {
    await supabase.rpc("create_patient_invite", {
      p_full_name: full_name, p_cpf: cpf, p_phone: phone, p_diagnosis: diagnosis,
    });
  }

  revalidatePath("/medico/pacientes");
}
