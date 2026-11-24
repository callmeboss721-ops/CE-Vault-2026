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

type MainTab = 'desk' | 'scan' | 'messages' | 'design';
type PanelMode = 'tx' | 'summary' | 'pin' | 'rate' | 'cycle';

const ALL_ICONS: IconName[] = [
  'receive', 'send', 'rate', 'limit', 'profit', 'cycle', 'bank', 'pin', 'scan', 'user', 'amount', 'usdt',
  'ready', 'pending', 'settled', 'short', 'mismatch', 'duplicate', 'review', 'rejected', 'reversed', 'ocr',
  'check', 'edit', 'trash', 'recheck', 'override', 'alert', 'search', 'copy', 'close', 'back', 'arrow-up', 'arrow-down', 'refresh', 'gem',
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
  const [selectedTxId, setSelectedTxId] = useState<string | null>(null);
  const [panelMode, setPanelMode] = useState<PanelMode>('tx');
  const [statusFilter, setStatusFilter] = useState<TxStatus | 'ALL'>('ALL');
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [apiHealthy, setApiHealthy] = useState<boolean>(true);
  const [market, setMarket] = useState<{ rate?: number; source?: string; rateMode?: string; updatedAt?: string } | null>(null);
  const [autoCfg, setAutoCfg] = useState<{
    rateSpread?: number;
    autoSecrets?: Record<string, string>;
    integrations?: {
      storage?: { enabled: boolean; mode: string };
      marketRate?: { enabled: boolean; source: string };
      telegram?: { enabled: boolean };
      supabase?: { enabled: boolean };
    };
  } | null>(null);

  // Action form states
  const [settleAmount, setSettleAmount] = useState<string>('');
  const [overrideReason, setOverrideReason] = useState<string>('ลูกค้าโอนเข้าบัญชีสำรอง ยืนยันสลิปถูกต้อง');
  const [rateInput, setRateInput] = useState<string>('43.00');
  const [pinCodeInput, setPinCodeInput] = useState<string>('BBL');
  const [limitInput, setLimitInput] = useState<string>('500000');

  // Scan form states
  const [scanThb, setScanThb] = useState<string>('10000');
  const [scanBank, setScanBank] = useState<string>('BBL');
  const [scanAccount, setScanAccount] = useState<string>('097-0-28xxx-x');
  const [scanSender, setScanSender] = useState<string>('นาย สมชาย ใจดี');
  const [scanConfidence, setScanConfidence] = useState<string>('98.7');
  const [scanResultMsg, setScanResultMsg] = useState<string>('');

  // Messages tab filter
  const [msgGroup, setMsgGroup] = useState<string>('ALL');

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3200);
  }, []);

  const fetchVault = useCallback(async () => {
    try {
      const [vaultRes, healthRes] = await Promise.all([
        fetch('/api/dashboard/vault'),
        fetch('/api/healthz'),
      ]);
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

  useEffect(() => {
    fetchVault();
  }, [fetchVault]);

  const fetchMarket = useCallback(async () => {
    try {
      const [mRes, cRes] = await Promise.all([fetch('/api/market'), fetch('/api/config')]);
      if (mRes.ok) setMarket(await mRes.json());
      if (cRes.ok) setAutoCfg(await cRes.json());
    } catch {
      /* offline: keep last known values */
    }
  }, []);

  useEffect(() => {
    fetchMarket();
    const id = setInterval(() => {
      fetchMarket();
      fetchVault();
    }, 60000);
    return () => clearInterval(id);
  }, [fetchMarket, fetchVault]);

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
          forceDuplicate,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setScanResultMsg(MSG.OCR_FAIL());
        showToast(`❌ ${data.message || 'OCR ล้มเหลว'}`);
        return;
      }
      setSummary(data.summary);
      setTransactions(data.transactions);

      if (data.duplicate && data.originalTx) {
        const dupMsg = MSG.DUPLICATE({
          id: data.originalTx.id,
          thb: fmtThb(data.originalTx.thb),
          usdt: fmtUsdt(data.originalTx.usdtExpected),
          time: data.originalTx.time,
        });
        setScanResultMsg(dupMsg);
        showToast(`⚠️ พบสลิปซ้ำในระบบ (${data.originalTx.id})`);
        return;
      }

      const tx: Transaction = data.tx;
      setSelectedTxId(tx.id);
      setPanelMode('tx');

      if (tx.status === 'MISMATCH') {
        setScanResultMsg(
          MSG.BANK_MISMATCH({
            bank: tx.bank,
            account: tx.account,
          }).replace('[PIN_BANK]', data.summary.pinnedBank.code).replace('[PIN_ACCOUNT]', data.summary.pinnedBank.account)
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
          })
        );
      }

      showToast(`✅ สร้างรายการ ${tx.id} (${tx.status})`);
    } catch (e) {
      showToast(`❌ Scan ล้มเหลว: ${String(e)}`);
    } finally {
      setLoadingAction(null);
    }
  }

  async function handleUpdatePin() {
    setLoadingAction('pin');
    try {
      const res = await fetch('/api/dashboard/pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: pinCodeInput, limitThb: Number(limitInput) }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setSummary(data.summary);
        showToast(`📌 ปักหมุดบัญชี ${data.pinnedBank.code} · ${data.pinnedBank.account} สำเร็จ`);
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
        showToast(`💱 อัปเดตเรทโต๊ะเป็น ${data.rate.toFixed(2)} THB/USDT`);
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
        showToast(`🤖 เรทโต๊ะ AUTO ตามตลาด: ${data.rate.toFixed(2)} THB/USDT`);
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
        showToast(`🔄 ปิดรอบ ${data.oldCycle} → เปิดรอบใหม่ ${data.newCycle} สำเร็จ`);
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
        showToast('🔄 รีเซ็ตข้อมูลตัวอย่าง CE44 เรียบร้อย');
      }
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
    if (tx.status === 'READY') {
      return MSG.OCR_READY({
        thb: fmtThb(tx.thb),
        usdt: fmtUsdt(tx.usdtExpected),
        bank: tx.bank,
        account: tx.account,
        name: tx.sender,
        rate: tx.rate.toFixed(2),
        confidence: tx.confidence,
      });
    }
    if (tx.status === 'PENDING') {
      return MSG.TX_QUEUED({
        id: tx.id,
        thb: fmtThb(tx.thb),
        usdt: fmtUsdt(tx.usdtExpected),
        rate: tx.rate.toFixed(2),
      });
    }
    if (tx.status === 'SETTLED') {
      return MSG.TX_SETTLED({
        id: tx.id,
        thb: fmtThb(tx.thb),
        usdt: fmtUsdt(tx.usdtSent),
        rate: tx.rate.toFixed(2),
        time: `${tx.time} น.`,
      });
    }
    if (tx.status === 'SHORT') {
      const shortAmt = Math.max(0, tx.usdtExpected - tx.usdtSent);
      return MSG.TX_SHORT({
        id: tx.id,
        usdt_expected: fmtUsdt(tx.usdtExpected),
        usdt_sent: fmtUsdt(tx.usdtSent),
        usdt_short: fmtUsdt(shortAmt),
      });
    }
    if (tx.status === 'MISMATCH') {
      return MSG.BANK_MISMATCH({
        bank: tx.bank,
        account: tx.account,
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
      });
    }
    if (tx.status === 'REJECTED') {
      return MSG.TX_REJECTED({
        id: tx.id,
        thb: fmtThb(tx.thb),
        reason: tx.notes || 'ปฏิเสธรายการโดย Operator',
      });
    }
    if (tx.status === 'REVERSED') {
      return MSG.TX_REVERSED({
        id: tx.id,
        thb: fmtThb(tx.thb),
        usdt: fmtUsdt(tx.usdtSent),
        operator: 'ADMIN',
        reason: tx.notes || 'ยกเลิกรายการ',
      });
    }
    return MSG.OCR_LOADING();
  }

  const filteredTransactions = transactions.filter((t) =>
    statusFilter === 'ALL' ? true : t.status === statusFilter
  );

  const messageTemplatesList = [
    { key: 'MSG-01', group: 'Intake · OCR', title: 'กำลัง OCR', text: MSG.OCR_LOADING() },
    {
      key: 'MSG-02',
      group: 'Intake · OCR',
      title: 'OCR สำเร็จ — พร้อม Confirm',
      text: MSG.OCR_READY({ thb: '10,000.00', usdt: '232.56', bank: 'BBL', account: '097-0-28xxx-x', name: 'นาย สมชาย ใจดี', rate: '43.00', confidence: 98.7 }),
    },
    { key: 'MSG-03', group: 'Intake · OCR', title: 'OCR ล้มเหลว', text: MSG.OCR_FAIL() },
    {
      key: 'MSG-04',
      group: 'Intake · OCR',
      title: 'OCR ความแม่นยำต่ำ — REVIEW',
      text: MSG.OCR_LOW_CONFIDENCE({ thb: '10,000.00', bank: 'BBL', account: '097-0-28xxx-x', name: 'นาย สม...ย ใจดี', rate: '43.00', confidence: 72 }),
    },
    {
      key: 'MSG-05',
      group: 'Verify · Checks',
      title: 'Bank Mismatch',
      text: MSG.BANK_MISMATCH({ bank: 'KTB', account: 'xxx-x-x7413-x' }).replace('[PIN_BANK]', summary?.pinnedBank.code || 'BBL').replace('[PIN_ACCOUNT]', summary?.pinnedBank.account || '097-0-28xxx-x'),
    },
    {
      key: 'MSG-06',
      group: 'Verify · Checks',
      title: 'Duplicate — สลิปซ้ำ',
      text: MSG.DUPLICATE({ id: '#CE-2026-A041', thb: '10,000.00', usdt: '232.56', time: '14:35 น.' }),
    },
    {
      key: 'MSG-07',
      group: 'Verify · Checks',
      title: 'Limit เกินวงเงิน',
      text: MSG.LIMIT_EXCEEDED({ thb: '10,000', used: '495,000', limit: '500,000', remaining: '5,000' }),
    },
    {
      key: 'MSG-08',
      group: 'Verify · Checks',
      title: 'Rate เปลี่ยนระหว่าง OCR',
      text: MSG.RATE_CHANGED({ rate: '43.25', thb: '10,000.00', usdt: '231.21' }),
    },
    {
      key: 'MSG-09',
      group: 'Transaction',
      title: 'เข้าคิว PENDING',
      text: MSG.TX_QUEUED({ id: '#CE-2026-A044', thb: '10,000.00', usdt: '232.56', rate: '43.00' }),
    },
    {
      key: 'MSG-10',
      group: 'Transaction',
      title: 'Settlement สำเร็จ (SETTLED)',
      text: MSG.TX_SETTLED({ id: '#CE-2026-A041', thb: '10,000.00', usdt: '232.56', rate: '43.00', time: '14:35 น.' }),
    },
    {
      key: 'MSG-11',
      group: 'Transaction',
      title: 'ส่งขาด (SHORT)',
      text: MSG.TX_SHORT({ id: '#CE-2026-A043', usdt_expected: '232.56', usdt_sent: '230.00', usdt_short: '2.56' }),
    },
    {
      key: 'MSG-12',
      group: 'Transaction',
      title: 'ส่งเพิ่มสำเร็จ (SHORT → SETTLED)',
      text: MSG.TX_SHORT_RESOLVED({ id: '#CE-2026-A043', usdt_expected: '232.56', usdt_sent: '232.56' }),
    },
    {
      key: 'MSG-13',
      group: 'Transaction',
      title: 'ส่งเกิน (OVERRUN)',
      text: MSG.TX_OVERRUN({ id: '#CE-2026-A044', usdt_expected: '232.56', usdt_sent: '240.00' }),
    },
    {
      key: 'MSG-14',
      group: 'Transaction',
      title: 'ปฏิเสธรายการ (REJECTED)',
      text: MSG.TX_REJECTED({ id: '#CE-2026-A042', thb: '15,000.00', reason: 'บัญชีไม่ตรงและไม่มีการแจ้งล่วงหน้า' }),
    },
    {
      key: 'MSG-15',
      group: 'Transaction',
      title: 'ยกเลิกย้อนกลับ (REVERSED)',
      text: MSG.TX_REVERSED({ id: '#CE-2026-A041', thb: '10,000.00', usdt: '232.56', operator: 'ADMIN', reason: 'ลูกค้าขอยกเลิกรายการ' }),
    },
    {
      key: 'MSG-16',
      group: 'Mismatch',
      title: 'Override บัญชีไม่ตรงสำเร็จ',
      text: MSG.MISMATCH_OVERRIDDEN({ id: '#CE-2026-A042', operator: 'OP-01', reason: 'ลูกค้าโอนเข้าบัญชี KTB สำรอง ยืนยันทางโทรศัพท์แล้ว' }),
    },
    {
      key: 'MSG-17',
      group: 'Cycle',
      title: 'สรุปรอบปัจจุบัน (Cycle Summary)',
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
      } as never),
    },
    {
      key: 'MSG-18',
      group: 'Cycle',
      title: 'เปิดรอบใหม่ (New Cycle)',
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
      title: 'แจ้งเตือนวงเงินใกล้เต็ม 80%',
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
      title: 'แจ้งเตือนรายการ PENDING ค้างนาน',
      text: MSG.ALERT_PENDING_STALE({
        id: '#CE-2026-A044',
        thb: '10,000.00',
        usdt: '118.56',
        minutes: 15,
      }),
    },
  ];

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
            <div style={{ fontSize: '10px', color: 'var(--t3)', letterSpacing: '1px', textTransform: 'uppercase' }}>
              Operator Command Desk · Design System v1.0
            </div>
          </div>
        </div>

        {/* Center Live Status Pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <div
            onClick={() => {
              setActiveTab('desk');
              setPanelMode('pin');
            }}
            style={{
              cursor: 'pointer',
              padding: '6px 12px',
              borderRadius: '8px',
              background: 'var(--b2)',
              border: '1px solid var(--br)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '11px',
            }}
          >
            <CeIcon name="pin" size={14} color="var(--s)" />
            <span style={{ color: 'var(--t3)' }}>PIN:</span>
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
              padding: '6px 12px',
              borderRadius: '8px',
              background: 'var(--b2)',
              border: '1px solid var(--br)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '11px',
            }}
          >
            <CeIcon name="rate" size={14} color="var(--g)" />
            <span style={{ color: 'var(--t3)' }}>RATE:</span>
            <strong style={{ color: 'var(--g)', fontFamily: "'Space Mono', monospace" }}>
              {summary ? summary.rate.toFixed(2) : '43.00'} THB
            </strong>
          </div>

          <div
            style={{
              padding: '6px 12px',
              borderRadius: '8px',
              background: 'var(--b2)',
              border: '1px solid var(--br)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '11px',
            }}
            title={market?.source ? `แหล่งข้อมูล: ${market.source}` : 'กำลังโหลดเรทตลาด'}
          >
            <CeIcon name="usdt" size={14} color="var(--c)" />
            <span style={{ color: 'var(--t3)' }}>MKT:</span>
            <strong style={{ color: 'var(--c)', fontFamily: "'Space Mono', monospace" }}>
              {market?.rate ? market.rate.toFixed(2) : '—'}
            </strong>
            <span style={{ color: 'var(--t3)', fontSize: '9px' }}>{market?.rateMode === 'auto' ? 'AUTO' : 'MANUAL'}</span>
          </div>

          <div
            style={{
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
            {apiHealthy ? 'API /healthz 200' : 'API OFFLINE'}
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {(
            [
              { id: 'desk', label: '🖥️ Operator Desk' },
              { id: 'scan', label: '📷 Scan Slip (OCR)' },
              { id: 'messages', label: '💬 30 Bot Messages' },
              { id: 'design', label: '🎨 Design System v1.0' },
            ] as { id: MainTab; label: string }[]
          ).map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              style={{
                padding: '8px 14px',
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
                label="RECEIVED · ยอดรับวันนี้"
                value={fmtInt(summary?.receivedThb || 0)}
                unit="THB"
                note={`วงเงิน ${fmtInt(summary?.limitThb || 500000)} THB (${summary?.usedPercent || 0}%)`}
                color="green"
                progress={summary?.usedPercent || 0}
                icon={<CeIcon name="receive" size={14} color="#00e676" />}
              />
              <KpiCard
                label="REMAINING · วงเงินคงเหลือ"
                value={fmtInt(summary?.remainingThb || 0)}
                unit="THB"
                note={`PIN: ${summary?.pinnedBank.code || 'BBL'} · ${summary?.pinnedBank.account || ''}`}
                color="cyan"
                progress={100 - (summary?.usedPercent || 0)}
                icon={<CeIcon name="limit" size={14} color="#00d4ff" />}
              />
              <KpiCard
                label="SENT · โอน USDT แล้ว"
                value={fmtUsdt(summary?.sentUsdt || 0)}
                unit="USDT"
                note={`Settled ${summary?.counts?.SETTLED || 0} รายการ`}
                color="cyan"
                icon={<CeIcon name="send" size={14} color="#00d4ff" />}
              />
              <KpiCard
                label="PENDING · รอโอน USDT"
                value={fmtUsdt(summary?.pendingUsdt || 0)}
                unit="USDT"
                note={`Ready ${summary?.counts?.READY || 0} · Pending ${summary?.counts?.PENDING || 0}`}
                color="yellow"
                icon={<CeIcon name="pending" size={14} color="#ffca28" />}
              />
              <KpiCard
                label="SHORT · ยอดส่งขาด"
                value={fmtUsdt(summary?.negativeUsdt || 0)}
                unit="USDT"
                note={`ต้องส่งเพิ่ม ${summary?.counts?.SHORT || 0} รายการ`}
                color="red"
                icon={<CeIcon name="short" size={14} color="#ff5252" />}
              />
              <KpiCard
                label="PROFIT · กำไรรอบนี้"
                value={fmtThb(summary?.profitThb || 0)}
                unit="THB"
                note={`Desk Rate ${summary?.rate.toFixed(2) || '43.00'} (MKT ${summary?.marketRate.toFixed(2) || '42.65'})`}
                color="gold"
                icon={<CeIcon name="profit" size={14} color="#f0b429" />}
              />
            </div>

            {/* QUICK OPERATOR BAR (6 Core Actions from Design System Screen 01) */}
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
                  02 · Scan Slip (รับสลิปใหม่)
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
                  Pending ({summary?.counts?.PENDING || 0})
                </CeButton>
                <CeButton
                  variant="outline"
                  size="sm"
                  onClick={() => setPanelMode('summary')}
                  icon={<CeIcon name="profit" size={14} color="var(--c)" />}
                >
                  06 · Summary ({summary?.cycle || 'CE44'})
                </CeButton>
                <CeButton
                  variant="ghost"
                  size="sm"
                  onClick={() => setPanelMode('pin')}
                  icon={<CeIcon name="bank" size={14} color="var(--g)" />}
                >
                  📌 Bank PIN ({summary?.pinnedBank.code || 'BBL'})
                </CeButton>
                <CeButton
                  variant="ghost"
                  size="sm"
                  onClick={() => setPanelMode('rate')}
                  icon={<CeIcon name="rate" size={14} color="var(--g)" />}
                >
                  💱 Rate ({summary?.rate.toFixed(2) || '43.00'})
                </CeButton>
                <CeButton
                  variant="gold"
                  size="sm"
                  onClick={() => setPanelMode('cycle')}
                  icon={<CeIcon name="cycle" size={14} color="var(--b0)" />}
                >
                  🔄 New Cycle
                </CeButton>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CeButton
                  variant="ghost"
                  size="sm"
                  onClick={handleResetDemo}
                  loading={loadingAction === 'reset'}
                  icon={<CeIcon name="refresh" size={13} color="var(--t2)" />}
                >
                  Reset Demo Data
                </CeButton>
              </div>
            </div>

            {/* TWO-COLUMN WORKSPACE: TRANSACTION QUEUE (LEFT) + INTERACTIVE OPERATOR SCREEN (RIGHT) */}
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
                  <div style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--c)' }}>
                    Transaction Queue ({filteredTransactions.length})
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
                        {st}
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
                      ไม่มีรายการในสถานะ {statusFilter}
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
                {/* MODE 1: TRANSACTION INSPECTOR & ACTION WORKFLOW (Screens 02, 03, 04, 05, 07) */}
                {panelMode === 'tx' && selectedTx && (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div>
                        <div style={{ fontSize: '10px', color: 'var(--t3)', fontFamily: "'Space Mono', monospace" }}>
                          {selectedTx.id} · {selectedTx.time} น.
                        </div>
                        <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--t1)', marginTop: '2px' }}>
                          {selectedTx.status === 'MISMATCH' && '03 · Bank Account Mismatch'}
                          {selectedTx.status === 'SHORT' && '05 · Short Recovery'}
                          {(selectedTx.status === 'READY' || selectedTx.status === 'PENDING') && '04 · USDT Settlement'}
                          {selectedTx.status === 'SETTLED' && '07 · Settlement Done ✓'}
                          {(selectedTx.status === 'REVIEW' || selectedTx.status === 'OCR') && '02 · OCR Review & Verify'}
                          {(selectedTx.status === 'REJECTED' || selectedTx.status === 'REVERSED' || selectedTx.status === 'DUPLICATE') &&
                            `Transaction · ${selectedTx.status}`}
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
                        <span style={{ color: 'var(--t3)' }}>📥 ยอดรับโอน (THB)</span>
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
                        <span style={{ color: 'var(--t3)' }}>📤 โอนแล้ว (Sent Total)</span>
                        <strong style={{ color: 'var(--t1)', fontFamily: "'Space Mono', monospace" }}>
                          {fmtUsdt(selectedTx.usdtSent)} USDT
                        </strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--t3)' }}>🏦 บัญชีในสลิป</span>
                        <strong
                          style={{
                            color: selectedTx.bank === summary?.pinnedBank.code ? 'var(--s)' : 'var(--al)',
                            fontFamily: "'Space Mono', monospace",
                          }}
                        >
                          {selectedTx.bank} · {selectedTx.account}
                        </strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--t3)' }}>👤 ผู้โอน / ลูกค้า</span>
                        <span>{selectedTx.sender}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--t3)' }}>🔎 OCR Confidence</span>
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
                            <div style={{ fontSize: '9px', color: 'var(--t3)', textTransform: 'uppercase' }}>Slip Account</div>
                            <strong style={{ color: 'var(--al)' }}>
                              {selectedTx.bank} · {selectedTx.account}
                            </strong>
                          </div>
                          <span style={{ fontSize: '16px', color: 'var(--al)', fontWeight: 800 }}>≠</span>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '9px', color: 'var(--t3)', textTransform: 'uppercase' }}>Today PIN</div>
                            <strong style={{ color: 'var(--s)' }}>
                              {summary?.pinnedBank.code} · {summary?.pinnedBank.account}
                            </strong>
                          </div>
                        </div>

                        <div>
                          <label style={{ fontSize: '10px', color: 'var(--t3)', display: 'block', marginBottom: '4px' }}>
                            เหตุผล Override (บันทึกใน Audit Log):
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
                            🔁 RECHECK
                          </CeButton>
                          <CeButton
                            variant="warning"
                            size="sm"
                            onClick={() => handleTxAction(selectedTx.id, 'override', { reason: overrideReason })}
                            loading={loadingAction === `${selectedTx.id}:override`}
                            icon={<CeIcon name="override" size={14} color="var(--b0)" />}
                          >
                            ⚡ OVERRIDE → READY
                          </CeButton>
                          <CeButton
                            variant="danger"
                            size="sm"
                            onClick={() => handleTxAction(selectedTx.id, 'reject', { reason: 'Bank Mismatch' })}
                            loading={loadingAction === `${selectedTx.id}:reject`}
                          >
                            ❌ REJECT
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
                          ✓ ยืนยันข้อมูลถูกต้อง (CONFIRM → READY)
                        </CeButton>
                        <CeButton
                          variant="danger"
                          size="sm"
                          fullWidth
                          onClick={() => handleTxAction(selectedTx.id, 'reject', { reason: 'OCR ไม่ผ่านการตรวจสอบ' })}
                          loading={loadingAction === `${selectedTx.id}:reject`}
                        >
                          ❌ ปฏิเสธรายการ (REJECT)
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
                              ? `▼ ยอดส่งขาด: ${fmtUsdt(selectedTx.usdtExpected - selectedTx.usdtSent)} USDT`
                              : `📤 บันทึกส่ง USDT (คงเหลือ ${fmtUsdt(selectedTx.usdtExpected - selectedTx.usdtSent)} USDT)`}
                          </span>
                          <span style={{ fontSize: '11px', fontFamily: "'Space Mono', monospace", color: 'var(--t2)' }}>
                            {Math.min(100, Number(((selectedTx.usdtSent / selectedTx.usdtExpected) * 100).toFixed(1)))}%
                          </span>
                        </div>

                        {/* Progress bar */}
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
                              ⏳ เข้าคิว PENDING
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
                            {selectedTx.status === 'SHORT' ? '📤 ส่งเพิ่ม (Recover Short)' : '✓ Submit Settlement'}
                          </CeButton>
                          {selectedTx.status !== 'SHORT' && (
                            <CeButton
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                setSettleAmount(
                                  String(Number(Math.max(1, (selectedTx.usdtExpected - selectedTx.usdtSent) - 2.56).toFixed(2)))
                                )
                              }
                            >
                              จำลองส่งขาด (-2.56)
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
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <CeIcon name="settled" size={22} color="var(--s)" />
                          <div>
                            <div style={{ fontSize: '12px', fontWeight: 800, color: 'var(--s)' }}>
                              SETTLEMENT DONE ✓
                            </div>
                            <div style={{ fontSize: '11px', color: 'var(--t2)' }}>
                              โอนครบ {fmtUsdt(selectedTx.usdtSent)} USDT เรียบร้อยแล้ว
                            </div>
                          </div>
                        </div>
                        <CeButton
                          variant="ghost"
                          size="sm"
                          onClick={() => handleTxAction(selectedTx.id, 'reverse', { reason: 'Admin Reverse' })}
                          loading={loadingAction === `${selectedTx.id}:reverse`}
                        >
                          ↩️ Reverse
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
                        <div style={{ fontSize: '9px', color: 'var(--t3)', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '6px' }}>
                          Settlement Entries
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
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <span style={{ fontSize: '10px', color: 'var(--t3)', letterSpacing: '1.5px', textTransform: 'uppercase' }}>
                          Telegram Bot Message Preview
                        </span>
                        <button
                          onClick={() => copyText(renderBotMessageForTx(selectedTx), 'คัดลอกข้อความ Telegram แล้ว')}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--c)',
                            fontSize: '11px',
                            cursor: 'pointer',
                            fontWeight: 700,
                          }}
                        >
                          📋 Copy Message
                        </button>
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
                        06 · CYCLE SUMMARY ({summary.cycle})
                      </div>
                      <CeButton variant="ghost" size="sm" onClick={() => setPanelMode('tx')}>
                        ← กลับคิวงาน
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
                        <span style={{ color: 'var(--t3)' }}>💳 LIMIT</span>
                        <strong>{fmtInt(summary.limitThb)} THB</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--t3)' }}>📊 USED</span>
                        <strong>{fmtInt(summary.usedThb)} THB</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--t3)' }}>🟢 REMAINING</span>
                        <strong style={{ color: 'var(--s)' }}>{fmtInt(summary.remainingThb)} THB</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--t3)' }}>📥 RECEIVED</span>
                        <strong style={{ color: 'var(--s)' }}>{fmtInt(summary.receivedThb)} THB</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--t3)' }}>📤 SENT</span>
                        <strong style={{ color: 'var(--c)' }}>{fmtUsdt(summary.sentUsdt)} USDT</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--t3)' }}>⏳ PENDING</span>
                        <strong style={{ color: 'var(--w)' }}>{fmtUsdt(summary.pendingUsdt)} USDT</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--t3)' }}>🔴 NEGATIVE</span>
                        <strong style={{ color: 'var(--d)' }}>{fmtUsdt(summary.negativeUsdt)} USDT</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--t3)' }}>✨ PROFIT</span>
                        <strong style={{ color: 'var(--g)' }}>{fmtThb(summary.profitThb)} THB</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--t3)' }}>💱 RATE</span>
                        <strong style={{ color: 'var(--g)' }}>{summary.rate.toFixed(4)}</strong>
                      </div>
                    </div>
                  </>
                )}

                {/* MODE 3: BANK PIN MANAGER */}
                {panelMode === 'pin' && summary && (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--g)' }}>
                        📌 ปักหมุดบัญชีรับโอนวันนี้ (Today PIN)
                      </div>
                      <CeButton variant="ghost" size="sm" onClick={() => setPanelMode('tx')}>
                        ← กลับ
                      </CeButton>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <label style={{ fontSize: '11px', color: 'var(--t2)' }}>เลือกบัญชีธนาคารที่ปักหมุดในกลุ่มโต๊ะ:</label>
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
                        {banks.map((b) => (
                          <option key={b.code} value={b.code}>
                            {b.code} · {b.account} ({b.holder})
                          </option>
                        ))}
                      </select>

                      <label style={{ fontSize: '11px', color: 'var(--t2)' }}>วงเงิน Limit รอบนี้ (THB):</label>
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

                      <CeButton
                        variant="success"
                        onClick={handleUpdatePin}
                        loading={loadingAction === 'pin'}
                        icon={<CeIcon name="pin" size={14} color="var(--b0)" />}
                      >
                        บันทึกบัญชี PIN วันนี้
                      </CeButton>
                    </div>
                  </>
                )}

                {/* MODE 4: DESK RATE MANAGER */}
                {panelMode === 'rate' && summary && (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--g)' }}>
                        💱 ตั้งเรทโต๊ะ (Desk USDT/THB Rate)
                      </div>
                      <CeButton variant="ghost" size="sm" onClick={() => setPanelMode('tx')}>
                        ← กลับ
                      </CeButton>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <label style={{ fontSize: '11px', color: 'var(--t2)' }}>เรทขาย USDT ของโต๊ะ (/setrate):</label>
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
                        อัปเดตเรทโต๊ะ
                      </CeButton>
                      <CeButton
                        variant="ghost"
                        onClick={handleAutoRate}
                        loading={loadingAction === 'rate-auto'}
                        icon={<CeIcon name="usdt" size={14} color="var(--c)" />}
                      >
                        🤖 AUTO ตามตลาด ({market?.rate ? market.rate.toFixed(2) : '—'} + {autoCfg?.rateSpread ?? 0.3})
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
                        <strong style={{ color: 'var(--t1)' }}>⚙️ Zero-config integrations</strong>
                        <span>📈 Market: {market?.source || '—'} · โหมด {market?.rateMode === 'auto' ? 'AUTO' : 'MANUAL'}</span>
                        <span>💾 Storage: {autoCfg?.integrations?.storage?.mode || 'local-json'}</span>
                        <span>📨 Telegram: {autoCfg?.integrations?.telegram?.enabled ? '✅ เชื่อมแล้ว' : '⏸ ปิด (ใส่ BOT_TOKEN + OPS_CHAT_ID เพื่อเปิด)'}</span>
                        <span>🗄 Supabase: {autoCfg?.integrations?.supabase?.enabled ? '✅ ตรวจพบ' : '⏸ ไม่ได้ตั้ง (ไม่จำเป็น)'}</span>
                        <span>🔐 Secrets: {autoCfg?.autoSecrets ? `${Object.keys(autoCfg.autoSecrets).length} ค่า สร้างอัตโนมัติ` : '—'}</span>
                      </div>
                    </div>
                  </>
                )}

                {/* MODE 5: NEW CYCLE */}
                {panelMode === 'cycle' && summary && (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--g)' }}>
                        🔄 ปิดรอบ {summary.cycle} → เปิดรอบใหม่
                      </div>
                      <CeButton variant="ghost" size="sm" onClick={() => setPanelMode('tx')}>
                        ← กลับ
                      </CeButton>
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--t2)', lineHeight: 1.6 }}>
                      การเปิดรอบใหม่จะบันทึกยอดสรุปของรอบ <strong>{summary.cycle}</strong> ลงประวัติ และคงรายการที่ยังค้างโอน (READY / PENDING / SHORT) ไว้ในคิวโดยไม่ลบประวัติ
                    </div>
                    <CeButton
                      variant="gold"
                      onClick={handleNewCycle}
                      loading={loadingAction === 'cycle'}
                      icon={<CeIcon name="cycle" size={14} color="var(--b0)" />}
                    >
                      ยืนยันเปิดรอบถัดไป
                    </CeButton>
                    {cycleHistory.length > 0 && (
                      <div style={{ marginTop: '8px' }}>
                        <div style={{ fontSize: '10px', color: 'var(--t3)', textTransform: 'uppercase', marginBottom: '6px' }}>
                          ประวัติรอบที่ปิดแล้ว
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
                    02 · SCAN SLIP & OCR INTAKE
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--t3)' }}>
                    ทดสอบส่งสลิปเข้าสู่ระบบตรวจจับ OCR + Bank PIN ({summary?.pinnedBank.code} · {summary?.pinnedBank.account})
                  </div>
                </div>
                <CeIcon name="scan" size={24} color="var(--c)" />
              </div>

              {/* Quick Scenario Presets */}
              <div>
                <div style={{ fontSize: '10px', color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '8px' }}>
                  1-Click Scenario Presets
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
                    }}
                  >
                    🟢 สลิปปกติ (Match 98.7%)
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
                    }}
                  >
                    🟠 Bank Mismatch (KTB ≠ PIN)
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
                    }}
                  >
                    🟡 Low OCR Confidence (72%)
                  </CeButton>
                </div>
              </div>

              {/* Input fields */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '11px', color: 'var(--t2)', display: 'block', marginBottom: '4px' }}>
                    ยอดโอน (THB)
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
                    ธนาคารผู้รับในสลิป
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
                    {banks.map((b) => (
                      <option key={b.code} value={b.code}>
                        {b.code} ({b.name})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '11px', color: 'var(--t2)', display: 'block', marginBottom: '4px' }}>
                    เลขบัญชีในสลิป
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
                    ความแม่นยำ OCR (%)
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

              <div>
                <label style={{ fontSize: '11px', color: 'var(--t2)', display: 'block', marginBottom: '4px' }}>
                  ชื่อผู้โอนในสลิป
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
                  จำลองสลิปซ้ำ (Duplicate)
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
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--c)' }}>
                  ผลลัพธ์ Telegram Bot Card (MSG Template)
                </span>
                <CeButton
                  variant="outline"
                  size="sm"
                  onClick={() => setActiveTab('desk')}
                >
                  เปิดดูใน Operator Desk →
                </CeButton>
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
                {scanResultMsg ||
                  MSG.OCR_READY({
                    thb: fmtThb(Number(scanThb || 10000)),
                    usdt: fmtUsdt(Number(scanThb || 10000) / (summary?.rate || 43)),
                    bank: scanBank,
                    account: scanAccount,
                    name: scanSender,
                    rate: (summary?.rate || 43).toFixed(2),
                    confidence: Number(scanConfidence || 98.7),
                  })}
              </pre>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════ */}
        {/* TAB 3: 30 BOT MESSAGE TEMPLATES */}
        {/* ═══════════════════════════════════════════════════════ */}
        {activeTab === 'messages' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--c)' }}>
                  CE VAULT · Bot Message Templates (src/constants/messages.ts)
                </div>
                <div style={{ fontSize: '12px', color: 'var(--t3)' }}>
                  คลิก Copy เพื่อคัดลอกข้อความฟอร์แมต Telegram Bot สำหรับทุกสถานะ
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
                    {g}
                  </button>
                ))}
              </div>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(310px, 1fr))',
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
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <span style={{ fontSize: '10px', color: 'var(--c)', fontFamily: "'Space Mono', monospace", fontWeight: 700 }}>
                          {m.key} · {m.group}
                        </span>
                        <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--t1)' }}>{m.title}</div>
                      </div>
                      <CeButton
                        variant="outline"
                        size="sm"
                        onClick={() => copyText(m.text, `คัดลอก ${m.key} แล้ว`)}
                      >
                        📋 Copy
                      </CeButton>
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
        {/* TAB 4: DESIGN SYSTEM v1.0 */}
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
              <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--c)', marginBottom: '14px', letterSpacing: '1px' }}>
                10 TRANSACTION STATUS BADGES (src/components/ui/StatusBadge.tsx)
              </div>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                {ALL_STATUSES.map((st) => (
                  <StatusBadge key={st} status={st} />
                ))}
              </div>
            </div>

            {/* 36 SVG Icons */}
            <div
              style={{
                background: 'var(--b2)',
                border: '1px solid var(--br)',
                borderRadius: '14px',
                padding: '20px',
              }}
            >
              <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--c)', marginBottom: '14px', letterSpacing: '1px' }}>
                36 VECTOR ICONS (src/components/ui/CeIcon.tsx)
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
                    onClick={() => copyText(`<CeIcon name="${name}" size={20} />`, `คัดลอกไอคอน ${name}`)}
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
