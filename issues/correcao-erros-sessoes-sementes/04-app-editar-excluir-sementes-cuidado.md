# Issue 04 — App: editar e excluir Sementes do Cuidado (visão do psicólogo)

**Fase:** 3 — Interface
**Prioridade:** 🟡 Média
**Arquivos principais:** `src/services/odisseiaService.js`, `src/screens/sementesCuidado.js`
**Origem:** seções 2.2 e 3.2 de `SPEC_CORRECAO_ERROS_SESSOES_SEMENTES.md`

## Problema

`sementesCuidado.js` só tem o formulário "Plantar Nova Semente" e a lista "Seu Jardim de Sementes"; cada card é somente leitura, sem botão de editar ou excluir. `odisseiaService.js` só tem `getSementesCuidado` e `createSementeCuidado`. O backend já suporta `PATCH`/`DELETE /sementes-cuidado/{id}/` (via `ModelViewSet`) — falta apenas consumir essas rotas na interface.

## Objetivo

Permitir que o psicólogo corrija erros de digitação ou remova uma semente publicada por engano, sem alterar nada na experiência do paciente.

## Escopo de implementação

### `src/services/odisseiaService.js`

Dois métodos novos, seguindo o padrão try/catch já usado por `createSementeCuidado`:

```js
async updateSementeCuidado(id, dados)   // PATCH /sementes-cuidado/{id}/
async deleteSementeCuidado(id)          // DELETE /sementes-cuidado/{id}/
```

### `src/screens/sementesCuidado.js`

- Novo estado `sementeEmEdicao` (guarda o `id` da semente sendo editada, ou `null`).
- O formulário existente (`titulo`/`conteudo`) passa a ser reaproveitado tanto para criar quanto para editar:
  - Ao clicar em "editar" num card, preencher `titulo`/`conteudo` com os dados da semente e guardar seu `id` em `sementeEmEdicao`.
  - O botão de salvar chama `createSementeCuidado` quando `sementeEmEdicao` for `null`, ou `updateSementeCuidado(sementeEmEdicao, {...})` quando não for; texto do botão muda para "Salvar Alterações" no modo edição.
  - Um botão/ícone de "cancelar edição" limpa `sementeEmEdicao` e os campos, sem perder a lista carregada.
- Cada `cardSemente` ganha dois ícones de ação (`create-outline` para editar, `trash-outline` para excluir), no mesmo estilo visual do restante do app (`Ionicons`, cor `#11B5A4` para editar e uma cor de alerta para excluir, ex. `#EF5350`, consistente com `btnCancelar`/`btnCancelarText` já usados em outras telas do app).
- Excluir: `Alert` de confirmação ("Tem certeza que deseja excluir esta semente?") → `deleteSementeCuidado(item.id)` → recarregar a lista (`carregarSementes()`) e, se a semente excluída estava em edição, limpar `sementeEmEdicao`.
- Após editar ou excluir com sucesso, recarregar a lista.
- Não alterar `sementesPaciente.js`.

## Tarefas

- [ ] Adicionar `updateSementeCuidado` e `deleteSementeCuidado` a `odisseiaService.js`.
- [ ] Adicionar estado `sementeEmEdicao` e adaptar `handleSalvar` para criar ou atualizar conforme o modo.
- [ ] Adicionar botão/link de "cancelar edição".
- [ ] Adicionar ícones de editar/excluir em cada card, com handlers correspondentes.
- [ ] Adicionar confirmação (`Alert`) antes de excluir.
- [ ] Recarregar a lista após editar/criar/excluir com sucesso.
- [ ] Testar manualmente: criar, editar, cancelar uma edição em andamento, excluir.

## Critérios de aceite

- ✅ O psicólogo consegue editar título e conteúdo de uma semente própria; a lista reflete a alteração após salvar.
- ✅ O psicólogo consegue excluir uma semente própria, com confirmação prévia; ela some da lista.
- ✅ Cancelar uma edição em andamento não perde os dados já carregados na lista, nem deixa o formulário travado em modo edição.
- ✅ `sementesPaciente.js` não sofre nenhuma alteração visual ou funcional.
- ✅ Uma tentativa de editar/excluir que falhe no backend (ex.: rede) mostra `Alert` de erro, sem quebrar a tela.

## Dependências

- Depende da issue 01 (a UI de edição não deve ser publicada enquanto o gap de permissão do backend estiver aberto).
- Independente das issues 02, 03 e 05.
