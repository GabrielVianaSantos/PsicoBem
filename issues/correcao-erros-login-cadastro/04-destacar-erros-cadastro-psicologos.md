# Issue 04 — Destacar em vermelho os campos com erro de servidor em Cadastro de Psicólogos

**Fase:** 4 — Destaque de campo (psicólogo)
**Prioridade:** 🟡 Média
**Arquivos principais:** `src/screens/cadastroPsicologos.js`
**Origem:** seção 3.2 de `SPEC_CORRECAO_ERROS_LOGIN_CADASTRO.md`

## Problema

Mesmo problema da issue 03, no cadastro de psicólogo: ao falhar por CRP ou e-mail já cadastrados (ou senhas não coincidentes), `handleCadastro()` só mostra `Alert.alert`, sem destacar o campo correspondente.

## Objetivo

Reaproveitar o estado `errors` já existente para refletir os erros retornados pelo servidor, contornando em vermelho o campo correspondente, sem remover o `Alert.alert` atual.

## Escopo de implementação

- Em `handleCadastro()`, no bloco `else` (quando `result.success === false`), além de manter `Alert.alert('Erro', result.message || 'Erro ao realizar cadastro')`:
  - Ler `result.data` (propagado pela issue 02) e montar um objeto de erros de servidor:
    - `data.crp` → `errors.crp` (usar a primeira mensagem do array, se for array);
    - `data.user?.email` → `errors.email`;
    - `data.user?.non_field_errors` → `errors.confirmaSenha`;
    - `data.user?.password` → `errors.senha`.
  - Fazer `setErrors(prev => ({ ...prev, ...errosDoServidor }))` (ou equivalente), preservando quaisquer erros de validação local que já estejam no estado.
  - Se `result.data` estiver ausente ou não tiver nenhum campo mapeável, não alterar `errors` — o `Alert.alert` genérico já cobre esse caso.
- Não alterar `validateForm()`, `formatCRP`, `handleCrpChange`, `validateCRP` (já corrigidos em rodada anterior de redesign) nem os demais campos do `userData` enviado a `registerPsicologo`.
- Não alterar a navegação em caso de sucesso.

## Tarefas

- [ ] Mapear `result.data.crp` para `errors.crp` em `handleCadastro()`.
- [ ] Mapear `result.data.user?.email` para `errors.email`.
- [ ] Mapear `result.data.user?.non_field_errors` para `errors.confirmaSenha`.
- [ ] Mapear `result.data.user?.password` para `errors.senha`.
- [ ] Confirmar que os campos já usam `error={!!errors.campo}` no `TextInputCustom` correspondente (`crp`, `email`, `senha`, `confirmaSenha`) — já existe, apenas validar que não foi alterado.
- [ ] Testar manualmente: CRP duplicado, e-mail duplicado, senhas não coincidentes (quando aceitas pela validação local e rejeitadas pelo servidor).

## Critérios de aceite

- ✅ CRP já cadastrado contorna em vermelho o campo CRP, com a mensagem de erro correspondente exibida.
- ✅ E-mail já cadastrado contorna em vermelho o campo E-mail.
- ✅ Senhas não coincidentes (rejeitadas pelo backend) contornam em vermelho o campo "Confirma Senha".
- ✅ Um erro de validação sem campo identificável continua exibindo apenas o `Alert.alert`, sem quebrar a tela.
- ✅ A validação local de CRP (formato `XX/XXXXXX`, teclado numérico) continua funcionando sem alteração de comportamento.
- ✅ Um cadastro bem-sucedido continua navegando normalmente.

## Dependências

- Depende da issue 02 (`result.data` precisa estar chegando corretamente).
- Independente da issue 03; as duas podem ser feitas em paralelo.
