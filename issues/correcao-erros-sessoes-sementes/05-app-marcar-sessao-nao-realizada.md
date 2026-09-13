# Issue 05 — App: botão "Marcar como Não Realizada" e novo status em Minhas Sessões

**Fase:** 3 — Interface
**Prioridade:** 🟡 Média
**Arquivos principais:** `src/services/sessaoService.js`, `src/screens/detalhesSessao.js`, `src/screens/minhasSessoes.js`
**Origem:** seções 2.1 e 3.1 de `SPEC_CORRECAO_ERROS_SESSOES_SEMENTES.md`

## Problema

Não há, no app, nenhum caminho para acionar o endpoint criado na issue 03. Além disso, `minhasSessoes.js` (tela do paciente) não sabe exibir o status `faltou`: `STATUS_CONFIG` e `FILTROS` só cobrem `agendada`, `confirmada`, `realizada`, `cancelada`, então uma sessão `faltou` cairia no fallback `STATUS_CONFIG.agendada` (rótulo "Agendada", incorreto) e não apareceria em nenhum filtro específico.

## Objetivo

Permitir que o psicólogo marque uma sessão como "Não Realizada" a partir da tela de detalhes, e que o paciente veja esse status corretamente identificado em "Minhas Sessões".

## Escopo de implementação

### `src/services/sessaoService.js`

Novo método, no mesmo padrão de `cancelarSessao`/`confirmarRealizacao`:

```js
async marcarNaoRealizada(id) {
  // POST /sessoes/{id}/nao-realizada/
}
```

### `src/screens/detalhesSessao.js`

- Importar `useAuth` (`../hooks/useAuth`) e desestruturar `userType`.
- Nova função `marcarNaoRealizada()`, análoga a `realizarSessao()`: `Alert` de confirmação ("Confirmar que esta sessão não foi realizada (falta do paciente)?") → `sessaoService.marcarNaoRealizada(sessaoId)` → em sucesso, `Alert` de sucesso + `carregarSessao()`; em erro, `Alert` com a mensagem.
- Novo botão, renderizado apenas quando `userType === 'psicologo' && sessao.pode_marcar_falta`, com texto "Marcar como Não Realizada" e cor `#8D6E63` (mesma já usada como cor do status `faltou` em `getStatusColor`), posicionado ao lado do botão "Marcar como Realizada".
- Não alterar a lógica ou visibilidade dos botões "Cancelar Sessão" e "Marcar como Realizada" — ambos continuam exatamente como hoje (sem checagem de papel, comportamento pré-existente e fora de escopo).

### `src/screens/minhasSessoes.js`

- Adicionar `faltou` a `STATUS_CONFIG`: `{ label: 'Não Realizada', cor: '#EFEBE9', textoCor: '#5D4037' }` (tom compatível com a cor `#8D6E63` já usada em outras telas para este status).
- Adicionar `'faltou'` a `FILTROS`.

## Tarefas

- [ ] Adicionar `marcarNaoRealizada` a `sessaoService.js`.
- [ ] Importar `useAuth` em `detalhesSessao.js` e obter `userType`.
- [ ] Implementar `marcarNaoRealizada()` com `Alert` de confirmação.
- [ ] Adicionar o botão condicionado a `userType === 'psicologo' && sessao.pode_marcar_falta`.
- [ ] Adicionar `faltou` a `STATUS_CONFIG` e `FILTROS` em `minhasSessoes.js`.
- [ ] Testar manualmente como psicólogo e como paciente (ver critérios abaixo).

## Critérios de aceite

- ✅ Como psicólogo, uma sessão elegível (`agendada`/`confirmada`/`remarcada`) mostra o botão "Marcar como Não Realizada".
- ✅ Como paciente, o botão nunca aparece, mesmo que `pode_marcar_falta` seja `true` no payload.
- ✅ Confirmar a ação atualiza a tela de detalhes com o novo status.
- ✅ Em "Minhas Sessões", uma sessão `faltou` aparece com o rótulo "Não Realizada" (não mais o fallback "Agendada") e pode ser filtrada por esse status.
- ✅ Os botões "Cancelar Sessão" e "Marcar como Realizada" continuam se comportando exatamente como antes.

## Dependências

- Depende da issue 03 (o endpoint `nao-realizada` e o campo `pode_marcar_falta` precisam existir).
- Recomenda-se ter a issue 02 concluída antes do teste manual, para não confundir horário incorreto com o novo status sendo testado.
- Independente da issue 04.
