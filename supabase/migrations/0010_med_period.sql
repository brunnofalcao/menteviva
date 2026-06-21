-- ============================================================
-- Mente Viva · Medicamento com período (contínuo OU até data X)
-- ends_at NULL = contínuo. Com data = para de gerar doses depois dela.
-- ============================================================

alter table medications add column if not exists ends_at date;

-- A geração de doses passa a respeitar ends_at.
-- Recria generate_doses considerando o término.
create or replace function generate_doses(p_med uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  med record;
  d date;
  t text;
  horizon int := 14; -- gera doses para os próximos 14 dias
  last_day date;
begin
  select * into med from medications where id = p_med;
  if med is null or not med.active then return; end if;

  last_day := least(
    current_date + horizon,
    coalesce(med.ends_at, current_date + horizon)
  );

  d := current_date;
  while d <= last_day loop
    -- frequência: daily todos os dias; alternate dias sim/dias não; weekly 1x/semana
    if med.frequency = 'daily'
       or (med.frequency = 'alternate' and ((d - current_date) % 2 = 0))
       or (med.frequency = 'weekly' and extract(dow from d) = extract(dow from current_date))
       or med.frequency = 'as_needed'
    then
      if med.frequency <> 'as_needed' then
        foreach t in array med.times loop
          insert into doses (patient_id, medication_id, scheduled_at, status)
          values (
            med.patient_id, med.id,
            (d::text || ' ' || t)::timestamptz, 'pending'
          )
          on conflict do nothing;
        end loop;
      end if;
    end if;
    d := d + 1;
  end loop;
end; $$;
