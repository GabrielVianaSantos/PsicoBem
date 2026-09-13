# Issue 07 — Testes de regressão e validação ponta a ponta

**Fase:** 4 — Fechamento
**Prioridade:** 🟡 Média
**Arquivos principais:** nenhum (validação sobre as issues 01–06)
**Origem:** seções 5 e 6 de `SPEC_BADGES_NOVIDADES_E_ALERTAS_CUSTOMIZADOS.md`

## Problema

As issues 01 a 06 tocam em contagem de sementes, notificações e em 19 telas diferentes por causa da migração de alertas. É preciso validar o conjunto e confirmar ausência de regressão.

## Objetivo

Confirmar que os três itens da SPEC funcionam de ponta a ponta e que nada mais quebrou.

## Escopo de validação

### Badges de novidade

1. Como psicólogo, agendar uma sessão para um paciente: badge de "Sessões" acende para o paciente.
2. Como psicólogo, publicar uma semente: badge de "Sementes" acende para os pacientes vinculados.
3. Como paciente, curtir uma semente: badge de "Sementes" acende para o psicólogo.
4. Como paciente, criar um registro de Odisseia compartilhado: badge de "Odisseia" acende para o psicólogo.
5. Como psicólogo, comentar num registro de Odisseia (se a funcionalidade estiver disponível no ambiente de teste): badge de "Odisseia" acende para o paciente.
6. Abrir cada tela de destino e confirmar que o badge correspondente some ao voltar para a Home, sem afetar os outros badges.
7. Confirmar que um lembrete de sessão não acende o badge de Sessões.
8. Confirmar que o sininho e a tela de Notificações continuam mostrando tudo normalmente.

### Visualizações de Sementes

9. Como paciente, abrir a tela de Sementes sem curtir nada: `total_visualizacoes` aumenta para as sementes exibidas.
10. Como paciente, curtir uma semente nunca visualizada (ex.: em ambiente onde a visualização ainda não rodou): `total_visualizacoes` e `total_curtidas` aumentam juntos.
11. Curtir de novo a mesma semente: nenhum contador muda.

### Alertas customizados

12. Testar pelo menos um alerta de cada estilo (informativo, confirmação `cancel`+padrão, confirmação `destructive`) em pelo menos 5 das 19 telas migradas, priorizando fluxos críticos: login, cadastro, cancelar sessão, excluir semente, redefinir senha.
13. Confirmar visualmente a identidade do PsicoBem em todos os alertas testados.

### Regressão obrigatória

14. Login e cadastro (paciente e psicólogo) continuam funcionando.
15. Agendar, cancelar, remarcar, realizar e marcar falta em sessão continuam funcionando.
16. Criar, editar e excluir semente (psicólogo) continuam funcionando.
17. Rodar a suíte completa de testes do backend (`core`, `engajamentos`, `sessoes`, `authentication`).
18. `git diff --check` sem apontamentos.

## Tarefas

- [ ] Executar os cenários 1 a 13 no app.
- [ ] Executar os cenários de regressão 14 a 16.
- [ ] Rodar a suíte de testes do backend.
- [ ] `git diff --check` sem apontamentos.

## Critérios de aceite

- ✅ Todos os cenários 1 a 16 passam.
- ✅ Nenhum teste automatizado do backend quebrou.
- ✅ `git diff --check` passa sem apontamentos.

## Dependências

- Depende de todas as issues anteriores (01–06).
