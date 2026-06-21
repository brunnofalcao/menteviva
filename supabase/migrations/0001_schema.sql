-- ============================================================
-- Mente Viva · Schema inicial
-- Postgres (Supabase). Tudo com RLS. Dado psiquiátrico = sensível (LGPD).
-- ============================================================

-- Extensões
create extension if not exists "pgcrypto";

-- ---------- ENUMS ----------
create type user_role        as enum ('patient', 'doctor');
create type med_source        as enum ('doctor', 'patient');     -- quem cadastrou
create type med_frequency     as enum ('daily', 'alternate', 'weekly', 'as_needed');
create type dose_status       as enum ('pending', 'taken', 'skipped', 'snoozed');
create type skip_reason       as enum ('forgot', 'side_effect', 'ran_out', 'felt_better', 'other');
create type reminder_kind     as enum ('medication', 'water', 'mood_checkin', 'breathing', 'care_message');
create type reminder_channel  as enum ('push', 'whatsapp');
create type reminder_state    as enum ('scheduled', 'sent', 'failed', 'cancelled');
create type checkin_module    as enum ('mood','sleep','side_effects','energy','activity','hydration','free_note');
create type activity_level    as enum ('still','moved','exercised');

-- ============================================================
-- PROFILES  (estende auth.users do Supabase)
-- ============================================================
create table profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  role         user_role not null,
  full_name    text not null,
  phone_e164   text,                         -- p/ WhatsApp, formato +55...
  created_at   timestamptz not null default now()
);

-- ============================================================
-- DOCTORS  (dados do médico + whitelabel)
-- ============================================================
create table doctors (
  id            uuid primary key references profiles(id) on delete cascade,
  crm           text,
  clinic_name   text not null default 'Mente Viva',
  invite_code   text not null unique,         -- ex.: DR-4827, usado no onboarding do paciente
  -- whitelabel
  brand_name    text not null default 'Mente Viva',
  brand_accent  text not null default '#3B7A6B',
  brand_logo_url text,
  created_at    timestamptz not null default now()
);
create index on doctors (invite_code);

-- ============================================================
-- PATIENTS  (vínculo 1 paciente -> 1 médico no MVP)
-- ============================================================
create table patients (
  id              uuid primary key references profiles(id) on delete cascade,
  doctor_id       uuid not null references doctors(id) on delete restrict,
  diagnosis_label text,                        -- "Depressão", etc. (define protocolo de módulos)
  discreet_mode   boolean not null default false,  -- notificação genérica na lock screen
  consent_at      timestamptz,                 -- LGPD: quando aceitou compartilhar c/ médico
  caregiver_phone text,                        -- rede de apoio (opcional)
  caregiver_alert_after int default 3,         -- avisar familiar após N faltas seguidas
  created_at      timestamptz not null default now()
);
create index on patients (doctor_id);

-- ============================================================
-- PATIENT_MODULES  (médico ativa/desativa módulos por paciente)
-- ============================================================
create table patient_modules (
  patient_id  uuid not null references patients(id) on delete cascade,
  module      checkin_module not null,
  enabled     boolean not null default true,
  primary key (patient_id, module)
);

-- ============================================================
-- MEDICATIONS
-- ============================================================
create table medications (
  id          uuid primary key default gen_random_uuid(),
  patient_id  uuid not null references patients(id) on delete cascade,
  source      med_source not null,             -- doctor | patient (separação visual + clínica)
  name        text not null,
  dose        text,                            -- "50 mg"
  form        text,                            -- "Comprimido"
  frequency   med_frequency not null default 'daily',
  times       text[] not null default '{}',    -- horários ['08:00','21:00']
  channel     reminder_channel not null default 'push',
  active      boolean not null default true,
  created_by  uuid not null references profiles(id),
  created_at  timestamptz not null default now()
);
create index on medications (patient_id) where active;

-- ============================================================
-- DOSES  (o SINAL PRIMÁRIO do produto)
-- Uma linha por dose agendada; status muda quando paciente confirma.
-- ============================================================
create table doses (
  id            uuid primary key default gen_random_uuid(),
  medication_id uuid not null references medications(id) on delete cascade,
  patient_id    uuid not null references patients(id) on delete cascade,
  scheduled_at  timestamptz not null,
  status        dose_status not null default 'pending',
  acted_at      timestamptz,                   -- quando tomou/pulou
  skip_reason   skip_reason,                   -- só se status=skipped
  created_at    timestamptz not null default now()
);
create index on doses (patient_id, scheduled_at desc);
create index on doses (status, scheduled_at) where status = 'pending';

-- ============================================================
-- CHECKINS  (humor + sono + módulos manuais, 1 por dia)
-- ============================================================
create table checkins (
  id           uuid primary key default gen_random_uuid(),
  patient_id   uuid not null references patients(id) on delete cascade,
  day          date not null,
  mood         int  check (mood between 1 and 5),
  energy       int  check (energy between 1 and 5),
  sleep_hours  numeric(3,1),
  activity     activity_level,
  side_effects text[] default '{}',
  water_count  int default 0,
  meal_count   int default 0,
  free_note    text,
  created_at   timestamptz not null default now(),
  unique (patient_id, day)
);
create index on checkins (patient_id, day desc);

-- ============================================================
-- REMINDERS  (fila do motor de agendamento)
-- ============================================================
create table reminders (
  id           uuid primary key default gen_random_uuid(),
  patient_id   uuid not null references patients(id) on delete cascade,
  kind         reminder_kind not null,
  channel      reminder_channel not null,
  scheduled_at timestamptz not null,
  state        reminder_state not null default 'scheduled',
  payload      jsonb not null default '{}',     -- {medication_id, title, body...}
  sent_at      timestamptz,
  error        text,
  created_at   timestamptz not null default now()
);
create index on reminders (state, scheduled_at) where state = 'scheduled';

-- ============================================================
-- PUSH_SUBSCRIPTIONS  (Web Push do PWA)
-- ============================================================
create table push_subscriptions (
  id          uuid primary key default gen_random_uuid(),
  patient_id  uuid not null references patients(id) on delete cascade,
  endpoint    text not null unique,
  p256dh      text not null,
  auth        text not null,
  created_at  timestamptz not null default now()
);

-- ============================================================
-- TRIGGER: criar profile automaticamente ao registrar usuário
-- ============================================================
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, role, full_name)
  values (
    new.id,
    coalesce((new.raw_user_meta_data->>'role')::user_role, 'patient'),
    coalesce(new.raw_user_meta_data->>'full_name', 'Paciente')
  );
  return new;
end; $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
