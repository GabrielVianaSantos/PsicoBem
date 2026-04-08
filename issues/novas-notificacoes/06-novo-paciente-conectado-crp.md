# Issue 06 — NOVO: Notificação ao psicólogo quando paciente conecta via CRP

**Fase:** 1 — Fixes críticos  
**Prioridade:** 🔴 Alta  
**Arquivo:** `psicoapp_backend/authentication/views.py`  
**Tipo de notificação:** `sistema`

## Contexto

Quando um paciente usa a tela "Conexão Terapêutica" para se vincular a um psicólogo via CRP, a view `conecta_psicologo_view()` cria ou reativa o `VinculoPacientePsicologo`. Porém, **o psicólogo não recebe nenhuma notificação** informando que um novo paciente se conectou.

## Objetivo

Adicionar a chamada ao `NotificationDomainService.emit()` no final de `conecta_psicologo_view()` após o vínculo ser criado/reativado, notificando o psicólogo.

## Tarefas

- [ ] Localizar `conecta_psicologo_view()` em `authentication/views.py`.
- [ ] Identificar o ponto exato onde o vínculo é salvo (pode haver dois casos: criação nova e reativação). A notificação deve ser disparada em **ambos**.
- [ ] Inserir após a criação/reativação do vínculo:

```python
# authentication/views.py — conecta_psicologo_view(), após criar/reativar vínculo
from core.services import NotificationDomainService

NotificationDomainService.emit(
    target=psicologo.user,
    tipo='sistema',
    titulo='Novo Paciente Conectado 🔗',
    mensagem=f'{paciente.user.first_name} se vinculou a você via CRP.',
    dados_extras=NotificationDomainService._routing_payload(
        screen='VinculosPacientes',
        event='novo_vinculo',
    ),
)
```

- [ ] Confirmar as variáveis locais: como `psicologo` e `paciente` estão nomeados nessa view.
- [ ] Testar caso 1 — vínculo novo: paciente sem vínculo anterior se conecta → psicólogo recebe notificação.
- [ ] Testar caso 2 — reativação: paciente com vínculo inativo se reconecta → psicólogo recebe notificação.
- [ ] Verificar que não é enviada notificação em caso de erro (ex: CRP inválido, vínculo já ativo).

## Critério de aceite

- ✅ Psicólogo recebe notificação no inbox ao ser conectado por um paciente.
- ✅ Push agendado via Celery.
- ✅ `dados_extras` contém `screen: 'VinculosPacientes'` e `event: 'novo_vinculo'`.
- ✅ Notificação disparada tanto em vínculos novos quanto em reativações.
- ✅ Notificação NÃO disparada em caso de falha no processo de conexão.

## Dependências

- Nenhuma — pode ser implementado e testado localmente.
