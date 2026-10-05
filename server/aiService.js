// Serviço de IA compatível com a API padrão OpenAI (OpenAI, LM Studio, Ollama, etc.)
// Usa fetch nativo do Node 18+ — sem dependência extra.

const DEFAULT_BASE_URL = process.env.OPENAI_BASE_URL || 'http://localhost:1234/v1';
const DEFAULT_MODEL = process.env.OPENAI_MODEL || 'local-model';
const DEFAULT_API_KEY = process.env.OPENAI_API_KEY || 'lm-studio';

// Sem timeout na geração: modelos locais (LM Studio, Ollama) podem demorar
// vários minutos. O teste de conexão mantém um limite curto porque só
// consulta /models, que responde na hora.
const TEST_TIMEOUT_MS = 10000;

// Limite de saída folgado: em modelos que "pensam" (Qwen3, DeepSeek-R1,
// gpt-oss etc.) o raciocínio consome o mesmo orçamento da resposta, e só o
// JSON de ~23 palavras com 3 pistas já passa de 2.500 tokens.
const MAX_OUTPUT_TOKENS = 16384;

// Trava contra modelo preso raciocinando: se passar disso (~4.000 tokens)
// sem começar a resposta, corta a geração. O GLM já entrou em loop e ficou
// 25 minutos só pensando.
const MAX_REASONING_CHARS = 16000;

function normalizeConfig(config = {}) {
  let baseUrl = (config.baseUrl || DEFAULT_BASE_URL).trim().replace(/\/+$/, '');
  // Aceita "http://host:port" sem o /v1
  if (!/\/v\d+$/.test(baseUrl)) baseUrl += '/v1';
  return {
    baseUrl,
    model: (config.model || DEFAULT_MODEL).trim(),
    apiKey: (config.apiKey || DEFAULT_API_KEY).trim()
  };
}

async function fetchWithTimeout(url, options, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function authHeaders(apiKey) {
  const headers = { 'Content-Type': 'application/json' };
  if (apiKey) headers.Authorization = `Bearer ${apiKey}`;
  return headers;
}

async function postChat(cfg, payload, signal) {
  // Sempre em streaming: sem ele o servidor só manda os cabeçalhos no fim da
  // geração, e o fetch do Node desiste após 300 s esperando cabeçalho
  // (UND_ERR_HEADERS_TIMEOUT). Em modelo local lento isso derrubava a
  // conexão e o LM Studio parava a geração no meio.
  // Sem timeout próprio: o usuário cancela pela interface (signal).
  const res = await fetch(`${cfg.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: authHeaders(cfg.apiKey),
    body: JSON.stringify({ ...payload, stream: true }),
    signal
  });
  if (!res.ok || !/text\/event-stream/i.test(res.headers.get('content-type') || '')) {
    // Erro, ou servidor que ignorou o stream e respondeu JSON de uma vez
    const body = await res.json().catch(() => ({}));
    return { res, body };
  }
  return { res, body: await readStream(res) };
}

// Junta os pedaços do stream (SSE) numa resposta no mesmo formato da
// resposta sem stream: { choices: [{ message, finish_reason }] }
async function readStream(res) {
  const message = { content: '', reasoning_content: '' };
  let finishReason = null;
  let buffer = '';
  const decoder = new TextDecoder();

  const handleLine = (line) => {
    if (!line.startsWith('data:')) return;
    const data = line.slice(5).trim();
    if (!data || data === '[DONE]') return;
    let chunk;
    try { chunk = JSON.parse(data); } catch (err) { return; }
    if (chunk.error) throw new Error(chunk.error.message || 'Erro no serviço de IA');
    const choice = chunk.choices && chunk.choices[0];
    if (!choice) return;
    const delta = choice.delta || {};
    if (typeof delta.content === 'string') message.content += delta.content;
    if (typeof delta.reasoning_content === 'string') message.reasoning_content += delta.reasoning_content;
    if (typeof delta.reasoning === 'string') message.reasoning_content += delta.reasoning;
    if (choice.finish_reason) finishReason = choice.finish_reason;
  };

  for await (const piece of res.body) {
    buffer += decoder.decode(piece, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop();
    lines.forEach((line) => handleLine(line.trim()));
    if (!message.content.trim() && message.reasoning_content.length > MAX_REASONING_CHARS) {
      // Sair do laço fecha a conexão, e o servidor para de gerar
      return { choices: [{ message, finish_reason: 'overthinking' }] };
    }
  }
  handleLine((buffer + decoder.decode()).trim());

  return { choices: [{ message, finish_reason: finishReason }] };
}

// Separa o raciocínio ("thinking") da resposta final. Cada servidor entrega
// de um jeito: campo reasoning_content (DeepSeek, llama.cpp), campo reasoning
// (LM Studio e Ollama mais novos) ou blocos <think> dentro do próprio content
// — às vezes sem o </think>, quando o limite de tokens corta o raciocínio.
function splitReasoning(message) {
  let answer = typeof message.content === 'string' ? message.content : '';
  const parts = [];
  for (const key of ['reasoning_content', 'reasoning']) {
    if (typeof message[key] === 'string' && message[key].trim()) parts.push(message[key]);
  }

  // Template que já abre o <think> no prompt: só o </think> aparece na saída
  const closeIdx = answer.indexOf('</think>');
  if (closeIdx !== -1 && answer.lastIndexOf('<think>', closeIdx) === -1) {
    parts.push(answer.slice(0, closeIdx));
    answer = answer.slice(closeIdx + '</think>'.length);
  }
  answer = answer
    .replace(/<think>([\s\S]*?)<\/think>/gi, (_, inner) => { parts.push(inner); return ''; })
    // <think> sem fechamento: tudo dali em diante é raciocínio cortado
    .replace(/<think>([\s\S]*)$/i, (_, inner) => { parts.push(inner); return ''; })
    .trim();

  return { answer, reasoning: parts.join('\n').trim() };
}

async function chatCompletion(cfg, messages, { temperature = 0.7, maxTokens = MAX_OUTPUT_TOKENS, signal } = {}) {
  const payload = { model: cfg.model, messages, temperature, max_tokens: maxTokens };

  let result;
  try {
    // 1ª tentativa: força JSON no nível do servidor (llama.cpp, Ollama e
    // OpenAI entendem response_format). Reduz MUITO os JSONs errados.
    result = await postChat(cfg, { ...payload, response_format: { type: 'json_object' } }, signal);
    // LM Studio e servidores antigos rejeitam json_object com 400 — tenta sem ele
    if (!result.res.ok && result.res.status === 400) {
      result = await postChat(cfg, payload, signal);
    }
    // Modelo com saída máxima menor que MAX_OUTPUT_TOKENS também responde 400:
    // tenta sem max_tokens e deixa o servidor usar o limite padrão dele
    if (!result.res.ok && result.res.status === 400) {
      const { max_tokens: _omit, ...semLimite } = payload;
      result = await postChat(cfg, semLimite, signal);
    }
  } catch (err) {
    if (err.name === 'AbortError') throw new Error('Geração cancelada');
    if (err.message && !/fetch failed|terminated/i.test(err.message)) throw err;
    throw new Error(`Não foi possível conectar ao serviço de IA (${cfg.baseUrl}). Verifique a URL e se o servidor está no ar.`);
  }

  const { res, body } = result;
  if (!res.ok) {
    const msg = body && body.error && body.error.message
      ? body.error.message
      : `Erro ${res.status} no serviço de IA`;
    throw new Error(msg);
  }

  const choice = (body.choices && body.choices[0]) || {};
  const { answer, reasoning } = splitReasoning(choice.message || {});
  if (!answer && !reasoning) {
    throw new Error('Resposta vazia do serviço de IA');
  }
  // finish_reason=length indica resposta cortada por max_tokens — o JSON
  // provavelmente veio incompleto; o parser tentará recuperar os itens inteiros.
  return {
    answer,
    reasoning,
    truncated: choice.finish_reason === 'length',
    overthinking: choice.finish_reason === 'overthinking'
  };
}

async function testConnection(config) {
  const cfg = normalizeConfig(config);
  let res;
  try {
    res = await fetchWithTimeout(
      `${cfg.baseUrl}/models`,
      { headers: authHeaders(cfg.apiKey) },
      TEST_TIMEOUT_MS
    );
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error('Tempo esgotado ao conectar no serviço de IA');
    }
    throw new Error(`Não foi possível conectar em ${cfg.baseUrl}. O serviço está no ar?`);
  }

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`Serviço respondeu com erro ${res.status}`);
  }

  const models = Array.isArray(body.data) ? body.data.map(m => m.id) : [];
  return { models, modelAvailable: models.length === 0 || models.includes(cfg.model) };
}

function fixCommonJsonErrors(text) {
  return text
    // Aspas "inteligentes" que alguns modelos soltam
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    // Dentro de strings: quebras de linha e caracteres de controle LITERAIS
    // (modelo quebra a linha ou solta tab no meio de uma pista sem escapar)
    .replace(/"((?:[^"\\]|\\.)*)"/gs, (match) =>
      // eslint-disable-next-line no-control-regex
      match.replace(/\r?\n/g, '\\n').replace(/[\x00-\x1F\x7F]/g, (ch) =>
        ch === '\\' ? ch : ' '
      )
    )
    // Caracteres de controle fora de strings
    // eslint-disable-next-line no-control-regex
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, ' ')
    // Vírgula sobrando antes de ] ou }
    .replace(/,\s*([}\]])/g, '$1');
}

function extractJsonObjects(chunk) {
  // Extrai objetos {...} completos de um pedaço de texto (respeitando strings)
  const objects = [];
  let depth = 0;
  let start = -1;
  let inString = false;
  let escaped = false;

  for (let i = 0; i < chunk.length; i++) {
    const ch = chunk[i];
    if (escaped) { escaped = false; continue; }
    if (ch === '\\' && inString) { escaped = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;

    if (ch === '{') {
      if (depth === 0) start = i;
      depth++;
    } else if (ch === '}') {
      depth--;
      if (depth === 0 && start !== -1) {
        objects.push(chunk.slice(start, i + 1));
        start = -1;
      }
    }
  }
  return objects;
}

function preview(content, max = 220) {
  const clean = String(content).replace(/\s+/g, ' ').trim();
  return clean.length > max ? clean.slice(0, max) + '…' : clean;
}

function parseJsonArray(rawContent) {
  let text = String(rawContent)
    // Remove blocos de raciocínio de modelos tipo Qwen3/DeepSeek-R1
    .replace(/<think>[\s\S]*?<\/think>/gi, '')
    // Remove cercas de markdown com ou sem linguagem (```json, ```JSON, ```)
    .replace(/```[a-zA-Z]*\s*/g, '')
    .trim();

  // Raiz como ARRAY: extrai do primeiro [ ao último ]
  const start = text.indexOf('[');
  const end = text.lastIndexOf(']');
  if (start !== -1 && end > start) {
    try {
      const parsed = JSON.parse(fixCommonJsonErrors(text.slice(start, end + 1)));
      if (Array.isArray(parsed)) return parsed;
    } catch (err) {
      // cai para as recuperações abaixo
    }
  }

  // Raiz como OBJETO: {"palavras": [...]}, um único {...} etc.
  const objs = [];
  const objStart = text.indexOf('{');
  const objEnd = text.lastIndexOf('}');
  if (objStart !== -1 && objEnd > objStart) {
    try {
      const parsed = JSON.parse(fixCommonJsonErrors(text.slice(objStart, objEnd + 1)));
      if (parsed && typeof parsed === 'object') objs.push(parsed);
    } catch (err) { /* ignora */ }
  }
  for (const parsed of objs) {
    if (Array.isArray(parsed)) return parsed;
    for (const key of ['palavras', 'words', 'items', 'data', 'resultado', 'result']) {
      if (Array.isArray(parsed[key])) return parsed[key];
    }
    // Objeto único com as chaves esperadas
    if (parsed.palavra || parsed.palavra_secreta) return [parsed];
  }

  // Recuperação: JSON truncado (max_tokens) ou com erro em um item —
  // parseia objeto por objeto e descarta os quebrados.
  const chunk = start !== -1 ? text.slice(start) : text;
  const recovered = [];
  for (const objText of extractJsonObjects(chunk)) {
    try {
      const obj = JSON.parse(fixCommonJsonErrors(objText));
      if (obj && typeof obj === 'object' && !Array.isArray(obj)) recovered.push(obj);
    } catch (err) { /* objeto quebrado: descarta */ }
  }

  if (recovered.length > 0) return recovered;

  throw new Error(
    'A IA não retornou um JSON válido. Início da resposta recebida: "' +
    preview(rawContent) + '"'
  );
}

function pickField(item, keys) {
  // Aceita variações de chave que modelos locais costumam inventar
  for (const key of keys) {
    const value = item[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return null;
}

function sanitizeWords(items, expectedCount) {
  const seen = new Set();
  const result = [];

  for (const item of items) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) continue;
    const palavra = pickField(item, ['palavra', 'palavra_secreta', 'word', 'resposta']);
    const p1 = pickField(item, ['pista_1', 'pista1', 'dica_1', 'dica1']);
    const p2 = pickField(item, ['pista_2', 'pista2', 'dica_2', 'dica2']);
    const p3 = pickField(item, ['pista_3', 'pista3', 'dica_3', 'dica3']);
    if (!palavra || !p1 || !p2 || !p3) continue;

    const key = palavra.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    result.push({
      palavra_secreta: palavra.toUpperCase(),
      pista_1: p1,
      pista_2: p2,
      pista_3: p3
    });

    if (result.length >= expectedCount) break;
  }

  return result;
}

async function generateThemeWords(theme, count, config, { signal } = {}) {
  const cfg = normalizeConfig(config);
  const themeName = String(theme || '').trim();
  if (!themeName) {
    throw new Error('Informe um tema');
  }

  const requested = Math.min(Math.max(parseInt(count, 10) || 12, 5), 20);
  // Pede algumas a mais para compensar itens descartados na validação
  const askCount = requested + 3;

  const systemPrompt =
    'Você é um gerador de dados para um game show. Sua ÚNICA saída é um array JSON válido. ' +
    'REGRAS OBRIGATÓRIAS: ' +
    '1) Comece a resposta com o caractere [ e termine com ]. ' +
    '2) Não escreva NADA fora do array: sem introduções, sem explicações, sem comentários, sem cercas de markdown (```). ' +
    '3) Use aspas duplas em chaves e valores. ' +
    '4) Cada objeto tem EXATAMENTE estas 4 chaves: "palavra", "pista_1", "pista_2", "pista_3". ' +
    '5) Escape aspas duplas dentro dos textos com \\". ' +
    '6) Se o servidor exigir um objeto JSON na raiz, use a chave "palavras" contendo o array.';

  const userPrompt =
    `Tema: "${themeName}"\n` +
    `Gere ${askCount} palavras ou expressões em português do Brasil sobre esse tema, conhecidas do público geral e divertidas de adivinhar em família.\n` +
    'Para cada palavra, escreva 3 pistas PROGRESSIVAS: "pista_1" difícil/vaga, "pista_2" intermediária, "pista_3" fácil/quase entrega a resposta. ' +
    'Nenhuma pista pode conter a palavra secreta nem variações dela.\n' +
    'Exemplo do formato EXATO de CADA objeto (não copie o conteúdo):\n' +
    '{"palavra": "CAPIVARA", "pista_1": "É um roedor", "pista_2": "É o maior roedor do mundo", "pista_3": "Vive à beira de rios e virou meme no Brasil"}\n' +
    `Responda agora APENAS com o array JSON completo com ${askCount} objetos:`;

  const minWords = Math.min(5, requested);
  // Desliga o raciocínio: a tarefa é só preencher JSON e, em modelo local,
  // pensar antes multiplica o tempo (GLM a ~5 tokens/s levava 5+ minutos só
  // raciocinando). "/no_think" vale para Qwen3 em qualquer posição; o
  // template do GLM só desliga se a mensagem TERMINAR em "/nothink".
  // Os demais modelos ignoram.
  const { answer, reasoning, truncated, overthinking } = await chatCompletion(cfg, [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: `${userPrompt}\n/no_think /nothink` }
  ], { temperature: 0.7, signal });

  if (overthinking) {
    throw new Error(
      `Não foi possível montar a lista: o modelo passou de ~${Math.round(MAX_REASONING_CHARS / 4)} tokens ` +
      'só raciocinando sem começar a resposta, e a geração foi interrompida. ' +
      'Tente de novo, use um modelo sem raciocínio ou desligue o "thinking" no servidor de IA.'
    );
  }

  if (!answer) {
    // Veio só o raciocínio, sem resposta final. Alguns modelos escrevem o
    // JSON pronto dentro do próprio raciocínio — aproveita se der.
    const fromReasoning = tryExtractWords(reasoning, requested);
    if (fromReasoning.length >= minWords) return fromReasoning;

    const motivo = truncated
      ? `o modelo gastou todo o limite de ${MAX_OUTPUT_TOKENS} tokens só raciocinando e não chegou a responder`
      : 'o modelo devolveu só o raciocínio, sem a resposta final';
    throw new Error(
      `Não foi possível montar a lista: ${motivo}. ` +
      'Tente de novo, use um modelo sem raciocínio ou desligue o "thinking" no servidor de IA.'
    );
  }

  const items = parseJsonArray(answer);
  const words = sanitizeWords(items, requested);

  if (words.length < minWords) {
    const motivo = truncated
      ? 'a resposta foi cortada pelo limite de tokens do modelo'
      : `a IA gerou poucas palavras válidas (${words.length})`;
    throw new Error(
      `Não foi possível montar a lista: ${motivo}. ` +
      `Início da resposta recebida: "${preview(answer)}"`
    );
  }

  return words;
}

function tryExtractWords(text, expectedCount) {
  if (!text) return [];
  try {
    return sanitizeWords(parseJsonArray(text), expectedCount);
  } catch (err) {
    return [];
  }
}

module.exports = { testConnection, generateThemeWords, normalizeConfig };
