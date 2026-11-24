#!/usr/bin/env bash
# CE-Vault — git history purge (DESTRUCTIVE — rewrites every commit hash)
# รันหลัง cleanup.sh + commit แล้วเท่านั้น
# ทดสอบกับสำเนา repo แล้ว: .git 94MB → ~30MB, commits 395 → ~340
set -euo pipefail

PATHS=(attached_assets .migration-backup screenshots ivy-wallet-main.zip \
  artifacts/ce-empire-command-system/docs/references/generated \
  artifacts/ce-empire-command-system/docs/references/designce)

[ -d .git ] || { echo "❌ รันจาก root ของ repo"; exit 1; }
command -v git-filter-repo >/dev/null || { echo "❌ ติดตั้งก่อน: pip install git-filter-repo"; exit 1; }
[ -z "$(git status --porcelain)" ] || { echo "❌ มีไฟล์ยังไม่ commit — commit หรือ stash ก่อน"; exit 1; }

REMOTE_URL=$(git remote get-url origin 2>/dev/null || echo "")
echo "ขนาด .git ก่อน: $(du -sh .git | cut -f1)"
echo "จะลบออกจาก history ทุก commit:"; printf '  - %s\n' "${PATHS[@]}"
echo ""
echo "⚠️  เปลี่ยน commit hash ทั้งหมด • ต้อง force-push • ทุกคนต้อง clone ใหม่"
echo "   PR/branch ที่ค้างอยู่จะใช้ไม่ได้"
read -r -p "พิมพ์ YES เพื่อดำเนินการต่อ: " ok
[ "$ok" = "YES" ] || { echo "ยกเลิก"; exit 0; }

BK="../$(basename "$PWD")-backup-$(date +%Y%m%d-%H%M%S).git"
git clone --mirror . "$BK" -q && echo "✅ backup: $BK"

ARGS=(); for p in "${PATHS[@]}"; do ARGS+=(--path "$p"); done
git filter-repo --force --invert-paths "${ARGS[@]}"
git reflog expire --expire=now --all && git gc --prune=now --aggressive -q

[ -n "$REMOTE_URL" ] && git remote add origin "$REMOTE_URL"
echo "ขนาด .git หลัง: $(du -sh .git | cut -f1)"
echo ""
echo "ขั้นต่อไป:  git push origin --force --all && git push origin --force --tags"
echo "แล้วแจ้งทีมให้ clone ใหม่ (ไม่ใช่ pull)"
