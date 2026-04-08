# Issue 15 — POLISH: Badge counter nas notificações

**Fase:** 4 — Polish  
**Prioridade:** 🟢 Baixa  
**Arquivos:** `src/services/notificationService.js` + `src/screens/notificacoes.js`  
**Impacto:** UX — badge com contagem de não-lidas visível no ícone do app

## Contexto

O badge counter (o bolinha vermelha com número que aparece sobre o ícone do app) está desabilitado (`shouldSetBadge: false` em `notificationService.js`). A tela `HomePaciente` já exibe um badge com a contagem de não-lidas sobre o ícone de sino, mas o ícone do app no launcher/homescreen não reflete essa contagem. Habilitá-lo melhora a visibilidade de notificações pendentes.

## Objetivo

1. Habilitar o `shouldSetBadge: true` em `notificationService.js`.
2. Resetar o badge para `0` automaticamente ao abrir a tela de notificações.

## Tarefas

### 1. Habilitar badge em `notificationService.js`

- [ ] Localizar em `src/services/notificationService.js` a configuração do handler de notificações que contém `shouldSetBadge: false`.
- [ ] Alterar para `true`:

```javascript
// notificationService.js — configuração do notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,  // ← era false
  }),
});
```

### 2. Resetar badge ao abrir tela de notificações em `notificacoes.js`

- [ ] Localizar em `src/screens/notificacoes.js` o `useFocusEffect` (ou `useEffect`) que é chamado ao entrar na tela.
- [ ] Adicionar o reset do badge:

```javascript
// notificacoes.js — dentro do useFocusEffect
import * as Notifications from 'expo-notifications';

useFocusEffect(
  React.useCallback(() => {
    // Reset badge ao entrar na tela
    Notifications.setBadgeCountAsync(0);

    // ... restante do código existente (fetch de notificações, etc.)
  }, [])
);
```

- [ ] Se não existir `useFocusEffect`, importar de `@react-navigation/native`:
```javascript
import { useFocusEffect } from '@react-navigation/native';
```

### 3. Validação

- [ ] Testar: receber uma notificação push → verificar que o badge aparece sobre o ícone do app.
- [ ] Testar: abrir a tela `Notificacoes` → verificar que o badge zera.
- [ ] Verificar comportamento no iOS (badge requer permissão explícita, que já é solicitada no onboarding).
- [ ] Verificar que o badge não fica "preso" em valores incorretos após marcar como lida via "Ler todas".

## Critério de aceite

- ✅ `shouldSetBadge: true` em `notificationService.js`.
- ✅ Badge aparece com a contagem correta no ícone do app ao receber push.
- ✅ Badge é zerado quando o usuário abre a tela `Notificacoes`.
- ✅ Sem erros de permissão em iOS (verificar que `allowsDisplayInNotificationCenter` está configurado).

## Dependências

- Nenhuma — pode ser implementado e testado sem nova build (mudança JS pura no Expo).
- Para iOS, o badge só funciona se o usuário tiver concedido permissão de notificação.
