// Smart PIN Auto-Parser & CE Standard Message Formatter

export const THAI_BANKS = [
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

export function findBankMeta(codeOrText) {
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

function parseShorthandNumber(raw) {
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

export function parseSmartPinText(rawInput, fallbackLimit = 500000) {
  const original = String(rawInput || '').trim();
  if (!original) return null;

  let working = original
    .replace(/\r/g, '\n')
    .replace(/ธนาคาร\s*[:：]/gi, ' ')
    .replace(/เลขบัญชี\s*[:：]|บัญชี\s*[:：]|เลขที่\s*[:：]/gi, ' ')
    .replace(/ชื่อ-สกุล\s*[:：]|ชื่อบัญชี\s*[:：]|ชื่อ\s*[:：]/gi, ' ');

  // 1. Extract explicit limit (e.g. "วงเงิน 50000", "วงเงิน: 50,000฿", "limit 300k")
  let limitThb = null;
  const limitKeywordRe = /(?:วงเงิน|ลิมิต|limit|max|รับได้)\s*[:：]?\s*(\d[\d,.]*(?:\s*(?:k|m|ล้าน|แสน|หมื่น))?)\s*(?:฿|บาท|thb)?/i;
  const limMatch = working.match(limitKeywordRe);
  if (limMatch) {
    const parsed = parseShorthandNumber(limMatch[1].replace(/\.(?=\d{3}(?:\D|$))/g, ''));
    if (Number.isFinite(parsed) && parsed > 0) {
      limitThb = Math.round(parsed);
      working = working.replace(limMatch[0], ' ');
    }
  }

  // Also support currency-suffixed limit like "50000฿" or "50,000 บาท" or "300k"
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

  // 2. Extract Bank Account Number (9-15 digits, allowing dashes/spaces inside)
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

  // 3. If limit still not found, look for a remaining standalone number (e.g. 50000 or 500,000)
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

  // 4. Detect Bank (longest alias first to avoid partial matches)
  let detectedBank = null;
  const allAliases = THAI_BANKS.flatMap((b) => b.aliases.map((alias) => ({ bank: b, alias })))
    .sort((a, b) => b.alias.length - a.alias.length);

  for (const { bank, alias } of allAliases) {
    const isAscii = /^[a-z0-9.-]+$/i.test(alias);
    const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = isAscii ? new RegExp(`(?<![a-z0-9])${escaped}(?![a-z0-9])`, 'i') : new RegExp(escaped, 'i');
    const match = working.match(re);
    if (match) {
      detectedBank = bank;
      // Remove all aliases of the detected bank (e.g. both "ไทยพาณิชย์" and "SCB")
      for (const a of [...bank.aliases].sort((x, y) => y.length - x.length)) {
        const ascii = /^[a-z0-9.-]+$/i.test(a);
        const esc = a.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const rm = ascii ? new RegExp(`(?<![a-z0-9])${esc}(?![a-z0-9])`, 'gi') : new RegExp(esc, 'gi');
        working = working.replace(rm, ' ');
      }
      break;
    }
  }

  // 5. Remaining cleaned text is the account holder name
  const holder = working
    .replace(/\p{Extended_Pictographic}|\uFE0F/gu, ' ')
    .replace(/[()\[\]•·฿]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!detectedBank && !account) return null;

  const bank = detectedBank || { code: 'BANK', lower: 'bank', thai: 'ธนาคาร', fullThai: 'ธนาคาร' };
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

export function formatSmartPinCard({ thaiBank, lowerCode, code, account, holder, limitThb }) {
  const meta = findBankMeta(lowerCode || code || thaiBank);
  const bThai = thaiBank || meta?.thai || code || 'ธนาคาร';
  const bLower = (lowerCode || meta?.lower || String(code || '').toLowerCase()).trim();
  const limitFmt = Number(limitThb || 0).toLocaleString('en-US', { maximumFractionDigits: 0 });
  return [
    '◈ CE EMPIRE · ข้อมูลบัญชีรับเงิน',
    `ธนาคาร : ${bThai} (${bLower}) 👍`,
    `เลขบัญชี : ${account}`,
    `ชื่อ-สกุล : ${holder}`,
    `วงเงิน : ${limitFmt}฿`,
  ].join('\n');
}

export function maskAccountLast4(account) {
  const s = String(account || '').trim();
  if (!s) return '••••';
  if (s.startsWith('••••')) return s;
  const digits = s.replace(/\D/g, '');
  if (digits.length >= 4) return `••••${digits.slice(-4)}`;
  return s;
}

export function formatThaiSlipDateTime(date = new Date()) {
  // Always Thai time (Asia/Bangkok, UTC+7, no DST) — servers like Render run in UTC.
  const src = date instanceof Date ? date : new Date(date);
  const d = new Date(src.getTime() + 7 * 60 * 60 * 1000);
  const dd = String(d.getUTCDate()).padStart(2, '0');
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const beYear = d.getUTCFullYear() + 543;
  const hh = String(d.getUTCHours()).padStart(2, '0');
  const min = String(d.getUTCMinutes()).padStart(2, '0');
  return `${dd}/${mm}/${beYear} ${hh}:${min}`;
}

export function formatCeTransactionCard({
  statusLine,
  thb,
  rate,
  usdtExpected,
  usdtSent = 0,
  bank,
  account,
  slipTime,
  blocked = false,
  alertLine = '',
}) {
  const thbNum = Number(thb || 0);
  const rateNum = Number(rate || 1);
  const estUsdt = rateNum > 0 ? thbNum / rateNum : Number(usdtExpected || 0);
  const dueVal = Number(usdtExpected || Number(estUsdt.toFixed(2)));
  const clearedVal = Number(usdtSent || 0);
  const outstandingVal = Math.max(0, Number((dueVal - clearedVal).toFixed(2)));

  const fmt2 = (n) => Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fmt6 = (n) => Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 6, maximumFractionDigits: 6 });

  const lines = [
    '◈ CE · ',
    statusLine,
    `💵 THB (รับ): ${fmt2(thbNum)}`,
    `📈 RATE: ${fmt2(rateNum)}`,
    `💎 USDT (ประเมิน): ${fmt6(estUsdt)}`,
    `📤 DUE (ต้องส่ง): ${blocked ? '—' : fmt2(dueVal)} USDT`,
    `✅ CLEARED (ส่งแล้ว): ${blocked ? '—' : fmt2(clearedVal)} USDT`,
    `⏳ OUTSTANDING (ค้างส่ง): ${blocked ? '—' : fmt2(outstandingVal)} USDT`,
    `🏦 BANK: ${String(bank || 'BBL').toUpperCase()} · ACCOUNT: ${maskAccountLast4(account)}`,
    `🗓 สลิป: ${slipTime || formatThaiSlipDateTime()}`,
  ];

  if (alertLine) {
    lines.push('', `💢 ${alertLine} 💢`);
  }

  return lines.join('\n');
}
