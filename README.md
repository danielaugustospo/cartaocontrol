# CartãoControl

Web app financeiro pessoal para controlar cartões de crédito, faturas, parcelas, recorrências, limites e dashboards.

## Stack

- Next.js com App Router
- React e TypeScript
- Tailwind CSS
- Zustand para estado global
- IndexedDB para persistência local
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
4. Se o repositório estiver com este app dentro da pasta `cartaocontrol`, configure `Root Directory` como `cartaocontrol`.
5. O build command padrão é `npm run build`.

Não há banco externo obrigatório nesta versão.

## PWA

O app inclui `manifest.webmanifest`, ícones e `public/sw.js`. Em celulares e navegadores compatíveis, use a opção "Adicionar à tela inicial". O service worker mantém um cache básico das rotas e assets principais para uso offline parcial.

## Backup

Em `Configurações`:

- `Exportar backup` gera um JSON com todos os dados.
- `Importar backup` valida o arquivo com Zod antes de substituir os dados locais.
- `Limpar dados` exige confirmação forte.
- `Carregar dados de exemplo` substitui os dados atuais por uma base de teste.

## Limitações da versão local

- Os dados ficam somente no navegador/dispositivo.
- Limpar dados do navegador remove as informações.
- Não há login, multiusuário ou sincronização em nuvem.
- O service worker oferece offline parcial, não sincronização offline completa.

## Próximos passos previstos

- Login e usuários.
- Supabase ou PostgreSQL.
- Sincronização em nuvem.
- Notificações de vencimento.
- Importação de CSV de faturas.
- Leitura automatizada de e-mails.
