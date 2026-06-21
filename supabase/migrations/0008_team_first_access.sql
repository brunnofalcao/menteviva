-- ============================================================
-- Mente Viva · Primeiro acesso da equipe (sem e-mail de convite)
-- O médico cadastra o e-mail. A pessoa cria a senha no 1º acesso.
-- ============================================================

-- token deixa de ser necessário (mantido nullable para compatibilidade)
alter table team_members alter column invite_token drop not null;

-- Verifica se um e-mail está autorizado como membro pendente.
-- Usado na tela de primeiro acesso ANTES de criar a conta (não expõe dados).
create or replace function team_email_status(p_email text)
returns table (exists_pending boolean, full_name text, role team_role)
language sql security definer stable set search_path = public as $$
  select true, tm.full_name, tm.role
  from team_members tm
  where lower(tm.email) = lower(p_email)
    and tm.member_id is null          -- ainda não vinculado
  limit 1;
$$;

-- Vincula a conta recém-criada ao registro de membro correspondente ao e-mail.
-- Chamado logo após o signUp, já autenticado como o novo usuário.
create or replace function claim_team_membership()
returns boolean language plpgsql security definer set search_path = public as $$
declare
  uemail text;
  rows   int;
begin
  select email into uemail from auth.users where id = auth.uid();
  if uemail is null then return false; end if;

  update team_members
     set member_id = auth.uid(),
         accepted_at = now()
   where lower(email) = lower(uemail)
     and member_id is null;

  get diagnostics rows = row_count;

  -- garante que o profile do membro tenha role 'doctor' lógico? Não:
  -- membros têm profile.role = 'patient' por default do signup, mas o acesso
  -- ao /medico é concedido por team_members (o middleware checa isso).
  return rows > 0;
end; $$;

-- Permitir execução das RPCs pelos papéis anon/authenticated.
grant execute on function team_email_status(text) to anon, authenticated;
grant execute on function claim_team_membership() to authenticated;
