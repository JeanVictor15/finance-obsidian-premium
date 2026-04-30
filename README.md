# 💎 Finance Obsidian - Premium Dashboard

Sistema de gestão financeira inteligente com estética "Deep Space" e glassmorphism.

## 📁 Estrutura do Projeto

```text
App Financeiro/
├── core/               # Lógica central e estilos globais
│   ├── config.js       # Configurações do Supabase (API Keys)
│   └── theme.css       # Design System (Variáveis e Reset)
├── login/              # Página de Autenticação
│   ├── index.html
│   ├── script.js
│   └── style.css
├── dashboard/          # Dashboard Principal
│   ├── index.html
│   ├── script.js
│   └── style.css
├── assets/             # Recursos estáticos
│   ├── img/            # Imagens e Backgrounds
│   └── icons/          # Ícones personalizados
├── index.html          # Ponto de entrada (Roteador de Auth)
├── WORKFLOW.md         # Protocolo de Git e Deploy
└── .gitignore          # Arquivos ignorados pelo Git
```

## 🚀 Tecnologias
- **HTML5 / Vanilla JS**: Core do sistema.
- **CSS3**: Design System avançado com Glassmorphism.
- **Supabase**: Backend-as-a-Service (Auth & Banco de Dados).
- **Chart.js**: Visualização de dados sofisticada.
- **Lucide Icons**: Pacote de ícones minimalistas.

## 🛠️ Como Contribuir
Siga o protocolo definido no [WORKFLOW.md](./WORKFLOW.md) para garantir que as alterações passem pelas fases de `development`, `testing` e `main`.
