# Issue 08 — Deploy e validação ponta a ponta

**Fase:** 8 — Fechamento
**Prioridade:** 🟡 Média
**Arquivos principais:** nenhum (deploy e validação sobre as issues 01–07)
**Origem:** seções 6 e 7 de `SPEC_SESSOES_ONLINE_JITSI.md`

## Problema

A feature atravessa modelo de dados, contrato de API, tarefas periódicas, notificações e integração nativa com a agenda do aparelho. Boa parte só pode ser verificada com backend no ar e aparelho real.

## Objetivo

Colocar em produção e validar o conjunto, sem ter quebrado nada do que já funcionava.

## Escopo de implementação

### Deploy do backend

```bash
# na VPS: /opt/apps/projetos/psicobem/psicoapp_backend
git pull
docker compose -f docker-compose.yml up -d
```

> **Diferente da feature de login com Google, aqui `build` não é necessário**: nenhuma dependência Python nova é adicionada (o `.ics` é texto puro). Um `restart`/`up -d` basta. A migration da issue 01 roda sozinha, porque o compose já executa `python manage.py migrate` no boot do `web`.

Antes de ligar, decidir o valor de `JITSI_BASE_URL` e `JITSI_ENABLED` no `.env` da VPS (lido via `env_file`). É possível deployar com `JITSI_ENABLED=False` e ligar depois.

Confirmar nos logs: migration aplicada, gunicorn sem erro, e a nova tarefa do beat registrada.

### Validação no dispositivo (após rebuild EAS)

1. Sessão online daqui a ~20 min → chega o lembrete de 15 min → tocar abre `DetalhesSessao` → "Entrar na sessão" abre a sala.
2. Duas contas (paciente e psicólogo) entram na **mesma** sala e se veem.
3. Sessão presencial → nenhum elemento de sala em lugar nenhum.
4. Conceder permissão de calendário → evento criado com alarme; conferir na agenda do aparelho.
5. Android com conta Google → confirmar que o evento apareceu também no Google Calendar.
6. Remarcar → evento atualizado, sem duplicata, e **link novo** (regeneração da issue 01).
7. Cancelar → evento removido da agenda.
8. Apagar o evento à mão e recarregar a lista → não é recriado.
9. Recusar a permissão de calendário → app segue funcionando; Parte A intacta.
10. Após o fim previsto → **psicólogo** recebe a confirmação; **paciente não**.
11. Marcar "Sessão realizada" pela notificação → status e cobrança atualizados.
12. Parte C, se implementada: "Adicionar à minha agenda" importa corretamente.

### Verificações de segurança

13. Inspecionar o payload de uma notificação recebida e confirmar que **a URL da sala não está lá**, nem no corpo nem no `data`.
14. Autenticar como um terceiro e tentar obter a sessão alheia → negado, e sem `sala_url` em nenhuma resposta.
15. Conferir que `sala_uuid` não aparece em nenhuma resposta de API.

### Regressão

16. Agendar, remarcar, cancelar e confirmar pagamento → inalterados.
17. Lembretes de 24h e 2h → continuam chegando normalmente.
18. Sessões presenciais → comportamento idêntico ao anterior.

## Tarefas

- [ ] Definir `JITSI_BASE_URL` e `JITSI_ENABLED` no `.env` da VPS.
- [ ] `git pull` e `docker compose up -d` na VPS.
- [ ] Confirmar nos logs a migration e o registro da nova tarefa do beat.
- [ ] Gerar build EAS com `expo-calendar` (e `expo-sharing`, se a issue 07 entrar).
- [ ] Executar os cenários 1 a 12 no aparelho.
- [ ] Executar as verificações de segurança 13 a 15.
- [ ] Executar a regressão 16 a 18.
- [ ] Rodar a suíte de testes do backend uma última vez.
- [ ] `git diff --check` sem apontamentos.

## Critérios de aceite

- ✅ Todos os cenários de 1 a 18 passam.
- ✅ A migração aplicou em produção sem erro.
- ✅ A URL da sala não aparece em nenhum payload de push.
- ✅ Nenhum usuário acessa sala de sessão alheia.
- ✅ Nenhum desfecho de sessão foi marcado automaticamente pelo sistema.
- ✅ Fluxos anteriores de sessão permanecem inalterados.
- ✅ `git diff --check` passa sem apontamentos.

## Dependências

- Depende de todas as issues anteriores (01–07; a 07 é opcional).
