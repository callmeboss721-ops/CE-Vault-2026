import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  loadAutoConfig,
  saveRuntimeSettings,
  publicConfig,
  maskSecret,
  fetchMarketRate,
  verifyTelegramBot,
  detectTelegramChats,
  sendTelegramDetailed,
  sendTelegram,
  pinTelegramMessage,
} from './autoconfig.mjs';
import {
  parseSmartPinText,
  formatSmartPinCard,
  formatCeTransactionCard,
  formatThaiSlipDateTime,
} from './smartPin.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = process.env.CE_DATA_DIR || path.join(__dirname, '..', 'data');
const STATE_FILE = path.join(DATA_DIR, 'vault-state.json');
// API_PORT for dev (behind Vite proxy); PORT for single-process production (serves web + API).
const PORT = Number(process.env.API_PORT || process.env.PORT || 3001);
const STATIC_DIR = path.join(__dirname, '..', '..', 'ce-vault', 'dist', 'public');
const SERVE_STATIC = process.env.CE_SERVE_STATIC === '1' && fs.existsSync(STATIC_DIR);
const CFG = loadAutoConfig(DATA_DIR);
const market = { rate: null, source: null, updatedAt: null };

const DEFAULT_STATE = {
  cycle: 'CE44',
  limitThb: 500000,
  rate: 43.0,
  marketRate: 42.65,
  pinnedBank: {
    code: 'BBL',
    name: 'ธนาคารกรุงเทพ (BBL)',
    account: '097-0-28xxx-x',
    holder: 'บจก. ซีอี เอ็มไพร์ โฮลดิ้ง',
    updatedAt: '14:00 น.',
  },
  banks: [
    { code: 'BBL', name: 'ธนาคารกรุงเทพ (BBL)', account: '097-0-28xxx-x', holder: 'บจก. ซีอี เอ็มไพร์ โฮลดิ้ง' },
    { code: 'KBank', name: 'กสิกรไทย (KBank)', account: 'xxx-3855-x', holder: 'นาย สมชาย ใจดี' },
    { code: 'SCB', name: 'ไทยพาณิชย์ (SCB)', account: '412-0-91xxx-x', holder: 'บจก. ซีอี เอ็มไพร์ โฮลดิ้ง' },
    { code: 'KTB', name: 'กรุงไทย (KTB)', account: 'xxx-x-x7413-x', holder: 'บัญชีสำรอง KTB Desk' },
    { code: 'TTB', name: 'ทหารไทยธนชาต (TTB)', account: 'xxx-x7413', holder: 'บจก. ซีอี เอ็มไพร์ โฮลดิ้ง' },
  ],
  transactions: [
    {
      id: '#CE-2026-A045',
      thb: 10000,
      usdtExpected: 232.56,
      usdtSent: 0,
      rate: 43.0,
      bank: 'BBL',
      account: '097-0-28xxx-x',
      sender: 'นาย สมชาย ใจดี',
      time: '14:48',
      status: 'READY',
      confidence: 98.7,
      fingerprint: 'FP-A045-10000-BBL',
      settlements: [],
      notes: 'OCR ✓, Bank Match ✓, Limit ✓',
    },
    {
      id: '#CE-2026-A044',
      thb: 10000,
      usdtExpected: 232.56,
      usdtSent: 114.0,
      rate: 43.0,
      bank: 'BBL',
      account: '097-0-28xxx-x',
      sender: 'น.ส. กานดา สุขใจ',
      time: '14:42',
      status: 'PENDING',
      confidence: 99.1,
      fingerprint: 'FP-A044-10000-BBL',
      settlements: [{ id: 'SE-001', usdt: 114.0, time: '14:44' }],
      notes: 'รอส่ง USDT ส่วนที่เหลือ 118.56 USDT',
    },
    {
      id: '#CE-2026-A043',
      thb: 10000,
      usdtExpected: 232.56,
      usdtSent: 230.0,
      rate: 43.0,
      bank: 'BBL',
      account: '097-0-28xxx-x',
      sender: 'นาย วิทยา วัฒนา',
      time: '14:38',
      status: 'SHORT',
      confidence: 97.4,
      fingerprint: 'FP-A043-10000-BBL',
      settlements: [{ id: 'SE-001', usdt: 230.0, time: '14:40' }],
      notes: 'ส่งขาด ▼ 2.56 USDT — รอส่งเพิ่ม',
    },
    {
      id: '#CE-2026-A042',
      thb: 15000,
      usdtExpected: 348.84,
      usdtSent: 0,
      rate: 43.0,
      bank: 'KTB',
      account: 'xxx-x-x7413-x',
      sender: 'นาย ประเสริฐ มั่งมี',
      time: '14:36',
      status: 'MISMATCH',
      confidence: 96.2,
      fingerprint: 'FP-A042-15000-KTB',
      settlements: [],
      notes: 'บัญชีในสลิป KTB ≠ บัญชี PIN วันนี้ BBL',
    },
    {
      id: '#CE-2026-A041',
      thb: 10000,
      usdtExpected: 232.56,
      usdtSent: 232.56,
      rate: 43.0,
      bank: 'BBL',
      account: '097-0-28xxx-x',
      sender: 'นาย สมชาย ใจดี',
      time: '14:35',
      status: 'SETTLED',
      confidence: 98.7,
      fingerprint: 'FP-A041-10000-BBL',
      settlements: [{ id: 'SE-001', usdt: 232.56, time: '14:35' }],
      notes: 'Settlement สำเร็จครบจำนวน',
    },
    {
      id: '#CE-2026-A040',
      thb: 8500,
      usdtExpected: 197.67,
      usdtSent: 0,
      rate: 43.0,
      bank: 'BBL',
      account: '097-0-28xxx-x',
      sender: 'นาย สม...ย ใจดี',
      time: '14:29',
      status: 'REVIEW',
      confidence: 72.0,
      fingerprint: 'FP-A040-8500-BBL',
      settlements: [],
      notes: 'OCR ความแม่นยำต่ำ (72%) — ต้องตรวจสอบก่อนยืนยัน',
    },
    {
      id: '#CE-2026-A039',
      thb: 120000,
      usdtExpected: 2790.7,
      usdtSent: 2790.7,
      rate: 43.0,
      bank: 'BBL',
      account: '097-0-28xxx-x',
      sender: 'บจก. อัลฟ่า เทรดดิ้ง',
      time: '14:15',
      status: 'SETTLED',
      confidence: 99.5,
      fingerprint: 'FP-A039-120000-BBL',
      settlements: [{ id: 'SE-001', usdt: 2790.7, time: '14:18' }],
      notes: 'Settlement สำเร็จ',
    },
    {
      id: '#CE-2026-A038',
      thb: 167450,
      usdtExpected: 3894.19,
      usdtSent: 3894.19,
      rate: 43.0,
      bank: 'BBL',
      account: '097-0-28xxx-x',
      sender: 'นาย ธนากร ศรีสวัสดิ์',
      time: '13:52',
      status: 'SETTLED',
      confidence: 99.2,
      fingerprint: 'FP-A038-167450-BBL',
      settlements: [{ id: 'SE-001', usdt: 3894.19, time: '13:55' }],
      notes: 'Settlement สำเร็จ',
    },
  ],
  cycleHistory: [
    { cycle: 'CE43', closedAt: '12 ก.ย. 69 · 23:55', receivedThb: 482000, sentUsdt: 11209.3, profitThb: 9120.5, settledCount: 38 },
  ],
};

function loadState() {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    if (!fs.existsSync(STATE_FILE)) {
      fs.writeFileSync(STATE_FILE, JSON.stringify(DEFAULT_STATE, null, 2));
      return structuredClone(DEFAULT_STATE);
    }
    return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
  } catch {
    return structuredClone(DEFAULT_STATE);
  }
}

function saveState(state) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

function computeSummary(state) {
  const activeStatuses = new Set(['READY', 'PENDING', 'SETTLED', 'SHORT']);
  let usedThb = 0;
  let receivedThb = 0;
  let sentUsdt = 0;
  let pendingUsdt = 0;
  let shortUsdt = 0;

  const counts = {
    SETTLED: 0,
    READY: 0,
    PENDING: 0,
    SHORT: 0,
    MISMATCH: 0,
    REVIEW: 0,
    OCR: 0,
    DUPLICATE: 0,
    REJECTED: 0,
    REVERSED: 0,
  };

  for (const tx of state.transactions) {
    counts[tx.status] = (counts[tx.status] || 0) + 1;
    if (activeStatuses.has(tx.status)) {
      usedThb += Number(tx.thb || 0);
      receivedThb += Number(tx.thb || 0);
    }
    sentUsdt += Number(tx.usdtSent || 0);
    if (tx.status === 'PENDING' || tx.status === 'READY') {
      pendingUsdt += Math.max(0, Number(tx.usdtExpected || 0) - Number(tx.usdtSent || 0));
    }
    if (tx.status === 'SHORT') {
      shortUsdt += Math.max(0, Number(tx.usdtExpected || 0) - Number(tx.usdtSent || 0));
    }
  }

  const remainingThb = Math.max(0, state.limitThb - usedThb);
  const spreadPerUsdt = Math.max(0.15, Number(state.rate) - Number(state.marketRate || state.rate - 0.35));
  const profitThb = Number((sentUsdt * spreadPerUsdt).toFixed(2));
  const usedPercent = Math.min(100, Number(((usedThb / state.limitThb) * 100).toFixed(1)));

  return {
    cycle: state.cycle,
    limitThb: state.limitThb,
    usedThb,
    remainingThb,
    usedPercent,
    receivedThb,
    sentUsdt: Number(sentUsdt.toFixed(2)),
    pendingUsdt: Number(pendingUsdt.toFixed(2)),
    negativeUsdt: Number((-shortUsdt).toFixed(2)),
    shortUsdt: Number(shortUsdt.toFixed(2)),
    profitThb,
    rate: state.rate,
    marketRate: state.marketRate,
    pinnedBank: state.pinnedBank,
    counts,
  };
}

function nowHHMM() {
  const d = new Date();
  return d.toTimeString().slice(0, 5);
}

function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
    });
    req.on('end', () => {
      if (!body) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

function sendJson(res, status, payload) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-key',
  });
  res.end(JSON.stringify(payload));
}

let state = loadState();

// Rebase demo seed to the live market rate once, so numbers are realistic out of the box.
function rebaseSeed(rate) {
  state.rate = rate;
  for (const tx of state.transactions) {
    const oldExpected = tx.usdtExpected || 1;
    const ratio = tx.usdtSent / oldExpected;
    tx.rate = rate;
    tx.usdtExpected = Number((tx.thb / rate).toFixed(2));
    if (tx.status === 'SETTLED') tx.usdtSent = tx.usdtExpected;
    else if (tx.status === 'SHORT') tx.usdtSent = Number(Math.max(0, tx.usdtExpected - 2.56).toFixed(2));
    else tx.usdtSent = Number((tx.usdtExpected * ratio).toFixed(2));
    for (const se of tx.settlements || []) se.usdt = tx.usdtSent / Math.max(1, tx.settlements.length);
  }
  if (state.transactions.find((t) => t.status === 'SHORT')) {
    const s = state.transactions.find((t) => t.status === 'SHORT');
    s.notes = `ส่งขาด ▼ ${(s.usdtExpected - s.usdtSent).toFixed(2)} USDT — รอส่งเพิ่ม`;
  }
}

async function refreshMarket() {
  const m = await fetchMarketRate();
  if (!m) return;
  market.rate = m.rate;
  market.source = m.source;
  market.updatedAt = new Date().toISOString();
  state.marketRate = m.rate;
  const autoDesk = Number((m.rate + CFG.rateSpread).toFixed(2));
  if (!state.autoRateSeeded) {
    rebaseSeed(autoDesk);
    state.autoRateSeeded = true;
    state.rateMode = 'auto';
  } else if (state.rateMode === 'auto') {
    state.rate = autoDesk;
  }
  saveState(state);
}
refreshMarket();
setInterval(refreshMarket, CFG.rateRefreshMs).unref();

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon', '.json': 'application/json' };
function serveStatic(pathname, res) {
  let file = path.normalize(path.join(STATIC_DIR, pathname));
  if (!file.startsWith(STATIC_DIR) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    file = path.join(STATIC_DIR, 'index.html');
  }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    return sendJson(res, 200, { ok: true });
  }

  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
  const pathname = url.pathname;

  if (SERVE_STATIC && !pathname.startsWith('/api/')) {
    return serveStatic(pathname, res);
  }

  try {
    // Health endpoints
    if (req.method === 'GET' && (pathname === '/api/healthz' || pathname === '/api/health')) {
      const summary = computeSummary(state);
      return sendJson(res, 200, {
        status: 'ok',
        service: 'ce-vault-api-server',
        cycle: state.cycle,
        rate: state.rate,
        rateMode: state.rateMode || 'manual',
        marketRate: market.rate,
        pinnedBank: state.pinnedBank.code,
        txCount: state.transactions.length,
        usedPercent: summary.usedPercent,
        timestamp: new Date().toISOString(),
      });
    }

    // Auto-configuration status (never exposes secret values)
    if (req.method === 'GET' && pathname === '/api/config') {
      return sendJson(res, 200, { ok: true, ...publicConfig(CFG), rateMode: state.rateMode || 'manual' });
    }

    // Full Settings API (API + Telegram Bot + Delivery Log)
    if (req.method === 'GET' && pathname === '/api/settings') {
      return sendJson(res, 200, {
        ok: true,
        engineMode: 'backend-api-server',
        rateSpread: CFG.rateSpread,
        rateMode: state.rateMode || 'manual',
        telegram: {
          enabled: CFG.integrations.telegram.enabled,
          hasToken: Boolean(CFG.integrations.telegram.token),
          maskedToken: maskSecret(CFG.integrations.telegram.token),
          chatId: CFG.integrations.telegram.chatId,
          botInfo: CFG.botInfo,
          notifyEvents: CFG.notifyEvents,
          deliveryLog: CFG.deliveryLog || [],
        },
        integrations: publicConfig(CFG).integrations,
      });
    }

    if (req.method === 'POST' && pathname === '/api/settings') {
      const body = await parseJsonBody(req);
      const updates = {};
      if (typeof body.botToken === 'string' && !body.botToken.includes('••••')) {
        updates.botToken = body.botToken.trim();
        if (!updates.botToken) updates.botInfo = null;
      }
      if (body.clearToken === true) {
        updates.botToken = '';
        updates.botInfo = null;
      }
      if (typeof body.chatId === 'string') {
        updates.chatId = body.chatId.trim();
      }
      if (body.notifyEvents && typeof body.notifyEvents === 'object') {
        updates.notifyEvents = body.notifyEvents;
      }
      if (body.rateSpread !== undefined && !isNaN(Number(body.rateSpread))) {
        updates.rateSpread = Number(body.rateSpread);
      }

      if (updates.botToken) {
        const verified = await verifyTelegramBot(updates.botToken);
        if (verified.ok) {
          updates.botInfo = verified.bot;
        }
      }

      saveRuntimeSettings(CFG, updates);
      if (state.rateMode === 'auto' && market.rate) {
        state.rate = Number((market.rate + CFG.rateSpread).toFixed(2));
        saveState(state);
      }

      return sendJson(res, 200, {
        ok: true,
        rateSpread: CFG.rateSpread,
        telegram: {
          enabled: CFG.integrations.telegram.enabled,
          hasToken: Boolean(CFG.integrations.telegram.token),
          maskedToken: maskSecret(CFG.integrations.telegram.token),
          chatId: CFG.integrations.telegram.chatId,
          botInfo: CFG.botInfo,
          notifyEvents: CFG.notifyEvents,
          deliveryLog: CFG.deliveryLog || [],
        },
      });
    }

    // Verify Telegram Bot Token via real getMe call
    if (req.method === 'POST' && pathname === '/api/telegram/verify') {
      const body = await parseJsonBody(req);
      const tokenToTest =
        typeof body.botToken === 'string' && body.botToken.trim() && !body.botToken.includes('••••')
          ? body.botToken.trim()
          : CFG.integrations.telegram.token;
      const result = await verifyTelegramBot(tokenToTest);
      if (result.ok && tokenToTest === CFG.integrations.telegram.token) {
        saveRuntimeSettings(CFG, { botInfo: result.bot });
      }
      return sendJson(res, result.ok ? 200 : 400, result);
    }

    // Auto-detect recent Telegram chats/groups via getUpdates
    if (req.method === 'POST' && pathname === '/api/telegram/detect-chats') {
      const body = await parseJsonBody(req);
      const tokenToUse =
        typeof body.botToken === 'string' && body.botToken.trim() && !body.botToken.includes('••••')
          ? body.botToken.trim()
          : CFG.integrations.telegram.token;
      const result = await detectTelegramChats(tokenToUse);
      return sendJson(res, result.ok ? 200 : 400, result);
    }

    // Send a REAL live test or custom message to Telegram
    if (req.method === 'POST' && pathname === '/api/telegram/test') {
      const body = await parseJsonBody(req);
      const overrideToken =
        typeof body.botToken === 'string' && body.botToken.trim() && !body.botToken.includes('••••')
          ? body.botToken.trim()
          : undefined;
      const overrideChatId = typeof body.chatId === 'string' && body.chatId.trim() ? body.chatId.trim() : undefined;
      const summary = computeSummary(state);
      const text =
        typeof body.text === 'string' && body.text.trim()
          ? body.text.trim()
          : `◈ CE VAULT · LIVE BOT TEST ✓\n(ทดสอบการเชื่อมต่อ Telegram สำเร็จ)\n━━━━━━━━━━━━━━\n🏠 รอบงาน (Cycle): ${state.cycle}\n📌 บัญชีหลัก (PIN): ${state.pinnedBank.code} · ${state.pinnedBank.account}\n💱 เรทโต๊ะ (Desk Rate): ${state.rate.toFixed(2)} THB/USDT\n📈 เรทตลาด (Market): ${market.rate ? market.rate.toFixed(2) : state.marketRate.toFixed(2)} THB (${market.source || 'Auto'})\n📊 ยอดรับสะสม (Received): ฿${summary.receivedThb.toLocaleString()}\n⏱️ เวลา (Time): ${nowHHMM()} น.`;

      const result = await sendTelegramDetailed(CFG, text, {
        event: body.event || 'live-test',
        overrideToken,
        overrideChatId,
      });
      return sendJson(res, result.ok ? 200 : 400, {
        ...result,
        deliveryLog: CFG.deliveryLog || [],
      });
    }

    // Live market rate
    if (req.method === 'GET' && pathname === '/api/market') {
      if (url.searchParams.get('refresh') === '1') await refreshMarket();
      return sendJson(res, 200, { ok: true, ...market, deskRate: state.rate, rateMode: state.rateMode || 'manual', spread: CFG.rateSpread });
    }

    // Main vault state endpoint
    if (req.method === 'GET' && (pathname === '/api/dashboard/vault' || pathname === '/api/vault')) {
      return sendJson(res, 200, {
        ok: true,
        summary: computeSummary(state),
        transactions: state.transactions,
        banks: state.banks,
        cycleHistory: state.cycleHistory,
      });
    }

    // Scan / Intake new slip
    if (req.method === 'POST' && pathname === '/api/transactions/scan') {
      const body = await parseJsonBody(req);
      const thb = Number(body.thb || 10000);
      const bank = String(body.bank || state.pinnedBank.code);
      const bankMatchesPin = bank.toUpperCase() === String(state.pinnedBank.code).toUpperCase();
      const account = String(body.account || (bankMatchesPin ? state.pinnedBank.account : 'xxx-x-x7413-x'));
      const sender = String(body.sender || 'นาย สมชาย ใจดี');
      const confidence = Number(body.confidence ?? 98.7);
      const forceDuplicate = Boolean(body.forceDuplicate);
      const slipDate = String(body.slipDate || formatThaiSlipDateTime()).trim();
      const todayThaiDate = formatThaiSlipDateTime().split(' ')[0];
      const slipDatePart = slipDate.split(' ')[0];
      const dateMismatch = Boolean(body.dateMismatch) || (Boolean(slipDatePart) && slipDatePart !== todayThaiDate);

      const summary = computeSummary(state);
      const usdtExpected = Number((thb / state.rate).toFixed(2));
      const fingerprint = body.fingerprint || `FP-${thb}-${bank}-${sender}-${slipDate}`;

      // Check duplicate
      const existing = state.transactions.find((t) => t.fingerprint === fingerprint);
      if (forceDuplicate || existing) {
        const dupRef = existing || state.transactions[0];
        return sendJson(res, 200, {
          ok: true,
          duplicate: true,
          originalTx: dupRef,
          summary: computeSummary(state),
          transactions: state.transactions,
        });
      }

      let status = 'READY';
      let notes = 'OCR ✓, Bank Match ✓, Limit ✓';

      if (confidence < 60) {
        return sendJson(res, 422, {
          ok: false,
          error: 'ocr_failed',
          message: 'อ่านสลิปไม่สำเร็จ ความแม่นยำต่ำกว่า 60% (OCR Confidence < 60%)',
        });
      } else if (dateMismatch) {
        status = 'REVIEW';
        notes = `วันที่สลิปไม่ตรง (${slipDate}) — เวลาไม่ตรงกับปัจจุบัน (Slip Date Mismatch)`;
      } else if (confidence < 80) {
        status = 'REVIEW';
        notes = `ความแม่นยำ OCR ต่ำ (${confidence}% · Low Confidence) — รอตรวจสอบ (Review Required)`;
      } else if (!bankMatchesPin) {
        status = 'MISMATCH';
        notes = `บัญชีในสลิป (Slip) ${bank} (${account}) ≠ บัญชี PIN วันนี้ (${state.pinnedBank.code} · ${state.pinnedBank.account})`;
      } else if (summary.usedThb + thb > state.limitThb) {
        status = 'REVIEW';
        notes = `วงเงินเกินกำหนด (Limit Exceeded +฿${(summary.usedThb + thb - state.limitThb).toLocaleString()})`;
      }

      const nextNum = 46 + state.transactions.length;
      const newTx = {
        id: `#CE-2026-A0${nextNum}`,
        thb,
        usdtExpected,
        usdtSent: 0,
        rate: state.rate,
        bank,
        account,
        sender,
        time: nowHHMM(),
        slipDate,
        dateMismatch,
        status,
        confidence,
        fingerprint,
        settlements: [],
        notes,
      };

      state.transactions.unshift(newTx);
      saveState(state);
      const shouldNotify =
        status === 'MISMATCH' || dateMismatch ? CFG.notifyEvents.onMismatch : CFG.notifyEvents.onScan;
      if (shouldNotify) {
        const cardText = dateMismatch
          ? formatCeTransactionCard({
              statusLine: '🔴 วันที่สลิปไม่ตรง (Slip Date Mismatch)',
              thb,
              rate: state.rate,
              usdtExpected,
              usdtSent: 0,
              bank,
              account,
              slipTime: slipDate,
              blocked: true,
              alertLine: 'เวลาไม่ตรงกับปัจจุบัน',
            })
          : status === 'MISMATCH'
          ? formatCeTransactionCard({
              statusLine: '🟠 บัญชีสลิปไม่ตรง PIN (Bank Mismatch)',
              thb,
              rate: state.rate,
              usdtExpected,
              usdtSent: 0,
              bank,
              account,
              slipTime: slipDate,
              blocked: true,
              alertLine: `บัญชีไม่ตรงกับ PIN วันนี้ (${state.pinnedBank.code})`,
            })
          : status === 'REVIEW'
          ? formatCeTransactionCard({
              statusLine: `🟡 รอตรวจสอบสลิป (REVIEW · OCR ${confidence}%)`,
              thb,
              rate: state.rate,
              usdtExpected,
              usdtSent: 0,
              bank,
              account,
              slipTime: slipDate,
              blocked: true,
              alertLine: 'กรุณาตรวจสอบสลิปก่อนยืนยัน',
            })
          : formatCeTransactionCard({
              statusLine: '🟡 พร้อมยืนยันโอน (READY)',
              thb,
              rate: state.rate,
              usdtExpected,
              usdtSent: 0,
              bank,
              account,
              slipTime: slipDate,
              blocked: false,
            });
        sendTelegram(
          CFG,
          cardText,
          dateMismatch ? 'date-mismatch' : status === 'MISMATCH' ? 'mismatch-alert' : 'slip-scan'
        );
      }

      return sendJson(res, 201, {
        ok: true,
        tx: newTx,
        summary: computeSummary(state),
        transactions: state.transactions,
      });
    }

    // Transaction actions: /api/transactions/:id/:action
    const txMatch = pathname.match(/^\/api\/transactions\/([^/]+)\/([a-z-]+)$/);
    if (req.method === 'POST' && txMatch) {
      const txId = decodeURIComponent(txMatch[1]);
      const action = txMatch[2];
      const body = await parseJsonBody(req);
      const tx = state.transactions.find((t) => t.id === txId);
      if (!tx) {
        return sendJson(res, 404, { ok: false, error: 'tx_not_found', message: `ไม่พบรายการ (Transaction Not Found): ${txId}` });
      }

      if (action === 'confirm') {
        tx.status = body.toPending ? 'PENDING' : 'READY';
        tx.dateMismatch = false;
        tx.notes = body.toPending
          ? 'เข้าคิวรอโอน USDT (Queued · PENDING)'
          : 'ยืนยันสลิปแล้ว พร้อมโอน USDT (Confirmed · READY)';
      } else if (action === 'queue') {
        tx.status = 'PENDING';
        tx.notes = 'เข้าคิวรอโอน USDT (Queued · PENDING)';
      } else if (action === 'override') {
        const reason = String(body.reason || 'ยืนยันโดยเจ้าหน้าที่ (Approved by Operator)').trim();
        tx.status = 'READY';
        tx.dateMismatch = false;
        tx.overrideReason = reason;
        tx.notes = `⚡ อนุมัติพิเศษ (OVERRIDE): ${reason}`;
        if (CFG.notifyEvents.onMismatch) {
          sendTelegram(
            CFG,
            formatCeTransactionCard({
              statusLine: '⚡ อนุมัติพิเศษพร้อมโอน (OVERRIDE · READY)',
              thb: tx.thb,
              rate: tx.rate,
              usdtExpected: tx.usdtExpected,
              usdtSent: tx.usdtSent,
              bank: tx.bank,
              account: tx.account,
              slipTime: tx.slipDate || formatThaiSlipDateTime(),
              alertLine: reason,
            }),
            'override'
          );
        }
      } else if (action === 'recheck') {
        if (String(tx.bank).toUpperCase() === String(state.pinnedBank.code).toUpperCase()) {
          tx.status = 'READY';
          tx.notes = 'ตรวจสอบซ้ำผ่าน ✓ บัญชีตรงกับ PIN ปัจจุบันแล้ว (Recheck Passed)';
        } else {
          tx.status = 'MISMATCH';
          tx.notes = `ตรวจสอบซ้ำแล้วยังไม่ตรง (Still Mismatched: ${tx.bank} ≠ ${state.pinnedBank.code})`;
        }
      } else if (action === 'reject') {
        tx.status = 'REJECTED';
        tx.notes = body.reason ? `ปฏิเสธ (Rejected): ${body.reason}` : 'ปฏิเสธรายการโดยเจ้าหน้าที่ (Rejected by Operator)';
      } else if (action === 'reverse') {
        tx.status = 'REVERSED';
        tx.notes = body.reason ? `ย้อนกลับรายการ (Reversed): ${body.reason}` : 'ยกเลิกย้อนกลับโดยผู้ดูแล (Reversed by Admin)';
      } else if (action === 'settle') {
        const amountUsdt = Number(body.usdt ?? (tx.usdtExpected - tx.usdtSent));
        if (isNaN(amountUsdt) || amountUsdt <= 0) {
          return sendJson(res, 400, { ok: false, error: 'invalid_amount', message: 'จำนวน USDT ต้องมากกว่า 0 (Amount must be > 0)' });
        }
        const newTotal = Number((tx.usdtSent + amountUsdt).toFixed(2));
        if (newTotal > Number((tx.usdtExpected + 0.01).toFixed(2))) {
          return sendJson(res, 422, {
            ok: false,
            error: 'settlement_overrun',
            message: `ยอดส่งรวมเกินกำหนด (Overrun: ${newTotal} > ${tx.usdtExpected} USDT)`,
          });
        }
        tx.usdtSent = newTotal;
        tx.settlements = tx.settlements || [];
        tx.settlements.push({
          id: `SE-00${tx.settlements.length + 1}`,
          usdt: Number(amountUsdt.toFixed(2)),
          time: nowHHMM(),
        });

        const diff = Number((tx.usdtExpected - tx.usdtSent).toFixed(2));
        if (diff <= 0.005) {
          tx.usdtSent = tx.usdtExpected;
          tx.status = 'SETTLED';
          tx.notes = 'โอนเหรียญครบสมบูรณ์ (Settlement Completed)';
        } else {
          tx.status = 'SHORT';
          tx.notes = `ส่งขาด (Shortfall) ▼ ${diff.toFixed(2)} USDT — รอส่งเพิ่ม (Pending Top-up)`;
        }
        if (CFG.notifyEvents.onSettle) {
          sendTelegram(
            CFG,
            formatCeTransactionCard({
              statusLine: tx.status === 'SETTLED' ? '🟢 โอนเหรียญครบแล้ว (SETTLED)' : '🔴 ส่งเหรียญไม่ครบ (SHORT)',
              thb: tx.thb,
              rate: tx.rate,
              usdtExpected: tx.usdtExpected,
              usdtSent: tx.usdtSent,
              bank: tx.bank,
              account: tx.account,
              slipTime: tx.slipDate || formatThaiSlipDateTime(),
              alertLine: tx.status === 'SHORT' ? `ยอดส่งขาด ${diff.toFixed(2)} USDT · รอส่งเพิ่ม` : '',
            }),
            tx.status === 'SETTLED' ? 'settled' : 'short-settle'
          );
        }
      } else if (action === 'recover-short') {
        const remaining = Number((tx.usdtExpected - tx.usdtSent).toFixed(2));
        const sendMore = Number(body.usdt ?? remaining);
        const newTotal = Number((tx.usdtSent + sendMore).toFixed(2));
        if (newTotal > Number((tx.usdtExpected + 0.01).toFixed(2))) {
          return sendJson(res, 422, {
            ok: false,
            error: 'settlement_overrun',
            message: `ยอดส่งรวมเกินกำหนด (Overrun: ${newTotal} > ${tx.usdtExpected} USDT)`,
          });
        }
        tx.usdtSent = newTotal;
        tx.settlements = tx.settlements || [];
        tx.settlements.push({
          id: `SE-00${tx.settlements.length + 1}`,
          usdt: Number(sendMore.toFixed(2)),
          time: nowHHMM(),
        });
        const diff = Number((tx.usdtExpected - tx.usdtSent).toFixed(2));
        if (diff <= 0.005) {
          tx.usdtSent = tx.usdtExpected;
          tx.status = 'SETTLED';
          tx.notes = 'ส่งเพิ่มครบจำนวนแล้ว (Short Resolved → SETTLED)';
        } else {
          tx.status = 'PENDING';
          tx.notes = `ส่งเพิ่มแล้ว เหลือค้าง ${diff.toFixed(2)} USDT (Remaining Shortfall)`;
        }
        if (CFG.notifyEvents.onSettle) {
          sendTelegram(
            CFG,
            formatCeTransactionCard({
              statusLine: tx.status === 'SETTLED' ? '🟢 โอนชดเชยครบแล้ว (SHORT → SETTLED)' : '🔵 โอนเพิ่มบางส่วน (PENDING)',
              thb: tx.thb,
              rate: tx.rate,
              usdtExpected: tx.usdtExpected,
              usdtSent: tx.usdtSent,
              bank: tx.bank,
              account: tx.account,
              slipTime: tx.slipDate || formatThaiSlipDateTime(),
            }),
            'short-recovery'
          );
        }
      } else {
        return sendJson(res, 400, { ok: false, error: 'unknown_action' });
      }

      saveState(state);
      return sendJson(res, 200, {
        ok: true,
        tx,
        summary: computeSummary(state),
        transactions: state.transactions,
      });
    }

    // Smart PIN Auto-Parser + Formatter + Auto-Pin in Telegram
    if (req.method === 'POST' && pathname === '/api/dashboard/smart-pin') {
      const body = await parseJsonBody(req);
      const rawText = String(body.rawText || '').trim();
      const parsed = parseSmartPinText(rawText, state.limitThb);
      if (!parsed) {
        return sendJson(res, 400, {
          ok: false,
          error: 'parse_failed',
          message: 'ไม่พบข้อมูลธนาคารหรือเลขบัญชีในข้อความ (เช่น: ธิติ ทองมี 1230004444 กสิกร วงเงิน 50000)',
        });
      }

      const newPinned = {
        code: parsed.code,
        name: parsed.name,
        account: parsed.account,
        holder: parsed.holder,
        updatedAt: `${nowHHMM()} น.`,
      };
      state.pinnedBank = newPinned;
      state.limitThb = parsed.limitThb;

      // Upsert into state.banks so it's selectable everywhere
      const existingIdx = state.banks.findIndex(
        (b) => String(b.code).toUpperCase() === parsed.code.toUpperCase() && b.account === parsed.account
      );
      if (existingIdx >= 0) {
        state.banks[existingIdx] = { code: parsed.code, name: parsed.name, account: parsed.account, holder: parsed.holder };
      } else {
        state.banks.unshift({ code: parsed.code, name: parsed.name, account: parsed.account, holder: parsed.holder });
      }
      saveState(state);

      let telegram = null;
      let pinResult = null;
      if (body.sendToTelegram !== false && CFG.integrations.telegram.enabled) {
        telegram = await sendTelegramDetailed(CFG, parsed.formattedMessage, {
          event: 'smart-pin',
          overrideChatId: body.chatId || undefined,
        });
        if (telegram.ok && telegram.messageId && body.pinInTelegram !== false) {
          pinResult = await pinTelegramMessage(CFG, telegram.messageId, {
            overrideChatId: body.chatId || undefined,
          });
        }
      }

      return sendJson(res, 200, {
        ok: true,
        parsed,
        pinnedBank: state.pinnedBank,
        banks: state.banks,
        summary: computeSummary(state),
        telegram,
        pinned: Boolean(pinResult?.ok),
        pinDetail: pinResult,
        deliveryLog: CFG.deliveryLog || [],
      });
    }

    // Telegram Webhook handler (auto-formats & re-pins whenever a user pins a raw bank message in Telegram)
    if (req.method === 'POST' && pathname === '/api/telegram/webhook') {
      const update = await parseJsonBody(req);
      const msg = update?.message || update?.channel_post;
      const chatId = msg?.chat?.id ? String(msg.chat.id) : null;
      const pinnedRaw = msg?.pinned_message?.text || msg?.pinned_message?.caption || '';
      const cmdText = typeof msg?.text === 'string' && msg.text.startsWith('/pin ') ? msg.text.slice(5).trim() : '';
      const sourceText = pinnedRaw && !pinnedRaw.includes('◈ CE EMPIRE · ข้อมูลบัญชีรับเงิน') ? pinnedRaw : cmdText;

      if (chatId && sourceText) {
        const parsed = parseSmartPinText(sourceText, state.limitThb);
        if (parsed) {
          state.pinnedBank = {
            code: parsed.code,
            name: parsed.name,
            account: parsed.account,
            holder: parsed.holder,
            updatedAt: `${nowHHMM()} น.`,
          };
          state.limitThb = parsed.limitThb;
          saveState(state);

          const sent = await sendTelegramDetailed(CFG, parsed.formattedMessage, {
            event: 'webhook-smart-pin',
            overrideChatId: chatId,
          });
          let pinRes = null;
          if (sent.ok && sent.messageId) {
            pinRes = await pinTelegramMessage(CFG, sent.messageId, { overrideChatId: chatId });
          }
          return sendJson(res, 200, { ok: true, handled: 'smart-pin', parsed, sent, pinned: Boolean(pinRes?.ok) });
        }
      }
      return sendJson(res, 200, { ok: true, handled: 'ignored' });
    }

    // Update pinned bank account
    if (req.method === 'POST' && pathname === '/api/dashboard/pin') {
      const body = await parseJsonBody(req);
      const found = state.banks.find((b) => String(b.code).toUpperCase() === String(body.code || '').toUpperCase());
      if (found) {
        state.pinnedBank = { ...found, updatedAt: `${nowHHMM()} น.` };
      } else if (body.code && body.account) {
        state.pinnedBank = {
          code: String(body.code),
          name: String(body.name || body.code),
          account: String(body.account),
          holder: String(body.holder || 'บจก. ซีอี เอ็มไพร์ โฮลดิ้ง'),
          updatedAt: `${nowHHMM()} น.`,
        };
      }
      if (body.limitThb && Number(body.limitThb) > 0) {
        state.limitThb = Number(body.limitThb);
      }
      saveState(state);

      let telegram = null;
      let pinResult = null;
      if (body.sendToTelegram && CFG.integrations.telegram.enabled) {
        const formatted = formatSmartPinCard({
          code: state.pinnedBank.code,
          account: state.pinnedBank.account,
          holder: state.pinnedBank.holder,
          limitThb: state.limitThb,
        });
        telegram = await sendTelegramDetailed(CFG, formatted, { event: 'smart-pin' });
        if (telegram.ok && telegram.messageId && body.pinInTelegram !== false) {
          pinResult = await pinTelegramMessage(CFG, telegram.messageId);
        }
      }

      return sendJson(res, 200, {
        ok: true,
        pinnedBank: state.pinnedBank,
        summary: computeSummary(state),
        telegram,
        pinned: Boolean(pinResult?.ok),
      });
    }

    // Update Desk Rate
    if (req.method === 'POST' && pathname === '/api/dashboard/rate') {
      const body = await parseJsonBody(req);
      if (body.auto) {
        state.rateMode = 'auto';
        await refreshMarket();
        if (market.rate) state.rate = Number((market.rate + CFG.rateSpread).toFixed(2));
        saveState(state);
        return sendJson(res, 200, { ok: true, rate: state.rate, rateMode: 'auto', summary: computeSummary(state) });
      }
      const nextRate = Number(body.rate);
      if (isNaN(nextRate) || nextRate <= 0) {
        return sendJson(res, 400, { ok: false, error: 'invalid_rate' });
      }
      state.rate = Number(nextRate.toFixed(4));
      state.rateMode = 'manual';
      if (body.marketRate) {
        state.marketRate = Number(Number(body.marketRate).toFixed(4));
      } else if (!market.rate) {
        state.marketRate = Number((state.rate - CFG.rateSpread).toFixed(4));
      }
      saveState(state);
      return sendJson(res, 200, {
        ok: true,
        rate: state.rate,
        rateMode: 'manual',
        summary: computeSummary(state),
      });
    }

    // Open New Cycle (e.g. CE44 -> CE45)
    if (req.method === 'POST' && pathname === '/api/dashboard/new-cycle') {
      const body = await parseJsonBody(req);
      const summary = computeSummary(state);
      const oldCycle = state.cycle;
      const numMatch = oldCycle.match(/\d+/);
      const nextNum = numMatch ? Number(numMatch[0]) + 1 : 45;
      const newCycle = body.cycle || `CE${nextNum}`;

      state.cycleHistory.unshift({
        cycle: oldCycle,
        closedAt: `${nowHHMM()} น.`,
        receivedThb: summary.receivedThb,
        sentUsdt: summary.sentUsdt,
        profitThb: summary.profitThb,
        settledCount: summary.counts.SETTLED,
      });

      state.cycle = newCycle;
      if (body.keepPending !== false) {
        state.transactions = state.transactions.filter(
          (tx) => tx.status === 'PENDING' || tx.status === 'SHORT' || tx.status === 'READY'
        );
      } else {
        state.transactions = [];
      }

      saveState(state);
      if (CFG.notifyEvents.onNewCycle) {
        sendTelegram(
          CFG,
          `◈ CE · NEW CYCLE ⚡ (เปลี่ยนรอบงาน)\n━━━━━━━━━━━━━━\n✅ ปิดรอบ ${oldCycle} → เปิดรอบ ${newCycle}\n📥 ยอดรับรวม (Received): ฿${summary.receivedThb.toLocaleString()} THB\n📤 โอนแล้ว (USDT Sent): ${summary.sentUsdt} USDT\n✨ กำไร (Profit): ฿${summary.profitThb.toLocaleString()} THB`,
          'new-cycle'
        );
      }
      return sendJson(res, 200, {
        ok: true,
        oldCycle,
        newCycle,
        summary: computeSummary(state),
        transactions: state.transactions,
        cycleHistory: state.cycleHistory,
      });
    }

    // Reset demo data
    if (req.method === 'POST' && pathname === '/api/dashboard/reset-demo') {
      state = structuredClone(DEFAULT_STATE);
      await refreshMarket();
      saveState(state);
      return sendJson(res, 200, {
        ok: true,
        summary: computeSummary(state),
        transactions: state.transactions,
      });
    }

    return sendJson(res, 404, { ok: false, error: 'not_found', path: pathname });
  } catch (err) {
    return sendJson(res, 500, { ok: false, error: 'internal_error', message: String(err?.message || err) });
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ [CE-Vault API Server] listening on http://0.0.0.0:${PORT} (/api/healthz)`);
});
