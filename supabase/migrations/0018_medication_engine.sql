-- ============================================================
-- Mente Viva · SPRINT 2: Medication & Adherence Engine
--                + fundação de Auditoria (LGPD)
-- ============================================================

-- ------------------------------------------------------------
-- 1) MEDICATION: campos clínicos completos (doc Módulo 2)
-- ------------------------------------------------------------
alter table medications add column if not exists active_ingredient text;   -- princípio ativo
alter table medications add column if not exists unit text;                -- mg, ml, gota
alter table medications add column if not exists caregiver_instructions text; -- instruções p/ cuidador
alter table medications add column if not exists clinical_notes text;      -- observações clínicas
alter table medications add column if not exists refill_alert_days int;    -- avisar X dias antes de acabar
alter table medications add column if not exists stock_units int;          -- estoque atual (doses restantes)
-- status mais rico (além de active boolean): ativo, pausado, finalizado, suspenso
do $$ begin
  if not exists (select 1 from pg_type where typname = 'med_status') then
    create type med_status as enum ('active','paused','finished','suspended');
  end if;
end $$;
alter table medications add column if not exists status med_status not null default 'active';

-- ------------------------------------------------------------
-- 2) DOSE: registro de confirmação completo (doc Módulo 2)
--    quem confirmou, papel, origem, dispositivo, atraso
-- ------------------------------------------------------------
do $$ begin
  if not exists (select 1 from pg_type where typname = 'dose_actor_role') then
    create type dose_actor_role as enum ('patient','caregiver','nurse','doctor','system');
  end if;
end $$;
alter table doses add column if not exists confirmed_by uuid references profiles(id);
alter table doses add column if not exists confirmed_role dose_actor_role;
alter table doses add column if not exists confirmed_note text;
alter table doses add column if not exists was_delayed boolean default false;


-- ------------------------------------------------------------
-- 3) AUDIT LOG (fundação LGPD — doc Seção 14)
--    Registra acessos e ações sensíveis por usuário.
-- ------------------------------------------------------------
create table if not exists audit_log (
  id          uuid primary key default gen_random_uuid(),
  actor_id    uuid references profiles(id),
  actor_role  text,
  action      text not null,        -- 'view_patient','edit_med','confirm_dose','generate_report'...
  entity      text,                 -- 'patient','medication','dose','report'
  entity_id   uuid,
  patient_id  uuid,                 -- paciente afetado (p/ trilha por paciente)
  detail      jsonb,
  created_at  timestamptz not null default now()
);
create index if not exists audit_patient_idx on audit_log (patient_id, created_at desc);
create index if not exists audit_actor_idx on audit_log (actor_id, created_at desc);
alter table audit_log enable row level security;
-- médico vê a trilha dos seus pacientes
drop policy if exists "médico vê auditoria dos seus pacientes" on audit_log;
create policy "médico vê auditoria dos seus pacientes" on audit_log
  for select using (
    patient_id is null or exists (
      select 1 from patients p where p.id = audit_log.patient_id and p.doctor_id = auth.uid()
    )
  );

-- função helper para registrar auditoria (chamável via RPC)
create or replace function log_action(
  p_action text, p_entity text, p_entity_id uuid, p_patient uuid, p_detail jsonb default '{}'
) returns void language sql security definer set search_path = public as $$
  insert into audit_log (actor_id, actor_role, action, entity, entity_id, patient_id, detail)
  values (
    auth.uid(),
    (select role from profiles where id = auth.uid()),
    p_action, p_entity, p_entity_id, p_patient, p_detail
  );
$$;

-- ------------------------------------------------------------
-- 4) Função de adesão detalhada (por responsável e status)
--    doc: "ver adesão por responsável pela confirmação, status da dose"
-- ------------------------------------------------------------
create or replace function adherence_detail(p_patient uuid, p_days int default 30)
returns table (
  total bigint,
  taken bigint,
  missed bigint,
  refused bigint,
  by_caregiver bigint,
  by_nurse bigint,
  rate numeric
) language sql security definer stable set search_path = public as $$
  with d as (
    select * from doses
    where patient_id = p_patient
      and scheduled_at >= now() - (p_days || ' days')::interval
      and scheduled_at < now()
  )
  select
    count(*),
    count(*) filter (where status = 'taken'),
    count(*) filter (where status = 'skipped'),
    count(*) filter (where status = 'refused'),
    count(*) filter (where confirmed_role = 'caregiver'),
    count(*) filter (where confirmed_role = 'nurse'),
    coalesce(round(100.0 * count(*) filter (where status = 'taken') / nullif(count(*),0)), 0)
  from d;
$$;
