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
