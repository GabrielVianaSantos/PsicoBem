# Issue 01 — Backend: sala vinculada à sessão e configuração do Jitsi

**Fase:** 1 — Fundação
**Prioridade:** 🔴 Alta
**Arquivos principais:** `psicoapp_backend/sessoes/models.py`, `psicoapp_backend/sessoes/migrations/`, `psicoapp_backend/psicoapp_backend/settings.py`, `psicoapp_backend/sessoes/views.py`
**Origem:** seção 3.1 de `SPEC_SESSOES_ONLINE_JITSI.md`

## Problema

Não existe nenhum conceito de sala de videoconferência no modelo. O discriminador de modalidade já existe (`TipoSessao.TIPO_CHOICES` com `presencial`/`online`, em `sessoes/models.py:60`), mas nada é derivado dele.

## Objetivo

Dar a cada sessão **online** um identificador de sala próprio e inadivinhável, mantendo a URL como configuração e não como dado, para que a instância do Jitsi possa ser trocada sem migração.

## Escopo de implementação

### Campo novo em `Sessao`

```python
sala_uuid = models.UUIDField(null=True, blank=True, unique=True, editable=False,
                             verbose_name='Identificador da Sala Online')
```

**Guardar o identificador, nunca a URL completa.** A URL é montada em tempo de leitura: `f"{settings.JITSI_BASE_URL}/psicobem-{sala_uuid.hex}"`.

Isso permite migrar de `meet.jit.si` para JaaS ou instância própria trocando uma variável de ambiente. Se a URL fosse persistida, a migração exigiria reescrever todas as linhas.

### Regras de geração

1. **Criação**: se `tipo_sessao.tipo == 'online'`, gerar `sala_uuid` (`uuid.uuid4()`). Se `presencial`, deixar `NULL`.
2. **Remarcação** (alteração de `data_hora`): **regerar** o `sala_uuid`. Limita a janela de exposição de um link possivelmente vazado, a custo zero — a remarcação já obriga a atualizar a agenda porque a data mudou.
3. **Troca de `tipo_sessao`**: `presencial → online` gera o UUID; `online → presencial` limpa o campo.
4. Geração resiliente a colisão de `unique` (retry), ainda que a probabilidade seja desprezível.

Implementar preferencialmente no `save()` do modelo ou em helper dedicado, e garantir que o caminho de remarcação nas views passe por ele.

### Configuração em `settings.py`

```python
JITSI_BASE_URL = os.getenv("JITSI_BASE_URL", "https://meet.jit.si").rstrip("/")
JITSI_ENABLED = env_bool("JITSI_ENABLED", "True")
```

Reaproveitar o helper `env_bool()` que **já existe** em `settings.py:13` — não escrever outro parser.

Com `JITSI_ENABLED` falso, nenhuma sala é gerada.

### Migration

Campo nullable → aplica sem prompt interativo e sem downtime. Sessões existentes ficam com `NULL`; sessões online antigas só ganham sala se forem remarcadas ou editadas.

> Decidir e registrar na própria issue: fazer ou não um backfill para sessões online **futuras** já existentes. Recomendado sim, via `RunPython` idempotente, para que a feature já nasça útil.

## Tarefas

- [ ] Adicionar `sala_uuid` a `Sessao`.
- [ ] Implementar a geração na criação, condicionada a `tipo_sessao.tipo == 'online'` e a `JITSI_ENABLED`.
- [ ] Implementar a regeneração na alteração de `data_hora`.
- [ ] Tratar a troca de `tipo_sessao` nos dois sentidos.
- [ ] Implementar helper que devolve a URL derivada a partir de `JITSI_BASE_URL`.
- [ ] Adicionar `JITSI_BASE_URL` e `JITSI_ENABLED` ao `settings.py` usando `env_bool()`.
- [ ] Gerar a migration; avaliar e implementar o backfill de sessões online futuras.
- [ ] Testes: geração só para online; ausência para presencial; regeneração na remarcação; URL correta com `JITSI_BASE_URL` alternativa e com barra final; `JITSI_ENABLED` falso não gera nada.

## Critérios de aceite

- ✅ Sessão online criada recebe `sala_uuid`; presencial permanece `NULL`.
- ✅ Remarcar gera um `sala_uuid` diferente do anterior.
- ✅ Alterar `JITSI_BASE_URL` muda a URL de todas as sessões, sem tocar no banco.
- ✅ `JITSI_BASE_URL` com barra final não produz URL com barra dupla.
- ✅ Com `JITSI_ENABLED=False`, nenhuma sala é gerada.
- ✅ `python manage.py makemigrations --check` não acusa pendência; a migration aplica sem prompt.
- ✅ Nenhum campo novo é exposto em API nesta issue.

## Dependências

- Nenhuma. É a base do backlog; 02, 03 e 05 dependem desta.
