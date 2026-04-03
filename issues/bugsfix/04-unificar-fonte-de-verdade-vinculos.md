# Issue 04 - Eliminar dupla fonte de verdade no vinculo paciente-psicologo

**Origem no SPEC:** Achado 4
**Severidade:** alta
**Objetivo:** consolidar um unico modelo de verdade para o relacionamento entre paciente e psicologo.

## Problema

O projeto mantem ao mesmo tempo `Paciente.psicologo` e `VinculoPacientePsicologo`. Algumas operacoes atualizam ambos, outras alteram apenas o modelo novo. Isso abre espaco para divergencia silenciosa entre leituras diferentes do mesmo relacionamento.

## Impacto observado

- Risco de associacao incorreta entre paciente e psicologo.
- Bugs dificeis de rastrear por dependerem da fonte consultada.
- Arquitetura fragil para evolucao de regras de vinculo.

## Escopo de implementacao

- Definir o relacionamento oficial do dominio.
- Planejar remocao do campo legado ou sincronizacao garantida enquanto ele existir.
- Revisar endpoints e regras que ainda escrevem ou leem o campo legado.

## Tarefas

- [ ] Mapear todos os pontos que usam `Paciente.psicologo`.
- [ ] Mapear todos os pontos que usam `VinculoPacientePsicologo`.
- [ ] Definir estrategia: migracao definitiva ou sincronizacao transitiva.
- [ ] Ajustar comandos, views, serializers e fluxos administrativos impactados.
- [ ] Prever migracao de dados se houver remocao do campo legado.

## Criterios de aceite

- [ ] Existe apenas uma fonte de verdade para vinculo, ou uma sincronizacao deterministica temporaria e documentada.
- [ ] Nao ha mais fluxo atualizando apenas uma das representacoes sem justificativa.
- [ ] Endpoints principais consultam a mesma regra de relacionamento.

## Dependencias

- Deve anteceder qualquer correcao que dependa de IDs ou listas de pacientes vinculados.
