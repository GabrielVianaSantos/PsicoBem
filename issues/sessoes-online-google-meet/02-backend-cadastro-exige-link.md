# Issue 02 — Backend: cadastro de psicólogo passa a exigir o link do Meet

**Fase:** 2 — Regra de cadastro
**Prioridade:** 🔴 Alta
**Arquivos principais:** `psicoapp_backend/authentication/serializers.py`, `psicoapp_backend/authentication/views.py`, `psicoapp_backend/authentication/tests.py`
**Referência:** seções 4.2 e 5 de `SPEC_SESSOES_ONLINE_GOOGLE_MEET.md`

## Problema

Com a issue 01, o campo existe, mas nada obriga um psicólogo novo a preenchê-lo — o problema do "link não configurado" continuaria acontecendo para todo cadastro futuro, não só para os antigos.

## Objetivo

Tornar o link do Meet obrigatório nos dois fluxos de cadastro de psicólogo, com a mesma mensagem de erro de validação nos dois.

## Escopo de implementação

### Cadastro nativo — `PsicologoRegistrationSerializer`

- Adicionar `link_sala_video` a `Meta.fields`.
- Tornar obrigatório (`required=True`, sem `allow_blank`).
- Validar formato: deve começar com `https://meet.google.com/`. Mensagem de erro: algo como "Informe o link da sua sala do Google Meet (crie uma em meet.google.com/new)."

### Cadastro via Google — `GoogleCompleteRegistrationSerializer`

- Adicionar `link_sala_video` como campo do serializer.
- No ramo `elif user_type == 'psicologo':` de `validate()`, aplicar a mesma validação de formato do cadastro nativo.
- Em `google_complete_registration_view`, passar `link_sala_video` na criação do `Psicologo` (mesmo ponto onde `crp`/`specialization` já são passados).

### O que NÃO muda

- Cadastro de **paciente** não é afetado.
- Psicólogos já cadastrados antes desta issue não são revalidados nem bloqueados — a obrigatoriedade vale só para novos cadastros a partir daqui.

## Tarefas

- [ ] Tornar `link_sala_video` obrigatório em `PsicologoRegistrationSerializer`, com validação de formato.
- [ ] Tornar `link_sala_video` obrigatório no ramo psicólogo de `GoogleCompleteRegistrationSerializer.validate()`.
- [ ] Passar `link_sala_video` na criação do `Psicologo` em `google_complete_registration_view`.
- [ ] Testes: cadastro nativo de psicólogo sem link → 400; com link mal formatado → 400; com link válido → 201 e `Psicologo.link_sala_video` preenchido.
- [ ] Testes: conclusão de cadastro Google como psicólogo sem link → 400; com link válido → 201.
- [ ] Teste de regressão: cadastro de paciente (nativo e Google) continua funcionando sem o campo.

## Critérios de aceite

- ✅ Não é possível concluir cadastro de psicólogo (nativo ou Google) sem um link válido do Meet.
- ✅ Mensagem de erro é clara e orienta a criar o link em `meet.google.com/new`.
- ✅ Cadastro de paciente é idêntico ao de antes, sem novo campo.
- ✅ Psicólogos cadastrados antes desta issue continuam podendo logar e usar o app normalmente.

## Dependências

- Depende da issue 01.
- É pré-requisito da issue 04.
