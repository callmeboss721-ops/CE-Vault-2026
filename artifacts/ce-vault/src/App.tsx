import React, { useEffect, useState, useCallback } from 'react';
import {
  CeIcon,
  IconName,
  StatusBadge,
  TxStatus,
  CeButton,
  TxItem,
  BankLogo,
  resolveBankAsset,
  POPULAR_BANK_CODES,
  ALL_BANK_CODES,
} from './components/ui';
import { MSG } from './constants/messages';
import { parseSmartPinText, formatThaiSlipDateTime } from './utils/smartPin';
import { BotRecord, FleetSummary } from './constants/botFleetSeed';

interface SettlementEntry {
  id: string;
  usdt: number;
  time: string;
}

interface Transaction {
  id: string;
  thb: number;
  usdtExpected: number;
  usdtSent: number;
  rate: number;
  bank: string;
  account: string;
  sender: string;
  time: string;
  slipDate?: string;
  dateMismatch?: boolean;
  status: TxStatus;
  confidence: number;
  fingerprint?: string;
  settlements: SettlementEntry[];
  notes?: string;
  overrideReason?: string;
}

interface BankOption {
  code: string;
  name: string;
  account: string;
  holder: string;
  updatedAt?: string;
}

interface VaultSummary {
  cycle: string;
  limitThb: number;
  usedThb: number;
  remainingThb: number;
  usedPercent: number;
  receivedThb: number;
  sentUsdt: number;
  pendingUsdt: number;
  negativeUsdt: number;
  shortUsdt: number;
  profitThb: number;
  rate: number;
  marketRate: number;
  pinnedBank: BankOption;
  counts: Record<TxStatus, number>;
}

interface CycleRecord {
  cycle: string;
  closedAt: string;
  receivedThb: number;
  sentUsdt: number;
  profitThb: number;
  settledCount: number;
}

interface BotInfo {
  id: number;
  firstName: string;
  username: string;
  canJoinGroups: boolean;
  webhookUrl?: string;
  pendingUpdates?: number;
}

interface DetectedChat {
  id: string;
  title: string;
  username: string | null;
  type: string;
}

interface DeliveryLogItem {
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

interface NotifyEvents {
  onScan: boolean;
  onSettle: boolean;
  onMismatch: boolean;
  onNewCycle: boolean;
}

type MainTab = 'desk' | 'scan' | 'bots' | 'settings';
type ThemeName = 'midnight' | 'gold' | 'light';

const THEMES: { id: ThemeName; label: string; swatch: string }[] = [
  { id: 'midnight', label: 'Midnight', swatch: '#3fe0ff' },
  { id: 'gold', label: 'Gold', swatch: '#e8b84a' },
  { id: 'light', label: 'Light', swatch: '#f2f4f8' },
];

function readStoredTheme(): ThemeName {
  try {
    const t = localStorage.getItem('ce-theme');
    if (t === 'midnight' || t === 'gold' || t === 'light') return t;
  } catch {
    /* storage unavailable */
  }
  return 'midnight';
}
type SettingsSubTab = 'api' | 'messages' | 'banks';
type PanelMode = 'tx' | 'pin' | 'rate' | 'cycle';
type SimpleQueueFilter = 'ALL' | 'ACTION' | 'PENDING' | 'SETTLED';

const ALL_ICONS: IconName[] = [
  'receive', 'send', 'rate', 'limit', 'profit', 'cycle', 'bank', 'pin', 'scan', 'user', 'amount', 'usdt',
  'ready', 'pending', 'settled', 'short', 'mismatch', 'duplicate', 'review', 'rejected', 'reversed', 'ocr',
  'check', 'edit', 'trash', 'recheck', 'override', 'alert', 'search', 'copy', 'close', 'back', 'refresh', 'gem',
  'settings', 'bot', 'key', 'link',
];

const ALL_STATUSES: TxStatus[] = [
  'READY', 'PENDING', 'SETTLED', 'SHORT', 'MISMATCH', 'REVIEW', 'OCR', 'DUPLICATE', 'REJECTED', 'REVERSED',
];

function fmtThb(n: number): string {
  return Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtInt(n: number): string {
  return Number(n || 0).toLocaleString('en-US', { maximumFractionDigits: 0 });
}

function fmtUsdt(n: number): string {
  return Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function App() {
  const [activeTab, setActiveTab] = useState<MainTab>('desk');
  const [theme, setTheme] = useState<ThemeName>(readStoredTheme);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem('ce-theme', theme);
    } catch {
      /* storage unavailable */
    }
  }, [theme]);
  const [settingsSubTab, setSettingsSubTab] = useState<SettingsSubTab>('api');
  const [summary, setSummary] = useState<VaultSummary | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [banks, setBanks] = useState<BankOption[]>([]);
  const [cycleHistory, setCycleHistory] = useState<CycleRecord[]>([]);
  const [bots, setBots] = useState<BotRecord[]>([]);
  const [fleetSummary, setFleetSummary] = useState<FleetSummary | null>(null);
  const [botCatFilter, setBotCatFilter] = useState<string>('ALL');
  const [editingBotSlug, setEditingBotSlug] = useState<string | null>(null);
  const [botCustomToken, setBotCustomToken] = useState<string>('');
  const [botCustomChatId, setBotCustomChatId] = useState<string>('');
  const [botHandleInput, setBotHandleInput] = useState<string>('');
  const [selectedTxId, setSelectedTxId] = useState<string | null>(null);
  const [panelMode, setPanelMode] = useState<PanelMode>('tx');
  const [queueFilter, setQueueFilter] = useState<SimpleQueueFilter>('ALL');
  const [showBotCardPreview, setShowBotCardPreview] = useState<boolean>(false);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [apiHealthy, setApiHealthy] = useState<boolean>(true);
  const [apiLatencyMs, setApiLatencyMs] = useState<number | null>(null);
  const [engineMode, setEngineMode] = useState<string>('backend-api-server');
  const [market, setMarket] = useState<{
    rate?: number;
    source?: string;
    bid?: number;
    ask?: number;
    high24h?: number;
    low24h?: number;
    changePercent?: number;
    rateMode?: string;
    updatedAt?: string;
  } | null>(null);
  const [autoCfg, setAutoCfg] = useState<{
    rateSpread?: number;
    integrations?: {
      storage?: { enabled: boolean; mode: string };
      marketRate?: { enabled: boolean; source: string };
      telegram?: { enabled: boolean; hasToken?: boolean; maskedToken?: string; chatId?: string; botInfo?: BotInfo | null };
    };
  } | null>(null);

  // Settings (API + Telegram Bot) states
  const [botTokenInput, setBotTokenInput] = useState<string>('');
  const [showBotToken, setShowBotToken] = useState<boolean>(false);
  const [maskedToken, setMaskedToken] = useState<string>('');
  const [hasSavedToken, setHasSavedToken] = useState<boolean>(false);
  const [chatIdInput, setChatIdInput] = useState<string>('');
  const [botInfo, setBotInfo] = useState<BotInfo | null>(null);
  const [detectedChats, setDetectedChats] = useState<DetectedChat[]>([]);
  const [notifyEvents, setNotifyEvents] = useState<NotifyEvents>({
    onScan: true,
    onSettle: true,
    onMismatch: true,
    onNewCycle: true,
  });
  const [spreadInput, setSpreadInput] = useState<string>('0.30');
  const [customApiUrlInput, setCustomApiUrlInput] = useState<string>('');
  const [customTestMsg, setCustomTestMsg] = useState<string>('');
  const [deliveryLog, setDeliveryLog] = useState<DeliveryLogItem[]>([]);
  const [tgStatusBanner, setTgStatusBanner] = useState<{ ok: boolean; text: string } | null>(null);

  // Action form states
  const [settleAmount, setSettleAmount] = useState<string>('');
  const [overrideReason, setOverrideReason] = useState<string>('ลูกค้าโอนเข้าบัญชีสำรอง ยืนยันสลิปถูกต้อง (Verified Backup Account)');
  const [rateInput, setRateInput] = useState<string>('34.23');
  const [pinCodeInput, setPinCodeInput] = useState<string>('KBANK');
  const [limitInput, setLimitInput] = useState<string>('500000');
  const [smartPinInput, setSmartPinInput] = useState<string>('ธิติ ทองมี 1230004444 กสิกร วงเงิน 50000');

  // Scan form states
  const [scanThb, setScanThb] = useState<string>('10000');
  const [scanBank, setScanBank] = useState<string>('KBANK');
  const [scanAccount, setScanAccount] = useState<string>('1230004444');
  const [scanSender, setScanSender] = useState<string>('นาย สมชาย ใจดี');
  const [scanConfidence, setScanConfidence] = useState<string>('98.7');
  const [scanSlipDate, setScanSlipDate] = useState<string>(() => formatThaiSlipDateTime());
  const [scanResultMsg, setScanResultMsg] = useState<string>('');

  // Messages filter
  const [msgGroup, setMsgGroup] = useState<string>('ALL');

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  }, []);

  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch('/api/settings');
      if (!res.ok) return;
      const data = await res.json();
      setEngineMode(data.engineMode || 'backend-api-server');
      if (data.customApiBaseUrl !== undefined) setCustomApiUrlInput(data.customApiBaseUrl || '');
      if (data.rateSpread !== undefined) setSpreadInput(Number(data.rateSpread).toFixed(2));
      if (data.telegram) {
        setHasSavedToken(Boolean(data.telegram.hasToken));
        setMaskedToken(data.telegram.maskedToken || '');
        setChatIdInput((prev) => (prev ? prev : data.telegram.chatId || ''));
        setBotInfo(data.telegram.botInfo || null);
        if (data.telegram.notifyEvents) setNotifyEvents(data.telegram.notifyEvents);
        if (Array.isArray(data.telegram.deliveryLog)) setDeliveryLog(data.telegram.deliveryLog);
      }
    } catch {
      /* ignore */
    }
  }, []);

  const fetchVault = useCallback(async () => {
    try {
      const t0 = performance.now();
      const [vaultRes, healthRes] = await Promise.all([
        fetch('/api/dashboard/vault'),
        fetch('/api/healthz'),
      ]);
      setApiLatencyMs(Math.round(performance.now() - t0));
      setApiHealthy(healthRes.ok);
      if (vaultRes.ok) {
        const data = await vaultRes.json();
        setSummary(data.summary);
        setTransactions(data.transactions || []);
        setBanks(data.banks || []);
        setCycleHistory(data.cycleHistory || []);
        setRateInput(String(data.summary?.rate ?? 34.23));
        setPinCodeInput(String(data.summary?.pinnedBank?.code ?? 'BBL'));
        setLimitInput(String(data.summary?.limitThb ?? 500000));
        if (!selectedTxId && data.transactions?.length > 0) {
          setSelectedTxId(data.transactions[0].id);
        }
      }
    } catch {
      setApiHealthy(false);
    }
  }, [selectedTxId]);

  const fetchMarket = useCallback(async () => {
    try {
      const [mRes, cRes] = await Promise.all([fetch('/api/market'), fetch('/api/config')]);
      if (mRes.ok) setMarket(await mRes.json());
      if (cRes.ok) setAutoCfg(await cRes.json());
    } catch {
      /* offline */
    }
  }, []);

  const fetchBots = useCallback(async () => {
    try {
      const res = await fetch('/api/bots');
      if (res.ok) {
        const data = await res.json();
        setBots(data.bots || []);
        setFleetSummary(data.summary || null);
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    fetchVault();
    fetchSettings();
    fetchBots();
  }, [fetchVault, fetchSettings, fetchBots]);

  useEffect(() => {
    fetchMarket();
    const id = setInterval(() => {
      fetchMarket();
      fetchVault();
      fetchBots();
    }, 60000);
    return () => clearInterval(id);
  }, [fetchMarket, fetchVault, fetchBots]);

  const selectedTx = transactions.find((t) => t.id === selectedTxId) || transactions[0] || null;

  useEffect(() => {
    if (selectedTx) {
      const rem = Math.max(0, Number((selectedTx.usdtExpected - selectedTx.usdtSent).toFixed(2)));
      setSettleAmount(rem > 0 ? String(rem) : String(selectedTx.usdtExpected));
    }
  }, [selectedTx?.id, selectedTx?.usdtSent, selectedTx?.usdtExpected]);

  async function handleTxAction(txId: string, action: string, payload: Record<string, unknown> = {}) {
    setLoadingAction(`${txId}:${action}`);
    try {
      const res = await fetch(`/api/transactions/${encodeURIComponent(txId)}/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        showToast(`❌ ${data.message || data.error || 'เกิดข้อผิดพลาด'}`);
        return;
      }
      setSummary(data.summary);
      setTransactions(data.transactions);
      setSelectedTxId(data.tx.id);
      fetchSettings();
      showToast(`✅ อัปเดต ${data.tx.id} → ${data.tx.status}`);
    } catch (e) {
      showToast(`❌ เชื่อมต่อ API ไม่สำเร็จ: ${String(e)}`);
    } finally {
      setLoadingAction(null);
    }
  }

  async function handleScanSubmit(forceDuplicate = false) {
    setLoadingAction('scan');
    try {
      const res = await fetch('/api/transactions/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          thb: Number(scanThb),
          bank: scanBank,
          account: scanAccount,
          sender: scanSender,
          confidence: Number(scanConfidence),
          slipDate: scanSlipDate,
          forceDuplicate,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setScanResultMsg(MSG.OCR_FAIL());
        showToast(`❌ ${data.message || 'อ่านสลิปล้มเหลว'}`);
        return;
      }
      setSummary(data.summary);
      setTransactions(data.transactions);
      fetchSettings();

      if (data.duplicate && data.originalTx) {
        setScanResultMsg(
          MSG.DUPLICATE({
            id: data.originalTx.id,
            thb: fmtThb(data.originalTx.thb),
            usdt: fmtUsdt(data.originalTx.usdtExpected),
            rate: data.originalTx.rate?.toFixed?.(2) || '34.23',
            slip_time: data.originalTx.slipDate || data.originalTx.time,
          })
        );
        showToast(`⚠️ พบสลิปซ้ำในระบบ (${data.originalTx.id})`);
        return;
      }

      const tx: Transaction = data.tx;
      setSelectedTxId(tx.id);
      setPanelMode('tx');

      if (tx.dateMismatch) {
        setScanResultMsg(
          MSG.SLIP_DATE_MISMATCH({
            thb: fmtThb(tx.thb),
            rate: tx.rate.toFixed(2),
            bank: tx.bank,
            account: tx.account,
            slip_time: tx.slipDate || scanSlipDate,
          })
        );
      } else if (tx.status === 'MISMATCH') {
        setScanResultMsg(
          MSG.BANK_MISMATCH({
            thb: fmtThb(tx.thb),
            rate: tx.rate.toFixed(2),
            bank: tx.bank,
            account: tx.account,
            slip_time: tx.slipDate || scanSlipDate,
          })
            .replace('[PIN_BANK]', data.summary.pinnedBank.code)
            .replace('[PIN_ACCOUNT]', data.summary.pinnedBank.account)
        );
      } else if (tx.status === 'REVIEW') {
        setScanResultMsg(
          MSG.OCR_LOW_CONFIDENCE({
            thb: fmtThb(tx.thb),
            bank: tx.bank,
            account: tx.account,
            name: tx.sender,
            rate: tx.rate.toFixed(2),
            confidence: tx.confidence,
            slip_time: tx.slipDate || scanSlipDate,
          })
        );
      } else {
        setScanResultMsg(
          MSG.OCR_READY({
            thb: fmtThb(tx.thb),
            usdt: fmtUsdt(tx.usdtExpected),
            bank: tx.bank,
            account: tx.account,
            name: tx.sender,
            rate: tx.rate.toFixed(2),
            confidence: tx.confidence,
            slip_time: tx.slipDate || scanSlipDate,
          })
        );
      }
      showToast(`✅ รับสลิป ${tx.id} เรียบร้อย (${tx.dateMismatch ? 'วันที่ไม่ตรง' : tx.status})`);
    } catch (e) {
      showToast(`❌ ประมวลผลสลิปล้มเหลว: ${String(e)}`);
    } finally {
      setLoadingAction(null);
    }
  }

  async function handleSmartPinSubmit(sendToTelegram: boolean, pinInTelegram = true) {
    setLoadingAction(sendToTelegram ? 'smart-pin-tg' : 'smart-pin');
    try {
      const res = await fetch('/api/dashboard/smart-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawText: smartPinInput, sendToTelegram, pinInTelegram }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        showToast(`❌ ${data.message || 'แปลงข้อมูลบัญชีไม่สำเร็จ'}`);
        return;
      }
      setSummary(data.summary);
      if (Array.isArray(data.banks)) setBanks(data.banks);
      setPinCodeInput(data.pinnedBank.code);
      setLimitInput(String(data.summary.limitThb));
      if (Array.isArray(data.deliveryLog)) setDeliveryLog(data.deliveryLog);

      if (sendToTelegram && data.telegram?.ok) {
        showToast(
          data.pinned
            ? `📌 ปักหมุดบัญชีเข้า Telegram สำเร็จ! (Message #${data.telegram.messageId})`
            : `📨 ส่งการ์ดบัญชีเข้า Telegram แล้ว (Message #${data.telegram.messageId})`
        );
      } else {
        showToast(`📌 เปลี่ยนบัญชีหลักเป็น ${data.pinnedBank.code} · ${data.pinnedBank.account} แล้ว`);
      }
      setPanelMode('tx');
    } catch (e) {
      showToast(`❌ Smart PIN ล้มเหลว: ${String(e)}`);
    } finally {
      setLoadingAction(null);
    }
  }

  async function handleUpdatePin(sendToTelegram = false) {
    setLoadingAction(sendToTelegram ? 'pin-tg' : 'pin');
    try {
      const res = await fetch('/api/dashboard/pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: pinCodeInput,
          limitThb: Number(limitInput),
          sendToTelegram,
          pinInTelegram: true,
        }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setSummary(data.summary);
        fetchSettings();
        showToast(
          sendToTelegram && data.telegram?.ok
            ? `📌 ปักหมุดบัญชีเข้า Telegram สำเร็จ (${data.pinned ? 'Pinned ✓' : 'Sent ✓'})`
            : `📌 เปลี่ยนบัญชีหลักเป็น ${data.pinnedBank.code} แล้ว`
        );
        setPanelMode('tx');
      }
    } finally {
      setLoadingAction(null);
    }
  }

  async function handleUpdateRate() {
    setLoadingAction('rate');
    try {
      const res = await fetch('/api/dashboard/rate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rate: Number(rateInput) }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setSummary(data.summary);
        fetchMarket();
        showToast(`💱 ตั้งเรทโต๊ะเป็น ${data.rate.toFixed(2)} THB แล้ว`);
        setPanelMode('tx');
      }
    } finally {
      setLoadingAction(null);
    }
  }

  async function handleAutoRate() {
    setLoadingAction('rate-auto');
    try {
      const res = await fetch('/api/dashboard/rate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ auto: true }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setSummary(data.summary);
        setRateInput(String(data.rate));
        fetchMarket();
        showToast(`🤖 ตั้งเรทอัตโนมัติตาม Binance TH: ${data.rate.toFixed(2)} THB`);
        setPanelMode('tx');
      }
    } finally {
      setLoadingAction(null);
    }
  }

  async function handleNewCycle() {
    setLoadingAction('cycle');
    try {
      const res = await fetch('/api/dashboard/new-cycle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keepPending: true }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setSummary(data.summary);
        setTransactions(data.transactions);
        setCycleHistory(data.cycleHistory || []);
        fetchSettings();
        showToast(`🔄 ปิดรอบ ${data.oldCycle} → เปิดรอบ ${data.newCycle} สำเร็จ`);
        setPanelMode('tx');
      }
    } finally {
      setLoadingAction(null);
    }
  }

  async function handleResetDemo() {
    setLoadingAction('reset');
    try {
      const res = await fetch('/api/dashboard/reset-demo', { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.ok) {
        setSummary(data.summary);
        setTransactions(data.transactions);
        if (data.transactions?.[0]) setSelectedTxId(data.transactions[0].id);
        showToast('🔄 รีเซ็ตข้อมูลตัวอย่างแล้ว');
      }
    } finally {
      setLoadingAction(null);
    }
  }

  async function handleBotAction(slug: string, action: 'start' | 'pause' | 'maintenance' | 'retry' | 'dispatch') {
    setLoadingAction(`bot:${slug}:${action}`);
    try {
      const res = await fetch(`/api/bots/${encodeURIComponent(slug)}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        showToast(`❌ ${data.message || 'สั่งการบอทไม่สำเร็จ'}`);
        return;
      }
      if (Array.isArray(data.bots)) setBots(data.bots);
      if (data.summary) setFleetSummary(data.summary);
      if (Array.isArray(data.deliveryLog)) setDeliveryLog(data.deliveryLog);
      if (action === 'dispatch') {
        if (data.telegram?.ok) showToast(`🚀 ${data.bot.name} ส่งเข้า Telegram สำเร็จ (#${data.telegram.messageId})`);
        else showToast(`⚠️ ส่งเข้า Telegram ไม่สำเร็จ: ${data.telegram?.description || 'กรุณาตั้งค่า Token & Chat ID'}`);
      } else {
        showToast(`🤖 ${data.bot.name} → ${data.bot.status.toUpperCase()}`);
      }
    } finally {
      setLoadingAction(null);
    }
  }

  async function handleSaveBotConfig(slug: string, clearCustomToken = false) {
    setLoadingAction(`bot-cfg:${slug}`);
    try {
      const res = await fetch(`/api/bots/${encodeURIComponent(slug)}/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customToken: clearCustomToken ? '' : botCustomToken || undefined,
          clearCustomToken,
          customChatId: botCustomChatId,
          handle: botHandleInput || undefined,
        }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        if (Array.isArray(data.bots)) setBots(data.bots);
        if (data.summary) setFleetSummary(data.summary);
        setEditingBotSlug(null);
        setBotCustomToken('');
        showToast(`💾 บันทึกการตั้งค่า ${data.bot.name} แล้ว`);
      }
    } finally {
      setLoadingAction(null);
    }
  }

  async function handleBroadcastFleet() {
    setLoadingAction('broadcast-fleet');
    try {
      const res = await fetch('/api/bots/broadcast-fleet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (Array.isArray(data.deliveryLog)) setDeliveryLog(data.deliveryLog);
      if (res.ok && data.ok) showToast(`📡 ส่งสถานะบอททั้ง ${fleetSummary?.total || 14} ตัวเข้า Telegram สำเร็จ (#${data.messageId})`);
      else showToast(`❌ ส่งไม่สำเร็จ: ${data.description || 'กรุณาตั้งค่า Telegram Bot'}`);
    } finally {
      setLoadingAction(null);
    }
  }

  async function handleVerifyBot() {
    setLoadingAction('tg-verify');
    setTgStatusBanner(null);
    try {
      const res = await fetch('/api/telegram/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ botToken: botTokenInput }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        const msg = `ตรวจสอบบอทไม่สำเร็จ: ${data.description || 'Invalid Token'}`;
        setTgStatusBanner({ ok: false, text: msg });
        showToast(`❌ ${msg}`);
        return;
      }
      setBotInfo(data.bot);
      const okMsg = `เชื่อมต่อบอทสำเร็จ: @${data.bot.username} (${data.bot.firstName}) · ${data.latencyMs}ms`;
      setTgStatusBanner({ ok: true, text: okMsg });
      showToast(`✅ ${okMsg}`);
    } finally {
      setLoadingAction(null);
    }
  }

  async function handleDetectChats() {
    setLoadingAction('tg-detect');
    try {
      const res = await fetch('/api/telegram/detect-chats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ botToken: botTokenInput }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setTgStatusBanner({ ok: false, text: data.description || 'ดึงแชทไม่สำเร็จ' });
        return;
      }
      setDetectedChats(data.chats || []);
      if (data.chats?.length > 0) {
        if (!chatIdInput) setChatIdInput(data.chats[0].id);
        setTgStatusBanner({ ok: true, text: `พบห้องแชท ${data.chats.length} รายการ — คลิกเลือกได้เลย` });
      } else {
        setTgStatusBanner({ ok: false, text: 'ยังไม่พบแชทล่าสุด กรุณาทักบอท 1 ครั้งแล้วลองใหม่' });
      }
    } finally {
      setLoadingAction(null);
    }
  }

  async function handleSaveSettings(clearToken = false) {
    setLoadingAction('save-settings');
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          botToken: clearToken ? '' : botTokenInput || undefined,
          clearToken,
          chatId: chatIdInput,
          notifyEvents,
          rateSpread: Number(spreadInput),
          customApiBaseUrl: customApiUrlInput,
        }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setBotTokenInput('');
        if (clearToken) setBotInfo(null);
        setHasSavedToken(Boolean(data.telegram?.hasToken));
        setMaskedToken(data.telegram?.maskedToken || '');
        if (data.telegram?.botInfo !== undefined) setBotInfo(data.telegram.botInfo);
        await Promise.all([fetchMarket(), fetchVault(), fetchSettings(), fetchBots()]);
        setTgStatusBanner({
          ok: true,
          text: clearToken ? 'ล้าง Token บอทแล้ว' : 'บันทึกการตั้งค่าเรียบร้อยแล้ว (Settings Saved)',
        });
        showToast('✅ บันทึกการตั้งค่าสำเร็จ');
      }
    } finally {
      setLoadingAction(null);
    }
  }

  async function handleSendTelegramLive(customText?: string, eventLabel = 'live-test') {
    setLoadingAction(`tg-send:${eventLabel}`);
    try {
      const res = await fetch('/api/telegram/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          botToken: botTokenInput || undefined,
          chatId: chatIdInput || undefined,
          text: customText ?? (customTestMsg.trim() || undefined),
          event: eventLabel,
        }),
      });
      const data = await res.json();
      if (Array.isArray(data.deliveryLog)) setDeliveryLog(data.deliveryLog);
      if (!res.ok || !data.ok) {
        setTgStatusBanner({ ok: false, text: data.description || 'ส่งไม่สำเร็จ' });
        showToast(`❌ ส่งไม่สำเร็จ: ${data.description || 'Error'}`);
        return;
      }
      setTgStatusBanner({ ok: true, text: `ส่งเข้า ${data.chatTitle} สำเร็จ! (msg #${data.messageId} · ${data.latencyMs}ms)` });
      showToast(`🚀 ส่งเข้า Telegram สำเร็จ (#${data.messageId})`);
    } finally {
      setLoadingAction(null);
    }
  }

  async function handleRefreshMarketNow() {
    setLoadingAction('refresh-mkt');
    try {
      const res = await fetch('/api/market?refresh=1');
      if (res.ok) {
        const m = await res.json();
        setMarket(m);
        await fetchVault();
        showToast(`📈 อัปเดต Binance TH: ${m.rate?.toFixed(2) || '—'} THB`);
      }
    } finally {
      setLoadingAction(null);
    }
  }

  async function handlePingApi() {
    setLoadingAction('ping-api');
    try {
      const t0 = performance.now();
      const res = await fetch('/api/healthz');
      const ms = Math.round(performance.now() - t0);
      setApiLatencyMs(ms);
      setApiHealthy(res.ok);
      showToast(res.ok ? `🩺 API ปกติ (200 OK · ${ms}ms)` : `❌ API ผิดปกติ (${res.status})`);
    } catch {
      setApiHealthy(false);
      showToast('❌ เชื่อมต่อ API ไม่ได้');
    } finally {
      setLoadingAction(null);
    }
  }

  function copyText(txt: string, label = 'คัดลอกข้อความแล้ว') {
    navigator.clipboard?.writeText(txt);
    showToast(`📋 ${label}`);
  }

  function renderBotMessageForTx(tx: Transaction): string {
    if (!summary) return '';
    const slipStamp = tx.slipDate || formatThaiSlipDateTime();
    if (tx.dateMismatch) {
      return MSG.SLIP_DATE_MISMATCH({
        thb: fmtThb(tx.thb),
        rate: tx.rate.toFixed(2),
        bank: tx.bank,
        account: tx.account,
        slip_time: slipStamp,
      });
    }
    if (tx.status === 'READY') {
      return MSG.OCR_READY({
        thb: fmtThb(tx.thb),
        usdt: fmtUsdt(tx.usdtExpected),
        usdt_expected: fmtUsdt(tx.usdtExpected),
        usdt_sent: fmtUsdt(tx.usdtSent),
        usdt_outstanding: fmtUsdt(Math.max(0, tx.usdtExpected - tx.usdtSent)),
        bank: tx.bank,
        account: tx.account,
        name: tx.sender,
        rate: tx.rate.toFixed(2),
        confidence: tx.confidence,
        slip_time: slipStamp,
      });
    }
    if (tx.status === 'PENDING') {
      return MSG.TX_QUEUED({
        id: tx.id,
        thb: fmtThb(tx.thb),
        usdt: fmtUsdt(tx.usdtExpected),
        usdt_sent: fmtUsdt(tx.usdtSent),
        usdt_outstanding: fmtUsdt(Math.max(0, tx.usdtExpected - tx.usdtSent)),
        bank: tx.bank,
        account: tx.account,
        rate: tx.rate.toFixed(2),
        slip_time: slipStamp,
      });
    }
    if (tx.status === 'SETTLED') {
      return MSG.TX_SETTLED({
        id: tx.id,
        thb: fmtThb(tx.thb),
        usdt: fmtUsdt(tx.usdtSent),
        usdt_expected: fmtUsdt(tx.usdtExpected),
        bank: tx.bank,
        account: tx.account,
        rate: tx.rate.toFixed(2),
        slip_time: slipStamp,
      });
    }
    if (tx.status === 'SHORT') {
      return MSG.TX_SHORT({
        id: tx.id,
        thb: fmtThb(tx.thb),
        rate: tx.rate.toFixed(2),
        bank: tx.bank,
        account: tx.account,
        usdt_expected: fmtUsdt(tx.usdtExpected),
        usdt_sent: fmtUsdt(tx.usdtSent),
        usdt_short: fmtUsdt(Math.max(0, tx.usdtExpected - tx.usdtSent)),
        slip_time: slipStamp,
      });
    }
    if (tx.status === 'MISMATCH') {
      return MSG.BANK_MISMATCH({
        thb: fmtThb(tx.thb),
        rate: tx.rate.toFixed(2),
        bank: tx.bank,
        account: tx.account,
        slip_time: slipStamp,
      })
        .replace('[PIN_BANK]', summary.pinnedBank.code)
        .replace('[PIN_ACCOUNT]', summary.pinnedBank.account);
    }
    if (tx.status === 'REVIEW') {
      return MSG.OCR_LOW_CONFIDENCE({
        thb: fmtThb(tx.thb),
        bank: tx.bank,
        account: tx.account,
        name: tx.sender,
        rate: tx.rate.toFixed(2),
        confidence: tx.confidence,
        slip_time: slipStamp,
      });
    }
    if (tx.status === 'REJECTED') {
      return MSG.TX_REJECTED({ id: tx.id, thb: fmtThb(tx.thb), reason: tx.notes || 'ปฏิเสธรายการ' });
    }
    if (tx.status === 'REVERSED') {
      return MSG.TX_REVERSED({ id: tx.id, thb: fmtThb(tx.thb), usdt: fmtUsdt(tx.usdtSent), operator: 'ADMIN', reason: tx.notes || 'ยกเลิก' });
    }
    return MSG.OCR_LOADING();
  }

  const smartPinPreview = parseSmartPinText(smartPinInput, Number(limitInput) || summary?.limitThb || 500000);
  const tgConnected = Boolean((hasSavedToken || botTokenInput.trim()) && chatIdInput.trim());

  const actionNeededCount = transactions.filter((t) =>
    ['READY', 'SHORT', 'MISMATCH', 'REVIEW', 'OCR'].includes(t.status)
  ).length;

  const filteredTransactions = transactions.filter((t) => {
    if (queueFilter === 'ALL') return true;
    if (queueFilter === 'ACTION') return ['READY', 'SHORT', 'MISMATCH', 'REVIEW', 'OCR'].includes(t.status);
    if (queueFilter === 'PENDING') return t.status === 'PENDING';
    if (queueFilter === 'SETTLED') return t.status === 'SETTLED';
    return true;
  });

  const currentScanCard =
    scanResultMsg ||
    MSG.OCR_READY({
      thb: fmtThb(Number(scanThb || 10000)),
      usdt: fmtUsdt(Number(scanThb || 10000) / (summary?.rate || 34.23)),
      bank: scanBank,
      account: scanAccount,
      name: scanSender,
      rate: (summary?.rate || 34.23).toFixed(2),
      confidence: Number(scanConfidence || 98.7),
      slip_time: scanSlipDate,
    });

  const messageTemplatesList = [
    {
      key: 'PIN-01',
      group: 'PIN & Verify',
      title: 'ปักหมุดบัญชีรับเงิน (Smart PIN Card)',
      text: MSG.SMART_PIN_CARD({ bank: 'KBANK', account: '1230004444', name: 'ธิติ ทองมี', limit: '50,000' }),
    },
    {
      key: 'SLIP-01',
      group: 'PIN & Verify',
      title: 'วันที่สลิปไม่ตรงกับปัจจุบัน (Date Mismatch)',
      text: MSG.SLIP_DATE_MISMATCH({ thb: '5,000.00', rate: '44.00', bank: 'KTB', account: '••••1670', slip_time: '13/12/2569 19:39' }),
    },
    {
      key: 'SLIP-02',
      group: 'PIN & Verify',
      title: 'สลิปปกติพร้อมโอน (OCR Ready)',
      text: MSG.OCR_READY({ thb: '10,000.00', usdt: '292.14', bank: 'KBANK', account: '1230004444', name: 'นาย สมชาย ใจดี', rate: '34.23', confidence: 98.7 }),
    },
    {
      key: 'SLIP-03',
      group: 'PIN & Verify',
      title: 'บัญชีในสลิปไม่ตรง PIN (Bank Mismatch)',
      text: MSG.BANK_MISMATCH({ thb: '15,000.00', rate: '34.23', bank: 'KTB', account: '••••7413' })
        .replace('[PIN_BANK]', summary?.pinnedBank.code || 'KBANK')
        .replace('[PIN_ACCOUNT]', summary?.pinnedBank.account || '1230004444'),
    },
    {
      key: 'TX-01',
      group: 'Settlement',
      title: 'โอนเหรียญครบสมบูรณ์ (Settled)',
      text: MSG.TX_SETTLED({ id: '#CE-2026-A041', thb: '10,000.00', usdt: '292.14', bank: 'KBANK', account: '1230004444', rate: '34.23' }),
    },
    {
      key: 'TX-02',
      group: 'Settlement',
      title: 'ยอดโอนเหรียญขาด (Short)',
      text: MSG.TX_SHORT({ id: '#CE-2026-A043', thb: '10,000.00', rate: '34.23', bank: 'KBANK', account: '1230004444', usdt_expected: '292.14', usdt_sent: '289.58', usdt_short: '2.56' }),
    },
    {
      key: 'CYC-01',
      group: 'Cycle & Alerts',
      title: 'สรุปรอบงานปัจจุบัน (Cycle Summary)',
      text: MSG.CYCLE_SUMMARY({
        cycle_current: summary?.cycle || 'CE44',
        limit: fmtInt(summary?.limitThb || 500000),
        used: fmtInt(summary?.usedThb || 327450),
        remaining: fmtInt(summary?.remainingThb || 172550),
        thb: fmtInt(summary?.receivedThb || 327450),
        usdt: fmtUsdt(summary?.sentUsdt || 7614.32),
        usdt_expected: fmtUsdt(summary?.pendingUsdt || 184.32),
        usdt_short: fmtUsdt(summary?.shortUsdt || 2.56),
        profit: fmtThb(summary?.profitThb || 8742.5),
        rate: String(summary?.rate || 34.23),
      }),
    },
    {
      key: 'ALT-01',
      group: 'Cycle & Alerts',
      title: 'แจ้งเตือนวงเงินแตะ 80% (Limit Alert)',
      text: MSG.ALERT_LIMIT_80({ cycle_current: summary?.cycle || 'CE44', used: '405,000', limit: '500,000', remaining: '95,000', percent: 81 }),
    },
  ];

  const pinnedAsset = resolveBankAsset(summary?.pinnedBank.code);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--b0)', color: 'var(--t1)', display: 'flex', flexDirection: 'column' }}>
      {/* ── CLEAN TOP NAVIGATION BAR (ONLY 4 CLEAR TABS) ── */}
      <header
        style={{
          background: 'var(--hdr)',
          backdropFilter: 'blur(14px)',
          borderBottom: '1px solid var(--br)',
          position: 'sticky',
          top: 0,
          zIndex: 50,
        }}
      >
        <div
          style={{
            maxWidth: '1280px',
            margin: '0 auto',
            padding: '12px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '14px',
            flexWrap: 'wrap',
          }}
        >
          {/* Brand */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '10px',
                background: 'var(--ca)',
                border: '1px solid var(--cb)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <CeIcon name="gem" size={18} color="var(--c)" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '15px', fontWeight: 800, letterSpacing: '1.2px', color: 'var(--t1)' }}>
                  CE VAULT
                </span>
                <span
                  style={{
                    fontSize: '10px',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '9999px',
                    background: 'var(--ga)',
                    color: 'var(--g)',
                    fontFamily: "'Space Mono', monospace",
                  }}
                >
                  {summary?.cycle || 'CE44'}
                </span>
              </div>
              <div style={{ fontSize: '10px', color: 'var(--t3)' }}>โต๊ะแลกเปลี่ยน (Operator Desk)</div>
            </div>
          </div>

          {/* 4 Clean Primary Navigation Tabs */}
          <nav
            className="ce-main-nav"
            aria-label="เมนูหลัก (Main navigation)"
            style={{
              display: 'flex',
              gap: '4px',
              background: 'var(--b1)',
              padding: '4px',
              borderRadius: '12px',
              border: '1px solid var(--br)',
              flexWrap: 'wrap',
            }}
          >
            {(
              [
                { id: 'desk', label: 'หน้าหลัก (Desk)', short: 'หน้าหลัก', icon: 'gem' },
                { id: 'scan', label: 'รับสลิป (Scan)', short: 'รับสลิป', icon: 'scan' },
                { id: 'bots', label: `บอททั้งหมด (${fleetSummary?.total || 14})`, short: 'บอท', icon: 'bot' },
                { id: 'settings', label: 'ตั้งค่า (Settings)', short: 'ตั้งค่า', icon: 'settings' },
              ] as { id: MainTab; label: string; short: string; icon: IconName }[]
            ).map((t) => (
              <button
                key={t.id}
                id={`nav-${t.id}`}
                onClick={() => setActiveTab(t.id)}
                aria-current={activeTab === t.id ? 'page' : undefined}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  padding: '7px 15px',
                  borderRadius: '9px',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  border: 'none',
                  background: activeTab === t.id ? 'var(--c)' : 'transparent',
                  color: activeTab === t.id ? 'var(--on-c)' : 'var(--t2)',
                }}
              >
                <CeIcon name={t.icon} size={14} color={activeTab === t.id ? 'var(--on-c)' : 'currentColor'} />
                <span className="ce-nav-long">{t.label}</span>
                <span className="ce-nav-short">{t.short}</span>
              </button>
            ))}
          </nav>

          {/* Theme switcher + Compact Live Binance TH + Status */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <div className="ce-theme-switch" role="radiogroup" aria-label="ธีม (Theme)">
              {THEMES.map((th) => (
                <button
                  key={th.id}
                  id={`theme-${th.id}`}
                  role="radio"
                  aria-checked={theme === th.id}
                  className={theme === th.id ? 'is-active' : ''}
                  onClick={() => setTheme(th.id)}
                  title={`ธีม ${th.label}`}
                >
                  <span className="ce-theme-swatch" style={{ background: th.swatch }} />
                  <span className="ce-theme-label">{th.label}</span>
                </button>
              ))}
            </div>
            <button
              onClick={handleRefreshMarketNow}
              title="คลิกเพื่ออัปเดตเรทตลาดสดจาก Binance TH"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '7px',
                padding: '6px 12px',
                borderRadius: '10px',
                background: 'var(--b2)',
                border: '1px solid var(--br)',
                color: 'var(--t1)',
                fontSize: '12px',
                cursor: 'pointer',
              }}
            >
              <span
                style={{
                  width: '7px',
                  height: '7px',
                  borderRadius: '50%',
                  background: apiHealthy ? 'var(--s)' : 'var(--d)',
                }}
              />
              <span style={{ color: 'var(--t3)', fontSize: '11px' }}>Binance TH</span>
              <strong style={{ color: 'var(--c)', fontFamily: "'Space Mono', monospace" }}>
                {market?.rate ? market.rate.toFixed(2) : '—'}
              </strong>
            </button>
          </div>
        </div>
      </header>

      {/* ── TOAST ── */}
      {toast && (
        <div
          style={{
            position: 'fixed',
            bottom: '22px',
            right: '22px',
            zIndex: 100,
            background: 'var(--b3)',
            border: '1px solid var(--cb)',
            color: 'var(--t1)',
            padding: '12px 18px',
            borderRadius: '12px',
            boxShadow: '0 14px 36px rgba(0,0,0,0.55)',
            fontSize: '13px',
            fontWeight: 600,
            maxWidth: '420px',
          }}
        >
          {toast}
        </div>
      )}

      {/* ── MAIN CONTAINER ── */}
      <main style={{ flex: 1, maxWidth: '1280px', width: '100%', margin: '0 auto', padding: '20px' }}>
        {/* ═══════════════════════════════════════════════════════ */}
        {/* TAB 1: หน้าหลัก (SIMPLE & CLEAN OPERATOR DESK) */}
        {/* ═══════════════════════════════════════════════════════ */}
        {activeTab === 'desk' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* KPI STRIP: the 4 numbers operators glance at most */}
            <section className="ce-kpi-strip" aria-label="สรุปยอดรอบนี้ (Cycle summary)">
              <div className="ce-kpi">
                <div className="ce-kpi__label">รับเงิน (THB Received)</div>
                <div className="ce-kpi__value" style={{ color: 'var(--s)' }}>฿{fmtInt(summary?.receivedThb || 0)}</div>
                <div className="ce-kpi__hint">รอบ {summary?.cycle || 'CE44'}</div>
              </div>
              <div className="ce-kpi">
                <div className="ce-kpi__label">โอนแล้ว (USDT Sent)</div>
                <div className="ce-kpi__value" style={{ color: 'var(--c)' }}>{fmtUsdt(summary?.sentUsdt || 0)}</div>
                <div className="ce-kpi__hint">USDT</div>
              </div>
              <div className="ce-kpi">
                <div className="ce-kpi__label">ค้างส่ง / ขาด (Outstanding)</div>
                <div className="ce-kpi__value" style={{ color: (summary?.shortUsdt || 0) > 0 ? 'var(--al)' : 'var(--w)' }}>
                  {fmtUsdt((summary?.pendingUsdt || 0) + (summary?.shortUsdt || 0))}
                </div>
                <div className="ce-kpi__hint">{actionNeededCount} รายการต้องจัดการ</div>
              </div>
              <div className="ce-kpi">
                <div className="ce-kpi__label">กำไรรอบนี้ (Profit)</div>
                <div className="ce-kpi__value" style={{ color: 'var(--g)' }}>฿{fmtInt(summary?.profitThb || 0)}</div>
                <div className="ce-kpi__hint">เรท {summary ? summary.rate.toFixed(2) : '—'}</div>
              </div>
            </section>

            {/* HERO ROW: PINNED BANK + RATE */}
            <div className="ce-hero-grid">
              {/* CARD A: บัญชีรับเงินวันนี้ (WITH REAL THAI BANK LOGO) */}
              <div
                className="ce-card"
                style={{
                  background: 'var(--b2)',
                  border: '1px solid var(--br)',
                  borderRadius: '18px',
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '16px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <BankLogo code={summary?.pinnedBank.code || 'KBANK'} size={52} />
                    <div>
                      <div style={{ fontSize: '11px', color: 'var(--t3)', fontWeight: 600 }}>
                        📌 บัญชีรับเงินวันนี้ (Today's PIN)
                      </div>
                      <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--t1)', marginTop: '2px' }}>
                        {pinnedAsset.thai} ({summary?.pinnedBank.code || 'BBL'})
                      </div>
                      <div style={{ fontSize: '13px', color: 'var(--c)', fontFamily: "'Space Mono', monospace", fontWeight: 700 }}>
                        {summary?.pinnedBank.account || '097-0-28xxx-x'} · <span style={{ color: 'var(--t2)', fontFamily: 'inherit', fontWeight: 500 }}>{summary?.pinnedBank.holder || ''}</span>
                      </div>
                    </div>
                  </div>
                  <CeButton
                    variant="primary"
                    size="sm"
                    onClick={() => setPanelMode('pin')}
                    icon={<CeIcon name="pin" size={14} color="var(--on-c)" />}
                  >
                    เปลี่ยนบัญชี (Smart PIN)
                  </CeButton>
                </div>

                {/* Clean Limit Progress Bar */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '6px' }}>
                    <span style={{ color: 'var(--t2)' }}>
                      ใช้ไป <strong style={{ color: 'var(--t1)', fontFamily: "'Space Mono', monospace" }}>฿{fmtInt(summary?.usedThb || 0)}</strong> / ฿{fmtInt(summary?.limitThb || 500000)}
                    </span>
                    <span style={{ color: 'var(--s)', fontWeight: 700, fontFamily: "'Space Mono', monospace" }}>
                      เหลือ ฿{fmtInt(summary?.remainingThb || 0)} ({summary?.usedPercent || 0}%)
                    </span>
                  </div>
                  <div style={{ height: '7px', background: 'var(--b1)', borderRadius: '9999px', overflow: 'hidden' }}>
                    <div
                      style={{
                        width: `${Math.min(100, summary?.usedPercent || 0)}%`,
                        height: '100%',
                        background: (summary?.usedPercent || 0) >= 85 ? 'var(--al)' : 'linear-gradient(90deg, var(--c), var(--s))',
                        borderRadius: '9999px',
                        transition: 'width 0.3s ease',
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* CARD B: เรทโต๊ะ & สรุปยอดวันนี้ */}
              <div
                className="ce-card"
                style={{
                  background: 'var(--b2)',
                  border: '1px solid var(--br)',
                  borderRadius: '18px',
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '16px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '14px', flexWrap: 'wrap' }}>
                    <div>
                      <div style={{ fontSize: '11px', color: 'var(--t3)', fontWeight: 600 }}>💱 เรทโต๊ะ (Desk Rate)</div>
                      <div style={{ fontSize: '26px', fontWeight: 800, color: 'var(--g)', fontFamily: "'Space Mono', monospace", lineHeight: 1.15 }}>
                        {summary ? summary.rate.toFixed(2) : '34.23'} <span style={{ fontSize: '12px', fontWeight: 500 }}>THB</span>
                      </div>
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--t2)' }}>
                      ตลาด Binance TH: <strong style={{ color: 'var(--c)', fontFamily: "'Space Mono', monospace" }}>{market?.rate ? market.rate.toFixed(2) : '—'}</strong>
                      <span style={{ marginLeft: '6px', fontSize: '10px', color: 'var(--t3)' }}>({market?.rateMode === 'auto' ? 'AUTO' : 'MANUAL'})</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <CeButton variant="outline" size="sm" onClick={() => setPanelMode('rate')}>
                      ปรับเรท
                    </CeButton>
                    <CeButton variant="ghost" size="sm" onClick={() => setPanelMode('cycle')}>
                      ปิดรอบ {summary?.cycle || 'CE44'}
                    </CeButton>
                  </div>
                </div>

                {/* Binance TH 24h range */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '10px', paddingTop: '12px', borderTop: '1px solid var(--br)' }}>
                  {[
                    { label: 'ต่ำสุด 24 ชม. (Low)', value: market?.low24h ? market.low24h.toFixed(2) : '—', color: 'var(--t1)' },
                    { label: 'สูงสุด 24 ชม. (High)', value: market?.high24h ? market.high24h.toFixed(2) : '—', color: 'var(--t1)' },
                    {
                      label: 'เปลี่ยนแปลง (24h)',
                      value: market?.changePercent !== undefined ? `${market.changePercent >= 0 ? '+' : ''}${market.changePercent.toFixed(2)}%` : '—',
                      color: (market?.changePercent || 0) >= 0 ? 'var(--s)' : 'var(--al)',
                    },
                  ].map((m) => (
                    <div key={m.label}>
                      <div style={{ fontSize: '11px', color: 'var(--t3)' }}>{m.label}</div>
                      <div style={{ fontSize: '15px', fontWeight: 700, color: m.color, fontFamily: "'Space Mono', monospace", marginTop: '2px' }}>{m.value}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* WORKSPACE ROW: LEFT QUEUE + RIGHT CLEAR ACTION PANEL */}
            <div className="ce-workspace-grid">
              {/* LEFT: CLEAN TRANSACTION QUEUE */}
              <div
                className="ce-card"
                style={{
                  background: 'var(--b1)',
                  border: '1px solid var(--br)',
                  borderRadius: '18px',
                  padding: '18px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '14px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap' }}>
                  <div>
                    <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--t1)' }}>
                      รายการวันนี้ ({filteredTransactions.length})
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--t3)' }}>คลิกรายการเพื่อโอนเหรียญหรืออนุมัติ</div>
                  </div>
                  <CeButton
                    variant="primary"
                    size="sm"
                    onClick={() => setActiveTab('scan')}
                    icon={<CeIcon name="scan" size={14} color="var(--on-c)" />}
                  >
                    + รับสลิปใหม่
                  </CeButton>
                </div>

                {/* Simple 4 Filter Tabs */}
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {(
                    [
                      { id: 'ALL', label: `ทั้งหมด (${transactions.length})` },
                      { id: 'ACTION', label: `ต้องจัดการ (${actionNeededCount})` },
                      { id: 'PENDING', label: `รอโอน (${summary?.counts?.PENDING || 0})` },
                      { id: 'SETTLED', label: `เสร็จแล้ว (${summary?.counts?.SETTLED || 0})` },
                    ] as { id: SimpleQueueFilter; label: string }[]
                  ).map((f) => (
                    <button
                      key={f.id}
                      onClick={() => setQueueFilter(f.id)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '9999px',
                        fontSize: '12px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        border: queueFilter === f.id ? '1px solid var(--cb)' : '1px solid var(--br)',
                        background: queueFilter === f.id ? 'var(--ca)' : 'var(--b2)',
                        color: queueFilter === f.id ? 'var(--c)' : 'var(--t2)',
                      }}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>

                {/* Queue List */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {filteredTransactions.map((tx) => (
                    <TxItem
                      key={tx.id}
                      id={tx.id}
                      thb={fmtThb(tx.thb)}
                      usdt={fmtUsdt(tx.usdtExpected)}
                      bank={tx.bank}
                      sender={tx.sender}
                      time={tx.time}
                      status={tx.status}
                      selected={selectedTx?.id === tx.id && panelMode === 'tx'}
                      onClick={() => {
                        setSelectedTxId(tx.id);
                        setPanelMode('tx');
                      }}
                    />
                  ))}
                  {filteredTransactions.length === 0 && (
                    <div style={{ padding: '36px', textAlign: 'center', color: 'var(--t3)', fontSize: '13px' }}>
                      ไม่มีรายการในหมวดนี้ (Empty)
                    </div>
                  )}
                </div>
              </div>

              {/* RIGHT: FOCUSED ACTION PANEL */}
              <div
                className="ce-card"
                style={{
                  background: 'var(--b2)',
                  border: '1px solid var(--br)',
                  borderRadius: '18px',
                  padding: '22px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '18px',
                  position: 'sticky',
                  top: '76px',
                }}
              >
                {/* ── MODE 1: SELECTED TRANSACTION ── */}
                {panelMode === 'tx' && selectedTx && (
                  <>
                    {/* Header with Real Bank Logo */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <BankLogo code={selectedTx.bank} size={46} />
                        <div>
                          <div style={{ fontSize: '11px', color: 'var(--t3)', fontFamily: "'Space Mono', monospace" }}>
                            {selectedTx.id} · {selectedTx.slipDate || `${selectedTx.time} น.`}
                          </div>
                          <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--t1)', fontFamily: "'Space Mono', monospace" }}>
                            ฿{fmtThb(selectedTx.thb)}
                          </div>
                        </div>
                      </div>
                      <StatusBadge status={selectedTx.status} />
                    </div>

                    {/* Clean Key Details */}
                    <div
                      style={{
                        background: 'var(--b1)',
                        borderRadius: '14px',
                        padding: '15px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '10px',
                        fontSize: '13px',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--t3)' }}>ยอดต้องโอน (Expected)</span>
                        <strong style={{ color: 'var(--c)', fontFamily: "'Space Mono', monospace", fontSize: '15px' }}>
                          {fmtUsdt(selectedTx.usdtExpected)} USDT
                        </strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--t3)' }}>โอนไปแล้ว (Sent)</span>
                        <strong style={{ color: 'var(--s)', fontFamily: "'Space Mono', monospace" }}>
                          {fmtUsdt(selectedTx.usdtSent)} USDT
                        </strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--t3)' }}>บัญชีสลิป (Slip Bank)</span>
                        <strong
                          style={{
                            color: selectedTx.bank.toUpperCase() === summary?.pinnedBank.code.toUpperCase() ? 'var(--s)' : '#ff6d35',
                            fontFamily: "'Space Mono', monospace",
                          }}
                        >
                          {resolveBankAsset(selectedTx.bank).thai} ({selectedTx.bank}) · {selectedTx.account}
                        </strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--t3)' }}>ผู้โอน (Sender)</span>
                        <span>{selectedTx.sender}</span>
                      </div>
                      {selectedTx.notes && (
                        <div style={{ paddingTop: '10px', borderTop: '1px solid var(--br)', fontSize: '12px', color: 'var(--t2)' }}>
                          ℹ️ {selectedTx.notes}
                        </div>
                      )}
                    </div>

                    {/* MISMATCH FLOW WITH VISUAL BANK LOGO COMPARISON */}
                    {selectedTx.status === 'MISMATCH' && (
                      <div
                        style={{
                          background: 'rgba(255, 109, 53, 0.08)',
                          border: '1px solid rgba(255, 109, 53, 0.35)',
                          borderRadius: '14px',
                          padding: '16px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '12px',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <BankLogo code={selectedTx.bank} size={38} />
                            <div>
                              <div style={{ fontSize: '10px', color: 'var(--t3)' }}>ในสลิป (Slip)</div>
                              <strong style={{ color: '#ff6d35', fontSize: '13px' }}>{selectedTx.bank}</strong>
                            </div>
                          </div>
                          <span style={{ fontSize: '20px', fontWeight: 800, color: '#ff6d35' }}>≠</span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{ textAlign: 'right' }}>
                              <div style={{ fontSize: '10px', color: 'var(--t3)' }}>บัญชี PIN วันนี้</div>
                              <strong style={{ color: 'var(--s)', fontSize: '13px' }}>{summary?.pinnedBank.code}</strong>
                            </div>
                            <BankLogo code={summary?.pinnedBank.code} size={38} />
                          </div>
                        </div>

                        <input
                          className="ce-input"
                          value={overrideReason}
                          onChange={(e) => setOverrideReason(e.target.value)}
                          placeholder="เหตุผลอนุมัติพิเศษ (Override Reason)"
                        />

                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                          <CeButton
                            variant="warning"
                            fullWidth
                            onClick={() => handleTxAction(selectedTx.id, 'override', { reason: overrideReason })}
                            loading={loadingAction === `${selectedTx.id}:override`}
                          >
                            ⚡ อนุมัติพิเศษ (Override → Ready)
                          </CeButton>
                          <CeButton
                            variant="outline"
                            size="sm"
                            onClick={() => handleTxAction(selectedTx.id, 'recheck')}
                            loading={loadingAction === `${selectedTx.id}:recheck`}
                          >
                            ตรวจซ้ำ (Recheck)
                          </CeButton>
                          <CeButton
                            variant="danger"
                            size="sm"
                            onClick={() => handleTxAction(selectedTx.id, 'reject', { reason: 'บัญชีไม่ตรง' })}
                            loading={loadingAction === `${selectedTx.id}:reject`}
                          >
                            ปฏิเสธ (Reject)
                          </CeButton>
                        </div>
                      </div>
                    )}

                    {/* REVIEW / DATE MISMATCH FLOW */}
                    {(selectedTx.status === 'REVIEW' || selectedTx.status === 'OCR') && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <CeButton
                          variant="success"
                          fullWidth
                          onClick={() => handleTxAction(selectedTx.id, 'confirm')}
                          loading={loadingAction === `${selectedTx.id}:confirm`}
                          icon={<CeIcon name="check" size={15} color="var(--on-c)" />}
                        >
                          ✓ ยืนยันสลิปถูกต้อง (Confirm → Ready)
                        </CeButton>
                        <CeButton
                          variant="danger"
                          size="sm"
                          fullWidth
                          onClick={() => handleTxAction(selectedTx.id, 'reject', { reason: 'สลิปไม่ผ่านการตรวจสอบ' })}
                          loading={loadingAction === `${selectedTx.id}:reject`}
                        >
                          ❌ ปฏิเสธรายการ (Reject)
                        </CeButton>
                      </div>
                    )}

                    {/* SETTLEMENT / SHORT RECOVERY */}
                    {(selectedTx.status === 'READY' || selectedTx.status === 'PENDING' || selectedTx.status === 'SHORT') && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                          <span style={{ color: selectedTx.status === 'SHORT' ? 'var(--al)' : 'var(--t2)', fontWeight: 700 }}>
                            {selectedTx.status === 'SHORT'
                              ? `ยอดส่งขาด (Shortfall): ${fmtUsdt(selectedTx.usdtExpected - selectedTx.usdtSent)} USDT`
                              : `ยอดโอนครั้งนี้ (Remaining: ${fmtUsdt(selectedTx.usdtExpected - selectedTx.usdtSent)} USDT)`}
                          </span>
                          <button
                            onClick={() =>
                              setSettleAmount(
                                String(Number(Math.max(1, selectedTx.usdtExpected - selectedTx.usdtSent - 2.56).toFixed(2)))
                              )
                            }
                            style={{ background: 'none', border: 'none', color: 'var(--t3)', fontSize: '11px', cursor: 'pointer', textDecoration: 'underline' }}
                          >
                            จำลองส่งขาด (-2.56)
                          </button>
                        </div>

                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                          <input
                            className="ce-input"
                            type="number"
                            step="0.01"
                            value={settleAmount}
                            onChange={(e) => setSettleAmount(e.target.value)}
                            style={{ fontFamily: "'Space Mono', monospace", fontSize: '16px', fontWeight: 700 }}
                          />
                          <span style={{ fontFamily: "'Space Mono', monospace", fontWeight: 700, color: 'var(--c)' }}>USDT</span>
                        </div>

                        <CeButton
                          variant="success"
                          size="lg"
                          fullWidth
                          onClick={() =>
                            handleTxAction(
                              selectedTx.id,
                              selectedTx.status === 'SHORT' ? 'recover-short' : 'settle',
                              { usdt: Number(settleAmount) }
                            )
                          }
                          loading={loadingAction === `${selectedTx.id}:settle` || loadingAction === `${selectedTx.id}:recover-short`}
                          icon={<CeIcon name="check" size={16} color="var(--on-c)" />}
                        >
                          {selectedTx.status === 'SHORT'
                            ? 'โอนชดเชยยอดขาด (Recover Short)'
                            : 'ยืนยันโอนเหรียญ (Submit Settlement)'}
                        </CeButton>
                      </div>
                    )}

                    {/* SETTLED */}
                    {selectedTx.status === 'SETTLED' && (
                      <div
                        style={{
                          background: 'var(--sa)',
                          border: '1px solid var(--sb)',
                          borderRadius: '14px',
                          padding: '15px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '10px',
                        }}
                      >
                        <div>
                          <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--s)' }}>โอนเหรียญครบแล้ว ✓</div>
                          <div style={{ fontSize: '12px', color: 'var(--t2)' }}>
                            ยอดโอนรวม {fmtUsdt(selectedTx.usdtSent)} USDT
                          </div>
                        </div>
                        <CeButton
                          variant="ghost"
                          size="sm"
                          onClick={() => handleTxAction(selectedTx.id, 'reverse', { reason: 'Admin Reverse' })}
                          loading={loadingAction === `${selectedTx.id}:reverse`}
                        >
                          ย้อนกลับ
                        </CeButton>
                      </div>
                    )}

                    {/* CLEAN COLLAPSIBLE TELEGRAM PREVIEW */}
                    <div style={{ borderTop: '1px solid var(--br)', paddingTop: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                        <button
                          onClick={() => setShowBotCardPreview((v) => !v)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--t2)',
                            fontSize: '12px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            padding: 0,
                          }}
                        >
                          {showBotCardPreview ? '▾ ซ่อนการ์ดข้อความ Telegram' : '▸ ดูการ์ดข้อความ Telegram (◈ CE ·)'}
                        </button>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <CeButton
                            variant="outline"
                            size="sm"
                            loading={loadingAction === `tg-send:tx:${selectedTx.id}`}
                            onClick={() => handleSendTelegramLive(renderBotMessageForTx(selectedTx), `tx:${selectedTx.id}`)}
                          >
                            📨 ส่งเข้า Telegram
                          </CeButton>
                          <CeButton variant="ghost" size="sm" onClick={() => copyText(renderBotMessageForTx(selectedTx))}>
                            คัดลอก
                          </CeButton>
                        </div>
                      </div>
                      {showBotCardPreview && (
                        <pre
                          style={{
                            margin: '12px 0 0',
                            padding: '14px',
                            borderRadius: '12px',
                            background: 'var(--b0)',
                            border: '1px solid var(--br)',
                            color: 'var(--t1)',
                            fontFamily: "'Space Mono', monospace",
                            fontSize: '12px',
                            lineHeight: 1.6,
                            whiteSpace: 'pre-wrap',
                          }}
                        >
                          {renderBotMessageForTx(selectedTx)}
                        </pre>
                      )}
                    </div>
                  </>
                )}

                {/* ── MODE 2: SMART PIN AUTO-FORMATTER ── */}
                {panelMode === 'pin' && summary && (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--t1)' }}>
                        📌 ปักหมุดบัญชีอัจฉริยะ (Smart PIN)
                      </div>
                      <CeButton variant="ghost" size="sm" onClick={() => setPanelMode('tx')}>
                        ปิด
                      </CeButton>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <div style={{ fontSize: '12px', color: 'var(--t2)' }}>
                        พิมพ์ข้อมูลดิบแบบอิสระ เช่น <code>ธิติ ทองมี 1230004444 กสิกร วงเงิน 50000</code>
                      </div>
                      <textarea
                        className="ce-input"
                        rows={2}
                        value={smartPinInput}
                        onChange={(e) => setSmartPinInput(e.target.value)}
                        placeholder="ชื่อ-สกุล เลขบัญชี ธนาคาร วงเงิน..."
                      />

                      {smartPinPreview && (
                        <div
                          style={{
                            background: 'var(--b0)',
                            border: '1px solid var(--sb)',
                            borderRadius: '14px',
                            padding: '14px',
                            display: 'flex',
                            gap: '14px',
                            alignItems: 'flex-start',
                          }}
                        >
                          <BankLogo code={smartPinPreview.code} size={46} />
                          <pre
                            style={{
                              margin: 0,
                              color: 'var(--t1)',
                              fontFamily: "'Space Mono', monospace",
                              fontSize: '12px',
                              lineHeight: 1.6,
                              whiteSpace: 'pre-wrap',
                            }}
                          >
                            {smartPinPreview.formattedMessage}
                          </pre>
                        </div>
                      )}

                      <CeButton
                        variant="primary"
                        size="lg"
                        fullWidth
                        disabled={!smartPinPreview}
                        loading={loadingAction === 'smart-pin-tg'}
                        onClick={() => handleSmartPinSubmit(true, true)}
                        icon={<CeIcon name="pin" size={16} color="var(--on-c)" />}
                      >
                        📌 บันทึก & ปักหมุดเข้า Telegram อัตโนมัติ
                      </CeButton>
                      <CeButton
                        variant="ghost"
                        size="sm"
                        fullWidth
                        disabled={!smartPinPreview}
                        loading={loadingAction === 'smart-pin'}
                        onClick={() => handleSmartPinSubmit(false, false)}
                      >
                        บันทึกเฉพาะในเว็บนี้ (ไม่ส่ง Telegram)
                      </CeButton>
                    </div>

                    {/* Visual Bank Logo Quick Switcher */}
                    <div style={{ borderTop: '1px solid var(--br)', paddingTop: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--t2)' }}>
                        หรือเลือกจากบัญชีที่บันทึกไว้:
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {banks.slice(0, 6).map((b, i) => (
                          <button
                            key={`${b.code}-${b.account}-${i}`}
                            onClick={() => {
                              setPinCodeInput(b.code);
                              setSmartPinInput(`${b.holder} ${b.account} ${resolveBankAsset(b.code).thai} วงเงิน ${limitInput}`);
                            }}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '12px',
                              padding: '10px 12px',
                              borderRadius: '12px',
                              background: pinCodeInput.toUpperCase() === b.code.toUpperCase() ? 'var(--ca)' : 'var(--b1)',
                              border: pinCodeInput.toUpperCase() === b.code.toUpperCase() ? '1px solid var(--cb)' : '1px solid var(--br)',
                              color: 'var(--t1)',
                              cursor: 'pointer',
                              textAlign: 'left',
                            }}
                          >
                            <BankLogo code={b.code} size={34} />
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: '13px', fontWeight: 700 }}>{resolveBankAsset(b.code).thai} ({b.code})</div>
                              <div style={{ fontSize: '11px', color: 'var(--t3)', fontFamily: "'Space Mono', monospace" }}>
                                {b.account} · {b.holder}
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <CeButton variant="outline" size="sm" fullWidth onClick={() => handleUpdatePin(true)} loading={loadingAction === 'pin-tg'}>
                          ปักหมุดบัญชีที่เลือกเข้า TG
                        </CeButton>
                      </div>
                    </div>
                  </>
                )}

                {/* ── MODE 3: RATE MANAGER ── */}
                {panelMode === 'rate' && summary && (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--t1)' }}>💱 ปรับเรทโต๊ะ (Desk Rate)</div>
                      <CeButton variant="ghost" size="sm" onClick={() => setPanelMode('tx')}>ปิด</CeButton>
                    </div>
                    <div style={{ background: 'var(--b1)', borderRadius: '12px', padding: '14px', fontSize: '13px', display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--t2)' }}>เรทตลาด Binance TH ล่าสุด</span>
                      <strong style={{ color: 'var(--c)', fontFamily: "'Space Mono', monospace" }}>
                        {market?.rate ? `${market.rate.toFixed(2)} THB` : '—'}
                      </strong>
                    </div>
                    <input
                      className="ce-input"
                      type="number"
                      step="0.05"
                      value={rateInput}
                      onChange={(e) => setRateInput(e.target.value)}
                      style={{ fontFamily: "'Space Mono', monospace", fontSize: '20px', fontWeight: 800, color: 'var(--g)' }}
                    />
                    <CeButton variant="gold" size="lg" fullWidth onClick={handleUpdateRate} loading={loadingAction === 'rate'}>
                      บันทึกเรทโต๊ะ ({rateInput} THB)
                    </CeButton>
                    <CeButton variant="outline" fullWidth onClick={handleAutoRate} loading={loadingAction === 'rate-auto'}>
                      🤖 ใช้เรทออโต้ตาม Binance TH (+{autoCfg?.rateSpread ?? 0.3})
                    </CeButton>
                  </>
                )}

                {/* ── MODE 4: NEW CYCLE ── */}
                {panelMode === 'cycle' && summary && (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--t1)' }}>🔄 ปิดรอบ {summary.cycle}</div>
                      <CeButton variant="ghost" size="sm" onClick={() => setPanelMode('tx')}>ปิด</CeButton>
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--t2)', lineHeight: 1.6 }}>
                      สรุปยอดรับ <strong>฿{fmtInt(summary.receivedThb)}</strong> · โอนแล้ว <strong>{fmtUsdt(summary.sentUsdt)} USDT</strong> · กำไร <strong>฿{fmtInt(summary.profitThb)}</strong> แล้วเปิดรอบใหม่ (รายการค้างโอนจะยังอยู่ครบ)
                    </div>
                    <CeButton variant="gold" size="lg" fullWidth onClick={handleNewCycle} loading={loadingAction === 'cycle'}>
                      ยืนยันปิดรอบ & เปิดรอบใหม่
                    </CeButton>
                    <CeButton variant="ghost" size="sm" fullWidth onClick={handleResetDemo} loading={loadingAction === 'reset'}>
                      รีเซ็ตข้อมูลตัวอย่าง (Reset Demo)
                    </CeButton>
                    {cycleHistory.length > 0 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <div style={{ fontSize: '11px', color: 'var(--t3)' }}>รอบที่ปิดแล้ว</div>
                        {cycleHistory.map((ch) => (
                          <div key={ch.cycle} style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 12px', borderRadius: '10px', background: 'var(--b1)', fontSize: '12px' }}>
                            <strong>{ch.cycle} · {ch.closedAt}</strong>
                            <span style={{ color: 'var(--s)', fontFamily: "'Space Mono', monospace" }}>฿{fmtInt(ch.receivedThb)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════ */}
        {/* TAB 2: รับสลิป (SCAN SLIP WITH VISUAL REAL BANK PICKER) */}
        {/* ═══════════════════════════════════════════════════════ */}
        {activeTab === 'scan' && (
          <div className="ce-workspace-grid">
            <div
              style={{
                background: 'var(--b2)',
                border: '1px solid var(--br)',
                borderRadius: '18px',
                padding: '22px',
                display: 'flex',
                flexDirection: 'column',
                gap: '18px',
              }}
            >
              <div>
                <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--t1)' }}>📷 รับสลิปใหม่ (Scan Slip)</div>
                <div style={{ fontSize: '12px', color: 'var(--t3)' }}>
                  ระบบตรวจสอบบัญชี PIN ({summary?.pinnedBank.code}) และวันที่สลิปอัตโนมัติ
                </div>
              </div>

              {/* 1-Click Quick Scenarios */}
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <CeButton
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setScanThb('10000');
                    setScanBank(summary?.pinnedBank.code || 'KBANK');
                    setScanAccount(summary?.pinnedBank.account || '1230004444');
                    setScanSender('นาย สมชาย ใจดี');
                    setScanConfidence('98.7');
                    setScanSlipDate(formatThaiSlipDateTime());
                  }}
                >
                  🟢 สลิปปกติ
                </CeButton>
                <CeButton
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setScanThb('5000');
                    setScanBank('KTB');
                    setScanAccount('••••1670');
                    setScanSender('ลูกค้า (วันที่ไม่ตรง)');
                    setScanConfidence('99.1');
                    setScanSlipDate('13/12/2569 19:39');
                  }}
                >
                  🔴 วันที่ไม่ตรง (13/12/2569)
                </CeButton>
                <CeButton
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setScanThb('15000');
                    setScanBank('KTB');
                    setScanAccount('xxx-x-x7413-x');
                    setScanSender('นาย ประเสริฐ มั่งมี');
                    setScanConfidence('96.4');
                    setScanSlipDate(formatThaiSlipDateTime());
                  }}
                >
                  🟠 บัญชีไม่ตรง
                </CeButton>
                <CeButton
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setScanThb('8500');
                    setScanBank(summary?.pinnedBank.code || 'KBANK');
                    setScanAccount(summary?.pinnedBank.account || '1230004444');
                    setScanSender('นาย สม...ย ใจดี');
                    setScanConfidence('72.0');
                    setScanSlipDate(formatThaiSlipDateTime());
                  }}
                >
                  🟡 สลิปไม่ชัด
                </CeButton>
              </div>

              {/* Visual Real Thai Bank Logo Picker */}
              <div>
                <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--t2)', marginBottom: '8px' }}>
                  เลือกธนาคารในสลิป (Select Bank)
                </div>
                <div className="ce-bank-picker">
                  {POPULAR_BANK_CODES.map((code) => {
                    const asset = resolveBankAsset(code);
                    const active = scanBank.toUpperCase() === code;
                    return (
                      <button
                        key={code}
                        type="button"
                        onClick={() => setScanBank(code)}
                        className={`ce-bank-tile ${active ? 'is-active' : ''}`}
                      >
                        <BankLogo code={code} size={34} />
                        <span style={{ fontSize: '10px', fontWeight: 700 }}>{asset.short}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', color: 'var(--t2)', display: 'block', marginBottom: '5px' }}>ยอดโอน (THB)</label>
                  <input
                    className="ce-input"
                    type="number"
                    value={scanThb}
                    onChange={(e) => setScanThb(e.target.value)}
                    style={{ fontFamily: "'Space Mono', monospace", fontSize: '16px', fontWeight: 700, color: 'var(--g)' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '12px', color: 'var(--t2)', display: 'block', marginBottom: '5px' }}>เลขบัญชีในสลิป</label>
                  <input
                    className="ce-input"
                    value={scanAccount}
                    onChange={(e) => setScanAccount(e.target.value)}
                    style={{ fontFamily: "'Space Mono', monospace" }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '12px', color: 'var(--t2)', display: 'block', marginBottom: '5px' }}>ชื่อผู้โอน</label>
                  <input className="ce-input" value={scanSender} onChange={(e) => setScanSender(e.target.value)} />
                </div>
                <div>
                  <label style={{ fontSize: '12px', color: 'var(--t2)', display: 'block', marginBottom: '5px' }}>วันที่/เวลาสลิป (พ.ศ.)</label>
                  <input
                    className="ce-input"
                    value={scanSlipDate}
                    onChange={(e) => setScanSlipDate(e.target.value)}
                    style={{ fontFamily: "'Space Mono', monospace" }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <CeButton
                  variant="success"
                  size="lg"
                  onClick={() => handleScanSubmit(false)}
                  loading={loadingAction === 'scan'}
                  icon={<CeIcon name="scan" size={16} color="var(--on-c)" />}
                >
                  ตรวจสอบและรับสลิปเข้าคิว
                </CeButton>
                <CeButton variant="ghost" onClick={() => handleScanSubmit(true)} loading={loadingAction === 'scan'}>
                  ทดสอบสลิปซ้ำ
                </CeButton>
              </div>
            </div>

            {/* Right Live CE Card Output */}
            <div
              style={{
                background: 'var(--b2)',
                border: '1px solid var(--br)',
                borderRadius: '18px',
                padding: '22px',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <BankLogo code={scanBank} size={34} />
                  <span style={{ fontSize: '14px', fontWeight: 800 }}>ตัวอย่างการ์ดบอท (◈ CE ·)</span>
                </div>
                <CeButton
                  variant="primary"
                  size="sm"
                  loading={loadingAction === 'tg-send:scan-card'}
                  onClick={() => handleSendTelegramLive(currentScanCard, 'scan-card')}
                >
                  📨 ส่งเข้า Telegram
                </CeButton>
              </div>
              <pre
                style={{
                  margin: 0,
                  padding: '16px',
                  borderRadius: '14px',
                  background: 'var(--b0)',
                  border: '1px solid var(--br)',
                  color: 'var(--t1)',
                  fontFamily: "'Space Mono', monospace",
                  fontSize: '12.5px',
                  lineHeight: 1.65,
                  whiteSpace: 'pre-wrap',
                }}
              >
                {currentScanCard}
              </pre>
              <CeButton variant="ghost" size="sm" onClick={() => setActiveTab('desk')}>
                ← กลับไปหน้าหลัก (Desk)
              </CeButton>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════ */}
        {/* TAB 3: บอททั้งหมด (14 BOTS — CLEAN & SCANNABLE) */}
        {/* ═══════════════════════════════════════════════════════ */}
        {activeTab === 'bots' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <div
              style={{
                background: 'var(--b2)',
                border: '1px solid var(--br)',
                borderRadius: '18px',
                padding: '20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '14px',
                flexWrap: 'wrap',
              }}
            >
              <div>
                <div style={{ fontSize: '18px', fontWeight: 800 }}>
                  🤖 บอททั้งหมดของระบบ ({fleetSummary?.active || 14}/{fleetSummary?.total || 14} ออนไลน์)
                </div>
                <div style={{ fontSize: '12px', color: 'var(--t2)', marginTop: '2px' }}>
                  ทุกบอทเชื่อมเรท Binance TH ({market?.rate?.toFixed(2) || '—'} THB) และส่งแจ้งเตือนเข้ากลุ่ม Telegram ได้ทันที
                </div>
              </div>
              <CeButton
                variant="primary"
                size="sm"
                loading={loadingAction === 'broadcast-fleet'}
                onClick={handleBroadcastFleet}
                icon={<CeIcon name="send" size={14} color="var(--on-c)" />}
              >
                📡 ส่งสถานะทุกบอทเข้า Telegram
              </CeButton>
            </div>

            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {['ALL', 'Core Ops', 'Monitoring & Reports', 'AI & Visual', 'QA & Security'].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setBotCatFilter(cat)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '9999px',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    border: botCatFilter === cat ? '1px solid var(--cb)' : '1px solid var(--br)',
                    background: botCatFilter === cat ? 'var(--ca)' : 'var(--b2)',
                    color: botCatFilter === cat ? 'var(--c)' : 'var(--t2)',
                  }}
                >
                  {cat === 'ALL' ? `ทั้งหมด (${bots.length})` : cat}
                </button>
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '14px' }}>
              {bots
                .filter((b) => (botCatFilter === 'ALL' ? true : b.category === botCatFilter))
                .map((bot) => {
                  const active = bot.status === 'active';
                  const isEditing = editingBotSlug === bot.slug;
                  return (
                    <div
                      key={bot.slug}
                      style={{
                        background: 'var(--b2)',
                        border: '1px solid var(--br)',
                        borderRadius: '16px',
                        padding: '16px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                        <div>
                          <div style={{ fontSize: '15px', fontWeight: 800 }}>{bot.name}</div>
                          <div style={{ fontSize: '11px', color: 'var(--c)', fontFamily: "'Space Mono', monospace" }}>
                            {bot.handle} · {bot.category}
                          </div>
                        </div>
                        <span
                          style={{
                            padding: '4px 10px',
                            borderRadius: '9999px',
                            fontSize: '10px',
                            fontWeight: 800,
                            color: active ? 'var(--s)' : 'var(--w)',
                            background: active ? 'var(--sa)' : 'var(--wa)',
                          }}
                        >
                          ● {active ? 'ONLINE' : bot.status.toUpperCase()}
                        </span>
                      </div>

                      <div style={{ fontSize: '12px', color: 'var(--t2)', lineHeight: 1.5 }}>{bot.roleTh}</div>

                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        <CeButton
                          variant={active ? 'ghost' : 'success'}
                          size="sm"
                          loading={loadingAction === `bot:${bot.slug}:${active ? 'pause' : 'start'}`}
                          onClick={() => handleBotAction(bot.slug, active ? 'pause' : 'start')}
                        >
                          {active ? '⏸ พัก' : '▶ เปิด'}
                        </CeButton>
                        <CeButton
                          variant="outline"
                          size="sm"
                          loading={loadingAction === `bot:${bot.slug}:dispatch`}
                          onClick={() => handleBotAction(bot.slug, 'dispatch')}
                        >
                          📨 ส่งเข้า TG
                        </CeButton>
                        <CeButton
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            if (isEditing) setEditingBotSlug(null);
                            else {
                              setEditingBotSlug(bot.slug);
                              setBotCustomToken('');
                              setBotCustomChatId(bot.telegramRoute?.chatId || '');
                              setBotHandleInput(bot.handle);
                            }
                          }}
                        >
                          ⚙️ {isEditing ? 'ปิด' : 'ตั้งค่า'}
                        </CeButton>
                      </div>

                      {isEditing && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingTop: '10px', borderTop: '1px solid var(--br)' }}>
                          <input className="ce-input" value={botHandleInput} onChange={(e) => setBotHandleInput(e.target.value)} placeholder="@bot_handle" />
                          <input
                            className="ce-input"
                            type="password"
                            value={botCustomToken}
                            onChange={(e) => setBotCustomToken(e.target.value)}
                            placeholder="Token เฉพาะบอท (เว้นว่าง = ใช้บอทหลัก)"
                          />
                          <input
                            className="ce-input"
                            value={botCustomChatId}
                            onChange={(e) => setBotCustomChatId(e.target.value)}
                            placeholder="Chat ID เฉพาะบอท (เว้นว่าง = ใช้กลุ่มหลัก)"
                          />
                          <CeButton variant="success" size="sm" loading={loadingAction === `bot-cfg:${bot.slug}`} onClick={() => handleSaveBotConfig(bot.slug, false)}>
                            บันทึกการตั้งค่าบอท
                          </CeButton>
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════ */}
        {/* TAB 4: ตั้งค่า (API & TELEGRAM + MESSAGES + BANK LOGOS) */}
        {/* ═══════════════════════════════════════════════════════ */}
        {activeTab === 'settings' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            {/* Sub-tabs */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {(
                [
                  { id: 'api', label: '⚙️ API & Telegram Bot' },
                  { id: 'messages', label: '💬 คลังข้อความบอท (Templates)' },
                  { id: 'banks', label: '🏦 โลโก้ธนาคารทั้งหมด (21 Banks)' },
                ] as { id: SettingsSubTab; label: string }[]
              ).map((st) => (
                <button
                  key={st.id}
                  onClick={() => setSettingsSubTab(st.id)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '10px',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    border: settingsSubTab === st.id ? '1px solid var(--cb)' : '1px solid var(--br)',
                    background: settingsSubTab === st.id ? 'var(--ca)' : 'var(--b2)',
                    color: settingsSubTab === st.id ? 'var(--c)' : 'var(--t2)',
                  }}
                >
                  {st.label}
                </button>
              ))}
            </div>

            {settingsSubTab === 'api' && (
              <>
                {tgStatusBanner && (
                  <div
                    style={{
                      padding: '12px 16px',
                      borderRadius: '12px',
                      background: tgStatusBanner.ok ? 'var(--sa)' : 'var(--ala)',
                      border: `1px solid ${tgStatusBanner.ok ? 'var(--sb)' : 'var(--alb)'}`,
                      color: tgStatusBanner.ok ? 'var(--s)' : 'var(--al)',
                      fontSize: '13px',
                      fontWeight: 700,
                    }}
                  >
                    {tgStatusBanner.ok ? '✅ ' : '⚠️ '}
                    {tgStatusBanner.text}
                  </div>
                )}

                <div className="ce-workspace-grid">
                  {/* Telegram Bot Setup */}
                  <div
                    style={{
                      background: 'var(--b2)',
                      border: '1px solid var(--br)',
                      borderRadius: '18px',
                      padding: '22px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '14px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontSize: '16px', fontWeight: 800 }}>🤖 ตั้งค่าบอท Telegram หลัก</div>
                      <span style={{ fontSize: '11px', fontWeight: 700, color: tgConnected ? 'var(--s)' : 'var(--w)' }}>
                        {tgConnected ? '🟢 พร้อมส่ง' : '🟡 รอตั้งค่า'}
                      </span>
                    </div>

                    {botInfo && (
                      <div style={{ padding: '12px', borderRadius: '12px', background: 'var(--sa)', border: '1px solid var(--sb)', fontSize: '12px' }}>
                        <div style={{ fontWeight: 800, color: 'var(--s)' }}>
                          {botInfo.firstName} (@{botInfo.username})
                        </div>
                        {botInfo.webhookUrl && (
                          <div style={{ fontSize: '11px', color: 'var(--t2)', marginTop: '3px', fontFamily: "'Space Mono', monospace" }}>
                            Webhook: {botInfo.webhookUrl}
                          </div>
                        )}
                      </div>
                    )}

                    <div>
                      <label style={{ fontSize: '12px', color: 'var(--t2)', display: 'block', marginBottom: '5px' }}>
                        Bot Token (จาก @BotFather) {hasSavedToken && <span style={{ color: 'var(--s)' }}>· บันทึกแล้ว ({maskedToken})</span>}
                      </label>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <input
                          className="ce-input"
                          type={showBotToken ? 'text' : 'password'}
                          placeholder={hasSavedToken ? `ใช้ค่าเดิม (${maskedToken}) หรือวางใหม่` : '1234567890:AAH...'}
                          value={botTokenInput}
                          onChange={(e) => setBotTokenInput(e.target.value)}
                          style={{ fontFamily: "'Space Mono', monospace" }}
                        />
                        <CeButton variant="ghost" size="sm" onClick={() => setShowBotToken((v) => !v)}>
                          {showBotToken ? 'ซ่อน' : 'ดู'}
                        </CeButton>
                        <CeButton variant="outline" size="sm" onClick={handleVerifyBot} loading={loadingAction === 'tg-verify'}>
                          ตรวจบอท
                        </CeButton>
                      </div>
                    </div>

                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                        <label style={{ fontSize: '12px', color: 'var(--t2)' }}>Chat ID กลุ่มหรือแชทเป้าหมาย</label>
                        <button onClick={handleDetectChats} style={{ background: 'none', border: 'none', color: 'var(--c)', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}>
                          📡 ดึงแชทอัตโนมัติ
                        </button>
                      </div>
                      <input
                        className="ce-input"
                        placeholder="-5532107732"
                        value={chatIdInput}
                        onChange={(e) => setChatIdInput(e.target.value)}
                        style={{ fontFamily: "'Space Mono', monospace", fontWeight: 700, color: 'var(--g)' }}
                      />
                      {detectedChats.length > 0 && (
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '8px' }}>
                          {detectedChats.map((c) => (
                            <button
                              key={c.id}
                              onClick={() => setChatIdInput(c.id)}
                              style={{
                                padding: '5px 10px',
                                borderRadius: '8px',
                                background: 'var(--b1)',
                                border: '1px solid var(--cb)',
                                color: 'var(--c)',
                                fontSize: '11px',
                                cursor: 'pointer',
                              }}
                            >
                              {c.title} ({c.id})
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <textarea
                      className="ce-input"
                      rows={2}
                      placeholder="ข้อความทดสอบกำหนดเอง (เว้นว่างเพื่อส่งการ์ดมาตรฐาน)"
                      value={customTestMsg}
                      onChange={(e) => setCustomTestMsg(e.target.value)}
                    />

                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <CeButton variant="success" onClick={() => handleSaveSettings(false)} loading={loadingAction === 'save-settings'}>
                        💾 บันทึกการตั้งค่า
                      </CeButton>
                      <CeButton variant="primary" onClick={() => handleSendTelegramLive(undefined, 'live-test')} loading={loadingAction === 'tg-send:live-test'}>
                        🚀 ทดสอบยิงเข้า Telegram จริง
                      </CeButton>
                      {hasSavedToken && (
                        <CeButton variant="danger" size="sm" onClick={() => handleSaveSettings(true)}>
                          ล้าง Token
                        </CeButton>
                      )}
                    </div>
                  </div>

                  {/* API + Market + Delivery Log */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div
                      style={{
                        background: 'var(--b2)',
                        border: '1px solid var(--br)',
                        borderRadius: '18px',
                        padding: '22px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px',
                      }}
                    >
                      <div style={{ fontSize: '16px', fontWeight: 800 }}>🌐 API & เรทตลาด Binance TH</div>
                      <div style={{ fontSize: '12px', color: 'var(--t2)' }}>
                        โหมดทำงาน: <strong>{engineMode === 'browser-standalone' ? 'เว็บสาธารณะ (Browser Engine)' : 'Backend API Server'}</strong> · สถานะ:{' '}
                        <strong style={{ color: apiHealthy ? 'var(--s)' : 'var(--d)' }}>
                          {apiHealthy ? `200 OK (${apiLatencyMs ?? '—'}ms)` : 'OFFLINE'}
                        </strong>
                      </div>
                      <input
                        className="ce-input"
                        placeholder="URL Backend ภายนอก (เว้นว่าง = ใช้อัตโนมัติ)"
                        value={customApiUrlInput}
                        onChange={(e) => setCustomApiUrlInput(e.target.value)}
                        style={{ fontFamily: "'Space Mono', monospace" }}
                      />
                      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <label style={{ fontSize: '12px', color: 'var(--t2)', whiteSpace: 'nowrap' }}>บวกเพิ่มจาก Binance TH:</label>
                        <input
                          className="ce-input"
                          type="number"
                          step="0.05"
                          value={spreadInput}
                          onChange={(e) => setSpreadInput(e.target.value)}
                          style={{ maxWidth: '120px', fontFamily: "'Space Mono', monospace", fontWeight: 700, color: 'var(--g)' }}
                        />
                        <span style={{ fontSize: '12px', color: 'var(--t3)' }}>THB</span>
                      </div>
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        <CeButton variant="gold" size="sm" onClick={() => handleSaveSettings(false)} loading={loadingAction === 'save-settings'}>
                          บันทึกค่า API
                        </CeButton>
                        <CeButton variant="outline" size="sm" onClick={handlePingApi} loading={loadingAction === 'ping-api'}>
                          🩺 ทดสอบ API
                        </CeButton>
                        <CeButton variant="ghost" size="sm" onClick={handleRefreshMarketNow} loading={loadingAction === 'refresh-mkt'}>
                          🔄 รีเฟรช Binance TH
                        </CeButton>
                      </div>
                    </div>

                    <div
                      style={{
                        background: 'var(--b2)',
                        border: '1px solid var(--br)',
                        borderRadius: '18px',
                        padding: '20px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '10px',
                      }}
                    >
                      <div style={{ fontSize: '14px', fontWeight: 800 }}>📨 ประวัติการส่งเข้า Telegram ล่าสุด</div>
                      {deliveryLog.length === 0 ? (
                        <div style={{ fontSize: '12px', color: 'var(--t3)' }}>ยังไม่มีประวัติการส่ง</div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '240px', overflowY: 'auto' }}>
                          {deliveryLog.map((item) => (
                            <div
                              key={item.id}
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                padding: '9px 12px',
                                borderRadius: '10px',
                                background: 'var(--b1)',
                                fontSize: '11px',
                              }}
                            >
                              <div>
                                <strong style={{ color: item.ok ? 'var(--s)' : 'var(--al)' }}>
                                  {item.ok ? '✅ สำเร็จ' : '❌ ล้มเหลว'} · {item.event}
                                </strong>
                                <div style={{ color: 'var(--t3)', fontFamily: "'Space Mono', monospace" }}>{item.detail}</div>
                              </div>
                              <div style={{ textAlign: 'right', color: 'var(--t3)', fontFamily: "'Space Mono', monospace" }}>
                                {item.latencyMs}ms
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </>
            )}

            {settingsSubTab === 'messages' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {['ALL', 'PIN & Verify', 'Settlement', 'Cycle & Alerts'].map((g) => (
                    <button
                      key={g}
                      onClick={() => setMsgGroup(g)}
                      style={{
                        padding: '6px 13px',
                        borderRadius: '9999px',
                        fontSize: '12px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        border: msgGroup === g ? '1px solid var(--cb)' : '1px solid var(--br)',
                        background: msgGroup === g ? 'var(--ca)' : 'var(--b2)',
                        color: msgGroup === g ? 'var(--c)' : 'var(--t2)',
                      }}
                    >
                      {g === 'ALL' ? 'ทั้งหมด' : g}
                    </button>
                  ))}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '14px' }}>
                  {messageTemplatesList
                    .filter((m) => (msgGroup === 'ALL' ? true : m.group === msgGroup))
                    .map((m) => (
                      <div key={m.key} style={{ background: 'var(--b2)', border: '1px solid var(--br)', borderRadius: '14px', padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                          <strong style={{ fontSize: '13px' }}>{m.title}</strong>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <CeButton variant="outline" size="sm" onClick={() => handleSendTelegramLive(m.text, m.key)}>📨 TG</CeButton>
                            <CeButton variant="ghost" size="sm" onClick={() => copyText(m.text)}>Copy</CeButton>
                          </div>
                        </div>
                        <pre style={{ margin: 0, padding: '12px', borderRadius: '10px', background: 'var(--b0)', fontSize: '11.5px', fontFamily: "'Space Mono', monospace", whiteSpace: 'pre-wrap', lineHeight: 1.55 }}>
                          {m.text}
                        </pre>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {settingsSubTab === 'banks' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                <div style={{ background: 'var(--b2)', border: '1px solid var(--br)', borderRadius: '18px', padding: '20px' }}>
                  <div style={{ fontSize: '15px', fontWeight: 800, marginBottom: '14px' }}>
                    🏦 โลโก้ธนาคารไทยและวอลเล็ทจริง ({ALL_BANK_CODES.length} สถาบันการเงิน)
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(125px, 1fr))', gap: '12px' }}>
                    {ALL_BANK_CODES.map((code) => {
                      const asset = resolveBankAsset(code);
                      return (
                        <div
                          key={code}
                          style={{
                            background: 'var(--b1)',
                            border: '1px solid var(--br)',
                            borderRadius: '14px',
                            padding: '14px 10px',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '8px',
                            textAlign: 'center',
                          }}
                        >
                          <BankLogo code={code} size={46} />
                          <div style={{ fontSize: '12px', fontWeight: 700 }}>{asset.thai}</div>
                          <div style={{ fontSize: '10px', color: 'var(--t3)', fontFamily: "'Space Mono', monospace" }}>{asset.code}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div style={{ background: 'var(--b2)', border: '1px solid var(--br)', borderRadius: '18px', padding: '20px' }}>
                  <div style={{ fontSize: '14px', fontWeight: 800, marginBottom: '12px' }}>สถานะธุรกรรม & ไอคอนระบบ ({ALL_ICONS.length} Icons)</div>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '14px' }}>
                    {ALL_STATUSES.map((st) => (
                      <StatusBadge key={st} status={st} />
                    ))}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))', gap: '8px' }}>
                    {ALL_ICONS.map((name) => (
                      <div key={name} style={{ background: 'var(--b1)', borderRadius: '10px', padding: '10px 6px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                        <CeIcon name={name} size={20} color="var(--c)" />
                        <span style={{ fontSize: '9px', color: 'var(--t3)', fontFamily: "'Space Mono', monospace" }}>{name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
