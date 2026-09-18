# SPEC — Exclusão de Conta (Paciente e Psicólogo)

Data: 2026-09-18 (revisada em 2026-09-18: decisão da seção 3.3 revertida — ver nota abaixo)
Status: implementado
Escopo: backend Django (novo endpoint) e app Expo (nova ação na tela de perfil de paciente e de psicólogo). Nenhum fluxo de autenticação existente é alterado — apenas um novo endpoint autenticado é adicionado.

> **Nota de revisão:** a versão original desta SPEC previa uma exceção — prontuários sobreviverem à exclusão da conta do paciente (`Prontuario.paciente` como `SET_NULL` + snapshot do nome). Essa exceção foi implementada, testada e deployada, e em seguida **revertida a pedido do usuário**: "caso o usuário de fato delete a conta, pode apagar os prontuários dele sim, como fizemos no do psicólogo." A partir desta revisão, a exclusão é **simétrica e sem exceções** para os dois perfis — `Prontuario.paciente` voltou a ser `CASCADE`. Este documento já reflete o estado final.

---

## 1. Objetivo

Permitir que o próprio usuário (paciente ou psicólogo) exclua permanentemente sua conta a partir da tela de perfil do app, sem precisar de suporte manual. A exclusão remove login, senha, vínculo(s), dados de perfil e **todo** o histórico de uso associado àquele usuário específico — sem exceções, para os dois perfis.

---

## 2. Estado atual identificado

| Tema | Estado atual | Impacto |
|---|---|---|
| Não existe nenhum endpoint de auto-exclusão | `authentication/urls.py` tem `register/`, `login/`, `password/reset/`, `password/change/`, mas nenhuma rota de exclusão de conta. `CustomUser` só é apagado hoje via Django Admin. | Precisa de endpoint novo — não há nada para reaproveitar. |
| O grafo de dados já é 100% CASCADE a partir de `CustomUser` | `Paciente.user` e `Psicologo.user` são `OneToOneField(CustomUser, on_delete=CASCADE)`. A partir daí, **todas** as FKs relevantes também são CASCADE: `Sessao.paciente`/`Sessao.psicologo`, `VinculoPacientePsicologo.paciente`/`.psicologo`, `Prontuario.paciente`/`.psicologo`, `TipoSessao.psicologo`, `CategoriaMensagem.psicologo`, `SementeCuidado.psicologo`, `MensagemPaciente.paciente`, `RegistroOdisseia.paciente`, `ComentarioPsicologo.psicologo`, `MetaOdisseia.paciente`, `NotificacaoSistema.paciente`/`.psicologo`, `DispositivoPush.user`, `HistoricoEnvioPush.destinatario_user`, `ReminderLog.destinatario_user`, `PasswordResetCode.user`. | **`user.delete()` sozinho já apaga tudo em uma única transação atômica**, sem precisar de nenhuma limpeza manual por app e sem nenhuma exceção de modelo. O trabalho real desta feature é só o endpoint (autorização + confirmação), não a exclusão em si. |
| Efeito colateral: excluir uma conta apaga o histórico compartilhado com a outra parte | Como as FKs de `Sessao`, `VinculoPacientePsicologo` e `Prontuario` (nos dois sentidos) são CASCADE, excluir **qualquer um dos dois lados** de um vínculo apaga as sessões, o vínculo e os prontuários compartilhados — mesmo que a outra parte continue com conta ativa. **Decisão confirmada com o usuário para os dois perfis: aceitar esse efeito em cascata como está**, sem preservar nada do lado de quem não pediu a exclusão. | Documentado explicitamente aqui para não ser uma surpresa depois — é uma escolha deliberada e simétrica, não um descuido. |
| `UserSerializer.has_password` já existe | `GET /auth/profile/` já devolve `has_password` (`obj.has_usable_password()`), usado hoje por `meuPerfil.js`/`perfilPsicologo.js` para decidir se pedem "Senha Atual" na troca de senha. Contas Google-only (criadas via Google, nunca definiram senha local) têm `has_password: false`. | Mesmo campo resolve a mesma decisão para a confirmação de exclusão — não precisa de nada novo no backend para saber qual fluxo de confirmação mostrar. |
| Padrão de verificação de senha já estabelecido | `password_change_view` (`authentication/views.py:350`) usa `authenticate(email=request.user.email, password=old_password)` para validar a senha atual antes de uma ação sensível, e trata separadamente o caso `has_usable_password() == False`. | Reaproveitar exatamente esse padrão para a confirmação de exclusão (seção 3.2), em vez de inventar um mecanismo novo. |
| Não há blacklist de tokens JWT | `SIMPLE_JWT` não tem `rest_framework_simplejwt.token_blacklist` instalado (`INSTALLED_APPS` não lista o app). Um access token emitido antes da exclusão continua *criptograficamente válido* até expirar (60 min) — mas toda requisição autenticada consulta `request.user` no banco, e como o `CustomUser` já não existe mais, o Django/SimpleJWT retorna 401 ("Usuário não encontrado") no próximo request. | Não há uma janela real de acesso pós-exclusão com dados — só o próprio request de exclusão ainda enxerga `request.user` (porque já foi resolvido antes do `.delete()`). Registrar essa limitação (impossível revogar o token *imediatamente* em outros dispositivos logados) como aceitável e fora de escopo endurecer agora. |
| Logout local já centraliza a limpeza do lado do app | `AuthProvider.logout()` (`src/providers/AuthProvider.js:230`) já desativa o dispositivo push, encerra a sessão do Google (`googleSignOut()`), limpa as 4 chaves do `AsyncStorage` e reseta o estado (`user`, `userType`, `isAuthenticated`). | Reaproveitar essa função inteira depois que a exclusão no backend for confirmada, em vez de duplicar a limpeza local. |
| Tela de perfil já tem um botão destrutivo de referência | `meuPerfil.js`/`perfilPsicologo.js` já têm `btnSair` ("Sair da Conta", ícone vermelho `#EF5350`) logo abaixo da seção de troca de senha. | "Excluir Conta" entra no mesmo bloco, abaixo de "Sair da Conta", com um tom visual ainda mais forte de aviso (é irreversível, diferente de logout). |

---

## 3. Requisitos funcionais

### 3.1 Endpoint de exclusão de conta

**Backend — `authentication/views.py` + `authentication/urls.py`**

- Endpoint `DELETE /api/auth/account/`, autenticado (`IsAuthenticated`), sem restrição de `user_type` (serve tanto paciente quanto psicólogo — cada um só pode excluir a própria conta, nunca a de outro usuário; não existe parâmetro de "qual conta excluir", é sempre `request.user`).
- Fluxo:
  1. Validar a confirmação (seção 3.2). Se inválida, `400`.
  2. `request.user.delete()` — a cascata natural do banco cuida de tudo, para paciente e para psicólogo, sem nenhuma etapa extra de preparação.
  3. Responder `200` com uma mensagem de confirmação.
- **Não** envolve nenhuma chamada a serviços externos (Google, Expo push) para "desfazer" nada — não há o que desfazer do lado deles (ver linha da tabela sobre blacklist/push acima).

### 3.2 Confirmação antes de excluir

#### Comportamento esperado

- A exclusão de conta é uma ação destrutiva e irreversível — precisa de uma confirmação explícita, em duas camadas:
  1. **No app**: um diálogo de confirmação (`Alert` destrutivo, no mesmo padrão já usado por `limparNotificacoes()` em `notificacoes.js`) antes de sequer abrir o formulário de confirmação final.
  2. **No backend**: a chamada precisa provar que é realmente o dono da conta agindo, não uma sessão comprometida por acaso:
     - Conta com senha utilizável (`has_password: true`, nativas e Google-vinculadas que definiram senha): exigir a **senha atual** no corpo da requisição, validada com `authenticate(email=request.user.email, password=senha)` — mesmo padrão de `password_change_view`.
     - Conta Google-only sem senha (`has_password: false`): não há senha para pedir. Exigir que o usuário digite a palavra **"EXCLUIR"** em um campo de texto como confirmação — barreira proporcional (a sessão autenticada já prova identidade; a frase evita apenas toque acidental), sem introduzir um novo fluxo de reautenticação Google só para isso.
- Resposta de erro de confirmação inválida: `400`, mensagem específica (`{'error': 'Senha incorreta.'}` ou `{'error': 'Confirmação inválida.'}`), sem revelar mais que isso.

### 3.3 Exclusão do paciente: cascata total, incluindo prontuários

Decisão final confirmada com o usuário: quando é o **paciente** que exclui a própria conta, os prontuários que o **psicólogo** escreveu sobre ele são apagados junto, na mesma cascata — **sem exceção**. Nenhuma alteração de modelo é necessária: `Prontuario.paciente` é `CASCADE` (comportamento nativo).

`RegistroOdisseia` (o diário do próprio paciente) e `ComentarioPsicologo` (comentários do psicólogo *nesse* diário) também seguem `CASCADE` normalmente, como já documentado.

### 3.4 Exclusão do psicólogo: cascata total (sem exceções)

Mesma regra, no outro sentido: quando é o **psicólogo** que exclui a própria conta, **nenhum dado é preservado** do lado dos pacientes dele — sessões, vínculos e prontuários (como psicólogo autor) são todos apagados em cascata, mesmo para pacientes que continuam ativos no app.

- Nenhuma alteração de modelo é necessária para isso — já é o comportamento nativo do CASCADE hoje.
- Único requisito: deixar isso **muito claro** no texto de confirmação que o psicólogo vê no app antes de excluir (seção 3.5), para que a irreversibilidade e o alcance real da ação (não é só a conta dele, é o histórico dos pacientes também) sejam explícitos — evita reclamação por surpresa depois.

### 3.5 Tela de perfil — ação "Excluir Conta"

**App — `src/screens/meuPerfil.js` (paciente) e `src/screens/perfilPsicologo.js` (psicólogo)**

- Botão "Excluir Conta" logo abaixo do já existente "Sair da Conta", com destaque visual mais forte (fundo vermelho sólido, já que é irreversível — diferente de logout).
- Ao tocar, primeiro um `Alert` de confirmação destrutivo com o texto de aviso apropriado ao perfil:
  - Paciente: menciona que sessões, vínculo com o psicólogo e todo o histórico do app serão apagados permanentemente.
  - Psicólogo: menciona explicitamente que sessões, vínculos e prontuários **de todos os pacientes vinculados** também serão apagados, não só os dados dele.
- Confirmado o primeiro `Alert`, abre um formulário (reaproveitando o `Modal`/`TextInputCustom` já usados no fluxo de troca de senha e no de cancelamento tardio de sessão em `detalhesSessao.js`):
  - Se `hasPassword`: campo "Senha Atual".
  - Senão: campo de texto pedindo para digitar "EXCLUIR".
- Chama `authService.deleteAccount({ password } | { confirmacao })`.
- Em caso de sucesso: chama `logout()` do `AuthProvider` (reaproveitando toda a limpeza local já existente) e navega para `Login`, com uma mensagem final de confirmação.
- Em caso de erro (senha incorreta, confirmação errada): exibe a mensagem de erro, mantém a conta intacta, não faz logout algum.

### 3.6 Serviço frontend

**App — `src/services/authService.js`**

- `deleteAccount(payload)` fazendo `api.delete('/auth/account/', { data: payload })` (Axios exige a chave `data` para enviar corpo em requisições `DELETE`), seguindo o mesmo padrão de tratamento de erro (`handleError`) já usado pelos outros métodos deste serviço.

---

## 4. Alterações previstas por área/arquivo

| Arquivo | Alteração |
|---|---|
| `psicoapp_backend/authentication/views.py` | `delete_account_view` (`DELETE`, `IsAuthenticated`). |
| `psicoapp_backend/authentication/urls.py` | Rota `account/` → `delete_account_view`. |
| `psicoapp_backend/authentication/tests.py` | Testes do endpoint (senha certa/errada, conta Google-only, cascata total nos dois sentidos, incluindo prontuário). |
| `src/services/authService.js` | `deleteAccount(payload)`. |
| `src/screens/meuPerfil.js` | Botão "Excluir Conta", modal de confirmação (senha ou frase), chamada ao serviço, logout + navegação em caso de sucesso. |
| `src/screens/perfilPsicologo.js` | Mesma ação, com o texto de aviso específico do psicólogo (seção 3.4). |

---

## 5. Autorização, privacidade e segurança

- O endpoint só opera sobre `request.user` — nunca recebe um ID de usuário-alvo no payload/URL, eliminando por construção qualquer risco de um usuário excluir a conta de outro.
- A confirmação por senha (ou frase, para contas sem senha) é obrigatória e não pode ser contornada — sem ela, uma sessão com token ainda válido mas dispositivo comprometido/esquecido logado poderia excluir a conta sem nenhuma fricção.
- Limitação aceita e documentada (não corrigida nesta feature): sem blacklist de JWT, um token de acesso emitido antes da exclusão, em **outro dispositivo** já logado, só perde acesso de fato no próximo request que dependa de buscar o usuário no banco (o que já ocorre para praticamente qualquer endpoint autenticado) — não há uma janela de escrita útil, mas também não há revogação instantânea formal. Registrado aqui como um risco residual conhecido e aceito, no mesmo espírito do gap de autorização já registrado na SPEC de cancelamento de sessão.
- Nenhum dado exportado/backup é criado antes da exclusão — o usuário não recebe uma cópia dos próprios dados. Não foi pedido e está fora de escopo (ver seção 8).

---

## 6. Critérios de aceite

- [x] Paciente autenticado consegue excluir a própria conta informando a senha atual correta; senha errada bloqueia com `400` e a conta permanece intacta.
- [x] Psicólogo autenticado consegue excluir a própria conta com o mesmo fluxo.
- [x] Conta Google-only (sem senha) exclui a própria conta digitando "EXCLUIR"; qualquer outro texto bloqueia com `400`.
- [x] Após excluir a conta de um **paciente**: `CustomUser`, `Paciente`, `Sessao`, `VinculoPacientePsicologo`, `Prontuario` (como o psicólogo escreveu sobre ele), `RegistroOdisseia` (e seus comentários), `MetaOdisseia`, `NotificacaoSistema` e `DispositivoPush` relacionados deixam de existir — sem exceção.
- [x] Após excluir a conta de um **psicólogo**: `CustomUser`, `Psicologo`, `TipoSessao`, `Sessao`, `VinculoPacientePsicologo`, `Prontuario` (como autor), `CategoriaMensagem`, `SementeCuidado` e `ComentarioPsicologo` relacionados deixam de existir — inclusive para pacientes que continuam com conta ativa (o diário de Odisseia do próprio paciente, que não pertence ao psicólogo, sobrevive).
- [x] Login com o e-mail da conta excluída falha (`CustomUser` não existe mais) — inclusive tentativa de recuperação de senha para esse e-mail (resposta genérica de sempre, sem enviar e-mail, pois não há usuário correspondente).
- [x] No app, após exclusão bem-sucedida, o usuário é deslogado localmente (mesma limpeza do `logout()`) e redirecionado para a tela de Login com uma mensagem de confirmação.

---

## 7. Testes e validação

- Testes de backend (`authentication/tests.py`): endpoint de exclusão — paciente com senha correta/incorreta; psicólogo com senha correta/incorreta; conta Google-only com frase correta/incorreta; usuário não autenticado recebe `401`; verificação pós-exclusão de que as tabelas relacionadas realmente ficaram vazias em cascata total, nos dois sentidos (incluindo o prontuário do lado do paciente).
- Testes de backend (`core/tests.py`): `Prontuario` é apagado junto com `paciente.user.delete()`.
- Suíte completa (`python manage.py test`) rodando localmente e, após deploy, no servidor — mesmo padrão já seguido nas features anteriores desta sessão.
- Validação manual em dispositivo: criar uma conta de teste (paciente e psicólogo), excluir, confirmar que login subsequente falha e que o histórico compartilhado desaparece dos dois lados.

---

## 8. Itens fora de escopo

- Exportar/baixar uma cópia dos próprios dados antes de excluir ("portabilidade de dados").
- Período de carência/"soft delete" com possibilidade de desistência (ex.: conta marcada para exclusão em N dias, cancelável) — a exclusão é imediata e definitiva, como pedido.
- Notificar a outra parte quando alguém excluir a própria conta — nenhuma notificação automática é criada para o efeito colateral das seções 3.3/3.4.
- Blacklist de JWT / invalidação imediata de tokens em outros dispositivos já logados (ver seção 5).
- Qualquer alteração ao fluxo de exclusão de conta pelo Django Admin (continua existindo e não muda).
- Reautenticação via Google como mecanismo de confirmação para contas Google-only (optou-se pela frase de confirmação, mais simples).
- Preservar prontuários (ou qualquer outro dado) do lado de quem não pediu a exclusão — decisão explícita e final: cascata total e simétrica para os dois perfis.

---

## 9. Ordem recomendada de implementação

1. Backend: endpoint `delete_account_view` + rota, com todos os cenários de confirmação e de cascata testados.
2. App: `authService.deleteAccount()`.
3. App: ação "Excluir Conta" em `meuPerfil.js` (paciente) — fluxo completo, incluindo o `Alert` de aviso e o `logout()` pós-sucesso.
4. App: mesma ação em `perfilPsicologo.js`, com o texto de aviso específico da cascata total.
5. Deploy (restart) e validação end-to-end em dispositivo.
