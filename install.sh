#!/usr/bin/env bash
# CE-Vault — ติดตั้ง patch ทีเดียว (brand fix + Vercel API proxy)
# วิธีใช้: แตกไฟล์ zip นี้ทับ root ของ repo CE-Vault แล้วรัน:
#   bash install.sh

set -euo pipefail

if [ ! -d .git ] || [ ! -f package.json ]; then
  echo "❌ ต้องรันจาก root ของ repo CE-Vault (ไม่พบ .git หรือ package.json)"
  exit 1
fi

for f in "api/[...path].ts" "vercel.json" ".env.example" "DEPLOY_VERCEL.md" "artifacts/ce-vault/src/index.css"; do
  [ -f "$f" ] || { echo "❌ ไม่พบไฟล์ $f — แตก zip ทับ repo ให้ครบก่อนรันสคริปต์นี้"; exit 1; }
done

echo "📦 เพิ่มไฟล์เข้า git (เฉพาะ 5 ไฟล์ของ patch นี้ ไม่แตะไฟล์อื่น)..."
git add "api/[...path].ts" vercel.json .env.example DEPLOY_VERCEL.md artifacts/ce-vault/src/index.css

if git diff --cached --quiet; then
  echo "ℹ️  ไม่มีอะไรเปลี่ยนแปลง (อาจติดตั้งไปแล้ว) — ข้าม commit"
else
  if ! git commit -q -m "fix: brand token drift + portable Vercel API proxy" 2>/tmp/_install_commit_err; then
    if grep -q "Please tell me who you are" /tmp/_install_commit_err; then
      echo "❌ Git ยังไม่รู้จักตัวตนคุณในเครื่องนี้ — ตั้งก่อนแล้วรันสคริปต์นี้ใหม่:"
      echo ""
      echo "   git config --global user.email \"you@example.com\""
      echo "   git config --global user.name \"Your Name\""
      echo ""
      rm -f /tmp/_install_commit_err
      exit 1
    else
      cat /tmp/_install_commit_err
      rm -f /tmp/_install_commit_err
      exit 1
    fi
  fi
  rm -f /tmp/_install_commit_err
  echo "✅ Commit แล้ว: $(git log -1 --oneline)"
fi

BRANCH=$(git branch --show-current)
REMOTE=$(git remote get-url origin 2>/dev/null || echo "(ไม่พบ remote origin)")

echo ""
echo "═══════════════════════════════════════════════════"
echo " เหลือขั้นตอนเดียว — push ด้วยมือคุณเอง (ต้องใช้ credentials ของคุณ):"
echo ""
echo "   git push origin $BRANCH"
echo ""
echo " Remote: $REMOTE"
echo " Branch: $BRANCH"
echo "═══════════════════════════════════════════════════"
