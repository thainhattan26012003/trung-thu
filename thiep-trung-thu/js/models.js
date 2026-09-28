// Dựng các vật thể 3D bằng hình khối cơ bản: đảo nổi, cây đa, đèn lồng, đèn ông sao, mâm cỗ.
import { rng } from './art.js';

export let THREE = null;
export const TX = {};
export function setup(three, textures) { THREE = three; Object.assign(TX, textures); }

export const std = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.8, metalness: 0, ...o });
const R = rng(2026);

export function canvasTex(w, h, draw, srgb = true) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

export function glowSprite(color, scale, opacity = 1, soft = false) {
  const m = new THREE.SpriteMaterial({ map: soft ? TX.glowSoft : TX.glow, color, transparent: true, opacity,
    depthWrite: false, blending: THREE.AdditiveBlending, fog: false });
  const s = new THREE.Sprite(m); s.scale.setScalar(scale);
  return s;
}

export function blobShadow(radius, opacity = 0.45) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(radius * 2, radius * 2),
    new THREE.MeshBasicMaterial({ map: TX.shadow, transparent: true, opacity, depthWrite: false }));
  m.rotation.x = -Math.PI / 2; m.position.y = 0.012; m.renderOrder = 1;
  return m;
}

// Chấm sáng lấp lánh (đèn nháy, đom đóm, sao trời) – một draw call cho cả đám
export function twinklePoints(positions, colors, { size = 6, attenuate = true, drift = 0, speed = 1 } = {}) {
  const geo = new THREE.BufferGeometry();
  const n = positions.length / 3, phase = new Float32Array(n);
  for (let i = 0; i < n; i++) phase[i] = R() * 100;
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geo.setAttribute('aPhase', new THREE.Float32BufferAttribute(phase, 1));
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, vertexColors: true,
    uniforms: { uTime: { value: 0 }, uSize: { value: size * Math.min(window.devicePixelRatio || 1, 2) }, uDrift: { value: drift }, uSpeed: { value: speed }, uAlpha: { value: 1 } },
    vertexShader: `
      uniform float uTime, uSize, uDrift, uSpeed; attribute float aPhase; varying vec3 vColor; varying float vTw;
      void main() {
        vec3 p = position;
        p += uDrift * vec3(sin(uTime * 0.6 + aPhase), sin(uTime * 0.9 + aPhase * 1.7) * 0.5, cos(uTime * 0.5 + aPhase * 1.3));
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        vTw = 0.55 + 0.45 * sin(uTime * uSpeed * (1.2 + fract(aPhase) * 2.0) + aPhase);
        vColor = color;
        gl_PointSize = uSize * (0.7 + 0.5 * vTw) ${attenuate ? '* (14.0 / -mv.z)' : ''};
      }`,
    fragmentShader: `
      uniform float uAlpha; varying vec3 vColor; varying float vTw;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        float a = smoothstep(0.5, 0.0, d); a *= a;
        gl_FragColor = vec4(vColor * (0.6 + 0.8 * vTw), a * uAlpha);
      }`,
  });
  const pts = new THREE.Points(geo, mat);
  pts.frustumCulled = false;
  return pts;
}

// ---------------- Đảo nổi ----------------
export function makeIsland() {
  const g = new THREE.Group();
  const grassGeo = new THREE.RingGeometry(0.01, 5.4, 72, 12);
  grassGeo.rotateX(-Math.PI / 2);
  const p = grassGeo.attributes.position, cols = [];
  const cA = new THREE.Color('#2c6448'), cB = new THREE.Color('#1b4533'), cC = new THREE.Color('#3f7d50'), c = new THREE.Color();
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i), rr = Math.hypot(x, z);
    const n = Math.sin(x * 1.3 + z * 0.7) * 0.5 + Math.sin(x * 0.45 - z * 1.7 + 1.3) * 0.5;
    p.setY(i, rr < 5.2 ? (Math.sin(x * 0.9) * Math.cos(z * 0.8)) * 0.05 : 0);
    c.copy(cA).lerp(n > 0 ? cC : cB, Math.abs(n) * 0.8);
    c.lerp(cB, Math.max(0, (rr - 4.2) / 1.2) * 0.6);
    cols.push(c.r, c.g, c.b);
  }
  grassGeo.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
  grassGeo.computeVertexNormals();
  const grass = new THREE.Mesh(grassGeo, std('#ffffff', { vertexColors: true, roughness: 0.95 }));
  g.add(grass);

  const rim = new THREE.Mesh(new THREE.CylinderGeometry(5.4, 5.2, 0.5, 72, 1, true), std('#4a3629', { roughness: 1 }));
  rim.position.y = -0.25; g.add(rim);

  const rockGeo = new THREE.ConeGeometry(5.2, 5.6, 20, 5, true);
  rockGeo.rotateX(Math.PI);
  const rp = rockGeo.attributes.position, rc = [], top = new THREE.Color('#4a3629'), bottom = new THREE.Color('#231f33');
  for (let i = 0; i < rp.count; i++) {
    const x = rp.getX(i), y = rp.getY(i), z = rp.getZ(i);
    const k = (y + 2.8) / 5.6;                                   // 1 ở mép trên, 0 ở chóp dưới
    if (k < 0.98) {
      const h = Math.sin(Math.round(x * 50) * 12.9898 + Math.round(z * 50) * 78.233 + Math.round(y * 50) * 37.719) * 43758.5453;
      const j = (h - Math.floor(h)) - 0.5;
      rp.setX(i, x * (1 + j * 0.28)); rp.setZ(i, z * (1 + j * 0.28)); rp.setY(i, y + j * 0.35);
    }
    const cc = bottom.clone().lerp(top, Math.pow(Math.max(0, k), 0.7));
    rc.push(cc.r, cc.g, cc.b);
  }
  rockGeo.setAttribute('color', new THREE.Float32BufferAttribute(rc, 3));
  rockGeo.computeVertexNormals();
  const rock = new THREE.Mesh(rockGeo, std('#ffffff', { vertexColors: true, flatShading: true, roughness: 1 }));
  rock.position.y = -0.5 - 2.8; g.add(rock);

  // đá bay lơ lửng quanh đảo
  const floaters = [];
  for (let i = 0; i < 6; i++) {
    const m = new THREE.Mesh(new THREE.DodecahedronGeometry(0.25 + R() * 0.35, 0), std('#3d3140', { flatShading: true, roughness: 1 }));
    const a = (i / 6) * Math.PI * 2 + R();
    m.position.set(Math.cos(a) * (6.3 + R() * 1.5), -1 - R() * 2.5, Math.sin(a) * (6.3 + R() * 1.5));
    m.userData.base = m.position.y; m.userData.ph = R() * 6;
    g.add(m); floaters.push(m);
  }

  // cỏ và hoa nhỏ
  const avoid = [[0, 0.35, 1.55], [1.6, -2.6, 1.3], [2.7, -0.3, 1.2], [-2.7, -1.9, 0.8], [2.95, 1.65, 0.5], [-1.5, 2.2, 0.5], [-3.0, 1.1, 0.6], [-3.55, 2.35, 0.3]];
  const ok = (x, z) => avoid.every(([ax, az, ar]) => Math.hypot(x - ax, z - az) > ar);
  const spots = (n, rmax) => {
    const out = [];
    while (out.length < n) {
      const a = R() * Math.PI * 2, d = Math.sqrt(R()) * rmax, x = Math.cos(a) * d, z = Math.sin(a) * d;
      if (ok(x, z)) out.push([x, z]);
    }
    return out;
  };
  const tuft = new THREE.InstancedMesh(new THREE.ConeGeometry(0.05, 0.3, 4), std('#ffffff', { roughness: 0.9 }), 170);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), s = new THREE.Vector3(), v = new THREE.Vector3();
  spots(170, 5.15).forEach(([x, z], i) => {
    e.set((R() - 0.5) * 0.5, R() * 3, (R() - 0.5) * 0.5); q.setFromEuler(e);
    const sc = 0.6 + R() * 0.9; s.set(sc, sc, sc); v.set(x, 0.12 * sc, z);
    tuft.setMatrixAt(i, m4.compose(v, q, s));
    tuft.setColorAt(i, c.set(['#2f6f4a', '#3b8052', '#24583f', '#4a8c55'][i % 4]));
  });
  g.add(tuft);
  const flower = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.05, 0), new THREE.MeshBasicMaterial({ color: '#ffffff' }), 34);
  spots(34, 5.0).forEach(([x, z], i) => {
    v.set(x, 0.08, z); q.identity(); const k = 0.8 + R() * 0.6; s.set(k, k, k);
    flower.setMatrixAt(i, m4.compose(v, q, s));
    flower.setColorAt(i, c.set(['#f7b7d2', '#fff1c1', '#c9b8ff', '#ffd08a'][i % 4]).multiplyScalar(0.55));
  });
  g.add(flower);

  // lối đá dẫn vào mâm cỗ
  const stoneMat = std('#6c6878', { roughness: 0.9 });
  [[0.1, 4.7], [-0.25, 4.05], [0.15, 3.4], [-0.15, 2.75], [0.2, 2.15]].forEach(([x, z], i) => {
    const st = new THREE.Mesh(new THREE.CylinderGeometry(0.26 + (i % 2) * 0.04, 0.29, 0.07, 9), stoneMat);
    st.position.set(x, 0.02, z); st.rotation.y = R() * 3; g.add(st);
  });

  return { group: g, floaters };
}

// ---------------- Hồ sen với hoa đăng ----------------
export function makePond() {
  const g = new THREE.Group();
  const water = new THREE.Mesh(new THREE.CircleGeometry(1.08, 48), std('#0c1d4a', { roughness: 0.12, metalness: 0.75, emissive: '#050b24' }));
  water.rotation.x = -Math.PI / 2; water.position.y = 0.025; g.add(water);
  const shine = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 1.9), new THREE.MeshBasicMaterial({ map: TX.glowSoft, color: '#ffe3a3', transparent: true, opacity: 0.45, depthWrite: false, blending: THREE.AdditiveBlending }));
  shine.rotation.x = -Math.PI / 2; shine.position.set(0, 0.03, 0.05); g.add(shine);
  const stoneMat = std('#5d5968', { flatShading: true, roughness: 1 });
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2, st = new THREE.Mesh(new THREE.DodecahedronGeometry(0.11 + R() * 0.07, 0), stoneMat);
    st.position.set(Math.cos(a) * 1.14, 0.04, Math.sin(a) * 1.14); st.scale.y = 0.6; g.add(st);
  }
  const leafMat = std('#2f7a4a', { roughness: 0.7, side: THREE.DoubleSide });
  [[-0.5, 0.3], [0.45, 0.45], [0.2, -0.55]].forEach(([x, z]) => {
    const leaf = new THREE.Mesh(new THREE.CircleGeometry(0.2, 16, 0.4, Math.PI * 2 - 0.5), leafMat);
    leaf.rotation.x = -Math.PI / 2; leaf.rotation.z = R() * 6; leaf.position.set(x, 0.035, z); g.add(leaf);
  });
  const petalGeo = new THREE.SphereGeometry(0.1, 10, 8); petalGeo.scale(0.42, 0.3, 1); petalGeo.translate(0, 0, 0.09);
  const petalMat = std('#ff9dbd', { emissive: '#ff4f86', emissiveIntensity: 0.55, roughness: 0.5 });
  const lotuses = [];
  [[-0.3, -0.2], [0.35, 0.05], [-0.05, 0.5]].forEach(([x, z], k) => {
    const l = new THREE.Group();
    for (let ring = 0; ring < 2; ring++) {
      for (let i = 0; i < 8; i++) {
        const pt = new THREE.Mesh(petalGeo, petalMat);
        pt.rotation.y = (i / 8) * Math.PI * 2 + ring * 0.4;
        pt.rotation.x = -(0.35 + ring * 0.45);
        pt.scale.setScalar(1 - ring * 0.25);
        const holder = new THREE.Group(); holder.rotation.y = pt.rotation.y; pt.rotation.y = 0; holder.add(pt); l.add(holder);
      }
    }
    const candle = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.028, 0.07, 8), std('#fff4dc', { emissive: '#ffcf7a', emissiveIntensity: 0.4 }));
    candle.position.y = 0.05; l.add(candle);
    const fl = glowSprite('#ffc46b', 0.55, 0.9); fl.position.y = 0.12; l.add(fl);
    l.position.set(x, 0.05, z); l.scale.setScalar(0.9); l.userData.ph = k * 2.1;
    g.add(l); lotuses.push(l);
  });
  return { group: g, lotuses, shine };
}

// ---------------- Đèn lồng đỏ ----------------
const lanternCache = {};
function lanternParts(color, emissive) {
  const key = color + emissive;
  if (lanternCache[key]) return lanternCache[key];
  const pts = [];
  for (let i = 0; i <= 16; i++) { const t = i / 16; pts.push(new THREE.Vector2(0.13 + 0.34 * Math.sin(Math.PI * t), (t - 0.5) * 0.86)); }
  const ribs = canvasTex(128, 64, (g, w, h) => {
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(0,0,0,0.35)';
    for (let i = 0; i < 12; i++) g.fillRect((i / 12) * w, 0, 2, h);
    g.fillStyle = 'rgba(255,210,120,0.9)'; g.fillRect(0, 6, w, 3); g.fillRect(0, h - 9, w, 3);
  });
  lanternCache[key] = {
    body: new THREE.LatheGeometry(pts, 20),
    mat: std(color, { map: ribs, emissive, emissiveMap: ribs, emissiveIntensity: 1.25, roughness: 0.55 }),
    cap: new THREE.CylinderGeometry(0.14, 0.16, 0.08, 14),
    capMat: std('#d9a441', { metalness: 0.6, roughness: 0.35, emissive: '#3a2400' }),
    tassel: new THREE.CylinderGeometry(0.01, 0.05, 0.3, 6),
    tasselMat: std('#ffcf4a', { emissive: '#7a4a00', emissiveIntensity: 0.6 }),
  };
  return lanternCache[key];
}

export function makeLantern({ color = '#d62828', emissive = '#ff3b1f', glow = '#ff6a3d', scale = 1, light = 0 } = {}) {
  const P = lanternParts(color, emissive), g = new THREE.Group();
  g.add(new THREE.Mesh(P.body, P.mat));
  const top = new THREE.Mesh(P.cap, P.capMat); top.position.y = 0.45; g.add(top);
  const bot = new THREE.Mesh(P.cap, P.capMat); bot.position.y = -0.45; g.add(bot);
  const tas = new THREE.Mesh(P.tassel, P.tasselMat); tas.position.y = -0.64; g.add(tas);
  const gl = glowSprite(glow, 2.3, 0.6); g.add(gl);
  if (light) { const l = new THREE.PointLight(glow, light, 7, 2); g.add(l); g.userData.light = l; }
  g.scale.setScalar(scale);
  g.userData.glow = gl;
  return g;
}

// ---------------- Cây đa với đèn nháy và đèn lồng ----------------
export function makeTree() {
  const g = new THREE.Group();
  const bark = std('#5a3b2a', { flatShading: true, roughness: 1 });
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.36, 2.6, 9), bark);
  trunk.position.y = 1.3; g.add(trunk);
  for (let i = 0; i < 5; i++) {
    const root = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.8, 5), bark);
    const a = (i / 5) * Math.PI * 2;
    root.position.set(Math.cos(a) * 0.3, 0.15, Math.sin(a) * 0.3);
    root.rotation.set(Math.sin(a) * 1.1, 0, -Math.cos(a) * 1.1); g.add(root);
  }
  [[0.6, 2.3, 0.1, -0.9], [-0.55, 2.2, 0.2, 0.9], [0.1, 2.4, -0.5, 0.2]].forEach(([x, y, z, rz]) => {
    const b = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.12, 1.2, 6), bark);
    b.position.set(x * 0.6, y, z * 0.6); b.rotation.z = rz; b.rotation.x = z; g.add(b);
  });
  const leafMats = ['#1f4d3a', '#2a5e45', '#234f3f'].map((c) => std(c, { flatShading: true, roughness: 0.9 }));
  const blobs = [[0, 3.3, 0, 1.05], [0.95, 3.0, 0.2, 0.8], [-0.95, 3.0, 0.1, 0.82], [0.3, 3.1, 0.85, 0.75], [-0.35, 3.05, -0.8, 0.78],
    [0.5, 3.75, -0.3, 0.7], [-0.5, 3.7, 0.4, 0.68], [1.3, 2.75, -0.5, 0.55], [-1.3, 2.7, -0.4, 0.55]];
  const lights = [];
  blobs.forEach(([x, y, z, r], i) => {
    const m = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 1), leafMats[i % 3]);
    m.position.set(x, y, z); m.rotation.set(R() * 3, R() * 3, 0); g.add(m);
    for (let k = 0; k < 6; k++) {
      const a = R() * Math.PI * 2, b = (R() - 0.2) * Math.PI * 0.6;
      lights.push(x + Math.cos(a) * Math.cos(b) * r * 1.02, y + Math.sin(b) * r * 1.02, z + Math.sin(a) * Math.cos(b) * r * 1.02);
    }
  });
  const rootMat = std('#4a3122', { roughness: 1 });
  for (let i = 0; i < 12; i++) {
    const len = 0.5 + R() * 1.0, a = R() * Math.PI * 2, d = 0.4 + R() * 0.9;
    const rt = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.016, len, 4), rootMat);
    rt.position.set(Math.cos(a) * d, 2.55 - len / 2, Math.sin(a) * d); g.add(rt);
  }
  const lc = [];
  for (let i = 0; i < lights.length / 3; i++) { const warm = R() < 0.75; lc.push(1, warm ? 0.82 : 0.6, warm ? 0.5 : 0.75); }
  const fairy = twinklePoints(lights, lc, { size: 7, speed: 1.6 });
  g.add(fairy);

  const lanterns = [];
  [[0.75, 2.05, 0.6, 1.0], [-0.8, 2.0, 0.45, 0.8], [0.15, 1.9, -0.75, 0.9]].forEach(([x, y, z, len], i) => {
    const pivot = new THREE.Group(); pivot.position.set(x, y + len * 0.5, z);
    const str = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, len * 0.5, 4), std('#2a1a12'));
    str.position.y = -len * 0.25; pivot.add(str);
    const l = makeLantern({ scale: 0.52, light: i === 0 ? 7 : 0 });
    l.position.y = -len * 0.5 - 0.24; pivot.add(l);
    pivot.userData.ph = i * 1.7; g.add(pivot); lanterns.push(pivot);
  });
  g.add(Object.assign(blobShadow(1.6, 0.5), {}));
  return { group: g, lanterns, fairy };
}

// ---------------- Dây đèn lồng giăng ngang ----------------
export function makeLanternString(from, to, sag = 0.6) {
  const g = new THREE.Group(), pts = [];
  for (let i = 0; i <= 24; i++) {
    const t = i / 24, p = new THREE.Vector3().lerpVectors(from, to, t);
    p.y -= sag * 4 * t * (1 - t); pts.push(p);
  }
  const curve = new THREE.CatmullRomCurve3(pts);
  g.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 48, 0.012, 4, false), std('#2a1a12')));
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.065, to.y + 0.2, 8), std('#b8a36a', { roughness: 0.7 }));
  pole.position.set(to.x, (to.y + 0.2) / 2, to.z); g.add(pole);
  for (let y = 0.5; y < to.y; y += 0.55) {
    const node = new THREE.Mesh(new THREE.TorusGeometry(0.058, 0.012, 4, 12), std('#8f7b45'));
    node.rotation.x = Math.PI / 2; node.position.set(to.x, y, to.z); g.add(node);
  }
  const palette = [
    { color: '#d62828', emissive: '#ff3b1f', glow: '#ff6a3d' },
    { color: '#f2a93b', emissive: '#ff9a1f', glow: '#ffc46b' },
    { color: '#e0457b', emissive: '#ff4f86', glow: '#ff8fb1' },
  ];
  const swings = [];
  [0.17, 0.33, 0.5, 0.67, 0.83].forEach((t, i) => {
    const p = curve.getPoint(t), pivot = new THREE.Group(); pivot.position.copy(p);
    const str = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.16, 4), std('#2a1a12'));
    str.position.y = -0.08; pivot.add(str);
    const l = makeLantern({ ...palette[i % 3], scale: 0.42, light: i === 2 ? 5 : 0 });
    l.position.y = -0.36; pivot.add(l);
    pivot.userData.ph = i * 1.3; g.add(pivot); swings.push(pivot);
  });
  return { group: g, swings };
}

// ---------------- Đèn ông sao ----------------
export function makeStarLantern() {
  const g = new THREE.Group();
  const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.03, 1.9, 6), std('#b8a36a', { roughness: 0.7 }));
  stick.position.y = 0.95; g.add(stick);
  const shape = new THREE.Shape();
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 + Math.PI / 2, r = i % 2 === 0 ? 0.52 : 0.23;
    const x = Math.cos(a) * r, y = Math.sin(a) * r;
    if (i === 0) shape.moveTo(x, y); else shape.lineTo(x, y);
  }
  shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.16, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.035, bevelSegments: 2 });
  geo.center();
  const star = new THREE.Group(); star.position.y = 2.05;
  star.add(new THREE.Mesh(geo, std('#e63b2e', { emissive: '#ff4a22', emissiveIntensity: 1.3, roughness: 0.45 })));
  const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geo, 25), new THREE.LineBasicMaterial({ color: '#ffd166' }));
  star.add(edges);
  const tasMat = std('#ffd166', { emissive: '#7a4a00', emissiveIntensity: 0.6 });
  [-1, 1].forEach((sx) => {
    const t = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.035, 0.26, 6), tasMat);
    t.position.set(sx * 0.3, -0.52, 0); star.add(t);
  });
  star.add(glowSprite('#ffb35c', 2.8, 0.7));
  const light = new THREE.PointLight('#ffa550', 6, 7, 2); star.add(light);
  g.add(star);
  g.add(blobShadow(0.45, 0.35));
  return { group: g, star, light };
}

// ---------------- Mâm cỗ Trung Thu ----------------
function flowerShape(Rr, a0 = 0, a1 = Math.PI * 2, toCenter = false) {
  const s = new THREE.Shape(), N = 110;
  if (toCenter) s.moveTo(0, 0);
  for (let i = 0; i <= N; i++) {
    const a = a0 + ((a1 - a0) * i) / N, r = Rr * (1 + 0.06 * Math.cos(10 * a));
    const x = Math.cos(a) * r, y = Math.sin(a) * r;
    if (i === 0 && !toCenter) s.moveTo(x, y); else s.lineTo(x, y);
  }
  s.closePath();
  return s;
}

const cakeTex = {};
function cakeMats(kind) {
  if (cakeTex[kind]) return cakeTex[kind];
  const nuong = kind === 'nuong';
  const top = canvasTex(256, 256, (g, w) => {
    const r = w / 2;
    const bg = g.createRadialGradient(r * 0.9, r * 0.85, 10, r, r, r);
    bg.addColorStop(0, nuong ? '#eab066' : '#fbf7ec'); bg.addColorStop(1, nuong ? '#b36a2c' : '#e4d9c1');
    g.fillStyle = bg; g.fillRect(0, 0, w, w);
    const dark = nuong ? 'rgba(105,50,16,0.6)' : 'rgba(150,128,96,0.45)', light = nuong ? 'rgba(255,220,160,0.55)' : 'rgba(255,255,255,0.8)';
    const stroke = (fn, off) => { g.save(); g.translate(off, off); fn(); g.restore(); };
    const pattern = () => {
      g.lineWidth = 4;
      g.beginPath();
      for (let i = 0; i <= 120; i++) { const a = (i / 120) * Math.PI * 2, rr = r * 0.8 * (1 + 0.05 * Math.cos(10 * a)); g.lineTo(r + Math.cos(a) * rr, r + Math.sin(a) * rr); }
      g.stroke();
      g.beginPath(); g.arc(r, r, r * 0.52, 0, Math.PI * 2); g.stroke();
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        g.beginPath(); g.ellipse(r + Math.cos(a) * r * 0.66, r + Math.sin(a) * r * 0.66, r * 0.1, r * 0.05, a, 0, Math.PI * 2); g.stroke();
      }
      g.beginPath();
      if (nuong) {                                         // trái tim ở giữa bánh nướng
        g.moveTo(r, r + r * 0.25);
        g.bezierCurveTo(r - r * 0.42, r - r * 0.02, r - r * 0.24, r - r * 0.38, r, r - r * 0.14);
        g.bezierCurveTo(r + r * 0.24, r - r * 0.38, r + r * 0.42, r - r * 0.02, r, r + r * 0.25);
      } else {
        for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2 - Math.PI / 2; g.moveTo(r, r); g.ellipse(r + Math.cos(a) * r * 0.18, r + Math.sin(a) * r * 0.18, r * 0.16, r * 0.09, a, 0, Math.PI * 2); }
      }
      g.stroke();
    };
    g.strokeStyle = light; stroke(pattern, 2);
    g.strokeStyle = dark; stroke(pattern, 0);
  });
  const Rt = 0.2 * 1.06 + 0.025;
  top.repeat.set(1 / (2 * Rt), 1 / (2 * Rt)); top.offset.set(0.5, 0.5);
  const fill = canvasTex(128, 64, (g, w, h) => {
    g.fillStyle = nuong ? '#7b4a26' : '#d8c07a'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 140; i++) { g.fillStyle = `rgba(${nuong ? '60,30,10' : '160,130,60'},${0.2 + Math.random() * 0.3})`; g.fillRect(Math.random() * w, Math.random() * h, 2, 2); }
    g.fillStyle = nuong ? '#b8702f' : '#ece3cc'; g.fillRect(0, 0, w, 7); g.fillRect(0, h - 7, w, 7);
    if (nuong) {
      const yg = g.createRadialGradient(0, h / 2, 2, 0, h / 2, 24);
      yg.addColorStop(0, '#ffc24a'); yg.addColorStop(1, '#e5731c');
      g.fillStyle = yg; g.beginPath(); g.arc(0, h / 2, 22, -Math.PI / 2, Math.PI / 2); g.fill();
    }
  });
  cakeTex[kind] = {
    top: std('#ffffff', { map: top, bumpMap: top, bumpScale: 1.5, roughness: nuong ? 0.55 : 0.75 }),
    side: std(nuong ? '#a9622a' : '#e9e0cc', { roughness: 0.65 }),
    fill: std('#ffffff', { map: fill, roughness: 0.8, side: THREE.DoubleSide }),
  };
  return cakeTex[kind];
}

export function makeMooncake(kind = 'nuong', cut = null, Rr = 0.2, H = 0.12) {
  const M = cakeMats(kind), bev = 0.025, g = new THREE.Group();
  let a0 = 0, a1 = Math.PI * 2;
  if (cut === 'cut') a1 = Math.PI * 1.5;
  if (cut === 'wedge') { a0 = Math.PI * 1.5; a1 = Math.PI * 2; }
  const geo = new THREE.ExtrudeGeometry(flowerShape(Rr, a0, a1, !!cut), { depth: H, bevelEnabled: true, bevelThickness: bev, bevelSize: bev, bevelSegments: 3, curveSegments: 1 });
  geo.rotateX(-Math.PI / 2); geo.translate(0, bev, 0);
  g.add(new THREE.Mesh(geo, [M.top, M.side]));
  if (cut) {
    const fg = new THREE.PlaneGeometry(Rr, H + bev * 1.6); fg.translate(Rr / 2, (H + bev * 2) / 2, 0);
    const signs = cut === 'cut' ? [1, -1] : [1, -1];
    [a0, a1].forEach((a, i) => {
      const f = new THREE.Mesh(fg, M.fill); f.rotation.y = a;
      const n = new THREE.Vector3(Math.sin(a), 0, Math.cos(a)).multiplyScalar(signs[i] * (bev + 0.004));
      f.position.copy(n); g.add(f);
    });
  }
  return g;
}

export function makeFeastTable() {
  const g = new THREE.Group();
  const top = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 0.09, 48), std('#5b1a12', { roughness: 0.32, metalness: 0.1 }));
  top.position.y = 0.62; g.add(top);
  const gold = std('#d9a441', { metalness: 0.65, roughness: 0.3, emissive: '#2a1800' });
  const rimG = new THREE.Mesh(new THREE.TorusGeometry(1.2, 0.022, 8, 64), gold); rimG.rotation.x = Math.PI / 2; rimG.position.y = 0.665; g.add(rimG);
  const legMat = std('#3d140e', { roughness: 0.5 });
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4, leg = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.055, 0.58, 8), legMat);
    leg.position.set(Math.cos(a) * 0.85, 0.29, Math.sin(a) * 0.85); g.add(leg);
  }
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.85, 0.02, 6, 40), legMat); ring.rotation.x = Math.PI / 2; ring.position.y = 0.14; g.add(ring);
  const matTex = canvasTex(256, 256, (c, w) => {
    const r = w / 2;
    c.fillStyle = '#a3241a'; c.beginPath(); c.arc(r, r, r, 0, Math.PI * 2); c.fill();
    c.strokeStyle = '#e8b54a'; c.lineWidth = 3;
    [0.92, 0.84, 0.3].forEach((k) => { c.beginPath(); c.arc(r, r, r * k, 0, Math.PI * 2); c.stroke(); });
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2;
      c.beginPath(); c.arc(r + Math.cos(a) * r * 0.88, r + Math.sin(a) * r * 0.88, r * 0.03, 0, Math.PI * 2); c.fillStyle = '#e8b54a'; c.fill();
    }
  });
  const mat = new THREE.Mesh(new THREE.CircleGeometry(0.98, 48), std('#ffffff', { map: matTex, roughness: 0.85 }));
  mat.rotation.x = -Math.PI / 2; mat.position.y = 0.668; g.add(mat);

  const Y = 0.67, porcelain = std('#f4f1ea', { roughness: 0.25 }), blue = std('#2b4c9b', { roughness: 0.3 });
  const plate = (x, z, r) => {
    const p = new THREE.Group();
    p.add(new THREE.Mesh(new THREE.CylinderGeometry(r, r * 0.8, 0.035, 32), porcelain));
    const b = new THREE.Mesh(new THREE.TorusGeometry(r * 0.98, 0.01, 6, 40), blue); b.rotation.x = Math.PI / 2; b.position.y = 0.018; p.add(b);
    p.position.set(x, Y + 0.018, z); g.add(p);
    return Y + 0.036;
  };
  const py = plate(-0.3, 0.18, 0.5);
  const c1 = makeMooncake('nuong'); c1.position.set(-0.55, py, 0.05); c1.rotation.y = 0.3; g.add(c1);
  const c2 = makeMooncake('nuong', 'cut'); c2.position.set(-0.12, py, 0.3); c2.rotation.y = 0.9; g.add(c2);
  const c3 = makeMooncake('nuong', 'wedge'); c3.position.set(-0.08, py, 0.46); c3.rotation.y = 0.9 + 0.5; c3.position.x += 0.12; g.add(c3);
  const py2 = plate(0.42, 0.42, 0.28);
  const c4 = makeMooncake('deo'); c4.position.set(0.42, py2, 0.42); c4.rotation.y = -0.4; g.add(c4);

  const clay = std('#8a4a2b', { roughness: 0.5 });
  const pot = new THREE.Group();
  const prof = [[0.001, 0], [0.12, 0], [0.17, 0.04], [0.19, 0.11], [0.17, 0.18], [0.11, 0.225], [0.07, 0.235], [0.001, 0.235]].map(([x, y]) => new THREE.Vector2(x, y));
  pot.add(new THREE.Mesh(new THREE.LatheGeometry(prof, 20), clay));
  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.03, 10, 8), clay); knob.position.y = 0.26; pot.add(knob);
  const spout = new THREE.Mesh(new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(new THREE.Vector3(0.15, 0.07, 0), new THREE.Vector3(0.27, 0.1, 0), new THREE.Vector3(0.3, 0.21, 0)), 8, 0.022, 6), clay);
  pot.add(spout);
  const handle = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.015, 6, 16, Math.PI * 1.25), clay);
  handle.position.set(-0.19, 0.12, 0); handle.rotation.z = Math.PI * 0.4; pot.add(handle);
  pot.position.set(0.45, Y, -0.32); pot.rotation.y = 2.2; g.add(pot);
  const tea = std('#7a4d16', { roughness: 0.1, metalness: 0.2 });
  [[0.12, -0.5], [0.75, -0.02]].forEach(([x, z]) => {
    const cup = new THREE.Group();
    cup.add(new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.045, 0.075, 16, 1, true), clay));
    const bottom = new THREE.Mesh(new THREE.CircleGeometry(0.045, 16), clay); bottom.rotation.x = -Math.PI / 2; bottom.position.y = -0.037; cup.add(bottom);
    const surf = new THREE.Mesh(new THREE.CircleGeometry(0.055, 16), tea); surf.rotation.x = -Math.PI / 2; surf.position.y = 0.02; cup.add(surf);
    cup.position.set(x, Y + 0.038, z); g.add(cup);
  });
  const pomelo = new THREE.Mesh(new THREE.SphereGeometry(0.2, 20, 14), std('#a9c83c', { roughness: 0.7 }));
  pomelo.scale.set(1, 0.92, 1); pomelo.position.set(-0.4, Y + 0.18, -0.45); g.add(pomelo);
  const leafMat = std('#2f7a3a', { roughness: 0.6 });
  [-0.5, 0.6].forEach((rz) => {
    const lf = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 6), leafMat); lf.scale.set(0.45, 0.12, 1);
    lf.position.set(-0.4 + rz * 0.08, Y + 0.37, -0.45); lf.rotation.set(0.3, rz, rz); g.add(lf);
  });
  const candle = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.05, 0.16, 12), std('#fff4dc', { emissive: '#ffcf7a', emissiveIntensity: 0.25 }));
  candle.position.set(0.08, Y + 0.08, -0.08); g.add(candle);
  const flame = new THREE.Mesh(new THREE.ConeGeometry(0.022, 0.08, 8), new THREE.MeshBasicMaterial({ color: '#ffd27a' }));
  flame.position.set(0.08, Y + 0.21, -0.08); g.add(flame);
  const fg = glowSprite('#ffb866', 1.1, 0.95); fg.position.copy(flame.position); g.add(fg);
  const light = new THREE.PointLight('#ffb866', 5, 5, 2); light.position.set(0.08, Y + 0.35, -0.08); g.add(light);
  g.add(blobShadow(1.45, 0.5));
  return { group: g, flame, light, flameGlow: fg };
}
