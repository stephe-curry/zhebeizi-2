// 运行时轻像素雪碧图加载器：
// 1) 男女主 7 阶段定妆图（全局唯一基准形象）+ 6 枚情绪气泡
// 2) 第 1 阶段（6-12岁日常装）广播体操 6 帧标准像素动作
// 3) 第 2 阶段（13-18岁蓝白运动校服）背面全动作库（跑步循环4帧/冲刺/耐力跑/跳远/背越式跳高/红绿对手4帧循环/举旗裁判）

const cache = {
  male: null,
  female: null,
  bubbles: null,
  gymMale: null,
  gymFemale: null,
  backMale: null,
  backFemale: null,
  referee: null
};

function isCreamBg(r, g, b) {
  return r > 205 && g > 193 && b > 165 && (r - b) >= 20 && (g - b) >= 13 && Math.abs(r - g) < 28 && (r - b) < 60;
}
function isFloorShadow(r, g, b) {
  return r > 158 && g > 144 && b > 116 && r < 224 && Math.abs(r - g) < 28 && (r - b) < 58;
}
function isSandPatch(r, g, b) {
  return r > 184 && g > 158 && b > 115 && (r - b) > 32 && g < 216;
}

function loadImg(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    if (/^https?:/i.test(src)) img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function floodClearBg(imgData, w, h, clearBottomShadow = true, opts = {}) {
  const d = imgData.data;
  const vis = new Uint8Array(w * h);
  const q = new Int32Array(w * h);
  let head = 0, tail = 0;

  const isBg = (r, g, b, y) => {
    if (opts.whiteBg) {
      return r > 228 && g > 228 && b > 228 && (Math.max(r, g, b) - Math.min(r, g, b) < 22);
    }
    return isCreamBg(r, g, b)
      || (clearBottomShadow && y > h * 0.78 && (isFloorShadow(r, g, b) || (opts.clearSand && isSandPatch(r, g, b))));
  };

  const tryPush = (x, y) => {
    const idx = y * w + x;
    if (vis[idx]) return;
    const i = idx * 4;
    if (isBg(d[i], d[i + 1], d[i + 2], y)) {
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
    d[idx * 4 + 3] = 0;
    if (cx > 0) tryPush(cx - 1, cy);
    if (cx + 1 < w) tryPush(cx + 1, cy);
    if (cy > 0) tryPush(cx, cy - 1);
    if (cy + 1 < h) tryPush(cx, cy + 1);
  }

  // 清理双腿间/手臂环抱内残留的封闭米白网格空洞（绝不误伤白色校服与裁判白旗内部）
  if (!opts.keepInnerWhite) {
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        if (d[i + 3] > 0 && isBg(d[i], d[i + 1], d[i + 2], y)) {
          if ((d[i] - d[i + 2]) >= 18 || (clearBottomShadow && y > h * 0.78 && isFloorShadow(d[i], d[i + 1], d[i + 2]))) {
            d[i + 3] = 0;
          }
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

function scaleCanvasPixelated(srcCanvas, scale) {
  if (Math.abs(scale - 1) < 0.01) return srcCanvas;
  const out = document.createElement('canvas');
  out.width = Math.max(1, Math.round(srcCanvas.width * scale));
  out.height = Math.max(1, Math.round(srcCanvas.height * scale));
  const ctx = out.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(srcCanvas, 0, 0, out.width, out.height);
  return out;
}

function cropBoxClean(img, x0, y0, x1, y1, opts = {}) {
  const sw = x1 - x0, sh = y1 - y0;
  const c = document.createElement('canvas');
  c.width = sw; c.height = sh;
  const ctx = c.getContext('2d');
  ctx.drawImage(img, x0, y0, sw, sh, 0, 0, sw, sh);
  const id = ctx.getImageData(0, 0, sw, sh);
  floodClearBg(id, sw, sh, !opts.keepShadow, opts);
  // 清除 JPEG 压缩在网格交点处偶发残留的孤立米色噪点（保护主体与球鞋）
  const d = id.data;
  for (let y = 1; y < sh - 1; y++) {
    for (let x = 1; x < sw - 1; x++) {
      const k = y * sw + x, i = k * 4;
      if (d[i + 3] === 0) continue;
      const nb = (d[((k - 1) * 4) + 3] > 0 ? 1 : 0)
        + (d[((k + 1) * 4) + 3] > 0 ? 1 : 0)
        + (d[((k - sw) * 4) + 3] > 0 ? 1 : 0)
        + (d[((k + sw) * 4) + 3] > 0 ? 1 : 0);
      if (nb <= 1 && d[i] > 185 && (d[i] - d[i + 2]) >= 16) {
        d[i + 3] = 0;
      }
    }
  }
  ctx.putImageData(id, 0, 0);
  return tightCropCanvas(c);
}

export async function loadCharacterSprites(gender) {
  const gKey = gender === 'female' ? 'female' : 'male';
  if (cache[gKey]) return cache[gKey];
  const src = gKey === 'female' ? './assets/sheets/female_sheet.jpg?v=s70' : './assets/sheets/male_sheet.jpg?v=s70';
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

  // 强制校准：66-80+ 岁（index 6）站立身高与 51-65 岁（index 5）完全持平
  const h5 = cropped[5].height;
  const c6 = cropped[6];
  if (c6.height < h5) {
    cropped[6] = scaleCanvasPixelated(c6, h5 / c6.height);
  }

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

  cache[gKey] = urls;
  return urls;
}

export function getBubbleUrl(key) {
  return cache.bubbles ? cache.bubbles[key] : null;
}

// 载入第 1 阶段（6-12岁日常装）广播体操 6 帧标准动作（连通域精准分离，避免伸展手臂矩形交叉）
// 返回数组：[0:待机, 1:伸展运动, 2:扩胸运动, 3:跳跃踢腿, 4:弓步平展, 5:同手同脚出糗]
export async function loadGymSprites(gender) {
  const key = gender === 'female' ? 'gymFemale' : 'gymMale';
  if (cache[key]) return cache[key];
  const src = gender === 'female' ? './assets/sheets/gym_female_sheet.jpg?v=s70' : './assets/sheets/gym_male_sheet.jpg?v=s70';
  const img = await loadImg(src);
  const W = img.width, y0 = 86, y1 = Math.min(img.height, 702), sh = y1 - y0;
  const c = document.createElement('canvas');
  c.width = W; c.height = sh;
  const ctx = c.getContext('2d');
  ctx.drawImage(img, 0, y0, W, sh, 0, 0, W, sh);
  const id = ctx.getImageData(0, 0, W, sh);
  floodClearBg(id, W, sh, true);
  const d = id.data;

  const compId = new Int32Array(W * sh).fill(-1);
  const q = new Int32Array(W * sh);
  const comps = [];
  for (let k = 0; k < W * sh; k++) {
    if (d[k * 4 + 3] < 25 || compId[k] !== -1) continue;
    const cid = comps.length;
    let minX = W, maxX = 0, minY = sh, maxY = 0, area = 0;
    let h2 = 0, t2 = 0;
    q[t2++] = k;
    compId[k] = cid;
    while (h2 < t2) {
      const cur = q[h2++], cx = cur % W, cy = (cur - cx) / W;
      area++;
      if (cx < minX) minX = cx; if (cx > maxX) maxX = cx;
      if (cy < minY) minY = cy; if (cy > maxY) maxY = cy;
      for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -2; dx <= 2; dx++) {
          const nx = cx + dx, ny = cy + dy;
          if (nx >= 0 && nx < W && ny >= 0 && ny < sh) {
            const nk = ny * W + nx;
            if (d[nk * 4 + 3] >= 25 && compId[nk] === -1) {
              compId[nk] = cid;
              q[t2++] = nk;
            }
          }
        }
      }
    }
    if (area > 35) comps.push({ cid, minX, maxX, minY, maxY, area, cx: (minX + maxX) / 2 });
  }

  comps.sort((a, b) => b.area - a.area);
  const mains = comps.slice(0, 6).sort((a, b) => a.cx - b.cx);
  const cidToMain = new Map();
  mains.forEach((m, idx) => cidToMain.set(m.cid, idx));
  comps.slice(6).forEach(sub => {
    let best = 0, bestDist = 1e9;
    mains.forEach((m, idx) => {
      const dist = Math.abs(sub.cx - m.cx);
      if (dist < bestDist) { bestDist = dist; best = idx; }
    });
    cidToMain.set(sub.cid, best);
    const m = mains[best];
    m.minX = Math.min(m.minX, sub.minX); m.maxX = Math.max(m.maxX, sub.maxX);
    m.minY = Math.min(m.minY, sub.minY); m.maxY = Math.max(m.maxY, sub.maxY);
  });

  const canvases = mains.map((m, idx) => {
    const cw = m.maxX - m.minX + 1, ch = m.maxY - m.minY + 1;
    const out = document.createElement('canvas');
    out.width = cw; out.height = ch;
    const octx = out.getContext('2d');
    const oid = octx.createImageData(cw, ch);
    const od = oid.data;
    for (let y = m.minY; y <= m.maxY; y++) {
      for (let x = m.minX; x <= m.maxX; x++) {
        const k = y * W + x;
        if (cidToMain.get(compId[k]) === idx) {
          const si = k * 4, di = ((y - m.minY) * cw + (x - m.minX)) * 4;
          od[di] = d[si]; od[di + 1] = d[si + 1]; od[di + 2] = d[si + 2]; od[di + 3] = d[si + 3];
        }
      }
    }
    octx.putImageData(oid, 0, 0);
    // 男版第 2 帧（index 1 伸展上举）原图比例略偏大，统一缩放到标准头身比例
    if (gender !== 'female' && idx === 1) {
      return scaleCanvasPixelated(tightCropCanvas(out), 0.85);
    }
    return tightCropCanvas(out);
  });

  const res = {
    canvases,
    urls: canvases.map(cv => cv.toDataURL('image/png')),
    baseHeight: canvases[0]?.height || 410
  };
  cache[key] = res;
  return res;
}

// 为红衣/绿衣对手生成与主角完全同步的 4 帧实时奔跑循环（头部取自各自对手，躯干四肢取自 4 帧跑动循环并精准换校服色！）
function buildRivalRunCycle(runFrames, rivalBase, targetHue) {
  // 提取对手头部区域（衣领白边以上）
  const rw = rivalBase.width, rh = rivalBase.height;
  const rData = rivalBase.getContext('2d').getImageData(0, 0, rw, rh).data;
  let collarY = Math.round(rh * 0.34);
  for (let y = Math.round(rh * 0.20); y < Math.round(rh * 0.45); y++) {
    let whiteCnt = 0;
    for (let x = 0; x < rw; x++) {
      const i = (y * rw + x) * 4;
      if (rData[i + 3] > 150 && rData[i] > 222 && rData[i + 1] > 222 && rData[i + 2] > 220) whiteCnt++;
    }
    if (whiteCnt > 8) { collarY = y; break; }
  }

  return runFrames.map((f, idx) => {
    if (idx === 2) return rivalBase; // 第3帧直接复用原生高精度对手帧
    const fw = f.width, fh = f.height;
    const out = document.createElement('canvas');
    out.width = Math.max(fw, rw + 8);
    out.height = fh;
    const ctx = out.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    const ox = Math.round((out.width - fw) / 2);
    ctx.drawImage(f, ox, 0);

    const id = ctx.getImageData(0, 0, out.width, out.height);
    const d = id.data;
    // 查找该帧白领高度并擦除主角原头部，换色下半身蓝校服 -> 红/绿校服
    let fCollarY = Math.round(fh * 0.33);
    for (let y = Math.round(fh * 0.18); y < Math.round(fh * 0.44); y++) {
      let wCnt = 0;
      for (let x = 0; x < out.width; x++) {
        const i = (y * out.width + x) * 4;
        if (d[i + 3] > 150 && d[i] > 222 && d[i + 1] > 222 && d[i + 2] > 220) wCnt++;
      }
      if (wCnt > 8) { fCollarY = y; break; }
    }

    for (let y = 0; y < out.height; y++) {
      for (let x = 0; x < out.width; x++) {
        const i = (y * out.width + x) * 4;
        if (d[i + 3] < 20) continue;
        if (y < fCollarY - 1) {
          d[i + 3] = 0; // 清除原主角头，稍后贴上对手头
          continue;
        }
        const r = d[i], g = d[i + 1], b = d[i + 2];
        // 识别蓝校服像素 (b 明显高于 r)
        if (b > r + 22 && b > 85) {
          const lum = (r * 0.25 + g * 0.38 + b * 0.37) / 145;
          if (targetHue === 'red') {
            d[i] = Math.min(242, Math.round(196 * lum + 18));
            d[i + 1] = Math.min(115, Math.round(54 * lum));
            d[i + 2] = Math.min(110, Math.round(50 * lum));
          } else {
            d[i] = Math.min(105, Math.round(44 * lum));
            d[i + 1] = Math.min(205, Math.round(146 * lum + 12));
            d[i + 2] = Math.min(145, Math.round(92 * lum + 8));
          }
        }
      }
    }
    ctx.putImageData(id, 0, 0);
    // 将对手头部对齐衣领中心贴合
    const headX = Math.round((out.width - rw) / 2);
    const headY = fCollarY - collarY;
    ctx.drawImage(rivalBase, 0, 0, rw, collarY + 2, headX, headY, rw, collarY + 2);
    return tightCropCanvas(out);
  });
}

// 载入第 2 阶段（13-18岁蓝白运动校服）全局统一背面动作帧 + 裁判
export async function loadBackSprites(gender) {
  const gKey = gender === 'female' ? 'backFemale' : 'backMale';
  if (cache[gKey]) return cache[gKey];

  const sheetSrc = gender === 'female'
    ? './assets/sheets/back_female_sheet.jpg?v=s70'
    : './assets/sheets/back_male_sheet.jpg?v=s70';

  const [img, sdImg] = await Promise.all([
    loadImg(sheetSrc),
    cache.referee ? Promise.resolve(null) : loadImg('./assets/sheets/sports_day_sheet.jpg?v=s70').catch(() => null)
  ]);

  if (!cache.referee && sdImg) {
    const refCv = cropBoxClean(sdImg, 615, 238, 769, 456, { whiteBg: true, keepInnerWhite: true });
    cache.referee = { canvas: refCv, url: refCv.toDataURL('image/png') };
  }

  const row1 = [
    [42, 36, 196, 352],
    [228, 36, 386, 352],
    [418, 36, 584, 352],
    [606, 36, 772, 354],
    [792, 42, 982, 356],
    [996, 38, 1152, 354],
    [1182, 40, 1352, 352]
  ];
  const row2 = [
    [16, 388, 214, 654],
    [212, 448, 408, 696],
    [414, 398, 588, 688],
    [604, 386, 772, 690],
    [766, 396, 994, 576],
    [766, 576, 1016, 692],
    [1018, 412, 1164, 686],
    [1182, 406, 1346, 696]
  ];

  const cvs = {
    run1: cropBoxClean(img, ...row1[0]),
    run2: cropBoxClean(img, ...row1[1]),
    run3: cropBoxClean(img, ...row1[2]),
    run4: cropBoxClean(img, ...row1[3]),
    sprint: cropBoxClean(img, ...row1[4]),
    tired: cropBoxClean(img, ...row1[5]),
    ljRunup: cropBoxClean(img, ...row1[6]),
    ljHang: cropBoxClean(img, ...row2[0]),
    ljLand: cropBoxClean(img, ...row2[1], { clearSand: true }),
    hjCurve: cropBoxClean(img, ...row2[2]),
    hjTakeoff: cropBoxClean(img, ...row2[3]),
    hjArch: cropBoxClean(img, ...row2[4]),
    hjBack: cropBoxClean(img, ...row2[5]),
    rivalRed: cropBoxClean(img, ...row2[6]),
    rivalGreen: cropBoxClean(img, ...row2[7]),
    referee: cache.referee?.canvas || null
  };

  const runCycle = [cvs.run1, cvs.run2, cvs.run3, cvs.run4];
  const redCycle = buildRivalRunCycle(runCycle, cvs.rivalRed, 'red');
  const greenCycle = buildRivalRunCycle(runCycle, cvs.rivalGreen, 'green');

  const urls = {};
  for (const [k, v] of Object.entries(cvs)) {
    urls[k] = v ? v.toDataURL('image/png') : '';
  }

  const res = {
    canvases: cvs,
    urls,
    runCycle,
    runUrls: runCycle.map(c => c.toDataURL('image/png')),
    redCycle,
    redUrls: redCycle.map(c => c.toDataURL('image/png')),
    greenCycle,
    greenUrls: greenCycle.map(c => c.toDataURL('image/png'))
  };
  cache[gKey] = res;
  return res;
}
