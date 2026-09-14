# Issue 07 — Arquivo `.ics` "Adicionar à minha agenda" (Parte C, opcional)

**Fase:** 7 — Incremento opcional
**Prioridade:** 🟢 Baixa
**Arquivos principais:** `psicoapp_backend/sessoes/views.py`, `psicoapp_backend/sessoes/urls.py`, `src/services/sessaoService.js`, `src/screens/detalhesSessao.js`, `package.json`
**Origem:** seção 3.5 de `SPEC_SESSOES_ONLINE_JITSI.md`

## Problema

A Parte B cobre a agenda do aparelho, mas depende da permissão de calendário e é específica do dispositivo. Alguns usuários preferem adicionar manualmente, ou usam agenda em outro lugar (desktop, Outlook).

## Objetivo

Oferecer um caminho manual e universal de adicionar a sessão a qualquer agenda.

**Esta issue é opcional e pode ser descartada sem prejuízo** das Partes A e B.

## Escopo de implementação

### Backend

Endpoint autenticado `GET /api/sessoes/<id>/agenda.ics`:

- `Content-Type: text/calendar; charset=utf-8`.
- **Restrito aos participantes** da sessão, com a mesma regra da issue 02.
- Conteúdo em RFC 5545, texto puro — **não exige biblioteca externa**.

Estrutura mínima do `VEVENT`:

| campo | observação |
|---|---|
| `UID` | estável, derivado do id da sessão e de um domínio fixo — reimportar deve substituir, não duplicar |
| `DTSTAMP`, `DTSTART`, `DTEND` | **em UTC com sufixo `Z`**, evitando declarar `VTIMEZONE` |
| `SUMMARY` | título neutro, mesma regra da issue 06 |
| `DESCRIPTION` / `LOCATION` | `sala_url` quando houver |
| `VALARM` | `TRIGGER:-PT15M` |
| `SEQUENCE` | incrementado a cada alteração da sessão |

> Fuso horário é o erro clássico deste formato. Emitir tudo em UTC com `Z` elimina a necessidade de `VTIMEZONE` e o risco de deslocamento de horário.

### Aplicativo

Como o endpoint é **autenticado**, não basta abrir a URL no navegador — a requisição precisa levar o token. Fluxo:

1. Baixar com a instância axios já autenticada (`src/services/api.js`).
2. Gravar em cache com `expo-file-system` (**já instalado**).
3. Compartilhar com `expo-sharing` (**a instalar**), usando `mimeType: 'text/calendar'` e `UTI: 'com.apple.ical.ics'`.

Botão "Adicionar à minha agenda" em `detalhesSessao.js`, secundário em relação a "Entrar na sessão".

### Limitação a comunicar na interface

O `.ics` é uma **cópia estática**: se a sessão for remarcada, a cópia na agenda do usuário fica desatualizada. Deixar claro que a Parte B (issue 06) é o mecanismo recomendado, e este é conveniência complementar.

## Tarefas

- [ ] Criar o endpoint `agenda.ics` com restrição a participantes.
- [ ] Gerar o `VEVENT` com `UID` estável, datas em UTC e `VALARM`.
- [ ] Implementar `SEQUENCE` incremental.
- [ ] Instalar `expo-sharing`.
- [ ] Implementar o download autenticado em `sessaoService.js`.
- [ ] Implementar gravação em cache e compartilhamento.
- [ ] Adicionar o botão secundário em `detalhesSessao.js` com o aviso sobre cópia estática.
- [ ] Testes de backend: `.ics` bem formado; `UID` estável entre requisições; `SEQUENCE` incrementa após alteração; não participante recebe 403/404.

## Critérios de aceite

- ✅ O arquivo importa corretamente em Google Calendar, Apple Calendar e Outlook.
- ✅ O horário importado confere com o da sessão (sem deslocamento de fuso).
- ✅ Contém alarme de 15 min e o link quando a sessão for online.
- ✅ Reimportar o mesmo arquivo não duplica o evento.
- ✅ Não participante não consegue baixar o arquivo.
- ✅ O título não identifica participante nem natureza clínica.

## Dependências

- Depende da issue 02.
- Independente das issues 04, 05 e 06. Pode ser descartada.
