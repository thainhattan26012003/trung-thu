// Giao diện: thẻ lời nhắn, lá thư, điều ước, "bất ngờ sẽ đến sau", thanh trên cùng.
import { Sound } from './audio.js';

const ORDER = ['moon', 'cakes', 'lantern', 'lion', 'rabbit', 'star'];
const ICONS = {
  moon: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"/><circle cx="9.5" cy="10" r="1.5"/><circle cx="14.5" cy="14.5" r="2.1"/></svg>',
  cakes: '<svg viewBox="0 0 24 24"><path d="M12 3.5l2 1.2 2.3-.3 1 2.1 2.1 1-.3 2.3 1.2 2-1.2 2 .3 2.3-2.1 1-1 2.1-2.3-.3-2 1.2-2-1.2-2.3.3-1-2.1-2.1-1 .3-2.3L3.5 12l1.2-2-.3-2.3 2.1-1 1-2.1 2.3.3z"/><path d="M12 15.5c-2.6-1.8-3.4-3-3.4-4.1a1.8 1.8 0 0 1 3.4-.8 1.8 1.8 0 0 1 3.4.8c0 1.1-.8 2.3-3.4 4.1z"/></svg>',
  lantern: '<svg viewBox="0 0 24 24"><path d="M12 2v2.5M9 4.5h6M9 19.5h6M12 19.5V22"/><ellipse cx="12" cy="12" rx="6.5" ry="7.5"/><path d="M12 4.5c-2.6 2-2.6 13 0 15M12 4.5c2.6 2 2.6 13 0 15"/></svg>',
  lion: '<svg viewBox="0 0 24 24"><ellipse cx="12" cy="8" rx="7" ry="2.6"/><path d="M5 8v8.5c0 1.5 3.1 2.7 7 2.7s7-1.2 7-2.7V8"/><path d="M7.5 3l3 4M16.5 3l-3 4"/></svg>',
  rabbit: '<svg viewBox="0 0 24 24"><path d="M9.3 10C7.5 7 7.3 2.8 8.7 2.8S11.2 6.6 11 10M14.7 10c1.8-3 2-7.2.6-7.2S12.8 6.6 13 10"/><circle cx="12" cy="15" r="5.8"/><path d="M11 16.5h2"/></svg>',
  star: '<svg viewBox="0 0 24 24"><path d="M12 3l2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 16.6l-5.4 2.9 1.2-6-4.5-4.2 6.1-.7z"/></svg>',
  wish: '<svg viewBox="0 0 24 24"><path d="M8 5h8l-1 11H9z"/><path d="M10 16v3M14 16v3M12 5V2.5"/></svg>',
};
const LOCK = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" style="vertical-align:-2px;margin-right:6px"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>';

export function createUI({ config, getWorld }) {
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const found = new Set();
  let letterUnlocked = false, wishText = '', giftTimer = 0, toastTimer = 0, hintShown = false;
  const name = config.herName;

  // ---------- Tiện ích ----------
  function open(el) {
    el.hidden = false;
    requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('open')));
  }
  function close(el, cb) {
    if (el.hidden) return;
    el.classList.remove('open');
    setTimeout(() => { el.hidden = true; cb && cb(); }, 460);
  }
  function toast(msg, ms = 3200) {
    const t = $('toast');
    t.textContent = msg; t.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), ms);
  }
  function button(label, cls, onClick) {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'btn ' + (cls || ''); b.textContent = label;
    b.addEventListener('click', onClick);
    return b;
  }
  document.querySelectorAll('[data-close]').forEach((el) => el.addEventListener('click', () => {
    const box = el.closest('.sheet, .modal');
    if (box.id === 'sheet') closeSheet(); else if (box.id === 'gift') closeGift(); else close(box);
  }));
  window.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    ['wish', 'letter'].forEach((id) => close($(id)));
    closeGift(); closeSheet();
  });

  // ---------- Thẻ lời nhắn ----------
  let sheetOnClose = null;
  function showSheet({ icon, eyebrow, title, text, actions }) {
    $('sheetIcon').innerHTML = icon || '';
    $('sheetEyebrow').textContent = eyebrow || '';
    $('sheetTitle').textContent = title;
    $('sheetText').textContent = text;
    const box = $('sheetActions'); box.innerHTML = '';
    actions.forEach((a) => box.appendChild(a));
    open($('sheet'));
    setTimeout(() => { const b = box.querySelector('button'); if (b) b.focus({ preventScroll: true }); }, 500);
  }
  function closeSheet(cb) {
    close($('sheet'), () => {
      const w = getWorld(); if (w) w.unfocus();
      const fn = sheetOnClose; sheetOnClose = null;
      fn && fn(); cb && cb();
    });
  }

  function showSecret(key, isNew) {
    const s = config.secrets[key];
    const all = found.size === ORDER.length;
    const actions = [];
    if (all && isNew) {
      actions.push(button('Mở lá thư', 'btn-lantern', () => closeSheet(openLetter)));
      actions.push(button('Để sau', '', () => closeSheet()));
    } else {
      const left = ORDER.length - found.size;
      actions.push(button(left ? `Tìm tiếp (còn ${left})` : 'Đóng', '', () => closeSheet()));
    }
    showSheet({ icon: ICONS[key], eyebrow: isNew ? `Điều bí mật ${found.size}/${ORDER.length}` : 'Điều bí mật', title: s.title, text: s.text, actions });
  }

  function unlockLetter() {
    if (letterUnlocked) return;
    letterUnlocked = true;
    const b = $('btnLetter');
    b.classList.remove('locked'); b.classList.add('pulse'); b.setAttribute('aria-label', 'Mở lá thư');
    const w = getWorld(); if (w) w.showEnvelope();
  }

  function updateCounter() {
    $('foundN').textContent = found.size;
    const c = $('counter'); c.classList.remove('bump'); void c.offsetWidth; c.classList.add('bump');
  }

  function handleTap(key) {
    const w = getWorld();
    if (!hintShown) { hintShown = true; $('hudHint').classList.remove('on'); }
    if (key === 'gift') { if (w) w.react('gift'); Sound.tick(); openGift(); return; }
    if (key === 'envelope') { Sound.tick(); openLetter(); return; }
    const isNew = !found.has(key);
    if (isNew) { found.add(key); if (w) w.setFound(key); updateCounter(); Sound.chime(); }
    else Sound.tick();
    if (found.size === ORDER.length) unlockLetter();
    if (w) { w.react(key); w.focus(key); }
    showSecret(key, isNew);
  }

  // ---------- Lá thư ----------
  function openLetter() {
    if (!letterUnlocked) { toast(`Tìm đủ ${ORDER.length} điều bí mật để mở lá thư nha (còn ${ORDER.length - found.size})`); return; }
    $('btnLetter').classList.remove('pulse');
    $('letterTo').textContent = `Gửi ${name},`;
    const body = $('letterBody'); body.innerHTML = '';
    const paras = config.letter.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
    paras.forEach((p, i) => {
      const el = document.createElement('p');
      el.textContent = p; el.style.animationDelay = `${0.35 + i * 0.55}s`;
      body.appendChild(el);
    });
    const sign = $('letterSign');
    sign.innerHTML = `Gửi em bé ${esc(name)},<br>${esc(config.fromName)}`;
    sign.style.animationDelay = `${0.35 + paras.length * 0.55}s`;
    const paper = $('letter').querySelector('.paper'); paper.scrollTop = 0;
    open($('letter'));
  }
  $('btnWish').addEventListener('click', () => close($('letter'), () => { open($('wish')); setTimeout(() => $('wishInput').focus(), 450); }));

  // ---------- Điều ước ----------
  $('wishForm').addEventListener('submit', (e) => {
    e.preventDefault();
    wishText = $('wishInput').value.trim();
    $('wishInput').blur();
    close($('wish'), () => {
      const w = getWorld(); if (w) w.releaseLanterns();
      setTimeout(showAfterWish, 7000);
    });
  });
  function showAfterWish() {
    const actions = [
      button('Gửi điều ước cho anh', 'btn-lantern', shareWish),
      button('Còn một bất ngờ nữa', '', () => closeSheet(openGift)),
    ];
    showSheet({
      icon: ICONS.wish, eyebrow: 'Đèn đã bay', title: 'Điều ước đã lên tới cung trăng',
      text: wishText ? `“${wishText}”\n\nChị Hằng nhận được rồi. Anh sẽ cố gắng giúp chị Hằng thực hiện nó.` : 'Trăng nghe thấy rồi, kể cả những điều em chưa nói ra.',
      actions,
    });
    $('btnGift').classList.add('pulse');
  }
  async function shareWish() {
    const msg = wishText ? `Điều ước đêm rằm của ${name}: “${wishText}”` : `${name} đã thả đèn ước nguyện rồi nè`;
    try {
      if (navigator.share) { await navigator.share({ text: msg }); return; }
    } catch (err) { if (err && err.name === 'AbortError') return; }
    try { await navigator.clipboard.writeText(msg); toast('Đã chép điều ước, dán vào tin nhắn gửi anh nha'); }
    catch (err) { toast('Em chụp màn hình gửi anh cũng được nha'); }
  }

  // ---------- Hộp quà ----------
  // Chỉ có gift.intro thì hiện mỗi lời nhắn; có thêm gift.steps thì hiện cả hành trình, đếm ngược, gợi ý, phiếu nhận quà.
  const G = config.gift || {};
  const tracking = Array.isArray(G.steps) && G.steps.length > 0;
  const fmtDate = (ms) => { const d = new Date(ms); return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`; };
  function renderGift() {
    $('gift').classList.toggle('solo', !tracking);
    $('giftEyebrow').hidden = !G.code;
    $('giftCode').textContent = G.code || '';
    $('giftIntro').textContent = G.intro || '';
    $('giftTrack').hidden = !tracking;
    $('giftTrack').innerHTML = tracking ? G.steps.map((s, i) => {
      const cls = i < G.current ? 'done' : i === G.current ? 'now' : 'todo';
      return `<li class="${cls}"><span>${esc(s)}${cls === 'now' ? '<small>đang diễn ra</small>' : ''}</span></li>`;
    }).join('') : '';
    const now = Date.now(), hints = G.hints || [];
    $('giftHintsLabel').hidden = $('giftHints').hidden = !hints.length;
    $('giftHints').innerHTML = hints.map((h) => {
      const at = Date.parse(h.unlock);
      return now >= at ? `<li>${esc(h.text)}</li>` : `<li class="locked">${LOCK}Mở khóa ngày ${fmtDate(at)}</li>`;
    }).join('');
    $('giftTicket').hidden = !tracking;
    $('ticketTo').textContent = `Dành riêng cho ${name}`;
    tickEta();
  }
  function tickEta() {
    const box = $('giftEta'), eta = G.eta ? Date.parse(G.eta) : NaN;
    if (!tracking) { box.innerHTML = ''; return; }
    const delivered = G.current >= G.steps.length - 1;
    if (delivered || (!isNaN(eta) && Date.now() >= eta)) {
      box.innerHTML = '<p class="arrived">Quà tới rồi đó! Nếu em chưa thấy thì hỏi anh liền nha.</p>'; return;
    }
    if (isNaN(eta)) { box.innerHTML = '<p class="arrived">Dự kiến: sắp tới rồi, em chờ thêm chút nha.</p>'; return; }
    let s = Math.floor((eta - Date.now()) / 1000);
    const d = Math.floor(s / 86400); s -= d * 86400;
    const h = Math.floor(s / 3600); s -= h * 3600;
    const m = Math.floor(s / 60); s -= m * 60;
    const cell = (v, l) => `<div><b>${String(v).padStart(2, '0')}</b><span>${l}</span></div>`;
    box.innerHTML = `<p class="label">Dự kiến tới tay em sau</p><div class="countdown">${cell(d, 'ngày')}${cell(h, 'giờ')}${cell(m, 'phút')}${cell(s, 'giây')}</div>`;
  }
  function openGift() {
    $('btnGift').classList.remove('pulse');
    renderGift();
    clearInterval(giftTimer); if (tracking) giftTimer = setInterval(tickEta, 1000);
    const w = getWorld(); if (w) w.focus('gift');
    open($('gift'));
  }
  function closeGift() {
    clearInterval(giftTimer);
    close($('gift'), () => { const w = getWorld(); if (w) w.unfocus(); });
  }

  // ---------- Thanh trên cùng ----------
  $('totalN').textContent = ORDER.length;
  const soundBtn = $('btnSound');
  const paintSound = () => {
    const m = Sound.isMuted();
    soundBtn.querySelector('.wave').style.display = m ? 'none' : '';
    soundBtn.querySelector('.mute').style.display = m ? '' : 'none';
    soundBtn.setAttribute('aria-label', m ? 'Bật âm thanh' : 'Tắt âm thanh');
  };
  soundBtn.addEventListener('click', () => { Sound.init(); Sound.setMuted(!Sound.isMuted()); if (!Sound.isMuted()) Sound.startMusic(); paintSound(); });
  paintSound();
  $('btnLetter').addEventListener('click', () => { Sound.tick(); openLetter(); });
  $('btnGift').addEventListener('click', () => { Sound.tick(); openGift(); });
  $('btnTilt').addEventListener('click', async () => {
    const w = getWorld(); if (!w) return;
    const r = await w.toggleTilt();
    $('btnTilt').classList.toggle('pulse', r === 'on');
    toast({ on: 'Nghiêng điện thoại để nhìn quanh nha', off: 'Đã tắt nghiêng máy', denied: 'Máy chưa cho dùng cảm biến nghiêng, em kéo tay để xoay nha' }[r], 2600);
  });

  function enterWorld() {
    const w = getWorld();
    $('hud').hidden = false;
    if (w && w.tiltSupported) $('btnTilt').hidden = false;
    const top = document.querySelector('.hud-top');
    top.style.opacity = '0';
    setTimeout(() => $('titleCard').classList.add('on'), 3000);
    setTimeout(() => { $('titleCard').classList.remove('on'); top.style.opacity = '1'; }, 7600);
    setTimeout(() => { if (!hintShown) $('hudHint').classList.add('on'); }, 8200);
    setTimeout(() => $('hudHint').classList.remove('on'), 18000);
  }

  // ---------- Dự phòng khi không chạy được 3D ----------
  function showFallback() {
    const f = $('fallback');
    ORDER.forEach((k) => found.add(k));
    letterUnlocked = true;
    f.innerHTML = `<div class="fallback-inner">
      <p class="eyebrow" style="text-align:center">15 · 8 âm lịch</p>
      <h2>Trung Thu vui vẻ</h2>
      ${ORDER.map((k) => `<div class="item glass"><h3>${esc(config.secrets[k].title)}</h3><p>${esc(config.secrets[k].text)}</p></div>`).join('')}
      <button class="btn btn-lantern" id="fbLetter">Mở lá thư</button>
      <button class="btn" id="fbGift">Bất ngờ sẽ đến sau</button>
    </div>`;
    f.hidden = false;
    $('fbLetter').addEventListener('click', openLetter);
    $('fbGift').addEventListener('click', openGift);
  }

  return {
    handleTap, enterWorld, showFallback, toast,
    debugFindAll() { ORDER.forEach((k) => { found.add(k); const w = getWorld(); if (w) w.setFound(k); }); updateCounter(); unlockLetter(); },
  };
}
