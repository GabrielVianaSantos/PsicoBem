# Issue: Desacoplar Componentes UI e Limpeza (Frontend)

**Objetivo:** Remover sucatas, arquivos que causam interrupção fatal, e consolidar os tokens visuais.

**Tarefas:**
- [ ] Excluir fisicamente o arquivo vazio e corrompido de recursividade `/telas/components/botao-dinamico.js`.
- [ ] Consolidar todos os botões visuais repetidos (ex: `botao.js`) dentro do diretório unificado `/src/components/common/`.
- [ ] Consolidar as múltiplas variações de Input Fields (`cardCustom.js`, `cardCustomInputText.js`, `textinputcustom.js`) em componentes reutilizáveis limpos.
- [ ] Atualizar as ramificações de imports destes componentes nas telas que os consomem.
