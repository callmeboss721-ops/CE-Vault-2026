# CE Vault — ตั้งค่าบน Replit

## 1. ใส่ Secrets ก่อนกด Run
Replit → Tools → **Secrets** → เพิ่มค่าเหล่านี้ (ห้าม commit ลงไฟล์)

| ชื่อ | ใช้ทำอะไร |
|------|-----------|
| `DATABASE_URL` | Replit PostgreSQL (สร้างจาก Tools → Database) |
| `DASHBOARD_PIN` | PIN เข้า dashboard |
| `DASHBOARD_SESSION_SECRET` | สุ่มยาวๆ |
| `SESSION_SECRET` | สุ่มยาวๆ |
| `CE_VAULT_PII_ENCRYPTION_KEY` | สุ่ม 32 bytes (hex) |
| `CE_VAULT_ORIGIN` | URL ของ app บน Replit |
| `APP_URL` | URL ของ app บน Replit |
| `BOT_TOKEN` | Telegram bot token (ถ้าใช้) |
| `OPS_CHAT_ID` | Telegram chat id (ถ้าใช้) |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase URL (ถ้าใช้) |
| `SUPABASE_SECRET_KEY` | Supabase secret (ถ้าใช้) |

## 2. กด Run
กดปุ่ม **Run** → workflow `Project` จะรัน 2 artifact พร้อมกัน:
- `ce-vault-web` (หน้าเว็บ)
- `api-server` (API ที่ `/api`)

## 3. ตรวจผล
- เปิดหน้าเว็บที่ URL ของ Replit → ต้องเห็นหน้า CE Vault
- เปิด `/api/healthz` → ต้องได้ 200

## 4. ต้องทำเอง (ผมทำแทนไม่ได้)
- **Rotate** Supabase key และ Vercel token (`vcp_...`) ที่เคยอยู่ใน `.replit` เดิม เพราะถือว่าหลุดไปแล้ว
- ลบค่า Supabase URL ที่อยู่ใน `attached_assets/Pasted-1-Install-...txt`
