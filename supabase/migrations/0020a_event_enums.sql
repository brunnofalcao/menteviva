-- ============================================================
-- Mente Viva · RODAR PRIMEIRO E SOZINHO (antes do 0020)
-- Novos tipos de evento clínico (psiquiatria + geriatria completos)
-- ============================================================
do $$ begin
  -- psiquiatria
  begin alter type event_type add value if not exists 'suicidal_ideation'; exception when others then null; end;
  begin alter type event_type add value if not exists 'self_harm'; exception when others then null; end;
  begin alter type event_type add value if not exists 'aggression'; exception when others then null; end;
  begin alter type event_type add value if not exists 'agitation'; exception when others then null; end;
  begin alter type event_type add value if not exists 'alcohol_relapse'; exception when others then null; end;
  begin alter type event_type add value if not exists 'drug_relapse'; exception when others then null; end;
  begin alter type event_type add value if not exists 'medication_abandonment'; exception when others then null; end;
  begin alter type event_type add value if not exists 'side_effect'; exception when others then null; end;
  -- geriatria
  begin alter type event_type add value if not exists 'near_fall'; exception when others then null; end;
  begin alter type event_type add value if not exists 'delirium_suspected'; exception when others then null; end;
  begin alter type event_type add value if not exists 'weight_loss'; exception when others then null; end;
  begin alter type event_type add value if not exists 'food_refusal'; exception when others then null; end;
  begin alter type event_type add value if not exists 'constipation'; exception when others then null; end;
  begin alter type event_type add value if not exists 'dehydration_suspected'; exception when others then null; end;
  begin alter type event_type add value if not exists 'infection_suspected'; exception when others then null; end;
  begin alter type event_type add value if not exists 'functional_decline'; exception when others then null; end;
end $$;
