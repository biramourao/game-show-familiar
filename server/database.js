const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'data', 'game.db');

let db;

function getDatabase() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    createTables();
  }
  return db;
}

function createTables() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS temas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL UNIQUE,
      descricao TEXT,
      criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS palavras (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tema_id INTEGER NOT NULL,
      palavra_secreta TEXT NOT NULL,
      pista_1 TEXT NOT NULL,
      pista_2 TEXT NOT NULL,
      pista_3 TEXT NOT NULL,
      dificuldade TEXT CHECK(dificuldade IN ('fácil', 'médio', 'difícil')) DEFAULT 'médio',
      criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (tema_id) REFERENCES temas(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_palavras_tema ON palavras(tema_id);
  `);
}

function getAllTemas() {
  getDatabase();
  const stmt = db.prepare('SELECT id, nome, descricao FROM temas ORDER BY nome');
  return stmt.all();
}

function getWordsByTheme(themeId, limit = 10) {
  getDatabase();
  const stmt = db.prepare(
    'SELECT id, tema_id, palavra_secreta, pista_1, pista_2, pista_3, dificuldade FROM palavras WHERE tema_id = ? LIMIT ?'
  );
  return stmt.all(themeId, limit);
}

function getWordById(wordId) {
  getDatabase();
  const stmt = db.prepare(
    'SELECT id, tema_id, palavra_secreta, pista_1, pista_2, pista_3 FROM palavras WHERE id = ?'
  );
  return stmt.get(wordId);
}

module.exports = { getDatabase, getAllTemas, getWordsByTheme, getWordById };
