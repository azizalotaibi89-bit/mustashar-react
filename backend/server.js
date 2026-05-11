require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const Anthropic = require('@anthropic-ai/sdk');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || '';
const MODEL = 'claude-sonnet-4-20250514';
const MAX_CONTEXT_CHUNKS = 35;
const CHUNKS_FILE = path.join(__dirname, 'data', 'chunks.json');

// ============================================================
// Load chunks
// ============================================================
let CHUNKS = [];
try {
  CHUNKS = JSON.parse(fs.readFileSync(CHUNKS_FILE, 'utf-8'));
  console.log(`✅ Loaded ${CHUNKS.length} chunks`);
} catch (e) {
  console.warn(`⚠️  Could not load chunks: ${e.message}`);
}

// ============================================================
// Arabic normalization & BM25 search (enhanced)
// ============================================================
function normalizeArabic(text) {
  return text
    .replace(/[ؐ-ًؚ-ٰٟ]/g, '') // diacritics
    .replace(/[إأآا]/g, 'ا')                             // alef variants
    .replace(/ة/g, 'ه')                                  // taa marbuta
    .replace(/ى/g, 'ي')                                  // alef maksura
    .replace(/ـ/g, '');                             // tatweel
}

// Strip common Arabic prefixes so "الإيجار" and "إيجار" and "والإيجار" all match
function stripPrefixes(token) {
  if (token.length <= 3) return token;
  if (token.startsWith('ال')) return token.slice(2);
  if ('وفبلك'.includes(token[0])) {
    const rest = token.slice(1);
    if (rest.startsWith('ال') && rest.length > 2) return rest.slice(2);
    if (rest.length > 2) return rest;
  }
  return token;
}

function tokenize(text) {
  return (normalizeArabic(text).match(/[؀-ۿݐ-ݿ]+|\d+/g) || [])
    .map(t => stripPrefixes(t));
}

// ============================================================
// Law name tagging — assign each chunk its parent law
// ============================================================
function isLawHeader(section) {
  const first = section.split('\n')[0].trim();
  if (!/^قانون\s+\S/.test(first)) return false;
  // Filter noise fragments
  const noise = ['مادة', 'ومقتضى', 'اقترحه', 'والفهرس', 'رقم٢', 'انتخاب.-', '‹'];
  return !noise.some(n => first.includes(n));
}

function cleanLawName(section) {
  return section.split('\n')[0].trim();
}

// Also recognise non-قانون law headers (دستور، مرسوم، نظام، لائحة)
const SPECIAL_LAW_HEADERS = [
  'دستور دولة الكويت',
  'انشاء المحكمة الدستورية',
  'لائحة المحكمة الدستورية',
  'الالئحة الداخلية لمجلس الامة',
  'قانون انتخابات مجلس الامة',
  'نظام الخدمة المدنية',
];

const chunkLawNames = new Array(CHUNKS.length).fill('');

(function buildLawIndex() {
  let current = 'دستور دولة الكويت';
  for (let i = 0; i < CHUNKS.length; i++) {
    const s = CHUNKS[i].section || '';
    const firstLine = s.split('\n')[0].trim();
    if (isLawHeader(s)) {
      current = cleanLawName(s);
    } else if (SPECIAL_LAW_HEADERS.some(h => firstLine.includes(h.split(' ')[1] || h))) {
      // keep current for sub-chapters within same law
    }
    chunkLawNames[i] = current;
  }
  const uniqueLaws = [...new Set(chunkLawNames)];
  console.log(`📚 Tagged ${CHUNKS.length} chunks across ${uniqueLaws.length} laws`);
})();

// ============================================================
// Article number extraction
// ============================================================
const ARTICLE_RE = /مادة\s*(\d+)/g;

function extractArticleNumbers(text) {
  const nums = [];
  let m;
  ARTICLE_RE.lastIndex = 0;
  while ((m = ARTICLE_RE.exec(text)) !== null) nums.push(parseInt(m[1], 10));
  return nums;
}

// Pre-compute article sets per chunk
const chunkArticles = CHUNKS.map(c => new Set(extractArticleNumbers(c.text)));

// ============================================================
// Build BM25 index at startup
// ============================================================
console.log('🔍 Building search index...');
const docFreq = {};
const chunkTokenSets = [];
const chunkTokenArrays = [];
const chunkNormalized = [];

for (const chunk of CHUNKS) {
  const norm = normalizeArabic(chunk.text);
  chunkNormalized.push(norm);
  const tokens = tokenize(chunk.text);
  chunkTokenArrays.push(tokens);
  const tokenSet = new Set(tokens);
  chunkTokenSets.push(tokenSet);
  for (const t of tokenSet) {
    docFreq[t] = (docFreq[t] || 0) + 1;
  }
}

const N = CHUNKS.length;
const avgDl = chunkTokenArrays.reduce((s, t) => s + t.length, 0) / Math.max(N, 1);
console.log(`✅ Index ready (${Object.keys(docFreq).length} unique terms)`);

// ============================================================
// Query analysis — extract article numbers & law hints
// ============================================================
function analyzeQuery(query) {
  const normQ = normalizeArabic(query);

  // Extract article numbers from query
  const articleNums = [];
  let m;
  ARTICLE_RE.lastIndex = 0;
  while ((m = ARTICLE_RE.exec(normQ)) !== null) articleNums.push(parseInt(m[1], 10));
  // Also catch "المادة X" without space
  const bare = normQ.match(/(?:الماده|الماد|ماده)\s*(\d+)/g) || [];
  bare.forEach(b => {
    const n = parseInt(b.replace(/\D/g, ''), 10);
    if (!isNaN(n)) articleNums.push(n);
  });
  const articleSet = [...new Set(articleNums)];

  // Detect law name from query by matching against known law names
  const uniqueLaws = [...new Set(chunkLawNames)];
  const matchedLaw = uniqueLaws.find(law => {
    const normLaw = normalizeArabic(law);
    // Check if 2+ significant words from the law name appear in the query
    const words = normLaw.split(/\s+/).filter(w => w.length > 3);
    const matchCount = words.filter(w => normQ.includes(w)).length;
    return matchCount >= 2 || (words.length === 1 && normQ.includes(normLaw));
  });

  return { articleSet, matchedLaw };
}

// ============================================================
// Search
// ============================================================
function searchChunks(query, topK = MAX_CONTEXT_CHUNKS) {
  const { articleSet, matchedLaw } = analyzeQuery(query);
  const queryNorm = normalizeArabic(query);
  const queryTokens = [...new Set(tokenize(query))];
  if (!queryTokens.length) return CHUNKS.slice(0, topK);

  const k1 = 1.5, b = 0.75;
  const scores = [];

  for (let i = 0; i < CHUNKS.length; i++) {
    let score = 0;
    const dl = chunkTokenArrays[i].length;

    // ---- BM25 ----
    for (const token of queryTokens) {
      if (!chunkTokenSets[i].has(token)) {
        if (token.length > 2 && chunkNormalized[i].includes(token)) score += 0.8;
        continue;
      }
      const tf = chunkTokenArrays[i].filter(t => t === token).length;
      const df = docFreq[token] || 1;
      const idf = Math.log((N - df + 0.5) / (df + 0.5) + 1);
      const tfNorm = (tf * (k1 + 1)) / (tf + k1 * (1 - b + b * dl / Math.max(avgDl, 1)));
      score += idf * tfNorm;
    }

    // Exact normalized query phrase boost
    if (queryNorm.length > 4 && chunkNormalized[i].includes(queryNorm)) score *= 3.0;

    // Trigram boost
    if (queryTokens.length >= 3) {
      for (let j = 0; j <= queryTokens.length - 3; j++) {
        const trigram = queryTokens.slice(j, j + 3).join(' ');
        if (chunkNormalized[i].includes(trigram)) score *= 1.5;
      }
    }

    // Bigram boost
    if (queryTokens.length >= 2) {
      for (let j = 0; j <= queryTokens.length - 2; j++) {
        const bigram = queryTokens.slice(j, j + 2).join(' ');
        if (chunkNormalized[i].includes(bigram)) score *= 1.2;
      }
    }

    // Section title boost
    const chunk = CHUNKS[i];
    if (chunk.section) {
      const sectionTokens = new Set(tokenize(chunk.section));
      for (const token of queryTokens) {
        if (sectionTokens.has(token)) score *= 1.4;
      }
    }

    // ---- Article number boost (strong) ----
    if (articleSet.length > 0) {
      const hasArticle = articleSet.some(n => chunkArticles[i].has(n));
      if (hasArticle) score = Math.max(score, 1) * 5.0;
    }

    // ---- Law name scope boost ----
    if (matchedLaw) {
      const normMatchedLaw = normalizeArabic(matchedLaw);
      const normChunkLaw = normalizeArabic(chunkLawNames[i]);
      if (normChunkLaw === normMatchedLaw) score = Math.max(score, 1) * 4.0;
    }

    if (score > 0) scores.push([score, i]);
  }

  scores.sort((a, b_) => b_[0] - a[0]);

  // Include neighboring chunks for context continuity
  const topIndices = new Set(scores.slice(0, topK).map(([, i]) => i));
  const neighborEntries = [];

  for (const [score, idx] of scores.slice(0, Math.min(15, scores.length))) {
    for (const neighbor of [idx - 1, idx + 1]) {
      if (neighbor >= 0 && neighbor < N && !topIndices.has(neighbor)) {
        topIndices.add(neighbor);
        neighborEntries.push([score * 0.3, neighbor]);
      }
    }
  }

  const all = [...scores.slice(0, topK), ...neighborEntries];
  all.sort((a, b_) => b_[0] - a[0]);

  const results = [];
  const seen = new Set();
  for (const [score, idx] of all) {
    if (seen.has(idx) || results.length >= topK) continue;
    seen.add(idx);
    results.push({ ...CHUNKS[idx], law_name: chunkLawNames[idx], score });
  }
  return results;
}

// ============================================================
// Routes
// ============================================================
app.get('/api/status', (req, res) => {
  res.json({ has_server_key: Boolean(ANTHROPIC_API_KEY) });
});

app.post('/api/chat', async (req, res) => {
  const { message, history = [], api_key } = req.body;
  if (!message?.trim()) return res.status(400).json({ error: 'الرجاء إدخال سؤال' });

  const key = api_key || ANTHROPIC_API_KEY;
  if (!key) return res.status(400).json({ error: 'الرجاء إدخال مفتاح API' });

  const relevantChunks = searchChunks(message);

  // Build context with law name header
  const context = relevantChunks.map(c => {
    const lawLabel = c.law_name || 'نص قانوني';
    const sectionLabel = c.section ? c.section.replace(/\n/g, ' | ') : '';
    const header = sectionLabel ? `${lawLabel} — ${sectionLabel}` : lawLabel;
    return `--- ${header} ---\n${c.text}`;
  }).join('\n\n');

  const systemPrompt = `أنت "مستشار الدولة" — محامي خبير متخصص في التشريعات والقوانين الكويتية. أنت لست مجرد أداة بحث، بل مستشار قانوني حقيقي يقدم تحليلاً ورأياً قانونياً.

## مهمتك:
- الإجابة على الأسئلة القانونية بناءً على النصوص التشريعية المتاحة لك
- الرد بأسلوب بشري واضح ومفهوم، كأنك محامي خبير يشرح للعميل
- ذكر رقم المادة والقانون المرتبط عند الإجابة
- إذا لم تجد إجابة في النصوص المتاحة، قل ذلك بوضوح
- تقديم رأيك وتحليلك القانوني في كل إجابة

## قواعد الرد:
1. ابدأ بالإجابة المباشرة على السؤال
2. اذكر النص القانوني ذا الصلة (رقم المادة والقانون)
3. اشرح المادة بلغة بسيطة ومفهومة
4. إذا كان هناك تعديلات أو استثناءات، اذكرها
5. قدّم رأيك القانوني وتحليلك للموضوع

## كيفية استخراج المراجع القانونية الصحيحة:
- رقم المادة: ابحث في نص الفقرة عن كلمة "مادة" أو "المادة" متبوعة برقم (مثال: مادة 5، المادة 122)
- اسم القانون: هو الجزء الأول من ترويسة كل قسم قبل علامة "—"
  مثال: إذا كان الترويسة "قانون العمل في القطاع الأهلي — الباب الثالث"، فاسم القانون هو "قانون العمل في القطاع الأهلي"
- الصيغة الصحيحة للمرجع: "المادة X من قانون Y"
- لا تستخدم أبداً أرقام الصفحات كمرجع

## ممنوع تماماً:
- لا تضف أي تنبيه أو تحذير في نهاية الإجابة
- لا تقل "هذا للاسترشاد فقط" أو "استشر محامي" أو أي عبارة مشابهة
- لا تقل "أنا مجرد مساعد" أو "أنا لست محامي"
- لا تضف أي إخلاء مسؤولية من أي نوع
- لا تذكر أرقام الصفحات (صفحة X) كمرجع
- أجب بثقة كاملة كأنك محامي خبير يقدم استشارة حقيقية

## أسلوب الرد:
- تحدث بالعربية الفصحى البسيطة
- كن ودوداً ومهنياً وواثقاً
- أعطِ رأيك بجرأة ووضوح

## معلومة:
هذه النصوص التشريعية محدثة حتى 4/11/2025 من إعداد المستشار جزاء العتيبي - وكيل محكمة الاستئناف.`;

  const messages = [
    ...history.slice(-12).map(m => ({ role: m.role, content: m.content })),
    {
      role: 'user',
      content: `السؤال: ${message}\n\n--- النصوص القانونية ذات الصلة ---\n${context}\n--- نهاية النصوص ---\n\nأجب على السؤال بناءً على النصوص القانونية أعلاه وقدّم رأيك وتحليلك القانوني. لا تضف أي تنبيه أو إخلاء مسؤولية.`
    }
  ];

  // SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  try {
    const client = new Anthropic({ apiKey: key });
    const stream = await client.messages.stream({
      model: MODEL,
      max_tokens: 4096,
      system: systemPrompt,
      messages
    });

    for await (const chunk of stream) {
      if (chunk.type === 'content_block_delta' && chunk.delta?.type === 'text_delta') {
        res.write(`data: ${JSON.stringify({ text: chunk.delta.text })}\n\n`);
      }
    }
  } catch (err) {
    const msg =
      err?.status === 401 ? 'مفتاح API غير صحيح' :
      err?.status === 429 ? 'تم تجاوز حد الاستخدام. حاول لاحقاً' :
      `حدث خطأ: ${err.message}`;
    res.write(`data: ${JSON.stringify({ error: msg })}\n\n`);
  }

  res.write('data: [DONE]\n\n');
  res.end();
});

// Serve React frontend build in production
const distPath = path.join(__dirname, 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
