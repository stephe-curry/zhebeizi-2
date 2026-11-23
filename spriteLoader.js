// 运行时轻像素雪碧图加载器：自动泛洪去除米色网格背景 + 强制将 66-80+ 岁身高对齐 51-65 岁！
const cache = { male: null, female: null, bubbles: null };

function isCreamBg(r, g, b) {
  return r > 210 && g > 200 && b > 170 && Math.abs(r - g) < 28 && (r - b) < 55;
}
function isFloorShadow(r, g, b) {
  return r > 165 && g > 152 && b > 128 && Math.abs(r - g) < 26 && (r - b) < 55;
}

function loadImg(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function floodClearBg(imgData, w, h, clearBottomShadow = true) {
  const d = imgData.data;
  const vis = new Uint8Array(w * h);
  const q = new Int32Array(w * h);
  let head = 0, tail = 0;

  const tryPush = (x, y) => {
    const idx = y * w + x;
    if (vis[idx]) return;
    const i = idx * 4;
    const r = d[i], g = d[i + 1], b = d[i + 2];
    if (isCreamBg(r, g, b) || (clearBottomShadow && y > h * 0.87 && isFloorShadow(r, g, b))) {
      vis[idx] = 1;
      q[tail++] = idx;
    }
  };

  for (let x = 0; x < w; x++) { tryPush(x, 0); tryPush(x, h - 1); }
  for (let y = 0; y < h; y++) { tryPush(0, y); tryPush(w - 1, y); }

  while (head < tail) {
    const idx = q[head++];
    const cx = idx % w;
    const cy = (idx - cx) / w;
    const i = idx * 4;
    d[i + 3] = 0;
    if (cx > 0) tryPush(cx - 1, cy);
    if (cx + 1 < w) tryPush(cx + 1, cy);
    if (cy > 0) tryPush(cx, cy - 1);
    if (cy + 1 < h) tryPush(cx, cy + 1);
  }
  // 顺手清理下半身封闭空隙（如双腿间残留的米色网格块）
  if (clearBottomShadow) {
    for (let y = Math.floor(h * 0.62); y < h; y++) {
      for (let x = Math.floor(w * 0.25); x < Math.floor(w * 0.75); x++) {
        const i = (y * w + x) * 4;
        if (d[i + 3] > 0 && isCreamBg(d[i], d[i + 1], d[i + 2])) {
          d[i + 3] = 0;
        }
      }
    }
  }
}

function tightCropCanvas(srcCanvas) {
  const w = srcCanvas.width, h = srcCanvas.height;
  const ctx = srcCanvas.getContext('2d');
  const d = ctx.getImageData(0, 0, w, h).data;
  let minX = w, maxX = -1, minY = h, maxY = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (d[(y * w + x) * 4 + 3] > 20) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < minX || maxY < minY) return srcCanvas;
  const cw = maxX - minX + 1, ch = maxY - minY + 1;
  const out = document.createElement('canvas');
  out.width = cw; out.height = ch;
  out.getContext('2d').drawImage(srcCanvas, minX, minY, cw, ch, 0, 0, cw, ch);
  return out;
}

export async function loadCharacterSprites(gender) {
  if (cache[gender]) return cache[gender];
  const src = gender === 'female' ? './assets/sheets/female_sheet.jpg' : './assets/sheets/male_sheet.jpg';
  const img = await loadImg(src);
  const W = img.width, H = img.height;
  const full = document.createElement('canvas');
  full.width = W; full.height = H;
  const fctx = full.getContext('2d');
  fctx.drawImage(img, 0, 0);

  const yTop = Math.floor(H * 0.145);
  const yBot = Math.floor(H * 0.885);
  const bandH = yBot - yTop;
  const bandData = fctx.getImageData(0, yTop, W, bandH).data;

  // 垂直投影定位 7 个角色区间
  const segs = [];
  let inS = false, st = 0;
  for (let x = 0; x < W; x++) {
    let cnt = 0;
    for (let y = 0; y < bandH; y += 2) {
      const i = (y * W + x) * 4;
      if (!isCreamBg(bandData[i], bandData[i + 1], bandData[i + 2])) cnt++;
    }
    const has = cnt > 6;
    if (has && !inS) { inS = true; st = x; }
    else if (!has && inS) {
      inS = false;
      if (x - st > W * 0.04) segs.push([st, x]);
    }
  }
  if (inS && W - st > W * 0.04) segs.push([st, W]);
  const finalSegs = segs.length === 7
    ? segs
    : Array.from({ length: 7 }, (_, i) => [Math.floor(i * W / 7), Math.floor((i + 1) * W / 7)]);

  const cropped = finalSegs.map(([x0, x1]) => {
    const bx0 = Math.max(0, x0 - 6);
    const bx1 = Math.min(W, x1 + 6);
    const sw = bx1 - bx0;
    const c = document.createElement('canvas');
    c.width = sw; c.height = bandH;
    const ctx = c.getContext('2d');
    ctx.drawImage(full, bx0, yTop, sw, bandH, 0, 0, sw, bandH);
    const id = ctx.getImageData(0, 0, sw, bandH);
    floodClearBg(id, sw, bandH, true);
    ctx.putImageData(id, 0, 0);
    return tightCropCanvas(c);
  });

  // 强制校准：66-80+ 岁（index 6）站立身高与 51-65 岁（index 5）完全持平！
  const h5 = cropped[5].height;
  const c6 = cropped[6];
  if (c6.height < h5) {
    const scaled = document.createElement('canvas');
    scaled.width = Math.round(c6.width * (h5 / c6.height));
    scaled.height = h5;
    const sctx = scaled.getContext('2d');
    sctx.imageSmoothingEnabled = false;
    sctx.drawImage(c6, 0, 0, scaled.width, h5);
    cropped[6] = scaled;
  }

  // 统一底部脚齐平画布，确保成长切换时双脚稳踩同一地平线
  const maxW = Math.max(...cropped.map(c => c.width));
  const maxH = Math.max(...cropped.map(c => c.height));
  const urls = cropped.map(c => {
    const norm = document.createElement('canvas');
    norm.width = maxW; norm.height = maxH;
    const nctx = norm.getContext('2d');
    nctx.imageSmoothingEnabled = false;
    nctx.drawImage(c, Math.round((maxW - c.width) / 2), maxH - c.height);
    return norm.toDataURL('image/png');
  });

  // 同步提取右上角 6 枚轻像素情绪气泡
  if (!cache.bubbles) {
    const byTop = Math.floor(H * 0.02), byBot = Math.floor(H * 0.14), bh = byBot - byTop;
    const bxStart = Math.floor(W * 0.65);
    const bData = fctx.getImageData(bxStart, byTop, W - bxStart, bh).data;
    const bsegs = [];
    let bIn = false, bSt = 0;
    for (let x = 0; x < W - bxStart; x++) {
      let cnt = 0;
      for (let y = 0; y < bh; y++) {
        const i = (y * (W - bxStart) + x) * 4;
        if (!isCreamBg(bData[i], bData[i + 1], bData[i + 2])) cnt++;
      }
      if (cnt > 4 && !bIn) { bIn = true; bSt = x; }
      else if (cnt <= 4 && bIn) {
        bIn = false;
        if (x - bSt > 18) bsegs.push([bxStart + bSt, bxStart + x]);
      }
    }
    if (bIn && (W - bxStart - bSt) > 18) bsegs.push([bxStart + bSt, W]);
    const names = ['star', 'heart', 'sweat', 'stress', 'wine', 'leaf'];
    cache.bubbles = {};
    bsegs.slice(0, 6).forEach(([x0, x1], idx) => {
      const bx0 = Math.max(0, x0 - 4), bx1 = Math.min(W, x1 + 4);
      const sw = bx1 - bx0;
      const bc = document.createElement('canvas');
      bc.width = sw; bc.height = bh;
      const bctx = bc.getContext('2d');
      bctx.drawImage(full, bx0, byTop, sw, bh, 0, 0, sw, bh);
      const id = bctx.getImageData(0, 0, sw, bh);
      floodClearBg(id, sw, bh, false);
      bctx.putImageData(id, 0, 0);
      cache.bubbles[names[idx]] = tightCropCanvas(bc).toDataURL('image/png');
    });
  }

  cache[gender] = urls;
  return urls;
}

export function getBubbleUrl(key) {
  return cache.bubbles ? cache.bubbles[key] : null;
}
