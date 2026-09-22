const express = require('express');
const router = express.Router();
const { getAllTemas, getWordsByTheme, getOrCreateTema, insertPalavras } = require('../database');
const { testConnection, generateThemeWords, normalizeConfig } = require('../aiService');

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

router.get('/ia/config', (req, res) => {
  const cfg = normalizeConfig({});
  res.json({ success: true, data: { baseUrl: cfg.baseUrl, model: cfg.model } });
});

router.post('/ia/testar', async (req, res) => {
  try {
    const { baseUrl, model, apiKey } = req.body || {};
    const result = await testConnection({ baseUrl, model, apiKey });
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(502).json({ success: false, error: err.message });
  }
});

router.post('/ia/gerar-tema', async (req, res) => {
  try {
    const { tema, quantidade, baseUrl, model, apiKey, salvar } = req.body || {};
    const count = parseInt(quantidade, 10) || 12;

    const words = await generateThemeWords(tema, count, { baseUrl, model, apiKey });

    let temaData = null;
    if (salvar !== false) {
      const { tema: t } = getOrCreateTema(tema.trim());
      insertPalavras(t.id, words);
      temaData = t;
    }

    res.json({
      success: true,
      data: {
        tema_id: temaData ? temaData.id : null,
        tema_nome: tema.trim(),
        salvo: !!temaData,
        count: words.length,
        palavras: words
      }
    });
  } catch (err) {
    res.status(502).json({ success: false, error: err.message });
  }
});

module.exports = router;
