-- ============================================================
-- Mente Viva · Funções de domínio (lógica clínica no banco)
-- ============================================================

-- ------------------------------------------------------------
-- 1) Gerar as doses de um medicamento para os próximos N dias
--    Chamada quando o medicamento é criado/editado.
-- ------------------------------------------------------------
create or replace function generate_doses(p_medication uuid, p_days int default 14)
returns void language plpgsql security definer set search_path = public as $$
declare
  med   medications%rowtype;
  d     int;
  t     text;
  ts    timestamptz;
begin
  select * into med from medications where id = p_medication;
  if not found or not med.active then return; end if;

  for d in 0..(p_days - 1) loop
    -- frequência: daily todo dia; alternate dia sim/dia não; weekly só no dia 0,7,14...
    if med.frequency = 'alternate' and (d % 2) <> 0 then continue; end if;
    if med.frequency = 'weekly'    and (d % 7) <> 0 then continue; end if;
    if med.frequency = 'as_needed' then return; end if;  -- S.O.S. não agenda

    foreach t in array med.times loop
      ts := ((current_date + d) || ' ' || t)::timestamptz;
      -- evita duplicar dose já existente no mesmo horário
      insert into doses (medication_id, patient_id, scheduled_at)
      select med.id, med.patient_id, ts
      where not exists (
        select 1 from doses
        where medication_id = med.id and scheduled_at = ts
      );
    end loop;
  end loop;
end; $$;

-- Trigger: ao inserir medicamento ativo, já gera as doses
create or replace function on_medication_insert()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.active then perform generate_doses(new.id, 14); end if;
  return new;
end; $$;

create trigger trg_medication_doses
  after insert on medications
  for each row execute function on_medication_insert();

-- ------------------------------------------------------------
-- 2) Aplicar protocolo de módulos por diagnóstico
--    O médico escolhe um diagnóstico -> ativa o conjunto certo.
-- ------------------------------------------------------------
create or replace function apply_protocol(p_patient uuid, p_protocol text)
returns void language plpgsql security definer set search_path = public as $$
declare
  mods checkin_module[];
  m    checkin_module;
  all_mods checkin_module[] := array['mood','sleep','side_effects','energy','activity','hydration','free_note']::checkin_module[];
begin
  mods := case lower(p_protocol)
    when 'depressão'         then array['mood','sleep','side_effects','energy','activity','free_note']
    when 'depressao'         then array['mood','sleep','side_effects','energy','activity','free_note']
    when 'transtorno bipolar' then array['mood','sleep','side_effects','energy','activity']
    when 'ansiedade'         then array['mood','sleep','side_effects','free_note']
    when 'tdah'              then array['mood','side_effects','energy','activity']
    else all_mods  -- personalizado = tudo, médico ajusta na mão
  end::checkin_module[];

  -- upsert: liga os do protocolo, desliga o resto
  foreach m in array all_mods loop
    insert into patient_modules (patient_id, module, enabled)
    values (p_patient, m, m = any(mods))
    on conflict (patient_id, module)
    do update set enabled = (excluded.module = any(mods));
  end loop;

  update patients set diagnosis_label = p_protocol where id = p_patient;
end; $$;

-- ------------------------------------------------------------
-- 3) Adesão dos últimos N dias (%)  — usada no painel e no app
-- ------------------------------------------------------------
create or replace function adherence_rate(p_patient uuid, p_days int default 30)
returns numeric language sql security definer stable set search_path = public as $$
  select coalesce(
    round(
      100.0 * count(*) filter (where status = 'taken')
      / nullif(count(*) filter (where scheduled_at < now()), 0)
    , 0), 0)
  from doses
  where patient_id = p_patient
    and scheduled_at >= now() - (p_days || ' days')::interval;
$$;

-- ------------------------------------------------------------
-- 4) Pacientes em risco de abandono (para o dashboard do médico)
--    Heurística: faltou >=3 doses nos últimos 7 dias OU registrou "ran_out".
-- ------------------------------------------------------------
create or replace function patients_at_risk(p_doctor uuid)
returns table (
  patient_id uuid,
  full_name  text,
  missed_7d  bigint,
  ran_out    boolean,
  adherence  numeric
) language sql security definer stable set search_path = public as $$
  select p.id,
         pr.full_name,
         count(d.*) filter (where d.status='skipped' and d.scheduled_at >= now() - interval '7 days'),
         bool_or(d.skip_reason = 'ran_out' and d.acted_at >= now() - interval '7 days'),
         adherence_rate(p.id, 30)
  from patients p
  join profiles pr on pr.id = p.id
  left join doses d on d.patient_id = p.id
  where p.doctor_id = p_doctor
  group by p.id, pr.full_name
  having count(d.*) filter (where d.status='skipped' and d.scheduled_at >= now() - interval '7 days') >= 3
      or bool_or(d.skip_reason = 'ran_out' and d.acted_at >= now() - interval '7 days');
$$;
