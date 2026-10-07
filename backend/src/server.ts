// API REST + WebSockets del Royal Casino. Arrancar: npm install && npm run dev
import express from 'express';
import cors from 'cors';
import { createServer } from 'node:http';
import { Server } from 'socket.io';
import { spin } from './slots';

const app = express();
app.disable('x-powered-by');
app.use(cors({ origin: process.env.CORS_ORIGIN ?? '*' }));

// Límite simple por IP: 120 peticiones por minuto.
const visitas = new Map<string, { n: number; hasta: number }>();
app.use((req, res, next) => {
  const ahora = Date.now();
  const v = visitas.get(req.ip ?? '');
  if (!v || v.hasta < ahora) visitas.set(req.ip ?? '', { n: 1, hasta: ahora + 60_000 });
  else if (++v.n > 120) return res.status(429).json({ error: 'Demasiadas peticiones' });
  next();
});
app.use(express.json());

app.get('/api/salud', (_req, res) => res.json({ ok: true }));

// El servidor sortea el giro. Sin base de datos: no guarda saldo ni sesiones.
app.post('/api/tragamonedas/girar', (req, res) => {
  try { res.json(spin(Number(req.body?.apuesta))); }
  catch (e) { res.status(400).json({ error: (e as Error).message }); }
});

const http = createServer(app);
const io = new Server(http, { cors: { origin: '*' } });

// Tiempo real: chat de sala y ganadores en vivo (hoy son locales en el navegador).
io.on('connection', socket => {
  socket.on('sala:unirse', (sala: string) => socket.join(String(sala)));
  socket.on('chat:mensaje', ({ sala, usuario, texto }) => {
    io.to(String(sala)).emit('chat:mensaje', { usuario, texto: String(texto).slice(0, 200), hora: Date.now() });
  });
});

const PORT = Number(process.env.PORT ?? 3000);
http.listen(PORT, () => console.log(`Royal Casino backend en http://localhost:${PORT}`));
