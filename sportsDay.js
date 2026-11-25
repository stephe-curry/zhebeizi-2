// 《这辈子 2.0》Sprint 6 —— 初中 14 岁秋季校运会（100% 全屏竖屏 · 无顶部时间条 · 三轮晋级小游戏 × 动态奥运冠军梦）
// 四大自选项目：100米短跑 / 男子1000米(女生800米) / 跳高(立体海绵垫双拍) / 跳远(跳一跳直觉蓄力)
// 严格遵循零系统 Emoji 规范。

const SPORTS_SPRITES = {
  loaded: false,
  runBlue: '',
  runRed: '',
  runGreen: '',
  jumpLong: '',
  jumpHigh: '',
  referee: ''
};

function loadImg(src) {
  return new Promise(resolve => {
    const im = new Image();
    im.crossOrigin = 'anonymous';
    im.onload = () => resolve(im);
    im.onerror = () => resolve(null);
    im.src = src;
  });
}

function floodExtract(img, rx, ry, rw, rh) {
  const sx = Math.floor(img.width * rx);
  const sy = Math.floor(img.height * ry);
  const sw = Math.floor(img.width * rw);
  const sh = Math.floor(img.height * rh);
  const c = document.createElement('canvas');
  c.width = sw; c.height = sh;
  const ctx = c.getContext('2d');
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
  const imd = ctx.getImageData(0, 0, sw, sh);
  const d = imd.data;
  const vis = new Uint8Array(sw * sh);
  const stack = [];
  const isBg = (i) => d[i] > 235 && d[i + 1] > 235 && d[i + 2] > 235 && (Math.max(d[i], d[i + 1], d[i + 2]) - Math.min(d[i], d[i + 1], d[i + 2]) < 20);
  const push = (x, y) => {
    const p = y * sw + x;
    if (!vis[p] && isBg(p * 4)) { vis[p] = 1; stack.push(p); }
  };
  for (let x = 0; x < sw; x++) { push(x, 0); push(x, sh - 1); }
  for (let y = 0; y < sh; y++) { push(0, y); push(sw - 1, y); }
  while (stack.length) {
    const p = stack.pop();
    const x = p % sw, y = (p - x) / sw;
    d[p * 4 + 3] = 0;
    if (x > 0) push(x - 1, y);
    if (x < sw - 1) push(x + 1, y);
    if (y > 0) push(x, y - 1);
    if (y < sh - 1) push(x, y + 1);
  }
  let minX = sw, minY = sh, maxX = 0, maxY = 0;
  for (let y = 0; y < sh; y++) {
    for (let x = 0; x < sw; x++) {
      if (d[(y * sw + x) * 4 + 3] > 20) {
        if (x < minX) minX = x; if (y < minY) minY = y;
        if (x > maxX) maxX = x; if (y > maxY) maxY = y;
      }
    }
  }
  ctx.putImageData(imd, 0, 0);
  if (maxX <= minX || maxY <= minY) return c.toDataURL('image/png');
  const bw = maxX - minX + 1, bh = maxY - minY + 1;
  const out = document.createElement('canvas');
  out.width = bw; out.height = bh;
  out.getContext('2d').drawImage(c, minX, minY, bw, bh, 0, 0, bw, bh);
  return out.toDataURL('image/png');
}

export async function ensureSportsSprites() {
  if (SPORTS_SPRITES.loaded) return SPORTS_SPRITES;
  const img = await loadImg('./assets/sheets/sports_day_sheet.jpg?v=s60');
  if (img) {
    SPORTS_SPRITES.runBlue  = floodExtract(img, 0.02, 0.01, 0.31, 0.48);
    SPORTS_SPRITES.runRed   = floodExtract(img, 0.34, 0.01, 0.31, 0.48);
    SPORTS_SPRITES.runGreen = floodExtract(img, 0.67, 0.01, 0.31, 0.48);
    SPORTS_SPRITES.jumpLong = floodExtract(img, 0.01, 0.50, 0.33, 0.49);
    SPORTS_SPRITES.jumpHigh = floodExtract(img, 0.35, 0.50, 0.32, 0.49);
    SPORTS_SPRITES.referee  = floodExtract(img, 0.69, 0.49, 0.30, 0.50);
    SPORTS_SPRITES.loaded = true;
  }
  return SPORTS_SPRITES;
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
      tag: '第一人称冲刺',
      desc: '全屏第一人称跑道，交替点按「左步 / 右步」拉满步频直冲终点'
    },
    {
      id: isMale ? 'run_1000' : 'run_800',
      name: isMale ? '男子1000米' : '女子800米',
      tag: '呼吸配速耐力',
      desc: '按住控速稳在右侧绿区省体力，最后冲刺阶段燃尽体力绝杀超车'
    },
    {
      id: 'long_jump',
      name: '跳远',
      tag: '跳一跳蓄力',
      desc: '每轮3次试跳：按住蓄力冲向白板，脚踩绿白板瞬间松手飞入沙坑'
    },
    {
      id: 'high_jump',
      name: '跳高',
      tag: '立体海绵垫双拍',
      desc: '每轮3次试跳：踩准①起跳脚印点第1下，升至横杆上方②金圈点第2下过杆'
    }
  ];
}

export async function openSportsDayTournament(state, mountOverlay, clearOverlay, onComplete) {
  await ensureSportsSprites();
  const events = getSportEventsForGender(state.gender);
  let chosenEvent = events[0];
  let earnedHealth = 0;
  let passedRounds = 0;
  let activeCleanup = null;

  const cleanupGame = () => {
    if (activeCleanup) {
      try { activeCleanup(); } catch (e) {}
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
          <button class="btn-go" id="sd-finish-btn" style="width:100%;">收下奖牌与回忆 · 回到生活</button>
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

  const bindQuitButton = (root) => {
    const qBtn = root.querySelector('#sd-quit-btn');
    if (qBtn) {
      qBtn.onclick = () => {
        const mask = root.querySelector('#sd-quit-confirm');
        if (mask) mask.classList.remove('hidden');
      };
    }
    const cKeep = root.querySelector('#sd-q-keep');
    const cYes = root.querySelector('#sd-q-yes');
    if (cKeep) cKeep.onclick = () => root.querySelector('#sd-quit-confirm')?.classList.add('hidden');
    if (cYes) cYes.onclick = () => finishTournament(false, true);
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

  // ==================== 1 & 2. 全屏第一人称径赛（100米 & 男1000米/女800米） ====================
  const launchTrackRound = (roundIdx, isDistance) => {
    const r = ROUNDS[roundIdx];
    const totalDist = isDistance ? 1000 : 400; // 拉长游戏体感至约 40-55 秒完整赛程
    let myPos = 0;
    let ai1Pos = 0;
    let ai2Pos = 0;
    let speed = isDistance ? 14 : 6;
    let lastFoot = '';
    let strideCombo = 0;
    let stamina = 100;
    let paceGauge = 48; // 0..100, 绿区 38..70
    let holding = false;
    let sprintBurst = false;
    let ended = false;
    let rafId = null;
    let lastTs = performance.now();

    const html = `
      <div class="sd-full-overlay sd-arena-run">
        <svg class="sd-bg-svg" viewBox="0 0 390 844" preserveAspectRatio="none">
          <defs>
            <linearGradient id="sdSky" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#b8def7"/>
              <stop offset="100%" stop-color="#e8f5fd"/>
            </linearGradient>
          </defs>
          <rect x="0" y="0" width="390" height="205" fill="url(#sdSky)"/>
          <rect x="0" y="205" width="390" height="639" fill="#6f975c"/>
          <ellipse cx="86" cy="70" rx="44" ry="14" fill="rgba(255,255,255,0.82)"/>
          <ellipse cx="305" cy="88" rx="48" ry="15" fill="rgba(255,255,255,0.8)"/>
          <rect x="28" y="106" width="334" height="92" rx="5" fill="#efd9bc" stroke="#4a3728" stroke-width="2"/>
          <rect x="122" y="116" width="146" height="28" rx="4" fill="#dc2626" stroke="#4a3728" stroke-width="1.5"/>
          <text x="195" y="135" text-anchor="middle" fill="#fffdf9" font-size="13" font-weight="900">${chosenEvent.name} · ${r.name}</text>
          <line x1="118" y1="152" x2="118" y2="206" stroke="#fff" stroke-width="4"/>
          <line x1="272" y1="152" x2="272" y2="206" stroke="#fff" stroke-width="4"/>
          <rect x="114" y="146" width="162" height="17" rx="3" fill="#facc15" stroke="#4a3728" stroke-width="1.5"/>
          <text x="195" y="159" text-anchor="middle" fill="#3d2b1c" font-size="10.5" font-weight="900">FINISH · 终点线</text>
          <polygon points="112,202 278,202 390,844 0,844" fill="#c95338" stroke="#ffffff" stroke-width="3.2"/>
          <line x1="168" y1="202" x2="114" y2="844" stroke="#ffffff" stroke-width="2.5" stroke-dasharray="14 9"/>
          <line x1="222" y1="202" x2="276" y2="844" stroke="#ffffff" stroke-width="2.5" stroke-dasharray="14 9"/>
          <line x1="90" y1="315" x2="300" y2="315" stroke="rgba(255,255,255,0.42)" stroke-width="2"/>
          <line x1="60" y1="470" x2="330" y2="470" stroke="rgba(255,255,255,0.52)" stroke-width="2.4"/>
          <line x1="24" y1="648" x2="366" y2="648" stroke="rgba(255,255,255,0.62)" stroke-width="2.8"/>
        </svg>

        <!-- 悬浮角落标（无任何顶部时间条！） -->
        <div class="sd-float-top">
          <span class="sd-corner-pill">${chosenEvent.name} · ${r.name}(${r.diffLabel})</span>
          <button class="sd-corner-pill quit" id="sd-quit-btn">放弃弃权</button>
        </div>

        <div class="sd-rank-banner" id="sd-rank-txt">发令枪响！加速冲刺（前 2 名晋级）</div>

        <!-- 精细 GBA 像素跑者 -->
        <div class="sd-runner-wrap" id="sd-ai1" style="left:28%;top:42%;">
          <span class="sd-r-tag">3班体委</span>
          <img src="${SPORTS_SPRITES.runRed}" class="sd-px-img" style="height:105px;" />
        </div>
        <div class="sd-runner-wrap" id="sd-ai2" style="left:72%;top:44%;">
          <span class="sd-r-tag">1班快腿</span>
          <img src="${SPORTS_SPRITES.runGreen}" class="sd-px-img" style="height:105px;" />
        </div>
        <div class="sd-runner-wrap me" id="sd-me" style="left:50%;bottom:130px;">
          <span class="sd-r-tag me" id="sd-me-tag">你 · 0%</span>
          <img src="${SPORTS_SPRITES.runBlue}" class="sd-px-img" style="height:168px;" />
        </div>

        ${isDistance ? `
          <div class="sd-pace-rail">
            <div class="sd-pr-red"></div>
            <div class="sd-pr-green"></div>
            <div class="sd-pr-yellow"></div>
            <div class="sd-pr-needle" id="sd-pace-needle" style="top:52%;"></div>
          </div>
          <div class="sd-stamina-pill" id="sd-stam-txt">体力 100%</div>
        ` : ''}

        <div class="sd-float-controls">
          ${isDistance ? `
            <button class="sd-ctrl-btn green" id="sd-hold-pace" style="flex:1.4;">按住稳在绿区跟跑</button>
            <button class="sd-ctrl-btn accent" id="sd-burst-btn" style="flex:1;">末圈冲刺</button>
          ` : `
            <button class="sd-ctrl-btn dark" id="sd-left-foot">左步蹬地</button>
            <button class="sd-ctrl-btn accent" id="sd-right-foot">右步蹬地</button>
          `}
        </div>
        ${quitModalHtml}
      </div>
    `;

    mountOverlay(html, (root) => {
      bindQuitButton(root);
      const ai1El = root.querySelector('#sd-ai1');
      const ai2El = root.querySelector('#sd-ai2');
      const meEl = root.querySelector('#sd-me');
      const meTag = root.querySelector('#sd-me-tag');
      const rankEl = root.querySelector('#sd-rank-txt');
      const needleEl = root.querySelector('#sd-pace-needle');
      const stamEl = root.querySelector('#sd-stam-txt');

      if (!isDistance) {
        const hitStep = (foot) => {
          if (ended) return;
          if (foot !== lastFoot) {
            strideCombo++;
            speed = Math.min(18.5, speed + 1.55);
          } else {
            strideCombo = Math.max(0, strideCombo - 2);
            speed = Math.max(5.5, speed - 0.6);
          }
          lastFoot = foot;
          meEl.style.transform = `translateX(calc(-50% + ${foot === 'L' ? -6 : 6}px))`;
        };
        root.querySelector('#sd-left-foot').onpointerdown = (e) => { e.preventDefault(); hitStep('L'); };
        root.querySelector('#sd-right-foot').onpointerdown = (e) => { e.preventDefault(); hitStep('R'); };
      } else {
        const holdBtn = root.querySelector('#sd-hold-pace');
        const burstBtn = root.querySelector('#sd-burst-btn');
        holdBtn.onpointerdown = (e) => { e.preventDefault(); holding = true; };
        const endHold = () => { holding = false; };
        holdBtn.onpointerup = endHold;
        holdBtn.onpointerleave = endHold;
        holdBtn.onpointercancel = endHold;
        burstBtn.onpointerdown = (e) => {
          e.preventDefault();
          if (stamina > 8) {
            sprintBurst = true;
            stamina = Math.max(0, stamina - 6);
            speed = Math.min(34, speed + 5.5);
          }
        };
      }

      const tick = (now) => {
        if (ended) return;
        const dt = Math.min(0.05, (now - lastTs) / 1000);
        lastTs = now;

        if (!isDistance) {
          speed = Math.max(5.0, speed - dt * 5.2);
          myPos += speed * dt;
          const baseAi = 10.6 * r.aiMult;
          ai1Pos += (baseAi * (0.97 + 0.06 * Math.sin(now / 520))) * dt;
          ai2Pos += (baseAi * (0.93 + 0.07 * Math.cos(now / 610))) * dt;
        } else {
          paceGauge = Math.max(5, Math.min(96, paceGauge + (holding ? 38 : -28) * dt));
          const inGreen = paceGauge >= 36 && paceGauge <= 70;
          const inRed = paceGauge > 70;
          if (inRed) {
            stamina = Math.max(0, stamina - 16 * dt);
            speed = stamina > 5 ? 25.5 : 13.5;
          } else if (inGreen) {
            stamina = Math.min(100, stamina + 3.5 * dt);
            speed = 22.8;
          } else {
            stamina = Math.min(100, stamina + 7 * dt);
            speed = 16.5;
          }
          if (sprintBurst) {
            speed = Math.max(speed, 29);
            sprintBurst = false;
          }
          myPos += speed * dt;
          const baseAi = 21.8 * r.aiMult;
          ai1Pos += baseAi * dt;
          ai2Pos += (baseAi * 0.96) * dt;
          if (needleEl) needleEl.style.top = `${100 - paceGauge}%`;
          if (stamEl) stamEl.textContent = `体力 ${Math.round(stamina)}%`;
        }

        const pct = Math.min(100, Math.round((myPos / totalDist) * 100));
        const rank = 1 + (ai1Pos > myPos ? 1 : 0) + (ai2Pos > myPos ? 1 : 0);
        meTag.textContent = `你 · 第${rank}名 (${pct}%)`;
        rankEl.textContent = !isDistance
          ? `步频连击 ×${strideCombo} · 赛程 ${pct}%（${roundIdx === 2 ? '第1名夺冠' : '前2名晋级'}）`
          : `赛程 ${pct}% · ${myPos > totalDist * 0.78 ? '进入最后冲刺圈！猛点末圈冲刺！' : '保持指针在右侧绿区省体力跟跑'}`;

        // 根据与主角的相对距离动态缩放对手的纵深透视位置
        const updateRival = (el, rPos, laneLeft) => {
          const diff = rPos - myPos; // 正数代表对手在前方
          const topPct = Math.max(24, Math.min(72, 46 - diff * (isDistance ? 0.22 : 0.45)));
          const scale = Math.max(0.55, Math.min(1.25, 0.55 + ((topPct - 24) / 48) * 0.7));
          el.style.top = `${topPct}%`;
          el.style.left = `${laneLeft}%`;
          el.style.transform = `translateX(-50%) scale(${scale.toFixed(2)})`;
        };
        updateRival(ai1El, ai1Pos, 30);
        updateRival(ai2El, ai2Pos, 70);

        if (myPos >= totalDist) {
          ended = true;
          const needRank = roundIdx === 2 ? 1 : 2;
          const won = rank <= needRank;
          showRoundIntermission(roundIdx, won, `你以第 ${rank} 名冲过终点线！`);
          return;
        }
        rafId = requestAnimationFrame(tick);
      };
      rafId = requestAnimationFrame(tick);
      activeCleanup = () => { ended = true; if (rafId) cancelAnimationFrame(rafId); };
    });
  };

  // ==================== 3. 全屏跳远（参考《跳一跳》极简蓄力，每轮 3 次试跳） ====================
  const launchLongJumpRound = (roundIdx) => {
    const r = ROUNDS[roundIdx];
    let triesLeft = 3;
    let bestDist = 0;
    let phase = 'ready'; // ready | charging | airborne | settled
    let runProgress = 0; // 0 -> 100 (72..86 为绿色完美白板区, >87 踩红泥犯规)
    let rafId = null;
    let lastTs = performance.now();
    let ended = false;

    const html = `
      <div class="sd-full-overlay">
        <svg class="sd-bg-svg" viewBox="0 0 390 844" preserveAspectRatio="none">
          <rect x="0" y="0" width="390" height="125" fill="#d3ebfb"/>
          <rect x="0" y="125" width="390" height="719" fill="#689455"/>
          <polygon points="62,102 328,102 350,382 40,382" fill="#f8fafc" stroke="#4a3728" stroke-width="2.5"/>
          <polygon points="72,112 318,112 338,372 52,372" fill="#eab308"/>
          <line x1="68" y1="168" x2="322" y2="168" stroke="#dc2626" stroke-width="2.4" stroke-dasharray="7 5"/>
          <text x="312" y="160" text-anchor="end" fill="#991b1b" font-size="12" font-weight="900">晋级线 ${r.jumpTarget.toFixed(2)}m</text>
          <line x1="60" y1="242" x2="330" y2="242" stroke="rgba(74,55,40,0.45)" stroke-width="1.8" stroke-dasharray="6 5"/>
          <polygon points="148,382 242,382 308,844 82,844" fill="#c95338" stroke="#ffffff" stroke-width="2.8"/>
          <rect x="142" y="402" width="106" height="11" fill="#ef4444" stroke="#4a3728" stroke-width="1.2"/>
          <rect x="138" y="413" width="114" height="26" rx="3" fill="#dcfce7" stroke="#16a34a" stroke-width="2.8"/>
          <text x="195" y="431" text-anchor="middle" fill="#15803d" font-size="12" font-weight="900">踩白板松手起跳</text>
        </svg>

        <div class="sd-float-top">
          <span class="sd-corner-pill">跳远 · ${r.name}(${r.diffLabel})</span>
          <button class="sd-corner-pill quit" id="sd-quit-btn">放弃弃权</button>
        </div>

        <div class="sd-rank-banner" id="sd-lj-info">第 1 / 3 跳 · 最佳 0.00m（达标 ${r.jumpTarget.toFixed(2)}m）</div>

        <div style="position:absolute;right:10px;top:338px;text-align:center;">
          <img src="${SPORTS_SPRITES.referee}" class="sd-px-img" style="height:122px;" />
          <span class="sd-r-tag" id="sd-lj-flag">裁判白旗</span>
        </div>

        <img src="${SPORTS_SPRITES.runBlue}" id="sd-lj-actor" class="sd-px-img" style="position:absolute;left:50%;bottom:138px;transform:translateX(-50%);height:152px;transition:top 0.35s ease, bottom 0.35s ease;" />

        <div class="sd-float-controls">
          <button class="sd-ctrl-btn accent" id="sd-lj-btn" style="width:100%;">按住助跑 · 踩白板瞬间松手起跳！</button>
        </div>
        ${quitModalHtml}
      </div>
    `;

    mountOverlay(html, (root) => {
      bindQuitButton(root);
      const infoEl = root.querySelector('#sd-lj-info');
      const actorEl = root.querySelector('#sd-lj-actor');
      const flagEl = root.querySelector('#sd-lj-flag');
      const btnEl = root.querySelector('#sd-lj-btn');
      const chargeSpeed = 52 + roundIdx * 12;

      const resetForNextTry = () => {
        if (triesLeft <= 0) {
          showRoundIntermission(roundIdx, bestDist >= r.jumpTarget, `三跳最佳成绩 ${bestDist.toFixed(2)} 米！`);
          return;
        }
        phase = 'ready';
        runProgress = 0;
        actorEl.src = SPORTS_SPRITES.runBlue;
        actorEl.style.bottom = '138px';
        actorEl.style.height = '152px';
        flagEl.textContent = '裁判白旗';
        btnEl.textContent = '按住助跑 · 踩白板瞬间松手起跳！';
        infoEl.textContent = `第 ${4 - triesLeft} / 3 跳 · 最佳 ${bestDist.toFixed(2)}m（达标 ${r.jumpTarget.toFixed(2)}m）`;
      };

      btnEl.onpointerdown = (e) => {
        e.preventDefault();
        if (phase === 'settled') {
          resetForNextTry();
          return;
        }
        if (phase !== 'ready') return;
        phase = 'charging';
        lastTs = performance.now();
        btnEl.textContent = '正在加速冲向白板… 踩上立刻松手！';
      };

      const doRelease = () => {
        if (phase !== 'charging') return;
        phase = 'settled';
        triesLeft--;
        if (runProgress > 88) {
          flagEl.textContent = '红旗犯规!';
          infoEl.textContent = `越过红泥线判踩线犯规！（剩余 ${triesLeft} 跳）`;
          btnEl.textContent = triesLeft > 0 ? '点此准备下一跳' : '查看本轮最终成绩';
          return;
        }
        // 74..87 为黄金踩板区间
        const distFromSweet = Math.abs(runProgress - 82);
        const rawScore = Math.max(3.6, (5.58 - distFromSweet * 0.048) + (Math.random() * 0.12 - 0.04));
        const dist = Number(rawScore.toFixed(2));
        if (dist > bestDist) bestDist = dist;
        actorEl.src = SPORTS_SPRITES.jumpLong;
        actorEl.style.bottom = `${Math.min(540, 390 + (dist - 3.6) * 72)}px`;
        actorEl.style.height = '132px';
        flagEl.textContent = `有效 ${dist}m`;
        infoEl.textContent = dist >= r.jumpTarget
          ? `漂亮！飞出 ${dist}m 越过晋级线！（最佳 ${bestDist.toFixed(2)}m）`
          : `落点 ${dist}m，差一点过线！（最佳 ${bestDist.toFixed(2)}m）`;
        btnEl.textContent = (bestDist >= r.jumpTarget && triesLeft === 0) || triesLeft === 0
          ? '确认本轮成绩 ›'
          : '点此继续下一跳';
      };

      btnEl.onpointerup = doRelease;
      btnEl.onpointercancel = doRelease;

      const tick = (now) => {
        if (ended) return;
        const dt = Math.min(0.05, (now - lastTs) / 1000);
        lastTs = now;
        if (phase === 'charging') {
          runProgress += chargeSpeed * dt;
          actorEl.style.bottom = `${138 + Math.min(100, runProgress) * 2.55}px`;
          if (runProgress >= 96) {
            doRelease();
          }
        }
        rafId = requestAnimationFrame(tick);
      };
      rafId = requestAnimationFrame(tick);
      activeCleanup = () => { ended = true; if (rafId) cancelAnimationFrame(rafId); };
    });
  };

  // ==================== 4. 全屏立体海绵垫跳高（双拍时机，每轮 3 次试跳） ====================
  const launchHighJumpRound = (roundIdx) => {
    const r = ROUNDS[roundIdx];
    let triesLeft = 3;
    let cleared = false;
    let step = 0; // 0:助跑点①起跳 | 1:腾空点②过杆 | 2:本跳结算
    let cursor = 0; // 0..100 来回扫动
    let dir = 1;
    let firstScore = 0;
    let rafId = null;
    let lastTs = performance.now();
    let ended = false;

    const html = `
      <div class="sd-full-overlay">
        <svg class="sd-bg-svg" viewBox="0 0 390 844" preserveAspectRatio="none">
          <rect x="0" y="0" width="390" height="162" fill="#cde8fa"/>
          <rect x="0" y="162" width="390" height="288" fill="#689455"/>
          <rect x="0" y="450" width="390" height="394" fill="#c95338"/>
          <polygon points="56,232 334,232 356,374 34,374" fill="#2563eb" stroke="#1e3a8a" stroke-width="2.5"/>
          <polygon points="34,374 356,374 356,416 34,416" fill="#1d4ed8" stroke="#1e3a8a" stroke-width="2.5"/>
          <rect x="66" y="138" width="9" height="278" rx="2" fill="#f1f5f9" stroke="#334155" stroke-width="2"/>
          <rect x="315" y="138" width="9" height="278" rx="2" fill="#f1f5f9" stroke="#334155" stroke-width="2"/>
          <line x1="70" y1="208" x2="320" y2="208" stroke="#fff" stroke-width="7"/>
          <line x1="70" y1="208" x2="320" y2="208" stroke="#ef4444" stroke-width="7" stroke-dasharray="16 12"/>
          <circle cx="195" cy="192" r="34" fill="rgba(250,204,21,0.22)" stroke="#facc15" stroke-width="3" stroke-dasharray="7 5"/>
          <path d="M312,688 Q290,554 202,456" fill="none" stroke="rgba(255,255,255,0.68)" stroke-width="4" stroke-dasharray="10 9"/>
          <circle cx="195" cy="454" r="30" fill="rgba(74,222,128,0.28)" stroke="#4ade80" stroke-width="3.2"/>
          <text x="195" y="459" text-anchor="middle" fill="#fff" font-size="12" font-weight="900">① 起跳点</text>
        </svg>

        <div class="sd-float-top">
          <span class="sd-corner-pill">跳高 · ${r.name}(${r.diffLabel}) ${r.highTarget.toFixed(2)}m</span>
          <button class="sd-corner-pill quit" id="sd-quit-btn">放弃弃权</button>
        </div>

        <div class="sd-rank-banner" id="sd-hj-info">挑战 ${r.highTarget.toFixed(2)}m · 第 1 / 3 次试跳</div>

        <img src="${SPORTS_SPRITES.runBlue}" id="sd-hj-actor" class="sd-px-img" style="position:absolute;left:64%;bottom:175px;transform:translateX(-50%);height:148px;transition:all 0.28s ease;" />

        <!-- 清晰单指节奏准星条 -->
        <div class="sd-hj-meter">
          <div class="sd-hj-sweet" style="left:${38 + roundIdx * 4}%;width:${24 - roundIdx * 5}%;"></div>
          <div class="sd-hj-cur" id="sd-hj-cur" style="left:10%;"></div>
        </div>

        <div class="sd-float-controls">
          <button class="sd-ctrl-btn accent" id="sd-hj-btn" style="width:100%;">第 1 拍：指针进绿区点起跳！</button>
        </div>
        ${quitModalHtml}
      </div>
    `;

    mountOverlay(html, (root) => {
      bindQuitButton(root);
      const infoEl = root.querySelector('#sd-hj-info');
      const actorEl = root.querySelector('#sd-hj-actor');
      const curEl = root.querySelector('#sd-hj-cur');
      const btnEl = root.querySelector('#sd-hj-btn');
      const sweetMin = 38 + roundIdx * 4;
      const sweetMax = sweetMin + (24 - roundIdx * 5);
      const meterSpeed = 88 + roundIdx * 24;

      const resetTry = () => {
        if (cleared) {
          showRoundIntermission(roundIdx, true, `优雅背越成功飞跃 ${r.highTarget.toFixed(2)} 米横杆！`);
          return;
        }
        if (triesLeft <= 0) {
          showRoundIntermission(roundIdx, false, `三次试跳均未能越过 ${r.highTarget.toFixed(2)} 米。`);
          return;
        }
        step = 0;
        actorEl.src = SPORTS_SPRITES.runBlue;
        actorEl.style.left = '64%';
        actorEl.style.bottom = '175px';
        actorEl.style.height = '148px';
        actorEl.style.width = 'auto';
        infoEl.textContent = `挑战 ${r.highTarget.toFixed(2)}m · 第 ${4 - triesLeft} / 3 次试跳`;
        btnEl.textContent = '第 1 拍：指针进绿区点起跳！';
      };

      btnEl.onpointerdown = (e) => {
        e.preventDefault();
        if (step === 2) {
          resetTry();
          return;
        }
        const hit = cursor >= sweetMin - 4 && cursor <= sweetMax + 4;
        if (step === 0) {
          firstScore = hit ? 1 : 0;
          step = 1;
          actorEl.src = SPORTS_SPRITES.jumpHigh;
          actorEl.style.left = '50%';
          actorEl.style.bottom = '545px';
          actorEl.style.height = 'auto';
          actorEl.style.width = '164px';
          infoEl.textContent = hit ? '漂亮起跳！准备第 2 拍弓背过杆！' : '起跳稍偏，快抓紧第 2 拍精准过杆补救！';
          btnEl.textContent = '第 2 拍：指针进绿区点过杆！';
        } else if (step === 1) {
          step = 2;
          triesLeft--;
          const ok = (firstScore + (hit ? 1 : 0)) >= (roundIdx === 2 ? 2 : 1);
          if (ok) {
            cleared = true;
            actorEl.style.bottom = '465px';
            infoEl.textContent = `完美背越！${r.highTarget.toFixed(2)}m 过杆成功！`;
            btnEl.textContent = '确认晋级 ›';
          } else {
            actorEl.style.bottom = '430px';
            infoEl.textContent = `擦碰横杆掉落！还剩 ${triesLeft} 次试跳机会`;
            btnEl.textContent = triesLeft > 0 ? '点此再试跳一次' : '查看本轮结果';
          }
        }
      };

      const tick = (now) => {
        if (ended) return;
        const dt = Math.min(0.05, (now - lastTs) / 1000);
        lastTs = now;
        if (step === 0 || step === 1) {
          cursor += dir * meterSpeed * dt;
          if (cursor >= 96) { cursor = 96; dir = -1; }
          if (cursor <= 4) { cursor = 4; dir = 1; }
          curEl.style.left = `${cursor}%`;
        }
        rafId = requestAnimationFrame(tick);
      };
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

  renderSignup();
}
