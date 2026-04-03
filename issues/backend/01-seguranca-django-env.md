# Issue: Segurança de Deploy no Django (Backend)

**Objetivo:** Garantir trancas de criptografia e acessos em `psicoapp_backend/settings.py`.

**Tarefas:**
- [ ] Adicionar `python-dotenv` aos modulos do `requirements.txt`.
- [ ] Injetar o hook de import do DOTENV direto no escopo global do `settings.py`.
- [ ] Exilar fisicamente a chave `SECRET_KEY` manual, convertendo a tag de variável para `os.getenv("SECRET_KEY", "fallback")`.
- [ ] Parametrizar a chave sensível de log de erros `DEBUG` usando parser dinâmico `os.getenv("DEBUG", "False")`.
- [ ] Substituir o vetor vago nativo `ALLOWED_HOSTS` de string de ips isolada por injeção de array do O.S. Split(",").
- [ ] Exterminar a flag irresponsável em ambiente online `CORS_ALLOW_ALL_ORIGINS`.
