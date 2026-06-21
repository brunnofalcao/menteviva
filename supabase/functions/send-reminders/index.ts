// ============================================================
// Mente Viva · Edge Function: send-reminders
// Roda em cron (a cada 5 min). Varre doses/checkins próximos e
// dispara push (Web Push) ou WhatsApp (Cloud API) conforme config.
//
// Deploy:  supabase functions deploy send-reminders
// Cron:    configurar em supabase/config.toml (ver README)
// ============================================================
import { createClient } from "jsr:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const VAPID_PUBLIC = Deno.env.get("VAPID_PUBLIC_KEY")!;
const VAPID_PRIVATE = Deno.env.get("VAPID_PRIVATE_KEY")!;
const WA_TOKEN = Deno.env.get("WHATSAPP_TOKEN")!;
const WA_PHONE_ID = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID")!;

webpush.setVapidDetails("mailto:contato@menteviva.app", VAPID_PUBLIC, VAPID_PRIVATE);

// Cliente com service_role: ignora RLS (uso interno controlado)
const db = createClient(SUPABASE_URL, SERVICE_ROLE);

// ---- Envio Web Push ----
async function sendPush(patientId: string, title: string, body: string, discreet: boolean) {
  const { data: subs } = await db
    .from("push_subscriptions")
    .select("endpoint,p256dh,auth")
    .eq("patient_id", patientId);
  if (!subs?.length) return { ok: false, reason: "no_subscription" };

  // modo discreto: texto genérico na lock screen
  const payload = JSON.stringify({
    title: discreet ? "Hora do seu cuidado" : title,
    body: discreet ? "Toque para abrir o Mente Viva." : body,
  });

  let okAny = false;
  for (const s of subs) {
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        payload,
      );
      okAny = true;
    } catch (e) {
      // 410 Gone / 404 = subscription expirada → remover
      // deno-lint-ignore no-explicit-any
      const code = (e as any)?.statusCode;
      if (code === 410 || code === 404) {
        await db.from("push_subscriptions").delete().eq("endpoint", s.endpoint);
      }
    }
  }
  return { ok: okAny };
}

// ---- Envio WhatsApp (Cloud API) ----
// Lembretes fora da janela de 24h exigem TEMPLATE aprovado pela Meta.
async function sendWhatsApp(phoneE164: string, templateName: string, vars: string[]) {
  const url = `https://graph.facebook.com/v21.0/${WA_PHONE_ID}/messages`;
  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${WA_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: phoneE164.replace("+", ""),
      type: "template",
      template: {
        name: templateName,
        language: { code: "pt_BR" },
        components: [{ type: "body", parameters: vars.map((t) => ({ type: "text", text: t })) }],
      },
    }),
  });
  return { ok: res.ok, status: res.status, body: await res.text() };
}

Deno.serve(async () => {
  const now = new Date();
  const windowEnd = new Date(now.getTime() + 5 * 60 * 1000); // próximos 5 min
  const results: Record<string, number> = { dose_push: 0, dose_wa: 0, generic: 0, failed: 0 };

  // ---------- 1) Doses pendentes que vencem na janela ----------
  const { data: doses } = await db
    .from("doses")
    .select("id, patient_id, scheduled_at, medications(name, dose, channel), patients(discreet_mode, phone:profiles(phone_e164))")
    .eq("status", "pending")
    .gte("scheduled_at", now.toISOString())
    .lte("scheduled_at", windowEnd.toISOString());

  for (const d of doses ?? []) {
    // deno-lint-ignore no-explicit-any
    const med: any = d.medications;
    // deno-lint-ignore no-explicit-any
    const pat: any = d.patients;
    const title = `Hora da ${med.name} 💊`;
    const body = `Sua dose (${med.dose ?? ""}) chegou. Toque para confirmar.`;

    if (med.channel === "whatsapp" && pat?.phone?.phone_e164) {
      const r = await sendWhatsApp(pat.phone.phone_e164, "lembrete_medicacao", [med.name, med.dose ?? ""]);
      r.ok ? results.dose_wa++ : results.failed++;
    } else {
      const r = await sendPush(d.patient_id, title, body, pat?.discreet_mode ?? false);
      r.ok ? results.dose_push++ : results.failed++;
    }

    await db.from("reminders").insert({
      patient_id: d.patient_id, kind: "medication",
      channel: med.channel, scheduled_at: d.scheduled_at,
      state: "sent", sent_at: now.toISOString(),
      payload: { dose_id: d.id, medication: med.name },
    });
  }

  // ---------- 2) Lembretes genéricos agendados (água, check-in, etc.) ----------
  const { data: rems } = await db
    .from("reminders")
    .select("id, patient_id, kind, channel, payload, patients(discreet_mode, phone:profiles(phone_e164))")
    .eq("state", "scheduled")
    .gte("scheduled_at", now.toISOString())
    .lte("scheduled_at", windowEnd.toISOString());

  for (const r of rems ?? []) {
    // deno-lint-ignore no-explicit-any
    const pat: any = r.patients;
    const title = (r.payload as any)?.title ?? "Mente Viva";
    const body = (r.payload as any)?.body ?? "Um lembrete de cuidado.";
    let ok = false;

    if (r.channel === "whatsapp" && pat?.phone?.phone_e164) {
      const tpl = r.kind === "mood_checkin" ? "checkin_humor" : "lembrete_cuidado";
      const res = await sendWhatsApp(pat.phone.phone_e164, tpl, [body]);
      ok = res.ok;
    } else {
      const res = await sendPush(r.patient_id, title, body, pat?.discreet_mode ?? false);
      ok = res.ok;
    }
    await db.from("reminders").update({
      state: ok ? "sent" : "failed", sent_at: now.toISOString(),
    }).eq("id", r.id);
    ok ? results.generic++ : results.failed++;
  }

  // ---------- 3) Caregiver alert (avisar familiar após N faltas) ----------
  const { data: care } = await db.rpc("patients_needing_caregiver_alert");
  for (const c of care ?? []) {
    // não reavisar o mesmo familiar 2x no mesmo dia
    const { error: logErr } = await db
      .from("caregiver_alerts_log")
      .insert({ patient_id: c.patient_id });
    if (logErr) continue; // já avisado hoje (PK colide)

    if (c.caregiver_phone) {
      await sendWhatsApp(c.caregiver_phone, "alerta_familiar", [c.patient_name, String(c.consecutive_missed)]);
      results.caregiver = (results.caregiver ?? 0) + 1;
    }
  }

  return new Response(JSON.stringify({ ran_at: now.toISOString(), ...results }), {
    headers: { "Content-Type": "application/json" },
  });
});
