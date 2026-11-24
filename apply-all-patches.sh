#!/usr/bin/env bash
# CE-Vault — All-in-One Installer (Cleanup + Patch + Replit + 9 UI Components)
# วิธีใช้: รันจาก root ของ repo CE-Vault:
#   bash /home/antigravity/CE-Vault/apply-all-patches.sh /path/to/target-repo
set -euo pipefail

TARGET_DIR="${1:-$(pwd)}"
cd "$TARGET_DIR"

if [ ! -d .git ] || [ ! -f package.json ]; then
  echo "❌ ต้องรันในโฟลเดอร์ root ของ repo CE-Vault (ไม่พบ .git หรือ package.json ใน $TARGET_DIR)"
  exit 1
fi

echo "1️⃣ แตกไฟล์ CE-Vault-cleanup.zip, CE-Vault-patch.zip, CE-Vault-replit.zip ..."
unzip -o /home/antigravity/CE-Vault-cleanup.zip -d "$TARGET_DIR"
unzip -o /home/antigravity/CE-Vault-patch.zip -d "$TARGET_DIR"
unzip -o /home/antigravity/CE-Vault-replit.zip -d "$TARGET_DIR"

echo "2️⃣ ติดตั้ง 9 ไฟล์ UI Components & Message Templates ลง artifacts/ce-vault/ ..."
mkdir -p "$TARGET_DIR/artifacts/ce-vault/src/components/ui" "$TARGET_DIR/artifacts/ce-vault/src/constants"
cp -r /home/antigravity/CE-Vault/artifacts/ce-vault/src/components/ui/* "$TARGET_DIR/artifacts/ce-vault/src/components/ui/"
cp -r /home/antigravity/CE-Vault/artifacts/ce-vault/src/constants/* "$TARGET_DIR/artifacts/ce-vault/src/constants/"

echo "3️⃣ รัน cleanup.sh --all เพื่อล้างไฟล์ขยะ (attached_assets, .migration-backup, dist, test-results) ..."
bash "$TARGET_DIR/cleanup.sh" --all

echo "4️⃣ รัน install.sh เพื่อบันทึกและ commit patch ..."
bash "$TARGET_DIR/install.sh"

echo "✅ ติดตั้งครบทุกส่วนเรียบร้อย!"
