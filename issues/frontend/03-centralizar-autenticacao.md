# Issue: Centralização de Lógica de Auth (Frontend)

**Objetivo:** Desfragmentar o estado global de autenticação de psicólogo/paciente (Remover arquivos inúteis).

**Tarefas:**
- [ ] Localizar e deletar fisicamente o arquivo sufixado (boilerplate genérico e inativo) `src/contexts/AuthContext.js`.
- [ ] Garantir que o objeto de `AuthContext` seja criado e exportado unicamente de dentro de `src/providers/AuthProvider.js`.
- [ ] Ajustar as importações dos Controllers via Hook para assegurar que importem estritamente do único Provider existente, extirpando risco de referências circulares.
