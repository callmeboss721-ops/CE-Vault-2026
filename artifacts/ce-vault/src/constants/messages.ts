// src/constants/messages.ts
// CE VAULT — Standard CE Bot Message Templates v2.0 (Bilingual TH / EN)
// ใช้งาน (Usage): import { MSG } from '@/constants/messages'

import { formatSmartPinCard, formatThaiSlipDateTime, maskAccountLast4 } from '../utils/smartPin';

export interface MsgData {
  id?:             string
  thb?:            string
  usdt?:           string
  usdt_est?:       string
  usdt_expected?:  string
  usdt_sent?:      string
  usdt_short?:     string
  usdt_outstanding?: string
  bank?:           string
  account?:        string
  name?:           string
  rate?:           string
  confidence?:     number
  time?:           string
  slip_time?:      string
  operator?:       string
  reason?:         string
  cycle_current?:  string
  cycle_new?:      string
  limit?:          string
  used?:           string
  remaining?:      string
  percent?:        number | string
  minutes?:        number | string
  hours?:          string
  count_pending?:  number
  count_short?:    number
  count_ready?:    number
  count_exception?:number
  profit?:         string
}

function toNum(v?: string): number {
  return Number(String(v || '0').replace(/,/g, '')) || 0;
}

function est6(d: MsgData): string {
  if (d.usdt_est) return d.usdt_est;
  const thb = toNum(d.thb);
  const rate = toNum(d.rate);
  if (thb > 0 && rate > 0) {
    return (thb / rate).toLocaleString('en-US', { minimumFractionDigits: 6, maximumFractionDigits: 6 });
  }
  const fallback = toNum(d.usdt_expected || d.usdt);
  return fallback.toLocaleString('en-US', { minimumFractionDigits: 6, maximumFractionDigits: 6 });
}

function slipStamp(d: MsgData): string {
  return d.slip_time || d.time || formatThaiSlipDateTime();
}

function bankLine(d: MsgData): string {
  return `🏦 BANK: ${(d.bank || 'BBL').toUpperCase()} · ACCOUNT: ${maskAccountLast4(d.account)}`;
}

export const MSG = {

  // ══ SMART PIN CARD ══════════════════════════════════
  SMART_PIN_CARD: (d: MsgData): string =>
    formatSmartPinCard({
      code: d.bank || 'KBANK',
      account: d.account || '1230004444',
      holder: d.name || 'ธิติ ทองมี',
      limitThb: toNum(d.limit) || 50000,
    }),

  // ══ INTAKE ══════════════════════════════════════════
  OCR_LOADING: (): string =>
`◈ CE · 
🔄 กำลังอ่านสลิป... (Scanning Slip...)
⏳ ระบบ OCR กำลังประมวลผล (Processing OCR)`,

  OCR_READY: (d: MsgData): string =>
`◈ CE · 
🟡 พร้อมยืนยันโอน (READY · OCR ${d.confidence ?? 99}%)
💵 THB (รับ): ${d.thb || '0.00'}
📈 RATE: ${d.rate || '43.00'}
💎 USDT (ประเมิน): ${est6(d)}
📤 DUE (ต้องส่ง): ${d.usdt_expected || d.usdt || '0.00'} USDT
✅ CLEARED (ส่งแล้ว): ${d.usdt_sent || '0.00'} USDT
⏳ OUTSTANDING (ค้างส่ง): ${d.usdt_outstanding || d.usdt_expected || d.usdt || '0.00'} USDT
${bankLine(d)}
🗓 สลิป: ${slipStamp(d)}`,

  OCR_FAIL: (): string =>
`◈ CE · 
🔴 อ่านสลิปไม่สำเร็จ (OCR Failed)
💵 THB (รับ): —
📈 RATE: —
💎 USDT (ประเมิน): —
📤 DUE (ต้องส่ง): — USDT
✅ CLEARED (ส่งแล้ว): — USDT
⏳ OUTSTANDING (ค้างส่ง): — USDT

💢 กรุณาถ่ายรูปสลิปใหม่ให้ชัดขึ้น 💢`,

  OCR_LOW_CONFIDENCE: (d: MsgData): string =>
`◈ CE · 
🟡 ความแม่นยำ OCR ต่ำ (${d.confidence ?? 72}% · Review)
💵 THB (รับ): ${d.thb || '0.00'}
📈 RATE: ${d.rate || '43.00'}
💎 USDT (ประเมิน): ${est6(d)}
📤 DUE (ต้องส่ง): — USDT
✅ CLEARED (ส่งแล้ว): — USDT
⏳ OUTSTANDING (ค้างส่ง): — USDT
${bankLine(d)}
🗓 สลิป: ${slipStamp(d)}

💢 กรุณาตรวจสอบข้อมูลสลิปก่อนยืนยัน 💢`,

  SLIP_DATE_MISMATCH: (d: MsgData): string =>
`◈ CE · 
🔴 วันที่สลิปไม่ตรง
💵 THB (รับ): ${d.thb || '5,000.00'}
📈 RATE: ${d.rate || '44.00'}
💎 USDT (ประเมิน): ${est6(d)}
📤 DUE (ต้องส่ง): — USDT
✅ CLEARED (ส่งแล้ว): — USDT
⏳ OUTSTANDING (ค้างส่ง): — USDT
${bankLine(d)}
🗓 สลิป: ${d.slip_time || '13/12/2569 19:39'}

💢 เวลาไม่ตรงกับปัจจุบัน 💢`,

  // ══ VERIFY CHECKS ═══════════════════════════════════
  BANK_MISMATCH: (d: MsgData): string =>
`◈ CE · 
🟠 บัญชีในสลิปไม่ตรง PIN (Bank Mismatch)
💵 THB (รับ): ${d.thb || '15,000.00'}
📈 RATE: ${d.rate || '43.00'}
💎 USDT (ประเมิน): ${est6(d)}
📤 DUE (ต้องส่ง): — USDT
✅ CLEARED (ส่งแล้ว): — USDT
⏳ OUTSTANDING (ค้างส่ง): — USDT
${bankLine(d)}
📌 PIN วันนี้: [PIN_BANK] · [PIN_ACCOUNT]
🗓 สลิป: ${slipStamp(d)}

💢 บัญชีไม่ตรงกับบัญชีรับเงินวันนี้ 💢`,

  DUPLICATE: (d: MsgData): string =>
`◈ CE · 
🟣 พบสลิปซ้ำในระบบ (Duplicate Slip)
💵 THB (รับ): ${d.thb || '10,000.00'}
💎 USDT (ประเมิน): ${est6(d)}
📤 DUE (ต้องส่ง): — USDT
✅ CLEARED (ส่งแล้ว): — USDT
⏳ OUTSTANDING (ค้างส่ง): — USDT
🆔 รายการเดิม (Original): ${d.id || '#CE-2026-A041'}
🗓 สลิป: ${slipStamp(d)}

💢 ไม่สร้างรายการซ้ำ 💢`,

  LIMIT_EXCEEDED: (d: MsgData): string =>
`◈ CE · 
🔴 วงเงินรอบนี้ไม่เพียงพอ (Limit Exceeded)
💵 THB (รับ): +${d.thb || '10,000.00'}
📊 ใช้ไปแล้ว (Used): ${d.used} / ${d.limit} THB
📤 DUE (ต้องส่ง): — USDT
✅ CLEARED (ส่งแล้ว): — USDT
⏳ OUTSTANDING (ค้างส่ง): — USDT

💢 ยอดเกินวงเงินที่กำหนด 💢`,

  RATE_CHANGED: (d: MsgData): string =>
`◈ CE · 
🟡 เรทเปลี่ยนระหว่างสแกน (Rate Changed)
💵 THB (รับ): ${d.thb || '10,000.00'}
📈 RATE (ใหม่): ${d.rate}
💎 USDT (ประเมิน): ${est6(d)}
📤 DUE (ต้องส่ง): ${d.usdt || '0.00'} USDT

💢 กรุณายืนยันเรทปัจจุบันก่อนโอน 💢`,

  // ══ TRANSACTION STATUS ═══════════════════════════════
  TX_READY: (d: MsgData): string =>
`◈ CE · 
🟡 พร้อมยืนยันโอน (READY · ${d.id || ''})
💵 THB (รับ): ${d.thb}
📈 RATE: ${d.rate}
💎 USDT (ประเมิน): ${est6(d)}
📤 DUE (ต้องส่ง): ${d.usdt} USDT
✅ CLEARED (ส่งแล้ว): 0.00 USDT
⏳ OUTSTANDING (ค้างส่ง): ${d.usdt} USDT
${bankLine(d)}
🗓 สลิป: ${slipStamp(d)}`,

  TX_PENDING: (d: MsgData): string =>
`◈ CE · 
🔵 อยู่ในคิวรอโอน (PENDING · ${d.id || ''})
💵 THB (รับ): ${d.thb || '10,000.00'}
📈 RATE: ${d.rate || '43.00'}
💎 USDT (ประเมิน): ${est6(d)}
📤 DUE (ต้องส่ง): ${d.usdt} USDT
✅ CLEARED (ส่งแล้ว): ${d.usdt_sent || '0.00'} USDT
⏳ OUTSTANDING (ค้างส่ง): ${d.usdt_outstanding || d.usdt} USDT
${bankLine(d)}
🗓 สลิป: ${slipStamp(d)}`,

  TX_QUEUED: (d: MsgData): string =>
`◈ CE · 
🔵 เข้าคิวรอส่ง USDT (QUEUED · ${d.id || ''})
💵 THB (รับ): ${d.thb}
📈 RATE: ${d.rate}
💎 USDT (ประเมิน): ${est6(d)}
📤 DUE (ต้องส่ง): ${d.usdt} USDT
✅ CLEARED (ส่งแล้ว): ${d.usdt_sent || '0.00'} USDT
⏳ OUTSTANDING (ค้างส่ง): ${d.usdt_outstanding || d.usdt} USDT
${bankLine(d)}
🗓 สลิป: ${slipStamp(d)}`,

  TX_SETTLED: (d: MsgData): string =>
`◈ CE · 
🟢 โอนเหรียญครบแล้ว (SETTLED · ${d.id || ''})
💵 THB (รับ): ${d.thb}
📈 RATE: ${d.rate}
💎 USDT (ประเมิน): ${est6(d)}
📤 DUE (ต้องส่ง): ${d.usdt_expected || d.usdt} USDT
✅ CLEARED (ส่งแล้ว): ${d.usdt} USDT
⏳ OUTSTANDING (ค้างส่ง): 0.00 USDT
${bankLine(d)}
🗓 สลิป: ${slipStamp(d)}`,

  TX_SHORT: (d: MsgData): string =>
`◈ CE · 
🔴 ส่งเหรียญไม่ครบ (SHORT · ${d.id || ''})
💵 THB (รับ): ${d.thb || '10,000.00'}
📈 RATE: ${d.rate || '43.00'}
💎 USDT (ประเมิน): ${est6(d)}
📤 DUE (ต้องส่ง): ${d.usdt_expected} USDT
✅ CLEARED (ส่งแล้ว): ${d.usdt_sent} USDT
⏳ OUTSTANDING (ค้างส่ง): ${d.usdt_short} USDT
${bankLine(d)}
🗓 สลิป: ${slipStamp(d)}

💢 ยอดส่งขาด ${d.usdt_short} USDT · รอส่งเพิ่ม 💢`,

  TX_SHORT_RECOVERY: (d: MsgData): string =>
`◈ CE · 
🔵 กลับเข้าคิวส่งเพิ่ม (SHORT Recovery · ${d.id || ''})
📤 DUE (ต้องส่ง): ${d.usdt_expected || '—'} USDT
✅ CLEARED (ส่งแล้ว): ${d.usdt_sent || '—'} USDT
⏳ OUTSTANDING (ค้างส่ง): ${d.usdt_short} USDT`,

  TX_SHORT_SETTLED: (d: MsgData): string =>
`◈ CE · 
🟢 แก้ไขยอดขาดสำเร็จ (SHORT → SETTLED · ${d.id || ''})
📤 DUE (ต้องส่ง): ${d.usdt_expected} USDT
✅ CLEARED (ส่งแล้ว): ${d.usdt_expected} USDT
⏳ OUTSTANDING (ค้างส่ง): 0.00 USDT`,

  TX_SHORT_RESOLVED: (d: MsgData): string =>
`◈ CE · 
🟢 โอนชดเชยครบแล้ว (SHORT → SETTLED · ${d.id || ''})
📤 DUE (ต้องส่ง): ${d.usdt_expected} USDT
✅ CLEARED (ส่งแล้ว): ${d.usdt_sent} USDT
⏳ OUTSTANDING (ค้างส่ง): 0.00 USDT`,

  TX_OVERRUN: (d: MsgData): string =>
`◈ CE · 
🔴 ยอดโอนเกินกำหนด (OVERRUN · ${d.id || ''})
📤 DUE (ต้องส่ง): ${d.usdt_expected} USDT
✅ CLEARED (พยายามส่ง): ${d.usdt_sent} USDT
⏳ OUTSTANDING (ค้างส่ง): — USDT

💢 บล็อกการส่งเกินจำนวน 💢`,

  TX_REJECTED: (d: MsgData): string =>
`◈ CE · 
⚫ ปฏิเสธรายการ (REJECTED · ${d.id || ''})
💵 THB (รับ): ${d.thb}
📤 DUE (ต้องส่ง): — USDT
✅ CLEARED (ส่งแล้ว): — USDT
⏳ OUTSTANDING (ค้างส่ง): — USDT

💢 เหตุผล: ${d.reason} 💢`,

  TX_REVERSED: (d: MsgData): string =>
`◈ CE · 
🟤 ย้อนกลับรายการ (REVERSED · ${d.id || ''})
💵 THB (รับ): ${d.thb}
📤 DUE (ต้องส่ง): — USDT
✅ CLEARED (ส่งแล้ว): ${d.usdt} USDT
⏳ OUTSTANDING (ค้างส่ง): — USDT
👤 โดย (By): ${d.operator || 'ADMIN'}

💢 ${d.reason} 💢`,

  // ══ MISMATCH FLOW ════════════════════════════════════
  MISMATCH_STILL: (d: MsgData): string =>
`◈ CE · 
🟠 ตรวจสอบซ้ำแล้วยังไม่ตรง (Still Mismatch)
${bankLine(d)}
📌 PIN วันนี้: [PIN_BANK] · [PIN_ACCOUNT]

💢 บัญชียังไม่ตรงกับ PIN 💢`,

  MISMATCH_CLEARED: (d: MsgData): string =>
`◈ CE · 
🟢 ตรวจสอบซ้ำผ่านแล้ว (Bank Match ✓)
💵 THB (รับ): ${d.thb}
📤 DUE (ต้องส่ง): ${d.usdt} USDT
${bankLine(d)}`,

  MISMATCH_OVERRIDDEN: (d: MsgData): string =>
`◈ CE · 
⚡ อนุมัติกรณีพิเศษ (OVERRIDE · ${d.id || ''})
👤 โดย (By): ${d.operator || 'OP-01'}
📝 เหตุผล (Reason): ${d.reason}
🟡 สถานะ: พร้อมโอน (READY)`,

  OVERRIDE_SUCCESS: (d: MsgData): string =>
`◈ CE · 
⚡ บันทึก Override สำเร็จ (READY)
💵 THB (รับ): ${d.thb}
📤 DUE (ต้องส่ง): ${d.usdt} USDT
👤 โดย (By): ${d.operator} · ${d.time}
📝 เหตุผล: ${d.reason}`,

  SETTLEMENT_OVERRUN: (d: MsgData): string =>
`◈ CE · 
🔴 ยอดโอนเกินกำหนด (OVERRUN)
📤 DUE (ต้องส่ง): ${d.usdt_expected} USDT
✅ CLEARED (ส่งแล้ว): ${d.usdt_sent} USDT

💢 ไม่สามารถบันทึกยอดเกินได้ 💢`,

  // ══ CYCLE ════════════════════════════════════════════
  SUMMARY: (d: MsgData): string =>
`◈ CE · สรุปภาพรวม (${d.cycle_current})
💳 LIMIT (วงเงิน): ฿${d.limit}
📊 USED (ใช้ไป): ฿${d.used}
🟢 REMAINING (คงเหลือ): ฿${d.remaining}
📈 RATE: ${d.rate}`,

  CYCLE_SUMMARY: (d: MsgData): string =>
`◈ CE · สรุปรอบงาน (${d.cycle_current})
💳 LIMIT (วงเงิน): ฿${d.limit}
📊 USED (ใช้ไป): ฿${d.used}
🟢 REMAINING (คงเหลือ): ฿${d.remaining}
💵 THB (รับรวม): ฿${d.thb || d.used}
✅ CLEARED (ส่งแล้ว): ${d.usdt} USDT
⏳ OUTSTANDING (ค้างส่ง): ${d.usdt_expected} USDT
🔴 SHORT (ส่งขาด): -${d.usdt_short} USDT
✨ PROFIT (กำไร): ฿${d.profit || '0.00'}
📈 RATE: ${d.rate}`,

  NEW_CYCLE_BLOCKED: (d: MsgData): string =>
`◈ CE · 
🔴 ยังเปิดรอบใหม่ไม่ได้ (New Cycle Blocked)
⏳ PENDING: ${d.count_pending} · 🔴 SHORT: ${d.count_short} · 🟡 READY: ${d.count_ready}

💢 กรุณาเคลียร์รายการค้างก่อน 💢`,

  NEW_CYCLE_SUCCESS: (d: MsgData): string =>
`◈ CE · 
🟢 เปิดรอบใหม่สำเร็จ (${d.cycle_current} → ${d.cycle_new})
💳 LIMIT (วงเงิน): ${d.limit} THB
📊 USED (ใช้ไป): 0 THB`,

  CYCLE_NEW_DONE: (d: MsgData): string =>
`◈ CE · 
🟢 ปิดรอบ ${d.cycle_current} → เปิดรอบ ${d.cycle_new}
💵 THB (รับรอบเก่า): ฿${d.thb}
✅ CLEARED (ส่งรวม): ${d.usdt} USDT
⏳ ยกยอดค้าง (Carried Over): ${d.count_pending ?? 0} รายการ`,

  // ══ ALERTS ════════════════════════════════════════════
  ALERT_SHORT_30M: (d: MsgData): string =>
`◈ CE · 
⚠️ SHORT ค้างเกิน 30 นาที (${d.id})
⏳ OUTSTANDING (ค้างส่ง): ${d.usdt_short} USDT
⏰ ค้างมา: ${d.minutes} นาที`,

  ALERT_SHORT_2H: (d: MsgData): string =>
`◈ CE · 
🚨 SHORT ค้างเกิน 2 ชั่วโมง (${d.id})
⏳ OUTSTANDING (ค้างส่ง): ${d.usdt_short} USDT
⏰ ค้างมา: ${d.hours}

💢 บล็อกการเปิดรอบใหม่ · แก้ไขด่วน 💢`,

  ALERT_PENDING_60M: (d: MsgData): string =>
`◈ CE · 
⚠️ PENDING ค้างนาน (${d.id})
⏳ OUTSTANDING (ค้างส่ง): ${d.usdt} USDT
⏰ ค้างมา: ${d.minutes} นาที`,

  ALERT_PENDING_STALE: (d: MsgData): string =>
`◈ CE · 
⚠️ รายการ PENDING ค้างนาน (${d.id})
💵 THB (รับ): ${d.thb}
⏳ OUTSTANDING (ค้างส่ง): ${d.usdt} USDT
⏰ ค้างมา: ${d.minutes} นาที`,

  ALERT_LIMIT_80: (d: MsgData): string =>
`◈ CE · 
⚠️ ใช้วงเงินเกิน 80% (${d.cycle_current} · ${d.percent}%)
📊 USED: ${d.used} / ${d.limit} THB
🟢 REMAINING: ${d.remaining} THB`,

  ALERT_LIMIT_95: (d: MsgData): string =>
`◈ CE · 
🚨 วงเงินใกล้เต็ม 95% (${d.cycle_current} · ${d.percent}%)
📊 USED: ${d.used} / ${d.limit} THB
🟢 REMAINING: ${d.remaining} THB

💢 เตรียมสลับบัญชี PIN หรือเปิดรอบใหม่ 💢`,

  ALERT_EXCEPTION: (): string =>
`◈ CE · 
🚨 พบ Exception ยังไม่แก้ไข
💢 บล็อกการเปิดรอบใหม่ · แจ้ง Admin 💢`,

  SYSTEM_ERROR: (): string =>
`◈ CE · 
🔴 ระบบขัดข้องชั่วคราว (System Error)
💢 ไม่มีข้อมูลถูกบันทึก · กรุณาลองใหม่ 💢`,

  ALERT_OCR_FAIL_RATE: (d: MsgData): string =>
`◈ CE · 
⚠️ อัตรา OCR ผิดพลาดสูง (${d.percent}%)
💢 เกินเกณฑ์ 20% · ตรวจสอบ OCR Service 💢`,

} as const
