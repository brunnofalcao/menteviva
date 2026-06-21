"use server";
import { createServerSupabase } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";

export async function inviteMember(formData: FormData) {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const fullName = String(formData.get("full_name"));
  const email = String(formData.get("email")).toLowerCase().trim();
  const role = String(formData.get("role"));
  const cats = formData.getAll("perm").map(String);

  // Sem token e sem e-mail: o médico só cadastra o e-mail autorizado.
  // A pessoa cria a senha no primeiro acesso usando esse e-mail.
  const { data: member } = await supabase.from("team_members").insert({
    owner_doctor_id: user.id, role, full_name: fullName, email,
  }).select("id").single();

  if (member) {
    const ALL = ["view_clinical","view_adherence","manage_patients","manage_medications","manage_modules","manage_reminders","manage_brand","manage_team"];
    await supabase.from("team_permissions").insert(
      ALL.map((c) => ({ member_row_id: member.id, category: c, granted: cats.includes(c) }))
    );
  }
  revalidatePath("/medico/equipe");
}

export async function togglePermission(formData: FormData) {
  const supabase = await createServerSupabase();
  const memberRowId = String(formData.get("memberRowId"));
  const category = String(formData.get("category"));
  const granted = String(formData.get("granted")) === "true";
  await supabase.from("team_permissions")
    .upsert({ member_row_id: memberRowId, category, granted }, { onConflict: "member_row_id,category" });
  revalidatePath("/medico/equipe");
}

export async function removeMember(formData: FormData) {
  const supabase = await createServerSupabase();
  const id = String(formData.get("memberRowId"));
  await supabase.from("team_members").delete().eq("id", id);
  revalidatePath("/medico/equipe");
}
