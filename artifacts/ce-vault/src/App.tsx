import React, { useEffect, useState, useCallback } from 'react';
import {
  CeIcon,
  IconName,
  StatusBadge,
  TxStatus,
  KpiCard,
  CeButton,
  TxItem,
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

type MainTab = 'desk' | 'bots' | 'scan' | 'messages' | 'settings' | 'design';
type PanelMode = 'tx' | 'summary' | 'pin' | 'rate' | 'cycle';

const ALL_ICONS: IconName[] = [
  'receive', 'send', 'rate', 'limit', 'profit', 'cycle', 'bank', 'pin', 'scan', 'user', 'amount', 'usdt',
  'ready', 'pending', 'settled', 'short', 'mismatch', 'duplicate', 'review', 'rejected', 'reversed', 'ocr',
  'check', 'edit', 'trash', 'recheck', 'override', 'alert', 'search', 'copy', 'close', 'back', 'arrow-up', 'arrow-down', 'refresh', 'gem',
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
  const [statusFilter, setStatusFilter] = useState<TxStatus | 'ALL'>('ALL');
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
    autoSecrets?: Record<string, string>;
    integrations?: {
      storage?: { enabled: boolean; mode: string };
      marketRate?: { enabled: boolean; source: string };
      telegram?: { enabled: boolean; hasToken?: boolean; maskedToken?: string; chatId?: string; botInfo?: BotInfo | null };
      supabase?: { enabled: boolean };
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
  const [rateInput, setRateInput] = useState<string>('43.00');
  const [pinCodeInput, setPinCodeInput] = useState<string>('BBL');
  const [limitInput, setLimitInput] = useState<string>('500000');
  const [smartPinInput, setSmartPinInput] = useState<string>('ธิติ ทองมี 1230004444 กสิกร วงเงิน 50000');

  // Scan form states
  const [scanThb, setScanThb] = useState<string>('10000');
  const [scanBank, setScanBank] = useState<string>('BBL');
  const [scanAccount, setScanAccount] = useState<string>('097-0-28xxx-x');
  const [scanSender, setScanSender] = useState<string>('นาย สมชาย ใจดี');
  const [scanConfidence, setScanConfidence] = useState<string>('98.7');
  const [scanSlipDate, setScanSlipDate] = useState<string>(() => formatThaiSlipDateTime());
  const [scanResultMsg, setScanResultMsg] = useState<string>('');

  // Messages tab filter
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
      if (data.customApiBaseUrl !== undefined) {
        setCustomApiUrlInput(data.customApiBaseUrl || '');
      }
      if (data.rateSpread !== undefined) {
        setSpreadInput(Number(data.rateSpread).toFixed(2));
      }
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
        setRateInput(String(data.summary?.rate ?? 43.0));
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
      /* offline: keep last known values */
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
        showToast(`❌ ${data.message || 'สั่งการบอทไม่สำเร็จ (Bot Action Failed)'}`);
        return;
      }
      if (Array.isArray(data.bots)) setBots(data.bots);
      if (data.summary) setFleetSummary(data.summary);
      if (Array.isArray(data.deliveryLog)) setDeliveryLog(data.deliveryLog);
      if (action === 'dispatch') {
        if (data.telegram?.ok) {
          showToast(`🚀 ${data.bot.name} ส่งรายงานเข้า Telegram สำเร็จ (msg #${data.telegram.messageId})`);
        } else {
          showToast(`⚠️ ส่งเข้า Telegram ไม่สำเร็จ: ${data.telegram?.description || 'กรุณาตั้งค่า Token & Chat ID ในแท็บ Settings'}`);
        }
      } else {
        showToast(`🤖 อัปเดตบอท ${data.bot.name} → ${data.bot.status.toUpperCase()}`);
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
        showToast(`💾 บันทึกการตั้งค่าบอท ${data.bot.name} เรียบร้อยแล้ว (Bot Config Saved)`);
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
      if (res.ok && data.ok) {
        showToast(`📡 ส่งสถานะบอททั้ง ${fleetSummary?.total || 14} ตัวเข้า Telegram สำเร็จ! (msg #${data.messageId})`);
      } else {
        showToast(`❌ ส่งสถานะไม่สำเร็จ: ${data.description || 'กรุณาตั้งค่า Telegram Bot'}`);
      }
    } finally {
      setLoadingAction(null);
    }
  }

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
        showToast(`❌ ${data.message || data.error || 'เกิดข้อผิดพลาด (Action Failed)'}`);
        return;
      }
      setSummary(data.summary);
      setTransactions(data.transactions);
      setSelectedTxId(data.tx.id);
      fetchSettings();
      showToast(`✅ อัปเดตสำเร็จ (Updated): ${data.tx.id} → ${data.tx.status}`);
    } catch (e) {
      showToast(`❌ เชื่อมต่อ API ไม่สำเร็จ (API Error): ${String(e)}`);
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
        showToast(`❌ ${data.message || 'อ่านสลิปล้มเหลว (OCR Failed)'}`);
        return;
      }
      setSummary(data.summary);
      setTransactions(data.transactions);
      fetchSettings();

      if (data.duplicate && data.originalTx) {
        const dupMsg = MSG.DUPLICATE({
          id: data.originalTx.id,
          thb: fmtThb(data.originalTx.thb),
          usdt: fmtUsdt(data.originalTx.usdtExpected),
          rate: data.originalTx.rate?.toFixed?.(2) || '43.00',
          slip_time: data.originalTx.slipDate || data.originalTx.time,
        });
        setScanResultMsg(dupMsg);
        showToast(`⚠️ พบสลิปซ้ำในระบบ (Duplicate Slip: ${data.originalTx.id})`);
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

      showToast(`✅ สร้างรายการสำเร็จ (Created ${tx.id} · ${tx.dateMismatch ? 'DATE MISMATCH' : tx.status})`);
    } catch (e) {
      showToast(`❌ ประมวลผลสลิปล้มเหลว (Scan Failed): ${String(e)}`);
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
        body: JSON.stringify({
          rawText: smartPinInput,
          sendToTelegram,
          pinInTelegram,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        showToast(`❌ ${data.message || 'แปลงข้อมูลบัญชีไม่สำเร็จ (Smart PIN Parse Failed)'}`);
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
            ? `📌 จัดรูปแบบ + ส่งและปักหมุดเข้า Telegram สำเร็จ! (Message #${data.telegram.messageId} Pinned)`
            : `📨 จัดรูปแบบ & ส่งเข้า Telegram สำเร็จ (Message #${data.telegram.messageId} · ยังไม่ได้ปักหมุดอัตโนมัติ: ${data.pinDetail?.description || 'ต้องให้บอทเป็นแอดมินกลุ่ม'})`
        );
      } else if (sendToTelegram && !tgConnected) {
        showToast('📌 บันทึก PIN ในระบบแล้ว (ตั้งค่า Telegram Bot ในแท็บ Settings เพื่อส่งปักหมุดเข้ากลุ่มอัตโนมัติ)');
      } else {
        showToast(`📌 บันทึก Smart PIN สำเร็จ (${data.pinnedBank.code} · ${data.pinnedBank.account})`);
      }
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
            ? `📌 ปักหมุดบัญชีและส่งเข้า Telegram สำเร็จ (${data.pinned ? 'Pinned ✓' : 'Sent ✓'})`
            : `📌 ปักหมุดบัญชีสำเร็จ (Pinned: ${data.pinnedBank.code} · ${data.pinnedBank.account})`
        );
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
        showToast(`💱 อัปเดตเรทโต๊ะสำเร็จ (Desk Rate: ${data.rate.toFixed(2)} THB/USDT)`);
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
        showToast(`🤖 เปิดโหมดเรทอัตโนมัติ (Auto Market Rate: ${data.rate.toFixed(2)} THB/USDT)`);
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
        showToast(`🔄 เปลี่ยนรอบงานสำเร็จ (Cycle Rollover: ${data.oldCycle} → ${data.newCycle})`);
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
        showToast('🔄 รีเซ็ตข้อมูลตัวอย่างแล้ว (Demo Data Reset)');
      }
    } finally {
      setLoadingAction(null);
    }
  }

  // ── SETTINGS & LIVE TELEGRAM HANDLERS ──
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
        const msg = `ตรวจสอบบอทไม่สำเร็จ (Verify Failed): ${data.description || 'Invalid Token'}`;
        setTgStatusBanner({ ok: false, text: msg });
        showToast(`❌ ${msg}`);
        return;
      }
      setBotInfo(data.bot);
      const okMsg = `เชื่อมต่อบอทสำเร็จ (Verified): @${data.bot.username} (${data.bot.firstName}) · ${data.latencyMs}ms`;
      setTgStatusBanner({ ok: true, text: okMsg });
      showToast(`✅ ${okMsg}`);
    } catch (e) {
      setTgStatusBanner({ ok: false, text: String(e) });
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
        const msg = data.description || 'ดึงรายการแชทไม่สำเร็จ (Failed to fetch updates)';
        setTgStatusBanner({ ok: false, text: msg });
        showToast(`❌ ${msg}`);
        return;
      }
      setDetectedChats(data.chats || []);
      if (data.chats?.length > 0) {
        if (!chatIdInput) setChatIdInput(data.chats[0].id);
        setTgStatusBanner({
          ok: true,
          text: `พบห้องแชทล่าสุด ${data.chats.length} รายการ (Detected ${data.chats.length} active chats) — คลิกเลือกด้านล่างได้เลย`,
        });
        showToast(`📡 พบห้องแชท ${data.chats.length} รายการ (Chats Detected)`);
      } else {
        setTgStatusBanner({
          ok: false,
          text: 'ยังไม่พบข้อความล่าสุด — กรุณาทักแชทหาบอท หรือพิมพ์ข้อความในกลุ่มที่มีบอทอยู่ 1 ครั้ง แล้วกดดึงใหม่ (Send a message to the bot/group first, then retry)',
        });
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
        if (clearToken) {
          setBotTokenInput('');
          setBotInfo(null);
        } else if (botTokenInput) {
          setBotTokenInput('');
        }
        setHasSavedToken(Boolean(data.telegram?.hasToken));
        setMaskedToken(data.telegram?.maskedToken || '');
        if (data.telegram?.botInfo !== undefined) setBotInfo(data.telegram.botInfo);
        await Promise.all([fetchMarket(), fetchVault(), fetchSettings()]);
        setTgStatusBanner({
          ok: true,
          text: clearToken
            ? 'ล้างค่า Token บอทเรียบร้อยแล้ว (Bot Token Cleared)'
            : 'บันทึกการตั้งค่า API & Telegram Bot เรียบร้อยแล้ว (Settings Saved)',
        });
        showToast('✅ บันทึกการตั้งค่าสำเร็จ (Settings Saved)');
      }
    } catch (e) {
      showToast(`❌ บันทึกไม่สำเร็จ (Save Error): ${String(e)}`);
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
        const errText = `ส่งเข้า Telegram ไม่สำเร็จ (Send Failed): ${data.description || 'Unknown error'}`;
        setTgStatusBanner({ ok: false, text: errText });
        showToast(`❌ ${errText}`);
        if (!hasSavedToken && !botTokenInput) {
          setActiveTab('settings');
        }
        return;
      }
      const okText = `ส่งเข้า Telegram สำเร็จจริง! (Delivered to ${data.chatTitle} · msg #${data.messageId} · ${data.latencyMs}ms)`;
      setTgStatusBanner({ ok: true, text: okText });
      showToast(`🚀 ${okText}`);
    } catch (e) {
      showToast(`❌ ส่งข้อความล้มเหลว (Telegram Error): ${String(e)}`);
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
        showToast(`📈 อัปเดตเรทตลาดสดแล้ว (Live Market: ${m.rate?.toFixed(2) || '—'} THB · ${m.source || 'Auto'})`);
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
      if (res.ok) {
        const j = await res.json();
        showToast(`🩺 API ปกติ (Healthy 200 OK · ${j.service} · ${ms}ms)`);
      } else {
        showToast(`❌ API ตอบกลับผิดปกติ (HTTP ${res.status})`);
      }
    } catch {
      setApiHealthy(false);
      showToast('❌ ไม่สามารถเชื่อมต่อ API ได้ (API Unreachable)');
    } finally {
      setLoadingAction(null);
    }
  }

  function copyText(txt: string, label = 'คัดลอกข้อความแล้ว (Copied to Clipboard)') {
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
      const shortAmt = Math.max(0, tx.usdtExpected - tx.usdtSent);
      return MSG.TX_SHORT({
        id: tx.id,
        thb: fmtThb(tx.thb),
        rate: tx.rate.toFixed(2),
        bank: tx.bank,
        account: tx.account,
        usdt_expected: fmtUsdt(tx.usdtExpected),
        usdt_sent: fmtUsdt(tx.usdtSent),
        usdt_short: fmtUsdt(shortAmt),
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
      return MSG.TX_REJECTED({
        id: tx.id,
        thb: fmtThb(tx.thb),
        reason: tx.notes || 'ปฏิเสธรายการโดยเจ้าหน้าที่ (Rejected by Operator)',
      });
    }
    if (tx.status === 'REVERSED') {
      return MSG.TX_REVERSED({
        id: tx.id,
        thb: fmtThb(tx.thb),
        usdt: fmtUsdt(tx.usdtSent),
        operator: 'ADMIN',
        reason: tx.notes || 'ยกเลิกรายการ (Reversed)',
      });
    }
    return MSG.OCR_LOADING();
  }

  const smartPinPreview = parseSmartPinText(smartPinInput, Number(limitInput) || summary?.limitThb || 500000);

  const filteredTransactions = transactions.filter((t) =>
    statusFilter === 'ALL' ? true : t.status === statusFilter
  );

  const tgConnected = Boolean((hasSavedToken || botTokenInput.trim()) && chatIdInput.trim());

  const messageTemplatesList = [
    {
      key: 'PIN-01',
      group: 'Verify · Checks',
      title: 'ระบบ PIN อัจฉริยะ (Smart PIN Auto-Format Card)',
      text: MSG.SMART_PIN_CARD({ bank: 'KBANK', account: '1230004444', name: 'ธิติ ทองมี', limit: '50,000' }),
    },
    {
      key: 'MSG-00',
      group: 'Verify · Checks',
      title: 'วันที่สลิปไม่ตรงกับปัจจุบัน (Slip Date Mismatch)',
      text: MSG.SLIP_DATE_MISMATCH({ thb: '5,000.00', rate: '44.00', bank: 'KTB', account: '••••1670', slip_time: '13/12/2569 19:39' }),
    },
    { key: 'MSG-01', group: 'Intake · OCR', title: 'กำลังอ่านสลิป (Scanning Slip)', text: MSG.OCR_LOADING() },
    {
      key: 'MSG-02',
      group: 'Intake · OCR',
      title: 'อ่านสลิปสำเร็จ — พร้อมยืนยัน (OCR Ready)',
      text: MSG.OCR_READY({ thb: '10,000.00', usdt: '232.56', bank: 'BBL', account: '097-0-28123-4', name: 'นาย สมชาย ใจดี', rate: '43.00', confidence: 98.7 }),
    },
    { key: 'MSG-03', group: 'Intake · OCR', title: 'อ่านสลิปล้มเหลว (OCR Failed)', text: MSG.OCR_FAIL() },
    {
      key: 'MSG-04',
      group: 'Intake · OCR',
      title: 'ความแม่นยำต่ำ — รอตรวจสอบ (Low Confidence Review)',
      text: MSG.OCR_LOW_CONFIDENCE({ thb: '10,000.00', bank: 'BBL', account: '097-0-28123-4', name: 'นาย สม...ย ใจดี', rate: '43.00', confidence: 72 }),
    },
    {
      key: 'MSG-05',
      group: 'Verify · Checks',
      title: 'บัญชีไม่ตรงกับ PIN (Bank Account Mismatch)',
      text: MSG.BANK_MISMATCH({ thb: '15,000.00', rate: '43.00', bank: 'KTB', account: 'xxx-x-x7413-x' }).replace('[PIN_BANK]', summary?.pinnedBank.code || 'BBL').replace('[PIN_ACCOUNT]', summary?.pinnedBank.account || '097-0-28xxx-x'),
    },
    {
      key: 'MSG-06',
      group: 'Verify · Checks',
      title: 'ตรวจพบสลิปซ้ำ (Duplicate Slip)',
      text: MSG.DUPLICATE({ id: '#CE-2026-A041', thb: '10,000.00', usdt: '232.56', time: '14:35 น.' }),
    },
    {
      key: 'MSG-07',
      group: 'Verify · Checks',
      title: 'ยอดเกินวงเงินรอบงาน (Cycle Limit Exceeded)',
      text: MSG.LIMIT_EXCEEDED({ thb: '10,000', used: '495,000', limit: '500,000', remaining: '5,000' }),
    },
    {
      key: 'MSG-08',
      group: 'Verify · Checks',
      title: 'เรทเปลี่ยนระหว่างสแกน (Rate Changed During OCR)',
      text: MSG.RATE_CHANGED({ rate: '43.25', thb: '10,000.00', usdt: '231.21' }),
    },
    {
      key: 'MSG-09',
      group: 'Transaction',
      title: 'เข้าคิวรอโอนเหรียญ (Queued · PENDING)',
      text: MSG.TX_QUEUED({ id: '#CE-2026-A044', thb: '10,000.00', usdt: '232.56', rate: '43.00' }),
    },
    {
      key: 'MSG-10',
      group: 'Transaction',
      title: 'โอนเหรียญสำเร็จครบจำนวน (Settlement Completed)',
      text: MSG.TX_SETTLED({ id: '#CE-2026-A041', thb: '10,000.00', usdt: '232.56', rate: '43.00', time: '14:35 น.' }),
    },
    {
      key: 'MSG-11',
      group: 'Transaction',
      title: 'ยอดโอนเหรียญขาด (Short Settlement)',
      text: MSG.TX_SHORT({ id: '#CE-2026-A043', usdt_expected: '232.56', usdt_sent: '230.00', usdt_short: '2.56' }),
    },
    {
      key: 'MSG-12',
      group: 'Transaction',
      title: 'โอนชดเชยครบแล้ว (Short Resolved → Settled)',
      text: MSG.TX_SHORT_RESOLVED({ id: '#CE-2026-A043', usdt_expected: '232.56', usdt_sent: '232.56' }),
    },
    {
      key: 'MSG-13',
      group: 'Transaction',
      title: 'ยอดส่งเกินกำหนด (Settlement Overrun Blocked)',
      text: MSG.TX_OVERRUN({ id: '#CE-2026-A044', usdt_expected: '232.56', usdt_sent: '240.00' }),
    },
    {
      key: 'MSG-14',
      group: 'Transaction',
      title: 'ปฏิเสธรายการ (Transaction Rejected)',
      text: MSG.TX_REJECTED({ id: '#CE-2026-A042', thb: '15,000.00', reason: 'บัญชีไม่ตรงและไม่มีการแจ้งล่วงหน้า (Unverified Mismatch)' }),
    },
    {
      key: 'MSG-15',
      group: 'Transaction',
      title: 'ยกเลิกย้อนกลับรายการ (Transaction Reversed)',
      text: MSG.TX_REVERSED({ id: '#CE-2026-A041', thb: '10,000.00', usdt: '232.56', operator: 'ADMIN', reason: 'ลูกค้าขอยกเลิกรายการ (Client Cancellation)' }),
    },
    {
      key: 'MSG-16',
      group: 'Mismatch',
      title: 'อนุมัติ Override บัญชีไม่ตรง (Mismatch Override)',
      text: MSG.MISMATCH_OVERRIDDEN({ id: '#CE-2026-A042', operator: 'OP-01', reason: 'ลูกค้าโอนเข้าบัญชี KTB สำรอง ยืนยันแล้ว (Verified Backup Account)' }),
    },
    {
      key: 'MSG-17',
      group: 'Cycle',
      title: 'สรุปภาพรวมรอบปัจจุบัน (Current Cycle Summary)',
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
        rate: String(summary?.rate || 43.0),
      }),
    },
    {
      key: 'MSG-18',
      group: 'Cycle',
      title: 'เปลี่ยนรอบงานใหม่ (New Cycle Rollover)',
      text: MSG.CYCLE_NEW_DONE({
        cycle_current: 'CE44',
        cycle_new: 'CE45',
        thb: '327,450',
        usdt: '7,614.32',
        count_pending: 1,
      }),
    },
    {
      key: 'MSG-19',
      group: 'Alerts',
      title: 'แจ้งเตือนวงเงินแตะ 80% (80% Limit Alert)',
      text: MSG.ALERT_LIMIT_80({
        cycle_current: summary?.cycle || 'CE44',
        used: '405,000',
        limit: '500,000',
        remaining: '95,000',
        percent: 81,
      }),
    },
    {
      key: 'MSG-20',
      group: 'Alerts',
      title: 'แจ้งเตือนรายการรอโอนค้างนาน (Stale Pending Alert)',
      text: MSG.ALERT_PENDING_STALE({
        id: '#CE-2026-A044',
        thb: '10,000.00',
        usdt: '118.56',
        minutes: 15,
      }),
    },
  ];

  const currentScanCard =
    scanResultMsg ||
    MSG.OCR_READY({
      thb: fmtThb(Number(scanThb || 10000)),
      usdt: fmtUsdt(Number(scanThb || 10000) / (summary?.rate || 43)),
      bank: scanBank,
      account: scanAccount,
      name: scanSender,
      rate: (summary?.rate || 43).toFixed(2),
      confidence: Number(scanConfidence || 98.7),
    });

  return (
    <div style={{ minHeight: '100vh', background: 'var(--b0)', color: 'var(--t1)', display: 'flex', flexDirection: 'column' }}>
      {/* ── TOP HEADER ── */}
      <header
        style={{
          background: 'rgba(6, 16, 32, 0.92)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid var(--br)',
          padding: '12px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
          position: 'sticky',
          top: 0,
          zIndex: 50,
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: 'var(--ca)',
              border: '1px solid var(--cb)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 18px rgba(63, 224, 255, 0.18)',
            }}
          >
            <CeIcon name="gem" size={20} color="var(--c)" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '16px', fontWeight: 800, letterSpacing: '2px', color: 'var(--c)' }}>
                CE VAULT
              </span>
              <span
                style={{
                  fontSize: '10px',
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: '9999px',
                  background: 'var(--ga)',
                  border: '1px solid var(--gb)',
                  color: 'var(--g)',
                  fontFamily: "'Space Mono', monospace",
                }}
              >
                {summary?.cycle || 'CE44'}
              </span>
            </div>
            <div style={{ fontSize: '10px', color: 'var(--t3)', letterSpacing: '0.6px' }}>
              ระบบศูนย์บัญชาการโต๊ะแลกเปลี่ยน (Operator Command Desk)
            </div>
          </div>
        </div>

        {/* Center Live Status Pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <div
            onClick={() => {
              setActiveTab('desk');
              setPanelMode('pin');
            }}
            style={{
              cursor: 'pointer',
              padding: '6px 11px',
              borderRadius: '8px',
              background: 'var(--b2)',
              border: '1px solid var(--br)',
              display: 'flex',
              alignItems: 'center',
              gap: '7px',
              fontSize: '11px',
            }}
            title="บัญชีรับโอนหลักวันนี้ (Today's Pinned Bank)"
          >
            <CeIcon name="pin" size={14} color="var(--s)" />
            <span style={{ color: 'var(--t3)' }}>บัญชีหลัก (PIN):</span>
            <strong style={{ color: 'var(--s)', fontFamily: "'Space Mono', monospace" }}>
              {summary?.pinnedBank.code || 'BBL'} · {summary?.pinnedBank.account || '097-0-28xxx-x'}
            </strong>
          </div>

          <div
            onClick={() => {
              setActiveTab('desk');
              setPanelMode('rate');
            }}
            style={{
              cursor: 'pointer',
              padding: '6px 11px',
              borderRadius: '8px',
              background: 'var(--b2)',
              border: '1px solid var(--br)',
              display: 'flex',
              alignItems: 'center',
              gap: '7px',
              fontSize: '11px',
            }}
            title="เรทขายโต๊ะปัจจุบัน (Current Desk Rate)"
          >
            <CeIcon name="rate" size={14} color="var(--g)" />
            <span style={{ color: 'var(--t3)' }}>เรทโต๊ะ (Desk):</span>
            <strong style={{ color: 'var(--g)', fontFamily: "'Space Mono', monospace" }}>
              {summary ? summary.rate.toFixed(2) : '43.00'} THB
            </strong>
          </div>

          <div
            onClick={handleRefreshMarketNow}
            style={{
              cursor: 'pointer',
              padding: '6px 11px',
              borderRadius: '8px',
              background: 'var(--b2)',
              border: '1px solid var(--br)',
              display: 'flex',
              alignItems: 'center',
              gap: '7px',
              fontSize: '11px',
            }}
            title={
              market?.bid && market?.ask
                ? `${market.source || 'Binance TH'} · Bid ${market.bid.toFixed(2)} / Ask ${market.ask.toFixed(2)} · 24h ${market.low24h?.toFixed(2)}–${market.high24h?.toFixed(2)} (คลิกเพื่อรีเฟรช)`
                : 'คลิกเพื่อดึงเรทตลาด Binance TH ล่าสุด'
            }
          >
            <CeIcon name="usdt" size={14} color="var(--c)" />
            <span style={{ color: 'var(--t3)' }}>{market?.source || 'Binance TH'}:</span>
            <strong style={{ color: 'var(--c)', fontFamily: "'Space Mono', monospace" }}>
              {market?.rate ? market.rate.toFixed(2) : '—'}
            </strong>
            <span style={{ color: 'var(--t3)', fontSize: '9px' }}>{market?.rateMode === 'auto' ? 'AUTO' : 'MANUAL'}</span>
          </div>

          <div
            onClick={() => setActiveTab('bots')}
            style={{
              cursor: 'pointer',
              padding: '6px 10px',
              borderRadius: '8px',
              background: tgConnected ? 'var(--sa)' : 'var(--wa)',
              border: `1px solid ${tgConnected ? 'var(--sb)' : 'var(--wb)'}`,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '10px',
              fontWeight: 700,
              color: tgConnected ? 'var(--s)' : 'var(--w)',
            }}
            title="ศูนย์ควบคุมบอททั้งหมด (Open CE Empire Bot Fleet)"
          >
            <CeIcon name="bot" size={13} color={tgConnected ? 'var(--s)' : 'var(--w)'} />
            {fleetSummary
              ? `BOTS ${fleetSummary.active}/${fleetSummary.total} ONLINE`
              : tgConnected
              ? `TG ${botInfo?.username ? `@${botInfo.username}` : 'Ready'}`
              : 'ตั้งค่าบอท (Setup Bot)'}
          </div>

          <div
            onClick={() => setActiveTab('settings')}
            style={{
              cursor: 'pointer',
              padding: '6px 10px',
              borderRadius: '8px',
              background: apiHealthy ? 'var(--sa)' : 'var(--da)',
              border: `1px solid ${apiHealthy ? 'var(--sb)' : 'var(--db)'}`,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '10px',
              fontWeight: 700,
              color: apiHealthy ? 'var(--s)' : 'var(--d)',
              fontFamily: "'Space Mono', monospace",
            }}
          >
            <span
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: apiHealthy ? 'var(--s)' : 'var(--d)',
              }}
            />
            {apiHealthy ? `API OK${apiLatencyMs !== null ? ` · ${apiLatencyMs}ms` : ''}` : 'API OFFLINE'}
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {(
            [
              { id: 'desk', label: '🖥️ โต๊ะปฏิบัติการ (Desk)' },
              { id: 'bots', label: `🤖 บอททั้งหมด (Bots · ${fleetSummary?.total || 14})` },
              { id: 'scan', label: '📷 สแกนสลิป (Scan OCR)' },
              { id: 'messages', label: '💬 ข้อความบอท (Messages)' },
              { id: 'settings', label: '⚙️ ตั้งค่า API & บอท (Settings)' },
              { id: 'design', label: '🎨 ดีไซน์ (Design)' },
            ] as { id: MainTab; label: string }[]
          ).map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              style={{
                padding: '8px 13px',
                borderRadius: '8px',
                fontSize: '11px',
                fontWeight: 700,
                cursor: 'pointer',
                border: activeTab === t.id ? '1px solid var(--cb)' : '1px solid var(--br)',
                background: activeTab === t.id ? 'var(--ca)' : 'var(--b2)',
                color: activeTab === t.id ? 'var(--c)' : 'var(--t2)',
                transition: 'all 0.15s',
              }}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </header>

      {/* ── TOAST NOTIFICATION ── */}
      {toast && (
        <div
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            zIndex: 100,
            background: 'var(--b3)',
            border: '1px solid var(--cb)',
            color: 'var(--t1)',
            padding: '12px 18px',
            borderRadius: '10px',
            boxShadow: '0 12px 32px rgba(0,0,0,0.55)',
            fontSize: '12px',
            fontWeight: 600,
            maxWidth: '460px',
          }}
        >
          {toast}
        </div>
      )}

      {/* ── MAIN CONTENT ── */}
      <main style={{ flex: 1, maxWidth: '1440px', width: '100%', margin: '0 auto', padding: '20px 24px' }}>
        {/* ═══════════════════════════════════════════════════════ */}
        {/* TAB 1: OPERATOR DESK */}
        {/* ═══════════════════════════════════════════════════════ */}
        {activeTab === 'desk' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* KPI GRID */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '12px',
              }}
            >
              <KpiCard
                label="ยอดรับวันนี้ (Received Today)"
                value={fmtInt(summary?.receivedThb || 0)}
                unit="THB"
                note={`วงเงินรอบนี้ (Limit): ${fmtInt(summary?.limitThb || 500000)} THB (${summary?.usedPercent || 0}%)`}
                color="green"
                progress={summary?.usedPercent || 0}
                icon={<CeIcon name="receive" size={14} color="#00e676" />}
              />
              <KpiCard
                label="วงเงินคงเหลือ (Remaining Limit)"
                value={fmtInt(summary?.remainingThb || 0)}
                unit="THB"
                note={`บัญชีหลัก (PIN): ${summary?.pinnedBank.code || 'BBL'} · ${summary?.pinnedBank.account || ''}`}
                color="cyan"
                progress={100 - (summary?.usedPercent || 0)}
                icon={<CeIcon name="limit" size={14} color="#00d4ff" />}
              />
              <KpiCard
                label="โอนเหรียญแล้ว (USDT Sent)"
                value={fmtUsdt(summary?.sentUsdt || 0)}
                unit="USDT"
                note={`สำเร็จแล้ว (Settled): ${summary?.counts?.SETTLED || 0} รายการ (items)`}
                color="cyan"
                icon={<CeIcon name="send" size={14} color="#00d4ff" />}
              />
              <KpiCard
                label="รอโอนเหรียญ (Pending USDT)"
                value={fmtUsdt(summary?.pendingUsdt || 0)}
                unit="USDT"
                note={`พร้อมโอน (Ready): ${summary?.counts?.READY || 0} · รอคิว (Pending): ${summary?.counts?.PENDING || 0}`}
                color="yellow"
                icon={<CeIcon name="pending" size={14} color="#ffca28" />}
              />
              <KpiCard
                label="ยอดส่งขาด (Shortfall USDT)"
                value={fmtUsdt(summary?.negativeUsdt || 0)}
                unit="USDT"
                note={`รอโอนชดเชย (Short Items): ${summary?.counts?.SHORT || 0} รายการ`}
                color="red"
                icon={<CeIcon name="short" size={14} color="#ff5252" />}
              />
              <KpiCard
                label="กำไรรอบนี้ (Cycle Profit)"
                value={fmtThb(summary?.profitThb || 0)}
                unit="THB"
                note={`เรทโต๊ะ (Desk) ${summary?.rate.toFixed(2) || '43.00'} · ตลาด (MKT) ${summary?.marketRate.toFixed(2) || '42.65'}`}
                color="gold"
                icon={<CeIcon name="profit" size={14} color="#f0b429" />}
              />
            </div>

            {/* QUICK OPERATOR BAR */}
            <div
              style={{
                background: 'var(--b2)',
                border: '1px solid var(--br)',
                borderRadius: '14px',
                padding: '12px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
                flexWrap: 'wrap',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <CeButton
                  variant="primary"
                  size="sm"
                  onClick={() => setActiveTab('scan')}
                  icon={<CeIcon name="scan" size={14} color="var(--b0)" />}
                >
                  รับสลิปใหม่ (Scan Slip)
                </CeButton>
                <CeButton
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setStatusFilter('PENDING');
                    setPanelMode('tx');
                  }}
                  icon={<CeIcon name="pending" size={14} color="var(--c)" />}
                >
                  คิวรอโอน (Pending: {summary?.counts?.PENDING || 0})
                </CeButton>
                <CeButton
                  variant="outline"
                  size="sm"
                  onClick={() => setPanelMode('summary')}
                  icon={<CeIcon name="profit" size={14} color="var(--c)" />}
                >
                  สรุปรอบงาน (Summary · {summary?.cycle || 'CE44'})
                </CeButton>
                <CeButton
                  variant="ghost"
                  size="sm"
                  onClick={() => setPanelMode('pin')}
                  icon={<CeIcon name="bank" size={14} color="var(--g)" />}
                >
                  📌 ปักหมุดบัญชี (Bank PIN · {summary?.pinnedBank.code || 'BBL'})
                </CeButton>
                <CeButton
                  variant="ghost"
                  size="sm"
                  onClick={() => setPanelMode('rate')}
                  icon={<CeIcon name="rate" size={14} color="var(--g)" />}
                >
                  💱 ตั้งเรท (Rate · {summary?.rate.toFixed(2) || '43.00'})
                </CeButton>
                <CeButton
                  variant="gold"
                  size="sm"
                  onClick={() => setPanelMode('cycle')}
                  icon={<CeIcon name="cycle" size={14} color="var(--b0)" />}
                >
                  🔄 เปิดรอบใหม่ (New Cycle)
                </CeButton>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <CeButton
                  variant="outline"
                  size="sm"
                  onClick={() => setActiveTab('settings')}
                  icon={<CeIcon name="bot" size={13} color="var(--c)" />}
                >
                  ตั้งค่า API & บอท (Bot Settings)
                </CeButton>
                <CeButton
                  variant="ghost"
                  size="sm"
                  onClick={handleResetDemo}
                  loading={loadingAction === 'reset'}
                  icon={<CeIcon name="refresh" size={13} color="var(--t2)" />}
                >
                  รีเซ็ตตัวอย่าง (Reset Demo)
                </CeButton>
              </div>
            </div>

            {/* TWO-COLUMN WORKSPACE */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(340px, 1.15fr) minmax(360px, 1fr)',
                gap: '20px',
                alignItems: 'start',
              }}
            >
              {/* LEFT: TRANSACTION QUEUE */}
              <div
                style={{
                  background: 'var(--b1)',
                  border: '1px solid var(--br)',
                  borderRadius: '14px',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '14px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '0.8px', color: 'var(--c)' }}>
                    รายการธุรกรรม (Transaction Queue · {filteredTransactions.length})
                  </div>
                  {/* Status Filter Chips */}
                  <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                    {(['ALL', 'READY', 'PENDING', 'SHORT', 'MISMATCH', 'REVIEW', 'SETTLED'] as const).map((st) => (
                      <button
                        key={st}
                        onClick={() => setStatusFilter(st)}
                        style={{
                          padding: '4px 9px',
                          borderRadius: '9999px',
                          fontSize: '9px',
                          fontWeight: 700,
                          letterSpacing: '0.8px',
                          cursor: 'pointer',
                          border: statusFilter === st ? '1px solid var(--cb)' : '1px solid var(--br)',
                          background: statusFilter === st ? 'var(--ca)' : 'var(--b2)',
                          color: statusFilter === st ? 'var(--c)' : 'var(--t3)',
                        }}
                      >
                        {st === 'ALL' ? 'ทั้งหมด (ALL)' : st}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {filteredTransactions.map((tx) => (
                    <div
                      key={tx.id}
                      style={{
                        borderRadius: '11px',
                        outline: selectedTx?.id === tx.id && panelMode === 'tx' ? '1.5px solid var(--c)' : 'none',
                      }}
                    >
                      <TxItem
                        id={tx.id}
                        thb={fmtThb(tx.thb)}
                        usdt={fmtUsdt(tx.usdtExpected)}
                        bank={tx.bank}
                        sender={tx.sender}
                        time={tx.time}
                        status={tx.status}
                        onClick={() => {
                          setSelectedTxId(tx.id);
                          setPanelMode('tx');
                        }}
                      />
                    </div>
                  ))}
                  {filteredTransactions.length === 0 && (
                    <div style={{ padding: '32px', textAlign: 'center', color: 'var(--t3)', fontSize: '12px' }}>
                      ไม่มีรายการในสถานะนี้ (No transactions in {statusFilter})
                    </div>
                  )}
                </div>
              </div>

              {/* RIGHT: INTERACTIVE SCREEN FOR SELECTED TX OR DESK SETTING */}
              <div
                style={{
                  background: 'var(--b2)',
                  border: '1px solid var(--br)',
                  borderRadius: '14px',
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px',
                  position: 'sticky',
                  top: '76px',
                }}
              >
                {/* MODE 1: TRANSACTION INSPECTOR & ACTION WORKFLOW */}
                {panelMode === 'tx' && selectedTx && (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div>
                        <div style={{ fontSize: '10px', color: 'var(--t3)', fontFamily: "'Space Mono', monospace" }}>
                          {selectedTx.id} · {selectedTx.time} น.
                        </div>
                        <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--t1)', marginTop: '2px' }}>
                          {selectedTx.status === 'MISMATCH' && 'ตรวจสอบบัญชีไม่ตรง (Bank Account Mismatch)'}
                          {selectedTx.status === 'SHORT' && 'โอนชดเชยยอดขาด (Shortfall Recovery)'}
                          {(selectedTx.status === 'READY' || selectedTx.status === 'PENDING') && 'บันทึกการโอนเหรียญ (USDT Settlement)'}
                          {selectedTx.status === 'SETTLED' && 'โอนเหรียญสำเร็จครบถ้วน (Settlement Completed ✓)'}
                          {(selectedTx.status === 'REVIEW' || selectedTx.status === 'OCR') && 'ตรวจสอบสลิปด้วยตนเอง (Manual OCR Review)'}
                          {(selectedTx.status === 'REJECTED' || selectedTx.status === 'REVERSED' || selectedTx.status === 'DUPLICATE') &&
                            `รายละเอียดรายการ (Transaction · ${selectedTx.status})`}
                        </div>
                      </div>
                      <StatusBadge status={selectedTx.status} />
                    </div>

                    {/* Core details card */}
                    <div
                      style={{
                        background: 'var(--b3)',
                        border: '1px solid var(--br)',
                        borderRadius: '10px',
                        padding: '14px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px',
                        fontSize: '12px',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--t3)' }}>📥 ยอดรับโอน (Received THB)</span>
                        <strong style={{ color: 'var(--s)', fontFamily: "'Space Mono', monospace" }}>
                          ฿{fmtThb(selectedTx.thb)}
                        </strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--t3)' }}>💎 ยอดต้องโอน (Expected USDT)</span>
                        <strong style={{ color: 'var(--c)', fontFamily: "'Space Mono', monospace" }}>
                          {fmtUsdt(selectedTx.usdtExpected)} USDT
                        </strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--t3)' }}>📤 โอนแล้วสะสม (Sent Total)</span>
                        <strong style={{ color: 'var(--t1)', fontFamily: "'Space Mono', monospace" }}>
                          {fmtUsdt(selectedTx.usdtSent)} USDT
                        </strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--t3)' }}>🏦 บัญชีในสลิป (Slip Account)</span>
                        <strong
                          style={{
                            color: selectedTx.bank.toUpperCase() === summary?.pinnedBank.code.toUpperCase() ? 'var(--s)' : 'var(--al)',
                            fontFamily: "'Space Mono', monospace",
                          }}
                        >
                          {selectedTx.bank} · {selectedTx.account}
                        </strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--t3)' }}>👤 ผู้โอน / ลูกค้า (Sender / Client)</span>
                        <span>{selectedTx.sender}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--t3)' }}>🔎 ความแม่นยำ (OCR Confidence)</span>
                        <span style={{ fontFamily: "'Space Mono', monospace", color: selectedTx.confidence >= 80 ? 'var(--s)' : 'var(--w)' }}>
                          {selectedTx.confidence}%
                        </span>
                      </div>
                      {selectedTx.notes && (
                        <div
                          style={{
                            marginTop: '4px',
                            paddingTop: '8px',
                            borderTop: '1px solid var(--br)',
                            fontSize: '11px',
                            color: 'var(--t2)',
                          }}
                        >
                          ℹ️ {selectedTx.notes}
                        </div>
                      )}
                    </div>

                    {/* SCREEN 03: MISMATCH FLOW */}
                    {selectedTx.status === 'MISMATCH' && (
                      <div
                        style={{
                          background: 'var(--ala)',
                          border: '1px solid var(--alb)',
                          borderRadius: '10px',
                          padding: '14px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '10px',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}>
                          <div>
                            <div style={{ fontSize: '9px', color: 'var(--t3)', textTransform: 'uppercase' }}>บัญชีสลิป (Slip Account)</div>
                            <strong style={{ color: 'var(--al)' }}>
                              {selectedTx.bank} · {selectedTx.account}
                            </strong>
                          </div>
                          <span style={{ fontSize: '16px', color: 'var(--al)', fontWeight: 800 }}>≠</span>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '9px', color: 'var(--t3)', textTransform: 'uppercase' }}>บัญชีหลักวันนี้ (Today PIN)</div>
                            <strong style={{ color: 'var(--s)' }}>
                              {summary?.pinnedBank.code} · {summary?.pinnedBank.account}
                            </strong>
                          </div>
                        </div>

                        <div>
                          <label style={{ fontSize: '10px', color: 'var(--t3)', display: 'block', marginBottom: '4px' }}>
                            เหตุผลการอนุมัติพิเศษ (Override Reason · Audit Log):
                          </label>
                          <input
                            value={overrideReason}
                            onChange={(e) => setOverrideReason(e.target.value)}
                            style={{
                              width: '100%',
                              padding: '8px 10px',
                              borderRadius: '8px',
                              background: 'var(--b1)',
                              border: '1px solid var(--br)',
                              color: 'var(--t1)',
                              fontSize: '12px',
                            }}
                          />
                        </div>

                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                          <CeButton
                            variant="outline"
                            size="sm"
                            onClick={() => handleTxAction(selectedTx.id, 'recheck')}
                            loading={loadingAction === `${selectedTx.id}:recheck`}
                            icon={<CeIcon name="recheck" size={14} />}
                          >
                            ตรวจซ้ำ (Recheck)
                          </CeButton>
                          <CeButton
                            variant="warning"
                            size="sm"
                            onClick={() => handleTxAction(selectedTx.id, 'override', { reason: overrideReason })}
                            loading={loadingAction === `${selectedTx.id}:override`}
                            icon={<CeIcon name="override" size={14} color="var(--b0)" />}
                          >
                            ⚡ อนุมัติพิเศษ (Override → Ready)
                          </CeButton>
                          <CeButton
                            variant="danger"
                            size="sm"
                            onClick={() => handleTxAction(selectedTx.id, 'reject', { reason: 'บัญชีไม่ตรง (Bank Mismatch)' })}
                            loading={loadingAction === `${selectedTx.id}:reject`}
                          >
                            ❌ ปฏิเสธ (Reject)
                          </CeButton>
                        </div>
                      </div>
                    )}

                    {/* SCREEN 02: REVIEW / OCR CONFIRMATION */}
                    {(selectedTx.status === 'REVIEW' || selectedTx.status === 'OCR') && (
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        <CeButton
                          variant="success"
                          size="sm"
                          fullWidth
                          onClick={() => handleTxAction(selectedTx.id, 'confirm')}
                          loading={loadingAction === `${selectedTx.id}:confirm`}
                          icon={<CeIcon name="check" size={14} color="var(--b0)" />}
                        >
                          ✓ ยืนยันข้อมูลถูกต้อง (Confirm → Ready)
                        </CeButton>
                        <CeButton
                          variant="danger"
                          size="sm"
                          fullWidth
                          onClick={() => handleTxAction(selectedTx.id, 'reject', { reason: 'สลิปไม่ผ่านการตรวจสอบ (OCR Rejected)' })}
                          loading={loadingAction === `${selectedTx.id}:reject`}
                        >
                          ❌ ปฏิเสธรายการ (Reject Transaction)
                        </CeButton>
                      </div>
                    )}

                    {/* SCREEN 04 & 05: SETTLEMENT & SHORT RECOVERY */}
                    {(selectedTx.status === 'READY' || selectedTx.status === 'PENDING' || selectedTx.status === 'SHORT') && (
                      <div
                        style={{
                          background: selectedTx.status === 'SHORT' ? 'var(--da)' : 'var(--b3)',
                          border: `1px solid ${selectedTx.status === 'SHORT' ? 'var(--db)' : 'var(--cb)'}`,
                          borderRadius: '10px',
                          padding: '14px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '10px',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--c)' }}>
                            {selectedTx.status === 'SHORT'
                              ? `▼ ยอดส่งขาด (Shortfall): ${fmtUsdt(selectedTx.usdtExpected - selectedTx.usdtSent)} USDT`
                              : `📤 บันทึกส่ง USDT (คงเหลือ · Remaining ${fmtUsdt(selectedTx.usdtExpected - selectedTx.usdtSent)} USDT)`}
                          </span>
                          <span style={{ fontSize: '11px', fontFamily: "'Space Mono', monospace", color: 'var(--t2)' }}>
                            {Math.min(100, Number(((selectedTx.usdtSent / selectedTx.usdtExpected) * 100).toFixed(1)))}%
                          </span>
                        </div>

                        <div style={{ height: '5px', background: 'var(--b1)', borderRadius: '9999px', overflow: 'hidden' }}>
                          <div
                            style={{
                              width: `${Math.min(100, (selectedTx.usdtSent / selectedTx.usdtExpected) * 100)}%`,
                              height: '100%',
                              background: 'linear-gradient(90deg, var(--c), var(--g))',
                            }}
                          />
                        </div>

                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <input
                            type="number"
                            step="0.01"
                            value={settleAmount}
                            onChange={(e) => setSettleAmount(e.target.value)}
                            style={{
                              flex: 1,
                              padding: '9px 12px',
                              borderRadius: '8px',
                              background: 'var(--b1)',
                              border: '1px solid var(--br)',
                              color: 'var(--t1)',
                              fontFamily: "'Space Mono', monospace",
                              fontSize: '13px',
                              fontWeight: 700,
                            }}
                          />
                          <span style={{ fontSize: '11px', color: 'var(--t3)', fontFamily: "'Space Mono', monospace" }}>USDT</span>
                        </div>

                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                          {selectedTx.status === 'READY' && (
                            <CeButton
                              variant="outline"
                              size="sm"
                              onClick={() => handleTxAction(selectedTx.id, 'queue')}
                              loading={loadingAction === `${selectedTx.id}:queue`}
                            >
                              ⏳ เข้าคิวรอโอน (Queue Pending)
                            </CeButton>
                          )}
                          <CeButton
                            variant="success"
                            size="sm"
                            onClick={() =>
                              handleTxAction(
                                selectedTx.id,
                                selectedTx.status === 'SHORT' ? 'recover-short' : 'settle',
                                { usdt: Number(settleAmount) }
                              )
                            }
                            loading={
                              loadingAction === `${selectedTx.id}:settle` ||
                              loadingAction === `${selectedTx.id}:recover-short`
                            }
                            icon={<CeIcon name="check" size={14} color="var(--b0)" />}
                          >
                            {selectedTx.status === 'SHORT'
                              ? '📤 โอนชดเชยยอดขาด (Recover Short)'
                              : '✓ ยืนยันการโอนเหรียญ (Submit Settlement)'}
                          </CeButton>
                          {selectedTx.status !== 'SHORT' && (
                            <CeButton
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                setSettleAmount(
                                  String(Number(Math.max(1, selectedTx.usdtExpected - selectedTx.usdtSent - 2.56).toFixed(2)))
                                )
                              }
                            >
                              จำลองส่งขาด (Simulate -2.56)
                            </CeButton>
                          )}
                        </div>
                      </div>
                    )}

                    {/* SCREEN 07: DONE / SETTLED */}
                    {selectedTx.status === 'SETTLED' && (
                      <div
                        style={{
                          background: 'var(--sa)',
                          border: '1px solid var(--sb)',
                          borderRadius: '10px',
                          padding: '14px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '8px',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <CeIcon name="settled" size={22} color="var(--s)" />
                          <div>
                            <div style={{ fontSize: '12px', fontWeight: 800, color: 'var(--s)' }}>
                              โอนครบสมบูรณ์ (SETTLEMENT COMPLETED ✓)
                            </div>
                            <div style={{ fontSize: '11px', color: 'var(--t2)' }}>
                              โอนครบ {fmtUsdt(selectedTx.usdtSent)} USDT เรียบร้อยแล้ว (Full Amount Sent)
                            </div>
                          </div>
                        </div>
                        <CeButton
                          variant="ghost"
                          size="sm"
                          onClick={() => handleTxAction(selectedTx.id, 'reverse', { reason: 'ผู้ดูแลระบบสั่งย้อนกลับ (Admin Reverse)' })}
                          loading={loadingAction === `${selectedTx.id}:reverse`}
                        >
                          ↩️ ย้อนกลับ (Reverse)
                        </CeButton>
                      </div>
                    )}

                    {/* Settlement History Entries */}
                    {selectedTx.settlements?.length > 0 && (
                      <div
                        style={{
                          background: 'var(--b3)',
                          border: '1px solid var(--br)',
                          borderRadius: '10px',
                          padding: '10px 14px',
                        }}
                      >
                        <div style={{ fontSize: '9px', color: 'var(--t3)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '6px' }}>
                          ประวัติการส่งเหรียญ (Settlement Entries)
                        </div>
                        {selectedTx.settlements.map((se) => (
                          <div
                            key={se.id}
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              fontSize: '11px',
                              fontFamily: "'Space Mono', monospace",
                              padding: '3px 0',
                            }}
                          >
                            <span style={{ color: 'var(--t2)' }}>
                              {se.id} · {se.time} น.
                            </span>
                            <strong style={{ color: 'var(--c)' }}>{fmtUsdt(se.usdt)} USDT</strong>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Live Telegram Bot Card Output */}
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px', gap: '8px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '10px', color: 'var(--t3)', letterSpacing: '0.8px', textTransform: 'uppercase' }}>
                          ตัวอย่างข้อความบอท (Telegram Message Preview)
                        </span>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <button
                            onClick={() => handleSendTelegramLive(renderBotMessageForTx(selectedTx), `tx-card:${selectedTx.id}`)}
                            disabled={loadingAction === `tg-send:tx-card:${selectedTx.id}`}
                            style={{
                              background: 'var(--ca)',
                              border: '1px solid var(--cb)',
                              borderRadius: '6px',
                              padding: '4px 9px',
                              color: 'var(--c)',
                              fontSize: '10px',
                              cursor: 'pointer',
                              fontWeight: 700,
                            }}
                          >
                            📨 ส่งเข้า Telegram (Send Live)
                          </button>
                          <button
                            onClick={() => copyText(renderBotMessageForTx(selectedTx), 'คัดลอกข้อความ Telegram แล้ว (Message Copied)')}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: 'var(--c)',
                              fontSize: '11px',
                              cursor: 'pointer',
                              fontWeight: 700,
                            }}
                          >
                            📋 คัดลอก (Copy)
                          </button>
                        </div>
                      </div>
                      <pre
                        style={{
                          margin: 0,
                          padding: '12px',
                          borderRadius: '10px',
                          background: 'var(--b0)',
                          border: '1px solid var(--br)',
                          color: 'var(--t1)',
                          fontFamily: "'Space Mono', monospace",
                          fontSize: '11px',
                          lineHeight: 1.55,
                          whiteSpace: 'pre-wrap',
                        }}
                      >
                        {renderBotMessageForTx(selectedTx)}
                      </pre>
                    </div>
                  </>
                )}

                {/* MODE 2: SCREEN 06 SUMMARY */}
                {panelMode === 'summary' && summary && (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--c)' }}>
                        สรุปภาพรวมรอบงาน (Cycle Summary · {summary.cycle})
                      </div>
                      <CeButton variant="ghost" size="sm" onClick={() => setPanelMode('tx')}>
                        ← กลับคิวงาน (Back)
                      </CeButton>
                    </div>
                    <div
                      style={{
                        background: 'var(--b3)',
                        border: '1px solid var(--br)',
                        borderRadius: '10px',
                        padding: '14px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px',
                        fontSize: '12px',
                        fontFamily: "'Space Mono', monospace",
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--t3)' }}>💳 วงเงินรอบนี้ (LIMIT)</span>
                        <strong>{fmtInt(summary.limitThb)} THB</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--t3)' }}>📊 ใช้ไปแล้ว (USED)</span>
                        <strong>{fmtInt(summary.usedThb)} THB</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--t3)' }}>🟢 คงเหลือ (REMAINING)</span>
                        <strong style={{ color: 'var(--s)' }}>{fmtInt(summary.remainingThb)} THB</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--t3)' }}>📥 ยอดรับสะสม (RECEIVED)</span>
                        <strong style={{ color: 'var(--s)' }}>{fmtInt(summary.receivedThb)} THB</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--t3)' }}>📤 โอนแล้ว (USDT SENT)</span>
                        <strong style={{ color: 'var(--c)' }}>{fmtUsdt(summary.sentUsdt)} USDT</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--t3)' }}>⏳ รอโอน (PENDING)</span>
                        <strong style={{ color: 'var(--w)' }}>{fmtUsdt(summary.pendingUsdt)} USDT</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--t3)' }}>🔴 ยอดส่งขาด (SHORTFALL)</span>
                        <strong style={{ color: 'var(--d)' }}>{fmtUsdt(summary.negativeUsdt)} USDT</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--t3)' }}>✨ กำไรรอบนี้ (PROFIT)</span>
                        <strong style={{ color: 'var(--g)' }}>{fmtThb(summary.profitThb)} THB</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--t3)' }}>💱 เรทโต๊ะ (DESK RATE)</span>
                        <strong style={{ color: 'var(--g)' }}>{summary.rate.toFixed(2)} THB</strong>
                      </div>
                    </div>
                    <CeButton
                      variant="outline"
                      size="sm"
                      icon={<CeIcon name="send" size={13} color="var(--c)" />}
                      loading={loadingAction === 'tg-send:cycle-summary'}
                      onClick={() =>
                        handleSendTelegramLive(
                          MSG.CYCLE_SUMMARY({
                            cycle_current: summary.cycle,
                            limit: fmtInt(summary.limitThb),
                            used: fmtInt(summary.usedThb),
                            remaining: fmtInt(summary.remainingThb),
                            thb: fmtInt(summary.receivedThb),
                            usdt: fmtUsdt(summary.sentUsdt),
                            usdt_expected: fmtUsdt(summary.pendingUsdt),
                            usdt_short: fmtUsdt(summary.shortUsdt),
                            profit: fmtThb(summary.profitThb),
                            rate: summary.rate.toFixed(2),
                          }),
                          'cycle-summary'
                        )
                      }
                    >
                      📨 ส่งสรุปรอบนี้เข้า Telegram (Send Cycle Summary)
                    </CeButton>
                  </>
                )}

                {/* MODE 3: SMART BANK PIN MANAGER */}
                {panelMode === 'pin' && summary && (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--g)' }}>
                        📌 ระบบ PIN อัจฉริยะ (Smart Auto-Format PIN)
                      </div>
                      <CeButton variant="ghost" size="sm" onClick={() => setPanelMode('tx')}>
                        ← กลับ (Back)
                      </CeButton>
                    </div>

                    {/* Smart PIN Freeform Auto-Parser */}
                    <div
                      style={{
                        background: 'var(--b3)',
                        border: '1px solid var(--cb)',
                        borderRadius: '10px',
                        padding: '14px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '10px',
                      }}
                    >
                      <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--c)' }}>
                        ✨ พิมพ์หรือวางข้อมูลบัญชีแบบอิสระ ระบบจัดรูปแบบให้อัตโนมัติ (Smart Auto-Format):
                      </div>
                      <textarea
                        rows={2}
                        placeholder="เช่น: ธิติ ทองมี 1230004444 กสิกร วงเงิน 50000"
                        value={smartPinInput}
                        onChange={(e) => setSmartPinInput(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '10px',
                          borderRadius: '8px',
                          background: 'var(--b1)',
                          border: '1px solid var(--br)',
                          color: 'var(--t1)',
                          fontSize: '12px',
                          resize: 'vertical',
                        }}
                      />

                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        <button
                          onClick={() => setSmartPinInput('ธิติ ทองมี 1230004444 กสิกร วงเงิน 50000')}
                          style={{
                            padding: '4px 9px',
                            borderRadius: '6px',
                            fontSize: '10px',
                            cursor: 'pointer',
                            background: 'var(--b2)',
                            border: '1px solid var(--br)',
                            color: 'var(--t2)',
                          }}
                        >
                          ตัวอย่าง: กสิกร 50,000฿
                        </button>
                        <button
                          onClick={() => setSmartPinInput('BBL 0970281670 บจก. ซีอี เอ็มไพร์ วงเงิน 500000')}
                          style={{
                            padding: '4px 9px',
                            borderRadius: '6px',
                            fontSize: '10px',
                            cursor: 'pointer',
                            background: 'var(--b2)',
                            border: '1px solid var(--br)',
                            color: 'var(--t2)',
                          }}
                        >
                          ตัวอย่าง: กรุงเทพ 500,000฿
                        </button>
                      </div>

                      {smartPinPreview ? (
                        <div>
                          <div style={{ fontSize: '10px', color: 'var(--s)', marginBottom: '4px', fontWeight: 700 }}>
                            ✓ ตัวอย่างการ์ดที่บอทจัดรูปแบบอัตโนมัติ (Auto-Formatted Card Preview):
                          </div>
                          <pre
                            style={{
                              margin: 0,
                              padding: '12px',
                              borderRadius: '8px',
                              background: 'var(--b0)',
                              border: '1px solid var(--sb)',
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
                      ) : (
                        <div style={{ fontSize: '11px', color: 'var(--w)' }}>
                          ⚠️ พิมพ์ชื่อธนาคาร (เช่น กสิกร, BBL, SCB, KTB) และเลขบัญชี 10 หลัก เพื่อให้ระบบจัดรูปแบบอัตโนมัติ
                        </div>
                      )}

                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        <CeButton
                          variant="primary"
                          size="sm"
                          disabled={!smartPinPreview}
                          loading={loadingAction === 'smart-pin-tg'}
                          onClick={() => handleSmartPinSubmit(true, true)}
                          icon={<CeIcon name="pin" size={14} color="var(--b0)" />}
                        >
                          📌 บันทึก & ปักหมุดเข้า Telegram อัตโนมัติ (Save & Auto-Pin)
                        </CeButton>
                        <CeButton
                          variant="outline"
                          size="sm"
                          disabled={!smartPinPreview}
                          loading={loadingAction === 'smart-pin'}
                          onClick={() => handleSmartPinSubmit(false, false)}
                        >
                          💾 บันทึกเฉพาะในระบบ (Save Only)
                        </CeButton>
                      </div>
                    </div>

                    {/* Quick Dropdown Selector */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', paddingTop: '6px', borderTop: '1px solid var(--br)' }}>
                      <label style={{ fontSize: '11px', color: 'var(--t2)' }}>
                        หรือเลือกจากบัญชีที่บันทึกไว้ (Or Select Saved Account):
                      </label>
                      <select
                        value={pinCodeInput}
                        onChange={(e) => setPinCodeInput(e.target.value)}
                        style={{
                          padding: '10px',
                          borderRadius: '8px',
                          background: 'var(--b1)',
                          border: '1px solid var(--br)',
                          color: 'var(--t1)',
                        }}
                      >
                        {banks.map((b, idx) => (
                          <option key={`${b.code}-${b.account}-${idx}`} value={b.code}>
                            {b.code} · {b.account} ({b.holder})
                          </option>
                        ))}
                      </select>

                      <label style={{ fontSize: '11px', color: 'var(--t2)' }}>วงเงินรับสูงสุดรอบนี้ (Cycle Limit THB):</label>
                      <input
                        type="number"
                        value={limitInput}
                        onChange={(e) => setLimitInput(e.target.value)}
                        style={{
                          padding: '10px',
                          borderRadius: '8px',
                          background: 'var(--b1)',
                          border: '1px solid var(--br)',
                          color: 'var(--t1)',
                          fontFamily: "'Space Mono', monospace",
                        }}
                      />

                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        <CeButton
                          variant="success"
                          size="sm"
                          onClick={() => handleUpdatePin(true)}
                          loading={loadingAction === 'pin-tg'}
                          icon={<CeIcon name="pin" size={14} color="var(--b0)" />}
                        >
                          📌 เลือก & ปักหมุดเข้า Telegram
                        </CeButton>
                        <CeButton
                          variant="ghost"
                          size="sm"
                          onClick={() => handleUpdatePin(false)}
                          loading={loadingAction === 'pin'}
                        >
                          บันทึกในระบบ (Save)
                        </CeButton>
                      </div>
                    </div>
                  </>
                )}

                {/* MODE 4: DESK RATE MANAGER */}
                {panelMode === 'rate' && summary && (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--g)' }}>
                        💱 ตั้งเรทขายโต๊ะ (Desk USDT/THB Rate)
                      </div>
                      <CeButton variant="ghost" size="sm" onClick={() => setPanelMode('tx')}>
                        ← กลับ (Back)
                      </CeButton>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <label style={{ fontSize: '11px', color: 'var(--t2)' }}>เรทขาย USDT ของโต๊ะ (Manual Desk Rate · /setrate):</label>
                      <input
                        type="number"
                        step="0.05"
                        value={rateInput}
                        onChange={(e) => setRateInput(e.target.value)}
                        style={{
                          padding: '10px',
                          borderRadius: '8px',
                          background: 'var(--b1)',
                          border: '1px solid var(--br)',
                          color: 'var(--g)',
                          fontFamily: "'Space Mono', monospace",
                          fontSize: '16px',
                          fontWeight: 700,
                        }}
                      />
                      <CeButton
                        variant="gold"
                        onClick={handleUpdateRate}
                        loading={loadingAction === 'rate'}
                        icon={<CeIcon name="rate" size={14} color="var(--b0)" />}
                      >
                        อัปเดตเรทโต๊ะ (Update Desk Rate)
                      </CeButton>
                      <CeButton
                        variant="ghost"
                        onClick={handleAutoRate}
                        loading={loadingAction === 'rate-auto'}
                        icon={<CeIcon name="usdt" size={14} color="var(--c)" />}
                      >
                        🤖 เรทอัตโนมัติตามตลาด (Auto Market: {market?.rate ? market.rate.toFixed(2) : '—'} + {autoCfg?.rateSpread ?? 0.3})
                      </CeButton>
                      <div
                        style={{
                          marginTop: '6px',
                          padding: '10px',
                          borderRadius: '8px',
                          background: 'var(--b1)',
                          border: '1px solid var(--br)',
                          fontSize: '11px',
                          color: 'var(--t2)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '4px',
                        }}
                      >
                        <strong style={{ color: 'var(--t1)' }}>⚙️ สถานะการเชื่อมต่อ (System Integrations)</strong>
                        <span>📈 ตลาดอ้างอิง (Market Source): {market?.source || '—'} · โหมด {market?.rateMode === 'auto' ? 'AUTO' : 'MANUAL'}</span>
                        <span>💾 ฐานข้อมูล (Storage): {autoCfg?.integrations?.storage?.mode || 'local-json'}</span>
                        <span>
                          📨 Telegram Bot: {tgConnected ? '✅ พร้อมใช้งาน (Connected)' : '⏸ ยังไม่ได้ตั้งค่า (คลิกแท็บ Settings เพื่อเชื่อมต่อ)'}
                        </span>
                      </div>
                    </div>
                  </>
                )}

                {/* MODE 5: NEW CYCLE */}
                {panelMode === 'cycle' && summary && (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--g)' }}>
                        🔄 ปิดรอบ {summary.cycle} → เปิดรอบใหม่ (New Cycle)
                      </div>
                      <CeButton variant="ghost" size="sm" onClick={() => setPanelMode('tx')}>
                        ← กลับ (Back)
                      </CeButton>
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--t2)', lineHeight: 1.6 }}>
                      การเปิดรอบใหม่จะบันทึกยอดสรุปของรอบ <strong>{summary.cycle}</strong> ลงประวัติ (Cycle History) และคงรายการที่ยังค้างโอน (READY / PENDING / SHORT) ไว้ในคิวโดยไม่ลบข้อมูล
                    </div>
                    <CeButton
                      variant="gold"
                      onClick={handleNewCycle}
                      loading={loadingAction === 'cycle'}
                      icon={<CeIcon name="cycle" size={14} color="var(--b0)" />}
                    >
                      ยืนยันเปิดรอบถัดไป (Confirm New Cycle)
                    </CeButton>
                    {cycleHistory.length > 0 && (
                      <div style={{ marginTop: '8px' }}>
                        <div style={{ fontSize: '10px', color: 'var(--t3)', textTransform: 'uppercase', marginBottom: '6px' }}>
                          ประวัติรอบที่ปิดแล้ว (Closed Cycle History)
                        </div>
                        {cycleHistory.map((ch) => (
                          <div
                            key={ch.cycle}
                            style={{
                              padding: '8px 10px',
                              borderRadius: '8px',
                              background: 'var(--b3)',
                              border: '1px solid var(--br)',
                              fontSize: '11px',
                              display: 'flex',
                              justifyContent: 'space-between',
                              marginBottom: '4px',
                            }}
                          >
                            <span>
                              <strong>{ch.cycle}</strong> · {ch.closedAt}
                            </span>
                            <span style={{ fontFamily: "'Space Mono', monospace", color: 'var(--s)' }}>
                              ฿{fmtInt(ch.receivedThb)} · {fmtUsdt(ch.sentUsdt)} USDT
                            </span>
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
        {/* TAB 2: SCAN SLIP (OCR INTAKE SIMULATOR) */}
        {/* ═══════════════════════════════════════════════════════ */}
        {activeTab === 'scan' && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
              gap: '24px',
              alignItems: 'start',
            }}
          >
            <div
              style={{
                background: 'var(--b2)',
                border: '1px solid var(--br)',
                borderRadius: '14px',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--c)' }}>
                    สแกนและรับสลิปเข้าคิว (Scan Slip & OCR Intake)
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--t3)' }}>
                    ตรวจสอบความแม่นยำ OCR เทียบกับบัญชีหลักวันนี้ (Today PIN: {summary?.pinnedBank.code} · {summary?.pinnedBank.account})
                  </div>
                </div>
                <CeIcon name="scan" size={24} color="var(--c)" />
              </div>

              {/* Quick Scenario Presets */}
              <div>
                <div style={{ fontSize: '10px', color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>
                  สถานการณ์ทดสอบด่วน (1-Click Scenario Presets)
                </div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <CeButton
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setScanThb('10000');
                      setScanBank(summary?.pinnedBank.code || 'BBL');
                      setScanAccount(summary?.pinnedBank.account || '097-0-28xxx-x');
                      setScanSender('นาย สมชาย ใจดี');
                      setScanConfidence('98.7');
                      setScanSlipDate(formatThaiSlipDateTime());
                    }}
                  >
                    🟢 สลิปปกติ (Valid Match · 98.7%)
                  </CeButton>
                  <CeButton
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setScanThb('5000');
                      setScanBank('KTB');
                      setScanAccount('••••1670');
                      setScanSender('ลูกค้าทดสอบ (Date Mismatch)');
                      setScanConfidence('99.1');
                      setScanSlipDate('13/12/2569 19:39');
                    }}
                  >
                    🔴 วันที่สลิปไม่ตรง (13/12/2569)
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
                    🟠 บัญชีไม่ตรง (Bank Mismatch · KTB)
                  </CeButton>
                  <CeButton
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setScanThb('8500');
                      setScanBank(summary?.pinnedBank.code || 'BBL');
                      setScanAccount(summary?.pinnedBank.account || '097-0-28xxx-x');
                      setScanSender('นาย สม...ย ใจดี');
                      setScanConfidence('72.0');
                      setScanSlipDate(formatThaiSlipDateTime());
                    }}
                  >
                    🟡 สลิปไม่ชัด (Low OCR · 72%)
                  </CeButton>
                </div>
              </div>

              {/* Input fields */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '11px', color: 'var(--t2)', display: 'block', marginBottom: '4px' }}>
                    ยอดโอนตามสลิป (Amount THB)
                  </label>
                  <input
                    type="number"
                    value={scanThb}
                    onChange={(e) => setScanThb(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px',
                      borderRadius: '8px',
                      background: 'var(--b1)',
                      border: '1px solid var(--br)',
                      color: 'var(--g)',
                      fontFamily: "'Space Mono', monospace",
                      fontWeight: 700,
                    }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '11px', color: 'var(--t2)', display: 'block', marginBottom: '4px' }}>
                    ธนาคารผู้รับในสลิป (Recipient Bank)
                  </label>
                  <select
                    value={scanBank}
                    onChange={(e) => setScanBank(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px',
                      borderRadius: '8px',
                      background: 'var(--b1)',
                      border: '1px solid var(--br)',
                      color: 'var(--t1)',
                    }}
                  >
                    {banks.map((b, idx) => (
                      <option key={`${b.code}-${idx}`} value={b.code}>
                        {b.code} · {b.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '11px', color: 'var(--t2)', display: 'block', marginBottom: '4px' }}>
                    เลขบัญชีในสลิป (Slip Account No.)
                  </label>
                  <input
                    value={scanAccount}
                    onChange={(e) => setScanAccount(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px',
                      borderRadius: '8px',
                      background: 'var(--b1)',
                      border: '1px solid var(--br)',
                      color: 'var(--t1)',
                      fontFamily: "'Space Mono', monospace",
                    }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '11px', color: 'var(--t2)', display: 'block', marginBottom: '4px' }}>
                    ความแม่นยำ OCR (Confidence %)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={scanConfidence}
                    onChange={(e) => setScanConfidence(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px',
                      borderRadius: '8px',
                      background: 'var(--b1)',
                      border: '1px solid var(--br)',
                      color: 'var(--c)',
                      fontFamily: "'Space Mono', monospace",
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '11px', color: 'var(--t2)', display: 'block', marginBottom: '4px' }}>
                    ชื่อผู้โอนในสลิป (Sender Name)
                  </label>
                  <input
                    value={scanSender}
                    onChange={(e) => setScanSender(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px',
                      borderRadius: '8px',
                      background: 'var(--b1)',
                      border: '1px solid var(--br)',
                      color: 'var(--t1)',
                    }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '11px', color: 'var(--t2)', display: 'block', marginBottom: '4px' }}>
                    🗓 วันที่/เวลาสลิป (Slip Date & Time · พ.ศ.)
                  </label>
                  <input
                    value={scanSlipDate}
                    onChange={(e) => setScanSlipDate(e.target.value)}
                    placeholder="เช่น 13/12/2569 19:39"
                    style={{
                      width: '100%',
                      padding: '10px',
                      borderRadius: '8px',
                      background: 'var(--b1)',
                      border: '1px solid var(--br)',
                      color: 'var(--t1)',
                      fontFamily: "'Space Mono', monospace",
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <CeButton
                  variant="success"
                  onClick={() => handleScanSubmit(false)}
                  loading={loadingAction === 'scan'}
                  icon={<CeIcon name="scan" size={14} color="var(--b0)" />}
                >
                  🔎 ประมวลผลสลิป (Run OCR Intake)
                </CeButton>
                <CeButton
                  variant="ghost"
                  onClick={() => handleScanSubmit(true)}
                  loading={loadingAction === 'scan'}
                  icon={<CeIcon name="duplicate" size={14} color="var(--c)" />}
                >
                  จำลองสลิปซ้ำ (Simulate Duplicate)
                </CeButton>
              </div>
            </div>

            {/* Right: Live OCR Result & Bot Reply */}
            <div
              style={{
                background: 'var(--b2)',
                border: '1px solid var(--br)',
                borderRadius: '14px',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--c)' }}>
                  ผลลัพธ์การ์ดบอท (Telegram Bot Card Output)
                </span>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <CeButton
                    variant="outline"
                    size="sm"
                    loading={loadingAction === 'tg-send:scan-card'}
                    onClick={() => handleSendTelegramLive(currentScanCard, 'scan-card')}
                  >
                    📨 ส่งเข้า Telegram (Send Live)
                  </CeButton>
                  <CeButton
                    variant="ghost"
                    size="sm"
                    onClick={() => setActiveTab('desk')}
                  >
                    ไปที่คิวงาน (Open Desk) →
                  </CeButton>
                </div>
              </div>
              <pre
                style={{
                  margin: 0,
                  padding: '16px',
                  borderRadius: '10px',
                  background: 'var(--b0)',
                  border: '1px solid var(--cb)',
                  color: 'var(--t1)',
                  fontFamily: "'Space Mono', monospace",
                  fontSize: '12px',
                  lineHeight: 1.6,
                  whiteSpace: 'pre-wrap',
                  minHeight: '240px',
                }}
              >
                {currentScanCard}
              </pre>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════ */}
        {/* TAB 3: BOT MESSAGE TEMPLATES */}
        {/* ═══════════════════════════════════════════════════════ */}
        {activeTab === 'messages' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--c)' }}>
                  คลังข้อความแจ้งเตือนมาตรฐานสากล (Bilingual Bot Message Templates)
                </div>
                <div style={{ fontSize: '12px', color: 'var(--t3)' }}>
                  รองรับ 2 ภาษา ไทย-อังกฤษ (TH/EN) — กดคัดลอก (Copy) หรือยิงทดสอบเข้า Telegram จริง (Send Live) ได้ทันที
                </div>
              </div>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {['ALL', 'Intake · OCR', 'Verify · Checks', 'Transaction', 'Mismatch', 'Cycle', 'Alerts'].map((g) => (
                  <button
                    key={g}
                    onClick={() => setMsgGroup(g)}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '9999px',
                      fontSize: '11px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      border: msgGroup === g ? '1px solid var(--cb)' : '1px solid var(--br)',
                      background: msgGroup === g ? 'var(--ca)' : 'var(--b2)',
                      color: msgGroup === g ? 'var(--c)' : 'var(--t2)',
                    }}
                  >
                    {g === 'ALL' ? 'ทั้งหมด (ALL)' : g}
                  </button>
                ))}
              </div>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(330px, 1fr))',
                gap: '14px',
              }}
            >
              {messageTemplatesList
                .filter((m) => (msgGroup === 'ALL' ? true : m.group === msgGroup))
                .map((m) => (
                  <div
                    key={m.key}
                    style={{
                      background: 'var(--b2)',
                      border: '1px solid var(--br)',
                      borderRadius: '12px',
                      padding: '14px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '10px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                      <div>
                        <span style={{ fontSize: '10px', color: 'var(--c)', fontFamily: "'Space Mono', monospace", fontWeight: 700 }}>
                          {m.key} · {m.group}
                        </span>
                        <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--t1)', marginTop: '2px' }}>{m.title}</div>
                      </div>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <CeButton
                          variant="ghost"
                          size="sm"
                          loading={loadingAction === `tg-send:${m.key}`}
                          onClick={() => handleSendTelegramLive(m.text, m.key)}
                        >
                          📨 ส่ง (TG)
                        </CeButton>
                        <CeButton
                          variant="outline"
                          size="sm"
                          onClick={() => copyText(m.text, `คัดลอก ${m.key} แล้ว (Copied)`)}
                        >
                          📋 Copy
                        </CeButton>
                      </div>
                    </div>
                    <pre
                      style={{
                        margin: 0,
                        padding: '10px',
                        borderRadius: '8px',
                        background: 'var(--b0)',
                        border: '1px solid var(--br)',
                        color: 'var(--t1)',
                        fontFamily: "'Space Mono', monospace",
                        fontSize: '11px',
                        lineHeight: 1.5,
                        whiteSpace: 'pre-wrap',
                      }}
                    >
                      {m.text}
                    </pre>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════ */}
        {/* TAB: CE EMPIRE BOT FLEET (14 SPECIALIZED BOTS) */}
        {/* ═══════════════════════════════════════════════════════ */}
        {activeTab === 'bots' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Fleet Header Banner */}
            <div
              style={{
                background: 'var(--b2)',
                border: '1px solid var(--cb)',
                borderRadius: '14px',
                padding: '18px 22px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '16px',
                flexWrap: 'wrap',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div
                  style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '12px',
                    background: 'var(--ca)',
                    border: '1px solid var(--cb)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <CeIcon name="bot" size={24} color="var(--c)" />
                </div>
                <div>
                  <div style={{ fontSize: '17px', fontWeight: 800, color: 'var(--t1)' }}>
                    ศูนย์ควบคุมบอทครบระบบ CE Empire (All {fleetSummary?.total || 14} Operational Bots)
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--t2)' }}>
                    เชื่อมเรทตลาดสด Binance TH ({market?.rate ? `${market.rate.toFixed(2)} THB` : '—'}) · บอททุกตัวยิงรายงานเข้า Telegram จริงได้ทันที หรือผูก Token แยกทีละบอทได้
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <CeButton
                  variant="primary"
                  size="sm"
                  loading={loadingAction === 'broadcast-fleet'}
                  onClick={handleBroadcastFleet}
                  icon={<CeIcon name="send" size={14} color="var(--b0)" />}
                >
                  📡 ส่งสถานะบอททั้ง {fleetSummary?.total || 14} ตัวเข้า Telegram (Broadcast)
                </CeButton>
                <CeButton
                  variant="outline"
                  size="sm"
                  onClick={() => setActiveTab('settings')}
                  icon={<CeIcon name="settings" size={14} color="var(--c)" />}
                >
                  ⚙️ ตั้งค่า Token หลัก (Main Bot)
                </CeButton>
              </div>
            </div>

            {/* Fleet KPI Strip */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: '12px',
              }}
            >
              <KpiCard
                label="บอททั้งหมด (Total Bots)"
                value={String(fleetSummary?.total ?? bots.length)}
                unit="BOTS"
                note="CE Empire Full Fleet"
                color="cyan"
                icon={<CeIcon name="bot" size={14} color="#00d4ff" />}
              />
              <KpiCard
                label="กำลังทำงาน (Active)"
                value={String(fleetSummary?.active ?? 0)}
                unit="ONLINE"
                note="พร้อมรับงานและส่งแจ้งเตือน"
                color="green"
                icon={<CeIcon name="settled" size={14} color="#00e676" />}
              />
              <KpiCard
                label="พัก / บำรุงรักษา (Paused)"
                value={String((fleetSummary?.paused ?? 0) + (fleetSummary?.maintenance ?? 0))}
                unit="IDLE"
                note={`Error: ${fleetSummary?.error ?? 0}`}
                color="yellow"
                icon={<CeIcon name="pending" size={14} color="#ffca28" />}
              />
              <KpiCard
                label="เรทตลาดสด (Binance TH)"
                value={market?.rate ? market.rate.toFixed(2) : '—'}
                unit="THB"
                note={
                  market?.bid && market?.ask
                    ? `Bid ${market.bid.toFixed(2)} · Ask ${market.ask.toFixed(2)}`
                    : 'USDTTHB Live Spot'
                }
                color="gold"
                icon={<CeIcon name="rate" size={14} color="#f0b429" />}
              />
              <KpiCard
                label="งานที่ประมวลผลแล้ว (Processed)"
                value={fmtInt(fleetSummary?.totalSuccess ?? 0)}
                unit="JOBS"
                note={`คิวรอ (Queue): ${fleetSummary?.totalQueue ?? 0}`}
                color="cyan"
                icon={<CeIcon name="profit" size={14} color="#00d4ff" />}
              />
            </div>

            {/* Category Filters */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {['ALL', 'Core Ops', 'Monitoring & Reports', 'AI & Visual', 'QA & Security'].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setBotCatFilter(cat)}
                    style={{
                      padding: '6px 13px',
                      borderRadius: '9999px',
                      fontSize: '11px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      border: botCatFilter === cat ? '1px solid var(--cb)' : '1px solid var(--br)',
                      background: botCatFilter === cat ? 'var(--ca)' : 'var(--b2)',
                      color: botCatFilter === cat ? 'var(--c)' : 'var(--t2)',
                    }}
                  >
                    {cat === 'ALL' ? `ทั้งหมด (ALL · ${bots.length})` : cat}
                  </button>
                ))}
              </div>
              <CeButton variant="ghost" size="sm" onClick={fetchBots}>
                🔄 รีเฟรชสถานะบอท (Refresh)
              </CeButton>
            </div>

            {/* Bot Cards Grid */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
                gap: '14px',
              }}
            >
              {bots
                .filter((b) => (botCatFilter === 'ALL' ? true : b.category === botCatFilter))
                .map((bot) => {
                  const statusColor =
                    bot.status === 'active'
                      ? 'var(--s)'
                      : bot.status === 'paused'
                      ? 'var(--w)'
                      : bot.status === 'error'
                      ? 'var(--d)'
                      : 'var(--c)';
                  const statusBg =
                    bot.status === 'active'
                      ? 'var(--sa)'
                      : bot.status === 'paused'
                      ? 'var(--wa)'
                      : bot.status === 'error'
                      ? 'var(--da)'
                      : 'var(--ca)';
                  const isEditing = editingBotSlug === bot.slug;

                  return (
                    <div
                      key={bot.slug}
                      style={{
                        background: 'var(--b2)',
                        border: `1px solid ${bot.slug === 'operator-vault' ? 'var(--cb)' : 'var(--br)'}`,
                        borderRadius: '14px',
                        padding: '16px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '14px', fontWeight: 800, color: 'var(--t1)' }}>{bot.name}</span>
                            <span style={{ fontSize: '10px', color: 'var(--c)', fontFamily: "'Space Mono', monospace" }}>
                              {bot.handle}
                            </span>
                          </div>
                          <div style={{ fontSize: '10px', color: 'var(--t3)', marginTop: '2px' }}>
                            {bot.category} · Owner: {bot.owner}
                          </div>
                        </div>
                        <span
                          style={{
                            padding: '3px 9px',
                            borderRadius: '9999px',
                            fontSize: '9px',
                            fontWeight: 800,
                            letterSpacing: '0.8px',
                            textTransform: 'uppercase',
                            color: statusColor,
                            background: statusBg,
                            border: `1px solid ${statusColor}`,
                          }}
                        >
                          ● {bot.status}
                        </span>
                      </div>

                      <div style={{ fontSize: '12px', color: 'var(--t2)', lineHeight: 1.45 }}>
                        <div>{bot.roleTh}</div>
                        <div style={{ fontSize: '10px', color: 'var(--t3)', marginTop: '2px' }}>({bot.roleEn})</div>
                      </div>

                      {/* Operating Modes */}
                      <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                        {bot.modes.map((m) => (
                          <span
                            key={m}
                            style={{
                              padding: '2px 7px',
                              borderRadius: '6px',
                              background: 'var(--b3)',
                              border: '1px solid var(--br)',
                              fontSize: '9px',
                              fontFamily: "'Space Mono', monospace",
                              color: 'var(--t2)',
                            }}
                          >
                            {m}
                          </span>
                        ))}
                      </div>

                      {/* Telemetry */}
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          background: 'var(--b1)',
                          border: '1px solid var(--br)',
                          borderRadius: '8px',
                          padding: '8px 10px',
                          fontSize: '10px',
                          fontFamily: "'Space Mono', monospace",
                        }}
                      >
                        <span style={{ color: 'var(--t3)' }}>
                          OK: <strong style={{ color: 'var(--s)' }}>{fmtInt(bot.successCount)}</strong>
                        </span>
                        <span style={{ color: 'var(--t3)' }}>
                          QUEUE: <strong style={{ color: 'var(--c)' }}>{bot.queueDepth}</strong>
                        </span>
                        <span style={{ color: 'var(--t3)' }}>
                          TG:{' '}
                          <strong style={{ color: bot.telegramRoute?.ready ? 'var(--s)' : 'var(--w)' }}>
                            {bot.telegramRoute?.usesCustomToken ? 'Dedicated' : bot.telegramRoute?.ready ? 'Linked ✓' : 'Unset'}
                          </strong>
                        </span>
                      </div>

                      {/* Action Buttons */}
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        {bot.status === 'active' ? (
                          <CeButton
                            variant="ghost"
                            size="sm"
                            loading={loadingAction === `bot:${bot.slug}:pause`}
                            onClick={() => handleBotAction(bot.slug, 'pause')}
                          >
                            ⏸ พัก (Pause)
                          </CeButton>
                        ) : (
                          <CeButton
                            variant="success"
                            size="sm"
                            loading={loadingAction === `bot:${bot.slug}:start`}
                            onClick={() => handleBotAction(bot.slug, 'start')}
                          >
                            ▶ เปิด (Start)
                          </CeButton>
                        )}
                        <CeButton
                          variant="outline"
                          size="sm"
                          loading={loadingAction === `bot:${bot.slug}:dispatch`}
                          onClick={() => handleBotAction(bot.slug, 'dispatch')}
                        >
                          📨 ส่ง TG (Test)
                        </CeButton>
                        <CeButton
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            if (isEditing) {
                              setEditingBotSlug(null);
                            } else {
                              setEditingBotSlug(bot.slug);
                              setBotCustomToken('');
                              setBotCustomChatId(bot.telegramRoute?.chatId || '');
                              setBotHandleInput(bot.handle);
                            }
                          }}
                        >
                          ⚙️ {isEditing ? 'ปิด (Close)' : 'ตั้งค่า (Config)'}
                        </CeButton>
                      </div>

                      {/* Per-Bot Optional Dedicated Token & Chat ID Drawer */}
                      {isEditing && (
                        <div
                          style={{
                            marginTop: '4px',
                            padding: '12px',
                            borderRadius: '10px',
                            background: 'var(--b1)',
                            border: '1px solid var(--cb)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '8px',
                          }}
                        >
                          <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--c)' }}>
                            ⚙️ ตั้งค่าเฉพาะบอท (Optional Dedicated Bot Token / Chat ID)
                          </div>
                          <input
                            placeholder="ชื่อ Handle เช่น @my_bot"
                            value={botHandleInput}
                            onChange={(e) => setBotHandleInput(e.target.value)}
                            style={{
                              padding: '7px 10px',
                              borderRadius: '6px',
                              background: 'var(--b2)',
                              border: '1px solid var(--br)',
                              color: 'var(--t1)',
                              fontSize: '11px',
                              fontFamily: "'Space Mono', monospace",
                            }}
                          />
                          <input
                            type="password"
                            placeholder={
                              bot.telegramRoute?.usesCustomToken
                                ? `Token เฉพาะ: ${bot.telegramRoute.maskedToken}`
                                : 'เว้นว่าง = ใช้บอทหลัก @Razen_7xbot อัตโนมัติ'
                            }
                            value={botCustomToken}
                            onChange={(e) => setBotCustomToken(e.target.value)}
                            style={{
                              padding: '7px 10px',
                              borderRadius: '6px',
                              background: 'var(--b2)',
                              border: '1px solid var(--br)',
                              color: 'var(--t1)',
                              fontSize: '11px',
                              fontFamily: "'Space Mono', monospace",
                            }}
                          />
                          <input
                            placeholder="Chat ID เฉพาะบอทนี้ (เว้นว่าง = ใช้กลุ่มหลัก)"
                            value={botCustomChatId}
                            onChange={(e) => setBotCustomChatId(e.target.value)}
                            style={{
                              padding: '7px 10px',
                              borderRadius: '6px',
                              background: 'var(--b2)',
                              border: '1px solid var(--br)',
                              color: 'var(--g)',
                              fontSize: '11px',
                              fontFamily: "'Space Mono', monospace",
                            }}
                          />
                          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                            <CeButton
                              variant="success"
                              size="sm"
                              loading={loadingAction === `bot-cfg:${bot.slug}`}
                              onClick={() => handleSaveBotConfig(bot.slug, false)}
                            >
                              💾 บันทึก (Save)
                            </CeButton>
                            {bot.telegramRoute?.usesCustomToken && (
                              <CeButton
                                variant="danger"
                                size="sm"
                                onClick={() => handleSaveBotConfig(bot.slug, true)}
                              >
                                ใช้บอทหลัก (Reset)
                              </CeButton>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════ */}
        {/* TAB 4: SETTINGS (API & TELEGRAM BOT CONTROL CENTER) */}
        {/* ═══════════════════════════════════════════════════════ */}
        {activeTab === 'settings' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Top Banner */}
            <div
              style={{
                background: 'var(--b2)',
                border: '1px solid var(--cb)',
                borderRadius: '14px',
                padding: '18px 22px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '16px',
                flexWrap: 'wrap',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div
                  style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '12px',
                    background: 'var(--ca)',
                    border: '1px solid var(--cb)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <CeIcon name="bot" size={24} color="var(--c)" />
                </div>
                <div>
                  <div style={{ fontSize: '17px', fontWeight: 800, color: 'var(--t1)' }}>
                    ตั้งค่าระบบเชื่อมต่อ API & บอทแจ้งเตือน (API & Telegram Bot Settings)
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--t2)' }}>
                    เชื่อมต่อ Telegram Bot จริงผ่าน BotFather Token พร้อมระบบค้นหา Chat ID อัตโนมัติและทดสอบยิงข้อความสด (Live Telegram API)
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <CeButton
                  variant="primary"
                  size="sm"
                  onClick={() => handleSendTelegramLive(undefined, 'live-test')}
                  loading={loadingAction === 'tg-send:live-test'}
                  icon={<CeIcon name="send" size={14} color="var(--b0)" />}
                >
                  🚀 ทดสอบส่งเข้า Telegram จริง (Send Live Test)
                </CeButton>
              </div>
            </div>

            {tgStatusBanner && (
              <div
                style={{
                  padding: '12px 16px',
                  borderRadius: '10px',
                  background: tgStatusBanner.ok ? 'var(--sa)' : 'var(--ala)',
                  border: `1px solid ${tgStatusBanner.ok ? 'var(--sb)' : 'var(--alb)'}`,
                  color: tgStatusBanner.ok ? 'var(--s)' : 'var(--al)',
                  fontSize: '12px',
                  fontWeight: 700,
                }}
              >
                {tgStatusBanner.ok ? '✅ ' : '⚠️ '}
                {tgStatusBanner.text}
              </div>
            )}

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
                gap: '20px',
                alignItems: 'start',
              }}
            >
              {/* CARD 1: TELEGRAM BOT CONFIGURATION */}
              <div
                style={{
                  background: 'var(--b2)',
                  border: '1px solid var(--br)',
                  borderRadius: '14px',
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <CeIcon name="bot" size={18} color="var(--c)" />
                    <span style={{ fontSize: '15px', fontWeight: 800, color: 'var(--c)' }}>
                      1 · ตั้งค่าบอทเทเลแกรม (Telegram Bot Setup)
                    </span>
                  </div>
                  <span
                    style={{
                      fontSize: '10px',
                      fontWeight: 700,
                      padding: '3px 10px',
                      borderRadius: '9999px',
                      background: tgConnected ? 'var(--sa)' : 'var(--wa)',
                      border: `1px solid ${tgConnected ? 'var(--sb)' : 'var(--wb)'}`,
                      color: tgConnected ? 'var(--s)' : 'var(--w)',
                    }}
                  >
                    {tgConnected ? '🟢 เชื่อมต่อพร้อมส่ง (ACTIVE)' : '🟡 รอตั้งค่า (UNCONFIGURED)'}
                  </span>
                </div>

                {/* Verified Bot Identity Card */}
                {botInfo && (
                  <div
                    style={{
                      padding: '10px 14px',
                      borderRadius: '10px',
                      background: 'var(--sa)',
                      border: '1px solid var(--sb)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontSize: '12px',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 800, color: 'var(--s)' }}>
                        🤖 {botInfo.firstName} (@{botInfo.username})
                      </div>
                      <div style={{ fontSize: '10px', color: 'var(--t2)', fontFamily: "'Space Mono', monospace" }}>
                        Bot ID: {botInfo.id} · Group Access: {botInfo.canJoinGroups ? 'Enabled' : 'Disabled'}
                      </div>
                      {botInfo.webhookUrl && (
                        <div style={{ fontSize: '10px', color: 'var(--c)', fontFamily: "'Space Mono', monospace", marginTop: '2px' }}>
                          🔗 Active Webhook: {botInfo.webhookUrl} (Pending: {botInfo.pendingUpdates ?? 0})
                        </div>
                      )}
                    </div>
                    <CeIcon name="check" size={18} color="var(--s)" />
                  </div>
                )}

                {/* Bot Token */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
                    <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--t2)' }}>
                      🔑 รหัสโทเคนบอท (Telegram Bot Token · @BotFather)
                    </label>
                    {hasSavedToken && (
                      <span style={{ fontSize: '10px', color: 'var(--s)', fontFamily: "'Space Mono', monospace" }}>
                        บันทึกไว้แล้ว (Saved): {maskedToken}
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      type={showBotToken ? 'text' : 'password'}
                      placeholder={hasSavedToken ? `ใช้ค่าเดิมที่บันทึกไว้ (${maskedToken}) หรือวาง Token ใหม่เพื่อเปลี่ยน` : 'เช่น 1234567890:AAHxyz... (จาก @BotFather)'}
                      value={botTokenInput}
                      onChange={(e) => setBotTokenInput(e.target.value)}
                      style={{
                        flex: 1,
                        padding: '10px 12px',
                        borderRadius: '8px',
                        background: 'var(--b1)',
                        border: '1px solid var(--br)',
                        color: 'var(--t1)',
                        fontFamily: "'Space Mono', monospace",
                        fontSize: '12px',
                      }}
                    />
                    <CeButton variant="ghost" size="sm" onClick={() => setShowBotToken((v) => !v)}>
                      {showBotToken ? 'ซ่อน (Hide)' : 'แสดง (Show)'}
                    </CeButton>
                    <CeButton
                      variant="outline"
                      size="sm"
                      onClick={handleVerifyBot}
                      loading={loadingAction === 'tg-verify'}
                    >
                      🔍 ตรวจบอท (Verify)
                    </CeButton>
                  </div>
                </div>

                {/* Target Chat ID */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
                    <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--t2)' }}>
                      💬 รหัสห้องแชท / กลุ่มเป้าหมาย (Target Chat ID · OPS_CHAT_ID)
                    </label>
                    <button
                      onClick={handleDetectChats}
                      disabled={loadingAction === 'tg-detect'}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--c)',
                        fontSize: '11px',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      {loadingAction === 'tg-detect' ? '⏳ กำลังค้นหา...' : '📡 ดึงแชทอัตโนมัติ (Auto-Detect Chats)'}
                    </button>
                  </div>
                  <input
                    placeholder="เช่น -1001234567890 (กลุ่ม) หรือ 123456789 (แชทส่วนตัว)"
                    value={chatIdInput}
                    onChange={(e) => setChatIdInput(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      background: 'var(--b1)',
                      border: '1px solid var(--br)',
                      color: 'var(--g)',
                      fontFamily: "'Space Mono', monospace",
                      fontSize: '12px',
                      fontWeight: 700,
                    }}
                  />

                  {/* Auto-detected chat pills */}
                  {detectedChats.length > 0 && (
                    <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <span style={{ fontSize: '10px', color: 'var(--t3)' }}>
                        คลิกเลือกห้องแชทที่ตรวจพบจากบอท (Click to Select Detected Chat):
                      </span>
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        {detectedChats.map((c) => (
                          <button
                            key={c.id}
                            onClick={() => setChatIdInput(c.id)}
                            style={{
                              padding: '6px 10px',
                              borderRadius: '8px',
                              fontSize: '11px',
                              cursor: 'pointer',
                              border: chatIdInput === c.id ? '1px solid var(--cb)' : '1px solid var(--br)',
                              background: chatIdInput === c.id ? 'var(--ca)' : 'var(--b3)',
                              color: chatIdInput === c.id ? 'var(--c)' : 'var(--t1)',
                              fontFamily: "'Space Mono', monospace",
                            }}
                          >
                            {c.type === 'private' ? '👤' : '👥'} {c.title} ({c.id})
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Event Notification Toggles */}
                <div
                  style={{
                    background: 'var(--b3)',
                    border: '1px solid var(--br)',
                    borderRadius: '10px',
                    padding: '12px 14px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                  }}
                >
                  <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--t1)' }}>
                    🔔 เลือกเหตุการณ์แจ้งเตือนอัตโนมัติ (Auto-Notification Triggers)
                  </div>
                  {(
                    [
                      { key: 'onScan', label: 'แจ้งเตือนเมื่อสแกนรับสลิปใหม่ (New Slip Intake)' },
                      { key: 'onSettle', label: 'แจ้งเตือนเมื่อโอน USDT / ชดเชยยอดขาด (USDT Settlement & Short Recovery)' },
                      { key: 'onMismatch', label: 'แจ้งเตือนเมื่อสลิปบัญชีไม่ตรง / กด Override (Mismatch & Override Alert)' },
                      { key: 'onNewCycle', label: 'แจ้งเตือนสรุปยอดเมื่อปิด/เปิดรอบใหม่ (Cycle Rollover Summary)' },
                    ] as { key: keyof NotifyEvents; label: string }[]
                  ).map((ev) => (
                    <label
                      key={ev.key}
                      style={{ display: 'flex', alignItems: 'center', gap: '9px', fontSize: '12px', color: 'var(--t2)', cursor: 'pointer' }}
                    >
                      <input
                        type="checkbox"
                        checked={notifyEvents[ev.key]}
                        onChange={(e) => setNotifyEvents((prev) => ({ ...prev, [ev.key]: e.target.checked }))}
                        style={{ accentColor: '#3fe0ff', width: '15px', height: '15px' }}
                      />
                      <span>{ev.label}</span>
                    </label>
                  ))}
                </div>

                {/* Custom Live Test Message */}
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--t2)', display: 'block', marginBottom: '5px' }}>
                    ✉️ ข้อความทดสอบกำหนดเอง (Optional Custom Test Message):
                  </label>
                  <textarea
                    rows={3}
                    placeholder="เว้นว่างไว้เพื่อส่งการ์ดสรุปสถานะโต๊ะอัตโนมัติ (Leave blank to send standard CE Vault Live Test Card)"
                    value={customTestMsg}
                    onChange={(e) => setCustomTestMsg(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px',
                      borderRadius: '8px',
                      background: 'var(--b1)',
                      border: '1px solid var(--br)',
                      color: 'var(--t1)',
                      fontSize: '12px',
                      resize: 'vertical',
                    }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <CeButton
                    variant="success"
                    onClick={() => handleSaveSettings(false)}
                    loading={loadingAction === 'save-settings'}
                    icon={<CeIcon name="check" size={14} color="var(--b0)" />}
                  >
                    💾 บันทึกการตั้งค่าบอท (Save Bot Settings)
                  </CeButton>
                  <CeButton
                    variant="primary"
                    onClick={() => handleSendTelegramLive(undefined, 'live-test')}
                    loading={loadingAction === 'tg-send:live-test'}
                    icon={<CeIcon name="send" size={14} color="var(--b0)" />}
                  >
                    🚀 ยิงข้อความทดสอบจริง (Send Test Now)
                  </CeButton>
                  {hasSavedToken && (
                    <CeButton
                      variant="danger"
                      size="sm"
                      onClick={() => handleSaveSettings(true)}
                      icon={<CeIcon name="trash" size={13} color="#fff" />}
                    >
                      ล้าง Token (Clear)
                    </CeButton>
                  )}
                </div>
              </div>

              {/* CARD 2: API ENDPOINT & MARKET FEED SETTINGS */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div
                  style={{
                    background: 'var(--b2)',
                    border: '1px solid var(--br)',
                    borderRadius: '14px',
                    padding: '20px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '16px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <CeIcon name="link" size={18} color="var(--g)" />
                      <span style={{ fontSize: '15px', fontWeight: 800, color: 'var(--g)' }}>
                        2 · ตั้งค่า API และเรทตลาด (API & Market Feed)
                      </span>
                    </div>
                    <span
                      style={{
                        fontSize: '10px',
                        fontWeight: 700,
                        padding: '3px 10px',
                        borderRadius: '9999px',
                        background: 'var(--ca)',
                        border: '1px solid var(--cb)',
                        color: 'var(--c)',
                        fontFamily: "'Space Mono', monospace",
                      }}
                    >
                      {engineMode === 'browser-standalone' ? '🌐 Browser Engine' : '🖥️ Node API Server'}
                    </span>
                  </div>

                  {/* API Health Summary Box */}
                  <div
                    style={{
                      background: 'var(--b3)',
                      border: '1px solid var(--br)',
                      borderRadius: '10px',
                      padding: '12px 14px',
                      fontSize: '12px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--t3)' }}>สถานะเซิร์ฟเวอร์ (API Health):</span>
                      <strong style={{ color: apiHealthy ? 'var(--s)' : 'var(--d)', fontFamily: "'Space Mono', monospace" }}>
                        {apiHealthy ? `200 OK (${apiLatencyMs ?? '—'} ms)` : 'OFFLINE'}
                      </strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--t3)' }}>แหล่งเรทตลาดสด (Live Market Feed):</span>
                      <strong style={{ color: 'var(--c)', fontFamily: "'Space Mono', monospace" }}>
                        {market?.rate ? `${market.rate.toFixed(2)} THB (${market.source})` : 'กำลังโหลด...'}
                      </strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--t3)' }}>ที่เก็บข้อมูล (State Storage):</span>
                      <strong style={{ fontFamily: "'Space Mono', monospace" }}>
                        {autoCfg?.integrations?.storage?.mode || (engineMode === 'browser-standalone' ? 'browser-localStorage' : 'local-json')}
                      </strong>
                    </div>
                  </div>

                  {/* Custom Backend URL */}
                  <div>
                    <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--t2)', display: 'block', marginBottom: '5px' }}>
                      🌐 เซิร์ฟเวอร์ API ภายนอก (Custom Backend API URL · Optional):
                    </label>
                    <input
                      placeholder="เว้นว่างเพื่อใช้เซิร์ฟเวอร์ในตัว หรือใส่ https://your-api.example.com"
                      value={customApiUrlInput}
                      onChange={(e) => setCustomApiUrlInput(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: '8px',
                        background: 'var(--b1)',
                        border: '1px solid var(--br)',
                        color: 'var(--t1)',
                        fontFamily: "'Space Mono', monospace",
                        fontSize: '12px',
                      }}
                    />
                  </div>

                  {/* Auto Rate Spread */}
                  <div>
                    <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--t2)', display: 'block', marginBottom: '5px' }}>
                      💱 ส่วนต่างบวกเพิ่มอัตโนมัติจากราคาตลาด (Auto Rate Spread · THB):
                    </label>
                    <input
                      type="number"
                      step="0.05"
                      value={spreadInput}
                      onChange={(e) => setSpreadInput(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: '8px',
                        background: 'var(--b1)',
                        border: '1px solid var(--br)',
                        color: 'var(--g)',
                        fontFamily: "'Space Mono', monospace",
                        fontSize: '13px',
                        fontWeight: 700,
                      }}
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <CeButton
                      variant="gold"
                      size="sm"
                      onClick={() => handleSaveSettings(false)}
                      loading={loadingAction === 'save-settings'}
                    >
                      💾 บันทึกค่า API & Spread (Save API Config)
                    </CeButton>
                    <CeButton
                      variant="outline"
                      size="sm"
                      onClick={handlePingApi}
                      loading={loadingAction === 'ping-api'}
                    >
                      🩺 ทดสอบ API (/api/healthz)
                    </CeButton>
                    <CeButton
                      variant="ghost"
                      size="sm"
                      onClick={handleRefreshMarketNow}
                      loading={loadingAction === 'refresh-mkt'}
                    >
                      🔄 ดึงเรทตลาดสด (Refresh Rate)
                    </CeButton>
                  </div>
                </div>

                {/* CARD 3: TELEGRAM DELIVERY AUDIT LOG */}
                <div
                  style={{
                    background: 'var(--b2)',
                    border: '1px solid var(--br)',
                    borderRadius: '14px',
                    padding: '20px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '14px', fontWeight: 800, color: 'var(--c)' }}>
                      3 · ประวัติการยิงแจ้งเตือน Telegram ล่าสุด (Live Delivery Log)
                    </span>
                    <CeButton variant="ghost" size="sm" onClick={fetchSettings}>
                      🔄 รีเฟรช (Refresh)
                    </CeButton>
                  </div>

                  {deliveryLog.length === 0 ? (
                    <div
                      style={{
                        padding: '24px',
                        borderRadius: '10px',
                        background: 'var(--b1)',
                        border: '1px dashed var(--br)',
                        textAlign: 'center',
                        fontSize: '12px',
                        color: 'var(--t3)',
                      }}
                    >
                      ยังไม่มีประวัติการส่งข้อความ — ใส่ Bot Token + Chat ID แล้วกดปุ่ม "🚀 ยิงข้อความทดสอบจริง (Send Test Now)" เพื่อทดสอบได้ทันที
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '280px', overflowY: 'auto' }}>
                      {deliveryLog.map((item) => (
                        <div
                          key={item.id}
                          style={{
                            padding: '10px 12px',
                            borderRadius: '8px',
                            background: 'var(--b1)',
                            border: `1px solid ${item.ok ? 'var(--sb)' : 'var(--alb)'}`,
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            gap: '10px',
                            fontSize: '11px',
                          }}
                        >
                          <div>
                            <div style={{ fontWeight: 700, color: item.ok ? 'var(--s)' : 'var(--al)' }}>
                              {item.ok ? '✅ ส่งสำเร็จ (Delivered)' : '❌ ส่งไม่สำเร็จ (Failed)'} · {item.event}
                            </div>
                            <div style={{ color: 'var(--t3)', fontFamily: "'Space Mono', monospace", fontSize: '10px' }}>
                              Chat: {item.chatId} · {item.detail}
                            </div>
                          </div>
                          <div style={{ textAlign: 'right', fontFamily: "'Space Mono', monospace", fontSize: '10px', color: 'var(--t2)' }}>
                            <div>{new Date(item.timestamp).toLocaleTimeString('th-TH')}</div>
                            <div>{item.latencyMs} ms</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════ */}
        {/* TAB 5: DESIGN SYSTEM v1.0 */}
        {/* ═══════════════════════════════════════════════════════ */}
        {activeTab === 'design' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Status Badges */}
            <div
              style={{
                background: 'var(--b2)',
                border: '1px solid var(--br)',
                borderRadius: '14px',
                padding: '20px',
              }}
            >
              <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--c)', marginBottom: '14px', letterSpacing: '0.6px' }}>
                ป้ายสถานะธุรกรรม 10 สถานะ (10 Transaction Status Badges)
              </div>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                {ALL_STATUSES.map((st) => (
                  <StatusBadge key={st} status={st} />
                ))}
              </div>
            </div>

            {/* SVG Icons */}
            <div
              style={{
                background: 'var(--b2)',
                border: '1px solid var(--br)',
                borderRadius: '14px',
                padding: '20px',
              }}
            >
              <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--c)', marginBottom: '14px', letterSpacing: '0.6px' }}>
                ชุดไอคอนมาตรฐาน ({ALL_ICONS.length} Vector Icons · CeIcon)
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))',
                  gap: '10px',
                }}
              >
                {ALL_ICONS.map((name) => (
                  <div
                    key={name}
                    onClick={() => copyText(`<CeIcon name="${name}" size={20} />`, `คัดลอกไอคอน (Copied Icon): ${name}`)}
                    style={{
                      cursor: 'pointer',
                      background: 'var(--b3)',
                      border: '1px solid var(--br)',
                      borderRadius: '10px',
                      padding: '12px 8px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    <CeIcon name={name} size={22} color="var(--c)" />
                    <span style={{ fontSize: '10px', color: 'var(--t2)', fontFamily: "'Space Mono', monospace" }}>
                      {name}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
