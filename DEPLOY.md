# Deploy · GitHub → Vercel

Guia direto para colocar o projeto no ar. Nesta etapa o objetivo é ter o **esqueleto publicado e o pipeline GitHub→Vercel funcionando**. Login e dados só funcionam depois de plugar o Supabase (etapa seguinte) — o build sobe mesmo sem as variáveis.

---

## 1. Subir para o GitHub

Dentro da pasta do projeto (`menteviva/`):

```bash
git init
git add .
git commit -m "MVP Mente Viva: paciente + médico + equipe"
git branch -M main
```

Crie um repositório vazio no GitHub (sem README, sem .gitignore — já temos), e:

```bash
git remote add origin https://github.com/<SEU_USUARIO>/menteviva.git
git push -u origin main
```

> O `.gitignore` já protege `.env*`, `node_modules` e `.next`. **Nunca** commitem segredos.

---

## 2. Publicar na Vercel

1. Acesse vercel.com → **Add New… → Project**
2. **Import** o repositório `menteviva` do GitHub
3. A Vercel detecta **Next.js** automaticamente. Não precisa mudar build settings.
4. Em **Environment Variables**, adicione (mesmo que ainda apontem para placeholder — podem editar depois):

   | Nome | Valor (por enquanto) |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | deixe vazio ou a URL real quando tiver |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | idem |
   | `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | idem |

5. **Deploy**. O build passa (configuramos para não falhar por lint/TS no MVP).
6. Em ~1 min vocês têm uma URL `https://menteviva-xxx.vercel.app`.

A partir daí, **todo push na branch `main` faz deploy automático**.

---

## 3. O que esperar neste primeiro deploy

- ✅ A landing (`/`) abre
- ✅ As telas renderizam (login, primeiro-acesso, onboarding)
- ⚠️ Login/cadastro e qualquer dado **ainda não funcionam** — falta o Supabase
- Isso é esperado. Próxima etapa: criar o projeto Supabase, rodar as migrations e preencher as 3 variáveis acima com os valores reais, depois **Redeploy**.

---

## 4. Próxima etapa (depois do deploy)

Seguir o `README.md` → seção **Setup**:
1. `supabase db push` (migrations 0001–0008)
2. Preencher as env reais na Vercel e **Redeploy**
3. Gerar VAPID, configurar Edge Function + cron
4. Templates WhatsApp na Meta
5. No Supabase Auth: desligar confirmação de e-mail (membros criam senha no 1º acesso)
