"use server";
import { createServerSupabase } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";

export async function applyProtocol(formData: FormData) {
  const patientId = String(formData.get("patientId"));
  const protocol = String(formData.get("protocol"));
  const supabase = await createServerSupabase();
  await supabase.rpc("apply_protocol", { p_patient: patientId, p_protocol: protocol });
  revalidatePath("/medico/config");
}

export async function toggleModule(formData: FormData) {
  const patientId = String(formData.get("patientId"));
  const moduleName = String(formData.get("module"));
  const enabled = String(formData.get("enabled")) === "true";
  const supabase = await createServerSupabase();
  await supabase
    .from("patient_modules")
    .upsert({ patient_id: patientId, module: moduleName, enabled }, { onConflict: "patient_id,module" });
  revalidatePath("/medico/config");
}
