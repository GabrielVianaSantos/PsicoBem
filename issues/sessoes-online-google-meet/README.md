# Issues — Sessões Online via Link Fixo do Google Meet

Data de geração: 2026-09-17
Origem: `SPEC_SESSOES_ONLINE_GOOGLE_MEET.md`
Escopo: substitui a sala dinâmica do Jitsi (`SPEC_SESSOES_ONLINE_JITSI.md`, issues 01–02) por um link pessoal e fixo do Google Meet, configurado uma vez por psicólogo. Mantém intactos janela de entrada, botão "Entrar na sessão", lembretes, agenda do dispositivo e `.ics`. Nenhuma alteração foi aplicada nesta entrega.

## Estrutura

| Etapa | Issue | Foco | Prioridade |
|---|---|---|---|
| 1 | `01-backend-sala-url-link-fixo.md` | `Psicologo.link_sala_video`, `sala_url` passa a ler do psicólogo, remoção do Jitsi. | 🔴 Alta |
| 2 | `02-backend-cadastro-exige-link.md` | Cadastro nativo e Google passam a exigir o link para novos psicólogos. | 🔴 Alta |
| 3 | `03-backend-fallback-e-edicao-perfil.md` | `sala_pendente_configuracao`, `psicologo_contato_alternativo`, edição do link via perfil. | 🔴 Alta |
| 4 | `04-app-cadastro-e-perfil.md` | Campo de link nas telas de cadastro (nativo e Google) e no perfil do psicólogo. | 🔴 Alta |
| 5 | `05-app-card-minha-sala-virtual.md` | Card "Minha Sala Virtual" no menu do psicólogo. | 🟡 Média |
| 6 | `06-app-sala-de-espera.md` | Tela dedicada com respiração guiada, substitui o `Linking.openURL` direto. | 🔴 Alta |
| 7 | `07-backend-app-lembrete-entrar-primeiro.md` | Nova tarefa periódica: psicólogo recebe aviso para entrar primeiro. | 🟡 Média |
| 8 | `08-deploy-e-validacao-e2e.md` | Deploy, migração de remoção do Jitsi e validação ponta a ponta no dispositivo. | 🟡 Média |

## Ordem recomendada

1. [01-backend-sala-url-link-fixo.md](01-backend-sala-url-link-fixo.md)
2. [02-backend-cadastro-exige-link.md](02-backend-cadastro-exige-link.md)
3. [03-backend-fallback-e-edicao-perfil.md](03-backend-fallback-e-edicao-perfil.md)
4. [04-app-cadastro-e-perfil.md](04-app-cadastro-e-perfil.md)
5. [05-app-card-minha-sala-virtual.md](05-app-card-minha-sala-virtual.md)
6. [06-app-sala-de-espera.md](06-app-sala-de-espera.md)
7. [07-backend-app-lembrete-entrar-primeiro.md](07-backend-app-lembrete-entrar-primeiro.md)
8. [08-deploy-e-validacao-e2e.md](08-deploy-e-validacao-e2e.md)

## Dependências

- A issue 01 é a base: 02, 03, 06 e 07 dependem dela.
- A issue 02 depende de 01 (precisa do campo `link_sala_video` existir).
- A issue 03 depende de 01; é pré-requisito de 04 e 05.
- A issue 04 depende de 02 (regra de obrigatoriedade) e 03 (endpoint de edição).
- A issue 05 depende de 03 e 04 (tela de perfil já com o campo).
- A issue 06 depende de 01 e 03 (usa `sala_url` e `sala_pendente_configuracao`); é independente de 04 e 05.
- A issue 07 depende só de 01; pode ser feita em paralelo com 04, 05 e 06.
- A issue 08 é a última.

## Regras que não podem regredir

- A janela de entrada (`pode_entrar_sala`, `sala_disponivel_em`, os cinco pontos de fronteira já testados) continua com a mesma regra — só a origem de `sala_url` muda.
- **Nenhuma URL de sala trafega em notificação push** — nem no corpo nem no `data`. Continua valendo para o novo lembrete da issue 07.
- `sala_url`/`psicologo_contato_alternativo` só são retornados aos participantes da própria sessão.
- `psicologo_contato_alternativo` só aparece quando `sala_pendente_configuracao` é verdadeiro e o requisitante é o paciente — nunca em listagens gerais.
- Sessões `presencial` não ganham nada relacionado a sala, contato alternativo ou lembrete de "entrar primeiro".
- Os lembretes de 24h, 2h e 15min, a confirmação pós-sessão, a agenda do dispositivo e o `.ics` continuam funcionando sem alteração de regra — só passam a receber uma URL de origem diferente.
- A tela de espera usa exclusivamente a paleta e a tipografia já existentes no app — nenhuma identidade visual nova.
- Psicólogos cadastrados antes desta feature nunca ficam "travados": o fallback da issue 03/04 sempre oferece um caminho (contato alternativo para o paciente, convite a configurar para o psicólogo).
