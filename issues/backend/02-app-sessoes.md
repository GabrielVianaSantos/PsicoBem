# Issue: Quebra de Domínio - App de Sessões (Backend)

**Objetivo:** Extrair classes de Agendamento do caótico Core para um Application isolado.

**Tarefas:**
- [ ] Rodar o init no container remoto `python manage.py startapp sessoes`.
- [ ] Limitar do extenso `core/models.py` os Models de `TipoSessao`, `Sessao` e `SessaoManager`, lançando para a pasta nova.
- [ ] Desaclopar na pasta `sessoes/` também os serializers e def functions de Endpoints equivalentes.
- [ ] Mapear e apontar arquivos URLS independentes `/api/sessoes/` para isolar roteamento limpo da rota global.
