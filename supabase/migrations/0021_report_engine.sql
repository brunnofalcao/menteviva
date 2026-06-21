-- ============================================================
-- Mente Viva · ENGINE 6: Report & Document Engine
-- Relatórios versionados (autor, data, status, histórico) — doc Módulo 6
-- ============================================================

do $$ begin
  if not exists (select 1 from pg_type where typname = 'report_status') then
    create type report_status as enum ('draft','reviewed','issued','cancelled');
  end if;
end $$;

create table if not exists reports (
  id           uuid primary key default gen_random_uuid(),
  patient_id   uuid not null references patients(id) on delete cascade,
  doctor_id    uuid not null references doctors(id),
  kind         text not null,        -- clinical | family | referral | consultation | adherence | events | longitudinal
  title        text,
  content      jsonb not null default '{}',  -- conteúdo estruturado (snapshot dos dados no momento)
  period_start date,
  period_end   date,
  version      int not null default 1,
  status       report_status not null default 'draft',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists reports_patient_idx on reports (patient_id, created_at desc);
alter table reports enable row level security;

drop policy if exists "médico gerencia relatórios da clínica" on reports;
create policy "médico gerencia relatórios da clínica" on reports
  for all using (
    exists (select 1 from patients p where p.id = reports.patient_id and p.doctor_id = auth.uid())
  ) with check (
    exists (select 1 from patients p where p.id = reports.patient_id and p.doctor_id = auth.uid())
  );

-- histórico de versões (cada emissão/edição guarda um snapshot)
create table if not exists report_versions (
  id          uuid primary key default gen_random_uuid(),
  report_id   uuid not null references reports(id) on delete cascade,
  version     int not null,
  status      report_status not null,
  content     jsonb,
  changed_by  uuid references profiles(id),
  changed_at  timestamptz not null default now()
);
alter table report_versions enable row level security;
drop policy if exists "médico vê versões de relatório" on report_versions;
create policy "médico vê versões de relatório" on report_versions
  for select using (
    exists (
      select 1 from reports r join patients p on p.id = r.patient_id
      where r.id = report_versions.report_id and p.doctor_id = auth.uid()
    )
  );

-- salva um relatório (cria ou nova versão) + registra histórico e auditoria
create or replace function save_report(
  p_patient uuid, p_kind text, p_title text, p_content jsonb,
  p_period_start date default null, p_period_end date default null,
  p_status text default 'issued'
) returns uuid language plpgsql security definer set search_path = public as $$
declare
  doc uuid;
  rid uuid;
  v int;
begin
  select doctor_id into doc from patients where id = p_patient;
  if doc is null then raise exception 'paciente sem médico'; end if;

  insert into reports (patient_id, doctor_id, kind, title, content, period_start, period_end, status)
  values (p_patient, doc, p_kind, p_title, p_content, p_period_start, p_period_end, p_status::report_status)
  returning id, version into rid, v;

  insert into report_versions (report_id, version, status, content, changed_by)
  values (rid, v, p_status::report_status, p_content, auth.uid());

  insert into audit_log (actor_id, action, entity, entity_id, patient_id, detail)
  values (auth.uid(), 'generate_report', 'report', rid, p_patient, jsonb_build_object('kind', p_kind));

  return rid;
end; $$;
