# Issue: Divisão de Responsabilidades no Service de API (Frontend)

**Objetivo:** Particionar de acordo com SOLID (Single Responsibility) o documento maciço `/src/services/sessaoService.js` que engloba requests nada a ver com sessões.

**Tarefas:**
- [ ] Manter no `sessaoService.js` exclusivamente lógicas nativas das tabelas de sessão CRUD.
- [ ] Criar `/src/services/vinculoService.js` movendo lógica de chamadas API focadas em convites de pacientes.
- [ ] Criar `/src/services/prontuarioService.js` alocando os posts e recuperações de apontamentos clínicos.
- [ ] Criar `/src/services/odisseiaService.js` acomodando as chamadas para envio programado de sementes e diários de emoção.
- [ ] Atualizar e rastrear chamadas do `sessaoService` nas telas desmembradas para as referências corretas.
