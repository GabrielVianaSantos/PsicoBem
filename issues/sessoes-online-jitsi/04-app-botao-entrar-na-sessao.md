# Issue 04 — App: botão "Entrar na sessão" em Detalhes da Sessão

**Fase:** 4 — Fecha a Parte A
**Prioridade:** 🔴 Alta
**Arquivos principais:** `src/screens/detalhesSessao.js`
**Origem:** seção 3.3 de `SPEC_SESSOES_ONLINE_JITSI.md`

## Problema

Com as issues 02 e 03, o backend já entrega `sala_url` / `pode_entrar_sala` e o lembrete de 15 minutos já convida a entrar — mas ao tocar na notificação o usuário chega em `DetalhesSessao` e não encontra nenhuma forma de entrar na sala.

## Objetivo

Fechar o mecanismo principal (Parte A) de ponta a ponta: lembrete → toque → tela → um toque e está na sala.

**Esta issue entrega valor sozinha.** Concluída, a feature já é utilizável, mesmo sem as Partes B e C.

## Escopo de implementação

Em `src/screens/detalhesSessao.js`:

- Renderizar um botão primário **"Entrar na sessão"** quando `sessao.pode_entrar_sala` for verdadeiro, **acima** do bloco de ações já existente (`realizarSessao`, `marcarNaoRealizada`, `cancelarSessao`), por ser a ação mais urgente naquele momento.
- Reaproveitar o componente `Botao` (`src/components/common/Button.js`) com `iconName="videocam-outline"` — o componente já aceita `iconName`, `backgroundColor` e `disabled`.
- Abrir com `Linking.openURL(sessao.sala_url)`.
- Quando houver `sala_url` mas `pode_entrar_sala` for falso, exibir um aviso neutro informando a partir de quando será possível entrar, usando `sala_disponivel_em`. Não renderizar o botão desabilitado — informar é mais claro que bloquear em silêncio.
- Quando `sala_url` for `null` (presencial ou feature desligada), **não renderizar nada** relacionado a sala.
- Tratar falha de `Linking.openURL` com mensagem clara e opção de copiar o link para a área de transferência.

### Observações de implementação

- A tela já busca a sessão por `sessaoService.getSessao(sessaoId)` e já usa os flags `pode_realizar` / `pode_marcar_falta` / `pode_cancelar` vindos do serializer — os campos novos seguem exatamente esse padrão.
- `DetalhesSessao` já está registrada em `ROUTES_BY_PROFILE` **nos dois perfis** (`src/services/notificationService.js:40`), então o deep link funciona para paciente e psicólogo sem alteração em `routes.js`.
- A tela usa `CustomAlert as Alert` em alguns pontos do projeto; seguir o padrão já presente no arquivo.

## Tarefas

- [ ] Renderizar o botão "Entrar na sessão" condicionado a `pode_entrar_sala`, acima das ações existentes.
- [ ] Abrir a sala com `Linking.openURL`.
- [ ] Exibir aviso com `sala_disponivel_em` quando a janela ainda não abriu.
- [ ] Não renderizar nada quando `sala_url` for `null`.
- [ ] Tratar erro de abertura com opção de copiar o link.
- [ ] Conferir que as ações existentes (realizar, faltou, cancelar, pagamento) seguem funcionando sem alteração.

## Critérios de aceite

- ✅ Tocar no lembrete de 15 min abre `DetalhesSessao` da sessão correta, para paciente e psicólogo.
- ✅ Dentro da janela, o botão aparece e abre a sala.
- ✅ Paciente e psicólogo entrando pela mesma sessão caem na **mesma** sala.
- ✅ Fora da janela, a tela informa o horário a partir do qual será possível entrar.
- ✅ Sessão presencial não exibe nada relacionado a sala.
- ✅ As demais ações da tela permanecem inalteradas (regressão).

## Dependências

- Depende das issues 02 e 03.
- Não depende de 05, 06 nem 07.
