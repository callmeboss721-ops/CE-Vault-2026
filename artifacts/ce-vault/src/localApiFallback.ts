// Transparent client-side API & real Telegram Bot engine for static hosts (e.g., GitHub Pages).
// Supports connecting to a custom Backend API URL OR running standalone in-browser with real api.telegram.org calls.

const STORAGE_KEY = 'ce_vault_state_v1';
const SETTINGS_KEY = 'ce_vault_settings_v1';

interface BotInfo {
  id: number;
  firstName: string;
  username: string;
  canJoinGroups: boolean;
}

interface DeliveryEntry {
  id: string;
  timestamp: string;
  event: string;
  chatId: string;
  ok: boolean;
  messageId: number | null;
  status: number;
  latencyMs: number;
  detail: string;
}

interface LocalSettings {
  botToken: string;
  chatId: string;
  botInfo: BotInfo | null;
  rateSpread: number;
  customApiBaseUrl: string;
  notifyEvents: {
    onScan: boolean;
    onSettle: boolean;
    onMismatch: boolean;
    onNewCycle: boolean;
  };
  deliveryLog: DeliveryEntry[];
}

const DEFAULT_SETTINGS: LocalSettings = {
  botToken: '',
  chatId: '',
  botInfo: null,
  rateSpread: 0.3,
  customApiBaseUrl: '',
  notifyEvents: {
    onScan: true,
    onSettle: true,
    onMismatch: true,
    onNewCycle: true,
  },
  deliveryLog: [],
};

const DEFAULT_STATE = {
  cycle: 'CE44',
  limitThb: 500000,
  rate: 43.0,
  marketRate: 42.65,
  rateMode: 'auto',
  autoRateSeeded: false,
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
      settlements: [] as Array<{ id: string; usdt: number; time: string }>,
      notes: 'OCR ✓, Bank Match ✓, Limit ✓',
      overrideReason: undefined as string | undefined,
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
      notes: 'รอส่ง USDT ส่วนที่เหลือ (Remaining) 118.56 USDT',
      overrideReason: undefined as string | undefined,
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
      notes: 'ส่งขาด (Shortfall) ▼ 2.56 USDT — รอส่งเพิ่ม (Pending Top-up)',
      overrideReason: undefined as string | undefined,
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
      notes: 'บัญชีในสลิป (Slip) KTB ≠ บัญชี PIN วันนี้ (BBL)',
      overrideReason: undefined as string | undefined,
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
      notes: 'โอนเหรียญครบสมบูรณ์ (Settlement Completed)',
      overrideReason: undefined as string | undefined,
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
      notes: 'ความแม่นยำ OCR ต่ำ (72% · Low Confidence) — รอตรวจสอบ (Review Required)',
      overrideReason: undefined as string | undefined,
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
      notes: 'โอนเหรียญครบสมบูรณ์ (Settlement Completed)',
      overrideReason: undefined as string | undefined,
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
      notes: 'โอนเหรียญครบสมบูรณ์ (Settlement Completed)',
      overrideReason: undefined as string | undefined,
    },
  ],
  cycleHistory: [
    { cycle: 'CE43', closedAt: '12 ก.ย. 69 · 23:55', receivedThb: 482000, sentUsdt: 11209.3, profitThb: 9120.5, settledCount: 38 },
  ],
};

type VaultState = typeof DEFAULT_STATE;

const origFetch = window.fetch.bind(window);
let staticMode: boolean | null = null;
const market: { rate: number | null; source: string | null; updatedAt: string | null } = {
  rate: null,
  source: null,
  updatedAt: null,
};

function maskSecret(token: string): string {
  const s = String(token || '').trim();
  if (!s) return '';
  if (s.length <= 10) return '••••••••';
  const colonIdx = s.indexOf(':');
  if (colonIdx > 0) return `${s.slice(0, colonIdx)}:••••••••${s.slice(-4)}`;
  return `${s.slice(0, 4)}••••••••${s.slice(-4)}`;
}

function loadSettings(): LocalSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        ...DEFAULT_SETTINGS,
        ...parsed,
        notifyEvents: { ...DEFAULT_SETTINGS.notifyEvents, ...(parsed.notifyEvents || {}) },
        deliveryLog: Array.isArray(parsed.deliveryLog) ? parsed.deliveryLog.slice(0, 15) : [],
      };
    }
  } catch {
    /* ignore */
  }
  return structuredClone(DEFAULT_SETTINGS);
}

function saveSettings(s: LocalSettings) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
  } catch {
    /* ignore */
  }
}

function loadState(): VaultState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    /* ignore */
  }
  return structuredClone(DEFAULT_STATE);
}

function saveState(s: VaultState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {
    /* ignore */
  }
}

let settings: LocalSettings = loadSettings();
let state: VaultState = loadState();

function nowHHMM(): string {
  return new Date().toTimeString().slice(0, 5);
}

function rebaseSeed(s: VaultState, rate: number) {
  s.rate = rate;
  for (const tx of s.transactions) {
    const oldExpected = tx.usdtExpected || 1;
    const ratio = tx.usdtSent / oldExpected;
    tx.rate = rate;
    tx.usdtExpected = Number((tx.thb / rate).toFixed(2));
    if (tx.status === 'SETTLED') tx.usdtSent = tx.usdtExpected;
    else if (tx.status === 'SHORT') tx.usdtSent = Number(Math.max(0, tx.usdtExpected - 2.56).toFixed(2));
    else tx.usdtSent = Number((tx.usdtExpected * ratio).toFixed(2));
    for (const se of tx.settlements || []) se.usdt = Number((tx.usdtSent / Math.max(1, tx.settlements.length)).toFixed(2));
  }
  const shortTx = s.transactions.find((t) => t.status === 'SHORT');
  if (shortTx) {
    shortTx.notes = `ส่งขาด (Shortfall) ▼ ${(shortTx.usdtExpected - shortTx.usdtSent).toFixed(2)} USDT — รอส่งเพิ่ม (Pending Top-up)`;
  }
}

async function refreshBrowserMarket() {
  const sources: Array<() => Promise<{ rate: number; source: string }>> = [
    async () => {
      const r = await origFetch('https://api.bitkub.com/api/v3/market/ticker?sym=USDT_THB');
      const j = await r.json();
      const last = Number(Array.isArray(j) ? j[0]?.last : NaN);
      if (!last) throw new Error('no price');
      return { rate: last, source: 'Bitkub' };
    },
    async () => {
      const r = await origFetch('https://api.coingecko.com/api/v3/simple/price?ids=tether&vs_currencies=thb');
      const j = await r.json();
      const last = Number(j?.tether?.thb);
      if (!last) throw new Error('no price');
      return { rate: Number(last.toFixed(2)), source: 'CoinGecko' };
    },
  ];

  for (const fn of sources) {
    try {
      const m = await fn();
      market.rate = m.rate;
      market.source = m.source;
      market.updatedAt = new Date().toISOString();
      state.marketRate = m.rate;
      const autoDesk = Number((m.rate + settings.rateSpread).toFixed(2));
      if (!state.autoRateSeeded) {
        rebaseSeed(state, autoDesk);
        state.autoRateSeeded = true;
        state.rateMode = 'auto';
      } else if (state.rateMode === 'auto') {
        state.rate = autoDesk;
      }
      saveState(state);
      return;
    } catch {
      /* try next */
    }
  }
}

async function browserVerifyBot(token: string) {
  const clean = String(token || '').trim();
  if (!clean) {
    return { ok: false, description: 'กรุณาระบุ BOT_TOKEN ก่อนตรวจสอบ (Please provide BOT_TOKEN)' };
  }
  const t0 = Date.now();
  try {
    const r = await origFetch(`https://api.telegram.org/bot${clean}/getMe`);
    const j = await r.json();
    const latencyMs = Date.now() - t0;
    if (!r.ok || !j.ok) {
      return { ok: false, status: r.status, latencyMs, description: j.description || `HTTP ${r.status}` };
    }
    return {
      ok: true,
      latencyMs,
      bot: {
        id: j.result.id as number,
        firstName: j.result.first_name as string,
        username: j.result.username as string,
        canJoinGroups: Boolean(j.result.can_join_groups),
      },
    };
  } catch (err) {
    return { ok: false, description: String(err) };
  }
}

async function browserDetectChats(token: string) {
  const clean = String(token || '').trim();
  if (!clean) {
    return { ok: false, description: 'กรุณาระบุ BOT_TOKEN ก่อนดึงรายการแชท (Please provide BOT_TOKEN)' };
  }
  try {
    const r = await origFetch(`https://api.telegram.org/bot${clean}/getUpdates?limit=30`);
    const j = await r.json();
    if (!r.ok || !j.ok) {
      return { ok: false, description: j.description || `HTTP ${r.status}` };
    }
    const seen = new Map<string, { id: string; title: string; username: string | null; type: string }>();
    for (const upd of j.result || []) {
      const chat =
        upd.message?.chat || upd.channel_post?.chat || upd.my_chat_member?.chat || upd.edited_message?.chat;
      if (chat && chat.id !== undefined) {
        const idStr = String(chat.id);
        seen.set(idStr, {
          id: idStr,
          title: chat.title || [chat.first_name, chat.last_name].filter(Boolean).join(' ') || chat.username || idStr,
          username: chat.username || null,
          type: chat.type || 'unknown',
        });
      }
    }
    return { ok: true, chats: Array.from(seen.values()) };
  } catch (err) {
    return { ok: false, description: String(err) };
  }
}

async function browserSendTelegram(text: string, event = 'notification', overrideToken?: string, overrideChatId?: string) {
  const token = String(overrideToken || settings.botToken || '').trim();
  const chatId = String(overrideChatId || settings.chatId || '').trim();
  if (!token || !chatId) {
    return { ok: false, description: 'ยังไม่ได้ตั้งค่า BOT_TOKEN หรือ OPS_CHAT_ID (Missing Bot Token or Chat ID)' };
  }
  const t0 = Date.now();
  try {
    const r = await origFetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text }),
    });
    const j = await r.json().catch(() => ({}));
    const latencyMs = Date.now() - t0;
    const entry: DeliveryEntry = {
      id: `TG-${Date.now().toString(36).toUpperCase()}`,
      timestamp: new Date().toISOString(),
      event,
      chatId,
      ok: Boolean(r.ok && j.ok),
      messageId: j?.result?.message_id || null,
      status: r.status,
      latencyMs,
      detail: r.ok && j.ok ? `Message #${j.result.message_id}` : j.description || `HTTP ${r.status}`,
    };
    settings.deliveryLog = [entry, ...(settings.deliveryLog || [])].slice(0, 15);
    saveSettings(settings);
    if (!r.ok || !j.ok) {
      return { ok: false, status: r.status, latencyMs, description: entry.detail, entry };
    }
    return {
      ok: true,
      latencyMs,
      messageId: j.result.message_id as number,
      chatTitle: (j.result.chat?.title || j.result.chat?.first_name || chatId) as string,
      entry,
    };
  } catch (err) {
    const latencyMs = Date.now() - t0;
    const detail = String(err);
    const entry: DeliveryEntry = {
      id: `TG-${Date.now().toString(36).toUpperCase()}`,
      timestamp: new Date().toISOString(),
      event,
      chatId,
      ok: false,
      messageId: null,
      status: 0,
      latencyMs,
      detail,
    };
    settings.deliveryLog = [entry, ...(settings.deliveryLog || [])].slice(0, 15);
    saveSettings(settings);
    return { ok: false, latencyMs, description: detail, entry };
  }
}

function computeSummary(s: VaultState) {
  const activeStatuses = new Set(['READY', 'PENDING', 'SETTLED', 'SHORT']);
  let usedThb = 0;
  let receivedThb = 0;
  let sentUsdt = 0;
  let pendingUsdt = 0;
  let shortUsdt = 0;

  const counts: Record<string, number> = {
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

  for (const tx of s.transactions) {
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

  const remainingThb = Math.max(0, s.limitThb - usedThb);
  const spreadPerUsdt = Math.max(0.15, Number(s.rate) - Number(s.marketRate || s.rate - 0.35));
  const profitThb = Number((sentUsdt * spreadPerUsdt).toFixed(2));
  const usedPercent = Math.min(100, Number(((usedThb / s.limitThb) * 100).toFixed(1)));

  return {
    cycle: s.cycle,
    limitThb: s.limitThb,
    usedThb,
    remainingThb,
    usedPercent,
    receivedThb,
    sentUsdt: Number(sentUsdt.toFixed(2)),
    pendingUsdt: Number(pendingUsdt.toFixed(2)),
    negativeUsdt: Number((-shortUsdt).toFixed(2)),
    shortUsdt: Number(shortUsdt.toFixed(2)),
    profitThb,
    rate: s.rate,
    marketRate: s.marketRate,
    pinnedBank: s.pinnedBank,
    counts,
  };
}

function jsonRes(status: number, data: unknown): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}

let marketInitPromise: Promise<void> | null = null;

async function handleLocalApi(pathname: string, searchParams: URLSearchParams, init?: RequestInit): Promise<Response> {
  if (!marketInitPromise) {
    marketInitPromise = refreshBrowserMarket();
  }
  await marketInitPromise;

  const method = (init?.method || 'GET').toUpperCase();
  const body = init?.body && typeof init.body === 'string' ? JSON.parse(init.body) : {};
  const tgEnabled = Boolean(settings.botToken && settings.chatId);

  if (method === 'GET' && (pathname === '/api/healthz' || pathname === '/api/health')) {
    const summary = computeSummary(state);
    return jsonRes(200, {
      status: 'ok',
      service: 'ce-vault-browser-engine',
      cycle: state.cycle,
      rate: state.rate,
      rateMode: state.rateMode || 'auto',
      marketRate: market.rate ?? state.marketRate,
      pinnedBank: state.pinnedBank.code,
      txCount: state.transactions.length,
      usedPercent: summary.usedPercent,
      timestamp: new Date().toISOString(),
    });
  }

  if (method === 'GET' && pathname === '/api/config') {
    return jsonRes(200, {
      ok: true,
      rateSpread: settings.rateSpread,
      rateMode: state.rateMode || 'auto',
      autoSecrets: {
        SESSION_SECRET: 'browser-sandbox',
        CE_VAULT_PII_ENCRYPTION_KEY: 'browser-sandbox',
      },
      integrations: {
        storage: { enabled: true, mode: 'browser-localStorage' },
        marketRate: { enabled: true, source: market.source || 'Bitkub / CoinGecko' },
        telegram: {
          enabled: tgEnabled,
          hasToken: Boolean(settings.botToken),
          maskedToken: maskSecret(settings.botToken),
          chatId: settings.chatId,
          botInfo: settings.botInfo,
        },
        supabase: { enabled: false },
      },
    });
  }

  if (method === 'GET' && pathname === '/api/settings') {
    return jsonRes(200, {
      ok: true,
      engineMode: 'browser-standalone',
      customApiBaseUrl: settings.customApiBaseUrl,
      rateSpread: settings.rateSpread,
      rateMode: state.rateMode || 'auto',
      telegram: {
        enabled: tgEnabled,
        hasToken: Boolean(settings.botToken),
        maskedToken: maskSecret(settings.botToken),
        chatId: settings.chatId,
        botInfo: settings.botInfo,
        notifyEvents: settings.notifyEvents,
        deliveryLog: settings.deliveryLog || [],
      },
      integrations: {
        storage: { enabled: true, mode: 'browser-localStorage' },
        marketRate: { enabled: true, source: market.source || 'Bitkub / CoinGecko' },
        telegram: { enabled: tgEnabled },
        supabase: { enabled: false },
      },
    });
  }

  if (method === 'POST' && pathname === '/api/settings') {
    if (typeof body.botToken === 'string' && !body.botToken.includes('••••')) {
      settings.botToken = body.botToken.trim();
      if (!settings.botToken) settings.botInfo = null;
    }
    if (body.clearToken === true) {
      settings.botToken = '';
      settings.botInfo = null;
    }
    if (typeof body.chatId === 'string') {
      settings.chatId = body.chatId.trim();
    }
    if (typeof body.customApiBaseUrl === 'string') {
      settings.customApiBaseUrl = body.customApiBaseUrl.trim().replace(/\/+$/, '');
      if (settings.customApiBaseUrl) staticMode = null;
    }
    if (body.notifyEvents && typeof body.notifyEvents === 'object') {
      settings.notifyEvents = { ...settings.notifyEvents, ...body.notifyEvents };
    }
    if (body.rateSpread !== undefined && !isNaN(Number(body.rateSpread))) {
      settings.rateSpread = Number(body.rateSpread);
      if (state.rateMode === 'auto' && market.rate) {
        state.rate = Number((market.rate + settings.rateSpread).toFixed(2));
        saveState(state);
      }
    }
    if (settings.botToken && !settings.botInfo) {
      const verified = await browserVerifyBot(settings.botToken);
      if (verified.ok && verified.bot) settings.botInfo = verified.bot;
    }
    saveSettings(settings);
    return jsonRes(200, {
      ok: true,
      customApiBaseUrl: settings.customApiBaseUrl,
      rateSpread: settings.rateSpread,
      telegram: {
        enabled: Boolean(settings.botToken && settings.chatId),
        hasToken: Boolean(settings.botToken),
        maskedToken: maskSecret(settings.botToken),
        chatId: settings.chatId,
        botInfo: settings.botInfo,
        notifyEvents: settings.notifyEvents,
        deliveryLog: settings.deliveryLog || [],
      },
    });
  }

  if (method === 'POST' && pathname === '/api/telegram/verify') {
    const tokenToTest =
      typeof body.botToken === 'string' && body.botToken.trim() && !body.botToken.includes('••••')
        ? body.botToken.trim()
        : settings.botToken;
    const result = await browserVerifyBot(tokenToTest);
    if (result.ok && result.bot && tokenToTest === settings.botToken) {
      settings.botInfo = result.bot;
      saveSettings(settings);
    }
    return jsonRes(result.ok ? 200 : 400, result);
  }

  if (method === 'POST' && pathname === '/api/telegram/detect-chats') {
    const tokenToUse =
      typeof body.botToken === 'string' && body.botToken.trim() && !body.botToken.includes('••••')
        ? body.botToken.trim()
        : settings.botToken;
    const result = await browserDetectChats(tokenToUse);
    return jsonRes(result.ok ? 200 : 400, result);
  }

  if (method === 'POST' && pathname === '/api/telegram/test') {
    const overrideToken =
      typeof body.botToken === 'string' && body.botToken.trim() && !body.botToken.includes('••••')
        ? body.botToken.trim()
        : undefined;
    const overrideChatId = typeof body.chatId === 'string' && body.chatId.trim() ? body.chatId.trim() : undefined;
    const summary = computeSummary(state);
    const text =
      typeof body.text === 'string' && body.text.trim()
        ? body.text.trim()
        : `◈ CE VAULT · LIVE BOT TEST ✓\n(ทดสอบการเชื่อมต่อ Telegram สำเร็จ)\n━━━━━━━━━━━━━━\n🏠 รอบงาน (Cycle): ${state.cycle}\n📌 บัญชีหลัก (PIN): ${state.pinnedBank.code} · ${state.pinnedBank.account}\n💱 เรทโต๊ะ (Desk Rate): ${state.rate.toFixed(2)} THB/USDT\n📈 เรทตลาด (Market): ${(market.rate ?? state.marketRate).toFixed(2)} THB (${market.source || 'Auto'})\n📊 ยอดรับสะสม (Received): ฿${summary.receivedThb.toLocaleString()}\n⏱️ เวลา (Time): ${nowHHMM()} น.`;
    const res = await browserSendTelegram(text, body.event || 'live-test', overrideToken, overrideChatId);
    return jsonRes(res.ok ? 200 : 400, { ...res, deliveryLog: settings.deliveryLog });
  }

  if (method === 'GET' && pathname === '/api/market') {
    if (searchParams.get('refresh') === '1') await refreshBrowserMarket();
    return jsonRes(200, {
      ok: true,
      rate: market.rate ?? state.marketRate,
      source: market.source || 'Bitkub',
      updatedAt: market.updatedAt || new Date().toISOString(),
      deskRate: state.rate,
      rateMode: state.rateMode || 'auto',
      spread: settings.rateSpread,
    });
  }

  if (method === 'GET' && (pathname === '/api/dashboard/vault' || pathname === '/api/vault')) {
    return jsonRes(200, {
      ok: true,
      summary: computeSummary(state),
      transactions: state.transactions,
      banks: state.banks,
      cycleHistory: state.cycleHistory,
    });
  }

  if (method === 'POST' && pathname === '/api/transactions/scan') {
    const thb = Number(body.thb || 10000);
    const bank = String(body.bank || state.pinnedBank.code);
    const bankMatchesPin = bank.toUpperCase() === state.pinnedBank.code.toUpperCase();
    const account = String(body.account || (bankMatchesPin ? state.pinnedBank.account : 'xxx-x-x7413-x'));
    const sender = String(body.sender || 'นาย สมชาย ใจดี');
    const confidence = Number(body.confidence ?? 98.7);
    const forceDuplicate = Boolean(body.forceDuplicate);

    const summary = computeSummary(state);
    const usdtExpected = Number((thb / state.rate).toFixed(2));
    const fingerprint = String(body.fingerprint || `FP-${thb}-${bank}-${sender}`);

    const existing = state.transactions.find((t) => t.fingerprint === fingerprint);
    if (forceDuplicate || existing) {
      return jsonRes(200, {
        ok: true,
        duplicate: true,
        originalTx: existing || state.transactions[0],
        summary: computeSummary(state),
        transactions: state.transactions,
      });
    }

    if (confidence < 60) {
      return jsonRes(422, {
        ok: false,
        error: 'ocr_failed',
        message: 'อ่านสลิปไม่สำเร็จ ความแม่นยำต่ำกว่า 60% (OCR Confidence < 60%)',
      });
    }

    let status = 'READY';
    let notes = 'OCR ✓, Bank Match ✓, Limit ✓';
    if (confidence < 80) {
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
      status,
      confidence,
      fingerprint,
      settlements: [],
      notes,
      overrideReason: undefined,
    };

    state.transactions.unshift(newTx);
    saveState(state);

    const shouldNotify = status === 'MISMATCH' ? settings.notifyEvents.onMismatch : settings.notifyEvents.onScan;
    if (tgEnabled && shouldNotify) {
      void browserSendTelegram(
        `◈ CE · NEW SLIP (รับสลิปใหม่ · ${newTx.status})\n━━━━━━━━━━━━━━\n🆔 รหัส (Ref ID): ${newTx.id}\n📥 ยอดรับ (Amount): ${thb.toLocaleString()} THB\n💎 ยอดโอน (USDT): ${usdtExpected} USDT\n🏦 บัญชี (Bank): ${bank} · ${account}\n👤 ผู้โอน (Sender): ${sender}\nℹ️ ${notes}`,
        status === 'MISMATCH' ? 'mismatch-alert' : 'slip-scan'
      );
    }

    return jsonRes(201, { ok: true, tx: newTx, summary: computeSummary(state), transactions: state.transactions });
  }

  const txMatch = pathname.match(/^\/api\/transactions\/([^/]+)\/([a-z-]+)$/);
  if (method === 'POST' && txMatch) {
    const txId = decodeURIComponent(txMatch[1]);
    const action = txMatch[2];
    const tx = state.transactions.find((t) => t.id === txId);
    if (!tx) return jsonRes(404, { ok: false, error: 'tx_not_found', message: `ไม่พบรายการ (Transaction Not Found): ${txId}` });

    if (action === 'confirm') {
      tx.status = body.toPending ? 'PENDING' : 'READY';
      tx.notes = body.toPending
        ? 'เข้าคิวรอโอน USDT (Queued · PENDING)'
        : 'ยืนยันสลิปแล้ว พร้อมโอน USDT (Confirmed · READY)';
    } else if (action === 'queue') {
      tx.status = 'PENDING';
      tx.notes = 'เข้าคิวรอโอน USDT (Queued · PENDING)';
    } else if (action === 'override') {
      const reason = String(body.reason || 'ยืนยันโดยเจ้าหน้าที่ (Approved by Operator)').trim();
      tx.status = 'READY';
      tx.overrideReason = reason;
      tx.notes = `⚡ อนุมัติพิเศษ (OVERRIDE): ${reason}`;
      if (tgEnabled && settings.notifyEvents.onMismatch) {
        void browserSendTelegram(
          `◈ CE · OVERRIDE ⚡ (อนุมัติกรณีพิเศษ)\n━━━━━━━━━━━━━━\n🆔 รหัส (Ref ID): ${tx.id}\n📥 ยอดรับ (Amount): ${tx.thb.toLocaleString()} THB\n💎 ยอดโอน (USDT): ${tx.usdtExpected} USDT\n📝 เหตุผล (Reason): ${reason}\n🟡 สถานะ: พร้อมโอน (READY)`,
          'override'
        );
      }
    } else if (action === 'recheck') {
      if (tx.bank.toUpperCase() === state.pinnedBank.code.toUpperCase()) {
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
    } else if (action === 'settle' || action === 'recover-short') {
      const remaining = Number((tx.usdtExpected - tx.usdtSent).toFixed(2));
      const amountUsdt = Number(body.usdt ?? remaining);
      if (isNaN(amountUsdt) || amountUsdt <= 0) {
        return jsonRes(400, { ok: false, error: 'invalid_amount', message: 'จำนวน USDT ต้องมากกว่า 0 (Amount must be > 0)' });
      }
      const newTotal = Number((tx.usdtSent + amountUsdt).toFixed(2));
      if (newTotal > Number((tx.usdtExpected + 0.01).toFixed(2))) {
        return jsonRes(422, {
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
        tx.notes =
          action === 'recover-short'
            ? 'ส่งเพิ่มครบจำนวนแล้ว (Short Resolved → SETTLED)'
            : 'โอนเหรียญครบสมบูรณ์ (Settlement Completed)';
      } else {
        tx.status = action === 'recover-short' ? 'PENDING' : 'SHORT';
        tx.notes =
          action === 'recover-short'
            ? `ส่งเพิ่มแล้ว เหลือค้าง ${diff.toFixed(2)} USDT (Remaining Shortfall)`
            : `ส่งขาด (Shortfall) ▼ ${diff.toFixed(2)} USDT — รอส่งเพิ่ม (Pending Top-up)`;
      }
      if (tgEnabled && settings.notifyEvents.onSettle) {
        void browserSendTelegram(
          `◈ CE · ${tx.status === 'SETTLED' ? 'DONE ✓ (โอนครบสำเร็จ)' : `${tx.status} (อัปเดตยอดโอน)`}\n━━━━━━━━━━━━━━\n🆔 รหัส (Ref ID): ${tx.id}\n📥 ยอดรับ (THB In): ${tx.thb.toLocaleString()} THB\n📤 โอนรวม (USDT Sent): ${tx.usdtSent} / ${tx.usdtExpected} USDT\n💱 เรท (Rate): ${tx.rate} THB`,
          tx.status === 'SETTLED' ? 'settled' : 'short-settle'
        );
      }
    } else {
      return jsonRes(400, { ok: false, error: 'unknown_action' });
    }

    saveState(state);
    return jsonRes(200, { ok: true, tx, summary: computeSummary(state), transactions: state.transactions });
  }

  if (method === 'POST' && pathname === '/api/dashboard/pin') {
    const found = state.banks.find((b) => String(b.code).toUpperCase() === String(body.code || '').toUpperCase());
    if (found) {
      state.pinnedBank = { ...found, updatedAt: `${nowHHMM()} น.` };
    }
    if (body.limitThb && Number(body.limitThb) > 0) {
      state.limitThb = Number(body.limitThb);
    }
    saveState(state);
    return jsonRes(200, { ok: true, pinnedBank: state.pinnedBank, summary: computeSummary(state) });
  }

  if (method === 'POST' && pathname === '/api/dashboard/rate') {
    if (body.auto) {
      state.rateMode = 'auto';
      await refreshBrowserMarket();
      if (market.rate) state.rate = Number((market.rate + settings.rateSpread).toFixed(2));
      saveState(state);
      return jsonRes(200, { ok: true, rate: state.rate, rateMode: 'auto', summary: computeSummary(state) });
    }
    const nextRate = Number(body.rate);
    if (isNaN(nextRate) || nextRate <= 0) return jsonRes(400, { ok: false, error: 'invalid_rate' });
    state.rate = Number(nextRate.toFixed(4));
    state.rateMode = 'manual';
    saveState(state);
    return jsonRes(200, { ok: true, rate: state.rate, rateMode: 'manual', summary: computeSummary(state) });
  }

  if (method === 'POST' && pathname === '/api/dashboard/new-cycle') {
    const summary = computeSummary(state);
    const oldCycle = state.cycle;
    const numMatch = oldCycle.match(/\d+/);
    const nextNum = numMatch ? Number(numMatch[0]) + 1 : 45;
    const newCycle = String(body.cycle || `CE${nextNum}`);

    state.cycleHistory.unshift({
      cycle: oldCycle,
      closedAt: `${nowHHMM()} น.`,
      receivedThb: summary.receivedThb,
      sentUsdt: summary.sentUsdt,
      profitThb: summary.profitThb,
      settledCount: summary.counts.SETTLED,
    });
    state.cycle = newCycle;
    state.transactions =
      body.keepPending !== false
        ? state.transactions.filter((tx) => tx.status === 'PENDING' || tx.status === 'SHORT' || tx.status === 'READY')
        : [];
    saveState(state);

    if (tgEnabled && settings.notifyEvents.onNewCycle) {
      void browserSendTelegram(
        `◈ CE · NEW CYCLE ⚡ (เปลี่ยนรอบงาน)\n━━━━━━━━━━━━━━\n✅ ปิดรอบ ${oldCycle} → เปิดรอบ ${newCycle}\n📥 ยอดรับรวม (Received): ฿${summary.receivedThb.toLocaleString()} THB\n📤 โอนแล้ว (USDT Sent): ${summary.sentUsdt} USDT\n✨ กำไร (Profit): ฿${summary.profitThb.toLocaleString()} THB`,
        'new-cycle'
      );
    }

    return jsonRes(200, {
      ok: true,
      oldCycle,
      newCycle,
      summary: computeSummary(state),
      transactions: state.transactions,
      cycleHistory: state.cycleHistory,
    });
  }

  if (method === 'POST' && pathname === '/api/dashboard/reset-demo') {
    state = structuredClone(DEFAULT_STATE);
    await refreshBrowserMarket();
    saveState(state);
    return jsonRes(200, { ok: true, summary: computeSummary(state), transactions: state.transactions });
  }

  return jsonRes(404, { ok: false, error: 'not_found', path: pathname });
}

window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  const rawUrl = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
  const u = new URL(rawUrl, window.location.origin);
  const apiIdx = u.pathname.indexOf('/api/');
  if (apiIdx === -1) {
    return origFetch(input, init);
  }
  const apiPath = u.pathname.slice(apiIdx);

  // If operator configured a custom remote backend URL in Settings, route /api/* there (except saving local customApiBaseUrl)
  if (settings.customApiBaseUrl) {
    if (apiPath === '/api/settings' && (init?.method || 'GET').toUpperCase() === 'POST' && typeof init?.body === 'string') {
      try {
        const parsed = JSON.parse(init.body);
        if (typeof parsed.customApiBaseUrl === 'string') {
          settings.customApiBaseUrl = parsed.customApiBaseUrl.trim().replace(/\/+$/, '');
          saveSettings(settings);
          if (!settings.customApiBaseUrl) {
            staticMode = null;
          }
        }
      } catch {
        /* ignore */
      }
    }
    if (settings.customApiBaseUrl) {
      try {
        const remoteTarget = `${settings.customApiBaseUrl}${apiPath}${u.search}`;
        const remoteRes = await origFetch(remoteTarget, init);
        const ct = remoteRes.headers.get('content-type') || '';
        if (ct.includes('application/json')) {
          return remoteRes;
        }
      } catch {
        /* fall back if custom backend unreachable */
      }
    }
  }

  if (staticMode === true) {
    return handleLocalApi(apiPath, u.searchParams, init);
  }

  try {
    const res = await origFetch(input, init);
    const ct = res.headers.get('content-type') || '';
    if (res.status === 404 || res.status === 405 || ct.includes('text/html')) {
      staticMode = true;
      return handleLocalApi(apiPath, u.searchParams, init);
    }
    staticMode = false;
    return res;
  } catch {
    staticMode = true;
    return handleLocalApi(apiPath, u.searchParams, init);
  }
};
