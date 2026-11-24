# CE Vault — คู่มือการ Deploy บน Replit และ Render (Deployment Guide)

โปรเจกต์นี้รองรับการทำงานแบบ **Zero-Config Single-Port** (เสิร์ฟทั้งหน้าเว็บ + Backend API + ระบบแจ้งเตือน Telegram Bot ในพอร์ตเดียว) พร้อมหน้าตั้งค่า **⚙️ ตั้งค่า API & บอท (Settings)** ในแอปโดยตรง

---

## 1. Deploy บน Render (แนะนำ · 1-Click Blueprint)

ไฟล์ [render.yaml](./render.yaml) ตั้งค่าพร้อมแล้ว (Region: Singapore · Node 22 · Health Check `/api/healthz`):

1. เข้า [Render Dashboard](https://dashboard.render.com/) → **New +** → **Blueprint**
2. เลือก Repository `callmeboss721-ops/Cevaultreplit` (หรือ `CE-Vault-2026`)
3. ใส่ Environment Variables เพิ่มเติม (ไม่บังคับ — สามารถไปกรอกในหน้า Settings ของเว็บทีหลังได้):
   - `BOT_TOKEN`: โทเคนบอทจาก `@BotFather`
   - `OPS_CHAT_ID`: รหัสกลุ่มหรือแชทเป้าหมาย (เช่น `-5532107732`)
4. กด **Apply** → รอ Build ประมาณ 1–2 นาที
5. ตรวจสอบ:
   - เปิดหน้าเว็บที่ URL ของ Render → เห็นหน้า **CE VAULT Operator Command Desk**
   - เปิด `/api/healthz` → ได้ `200 OK`

---

## 2. Deploy บน Replit

1. Import Repository `callmeboss721-ops/Cevaultreplit` เข้า Replit
2. (ไม่บังคับ) ไปที่ **Tools → Secrets** แล้วใส่ `BOT_TOKEN` และ `OPS_CHAT_ID` (ค่าความลับอื่นๆ เช่น `SESSION_SECRET`, `CE_VAULT_PII_ENCRYPTION_KEY` ระบบสร้างอัตโนมัติให้ทันที ไม่ต้องกรอกเอง)
3. กดปุ่ม **Run** (พัฒนา) หรือ **Deploy → Autoscale** (ใช้งานจริงตามไฟล์ `.replit`)

---

## 3. เชื่อมต่อเว็บสาธารณะ (GitHub Pages) เข้ากับ Backend ของคุณ

หากเปิดใช้งานผ่านหน้าเว็บสาธารณะ (`https://callmeboss721-ops.github.io/CE-Vault-2026/`) และต้องการซิงก์ข้อมูลกับ Backend บน Render / Replit:
1. ไปที่แท็บ **⚙️ ตั้งค่า API & บอท (Settings)**
2. ช่อง **เซิร์ฟเวอร์ API ภายนอก (Custom Backend API URL)** → วาง URL ของ Render หรือ Replit (เช่น `https://ce-vault-operator-desk.onrender.com`)
3. กด **💾 บันทึกค่า API & Spread (Save API Config)** แล้วกด **🩺 ทดสอบ API (/api/healthz)**
