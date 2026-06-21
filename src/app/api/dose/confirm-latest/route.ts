import { createServerSupabase } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

// Chamado pelo service worker quando o paciente toca "Tomei" na notificação.
// Confirma a dose pendente mais próxima do horário atual.
export async function POST() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false }, { status: 401 });

  const { data: dose } = await supabase
    .from("doses")
    .select("id")
    .eq("patient_id", user.id)
    .eq("status", "pending")
    .order("scheduled_at", { ascending: true })
    .limit(1)
    .single();

  if (!dose) return NextResponse.json({ ok: false, reason: "no_pending" });

  await supabase
    .from("doses")
    .update({ status: "taken", acted_at: new Date().toISOString() })
    .eq("id", dose.id);

  return NextResponse.json({ ok: true, dose_id: dose.id });
}
