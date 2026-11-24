// Auto-configuration & Runtime Bot/API Settings:
// - Secrets are generated once and persisted to data/.secrets.json (gitignored).
// - Operator settings (Telegram Bot Token, Chat ID, Event Toggles, Rate Spread) persist to data/runtime-settings.json (mode 0600, gitignored).
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

export function maskSecret(token) {
  const s = String(token || '').trim();
  if (!s) return '';
  if (s.length <= 10) return '••••••••';
  const colonIdx = s.indexOf(':');
  if (colonIdx > 0) {
    return `${s.slice(0, colonIdx)}:••••••••${s.slice(-4)}`;
  }
  return `${s.slice(0, 4)}••••••••${s.slice(-4)}`;
}

export function loadAutoConfig(dataDir) {
  fs.mkdirSync(dataDir, { recursive: true });
  const secretsFile = path.join(dataDir, '.secrets.json');
  const runtimeFile = path.join(dataDir, 'runtime-settings.json');

  let saved = {};
  try {
    if (fs.existsSync(secretsFile)) saved = JSON.parse(fs.readFileSync(secretsFile, 'utf8'));
  } catch {
    saved = {};
  }

  let runtime = {};
  try {
    if (fs.existsSync(runtimeFile)) runtime = JSON.parse(fs.readFileSync(runtimeFile, 'utf8'));
  } catch {
    runtime = {};
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

  const telegramToken = String(runtime.botToken ?? process.env.BOT_TOKEN ?? process.env.TELEGRAM_BOT_TOKEN ?? '').trim();
  const opsChatId = String(runtime.chatId ?? process.env.OPS_CHAT_ID ?? '').trim();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  const rateSpread = Number(runtime.rateSpread ?? process.env.CE_RATE_SPREAD ?? 0.3);

  const notifyEvents = {
    onScan: runtime.notifyEvents?.onScan ?? true,
    onSettle: runtime.notifyEvents?.onSettle ?? true,
    onMismatch: runtime.notifyEvents?.onMismatch ?? true,
    onNewCycle: runtime.notifyEvents?.onNewCycle ?? true,
  };

  return {
    dataDir,
    runtimeFile,
    secrets,
    rateSpread: Number.isFinite(rateSpread) ? rateSpread : 0.3,
    rateRefreshMs: Number(process.env.CE_RATE_REFRESH_MS || 60000),
    botInfo: runtime.botInfo || null,
    notifyEvents,
    deliveryLog: Array.isArray(runtime.deliveryLog) ? runtime.deliveryLog.slice(0, 15) : [],
    integrations: {
      storage: { enabled: true, mode: supabaseUrl && supabaseKey ? 'local-json (supabase detected)' : 'local-json' },
      marketRate: { enabled: true, source: 'Bitkub USDT_THB → fallback Binance TH (public, no key)' },
      telegram: { enabled: Boolean(telegramToken && opsChatId), token: telegramToken, chatId: opsChatId },
      supabase: { enabled: Boolean(supabaseUrl && supabaseKey), url: supabaseUrl },
    },
  };
}

export function saveRuntimeSettings(cfg, updates = {}) {
  let existing = {};
  try {
    if (fs.existsSync(cfg.runtimeFile)) existing = JSON.parse(fs.readFileSync(cfg.runtimeFile, 'utf8'));
  } catch {
    existing = {};
  }

  if (updates.botToken !== undefined) {
    const clean = String(updates.botToken).trim();
    existing.botToken = clean;
    cfg.integrations.telegram.token = clean;
  }
  if (updates.chatId !== undefined) {
    const cleanChat = String(updates.chatId).trim();
    existing.chatId = cleanChat;
    cfg.integrations.telegram.chatId = cleanChat;
  }
  if (updates.botInfo !== undefined) {
    existing.botInfo = updates.botInfo;
    cfg.botInfo = updates.botInfo;
  }
  if (updates.rateSpread !== undefined && Number.isFinite(Number(updates.rateSpread))) {
    existing.rateSpread = Number(updates.rateSpread);
    cfg.rateSpread = Number(updates.rateSpread);
  }
  if (updates.notifyEvents && typeof updates.notifyEvents === 'object') {
    existing.notifyEvents = {
      ...cfg.notifyEvents,
      ...updates.notifyEvents,
    };
    cfg.notifyEvents = existing.notifyEvents;
  }
  if (updates.deliveryLog !== undefined) {
    existing.deliveryLog = updates.deliveryLog.slice(0, 15);
    cfg.deliveryLog = existing.deliveryLog;
  }

  cfg.integrations.telegram.enabled = Boolean(cfg.integrations.telegram.token && cfg.integrations.telegram.chatId);
  fs.writeFileSync(cfg.runtimeFile, JSON.stringify(existing, null, 2), { mode: 0o600 });
  return cfg;
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
      telegram: {
        enabled: cfg.integrations.telegram.enabled,
        hasToken: Boolean(cfg.integrations.telegram.token),
        maskedToken: maskSecret(cfg.integrations.telegram.token),
        chatId: cfg.integrations.telegram.chatId,
        botInfo: cfg.botInfo,
      },
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
    async () => {
      const r = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=tether&vs_currencies=thb', { signal: AbortSignal.timeout(6000) });
      const j = await r.json();
      const p = Number(j?.tether?.thb);
      if (!p) throw new Error('coingecko: no price');
      return { rate: Number(p.toFixed(2)), source: 'CoinGecko' };
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

export async function verifyTelegramBot(token) {
  const clean = String(token || '').trim();
  if (!clean) {
    return { ok: false, error: 'missing_token', description: 'กรุณาระบุ BOT_TOKEN ก่อนตรวจสอบ (Please provide BOT_TOKEN)' };
  }
  const t0 = Date.now();
  try {
    const [meRes, whRes] = await Promise.all([
      fetch(`https://api.telegram.org/bot${clean}/getMe`, { signal: AbortSignal.timeout(8000) }),
      fetch(`https://api.telegram.org/bot${clean}/getWebhookInfo`, { signal: AbortSignal.timeout(8000) }).catch(() => null),
    ]);
    const j = await meRes.json();
    const whJson = whRes ? await whRes.json().catch(() => null) : null;
    const latencyMs = Date.now() - t0;
    if (!meRes.ok || !j.ok) {
      return {
        ok: false,
        status: meRes.status,
        latencyMs,
        description: j.description || `Telegram HTTP ${meRes.status}`,
      };
    }
    return {
      ok: true,
      latencyMs,
      bot: {
        id: j.result.id,
        firstName: j.result.first_name,
        username: j.result.username,
        canJoinGroups: Boolean(j.result.can_join_groups),
        webhookUrl: whJson?.ok ? whJson.result?.url || '' : '',
        pendingUpdates: whJson?.ok ? Number(whJson.result?.pending_update_count || 0) : 0,
      },
    };
  } catch (err) {
    return { ok: false, description: String(err?.message || err) };
  }
}

export async function detectTelegramChats(token) {
  const clean = String(token || '').trim();
  if (!clean) {
    return { ok: false, description: 'กรุณาระบุ BOT_TOKEN ก่อนดึงรายการแชท (Please provide BOT_TOKEN)' };
  }
  try {
    const r = await fetch(`https://api.telegram.org/bot${clean}/getUpdates?limit=30`, {
      signal: AbortSignal.timeout(8000),
    });
    const j = await r.json();
    if (!r.ok || !j.ok) {
      if (r.status === 409) {
        return {
          ok: false,
          webhookActive: true,
          description:
            'บอทนี้ผูก Webhook ใช้งานจริงอยู่ (Active Webhook Detected) — ระบบจะไม่ลบ Webhook เดิม กรุณากรอก Chat ID โดยตรงเพื่อส่งข้อความ (Enter Chat ID directly)',
        };
      }
      return { ok: false, description: j.description || `Telegram HTTP ${r.status}` };
    }
    const seen = new Map();
    for (const upd of j.result || []) {
      const chat =
        upd.message?.chat ||
        upd.channel_post?.chat ||
        upd.my_chat_member?.chat ||
        upd.edited_message?.chat;
      if (chat && chat.id !== undefined) {
        const key = String(chat.id);
        seen.set(key, {
          id: key,
          title: chat.title || [chat.first_name, chat.last_name].filter(Boolean).join(' ') || chat.username || key,
          username: chat.username || null,
          type: chat.type || 'unknown',
        });
      }
    }
    return { ok: true, chats: Array.from(seen.values()) };
  } catch (err) {
    return { ok: false, description: String(err?.message || err) };
  }
}

export async function sendTelegramDetailed(cfg, text, { event = 'notification', overrideToken, overrideChatId } = {}) {
  const token = String(overrideToken || cfg.integrations.telegram.token || '').trim();
  const chatId = String(overrideChatId || cfg.integrations.telegram.chatId || '').trim();
  if (!token || !chatId) {
    return {
      ok: false,
      description: 'ยังไม่ได้ตั้งค่า BOT_TOKEN หรือ OPS_CHAT_ID (Missing Bot Token or Chat ID)',
    };
  }
  const t0 = Date.now();
  try {
    const r = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text }),
      signal: AbortSignal.timeout(8000),
    });
    const j = await r.json().catch(() => ({}));
    const latencyMs = Date.now() - t0;
    const entry = {
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
    const nextLog = [entry, ...(cfg.deliveryLog || [])].slice(0, 15);
    saveRuntimeSettings(cfg, { deliveryLog: nextLog });

    if (!r.ok || !j.ok) {
      return { ok: false, status: r.status, latencyMs, description: entry.detail, entry };
    }
    return {
      ok: true,
      latencyMs,
      messageId: j.result.message_id,
      chatTitle: j.result.chat?.title || j.result.chat?.first_name || chatId,
      entry,
    };
  } catch (err) {
    const latencyMs = Date.now() - t0;
    const detail = String(err?.message || err);
    const entry = {
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
    const nextLog = [entry, ...(cfg.deliveryLog || [])].slice(0, 15);
    saveRuntimeSettings(cfg, { deliveryLog: nextLog });
    return { ok: false, latencyMs, description: detail, entry };
  }
}

export async function sendTelegram(cfg, text, event = 'notification') {
  if (!cfg.integrations.telegram.enabled) return false;
  const res = await sendTelegramDetailed(cfg, text, { event });
  return res.ok;
}

export async function pinTelegramMessage(cfg, messageId, { overrideToken, overrideChatId, disableNotification = false } = {}) {
  const token = String(overrideToken || cfg.integrations.telegram.token || '').trim();
  const chatId = String(overrideChatId || cfg.integrations.telegram.chatId || '').trim();
  if (!token || !chatId || !messageId) {
    return { ok: false, description: 'ข้อมูลไม่ครบสำหรับปักหมุด (Missing token, chatId, or messageId)' };
  }
  try {
    const r = await fetch(`https://api.telegram.org/bot${token}/pinChatMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        message_id: Number(messageId),
        disable_notification: Boolean(disableNotification),
      }),
      signal: AbortSignal.timeout(8000),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || !j.ok) {
      return { ok: false, status: r.status, description: j.description || `HTTP ${r.status}` };
    }
    return { ok: true, messageId: Number(messageId) };
  } catch (err) {
    return { ok: false, description: String(err?.message || err) };
  }
}
