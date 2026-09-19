# Issue 05 — Backend: endpoints de convite (geração e resgate)

**Fase:** 3 — Caminho do convite
**Prioridade:** 🔴 Alta
**Arquivos principais:** `psicoapp_backend/core/views.py`, `psicoapp_backend/core/serializers.py`, `psicoapp_backend/core/urls.py`, `psicoapp_backend/core/tests.py`
**Origem:** seções 3.6 e 3.7 de `SPEC_VINCULO_CONVITE_E_SOLICITACAO.md`

## Problema

O convite é o caminho amigável que dá origem a esta feature: o psicólogo manda um link, QR ou código pelo canal que já usa com o paciente (WhatsApp, quase sempre), e o paciente entra sem precisar saber CRP nenhum. Falta toda a camada de API.

## Objetivo

Expor a geração de convites para o psicólogo e o resgate para o paciente, com o vínculo nascendo **ativo** — porque o convite *é* a autorização do profissional.

## Escopo de implementação

### Lado psicólogo (`ConviteViewSet`)

| Rota | Comportamento |
|---|---|
| `GET /api/convites/meu-link/` | Devolve `slug`, `codigo_convite` permanente, a URL completa e o conteúdo do QR. |
| `POST /api/convites/` | Cria convite de uso único (`apelido` opcional). Máximo de **20 convites ativos** simultâneos por psicólogo. |
| `GET /api/convites/` | Lista os convites de uso único com estado derivado (`ativo`, `usado`, `expirado`, `revogado`). |
| `POST /api/convites/{id}/revogar/` | Marca `revogado=True`. |

- Todas exigem `IsAuthenticated` **e** perfil de psicólogo; operam sobre `request.user.psicologo_profile`, nunca recebendo o id do psicólogo por parâmetro.

### Lado paciente

**`GET /api/convites/resolver/?codigo=<x>` ou `?slug=<y>`** — apenas resolve e descreve, **sem criar nada**:

- Devolve nome, CRP, especialidade e biografia do profissional; o tipo de convite (permanente ou uso único); e um bloco `avisos` informando se o paciente já tem vínculo ativo — e, se tiver, quantas sessões futuras e quantos prontuários serão perdidos.
- Nunca devolve e-mail, telefone ou qualquer dado de pacientes.
- Erros: não encontrado, expirado, já usado, revogado.

**`POST /api/convites/aceitar/`** com `codigo` ou `slug`:

- Cria o vínculo **já com `status='ativo'`**, `origem='convite_link'` ou `convite_codigo`, atualiza `paciente.psicologo`, e marca o convite de uso único como usado (`usado_em`, `usado_por`).
- Paciente já com vínculo ativo: exige `confirmar_troca: true`. Sem isso, `409` com o resumo do que será perdido. Com a confirmação, chama `encerrar_vinculo_por_paciente(vinculo_atual, novo_psicologo=...)` da issue 04 **na mesma transação**.
- Convite do psicólogo com quem o paciente **já** tem vínculo ativo: `200` idempotente, sem criar nada.
- Notifica o psicólogo (`emit`): novo paciente conectado, roteando para `VinculosPacientes`.

### Segurança

- **Rate limit no resgate por código**, por usuário autenticado e por IP — o espaço de códigos é pequeno o bastante para varredura por força bruta.
- Código inexistente e código expirado respondem de forma **indistinguível**.

## Tarefas

- [ ] `ConviteViewSet` com as quatro rotas do psicólogo + registro em `core/urls.py`.
- [ ] Endpoints `resolver` e `aceitar` do paciente.
- [ ] Rate limit e respostas indistinguíveis no resgate.
- [ ] Teste: fluxo feliz por código e por slug — vínculo nasce `ativo`, sem etapa de aprovação.
- [ ] Teste: convite de uso único não resgata duas vezes, nem expirado, nem revogado.
- [ ] Teste: `resolver` não cria nada no banco.
- [ ] Teste: paciente com vínculo ativo recebe `409` sem `confirmar_troca`; com a confirmação, a troca executa o encerramento da issue 04 por completo (sessões canceladas, prontuários apagados, psicólogo anterior notificado).
- [ ] Teste: resgatar convite do psicólogo com quem já tem vínculo ativo é idempotente.
- [ ] Teste: psicólogo não consegue criar/listar/revogar convite de outro psicólogo.
- [ ] Teste: limite de 20 convites ativos é respeitado.
- [ ] Teste: paciente não autenticado recebe `401` em `resolver` e `aceitar`.

## Critérios de aceite

- ✅ Vínculo por convite nasce ativo, sem aprovação adicional.
- ✅ A troca via convite passa pelo serviço da issue 04, sem lógica duplicada.
- ✅ `resolver` expõe apenas dados que o profissional já divulga publicamente.
- ✅ Suíte completa passa localmente.

## Dependências

Depende das issues 03 (modelos) e 04 (serviço de encerramento).
