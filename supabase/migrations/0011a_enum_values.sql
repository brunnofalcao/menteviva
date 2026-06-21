-- ============================================================
-- Mente Viva · RODAR PRIMEIRO E SOZINHO (antes do 0011)
-- Postgres exige que novos valores de enum sejam commitados
-- antes de serem usados. Rode este bloco, depois o 0011.
-- ============================================================
alter type checkin_module add value if not exists 'anxiety';
alter type checkin_module add value if not exists 'appetite';
alter type checkin_module add value if not exists 'irritability';
