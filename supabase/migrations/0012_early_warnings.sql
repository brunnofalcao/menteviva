-- ============================================================
-- Mente Viva · DETECÇÃO PRECOCE (Early Warning)
-- Analisa padrões dos últimos dias e gera sinais de alerta.
-- Roda sobre dados que já existem (check-ins, doses).
-- ============================================================

create or replace function early_warnings(p_patient uuid)
returns table (
  signal text,     -- identificador
  label text,      -- texto para o médico
  severity text,   -- 'low' | 'medium' | 'high'
  detail text
) language plpgsql security definer stable set search_path = public as $$
declare
  low_sleep_days int;
  low_mood_days int;
  high_anx_days int;
  adh numeric;
  missed_recent int;
begin
  -- 1) Sono piorando: <5h por 3+ dias consecutivos recentes
  select count(*) into low_sleep_days
  from (
    select day, sleep_hours from checkins
    where patient_id = p_patient and day >= current_date - 4
    order by day desc limit 3
  ) q where sleep_hours is not null and sleep_hours < 5;
  if low_sleep_days >= 3 then
    return query select 'sleep_decline'::text, 'Sono ruim há 3 dias seguidos'::text, 'medium'::text, 'Menos de 5h por noite nos últimos registros'::text;
  end if;

  -- 2) Humor deteriorando: mood <= 2 por 3+ dias
  select count(*) into low_mood_days
  from (
    select day, mood from checkins
    where patient_id = p_patient and day >= current_date - 4
    order by day desc limit 3
  ) q where mood is not null and mood <= 2;
  if low_mood_days >= 3 then
    return query select 'mood_decline'::text, 'Humor baixo há 3 dias seguidos'::text, 'high'::text, 'Possível sinal de descompensação'::text;
  end if;

  -- 3) Ansiedade em alta: anxiety >= 4 por 2+ dias
  select count(*) into high_anx_days
  from (
    select day, anxiety from checkins
    where patient_id = p_patient and day >= current_date - 3
    order by day desc limit 2
  ) q where anxiety is not null and anxiety >= 4;
  if high_anx_days >= 2 then
    return query select 'anxiety_spike'::text, 'Ansiedade elevada nos últimos dias'::text, 'medium'::text, 'Picos de ansiedade registrados no check-in'::text;
  end if;

  -- 4) Adesão abaixo do limite (30 dias)
  select adherence_rate(p_patient, 30) into adh;
  if adh < 70 then
    return query select 'low_adherence'::text, ('Adesão em ' || round(adh) || '% (abaixo de 70%)')::text, 'high'::text, 'Risco de abandono do tratamento'::text;
  end if;

  -- 5) Faltas recentes concentradas (48h)
  select count(*) into missed_recent
  from doses
  where patient_id = p_patient and status = 'skipped'
    and scheduled_at >= now() - interval '48 hours';
  if missed_recent >= 2 then
    return query select 'recent_misses'::text, (missed_recent || ' doses perdidas em 48h')::text, 'medium'::text, 'Queda recente de adesão'::text;
  end if;

  return;
end; $$;
