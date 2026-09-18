# Issue 05 — App: aviso "Paciente removido" em prontuários + deploy e validação e2e

**Fase:** 3 — Fechamento
**Prioridade:** 🟡 Média
**Arquivos principais:** `src/screens/guiasApoio.js` (ou a tela equivalente de listagem/detalhe de prontuários do psicólogo)
**Origem:** seção 3.3 de `SPEC_EXCLUSAO_CONTA.md`; deploy segue o mesmo padrão já usado nas features anteriores desta sessão.

## Problema

Depois da issue 01, um prontuário pode ter `paciente_removido: true` (paciente excluiu a própria conta). A tela de prontuários do psicólogo hoje assume que sempre existe um paciente vivo do outro lado — precisa exibir esse caso sem quebrar nem sugerir uma ação que não é mais possível (como navegar para o perfil de um paciente que não existe mais).

## Objetivo

Exibir um aviso claro de "Paciente removido" nesse caso, e fechar a feature com deploy + validação manual end-to-end cobrindo os dois perfis.

## Escopo de implementação

### App — tela de prontuários do psicólogo

- Onde a tela usa `paciente_nome`, continua funcionando sem alteração (o backend já devolve o nome certo, seja ao vivo ou via snapshot — issue 01).
- Onde a tela oferece alguma ação que dependa de navegar para o perfil do paciente (ex.: tocar no prontuário para ver dados do paciente vinculado), checar `paciente_removido` antes e, se `true`, desabilitar/ocultar essa ação com um indicador visual (ex.: badge ou texto "Paciente removido" ao lado do nome).
- Não remover nem ocultar o próprio prontuário (título, anotação, datas) — só a navegação para um paciente que não existe mais.

### Deploy

- Backend: `git pull` + aplicar as migrations das issues 01 (schema + backfill) na VPS + `docker compose restart web worker beat`, mesmo padrão já usado nesta sessão.
- Rodar a suíte de testes completa (`python manage.py test`) na VPS após o deploy, confirmando que segue 100% verde.
- App: nenhuma dependência nativa nova nesta feature (sem novo pacote Expo) — as mudanças de `authService.js`/telas são JS puro, não exigem build EAS, só reload do Metro.

### Validação manual end-to-end

- Criar uma conta de teste de paciente vinculada a um psicólogo de teste, com pelo menos uma sessão e um prontuário.
- Excluir a conta do paciente pelo app → confirmar que o login com esse e-mail falha depois, que o psicólogo ainda vê o prontuário (com "Paciente removido"), e que o vínculo/sessões desse paciente já não aparecem em nenhuma tela do psicólogo.
- Criar uma segunda conta de teste de psicólogo, com um paciente vinculado, sessões e prontuário.
- Excluir a conta do psicólogo pelo app → confirmar que o login com esse e-mail falha depois, e que o paciente vinculado deixa de ver vínculo/sessões/prontuário com esse psicólogo (efeito cascata total, conforme decidido).
- Confirmar em ambos os casos que, no dispositivo que executou a exclusão, o app volta para a tela de Login imediatamente após o sucesso.

## Tarefas

- [ ] Ajustar a tela de prontuários do psicólogo para o caso `paciente_removido: true`.
- [ ] Deploy do backend (migrations + restart) na VPS.
- [ ] Suíte completa de testes passando na VPS após o deploy.
- [ ] Validação manual end-to-end dos dois fluxos (paciente exclui, psicólogo exclui) em dispositivo/emulador.

## Critérios de aceite

- ✅ Tela de prontuários não quebra nem oferece uma ação inválida para um prontuário com `paciente_removido: true`.
- ✅ Deploy concluído, migrations aplicadas, testes verdes na VPS.
- ✅ Os dois fluxos de exclusão (paciente e psicólogo) validados manualmente, com o comportamento de cada um batendo exatamente com o que a SPEC e o README desta pasta descrevem como "regras que não podem regredir".

## Dependências

- Depende da issue 01 (campos do serializer já existentes) e da issue 04 (as duas telas de perfil já com a ação de exclusão pronta, para a validação e2e cobrir os dois lados).
