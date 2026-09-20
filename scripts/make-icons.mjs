import { writeFileSync } from "node:fs";
import { deflateSync } from "node:zlib";

let T;
function crc32(b) {
  if (!T) { T = []; for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; T[n] = c >>> 0; } }
  let c = 0xffffffff; for (const x of b) c = T[(c ^ x) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) | 0;
}
function png(size, draw) {
  const rows = [];
  for (let y = 0; y < size; y++) { const row = [0]; for (let x = 0; x < size; x++) row.push(...draw(x, y)); rows.push(Buffer.from(row)); }
  const raw = Buffer.concat(rows);
  const chunk = (type, data) => { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type), data]); const crc = Buffer.alloc(4); crc.writeInt32BE(crc32(td)); return Buffer.concat([len, td, crc]); };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4); ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ihdr), chunk("IDAT", deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]);
}
for (const size of [192, 512]) {
  const r = size * 0.22, cx = size / 2, cy = size / 2;
  const buf = png(size, (x, y) => {
    const corner = (qx, qy) => Math.hypot(x - qx, y - qy) < r;
    const inRound = (x >= r || y >= r || corner(r, r)) && (x <= size - r || y >= r || corner(size - r, r)) && (x >= r || y <= size - r || corner(r, size - r)) && (x <= size - r || y <= size - r || corner(size - r, size - r));
    if (!inRound) return [0, 0, 0, 0];
    let petal = false;
    for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2 - Math.PI / 2; const px = cx + Math.cos(a) * size * 0.17, py = cy + Math.sin(a) * size * 0.17; if (Math.hypot(x - px, y - py) < size * 0.13) petal = true; }
    if (Math.hypot(x - cx, y - cy) < size * 0.08) return [226, 176, 74, 255];
    if (petal) return [255, 255, 255, 255];
    return [217, 69, 108, 255];
  });
  writeFileSync(`public/icon-${size}.png`, buf);
}
console.log("icons written");
