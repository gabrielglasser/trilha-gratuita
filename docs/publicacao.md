# Hospedagem com Vercel e PostgreSQL

## Requisitos

- Conta na Vercel e banco PostgreSQL com TLS, como o Neon.
- Node.js 22 ou 24.
- Variáveis de ambiente listadas em `.env.example`.

A aplicação usa Express e `pg`. GitHub Pages não executa o backend. Confira as condições e os limites dos planos dos provedores antes de publicar.

## Configuração do banco

1. Crie um banco exclusivo para a aplicação e mantenha testes separados de produção.
2. Configure `DATABASE_URL` com a conexão direta para executar `npm run db:migrate`. O script aplica `db/001-init.sql` em uma transação, sem apagar tabelas existentes.
3. Na aplicação hospedada, use a conexão pooled do Neon quando disponível.
4. Não inclua conexões, dados exportados ou credenciais no repositório.

## Configuração da Vercel

1. Importe o repositório, selecione o preset Express e Node.js 22 ou 24. Não configure diretório de saída estático ou comando de build customizado.
2. A entrada é `src/app.js`, que exporta a aplicação Express. A pasta `public/` contém os arquivos estáticos.
3. Cadastre `DATABASE_URL`, `APP_ORIGIN`, `ADMIN_PASSWORD_HASH`, `SESSION_SECRET`, `CRON_SECRET` e `DATA_MODE` no ambiente do projeto. Para gerar o hash administrativo, use `npm run admin:hash` em terminal privado.
4. Defina `APP_ORIGIN` como a origem HTTPS exata da aplicação, sem barra final. Requisições de alteração com outra origem serão rejeitadas.
5. Publique inicialmente com `DATA_MODE=test` e banco isolado. Confira recomendação, consentimento, feedback, autenticação, exportação e exclusão.
6. Configure produção com banco separado e `DATA_MODE=real`. Mantenha dados sintéticos no ambiente de teste.
7. Verifique o acesso público sem autenticação do provedor. O painel em `/#admin` mantém autenticação própria no servidor.

## Limpeza e manutenção

O `vercel.json` agenda `/api/cron/cleanup` diariamente às 06:00 UTC. Configure `CRON_SECRET` para autorizar a chamada e confira sua execução nos registros do provedor.

Participações expiram após 90 dias. O cron e as operações de coleta/painel removem registros vencidos. Exclusões removem também feedbacks e cliques associados. Cópias exportadas e backups devem ser administrados separadamente.

Mudanças em variáveis de ambiente exigem nova publicação. Após cada alteração, confira as operações afetadas e os registros de erro sem expor segredos.

## Referências

- [Express na Vercel](https://vercel.com/docs/frameworks/backend/express)
- [Plano Hobby da Vercel](https://vercel.com/docs/plans/hobby)
- [Planos do Neon](https://neon.com/docs/introduction/plans)
