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
