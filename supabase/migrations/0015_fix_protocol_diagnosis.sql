-- ============================================================
-- Mente Viva · Conserta protocolo + diagnóstico livre
-- ============================================================

-- 1) apply_protocol reescrito:
--    - inclui TODOS os módulos atuais (anxiety, appetite, irritability)
--    - LIGA os do protocolo, mas NÃO desliga o que já estava ligado
--      (o médico ajusta o resto na mão pelos toggles)
--    - NÃO sobrescreve mais o diagnóstico (agora é campo livre separado)
create or replace function apply_protocol(p_patient uuid, p_protocol text)
returns void language plpgsql security definer set search_path = public as $$
declare
  mods checkin_module[];
  m    checkin_module;
begin
  mods := case lower(p_protocol)
    when 'depressão'          then array['mood','sleep','side_effects','energy','activity','appetite','free_note']
    when 'depressao'          then array['mood','sleep','side_effects','energy','activity','appetite','free_note']
    when 'transtorno bipolar' then array['mood','sleep','side_effects','energy','activity','irritability']
    when 'ansiedade'          then array['mood','sleep','anxiety','side_effects','free_note']
    when 'tdah'               then array['mood','side_effects','energy','activity','irritability']
    when 'geriátrico'         then array['mood','sleep','appetite','side_effects','free_note']
    when 'geriatrico'         then array['mood','sleep','appetite','side_effects','free_note']
    else array['mood','sleep','side_effects','free_note']  -- básico
  end::checkin_module[];

  -- LIGA os módulos do protocolo (não mexe nos que já estão como estão fora da lista)
  foreach m in array mods loop
    insert into patient_modules (patient_id, module, enabled)
    values (p_patient, m, true)
    on conflict (patient_id, module)
    do update set enabled = true;
  end loop;
end; $$;

-- 2) função para setar diagnóstico livre (texto que o médico quiser)
create or replace function set_diagnosis(p_patient uuid, p_text text)
returns void language sql security definer set search_path = public as $$
  update patients set diagnosis_label = nullif(trim(p_text), '') where id = p_patient;
$$;
