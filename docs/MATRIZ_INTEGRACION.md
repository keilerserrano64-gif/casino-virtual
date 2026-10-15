# Matriz de integración

Inventario automatizado de páginas/configuraciones: `node scripts/audit-inventory.js`. «Integrado» en el inventario automático acredita catálogo/ruta/configuración; la columna de pruebas precisa la verificación funcional. No confundir fidelidad oficial con integración técnica.

| Página | Configuración / ID canónico | Antes | Después | Evidencia / límite |
|---|---|---|---|---|
| `html/Blackjack.html` | `motor propio` / Blackjack | integrado | integrado | Reglas motor + E2E focalizado de saldo/liquidación; véanse casos en informe |
| `html/aero.html` | `aero` / Aero | integrado | integrado | Motor y rutas; no recorrido completo de interfaz en esta auditoría |
| `html/aviator.html` | `aviator` / Aviator | integrado | integrado | Motor y rutas; no recorrido completo de interfaz en esta auditoría |
| `html/bigbasscrash.html` | `bigbass` / Big Bass Crash | integrado | integrado | Motor y E2E de liquidación, parcial/auto o múltiples; distribución propia |
| `html/bingo.html` | `motor propio` / Bingo | integrado | integrado | Reglas motor + E2E focalizado de saldo/liquidación; véanse casos en informe |
| `html/bookofdead.html` | `bod` / Book of Dead | parcialmente integrado | integrado | E2E: lobby, ruta, auth, deshabilitación, motor propio, ganancia/pérdida, saldo, historial y recarga; variante de casa |
| `html/carreras.html` | `motor propio` / Carreras | integrado | integrado | Motor y rutas; no recorrido completo de interfaz en esta auditoría |
| `html/cashit.html` | `cashit` / Cash It | integrado | integrado | Motor y rutas; no recorrido completo de interfaz en esta auditoría |
| `html/cricketx.html` | `cricketx` / Cricket X | integrado | integrado | Motor y rutas; no recorrido completo de interfaz en esta auditoría |
| `html/dados.html` | `motor propio` / Dados | integrado | integrado | Reglas motor + E2E focalizado de saldo/liquidación; véanse casos en informe |
| `html/gatesofolympus.html` | `gates` / Gates of Olympus | parcialmente integrado | integrado | E2E: lobby, ruta, auth, deshabilitación, motor propio, ganancia/pérdida, saldo, historial y recarga; variante de casa |
| `html/highstriker.html` | `highstriker` / High Striker | integrado | integrado | Motor y rutas; no recorrido completo de interfaz en esta auditoría |
| `html/jetx.html` | `jetx` / JetX | integrado | integrado | Motor y rutas; no recorrido completo de interfaz en esta auditoría |
| `html/poker.html` | `motor propio` / Poker | integrado | integrado | Reglas motor + E2E focalizado de saldo/liquidación; véanse casos en informe |
| `html/ruleta.html` | `motor propio` / Ruleta | integrado | integrado | Reglas motor + E2E focalizado de saldo/liquidación; véanse casos en informe |
| `html/spaceman.html` | `spaceman` / Spaceman | integrado | integrado | Motor y rutas; no recorrido completo de interfaz en esta auditoría |
| `html/spacexy.html` | `spacexy` / Space XY | integrado | integrado | Motor y E2E de liquidación, parcial/auto o múltiples; distribución propia |
| `html/starburst.html` | `starburst` / Starburst | parcialmente integrado | integrado | E2E: lobby, ruta, auth, deshabilitación, motor propio, ganancia/pérdida, saldo, historial y recarga; variante de casa |
| `html/sweetbonanza.html` | `bonanza` / Sweet Bonanza | parcialmente integrado | integrado | E2E: lobby, ruta, auth, deshabilitación, motor propio, ganancia/pérdida, saldo, historial y recarga; variante de casa |
| `html/tragamonedas.html` | `motor propio` / Tragamonedas | integrado | integrado | Reglas motor + E2E focalizado de saldo/liquidación; véanse casos en informe |
| `html/zeppelin.html` | `zeppelin` / Zeppelin | integrado | integrado | Motor y rutas; no recorrido completo de interfaz en esta auditoría |

| Requerido ausente | Estado | Motivo |
|---|---|---|
| Gonzo’s Quest (`gonzo`) | sin integrar / ausente | No existe página ni motor; imposible probar 20 líneas o recalibrar lo no recibido. |
| Book of Ra (`bora`) | sin integrar / ausente | No existe página ni motor; versión exacta sin determinar. |

Torneos: `html/torneos.html`, opción separada, excluida de GAMES y de los 21 juegos finales. Otros juegos ocultos: ningún otro encontrado entre páginas y configuraciones presentes. Gates y Book of Dead se activaron después de verificar motor y circuito E2E como variantes propias; no se certifica fidelidad oficial.
