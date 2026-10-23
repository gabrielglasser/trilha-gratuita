# Trilha Gratuita

**Encontre cursos gratuitos que combinam com seu perfil.**

Projeto individual de Atividades Extensionistas II de Análise e Desenvolvimento de Sistemas, associado ao ODS 4 — Educação de Qualidade. Responsável: Gabriel dos Santos · gbsantos.dev@gmail.com.

O site ajuda a comparar cursos de terceiros; não hospeda aulas e não representa as instituições. Recomendações não garantem matrícula, emprego, conclusão ou aprendizagem.

## Funcionalidades

- Catálogo de 16 cursos com fontes, carga horária, requisitos e condições de certificação.
- Questionário em seis etapas e recomendação de até três cursos por critérios transparentes.
- Busca sem identificação e participação opcional de adultos mediante consentimento.
- Feedback e registros em PostgreSQL, com validação no servidor.
- Painel protegido, exportação CSV/JSON, ocultação de nomes e exclusão de participações.

## Estrutura

```text
public/          interface HTML, CSS e JavaScript
src/catalog.js   dados e fontes do catálogo
src/recommend.js filtros, pontuação e validação do perfil
src/app.js       API Express e entrada da Vercel
src/db.js        conexão PostgreSQL e limpeza
src/server.js    execução local
db/001-init.sql esquema idempotente do banco
scripts/         migração e geração do hash administrativo
tests/           testes sem participantes reais
docs/            fontes do catálogo e configuração de hospedagem
```

## Executar localmente

Requisitos: Node.js 22 ou 24 e PostgreSQL (local ou remoto). O banco remoto deve aceitar TLS, com a URL fornecida pelo próprio provedor.

```bash
npm ci
cp .env.example .env
# Edite .env localmente. Não publique esse arquivo.
npm run db:migrate
npm run dev
```

Abra `http://localhost:3000`. Sem banco e segredos, a busca funciona e a coleta/painel retornam indisponibilidade explícita. Não existe fallback de participação para localStorage.

Em Windows, copie `.env.example` para `.env` pelo Explorador ou `Copy-Item .env.example .env` no PowerShell.

Para gerar o hash da senha, execute `npm run admin:hash` em terminal interativo. A senha não aparece enquanto é digitada. Use senha única e guarde o hash em `ADMIN_PASSWORD_HASH` no ambiente. Gere `SESSION_SECRET` e `CRON_SECRET` independentemente com `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`, em seu terminal privado. Não publique esses valores.

| Variável | Uso |
|---|---|
| `DATABASE_URL` | URL secreta do PostgreSQL; preferir conexão pooled do Neon na aplicação |
| `APP_ORIGIN` | Origem exata, sem barra final: `http://localhost:3000` ou URL HTTPS da produção |
| `ADMIN_PASSWORD_HASH` | Hash bcrypt da senha administrativa |
| `SESSION_SECRET` | Segredo de ao menos 32 caracteres, usado na derivação de identificadores temporários ant abuso |
| `DATA_MODE` | `test` por padrão; `real` somente depois da validação remota |
| `CRON_SECRET` | Autoriza limpeza diária agendada |
| `PORT` | Porta local; padrão 3000 |

O painel fica em `/#admin`. A página pode ser aberta, mas consultas e exportações exigem autenticação no servidor. Sessões usam tokens aleatórios, hashes no banco, cookie HttpOnly/SameSite Strict e expiração em oito horas. Em produção HTTPS o cookie é Secure. Trocar a senha não revoga automaticamente sessões existentes: para revogar todas, execute `DELETE FROM admin_sessions;` no console SQL restrito.

## Recomendação

Filtros obrigatórios: área, nível suficiente, habilidades específicas confirmadas, computador quando necessário, certificado gratuito quando exigido e carga compatível com o prazo conhecido. A carga dividida por horas semanais produz uma estimativa; não inclui horas adicionais de revisão. Prazo não identificado não é apresentado como ilimitado.

Cursos elegíveis começam com 50 pontos. Objetivo compatível soma 20; nível igual soma 15 (nível inferior soma 5); até quatro semanas soma 10 (até oito soma 5); certificado gratuito soma 5. Ordenação: maior pontuação, menor carga e identificador como desempate estável. Retorno de no máximo três cursos. Sem elegíveis, retorna mensagem e contagem dos primeiros motivos de exclusão, sem preencher com cursos incompatíveis. Idade e nome nunca entram nesse cálculo.

## Dados e privacidade

Somente adultos com consentimento explícito têm dados gravados. O servidor recalcula as recomendações e registra um retrato do catálogo, a versão do consentimento e horários. O cliente não pode escolher `mode`, horários, pontuação ou curso recomendado no envio de participação.

Um código aleatório de 256 bits serve à continuidade do feedback e à exclusão. O banco guarda apenas seu hash. Reenvio com o mesmo código e conteúdo retorna o registro existente; conteúdo conflitante é rejeitado. Feedback tem uma linha por participação e pode ser atualizado. Cliques têm ID de evento único e só são aceitos para cursos daquele registro. Recarregar a página perde o código em memória; o participante deve guardá-lo. Pessoas podem gerar mais de uma participação: não inferir pessoas únicas.

O painel separa `real` e `test`, permite ocultar nomes e comentários **no servidor**, pagina registros e exporta JSON/CSV. CSV neutraliza prefixos de fórmula. Nomes ou comentários podem conter informações identificáveis mesmo em exportações: revise antes de compartilhar. Não há dados reais no repositório.

Retenção: 90 dias desde a participação. Registros vencidos não aparecem nas consultas; limpeza física ocorre no cron diário ou na próxima operação de coleta/painel. Exclusão em cascata remove feedback e cliques. Cópias exportadas e backups externos são administrados separadamente pelo responsável; a exclusão na aplicação não implica remoção instantânea dessas cópias.

## Testes

```bash
npm test
npm run check
npm audit --omit=dev
```

PGlite executa PostgreSQL compilado para WebAssembly em memória. É uma instância isolada de testes, não é o banco de produção e não testa a conexão TCP/TLS do Neon. JSDOM testa os fluxos e o DOM, não renderização, contraste medido ou compatibilidade em celulares reais. Os testes não requerem `.env`, não se conectam ao banco de participantes e não representam participações reais.

## Hospedagem e fontes

Consulte as [instruções de hospedagem](docs/publicacao.md) e as [fontes do catálogo](docs/fontes.md). GitHub Pages sozinho não executa a API nem o banco.

## Desenvolvimento

Implementação com assistência de IA (ChatGPT/Codex).
