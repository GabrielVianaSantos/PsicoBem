# Issue 04 — Adaptar telas de destino e perfis

**Fase:** 4 — Compatibilidade de interface  
**Prioridade:** 🟡 Média  
**Origem:** [SPEC_ROTEAMENTO_NOTIFICACOES.md](/Users/user/Documents/GitHub/PsicoBem/SPEC_ROTEAMENTO_NOTIFICACOES.md)  
**Arquivos principais:** `src/routes.js`, `src/screens/detalhesSessao.js`, `registroCompleto.js`, `RegistrosOdisseia.js`, `sementesPaciente.js`, `sementesCuidado.js`, `meusProntuarios.js`, `vinculosPacientes.js`, `meuPsicologo.js`

## Problema e objetivo

As telas ainda não têm comportamento uniforme para os parâmetros recebidos. Algumas rotas são compartilhadas por perfil e `RegistroCompleto` precisa carregar a entidade indicada para que o redirecionamento seja realmente útil.

## Escopo de implementação

Fazer cada destino aceitar seus parâmetros canônicos, carregar ou destacar a entidade quando suportado, tratar IDs inválidos e manter autorização da API. Confirmar a disponibilidade das rotas nos navigators corretos.

## Tarefas

- [ ] Garantir que `DetalhesSessao` leia `sessaoId`.
- [ ] Adaptar `RegistroCompleto` para receber `registroId` e tratar carregamento/erro.
- [ ] Adaptar telas de sementes para aceitar `sementeId` sem quebrar a listagem.
- [ ] Adaptar `MeusProntuarios` e `VinculosPacientes` para destacar/localizar IDs quando disponíveis.
- [ ] Preservar `modo: 'novo'` apenas para o paciente em `RegistrosOdisseia`.
- [ ] Confirmar que `SementesCuidado`, `SementesPaciente`, `MeuPsicologo` e demais destinos existem no perfil correto.
- [ ] Exibir fallback amigável quando a entidade foi removida, não pertence ao usuário ou não pode ser carregada.

## Critérios de aceite

- [ ] Cada tela abre com seus parâmetros canônicos sem crash.
- [ ] IDs inválidos ou sem autorização não expõem dados de outro usuário.
- [ ] O perfil psicólogo não recebe fluxo de criação de registro do paciente.
- [ ] O perfil paciente não é enviado a uma rota exclusiva do psicólogo.
- [ ] A ausência temporária de uma entidade não deixa a tela em loading infinito.

## Dependências

- Depende da Issue 03.
