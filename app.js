// 《这辈子 2.0》U6：375×812 微信小程序 9:16 竖屏高保真可交互原型
// 核心架构：V4 整屏拍立得主界面 ⇄ V5 撕纸排程抽屉 ⇄ V3 关键时刻取景定格
import {
  ORIGINS, CITIES, TRACKS, UNIVERSITIES, DREAMS, SPOUSE_BACKGROUNDS, PROMO_REQ
} from './data.js';
import {
  clamp, monthlyPmt, getSubStage, getSubStageIndex, getDateStamp, getMacroParams,
  createInitialState, getCurrentEra, getNextYearHint, getCurrentMonthlySalary,
  getTurnSlotBudget, getAvailableActions, previewDraft, executeTurn, getNetWorth, evaluateEnding
} from './engine.js';
import { openFlipCardGame, openHomePuzzleGame, openGomokuGame } from './minigames.js';
import { loadCharacterSprites, getBubbleUrl } from './spriteLoader.js';

const appEl = document.getElementById('app');

let state = null;
let sprites = { male: null, female: null };
let activeTab = 'home'; // 'home' | 'assets' | 'social' | 'album'
let drawerOpen = false;
let activeCat = '1.成长与学习';
let draft = [];
let toastTimer = null;
let toastMsg = '';
let heroHop = false;
let albumBounce = false;

// 序幕选型状态
let pickedGender = 'male';
let rerollUsed = false;
let pickedOrigin = rollOrigin();
let pickedTalent = pickedOrigin.talents[0].id;
let unlockedSelfPick = localStorage.getItem('zhebeizi_cleared') === '1';

function rollOrigin() {
  const r = Math.random();
  let acc = 0;
  for (const o of ORIGINS) { acc += o.prob; if (r <= acc) return o; }
  return ORIGINS[1];
}

function fmtMoney(n) {
  const sign = n < 0 ? '-' : '';
  const a = Math.abs(n);
  if (a >= 10000) return `${sign}${(a / 10000).toFixed(1)}万`;
  return `${sign}${Math.round(a).toLocaleString()}`;
}

function getBgKey(age) {
  if (age <= 18) return 'child';
  if (age <= 50) return 'adult';
  return 'elder';
}

function getCurrentHeroBubble(s) {
  if (s.stats.fatigue >= s.origin.fatigueLimit) return 'sweat';
  if (s.stats.mood < 35) return 'stress';
  if (s.pubStreak > 0) return 'wine';
  if (s.age >= 60 && !s.elderCircle && !(s.relations.partner?.married)) return 'leaf';
  if (s.relations.partner && s.relations.partner.intimacy >= 60) return 'heart';
  return 'star';
}

function getMainCtaText(s) {
  if (s.age <= 18) return s.subTurn === 2 ? '安排这个暑假' : '安排新学期';
  if (s.age <= 50) return '安排这一季';
  return '安排这阵子';
}

function getSeasonSubtitle(s) {
  const stage = getSubStage(s.age);
  const moodWord = s.stats.fatigue >= s.origin.fatigueLimit ? '有点透支了，注意喘口气'
    : s.stats.mood >= 75 ? '阳光正好，心里踏实'
    : s.age <= 12 ? '放学后的风很温柔'
    : s.age <= 18 ? '黑板上的倒计时又少了一天'
    : s.age <= 35 ? '在城市里慢慢扎下根'
    : s.age <= 50 ? '扛起生活，也别忘了自己'
    : '慢下来，好好享受眼前的日子';
  return `${stage.name} · 第 ${s.subTurn} 季  ${moodWord}`;
}

function trendIcon(t) {
  return t === 'hot' ? '🔥↑↑' : t === 'up' ? '📈↑' : t === 'down' ? '📉↓' : '➡️平';
}

function showToast(text) {
  toastMsg = text;
  if (toastTimer) clearTimeout(toastTimer);
  render();
  toastTimer = setTimeout(() => { toastMsg = ''; render(); }, 2300);
}

function mountOverlay(html, bind) {
  const frame = document.querySelector('.phone-frame');
  if (!frame) return;
  clearOverlay();
  const div = document.createElement('div');
  div.id = 'phone-overlay-host';
  div.innerHTML = html;
  frame.appendChild(div);
  if (bind) bind(div);
}

function clearOverlay() {
  const old = document.getElementById('phone-overlay-host');
  if (old) old.remove();
}

// V3 关键时刻取景器定格弹窗（带四角合拢 + 暖白快门轻闪 + 35mm 齿孔 + 存入相册）
function showV3Capture({ title, badge, bodyHtml, photoCaption, onDone }) {
  const bgKey = getBgKey(state.age);
  const stageIdx = getSubStageIndex(state.age);
  const stamp = getDateStamp(state.age, state.subTurn);
  const spUrl = sprites[state.gender]?.[stageIdx] || '';

  if (photoCaption) {
    state.albumPhotos.push({ age: state.age, stamp, title: photoCaption, stageIdx, bg: bgKey });
  }

  mountOverlay(`
    <div class="v3-overlay">
      <div class="v3-viewfinder">
        <img class="scene-bg" src="./assets/bg/${bgKey}.jpg" />
        <div class="film-overlay"></div>
        <div class="shutter-flash"></div>
        <div class="v3-brackets"><span class="tl"></span><span class="tr"></span><span class="bl"></span><span class="br"></span></div>
        <div class="hero-anchor" style="bottom:8%;">
          ${spUrl ? `<img class="hero-sprite" style="height:148px;" src="${spUrl}" />` : ''}
        </div>
        <div class="date-stamp">${stamp}</div>
      </div>
      <div class="film-sprockets">${'<i></i>'.repeat(12)}</div>
      <div class="v3-body">
        <div><span class="tag hot">${badge || '关键时刻定格'}</span></div>
        <h3 style="margin:0;font-size:18px;">${title}</h3>
        <div id="v3-content">${bodyHtml}</div>
      </div>
    </div>
  `, host => {
    if (onDone) onDone(host, () => {
      clearOverlay();
      if (photoCaption) {
        albumBounce = true;
        render();
        setTimeout(() => { albumBounce = false; render(); }, 460);
      } else {
        render();
      }
    });
  });
}

async function initSpritesAndRender() {
  appEl.innerHTML = `<div class="phone-stage-outer"><div class="phone-frame" style="align-items:center;justify-content:center;color:#7c7166;">正在装填轻像素胶片与人物立绘…</div></div>`;
  try {
    const [m, f] = await Promise.all([loadCharacterSprites('male'), loadCharacterSprites('female')]);
    sprites.male = m;
    sprites.female = f;
  } catch (e) {
    console.warn('Sprite load fallback:', e);
  }
  render();
}

function render() {
  if (!state) return renderIntro();
  if (state.ended) return renderMemorial();

  const stageIdx = getSubStageIndex(state.age);
  const bgKey = getBgKey(state.age);
  const spUrl = sprites[state.gender]?.[stageIdx] || '';
  const bubbleUrl = getBubbleUrl(getCurrentHeroBubble(state));
  const era = getCurrentEra(state);
  const budget = getTurnSlotBudget(state);
  const actions = getAvailableActions(state);
  const stamp = getDateStamp(state.age, state.subTurn);

  // 新手前 3 回合渐进解锁底部 Tab（U2 锁定规则）
  const tCount = state.totalTurns || 0;
  const unlockAssets = tCount >= 1 || state.age > 6;
  const unlockSocial = tCount >= 2 || state.age > 6;
  const unlockAlbum = tCount >= 2 || state.age > 6;

  // 场景角落最多 1 个轻提示贴纸
  let cornerSticker = null;
  if (state.age <= 12 && state.flipGameThisYear < 1 && tCount >= 1) {
    cornerSticker = { id: 'flip', label: '🃏 课间翻卡博弈' };
  } else if (state.age >= 22 && !state.house && state.cash + state.parentSupportLeft >= 150000) {
    cornerSticker = { id: 'house', label: '🏠 够首付安家了' };
  } else if (state.age >= 55) {
    cornerSticker = { id: 'gomoku', label: '⚫ 公园石桌杀一盘' };
  }

  let bodyHtml = '';
  if (activeTab === 'home') {
    bodyHtml = `
      <div class="v4-wrapper">
        <!-- L1 顶部 4 枚「中文+数字」直白状态胶囊（零理解成本、绝不折行） -->
        <div class="hud-pills">
          <div class="pill" id="hud-era">
            <span class="pill-label">年龄</span>
            <span class="pill-val">${state.age}岁</span>
          </div>
          <div class="pill" id="hud-cash">
            <span class="pill-label">现金</span>
            <span class="pill-val">¥${fmtMoney(state.cash)}</span>
          </div>
          <div class="pill" id="hud-health">
            <span class="pill-label">健康</span>
            <span class="pill-val" style="color:${state.stats.health<30?'var(--red)':'var(--green)'}">${state.stats.health}</span>
            <div class="pill-bar"><div class="pill-bar-fill" style="width:${state.stats.health}%;background:${state.stats.health<30?'var(--red)':'var(--green)'}"></div></div>
          </div>
          <div class="pill" id="hud-mood">
            <span class="pill-label">心态</span>
            <span class="pill-val" style="color:${state.stats.mood<35?'var(--red)':'var(--ink)'}">${state.stats.mood}</span>
            <div class="pill-bar"><div class="pill-bar-fill" style="width:${state.stats.mood}%;background:${state.stats.mood<35?'var(--red)':'var(--accent)'}"></div></div>
          </div>
        </div>

        <!-- L2 全屏轻像素沉浸舞台 -->
        <div class="scene-stage ${drawerOpen ? 'drawer-open' : ''}">
          <img class="scene-bg" src="./assets/bg/${bgKey}.jpg" />
          <div class="film-overlay"></div>
          <div class="film-lightleak"></div>
          <div class="hero-anchor ${heroHop ? 'hop' : ''}" id="hero-tap">
            ${bubbleUrl ? `<img class="hero-bubble" src="${bubbleUrl}" />` : ''}
            ${spUrl ? `<img class="hero-sprite" src="${spUrl}" />` : ''}
            <div class="hero-shadow"></div>
          </div>
          ${cornerSticker ? `<button class="corner-sticker" id="corner-btn">${cornerSticker.label}</button>` : ''}
          <div class="date-stamp">${stamp}</div>
        </div>

        <!-- L3 拍立得厚白边 + 两角和纸胶带 + 全场唯一主按钮 -->
        <div class="polaroid-margin">
          <div class="washi-tape left"></div>
          <div class="washi-tape right"></div>
          <div class="season-caption">${getSeasonSubtitle(state)}</div>
          <div class="season-sub">
            ${era.name} · 房${trendIcon(era.houseTrend)} 金${trendIcon(era.goldTrend)}
            ${budget.commuteLocked ? ' · 🚇通勤锁1格' : ''}
            ${budget.babyLock ? ' · 🍼育儿锁1格' : ''}
          </div>
          <button class="cta-main" id="btn-open-drawer">${getMainCtaText(state)}</button>
        </div>

        <!-- 2 秒自动淡出飘字结算浮条 -->
        ${toastMsg ? `<div class="toast-ribbon" id="toast-close">${toastMsg}</div>` : ''}

        <!-- V5 撕纸手账排程抽屉 -->
        <div class="drawer-backdrop ${drawerOpen ? 'open' : ''}" id="drawer-mask"></div>
        ${renderV5Drawer(actions, budget)}
      </div>
    `;
  } else if (activeTab === 'assets') {
    bodyHtml = renderAssetsTab();
  } else if (activeTab === 'social') {
    bodyHtml = renderSocialTab(budget);
  } else {
    bodyHtml = renderAlbumTab();
  }

  appEl.innerHTML = `
    <div class="phone-stage-outer">
      <div class="phone-frame">
        <div class="wx-topbar-safe"><div class="wx-capsule"><span>•••</span><span>|</span><span>◉</span></div></div>
        ${bodyHtml}
        <nav class="bottom-nav">
          <button class="nav-tab ${activeTab==='home'?'active':''}" data-tab="home"><span class="ico">🏠</span><span>主页</span></button>
          <button class="nav-tab ${activeTab==='assets'?'active':''} ${unlockAssets?'':'locked'}" data-tab="assets"><span class="ico">🎒</span><span>家与账</span></button>
          <button class="nav-tab ${activeTab==='social'?'active':''} ${unlockSocial?'':'locked'}" data-tab="social"><span class="ico">❤️</span><span>亲友梦</span></button>
          <button class="nav-tab ${activeTab==='album'?'active':''} ${unlockAlbum?'':'locked'} ${albumBounce?'bounce':''}" data-tab="album">
            <span class="ico">🎞️</span><span>相册</span>
            <span class="nav-badge">${state.albumPhotos.length}</span>
          </button>
        </nav>
      </div>
    </div>
  `;

  bindMainEvents(actions, budget, cornerSticker);
}

function renderV5Drawer(actions, budget) {
  const allCats = [
    { key: '1.成长与学习', label: '📚学习' },
    { key: '2.职业与搞钱', label: '💼搞钱' },
    { key: '3.情感与社交', label: '💬亲友' },
    { key: '4.家庭与育儿', label: '👶育儿' },
    { key: '5.梦想专精', label: '⭐梦想' },
    { key: '6.身心与生活', label: '🌿身心' }
  ].filter(c => actions.some(a => a.cat === c.key));

  if (!allCats.some(c => c.key === activeCat) && allCats.length) activeCat = allCats[0].key;
  const visible = actions.filter(a => a.cat === activeCat);
  const prev = previewDraft(state, draft);

  return `
    <div class="v5-drawer ${drawerOpen ? 'open' : ''}">
      <svg class="torn-edge-svg" viewBox="0 0 390 13" preserveAspectRatio="none">
        <path d="M0,13 L0,7 Q16,2 32,7 T64,6 T96,8 T128,5 T160,8 T192,5 T224,8 T256,5 T288,7 T320,5 T352,8 T390,6 L390,13 Z" fill="#faf6ee"/>
      </svg>
      <div class="v5-tape-corner l"></div>
      <div class="v5-tape-corner r"></div>
      <div class="v5-head">
        <b style="font-size:14px;">时间槽 (${draft.length}/${budget.available})</b>
        <div style="display:flex;gap:4px;">
          <button class="btn ghost" id="v5-reuse" ${state.lastDraft.length ? '' : 'disabled'}>沿用上次</button>
          <button class="btn ghost" id="v5-tpl">${state.templates.balance.length ? '载入模板' : '存模板'}</button>
          <button class="btn ghost" id="v5-clear">清空</button>
        </div>
      </div>
      <div class="v5-slots">
        ${draft.map((id, i) => {
          const a = actions.find(x => x.id === id);
          return `<span class="stamp-slot filled" data-rm="${i}">${a ? a.name.slice(0, 6) : id} ×</span>`;
        }).join('')}
        ${Array.from({ length: Math.max(0, budget.available - draft.length) }).map(() => `<span class="stamp-slot">＋ 空槽</span>`).join('')}
      </div>
      <div class="cat-pills">
        ${allCats.map(c => `<button class="cat-pill ${activeCat===c.key?'active':''}" data-cat="${c.key}">${c.label}</button>`).join('')}
      </div>
      <div class="v5-cards">
        ${visible.map(a => `
          <button class="action-card" data-add="${a.id}" ${a.disabled || draft.length >= budget.available ? 'disabled' : ''}>
            <div class="ac-top"><span>${a.name}</span><span style="color:${a.costCash>0?'var(--accent)':'var(--green)'}">${a.costCash>0?'-'+fmtMoney(a.costCash):'免费'}</span></div>
            <div class="ac-sub">${a.preview}</div>
          </button>
        `).join('')}
      </div>
      <div class="v5-footer">
        <div class="v5-preview">
          预计：现金<b>${prev.cash>=0?'+':''}¥${fmtMoney(prev.cash)}</b> · 健康<b>${prev.health>=0?'+':''}${prev.health}</b> · 心态<b>${prev.mood>=0?'+':''}${prev.mood}</b><br/>
          本季后疲劳：<b style="color:${prev.fatigueWarn?'var(--red)':'inherit'}">${prev.endFatigue}/${state.origin.fatigueLimit}${prev.fatigueWarn?' (将损健康!)':''}</b>
        </div>
        <button class="btn-go" id="v5-exec">开始这一季 →</button>
      </div>
    </div>
  `;
}

function renderAssetsTab() {
  const nw = getNetWorth(state);
  const era = getCurrentEra(state);
  const sal = getCurrentMonthlySalary(state);
  return `
    <div class="tab-page">
      <div class="sec-card">
        <h4>🎒 家庭极简账本 <span class="tag">${CITIES[state.cityTier].name.slice(0,4)}</span></h4>
        <div class="grid-2">
          <div class="kv"><span>可用现金</span><b>${fmtMoney(state.cash)}</b></div>
          <div class="kv"><span>家庭净资产</span><b style="color:var(--green)">${fmtMoney(nw)}</b></div>
          <div class="kv"><span>房价趋势</span><b>${trendIcon(era.houseTrend)}</b></div>
          <div class="kv"><span>金价 (${state.goldPrice}/g)</span><b>${trendIcon(era.goldTrend)}</b></div>
        </div>
        ${sal > 0 ? `<div style="margin-top:8px;font-size:12.5px;color:var(--muted);">当前税后月薪：<b>${sal.toLocaleString()} 元</b>（职级 L${state.jobLevel}）</div>` : ''}
        ${state.retired ? `<div style="margin-top:8px;font-size:12.5px;color:var(--muted);">月度退休金：<b>${state.pensionMo.toLocaleString()} 元/月</b></div>` : ''}
        ${state.debt > 0 ? `<div style="margin-top:6px;font-size:12.5px;color:var(--red);">应付欠款：<b>${fmtMoney(state.debt)}</b>（自动从后续收入优先扣除）</div>` : ''}
      </div>

      <div class="sec-card">
        <h4>🏠 居住与小家空间拼图</h4>
        <p style="margin:0 0 8px;font-size:12.5px;color:var(--muted);">
          ${state.house ? `${state.house.name} · 现估值 ${fmtMoney(state.house.value)} · 余贷 ${fmtMoney(state.house.loan)}` : '当前租住/住家；买房后可布置空间网格并把童年旧物上墙！'}
        </p>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          ${state.age >= state.gradAge ? `<button class="btn primary" id="t-house">房产买卖/置换</button>` : ''}
          ${state.age >= 19 ? `<button class="btn secondary" id="t-puzzle">🏡 布置我的小家</button>` : ''}
          ${state.age >= state.gradAge ? `<button class="btn" id="t-city">🚄 中途换城</button>` : ''}
        </div>
      </div>

      <div class="sec-card">
        <h4>🪙 黄金、彩票与情绪买单</h4>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          ${state.age >= state.gradAge ? `<button class="btn" id="t-gold">🪙 黄金买卖 (${Math.round(state.goldGrams)}g)</button>` : ''}
          ${state.age >= 18 ? `<button class="btn" id="t-lottery" ${state.lotteryThisTurn?'disabled':''}>🎟️ 买彩票 (20元)</button>` : ''}
          ${state.age >= 18 ? `<button class="btn" id="t-emo" ${state.emoBuyThisTurn?'disabled':''}>🛍️ 情绪买单</button>` : ''}
        </div>
      </div>

      <div class="sec-card">
        <h4>📦 童年旧物与人生留痕</h4>
        <div style="font-size:12.5px;color:var(--muted);">
          ${state.items.length ? state.items.map(i => `<span class="tag up">${i}</span>`).join(' ') : '还没有收藏旧物（8 岁将迎来专属旧物节点）'}
        </div>
      </div>
    </div>
  `;
}

function renderSocialTab(budget) {
  return `
    <div class="tab-page">
      <div class="sec-card">
        <h4>📊 四维能力与职场</h4>
        <div class="grid-2">
          <div class="kv"><span>学识</span><b>${state.stats.knowledge}</b></div>
          <div class="kv"><span>专业(项目${state.projectCount})</span><b>${state.stats.pro}</b></div>
          <div class="kv"><span>表达(情商)</span><b>${state.stats.expr}</b></div>
          <div class="kv"><span>自理理财</span><b>${state.stats.selfCare}</b></div>
        </div>
        ${state.age >= state.gradAge && !state.retired && state.jobLevel < 5 ? `<button class="btn primary" id="t-promo" style="margin-top:8px;width:100%;">📈 申请职级晋升 (L${state.jobLevel+1})</button>` : ''}
      </div>

      <div class="sec-card">
        <h4>❤️ 亲友、恋爱与孩子</h4>
        <div class="grid-2" style="margin-bottom:8px;">
          <div class="kv"><span>父母亲密</span><b>${state.relations.parents.intimacy}</b></div>
          <div class="kv"><span>同桌小周</span><b>${state.relations.friend.intimacy}</b></div>
        </div>
        ${state.relations.partner ? `<div class="kv" style="margin-bottom:8px;"><span>❤️ ${state.relations.partner.name} (${state.relations.partner.married?'已婚合账':'恋爱中'})</span><b>亲密 ${state.relations.partner.intimacy}</b></div>` : ''}
        ${state.child ? `<div class="kv" style="margin-bottom:8px;"><span>👶 孩子 (${state.age-state.child.bornAge}岁)</span><b>学${state.child.study} 心${state.child.mood} 羁${state.child.bond}</b></div>` : ''}
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          ${state.age >= 19 && !state.relations.partner ? `<button class="btn primary" id="t-love">💘 结识伴侣</button>` : ''}
          ${state.relations.partner && !state.relations.partner.married ? `<button class="btn primary" id="t-marry">💍 谈婚论嫁</button>` : ''}
          ${state.relations.partner?.married && !state.child && !state.choseDink ? `<button class="btn secondary" id="t-kid">👶 生娃 / 丁克抉择</button>` : ''}
          ${budget.babyLock && state.relations.parents.intimacy >= 60 ? `<button class="btn secondary" id="t-help">🤝 请父母代班(释1格)</button>` : ''}
        </div>
      </div>

      <div class="sec-card">
        <h4>⭐ 梦想主线（18岁后聚焦 1–2 条）</h4>
        <div class="kv" style="margin-bottom:8px;"><span>当前梦想专长</span><b>${state.dreamSkill} ${state.dreamCompleted ? '🏆已通关' : ''}</b></div>
        <div style="font-size:12px;color:var(--muted);margin-bottom:8px;">已开启：${state.activeDreams.map(d => d.name).join('、') || '暂未锁定'}</div>
        <button class="btn" id="t-dream">选择 / 查看五梦想线</button>
      </div>
    </div>
  `;
}

function renderAlbumTab() {
  return `
    <div class="tab-page">
      <div class="sec-card">
        <h4>🌳 人生树分叉存档（18 / 30 / 50 岁）</h4>
        <div style="display:flex;gap:6px;flex-wrap:wrap;">
          ${[18, 30, 50].map(a => `<button class="btn secondary" data-branch="${a}" ${state.branches[a] ? '' : 'disabled'}>回到 ${a} 岁</button>`).join('')}
          <button class="btn ghost" id="t-memorial">预览纪念册</button>
        </div>
      </div>

      <div class="sec-card">
        <h4>🎞️ 人生胶片相册 (${state.albumPhotos.length} 张)</h4>
        <div class="album-grid">
          ${state.albumPhotos.slice().reverse().map(p => {
            const sp = sprites[state.gender]?.[p.stageIdx] || '';
            return `
              <div class="album-photo">
                <div class="album-thumb">
                  <img class="bg" src="./assets/bg/${p.bg}.jpg" />
                  ${sp ? `<img class="sp" src="${sp}" />` : ''}
                  <span class="st">${p.stamp}</span>
                </div>
                <div class="album-cap">${p.age}岁 · ${p.title}</div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    </div>
  `;
}

function bindMainEvents(actions, budget, cornerSticker) {
  appEl.querySelectorAll('[data-tab]').forEach(b => {
    b.onclick = () => { activeTab = b.dataset.tab; drawerOpen = false; render(); };
  });

  const bind = (id, fn) => { const el = appEl.querySelector(id); if (el) el.onclick = fn; };

  // 主页 V4 / V5 交互
  bind('#btn-open-drawer', () => { drawerOpen = true; render(); });
  bind('#drawer-mask', () => { drawerOpen = false; render(); });
  bind('#toast-close', () => { toastMsg = ''; render(); });
  bind('#hud-era', () => showToast(getNextYearHint(state)));
  bind('#hud-cash', () => { if (state.totalTurns >= 1 || state.age > 6) { activeTab = 'assets'; render(); } });
  bind('#hero-tap', () => {
    heroHop = true;
    showToast(state.gender === 'female' ? '「一步一步走，把这一辈子过得热气腾腾。」' : '「先把手头这一季安排好，未来慢慢来。」');
    setTimeout(() => { heroHop = false; render(); }, 440);
  });

  if (cornerSticker) {
    bind('#corner-btn', () => {
      if (cornerSticker.id === 'flip') launchFlipGame();
      else if (cornerSticker.id === 'house') openHouseSheet();
      else if (cornerSticker.id === 'gomoku') launchGomokuGame();
    });
  }

  // V5 撕纸抽屉内交互
  appEl.querySelectorAll('[data-cat]').forEach(b => { b.onclick = () => { activeCat = b.dataset.cat; render(); }; });
  appEl.querySelectorAll('[data-add]').forEach(b => {
    b.onclick = () => { if (draft.length < budget.available) { draft.push(b.dataset.add); render(); } };
  });
  appEl.querySelectorAll('[data-rm]').forEach(s => { s.onclick = () => { draft.splice(Number(s.dataset.rm), 1); render(); }; });
  bind('#v5-clear', () => { draft = []; render(); });
  bind('#v5-reuse', () => {
    const valid = new Set(actions.filter(a => !a.disabled).map(a => a.id));
    draft = state.lastDraft.filter(id => valid.has(id)).slice(0, budget.available);
    render();
  });
  bind('#v5-tpl', () => {
    if (state.templates.balance.length) {
      const valid = new Set(actions.filter(a => !a.disabled).map(a => a.id));
      draft = state.templates.balance.filter(id => valid.has(id)).slice(0, budget.available);
    } else if (draft.length) {
      state.templates.balance = [...draft];
      showToast('已保存当前方案为自定义模板');
    }
    render();
  });

  // 执行本回合（丝滑收起撕纸 -> 主角微跳 -> 2秒飘字浮条）
  bind('#v5-exec', () => {
    const res = executeTurn(state, draft);
    draft = [];
    drawerOpen = false;
    heroHop = true;
    render();
    setTimeout(() => { heroHop = false; }, 440);

    if (state.ended) return;
    const afterAll = () => {
      if (res.needGaokao) return openGaokaoV3();
      if (state.age === state.gradAge && state.subTurn === 1 && !state.track) return openGradV3();
      if (res.yearEndReport) return showYearEndV3(res.yearEndReport);
    };

    if (res.triggeredEvent) {
      showApprovedEventV3(res.triggeredEvent, afterAll);
    } else {
      const txt = res.summary.length ? res.summary.slice(0, 3).join(' · ') : '这一季平淡而安稳地度过了';
      showToast(txt);
      afterAll();
    }
  });

  // 二级 Tab 按钮绑定
  bind('#t-house', openHouseSheet);
  bind('#t-puzzle', launchHomePuzzle);
  bind('#t-city', openCitySheet);
  bind('#t-gold', openGoldSheet);
  bind('#t-lottery', handleLottery);
  bind('#t-emo', openEmoSheet);
  bind('#t-promo', handlePromo);
  bind('#t-love', openLoveSheet);
  bind('#t-marry', openMarrySheet);
  bind('#t-kid', openKidSheet);
  bind('#t-help', () => {
    state.relations.parents.helpedThisYear = true;
    state.relations.parents.intimacy = clamp(state.relations.parents.intimacy - 3);
    showToast('请父母代照护，本季释放 1 格时间槽（父母亲密 -3）');
  });
  bind('#t-dream', openDreamSheet);
  bind('#t-memorial', () => { state.ended = true; state.endReason = '手动预览人生纪念册'; render(); });
  appEl.querySelectorAll('[data-branch]').forEach(b => {
    b.onclick = () => {
      const a = Number(b.dataset.branch);
      if (state.branches[a]) {
        const saved = JSON.parse(state.branches[a]);
        saved.branches = state.branches;
        state = saved; draft = []; activeTab = 'home';
        showToast(`已从人生树回到 ${a} 岁分叉点！`);
      }
    };
  });
}

// ===== 序幕开局页（选性别 + 出身抽签 + 天赋三选一）=====
function renderIntro() {
  const previewSp = sprites[pickedGender]?.[0] || '';
  appEl.innerHTML = `
    <div class="phone-stage-outer">
      <div class="phone-frame">
        <div class="wx-topbar-safe"><div class="wx-capsule"><span>•••</span><span>|</span><span>◉</span></div></div>
        <div class="tab-page" style="padding-top:56px;">
          <div style="text-align:center;margin-bottom:10px;">
            <span class="tag">微信小程序 9:16 高保真原型</span>
            <h2 style="margin:6px 0 2px;font-size:20px;">《这辈子 2.0》</h2>
            <div style="font-size:12px;color:var(--muted);">每一岁，都是人生相册里的一张胶片</div>
          </div>

          <div class="sec-card" style="text-align:center;">
            <div style="display:flex;justify-content:center;gap:10px;margin-bottom:8px;">
              <button class="btn ${pickedGender==='male'?'primary':''}" id="g-m">👦 男主角 (悠悠球线)</button>
              <button class="btn ${pickedGender==='female'?'primary':''}" id="g-f">👧 女主角 (芭比娃娃线)</button>
            </div>
            ${previewSp ? `<img src="${previewSp}" style="height:105px;image-rendering:pixelated;" />` : ''}
          </div>

          <div class="sec-card">
            <h4>🎲 抽中出身：${pickedOrigin.name}
              ${!unlockedSelfPick ? `<button class="btn ghost" id="btn-reroll" ${rerollUsed?'disabled':''}>${rerollUsed?'已重抽':'免费重抽一次'}</button>` : ''}
            </h4>
            ${unlockedSelfPick ? `<div style="display:flex;gap:4px;flex-wrap:wrap;margin-bottom:8px;">
              ${ORIGINS.map(o => `<button class="btn ${pickedOrigin.id===o.id?'primary':''}" style="padding:4px 8px;min-height:30px;font-size:12px;" data-po="${o.id}">${o.name}</button>`).join('')}
            </div>` : ''}
            <div style="font-size:12.5px;color:var(--muted);line-height:1.6;">
              家底约 <b>${fmtMoney(pickedOrigin.familyAsset)}</b> · 父母首付支援 <b>${fmtMoney(pickedOrigin.downpaySupport)}</b><br/>
              ✅ ${pickedOrigin.buff}<br/>
              ⚠️ ${pickedOrigin.debuff}
            </div>
          </div>

          <div class="sec-card">
            <h4>✨ 天赋三选一</h4>
            <div style="display:flex;flex-direction:column;gap:6px;">
              ${pickedOrigin.talents.map(t => `
                <button class="action-card" style="${pickedTalent===t.id?'border-color:var(--accent);background:var(--accent-soft);':''}" data-t="${t.id}">
                  <div class="ac-top"><span>${t.name}</span><span>${pickedTalent===t.id?'✅':''}</span></div>
                  <div class="ac-sub">${t.desc}</div>
                </button>
              `).join('')}
            </div>
          </div>

          <button class="cta-main" id="btn-start" style="width:100%;margin-top:4px;">6 岁正式起步 →</button>
        </div>
      </div>
    </div>
  `;
  appEl.querySelector('#g-m').onclick = () => { pickedGender = 'male'; renderIntro(); };
  appEl.querySelector('#g-f').onclick = () => { pickedGender = 'female'; renderIntro(); };
  const rr = appEl.querySelector('#btn-reroll');
  if (rr) rr.onclick = () => { rerollUsed = true; pickedOrigin = rollOrigin(); pickedTalent = pickedOrigin.talents[0].id; renderIntro(); };
  appEl.querySelectorAll('[data-po]').forEach(b => { b.onclick = () => { pickedOrigin = ORIGINS.find(o => o.id === b.dataset.po); pickedTalent = pickedOrigin.talents[0].id; renderIntro(); }; });
  appEl.querySelectorAll('[data-t]').forEach(b => { b.onclick = () => { pickedTalent = b.dataset.t; renderIntro(); }; });
  appEl.querySelector('#btn-start').onclick = () => {
    state = createInitialState(pickedOrigin.id, pickedTalent, pickedGender);
    activeTab = 'home'; drawerOpen = false; draft = [];
    render();
    showToast('6 岁开学啦！点下方「安排新学期」开始你的第一季');
  };
}

// ===== V3 大节点弹窗（已审槽位 / 高考 / 毕业 / 年末决算）=====
function showApprovedEventV3(ev, next) {
  showV3Capture({
    badge: `APPROVED · ${ev.priority}`,
    title: ev.title,
    photoCaption: ev.title.replace(/\[.*?\]\s*/, ''),
    bodyHtml: `
      <p style="font-size:13px;color:var(--muted);margin:0 0 10px;">${ev.summary}</p>
      <div style="display:flex;flex-direction:column;gap:8px;">
        ${ev.choices.map((c, idx) => {
          let ok = true;
          if (c.reqAny) ok = Object.entries(c.reqAny).some(([k, v]) => state.stats[k] >= v);
          if (c.reqRelation) ok = (state.relations.partner?.intimacy >= c.reqRelation) || (state.child?.bond >= c.reqRelation);
          return `<button class="action-card" data-ci="${idx}" ${ok?'':'disabled'}><div class="ac-top"><span>${c.label}</span></div></button>`;
        }).join('')}
      </div>
    `,
    onDone: (host, finish) => {
      host.querySelectorAll('[data-ci]').forEach(b => {
        b.onclick = () => {
          const ef = ev.choices[Number(b.dataset.ci)].effects;
          if (ef.cash) state.cash += ef.cash;
          if (ef.mood) state.stats.mood = clamp(state.stats.mood + ef.mood);
          if (ef.selfCare) state.stats.selfCare = clamp(state.stats.selfCare + ef.selfCare);
          if (ef.parentInt) state.relations.parents.intimacy = clamp(state.relations.parents.intimacy + ef.parentInt);
          if (ef.item && !state.items.includes(ef.item)) state.items.push(ef.item);
          if (ef.exp && !state.experiences.includes(ef.exp)) state.experiences.push(ef.exp);
          finish(); next();
        };
      });
    }
  });
}

function openGaokaoV3() {
  let mod = 0;
  if (state.stats.mood >= 60) mod += 2; else if (state.stats.mood < 30) mod -= 3;
  if (state.stats.fatigue >= state.origin.fatigueLimit) mod -= 2;
  if (state.experiences.includes('exp_gaokao_sprint')) mod += 1;
  if (state.origin.id === 'welloff') mod += 1;
  const score = clamp(state.stats.knowledge + mod);
  const hasSprint = state.experiences.includes('exp_gaokao_sprint');

  showV3Capture({
    badge: 'P0 生命大节点 · 18岁高考',
    title: `高考出分：${score} 分 · 填报志愿`,
    photoCaption: `18岁高考 ${score} 分`,
    bodyHtml: `
      <p style="font-size:12px;color:var(--muted);margin:0 0 8px;">可动用留学资金：${fmtMoney(state.studyAbroadLeft)}</p>
      <div style="display:flex;flex-direction:column;gap:7px;">
        ${UNIVERSITIES.map(u => {
          let ok = u.abroad
            ? state.studyAbroadLeft >= u.cost && state.stats.knowledge >= u.minScore && state.stats.expr >= (u.minExpr - (state.talent.id === 't_vision' ? 10 : 0))
            : (u.tier === 1 ? score >= 90 && hasSprint : score >= u.minScore);
          return `<button class="action-card" data-u="${u.id}" ${ok?'':'disabled'}>
            <div class="ac-top"><span>${u.name}</span><span>${ok?'✅':'🔒'}</span></div>
            <div class="ac-sub">${u.note}</div>
          </button>`;
        }).join('')}
      </div>
    `,
    onDone: (host, finish) => {
      host.querySelectorAll('[data-u]').forEach(b => {
        b.onclick = () => {
          const u = UNIVERSITIES.find(x => x.id === b.dataset.u);
          state.university = u; state.gaokaoDone = true; state.gradAge = 18 + u.years;
          if (u.abroad) {
            state.parentSupportLeft = Math.max(0, state.parentSupportLeft - u.cost);
            state.studyAbroadLeft -= u.cost;
          }
          finish();
          showToast(`已被「${u.name}」录取！`);
        };
      });
    }
  });
}

function openGradV3() {
  let selCity = state.cityTier, selTrack = 'steady';
  function show() {
    showV3Capture({
      badge: `P0 毕业择城 · ${state.age}岁`,
      title: '选择你的奋斗城市与职业曲线',
      photoCaption: `${state.age}岁毕业初入社会`,
      bodyHtml: `
        <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px;">
          ${[1,2,3].map(t => `<button class="btn ${selCity===t?'primary':''}" data-c="${t}">${CITIES[t].name.slice(0,4)}</button>`).join('')}
        </div>
        <div style="display:flex;flex-direction:column;gap:6px;margin-bottom:10px;">
          ${TRACKS.map(tr => `<button class="action-card" style="${selTrack===tr.id?'border-color:var(--accent);background:var(--accent-soft);':''}" data-tr="${tr.id}">
            <div class="ac-top"><span>${tr.name.slice(0,11)}</span><span>拐点${tr.capAge}岁</span></div>
            <div class="ac-sub">退休替代率 ${Math.round(tr.replaceRate*100)}% · 裁员风险：${tr.layoffRisk}</div>
          </button>`).join('')}
        </div>
        <button class="btn primary" id="g-go" style="width:100%;">正式入职开启职场 →</button>
      `,
      onDone: (host, finish) => {
        host.querySelectorAll('[data-c]').forEach(b => { b.onclick = () => { selCity = Number(b.dataset.c); show(); }; });
        host.querySelectorAll('[data-tr]').forEach(b => { b.onclick = () => { selTrack = b.dataset.tr; show(); }; });
        host.querySelector('#g-go').onclick = () => {
          state.cityTier = selCity; state.track = TRACKS.find(x => x.id === selTrack);
          finish(); showToast(`落脚${CITIES[selCity].name.slice(0,4)}，开启职场新篇章！`);
        };
      }
    });
  }
  show();
}

function showYearEndV3(rep) {
  const isMilestone = [18, 30, 50, 60, 80].includes(rep.age);
  const html = `
    <ul style="font-size:13px;padding-left:18px;margin:0 0 12px;line-height:1.65;">
      ${rep.lines.map(l => `<li>${l}</li>`).join('')}
    </ul>
    <div style="font-size:12px;color:var(--muted);background:#fffdf8;padding:8px 10px;border-radius:10px;margin-bottom:12px;">
      ${getNextYearHint(state)}
    </div>
    ${rep.canExtend
      ? `<div style="display:flex;gap:8px;"><button class="btn secondary" id="y-ext" style="flex:1;">延寿至 90 岁</button><button class="btn primary" id="y-end" style="flex:1;">80 岁圆满收官</button></div>`
      : `<button class="btn primary" id="y-ok" style="width:100%;">迈入 ${state.age} 岁 →</button>`}
  `;

  if (isMilestone) {
    showV3Capture({
      badge: `${rep.age} 岁里程碑 · 年度决算`,
      title: `${rep.age} 岁这一年定格入册`,
      photoCaption: `${rep.age}岁里程碑定格`,
      bodyHtml: html,
      onDone: (host, finish) => {
        if (rep.canExtend) {
          host.querySelector('#y-ext').onclick = () => { state.extendedTo90 = true; finish(); };
          host.querySelector('#y-end').onclick = () => { state.ended = true; state.endReason = '80 岁圆满收官'; finish(); };
        } else {
          host.querySelector('#y-ok').onclick = finish;
        }
      }
    });
  } else {
    mountOverlay(`<div class="sheet-modal"><div class="sheet-box">
      <span class="tag">${rep.age} 岁 · 年度决算单</span>
      <h3 style="margin:8px 0;">这一年的账单与收获</h3>
      ${html}
    </div></div>`, host => {
      host.querySelector('#y-ok').onclick = () => { clearOverlay(); render(); };
    });
  }
}

// ===== 重大决策与 P0 小游戏底部抽屉 =====
function launchFlipGame() {
  state.flipGameThisYear++;
  mountOverlay(`<div class="sheet-modal"><div class="sheet-box" id="mg-box"></div></div>`, host => {
    openFlipCardGame(host.querySelector('#mg-box'), state, res => {
      state.cash += res.cash || 0;
      state.stats.mood = clamp(state.stats.mood + (res.mood || 0));
      state.stats.knowledge = clamp(state.stats.knowledge + (res.know || 0));
      clearOverlay(); showToast(`翻卡博弈：${res.note}`);
    });
  });
}

function launchHomePuzzle() {
  mountOverlay(`<div class="sheet-modal"><div class="sheet-box" id="mg-box"></div></div>`, host => {
    openHomePuzzleGame(host.querySelector('#mg-box'), state, res => {
      if (state.house) state.house.buffActive = res.buffActive;
      state.stats.mood = clamp(state.stats.mood + (res.mood || 0));
      clearOverlay(); showToast(`空间拼图：${res.note}`);
    });
  });
}

function launchGomokuGame() {
  mountOverlay(`<div class="sheet-modal"><div class="sheet-box" id="mg-box"></div></div>`, host => {
    openGomokuGame(host.querySelector('#mg-box'), state, res => {
      state.stats.mood = clamp(state.stats.mood + (res.mood || 0));
      state.relations.friend.intimacy = clamp(state.relations.friend.intimacy + (res.intimacy || 0));
      if (res.antiScam && !state.experiences.includes('exp_anti_scam')) state.experiences.push('exp_anti_scam');
      clearOverlay(); showToast(`石桌五子棋：${res.note}`);
    });
  });
}

function openHouseSheet() {
  const city = CITIES[state.cityTier];
  mountOverlay(`<div class="sheet-modal"><div class="sheet-box">
    <h3 style="margin:0 0 8px;">🏠 房产买卖（${city.name.slice(0,4)}）</h3>
    ${state.house ? `<div class="mg-stats">当前：<b>${state.house.name}</b> · 估值 ${fmtMoney(state.house.value)} · 余贷 ${fmtMoney(state.house.loan)}<br/><button class="btn secondary" id="sell-h" style="margin-top:6px;">卖出当前房 (扣2%税费)</button></div>` : ''}
    <div style="display:flex;flex-direction:column;gap:7px;">
      ${city.houses.map(h => {
        const dp = Math.round(h.price * 0.3);
        return `<button class="action-card" data-buy="${h.id}" ${state.house?'disabled':''}>
          <div class="ac-top"><span>${h.tier}房 (${fmtMoney(h.price)})</span><span>${h.grid}×${h.grid}网格</span></div>
          <div class="ac-sub">首付 ${fmtMoney(dp)}（含父母可支援 ${fmtMoney(state.parentSupportLeft)}）· 月供 ${monthlyPmt(h.price-dp).toLocaleString()}</div>
        </button>`;
      }).join('')}
    </div>
    <div class="mg-actions"><button class="btn ghost" id="c">关闭</button></div>
  </div></div>`, host => {
    host.querySelector('#c').onclick = clearOverlay;
    const sell = host.querySelector('#sell-h');
    if (sell) sell.onclick = () => {
      const net = Math.round(state.house.value * 0.98) - state.house.loan;
      if (state.cash + net < 0) return showToast('现金不足以补齐余贷差额');
      state.cash += net; state.house = null; clearOverlay(); showToast(`卖房落袋 ${fmtMoney(net)}`);
    };
    host.querySelectorAll('[data-buy]').forEach(b => {
      b.onclick = () => {
        const h = city.houses.find(x => x.id === b.dataset.buy);
        const dp = Math.round(h.price * 0.3);
        const sup = Math.min(state.parentSupportLeft, Math.max(0, dp - state.cash));
        if (state.cash + sup < dp) return showToast(`资金不足，需首付 ${fmtMoney(dp)}`);
        state.parentSupportLeft -= sup; state.cash -= (dp - sup);
        state.house = { id: h.id, tier: h.tier, name: h.label, value: h.price, basePrice: h.price, loan: h.price - dp, pmtMo: monthlyPmt(h.price - dp), grid: h.grid, buffActive: false };
        state.albumPhotos.push({ age: state.age, stamp: getDateStamp(state.age, state.subTurn), title: `购入${h.tier}房安家`, stageIdx: getSubStageIndex(state.age), bg: getBgKey(state.age) });
        clearOverlay(); launchHomePuzzle();
      };
    });
  });
}

function openGoldSheet() {
  const hand = Math.round(state.goldPrice * 10 * 1.01);
  mountOverlay(`<div class="sheet-modal"><div class="sheet-box">
    <h3 style="margin:0 0 8px;">🪙 黄金避险 (${state.goldPrice} 元/克)</h3>
    <div class="mg-stats">当前持仓：<b>${Math.round(state.goldGrams)} 克</b>（约 ${fmtMoney(state.goldGrams * state.goldPrice)}）</div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;">
      <button class="btn primary" id="gb10">买 10 克 (-${fmtMoney(hand)})</button>
      <button class="btn primary" id="gb100">买 100 克 (-${fmtMoney(hand*10)})</button>
      <button class="btn secondary" id="gsall" ${state.goldGrams<=0?'disabled':''}>全部卖出</button>
    </div>
    <div class="mg-actions"><button class="btn ghost" id="c">关闭</button></div>
  </div></div>`, host => {
    host.querySelector('#c').onclick = clearOverlay;
    const buy = g => {
      const cost = Math.round(state.goldPrice * g * 1.01);
      if (state.cash < cost) return showToast('可用现金不足');
      state.cash -= cost; state.goldGrams += g; clearOverlay(); showToast(`买入黄金 ${g} 克`);
    };
    host.querySelector('#gb10').onclick = () => buy(10);
    host.querySelector('#gb100').onclick = () => buy(100);
    host.querySelector('#gsall').onclick = () => {
      const earn = Math.round(state.goldGrams * state.goldPrice * 0.99);
      state.cash += earn; state.goldGrams = 0; clearOverlay(); showToast(`卖出黄金落袋 ${fmtMoney(earn)}`);
    };
  });
}

function handleLottery() {
  if (state.cash < 20) return showToast('现金不足 20 元');
  state.cash -= 20; state.stats.mood = clamp(state.stats.mood + 1); state.lotteryThisTurn = true;
  const koi = (state.talent.id === 't_koi' || state.talent.id === 't_koi2') ? 10 : 1;
  const r = Math.random();
  if (r < (1 / 500000) * koi) { state.cash += 4000000; showToast('🎉 万中无一头奖！税后 400 万到账！'); }
  else if (r < 0.0005) { state.cash += 3000; showToast('🎊 彩票中三等奖 3,000 元！'); }
  else if (r < 0.0055) { state.cash += 200; showToast('✨ 彩票中 200 元小奖！'); }
  else if (r < 0.0555) { state.cash += 20; showToast('😄 刚好回本 20 元，心态 +1'); }
  else showToast('🎟️ 谢谢惠顾！花 20 块买了个晚上的白日梦（心态 +1）');
}

function openEmoSheet() {
  const half = state.emoBuyThisYear >= 1;
  mountOverlay(`<div class="sheet-modal"><div class="sheet-box">
    <h3 style="margin:0 0 6px;">🛍️ 情绪买单</h3>
    <p class="mg-tip">${half ? '⚠️ 本年已使用过，本次效果减半' : '用现金即时换取心态回暖与减压（每回合限 1 次）'}</p>
    <div style="display:flex;flex-direction:column;gap:7px;">
      <button class="action-card" data-eb="300,4,2"><div class="ac-top"><span>吃顿大餐</span><span>-300元</span></div><div class="ac-sub">心态 +${half?2:4} / 疲劳 -${half?1:2}</div></button>
      <button class="action-card" data-eb="2000,6,3"><div class="ac-top"><span>买数码 / 盲盒</span><span>-2,000元</span></div><div class="ac-sub">心态 +${half?3:6} / 疲劳 -${half?1:3}</div></button>
      <button class="action-card" data-eb="8000,8,4"><div class="ac-top"><span>周末短途逃离</span><span>-8,000元</span></div><div class="ac-sub">心态 +${half?4:8} / 疲劳 -${half?2:4}</div></button>
    </div>
    <div class="mg-actions"><button class="btn ghost" id="c">算了省点钱</button></div>
  </div></div>`, host => {
    host.querySelector('#c').onclick = clearOverlay;
    host.querySelectorAll('[data-eb]').forEach(b => {
      b.onclick = () => {
        const [cost, mo, fa] = b.dataset.eb.split(',').map(Number);
        if (state.cash < cost) return showToast('可用现金不足');
        state.cash -= cost;
        state.stats.mood = clamp(state.stats.mood + (half ? Math.floor(mo/2) : mo));
        state.stats.fatigue = clamp(state.stats.fatigue - (half ? Math.floor(fa/2) : fa));
        state.emoBuyThisYear++; state.emoBuyThisTurn = true;
        clearOverlay(); showToast('奖励了自己一下，心情舒畅多了！');
      };
    });
  });
}

function handlePromo() {
  const nextL = state.jobLevel + 1;
  if (state.stats.pro < PROMO_REQ[nextL] || state.projectCount < nextL - 1) {
    return showToast(`晋升 L${nextL} 需专业≥${PROMO_REQ[nextL]} 且项目经历≥${nextL - 1}`);
  }
  state.jobLevel = nextL; state.yearsInLevel = 0; state.stats.mood = clamp(state.stats.mood + 6);
  showToast(`🎉 成功晋升至 L${nextL}！薪资台阶跃迁！`);
}

function openLoveSheet() {
  mountOverlay(`<div class="sheet-modal"><div class="sheet-box">
    <h3 style="margin:0 0 8px;">💘 结识伴侣（3 档背景可见）</h3>
    <div style="display:flex;flex-direction:column;gap:7px;">
      ${SPOUSE_BACKGROUNDS.map(sp => `<button class="action-card" data-sp="${sp.id}"><div class="ac-top"><span>${sp.name}</span><span>合账 ×${sp.incomeMult}</span></div><div class="ac-sub">${sp.desc}</div></button>`).join('')}
    </div>
    <div class="mg-actions"><button class="btn ghost" id="c">暂不恋爱</button></div>
  </div></div>`, host => {
    host.querySelector('#c').onclick = clearOverlay;
    host.querySelectorAll('[data-sp]').forEach(b => {
      b.onclick = () => {
        const sp = SPOUSE_BACKGROUNDS.find(x => x.id === b.dataset.sp);
        state.relations.partner = { name: sp.name, bgId: sp.id, incomeMult: sp.incomeMult, intimacy: 50, married: false, missedTurns: 0 };
        clearOverlay(); showToast(`开启恋爱线：${sp.name}`);
      };
    });
  });
}

function openMarrySheet() {
  const p = state.relations.partner;
  if (p.intimacy < 60) return showToast(`谈婚论嫁需伴侣亲密 ≥60（当前 ${p.intimacy}）`);
  mountOverlay(`<div class="sheet-modal"><div class="sheet-box">
    <h3 style="margin:0 0 8px;">💍 谈婚论嫁（开启双收入合账）</h3>
    <div style="display:flex;flex-direction:column;gap:7px;">
      <button class="action-card" data-w="30000,4" ${p.intimacy<75?'disabled':''}><div class="ac-top"><span>极简领证</span><span>-3万 (需亲密≥75)</span></div></button>
      <button class="action-card" data-w="250000,10"><div class="ac-top"><span>体面婚礼</span><span>-25万 (亲密+10)</span></div></button>
      <button class="action-card" data-w="500000,16"><div class="ac-top"><span>盛大婚礼</span><span>-50万 (亲密+16)</span></div></button>
    </div>
    <div class="mg-actions"><button class="btn ghost" id="c">再等等</button></div>
  </div></div>`, host => {
    host.querySelector('#c').onclick = clearOverlay;
    host.querySelectorAll('[data-w]').forEach(b => {
      b.onclick = () => {
        const [cost, g] = b.dataset.w.split(',').map(Number);
        if (state.cash < cost) return showToast('可用现金不足');
        state.cash -= cost; p.married = true; p.intimacy = clamp(p.intimacy + g);
        state.albumPhotos.push({ age: state.age, stamp: getDateStamp(state.age, state.subTurn), title: '步入婚姻殿堂', stageIdx: getSubStageIndex(state.age), bg: getBgKey(state.age) });
        clearOverlay(); showToast('💍 恭喜成家！开启双收入合账');
      };
    });
  });
}

function openKidSheet() {
  mountOverlay(`<div class="sheet-modal"><div class="sheet-box">
    <h3 style="margin:0 0 8px;">👶 生娃 / 自主丁克抉择</h3>
    <div style="display:flex;flex-direction:column;gap:7px;">
      <button class="action-card" data-k="25000"><div class="ac-top"><span>生娃 · 刚需穷养</span><span>2.5万/年</span></div></button>
      <button class="action-card" data-k="50000"><div class="ac-top"><span>生娃 · 中产常规</span><span>5万/年</span></div></button>
      <button class="action-card" data-k="100000"><div class="ac-top"><span>生娃 · 鸡娃精养</span><span>10万/年</span></div></button>
      <button class="action-card" id="k-dink"><div class="ac-top"><span>选择丁克二人世界</span><span>自由独立全满贯</span></div></button>
    </div>
    <div class="mg-actions"><button class="btn ghost" id="c">暂缓</button></div>
  </div></div>`, host => {
    host.querySelector('#c').onclick = clearOverlay;
    host.querySelector('#k-dink').onclick = () => { state.choseDink = true; clearOverlay(); showToast('选择自由丁克人生！'); };
    host.querySelectorAll('[data-k]').forEach(b => {
      b.onclick = () => {
        state.child = { bornAge: state.age, tierCost: Number(b.dataset.k), study: 20, mood: 75, bond: 65 };
        state.albumPhotos.push({ age: state.age, stamp: getDateStamp(state.age, state.subTurn), title: '迎来家庭新成员', stageIdx: getSubStageIndex(state.age), bg: getBgKey(state.age) });
        clearOverlay(); showToast('👶 新生命降临！解锁 3 维孩子档案卡');
      };
    });
  });
}

function openDreamSheet() {
  const limit = state.age >= 19 ? 2 : 5;
  mountOverlay(`<div class="sheet-modal"><div class="sheet-box">
    <h3 style="margin:0 0 8px;">⭐ v1.4 五梦想主线（18岁后聚焦 1–2 条）</h3>
    <div style="display:flex;flex-direction:column;gap:7px;">
      ${DREAMS.map(d => {
        const has = state.activeDreams.some(x => x.id === d.id);
        return `<button class="action-card" data-d="${d.id}" ${has || state.activeDreams.length >= limit ? 'disabled' : ''}>
          <div class="ac-top"><span>${d.name}</span><span>${has?'✅已开启':'开启'}</span></div>
          <div class="ac-sub">${d.desc}</div>
        </button>`;
      }).join('')}
    </div>
    <div class="mg-actions"><button class="btn ghost" id="c">关闭</button></div>
  </div></div>`, host => {
    host.querySelector('#c').onclick = clearOverlay;
    host.querySelectorAll('[data-d]').forEach(b => {
      b.onclick = () => { state.activeDreams.push(DREAMS.find(x => x.id === b.dataset.d)); clearOverlay(); showToast('点亮梦想主线！'); };
    });
  });
}

function openCitySheet() {
  mountOverlay(`<div class="sheet-modal"><div class="sheet-box">
    <h3 style="margin:0 0 8px;">🚄 中途换城</h3>
    <div style="display:flex;flex-direction:column;gap:7px;">
      ${[1,2,3].map(t => `<button class="action-card" data-ct="${t}" ${state.cityTier===t?'disabled':''}>
        <div class="ac-top"><span>${CITIES[t].name}</span><span>×${CITIES[t].salaryCoef}</span></div>
      </button>`).join('')}
    </div>
    <div class="mg-actions"><button class="btn ghost" id="c">取消</button></div>
  </div></div>`, host => {
    host.querySelector('#c').onclick = clearOverlay;
    host.querySelectorAll('[data-ct]').forEach(b => {
      b.onclick = () => { state.cityTier = Number(b.dataset.ct); clearOverlay(); showToast(`迁居至${CITIES[state.cityTier].name.slice(0,4)}`); };
    });
  });
}

// ===== 终章「人生纪念册」=====
function renderMemorial() {
  localStorage.setItem('zhebeizi_cleared', '1');
  unlockedSelfPick = true;
  const ev = evaluateEnding(state);
  appEl.innerHTML = `
    <div class="phone-stage-outer">
      <div class="phone-frame">
        <div class="wx-topbar-safe"><div class="wx-capsule"><span>•••</span><span>|</span><span>◉</span></div></div>
        <div class="tab-page" style="padding-top:56px;">
          <div class="sec-card" style="text-align:center;">
            <span class="tag hot">终章 · 人生纪念册</span>
            <h2 style="margin:8px 0 4px;">${ev.title}</h2>
            <div style="font-size:12.5px;color:var(--muted);">${state.endReason} · 出身 ${state.origin.name} → 净资产 ${fmtMoney(ev.netWorth)}</div>
          </div>

          <div class="memorial-grid">
            <div class="mem-card"><div style="font-size:12px;">安身立命</div><div class="mem-grade">${ev.scores.career.g}</div><small>${ev.scores.career.val}分</small></div>
            <div class="mem-card"><div style="font-size:12px;">爱与羁绊</div><div class="mem-grade">${ev.scores.love.g}</div><small>${ev.scores.love.val}分</small></div>
            <div class="mem-card"><div style="font-size:12px;">赤子之心</div><div class="mem-grade">${ev.scores.dream.g}</div><small>${ev.scores.dream.val}分</small></div>
            <div class="mem-card"><div style="font-size:12px;">善始善终</div><div class="mem-grade">${ev.scores.health.g}</div><small>${ev.scores.health.val}分</small></div>
          </div>

          <div class="sec-card">
            <h4>暗线因果链</h4>
            <div style="display:flex;gap:6px;flex-wrap:wrap;">
              ${ev.darkChains.map(c => `<span class="tag ${c.ok?'up':''}">${c.ok?'✅':'⬜'} ${c.name}</span>`).join('')}
            </div>
          </div>

          <div class="sec-card">
            <h4>人生树分叉重走</h4>
            <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px;">
              ${[18,30,50].map(a => `<button class="btn secondary" data-rb="${a}" ${state.branches[a]?'':'disabled'}>回 ${a} 岁</button>`).join('')}
            </div>
            <button class="cta-main" id="btn-restart" style="width:100%;">开启新的一生（已解锁自选出身）</button>
          </div>
        </div>
      </div>
    </div>
  `;
  appEl.querySelectorAll('[data-rb]').forEach(b => {
    b.onclick = () => {
      const a = Number(b.dataset.rb);
      const saved = JSON.parse(state.branches[a]);
      saved.branches = state.branches; saved.ended = false;
      state = saved; activeTab = 'home'; render();
    };
  });
  appEl.querySelector('#btn-restart').onclick = () => {
    state = null; rerollUsed = false; pickedOrigin = rollOrigin(); pickedTalent = pickedOrigin.talents[0].id; renderIntro();
  };
}

initSpritesAndRender();
