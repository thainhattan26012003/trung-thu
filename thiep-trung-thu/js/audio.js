// Âm thanh tự tạo bằng Web Audio: nhạc ngũ cung kiểu đàn tranh, trống lân, chuông.
// Không cần file nhạc nào. Nếu CONFIG.music có file mp3 thì dùng file đó làm nhạc nền.

let ctx = null, master, musicBus, sfxBus, reverb, echo, noise;
let muted = false, musicOn = false, timer = 0, nextT = 0, step = 0, melody = [];
let drone = null, holdAcc = 0, holdIdx = 0;
let song = null, keepAlive = null;

try { muted = localStorage.getItem('ttc-muted') === '1'; } catch (e) { /* bỏ qua */ }

export const IOS = /iP(hone|od|ad)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

// iPhone để chế độ im lặng sẽ tắt tiếng Web Audio. Phát kèm một đoạn <audio> im lặng lặp lại
// để máy chuyển sang chế độ "phát nhạc" — cách này hay dùng cho Safari và trình duyệt trong Zalo/Messenger.
function unlockSilentSwitch() {
  if (!IOS || keepAlive) return;
  try {
    const n = 800, buf = new Uint8Array(44 + n), dv = new DataView(buf.buffer);
    const put = (o, s) => { for (let i = 0; i < s.length; i++) buf[o + i] = s.charCodeAt(i); };
    put(0, 'RIFF'); dv.setUint32(4, 36 + n, true); put(8, 'WAVEfmt ');
    dv.setUint32(16, 16, true); dv.setUint16(20, 1, true); dv.setUint16(22, 1, true);
    dv.setUint32(24, 8000, true); dv.setUint32(28, 8000, true); dv.setUint16(32, 1, true); dv.setUint16(34, 8, true);
    put(36, 'data'); dv.setUint32(40, n, true); buf.fill(128, 44);
    keepAlive = new Audio(URL.createObjectURL(new Blob([buf], { type: 'audio/wav' })));
    keepAlive.loop = true;
    keepAlive.setAttribute('playsinline', '');
    keepAlive.setAttribute('x-webkit-airplay', 'deny');
    if (!muted) keepAlive.play().catch(() => {});
  } catch (e) { keepAlive = null; }
}

const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
const EIGHTH = 60 / 76 / 2;
const MEL = [62, 64, 66, 69, 71, 74, 76, 78, 81, 83];          // Rê trưởng ngũ cung
const CHORDS = [
  { root: 50, pad: [62, 66, 69], tones: [66, 69, 74, 78, 81] }, // D
  { root: 47, pad: [59, 62, 66], tones: [66, 71, 74, 78, 83] }, // Bm
  { root: 43, pad: [59, 62, 67], tones: [62, 69, 71, 74, 83] }, // G
  { root: 45, pad: [57, 62, 64], tones: [64, 69, 76, 81] },     // Asus4
];
const RHYTHMS = [[0, 3, 4, 6, 10, 12], [0, 2, 4, 7, 8, 12], [0, 4, 6, 8, 11], [0, 3, 6, 8, 10, 13]];

function init() {
  if (ctx) { if (ctx.state === 'suspended' && !muted) ctx.resume(); return true; }
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return false;
  try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) { /* Safari cũ */ }
  try { ctx = new AC(); } catch (e) { return false; }

  master = ctx.createGain();
  master.gain.value = muted ? 0 : 0.9;
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -16; comp.knee.value = 12; comp.ratio.value = 3;
  master.connect(comp); comp.connect(ctx.destination);

  const conv = ctx.createConvolver();
  conv.buffer = impulse(3.2, 2.6);
  reverb = ctx.createGain(); reverb.gain.value = 0.45;
  reverb.connect(conv); conv.connect(master);

  const dl = ctx.createDelay(2); dl.delayTime.value = EIGHTH * 3;
  const fb = ctx.createGain(); fb.gain.value = 0.3;
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2200;
  echo = ctx.createGain(); echo.gain.value = 0.22;
  echo.connect(dl); dl.connect(lp); lp.connect(fb); fb.connect(dl); lp.connect(master); lp.connect(reverb);

  musicBus = ctx.createGain(); musicBus.gain.value = 0;
  musicBus.connect(master); musicBus.connect(reverb); musicBus.connect(echo);
  sfxBus = ctx.createGain(); sfxBus.gain.value = 0.9;
  sfxBus.connect(master); sfxBus.connect(reverb);

  noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const d = noise.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;

  // Mở khóa âm thanh trên iOS bằng một buffer im lặng
  const s = ctx.createBufferSource();
  s.buffer = ctx.createBuffer(1, 1, 22050); s.connect(ctx.destination); s.start(0);
  if (ctx.state === 'suspended') ctx.resume();
  unlockSilentSwitch();

  // Sau khi chuyển app rồi quay lại, iPhone có thể "treo" âm thanh: chạm lần sau sẽ bật lại
  const wake = () => {
    if (!ctx || muted || document.hidden) return;
    if (ctx.state !== 'running') ctx.resume();
    if (keepAlive && keepAlive.paused) keepAlive.play().catch(() => {});
    if (song && musicOn && song.paused) song.play().catch(() => {});
  };
  document.addEventListener('touchend', wake, { passive: true });
  document.addEventListener('pointerup', wake);

  document.addEventListener('visibilitychange', () => {
    if (!ctx) return;
    if (document.hidden) { ctx.suspend(); if (song) song.pause(); if (keepAlive) keepAlive.pause(); }
    else wake();
  });
  return true;
}

const ready = () => !!ctx && ctx.state !== 'closed';
const now = () => ctx.currentTime;

function impulse(sec, decay) {
  const len = Math.floor(ctx.sampleRate * sec);
  const buf = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    let last = 0;
    for (let i = 0; i < len; i++) {
      last = last * 0.55 + (Math.random() * 2 - 1) * 0.45;   // làm mềm tiếng vang
      d[i] = last * Math.pow(1 - i / len, decay);
    }
  }
  return buf;
}

// Tiếng gảy dây, hơi luyến lên như đàn tranh, có rung ở đuôi
function pluck(midi, t, { vel = 0.18, dur = 2.2, bus = musicBus, bend = true, bright = 7 } = {}) {
  const f = mtof(midi);
  const o = ctx.createOscillator(); o.type = 'triangle';
  if (bend) { o.frequency.setValueAtTime(f * 0.972, t); o.frequency.exponentialRampToValueAtTime(f, t + 0.07); }
  else o.frequency.setValueAtTime(f, t);
  const o2 = ctx.createOscillator(); o2.type = 'sine'; o2.frequency.setValueAtTime(f * 2.004, t);
  const h = ctx.createGain(); h.gain.value = 0.28;
  const lfo = ctx.createOscillator(); lfo.frequency.value = 5.2;
  const lg = ctx.createGain(); lg.gain.setValueAtTime(0, t); lg.gain.linearRampToValueAtTime(f * 0.006, t + 0.55);
  lfo.connect(lg); lg.connect(o.frequency);
  const flt = ctx.createBiquadFilter(); flt.type = 'lowpass'; flt.Q.value = 0.6;
  flt.frequency.setValueAtTime(Math.min(f * bright, 12000), t);
  flt.frequency.exponentialRampToValueAtTime(Math.max(f * 1.6, 320), t + dur * 0.6);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vel, t + 0.006);
  g.gain.exponentialRampToValueAtTime(vel * 0.3, t + 0.3);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(flt); o2.connect(h); h.connect(flt); flt.connect(g); g.connect(bus);
  const end = t + dur + 0.1;
  o.start(t); o2.start(t); lfo.start(t); o.stop(end); o2.stop(end); lfo.stop(end);
}

function bell(midi, t, vel = 0.1, dur = 3, bus = sfxBus) {
  const f = mtof(midi);
  [[1, 1], [2.76, 0.42], [5.4, 0.18], [8.93, 0.07]].forEach(([r, a]) => {
    const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = f * r;
    const g = ctx.createGain(); const d = dur / (1 + r * 0.6);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vel * a, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g); g.connect(bus); o.start(t); o.stop(t + d + 0.05);
  });
}

function noiseHit(t, { dur = 0.1, type = 'bandpass', freq = 1000, q = 1, vel = 0.3, attack = 0.002 } = {}) {
  const s = ctx.createBufferSource(); s.buffer = noise; s.loop = true;
  const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vel, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(f); f.connect(g); g.connect(sfxBus);
  s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.05);
}

function padChord(notes, t, dur) {
  notes.forEach((m) => [-5, 5].forEach((det) => {
    const o = ctx.createOscillator(); o.type = 'triangle'; o.frequency.value = mtof(m); o.detune.value = det;
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 950;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.02, t + 1.4);
    g.gain.setValueAtTime(0.02, t + dur - 0.2);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 1.6);
    o.connect(f); f.connect(g); g.connect(musicBus);
    o.start(t); o.stop(t + dur + 1.7);
  }));
}

// ---------- Nhạc nền tự sáng tác (ngũ cung, lặp 8 ô nhịp có biến tấu) ----------
function compose() {
  const out = new Array(64).fill(null);
  let idx = 4;
  CHORDS.forEach((ch, ci) => {
    const rh = RHYTHMS[Math.floor(Math.random() * RHYTHMS.length)];
    rh.forEach((pos, k) => {
      let m;
      if (k === 0) {
        m = ch.tones.reduce((a, b) => (Math.abs(b - MEL[idx]) < Math.abs(a - MEL[idx]) ? b : a));
        idx = Math.max(0, MEL.indexOf(m));
        if (idx < 0) idx = 4;
      } else {
        const moves = k === rh.length - 1 ? [-1, -2, 1] : [-2, -1, 1, 2, 1, -1];
        idx = Math.min(MEL.length - 1, Math.max(0, idx + moves[Math.floor(Math.random() * moves.length)]));
        m = MEL[idx];
      }
      out[ci * 16 + pos] = { m, v: k === 0 ? 0.17 : 0.1 + Math.random() * 0.06 };
    });
  });
  return out;
}

function playStep(s, t) {
  const cyc = s % 64, ci = Math.floor(cyc / 16), inChord = cyc % 16;
  if (cyc === 0 && s > 0 && Math.floor(s / 64) % 2 === 0) melody = compose();
  const ch = CHORDS[ci];
  if (inChord === 0) {
    padChord(ch.pad, t, EIGHTH * 16);
    pluck(ch.root, t, { vel: 0.2, dur: 3.6, bright: 3, bend: false });
  }
  if (inChord === 8) pluck(ch.root + 7, t, { vel: 0.1, dur: 2.4, bright: 3, bend: false });
  const n = melody[cyc];
  if (n) pluck(n.m, t + (Math.random() - 0.5) * 0.012, { vel: n.v, dur: 2.2 });
  if (cyc === 62) bell(86, t, 0.03, 3, musicBus);
}

function schedule() {
  if (!ready() || ctx.state !== 'running') return;
  if (nextT < now() - 0.1) nextT = now() + 0.05;
  while (nextT < now() + 0.3) { playStep(step, nextT); nextT += EIGHTH; step++; }
}

// Bài hát riêng phát thẳng bằng <audio> (không đi qua Web Audio) để iPhone ít bị tắt tiếng hơn.
// iOS không cho chỉnh âm lượng bằng code, nên trên iPhone bài hát vào luôn ở mức bình thường.
function prepareSong(url) {           // gọi trong lúc người dùng chạm (để iOS cho phép phát)
  if (!url || song) return;
  song = new Audio(url); song.loop = true; song.preload = 'auto';
  song.setAttribute('playsinline', '');
  song.volume = 0;
  const p = song.play();
  if (p) p.then(() => { if (!musicOn) song.pause(); }).catch(() => {});
}

function fadeSong(to, sec) {
  if (!song) return;
  clearInterval(song._fade);
  const from = song.volume, t0 = performance.now();
  song._fade = setInterval(() => {
    const k = Math.min(1, (performance.now() - t0) / (sec * 1000));
    try { song.volume = from + (to - from) * k; } catch (e) { /* iOS: chỉ đọc */ }
    if (k >= 1) clearInterval(song._fade);
  }, 50);
}

function startMusic() {
  if (musicOn) return;
  if (song) {
    musicOn = true;
    song.currentTime = 0;
    if (!muted) song.play().catch(() => {});
    fadeSong(1, 3);
    return;
  }
  if (!ready()) return;
  musicOn = true;
  melody = compose(); step = 0; nextT = now() + 0.1;
  musicBus.gain.cancelScheduledValues(now());
  musicBus.gain.setValueAtTime(0.0001, now());
  musicBus.gain.exponentialRampToValueAtTime(0.85, now() + 3);
  timer = setInterval(schedule, 60);
  schedule();
}

function duck(sec) {
  if (!musicOn) return;
  if (song) { fadeSong(0.3, 0.2); clearTimeout(song._duck); song._duck = setTimeout(() => fadeSong(1, 1), sec * 1000); return; }
  if (!ready()) return;
  const g = musicBus.gain;
  g.cancelScheduledValues(now());
  g.setTargetAtTime(0.85 * 0.3, now(), 0.08);
  g.setTargetAtTime(0.85, now() + sec, 0.6);
}

// ---------- Hiệu ứng khi giữ vầng trăng ----------
function holdUpdate(p, holding, dt) {
  if (!ready() || ctx.state !== 'running') return;
  if (!drone) {
    const g = ctx.createGain(); g.gain.value = 0;
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 300;
    const oscs = [50, 57, 62].map((m, i) => {
      const o = ctx.createOscillator(); o.type = i ? 'triangle' : 'sine'; o.frequency.value = mtof(m);
      o.connect(f); o.start(); return o;
    });
    f.connect(g); g.connect(sfxBus);
    drone = { g, f, oscs };
  }
  drone.g.gain.setTargetAtTime(holding ? 0.035 + 0.06 * p : 0, now(), 0.25);
  drone.f.frequency.setTargetAtTime(300 + 2600 * p, now(), 0.2);
  if (holding) {
    holdAcc += dt;
    const iv = 0.5 - 0.36 * p;
    if (holdAcc > iv) {
      holdAcc = 0;
      const i = Math.min(MEL.length - 1, Math.floor(p * 7) + (holdIdx++ % 3));
      pluck(MEL[i], now() + 0.01, { vel: 0.06 + 0.08 * p, dur: 1.8, bus: sfxBus });
    }
  }
}

function holdEnd() {
  if (!drone) return;
  const d = drone; drone = null;
  d.g.gain.setTargetAtTime(0, now(), 0.5);
  d.oscs.forEach((o) => o.stop(now() + 3));
}

function bloom() {
  if (!ready()) return;
  const t = now() + 0.02;
  [62, 66, 69, 74, 78, 81, 86].forEach((m, i) => pluck(m, t + i * 0.045, { vel: 0.15, dur: 3.2, bus: sfxBus }));
  bell(86, t + 0.3, 0.09, 4); bell(93, t + 0.42, 0.05, 3.5);
  const s = ctx.createBufferSource(); s.buffer = noise; s.loop = true;
  const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 1.2;
  f.frequency.setValueAtTime(300, t); f.frequency.exponentialRampToValueAtTime(5000, t + 1.1);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.16, t + 0.7); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.6);
  s.connect(f); f.connect(g); g.connect(sfxBus); s.start(t); s.stop(t + 1.7);
  const o = ctx.createOscillator(); o.frequency.setValueAtTime(90, t + 0.6); o.frequency.exponentialRampToValueAtTime(40, t + 1.6);
  const og = ctx.createGain();
  og.gain.setValueAtTime(0.0001, t + 0.6); og.gain.exponentialRampToValueAtTime(0.35, t + 0.62); og.gain.exponentialRampToValueAtTime(0.0001, t + 2);
  o.connect(og); og.connect(sfxBus); o.start(t + 0.6); o.stop(t + 2.1);
}

function chime() {
  if (!ready()) return;
  const t = now() + 0.01;
  [81, 86, 90].forEach((m, i) => bell(m, t + i * 0.09, 0.08, 2.4));
}

function tick() { if (ready()) pluck(93, now() + 0.005, { vel: 0.035, dur: 0.5, bus: sfxBus, bend: false }); }

function hop() {
  if (!ready()) return;
  const t = now() + 0.01;
  const o = ctx.createOscillator(); o.type = 'sine';
  o.frequency.setValueAtTime(380, t); o.frequency.exponentialRampToValueAtTime(980, t + 0.12);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.12, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
  o.connect(g); g.connect(sfxBus); o.start(t); o.stop(t + 0.25);
}

// ---------- Trống lân: tùng tùng cắc ----------
function tung(t) {
  const o = ctx.createOscillator(); o.type = 'sine';
  o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(58, t + 0.2);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.9, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.55);
  o.connect(g); g.connect(sfxBus); o.start(t); o.stop(t + 0.6);
  const o2 = ctx.createOscillator(); o2.type = 'triangle';   // bồi âm để loa điện thoại nghe rõ
  o2.frequency.setValueAtTime(260, t); o2.frequency.exponentialRampToValueAtTime(120, t + 0.12);
  const g2 = ctx.createGain();
  g2.gain.setValueAtTime(0.0001, t); g2.gain.exponentialRampToValueAtTime(0.32, t + 0.003); g2.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
  o2.connect(g2); g2.connect(sfxBus); o2.start(t); o2.stop(t + 0.2);
  noiseHit(t, { dur: 0.09, type: 'lowpass', freq: 1400, vel: 0.32 });
}
function cac(t) {
  const o = ctx.createOscillator(); o.type = 'square'; o.frequency.setValueAtTime(1250, t);
  const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1900; f.Q.value = 6;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.5, t + 0.002); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.07);
  o.connect(f); f.connect(g); g.connect(sfxBus); o.start(t); o.stop(t + 0.1);
  noiseHit(t, { dur: 0.04, type: 'highpass', freq: 3000, vel: 0.22 });
}
function xeng(t) {
  noiseHit(t, { dur: 0.9, type: 'highpass', freq: 5200, vel: 0.2, attack: 0.003 });
  noiseHit(t, { dur: 0.35, type: 'bandpass', freq: 3200, q: 2, vel: 0.16 });
}

const LION_PATTERN = [[0, 'T'], [1, 'T'], [2, 'C'], [4, 'T'], [5, 'T'], [6, 'C'], [8, 'T'], [9, 'C'], [10, 'T'], [11, 'T'], [12, 'X'],
  [14, 'T'], [15, 'C'], [16, 'T'], [17, 'T'], [18, 'X']];
const LION_STEP = 0.16;

// Trả về các nhịp để cảnh 3D cho lân nhảy khớp tiếng trống (kể cả khi đang tắt tiếng)
function lionDrums() {
  const beats = LION_PATTERN.map(([i, k]) => ({ at: 0.05 + i * LION_STEP, kind: k }));
  if (ready() && ctx.state === 'running') {
    const t0 = now();
    duck(3.4);
    beats.forEach((b) => { const t = t0 + b.at; if (b.kind === 'T') tung(t); else if (b.kind === 'C') cac(t); else xeng(t); });
  }
  return beats;
}

function wishRise() {
  if (!ready()) return;
  const t = now() + 0.02;
  [69, 74, 78, 81, 86, 90, 93].forEach((m, i) => pluck(m, t + i * 0.12, { vel: 0.1, dur: 2.6, bus: sfxBus }));
  bell(98, t + 1, 0.04, 4);
  duck(4);
}

function setMuted(m) {
  muted = m;
  try { localStorage.setItem('ttc-muted', m ? '1' : '0'); } catch (e) { /* bỏ qua */ }
  if (song) { if (m) song.pause(); else if (musicOn) song.play().catch(() => {}); }
  if (keepAlive) { if (m) keepAlive.pause(); else keepAlive.play().catch(() => {}); }
  if (!ready()) return;
  master.gain.setTargetAtTime(m ? 0 : 0.9, now(), 0.08);
  if (!m && ctx.state !== 'running') ctx.resume();
}

export const Sound = {
  init, ready, prepareSong, startMusic, holdUpdate, holdEnd, bloom, chime, tick, hop, lionDrums, wishRise, setMuted,
  isMuted: () => muted,
};
