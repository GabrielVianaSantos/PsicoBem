# Issue 03 — App: aviso prévio diferenciado e campo de motivo ao cancelar

**Fase:** 3 — Interface de confirmação
**Prioridade:** 🔴 Alta
**Arquivos principais:** `src/screens/detalhesSessao.js`, possível componente novo de confirmação com input
**Origem:** seção 3.5 de `SPEC_POLITICA_CANCELAMENTO_SESSAO.md`

## Problema

O `CustomAlert` usado hoje em `cancelarSessao()` (`src/screens/detalhesSessao.js`) não suporta campo de texto — não dá para pedir motivo dentro de um Alert simples. E hoje não existe nenhum aviso diferenciado para cancelamento tardio.

## Objetivo

Antes de confirmar um cancelamento tardio, avisar a pessoa e coletar o motivo (obrigatório para psicólogo, opcional para paciente), reaproveitando `sessao.cancelamento_seria_tardio` (issue 01) para decidir se mostra o fluxo diferenciado.

## Escopo de implementação

Em `cancelarSessao()` (`detalhesSessao.js`):

- Se `sessao.cancelamento_seria_tardio` for `false`: comportamento idêntico ao atual (`CustomAlert` de confirmação simples), sem pedir motivo.
- Se `sessao.cancelamento_seria_tardio` for `true`: abrir uma confirmação diferenciada, com:
  - Texto de aviso: algo como "Isso conta como cancelamento tardio (menos de 24h de antecedência) e ficará registrado."
  - Campo de texto para o motivo — **obrigatório** se `userType === 'psicologo'` (bloquear o botão de confirmar enquanto vazio), **opcional** se paciente (pode confirmar em branco).
  - Botão de confirmar chama `sessaoService.cancelarSessao(sessaoId, { motivo })`, passando o texto digitado (ou vazio).

### Decisão de implementação a registrar

O `CustomAlert` atual não suporta input de texto. Escolher e registrar nesta issue: (a) um modal próprio simples dentro da própria tela (`Modal` do React Native + `TextInputCustom`), ou (b) uma tela dedicada de confirmação. Recomendado (a), por ser mais leve e não exigir nova rota.

### `sessaoService.cancelarSessao`

Atualizar a assinatura para aceitar um `motivo` opcional e enviá-lo no corpo do `POST /sessoes/{id}/cancelar/` (issue 02 já aceita esse campo).

## Tarefas

- [ ] Implementar o aviso diferenciado condicionado a `cancelamento_seria_tardio`.
- [ ] Implementar o campo de motivo (obrigatório para psicólogo, opcional para paciente) — modal ou tela, conforme decisão registrada.
- [ ] Atualizar `sessaoService.cancelarSessao` para enviar `motivo`.
- [ ] Bloquear a confirmação do psicólogo enquanto o motivo estiver vazio.
- [ ] Testar manualmente: cancelamento dentro do prazo (sem mudança visível); cancelamento tardio de paciente (motivo opcional); cancelamento tardio de psicólogo (motivo obrigatório, botão desabilitado até preencher).

## Critérios de aceite

- ✅ Cancelamento dentro do prazo não mostra nenhuma tela/aviso novo.
- ✅ Cancelamento tardio mostra o aviso diferenciado para os dois papéis.
- ✅ Psicólogo não consegue confirmar cancelamento tardio sem preencher o motivo.
- ✅ Paciente consegue confirmar cancelamento tardio com o campo de motivo vazio.
- ✅ O motivo digitado chega ao backend e aparece persistido na sessão (conferir via issue 04 ou diretamente na API).

## Dependências

- Depende das issues 01 e 02.
- Independente da issue 04.
