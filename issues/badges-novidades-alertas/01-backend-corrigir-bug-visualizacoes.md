# Issue 01 — Backend: corrigir o bug que trava `total_visualizacoes` em zero

**Fase:** 1 — Causa raiz
**Prioridade:** 🔴 Alta
**Arquivos principais:** `psicoapp_backend/engajamentos/models.py`, `psicoapp_backend/engajamentos/tests.py`
**Origem:** seções 2.2 e 3.2 de `SPEC_BADGES_NOVIDADES_E_ALERTAS_CUSTOMIZADOS.md`

## Problema

`MensagemPaciente.marcar_como_curtida()` tenta contar a curtida também como uma visualização, para o caso (que é o único caminho real de uso hoje) de o paciente curtir sem ter chamado `/visualizar/` antes:

```python
def marcar_como_curtida(self):
    if self.status in ['enviada', 'visualizada']:
        self.status = 'curtida'
        self.curtida_em = timezone.now()
        if not self.visualizada_em:
            self.visualizada_em = timezone.now()   # <- já preenche aqui
        self.save()

        if not self.visualizada_em:                # <- nunca mais é None
            self.semente.total_visualizacoes += 1
        self.semente.total_curtidas += 1
        self.semente.save()
```

A segunda checagem `if not self.visualizada_em` sempre é falsa, porque `visualizada_em` já foi preenchido duas linhas acima na mesma chamada. Resultado: `total_visualizacoes` nunca incrementa por esse caminho — e como `/visualizar/` nunca é chamado pelo app (issue 06), esse é hoje o único caminho possível, então a contagem trava em zero mesmo com curtidas reais.

## Objetivo

Fazer `total_visualizacoes` incrementar corretamente na primeira curtida de um paciente que ainda não tinha visualizado a semente, sem duplicar contagem em curtidas repetidas.

## Escopo de implementação

### `psicoapp_backend/engajamentos/models.py`

Capturar o estado de "já tinha visualizado" **antes** de qualquer atribuição nesta chamada:

```python
def marcar_como_curtida(self):
    if self.status in ['enviada', 'visualizada']:
        ja_tinha_visualizado = bool(self.visualizada_em)
        self.status = 'curtida'
        self.curtida_em = timezone.now()
        if not ja_tinha_visualizado:
            self.visualizada_em = timezone.now()
        self.save()

        if not ja_tinha_visualizado:
            self.semente.total_visualizacoes += 1
        self.semente.total_curtidas += 1
        self.semente.save()
```

Não alterar `marcar_como_visualizada()` — já está correta e será exercitada de fato pela issue 06.

## Tarefas

- [ ] Corrigir `marcar_como_curtida()` conforme acima.
- [ ] Teste: curtir uma mensagem nunca visualizada incrementa `total_visualizacoes` e `total_curtidas` em 1 cada.
- [ ] Teste: curtir uma mensagem já `visualizada` (via `marcar_como_visualizada()` antes) incrementa só `total_curtidas`, não `total_visualizacoes` de novo.
- [ ] Teste: curtir duas vezes a mesma mensagem não incrementa nenhum contador na segunda vez (regressão do comportamento já existente).

## Critérios de aceite

- ✅ Curtida sem visualização prévia incrementa ambos os contadores em 1.
- ✅ Curtida após visualização prévia incrementa só `total_curtidas`.
- ✅ Curtida repetida não incrementa nada de novo.
- ✅ `marcar_como_visualizada()` permanece inalterada.

## Dependências

- Nenhuma. Isolado e testável imediatamente.
