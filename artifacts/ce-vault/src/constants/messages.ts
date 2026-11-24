// src/constants/messages.ts
// CE VAULT — Bot Message Templates v1.0
// ใช้งาน: import { MSG } from '@/constants/messages'
// ตัวอย่าง: bot.sendMessage(chatId, MSG.OCR_READY({ thb: '10,000.00', ... }))

export interface MsgData {
  id?:             string
  thb?:            string
  usdt?:           string
  usdt_expected?:  string
  usdt_sent?:      string
  usdt_short?:     string
  bank?:           string
  account?:        string
  name?:           string
  rate?:           string
  confidence?:     number
  time?:           string
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

export const MSG = {

  // ══ INTAKE ══════════════════════════════════════════
  OCR_LOADING: (): string =>
`🔄 กำลังอ่านสลิป...
⏳ OCR กำลังประมวลผล`,

  OCR_READY: (d: MsgData): string =>
`◈ CE · VERIFY
━━━━━━━━━━━━━━
📥 ${d.thb} THB
💎 ${d.usdt} USDT
🏦 ${d.bank} · ${d.account}
👤 ${d.name}
💱 RATE ${d.rate}
─────────────
🟢 OCR ${d.confidence}%
🟢 BANK MATCH
🟢 LIMIT OK
─────────────
STATUS
🟡 READY TO CONFIRM`,

  OCR_FAIL: (): string =>
`◈ CE · OCR ERROR
━━━━━━━━━━━━━━
❌ อ่านสลิปไม่สำเร็จ

กรุณาถ่ายรูปใหม่ให้ชัดขึ้น
หรือกรอกข้อมูลด้วยตนเอง`,

  OCR_LOW_CONFIDENCE: (d: MsgData): string =>
`◈ CE · REVIEW ⚠️
━━━━━━━━━━━━━━
⚠️ OCR ความแม่นยำต่ำ (${d.confidence}%)
ตรวจสอบข้อมูลก่อนยืนยัน

📥 ${d.thb} THB  ← ตรวจด้วย
🏦 ${d.bank} · ${d.account}
👤 ${d.name}
💱 RATE ${d.rate}`,

  // ══ VERIFY CHECKS ═══════════════════════════════════
  BANK_MISMATCH: (d: MsgData): string =>
`◈ CE · MISMATCH ⚠️
━━━━━━━━━━━━━━
📄 บัญชีในสลิป
🏦 ${d.bank} · ${d.account}

📌 บัญชี PIN วันนี้
🏦 [PIN_BANK] · [PIN_ACCOUNT]

❌ บัญชีไม่ตรงกัน`,

  DUPLICATE: (d: MsgData): string =>
`◈ CE · DUPLICATE
━━━━━━━━━━━━━━
⚠️ พบสลิปนี้ในระบบแล้ว

💰 ${d.thb} THB
💎 ${d.usdt} USDT
🆔 ${d.id}
📅 ${d.time}

ไม่สร้างรายการใหม่`,

  LIMIT_EXCEEDED: (d: MsgData): string =>
`◈ CE · LIMIT ⚠️
━━━━━━━━━━━━━━
⚠️ วงเงินไม่เพียงพอ

รายการนี้  + ${d.thb} THB
ใช้ไปแล้ว   ${d.used} THB
วงเงิน      ${d.limit} THB
เกิน         ▼ [OVER] THB`,

  RATE_CHANGED: (d: MsgData): string =>
`◈ CE · RATE CHANGED ⚠️
━━━━━━━━━━━━━━
⚠️ Rate เปลี่ยนระหว่างสแกน

Rate ตอนสแกน   [OLD_RATE]
Rate ปัจจุบัน   ${d.rate}
─────────────
USDT เดิม   [OLD_USDT]
USDT ใหม่   ${d.usdt}`,

  // ══ TRANSACTION STATUS ═══════════════════════════════
  TX_READY: (d: MsgData): string =>
`◈ CE · READY ✅
━━━━━━━━━━━━━━
✅ ยืนยันรายการแล้ว

🆔 ${d.id}
📥 ${d.thb} THB
💎 ${d.usdt} USDT
💱 ${d.rate} · ${d.bank}
🟡 READY

รอส่งเข้าคิว USDT`,

  TX_PENDING: (d: MsgData): string =>
`◈ CE · PENDING ⏳
━━━━━━━━━━━━━━
⏳ รายการอยู่ในคิวส่ง USDT

🆔 ${d.id}
💎 EXPECTED ${d.usdt} USDT
🕐 ${d.time}
🟦 PENDING`,

  TX_QUEUED: (d: MsgData): string =>
`◈ CE · QUEUED ⏳
━━━━━━━━━━━━━━
⏳ เข้าคิวรอส่ง USDT แล้ว

🆔 ${d.id}
📥 ${d.thb} THB
💎 EXPECTED ${d.usdt} USDT
💱 RATE ${d.rate}
🟦 PENDING`,

  TX_SETTLED: (d: MsgData): string =>
`◈ CE · DONE ✓
━━━━━━━━━━━━━━
✅ Settlement สำเร็จ

📥 IN    ${d.thb} THB
📤 OUT   ${d.usdt} USDT
💱 ${d.rate}
⏱️ ${d.time}
🟢 SETTLED
🆔 ${d.id}`,

  TX_SHORT: (d: MsgData): string =>
`◈ CE · SHORT 🔴
━━━━━━━━━━━━━━
🔴 ส่ง USDT ไม่ครบ

EXPECTED   ${d.usdt_expected} USDT
SENT        ${d.usdt_sent} USDT
SHORT       ▼ ${d.usdt_short} USDT`,

  TX_SHORT_RECOVERY: (d: MsgData): string =>
`◈ CE · PENDING ⏳
━━━━━━━━━━━━━━
🔄 กลับเข้าคิว (SHORT Recovery)

🆔 ${d.id}
ค้าง SHORT  ▼ ${d.usdt_short} USDT
⏳ PENDING — รอส่งเพิ่ม`,

  TX_SHORT_SETTLED: (d: MsgData): string =>
`◈ CE · DONE ✓
━━━━━━━━━━━━━━
✅ SHORT แก้ไขสำเร็จ

TOTAL    ${d.usdt_expected} USDT ✓

🟢 SETTLED
🆔 ${d.id}`,

  TX_SHORT_RESOLVED: (d: MsgData): string =>
`◈ CE · DONE ✓
━━━━━━━━━━━━━━
✅ ส่งเพิ่มครบจำนวนแล้ว (SHORT → SETTLED)

EXPECTED   ${d.usdt_expected} USDT
SENT TOTAL ${d.usdt_sent} USDT ✓

🟢 SETTLED
🆔 ${d.id}`,

  TX_OVERRUN: (d: MsgData): string =>
`◈ CE · OVERRUN ⛔
━━━━━━━━━━━━━━
⛔ ยอดส่งเกิน Expected!

🆔 ${d.id}
EXPECTED   ${d.usdt_expected} USDT
SENT TOTAL ${d.usdt_sent} USDT ← เกิน!

ไม่สามารถบันทึกได้`,

  TX_REJECTED: (d: MsgData): string =>
`◈ CE · REJECTED
━━━━━━━━━━━━━━
❌ ปฏิเสธรายการแล้ว

🆔 ${d.id}
📥 ${d.thb} THB
เหตุผล: ${d.reason}

🔴 REJECTED`,

  TX_REVERSED: (d: MsgData): string =>
`◈ CE · REVERSED ↩️
━━━━━━━━━━━━━━
↩️ ยกเลิกย้อนกลับรายการแล้ว

🆔 ${d.id}
📥 ${d.thb} THB
💎 ${d.usdt} USDT
โดย: ${d.operator || 'ADMIN'}
เหตุผล: ${d.reason}

🟤 REVERSED`,

  // ══ MISMATCH FLOW ════════════════════════════════════
  MISMATCH_STILL: (d: MsgData): string =>
`◈ CE · MISMATCH ⚠️
━━━━━━━━━━━━━━
🔁 RECHECK แล้ว — ยังไม่ตรง

📄 สลิป: ${d.bank} · ${d.account}
📌 PIN:  [PIN_BANK] · [PIN_ACCOUNT]

❌ ยังไม่ตรงกัน`,

  MISMATCH_CLEARED: (d: MsgData): string =>
`◈ CE · VERIFY ✓
━━━━━━━━━━━━━━
✅ RECHECK ผ่านแล้ว

📥 ${d.thb} THB
💎 ${d.usdt} USDT
🏦 ${d.bank} · ${d.account}
🟢 BANK MATCH ✓`,

  MISMATCH_OVERRIDDEN: (d: MsgData): string =>
`◈ CE · OVERRIDE ⚡
━━━━━━━━━━━━━━
⚡ Override บัญชีไม่ตรงสำเร็จ

🆔 ${d.id}
โดย: ${d.operator || 'OP-01'}
เหตุผล: ${d.reason}

🟡 READY TO SETTLE`,

  OVERRIDE_SUCCESS: (d: MsgData): string =>
`◈ CE · OVERRIDE ⚡
━━━━━━━━━━━━━━
⚡ Override บันทึกแล้ว

เหตุผล: ${d.reason}
โดย: ${d.operator}
เวลา: ${d.time}

📥 ${d.thb} THB
💎 ${d.usdt} USDT
🟡 READY`,

  SETTLEMENT_OVERRUN: (d: MsgData): string =>
`◈ CE · OVERRUN ⛔
━━━━━━━━━━━━━━
⛔ ยอดจะเกิน Expected

EXPECTED    ${d.usdt_expected} USDT
SENT TOTAL  ${d.usdt_sent} USDT
ยอดที่กรอก  + [INPUT] USDT ← เกิน!

ไม่สามารถบันทึกได้`,

  // ══ CYCLE ════════════════════════════════════════════
  SUMMARY: (d: MsgData): string =>
`💎 CE VAULT
━━━━━━━━━━━━━━
🏠 ${d.cycle_current}
💳 LIMIT       ฿${d.limit}
📊 USED        ฿${d.used}
🟢 REMAINING   ฿${d.remaining}
📥 RECEIVED    ฿${d.used}
📤 SENT        $[SENT_USDT]
⏳ PENDING     $[PEND_USDT]
🔴 NEGATIVE    -$[NEG_USDT]
✨ PROFIT      ฿[PROFIT]
💱 RATE        ${d.rate}
━━━━━━━━━━━━━━
[N] SETTLED · [N] READY · [N] PENDING · [N] SHORT`,

  CYCLE_SUMMARY: (d: MsgData): string =>
`💎 CE VAULT · SUMMARY
━━━━━━━━━━━━━━
🏠 CYCLE       ${d.cycle_current}
💳 LIMIT       ฿${d.limit}
📊 USED        ฿${d.used}
🟢 REMAINING   ฿${d.remaining}
📥 RECEIVED    ฿${d.thb || d.used}
📤 SENT        ${d.usdt} USDT
⏳ PENDING     ${d.usdt_expected} USDT
🔴 SHORT       -${d.usdt_short} USDT
✨ PROFIT      ฿${d.profit || '0.00'}
💱 RATE        ${d.rate}`,

  NEW_CYCLE_BLOCKED: (d: MsgData): string =>
`◈ CE · NEW CYCLE ⛔
━━━━━━━━━━━━━━
❌ ยังเปิดรอบใหม่ไม่ได้

รายการค้างอยู่:
⏳ PENDING  ${d.count_pending} รายการ
🔴 SHORT    ${d.count_short} รายการ
🟡 READY    ${d.count_ready} รายการ

แก้ไขรายการข้างต้นก่อน`,

  NEW_CYCLE_SUCCESS: (d: MsgData): string =>
`◈ CE · NEW CYCLE ⚡
━━━━━━━━━━━━━━
✅ เปิดรอบใหม่สำเร็จ

${d.cycle_current}  ✓ CLOSED
${d.cycle_new}  🆕 OPEN
━━━━━━━━━━━━━━
💳 LIMIT  ${d.limit} THB
📊 USED   0 THB

รอบใหม่พร้อมใช้งาน`,

  CYCLE_NEW_DONE: (d: MsgData): string =>
`◈ CE · NEW CYCLE ⚡
━━━━━━━━━━━━━━
✅ ปิดรอบ ${d.cycle_current} → เปิดรอบ ${d.cycle_new}

📥 ยอดรับรอบเก่า  ฿${d.thb}
📤 ส่ง USDT รวม   ${d.usdt} USDT
⏳ ยกยอดค้าง      ${d.count_pending ?? 0} รายการ

🆕 ${d.cycle_new} พร้อมใช้งาน`,

  // ══ ALERTS ════════════════════════════════════════════
  ALERT_SHORT_30M: (d: MsgData): string =>
`⚠️ CE VAULT ALERT
━━━━━━━━━━━━━━
⚠️ SHORT ค้างนาน

🆔 ${d.id}
💎 SHORT ▼ ${d.usdt_short} USDT
⏰ ค้างมา ${d.minutes} นาที`,

  ALERT_SHORT_2H: (d: MsgData): string =>
`🚨 CE VAULT CRITICAL
━━━━━━━━━━━━━━
🔴 SHORT ค้างนานมาก

🆔 ${d.id}
💎 SHORT ▼ ${d.usdt_short} USDT
⏰ ค้างมา ${d.hours}

⛔ บล็อก New Cycle
แก้ไขด่วน!`,

  ALERT_PENDING_60M: (d: MsgData): string =>
`⚠️ CE VAULT ALERT
━━━━━━━━━━━━━━
⚠️ PENDING ค้างนาน

🆔 ${d.id}
💎 ${d.usdt} USDT
⏰ ค้างมา ${d.minutes} นาที`,

  ALERT_PENDING_STALE: (d: MsgData): string =>
`⚠️ CE VAULT ALERT
━━━━━━━━━━━━━━
⚠️ รายการ PENDING ค้างนาน

🆔 ${d.id}
📥 ${d.thb} THB
💎 ค้างส่ง ${d.usdt} USDT
⏰ ค้างมา ${d.minutes} นาที`,

  ALERT_LIMIT_80: (d: MsgData): string =>
`⚠️ CE VAULT ALERT
━━━━━━━━━━━━━━
⚠️ ใช้วงเงินเกิน 80%

${d.cycle_current} · ใช้ ${d.percent}%
USED     ${d.used} THB
LIMIT    ${d.limit} THB
LEFT      ${d.remaining} THB`,

  ALERT_LIMIT_95: (d: MsgData): string =>
`🚨 CE VAULT ALERT
━━━━━━━━━━━━━━
🔴 วงเงินใกล้เต็มแล้ว!

${d.cycle_current} · ใช้ ${d.percent}%
USED     ${d.used} THB
LIMIT    ${d.limit} THB
LEFT      ${d.remaining} THB

รับได้อีกไม่มาก`,

  ALERT_EXCEPTION: (): string =>
`🚨 CE VAULT ALERT
━━━━━━━━━━━━━━
🔴 มี Exception ยังไม่แก้

1 SETTLEMENT EXCEPTION OPEN
⛔ บล็อก New Cycle

ต้องให้ Admin แก้ไขก่อน`,

  SYSTEM_ERROR: (): string =>
`◈ CE · ERROR ⚠️
━━━━━━━━━━━━━━
⚠️ ระบบขัดข้อง

ไม่สามารถดำเนินการได้
ไม่มีข้อมูลถูกบันทึก

กรุณาลองใหม่อีกครั้ง`,

  ALERT_OCR_FAIL_RATE: (d: MsgData): string =>
`⚠️ CE VAULT ALERT
━━━━━━━━━━━━━━
⚠️ OCR อ่านสลิปผิดพลาดบ่อย

ช่วง 1 ชั่วโมงที่ผ่านมา
อัตราผิดพลาด  ${d.percent}% (เกิน 20%)

ตรวจสอบ OCR Service`,

} as const
