-- ============================================================
-- Mente Viva · SEED de desenvolvimento (NÃO rodar em produção)
-- Cria 1 médico + 2 pacientes com medicamentos, doses e check-ins
-- para ver o sistema populado de imediato.
--
-- PRÉ-REQUISITO: os usuários precisam existir em auth.users.
-- Crie-os no Supabase Studio (Authentication) ou via API e troque
-- os UUIDs abaixo pelos reais. Aqui usamos UUIDs fixos de exemplo.
-- ============================================================

-- >>> Substitua estes UUIDs pelos de auth.users reais <<<
-- Médico:   00000000-0000-0000-0000-0000000000d1
-- Paciente: 00000000-0000-0000-0000-0000000000p1 (Helena)
-- Paciente: 00000000-0000-0000-0000-0000000000p2 (Rafael)

do $$
declare
  doc uuid := '00000000-0000-0000-0000-0000000000d1';
  pa1 uuid := '00000000-0000-0000-0000-0000000000p1';
  pa2 uuid := '00000000-0000-0000-0000-0000000000p2';
  med uuid;
begin
  -- perfis (caso o trigger não tenha criado)
  insert into profiles(id, role, full_name) values
    (doc,'doctor','Dra. Marina Reis'),
    (pa1,'patient','Helena Lima'),
    (pa2,'patient','Rafael Costa')
  on conflict (id) do nothing;

  insert into doctors(id, crm, clinic_name, invite_code, brand_name, brand_accent)
  values (doc,'CRM 00000','Clínica Mente Viva','DR-4827','Mente Viva','#3B7A6B')
  on conflict (id) do nothing;

  insert into patients(id, doctor_id, diagnosis_label, consent_at, caregiver_phone, caregiver_alert_after) values
    (pa1, doc, 'Depressão', now(), null, 3),
    (pa2, doc, 'Transtorno bipolar', now(), '+5511999990000', 3)
  on conflict (id) do nothing;

  -- aplica protocolos
  perform apply_protocol(pa1, 'Depressão');
  perform apply_protocol(pa2, 'Transtorno bipolar');

  -- medicamentos da Helena (prescritos + 1 próprio)
  insert into medications(patient_id, source, name, dose, form, frequency, times, channel, created_by)
  values (pa1,'doctor','Sertralina','50mg','Comprimido','daily','{08:00,21:00}','push',doc)
  returning id into med;
  insert into medications(patient_id, source, name, dose, form, frequency, times, channel, created_by) values
    (pa1,'doctor','Bupropiona','150mg','Comprimido','daily','{08:00}','push',doc),
    (pa1,'patient','Vitamina D','2000UI','Cápsula','daily','{13:00}','push',pa1);

  -- medicamentos do Rafael (com auto-medicação que gera alerta)
  insert into medications(patient_id, source, name, dose, form, frequency, times, channel, created_by) values
    (pa2,'doctor','Sertralina','50mg','Comprimido','daily','{08:00,21:00}','whatsapp',doc),
    (pa2,'doctor','Quetiapina','25mg','Comprimido','daily','{22:00}','push',doc),
    (pa2,'patient','Melatonina','5mg','Comprimido','daily','{22:00}','push',pa2);

  -- simula histórico: Rafael faltando doses da noite + "ran_out"
  update doses set status='skipped', acted_at=scheduled_at, skip_reason='forgot'
  where patient_id=pa2 and scheduled_at::time = '21:00' and scheduled_at < now();
  update doses set status='skipped', acted_at=now(), skip_reason='ran_out'
  where patient_id=pa2 and scheduled_at::time='22:00'
    and scheduled_at between now()-interval '1 day' and now();

  -- Helena com boa adesão
  update doses set status='taken', acted_at=scheduled_at
  where patient_id=pa1 and scheduled_at < now() and random() < 0.87;

  -- check-ins
  insert into checkins(patient_id, day, mood, energy, sleep_hours, activity, side_effects, free_note) values
    (pa1, current_date,        4, 4, 7.5, 'moved', '{}', 'Dia tranquilo'),
    (pa1, current_date-1,      3, 3, 6.5, 'moved', '{enjoo}', null),
    (pa2, current_date,        2, 2, 5.0, 'still', '{enjoo,insônia}', 'Semana difícil no trabalho'),
    (pa2, current_date-1,      2, 1, 4.5, 'still', '{enjoo}', null)
  on conflict (patient_id, day) do nothing;
end $$;
