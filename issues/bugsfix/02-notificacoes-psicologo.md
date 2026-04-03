# Issue 02 - Liberar fluxo de notificacoes para psicologo

**Origem no SPEC:** Achado 2
**Severidade:** alta
**Objetivo:** tornar acessivel para psicologos a funcionalidade de notificacoes que ja existe no backend.

## Problema

O sino exibido na home do psicologo e apenas visual. Nao existe `onPress` funcional e a rota `Notificacoes` esta registrada apenas no fluxo do paciente, apesar de o backend responder para ambos os papeis.

## Impacto observado

- Psicologos nao conseguem acessar notificacoes ja disponiveis na API.
- Existe funcionalidade pronta no backend sem exposicao no frontend.

## Escopo de implementacao

- Registrar o fluxo de notificacoes para o papel `psicologo`.
- Conectar o botao da home a uma rota funcional.
- Reutilizar a tela existente se ela suportar o contexto de psicologo.

## Tarefas

- [ ] Revisar registro de rotas para o fluxo autenticado do psicologo.
- [ ] Adicionar navegacao no sino da home.
- [ ] Validar se a tela `Notificacoes` funciona para ambos os papeis.
- [ ] Ajustar guards, nomes de rota e contexto de navegacao se necessario.

## Criterios de aceite

- [ ] O sino da home possui acao navegavel.
- [ ] Psicologos conseguem abrir a tela de notificacoes.
- [ ] A listagem usa o endpoint ja existente sem erro de permissao ou roteamento.

## Dependencias

- Nenhuma bloqueante.
