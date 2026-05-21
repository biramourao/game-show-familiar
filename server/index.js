const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const apiRoutes = require('./routes/api');
const { getOrCreateRoom, gameRooms } = require('./gameLogic');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
    credentials: true
  }
});

app.use(cors());
app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json());

app.use('/api', apiRoutes);

app.use(express.static(path.join(__dirname, '..', 'public')));

app.get('/', (req, res) => {
  res.redirect('/tv.html');
});

const DEFAULT_ROOM = 'familia';

io.on('connection', (socket) => {
  let currentRoom = null;
  let clientType = null;

  socket.on('join_game', (data) => {
    const room = data.room || DEFAULT_ROOM;
    currentRoom = room;
    socket.join(room);
    
    if (!clientType) {
      clientType = 'tv';
    }
    
    const gameRoom = getOrCreateRoom(currentRoom);
    gameRoom.connectedClients.add(socket.id);

    socket.emit('game_joined', { room, clientType });

    if (gameRoom.status === 'playing') {
      socket.emit('game_started', {
        theme: gameRoom.theme,
        words_count: gameRoom.words.length,
        teams: gameRoom.scores
      });
      
      const state = gameRoom.getState();
      if (state) {
        socket.emit('sync_state', state);
      }
    }

    io.to(room).emit('client_joined', { socketId: socket.id, clientType });
  });

  socket.on('start_round', (data) => {
    const gameRoom = getOrCreateRoom(currentRoom);
    
    if (gameRoom.status !== 'idle' && gameRoom.status !== 'playing') {
      socket.emit('error', { message: 'Não é possível iniciar uma nova rodada agora' });
      return;
    }

    const result = gameRoom.startRound(data.tema_id, data.word_count || 10);
    
    if (!result.success) {
      socket.emit('error', { message: result.error });
      return;
    }

    io.to(currentRoom).emit('game_started', {
      theme: gameRoom.theme,
      words_count: gameRoom.words.length,
      teams: gameRoom.scores
    });

    const state = gameRoom.getState();
    io.to(currentRoom).emit('sync_state', state);
  });

  socket.on('select_number', (data) => {
    const gameRoom = getOrCreateRoom(currentRoom);
    
    if (gameRoom.status !== 'playing') {
      socket.emit('error', { message: 'Jogo não está em andamento' });
      return;
    }

    const result = gameRoom.selectNumber(data.number);
    
    if (!result.success) {
      socket.emit('error', { message: result.error });
      return;
    }

    io.to(currentRoom).emit('number_selected', {
      number: result.number,
      wordIndex: result.wordIndex + 1,
      word: result.word
    });

    const state = gameRoom.getState();
    io.to(currentRoom).emit('sync_state', state);
  });

  socket.on('reveal_clue', () => {
    const gameRoom = getOrCreateRoom(currentRoom);
    
    if (gameRoom.status !== 'playing') {
      socket.emit('error', { message: 'Jogo não está em andamento' });
      return;
    }

    const result = gameRoom.revealClue();
    
    if (!result.success) {
      socket.emit('error', { message: result.error });
      return;
    }

    io.to(currentRoom).emit('clue_revealed', {
      level: result.level,
      text: result.text
    });

    const state = gameRoom.getState();
    io.to(currentRoom).emit('sync_state', state);
  });

  socket.on('submit_answer', (data) => {
    const gameRoom = getOrCreateRoom(currentRoom);
    
    if (gameRoom.status !== 'playing') {
      socket.emit('error', { message: 'Jogo não está em andamento' });
      return;
    }

    const result = gameRoom.submitAnswer(data.team, data.correct);
    
    if (!result.success) {
      socket.emit('error', { message: result.error });
      return;
    }

    io.to(currentRoom).emit('score_updated', {
      team: result.team,
      points: result.points,
      total: gameRoom.scores[result.team]
    });

    const state = gameRoom.getState();
    io.to(currentRoom).emit('sync_state', state);
  });

  socket.on('reveal_word', () => {
    const gameRoom = getOrCreateRoom(currentRoom);
    
    if (gameRoom.status !== 'playing') {
      socket.emit('error', { message: 'Jogo não está em andamento' });
      return;
    }

    const result = gameRoom.revealWord();
    
    if (!result.success) {
      socket.emit('error', { message: result.error });
      return;
    }

    io.to(currentRoom).emit('word_revealed', {
      word: gameRoom.words[gameRoom.currentWordIndex].palavra_secreta,
      revealed_by: 'presenter'
    });

    const state = gameRoom.getState();
    io.to(currentRoom).emit('sync_state', state);
  });

  socket.on('skip_word', () => {
    const gameRoom = getOrCreateRoom(currentRoom);
    
    if (gameRoom.status !== 'playing') {
      socket.emit('error', { message: 'Jogo não está em andamento' });
      return;
    }

    const result = gameRoom.skipWord();
    
    if (!result.success) {
      socket.emit('error', { message: result.error });
      return;
    }

    io.to(currentRoom).emit('word_revealed', {
      word: gameRoom.words[gameRoom.currentWordIndex].palavra_secreta,
      revealed_by: 'skip'
    });

    const state = gameRoom.getState();
    io.to(currentRoom).emit('sync_state', state);
  });

  socket.on('next_turn', () => {
    const gameRoom = getOrCreateRoom(currentRoom);
    
    if (gameRoom.status !== 'playing') {
      socket.emit('error', { message: 'Jogo não está em andamento' });
      return;
    }

    const result = gameRoom.nextTurn();
    
    if (!result.success) {
      socket.emit('error', { message: result.error });
      return;
    }

    io.to(currentRoom).emit('turn_changed', { activeTeam: result.currentTurn });
  });

  socket.on('next_word', () => {
    const gameRoom = getOrCreateRoom(currentRoom);
    
    if (gameRoom.status !== 'playing') {
      socket.emit('error', { message: 'Jogo não está em andamento' });
      return;
    }

    const result = gameRoom.nextWord();
    
    if (!result.success) {
      socket.emit('error', { message: result.error });
      return;
    }

    if (result.allWordsUsed) {
      io.to(currentRoom).emit('round_ended', {
        winner: result.winner,
        finalScores: gameRoom.scores
      });
      
      gameRoom.status = 'ended';
    } else {
      io.to(currentRoom).emit('number_selected', {
        number: null,
        wordIndex: result.currentWordIndex + 1,
        word: result.word
      });

      const state = gameRoom.getState();
      io.to(currentRoom).emit('sync_state', state);
    }
  });

  socket.on('end_round', () => {
    const gameRoom = getOrCreateRoom(currentRoom);
    
    if (gameRoom.status !== 'playing') {
      socket.emit('error', { message: 'Nenhuma rodada em andamento' });
      return;
    }

    const result = gameRoom.endRound();
    
    io.to(currentRoom).emit('round_ended', {
      winner: result.winner,
      finalScores: result.finalScores,
      totalScoreA: result.totalScoreA,
      totalScoreB: result.totalScoreB
    });

    gameRoom.status = 'idle';
  });

  socket.on('disconnect', () => {
    const gameRoom = getOrCreateRoom(currentRoom);
    
    if (gameRoom.connectedClients) {
      gameRoom.connectedClients.delete(socket.id);
    }

    io.to(currentRoom).emit('client_disconnected', { socketId: socket.id });
  });

  socket.on('leave_game', () => {
    if (currentRoom) {
      socket.leave(currentRoom);
      
      const gameRoom = getOrCreateRoom(currentRoom);
      gameRoom.connectedClients.delete(socket.id);
      
      io.to(currentRoom).emit('client_disconnected', { socketId: socket.id });
    }
    
    currentRoom = null;
  });
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`Servidor ouvindo na porta ${PORT}`);
  console.log(`TV: http://localhost:${PORT}/tv.html`);
  console.log(`Controle: http://localhost:${PORT}/controle.html`);
});

module.exports = { app, server, io };
