# Issue 06 — App: chamar `visualizarSemente()` de fato

**Fase:** 1 — Causa raiz (frontend)
**Prioridade:** 🔴 Alta
**Arquivos principais:** `src/screens/sementesPaciente.js`
**Origem:** seções 2.2 e 3.2 de `SPEC_BADGES_NOVIDADES_E_ALERTAS_CUSTOMIZADOS.md`

## Problema

`pacienteService.visualizarSemente(id)` existe e funciona, mas nenhuma tela do app o chama — confirmado por busca em todo `src/screens/`. A visualização de uma semente nunca é registrada por essa via.

## Objetivo

Registrar a visualização real de uma semente quando o paciente a vê na tela, complementando a correção da issue 01 (que cobre o caso implícito de curtir sem visualizar antes).

## Escopo de implementação

### `src/screens/sementesPaciente.js`

- Ao final de `carregar()`, para cada semente retornada com `ja_visualizada` falso (campo já exposto pelo serializer desde `SPEC_CORRECAO_ERROS_SESSOES_SEMENTES.md`), chamar `pacienteService.visualizarSemente(semente.id)`.
- Atualizar o estado local (`ja_visualizada: true`) para a semente correspondente após a chamada, para não repetir a chamada em recargas subsequentes dentro da mesma sessão do componente (ex.: `onRefresh`).
- Não bloquear a renderização da lista esperando essas chamadas — disparar e seguir (fire-and-forget), sem `await` bloqueante no fluxo principal de `carregar()`.

## Tarefas

- [ ] Implementar a chamada de `visualizarSemente()` para sementes ainda não visualizadas ao carregar a lista.
- [ ] Atualizar o estado local para refletir `ja_visualizada: true` sem esperar um novo `GET`.
- [ ] Testar: abrir a tela como paciente, confirmar (via API ou admin) que `total_visualizacoes` da(s) semente(s) exibida(s) aumentou.
- [ ] Testar: reabrir a tela (mesma sessão do componente) e confirmar que não dispara `visualizar` de novo para as mesmas sementes.

## Critérios de aceite

- ✅ Abrir a tela de Sementes como paciente incrementa `total_visualizacoes` das sementes ainda não visualizadas.
- ✅ Reabrir a tela não incrementa de novo para as mesmas sementes.
- ✅ A tela continua carregando e exibindo a lista normalmente, sem atraso perceptível por causa das chamadas de visualização.

## Dependências

- Depende do campo `ja_visualizada` já exposto pelo serializer (entregue em `SPEC_CORRECAO_ERROS_SESSOES_SEMENTES.md`, issue já concluída).
- Complementa a issue 01 deste backlog, mas pode ser feita em paralelo (correções independentes do mesmo sintoma).
