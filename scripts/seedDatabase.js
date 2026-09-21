const { getDatabase } = require('../server/database');
const fs = require('fs');
const path = require('path');

// Reseta o banco para permitir re-seed limpo
const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'data', 'game.db');
if (fs.existsSync(DB_PATH)) {
  fs.unlinkSync(DB_PATH);
}
// Remove arquivos WAL/SHM residuais
for (const ext of ['-wal', '-shm']) {
  if (fs.existsSync(DB_PATH + ext)) fs.unlinkSync(DB_PATH + ext);
}

const db = getDatabase();

const temas = [
  { nome: 'Animais', descricao: 'Bichos de todos os tipos e tamanhos' },
  { nome: 'Profissões', descricao: 'Ocupações e cargos profissionais' },
  { nome: 'Comidas', descricao: 'Pratos, frutas e delícias da cozinha' },
  { nome: 'Lugares', descricao: 'Cidades, países e pontos famosos' }
];

// Pistas pensadas em ordem progressiva: 1 = mais difícil/sutil, 3 = quase entrega
const palavrasPorTema = {
  'Animais': [
    { palavra: 'ELEFANTE', pistas: ['Tem uma memória famosa por nunca esquecer', 'Seu nariz é tão longo que tem nome próprio', 'É o maior mamífero terrestre e tem tromba'], dificuldade: 'fácil' },
    { palavra: 'GOLFINHO', pistas: ['Dorme com metade do cérebro acordado', 'Se comunica por cliques e assobios', 'Vive no mar e é famoso por ser muito inteligente'], dificuldade: 'fácil' },
    { palavra: 'COBRA', pistas: ['Troca de pele várias vezes na vida', 'Sente o ambiente pela língua', 'Não tem pernas e algumas são venenosas'], dificuldade: 'fácil' },
    { palavra: 'ZEBRA', pistas: ['Cada indivíduo tem um padrão único, como uma digital', 'É parente distante do cavalo', 'É preta com listras brancas... ou o contrário!'], dificuldade: 'fácil' },
    { palavra: 'PINGUIM', pistas: ['O macho choca o ovo sobre os pés', 'É uma ave que "voa" debaixo d\'água', 'Não voa, vive no gelo e anda balançando'], dificuldade: 'médio' },
    { palavra: 'TAMANDUÁ', pistas: ['Não tem dentes, mas tem uma língua de até 60 cm', 'Come até 30 mil insetos por dia', 'Tem o nome no próprio prato favorito'], dificuldade: 'médio' },
    { palavra: 'BICHO-PREGUIÇA', pistas: ['Algas crescem no seu pelo, ajudando na camuflagem', 'Desce da árvore uma vez por semana', 'É o mamífero mais lento do mundo'], dificuldade: 'médio' },
    { palavra: 'CAPIVARA', pistas: ['É parente do porquinho-da-índia', 'Virou meme e símbolo da tranquilidade brasileira', 'É o maior roedor do mundo'], dificuldade: 'fácil' },
    { palavra: 'CROCODILO', pistas: ['Já viveu na época dos dinossauros e quase não mudou', 'Não consegue pôr a língua para fora', 'Réptil gigante com a mordida mais forte do reino animal'], dificuldade: 'médio' },
    { palavra: 'PAPAGAIO', pistas: ['Pode viver mais de 60 anos', 'Alguns aprendem a usar palavras com sentido', 'Ave colorida famosa por "falar"'], dificuldade: 'fácil' },
    { palavra: 'MORCEGO', pistas: ['Enxerga com os ouvidos, por eco', 'É o único mamífero que voa de verdade', 'Dorme de cabeça para baixo'], dificuldade: 'fácil' },
    { palavra: 'POLVO', pistas: ['Tem três corações e sangue azul', 'Consegue abrir potes por dentro', 'Tem oito braços e solta tinta para fugir'], dificuldade: 'médio' }
  ],
  'Profissões': [
    { palavra: 'MÉDICO', pistas: ['Faz um juramento famoso ao se formar', 'Usa estetoscópio', 'Cuida da saúde e trabalha em hospitais'], dificuldade: 'fácil' },
    { palavra: 'PROFESSOR', pistas: ['Tem dia comemorativo em 15 de outubro', 'Vive corrigindo pilhas de provas', 'Ensina alunos na escola'], dificuldade: 'fácil' },
    { palavra: 'ENGENHEIRO', pistas: ['Pode assinar a responsabilidade técnica de obras', 'Usa muito cálculo e física', 'Projeta pontes, prédios e máquinas'], dificuldade: 'médio' },
    { palavra: 'JUIZ', pistas: ['Em jogos de futebol, é quem apita', 'Veste toga no trabalho', 'Decide sentenças no tribunal'], dificuldade: 'fácil' },
    { palavra: 'BOMBEIRO', pistas: ['Também resgata gatos e pessoas em altura', 'Trabalha em turnos de 24 horas', 'Combate incêndios e atende emergências'], dificuldade: 'fácil' },
    { palavra: 'VETERINÁRIO', pistas: ['Seus pacientes não falam onde dói', 'Trabalha em clínicas ou fazendas', 'Cuida da saúde dos animais'], dificuldade: 'fácil' },
    { palavra: 'CHEF DE COZINHA', pistas: ['O chapéu alto tradicional tem 100 dobras', 'Cria receitas e comanda uma equipe', 'É a estrela dos restaurantes'], dificuldade: 'médio' },
    { palavra: 'PILOTO DE AVIÃO', pistas: ['Fala um código próprio pelo rádio', 'Treina em simuladores de voo', 'Comanda aeronaves lá no alto'], dificuldade: 'fácil' },
    { palavra: 'FOTÓGRAFO', pistas: ['Trabalha com luz, ângulo e composição', 'Está sempre em casamentos e formaturas', 'Registra momentos com uma câmera'], dificuldade: 'fácil' },
    { palavra: 'BIBLIOTECÁRIO', pistas: ['Usa um sistema de classificação decimal', 'Guardião do silêncio absoluto', 'Organiza e empresta livros'], dificuldade: 'médio' },
    { palavra: 'ASTRONAUTA', pistas: ['Treina boa parte do tempo embaixo d\'água', 'Come comida desidratada em tubos', 'Trabalha no espaço'], dificuldade: 'fácil' },
    { palavra: 'BARBEIRO', pistas: ['Antigamente, também arrancava dentes', 'Trabalha com navalha e tesoura', 'Deixa a galera no corte'], dificuldade: 'fácil' }
  ],
  'Comidas': [
    { palavra: 'FEIJOADA', pistas: ['Tradicionalmente servida às quartas e sábados', 'Acompanha couve, farofa e laranja', 'Prato brasileiro feito com feijão preto'], dificuldade: 'fácil' },
    { palavra: 'BRIGADEIRO', pistas: ['Foi criado nos anos 1940, em época de campanha política', 'Leva leite condensado e chocolate', 'O docinho obrigatório de toda festa de aniversário'], dificuldade: 'fácil' },
    { palavra: 'PIZZA', pistas: ['A mais famosa homenageia uma rainha italiana', 'Tem dia de celebração com ketchup extra', 'Redonda, de origem italiana e com queijo derretido'], dificuldade: 'fácil' },
    { palavra: 'SUSHI', pistas: ['O arroz é mais importante que o peixe', 'Surgiu como técnica de conservação', 'Comida japonesa enrolada com alga e peixe cru'], dificuldade: 'médio' },
    { palavra: 'LASANHA', pistas: ['O gato mais famoso dos quadrinhos é viciado nela', 'Vai ao forno montada em camadas', 'Massa intercalada com molho e queijo'], dificuldade: 'fácil' },
    { palavra: 'COXINHA', pistas: ['O formato imita uma parte do frango', 'A massa é feita com caldo de galinha', 'Salgadinho de festa recheado com frango'], dificuldade: 'fácil' },
    { palavra: 'AÇAÍ', pistas: ['No Pará, é comido com farinha e peixe frito', 'No resto do Brasil virou sobremesa gelada', 'Fruta roxa da Amazônia batida na tigela'], dificuldade: 'médio' },
    { palavra: 'CHURRASCO', pistas: ['Tem quem defenda que o sal grosso é o único tempero', 'O ponto da carne gera debates eternos', 'Reunião de domingo em volta da grelha'], dificuldade: 'fácil' },
    { palavra: 'TAPIOCA', pistas: ['Fica pronta sem precisar de óleo ou fermento', 'É feita com goma de mandioca', 'Comida típica do Nordeste, branquinha e recheada'], dificuldade: 'médio' },
    { palavra: 'PÃO DE QUEIJO', pistas: ['Não leva trigo, leva polvilho', 'Orgulho de Minas Gerais', 'Bolinho quentinho de queijo, inseparável do café'], dificuldade: 'fácil' },
    { palavra: 'MOQUECA', pistas: ['A capixaba e a baiana disputam qual é a verdadeira', 'É feita em panela de barro', 'Ensopado de peixe com leite de coco e dendê'], dificuldade: 'difícil' },
    { palavra: 'PASTEL DE FEIRA', pistas: ['O de "vento" não tem recheio nenhum', 'Parceiro inseparável do caldo de cana', 'Massa frita crocante vendida nas feiras livres'], dificuldade: 'fácil' }
  ],
  'Lugares': [
    { palavra: 'PARIS', pistas: ['Seu monumento mais famoso ia ser desmontado após 20 anos', 'É chamada de Cidade Luz', 'Capital francesa da torre de ferro mais famosa do mundo'], dificuldade: 'fácil' },
    { palavra: 'RIO DE JANEIRO', pistas: ['Tem uma estátua de braços abertos sobre a cidade', 'Recebeu esse nome por um equívoco dos navegadores', 'Cidade do Cristo Redentor e do Carnaval'], dificuldade: 'fácil' },
    { palavra: 'DESERTO DO SAARA', pistas: ['Nem sempre foi areia: já foi verde e cheio de rios', 'Cobre uma área quase do tamanho do Brasil inteiro... vezes dez', 'O maior deserto quente do planeta'], dificuldade: 'médio' },
    { palavra: 'AMAZÔNIA', pistas: ['Abriga 10% de todas as espécies conhecidas', 'Seu rio já correu na direção contrária', 'A maior floresta tropical do mundo'], dificuldade: 'médio' },
    { palavra: 'JAPÃO', pistas: ['É formado por mais de 14 mil ilhas', 'O trem-bala nunca sofreu um acidente fatal', 'País do sol nascente, sushi e anime'], dificuldade: 'médio' },
    { palavra: 'EGITO', pistas: ['As pirâmides já foram brancas e brilhantes', 'Tem um rio que atravessa o deserto', 'Terra das pirâmides e dos faraós'], dificuldade: 'fácil' },
    { palavra: 'MACHU PICCHU', pistas: ['Os espanhóis nunca a encontraram', 'Foi "redescoberta" apenas em 1911', 'Cidade inca no alto dos Andes, no Peru'], dificuldade: 'difícil' },
    { palavra: 'VENEZA', pistas: ['Afunda alguns milímetros por ano', 'Os barcos fazem o papel dos carros', 'Cidade italiana construída sobre a água'], dificuldade: 'fácil' },
    { palavra: 'NOVA YORK', pistas: ['Recebeu o nome em homenagem a um duque inglês', 'Antes de ser inglesa, era uma colônia holandesa', 'A "Big Apple", cidade que nunca dorme'], dificuldade: 'médio' },
    { palavra: 'CATARATAS DO IGUAÇU', pistas: ['Têm 275 quedas d\'água', 'Ficam na fronteira entre Brasil e Argentina', 'Uma das maiores quedas d\'água do mundo, no Paraná'], dificuldade: 'médio' },
    { palavra: 'AUSTRÁLIA', pistas: ['Tem mais cangurus do que pessoas', 'É um país e um continente ao mesmo tempo', 'Terra dos cangurus e da Ópera de Sydney'], dificuldade: 'fácil' },
    { palavra: 'GRANDE MURALHA DA CHINA', pistas: ['Não é uma muralha só, mas várias unidas', 'Ao contrário da lenda, não se vê da Lua a olho nu', 'Construção gigantesca que protegia o império chinês'], dificuldade: 'médio' }
  ]
};

function seed() {
  const temaStmt = db.prepare('INSERT INTO temas (nome, descricao) VALUES (?, ?)');
  const wordStmt = db.prepare(
    'INSERT INTO palavras (tema_id, palavra_secreta, pista_1, pista_2, pista_3, dificuldade) VALUES (?, ?, ?, ?, ?, ?)'
  );

  const insertAll = db.transaction(() => {
    for (const tema of temas) {
      const info = temaStmt.run(tema.nome, tema.descricao);
      const temaId = info.lastInsertRowid;
      const palavras = palavrasPorTema[tema.nome] || [];
      for (const word of palavras) {
        wordStmt.run(temaId, word.palavra, word.pistas[0], word.pistas[1], word.pistas[2], word.dificuldade);
      }
    }
  });

  insertAll();

  const totalTemas = db.prepare('SELECT COUNT(*) as count FROM temas').get();
  const totalPalavras = db.prepare('SELECT COUNT(*) as count FROM palavras').get();

  console.log(`Seed completo!`);
  console.log(`Temas: ${totalTemas.count}`);
  console.log(`Palavras: ${totalPalavras.count}`);
}

try {
  seed();
} catch (err) {
  console.error('Erro no seed:', err);
  process.exit(1);
}
