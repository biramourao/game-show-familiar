# 📊 Estado da Implementação – Game Show Familiar

> **Atualizado:** MVP finalizado — fluxo completo validado end-to-end (39/39 testes automatizados passando)

---

## ✅ Implementações Concluídas

### Backend
- [x] `server/database.js` – SQLite com schemas (temas/palavras), índice e queries
- [x] `scripts/seedDatabase.js` – **4 temas + 48 palavras** com pistas progressivas (Animais, Profissões, Comidas, Lugares); seed idempotente (reseta o banco)
- [x] `server/gameLogic.js` – GameRoom com regras completas
  - [x] `selectNumber` vincula o número do grid à palavra correta e zera as pistas
  - [x] `nextWord` avança para a próxima palavra **não usada** (suporta seleção fora de ordem)
  - [x] `submitAnswer` retorna a palavra para revelação no letreiro da TV
- [x] `server/index.js` – Express + Socket.io
  - [x] **Ordem de eventos corrigida**: `sync_state` é emitido **antes** dos eventos específicos (`number_selected`, `clue_revealed`, `score_updated`, `word_revealed`) para eliminar race conditions no cliente
  - [x] Guard no `disconnect` para sockets sem sala
  - [x] `submit_answer` inclui a palavra no evento `score_updated` para a TV revelar no acerto

### Frontend — TV (`tv.html` + `tv.js`)
- [x] Grid de números estilo **painel de luzes** (ativo/usado/selecionado com pulso dourado)
- [x] Palavra secreta como **letreiro de tiles** que viram letra por letra ao revelar
- [x] Pistas com animação de entrada sequencial
- [x] Indicador **"Valendo X pontos"** que atualiza conforme as pistas são liberadas
- [x] Placar com destaque na equipe da vez e animação de pop ao pontuar
- [x] Tela de encerramento com vencedor e placar final
- [x] Reconexão: nova TV que entra no meio do jogo sincroniza o estado completo via `sync_state`
- [x] `sync_state` como fonte única de verdade — handlers específicos só disparam animações

### Frontend — Controle (`controle.html` + `controle.js`)
- [x] **Seleção de tema** via dropdown (carrega de `/api/temas`)
- [x] **Mini-grid clicável** para o apresentador escolher os números pelo celular
- [x] **Botões com estados inteligentes**: pistas liberadas sequencialmente, botão de pontuação só da equipe da vez, "Próxima palavra" só quando a palavra está concluída
- [x] Botões de pontuação mostram o **valor dinâmico** (`+10pts`, `+9pts`, `+8pts`)
- [x] Palavra secreta sempre visível para o apresentador
- [x] Indicador de pistas liberadas (dots)
- [x] **Toasts** de feedback no lugar de `alert()`
- [x] Botão "Mostrar palavra na TV"

### Visual
- [x] Identidade **"palco de auditório"**: azul-marinho profundo, neon magenta/ciano, dourado de premiação
- [x] Tipografia display (Archivo Black) + condensada (Barlow Condensed) via Google Fonts com fallback local
- [x] Layout responsivo: mobile-first no controle, grid ampliado na TV
- [x] `prefers-reduced-motion` respeitado

### Infraestrutura
- [x] `better-sqlite3` atualizado para v13 (compatível com Node 24)
- [x] README reescrito com instruções de rede local
- [x] Validação end-to-end automatizada com Playwright (39 cenários)

---

## 🐛 Bugs corrigidos nesta iteração

1. **better-sqlite3 incompatível** — binário nativo compilado para Node antigo; atualizado para v13
2. **Race condition de eventos** — `sync_state` chegava depois de `number_selected`/`score_updated` e sobrescrevia o estado renderizado; agora é emitido antes
3. **`selectNumber` marcava a palavra errada** — usava `currentWordIndex` em vez do número escolhido; agora o número define a palavra
4. **Mini-grid nunca clicável** — lógica de `canPick` tratava palavra não escolhida como "em aberto"
5. **TV não revelava a palavra no acerto** — `submitAnswer` não retornava a palavra; `score_updated` agora a inclui
6. **`end_round` com dupla transição de status** — simplificado para `idle` direto

---

## 📋 Validação end-to-end (Playwright)

Fluxo completo testado automaticamente: conexão → início de rodada → seleção de número → 2 pistas → acerto com +9pts → próxima palavra → troca de turno → skip → encerramento → reconexão de nova TV com estado sincronizado.

**Resultado: 39/39 PASS, zero erros de console.**

Para rodar a validação:
```bash
npm start &  # terminal 1
python3 .tmp-validation/validate_dom.py  # terminal 2
```

---

## 🚀 Próximos passos possíveis (pós-MVP)

- [ ] Sons de auditório (trem de pista, acerto, erro)
- [ ] Persistência do placar entre reinícios do servidor
- [ ] Editor de temas/palavras pelo próprio painel
- [ ] Timer opcional por palavra
- [ ] Modo "múltiplas salas" para mais de uma TV/jogo simultâneo
- [ ] Testes unitários Jest (estrutura pronta no package.json)

---

## 📝 Como rodar

```bash
npm install
npm run seed
npm start

# TV:     http://localhost:3000/tv.html
# Celular: http://<ip-local>:3000/controle.html
```
