// 《这辈子 2.0》Sprint 3 —— 6 款 30 秒单指街机/反应/消除新小游戏库 + 街角游艺厅总览
// 全部采用原生 Canvas / 轻像素手绘矢量渲染，0 外部图片体积，支持移动端单指按住/划屏/连点与一键保底结算。
// 严格遵循纯中文零系统表情符号规范。

import { pxIcon } from './icons.js?v=s31';
import { triggerHaptic } from './vfxAndUi.js?v=s31';

export function rollStageArcadeMoment(state, draftIds = []) {
  if (!Array.isArray(state.seenArcadeMoments)) state.seenArcadeMoments = [];
  const seen = state.seenArcadeMoments;
  const mpSubTurns = state.age >= 19 && state.age <= 59 ? 4 : 3;

  const candidates = [
    {
      id: 'sa_ring_7',
      cond: state.age >= 7 && state.age <= 10 && state.subTurn >= 2,
      badge: '童年街角 · 自动奇遇',
      title: '校门口支起了套圈摊',
      summary: '傍晚放学出校门，卖糖葫芦旁边新铺开一张帆布垫，汽水、玻璃弹珠罐，还有一只拧紧发条会蹦跶的绿铁皮青蛙摆在最后一排。摊主晃着一把竹圈招呼你试试手气。',
      gameId: 'ring_toss',
      playLabel: '走上前试手气（5 枚竹圈套大奖与铁皮青蛙信物）',
      passLabel: '摸摸口袋先背书包回家吃饭（心态 +2）',
      passEff: { mood: 2 }
    },
    {
      id: 'sa_flip_9',
      cond: state.age >= 9 && state.age <= 12 && state.subTurn >= 1,
      badge: '小学课间 · 自动奇遇',
      title: '课桌底下的望风翻牌',
      summary: '下课铃刚响，同桌小周朝走廊窗户瞄了一眼，把九张盖着的卡片在课桌肚里一字排开：“我帮你盯着班主任，敢不敢翻几张见好就收？”',
      gameId: 'flip_card',
      playLabel: '趁课间翻几张（同桌望风避巡逻赢零花）',
      passLabel: '摆摆手坐好预习下一节课（学识 +1，心态 +1）',
      passEff: { knowledge: 1, mood: 1 }
    },
    {
      id: 'sa_link_11',
      cond: state.age >= 11 && state.age <= 14 && state.subTurn >= 1,
      badge: '千禧小卖部 · 自动奇遇',
      title: '小卖部刚拆开一整箱新货',
      summary: '校门口小卖部刚到了一箱干脆面、四驱车零件、老磁带和花色弹珠。老板笑呵呵喊你搭把手把同款理到一起，理完不仅给零花还送水浒卡。',
      gameId: 'nostalgia_link',
      playLabel: '上手怀旧连连看（全盘清空赠未拥有水浒卡）',
      passLabel: '挑瓶冰汽水边喝边回家（心态 +2）',
      passEff: { mood: 2 }
    },
    {
      id: 'sa_dash_14',
      cond: state.age >= 14 && state.age <= 17 && state.subTurn >= 1,
      badge: '中学午休 · 自动奇遇',
      title: '下课铃响 · 狂奔冲向食堂窗口',
      summary: '第四节课老师刚合上教案喊下课，整层走廊瞬间沸腾！今天食堂一楼窗口有刚出锅的糖醋排骨，去晚两分钟就只剩青菜底了！',
      gameId: 'bell_dash',
      playLabel: '撒腿三道冲食堂（变道跨栏抢排骨 · 健康 +2）',
      passLabel: '慢步走过去随便吃点（健康 +1，心态 +1）',
      passEff: { health: 1, mood: 1 }
    },
    {
      id: `sa_packet_${state.age}`,
      cond: [16, 26, 38, 56].includes(state.age) && state.subTurn === mpSubTurns,
      badge: '除夕守岁 · 阶段限定',
      title: '除夕零点 · 家族群红包雨刷屏了',
      summary: '窗外鞭炮声刚响，家族微信群突然一秒刷出十几条消息——长辈们的拼手气大红包接连落下，中间还夹杂着亲戚们猝不及防的盘问气泡！',
      gameId: 'red_packet_rain',
      playLabel: '眼疾手快开抢红包雨（躲开亲戚盘问赢彩头）',
      passLabel: '发句拜年吉祥话领个保底红包（心态 +2，现金 +100）',
      passEff: { mood: 2, cash: 100 }
    },
    {
      id: 'sa_slice_work',
      cond: state.age >= 23 && state.age <= 34 && (draftIds.includes('overtime') || draftIds.includes('work_main') || state.age >= 25),
      badge: '职场日常 · 自动奇遇',
      title: '周五傍晚五点半 · 急件需求大爆炸',
      summary: '眼看还有半小时就能准点下班过周末，工作群里突然同时飞来改八版方案、急件表格，还有一口试图甩给你的大黑锅！',
      gameId: 'work_slice',
      playLabel: '挥刀切碎急件抢「准点下班券」（当场减疲劳）',
      passLabel: '深呼吸按部就班慢慢清完（心态 +2）',
      passEff: { mood: 2 }
    },
    {
      id: 'sa_fish_46',
      cond: state.age >= 46 && state.age <= 52 && state.subTurn >= 2,
      badge: '中年闲暇 · 自动奇遇',
      title: '公园湖畔柳荫下的空钓位',
      summary: '忙了大半辈子，周末清早散步经过公园湖边，柳荫下正好空出个背风的好钓位。旁边老钓友递来一根备用手竿：“坐会儿？今天水底有大锦鲤。”',
      gameId: 'lake_fishing',
      playLabel: '接过鱼竿静候黑漂（溜大锦鲤赢老怀表信物）',
      passLabel: '坐在湖边长椅吹吹晨风（健康 +1，心态 +2）',
      passEff: { health: 1, mood: 2 }
    },
    {
      id: 'sa_chess_60',
      cond: state.age >= 60 && state.age <= 65,
      badge: '退休岁月 · 自动奇遇',
      title: '公园石桌旁的人情残局',
      summary: '退休后的清晨不用再赶早高峰，公园紫藤架下的石桌围了一圈老街坊。老友指着棋盘上的五子残局招呼你：“来来，这步棋你来破！”',
      gameId: 'gomoku',
      playLabel: '坐下执黑破残局（可绝杀赢面子，也可卖破绽换人情）',
      passLabel: '捧着保温杯在旁边笑看对弈（心态 +2）',
      passEff: { mood: 2 }
    }
  ];

  for (const item of candidates) {
    if (item.cond && !seen.includes(item.id)) {
      seen.push(item.id);
      return item;
    }
  }
  return null;
}

function setupHiDpiCanvas(canvas, w, h) {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  canvas.style.width = `${w}px`;
  canvas.style.height = `${h}px`;
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return ctx;
}

function drawRoundedRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// ============================================================================
// 1. 校门口套圈儿（按住蓄力抛物线 · 5 个竹圈套三排奖品与发条铁皮青蛙信物）
// ============================================================================
export function openRingTossGame(container, state, opts = {}, onFinish) {
  const W = 342, H = 228;
  let ringsLeft = 5;
  let score = 0;
  let cashWon = 0;
  let moodWon = 2;
  let knowWon = 0;
  let gotFrogKeepsake = false;
  let charging = false;
  let power = 0.18;
  let powerDir = 1;
  let aimAngle = 0; // -0.52 ~ +0.52 rad
  let aimTime = 0;
  let flyingRing = null;
  let popTexts = [];
  let alive = true;
  let rafId = 0;

  const prizes = [
    { id: 'soda', name: '橘子汽水', short: '汽水', row: 1, baseX: 74, y: 152, r: 22, pts: 35, cash: 25, color: '#f59e0b', caught: false },
    { id: 'spicy', name: '卫龙辣条', short: '辣条', row: 1, baseX: 171, y: 152, r: 22, pts: 40, cash: 30, color: '#ef4444', caught: false },
    { id: 'sticker', name: '贴纸画册', short: '贴纸册', row: 1, baseX: 268, y: 152, r: 22, pts: 35, cash: 25, color: '#ec4899', caught: false },
    { id: 'marble', name: '玻璃弹珠罐', short: '弹珠罐', row: 2, baseX: 116, y: 106, r: 19, pts: 70, cash: 45, mood: 2, color: '#3b82f6', caught: false },
    { id: 'cart', name: '红白机卡带', short: '游戏卡', row: 2, baseX: 226, y: 106, r: 19, pts: 80, cash: 50, know: 1, color: '#8b5cf6', caught: false },
    { id: 'dino', name: '霸王龙模型', short: '霸王龙', row: 3, baseX: 108, y: 62, r: 18, pts: 120, cash: 110, mood: 2, color: '#d97706', sway: 18, phase: 0.4, caught: false },
    { id: 'frog', name: '发条铁皮青蛙', short: '铁皮蛙', row: 3, baseX: 234, y: 62, r: 18, pts: 150, cash: 80, mood: 3, keepsake: true, color: '#16a34a', sway: 22, phase: 2.1, caught: false }
  ];

  container.innerHTML = `
    <div class="mg-box arc-box">
      <div class="mg-head">
        <h3 style="display:flex;align-items:center;gap:6px;">${pxIcon('ring', 16)} 校门口套圈儿</h3>
        <button class="btn ghost" id="arc-skip">一键保底</button>
      </div>
      <div class="arc-hud">
        <span>剩余竹圈：<b id="rt-rings">5</b>/5</span>
        <span>得分：<b id="rt-score">0</b>（190分评 S）</span>
      </div>
      <div class="arc-canvas-wrap">
        <canvas id="rt-cv"></canvas>
      </div>
      <button class="btn primary arc-hold-btn" id="rt-hold">按住蓄力瞄准 · 松手抛出竹圈</button>
    </div>
  `;

  const cv = container.querySelector('#rt-cv');
  const ctx = setupHiDpiCanvas(cv, W, H);
  const ringsEl = container.querySelector('#rt-rings');
  const scoreEl = container.querySelector('#rt-score');
  const holdBtn = container.querySelector('#rt-hold');

  function cleanup() {
    alive = false;
    if (rafId) cancelAnimationFrame(rafId);
  }

  function finishGame(isAuto = false) {
    cleanup();
    if (isAuto) {
      return onFinish({
        grade: 'B', score: 85, cash: 35, mood: 2, know: 0,
        note: '自动套中两瓶汽水，开开心心回家（心态 +2）'
      });
    }
    const grade = (score >= 190 || (gotFrogKeepsake && score >= 150)) ? 'S'
      : score >= 115 ? 'A'
      : score >= 50 ? 'B' : 'C';
    onFinish({
      grade,
      score,
      cash: cashWon,
      mood: moodWon + (grade === 'S' ? 3 : grade === 'A' ? 2 : 0),
      know: knowWon,
      keepsake: gotFrogKeepsake ? {
        name: '发条铁皮青蛙',
        story: '校门口地摊最后一圈稳稳套中的绿铁皮青蛙，拧紧发条还能在书桌上蹦跶三下。',
        buff: '珍藏多宝格：童年手作记忆，每次休息心态更踏实'
      } : null,
      note: gotFrogKeepsake
        ? `神准套中后排大奖「发条铁皮青蛙」（${grade} 级 · ${score} 分）！`
        : `套圈收摊得分 ${score}（${grade} 级），收获满满！`
    });
  }

  container.querySelector('#arc-skip').onclick = () => finishGame(true);

  function getLandingPos(ang, pwr) {
    const startX = W / 2;
    const startY = H - 18;
    const dist = 52 + pwr * 146;
    return {
      x: Math.max(26, Math.min(W - 26, startX + Math.sin(ang) * dist * 0.85)),
      y: Math.max(38, Math.min(H - 42, startY - Math.cos(ang) * dist))
    };
  }

  function startCharge(e) {
    if (e) e.preventDefault();
    if (!alive || flyingRing || ringsLeft <= 0) return;
    charging = true;
    power = 0.16;
    powerDir = 1;
    triggerHaptic('light');
  }

  function releaseThrow(e) {
    if (e) e.preventDefault();
    if (!charging || flyingRing || ringsLeft <= 0) return;
    charging = false;
    ringsLeft--;
    ringsEl.textContent = String(ringsLeft);
    const target = getLandingPos(aimAngle, power);
    flyingRing = {
      sx: W / 2, sy: H - 16,
      tx: target.x, ty: target.y,
      t: 0
    };
    triggerHaptic('medium');
    if (ringsLeft === 0) holdBtn.disabled = true;
  }

  holdBtn.addEventListener('pointerdown', startCharge);
  cv.addEventListener('pointerdown', startCharge);
  window.addEventListener('pointerup', releaseThrow);

  let lastTs = performance.now();
  function loop(now) {
    if (!alive) {
      window.removeEventListener('pointerup', releaseThrow);
      return;
    }
    const dt = Math.min(0.05, (now - lastTs) / 1000);
    lastTs = now;
    aimTime += dt;

    for (const p of prizes) {
      p.x = p.sway ? p.baseX + Math.sin(aimTime * 1.9 + p.phase) * p.sway : p.baseX;
    }

    if (!flyingRing && ringsLeft > 0) {
      if (!charging) {
        aimAngle = Math.sin(aimTime * 2.3) * 0.48;
      } else {
        aimAngle = Math.sin(aimTime * 0.85) * 0.48;
        power += powerDir * dt * 1.18;
        if (power >= 1) { power = 1; powerDir = -1; }
        if (power <= 0.12) { power = 0.12; powerDir = 1; }
      }
    }

    if (flyingRing) {
      flyingRing.t += dt * 2.15;
      if (flyingRing.t >= 1) {
        const lx = flyingRing.tx, ly = flyingRing.ty;
        flyingRing = null;
        let hit = null;
        for (const p of prizes) {
          if (p.caught) continue;
          const d = Math.hypot(lx - p.x, ly - p.y);
          if (d <= p.r + 7) { hit = p; break; }
        }
        if (hit) {
          hit.caught = true;
          score += hit.pts;
          cashWon += hit.cash || 0;
          moodWon += hit.mood || 0;
          knowWon += hit.know || 0;
          if (hit.keepsake) gotFrogKeepsake = true;
          scoreEl.textContent = String(score);
          triggerHaptic('heavy');
          popTexts.push({ x: lx, y: ly - 8, txt: `套中${hit.name} +${hit.pts}`, col: '#fef08a', life: 1.0 });
        } else {
          popTexts.push({ x: lx, y: ly - 6, txt: '差一点点', col: '#e5e7eb', life: 0.75 });
        }
        if (ringsLeft <= 0) {
          setTimeout(() => { if (alive) finishGame(false); }, 680);
        }
      }
    }

    // 绘制暖色夜市地摊背景
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, '#3b2820');
    grad.addColorStop(0.24, '#5b3e2e');
    grad.addColorStop(1, '#cfa97e');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // 地摊红白格帆布垫
    ctx.fillStyle = '#efe2cc';
    ctx.beginPath();
    ctx.moveTo(34, 42); ctx.lineTo(W - 34, 42);
    ctx.lineTo(W - 10, H - 30); ctx.lineTo(10, H - 30);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#4a3728';
    ctx.lineWidth = 2;
    ctx.stroke();

    // 顶部暖黄小串灯
    for (let i = 0; i < 7; i++) {
      const bx = 32 + i * 41;
      const by = 16 + Math.sin(i * 0.9) * 4;
      ctx.fillStyle = i % 2 === 0 ? '#fde68a' : '#fca5a5';
      ctx.beginPath(); ctx.arc(bx, by, 4, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = '#fff7ed';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('后排移动大奖：发条铁皮青蛙（套中入藏多宝格）', W / 2, 34);

    // 绘制三排奖品底座与名字
    for (const p of prizes) {
      ctx.save();
      ctx.globalAlpha = p.caught ? 0.25 : 1;
      ctx.fillStyle = 'rgba(74,55,40,0.2)';
      ctx.beginPath();
      ctx.ellipse(p.x, p.y + 8, p.r, p.r * 0.48, 0, 0, Math.PI * 2);
      ctx.fill();

      const bw = Math.max(42, p.r * 2.0);
      const bh = p.r * 1.32;
      drawRoundedRect(ctx, p.x - bw / 2, p.y - bh * 0.65, bw, bh, 6);
      ctx.fillStyle = p.color;
      ctx.fill();
      ctx.strokeStyle = '#4a3728';
      ctx.lineWidth = 1.8;
      ctx.stroke();

      ctx.fillStyle = '#fffdf9';
      ctx.font = 'bold 9.5px sans-serif';
      ctx.fillText(p.short || p.name.slice(0, 3), p.x, p.y - 1);
      ctx.fillStyle = '#4a3728';
      ctx.font = 'bold 9px sans-serif';
      ctx.fillText(p.caught ? '已套中' : `+${p.pts}`, p.x, p.y + 19);
      ctx.restore();
    }

    // 瞄准虚线与蓄力落点预览圈
    if (!flyingRing && ringsLeft > 0) {
      const preview = getLandingPos(aimAngle, charging ? power : 0.42);
      ctx.save();
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = charging ? '#c9683a' : 'rgba(74,55,40,0.45)';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(W / 2, H - 16);
      ctx.lineTo(preview.x, preview.y);
      ctx.stroke();
      ctx.setLineDash([]);

      if (charging) {
        ctx.strokeStyle = '#d97706';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.ellipse(preview.x, preview.y, 20, 11, 0, 0, Math.PI * 2);
        ctx.stroke();

        // 左侧力度蓄力槽
        drawRoundedRect(ctx, 12, 54, 10, 110, 5);
        ctx.fillStyle = 'rgba(255,255,255,0.75)';
        ctx.fill();
        const fh = Math.round(106 * power);
        drawRoundedRect(ctx, 14, 56 + (106 - fh), 6, fh, 3);
        ctx.fillStyle = '#ea580c';
        ctx.fill();
      }

      // 手中待抛竹圈
      ctx.strokeStyle = '#b45309';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.ellipse(W / 2, H - 15, 22, 9, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // 飞行中的抛物线竹圈
    if (flyingRing) {
      const t = flyingRing.t;
      const cx = flyingRing.sx + (flyingRing.tx - flyingRing.sx) * t;
      const arcLift = Math.sin(t * Math.PI) * 68;
      const cy = flyingRing.sy + (flyingRing.ty - flyingRing.sy) * t - arcLift;
      const rx = 23 - t * 4;
      const ry = 10 + Math.sin(t * Math.PI) * 4;
      ctx.strokeStyle = '#d97706';
      ctx.lineWidth = 3.6;
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    // 飘字反馈
    popTexts = popTexts.filter(pt => pt.life > 0);
    for (const pt of popTexts) {
      pt.life -= dt * 1.25;
      pt.y -= dt * 22;
      ctx.save();
      ctx.globalAlpha = Math.max(0, pt.life);
      ctx.font = 'bold 12px sans-serif';
      ctx.strokeStyle = '#4a3728';
      ctx.lineWidth = 3;
      ctx.strokeText(pt.txt, pt.x, pt.y);
      ctx.fillStyle = pt.col;
      ctx.fillText(pt.txt, pt.x, pt.y);
      ctx.restore();
    }

    rafId = requestAnimationFrame(loop);
  }
  rafId = requestAnimationFrame(loop);
}

// ============================================================================
// 2. 千禧小卖部·怀旧连连看（6×4 经典不超两折连线消除 + 连击倍率 + 洗牌）
// ============================================================================
export function openNostalgiaLinkGame(container, state, opts = {}, onFinish) {
  const ROWS = 4, COLS = 6;
  const dreamMode = opts.climaxDreamId || opts.qualifierDreamId || null;
  const titleText = dreamMode === 'd_singer'
    ? (opts.qualifierDreamId ? '千人巡演排练 · 耳返与和弦共鸣' : '万人体育馆 · 全场旋律安可连线')
    : dreamMode === 'd_tsinghua'
      ? (opts.qualifierDreamId ? '高三统测 / 初试 · 压轴六题眼破题' : '燕园清华园 · 终极综合推导连线')
      : '千禧小卖部 · 怀旧连连看';

  const TILE_TYPES = dreamMode === 'd_singer' ? [
    { id: 't1', name: '主歌弦', ico: 'guitar', bg: '#ffedd5' },
    { id: 't2', name: '副歌带', ico: 'tape', bg: '#fce7f3' },
    { id: 't3', name: '耳返拍', ico: 'radio', bg: '#e0f2fe' },
    { id: 't4', name: '鼓律动', ico: 'bell', bg: '#fef3c7' },
    { id: 't5', name: '灯海光', ico: 'bulb', bg: '#fef9c3' },
    { id: 't6', name: '大合唱', ico: 'heart', bg: '#ffe4e6' }
  ] : dreamMode === 'd_tsinghua' ? [
    { id: 't1', name: '辅助线', ico: 'study', bg: '#dbeafe' },
    { id: 't2', name: '导数极', ico: 'bulb', bg: '#fef3c7' },
    { id: 't3', name: '动量守', ico: 'sprint', bg: '#dcfce7' },
    { id: 't4', name: '电磁轨', ico: 'spark', bg: '#f3e8ff' },
    { id: 't5', name: '归纳证', ico: 'tutor', bg: '#e0f2fe' },
    { id: 't6', name: '压轴解', ico: 'trophy', bg: '#fef9c3' }
  ] : [
    { id: 't1', name: '干脆面', ico: 'snack', bg: '#ffedd5' },
    { id: 't2', name: '悠悠球', ico: 'yoyo', bg: '#fee2e2' },
    { id: 't3', name: '四驱车', ico: 'car4wd', bg: '#dbeafe' },
    { id: 't4', name: '玻璃珠', ico: 'marble', bg: '#e0f2fe' },
    { id: 't5', name: '老磁带', ico: 'tape', bg: '#f3e8ff' },
    { id: 't6', name: '掌机', ico: 'gamepad', bg: '#dcfce7' }
  ];

  // 24 格 = 每种 4 张（2 对）
  const pool = [];
  for (const tp of TILE_TYPES) {
    pool.push(tp, tp, tp, tp);
  }
  pool.sort(() => Math.random() - 0.5);

  // 虚拟网格 (ROWS+2) × (COLS+2)，四周留空一圈支持外围连线
  const board = Array.from({ length: ROWS + 2 }, () => Array(COLS + 2).fill(null));
  let idx = 0;
  for (let r = 1; r <= ROWS; r++) {
    for (let c = 1; c <= COLS; c++) {
      board[r][c] = pool[idx++];
    }
  }

  let selected = null;
  let pairsLeft = (ROWS * COLS) / 2;
  let score = 0;
  let combo = 0;
  let lastMatchAt = 0;
  let shufflesLeft = 1;
  let timeLeft = 28;
  let over = false;
  let flashPath = null;

  function isClearLine(r1, c1, r2, c2) {
    if (r1 === r2) {
      const minC = Math.min(c1, c2), maxC = Math.max(c1, c2);
      for (let c = minC + 1; c < maxC; c++) if (board[r1][c]) return false;
      return true;
    }
    if (c1 === c2) {
      const minR = Math.min(r1, r2), maxR = Math.max(r1, r2);
      for (let r = minR + 1; r < maxR; r++) if (board[r][c1]) return false;
      return true;
    }
    return false;
  }

  // 查找 <=2 个拐点的连通折线路径
  function findLinkPath(r1, c1, r2, c2) {
    if (r1 === r2 && c1 === c2) return null;
    if (isClearLine(r1, c1, r2, c2)) return [[r1, c1], [r2, c2]];
    // 单拐点
    if (!board[r1][c2] && isClearLine(r1, c1, r1, c2) && isClearLine(r1, c2, r2, c2)) {
      return [[r1, c1], [r1, c2], [r2, c2]];
    }
    if (!board[r2][c1] && isClearLine(r1, c1, r2, c1) && isClearLine(r2, c1, r2, c2)) {
      return [[r1, c1], [r2, c1], [r2, c2]];
    }
    // 双拐点（扫描行与列）
    for (let r = 0; r <= ROWS + 1; r++) {
      if (r === r1 || r === r2) continue;
      if (!board[r][c1] && !board[r][c2] && isClearLine(r1, c1, r, c1) && isClearLine(r, c1, r, c2) && isClearLine(r, c2, r2, c2)) {
        return [[r1, c1], [r, c1], [r, c2], [r2, c2]];
      }
    }
    for (let c = 0; c <= COLS + 1; c++) {
      if (c === c1 || c === c2) continue;
      if (!board[r1][c] && !board[r2][c] && isClearLine(r1, c1, r1, c) && isClearLine(r1, c, r2, c) && isClearLine(r2, c, r2, c2)) {
        return [[r1, c1], [r1, c], [r2, c], [r2, c2]];
      }
    }
    return null;
  }

  const timer = setInterval(() => {
    if (over) return;
    timeLeft--;
    const tEl = container.querySelector('#llk-time');
    if (tEl) tEl.textContent = `${timeLeft}s`;
    if (timeLeft <= 0) finishGame(false);
  }, 1000);

  function finishGame(isAuto = false) {
    if (over) return;
    over = true;
    clearInterval(timer);
    if (isAuto) {
      return onFinish({
        grade: 'B', score: 120, cash: 30, mood: 2, know: 1,
        note: '自动整理完货架零食（心态 +2，学识 +1）'
      });
    }
    if (pairsLeft === 0) score += timeLeft * 6;
    const grade = (pairsLeft === 0 && score >= 240) ? 'S'
      : (pairsLeft <= 2 || score >= 170) ? 'A'
      : score >= 90 ? 'B' : 'C';
    onFinish({
      grade,
      score,
      clearedAll: pairsLeft === 0,
      cash: state.age <= 18 ? (grade === 'S' ? 65 : 35) : (grade === 'S' ? 220 : 100),
      mood: grade === 'S' ? 4 : grade === 'A' ? 3 : 2,
      know: grade === 'S' || grade === 'A' ? 1 : 0,
      bonusSnackCard: pairsLeft === 0 && state.age <= 18,
      note: pairsLeft === 0
        ? `眼疾手快全盘清空（${grade} 级 · ${score} 分）！`
        : `连连看消除得分 ${score}（${grade} 级）！`
    });
  }

  function shuffleBoard() {
    if (shufflesLeft <= 0 || over) return;
    shufflesLeft--;
    selected = null;
    const rem = [];
    for (let r = 1; r <= ROWS; r++) {
      for (let c = 1; c <= COLS; c++) {
        if (board[r][c]) rem.push(board[r][c]);
      }
    }
    rem.sort(() => Math.random() - 0.5);
    let k = 0;
    for (let r = 1; r <= ROWS; r++) {
      for (let c = 1; c <= COLS; c++) {
        if (board[r][c]) board[r][c] = rem[k++];
      }
    }
    triggerHaptic('light');
    render();
  }

  function render() {
    let svgOverlay = '';
    if (flashPath) {
      const pts = flashPath.map(([r, c]) => {
        const x = ((c - 0.5) / (COLS + 1)) * 100;
        const y = ((r - 0.5) / (ROWS + 1)) * 100;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      }).join(' ');
      svgOverlay = `<svg class="llk-svg" viewBox="0 0 100 100" preserveAspectRatio="none"><polyline points="${pts}" fill="none" stroke="#f59e0b" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
    }

    container.innerHTML = `
      <div class="mg-box arc-box">
        <div class="mg-head">
          <h3 style="display:flex;align-items:center;gap:6px;">${pxIcon('snack', 16)} ${titleText}</h3>
          <button class="btn ghost" id="arc-skip">一键保底</button>
        </div>
        <div class="arc-hud">
          <span>倒计时：<b id="llk-time">${timeLeft}s</b></span>
          <span>连击：<b>${combo > 1 ? `×${combo}` : '-'}</b></span>
          <span>得分：<b>${score}</b></span>
        </div>
        <div class="llk-stage">
          ${svgOverlay}
          <div class="llk-grid">
            ${Array.from({ length: ROWS }, (_, ri) => {
              const r = ri + 1;
              return Array.from({ length: COLS }, (__, ci) => {
                const c = ci + 1;
                const cell = board[r][c];
                const isSel = selected && selected[0] === r && selected[1] === c;
                if (!cell) return `<div class="llk-cell empty"></div>`;
                return `
                  <button class="llk-cell ${isSel ? 'sel' : ''}" style="--cell-bg:${cell.bg};" data-r="${r}" data-c="${c}">
                    ${pxIcon(cell.ico, 20)}
                    <span>${cell.name}</span>
                  </button>
                `;
              }).join('');
            }).join('')}
          </div>
        </div>
        <div class="mg-actions" style="display:flex;gap:8px;">
          <button class="btn secondary" id="llk-shuf" style="flex:1;" ${shufflesLeft <= 0 ? 'disabled' : ''}>洗牌重排（剩 ${shufflesLeft} 次）</button>
        </div>
      </div>
    `;

    container.querySelector('#arc-skip').onclick = () => finishGame(true);
    container.querySelector('#llk-shuf').onclick = shuffleBoard;
    container.querySelectorAll('.llk-cell[data-r]').forEach(btn => {
      btn.onclick = () => {
        if (over) return;
        const r = Number(btn.dataset.r), c = Number(btn.dataset.c);
        if (!board[r][c]) return;
        if (!selected) {
          selected = [r, c];
          triggerHaptic('light');
          render();
          return;
        }
        const [sr, sc] = selected;
        if (sr === r && sc === c) {
          selected = null;
          render();
          return;
        }
        if (board[sr][sc]?.id === board[r][c]?.id) {
          const path = findLinkPath(sr, sc, r, c);
          if (path) {
            const now = Date.now();
            combo = (now - lastMatchAt <= 2600) ? combo + 1 : 1;
            lastMatchAt = now;
            score += 20 + Math.min(4, combo - 1) * 8;
            board[sr][sc] = null;
            board[r][c] = null;
            selected = null;
            pairsLeft--;
            flashPath = path;
            triggerHaptic('medium');
            render();
            setTimeout(() => {
              flashPath = null;
              if (pairsLeft <= 0) finishGame(false);
              else if (!over) render();
            }, 180);
            return;
          }
        }
        selected = [r, c];
        triggerHaptic('light');
        render();
      };
    });
  }
  render();
}

// ============================================================================
// 3. 下课铃狂奔·三道跑酷（单指变道 + 跨栏飞跃 + 4 秒冲刺连点，兼容跨栏决赛！）
// ============================================================================
export function openBellDashGame(container, state, opts = {}, onFinish) {
  const W = 342, H = 228;
  const isHurdleClimax = opts.climaxDreamId === 'd_hurdle' || opts.qualifierDreamId === 'd_hurdle';
  const titleText = opts.climaxDreamId === 'd_hurdle'
    ? '大赛十栏决赛 · 冲线决胜'
    : opts.qualifierDreamId === 'd_hurdle'
      ? '省田径锦标赛 · 十栏达标选拔'
      : '下课铃狂奔 · 三道冲食堂';

  let lane = 1; // 0, 1, 2
  let jumpT = 0; // >0 腾空中
  let score = 0;
  let hurdlesCleared = 0;
  let timeLeft = 20;
  let speed = 175;
  let spawnTimer = 0.4;
  let obstacles = [];
  let pops = [];
  let alive = true;
  let rafId = 0;
  let touchStartX = null;

  container.innerHTML = `
    <div class="mg-box arc-box">
      <div class="mg-head">
        <h3 style="display:flex;align-items:center;gap:6px;">${pxIcon('sprint', 16)} ${titleText}</h3>
        <button class="btn ghost" id="arc-skip">一键保底</button>
      </div>
      <div class="arc-hud">
        <span>剩余：<b id="bd-time">20.0s</b></span>
        <span>完美跨栏：<b id="bd-hurdle">0</b></span>
        <span>得分：<b id="bd-score">0</b></span>
      </div>
      <div class="arc-canvas-wrap">
        <canvas id="bd-cv"></canvas>
      </div>
      <div class="arc-ctrl-3">
        <button class="btn secondary" id="bd-left">左变道</button>
        <button class="btn primary" id="bd-jump">起跳跨栏 / 冲刺</button>
        <button class="btn secondary" id="bd-right">右变道</button>
      </div>
    </div>
  `;

  const cv = container.querySelector('#bd-cv');
  const ctx = setupHiDpiCanvas(cv, W, H);
  const timeEl = container.querySelector('#bd-time');
  const hdEl = container.querySelector('#bd-hurdle');
  const scEl = container.querySelector('#bd-score');

  function finishGame(isAuto = false) {
    if (!alive) return;
    alive = false;
    if (rafId) cancelAnimationFrame(rafId);
    if (isAuto) {
      return onFinish({
        grade: 'B', score: 130, health: 1, mood: 2,
        note: '稳健跑完全程，抢到热乎糖醋排骨（健康 +1，心态 +2）'
      });
    }
    const grade = score >= 235 ? 'S' : score >= 160 ? 'A' : score >= 90 ? 'B' : 'C';
    onFinish({
      grade,
      score,
      health: grade === 'S' ? 2 : 1,
      mood: grade === 'S' ? 4 : grade === 'A' ? 3 : 2,
      cash: !isHurdleClimax && grade === 'S' ? 40 : 0,
      note: isHurdleClimax
        ? `跨栏决赛完美过栏 ${hurdlesCleared} 架，冲线得分 ${score}（${grade} 级）！`
        : `一路狂奔冲进食堂窗口，得分 ${score}（${grade} 级）！`
    });
  }

  container.querySelector('#arc-skip').onclick = () => finishGame(true);

  const doJumpOrSprint = () => {
    if (!alive) return;
    if (timeLeft <= 4.0) {
      score += 8;
      scEl.textContent = String(score);
      pops.push({ x: laneX(lane, H - 40), y: H - 68, txt: '冲刺 +8', col: '#fde047', life: 0.5 });
    }
    if (jumpT <= 0) {
      jumpT = 0.56;
      triggerHaptic('light');
    }
  };

  container.querySelector('#bd-left').onclick = () => { if (lane > 0) { lane--; triggerHaptic('light'); } };
  container.querySelector('#bd-right').onclick = () => { if (lane < 2) { lane++; triggerHaptic('light'); } };
  container.querySelector('#bd-jump').onclick = doJumpOrSprint;

  cv.addEventListener('pointerdown', e => {
    touchStartX = e.clientX;
    const rect = cv.getBoundingClientRect();
    const rx = e.clientX - rect.left;
    const clickedLane = rx < rect.width * 0.34 ? 0 : rx > rect.width * 0.66 ? 2 : 1;
    if (clickedLane === lane) doJumpOrSprint();
    else { lane = clickedLane; triggerHaptic('light'); }
  });
  cv.addEventListener('pointerup', e => {
    if (touchStartX !== null) {
      const dx = e.clientX - touchStartX;
      if (dx < -28 && lane > 0) lane--;
      else if (dx > 28 && lane < 2) lane++;
      touchStartX = null;
    }
  });

  function laneX(ln, y) {
    const t = Math.max(0, (y - 36) / (H - 52));
    const spread = 28 + t * 68;
    return W / 2 + (ln - 1) * spread;
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
    if (jumpT > 0) jumpT = Math.max(0, jumpT - dt);

    // 距离自动加分
    score += dt * 4.5;

    // 刷新跨栏架 / 教导主任 / 汽水补给
    if (timeLeft > 4.0) {
      spawnTimer -= dt;
      if (spawnTimer <= 0) {
        spawnTimer = Math.max(0.46, 0.72 - (20 - timeLeft) * 0.012);
        const ln = Math.floor(Math.random() * 3);
        const roll = Math.random();
        const kind = isHurdleClimax
          ? (roll < 0.68 ? 'hurdle' : roll < 0.86 ? 'block' : 'boost')
          : (roll < 0.44 ? 'hurdle' : roll < 0.76 ? 'block' : 'boost');
        obstacles.push({ ln, y: 42, kind, resolved: false });
      }
    }

    const playerY = H - 36;
    const jumping = jumpT > 0.08;

    for (const ob of obstacles) {
      ob.y += speed * dt * (0.55 + (ob.y / H) * 0.85);
      if (!ob.resolved && Math.abs(ob.y - playerY) < 16 && ob.ln === lane) {
        ob.resolved = true;
        const px = laneX(lane, playerY);
        if (ob.kind === 'boost') {
          score += 24;
          triggerHaptic('light');
          pops.push({ x: px, y: playerY - 26, txt: '汽水加速 +24', col: '#86efac', life: 0.8 });
        } else if (ob.kind === 'hurdle') {
          if (jumping) {
            score += 32;
            hurdlesCleared++;
            hdEl.textContent = String(hurdlesCleared);
            triggerHaptic('medium');
            pops.push({ x: px, y: playerY - 30, txt: '完美跨栏 +32', col: '#fde047', life: 0.85 });
          } else {
            score = Math.max(0, score - 14);
            triggerHaptic('heavy');
            pops.push({ x: px, y: playerY - 22, txt: '绊栏 -14', col: '#fca5a5', life: 0.8 });
          }
        } else if (ob.kind === 'block') {
          score = Math.max(0, score - 18);
          triggerHaptic('heavy');
          pops.push({ x: px, y: playerY - 22, txt: '撞上巡查 -18', col: '#fca5a5', life: 0.8 });
        }
      }
    }
    obstacles = obstacles.filter(o => o.y < H + 24);
    scEl.textContent = String(Math.round(score));

    // 绘制塑胶跑道 / 走廊透视画布
    ctx.fillStyle = isHurdleClimax ? '#1e3a5f' : '#e8dcc6';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = isHurdleClimax ? '#b84a39' : '#c9683a';
    ctx.beginPath();
    ctx.moveTo(W / 2 - 42, 36); ctx.lineTo(W / 2 + 42, 36);
    ctx.lineTo(W / 2 + 122, H); ctx.lineTo(W / 2 - 122, H);
    ctx.closePath();
    ctx.fill();

    // 跑道白线
    ctx.strokeStyle = 'rgba(255,253,248,0.75)';
    ctx.lineWidth = 2;
    for (const k of [-1.5, -0.5, 0.5, 1.5]) {
      ctx.beginPath();
      ctx.moveTo(W / 2 + k * 28, 36);
      ctx.lineTo(W / 2 + k * 80, H);
      ctx.stroke();
    }

    if (timeLeft <= 4.0) {
      ctx.fillStyle = '#fef08a';
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('最后冲线！狂点下方中间按钮飙速冲刺！', W / 2, 22);
    } else {
      ctx.fillStyle = isHurdleClimax ? '#f8fafc' : '#4a3728';
      ctx.font = 'bold 10.5px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('红白栏架点「跨栏」飞跃 · 深色路障点左右变道躲避', W / 2, 22);
    }

    // 绘制障碍物
    for (const ob of obstacles) {
      if (ob.resolved && ob.kind === 'boost') continue;
      const s = 0.48 + (ob.y / H) * 0.65;
      const ox = laneX(ob.ln, ob.y);
      ctx.save();
      ctx.translate(ox, ob.y);
      ctx.scale(s, s);
      if (ob.kind === 'hurdle') {
        ctx.fillStyle = '#fffdf9';
        ctx.fillRect(-24, -14, 48, 7);
        ctx.fillStyle = '#dc2626';
        ctx.fillRect(-24, -14, 12, 7);
        ctx.fillRect(12, -14, 12, 7);
        ctx.fillStyle = '#4a3728';
        ctx.fillRect(-22, -7, 4, 12);
        ctx.fillRect(18, -7, 4, 12);
      } else if (ob.kind === 'block') {
        drawRoundedRect(ctx, -18, -28, 36, 30, 6);
        ctx.fillStyle = '#334155';
        ctx.fill();
        ctx.fillStyle = '#f8fafc';
        ctx.font = 'bold 10px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(isHurdleClimax ? '抢道' : '主任', 0, -10);
      } else {
        ctx.fillStyle = '#38bdf8';
        ctx.beginPath(); ctx.arc(0, -12, 12, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
        ctx.fillStyle = '#fff'; ctx.font = 'bold 9px sans-serif'; ctx.textAlign = 'center';
        ctx.fillText('加速', 0, -9);
      }
      ctx.restore();
    }

    // 绘制主角背影与腾空阴影
    const px = laneX(lane, playerY);
    const lift = Math.sin((jumpT / 0.56) * Math.PI) * 34;
    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    ctx.beginPath();
    ctx.ellipse(px, playerY + 4, Math.max(8, 16 - lift * 0.2), 6, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.save();
    ctx.translate(px, playerY - lift);
    drawRoundedRect(ctx, -13, -30, 26, 28, 7);
    ctx.fillStyle = '#f59e0b';
    ctx.fill();
    ctx.strokeStyle = '#4a3728';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#4a3728';
    ctx.beginPath(); ctx.arc(0, -36, 9, 0, Math.PI * 2); ctx.fill();
    ctx.restore();

    pops = pops.filter(p => p.life > 0);
    for (const p of pops) {
      p.life -= dt * 1.3;
      p.y -= dt * 24;
      ctx.save();
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.font = 'bold 11.5px sans-serif';
      ctx.textAlign = 'center';
      ctx.strokeStyle = '#4a3728';
      ctx.lineWidth = 3;
      ctx.strokeText(p.txt, p.x, p.y);
      ctx.fillStyle = p.col;
      ctx.fillText(p.txt, p.x, p.y);
      ctx.restore();
    }

    rafId = requestAnimationFrame(loop);
  }
  rafId = requestAnimationFrame(loop);
}

// ============================================================================
// 4. 打工人切需求（手指划屏刀光切碎 PPT/表格/漏洞 · 躲黑锅抢准点下班券）
// ============================================================================
export function openWorkSliceGame(container, state, opts = {}, onFinish) {
  const W = 342, H = 228;
  const isEsport = opts.climaxDreamId === 'd_esport' || opts.qualifierDreamId === 'd_esport';
  const titleText = opts.climaxDreamId === 'd_esport'
    ? '职业总决赛第五局 · 极限微操切集火'
    : opts.qualifierDreamId === 'd_esport'
      ? '俱乐部青训试训 · 团战集火实测'
      : '打工人切需求 · 职场解压乱斗';

  let score = 0;
  let timeLeft = 22;
  let offworkTickets = 0;
  let items = [];
  let halves = [];
  let trail = [];
  let pops = [];
  let pointerDown = false;
  let strokeHits = 0;
  let shakeT = 0;
  let spawnWait = 0.35;
  let alive = true;
  let rafId = 0;

  container.innerHTML = `
    <div class="mg-box arc-box">
      <div class="mg-head">
        <h3 style="display:flex;align-items:center;gap:6px;">${pxIcon('blade', 16)} ${titleText}</h3>
        <button class="btn ghost" id="arc-skip">一键保底</button>
      </div>
      <div class="arc-hud">
        <span>剩余：<b id="ws-time">22.0s</b></span>
        <span>下班券：<b id="ws-off">0</b></span>
        <span>得分：<b id="ws-score">0</b>（250分评 S）</span>
      </div>
      <div class="arc-canvas-wrap">
        <canvas id="ws-cv"></canvas>
      </div>
      <div style="font-size:11px;color:var(--muted);text-align:center;">单指在画面上滑动挥刀（或直接点按目标），切记避开深红「黑锅」！</div>
    </div>
  `;

  const cv = container.querySelector('#ws-cv');
  const ctx = setupHiDpiCanvas(cv, W, H);
  const timeEl = container.querySelector('#ws-time');
  const offEl = container.querySelector('#ws-off');
  const scEl = container.querySelector('#ws-score');

  function finishGame(isAuto = false) {
    if (!alive) return;
    alive = false;
    if (rafId) cancelAnimationFrame(rafId);
    if (isAuto) {
      return onFinish({
        grade: 'B', score: 135, cash: 180, mood: 2, fatigueDelta: -1,
        note: '按部就班清完今日待办（心态 +2，疲劳 -1）'
      });
    }
    const grade = score >= 250 ? 'S' : score >= 170 ? 'A' : score >= 95 ? 'B' : 'C';
    onFinish({
      grade,
      score,
      cash: state.age >= 19 ? (grade === 'S' ? 420 : grade === 'A' ? 260 : 120) : 50,
      mood: grade === 'S' ? 5 : grade === 'A' ? 3 : 2,
      pro: grade === 'S' ? 1 : 0,
      fatigueDelta: -Math.min(4, 1 + offworkTickets),
      note: `快刀斩乱麻得分 ${score}（${grade} 级），抢到 ${offworkTickets} 张准点下班券（疲劳 -${Math.min(4, 1 + offworkTickets)}）！`
    });
  }

  container.querySelector('#arc-skip').onclick = () => finishGame(true);

  function spawnWave() {
    const count = 2 + (Math.random() < 0.45 ? 1 : 0);
    for (let i = 0; i < count; i++) {
      const r = Math.random();
      let spec;
      if (r < 0.19) {
        spec = { kind: 'bomb', label: isEsport ? '致命空大' : '背黑锅', bg: '#7f1d1d', fg: '#fecaca', pts: -35 };
      } else if (r < 0.33) {
        spec = { kind: 'gold', label: isEsport ? '大龙抢断' : '下班券', bg: '#f59e0b', fg: '#fffbeb', pts: 45 };
      } else if (r < 0.66) {
        spec = { kind: 'norm', label: isEsport ? '精准补刀' : '急件表格', bg: '#3b8760', fg: '#f0fdf4', pts: 22 };
      } else {
        spec = { kind: 'norm', label: isEsport ? '极限走位' : '改八版稿', bg: '#2563eb', fg: '#eff6ff', pts: 25 };
      }
      const x = 44 + Math.random() * (W - 88);
      const vx = (W / 2 - x) * (0.45 + Math.random() * 0.45);
      const vy = -(265 + Math.random() * 65);
      items.push({ ...spec, x, y: H + 18, vx, vy, r: 23, sliced: false });
    }
  }

  function sliceAt(px, py) {
    trail.push({ x: px, y: py, life: 0.22 });
    for (const it of items) {
      if (it.sliced) continue;
      if (Math.hypot(px - it.x, py - it.y) <= it.r + 10) {
        it.sliced = true;
        if (it.kind === 'bomb') {
          score = Math.max(0, score + it.pts);
          strokeHits = 0;
          shakeT = 0.25;
          triggerHaptic('heavy');
          pops.push({ x: it.x, y: it.y, txt: `${it.label} -35`, col: '#fca5a5', life: 0.9 });
        } else {
          strokeHits++;
          let add = it.pts;
          if (it.kind === 'gold') {
            offworkTickets++;
            offEl.textContent = String(offworkTickets);
          }
          if (strokeHits >= 2) add += 12;
          score += add;
          triggerHaptic(it.kind === 'gold' ? 'medium' : 'light');
          pops.push({
            x: it.x, y: it.y,
            txt: strokeHits >= 2 ? `连斩 +${add}` : `+${add}`,
            col: it.kind === 'gold' ? '#fde047' : '#bbf7d0',
            life: 0.8
          });
          halves.push(
            { x: it.x - 6, y: it.y, vx: -55, vy: -40, bg: it.bg, rot: -0.2, life: 0.6 },
            { x: it.x + 6, y: it.y, vx: 55, vy: -30, bg: it.bg, rot: 0.25, life: 0.6 }
          );
        }
        scEl.textContent = String(score);
      }
    }
  }

  const getPt = e => {
    const rect = cv.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * W,
      y: ((e.clientY - rect.top) / rect.height) * H
    };
  };

  cv.addEventListener('pointerdown', e => {
    e.preventDefault();
    pointerDown = true;
    strokeHits = 0;
    const p = getPt(e);
    sliceAt(p.x, p.y);
  });
  cv.addEventListener('pointermove', e => {
    if (!pointerDown) return;
    e.preventDefault();
    const p = getPt(e);
    sliceAt(p.x, p.y);
  });
  window.addEventListener('pointerup', () => { pointerDown = false; strokeHits = 0; });

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
    if (shakeT > 0) shakeT = Math.max(0, shakeT - dt);

    spawnWait -= dt;
    if (spawnWait <= 0) {
      spawnWait = 0.88;
      spawnWave();
    }

    for (const it of items) {
      it.x += it.vx * dt;
      it.y += it.vy * dt;
      it.vy += 310 * dt;
    }
    items = items.filter(it => !it.sliced && it.y < H + 46);

    for (const h of halves) {
      h.x += h.vx * dt;
      h.y += h.vy * dt;
      h.vy += 360 * dt;
      h.life -= dt;
    }
    halves = halves.filter(h => h.life > 0);
    trail.forEach(t => { t.life -= dt; });
    trail = trail.filter(t => t.life > 0);

    ctx.save();
    if (shakeT > 0) ctx.translate((Math.random() - 0.5) * 7, (Math.random() - 0.5) * 7);

    ctx.fillStyle = '#2b2520';
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = 'rgba(255,248,235,0.06)';
    for (let gx = 26; gx < W; gx += 32) {
      ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, H); ctx.stroke();
    }

    // 切碎的两半残片
    for (const h of halves) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, h.life);
      ctx.translate(h.x, h.y);
      ctx.rotate(h.rot);
      ctx.fillStyle = h.bg;
      ctx.fillRect(-10, -12, 20, 24);
      ctx.restore();
    }

    // 抛起的目标卡片
    for (const it of items) {
      ctx.save();
      ctx.translate(it.x, it.y);
      drawRoundedRect(ctx, -25, -18, 50, 36, 8);
      ctx.fillStyle = it.bg;
      ctx.fill();
      ctx.strokeStyle = it.kind === 'bomb' ? '#ef4444' : it.kind === 'gold' ? '#fef08a' : '#fffdf9';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = it.fg;
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(it.label, 0, 4);
      ctx.restore();
    }

    // 金色刀光轨迹
    if (trail.length > 1) {
      ctx.strokeStyle = '#fde047';
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.beginPath();
      trail.forEach((pt, idx) => {
        if (idx === 0) ctx.moveTo(pt.x, pt.y);
        else ctx.lineTo(pt.x, pt.y);
      });
      ctx.stroke();
    }

    pops = pops.filter(p => p.life > 0);
    for (const p of pops) {
      p.life -= dt * 1.3;
      p.y -= dt * 22;
      ctx.save();
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = p.col;
      ctx.fillText(p.txt, p.x, p.y);
      ctx.restore();
    }

    ctx.restore();
    rafId = requestAnimationFrame(loop);
  }
  rafId = requestAnimationFrame(loop);
}

// ============================================================================
// 5. 过年家族群·极速抢红包雨（20 秒连点抢金包 · 避开亲戚盘问气泡硬控）
// ============================================================================
export function openRedPacketRainGame(container, state, opts = {}, onFinish) {
  const W = 342, H = 228;
  let score = 0;
  let timeLeft = 20;
  let stunT = 0;
  let packets = [];
  let pops = [];
  let spawnTimer = 0.2;
  let alive = true;
  let rafId = 0;

  const nagTexts = state.age <= 18
    ? ['期末考第几？', '作业写完没？']
    : state.age < 32
      ? ['对象找好没？', '年终奖多少？']
      : ['二胎考虑没？', '血压高不高？'];

  container.innerHTML = `
    <div class="mg-box arc-box">
      <div class="mg-head">
        <h3 style="display:flex;align-items:center;gap:6px;">${pxIcon('packet', 16)} 家族群 · 极速抢红包雨</h3>
        <button class="btn ghost" id="arc-skip">一键保底</button>
      </div>
      <div class="arc-hud">
        <span>除夕倒计时：<b id="rp-time">20.0s</b></span>
        <span>手气积分：<b id="rp-score">0</b>（260分评 S）</span>
      </div>
      <div class="arc-canvas-wrap">
        <canvas id="rp-cv"></canvas>
      </div>
      <div style="font-size:11px;color:var(--muted);text-align:center;">狂点落下的红金红包，千万别点灰白「亲戚盘问消息」！</div>
    </div>
  `;

  const cv = container.querySelector('#rp-cv');
  const ctx = setupHiDpiCanvas(cv, W, H);
  const timeEl = container.querySelector('#rp-time');
  const scEl = container.querySelector('#rp-score');

  function finishGame(isAuto = false) {
    if (!alive) return;
    alive = false;
    if (rafId) cancelAnimationFrame(rafId);
    const baseMult = state.age <= 18 ? 1 : state.age < 55 ? 3.2 : 2.0;
    if (isAuto) {
      return onFinish({
        grade: 'B', score: 120, cash: Math.round(80 * baseMult), mood: 3, familyInt: 2,
        note: '除夕顺手抢了几个吉祥红包（心态 +3）'
      });
    }
    const grade = score >= 260 ? 'S' : score >= 175 ? 'A' : score >= 95 ? 'B' : 'C';
    const rawCash = grade === 'S' ? 220 : grade === 'A' ? 150 : grade === 'B' ? 95 : 50;
    onFinish({
      grade,
      score,
      cash: Math.round(rawCash * baseMult),
      mood: grade === 'S' ? 5 : 3,
      familyInt: grade === 'S' || grade === 'A' ? 3 : 1,
      note: `家族群手气最佳得分 ${score}（${grade} 级），喜提彩头 ¥${Math.round(rawCash * baseMult)}！`
    });
  }

  container.querySelector('#arc-skip').onclick = () => finishGame(true);

  cv.addEventListener('pointerdown', e => {
    e.preventDefault();
    if (!alive || stunT > 0) return;
    const rect = cv.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * W;
    const py = ((e.clientY - rect.top) / rect.height) * H;

    // 从最上层往下找命中的红包/气泡
    for (let i = packets.length - 1; i >= 0; i--) {
      const p = packets[i];
      if (Math.abs(px - p.x) <= p.w / 2 + 8 && Math.abs(py - p.y) <= p.h / 2 + 8) {
        packets.splice(i, 1);
        if (p.kind === 'nag') {
          stunT = 0.82;
          score = Math.max(0, score - 22);
          triggerHaptic('heavy');
          pops.push({ x: p.x, y: p.y, txt: '硬着头皮回复 -22', col: '#fca5a5', life: 0.9 });
        } else {
          score += p.pts;
          triggerHaptic(p.kind === 'gold' ? 'medium' : 'light');
          pops.push({ x: p.x, y: p.y, txt: p.kind === 'gold' ? `手气王 +${p.pts}` : `+${p.pts}`, col: '#fde047', life: 0.75 });
        }
        scEl.textContent = String(score);
        break;
      }
    }
  });

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
    if (stunT > 0) stunT = Math.max(0, stunT - dt);

    const fever = timeLeft <= 5.5;
    spawnTimer -= dt;
    if (spawnTimer <= 0) {
      spawnTimer = fever ? 0.21 : 0.34;
      const r = Math.random();
      if (r < 0.22) {
        packets.push({
          kind: 'nag',
          txt: nagTexts[Math.floor(Math.random() * nagTexts.length)],
          x: 48 + Math.random() * (W - 96), y: -20,
          w: 78, h: 30, vy: 112 + Math.random() * 36, pts: -22
        });
      } else if (r < 0.38) {
        packets.push({
          kind: 'gold', txt: '大吉金包',
          x: 34 + Math.random() * (W - 68), y: -24,
          w: 44, h: 54, vy: 162 + Math.random() * 45, pts: 48
        });
      } else {
        packets.push({
          kind: 'red', txt: '开',
          x: 32 + Math.random() * (W - 64), y: -24,
          w: 40, h: 50, vy: 124 + Math.random() * 42, pts: 24
        });
      }
    }

    for (const p of packets) p.y += p.vy * dt;
    packets = packets.filter(p => p.y < H + 36);

    // 喜庆红金底色
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#681818');
    g.addColorStop(1, '#3f1111');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    if (fever) {
      ctx.fillStyle = '#fde047';
      ctx.font = 'bold 11.5px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('零点暴击红包雨来袭！手速拉满！', W / 2, 18);
    }

    for (const p of packets) {
      ctx.save();
      ctx.translate(p.x, p.y);
      if (p.kind === 'nag') {
        drawRoundedRect(ctx, -p.w / 2, -p.h / 2, p.w, p.h, 8);
        ctx.fillStyle = '#f3f4f6';
        ctx.fill();
        ctx.strokeStyle = '#6b7280';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.fillStyle = '#1f2937';
        ctx.font = 'bold 10px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(p.txt, 0, 4);
      } else {
        drawRoundedRect(ctx, -p.w / 2, -p.h / 2, p.w, p.h, 7);
        ctx.fillStyle = p.kind === 'gold' ? '#f59e0b' : '#dc2626';
        ctx.fill();
        ctx.strokeStyle = '#fde047';
        ctx.lineWidth = 1.8;
        ctx.stroke();
        ctx.fillStyle = '#fde047';
        ctx.beginPath(); ctx.arc(0, -2, 10, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#7f1d1d';
        ctx.font = 'bold 10px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('开', 0, 2);
      }
      ctx.restore();
    }

    if (stunT > 0) {
      ctx.fillStyle = 'rgba(0,0,0,0.52)';
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#fef08a';
      ctx.font = 'bold 13px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('误点亲戚消息，正在礼貌陪笑回复中…', W / 2, H / 2);
    }

    pops = pops.filter(p => p.life > 0);
    for (const p of pops) {
      p.life -= dt * 1.35;
      p.y -= dt * 22;
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
// 6. 公园湖畔·退休钓鱼佬（看黑漂提竿 + 按住控张力条溜鱼，兼容外科稳手考核！）
// ============================================================================
export function openLakeFishingGame(container, state, opts = {}, onFinish) {
  const W = 342, H = 224;
  const isSurgeon = opts.climaxDreamId === 'd_surgeon' || opts.qualifierDreamId === 'd_surgeon';
  const titleText = opts.climaxDreamId === 'd_surgeon'
    ? '三甲主刀留院考 · 腔镜稳手张力控制'
    : opts.qualifierDreamId === 'd_surgeon'
      ? '执业医师实操考 · 首次上台拉钩稳手'
      : '公园湖畔 · 退休钓鱼佬';

  let round = 1;
  const maxRounds = isSurgeon ? 1 : 2;
  let score = 0;
  let gotWatchKeepsake = false;
  let phase = 'wait'; // 'wait' | 'bite' | 'reel'
  let waitTimer = 1.4 + Math.random() * 1.3;
  let biteWindow = 0;
  let barPos = 0.25; // 0~1 玩家绿区中心
  let barVel = 0;
  let fishPos = 0.5;
  let fishTarget = 0.7;
  let fishTimer = 0.5;
  let reelProgress = 0.35; // 0~1 满格起鱼
  let holding = false;
  let statusMsg = isSurgeon ? '静心凝神，出现切口信号立即轻点切入…' : '抛竿入水，紧盯红白浮漂下沉信号…';
  let alive = true;
  let rafId = 0;

  container.innerHTML = `
    <div class="mg-box arc-box">
      <div class="mg-head">
        <h3 style="display:flex;align-items:center;gap:6px;">${pxIcon(isSurgeon ? 'stethoscope' : 'fish', 16)} ${titleText}</h3>
        <button class="btn ghost" id="arc-skip">一键保底</button>
      </div>
      <div class="arc-hud">
        <span>${isSurgeon ? '实操进度' : '回合'}：<b id="lf-round">1/${maxRounds}</b></span>
        <span>${isSurgeon ? '稳手精度' : '渔获积分'}：<b id="lf-score">0</b>（210分评 S）</span>
      </div>
      <div class="arc-canvas-wrap">
        <canvas id="lf-cv"></canvas>
      </div>
      <button class="btn primary arc-hold-btn" id="lf-act">${isSurgeon ? '紧盯生命体征信号 · 亮起瞬间切入缝合' : '紧盯浮漂 · 黑漂瞬间点击提竿'}</button>
    </div>
  `;

  const cv = container.querySelector('#lf-cv');
  const ctx = setupHiDpiCanvas(cv, W, H);
  const rdEl = container.querySelector('#lf-round');
  const scEl = container.querySelector('#lf-score');
  const actBtn = container.querySelector('#lf-act');

  function finishGame(isAuto = false) {
    if (!alive) return;
    alive = false;
    if (rafId) cancelAnimationFrame(rafId);
    if (isAuto) {
      return onFinish({
        grade: 'B', score: 120, health: 1, mood: 3,
        note: '湖边吹风半晌，拎回两条鲫鱼煲汤（健康 +1，心态 +3）'
      });
    }
    const grade = score >= 210 ? 'S' : score >= 140 ? 'A' : score >= 75 ? 'B' : 'C';
    if (grade === 'S' && !isSurgeon) gotWatchKeepsake = true;
    onFinish({
      grade,
      score,
      health: grade === 'S' ? 2 : 1,
      mood: grade === 'S' ? 5 : grade === 'A' ? 4 : 2,
      cash: !isSurgeon && grade === 'S' ? 160 : 0,
      keepsake: gotWatchKeepsake ? {
        name: '湖畔老怀表',
        story: '在公园柳荫下钓起锦鲤王那天，同钓的老匠人赠你的黄铜机械表，走时依然清脆。',
        buff: '珍藏多宝格：慢享岁月信物，老年健康与心态更稳固'
      } : null,
      note: isSurgeon
        ? `腔镜缝合张力零失误，考核评分 ${score}（${grade} 级）！`
        : gotWatchKeepsake
          ? `稳手溜上黄金大锦鲤（${grade} 级 · ${score} 分），获赠信物「湖畔老怀表」！`
          : `湖畔垂钓收竿得分 ${score}（${grade} 级），神清气爽！`
    });
  }

  container.querySelector('#arc-skip').onclick = () => finishGame(true);

  function startRound() {
    phase = 'wait';
    waitTimer = 1.1 + Math.random() * 1.4;
    holding = false;
    actBtn.textContent = isSurgeon ? '等待切入时机…' : '静候鱼儿咬钩…';
    statusMsg = isSurgeon ? '凝神观察生命体征波形…' : '微风拂过湖面，浮漂轻轻晃动…';
    rdEl.textContent = `${round}/${maxRounds}`;
  }

  function enterReel(perfectHook) {
    phase = 'reel';
    reelProgress = perfectHook ? 0.44 : 0.28;
    barPos = 0.45;
    barVel = 0;
    fishPos = 0.5;
    fishTarget = 0.72;
    actBtn.textContent = '按住向右控张力 · 松手向左回落';
    statusMsg = perfectHook ? '完美提竿！按住按钮让绿框罩住游鱼！' : '上钩了！按住或松开控制绿框罩住游鱼！';
  }

  function completeRound(caught) {
    if (caught) {
      const add = isSurgeon ? 225 : (round === 2 ? 135 : 105);
      score += add;
      triggerHaptic('heavy');
    } else {
      score += 35;
      triggerHaptic('light');
    }
    scEl.textContent = String(score);
    if (round < maxRounds) {
      round++;
      startRound();
    } else {
      setTimeout(() => finishGame(false), 380);
    }
  }

  const onDown = e => {
    e.preventDefault();
    if (!alive) return;
    if (phase === 'bite') {
      triggerHaptic('medium');
      enterReel(true);
    } else if (phase === 'wait') {
      // 提早拉竿直接普通进入溜鱼，不卡死玩家
      enterReel(false);
    } else if (phase === 'reel') {
      holding = true;
    }
  };
  const onUp = () => { holding = false; };

  actBtn.addEventListener('pointerdown', onDown);
  cv.addEventListener('pointerdown', onDown);
  window.addEventListener('pointerup', onUp);

  let waveT = 0;
  let lastTs = performance.now();
  function loop(now) {
    if (!alive) {
      window.removeEventListener('pointerup', onUp);
      return;
    }
    const dt = Math.min(0.05, (now - lastTs) / 1000);
    lastTs = now;
    waveT += dt;

    if (phase === 'wait') {
      waitTimer -= dt;
      if (waitTimer <= 0) {
        phase = 'bite';
        biteWindow = 0.85;
        triggerHaptic('medium');
        actBtn.textContent = '黑漂咬钩！立即点击提竿！';
        statusMsg = '猛然黑漂下沉！快点提竿！';
      }
    } else if (phase === 'bite') {
      biteWindow -= dt;
      if (biteWindow <= 0) {
        enterReel(false);
      }
    } else if (phase === 'reel') {
      barVel += (holding ? 1.65 : -1.55) * dt;
      barVel *= 0.9;
      barPos = Math.max(0.14, Math.min(0.86, barPos + barVel));

      fishTimer -= dt;
      if (fishTimer <= 0) {
        fishTimer = 0.55 + Math.random() * 0.65;
        fishTarget = 0.16 + Math.random() * 0.68;
      }
      fishPos += (fishTarget - fishPos) * dt * 2.5;

      const inZone = Math.abs(fishPos - barPos) <= 0.16;
      reelProgress += (inZone ? 0.34 : -0.20) * dt;
      if (reelProgress >= 1) {
        completeRound(true);
      } else if (reelProgress <= 0.02) {
        completeRound(false);
      }
    }

    // 绘制湖水意境画布
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, isSurgeon ? '#1e3a5f' : '#bae6fd');
    g.addColorStop(0.32, isSurgeon ? '#0f172a' : '#38bdf8');
    g.addColorStop(1, '#0369a1');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = '#fffdf9';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(statusMsg, W / 2, 22);

    // 浮漂与涟漪
    const bobX = W / 2;
    const bobY = phase === 'bite'
      ? 112 + Math.sin(waveT * 26) * 5
      : 94 + Math.sin(waveT * 3.2) * 4;

    ctx.strokeStyle = 'rgba(255,255,255,0.45)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(bobX, 106, 28 + Math.sin(waveT * 3) * 5, 9, 0, 0, Math.PI * 2);
    ctx.stroke();

    // 鱼线与红白漂
    ctx.strokeStyle = '#f8fafc';
    ctx.beginPath(); ctx.moveTo(W - 24, 12); ctx.lineTo(bobX, bobY - 12); ctx.stroke();
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(bobX - 4, bobY - 14, 8, 10);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(bobX - 4, bobY - 4, 8, 9);

    // 溜鱼阶段绘制底部张力控制条与起鱼进度条
    if (phase === 'reel') {
      const tx = 26, ty = 152, tw = W - 52, th = 24;
      drawRoundedRect(ctx, tx, ty, tw, th, 12);
      ctx.fillStyle = 'rgba(15,23,42,0.72)';
      ctx.fill();
      ctx.strokeStyle = '#f8fafc';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // 玩家绿色张力安全窗
      const zw = tw * 0.30;
      const zx = tx + barPos * tw - zw / 2;
      drawRoundedRect(ctx, zx, ty + 3, zw, th - 6, 9);
      ctx.fillStyle = Math.abs(fishPos - barPos) <= 0.16 ? '#4ade80' : '#facc15';
      ctx.fill();

      // 游动的目标鱼标
      const fx = tx + fishPos * tw;
      ctx.fillStyle = '#ea580c';
      ctx.beginPath(); ctx.arc(fx, ty + th / 2, 9, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();

      // 下方起鱼满格进度槽
      drawRoundedRect(ctx, tx, 188, tw, 12, 6);
      ctx.fillStyle = 'rgba(255,255,255,0.28)';
      ctx.fill();
      drawRoundedRect(ctx, tx, 188, Math.max(8, tw * reelProgress), 12, 6);
      ctx.fillStyle = '#fde047';
      ctx.fill();
    }

    rafId = requestAnimationFrame(loop);
  }
  rafId = requestAnimationFrame(loop);
}
