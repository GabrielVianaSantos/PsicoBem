# Issue 03 — Backend: modelos de vínculo, convite e costuras de verificação

**Fase:** 2 — Fundação de dados
**Prioridade:** 🔴 Alta
**Arquivos principais:** `psicoapp_backend/core/models.py`, `psicoapp_backend/authentication/models.py`, migrações dos dois apps
**Origem:** seções 3.1, 3.4, 3.5 e 3.13 de `SPEC_VINCULO_CONVITE_E_SOLICITACAO.md`

## Problema

O modelo atual só conhece vínculos que já nascem ativos. Não há como representar uma solicitação aguardando decisão, nem um convite emitido pelo profissional, nem de onde o vínculo veio.

## Objetivo

Criar toda a estrutura de dados da feature em uma única leva de migrações, para que as issues seguintes só implementem comportamento.

## Escopo de implementação

### `VinculoPacientePsicologo` (`core/models.py`)

- `STATUS_CHOICES` ganha `pendente`, `recusado` e `expirado`.
- Novo campo `origem` — `CharField`, choices `convite_link`, `convite_codigo`, `crp`.
- Novo campo `data_solicitacao` — `DateTimeField(null=True, blank=True)`, base do cálculo de expiração. `data_vinculo` (`auto_now_add`) continua marcando a criação do registro.
- `motivo_vinculo` **permanece** como texto livre; `origem` é que passa a ser a marcação estruturada.
- Migração de dados: registros existentes recebem `origem='crp'` e `data_solicitacao=NULL`.

### Novo model `ConviteVinculo` (`core/models.py`)

| Campo | Tipo |
|---|---|
| `psicologo` | FK `Psicologo`, `CASCADE` |
| `codigo` | `CharField(9)`, único, indexado |
| `criado_em` | `DateTimeField(auto_now_add=True)` |
| `expira_em` | `DateTimeField` — padrão de 7 dias |
| `usado_em` | `DateTimeField(null=True)` |
| `usado_por` | FK `Paciente`, `SET_NULL`, null |
| `revogado` | `BooleanField(default=False)` |
| `apelido` | `CharField`, opcional |

- Property `valido`: `not revogado and usado_em is None and expira_em > timezone.now()`.

### `Psicologo` (`authentication/models.py`)

- `slug` — `SlugField(unique=True, db_index=True)`, gerado de `first_name`+`last_name`, sufixo numérico em colisão (`ana-silva`, `ana-silva-2`).
- `codigo_convite` — `CharField(9, unique=True, db_index=True)`, formato `XXX-XXXX` (ex.: `ANA-4K7Q`), alfabeto **sem** caracteres ambíguos (`0`/`O`, `1`/`I`/`L`).
- `verificado` — `BooleanField(default=False)`; `verificado_em` — `DateTimeField(null=True)`; `verificacao_fonte` — `CharField(null=True)` (`manual`, `cnp`, `provedor`).
- Migração de backfill: gera `slug` e `codigo_convite` para todos os psicólogos existentes. Campos de verificação ficam no default (`False`/`NULL`) — nada é verificado nesta fase.

### Utilitário compartilhado

- Função de geração de código curto (usada por `Psicologo.codigo_convite` e por `ConviteVinculo.codigo`), com o mesmo alfabeto e formato, e normalização de entrada: **case-insensitive** e tolerante à ausência do hífen.

## Tarefas

- [ ] Ampliar `STATUS_CHOICES` e adicionar `origem` e `data_solicitacao`.
- [ ] Criar `ConviteVinculo` com a property `valido`.
- [ ] Adicionar `slug`, `codigo_convite` e os três campos de verificação em `Psicologo`.
- [ ] Escrever o utilitário de geração/normalização de código curto.
- [ ] Migrações de schema + backfill (`origem='crp'`, `slug`, `codigo_convite`).
- [ ] Ajustar a criação de psicólogo (`PsicologoRegistrationView`) para gerar `slug` e `codigo_convite` no cadastro.
- [ ] Teste: colisão de nome gera slugs distintos (`ana-silva`, `ana-silva-2`).
- [ ] Teste: `codigo_convite` é único e não contém caracteres ambíguos.
- [ ] Teste: normalização aceita `ana-4k7q`, `ANA4K7Q` e `ANA-4K7Q` como o mesmo código.
- [ ] Teste: backfill preenche todos os psicólogos pré-existentes.

## Critérios de aceite

- ✅ Todo psicólogo (novo ou pré-existente) tem `slug` e `codigo_convite` únicos.
- ✅ Vínculos existentes seguem válidos, com `origem='crp'`.
- ✅ Nenhum selo de verificação é exposto em nenhum serializer nesta issue.
- ✅ Suíte completa passa localmente.

## Dependências

Depende da issue 01 (os campos novos já nascem `read_only` no serializer) e da issue 02 (o constraint precisa estar aplicado antes de os novos status entrarem em circulação).
