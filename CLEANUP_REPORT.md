# CE Vault — Repo Cleanup Report

## 1. Executive Summary

ตรวจ repo ทั้งหมด (284MB) แล้วหาว่าอะไรจำเป็นจริง โดย **grep ทุกโฟลเดอร์ที่สงสัยกับ source code ก่อนตัดสินใจ** ไม่ใช่ลบตามความรู้สึก

| | ก่อน | หลัง | ลดลง |
|---|------|------|------|
| Working tree (ไม่รวม .git) | 190 MB | **34 MB** | **82%** |
| ทั้ง repo (รวม .git) | 284 MB | ~59 MB** | ~79% |

\*\* หลังรัน `history-cleanup.sh` (.git 94MB → 25MB, ทดสอบกับสำเนาแล้ว) ถ้ายังไม่รัน = 128MB

**สิ่งที่ตัดออก แบ่งเป็น 2 ระดับความเสี่ยง:**
- **TIER 1 (ปลอดภัย 100%)** — build output ที่ `.gitignore` บอกไม่ให้ track อยู่แล้ว + โฟลเดอร์ backup ค้าง + chat-attachment dump ที่ไม่มีโค้ดอ้างอิงเลย
- **TIER 2 (แนะนำ)** — ภาพ screenshot/AI-exploration ที่ไม่มีโค้ดอ้างอิง แต่มีคุณค่าเชิง archive เล็กน้อย ให้ตัดสินใจเองว่าจะเก็บนอก repo หรือลบเลย

---

## 2. Step-by-Step

| # | ขั้นตอน | เวลา |
|---|---------|------|
| 1 | คัดลอก `cleanup.sh` ไปวางที่ root ของ repo จริง | 1 นาที |
| 2 | รัน `bash cleanup.sh --dry-run --all` ดูก่อนว่าจะลบอะไร | 2 นาที |
| 3 | รัน `bash cleanup.sh --all` (หรือไม่ใส่ `--all` ถ้าจะข้าม Tier 2) | 1 นาที |
| 4 | แทนที่ `.gitignore` เดิมด้วยไฟล์ที่แนบมา (กัน `attached_assets` กลับมา) | 2 นาที |
| 5 | `git status` ตรวจว่าไฟล์ที่ลบถูก unstage ถูกต้อง | 2 นาที |
| 6 | `git commit -m "chore: remove unreferenced dev artifacts"` | 1 นาที |
| 7 | push ขึ้น branch ตามปกติ | 1 นาที |

**รวม ~10 นาที**

---

## 3. Copy & Paste Files

ไฟล์แนบ 2 ไฟล์ — เอาไปวางที่ root ของ repo:

- `cleanup.sh` — สคริปต์ลบ (มี dry-run mode, ปลอดภัย)
- `.gitignore` — ฉบับอัปเดต (เพิ่ม `attached_assets/` และ `.migration-backup/` กันกลับมา)

---

## 4. รายละเอียดสิ่งที่ตัด (พร้อมเหตุผลที่ตรวจแล้ว)

### TIER 1 — ปลอดภัย 100%

| โฟลเดอร์ | ขนาด | คืออะไร | ทำไมตัดได้ |
|----------|------|---------|-----------|
| `attached_assets/` | **133 MB** | ไฟล์แนบจากตอนคุยกับ Replit AI assistant (screenshot, zip, วิดีโอ) 188 ไฟล์ | `grep -r "attached_assets" src/` = **0 matches** ทุกแพ็กเกจ |
| `.migration-backup/` | 5.6 MB | โฟลเดอร์ backup ค้างจากการ migrate ครั้งก่อน | ชื่อบอกตรงตัวว่าเป็น backup เก่า (แก้ไข: ตอนแรกรายงานว่าไม่ถูก track — ตรวจซ้ำแล้ว **ถูก commit ไว้จริง 31 commits** จึงต้องล้างจาก history ด้วย) |
| `tmp/` | 16 KB | มีแค่ README เปล่า 1 ไฟล์ | ไม่มีอะไรอื่น |
| `artifacts/ce-vault/dist/` | 5.1 MB | Build output | อยู่ใน `.gitignore` บรรทัด `dist` อยู่แล้ว — ไม่เคยควรถูก commit ตั้งแต่แรก |
| `artifacts/ce-vault/test-results/` | 1.4 MB | Playwright test output | อยู่ใน `.gitignore` (`**/test-results/`) อยู่แล้ว |
| `artifacts/ce-empire-command-system/dist/` | 1.6 MB | Build output | เหมือนข้างบน |
| `artifacts/ce-empire-design-system/dist/` | 3.4 MB | Build output | เหมือนข้างบน |

**รวม TIER 1: ~150 MB**

### TIER 2 — แนะนำ (ไม่มีโค้ดอ้างอิง แต่เป็นภาพ archive)

| โฟลเดอร์ | ขนาด | คืออะไร | หมายเหตุ |
|----------|------|---------|---------|
| `screenshots/` | 1.6 MB | ภาพ before/after ตอนพัฒนา 24 ไฟล์ | `grep` แล้ว 0 matches — ถ้าอยากเก็บดูย้อนหลัง ย้ายไป Google Drive/Notion แทนที่จะแบกไว้ใน repo |
| `docs/references/generated/` | 2.8 MB | ภาพ AI-generated exploration (robot direction studies) | ของทดลองตอนออกแบบ ไม่ใช่ asset ที่ใช้จริง |
| `docs/references/designce/` | 2.0 MB | ภาพ AI-generated exploration อีกชุด | เหมือนข้างบน |

**รวม TIER 2: ~7.8 MB**

---

## 5. สิ่งที่ตรวจแล้ว "ไม่ตัด" เพราะใช้งานจริง

| โฟลเดอร์ | เหตุผลที่เก็บไว้ |
|----------|-----------------|
| `docs/references/banks/*.png` | README บอกชัดว่าเป็น "provenance record" — แม้โลโก้จริงที่ใช้ใน UI จะ import จาก `src/assets/bankAssets.ts` แยกต่างหาก แต่การลบจะขัดกับสิ่งที่ README สัญญาไว้ |
| `docs/references/*.pdf` (brand kit) | เอกสารอ้างอิงจริง ไม่ใช่ของทดลอง |
| root `docs/` (64KB) | ถูกอ้างอิงตรงจาก `README.md` (API.md, SECURITY.md, DATABASE.md, DEPLOYMENT.md, TESTING.md) — ลบไม่ได้ |
| `artifacts/*/src/`, `artifacts/*/public/` | โค้ดและ asset ที่ใช้งานจริงทั้งหมด |

---

## 6. Common Mistakes

| ผิดพลาด | วิธีแก้ |
|---------|---------|
| รัน `cleanup.sh` แล้วงงว่าทำไมไซส์ repo (รวม `.git`) ไม่ลดตามที่คาด | ไฟล์ที่ลบยังอยู่ใน git history จนกว่าจะทำ history rewrite (ดูข้อ 9) — เช็คด้วย `du -sh --exclude=.git .` แทน |
| ลืมรัน `--dry-run` ก่อน | ควรรันดูก่อนเสมอ โดยเฉพาะถ้า repo มีการแก้ path เพิ่มเติมหลังจากรายงานนี้ |
| คิดว่า `--all` ลบ `.git` ด้วย | ไม่ — สคริปต์นี้แตะแค่ working tree เท่านั้น |
| ลบ `docs/references/banks/` เพิ่มเองเพราะดูเหมือนซ้ำกับ `src/assets/` | อย่า — README ผูก provenance ไว้กับโฟลเดอร์นี้ตรงๆ |

---

## 7. Final Checklist

```
□ วาง cleanup.sh ที่ root ของ repo จริง
□ รัน --dry-run ดูรายการก่อน
□ รันจริง (ตัดสินใจว่าจะใส่ --all หรือไม่)
□ แทนที่ .gitignore ด้วยฉบับที่แนบมา
□ git status ตรวจว่าไฟล์ถูก unstage ถูกต้อง (ไม่มีไฟล์ src/ หลุดไปด้วย)
□ commit + push
□ (ถ้าต้องการ) รัน pnpm build ตรวจว่า dist/ สร้างใหม่ได้ปกติ
□ พร้อมใช้งาน — repo เบาลง 82%
```

---

## 8. Next Recommended Action — git history

**อัปเดต:** เตรียม `history-cleanup.sh` ให้แล้ว (มี backup mirror อัตโนมัติ + ต้องพิมพ์ YES ยืนยัน) ทดสอบกับสำเนา: `.git` **94MB → 25MB**, commits 395 → ~340 (commit ที่แตะแต่ไฟล์ที่ลบจะหายไป) พบไฟล์ `ivy-wallet-main.zip` (10MB) ค้างใน history ด้วย จึงเพิ่มเข้ารายการลบ

**รายละเอียดเดิม:**

**ตัวเลขที่เหลือใหญ่ที่สุดตอนนี้คือ `.git/` — 94 MB (git history)**

ไฟล์ 133MB ใน `attached_assets/` เคยถูก commit ไว้จริง ดังนั้นแม้ลบออกจาก working tree แล้ว **ก้อนข้อมูลนั้นยังฝังอยู่ใน git history** ทุก commit เก่ายังอ้างถึงมันอยู่ — คนที่ clone repo ใหม่จะยังโหลด 94MB นั้นอยู่ดี

การล้างออกจริงต้องทำแยกเพราะเป็นการ **rewrite history** (destructive):
```bash
# ตัวอย่าง (ต้องติดตั้ง git-filter-repo ก่อน)
git filter-repo --path attached_assets --invert-paths
git filter-repo --path .migration-backup --invert-paths
```
แล้ว **force-push** และทุกคนที่ clone repo ไว้ต้อง **clone ใหม่** (ไม่ใช่แค่ pull) เพราะ commit hash ทั้งหมดจะเปลี่ยน

**ไม่ได้ทำขั้นตอนนี้ให้ในรอบนี้** เพราะเป็นการเปลี่ยนแปลงที่ย้อนกลับไม่ได้และกระทบทุกคนที่ทำงานร่วมกับ repo — ควรทำตอนที่แน่ใจว่าไม่มีใครกำลัง clone/PR ค้างอยู่ และแจ้งทีมล่วงหน้าให้ clone ใหม่หลังทำเสร็จ
