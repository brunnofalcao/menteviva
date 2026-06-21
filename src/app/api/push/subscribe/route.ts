import { createServerSupabase } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

// Salva a subscription Web Push do dispositivo do paciente.
export async function POST(req: Request) {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false }, { status: 401 });

  const sub = await req.json(); // { endpoint, keys: { p256dh, auth } }
  if (!sub?.endpoint || !sub?.keys) {
    return NextResponse.json({ ok: false, reason: "invalid" }, { status: 400 });
  }

  await supabase.from("push_subscriptions").upsert({
    patient_id: user.id,
    endpoint: sub.endpoint,
    p256dh: sub.keys.p256dh,
    auth: sub.keys.auth,
  }, { onConflict: "endpoint" });

  return NextResponse.json({ ok: true });
}
