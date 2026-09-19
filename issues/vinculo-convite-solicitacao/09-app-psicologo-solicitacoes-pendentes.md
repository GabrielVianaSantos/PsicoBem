# Issue 09 — App: aba de solicitações pendentes (psicólogo)

**Fase:** 5 — Telas do psicólogo
**Prioridade:** 🔴 Alta
**Arquivos principais:** `src/screens/vinculosPacientes.js`
**Origem:** seções 3.9 e 3.11 de `SPEC_VINCULO_CONVITE_E_SOLICITACAO.md`

## Problema

Com o CRP passando a criar solicitações pendentes (issue 06), o psicólogo precisa de um lugar para decidir. Hoje `vinculosPacientes.js` só tem o filtro `ativos`/todos e a ação de alterar status.

## Objetivo

Uma aba "Solicitações" com badge de contagem, listando os pendentes com aceitar e recusar.

## Escopo de implementação

- Novo filtro/aba **"Solicitações"** ao lado dos existentes, alimentado por `getSolicitacoesPendentes()`.
- **Badge com a contagem** de pendentes, seguindo o padrão de badges já estabelecido no projeto (`SPEC_BADGES_NOVIDADES_E_ALERTAS_CUSTOMIZADOS.md`).
- Cada item mostra nome do paciente, data da solicitação e **quantos dias faltam para expirar** (5 dias no total).
- Ações **Aceitar** e **Recusar**, ambas com confirmação via `CustomAlert` (padrão do projeto), recarregando a lista depois.
- `STATUS_CONFIG` ganha entradas para `pendente`, `recusado` e `expirado`.
- O filtro atual (`ativos`/todos) e a ação `alterarStatus` **não mudam** — e, por decisão registrada, `alterarStatus` continua **não** apagando prontuário nem cancelando sessões.

## Tarefas

- [ ] Adicionar o filtro "Solicitações" e o carregamento correspondente.
- [ ] Badge de contagem de pendentes.
- [ ] Item da lista com prazo de expiração visível.
- [ ] Ações aceitar/recusar com confirmação e recarga.
- [ ] Ampliar `STATUS_CONFIG` com os três status novos.
- [ ] Ponto de entrada para a tela "Convidar paciente" (issue 08) a partir desta tela.
- [ ] Regressão: filtro de ativos e alteração de status seguem funcionando como antes.

## Critérios de aceite

- ✅ Solicitações pendentes aparecem com badge e podem ser aceitas ou recusadas.
- ✅ Solicitação expirada não aparece como pendente.
- ✅ Nenhuma regressão no comportamento atual da tela.

## Dependências

Depende das issues 06, 07 e 08.
