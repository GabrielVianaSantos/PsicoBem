# Issue 03 — App: criar o componente `CustomAlert`

**Fase:** 2 — Alertas customizados
**Prioridade:** 🟡 Média
**Arquivos principais:** `src/components/common/CustomAlert.js` (novo), ponto de montagem na raiz do app
**Origem:** seções 2.3 e 3.3 de `SPEC_BADGES_NOVIDADES_E_ALERTAS_CUSTOMIZADOS.md`

## Problema

`Alert.alert` do React Native mostra o diálogo genérico do sistema operacional, sem nenhuma identidade visual do PsicoBem. Não existe hoje nenhum componente de modal/diálogo customizado em `src/components/common/`.

## Objetivo

Criar um componente de alerta com a mesma assinatura de `Alert.alert(title, message, buttons, options)`, para que as 19 telas que o usam hoje (issue 04) só precisem trocar o import, sem reescrever nenhuma chamada.

## Escopo de implementação

### `src/components/common/CustomAlert.js` (novo)

- `<CustomAlertProvider>`: componente React que mantém o estado do alerta atual (visível/oculto, título, mensagem, botões) e renderiza um `Modal` do React Native (`transparent`, `animationType="fade"`) com:
  - Card branco, `borderRadius: 12`, sombra leve, centralizado sobre um overlay escuro semi-transparente.
  - Título em `RalewayBold`, cor `#11B5A4`.
  - Mensagem em fonte padrão (`Raleway`), cor `#333`.
  - Botões dispostos horizontalmente (ou empilhados se forem 3+, a critério da implementação, desde que continuem legíveis), com estilo por `button.style`:
    - padrão (sem `style` ou `style: 'default'`): preenchido `#11B5A4`, texto branco;
    - `cancel`: contorno ou fundo neutro, texto `#666`;
    - `destructive`: preenchido ou texto `#EF5350`.
  - Sem botão nenhum informado (`Alert.alert(title, message)` só com 2 argumentos): renderizar um único botão "OK" que apenas fecha o modal.
- Função imperativa exportada, ex. `showAlert(title, message, buttons, options)`, implementada via referência de módulo para o método de abrir do Provider (padrão: o Provider guarda a referência de si mesmo em uma variável de módulo dentro de um `useEffect` de montagem; `showAlert` chama essa referência). Deve funcionar mesmo chamada fora de um componente React (mesmo uso que `Alert.alert` permite hoje).
- Exportar também um objeto `CustomAlert = { alert: showAlert }`, para permitir `import { CustomAlert as Alert } from ...` nas telas migradas (issue 04), preservando a sintaxe `Alert.alert(...)`.

### Montagem do Provider

- Envolver a árvore do app com `<CustomAlertProvider>` no mesmo nível onde `AuthProvider`/`NavigationContainer` já são montados hoje (raiz do app — confirmar o arquivo exato na implementação, ex. `App.js` ou onde `AuthProvider` é usado).

## Tarefas

- [ ] Criar `CustomAlert.js` com `CustomAlertProvider`, `showAlert` e o objeto `CustomAlert`.
- [ ] Montar `<CustomAlertProvider>` na raiz do app.
- [ ] Validar visualmente em uma tela piloto (ex.: um `Alert.alert` de teste temporário) antes de propagar na issue 04: alerta simples (1 botão), confirmação (`cancel` + padrão), confirmação destrutiva (`cancel` + `destructive`).
- [ ] Confirmar que chamar `showAlert` fora de um componente (ex. dentro de uma função de serviço) funciona igual a `Alert.alert`.

## Critérios de aceite

- ✅ `CustomAlert.alert(title, message)` mostra um modal com título, mensagem e botão único "OK".
- ✅ `CustomAlert.alert(title, message, [{text:'Cancelar', style:'cancel'}, {text:'Confirmar', onPress}])` mostra dois botões com estilos visualmente distintos e executa o `onPress` correto.
- ✅ Botão com `style: 'destructive'` tem destaque visual de alerta (vermelho).
- ✅ O modal segue a identidade visual do app (verde `#11B5A4`, `Raleway`/`RalewayBold`, cantos arredondados).
- ✅ Nenhuma tela existente foi alterada nesta issue (a migração é a issue 04).

## Dependências

- Nenhuma.
- É pré-requisito da issue 04.
