-- ============================================================
-- Mente Viva · Cadastro de paciente pelo médico (CPF + WhatsApp)
-- Login do paciente = CPF · senha = telefone
-- ============================================================

-- Campos de identificação do paciente
alter table patients add column if not exists cpf text;
alter table patients add column if not exists phone text;
create unique index if not exists patients_cpf_key on patients (cpf) where cpf is not null;

-- Guarda quem o médico pré-cadastrou ANTES do paciente existir no Auth.
-- O usuário do Auth é criado no primeiro acesso (via Edge Function), então
-- aqui registramos a "ficha" do paciente aguardando ativação.
create table if not exists patient_invites (
  id          uuid primary key default gen_random_uuid(),
  doctor_id   uuid not null references doctors(id) on delete cascade,
  full_name   text not null,
  cpf         text not null,
  phone       text not null,
  diagnosis_label text,
  created_at  timestamptz not null default now(),
  activated_at timestamptz,
  unique (cpf)
);
alter table patient_invites enable row level security;

-- só o médico dono vê/gerencia seus pré-cadastros
create policy "médico gerencia seus convites de paciente" on patient_invites
  for all using (doctor_id = my_owner_doctor())
  with check (doctor_id = my_owner_doctor());

-- limpa só dígitos do CPF/telefone
create or replace function only_digits(t text)
returns text language sql immutable as $$
  select regexp_replace(coalesce(t,''), '\D', '', 'g');
$$;

-- Médico cadastra um paciente (cria a ficha de convite).
create or replace function create_patient_invite(
  p_full_name text, p_cpf text, p_phone text, p_diagnosis text default null
) returns uuid language plpgsql security definer set search_path = public as $$
declare
  doc uuid := my_owner_doctor();
  cpf_clean text := only_digits(p_cpf);
  phone_clean text := only_digits(p_phone);
  new_id uuid;
begin
  if doc is null then raise exception 'sem médico/clínica no contexto'; end if;
  if length(cpf_clean) < 11 then raise exception 'CPF inválido'; end if;

  insert into patient_invites (doctor_id, full_name, cpf, phone, diagnosis_label)
  values (doc, p_full_name, cpf_clean, phone_clean, p_diagnosis)
  on conflict (cpf) do update set
    full_name = excluded.full_name,
    phone = excluded.phone,
    diagnosis_label = excluded.diagnosis_label
  returning id into new_id;

  return new_id;
end; $$;

-- Lista pré-cadastros + pacientes ativos do médico (para o painel)
create or replace function list_patient_invites()
returns table (
  cpf text, full_name text, phone text, diagnosis_label text, activated boolean
) language sql security definer stable set search_path = public as $$
  select i.cpf, i.full_name, i.phone, i.diagnosis_label, (i.activated_at is not null)
  from patient_invites i
  where i.doctor_id = my_owner_doctor()
  order by i.created_at desc;
$$;
