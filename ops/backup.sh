#!/usr/bin/env bash
# Encrypted-at-rest backups are the storage layer's job (enable KMS/volume encryption). This makes a consistent DB dump.
set -euo pipefail
: "${DATABASE_URL:?}"; OUT="${1:-./backup-$(date +%Y%m%d-%H%M%S).sql.gz}"
read -r USER PASS HOST PORT DB < <(node -e 'const u=new URL(process.env.DATABASE_URL);console.log(u.username,decodeURIComponent(u.password),u.hostname,u.port||3306,u.pathname.slice(1))')
MYSQL_PWD="$PASS" mysqldump -h "$HOST" -P "$PORT" -u "$USER" --single-transaction --routines --no-tablespaces "$DB" | gzip > "$OUT"
echo "Backup written: $OUT"
