-- ============================================================
-- Mente Viva · FASE 2: Apple Health / HealthKit (API-ready)
-- Estrutura pronta para receber sinais passivos. O app nativo
-- (quando nas lojas) só fará POST nesta estrutura. Doc Módulo 13.
-- ============================================================

-- consentimento do paciente para leitura do HealthKit (doc Seção 14)
alter table patients add column if not exists healthkit_consent boolean not null default false;
alter table patients add column if not exists healthkit_consent_at timestamptz;

-- sinais passivos vindos do HealthKit (sono, passos, FC, atividade)
do $$ begin
  if not exists (select 1 from pg_type where typname = 'health_metric') then
    create type health_metric as enum ('sleep_hours','steps','heart_rate','active_energy','resting_hr','hrv');
  end if;
end $$;

create table if not exists health_signals (
  id          uuid primary key default gen_random_uuid(),
  patient_id  uuid not null references patients(id) on delete cascade,
  metric      health_metric not null,
  value       numeric not null,
  unit        text,
  measured_at timestamptz not null,
  source      text default 'healthkit',   -- 'healthkit' | 'manual' | 'other'
  created_at  timestamptz not null default now()
);
create index if not exists health_signals_idx on health_signals (patient_id, metric, measured_at desc);
alter table health_signals enable row level security;

-- paciente insere seus próprios sinais; médico do paciente lê
drop policy if exists "paciente insere seus sinais" on health_signals;
create policy "paciente insere seus sinais" on health_signals
  for insert with check (patient_id = auth.uid());
drop policy if exists "paciente vê seus sinais" on health_signals;
create policy "paciente vê seus sinais" on health_signals
  for select using (patient_id = auth.uid());
drop policy if exists "médico vê sinais do seu paciente" on health_signals;
create policy "médico vê sinais do seu paciente" on health_signals
  for select using (
    exists (select 1 from patients p where p.id = health_signals.patient_id and p.doctor_id = auth.uid())
  );

-- ------------------------------------------------------------
-- Função de ingestão (o app nativo chamará via RPC com consentimento)
-- Aceita um lote de medições de uma vez.
-- ------------------------------------------------------------
create or replace function ingest_health_signals(p_signals jsonb)
returns int language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  consent boolean;
  cnt int := 0;
  rec jsonb;
begin
  select healthkit_consent into consent from patients where id = uid;
  if not coalesce(consent, false) then
    raise exception 'sem consentimento HealthKit';
  end if;

  for rec in select * from jsonb_array_elements(p_signals) loop
    insert into health_signals (patient_id, metric, value, unit, measured_at, source)
    values (
      uid,
      (rec->>'metric')::health_metric,
      (rec->>'value')::numeric,
      rec->>'unit',
      coalesce((rec->>'measured_at')::timestamptz, now()),
      coalesce(rec->>'source', 'healthkit')
    );
    cnt := cnt + 1;
  end loop;
  return cnt;
end; $$;

-- ------------------------------------------------------------
-- Correlação (doc Módulo 13 fase 3): média de uma métrica por dia,
-- pronta para cruzar com adesão/sintomas no futuro.
-- ------------------------------------------------------------
create or replace function health_daily_avg(p_patient uuid, p_metric text, p_days int default 14)
returns table (day date, avg_value numeric) language sql security definer stable set search_path = public as $$
  select measured_at::date as day, round(avg(value), 1) as avg_value
  from health_signals
  where patient_id = p_patient and metric = p_metric::health_metric
    and measured_at >= now() - (p_days || ' days')::interval
  group by 1 order by 1;
$$;
