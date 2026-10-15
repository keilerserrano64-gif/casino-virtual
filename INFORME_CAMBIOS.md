# Informe — ampliación de 278 nombres (ENTREGA PARCIAL)

Fecha de trabajo: 15 de octubre de 2026, UTC. Repositorio: `keilerserrano64-gif/casino-virtual`. Commit de origen: `018d2f4335b62fe6998e78157fd5f50de742adc3`, más las correcciones de la entrega anterior, preservadas.

## Resultado real y aceptación pendiente

**No se completó el encargo de incorporar los 278 juegos.** Los recursos de esta ejecución permitieron preservar la entrega anterior, registrar todos los nombres, realizar una investigación inicial y terminar cuatro mesas. No fue posible completar la investigación individual, contratos, motores y pruebas de los otros 274 nombres. No se presenta esta limitación de trabajo como imposibilidad técnica ni como prueba de inexistencia de esos títulos.

| Estado de las 278 entradas | Cantidad |
|---|---:|
| Implementadas y probadas localmente | 4 |
| Alias de títulos todavía pendientes | 2 |
| Pendientes de completar investigación/implementación | 272 |
| Alternativas originales activadas en sustitución de títulos no verificados | 0 |
| Bloqueadas por una imposibilidad técnica demostrada | 0 |
| Total trazable | 278 |

Las cuatro nuevas mesas son **American Roulette (#231), Dragon Tiger (#241), Sic Bo (#242) y Fan-Tan (#243)**. El producto contiene **25 juegos jugables: los 21 de la entrega anterior y estas cuatro mesas**. Torneos continúa como opción separada. Las 278 entradas son adicionales al inventario anterior y no equivalen a 278 tarjetas disponibles.

El comando `node scripts/check-catalog278.js --require-complete` falla deliberadamente con código 1 y enumera nombre por nombre lo pendiente: **4/278 funcionales y 274 no jugables**. El modo sin ese argumento comprueba trazabilidad; no acredita integración completa.

`REGLAS_REALES_TODOS_LOS_JUEGOS.md` contiene una sección por nombre, pero **274 secciones no constituyen contratos completos de implementación**. La mayoría conserva consultas y carencias; varias incluyen resúmenes parciales específicos. No se cumple aún la exigencia de 278 fichas listas. Tampoco se ha agotado la búsqueda necesaria para autorizar alternativas originales a los títulos no confirmados.

## Preservación

- No se recibió un ZIP original nuevo. Se partió de la entrega previa `work/casino-virtual`, sin modificarla, y se creó `work/casino-278`.
- Rama nueva de la copia: `audit/catalogo-278-20261015`. Se conserva `.git` y el historial; sin commit, push ni PR nuevos.
- Respaldo completo de la base previa: `respaldo-base-completa.tar.gz`, incluidos `.git` y dependencias. Se compararon 1289 archivos por SHA-256: todos coincidieron.
- SHA-256 del respaldo: `6d9e2bac2519e1695532cb43364cc54a8199c0104b575f03be2df47bc0865937`.
- El ZIP anterior pasó `unzip -t` y se conserva. La carpeta original del repositorio también permanece intacta.
- Inventarios y diff de referencia: `docs/auditoria-278/`. El informe anterior se conserva en `docs/INFORME_ENTREGA_PREVIA.md`.

Restauración sin sobrescribir carpetas:

```bash
sha256sum -c SHA256SUMS.txt
mkdir restauracion-base
tar -xzf respaldo-base-completa.tar.gz -C restauracion-base
```

El ZIP nuevo se llama `casino-278-avance-parcial.zip`. Contiene el proyecto y su historial Git, excluyendo dependencias instaladas, cachés y resultados temporales del navegador. **No es la entrega final de 278 juegos.**

## Investigación y decisiones de catálogo

Se guardaron metadatos de 791 URL consultadas: catálogos oficiales, sitemaps, páginas localizadas, búsquedas y algunos fallos HTTP/TLS. Este número **no significa 791 manuales verificados**. Se hicieron consultas automatizadas para los 278 nombres (277 búsquedas únicas porque Chilli Heat Megaways está repetido). Las coincidencias aproximadas permanecen identificadas como descubrimiento; no se han convertido automáticamente en identidad, reglas ni proveedores confirmados.

Fuentes principales del lote implementado:

- New Jersey Division of Gaming Enforcement, `N.J.A.C. 13:69F`: https://www.nj.gov/oag/ge/docs/Regulations/CHAPTER69F.pdf — ruleta, páginas PDF 223–232; Sic Bo, 297–302.
- Contraste de ruleta: https://wizardofodds.com/games/roulette/ (secundaria).
- Contraste de tabla Atlantic City: https://wizardofodds.com/games/sic-bo/ (secundaria).
- Dragon Tiger, página oficial: https://games.evolution.com/live-casino/dragon-tiger/ — dos cartas, empate 11:1 y del mismo palo 50:1.
- Reglas comparadas de Dragon Tiger: https://wizardofodds.com/games/dragon-tiger/ (secundaria; ocho barajas, As bajo y pérdida de mitad).
- Fan Tan, descripción oficial: https://games.evolution.com/live-casino/fan-tan/ — conteo y familias de apuesta.
- Fan Tan convencional: https://wizardofodds.com/games/fan-tan/ — comisión y tabla que el autor atribuye al folleto Venetian Macau. No se presenta como tabla de Evolution.

Las horas reales, URL, títulos, alcance de cada evidencia, SHA-256 de respuestas y errores están en las fichas y `docs/investigacion/consultas.json`. No se distribuyen páginas completas, manuales descargados, código ni recursos gráficos de proveedores.

Decisiones documentadas:

- #227 es alias de #30, Chilli Heat Megaways. El título canónico aún no está implementado.
- #180 es alias de #179: la página oficial https://nolimitcity.com/games/fire-in-the-hole utiliza también «Fire In The Hole xBomb». No se mezcla con las secuelas 2/3.
- Immortal Desire (#193) aparece en Hacksaw Gaming; se corrige la atribución a Nolimit City.
- Fire Joker Freeze (#197) sí tiene página oficial de Play’n GO.
- #134 tiene denominación oficial «Cat Wilde in the Eclipse of the Sun God».
- Otros posibles alias, incluidos Hand of Midas y Tome of Madness, permanecen pendientes. La similitud del nombre no basta para fusionarlos.
- La página oficial de Mega Ball dice tanto 200 como 400 cartones máximos. Se registra la contradicción; no se elige uno como regla comercial sin manual.

## Reglas y motores incorporados

| Mesa | Variante aplicada | Matemática local |
|---|---|---|
| American Roulette | 38 casillas, 0 y 00 distintos; apuestas clásicas incluyendo split, calle, cuadro, seisena, cesta, docenas y columnas. Sin devolución parcial al cero. | 36/38 de RTP, salvo cesta 35/38; pleno retorno 36×, cesta 7×. |
| Sic Bo | Tres dados, tabla Atlantic City. Small/Big excluyen triples; doble específico admite triple. Se ofrecen total, triple, doble, caras distintas y número individual. | Enumeración de 216 resultados por selección. RTP variable, no una cifra única. |
| Dragon Tiger | Ocho barajas; As bajo; comparación de dos cartas sin reemplazo. Empate devuelve media apuesta de Dragón/Tigre, empate paga 12× total y empate del mismo palo 51×. | Muestreo propio con barajado por ronda. Enumeración de los 416×415 pares físicos. |
| Fan-Tan | Fan, Nim, Kwok, Nga Tan y Sheh-Sam-Hong; comisión del 5 % sobre beneficio. | Muestreo propio uniforme de 40–79 fichas. RTP 96,25 %, 97,5 % o 98,75 % según apuesta. |

En el PDF de Sic Bo aparece «1 to 10» para una aparición individual. Se señala la discrepancia y se adopta explícitamente la tabla Atlantic City 1/2/3 a uno, contrastada con la fuente secundaria; no se afirma que esa transcripción haya sido corregida por el regulador.

Los límites 60–60.000 en múltiplos de 60 (120–60.000 en múltiplos de 120 para Fan-Tan) son propios. Una selección por ronda. Los pagos son retornos totales; el beneficio neto es retorno menos apuesta. En Fan-Tan los múltiplos de 120 permiten incluso el retorno 59/40 sin crear fracciones de moneda.

`js/table_engine.js` contiene cuatro evaluadores de reglas y configuraciones compatibles, sin DOM ni saldo. RNG criptográfico sin semilla de pruebas en producción, rechazo del sobrante para muestreo uniforme discreto. Los tests inyectan RNG determinista. No se afirma certificación, seguridad ante manipulación del cliente ni equivalencia de RNG comercial.

`docs/MATEMATICAS_MESAS.md` y `docs/investigacion/rtp-mesas.json` contienen 253 selecciones enumeradas, con crédito acumulado/apuesta acumulada. No se ajustó una escala para fabricar un RTP.

## Integración, identidad y saldo

- `GAME_INFO` de `js/app.js` añade las cuatro mesas. `GAMES`, `PAGE_GAME`, navegación, favoritos, estadísticas e historial existentes derivan del registro.
- El lobby añade enlaces a las páginas exactas. Los controles de sesión y administración se reutilizan sin editar `auth.js` ni permisos.
- El identificador canónico persistente de este proyecto es el **nombre estable**, por ejemplo `Sic Bo`, compartido por catálogo, habilitación e historial. `canonical_game_id` conserva ese patrón. `engine_config_id` es una clave interna separada (`sic-bo`), igual que el motor de slots usa `bonanza` para el nombre canónico `Sweet Bonanza`.
- `table_settlement.js` prepara una ronda inmutable y permite consumirla una sola vez. Rechaza rondas ajenas, cuenta/saldo cambiados, falta de acceso y desconexión detectada.
- La apuesta y el retorno se aplican como **un solo cambio neto** del saldo, antes de mostrar el resultado. No hay cobro pendiente de animación ni apuesta abierta al recargar. No se vuelve a acreditar tras un fallo de registro.
- Se reutilizan `RC.addCoins` y `RC.registerGameResult`; los premios de nivel/XP existentes son promociones adicionales y no parte del pago del motor.
- **No se modificaron Firebase, autenticación, hashes, backend, reglas de base de datos, esquema persistente ni sincronización en esta ampliación.** No se escribieron datos reales durante pruebas.
- La garantía de no duplicación es local. El transporte actual de Firebase no confirma commits ni hace transacción de saldo/historial. Un fallo remoto puede perder persistencia; las pestañas concurrentes y la manipulación del cliente no están resueltas. El bloqueo con `navigator.onLine`/`RCNube.ready()` no prueba que toda petición futura vaya a guardarse.

`html/catalogo278.html`, enlazado desde el lobby, expone exactamente 278 registros buscables. Solo las entradas implementadas y habilitadas ofrecen abrir el juego. Los pendientes no se anuncian como jugables.

## Archivos de la ampliación

- Núcleo de catálogo/lobby: `js/app.js`, `js/lobby.js`, `html/juegos.html`.
- Motores/UI nuevos: `js/table_engine.js`, `js/table_settlement.js`, `js/table.js`, `css/table.css`; páginas `american-roulette.html`, `sic-bo.html`, `dragon-tiger.html`, `fan-tan.html`.
- Registro visible: `html/catalogo278.html`, `js/catalog278.js`.
- Entradas e investigación: `data/nombres-solicitados-278.txt`, `data/solicitud-278.json`, `data/investigacion-278.json`, `data/reglas-verificadas.json`, `docs/investigacion/*`.
- Generación/auditoría: `scripts/build-rules-catalog.js`, `scripts/check-catalog278.js`, `scripts/audit-table-rtp.js`; ampliación de `scripts/audit-inventory.js` para reconocer mesas nuevas y configuraciones sin página.
- Tests nuevos: `tests/table_engine.test.js`, `tests/table_settlement.test.js`, `tests/catalog278.test.js`, `tests/e2e/catalog278.spec.ts`. Ajustes de cantidades en `tests/catalog.test.js` y `tests/e2e/games.spec.ts`.
- Documentación: los cuatro entregables requeridos, README y los anexos de matemática/auditoría. El manifiesto `docs/auditoria-278/archivos-ampliacion.json` distingue cambios de esta ampliación respecto de la entrega anterior.

El diff contra HEAD también contiene las correcciones heredadas. Se revisó adicionalmente el diff contra la copia previa para distinguirlas.

## Pruebas observadas

| Comando / cobertura | Resultado |
|---|---|
| `node tests/table_engine.test.js` | Pasó, exit 0: 534.990 resoluciones exhaustivas, reglas/pagos, RNG y entradas inválidas. |
| `node tests/table_settlement.test.js` | Pasó, exit 0: saldo, repetición, cambio de cuenta/saldo, desconexión y fallo de registro. |
| `node tests/catalog278.test.js` | Pasó, exit 0: 278 nombres, alias, IDs, reglas y rutas. |
| `node tests/catalog.test.js` | Pasó, exit 0: 25 juegos y Torneos separado, recursos/enlaces HTML locales con capitalización exacta. |
| `npm test` | Pasó, exit 0, 32,46 s. Incluye Bingo y todas las familias; no hubo timeout. |
| `npm run test:e2e` | Primer pase completo: 29 pasaron y 1 falló por la cantidad antigua de filas del historial. No se marca ese pase como aprobado. |
| `npx playwright test -g 'regresión de liquidación compartida'` | Tras corregir 22 → 26 filas y comprobar la lista completa: pasó, exit 0. |
| `npx playwright test tests/e2e/catalog278.spec.ts` | Pase final: 10 pasaron, exit 0, incluidas cuatro mesas, registro de 278, móvil, teclado y movimiento reducido. |
| Cobertura E2E vigente | 30 casos únicos aprobados entre el pase completo y las repeticiones focalizadas; sin fallos funcionales pendientes en esos casos. |
| `npm run test:unit` | Pase de la entrega previa reutilizado: 3 tests, incluidas 64.000 comparaciones cliente/backend. SHA-256 de todas sus entradas idénticos. |
| `npm run build:ts` | Pase previo reutilizado: TS, tipos, configuración y runtime idénticos; no se introdujo TypeScript nuevo. |
| `node scripts/audit-table-rtp.js` | Pasó, exit 0: 253 selecciones, enumeración exacta. |
| `node scripts/check-catalog278.js --require-complete` | **FALLÓ, exit 1: alcance de 278 no terminado.** |

Versiones comprobadas: Node 24.14.1, npm 11.11.0, TypeScript 5.9.3, Vitest 2.1.9, Playwright 1.64.1, Chromium1248. Fixtures sintéticos con red externa bloqueada; ninguna prueba accede a Firebase real. Logs y códigos de salida se incluyen en `docs/auditoria-278/pruebas/`.

Un recolector de manifiestos chocó con la eliminación temporal de `test-results` durante Playwright; se reparó para excluir directorios temporales antes de recorrerlos y se repitió la comprobación. No fue un resultado de test aprobado.

## Trabajo que queda

Completar las 274 fichas no listas; validar nombres/alias pendientes; obtener manuales/pagos exactos; seleccionar versiones y probabilidades explícitas; implementar cada motor real o alternativa original autorizada tras investigación suficiente; probar cada ruta y liquidación. La existencia de una página oficial o de una búsqueda registrada no sustituye ese trabajo. El ZIP entregado preserva el avance, **no certifica el cumplimiento del prompt maestro**.
