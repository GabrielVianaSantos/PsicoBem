# Issue 08 - Alinhar listas de sessoes com o serializer real

**Origem no SPEC:** Achado 8
**Severidade:** media
**Objetivo:** remover a expectativa de campos flattenados inexistentes nas telas que listam sessoes.

## Problema

Telas como `home.js` e `minhasSessoes.js` esperam campos como `paciente_nome`, `tipo_sessao_nome` e `psicologo_nome`, enquanto o serializer atual retorna objetos aninhados para `paciente`, `psicologo` e `tipo_sessao`.

## Impacto observado

- Cards de sessao com nomes vazios ou incorretos.
- Dependencia de um contrato que o backend nao entrega.

## Escopo de implementacao

- Definir se o frontend passara a ler objetos aninhados ou se o backend oferecera campos flattenados.
- Unificar esse contrato nas telas consumidoras de sessoes.

## Tarefas

- [ ] Revisar `SessaoListSerializer`.
- [ ] Revisar todas as telas que renderizam sessoes.
- [ ] Escolher um shape padrao e aplicavel em todas as listagens.
- [ ] Ajustar fallback e formatacao de campos de sessao.

## Criterios de aceite

- [ ] As telas de sessoes exibem nomes corretos de paciente, psicologo e tipo quando disponiveis.
- [ ] Nao ha dependencia de campos `_nome` inexistentes no contrato final.

## Dependencias

- Pode ser executada em paralelo com as Issues 02 e 09.
