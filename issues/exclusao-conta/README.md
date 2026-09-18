# Issues — Exclusão de Conta (Paciente e Psicólogo)

Data de geração: 2026-09-18
Origem: `SPEC_EXCLUSAO_CONTA.md`
Escopo: novo endpoint autenticado de auto-exclusão de conta + ação correspondente na tela de perfil de paciente e de psicólogo. A exclusão em si já é resolvida pelo `CASCADE` nativo do banco a partir de `CustomUser` — o trabalho real é a confirmação, a exceção dos prontuários e a UI. Nenhuma alteração foi aplicada nesta entrega.

## Estrutura

| Etapa | Issue | Foco | Prioridade |
|---|---|---|---|
| 1 | `01-backend-prontuario-sobrevive-exclusao.md` | `Prontuario.paciente` vira `SET_NULL` + snapshot do nome + serializer resiliente. | 🔴 Alta |
| 2 | `02-backend-endpoint-exclusao-conta.md` | `DELETE /api/auth/account/` com confirmação (senha ou frase) e testes de cascata. | 🔴 Alta |
| 3 | `03-app-excluir-conta-paciente.md` | Ação "Excluir Conta" em `meuPerfil.js` + `authService.deleteAccount()`. | 🔴 Alta |
| 4 | `04-app-excluir-conta-psicologo.md` | Mesma ação em `perfilPsicologo.js`, com aviso de cascata total. | 🟡 Média |
| 5 | `05-app-prontuario-removido-e-deploy-e2e.md` | Aviso "Paciente removido" em prontuários + deploy e validação ponta a ponta. | 🟡 Média |

## Ordem recomendada

1. [01-backend-prontuario-sobrevive-exclusao.md](01-backend-prontuario-sobrevive-exclusao.md)
2. [02-backend-endpoint-exclusao-conta.md](02-backend-endpoint-exclusao-conta.md)
3. [03-app-excluir-conta-paciente.md](03-app-excluir-conta-paciente.md)
4. [04-app-excluir-conta-psicologo.md](04-app-excluir-conta-psicologo.md)
5. [05-app-prontuario-removido-e-deploy-e2e.md](05-app-prontuario-removido-e-deploy-e2e.md)

## Dependências

- A issue 01 é pré-requisito funcional da 02: o endpoint de exclusão só cumpre o critério de aceite "prontuário sobrevive" se `Prontuario.paciente` já for `SET_NULL` antes dele existir.
- A issue 02 é a base de todo o restante do app (03, 04 e 05 dependem dela existir e estar testada).
- A issue 03 depende de 02. A issue 04 depende de 02 e reaproveita o `authService.deleteAccount()` criado em 03 — não duplicar esse método.
- A issue 05 depende de 01 (campos novos do serializer) e de 04 (as duas telas de perfil já prontas, para a validação end-to-end cobrir os dois perfis).

## Regras que não podem regredir

- O endpoint de exclusão **nunca** recebe um ID de usuário-alvo — opera exclusivamente sobre `request.user`. Não introduzir nenhum parâmetro que permita excluir a conta de outra pessoa.
- Confirmação é **sempre** obrigatória antes de excluir: senha atual para quem tem `has_password: true`; a frase "EXCLUIR" para contas Google-only sem senha (`has_password: false`). Nenhum dos dois fluxos pode ser pulado.
- **Psicólogo exclui a conta → cascata total, sem exceção** (sessões, vínculos e prontuários de todos os pacientes dele somem). Essa é uma decisão já confirmada — não introduzir nenhuma preservação parcial aqui sem voltar à SPEC.
- **Paciente exclui a conta → prontuários que o psicólogo escreveu sobre ele sobrevivem**, com `paciente=None` e `paciente_nome_snapshot` preenchido. Todo o resto do paciente (sessões, vínculo, diário de Odisseia e comentários nele, metas, notificações, dispositivos push) é apagado normalmente.
- `RegistroOdisseia`/`RegistroOdisseiaComentario` **não** entram na exceção de preservação — continuam `CASCADE`. A exceção é só para `Prontuario`.
- Depois de excluir a própria conta com sucesso, o app **sempre** roda a limpeza local completa de `AuthProvider.logout()` (dispositivo push, sessão Google, `AsyncStorage`, estado) antes de navegar para `Login` — não implementar uma limpeza local paralela/duplicada.
- Nenhuma notificação automática é criada para avisar a outra parte (psicólogo ou paciente) quando alguém exclui a própria conta — está fora de escopo por decisão explícita.
