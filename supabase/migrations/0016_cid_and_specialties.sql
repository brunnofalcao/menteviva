-- ============================================================
-- Mente Viva · CID + Especialidades/RQE do médico
-- Como gestor de clínica: diagnóstico padronizado (CID) e
-- registro profissional correto (especialidade + RQE).
-- ============================================================

-- ------------------------------------------------------------
-- 1) TABELA CID (catálogo de diagnósticos)
--    Foco: capítulos F (mentais) e G (neurológicos) do CID-10,
--    que cobrem psiquiatria e geriatria. version = '10' | '11'.
-- ------------------------------------------------------------
create table if not exists cid_catalog (
  code        text primary key,
  description text not null,
  chapter     text,            -- 'F' | 'G' etc
  version     text not null default '10'
);
-- busca por código ou descrição (índice de texto)
create index if not exists cid_desc_idx on cid_catalog using gin (to_tsvector('portuguese', description));
create index if not exists cid_code_idx on cid_catalog (code);

-- catálogo é leitura pública (qualquer médico autenticado busca)
alter table cid_catalog enable row level security;
drop policy if exists "cid leitura autenticada" on cid_catalog;
create policy "cid leitura autenticada" on cid_catalog for select using (auth.role() = 'authenticated');

-- ------------------------------------------------------------
-- 2) DIAGNÓSTICO do paciente passa a guardar o código CID
-- ------------------------------------------------------------
alter table patients add column if not exists cid_code text;
alter table patients add column if not exists cid_version text default '10';

-- atualiza set_diagnosis para aceitar o código CID
create or replace function set_diagnosis(p_patient uuid, p_text text, p_cid text default null, p_version text default '10')
returns void language sql security definer set search_path = public as $$
  update patients set
    diagnosis_label = nullif(trim(p_text), ''),
    cid_code = nullif(trim(p_cid), ''),
    cid_version = coalesce(nullif(trim(p_version), ''), '10')
  where id = p_patient;
$$;

-- ------------------------------------------------------------
-- 3) ESPECIALIDADES + RQE do médico (múltiplas)
--    Um médico pode ter várias especialidades, cada uma com RQE.
-- ------------------------------------------------------------
create table if not exists doctor_specialties (
  id          uuid primary key default gen_random_uuid(),
  doctor_id   uuid not null references doctors(id) on delete cascade,
  profession  text not null default 'Médico',
  specialty   text not null,
  rqe         text,
  created_at  timestamptz not null default now()
);
create index if not exists doc_spec_idx on doctor_specialties (doctor_id);
alter table doctor_specialties enable row level security;
drop policy if exists "médico gerencia suas especialidades" on doctor_specialties;
create policy "médico gerencia suas especialidades" on doctor_specialties
  for all using (doctor_id = auth.uid()) with check (doctor_id = auth.uid());
-- paciente pode ler as especialidades do médico dele (para relatórios/cabeçalho)
drop policy if exists "paciente lê especialidades do seu médico" on doctor_specialties;
create policy "paciente lê especialidades do seu médico" on doctor_specialties
  for select using (
    exists (select 1 from patients p where p.id = auth.uid() and p.doctor_id = doctor_specialties.doctor_id)
  );
