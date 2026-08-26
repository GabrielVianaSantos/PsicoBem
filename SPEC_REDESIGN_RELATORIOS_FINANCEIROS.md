# SPEC — Redesign da Tela de Relatórios Financeiros

Data: 2026-08-09  
Status: planejamento  
Escopo: aplicativo Expo (`src/screens/relatorios.js`), somente camada de apresentação

---

## 1. Objetivo

Redesenhar a tela de **Relatórios** do psicólogo para que ela adote a mesma linguagem visual da tela de menu inicial (`src/screens/home.js`), com um resultado mais limpo, hierarquizado e amigável.

O redesenho é **exclusivamente visual e de organização da informação**. Todos os indicadores lógicos hoje existentes são preservados, sem inclusão, remoção ou recálculo de métricas:

- Quantidade de sessões no mês (`total_sessoes`);
- Lucros recebidos (`receita_total`);
- Pagamentos pendentes (`pagamentos_pendentes`);
- Sessões realizadas (`sessoes_realizadas`);
- Sessões canceladas (`sessoes_canceladas`).

O contrato da API `GET /api/sessoes/estatisticas/` permanece inalterado e nenhum arquivo de backend é modificado.

---

## 2. Estado atual identificado

A tela é registrada como aba do `Tab.Navigator` em `src/screens/components/navigation-bar.js` (`Relatorios`, ícone `stats-chart`), ao lado de `Home` e `Sessoes`.

| Tema | Estado atual | Impacto |
|---|---|---|
| Estrutura visual | Duas seções separadas por `borderTopWidth: 1` verde, cada uma com um bloco `#DEF6F0` contendo linhas `label` à esquerda e valor à direita. | Layout denso e tabular, destoa dos cards com elevação e ícone usados na `home.js`. |
| Hierarquia tipográfica | O mesmo estilo `titulo` (23px, `#11B5A4`) é aplicado ao título da tela e aos títulos das duas seções. | Não há distinção entre título da tela e título de seção; tudo compete pela mesma atenção. |
| Destaque das métricas | Os cinco indicadores têm o mesmo peso visual, em linhas de 12px de padding. | Lucros recebidos, que é a informação principal do psicólogo, não se destaca de sessões canceladas. |
| Período exibido | `carregarEstatisticas()` monta `ano`/`mês` a partir de `new Date()`, mas a tela nunca informa qual mês está sendo exibido. | O usuário lê "Relatórios Mensais" sem saber a que mês os números se referem. |
| Estado de carregamento | Retorno antecipado com `ActivityIndicator` centralizado em tela cheia, abaixo do `Topo`. | O conteúdo salta de "tela vazia" para "tela cheia"; a `home.js` mantém a estrutura e usa indicador inline. |
| Estado de erro | Falha exibe apenas `Alert.alert`; `estatisticas` permanece `null` e a tela renderiza zeros. | Após fechar o alerta, o psicólogo vê `R$ 0,00` sem distinguir "mês sem movimento" de "falha de carregamento". |
| Cabeçalho | Usa `<Topo />` em altura cheia (`width / 1.9`). | Consome altura significativa antes do primeiro dado, diferente do ritmo da `home.js`, que preenche o espaço logo abaixo com o bloco de perfil. |

### Observações registradas, sem ação nesta SPEC

- `receita_total` soma apenas sessões `realizada` **e** `pago`, enquanto `pagamentos_pendentes` soma sessões `pendente` de qualquer status ativo, inclusive agendadas futuras (`psicoapp_backend/sessoes/models.py:324-349`). Os rótulos atuais já refletem essa diferença e serão mantidos como estão.
- `formatarMoeda()` depende de `toLocaleString('pt-BR', …)`. A função é preservada sem alteração; a validação em Android consta na seção de testes.

---

## 3. Linguagem visual de referência

Extraída de `src/screens/home.js` e aplicada sem introduzir novos tokens ao projeto.

| Token | Valor | Uso na home |
|---|---|---|
| Primária | `#11B5A4` | `Topo`, ícones, links de ação |
| Título sobre card | `#0B7A6E` | `cardTitle` |
| Fundo de card destacado | `#DEF6F0` | `card` |
| Card secundário | `white` + borda `#f0f0f0` | `sessaoCardMini` |
| Fundo de realce sutil | `#f0f9f8` | `sessaoTime` |
| Título de seção | `#333`, 18px, `RalewayBold` | `sectionTitle` |
| Texto de apoio | `#555`, 14px | `cardSubtitle` |
| Texto neutro fraco | `#777` / `#999` | `tipoTextMini`, `emptyText` |
| Divisor | `#eee`, 1px, margem 25 | `divider` |
| Elevação de card | `elevation: 2`, sombra `0/1`, opacidade `0.1`, raio `2` | `card` |
| Raio de card | 12px (destaque) / 10px (secundário) | `card`, `sessaoCardMini` |
| Respiro horizontal | 20–25px | `cardsContainer`, `sessoesContainer` |

Cores semânticas já em uso na tela atual e **preservadas**: sucesso `#4CAF50`, atenção `#FFA726`, erro `#EF5350`.

Fontes disponíveis: `RalewayRegular` e `RalewayBold` (`src/hooks/useLoadFonts.js`). Nenhuma fonte nova deve ser adicionada.

---

## 4. Estrutura proposta da tela

```
┌─────────────────────────────────────┐
│              < Topo />              │
├─────────────────────────────────────┤
│  Relatórios                         │  título 18px RalewayBold #333
│  Agosto de 2026                     │  subtítulo 14px #666
├─────────────────────────────────────┤  divider #eee
│  Resumo Financeiro                  │  sectionTitle
│ ┌─────────────────────────────────┐ │
│ │ Lucros Recebidos          [img] │ │  card #DEF6F0, valor 28px #4CAF50
│ │ R$ 2.400,00              money  │ │
│ │ Recebido no mês                 │ │
│ └─────────────────────────────────┘ │
│ ┌─────────────────────────────────┐ │
│ │ (!) Pagamentos Pendentes        │ │  card branco, borda #f0f0f0
│ │     R$ 600,00                   │ │  valor 18px #FFA726
│ └─────────────────────────────────┘ │
├─────────────────────────────────────┤
│  Fluxo de Sessões        Ver tudo   │  sectionHeaderCont
│ ┌─────────────────────────────────┐ │
│ │ Sessões no Mês            [img] │ │  card #DEF6F0, valor 28px #0B7A6E
│ │ 12                improvement   │ │
│ └─────────────────────────────────┘ │
│ ┌──────────────┐ ┌──────────────┐   │  grid 2 colunas, flex: 1
│ │ (v) 10       │ │ (x) 2        │   │  cards brancos, borda #f0f0f0
│ │ Realizadas   │ │ Canceladas   │   │  valores #4CAF50 / #EF5350
│ └──────────────┘ └──────────────┘   │
└─────────────────────────────────────┘
```

### 4.1 Cabeçalho da tela

- `<Topo compact />` no lugar do `Topo` em altura cheia, reduzindo o cabeçalho de `width / 1.9` para `width / 3.5`. A prop já existe em `src/screens/components/topo.js` e não exige alteração no componente.
- Abaixo do topo, bloco com título **"Relatórios"** (18px, `RalewayBold`, `#333`) e subtítulo com o mês de referência por extenso e capitalizado, derivado da mesma `dataAtual` já usada em `carregarEstatisticas()`, no formato `"Agosto de 2026"`.
- Divisor `#eee` com margem horizontal de 25px, replicando `styles.divider` da `home.js`.

### 4.2 Seção "Resumo Financeiro"

- Cabeçalho de seção no padrão `sectionHeaderCont` / `sectionTitle`, sem ação à direita.
- **Card de destaque — Lucros Recebidos**: fundo `#DEF6F0`, raio 12, `elevation: 2`, padding 20. Rótulo "Lucros Recebidos" (`cardTitle`, `#0B7A6E`), valor formatado por `formatarMoeda(estatisticas?.receita_total)` em 28px `RalewayBold` `#4CAF50`, linha de apoio "Recebido no mês" (14px, `#555`) e `SectionRelatorioFinanceiro` (`../sections/money.png`) 60×60 à direita, com `resizeMode: 'contain'`.
- **Card secundário — Pagamentos Pendentes**: fundo branco, borda `#f0f0f0`, raio 10. Ícone `Ionicons` `time-outline` 22px `#FFA726` dentro de um contêiner `#f0f9f8` (padrão `sessaoTime`), rótulo "Pagamentos Pendentes" (15px `RalewayBold` `#333`) e valor `formatarMoeda(estatisticas?.pagamentos_pendentes)` em 18px `RalewayBold` `#FFA726`.

### 4.3 Seção "Fluxo de Sessões"

- Cabeçalho de seção no padrão `sectionHeaderCont`, com ação **"Ver tudo"** à direita navegando para a aba `Sessoes`.
  - **Suposição explícita**: `Relatorios` e `Sessoes` são telas irmãs do mesmo `Tab.Navigator`, portanto `navigation.navigate('Sessoes')` é válido a partir desta tela. Se a decisão for manter a tela sem navegação, o link pode ser removido sem qualquer impacto sobre o restante do redesenho.
- **Card de destaque — Sessões no Mês**: mesma anatomia do card financeiro, com `SectionFluxoPacientes` (`../sections/improvement.png`), rótulo "Sessões no Mês", valor `estatisticas?.total_sessoes ?? 0` em 28px `#0B7A6E` e linha de apoio "Total agendado no período".
- **Grid de dois indicadores**: linha com `flexDirection: 'row'` e dois cards `flex: 1` separados por 15px, cada um branco com borda `#f0f0f0` e raio 10, alinhados ao centro:
  - **Realizadas** — `Ionicons` `checkmark-circle` 24px `#4CAF50`, valor 22px `#4CAF50`, rótulo 13px `#777`;
  - **Canceladas** — `Ionicons` `close-circle` 24px `#EF5350`, valor 22px `#EF5350`, rótulo 13px `#777`.
- Em telas estreitas os dois cards permanecem lado a lado; o texto do rótulo não pode truncar em um dígito de valor com até três casas.

### 4.4 Estados da tela

| Estado | Comportamento proposto |
|---|---|
| Carregando (primeira carga) | Manter `Topo`, cabeçalho e divisor renderizados; exibir `ActivityIndicator` `#11B5A4` inline na área de conteúdo com o texto "Calculando estatísticas...", no lugar dos cards. |
| Carregado com dados | Estrutura completa da seção 4. |
| Carregado sem movimento no mês | Renderizar os cards normalmente com `0` e `R$ 0,00`; não usar estado vazio. |
| Falha de carregamento | Preservar o `Alert.alert` atual e, adicionalmente, quando `estatisticas` for `null` após o carregamento, exibir um bloco no padrão `emptySessoes` com `Ionicons` `cloud-offline-outline`, o texto "Não foi possível carregar os relatórios" e a instrução para puxar a tela para baixo e tentar novamente. |
| Atualizando (pull to refresh) | Manter `RefreshControl` já existente, adicionando `tintColor="#11B5A4"` e `colors={["#11B5A4"]}` para alinhar a cor do indicador à identidade do app. |

---

## 5. Alterações previstas por arquivo

### `src/screens/relatorios.js` — único arquivo de aplicação alterado

**Preservar sem modificação:**

- `formatarMoeda()`;
- `carregarEstatisticas()`, incluindo a chamada `sessaoService.getEstatisticas(ano, mes)` com o mês corrente e o `Alert.alert` de falha;
- `useFocusEffect`, `onRefresh` e os estados `estatisticas`, `loading`, `refreshing`;
- os cinco campos lidos do payload e os `fallbacks` para `0`.

**Alterar:**

- Trocar `<Topo />` por `<Topo compact />`.
- Importar `Ionicons` de `@expo/vector-icons` e `useNavigation` de `@react-navigation/native`, ambos já utilizados em outras telas do projeto.
- Derivar o rótulo do mês a partir de `dataAtual`, guardando-o em estado junto com as estatísticas ou recalculando na renderização, sem nova chamada de API.
- Substituir a árvore de `View`s tabular por: bloco de cabeçalho, divisor, e as duas seções descritas na seção 4.
- Reescrever o `StyleSheet`: remover `container`, `containerImage`, `item`, `sectionConteudo`, `rowItem`, `textoLabel`, `textoValor` e o `titulo` de duplo uso; introduzir estilos espelhando `home.js` (`headerBlock`, `screenTitle`, `screenSubtitle`, `divider`, `sectionHeaderCont`, `sectionTitle`, `verTodos`, `highlightCard`, `highlightValue`, `miniCard`, `iconBadge`, `statsRow`, `statCard`, `statValue`, `statLabel`, `errorBox`).
- Substituir o retorno antecipado de carregamento pela renderização condicional interna descrita em 4.4.
- Manter `ScrollView` com `contentContainerStyle` incluindo `paddingBottom` suficiente para não colidir com a `tabBar` do `Tab.Navigator`.

### Arquivos consultados e **não** alterados

- `src/screens/components/topo.js` — a prop `compact` já existe.
- `src/screens/components/navigation-bar.js` — registro da aba permanece igual.
- `src/services/sessaoService.js` — nenhuma alteração no cliente HTTP.
- `psicoapp_backend/sessoes/models.py`, `psicoapp_backend/sessoes/views.py`, serializers e URLs — nenhuma alteração no backend.
- `src/sections/money.png`, `src/sections/improvement.png` — reaproveitados; nenhum novo asset é adicionado.

---

## 6. Autorização e privacidade

- O endpoint `estatisticas` já rejeita com `403` qualquer usuário sem `psicologo_profile` (`psicoapp_backend/sessoes/views.py:286-305`) e agrega apenas sessões do psicólogo autenticado. Essa regra é a fonte de autorização e permanece intocada.
- A tela exibe apenas valores agregados do próprio psicólogo. Nenhum nome de paciente, valor individual de sessão ou dado clínico é introduzido pelo redesenho.
- O redesenho não pode transformar nenhum indicador em atalho que exponha dados de terceiros. O único elemento navegável previsto é "Ver tudo", que leva à aba `Sessoes` já existente e sujeita às suas próprias regras.

---

## 7. Critérios de aceite

### Preservação dos dados

- [ ] Os cinco indicadores continuam visíveis na tela: quantidade de sessões, lucros recebidos, pagamentos pendentes, sessões realizadas e sessões canceladas.
- [ ] Os valores exibidos são idênticos aos da tela anterior para o mesmo psicólogo e mês.
- [ ] Valores monetários continuam formatados por `formatarMoeda()`, com `R$ 0,00` quando ausentes.
- [ ] Contagens ausentes continuam exibindo `0`.
- [ ] Nenhuma chamada adicional à API é introduzida.

### Consistência visual com a home

- [ ] Cards de destaque usam fundo `#DEF6F0`, raio 12, padding 20 e elevação equivalentes aos de `home.js`.
- [ ] Cards secundários usam fundo branco com borda `#f0f0f0` e raio 10.
- [ ] Títulos de seção usam 18px `RalewayBold` `#333`.
- [ ] Não há nenhum token de cor, raio ou fonte fora dos já presentes em `home.js` e nas cores semânticas listadas na seção 3.
- [ ] O cabeçalho usa `<Topo compact />`.

### Hierarquia e legibilidade

- [ ] Lucros recebidos é o elemento de maior peso visual da tela.
- [ ] O mês de referência é exibido por extenso no cabeçalho e corresponde ao período consultado.
- [ ] Os dois cards do grid permanecem lado a lado e legíveis em largura de 360dp.
- [ ] Nenhum rótulo é truncado ou sobreposto com valores de até seis dígitos mais centavos.

### Estados

- [ ] Durante a primeira carga, o cabeçalho permanece visível e o indicador aparece na área de conteúdo.
- [ ] Um mês sem movimento renderiza os cards com zeros, e não um estado de erro.
- [ ] Uma falha de carregamento exibe o bloco de erro com orientação para atualizar.
- [ ] O pull to refresh continua funcionando e recarrega os cinco indicadores.

---

## 8. Testes e validação

### Frontend

- Autenticar como psicólogo com sessões no mês corrente e comparar os cinco valores com os da tela anterior, lado a lado.
- Testar com psicólogo sem nenhuma sessão no mês e confirmar zeros, sem estado de erro.
- Testar com valores altos (acima de `R$ 100.000,00`) e confirmar que o card de destaque não quebra a linha de forma indesejada.
- Simular falha de rede com o backend indisponível e confirmar o alerta e o bloco de erro.
- Validar o pull to refresh e o recarregamento por `useFocusEffect` ao voltar de outra aba.
- Conferir em Android e iOS que `formatarMoeda()` continua produzindo o separador de milhar e a vírgula decimal esperados.
- Verificar que o conteúdo final não fica encoberto pela `tabBar`.
- Se o link "Ver tudo" for mantido, confirmar que navega para a aba `Sessoes` sem empilhar telas indevidamente.

### Backend

- Nenhum teste novo é exigido. Nenhum arquivo de backend é alterado por esta SPEC.

### Regressão

- Confirmar que `home.js` e `sessoes.js` permanecem inalteradas visualmente, já que nenhum estilo compartilhado é editado.
- Executar `git diff --check` antes de concluir.

---

## 9. Fora de escopo

- Seletor de mês, navegação entre períodos ou comparativo com meses anteriores. A tela continua exibindo apenas o mês corrente.
- Gráficos, séries temporais ou qualquer biblioteca de visualização de dados.
- Novos indicadores, como ticket médio, taxa de comparecimento ou receita projetada.
- Alteração das regras de cálculo de `receita_total` e `pagamentos_pendentes` no backend.
- Exportação de relatórios em PDF ou compartilhamento.
- Extração dos estilos para um tema global ou biblioteca de componentes compartilhada.
- Redesenho de qualquer outra tela, inclusive `sessoes.js` e `homePaciente.js`.
- Criação das issues de implementação nesta etapa; elas serão derivadas desta SPEC posteriormente.

---

## 10. Ordem sugerida de implementação

1. Trocar o `Topo` para `compact` e montar o bloco de cabeçalho com título, mês de referência e divisor.
2. Introduzir os estilos espelhados de `home.js` no `StyleSheet`, mantendo temporariamente a árvore antiga funcionando.
3. Construir a seção "Resumo Financeiro" com o card de destaque e o card de pagamentos pendentes.
4. Construir a seção "Fluxo de Sessões" com o card de destaque e o grid de realizadas e canceladas.
5. Substituir os estados de carregamento e erro pela renderização condicional interna.
6. Remover os estilos órfãos da versão anterior.
7. Validar os cinco valores contra a tela anterior e executar a checagem visual em Android e iOS.
