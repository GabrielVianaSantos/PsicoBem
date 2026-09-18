# Issue 01 — [REVERTIDA] Backend: prontuário sobrevive à exclusão do paciente

**Status:** implementada, testada, deployada e **em seguida revertida** a pedido do usuário: "caso o usuário de fato delete a conta, pode apagar os prontuários dele sim, como fizemos no do psicólogo."
**Origem:** seção 3.3 de `SPEC_EXCLUSAO_CONTA.md` (versão original, já atualizada).

## O que esta issue previa

`Prontuario.paciente` como `SET_NULL` + campo `paciente_nome_snapshot`, para o prontuário sobreviver órfão quando o paciente excluísse a própria conta — assimetria em relação ao psicólogo (issue 02/`test_cascata_psicologo_...`), que sempre teve cascata total.

## O que foi feito depois da reversão

- `Prontuario.paciente` voltou a `on_delete=models.CASCADE` (igual ao psicólogo).
- Campo `paciente_nome_snapshot` removido.
- `ProntuarioSerializer` voltou à forma original (`paciente_nome` como `CharField(source=...)` simples, sem `paciente_removido`).
- Nova migração (`core/migrations/0011_reverter_prontuario_cascade_total.py`) reverte o schema por cima das migrations 0009/0010 (que não foram editadas nem removidas — já tinham sido aplicadas em produção) e apaga defensivamente qualquer prontuário órfão que já existisse (nenhum existia).
- Testes de `core/tests.py` e `authentication/tests.py` atualizados: agora confirmam que o prontuário **é apagado** junto com a conta do paciente, exatamente como já acontecia com a conta do psicólogo.

A exclusão de conta agora é **simétrica e sem exceções** para os dois perfis — ver `SPEC_EXCLUSAO_CONTA.md` atualizada.
