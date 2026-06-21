-- ============================================================
-- Mente Viva · FASE 2: WhatsApp Integration (API-ready)
-- Toda a estrutura pronta. Só falta plugar número+token no fim.
-- ============================================================

-- ------------------------------------------------------------
-- 1) Credenciais WhatsApp por clínica/médico (preenchidas só no fim)
-- ------------------------------------------------------------
create table if not exists whatsapp_config (
  doctor_id        uuid primary key references doctors(id) on delete cascade,
  phone_number_id  text,           -- ID do número na Meta (Cloud API)
  waba_id          text,           -- WhatsApp Business Account ID
  access_token     text,           -- token (preenchido só na hora de conectar)
  display_name     text,
  connected        boolean not null default false,  -- vira true quando plugar
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
alter table whatsapp_config enable row level security;
drop policy if exists "médico gerencia seu whatsapp" on whatsapp_config;
create policy "médico gerencia seu whatsapp" on whatsapp_config
  for all using (doctor_id = auth.uid()) with check (doctor_id = auth.uid());

-- ------------------------------------------------------------
-- 2) Templates de mensagem (Meta exige templates aprovados)
--    Já deixamos os textos padrão; o template_name liga ao aprovado na Meta.
-- ------------------------------------------------------------
create table if not exists whatsapp_templates (
  id            uuid primary key default gen_random_uuid(),
  doctor_id     uuid references doctors(id) on delete cascade,
  key           text not null,       -- 'dose_reminder' | 'dose_missed' | 'critical_event' ...
  template_name text,                -- nome do template aprovado na Meta
  language      text not null default 'pt_BR',
  body_preview  text,                -- texto de referência (o que o template diz)
  created_at    timestamptz not null default now()
);
alter table whatsapp_templates enable row level security;
drop policy if exists "médico gerencia templates" on whatsapp_templates;
create policy "médico gerencia templates" on whatsapp_templates
  for all using (doctor_id = auth.uid()) with check (doctor_id = auth.uid());

-- ------------------------------------------------------------
-- 3) A fila de notificações (já existe a tabela notifications do Engine 5)
--    Adicionamos campos que o worker de envio precisa.
-- ------------------------------------------------------------
alter table notifications add column if not exists to_phone text;       -- destino resolvido
alter table notifications add column if not exists template_key text;   -- qual template usar
alter table notifications add column if not exists payload jsonb;       -- variáveis do template
alter table notifications add column if not exists attempts int not null default 0;
alter table notifications add column if not exists last_error text;

-- ------------------------------------------------------------
-- 4) Função: enfileirar notificação JÁ com destino e template
--    (versão enriquecida da queue_notification do Engine 5)
-- ------------------------------------------------------------
create or replace function queue_whatsapp(
  p_patient uuid, p_to_phone text, p_template_key text, p_payload jsonb, p_body text
) returns uuid language sql security definer set search_path = public as $$
  insert into notifications (patient_id, channel, to_phone, template_key, payload, body, status)
  values (p_patient, 'whatsapp', p_to_phone, p_template_key, p_payload, p_body, 'queued')
  returning id;
$$;

-- seed dos templates padrão para um médico
create or replace function seed_whatsapp_templates(p_doctor uuid)
returns void language sql security definer set search_path = public as $$
  insert into whatsapp_templates (doctor_id, key, body_preview) values
    (p_doctor, 'dose_reminder', 'Olá {{1}}, está na hora do seu medicamento {{2}}. Toque para confirmar.'),
    (p_doctor, 'dose_missed', 'Olá {{1}}, notamos que a dose de {{2}} ainda não foi confirmada.'),
    (p_doctor, 'caregiver_alert', '{{1}} tem uma dose pendente de {{2}}. Você pode ajudar?'),
    (p_doctor, 'critical_event', 'Atenção: evento importante registrado para {{1}}. Verifique o app.')
  on conflict do nothing;
$$;
