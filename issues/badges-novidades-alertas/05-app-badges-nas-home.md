# Issue 05 — App: badges de novidade nos cards de menu das telas Home

**Fase:** 3 — Badges
**Prioridade:** 🔴 Alta
**Arquivos principais:** `src/services/notificationService.js`, `src/screens/home.js`, `src/screens/homePaciente.js`, `src/screens/sementesPaciente.js`, `src/screens/sementesCuidado.js`, `src/screens/minhasSessoes.js`, `src/screens/sessoes.js`, `src/screens/RegistrosOdisseia.js`
**Origem:** seção 3.1 de `SPEC_BADGES_NOVIDADES_E_ALERTAS_CUSTOMIZADOS.md`

## Problema

Não há hoje nenhum indicador visual nos cards de menu das Home avisando que existe algo novo (sessão, semente, like, registro de Odisseia) sem o usuário precisar abrir a tela de Notificações.

## Objetivo

Acender um indicador visual (bolinha, sem número) nos cards **Sementes**, **Sessões** e **Odisseia** de ambas as Home quando houver notificação não lida da categoria correspondente, e apagá-lo ao visitar a tela de destino.

## Escopo de implementação

### `src/services/notificationService.js`

Dois métodos novos, seguindo o padrão já usado no arquivo:

```js
async getResumoPorCategoria()      // GET /notificacoes/resumo-por-categoria/
async marcarCategoriaLida(categoria)  // POST /notificacoes/marcar-categoria-lida/
```

### `src/screens/home.js` (psicólogo)

- Incluir `getResumoPorCategoria()` no `Promise.all` já existente em `carregarDados()`.
- Renderizar um badge (bolinha `#EF5350`, `position: 'absolute'`, canto superior do card/ícone) no card **Registros de Odisseia** quando `resumo.odisseia`, no card **Sementes do Cuidado** quando `resumo.sementes`, e no link/seção "Sessões de Hoje" (ou no texto "ver todas") quando `resumo.sessoes`.

### `src/screens/homePaciente.js`

- Mesmo tratamento nos cards **Odisseia**, **Sessões** e **Sementes** da grade "Ferramentas".

### `src/screens/sementesPaciente.js`, `src/screens/sementesCuidado.js`

- No `useFocusEffect` de cada tela, chamar `notificationService.marcarCategoriaLida('sementes')`.

### `src/screens/minhasSessoes.js`, `src/screens/sessoes.js`

- No `useFocusEffect` de cada tela, chamar `notificationService.marcarCategoriaLida('sessoes')`.

### `src/screens/RegistrosOdisseia.js`

- No `useFocusEffect`, chamar `notificationService.marcarCategoriaLida('odisseia')` (vale tanto para a instância de paciente quanto de psicólogo, já que é a mesma tela/rota nos dois perfis).

## Tarefas

- [ ] Adicionar os dois métodos a `notificationService.js`.
- [ ] Buscar o resumo por categoria em `home.js` e `homePaciente.js`.
- [ ] Renderizar os badges nos 3 pontos de cada Home (6 pontos no total).
- [ ] Chamar `marcarCategoriaLida` nas 5 telas de destino.
- [ ] Testar manualmente: gerar cada tipo de notificação, confirmar o badge certo acende, abrir a tela de destino, voltar para a Home e confirmar que o badge sumiu.

## Critérios de aceite

- ✅ Nova sessão agendada acende "Sessões" para o destinatário certo (paciente e/ou psicólogo).
- ✅ Nova semente acende "Sementes" para o paciente; curtida acende "Sementes" para o psicólogo.
- ✅ Novo registro de Odisseia acende "Odisseia" para o psicólogo; comentário do psicólogo acende "Odisseia" para o paciente.
- ✅ Visitar a tela de destino apaga o badge daquele assunto, sem afetar os outros dois.
- ✅ `sessao_lembrete` nunca acende o badge de Sessões.
- ✅ O sininho/contagem geral de notificações não é afetado por essa mudança.

## Dependências

- Depende da issue 02 (endpoints precisam existir).
- Independente das issues 03, 04 e 06.
