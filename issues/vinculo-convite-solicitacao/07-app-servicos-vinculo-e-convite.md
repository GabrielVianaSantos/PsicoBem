# Issue 07 — App: serviços de vínculo e convite

**Fase:** 4 — Camada de serviço do app
**Prioridade:** 🔴 Alta
**Arquivos principais:** `src/services/vinculoService.js`, novo `src/services/conviteService.js`
**Origem:** seção 3.11 de `SPEC_VINCULO_CONVITE_E_SOLICITACAO.md`

## Problema

`vinculoService.js` hoje só cobre o que o psicólogo já fazia (`getVinculos`, `getVinculosAtivos`, `getPacientesVinculados`, `alterarStatusVinculo`, `getResumoVinculo`). Nenhum dos endpoints novos tem cliente no app.

## Objetivo

Isolar toda a comunicação com os endpoints novos em serviços, antes de qualquer tela ser escrita — nenhuma tela chama `api` diretamente.

## Escopo de implementação

### `src/services/vinculoService.js` (ampliar)

- `getSolicitacoesPendentes()`
- `aceitarSolicitacao(vinculoId)`
- `recusarSolicitacao(vinculoId)`
- `encerrarVinculo(vinculoId)` → envia `{ confirmar: true }`

### Novo `src/services/conviteService.js`

- `getMeuLink()`
- `criarConvite({ apelido })`
- `listarConvites()`
- `revogarConvite(conviteId)`
- `resolverConvite({ codigo, slug })`
- `aceitarConvite({ codigo, slug, confirmarTroca })`

## Tarefas

- [ ] Ampliar `vinculoService` com os quatro métodos, seguindo o padrão de retorno (`{ success, data, message }`) já usado no arquivo.
- [ ] Criar `conviteService` no mesmo padrão.
- [ ] Tratar explicitamente o `409` de `aceitarConvite` (troca não confirmada) devolvendo o resumo do que será perdido, para a tela poder exibi-lo.
- [ ] Normalizar o código digitado antes de enviar (maiúsculas, hífen opcional), espelhando a normalização do backend.
- [ ] Garantir que nenhuma tela criada nas issues 08–11 chame `api` diretamente.

## Critérios de aceite

- ✅ Todos os endpoints das issues 05 e 06 têm método correspondente.
- ✅ Padrão de retorno e de tratamento de erro idêntico ao já existente nos serviços do projeto.

## Dependências

Depende das issues 05 e 06 (endpoints no ar). É dependência das issues 08 a 11.
