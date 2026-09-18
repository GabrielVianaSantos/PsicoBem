# Issue 04 — App: "Excluir Conta" no perfil do psicólogo

**Fase:** 2 — App
**Prioridade:** 🟡 Média
**Arquivos principais:** `src/screens/perfilPsicologo.js`
**Origem:** seções 3.4 e 3.5 de `SPEC_EXCLUSAO_CONTA.md`

## Problema

O psicólogo também precisa poder excluir a própria conta, mas o alcance real da ação é maior que no caso do paciente: sessões, vínculos e prontuários de **todos os pacientes vinculados** somem junto, não só os dados dele. Isso precisa ficar explícito antes de confirmar.

## Objetivo

Replicar a ação "Excluir Conta" de `meuPerfil.js` em `perfilPsicologo.js`, reaproveitando o mesmo `authService.deleteAccount()`, com um texto de aviso próprio que deixa claro o efeito em cascata sobre os pacientes.

## Escopo de implementação

- Mesmo botão, mesmo `Modal` de confirmação (senha ou frase "EXCLUIR", conforme `hasPassword`) e mesmo fluxo de sucesso/erro da issue 03 — **não duplicar** `authService.deleteAccount()`, importar o mesmo método já criado.
- Único ponto que muda de verdade: o texto do `Alert` de confirmação inicial. Para o psicólogo, mencionar explicitamente que **sessões, vínculos e prontuários de todos os pacientes vinculados também serão apagados permanentemente** — não é só a conta dele. Este é o texto que a SPEC pede para evitar reclamação por surpresa depois.
- Mesmo destaque visual (botão vermelho sólido) e mesma posição relativa (logo abaixo de "Sair da Conta").

## Tarefas

- [ ] Botão "Excluir Conta" em `perfilPsicologo.js`, reaproveitando `authService.deleteAccount()`.
- [ ] `Alert` de confirmação inicial com o texto específico do psicólogo (menção explícita ao efeito sobre pacientes vinculados).
- [ ] `Modal` de confirmação final (senha ou frase), mesmo padrão da issue 03.
- [ ] Integração com `logout()` + navegação para `Login` em caso de sucesso; erro mantém a conta e exibe a mensagem, sem deslogar.
- [ ] Testar manualmente com um psicólogo que tenha pelo menos um paciente vinculado com sessões e prontuários, confirmando que o aviso reflete a realidade do que vai acontecer.

## Critérios de aceite

- ✅ Mesmos critérios de aceite da issue 03, aplicados à tela do psicólogo.
- ✅ O texto do `Alert` de confirmação inicial menciona explicitamente o impacto sobre os pacientes vinculados (sessões, vínculos, prontuários), diferente do texto usado para o paciente.
- ✅ Nenhuma lógica de exclusão é duplicada — `authService.deleteAccount()` é o mesmo método usado pelas duas telas.

## Dependências

- Depende da issue 02 (endpoint) e da issue 03 (reaproveita `authService.deleteAccount()` de lá — implementar 03 primeiro).
