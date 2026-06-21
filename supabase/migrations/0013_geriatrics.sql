-- ============================================================
-- Mente Viva · MÓDULO GERIATRIA
-- Peso no check-in + revisão de polifarmácia
-- ============================================================

-- peso registrado no check-in (kg, opcional)
alter table checkins add column if not exists weight_kg numeric;

-- ------------------------------------------------------------
-- Revisão de polifarmácia: conta medicamentos ativos e sinaliza risco.
-- 5+ medicamentos = polifarmácia (definição clínica usual).
-- ------------------------------------------------------------
create or replace function polypharmacy_review(p_patient uuid)
returns table (
  total_meds int,
  is_polypharmacy boolean,
  label text,
  detail text
) language plpgsql security definer stable set search_path = public as $$
declare
  n int;
begin
  select count(*) into n
  from medications
  where patient_id = p_patient and active = true;

  return query select
    n,
    (n >= 5),
    case
      when n >= 5 then ('Polifarmácia: ' || n || ' medicamentos ativos')
      else (n || ' medicamento(s) ativo(s)')
    end::text,
    case
      when n >= 5 then 'Revisar interações e possíveis duplicidades.'
      else 'Dentro do esperado.'
    end::text;
end; $$;

-- ------------------------------------------------------------
-- Tendência de peso (últimos registros) para detectar perda de peso.
-- ------------------------------------------------------------
create or replace function weight_trend(p_patient uuid)
returns table (day date, weight_kg numeric)
language sql security definer stable set search_path = public as $$
  select day, weight_kg from checkins
  where patient_id = p_patient and weight_kg is not null
  order by day desc limit 10;
$$;
