# Issue 03 — Backend: fallback de link ausente e edição via perfil

**Fase:** 3 — Contrato de API
**Prioridade:** 🔴 Alta
**Arquivos principais:** `psicoapp_backend/sessoes/serializers.py`, `psicoapp_backend/authentication/serializers.py`, `psicoapp_backend/sessoes/tests.py`, `psicoapp_backend/authentication/tests.py`
**Referência:** seções 4.1, 4.4 e 6 de `SPEC_SESSOES_ONLINE_GOOGLE_MEET.md`

## Problema

Psicólogos cadastrados antes da issue 02 (ou que apaguem o link do perfil) vão ter sessões online sem `sala_url`. O app precisa distinguir esse caso de uma sessão presencial, e o psicólogo precisa de um jeito de editar o link depois do cadastro.

## Objetivo

Expor o estado "link pendente" de forma segura, com o contato alternativo do psicólogo só para quem precisa dele, e permitir editar o link pelo perfil.

## Escopo de implementação

### Novos campos em `SessaoListSerializer` e `SessaoDetailSerializer`

| campo | conteúdo |
|---|---|
| `sala_pendente_configuracao` | booleano — verdadeiro quando `tipo_sessao.tipo == 'online'` e `psicologo.link_sala_video` está vazio |
| `psicologo_contato_alternativo` | `{ "telefone": ..., "email": ... }`, ou `null` |

**Regra de exposição de `psicologo_contato_alternativo` — verificar com atenção:** só deve vir preenchido quando **simultaneamente** `sala_pendente_configuracao` é verdadeiro **e** o usuário autenticado da requisição é o paciente da sessão (não o psicólogo, que já conhece seus próprios dados, e não qualquer outro caso). Em qualquer outra condição, `null`. Usar `self.context['request'].user` no `SerializerMethodField`, seguindo o padrão já usado em outros serializers do projeto para acessar o usuário da requisição.

### Edição do link via perfil

Em `authentication/serializers.py`, `UserSerializer`:

- Adicionar `link_sala_video = serializers.URLField(source='psicologo_profile.link_sala_video', required=False, allow_blank=True, allow_null=True)`, no mesmo padrão de `specialization`/`biography`.
- Estender `UserSerializer.update()` para gravar `link_sala_video` quando presente em `psicologo_data`, mesmo bloco que já trata `specialization`/`biography`.
- Validar formato (`https://meet.google.com/...`) também aqui — mesma regra da issue 02, para impedir que o psicólogo salve um link inválido ao editar depois do cadastro.

## Tarefas

- [ ] Adicionar `sala_pendente_configuracao` aos dois serializers de sessão.
- [ ] Adicionar `psicologo_contato_alternativo`, com a regra de exposição restrita ao paciente.
- [ ] Adicionar `link_sala_video` a `UserSerializer`, editável via `PUT /api/auth/profile/`.
- [ ] Validar formato do link também na edição de perfil.
- [ ] Testes: `sala_pendente_configuracao` verdadeiro/falso nos três cenários (presencial, online configurado, online pendente).
- [ ] Testes: `psicologo_contato_alternativo` presente só quando paciente consulta sessão pendente; `null` para o próprio psicólogo consultando a mesma sessão; `null` para sessão presencial; `null` para sessão online já configurada.
- [ ] Testes: `PUT /api/auth/profile/` atualiza `link_sala_video` do psicólogo autenticado; rejeita formato inválido; não afeta paciente.

## Critérios de aceite

- ✅ Paciente com sessão online pendente recebe telefone e e-mail do psicólogo na resposta da sessão.
- ✅ Psicólogo nunca recebe `psicologo_contato_alternativo` preenchido (são os dados dele mesmo).
- ✅ Nenhum outro endpoint ou listagem expõe `psicologo_contato_alternativo` fora do cenário exato descrito.
- ✅ Psicólogo consegue configurar/editar o link pelo mesmo endpoint que já edita especialidade e biografia.
- ✅ Link mal formatado é rejeitado tanto no cadastro (issue 02) quanto na edição de perfil.

## Dependências

- Depende da issue 01.
- É pré-requisito das issues 04 e 05.
