-- ============================================================
-- Mente Viva · FUNDAÇÃO DA PLATAFORMA
-- Rede de Apoio + Eventos clínicos + Check-in estendido
-- (Psiquiatria & Geriatria)
-- ============================================================

-- ------------------------------------------------------------
-- 1) REDE DE APOIO (Support Network)
--    Pessoas ligadas ao paciente: família, cuidador, enfermeiro.
-- ------------------------------------------------------------
create type support_relationship as enum (
  'father','mother','son','daughter','brother','sister',
  'spouse','partner','grandchild','caregiver','nurse','other'
);

create table if not exists support_network (
  id            uuid primary key default gen_random_uuid(),
  patient_id    uuid not null references patients(id) on delete cascade,
  member_id     uuid references profiles(id) on delete set null, -- se tiver login próprio
  full_name     text not null,
  phone         text,
  email         text,
  relationship  support_relationship not null,
  -- papel funcional: alguns membros têm portal (cuidador/enfermeiro)
  is_caregiver  boolean not null default false,
  is_nurse      boolean not null default false,
  -- permissões configuráveis pelo médico
  can_view_schedule   boolean not null default true,
  can_view_adherence  boolean not null default true,
  can_view_symptoms   boolean not null default false,
  can_register_events boolean not null default false,
  can_view_reports    boolean not null default false,
  -- prioridade de notificação no escalonamento (1 = primeiro a ser avisado)
  notify_priority int not null default 5,
  created_by    uuid references profiles(id),
  created_at    timestamptz not null default now()
);
create index on support_network (patient_id);
alter table support_network enable row level security;

-- médico (dono da clínica do paciente) gerencia a rede
create policy "médico gerencia rede do paciente" on support_network
  for all using (in_my_clinic(patient_id)) with check (in_my_clinic(patient_id));
-- o próprio paciente vê sua rede
create policy "paciente vê sua rede" on support_network
  for select using (patient_id = auth.uid());
-- membro com login vê os pacientes de quem ele cuida
create policy "membro vê seu vínculo" on support_network
  for select using (member_id = auth.uid());

-- ------------------------------------------------------------
-- 2) EVENTOS (clínicos e de tratamento)
--    Registrados por médico, paciente, cuidador ou enfermeiro.
-- ------------------------------------------------------------
create type event_category as enum ('clinical','treatment','observation');
create type event_type as enum (
  -- clínicos
  'fall','dizziness','excessive_sleepiness','confusion','anxiety_crisis',
  'panic_attack','mood_change','hallucination','insomnia','pain','appetite_loss',
  -- tratamento
  'medication_refused','medication_forgotten','medication_unavailable',
  'emergency_visit','hospitalization',
  -- livre
  'observation'
);
create type event_severity as enum ('low','medium','high');

create table if not exists patient_events (
  id           uuid primary key default gen_random_uuid(),
  patient_id   uuid not null references patients(id) on delete cascade,
  category     event_category not null,
  type         event_type not null,
  severity     event_severity not null default 'low',
  note         text,
  occurred_at  timestamptz not null default now(),
  reported_by  uuid references profiles(id),
  reporter_role text,  -- 'doctor','patient','caregiver','nurse','family'
  created_at   timestamptz not null default now()
);
create index on patient_events (patient_id, occurred_at desc);
alter table patient_events enable row level security;

create policy "médico vê/gerencia eventos da clínica" on patient_events
  for all using (in_my_clinic(patient_id)) with check (in_my_clinic(patient_id));
create policy "paciente vê e cria seus eventos" on patient_events
  for select using (patient_id = auth.uid());
create policy "paciente cria seus eventos" on patient_events
  for insert with check (patient_id = auth.uid());
-- membro da rede com permissão registra eventos
create policy "rede registra eventos" on patient_events
  for insert with check (
    exists (select 1 from support_network sn
            where sn.patient_id = patient_events.patient_id
              and sn.member_id = auth.uid()
              and sn.can_register_events)
  );
create policy "rede vê eventos se permitido" on patient_events
  for select using (
    exists (select 1 from support_network sn
            where sn.patient_id = patient_events.patient_id
              and sn.member_id = auth.uid()
              and sn.can_view_symptoms)
  );

-- ------------------------------------------------------------
-- 3) CHECK-IN ESTENDIDO (psiquiatria: ansiedade, apetite, irritabilidade)
-- ------------------------------------------------------------
-- novos módulos no enum de check-in

-- novas colunas de registro no checkin
alter table checkins add column if not exists anxiety int;
alter table checkins add column if not exists appetite int;
alter table checkins add column if not exists irritability int;

-- ------------------------------------------------------------
-- 4) ESPECIALIDADE do médico (psiquiatria / geriatria)
-- ------------------------------------------------------------
alter table doctors add column if not exists specialty text default 'psychiatry';

-- ------------------------------------------------------------
-- 5) CAMPOS CLÍNICOS do medicamento (indicação, instruções, início)
-- ------------------------------------------------------------
alter table medications add column if not exists indication text;
alter table medications add column if not exists instructions text;
alter table medications add column if not exists started_at date default current_date;

-- ------------------------------------------------------------
-- 6) TIMELINE LONGITUDINAL (view unificada)
--    Junta doses, eventos, check-ins relevantes e prescrições
--    numa linha do tempo única por paciente.
-- ------------------------------------------------------------
create or replace function patient_timeline(p_patient uuid, p_limit int default 50)
returns table (
  kind text,        -- 'event','medication','checkin','dose_missed'
  label text,
  detail text,
  severity text,
  at timestamptz
) language sql security definer stable set search_path = public as $$
  -- eventos clínicos e de tratamento
  select 'event'::text, e.type::text, e.note, e.severity::text, e.occurred_at
  from patient_events e where e.patient_id = p_patient
  union all
  -- início de medicamentos
  select 'medication'::text, m.name, coalesce(m.dose,'') , 'low', m.started_at::timestamptz
  from medications m where m.patient_id = p_patient and m.source = 'doctor'
  union all
  -- check-ins com humor baixo (sinal)
  select 'checkin'::text, 'Humor baixo', c.free_note, 'medium', (c.day::text || ' 12:00')::timestamptz
  from checkins c where c.patient_id = p_patient and c.mood is not null and c.mood <= 2
  order by 5 desc
  limit p_limit;
$$;
