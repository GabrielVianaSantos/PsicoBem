# Issue 09 - Alinhar tela MeusProntuarios ao payload real

**Origem no SPEC:** Achado 9
**Severidade:** media
**Objetivo:** fazer a tela do paciente consumir o modelo de prontuario que o backend realmente expoe.

## Problema

A tela `MeusProntuarios` tenta renderizar campos como `queixa_principal`, `objetivos_terapeuticos`, `evolucao` e `conteudo`, mas o serializer atual retorna `titulo`, `anotacao`, `psicologo_nome` e `paciente_nome`.

## Impacto observado

- A expansao do prontuario pode ficar praticamente vazia.
- O frontend nao representa o dado persistido no backend.

## Escopo de implementacao

- Definir o shape oficial de leitura de prontuario para o paciente.
- Ajustar a tela ou o backend para convergir no mesmo contrato.

## Tarefas

- [ ] Revisar `ProntuarioSerializer`.
- [ ] Revisar o componente `meusProntuarios.js`.
- [ ] Definir quais campos sao realmente exibidos ao paciente.
- [ ] Ajustar renderizacao e estados vazios conforme o contrato final.

## Criterios de aceite

- [ ] A tela exibe conteudo real do prontuario.
- [ ] Os campos mostrados ao paciente existem de fato no payload retornado.
- [ ] Nao ha secoes vazias baseadas em propriedades inexistentes.

## Dependencias

- Nenhuma bloqueante.
