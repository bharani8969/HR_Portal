#!/bin/sh
# Container start: bring the database schema up to date, then start the API (which also serves the website).
set -e
export PRISMA_SCHEMA_DISABLE_ADVISORY_LOCK=1   # TiDB does not support the advisory lock Prisma Migrate uses
if [ -d prisma/migrations ] && [ -n "$(ls -A prisma/migrations 2>/dev/null)" ]; then
  echo "Applying committed migrations..."
  ./node_modules/.bin/prisma migrate deploy
else
  echo "No prisma/migrations folder: creating the schema with db push (first deployment)."
  ./node_modules/.bin/prisma db push --skip-generate
fi
exec node src/server.js
