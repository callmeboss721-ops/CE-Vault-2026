// Transparent client-side API fallback for static hosts (e.g., GitHub Pages).
// When a real backend is available (local dev, Replit, Vercel), requests pass through untouched.

const STORAGE_KEY = 'ce_vault_state_v1';
const SPREAD = 0.3;

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

type VaultState = typeof DEFAULT_STATE & {
  transactions: Array<
    (typeof DEFAULT_STATE.transactions)[number] & {
      overrideReason?: string;
    }
  >;
};

const origFetch = window.fetch.bind(window);
let staticMode: boolean | null = null;
const market: { rate: number | null; source: string | null; updatedAt: string | null } = {
  rate: null,
  source: null,
  updatedAt: null,
};

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
    shortTx.notes = `ส่งขาด ▼ ${(shortTx.usdtExpected - shortTx.usdtSent).toFixed(2)} USDT — รอส่งเพิ่ม`;
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
      const autoDesk = Number((m.rate + SPREAD).toFixed(2));
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
      rateSpread: SPREAD,
      rateMode: state.rateMode || 'auto',
      autoSecrets: {
        SESSION_SECRET: 'browser-sandbox',
        CE_VAULT_PII_ENCRYPTION_KEY: 'browser-sandbox',
      },
      integrations: {
        storage: { enabled: true, mode: 'browser-localStorage' },
        marketRate: { enabled: true, source: market.source || 'Bitkub / CoinGecko' },
        telegram: { enabled: false },
        supabase: { enabled: false },
      },
    });
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
      spread: SPREAD,
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
    const account = String(body.account || (bank === state.pinnedBank.code ? state.pinnedBank.account : 'xxx-x-x7413-x'));
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
      return jsonRes(422, { ok: false, error: 'ocr_failed', message: 'อ่านสลิปไม่สำเร็จ ความแม่นยำต่ำกว่า 60%' });
    }

    let status = 'READY';
    let notes = 'OCR ✓, Bank Match ✓, Limit ✓';
    if (confidence < 80) {
      status = 'REVIEW';
      notes = `OCR ความแม่นยำต่ำ (${confidence}%) — ต้องตรวจสอบก่อนยืนยัน`;
    } else if (bank.toUpperCase() !== state.pinnedBank.code.toUpperCase()) {
      status = 'MISMATCH';
      notes = `บัญชีในสลิป ${bank} (${account}) ≠ บัญชี PIN วันนี้ ${state.pinnedBank.code} (${state.pinnedBank.account})`;
    } else if (summary.usedThb + thb > state.limitThb) {
      status = 'REVIEW';
      notes = `วงเงินเกิน Limit ฿${(summary.usedThb + thb - state.limitThb).toLocaleString()} — ต้องกด Limit Override`;
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
    };

    state.transactions.unshift(newTx);
    saveState(state);
    return jsonRes(201, { ok: true, tx: newTx, summary: computeSummary(state), transactions: state.transactions });
  }

  const txMatch = pathname.match(/^\/api\/transactions\/([^/]+)\/([a-z-]+)$/);
  if (method === 'POST' && txMatch) {
    const txId = decodeURIComponent(txMatch[1]);
    const action = txMatch[2];
    const tx = state.transactions.find((t) => t.id === txId);
    if (!tx) return jsonRes(404, { ok: false, error: 'tx_not_found', message: `ไม่พบรายการ ${txId}` });

    if (action === 'confirm') {
      tx.status = body.toPending ? 'PENDING' : 'READY';
      tx.notes = body.toPending ? 'เข้าคิวรอโอน USDT (PENDING)' : 'ยืนยันสลิปแล้ว พร้อมโอน USDT (READY)';
    } else if (action === 'queue') {
      tx.status = 'PENDING';
      tx.notes = 'เข้าคิวรอโอน USDT (PENDING)';
    } else if (action === 'override') {
      const reason = String(body.reason || 'ยืนยันโดย Operator').trim();
      tx.status = 'READY';
      tx.overrideReason = reason;
      tx.notes = `⚡ OVERRIDE: ${reason}`;
    } else if (action === 'recheck') {
      if (tx.bank.toUpperCase() === state.pinnedBank.code.toUpperCase()) {
        tx.status = 'READY';
        tx.notes = 'RECHECK ✓ บัญชีตรงกับ PIN ปัจจุบันแล้ว';
      } else {
        tx.status = 'MISMATCH';
        tx.notes = `RECHECK แล้วยังไม่ตรง (${tx.bank} ≠ ${state.pinnedBank.code})`;
      }
    } else if (action === 'reject') {
      tx.status = 'REJECTED';
      tx.notes = body.reason ? `ปฏิเสธ: ${body.reason}` : 'ปฏิเสธรายการโดย Operator';
    } else if (action === 'reverse') {
      tx.status = 'REVERSED';
      tx.notes = body.reason ? `REVERSED: ${body.reason}` : 'ยกเลิกย้อนกลับโดย ADMIN';
    } else if (action === 'settle' || action === 'recover-short') {
      const remaining = Number((tx.usdtExpected - tx.usdtSent).toFixed(2));
      const amountUsdt = Number(body.usdt ?? remaining);
      if (isNaN(amountUsdt) || amountUsdt <= 0) {
        return jsonRes(400, { ok: false, error: 'invalid_amount', message: 'จำนวน USDT ต้องมากกว่า 0' });
      }
      const newTotal = Number((tx.usdtSent + amountUsdt).toFixed(2));
      if (newTotal > Number((tx.usdtExpected + 0.01).toFixed(2))) {
        return jsonRes(422, {
          ok: false,
          error: 'settlement_overrun',
          message: `OVERRUN: ยอดส่งรวม (${newTotal} USDT) เกินยอดที่ต้องส่ง (${tx.usdtExpected} USDT)`,
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
        tx.notes = action === 'recover-short' ? 'ส่งเพิ่มครบจำนวนแล้ว (SHORT → SETTLED)' : 'Settlement สำเร็จครบจำนวน';
      } else {
        tx.status = action === 'recover-short' ? 'PENDING' : 'SHORT';
        tx.notes = action === 'recover-short' ? `ส่งเพิ่มแล้ว เหลือค้าง ${diff.toFixed(2)} USDT` : `ส่งขาด ▼ ${diff.toFixed(2)} USDT — รอส่งเพิ่ม`;
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
      if (market.rate) state.rate = Number((market.rate + SPREAD).toFixed(2));
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
