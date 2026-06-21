-- ============================================================
-- Mente Viva · Contrato (sem gateway) + Equipe & Permissões
-- ============================================================

-- ------------------------------------------------------------
-- 1) Status de conta do médico (pagamento por contrato, fora do app)
--    O sistema só precisa saber se a conta está ativa.
-- ------------------------------------------------------------
create type account_status as enum ('active', 'suspended', 'trial');

alter table doctors add column if not exists status account_status not null default 'trial';
alter table doctors add column if not exists status_note text;          -- ex.: "Contrato até 12/2026"
alter table doctors add column if not exists contract_until date;

-- ------------------------------------------------------------
-- 2) Papéis de equipe
-- ------------------------------------------------------------
create type team_role as enum ('doctor', 'secretary', 'nurse', 'reception', 'clinic_admin');

-- Categorias de permissão (o médico marca o que cada membro acessa)
create type perm_category as enum (
  'view_clinical',      -- ver dados clínicos sensíveis (humor, sono, efeitos, anotações)
  'view_adherence',     -- ver adesão e doses (menos sensível)
  'manage_patients',    -- cadastrar/convidar/editar pacientes
  'manage_medications', -- prescrever/editar medicamentos
  'manage_modules',     -- configurar módulos e protocolos
  'manage_reminders',   -- configurar avisos e canais
  'manage_brand',       -- editar marca/whitelabel
  'manage_team'         -- convidar/gerenciar a própria equipe
);

-- ------------------------------------------------------------
-- 3) Membros da equipe (vinculados a um médico/clínica "dono")
--    owner_doctor_id = a conta-mãe. O próprio médico também é um member (role=doctor, todas perms).
-- ------------------------------------------------------------
create table team_members (
  id              uuid primary key default gen_random_uuid(),
  owner_doctor_id uuid not null references doctors(id) on delete cascade,
  member_id       uuid references profiles(id) on delete cascade,  -- null enquanto convite pendente
  role            team_role not null,
  full_name       text not null,
  email           text not null,
  invite_token    text unique,            -- usado no aceite do convite
  accepted_at     timestamptz,
  created_at      timestamptz not null default now(),
  unique (owner_doctor_id, email)
);
create index on team_members (member_id);
create index on team_members (owner_doctor_id);
create index on team_members (invite_token);

-- ------------------------------------------------------------
-- 4) Permissões concedidas a cada membro (granular por categoria)
-- ------------------------------------------------------------
create table team_permissions (
  member_row_id uuid not null references team_members(id) on delete cascade,
  category      perm_category not null,
  granted       boolean not null default false,
  primary key (member_row_id, category)
);

-- ------------------------------------------------------------
-- 5) Helpers de autorização
-- ------------------------------------------------------------

-- A qual médico/clínica este usuário (logado) pertence?
-- Para o próprio médico, retorna o próprio id. Para um membro, o owner_doctor_id.
create or replace function my_owner_doctor()
returns uuid language sql security definer stable set search_path = public as $$
  select coalesce(
    (select id from doctors where id = auth.uid()),               -- é o médico dono
    (select owner_doctor_id from team_members
       where member_id = auth.uid() and accepted_at is not null
       limit 1)                                                   -- é membro da equipe
  );
$$;

-- O usuário logado tem a permissão X?  (o médico dono tem todas)
create or replace function has_perm(p_category perm_category)
returns boolean language sql security definer stable set search_path = public as $$
  select
    case
      when exists (select 1 from doctors where id = auth.uid()) then true  -- dono = full
      else exists (
        select 1 from team_members tm
        join team_permissions tp on tp.member_row_id = tm.id
        where tm.member_id = auth.uid()
          and tm.accepted_at is not null
          and tp.category = p_category
          and tp.granted
      )
    end;
$$;

-- Este paciente pertence à minha clínica (médico dono ou equipe)?
create or replace function in_my_clinic(p_patient uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from patients
    where id = p_patient and doctor_id = my_owner_doctor()
  );
$$;
