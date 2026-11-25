// Reads LinkedIn export files in the browser: .csv, .zip (nested), .gz. Nothing leaves the device.
export const LIMITS = Object.freeze({entries: 800, total: 300e6, depth: 3});
const u16 = (d, o) => d.getUint16(o, true), u32 = (d, o) => d.getUint32(o, true), u64 = (d, o) => Number(d.getBigUint64(o, true));
export const isZip = b => b.length > 3 && b[0] === 0x50 && b[1] === 0x4b && (b[2] === 3 || b[2] === 5) && (b[3] === 4 || b[3] === 6);
export const isGzip = b => b.length > 2 && b[0] === 0x1f && b[1] === 0x8b;
const damaged = () => new Error('That zip file looks damaged or incomplete.');

export async function inflate(bytes, format, max) {
  if (typeof DecompressionStream === 'undefined') throw new Error('This browser cannot open compressed files. Unzip the file first and add the CSV.');
  const ds = new DecompressionStream(format), writer = ds.writable.getWriter(), reader = ds.readable.getReader(), parts = [];
  let size = 0;
  const write = writer.write(bytes).then(() => writer.close());
  const pump = (async () => {
    for (;;) {
      const r = await reader.read();
      if (r.done) return;
      size += r.value.length;
      if (size > max) { reader.cancel(); throw new Error('A file inside is too large to open here.'); }
      parts.push(r.value);
    }
  })();
  await Promise.all([write, pump]);
  const out = new Uint8Array(size);
  let o = 0;
  for (const p of parts) { out.set(p, o); o += p.length; }
  return out;
}

export function zipEntries(b) {
  const d = new DataView(b.buffer, b.byteOffset, b.byteLength);
  let e = -1;
  for (let i = b.length - 22; i >= Math.max(0, b.length - 65557); i--) if (u32(d, i) === 0x06054b50) { e = i; break; }
  if (e < 0) throw damaged();
  let count = u16(d, e + 10), cdOff = u32(d, e + 16);
  if ((count === 0xffff || cdOff === 0xffffffff) && e >= 20 && u32(d, e - 20) === 0x07064b50) {
    const z = u64(d, e - 12);
    if (u32(d, z) === 0x06064b50) { count = u64(d, z + 32); cdOff = u64(d, z + 48); }
  }
  if (count > LIMITS.entries * 4) throw new Error('That zip has too many files to open here.');
  const out = [];
  let p = cdOff;
  for (let n = 0; n < count; n++) {
    if (p + 46 > b.length || u32(d, p) !== 0x02014b50) throw damaged();
    const flags = u16(d, p + 8), method = u16(d, p + 10), nl = u16(d, p + 28), el = u16(d, p + 30), cl = u16(d, p + 32);
    let cs = u32(d, p + 20), us = u32(d, p + 24), lho = u32(d, p + 42);
    const name = new TextDecoder('utf-8').decode(b.subarray(p + 46, p + 46 + nl));
    let ex = p + 46 + nl;
    const exEnd = ex + el;
    while (ex + 4 <= exEnd) {
      const id = u16(d, ex), sz = u16(d, ex + 2);
      if (id === 1) {
        let q = ex + 4;
        if (us === 0xffffffff) { us = u64(d, q); q += 8; }
        if (cs === 0xffffffff) { cs = u64(d, q); q += 8; }
        if (lho === 0xffffffff) lho = u64(d, q);
      }
      ex += 4 + sz;
    }
    out.push({name, flags, method, cs, us, lho});
    p += 46 + nl + el + cl;
  }
  return out;
}

async function zipRead(b, en) {
  const d = new DataView(b.buffer, b.byteOffset, b.byteLength), l = en.lho;
  if (l + 30 > b.length || u32(d, l) !== 0x04034b50) throw damaged();
  const start = l + 30 + u16(d, l + 26) + u16(d, l + 28), raw = b.subarray(start, start + en.cs);
  if (en.method === 0) return raw;
  if (en.method === 8) return inflate(raw, 'deflate-raw', Math.max(en.us, 1) + 1024);
  throw new Error('This zip uses a compression type that is not supported. Unzip it and add the CSV.');
}

const baseName = n => n.split(/[\\/]/).pop();

async function expand(name, bytes, depth, acc) {
  if (isGzip(bytes)) {
    const out = await inflate(bytes, 'gzip', LIMITS.total);
    acc.total += out.length;
    return expand(name.replace(/\.gz$/i, ''), out, depth, acc);
  }
  if (isZip(bytes)) {
    if (depth > LIMITS.depth) return;
    const list = zipEntries(bytes).filter(en => !/\/$/.test(en.name) && !/(^|\/)(__MACOSX|\.DS_Store)/.test(en.name));
    if (list.length > LIMITS.entries) throw new Error('That zip has too many files to open here.');
    for (const en of list) {
      if (!/\.(csv|txt|zip|gz|jpe?g|png|webp|gif)$/i.test(en.name)) { acc.skipped++; continue; }
      if (en.flags & 1) throw new Error('That zip is password protected. Unzip it first, then add the CSV.');
      acc.total += en.us;
      if (acc.total > LIMITS.total) throw new Error('That zip is too large to open here.');
      await expand(en.name, await zipRead(bytes, en), depth + 1, acc);
    }
    return;
  }
  if (/\.(jpe?g|png|webp|gif)$/i.test(name)) { acc.images.push({name: baseName(name), bytes}); return; }
  if (/\.(csv|txt)$/i.test(name) || depth === 0) acc.files.push({name: baseName(name), text: new TextDecoder('utf-8').decode(bytes)});
  else acc.skipped++;
}

// files: array of {name, bytes: Uint8Array}. Returns {files:[{name,text}], images, skipped}.
export async function readAny(files) {
  const acc = {files: [], images: [], skipped: 0, total: 0};
  for (const f of files) await expand(f.name, f.bytes, 0, acc);
  return acc;
}
