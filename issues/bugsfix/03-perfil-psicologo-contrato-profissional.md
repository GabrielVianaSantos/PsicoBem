# Issue 03 - Corrigir contrato de perfil profissional do psicologo

**Origem no SPEC:** Achado 3
**Severidade:** alta
**Objetivo:** alinhar leitura e atualizacao do perfil do psicologo com uma fonte confiavel para dados profissionais.

## Problema

O frontend inicializa `crp` e `especialidade` a partir do `user` salvo no login, mas o serializer de usuario nao fornece esses campos. Alem disso, o update do perfil responde `200` mesmo sem persistir `specialization`, o que cria falsa percepcao de sucesso.

## Impacto observado

- CRP aparece como "Nao informado" mesmo quando deveria existir.
- Especialidade pode nao refletir o cadastro real.
- O usuario pode acreditar que editou um campo que nao foi salvo.

## Escopo de implementacao

- Definir a fonte oficial de dados profissionais do psicologo.
- Ajustar leitura do perfil para carregar `crp` e `specialization` de forma consistente.
- Corrigir persistencia dos campos ou bloquear edicao do que nao puder ser salvo.

## Tarefas

- [ ] Revisar serializers e endpoint `/api/auth/profile/`.
- [ ] Revisar contrato do login e do `AuthProvider`.
- [ ] Definir se dados profissionais entram no payload de perfil, de login, ou em endpoint dedicado.
- [ ] Garantir que update reflita exatamente os campos persistidos.
- [ ] Ajustar UX de sucesso/erro da tela de perfil.

## Criterios de aceite

- [ ] `crp` e `specialization` sao carregados de uma fonte real.
- [ ] O update nao simula sucesso para campos que nao sao persistidos.
- [ ] A tela de perfil exibe e salva apenas campos suportados pelo backend.

## Dependencias

- Pode influenciar a Issue 01, caso a home reutilize os mesmos dados profissionais.
