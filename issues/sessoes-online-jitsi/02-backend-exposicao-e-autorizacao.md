# Issue 02 — Backend: exposição do link, janela de entrada e autorização

**Fase:** 2 — Contrato de API
**Prioridade:** 🔴 Alta
**Arquivos principais:** `psicoapp_backend/sessoes/serializers.py`, `psicoapp_backend/sessoes/views.py`
**Origem:** seções 3.2 e 4 de `SPEC_SESSOES_ONLINE_JITSI.md`

## Problema

Com a issue 01, a sala existe no banco, mas o aplicativo não tem como obtê-la. E expor esse campo sem cuidado criaria um vazamento: quem tiver a URL entra na sala.

## Objetivo

Entregar a URL da sala **exclusivamente** ao paciente e ao psicólogo daquela sessão, junto de um sinal de quando faz sentido exibir o botão de entrada.

## Escopo de implementação

### Verificação prévia obrigatória

Antes de expor qualquer campo, **confirmar** que os ViewSets de `sessoes` já restringem o queryset às sessões do usuário autenticado. Se houver qualquer endpoint que devolva sessão de terceiro, corrigir **antes** de adicionar o campo — caso contrário esta issue transforma uma falha de listagem em vazamento de sala.

### Campos novos nos serializers

Em `SessaoListSerializer` e `SessaoDetailSerializer`, como `SerializerMethodField` **somente leitura**, seguindo o padrão já usado por `valor_formatado`, `pode_realizar`, `pode_cancelar` etc.:

| campo | conteúdo |
|---|---|
| `sala_url` | URL completa, ou `null` quando presencial, sem `sala_uuid`, ou `JITSI_ENABLED` falso |
| `pode_entrar_sala` | booleano — verdadeiro somente dentro da janela |
| `sala_disponivel_em` | ISO-8601 do início da janela, ou `null` |

**`sala_uuid` não é exposto em nenhum serializer.** Apenas a URL derivada.

### Janela de entrada

`pode_entrar_sala` é verdadeiro quando, simultaneamente:

- existe `sala_uuid`;
- `status` ∈ `{agendada, confirmada, remarcada}`;
- agora está entre `data_hora - 15min` e `data_hora + duracao_minutos + 30min`.

A margem posterior de 30 min evita que uma sessão iniciada com atraso perca o acesso. Usar 60 minutos como padrão quando `tipo_sessao.duracao_minutos` estiver ausente (`tipo_sessao` é `null=True`).

> É regra de **conveniência de interface**, não de segurança — quem tem a URL entra a qualquer momento. A mitigação real é a regeneração na remarcação (issue 01).

## Tarefas

- [ ] Verificar e, se necessário, corrigir a restrição de queryset por usuário nos ViewSets de `sessoes`.
- [ ] Adicionar `sala_url`, `pode_entrar_sala` e `sala_disponivel_em` aos dois serializers, somente leitura.
- [ ] Implementar a janela de entrada, com fallback de 60 min quando não houver `duracao_minutos`.
- [ ] Garantir que `sala_uuid` não apareça em nenhuma resposta.
- [ ] Testes de janela: antes, exatamente no início, durante, dentro da margem posterior e depois dela.
- [ ] Teste: participante recebe `sala_url`; não participante não acessa a sessão e nunca recebe o campo.
- [ ] Teste: sessão presencial retorna `sala_url = null` e `pode_entrar_sala = false`.
- [ ] Teste: status `cancelada`, `realizada` ou `faltou` → `pode_entrar_sala = false`.

## Critérios de aceite

- ✅ Participante da sessão recebe `sala_url` correta.
- ✅ Não participante não obtém a sessão nem o campo, em nenhum endpoint.
- ✅ `sala_uuid` não aparece em nenhuma resposta de API.
- ✅ `pode_entrar_sala` respeita os cinco pontos de fronteira testados.
- ✅ Sessão sem `tipo_sessao` usa o fallback de 60 minutos sem erro.
- ✅ Com `JITSI_ENABLED=False`, `sala_url` é `null` para todas as sessões.

## Dependências

- Depende da issue 01.
- É pré-requisito das issues 04, 06 e 07.
