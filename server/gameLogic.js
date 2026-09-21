const { getWordsByTheme, getWordById } = require('./database');

class GameRoom {
  constructor(roomId) {
    this.roomId = roomId;
    this.status = 'idle';
    this.theme = null;
    this.words = [];
    this.currentWordIndex = 0;
    this.revealedClues = 0;
    this.usedNumbers = [];
    this.scores = { A: 0, B: 0 };
    this.currentTurn = 'A';
    this.changedNumber = null;
    this.startTime = null;
    this.endTime = null;
    this.connectedClients = new Set();
    this.disconnectTimer = null;
  }

  startRound(themeId, wordCount) {
    const themeData = require('./database').getDatabase().prepare(
      'SELECT id, nome FROM temas WHERE id = ?'
    ).get(themeId);

    if (!themeData) {
      return { success: false, error: 'Tema não encontrado' };
    }

    const availableWords = getWordsByTheme(themeId, wordCount + 5);
    
    if (availableWords.length < wordCount) {
      return { success: false, error: 'Tema sem palavras suficientes' };
    }

    const shuffled = this.shuffleArray(availableWords).slice(0, wordCount);
    
    this.status = 'playing';
    this.theme = themeData;
    this.words = shuffled.map((w, i) => ({
      index: i + 1,
      id: w.id,
      palavra_secreta: w.palavra_secreta,
      pista_1: w.pista_1,
      pista_2: w.pista_2,
      pista_3: w.pista_3,
      used: false,
      revealed: false
    }));
    this.currentWordIndex = 0;
    this.revealedClues = 0;
    this.usedNumbers = [];
    this.scores = { A: 0, B: 0 };
    this.currentTurn = 'A';
    this.changedNumber = null;
    this.startTime = new Date();

    return { success: true, theme: this.theme, wordCount: this.words.length };
  }

  selectNumber(number) {
    if (this.status !== 'playing') {
      return { success: false, error: 'Jogo não está em andamento' };
    }

    if (number < 1 || number > this.words.length) {
      return { success: false, error: 'Número inválido' };
    }

    const currentWord = this.words[this.currentWordIndex];
    const hasOpenWord = currentWord && currentWord.used && !currentWord.revealed;

    // Troca de número: permitida apenas se nenhuma pista foi liberada ainda
    if (hasOpenWord) {
      if (this.revealedClues > 0) {
        return { success: false, error: 'Não é possível trocar: pistas já foram liberadas' };
      }
      // Desfaz a seleção anterior
      const previousNumber = this.usedNumbers.pop();
      currentWord.used = false;
      this.changedNumber = previousNumber;
    } else {
      this.changedNumber = null;
    }

    const word = this.words[number - 1];

    if (word.used) {
      return { success: false, error: 'Número já foi usado' };
    }

    this.usedNumbers.push(number);
    word.used = true;
    // O número escolhido define a palavra atual
    this.currentWordIndex = number - 1;
    this.revealedClues = 0;

    return { success: true, number, previousNumber: this.changedNumber, wordIndex: this.currentWordIndex, word };
  }

  revealClue() {
    if (this.status !== 'playing') {
      return { success: false, error: 'Jogo não está em andamento' };
    }

    if (this.revealedClues >= 3) {
      return { success: false, error: 'Todas as pistas já foram reveladas' };
    }

    this.revealedClues++;
    
    const clueText = `Pista ${this.revealedClues}:`;
    let text = '';
    
    if (this.revealedClues === 1) {
      text = this.words[this.currentWordIndex].pista_1;
    } else if (this.revealedClues === 2) {
      text = this.words[this.currentWordIndex].pista_2;
    } else if (this.revealedClues === 3) {
      text = this.words[this.currentWordIndex].pista_3;
    }

    return { success: true, level: this.revealedClues, text };
  }

  submitAnswer(team, correct) {
    if (this.status !== 'playing') {
      return { success: false, error: 'Jogo não está em andamento' };
    }

    if (this.currentTurn !== team) {
      return { success: false, error: 'Não é a vez da sua equipe' };
    }

    if (this.revealedClues === 0) {
      return { success: false, error: 'Libere pelo menos 1 pista' };
    }

    const points = correct ? (11 - this.revealedClues) : 0;

    if (correct) {
      this.scores[team] += points;
    }

    this.words[this.currentWordIndex].revealed = true;

    return {
      success: true,
      team,
      points,
      correct,
      word: this.words[this.currentWordIndex].palavra_secreta
    };
  }

  skipWord() {
    if (this.status !== 'playing') {
      return { success: false, error: 'Jogo não está em andamento' };
    }

    this.words[this.currentWordIndex].revealed = true;
    
    return { success: true };
  }

  revealWord() {
    if (this.status !== 'playing') {
      return { success: false, error: 'Jogo não está em andamento' };
    }

    this.words[this.currentWordIndex].revealed = true;
    
    return { success: true };
  }

  nextTurn() {
    if (this.status !== 'playing') {
      return { success: false, error: 'Jogo não está em andamento' };
    }

    this.currentTurn = this.currentTurn === 'A' ? 'B' : 'A';
    
    return { success: true, currentTurn: this.currentTurn };
  }

  nextWord() {
    if (this.status !== 'playing') {
      return { success: false, error: 'Jogo não está em andamento' };
    }

    const allWordsUsed = this.words.every(w => w.used);

    if (allWordsUsed) {
      this.status = 'ended';
      this.endTime = new Date();
      return {
        success: true,
        allWordsUsed: true,
        winner: this.scores.A > this.scores.B ? 'A' : this.scores.B > this.scores.A ? 'B' : null
      };
    }

    // Procura a próxima palavra ainda não usada (suporta seleção fora de ordem)
    let nextIndex = (this.currentWordIndex + 1) % this.words.length;
    while (this.words[nextIndex].used && nextIndex !== this.currentWordIndex) {
      nextIndex = (nextIndex + 1) % this.words.length;
    }

    this.currentWordIndex = nextIndex;
    this.revealedClues = 0;

    return { success: true, currentWordIndex: this.currentWordIndex, word: this.words[this.currentWordIndex] };
  }

  endRound() {
    this.status = 'ended';
    this.endTime = new Date();

    let winner = null;
    if (this.scores.A > this.scores.B) {
      winner = 'A';
    } else if (this.scores.B > this.scores.A) {
      winner = 'B';
    }

    return {
      success: true,
      winner,
      finalScores: { ...this.scores },
      totalScoreA: this.scores.A,
      totalScoreB: this.scores.B
    };
  }

  shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  getState() {
    if (this.status !== 'playing') {
      return null;
    }

    const currentWord = this.words[this.currentWordIndex];
    
    return {
      status: this.status,
      theme: this.theme,
      wordsCount: this.words.length,
      currentWordIndex: this.currentWordIndex,
      currentWord: currentWord ? {
        palavra_secreta: currentWord.palavra_secreta,
        pista_1: currentWord.pista_1,
        pista_2: currentWord.pista_2,
        pista_3: currentWord.pista_3
      } : null,
      revealedClues: this.revealedClues,
      usedNumbers: [...this.usedNumbers],
      scores: { ...this.scores },
      currentTurn: this.currentTurn,
      startTime: this.startTime,
      words: this.words.map(w => ({
        palavra_secreta: w.palavra_secreta,
        revealed: w.revealed,
        used: w.used
      }))
    };
  }
}

const gameRooms = new Map();

function getOrCreateRoom(roomId) {
  if (!gameRooms.has(roomId)) {
    gameRooms.set(roomId, new GameRoom(roomId));
  }
  return gameRooms.get(roomId);
}

module.exports = { GameRoom, getOrCreateRoom, gameRooms };
