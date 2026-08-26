# Issue 03 — Seção de alterar senha em "Meu Perfil"

**Fase:** 3 — Ação disponível
**Prioridade:** 🟡 Média
**Arquivos principais:** `src/screens/meuPerfil.js`
**Origem:** seção 3.3 de `SPEC_MEU_PERFIL_PACIENTE.md`

## Problema

A única ação que o paciente pode realizar em "Meu Perfil" é redefinir a senha — hoje não há nenhum jeito de o paciente trocar a própria senha estando logado (a tela `RedefinirSenha` existente é para quem esqueceu a senha e está deslogado, com fluxo de token por e-mail).

## Objetivo

Replicar, dentro de `meuPerfil.js`, exatamente o mesmo fluxo de troca de senha já existente em `perfilPsicologo.js`.

## Escopo de implementação

- Adicionar um botão "Alterar Senha" que alterna a tela (mesmo padrão de `isChangingPassword` em `perfilPsicologo.js`) para um formulário com três campos: "Senha Atual", "Nova Senha" e "Confirme a Nova Senha".
- Validar antes de chamar a API: todos os campos preenchidos; "Nova Senha" e "Confirme a Nova Senha" devem coincidir — mesma lógica de `handleAlterarSenha()` em `perfilPsicologo.js`.
- Chamar `authService.changePassword(senhaAtual, novaSenha)` — endpoint genérico já usado pelo psicólogo, sem nenhuma dependência de tipo de usuário; não criar endpoint novo nem alterar `authService.js`.
- Em caso de sucesso: alerta de sucesso, limpar os três campos e voltar para a visualização normal do perfil.
- Em caso de erro (ex.: senha atual incorreta): exibir a mensagem de erro retornada pela API, mantendo o usuário no formulário de troca de senha.
- Incluir um botão "Cancelar" para voltar à visualização do perfil sem trocar a senha, mesmo padrão de `perfilPsicologo.js`.

## Tarefas

- [ ] Adicionar estado local (`isChangingPassword`, `senhaAtual`, `novaSenha`, `confirmarNovaSenha`) em `meuPerfil.js`.
- [ ] Adicionar o botão "Alterar Senha" na visualização normal do perfil.
- [ ] Construir o formulário de troca de senha, reaproveitando `TextInputCustom` com `secureTextEntry`.
- [ ] Implementar `handleAlterarSenha()` chamando `authService.changePassword`.
- [ ] Implementar a validação local (campos obrigatórios, senhas coincidentes) antes da chamada de API.
- [ ] Implementar o botão "Cancelar" voltando ao estado de visualização.

## Critérios de aceite

- ✅ O botão "Alterar Senha" alterna corretamente entre visualização do perfil e formulário de troca de senha.
- ✅ Enviar com campos vazios é bloqueado antes de chamar a API, com mensagem clara.
- ✅ "Nova Senha" diferente de "Confirme a Nova Senha" é bloqueado antes de chamar a API.
- ✅ Senha atual incorreta retorna erro da API, exibido ao usuário, sem trocar de tela.
- ✅ Sucesso limpa os campos, mostra alerta de sucesso e volta para a visualização do perfil.
- ✅ Nenhum endpoint novo foi criado; `authService.changePassword` não foi alterado.

## Dependências

- Depende da issue 02 (a tela `meuPerfil.js` precisa existir).
- Independente da issue 04; as duas podem ser feitas em paralelo depois da 02.
