# Issue: Quebra de Domínio - App de Sementes e Odisseias (Backend)

**Objetivo:** Extrair tabelas e interações focáveis no engajamento e paciente direto com a clínica.

**Tarefas:**
- [ ] Instanciar nativamente com o script manage o container Django `python manage.py startapp engajamentos`.
- [ ] Mover as Classes e Entidades persistidas de `SementeCuidado`, `MensagemPaciente` e `CategoriaOdisseia` da dependência suja do core original para a Application Engajamentos.
- [ ] Encapsular endpoints de Serializadores correspondentes.
- [ ] Aplicar rodada massiva de import checker para garantir que intersecções no backend não travem falha linear na View de requisições de outras pastas.
