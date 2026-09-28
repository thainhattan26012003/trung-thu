// Cảnh 3D: đảo nổi đêm rằm. Xoay bằng tay, chạm vào đồ vật để mở lời nhắn.
import { Sound } from './audio.js';
import { makeMoonCanvas, makeGlowCanvas, makeSparkleCanvas, makeHeartCanvas } from './art.js';
import { setup, TX, glowSprite, makeIsland, makePond, makeTree, makeLanternString, makeStarLantern, makeFeastTable } from './models.js';
import { makeLion, makeDrum, makeRabbit, makeGift, makeEnvelope, makeSkyLanterns, makeStars, makeFireflies, makeHearts } from './creatures.js';

const THREE_URL = 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.min.js';
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const damp = (a, b, k, dt) => a + (b - a) * (1 - Math.exp(-k * dt));

export async function createWorld({ canvas, photo, onTap }) {
  let THREE;
  try { THREE = await import(THREE_URL); } catch (e) { console.warn('Không tải được three.js', e); return null; }
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  } catch (e) { console.warn('Máy không hỗ trợ WebGL', e); return null; }

  const tex = (c) => { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; };
  const shadowC = document.createElement('canvas'); shadowC.width = shadowC.height = 128;
  { const g = shadowC.getContext('2d'), gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    gr.addColorStop(0, 'rgba(0,0,0,0.85)'); gr.addColorStop(0.5, 'rgba(0,0,0,0.4)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 128, 128); }
  setup(THREE, { glow: tex(makeGlowCanvas(128)), glowSoft: tex(makeGlowCanvas(128, true)), sparkle: tex(makeSparkleCanvas(128)), heart: tex(makeHeartCanvas(128)), shadow: tex(shadowC) });

  let dpr = Math.min(window.devicePixelRatio || 1, 2);
  renderer.setPixelRatio(dpr);
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2('#0b1030', 0.016);
  const BASE_FOV = 52;
  const camera = new THREE.PerspectiveCamera(BASE_FOV, window.innerWidth / window.innerHeight, 0.1, 400);
  const MOON = new THREE.Vector3(0, 3.8, -73.4);

  // ---------- Bầu trời ----------
  const sky = new THREE.Mesh(new THREE.SphereGeometry(300, 32, 16), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { top: { value: new THREE.Color('#050818') }, mid: { value: new THREE.Color('#1a1f52') }, low: { value: new THREE.Color('#2a1d4d') }, moonDir: { value: MOON.clone().normalize() } },
    vertexShader: 'varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `uniform vec3 top, mid, low, moonDir; varying vec3 vDir;
      void main(){
        float h = vDir.y;
        vec3 col = mix(mid, top, smoothstep(0.02, 0.75, h));
        col = mix(col, low, smoothstep(0.0, -0.6, h));
        float m = max(dot(normalize(vDir), moonDir), 0.0);
        col += vec3(1.0, 0.82, 0.55) * pow(m, 30.0) * 0.5 + vec3(0.45, 0.4, 0.75) * pow(m, 5.0) * 0.18;
        gl_FragColor = vec4(col, 1.0);
        #include <colorspace_fragment>
      }`,
  }));
  scene.add(sky);
  const stars = makeStars(); scene.add(stars);

  const moon = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex(makeMoonCanvas(1024)), fog: false, depthWrite: false, toneMapped: false }));
  moon.position.copy(MOON); moon.scale.setScalar(17.3); scene.add(moon);
  const moonGlow = glowSprite('#ffe2a6', 75, 0.5, true); moonGlow.position.copy(MOON).add(new THREE.Vector3(0, 0, -1)); scene.add(moonGlow);
  const moonHalo = glowSprite('#9d8cff', 170, 0.16, true); moonHalo.position.copy(MOON).add(new THREE.Vector3(0, 0, -2)); scene.add(moonHalo);
  let moonPhoto = null, photoTarget = 0;
  if (photo) {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas'); c.width = c.height = 768; const g = c.getContext('2d');
      g.beginPath(); g.arc(384, 384, 384, 0, Math.PI * 2); g.clip();
      const s = Math.max(768 / img.width, 768 / img.height);
      g.drawImage(img, 384 - (img.width * s) / 2, 384 - (img.height * s) / 2, img.width * s, img.height * s);
      g.globalCompositeOperation = 'soft-light'; g.fillStyle = '#ffd98a'; g.fillRect(0, 0, 768, 768);
      g.globalCompositeOperation = 'source-over';
      const v = g.createRadialGradient(384, 384, 250, 384, 384, 384); v.addColorStop(0, 'rgba(255,240,200,0)'); v.addColorStop(1, 'rgba(255,236,190,0.95)');
      g.fillStyle = v; g.fillRect(0, 0, 768, 768);
      moonPhoto = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex(c), fog: false, depthWrite: false, toneMapped: false, transparent: true, opacity: 0 }));
      moonPhoto.position.copy(MOON).add(new THREE.Vector3(0, 0, 0.5)); moonPhoto.scale.setScalar(16.6); scene.add(moonPhoto);
    };
    img.src = photo;
  }

  // ---------- Ánh sáng ----------
  scene.add(new THREE.HemisphereLight('#7082d6', '#1c2724', 1.1));
  scene.add(new THREE.AmbientLight('#3a4270', 0.5));
  const moonLight = new THREE.DirectionalLight('#cbd6ff', 1.4); moonLight.position.copy(MOON).normalize().multiplyScalar(20); scene.add(moonLight);
  const fill = new THREE.DirectionalLight('#98a6e8', 0.9); fill.position.set(5, 9, 14); scene.add(fill);

  // ---------- Đồ vật (dựng từng phần, nhường máy vẽ màn mở đầu ở giữa) ----------
  const breathe = () => new Promise((r) => setTimeout(r, 0));
  await breathe();
  const island = makeIsland(); scene.add(island.group);
  const pond = makePond(); pond.group.position.set(1.6, 0, -2.6); scene.add(pond.group);
  await breathe();
  const tree = makeTree(); tree.group.position.set(-2.7, 0, -1.9); scene.add(tree.group);
  const lstring = makeLanternString(new THREE.Vector3(-1.9, 3.05, -1.6), new THREE.Vector3(3.7, 3.0, -1.45)); scene.add(lstring.group);
  const star = makeStarLantern(); star.group.position.set(-3.55, 0, 2.35); star.group.rotation.y = 0.35; scene.add(star.group);
  await breathe();
  const feast = makeFeastTable(); feast.group.position.set(0, 0, 0.35); scene.add(feast.group);
  await breathe();
  const lion = makeLion(); lion.group.position.set(2.55, 0, -0.1); lion.group.rotation.y = -0.55; scene.add(lion.group);
  const drum = makeDrum(); drum.group.position.set(2.95, 0, 1.65); scene.add(drum.group);
  const rabbit = makeRabbit(); rabbit.group.position.set(-1.55, 0, 2.2); rabbit.group.rotation.y = 0.45; scene.add(rabbit.group);
  const gift = makeGift(); gift.group.position.set(-3.05, 0, 1.0); gift.group.rotation.y = 0.55; scene.add(gift.group);
  const envelope = makeEnvelope(); envelope.group.position.set(0, 2.25, 0.35); scene.add(envelope.group);
  const skyL = makeSkyLanterns(); scene.add(skyL.mesh); scene.add(skyL.glow);
  const flies = makeFireflies(); scene.add(flies);
  const hearts = makeHearts(); scene.add(hearts.group);

  // ---------- Vùng chạm + dấu lấp lánh ----------
  const proxies = [];
  const hitMat = new THREE.MeshBasicMaterial({ visible: false });
  const addProxy = (key, pos, r) => { const m = new THREE.Mesh(new THREE.SphereGeometry(r, 10, 8), hitMat); m.position.copy(pos); m.userData.key = key; scene.add(m); proxies.push(m); return m; };
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  addProxy('moon', MOON, 9.5);
  addProxy('cakes', V(-0.1, 0.8, 0.45), 1.0);
  addProxy('lantern', V(-2.4, 2.2, -1.4), 1.0);
  addProxy('lantern', V(0.9, 2.5, -1.5), 1.6);
  addProxy('lion', V(2.4, 0.9, -0.45), 1.15);
  addProxy('lion', V(2.95, 0.6, 1.65), 0.55);
  addProxy('rabbit', V(-1.55, 0.6, 2.2), 0.65);
  addProxy('star', V(-3.55, 1.9, 2.35), 0.8);
  addProxy('gift', V(-3.05, 0.4, 1.0), 0.65);
  const envProxy = addProxy('envelope', V(0, 2.25, 0.35), 0.65);
  const focusPos = { moon: V(0, 2.4, -1), cakes: V(-0.1, 0.9, 0.4), lantern: V(0.3, 2.3, -1.4), lion: V(2.7, 0.9, 0.2), rabbit: V(-1.5, 0.6, 2.1), star: V(-3.4, 1.6, 2.2), gift: V(-2.9, 0.5, 1.0), envelope: V(0, 1.8, 0.35) };
  const markers = {};
  [['moon', V(9, 11.5, -73)], ['cakes', V(-0.1, 1.45, 0.4)], ['lantern', V(0.9, 3.45, -1.5)], ['lion', V(2.5, 2.1, -0.2)], ['rabbit', V(-1.55, 1.55, 2.2)], ['star', V(-3.55, 2.95, 2.35)]]
    .forEach(([k, p], i) => {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: TX.sparkle, color: '#ffe08a', transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
      s.position.copy(p); s.userData.base = k === 'moon' ? 3.2 : 0.5; s.userData.i = i; scene.add(s); markers[k] = s;
    });

  // ---------- Điều khiển camera ----------
  const orbit = { theta: 0, phi: 1.2, radius: 16, tTheta: 0, tPhi: 1.2, tRadius: 16, vTheta: 0, target: V(0, 1.3, 0), tTarget: V(0, 1.3, 0), home: V(0, 1.3, 0),
    minPhi: 0.55, maxPhi: 1.45, idle: 0, enabled: false, zoomed: false };
  const fitRadius = () => {
    const aspect = window.innerWidth / window.innerHeight;
    const half = Math.atan(Math.tan(THREE.MathUtils.degToRad(BASE_FOV / 2)) * aspect);
    return clamp(3.7 / Math.tan(half), 10, 18);
  };
  orbit.radius = orbit.tRadius = fitRadius();
  const gyro = { x: 0, y: 0, tx: 0, ty: 0, base: null, on: false };
  let intro = { t: -1, dur: 4.2 }, finale = -1, focusKey = null;

  const ptrs = new Map();
  let gesture = null;
  canvas.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* bỏ qua */ }
    if (ptrs.size === 1) gesture = { x: e.clientX, y: e.clientY, t: performance.now(), moved: 0, multi: false };
    else if (gesture) gesture.multi = true;
    orbit.idle = 0; orbit.vTheta = 0;
  });
  canvas.addEventListener('pointermove', (e) => {
    const p = ptrs.get(e.pointerId); if (!p) return;
    const dx = e.clientX - p.x, dy = e.clientY - p.y;
    if (ptrs.size === 1 && orbit.enabled) {
      orbit.tTheta -= dx * 0.0055; orbit.tPhi = clamp(orbit.tPhi - dy * 0.004, orbit.minPhi, orbit.maxPhi);
      orbit.vTheta = -dx * 0.0055 / Math.max(1 / 120, 1 / 60);
    } else if (ptrs.size === 2 && orbit.enabled) {
      const [a, b] = [...ptrs.values()];
      const before = Math.hypot(a.x - b.x, a.y - b.y);
      p.x = e.clientX; p.y = e.clientY;
      const after = Math.hypot(a.x - b.x, a.y - b.y);
      if (before > 10) { orbit.tRadius = clamp(orbit.tRadius * (before / after), 6.5, 24); orbit.zoomed = true; }
    }
    p.x = e.clientX; p.y = e.clientY;
    if (gesture) gesture.moved += Math.abs(dx) + Math.abs(dy);
    orbit.idle = 0;
  });
  const end = (e) => {
    if (!ptrs.has(e.pointerId)) return;
    ptrs.delete(e.pointerId);
    if (!ptrs.size && gesture) {
      const g = gesture; gesture = null;
      if (e.type === 'pointerup' && !g.multi && g.moved < 12 && performance.now() - g.t < 500) tap(e.clientX, e.clientY);
    }
  };
  canvas.addEventListener('pointerup', end);
  canvas.addEventListener('pointercancel', end);
  canvas.addEventListener('wheel', (e) => { e.preventDefault(); orbit.tRadius = clamp(orbit.tRadius * (1 + e.deltaY * 0.001), 6.5, 24); orbit.zoomed = true; orbit.idle = 0; }, { passive: false });

  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  function tap(x, y) {
    if (!orbit.enabled) return;
    ndc.set((x / window.innerWidth) * 2 - 1, -(y / window.innerHeight) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const hits = ray.intersectObjects(proxies.filter((p) => p !== envProxy || envelope.group.visible), false);
    if (hits.length) onTap && onTap(hits[0].object.userData.key);
  }

  // ---------- Phản ứng của đồ vật ----------
  const fx = { swing: 0, spin: 0, candle: 0, moonPulse: 0, giftShake: 0, lionT: -1, beats: [], bi: 0, jaw: 0, hopY: 0, hopV: 0, tilt: 0, drum: 0,
    rabbitHop: -1, earT: 2, earTw: -1, blinkT: 2, blink: -1, envT: -1, nextWiggle: 5 };
  function react(key) {
    if (key === 'moon') { fx.moonPulse = 1; if (moonPhoto) photoTarget = 0.92; }
    if (key === 'cakes') { fx.candle = 1; hearts.burst(V(-0.1, 1.0, 0.45)); }
    if (key === 'lantern') fx.swing = 1;
    if (key === 'star') fx.spin = 1;
    if (key === 'lion') { fx.lionT = 0; fx.bi = 0; fx.beats = Sound.lionDrums(); }
    if (key === 'rabbit') { fx.rabbitHop = 0; Sound.hop(); setTimeout(() => hearts.burst(V(-1.55, 1.2, 2.2)), 250); }
    if (key === 'gift') fx.giftShake = 1;
  }
  function focus(key) {
    focusKey = key;
    const p = focusPos[key]; if (!p) return;
    // đẩy tâm nhìn xuống dưới vật một chút để vật nằm phía trên thẻ lời nhắn
    const aim = p.clone(); aim.y -= key === 'moon' ? 0 : 0.9;
    orbit.tTarget.copy(orbit.home).lerp(aim, key === 'moon' ? 0.2 : 0.7);
    if (key !== 'moon') orbit.tRadius = Math.min(orbit.tRadius, fitRadius() * (key === 'lantern' ? 0.8 : 0.62));
  }
  function unfocus() {
    focusKey = null; photoTarget = 0;
    orbit.tTarget.copy(orbit.home);
    if (!orbit.zoomed) orbit.tRadius = fitRadius();
  }

  // ---------- Nghiêng máy ----------
  const tiltSupported = typeof window.DeviceOrientationEvent !== 'undefined' && 'ontouchstart' in window;
  function onOrient(e) {
    if (e.beta == null) return;
    if (!gyro.base) gyro.base = { b: e.beta, g: e.gamma };
    gyro.tx = clamp((e.gamma - gyro.base.g) * 0.018, -0.6, 0.6);
    gyro.ty = clamp((e.beta - gyro.base.b) * -0.012, -0.3, 0.3);
  }
  async function toggleTilt() {
    if (gyro.on) { window.removeEventListener('deviceorientation', onOrient); gyro.on = false; gyro.tx = gyro.ty = 0; return 'off'; }
    try {
      if (typeof DeviceOrientationEvent.requestPermission === 'function') {
        const r = await DeviceOrientationEvent.requestPermission();
        if (r !== 'granted') return 'denied';
      }
    } catch (e) { return 'denied'; }
    gyro.base = null; gyro.on = true;
    window.addEventListener('deviceorientation', onOrient);
    // một số trình duyệt trong app không gửi dữ liệu cảm biến: kiểm tra sau 1,5 giây
    return new Promise((res) => setTimeout(() => {
      if (gyro.base) res('on');
      else { window.removeEventListener('deviceorientation', onOrient); gyro.on = false; res('denied'); }
    }, 1500));
  }

  // ---------- Vòng lặp ----------
  let time = 0, frames = 0, slow = 0;
  const lookAt = new THREE.Vector3();
  function frame(dt) {
    time += dt; const t = time;
    // camera
    if (intro.t >= 0) {
      intro.t += dt;
      const k = clamp(intro.t / intro.dur, 0, 1), e = ease(k);
      camera.fov = THREE.MathUtils.lerp(9, BASE_FOV, ease(clamp((intro.t - 0.3) / (intro.dur - 0.5), 0, 1)));
      camera.updateProjectionMatrix();
      lookAt.lerpVectors(MOON, orbit.target, e);
      if (k >= 1) { intro.t = -1; orbit.enabled = true; }
    } else {
      lookAt.copy(orbit.target);
    }
    if (orbit.enabled) {
      orbit.idle += dt;
      if (!ptrs.size) { orbit.tTheta += orbit.vTheta * dt; orbit.vTheta *= Math.exp(-dt * 3.5); }
      if (orbit.idle > 7 && !focusKey && finale < 0) {
        const home = Math.round(orbit.tTheta / (Math.PI * 2)) * Math.PI * 2 + Math.sin(t * 0.07) * 0.1;
        orbit.tTheta = damp(orbit.tTheta, home, 0.35, dt);
        orbit.tPhi = damp(orbit.tPhi, 1.2, 0.35, dt);
      }
    }
    if (finale >= 0) {
      finale += dt;
      if (finale > 11) { finale = -1; orbit.tTarget.copy(orbit.home); orbit.maxPhi = 1.45; orbit.tPhi = 1.2; }
    }
    orbit.theta = damp(orbit.theta, orbit.tTheta, 8, dt);
    orbit.phi = damp(orbit.phi, orbit.tPhi, 8, dt);
    orbit.radius = damp(orbit.radius, orbit.tRadius, 5, dt);
    orbit.target.x = damp(orbit.target.x, orbit.tTarget.x, 2.5, dt);
    orbit.target.y = damp(orbit.target.y, orbit.tTarget.y, 2.5, dt);
    orbit.target.z = damp(orbit.target.z, orbit.tTarget.z, 2.5, dt);
    gyro.x = damp(gyro.x, gyro.tx, 4, dt); gyro.y = damp(gyro.y, gyro.ty, 4, dt);
    const th = orbit.theta + gyro.x, ph = clamp(orbit.phi + gyro.y, 0.45, 1.7), r = orbit.radius;
    camera.position.set(orbit.target.x + r * Math.sin(ph) * Math.sin(th), orbit.target.y + r * Math.cos(ph), orbit.target.z + r * Math.sin(ph) * Math.cos(th));
    camera.lookAt(lookAt);

    // bầu trời, đèn trời, đom đóm
    stars.material.uniforms.uTime.value = t;
    flies.material.uniforms.uTime.value = t;
    tree.fairy.material.uniforms.uTime.value = t;
    skyL.update(dt, t, camera.position);
    hearts.update(dt);
    island.floaters.forEach((m) => { m.position.y = m.userData.base + Math.sin(t * 0.6 + m.userData.ph) * 0.18; m.rotation.y += dt * 0.1; });
    pond.lotuses.forEach((l) => { l.position.y = 0.05 + Math.sin(t * 1.2 + l.userData.ph) * 0.012; l.rotation.y += dt * 0.08; });
    pond.shine.material.opacity = 0.35 + Math.sin(t * 1.7) * 0.08;

    // trăng
    fx.moonPulse = Math.max(0, fx.moonPulse - dt * 0.5);
    moonGlow.material.opacity = 0.5 + fx.moonPulse * 0.4 + Math.sin(t * 0.8) * 0.03;
    if (moonPhoto) moonPhoto.material.opacity = damp(moonPhoto.material.opacity, photoTarget, 2, dt);

    // đèn lồng
    fx.swing = Math.max(0, fx.swing - dt * 0.35);
    [...tree.lanterns, ...lstring.swings].forEach((p) => {
      const a = 0.05 + fx.swing * 0.35;
      p.rotation.z = Math.sin(t * 1.3 + p.userData.ph) * a;
      p.rotation.x = Math.cos(t * 1.1 + p.userData.ph) * a * 0.5;
    });
    // đèn ông sao
    fx.spin = Math.max(0, fx.spin - dt * 0.4);
    fx.spinA = (fx.spinA || 0) + dt * fx.spin * 11;
    if (fx.spin < 0.25) fx.spinA = damp(fx.spinA, Math.round(fx.spinA / (Math.PI * 2)) * Math.PI * 2, 2.5, dt);
    star.star.rotation.y = Math.sin(t * 0.6) * 0.45 + fx.spinA;
    star.star.position.y = 2.05 + Math.sin(t * 1.4) * 0.04;
    star.light.intensity = 6 + fx.spin * 8 + Math.sin(t * 9) * 0.4;
    // nến
    fx.candle = Math.max(0, fx.candle - dt * 0.6);
    const fl = 1 + Math.sin(t * 17) * 0.07 + Math.sin(t * 29) * 0.05;
    feast.flame.scale.set(1, fl * (1 + fx.candle * 0.6), 1);
    feast.light.intensity = (5 + fx.candle * 6) * fl;
    feast.flameGlow.material.opacity = 0.8 + fx.candle * 0.2;

    // lân
    let energy = 0;
    if (fx.lionT >= 0) {
      fx.lionT += dt;
      while (fx.bi < fx.beats.length && fx.lionT >= fx.beats[fx.bi].at) {
        const b = fx.beats[fx.bi++];
        fx.jaw = 1; fx.drum = 1;
        if (b.kind === 'T') { if (fx.hopY <= 0.001) fx.hopV = 1.6; fx.tilt = (Math.random() - 0.5) * 0.7; }
      }
      const total = fx.beats.length ? fx.beats[fx.beats.length - 1].at + 0.4 : 0;
      energy = fx.lionT < total ? 1 : Math.max(0, 1 - (fx.lionT - total) * 1.5);
      if (fx.lionT > total + 1) fx.lionT = -1;
    }
    fx.jaw = Math.max(0, fx.jaw - dt * 5);
    fx.hopV -= 9.8 * dt; fx.hopY = Math.max(0, fx.hopY + fx.hopV * dt); if (fx.hopY === 0) fx.hopV = 0;
    lion.body.position.y = fx.hopY;
    lion.jaw.rotation.x = 0.05 + fx.jaw * 0.6 + (0.5 + 0.5 * Math.sin(t * 1.3)) * 0.1;
    lion.head.rotation.z = damp(lion.head.rotation.z, fx.tilt * energy + Math.sin(t * 1.1) * 0.06, 6, dt);
    lion.head.rotation.x = Math.sin(t * (1.6 + energy * 8)) * (0.05 + energy * 0.14);
    lion.head.rotation.y = Math.sin(t * 0.7) * 0.15 * (1 - energy) + Math.sin(t * 6) * 0.2 * energy;
    lion.head.position.y = 1.05 + Math.sin(t * 2) * 0.02;
    lion.legs.forEach((l) => { l.position.y = Math.max(0, Math.sin(t * (3 + energy * 9) + l.userData.ph)) * 0.06 * (0.3 + energy); });
    [-1, 1].forEach((sx) => { const ear = lion.head.userData['ear' + sx]; if (ear) ear.rotation.z = -sx * 0.6 + Math.sin(t * (2 + energy * 10)) * 0.1 * (1 + energy * 2); });
    fx.blinkT -= dt;
    if (fx.blinkT < 0) { fx.blink = 0.14; fx.blinkT = 2 + Math.random() * 3; }
    if (fx.blink > 0) fx.blink -= dt;
    lion.eyes.forEach((e) => { e.scale.y = fx.blink > 0 ? 0.15 : 1; });
    lion.updateCloth(t, energy);
    fx.drum = Math.max(0, fx.drum - dt * 6);
    drum.drum.scale.set(1 + fx.drum * 0.04, 1 - fx.drum * 0.05, 1 + fx.drum * 0.04);

    // thỏ
    rabbit.body.scale.y = 1 + Math.sin(t * 2.4) * 0.015;
    rabbit.head.rotation.x = -0.2 + Math.sin(t * 0.7) * 0.06;
    rabbit.head.rotation.z = Math.sin(t * 0.5) * 0.08;
    fx.earT -= dt;
    if (fx.earT < 0) { fx.earTw = 0; fx.earT = 2.5 + Math.random() * 4; }
    if (fx.earTw >= 0) { fx.earTw += dt; if (fx.earTw > 0.3) fx.earTw = -1; }
    rabbit.ears.forEach((e, i) => { e.rotation.x = -0.15 + (fx.earTw >= 0 ? Math.sin((fx.earTw / 0.3) * Math.PI) * (i ? 0.5 : 0.3) : 0); });
    if (fx.rabbitHop >= 0) {
      fx.rabbitHop += dt; const s = fx.rabbitHop / 0.55;
      if (s < 1) { rabbit.body.position.y = Math.sin(Math.PI * s) * 0.4; rabbit.body.scale.set(1 - Math.sin(Math.PI * s) * 0.06, 1 + Math.sin(Math.PI * s) * 0.1, 1); }
      else { fx.rabbitHop = -1; rabbit.body.position.y = 0; rabbit.body.scale.set(1, 1, 1); }
    }

    // hộp quà
    fx.nextWiggle -= dt;
    if (fx.nextWiggle < 0) { fx.giftShake = Math.max(fx.giftShake, 0.5); fx.nextWiggle = 5 + Math.random() * 4; }
    fx.giftShake = Math.max(0, fx.giftShake - dt * 1.4);
    gift.box.rotation.z = Math.sin(t * 32) * 0.07 * fx.giftShake;
    gift.lid.position.y = 0.565 + Math.abs(Math.sin(t * 16)) * 0.05 * fx.giftShake;
    gift.tag.rotation.z = Math.sin(t * 1.6) * 0.12 + Math.sin(t * 20) * 0.2 * fx.giftShake;
    gift.aura.material.opacity = 0.28 + Math.sin(t * 2) * 0.08 + fx.giftShake * 0.25;

    // dấu lấp lánh
    Object.values(markers).forEach((m) => {
      if (!m.visible) return;
      const k = 0.75 + 0.3 * Math.sin(t * 3 + m.userData.i);
      m.scale.setScalar(m.userData.base * k);
      m.material.rotation = t * 0.6 + m.userData.i;
      m.material.opacity = 0.65 + 0.35 * Math.sin(t * 2.2 + m.userData.i);
    });

    // lá thư
    if (envelope.group.visible) {
      if (fx.envT >= 0) fx.envT += dt;
      const a = Math.min(1, Math.max(0, fx.envT) / 1.2), pop = a < 1 ? 1 + 2.2 * Math.pow(a - 1, 3) + 1.2 * Math.pow(a - 1, 2) : 1;
      envelope.group.scale.setScalar(Math.max(0.001, pop));
      envelope.group.position.y = 2.25 + Math.sin(t * 1.6) * 0.08;
      envelope.glow.material.opacity = 0.45 + Math.sin(t * 2.4) * 0.15;
      envProxy.position.y = envelope.group.position.y;
    }

    renderer.render(scene, camera);

    // tự giảm độ phân giải nếu máy yếu
    frames++;
    if (frames > 40 && frames < 160) { if (dt > 0.03) slow++; }
    if (frames === 160 && slow > 60 && dpr > 1) { dpr = Math.max(1, dpr * 0.7); renderer.setPixelRatio(dpr); renderer.setSize(window.innerWidth, window.innerHeight, false); }
  }

  function resize() {
    renderer.setSize(window.innerWidth, window.innerHeight, false);
    camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix();
    if (!orbit.zoomed && !focusKey) orbit.tRadius = fitRadius();
  }

  // Dựng sẵn shader để lúc chuyển cảnh không bị khựng
  camera.position.set(0, 7.7, 16.6); camera.lookAt(MOON); camera.fov = 9; camera.updateProjectionMatrix();
  await breathe();
  try { if (renderer.compileAsync) await renderer.compileAsync(scene, camera); else renderer.compile(scene, camera); }
  catch (e) { renderer.compile(scene, camera); }

  return {
    frame, resize, react, focus, unfocus, toggleTilt, tiltSupported,
    start() { intro.t = 0; orbit.enabled = false; frame(0.001); },
    render() { frame(0.001); },
    setFound(key) { if (markers[key]) markers[key].visible = false; },
    showEnvelope() { if (!envelope.group.visible) { envelope.group.visible = true; fx.envT = 0; } },
    releaseLanterns() {
      skyL.release(46);
      Sound.wishRise();
      finale = 0; orbit.maxPhi = 1.65;
      orbit.tTarget.set(0, 6.5, 0); orbit.tPhi = 1.6; orbit.idle = 0;
    },
  };
}
