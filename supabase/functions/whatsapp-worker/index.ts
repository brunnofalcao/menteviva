// ============================================================
// Mente Viva · Edge Function: whatsapp-worker
// Processa a fila de notificações e envia via WhatsApp Cloud API.
// API-READY: o código de envio está completo. Só dispara de verdade
// quando whatsapp_config.connected = true e access_token estiver preenchido.
// ============================================================
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  const db = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    // pega até 20 notificações de WhatsApp na fila
    const { data: queue } = await db
      .from("notifications")
      .select("*")
      .eq("channel", "whatsapp")
      .eq("status", "queued")
      .lt("attempts", 3)
      .limit(20);

    if (!queue || queue.length === 0) {
      return json({ ok: true, processed: 0, note: "fila vazia" });
    }

    let sent = 0, skipped = 0, failed = 0;

    for (const n of queue) {
      // resolve o médico dono do paciente para achar as credenciais
      const { data: pat } = await db.from("patients").select("doctor_id").eq("id", n.patient_id).maybeSingle();
      const { data: cfg } = pat
        ? await db.from("whatsapp_config").select("*").eq("doctor_id", pat.doctor_id).maybeSingle()
        : { data: null };

      // AINDA NÃO CONECTADO → marca como "aguardando conexão" e segue
      if (!cfg || !cfg.connected || !cfg.access_token || !cfg.phone_number_id) {
        await db.from("notifications").update({
          status: "queued", last_error: "whatsapp_not_connected",
        }).eq("id", n.id);
        skipped++;
        continue;
      }

      // ===== ENVIO REAL (WhatsApp Cloud API / Graph) =====
      try {
        const url = `https://graph.facebook.com/v21.0/${cfg.phone_number_id}/messages`;
        // se há template, usa template; senão, texto simples
        const body = n.template_key
          ? {
              messaging_product: "whatsapp",
              to: n.to_phone,
              type: "template",
              template: {
                name: n.template_key,
                language: { code: "pt_BR" },
                components: n.payload?.params
                  ? [{ type: "body", parameters: (n.payload.params as string[]).map((t) => ({ type: "text", text: t })) }]
                  : [],
              },
            }
          : {
              messaging_product: "whatsapp",
              to: n.to_phone,
              type: "text",
              text: { body: n.body ?? "" },
            };

        const resp = await fetch(url, {
          method: "POST",
          headers: { "Authorization": `Bearer ${cfg.access_token}`, "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

        if (resp.ok) {
          await db.from("notifications").update({
            status: "sent", sent_at: new Date().toISOString(), attempts: (n.attempts ?? 0) + 1, last_error: null,
          }).eq("id", n.id);
          sent++;
        } else {
          const errText = await resp.text();
          await db.from("notifications").update({
            status: "failed", attempts: (n.attempts ?? 0) + 1, last_error: errText.slice(0, 400),
          }).eq("id", n.id);
          failed++;
        }
      } catch (e) {
        await db.from("notifications").update({
          status: "failed", attempts: (n.attempts ?? 0) + 1,
          last_error: e instanceof Error ? e.message : "erro desconhecido",
        }).eq("id", n.id);
        failed++;
      }
    }

    return json({ ok: true, processed: queue.length, sent, skipped, failed });
  } catch (e) {
    return json({ ok: false, error: e instanceof Error ? e.message : "erro" }, 500);
  }
});
