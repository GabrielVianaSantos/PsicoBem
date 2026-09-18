# Issue 01 — Backend: prontuário sobrevive à exclusão do paciente

**Fase:** 1 — Fundação
**Prioridade:** 🔴 Alta
**Arquivos principais:** `psicoapp_backend/core/models.py`, `psicoapp_backend/core/serializers.py`, `psicoapp_backend/core/migrations/`, `psicoapp_backend/core/tests.py`
**Origem:** seção 3.3 de `SPEC_EXCLUSAO_CONTA.md`

## Problema

Hoje `Prontuario.paciente` é `on_delete=models.CASCADE`. Se um paciente excluir a própria conta antes desta issue, os prontuários que o psicólogo escreveu sobre ele desaparecem junto — o que a SPEC decidiu explicitamente **não** deveria acontecer. Além disso, `Prontuario.__str__` e `ProntuarioSerializer.paciente_nome` leem `self.paciente.user.first_name` ao vivo; se `paciente` puder ser `None`, isso quebra com `AttributeError`.

## Objetivo

Fazer o prontuário sobreviver à exclusão do paciente, com um nome "congelado" disponível independente do vínculo ainda existir, sem quebrar nenhuma leitura existente.

## Escopo de implementação

### Alteração de modelo (`core/models.py`)

```python
class Prontuario(models.Model):
    psicologo = models.ForeignKey(Psicologo, on_delete=models.CASCADE, related_name='prontuarios_criados')
    paciente = models.ForeignKey(
        Paciente, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='prontuarios',
    )
    paciente_nome_snapshot = models.CharField(max_length=255, blank=True, default='')
    ...
```

- `save()`: preencher `paciente_nome_snapshot` automaticamente quando ainda estiver vazio e `paciente_id` existir (nome completo do paciente naquele momento). Não sobrescrever um snapshot já preenchido.
- `__str__`: usar `paciente_nome_snapshot` (ou, na ausência dele, `"paciente removido"`) quando `paciente_id` for `None`, em vez de tentar acessar `self.paciente.user`.

### Migração

- Migration de schema (`AlterField` para `SET_NULL`/`null=True`/`blank=True`, `AddField` para `paciente_nome_snapshot`).
- Migration de dados (`RunPython`) preenchendo `paciente_nome_snapshot` para todos os prontuários já existentes, lendo `paciente.user.first_name`/`last_name` enquanto o vínculo ainda existe — nenhum prontuário deve ficar sem snapshot depois do deploy desta issue.

### Serializer (`core/serializers.py`)

- `ProntuarioSerializer.paciente_nome`: de `CharField(source='paciente.user.first_name')` para `SerializerMethodField()` — devolve `obj.paciente.user.first_name` se `obj.paciente_id` existir, senão `obj.paciente_nome_snapshot or 'Paciente removido'`.
- Novo campo `paciente_removido = serializers.SerializerMethodField()` → `obj.paciente_id is None`.
- Adicionar os dois campos a `Meta.fields`.

## Tarefas

- [ ] Alterar `Prontuario.paciente` para `SET_NULL`/`null=True`/`blank=True`.
- [ ] Adicionar `paciente_nome_snapshot` com preenchimento automático em `save()`.
- [ ] Ajustar `__str__` para não quebrar com `paciente=None`.
- [ ] Migration de schema + migration de dados (backfill do snapshot para prontuários existentes).
- [ ] Ajustar `ProntuarioSerializer` (`paciente_nome` como `SerializerMethodField`, novo `paciente_removido`).
- [ ] Testes: criar prontuário → `paciente_nome_snapshot` preenchido automaticamente; simular exclusão do paciente (`paciente.user.delete()`) → prontuário continua existindo, `paciente_id IS NULL`, snapshot preservado; serializar esse prontuário não gera exceção e devolve `paciente_removido: true`; prontuário com paciente ainda vinculado continua devolvendo o nome ao vivo (comportamento antigo preservado); `python manage.py makemigrations --check` sem pendência.

## Critérios de aceite

- ✅ Excluir o `CustomUser`/`Paciente` de um paciente com prontuários associados **não** apaga os prontuários — eles continuam com `paciente_id IS NULL`.
- ✅ `paciente_nome_snapshot` está preenchido em todo prontuário (novo ou pré-existente via backfill) antes do fim desta issue.
- ✅ `ProntuarioSerializer` nunca lança `AttributeError`/500 para um prontuário com `paciente=None`.
- ✅ Prontuário com paciente ainda ativo continua se comportando exatamente como antes (sem regressão).

## Dependências

- Nenhuma. É a base — a issue 02 depende desta para o critério de aceite de sobrevivência do prontuário ser real.
