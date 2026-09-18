# SPEC — Política de Cancelamento Tardio de Sessão

Data: 2026-09-18
Status: planejamento
Escopo: backend Django (`sessoes`) + aplicativo Expo. Sem gateway de pagamento, sem cobrança automática, sem remarcação (fora de escopo — ver seção 9).

---

## 1. Objetivo

Dar visibilidade e registro formal quando uma sessão é cancelada **com pouca antecedência** (menos de 24h antes do horário marcado), sem introduzir nenhuma cobrança automática — o app não processa pagamento, então a única coisa que ele pode fazer com segurança é **avisar antes de acontecer** e **registrar depois**, deixando a decisão comercial (cobrar ou não por fora) inteiramente com o psicólogo.

O desenho parte de uma assimetria deliberada:

| Quem cancela tarde | Consequência |
|---|---|
| **Paciente** | Fica registrado no histórico da sessão, visível aos dois lados. Motivo é **opcional** (cobre casos de força maior — queda de energia, sem internet — sem exigir justificativa). |
| **Psicólogo** | Fica registrado no histórico. Motivo é **obrigatório** — quem presta o serviço e cancela em cima da hora deve satisfação ao paciente. |

Em nenhum dos dois casos a ação de cancelar é bloqueada — a política é de **transparência e registro**, não de impedimento. Um aviso prévio, nos dois sentidos, dá a chance de reconsiderar antes de confirmar.

## 2. Estado atual identificado

| Tema | Estado atual | Impacto |
|---|---|---|
| Janela de cancelamento | `Sessao.pode_ser_cancelada()` (`sessoes/models.py`) só verifica `status in ('agendada','confirmada')` e `data_hora > timezone.now()` — **nenhuma regra de antecedência mínima existe hoje**. Cancelar 1 minuto antes do horário tem exatamente o mesmo efeito que cancelar com uma semana de antecedência. | É o problema relatado pelo usuário: cancelamento em cima da hora não é diferenciado de forma nenhuma hoje. |
| Quem pode cancelar | `SessaoViewSet.cancelar()` (`sessoes/views.py`) é chamável tanto por paciente quanto por psicólogo (queryset já restringe à própria sessão). A view já sabe diferenciar quem chamou (`hasattr(request.user, 'psicologo_profile')`) para decidir a quem notificar — só não persiste esse dado no modelo. | Base pronta para reaproveitar; só falta persistir "quem cancelou" e a janela de antecedência. |
| Pagamento ao cancelar | Corrigido recentemente: `cancelar()` já marca `status_pagamento='cancelado'` (a menos que já esteja `'pago'`) — ver commit anterior a esta SPEC. **Esta regra não muda.** | A política de cancelamento tardio é ortogonal a essa correção; convivem sem conflito. |
| Remarcação | `pode_ser_remarcada()` existe como método booleano e `pode_remarcar` é exposto no serializer, mas **não existe nenhum endpoint, tela ou fluxo de remarcação de fato** — o campo está ocioso. A única forma de alterar `data_hora` hoje é um `PATCH` genérico em `/sessoes/{id}/` via `SessaoUpdateSerializer`, sem nenhuma restrição de papel (paciente tecnicamente consegue chamar isso hoje). | Confirma que remarcação é greenfield — ver decisão de deixá-la fora desta SPEC (seção 9) e a brecha de autorização identificada (seção 6). |
| Notificação de cancelamento | `NotificationDomainService.emit()` já dispara para a outra parte ao cancelar, com mensagem e roteamento para `DetalhesSessao`. | Reaproveitado; mensagem passa a poder mencionar o motivo quando houver. |
| Sem gateway de pagamento | Confirmado: `confirmar_pagamento()` é uma marcação manual feita pelo psicólogo — não existe integração com processador de pagamento (Pix, cartão, etc.). | Justifica a decisão de **nunca** cobrar automaticamente — qualquer "taxa" é uma decisão humana, fora do app. |

## 3. Requisitos funcionais e regras de negócio

### 3.1 Janela de antecedência

- **Fixa em 24 horas**, igual para todo psicólogo e toda sessão (não configurável por enquanto — ver seção 9).
- Um cancelamento é **tardio** quando `data_hora - agora < 24 horas` no momento em que a ação de cancelar é executada.
- A janela **nunca bloqueia** o cancelamento — apenas o classifica. `pode_ser_cancelada()` continua com a mesma regra de hoje (sessão futura, status `agendada`/`confirmada`).

### 3.2 Novos campos em `Sessao`

```python
cancelado_por = models.CharField(
    max_length=10,
    choices=[('paciente', 'Paciente'), ('psicologo', 'Psicólogo')],
    null=True, blank=True,
)
cancelamento_tardio = models.BooleanField(default=False)
motivo_cancelamento = models.TextField(null=True, blank=True)
```

Os três campos só são preenchidos no momento do cancelamento (`cancelar()`); permanecem `None`/`False` para qualquer sessão que nunca foi cancelada. Não há necessidade de backfill — sessões já canceladas antes desta feature simplesmente não têm essa informação (ficam com os três campos vazios, tratados pela API/UI como "sem registro disponível").

### 3.3 Regra de motivo

| Quem cancela | Janela | Motivo |
|---|---|---|
| Paciente | Dentro do prazo (≥24h) | Não se aplica (não é tardio) |
| Paciente | Tardio (<24h) | **Opcional** — cobre força maior (queda de energia, sem internet) sem exigir justificativa |
| Psicólogo | Dentro do prazo (≥24h) | Não se aplica |
| Psicólogo | Tardio (<24h) | **Obrigatório** — a ausência de motivo é erro de validação (400) |

### 3.4 Endpoint `POST /sessoes/{id}/cancelar/`

- Passa a aceitar um corpo opcional: `{ "motivo": "..." }`.
- No momento da chamada, calcula `cancelamento_tardio` a partir de `data_hora` vs. `timezone.now()`.
- Se quem chama é o psicólogo **e** o cancelamento é tardio **e** `motivo` está vazio → `400` com mensagem clara ("Informe o motivo do cancelamento tardio.").
- Preenche `cancelado_por` a partir de quem fez a chamada (mesma checagem `hasattr(request.user, 'psicologo_profile')` já usada para notificação).
- Mantém a regra já existente de `status_pagamento` (seção 2).
- A notificação para a outra parte passa a incluir o motivo na mensagem, quando houver (sem alterar o `_routing_payload`, que continua apontando pra `DetalhesSessao`).

### 3.5 Aviso prévio (client-side)

- Novo campo somente-leitura no serializer: `cancelamento_seria_tardio` (booleano), calculado com a mesma regra da seção 3.1, disponível **antes** de qualquer tentativa de cancelamento — para o app decidir se mostra o aviso extra.
- Ao tocar em "Cancelar Sessão" com `cancelamento_seria_tardio = true`, o app mostra uma confirmação diferenciada (ex.: "Isso conta como cancelamento tardio (menos de 24h de antecedência) e ficará registrado. Deseja continuar?"), para os dois papéis.
- Se quem cancela é o psicólogo nesse cenário, a confirmação inclui um campo de texto obrigatório para o motivo antes de habilitar o botão de confirmar.
- Se quem cancela é o paciente, o campo de motivo aparece como opcional (pode confirmar em branco).

### 3.6 Visibilidade

- `DetalhesSessao` exibe, para sessões com `status == 'cancelada'` e `cancelado_por` preenchido, uma seção com: quem cancelou, se foi tardio, e o motivo (quando houver) — visível **para os dois lados** (paciente e psicólogo), sem restrição adicional além da autorização de participante já existente.

## 4. Alterações previstas por área/arquivo

**Backend**
- `sessoes/models.py` — três campos novos em `Sessao`; propriedade `cancelamento_seria_tardio` (mesma regra de `data_hora - now() < 24h`, sem depender de `sala_url`/modalidade — vale pra presencial e online).
- `sessoes/migrations/` — migration de `AddField` (nullable, sem backfill).
- `sessoes/serializers.py` — `SessaoListSerializer`/`SessaoDetailSerializer`: novos campos `cancelado_por`, `cancelado_por_display`, `cancelamento_tardio`, `motivo_cancelamento`, `cancelamento_seria_tardio`.
- `sessoes/views.py` — `cancelar()`: aceitar `motivo` no corpo, calcular tardio, validar obrigatoriedade condicional, persistir os três campos, enriquecer a mensagem de notificação.

**App**
- `src/screens/detalhesSessao.js` — `cancelarSessao()` passa a checar `sessao.cancelamento_seria_tardio` e ramificar a confirmação (aviso diferenciado + campo de motivo obrigatório/opcional conforme o papel); nova seção de exibição de "cancelado tarde / motivo" quando aplicável.
- Precisa de um componente de confirmação com campo de texto (o `CustomAlert` atual não suporta input) — decidir na fase de issues se é um modal novo ou uma tela dedicada pequena.

## 5. Autorização, privacidade e segurança

- Nenhuma mudança na regra de quem pode cancelar (`IsPacienteOrPsicologoOwner`, queryset restrito ao dono da sessão) — permanece igual.
- O motivo de cancelamento é um texto livre; não deve conter validação de conteúdo além do obrigatório/opcional já definido — é responsabilidade do usuário que digita.
- `cancelado_por`, `cancelamento_tardio` e `motivo_cancelamento` são visíveis aos dois participantes da própria sessão, nunca a terceiros — mesma regra de autorização já usada para `sala_url`/`psicologo_contato_alternativo`.
- **Brecha de autorização identificada (fora de escopo desta SPEC, mas registrada):** hoje o `SessaoUpdateSerializer`/`SessaoViewSet.update()` permite que um **paciente** altere `data_hora`/`status` via `PATCH` genérico, sem passar pela action dedicada `cancelar()`. Isso não é introduzido por esta SPEC, mas convém corrigir antes ou junto de uma futura SPEC de remarcação, para que a política aqui descrita não possa ser contornada por um `PATCH` direto.

## 6. Critérios de aceite

- ✅ Cancelar uma sessão com ≥24h de antecedência funciona exatamente como hoje, sem nenhum campo novo preenchido além de `cancelado_por`.
- ✅ Cancelar com <24h de antecedência preenche `cancelamento_tardio=True`, `cancelado_por` e `motivo_cancelamento` (quando enviado).
- ✅ Psicólogo cancelando tarde sem enviar `motivo` recebe 400 com mensagem clara; enviando, a sessão é cancelada normalmente.
- ✅ Paciente cancelando tarde sem enviar `motivo` é aceito normalmente (campo fica vazio).
- ✅ `cancelamento_seria_tardio` reflete corretamente a janela de 24h antes de qualquer cancelamento acontecer.
- ✅ Ambos os participantes veem a marcação de cancelamento tardio e o motivo em `DetalhesSessao`; nenhum terceiro consegue.
- ✅ Nenhuma cobrança ou alteração de `status_pagamento` além da regra já existente (`cancelado`, seção 2) é introduzida.
- ✅ Sessões canceladas antes desta feature continuam sendo exibidas normalmente, com os campos novos vazios/nulos.

## 7. Testes e validação

- Backend: cancelamento dentro do prazo (paciente e psicólogo) não marca tardio; cancelamento tardio de paciente sem motivo é aceito; cancelamento tardio de psicólogo sem motivo é rejeitado (400); com motivo, é aceito e persistido; `cancelamento_seria_tardio` testado nos limites da janela (23h59 vs 24h01, mesmo padrão de teste de fronteira já usado em `pode_entrar_na_sala`); autorização (terceiro não vê os campos novos).
- App: validar manualmente o aviso diferenciado e a exigência de motivo por papel; validar exibição da seção de cancelamento na tela de detalhes para os dois lados.
- Regressão: fluxo de cancelamento dentro do prazo, notificações, e a regra de `status_pagamento='cancelado'` já existente continuam idênticos.

## 8. Itens fora de escopo

- **Remarcação (reagendamento)** — descartada explicitamente desta SPEC. Fica para uma SPEC futura, se fizer sentido; a brecha de autorização do `PATCH` genérico (seção 6) deve ser resolvida antes ou junto dela.
- Cobrança automática de qualquer valor — nunca, dado que não há gateway de pagamento.
- Janela configurável por psicólogo — fixa em 24h para todos por enquanto.
- Rastreamento de reincidência (ex.: "paciente cancelou tarde 3 vezes este mês") — não incluído nesta rodada; os dados ficam registrados por sessão e uma consulta agregada pode ser construída depois, sem mudança de modelo.
- Qualquer bloqueio automático de agendamento futuro para pacientes com histórico de cancelamentos tardios.

## 9. Ordem recomendada de implementação

1. Backend: campos novos + migration + `cancelamento_seria_tardio`.
2. Backend: `cancelar()` — cálculo de tardio, validação de motivo obrigatório/opcional, persistência.
3. Backend: enriquecer a notificação de cancelamento com o motivo, quando houver.
4. App: aviso prévio diferenciado + campo de motivo (obrigatório/opcional por papel) na confirmação de cancelamento.
5. App: seção de exibição do cancelamento tardio/motivo em `DetalhesSessao`.
6. Deploy e validação ponta a ponta (equivalente às issues de deploy já usadas nas SPECs anteriores).
