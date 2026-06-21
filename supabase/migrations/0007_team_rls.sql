-- ============================================================
-- Mente Viva · RLS — camada de equipe
-- A equipe acessa pacientes da clínica conforme permissões granulares.
-- "view_clinical" controla acesso a checkins/anotações sensíveis.
-- "view_adherence" controla doses/adesão.
-- ============================================================

alter table team_members     enable row level security;
alter table team_permissions enable row level security;
alter table doctors          enable row level security; -- já estava, reforço

-- ---------- TEAM_MEMBERS ----------
-- o médico dono gerencia sua equipe; o membro vê o próprio registro
create policy "dono gerencia equipe" on team_members
  for all using (owner_doctor_id = auth.uid()) with check (owner_doctor_id = auth.uid());
create policy "membro vê seu vínculo" on team_members
  for select using (member_id = auth.uid());
-- aceite de convite por token é feito via Edge/Action com service_role

-- ---------- TEAM_PERMISSIONS ----------
create policy "dono gerencia permissões" on team_permissions
  for all using (
    exists (select 1 from team_members tm
            where tm.id = member_row_id and tm.owner_doctor_id = auth.uid())
  ) with check (
    exists (select 1 from team_members tm
            where tm.id = member_row_id and tm.owner_doctor_id = auth.uid())
  );
create policy "membro vê suas permissões" on team_permissions
  for select using (
    exists (select 1 from team_members tm
            where tm.id = member_row_id and tm.member_id = auth.uid())
  );

-- ---------- PATIENTS: estender acesso à equipe ----------
create policy "equipe vê pacientes da clínica" on patients
  for select using (in_my_clinic(id) and has_perm('view_adherence'));
create policy "equipe com permissão gerencia pacientes" on patients
  for update using (in_my_clinic(id) and has_perm('manage_patients'));

-- ---------- DOSES: equipe com view_adherence ----------
create policy "equipe vê doses da clínica" on doses
  for select using (in_my_clinic(patient_id) and has_perm('view_adherence'));

-- ---------- CHECKINS: SÓ quem tem view_clinical ----------
create policy "equipe clínica vê checkins" on checkins
  for select using (in_my_clinic(patient_id) and has_perm('view_clinical'));

-- ---------- MEDICATIONS: equipe ----------
create policy "equipe vê medicamentos da clínica" on medications
  for select using (in_my_clinic(patient_id) and has_perm('view_adherence'));
create policy "equipe gerencia prescrições" on medications
  for all using (in_my_clinic(patient_id) and has_perm('manage_medications'))
  with check (in_my_clinic(patient_id) and has_perm('manage_medications'));

-- ---------- PATIENT_MODULES: equipe com manage_modules ----------
create policy "equipe gerencia módulos" on patient_modules
  for all using (in_my_clinic(patient_id) and has_perm('manage_modules'))
  with check (in_my_clinic(patient_id) and has_perm('manage_modules'));
