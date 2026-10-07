#!/usr/bin/env bash
# Levanta PostgreSQL, MongoDB y Redis y carga sus scripts iniciales.
set -euo pipefail
cd "$(dirname "$0")/../base_de_datos"
docker compose up -d
sleep 5
docker exec -i casino_mongo mongosh < 02_mongodb_init.js
docker exec -i casino_redis redis-cli < 03_redis_setup.redis
echo "Bases de datos listas."
