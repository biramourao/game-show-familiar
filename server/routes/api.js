const express = require('express');
const router = express.Router();
const { getAllTemas, getWordsByTheme } = require('../database');

router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

router.get('/temas', (req, res) => {
  const temas = getAllTemas();
  res.json({ success: true, data: temas });
});

router.get('/palavras', (req, res) => {
  const { tema_id, limite } = req.query;
  
  if (!tema_id) {
    return res.status(400).json({ success: false, error: 'tema_id é obrigatório' });
  }

  const limit = parseInt(limite) || 10;
  const palavras = getWordsByTheme(parseInt(tema_id), limit);
  
  res.json({ 
    success: true, 
    data: palavras.map(p => ({
      id: p.id,
      palavra_secreta: p.palavra_secreta,
      pista_1: p.pista_1,
      pista_2: p.pista_2,
      pista_3: p.pista_3,
      dificuldade: p.dificuldade
    })),
    count: palavras.length
  });
});

module.exports = router;
