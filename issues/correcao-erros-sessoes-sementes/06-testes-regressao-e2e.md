# Issue 06 — Testes de regressão e validação ponta a ponta

**Fase:** 4 — Fechamento
**Prioridade:** 🟡 Média
**Arquivos principais:** nenhum (validação sobre as issues 01–05)
**Origem:** seções 5 e 6 de `SPEC_CORRECAO_ERROS_SESSOES_SEMENTES.md`

## Problema

As issues 01 a 05 tocam em permissões de API, formatação de horário e dois novos fluxos de interface. É preciso validar o conjunto no app e confirmar que nenhum comportamento existente regrediu.

## Objetivo

Confirmar que os três defeitos reportados estão corrigidos e que nada mais quebrou.

## Escopo de validação

### Falta em sessão

1. Como psicólogo, abrir uma sessão futura em `agendada`: deve mostrar "Cancelar Sessão" e "Marcar como Realizada", **sem** "Marcar como Não Realizada" só se `pode_marcar_falta` também depender de tempo — conferir que a issue 03 não adicionou restrição de tempo (deve aparecer sempre que elegível, inclusive no futuro).
2. Como psicólogo, abrir uma sessão cujo horário já passou (ainda em `agendada`/`confirmada`): "Cancelar Sessão" não aparece (regra pré-existente), mas "Marcar como Não Realizada" aparece.
3. Confirmar a ação: status muda para "Paciente Faltou", `status_pagamento` não muda.
4. Como paciente, abrir a mesma sessão: o botão "Marcar como Não Realizada" nunca aparece.
5. Em "Minhas Sessões" (paciente), a sessão marcada aparece com rótulo "Não Realizada" e é encontrável pelo filtro correspondente.
6. Paciente recebe a notificação da mudança.
7. Tentar marcar como não realizada uma sessão já `realizada`/`cancelada`: deve ser rejeitado.

### Sementes do Cuidado

8. Como psicólogo, editar uma semente própria: lista reflete a alteração.
9. Cancelar uma edição em andamento: formulário limpa, lista permanece intacta.
10. Como psicólogo, excluir uma semente própria com confirmação: ela some da lista.
11. Chamada direta autenticada como paciente para `PATCH`/`DELETE /sementes-cuidado/{id}/` numa semente do psicólogo vinculado: deve ser rejeitada.
12. Como paciente, abrir a tela de sementes (`sementesPaciente.js`): nenhuma mudança visual ou funcional, sem botões de editar/excluir.

### Horário divergente

13. Em "Minhas Sessões", o horário do card "Próxima Sessão" é idêntico ao horário do mesmo item na lista abaixo.
14. Em `HomePaciente`, o card de próxima sessão mostra o mesmo horário visto em `DetalhesSessao`/`MinhasSessoes` para a mesma sessão.
15. Ao agendar uma nova sessão, a notificação "Sessão Agendada" (inbox e, se testável, push) mostra o horário correto.
16. Ao cancelar uma sessão, a notificação "Sessão Cancelada" mostra o horário correto.
17. Se aplicável no ambiente de teste, conferir um lembrete push (24h/2h/15min) com horário correto.

### Regressão obrigatória

18. Cancelar uma sessão futura (fluxo já existente): continua funcionando.
19. Marcar uma sessão como "Realizada" (fluxo já existente): continua funcionando, sem exigir papel específico (comportamento pré-existente, não alterado por este backlog).
20. Confirmar pagamento de uma sessão realizada: continua funcionando.
21. Remarcar uma sessão: continua funcionando.
22. Login e cadastro (paciente e psicólogo): inalterados.
23. `git diff --check` sem apontamentos.
24. Rodar a suíte completa de testes do backend (`sessoes`, `engajamentos`, `authentication`, `core`, `notificacoes_push`).

## Tarefas

- [ ] Executar os cenários 1 a 17 no app (dispositivo ou emulador).
- [ ] Executar os cenários de regressão 18 a 22.
- [ ] Rodar a suíte de testes do backend uma última vez.
- [ ] `git diff --check` sem apontamentos.

## Critérios de aceite

- ✅ Todos os cenários 1 a 22 passam.
- ✅ Nenhum teste automatizado do backend quebrou.
- ✅ `git diff --check` passa sem apontamentos.

## Dependências

- Depende de todas as issues anteriores (01–05).
