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
    const { cpf: rawCpf, phone: rawPhone } = await req.json();
    const cpf = onlyDigits(rawCpf);
    const phone = onlyDigits(rawPhone);
    if (cpf.length < 11) return json({ ok: false, error: "CPF inválido" }, 400);

    const email = cpfToEmail(cpf);

    // 1) Já existe usuário para esse CPF?
    const { data: existing } = await db.auth.admin.listUsers();
    const user = existing.users.find((u) => u.email === email);

    if (user) {
      // já ativado — é login normal. Devolve as credenciais internas p/ o front logar.
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
