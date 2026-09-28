# Royal Casino

Casino virtual hecho con HTML, CSS y JavaScript. **Monedas 100% ficticias, sin dinero real.**

## Cómo usarlo
Abre `html/login.html` en el navegador (o usa la extensión Live Server de VS Code).

- Administrador de ejemplo: usuario `admin`, contraseña `admin123` (cámbiala en Configuración).
- Jugadores: créalos desde `html/registro.html`.

## Estructura
- `html/`  páginas (juegos, usuario, contenido) y `html/admin/` (panel de administración)
- `css/`   `base.css` (núcleo compartido), `juegos.css` y un CSS por página
- `js/`    `app.js` (cuentas, monedas, XP, logros, notificaciones), `auth.js` (sesión y rutas) y un JS por página

## Notas
Todo se guarda en `localStorage`; no hay servidor, así que no es seguridad real.

## Dados (Craps)
`html/dados.html` es una mesa de Craps completa: Pass / Don't Pass, Come / Don't Come, Field, Place 4-10,
cuotas (Odds) y proposiciones. Incluye dados 3D con física de rebote, disco ON/OFF, información de pago y
ventaja de la casa al pasar el cursor, historial y frecuencias, Repetir apuesta, Deshacer, Limpiar apuestas,
apuestas automáticas, modo Turbo, sonido ambiente y voz de stickman.
- `js/craps_engine.js`: reglas, pagos y RNG (`crypto.getRandomValues` con rechazo). Sin DOM; se puede probar en Node.
- El RNG no está certificado por laboratorios externos; el panel "Transparencia" ofrece una auditoría χ² local.

## Tragamonedas
`html/tragamonedas.html` es un tragamonedas de 3 carretes (línea central).
- `js/tragamonedas_engine.js`: reglas, pagos y RNG. Sin DOM; se puede probar en Node (`node tests/tragamonedas_engine.test.js`).
- **RNG**: `crypto.getRandomValues` con rechazo (sin sesgo de módulo); cada giro y cada carrete son independientes.
- **RTP teórico**: 95,96 % (ventaja de la casa 4,04 %), calculado de forma exacta recorriendo las 40³ combinaciones.
- **Volatilidad**: media (desviación típica ≈ 2,7 apuestas). Hay premio en el 57,6 % de los giros; 7️⃣ 7️⃣ 7️⃣ sale 1 de cada 2 370.
- **Tabla de pagos**: 7️⃣ ×100 · 💎 ×30 · ⭐ ×15 · 🍊 ×10 · 🍋 ×6 · 🍒 ×4 · dos iguales ×1. Los pesos de cada símbolo en la tira virtual están en `WEIGHTS`.
- El resultado se decide y se guarda antes de animar: si se cierra la página durante el giro, el premio se acredita al volver.
- `js/tragamonedas_fx.js`: capa visual y sonora (`SlotFX`). Solo anima y suena; nunca decide resultados. Incluye cabina con luces de marquesina, marcadores (saldo, apuesta, último premio), carretes que giran con desenfoque y frenan uno a uno, línea de pago que se ilumina, Big Win / Mega Win / Jackpot con lluvia de monedas, sonidos sintetizados (WebAudio) y botón de sonido.
- Controles: apuesta −/+ (escalones 10 · 20 · 50 · 100 · 200 · 500 · 1000 · 2000 · 5000 · 10000), **AUTO** (10 giros; se detiene con JACKPOT, sin saldo o al cambiar de pestaña).
- Los símbolos de arriba y abajo de la línea central son decorativos y nunca forman pares ni triples, para que no parezcan un premio.
- Respeta Configuración (sonido, animaciones) y `prefers-reduced-motion`.


## Carreras
`html/carreras.html` simula una carrera de 5 caballos con apuestas **Ganador**, **Plaza** (1.º o 2.º) y **Show** (top 3).
- `js/carreras_engine.js`: caballos con velocidad, resistencia y forma; condición del día (±15 %) sorteada en cada carrera; probabilidades exactas (modelo Plackett-Luce); cuotas = 92 % ÷ probabilidad, redondeadas hacia abajo (ventaja de la casa ≥ 8 %); RNG `crypto.getRandomValues` con rechazo. Sin DOM; se prueba con `node tests/carreras_engine.test.js`.
- El orden de llegada completo se decide y se guarda **antes** de animar (sin empates); si se cierra la página, el premio se acredita al volver. La animación solo muestra el resultado.
- La cuota se fija al pulsar «¡A CORRER!». Apuesta: entero ≥ 10 y ≤ saldo.
