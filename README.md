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
2. No controle, **escolha um tema** e clique em **"Nova Rodada"** (ou gere um tema novo com IA — veja abaixo)
3. Toque em um **número do grid** no celular (ou na TV) para revelar a palavra secreta daquele slot
4. Libere as **pistas 1 → 2 → 3** progressivamente
5. Quando alguém acertar, toque em **"Equipe A +Xpts"** ou **"Equipe B +Xpts"** — a pontuação aparece no botão conforme as pistas usadas
6. Se ninguém acertar, toque em **"Ninguém acertou"** para revelar a palavra sem pontuar
7. Use **"Passar a vez"** para alternar entre as equipes
8. Toque em **"Próxima palavra"** para avançar, ou **"Encerrar"** para finalizar e ver o vencedor

### 🟨 Mostrar/ocultar o tamanho da palavra

No controle, a chave **"Mostrar tamanho da palavra na TV"** liga/desliga os quadradinhos do letreiro que indicam quantas letras a palavra tem antes de ela ser revelada. A mudança é instantânea na TV — quando desligado, a palavra só aparece (como texto corrido) depois de revelada.

### 🤖 Gerar tema com IA (LM Studio / OpenAI)

No controle, abra a seção **"Gerar tema com IA"**:

1. **Conexão**: informe o endereço do serviço (padrão OpenAI), o modelo e a API key se houver.
   - **LM Studio**: abra a aba *Developer*, inicie o *Local Server* e use `http://localhost:1234/v1` com qualquer API key.
   - Também funciona com Ollama (`http://localhost:11434/v1`), OpenAI, Groq etc.
   - Clique em **"Testar conexão"** para validar. A configuração fica salva no navegador.
2. **Tema livre**: escreva o tema (ex.: *Filmes dos anos 90*, *Coisas de praia*) e a quantidade de palavras (5–20).
3. Clique em **"Gerar palavras com IA"** — a IA cria palavras com 3 pistas progressivas.
   - Uma barra de status mostra o tempo decorrido enquanto o modelo trabalha (modelos locais podem levar **vários minutos** — não há tempo limite).
   - Toque em **"✖ Cancelar"** para abortar a geração a qualquer momento.
   - **Salvar no banco** (padrão): o tema aparece no seletor para usar agora e depois.
   - **Sem salvar**: as palavras ficam só em memória — clique em **"Nova Rodada"** para jogar na hora.

Padrões do servidor podem ser definidos via `.env` (`OPENAI_BASE_URL`, `OPENAI_MODEL`, `OPENAI_API_KEY`) — veja `.env.example`.

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
