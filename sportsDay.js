// 《这辈子 2.0》Sprint 7 —— 初中 14 岁秋季校运会（100% 还原定稿 UI · 全局统一背面多帧实时动画 · 零顶部时间条）
// 四大自选项目：100米短跑 / 男子1000米(女子800米) / 跳远(助跑踩白板抛物线入沙坑) / 跳高(J字弧线双拍背越式过杆)
// 严格遵循零系统彩色 Emoji 规范与可见文案红线。

import { loadBackSprites } from './spriteLoader.js?v=s70';
import { triggerHaptic } from './vfxAndUi.js?v=s70';

export async function ensureSportsSprites(gender = 'male') {
  return loadBackSprites(gender);
}

const ROUNDS = [
  { idx: 0, name: '预赛', diffLabel: '易', hpReward: 2, aiMult: 0.78, jumpTarget: 4.35, highTarget: 1.40 },
  { idx: 1, name: '半决赛', diffLabel: '中', hpReward: 3, aiMult: 0.92, jumpTarget: 4.85, highTarget: 1.54 },
  { idx: 2, name: '决赛', diffLabel: '难', hpReward: 5, aiMult: 1.04, jumpTarget: 5.30, highTarget: 1.66 }
];

export function getSportEventsForGender(gender) {
  const isMale = gender !== 'female';
  return [
    {
      id: 'sprint_100',
      name: '100米短跑',
      tag: '双脚印交替冲刺',
      desc: '全屏跑道实时冲刺，交替点按「左脚蹬地 / 右脚蹬地」拉满金色极速步频'
    },
    {
      id: isMale ? 'run_1000' : 'run_800',
      name: isMale ? '男子1000米' : '女子800米',
      tag: '椭圆弯道配速',
      desc: '三圈耐力跑：按住控呼吸稳在绿区跟跑省体力，末圈点击「最后冲刺」绝杀'
    },
    {
      id: 'long_jump',
      name: '跳远',
      tag: '助跑踩白板腾空',
      desc: '每轮3次试跳：按住助跑提速冲向起跳白板，踩中白板瞬间松手飞入沙坑'
    },
    {
      id: 'high_jump',
      name: '跳高',
      tag: 'J字弧线背越过杆',
      desc: '每轮3次试跳：第①拍踩准弧线脚印，第②拍看准金圈拔地背越跃过横杆'
    }
  ];
}

function shoeSoleSvg(flip = false) {
  return `<svg width="22" height="26" viewBox="0 0 12 14" style="image-rendering:pixelated;flex-shrink:0;transform:scaleX(${flip ? -1 : 1})">
    <rect x="3" y="1" width="6" height="5" fill="#4a3728"/><rect x="4" y="2" width="4" height="3" fill="#fffdf9"/>
    <rect x="3" y="7" width="5" height="5" fill="#4a3728"/><rect x="4" y="8" width="3" height="3" fill="#fffdf9"/>
  </svg>`;
}

// 公共像素看台头部：清晨天空、云朵、远景教学楼+红横幅、阶梯看台欢呼同学、三角彩旗、绿茵草皮
function drawPixelStadiumHeader(g, W, H, horizonY, now) {
  const rect = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };
  rect(0, 0, W, 38, '#b8e0f7');
  rect(0, 38, W, 36, '#d2eefb');
  rect(0, 74, W, horizonY - 74, '#ecf7fc');

  const cloudShift = (now / 320) % 24;
  rect(16 + cloudShift * 0.3, 26, 32, 7, '#fff');
  rect(23 + cloudShift * 0.3, 21, 18, 5, '#fff');
  rect(136 - cloudShift * 0.25, 30, 36, 7, '#fff');
  rect(144 - cloudShift * 0.25, 25, 20, 5, '#fff');

  // 远景教学楼与校运红横幅
  rect(34, 52, 127, 36, '#4a3728');
  rect(36, 54, 123, 33, '#f3e3c9');
  rect(32, 49, 131, 5, '#c9683a');
  for (let x = 42; x <= 146; x += 16) {
    rect(x, 61, 9, 10, '#78a5c4');
    rect(x, 60, 9, 1, '#4a3728');
  }
  rect(60, 55, 75, 5, '#d63b32');
  for (let x = 66; x <= 126; x += 8) rect(x, 57, 4, 2, '#fef08a');

  // 左右阶梯看台 + 随赛况欢呼雀跃的像素同学
  const cheerPhase = Math.floor(now / 240);
  [[0, 74, 46, 36], [149, 74, 46, 36]].forEach(([bx, by, bw, bh]) => {
    rect(bx, by, bw, bh, '#4a3728');
    rect(bx + 1, by + 2, bw - 2, bh - 3, '#d9cfc1');
    for (let r = 0; r < 3; r++) {
      const ry = by + 6 + r * 10;
      rect(bx + 1, ry + 5, bw - 2, 3, '#b8ad9e');
      for (let kx = bx + 5, idx = 0; kx < bx + bw - 5; kx += 7, idx++) {
        const jump = (cheerPhase + idx + r) % 4 === 0 ? 1 : 0;
        rect(kx, ry - jump, 4, 3, '#3b261d');
        rect(kx - 1, ry + 3 - jump, 6, 3, (kx + r) % 2 === 0 ? '#3b73b9' : '#e05347');
      }
    }
  });

  // 三角彩旗绳
  const flagCols = ['#ef4444', '#facc15', '#3b82f6', '#22c55e', '#f97316'];
  g.fillStyle = '#4a3728';
  for (let x = 0; x < W; x++) g.fillRect(x, 70 + Math.round((x / W) * 4), 1, 1);
  for (let x = 8, idx = 0; x < W - 6; x += 12, idx++) {
    const fy = 71 + Math.round((x / W) * 3);
    const c = flagCols[idx % flagCols.length];
    rect(x, fy, 6, 3, c);
    rect(x + 1, fy + 3, 4, 2, c);
    rect(x + 2, fy + 5, 2, 2, c);
  }

  // 绿茵内场条纹草皮
  rect(0, horizonY, W, H - horizonY, '#6da85b');
  for (let y = horizonY + 8; y < H; y += 18) {
    rect(0, y, W, 6, '#639c52');
  }
}

export async function openSportsDayTournament(state, mountOverlay, clearOverlay, onComplete, opts = {}) {
  const sprites = await ensureSportsSprites(state.gender || 'male');
  const events = getSportEventsForGender(state.gender);
  let chosenEvent = events.find(e => e.id === opts.autoEventId) || events[0];
  let earnedHealth = 0;
  let passedRounds = 0;
  let activeCleanup = null;

  const cleanupGame = () => {
    if (activeCleanup) {
      try { activeCleanup(); } catch (_) {}
      activeCleanup = null;
    }
  };

  const finishTournament = (champion, quitEarly = false) => {
    cleanupGame();
    state.sportsDayDone = true;
    if (earnedHealth > 0) {
      state.stats.health = Math.min(100, (state.stats.health || 80) + earnedHealth);
    }
    state.stats.mood = Math.min(100, (state.stats.mood || 70) + (champion ? 8 : 3));

    if (champion) {
      state.olympicSport = { id: chosenEvent.id, name: chosenEvent.name };
      if (!state.items.includes(`校运会${chosenEvent.name}金牌`)) {
        state.items.push(`校运会${chosenEvent.name}金牌`);
      }
      if (state.dreams?.d_hurdle) {
        state.dreams.d_hurdle.stage = Math.max(state.dreams.d_hurdle.stage || 0, 1);
        state.dreams.d_hurdle.xp = Math.max(state.dreams.d_hurdle.xp || 0, 15);
      }
    }

    const html = `
      <div class="sd-full-overlay">
        <div class="sd-summary-card">
          <div class="sd-sum-badge">${champion ? '校运会夺冠 · 奥运梦启航' : (quitEarly ? '已弃权收官' : '本届校运会收官')}</div>
          <h3>${chosenEvent.name} · ${champion ? '决赛总冠军！' : `止步${ROUNDS[passedRounds]?.name || '赛场'}`}</h3>
          <div class="sd-bracket">
            ${ROUNDS.map((r, i) => `
              <div class="sd-b-cell ${i < passedRounds ? 'pass' : (i === passedRounds && !champion ? 'fail' : '')}">
                <b>${r.name}(${r.diffLabel})</b>
                <span>${i < passedRounds ? `过关 · 健康+${r.hpReward}` : (i === passedRounds ? (quitEarly ? '已弃权' : '惜败止步') : '未解锁')}</span>
              </div>
            `).join('')}
          </div>
          <div class="sd-sum-desc">
            ${champion
              ? `全班冲上跑道把你高高抛起！看台边的市体校教练记下了你的名字，正式向你发出邀请——你的「奥运 · ${chosenEvent.name}冠军梦」就此点亮！（本回合累计健康 +${earnedHealth}，心态 +8）`
              : `你在全班呐喊声中拼尽了全力，虽然没能站上最高领奖台开启奥运梦，但收获了满满的体能与青春回忆！（本回合保留已获健康 +${earnedHealth}，心态 +3）`}
          </div>
          <button class="btn-go" id="sd-finish-btn" style="width:100%;">${champion ? '收下金牌与奥运邀请 · 回到生活' : '收下青春回忆 · 回到生活'}</button>
        </div>
      </div>
    `;

    mountOverlay(html, (root) => {
      root.querySelector('#sd-finish-btn').onclick = () => {
        clearOverlay();
        if (onComplete) onComplete({ champion, sport: chosenEvent, earnedHealth });
      };
    });
  };

  const renderSignup = () => {
    const html = `
      <div class="sd-full-overlay">
        <div class="sd-signup-card">
          <div class="sd-sum-badge">14岁初二秋季 · 校运会秩序册</div>
          <h3>班级田径报名（四选一）</h3>
          <p class="sd-sub-tip">本回合连闯三轮：预赛(易·健康+2) → 半决赛(中·健康+3) → 决赛(难·健康+5)。任意一轮落败即止步，决赛夺冠将开启该项目的「奥运冠军梦」！</p>
          <div class="sd-evt-grid">
            ${events.map(ev => `
              <button class="sd-evt-card ${chosenEvent.id === ev.id ? 'on' : ''}" data-sdevt="${ev.id}">
                <div class="sd-ec-top"><b>${ev.name}</b><span>${ev.tag}</span></div>
                <div class="sd-ec-desc">${ev.desc}</div>
              </button>
            `).join('')}
          </div>
          <div class="sd-signup-actions">
            <button class="btn-go" id="sd-start-btn" style="flex:1;">报名「${chosenEvent.name}」· 进预赛</button>
            <button class="pill-btn soft" id="sd-skip-all" style="height:44px;padding:0 12px;">放弃参赛</button>
          </div>
        </div>
      </div>
    `;
    mountOverlay(html, (root) => {
      root.querySelectorAll('[data-sdevt]').forEach(btn => {
        btn.onclick = () => {
          chosenEvent = events.find(e => e.id === btn.dataset.sdevt) || events[0];
          renderSignup();
        };
      });
      root.querySelector('#sd-start-btn').onclick = () => launchRound(0);
      root.querySelector('#sd-skip-all').onclick = () => finishTournament(false, true);
    });
  };

  const showRoundIntermission = (roundIdx, won, detailTxt) => {
    cleanupGame();
    const r = ROUNDS[roundIdx];
    if (!won) {
      finishTournament(false, false);
      return;
    }
    passedRounds = roundIdx + 1;
    earnedHealth += r.hpReward;
    if (roundIdx === 2) {
      finishTournament(true, false);
      return;
    }
    const nextR = ROUNDS[roundIdx + 1];
    const html = `
      <div class="sd-full-overlay">
        <div class="sd-summary-card">
          <div class="sd-sum-badge">${r.name}晋级成功！</div>
          <h3>${chosenEvent.name} · 顺利闯入${nextR.name}</h3>
          <div class="sd-sum-desc">${detailTxt}<br/><b>已获得健康 +${r.hpReward}</b>（累计健康 +${earnedHealth}）。下一轮 <b>${nextR.name}（难度：${nextR.diffLabel}）</b> 即将鸣枪！</div>
          <div style="display:flex;gap:8px;">
            <button class="btn-go" id="sd-next-round" style="flex:1.5;">继续挑战${nextR.name}</button>
            <button class="pill-btn soft" id="sd-quit-mid" style="flex:0.8;height:44px;justify-content:center;">放弃弃权</button>
          </div>
        </div>
      </div>
    `;
    mountOverlay(html, (root) => {
      root.querySelector('#sd-next-round').onclick = () => launchRound(roundIdx + 1);
      root.querySelector('#sd-quit-mid').onclick = () => finishTournament(false, true);
    });
  };

  const quitModalHtml = `
    <div class="sd-quit-mask hidden" id="sd-quit-confirm">
      <div class="sd-quit-box">
        <b>确认放弃本轮比赛？</b>
        <p>弃权后结束本届校运会，前面已通过轮次获得的健康奖励照常保留。</p>
        <div class="sd-q-row">
          <button class="pill-btn soft" id="sd-q-keep">继续比赛</button>
          <button class="pill-btn primary" id="sd-q-yes">确认弃权</button>
        </div>
      </div>
    </div>
  `;

  const bindQuitButton = (root) => {
    const qBtn = root.querySelector('#sd-quit-btn');
    if (qBtn) {
      qBtn.onclick = () => root.querySelector('#sd-quit-confirm')?.classList.remove('hidden');
    }
    const cKeep = root.querySelector('#sd-q-keep');
    const cYes = root.querySelector('#sd-q-yes');
    if (cKeep) cKeep.onclick = () => root.querySelector('#sd-quit-confirm')?.classList.add('hidden');
    if (cYes) cYes.onclick = () => finishTournament(false, true);
  };

  // ==================== 1 & 2. 径赛实时赛场（100米直道冲刺 & 800/1000米椭圆弯道耐力） ====================
  const launchTrackRound = (roundIdx, isDistance) => {
    const r = ROUNDS[roundIdx];
    const isFemale = state.gender === 'female';
    const totalDist = isDistance ? (isFemale ? 800 : 1000) : 360;
    const displayMaxM = isDistance ? (isFemale ? 800 : 1000) : 100;
    const rival1Name = isDistance ? '4班体委' : '3班体委';
    const rival2Name = isDistance ? '2班长跑生' : '1班快腿';

    let myPos = 0;
    let ai1Pos = 0;
    let ai2Pos = 0;
    let speed = isDistance ? 15 : 6.2;
    let lastFoot = '';
    let strideCombo = 0;
    let stamina = 100;
    let paceGauge = 52; // 0..100, 绿区 38..70
    let holding = false;
    let sprintBurstTimer = 0;
    let dustPuffs = [];
    let ended = false;
    let rafId = 0;
    let lastTs = performance.now();

    const subRuleTxt = roundIdx === 2 ? '决赛第 1 名夺冠开启奥运梦' : '小组前 2 名晋级下一轮';

    const html = `
      <div class="sd-full-overlay sd2-arena">
        <canvas class="sd2-scene-cv" id="sd2-cv" width="195" height="422"></canvas>

        <!-- 顶部栏：严禁显示任何时间！仅保留轮次胶囊与放弃弃权 -->
        <div class="sd2-top-bar">
          <div class="sd2-ev-group">
            <div class="sd2-ev-pill"><i></i>${chosenEvent.name} · ${r.name}</div>
            <div class="sd2-sub-pill" id="sd2-sub-pill">${isDistance ? '第 1 圈 / 共 3 圈 · 稳步起跑' : subRuleTxt}</div>
          </div>
          <button class="sd2-quit-btn" id="sd-quit-btn">放弃弃权</button>
        </div>

        <!-- 裁判与三位实时多帧奔跑角色 -->
        <img class="sd2-spr" id="sd2-ref" src="${sprites.urls.referee}" alt="" style="display:none;" />
        <div class="sd2-runner" id="sd2-ai2">
          <span class="sd2-rtag" id="sd2-ai2-tag">${rival2Name}</span>
          <img class="sd2-rimg" id="sd2-ai2-img" src="${sprites.greenUrls[0]}" alt="" />
        </div>
        <div class="sd2-runner" id="sd2-ai1">
          <span class="sd2-rtag" id="sd2-ai1-tag">${rival1Name}</span>
          <img class="sd2-rimg" id="sd2-ai1-img" src="${sprites.redUrls[0]}" alt="" />
        </div>
        <div class="sd2-runner me" id="sd2-me">
          <span class="sd2-rtag me" id="sd2-me-tag">你 · 第 1 名</span>
          <img class="sd2-rimg" id="sd2-me-img" src="${sprites.runUrls[0]}" alt="" />
        </div>

        <!-- 右侧竖向实时赛程条 -->
        <div class="sd2-side-rail">
          <div class="sd2-rail-hd" id="sd2-rail-hd">终点<br>${displayMaxM}m</div>
          <div class="sd2-rail-track">
            <div class="sd2-rail-fill" id="sd2-rail-fill" style="height:0%"></div>
            <div class="sd2-rail-dot" id="sd2-dot-ai2" style="bottom:0%;background:#16a34a">${isDistance ? '2' : '1'}</div>
            <div class="sd2-rail-dot" id="sd2-dot-ai1" style="bottom:0%;background:#dc2626">${isDistance ? '4' : '3'}</div>
            <div class="sd2-rail-dot me" id="sd2-dot-me" style="bottom:0%;background:#c9683a">你</div>
          </div>
          <div class="sd2-rail-ft" id="sd2-rail-ft">0m</div>
        </div>

        <!-- 底部暖系手账操控台 -->
        <div class="sd2-deck">
          ${isDistance ? `
            <div class="sd2-stam-head">
              <span>心肺体力 <b id="sd2-stam-val" style="color:#16a34a">100 / 100</b></span>
              <span id="sd2-pace-tip" style="color:#15803d">指针稳在绿区 · 不掉体力!</span>
            </div>
            <div class="sd2-bar-wrap">
              <div class="sd2-bar-zone" style="left:38%;width:32%"></div>
              <div class="sd2-bar-needle" id="sd2-needle" style="left:52%"></div>
            </div>
            <div class="sd2-btn-1000">
              <button class="sd2-act-btn" id="sd2-hold-btn">
                <div class="txt"><b>按住 · 稳住呼吸配速</b><small>松手减速 · 按住提速控指针</small></div>
              </button>
              <button class="sd2-act-btn pri" id="sd2-burst-btn">
                <div class="txt"><b>最后冲刺</b><small>末圈爆发超越!</small></div>
              </button>
            </div>
          ` : `
            <div class="sd2-meter-row">
              <div class="sd2-meter-title" id="sd2-combo-txt">步频连击 <b style="color:#c9683a;font-size:15px">× 0</b> · 交替点按提速</div>
              <div class="sd2-meter-val" id="sd2-spd-txt">速度 6.2 m/s</div>
            </div>
            <div class="sd2-btn-grid2">
              <button class="sd2-act-btn" id="sd2-left-btn">${shoeSoleSvg(false)}<div class="txt"><b>左脚蹬地</b><small>左右交替连点</small></div></button>
              <button class="sd2-act-btn" id="sd2-right-btn">${shoeSoleSvg(true)}<div class="txt"><b>右脚蹬地</b><small>踩中节拍加速!</small></div></button>
            </div>
          `}
        </div>
        ${quitModalHtml}
      </div>
    `;

    mountOverlay(html, (root) => {
      bindQuitButton(root);
      const cv = root.querySelector('#sd2-cv');
      const g = cv.getContext('2d');
      g.imageSmoothingEnabled = false;
      const W = 195, H = 422;

      const subPill = root.querySelector('#sd2-sub-pill');
      const refEl = root.querySelector('#sd2-ref');
      const ai1El = root.querySelector('#sd2-ai1');
      const ai2El = root.querySelector('#sd2-ai2');
      const meEl = root.querySelector('#sd2-me');
      const ai1Img = root.querySelector('#sd2-ai1-img');
      const ai2Img = root.querySelector('#sd2-ai2-img');
      const meImg = root.querySelector('#sd2-me-img');
      const ai1Tag = root.querySelector('#sd2-ai1-tag');
      const ai2Tag = root.querySelector('#sd2-ai2-tag');
      const meTag = root.querySelector('#sd2-me-tag');
      const railHd = root.querySelector('#sd2-rail-hd');
      const railFill = root.querySelector('#sd2-rail-fill');
      const railFt = root.querySelector('#sd2-rail-ft');
      const dotMe = root.querySelector('#sd2-dot-me');
      const dotAi1 = root.querySelector('#sd2-dot-ai1');
      const dotAi2 = root.querySelector('#sd2-dot-ai2');

      const spawnDust = (lx, ly) => {
        dustPuffs.push({ x: lx + (Math.random() * 10 - 5), y: ly, life: 0.35 });
      };

      let onKey = null;
      if (!isDistance) {
        const lBtn = root.querySelector('#sd2-left-btn');
        const rBtn = root.querySelector('#sd2-right-btn');
        const comboEl = root.querySelector('#sd2-combo-txt');
        const spdEl = root.querySelector('#sd2-spd-txt');

        const hitStep = (foot) => {
          if (ended) return;
          const activeBtn = foot === 'L' ? lBtn : rBtn;
          const otherBtn = foot === 'L' ? rBtn : lBtn;
          activeBtn.classList.add('gold');
          otherBtn.classList.remove('gold');
          setTimeout(() => activeBtn.classList.remove('gold'), 120);

          if (foot !== lastFoot) {
            strideCombo++;
            speed = Math.min(18.6, speed + 1.55);
            triggerHaptic('light');
            spawnDust(97 + (foot === 'L' ? -6 : 6), 328);
          } else {
            strideCombo = Math.max(0, strideCombo - 2);
            speed = Math.max(5.5, speed - 0.65);
          }
          lastFoot = foot;
          comboEl.innerHTML = `步频连击 <b style="color:#c9683a;font-size:15px">× ${strideCombo}</b> · ${strideCombo >= 8 ? '金色极速步频!' : '交替点按提速'}`;
          spdEl.textContent = `速度 ${(speed * 0.56).toFixed(1)} m/s`;
        };

        lBtn.onpointerdown = e => { e.preventDefault(); hitStep('L'); };
        rBtn.onpointerdown = e => { e.preventDefault(); hitStep('R'); };
        onKey = e => {
          if (e.repeat) return;
          if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') hitStep('L');
          if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') hitStep('R');
        };
        window.addEventListener('keydown', onKey);
      } else {
        const holdBtn = root.querySelector('#sd2-hold-btn');
        const burstBtn = root.querySelector('#sd2-burst-btn');
        const startHold = e => { e.preventDefault(); holding = true; holdBtn.classList.add('gold'); };
        const endHold = () => { holding = false; holdBtn.classList.remove('gold'); };
        holdBtn.onpointerdown = startHold;
        holdBtn.onpointerup = endHold;
        holdBtn.onpointerleave = endHold;
        holdBtn.onpointercancel = endHold;
        burstBtn.onpointerdown = e => {
          e.preventDefault();
          if (stamina > 7) {
            sprintBurstTimer = 0.45;
            stamina = Math.max(0, stamina - 6);
            speed = Math.min(35, speed + 5.8);
            triggerHaptic('medium');
            spawnDust(104, 326);
          }
        };
      }

      const drawTrackScene = (now, dt) => {
        const rect = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };
        const scrollPx = Math.floor(myPos * 3.4);

        if (!isDistance) {
          drawPixelStadiumHeader(g, W, H, 112, now);
          for (let y = 112; y < H; y++) {
            const t = (y - 112) / (H - 112);
            const halfW = 34 + t * 62;
            const xL = Math.round(W / 2 - halfW), xR = Math.round(W / 2 + halfW);
            rect(xL - 2, y, xR - xL + 4, 1, '#4a3728');
            const worldY = y - scrollPx;
            rect(xL, y, xR - xL, 1, (((worldY % 8) + 8) % 8 === 0) ? '#bc4f32' : '#cc5a3b');
            rect(xL, y, 2, 1, '#fff8eb');
            rect(xR - 2, y, 2, 1, '#fff8eb');
            if ((((Math.floor(worldY / 7)) % 2) + 2) % 2 === 0) {
              rect(Math.round(xL + (xR - xL) * 0.333), y, 2, 1, '#fff8eb');
              rect(Math.round(xL + (xR - xL) * 0.666), y, 2, 1, '#fff8eb');
            }
            if ((((worldY % 58) + 58) % 58) === 0) {
              rect(xL, y, xR - xL, 1, 'rgba(255,248,235,0.68)');
            }
          }

          // 终点龙门与冲刺白带（随距离靠近由远及近放大！）
          const remRatio = Math.max(0, (totalDist - myPos) / totalDist);
          const finT = remRatio < 0.32 ? (1 - remRatio / 0.32) : 0;
          const finY = Math.round(112 + finT * 195);
          const finHalfW = 34 + ((finY - 112) / (H - 112)) * 62;
          const fxL = Math.round(W / 2 - finHalfW), fxR = Math.round(W / 2 + finHalfW);
          const postH = Math.round(22 + finT * 24);
          rect(fxL, finY - postH, 3, postH + 2, '#4a3728');
          rect(fxR - 3, finY - postH, 3, postH + 2, '#4a3728');
          rect(fxL, finY - postH - 2, fxR - fxL, 7, '#dc2626');
          rect(fxL + 2, finY - postH - 1, fxR - fxL - 4, 1, '#fef08a');
          rect(fxL + 2, finY - 5, fxR - fxL - 4, 2, '#fffdf9');

          if (refEl) {
            refEl.style.display = 'block';
            refEl.style.left = `${Math.min(92, 77 + finT * 14)}%`;
            refEl.style.top = `${Math.min(72, 23 + finT * 36)}%`;
            refEl.style.height = `${Math.round(74 + finT * 24)}px`;
          }

          // 冲刺速度线
          if (strideCombo >= 6 || speed > 12) {
            const off = Math.floor(now / 45) % 24;
            rect(78, 290 + off, 1, 18, 'rgba(255,250,235,0.78)');
            rect(116, 282 + ((off + 11) % 24), 1, 20, 'rgba(255,250,235,0.78)');
          }
        } else {
          // 椭圆弯道跑道：实时滚过弯道标牌与分道虚线
          drawPixelStadiumHeader(g, W, H, 108, now);
          for (let y = 108; y < H; y++) {
            const t = (y - 108) / (H - 108);
            const curveShift = Math.pow(1 - t, 2.1) * -68;
            const center = W / 2 + 18 + curveShift;
            const halfW = 28 + t * 58;
            const xL = Math.round(center - halfW), xR = Math.round(center + halfW);
            const worldY = y - scrollPx;
            if (xL > 4) rect(xL - 3, y, 3, 1, '#fffdf9');
            rect(xL, y, xR - xL, 1, (((worldY % 8) + 8) % 8 === 0) ? '#bc4f32' : '#cc5a3b');
            rect(xR - 2, y, 2, 1, '#fff8eb');
            if ((((Math.floor(worldY / 7)) % 2) + 2) % 2 === 0) {
              rect(Math.round(xL + (xR - xL) * 0.34), y, 2, 1, '#fff8eb');
              rect(Math.round(xL + (xR - xL) * 0.67), y, 2, 1, '#fff8eb');
            }
          }
          // 内场滚动里程牌
          const signY = 128 + ((scrollPx * 0.6) % 160);
          const signT = (signY - 108) / (H - 108);
          const signX = Math.max(8, Math.round(W / 2 + 18 + Math.pow(1 - signT, 2.1) * -68 - (28 + signT * 58) - 24));
          rect(signX, signY, 22, 12, '#4a3728');
          rect(signX + 1, signY + 1, 20, 10, '#fffdf9');
          rect(signX + 4, signY + 4, 14, 2, '#c9683a');
          rect(signX + 10, signY + 12, 2, 7, '#4a3728');
        }

        // 实时扬尘粒子
        dustPuffs = dustPuffs.filter(p => p.life > 0);
        for (const p of dustPuffs) {
          p.life -= dt;
          p.y += dt * 18;
          rect(p.x, p.y, 5, 3, '#f5e6cc');
          rect(p.x + 1, p.y - 2, 3, 2, '#fffdf9');
        }
      };

      const tick = (now) => {
        if (ended) return;
        const dt = Math.min(0.05, (now - lastTs) / 1000);
        lastTs = now;

        let isDrafting = false;
        if (!isDistance) {
          speed = Math.max(5.0, speed - dt * 5.0);
          myPos += speed * dt;
          const baseAi = 10.5 * r.aiMult;
          ai1Pos += (baseAi * (0.97 + 0.06 * Math.sin(now / 520))) * dt;
          ai2Pos += (baseAi * (0.93 + 0.07 * Math.cos(now / 610))) * dt;
          const spdEl = root.querySelector('#sd2-spd-txt');
          if (spdEl) spdEl.textContent = `速度 ${(speed * 0.56).toFixed(1)} m/s`;
        } else {
          paceGauge = Math.max(4, Math.min(96, paceGauge + (holding ? 40 : -29) * dt));
          const inGreen = paceGauge >= 38 && paceGauge <= 70;
          const inRed = paceGauge > 70;
          const leadDiff = Math.max(ai1Pos - myPos, ai2Pos - myPos);
          isDrafting = leadDiff > 4 && leadDiff < 55 && inGreen;

          if (inRed) {
            stamina = Math.max(0, stamina - 15.5 * dt);
            speed = stamina > 5 ? 25.5 : 13.5;
          } else if (inGreen) {
            stamina = Math.min(100, stamina + (isDrafting ? 5.2 : 3.5) * dt);
            speed = isDrafting ? 23.6 : 22.8;
          } else {
            stamina = Math.min(100, stamina + 7.2 * dt);
            speed = 16.5;
          }
          if (sprintBurstTimer > 0) {
            sprintBurstTimer -= dt;
            speed = Math.max(speed, 29.5);
          }
          myPos += speed * dt;
          const baseAi = 21.6 * r.aiMult;
          ai1Pos += baseAi * dt;
          ai2Pos += (baseAi * 0.96) * dt;

          const needleEl = root.querySelector('#sd2-needle');
          const stamEl = root.querySelector('#sd2-stam-val');
          const tipEl = root.querySelector('#sd2-pace-tip');
          if (needleEl) needleEl.style.left = `${paceGauge}%`;
          if (stamEl) {
            stamEl.textContent = `${Math.round(stamina)} / 100`;
            stamEl.style.color = stamina < 30 ? '#dc2626' : '#16a34a';
          }
          if (tipEl) {
            tipEl.textContent = myPos > totalDist * 0.76
              ? '末圈冲刺窗口！猛点右侧最后冲刺！'
              : (inGreen ? (isDrafting ? '尾流省力 +15% · 保持绿区!' : '指针稳在绿区 · 不掉体力!') : (inRed ? '配速过快 · 正在耗体力!' : '配速偏慢 · 按住加速进绿区'));
            tipEl.style.color = inRed ? '#b91c1c' : '#15803d';
          }
        }

        if (Math.random() < dt * (speed > 14 ? 9 : 4)) {
          spawnDust(isDistance ? 105 : 97, 326);
        }

        drawTrackScene(now, dt);

        // 实时切换主角与两位对手的跑步循环帧（彻底告别静态贴纸！）
        const myFrameIdx = Math.floor(myPos * 0.42) % 4;
        const ai1FrameIdx = Math.floor(ai1Pos * 0.42 + 1) % 4;
        const ai2FrameIdx = Math.floor(ai2Pos * 0.42 + 3) % 4;

        const wantMeSrc = (!isDistance && (strideCombo >= 6 || speed > 13.5) && myFrameIdx % 2 === 1)
          ? sprites.urls.sprint
          : (isDistance && stamina < 36 && myFrameIdx % 2 === 0 ? sprites.urls.tired : sprites.runUrls[myFrameIdx]);
        if (meImg.src !== wantMeSrc) meImg.src = wantMeSrc;
        if (ai1Img.src !== sprites.redUrls[ai1FrameIdx]) ai1Img.src = sprites.redUrls[ai1FrameIdx];
        if (ai2Img.src !== sprites.greenUrls[ai2FrameIdx]) ai2Img.src = sprites.greenUrls[ai2FrameIdx];

        const pct = Math.min(100, (myPos / totalDist) * 100);
        const ai1Pct = Math.min(100, (ai1Pos / totalDist) * 100);
        const ai2Pct = Math.min(100, (ai2Pos / totalDist) * 100);
        const rank = 1 + (ai1Pos > myPos ? 1 : 0) + (ai2Pos > myPos ? 1 : 0);

        if (isDistance) {
          const lap = Math.min(3, Math.floor((myPos / totalDist) * 3) + 1);
          subPill.textContent = `第 ${lap} 圈 / 共 3 圈 · ${isDrafting ? '跟跑省力中' : subRuleTxt}`;
          railHd.innerHTML = `第${lap}圈<br>${Math.round(pct)}%`;
          railFt.textContent = `剩${Math.max(0, 3 - lap + 1)}圈`;
          meTag.textContent = `你 · 第 ${rank} 名${isDrafting ? '（尾流省力）' : ''}`;
        } else {
          const dispM = Math.min(displayMaxM, Math.round((pct / 100) * displayMaxM));
          railFt.textContent = `${dispM}m`;
          meTag.textContent = `你 · 第 ${rank} 名（${dispM}m）`;
        }

        railFill.style.height = `${pct.toFixed(1)}%`;
        dotMe.style.bottom = `${pct.toFixed(1)}%`;
        dotAi1.style.bottom = `${ai1Pct.toFixed(1)}%`;
        dotAi2.style.bottom = `${ai2Pct.toFixed(1)}%`;

        ai1Tag.textContent = `${rival1Name} · 第${1 + (myPos >= ai1Pos ? 1 : 0) + (ai2Pos > ai1Pos ? 1 : 0)}`;
        ai2Tag.textContent = `${rival2Name} · 第${1 + (myPos >= ai2Pos ? 1 : 0) + (ai1Pos >= ai2Pos ? 1 : 0)}`;

        // 根据与主角的相对距离动态计算跑道透视纵深位置与缩放
        const placeRival = (el, rPos, laneOffset) => {
          const diff = rPos - myPos;
          const topPct = Math.max(27, Math.min(73, 52 - diff * (isDistance ? 0.24 : 0.42)));
          const t = Math.max(0, Math.min(1, (topPct - 25) / 50));
          let leftPct;
          if (!isDistance) {
            const halfSpanPct = 17 + t * 26;
            leftPct = 50 + laneOffset * halfSpanPct * 0.66;
          } else {
            const curveShiftPct = (Math.pow(1 - t, 2.1) * -68) / 195 * 100;
            const centerPct = 59 + curveShiftPct;
            const halfSpanPct = 14 + t * 24;
            leftPct = centerPct + laneOffset * halfSpanPct * 0.55;
          }
          const hPx = Math.round(92 + t * 82);
          el.style.top = `${topPct.toFixed(1)}%`;
          el.style.left = `${leftPct.toFixed(1)}%`;
          el.querySelector('img').style.height = `${hPx}px`;
          el.style.zIndex = topPct > 56 ? '14' : '11';
        };
        placeRival(ai1El, ai1Pos, -1);
        placeRival(ai2El, ai2Pos, isDistance ? 0.65 : 1);

        // 主角轻微跑步呼吸起伏
        const bob = Math.round(Math.abs(Math.sin(myPos * 0.65)) * 4);
        meEl.style.bottom = `${152 + bob}px`;
        meEl.style.left = isDistance ? '53%' : '50%';

        if (myPos >= totalDist) {
          ended = true;
          if (onKey) window.removeEventListener('keydown', onKey);
          const needRank = roundIdx === 2 ? 1 : 2;
          const won = rank <= needRank;
          showRoundIntermission(roundIdx, won, `你以第 ${rank} 名冲过终点白带！`);
          return;
        }
        rafId = requestAnimationFrame(tick);
      };
      rafId = requestAnimationFrame(tick);
      activeCleanup = () => {
        ended = true;
        if (onKey) window.removeEventListener('keydown', onKey);
        if (rafId) cancelAnimationFrame(rafId);
      };
    });
  };

  // ==================== 3. 跳远实时赛场（助跑提膝 -> 白板松手 -> 抛物线收腹腾空 -> 落沙蹲姿） ====================
  const launchLongJumpRound = (roundIdx) => {
    const r = ROUNDS[roundIdx];
    let triesDone = 0;
    let tryResults = [null, null, null]; // 'pass' | 'fail' | null
    let bestDist = 0;
    let phase = 'ready'; // ready | charging | airborne | settled
    let runProgress = 0; // 0..100 (74..87 为起跳白板完美区, >88 踩红泥犯规)
    let airT = 0;
    let airTargetDist = 4.5;
    let sandParticles = [];
    let ended = false;
    let rafId = 0;
    let lastTs = performance.now();

    const html = `
      <div class="sd-full-overlay sd2-arena">
        <canvas class="sd2-scene-cv" id="sd2-lj-cv" width="195" height="422"></canvas>

        <div class="sd2-top-bar">
          <div class="sd2-ev-group">
            <div class="sd2-ev-pill"><i></i>跳远 · ${r.name}</div>
            <div class="sd2-sub-pill" id="sd2-lj-dots"></div>
          </div>
          <button class="sd2-quit-btn" id="sd-quit-btn">放弃弃权</button>
        </div>

        <span class="sd2-rtag" style="position:absolute;left:64px;top:276px;background:#fee2e2;z-index:12">${(r.jumpTarget + 0.55).toFixed(2)}m 校纪录线</span>
        <span class="sd2-rtag" style="position:absolute;left:64px;top:330px;z-index:12">${r.jumpTarget.toFixed(2)}m 晋级线</span>

        <!-- 右侧沙坑下方白旗裁判（绝不遮挡右上蓄力条） -->
        <img class="sd2-spr" src="${sprites.urls.referee}" alt="" style="left:82%;top:46%;height:88px;" />
        <img class="sd2-spr" id="sd2-lj-ghost" src="${sprites.urls.ljHang}" alt="" style="display:none;opacity:0.42;filter:drop-shadow(0 0 4px #facc15);" />

        <div class="sd2-runner me" id="sd2-lj-me" style="left:50%;bottom:154px;">
          <span class="sd2-rtag me" id="sd2-lj-tag">按住下方按钮开始助跑</span>
          <img class="sd2-rimg" id="sd2-lj-img" src="${sprites.runUrls[1]}" alt="" style="height:176px;" />
        </div>

        <div class="sd2-side-rail">
          <div class="sd2-rail-hd">助跑<br>蓄力</div>
          <div class="sd2-rail-track">
            <div class="sd2-rail-fill" id="sd2-lj-fill" style="height:0%"></div>
          </div>
          <div class="sd2-rail-ft" id="sd2-lj-pct">0%</div>
        </div>

        <div class="sd2-deck">
          <div class="sd2-meter-row">
            <div class="sd2-meter-title" id="sd2-lj-status">起跳板判定：<b>达标线 ${r.jumpTarget.toFixed(2)}m</b></div>
            <div class="sd2-meter-val" id="sd2-lj-warn">不踩红线!</div>
          </div>
          <button class="sd2-act-btn gold" id="sd2-lj-btn" style="height:64px;width:100%;">
            <div class="txt" style="text-align:center;">
              <b id="sd2-lj-btntxt">按住助跑加速 · 踩上白板瞬间松手起跳!</b>
              <small id="sd2-lj-btnsub">越贴近白板前沿松手飞得越远 · 过红线算犯规</small>
            </div>
          </button>
        </div>
        ${quitModalHtml}
      </div>
    `;

    mountOverlay(html, (root) => {
      bindQuitButton(root);
      const cv = root.querySelector('#sd2-lj-cv');
      const g = cv.getContext('2d');
      g.imageSmoothingEnabled = false;
      const W = 195, H = 422;

      const dotsEl = root.querySelector('#sd2-lj-dots');
      const meWrap = root.querySelector('#sd2-lj-me');
      const meImg = root.querySelector('#sd2-lj-img');
      const meTag = root.querySelector('#sd2-lj-tag');
      const ghostEl = root.querySelector('#sd2-lj-ghost');
      const fillEl = root.querySelector('#sd2-lj-fill');
      const pctEl = root.querySelector('#sd2-lj-pct');
      const statusEl = root.querySelector('#sd2-lj-status');
      const warnEl = root.querySelector('#sd2-lj-warn');
      const btnEl = root.querySelector('#sd2-lj-btn');
      const btnTxt = root.querySelector('#sd2-lj-btntxt');
      const btnSub = root.querySelector('#sd2-lj-btnsub');
      const chargeSpeed = 50 + roundIdx * 11;

      const renderDots = () => {
        const dots = [0, 1, 2].map(i => {
          const st = tryResults[i];
          const cls = st === 'pass' ? 'pass' : (st === 'fail' ? 'fail' : (i === triesDone ? 'cur' : ''));
          return `<span class="sd2-dot ${cls}"></span>`;
        }).join('');
        dotsEl.innerHTML = `试跳 ${dots} · 最佳 ${bestDist.toFixed(2)}m`;
      };

      const resetTry = () => {
        if (triesDone >= 3) {
          showRoundIntermission(roundIdx, bestDist >= r.jumpTarget, `三跳最佳成绩 ${bestDist.toFixed(2)} 米！`);
          return;
        }
        phase = 'ready';
        runProgress = 0;
        airT = 0;
        sandParticles = [];
        ghostEl.style.display = 'none';
        meImg.src = sprites.runUrls[1];
        meImg.style.height = '176px';
        meWrap.style.left = '50%';
        meWrap.style.bottom = '154px';
        meTag.textContent = `第 ${triesDone + 1} 跳准备就绪`;
        fillEl.style.height = '0%';
        pctEl.textContent = '0%';
        statusEl.innerHTML = `起跳板判定：<b>达标线 ${r.jumpTarget.toFixed(2)}m</b>`;
        warnEl.textContent = '不踩红线!';
        btnTxt.textContent = '按住助跑加速 · 踩上白板瞬间松手起跳!';
        btnSub.textContent = '越贴近白板前沿松手飞得越远 · 过红线算犯规';
        renderDots();
      };

      btnEl.onpointerdown = e => {
        e.preventDefault();
        if (phase === 'settled') {
          resetTry();
          return;
        }
        if (phase !== 'ready') return;
        phase = 'charging';
        lastTs = performance.now();
        btnTxt.textContent = '正在加速冲向起跳白板… 踩中白板立刻松手!';
        triggerHaptic('light');
      };

      const doRelease = () => {
        if (phase !== 'charging') return;
        ghostEl.style.display = 'none';
        if (runProgress > 88.5) {
          phase = 'settled';
          tryResults[triesDone] = 'fail';
          triesDone++;
          renderDots();
          meTag.textContent = '踩过红泥线 · 犯规无效!';
          statusEl.innerHTML = `<b style="color:#b91c1c">红旗犯规！助跑过猛踩过起跳红线</b>`;
          warnEl.textContent = `剩 ${3 - triesDone} 跳`;
          btnTxt.textContent = triesDone < 3 ? '点此准备下一跳' : '查看本轮最终成绩 ›';
          btnSub.textContent = '提早半拍在白色木板上松手即可有效起跳';
          triggerHaptic('heavy');
          return;
        }
        // 进入真实抛物线收腹腾空飞行！
        const sweetDiff = Math.abs(runProgress - 82);
        const rawScore = Math.max(3.65, (5.66 - sweetDiff * 0.046) + (Math.random() * 0.1 - 0.03));
        airTargetDist = Number(rawScore.toFixed(2));
        phase = 'airborne';
        airT = 0;
        meImg.src = sprites.urls.ljHang;
        meTag.textContent = '收腹腾空飞行中!';
        triggerHaptic('medium');
      };

      btnEl.onpointerup = doRelease;
      btnEl.onpointercancel = doRelease;
      btnEl.onpointerleave = () => { if (phase === 'charging') doRelease(); };

      const drawLongJumpScene = (now, dt) => {
        const rect = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };
        drawPixelStadiumHeader(g, W, H, 106, now);

        // 暖黄像素沙坑 (y: 122..220)，底边直接衔接红泥线与白色起跳板
        rect(34, 122, 127, 98, '#4a3728');
        rect(36, 124, 123, 95, '#e6c88c');
        for (let y = 130; y < 214; y += 9) rect(40 + (y % 5) * 3, y, 110, 2, '#d6b272');
        [[190, '#fffdf9'], [162, '#fffdf9'], [136, '#ef4444']].forEach(([ly, col]) => {
          for (let x = 40; x < 155; x += 6) rect(x, ly, 3, 1, col);
        });

        // 红色单助跑道（从起跳白板下沿 y=232 向近处延伸，绝不穿模到白板上方）
        const scroll = Math.floor(runProgress * 1.8);
        for (let y = 232; y < H; y++) {
          const t = (y - 232) / (H - 232);
          const halfW = 22 + t * 36;
          const xL = Math.round(W / 2 - halfW), xR = Math.round(W / 2 + halfW);
          rect(xL - 2, y, xR - xL + 4, 1, '#4a3728');
          rect(xL, y, xR - xL, 1, (((y - scroll) % 6 + 6) % 6 === 0) ? '#bc4f32' : '#cc5a3b');
          rect(xL, y, 2, 1, '#fff8eb');
          rect(xR - 2, y, 2, 1, '#fff8eb');
        }

        // 红泥犯规线 (y: 220..223) 与白色起跳板 (y: 223..232)
        const inSweet = runProgress >= 72 && runProgress <= 88;
        rect(74, 220, 47, 3, '#dc2626');
        rect(73, 223, 49, 9, inSweet ? '#fef08a' : '#ffffff');
        rect(72, 219, 51, 1, '#4a3728');
        rect(72, 232, 51, 1, '#4a3728');
        if (phase === 'charging') {
          rect(70, 218, 55, 16, inSweet ? 'rgba(74,222,128,0.45)' : 'rgba(250,204,21,0.32)');
          // 抛物线预测虚线
          for (let i = 0; i <= 14; i += 2) {
            const u = i / 14;
            const py = 224 - u * (45 + runProgress * 0.42) - Math.sin(u * Math.PI) * 30;
            rect(97 + Math.sin(u * Math.PI) * 5, py, 3, 3, '#fef08a');
          }
        }

        // 落地沙粒飞溅特效
        sandParticles = sandParticles.filter(p => p.life > 0);
        for (const p of sandParticles) {
          p.life -= dt;
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          p.vy += 85 * dt;
          rect(p.x, p.y, 3, 3, '#cfa972');
        }
      };

      const tick = (now) => {
        if (ended) return;
        const dt = Math.min(0.05, (now - lastTs) / 1000);
        lastTs = now;

        if (phase === 'charging') {
          runProgress += chargeSpeed * dt;
          const pct = Math.min(100, Math.round(runProgress));
          fillEl.style.height = `${pct}%`;
          pctEl.textContent = `${pct}%`;

          // 助跑多帧实时奔跑切换，靠近白板切提膝准备帧
          const fIdx = Math.floor(runProgress * 0.45) % 4;
          const wantSrc = runProgress > 68 ? sprites.urls.ljRunup : sprites.runUrls[fIdx];
          if (meImg.src !== wantSrc) meImg.src = wantSrc;

          const botPx = 154 + Math.min(95, runProgress) * 2.15;
          const hPx = Math.round(176 - runProgress * 0.42);
          meWrap.style.bottom = `${botPx.toFixed(1)}px`;
          meImg.style.height = `${hPx}px`;

          if (runProgress >= 72 && runProgress <= 88) {
            meTag.textContent = '踩中起跳白板 · 立刻松手!';
            statusEl.innerHTML = `起跳仰角锁定：<b style="color:#15803d">黄金 42° 完美白板区!</b>`;
            ghostEl.style.display = 'block';
            ghostEl.style.left = '42%';
            ghostEl.style.top = '26%';
            ghostEl.style.height = '96px';
          }

          if (runProgress >= 95) doRelease();
        } else if (phase === 'airborne') {
          airT += dt / 0.62;
          const u = Math.min(1, airT);
          const startBot = 342;
          const landBot = Math.min(595, 425 + (airTargetDist - 3.6) * 72);
          const arcLift = Math.sin(u * Math.PI) * 92;
          meWrap.style.bottom = `${(startBot + (landBot - startBot) * u + arcLift).toFixed(1)}px`;
          meImg.style.height = `${Math.round(136 - u * 22 + Math.sin(u * Math.PI) * 14)}px`;

          if (airT >= 1) {
            phase = 'settled';
            meImg.src = sprites.urls.ljLand;
            meImg.style.height = '112px';
            meWrap.style.bottom = `${landBot.toFixed(1)}px`;
            if (airTargetDist > bestDist) bestDist = airTargetDist;
            const passed = airTargetDist >= r.jumpTarget;
            tryResults[triesDone] = passed ? 'pass' : 'fail';
            triesDone++;
            renderDots();
            // 溅起沙坑沙粒
            const sandY = H - (landBot / 2);
            for (let k = 0; k < 12; k++) {
              sandParticles.push({
                x: 97 + (Math.random() * 20 - 10),
                y: Math.max(130, Math.min(208, sandY)),
                vx: (Math.random() - 0.5) * 65,
                vy: -25 - Math.random() * 35,
                life: 0.45
              });
            }
            meTag.textContent = `有效落点 ${airTargetDist.toFixed(2)}m!`;
            statusEl.innerHTML = passed
              ? `<b style="color:#15803d">漂亮！飞出 ${airTargetDist.toFixed(2)}m 越过晋级线！</b>`
              : `本跳成绩 <b>${airTargetDist.toFixed(2)}m</b>（差 ${(r.jumpTarget - airTargetDist).toFixed(2)}m 过线）`;
            warnEl.textContent = `最佳 ${bestDist.toFixed(2)}m`;
            btnTxt.textContent = triesDone < 3 ? '点此继续下一跳' : '确认本轮最终成绩 ›';
            btnSub.textContent = passed ? '已达晋级标准，可继续冲击更远纪录！' : `还剩 ${3 - triesDone} 次试跳机会`;
          }
        }

        drawLongJumpScene(now, dt);
        rafId = requestAnimationFrame(tick);
      };

      resetTry();
      rafId = requestAnimationFrame(tick);
      activeCleanup = () => { ended = true; if (rafId) cancelAnimationFrame(rafId); };
    });
  };

  // ==================== 4. 跳高实时赛场（J字弧线双拍踩点 -> 背越式拱身跃过横杆 -> 仰卧蓝海绵垫） ====================
  const launchHighJumpRound = (roundIdx) => {
    const r = ROUNDS[roundIdx];
    let triesDone = 0;
    let tryResults = [null, null, null];
    let cleared = false;
    let step = 0; // 0:助跑待踩第①拍 | 1:起跳点待按第②拍 | 2:空中背越飞行动画 | 3:落垫结算
    let cursor = 12;
    let dir = 1;
    let firstHit = false;
    let jumpSuccess = false;
    let flightT = 0;
    let barFallY = 0;
    let ended = false;
    let rafId = 0;
    let lastTs = performance.now();

    const sweetMin = 36 + roundIdx * 4;
    const sweetWidth = 26 - roundIdx * 4;
    const sweetMax = sweetMin + sweetWidth;

    const html = `
      <div class="sd-full-overlay sd2-arena">
        <canvas class="sd2-scene-cv" id="sd2-hj-cv" width="195" height="422"></canvas>

        <div class="sd2-top-bar">
          <div class="sd2-ev-group">
            <div class="sd2-ev-pill"><i></i>跳高 · ${r.name}</div>
            <div class="sd2-sub-pill" id="sd2-hj-dots"></div>
          </div>
          <button class="sd2-quit-btn" id="sd-quit-btn">放弃弃权</button>
        </div>

        <img class="sd2-spr" src="${sprites.urls.referee}" alt="" style="left:82%;top:31%;height:84px;" />
        <img class="sd2-spr" id="sd2-hj-trail" src="${sprites.urls.hjTakeoff}" alt="" style="display:none;opacity:0.3;" />

        <div class="sd2-runner me" id="sd2-hj-me" style="left:72%;bottom:168px;">
          <span class="sd2-rtag me" id="sd2-hj-tag">沿 J 字弧线助跑</span>
          <img class="sd2-rimg" id="sd2-hj-img" src="${sprites.runUrls[0]}" alt="" style="height:158px;" />
        </div>

        <div class="sd2-deck">
          <div class="sd2-meter-row">
            <div class="sd2-meter-title" id="sd2-hj-status">双拍起跳判定：<b style="color:#15803d">指针进绿区点第①拍踩弧线!</b></div>
            <div class="sd2-meter-val">${r.highTarget.toFixed(2)}m</div>
          </div>
          <div class="sd2-bar-wrap">
            <div class="sd2-bar-zone" style="left:${sweetMin}%;width:${sweetWidth}%"></div>
            <div class="sd2-bar-needle" id="sd2-hj-needle" style="left:12%"></div>
          </div>
          <div class="sd2-btn-grid2">
            <button class="sd2-act-btn gold" id="sd2-hj-b1">
              <div class="txt"><b>① 踩弧线节拍</b><small id="sd2-hj-b1sub">看准绿区点击切入!</small></div>
            </button>
            <button class="sd2-act-btn" id="sd2-hj-b2">
              <div class="txt"><b>② 腾空背越过杆</b><small id="sd2-hj-b2sub">待第①拍完成后触发</small></div>
            </button>
          </div>
        </div>
        ${quitModalHtml}
      </div>
    `;

    mountOverlay(html, (root) => {
      bindQuitButton(root);
      const cv = root.querySelector('#sd2-hj-cv');
      const g = cv.getContext('2d');
      g.imageSmoothingEnabled = false;
      const W = 195, H = 422;

      const dotsEl = root.querySelector('#sd2-hj-dots');
      const meWrap = root.querySelector('#sd2-hj-me');
      const meImg = root.querySelector('#sd2-hj-img');
      const meTag = root.querySelector('#sd2-hj-tag');
      const trailEl = root.querySelector('#sd2-hj-trail');
      const statusEl = root.querySelector('#sd2-hj-status');
      const needleEl = root.querySelector('#sd2-hj-needle');
      const b1 = root.querySelector('#sd2-hj-b1');
      const b2 = root.querySelector('#sd2-hj-b2');
      const b1Sub = root.querySelector('#sd2-hj-b1sub');
      const b2Sub = root.querySelector('#sd2-hj-b2sub');
      const meterSpeed = 86 + roundIdx * 22;

      const renderDots = () => {
        const dots = [0, 1, 2].map(i => {
          const st = tryResults[i];
          const cls = st === 'pass' ? 'pass' : (st === 'fail' ? 'fail' : (i === triesDone ? 'cur' : ''));
          return `<span class="sd2-dot ${cls}"></span>`;
        }).join('');
        dotsEl.innerHTML = `挑战横杆 ${r.highTarget.toFixed(2)}m · 试跳 ${dots}`;
      };

      const resetTry = () => {
        if (cleared) {
          showRoundIntermission(roundIdx, true, `完美背越式跃过 ${r.highTarget.toFixed(2)} 米横杆！`);
          return;
        }
        if (triesDone >= 3) {
          showRoundIntermission(roundIdx, false, `三次试跳均未能越过 ${r.highTarget.toFixed(2)} 米横杆。`);
          return;
        }
        step = 0;
        barFallY = 0;
        flightT = 0;
        trailEl.style.display = 'none';
        meImg.src = sprites.runUrls[0];
        meImg.style.height = '158px';
        meImg.style.width = 'auto';
        meWrap.style.left = '72%';
        meWrap.style.bottom = '168px';
        meTag.textContent = `第 ${triesDone + 1} 跳 · J 字弧线助跑`;
        statusEl.innerHTML = `双拍起跳判定：<b style="color:#15803d">指针进绿区点第①拍踩弧线!</b>`;
        b1.className = 'sd2-act-btn gold';
        b2.className = 'sd2-act-btn';
        b1Sub.textContent = '看准绿区点击切入!';
        b2Sub.textContent = '待第①拍完成后触发';
        renderDots();
      };

      const handleBeatTap = (which) => {
        if (ended) return;
        if (step === 3) {
          resetTry();
          return;
        }
        const hit = cursor >= sweetMin - 4 && cursor <= sweetMax + 4;
        if (step === 0 && which === 1) {
          firstHit = hit;
          step = 1;
          meImg.src = sprites.urls.hjTakeoff;
          meImg.style.height = '172px';
          meWrap.style.left = '53%';
          meWrap.style.bottom = '284px';
          meTag.textContent = hit ? 'J 字弧线踩准 · 准备拔地!' : '切入稍偏 · 第②拍抓准补救!';
          statusEl.innerHTML = hit
            ? `双拍起跳判定：<b style="color:#15803d">第①拍完美 · 看准绿区按第②拍!</b>`
            : `双拍起跳判定：<b style="color:#c9683a">抓准第②拍绿区全力过杆!</b>`;
          b1.className = 'sd2-act-btn done';
          b1Sub.textContent = hit ? '已精准踩中脚印!' : '已完成切入';
          b2.className = 'sd2-act-btn gold';
          b2Sub.textContent = '指针进绿区瞬间点击!';
          triggerHaptic('light');
        } else if (step === 1 && which === 2) {
          step = 2;
          flightT = 0;
          jumpSuccess = (firstHit ? 1 : 0) + (hit ? 1 : 0) >= (roundIdx === 2 ? 2 : 1);
          trailEl.style.display = 'block';
          trailEl.style.left = '53%';
          trailEl.style.bottom = '284px';
          trailEl.style.height = '164px';
          meImg.src = sprites.urls.hjArch;
          meImg.style.height = '106px';
          meTag.textContent = jumpSuccess ? `完美背越 · 跃过 ${r.highTarget.toFixed(2)}m!` : '擦碰横杆!';
          triggerHaptic(jumpSuccess ? 'medium' : 'heavy');
        }
      };

      b1.onpointerdown = e => { e.preventDefault(); handleBeatTap(1); };
      b2.onpointerdown = e => { e.preventDefault(); handleBeatTap(step === 0 ? 1 : 2); };

      const drawHighJumpScene = (now) => {
        const rect = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };
        drawPixelStadiumHeader(g, W, H, 108, now);

        // 红色半圆助跑扇区
        for (let y = 156; y < H; y++) {
          const t = (y - 156) / (H - 156);
          const halfW = 72 + t * 32;
          const xL = Math.max(0, Math.round(W / 2 - halfW)), xR = Math.min(W, Math.round(W / 2 + halfW));
          rect(xL, y, xR - xL, 1, (y % 7 === 0) ? '#bc4f32' : '#cc5a3b');
          if (y === 156) rect(xL, y, xR - xL, 2, '#fff8eb');
        }

        // 立体像素皇家蓝大海绵垫
        rect(44, 120, 107, 54, '#231713');
        rect(46, 122, 103, 34, '#3b82f6');
        rect(49, 125, 97, 6, '#60a5fa');
        rect(46, 156, 103, 16, '#1d4ed8');
        rect(46, 155, 103, 2, '#1e3a8a');

        // 铝合金立柱 + 红白横杆（失败时横杆真实掉落！）
        rect(40, 86, 4, 88, '#4a3728'); rect(41, 87, 2, 86, '#e5e7eb');
        rect(151, 86, 4, 88, '#4a3728'); rect(152, 87, 2, 86, '#e5e7eb');
        const by = Math.round(113 + barFallY);
        rect(42, by, 111, 4, '#4a3728');
        for (let x = 44; x < 150; x += 10) {
          rect(x, by + 1, 5, 2, '#ffffff');
          rect(x + 5, by + 1, 5, 2, '#ef4444');
        }

        // 地面 J 字弧线助跑脚印点
        const jPts = [[148, 332, '#fff8eb'], [142, 304, '#fff8eb'], [130, 276, '#fde047'], [112, 248, '#fde047'], [96, 218, '#facc15']];
        jPts.forEach(([jx, jy, col], idx) => {
          rect(jx - 4, jy - 3, 8, 6, '#4a3728');
          rect(jx - 3, jy - 2, 6, 4, col);
          if (idx === 4 && step === 1) {
            const pulse = Math.floor(now / 150) % 2 === 0 ? 2 : 0;
            rect(jx - 11 - pulse, jy - 6 - pulse, 22 + pulse * 2, 12 + pulse * 2, 'rgba(250,204,21,0.42)');
          }
        });
      };

      const tick = (now) => {
        if (ended) return;
        const dt = Math.min(0.05, (now - lastTs) / 1000);
        lastTs = now;

        if (step === 0 || step === 1) {
          cursor += dir * meterSpeed * dt;
          if (cursor >= 96) { cursor = 96; dir = -1; }
          if (cursor <= 4) { cursor = 4; dir = 1; }
          needleEl.style.left = `${cursor}%`;

          if (step === 0) {
            // 主角在弧线上实时原地小碎步热身助跑切换动作帧！
            const fIdx = Math.floor(now / 135) % 4;
            const want = fIdx === 3 ? sprites.urls.hjCurve : sprites.runUrls[fIdx];
            if (meImg.src !== want) meImg.src = want;
            const prog = (Math.sin(now / 420) + 1) * 0.5;
            meWrap.style.left = `${(74 - prog * 12).toFixed(1)}%`;
            meWrap.style.bottom = `${(168 + prog * 68).toFixed(1)}px`;
          }
        } else if (step === 2) {
          flightT += dt / 0.68;
          const u = Math.min(1, flightT);
          // 从起跳点 (bottom 284) 飞跃横杆最高点 (bottom 575) 落向蓝海绵垫 (bottom 520)
          const archBot = 284 + u * 236 + Math.sin(u * Math.PI) * 78;
          meWrap.style.left = `${(53 - u * 4).toFixed(1)}%`;
          meWrap.style.bottom = `${archBot.toFixed(1)}px`;
          if (!jumpSuccess && u > 0.45) {
            barFallY = Math.min(36, (u - 0.45) * 72);
          }

          if (flightT >= 1) {
            step = 3;
            trailEl.style.display = 'none';
            meImg.src = sprites.urls.hjBack;
            meImg.style.height = '76px';
            meWrap.style.left = '50%';
            meWrap.style.bottom = '516px';
            tryResults[triesDone] = jumpSuccess ? 'pass' : 'fail';
            triesDone++;
            if (jumpSuccess) cleared = true;
            renderDots();

            if (jumpSuccess) {
              meTag.textContent = `${r.highTarget.toFixed(2)}m 过杆成功!`;
              statusEl.innerHTML = `<b style="color:#15803d">白旗举起！完美越过 ${r.highTarget.toFixed(2)}m 横杆！</b>`;
              b1.className = 'sd2-act-btn done';
              b2.className = 'sd2-act-btn pri';
              b1Sub.textContent = '过杆成功';
              b2.querySelector('b').textContent = '确认晋级 ›';
              b2Sub.textContent = '点击进入下一阶段';
            } else {
              meTag.textContent = '碰落横杆 · 试跳失败';
              statusEl.innerHTML = `<b style="color:#b91c1c">擦碰横杆掉落！还剩 ${3 - triesDone} 次试跳机会</b>`;
              b2.className = 'sd2-act-btn pri';
              b2.querySelector('b').textContent = triesDone < 3 ? '再试跳一次 ›' : '查看本轮结果 ›';
              b2Sub.textContent = triesDone < 3 ? '点击重置横杆继续挑战' : '三次机会已用完';
            }
          }
        }

        drawHighJumpScene(now);
        rafId = requestAnimationFrame(tick);
      };

      resetTry();
      rafId = requestAnimationFrame(tick);
      activeCleanup = () => { ended = true; if (rafId) cancelAnimationFrame(rafId); };
    });
  };

  const launchRound = (roundIdx) => {
    if (chosenEvent.id === 'sprint_100') launchTrackRound(roundIdx, false);
    else if (chosenEvent.id === 'run_1000' || chosenEvent.id === 'run_800') launchTrackRound(roundIdx, true);
    else if (chosenEvent.id === 'long_jump') launchLongJumpRound(roundIdx);
    else launchHighJumpRound(roundIdx);
  };

  if (opts.autoEventId) {
    launchRound(opts.autoRoundIdx || 0);
  } else {
    renderSignup();
  }
}
