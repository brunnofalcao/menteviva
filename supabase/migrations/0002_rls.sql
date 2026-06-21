-- ============================================================
-- Mente Viva · Row Level Security
-- Princípio: paciente acessa só os próprios dados.
--            médico acessa só os dados dos pacientes vinculados a ele.
-- ============================================================

alter table profiles            enable row level security;
alter table doctors             enable row level security;
alter table patients            enable row level security;
alter table patient_modules     enable row level security;
alter table medications         enable row level security;
alter table doses               enable row level security;
alter table checkins            enable row level security;
alter table reminders           enable row level security;
alter table push_subscriptions  enable row level security;

-- ---------- Helpers ----------
-- É médico deste paciente?
create or replace function is_my_patient(p_patient uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from patients
    where id = p_patient and doctor_id = auth.uid()
  );
$$;

-- ---------- PROFILES ----------
create policy "ver próprio perfil" on profiles
  for select using (id = auth.uid());
create policy "médico vê perfis dos seus pacientes" on profiles
  for select using (is_my_patient(id));
create policy "atualizar próprio perfil" on profiles
  for update using (id = auth.uid());

-- ---------- DOCTORS ----------
create policy "médico vê/edita a si" on doctors
  for all using (id = auth.uid()) with check (id = auth.uid());
-- invite_code precisa ser legível no onboarding (antes do vínculo):
create policy "invite code é público p/ validar vínculo" on doctors
  for select using (true);

-- ---------- PATIENTS ----------
create policy "paciente vê a si" on patients
  for select using (id = auth.uid());
create policy "paciente edita a si" on patients
  for update using (id = auth.uid());
create policy "paciente cria vínculo no onboarding" on patients
  for insert with check (id = auth.uid());
create policy "médico vê seus pacientes" on patients
  for select using (doctor_id = auth.uid());
create policy "médico edita seus pacientes" on patients
  for update using (doctor_id = auth.uid());

-- ---------- PATIENT_MODULES ----------
create policy "paciente lê seus módulos" on patient_modules
  for select using (patient_id = auth.uid());
create policy "médico gerencia módulos do seu paciente" on patient_modules
  for all using (is_my_patient(patient_id)) with check (is_my_patient(patient_id));

-- ---------- MEDICATIONS ----------
create policy "paciente lê seus medicamentos" on medications
  for select using (patient_id = auth.uid());
create policy "paciente adiciona os próprios" on medications
  for insert with check (patient_id = auth.uid() and source = 'patient');
create policy "paciente edita os próprios (source=patient)" on medications
  for update using (patient_id = auth.uid() and source = 'patient');
create policy "médico lê medicamentos do seu paciente" on medications
  for select using (is_my_patient(patient_id));
create policy "médico prescreve p/ seu paciente" on medications
  for insert with check (is_my_patient(patient_id) and source = 'doctor');
create policy "médico edita prescrições" on medications
  for update using (is_my_patient(patient_id) and source = 'doctor');

-- ---------- DOSES ----------
create policy "paciente lê suas doses" on doses
  for select using (patient_id = auth.uid());
create policy "paciente confirma suas doses" on doses
  for update using (patient_id = auth.uid());
create policy "médico lê doses do seu paciente" on doses
  for select using (is_my_patient(patient_id));

-- ---------- CHECKINS ----------
create policy "paciente gerencia seus checkins" on checkins
  for all using (patient_id = auth.uid()) with check (patient_id = auth.uid());
create policy "médico lê checkins do seu paciente" on checkins
  for select using (is_my_patient(patient_id));

-- ---------- REMINDERS ----------
create policy "paciente lê seus lembretes" on reminders
  for select using (patient_id = auth.uid());
create policy "médico lê lembretes do seu paciente" on reminders
  for select using (is_my_patient(patient_id));
-- escrita de reminders é feita pela Edge Function (service_role), que ignora RLS.

-- ---------- PUSH_SUBSCRIPTIONS ----------
create policy "paciente gerencia suas subscriptions" on push_subscriptions
  for all using (patient_id = auth.uid()) with check (patient_id = auth.uid());
