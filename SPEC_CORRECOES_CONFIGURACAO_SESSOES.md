# SPEC — Correções na Configuração de Sessões

Data: 2026-07-30  
Status: planejamento  
Escopo: tela Expo `Configurar Sessões` e regras de tipos de sessão na API Django

## 1. Objetivo

Corrigir duas inconsistências no cadastro de tipos de sessão:

- tornar legíveis os textos descritivos dos campos no formulário **Cadastrar Novo Tipo**;
- fazer com que a categoria/modalidade do tipo de sessão aceite somente **Presencial** ou **Online**.

## 2. Estado atual e problemas identificados

| Tema | Estado atual | Impacto |
|---|---|---|
| Formulário | `src/screens/tipoSessao.js` usa placeholders nos `TextInput`s de nome, valor e duração, sem labels persistentes. | O texto de descrição desaparece ao digitar e pode ficar invisível/ilegível conforme o tema ou plataforma. |
| Categoria/modalidade no app | `categoriasDisponiveis` oferece `Avulsa`, `Primeira Sessão`, `Urgência`, `Presencial`, `Pacote`, `Online` e `Retorno`. | O campo mistura modalidade com finalidade, etapa ou pacote comercial. |
| Categoria/modalidade na API | `TipoSessao.TIPO_CHOICES` permite os mesmos valores antigos, e o serializer de criação não aplica uma regra mais restritiva. | Uma requisição direta pode continuar criando categorias fora do conceito de modalidade. |
| Dados existentes | Há tipos persistidos com categorias antigas, inclusive valores definidos em migrations e seeds. | A alteração precisa preservar a integridade dos registros e deixar todos os dados legados dentro das duas modalidades válidas. |

## 3. Decisão para dados existentes

Todos os tipos existentes cuja categoria não seja `presencial` serão migrados para `online`, conforme decisão do produto. Os registros já classificados como `presencial` permanecem assim. A migração deve ser explícita, reversível por backup/restauração e coberta por validação antes e depois da execução.

Os nomes dos tipos, valores, durações, descrições, status e sessões já agendadas não devem ser alterados por essa normalização. Sessões vinculadas continuarão apontando para o mesmo tipo de sessão; somente o valor da categoria/modalidade será ajustado.

## 4. Requisitos funcionais

### 4.1 Labels legíveis no cadastro

- Exibir labels persistentes e visíveis para **Nome**, **Valor (R$)**, **Duração (minutos)** e **Modalidade**.
- Manter placeholders como exemplos, quando úteis, mas eles não podem ser a única descrição do campo.
- Usar contraste suficiente com o fundo e tipografia consistente com o design atual (`Raleway`/verde PsicoBem), sem depender apenas da cor.
- Preservar teclado, validações, mensagens de erro, carregamento e fluxo de salvamento atuais.
- O label deve permanecer visível quando o campo estiver preenchido, focado ou com erro.

### 4.2 Modalidades disponíveis

- O seletor da tela deve apresentar exatamente duas opções: **Presencial** (`presencial`) e **Online** (`online`).
- O estado inicial do formulário deve ser uma modalidade válida; recomenda-se `presencial` como padrão para evitar selecionar uma categoria removida silenciosamente.
- A listagem de tipos cadastrados deve continuar exibindo a modalidade retornada pela API, com texto legível (**Presencial**/ **Online**) em vez de depender de códigos em maiúsculas.
- O payload de criação deve enviar somente um dos dois valores permitidos.

### 4.3 Regra de domínio e compatibilidade

- `TipoSessao.TIPO_CHOICES` deve ser reduzido a `presencial` e `online`.
- O serializer de criação/edição deve rejeitar qualquer outro valor, inclusive em requisições diretas à API.
- Deve ser criada uma migração de dados que converta categorias antigas conforme a decisão da seção 3, antes ou junto da migração que restringe as choices.
- Seeds, signals, comandos de exemplo, documentação de endpoints e testes que ainda criem categorias removidas devem ser atualizados para usar apenas as duas modalidades.
- A alteração não deve remover tipos nem sessões existentes.

## 5. Alterações previstas por área (sem implementação nesta etapa)

### Frontend — `src/screens/tipoSessao.js`

- Substituir a lista de categorias por `presencial` e `online`.
- Ajustar o valor inicial de `categoria` para uma modalidade válida.
- Adicionar componentes `<Text>` para labels persistentes antes de cada input e do picker.
- Ajustar estilos locais (`label`, espaçamentos, contraste e estados de erro/foco) mantendo o layout responsivo e a identidade visual.
- Mapear os códigos retornados na listagem para rótulos legíveis.

### Backend — `psicoapp_backend/sessoes/models.py`

- Atualizar `TIPO_CHOICES` e o default do campo para refletir somente as duas modalidades.
- Preservar o campo e seus relacionamentos; não alterar a semântica de `nome`, `valor` ou `duracao_minutos`.

### Backend — `psicoapp_backend/sessoes/serializers.py` e `views.py`

- Garantir validação de modalidade permitida no create/update.
- Manter o isolamento dos tipos por psicólogo e os serializers de resposta existentes.

### Migrações, seeds e testes

- Criar migration de dados para converter valores legados não presenciais para `online`.
- Revisar migrations/fixtures/comandos de exemplo sem editar migrations históricas já aplicadas; a normalização deve ocorrer em uma nova migration.
- Atualizar testes de modelo, serializer, endpoint e tela para os novos valores e para a rejeição de categorias antigas.

## 6. Critérios de aceite

- [ ] Na tela **Configurar Sessões**, os labels de Nome, Valor, Duração e Modalidade são visíveis antes, durante e depois do preenchimento.
- [ ] Labels e valores têm contraste e tamanho suficientes em Android e iOS, sem sobreposição ou corte.
- [ ] O seletor apresenta somente **Presencial** e **Online**.
- [ ] O cadastro envia `presencial` ou `online` e continua salvando nome, valor e duração corretamente.
- [ ] A API rejeita criação/edição com `primeira`, `urgencia`, `avulsa`, `pacote`, `retorno` ou qualquer valor desconhecido.
- [ ] Após a migration, nenhum `TipoSessao` existente possui categoria fora de `presencial`/`online`.
- [ ] Tipos e sessões existentes continuam presentes e associados aos mesmos psicólogos/pacientes.
- [ ] A listagem mostra as modalidades com rótulos legíveis e não quebra quando recebe dados normalizados.
- [ ] Fluxos de agendamento que usam tipos ativos continuam funcionando com os tipos migrados.

## 7. Testes e validação

### Backend

- Testar a validação de `presencial` e `online` no serializer.
- Testar que categorias antigas e valores arbitrários retornam erro de validação.
- Executar a migration em uma cópia do banco com cada categoria legada e verificar o resultado.
- Verificar que contagens, relacionamentos e sessões vinculadas permanecem inalterados.
- Rodar a suíte do app `sessoes` e testes de endpoints de tipos/agendamento.

### Frontend

- Renderizar a tela com campos vazios, preenchidos, focados e com erro.
- Conferir visualmente em Android/iOS e em larguras menores.
- Confirmar que o picker contém exatamente duas opções e que o payload usa os códigos corretos.
- Validar a listagem com tipos presenciais e online.

## 8. Fora de escopo

- Alterar o nome livre do tipo de sessão ou impedir que o psicólogo use nomes como “Primeira sessão” ou “Pacote”; esses conceitos deixam de ser categorias, não necessariamente nomes.
- Alterar preço, duração, status, exclusão ou regras de agendamento.
- Alterar sessões históricas além da categoria armazenada no tipo relacionado.
- Criar issues locais ou remotas nesta etapa.
- Implementar código antes da aprovação desta SPEC.

## 9. Ordem recomendada de implementação

1. Criar e testar a migration de normalização dos dados legados.
2. Restringir choices, serializers, seeds e comandos do backend.
3. Atualizar testes de API e de agendamento.
4. Atualizar o formulário e os estilos de labels no frontend.
5. Atualizar testes/validação visual da tela e confirmar o fluxo completo de cadastro e agendamento.
