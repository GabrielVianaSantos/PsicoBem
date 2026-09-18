# Issue 02 — Backend: endpoint de exclusão de conta

**Fase:** 1 — Fundação
**Prioridade:** 🔴 Alta
**Arquivos principais:** `psicoapp_backend/authentication/views.py`, `psicoapp_backend/authentication/urls.py`, `psicoapp_backend/authentication/tests.py`
**Origem:** seções 3.1, 3.2, 3.4 e 5 de `SPEC_EXCLUSAO_CONTA.md`

## Problema

Não existe hoje nenhum endpoint de auto-exclusão de conta. `CustomUser.delete()` já cascateia tudo sozinho (ver estado atual da SPEC), mas precisa de uma rota autenticada, com confirmação obrigatória, para ser exposto com segurança ao app.

## Objetivo

Criar `DELETE /api/auth/account/`, exigindo confirmação por senha (contas com senha) ou pela frase "EXCLUIR" (contas Google-only sem senha), operando sempre sobre `request.user`.

## Escopo de implementação

### View (`authentication/views.py`)

```python
@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_account_view(request):
    user = request.user

    if user.has_usable_password():
        password = request.data.get('password')
        if not password or not authenticate(email=user.email, password=password):
            return Response({'error': 'Senha incorreta.'}, status=status.HTTP_400_BAD_REQUEST)
    else:
        confirmacao = (request.data.get('confirmacao') or '').strip().upper()
        if confirmacao != 'EXCLUIR':
            return Response({'error': 'Confirmação inválida.'}, status=status.HTTP_400_BAD_REQUEST)

    user.delete()
    return Response({'message': 'Conta excluída com sucesso.'}, status=status.HTTP_200_OK)
```

- Mesmo padrão de `password_change_view` para `authenticate(email=..., password=...)`.
- Sem parâmetro de usuário-alvo no payload/URL — sempre `request.user`. Não adicionar nenhuma forma de um usuário excluir a conta de outro (nem staff/admin através desta rota).
- Não há nenhuma etapa extra de "preparação" antes do `.delete()` para o caso do psicólogo — a cascata total já é o comportamento nativo desejado (seção 3.4 da SPEC).
- Para o caso do paciente, nenhuma ação extra é necessária além do `.delete()` — a cascata natural do banco apaga tudo, incluindo os prontuários (issue 01 previa uma exceção aqui; foi implementada e depois revertida — ver nota no arquivo da issue 01).

### Rota (`authentication/urls.py`)

```python
path('account/', views.delete_account_view, name='account-delete'),
```

## Tarefas

- [ ] Implementar `delete_account_view` conforme acima.
- [ ] Registrar a rota `account/`.
- [ ] Testes — paciente: senha correta exclui a conta; senha incorreta retorna `400` e a conta permanece; sem campo `password` retorna `400`.
- [ ] Testes — psicólogo: mesmo conjunto de cenários acima.
- [ ] Testes — conta Google-only (`has_usable_password() == False`): frase "EXCLUIR" exclui a conta; qualquer outro texto (incluindo vazio, minúsculo sem match, ou a senha por engano) retorna `400`.
- [ ] Teste — requisição sem autenticação retorna `401`.
- [ ] Teste de cascata (paciente): após excluir, `Sessao`, `VinculoPacientePsicologo`, `RegistroOdisseia` (e comentários), `MetaOdisseia`, `EnvioSemente`, `NotificacaoSistema` e `DispositivoPush` relacionados aquele paciente não existem mais; `Prontuario` relacionado continua existindo com `paciente_id IS NULL` (depende da issue 01).
- [ ] Teste de cascata (psicólogo): após excluir, `TipoSessao`, `Sessao`, `VinculoPacientePsicologo`, `Prontuario` (como autor), `CategoriaMensagem`, `SementeCuidado` e `RegistroOdisseiaComentario` relacionados não existem mais — incluindo os de um paciente que continua com conta ativa (confirmar que o paciente em si **não** é afetado, só os dados compartilhados com aquele psicólogo).
- [ ] Teste: login subsequente com o e-mail excluído falha; solicitação de recuperação de senha para esse e-mail continua respondendo a mensagem genérica de sempre, sem enviar e-mail.

## Critérios de aceite

- ✅ Todos os critérios de aceite de exclusão da SPEC (seção 6) cobertos por teste automatizado, exceto os que são puramente de UI (esses ficam nas issues 03/04).
- ✅ Endpoint nunca aceita um identificador de usuário-alvo — sempre opera sobre `request.user`.
- ✅ `python manage.py test authentication` e a suíte completa (`python manage.py test`) passam localmente.

## Dependências

- Depende da issue 01 para o critério de aceite de sobrevivência do prontuário do paciente ser satisfeito de fato (o endpoint em si não muda por causa disso, só o resultado do teste de cascata do paciente).
