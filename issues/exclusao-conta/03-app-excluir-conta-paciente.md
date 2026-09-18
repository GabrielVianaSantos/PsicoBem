# Issue 03 — App: "Excluir Conta" no perfil do paciente

**Fase:** 2 — App
**Prioridade:** 🔴 Alta
**Arquivos principais:** `src/services/authService.js`, `src/screens/meuPerfil.js`
**Origem:** seções 3.2, 3.5 e 3.6 de `SPEC_EXCLUSAO_CONTA.md`

## Problema

Não existe hoje, no app, nenhuma forma do paciente excluir a própria conta — só logout.

## Objetivo

Adicionar a ação "Excluir Conta" em `meuPerfil.js`, com confirmação em duas camadas (Alert destrutivo + senha/frase) e logout local completo em caso de sucesso.

## Escopo de implementação

### `src/services/authService.js`

```js
async deleteAccount(payload) {
  try {
    const response = await api.delete('/auth/account/', { data: payload });
    return response.data;
  } catch (error) {
    const errorInfo = this.handleError(error);
    const errorToThrow = new Error(errorInfo.message);
    errorToThrow.status = errorInfo.status;
    errorToThrow.data = errorInfo.data;
    throw errorToThrow;
  }
},
```

`payload` é `{ password }` ou `{ confirmacao: 'EXCLUIR' }`, dependendo de `hasPassword` — mesma decisão que a tela já faz para a troca de senha.

### `src/screens/meuPerfil.js`

- Novo botão "Excluir Conta" logo abaixo de "Sair da Conta" (`btnSair`), com destaque visual mais forte (ex.: fundo vermelho sólido `#EF5350` com texto branco, em vez de só ícone vermelho — sinaliza que é irreversível, diferente de logout).
- Ao tocar: `Alert` de confirmação destrutivo (mesmo padrão de `limparNotificacoes()` em `notificacoes.js`), texto explicando que sessões, vínculo com o psicólogo e todo o histórico do paciente no app serão apagados permanentemente. **Não mencionar prontuário** — a preservação do lado do psicólogo é um detalhe interno, não uma informação relevante para o paciente decidir.
- Confirmado o `Alert`, abrir um `Modal` (reaproveitando o padrão visual já usado no cancelamento tardio de sessão em `detalhesSessao.js`: `modalFundo`/`modalCard`/`modalTitulo`/`modalBotoes`) com:
  - Se `hasPassword`: `TextInputCustom` "Senha Atual" (`secureTextEntry`).
  - Senão: `TextInputCustom` pedindo para digitar "EXCLUIR", com validação local (botão de confirmar só habilita se o texto digitado, em maiúsculas, for exatamente `"EXCLUIR"`) antes mesmo de chamar a API — feedback mais rápido que esperar o 400 do backend.
- Ao confirmar: chama `authService.deleteAccount(payload)`.
  - Sucesso: chama `logout()` (do `useAuth()` já importado nesta tela) para a limpeza local completa (push, Google, `AsyncStorage`, estado), depois `navigation.navigate('Login')` com uma mensagem final de confirmação (`Alert` simples, não bloqueante).
  - Erro: exibir a mensagem de erro devolvida (`error.message`) em `Alert`, manter o modal aberto para nova tentativa, **não** chamar `logout()`.
- Estado de carregamento (`excluindo`) desabilitando o botão de confirmar durante a chamada, mesmo padrão já usado em `cancelando`/`loadingSenha` nesta mesma tela.

## Tarefas

- [ ] `authService.deleteAccount(payload)`.
- [ ] Botão "Excluir Conta" + `Alert` de confirmação inicial.
- [ ] `Modal` de confirmação final (senha ou frase, conforme `hasPassword`).
- [ ] Validação local da frase "EXCLUIR" antes de habilitar o botão de confirmar (fluxo sem senha).
- [ ] Integração com `logout()` + navegação para `Login` em caso de sucesso.
- [ ] Tratamento de erro sem deslogar/perder o estado da conta.
- [ ] Checar bundle do Metro (compila sem `SyntaxError` real) e testar manualmente os dois fluxos (conta com senha, conta Google-only) em dispositivo/emulador.

## Critérios de aceite

- ✅ Paciente com senha exclui a conta informando a senha correta; senha errada mantém a conta e mostra o erro do backend.
- ✅ Paciente Google-only (sem senha) só consegue confirmar digitando exatamente "EXCLUIR".
- ✅ Sucesso desloga localmente (mesma limpeza do botão "Sair da Conta") e navega para `Login`.
- ✅ Cancelar em qualquer etapa (Alert inicial ou Modal) não chama a API e não altera nada.

## Dependências

- Depende da issue 02 (endpoint precisa existir e estar testado).
