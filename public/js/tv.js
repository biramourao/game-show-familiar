const socket = io();

const MAX_NUMBERS = 10;

let gameState = {
  status: 'idle',
  theme: null,
  wordsCount: 0,
  currentWordIndex: 0,
  revealedClues: 0,
  usedNumbers: [],
  scores: { A: 0, B: 0 },
  currentTurn: 'A',
  currentWord: null,
  words: [],
  showWordLength: true
};

function init() {
  socket.emit('join_game', { room: 'familia' });
}

socket.on('game_joined', () => {
  // Estado sincronizado via sync_state se o jogo já estiver rolando
});

socket.on('game_started', () => {
  hide('end-screen');
  renderAll();
});

socket.on('sync_state', (state) => {
  if (!state) return;
  gameState = state;
  renderAll();
});

socket.on('settings_updated', (data) => {
  gameState.showWordLength = !!data.showWordLength;
  // Se houver palavra em aberto na tela, redesenha o letreiro já
  if (gameState.status === 'playing') {
    renderWord();
  }
});

socket.on('clue_revealed', (data) => {
  // Estado já aplicado pelo sync_state anterior; aqui só garante a animação
  const clueEl = document.getElementById(`clue-${data.level}`);
  if (clueEl) {
    clueEl.classList.remove('locked');
    clueEl.querySelector('.clue-text').textContent = data.text;
  }
});

socket.on('number_selected', (data) => {
  // Se trocou de número, garante que as pistas voltam a aparecer bloqueadas
  if (data.previousNumber) {
    resetClues();
  }
});

socket.on('score_updated', (data) => {
  popScore(data.team);
  if (data.word) {
    renderSecretWordTiles(data.word, false);
    animateWordReveal(data.word);
  }
});

socket.on('word_revealed', (data) => {
  renderSecretWordTiles(data.word, false);
  animateWordReveal(data.word);
});

socket.on('turn_changed', (data) => {
  gameState.currentTurn = data.activeTeam;
  updateScoreboard();
});

socket.on('round_ended', (data) => {
  gameState.status = 'ended';
  hide('game-area');
  show('end-screen');

  const winnerDisplay = document.getElementById('winner-display');
  if (data.winner) {
    winnerDisplay.textContent = `🏆 Equipe ${data.winner} venceu!`;
  } else {
    winnerDisplay.textContent = '🤝 Empate!';
  }

  const finalScores = document.getElementById('final-scores');
  finalScores.innerHTML = `
    <div class="final-score-row">
      <span>Equipe A</span>
      <strong>${data.finalScores.A}</strong>
    </div>
    <div class="final-score-row">
      <span>Equipe B</span>
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
  statusEl.textContent = 'Conectado';
});

socket.on('disconnect', () => {
  const statusEl = document.getElementById('connection-status');
  statusEl.className = 'status-indicator status-disconnected';
  statusEl.textContent = 'Desconectado';
});

/* ---------- Renderização ---------- */

function show(id) {
  document.getElementById(id).classList.remove('hidden');
}

function hide(id) {
  document.getElementById(id).classList.add('hidden');
}

// Palavra aberta = número escolhido, ainda não pontuada/pulada
function isWordOpen() {
  const w = gameState.words && gameState.words[gameState.currentWordIndex];
  return !!gameState.currentWord && !!w && w.used && !w.revealed;
}

// Palavra concluída = usada e revelada (acertada, pulada ou mostrada)
function isWordDone() {
  const w = gameState.words && gameState.words[gameState.currentWordIndex];
  return !!gameState.currentWord && !!w && w.used && w.revealed;
}

function lastUsedNumber() {
  if (!gameState.usedNumbers || gameState.usedNumbers.length === 0) return null;
  return gameState.usedNumbers[gameState.usedNumbers.length - 1];
}

function renderAll() {
  if (gameState.status !== 'playing') return;

  show('scoreboard');
  show('game-area');
  hide('waiting-screen');
  hide('end-screen');

  updateThemeDisplay();
  renderGrid();
  updateScoreboard();
  renderClues();
  renderWord();
  updatePointsStake();
}

function updateThemeDisplay() {
  const themeDisplay = document.getElementById('theme-display');
  themeDisplay.textContent = gameState.theme ? `Tema: ${gameState.theme.nome}` : '';
}

function renderGrid() {
  const grid = document.getElementById('number-grid');
  grid.innerHTML = '';

  const current = lastUsedNumber();
  const hasOpenWord = isWordOpen();

  for (let i = 1; i <= MAX_NUMBERS; i++) {
    const cell = document.createElement('div');
    cell.className = 'grid-cell';
    cell.id = `cell-${i}`;
    cell.textContent = i;

    if (hasOpenWord && i === current) {
      cell.classList.add('grid-cell-selected');
    } else if (gameState.usedNumbers && gameState.usedNumbers.includes(i)) {
      cell.classList.add('grid-cell-used');
    } else {
      cell.classList.add('grid-cell-active');
    }

    grid.appendChild(cell);
  }
}

function updateScoreboard() {
  document.getElementById('score-a').textContent = gameState.scores.A;
  document.getElementById('score-b').textContent = gameState.scores.B;

  const turnDisplay = document.getElementById('turn-display');
  turnDisplay.textContent = `Vez da Equipe ${gameState.currentTurn}`;

  document.getElementById('team-a-card').classList.toggle('team-active', gameState.currentTurn === 'A');
  document.getElementById('team-b-card').classList.toggle('team-active', gameState.currentTurn === 'B');
}

function popScore(team) {
  const scoreEl = document.getElementById(`score-${team.toLowerCase()}`);
  scoreEl.classList.remove('score-pop');
  void scoreEl.offsetWidth;
  scoreEl.classList.add('score-pop');
}

function updatePointsStake() {
  const stake = document.getElementById('points-stake');
  const revealed = gameState.revealedClues || 0;

  if (!isWordOpen() || revealed === 0) {
    stake.classList.add('hidden');
    return;
  }

  stake.classList.remove('hidden');
  document.getElementById('stake-value').textContent = 11 - revealed;
}

function renderClues() {
  const word = gameState.currentWord;

  if (!word) {
    hide('clues-section');
    return;
  }

  show('clues-section');
  const revealedCount = gameState.revealedClues || 0;

  for (let i = 1; i <= 3; i++) {
    const clue = document.getElementById(`clue-${i}`);
    if (i <= revealedCount) {
      clue.classList.remove('locked');
      clue.querySelector('.clue-text').textContent = word[`pista_${i}`];
    } else {
      clue.classList.add('locked');
      clue.querySelector('.clue-text').textContent = 'Bloqueada';
    }
  }
}

function renderWord() {
  const word = gameState.currentWord;

  if (!word) {
    hide('word-section');
    return;
  }

  // Se os quadradinhos estiverem ocultos, só mostra a palavra quando revelada
  if (gameState.showWordLength === false && !isWordDone()) {
    hide('word-section');
    return;
  }

  show('word-section');
  renderSecretWordTiles(word.palavra_secreta, isWordDone());
}

/* ---------- Letreiro de letras ---------- */

function resetClues() {
  for (let i = 1; i <= 3; i++) {
    const clue = document.getElementById(`clue-${i}`);
    clue.classList.add('locked');
    clue.querySelector('.clue-text').textContent = 'Bloqueada';
  }
}

function renderSecretWordTiles(word, revealed) {
  const container = document.getElementById('secret-word');
  container.innerHTML = '';
  // Sem quadradinhos: revelada aparece como texto corrido dourado
  container.classList.toggle('no-tiles', revealed && gameState.showWordLength === false);

  for (const char of word) {
    if (char === ' ') {
      const spacer = document.createElement('div');
      spacer.style.width = 'clamp(16px, 2.5vw, 32px)';
      container.appendChild(spacer);
      continue;
    }

    const tile = document.createElement('div');
    tile.className = 'letter-tile';
    if (revealed) {
      tile.textContent = char;
      tile.classList.add('revealed');
    } else {
      tile.textContent = '?';
    }
    container.appendChild(tile);
  }
}

function animateWordReveal(word) {
  const tiles = document.querySelectorAll('#secret-word .letter-tile');
  let tileIndex = 0;

  for (const char of word) {
    if (char === ' ') continue;
    const tile = tiles[tileIndex];
    if (tile) {
      setTimeout(() => {
        tile.textContent = char;
        tile.classList.add('revealed');
      }, tileIndex * 90);
    }
    tileIndex++;
  }
}

document.addEventListener('DOMContentLoaded', init);
