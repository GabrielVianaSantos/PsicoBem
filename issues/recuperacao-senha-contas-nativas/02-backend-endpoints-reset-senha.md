# Issue 02 — Backend: reescrever os endpoints de reset de senha

**Fase:** 1 — Causa raiz
**Prioridade:** 🔴 Alta
**Arquivos principais:** `psicoapp_backend/authentication/views.py`, `psicoapp_backend/authentication/services.py`, `psicoapp_backend/authentication/urls.py`, `psicoapp_backend/authentication/tests.py`
**Origem:** seções 2, 3.1, 3.2, 3.3 e 4 de `SPEC_RECUPERACAO_SENHA_CONTAS_NATIVAS.md`

## Problema

`password_reset_request_view` devolve o token de reset na própria resposta da API (falha de segurança — qualquer um com o e-mail de alguém reseta a senha da conta). `password_reset_confirm_view` não retorna resposta nenhuma para token inválido (vira erro 500) e não valida o tamanho da nova senha. Ambos usam `uid` + `default_token_generator`, quando o projeto já tem um mecanismo de token de propósito mais simples e testado (`issue_purpose_token`/`decode_purpose_token`, usado pelo login Google).

## Objetivo

Emitir um token de propósito assinado (`typ='password_reset'`) e enviá-lo por e-mail de verdade, nunca na resposta da API; bloquear reset de conta Google-only; corrigir a ausência de resposta em token inválido; validar o tamanho da nova senha.

## Escopo de implementação

### `authentication/services.py`

- Adicionar um parâmetro opcional `ttl` a `issue_purpose_token(typ, payload, ttl=None)`, usando `ttl or settings.GOOGLE_PURPOSE_TOKEN_TTL` como padrão — preserva o comportamento de todos os chamadores existentes (login Google) sem alteração, e permite passar `settings.PASSWORD_RESET_TOKEN_TTL` para o novo caso.
- Adicionar `send_password_reset_email(user, token)`: monta o corpo do e-mail (texto simples, com o token em destaque e o tempo de validade em minutos) e chama `django.core.mail.send_mail(...)`, usando `settings.DEFAULT_FROM_EMAIL` como remetente.

### `authentication/views.py`

**`password_reset_request_view`** — reescrever por completo:

```python
@api_view(['POST'])
@permission_classes([AllowAny])
def password_reset_request_view(request):
    email = request.data.get('email')
    if not email:
        return Response({'email': 'Este campo é obrigatório.'}, status=status.HTTP_400_BAD_REQUEST)

    user = CustomUser.objects.filter(email=email).first()
    if user is not None and user.has_usable_password():
        token, ttl = issue_purpose_token(
            'password_reset', {'sub': user.pk, 'email': user.email},
            ttl=settings.PASSWORD_RESET_TOKEN_TTL,
        )
        send_password_reset_email(user, token)

    # Resposta sempre igual: não confirma existência da conta nem se é Google-only.
    return Response(
        {'message': 'Se o e-mail estiver cadastrado, você receberá um código em instantes.'},
        status=status.HTTP_200_OK,
    )
```

Note: contas Google-only (`has_usable_password() is False`) caem no `if` como falso e simplesmente não recebem e-mail — sem branch separado, sem log, sem diferença de resposta.

**`password_reset_confirm_view`** — reescrever por completo:

```python
@api_view(['POST'])
@permission_classes([AllowAny])
def password_reset_confirm_view(request):
    token = request.data.get('token')
    new_password = request.data.get('new_password')

    if not token or not new_password:
        return Response({'detail': 'Dados incompletos.'}, status=status.HTTP_400_BAD_REQUEST)

    if len(new_password) < 6:
        return Response({'new_password': 'A senha deve ter no mínimo 6 caracteres.'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        claims = decode_purpose_token(token, 'password_reset')
    except GoogleAuthError:
        return Response(
            {'detail': 'Código inválido ou expirado.', 'code': 'password_reset_token_expired'},
            status=status.HTTP_401_UNAUTHORIZED,
        )

    user = CustomUser.objects.filter(pk=claims['sub'], email=claims['email']).first()
    if user is None:
        return Response(
            {'detail': 'Código inválido ou expirado.', 'code': 'password_reset_token_expired'},
            status=status.HTTP_401_UNAUTHORIZED,
        )

    user.set_password(new_password)
    user.save()
    return Response({'message': 'Senha alterada com sucesso!'}, status=status.HTTP_200_OK)
```

> `GoogleAuthError` é a exceção genérica já usada por `decode_purpose_token` para qualquer token de propósito inválido/expirado/adulterado — não é específica do fluxo Google apesar do nome; reaproveitar exatamente como já é feito nas views do Google.

Importar `issue_purpose_token`, `decode_purpose_token`, `GoogleAuthError`, `send_password_reset_email` de `authentication.services` no topo de `views.py` (mesmo padrão dos imports já existentes para os endpoints do Google).

### Throttle

Aplicar um throttle leve em `password_reset_request_view` (ex.: `AnonRateThrottle` do DRF com `scope` dedicado, 5 requisições/hora por IP) — protege contra uso do endpoint para bombardear a caixa de entrada de terceiros.

## Tarefas

- [ ] Adicionar parâmetro `ttl` a `issue_purpose_token`, com fallback para o comportamento atual.
- [ ] Criar `send_password_reset_email(user, token)` em `services.py`.
- [ ] Reescrever `password_reset_request_view` conforme acima.
- [ ] Reescrever `password_reset_confirm_view` conforme acima.
- [ ] Aplicar throttle em `password_reset_request_view`.
- [ ] Testes: conta nativa existente → e-mail enviado (`django.core.mail.outbox`), resposta genérica.
- [ ] Testes: conta Google-only → nenhum e-mail enviado, resposta idêntica à anterior.
- [ ] Testes: e-mail inexistente → nenhum e-mail enviado, resposta idêntica.
- [ ] Testes: confirmar com token válido → senha alterada, login subsequente funciona.
- [ ] Testes: confirmar com token expirado/adulterado/de outro `typ` → `401` com o `code` esperado.
- [ ] Testes: confirmar com `new_password` curta → `400`.
- [ ] Testes: `issue_purpose_token` com e sem `ttl` explícito → comportamento correto nos dois casos (regressão do login Google).
- [ ] Rodar a suíte completa de `authentication`.

## Critérios de aceite

- ✅ Nenhuma resposta da API contém `uid` ou `token` de reset.
- ✅ Conta nativa recebe e-mail real (verificável via `django.core.mail.outbox` em teste) com token válido por `PASSWORD_RESET_TOKEN_TTL`.
- ✅ Conta Google-only não recebe e-mail; resposta idêntica à de sucesso normal.
- ✅ Token expirado/inválido retorna `401` com `code: "password_reset_token_expired"` — nunca mais `500`.
- ✅ Senha curta é rejeitada com `400`.
- ✅ Testes existentes de login Google continuam passando (nenhuma regressão em `issue_purpose_token`).

## Dependências

- Depende da issue 01 (variáveis de e-mail e TTL precisam existir).
- É pré-requisito das issues 03 e 04.
