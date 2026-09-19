# Issue 02 — Backend: um vínculo ativo por paciente + saneamento dos duplicados

**Fase:** 1 — Segurança (pré-requisito)
**Prioridade:** 🔴 Alta
**Arquivos principais:** `psicoapp_backend/core/models.py`, `psicoapp_backend/core/migrations/`, `psicoapp_backend/authentication/views.py`, `psicoapp_backend/core/tests.py`
**Origem:** seções 2 e 3.2 de `SPEC_VINCULO_CONVITE_E_SOLICITACAO.md`

## Problema

`conecta_psicologo_view` (`authentication/views.py:203`) seta `paciente.psicologo = novo` e cria o vínculo novo, mas **nunca inativa o anterior**. O constraint do modelo é `UniqueConstraint(fields=['paciente','psicologo'], condition=Q(status='ativo'))` — único por **par**, não por paciente. Resultado: toda troca de profissional deixa **dois vínculos ativos**.

O paciente não percebe (`meu-psicologo` usa `.filter(status='ativo').first()` com `ordering = ['-data_vinculo']`, devolvendo o mais recente), mas o **psicólogo anterior continua com o paciente na lista de ativos**, com acesso ao prontuário e capacidade de agendar sessão, sem nunca ter sido avisado. É um defeito de privacidade vigente em produção.

## Objetivo

Garantir no banco que um paciente tenha no máximo um vínculo ativo, e sanear os registros já inconsistentes antes de aplicar o constraint.

## Escopo de implementação

### Modelo (`core/models.py`)

Substituir o constraint atual por:

```python
models.UniqueConstraint(
    fields=['paciente'],
    condition=Q(status='ativo'),
    name='unique_vinculo_ativo_por_paciente',
)
```

### Migração de dados (obrigatória, **antes** do constraint)

- Para cada paciente com mais de um vínculo `ativo`: manter apenas o de `data_vinculo` mais recente; os demais viram `finalizado` com `data_fim_tratamento = date.today()`.
- A migração registra (via `print`/log) quantos vínculos foram corrigidos e para quantos pacientes.
- **Não notificar** os psicólogos afetados e **não apagar prontuários**: é saneamento de estado inconsistente, não encerramento de tratamento (seção 10 da SPEC).
- A migração precisa ser reversível ou, no mínimo, ter o `reverse` documentado como no-op explícito.

## Tarefas

- [ ] Trocar o `UniqueConstraint` no modelo.
- [ ] Escrever a migração de dados de saneamento, ordenada **antes** da migração de schema do constraint.
- [ ] Teste: criar um paciente com dois vínculos ativos (reproduzindo o bug), rodar a migração e confirmar que só o mais recente permanece `ativo`.
- [ ] Teste: tentar criar um segundo vínculo `ativo` para o mesmo paciente levanta `IntegrityError`.
- [ ] Teste: dois pacientes diferentes com vínculos ativos ao mesmo psicólogo continuam válidos (o constraint é por paciente, não por psicólogo).
- [ ] Teste: prontuários dos vínculos finalizados pelo saneamento **continuam existindo**.
- [ ] Rodar a migração em uma cópia do banco de produção antes do deploy, conferindo o número de registros corrigidos.

## Critérios de aceite

- ✅ Após a migração, nenhum paciente na base tem mais de um vínculo `ativo`.
- ✅ O banco impede a criação de um segundo vínculo ativo para o mesmo paciente.
- ✅ Nenhum prontuário é apagado por esta issue.
- ✅ Suíte completa passa localmente e no servidor após deploy.

## Dependências

Independente da issue 01, mas ambas são pré-requisito de tudo o que vem depois. Recomenda-se fazer 01 e 02 juntas, no mesmo deploy.

> **Atenção:** esta issue **não** corrige `conecta_psicologo_view` para encerrar o vínculo anterior — isso acontece na issue 06, quando o CRP deixa de criar vínculo ativo. Até lá, o constraint fará a troca por CRP falhar com `IntegrityError`. Por isso 01+02 e 03–06 devem ir ao ar no **mesmo ciclo**, não em deploys separados com dias de distância.
