// dados.js — Craps completo (usa RC de app.js y CrapsEngine de craps_engine.js)

RC.initHeader();

(() => {
  const E = window.CrapsEngine;
  const $ = id => document.getElementById(id);
  const fmt = RC.formatNumber;
  const NUMS = E.NUMS;
  const WORD = { 2: 'dos', 3: 'tres', 4: 'cuatro', 5: 'cinco', 6: 'seis', 7: 'siete', 8: 'ocho', 9: 'nueve', 10: 'diez', 11: 'once', 12: 'doce' };
  const CHIPS = [10, 50, 100, 500, 1000];
  const chipClass = a => a >= 1000 ? 'c5' : a >= 500 ? 'c4' : a >= 100 ? 'c3' : a >= 50 ? 'c2' : 'c1';
  const soundAllowed = () => RC.getSettings().sound !== false;

  /* ================= Información de cada zona ================= */
  const oddsTxt = t => Object.entries(t).filter(([n]) => [4, 5, 6].includes(+n)).map(([n, r]) => `${n}/${{ 4: 10, 5: 9, 6: 8 }[n]} → ${r[0]} a ${r[1]}`).join(' · ');
  const INFO = {
    pass: { name: 'Línea de Pase (Pass Line)', pay: '1 a 1', edge: '1,41 %', desc: 'Solo en la salida. Ganas con 7 u 11; pierdes con 2, 3 o 12. Cualquier otro número es el punto: ganas si sale de nuevo antes que un 7.' },
    dp: { name: 'No Pase (Don\'t Pass)', pay: '1 a 1', edge: '1,36 %', desc: 'Lo contrario a la Pass Line. Ganas con 2 o 3, el 12 empata (push), pierdes con 7 u 11. Con punto, ganas si sale un 7 antes que el punto.' },
    come: { name: 'Come', pay: '1 a 1', edge: '1,41 %', desc: 'Solo con punto activo. Es una Pass Line nueva: 7/11 ganan, 2/3/12 pierden y otro número viaja a su casilla como punto propio.' },
    dcome: { name: 'No Come (Don\'t Come)', pay: '1 a 1', edge: '1,36 %', desc: 'Solo con punto activo. 2/3 ganan, 12 empata, 7/11 pierden; otro número viaja a su casilla y gana si sale el 7 antes.' },
    field: { name: 'Campo (Field)', pay: '1 a 1 · el 2 paga 2 a 1 · el 12 paga 3 a 1', edge: '2,78 %', desc: 'Apuesta de una tirada: ganas con 2, 3, 4, 9, 10, 11 o 12; pierdes con 5, 6, 7 u 8.' },
    passodds: { name: 'Cuotas de Pase (Pass Odds)', pay: oddsTxt(E.PASS_ODDS) + ' (cuota real)', edge: '0 %', desc: 'Apuesta extra detrás de la Pass Line con punto activo (máx. 3× tu apuesta base). Es la única apuesta sin ventaja para la casa.' },
    dpodds: { name: 'Cuotas de No Pase (Lay Odds)', pay: 'Paga la inversa: 4/10 → 1 a 2 · 5/9 → 2 a 3 · 6/8 → 5 a 6', edge: '0 %', desc: 'Apuesta extra detrás de la Don\'t Pass con punto activo (máx. 3× tu apuesta base). Sin ventaja para la casa.' },
    any7: { name: 'Cualquier 7 (Any Seven)', pay: '4 a 1', edge: '16,67 %', desc: 'Una tirada: ganas si la suma es 7. La peor apuesta de la mesa.' },
    anycraps: { name: 'Cualquier Craps', pay: '7 a 1', edge: '11,11 %', desc: 'Una tirada: ganas si sale 2, 3 o 12.' },
    eleven: { name: 'Once (Yo-leven)', pay: '15 a 1', edge: '11,11 %', desc: 'Una tirada: ganas si la suma es 11.' },
    aces: { name: 'Ojos de serpiente (2)', pay: '30 a 1', edge: '13,89 %', desc: 'Una tirada: ganas si salen dos unos.' },
    twelve: { name: 'Cajas (12)', pay: '30 a 1', edge: '13,89 %', desc: 'Una tirada: ganas si salen dos seises.' },
    acedeuce: { name: 'As-Dos (3)', pay: '15 a 1', edge: '11,11 %', desc: 'Una tirada: ganas si la suma es 3.' },
  };
  const PLACE_INFO = { 4: ['9 a 5', '6,67 %'], 10: ['9 a 5', '6,67 %'], 5: ['7 a 5', '4,00 %'], 9: ['7 a 5', '4,00 %'], 6: ['7 a 6', '1,52 %'], 8: ['7 a 6', '1,52 %'] };
  const infoFor = (type, num) => {
    if (type === 'place') return { name: `Place ${num}`, pay: PLACE_INFO[num][0], edge: PLACE_INFO[num][1], desc: `Ganas si sale el ${num} antes que un 7. Solo funciona con punto activo (apagada en la salida) y se queda en mesa tras ganar.` };
    return INFO[type];
  };
  const LABEL = { pass: 'Pass Line', dp: 'Don\'t Pass', come: 'Come', dcome: 'Don\'t Come', field: 'Field', passodds: 'Pass Odds', dpodds: 'Lay Odds', any7: 'Any 7', anycraps: 'Any Craps', eleven: 'Once', aces: 'Ojos de serpiente', twelve: 'Cajas', acedeuce: 'As-Dos', comeN: 'Come', dcomeN: 'Don\'t Come', place: 'Place' };
  const lbl = (t, n) => LABEL[t] + (n ? ' ' + n : '');

  /* ================= Estado persistente ================= */
  const KEY = 'rc_craps_' + String(RC.currentUser() || 'guest').toLowerCase();
  const def = () => ({ bets: [], point: null, history: [], counts: {}, rolls: 0, last: [], auto: false, autoTpl: null, prefs: { turbo: false, ambient: soundAllowed(), voice: soundAllowed() }, chip: 100 });
  let S;
  try { S = { ...def(), ...(JSON.parse(RCMem.getItem(KEY)) || {}) }; S.prefs = { ...def().prefs, ...S.prefs }; } catch (e) { S = def(); }
  if (!Array.isArray(S.bets)) S.bets = [];
  const save = () => { try { RCMem.setItem(KEY, JSON.stringify(S)); } catch (e) { /* sin almacenamiento */ } };

  let rolling = false;
  let undoStack = [];

  /* ================= Sonido ================= */
  const Snd = (() => {
    let ctx = null, master = null, ambNodes = null, swellTimer = null, noiseBuf = null;
    const ensure = () => {
      if (!ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return false;
        ctx = new AC(); master = ctx.createGain(); master.gain.value = 0.9; master.connect(ctx.destination);
        noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
        const d = noiseBuf.getChannelData(0); let last = 0;
        for (let i = 0; i < d.length; i++) { const w = Math.random() * 2 - 1; last = (last + 0.04 * w) / 1.04; d[i] = last * 6; } // ruido rosado/marrón
      }
      if (ctx.state === 'suspended') ctx.resume();
      return true;
    };
    const burst = (freq, q, dur, vol, type = 'bandpass') => {
      if (!soundAllowed() || !ensure()) return;
      const src = ctx.createBufferSource(); src.buffer = noiseBuf; src.playbackRate.value = 0.8 + Math.random() * 0.6;
      const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
      const g = ctx.createGain(); const t = ctx.currentTime;
      g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
      src.connect(f); f.connect(g); g.connect(master); src.start(t, Math.random()); src.stop(t + dur + 0.05);
    };
    const tone = (freq, dur, vol, type = 'triangle', delay = 0) => {
      if (!soundAllowed() || !ensure()) return;
      const o = ctx.createOscillator(); o.type = type; o.frequency.value = freq;
      const g = ctx.createGain(); const t = ctx.currentTime + delay;
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.05);
    };
    const clamp = v => Math.max(0.05, Math.min(1, v));
    return {
      unlock() { if (soundAllowed()) ensure(); },
      dieHit(power) { const p = clamp(power); burst(1800 + Math.random() * 900, 1.2, 0.07, 0.5 * p); tone(900 + Math.random() * 300, 0.04, 0.12 * p, 'square'); },
      wallHit(power) { const p = clamp(power); burst(420, 0.8, 0.13, 0.9 * p); burst(2200, 1.5, 0.05, 0.3 * p); },
      chip() { tone(2400, 0.06, 0.16); tone(3100, 0.05, 0.12, 'triangle', 0.035); },
      shake() { for (let i = 0; i < 5; i++) setTimeout(() => burst(2600, 2, 0.05, 0.25), i * 55); },
      win() { [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.25, 0.14, 'triangle', i * 0.09)); },
      lose() { [330, 262, 196].forEach((f, i) => tone(f, 0.3, 0.14, 'sawtooth', i * 0.12)); },
      cheer() { burst(900, 0.5, 1.4, 0.35); burst(1500, 0.6, 1.0, 0.2); },
      ambient(on) {
        if (!on) {
          if (ambNodes) { const t = ctx.currentTime; ambNodes.gain.gain.linearRampToValueAtTime(0.0001, t + 0.6); const n = ambNodes; setTimeout(() => { try { n.src.stop(); n.lfo.stop(); } catch (e) { } }, 700); ambNodes = null; }
          clearInterval(swellTimer); swellTimer = null; return;
        }
        if (!soundAllowed() || !ensure() || ambNodes) return;
        const src = ctx.createBufferSource(); src.buffer = noiseBuf; src.loop = true;
        const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 520; bp.Q.value = 0.45;
        const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1700;
        const gain = ctx.createGain(); gain.gain.value = 0.0001;
        const lfo = ctx.createOscillator(); lfo.frequency.value = 0.17;
        const lfoAmt = ctx.createGain(); lfoAmt.gain.value = 0.02;   // murmullo que sube y baja
        lfo.connect(lfoAmt); lfoAmt.connect(gain.gain);
        src.connect(bp); bp.connect(lp); lp.connect(gain); gain.connect(master);
        src.start(); lfo.start(); gain.gain.linearRampToValueAtTime(0.07, ctx.currentTime + 1.5);
        ambNodes = { src, gain, lfo };
        swellTimer = setInterval(() => {
          const r = Math.random();
          if (r < 0.45) burst(700 + Math.random() * 600, 0.6, 1.2, 0.09);            // oleada de voces
          else if (r < 0.75) { this.chip(); }                                          // fichas
          else burst(1200, 0.9, 0.5, 0.06);                                            // risas / máquinas lejanas
        }, 2600);
      },
    };
  })();

  /* ================= Stickman (voz) ================= */
  let esVoice = null;
  const pickVoice = () => { if (!('speechSynthesis' in window)) return; const v = speechSynthesis.getVoices(); esVoice = v.find(x => /^es[-_]/i.test(x.lang)) || null; };
  if ('speechSynthesis' in window) { pickVoice(); speechSynthesis.onvoiceschanged = pickVoice; }
  function say(text) {
    if (!S.prefs.voice || !soundAllowed() || !('speechSynthesis' in window)) return;
    try {
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = esVoice ? esVoice.lang : 'es-ES'; if (esVoice) u.voice = esVoice;
      u.rate = 1.08; u.pitch = 0.65; u.volume = 1;
      speechSynthesis.speak(u);
    } catch (e) { /* sin voz */ }
  }

  /* ================= Dados 3D ================= */
  const DIE = 56;
  const PIPS = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };
  const NORMAL = { 1: [0, 0, 1], 2: [0, -1, 0], 3: [1, 0, 0], 4: [-1, 0, 0], 5: [0, 1, 0], 6: [0, 0, -1] };
  const floor = $('floor');

  // --- cuaterniones [x,y,z,w]
  const qmul = (a, b) => [
    a[3] * b[0] + a[0] * b[3] + a[1] * b[2] - a[2] * b[1],
    a[3] * b[1] - a[0] * b[2] + a[1] * b[3] + a[2] * b[0],
    a[3] * b[2] + a[0] * b[1] - a[1] * b[0] + a[2] * b[3],
    a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2]];
  const norm3 = v => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };
  const qaxis = (ax, ang) => { const s = Math.sin(ang / 2); return [ax[0] * s, ax[1] * s, ax[2] * s, Math.cos(ang / 2)]; };
  function qfromto(a, b) {
    const d = a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
    if (d > 0.999999) return [0, 0, 0, 1];
    if (d < -0.999999) { const p = Math.abs(a[0]) < 0.9 ? [0, a[2], -a[1]] : [-a[2], 0, a[0]]; return qaxis(norm3(p), Math.PI); }
    const c = [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
    const q = [c[0], c[1], c[2], 1 + d]; const l = Math.hypot(...q); return q.map(x => x / l);
  }
  function qmatrix(q) {
    const [x, y, z, w] = q;
    const r00 = 1 - 2 * (y * y + z * z), r01 = 2 * (x * y - z * w), r02 = 2 * (x * z + y * w);
    const r10 = 2 * (x * y + z * w), r11 = 1 - 2 * (x * x + z * z), r12 = 2 * (y * z - x * w);
    const r20 = 2 * (x * z - y * w), r21 = 2 * (y * z + x * w), r22 = 1 - 2 * (x * x + y * y);
    return `matrix3d(${r00},${r10},${r20},0,${r01},${r11},${r21},0,${r02},${r12},${r22},0,0,0,0,1)`;
  }
  const rand = (a, b) => a + Math.random() * (b - a);
  // orientación final con la cara `v` mirando hacia arriba (+z del suelo) y giro aleatorio sobre el suelo
  const finalQ = v => qmul(qaxis([0, 0, 1], rand(0, Math.PI * 2)), qfromto(NORMAL[v], [0, 0, 1]));

  function makeDie(id) {
    const el = $(id) || document.createElement('div');
    el.className = 'die3d';
    el.id = id;
    for (let v = 1; v <= 6; v++) {
      const f = document.createElement('div'); f.className = `face f${v}`;
      for (let i = 0; i < 9; i++) { const p = document.createElement('div'); p.className = 'pip' + (PIPS[v].includes(i) ? ' on' : ''); f.appendChild(p); }
      el.appendChild(f);
    }
    const sh = document.createElement('div'); sh.className = 'die-shadow';
    floor.appendChild(sh); floor.appendChild(el);
    return { el, sh, x: 0, y: 0, z: 0, q: [0, 0, 0, 1] };
  }
  const dice = [makeDie('die1'), makeDie('die2')];

  function draw(d, x, y, z, q) {
    d.x = x; d.y = y; d.z = z; d.q = q;
    d.el.style.transform = `translate3d(${x - DIE / 2}px,${y - DIE / 2}px,${z + DIE / 2 + 0.5}px) ${qmatrix(q)}`;
    const sc = 1 + z / 160;
    d.sh.style.transform = `translate3d(${x - DIE / 2}px,${y - DIE / 2 + 4}px,0.3px) scale(${sc})`;
    d.sh.style.opacity = String(Math.max(0.12, 0.7 / (1 + z / 70)));
  }
  const restSpots = () => { const W = floor.clientWidth, H = floor.clientHeight; return [[W * 0.42, H * 0.55], [W * 0.58, H * 0.5]]; };
  let shown = [1, 1];
  function placeAtRest(values, jitter = true) {
    const spots = restSpots();
    dice.forEach((d, i) => {
      const [x, y] = spots[i];
      draw(d, x + (jitter ? rand(-25, 25) : 0), y + (jitter ? rand(-20, 20) : 0), 0, finalQ(values[i]));
    });
    shown = values.slice();
  }
  addEventListener('resize', () => dice.forEach((d, i) => { const s = restSpots()[i]; draw(d, s[0], s[1], 0, d.q); }));

  /* Animación: física 2D con rebotes en paredes y entre dados + giro que termina exactamente
     en la cara ganadora (el resultado ya está decidido por el RNG; la física es solo visual). */
  function animateRoll(values) {
    return new Promise(resolve => {
      const W = floor.clientWidth, H = floor.clientHeight, m = DIE * 0.75;
      const T = rand(1.7, 2.0);
      Snd.shake();
      const P = dice.map((d, i) => {
        const vx = rand(-260, 260) + (i ? 70 : -70), vy = -rand(820, 1080);
        return {
          x: W * (i ? 0.62 : 0.38) + rand(-30, 30), y: H - m, vx, vy, z: rand(70, 110), vz: rand(250, 450),
          axis: norm3([-vy + rand(-300, 300), vx + rand(-300, 300), rand(-300, 300)]),
          A0: Math.PI * 2 * rand(2.5, 4.5), yaw: finalQ(values[i]),
        };
      });
      const G = 2400;
      let t = 0, last = performance.now();
      const step = h => {
        const k = 2.3 + (t > T * 0.7 ? 6 : 0);
        P.forEach(p => {
          p.vz -= G * h; p.z += p.vz * h;
          if (p.z <= 0) { const imp = -p.vz; p.z = 0; if (imp > 120) { p.vz = imp * 0.5; Snd.dieHit(imp / 900); } else p.vz = 0; }
          const fr = Math.exp(-(p.z > 0 ? 0.3 : k) * h); p.vx *= fr; p.vy *= fr;
          p.x += p.vx * h; p.y += p.vy * h;
          if (p.x < m) { p.x = m; p.vx = Math.abs(p.vx) * 0.7; Snd.wallHit(Math.abs(p.vx) / 700); }
          if (p.x > W - m) { p.x = W - m; p.vx = -Math.abs(p.vx) * 0.7; Snd.wallHit(Math.abs(p.vx) / 700); }
          if (p.y < m) { p.y = m; p.vy = Math.abs(p.vy) * 0.7; Snd.wallHit(Math.abs(p.vy) / 900); }
          if (p.y > H - m) { p.y = H - m; p.vy = -Math.abs(p.vy) * 0.7; Snd.wallHit(Math.abs(p.vy) / 900); }
        });
        // choque entre los dos dados
        const a = P[0], b = P[1], dx = b.x - a.x, dy = b.y - a.y, dist = Math.hypot(dx, dy);
        if (dist < DIE && dist > 0.001) {
          const nx = dx / dist, ny = dy / dist, ov = (DIE - dist) / 2;
          a.x -= nx * ov; a.y -= ny * ov; b.x += nx * ov; b.y += ny * ov;
          const rv = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
          if (rv < 0) { const j = -rv * 0.9; a.vx -= j * nx; a.vy -= j * ny; b.vx += j * nx; b.vy += j * ny; Snd.dieHit(Math.abs(rv) / 700); a.vz += 80; b.vz += 80; }
        }
      };
      const frame = now => {
        const dt = Math.min(0.033, (now - last) / 1000); last = now;
        const n = Math.max(1, Math.ceil(dt / (1 / 120))), h = dt / n;
        for (let i = 0; i < n; i++) step(h);
        t += dt;
        const u = Math.min(t / T, 1), A = (1 - u) * (1 - u);
        P.forEach((p, i) => draw(dice[i], p.x, p.y, p.z, qmul(qaxis(p.axis, p.A0 * A), p.yaw)));
        const still = P.every(p => Math.hypot(p.vx, p.vy) < 18 && p.z < 1);
        if ((t >= T && still) || t >= T + 1.2) {
          P.forEach((p, i) => draw(dice[i], p.x, p.y, 0, p.yaw));
          shown = values.slice(); resolve();
        } else requestAnimationFrame(frame);
      };
      requestAnimationFrame(frame);
    });
  }

  /* ================= Apuestas ================= */
  const findBet = (type, num = null) => S.bets.find(b => b.type === type && (b.num || null) === num);
  const totalOnTable = () => S.bets.reduce((s, b) => s + b.amount, 0);

  function ruleError(type, num) {
    if (type === 'pass' || type === 'dp') return S.point ? 'La Pass / Don\'t Pass solo se apuesta en el tiro de salida (sin punto).' : null;
    if (type === 'come' || type === 'dcome') return S.point ? null : 'Come / Don\'t Come solo con un punto activo.';
    if (type === 'passodds') return (S.point && findBet('pass')) ? null : 'Las cuotas necesitan una Pass Line y un punto activo.';
    if (type === 'dpodds') return (S.point && findBet('dp')) ? null : 'Las cuotas necesitan una Don\'t Pass y un punto activo.';
    return null;
  }
  function placeError(type, num, amt) {
    if (rolling) return 'Espera a que terminen los dados.';
    const r = ruleError(type, num); if (r) return r;
    if (type === 'passodds' || type === 'dpodds') {
      const base = findBet(type === 'passodds' ? 'pass' : 'dp'), cur = findBet(type);
      if ((cur ? cur.amount : 0) + amt > base.amount * 3) return `Máximo 3× tu apuesta base (${fmt(base.amount * 3)}).`;
    }
    if (amt > RC.getUser().coins) return 'No tienes monedas suficientes.';
    return null;
  }
  function addToTable(type, num, amt) {
    const b = findBet(type, num);
    if (b) b.amount += amt; else S.bets.push(num ? { type, num, amount: amt } : { type, amount: amt });
  }
  function placeBet(type, num, amt, silent) {
    const err = placeError(type, num, amt);
    if (err) { if (!silent) msg(err); return false; }
    RC.addCoins(-amt); addToTable(type, num, amt);
    undoStack.push({ type, num, amt });
    if (!silent) Snd.chip();
    return true;
  }
  const removable = b => {
    if (b.type === 'pass' || b.type === 'dp') return !S.point;
    return b.type !== 'comeN' && b.type !== 'dcomeN';
  };
  function removeBet(type, num) {
    if (rolling) return;
    const b = findBet(type, num); if (!b) return;
    if (!removable(b)) { msg('Esa apuesta ya está vinculada y no se puede retirar.'); return; }
    RC.addCoins(b.amount); S.bets = S.bets.filter(x => x !== b);
    undoStack = undoStack.filter(u => !(u.type === type && (u.num || null) === (num || null)));
    Snd.chip(); refresh();
  }
  function undo() {
    if (rolling) return;
    while (undoStack.length) {
      const u = undoStack.pop(), b = findBet(u.type, u.num || null);
      if (!b || !removable(b)) continue;
      const back = Math.min(u.amt, b.amount);
      RC.addCoins(back); b.amount -= back; if (b.amount <= 0) S.bets = S.bets.filter(x => x !== b);
      Snd.chip(); refresh(); return;
    }
    msg('No hay nada que deshacer.');
  }
  function clearBets() {
    if (rolling) return;
    let refunded = 0, locked = 0;
    S.bets = S.bets.filter(b => { if (removable(b)) { refunded += b.amount; return false; } locked++; return true; });
    if (refunded) RC.addCoins(refunded);
    undoStack = [];
    msg(refunded ? `Apuestas retiradas: ${fmt(refunded)} monedas devueltas.` + (locked ? ` ${locked} apuesta(s) vinculada(s) siguen en mesa.` : '') : (locked ? 'Solo quedan apuestas vinculadas.' : 'La mesa ya está vacía.'));
    if (refunded) Snd.chip();
    refresh();
  }
  const snapshot = () => S.bets.filter(b => b.type !== 'comeN' && b.type !== 'dcomeN').map(b => ({ type: b.type, num: b.num || null, amount: b.amount }));
  // vuelve a colocar lo que falte de una plantilla; devuelve cuántas no se pudieron
  function restore(tpl, silent) {
    let placed = 0, skipped = 0;
    (tpl || []).forEach(t => {
      const cur = findBet(t.type, t.num || null), need = t.amount - (cur ? cur.amount : 0);
      if (need <= 0) return;
      if (placeBet(t.type, t.num || null, need, true)) placed++; else skipped++;
    });
    if (placed && !silent) Snd.chip();
    return { placed, skipped };
  }
  function rebet() {
    if (rolling) return;
    if (!S.last.length) { msg('Aún no hay una apuesta anterior que repetir.'); return; }
    const r = restore(S.last);
    msg(r.placed ? `Apuesta repetida${r.skipped ? ` (${r.skipped} no se pudo${r.skipped > 1 ? 'ieron' : ''} colocar en esta fase)` : ''}.` : (r.skipped ? 'Ninguna de esas apuestas se puede colocar ahora.' : 'Esas apuestas ya están en la mesa.'));
    refresh();
  }

  /* ================= Mesa (HTML) ================= */
  const zb = (cls, type, num, label, sub) => `<button type="button" class="zone ${cls}" data-bet="${type}"${num ? ` data-num="${num}"` : ''}><span class="zl">${label}</span>${sub ? `<span class="zs">${sub}</span>` : ''}<span class="zmini"></span><span class="zchip"></span></button>`;
  $('table').innerHTML = `
    <div class="table-main">
      <div class="puck-home" id="puckHome"></div>
      <div class="row nums">${NUMS.map(n => zb('z-place', 'place', n, n, 'PLACE')).join('')}</div>
      ${zb('z-come wide', 'come', 0, 'COME', 'con punto activo')}
      ${zb('z-field wide', 'field', 0, 'FIELD', '2 · 3 · 4 · 9 · 10 · 11 · 12 — el 2 paga doble, el 12 triple')}
      ${zb('z-dcome wide', 'dcome', 0, 'NO COME', 'DON\'T COME · con punto activo')}
      <div class="row two">${zb('z-pass', 'pass', 0, 'PASS LINE', 'LÍNEA DE PASE · salida')}${zb('z-dp', 'dp', 0, 'DON\'T PASS', 'NO PASE · salida')}</div>
      <div class="row two">${zb('z-podds', 'passodds', 0, 'Pass Odds', 'cuotas ≤ 3×')}${zb('z-dpodds', 'dpodds', 0, 'Lay Odds', 'cuotas ≤ 3×')}</div>
    </div>
    <div class="table-props">
      <h3>PROPOSICIONES · una tirada</h3>
      ${zb('z-prop wide', 'any7', 0, 'ANY 7', '4 a 1')}
      ${zb('z-prop wide', 'anycraps', 0, 'ANY CRAPS', '7 a 1 · 2, 3 o 12')}
      ${zb('z-prop', 'aces', 0, '2', 'ojos de serpiente · 30:1')}
      ${zb('z-prop', 'twelve', 0, '12', 'cajas · 30:1')}
      ${zb('z-prop', 'acedeuce', 0, '3', 'as-dos · 15:1')}
      ${zb('z-prop', 'eleven', 0, '11', 'yo-leven · 15:1')}
    </div>`;
  $('legend').innerHTML = [['#5aa4f0', 'Pass Line'], ['#f07575', 'Don\'t Pass'], ['#3fd0b3', 'Come'], ['#b58be8', 'Don\'t Come'], ['#d6b64a', 'Field'], ['#f0e6cc', 'Place'], ['#f0913f', 'Proposiciones']]
    .map(([c, t]) => `<span><i style="border-color:${c};background:${c}40"></i>${t}</span>`).join('');
  const zones = [...document.querySelectorAll('.zone')];
  const zoneKey = z => [z.dataset.bet, z.dataset.num ? +z.dataset.num : null];

  const puck = document.createElement('span'); puck.className = 'puck off'; puck.id = 'puck'; puck.textContent = 'OFF';
  $('puckHome').appendChild(puck);
  function movePuck(animate) {
    const target = S.point ? document.querySelector(`.zone[data-bet="place"][data-num="${S.point}"]`) : $('puckHome');
    if (puck.parentElement === target) { puck.className = 'puck ' + (S.point ? 'on' : 'off'); return; }
    const a = puck.getBoundingClientRect();
    target.appendChild(puck);
    puck.className = 'puck ' + (S.point ? 'on' : 'off'); puck.textContent = S.point ? 'ON' : 'OFF';
    if (animate && puck.animate) {
      const b = puck.getBoundingClientRect();
      puck.animate([{ transform: `translate(${a.left - b.left}px,${a.top - b.top}px) rotateY(180deg) scale(1.3)` }, { transform: 'none' }], { duration: 650, easing: 'cubic-bezier(.2,.8,.2,1)' });
    }
  }

  /* ================= Render ================= */
  const chipEl = a => `<span class="chip ${chipClass(a)}">${a >= 10000 ? Math.round(a / 1000) + 'k' : a}</span>`;
  function refresh() {
    zones.forEach(z => {
      const [type, num] = zoneKey(z), b = findBet(type, num);
      z.querySelector('.zchip').innerHTML = b ? chipEl(b.amount) : '';
      z.classList.toggle('disabled', !!ruleError(type, num));
      if (type === 'place') {
        z.querySelector('.zmini').innerHTML = S.bets.filter(x => x.num === num && (x.type === 'comeN' || x.type === 'dcomeN'))
          .map(x => `<span class="mini ${x.type === 'dcomeN' ? 'dc' : ''}">${x.type === 'dcomeN' ? 'NC' : 'C'} ${x.amount}</span>`).join('');
      }
    });
    $('tableTotal').textContent = fmt(totalOnTable());
    const ps = $('pointStatus');
    ps.classList.toggle('on', !!S.point);
    $('psLabel').textContent = S.point ? `PUNTO: ${S.point}  ·  ON` : 'TIRO DE SALIDA  ·  OFF';
    $('psSub').textContent = S.point ? `Gana la línea de pase si sale el ${S.point} antes que un 7` : 'Sin punto: 7 u 11 ganan la Pass Line, 2, 3 y 12 (craps) la pierden';
    movePuck(false);
    $('rollBtn').disabled = rolling;
    ['rebetBtn', 'undoBtn', 'clearBtn'].forEach(id => $(id).disabled = rolling);
    $('tgAuto').checked = !!S.auto;
    $('autoNote').textContent = S.auto ? 'Activas: se repetirán tras cada tirada hasta que salga el punto o un 7 con punto activo.' : '';
    renderStats(); save();
  }
  function msg(t) { $('diceMsg').textContent = t; }
  function banner(text, bad) {
    const b = $('callBanner'); b.textContent = text; b.classList.toggle('bad', !!bad); b.classList.add('show');
    clearTimeout(banner.t); banner.t = setTimeout(() => b.classList.remove('show'), 2600);
  }

  function renderStats() {
    $('hist').innerHTML = S.history.slice(0, 20).map(h => {
      const cls = h.s === 7 ? 'seven' : h.s === 11 ? 'nat' : [2, 3, 12].includes(h.s) ? 'craps' : '';
      return `<span class="h ${cls}">${h.a}+${h.b}=${h.s}</span>`;
    }).join('') || '<span class="tiny">Aún no hay tiradas.</span>';
    const c = S.counts, total = S.rolls || 0, ways = s => 6 - Math.abs(s - 7);
    const pct = s => total ? (c[s] || 0) / total : 0;
    const maxP = Math.max(0.17, ...Array.from({ length: 11 }, (_, i) => pct(i + 2)));
    $('freq').innerHTML = Array.from({ length: 11 }, (_, i) => {
      const s = i + 2, hp = pct(s) / maxP * 100, ep = (ways(s) / 36) / maxP * 100;
      return `<div class="col" title="${s}: ${c[s] || 0} veces (${(pct(s) * 100).toFixed(1)} %) · esperado ${(ways(s) / 36 * 100).toFixed(1)} %"><span class="c">${c[s] || 0}</span><div class="bar" style="height:${hp}%"></div><span class="exp" style="bottom:calc(${ep}% + 14px)"></span><span class="n">${s}</span></div>`;
    }).join('');
    $('freqNote').textContent = total ? `${total} tiradas registradas. La línea punteada es la frecuencia teórica.` : 'La línea punteada será la frecuencia teórica.';
  }

  /* ================= Tirada ================= */
  async function roll() {
    if (rolling) return;
    if (!S.bets.length) { msg('Coloca al menos una apuesta antes de lanzar.'); return; }
    Snd.unlock();
    S.last = snapshot();
    if (S.auto && !S.autoTpl) S.autoTpl = snapshot();
    rolling = true; undoStack = [];
    $('resultList').innerHTML = ''; msg(''); $('sumDisplay').textContent = 'Suma: …';
    refresh();
    const a = E.rollDie(), b = E.rollDie();            // el resultado se decide aquí, antes de animar
    if (S.prefs.turbo) { placeAtRest([a, b]); Snd.dieHit(0.6); }
    else await animateRoll([a, b]);
    resolveRoll(a, b);
  }

  function resolveRoll(a, b) {
    const s = a + b, was = S.point;
    const r = E.settleRoll(S.bets, S.point, s);
    S.bets = r.bets; S.point = r.point;
    S.history.unshift({ a, b, s }); S.history = S.history.slice(0, 50);
    S.counts[s] = (S.counts[s] || 0) + 1; S.rolls++;
    if (r.ret > 0) RC.addCoins(r.ret);
    const net = r.ret - r.wager;

    $('sumDisplay').textContent = `Suma: ${s}`;
    $('resultList').innerHTML = r.lines.filter(l => l.result !== 'move').concat(r.lines.filter(l => l.result === 'move')).map(l => {
      const t = l.result === 'win' ? `+${fmt(l.win)}` : l.result === 'lose' ? `−${fmt(l.amount)}` : l.result === 'push' ? 'empate' : `→ ${l.num || s}`;
      return `<span class="rc-badge ${l.result === 'win' ? 'win' : l.result === 'lose' ? 'lose' : l.result}">${RC.esc(lbl(l.type, l.num))} ${t}</span>`;
    }).join('');

    // cantos del stickman + cartel
    const calls = {
      natural: s === 7 ? ['¡Siete natural!', '¡Siete natural, ganan los de la línea!'] : ['¡Yo-leven!', '¡Yo-leven, once!'],
      craps: [{ 2: '¡Ojos de serpiente!', 3: '¡Tres, craps!', 12: '¡Cajas, doce!' }[s], { 2: '¡Dos, ojos de serpiente! ¡Craps!', 3: '¡Tres! ¡Craps!', 12: '¡Doce, cajas! ¡Craps!' }[s]],
      pointSet: [`¡Punto: ${s}!`, `¡Punto, ${WORD[s]}!`],
      pointMade: [`¡Punto hecho: ${s}!`, `¡${WORD[s]}, punto hecho! ¡Ganadores!`],
      sevenOut: ['¡Siete fuera!', '¡Siete fuera! ¡Siete fuera, línea pierde!'],
      none: [`${s}`, `${WORD[s]}${s === 11 ? '. Yo-leven' : ''}`],
    };
    const c = calls[r.event] || calls.none;
    const bad = r.event === 'sevenOut' || (r.event === 'craps');
    banner(c[0], bad); say(c[1]);

    msg(net > 0 ? `¡Ganaste! Ganancia neta +${fmt(net)} monedas` : net < 0 ? `Perdiste ${fmt(-net)} monedas.` : (r.wager ? 'Tirada sin ganancia neta.' : 'Las apuestas siguen en juego.'));
    if (r.wager > 0) {
      const q = S.auto ? 1200 : undefined;
      if (net > 0) RC.result({ type: net >= 500 ? 'big' : 'win', title: '¡GANASTE!', amount: net, text: c[0], sound: false, duration: q });
      else if (net < 0) RC.result({ type: 'lose', title: 'PERDISTE', amount: -net, text: c[0], sound: false, duration: q });
      else RC.result({ type: 'push', title: 'SIN GANANCIA', text: 'Tirada sin ganancia neta.', sound: false, duration: q });
      RC.registerGameResult('Dados', net > 0, r.wager, r.ret);
    }
    if (net > 0) { Snd.win(); if (net >= 500) Snd.cheer(); } else if (net < 0 || r.event === 'sevenOut') Snd.lose();

    rolling = false;   // debe liberarse antes de recolocar las apuestas automáticas

    // apuestas automáticas
    if (S.auto) {
      if (r.cycleEnded) {
        S.auto = false; S.autoTpl = null; RC.toast('info', 'Ciclo terminado: apuestas automáticas desactivadas.');
      } else {
        const res = restore(S.autoTpl, true);
        if (res.skipped) RC.toast('info', `Auto: ${res.skipped} apuesta(s) no se pudieron repetir.`);
        if (res.placed) Snd.chip();
      }
    }
    movePuck(true);
    refresh();
  }

  /* ================= Info al pasar el cursor ================= */
  const tip = $('tip');
  function infoHTML(type, num) {
    const i = infoFor(type, num); if (!i) return '';
    return `<strong>${RC.esc(i.name)}</strong><br><span class="kv">💰 Paga: <b>${RC.esc(i.pay)}</b></span><span class="kv">🏠 Ventaja de la casa: <b>${RC.esc(i.edge)}</b></span><span class="desc">${RC.esc(i.desc)}</span>`;
  }
  zones.forEach(z => {
    const [type, num] = zoneKey(z);
    const show = () => { $('infoBar').innerHTML = infoHTML(type, num); };
    z.addEventListener('mouseenter', e => {
      show(); const i = infoFor(type, num);
      tip.innerHTML = `<b>${RC.esc(i.name)}</b><br>Paga: ${RC.esc(i.pay)}<br>Ventaja casa: ${RC.esc(i.edge)}`; tip.classList.add('show');
    });
    z.addEventListener('mousemove', e => { tip.style.left = Math.min(innerWidth - 260, e.clientX + 14) + 'px'; tip.style.top = (e.clientY + 16) + 'px'; });
    z.addEventListener('mouseleave', () => tip.classList.remove('show'));
    z.addEventListener('focus', show);
    z.addEventListener('click', () => { show(); tip.classList.remove('show'); placeBet(type, num, S.chip) && refresh(); });
    z.addEventListener('contextmenu', e => { e.preventDefault(); removeBet(type, num); });
  });

  /* ================= Controles ================= */
  $('chipRow').innerHTML = CHIPS.map(v => `<button type="button" class="chip-pick" data-v="${v}" aria-label="Ficha de ${v}"><span class="chip ${chipClass(v)}">${v}</span></button>`).join('');
  const markChip = () => document.querySelectorAll('.chip-pick').forEach(b => b.classList.toggle('sel', +b.dataset.v === S.chip));
  document.querySelectorAll('.chip-pick').forEach(b => b.addEventListener('click', () => { S.chip = +b.dataset.v; markChip(); save(); }));
  if (!CHIPS.includes(S.chip)) S.chip = 100;
  markChip();

  $('rollBtn').addEventListener('click', roll);
  $('rebetBtn').addEventListener('click', rebet);
  $('undoBtn').addEventListener('click', undo);
  $('clearBtn').addEventListener('click', clearBets);
  $('tgTurbo').checked = S.prefs.turbo;
  $('tgTurbo').addEventListener('change', e => { S.prefs.turbo = e.target.checked; save(); });
  $('tgAuto').addEventListener('change', e => {
    S.auto = e.target.checked; S.autoTpl = null;
    if (S.auto && !S.bets.length) msg('Coloca tus apuestas: se repetirán solas tras cada tirada.');
    refresh();
  });
  $('tgAmb').checked = S.prefs.ambient;
  $('tgAmb').addEventListener('change', e => { S.prefs.ambient = e.target.checked; save(); if (e.target.checked && !soundAllowed()) msg('El sonido está desactivado en Configuración.'); Snd.ambient(e.target.checked); });
  $('tgVoice').checked = S.prefs.voice;
  $('tgVoice').addEventListener('change', e => { S.prefs.voice = e.target.checked; save(); if (!e.target.checked && 'speechSynthesis' in window) speechSynthesis.cancel(); });
  // los navegadores exigen un gesto del usuario antes de reproducir audio
  addEventListener('pointerdown', () => { if (S.prefs.ambient) Snd.ambient(true); }, { once: true });

  /* ================= Auditoría del RNG ================= */
  $('auditBtn').addEventListener('click', () => {
    const N = 60000, c = Array(13).fill(0), faces = Array(7).fill(0);
    for (let i = 0; i < N; i++) { const a = E.rollDie(), b = E.rollDie(); c[a + b]++; faces[a]++; faces[b]++; }
    let chi = 0, rows = '';
    for (let s = 2; s <= 12; s++) {
      const exp = N * (6 - Math.abs(s - 7)) / 36; chi += (c[s] - exp) ** 2 / exp;
      rows += `<tr><td>${s}</td><td>${(exp / N * 100).toFixed(2)} %</td><td>${(c[s] / N * 100).toFixed(2)} %</td></tr>`;
    }
    let chiF = 0; for (let f = 1; f <= 6; f++) chiF += (faces[f] - N / 3) ** 2 / (N / 3);
    const ok = chi < 18.31 && chiF < 11.07;   // valores críticos al 5 % (10 y 5 grados de libertad)
    $('auditOut').innerHTML = `<table><tr><th>Suma</th><th>Teórico</th><th>Obtenido</th></tr>${rows}</table>
      <div>χ² sumas = ${chi.toFixed(2)} (límite 18,31) · χ² caras = ${chiF.toFixed(2)} (límite 11,07)</div>
      <div class="verdict">${ok ? '✔ Sin sesgo detectable en esta muestra.' : '⚠ Desviación en esta muestra; repite la prueba (un 5 % de las veces ocurre por azar).'}</div>`;
  });

  /* ================= Arranque ================= */
  const lastRoll = S.history[0] ? [S.history[0].a, S.history[0].b] : [5, 2];
  placeAtRest(lastRoll);
  if (S.history[0]) $('sumDisplay').textContent = `Suma: ${S.history[0].s}`;
  movePuck(false);
  refresh();
  if (S.bets.length) msg('Tienes apuestas de la sesión anterior en la mesa.');
})();
