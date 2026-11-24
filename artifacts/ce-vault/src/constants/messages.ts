// src/constants/messages.ts
// CE VAULT — International Bilingual Bot Message Templates v1.1 (TH / EN)
// ใช้งาน (Usage): import { MSG } from '@/constants/messages'

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
`🔄 กำลังอ่านสลิป... (Scanning Slip...)
⏳ ระบบ OCR กำลังประมวลผล (Processing OCR)`,

  OCR_READY: (d: MsgData): string =>
`◈ CE · VERIFY (ตรวจสอบสลิปสำเร็จ)
━━━━━━━━━━━━━━
📥 ยอดรับ (Amount): ${d.thb} THB
💎 ยอดโอน (USDT): ${d.usdt} USDT
🏦 บัญชีรับ (Bank): ${d.bank} · ${d.account}
👤 ผู้โอน (Sender): ${d.name}
💱 เรท (Rate): ${d.rate}
─────────────
🟢 ความแม่นยำ (OCR): ${d.confidence}%
🟢 บัญชีตรง (Bank Match)
🟢 วงเงินปกติ (Limit OK)
─────────────
STATUS · สถานะ
🟡 พร้อมยืนยัน (READY TO CONFIRM)`,

  OCR_FAIL: (): string =>
`◈ CE · OCR ERROR (อ่านสลิปล้มเหลว)
━━━━━━━━━━━━━━
❌ อ่านสลิปไม่สำเร็จ (OCR Read Failed)

กรุณาถ่ายรูปใหม่ให้ชัดขึ้น (Please retake a clearer photo)
หรือกรอกข้อมูลด้วยตนเอง (Or enter details manually)`,

  OCR_LOW_CONFIDENCE: (d: MsgData): string =>
`◈ CE · REVIEW ⚠️ (รอตรวจสอบด้วยตนเอง)
━━━━━━━━━━━━━━
⚠️ ความแม่นยำ OCR ต่ำ (${d.confidence}% · Low Confidence)
กรุณาตรวจสอบข้อมูลก่อนยืนยัน (Verify Before Confirming)

📥 ยอดรับ (Amount): ${d.thb} THB ← ตรวจสอบ (Verify)
🏦 บัญชีรับ (Bank): ${d.bank} · ${d.account}
👤 ผู้โอน (Sender): ${d.name}
💱 เรท (Rate): ${d.rate}`,

  // ══ VERIFY CHECKS ═══════════════════════════════════
  BANK_MISMATCH: (d: MsgData): string =>
`◈ CE · MISMATCH ⚠️ (บัญชีไม่ตรงกับ PIN)
━━━━━━━━━━━━━━
📄 บัญชีในสลิป (Slip Account)
🏦 ${d.bank} · ${d.account}

📌 บัญชี PIN วันนี้ (Today's Pinned Account)
🏦 [PIN_BANK] · [PIN_ACCOUNT]

❌ บัญชีไม่ตรงกัน (Bank Account Mismatch)`,

  DUPLICATE: (d: MsgData): string =>
`◈ CE · DUPLICATE (ตรวจพบสลิปซ้ำ)
━━━━━━━━━━━━━━
⚠️ พบสลิปนี้ในระบบแล้ว (Duplicate Slip Detected)

💰 ยอดโอน (Amount): ${d.thb} THB
💎 ยอดเหรียญ (USDT): ${d.usdt} USDT
🆔 รหัสรายการ (Ref ID): ${d.id}
📅 เวลา (Time): ${d.time}

ไม่สร้างรายการใหม่ (No Duplicate Entry Created)`,

  LIMIT_EXCEEDED: (d: MsgData): string =>
`◈ CE · LIMIT ⚠️ (วงเงินเกินกำหนด)
━━━━━━━━━━━━━━
⚠️ วงเงินไม่เพียงพอ (Cycle Limit Exceeded)

รายการนี้ (This Slip): + ${d.thb} THB
ใช้ไปแล้ว (Used):       ${d.used} THB
วงเงินรอบนี้ (Limit):   ${d.limit} THB
ยอดเกิน (Over Limit):  ▼ [OVER] THB`,

  RATE_CHANGED: (d: MsgData): string =>
`◈ CE · RATE CHANGED ⚠️ (เรทเปลี่ยนระหว่างทำรายการ)
━━━━━━━━━━━━━━
⚠️ เรทเปลี่ยนระหว่างสแกน (Rate Updated During Scan)

เรทตอนสแกน (Previous Rate): [OLD_RATE]
เรทปัจจุบัน (Current Rate):   ${d.rate}
─────────────
USDT เดิม (Old USDT): [OLD_USDT]
USDT ใหม่ (New USDT): ${d.usdt}`,

  // ══ TRANSACTION STATUS ═══════════════════════════════
  TX_READY: (d: MsgData): string =>
`◈ CE · READY ✅ (ยืนยันพร้อมโอน)
━━━━━━━━━━━━━━
✅ ยืนยันรายการแล้ว (Transaction Confirmed)

🆔 รหัส (Ref ID): ${d.id}
📥 ยอดรับ (Received): ${d.thb} THB
💎 ต้องโอน (Expected): ${d.usdt} USDT
💱 เรท (Rate): ${d.rate} · ${d.bank}
🟡 สถานะ: พร้อมโอน (READY)

รอส่งเข้าคิวโอนเหรียญ (Awaiting USDT Queue)`,

  TX_PENDING: (d: MsgData): string =>
`◈ CE · PENDING ⏳ (อยู่ในคิวโอนเหรียญ)
━━━━━━━━━━━━━━
⏳ รายการอยู่ในคิวส่ง USDT (In Settlement Queue)

🆔 รหัส (Ref ID): ${d.id}
💎 ยอดรอโอน (Expected): ${d.usdt} USDT
🕐 เวลา (Time): ${d.time}
🟦 สถานะ: รอดำเนินการ (PENDING)`,

  TX_QUEUED: (d: MsgData): string =>
`◈ CE · QUEUED ⏳ (เข้าคิวรอโอน USDT)
━━━━━━━━━━━━━━
⏳ เข้าคิวรอส่ง USDT แล้ว (Queued for Settlement)

🆔 รหัส (Ref ID): ${d.id}
📥 ยอดรับ (Received): ${d.thb} THB
💎 ยอดต้องโอน (Expected): ${d.usdt} USDT
💱 เรท (Rate): ${d.rate}
🟦 สถานะ: รอโอน (PENDING)`,

  TX_SETTLED: (d: MsgData): string =>
`◈ CE · DONE ✓ (โอนเหรียญสำเร็จ)
━━━━━━━━━━━━━━
✅ โอน USDT ครบสมบูรณ์ (Settlement Completed)

📥 ยอดรับ (THB In):   ${d.thb} THB
📤 ยอดโอน (USDT Out): ${d.usdt} USDT
💱 เรท (Rate):        ${d.rate}
⏱️ เวลา (Time):       ${d.time}
🟢 สถานะ: สำเร็จ (SETTLED)
🆔 รหัส (Ref ID):     ${d.id}`,

  TX_SHORT: (d: MsgData): string =>
`◈ CE · SHORT 🔴 (ยอดส่งขาด)
━━━━━━━━━━━━━━
🔴 ส่ง USDT ไม่ครบตามจำนวน (Short Settlement)

🆔 รหัส (Ref ID):         ${d.id || '-'}
ยอดต้องส่ง (Expected):     ${d.usdt_expected} USDT
ส่งไปแล้ว (Sent Total):    ${d.usdt_sent} USDT
ยอดขาด (Shortfall):       ▼ ${d.usdt_short} USDT`,

  TX_SHORT_RECOVERY: (d: MsgData): string =>
`◈ CE · PENDING ⏳ (กำลังโอนเพิ่มยอดขาด)
━━━━━━━━━━━━━━
🔄 กลับเข้าคิวส่งเพิ่ม (Shortfall Recovery Queue)

🆔 รหัส (Ref ID): ${d.id}
ยอดค้าง (Shortfall): ▼ ${d.usdt_short} USDT
⏳ สถานะ: รอโอนส่วนต่าง (PENDING TOP-UP)`,

  TX_SHORT_SETTLED: (d: MsgData): string =>
`◈ CE · DONE ✓ (แก้ไขยอดขาดสำเร็จ)
━━━━━━━━━━━━━━
✅ โอนชดเชยครบแล้ว (Shortfall Resolved)

ยอดโอนรวม (Total Sent): ${d.usdt_expected} USDT ✓

🟢 สถานะ: สำเร็จ (SETTLED)
🆔 รหัส (Ref ID): ${d.id}`,

  TX_SHORT_RESOLVED: (d: MsgData): string =>
`◈ CE · DONE ✓ (ส่งเพิ่มครบจำนวนแล้ว)
━━━━━━━━━━━━━━
✅ ส่งเพิ่มครบจำนวนแล้ว (Short Resolved → Settled)

ยอดที่ต้องส่ง (Expected): ${d.usdt_expected} USDT
ยอดส่งรวม (Sent Total):  ${d.usdt_sent} USDT ✓

🟢 สถานะ: สำเร็จ (SETTLED)
🆔 รหัส (Ref ID): ${d.id}`,

  TX_OVERRUN: (d: MsgData): string =>
`◈ CE · OVERRUN ⛔ (ยอดส่งเกินกำหนด)
━━━━━━━━━━━━━━
⛔ ยอดส่งเกินจำนวนที่ต้องโอน! (Settlement Overrun Blocked)

🆔 รหัส (Ref ID):        ${d.id}
ยอดต้องส่ง (Expected):   ${d.usdt_expected} USDT
ยอดส่งรวม (Attempted):  ${d.usdt_sent} USDT ← เกิน! (Overrun)

ระบบบล็อกการบันทึกอัตโนมัติ (Transaction Blocked)`,

  TX_REJECTED: (d: MsgData): string =>
`◈ CE · REJECTED (ปฏิเสธรายการ)
━━━━━━━━━━━━━━
❌ ปฏิเสธรายการแล้ว (Transaction Rejected)

🆔 รหัส (Ref ID): ${d.id}
📥 ยอดโอน (Amount): ${d.thb} THB
📝 เหตุผล (Reason): ${d.reason}

🔴 สถานะ: ปฏิเสธ (REJECTED)`,

  TX_REVERSED: (d: MsgData): string =>
`◈ CE · REVERSED ↩️ (ยกเลิกย้อนกลับรายการ)
━━━━━━━━━━━━━━
↩️ ยกเลิกย้อนกลับรายการแล้ว (Transaction Reversed)

🆔 รหัส (Ref ID): ${d.id}
📥 ยอดรับ (Amount): ${d.thb} THB
💎 ยอดเหรียญ (USDT): ${d.usdt} USDT
👤 ผู้อนุมัติ (By): ${d.operator || 'ADMIN'}
📝 เหตุผล (Reason): ${d.reason}

🟤 สถานะ: ย้อนกลับรายการ (REVERSED)`,

  // ══ MISMATCH FLOW ════════════════════════════════════
  MISMATCH_STILL: (d: MsgData): string =>
`◈ CE · MISMATCH ⚠️ (ตรวจสอบซ้ำแล้วยังไม่ตรง)
━━━━━━━━━━━━━━
🔁 ตรวจสอบซ้ำแล้ว — บัญชียังไม่ตรง (Rechecked · Still Mismatched)

📄 บัญชีสลิป (Slip): ${d.bank} · ${d.account}
📌 บัญชีหลัก (PIN):  [PIN_BANK] · [PIN_ACCOUNT]

❌ บัญชีไม่ตรงกัน (Account Mismatch)`,

  MISMATCH_CLEARED: (d: MsgData): string =>
`◈ CE · VERIFY ✓ (ตรวจสอบซ้ำผ่านแล้ว)
━━━━━━━━━━━━━━
✅ บัญชีตรงกับ PIN ปัจจุบันแล้ว (Recheck Passed)

📥 ยอดรับ (Amount): ${d.thb} THB
💎 ยอดโอน (USDT):   ${d.usdt} USDT
🏦 บัญชีรับ (Bank):   ${d.bank} · ${d.account}
🟢 สถานะ: บัญชีตรง (BANK MATCH ✓)`,

  MISMATCH_OVERRIDDEN: (d: MsgData): string =>
`◈ CE · OVERRIDE ⚡ (อนุมัติกรณีพิเศษ)
━━━━━━━━━━━━━━
⚡ อนุมัติ Override บัญชีไม่ตรงสำเร็จ (Mismatch Override Approved)

🆔 รหัส (Ref ID): ${d.id}
👤 ผู้อนุมัติ (Operator): ${d.operator || 'OP-01'}
📝 เหตุผล (Reason): ${d.reason}

🟡 สถานะ: พร้อมโอน (READY TO SETTLE)`,

  OVERRIDE_SUCCESS: (d: MsgData): string =>
`◈ CE · OVERRIDE ⚡ (บันทึกการอนุมัติพิเศษ)
━━━━━━━━━━━━━━
⚡ บันทึก Override สำเร็จ (Override Logged)

📝 เหตุผล (Reason): ${d.reason}
👤 โดย (Operator):  ${d.operator}
🕐 เวลา (Time):     ${d.time}

📥 ยอดรับ (Amount): ${d.thb} THB
💎 ยอดโอน (USDT):   ${d.usdt} USDT
🟡 สถานะ: พร้อมโอน (READY)`,

  SETTLEMENT_OVERRUN: (d: MsgData): string =>
`◈ CE · OVERRUN ⛔ (แจ้งเตือนยอดเกิน)
━━━━━━━━━━━━━━
⛔ ยอดโอนรวมจะเกินกำหนด (Exceeds Expected USDT)

ยอดต้องส่ง (Expected):   ${d.usdt_expected} USDT
ส่งไปแล้ว (Sent Total):   ${d.usdt_sent} USDT
ยอดที่กรอก (Input):      + [INPUT] USDT ← เกิน! (Overrun)

ไม่สามารถบันทึกได้ (Action Blocked)`,

  // ══ CYCLE ════════════════════════════════════════════
  SUMMARY: (d: MsgData): string =>
`💎 CE VAULT · สรุปภาพรวม (Overview)
━━━━━━━━━━━━━━
🏠 รอบงาน (Cycle):       ${d.cycle_current}
💳 วงเงิน (Limit):        ฿${d.limit}
📊 ใช้ไปแล้ว (Used):       ฿${d.used}
🟢 คงเหลือ (Remaining):   ฿${d.remaining}
📥 ยอดรับรวม (Received):  ฿${d.used}
📤 โอนแล้ว (Sent):        $[SENT_USDT]
⏳ รอโอน (Pending):       $[PEND_USDT]
🔴 ยอดขาด (Shortfall):    -$[NEG_USDT]
✨ กำไร (Profit):         ฿[PROFIT]
💱 เรท (Desk Rate):       ${d.rate}
━━━━━━━━━━━━━━
[N] SETTLED · [N] READY · [N] PENDING · [N] SHORT`,

  CYCLE_SUMMARY: (d: MsgData): string =>
`💎 CE VAULT · สรุปรอบงาน (Cycle Summary)
━━━━━━━━━━━━━━
🏠 รอบงาน (Cycle):       ${d.cycle_current}
💳 วงเงิน (Limit):        ฿${d.limit}
📊 ใช้ไปแล้ว (Used):       ฿${d.used}
🟢 คงเหลือ (Remaining):   ฿${d.remaining}
📥 ยอดรับรวม (Received):  ฿${d.thb || d.used}
📤 โอนแล้ว (USDT Sent):   ${d.usdt} USDT
⏳ รอโอน (Pending):       ${d.usdt_expected} USDT
🔴 ยอดขาด (Shortfall):    -${d.usdt_short} USDT
✨ กำไรรอบนี้ (Profit):    ฿${d.profit || '0.00'}
💱 เรทโต๊ะ (Desk Rate):    ${d.rate}`,

  NEW_CYCLE_BLOCKED: (d: MsgData): string =>
`◈ CE · NEW CYCLE ⛔ (ไม่สามารถเปิดรอบใหม่ได้)
━━━━━━━━━━━━━━
❌ ยังเปิดรอบใหม่ไม่ได้ (New Cycle Blocked)

มีรายการค้างอยู่ (Open Items Remaining):
⏳ รอโอน (PENDING):  ${d.count_pending} รายการ (items)
🔴 ส่งขาด (SHORT):    ${d.count_short} รายการ (items)
🟡 รอยืนยัน (READY):  ${d.count_ready} รายการ (items)

กรุณาเคลียร์รายการข้างต้นก่อน (Resolve Pending Items First)`,

  NEW_CYCLE_SUCCESS: (d: MsgData): string =>
`◈ CE · NEW CYCLE ⚡ (เปิดรอบงานใหม่สำเร็จ)
━━━━━━━━━━━━━━
✅ เปิดรอบใหม่สำเร็จ (New Cycle Activated)

${d.cycle_current}  ✓ ปิดรอบแล้ว (CLOSED)
${d.cycle_new}  🆕 เปิดใช้งาน (OPEN)
━━━━━━━━━━━━━━
💳 วงเงินรอบใหม่ (Limit): ${d.limit} THB
📊 ยอดใช้สะสม (Used):    0 THB

รอบใหม่พร้อมใช้งาน (Ready for Operations)`,

  CYCLE_NEW_DONE: (d: MsgData): string =>
`◈ CE · NEW CYCLE ⚡ (สรุปการเปลี่ยนรอบงาน)
━━━━━━━━━━━━━━
✅ ปิดรอบ ${d.cycle_current} → เปิดรอบ ${d.cycle_new} (Cycle Rollover)

📥 ยอดรับรอบเก่า (Closed THB): ฿${d.thb}
📤 ส่ง USDT รวม (Total USDT):  ${d.usdt} USDT
⏳ ยกยอดค้าง (Carried Over):   ${d.count_pending ?? 0} รายการ (items)

🆕 รอบ ${d.cycle_new} พร้อมรับงาน (Active)`,

  // ══ ALERTS ════════════════════════════════════════════
  ALERT_SHORT_30M: (d: MsgData): string =>
`⚠️ CE VAULT ALERT (แจ้งเตือนยอดขาดค้าง)
━━━━━━━━━━━━━━
⚠️ รายการส่งขาดค้างเกินกำหนด (Shortfall Aging > 30m)

🆔 รหัส (Ref ID):    ${d.id}
💎 ยอดขาด (Short):   ▼ ${d.usdt_short} USDT
⏰ เวลาค้าง (Elapsed): ${d.minutes} นาที (mins)`,

  ALERT_SHORT_2H: (d: MsgData): string =>
`🚨 CE VAULT CRITICAL (แจ้งเตือนวิกฤตยอดขาด)
━━━━━━━━━━━━━━
🔴 รายการส่งขาดค้างนานมาก (Critical Shortfall > 2h)

🆔 รหัส (Ref ID):    ${d.id}
💎 ยอดขาด (Short):   ▼ ${d.usdt_short} USDT
⏰ เวลาค้าง (Elapsed): ${d.hours}

⛔ บล็อกการเปิดรอบใหม่ (New Cycle Blocked)
กรุณาดำเนินการด่วน! (Immediate Action Required)`,

  ALERT_PENDING_60M: (d: MsgData): string =>
`⚠️ CE VAULT ALERT (แจ้งเตือนคิวโอนค้างนาน)
━━━━━━━━━━━━━━
⚠️ รายการรอโอนค้างนาน (Pending Queue > 60m)

🆔 รหัส (Ref ID):    ${d.id}
💎 ยอดรอโอน (USDT):  ${d.usdt} USDT
⏰ เวลาค้าง (Elapsed): ${d.minutes} นาที (mins)`,

  ALERT_PENDING_STALE: (d: MsgData): string =>
`⚠️ CE VAULT ALERT (รายการรอโอนค้างในคิว)
━━━━━━━━━━━━━━
⚠️ รายการ PENDING ค้างนาน (Stale Pending Transaction)

🆔 รหัส (Ref ID):       ${d.id}
📥 ยอดรับ (Received):   ${d.thb} THB
💎 ค้างส่ง (Remaining):  ${d.usdt} USDT
⏰ เวลาค้าง (Waiting):  ${d.minutes} นาที (mins)`,

  ALERT_LIMIT_80: (d: MsgData): string =>
`⚠️ CE VAULT ALERT (แจ้งเตือนวงเงิน 80%)
━━━━━━━━━━━━━━
⚠️ ใช้วงเงินเกิน 80% แล้ว (80% Cycle Limit Reached)

${d.cycle_current} · ใช้ไป (Used): ${d.percent}%
ยอดใช้ (Used):       ${d.used} THB
วงเงิน (Limit):      ${d.limit} THB
คงเหลือ (Remaining): ${d.remaining} THB`,

  ALERT_LIMIT_95: (d: MsgData): string =>
`🚨 CE VAULT ALERT (แจ้งเตือนวงเงินใกล้เต็ม 95%)
━━━━━━━━━━━━━━
🔴 วงเงินใกล้เต็มแล้ว! (95% Critical Limit Warning)

${d.cycle_current} · ใช้ไป (Used): ${d.percent}%
ยอดใช้ (Used):       ${d.used} THB
วงเงิน (Limit):      ${d.limit} THB
คงเหลือ (Remaining): ${d.remaining} THB

กรุณาเตรียมสลับบัญชี PIN หรือเปิดรอบใหม่ (Prepare New PIN / Cycle)`,

  ALERT_EXCEPTION: (): string =>
`🚨 CE VAULT ALERT (พบรายการผิดปกติ)
━━━━━━━━━━━━━━
🔴 มีรายการ Exception ยังไม่แก้ไข (Unresolved Settlement Exception)

1 SETTLEMENT EXCEPTION OPEN
⛔ บล็อกการเปิดรอบใหม่ (New Cycle Blocked)

ต้องให้ผู้ดูแลระบบตรวจสอบก่อน (Admin Resolution Required)`,

  SYSTEM_ERROR: (): string =>
`◈ CE · ERROR ⚠️ (ระบบขัดข้องชั่วคราว)
━━━━━━━━━━━━━━
⚠️ ระบบขัดข้อง (System Error)

ไม่สามารถดำเนินการได้ (Operation Failed)
ไม่มีข้อมูลถูกเปลี่ยนแปลง (State Unchanged)

กรุณาลองใหม่อีกครั้ง (Please Retry)`,

  ALERT_OCR_FAIL_RATE: (d: MsgData): string =>
`⚠️ CE VAULT ALERT (อัตราอ่านสลิปพลาดสูง)
━━━━━━━━━━━━━━
⚠️ OCR อ่านสลิปผิดพลาดบ่อย (High OCR Failure Rate)

ช่วง 1 ชั่วโมงที่ผ่านมา (Last 1 Hour)
อัตราผิดพลาด (Fail Rate): ${d.percent}% (เกินเกณฑ์ 20% · Threshold > 20%)

กรุณาตรวจสอบระบบ OCR (Check OCR Service Health)`,

} as const
