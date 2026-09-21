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
  words: []
};

let wordRevealedOnTv = false;

function init() {
  socket.emit('join_game', { room: 'familia' });
  loadThemes();
}

/* ---------- Temas ---------- */

async function loadThemes() {
  const select = document.getElementById('theme-select');
  try {
    const res = await fetch('/api/temas');
    const json = await res.json();
    select.innerHTML = '';
    for (const tema of json.data) {
      const opt = document.createElement('option');
      opt.value = tema.id;
      opt.textContent = tema.nome;
      select.appendChild(opt);
    }
  } catch (err) {
    select.innerHTML = '<option value="">Erro ao carregar temas</option>';
    showToast('Não foi possível carregar os temas', 'error');
  }
}

/* ---------- Eventos do servidor ---------- */

socket.on('game_joined', () => {
  hide('waiting-screen');
  show('control-panel');
  updateUI();
});

socket.on('game_started', (data) => {
  gameState.status = 'playing';
  gameState.theme = data.theme;
  gameState.wordsCount = data.words_count;
  gameState.usedNumbers = [];
  gameState.scores = { A: 0, B: 0 };
  gameState.currentTurn = 'A';
  gameState.revealedClues = 0;
  wordRevealedOnTv = false;
  showToast(`Rodada iniciada — tema: ${data.theme.nome}`, 'success');
  updateUI();
});

socket.on('sync_state', (state) => {
  if (!state) return;
  gameState = state;
  updateUI();
});

socket.on('number_selected', (data) => {
  wordRevealedOnTv = false;
  if (data.number) {
    if (data.previousNumber) {
      showToast(`Trocado: ${data.previousNumber} → ${data.number}`, 'info');
    } else {
      showToast(`Número ${data.number} selecionado`, 'info');
    }
  }
  updateUI();
});

socket.on('clue_revealed', (data) => {
  showToast(`Pista ${data.level} na tela`, 'info');
});

socket.on('score_updated', (data) => {
  wordRevealedOnTv = true;
  showToast(`+${data.points} pontos para a Equipe ${data.team}!`, 'success');
  updateUI();
});

socket.on('word_revealed', (data) => {
  wordRevealedOnTv = true;
  if (data.revealed_by === 'skip') {
    showToast(`A palavra era: ${data.word}`, 'info');
  }
  updateUI();
});

socket.on('turn_changed', (data) => {
  gameState.currentTurn = data.activeTeam;
  updateUI();
});

socket.on('round_ended', (data) => {
  gameState.status = 'ended';
  const msg = data.winner ? `🏆 Equipe ${data.winner} venceu!` : '🤝 Empate!';
  showToast(msg, 'success');
  updateUI();
});

socket.on('error', (data) => {
  showToast(data.message, 'error');
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

/* ---------- Ações do apresentador ---------- */

document.getElementById('btn-start-round').addEventListener('click', () => {
  const temaId = parseInt(document.getElementById('theme-select').value);
  if (!temaId) {
    showToast('Selecione um tema primeiro', 'error');
    return;
  }
  socket.emit('start_round', { tema_id: temaId, word_count: 10 });
});

document.getElementById('btn-end-round').addEventListener('click', () => {
  socket.emit('end_round');
});

document.getElementById('btn-reveal-word').addEventListener('click', () => {
  socket.emit('reveal_word');
});

for (let i = 1; i <= 3; i++) {
  document.getElementById(`btn-clue-${i}`).addEventListener('click', () => {
    socket.emit('reveal_clue');
  });
}

document.getElementById('btn-score-a').addEventListener('click', () => {
  socket.emit('submit_answer', { team: 'A', correct: true });
});

document.getElementById('btn-score-b').addEventListener('click', () => {
  socket.emit('submit_answer', { team: 'B', correct: true });
});

document.getElementById('btn-skip').addEventListener('click', () => {
  socket.emit('skip_word');
});

document.getElementById('btn-next-word').addEventListener('click', () => {
  socket.emit('next_word');
});

document.getElementById('btn-next-turn').addEventListener('click', () => {
  socket.emit('next_turn');
});

// Grid do apresentador: clique seleciona o número
document.getElementById('mini-grid').addEventListener('click', (e) => {
  const cell = e.target.closest('.mini-cell-available');
  if (!cell) return;
  const number = parseInt(cell.dataset.number);
  socket.emit('select_number', { number });
});

/* ---------- UI ---------- */

function show(id) {
  document.getElementById(id).classList.remove('hidden');
}

function hide(id) {
  document.getElementById(id).classList.add('hidden');
}

function updateUI() {
  updateRoundInfo();
  updateSecretWord();
  updateButtons();
  updateClueDots();
  updateTurn();
  renderMiniGrid();
}

function updateRoundInfo() {
  const roundInfo = document.getElementById('round-info');
  if (gameState.status === 'playing' && gameState.theme) {
    const used = gameState.usedNumbers ? gameState.usedNumbers.length : 0;
    roundInfo.textContent = `Tema: ${gameState.theme.nome} · ${used}/${gameState.wordsCount} números usados`;
  } else if (gameState.status === 'ended') {
    roundInfo.textContent = 'Rodada encerrada';
  } else {
    roundInfo.textContent = 'Aguardando início da rodada...';
  }
}

function updateSecretWord() {
  const display = document.getElementById('secret-word-display');
  const controlDisplay = document.getElementById('secret-word-control-display');

  if (gameState.status !== 'playing' || !gameState.currentWord) {
    display.textContent = '';
    controlDisplay.textContent = gameState.status === 'playing' ? 'Escolha um número' : '';
    return;
  }

  const wordState = gameState.words ? gameState.words[gameState.currentWordIndex] : null;

  if (!wordState || !wordState.used) {
    display.textContent = '';
    controlDisplay.textContent = 'Escolha um número';
    return;
  }

  const word = gameState.currentWord.palavra_secreta;
  display.textContent = wordState.revealed ? `${word} (já revelada)` : word;
  controlDisplay.textContent = word;
}

function currentStake() {
  if (!gameState.revealedClues || gameState.revealedClues === 0) return 10;
  return 11 - gameState.revealedClues;
}

function updateButtons() {
  const playing = gameState.status === 'playing';
  const wordState = playing && gameState.words ? gameState.words[gameState.currentWordIndex] : null;
  // Palavra em aberto = número escolhido (used), ainda não revelada
  const wordOpen = !!(wordState && wordState.used && !wordState.revealed);
  const wordDone = !!(wordState && wordState.used && wordState.revealed);
  const hasWord = wordOpen || wordDone;
  const revealed = gameState.revealedClues || 0;

  // Rodada
  document.getElementById('btn-start-round').disabled = playing;
  document.getElementById('theme-select').disabled = playing;
  document.getElementById('btn-end-round').disabled = !playing;

  // Pistas: sequenciais, só com palavra em aberto
  document.getElementById('btn-clue-1').disabled = !(wordOpen && revealed === 0);
  document.getElementById('btn-clue-2').disabled = !(wordOpen && revealed === 1);
  document.getElementById('btn-clue-3').disabled = !(wordOpen && revealed === 2);

  // Mostrar palavra
  document.getElementById('btn-reveal-word').disabled = !wordOpen;

  // Respostas: precisa de palavra em aberto com ao menos 1 pista
  const canAnswer = wordOpen && revealed > 0;
  const stake = currentStake();
  const btnA = document.getElementById('btn-score-a');
  const btnB = document.getElementById('btn-score-b');
  btnA.disabled = !(canAnswer && gameState.currentTurn === 'A');
  btnB.disabled = !(canAnswer && gameState.currentTurn === 'B');
  btnA.textContent = `Equipe A +${stake}pts`;
  btnB.textContent = `Equipe B +${stake}pts`;

  // Pular / próxima palavra / turno
  document.getElementById('btn-skip').disabled = !wordOpen;
  document.getElementById('btn-next-word').disabled = !wordDone;
  document.getElementById('btn-next-turn').disabled = !playing;
}

function updateClueDots() {
  const dots = document.querySelectorAll('#clue-status .clue-dot');
  const revealed = gameState.revealedClues || 0;
  dots.forEach((dot, i) => {
    dot.classList.toggle('revealed', i < revealed);
  });
}

function updateTurn() {
  const turnDisplay = document.getElementById('current-turn-display');
  if (gameState.status === 'playing') {
    turnDisplay.textContent = `Vez da Equipe ${gameState.currentTurn}`;
  } else {
    turnDisplay.textContent = 'Aguardando início...';
  }
}

function renderMiniGrid() {
  const miniGrid = document.getElementById('mini-grid');
  miniGrid.innerHTML = '';

  const playing = gameState.status === 'playing';
  // Palavra em aberto = número escolhido e ainda não concluído
  const currentWordState = gameState.words ? gameState.words[gameState.currentWordIndex] : null;
  const wordOpen = playing && !!currentWordState && currentWordState.used && !currentWordState.revealed;
  const revealed = gameState.revealedClues || 0;
  // Pode escolher número: sem palavra em aberto, OU com palavra aberta mas nenhuma pista liberada (troca)
  const canPick = playing && (!wordOpen || (wordOpen && revealed === 0));
  const current = lastUsedNumber();

  for (let i = 1; i <= MAX_NUMBERS; i++) {
    const cell = document.createElement('div');
    cell.className = 'mini-cell';
    cell.dataset.number = i;
    cell.textContent = i;

    const isUsed = gameState.usedNumbers && gameState.usedNumbers.includes(i);

    if (isUsed && wordOpen && i === current) {
      cell.classList.add('mini-cell-selected');
    } else if (isUsed) {
      cell.classList.add('mini-cell-used');
    } else if (canPick) {
      cell.classList.add('mini-cell-available');
    } else {
      cell.classList.add('mini-cell-used');
      cell.style.textDecoration = 'none';
    }

    miniGrid.appendChild(cell);
  }
}

function lastUsedNumber() {
  if (!gameState.usedNumbers || gameState.usedNumbers.length === 0) return null;
  return gameState.usedNumbers[gameState.usedNumbers.length - 1];
}

/* ---------- Toast ---------- */

function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = 'toast';
  if (type === 'error') toast.classList.add('toast-error');
  if (type === 'success') toast.classList.add('toast-success');
  toast.textContent = message;
  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('toast-out');
    setTimeout(() => toast.remove(), 300);
  }, 2600);
}

document.addEventListener('DOMContentLoaded', init);
