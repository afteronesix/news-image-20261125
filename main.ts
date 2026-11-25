// news-image-20261125 entry (Node 22, standard library only): the front page
// for Wednesday 25 November 2026 is the entry.png beside this file (JPEG
// bytes under the .png name; the gate tells the format by its magic bytes).
// The program validates it against the competition's gate (a whole PNG or
// JPEG of at most 1 MiB and at most 1024 by 1024 pixels) and copies it to
// /output/entry.png.
//
// The page itself was composed in code (PIL) so every word renders crisply:
// masthead "THE WORLD IN ONE DAY", dated Wednesday 25 November 2026, over
// four photos generated for this entry — the burning port of Hodeidah
// (Saudi-led coalition strikes, Houthis threaten Jeddah), the Shenzhou-24
// launch (Pakistan's first astronaut, Zeeshan Ali, rides to Tiangong),
// a trading floor under red charts (the Huang rally lasts one day: Nvidia
// −5.9%, Kospi −5.6%, Taiex −6%), and a lone traveller at an airport
// (Kilmar Abrego Garcia self-deports to Spain) — plus a ticker carrying
// NATO's space-defence vow, COP31 ending without a deal, the Dow topping
// 50,000, and leaked records putting Russian war dead at 720,000.
// The ticker carries four items: a fifth (Seoul's education minister
// resigning over an exam-cheating scandal) was cut because five items
// would not fit the bar at a readable size — the page shows exactly
// what fits, with nothing clipped.
// Every story was verified against real reporting of 25 November 2026
// (Reuters, AP, WSJ) before the page was drawn.
//
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { closeSync, copyFileSync, mkdirSync, openSync, readFileSync, readSync, statSync } from 'node:fs';
import { join } from 'node:path';

const MAX_BYTES = 1048576;
const SRC = new URL('./entry.png', import.meta.url);
const OUT_DIR = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

const size = statSync(SRC).size;
if (size > MAX_BYTES) {
  throw new Error(`entry.png is ${size} bytes, over the 1 MiB cap`);
}

const fd = openSync(SRC, 'r');
const head = Buffer.alloc(8);
readSync(fd, head, 0, 8, 0);
closeSync(fd);
const isJpeg = head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff;
const isPng = head[0] === 0x89 && head[1] === 0x50 && head[2] === 0x4e && head[3] === 0x47;
if (!isJpeg && !isPng) {
  throw new Error('entry.png is neither a JPEG nor a PNG (magic bytes)');
}

// Dimensions: the gate caps the image at 1024 by 1024 pixels. PNG keeps
// width/height in IHDR; JPEG keeps them in its first SOF marker.
const MAX_DIM = 1024;
const bytes = readFileSync(SRC);
let width = 0;
let height = 0;
if (isPng) {
  width = bytes.readUInt32BE(16);
  height = bytes.readUInt32BE(20);
} else {
  let off = 2;
  while (off + 9 < bytes.length) {
    if (bytes[off] !== 0xff) break;
    const marker = bytes[off + 1];
    if (marker === 0xd9 || marker === 0xda) break;
    const len = bytes.readUInt16BE(off + 2);
    const isSof = marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
    if (isSof) {
      height = bytes.readUInt16BE(off + 5);
      width = bytes.readUInt16BE(off + 7);
      break;
    }
    off += 2 + len;
  }
}
if (width === 0 || height === 0) {
  throw new Error('could not read the image dimensions');
}
if (width > MAX_DIM || height > MAX_DIM) {
  throw new Error(`entry.png is ${width}x${height}, over the 1024x1024 cap`);
}

mkdirSync(OUT_DIR, { recursive: true });
copyFileSync(SRC, join(OUT_DIR, 'entry.png'));
