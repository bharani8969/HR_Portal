#!/usr/bin/env bash
# Restore drill: load a backup into a scratch DB and compare row counts. Run this regularly; an untested backup is not a backup.
set -euo pipefail
BACKUP="${1:?usage: restore-check.sh backup.sql.gz}"; : "${DATABASE_URL:?}"
read -r USER PASS HOST PORT DB < <(node -e 'const u=new URL(process.env.DATABASE_URL);console.log(u.username,decodeURIComponent(u.password),u.hostname,u.port||3306,u.pathname.slice(1))')
SCRATCH="${DB}_restore_check"; export MYSQL_PWD="$PASS"; M="mysql -h $HOST -P $PORT -u $USER"
$M -e "DROP DATABASE IF EXISTS \`$SCRATCH\`; CREATE DATABASE \`$SCRATCH\`;"
gunzip -c "$BACKUP" | $M "$SCRATCH"
for t in users employees employee_documents document_versions audit_logs; do
  a=$($M -N -e "SELECT COUNT(*) FROM \`$DB\`.$t"); b=$($M -N -e "SELECT COUNT(*) FROM \`$SCRATCH\`.$t")
  echo "$t live=$a restored=$b"; [ "$b" -le "$a" ] || { echo "MISMATCH in $t"; exit 1; }
done
$M -e "DROP DATABASE \`$SCRATCH\`"; echo "Restore check passed (also verify document objects exist in storage for a sample of versions)."
