// Lân, Thỏ Ngọc, hộp quà, lá thư, đèn trời, sao và đom đóm.
import { THREE, TX, std, canvasTex, glowSprite, blobShadow, twinklePoints } from './models.js';
import { rng } from './art.js';

const R = rng(1508);

// ---------------- Lân ----------------
export function makeLion() {
  const root = new THREE.Group(), body = new THREE.Group(), head = new THREE.Group(), jaw = new THREE.Group();
  root.add(body);
  head.position.set(0, 1.05, 0.32); body.add(head);

  const scales = canvasTex(256, 128, (g, w, h) => {
    g.fillStyle = '#d7261e'; g.fillRect(0, 0, w, h);
    for (let row = 0; row < 8; row++) for (let i = 0; i < 17; i++) {
      const x = i * 16 + (row % 2) * 8, y = row * 16 + 10;
      g.strokeStyle = 'rgba(255,205,80,0.85)'; g.lineWidth = 2;
      g.beginPath(); g.arc(x, y, 7, 0, Math.PI); g.stroke();
    }
  });
  const red = std('#ffffff', { map: scales, roughness: 0.5, emissive: '#3a0600', emissiveIntensity: 0.6 });
  const gold = std('#f4b41a', { roughness: 0.45, metalness: 0.25, emissive: '#4a2a00', emissiveIntensity: 0.5 });
  const white = std('#fbf6ec', { roughness: 0.9, emissive: '#2a2a35', emissiveIntensity: 0.4 });
  const black = std('#15121a', { roughness: 0.3 });

  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.52, 28, 20), red);
  skull.scale.set(1.05, 0.88, 0.95); head.add(skull);
  const face = new THREE.Mesh(new THREE.SphereGeometry(0.46, 24, 16), gold);
  face.scale.set(0.86, 0.72, 0.5); face.position.set(0, 0.02, 0.3); head.add(face);
  const horn = new THREE.Mesh(new THREE.ConeGeometry(0.075, 0.28, 12), gold);
  horn.position.set(0, 0.5, 0.16); horn.rotation.x = 0.4; head.add(horn);
  const mirror = new THREE.Mesh(new THREE.CircleGeometry(0.085, 20), std('#e8eef8', { metalness: 1, roughness: 0.15, emissive: '#8090b5', emissiveIntensity: 0.6 }));
  mirror.position.set(0, 0.31, 0.47); mirror.rotation.x = -0.35; head.add(mirror);

  const eyes = [];
  [-1, 1].forEach((sx) => {
    const eye = new THREE.Group(); eye.position.set(sx * 0.19, 0.15, 0.44);
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.13, 18, 14), white); ball.scale.z = 0.75; eye.add(ball);
    const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.066, 14, 10), black); pupil.position.z = 0.075; eye.add(pupil);
    const hl = new THREE.Mesh(new THREE.SphereGeometry(0.02, 8, 6), new THREE.MeshBasicMaterial({ color: '#ffffff' }));
    hl.position.set(0.025, 0.03, 0.13); eye.add(hl);
    head.add(eye); eyes.push(eye);
  });

  // lông xù: một InstancedMesh cho tất cả chùm bông
  const puffs = [];
  const addPuff = (x, y, z, r, col, parent = head) => puffs.push({ x, y, z, r, col, parent });
  const rainbow = ['#ff4d4d', '#ffd23f', '#3ddc97', '#4dabf7', '#ff8fd1', '#ffffff'];
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    addPuff(Math.cos(a) * 0.52, Math.sin(a) * 0.45 + 0.02, -0.08, 0.078, rainbow[i % 6]);
  }
  [-1, 1].forEach((sx) => {
    for (let i = 0; i < 5; i++) { const t = i / 4; addPuff(sx * (0.08 + t * 0.24), 0.3 + Math.sin(t * Math.PI) * 0.05, 0.43 - t * 0.05, 0.045, '#ffffff'); }
  });
  for (let i = 0; i < 7; i++) addPuff((i - 3) * 0.075, -0.13, 0.46 - Math.abs(i - 3) * 0.02, 0.05, '#ffffff');
  for (let i = 0; i < 9; i++) addPuff((i - 4) * 0.06, -0.3 - (i % 2) * 0.05, 0.36, 0.055, '#ffffff', jaw);
  addPuff(0, 0.34, 0.2, 0.07, '#ff4d4d');

  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.08, 14, 10), red);
  nose.scale.set(1.3, 0.9, 0.8); nose.position.set(0, 0.0, 0.53); head.add(nose);
  [-1, 1].forEach((sx) => {
    const cheek = new THREE.Mesh(new THREE.SphereGeometry(0.12, 14, 10), gold); cheek.position.set(sx * 0.27, -0.08, 0.37); head.add(cheek);
    const ear = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.22, 10), gold);
    ear.position.set(sx * 0.34, 0.36, 0.02); ear.rotation.z = -sx * 0.6; head.add(ear);
    ear.userData.sx = sx; eyes.push(null); head.userData['ear' + sx] = ear;
  });

  jaw.position.set(0, -0.12, 0.08); head.add(jaw);
  const jawMesh = new THREE.Mesh(new THREE.SphereGeometry(0.34, 20, 12, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), gold);
  jawMesh.scale.set(1.05, 0.55, 1.1); jawMesh.position.z = 0.18; jaw.add(jawMesh);
  const mouth = new THREE.Mesh(new THREE.CircleGeometry(0.3, 20), std('#7a0f16', { roughness: 0.6 }));
  mouth.rotation.x = -Math.PI / 2; mouth.scale.set(1.05, 1.1, 1); mouth.position.set(0, 0.005, 0.18); jaw.add(mouth);
  const tongue = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), std('#ff6f91', { roughness: 0.5 }));
  tongue.scale.set(1, 0.3, 1.2); tongue.position.set(0, 0.02, 0.25); jaw.add(tongue);
  for (let i = 0; i < 6; i++) {
    const tooth = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.05, 0.03), white);
    const a = -0.9 + (i / 5) * 1.8; tooth.position.set(Math.sin(a) * 0.3, 0.03, 0.18 + Math.cos(a) * 0.3); jaw.add(tooth);
  }

  // thân vải phía sau
  const clothTex = canvasTex(128, 256, (g, w, h) => {
    g.fillStyle = '#d7261e'; g.fillRect(0, 0, w, h);
    for (let row = 0; row < 16; row++) for (let i = 0; i < 9; i++) {
      g.strokeStyle = 'rgba(255,205,80,0.8)'; g.lineWidth = 2;
      g.beginPath(); g.arc(i * 16 + (row % 2) * 8, row * 16 + 8, 7, 0, Math.PI); g.stroke();
    }
    g.fillStyle = '#2fbf71'; g.fillRect(w / 2 - 6, 0, 12, h);
    g.fillStyle = '#fff6e0'; g.fillRect(0, 0, 10, h); g.fillRect(w - 10, 0, 10, h);
    g.fillStyle = '#ffd23f'; g.fillRect(10, 0, 4, h); g.fillRect(w - 14, 0, 4, h);
  });
  const clothGeo = new THREE.PlaneGeometry(1, 1, 10, 26);
  const cloth = new THREE.Mesh(clothGeo, std('#ffffff', { map: clothTex, side: THREE.DoubleSide, roughness: 0.75, emissive: '#2a0500', emissiveIntensity: 0.5 }));
  cloth.frustumCulled = false; body.add(cloth);

  const legs = [];
  const pants = std('#f5c542', { roughness: 0.7 }), cuff = white;
  [[-0.17, 0.25], [0.17, 0.25], [-0.17, -1.35], [0.17, -1.35]].forEach(([x, z], i) => {
    const leg = new THREE.Group(); leg.position.set(x, 0, z);
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.095, 0.5, 10), pants); p.position.y = 0.33; leg.add(p);
    const c = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.03, 6, 14), cuff); c.rotation.x = Math.PI / 2; c.position.y = 0.1; leg.add(c);
    const shoe = new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 8), black); shoe.scale.set(1, 0.55, 1.5); shoe.position.set(0, 0.04, 0.04); leg.add(shoe);
    leg.userData.ph = i % 2 ? Math.PI : 0; body.add(leg); legs.push(leg);
  });
  const tail = new THREE.Group(); body.add(tail);
  ['#ffd23f', '#ffffff', '#ff4d4d'].forEach((col, i) => addPuff(0, 0.05 * i, -0.06 * i, 0.09 - i * 0.012, col, tail));

  const puffGeo = new THREE.IcosahedronGeometry(1, 1);
  const byParent = new Map();
  puffs.forEach((p) => { if (!byParent.has(p.parent)) byParent.set(p.parent, []); byParent.get(p.parent).push(p); });
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), v = new THREE.Vector3(), s = new THREE.Vector3(), c = new THREE.Color();
  byParent.forEach((list, parent) => {
    const im = new THREE.InstancedMesh(puffGeo, std('#ffffff', { roughness: 1, emissive: '#1a1a22', emissiveIntensity: 0.5 }), list.length);
    list.forEach((p, i) => { v.set(p.x, p.y, p.z); s.setScalar(p.r); im.setMatrixAt(i, m4.compose(v, q, s)); im.setColorAt(i, c.set(p.col)); });
    parent.add(im);
  });

  const lionShadow = blobShadow(1.1, 0.45); lionShadow.position.set(0, 0.012, -0.5); root.add(lionShadow);
  const clothState = { sway: 0, bounce: 0 };
  function updateCloth(t, energy) {
    const pos = clothGeo.attributes.position;
    for (let iy = 0; iy <= 26; iy++) {
      const v01 = iy / 26;
      const sx = Math.sin(t * (2 + energy * 5) - v01 * 3.2) * (0.05 + energy * 0.22) * v01;
      const cy = 1.02 - 0.2 * v01 + 0.14 * Math.sin(Math.PI * v01) + Math.sin(t * (3 + energy * 6) - v01 * 4) * 0.03 * (1 + energy * 2);
      const cz = 0.02 - 1.55 * v01;
      const half = 0.56 * (1 - 0.32 * v01);
      for (let ix = 0; ix <= 10; ix++) {
        const u = ix / 10, phi = Math.PI * (u - 0.5) * 1.05;
        const idx = iy * 11 + ix;
        pos.setXYZ(idx, sx + Math.sin(phi) * half, cy + (Math.cos(phi) - 1) * half * 0.95, cz);
      }
    }
    pos.needsUpdate = true;
    clothGeo.computeVertexNormals();
    tail.position.set(Math.sin(t * (2 + energy * 5) - 3.2) * (0.05 + energy * 0.22), 0.86, -1.6);
  }
  updateCloth(0, 0);
  return { group: root, body, head, jaw, eyes: eyes.filter(Boolean), legs, updateCloth, clothState };
}

export function makeDrum() {
  const g = new THREE.Group(), drum = new THREE.Group();
  drum.add(new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.42, 24), std('#b3261e', { roughness: 0.45, emissive: '#2a0400' })));
  const skinMat = std('#e9d8b4', { roughness: 0.8 });
  const skin = new THREE.Mesh(new THREE.CircleGeometry(0.29, 24), skinMat); skin.rotation.x = -Math.PI / 2; skin.position.y = 0.212; drum.add(skin);
  const stud = std('#e0b04a', { metalness: 0.6, roughness: 0.3 });
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * Math.PI * 2;
    [0.18, -0.18].forEach((y) => { const s = new THREE.Mesh(new THREE.SphereGeometry(0.018, 6, 4), stud); s.position.set(Math.cos(a) * 0.305, y, Math.sin(a) * 0.305); drum.add(s); });
  }
  drum.position.y = 0.55; g.add(drum);
  const wood = std('#4a2a1a');
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2, leg = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.025, 0.42, 6), wood);
    leg.position.set(Math.cos(a) * 0.24, 0.2, Math.sin(a) * 0.24); leg.rotation.set(Math.sin(a) * 0.25, 0, -Math.cos(a) * 0.25); g.add(leg);
  }
  [[0.1, -0.3], [-0.08, 0.35]].forEach(([x, ry]) => {
    const st = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.014, 0.42, 6), std('#c9a26b'));
    st.rotation.z = Math.PI / 2; st.rotation.y = ry; st.position.set(x, 0.79, 0); g.add(st);
  });
  g.add(blobShadow(0.45, 0.4));
  return { group: g, drum };
}

// ---------------- Thỏ Ngọc ----------------
export function makeRabbit() {
  const g = new THREE.Group(), body = new THREE.Group(), head = new THREE.Group();
  g.add(body);
  const fur = std('#f7f3ee', { roughness: 0.9, emissive: '#39435e', emissiveIntensity: 0.45 });
  const pink = std('#ffb3c7', { roughness: 0.7, emissive: '#5a2030', emissiveIntensity: 0.4 });
  const dark = new THREE.MeshBasicMaterial({ color: '#1b1420' });
  const trunk = new THREE.Mesh(new THREE.SphereGeometry(0.26, 20, 16), fur); trunk.scale.set(1, 0.95, 1.12); trunk.position.y = 0.25; body.add(trunk);
  head.position.set(0, 0.55, 0.1); body.add(head);
  head.add(new THREE.Mesh(new THREE.SphereGeometry(0.19, 20, 16), fur));
  const ears = [];
  [-1, 1].forEach((sx) => {
    const pivot = new THREE.Group(); pivot.position.set(sx * 0.07, 0.13, -0.03); pivot.rotation.set(-0.15, 0, -sx * 0.18);
    const e = new THREE.Mesh(new THREE.CapsuleGeometry(0.045, 0.24, 4, 10), fur); e.position.y = 0.16; pivot.add(e);
    const inner = new THREE.Mesh(new THREE.CapsuleGeometry(0.022, 0.18, 4, 8), pink); inner.position.set(0, 0.16, 0.03); pivot.add(inner);
    head.add(pivot); ears.push(pivot);
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.028, 10, 8), dark); eye.position.set(sx * 0.075, 0.035, 0.165); head.add(eye);
    const hl = new THREE.Mesh(new THREE.SphereGeometry(0.009, 6, 4), new THREE.MeshBasicMaterial({ color: '#ffffff' })); hl.position.set(sx * 0.075 + 0.008, 0.045, 0.19); head.add(hl);
    const blush = new THREE.Mesh(new THREE.SphereGeometry(0.035, 10, 6), new THREE.MeshBasicMaterial({ color: '#ff9ab5', transparent: true, opacity: 0.55 }));
    blush.scale.set(1, 0.6, 0.4); blush.position.set(sx * 0.12, -0.03, 0.14); head.add(blush);
    const foot = new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 8), fur); foot.scale.set(1, 0.5, 1.6); foot.position.set(sx * 0.13, 0.04, 0.12); body.add(foot);
    const paw = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), fur); paw.position.set(sx * 0.085, 0.31, 0.25); body.add(paw);
  });
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.018, 8, 6), pink); nose.position.set(0, -0.005, 0.19); head.add(nose);
  const tail = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8), fur); tail.position.set(0, 0.2, -0.3); body.add(tail);
  const cake = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.045, 14), std('#d89045', { roughness: 0.6 }));
  cake.position.set(0, 0.33, 0.3); cake.rotation.x = 1.2; body.add(cake);
  g.add(blobShadow(0.45, 0.45));
  g.scale.setScalar(1.3);
  return { group: g, body, head, ears };
}

// ---------------- Hộp quà "bất ngờ sẽ đến sau" ----------------
export function makeGift() {
  const g = new THREE.Group(), box = new THREE.Group(), lid = new THREE.Group();
  g.add(box);
  const wrap = canvasTex(256, 256, (c, w) => {
    c.fillStyle = '#c93a64'; c.fillRect(0, 0, w, w);
    c.fillStyle = 'rgba(255,214,120,0.85)';
    for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
      const px = x * 32 + (y % 2) * 16 + 8, py = y * 32 + 12;
      c.beginPath(); c.moveTo(px, py + 5);
      c.bezierCurveTo(px - 8, py - 1, px - 4, py - 7, px, py - 2);
      c.bezierCurveTo(px + 4, py - 7, px + 8, py - 1, px, py + 5); c.fill();
    }
  });
  const paper = std('#ffffff', { map: wrap, roughness: 0.5, emissive: '#2a0612', emissiveIntensity: 0.6 });
  const gold = std('#f6c25b', { metalness: 0.5, roughness: 0.3, emissive: '#4a3000', emissiveIntensity: 0.6 });
  const base = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.5, 0.62), paper); base.position.y = 0.25; box.add(base);
  [[0.64, 0.52, 0.09], [0.09, 0.52, 0.64]].forEach(([x, y, z]) => { const r = new THREE.Mesh(new THREE.BoxGeometry(x, y, z), gold); r.position.y = 0.25; box.add(r); });
  lid.position.y = 0.565; box.add(lid);
  lid.add(new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.13, 0.68), paper));
  [[0.7, 0.14, 0.1], [0.1, 0.14, 0.7]].forEach(([x, y, z]) => lid.add(new THREE.Mesh(new THREE.BoxGeometry(x, y, z), gold)));
  [-1, 1].forEach((sx) => {
    const loop = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.032, 8, 24), gold);
    loop.position.set(sx * 0.09, 0.14, 0); loop.rotation.set(Math.PI / 2 - 0.5, 0, sx * 0.7); lid.add(loop);
  });
  const knot = new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 8), gold); knot.position.y = 0.1; lid.add(knot);
  const lock = new THREE.Group(); lock.position.set(0, 0.3, 0.335); box.add(lock);
  lock.add(new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.11, 0.05), gold));
  const shackle = new THREE.Mesh(new THREE.TorusGeometry(0.04, 0.012, 6, 14, Math.PI), std('#e8e2d0', { metalness: 0.8, roughness: 0.3 }));
  shackle.position.y = 0.055; lock.add(shackle);
  const hole = new THREE.Mesh(new THREE.CircleGeometry(0.014, 10), new THREE.MeshBasicMaterial({ color: '#2a1a08' })); hole.position.z = 0.026; lock.add(hole);

  const tagTex = canvasTex(256, 140, (c, w, h) => {
    c.fillStyle = '#fbf1dc'; c.fillRect(0, 0, w, h);
    c.strokeStyle = 'rgba(58,38,22,0.25)'; c.lineWidth = 3; c.strokeRect(8, 8, w - 16, h - 16);
    c.fillStyle = '#8a2a17'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.font = "700 44px 'Dancing Script', 'Segoe Script', cursive"; c.fillText('Mở sau nha', w / 2, h / 2 - 6);
    c.font = "500 22px 'Be Vietnam Pro', sans-serif"; c.fillText('♡', w / 2, h / 2 + 38);
  });
  const tag = new THREE.Group(); tag.position.set(0.28, 0.66, 0.2); box.add(tag);
  const tagMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.32, 0.175), std('#ffffff', { map: tagTex, side: THREE.DoubleSide, roughness: 0.9, emissive: '#302418', emissiveIntensity: 0.5 }));
  tagMesh.position.y = -0.12; tag.add(tagMesh);
  const str = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.06, 4), gold); str.position.y = -0.01; tag.add(str);

  const aura = glowSprite('#ff8fb1', 2.2, 0.35, true); aura.position.y = 0.4; g.add(aura);
  g.add(blobShadow(0.6, 0.45));
  return { group: g, box, lid, tag, tagMesh, aura };
}

// ---------------- Lá thư (hiện khi tìm đủ) ----------------
export function makeEnvelope() {
  const tex = canvasTex(256, 176, (c, w, h) => {
    c.fillStyle = '#fbf1dc'; c.fillRect(4, 4, w - 8, h - 8);
    c.strokeStyle = 'rgba(58,38,22,0.25)'; c.lineWidth = 3;
    c.beginPath(); c.moveTo(4, 4); c.lineTo(w / 2, h * 0.58); c.lineTo(w - 4, 4); c.stroke();
    c.beginPath(); c.moveTo(4, h - 4); c.lineTo(w * 0.4, h * 0.5); c.moveTo(w - 4, h - 4); c.lineTo(w * 0.6, h * 0.5); c.stroke();
    c.fillStyle = '#b3261e'; c.beginPath(); c.arc(w / 2, h * 0.58, 22, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#f7d27a'; const x = w / 2, y = h * 0.58 + 2;
    c.beginPath(); c.moveTo(x, y + 9); c.bezierCurveTo(x - 14, y - 1, x - 7, y - 12, x, y - 4); c.bezierCurveTo(x + 7, y - 12, x + 14, y - 1, x, y + 9); c.fill();
  });
  const g = new THREE.Group();
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, fog: false }));
  sp.scale.set(0.9, 0.62, 1); g.add(sp);
  const glow = glowSprite('#ffd98a', 2.6, 0.55); g.add(glow);
  g.visible = false;
  return { group: g, sprite: sp, glow };
}

// ---------------- Đèn trời bay lên ----------------
export function makeSkyLanterns(capacity = 110) {
  const tex = canvasTex(64, 64, (c, w, h) => {
    const gr = c.createLinearGradient(0, h, 0, 0);
    gr.addColorStop(0, '#fff3c4'); gr.addColorStop(0.45, '#ffb347'); gr.addColorStop(1, '#d9542b');
    c.fillStyle = gr; c.fillRect(0, 0, w, h);
    c.fillStyle = 'rgba(120,40,10,0.18)'; for (let i = 0; i < 4; i++) c.fillRect((i / 4) * w, 0, 1.5, h);
  });
  const mesh = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.2, 0.15, 0.36, 8, 1, true),
    new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide, toneMapped: false, fog: false }), capacity);
  mesh.frustumCulled = false;
  const pos = new Float32Array(capacity * 3), col = new Float32Array(capacity * 3);
  for (let i = 0; i < capacity; i++) { col[i * 3] = 1; col[i * 3 + 1] = 0.66; col[i * 3 + 2] = 0.32; }
  const glow = twinklePoints(pos, col, { size: 26, speed: 2.2 });
  const L = [];
  const spawn = (o, wish = false, near = false) => {
    // tránh vòng bay của camera (bán kính ~10–19) để đèn không lướt sát mặt
    const ring = !near && R() < 0.45;                           // vòng gần: chỉ bay phía sau đảo để không che đồ vật
    const a = ring ? Math.PI * (1.1 + R() * 0.8) : R() * Math.PI * 2;
    const d = near ? 1.5 + R() * 6 : ring ? 6.4 + R() * 2.6 : 26 + R() * 18;
    o.x = Math.cos(a) * d; o.z = Math.sin(a) * d;
    o.y = near ? 0.4 + R() * 1.6 : -14 + R() * 42;
    o.v = near ? 0.7 + R() * 0.7 : 0.22 + R() * 0.3;
    o.ph = R() * 6; o.s = wish ? 1.8 : 0.8 + R() * 0.5; o.wish = wish; o.age = 0; o.persist = !near;
    return o;
  };
  const ambient = 40;
  for (let i = 0; i < ambient; i++) L.push(spawn({}));
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), v = new THREE.Vector3(), s = new THREE.Vector3(), e = new THREE.Euler();
  function update(dt, t, cam) {
    const gp = glow.geometry.attributes.position;
    for (let i = L.length - 1; i >= 0; i--) {
      const o = L[i]; o.age += dt;
      o.y += o.v * dt; if (!o.persist) o.v = Math.max(0.35, o.v - dt * 0.04);
      if (o.y > 34) { if (o.persist) { spawn(o); o.y = -14; } else { L.splice(i, 1); continue; } }
    }
    const n = Math.min(L.length, capacity);
    for (let i = 0; i < n; i++) {
      const o = L[i];
      const x = o.x + Math.sin(t * 0.4 + o.ph) * 0.5, z = o.z + Math.cos(t * 0.33 + o.ph) * 0.5;
      e.set(Math.sin(t + o.ph) * 0.08, t * 0.2 + o.ph, Math.cos(t * 0.8 + o.ph) * 0.08); q.setFromEuler(e);
      let grow = Math.min(1, o.age * 1.5);
      if (cam) grow *= Math.min(1, Math.max(0, (Math.hypot(x - cam.x, o.y - cam.y, z - cam.z) - 2.5) / 4));
      s.setScalar(o.s * grow + 0.0001); v.set(x, o.y, z);
      mesh.setMatrixAt(i, m4.compose(v, q, s));
      gp.setXYZ(i, x, grow > 0.05 ? o.y - 0.08 * o.s : -999, z);
    }
    for (let i = n; i < capacity; i++) gp.setXYZ(i, 0, -999, 0);
    mesh.count = n; mesh.instanceMatrix.needsUpdate = true; gp.needsUpdate = true;
    glow.material.uniforms.uTime.value = t;
  }
  function release(count, wishFirst = true) {
    for (let i = 0; i < count && L.length < capacity; i++) L.push(spawn({}, wishFirst && i === 0, true));
    if (wishFirst) { const w = L[L.length - count] || L[L.length - 1]; if (w) { w.x = 0; w.z = 0.4; w.y = 1.2; w.v = 0.9; } }
  }
  update(0, 0);
  return { mesh, glow, update, release };
}

// ---------------- Bầu trời sao, đom đóm ----------------
export function makeStars(n = 1400) {
  const p = [], c = [];
  for (let i = 0; i < n; i++) {
    const u = R(), vv = R(), th = u * Math.PI * 2, ph = Math.acos(1 - vv * 1.15);
    const r = 190;
    p.push(Math.sin(ph) * Math.cos(th) * r, Math.cos(ph) * r, Math.sin(ph) * Math.sin(th) * r);
    const k = R(), b = 0.5 + Math.pow(R(), 3) * 0.9;
    if (k < 0.7) c.push(b, b, b); else if (k < 0.85) c.push(b * 0.8, b * 0.88, b * 1.1); else c.push(b * 1.1, b * 0.92, b * 0.7);
  }
  const pts = twinklePoints(p, c, { size: 2.6, attenuate: false, speed: 1.3 });
  pts.material.fog = false;
  return pts;
}

export function makeFireflies(n = 70) {
  const p = [], c = [];
  for (let i = 0; i < n; i++) {
    const a = R() * Math.PI * 2, d = 0.8 + Math.sqrt(R()) * 5;
    p.push(Math.cos(a) * d, 0.3 + R() * 2.6, Math.sin(a) * d);
    c.push(1, 0.85 + R() * 0.1, 0.45);
  }
  return twinklePoints(p, c, { size: 5.5, drift: 0.35, speed: 2.4 });
}

export function makeHearts() {
  const pool = [];
  const group = new THREE.Group();
  for (let i = 0; i < 12; i++) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: TX.heart, transparent: true, depthWrite: false, opacity: 0, fog: false }));
    s.scale.setScalar(0.25); s.visible = false; group.add(s); pool.push({ s, life: 0 });
  }
  function burst(at) {
    pool.forEach((h, i) => {
      h.s.position.set(at.x + (R() - 0.5) * 0.4, at.y + R() * 0.2, at.z + (R() - 0.5) * 0.4);
      h.life = 1.6 + R() * 0.8; h.max = h.life; h.vx = (R() - 0.5) * 0.3; h.delay = i * 0.06; h.s.visible = true;
    });
  }
  function update(dt) {
    pool.forEach((h) => {
      if (!h.s.visible) return;
      if (h.delay > 0) { h.delay -= dt; return; }
      h.life -= dt;
      if (h.life <= 0) { h.s.visible = false; h.s.material.opacity = 0; return; }
      const k = h.life / h.max;
      h.s.position.y += dt * 0.6; h.s.position.x += h.vx * dt;
      h.s.material.opacity = Math.min(1, (1 - k) * 5) * k;
      h.s.scale.setScalar(0.16 + (1 - k) * 0.14);
    });
  }
  return { group, burst, update };
}
