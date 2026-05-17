const { getDatabase } = require('../server/database');

const db = getDatabase();

const temas = [
  { nome: 'Animais', descricao: 'Palavras relacionadas ao reino animal' },
  { nome: 'Profissões', descricao: 'Ocupações e cargos profissionais' }
];

const palavrasPorTema = {
  1: [
    { palavra: 'ELEFANTE', pistas: ['Tem tromba', 'É o maior mamífero terrestre', 'Vive em manadas na África'], dificuldade: 'médio' },
    { palavra: 'GOLFINHO', pistas: ['Vive no mar', 'É muito inteligente', 'Faz acrobacias e emite sons'], dificuldade: 'fácil' },
    { palavra: 'COBRA', pistas: ['Não tem pernas', 'Tem língua bifurcada', 'Algumas espécies são venenosas'], dificuldade: 'fácil' },
    { palavra: 'ZEBRA', pistas: ['Tem listras pretas e brancas', 'Vive na savana', 'Assemelha-se ao cavalo'], dificuldade: 'fácil' },
    { palavra: 'PINGUIM', pistas: ['Não voa', 'Vive em regiões geladas', 'Anda equilibrado'], dificuldade: 'médio' },
    { palavra: 'TAPIR', pistas: ['Mamífero de porte grande', 'Nasce com listras no pelo', 'Habita florestas e cerrados brasileiros'], dificuldade: 'difícil' },
    { palavra: 'LEOPARDO', pistas: ['É um grande felino', 'Tem manchas na pele', 'Pode viver em florestas ou savanas'], dificuldade: 'difícil' },
    { palavra: 'CROCODILO', pistas: ['Réptio de água doce', 'Tem mandíbula forte', 'Pode nadar e correr rápido'], dificuldade: 'médio' },
    { palavra: 'GORILA', pistas: ['É um grande primata', 'Vive em florestas tropicais', 'Alimenta-se principalmente de folhas'], dificuldade: 'difícil' },
    { palavra: 'PAPAGAIO', pistas: ['Ave que imita sons humanos', 'Tem penas coloridas', 'Pode viver muitos anos'], dificuldade: 'fácil' }
  ],
  2: [
    { palavra: 'MÉDICO', pistas: ['Atende pacientes em hospitais', 'Prescreve medicamentos', 'Estuda anatomia humana'], dificuldade: 'fácil' },
    { palavra: 'PROFESSOR', pistas: ['Trabalha em escolas', 'Ensina alunos', 'Prepara aulas e avaliações'], dificuldade: 'fácil' },
    { palavra: 'ENGENHEIRO', pistas: ['Projeta estruturas e máquinas', 'Usa matemática avançada', 'Resolve problemas técnicos'], dificuldade: 'médio' },
    { palavra: 'JUIZ', pistas: ['Atua no sistema judicial', 'Analisa casos e provas', 'Emite sentenças e decisões'], dificuldade: 'médio' },
    { palavra: 'BOMBEIRO', pistas: ['Combate incêndios e resgata pessoas', 'Usa equipamentos de proteção', 'Atende chamados de emergência'], dificuldade: 'fácil' },
    { palavra: 'VETERINÁRIO', pistas: ['Atende animais', 'Diagnostica doenças pet', 'Trabalha em clínicas ou fazendas'], dificuldade: 'médio' },
    { palavra: 'COZINHEIRO', pistas: ['Comanda restaurantes e cozinhas', 'Cria receitas e cardápios', 'Gerencia equipe de preparo'], dificuldade: 'difícil' },
    { palavra: 'PILOTO', pistas: ['Conduz aeronaves comerciais', 'Trabalha em companhias aéreas', 'Passa por treinamentos constantes'], dificuldade: 'médio' },
    { palavra: 'FOTÓGRAFO', pistas: ['Captura imagens profissionais', 'Edita fotos digitalmente', 'Trabalha com iluminação e composição'], dificuldade: 'difícil' },
    { palavra: 'BIBLIOTECÁRIO', pistas: ['Organiza acervos de livros', 'Ajuda pessoas a encontrar materiais', 'Gerencia empréstimos e catálogos'], dificuldade: 'médio' }
  ]
};

async function seed() {
  const stmt = db.prepare('INSERT INTO temas (nome, descricao) VALUES (?, ?)');
  
  for (const tema of temas) {
    stmt.run(tema.nome, tema.descricao);
  }
  
  const temaMap = {};
  const temasInseridos = db.prepare('SELECT id FROM temas').all();
  for (const t of temasInseridos) {
    if (!temaMap[t.id]) temaMap[t.id] = [];
  }
  
  const temaIds = db.prepare('SELECT id, nome FROM temas').all();
  let tema1Id = null;
  let tema2Id = null;
  for (const t of temaIds) {
    if (t.nome === 'Animais') tema1Id = t.id;
    if (t.nome === 'Profissões') tema2Id = t.id;
  }

  const wordStmt = db.prepare(
    'INSERT INTO palavras (tema_id, palavra_secreta, pista_1, pista_2, pista_3, dificuldade) VALUES (?, ?, ?, ?, ?, ?)'
  );

  for (const [temaKey, words] of Object.entries(palavrasPorTema)) {
    const temaId = parseInt(temaKey);
    for (const word of words) {
      wordStmt.run(temaId, word.palavra, word.pistas[0], word.pistas[1], word.pistas[2], word.dificuldade);
    }
  }

  const totalTemas = db.prepare('SELECT COUNT(*) as count FROM temas').get();
  const totalPalavras = db.prepare('SELECT COUNT(*) as count FROM palavras').get();

  console.log(`Seed completo!`);
  console.log(`Temas: ${totalTemas.count}`);
  console.log(`Palavras: ${totalPalavras.count}`);
}

seed().catch(console.error);
