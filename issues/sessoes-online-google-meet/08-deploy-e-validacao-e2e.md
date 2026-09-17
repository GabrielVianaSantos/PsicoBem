# Issue 08 — Deploy e validação ponta a ponta

**Fase:** 8 — Fechamento
**Prioridade:** 🟡 Média
**Arquivos principais:** nenhum (deploy e validação sobre as issues 01–07)
**Referência:** seções 7, 8 e 10 de `SPEC_SESSOES_ONLINE_GOOGLE_MEET.md`

## Problema

A feature substitui um mecanismo já deployado (Jitsi) por outro, atravessa cadastro, perfil, serializers, uma tarefa periódica nova e uma tela nova com animação. Boa parte só pode ser verificada com backend no ar e aparelho real.

## Objetivo

Colocar em produção, confirmar que o Jitsi foi completamente removido e validar o novo fluxo sem ter quebrado nada do que já funcionava.

## Escopo de implementação

### Deploy do backend

```bash
# na VPS: /opt/apps/projetos/psicobem/psicoapp_backend
git pull
docker compose -f docker-compose.yml up -d
```

- Confirmar nos logs: migrations de `link_sala_video` e de remoção de `sala_uuid` aplicadas sem erro; nova tarefa do beat (`dispatch_pre_session_host_reminder` ou nome equivalente) registrada.
- Remover `JITSI_BASE_URL`/`JITSI_ENABLED` do `.env` da VPS (não são mais lidos por ninguém após a issue 01).

### Validação no dispositivo (exige rebuild EAS — issue 06 adicionou `expo-linear-gradient`/`expo-blur`)

1. Cadastrar um psicólogo novo (nativo e via Google) sem informar o link → bloqueado com mensagem clara.
2. Cadastrar um psicólogo novo informando um link válido → sucesso, link salvo.
3. Sessão online desse psicólogo → "Entrar na sessão" abre a tela de preparo, roda a respiração guiada, e o botão final abre o Google Meet com o link correto.
4. Duas contas (paciente e psicólogo) entram no mesmo link e se veem na chamada.
5. Sessão presencial → nenhum elemento de sala em lugar nenhum.
6. Psicólogo (de teste, anterior a esta feature ou com o link removido do perfil) com sessão online → paciente vê aviso com telefone/e-mail; psicólogo vê convite a configurar; nenhum dos dois vê o botão de entrar.
7. Card "Minha Sala Virtual" no menu do psicólogo reflete corretamente os dois estados e leva ao campo certo do perfil.
8. Psicólogo recebe o lembrete de "entrar primeiro" 5–8 min antes de uma sessão online; paciente não recebe; sessão presencial não gera esse lembrete.
9. Remarcar uma sessão online → o link continua sendo o mesmo (link fixo do psicólogo, não regenera — comportamento esperado desta rota, diferente do Jitsi).
10. Agenda do dispositivo (`expo-calendar`, já implementada) e `.ics` continuam funcionando, usando o novo `sala_url`.

### Verificações de segurança

11. Autenticar como um terceiro e tentar obter a sessão alheia → negado, sem `sala_url`/`psicologo_contato_alternativo` em nenhuma resposta.
12. Psicólogo consultando sua própria sessão pendente → `psicologo_contato_alternativo` deve vir `null` (não é o paciente).
13. Inspecionar o payload do novo lembrete e confirmar que **não há URL de sala** nele.

### Regressão

14. Lembretes de 24h, 2h e 15min, confirmação pós-sessão, agendar/remarcar/cancelar/confirmar pagamento → inalterados.
15. Nenhuma referência a `sala_uuid`/Jitsi restante no código ou nas respostas de API.

## Tarefas

- [ ] Remover `JITSI_BASE_URL`/`JITSI_ENABLED` do `.env` da VPS.
- [ ] Gerar build EAS com `expo-linear-gradient`/`expo-blur` (issue 06) e instalar no aparelho de teste.
- [ ] `git pull` e `docker compose up -d` na VPS.
- [ ] Confirmar nos logs as migrations e o registro da nova tarefa do beat.
- [ ] Executar os cenários 1 a 10 no aparelho.
- [ ] Executar as verificações de segurança 11 a 13.
- [ ] Executar a regressão 14 a 15.
- [ ] Rodar a suíte de testes do backend uma última vez.
- [ ] `git diff --check` sem apontamentos.

## Critérios de aceite

- ✅ Todos os cenários de 1 a 15 passam.
- ✅ As migrations aplicaram em produção sem erro, inclusive a remoção de `sala_uuid`.
- ✅ Nenhum usuário acessa sala ou contato alternativo de sessão alheia.
- ✅ Nenhuma URL de sala aparece em payload de push.
- ✅ Fluxos anteriores de sessão (agendamento, pagamento, lembretes já existentes) permanecem inalterados.
- ✅ `git diff --check` passa sem apontamentos.

## Dependências

- Depende de todas as issues anteriores (01–07).
