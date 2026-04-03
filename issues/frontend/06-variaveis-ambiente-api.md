# Issue: Deploy via Variáveis de Ambiente (Frontend)

**Objetivo:** Impedir falhas de timeout em celulares físicos e ocultar o IP exposto do backend.

**Tarefas:**
- [ ] Setup do pacote via `npx expo install dotenv` (opcional caso as tags EXPO já suportem out-of-the-box na versão React 19 instalada).
- [ ] Modificar `BASE_URL` em `src/services/api.js` deletando a string e a fixando em `process.env.EXPO_PUBLIC_API_URL`.
- [ ] Criar e adicionar um `.env` puro na raiz do frontend com o apontamento dev pra rede da máquina host.
