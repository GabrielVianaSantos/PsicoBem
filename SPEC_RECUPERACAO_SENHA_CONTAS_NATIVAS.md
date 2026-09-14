# SPEC — Recuperação de Senha para Contas Nativas

Data: 2026-09-14
Status: planejamento
Escopo: fluxo "Esqueceu a senha?" (`RedefinirSenha`) no app Expo e os endpoints `password_reset_request_view`/`password_reset_confirm_view` no backend Django. Não altera login, cadastro ou o fluxo de login com Google.

---

## 1. Objetivo

Fazer a recuperação de senha funcionar de verdade para contas nativas (criadas com e-mail e senha, sem vínculo Google), enviando um código de recuperação por e-mail de verdade — hoje esse fluxo está em um estado inseguro e quebrado, não meramente "descontinuado".

Usuários de conta Google já têm uma via de acesso sempre disponível (o botão "Entre com o Google"); usuários de conta nativa que esquecem a senha hoje **não têm nenhuma forma de recuperar acesso sozinhos**.

---

## 2. Estado atual e causa raiz

| Tema | Estado atual | Impacto |
|---|---|---|
| Nenhum backend de e-mail configurado | `settings.py` não define `EMAIL_BACKEND`, `EMAIL_HOST` nem nenhuma variável de e-mail. Nenhum serviço de e-mail (SMTP ou API) está integrado ao projeto hoje. | Nenhum e-mail jamais foi enviado por esse fluxo — o token sempre teve que ir para algum outro lugar. |
| **Falha de segurança**: token devolvido na própria resposta da API | `password_reset_request_view` (`psicoapp_backend/authentication/views.py:121-149`) gera o token de reset e o devolve no corpo da resposta HTTP (`'token': token`), além de logar no console do servidor. `src/screens/redefinirSenha.js:33-40` pega esse token e o exibe num `Alert` para o usuário ("Para fins de teste agora, use o código..."). | **Qualquer pessoa que saiba o e-mail de outra conta consegue, sozinha e sem nenhuma verificação, obter o token e redefinir a senha daquela conta** — a tela de "recuperar senha" é hoje, na prática, uma tela de "invadir qualquer conta pelo e-mail". |
| Bug: resposta ausente em token inválido | `password_reset_confirm_view` (linhas 151-173) não tem nenhum `return` para o caso de token inválido/expirado ou usuário não encontrado — a função simplesmente termina sem devolver uma `Response`. Django levanta `ValueError` e a API responde `500`. | Usuário que erra ou demora para usar o token recebe um erro genérico de servidor, sem explicação. |
| Sem validação de tamanho de senha na confirmação | `password_reset_confirm_view` não valida `new_password` (só rejeita string vazia, via `not all([...])`). | Uma senha de 1 caractere pode ser definida por esse fluxo, inconsistente com o mínimo de 6 caracteres já exigido em cadastro, troca de senha logada e criação de senha para conta Google (`serializers.py`, `views.py`). |
| Contrato usa `uid` + `token` separados | O fluxo atual exige que o app carregue `uid` (do passo 1) e o usuário digite `token` (passo 2) — dois identificadores para reconstruir a identidade do usuário. | Complexidade desnecessária; o projeto já tem um mecanismo mais simples e testado para isso (ver seção 3.2). |
| Conta Google-only não é tratada de forma coerente | Hoje, se uma conta Google-only (`has_usable_password() == False`) solicitar reset, o fluxo geraria e "enviaria" um token normalmente, permitindo que ela ganhe uma senha nativa **sem nunca provar posse da conta Google** — só por ter acesso ao e-mail. | Abriria uma via de acesso paralela não autenticada para contas que hoje só podem ser acessadas via OAuth do Google (uma regressão de segurança em relação ao modelo já estabelecido em `SPEC_LOGIN_GOOGLE.md`). Contraste: `UserLoginSerializer` (`serializers.py:76-83`) já trata esse caso na tela de login, respondendo *"Esta conta foi criada com o Google. Use o botão \"Entre com o Google\"."* — o reset de senha precisa do mesmo tratamento. |
| Rota já existe e está acessível | `Login` → "Esqueceu a senha?" já navega para `RedefinirSenha` (`src/screens/login.js`), registrada em `routes.js` no bloco Guest. `authService.requestPasswordReset`/`confirmPasswordReset` já existem e chamam os endpoints atuais. | Não é necessário criar tela, rota ou navegação novas — o problema é inteiramente de backend (segurança/e-mail) e de ajuste do contrato existente. |
| Infraestrutura reaproveitável já existe | `authentication/services.py` já tem `issue_purpose_token(typ, payload)` / `decode_purpose_token(raw, expected_typ)` — JWT HS256 assinado com `SECRET_KEY`, com `exp`, `typ` e claims customizadas, TTL configurável (usado hoje para os tokens de vínculo/cadastro do login Google). | Não é necessário desenhar um novo mecanismo de token nem criar migration — basta um novo `typ` de token de propósito (`'password_reset'`), eliminando de vez a necessidade de `uid` (o e-mail/identidade do usuário já viaja assinado dentro do próprio token). |

**Decisão confirmada com o usuário:** o e-mail será enviado via **SMTP de uma conta de e-mail existente** (não um serviço transacional de terceiros). A configuração do backend usa variáveis de ambiente genéricas (`EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_HOST_USER`, `EMAIL_HOST_PASSWORD`, `EMAIL_USE_TLS`, `DEFAULT_FROM_EMAIL`), compatíveis com qualquer provedor SMTP — a escolha de qual conta/domínio usar fica para o momento do deploy (preencher o `.env` da VPS), sem acoplar o código a um provedor específico.

---

## 3. Requisitos funcionais

### 3.1 Bloquear e corrigir a falha de segurança atual

- `password_reset_request_view` **nunca mais** devolve o token na resposta HTTP nem o imprime em log de produção.
- `src/screens/redefinirSenha.js` deixa de exibir qualquer token/código recebido da API em `Alert` — o único lugar onde o código aparece é no e-mail do usuário.

### 3.2 Novo contrato dos endpoints (token de propósito, sem `uid`)

#### `POST /api/auth/password/reset/` (request) — entrada `{"email"}`

| cenário | HTTP | resposta |
|---|---|---|
| e-mail existe, conta nativa (`has_usable_password() == True`) | 200 | `{"message": "Se o e-mail estiver cadastrado, você receberá um código em instantes."}` — e-mail real é enviado em background/síncrono |
| e-mail existe, conta Google-only (`has_usable_password() == False`) | 200 | mesma mensagem genérica acima — **nenhum e-mail é enviado**, para não conceder acesso paralelo a uma conta Google (ver seção 4) |
| e-mail não existe | 200 | mesma mensagem genérica acima (não confirma nem nega existência da conta — comportamento já usado hoje) |
| e-mail ausente no corpo | 400 | `{"email": "Este campo é obrigatório."}` |

A mensagem de sucesso é **sempre a mesma**, independentemente do que aconteceu de fato (conta existe ou não, é Google-only ou não) — isso evita enumeração de contas por essa via (diferente do login, que já aceita esse trade-off deliberadamente; aqui não há motivo para repetir a exposição).

#### `POST /api/auth/password/reset/confirm/` (confirm) — entrada `{"token", "new_password"}`

| cenário | HTTP | resposta |
|---|---|---|
| token válido, `new_password` com 6+ caracteres | 200 | `{"message": "Senha alterada com sucesso!"}` |
| token ausente ou `new_password` ausente | 400 | `{"detail": "Dados incompletos."}` |
| `new_password` com menos de 6 caracteres | 400 | `{"new_password": "A senha deve ter no mínimo 6 caracteres."}` |
| token expirado, adulterado ou de outro `typ` | 401 | `{"detail": "Código inválido ou expirado.", "code": "password_reset_token_expired"}` |
| usuário do token não existe mais | 401 | mesma resposta acima (trata como token inválido, não vaza detalhe) |

Sem `uid` em nenhum dos dois contratos — o e-mail e a identidade do usuário viajam **exclusivamente** dentro do token assinado (`typ='password_reset'`, claims `sub` e `email`), no mesmo padrão já usado pelos tokens de vínculo/cadastro do login Google.

### 3.3 Envio do e-mail

- Usar `django.core.mail.send_mail()` com o backend SMTP padrão do Django (`django.core.mail.backends.smtp.EmailBackend`), configurado via variáveis de ambiente novas em `settings.py`:
  ```python
  EMAIL_BACKEND = os.getenv("EMAIL_BACKEND", "django.core.mail.backends.smtp.EmailBackend")
  EMAIL_HOST = os.getenv("EMAIL_HOST", "")
  EMAIL_PORT = int(os.getenv("EMAIL_PORT", "587"))
  EMAIL_HOST_USER = os.getenv("EMAIL_HOST_USER", "")
  EMAIL_HOST_PASSWORD = os.getenv("EMAIL_HOST_PASSWORD", "")
  EMAIL_USE_TLS = env_bool("EMAIL_USE_TLS", "True")
  DEFAULT_FROM_EMAIL = os.getenv("DEFAULT_FROM_EMAIL", "PsicoBem <naoresponda@psicobem.app>")
  ```
- Se `EMAIL_HOST` estiver vazio (ambiente local sem credenciais configuradas), usar o backend de console do Django (`django.core.mail.backends.console.EmailBackend`) automaticamente, para que o desenvolvimento local continue funcionando sem exigir SMTP real — sem reintroduzir o vazamento por API, já que o console não é acessível pelo cliente.
- Corpo do e-mail: texto simples (sem necessidade de HTML nesta entrega), com o token de recuperação em destaque para o usuário copiar, e o tempo de validade (ver `PASSWORD_RESET_TOKEN_TTL` abaixo). Assunto sugerido: "Recuperação de senha — PsicoBem".
- Envio síncrono dentro da própria view (mesmo padrão de simplicidade já usado para as demais operações da API de autenticação — não é necessário Celery para este volume de uso).

### 3.4 TTL do token de recuperação

```python
PASSWORD_RESET_TOKEN_TTL = int(os.getenv("PASSWORD_RESET_TOKEN_TTL", "900"))  # 15 minutos
```

Reaproveitar `issue_purpose_token('password_reset', {...}, ttl=PASSWORD_RESET_TOKEN_TTL)` — se a função hoje só usa `GOOGLE_PURPOSE_TOKEN_TTL` fixo internamente, avaliar na implementação se vale adicionar um parâmetro de TTL à função existente (reaproveitando-a para os dois casos) em vez de duplicar a lógica de emissão de JWT.

### 3.5 Frontend — `src/screens/redefinirSenha.js`

- Passo 1 (e-mail): sem mudança de UI; ao enviar, mostrar sempre a mesma mensagem de sucesso genérica (nunca mais exibir token).
- Passo 2 (código + nova senha): remover o conceito de `uid` do estado do componente — o campo "Código de Recuperação" continua existindo (agora recebe o token de propósito, copiado do e-mail), e a nova senha/confirmação seguem como já estão.
- Copy atualizado: texto do passo 1 deixa claro que um e-mail será enviado de verdade (não mais "no futuro").
- `code === 'password_reset_token_expired'` (vindo de `error.code`, no mesmo padrão já usado pelas telas do login Google) → mensagem explicando que o código expirou e sugestão de solicitar um novo, mantendo o usuário no passo 2 ou voltando ao passo 1 a critério da implementação.

### 3.6 `src/services/authService.js`

- `confirmPasswordReset(token, newPassword)` — remove o parâmetro `uid` da assinatura e do corpo enviado (`POST /auth/password/reset/confirm/` passa a enviar só `{token, new_password}`).
- `requestPasswordReset(email)` mantém a assinatura atual.
- Ambos passam a propagar `code` do erro (mesmo padrão já usado em `handleError()` para os endpoints do Google), para a tela poder identificar `password_reset_token_expired`.

---

## 4. Autorização e segurança

- Conta Google-only (`auth_provider='google'`, `has_usable_password() == False`) **nunca** recebe e-mail de recuperação nem token válido por essa via — evita criar uma via de acesso paralela não autenticada para uma conta que hoje só é acessível via OAuth do Google. Quem estiver nessa situação deve usar o botão "Entre com o Google"; depois de autenticado, pode criar uma senha própria pelo fluxo já existente em "Meu Perfil" (`password_change_view`, ramo "criar senha", entregue em `SPEC_LOGIN_GOOGLE.md`).
- A resposta do endpoint de solicitação é sempre idêntica independentemente do resultado real (conta existe, não existe, ou é Google-only) — impede enumeração de contas por essa via.
- O token de recuperação é um JWT assinado com `SECRET_KEY`, com `typ='password_reset'` e expiração curta (15 minutos por padrão) — mesmo padrão de segurança já validado nos tokens de vínculo/cadastro do login Google (`decode_purpose_token` já rejeita token expirado, com `typ` divergente, ou assinatura adulterada).
- Recomenda-se aplicar um throttle leve (`AnonRateThrottle` do DRF, ou uma classe de throttle com `scope` dedicado) em `password_reset_request_view`, já que é um endpoint `AllowAny` que dispara envio de e-mail — sem isso, um atacante poderia usá-lo para bombardear a caixa de entrada de terceiros com e-mails de recuperação repetidos. Sugestão: 5 requisições/hora por IP.

---

## 5. Critérios de aceite

- [ ] `POST /auth/password/reset/` nunca devolve `uid` ou `token` no corpo da resposta, em nenhum cenário.
- [ ] Uma conta nativa existente recebe um e-mail real (via SMTP configurado) com um token de recuperação válido por 15 minutos.
- [ ] Uma conta Google-only não recebe e-mail de recuperação, mesmo com e-mail correto — e a resposta da API é idêntica à de uma conta que recebeu.
- [ ] Um e-mail inexistente recebe a mesma resposta genérica de sucesso.
- [ ] `POST /auth/password/reset/confirm/` com token válido e senha de 6+ caracteres altera a senha e permite login imediato com a nova senha.
- [ ] Token expirado, adulterado, de outro `typ`, ou de usuário inexistente retorna `401` com `code: "password_reset_token_expired"` — nunca mais `500`.
- [ ] `new_password` com menos de 6 caracteres é rejeitado com `400`.
- [ ] `src/screens/redefinirSenha.js` não exibe mais nenhum token/código vindo da API em tela — o usuário só o obtém pelo e-mail.
- [ ] Login por e-mail/senha de contas antigas (nativas) continua funcionando sem alteração.
- [ ] Login com Google e a criação de senha via "Meu Perfil" continuam funcionando sem alteração.

---

## 6. Testes e validação

### Backend

- Solicitar reset para conta nativa existente: e-mail é "enviado" (usar `django.core.mail.outbox` do Django em teste) com o token correto; resposta genérica.
- Solicitar reset para conta Google-only: nenhum e-mail é enviado; resposta idêntica à do cenário acima.
- Solicitar reset para e-mail inexistente: nenhum e-mail é enviado; resposta idêntica.
- Confirmar com token válido: senha alterada; usuário consegue autenticar com a nova senha em seguida.
- Confirmar com token expirado (gerar um com `exp` no passado, mesmo padrão de teste já usado para os tokens do Google): `401` com o `code` esperado.
- Confirmar com token de `typ` diferente (ex.: um token de `'link'` do fluxo Google): rejeitado.
- Confirmar com `new_password` curta: `400`.
- Confirmar duas vezes com o mesmo token: a segunda vez deve falhar (usuário já não corresponde ao estado esperado, ou considerar invalidação — decidir na implementação se o token de propósito precisa de proteção contra reuso; documentar a decisão).
- Rodar a suíte completa de `authentication` para garantir ausência de regressão no login e no fluxo Google.

### Frontend

- Solicitar recuperação com e-mail válido: tela avança para o passo 2, sem exibir nenhum código em alerta.
- Copiar o token de um e-mail de teste (ambiente local usa o backend de console — verificar no log do `runserver`/container) e colar no campo do passo 2: senha alterada com sucesso, navegação de volta ao Login.
- Tentar confirmar com token inválido/expirado: mensagem de erro compreensível, sem crash.
- Login subsequente com a nova senha: funciona.

---

## 7. Fora de escopo

- Envio de e-mail via serviço transacional de terceiros (Resend/SendGrid/Mailgun/SES) — decisão do usuário foi usar SMTP de uma conta existente.
- Deep-link a partir do e-mail que abra o app diretamente (o usuário copia e cola o código manualmente, como já é hoje) — evita configurar universal links/app links do zero.
- E-mail em HTML com identidade visual do PsicoBem — corpo em texto simples nesta entrega.
- Reenvio automático de código (botão "reenviar") — o usuário já pode voltar ao passo 1 e solicitar de novo.
- Throttle no endpoint de confirmação (`password/reset/confirm/`) — o token já é um JWT assinado, não um código curto de força bruta viável; throttle nesse endpoint fica como melhoria futura opcional.
- Qualquer alteração em login com Google, cadastro, ou no fluxo de "criar senha" em Meu Perfil, além do necessário para bloquear reset de conta Google-only.
- Criação das issues de implementação nesta etapa; serão derivadas desta SPEC somente após aprovação.

---

## 8. Ordem sugerida de implementação

1. `settings.py`: variáveis `EMAIL_*` e `PASSWORD_RESET_TOKEN_TTL`, com fallback para o backend de console quando `EMAIL_HOST` estiver vazio.
2. Reescrever `password_reset_request_view` (token de propósito, bloqueio de conta Google-only, envio de e-mail, resposta genérica única) e `password_reset_confirm_view` (decodificação do token, validação de senha, resposta de erro explícita).
3. Testes de backend (seção 6), incluindo o cenário de conta Google-only e de token expirado/adulterado.
4. Ajustar `authService.js` (remover `uid` de `confirmPasswordReset`, propagar `code`).
5. Ajustar `redefinirSenha.js` (remover exibição do token, atualizar copy, tratar `code` de token expirado).
6. Validar ponta a ponta localmente com o backend de console de e-mail.
7. Antes do deploy: definir e configurar a conta de e-mail SMTP real e preencher `EMAIL_HOST`, `EMAIL_HOST_USER`, `EMAIL_HOST_PASSWORD` etc. no `.env` da VPS.
8. Deploy e validação com um e-mail real recebido de fato.
