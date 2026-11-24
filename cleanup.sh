#!/usr/bin/env bash
# CE-Vault — repo cleanup script
# รันจาก root ของ repo จริง (โฟลเดอร์ที่มี .git, package.json)
#
# ตรวจสอบให้ชัดเจนก่อนรัน: ทุกรายการด้านล่างถูกตรวจแล้วว่า
#   1) ไม่มีโค้ดใน src/ อ้างอิงถึง (grep แล้ว = 0 matches)
#   2) ระบุแหล่งที่มาชัดเจนว่าเป็นอะไร
#
# ใช้งาน:
#   bash cleanup.sh            → รันเฉพาะ TIER 1 (ปลอดภัย 100%)
#   bash cleanup.sh --all      → รัน TIER 1 + TIER 2 (แนะนำให้ลบ แต่ควรดูก่อน)
#   bash cleanup.sh --dry-run  → แสดงว่าจะลบอะไร ไม่ลบจริง

set -euo pipefail

if [ ! -f package.json ] || [ ! -d .git ]; then
  echo "❌ ต้องรันจาก root ของ repo (ไม่พบ package.json หรือ .git ในโฟลเดอร์นี้)"
  exit 1
fi

DRY_RUN=false
RUN_TIER2=false
for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=true ;;
    --all) RUN_TIER2=true ;;
  esac
done

remove() {
  local path="$1"
  local reason="$2"
  if [ -e "$path" ]; then
    local size
    size=$(du -sh "$path" 2>/dev/null | cut -f1)
    if [ "$DRY_RUN" = true ]; then
      echo "  [DRY-RUN] จะลบ: $path ($size) — $reason"
    else
      echo "  ลบ: $path ($size) — $reason"
      rm -rf "$path"
      # ถ้าไฟล์นี้ถูก track อยู่ใน git ให้ unstage ออกจาก index ด้วย
      # (--cached เพื่อไม่ลบไฟล์ซ้ำ เพราะ rm -rf ลบจริงไปแล้ว)
      git rm -r --cached "$path" >/dev/null 2>&1 || true
    fi
  fi
}

echo "═══════════════════════════════════════════════════"
echo " TIER 1 — ปลอดภัย 100% (ไม่มีที่ไหนอ้างอิงถึง)"
echo "═══════════════════════════════════════════════════"

remove "attached_assets" \
  "Replit chat-attachment dump (screenshots/zip/video จากตอนคุยกับ AI ช่วยเขียนโค้ด), 188 ไฟล์, ไม่มีโค้ดอ้างอิง"

remove ".migration-backup" \
  "โฟลเดอร์ backup ค้างจากการ migrate ครั้งก่อน ไม่ถูก track ใน git อยู่แล้ว"

remove "tmp" \
  "มีแค่ README เปล่าๆ ค้างอยู่"

remove "artifacts/ce-vault/dist" \
  "build output — อยู่ใน .gitignore แล้ว, pnpm build สร้างใหม่ได้เสมอ"

remove "artifacts/ce-vault/test-results" \
  "Playwright test output — อยู่ใน .gitignore แล้ว, pnpm test สร้างใหม่ได้เสมอ"

remove "artifacts/ce-empire-command-system/dist" \
  "build output — pnpm build สร้างใหม่ได้เสมอ"

remove "artifacts/ce-empire-design-system/dist" \
  "build output — pnpm build สร้างใหม่ได้เสมอ"

if [ "$RUN_TIER2" = true ]; then
  echo ""
  echo "═══════════════════════════════════════════════════"
  echo " TIER 2 — แนะนำให้ลบ (ไม่มีโค้ดอ้างอิง แต่มีคุณค่าเชิง archive)"
  echo "═══════════════════════════════════════════════════"

  remove "screenshots" \
    "ภาพ before/after ตอนพัฒนา, 24 ไฟล์, ไม่มีโค้ดอ้างอิง — ถ้าต้องการเก็บไว้ดูย้อนหลัง แนะนำย้ายออกไปเก็บนอก repo แทน"

  remove "artifacts/ce-empire-command-system/docs/references/generated" \
    "ภาพ AI-generated exploration (robot direction studies), ไม่มีโค้ดอ้างอิง"

  remove "artifacts/ce-empire-command-system/docs/references/designce" \
    "ภาพ AI-generated exploration อีกชุด, ไม่มีโค้ดอ้างอิง"
else
  echo ""
  echo "ℹ️  ข้าม TIER 2 (screenshots + AI exploration images ~7.8MB)"
  echo "   รันด้วย --all ถ้าต้องการลบด้วย"
fi

if [ "$DRY_RUN" = false ]; then
  echo ""
  echo "═══════════════════════════════════════════════════"
  echo " ขนาดหลังลบ (working tree, ไม่รวม .git):"
  du -sh --exclude=.git . 2>/dev/null
  echo ""
  echo " หมายเหตุ: .git/ (~94MB) ยังไม่ถูกแตะต้อง — ไฟล์ที่ลบไปแล้ว"
  echo " ยังอยู่ใน git history จนกว่าจะ commit + gc ดูข้อ 8 ในรายงาน"
  echo " ในรายงานสำหรับขั้นตอนล้าง history (ทำแยก ต้อง force-push)"
  echo "═══════════════════════════════════════════════════"
fi
