// Todos los tests de motores, incluidos los que antes quedaban fuera de npm test.
const { readdirSync } = require('node:fs');
const { spawnSync } = require('node:child_process');
for (const file of readdirSync('tests').filter(f => f.endsWith('.test.js')).sort()) {
  const result = spawnSync(process.execPath, ['tests/' + file], { stdio: 'inherit', timeout: 180000 });
  if (result.error) console.error(result.error.message);
  if (result.status !== 0) process.exit(result.status || 1);
}
