# Issue 05 — [Escopo revisado] Deploy e validação e2e

**Fase:** 3 — Fechamento
**Prioridade:** 🟡 Média
**Origem:** deploy segue o mesmo padrão já usado nas features anteriores desta sessão.

**Nota:** o aviso "Paciente removido" em prontuários (parte original desta issue) deixou de fazer sentido — a issue 01 (prontuário sobrevivendo à exclusão do paciente) foi revertida a pedido do usuário: agora o prontuário é apagado junto com a conta do paciente, igual ao que já acontecia do lado do psicólogo. Não há mais um estado "prontuário órfão" para exibir.

## Objetivo

Fechar a feature com deploy (backend) + validação manual end-to-end cobrindo os dois perfis.

## Escopo de implementação

### Deploy

- Backend: `git pull` + `docker compose restart web worker beat` na VPS (inclui a migração de reversão `0011_reverter_prontuario_cascade_total`, que roda automaticamente via `migrate` antes do restart).
- Rodar a suíte de testes completa (`python manage.py test`) na VPS após o deploy, confirmando que segue 100% verde.
- App: nenhuma dependência nativa nova nesta feature (sem novo pacote Expo) — as mudanças de `authService.js`/telas são JS puro, não exigem build EAS, só reload do Metro.

### Validação manual end-to-end

- Criar uma conta de teste de paciente vinculada a um psicólogo de teste, com pelo menos uma sessão e um prontuário.
- Excluir a conta do paciente pelo app → confirmar que o login com esse e-mail falha depois, e que sessões, vínculo e prontuário desse paciente desaparecem completamente das telas do psicólogo.
- Criar uma segunda conta de teste de psicólogo, com um paciente vinculado, sessões e prontuário.
- Excluir a conta do psicólogo pelo app → confirmar que o login com esse e-mail falha depois, e que o paciente vinculado deixa de ver vínculo/sessões/prontuário com esse psicólogo (efeito cascata total, nos dois sentidos).
- Confirmar em ambos os casos que, no dispositivo que executou a exclusão, o app volta para a tela de Login imediatamente após o sucesso.

## Tarefas

- [x] Deploy do backend (migrations + restart) na VPS.
- [x] Suíte completa de testes passando na VPS após o deploy.
- [ ] Validação manual end-to-end dos dois fluxos (paciente exclui, psicólogo exclui) em dispositivo/emulador — fica para o usuário confirmar em teste real.

## Critérios de aceite

- ✅ Deploy concluído, migrations aplicadas, testes verdes na VPS.
- [ ] Os dois fluxos de exclusão (paciente e psicólogo) validados manualmente pelo usuário, com cascata total simétrica confirmada nos dois sentidos.

## Dependências

- Depende da issue 04 (as duas telas de perfil já com a ação de exclusão pronta, para a validação e2e cobrir os dois lados).
