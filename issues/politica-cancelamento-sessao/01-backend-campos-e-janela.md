# Issue 01 — Backend: campos de cancelamento e janela de 24h

**Fase:** 1 — Fundação
**Prioridade:** 🔴 Alta
**Arquivos principais:** `psicoapp_backend/sessoes/models.py`, `psicoapp_backend/sessoes/migrations/`, `psicoapp_backend/sessoes/serializers.py`
**Origem:** seções 3.1, 3.2 e 3.5 de `SPEC_POLITICA_CANCELAMENTO_SESSAO.md`

## Problema

Não existe hoje nenhum registro de **quem** cancelou uma sessão, **se** foi com pouca antecedência, nem **por quê** — e o app não tem como saber, antes de cancelar, se a ação vai ser considerada tardia.

## Objetivo

Criar a base de dados e o cálculo da janela de 24h, sem alterar ainda o comportamento do endpoint de cancelar (issue 02).

## Escopo de implementação

### Campos novos em `Sessao`

```python
cancelado_por = models.CharField(
    max_length=10,
    choices=[('paciente', 'Paciente'), ('psicologo', 'Psicólogo')],
    null=True, blank=True,
)
cancelamento_tardio = models.BooleanField(default=False)
motivo_cancelamento = models.TextField(null=True, blank=True)
```

Nullable/blank, sem backfill — sessões já canceladas antes desta feature ficam com os três campos vazios.

### Propriedade `cancelamento_seria_tardio`

```python
@property
def cancelamento_seria_tardio(self):
    return (self.data_hora - timezone.now()) < timedelta(hours=24)
```

Não depende de `sala_url`/modalidade — vale igual para sessão presencial e online. Não depende de `status` (é sobre a janela de tempo, não sobre se pode ou não cancelar — `pode_ser_cancelada()` continua sendo a checagem de elegibilidade).

### Exposição no serializer

Em `SessaoListSerializer` e `SessaoDetailSerializer`, campos somente-leitura: `cancelado_por`, `cancelado_por_display` (usar `get_cancelado_por_display()`), `cancelamento_tardio`, `motivo_cancelamento`, `cancelamento_seria_tardio`.

## Tarefas

- [ ] Adicionar os três campos a `Sessao` + migration (`AddField`, sem backfill).
- [ ] Implementar `cancelamento_seria_tardio` como propriedade do modelo.
- [ ] Expor os cinco campos nos dois serializers de sessão.
- [ ] Testes: `cancelamento_seria_tardio` nos pontos de fronteira (23h59 antes vs. 24h01 antes, mesmo padrão de teste de fronteira já usado em `pode_entrar_na_sala`); campos novos aparecem `null`/`false` em sessão nunca cancelada; `python manage.py makemigrations --check` sem pendência.

## Critérios de aceite

- ✅ `cancelamento_seria_tardio` é `True` quando faltam menos de 24h para `data_hora`, `False` caso contrário, para presencial e online.
- ✅ Sessão nunca cancelada expõe os três campos de cancelamento como `null`/`false`.
- ✅ Migration aplica sem prompt interativo.
- ✅ Nenhuma mudança de comportamento no endpoint `cancelar()` ainda (isso é a issue 02).

## Dependências

- Nenhuma. É a base do backlog; 02, 03 e 04 dependem desta.
