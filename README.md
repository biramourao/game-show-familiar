# 🎮 Game Show Familiar

Jogo interativo estilo "game show" para famílias, com tela principal (TV) e painel do apresentador (controle).

## 📋 Funcionalidades

- **Tela da TV**: Exibe grid de números, pistas progressivas e placar em tempo real
- **Painel do Apresentador**: Controle completo da rodada via celular/tablet
- **Comunicação em tempo real** via WebSocket (Socket.io)
- **Sistema de pontuação**: 10/9/8 pontos conforme número de pistas reveladas
- **Duas equipes** competindo em modo local

## 🚀 Instalação Rápida

```bash
# 1. Instalar dependências
npm install

# 2. Popular banco com dados de exemplo
npm run seed

# 3. Iniciar servidor
npm start
```

## 🌐 Acessando as Telas

- **TV (Tela Principal)**: http://localhost:3000/tv.html
- **Controle (Apresentador)**: http://localhost:3000/controle.html

## 📁 Estrutura do Projeto

```
game-show-familiar/
├── server/
│   ├── index.js              # Servidor Express + Socket.io
│   ├── database.js           # Conexão SQLite e queries
│   ├── gameLogic.js          # Regras e estado do jogo
│   └── routes/
│       └── api.js            # Endpoints REST
├── public/
│   ├── tv.html               # Tela da TV
│   ├── controle.html         # Painel do apresentador
│   ├── css/
│   │   └── styles.css        # Estilos globais
│   └── js/
│       ├── socket.io.js      # Cliente Socket.io (CDN)
│       ├── tv.js             # Lógica da tela TV
│       └── controle.js       # Lógica do painel controle
├── data/
│   └── game.db               # Banco SQLite (gerado)
├── scripts/
│   └── seedDatabase.js       # Script de popular banco
├── package.json
└── README.md
```

## 🎯 Como Jogar

1. **Iniciar**: Abra `controle.html` no celular/tablet e `tv.html` na TV/notebook
2. **Nova Rodada**: No painel controle, clique em "🔄 Nova Rodada"
3. **Selecionar Número**: Escolha um número do grid para revelar a palavra
4. **Revelar Pistas**: Clique nos botões de pista (1→2→3) progressivamente
5. **Registrar Acerto**: Se a equipe acertar, clique em "+10pts" na equipe correspondente
6. **Pular Palavra**: Se ninguém acertar, clique em "❌ Ninguém acertou"
7. **Encerrar**: Ao usar todas as palavras, o vencedor é exibido

## 🔧 Tecnologias

- **Backend**: Node.js + Express + Socket.io + SQLite
- **Frontend**: HTML5 + CSS3 + Vanilla JavaScript
- **Comunicação**: WebSocket em tempo real

## 📝 Scripts Disponíveis

| Comando | Descrição |
|---------|-----------|
| `npm start` | Inicia servidor em produção |
| `npm run dev` | Inicia servidor com nodemon (requer instalação) |
| `npm run seed` | Popula banco com dados de exemplo |
| `npm test` | Executa testes Jest |

## 🔒 Segurança (MVP Local)

- CORS configurado para rede local
- Sanitização básica de inputs
- Validação de todos os eventos WebSocket no servidor

---

**Desenvolvido para diversão em família! 🎉**
