-- ============================================================
-- Mente Viva · ENGINE 5: Notification & Escalation Engine
-- Regras de escalonamento + trilha de notificações — doc Módulo 5
-- (disparo real fica para quando a API WhatsApp/push conectar)
-- ============================================================

-- regras de escalonamento configuráveis (por gravidade/tipo)
create table if not exists escalation_rules (
  id          uuid primary key default gen_random_uuid(),
  doctor_id   uuid references doctors(id) on delete cascade,
  trigger     text not null,        -- 'dose_missed' | 'fall' | 'suicidal_ideation' ...
  after_min   int not null,         -- minutos após o gatilho
  notify_role text not null,        -- 'patient' | 'caregiver' | 'family' | 'doctor'
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);
alter table escalation_rules enable row level security;
drop policy if exists "médico gerencia regras" on escalation_rules;
create policy "médico gerencia regras" on escalation_rules
  for all using (doctor_id = auth.uid()) with check (doctor_id = auth.uid());

-- trilha de notificações (toda notificação registra destinatário, canal, status)
create table if not exists notifications (
  id           uuid primary key default gen_random_uuid(),
  patient_id   uuid references patients(id) on delete cascade,
  recipient_id uuid references profiles(id),
  recipient_role text,
  channel      text,                -- 'push' | 'whatsapp' | 'dashboard'
  trigger      text,                -- vínculo com o evento/dose
  entity       text,
  entity_id    uuid,
  body         text,
  sent_at      timestamptz,
  read_at      timestamptz,
  action_taken text,
  status       text not null default 'queued', -- queued | sent | read | failed
  created_at   timestamptz not null default now()
);
create index if not exists notif_patient_idx on notifications (patient_id, created_at desc);
alter table notifications enable row level security;
drop policy if exists "médico vê notificações dos seus pacientes" on notifications;
create policy "médico vê notificações dos seus pacientes" on notifications
  for select using (
    patient_id is null or exists (
      select 1 from patients p where p.id = notifications.patient_id and p.doctor_id = auth.uid()
    )
  );

-- enfileira uma notificação (o disparo real é feito por worker/edge function depois)
create or replace function queue_notification(
  p_patient uuid, p_recipient uuid, p_role text, p_channel text,
  p_trigger text, p_body text, p_entity text default null, p_entity_id uuid default null
) returns uuid language sql security definer set search_path = public as $$
  insert into notifications (patient_id, recipient_id, recipient_role, channel, trigger, body, entity, entity_id, status)
  values (p_patient, p_recipient, p_role, p_channel, p_trigger, p_body, p_entity, p_entity_id, 'queued')
  returning id;
$$;

-- semeia regras padrão para um médico (doc Módulo 5: dose não confirmada)
create or replace function seed_default_escalation(p_doctor uuid)
returns void language sql security definer set search_path = public as $$
  insert into escalation_rules (doctor_id, trigger, after_min, notify_role) values
    (p_doctor, 'dose_missed', 30, 'patient'),
    (p_doctor, 'dose_missed', 120, 'caregiver'),
    (p_doctor, 'dose_missed', 240, 'family'),
    (p_doctor, 'dose_missed', 1440, 'doctor'),
    (p_doctor, 'fall', 0, 'caregiver'),
    (p_doctor, 'fall', 0, 'doctor'),
    (p_doctor, 'suicidal_ideation', 0, 'doctor')
  on conflict do nothing;
$$;
