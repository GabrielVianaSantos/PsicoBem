# SPEC - Varredura de Inconsistencias Funcionais do PsicoBem

Data: 2026-04-02
Escopo: analise funcional do app mobile + backend local, sem aplicar correcoes nesta etapa.

## Objetivo

Documentar inconsistencias reais entre frontend, backend e contratos de dados que impactam:

- vinculos entre pacientes e psicologos
- carregamento de perfil
- notificacoes
- home do psicologo
- sessoes, prontuarios e telas derivadas

Este documento serve como backlog tecnico para a fase de correcao.

## Resumo Executivo

Ha um padrao recorrente no projeto: varias telas consomem um formato de payload diferente do que os endpoints realmente retornam. Isso gera:

- dados de perfil incompletos ou genericos
- botoes que nao navegam
- listas vazias ou com campos em branco
- formulos que usam IDs errados
- risco de exibir relacionamento paciente/psicologo incoerente

O backend hoje responde corretamente em varios endpoints centrais, mas o frontend em diversos pontos assume campos flattenados ou objetos de outro formato.

## Achados

### 1. Home do psicologo nao carrega o perfil como esperado

Severidade: alta

Sintoma:
- a tela inicial do psicologo pode exibir fallback generico em vez de nome real
- o card superior nao mostra CRP
- o subtitulo mostra e-mail, nao CRP

Evidencia:
- [home.js](/Users/user/Documents/GitHub/PsicoBem/src/screens/home.js) chama `authService.getUserProfile()` e depois verifica `profileRes.success`
- [authService.js](/Users/user/Documents/GitHub/PsicoBem/src/services/authService.js) retorna o objeto bruto da API em `getUserProfile()`, nao `{ success, data }`
- com isso, `profileRes.success` fica `undefined` e `setProfile(profileRes.data)` nunca roda
- o endpoint `/api/auth/profile/` retorna dados basicos do usuario, mas nao retorna `crp` nem `specialization`

Impacto:
- nome pode ficar em fallback
- CRP nunca aparece na home
- a tela usa contrato incorreto com o service

Comportamento esperado:
- a home deve carregar nome real do psicologo
- deve exibir dados coerentes com o tipo de usuario
- se CRP fizer parte da UX, o endpoint ou o state local precisa expor esse campo

### 2. Botao de notificacoes do psicologo e apenas visual

Severidade: alta

Sintoma:
- o sino na home do psicologo nao abre tela nenhuma

Evidencia:
- [home.js](/Users/user/Documents/GitHub/PsicoBem/src/screens/home.js) renderiza `notificationIcon` sem `onPress`
- [routes.js](/Users/user/Documents/GitHub/PsicoBem/src/routes.js) registra `Notificacoes` apenas no fluxo do paciente
- o backend expoe `/api/notificacoes/` para paciente e psicologo
- a API de notificacoes do psicologo responde corretamente

Impacto:
- funcionalidade existente no backend nao esta acessivel para psicologos

Comportamento esperado:
- psicologo deve conseguir abrir a tela de notificacoes
- a mesma tela pode ser reutilizada, desde que a navegacao e o fluxo sejam registrados para o papel `psicologo`

### 3. Perfil do psicologo usa dados incompletos e nao possui contrato real para CRP/especialidade

Severidade: alta

Sintoma:
- CRP pode aparecer como "Nao informado"
- especialidade pode nao refletir o backend
- edicao de especialidade aparenta funcionar, mas nao persiste

Evidencia:
- [perfilPsicologo.js](/Users/user/Documents/GitHub/PsicoBem/src/screens/perfilPsicologo.js) inicializa `crp` e `especialidade` a partir de `user` do `AuthProvider`
- [AuthProvider.js](/Users/user/Documents/GitHub/PsicoBem/src/providers/AuthProvider.js) armazena `response.user` do login, que vem de [UserSerializer](/Users/user/Documents/GitHub/PsicoBem/psicoapp_backend/authentication/serializers.py) sem campos `crp` e `specialization`
- `/api/auth/profile/` retorna somente campos de `CustomUser`, `paciente_id`, `psicologo_id` e `vinculo_ativo`
- o PUT em `/api/auth/profile/update/` retorna `200`, mas ignora `specialization`; o campo nao aparece no serializer nem no retorno

Impacto:
- a tela de perfil do psicologo nao representa o estado real do cadastro profissional
- o usuario pode acreditar que alterou especialidade quando nada foi persistido

Comportamento esperado:
- perfil do psicologo deve carregar `crp`, `specialization` e demais campos profissionais de fonte confiavel
- o update deve persistir esses campos ou bloquear explicitamente sua edicao

### 4. Dois modelos de vinculo coexistem e podem divergir

Severidade: alta

Sintoma:
- risco de paciente "aparecer" para psicologo errado dependendo da fonte consultada

Evidencia:
- [authentication/models.py](/Users/user/Documents/GitHub/PsicoBem/psicoapp_backend/authentication/models.py) ainda possui `Paciente.psicologo`
- [core/models.py](/Users/user/Documents/GitHub/PsicoBem/psicoapp_backend/core/models.py) possui `VinculoPacientePsicologo` como relacionamento principal
- [authentication/views.py](/Users/user/Documents/GitHub/PsicoBem/psicoapp_backend/authentication/views.py) em `conecta_psicologo_view` atualiza ambos
- mudancas de status em [core/views.py](/Users/user/Documents/GitHub/PsicoBem/psicoapp_backend/core/views.py) afetam apenas `VinculoPacientePsicologo`, nao o campo legado `Paciente.psicologo`

Impacto:
- o sistema hoje tem duas fontes de verdade para relacionamento paciente/psicologo
- ainda que varios endpoints consultem `VinculoPacientePsicologo`, o campo legado abre margem para inconsistencias futuras e bugs dificeis de rastrear

Comportamento esperado:
- deve existir uma unica fonte de verdade para vinculo
- o campo legado deve ser removido ou mantido sincronizado de forma garantida

### 5. `getVinculosAtivos()` retorna vinculos, mas algumas telas tratam como se fosse lista de pacientes

Severidade: alta

Sintoma:
- nomes em branco
- IDs errados
- navegacao com objeto errado

Evidencia:
- [vinculoService.js](/Users/user/Documents/GitHub/PsicoBem/src/services/vinculoService.js) consome `/vinculos/ativos/`
- [VinculoPacientePsicologoSerializer](/Users/user/Documents/GitHub/PsicoBem/psicoapp_backend/core/serializers.py) retorna objeto no formato `{ id, paciente: {...}, psicologo: {...}, ... }`
- [agendarSessao.js](/Users/user/Documents/GitHub/PsicoBem/src/screens/agendarSessao.js) espera `paciente.nome_completo` e usa `paciente.id` como se fosse o ID do paciente
- [guiasApoio.js](/Users/user/Documents/GitHub/PsicoBem/src/screens/guiasApoio.js) consome a mesma lista para montar cards de pacientes

Impacto:
- varias telas do psicologo trabalham sobre um payload estruturalmente diferente do esperado

Comportamento esperado:
- ou o service deve normalizar para lista de pacientes
- ou as telas devem consumir explicitamente `vinculo.paciente`

### 6. Agendamento de sessao esta usando rota e dados incorretos

Severidade: critica

Sintoma:
- tipos de sessao ativos podem falhar com `404`
- selecao de paciente usa dados errados
- `paciente_id` enviado ao backend pode ser o `id` do vinculo, nao do paciente

Evidencia:
- [sessaoService.js](/Users/user/Documents/GitHub/PsicoBem/src/services/sessaoService.js) chama `/tipos-sessao/ativos/`
- o backend monta `tipos-sessao` dentro de `/api/sessoes/`, entao a rota correta exposta hoje e `/api/sessoes/tipos-sessao/ativos/`
- validacao local comprovou `404 Not Found` em `/api/tipos-sessao/ativos/`
- [agendarSessao.js](/Users/user/Documents/GitHub/PsicoBem/src/screens/agendarSessao.js) usa `getVinculosAtivos()` e depois:
- renderiza `label={paciente.nome_completo}`
- envia `paciente_id: parseInt(pacienteSelecionado)`
- mas o array carregado e de vinculos, nao de pacientes

Impacto:
- fluxo de agendamento pode quebrar mesmo com backend funcional
- sessao pode ser criada com ID invalido ou o usuario pode nem conseguir selecionar corretamente

Comportamento esperado:
- a tela deve consumir lista real de pacientes vinculados
- o endpoint de tipos ativos deve usar o caminho efetivamente publicado

### 7. Perfil do paciente e prontuarios do psicologo recebem shape incorreto quando abertos a partir de `GuiasApoio`

Severidade: alta

Sintoma:
- perfil do paciente pode mostrar `N/A` em e-mail, CPF e genero
- prontuarios podem ser filtrados pelo ID errado ou nao carregar

Evidencia:
- [guiasApoio.js](/Users/user/Documents/GitHub/PsicoBem/src/screens/guiasApoio.js) navega com `navigation.navigate("PerfilPaciente", { paciente })`
- o `paciente` nessa tela deriva de um vinculo normalizado, nao necessariamente do objeto puro `Paciente`
- [PerfilPaciente/index.js](/Users/user/Documents/GitHub/PsicoBem/src/screens/PerfilPaciente/index.js) espera `paciente.nome_completo`, `paciente.user.email`, `paciente.cpf`, `paciente.gender`
- [prontuarios.js](/Users/user/Documents/GitHub/PsicoBem/src/screens/prontuarios.js) usa `paciente.id` como `paciente_id`

Impacto:
- o psicologo pode abrir a ficha de um paciente com dados parciais ou incorretos
- o filtro de prontuarios pode consultar o ID do vinculo em vez do ID do paciente

Comportamento esperado:
- `PerfilPaciente` e `Prontuarios` devem receber sempre o objeto `Paciente` no mesmo formato

### 8. Home do psicologo e listas de sessoes esperam campos flattenados que o serializer nao entrega

Severidade: media

Sintoma:
- cards de sessao podem mostrar nome vazio ou campo incorreto

Evidencia:
- [home.js](/Users/user/Documents/GitHub/PsicoBem/src/screens/home.js) usa `sessao.paciente_nome` e `sessao.tipo_sessao_nome`
- [minhasSessoes.js](/Users/user/Documents/GitHub/PsicoBem/src/screens/minhasSessoes.js) usa `sessao.tipo_sessao_nome` e `sessao.psicologo_nome`
- [SessaoListSerializer](/Users/user/Documents/GitHub/PsicoBem/psicoapp_backend/sessoes/serializers.py) retorna `paciente`, `psicologo` e `tipo_sessao` aninhados, nao campos flattenados com `_nome`

Impacto:
- varias listas dependem de nomes que nao existem no payload atual

Comportamento esperado:
- frontend e serializer precisam adotar o mesmo shape

### 9. Tela `MeusProntuarios` do paciente espera campos que o backend nao envia

Severidade: media

Sintoma:
- ao expandir um prontuario, o corpo pode ficar quase vazio

Evidencia:
- [meusProntuarios.js](/Users/user/Documents/GitHub/PsicoBem/src/screens/meusProntuarios.js) procura `tipo`, `queixa_principal`, `objetivos_terapeuticos`, `evolucao`, `observacoes`, `conteudo`
- [ProntuarioSerializer](/Users/user/Documents/GitHub/PsicoBem/psicoapp_backend/core/serializers.py) retorna `titulo`, `anotacao`, `psicologo_nome`, `paciente_nome`

Impacto:
- tela do paciente nao representa o prontuario real persistido no backend

Comportamento esperado:
- a tela deve consumir `anotacao`
- ou o backend deve passar a expor o modelo que a tela espera

### 10. Navegacao do fluxo do psicologo mistura stack e tab com contratos diferentes

Severidade: media

Sintoma:
- o app usa ao mesmo tempo rotas do stack (`Home`, `Sessoes`) e rotas do tab (`Home`, `Sessões`, `Relatorios`)
- isso aumenta a chance de navegacao inconsistente

Evidencia:
- [routes.js](/Users/user/Documents/GitHub/PsicoBem/src/routes.js) registra `HomeBarNavigation`, `Home`, `Sessoes`
- [navigation-bar.js](/Users/user/Documents/GitHub/PsicoBem/src/screens/components/navigation-bar.js) cria tabs `Home`, `Sessões`, `Relatórios`
- [home.js](/Users/user/Documents/GitHub/PsicoBem/src/screens/home.js) navega para `Sessões`, enquanto o stack registra `Sessoes`

Impacto:
- mesmo quando um fluxo funciona hoje por estar dentro do tab navigator, a navegacao fica fragil e dependente do contexto onde a tela foi aberta

Comportamento esperado:
- nomes de rota devem ser unificados entre stack e tabs
- o fluxo do psicologo deve ter uma arquitetura de navegacao unica e previsivel

## Itens Especificos Solicitados pelo Usuario

### Vinculo de pacientes/psicologos

Status da analise:
- o endpoint `/api/vinculos/ativos/` filtra corretamente por `psicologo=request.user.psicologo_profile`
- nao reproduzi, no endpoint principal, retorno de pacientes de outro psicologo
- porem existe risco arquitetural real por dupla fonte de verdade: `Paciente.psicologo` + `VinculoPacientePsicologo`
- alem disso, varias telas consomem o payload de vinculo de forma errada, o que pode dar percepcao de relacao incorreta

### Perfil de psicologo/paciente

Status da analise:
- perfil do psicologo esta incompleto no frontend porque o serializer de usuario nao traz dados profissionais
- update de especialidade nao persiste
- perfil do paciente no fluxo do psicologo depende de objeto passado por rota e sofre com shape inconsistente

### Notificacoes do psicologo

Status da analise:
- backend pronto
- frontend sem fluxo funcional para psicologo

### Home do psicologo

Status da analise:
- nome pode nao carregar por contrato incorreto do service
- CRP nao aparece porque a tela nao recebe esse campo do endpoint atual

## Ordem Recomendada de Correcao

1. Padronizar contratos de payload entre services, telas e serializers.
2. Resolver o modelo de vinculo e eliminar fonte dupla de verdade.
3. Corrigir fluxo de perfil do psicologo: leitura e update.
4. Corrigir fluxo de agendamento: rota de tipos ativos + ID correto do paciente.
5. Liberar notificacoes para psicologo.
6. Revisar telas consumidoras de sessoes e prontuarios para alinhar campos.

## Fora do Escopo Desta Etapa

- implementacao das correcoes
- refactor de arquitetura de navegacao
- criacao de testes automatizados

Este documento registra apenas a analise e os ajustes necessarios.
