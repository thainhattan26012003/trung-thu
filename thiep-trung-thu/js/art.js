// Các hình vẽ bằng canvas dùng chung cho màn mở đầu và cảnh 3D.

export function rng(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function canvas(w, h = w) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}

// Vầng trăng: nền ngà, biển tối mờ, miệng núi lửa và bóng cây đa – chú Cuội
export function makeMoonCanvas(size = 512) {
  const c = canvas(size), g = c.getContext('2d'), r = size / 2, R = rng(15082026);
  const base = g.createRadialGradient(r * 0.78, r * 0.72, r * 0.05, r, r, r);
  base.addColorStop(0, '#fffdf2'); base.addColorStop(0.55, '#fbf0cf'); base.addColorStop(1, '#ebd39a');
  g.fillStyle = base; g.beginPath(); g.arc(r, r, r, 0, Math.PI * 2); g.fill();

  g.save(); g.beginPath(); g.arc(r, r, r - 0.5, 0, Math.PI * 2); g.clip();
  const maria = [[0.62, 0.52, 0.25], [0.84, 0.36, 0.2], [1.02, 0.6, 0.17], [1.3, 0.46, 0.22], [1.38, 0.82, 0.15], [1.16, 1.28, 0.2], [0.55, 1.12, 0.12]];
  maria.forEach(([x, y, s]) => {
    blotch(g, x * r, y * r, s * r, 0.3);
    for (let i = 0; i < 3; i++) blotch(g, (x + (R() - 0.5) * s) * r, (y + (R() - 0.5) * s) * r, s * r * (0.4 + R() * 0.4), 0.18);
  });
  for (let i = 0; i < 46; i++) {
    const a = R() * Math.PI * 2, d = Math.sqrt(R()) * r * 0.92;
    crater(g, r + Math.cos(a) * d, r + Math.sin(a) * d, r * (0.012 + Math.pow(R(), 3) * 0.07));
  }
  drawBanyan(g, r);
  const limb = g.createRadialGradient(r, r, r * 0.55, r, r, r);
  limb.addColorStop(0, 'rgba(0,0,0,0)'); limb.addColorStop(1, 'rgba(150,110,50,0.3)');
  g.fillStyle = limb; g.fillRect(0, 0, size, size);
  g.restore();
  return c;
}

function blotch(g, x, y, s, a) {
  const gr = g.createRadialGradient(x, y, 0, x, y, s);
  gr.addColorStop(0, `rgba(176,150,104,${a})`); gr.addColorStop(1, 'rgba(176,150,104,0)');
  g.fillStyle = gr; g.beginPath(); g.arc(x, y, s, 0, Math.PI * 2); g.fill();
}

function crater(g, x, y, cr) {
  g.fillStyle = 'rgba(160,128,82,0.2)';
  g.beginPath(); g.arc(x, y, cr, 0, Math.PI * 2); g.fill();
  g.lineWidth = Math.max(1, cr * 0.2);
  g.strokeStyle = 'rgba(120,92,52,0.22)';
  g.beginPath(); g.arc(x, y, cr * 0.85, Math.PI * 0.95, Math.PI * 1.75); g.stroke();
  g.strokeStyle = 'rgba(255,253,240,0.55)';
  g.beginPath(); g.arc(x, y, cr * 0.95, Math.PI * -0.05, Math.PI * 0.75); g.stroke();
}

function drawBanyan(g, r) {
  g.save();
  g.fillStyle = g.strokeStyle = 'rgba(128,98,58,0.2)';
  const cx = r * 0.8, cy = r * 1.0;
  [[0, 0, 0.19], [-0.17, 0.05, 0.14], [0.18, 0.04, 0.15], [-0.08, -0.12, 0.14], [0.1, -0.13, 0.13], [0.29, 0.12, 0.09], [-0.28, 0.13, 0.09]]
    .forEach(([dx, dy, s]) => { g.beginPath(); g.arc(cx + dx * r, cy + dy * r, s * r, 0, Math.PI * 2); g.fill(); });
  g.beginPath();
  g.moveTo(cx - 0.05 * r, cy + 0.12 * r);
  g.quadraticCurveTo(cx - 0.02 * r, cy + 0.32 * r, cx - 0.1 * r, cy + 0.46 * r);
  g.lineTo(cx + 0.11 * r, cy + 0.46 * r);
  g.quadraticCurveTo(cx + 0.03 * r, cy + 0.3 * r, cx + 0.05 * r, cy + 0.12 * r);
  g.closePath(); g.fill();
  g.lineWidth = r * 0.009;
  for (let i = 0; i < 7; i++) {
    const x = cx + (-0.22 + i * 0.07) * r;
    g.beginPath(); g.moveTo(x, cy + 0.1 * r); g.lineTo(x + (i % 2 ? 0.01 : -0.01) * r, cy + (0.24 + (i % 3) * 0.05) * r); g.stroke();
  }
  g.beginPath(); g.ellipse(cx + 0.04 * r, cy + 0.47 * r, 0.3 * r, 0.035 * r, 0, 0, Math.PI * 2); g.fill();
  const px = cx + 0.22 * r, py = cy + 0.41 * r;           // chú Cuội ngồi dưới gốc đa
  g.beginPath(); g.arc(px, py - 0.075 * r, 0.026 * r, 0, Math.PI * 2); g.fill();
  g.beginPath(); g.moveTo(px - 0.04 * r, py + 0.05 * r); g.quadraticCurveTo(px, py - 0.07 * r, px + 0.036 * r, py + 0.05 * r); g.closePath(); g.fill();
  g.restore();
}

// Quầng sáng tròn (dùng làm glow cho đèn, trăng, đom đóm)
export function makeGlowCanvas(size = 128, soft = false) {
  const c = canvas(size), g = c.getContext('2d'), r = size / 2;
  const gr = g.createRadialGradient(r, r, 0, r, r, r);
  if (soft) {
    gr.addColorStop(0, 'rgba(255,255,255,0.9)'); gr.addColorStop(0.3, 'rgba(255,255,255,0.35)');
    gr.addColorStop(0.65, 'rgba(255,255,255,0.08)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  } else {
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.16, 'rgba(255,255,255,0.6)');
    gr.addColorStop(0.42, 'rgba(255,255,255,0.14)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  }
  g.fillStyle = gr; g.fillRect(0, 0, size, size);
  return c;
}

// Ngôi sao lấp lánh 4 cánh (đánh dấu chỗ có điều bí mật)
export function makeSparkleCanvas(size = 128) {
  const c = canvas(size), g = c.getContext('2d'), r = size / 2;
  const glow = g.createRadialGradient(r, r, 0, r, r, r * 0.5);
  glow.addColorStop(0, 'rgba(255,255,255,0.9)'); glow.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = glow; g.fillRect(0, 0, size, size);
  g.fillStyle = '#fff';
  g.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 - Math.PI / 2;
    const rr = i % 2 === 0 ? r * 0.96 : r * 0.1;
    g.lineTo(r + Math.cos(a) * rr, r + Math.sin(a) * rr);
  }
  g.closePath(); g.fill();
  return c;
}

export function makeHeartCanvas(size = 128) {
  const c = canvas(size), g = c.getContext('2d'), s = size / 128;
  g.translate(size / 2, size / 2 + 6 * s); g.scale(s, s);
  g.shadowColor = 'rgba(255,120,150,0.9)'; g.shadowBlur = 16;
  g.fillStyle = '#ff7a9a';
  g.beginPath();
  g.moveTo(0, 34);
  g.bezierCurveTo(-58, -4, -36, -52, 0, -22);
  g.bezierCurveTo(36, -52, 58, -4, 0, 34);
  g.fill();
  return c;
}

// Mây mỏng cho màn mở đầu
export function makeCloudCanvas(w = 512, h = 200, seed = 3) {
  const c = canvas(w, h), g = c.getContext('2d'), R = rng(seed);
  for (let i = 0; i < 16; i++) {
    const x = w * (0.15 + R() * 0.7), y = h * (0.45 + (R() - 0.5) * 0.35), s = h * (0.18 + R() * 0.28);
    const gr = g.createRadialGradient(x, y, 0, x, y, s);
    gr.addColorStop(0, 'rgba(210,205,240,0.55)'); gr.addColorStop(1, 'rgba(210,205,240,0)');
    g.fillStyle = gr; g.beginPath(); g.arc(x, y, s, 0, Math.PI * 2); g.fill();
  }
  return c;
}
