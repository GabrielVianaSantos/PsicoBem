# Issue 05 — Deploy e validação ponta a ponta

**Fase:** 5 — Fechamento
**Prioridade:** 🟡 Média
**Arquivos principais:** nenhum (deploy e validação sobre as issues 01–04)
**Origem:** seção 9 de `SPEC_POLITICA_CANCELAMENTO_SESSAO.md`

## Problema

A feature atravessa modelo de dados, contrato de API, notificação e uma confirmação nova no app com input condicional — boa parte só pode ser verificada com backend no ar e nos dois papéis (paciente e psicólogo).

## Objetivo

Colocar em produção e validar o conjunto, sem ter quebrado nada do que já funcionava.

## Escopo de implementação

### Deploy do backend

```bash
# na VPS: /opt/apps/projetos/psicobem/psicoapp_backend
git pull
docker compose -f docker-compose.yml restart web worker beat
```

> Diferente de features anteriores, aqui `build` não é necessário — nenhuma dependência Python nova é adicionada. O `restart` já recarrega o código (volume montado) e a migration da issue 01 roda sozinha no boot do `web`.

Confirmar nos logs: migration aplicada sem erro, gunicorn sem erro.

### Validação (após o app recarregar — sem exigir rebuild EAS, nenhuma dependência nativa nova)

1. Cancelar uma sessão com ≥24h de antecedência (paciente e psicólogo) → comportamento idêntico ao anterior, sem aviso novo.
2. Cancelar uma sessão com <24h de antecedência como **paciente** → aviso diferenciado aparece, motivo é opcional, cancela mesmo em branco.
3. Cancelar uma sessão com <24h de antecedência como **psicólogo** sem preencher motivo → não consegue confirmar.
4. Mesmo cenário, preenchendo o motivo → cancela normalmente.
5. Abrir `DetalhesSessao` da sessão cancelada tardiamente, dos dois lados (paciente e psicólogo) → ambos veem quem cancelou, que foi tardio, e o motivo.
6. Abrir uma sessão cancelada dentro do prazo → não mostra indicação de tardio.
7. Conferir que a outra parte recebeu a notificação de cancelamento com o motivo incluído.

### Verificações de segurança

8. Autenticar como terceiro e tentar obter a sessão alheia → negado, sem os campos novos em nenhuma resposta (comportamento já validado em SPECs anteriores, só confirmar que os campos novos seguem a mesma regra).

### Regressão

9. Cancelamento dentro do prazo, `status_pagamento='cancelado'`, notificações e demais fluxos de sessão (agendar, marcar realizada/faltou, confirmar pagamento) → inalterados.

## Tarefas

- [ ] `git pull` e `docker compose restart web worker beat` na VPS.
- [ ] Confirmar nos logs a migration aplicada sem erro.
- [ ] Executar os cenários 1 a 7 no aparelho (paciente e psicólogo).
- [ ] Executar a verificação de segurança 8.
- [ ] Executar a regressão 9.
- [ ] Rodar a suíte de testes do backend uma última vez.
- [ ] `git diff --check` sem apontamentos.

## Critérios de aceite

- ✅ Todos os cenários de 1 a 9 passam.
- ✅ A migração aplicou em produção sem erro.
- ✅ Nenhum cancelamento é bloqueado pela janela de 24h — só classificado.
- ✅ Nenhuma cobrança automática ocorre em nenhum cenário.
- ✅ Fluxos anteriores de sessão permanecem inalterados.
- ✅ `git diff --check` passa sem apontamentos.

## Dependências

- Depende de todas as issues anteriores (01–04).
