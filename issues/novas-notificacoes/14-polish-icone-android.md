# Issue 14 — POLISH: Ícone de notificação customizado para Android

**Fase:** 4 — Polish  
**Prioridade:** 🟢 Baixa  
**Arquivo:** `app.json` + `assets/`  
**Impacto:** Visual — notificações Android exibem ícone do PsicoBem em vez do ícone padrão Expo

## Contexto

Atualmente, as notificações push no Android exibem o ícone padrão do Expo (o "E" branco/amarelo), sem identidade visual do PsicoBem. O iOS usa automaticamente o ícone do app. Para Android, é necessário configurar explicitamente um ícone de notificação no `app.json` e criar o asset correspondente.

> ⚠️ **Requer nova build EAS.** Esta mudança só entra em vigor após gerar e distribuir uma nova build nativa.

## Objetivo

Adicionar o ícone de notificação monocromo verde do PsicoBem para Android no `app.json` e criar o asset `notification-icon.png`.

## Tarefas

### Criar o asset do ícone

- [ ] Criar o arquivo `assets/notification-icon.png` com as especificações:
  - **Tamanho:** 96×96px (mínimo; 192×192px recomendado para telas de alta densidade)
  - **Cor:** Ícone **branco** em fundo **transparente** (PNG com alpha)
  - **Conteúdo:** Versão simplificada do logo do PsicoBem em silhueta branca
  - **Formato:** PNG (não JPEG, não WebP)
  - **Nota:** Android aplica a cor `#11B5A4` sobre o ícone monocromo automaticamente

### Configurar `app.json`

- [ ] Adicionar a seção `notification` dentro de `expo` no `app.json`:

```json
{
  "expo": {
    "notification": {
      "icon": "./assets/notification-icon.png",
      "color": "#11B5A4"
    }
  }
}
```

- [ ] Verificar se já existe configuração `notification` no `app.json` para não duplicar.
- [ ] Confirmar que o caminho `./assets/notification-icon.png` está correto.

### Validar

- [ ] Verificar que o `notification-icon.png` passa na validação do EAS (`eas build --check` ou equivalente).
- [ ] Após nova build EAS (Android), verificar nas notificações recebidas que:
  - O ícone no status bar é o ícone monocromo do PsicoBem (não o Expo).
  - A cor de destaque é verde `#11B5A4`.

## Critério de aceite

- ✅ `assets/notification-icon.png` existe, é 96×96px+ e tem fundo transparente.
- ✅ `app.json` contém `notification.icon` e `notification.color: "#11B5A4"`.
- ✅ Após nova build EAS Android, ícone do PsicoBem aparece no sistema de notificações.
- ✅ Sem alterações no comportamento de notificações iOS (não afetado).

## Dependências

- Nova build EAS após a mudança (não precisa de build separada — pode ser combinada com outras mudanças).
- O ícone do app (`assets/icon.png`) pode ser usado como referência para criar a versão monocromática.
