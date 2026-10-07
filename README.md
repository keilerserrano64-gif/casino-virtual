# Royal Casino

Casino virtual hecho con HTML, CSS y JavaScript. **Monedas 100% ficticias, sin dinero real.**

## Cómo usarlo
Abre **`index.html`** (la portada, en la raíz del proyecto) en el navegador, o usa la extensión Live Server de VS Code.
Desde ahí se llega a todo: *Registrarse*, *Iniciar sesión* y el resto de páginas.

Las rutas se calculan solas desde la ubicación de `js/app.js`, así que el sitio funciona igual abriéndolo con doble clic
(`file://`), con un servidor local o publicado en cualquier carpeta de un hosting estático (GitHub Pages, Netlify, Vercel...).
Solo hay que subir la carpeta completa conservando `index.html`, `html/`, `css/` y `js/`.

- Administrador de ejemplo: usuario `admin`, contraseña `admin123` (cámbiala en Configuración).
- Jugadores: créalos desde `html/registro.html`.

## Estructura
- `index.html`  portada pública (raíz del proyecto)
- `html/`  páginas (juegos, usuario, contenido) y `html/admin/` (panel de administración)
- `css/`   `base.css` (núcleo compartido), `juegos.css` y un CSS por página
- `js/`    `app.js` (cuentas, monedas, XP, logros, notificaciones), `auth.js` (sesión y rutas) y un JS por página

## Cuentas e inicio de sesión (Firebase)
Registro, login, recuperar contraseña y cambio de contraseña/usuario en Configuración usan **Firebase Realtime Database** a través de `js/firebase_auth.js` (`window.RCRemote`).
- `usuarios/{usuario}` guarda `nombre, usuario, correo, salt, hash, saldo_billetera, rol, baneado, fecha_registro`; `correos/{correo}` es el índice para entrar o recuperar por correo.
- **La contraseña no se guarda en texto plano**: se guarda `salt` aleatorio + `hash = SHA-256(salt + ':' + contraseña)`. Al iniciar sesión se recalcula y se compara.
- Login: se valida primero contra Firebase y, al entrar, se crea/actualiza la copia local (`RC.loginRemote`) que usa el resto del sitio (monedas, historial...). Si la cuenta no existe en Firebase (el `admin` de ejemplo o cuentas antiguas creadas solo en el navegador) o no hay conexión, se usa la cuenta local; las cuentas antiguas se copian a Firebase la primera vez que entran.
- Pruebas: `node tests/firebase_auth.test.js` (usa una base de datos simulada, no necesita red).

## Notas
Las monedas, el historial y los ajustes se guardan en `localStorage`. Las contraseñas se validan en el navegador, así que no es seguridad real: para producción haría falta Firebase Authentication o un backend.

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

## Bingo
`html/bingo.html` — dos salas: **Bingo 75** (cartón 5x5, centro libre) y **Bingo 90** (cartón 3x9 con 15 números).
- `js/bingo_engine.js`: RNG, cartones, evaluación y premios. Sin DOM; se prueba en Node (`node tests/bingo_engine.test.js`).
- **RNG**: `crypto.getRandomValues` con rechazo (sin sesgo de módulo) y barajado Fisher-Yates. **No está certificado por iTech Labs ni GLI**; una certificación real requiere una auditoría externa del sistema en producción.
- **Cartones únicos**: hasta 6 por partida, sin duplicados entre sí. Cada cartón 90 cumple 5 números por fila y 1-3 por columna.
- **Marcado automático** (opción) y cómputo instantáneo: tras cada bola se evalúan todos los cartones y el sistema canta **Línea** (una vez por cartón) y **Bingo** (termina la partida) sin pulsar nada. El marcado manual sigue disponible.
- **Premios** (sobre el precio del cartón que gana): 75 bolas → línea ×0,5 · bingo ×15 (66 bolas). 90 bolas → línea ×0,5 · bingo ×4,5 (78 bolas). RTP simulado sin bote ≈ 86 % (75) y ≈ 82-85 % (90); con el 5 % de cada compra que alimenta el bote, ≈ 90 %.
- **Bote acumulado** por sala: bingo en ≤ 60 bolas (75) o ≤ 63 bolas (90). Se guarda en `localStorage` (por navegador) y vuelve a 1.000 al ganarse.
- **Bonos**: 3 cartones gratis de bienvenida y 1 cartón gratis cada 10 partidas de bingo (lealtad). No existe un sistema de depósitos en el proyecto, así que no hay bono por depósito.
- **Voz y sonidos**: voz del navegador (`speechSynthesis`) que canta las bolas y "Línea"/"Bingo", y tonos con WebAudio. Respeta Configuración → Sonido.
- **Chat de sala**: local, sin servidor (se comparte entre pestañas del mismo navegador). Moderación: bloquea insultos, enlaces, floods y limita la frecuencia. Incluye emojis, stickers y minijuegos rápidos (dado y moneda, sin monedas en juego).

## Firebase (nube)
`js/firebase.js` conecta el proyecto `royal-casino-7633d`. `localStorage` es la caché rápida y todo se refleja en Firebase:
- **Authentication** (correo + contraseña; se puede entrar con usuario o correo; recuperar envía un enlace por correo).
- `users/{uid}/store/*`: datos privados (monedas, historial, notificaciones, movimientos, ajustes).
- `players/{usuario}`: perfil público (ranking, amigos y solicitudes, presencia). Se escucha en vivo.
- `shared/news`, `shared/games_off`: noticias y juegos desactivados. `tickets/{id}`: soporte.
- `usernames/{usuario}`: reserva de usuario -> correo.

Pasos en la consola de Firebase (una sola vez):
1. Authentication -> Sign-in method -> activar **Correo electrónico/contraseña**.
2. Firestore Database -> crear base de datos -> pestaña Reglas -> pegar `firestore.rules` -> Publicar.
3. Authentication -> Settings -> Authorized domains: añade el dominio donde publiques.
4. **Administrador**: regístrate como jugador normal, copia tu UID (Authentication -> Users) y crea en Firestore el documento `admins/{ese UID}` (con cualquier campo). Cierra sesión y vuelve a entrar. El `admin/admin123` de ejemplo ya no funciona.

Abre el sitio por `http(s)://` (Live Server, Netlify...), no con doble clic: los módulos ES no cargan con `file://`.
No se sincroniza: ganadores en vivo (`rc_live_wins`), chat/bote del bingo y estado de juegos (siguen locales). Cambiar el nombre de usuario está desactivado.


## Lenguajes y carpetas nuevas
| Carpeta | Lenguaje | Para qué sirve |
|---|---|---|
| `backend/` | **TypeScript + Node.js** (Express, Socket.IO) | API que sortea los giros en el servidor y WebSockets para chat/ganadores en vivo. `cd backend && npm install && npm run dev` |
| `python/` | **Python** | `python python/simulador_rtp.py` verifica el RTP del tragamonedas |
| `scss/` | **SCSS** | Variables y mixins del tema; `npx sass scss/main.scss css/tema.css` |
| `graphql/` | **GraphQL** | Esquema para perfil, ranking, historial y estadísticas |
| `rust/` | **Rust → WebAssembly** | Cálculo rápido de RTP; `cd rust && wasm-pack build --target web` |
| `glsl/` | **GLSL** | Shader para efectos 3D de la ruleta (Three.js) |

Siguiente paso: conectar `backend/` con PostgreSQL (`base_de_datos/`) para guardar saldo y validar sesión.

## Integración con el backend
`js/api.js` (`RCApi`) llama a `POST /api/tragamonedas/girar` del backend; si no hay servidor usa el motor local sin esperar (y no reintenta durante 60 s), así el sitio sigue funcionando. El cliente recalcula el premio con `SlotEngine.evaluate`. Para usar el servidor: `cd backend && npm install && npm run dev` y, si lo publicas, define `window.RC_API_URL` antes de cargar `api.js`.

## Rendimiento
`css/rendimiento.css` (cargado en todas las páginas): las animaciones infinitas de opacidad/transform van en la GPU (`will-change`), las bombillas usan un brillo fijo y solo animan la opacidad, y el contenido fuera de pantalla no se pinta hasta que se ve. En `js/inicio.js` y `js/amigos.js` los refrescos se pausan con la pestaña oculta y no se reconstruye el DOM si el HTML no cambió. No se desactivó ningún efecto.

## Más lenguajes y herramientas
| Carpeta / archivo | Lenguaje | Para qué |
|---|---|---|
| `ts/api.ts` + `types/` | **TypeScript** (frontend) | `npm run build:ts` genera `js/api.js`. Pasa el resto de `js/` a TS poco a poco |
| `web-next/` | **React / Next.js** (TSX) | Cabecera y menú en un componente, SSR para SEO. `cd web-next && npm install && npm run dev` |
| `.github/workflows/ci.yml` | **YAML** (GitHub Actions) | Corre pruebas, compila TS y backend en cada push |
| `scripts/*.sh` | **Bash** | `levantar.sh` (bases de datos), `respaldo_db.sh`, `desplegar.sh` |
| `nginx/nginx.conf` | **Nginx** | HTTPS, gzip, caché y proxy a `/api` y `/socket.io` |
| `robots.txt`, `sitemap.xml`, JSON-LD en `index.html` | **SEO** | Cambia `TU-DOMINIO.com` por tu dominio real |
| `tests/unit`, `tests/e2e` | **Vitest + Playwright** | `npm run test:unit` y `npm run test:e2e` (tras `npm install`) |
