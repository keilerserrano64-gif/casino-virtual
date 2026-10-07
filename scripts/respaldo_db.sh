#!/usr/bin/env bash
# Respaldo de PostgreSQL en respaldos/royal_casino_FECHA.sql.gz
set -euo pipefail
mkdir -p respaldos
docker exec casino_postgres pg_dump -U casino_admin royal_casino | gzip > "respaldos/royal_casino_$(date +%F_%H%M).sql.gz"
echo "Respaldo creado en respaldos/"
