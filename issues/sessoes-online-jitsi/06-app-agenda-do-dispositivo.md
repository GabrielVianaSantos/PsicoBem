# Issue 06 — App: evento na agenda do dispositivo (Parte B)

**Fase:** 6 — Conveniência
**Prioridade:** 🟡 Média
**Arquivos principais:** `src/services/agendaDispositivo.js` (novo), `src/screens/minhasSessoes.js`, `src/screens/sessoes.js`, `package.json`
**Origem:** seção 3.4 de `SPEC_SESSOES_ONLINE_JITSI.md`

## Problema

Com a Parte A concluída, o usuário só é lembrado se tiver o aplicativo instalado e com notificações ativas. O objetivo declarado da feature é que **nenhum dos dois precise ficar verificando o app** — o que exige que a sessão exista na agenda pessoal da pessoa.

## Objetivo

Gravar cada sessão futura como evento na agenda do próprio aparelho, com alarme, usando **permissão do sistema operacional** — sem OAuth, sem API do Google.

No Android, como a agenda padrão do aparelho costuma ser a conta Google do usuário, **o evento sincroniza sozinho para o Google Calendar** — que é o efeito desejado, obtido sem nenhuma integração com o Google.

## Escopo de implementação

### Dependência

`expo-calendar` (não instalado). **Exige rebuild EAS.** Usa `Calendar.requestCalendarPermissionsAsync()` — permissão do sistema, não OAuth.

### `src/services/agendaDispositivo.js` (novo)

```js
export async function solicitarPermissaoAgenda()
export async function obterCalendarioPadrao()
export async function sincronizarAgenda(sessoes)
```

**Escolha do calendário** — escrever no calendário **padrão gravável do aparelho**, não em um calendário próprio criado pelo app. Um calendário local exclusivo não sincroniza com a conta Google, o que anularia o principal benefício desta issue.

- iOS: `Calendar.getDefaultCalendarAsync()`.
- Android: `Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT)`, escolhendo o primeiro com `allowsModifications === true`, preferindo origem de conta Google e nível de acesso de proprietário; cair para o primeiro gravável se não houver.

**Mapeamento sessão ↔ evento** — o `eventId` é **específico do aparelho** e por isso **não** vai para o backend. Guardar em `AsyncStorage`, chave `@PsicoBem:calendarEvents`, formato `{ "<sessaoId>": "<eventId>" }`.

**Reconciliação** — `sincronizarAgenda(sessoes)` é chamada após o carregamento da lista de sessões e:

1. Para cada sessão futura com status ∈ `{agendada, confirmada, remarcada}`: cria o evento se não houver mapeamento, ou atualiza se os dados divergirem.
2. Para cada sessão `cancelada`: remove o evento e o mapeamento.
3. Para mapeamento cujo evento não existe mais no aparelho (o usuário apagou à mão): remover o mapeamento e **não recriar** — respeitar a decisão do usuário.

Reconciliar por leitura da lista é mais robusto do que reagir a eventos pontuais: recupera-se sozinho de falhas e de períodos sem rede.

### Conteúdo do evento — decisão de privacidade

| campo | valor |
|---|---|
| `title` | `"Sessão PsicoBem"` — **sem nome de participante, sem "terapia"/"psicólogo"** |
| `startDate` | `data_hora` |
| `endDate` | `data_hora + duracao_minutos` (60 min de fallback) |
| `notes` | `sala_url` quando houver |
| `location` | `sala_url` quando online |
| `alarms` | `[{ relativeOffset: -15 }]` |

O título é deliberadamente neutro porque o evento sincroniza para a conta Google do aparelho, e "quem faz terapia com quem" é dado referente à saúde (LGPD, art. 11).

### Consentimento

Antes de disparar a permissão do sistema, exibir explicação em linguagem clara sobre o que será gravado e sobre a possível sincronização com a conta Google do aparelho. Pedir a permissão sem esse esclarecimento não é consentimento informado.

Recusar a permissão **não pode** quebrar nada: a Parte A continua funcionando integralmente.

### Pontos de chamada

- `src/screens/minhasSessoes.js` (paciente), após carregar a lista.
- `src/screens/sessoes.js` (psicólogo), idem.

## Tarefas

- [ ] Instalar `expo-calendar` com yarn e rodar `npx expo-doctor`.
- [ ] Criar `src/services/agendaDispositivo.js` com as três funções.
- [ ] Implementar a seleção de calendário gravável, com as diferenças de iOS e Android.
- [ ] Implementar o mapeamento em `AsyncStorage`.
- [ ] Implementar a reconciliação com os três casos (criar/atualizar, remover, não recriar apagado).
- [ ] Montar o evento com título neutro, alarme de 15 min e link quando houver.
- [ ] Implementar a tela/aviso de consentimento antes da permissão.
- [ ] Chamar `sincronizarAgenda()` em `minhasSessoes.js` e `sessoes.js`.
- [ ] Gerar build EAS e validar em aparelho real.

## Critérios de aceite

- ✅ Concedida a permissão, sessões futuras viram eventos com alarme de 15 min.
- ✅ O título não contém nome de participante nem natureza clínica.
- ✅ Remarcar atualiza o evento existente, sem duplicar.
- ✅ Cancelar remove o evento.
- ✅ Evento apagado manualmente não é recriado.
- ✅ Recusar a permissão não quebra nada; a Parte A segue funcionando.
- ✅ Em Android com conta Google no aparelho, o evento aparece no Google Calendar.
- ✅ Nenhum `eventId` é enviado ao backend.

## Dependências

- Depende da issue 02 (`sala_url` no payload da lista de sessões).
- Independente das issues 04, 05 e 07.
