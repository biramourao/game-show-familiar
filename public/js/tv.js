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
  
  document.getElementById('waiting-screen').classList.add('hidden');
  document.getElementById('game-area').classList.remove('hidden');
  document.getElementById('scoreboard').classList.remove('hidden');
  
  renderGrid();
  updateThemeDisplay();
});

socket.on('sync_state', (state) => {
  gameState = state;
  updateUI();
});

socket.on('number_selected', (data) => {
  const word = data.word;
  
  document.getElementById('clues-section').classList.remove('hidden');
  document.getElementById('word-section').classList.remove('hidden');
  
  renderClues(word);
  renderSecretWord(word.palavra_secreta);
});

socket.on('clue_revealed', (data) => {
  const clueEl = document.getElementById(`clue-${data.level}`);
  if (clueEl) {
    clueEl.classList.remove('hidden');
    clueEl.querySelector('.clue-text').textContent = data.text;
  }
});

socket.on('score_updated', (data) => {
  gameState.scores[data.team] = data.total;
  
  document.getElementById(`score-${data.team.toLowerCase()}`).textContent = data.total;
});

socket.on('word_revealed', (data) => {
  renderSecretWord(data.word);
});

socket.on('turn_changed', (data) => {
  gameState.currentTurn = data.activeTeam;
  
  const turnDisplay = document.getElementById('turn-display');
  if (data.activeTeam === 'A') {
    turnDisplay.textContent = '🟢 Vez da Equipe A';
  } else {
    turnDisplay.textContent = '🔵 Vez da Equipe B';
  }
});

socket.on('round_ended', (data) => {
  gameState.status = 'ended';
  
  document.getElementById('game-area').classList.add('hidden');
  document.getElementById('end-screen').classList.remove('hidden');
  
  const winnerDisplay = document.getElementById('winner-display');
  if (data.winner) {
    winnerDisplay.textContent = `🏆 Vencedor: Equipe ${data.winner}`;
  } else {
    winnerDisplay.textContent = '🤝 Empate!';
  }
  
  const finalScores = document.getElementById('final-scores');
  finalScores.innerHTML = `
    <div class="final-score-row">
      <span>Equipe A:</span>
      <strong>${data.finalScores.A}</strong>
    </div>
    <div class="final-score-row">
      <span>Equipe B:</span>
      <strong>${data.finalScores.B}</strong>
    </div>
  `;
});

socket.on('error', (data) => {
  console.error('Erro:', data.message);
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

function renderGrid() {
  const grid = document.getElementById('number-grid');
  grid.innerHTML = '';
  
  for (let i = 1; i <= 10; i++) {
    const cell = document.createElement('div');
    cell.className = 'grid-cell';
    cell.id = `cell-${i}`;
    cell.textContent = i;
    
    if (gameState.usedNumbers.includes(i)) {
      cell.classList.add('grid-cell-used');
    } else {
      cell.classList.add('grid-cell-active');
      cell.style.cursor = 'pointer';
      cell.addEventListener('click', () => {
        socket.emit('select_number', { number: i });
      });
    }
    
    grid.appendChild(cell);
  }
}

function updateThemeDisplay() {
  const themeDisplay = document.getElementById('theme-display');
  if (gameState.theme) {
    themeDisplay.textContent = `Tema: ${gameState.theme.nome}`;
  }
}

function renderClues(word) {
  gameState.revealedClues = 0;
  
  const clue1 = document.getElementById('clue-1');
  const clue2 = document.getElementById('clue-2');
  const clue3 = document.getElementById('clue-3');
  
  clue1.querySelector('.clue-text').textContent = 'Aguardando...';
  clue2.querySelector('.clue-text').textContent = 'Bloqueada';
  clue3.querySelector('.clue-text').textContent = 'Bloqueada';
  
  clue2.classList.add('hidden');
  clue3.classList.add('hidden');
}

function renderSecretWord(word) {
  const wordSection = document.getElementById('secret-word');
  const blanks = word.length;
  let display = '';
  
  for (let i = 0; i < blanks; i++) {
    display += '_ ';
  }
  
  wordSection.textContent = display;
}

function updateUI() {
  if (!gameState.theme) return;
  
  document.getElementById('score-a').textContent = gameState.scores.A;
  document.getElementById('score-b').textContent = gameState.scores.B;
  
  const turnDisplay = document.getElementById('turn-display');
  if (gameState.currentTurn === 'A') {
    turnDisplay.textContent = '🟢 Vez da Equipe A';
  } else {
    turnDisplay.textContent = '🔵 Vez da Equipe B';
  }
  
  const grid = document.getElementById('number-grid');
  grid.innerHTML = '';
  
  for (let i = 1; i <= 10; i++) {
    const cell = document.createElement('div');
    cell.className = 'grid-cell';
    cell.id = `cell-${i}`;
    cell.textContent = i;
    
    if (gameState.usedNumbers.includes(i)) {
      cell.classList.add('grid-cell-used');
    } else {
      cell.classList.add('grid-cell-active');
      cell.style.cursor = 'pointer';
      cell.addEventListener('click', () => {
        socket.emit('select_number', { number: i });
      });
    }
    
    grid.appendChild(cell);
  }
}

document.addEventListener('DOMContentLoaded', init);
