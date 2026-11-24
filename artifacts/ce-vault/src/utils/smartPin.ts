// Smart PIN Auto-Parser & CE Standard Message Formatter (Frontend + Browser Engine)

export interface ThaiBankMeta {
  code: string;
  lower: string;
  thai: string;
  fullThai: string;
  aliases: string[];
}

export interface ParsedSmartPin {
  code: string;
  lowerCode: string;
  thaiBank: string;
  name: string;
  account: string;
  holder: string;
  limitThb: number;
  formattedMessage: string;
}

export const THAI_BANKS: ThaiBankMeta[] = [
  { code: 'KBANK', lower: 'kbank', thai: 'กสิกร', fullThai: 'กสิกรไทย', aliases: ['กสิกรไทย', 'กสิกร', 'กสก', 'kbank', 'k-bank', 'kasikorn'] },
  { code: 'BBL', lower: 'bbl', thai: 'กรุงเทพ', fullThai: 'ธนาคารกรุงเทพ', aliases: ['ธนาคารกรุงเทพ', 'แบงก์กรุงเทพ', 'กรุงเทพ', 'bbl', 'bangkokbank', 'bangkok'] },
  { code: 'SCB', lower: 'scb', thai: 'ไทยพาณิชย์', fullThai: 'ไทยพาณิชย์', aliases: ['ไทยพาณิชย์', 'scb', 'siamcommercial'] },
  { code: 'KTB', lower: 'ktb', thai: 'กรุงไทย', fullThai: 'กรุงไทย', aliases: ['กรุงไทย', 'ktb', 'krungthai'] },
  { code: 'TTB', lower: 'ttb', thai: 'ทหารไทยธนชาต', fullThai: 'ทหารไทยธนชาต', aliases: ['ทหารไทยธนชาต', 'ทหารไทย', 'ธนชาต', 'ttb', 'tmb'] },
  { code: 'BAY', lower: 'bay', thai: 'กรุงศรี', fullThai: 'กรุงศรีอยุธยา', aliases: ['กรุงศรีอยุธยา', 'กรุงศรี', 'bay', 'krungsri'] },
  { code: 'GSB', lower: 'gsb', thai: 'ออมสิน', fullThai: 'ออมสิน', aliases: ['ออมสิน', 'gsb'] },
  { code: 'KKP', lower: 'kkp', thai: 'เกียรตินาคิน', fullThai: 'เกียรตินาคินภัทร', aliases: ['เกียรตินาคินภัทร', 'เกียรตินาคิน', 'kkp'] },
  { code: 'CIMB', lower: 'cimb', thai: 'ซีไอเอ็มบี', fullThai: 'ซีไอเอ็มบี ไทย', aliases: ['ซีไอเอ็มบี', 'cimb'] },
  { code: 'UOB', lower: 'uob', thai: 'ยูโอบี', fullThai: 'ยูโอบี', aliases: ['ยูโอบี', 'uob'] },
  { code: 'TISCO', lower: 'tisco', thai: 'ทิสโก้', fullThai: 'ทิสโก้', aliases: ['ทิสโก้', 'tisco'] },
  { code: 'LH', lower: 'lh', thai: 'แลนด์แอนด์เฮ้าส์', fullThai: 'แลนด์แอนด์เฮ้าส์', aliases: ['แลนด์แอนด์เฮ้าส์', 'lhb', 'lhbank', 'lh'] },
  { code: 'BAAC', lower: 'baac', thai: 'ธ.ก.ส.', fullThai: 'ธ.ก.ส.', aliases: ['ธ.ก.ส.', 'ธกส', 'baac'] },
  { code: 'PROMPTPAY', lower: 'promptpay', thai: 'พร้อมเพย์', fullThai: 'พร้อมเพย์', aliases: ['พร้อมเพย์', 'promptpay', 'pp'] },
  { code: 'TRUEMONEY', lower: 'truemoney', thai: 'ทรูมันนี่', fullThai: 'ทรูมันนี่ วอลเล็ท', aliases: ['ทรูมันนี่', 'truemoney', 'tmn'] },
];

export function findBankMeta(codeOrText?: string): ThaiBankMeta | null {
  const s = String(codeOrText || '').trim().toLowerCase();
  if (!s) return null;
  for (const bank of THAI_BANKS) {
    if (bank.code.toLowerCase() === s || bank.lower === s) return bank;
    for (const alias of bank.aliases) {
      if (s === alias.toLowerCase()) return bank;
    }
  }
  return null;
}

function parseShorthandNumber(raw: string): number {
  const cleaned = String(raw || '').replace(/,/g, '').trim().toLowerCase();
  const m = cleaned.match(/^(\d+(?:\.\d+)?)\s*(k|m|ล้าน|แสน|หมื่น)?$/i);
  if (!m) return NaN;
  const val = Number(m[1]);
  const unit = (m[2] || '').toLowerCase();
  if (unit === 'k') return val * 1000;
  if (unit === 'm' || unit === 'ล้าน') return val * 1000000;
  if (unit === 'แสน') return val * 100000;
  if (unit === 'หมื่น') return val * 10000;
  return val;
}

export function formatSmartPinCard(input: {
  thaiBank?: string;
  lowerCode?: string;
  code?: string;
  account: string;
  holder: string;
  limitThb: number;
}): string {
  const meta = findBankMeta(input.lowerCode || input.code || input.thaiBank);
  const bThai = input.thaiBank || meta?.thai || input.code || 'ธนาคาร';
  const bLower = (input.lowerCode || meta?.lower || String(input.code || '').toLowerCase()).trim();
  const limitFmt = Number(input.limitThb || 0).toLocaleString('en-US', { maximumFractionDigits: 0 });
  return [
    '◈ CE EMPIRE · ข้อมูลบัญชีรับเงิน',
    `ธนาคาร : ${bThai} (${bLower}) 👍`,
    `เลขบัญชี : ${input.account}`,
    `ชื่อ-สกุล : ${input.holder}`,
    `วงเงิน : ${limitFmt}฿`,
  ].join('\n');
}

export function parseSmartPinText(rawInput: string, fallbackLimit = 500000): ParsedSmartPin | null {
  const original = String(rawInput || '').trim();
  if (!original) return null;

  let working = original
    .replace(/\r/g, '\n')
    .replace(/ธนาคาร\s*[:：]/gi, ' ')
    .replace(/เลขบัญชี\s*[:：]|บัญชี\s*[:：]|เลขที่\s*[:：]/gi, ' ')
    .replace(/ชื่อ-สกุล\s*[:：]|ชื่อบัญชี\s*[:：]|ชื่อ\s*[:：]/gi, ' ');

  let limitThb: number | null = null;
  const limitKeywordRe = /(?:วงเงิน|ลิมิต|limit|max|รับได้)\s*[:：]?\s*(\d[\d,.]*(?:\s*(?:k|m|ล้าน|แสน|หมื่น))?)\s*(?:฿|บาท|thb)?/i;
  const limMatch = working.match(limitKeywordRe);
  if (limMatch) {
    const parsed = parseShorthandNumber(limMatch[1].replace(/\.(?=\d{3}(?:\D|$))/g, ''));
    if (Number.isFinite(parsed) && parsed > 0) {
      limitThb = Math.round(parsed);
      working = working.replace(limMatch[0], ' ');
    }
  }

  if (limitThb === null) {
    const currencyRe = /\b(\d[\d,.]*\s*(?:k|m|ล้าน|แสน|หมื่น)|\d[\d,.]*\s*(?:฿|บาท|thb))\b/i;
    const curMatch = working.match(currencyRe);
    if (curMatch) {
      const numPart = curMatch[1].replace(/฿|บาท|thb/gi, '').replace(/\.(?=\d{3}(?:\D|$))/g, '').trim();
      const parsed = parseShorthandNumber(numPart);
      if (Number.isFinite(parsed) && parsed > 0) {
        limitThb = Math.round(parsed);
        working = working.replace(curMatch[0], ' ');
      }
    }
  }

  let account = '';
  const acctCandidates = [...working.matchAll(/(?<![\d,])(\d[\d-]{7,16}\d)(?![\d,])/g)];
  for (const m of acctCandidates) {
    const digits = m[1].replace(/\D/g, '');
    if (digits.length >= 9 && digits.length <= 15) {
      account = m[1].trim();
      working = working.replace(m[0], ' ');
      break;
    }
  }

  if (limitThb === null) {
    const numMatch = working.match(/\b(\d{1,3}(?:,\d{3})+|\d{4,8})\b/);
    if (numMatch) {
      const parsed = Number(numMatch[1].replace(/,/g, ''));
      if (Number.isFinite(parsed) && parsed >= 1000) {
        limitThb = Math.round(parsed);
        working = working.replace(numMatch[0], ' ');
      }
    }
  }

  let detectedBank: ThaiBankMeta | null = null;
  const allAliases = THAI_BANKS.flatMap((b) => b.aliases.map((alias) => ({ bank: b, alias })))
    .sort((a, b) => b.alias.length - a.alias.length);

  for (const { bank, alias } of allAliases) {
    const isAscii = /^[a-z0-9.-]+$/i.test(alias);
    const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = isAscii ? new RegExp(`(?<![a-z0-9])${escaped}(?![a-z0-9])`, 'i') : new RegExp(escaped, 'i');
    const match = working.match(re);
    if (match) {
      detectedBank = bank;
      working = working.replace(match[0], ' ');
      break;
    }
  }

  const holder = working
    .replace(/[()[\]•·👍฿]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!detectedBank && !account) return null;

  const bank = detectedBank || { code: 'BANK', lower: 'bank', thai: 'ธนาคาร', fullThai: 'ธนาคาร', aliases: [] };
  const finalLimit = limitThb ?? fallbackLimit;

  return {
    code: bank.code,
    lowerCode: bank.lower,
    thaiBank: bank.thai,
    name: `${bank.thai} (${bank.code})`,
    account: account || 'ไม่ระบุเลขบัญชี',
    holder: holder || 'ไม่ระบุชื่อบัญชี',
    limitThb: finalLimit,
    formattedMessage: formatSmartPinCard({
      thaiBank: bank.thai,
      lowerCode: bank.lower,
      account: account || 'ไม่ระบุเลขบัญชี',
      holder: holder || 'ไม่ระบุชื่อบัญชี',
      limitThb: finalLimit,
    }),
  };
}

export function maskAccountLast4(account?: string): string {
  const s = String(account || '').trim();
  if (!s) return '••••';
  if (s.startsWith('••••')) return s;
  const digits = s.replace(/\D/g, '');
  if (digits.length >= 4) return `••••${digits.slice(-4)}`;
  return s;
}

export function formatThaiSlipDateTime(date: Date = new Date()): string {
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const beYear = date.getFullYear() + 543;
  const hh = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  return `${dd}/${mm}/${beYear} ${hh}:${min}`;
}

export function formatCeTransactionCard(params: {
  statusLine: string;
  thb: number;
  rate: number;
  usdtExpected?: number;
  usdtSent?: number;
  bank?: string;
  account?: string;
  slipTime?: string;
  blocked?: boolean;
  alertLine?: string;
}): string {
  const thbNum = Number(params.thb || 0);
  const rateNum = Number(params.rate || 1);
  const estUsdt = rateNum > 0 ? thbNum / rateNum : Number(params.usdtExpected || 0);
  const dueVal = Number(params.usdtExpected ?? Number(estUsdt.toFixed(2)));
  const clearedVal = Number(params.usdtSent || 0);
  const outstandingVal = Math.max(0, Number((dueVal - clearedVal).toFixed(2)));

  const fmt2 = (n: number) => Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fmt6 = (n: number) => Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 6, maximumFractionDigits: 6 });

  const lines = [
    '◈ CE · ',
    params.statusLine,
    `💵 THB (รับ): ${fmt2(thbNum)}`,
    `📈 RATE: ${fmt2(rateNum)}`,
    `💎 USDT (ประเมิน): ${fmt6(estUsdt)}`,
    `📤 DUE (ต้องส่ง): ${params.blocked ? '—' : fmt2(dueVal)} USDT`,
    `✅ CLEARED (ส่งแล้ว): ${params.blocked ? '—' : fmt2(clearedVal)} USDT`,
    `⏳ OUTSTANDING (ค้างส่ง): ${params.blocked ? '—' : fmt2(outstandingVal)} USDT`,
    `🏦 BANK: ${String(params.bank || 'BBL').toUpperCase()} · ACCOUNT: ${maskAccountLast4(params.account)}`,
    `🗓 สลิป: ${params.slipTime || formatThaiSlipDateTime()}`,
  ];

  if (params.alertLine) {
    lines.push('', `💢 ${params.alertLine} 💢`);
  }

  return lines.join('\n');
}
