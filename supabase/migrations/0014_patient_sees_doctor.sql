-- ============================================================
-- Mente Viva · Paciente pode ver o nome do seu médico
-- (necessário para a tela "Minha rede" no app do paciente)
-- ============================================================

-- paciente lê o profile do médico responsável por ele
drop policy if exists "paciente vê profile do seu médico" on profiles;
create policy "paciente vê profile do seu médico" on profiles
  for select using (
    exists (
      select 1 from patients p
      where p.id = auth.uid() and p.doctor_id = profiles.id
    )
  );

-- paciente lê dados de marca do médico responsável
drop policy if exists "paciente vê marca do seu médico" on doctors;
create policy "paciente vê marca do seu médico" on doctors
  for select using (
    exists (
      select 1 from patients p
      where p.id = auth.uid() and p.doctor_id = doctors.id
    )
  );
