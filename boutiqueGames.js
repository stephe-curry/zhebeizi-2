// 《这辈子 2.0》Sprint 4 —— 三款高重玩度独立标杆小游戏库：
// 1. 《魔性节拍大师》（第八套广播体操领操 / 极速节拍盲打）
// 2. 《火眼捉虫大作战》（考前五分钟查错卷 / 周末超市长小票核验）
// 3. 《时光画片·大家来找茬》（10 处动态细节池每局随机抽 5 处不同，上下双画布同步红圈标注）
// 严格遵循纯中文零表情符号规范。

import { pxIcon } from './icons.js?v=s70';
import { triggerHaptic } from './vfxAndUi.js?v=s70';
import { loadGymSprites } from './spriteLoader.js?v=s70';

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
// 1. 《领操台·魔性节拍大师 2.0》（真主角立绘分件体操动作 + 2K 左右双轨 + 长按滑条尾判 + 三档难度）
// ============================================================================
const RHYTHM_DIFFS = {
  easy: {
    id: 'easy', label: '简单 · 1.0x', dur: 28, mult: 1.0, speed: 158,
    holdProb: 0.22, doubleProb: 0.06, sScore: 260, aScore: 175, bScore: 95,
    intervals: [0.68, 0.68, 0.56, 0.68, 0.64, 0.56, 0.68, 0.76]
  },
  normal: {
    id: 'normal', label: '中等 · 1.4x', dur: 36, mult: 1.4, speed: 192,
    holdProb: 0.34, doubleProb: 0.14, sScore: 430, aScore: 290, bScore: 165,
    intervals: [0.52, 0.52, 0.38, 0.50, 0.52, 0.38, 0.38, 0.58]
  },
  hard: {
    id: 'hard', label: '困难 · 1.8x冲S', dur: 45, mult: 1.8, speed: 228,
    holdProb: 0.42, doubleProb: 0.22, sScore: 640, aScore: 440, bScore: 250,
    intervals: [0.40, 0.38, 0.28, 0.38, 0.42, 0.28, 0.28, 0.44]
  }
};

export function openRhythmMasterGame(container, state, opts = {}, onFinish) {
  const isChild = state.age <= 18;
  let curDiffKey = 'normal';
  let gymPack = null;
  let alive = true;
  let rafId = 0;

  // 载入第 1 阶段（6-12岁日常装）全局统一 6 帧标准像素体操动作：
  // [0:待机律动, 1:伸展运动, 2:扩胸运动, 3:跳跃运动, 4:弓步伸展, 5:同手同脚出糗]
  loadGymSprites(state.gender || 'male').then(pack => {
    gymPack = pack;
  }).catch(() => {});

  // 在 195x168 轻像素画布上绘制千禧年小学清晨操场 + 红砖教学楼 + 高音喇叭 + 水泥领操台 + 台下同学背影
  function drawPixelPlayground(bgCv, now) {
    const g = bgCv.getContext('2d');
    g.imageSmoothingEnabled = false;
    const W = bgCv.width, H = bgCv.height;
    const skyBands = [[0, 28, '#bfe3f7'], [28, 54, '#d4eefb'], [54, 78, '#eef7fc']];
    skyBands.forEach(([y0, y1, c]) => { g.fillStyle = c; g.fillRect(0, y0, W, y1 - y0); });

    const cloudShift = Math.round((now / 260) % 18);
    g.fillStyle = '#ffffff';
    [[20 + cloudShift * 0.3, 18, 28, 7], [26 + cloudShift * 0.3, 14, 16, 5], [138 - cloudShift * 0.25, 22, 32, 7], [144 - cloudShift * 0.25, 18, 18, 5]]
      .forEach(([x, y, w, h]) => g.fillRect(Math.round(x), y, w, h));

    // 远景红砖教学楼 + 校训红横幅
    g.fillStyle = '#4a3728'; g.fillRect(16, 42, 126, 36);
    g.fillStyle = '#ebd9be'; g.fillRect(18, 44, 122, 33);
    g.fillStyle = '#c9683a'; g.fillRect(14, 39, 130, 6);
    for (let x = 24; x <= 124; x += 18) {
      g.fillStyle = '#7da7c4'; g.fillRect(x, 53, 10, 11);
      g.fillStyle = '#4a3728'; g.fillRect(x, 52, 10, 1); g.fillRect(x, 64, 10, 1);
    }
    g.fillStyle = '#cf3f36'; g.fillRect(46, 46, 66, 5);
    g.fillStyle = '#fef08a';
    for (let x = 52; x <= 104; x += 8) g.fillRect(x, 48, 4, 2);

    // 绿树冠
    [[8, 66, 22, 16], [144, 62, 28, 18], [168, 66, 24, 15]].forEach(([x, y, w, h]) => {
      g.fillStyle = '#4a3728'; g.fillRect(x - 1, y - 1, w + 2, h + 2);
      g.fillStyle = '#6da35c'; g.fillRect(x, y, w, h);
      g.fillStyle = '#86bc73'; g.fillRect(x + 2, y + 2, w - 6, 5);
    });

    // 右侧高音大喇叭杆 + 随节拍闪烁的音波像素点
    g.fillStyle = '#4a3728'; g.fillRect(162, 26, 3, 56);
    g.fillStyle = '#e5e7eb'; g.fillRect(153, 27, 9, 7);
    g.fillStyle = '#4a3728'; g.fillRect(152, 26, 10, 1); g.fillRect(152, 34, 10, 1);
    if (Math.floor(now / 220) % 2 === 0) {
      g.fillStyle = '#f59e0b';
      g.fillRect(148, 28, 2, 2); g.fillRect(145, 25, 2, 2); g.fillRect(145, 33, 2, 2);
    }

    // 操场草边与沙土地纹
    g.fillStyle = '#7ab068'; g.fillRect(0, 77, W, 9);
    g.fillStyle = '#dfbe95'; g.fillRect(0, 86, W, H - 86);
    g.fillStyle = '#cfa97e';
    for (let y = 92; y < H; y += 14) g.fillRect(0, y, W, 2);

    // 水泥领操台（双层台阶 + 红白铁护栏）
    g.fillStyle = '#4a3728';
    g.fillRect(42, 108, 111, 2);
    for (let x = 44; x <= 150; x += 15) g.fillRect(x, 108, 2, 18);
    g.fillStyle = '#dc2626'; g.fillRect(44, 108, 36, 2); g.fillRect(116, 108, 36, 2);
    g.fillStyle = '#4a3728'; g.fillRect(36, 125, 123, 28);
    g.fillStyle = '#e7e2d8'; g.fillRect(38, 127, 119, 9);
    g.fillStyle = '#cbc3b5'; g.fillRect(38, 136, 119, 15);
    g.fillStyle = '#4a3728'; g.fillRect(68, 138, 59, 15);
    g.fillStyle = '#ded8cc'; g.fillRect(70, 140, 55, 5);
    g.fillStyle = '#bfb6a6'; g.fillRect(70, 145, 55, 7);

    // 领操台面主角脚底椭圆阴影
    g.fillStyle = 'rgba(58,40,24,0.28)';
    g.fillRect(82, 131, 31, 4);

    // 台下同班同学小背影（随广播节拍齐刷刷微弹）
    const bob = Math.round(Math.abs(Math.sin(now / 210)) * 2);
    [16, 42, 150, 176].forEach((kx, idx) => {
      const ky = 148 - bob;
      g.fillStyle = '#2d1e18'; g.fillRect(kx - 6, ky, 13, 11);
      g.fillStyle = '#422c23'; g.fillRect(kx - 5, ky + 1, 11, 9);
      g.fillStyle = '#4a3728'; g.fillRect(kx - 8, ky + 11, 17, 10);
      g.fillStyle = idx % 2 === 0 ? '#3b73b9' : '#e8eef5';
      g.fillRect(kx - 7, ky + 12, 15, 9);
    });
  }

  function mountWithDiff(diffKey) {
    if (rafId) cancelAnimationFrame(rafId);
    curDiffKey = diffKey;
    const cfg = RHYTHM_DIFFS[curDiffKey] || RHYTHM_DIFFS.normal;

    let score = 0;
    let combo = 0;
    let maxCombo = 0;
    let hitCount = 0;
    let totalJudged = 0;
    let timeLeft = cfg.dur;
    // 0:待机律动 1:伸展运动 2:扩胸运动 3:跳跃运动 4:弓步伸展(长按专属) 5:同手同脚出糗
    let poseIdx = 0;
    let poseTimer = 0;
    let notes = [];
    let nextNoteId = 1;
    let judgeBanner = null; // { txt, good, life }
    let spawnAcc = 0.35;
    let stepIdx = 0;
    let holdTickAcc = 0;
    const lanePointers = { 0: null, 1: null };
    const laneFlash = [0, 0];

    container.innerHTML = `
      <div class="rm3-screen">
        <div class="rm3-stage">
          <canvas class="rm3-bg-cv" id="rm-bg-cv" width="195" height="168"></canvas>
          <div class="rm3-aura" id="rm-aura"></div>
          <img class="rm3-hero-img" id="rm-hero-img" alt="" />
          <div class="rm3-top-hud">
            <span class="rm3-pill">广播体操 · <em>水泥领操台</em></span>
            <div class="rm3-diff-mini">
              ${[
                { id: 'easy', lb: '易' },
                { id: 'normal', lb: '中' },
                { id: 'hard', lb: '难' }
              ].map(d => `<button class="rm3-dp ${d.id === curDiffKey ? 'on' : ''}" data-diff="${d.id}">${d.lb}</button>`).join('')}
            </div>
            <button class="rm3-pill skip" id="rm-skip">跳过 ›</button>
          </div>
          <div class="rm3-pose-badge" id="rm-pose-badge">预备节 · 踏步律动</div>
        </div>

        <div class="rm3-highway">
          <div class="rm3-hw-top">
            <div class="rm3-combo-box"><span>节拍连击</span><b id="rm-combo">× 0</b></div>
            <div class="rm3-score-box">同步率 <b id="rm-sync">100%</b> · 得分 <b id="rm-score">0</b> · <span id="rm-time">${cfg.dur.toFixed(0)}s</span></div>
          </div>

          <div class="rm3-lanes-wrap" id="rm-lanes-wrap">
            <canvas id="rm-cv"></canvas>
          </div>

          <div class="rm3-pads">
            <button class="rm3-pad" id="rm-pad-0"><b>左拍 · 踏步</b><small>单击或长按左轨</small></button>
            <button class="rm3-pad" id="rm-pad-1"><b>右拍 · 伸展</b><small>单击或长按右轨</small></button>
          </div>
        </div>
      </div>
    `;

    const bgCv = container.querySelector('#rm-bg-cv');
    const auraEl = container.querySelector('#rm-aura');
    const heroEl = container.querySelector('#rm-hero-img');
    const badgeEl = container.querySelector('#rm-pose-badge');
    const lanesWrap = container.querySelector('#rm-lanes-wrap');
    const cv = container.querySelector('#rm-cv');
    const timeEl = container.querySelector('#rm-time');
    const cbEl = container.querySelector('#rm-combo');
    const scEl = container.querySelector('#rm-score');
    const syncEl = container.querySelector('#rm-sync');
    const pad0 = container.querySelector('#rm-pad-0');
    const pad1 = container.querySelector('#rm-pad-1');

    let LW = Math.max(300, lanesWrap.clientWidth || 358);
    let LH = Math.max(220, lanesWrap.clientHeight || 310);
    let ctx = setupHiDpi(cv, LW, LH);
    let HIT_Y = LH - 44;

    requestAnimationFrame(() => {
      if (!alive) return;
      const nw = lanesWrap.clientWidth, nh = lanesWrap.clientHeight;
      if (nw > 120 && nh > 120 && (nw !== LW || nh !== LH)) {
        LW = nw; LH = nh; HIT_Y = LH - 44;
        ctx = setupHiDpi(cv, LW, LH);
      }
    });

    container.querySelectorAll('[data-diff]').forEach(btn => {
      btn.onclick = () => {
        if (!alive) return;
        triggerHaptic('light');
        mountWithDiff(btn.dataset.diff);
      };
    });

    function finishGame(isAuto = false) {
      if (!alive) return;
      alive = false;
      cancelAnimationFrame(rafId);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      if (isAuto) {
        return onFinish({
          grade: 'B', score: 150, health: 1, mood: 2,
          note: isChild ? '跟着大部队做完广播体操（健康 +1，心态 +2）' : '顺畅完成律动卡点（心态 +2）'
        });
      }
      const finalScore = Math.round(score);
      const grade = finalScore >= cfg.sScore ? 'S' : finalScore >= cfg.aScore ? 'A' : finalScore >= cfg.bScore ? 'B' : 'C';
      const mult = cfg.mult;
      const healthGain = Math.max(1, Math.round((grade === 'S' ? 1.4 : 0.9) * (isChild ? mult : 1)));
      const moodGain = Math.round((grade === 'S' ? 3.2 : grade === 'A' ? 2.2 : 1.5) * mult);
      const statGain = grade === 'S' ? (curDiffKey === 'hard' ? 2 : curDiffKey === 'normal' ? 1 : 0) : 0;

      onFinish({
        grade,
        score: finalScore,
        health: Math.min(3, healthGain),
        mood: Math.min(7, moodGain),
        expr: isChild ? statGain : 0,
        pro: !isChild ? statGain : 0,
        fatigueDelta: grade === 'S' ? -2 : -1,
        hardSBonus: curDiffKey === 'hard' && grade === 'S',
        note: `【${cfg.label.split(' ')[0]}】最高 ${maxCombo} 连击，得分 ${finalScore}（${grade} 级）！`
      });
    }

    container.querySelector('#rm-skip').onclick = () => finishGame(true);

    const laneX = lane => (lane === 0 ? LW * 0.25 : LW * 0.75);

    function syncHud() {
      cbEl.textContent = `× ${combo}`;
      scEl.textContent = String(Math.round(score));
      const pct = totalJudged === 0 ? 100 : Math.max(50, Math.min(100, Math.round((hitCount / totalJudged) * 100)));
      syncEl.textContent = `${pct}%`;
    }

    function pressLane(lane) {
      if (!alive) return;
      laneFlash[lane] = 0.2;
      if (lane === 0) pad0.classList.add('active');
      if (lane === 1) pad1.classList.add('active');

      let best = null;
      let bestDist = 999;
      for (const n of notes) {
        if (n.lane !== lane || n.completed || n.missed || n.hitHead) continue;
        const d = Math.abs(n.y - HIT_Y);
        if (d < bestDist) { bestDist = d; best = n; }
      }

      if (best && bestDist <= 38) {
        const isPerf = bestDist <= 18;
        best.hitHead = true;
        combo++;
        hitCount++;
        totalJudged++;
        if (combo > maxCombo) maxCombo = combo;
        const basePts = (isPerf ? 26 : 16) + Math.min(10, Math.floor(combo / 4) * 2) + (best.gold ? 10 : 0);
        score += basePts;

        if (best.kind === 'hold') {
          best.holding = true;
          poseIdx = 4; // 第五节·弓步伸展定格
          poseTimer = 2.2;
          playBeatTone(isPerf ? 587 : 523, 0.14);
          judgeBanner = { lane, txt: `按住伸展 +${basePts}`, good: true, life: 0.65 };
        } else {
          best.completed = true;
          poseIdx = best.doubleTap ? 3 : (best.gold ? 3 : ((stepIdx + lane) % 2 === 0 ? 1 : 2));
          poseTimer = 0.46;
          playBeatTone(isPerf ? (best.gold ? 880 : 660) : 520, 0.07);
          judgeBanner = {
            lane,
            txt: best.doubleTap ? `双押暴击 +${basePts}` : (isPerf ? `完美卡点 +${basePts}` : `稳准 +${basePts}`),
            good: true,
            life: 0.68
          };
        }
        triggerHaptic(isPerf ? 'medium' : 'light');
      } else {
        combo = 0;
        totalJudged++;
        poseIdx = 5; // 同手同脚出糗
        poseTimer = 0.38;
        playBeatTone(210, 0.07);
        judgeBanner = { lane, txt: '同手同脚!', good: false, life: 0.55 };
      }
      syncHud();
    }

    function releaseLane(lane) {
      if (lane === 0) pad0.classList.remove('active');
      if (lane === 1) pad1.classList.remove('active');
      if (!alive) return;

      const holdingNote = notes.find(n => n.lane === lane && n.holding && !n.completed);
      if (!holdingNote) return;

      holdingNote.holding = false;
      const tailY = holdingNote.y - holdingNote.lenPx;
      const tailDist = Math.abs(tailY - HIT_Y);

      if (tailDist <= 42 || tailY >= HIT_Y - 14) {
        holdingNote.completed = true;
        combo++;
        hitCount++;
        totalJudged++;
        if (combo > maxCombo) maxCombo = combo;
        const tailPts = tailDist <= 20 ? 34 : 22;
        score += tailPts;
        poseIdx = 3;
        poseTimer = 0.42;
        playBeatTone(784, 0.09);
        triggerHaptic('medium');
        judgeBanner = { lane, txt: `完美收势 +${tailPts}`, good: true, life: 0.72 };
      } else {
        holdingNote.missed = true;
        combo = 0;
        totalJudged++;
        poseIdx = 5;
        poseTimer = 0.36;
        playBeatTone(220, 0.08);
        judgeBanner = { lane, txt: '早松断拍', good: false, life: 0.6 };
      }
      syncHud();
    }

    const bindPad = (el, lane) => {
      el.addEventListener('pointerdown', e => {
        e.preventDefault();
        el.setPointerCapture?.(e.pointerId);
        lanePointers[lane] = e.pointerId;
        pressLane(lane);
      });
      const up = e => {
        if (lanePointers[lane] === e.pointerId || lanePointers[lane] !== null) {
          lanePointers[lane] = null;
          releaseLane(lane);
        }
      };
      el.addEventListener('pointerup', up);
      el.addEventListener('pointercancel', up);
    };
    bindPad(pad0, 0);
    bindPad(pad1, 1);

    cv.addEventListener('pointerdown', e => {
      e.preventDefault();
      const rect = cv.getBoundingClientRect();
      const x = (e.clientX - rect.left) * (LW / Math.max(1, rect.width));
      const lane = x < LW / 2 ? 0 : 1;
      cv.setPointerCapture?.(e.pointerId);
      lanePointers[lane] = e.pointerId;
      pressLane(lane);
    });
    cv.addEventListener('pointerup', e => {
      for (const ln of [0, 1]) {
        if (lanePointers[ln] === e.pointerId) {
          lanePointers[ln] = null;
          releaseLane(ln);
        }
      }
    });

    const onKeyDown = e => {
      if (e.repeat) return;
      if (e.key === 'f' || e.key === 'F' || e.key === 'ArrowLeft') pressLane(0);
      if (e.key === 'j' || e.key === 'J' || e.key === 'ArrowRight') pressLane(1);
    };
    const onKeyUp = e => {
      if (e.key === 'f' || e.key === 'F' || e.key === 'ArrowLeft') releaseLane(0);
      if (e.key === 'j' || e.key === 'J' || e.key === 'ArrowRight') releaseLane(1);
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    function spawnNextPattern() {
      const iv = cfg.intervals[stepIdx % cfg.intervals.length];
      stepIdx++;
      const activeHoldLane = notes.find(n => !n.completed && !n.missed && n.kind === 'hold' && (n.y - n.lenPx) < 48)?.lane;
      if (activeHoldLane !== undefined) {
        const otherLane = activeHoldLane === 0 ? 1 : 0;
        notes.push({
          id: nextNoteId++, lane: otherLane, kind: 'tap',
          y: -16, lenPx: 0, gold: stepIdx % 4 === 0, doubleTap: false,
          hitHead: false, holding: false, completed: false, missed: false
        });
        return iv;
      }

      const r = Math.random();
      const lane = stepIdx % 2 === 0 ? 0 : 1;
      if (r < cfg.holdProb && timeLeft > 3.2) {
        const lenPx = Math.round(cfg.speed * (curDiffKey === 'easy' ? 0.62 : 0.78));
        notes.push({
          id: nextNoteId++, lane, kind: 'hold',
          y: -16, lenPx, gold: true, doubleTap: false,
          hitHead: false, holding: false, completed: false, missed: false
        });
        return iv + 0.18;
      }
      if (r < cfg.holdProb + cfg.doubleProb) {
        for (const ln of [0, 1]) {
          notes.push({
            id: nextNoteId++, lane: ln, kind: 'tap',
            y: -16, lenPx: 0, gold: true, doubleTap: true,
            hitHead: false, holding: false, completed: false, missed: false
          });
        }
        return iv + 0.08;
      }

      const pickLane = Math.random() < 0.35 ? (1 - lane) : lane;
      notes.push({
        id: nextNoteId++, lane: pickLane, kind: 'tap',
        y: -16, lenPx: 0, gold: stepIdx % 8 === 0, doubleTap: false,
        hitHead: false, holding: false, completed: false, missed: false
      });
      return iv;
    }

    const poseNames = {
      0: '预备节 · 踏步律动',
      1: '第一节 · 伸展运动',
      2: '第三节 · 扩胸运动',
      3: '第四节 · 跳跃运动',
      4: '第五节 · 弓步伸展',
      5: '抢拍 · 同手同脚!'
    };

    function updateStageHeroDom(now) {
      drawPixelPlayground(bgCv, now);
      const anyHolding = notes.some(n => n.holding);
      const curPose = anyHolding ? 4 : poseIdx;
      const bounce = curPose === 0 ? Math.round(Math.abs(Math.sin(now / 195)) * 3) : 0;
      const jumpLift = curPose === 3 ? 13 : (curPose === 1 ? 3 : 0);

      if (gymPack?.urls?.[curPose]) {
        if (heroEl.dataset.pose !== String(curPose)) {
          heroEl.src = gymPack.urls[curPose];
          heroEl.dataset.pose = String(curPose);
        }
        const spCv = gymPack.canvases[curPose];
        // 以基准站立高度 134px 推算各动作真实像素高，保证每帧头身大小完全一致
        const scale = 132 / (gymPack.baseHeight || 410);
        const dispH = Math.round(spCv.height * scale);
        heroEl.style.height = `${dispH}px`;
        heroEl.style.bottom = `${50 + bounce + jumpLift}px`;
      }
      badgeEl.textContent = poseNames[curPose] || '广播体操';
      badgeEl.classList.toggle('err', curPose === 5);
      auraEl.classList.toggle('hot', anyHolding || combo >= 4);
    }

    function drawRoundedBox(x, y, w, h, r, fill, stroke = '#4a3728', sw = 2) {
      ctx.beginPath();
      ctx.roundRect(x, y, w, h, r);
      if (fill) { ctx.fillStyle = fill; ctx.fill(); }
      if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = sw; ctx.stroke(); }
    }

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
      timeEl.textContent = `${Math.max(0, Math.ceil(timeLeft))}s`;

      if (poseTimer > 0) {
        poseTimer -= dt;
        if (poseTimer <= 0 && !notes.some(n => n.holding)) poseIdx = 0;
      }
      laneFlash[0] = Math.max(0, laneFlash[0] - dt);
      laneFlash[1] = Math.max(0, laneFlash[1] - dt);

      if (timeLeft > 1.3) {
        spawnAcc -= dt;
        if (spawnAcc <= 0) spawnAcc = spawnNextPattern();
      }

      let anyHoldingNow = false;
      for (const n of notes) {
        n.y += cfg.speed * dt;
        if (n.holding && !n.completed && !n.missed) {
          anyHoldingNow = true;
          const tailY = n.y - n.lenPx;
          if (tailY >= HIT_Y + 14) {
            n.holding = false;
            n.completed = true;
            combo++;
            hitCount++;
            totalJudged++;
            if (combo > maxCombo) maxCombo = combo;
            score += 32;
            playBeatTone(784, 0.08);
            judgeBanner = { lane: n.lane, txt: '满条收势 +32', good: true, life: 0.72 };
            syncHud();
          }
        }
        if (!n.hitHead && !n.missed && n.y > HIT_Y + 36) {
          n.missed = true;
          combo = 0;
          totalJudged++;
          poseIdx = 5;
          poseTimer = 0.36;
          judgeBanner = { lane: n.lane, txt: '漏拍断连', good: false, life: 0.55 };
          syncHud();
        }
      }

      if (anyHoldingNow) {
        holdTickAcc += dt;
        if (holdTickAcc >= 0.14) {
          holdTickAcc = 0;
          score += 5;
          syncHud();
        }
      } else {
        holdTickAcc = 0;
      }

      notes = notes.filter(n => !n.completed && !n.missed && (n.y - n.lenPx) < LH + 36);

      // 1. 刷新上半屏操场与全局统一主角帧
      updateStageHeroDom(now);

      // 2. 绘制下半屏暖白手账双轨音符道（100% 还原定稿参考图）
      ctx.fillStyle = '#faf3e4';
      ctx.fillRect(0, 0, LW, LH);

      // 手账横格纸细线
      ctx.strokeStyle = 'rgba(180, 156, 125, 0.22)';
      ctx.lineWidth = 1.2;
      for (let gy = 40; gy < LH; gy += 44) {
        ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(LW, gy); ctx.stroke();
      }
      // 中轴虚线分轨
      ctx.save();
      ctx.setLineDash([6, 5]);
      ctx.strokeStyle = '#d8c7ad';
      ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.moveTo(LW / 2, 0); ctx.lineTo(LW / 2, LH); ctx.stroke();
      ctx.restore();

      // 左右判定横线 + 圆角靶框
      for (const ln of [0, 1]) {
        const cx = laneX(ln);
        const x0 = ln === 0 ? 12 : LW / 2 + 12;
        const x1 = ln === 0 ? LW / 2 - 12 : LW - 12;
        ctx.strokeStyle = '#4a3728';
        ctx.lineWidth = 3.5;
        ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(x0, HIT_Y); ctx.lineTo(x1, HIT_Y); ctx.stroke();

        const isHeld = notes.some(n => n.lane === ln && n.holding);
        const lit = isHeld || laneFlash[ln] > 0;
        if (lit) {
          ctx.fillStyle = 'rgba(234, 179, 8, 0.28)';
          ctx.beginPath(); ctx.roundRect(cx - 33, HIT_Y - 23, 66, 46, 15); ctx.fill();
        }
        drawRoundedBox(cx - 28, HIT_Y - 19, 56, 38, 12, lit ? '#fde047' : 'rgba(255,253,249,0.95)', '#4a3728', 2.4);
        ctx.fillStyle = lit ? '#4a3728' : '#8a7562';
        ctx.font = '900 11px -apple-system, "PingFang SC", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(isHeld ? '按住中' : (lit ? '完美' : (ln === 0 ? '左轨' : '右轨')), cx, HIT_Y);
      }

      // 下落中的手账印章音符与斜纹黄金长条
      for (const n of notes) {
        if (n.completed || n.missed) continue;
        const cx = laneX(n.lane);
        const headY = n.holding ? HIT_Y : n.y;

        if (n.kind === 'hold') {
          const tailY = Math.max(-24, n.y - n.lenPx);
          const barH = Math.max(8, headY - tailY);
          ctx.save();
          drawRoundedBox(cx - 17, tailY, 34, barH, 10, '#facc15', '#4a3728', 2);
          ctx.clip();
          ctx.fillStyle = '#fde047';
          for (let sy = tailY - 20; sy < headY + 20; sy += 14) {
            ctx.beginPath();
            ctx.moveTo(cx - 22, sy);
            ctx.lineTo(cx + 22, sy - 14);
            ctx.lineTo(cx + 22, sy - 7);
            ctx.lineTo(cx - 22, sy + 7);
            ctx.closePath();
            ctx.fill();
          }
          ctx.restore();
          ctx.strokeStyle = '#4a3728';
          ctx.lineWidth = 2;
          ctx.beginPath(); ctx.roundRect(cx - 17, tailY, 34, barH, 10); ctx.stroke();

          // 尾端「松手」印章块
          drawRoundedBox(cx - 27, tailY - 14, 54, 30, 10, '#4a3728', null, 0);
          drawRoundedBox(cx - 27, tailY - 17, 54, 30, 10, '#facc15', '#4a3728', 2);
          ctx.fillStyle = '#4a3728';
          ctx.font = '900 11.5px -apple-system, "PingFang SC", sans-serif';
          ctx.fillText('松手', cx, tailY - 2);
        }

        // 头部圆角印章音符（带立体深棕底边）
        const fillCol = n.gold ? '#facc15' : '#c9683a';
        const txtCol = n.gold ? '#4a3728' : '#ffffff';
        const label = n.kind === 'hold' ? '按住' : (n.doubleTap ? '双押' : (n.gold ? '重拍' : (n.lane === 0 ? '左拍' : '右拍')));
        drawRoundedBox(cx - 27, headY - 14, 54, 34, 11, '#4a3728', null, 0);
        drawRoundedBox(cx - 27, headY - 17, 54, 34, 11, fillCol, '#4a3728', 2);
        ctx.fillStyle = txtCol;
        ctx.font = '900 12px -apple-system, "PingFang SC", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, cx, headY);
      }

      // 判定胶囊飘标
      if (judgeBanner && judgeBanner.life > 0) {
        judgeBanner.life -= dt;
        const jx = laneX(judgeBanner.lane);
        const jy = HIT_Y - 46;
        const bw = Math.max(92, judgeBanner.txt.length * 13 + 18);
        drawRoundedBox(jx - bw / 2, jy - 10, bw, 24, 12, '#4a3728', null, 0);
        drawRoundedBox(jx - bw / 2, jy - 12, bw, 24, 12, judgeBanner.good ? '#c9683a' : '#b91c1c', '#4a3728', 1.8);
        ctx.fillStyle = '#ffffff';
        ctx.font = '900 11.5px -apple-system, "PingFang SC", sans-serif';
        ctx.fillText(judgeBanner.txt, jx, jy);
      }

      rafId = requestAnimationFrame(loop);
    }
    rafId = requestAnimationFrame(loop);
  }

  mountWithDiff('normal');
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
    const score = Math.round(found * 85 + (found === 3 ? timeLeft * 4 : 0) - mistakes * 20);
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
    const score = Math.round(foundCnt * 48 + (foundCnt === 5 ? timeLeft * 4 : 0));
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
