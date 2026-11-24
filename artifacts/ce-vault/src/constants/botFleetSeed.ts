// Full CE Empire Bot Fleet Registry (14 Specialized Bots — Frontend & Browser Engine)

export type BotStatus = 'active' | 'paused' | 'maintenance' | 'error';

export interface BotRecord {
  slug: string;
  name: string;
  handle: string;
  category: 'Core Ops' | 'Monitoring & Reports' | 'AI & Visual' | 'QA & Security';
  roleTh: string;
  roleEn: string;
  status: BotStatus;
  owner: string;
  queueDepth: number;
  successCount: number;
  failureCount: number;
  modes: string[];
  latestError: string | null;
  autoNotify: boolean;
  lastRunAt?: string;
  telegramRoute?: {
    usesCustomToken: boolean;
    maskedToken: string;
    chatId: string;
    ready: boolean;
  };
}

export interface FleetSummary {
  total: number;
  active: number;
  paused: number;
  maintenance: number;
  error: number;
  totalQueue: number;
  totalSuccess: number;
}

export interface StoredBotRecord extends Omit<BotRecord, 'telegramRoute'> {
  customToken: string;
  customChatId: string;
}

export const DEFAULT_BOT_FLEET: StoredBotRecord[] = [
  {
    slug: 'operator-vault',
    name: '[CE] operator💙',
    handle: '@Razen_7xbot',
    category: 'Core Ops',
    roleTh: 'บอทปฏิบัติการโต๊ะหลัก · ปักหมุด PIN อัจฉริยะ · การ์ดสลิป & โอนเหรียญ',
    roleEn: 'Primary Operator Command Bot · Smart Auto-PIN · Slip Cards & Settlement',
    status: 'active',
    owner: 'Ops Lead',
    queueDepth: 4,
    successCount: 1428,
    failureCount: 0,
    modes: ['smart_pin', 'slip_card', 'settlement', 'cycle_control'],
    latestError: null,
    autoNotify: true,
    customToken: '',
    customChatId: '',
  },
  {
    slug: 'slip-verify',
    name: 'Slip Verify',
    handle: '@ce_slip_verify',
    category: 'Core Ops',
    roleTh: 'ตรวจสอบสลิปโอนเงิน · ตรวจวันที่ไม่ตรง · เช็กสลิปซ้ำและบัญชี PIN',
    roleEn: 'Payment Slip OCR Verification · Date Mismatch · Duplicate & Bank PIN Check',
    status: 'active',
    owner: 'Ops Lead',
    queueDepth: 12,
    successCount: 18420,
    failureCount: 37,
    modes: ['ocr_verify', 'date_guard', 'duplicate_check', 'bank_pin_match'],
    latestError: null,
    autoNotify: true,
    customToken: '',
    customChatId: '',
  },
  {
    slug: 'finance-ops',
    name: 'Finance Ops',
    handle: '@ce_finance_ops',
    category: 'Core Ops',
    roleTh: 'ประสานงานโอน USDT · คำนวณเรท Binance TH · คุมยอดค้างส่ง & กำไร',
    roleEn: 'Finance Operations · Binance TH Pricing · USDT Settlement & Profit Ledger',
    status: 'active',
    owner: 'Finance Lead',
    queueDepth: 5,
    successCount: 9201,
    failureCount: 14,
    modes: ['usdt_settlement', 'short_recovery', 'binance_rate_sync'],
    latestError: null,
    autoNotify: true,
    customToken: '',
    customChatId: '',
  },
  {
    slug: 'reconciliation',
    name: 'Reconciliation',
    handle: '@ce_recon_bot',
    category: 'Core Ops',
    roleTh: 'กระทบยอดบัญชีธนาคาร · แจ้งเตือนบัญชีไม่ตรงและรายการตกหล่น',
    roleEn: 'Bank Feed Reconciliation & Mismatch Audit Alerts',
    status: 'active',
    owner: 'Finance Lead',
    queueDepth: 2,
    successCount: 4510,
    failureCount: 6,
    modes: ['bank_reconcile', 'mismatch_audit', 'auto_retry'],
    latestError: null,
    autoNotify: true,
    customToken: '',
    customChatId: '',
  },
  {
    slug: 'alert',
    name: 'Alert Bot',
    handle: '@ce_alert_bot',
    category: 'Monitoring & Reports',
    roleTh: 'แจ้งเตือนวิกฤตแบบเรียลไทม์ · วงเงิน 80%/95% · SHORT ค้างเกินกำหนด',
    roleEn: 'Real-Time Critical Alerts · 80%/95% Limit & Aging Shortfall Escalation',
    status: 'active',
    owner: 'Ops Lead',
    queueDepth: 3,
    successCount: 22011,
    failureCount: 8,
    modes: ['limit_80_95', 'short_30m_2h', 'pending_stale', 'telegram_push'],
    latestError: null,
    autoNotify: true,
    customToken: '',
    customChatId: '',
  },
  {
    slug: 'report',
    name: 'Report Bot',
    handle: '@ce_report_bot',
    category: 'Monitoring & Reports',
    roleTh: 'สรุปรายงานประจำรอบงาน (Cycle) · สรุปยอดรับ/โอนและกำไรอัตโนมัติ',
    roleEn: 'Scheduled Cycle Summary & Finance Profit Reports',
    status: 'active',
    owner: 'Report Owner',
    queueDepth: 0,
    successCount: 1888,
    failureCount: 2,
    modes: ['cycle_summary', 'daily_pnl', 'telegram_digest'],
    latestError: null,
    autoNotify: true,
    customToken: '',
    customChatId: '',
  },
  {
    slug: 'support',
    name: 'Support Bot',
    handle: '@ce_support_bot',
    category: 'Monitoring & Reports',
    roleTh: 'คัดกรองคำถามลูกค้า · ส่งต่อเคสด่วนให้เจ้าหน้าที่โต๊ะทันที',
    roleEn: 'Client Support Triage & Human Operator Escalation',
    status: 'active',
    owner: 'CS Lead',
    queueDepth: 4,
    successCount: 6402,
    failureCount: 11,
    modes: ['triage', 'status_lookup', 'human_handoff'],
    latestError: null,
    autoNotify: false,
    customToken: '',
    customChatId: '',
  },
  {
    slug: 'ce-intel',
    name: 'CE Intel',
    handle: '@ce_intel_bot',
    category: 'AI & Visual',
    roleTh: 'ติดตามเรทตลาด Binance TH สด · วิเคราะห์สเปรดและข่าวตลาด',
    roleEn: 'Live Binance TH Market Intelligence & Spread Monitor',
    status: 'active',
    owner: 'Ops Lead',
    queueDepth: 0,
    successCount: 312,
    failureCount: 0,
    modes: ['binance_th_feed', 'spread_watch', 'research'],
    latestError: null,
    autoNotify: false,
    customToken: '',
    customChatId: '',
  },
  {
    slug: 'dev-copilot',
    name: 'Dev Copilot',
    handle: '@ce_dev_copilot',
    category: 'AI & Visual',
    roleTh: 'ตรวจสอบสุขภาพ API / Webhook และช่วยดีบักระบบอัตโนมัติ',
    roleEn: 'API / Webhook Diagnostics & Build Health Copilot',
    status: 'active',
    owner: 'Ops Lead',
    queueDepth: 1,
    successCount: 94,
    failureCount: 1,
    modes: ['healthz_probe', 'webhook_watch', 'build_check'],
    latestError: null,
    autoNotify: false,
    customToken: '',
    customChatId: '',
  },
  {
    slug: 'visual',
    name: 'Visual Bot',
    handle: '@ce_visual_ocr',
    category: 'AI & Visual',
    roleTh: 'ตรวจสอบคุณภาพความคมชัดของภาพสลิปและตรวจจับการตัดต่อภาพ',
    roleEn: 'Slip Image Quality Audit & Visual Tamper Inspection',
    status: 'active',
    owner: 'Ops Lead',
    queueDepth: 1,
    successCount: 145,
    failureCount: 0,
    modes: ['ocr_slip', 'tamper_check', 'ui_audit'],
    latestError: null,
    autoNotify: false,
    customToken: '',
    customChatId: '',
  },
  {
    slug: 'image-studio',
    name: 'Image Studio',
    handle: '@ce_image_studio',
    category: 'AI & Visual',
    roleTh: 'สร้างและตกแต่งแบนเนอร์ประกาศเรท · โลโก้ และการ์ดโปรโมต CE Empire',
    roleEn: 'Creative Rate Banners, Brand Assets & Visual Card Studio',
    status: 'active',
    owner: 'Ops Lead',
    queueDepth: 0,
    successCount: 64,
    failureCount: 0,
    modes: ['banner', 'logo', 'rate_card', 'mockup'],
    latestError: null,
    autoNotify: false,
    customToken: '',
    customChatId: '',
  },
  {
    slug: 'qa-guardian',
    name: 'QA Guardian',
    handle: '@ce_qa_guardian',
    category: 'QA & Security',
    roleTh: 'ด่านตรวจมาตรฐานคุณภาพก่อนปล่อยรายการ (PASS / NEEDS FIX / BLOCKED)',
    roleEn: 'Quality Gate Verifier (PASS / NEEDS FIX / BLOCKED)',
    status: 'active',
    owner: 'Ops Lead',
    queueDepth: 0,
    successCount: 210,
    failureCount: 0,
    modes: ['pass', 'needs_fix', 'blocked'],
    latestError: null,
    autoNotify: false,
    customToken: '',
    customChatId: '',
  },
  {
    slug: 'security-sentinel',
    name: 'Security Sentinel',
    handle: '@ce_security_bot',
    category: 'QA & Security',
    roleTh: 'เฝ้าระวังความปลอดภัย Token, Webhook, API และบันทึก Audit Log',
    roleEn: 'Security & Webhook Guard · Token Masking & Audit Protection',
    status: 'active',
    owner: 'Ops Lead',
    queueDepth: 0,
    successCount: 530,
    failureCount: 0,
    modes: ['audit', 'webhook_guard', 'harden'],
    latestError: null,
    autoNotify: true,
    customToken: '',
    customChatId: '',
  },
  {
    slug: 'workflow-orchestrator',
    name: 'Workflow Orchestrator',
    handle: '@ce_orchestrator',
    category: 'QA & Security',
    roleTh: 'ศูนย์กระจายคำสั่งและประสานคิวงานระหว่างบอททั้ง 14 ตัวอัตโนมัติ',
    roleEn: 'Cross-Bot Intent Routing & Automated Job Coordination',
    status: 'active',
    owner: 'Ops Lead',
    queueDepth: 2,
    successCount: 4120,
    failureCount: 0,
    modes: ['route', 'dispatch', 'track'],
    latestError: null,
    autoNotify: false,
    customToken: '',
    customChatId: '',
  },
];
