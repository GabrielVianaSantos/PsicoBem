# Issue 08 — Deploy do backend e validação ponta a ponta

**Fase:** 7 — Fechamento
**Prioridade:** 🟡 Média
**Arquivos principais:** nenhum (deploy e validação sobre as issues 01–07)
**Origem:** seções 5 e 6 de `SPEC_LOGIN_GOOGLE.md`

## Problema

As issues anteriores tocam em modelo de dados, autenticação, navegação e configuração nativa. É preciso colocar o backend no ar corretamente e validar o conjunto no dispositivo, incluindo os cenários de regressão das contas existentes.

## Objetivo

Ter o login com Google funcionando em produção sem ter quebrado nenhum fluxo anterior.

## Escopo de implementação

### Deploy do backend

Antes de tudo, confirmar que `GOOGLE_OAUTH_WEB_CLIENT_ID` está no `.env` da VPS (`/opt/apps/projetos/psicobem/psicoapp_backend/.env`, lido via `env_file`).

```bash
# na VPS
cd /opt/apps/projetos/psicobem/psicoapp_backend
git pull
docker compose -f docker-compose.yml build web worker beat
docker compose -f docker-compose.yml up -d
```

> O `build` é **obrigatório**, não opcional. As dependências Python são instaladas **na imagem**, não no bind mount — um `restart` puro não instalaria `google-auth`, e o backend subiria quebrado no import. A migration `0003` roda sozinha, porque o compose já executa `python manage.py migrate` no boot do serviço `web`.

Confirmar nos logs que a migration `0003_customuser_google_fields` foi aplicada e que o gunicorn subiu sem erro de import.

### Validação no dispositivo

Nesta ordem, porque cada etapa destrava a seguinte:

1. Conta Google cujo e-mail **já existe com senha** → pede a senha e vincula.
2. A mesma conta, segundo login → entra direto, sem pedir nada.
3. Conta Google nova → completar como **paciente** (CPF + gênero) → cai na `HomePaciente` com os dados corretos.
4. Outra conta nova → completar como **psicólogo** (CRP) → cai na `HomeBarNavigation`.
5. CPF ou CRP duplicado no complemento → campo correto destacado, permanece na tela.
6. Fechar o aplicativo no meio do complemento e refazer → sem erro de "e-mail já cadastrado".
7. Aguardar a expiração do token de propósito (15 min) e submeter → volta à tela de login com aviso.
8. Cancelar a folha do Google → nenhum alerta de erro.
9. Usuário Google abrindo "alterar senha" → modo "criar senha", sem pedir a atual; depois disso, consegue entrar também por e-mail e senha.
10. Sessão além de 60 minutos → permanece autenticado.
11. Logout → o próximo "Entre com o Google" exibe o seletor de contas.

### Regressão obrigatória

12. Login por e-mail e senha de conta antiga → **inalterado**.
13. Cadastro tradicional de paciente e de psicólogo → **inalterado**.
14. Alterar senha em conta com senha → continua exigindo a senha atual.
15. Conferir no admin que contas antigas seguem com `auth_provider='local'`, `google_sub` vazio e `email_verified=False`.

## Tarefas

- [ ] Adicionar `GOOGLE_OAUTH_WEB_CLIENT_ID` ao `.env` da VPS.
- [ ] Fazer `git pull` na VPS.
- [ ] Rodar `docker compose build web worker beat` (obrigatório — `requirements.txt` mudou).
- [ ] Subir com `docker compose up -d`.
- [ ] Confirmar nos logs a aplicação da migration `0003` e a subida do gunicorn sem erro de import.
- [ ] Executar os cenários 1 a 11 no dispositivo.
- [ ] Executar os cenários de regressão 12 a 15.
- [ ] Rodar a suíte de testes do backend uma última vez.
- [ ] `git diff --check` sem apontamentos.
- [ ] Confirmar que nenhuma resposta de API expõe `google_sub`.

## Critérios de aceite

- ✅ Todos os cenários 1 a 15 passam.
- ✅ A migration `0003` foi aplicada em produção sem erro.
- ✅ Nenhuma conta existente teve seu comportamento de login alterado.
- ✅ `git diff --check` passa sem apontamentos.
- ✅ Nenhuma resposta de API expõe `google_sub`.

## Dependências

- Depende de todas as issues anteriores (01–07).
