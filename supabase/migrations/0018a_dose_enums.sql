-- ============================================================
-- Mente Viva · RODAR PRIMEIRO E SOZINHO (antes do 0018)
-- Novos valores de status de dose. Postgres exige commit
-- do enum antes de usá-lo em funções.
-- ============================================================
do $$ begin
  begin alter type dose_status add value if not exists 'refused'; exception when others then null; end;
  begin alter type dose_status add value if not exists 'late'; exception when others then null; end;
  begin alter type dose_status add value if not exists 'given_by_caregiver'; exception when others then null; end;
  begin alter type dose_status add value if not exists 'given_by_nurse'; exception when others then null; end;
end $$;
