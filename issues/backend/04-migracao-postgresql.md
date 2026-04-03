# Issue: Migração da Conectividade para PostgreSQL (Backend)

**Objetivo:** Mudar a estrutura driver pra aceitabilidade de PostgreSQL em produção destruindo as travas do local sqlite.

**Tarefas:**
- [ ] Adicionar instâncias de compilação dos módulos dependentes `psycopg2-binary` e `dj-database-url` no pip tracker.
- [ ] Reestruturar o vetor `DATABASES{}` no config base.
- [ ] Setar parse de aceitabilidade dinâmico no objeto injetando variável `DATABASE_URL` repassada por provedores da infra Cloud.
- [ ] Estabelecer fallback: garantir que caso script rode sem database Url a engine conecte suave no SQlite puro para desenvolvedores isolarem features.
