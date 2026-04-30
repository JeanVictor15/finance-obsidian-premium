# 🛰️ Protocolo de Desenvolvimento - Finance Obsidian

Este documento define o ciclo de vida do software para garantir estabilidade e segurança.

---

## 🌳 Estrutura de Branches

| Branch | Propósito | Regras de Merge |
| :--- | :--- | :--- |
| `development` | Criação de novas funcionalidades. | Pushes constantes durante o dev. |
| `testing` | Ambiente de homologação e testes de UI. | Merge vindo de `development` após conclusão. |
| `main` | Produção / Versão estável. | Merge vindo de `testing` após Checklist e Aprovação. |

---

## 📂 Organização de Pastas

Para manter o projeto escalável, utilizamos a seguinte estrutura:
- **/core**: Arquivos globais (configurações, temas) que afetam todo o sistema.
- **/pages**: (Arquitetura conceitual) Cada funcionalidade principal tem sua própria pasta (`login`, `dashboard`).
- **/assets**: Imagens, ícones e arquivos estáticos.
- **Root**: O arquivo `index.html` na raiz serve apenas como roteador inteligente.

---

## 🔄 Fluxo de Trabalho (Step-by-Step)

### 1. Fase de Desenvolvimento (`development`)
- Ativar branch: `git checkout development`
- Implementar funcionalidades.
- Realizar commits e pushes para manter o progresso salvo no GitHub.

### 2. Fase de Teste (`testing`)
- Quando a funcionalidade estiver pronta: Merge de `development` para `testing`.
- Verificar se tudo funciona como esperado em diferentes telas.
- Validar se não houve "quebra" em funcionalidades antigas.

### 3. Fase de Produção (`main`) - **CRITICAL**
Antes de mover para a `main`, realize o seguinte **Checklist de Produção**:

#### ✅ Checklist de Pré-Merge
1. **Security Check:** Verificar se não há chaves de API do Supabase ou segredos fixos no código (usar `config.js` ou variáveis de ambiente).
2. **Error Scan:** Rodar o console do navegador e garantir que não há erros de JavaScript.
3. **UI Polish:** Verificar sobreposições, fontes e cores (legibilidade).
4. **Performance:** Garantir que o Dashboard carrega as transações rapidamente.
5. **Final Approval:** O usuário (Jean Victor) dá o OK final.

---

## 🛠️ Comandos Rápidos

**Para enviar nova função:**
```bash
git checkout development
# ... faz o código ...
git add .
git commit -m "feat: descrição da função"
git push origin development
```

**Para subir para teste:**
```bash
git checkout testing
git merge development
git push origin testing
```

**Para subir para produção (MAIN):**
```bash
git checkout main
git merge testing
git push origin main
```
