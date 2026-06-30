# 🤝 Contribuindo

Este projeto utiliza um fluxo de trabalho Git baseado em **merge commits** com histórico **semi-linear**. Isso significa que o histórico é linear, mas permite merges mantendo o histórico dos branches. Para manter a integridade do histórico e evitar conflitos desnecessários, é **obrigatório** que o branch esteja sempre atualizado com `main` antes de fazer merge.

## ✅ Recomendações para Evitar Merges Foxtrot

Merges foxtrot ocorrem quando um merge reintroduz commits já presentes no master. Para evitá-los e manter um histórico limpo:

1. **Execute pull com rebase** se está trabalhando em equipe no mesmo branch:
   ```shell
   git pull --rebase
   ```

2. **Configure o rebase como padrão** para pulls:
   ```shell
   git config [--global] pull.rebase true
   git config [--global] branch.autoSetupRebase always
   ```

3. **Sincronize sempre seu branch** com `origin:master` antes de abrir um Merge Request:
   ```shell
   git fetch --all --prune origin
   git fetch origin master:master
   git rebase master
   ```

4. **Se houver conflitos** durante o rebase, resolva-os e continue:
   ```shell
   git rebase --continue
   ```

✨ Essa prática garante um histórico linear e facilita o rastreamento de mudanças no projeto.

## 🏷️ Versionamento de Powers

Cada Power utiliza versionamento de **1 nível** — um inteiro incremental (`1`, `2`, `3`, ...) que representa mudanças significativas na integração.

### Convenção

- A versão atual fica no campo `version` do front-matter do `POWER.md`
- O histórico de mudanças é registrado no `CHANGELOG.md` dentro do diretório do Power
- Tags Git seguem o formato `<power-name>/v<version>` (ex: `gitlab-trepr/v1`)

### Quando incrementar a versão

Incremente a versão quando houver mudanças que impactam consumidores do Power:

- Adição ou remoção de skills, hooks ou steering files
- Alteração na configuração do MCP server (`mcp.json`)
- Mudança em pré-requisitos (versão do Node.js, certificados, etc.)
- Alteração significativa no comportamento de onboarding

Mudanças apenas na documentação (correções de texto, exemplos) **não** exigem incremento de versão.

### Checklist para nova versão

1. Atualize o campo `version` no front-matter do `POWER.md`
2. Adicione uma nova entrada no `CHANGELOG.md` com a data e as mudanças
3. Crie uma tag Git: `git tag <power-name>/v<version>`
