# Royal Casino: reglas de esta demostración

Monedas ficticias, sin depósitos ni retiradas reales. Motores propios y símbolos emoji; demostraciones no oficiales, sin afiliación a los proveedores. Un nombre comercial identifica la inspiración, no una copia certificada. La aleatoriedad en cliente no protege contra manipulación del navegador. No se afirma certificación ni «provably fair».

## Revisión realmente recibida

Commit `018d2f4335b62fe6998e78157fd5f50de742adc3`: 17 juegos registrados, cuatro páginas/configuraciones de slots fuera del catálogo (Gates, Book of Dead, Starburst, Sweet Bonanza). No existen `gonzosquest.html`, `bookofra.html` ni configuraciones `gonzo`/`bora`. No se inventan esos motores ni se crean tarjetas que no se puedan jugar. Tras verificar los cuatro slots disponibles se registran 21 juegos reales, más la opción Torneos; **no son los 21 iniciales ni los 23 solicitados**.

Las claves existentes son nombres visibles (`Starburst`, `Sweet Bonanza`); se conservan como identificadores canónicos en catálogo, habilitación, estadísticas e historial. `starburst` y `bonanza` son claves internas del motor, nunca nombres alternativos en el historial. No se cambia el esquema de Firebase.

## Reglas por familia

| Juego | Variante aplicada y límites |
|---|---|
| Tragamonedas | Tres carretes independientes y línea central. Tabla propia: cereza 4×, limón 6×, naranja 10×, estrella 15×, diamante 30×, siete 100×; dos iguales 1×. Retornos totales. RTP exacto 95,9640625 %, 40³ combinaciones. Cliente/backend y tabla HTML comparados. No hay máximo adicional: triple siete 100×. |
| Ruleta | Europea de un cero, 0–36; color estándar; cero pierde rojo, negro, par e impar. Pleno devuelve 36× (35:1 neto), dinero parejo 2×. Simplificada: sin docenas, columnas, split, calle, esquina ni seisena. Selección, saldo e historial se fijan antes de animar. RTP 36/37 = 97,297297… % para las apuestas ofrecidas. |
| Blackjack | S17, ases 1/11, figuras 10, natural solo dos cartas no divididas, retorno 2,5×; por compatibilidad con monedas enteras se redondea al entero más cercano (media moneda hacia arriba). Push 1×, victoria 2×. Doble recibe una carta. Hasta cuatro manos, se pueden redividir pares excepto ases; ases divididos reciben una carta. Sin seguro ni rendición. Corte configurable y mezcla entre manos; si se agota, nueva baraja. RTP dependiente de estrategia, no calculado. |
| Poker | Hold’em heads-up de casa, ante y pagos adicionales simétricos; flop/turn/river y mejor cinco de siete, nueve rangos, kickers, rueda y empate (mitad del bote). No mesa No-Limit completa: sin ciegas, all-in, botes laterales ni acciones completas. La IA de apuestas recibe solo sus cartas y el tablero. No tiene acceso al saldo/reparto del motor desde su función de decisión. |
| Dados | Pass: 7/11 ganan, 2/3/12 pierden, los otros establecen punto. Don't Pass: 2/3 ganan, 12 push, 7/11 pierden; después opuesta a Pass. Come/Don't Come trasladan su punto. Odds Pass 2:1, 3:2, 6:5; Lay 1:2, 2:3, 5:6; Place 9:5, 7:5, 7:6. Field paga 1:1, salvo 2 (2:1) y 12 (3:1). Proposiciones en `PROP_PAY`. Place apagada en come-out: tras ganar permanece su principal en mesa y solo se acredita ganancia. Límites/retirada ligados a la mesa existente. Retornos fraccionarios truncados hacia abajo. |
| Carreras | Simulación propia de cinco caballos, cuotas fijas. Win primero, Place top dos, Show top tres. Probabilidades Plackett–Luce; cuotas derivadas del objetivo 92 %, redondeadas a una décima y acotadas por el motor. No pari-mutuel. Condiciones, orden y cuota se fijan antes de animar. |
| Bingo | 75: 5×5, rangos B/I/N/G/O, centro libre, línea = fila/columna/diagonal; bingo = cartón lleno. 90: 3×9, 15 números, cinco por fila, columnas ascendentes y 1–3 números por columna; línea = fila. Sin bolas repetidas. Premios de sala: 75 línea 0,5× / lleno 15× en hasta 66 bolas; 90 línea 0,5× / lleno 4,5× en hasta 78. Bote y promociones son propios, no universales. Se conserva la simulación de 20.000 partidas por sala; algoritmo acotado para cartones y caché de líneas. |

### Los diez Crash

Todos siguen siendo **variantes de casa**: distribución `floor(100 × 0,97/(1-u))/100`, truncada a [1,1000]. `k` afecta solo al tiempo. El parámetro 3 % no es el RTP oficial ni un retorno efectivo universal. Retirada estrictamente **antes** del crash, empate de multiplicador pierde. Para objetivo `m` de dos decimales, 1<m<1000, el RTP ideal continuo es `floor(apuesta*m)/apuesta * 0,97/(m+0,01)`; p. ej. con apuesta 100 y retiro 2,00, ≈96,5174 %. El límite 1000 es caída, no retiro ganador. El RNG discreto de 53 bits produce una diferencia despreciable frente a esa fórmula.

Cobro en centésimas de multiplicador y monedas enteras hacia abajo. Retiro parcial: `floor(apuesta/2)` se cobra una sola vez, el resto sigue en riesgo; con apuesta 101, 50 cobradas a 2× y 51 perdidas, el retorno es 100. El retiro automático se procesa según el tiempo lógico aunque no se hayan dibujado fotogramas intermedios. Al cerrar la página se pierde la parte aún en riesgo; se conserva el cobro previo en historial, sin volver a acreditarlo. No se promete que el auto siga activo con la página cerrada.

| Título | Implementación de esta versión |
|---|---|
| Aviator | Una apuesta, retiro manual/automático. Opciones/límites exactos del proveedor no confirmados en el contenido accesible. |
| Spaceman | Una apuesta, retiro completo manual/automático y 50 % manual. La fuente también describe auto 50 %; esa opción no está implementada. |
| JetX | Una apuesta y retiro automático, versión custom. **No New Era JetX**, cuyo sitio describe hasta cuatro apuestas. |
| Cricket X | Una apuesta, manual/automático; parámetros de distribución y velocidad propios. |
| Aero | Una apuesta, manual/automático y estadísticas visuales. Sin manual de versión verificado. |
| Zeppelin | Dos apuestas independientes de casa; no confirmado como límite oficial de una versión concreta. |
| Space XY | Dos apuestas independientes, manual/automático. BGaming confirma apuestas múltiples; el máximo de dos es de la casa. No se implementa la reproducción automática de rondas del proveedor. |
| Big Bass Crash | Una apuesta, manual/automático y retiro parcial 50 %, confirmado en la página oficial. Matemáticas propias. |
| Cash It / High Striker | Variantes propias; sin manual fiable de versión. High Striker dibuja una gráfica informativa. |

### Cuatro slots disponibles

Cuadrículas, pagos, pesos, factores `scale` y tope son los del proyecto; **no son una tabla oficial ni un RTP certificado**. No se reajustan factores para aparentar 96 %. El tope de 5000× se aplica a toda la ronda pagada con sus giros gratis, no a cada giro de la bonificación. Se calcula toda la secuencia antes de apostar/animar; un error al decidir no debita. Cada ronda completa tiene un débito, un crédito y una entrada en historial. Las bonificaciones antiguas pendientes se reanudan sin un segundo débito; su historial nuevo contiene solo el retorno restante.

- **Gates of Olympus:** 6×5, grupos de 8+, cascadas; cuatro scatters dan 15 giros gratis, tres durante la función añaden cinco. Multiplicadores hasta 500×; los ganadores se suman a la cuenta de la bonificación. El acumulado se aplica cuando hay un nuevo multiplicador en una caída ganadora, no se vuelve a aplicar indiscriminadamente en giros sin multiplicador. Scatter se paga aparte, sin multiplicarlo. Pesos y pagos escalados propios.
- **Sweet Bonanza:** 6×5, grupos de 8+, cascadas, cuatro scatters dan **10 giros gratis**; tres en bonificación añaden cinco; multiplicadores 2×–100× solo en función, sumados al final de las caídas del giro. No se arrastran a otros giros. La página española consultada contiene una contradicción: un párrafo dice 19 y el resumen 10; se conserva 10, compatible con el resumen y la variante previa, sin afirmar identidad con todo manual. Símbolos/pesos/pagos son propios.
- **Book of Dead:** 5×3, diez líneas izquierda a derecha; libro Wild/Scatter, tres libros activan diez giros, tres reactivan diez, símbolo especial seleccionado al activar. La expansión paga por cantidad de rodillos en cualquier posición. La variante heredada bloquea esos símbolos para las líneas normales durante función; **no se pudo validar la precedencia expansión/líneas contra manual oficial**, por lo que se mantiene identificada como regla de casa. No afirmar réplica oficial.
- **Starburst:** 5×3, diez líneas, ambos sentidos, cinco iguales paga una sola vez; Wild expansivo solo en rodillos 2–4, fijado durante respins, hasta tres respins por tres nuevas expansiones. La página oficial confirma expansión/respins y 5×3/10 líneas, pero no detalla dirección, rodillos permitidos ni máximo; estos detalles son de la variante de casa hasta disponer del manual. **Promoción Royal Casino**: diez giros de bienvenida con apuesta ficticia de 10; configuración en la capa de promociones, fuera del motor y excluida del RTP base.

## Ausentes, sin activar

- **Gonzo’s Quest:** NetEnt sí confirma 5×3, 20 líneas, avalanchas, multiplicador base hasta 5× y Free Falls hasta 15×, diez giros y scatters en rodillos 1–3. No hay implementación en esta revisión: no se puede corregir `lines:10`, recalibrar o probar un motor inexistente. Pendiente recibir los archivos de la versión indicada.
- **Book of Ra:** NOVOMATIC confirma **Magic** de cinco rodillos/diez líneas; eso no identifica automáticamente una variante Deluxe ni valida su tabla. No existe página/configuración local. No se crea una copia de Book of Dead como sustituto.

## Fuentes consultadas (2026-10-14/15 UTC)

Las páginas comerciales no sustituyen manuales de versión. No se han incorporado imágenes, sonidos, HTML ni recursos de los proveedores.

- https://www.pokerstars.com/es-419/poker/games/texas-holdem/ — redirigió a FanDuel; no usable como manual en esta consulta.
- https://www.pragmaticplay.com/es/games/gates-of-olympus/ — accesible, grupos/giros/multiplicadores.
- https://www.pragmaticplay.com/es/games/sweet-bonanza-slot/ — accesible, contradicción 19/10 anotada.
- https://www.pragmaticplay.com/es/games/spaceman/ — accesible, manual/automático/50 %.
- https://www.pragmaticplay.com/es/games/big-bass-crash/ — accesible, retiro parcial 50 %.
- https://www.spribe.co/games/aviator — accesible, no manual completo recuperable.
- https://www.smartsoftgaming.com/games/jetx — accesible, New Era con cuatro apuestas y auto cashout.
- https://www.smartsoftgaming.com/games/cricket-x — accesible, descripción de Crash; no distribución verificable.
- https://bgaming.com/es/games/space-xy — accesible, apuestas múltiples y autoplay.
- https://netent.com/games/starburst — accesible, cuadrícula/líneas y Wild/respins, faltan detalles citados.
- https://netent.com/games/gonzos-quest — accesible, reglas resumidas arriba.
- https://www.playngo.com/games/rich-wilde-and-the-book-of-dead — redirección HTTP 308 no resuelta por el cliente de consulta.
- https://www.novomatic.com/en/products/gaming/games/book-of-ra-magic — accesible, Magic diez líneas/cinco rodillos.
- https://www.casino.com/roulette/european/ — HTTP 406; no consultable desde el entorno. Reglas europeas ofrecidas verificadas por enumeración.

## Persistencia y alcance

No se alteran autenticación, hashes, permisos, reglas, estructura Firebase ni backend. Corrección transversal necesaria de resultados: las partidas nuevas con retorno igual a apuesta registran `push` (campo existente) y no incrementan derrotas; el filtro del historial muestra Empates. No se migran ni recalculan datos anteriores. El catálogo compartido se deriva para que el mismo control de acceso existente cubra los nuevos juegos. La liquidación de juego se adelanta a la animación para evitar pérdidas por cerrar la pestaña durante efectos. No hay transacciones atómicas distribuidas entre perfil, historial y estado de juego: ante fallo de escritura remota o dos pestañas concurrentes, el diseño existente no permite garantizar exactamente una vez en Firebase. Las pruebas aíslan la red y prueban acciones, recargas y saldo locales, no transacciones contra datos reales. Corregir esa limitación requiere una tarea transversal autorizada con backend/transacciones, no una migración silenciosa.
