// ============================================================
// Mente Viva · Edge Function: patient-access
// Login do paciente por CPF (login) + telefone (senha).
// - Se for o 1º acesso: cria o usuário no Auth e vincula ao médico.
// - O paciente nunca vê e-mail; usamos um e-mail interno derivado do CPF.
//
// Deploy: supabase functions deploy patient-access --no-verify-jwt
// ============================================================
import { createClient } from "jsr:@supabase/supabase-js@2";

const URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const db = createClient(URL, SERVICE);

const onlyDigits = (s: string) => (s ?? "").replace(/\D/g, "");
const cpfToEmail = (cpf: string) => `${cpf}@paciente.menteviva.app`;

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const body = await req.json();
    const action = body.action ?? "login";

    // ── MODO: acesso do cuidador/enfermeiro (código + telefone) ──
    if (action === "caregiver_login") {
      const code = (body.code ?? "").trim().toUpperCase();
      const phone = onlyDigits(body.phone);
      if (!code) return json({ ok: false, error: "Código obrigatório" }, 400);

      // acha o membro da rede pelo código de acesso
      const { data: member } = await db
        .from("support_network").select("*").eq("access_code", code).maybeSingle();
      if (!member) return json({ ok: false, error: "Código não encontrado" }, 404);
      if (onlyDigits(member.phone ?? "") !== phone) {
        return json({ ok: false, error: "Telefone não confere" }, 401);
      }

      const email = `cuidador.${code.toLowerCase()}@cuidador.menteviva.app`;
      const { data: existing } = await db.auth.admin.listUsers();
      let uid = existing.users.find((u) => u.email === email)?.id;

      if (!uid) {
        const { data: created, error: cErr } = await db.auth.admin.createUser({
          email, password: phone, email_confirm: true,
          user_metadata: { full_name: member.full_name, role: "caregiver" },
        });
        if (cErr || !created.user) return json({ ok: false, error: cErr?.message ?? "falha" }, 500);
        uid = created.user.id;
        await db.from("profiles").upsert({ id: uid, role: "caregiver", full_name: member.full_name });
        // vincula o login ao membro da rede
        await db.from("support_network").update({ member_id: uid }).eq("id", member.id);
      } else {
        // ressincroniza senha
        await db.auth.admin.updateUserById(uid, { password: phone });
      }

      return json({ ok: true, email, existing: !!uid });
    }

    // ── MODO: médico cria paciente JÁ ATIVO (ficha existe na hora) ──
    if (action === "create") {
      const cpf = onlyDigits(body.cpf);
      const phone = onlyDigits(body.phone);
      const full_name = (body.full_name ?? "").trim();
      const doctor_id = body.doctor_id;
      const diagnosis = body.diagnosis ?? null;
      if (cpf.length < 11) return json({ ok: false, error: "CPF inválido" }, 400);
      if (!full_name) return json({ ok: false, error: "Nome obrigatório" }, 400);
      if (!doctor_id) return json({ ok: false, error: "Médico não identificado" }, 400);

      const email = cpfToEmail(cpf);
      // já existe?
      const { data: existing } = await db.auth.admin.listUsers();
      let uid = existing.users.find((u) => u.email === email)?.id;

      if (!uid) {
        const { data: created, error: cErr } = await db.auth.admin.createUser({
          email, password: phone, email_confirm: true,
          user_metadata: { full_name, role: "patient" },
        });
        if (cErr || !created.user) return json({ ok: false, error: cErr?.message ?? "falha ao criar" }, 500);
        uid = created.user.id;
      }

      await db.from("profiles").upsert({ id: uid, role: "patient", full_name });
      await db.from("patients").upsert({
        id: uid, doctor_id, cpf, phone,
        diagnosis_label: diagnosis, consent_at: new Date().toISOString(),
      });
      if (diagnosis) await db.rpc("apply_protocol", { p_patient: uid, p_protocol: diagnosis });
      // registra/atualiza o invite como já ativado (some do "aguardando acesso")
      await db.from("patient_invites").upsert({
        doctor_id, full_name, cpf, phone, diagnosis_label: diagnosis,
        activated_at: new Date().toISOString(),
      }, { onConflict: "cpf" });

      return json({ ok: true, patient_id: uid });
    }

    // ── MODO: login do paciente (CPF + telefone) ──
    const { cpf: rawCpf, phone: rawPhone } = body;
    const cpf = onlyDigits(rawCpf);
    const phone = onlyDigits(rawPhone);
    if (cpf.length < 11) return json({ ok: false, error: "CPF inválido" }, 400);

    const email = cpfToEmail(cpf);

    // 1) Já existe usuário para esse CPF?
    const { data: existing } = await db.auth.admin.listUsers();
    const user = existing.users.find((u) => u.email === email);

    if (user) {
      // Blindagem: confere o telefone contra o cadastro (invite ou patients)
      // e RESSINCRONIZA a senha, evitando travas por senha fora de sincronia.
      const { data: inv } = await db.from("patient_invites").select("phone").eq("cpf", cpf).maybeSingle();
      const { data: pat } = await db.from("patients").select("phone").eq("id", user.id).maybeSingle();
      const cadPhone = onlyDigits(inv?.phone ?? pat?.phone ?? "");

      // se temos um telefone de cadastro, ele precisa bater
      if (cadPhone && cadPhone !== phone) {
        return json({ ok: false, error: "Telefone não confere com o cadastro." }, 401);
      }
      // garante que a senha é o telefone informado
      await db.auth.admin.updateUserById(user.id, { password: phone });
      return json({ ok: true, email, password_hint: "telefone", existing: true });
    }

    // 2) Primeiro acesso: precisa existir um convite (pré-cadastro do médico)
    const { data: invite } = await db
      .from("patient_invites").select("*").eq("cpf", cpf).single();
    if (!invite) return json({ ok: false, error: "CPF não cadastrado pelo médico" }, 404);

    // valida o telefone como "senha"
    if (onlyDigits(invite.phone) !== phone) {
      return json({ ok: false, error: "Telefone não confere" }, 401);
    }

    // 3) Cria o usuário no Auth (e-mail interno + telefone como senha), já confirmado
    const { data: created, error: cErr } = await db.auth.admin.createUser({
      email, password: phone, email_confirm: true,
      user_metadata: { full_name: invite.full_name, role: "patient" },
    });
    if (cErr || !created.user) return json({ ok: false, error: cErr?.message ?? "falha ao criar" }, 500);
    const uid = created.user.id;

    // 4) profile + patient (vínculo ao médico) + consentimento
    await db.from("profiles").upsert({ id: uid, role: "patient", full_name: invite.full_name });
    await db.from("patients").upsert({
      id: uid, doctor_id: invite.doctor_id, cpf, phone,
      diagnosis_label: invite.diagnosis_label, consent_at: new Date().toISOString(),
    });
    // aplica protocolo se o médico já definiu diagnóstico
    if (invite.diagnosis_label) {
      await db.rpc("apply_protocol", { p_patient: uid, p_protocol: invite.diagnosis_label });
    }
    await db.from("patient_invites").update({ activated_at: new Date().toISOString() }).eq("id", invite.id);

    return json({ ok: true, email, password_hint: "telefone", existing: false });
  } catch (e) {
    return json({ ok: false, error: String(e) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
}
