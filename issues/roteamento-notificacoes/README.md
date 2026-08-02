# Issues — Roteamento de Notificações

Data de geração: 2026-07-30  
Origem: [SPEC_ROTEAMENTO_NOTIFICACOES.md](/Users/user/Documents/GitHub/PsicoBem/SPEC_ROTEAMENTO_NOTIFICACOES.md)  
Escopo: redirecionamento acionável para push nativo e inbox interna. Nenhuma alteração de código foi aplicada nesta entrega.

## Etapas

| Etapa | Issue | Foco | Prioridade |
|---|---|---|---|
| 1 | `01-contrato-canonico-backend.md` | Definir rota, evento, entidade e parâmetros no backend e no payload push. | 🔴 Alta |
| 2 | `02-corrigir-emissores-e-destinos.md` | Alinhar todos os emissores ao mapa de telas e corrigir rotas/parâmetros inconsistentes. | 🔴 Alta |
| 3 | `03-dispatcher-push-e-inbox.md` | Usar um único dispatcher para toque no push e na lista interna. | 🔴 Alta |
| 4 | `04-adaptar-telas-e-perfis.md` | Garantir que telas de destino aceitem parâmetros e respeitem perfil/autorização. | 🟡 Média |
| 5 | `05-testes-e-validacao-e2e.md` | Cobrir eventos, estados do app, fallbacks e teste físico de push. | 🟡 Média |

## Ordem recomendada

1. [01-contrato-canonico-backend.md](01-contrato-canonico-backend.md)
2. [02-corrigir-emissores-e-destinos.md](02-corrigir-emissores-e-destinos.md)
3. [03-dispatcher-push-e-inbox.md](03-dispatcher-push-e-inbox.md)
4. [04-adaptar-telas-e-perfis.md](04-adaptar-telas-e-perfis.md)
5. [05-testes-e-validacao-e2e.md](05-testes-e-validacao-e2e.md)

## Dependências e regras que não podem regredir

- Push e inbox devem consumir o mesmo contrato e o mesmo resolvedor de rota.
- O evento (`dados_extras.event`) deve ser considerado quando `tipo` for `sistema`.
- Fallback para `Notificacoes` é obrigatório para payload antigo, incompleto, inválido ou sem tela disponível.
- O roteamento não substitui autorização: IDs e vínculos devem ser validados pelas APIs/telas.
- `DetalhesSessao` recebe `sessaoId`; `SementesCuidado` é o nome válido para o fluxo do psicólogo.
- `meta_vencendo` permanece em `Notificacoes` enquanto não existir uma tela de metas.
