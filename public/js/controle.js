const socket = io();

let gameState = {
  status: 'idle',
  theme: null,
  wordsCount: 0,
  currentWordIndex: 0,
  revealedClues: 0,
  usedNumbers: [],
  scores: { A: 0, B: 0 },
  currentTurn: 'A'
};

function init() {
  socket.emit('join_game', { room: 'familia' });
}

socket.on('game_joined', (data) => {
  console.log('Conectado à sala:', data.room);
  
  document.getElementById('waiting-screen').classList.add('hidden');
  document.getElementById('control-panel').classList.remove('hidden');
});

socket.on('client_joined', (data) => {
  console.log('Cliente conectado:', data.socketId, data.clientType);
});

socket.on('client_disconnected', (data) => {
  console.log('Cliente desconectado:', data.socketId);
});

socket.on('game_started', (data) => {
  gameState.status = 'playing';
  gameState.theme = data.theme;
  gameState.wordsCount = data.words_count;
  
  updateUI();
});

socket.on('sync_state', (state) => {
  gameState = state;
  updateUI();
});

socket.on('number_selected', (data) => {
  console.log('Número selecionado:', data.number);
});

socket.on('clue_revealed', (data) => {
  console.log('Pista revelada:', data.level);
});

socket.on('score_updated', (data) => {
  gameState.scores[data.team] = data.total;
});

socket.on('word_revealed', (data) => {
  const secretWordDisplay = document.getElementById('secret-word-display');
  if (data.revealed_by === 'skip') {
    secretWordDisplay.textContent = `Palavra: ${data.word} (Ninguém pontuou)`;
  } else {
    secretWordDisplay.textContent = `Palavra revelada: ${data.word}`;
  }
  
  const controlDisplay = document.getElementById('secret-word-control-display');
  if (controlDisplay) {
    controlDisplay.textContent = data.word;
  }
});

socket.on('turn_changed', (data) => {
  gameState.currentTurn = data.activeTeam;
});

socket.on('round_ended', (data) => {
  gameState.status = 'ended';
  
  const secretWordDisplay = document.getElementById('secret-word-display');
  if (data.winner) {
    secretWordDisplay.textContent = `🏆 Vencedor: Equipe ${data.winner}`;
  } else {
    secretWordDisplay.textContent = '🤝 Empate!';
  }
});

socket.on('error', (data) => {
  console.error('Erro:', data.message);
  alert(data.message);
});

socket.on('connect', () => {
  const statusEl = document.getElementById('connection-status');
  statusEl.className = 'status-indicator status-connected';
  statusEl.textContent = '🟢 Conectado';
});

socket.on('disconnect', () => {
  const statusEl = document.getElementById('connection-status');
  statusEl.className = 'status-indicator status-disconnected';
  statusEl.textContent = '🔴 Desconectado';
});

document.getElementById('btn-start-round').addEventListener('click', () => {
  socket.emit('start_round', { tema_id: 1, word_count: 10 });
});

document.getElementById('btn-end-round').addEventListener('click', () => {
  socket.emit('end_round');
});

document.getElementById('btn-reveal-word').addEventListener('click', () => {
  socket.emit('reveal_word');
});

document.getElementById('btn-clue-1').addEventListener('click', () => {
  socket.emit('reveal_clue');
});

document.getElementById('btn-clue-2').addEventListener('click', () => {
  socket.emit('reveal_clue');
});

document.getElementById('btn-clue-3').addEventListener('click', () => {
  socket.emit('reveal_clue');
});

document.getElementById('btn-score-a').addEventListener('click', () => {
  socket.emit('submit_answer', { team: 'A', correct: true });
});

document.getElementById('btn-score-b').addEventListener('click', () => {
  socket.emit('submit_answer', { team: 'B', correct: true });
});

document.getElementById('btn-skip').addEventListener('click', () => {
  socket.emit('skip_word');
});

document.getElementById('btn-next-turn').addEventListener('click', () => {
  socket.emit('next_turn');
});

function updateUI() {
  const roundInfo = document.getElementById('round-info');
  if (gameState.theme) {
    roundInfo.textContent = `Tema: ${gameState.theme.nome} | Palavra #${gameState.currentWordIndex + 1}/${gameState.wordsCount}`;
  } else {
    roundInfo.textContent = 'Aguardando início da rodada...';
  }
  
  const secretWordDisplay = document.getElementById('secret-word-display');
  const controlWordDisplay = document.getElementById('secret-word-control-display');
  
  if (gameState.status === 'playing' && gameState.theme) {
    const word = gameState.words ? gameState.words[gameState.currentWordIndex] : null;
    if (word && !word.revealed) {
      secretWordDisplay.textContent = `Palavra secreta: ${word.palavra_secreta} 👁️`;
      controlWordDisplay.textContent = word.palavra_secreta;
    } else {
      secretWordDisplay.textContent = 'Aguardando seleção...';
      controlWordDisplay.textContent = '';
    }
  } else if (gameState.status === 'ended') {
    // Keep winner display from round_ended event
  } else {
    secretWordDisplay.textContent = 'Inicie uma nova rodada para começar!';
    controlWordDisplay.textContent = '';
  }
  
  const turnDisplay = document.getElementById('current-turn-display');
  if (gameState.currentTurn) {
    turnDisplay.textContent = `Vez da Equipe ${gameState.currentTurn}`;
  } else {
    turnDisplay.textContent = 'Aguardando início...';
  }
  
  renderMiniGrid();
}

function renderMiniGrid() {
  const miniGrid = document.getElementById('mini-grid');
  if (!miniGrid) return;
  miniGrid.innerHTML = '';
  
  for (let i = 1; i <= 10; i++) {
    const cell = document.createElement('div');
    cell.className = 'mini-cell';
    cell.textContent = i;
    
    if (gameState.usedNumbers && gameState.usedNumbers.includes(i)) {
      cell.classList.add('mini-cell-used');
    } else {
      cell.classList.add('mini-cell-available');
    }
    
    miniGrid.appendChild(cell);
  }
}

document.addEventListener('DOMContentLoaded', init);
