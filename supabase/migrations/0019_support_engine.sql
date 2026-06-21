-- ============================================================
-- Mente Viva · SPRINT 3: Support Network Engine
-- Login próprio do cuidador/enfermeiro + RBAC + auditoria
-- ============================================================

-- novas permissões granulares (doc Módulo 3)
alter table support_network add column if not exists can_confirm_dose boolean not null default false;
alter table support_network add column if not exists access_code text;  -- código de 1º acesso do cuidador

-- a relação ganha mais tipos (responsável legal, profissionais)
-- (o enum support_relationship já existe; adicionamos valores se faltarem)
-- nota: rodar em arquivo separado se der erro de transação

-- ------------------------------------------------------------
-- Função: médico gera acesso para um membro da rede.
-- Cria um código que o cuidador usará no 1º login (telefone = senha).
-- ------------------------------------------------------------
create or replace function grant_member_access(p_member uuid)
returns text language plpgsql security definer set search_path = public as $$
declare
  code text;
begin
  -- código curto baseado no id
  code := upper(substr(replace(p_member::text, '-', ''), 1, 6));
  update support_network set access_code = code where id = p_member;
  return code;
end; $$;

-- ------------------------------------------------------------
-- RLS: membro com login vê os dados do paciente conforme permissões
-- ------------------------------------------------------------
-- doses: cuidador com permissão vê e confirma
drop policy if exists "rede vê doses com permissão" on doses;
create policy "rede vê doses com permissão" on doses
  for select using (
    exists (
      select 1 from support_network sn
      where sn.patient_id = doses.patient_id
        and sn.member_id = auth.uid()
        and sn.can_view_schedule
    )
  );
drop policy if exists "rede confirma doses com permissão" on doses;
create policy "rede confirma doses com permissão" on doses
  for update using (
    exists (
      select 1 from support_network sn
      where sn.patient_id = doses.patient_id
        and sn.member_id = auth.uid()
        and sn.can_confirm_dose
    )
  );

-- medications: cuidador com permissão de ver agenda vê os medicamentos
drop policy if exists "rede vê medicamentos com permissão" on medications;
create policy "rede vê medicamentos com permissão" on medications
  for select using (
    exists (
      select 1 from support_network sn
      where sn.patient_id = medications.patient_id
        and sn.member_id = auth.uid()
        and sn.can_view_schedule
    )
  );

-- lista os pacientes que um membro (cuidador) acompanha
create or replace function my_care_patients()
returns table (patient_id uuid, patient_name text, can_confirm boolean, can_register boolean)
language sql security definer stable set search_path = public as $$
  select sn.patient_id, pr.full_name, sn.can_confirm_dose, sn.can_register_events
  from support_network sn
  join profiles pr on pr.id = sn.patient_id
  where sn.member_id = auth.uid();
$$;
