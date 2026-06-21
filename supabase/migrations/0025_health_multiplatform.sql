-- ============================================================
-- Mente Viva · FASE 2: Saúde Conectada multiplataforma
-- Amplia a estrutura (antes só Apple) para Android / Health Connect.
-- A tabela health_signals já é agnóstica; aqui generalizamos o
-- consentimento e registramos a plataforma de origem.
-- ============================================================

-- consentimento agnóstico de plataforma (mantém o healthkit_consent por compat)
alter table patients add column if not exists health_consent boolean not null default false;
alter table patients add column if not exists health_consent_at timestamptz;
alter table patients add column if not exists health_platform text;  -- 'apple_health' | 'health_connect'

-- migra o consentimento antigo da Apple para o novo campo agnóstico
update patients
   set health_consent = healthkit_consent,
       health_consent_at = healthkit_consent_at,
       health_platform = case when healthkit_consent then 'apple_health' else null end
 where healthkit_consent = true and health_consent = false;

-- registra a plataforma de origem em cada sinal (além da source)
-- 'ios' (HealthKit) | 'android' (Health Connect) | 'web' | 'manual'
alter table health_signals add column if not exists platform text;

-- ------------------------------------------------------------
-- Função de ingestão multiplataforma (substitui a anterior).
-- O app (iOS OU Android) chama isto; informa a plataforma.
-- Usa o consentimento agnóstico.
-- ------------------------------------------------------------
create or replace function ingest_health_signals(p_signals jsonb, p_platform text default 'unknown')
returns int language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  consent boolean;
  cnt int := 0;
  rec jsonb;
begin
  -- aceita o consentimento novo (agnóstico) ou o antigo (Apple), por compat
  select (health_consent or healthkit_consent) into consent from patients where id = uid;
  if not coalesce(consent, false) then
    raise exception 'sem consentimento de saúde conectada';
  end if;

  for rec in select * from jsonb_array_elements(p_signals) loop
    insert into health_signals (patient_id, metric, value, unit, measured_at, source, platform)
    values (
      uid,
      (rec->>'metric')::health_metric,
      (rec->>'value')::numeric,
      rec->>'unit',
      coalesce((rec->>'measured_at')::timestamptz, now()),
      coalesce(rec->>'source', case when p_platform = 'android' then 'health_connect' else 'healthkit' end),
      p_platform
    );
    cnt := cnt + 1;
  end loop;
  return cnt;
end; $$;

-- função para o paciente registrar consentimento informando a plataforma
create or replace function set_health_consent(p_consent boolean, p_platform text default null)
returns void language sql security definer set search_path = public as $$
  update patients set
    health_consent = p_consent,
    health_consent_at = case when p_consent then now() else null end,
    health_platform = case when p_consent then p_platform else null end,
    -- mantém o campo antigo em sincronia quando for Apple
    healthkit_consent = case when p_platform = 'apple_health' then p_consent else healthkit_consent end
  where id = auth.uid();
$$;
