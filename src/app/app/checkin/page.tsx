import { createServerSupabase } from "@/lib/supabase-server";
import CheckinForm from "@/components/CheckinForm";

export default async function CheckinPage() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: mods } = await supabase
    .from("patient_modules").select("module, enabled").eq("patient_id", user.id);
  const enabled = new Set((mods ?? []).filter((m) => m.enabled).map((m) => m.module));

  // já existe checkin de hoje?
  const today = new Date().toISOString().slice(0, 10);
  const { data: existing } = await supabase
    .from("checkins").select("*").eq("patient_id", user.id).eq("day", today).single();

  return <CheckinForm enabled={Array.from(enabled)} existing={existing ?? null} />;
}
