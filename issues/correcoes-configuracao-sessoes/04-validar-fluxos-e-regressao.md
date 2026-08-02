# Issue 04 — Validar fluxos e regressões

**Fase:** 4 — Testes e entrega  
**Prioridade:** 🟡 Média  
**Origem:** [SPEC_CORRECOES_CONFIGURACAO_SESSOES.md](/Users/user/Documents/GitHub/PsicoBem/SPEC_CORRECOES_CONFIGURACAO_SESSOES.md)  
**Arquivos principais:** testes de `psicoapp_backend/sessoes`, `src/screens/tipoSessao.js` e documentação de validação

## Problema e objetivo

As mudanças atravessam migration, domínio, API e interface. É necessário demonstrar que a regra de duas modalidades não quebra cadastro, listagem ou agendamento e que a correção visual atende os estados relevantes do formulário.

## Escopo de implementação

Cobrir com testes automatizados e validação visual a migration, os serializers/endpoints, a tela de configuração e o consumo de tipos ativos no agendamento.

## Tarefas

- [ ] Testar aceitação de `presencial` e `online`.
- [ ] Testar rejeição de categorias antigas e valores desconhecidos.
- [ ] Testar preservação de tipos, sessões vinculadas e contagens durante a migration.
- [ ] Testar cadastro/listagem de tipo com cada modalidade.
- [ ] Testar o carregamento de tipos ativos no fluxo de agendamento.
- [ ] Conferir visualmente labels em estados vazio, focado, preenchido e com erro em Android/iOS.
- [ ] Executar `git diff --check` e a suíte relevante antes da entrega.

## Critérios de aceite

- [ ] Todos os testes automatizados relacionados passam.
- [ ] O fluxo de cadastro funciona com Presencial e Online.
- [ ] O agendamento continua usando tipos ativos migrados.
- [ ] Não há sobreposição, corte ou label invisível em telas menores.
- [ ] A validação final confirma que nenhuma categoria fora das duas modalidades permanece no banco.

## Dependências

- Depende das Issues 01, 02 e 03.
