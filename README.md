# CartãoControl

Web app financeiro pessoal para controlar cartões de crédito, faturas, parcelas, recorrências, limites, dashboards, backup local e sincronização opcional em nuvem.

## Stack

- Next.js com App Router
- React e TypeScript
- Tailwind CSS
- Zustand para estado global
- IndexedDB para persistência local
- Supabase Auth e Supabase Database opcionais
- Zod para validação
- date-fns para datas
- Recharts para gráficos
- PWA com manifest e service worker

## Rodar localmente

```bash
npm install
npm run dev
```

Acesse `http://localhost:3000`.

Sem variáveis de ambiente, o app roda em modo local usando IndexedDB.

## Build e qualidade

```bash
npm run lint
npm run test
npm run build
```

## Publicar na Vercel

1. Suba este projeto para um repositório GitHub.
2. Na Vercel, importe o repositório.
3. Use o preset Next.js.
4. O build command padrão é `npm run build`.

Para a versão apenas local, não há env obrigatório.

Para habilitar login e sincronização Supabase, configure na Vercel:

```env
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_chave_anon_public
```

Essas variáveis são públicas do client Supabase. Não coloque `service_role` no frontend.

## Supabase

1. Crie um projeto no Supabase.
2. Em Authentication, habilite login por e-mail/magic link.
3. Em SQL Editor, execute [supabase/schema.sql](supabase/schema.sql).
4. Copie `Project URL` e `anon public key` para as variáveis da Vercel.

A sincronização inicial salva um JSON por usuário na tabela `finance_data`. Esse desenho é simples de manter e permite evoluir depois para tabelas relacionais normalizadas.

## PWA

O app inclui `manifest.webmanifest`, ícones e `public/sw.js`. Em celulares e navegadores compatíveis, use a opção "Adicionar à tela inicial". O service worker mantém um cache básico das rotas e assets principais para uso offline parcial.

## Backup, CSV e notificações

Em `Configurações`:

- `Exportar backup` gera um JSON com todos os dados.
- `Importar backup` valida o arquivo com Zod antes de substituir os dados locais.
- `Importar CSV` cria compras a partir de colunas como descrição, valor, data, cartão, categoria, parcelas e observação.
- `Ativar notificações de vencimento` usa notificações locais do navegador.
- `Limpar dados` exige confirmação forte.
- `Carregar dados de exemplo` substitui os dados atuais por uma base de teste.

## Conta e sincronização

Na rota `/login`:

- Envio de magic link por e-mail quando Supabase está configurado.
- Enviar dados locais para a nuvem.
- Baixar backup da nuvem para o navegador atual.

## Limitações atuais

- Sem Supabase configurado, os dados ficam somente no navegador/dispositivo.
- Limpar dados do navegador remove as informações locais.
- A sincronização em nuvem ainda é manual, por botões de enviar/baixar.
- As notificações são locais e dependem do navegador estar aberto ou permitir execução do PWA.
- Leitura automática de e-mails ainda não foi implementada, pois exige backend seguro, OAuth/IMAP e consentimento explícito do usuário.

## Próximos passos técnicos

- Normalizar os dados em tabelas PostgreSQL por entidade.
- Resolver conflitos de sincronização entre dispositivos.
- Criar notificações push server-side.
- Implementar importadores específicos por banco.
- Implementar leitura de e-mails com provedor autorizado e processamento server-side.
