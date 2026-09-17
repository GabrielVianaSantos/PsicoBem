# Issue 01 — Backend: link fixo do psicólogo substitui a sala do Jitsi

**Fase:** 1 — Fundação
**Prioridade:** 🔴 Alta
**Arquivos principais:** `psicoapp_backend/authentication/models.py`, `psicoapp_backend/authentication/migrations/`, `psicoapp_backend/sessoes/models.py`, `psicoapp_backend/sessoes/migrations/`, `psicoapp_backend/psicoapp_backend/settings.py`
**Referência:** seções 3, 4.1, 4.3 e 5 de `SPEC_SESSOES_ONLINE_GOOGLE_MEET.md`

## Problema

Hoje `Sessao.sala_url` deriva de `sala_uuid` + `JITSI_BASE_URL` (issue 01 da `SPEC_SESSOES_ONLINE_JITSI.md`), sem uso real em produção. Precisamos que a URL venha do link pessoal do Google Meet de cada psicólogo.

## Objetivo

Trocar a origem de `sala_url` sem alterar nenhuma regra de quando o botão de entrar aparece.

## Escopo de implementação

### Campo novo em `Psicologo`

```python
link_sala_video = models.URLField(
    max_length=300, blank=True, null=True,
    verbose_name='Link da Sala de Vídeo (Google Meet)'
)
```

Nullable a nível de banco — psicólogos já cadastrados não têm esse dado e não há como preenchê-lo retroativamente.

### `Sessao.sala_url`

Passa a ser:

```python
@property
def sala_url(self):
    if not (self.tipo_sessao and self.tipo_sessao.tipo == 'online'):
        return None
    return self.psicologo.link_sala_video or None
```

### O que NÃO muda

- `sala_disponivel_em` e `pode_entrar_na_sala()` continuam com a mesma regra (-15min a +duração+30min, fallback de 60min sem `duracao_minutos`), apenas dependendo do novo `sala_url`.
- `SessaoListSerializer`/`SessaoDetailSerializer` continuam expondo `sala_url`/`pode_entrar_sala`/`sala_disponivel_em` do mesmo jeito.

### Remoção do mecanismo do Jitsi

- Remover `sala_uuid` de `Sessao` (migration `RemoveField`), `_sync_sala_uuid`, `_gerar_sala_uuid_unica`.
- Remover `JITSI_BASE_URL`/`JITSI_ENABLED` de `settings.py`.
- Não há dado real de produção a migrar (confirmado na SPEC, seção 3) — a remoção é direta, sem necessidade de uma etapa de "deprecação suave".

## Tarefas

- [ ] Adicionar `link_sala_video` a `Psicologo` + migration.
- [ ] Reescrever `Sessao.sala_url` para ler do psicólogo.
- [ ] Remover `sala_uuid` e os métodos de geração/regeneração associados + migration de remoção.
- [ ] Remover `JITSI_BASE_URL`/`JITSI_ENABLED` de `settings.py`.
- [ ] Testes: `sala_url` correta para online com link configurado; `None` para presencial; `None` para online sem link; janela de entrada (`pode_entrar_na_sala`) com os mesmos cinco pontos de fronteira já cobertos na SPEC anterior, agora usando o link fixo.
- [ ] `python manage.py makemigrations --check` sem pendência.

## Critérios de aceite

- ✅ Sessão online com `psicologo.link_sala_video` preenchido devolve essa URL em `sala_url`.
- ✅ Sessão online sem link configurado devolve `sala_url = None` (o tratamento de UX disso é da issue 03/04, não desta).
- ✅ Sessão presencial continua com `sala_url = None`.
- ✅ Janela de entrada preserva o comportamento já testado na SPEC do Jitsi.
- ✅ Nenhuma referência a `sala_uuid`/`JITSI_*` sobra no código.
- ✅ Migrations aplicam sem prompt interativo.

## Dependências

- Nenhuma. É a base do backlog; 02, 03, 06 e 07 dependem desta.
