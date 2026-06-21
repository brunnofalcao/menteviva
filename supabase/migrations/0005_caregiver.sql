-- ============================================================
-- Mente Viva · Caregiver alert
-- Detecta pacientes que faltaram N doses seguidas e cujo familiar
-- (caregiver_phone) deve ser avisado. Consumido pela Edge Function.
-- ============================================================

create or replace function patients_needing_caregiver_alert()
returns table (
  patient_id      uuid,
  patient_name    text,
  caregiver_phone text,
  consecutive_missed bigint
) language sql security definer stable set search_path = public as $$
  with recent as (
    select d.patient_id,
           count(*) filter (where d.status = 'skipped') as missed
    from doses d
    join patients p on p.id = d.patient_id
    where p.caregiver_phone is not null
      and d.scheduled_at >= now() - interval '3 days'
      and d.scheduled_at < now()
    group by d.patient_id
  )
  select r.patient_id, pr.full_name, p.caregiver_phone, r.missed
  from recent r
  join patients p  on p.id = r.patient_id
  join profiles pr on pr.id = r.patient_id
  where r.missed >= p.caregiver_alert_after;
$$;

-- Marca para não reavisar o mesmo familiar repetidamente no mesmo dia.
create table if not exists caregiver_alerts_log (
  patient_id uuid not null references patients(id) on delete cascade,
  alerted_on date not null default current_date,
  primary key (patient_id, alerted_on)
);
alter table caregiver_alerts_log enable row level security;
create policy "médico vê alerts dos seus pacientes" on caregiver_alerts_log
  for select using (is_my_patient(patient_id));
