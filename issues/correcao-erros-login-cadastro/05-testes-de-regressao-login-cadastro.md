# Issue 05 — Testes de regressão do fluxo de login e cadastro

**Fase:** 5 — Fechamento
**Prioridade:** 🟡 Média
**Arquivos principais:** nenhum (validação manual/testada sobre as issues 01–04)
**Origem:** seções 5 e 6 de `SPEC_CORRECAO_ERROS_LOGIN_CADASTRO.md`

## Problema

As issues 01–04 tocam em código compartilhado por todo o fluxo de autenticação (`AuthProvider`, `authService`, `routes.js`, `login.js`, `cadastroPacientes.js`, `cadastroPsicologos.js`). É preciso validar o conjunto de ponta a ponta, incluindo os casos de sucesso, antes de considerar a correção concluída.

## Objetivo

Confirmar que a navegação indevida foi eliminada, que o destaque de campo funciona nos dois cadastros, e que nada relacionado a login/cadastro/carregamento inicial regrediu.

## Escopo de implementação

Execução dos cenários de teste da seção 6 da SPEC. Nenhuma alteração de código é esperada nesta issue, exceto pequenos ajustes de correção caso algum cenário falhe.

## Tarefas

- [ ] Login com senha incorreta: permanece na tela, mostra alerta, não navega para `Inicio`.
- [ ] Login com e-mail inexistente: mesmo comportamento acima.
- [ ] Login bem-sucedido: navega para a área correta (`HomeBarNavigation` ou `HomePaciente`), sem regressão.
- [ ] Cadastro de paciente com CPF já usado: mensagem + campo CPF em vermelho, permanece na tela.
- [ ] Cadastro de paciente com e-mail já usado: mensagem + campo E-mail em vermelho, permanece na tela.
- [ ] Cadastro de paciente com "Senha" e "Confirma Senha" diferentes (quando aceito pela validação local e rejeitado pelo servidor): campo "Confirma Senha" em vermelho.
- [ ] Cadastro de paciente bem-sucedido: navega para `HomePaciente`, sem regressão.
- [ ] Cadastro de psicólogo com CRP já usado: mensagem + campo CRP em vermelho, permanece na tela.
- [ ] Cadastro de psicólogo com e-mail já usado: mensagem + campo E-mail em vermelho, permanece na tela.
- [ ] Cadastro de psicólogo com "Senha" e "Confirma Senha" diferentes: campo "Confirma Senha" em vermelho.
- [ ] Cadastro de psicólogo bem-sucedido: navega para `HomeBarNavigation`, sem regressão.
- [ ] Abrir o app com sessão salva e token válido: tela de carregamento inicial aparece e a sessão é restaurada corretamente.
- [ ] Abrir o app com sessão salva e token inválido/expirado: tela de carregamento inicial aparece e a sessão é encerrada corretamente (logout automático), levando à tela `Inicio` — esse é o único caso em que cair em `Inicio` é esperado.
- [ ] Erro de rede (backend indisponível) durante login ou cadastro: mensagem de erro de conexão já existente, permanecendo na tela correspondente.
- [ ] `RedefinirSenha.js`: confirmar que continua funcionando exatamente como antes (não deve ter sido tocada).
- [ ] `git diff --check` sem apontamentos no conjunto final das alterações.
- [ ] Confirmar via `git status` que nenhum arquivo de `psicoapp_backend/` foi alterado em todo o backlog.

## Critérios de aceite

- ✅ Todos os cenários acima passam.
- ✅ Nenhuma tela fora de `Login`, `CadastroPacientes`, `CadastroPsicologos`, `AuthProvider.js`, `authService.js` e `routes.js` foi alterada.
- ✅ `git diff --check` passa sem apontamentos.

## Dependências

- Depende de todas as issues anteriores (01–04).
