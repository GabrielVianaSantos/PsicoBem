# Issue 05 — Testes de regressão e validação ponta a ponta

**Fase:** 3 — Fechamento
**Prioridade:** 🟡 Média
**Arquivos principais:** nenhum (validação sobre as issues 01–04)
**Origem:** seções 5 e 6 de `SPEC_RECUPERACAO_SENHA_CONTAS_NATIVAS.md`

## Problema

As issues 01 a 04 tocam em configuração de e-mail, dois endpoints de autenticação e uma tela do app. É preciso validar o conjunto e confirmar ausência de regressão no login e no fluxo Google.

## Objetivo

Confirmar que a recuperação de senha funciona de ponta a ponta para contas nativas e que nada mais quebrou.

## Escopo de validação

1. Solicitar recuperação para uma conta nativa existente: mensagem genérica de sucesso; e-mail chega (ambiente local: verificar no log do backend de console; ambiente de produção: verificar recebimento real, após a conta SMTP estar configurada no `.env` da VPS).
2. Copiar o token do e-mail e colar no passo 2 com uma nova senha válida: senha alterada.
3. Fazer login com a nova senha: funciona.
4. Solicitar recuperação para uma conta Google-only: mesma mensagem genérica; nenhum e-mail chega.
5. Solicitar recuperação para um e-mail que não existe: mesma mensagem genérica.
6. Tentar confirmar com um token expirado (aguardar o TTL ou gerar um vencido em teste): mensagem de erro compreensível, sem crash.
7. Tentar confirmar com uma senha curta (menos de 6 caracteres): rejeitado com mensagem clara.
8. Confirmar que nenhuma tela ou resposta de API exibe o token em nenhum momento do fluxo.

### Regressão obrigatória

9. Login por e-mail e senha de conta nativa antiga: inalterado.
10. Login com Google: inalterado.
11. Criação de senha via "Meu Perfil" para conta Google-only (fluxo de `SPEC_LOGIN_GOOGLE.md`): inalterado.
12. Cadastro tradicional de paciente e de psicólogo: inalterado.
13. Rodar a suíte completa de testes do backend (`authentication` e demais apps).
14. `git diff --check` sem apontamentos.

## Tarefas

- [ ] Executar os cenários 1 a 8 no app (ou via chamadas diretas à API para os casos de e-mail).
- [ ] Executar os cenários de regressão 9 a 12.
- [ ] Rodar a suíte de testes do backend.
- [ ] `git diff --check` sem apontamentos.

## Critérios de aceite

- ✅ Todos os cenários 1 a 12 passam.
- ✅ Nenhum teste automatizado do backend quebrou.
- ✅ `git diff --check` passa sem apontamentos.

## Dependências

- Depende de todas as issues anteriores (01–04).
