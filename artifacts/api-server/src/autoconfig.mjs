// Auto-configuration: no manual secrets required.
// - Secrets are generated once and persisted to data/.secrets.json (gitignored).
// - Optional integrations (Telegram, Supabase) turn on automatically when their env vars exist.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

export function loadAutoConfig(dataDir) {
  fs.mkdirSync(dataDir, { recursive: true });
  const secretsFile = path.join(dataDir, '.secrets.json');
  let saved = {};
  try {
    if (fs.existsSync(secretsFile)) saved = JSON.parse(fs.readFileSync(secretsFile, 'utf8'));
  } catch {
    saved = {};
  }

  const gen = (bytes) => crypto.randomBytes(bytes).toString('hex');
  const secrets = {
    SESSION_SECRET: process.env.SESSION_SECRET || saved.SESSION_SECRET || gen(32),
    DASHBOARD_SESSION_SECRET: process.env.DASHBOARD_SESSION_SECRET || saved.DASHBOARD_SESSION_SECRET || gen(32),
    CE_VAULT_PII_ENCRYPTION_KEY: process.env.CE_VAULT_PII_ENCRYPTION_KEY || saved.CE_VAULT_PII_ENCRYPTION_KEY || gen(32),
    API_SECRET: process.env.API_SECRET || saved.API_SECRET || gen(24),
  };

  const toPersist = { ...saved };
  let changed = false;
  for (const [k, v] of Object.entries(secrets)) {
    if (!process.env[k] && saved[k] !== v) {
      toPersist[k] = v;
      changed = true;
    }
  }
  if (changed) fs.writeFileSync(secretsFile, JSON.stringify(toPersist, null, 2), { mode: 0o600 });

  const telegramToken = process.env.BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN || '';
  const opsChatId = process.env.OPS_CHAT_ID || '';
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';

  return {
    secrets,
    rateSpread: Number(process.env.CE_RATE_SPREAD || 0.3),
    rateRefreshMs: Number(process.env.CE_RATE_REFRESH_MS || 60000),
    integrations: {
      storage: { enabled: true, mode: supabaseUrl && supabaseKey ? 'local-json (supabase detected)' : 'local-json' },
      marketRate: { enabled: true, source: 'Bitkub USDT_THB → fallback Binance TH (public, no key)' },
      telegram: { enabled: Boolean(telegramToken && opsChatId), token: telegramToken, chatId: opsChatId },
      supabase: { enabled: Boolean(supabaseUrl && supabaseKey), url: supabaseUrl },
    },
  };
}

export function publicConfig(cfg) {
  return {
    autoSecrets: Object.fromEntries(
      Object.keys(cfg.secrets).map((k) => [k, process.env[k] ? 'env' : 'auto-generated'])
    ),
    rateSpread: cfg.rateSpread,
    rateRefreshMs: cfg.rateRefreshMs,
    integrations: {
      storage: cfg.integrations.storage,
      marketRate: cfg.integrations.marketRate,
      telegram: { enabled: cfg.integrations.telegram.enabled },
      supabase: { enabled: cfg.integrations.supabase.enabled },
    },
  };
}

// Live USDT/THB market rate from public endpoints (no API key).
export async function fetchMarketRate() {
  const attempts = [
    async () => {
      const r = await fetch('https://api.bitkub.com/api/v3/market/ticker?sym=USDT_THB', { signal: AbortSignal.timeout(6000) });
      const j = await r.json();
      const last = Number(Array.isArray(j) ? j[0]?.last : NaN);
      if (!last) throw new Error('bitkub: no price');
      return { rate: last, source: 'Bitkub' };
    },
    async () => {
      const r = await fetch('https://api.binance.th/api/v1/ticker/price?symbol=USDTTHB', { signal: AbortSignal.timeout(6000) });
      const j = await r.json();
      const p = Number(j?.price);
      if (!p) throw new Error('binance th: no price');
      return { rate: p, source: 'Binance TH' };
    },
  ];
  for (const fn of attempts) {
    try {
      return await fn();
    } catch {
      /* try next */
    }
  }
  return null;
}

export async function sendTelegram(cfg, text) {
  const tg = cfg.integrations.telegram;
  if (!tg.enabled) return false;
  try {
    const r = await fetch(`https://api.telegram.org/bot${tg.token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: tg.chatId, text }),
      signal: AbortSignal.timeout(6000),
    });
    return r.ok;
  } catch {
    return false;
  }
}
