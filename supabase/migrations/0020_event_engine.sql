-- ============================================================
-- Mente Viva · SPRINT 4: Clinical Event Engine
-- Eventos completos de Psiquiatria e Geriatria + status do evento
-- ============================================================

-- status do evento (novo, visto, em acompanhamento, resolvido) — doc Módulo 4
do $$ begin
  if not exists (select 1 from pg_type where typname = 'event_status') then
    create type event_status as enum ('new','seen','monitoring','resolved');
  end if;
end $$;
alter table patient_events add column if not exists status event_status not null default 'new';
alter table patient_events add column if not exists generated_alert boolean not null default false;
alter table patient_events add column if not exists in_report boolean not null default false;

-- marca um evento como visto/em acompanhamento/resolvido (médico)
create or replace function set_event_status(p_event uuid, p_status text)
returns void language sql security definer set search_path = public as $$
  update patient_events set status = p_status::event_status where id = p_event;
$$;
