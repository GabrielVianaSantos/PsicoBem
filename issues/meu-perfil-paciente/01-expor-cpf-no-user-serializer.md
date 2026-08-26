# Issue 01 — Expor o CPF do paciente no UserSerializer

**Fase:** 1 — Backend
**Prioridade:** 🔴 Alta
**Arquivos principais:** `psicoapp_backend/authentication/serializers.py`
**Origem:** seções 2, 3.2 e 3.4 de `SPEC_MEU_PERFIL_PACIENTE.md`

## Problema

`UserSerializer` já expõe `crp`, `specialization` e `biography` como campos somente leitura, lidos de `psicologo_profile` — mas não tem nenhum campo equivalente lendo `paciente_profile.cpf`. O CPF existe no modelo `Paciente` (`authentication/models.py:36`, `unique=True`), mas nunca é devolvido em nenhuma resposta de perfil ao próprio paciente.

Adicionalmente, a investigação da SPEC encontrou que `email` não está em `read_only_fields` de `UserSerializer` (`= ('id', 'created_at')`), e `UserSerializer.update()` faz `setattr` genérico para todo campo presente no payload — ou seja, nada no backend impede hoje uma futura tela de alterar o e-mail, mesmo sendo o `USERNAME_FIELD` do Django. Isso é tratado como hardening opcional nesta issue.

## Objetivo

Fazer `GET /auth/profile/` (e qualquer outra resposta que use `UserSerializer`) incluir o CPF do paciente autenticado, sem afetar a resposta para psicólogos, e opcionalmente reforçar que `email` é somente leitura nesse serializer.

## Escopo de implementação

- Em `UserSerializer` (`psicoapp_backend/authentication/serializers.py`):
  - Adicionar `cpf = serializers.CharField(source='paciente_profile.cpf', read_only=True)`, no mesmo padrão de `crp`.
  - Incluir `'cpf'` na tupla `fields` de `Meta`.
  - (Hardening opcional, recomendado na seção 3.4 da SPEC) Adicionar `'email'` a `read_only_fields` em `Meta`, garantindo que nenhum payload de `PUT /auth/profile/update/` consiga alterar o e-mail, independentemente do que o frontend envie.
- Não alterar `PacienteRegistrationSerializer`, o modelo `Paciente`, nem nenhuma regra de cadastro.
- Não alterar o comportamento de login, autenticação ou qualquer endpoint fora de `UserSerializer`.

## Tarefas

- [ ] Adicionar o campo `cpf` somente leitura a `UserSerializer`.
- [ ] Incluir `cpf` em `Meta.fields`.
- [ ] Confirmar que, para um psicólogo autenticado (sem `paciente_profile`), o campo `cpf` vem `null`/ausente na resposta, sem erro 500.
- [ ] Confirmar que, para um paciente autenticado, `cpf` vem preenchido com o valor cadastrado.
- [ ] (Opcional) Adicionar `'email'` a `Meta.read_only_fields`.
- [ ] Se o hardening opcional for aplicado: testar manualmente um `PUT /auth/profile/update/` enviando um `email` diferente e confirmar que o e-mail do usuário não muda.

## Critérios de aceite

- ✅ `GET /auth/profile/` para um paciente autenticado inclui `cpf` com o valor correto.
- ✅ `GET /auth/profile/` para um psicólogo autenticado não quebra e não retorna CPF de ninguém.
- ✅ Nenhuma outra resposta de `UserSerializer` (ex.: dados retornados após login/cadastro) perde ou altera campos existentes.
- ✅ Se o hardening de `email` for aplicado, uma tentativa de alterar o e-mail via `PUT /auth/profile/update/` é silenciosamente ignorada (campo somente leitura), sem quebrar a atualização dos demais campos enviados.

## Dependências

- Nenhuma. Esta é a issue de base do backlog — a issue 02 depende dela.
