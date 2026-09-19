# Issue 11 — App: estado pendente e encerrar vínculo (paciente)

**Fase:** 6 — Telas do paciente
**Prioridade:** 🟡 Média
**Arquivos principais:** `src/screens/homePaciente.js`, `src/screens/meuPsicologo.js`
**Origem:** seções 3.10 e 3.11 de `SPEC_VINCULO_CONVITE_E_SOLICITACAO.md`

## Problema

Duas lacunas do lado do paciente: depois de enviar uma solicitação por CRP ele fica sem nenhum retorno visual; e ele só consegue sair de um vínculo entrando em outro — `meuPsicologo.js:112` oferece "Conectar outro profissional", mas não existe encerrar.

## Objetivo

Mostrar o estado da solicitação pendente e permitir o encerramento avulso.

## Escopo de implementação

### `homePaciente.js`

- Quando houver solicitação `pendente`, o card de conectar (`:116`) dá lugar a um card de estado: **"Aguardando resposta do profissional"**, com o nome do profissional e o prazo restante.
- Quando a solicitação for recusada ou expirar, o card volta ao normal e o paciente recebe a mensagem neutra **"Profissional indisponível para tratamento"** (via notificação, que já chega por push e in-app).

### `meuPsicologo.js`

- Nova ação **"Encerrar vínculo"**, visualmente destrutiva, abaixo de "Conectar outro profissional" (`:112`) — mesmo tratamento dado a ações irreversíveis em `meuPerfil.js`/`perfilPsicologo.js`.
- Confirmação exibindo exatamente o que será perdido: sessões futuras canceladas e **prontuários apagados**.
- Confirmado, chama `encerrarVinculo()` e leva o paciente de volta à `HomePaciente`, agora sem vínculo.

## Tarefas

- [ ] Card de solicitação pendente na `homePaciente`, com prazo.
- [ ] Voltar ao card normal quando a solicitação sair de pendente.
- [ ] Ação "Encerrar vínculo" em `meuPsicologo.js`, com confirmação destrutiva.
- [ ] Chamada a `encerrarVinculo()` e navegação pós-sucesso.
- [ ] Regressão: "Conectar outro profissional" continua funcionando e agora leva ao hub da issue 10.
- [ ] Validar em dispositivo: solicitar → ver pendente → ser aceito → encerrar.

## Critérios de aceite

- ✅ O paciente nunca fica sem retorno após enviar uma solicitação.
- ✅ O encerramento avulso funciona e deixa o paciente sem nenhum vínculo ativo.
- ✅ O aviso de perda é exibido antes de qualquer encerramento.

## Dependências

Depende das issues 07 e 10.
