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
const MAX_CONTEXT_CHUNKS = 25;
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
// Arabic normalization & BM25 search
// ============================================================
function normalizeArabic(text) {
  return text
    .replace(/[\u0610-\u061A\u064B-\u065F\u0670]/g, '') // diacritics
    .replace(/[إأآا]/g, 'ا')                             // alef variants
    .replace(/ة/g, 'ه')                                  // taa marbuta
    .replace(/ى/g, 'ي')                                  // alef maksura
    .replace(/\u0640/g, '');                             // tatweel
}

function tokenize(text) {
  return normalizeArabic(text).match(/[\u0600-\u06FF\u0750-\u077F]+|\d+/g) || [];
}

// Build index at startup
console.log('🔍 Building search index...');
const docFreq = {};
const chunkTokenSets = [];
const chunkNormalized = [];

for (const chunk of CHUNKS) {
  const norm = normalizeArabic(chunk.text);
  chunkNormalized.push(norm);
  const tokens = new Set(tokenize(chunk.text));
  chunkTokenSets.push(tokens);
  for (const t of tokens) {
    docFreq[t] = (docFreq[t] || 0) + 1;
  }
}

const N = CHUNKS.length;
const avgDl = chunkTokenSets.reduce((s, t) => s + t.size, 0) / Math.max(N, 1);
console.log(`✅ Index ready (${Object.keys(docFreq).length} unique terms)`);

function searchChunks(query, topK = MAX_CONTEXT_CHUNKS) {
  const queryNorm = normalizeArabic(query);
  const queryTokens = tokenize(query);
  if (!queryTokens.length) return CHUNKS.slice(0, topK);

  const k1 = 1.5, b = 0.75;
  const scores = [];

  for (let i = 0; i < CHUNKS.length; i++) {
    let score = 0;
    const dl = chunkTokenSets[i].size;

    for (const token of queryTokens) {
      if (!chunkTokenSets[i].has(token)) {
        if (token.length > 2 && chunkNormalized[i].includes(token)) score += 0.5;
        continue;
      }
      const tf = (chunkNormalized[i].match(new RegExp(token, 'g')) || []).length;
      const df = docFreq[token] || 1;
      const idf = Math.log((N - df + 0.5) / (df + 0.5) + 1);
      const tfNorm = (tf * (k1 + 1)) / (tf + k1 * (1 - b + b * dl / Math.max(avgDl, 1)));
      score += idf * tfNorm;
    }

    if (chunkNormalized[i].includes(queryNorm)) score *= 3.0;

    if (queryTokens.length >= 3) {
      for (let j = 0; j <= queryTokens.length - 3; j++) {
        const trigram = queryTokens.slice(j, j + 3).join(' ');
        if (chunkNormalized[i].includes(trigram)) score *= 1.5;
      }
    }

    const chunk = CHUNKS[i];
    if (chunk.section) {
      const sectionNorm = normalizeArabic(chunk.section);
      for (const token of queryTokens) {
        if (sectionNorm.includes(token)) score *= 1.3;
      }
    }

    if (score > 0) scores.push([score, i]);
  }

  scores.sort((a, b) => b[0] - a[0]);

  const topIndices = new Set(scores.slice(0, topK).map(([, i]) => i));
  const neighborEntries = [];

  for (const [score, idx] of scores.slice(0, Math.min(10, scores.length))) {
    for (const neighbor of [idx - 1, idx + 1]) {
      if (neighbor >= 0 && neighbor < N && !topIndices.has(neighbor)) {
        topIndices.add(neighbor);
        neighborEntries.push([score * 0.3, neighbor]);
      }
    }
  }

  const all = [...scores.slice(0, topK), ...neighborEntries];
  all.sort((a, b) => b[0] - a[0]);

  const results = [];
  const seen = new Set();
  for (const [score, idx] of all) {
    if (seen.has(idx) || results.length >= topK) continue;
    seen.add(idx);
    results.push({ ...CHUNKS[idx], score });
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
  const context = relevantChunks
    .map(c => `--- صفحة ${c.page}${c.section ? ` [${c.section}]` : ''} ---\n${c.text}`)
    .join('\n\n');

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

## ممنوع تماماً:
- لا تضف أي تنبيه أو تحذير في نهاية الإجابة
- لا تقل "هذا للاسترشاد فقط" أو "استشر محامي" أو أي عبارة مشابهة
- لا تقل "أنا مجرد مساعد" أو "أنا لست محامي"
- لا تضف أي إخلاء مسؤولية من أي نوع
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
