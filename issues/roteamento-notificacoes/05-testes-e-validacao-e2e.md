# Issue 05 — Testar e validar o roteamento ponta a ponta

**Fase:** 5 — Testes e entrega  
**Prioridade:** 🟡 Média  
**Origem:** [SPEC_ROTEAMENTO_NOTIFICACOES.md](/Users/user/Documents/GitHub/PsicoBem/SPEC_ROTEAMENTO_NOTIFICACOES.md)  
**Arquivos principais:** testes de `core`, `sessoes`, `engajamentos`, `notificacoes_push`, testes do dispatcher/tela de notificações e documentação de validação

## Problema e objetivo

O comportamento atravessa backend, worker, push, navegação e telas condicionadas por perfil. A validação precisa comprovar que o mesmo evento chega ao destino correto em todos os estados do app.

## Escopo de implementação

Criar testes automatizados para o contrato e o dispatcher, além de uma matriz de testes manuais com inbox, dispositivo físico e diferentes estados de execução.

## Tarefas

- [ ] Testar todos os emissores do mapa da SPEC e a estrutura de `dados_extras`.
- [ ] Testar que payload do Expo e resposta da inbox possuem a mesma rota.
- [ ] Testar toque em cards lidos/não lidos e deduplicação de marcação.
- [ ] Testar evento desconhecido, JSON vazio, tela inexistente, ID ausente e payload legado.
- [ ] Testar perfil paciente e psicólogo, incluindo rotas não disponíveis ao perfil.
- [ ] Testar app aberto, background e cold start em dispositivo físico.
- [ ] Verificar manualmente sessões, Odisseia, sementes, prontuários, vínculos, pagamentos e fallbacks.
- [ ] Executar `git diff --check` e a suíte relevante antes da entrega.

## Critérios de aceite

- [ ] Todos os eventos listados na SPEC abrem o destino esperado pela inbox.
- [ ] Os mesmos eventos abrem a mesma tela pelo push nativo.
- [ ] O fallback `Notificacoes` funciona sem crash em payloads inválidos/antigos.
- [ ] Nenhum teste demonstra acesso indevido por ID adulterado.
- [ ] O comportamento é confirmado em app aberto, background e encerrado.

## Dependências

- Depende das Issues 01, 02, 03 e 04.
