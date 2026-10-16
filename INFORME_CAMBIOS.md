# INFORME_CAMBIOS — Royal Casino

Fecha: 15 de octubre de 2026 (UTC). Base: `018d2f4335b62fe6998e78157fd5f50de742adc3`.

## Resultado y alcance real

Se implementaron correcciones y pruebas sobre una copia completa. **Starburst y Sweet Bonanza están integrados como variantes de demostración no oficiales**, con lobby, búsqueda, rutas exactas, controles existentes de acceso/habilitación, motor propio, apuesta, liquidación única local, saldo e historial probados. Gates y Book of Dead también se integraron después de comprobar su circuito de juego.

**No se cumple el inventario de 23 juegos esperado en el encargo:** el repositorio recibido tenía **17 registrados**, cuatro páginas/configuraciones de slots sin registrar y **ningún archivo de Gonzo’s Quest ni Book of Ra**. La entrega contiene 21 juegos realmente existentes, más Torneos como opción separada. No se fabricaron motores ni tarjetas para los dos ausentes. Por ello las pruebas de líneas/pagos/RTP de Gonzo’s Quest y la variante de Book of Ra quedan pendientes de recibir esos archivos.

## Preservación y restauración

- Original intacto: `repos/github.com/keilerserrano64-gif/casino-virtual`, rama inicial `coderabbit/audit-implement-casino-game-rules/b4fc0386`, Git limpio. No se recibió ZIP original.
- Copia completa: `work/casino-virtual`, rama nueva `audit/reglas-integracion-20261014`; conserva `.git` e historial. Cambios sin commit ni push.
- Respaldo completo, incluidas dependencias y `.git`: `casino-original-completo.tar.gz`; 1245 archivos comparados por SHA-256 contra el original, todos idénticos. Suma en `SHA256SUMS.txt` de la entrega.
- Inventario inicial y diff de referencia (vacío porque Git estaba limpio): `docs/auditoria/inventario-archivos-inicial.txt` y `referencia-inicial.diff`.
- Para restaurar sin sobrescribir nada: `mkdir restaurado` y `tar -xzf casino-original-completo.tar.gz -C restaurado`. El original sigue disponible; no hace falta resetearlo. Verificar primero la suma SHA-256 del archivo.
- El ZIP nuevo incluye código, documentación, pruebas e historial Git. Excluye `node_modules`, cachés, artefactos de Playwright y fuentes HTML externas descargadas para consulta. Instalar dependencias según README si se extrae en otro equipo.

## Decisiones y correcciones

| Familia | Implementación |
|---|---|
| Tragamonedas clásico | Valida enteros seguros y mínimo. Liquida antes de animar y evita repetir cobro del resultado. Tabla/linea central intactas. Enumeración exhaustiva cliente/backend y RTP exacto. |
| Ruleta | Nuevo motor puro con RNG inyectable en pruebas; rojo/negro corregidos, cero excluido de par e impar, pleno retorno 36×. Apuesta y resultado inmutables respecto a cambios durante animación. Interfaz simplificada explícita. |
| Blackjack | Evaluación y pagos extraídos a motor puro. S17 y reglas anteriores conservadas; validación de apuesta y protección de doble liquidación. La banca resuelve sus cartas y saldo sin esperar retrasos de animación. Naturales, empate, bust, ases, doble, split de ases, máximo de manos, fondos y corte verificados. |
| Poker | Evaluador puro de cinco/siete cartas. La simulación de la IA excluye cartas conocidas por rango/palo, independientemente de metadatos visuales. Showdown con guardia contra repetición. Variante heads-up simplificada explícita. |
| Craps | Saldo, estado e historial decididos antes de efectos; una recarga no permite cambiar esa tirada. Place ganadora conserva principal y registra beneficio incluso sin apuestas cerradas. Reglas Pass/Don't/Come, sumas, Odds, Field, Place y proposiciones verificadas. |
| Carreras | Motor conservado tras pasar pruebas de probabilidad, cuotas, límites y liquidación. Simulación propia de cuotas fijas, no pari-mutuel. |
| Bingo | Caché de líneas y bloques de aleatoriedad; construcción del cartón 90 acotada, sin reintento infinito. Se mantienen simulaciones/aserciones. Apuesta validada antes de comprar, cartón decidido antes del débito, marcado auto coherente y cierre protegido. Premio parcial inferior al coste se registra como pérdida neta. |
| Diez Crash | Big Bass 50 %; retiro parcial único; historial recuperado conserva lo ya cobrado. Auto se ejecuta aunque un fotograma salte el umbral y llegue al crash. Cobro en centésimas evita truncar 100×2,01 a 200. Space XY tiene dos apuestas independientes. JetX conserva una: no New Era. Distribución propia etiquetada por título. |
| Cuatro slots | RNG inyectable solo al llamar desde pruebas; producción sigue usando crypto. Bonificación completa decidida antes de débito, un crédito/historial por sesión. Tope 5000× para la sesión completa. Gates aplica acumulado con nuevo multiplicador ganador. Starburst separa promoción del motor. Dirección/líneas, cascadas, scatters, multiplicador y topes probados. |

### Cambios transversales imprescindibles

1. `GAME_INFO` mantiene los nombres canónicos existentes; `GAMES` y `PAGE_GAME` se derivan, excluyendo Torneos. `auth.js` consume ese mapa; no cambia login, contraseñas, roles ni permisos. Admin genera interruptores desde el mismo catálogo. Historial/estadísticas ya consumían nombres dinámicos; no necesitan aliases `bonanza`.
2. Los empates nuevos se guardan como `push` en el campo `result` existente y no incrementan derrotas. El historial tiene filtro/texto Empate. Es necesario para representar correctamente push de Blackjack/Poker/Craps y devolución de apuesta. No se migran datos previos, no se cambia saldo ni se otorgan premios adicionales. Prueba de regresión con todos los nombres del catálogo.
3. `npm test` ahora ejecuta todos los tests de motores; antes omitía `slots_engine.test.js` y no podía descubrir los nuevos.

No se modificaron archivos de Firebase, reglas de base de datos, SQL, hashes, backend, dependencias ni configuración de despliegue. No se enviaron peticiones a Firebase real durante las pruebas de navegador. No se agregaron recursos, imágenes, sonidos ni código de proveedores.

## Matemáticas

Las tablas/variantes y fuentes exactas por título están en [REGLAS_Y_FUENTES](docs/REGLAS_Y_FUENTES.md). No se recalibró ningún `scale`, peso ni pago para aparentar un RTP.

- Clásico: RTP **95,9640625 %**, enumeración exacta de 64.000 paradas; cliente y backend coinciden en todas. Tabla HTML comprobada por su test existente.
- Ruleta: RTP exacto **36/37 = 97,297297… %** para las modalidades implementadas.
- Crash: parámetro de ventaja 3 % propio, no RTP oficial. Retiro en 2,00 antes del crash, apuesta 100: ideal continuo ≈96,5174 %, antes de la diferencia discreta mínima del RNG. Fórmula y truncamientos documentados.
- Carreras: cálculo exacto de probabilidades top1/2/3 y cuotas propias verificado por suite existente.
- Bingo: 20.000 partidas por sala, sin bote; último pase individual observó 85,8 % (75) y 84,5 % (90). No son valores exactos/certificados; el bote y promociones alteran el retorno.
- Blackjack y Poker: RTP dependiente de estrategia, no calculado. Craps varía por apuesta; ver fracciones y tests, no un RTP único de mesa.

Simulación reproducible de **200.000 rondas completas por slot**, apuesta 100, incluyendo funciones, excluyendo promociones:

| Variante de casa | Estimación RTP | IC95 aproximado |
|---|---:|---:|
| Gates | 93,2244 % | 90,1752–96,2736 % |
| Sweet Bonanza | 95,0955 % | 93,0412–97,1499 % |
| Book of Dead | 96,1381 % | 91,9656–100,3107 % |
| Starburst | 96,1246 % | 94,2641–97,9850 % |

Son intervalos normales aproximados con error estándar muestral; los premios raros limitan la precisión y la aproximación no certifica colas ni RTP exacto. Script: `node scripts/audit-rtp.js 200000 resultado.json`. Semilla solo en el script de auditoría. No se observaron topes en esa muestra; el tope sí se fuerza en pruebas deterministas.

## Validación y salidas

Node v24.14.1, npm 11.11.0, TypeScript 5.9.3, Vitest 2.1.9, Playwright 1.64.1/Chromium 1248. No existe lockfile en el original; no se añadió uno ni se actualizaron dependencias.

| Comando | Resultado observado |
|---|---|
| Cada `tests/*.test.js` original individual | Ocho archivos pasaron; tiempos/exit en `docs/auditoria/baseline.json`. |
| `node tests/bingo_engine.test.js` inicial | 12 pruebas terminaron en 46,62 s, sin timeout. La reconstrucción repetida de líneas y llamadas criptográficas pequeñas explicaban el coste. |
| Bingo individual optimizado | 12 pruebas pasaron, sin reducir 20.000 partidas/sala ni relajar aserciones. |
| `npm test` | Pasó, exit 0, 31,71 s para todos los motores y nuevas regresiones; ver salida completa `suite-final.log`. |
| `npm run test:unit` | 3 pruebas, dos archivos, pasaron. Incluye enumeración cliente/backend. Resultado reutilizado: entradas relevantes sin cambios posteriores. |
| `npm run build:ts` | Pasó exit 0; `js/api.js` no cambió. Resultado reutilizado: TS/config/runtime idénticos. |
| `npm run test:e2e` | Último pase completo: 19 pasaron, 10,2 s. Después se validó el nuevo caso Bingo y se repitió el caso de error de slots afectado; **20 casos únicos con resultado vigente**, no se afirma una ejecución conjunta de 20. |
| `node tests/catalog.test.js` | Todos los href/src locales HTML existen con mayúsculas exactas; 17 originales conservados, cuatro slots, Torneos separado, configuración y controles presentes. |
| `node scripts/audit-rtp.js 200000 …` | 800.000 rondas completas; resultados y error estándar en `rtp-slots.json`. |
| `git diff --check` | Pasó en cada fase y al cierre. |
| Integridad ZIP y original | Se adjuntan verificaciones finales y SHA-256 junto al ZIP. |

Fallos encontrados y resueltos durante la validación: navegador Chromium ausente (instalado con Playwright); fixture de nube sin método `ready` (corregido, sin cambiar producción); una cola RNG de prueba desplazada (corregida); comprobación de enlace a reglas antes de crear la página (resuelto). Ningún timeout se cuenta como aprobado. Los tests originales no expiraron con el tiempo concedido. Los E2E bloquean todas las peticiones externas y simulan almacenamiento solo con datos ficticios: no validan un despliegue Firebase real.

## Matriz de integración

[La matriz completa](docs/MATRIZ_INTEGRACION.md) clasifica cada página/configuración recibida y distingue integración estructural de cobertura funcional. Los inventarios automáticos inicial/final se adjuntan como JSON. Starburst y Sweet Bonanza pasan descubrimiento, acceso permitido/denegado, deshabilitación, configuración, apuesta válida/inválida, saldo insuficiente, premios/pérdidas, recarga, historial y ausencia de duplicados.

## Limitaciones pendientes

- Gonzo’s Quest y Book of Ra: **ausentes**; no hay pruebas de 20 líneas/pagos/RTP de Gonzo ni una variante Book of Ra local verificada. Se necesitan los archivos de la revisión descrita en el encargo.
- Fidelidad a manuales: Starburst no publica todos los detalles de dirección/rodillos/límite en la página consultada; Book of Dead devolvió redirección 308; Sweet Bonanza presenta una contradicción 19/10 giros en su texto español. Se conservan/documentan variantes propias. Las fuentes de PokerStars y ruleta no fueron recuperables (redirección/406). No se hace pasar un resumen comercial por un manual completo.
- No se implementa New Era JetX, auto 50 % de Spaceman, autoplay de Space XY ni las opciones completas de Poker/ruleta que no ofrecía el proyecto.
- Liquidación local y recargas probadas; **no hay garantía transaccional de exactamente una vez ante fallos de escritura Firebase o dos pestañas concurrentes**. Perfil/historial/estado se guardan por separado en el diseño existente. No se reescribió esa infraestructura ni se migraron datos. Bingo/Blackjack/Poker no reanudan una partida interactiva abandonada antes de decidir su final; no se presenta esa recuperación como implementada.
- El RTP exacto de slots con funciones, Blackjack y Poker queda sin calcular; se entregan simulación/error o limitación explícita. No hay certificación.

## Archivos cambiados

- `README.md`
- `docs/MATRIZ_INTEGRACION.md`
- `docs/REGLAS_Y_FUENTES.md`
- `html/Blackjack.html`
- `html/admin/juegos.html`
- `html/aero.html`
- `html/aviator.html`
- `html/bigbasscrash.html`
- `html/bookofdead.html`
- `html/cashit.html`
- `html/cricketx.html`
- `html/gatesofolympus.html`
- `html/highstriker.html`
- `html/historial.html`
- `html/jetx.html`
- `html/poker.html`
- `html/reglas.html`
- `html/ruleta.html`
- `html/spaceman.html`
- `html/spacexy.html`
- `html/starburst.html`
- `html/sweetbonanza.html`
- `html/zeppelin.html`
- `js/Blackjack.js`
- `js/admin.js`
- `js/app.js`
- `js/auth.js`
- `js/bingo.js`
- `js/bingo_engine.js`
- `js/blackjack_engine.js`
- `js/crash.js`
- `js/crash_engine.js`
- `js/dados.js`
- `js/historial.js`
- `js/lobby.js`
- `js/poker.js`
- `js/poker_engine.js`
- `js/ruleta.js`
- `js/ruleta_engine.js`
- `js/slots.js`
- `js/slots_engine.js`
- `js/tragamonedas.js`
- `package.json`
- `scripts/audit-inventory.js`
- `scripts/audit-rtp.js`
- `scripts/test-games.js`
- `tests/cards_engine.test.js`
- `tests/catalog.test.js`
- `tests/craps_engine.test.js`
- `tests/crash_engine.test.js`
- `tests/crash_settlement.test.js`
- `tests/e2e/fixtures.ts`
- `tests/e2e/games.spec.ts`
- `tests/e2e/inicio.spec.ts`
- `tests/ruleta_engine.test.js`
- `tests/slots_rules.test.js`
- `tests/unit/slots-parity.test.ts`

Además, `docs/auditoria/` contiene inventarios, resultados numéricos y salidas de prueba. El ZIP mantiene el resto del código original sin reformatear.
