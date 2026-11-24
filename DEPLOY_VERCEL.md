# CE Vault — Brand Fix + Vercel Readiness

1. **Brand token drift** — `artifacts/ce-vault/src/index.css` ตรงกับ `tokens.json` แล้ว (cyan #3FE0FF, gold #D4AF37)
2. **Vercel API proxy** — `vercel.json` ไม่ hardcode Replit URL แล้ว ใช้ `api/[...path].ts` อ่าน `CE_API_BASE_URL`

## ติดตั้ง
```bash
bash install.sh                 # add + commit เฉพาะ 5 ไฟล์ของ patch
git push origin <branch>        # สคริปต์จะพิมพ์ชื่อ branch จริงให้
```
## Vercel
Settings → Environment Variables → `CE_API_BASE_URL` = URL backend จริง → Redeploy

## ระวัง
- ไม่ตั้ง `CE_API_BASE_URL` = fallback ไป Replit URL เดิมเงียบๆ (เช็ค Network tab)
- ตั้งค่าแล้วต้อง Redeploy เสมอ
