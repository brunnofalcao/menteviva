# Mente Viva

App de acompanhamento de medicação psiquiátrica. **Whitelabel**: o paciente usa grátis; o médico que prescreve paga e leva sua própria marca.

Stack: **Next.js (App Router) na Vercel** · **Supabase** (Postgres + Auth + RLS + Edge Functions) · **Web Push** + **WhatsApp Cloud API**. PWA instalável.

---

## Por que um repo só, rotas por role

Paciente e médico vivem no mesmo projeto, separados por rota e por RLS:

- `/app/*` → app do paciente (mobile-first, PWA)
- `/medico/*` → painel do médico (desktop)

O `middleware.ts` lê o `role` do perfil e redireciona quem entra no lado errado. Um deploy, um schema, um sistema de auth. Para um time pequeno é o que tem melhor relação esforço/controle — e o RLS garante que, mesmo na mesma base, ninguém vê o que não é seu. Migrar o painel para um app separado depois é trivial (mesma API).

---

## O modelo de dados, em uma frase

O **sinal primário** é a confirmação de dose. Cada `dose` que o paciente confirma/pula (com motivo) vira leitura clínica no painel do médico. `skip_reason = 'ran_out'` é tratado como **abandono por acesso** (não por esquecimento) — distinção que muda a conduta.

Tabelas centrais: `doctors` (com whitelabel) · `patients` (vínculo + consentimento LGPD) · `patient_modules` (médico liga/desliga o check-in por paciente) · `medications` (separadas por `source`: doctor vs patient) · `doses` · `checkins` · `reminders` · `push_subscriptions`.

---

## Setup

### 1. Banco (Supabase)
```bash
supabase init
supabase link --project-ref <SEU_PROJECT_REF>
supabase db push          # aplica as migrations 0001..0003
```
As migrations criam schema, RLS, e as funções de domínio (`generate_doses`, `apply_protocol`, `adherence_rate`, `patients_at_risk`).

### 2. Front-end
```bash
npm install
cp .env.example .env.local   # preencher URL + ANON KEY + VAPID público
npm run dev
```

### 3. Web Push (VAPID)
```bash
npx web-push generate-vapid-keys
# público -> NEXT_PUBLIC_VAPID_PUBLIC_KEY (front) e VAPID_PUBLIC_KEY (function)
# privado -> VAPID_PRIVATE_KEY (function)
```

### 4. Edge Function + secrets
```bash
supabase secrets set \
  VAPID_PUBLIC_KEY=... VAPID_PRIVATE_KEY=... \
  WHATSAPP_TOKEN=... WHATSAPP_PHONE_NUMBER_ID=...
supabase functions deploy send-reminders
```
Agende o cron (a cada 5 min) — ver `supabase/config.toml`.

### 5. WhatsApp (Cloud API)
Lembretes fora da janela de 24h exigem **templates aprovados pela Meta**. Criar e aprovar:
- `lembrete_medicacao` — vars: nome do remédio, dose
- `checkin_humor`
- `lembrete_cuidado`
- `alerta_familiar` — vars: nome do paciente, nº de faltas (enviado ao caregiver)

> Push é grátis e é o canal padrão. WhatsApp é o "toque humano" — usado nos avisos de cuidado e para pacientes que tendem a abandonar. O médico escolhe o canal por tipo de aviso (campo `channel`).

---

## Roadmap (fases de construção)

- [x] **Fase 1 — Fundação:** schema + RLS + estrutura Next.js + PWA (manifest/SW)
- [x] **Fase 2 — Backend & dados:** vínculo médico-paciente, doses, check-ins, painel lendo dados, funções de domínio
- [x] **Fase 3 — Motor de lembretes:** Edge Function (push + WhatsApp), confirmação via notificação
- [ ] **Fase 4 — Whitelabel & cobrança:** injeção da marca por médico em runtime, assinatura

### Já adiantado nesta leva
- [x] **Login/cadastro** (`/login`) — distingue paciente e médico
- [x] **Onboarding** (`/onboarding`) — vínculo por `invite_code` + tela de consentimento LGPD
- [x] **Whitelabel em runtime** — `/app/layout.tsx` carrega a marca do médico vinculado e injeta as CSS vars (accent + tons derivados)
- [x] **Ficha clínica do médico** (`/medico/paciente/[id]`) — adesão, detecção de risco de abandono, doses recentes, check-ins, auto-medicação
- [x] **Confirmação via push** (`/api/dose/confirm-latest`) + **subscribe** (`/api/push/subscribe`) + helper `lib/push.ts`
- [x] **Seed de dev** (`0004_seed_dev.sql`) — médico + 2 pacientes populados (Helena com boa adesão, Rafael em risco)

### Frente do MÉDICO — completa (front-end)
Painel desktop com shell de navegação (`components/DoctorNav`):
- [x] **Dashboard** (`/medico`) — KPIs, fila por risco, alertas (lê `adherence_rate` + risco)
- [x] **Pacientes** (`/medico/pacientes`) — lista com adesão e humor
- [x] **Ficha clínica** (`/medico/paciente/[id]`) — adesão, risco de abandono, doses, check-ins
- [x] **Lembretes & módulos** (`/medico/config`) — protocolo por diagnóstico + toggles
- [x] **Marca & whitelabel** (`/medico/marca`) — cor + nome + invite_code, prévia ao vivo, grava no banco

### Backend — completo
- [x] Caregiver alert (`0005_caregiver.sql` + Edge Function) — avisa familiar após N faltas, sem repetir no mesmo dia
- [x] Limpeza de subscriptions expiradas (410/404) na Edge Function
- [x] **Contrato (sem gateway)** (`0006`) — `doctors.status` (active/suspended/trial) + `contract_until`. Pagamento médico↔Mente Viva é por contrato, fora do app. **Não há pagamento médico↔paciente.**
- [x] **Equipe & permissões granulares** (`0006`+`0007`):
  - Papéis: médico, secretária, enfermeiro, recepção, admin de clínica
  - 8 categorias de permissão (ver clínico, ver adesão, gerenciar pacientes/medicamentos/módulos/avisos/marca/equipe)
  - RLS aplica as permissões de verdade: `view_clinical` libera check-ins sensíveis; `view_adherence` libera doses; etc.
  - Médico dono tem tudo; membros têm só o que foi marcado
  - **Primeiro acesso sem e-mail de convite** (`0008`): o médico cadastra nome + e-mail + permissões. A pessoa vai em `/primeiro-acesso`, digita o e-mail cadastrado, **cria a senha** e entra direto no painel. RPC `team_email_status` valida o e-mail; `claim_team_membership` faz o vínculo. Sem dependência de serviço de e-mail.
  - Telas: `/medico/equipe` (cadastrar + toggles por categoria) · `/primeiro-acesso` (membro cria senha)

### Falta só (operação para plug and play)
- Aprovar os templates WhatsApp na Meta (ver abaixo)
- Gerar ícones PWA (`/public/icon-192.png`, `/public/icon-512.png`)
- Definir `doctors.status='active'` ao assinar contrato (manual ou via painel admin interno futuro)
- No Supabase Auth: deixar a confirmação de e-mail **desligada** (ou tratar o fluxo de confirmação), já que o membro cria a senha direto no primeiro acesso
Todas as telas em React, navegáveis, ligadas ao banco:
- [x] **Shell + Tab Bar** (`components/TabBar`) — Hoje · Jornada · Remédios · Perfil (Liquid Glass)
- [x] **Hoje** (`/app`) — doses do dia, anel de adesão, atalho de check-in
- [x] **Confirmar dose** (`/app/dose/[id]`) — tomei/adiar/pulei **com motivo** ("acabou o remédio" → sinal de abandono)
- [x] **Medicamentos** (`/app/medicamentos`) — lista separando médico vs. paciente
- [x] **Adicionar** (`/app/medicamentos/adicionar`) — form completo, grava como `source=patient`
- [x] **Check-in modular** (`/app/checkin`) — renderiza só os módulos que o médico ativou
- [x] **Jornada** (`/app/jornada`) — adesão 30d, heatmap, humor na semana, insight cruzado
- [x] **Perfil** (`/app/perfil`) — ativar push, modo discreto, lembretes, logout

### Para testar agora
1. `supabase db push` (migrations 0001–0003)
2. Criar 3 usuários em Auth, trocar os UUIDs no `0004_seed_dev.sql`, rodar o seed
3. `npm run dev` → `/login` → entrar como médico (vê Ficha do Rafael em risco) ou paciente (vê doses do dia)

---

## Estrutura
```
src/
  app/
    app/          # paciente (page.tsx = Hoje, actions = confirmar/pular/adiar)
    medico/       # painel (page.tsx = config módulos, actions = protocolo/toggle)
    layout.tsx    # registra service worker
    globals.css   # tokens whitelabel (CSS vars)
  lib/supabase.ts # clientes browser + server
  types/db.ts     # tipos do domínio
  middleware.ts   # proteção por role
supabase/
  migrations/     # 0001 schema · 0002 RLS · 0003 funções
  functions/
    send-reminders/    # cron: dispara push/WhatsApp
    whatsapp-webhook/   # (a implementar) status/respostas
public/
  manifest.json · sw.js
```
