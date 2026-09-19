# Issue 13 — Regressão, deploy e validação end-to-end

**Fase:** 8 — Fechamento
**Prioridade:** 🔴 Alta
**Arquivos principais:** suíte de testes do backend, validação manual em dispositivo
**Origem:** seções 6 e 7 de `SPEC_VINCULO_CONVITE_E_SOLICITACAO.md`

## Objetivo

Fechar a feature confirmando que os dois defeitos de segurança foram corrigidos de fato, que a migração de dados rodou limpa em produção e que os fluxos funcionam ponta a ponta no dispositivo real.

## Escopo de implementação

### Regressões de segurança (obrigatórias)

- [ ] `PATCH /api/vinculos/{id}/ {"status":"ativo"}` com token de paciente sobre um vínculo `pendente` dele **não** altera nada.
- [ ] Nenhum paciente na base tem mais de um vínculo `ativo` após a migração; o constraint impede a criação de um segundo.
- [ ] `alterar-status` do psicólogo para `finalizado` **não** apaga prontuário nem cancela sessões.
- [ ] Nenhum vínculo nasce `ativo` a partir de CRP.

### Deploy

- [ ] Rodar a migração de saneamento em cópia do banco de produção antes do deploy real, conferindo quantos vínculos foram corrigidos.
- [ ] Deploy das issues 01–06 **no mesmo ciclo** (ver nota da issue 02: entre o constraint e a mudança do CRP existe uma janela em que a troca por CRP falharia com `IntegrityError`).
- [ ] `python manage.py test` completo no servidor após o deploy.

### Validação manual em dispositivo

- [ ] Psicólogo gera convite → paciente resgata **por código digitado** → vínculo ativo imediato.
- [ ] Paciente com vínculo ativo aceita convite de outro profissional → confirma a troca → verificar dos dois lados: profissional anterior não vê mais o paciente, sessões futuras sumiram, prontuários apagados, notificação recebida.
- [ ] Paciente informa CRP → psicólogo vê a solicitação com badge → aceita → paciente notificado (push **e** in-app).
- [ ] Paciente informa CRP → psicólogo recusa → paciente vê "Profissional indisponível para tratamento".
- [ ] Solicitação deixada 5 dias sem resposta expira e mostra a mesma mensagem.
- [ ] Encerramento avulso pelo paciente.
- [ ] Nenhum selo de verificação aparece em nenhuma tela.

## Critérios de aceite

- ✅ Todos os critérios de aceite da seção 6 da SPEC verificados.
- ✅ Suíte completa passando local e no servidor.
- ✅ Migração de produção executada com o número de correções registrado.

## Dependências

Depende de todas as issues anteriores, exceto a 12 (opcional).
