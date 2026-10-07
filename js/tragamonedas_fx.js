// tragamonedas_fx.js — capa visual y sonora del tragamonedas.
// Solo anima y suena: NUNCA decide ni modifica resultados (eso lo hace SlotEngine).
// Los símbolos que giran y los de arriba/abajo de la línea central son decorativos (Math.random)
// y se eligen para que ninguna otra fila forme pares ni triples que parezcan un premio.
(function () {
  const SYMS = SlotEngine.SYMBOLS;
  const $ = id => document.getElementById(id);
  const machine = $('slotMachine'), reelsBox = $('reelsBox'), payoutLine = $('payoutLine');
  const reelEls = [$('reel0'), $('reel1'), $('reel2')];
  const strips = [], rest = [];
  const wait = ms => new Promise(r => setTimeout(r, ms));

  const cfg = () => (typeof RC !== 'undefined' && RC.getSettings) ? RC.getSettings() : {};
  const reduced = () => !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  const animOn = () => cfg().anim !== false && !reduced();
  let soundPref = true;
  try { soundPref = RCMem.getItem('rc_slot_sound') !== '0'; } catch (e) {}
  const soundOn = () => soundPref && cfg().sound !== false;
  const fmt = n => (typeof RC !== 'undefined' && RC.formatNumber) ? RC.formatNumber(n) : String(n);

  /* ---------- Sonido (síntesis con WebAudio, sin archivos) ---------- */
  let ctx = null;
  function ac() {
    if (!soundOn()) return null;
    try {
      if (!ctx) { const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null; ctx = new AC(); }
      if (ctx.state === 'suspended') ctx.resume().catch(() => {});
      return ctx;
    } catch (e) { return null; }
  }
  function tone(freq, t0, dur, type, vol, slideTo) {
    const c = ac(); if (!c) return;
    const t = c.currentTime + t0, o = c.createOscillator(), g = c.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol || .1, t + .01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(c.destination);
    o.start(t); o.stop(t + dur + .03);
  }
  let tickTimer = null;
  const Snd = {
    click() { tone(660, 0, .05, 'square', .04); },
    tick() { tone(700 + Math.random() * 250, 0, .03, 'square', .025); },
    startTicks() { Snd.stopTicks(); tickTimer = setInterval(Snd.tick, 85); },
    stopTicks() { if (tickTimer) { clearInterval(tickTimer); tickTimer = null; } },
    stop() { tone(150, 0, .14, 'sine', .2, 55); tone(500, 0, .03, 'square', .05); },
    push() { tone(440, 0, .12, 'triangle', .08); },
    win() { [523, 659, 784].forEach((f, k) => tone(f, k * .09, .28, 'triangle', .14)); },
    coin() { tone(1568, 0, .07, 'square', .04); tone(2093, .05, .09, 'square', .04); },
    big(mega) {
      const seq = mega ? [523, 659, 784, 1047, 784, 1047, 1319, 1568] : [523, 659, 784, 1047, 1319];
      seq.forEach((f, k) => tone(f, k * .11, .3, 'triangle', .15));
      [523, 659, 784, 1047].forEach(f => tone(f, seq.length * .11, .9, 'sawtooth', .05));
    },
  };

  /* ---------- Símbolos decorativos ---------- */
  function shuffle(a) {
    a = a.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  }
  // Fila de arriba y de abajo: 3 símbolos distintos entre sí y distintos del de la línea central de su columna.
  function pickNeighbors(mids) {
    for (let t = 0; t < 60; t++) {
      const top = shuffle(SYMS).slice(0, 3), bot = shuffle(SYMS).slice(0, 3);
      if ([0, 1, 2].every(i => top[i] !== mids[i] && bot[i] !== mids[i] && top[i] !== bot[i])) return { top, bot };
    }
    const next = k => mids.map(s => SYMS[(SYMS.indexOf(s) + k) % SYMS.length]);
    return { top: next(1), bot: next(2) };
  }

  function buildStrip(i, list) {
    strips[i].replaceChildren(...list.map(s => {
      const d = document.createElement('div'); d.className = 'cell'; d.textContent = s; return d;
    }));
  }
  function setSymbols(symbols) {
    const nb = pickNeighbors(symbols);
    reelEls.forEach((_, i) => { rest[i] = [nb.top[i], symbols[i], nb.bot[i]]; buildStrip(i, rest[i]); });
  }
  function initReels() {
    const mids = reelEls.map((r, i) => { const t = r.textContent.trim(); return SYMS.includes(t) ? t : SYMS[i]; });
    reelEls.forEach((r, i) => {
      r.textContent = '';
      const s = document.createElement('div'); s.className = 'reel-strip'; r.appendChild(s); strips[i] = s;
    });
    setSymbols(mids);
  }

  /* ---------- Giro ---------- */
  function spinReel(i, mid, nb, dur) {
    const strip = strips[i], cell = reelEls[i].clientHeight / 3;
    const n = Math.max(6, Math.round(dur / 62));
    const rnd = Array.from({ length: n }, () => SYMS[Math.floor(Math.random() * SYMS.length)]);
    const final = [nb.top[i], mid, nb.bot[i]];
    const list = [...final, ...rnd, ...rest[i]];
    buildStrip(i, list);
    const el = reelEls[i];
    el.classList.add('reel-fast');
    const anim = strip.animate([
      { transform: `translateY(${-(list.length - 3) * cell}px)`, easing: 'cubic-bezier(.15,.6,.25,1)' },
      { transform: 'translateY(10px)', offset: .9, easing: 'ease-in-out' },
      { transform: 'translateY(0)' },
    ], { duration: dur, fill: 'forwards' });
    const unblur = setTimeout(() => el.classList.remove('reel-fast'), dur * .7);
    return anim.finished.catch(() => {}).then(() => {
      clearTimeout(unblur);
      rest[i] = final; buildStrip(i, final); anim.cancel();
      el.classList.remove('reel-fast');
      el.classList.add('bump'); setTimeout(() => el.classList.remove('bump'), 220);
      Snd.stop();
    });
  }

  function clearWin() {
    reelEls.forEach(r => r.classList.remove('win'));
    reelsBox.classList.remove('win-line', 'push-line');
    payoutLine.classList.remove('win', 'pop');
    machine.classList.remove('shake');
    machine.dataset.state = 'idle';
  }

  async function spin(result, opts) {
    opts = opts || {};
    clearWin();
    const symbols = result.symbols;
    if (!animOn()) { setSymbols(symbols); Snd.stop(); return; }
    const nb = pickNeighbors(symbols);
    machine.dataset.state = 'spin';
    Snd.startTicks();
    const base = opts.turbo ? 550 : 1100, gap = opts.turbo ? 180 : 420;
    try {
      await Promise.all(reelEls.map((_, i) => spinReel(i, symbols[i], nb, base + i * gap)));
    } finally {
      Snd.stopTicks();
      machine.dataset.state = 'idle';
    }
  }

  /* ---------- Premios ---------- */
  function countUp(el, from, to, ms, onStep) {
    if (!animOn() || ms <= 0 || from === to) { el.textContent = fmt(to); return; }
    const t0 = performance.now();
    let lastStep = 0;
    (function frame(now) {
      const k = Math.min(1, (now - t0) / ms), e = 1 - Math.pow(1 - k, 3);
      el.textContent = fmt(Math.round(from + (to - from) * e));
      if (onStep && now - lastStep > 110 && k < 1) { lastStep = now; onStep(); }
      if (k < 1) requestAnimationFrame(frame); else el.textContent = fmt(to);
    })(t0);
  }

  let lastWin = 0;
  function setLastWin(n) {
    const el = $('hudWin'); if (!el) return;
    countUp(el, lastWin, n, 600);
    lastWin = n;
  }

  function rain(count) {
    const box = $('coinRain'); if (!box) return;
    const frag = document.createDocumentFragment();
    for (let k = 0; k < count; k++) {
      const s = document.createElement('span');
      s.textContent = '🪙';
      s.style.setProperty('--x', (Math.random() * 100).toFixed(1) + '%');
      s.style.setProperty('--s', (1.2 + Math.random() * 1.6).toFixed(2) + 'rem');
      s.style.setProperty('--d', (1.8 + Math.random() * 1.6).toFixed(2) + 's');
      s.style.setProperty('--dl', (Math.random() * 1.6).toFixed(2) + 's');
      frag.appendChild(s);
    }
    box.replaceChildren(frag);
  }

  function bigWin(tier, payout, mult) {
    return new Promise(resolve => {
      const box = $('bigWin');
      box.className = 'bigwin ' + tier;
      box.hidden = false;
      $('bigWinTitle').textContent = { big: 'BIG WIN', mega: 'MEGA WIN', jackpot: '¡JACKPOT!' }[tier];
      $('bigWinMult').textContent = '×' + mult;
      const dur = tier === 'jackpot' ? 3200 : tier === 'mega' ? 2600 : 2000;
      rain(tier === 'jackpot' ? 70 : tier === 'mega' ? 50 : 30);
      Snd.big(tier !== 'big');
      if (tier !== 'big') { machine.classList.add('shake'); }
      countUp($('bigWinAmount'), 0, payout, dur, Snd.coin);
      let closed = false, timer = null;
      const onKey = e => { if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') { e.preventDefault(); close(); } };
      function close() {
        if (closed) return; closed = true;
        clearTimeout(timer);
        box.hidden = true; $('coinRain').replaceChildren();
        box.removeEventListener('click', close);
        document.removeEventListener('keydown', onKey);
        machine.classList.remove('shake');
        resolve();
      }
      box.addEventListener('click', close);
      document.addEventListener('keydown', onKey);
      timer = setTimeout(close, dur + 1500);
    });
  }

  function pairIdx(s) {
    if (s[0] === s[1]) return [0, 1];
    if (s[1] === s[2]) return [1, 2];
    return [0, 2];
  }

  async function celebrate(result) {
    const { symbols, kind, mult, payout } = result;
    setLastWin(payout);
    if (kind === 'none') return;
    reelEls.forEach((r, i) => r.classList.toggle('win', kind === 'triple' || pairIdx(symbols).includes(i)));
    void payoutLine.offsetWidth;
    payoutLine.classList.add('win', 'pop');
    if (kind === 'pair') { reelsBox.classList.add('push-line'); Snd.push(); return; }
    reelsBox.classList.add('win-line');
    const tier = mult >= 100 ? 'jackpot' : mult >= 30 ? 'mega' : mult >= 10 ? 'big' : 'win';
    if (!animOn()) { Snd.win(); return; }
    machine.dataset.state = 'win';
    try {
      if (tier === 'win') { Snd.win(); await wait(900); }
      else await bigWin(tier, payout, mult);
    } finally {
      machine.dataset.state = 'idle';
    }
  }

  /* ---------- Marcadores, luces y botón de sonido ---------- */
  function hud() {
    const c = $('hudCoins'), b = $('hudBet');
    if (c && typeof RC !== 'undefined') c.textContent = fmt(RC.getUser().coins);
    if (b) b.textContent = fmt(SlotEngine.normalizeBet($('bet').value));
  }
  function buildLights() {
    ['lightsTop', 'lightsBottom'].forEach(id => {
      const el = $(id); if (!el) return;
      for (let k = 0; k < 16; k++) { const b = document.createElement('i'); b.className = 'bulb'; b.style.setProperty('--i', k); el.appendChild(b); }
    });
  }
  function paintSound() {
    const b = $('soundBtn'); if (!b) return;
    b.textContent = soundOn() ? '🔊' : '🔇';
    b.setAttribute('aria-pressed', String(soundPref));
  }
  function initSoundBtn() {
    const b = $('soundBtn'); if (!b) return;
    b.addEventListener('click', () => {
      soundPref = !soundPref;
      try { RCMem.setItem('rc_slot_sound', soundPref ? '1' : '0'); } catch (e) {}
      paintSound();
      if (soundPref && cfg().sound === false && typeof RC !== 'undefined') RC.toast('info', 'El sonido está desactivado en Configuración.');
      Snd.click();
    });
    paintSound();
  }

  initReels(); buildLights(); initSoundBtn(); hud();
  const bet = $('bet'); if (bet) bet.addEventListener('input', hud);

  window.SlotFX = { spin, celebrate, setSymbols, hud, clear: clearWin, click: Snd.click };
})();
