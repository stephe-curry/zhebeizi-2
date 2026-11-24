// 《这辈子 2.0》Sprint 2.5 视觉与交互演出模块：
// 1. 双卡蓄力物理碰撞合体 Combo 特效（首次完整碰撞 + 重复精简版 + 真机短震动 + 低端机自适应粒子）
// 2. 命运海克斯 V4 移动端大主卡扇形轮播选卡页（盖牌翻开 + 珍珠母贝棱彩 + 大白话卡面 + 长按详情举例 + 砸桌/羁绊横幅/彗星入槽）
// 3. 定稿版「家与账」分龄双态 UI（实景房间微缩横截面橱窗 + 铁皮小猪/绿皮存折收支天平 + 行情微折线锯齿票券 + 六格核桃木多宝格）
// 4. 「亲友梦」自然生长四阶追梦手账卡
// 严格遵循纯中文零表情符号规范。

import { CITIES } from './data.js?v=s25c';
import {
  HEX_NODES, HEX_NODE_META, HEX_BONDS, HEX_BOND_ORDER, HEX_CARD_MAP,
  hasHex, getHexInstance, getHexBondCounts, getBondTier,
  rollHextechOffer, pickSingleHextechCard, applyHextechPick
} from './hextech.js?v=s25c';
import { TUCK_CARDS_12 } from './lifeFeatures.js?v=s25c';
import { DREAM_CATALOG, DREAM_IDS, ensureDreamState } from './dreams.js?v=s25c';
import { estimateAnnualCashflow, getNetWorth, getCurrentEra } from './engine.js?v=s25c';
import { pxIcon } from './icons.js?v=s25c';

// 移动端触感短震动（兼容微信小程序 wx.vibrateShort 与移动端浏览器）
export function triggerHaptic(type = 'medium') {
  try {
    if (typeof globalThis.wx !== 'undefined' && typeof globalThis.wx.vibrateShort === 'function') {
      globalThis.wx.vibrateShort({ type });
    } else if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      navigator.vibrate(type === 'heavy' ? 28 : 14);
    }
  } catch (e) {}
}

function isLowEndDevice() {
  try {
    return typeof navigator !== 'undefined' && navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4;
  } catch (e) {
    return false;
  }
}

// ==================== 1. 双卡蓄力物理碰撞合体 Combo 演出 ====================
export function playComboCollisionVfx(combo, isFirstDiscovery, actions, getActionMeta, state) {
  const frame = document.querySelector('.phone-frame');
  if (!frame || !combo) return;

  document.querySelectorAll('.combo-collision-layer').forEach(el => el.remove());

  const pairIds = combo.pair || ['study_self', 'rest'];
  const actL = actions.find(a => a.id === pairIds[0]) || { id: pairIds[0], name: '行动一', cat: '1.成长与学习' };
  const actR = actions.find(a => a.id === pairIds[1]) || { id: pairIds[1], name: '行动二', cat: '6.身心与生活' };
  const metaL = getActionMeta(actL, state);
  const metaR = getActionMeta(actR, state);

  const layer = document.createElement('div');
  layer.className = 'combo-collision-layer';
  const pills = (combo.pills || []).slice(0, 2);

  if (!isFirstDiscovery) {
    // 重复触发：0.42s 轻快碰撞微章，不拖慢中后期节奏
    triggerHaptic('light');
    layer.innerHTML = `
      <div class="cc-fast-wrap">
        <div class="cc-crest fast">
          <div class="cc-crest-ico">${pxIcon(combo.crestIco || 'combo', 20)}</div>
          <div class="cc-crest-title">${combo.name}</div>
          <div class="cc-crest-pills">
            ${pills.map((p, i) => `<span class="cc-pill ${i === 0 ? 'warm' : 'green'}">${p}</span>`).join('')}
          </div>
        </div>
      </div>
    `;
    frame.appendChild(layer);
    setTimeout(() => layer.remove(), 620);
    return;
  }

  // 首次发现该 Combo：完整播「双卡升空后仰蓄力 -> 猛撞中心白光闪帧+火花冲击波 -> 迸发四字合体纹章+新发现印记」
  layer.innerHTML = `
    <canvas class="cc-canvas" width="390" height="320"></canvas>
    <div class="cc-stage">
      <div class="cc-token left">
        <div class="cc-tok-ico" style="background:${metaL.wellBg};">${pxIcon(metaL.ico, 24)}</div>
        <span>${metaL.short}</span>
      </div>
      <div class="cc-token right">
        <div class="cc-tok-ico" style="background:${metaR.wellBg};">${pxIcon(metaR.ico, 24)}</div>
        <span>${metaR.short}</span>
      </div>
      <div class="cc-result hidden">
        <div class="cc-flash"></div>
        <div class="cc-crest">
          <span class="cc-new-tag">新发现</span>
          <div class="cc-crest-ico">${pxIcon(combo.crestIco || 'combo', 24)}</div>
          <div class="cc-crest-title">${combo.name}</div>
          <div class="cc-crest-pills">
            ${pills.map((p, i) => `<span class="cc-pill ${i === 0 ? 'warm' : 'green'}">${p}</span>`).join('')}
          </div>
        </div>
      </div>
    </div>
  `;
  frame.appendChild(layer);

  setTimeout(() => {
    triggerHaptic('medium');
    frame.classList.remove('hx-shake');
    void frame.offsetWidth;
    frame.classList.add('hx-shake');

    const resBox = layer.querySelector('.cc-result');
    if (resBox) resBox.classList.remove('hidden');

    const cv = layer.querySelector('.cc-canvas');
    if (cv) runMiniParticleBurst(cv, 195, 160, ['#fbbf24', '#c9683a', '#fde68a', '#3b8760'], isLowEndDevice() ? 20 : 38);
  }, 330);

  setTimeout(() => {
    layer.style.opacity = '0';
    setTimeout(() => layer.remove(), 220);
  }, 1180);
}

function runMiniParticleBurst(cv, cx, cy, colors, count) {
  const ctx = cv.getContext('2d');
  const pts = [];
  for (let i = 0; i < count; i++) {
    const a = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.35;
    const sp = 2 + Math.random() * 6.5;
    pts.push({
      x: cx, y: cy,
      vx: Math.cos(a) * sp,
      vy: Math.sin(a) * sp - 1,
      sz: 2.5 + Math.random() * 3.5,
      c: colors[i % colors.length],
      l: 1
    });
  }
  let ringR = 8, ringA = 0.95;
  function step() {
    ctx.clearRect(0, 0, cv.width, cv.height);
    if (ringA > 0) {
      ringR += (115 - ringR) * 0.18;
      ringA -= 0.05;
      ctx.save();
      ctx.globalAlpha = Math.max(0, ringA);
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(cx, cy, ringR, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
    let alive = false;
    for (const p of pts) {
      if (p.l <= 0) continue;
      alive = true;
      p.x += p.vx; p.y += p.vy; p.vy += 0.15; p.l -= 0.032;
      ctx.save();
      ctx.globalAlpha = Math.max(0, p.l);
      ctx.fillStyle = p.c;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.l * 4);
      ctx.fillRect(-p.sz / 2, -p.sz / 2, p.sz, p.sz);
      ctx.restore();
    }
    if (alive || ringA > 0) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

// ==================== 2. 命运海克斯 V4 移动端扇形大卡选卡页 ====================
const BOND_SVG = {
  scholar: c => `<svg viewBox="0 0 16 16"><path d="M2 3h5a1 1 0 0 1 1 1v9a1 1 0 0 0-1-1H2zM14 3H9a1 1 0 0 0-1 1v9a1 1 0 0 1 1-1h5z" fill="${c}" stroke="#120a1c" stroke-width="1.1"/></svg>`,
  wealth:  c => `<svg viewBox="0 0 16 16"><circle cx="8" cy="8" r="6" fill="${c}" stroke="#120a1c" stroke-width="1.2"/><rect x="6.5" y="5" width="3" height="6" rx="1" fill="none" stroke="#120a1c" stroke-width="1.1"/></svg>`,
  warmth:  c => `<svg viewBox="0 0 16 16"><path d="M8 14S2 10 2 6a3 3 0 0 1 6-1 3 3 0 0 1 6 1c0 4-6 8-6 8z" fill="${c}" stroke="#120a1c" stroke-width="1.1"/></svg>`,
  zen:     c => `<svg viewBox="0 0 16 16"><path d="M3 13C3 6 8 3 14 3c0 6-3 11-10 11z" fill="${c}" stroke="#120a1c" stroke-width="1.1"/><path d="M4 12l6-6" stroke="#120a1c" stroke-width="1"/></svg>`,
  luck:    c => `<svg viewBox="0 0 16 16"><g fill="${c}" stroke="#120a1c" stroke-width="1"><circle cx="8" cy="4.5" r="3"/><circle cx="11.5" cy="8" r="3"/><circle cx="8" cy="11.5" r="3"/><circle cx="4.5" cy="8" r="3"/></g></svg>`,
  dream:   c => `<svg viewBox="0 0 16 16"><polygon points="8,1.5 9.9,5.8 14.5,6.2 11,9.2 12,13.8 8,11.4 4,13.8 5,9.2 1.5,6.2 6.1,5.8" fill="${c}" stroke="#120a1c" stroke-width="1.1" stroke-linejoin="round"/></svg>`
};

const TIER_UI = {
  silver: { nm: '白银', c: '#e2e8f0' },
  gold:   { nm: '黄金', c: '#fcd34d' },
  prism:  { nm: '棱彩', c: '#ede9fe' }
};

export function openHextechV4Modal({ state, nodeAge, mountOverlay, clearOverlay, saveAutoProgress, renderMain, showToast, onDone }) {
  const meta = HEX_NODE_META[nodeAge] || HEX_NODE_META[18];
  let offer = rollHextechOffer(state, nodeAge);
  let center = 1;
  let revealed = [false, false, false];
  let freeRerollUsed = [false, false, false];
  let locked = false;
  const showCoach = !state.hexGuideShown && state.hexCards.length === 0;

  const runeSvg = c => `<svg class="hx4-rune" viewBox="0 0 132 132" fill="none" stroke="${c}"><circle cx="66" cy="66" r="62" stroke-width="1.2" stroke-dasharray="3 6"/><circle cx="66" cy="66" r="50" stroke-width="1.6"/><polygon points="66,22 104,44 104,88 66,110 28,88 28,44" stroke-width="1.4"/><circle cx="66" cy="4" r="3" fill="${c}"/><circle cx="66" cy="128" r="3" fill="${c}"/><circle cx="4" cy="66" r="3" fill="${c}"/><circle cx="128" cy="66" r="3" fill="${c}"/></svg>`;
  const gemSvg = c => `<svg viewBox="0 0 12 14"><polygon points="6,0.8 11.2,3.8 11.2,10.2 6,13.2 0.8,10.2 0.8,3.8" fill="${c}" stroke="#fff" stroke-width="1"/></svg>`;
  const backEmblem = c => `<svg viewBox="0 0 104 104" fill="none"><polygon points="52,6 92,29 92,75 52,98 12,75 12,29" stroke="${c}" stroke-width="3" fill="rgba(0,0,0,.35)"/><polygon points="52,22 78,37 78,67 52,82 26,67 26,37" stroke="${c}" stroke-width="2" opacity=".7"/><circle cx="52" cy="52" r="10" fill="${c}"/></svg>`;

  function buildMechBar(card) {
    if (card.kind === 'scaling') {
      const max = Math.min(10, card.maxStacks || 5);
      const now = card.id === 'hx_singer_royalty' ? Math.min(10, state.dreams?.d_singer?.songsCount || 0) : 0;
      return `<span class="hx4-ml">进度</span><div class="hx4-pips">${Array.from({ length: max }, (_, k) => `<i class="${k < now ? 'on' : ''}"></i>`).join('')}</div><span class="hx4-mr">${now}/${card.maxStacks || max}</span>`;
    }
    if (card.kind === 'evo' && card.evoNames) {
      return `<div class="hx4-evo">${card.evoNames.map((n, k) => `${k ? `<i class="ln ${k < card.evoStage ? 'on' : ''}"></i>` : ''}<span class="nd ${k + 1 < card.evoStage ? 'done' : k + 1 === card.evoStage ? 'cur' : ''}">${n}</span>`).join('')}</div>`;
    }
    if (card.kind === 'delayed') {
      const n = card.delayYears || card.delayTurns || 3;
      const unit = card.delayYears ? '年' : '季';
      return `<span class="hx4-ml">进度</span><div class="hx4-pips">${Array.from({ length: Math.min(8, n) }, () => `<i></i>`).join('')}</div><span class="hx4-mr">0 / ${n}${unit}</span>`;
    }
    if (card.kind === 'curse') {
      return `<span class="hx4-ml" style="color:#fca5a5;">代价</span><span style="color:#fecaca;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${card.costText || '附带约束条件'}</span>`;
    }
    if (card.kind === 'duo' && card.reqBonds) {
      const A = HEX_BONDS[card.reqBonds[0]], B = HEX_BONDS[card.reqBonds[1]];
      return `<span class="hx4-ml">同时算作</span><span class="hx4-duo-pair"><i class="bi">${BOND_SVG[A.id](A.color)}</i>${A.short} + <i class="bi">${BOND_SVG[B.id](B.color)}</i>${B.short}</span><span class="hx4-mr">各 +1</span>`;
    }
    return `<span class="hx4-ml">特性</span><span style="opacity:.86;">选定后永久陪伴此生</span>`;
  }

  function buildBondChips(card, curBonds) {
    const base = { ...curBonds };
    if (card.reqEvo && hasHex(state, card.reqEvo)) {
      const prev = HEX_CARD_MAP[card.reqEvo];
      if (prev) for (const b of prev.bonds) base[b] = Math.max(0, base[b] - 1);
    }
    return card.bonds.map(b => {
      const B = HEX_BONDS[b];
      const nx = (base[b] || 0) + 1;
      const act = (base[b] < 2 && nx >= 2) || (base[b] < 4 && nx >= 4);
      return `<span class="hx4-bchip ${act ? 'will' : ''}" style="--c:${B.color}"><i class="bi">${BOND_SVG[b](B.color)}</i>${B.short} +1${act ? '<span class="act">生效</span>' : ''}</span>`;
    }).join('');
  }

  function buildCardFace(card, curBonds) {
    const T = TIER_UI[card.tier] || TIER_UI.silver;
    return `
      <div class="hx4-frame t-${card.tier}">
        <div class="hx4-body">
          ${card.tier === 'prism' ? '<div class="hx4-aurora"><i></i><i></i><i></i></div>' : ''}
          <div class="hx4-ribbon"><span class="gem">${gemSvg(T.c)}</span>${T.nm}<span class="gem">${gemSvg(T.c)}</span></div>
          <div class="hx4-art">
            ${runeSvg(T.c)}
            <div class="hx4-icon">${pxIcon(card.ico || 'hex', 48)}</div>
            <i class="spk" style="left:18%;top:22%"></i>
            <i class="spk" style="left:80%;top:30%;animation-delay:.6s"></i>
            <i class="spk" style="left:24%;top:72%;animation-delay:1.3s"></i>
            <span class="hx4-kind">${card.kindLabel || '长期受益'}</span>
          </div>
          <div class="hx4-name"><i></i><b>${card.name}</b><i></i></div>
          <div class="hx4-key"><span class="big">${card.big || card.name}</span>${card.unit ? `<span class="unit">${card.unit}</span>` : ''}</div>
          <div class="hx4-rule">${card.rule || card.desc}</div>
          <div class="hx4-mech">${buildMechBar(card)}</div>
          <div class="hx4-bonds">${buildBondChips(card, curBonds)}</div>
        </div>
        ${card.tier !== 'silver' ? `<div class="hx4-foil ${card.tier === 'prism' ? 'foil-p' : ''}"></div>` : ''}
        <div class="hx4-glare"></div>
        <div class="hx4-seal">已刻印</div>
      </div>
    `;
  }

  function buildBackFace(card) {
    const col = card.tier === 'prism' ? '#d8b4fe' : card.tier === 'gold' ? '#fbbf24' : '#cbd5e1';
    return `<div class="hx4-emblem">${backEmblem(col)}</div><div class="hx4-tap">点击翻开</div>`;
  }

  mountOverlay(`
    <div class="hx4-root" id="hx4-root">
      <canvas id="hx4-fx" class="hx4-fx"></canvas>
      <div class="hx4-top">
        <div class="hx4-cores-wrap">
          <div class="hx4-cores" id="hx4-cores"></div>
          <span class="hx4-core-txt">命运核心 <b id="hx4-core-num">${state.hexCards.length}</b>/7</span>
        </div>
        <div class="hx4-ticket-pill">${pxIcon('dice', 13)} <span>重随券 <b id="hx4-tkt">${state.hexRerollTickets}</b></span></div>
      </div>

      <div class="hx4-head">
        <div class="hx4-kicker">${meta.title}</div>
        <div class="hx4-title">${meta.sub}</div>
      </div>

      <div class="hx4-bond-hint">
        <span>羁绊</span>
        <span>同类标签凑齐 2 张，额外生效</span>
      </div>
      <div class="hx4-tracker" id="hx4-tracker"></div>

      <div class="hx4-stage" id="hx4-stage">
        <div class="hx4-godray" id="hx4-godray">
          <svg viewBox="0 0 200 200"><defs><radialGradient id="hx4rg" cx="50%" cy="50%" r="50%"><stop offset="0%" stop-color="#fff3c4" stop-opacity=".92"/><stop offset="60%" stop-color="#f59e0b" stop-opacity=".24"/><stop offset="100%" stop-color="#f59e0b" stop-opacity="0"/></radialGradient></defs>
          <g fill="url(#hx4rg)"><polygon points="100,100 90,0 110,0"/><polygon points="100,100 160,10 175,24"/><polygon points="100,100 200,90 200,110"/><polygon points="100,100 175,176 160,190"/><polygon points="100,100 110,200 90,200"/><polygon points="100,100 25,176 40,190"/><polygon points="100,100 0,110 0,90"/><polygon points="100,100 25,24 40,10"/></g></svg>
        </div>
      </div>

      <div class="hx4-midbar">
        <div class="hx4-dots" id="hx4-dots"></div>
        <div class="hx4-midbtns">
          <button class="hx4-sbtn" id="hx4-detail">看详情</button>
          <button class="hx4-sbtn" id="hx4-revall">全部翻开</button>
          <button class="hx4-sbtn gold" id="hx4-reroll">换这张</button>
        </div>
      </div>

      <div class="hx4-foot">
        <button class="hx4-cta dim" id="hx4-cta">先翻开这张命运卡</button>
        <div class="hx4-subhint">点牌翻开 · 左右滑动切换 · 长按卡面看例子</div>
      </div>

      <div class="hx4-mask" id="hx4-mask"></div>
      <div class="hx4-sheet" id="hx4-sheet"></div>

      ${showCoach ? `
        <div class="hx4-coach" id="hx4-coach">
          <div class="hx4-coach-card">
            <div class="hx4-kicker">第一次命运觉醒</div>
            <div style="font-size:17px;font-weight:900;margin:4px 0 8px;">30 秒看懂命运卡</div>
            <div class="hx4-crow"><span class="n">1</span><div><b>三选一</b>，选中的卡这辈子一直有效</div></div>
            <div class="hx4-crow"><span class="n">2</span><div>边框颜色代表稀有度：<span style="color:#cbd5e1;font-weight:800;">白银</span> &lt; <span style="color:#fbbf24;font-weight:800;">黄金</span> &lt; <span style="color:#d8b4fe;font-weight:800;">棱彩</span></div></div>
            <div class="hx4-crow"><span class="n">3</span><div>卡底的小标签叫<b>羁绊</b>，同类凑齐 2 张会多送一个效果</div></div>
            <div class="hx4-crow" style="border:none;"><span class="n">4</span><div>拿不准时<b>长按卡面</b>或点「看详情」，里面有白话例子</div></div>
            <button class="hx4-cta gold" id="hx4-coach-ok" style="margin-top:10px;">知道了，开始翻牌</button>
          </div>
        </div>
      ` : ''}
    </div>
  `, host => {
    const root = host.querySelector('#hx4-root');
    const stage = host.querySelector('#hx4-stage');
    const cv = host.querySelector('#hx4-fx');
    cv.width = root.clientWidth || 390;
    cv.height = root.clientHeight || 800;
    const ctx = cv.getContext('2d');
    let P = [], R = [], C = null, aliveFx = true;
    const lowEnd = isLowEndDevice();

    function burst(x, y, cols, n, sp) {
      const cnt = lowEnd ? Math.max(8, Math.round(n * 0.45)) : n;
      for (let k = 0; k < cnt; k++) {
        const a = (Math.PI * 2 * k) / cnt + Math.random() * 0.4, s = 1.5 + Math.random() * sp;
        P.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 1, sz: 2 + Math.random() * 3.8, c: cols[k % cols.length], l: 1, d: 0.02 + Math.random() * 0.02, g: 0.13 });
      }
    }
    function ring(x, y, c, m) { R.push({ x, y, r: 6, m, c, a: 1 }); }
    function comet(sx, sy, tx, ty, c, cb) { C = { sx, sy, tx, ty, t: 0, c, cb }; }
    function shake() { root.classList.remove('hx-shake'); void root.offsetWidth; root.classList.add('hx-shake'); }

    (function tick() {
      if (!aliveFx) return;
      ctx.clearRect(0, 0, cv.width, cv.height);
      for (let k = R.length - 1; k >= 0; k--) {
        const w = R[k]; w.r += (w.m - w.r) * 0.15; w.a -= 0.036;
        if (w.a <= 0) { R.splice(k, 1); continue; }
        ctx.save(); ctx.globalAlpha = w.a; ctx.strokeStyle = w.c; ctx.lineWidth = 3.2; ctx.beginPath(); ctx.arc(w.x, w.y, w.r, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
      }
      if (C) {
        C.t += 0.048; const t = Math.min(1, C.t), mx = (C.sx + C.tx) / 2 + 64, my = (C.sy + C.ty) / 2 + 10;
        const x = (1 - t) * (1 - t) * C.sx + 2 * (1 - t) * t * mx + t * t * C.tx;
        const y = (1 - t) * (1 - t) * C.sy + 2 * (1 - t) * t * my + t * t * C.ty;
        for (let k = 0; k < (lowEnd ? 2 : 4); k++) P.push({ x: x + (Math.random() - 0.5) * 6, y: y + (Math.random() - 0.5) * 6, vx: (Math.random() - 0.5), vy: (Math.random() - 0.5), sz: 3 + Math.random() * 3, c: C.c, l: 0.9, d: 0.06, g: 0 });
        ctx.save(); ctx.fillStyle = '#fff'; ctx.shadowColor = C.c; ctx.shadowBlur = 18; ctx.beginPath(); ctx.arc(x, y, 7.5, 0, Math.PI * 2); ctx.fill(); ctx.restore();
        if (t >= 1) { const cb = C.cb; C = null; if (cb) cb(); }
      }
      for (let k = P.length - 1; k >= 0; k--) {
        const p = P[k]; p.x += p.vx; p.y += p.vy; p.vy += p.g; p.l -= p.d;
        if (p.l <= 0) { P.splice(k, 1); continue; }
        ctx.save(); ctx.globalAlpha = p.l; ctx.fillStyle = p.c; ctx.translate(p.x, p.y); ctx.rotate(p.l * 4); ctx.fillRect(-p.sz / 2, -p.sz / 2, p.sz, p.sz); ctx.restore();
      }
      requestAnimationFrame(tick);
    })();

    const slotOf = i => { const d = ((i - center) % 3 + 3) % 3; return d === 0 ? 'c' : d === 1 ? 'r' : 'l'; };
    const cardEl = i => stage.querySelector(`.hx4-card[data-i="${i}"]`);
    const cardCenter = i => {
      const el = cardEl(i);
      if (!el) return { x: 195, y: 360 };
      const r = el.getBoundingClientRect(), pr = root.getBoundingClientRect();
      return { x: r.left + r.width / 2 - pr.left, y: r.top + r.height / 2 - pr.top };
    };

    function renderCores(count) {
      host.querySelector('#hx4-cores').innerHTML = Array.from({ length: 7 }, (_, k) =>
        `<svg class="hx4-cgem ${k < count ? 'filled' : ''}" id="hx4-core-${k}" viewBox="0 0 15 17"><polygon points="7.5,1 14,4.8 14,12.2 7.5,16 1,12.2 1,4.8"/></svg>`
      ).join('');
      host.querySelector('#hx4-core-num').textContent = count;
    }

    function buildCardNode(i, dealAnim) {
      const c = offer[i];
      const curBonds = getHexBondCounts(state);
      const el = document.createElement('div');
      el.className = 'hx4-card';
      el.dataset.i = i;
      el.innerHTML = `
        <div class="hx4-tilt ${dealAnim ? 'deal' : ''}" style="animation-delay:${dealAnim ? (i === center ? 0.18 : i * 0.09) : 0}s">
          <div class="hx4-flipper">
            <div class="hx4-face hx4-back t-${c.tier}">${buildBackFace(c)}</div>
            <div class="hx4-face hx4-front">${buildCardFace(c, curBonds)}</div>
          </div>
        </div>
      `;
      bindCardInteractions(el);
      return el;
    }

    function layoutCards() {
      for (let i = 0; i < offer.length; i++) {
        const el = cardEl(i); if (!el) continue;
        el.classList.remove('pos-c', 'pos-l', 'pos-r');
        el.classList.add('pos-' + slotOf(i));
        el.classList.toggle('revealed', revealed[i]);
      }
      host.querySelector('#hx4-dots').innerHTML = offer.map((_, i) => `<span class="hx4-dot ${i === center ? 'on' : ''}"></span>`).join('');
    }

    function renderTopAndButtons() {
      const curBonds = getHexBondCounts(state);
      const c = offer[center];
      const rev = revealed[center];

      host.querySelector('#hx4-tracker').innerHTML = HEX_BOND_ORDER.map(b => {
        const B = HEX_BONDS[b], cur = curBonds[b] || 0;
        const pv = rev && !locked && c.bonds.includes(b);
        const will = pv && ((cur < 2 && cur + 1 >= 2) || (cur < 4 && cur + 1 >= 4));
        const goal = cur >= 2 ? 4 : 2;
        return `
          <div class="hx4-bt ${cur >= 2 ? 'on' : ''} ${pv ? 'preview' : ''} ${will ? 'will' : ''}" id="hx4-bt-${b}" style="--c:${B.color}">
            <span class="plus">${will ? '生效' : '+1'}</span>
            <div class="ic">${BOND_SVG[b](B.color)}</div>
            <div class="nm">${B.short}</div>
            <div class="ct">${cur}/${goal}</div>
          </div>
        `;
      }).join('');

      host.querySelector('#hx4-tkt').textContent = state.hexRerollTickets;
      const allRev = revealed.every(Boolean);
      host.querySelector('#hx4-revall').style.display = (allRev || locked) ? 'none' : '';
      host.querySelector('#hx4-detail').style.opacity = (rev && !locked) ? '1' : '0.35';

      const rrBtn = host.querySelector('#hx4-reroll');
      const canFree = !freeRerollUsed[center];
      const canTkt = freeRerollUsed[center] && state.hexRerollTickets > 0;
      rrBtn.textContent = canFree ? '免费换这张' : (canTkt ? '用券换这张' : '已换过');
      rrBtn.style.opacity = (rev && (canFree || canTkt) && !locked) ? '1' : '0.35';

      if (!locked) {
        const cta = host.querySelector('#hx4-cta');
        if (rev) {
          cta.className = 'hx4-cta gold';
          cta.textContent = `选择【${c.name}】`;
        } else {
          cta.className = 'hx4-cta dim';
          cta.textContent = '先翻开这张命运卡';
        }
      }
    }

    function revealCard(i) {
      if (revealed[i]) return;
      revealed[i] = true;
      triggerHaptic(offer[i].tier === 'prism' ? 'heavy' : 'light');
      layoutCards();
      renderTopAndButtons();
      const c = offer[i];
      setTimeout(() => {
        const p = cardCenter(i);
        const cols = c.tier === 'prism' ? ['#d8b4fe', '#bae6fd', '#fde68a', '#fff'] : c.tier === 'gold' ? ['#fbbf24', '#fde68a', '#fff'] : ['#e2e8f0', '#94a3b8', '#fff'];
        burst(p.x, p.y, cols, c.tier === 'silver' ? 14 : c.tier === 'gold' ? 26 : 42, c.tier === 'prism' ? 7.5 : 5);
        if (c.tier === 'prism') { ring(p.x, p.y, '#d8b4fe', 145); shake(); }
        else if (c.tier === 'gold') ring(p.x, p.y, '#fbbf24', 108);
      }, 260);
    }

    function openDetailSheet() {
      if (!revealed[center] || locked) return;
      const c = offer[center];
      const T = TIER_UI[c.tier] || TIER_UI.silver;
      const tc = c.tier === 'prism' ? '#7c3aed' : c.tier === 'gold' ? '#b45309' : '#475569';
      const curBonds = getHexBondCounts(state);
      const sheet = host.querySelector('#hx4-sheet');
      sheet.innerHTML = `
        <div style="width:38px;height:4px;border-radius:99px;background:rgba(0,0,0,.15);margin:0 auto 10px;"></div>
        <div style="display:flex;align-items:center;gap:8px;">
          <span style="font-size:11px;font-weight:900;padding:2px 8px;border-radius:6px;color:#fff;background:${tc};">${T.nm}</span>
          <span style="font-size:11.5px;font-weight:700;color:#7c7166;">${c.kindLabel || '长期受益'}</span>
        </div>
        <div style="font-size:18px;font-weight:900;margin-top:6px;">${c.name}</div>
        <div style="font-size:12.5px;line-height:1.55;margin-top:6px;"><b>完整效果：</b>${c.detail || c.desc}</div>
        ${c.example ? `<div style="margin-top:8px;border-radius:11px;padding:8px 11px;font-size:12px;font-weight:800;background:#f3ead8;border:1px solid #e3d5bb;">举个例子：${c.example}</div>` : ''}
        ${c.fit ? `<div style="font-size:11.5px;color:#7c7166;margin-top:6px;">适合：${c.fit}</div>` : ''}
        <div style="margin-top:10px;padding-top:8px;border-top:1px dashed #d8cbb5;display:flex;flex-direction:column;gap:5px;">
          ${c.bonds.map(b => {
            const B = HEX_BONDS[b];
            return `<div style="display:flex;align-items:flex-start;gap:6px;font-size:11.5px;"><span style="width:15px;height:15px;flex-shrink:0;display:inline-block;">${BOND_SVG[b](B.color)}</span><b style="white-space:nowrap;">${B.short}</b><span style="color:#7c7166;">已有 ${curBonds[b] || 0} 张，凑齐 2 张：${B.t2}</span></div>`;
          }).join('')}
        </div>
        <button class="hx4-cta gold" id="hx4-sheet-ok" style="margin-top:12px;">知道了</button>
      `;
      sheet.classList.add('open');
      host.querySelector('#hx4-mask').classList.add('open');
      sheet.querySelector('#hx4-sheet-ok').onclick = closeDetailSheet;
    }

    function closeDetailSheet() {
      host.querySelector('#hx4-sheet').classList.remove('open');
      host.querySelector('#hx4-mask').classList.remove('open');
    }

    function bindCardInteractions(el) {
      let sx = null, sy = null, moved = 0, dragging = false;
      el.addEventListener('pointerdown', e => {
        if (locked) return;
        sx = e.clientX; sy = e.clientY; moved = 0;
        const i = Number(el.dataset.i);
        if (slotOf(i) === 'c' && revealed[i]) {
          dragging = true;
          el.classList.add('dragging');
          try { el.setPointerCapture(e.pointerId); } catch (_) {}
          clearTimeout(el._lp);
          el._lp = setTimeout(() => {
            if (moved < 10 && dragging) {
              dragging = false; el.classList.remove('dragging');
              el.querySelector('.hx4-tilt').style.transform = '';
              sx = null;
              openDetailSheet();
            }
          }, 480);
        }
      });
      el.addEventListener('pointermove', e => {
        if (sx === null) return;
        moved = Math.max(moved, Math.hypot(e.clientX - sx, e.clientY - sy));
        if (!dragging) return;
        const r = el.getBoundingClientRect();
        const x = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
        const y = Math.min(1, Math.max(0, (e.clientY - r.top) / r.height));
        el.querySelector('.hx4-tilt').style.transform = `rotateX(${(0.5 - y) * 18}deg) rotateY(${(x - 0.5) * 20}deg)`;
        const g = el.querySelector('.hx4-glare');
        if (g) { g.style.setProperty('--gx', (100 - x * 100) + '%'); g.style.setProperty('--gy', (y * 100) + '%'); }
      });
      const finishPtr = e => {
        clearTimeout(el._lp);
        if (sx === null) return;
        const i = Number(el.dataset.i), dx = e.clientX - sx;
        if (dragging) {
          dragging = false; el.classList.remove('dragging');
          el.querySelector('.hx4-tilt').style.transform = '';
          if (Math.abs(dx) > 44) {
            center = ((center + (dx < 0 ? 1 : -1)) % offer.length + offer.length) % offer.length;
            layoutCards(); renderTopAndButtons();
          }
        } else if (Math.abs(dx) > 36) {
          center = ((center + (dx < 0 ? 1 : -1)) % offer.length + offer.length) % offer.length;
          layoutCards(); renderTopAndButtons();
        } else if (moved < 9) {
          if (slotOf(i) !== 'c') {
            center = i; layoutCards(); renderTopAndButtons();
            if (!revealed[i]) setTimeout(() => revealCard(i), 220);
          } else if (!revealed[i]) {
            revealCard(i);
          }
        }
        sx = null;
      };
      el.addEventListener('pointerup', finishPtr);
      el.addEventListener('pointercancel', () => { clearTimeout(el._lp); sx = null; dragging = false; el.classList.remove('dragging'); el.querySelector('.hx4-tilt').style.transform = ''; });
    }

    function showBondBanner(bId, count, offsetIdx) {
      const B = HEX_BONDS[bId];
      const n = document.createElement('div');
      n.className = 'hx4-banner';
      n.style.setProperty('--c', B.color);
      n.style.top = (146 + offsetIdx * 60) + 'px';
      n.innerHTML = `
        <div style="width:28px;height:28px;flex-shrink:0;">${BOND_SVG[bId](B.color)}</div>
        <div style="min-width:0;">
          <div style="font-size:10px;font-weight:900;letter-spacing:2px;opacity:.85;">羁绊生效</div>
          <div style="font-size:14px;font-weight:900;">${B.name} · ${count} 张</div>
          <div style="font-size:11px;font-weight:700;opacity:.92;">${count >= 4 ? B.t4 : B.t2}</div>
        </div>
      `;
      root.appendChild(n);
      setTimeout(() => { n.classList.add('out'); setTimeout(() => n.remove(), 280); }, 1150);
    }

    function confirmAwaken() {
      locked = true;
      const i = center, el = cardEl(i), tilt = el.querySelector('.hx4-tilt'), c = offer[i];
      const beforeBonds = getHexBondCounts(state);
      const res = applyHextechPick(state, c.id, nodeAge);
      const afterBonds = getHexBondCounts(state);
      saveAutoProgress();

      const cta = host.querySelector('#hx4-cta');
      cta.className = 'hx4-cta dim'; cta.textContent = '刻印中…';
      renderTopAndButtons();

      for (let k = 0; k < offer.length; k++) {
        if (k !== i) cardEl(k)?.classList.add(slotOf(k) === 'l' ? 'away-l' : 'away-r');
      }
      host.querySelector('#hx4-godray').classList.add('on');
      tilt.style.transform = ''; tilt.classList.remove('deal'); tilt.classList.add('ascend');

      // 砸桌 + 盖章
      setTimeout(() => {
        tilt.classList.remove('ascend'); tilt.classList.add('slam');
        setTimeout(() => {
          triggerHaptic('heavy');
          shake();
          const p = cardCenter(i);
          const cols = c.tier === 'prism' ? ['#d8b4fe', '#bae6fd', '#fde68a', '#fff'] : c.tier === 'gold' ? ['#fbbf24', '#f59e0b', '#fde68a', '#fff'] : ['#e2e8f0', '#94a3b8', '#fff'];
          ring(p.x, p.y, cols[0], 180);
          setTimeout(() => ring(p.x, p.y, '#ffffff', 130), 75);
          burst(p.x, p.y, cols, 54, 8.5);
          el.querySelector('.hx4-seal')?.classList.add('show');
        }, 140);
      }, 390);

      // 羁绊生效横幅庆祝
      const newlyLit = [];
      for (const b of c.bonds) {
        if ((beforeBonds[b] < 2 && afterBonds[b] >= 2) || (beforeBonds[b] < 4 && afterBonds[b] >= 4)) {
          newlyLit.push({ b, count: afterBonds[b] >= 4 ? 4 : 2 });
        }
      }
      setTimeout(() => {
        renderTopAndButtons();
        newlyLit.forEach((item, idx) => setTimeout(() => showBondBanner(item.b, item.count, idx), idx * 220));
      }, 920);

      const waitMs = newlyLit.length ? 2150 : 1480;
      setTimeout(() => {
        host.querySelector('#hx4-godray').classList.remove('on');
        const p = cardCenter(i);
        tilt.classList.remove('slam'); tilt.classList.add('absorb');
        const coreIdx = Math.max(0, state.hexCards.length - 1);
        const tgt = host.querySelector(`#hx4-core-${coreIdx}`) || host.querySelector('#hx4-cores');
        const pr = root.getBoundingClientRect(), tr = tgt.getBoundingClientRect();
        const tx = tr.left + tr.width / 2 - pr.left, ty = tr.top + tr.height / 2 - pr.top;
        const cometCol = c.tier === 'prism' ? '#d8b4fe' : c.tier === 'gold' ? '#fbbf24' : '#e2e8f0';

        comet(p.x, p.y, tx, ty, cometCol, () => {
          triggerHaptic('light');
          renderCores(state.hexCards.length);
          burst(tx, ty, ['#fbbf24', '#fff', '#d8b4fe'], 22, 4.2);
          ring(tx, ty, '#fbbf24', 46);
          setTimeout(() => {
            aliveFx = false;
            clearOverlay();
            renderMain();
            if (onDone) onDone(res);
            else if (res) {
              const extra = res.notes.length ? `（${res.notes.join('，')}）` : '';
              showToast(`已刻印【${res.def.name}】${extra}`);
            }
          }, 320);
        });
      }, waitMs);
    }

    // 绑定控制按钮
    const coachEl = host.querySelector('#hx4-coach');
    if (coachEl) {
      host.querySelector('#hx4-coach-ok').onclick = () => {
        state.hexGuideShown = true;
        saveAutoProgress();
        coachEl.remove();
      };
    }
    host.querySelector('#hx4-mask').onclick = closeDetailSheet;
    host.querySelector('#hx4-detail').onclick = openDetailSheet;
    host.querySelector('#hx4-revall').onclick = () => {
      offer.forEach((_, idx) => setTimeout(() => revealCard(idx), idx * 160));
    };
    host.querySelector('#hx4-reroll').onclick = () => {
      if (locked || !revealed[center]) return;
      if (!freeRerollUsed[center]) {
        freeRerollUsed[center] = true;
      } else if (state.hexRerollTickets > 0) {
        state.hexRerollTickets--;
      } else {
        return;
      }
      const i = center;
      revealed[i] = false;
      layoutCards();
      const p = cardCenter(i);
      burst(p.x, p.y, ['#fde68a', '#fff'], 14, 4);
      setTimeout(() => {
        const nextCard = pickSingleHextechCard(state, nodeAge, offer.map(x => x.id));
        if (nextCard) offer[i] = nextCard;
        const old = cardEl(i), fresh = buildCardNode(i, false);
        stage.replaceChild(fresh, old);
        layoutCards();
        setTimeout(() => revealCard(i), 60);
      }, 380);
      renderTopAndButtons();
    };
    host.querySelector('#hx4-cta').onclick = () => {
      if (locked) return;
      if (!revealed[center]) { revealCard(center); return; }
      confirmAwaken();
    };

    // 初始化插入 3 张盖牌
    for (let i = 0; i < offer.length; i++) stage.appendChild(buildCardNode(i, true));
    renderCores(state.hexCards.length);
    layoutCards();
    renderTopAndButtons();
  });
}

// ==================== 3. 定稿版「家与账」双态微缩橱窗界面 ====================
function buildSparklineSvg(arr, strokeColor, fillId, fillColor) {
  const pts = (arr && arr.length >= 2) ? arr : [100, 102, 101, 105];
  const min = Math.min(...pts) * 0.97;
  const max = Math.max(...pts) * 1.03 || 1;
  const w = 112, h = 28;
  const coords = pts.map((v, idx) => {
    const x = Math.round((idx / (pts.length - 1)) * (w - 6) + 3);
    const y = Math.round(h - 4 - ((v - min) / (max - min || 1)) * (h - 9));
    return `${x},${y}`;
  });
  const area = `3,${h - 2} ${coords.join(' ')} ${w - 3},${h - 2}`;
  return `
    <svg width="100%" height="${h}" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">
      <defs>
        <linearGradient id="${fillId}" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="${fillColor}" stop-opacity="0.28"/>
          <stop offset="100%" stop-color="${fillColor}" stop-opacity="0.0"/>
        </linearGradient>
      </defs>
      <polygon points="${area}" fill="url(#${fillId})"/>
      <polyline points="${coords.join(' ')}" fill="none" stroke="${strokeColor}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  `;
}

function buildDioramaSvg(state) {
  const isChild = state.age <= 18;
  const hasAward = state.experiences.includes('exp_award_7');
  const hasToy = state.items.some(x => /悠悠球|芭比/.test(x));
  const toyIco = state.gender === 'female' ? 'doll' : 'yoyo';
  const hasMusic = (state.dreams?.d_singer?.stage || 0) >= 2;
  const hasTrophy = state.dreamCompleted || (state.dreams?.d_esport?.stage || 0) >= 3 || (state.dreams?.d_hurdle?.stage || 0) >= 3;
  const pet = (state.pet && state.pet.alive) ? state.pet : null;

  if (isChild) {
    return `
      <div class="dio-frame child">
        <div class="dio-wall">
          <!-- 左侧绿罩台灯与书桌 -->
          <svg class="dio-svg" viewBox="0 0 320 108" preserveAspectRatio="xMidYMid slice">
            <!-- 墙壁与木地板 -->
            <rect x="0" y="0" width="320" height="78" fill="#efe4ce"/>
            <rect x="0" y="78" width="320" height="30" fill="#b88454"/>
            <line x1="0" y1="78" x2="320" y2="78" stroke="#4a3728" stroke-width="2"/>
            <!-- 阳光木窗与绿树 -->
            <rect x="176" y="12" width="108" height="50" fill="#cfefff" stroke="#5c4028" stroke-width="3"/>
            <circle cx="258" cy="44" r="18" fill="#7fc28b"/>
            <circle cx="274" cy="34" r="15" fill="#5ca870"/>
            <line x1="230" y1="12" x2="230" y2="62" stroke="#5c4028" stroke-width="3"/>
            <rect x="171" y="60" width="118" height="5" fill="#8b623f" stroke="#4a3728" stroke-width="1.5"/>
            <!-- 墙面荣誉奖状 -->
            <g opacity="${hasAward ? '1' : '0.45'}">
              <rect x="98" y="14" width="54" height="34" rx="2" fill="#fff6dc" stroke="#9e3b24" stroke-width="2.5"/>
              <line x1="110" y1="24" x2="140" y2="24" stroke="#c9683a" stroke-width="2"/>
              <line x1="108" y1="32" x2="142" y2="32" stroke="#8a7968" stroke-width="1.4"/>
              <circle cx="125" cy="40" r="3" fill="#d6453d"/>
            </g>
            <!-- 书桌与绿罩台灯 -->
            <rect x="38" y="66" width="166" height="28" fill="#a67244" stroke="#4a3728" stroke-width="2"/>
            <rect x="94" y="60" width="50" height="34" fill="#8a5a32" stroke="#4a3728" stroke-width="2"/>
            <!-- 台灯 -->
            <rect x="52" y="62" width="18" height="4" rx="1" fill="#467a5c" stroke="#4a3728" stroke-width="1.5"/>
            <line x1="60" y1="62" x2="54" y2="42" stroke="#4a3728" stroke-width="2.4"/>
            <polygon points="48,42 66,34 72,46 52,50" fill="#5aa074" stroke="#4a3728" stroke-width="1.8"/>
          </svg>
          <!-- 桌上可点按的铁皮小猪存钱罐视觉联动 -->
          <div class="dio-prop" style="left:50%;bottom:24px;">${pxIcon('piggy', 26)}</div>
          ${pet ? `<div class="dio-prop" style="right:14%;bottom:8px;">${pxIcon(pet.ico, 26)}</div>` : ''}
        </div>
      </div>
    `;
  }

  // 成年态：未买房为紧凑合租单间，买房后进化为阳光两居 / 滨江大平层
  const grid = state.house?.grid || 0;
  const isLux = grid >= 8;
  const isMid = grid >= 6;
  const skyFill = !state.house ? '#dde7f0' : isLux ? '#bae6fd' : '#fff3d6';
  const floorFill = !state.house ? '#c8bca9' : '#c58f5b';

  return `
    <div class="dio-frame adult">
      <div class="dio-wall">
        <svg class="dio-svg" viewBox="0 0 320 112" preserveAspectRatio="xMidYMid slice">
          <rect x="0" y="0" width="320" height="78" fill="#f2eadc"/>
          <rect x="0" y="78" width="320" height="34" fill="${floorFill}"/>
          <line x1="0" y1="78" x2="320" y2="78" stroke="#4a3728" stroke-width="2"/>
          <!-- 窗户（租房小窗 vs 买房宽景大落地窗） -->
          ${!state.house ? `
            <rect x="132" y="16" width="66" height="42" fill="${skyFill}" stroke="#5c4028" stroke-width="2.5"/>
            <line x1="165" y1="16" x2="165" y2="58" stroke="#5c4028" stroke-width="2"/>
            <!-- 租房折叠桌与行李箱 -->
            <rect x="36" y="58" width="44" height="28" rx="3" fill="#7c6f64" stroke="#4a3728" stroke-width="2"/>
            <rect x="228" y="64" width="56" height="22" fill="#b08256" stroke="#4a3728" stroke-width="2"/>
          ` : `
            <rect x="${isLux ? 86 : 102}" y="10" width="${isLux ? 156 : 124}" height="58" fill="${skyFill}" stroke="#5c4028" stroke-width="2.5"/>
            <!-- 远景城市天际线 -->
            <rect x="116" y="42" width="16" height="26" fill="#e6cfa8" opacity=".65"/>
            <rect x="138" y="32" width="20" height="36" fill="#dec092" opacity=".65"/>
            <rect x="182" y="38" width="18" height="30" fill="#e6cfa8" opacity=".65"/>
            <line x1="164" y1="10" x2="164" y2="68" stroke="#5c4028" stroke-width="2"/>
            <!-- 窗帘 -->
            <rect x="${isLux ? 80 : 96}" y="10" width="12" height="60" fill="#e5dccb" stroke="#8a7968" stroke-width="1"/>
            <rect x="${isLux ? 236 : 220}" y="10" width="12" height="60" fill="#e5dccb" stroke="#8a7968" stroke-width="1"/>
            <!-- 温暖地毯 -->
            <polygon points="126,84 228,84 240,104 114,104" fill="#fbf5ea" stroke="#bda98e" stroke-width="1.5"/>
          `}
        </svg>

        <!-- 8岁旧物相框上墙 -->
        ${state.house && hasToy ? `
          <div class="dio-wall-frame">
            <div class="dio-frame-box">${pxIcon(toyIco, 18)}</div>
            <span class="dio-buff-tag">${state.house.buffActive ? '旧物上墙 Buff' : '待拼图点亮'}</span>
          </div>
        ` : ''}

        <!-- 地毯上打盹的宠物 -->
        ${pet ? `<div class="dio-prop" style="left:53%;bottom:10px;">${pxIcon(pet.ico, 28)}</div>` : ''}

        <!-- 角落里的吉他与奖杯 -->
        ${hasMusic ? `<div class="dio-prop" style="right:13%;bottom:18px;">${pxIcon('guitar', 26)}</div>` : ''}
        ${hasTrophy ? `<div class="dio-prop" style="right:5%;bottom:14px;">${pxIcon('trophy', 20)}</div>` : ''}
      </div>
    </div>
  `;
}

export function renderNewAssetsTab(state, fmtMoney) {
  ensureDreamState(state);
  const isChild = state.age <= 18;
  const nw = getNetWorth(state);
  const era = getCurrentEra(state);
  const cf = estimateAnnualCashflow(state);

  // 组装六格核桃木多宝格藏品（含童年旧物、小卖部藏品、追梦信物、宠物铃铛、房产证、车钥匙）
  const cubbies = [];
  for (const nm of state.items) {
    const ico = /芭比|娃娃/.test(nm) ? 'doll'
      : /悠悠球/.test(nm) ? 'yoyo'
      : /四驱车/.test(nm) ? 'car4wd'
      : /弹珠/.test(nm) ? 'marble'
      : /磁带|母带/.test(nm) ? 'tape'
      : /奖牌|金牌|钉鞋/.test(nm) ? 'medal'
      : /秒表/.test(nm) ? 'stopwatch'
      : /听诊器|胸牌/.test(nm) ? 'stethoscope'
      : /通知书|草稿/.test(nm) ? 'study'
      : /铃铛|项圈|跑轮/.test(nm) ? 'bell'
      : 'dream';
    const meta = state.itemStories?.[nm] || {
      story: /悠悠球|芭比/.test(nm) ? '8 岁那年攒下零花钱买回来的心头好，一直舍不得扔。' : '一路走来悉心留存的珍贵旧物。',
      buff: /悠悠球|芭比/.test(nm) ? (state.house?.buffActive ? '已上墙生效：完整休息多消 1 点疲劳，点亮终章暗线' : '买房布置小家上墙后激活居家恢复加成') : '联动旧物收藏家与岁月记忆'
    };
    cubbies.push({ name: nm, ico, sub: /悠悠球|芭比/.test(nm) && state.house?.buffActive ? '上墙生效' : '已珍藏', story: meta.story, buff: meta.buff, filled: true });
  }
  if (state.house && cubbies.length < 6) {
    cubbies.push({
      name: '房产证', ico: 'deed', sub: state.house.name.slice(0, 4), filled: true,
      story: `在${CITIES[state.cityTier].name.slice(0, 4)}拥有了真正属于自己的屋檐「${state.house.name}」。`,
      buff: `当前估值 ¥${fmtMoney(state.house.value)} · 余贷 ¥${fmtMoney(state.house.loan)}`
    });
  }
  if (state.hasCar && cubbies.length < 6) {
    cubbies.push({
      name: '代步车钥匙', ico: 'carKey', sub: '免通勤锁', filled: true,
      story: '提车那天绕着城市外环开了一圈，下雨天再也不用挤早高峰地铁。',
      buff: '直接免除远郊普通房的通勤占格惩罚'
    });
  }

  const displayCubbies = cubbies.slice(0, 6);
  while (displayCubbies.length < 6) {
    displayCubbies.push({ filled: false });
  }

  const dioramaTitle = isChild
    ? '小家实景微缩框 · 父母家少年书房'
    : state.house
      ? `实景小家微缩橱窗 · ${state.house.name} (${state.house.grid}×${state.house.grid})`
      : state.age < state.gradAge
        ? '实景微缩框 · 大学校园宿舍'
        : '实景微缩框 · 城市打拼合租屋';

  // Zone B：童年小猪存钱罐 vs 成年绿皮存折+收支天平
  let zoneBHtml = '';
  if (isChild) {
    const inPct = Math.min(86, Math.max(25, Math.round((Math.max(120, cf.annualIn) / (Math.max(120, cf.annualIn) + 180)) * 100)));
    zoneBHtml = `
      <div class="az-section">
        <div class="az-sec-label">铁皮小猪存钱罐 &amp; 零花账本</div>
        <div class="piggy-card" id="btn-poke-piggy">
          <div class="piggy-ico-wrap" id="piggy-sprite">
            ${pxIcon('piggy', 46)}
            <span class="piggy-tap-hint">轻点摇一摇</span>
          </div>
          <div class="piggy-right">
            <div class="piggy-amt">¥${fmtMoney(state.cash)}</div>
            <div class="cf-bar"><i style="width:${inPct}%"></i></div>
            <div class="piggy-sub">年度零花入账 +¥${cf.annualIn} VS 零食开销</div>
          </div>
        </div>
      </div>
    `;
  } else {
    const tot = Math.max(1, cf.annualIn + cf.annualOut);
    const greenPct = Math.min(88, Math.max(15, Math.round((cf.annualIn / tot) * 100)));
    zoneBHtml = `
      <div class="az-section">
        <div class="az-sec-label"><span>家庭绿皮存折 &amp; 年度收支天平</span></div>
        <div class="adult-ledger-row">
          <div class="green-passbook">
            <div class="gp-head">${pxIcon('passbook', 13)} <span>家庭存折</span></div>
            <div class="gp-mid">${CITIES[state.cityTier].name.slice(0, 4)} · ${state.retired ? '已退休' : `L${state.jobLevel}`}</div>
            <div class="gp-vals">
              <div><b>¥${fmtMoney(state.cash)}</b><small>现金</small></div>
              <div class="gp-div"></div>
              <div><b>¥${fmtMoney(nw)}</b><small>净资产</small></div>
            </div>
          </div>
          <div class="cf-panel">
            <div class="cf-top-labels"><span>年进账</span><span>刚性开销</span></div>
            <div class="cf-bar adult"><i style="width:${greenPct}%"><span>年进账</span></i></div>
            <div class="cf-nums">
              <b class="pos">+¥${fmtMoney(cf.annualIn)}</b>
              <span>vs</span>
              <b class="neg">-¥${fmtMoney(cf.annualOut)}</b>
            </div>
            <div class="cf-net">预计年净攒 <b class="${cf.netAnnual >= 0 ? 'pos' : 'neg'}">${cf.netAnnual >= 0 ? '+' : ''}¥${fmtMoney(cf.netAnnual)}</b></div>
          </div>
        </div>
      </div>
    `;
  }

  // Zone C：童年小卖部水浒卡册 vs 成年走势微折线 & 锯齿撕角票券夹
  let zoneCHtml = '';
  if (isChild) {
    const owned = state.snackCards || [];
    zoneCHtml = `
      <div class="az-section">
        <div class="az-sec-label">校门口小卖部 · 水浒卡集换册</div>
        <div class="tuck-album-card">
          <div class="ta-head">
            <span class="ta-title">水浒卡册</span>
            <span class="ta-cnt">已集 ${owned.length}/12 · 满4/8/12送重随券</span>
          </div>
          <div class="ta-pages">
            <div class="ta-grid">
              ${TUCK_CARDS_12.slice(0, 6).map(c => `<div class="ta-slot ${owned.includes(c) ? 'lit' : ''}">${owned.includes(c) ? c.slice(3, 5) : ''}</div>`).join('')}
            </div>
            <div class="ta-grid right">
              ${TUCK_CARDS_12.slice(6, 12).map(c => `<div class="ta-slot ${owned.includes(c) ? 'lit' : ''}">${owned.includes(c) ? c.slice(3, 5) : ''}</div>`).join('')}
            </div>
          </div>
          <button class="pill-btn primary" id="t-tuck" style="width:100%;margin-top:7px;">${pxIcon('shop', 14)} 逛一逛校门口小卖部</button>
        </div>
      </div>
    `;
  } else {
    const goldGainPct = state.goldGrams > 0 && state.goldAvgCost > 0
      ? Math.round(((state.goldPrice - state.goldAvgCost) / state.goldAvgCost) * 100)
      : Math.round(((state.goldPrice - 720) / 720) * 100);
    const houseTrendLabel = era.houseTrend === 'hot' ? '强势走高' : era.houseTrend === 'up' ? '温和回暖' : era.houseTrend === 'down' ? '回调横盘' : '平稳运行';
    zoneCHtml = `
      <div class="az-section">
        <div class="az-sec-label"><span>时代行情微折线 &amp; 锯齿票券夹</span></div>
        <div class="market-ticket-card">
          <div class="sparkline-pair">
            <div class="sp-cell">
              <div class="sp-top"><span>房产行情</span><b class="pos">${houseTrendLabel}</b></div>
              ${buildSparklineSvg(state.houseIdxHistory, '#3b8760', 'hgFill', '#3b8760')}
            </div>
            <div class="sp-cell">
              <div class="sp-top"><span>黄金 ¥${state.goldPrice}/g</span><b class="warm">${goldGainPct >= 0 ? '+' : ''}${goldGainPct}%</b></div>
              ${buildSparklineSvg(state.goldHistory, '#c9683a', 'ggFill', '#c9683a')}
            </div>
          </div>
          <div class="perf-tickets">
            <button class="perf-tkt gold" id="t-gold" ${state.age >= state.gradAge ? '' : 'disabled'}>
              <b>买卖黄金</b>
              <small>${state.goldGrams > 0 ? `持仓 ${Math.round(state.goldGrams)}g` : '避险保值'}</small>
            </button>
            <button class="perf-tkt red" id="t-lottery" ${state.lotteryThisTurn ? 'disabled' : ''}>
              <b>¥20刮彩票</b>
              <small>搏头奖运气</small>
              ${state.lotteryThisTurn ? '<span class="tkt-seal">已盖章</span>' : ''}
            </button>
            <button class="perf-tkt pink" id="t-emo" ${state.emoBuyThisTurn ? 'disabled' : ''}>
              <b>情绪买单</b>
              <small>即时回心态</small>
              ${state.emoBuyThisTurn ? '<span class="tkt-seal">已盖章</span>' : ''}
            </button>
          </div>
        </div>
      </div>
    `;
  }

  return `
    <div class="tab-page az-page">
      <!-- Zone A：实景小家微缩横截面橱窗 -->
      <div class="az-section">
        <div class="az-sec-label"><span>${dioramaTitle}</span></div>
        <div class="dio-card">
          ${buildDioramaSvg(state)}
          ${!isChild ? `
            <div class="dio-actions">
              ${state.age >= state.gradAge ? `<button class="dio-btn" id="t-house">周末看房</button>` : ''}
              <button class="dio-btn" id="t-puzzle">布置小家</button>
              ${state.age >= state.gradAge && !state.hasCar ? `<button class="dio-btn" id="t-car">买车代步</button>` : ''}
              ${state.age >= state.gradAge ? `<button class="dio-btn" id="t-city">换城发展</button>` : ''}
            </div>
          ` : ''}
        </div>
      </div>

      ${zoneBHtml}
      ${zoneCHtml}

      <!-- Zone D：六格核桃木多宝格（点击任意已收藏格子弹出手写记忆签） -->
      <div class="az-section">
        <div class="az-sec-label">六格核桃木多宝格（已珍藏 ${cubbies.length} 件 · 轻点看故事）</div>
        <div class="walnut-cabinet">
          <div class="walnut-grid">
            ${displayCubbies.map((c, idx) => c.filled ? `
              <button class="walnut-cell filled" data-curio-idx="${idx}">
                <div class="wc-ico">${pxIcon(c.ico, 26)}</div>
                <span class="wc-nm">${c.name}</span>
              </button>
            ` : `
              <div class="walnut-cell locked">
                <div class="wc-lock">${pxIcon('lock', 18)}</div>
              </div>
            `).join('')}
          </div>
          <div class="curio-story-pop hidden" id="curio-story-box"></div>
        </div>
      </div>
    </div>
  `;
}

export function bindNewAssetsInteractions(appEl, state, saveAutoProgress, showToast, renderMain) {
  // 童年小猪存钱罐摇晃互动
  const pigBtn = appEl.querySelector('#btn-poke-piggy');
  if (pigBtn) {
    pigBtn.onclick = () => {
      triggerHaptic('light');
      const sp = appEl.querySelector('#piggy-sprite');
      if (sp) {
        sp.classList.remove('pig-shake');
        void sp.offsetWidth;
        sp.classList.add('pig-shake');
      }
      showToast(`存钱罐叮当响！里面攒了 ¥${Math.round(state.cash)} 零花钱`);
    };
  }

  // 买代步车（解锁车钥匙旧物格 + 免远郊房通勤锁格！）
  const carBtn = appEl.querySelector('#t-car');
  if (carBtn) {
    carBtn.onclick = () => {
      if (hasHex(state, 'hx_minimalist')) {
        return showToast('受「极简生活」命运卡约束不能买车（已为你每年省下 18% 杂费并多给排程格！）');
      }
      const price = getBondTier(state, 'wealth') >= 2 ? 108000 : 120000;
      if (state.cash < price) {
        return showToast(`购置代步车需 ¥${(price / 10000).toFixed(1)}万（提车后可免除远郊房通勤锁格！）`);
      }
      state.cash -= price;
      state.hasCar = true;
      state.stats.mood = Math.min(100, state.stats.mood + 6);
      saveAutoProgress();
      renderMain();
      showToast('喜提人生第一辆代步车！车钥匙已收入多宝格，远郊通勤不再锁格');
    };
  }

  // 点击核桃木多宝格弹出手写记忆便签
  const cubbyNodes = appEl.querySelectorAll('[data-curio-idx]');
  if (cubbyNodes.length) {
    const cubbies = [];
    for (const nm of state.items) {
      const meta = state.itemStories?.[nm] || {
        story: /悠悠球|芭比/.test(nm) ? '8 岁那年攒零花钱挑中的宝贝，搬了几次家也一直带在身边。' : '一路走来悉心收藏的岁月信物。',
        buff: /悠悠球|芭比/.test(nm) ? (state.house?.buffActive ? '已挂上客厅墙面：休息多减 1 点疲劳，点亮初心暗线' : '买房布置小家上墙后激活恢复加成') : '每件藏品联动旧物收藏家回暖心态'
      };
      cubbies.push({ name: nm, ...meta });
    }
    if (state.house && cubbies.length < 6) {
      cubbies.push({ name: '房产证', story: `签下「${state.house.name}」那天，城市万家灯火终于有一盏为你而亮。`, buff: '抵御通胀增值，解锁空间拼图' });
    }
    if (state.hasCar && cubbies.length < 6) {
      cubbies.push({ name: '代步车钥匙', story: '周末可以随时载着家人兜风的自由小空间。', buff: '免除远郊房通勤占格，每年养车 ¥6,000' });
    }
    cubbyNodes.forEach(btn => {
      btn.onclick = () => {
        const item = cubbies[Number(btn.dataset.curioIdx)];
        const box = appEl.querySelector('#curio-story-box');
        if (!item || !box) return;
        triggerHaptic('light');
        box.classList.remove('hidden');
        box.innerHTML = `
          <div class="cs-title">【${item.name}】</div>
          <div class="cs-story">${item.story}</div>
          <div class="cs-buff">生效加成：${item.buff}</div>
        `;
        box.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      };
    });
  }
}

// ==================== 4. 「亲友梦」自然四阶追梦手账轨迹 ====================
export function renderDreamJournalSection(state) {
  ensureDreamState(state);
  const touched = DREAM_IDS.map(id => ({ ...state.dreams[id], meta: DREAM_CATALOG[id] })).filter(d => d.stage >= 1);

  const stageLabel = d => {
    if (d.outcome === 'success') return { txt: '已圆梦登顶', cls: 'win' };
    if (d.outcome === 'pivot') return { txt: '温柔和解·终身热爱', cls: 'pivot' };
    if (d.outcome === 'near_miss') return { txt: `惜败回响·可再战(${3 - d.retries})`, cls: 'pursuit' };
    if (d.stage === 3) return { txt: '认真追逐中', cls: 'pursuit' };
    if (d.stage === 2) return { txt: '感兴趣·业余折腾', cls: 'hobby' };
    return { txt: '偶遇火种', cls: 'spark' };
  };

  return `
    <div class="dream-rally">
      <div class="sec-head-row">
        <span class="sec-title">${pxIcon('dream', 17)} 心之所向 · 追梦手账</span>
        <span class="tag ${state.dreamCompleted ? 'up' : ''}">${state.dreamCompleted ? '已圆梦此生' : `最高熟练 ${state.dreamSkill}/100`}</span>
      </div>
      ${!touched.length ? `
        <div class="dream-empty-note">
          梦想不用从菜单里勾选——多去自习、运动、放空散步或和朋友玩耍，你自然会在某个日常瞬间撞见让你眼睛发亮的事。
        </div>
      ` : `
        <div class="dream-journal-list">
          ${touched.map(d => {
            const st = stageLabel(d);
            const extraInfo = d.id === 'd_singer' && d.songsCount > 0
              ? `原创曲 ${d.songsCount} 首（代表作${d.songName}）`
              : `累计投入 ${d.trains} 次 · 熟练度 ${d.xp}/100`;
            const canPivot = (d.stage === 2 || d.stage === 3) && state.age >= 18;
            return `
              <div class="dj-card">
                <div class="dj-top">
                  <div class="dj-name">${pxIcon(d.meta.ico, 16)} <b>${d.meta.name}</b></div>
                  <span class="dj-badge ${st.cls}">${st.txt}</span>
                </div>
                <div class="dj-bar"><i style="width:${Math.min(100, d.xp)}%"></i></div>
                <div class="dj-foot">
                  <span>${extraInfo}</span>
                  ${canPivot ? `<button class="dj-pivot-btn" data-pivot-dream="${d.id}">温柔放下转特质</button>` : ''}
                </div>
              </div>
            `;
          }).join('')}
        </div>
      `}
    </div>
  `;
}
