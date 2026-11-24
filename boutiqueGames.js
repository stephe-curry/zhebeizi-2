// 《这辈子 2.0》Sprint 4 —— 三款高重玩度独立标杆小游戏库：
// 1. 《魔性节拍大师》（第八套广播体操领操 / 极速节拍盲打）
// 2. 《火眼捉虫大作战》（考前五分钟查错卷 / 周末超市长小票核验）
// 3. 《时光画片·大家来找茬》（10 处动态细节池每局随机抽 5 处不同，上下双画布同步红圈标注）
// 严格遵循纯中文零表情符号规范。

import { pxIcon } from './icons.js?v=s40';
import { triggerHaptic } from './vfxAndUi.js?v=s40';

function setupHiDpi(canvas, w, h) {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  canvas.style.width = `${w}px`;
  canvas.style.height = `${h}px`;
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return ctx;
}

// 轻量清脆合成木鱼/节拍音效（自动兼容静音环境）
let sharedAudioCtx = null;
function playBeatTone(freq = 520, dur = 0.06) {
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    if (!sharedAudioCtx) sharedAudioCtx = new AC();
    if (sharedAudioCtx.state === 'suspended') sharedAudioCtx.resume();
    const osc = sharedAudioCtx.createOscillator();
    const gain = sharedAudioCtx.createGain();
    osc.type = 'triangle';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.12, sharedAudioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, sharedAudioCtx.currentTime + dur);
    osc.connect(gain);
    gain.connect(sharedAudioCtx.destination);
    osc.start();
    osc.stop(sharedAudioCtx.currentTime + dur);
  } catch (_) {}
}

// ============================================================================
// 1. 《魔性节拍大师》（广播体操领操 / 职场极速敲键卡点）
// ============================================================================
export function openRhythmMasterGame(container, state, opts = {}, onFinish) {
  const W = 342, H = 226;
  const isChild = state.age <= 18;
  const titleText = isChild ? '魔性节拍大师 · 大课间广播体操' : '魔性节拍大师 · 极速键盘卡点';

  let score = 0;
  let combo = 0;
  let maxCombo = 0;
  let timeLeft = 22;
  let poseIdx = 0; // 0:预备 1:伸展 2:扩胸 3:踢腿 4:腾跃 -1:同手同脚出糗
  let poseTimer = 0;
  let beats = [];
  let pops = [];
  let spawnAcc = 0.25;
  let patternStep = 0;
  let alive = true;
  let rafId = 0;

  // 富有韵律感的八拍广播体操鼓点间隔序列（单拍 + 连拍）
  const rhythmIntervals = [0.58, 0.58, 0.34, 0.52, 0.56, 0.34, 0.34, 0.62];

  container.innerHTML = `
    <div class="mg-box arc-box">
      <div class="mg-head">
        <h3 style="display:flex;align-items:center;gap:6px;">${pxIcon('dance', 16)} ${titleText}</h3>
        <button class="btn ghost" id="rm-skip">一键保底</button>
      </div>
      <div class="arc-hud">
        <span>剩余：<b id="rm-time">22.0s</b></span>
        <span>连击：<b id="rm-combo">0</b></span>
        <span>得分：<b id="rm-score">0</b>（250分评 S）</span>
      </div>
      <div class="arc-canvas-wrap">
        <canvas id="rm-cv"></canvas>
      </div>
      <button class="btn primary arc-hold-btn" id="rm-tap">当圆环重合左侧金圈瞬间 · 单指敲击卡点！</button>
    </div>
  `;

  const cv = container.querySelector('#rm-cv');
  const ctx = setupHiDpi(cv, W, H);
  const timeEl = container.querySelector('#rm-time');
  const cbEl = container.querySelector('#rm-combo');
  const scEl = container.querySelector('#rm-score');
  const tapBtn = container.querySelector('#rm-tap');

  function finishGame(isAuto = false) {
    if (!alive) return;
    alive = false;
    cancelAnimationFrame(rafId);
    if (isAuto) {
      return onFinish({
        grade: 'B', score: 135, health: 1, mood: 2,
        note: isChild ? '跟着大部队做完广播体操（健康 +1，心态 +2）' : '顺畅敲完今日文稿（心态 +2）'
      });
    }
    const grade = score >= 250 ? 'S' : score >= 170 ? 'A' : score >= 95 ? 'B' : 'C';
    onFinish({
      grade,
      score,
      health: isChild ? (grade === 'S' ? 2 : 1) : 1,
      mood: grade === 'S' ? 5 : grade === 'A' ? 3 : 2,
      expr: isChild && grade === 'S' ? 2 : 0,
      pro: !isChild && grade === 'S' ? 1 : 0,
      fatigueDelta: grade === 'S' ? -1 : 0,
      note: `最高 ${maxCombo} 连击！节拍大师得分 ${score}（${grade} 级）！`
    });
  }

  container.querySelector('#rm-skip').onclick = () => finishGame(true);

  const TARGET_X = 68;
  const TRACK_Y = 178;

  function hitBeat() {
    if (!alive) return;
    // 找距离靶心最近的一颗节拍球
    let best = null;
    let bestDist = 999;
    for (const b of beats) {
      if (b.hit) continue;
      const d = Math.abs(b.x - TARGET_X);
      if (d < bestDist) { bestDist = d; best = b; }
    }

    if (best && bestDist <= 38) {
      best.hit = true;
      const isPerf = bestDist <= 17;
      combo++;
      if (combo > maxCombo) maxCombo = combo;
      const add = (isPerf ? 26 : 15) + Math.min(12, Math.floor(combo / 3) * 3) + (best.gold ? 8 : 0);
      score += add;
      poseIdx = (poseIdx % 4) + 1;
      poseTimer = 0.42;
      playBeatTone(isPerf ? (best.gold ? 880 : 660) : 520, 0.07);
      triggerHaptic(isPerf ? 'medium' : 'light');
      pops.push({
        x: TARGET_X, y: TRACK_Y - 26,
        txt: isPerf ? `完美 +${add}` : `稳准 +${add}`,
        col: isPerf ? '#fde047' : '#86efac',
        life: 0.75
      });
    } else {
      combo = 0;
      poseIdx = -1;
      poseTimer = 0.35;
      playBeatTone(210, 0.08);
      pops.push({ x: TARGET_X, y: TRACK_Y - 26, txt: '抢拍出糗', col: '#fca5a5', life: 0.65 });
    }
    cbEl.textContent = String(combo);
    scEl.textContent = String(score);
  }

  tapBtn.addEventListener('pointerdown', e => { e.preventDefault(); hitBeat(); });
  cv.addEventListener('pointerdown', e => { e.preventDefault(); hitBeat(); });

  let lastTs = performance.now();
  function loop(now) {
    if (!alive) return;
    const dt = Math.min(0.05, (now - lastTs) / 1000);
    lastTs = now;
    timeLeft -= dt;
    if (timeLeft <= 0) {
      finishGame(false);
      return;
    }
    timeEl.textContent = `${Math.max(0, timeLeft).toFixed(1)}s`;
    if (poseTimer > 0) {
      poseTimer -= dt;
      if (poseTimer <= 0) poseIdx = 0;
    }

    if (timeLeft > 1.2) {
      spawnAcc -= dt;
      if (spawnAcc <= 0) {
        const iv = rhythmIntervals[patternStep % rhythmIntervals.length];
        const isGold = iv <= 0.35 || patternStep % 4 === 3;
        beats.push({ x: W + 18, gold: isGold, hit: false });
        spawnAcc = iv;
        patternStep++;
      }
    }

    for (const b of beats) {
      b.x -= 195 * dt;
      if (!b.hit && b.x < TARGET_X - 36) {
        b.hit = true;
        combo = 0;
        poseIdx = -1;
        poseTimer = 0.32;
        cbEl.textContent = '0';
        pops.push({ x: TARGET_X, y: TRACK_Y - 24, txt: '漏拍', col: '#fca5a5', life: 0.6 });
      }
    }
    beats = beats.filter(b => !b.hit && b.x > -24);

    // 绘制舞台与狂热聚光灯
    const fever = combo >= 6;
    ctx.fillStyle = fever ? '#2d1b4e' : (isChild ? '#efe3cc' : '#262936');
    ctx.fillRect(0, 0, W, H);

    if (fever) {
      ctx.fillStyle = 'rgba(253, 224, 71, 0.16)';
      ctx.beginPath(); ctx.moveTo(W / 2 - 30, 0); ctx.lineTo(W / 2 + 30, 0); ctx.lineTo(W / 2 + 110, 146); ctx.lineTo(W / 2 - 110, 146); ctx.fill();
    }

    ctx.fillStyle = fever || !isChild ? '#fef3c7' : '#4a3728';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    const actionWord = poseIdx === -1 ? '哎呀同手同脚啦！稳住节奏！'
      : fever ? `全场领操高燃时刻！连击 ×${combo}`
      : (isChild ? '一二三四 · 二二三四 · 踩点伸展运动！' : '噼里啪啦 · 踩准鼓点盲打如飞！');
    ctx.fillText(actionWord, W / 2, 22);

    // 绘制中央律动像素小人（5 套夸张体操/敲键动作帧）
    const cx = W / 2, cy = 96;
    ctx.save();
    ctx.translate(cx, cy + (poseIdx > 0 ? -6 : 0));
    if (poseIdx === -1) ctx.rotate(0.18);
    // 阴影
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.beginPath(); ctx.ellipse(0, 34, 22, 6, 0, 0, Math.PI * 2); ctx.fill();
    // 头与躯干
    ctx.fillStyle = '#fde3c8';
    ctx.beginPath(); ctx.arc(0, -22, 12, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#4a3728'; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = poseIdx === -1 ? '#ef4444' : (fever ? '#f59e0b' : '#3b82f6');
    ctx.fillRect(-11, -9, 22, 24);
    ctx.strokeRect(-11, -9, 22, 24);

    // 手臂与腿部随节拍大开大合
    ctx.strokeStyle = '#4a3728';
    ctx.lineWidth = 4.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    if (poseIdx === 1) {
      // 高举双臂伸展
      ctx.moveTo(-11, -4); ctx.lineTo(-26, -26);
      ctx.moveTo(11, -4); ctx.lineTo(26, -26);
      ctx.moveTo(-6, 15); ctx.lineTo(-10, 32);
      ctx.moveTo(6, 15); ctx.lineTo(10, 32);
    } else if (poseIdx === 2) {
      // 扩胸平展
      ctx.moveTo(-11, -2); ctx.lineTo(-32, -2);
      ctx.moveTo(11, -2); ctx.lineTo(32, -2);
      ctx.moveTo(-6, 15); ctx.lineTo(-14, 32);
      ctx.moveTo(6, 15); ctx.lineTo(14, 32);
    } else if (poseIdx === 3) {
      // 活力高踢腿
      ctx.moveTo(-11, -4); ctx.lineTo(-24, 8);
      ctx.moveTo(11, -4); ctx.lineTo(26, -18);
      ctx.moveTo(-6, 15); ctx.lineTo(-8, 32);
      ctx.moveTo(6, 15); ctx.lineTo(28, 12);
    } else if (poseIdx === 4) {
      // 大字腾跃
      ctx.moveTo(-11, -4); ctx.lineTo(-28, -18);
      ctx.moveTo(11, -4); ctx.lineTo(28, -18);
      ctx.moveTo(-6, 15); ctx.lineTo(-20, 28);
      ctx.moveTo(6, 15); ctx.lineTo(20, 28);
    } else {
      ctx.moveTo(-11, -4); ctx.lineTo(-18, 10);
      ctx.moveTo(11, -4); ctx.lineTo(18, 10);
      ctx.moveTo(-6, 15); ctx.lineTo(-8, 32);
      ctx.moveTo(6, 15); ctx.lineTo(8, 32);
    }
    ctx.stroke();
    ctx.restore();

    // 底部节拍轨道与左侧金色判定靶心
    ctx.fillStyle = 'rgba(20, 16, 28, 0.84)';
    ctx.fillRect(0, 146, W, H - 146);
    ctx.strokeStyle = 'rgba(255,255,255,0.22)';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(24, TRACK_Y); ctx.lineTo(W - 12, TRACK_Y); ctx.stroke();

    // 判定靶心环
    ctx.strokeStyle = '#fde047';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(TARGET_X, TRACK_Y, 18, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = 'rgba(253, 224, 71, 0.18)';
    ctx.fill();

    // 飞来的节拍音符圆环
    for (const b of beats) {
      ctx.save();
      ctx.translate(b.x, TRACK_Y);
      ctx.fillStyle = b.gold ? '#f59e0b' : '#38bdf8';
      ctx.beginPath(); ctx.arc(0, 0, 15, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#fffdf9';
      ctx.lineWidth = 2.2;
      ctx.stroke();
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(b.gold ? '重' : '拍', 0, 3.5);
      ctx.restore();
    }

    pops = pops.filter(p => p.life > 0);
    for (const p of pops) {
      p.life -= dt * 1.4;
      p.y -= dt * 20;
      ctx.save();
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = p.col;
      ctx.fillText(p.txt, p.x, p.y);
      ctx.restore();
    }

    rafId = requestAnimationFrame(loop);
  }
  rafId = requestAnimationFrame(loop);
}

// ============================================================================
// 2. 《火眼捉虫大作战》（考前查错卷 / 超市账单核验 —— 每局动态抽 3 处猫腻 + 4 处真条目）
// ============================================================================
export function openSpotBugGame(container, state, opts = {}, onFinish) {
  const isExam = state.age <= 21;
  const titleText = isExam ? '火眼捉虫 · 交卷前查错卷' : '火眼捉虫 · 超市小票核账';

  const examTruePool = [
    '［计算］ 7 × 8 + 14 = 70',
    '［几何］ 直角三角形勾三股四弦五',
    '［公式］ (a + b)² = a² + 2ab + b²',
    '［常识］ 地球绕太阳公转一周约一年',
    '［物理］ 标准大气压下冰水混合物 0℃',
    '［化简］ 125 × 8 = 1000'
  ];
  const examBugPool = [
    { txt: '［计算］ 9 × 7 + 16 = 81', why: '9×7=63，加16应为 79！' },
    { txt: '［公式］ (a - b)² = a² - b²', why: '漏掉了中间项 -2ab！' },
    { txt: '［单位］ 1 小时 = 100 分钟', why: '1 小时应为 60 分钟！' },
    { txt: '［几何］ 三角形内角和等于 360°', why: '三角形内角和应为 180°！' },
    { txt: '［小数］ 0.25 × 4 = 10', why: '小数点错位，应等于 1！' }
  ];

  const billTruePool = [
    '五常鲜大米 (¥48/袋) × 1   ¥48.0',
    '鲜牛奶两连包 (¥12/盒) × 2  ¥24.0',
    '散装土鸡蛋 (¥19/板) × 1   ¥19.0',
    '纯棉抽纸提装 (¥16/提) × 1  ¥16.0',
    '生抽酱油 500ml (¥9/瓶) × 2 ¥18.0',
    '会员积分抵扣优惠           -¥5.0'
  ];
  const billBugPool = [
    { txt: '大白兔奶糖 (¥6/袋) × 3    ¥24.0', why: '6×3 应为 ¥18，多算了 6 元！' },
    { txt: '矿泉水单瓶 (¥2.0) × 2   ¥20.0', why: '小数点多打一位，多收 16 元！' },
    { txt: '塑料购物袋 (¥0.5) × 11   ¥5.5', why: '只拿 1 个袋子被连扫成了 11 个！' },
    { txt: '红富士苹果 (¥8/斤) × 2   ¥18.0', why: '8×2 应为 ¥16，称重单价算错！' },
    { txt: '过期日清仓酸奶 (买一送一) 实收双份', why: '买一送一未减免赠品金额！' }
  ];

  const tPool = [...(isExam ? examTruePool : billTruePool)].sort(() => Math.random() - 0.5).slice(0, 4).map(t => ({ txt: t, isBug: false, circled: false, wrongTap: false }));
  const bPool = [...(isExam ? examBugPool : billBugPool)].sort(() => Math.random() - 0.5).slice(0, 3).map(b => ({ txt: b.txt, why: b.why, isBug: true, circled: false }));
  const rows = [...tPool, ...bPool].sort(() => Math.random() - 0.5);

  let found = 0;
  let mistakes = 0;
  let timeLeft = 26;
  let lastHint = isExam
    ? '交卷铃响前最后核查！在下方 7 行答题里点出全部 3 处笔误漏洞！'
    : '核对购物长小票！在下方 7 行明细里用红笔圈出全部 3 处多算猫腻！';
  let over = false;

  const timer = setInterval(() => {
    if (over) return;
    timeLeft--;
    const el = container.querySelector('#sb-time');
    if (el) el.textContent = `${Math.max(0, timeLeft)}s`;
    if (timeLeft <= 0) finishGame(false);
  }, 1000);

  function finishGame(isAuto = false) {
    if (over) return;
    over = true;
    clearInterval(timer);
    if (isAuto) {
      return onFinish({
        grade: 'B', score: 130, cash: isExam ? 0 : 80, know: isExam ? 1 : 0, mood: 2,
        note: isExam ? '顺手检查出一道符号笔误（学识 +1，心态 +2）' : '核对小票追回多算零头（现金 +¥80）'
      });
    }
    const score = found * 85 + (found === 3 ? timeLeft * 4 : 0) - mistakes * 20;
    const grade = (found === 3 && mistakes <= 1 && score >= 245) ? 'S'
      : found >= 2 ? 'A'
      : found >= 1 ? 'B' : 'C';
    onFinish({
      grade,
      score,
      know: isExam ? (grade === 'S' ? 3 : grade === 'A' ? 2 : 1) : 0,
      cash: !isExam ? (grade === 'S' ? 280 : grade === 'A' ? 160 : 60) : 0,
      mood: grade === 'S' ? 4 : 2,
      note: found === 3
        ? `火眼金睛揪出全部 3 处猫腻（${grade} 级）！${isExam ? '考卷稳稳追回漏分！' : '收银台当场退赔立省冤枉钱！'}`
        : `查出 ${found}/3 处漏洞（${grade} 级）！`
    });
  }

  function render() {
    container.innerHTML = `
      <div class="mg-box arc-box">
        <div class="mg-head">
          <h3 style="display:flex;align-items:center;gap:6px;">${pxIcon('study', 16)} ${titleText}</h3>
          <button class="btn ghost" id="sb-skip">一键保底</button>
        </div>
        <div class="arc-hud">
          <span>倒计时：<b id="sb-time">${timeLeft}s</b></span>
          <span>已揪出漏洞：<b>${found}/3</b></span>
          <span>误判：<b>${mistakes}</b></span>
        </div>
        <div class="bug-hint-strip">${lastHint}</div>
        <div class="bug-paper ${isExam ? 'exam' : 'receipt'}">
          ${rows.map((r, idx) => `
            <button class="bug-row ${r.circled ? 'circled' : ''} ${r.wrongTap ? 'wrong' : ''}" data-idx="${idx}" ${r.circled || over ? 'disabled' : ''}>
              <span class="br-txt">${r.txt}</span>
              ${r.circled ? '<span class="br-seal">已揪出</span>' : ''}
            </button>
          `).join('')}
        </div>
      </div>
    `;

    container.querySelector('#sb-skip').onclick = () => finishGame(true);
    container.querySelectorAll('.bug-row').forEach(btn => {
      btn.onclick = () => {
        if (over) return;
        const r = rows[Number(btn.dataset.idx)];
        if (r.isBug) {
          r.circled = true;
          found++;
          lastHint = `漂亮揪出：${r.why}`;
          playBeatTone(740, 0.08);
          triggerHaptic('medium');
          render();
          if (found >= 3) setTimeout(() => finishGame(false), 450);
        } else {
          r.wrongTap = true;
          mistakes++;
          timeLeft = Math.max(1, timeLeft - 3);
          lastHint = '这一行算得没毛病！误圈扣 3 秒，再仔细核对数字！';
          playBeatTone(200, 0.09);
          triggerHaptic('heavy');
          render();
        }
      };
    });
  }
  render();
}

// ============================================================================
// 3. 《时光画片·大家来找茬》（上下双画布程序化千禧客厅，10 处细节池每局随机变 5 处！）
// ============================================================================
export function openSpotDiffGame(container, state, opts = {}, onFinish) {
  const W = 342, H = 114;

  // 10 个高精度可变异生活细节坐标点（每局随机抽取 5 处产生差异！）
  const ALL_SPOTS = [
    { id: 'cal',   x: 42,  y: 26, r: 21, name: '墙上日历页码' },
    { id: 'clock', x: 112, y: 24, r: 20, name: '圆挂钟指针' },
    { id: 'ant',   x: 78,  y: 52, r: 20, name: '老彩电右天线' },
    { id: 'tv',    x: 76,  y: 78, r: 22, name: '电视机画面' },
    { id: 'vase',  x: 28,  y: 78, r: 19, name: '木柜瓷瓶颜色' },
    { id: 'bird',  x: 248, y: 26, r: 22, name: '窗外飞燕与晴云' },
    { id: 'plant', x: 184, y: 66, r: 21, name: '阳台盆栽小红花' },
    { id: 'cup',   x: 298, y: 84, r: 20, name: '茶几搪瓷缸杯盖' },
    { id: 'cat',   x: 226, y: 96, r: 22, name: '地毯猫咪花色' },
    { id: 'toy',   x: 138, y: 98, r: 20, name: '地板上的童年玩具' }
  ];

  const activeDiffs = [...ALL_SPOTS].sort(() => Math.random() - 0.5).slice(0, 5).map(d => ({ ...d, found: false }));
  const diffSet = new Set(activeDiffs.map(d => d.id));

  let foundCnt = 0;
  let timeLeft = 32;
  let hintsLeft = 1;
  let hintSpotId = null;
  let statusMsg = '上下两幅老照片共有 5 处不同，直接在任意一幅图上点出差异处！';
  let over = false;

  container.innerHTML = `
    <div class="mg-box arc-box" style="gap:6px;">
      <div class="mg-head">
        <h3 style="display:flex;align-items:center;gap:6px;">${pxIcon('film', 16)} 时光画片 · 大家来找茬</h3>
        <button class="btn ghost" id="sd-skip">一键保底</button>
      </div>
      <div class="arc-hud">
        <span>剩余：<b id="sd-time">32s</b></span>
        <span>已找出：<b id="sd-cnt">0/5</b></span>
        <button class="combo-codex-btn" id="sd-hint">放大镜提示 (1)</button>
      </div>
      <div style="font-size:10.5px;color:var(--muted);text-align:center;" id="sd-msg">${statusMsg}</div>
      <div class="diff-pair-wrap">
        <div class="arc-canvas-wrap"><canvas id="sd-top"></canvas></div>
        <div class="arc-canvas-wrap"><canvas id="sd-bot"></canvas></div>
      </div>
    </div>
  `;

  const topCv = container.querySelector('#sd-top');
  const botCv = container.querySelector('#sd-bot');
  const topCtx = setupHiDpi(topCv, W, H);
  const botCtx = setupHiDpi(botCv, W, H);
  const timeEl = container.querySelector('#sd-time');
  const cntEl = container.querySelector('#sd-cnt');
  const msgEl = container.querySelector('#sd-msg');
  const hintBtn = container.querySelector('#sd-hint');

  function drawScene(ctx, isMutated) {
    const mut = id => isMutated && diffSet.has(id);

    // 墙面与木地板
    ctx.fillStyle = '#f3e7cf';
    ctx.fillRect(0, 0, W, 82);
    ctx.fillStyle = '#c89058';
    ctx.fillRect(0, 82, W, H - 82);
    ctx.strokeStyle = '#4a3728';
    ctx.lineWidth = 1.8;
    ctx.beginPath(); ctx.moveTo(0, 82); ctx.lineTo(W, 82); ctx.stroke();

    // 右半侧大阳台窗户与晴空
    ctx.fillStyle = '#bae6fd';
    ctx.fillRect(172, 10, 152, 68);
    ctx.strokeRect(172, 10, 152, 68);
    ctx.beginPath(); ctx.moveTo(248, 10); ctx.lineTo(248, 78); ctx.stroke();

    // 1. 墙上日历 (42, 26)
    ctx.fillStyle = '#dc2626';
    ctx.fillRect(28, 10, 28, 8);
    ctx.fillStyle = '#fffdf9';
    ctx.fillRect(28, 18, 28, 20);
    ctx.strokeRect(28, 10, 28, 28);
    ctx.fillStyle = '#1e293b';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(mut('cal') ? '26' : '18', 42, 33);

    // 2. 圆盘挂钟 (112, 24)
    ctx.fillStyle = '#fffbeb';
    ctx.beginPath(); ctx.arc(112, 24, 13, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(112, 24); ctx.lineTo(112, 15);
    ctx.moveTo(112, 24);
    if (mut('clock')) ctx.lineTo(103, 27);
    else ctx.lineTo(121, 24);
    ctx.stroke();

    // 3 & 4. 老式彩电与天线 + 木电视柜
    ctx.fillStyle = '#8b5a2b';
    ctx.fillRect(16, 84, 104, 24);
    ctx.strokeRect(16, 84, 104, 24);

    ctx.beginPath();
    ctx.moveTo(76, 58); ctx.lineTo(64, 44);
    if (!mut('ant')) {
      ctx.moveTo(76, 58); ctx.lineTo(90, 44);
    }
    ctx.stroke();

    ctx.fillStyle = '#475569';
    ctx.fillRect(52, 58, 48, 28);
    ctx.strokeRect(52, 58, 48, 28);
    ctx.fillStyle = mut('tv') ? '#4ade80' : '#38bdf8';
    ctx.fillRect(56, 62, 34, 20);
    ctx.fillStyle = mut('tv') ? '#fde047' : '#ffffff';
    ctx.beginPath(); ctx.arc(73, 72, 5, 0, Math.PI * 2); ctx.fill();

    // 5. 木柜瓷瓶 (28, 78)
    ctx.fillStyle = mut('vase') ? '#f97316' : '#2563eb';
    ctx.beginPath(); ctx.ellipse(28, 76, 8, 10, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();

    // 6. 窗外飞鸟 vs 金色太阳 (248, 26)
    if (mut('bird')) {
      ctx.fillStyle = '#facc15';
      ctx.beginPath(); ctx.arc(282, 26, 8, 0, Math.PI * 2); ctx.fill();
    } else {
      ctx.strokeStyle = '#1e3a8a';
      ctx.beginPath();
      ctx.moveTo(268, 26); ctx.quadraticCurveTo(273, 20, 278, 26);
      ctx.quadraticCurveTo(283, 20, 288, 26);
      ctx.stroke();
      ctx.strokeStyle = '#4a3728';
    }

    // 7. 窗边绿植盆栽与小红花 (184, 66)
    ctx.fillStyle = '#c2410c';
    ctx.fillRect(178, 68, 16, 14);
    ctx.strokeRect(178, 68, 16, 14);
    ctx.fillStyle = '#16a34a';
    ctx.beginPath(); ctx.arc(186, 61, 9, 0, Math.PI * 2); ctx.fill();
    if (!mut('plant')) {
      ctx.fillStyle = '#ef4444';
      ctx.beginPath(); ctx.arc(186, 58, 4, 0, Math.PI * 2); ctx.fill();
    }

    // 8. 右侧小茶几与搪瓷缸 (298, 84)
    ctx.fillStyle = '#9a6538';
    ctx.fillRect(274, 88, 54, 18);
    ctx.strokeRect(274, 88, 54, 18);
    ctx.fillStyle = '#fffdf9';
    ctx.fillRect(291, 74, 14, 15);
    ctx.strokeRect(291, 74, 14, 15);
    ctx.fillStyle = '#dc2626';
    ctx.fillRect(292, 81, 12, 3);
    if (!mut('cup')) {
      // 杯盖顶珠
      ctx.fillStyle = '#fde047';
      ctx.beginPath(); ctx.arc(298, 71, 3.5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    }

    // 9. 地毯上的猫咪 (226, 96)
    ctx.fillStyle = '#fef3c7';
    ctx.fillRect(194, 88, 66, 20);
    ctx.strokeRect(194, 88, 66, 20);
    ctx.fillStyle = mut('cat') ? '#f8fafc' : '#f59e0b';
    ctx.beginPath(); ctx.ellipse(226, 97, 13, 8, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.arc(215, 94, 6, 0, Math.PI * 2); ctx.fill(); ctx.stroke();

    // 10. 地板童年玩具 (138, 98)
    if (mut('toy')) {
      ctx.fillStyle = '#2563eb';
      ctx.fillRect(128, 93, 20, 10);
      ctx.strokeRect(128, 93, 20, 10);
    } else {
      ctx.fillStyle = '#ef4444';
      ctx.beginPath(); ctx.arc(138, 98, 7, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    }

    // 右上角幅标（避开左上墙面挂历）
    ctx.fillStyle = 'rgba(74,55,40,0.76)';
    ctx.fillRect(W - 46, 4, 42, 15);
    ctx.fillStyle = '#fffdf9';
    ctx.font = 'bold 9.5px sans-serif';
    ctx.fillText(isMutated ? '对比片' : '原记忆', W - 25, 14.5);

    // 绘制已找到的红笔圆圈 + 放大镜提示虚线圈
    for (const d of activeDiffs) {
      if (d.found) {
        ctx.strokeStyle = '#dc2626';
        ctx.lineWidth = 2.6;
        ctx.beginPath(); ctx.arc(d.x, d.y, 16, 0, Math.PI * 2); ctx.stroke();
      } else if (hintSpotId === d.id) {
        ctx.save();
        ctx.setLineDash([4, 3]);
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 2.6;
        ctx.beginPath(); ctx.arc(d.x, d.y, 18, 0, Math.PI * 2); ctx.stroke();
        ctx.restore();
      }
    }
  }

  function redrawBoth() {
    drawScene(topCtx, false);
    drawScene(botCtx, true);
  }
  redrawBoth();

  const timer = setInterval(() => {
    if (over) return;
    timeLeft--;
    timeEl.textContent = `${Math.max(0, timeLeft)}s`;
    if (timeLeft <= 0) finishGame(false);
  }, 1000);

  function finishGame(isAuto = false) {
    if (over) return;
    over = true;
    clearInterval(timer);
    if (isAuto) {
      return onFinish({
        grade: 'B', score: 135, mood: 3, know: 1,
        note: '静心翻完老相册找回童年细节（心态 +3，学识 +1）'
      });
    }
    const score = foundCnt * 48 + (foundCnt === 5 ? timeLeft * 4 : 0);
    const grade = (foundCnt === 5 && score >= 255) ? 'S'
      : foundCnt >= 4 ? 'A'
      : foundCnt >= 2 ? 'B' : 'C';
    onFinish({
      grade,
      score,
      mood: grade === 'S' ? 5 : 3,
      know: grade === 'S' || grade === 'A' ? 1 : 0,
      health: state.age >= 50 ? 1 : 0,
      note: foundCnt === 5
        ? `眼力满分！找齐老画片全部 5 处细节差异（${grade} 级 · ${score} 分）！`
        : `找出 ${foundCnt}/5 处时光差异（${grade} 级）！`
    });
  }

  container.querySelector('#sd-skip').onclick = () => finishGame(true);

  hintBtn.onclick = () => {
    if (hintsLeft <= 0 || over) return;
    const rem = activeDiffs.find(d => !d.found);
    if (!rem) return;
    hintsLeft--;
    hintSpotId = rem.id;
    hintBtn.disabled = true;
    hintBtn.textContent = '提示已用';
    msgEl.textContent = `提示已标出黄圈：留意「${rem.name}」！`;
    redrawBoth();
  };

  function handleCanvasTap(cv, e) {
    e.preventDefault();
    if (over) return;
    const rect = cv.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * W;
    const py = ((e.clientY - rect.top) / rect.height) * H;

    const hit = activeDiffs.find(d => !d.found && Math.hypot(px - d.x, py - d.y) <= d.r + 4);
    if (hit) {
      hit.found = true;
      if (hintSpotId === hit.id) hintSpotId = null;
      foundCnt++;
      cntEl.textContent = `${foundCnt}/5`;
      msgEl.textContent = `找对啦：「${hit.name}」不一样！（已找 ${foundCnt}/5）`;
      playBeatTone(780, 0.07);
      triggerHaptic('medium');
      redrawBoth();
      if (foundCnt >= 5) setTimeout(() => finishGame(false), 450);
    } else {
      timeLeft = Math.max(1, timeLeft - 2);
      timeEl.textContent = `${timeLeft}s`;
      msgEl.textContent = '这里两幅图是一样的，误点扣 2 秒！';
      playBeatTone(220, 0.07);
      triggerHaptic('light');
    }
  }

  topCv.addEventListener('pointerdown', e => handleCanvasTap(topCv, e));
  botCv.addEventListener('pointerdown', e => handleCanvasTap(botCv, e));
}
