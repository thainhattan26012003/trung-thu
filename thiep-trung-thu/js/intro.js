// Màn mở đầu: mở thiệp → chạm giữ để vầng trăng lớn dần, thơ hiện từng câu → trăng nở tung.
import { Sound } from './audio.js';
import { rng, makeMoonCanvas, makeCloudCanvas } from './art.js';

const HOLD_TIME = 6;   // số giây cần giữ

// Mốc hiện từng câu (phần trăm thời gian giữ): rải từ 8% tới 74%,
// câu dài được ở lại lâu hơn trước khi câu tiếp theo hiện ra.
function makeThresholds(lines) {
  if (lines.length <= 1) return [0.08];
  const gaps = lines.slice(0, -1).map((s) => Math.max(12, s.length));
  const total = gaps.reduce((a, b) => a + b, 0);
  const out = [0.08];
  gaps.forEach((gp) => out.push(out[out.length - 1] + (0.66 * gp) / total));
  return out;
}

const lerp = (a, b, t) => a + (b - a) * t;
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const easeOutBack = (t) => 1 + 2.2 * Math.pow(t - 1, 3) + 1.2 * Math.pow(t - 1, 2);
const vibrate = (p) => {
  try {
    const ua = navigator.userActivation;
    if (navigator.vibrate && (!ua || ua.hasBeenActive)) navigator.vibrate(p);
  } catch (e) { /* máy không hỗ trợ rung */ }
};

export function createIntro({ canvas, ui, poemEl, sealBtn, flash, poem, song, onOpen, onComplete }) {
  const g = canvas.getContext('2d');
  const moonArt = makeMoonCanvas(640);
  const cloudArt = [makeCloudCanvas(512, 200, 3), makeCloudCanvas(512, 200, 11)];
  const R = rng(8);
  let w = 0, h = 0, dpr = 1, cx = 0, cy = 0, r0 = 0, r1 = 0, diag = 0;
  let phase = 'seal', progress = 0, holding = false, t = 0, openT = 0, burstT = 0, fullT = 0, revealed = 0;
  const pointers = new Set();
  const stars = [], sparks = [];
  const clouds = [
    { art: 0, x: -0.55, y: -0.05, s: 1.25, v: 0.012 },
    { art: 1, x: 0.5, y: 0.14, s: 1.05, v: -0.009 },
    { art: 0, x: 0.15, y: -0.3, s: 0.8, v: 0.007 },
  ];

  const THRESHOLDS = makeThresholds(poem);
  // trăng tròn đầy thì dừng lại cho kịp đọc câu cuối, câu cuối càng dài dừng càng lâu
  const FULL_PAUSE = Math.min(4.2, Math.max(2.4, 1.8 + (poem[poem.length - 1] || '').length * 0.035));
  const lines = poem.map((txt) => {
    const s = document.createElement('span');
    s.className = 'line'; s.textContent = txt;
    poemEl.appendChild(s);
    return s;
  });
  if (poem.join('').length > 90) poemEl.classList.add('long');
  const topEl = ui.querySelector('.intro-top'), hintEl = ui.querySelector('.intro-hint');

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = window.innerWidth; h = window.innerHeight;
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    const landscape = w > h;
    cx = w / 2; cy = h * (landscape ? 0.4 : 0.42);
    const m = Math.min(w, h * (landscape ? 0.9 : 0.62));
    r0 = m * 0.13; r1 = m * 0.4;
    diag = Math.hypot(w, h);
    // Xếp trăng + thơ vào khoảng giữa lời chào và dòng hướng dẫn để câu dài không bị đè
    if (topEl && hintEl) {
      const top = topEl.getBoundingClientRect().bottom + 18;
      const bottom = hintEl.getBoundingClientRect().top - 10;
      const P = poemEl.offsetHeight, gap = 34, avail = bottom - top;
      if (16 + 2 * r1 + gap + P > avail) r1 = Math.max(m * 0.24, (avail - 16 - gap - P) / 2);
      r0 = Math.min(r0, r1 * 0.6);
      cy = Math.min(cy, top + Math.max(0, (avail - (16 + 2 * r1 + gap + P)) / 2) + 16 + r1);
      poemEl.style.top = `${Math.round(cy + r1 + gap)}px`;
    }
    if (!stars.length) {
      for (let i = 0; i < 240; i++) {
        stars.push({ a: R() * Math.PI * 2, d: Math.sqrt(R()) * diag * 0.6, s: 0.4 + Math.pow(R(), 2.5) * 1.6, tw: R() * 6.28, sp: 0.6 + R() * 2.2 });
      }
    }
  }

  // ---------- Điều khiển ----------
  function open() {
    if (phase !== 'seal') return;
    Sound.init();
    Sound.prepareSong(song);
    phase = 'hold'; openT = 0;
    document.body.classList.add('opened');
    vibrate(10);
    onOpen && onOpen();
  }
  function setHolding(v) {
    if (holding === v) return;
    holding = v;
    document.body.classList.toggle('holding', v);
    if (v) { document.body.classList.remove('released'); vibrate(8); }
    else if (phase === 'hold' && progress > 0.03) document.body.classList.add('released');
  }
  function down(e) {
    e.preventDefault();
    if (phase !== 'hold') return;
    pointers.add(e.pointerId);
    try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* bỏ qua */ }
    setHolding(true);
  }
  function up(e) {
    if (phase === 'seal' && e.type === 'pointerup') { open(); return; }
    pointers.delete(e.pointerId);
    if (!pointers.size) setHolding(false);
  }
  canvas.addEventListener('pointerdown', down);
  canvas.addEventListener('pointerup', up);
  canvas.addEventListener('pointercancel', up);
  canvas.addEventListener('lostpointercapture', up);
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  // iPhone chỉ coi touchend là "chạm thật" để bật âm thanh — mở thiệp ngay ở đó
  canvas.addEventListener('touchend', () => { if (phase === 'seal') open(); }, { passive: true });
  // chặn các thao tác mặc định của iOS khi giữ lâu (kính lúp, menu) để việc giữ trăng không bị ngắt
  canvas.addEventListener('touchstart', (e) => { if (e.cancelable) e.preventDefault(); }, { passive: false });
  sealBtn.addEventListener('click', (e) => { e.stopPropagation(); open(); });
  const onKey = (e) => {
    if (e.code !== 'Space' && e.code !== 'Enter') return;
    if (phase === 'hold') { e.preventDefault(); if (!e.repeat) setHolding(e.type === 'keydown'); }
  };
  window.addEventListener('keydown', onKey);
  window.addEventListener('keyup', onKey);

  // Giữ đủ lâu: trăng tròn đầy, cả 4 câu thơ đứng yên cho đọc, rồi mới nở tung
  function reachFull() {
    phase = 'full'; fullT = 0;
    setHolding(false);
    document.body.classList.remove('released');
    document.body.classList.add('moonfull');
    lines.forEach((l) => l.classList.add('on'));
    revealed = THRESHOLDS.length;
    Sound.holdEnd(); Sound.chime();
    vibrate(15);
  }

  function startBurst() {
    phase = 'burst'; burstT = 0;
    setHolding(false);
    document.body.classList.remove('released');
    Sound.holdEnd(); Sound.bloom();
    vibrate([20, 50, 70]);
    ui.classList.add('bursting');
  }

  // ---------- Vẽ ----------
  function moonRadius() {
    if (phase === 'seal') return 0;
    const appear = Math.min(1, openT / 1.3);
    let r = lerp(r0, r1, easeInOut(progress)) * (appear < 1 ? Math.max(0, easeOutBack(appear)) : 1);
    if (phase === 'hold' && !holding) r *= 1 + Math.sin(t * 2.2) * 0.015;
    if (phase === 'full') r *= 1 + Math.sin(fullT * 3) * 0.012;
    if (phase === 'burst') r = lerp(r1, diag * 0.75, Math.pow(Math.min(1, burstT / 1.0), 3));
    return r;
  }

  function draw(dt) {
    const bg = g.createRadialGradient(cx, cy, 0, cx, cy, diag * 0.7);
    bg.addColorStop(0, '#1b2154'); bg.addColorStop(0.45, '#0e1336'); bg.addColorStop(1, '#05081a');
    g.fillStyle = bg; g.fillRect(0, 0, w, h);

    const r = moonRadius();
    const warp = phase === 'burst' ? 2.5 : phase === 'full' ? 0.06 : phase === 'hold' ? 0.015 + (holding ? progress * 0.55 : progress * 0.1) : 0.008;
    g.fillStyle = '#fff';
    for (const s of stars) {
      const prev = s.d;
      s.d += (s.d * warp + 2 * warp) * dt;
      if (s.d > diag * 0.62) { s.d = 4 + R() * 40; s.a = R() * Math.PI * 2; }
      const fade = Math.min(1, s.d / 90);
      const tw = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * s.sp + s.tw));
      const x = cx + Math.cos(s.a) * s.d, y = cy + Math.sin(s.a) * s.d;
      g.globalAlpha = tw * fade * 0.9;
      if (warp > 0.2) {
        const px = cx + Math.cos(s.a) * prev * 0.97, py = cy + Math.sin(s.a) * prev * 0.97;
        g.strokeStyle = '#fff'; g.lineWidth = s.s; g.beginPath(); g.moveTo(px, py); g.lineTo(x, y); g.stroke();
      } else if (s.s > 1.2) {
        g.beginPath(); g.arc(x, y, s.s, 0, Math.PI * 2); g.fill();
      } else g.fillRect(x - s.s / 2, y - s.s / 2, s.s, s.s);
    }
    g.globalAlpha = 1;

    if (r > 0) {
      const glowR = r * (2.7 + progress * 1.3);
      const gg = g.createRadialGradient(cx, cy, r * 0.85, cx, cy, glowR);
      gg.addColorStop(0, `rgba(255,226,160,${0.3 + 0.32 * progress})`);
      gg.addColorStop(0.35, `rgba(255,196,120,${0.09 + 0.12 * progress})`);
      gg.addColorStop(1, 'rgba(255,196,120,0)');
      g.fillStyle = gg; g.fillRect(cx - glowR, cy - glowR, glowR * 2, glowR * 2);
      g.drawImage(moonArt, cx - r, cy - r, r * 2, r * 2);
    }

    // mây trôi, tách ra khi đang giữ
    for (const c of clouds) {
      c.x += c.v * dt;
      if (c.x > 1.3) c.x = -1.3; if (c.x < -1.3) c.x = 1.3;
      const part = phase === 'seal' ? 0 : easeInOut(progress);
      const cw = w * 1.1 * c.s, ch = cw * 0.39;
      const x = cx + c.x * w + Math.sign(c.x || 1) * part * w * 0.6 - cw / 2;
      const y = cy + c.y * h - ch / 2 + (phase === 'seal' ? 0 : r0 * 0.4);
      g.globalAlpha = (phase === 'seal' ? 0.32 : 0.34) * (1 - part * 0.7);
      g.drawImage(cloudArt[c.art], x, y, cw, ch);
    }
    g.globalAlpha = 1;

    // hạt vàng xoáy vào trăng
    if (phase === 'hold' && holding) {
      const n = (18 + 90 * progress) * dt;
      for (let i = 0; i < n + (R() < n % 1 ? 1 : 0); i++) {
        sparks.push({ a: R() * Math.PI * 2, d: diag * (0.45 + R() * 0.2), va: (R() < 0.5 ? -1 : 1) * (0.6 + R() * 0.8), s: 0.8 + R() * 1.8, hue: R() });
      }
    }
    for (let i = sparks.length - 1; i >= 0; i--) {
      const p = sparks[i];
      p.a += p.va * dt * 0.6;
      p.d -= (140 + (diag * 0.6 - p.d) * 1.6) * dt;
      if (p.d < r * 0.98 || phase === 'burst') { sparks.splice(i, 1); continue; }
      const x = cx + Math.cos(p.a) * p.d, y = cy + Math.sin(p.a) * p.d;
      g.fillStyle = p.hue < 0.7 ? '#f7cf73' : p.hue < 0.9 ? '#fff4d6' : '#ff9fb4';
      g.globalAlpha = Math.min(1, (diag * 0.62 - p.d) / 60);
      g.beginPath(); g.arc(x, y, p.s, 0, Math.PI * 2); g.fill();
    }
    g.globalAlpha = 1;

    // vòng tiến trình
    if ((phase === 'full' || (phase === 'hold' && (holding || progress > 0.01))) && r > 0) {
      const rr = r + 16;
      g.lineWidth = 2; g.lineCap = 'round';
      g.strokeStyle = 'rgba(242,184,75,0.16)';
      g.beginPath(); g.arc(cx, cy, rr, 0, Math.PI * 2); g.stroke();
      g.strokeStyle = phase === 'full' ? `rgba(247,207,115,${0.7 + 0.3 * Math.sin(fullT * 4)})` : 'rgba(247,207,115,0.95)';
      g.beginPath(); g.arc(cx, cy, rr, -Math.PI / 2, -Math.PI / 2 + progress * Math.PI * 2); g.stroke();
    }
  }

  function frame(dt) {
    if (phase === 'done') return;
    t += dt;
    if (phase !== 'seal') openT += dt;
    if (phase === 'hold') {
      progress = holding ? Math.min(1, progress + dt / HOLD_TIME) : Math.max(0, progress - dt * 0.12);
      while (revealed < THRESHOLDS.length && progress >= THRESHOLDS[revealed]) {
        lines[revealed].classList.add('on'); revealed++; vibrate(12);
      }
      Sound.holdUpdate(progress, holding, dt);
      if (progress >= 1) reachFull();
    } else if (phase === 'full') {
      fullT += dt;
      if (fullT >= FULL_PAUSE) startBurst();
    } else if (phase === 'burst') {
      burstT += dt;
      if (burstT > 0.5 && !flash.dataset.on) {
        flash.dataset.on = '1';
        flash.style.transition = 'opacity .6s ease';
        flash.style.opacity = '1';
      }
      if (burstT > 1.2) {
        phase = 'done';
        canvas.style.display = 'none';
        ui.hidden = true;
        window.removeEventListener('keydown', onKey);
        window.removeEventListener('keyup', onKey);
        onComplete && onComplete();
        return;
      }
    }
    draw(dt);
  }

  resize();
  // phông chữ tải xong thì thơ có thể xuống dòng khác đi: xếp lại cho đúng
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => resize());
  return {
    frame, resize,
    active: () => phase !== 'done',
    skip() { if (phase === 'seal') open(); progress = 1; revealed = THRESHOLDS.length; lines.forEach((l) => l.classList.add('on')); startBurst(); },
  };
}
