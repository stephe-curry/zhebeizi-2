// 《这辈子 2.0》Sprint 4 —— 三款高重玩度独立标杆小游戏库：
// 1. 《魔性节拍大师》（第八套广播体操领操 / 极速节拍盲打）
// 2. 《火眼捉虫大作战》（考前五分钟查错卷 / 周末超市长小票核验）
// 3. 《时光画片·大家来找茬》（10 处动态细节池每局随机抽 5 处不同，上下双画布同步红圈标注）
// 严格遵循纯中文零表情符号规范。

import { pxIcon } from './icons.js?v=s51';
import { triggerHaptic } from './vfxAndUi.js?v=s51';
import { loadCharacterSprites } from './spriteLoader.js?v=s51';
import { getSubStageIndex } from './engine.js?v=s51';

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
  const W = 346, H = 304;
  const isChild = state.age <= 18;
  const titleText = isChild ? '魔性节拍大师 · 大课间领操台' : '魔性节拍大师 · 律动舞台';
  let curDiffKey = 'normal';
  let heroImg = null;
  let heroHeadBox = null;
  let alive = true;
  let rafId = 0;

  // 异步载入玩家当前真实性别与年龄段的去底主角立绘（精准扫描真实非透明像素边界，提取完整发型+五官笑脸！）
  const stageIdx = getSubStageIndex(state.age);
  loadCharacterSprites(state.gender || 'male').then(list => {
    const src = list?.[stageIdx];
    if (src) {
      const im = new Image();
      im.onload = () => {
        heroImg = im;
        try {
          const oc = document.createElement('canvas');
          oc.width = im.width; oc.height = im.height;
          const octx = oc.getContext('2d');
          octx.drawImage(im, 0, 0);
          const d = octx.getImageData(0, 0, im.width, im.height).data;
          let topY = im.height, botY = 0;
          for (let y = 0; y < im.height; y++) {
            for (let x = 0; x < im.width; x++) {
              if (d[(y * im.width + x) * 4 + 3] > 30) {
                if (y < topY) topY = y;
                if (y > botY) botY = y;
              }
            }
          }
          if (botY > topY + 12) {
            const charH = botY - topY + 1;
            const headRatio = state.age <= 12 ? 0.44 : (state.age <= 18 ? 0.36 : 0.30);
            const hEnd = Math.min(im.height, Math.round(topY + charH * headRatio));
            let lx = im.width, rx = 0;
            for (let y = topY; y < hEnd; y++) {
              for (let x = 0; x < im.width; x++) {
                if (d[(y * im.width + x) * 4 + 3] > 30) {
                  if (x < lx) lx = x;
                  if (x > rx) rx = x;
                }
              }
            }
            if (rx > lx + 6) {
              const pad = 2;
              const sx = Math.max(0, lx - pad);
              const sy = Math.max(0, topY - pad);
              const sw = Math.min(im.width - sx, rx - lx + 1 + pad * 2);
              const sh = Math.min(im.height - sy, hEnd - sy);
              heroHeadBox = { sx, sy, sw, sh };
            }
          }
        } catch (_) {}
      };
      im.src = src;
    }
  }).catch(() => {});

  function mountWithDiff(diffKey) {
    if (rafId) cancelAnimationFrame(rafId);
    curDiffKey = diffKey;
    const cfg = RHYTHM_DIFFS[curDiffKey] || RHYTHM_DIFFS.normal;

    let score = 0;
    let combo = 0;
    let maxCombo = 0;
    let timeLeft = cfg.dur;
    // 0:预备踏步 1:V字高举伸展 2:扩胸平展 3:活力高踢腿 5:弓步伸展定格(长按专属!) -1:抢拍同手同脚出糗
    let poseIdx = 0;
    let poseTimer = 0;
    let notes = []; // { id, lane: 0|1, kind: 'tap'|'hold', y, lenPx, gold, hitHead, holding, completed, missed }
    let nextNoteId = 1;
    let pops = [];
    let spawnAcc = 0.35;
    let stepIdx = 0;
    let holdTickAcc = 0;
    const lanePointers = { 0: null, 1: null };
    const laneFlash = [0, 0];

    container.innerHTML = `
      <div class="rm2-box">
        <div class="rm2-header">
          <div class="rm2-title-row">
            <h3>${titleText}</h3>
            <button class="btn ghost rm2-skip" id="rm-skip">一键保底</button>
          </div>
          <div class="rm2-diff-row">
            ${Object.values(RHYTHM_DIFFS).map(d => `
              <button class="rm2-diff-pill ${d.id === curDiffKey ? 'active' : ''}" data-diff="${d.id}">
                [${d.label}${d.id === curDiffKey ? ' (当前)' : ''}]
              </button>
            `).join('')}
          </div>
          <div class="rm2-hud-row">
            <span>剩余 <b id="rm-time">${cfg.dur.toFixed(1)}s</b></span>
            <span>·</span>
            <span>连击 <b id="rm-combo">0</b></span>
            <span>·</span>
            <span>得分 <b id="rm-score">0</b> <small>(${cfg.sScore}评S)</small></span>
          </div>
        </div>

        <div class="rm2-canvas-wrap">
          <canvas id="rm-cv"></canvas>
        </div>

        <div class="rm2-pad-bar">
          <button class="rm2-pad left" id="rm-pad-0">左手拍（单点 / 按住长条）</button>
          <button class="rm2-pad right" id="rm-pad-1">右手拍（单点 / 按住长条）</button>
        </div>
      </div>
    `;

    const cv = container.querySelector('#rm-cv');
    const ctx = setupHiDpi(cv, W, H);
    const timeEl = container.querySelector('#rm-time');
    const cbEl = container.querySelector('#rm-combo');
    const scEl = container.querySelector('#rm-score');
    const pad0 = container.querySelector('#rm-pad-0');
    const pad1 = container.querySelector('#rm-pad-1');

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

    // 2K 透视双轨坐标换算（上窄下宽立体音游跑道）
    const STAGE_BOTTOM = 152;
    const HIT_Y = 272;
    const laneXAtY = (lane, y) => {
      const t = Math.max(0, Math.min(1.12, (y - STAGE_BOTTOM) / (HIT_Y - STAGE_BOTTOM)));
      const center = W / 2;
      const halfSpan = 34 + t * 52;
      return lane === 0 ? center - halfSpan : center + halfSpan;
    };

    function syncHud() {
      cbEl.textContent = String(combo);
      scEl.textContent = String(Math.round(score));
    }

    function pressLane(lane) {
      if (!alive) return;
      laneFlash[lane] = 0.18;
      pad0.classList.toggle('pressed', lane === 0 ? true : pad0.classList.contains('pressed'));
      if (lane === 1) pad1.classList.add('pressed');

      let best = null;
      let bestDist = 999;
      for (const n of notes) {
        if (n.lane !== lane || n.completed || n.missed || n.hitHead) continue;
        const d = Math.abs(n.y - HIT_Y);
        if (d < bestDist) { bestDist = d; best = n; }
      }

      if (best && bestDist <= 34) {
        const isPerf = bestDist <= 16;
        best.hitHead = true;
        combo++;
        if (combo > maxCombo) maxCombo = combo;
        const basePts = (isPerf ? 26 : 16) + Math.min(10, Math.floor(combo / 4) * 2) + (best.gold ? 10 : 0);
        score += basePts;

        if (best.kind === 'hold') {
          best.holding = true;
          poseIdx = 5; // 弓步伸展持续定格！
          poseTimer = 2.0;
          playBeatTone(isPerf ? 587 : 523, 0.14);
          pops.push({ x: laneXAtY(lane, HIT_Y - 26), y: HIT_Y - 30, txt: `按住长条 +${basePts}`, col: '#fde047', life: 0.7 });
        } else {
          best.completed = true;
          poseIdx = best.gold ? 3 : ((stepIdx + lane) % 3) + 1;
          poseTimer = 0.42;
          playBeatTone(isPerf ? (best.gold ? 880 : 660) : 520, 0.07);
          pops.push({
            x: laneXAtY(lane, HIT_Y - 26), y: HIT_Y - 30,
            txt: isPerf ? `完美 +${basePts}` : `稳准 +${basePts}`,
            col: isPerf ? '#fde047' : '#86efac',
            life: 0.72
          });
        }
        triggerHaptic(isPerf ? 'medium' : 'light');
      } else {
        combo = 0;
        poseIdx = -1;
        poseTimer = 0.34;
        playBeatTone(210, 0.07);
        pops.push({ x: laneXAtY(lane, HIT_Y - 24), y: HIT_Y - 28, txt: '抢拍出糗', col: '#fca5a5', life: 0.58 });
      }
      syncHud();
    }

    function releaseLane(lane) {
      if (lane === 0) pad0.classList.remove('pressed');
      if (lane === 1) pad1.classList.remove('pressed');
      if (!alive) return;

      const holdingNote = notes.find(n => n.lane === lane && n.holding && !n.completed);
      if (!holdingNote) return;

      holdingNote.holding = false;
      const tailY = holdingNote.y - holdingNote.lenPx;
      const tailDist = Math.abs(tailY - HIT_Y);

      if (tailDist <= 38 || tailY >= HIT_Y - 12) {
        holdingNote.completed = true;
        combo++;
        if (combo > maxCombo) maxCombo = combo;
        const tailPts = tailDist <= 18 ? 34 : 22;
        score += tailPts;
        poseIdx = 3;
        poseTimer = 0.38;
        playBeatTone(784, 0.09);
        triggerHaptic('medium');
        pops.push({ x: laneXAtY(lane, HIT_Y - 28), y: HIT_Y - 32, txt: `完美松手 +${tailPts}`, col: '#fde047', life: 0.78 });
      } else {
        // 提前太多松手：断条！
        holdingNote.missed = true;
        combo = 0;
        poseIdx = -1;
        poseTimer = 0.34;
        playBeatTone(220, 0.08);
        pops.push({ x: laneXAtY(lane, HIT_Y - 26), y: HIT_Y - 28, txt: '早松断拍', col: '#fca5a5', life: 0.65 });
      }
      syncHud();
    }

    // 多点触控绑定：底部左右双键 + 画布下半区左右车道直点全支持！
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
      const x = (e.clientX - rect.left) * (W / Math.max(1, rect.width));
      const lane = x < W / 2 ? 0 : 1;
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
      const activeHoldLane = notes.find(n => !n.completed && !n.missed && n.kind === 'hold' && (n.y - n.lenPx) < STAGE_BOTTOM + 45)?.lane;

      // 若某侧有一条尚未走完的长条，则只在另一侧出单点音符，实现正统 2K「左手长按 + 右手单点」！
      if (activeHoldLane !== undefined) {
        const otherLane = activeHoldLane === 0 ? 1 : 0;
        notes.push({
          id: nextNoteId++, lane: otherLane, kind: 'tap',
          y: STAGE_BOTTOM + 4, lenPx: 0, gold: stepIdx % 4 === 0,
          hitHead: false, holding: false, completed: false, missed: false
        });
        return iv;
      }

      const r = Math.random();
      const lane = stepIdx % 2 === 0 ? 0 : 1;
      if (r < cfg.holdProb && timeLeft > 3.2) {
        const lenPx = Math.round(cfg.speed * (curDiffKey === 'easy' ? 0.58 : 0.72));
        notes.push({
          id: nextNoteId++, lane, kind: 'hold',
          y: STAGE_BOTTOM + 4, lenPx, gold: true,
          hitHead: false, holding: false, completed: false, missed: false
        });
        return iv + 0.18;
      }
      if (r < cfg.holdProb + cfg.doubleProb) {
        // 双押重拍！
        for (const ln of [0, 1]) {
          notes.push({
            id: nextNoteId++, lane: ln, kind: 'tap',
            y: STAGE_BOTTOM + 4, lenPx: 0, gold: true,
            hitHead: false, holding: false, completed: false, missed: false
          });
        }
        return iv + 0.08;
      }

      const pickLane = Math.random() < 0.35 ? (1 - lane) : lane;
      notes.push({
        id: nextNoteId++, lane: pickLane, kind: 'tap',
        y: STAGE_BOTTOM + 4, lenPx: 0, gold: stepIdx % 8 === 0,
        hitHead: false, holding: false, completed: false, missed: false
      });
      return iv;
    }

    // 绘制站在水泥领操台上的真实主角立绘（真实提取头部发型 + 多关节像素服装四肢体操动作帧！）
    function drawProtagonistOnPodium(now) {
      const cx = W / 2, footY = 123;
      const anyHolding = notes.some(n => n.holding);
      const curPose = anyHolding ? 5 : poseIdx;
      const beatBounce = Math.abs(Math.sin(now / 190)) * 2.5;
      const jumpLift = curPose === 3 ? 11 : (curPose === 1 ? 4 : 0);

      // 长按或高连击时的金色律动音波光环（还原参考图！）
      if (anyHolding || combo >= 8) {
        ctx.save();
        const pulseR = 38 + Math.sin(now / 120) * 4;
        ctx.strokeStyle = 'rgba(253, 224, 71, 0.78)';
        ctx.lineWidth = 2.6;
        ctx.beginPath(); ctx.arc(cx, footY - 34, pulseR, 0, Math.PI * 2); ctx.stroke();
        ctx.fillStyle = 'rgba(253, 224, 71, 0.15)';
        ctx.fill();
        ctx.beginPath(); ctx.ellipse(cx, footY + 1, 36, 7, 0, 0, Math.PI * 2); ctx.stroke();
        ctx.restore();
      }

      // 脚底阴影
      ctx.fillStyle = 'rgba(40, 28, 18, 0.28)';
      ctx.beginPath(); ctx.ellipse(cx, footY + 2, curPose === 5 ? 30 : 20, 5, 0, 0, Math.PI * 2); ctx.fill();

      ctx.save();
      ctx.translate(cx, footY - jumpLift - (curPose === 0 ? beatBounce : 0));
      if (curPose === -1) ctx.rotate(0.15);

      const isFemale = state.gender === 'female';
      const skin = '#fde0c4';
      const outline = '#3f2a1d';
      const pantsCol = isChild ? (isFemale ? '#e06c88' : '#3b6ca8') : '#334155';
      const shirtBase = isChild ? (isFemale ? '#f472b6' : '#d9534f') : '#f8fafc';

      // 1. 双腿动作分帧（含「弓步伸展」大跨步！）
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      const drawLeg = (hipX, kneeX, kneeY, ankX, ankY) => {
        ctx.strokeStyle = outline;
        ctx.lineWidth = 8.5;
        ctx.beginPath(); ctx.moveTo(hipX, -22); ctx.lineTo(kneeX, kneeY); ctx.lineTo(ankX, ankY); ctx.stroke();
        ctx.strokeStyle = skin;
        ctx.lineWidth = 5.2;
        ctx.beginPath(); ctx.moveTo(hipX, -22); ctx.lineTo(kneeX, kneeY); ctx.lineTo(ankX, ankY); ctx.stroke();
        // 短裤裤管
        ctx.strokeStyle = pantsCol;
        ctx.lineWidth = 8.5;
        ctx.beginPath(); ctx.moveTo(hipX, -22); ctx.lineTo((hipX + kneeX) * 0.55, (kneeY - 22) * 0.55); ctx.stroke();
        // 白色运动球鞋
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = outline;
        ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.roundRect(ankX - 6, ankY - 3, 12, 6, 2.5); ctx.fill(); ctx.stroke();
      };

      if (curPose === 5) {
        // 标准「弓步伸展」大跨步定格！
        drawLeg(-6, -18, -11, -18, 0);
        drawLeg(6, 17, -10, 27, 0);
      } else if (curPose === 3) {
        // 活力侧高踢腿
        drawLeg(-5, -8, -11, -9, 0);
        drawLeg(5, 18, -17, 29, -14);
      } else if (curPose === 2) {
        // 开立扩胸步
        drawLeg(-6, -12, -11, -15, 0);
        drawLeg(6, 12, -11, 15, 0);
      } else {
        drawLeg(-5, -6, -11, -7, 0);
        drawLeg(5, 6, -11, 7, 0);
      }

      // 2. 躯干服装（还原主角标志性红白横条纹衫 / 学院衫 / 职场衬衫）
      ctx.fillStyle = shirtBase;
      ctx.strokeStyle = outline;
      ctx.lineWidth = 1.9;
      ctx.beginPath();
      ctx.roundRect(-11, -46, 22, 25, 4);
      ctx.fill();
      if (isChild && !isFemale) {
        ctx.save();
        ctx.clip();
        ctx.fillStyle = '#fff8ee';
        for (let sy = -42; sy < -22; sy += 6) ctx.fillRect(-12, sy, 24, 3);
        ctx.restore();
      }
      ctx.strokeRect(-11, -46, 22, 25);

      // 短裤腰部连接
      ctx.fillStyle = pantsCol;
      ctx.fillRect(-10, -25, 20, 7);
      ctx.strokeRect(-10, -25, 20, 7);

      // 3. 双臂体操动作分帧
      const drawArm = (shX, elX, elY, hdX, hdY) => {
        ctx.strokeStyle = outline;
        ctx.lineWidth = 7.2;
        ctx.beginPath(); ctx.moveTo(shX, -42); ctx.lineTo(elX, elY); ctx.lineTo(hdX, hdY); ctx.stroke();
        ctx.strokeStyle = skin;
        ctx.lineWidth = 4.4;
        ctx.beginPath(); ctx.moveTo(shX, -42); ctx.lineTo(elX, elY); ctx.lineTo(hdX, hdY); ctx.stroke();
        // 短袖袖口
        ctx.strokeStyle = shirtBase;
        ctx.lineWidth = 7.6;
        ctx.beginPath(); ctx.moveTo(shX, -42); ctx.lineTo((shX + elX) * 0.55, (-42 + elY) * 0.55); ctx.stroke();
      };

      if (curPose === 5) {
        // 弓步平展双臂（180度水平舒展！）
        drawArm(-11, -23, -43, -36, -43);
        drawArm(11, 23, -43, 36, -43);
      } else if (curPose === 1) {
        // 第一节：高举 V 字伸展运动
        drawArm(-11, -20, -54, -27, -66);
        drawArm(11, 20, -54, 27, -66);
      } else if (curPose === 2) {
        // 第二节：屈肘扩胸运动
        drawArm(-11, -25, -40, -18, -35);
        drawArm(11, 25, -40, 18, -35);
      } else if (curPose === 3) {
        // 跳跃欢呼挥臂
        drawArm(-11, -22, -34, -26, -26);
        drawArm(11, 22, -55, 30, -65);
      } else if (curPose === -1) {
        // 抢拍同手同脚慌乱
        drawArm(-11, -20, -30, -15, -22);
        drawArm(11, 18, -50, 12, -58);
      } else {
        const sw = Math.sin(now / 190) * 5;
        drawArm(-11, -17, -34, -19, -25 + sw);
        drawArm(11, 17, -34, 19, -25 - sw);
      }

      // 4. 头部：精准贴合玩家真实主角立绘的头部与发型五官（非透明像素框自动对齐脖领！）
      if (heroImg && heroHeadBox) {
        const drawW = 31;
        const drawH = Math.round((heroHeadBox.sh / heroHeadBox.sw) * drawW);
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(
          heroImg,
          heroHeadBox.sx, heroHeadBox.sy, heroHeadBox.sw, heroHeadBox.sh,
          -drawW / 2, -45 - drawH + 4, drawW, drawH
        );
      } else {
        ctx.fillStyle = skin;
        ctx.strokeStyle = outline;
        ctx.lineWidth = 1.9;
        ctx.beginPath(); ctx.arc(0, -57, 12.5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#3b2618';
        ctx.beginPath(); ctx.arc(0, -60, 13, Math.PI * 0.92, Math.PI * 2.08); ctx.fill();
        ctx.fillRect(-5, -57, 2.5, 2.5);
        ctx.fillRect(3, -57, 2.5, 2.5);
      }

      // 漏拍出糗汗珠 / 动作招式名称小标
      if (curPose === -1) {
        ctx.fillStyle = '#60a5fa';
        ctx.beginPath(); ctx.ellipse(15, -62, 2.5, 4.5, 0.2, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();

      const poseLabels = { 1: '伸展运动', 2: '扩胸运动', 3: '跳跃运动', 5: '弓步伸展', '-1': '同手同脚!' };
      if (poseLabels[curPose]) {
        ctx.fillStyle = curPose === -1 ? '#b91c1c' : '#4a3222';
        ctx.font = 'bold 10.5px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(poseLabels[curPose], cx + 40, footY - 30);
      }
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
      timeEl.textContent = `${Math.max(0, timeLeft).toFixed(1)}s`;

      if (poseTimer > 0) {
        poseTimer -= dt;
        if (poseTimer <= 0 && !notes.some(n => n.holding)) poseIdx = 0;
      }
      laneFlash[0] = Math.max(0, laneFlash[0] - dt);
      laneFlash[1] = Math.max(0, laneFlash[1] - dt);

      if (timeLeft > 1.3) {
        spawnAcc -= dt;
        if (spawnAcc <= 0) {
          spawnAcc = spawnNextPattern();
        }
      }

      // 推进音符下落 & 处理长按持续跳分
      let anyHoldingNow = false;
      for (const n of notes) {
        n.y += cfg.speed * dt;
        if (n.holding && !n.completed && !n.missed) {
          anyHoldingNow = true;
          const tailY = n.y - n.lenPx;
          if (tailY >= HIT_Y + 14) {
            // 按到尾端自动满额收尾，手感宽容爽快！
            n.holding = false;
            n.completed = true;
            combo++;
            if (combo > maxCombo) maxCombo = combo;
            score += 32;
            playBeatTone(784, 0.08);
            pops.push({ x: laneXAtY(n.lane, HIT_Y - 26), y: HIT_Y - 30, txt: '满条收势 +32', col: '#fde047', life: 0.72 });
            syncHud();
          }
        }
        // 漏拍判定
        if (!n.hitHead && !n.missed && n.y > HIT_Y + 34) {
          n.missed = true;
          combo = 0;
          poseIdx = -1;
          poseTimer = 0.32;
          pops.push({ x: laneXAtY(n.lane, HIT_Y - 22), y: HIT_Y - 26, txt: '漏拍', col: '#fca5a5', life: 0.55 });
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

      notes = notes.filter(n => !n.completed && !n.missed && (n.y - n.lenPx) < H + 30);

      // ========== 1. 绘制上半屏：阳光操场 +「发展体育运动」红横幅 + 水泥领操台 ==========
      ctx.fillStyle = isChild ? '#d8eef5' : '#25213b';
      ctx.fillRect(0, 0, W, STAGE_BOTTOM);

      if (isChild) {
        // 绿茵操场与白色跑道线
        ctx.fillStyle = '#bfd89b';
        ctx.fillRect(0, 62, W, 68);
        ctx.strokeStyle = 'rgba(255,255,255,0.65)';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(20, 88); ctx.lineTo(W - 20, 88);
        ctx.moveTo(78, 62); ctx.lineTo(36, 128);
        ctx.moveTo(W - 78, 62); ctx.lineTo(W - 36, 128);
        ctx.stroke();

        // 铁杆与红色校运横幅「发展体育运动」
        ctx.fillStyle = '#94a3b8';
        ctx.fillRect(26, 6, 4, 120);
        ctx.fillRect(W - 30, 6, 4, 120);

        ctx.fillStyle = '#c83e32';
        ctx.strokeStyle = '#4a251c';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.roundRect(34, 8, W - 68, 30, 3);
        ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#fef3c7';
        ctx.font = 'bold 16px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('发 展 体 育 运 动', W / 2, 29);
      } else {
        // 成年霓虹聚光舞台
        ctx.fillStyle = 'rgba(253, 224, 71, 0.14)';
        ctx.beginPath();
        ctx.moveTo(W / 2 - 28, 0); ctx.lineTo(W / 2 + 28, 0);
        ctx.lineTo(W / 2 + 110, STAGE_BOTTOM); ctx.lineTo(W / 2 - 110, STAGE_BOTTOM);
        ctx.fill();
      }

      // 立体透视水泥领操台
      ctx.fillStyle = '#b8b5ad';
      ctx.strokeStyle = '#4a3d33';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(74, 108); ctx.lineTo(W - 74, 108);
      ctx.lineTo(W - 52, 126); ctx.lineTo(52, 126);
      ctx.closePath();
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#8d8980';
      ctx.fillRect(52, 126, W - 104, 24);
      ctx.strokeRect(52, 126, W - 104, 24);

      // 站在领操台中央的真实主角形象
      drawProtagonistOnPodium(now);

      // 领操台下前景两侧跟随鼓点齐刷刷举手的同学剪影
      const crowdBob = Math.sin(now / 190) * 3;
      ctx.fillStyle = '#6f4e37';
      for (const cxPos of [28, 66, 102, W - 102, W - 66, W - 28]) {
        ctx.beginPath();
        ctx.arc(cxPos, 138 + crowdBob, 11, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillRect(cxPos - 12, 146 + crowdBob, 24, 14);
        // 举起的小手臂
        ctx.lineWidth = 4.5;
        ctx.strokeStyle = '#6f4e37';
        ctx.beginPath();
        ctx.moveTo(cxPos + 8, 148 + crowdBob);
        ctx.lineTo(cxPos + 13, 128 + crowdBob);
        ctx.stroke();
      }

      // ========== 2. 绘制下半屏：经典 2K 立体透视双轨音符跑道 ==========
      ctx.fillStyle = '#f5ebd6';
      ctx.fillRect(0, STAGE_BOTTOM, W, H - STAGE_BOTTOM);

      // 透视跑道面板与木纹护栏
      ctx.fillStyle = '#fffdf8';
      ctx.strokeStyle = '#5c3d24';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(W / 2 - 74, STAGE_BOTTOM);
      ctx.lineTo(W / 2 + 74, STAGE_BOTTOM);
      ctx.lineTo(W / 2 + 154, H);
      ctx.lineTo(W / 2 - 154, H);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // 中轴分轨线
      ctx.strokeStyle = '#d6c7b2';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(W / 2, STAGE_BOTTOM);
      ctx.lineTo(W / 2, H);
      ctx.stroke();

      ctx.fillStyle = '#6b5344';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('左轨', 14, STAGE_BOTTOM + 24);
      ctx.textAlign = 'right';
      ctx.fillText('右轨', W - 14, STAGE_BOTTOM + 24);

      // 底部左右双判定圆靶台
      for (const ln of [0, 1]) {
        const hx = laneXAtY(ln, HIT_Y);
        const isHeld = notes.some(n => n.lane === ln && n.holding);
        ctx.save();
        ctx.translate(hx, HIT_Y);
        // 底座深棕垫
        ctx.fillStyle = '#4a3222';
        ctx.beginPath(); ctx.ellipse(0, 4, 31, 16, 0, 0, Math.PI * 2); ctx.fill();
        // 靶面
        ctx.fillStyle = (isHeld || laneFlash[ln] > 0) ? '#fde047' : '#f7efe0';
        ctx.strokeStyle = '#4a3222';
        ctx.lineWidth = 2.2;
        ctx.beginPath(); ctx.ellipse(0, 0, 29, 14.5, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();

        if (isHeld) {
          // 长按持续爆裂星芒特效！
          ctx.strokeStyle = '#f59e0b';
          ctx.lineWidth = 2.4;
          for (let k = 0; k < 8; k++) {
            const a = (Math.PI * 2 * k) / 8 + now / 160;
            ctx.beginPath();
            ctx.moveTo(Math.cos(a) * 20, Math.sin(a) * 10);
            ctx.lineTo(Math.cos(a) * 38, Math.sin(a) * 20);
            ctx.stroke();
          }
        }
        ctx.restore();
      }

      // 绘制下落中的单点圆饼音符与发光长按滑条音符
      for (const n of notes) {
        if (n.completed || n.missed) continue;
        const headY = n.holding ? HIT_Y : n.y;
        const scaleH = 0.62 + 0.38 * Math.max(0, (headY - STAGE_BOTTOM) / (HIT_Y - STAGE_BOTTOM));
        const headX = laneXAtY(n.lane, headY);

        if (n.kind === 'hold') {
          const tailY = Math.max(STAGE_BOTTOM, n.y - n.lenPx);
          const tailX = laneXAtY(n.lane, tailY);
          const scaleT = 0.62 + 0.38 * Math.max(0, (tailY - STAGE_BOTTOM) / (HIT_Y - STAGE_BOTTOM));
          const wHead = 20 * scaleH;
          const wTail = 20 * scaleT;

          // 琥珀流光长按光带主体
          const ribGrad = ctx.createLinearGradient(0, tailY, 0, headY);
          ribGrad.addColorStop(0, 'rgba(251, 191, 36, 0.78)');
          ribGrad.addColorStop(1, 'rgba(245, 158, 11, 0.96)');
          ctx.fillStyle = ribGrad;
          ctx.strokeStyle = '#92400e';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(tailX - wTail, tailY);
          ctx.lineTo(tailX + wTail, tailY);
          ctx.lineTo(headX + wHead, headY);
          ctx.lineTo(headX - wHead, headY);
          ctx.closePath();
          ctx.fill(); ctx.stroke();

          // 中芯高光条
          ctx.strokeStyle = '#fef9c3';
          ctx.lineWidth = 4;
          ctx.beginPath(); ctx.moveTo(tailX, tailY); ctx.lineTo(headX, headY); ctx.stroke();

          // 尾端松手节点圆环 + 提示小签
          ctx.fillStyle = '#fde047';
          ctx.strokeStyle = '#78350f';
          ctx.lineWidth = 2;
          ctx.beginPath(); ctx.ellipse(tailX, tailY, wTail, wTail * 0.5, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
          if (tailY > STAGE_BOTTOM + 12 && tailY < HIT_Y - 22) {
            ctx.fillStyle = '#78350f';
            ctx.font = 'bold 9.5px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('尾端松手', tailX, tailY - 9);
          }
        }

        // 头部圆盘音符
        const rDisc = 21 * scaleH;
        ctx.fillStyle = n.gold ? '#f59e0b' : '#fffdf5';
        ctx.strokeStyle = '#4a3222';
        ctx.lineWidth = 2.1;
        ctx.beginPath();
        ctx.ellipse(headX, headY, rDisc, rDisc * 0.52, 0, 0, Math.PI * 2);
        ctx.fill(); ctx.stroke();
        ctx.fillStyle = n.gold ? '#fef08a' : '#e7dcc8';
        ctx.beginPath();
        ctx.ellipse(headX, headY - 1.5, rDisc * 0.55, rDisc * 0.26, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      // 命中飘字反馈
      pops = pops.filter(p => p.life > 0);
      for (const p of pops) {
        p.life -= dt * 1.35;
        p.y -= dt * 22;
        ctx.save();
        ctx.globalAlpha = Math.min(1, p.life * 1.5);
        ctx.font = 'bold 13px sans-serif';
        ctx.textAlign = 'center';
        ctx.lineWidth = 3;
        ctx.strokeStyle = '#3b2312';
        ctx.strokeText(p.txt, p.x, p.y);
        ctx.fillStyle = p.col;
        ctx.fillText(p.txt, p.x, p.y);
        ctx.restore();
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
