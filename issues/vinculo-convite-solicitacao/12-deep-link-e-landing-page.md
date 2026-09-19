# Issue 12 — Deep link, landing page e rebuild EAS

**Fase:** 7 — Conveniência (opcional)
**Prioridade:** 🟢 Baixa
**Arquivos principais:** `app.json`, `src/routes.js`, `src/navigationRef.js`, infraestrutura da VPS
**Origem:** seção 3.12 de `SPEC_VINCULO_CONVITE_E_SOLICITACAO.md`

## Problema

O app **não tem deep link nenhum hoje**: `app.json` não tem `scheme`, nem `intentFilters` (Android), nem `bundleIdentifier`/`associatedDomains` (iOS), e o `NavigationContainer` (`src/routes.js:80`) não recebe a prop `linking`. Qualquer link só passa a abrir o app depois de configuração nativa nova **e um novo build EAS**.

## Objetivo

Fazer o link do convite abrir o app direto — sem que a feature dependa disso para funcionar.

> **Esta issue é conveniência, não requisito.** As issues 01–11 entregam a feature completa usando o código curto. Se o deep link atrasar ou falhar, nada do que foi entregue quebra.

## Escopo de implementação

### Landing page (VPS)

- Rota `https://<host>/c/<slug>` e `https://<host>/c/<slug>?i=<codigo>`, servida pelo reverse-proxy já existente.
- O link **não** aponta direto para o app: abre uma página que tenta abrir o app e, se ele não estiver instalado, mostra o nome do profissional, o **código curto em destaque** e o link da loja.
- É isso que resolve o paciente que ainda não tem o app: o código sobrevive à instalação, o deep link não.

### Configuração nativa

- `scheme` em `app.json`.
- `intentFilters` de App Links no Android + `assetlinks.json` publicado no host.
- **Novo build EAS** — configuração nativa não entra por OTA.
- iOS fica fora: o projeto não tem `bundleIdentifier` configurado.

### App

- Tratamento do link de entrada reaproveitando o `navigationRef` já existente (`src/navigationRef.js`), no mesmo padrão que `notificationService.setupNotificationListeners` usa para push (`routes.js:62`) — sem montar a configuração declarativa `linking` completa do React Navigation.
- O link resolvido leva direto a `ConfirmarVinculo` (issue 10), com o código já preenchido.
- Link aberto por usuário **não logado**: guardar o código e retomar o fluxo após o login.

## Tarefas

- [ ] Publicar a landing page e o `assetlinks.json` na VPS.
- [ ] `scheme` + `intentFilters` em `app.json`.
- [ ] Tratamento do link via `navigationRef`, incluindo o caso de usuário não logado.
- [ ] Novo build EAS e instalação no dispositivo de teste.
- [ ] Validar: link com app instalado abre direto em `ConfirmarVinculo`; link sem app mostra a landing com o código.
- [ ] Regressão: o roteamento de push existente continua funcionando.

## Critérios de aceite

- ✅ O link abre o app direto, com o convite já resolvido.
- ✅ Sem o app instalado, a landing entrega o código curto de forma legível.
- ✅ Nada nas issues 01–11 depende desta issue para funcionar.

## Dependências

Depende da issue 10. Pode ser feita depois do lançamento.
