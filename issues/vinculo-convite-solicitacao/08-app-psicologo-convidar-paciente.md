# Issue 08 — App: tela "Convidar paciente" (psicólogo)

**Fase:** 5 — Telas do psicólogo
**Prioridade:** 🔴 Alta
**Arquivos principais:** nova `src/screens/convidarPaciente.js`, `src/routes.js`, `package.json`
**Origem:** seções 3.11 e 3.12 de `SPEC_VINCULO_CONVITE_E_SOLICITACAO.md`

## Problema

O convite é o caminho principal da feature, e não existe nenhuma superfície no app para o psicólogo obter ou compartilhar o dele.

## Objetivo

Uma tela onde o profissional pega seu link permanente, seu QR e seu código curto, e gera/administra convites de uso único.

## Escopo de implementação

- **Bloco do convite permanente:** link (`.../c/<slug>`), QR e o **código curto em destaque** (`ANA-4K7Q`). Botão de compartilhar usando o `Share` nativo do React Native (cai direto no WhatsApp, que é o canal real) e botão de copiar.
- **Bloco de convites de uso único:** botão de gerar (com `apelido` opcional), e lista dos existentes com estado (`ativo`, `usado`, `expirado`, `revogado`) e ação de revogar.
- Texto de apoio explicando, em uma linha, que o paciente pode usar **o link ou o código** — o código é o que funciona mesmo sem o app instalado.
- Entrada pela tela de vínculos do psicólogo (issue 09) e/ou pelo perfil.

### Dependências novas de pacote

- `react-native-qrcode-svg` — `react-native-svg@15.11.2` já está no projeto como peer.
- `expo-clipboard` para o botão de copiar (não há lib de clipboard hoje).
- `Share` vem do core do React Native; **não** adicionar dependência para isso.

## Tarefas

- [ ] Adicionar `react-native-qrcode-svg` e `expo-clipboard`.
- [ ] Criar `convidarPaciente.js` seguindo a linguagem visual de `home.js` (padrão do skill de redesign do projeto).
- [ ] Registrar a tela em `src/routes.js` no stack do psicólogo.
- [ ] Bloco do convite permanente: link, QR, código, copiar e compartilhar.
- [ ] Bloco de uso único: gerar, listar com estado, revogar (com confirmação).
- [ ] Estado de carregamento e de erro consistentes com as demais telas.
- [ ] Validar em dispositivo que o QR é legível e que o compartilhamento abre o WhatsApp com o texto correto.

## Critérios de aceite

- ✅ O psicólogo consegue obter e compartilhar link, QR e código sem sair da tela.
- ✅ Convites de uso único podem ser gerados, vistos com seu estado e revogados.
- ✅ Nenhum selo de verificação aparece na tela.

## Dependências

Depende da issue 07.
