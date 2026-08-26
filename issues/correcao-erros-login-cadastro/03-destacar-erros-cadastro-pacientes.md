# Issue 03 — Destacar em vermelho os campos com erro de servidor em Cadastro de Pacientes

**Fase:** 3 — Destaque de campo (paciente)
**Prioridade:** 🟡 Média
**Arquivos principais:** `src/screens/cadastroPacientes.js`
**Origem:** seção 3.2 de `SPEC_CORRECAO_ERROS_LOGIN_CADASTRO.md`

## Problema

Hoje, ao falhar o cadastro de paciente por CPF ou e-mail já cadastrados (ou por senhas não coincidentes, quando essa validação escapa da checagem local), `handleCadastro()` só mostra `Alert.alert('Erro', result.message || ...)`. Nenhum campo fica destacado, mesmo já existindo o mecanismo local (`errors.cpf`, `errors.email`, `errors.confirmaSenha`) usado pela validação de formato.

## Objetivo

Reaproveitar o estado `errors` já existente para também refletir os erros retornados pelo servidor, contornando em vermelho o campo correspondente, sem remover o `Alert.alert` atual.

## Escopo de implementação

- Em `handleCadastro()`, no bloco `else` (quando `result.success === false`), além de manter `Alert.alert('Erro', result.message || 'Erro ao realizar cadastro')`:
  - Ler `result.data` (propagado pela issue 02) e montar um objeto de erros de servidor:
    - `data.cpf` → `errors.cpf` (usar a primeira mensagem do array, se for array);
    - `data.user?.email` → `errors.email`;
    - `data.user?.non_field_errors` → `errors.confirmaSenha`;
    - `data.user?.password` → `errors.senha`.
  - Fazer `setErrors(prev => ({ ...prev, ...errosDoServidor }))` (ou equivalente), preservando quaisquer erros de validação local que já estejam no estado.
  - Se `result.data` estiver ausente ou não tiver nenhum campo mapeável, não alterar `errors` — o `Alert.alert` genérico já cobre esse caso.
- Não alterar `validateForm()`, `formatCPF`, `formatPhone`, `handleCpfChange`, `handlePhoneChange` nem os demais campos do `userData` enviado a `registerPaciente`.
- Não alterar a navegação em caso de sucesso.

## Tarefas

- [ ] Mapear `result.data.cpf` para `errors.cpf` em `handleCadastro()`.
- [ ] Mapear `result.data.user?.email` para `errors.email`.
- [ ] Mapear `result.data.user?.non_field_errors` para `errors.confirmaSenha`.
- [ ] Mapear `result.data.user?.password` para `errors.senha`.
- [ ] Confirmar que os campos já usam `error={!!errors.campo}` no `TextInputCustom` correspondente (`cpf`, `email`, `senha`, `confirmaSenha`) — já existe, apenas validar que não foi alterado.
- [ ] Testar manualmente: CPF duplicado, e-mail duplicado, senhas não coincidentes (quando aceitas pela validação local e rejeitadas pelo servidor).

## Critérios de aceite

- ✅ CPF já cadastrado contorna em vermelho o campo CPF, com a mensagem de erro correspondente exibida (via `errorText` já existente abaixo do campo).
- ✅ E-mail já cadastrado contorna em vermelho o campo E-mail.
- ✅ Senhas não coincidentes (rejeitadas pelo backend) contornam em vermelho o campo "Confirma Senha".
- ✅ Um erro de validação sem campo identificável continua exibindo apenas o `Alert.alert`, sem quebrar a tela.
- ✅ A validação local (formato de e-mail, CPF, senha curta) continua funcionando sem alteração de comportamento.
- ✅ Um cadastro bem-sucedido continua navegando normalmente.

## Dependências

- Depende da issue 02 (`result.data` precisa estar chegando corretamente).
- Independente da issue 04; as duas podem ser feitas em paralelo.
