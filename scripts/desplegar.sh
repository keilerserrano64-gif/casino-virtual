#!/usr/bin/env bash
# Compila TypeScript (frontend y backend) y deja el sitio listo para publicar.
set -euo pipefail
cd "$(dirname "$0")/.."
npx -y -p typescript tsc -p ts
(cd backend && npm install && npm run build)
echo "Listo. Sube index.html, html/, css/, js/, img/ al hosting y ejecuta: node backend/dist/server.js"
