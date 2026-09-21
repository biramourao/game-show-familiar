# 🎮 Game Show Familiar

Jogo interativo estilo "game show" para famílias, inspirado no quadro das 3 pistas do Programa Silvio Santos. O apresentador controla tudo pelo **celular** e o público acompanha na **TV** em tempo real.

## 🎯 Como funciona

- **Tela da TV**: exibe o grid de números, as pistas progressivas, a palavra em formato de letreiro e o placar ao vivo
- **Painel do Apresentador**: celular/tablet com controle total da rodada — escolhe o tema, seleciona números, libera pistas, pontua e passa a vez
- **Comunicação em tempo real** via WebSocket (Socket.io) — um clique no celular atualiza a TV na hora
- **Pontuação progressiva**: quanto menos pistas usadas, mais pontos (10 → 9 → 8)
- **Duas equipes** (A e B) competindo em modo local

## 🚀 Instalação

```bash
# 1. Instalar dependências
npm install

# 2. Popular o banco com temas e palavras
npm run seed

# 3. Iniciar o servidor
npm start
```

## 🌐 Acessando as telas

Abra na mesma rede Wi-Fi:

- **TV**: `http://<ip-do-computador>:3000/tv.html`
- **Controle (celular)**: `http://<ip-do-computador>:3000/controle.html`

Para descobrir o IP: `hostname -I` (Linux) ou `ipconfig` (Windows).

## 🕹️ Fluxo do jogo

1. Abra a **TV** e o **controle** — ambos conectam automaticamente na sala `familia`
2. No controle, **escolha um tema** e clique em **"Nova Rodada"**
3. Toque em um **número do grid** no celular (ou na TV) para revelar a palavra secreta daquele slot
4. Libere as **pistas 1 → 2 → 3** progressivamente
5. Quando alguém acertar, toque em **"Equipe A +Xpts"** ou **"Equipe B +Xpts"** — a pontuação aparece no botão conforme as pistas usadas
6. Se ninguém acertar, toque em **"Ninguém acertou"** para revelar a palavra sem pontuar
7. Use **"Passar a vez"** para alternar entre as equipes
8. Toque em **"Próxima palavra"** para avançar, ou **"Encerrar"** para finalizar e ver o vencedor

## 📁 Estrutura

```
game-show-familiar/
├── server/
│   ├── index.js              # Express + Socket.io (eventos WebSocket)
│   ├── gameLogic.js          # GameRoom: regras, estado e pontuação
│   ├── database.js           # SQLite: temas e palavras
│   └── routes/api.js         # REST: /api/health, /api/temas, /api/palavras
├── public/
│   ├── tv.html               # Tela da TV
│   ├── controle.html         # Painel do apresentador
│   ├── css/styles.css        # Identidade visual "palco de auditório"
│   └── js/
│       ├── tv.js             # Cliente WebSocket da TV
│       └── controle.js       # Cliente WebSocket do controle
├── data/game.db              # Banco SQLite (gerado pelo seed)
├── scripts/seedDatabase.js   # Popula 4 temas + 48 palavras
└── package.json
```

## 🎨 Conteúdo

O seed inclui **4 temas** com 12 palavras cada, com pistas progressivas (da mais difícil para a mais óbvia):

| Tema | Exemplos |
|------|----------|
| Animais | Elefante, Capivara, Bicho-preguiça, Polvo |
| Profissões | Médico, Astronauta, Barbeiro, Chef de Cozinha |
| Comidas | Feijoada, Brigadeiro, Coxinha, Pão de Queijo |
| Lugares | Paris, Rio de Janeiro, Machu Picchu, Veneza |

## 🔧 Tecnologias

- **Backend**: Node.js + Express + Socket.io + SQLite (better-sqlite3)
- **Frontend**: HTML5 + CSS3 + Vanilla JS (mobile-first, responsivo para TV)
- **Comunicação**: WebSocket em tempo real com reconexão automática

## 📝 Scripts

| Comando | Descrição |
|---------|-----------|
| `npm start` | Inicia o servidor na porta 3000 |
| `npm run dev` | Inicia com nodemon (requer `npm i -D nodemon`) |
| `npm run seed` | Reseta e popula o banco com os dados de exemplo |

## 🔒 Segurança (MVP local)

- CORS aberto para rede local
- Helmet para headers de segurança
- Validação de todos os eventos WebSocket no servidor
- Estado do jogo em memória (reiniciar o servidor reseta a partida)

---

**Desenvolvido para diversão em família! 🎉**
