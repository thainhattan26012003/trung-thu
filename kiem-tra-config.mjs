// Kiểm tra thiep-trung-thu/config.js trước khi xem thử hoặc đưa lên mạng.
// Chạy: node kiem-tra-config.mjs   (các file .cmd tự gọi, không cần chạy tay)
import { pathToFileURL } from 'node:url';
import { resolve, join } from 'node:path';
import { copyFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';

const file = resolve(process.argv[2] || 'thiep-trung-thu/config.js');
const fail = (msg) => { console.error('\nLOI trong config.js: ' + msg + '\n'); process.exit(1); };

let CONFIG;
try {
  ({ CONFIG } = await import(pathToFileURL(file).href));
} catch (e) {
  // Cho Node soát cú pháp bản sao .mjs để chỉ ra đúng dòng bị sai
  const tmp = join(tmpdir(), `kiem-tra-config-${process.pid}.mjs`);
  let detail = e.message;
  try {
    copyFileSync(file, tmp);
    const r = spawnSync(process.execPath, ['--check', tmp], { encoding: 'utf8' });
    const out = (r.stderr || '').split(tmp).join('config.js').split(pathToFileURL(tmp).href).join('config.js');
    const lines = out.split('\n').filter((l) => l.trim() && !l.includes('Node.js v') && !/^\s+at /.test(l));
    if (lines.length) detail = lines.slice(0, 5).join('\n');
  } catch (err) { /* giữ thông báo gốc */ } finally { rmSync(tmp, { force: true }); }
  fail(`\n${detail}\n\nThường là thiếu dấu nháy ' hoặc dấu phẩy ở dòng được chỉ (hoặc dòng ngay trên).`);
}

const ISO = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2})?)?(Z|[+-]\d{2}:\d{2})?$/;
const badDate = (v) => typeof v !== 'string' || !ISO.test(v) || isNaN(Date.parse(v));
const DATE_HINT = "Viết theo mẫu năm-tháng-ngày, ví dụ '2026-10-03T19:00:00+07:00' (7 giờ tối 3/10).";

if (!CONFIG) fail('không tìm thấy "export const CONFIG".');
for (const k of ['herName', 'fromName', 'poem', 'secrets', 'letter', 'gift']) if (!(k in CONFIG)) fail(`thiếu mục "${k}".`);
if (!Array.isArray(CONFIG.poem) || CONFIG.poem.length < 1 || CONFIG.poem.length > 6) fail('"poem" phải có từ 1 đến 6 câu.');
if (CONFIG.poem.some((s) => typeof s !== 'string' || !s.trim())) fail('"poem" có câu bị trống.');
for (const k of ['moon', 'cakes', 'lantern', 'lion', 'rabbit', 'star']) {
  const s = CONFIG.secrets[k];
  if (!s || !s.title || !s.text) fail(`thiếu tiêu đề hoặc lời nhắn ở "secrets.${k}".`);
}
const G = CONFIG.gift || {};
if (!G.intro) fail('thiếu lời nhắn "gift.intro" (hiện ra khi chạm vào hộp quà).');
// Các mục theo dõi quà (eta, steps, current, hints) là tùy chọn: chỉ kiểm tra khi có
if (G.eta !== undefined && G.eta !== null && badDate(G.eta)) fail(`"gift.eta" sai định dạng: ${G.eta}. ${DATE_HINT} Chưa biết ngày thì để null.`);
if (G.steps !== undefined) {
  if (!Array.isArray(G.steps) || !G.steps.length) fail('"gift.steps" phải là danh sách các chặng.');
  if (!(G.current >= 0 && G.current < G.steps.length)) fail(`"gift.current" phải là số từ 0 đến ${G.steps.length - 1}.`);
}
for (const h of G.hints || []) if (badDate(h.unlock)) fail(`ngày mở gợi ý sai định dạng: ${h.unlock}. ${DATE_HINT}`);

console.log('config.js OK');
