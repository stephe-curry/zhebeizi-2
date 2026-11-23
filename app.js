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
import { pxIcon, chevDownIcon } from './icons.js';

const appEl = document.getElementById('app');

let state = null;
let sprites = { male: null, female: null };
let activeTab = 'home'; // 'home' | 'assets' | 'social' | 'album'
let drawerOpen = false;
let inspectedId = null; // 方案 A：单行预览条当前聚焦的行动卡 ID
let moreMenuOpen = false; // 抽屉右上角 ··· 浮层菜单
let draft = [];
let toastTimer = null;
let toastMsg = '';
let floatPops = []; // 主角身旁彩色上浮飘字
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

function getSeasonTitle(s) {
  const stage = getSubStage(s.age);
  return `${stage.name} · 第 ${s.subTurn} 季`;
}

function getSeasonMood(s) {
  return s.stats.fatigue >= s.origin.fatigueLimit ? '有点透支了，注意喘口气'
    : s.stats.mood >= 75 ? '阳光正好，心里踏实'
    : s.age <= 12 ? '放学后的风很温柔'
    : s.age <= 18 ? '黑板上的倒计时又少了一天'
    : s.age <= 35 ? '在城市里慢慢扎下根'
    : s.age <= 50 ? '扛起生活，也别忘了自己'
    : '慢下来，好好享受眼前的日子';
}

function trendIcon(t) {
  return t === 'hot' ? '🔥↑↑' : t === 'up' ? '📈↑' : t === 'down' ? '📉↓' : '➡️平';
}

function getGoalMeta(s) {
  const toy = s.gender === 'female' ? '芭比娃娃' : '红色悠悠球';
  if (s.age < 8) {
    const pct = Math.min(100, Math.round((Math.max(0, s.cash) / 80) * 100));
    return {
      text: `8 岁前留出 ¥80 买「${toy}」`,
      pct,
      label: s.cash >= 80 ? '已达标' : `${Math.max(0, Math.round(s.cash))}/80`
    };
  }
  if (s.age <= 18) {
    return {
      text: `距高考还有 ${Math.max(0, 18 - s.age)} 年 · 名校线学识 75`,
      pct: Math.min(100, Math.round((s.stats.knowledge / 75) * 100)),
      label: `${s.stats.knowledge}/75`
    };
  }
  if (s.age < s.gradAge) {
    return { text: `大学攒学识与表达，为 ${s.gradAge} 岁毕业择城打底`, pct: null, label: '' };
  }
  if (!s.house) {
    const total = Math.max(0, s.cash + (s.parentSupportLeft || 0));
    return {
      text: `攒够 ¥15 万首付安家，解锁小家拼图`,
      pct: Math.min(100, Math.round((total / 150000) * 100)),
      label: `${fmtMoney(total)}/15万`
    };
  }
  if (s.age < 55) {
    return { text: `平衡职级（L${s.jobLevel}）、伴侣亲密与健康，稳渡中年风浪`, pct: null, label: '' };
  }
  if (!s.elderCircle && !(s.relations.partner?.married)) {
    return { text: `60 岁后去跳广场舞建老年圈，抵消退休孤独感`, pct: null, label: '' };
  }
  if (s.worldTrips < 1) {
    return { text: `保持健康 ≥60（冲 90 岁延寿），筹备环游世界`, pct: Math.min(100, Math.round((s.stats.health / 60) * 100)), label: `健 ${s.stats.health}/60` };
  }
  return { text: `慢享金色晚年，把这一辈子的回忆收进纪念册`, pct: null, label: '' };
}

const DOMAIN_STYLE = {
  '1.成长与学习': { wellBg: '#eaf2fb', slotBg: '#e4eef9', slotFg: '#3a6eb0' },
  '2.职业与搞钱': { wellBg: '#fcf4df', slotBg: '#f9edd0', slotFg: '#9e6d14' },
  '3.情感与社交': { wellBg: '#fcebf0', slotBg: '#f9e1e9', slotFg: '#b8486b' },
  '4.家庭与育儿': { wellBg: '#e8f4f8', slotBg: '#ddf0f6', slotFg: '#2e7b96' },
  '5.梦想专精':   { wellBg: '#f2ecfa', slotBg: '#ebe2f8', slotFg: '#6f50a8' },
  '6.身心与生活': { wellBg: '#e8f5ed', slotBg: '#dff1e6', slotFg: '#357e52' }
};

function getActionMeta(a, s) {
  const ds = DOMAIN_STYLE[a.cat] || DOMAIN_STYLE['1.成长与学习'];
  const map = {
    study_self:        { ico: 'study',    short: '课业自习' },
    study_tutor:       { ico: 'tutor',    short: '付费补习' },
    gaokao_sprint:     { ico: 'sprint',   short: '考前冲刺' },
    pro_self:          { ico: 'study',    short: '专业自学' },
    pro_course:        { ico: 'tutor',    short: '项目/AI' },
    elder_uni:         { ico: 'tutor',    short: '老年大学' },
    chores:            { ico: 'coin',     short: s.age <= 12 ? '做家务' : '假期兼职' },
    overtime:          { ico: 'work',     short: '加班副业' },
    rehire_work:       { ico: 'work',     short: '专家返聘' },
    accompany_parents: { ico: 'parents',  short: '陪伴父母' },
    accompany_friend:  { ico: 'social',   short: s.age <= 18 ? '找同桌玩' : '约老友' },
    date_partner:      { ico: 'heart',    short: s.relations.partner?.married ? '夫妻约会' : '恋爱约会' },
    square_dance:      { ico: 'dance',    short: '跳广场舞' },
    tutor_kid:         { ico: 'study',    short: '辅导作业' },
    play_kid:          { ico: 'baby',     short: '陪娃玩' },
    train_dream:       { ico: 'dream',    short: s.activeDreams.length ? '追梦专练' : '梦想启蒙' },
    exercise:          { ico: 'exercise', short: s.age >= 51 ? '太极散步' : '体育锻炼' },
    rest:              { ico: 'rest',     short: '完整休息' },
    pub_drink:         { ico: 'pub',      short: '小酒馆' },
    world_trip:        { ico: 'trip',     short: '环游世界' }
  };
  const m = map[a.id] || { ico: 'dream', short: a.name.slice(0, 4) };
  return { ...ds, ...m };
}

// 为新手/当前状态标出 1–2 枚贴纸推荐角标（保持 克制，绝不泛滥）
function getRecommendedActionMap(s, actions) {
  const rec = {};
  const has = id => actions.some(a => a.id === id && !a.disabled);
  if (s.stats.fatigue >= s.origin.fatigueLimit - 2 || s.stats.mood < 40) {
    if (has('rest')) rec.rest = '回血';
  }
  if (s.stats.health < 45 && has('exercise')) {
    rec.exercise = '保健康';
  }
  if (Object.keys(rec).length < 2) {
    if (s.age < 8 && has('chores')) rec.chores = '目标';
    else if (s.age >= 15 && s.age <= 18 && has('gaokao_sprint')) rec.gaokao_sprint = '冲刺';
    else if (s.age >= 8 && s.age <= 18 && has('study_self')) rec.study_self = '升学';
    else if (s.age >= 19 && s.age <= 50 && !s.house && has('pro_course')) rec.pro_course = '提薪';
    else if (s.age >= 60 && !s.elderCircle && !(s.relations.partner?.married) && has('square_dance')) rec.square_dance = '抗孤独';
    else if (s.age >= 60 && s.worldTrips < 1 && s.cash >= 80000 && has('world_trip')) rec.world_trip = '心愿';
    else if (has('accompany_parents') && s.relations.parents.intimacy < 60) rec.accompany_parents = '亲情';
  }
  return rec;
}

// 智能帮排：按当前目标与健康/心态自动填满空槽（新手救生圈 + 长局减负）
function buildSmartDraft(s, actions, budget) {
  const valid = id => actions.find(a => a.id === id && !a.disabled);
  const picks = [];
  let cashLeft = s.cash;
  const tryPush = id => {
    if (picks.length >= budget.available) return false;
    const a = valid(id);
    if (!a) return false;
    if (a.costCash > 0 && cashLeft < a.costCash) return false;
    picks.push(a.id);
    cashLeft -= a.costCash;
    return true;
  };

  if (s.stats.fatigue >= s.origin.fatigueLimit - 2 || s.stats.mood < 42) tryPush('rest');
  if (s.stats.health < 50) tryPush('exercise');

  const stagePriority = s.age <= 12
    ? ['chores', 'study_self', 'accompany_friend', 'train_dream', 'accompany_parents', 'exercise']
    : s.age <= 18
      ? ['gaokao_sprint', 'study_self', 'accompany_friend', 'train_dream', 'rest', 'chores']
      : s.age <= 50
        ? ['pro_course', 'pro_self', 'date_partner', 'play_kid', 'overtime', 'exercise', 'accompany_parents', 'rest']
        : ['square_dance', 'exercise', 'elder_uni', 'accompany_friend', 'train_dream', 'rest'];

  for (const id of stagePriority) {
    if (picks.length >= budget.available) break;
    tryPush(id);
  }
  for (const a of actions) {
    if (picks.length >= budget.available) break;
    if (!a.disabled && a.costCash <= cashLeft) tryPush(a.id);
  }
  return picks;
}

function triggerFloatPops(summaryList) {
  const pops = [];
  for (const line of summaryList.slice(0, 4)) {
    const k = /现金 \+|零花钱 \+|环游|梦想/.test(line) ? 'gold'
      : /透支|孤独|健康 -|心态 -/.test(line) ? 'neg' : 'pos';
    // 截短为极清爽的飘字短语
    const short = line.replace(/^.*?：/, '').split('，')[0].slice(0, 14);
    pops.push({ text: short, k });
  }
  if (!pops.length) pops.push({ text: '安稳度过这一季', k: 'pos' });
  floatPops = pops;
  setTimeout(() => { floatPops = []; render(); }, 1650);
}

function showToast(text) {
  toastMsg = text;
  if (toastTimer) clearTimeout(toastTimer);
  const overlay = document.getElementById('phone-overlay-host');
  if (overlay) {
    document.querySelectorAll('.toast-ribbon').forEach(el => el.remove());
    const frame = document.querySelector('.phone-frame');
    if (frame) {
      const el = document.createElement('div');
      el.className = 'toast-ribbon';
      el.style.zIndex = '95';
      el.textContent = text;
      el.onclick = () => { el.remove(); toastMsg = ''; };
      frame.appendChild(el);
    }
  } else {
    render();
  }
  toastTimer = setTimeout(() => {
    toastMsg = '';
    toastTimer = null;
    if (document.getElementById('phone-overlay-host')) {
      document.querySelectorAll('.toast-ribbon').forEach(el => el.remove());
    } else {
      render();
    }
  }, 2300);
}

function mountOverlay(html, bind) {
  const frame = document.querySelector('.phone-frame');
  if (!frame) return;
  if (toastTimer) { clearTimeout(toastTimer); toastTimer = null; toastMsg = ''; }
  document.querySelectorAll('.toast-ribbon').forEach(el => el.remove());
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
function showV3Capture({ title, badge, bodyHtml, photoCaption, onDone, storyMode = false }) {
  const bgKey = getBgKey(state.age);
  const stageIdx = getSubStageIndex(state.age);
  const stamp = getDateStamp(state.age, state.subTurn);
  const spUrl = sprites[state.gender]?.[stageIdx] || '';

  if (photoCaption) {
    state.albumPhotos.push({ age: state.age, stamp, title: photoCaption, stageIdx, bg: bgKey });
  }

  const headHtml = storyMode
    ? `<div class="story-head-meta">
         <span class="story-chapter">${pxIcon('film', 13)} ${badge || '记忆定格'}</span>
         <span class="story-stamp-mini">${stamp} · ${state.age}岁</span>
       </div>
       <h3 class="story-title">${title}</h3>`
    : `<div><span class="tag hot">${badge || '关键时刻定格'}</span></div>
       <h3 style="margin:0;font-size:17.5px;">${title}</h3>`;

  mountOverlay(`
    <div class="v3-overlay">
      <div class="v3-viewfinder" style="${storyMode ? 'height:35%;' : ''}">
        <img class="scene-bg" src="./assets/bg/${bgKey}.jpg" />
        <div class="film-overlay"></div>
        <div class="shutter-flash"></div>
        <div class="v3-brackets"><span class="tl"></span><span class="tr"></span><span class="bl"></span><span class="br"></span></div>
        <div class="hero-anchor" style="bottom:${storyMode ? '5%' : '8%'};">
          ${spUrl ? `<img class="hero-sprite" style="height:${storyMode ? '118px' : '148px'};" src="${spUrl}" />` : ''}
        </div>
        <div class="date-stamp">${stamp}</div>
      </div>
      <div class="film-sprockets">${'<i></i>'.repeat(12)}</div>
      <div class="v3-body ${storyMode ? 'story-reader' : ''}">
        ${headHtml}
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

  // 场景角落最多 1 个轻提示贴纸（统一轻像素图标）
  let cornerSticker = null;
  if (state.age <= 12 && state.flipGameThisYear < 1 && tCount >= 1) {
    cornerSticker = { id: 'flip', ico: 'card', label: '课间翻卡博弈' };
  } else if (state.age >= 22 && !state.house && state.cash + state.parentSupportLeft >= 150000) {
    cornerSticker = { id: 'house', ico: 'home', label: '够首付安家了' };
  } else if (state.age >= 55) {
    cornerSticker = { id: 'gomoku', ico: 'chess', label: '公园石桌杀一盘' };
  }

  const mp = getMacroParams(state.age);
  let bodyHtml = '';
  if (activeTab === 'home') {
    const livePrev = drawerOpen && draft.length > 0 ? previewDraft(state, draft) : null;
    const fmtDelta = (v, label = '') => v > 0 ? `<span class="pill-delta pos">${label}+${v}</span>` : v < 0 ? `<span class="pill-delta neg">${label}-${Math.abs(v)}</span>` : '';
    const ctaText = draft.length > 0 ? `继续安排 (${draft.length}/${budget.available})` : getMainCtaText(state);
    bodyHtml = `
      <div class="v4-wrapper">
        <!-- L1 顶部统一 4 列直白状态栏（排程时下方浮出实时红绿变动角标） -->
        <div class="hud-pills">
          <div class="pill" id="hud-era">
            <span class="pill-label">年龄</span>
            <span class="pill-val">${state.age}岁</span>
          </div>
          <div class="pill" id="hud-cash">
            <span class="pill-label">现金</span>
            <span class="pill-val">¥${fmtMoney(state.cash)}</span>
            ${livePrev && livePrev.cash !== 0 ? `<span class="pill-delta ${livePrev.cash>0?'pos':'neg'}">${livePrev.cash>0?'+':'-'}¥${fmtMoney(Math.abs(livePrev.cash))}</span>` : ''}
          </div>
          <div class="pill" id="hud-health">
            <span class="pill-label">健康</span>
            <span class="pill-val" style="color:${state.stats.health<30?'var(--red)':'var(--green)'}">${state.stats.health}</span>
            <div class="pill-bar"><div class="pill-bar-fill" style="width:${state.stats.health}%;background:${state.stats.health<30?'var(--red)':'var(--green)'}"></div></div>
            ${livePrev && livePrev.health !== 0 ? fmtDelta(livePrev.health, '健康 ') : ''}
          </div>
          <div class="pill" id="hud-mood">
            <span class="pill-label">心态</span>
            <span class="pill-val" style="color:${state.stats.mood<35?'var(--red)':'var(--accent)'}">${state.stats.mood}</span>
            <div class="pill-bar"><div class="pill-bar-fill" style="width:${state.stats.mood}%;background:${state.stats.mood<35?'var(--red)':'var(--accent)'}"></div></div>
            ${livePrev && livePrev.mood !== 0 ? fmtDelta(livePrev.mood, '心态 ') : ''}
          </div>
        </div>

        <!-- L2 全屏轻像素沉浸舞台 -->
        <div class="scene-stage ${drawerOpen ? 'drawer-open' : ''}">
          <img class="scene-bg" src="./assets/bg/${bgKey}.jpg" />
          <div class="film-overlay"></div>
          <div class="film-lightleak"></div>
          ${!drawerOpen ? `<button class="news-btn" id="btn-news">${pxIcon('news', 15)} 时代简报${state.age >= 18 ? '<span class="news-dot"></span>' : ''}</button>` : ''}
          <div class="hero-anchor ${heroHop ? 'hop' : ''}" id="hero-tap">
            ${bubbleUrl ? `<img class="hero-bubble" src="${bubbleUrl}" />` : ''}
            ${spUrl ? `<img class="hero-sprite" src="${spUrl}" />` : ''}
            <div class="hero-shadow"></div>
          </div>
          ${floatPops.length ? `<div class="float-layer">${floatPops.map((p, idx) => `<div class="float-pop ${p.k}" style="animation-delay:${idx*140}ms;left:${48 + (idx%2===0?-8:8)}%;">${p.text}</div>`).join('')}</div>` : ''}
          ${!drawerOpen && cornerSticker ? `<button class="corner-sticker" id="corner-btn">${pxIcon(cornerSticker.ico, 15)} ${cornerSticker.label}</button>` : ''}
          <div class="date-stamp">${stamp}</div>
        </div>

        <!-- L3 拍立得厚白边：单行标题 + 柔和副标题 + 季节进度点 + 唯一主按钮 -->
        <div class="polaroid-margin">
          <div class="washi-tape left"></div>
          <div class="washi-tape right"></div>
          <div class="season-caption">${getSeasonTitle(state)}</div>
          <div class="season-mood">${getSeasonMood(state)}</div>
          <div class="season-dots">
            ${Array.from({ length: mp.subTurns }).map((_, idx) => `<span class="s-dot ${idx + 1 < state.subTurn ? 'past' : idx + 1 === state.subTurn ? 'now' : ''}"></span>`).join('')}
            <span class="season-dots-label">本年第 ${state.subTurn}/${mp.subTurns} 季</span>
          </div>
          ${(budget.commuteLocked || budget.babyLock) ? `<div class="season-sub">${budget.commuteLocked ? '远郊通勤占1格' : ''}${budget.babyLock ? ' · 育儿照护占1格' : ''}</div>` : ''}
          <button class="cta-main" id="btn-open-drawer">${ctaText}</button>
        </div>

        <!-- 暖白手账纸条轻提示 -->
        ${toastMsg ? `<div class="toast-ribbon" id="toast-close">${toastMsg}</div>` : ''}

        <!-- V5 方案 A：4 列手账贴纸盘排程抽屉 -->
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

  const hideBottomNav = activeTab === 'home' && drawerOpen;
  appEl.innerHTML = `
    <div class="phone-stage-outer">
      <div class="phone-frame">
        <div class="wx-topbar-safe"><div class="wx-capsule"><span>•••</span><span>|</span><span>◉</span></div></div>
        ${bodyHtml}
        <nav class="bottom-nav ${hideBottomNav ? 'hidden-for-drawer' : ''}">
          <button class="nav-tab ${activeTab==='home'?'active':''}" data-tab="home"><span class="ico">${pxIcon('home', 22)}</span><span>主页</span></button>
          <button class="nav-tab ${activeTab==='assets'?'active':''} ${unlockAssets?'':'locked'}" data-tab="assets"><span class="ico">${pxIcon('bag', 22)}</span><span>家与账</span></button>
          <button class="nav-tab ${activeTab==='social'?'active':''} ${unlockSocial?'':'locked'}" data-tab="social"><span class="ico">${pxIcon('heart', 22)}</span><span>亲友梦</span></button>
          <button class="nav-tab ${activeTab==='album'?'active':''} ${unlockAlbum?'':'locked'} ${albumBounce?'bounce':''}" data-tab="album">
            <span class="ico">${pxIcon('film', 22)}</span><span>相册</span>
            <span class="nav-badge">${state.albumPhotos.length}</span>
          </button>
        </nav>
      </div>
    </div>
  `;

  bindMainEvents(actions, budget, cornerSticker);
}

function renderV5Drawer(actions, budget) {
  const prev = previewDraft(state, draft);
  const goal = getGoalMeta(state);
  const recMap = getRecommendedActionMap(state, actions);
  const isFirstTurn = (state.totalTurns || 0) === 0;
  const isFull = draft.length >= budget.available;

  // 统计每张贴纸已排入次数（专属右上角 ×N 计数）
  const slotCounts = {};
  for (const id of draft) slotCounts[id] = (slotCounts[id] || 0) + 1;

  // 解析当前预览条展示的行动卡
  const recFirstId = Object.keys(recMap)[0] || actions[0]?.id || null;
  let inspected = actions.find(a => a.id === inspectedId) || null;
  if (!inspected && !isFirstTurn) {
    inspected = actions.find(a => a.id === (draft[draft.length - 1] || recFirstId)) || actions[0] || null;
  }

  // 构建顶部单行预览条 / 新手 3 步无遮罩引导条
  let inspectorHtml = '';
  if (isFirstTurn && draft.length === 0 && !inspected) {
    inspectorHtml = `
      <div class="v5-inspector guide-mode">
        <div class="insp-well" style="--well-bg:var(--accent-soft);">${pxIcon('spark', 22)}</div>
        <div class="insp-body">
          <div class="insp-top">
            <span class="insp-step">1/3</span>
            <span class="insp-name">轻点下方贴纸，直接排进时间槽</span>
          </div>
          <div class="insp-sub">排入后在此看收益与代价 · 或点右上「帮我安排」</div>
        </div>
      </div>
    `;
  } else if (inspected) {
    const meta = getActionMeta(inspected, state);
    const inSlotCnt = slotCounts[inspected.id] || 0;
    let rightEl = '';
    let topTag = '';
    if (inspected.disabled) {
      topTag = `<span class="insp-tip">本年次数已满</span>`;
    } else if (isFull && !inSlotCnt) {
      topTag = `<span class="insp-tip">槽位已满</span>`;
      rightEl = `<button class="insp-replace" id="insp-replace">替换末位</button>`;
    } else if (isFull && isFirstTurn) {
      topTag = `<span class="insp-tip done">✓ 已排满</span>`;
    } else if (isFirstTurn && inSlotCnt > 0) {
      topTag = `<span class="insp-step">2/3</span><span class="insp-tip">已入槽 · 点上方 ✕ 可撤</span>`;
    } else if (recMap[inspected.id]) {
      topTag = `<span class="fx-chip gold">${recMap[inspected.id]}推荐</span>`;
    } else if (inSlotCnt > 0) {
      topTag = `<span class="insp-tip done">已排 ×${inSlotCnt}</span>`;
    }

    inspectorHtml = `
      <div class="v5-inspector ${isFirstTurn ? 'guide-mode' : ''}">
        <div class="insp-well" style="--well-bg:${meta.wellBg};">${pxIcon(meta.ico, 22)}</div>
        <div class="insp-body">
          <div class="insp-top">
            <span class="insp-name">${inspected.name}</span>
            ${inspected.costCash > 0 ? `<span class="insp-cost">¥${fmtMoney(inspected.costCash)}</span>` : ''}
            ${topTag}
          </div>
          <div class="chip-row">
            ${(inspected.chips || []).map(c => `<span class="fx-chip ${c.k}">${c.t}</span>`).join('')}
          </div>
        </div>
        ${rightEl}
      </div>
    `;
  }

  // 主工具按钮：首季/无历史显示「帮我安排」，有历史显示「沿用上次」（帮排也在 ··· 里随时可用）
  const useReuseAsPrimary = !isFirstTurn && state.lastDraft.length > 0;
  const primaryToolHtml = useReuseAsPrimary
    ? `<button class="smart-btn" id="v5-reuse">↺ 沿用上次</button>`
    : `<button class="smart-btn" id="v5-smart">${pxIcon('spark', 13)} 帮我安排</button>`;

  const remain = Math.max(0, budget.available - draft.length);
  const goPillHtml = isFirstTurn && isFull
    ? `<span class="go-pill">3/3 点这里出发</span>`
    : remain > 0
      ? `<span class="go-pill">差 ${remain} 格</span>`
      : `<span class="go-pill">已排满</span>`;

  return `
    <div class="v5-drawer ${drawerOpen ? 'open' : ''}">
      <div class="v5-grab"></div>
      <div class="v5-head">
        <span class="v5-title">本季安排<b>${draft.length}/${budget.available}</b></span>
        <div class="v5-tools">
          ${primaryToolHtml}
          <button class="ico-btn" id="v5-more-toggle" aria-label="更多操作">···</button>
          <button class="ico-btn close-btn" id="v5-close" title="收起回主页（保留草稿）" aria-label="收起抽屉">${chevDownIcon(15)}</button>
        </div>
        ${moreMenuOpen ? `
          <div class="v5-more-menu" id="v5-more-menu">
            <button class="v5-more-item" id="v5-smart-menu">${pxIcon('spark', 13)} 智能帮我安排</button>
            <button class="v5-more-item" id="v5-reuse-menu" ${state.lastDraft.length ? '' : 'disabled'}>↺ 沿用上次排程</button>
            <button class="v5-more-item" id="v5-tpl">${state.templates.balance.length ? '📋 载入我的模板' : '📌 存为我的模板'}</button>
            <button class="v5-more-item danger" id="v5-clear" ${draft.length ? '' : 'disabled'}>✕ 清空当前槽位</button>
          </div>
        ` : ''}
      </div>

      <div class="v5-slots ${budget.available >= 5 ? 'five' : ''}" style="grid-template-columns: repeat(${Math.min(5, budget.available)}, 1fr);">
        ${draft.map((id, i) => {
          const a = actions.find(x => x.id === id);
          const m = a ? getActionMeta(a, state) : { short: id, slotBg: 'var(--accent-soft)', slotFg: 'var(--accent)' };
          return `<button class="stamp-slot filled" style="--slot-bg:${m.slotBg};--slot-fg:${m.slotFg};" data-rm="${i}" title="点击移除">${m.short}<span class="sx">✕</span></button>`;
        }).join('')}
        ${Array.from({ length: remain }).map(() => `<span class="stamp-slot">＋ 空槽</span>`).join('')}
      </div>

      <div class="goal-note">
        ${pxIcon('pin', 13)}
        <span class="gn-text">${goal.text}</span>
        ${goal.pct !== null ? `<span class="gn-bar"><i style="width:${goal.pct}%"></i></span><span class="gn-num">${goal.label}</span>` : ''}
      </div>

      ${inspectorHtml}

      <div class="v5-cards">
        <div class="sticker-grid ${actions.length > 8 ? 'compact' : ''}">
          ${actions.map(a => {
            const m = getActionMeta(a, state);
            const cnt = slotCounts[a.id] || 0;
            const rec = recMap[a.id];
            const isFocus = inspected && inspected.id === a.id;
            const pulseFirst = isFirstTurn && draft.length === 0 && a.id === recFirstId;
            return `
              <button class="stk ${isFocus ? 'focus' : ''} ${cnt ? 'slotted' : ''} ${a.disabled ? 'is-disabled' : ''} ${pulseFirst ? 'guide-pulse' : ''}" data-sticker="${a.id}">
                ${rec ? `<span class="stk-rec">${rec}</span>` : ''}
                ${a.costCash > 0 ? `<span class="stk-price ${rec ? 'under-rec' : ''}">¥${fmtMoney(a.costCash)}</span>` : ''}
                ${cnt > 0 ? `<span class="stk-cnt">×${cnt}</span>` : ''}
                <div class="stk-well" style="--well-bg:${m.wellBg};">${pxIcon(m.ico, 23)}</div>
                <span class="stk-nm">${m.short}</span>
              </button>
            `;
          }).join('')}
        </div>
        <div class="v5-hint-line">${isFirstTurn ? '单点贴纸即排入 · 点上方槽位 ✕ 随时撤销 · 点右上角可收起回主页' : '单点即排入 · 排满后点贴纸可对比详情或替换 · 右上角 ∨ 收起回主页'}</div>
      </div>

      <div class="v5-footer">
        ${prev.fatigueWarn ? `<div class="v5-warn">⚠️ 本季安排过满（疲劳将达 ${prev.endFatigue}/${state.origin.fatigueLimit}），会额外损耗健康</div>` : ''}
        <button class="btn-go ${isFirstTurn && isFull ? 'ready-pulse' : ''}" id="v5-exec">开始这一季 → ${goPillHtml}</button>
      </div>
    </div>
  `;
}

function trendWord(t) {
  return t === 'hot' ? '强势走高' : t === 'up' ? '温和回暖' : t === 'down' ? '回调横盘' : '整体平稳';
}

function renderAssetsTab() {
  const nw = getNetWorth(state);
  const era = getCurrentEra(state);
  const sal = getCurrentMonthlySalary(state);
  const stamp = getDateStamp(state.age, state.subTurn);
  const toyLabel = state.gender === 'female' ? '8岁芭比娃娃' : '8岁悠悠球';

  // 木格旧物盒固定 3 格（含已收旧物 + 待收集预告槽）
  const keepsakes = state.items.map(name => ({
    name,
    ico: /芭比|娃娃/.test(name) ? 'doll' : /悠悠球/.test(name) ? 'yoyo' : 'dream',
    tag: state.house?.buffActive ? '已上墙 Buff' : '已珍藏',
    filled: true
  }));
  const emptyLabels = [
    state.age < 8 ? `8岁节点·${toyLabel.slice(2)}` : '童年旧物格',
    '人生纪念格',
    '心愿留痕格'
  ];
  while (keepsakes.length < 3) {
    keepsakes.push({ name: emptyLabels[keepsakes.length], filled: false });
  }

  const showFinanceTickets = state.age >= 18;

  return `
    <div class="tab-page">
      <!-- 怀旧家庭储蓄存折 -->
      <div class="passbook">
        <div class="passbook-top">
          <div class="passbook-brand">
            ${pxIcon('passbook', 20)}
            <div>
              <b>家庭活期存折</b>
              <small>NO.${stamp.replace('.', '-')} · ${state.origin.name}起步</small>
            </div>
          </div>
          <span class="passbook-city">${CITIES[state.cityTier].name.slice(0, 4)}</span>
        </div>
        <div class="passbook-body">
          <div class="pb-balances">
            <div class="pb-cell">
              <span>可用现金</span>
              <strong>¥${fmtMoney(state.cash)}</strong>
            </div>
            <div class="pb-cell">
              <span>家庭净资产</span>
              <strong class="net">¥${fmtMoney(nw)}</strong>
            </div>
          </div>
          <div class="pb-ledger-lines">
            ${sal > 0 ? `<div class="pb-line"><span class="lb">税后月薪（L${state.jobLevel}）</span><b>¥${sal.toLocaleString()}/月</b></div>` : ''}
            ${state.retired ? `<div class="pb-line"><span class="lb">月度退休金</span><b>¥${state.pensionMo.toLocaleString()}/月</b></div>` : ''}
            ${state.goldGrams > 0 ? `<div class="pb-line"><span class="lb">黄金持仓（${Math.round(state.goldGrams)}g）</span><b>约 ¥${fmtMoney(state.goldGrams * state.goldPrice)}</b></div>` : ''}
            ${state.debt > 0 ? `<div class="pb-line debt"><span>应付欠款（自动扣还）</span><b>-¥${fmtMoney(state.debt)}</b></div>` : ''}
            ${!sal && !state.retired && !state.debt && state.goldGrams <= 0 ? `<div class="pb-line"><span class="lb">理财年化参考</span><b>${(era.finRate * 100).toFixed(1)}% · ${era.name}</b></div>` : ''}
          </div>
          <div class="pb-trends">
            <span class="trend-pill ${era.houseTrend}">楼市：${trendWord(era.houseTrend)}</span>
            <span class="trend-pill ${era.goldTrend}">金价 ¥${state.goldPrice}/g · ${trendWord(era.goldTrend)}</span>
          </div>
        </div>
      </div>

      <!-- 安家与小家手账卡 -->
      <div class="deed-card">
        <div class="sec-head-row">
          <span class="sec-title">${pxIcon('home', 17)} 安家与小家空间</span>
          ${state.house ? `<span class="tag up">${state.house.grid}×${state.house.grid} 网格</span>` : `<span class="tag">${state.age < 19 ? '成年解锁' : '租住/住家'}</span>`}
        </div>
        <p class="deed-desc">
          ${state.house
            ? `${state.house.name} · 估值 ¥${fmtMoney(state.house.value)} · 余贷 ¥${fmtMoney(state.house.loan)}${state.house.buffActive ? ' · 旧物已上墙' : ''}`
            : state.age < 19
              ? '毕业攒够首付后可购置小家，解锁空间拼图并把童年旧物挂上墙。'
              : '当前暂未置业；买房后解锁空间拼图，可将 8 岁旧物上墙激活永久 Buff。'}
        </p>
        ${(state.age >= 19) ? `
          <div class="pill-actions">
            ${state.age >= state.gradAge ? `<button class="pill-btn primary" id="t-house">${pxIcon('home', 14)} 房产买卖</button>` : ''}
            <button class="pill-btn soft" id="t-puzzle">${pxIcon('spark', 14)} 布置小家</button>
            ${state.age >= state.gradAge ? `<button class="pill-btn" id="t-city">${pxIcon('trip', 14)} 中途换城</button>` : ''}
          </div>
        ` : ''}
      </div>

      <!-- 理财与零花票券区 -->
      ${showFinanceTickets ? `
        <div class="deed-card">
          <div class="sec-head-row">
            <span class="sec-title">${pxIcon('gold', 17)} 避险、彩票与情绪买单</span>
          </div>
          <div class="ticket-row">
            <button class="ticket-btn" id="t-gold" ${state.age >= state.gradAge ? '' : 'disabled'}>
              ${pxIcon('gold', 20)}
              <b>买卖黄金</b>
              <small>${Math.round(state.goldGrams)}g · ¥${state.goldPrice}</small>
            </button>
            <button class="ticket-btn" id="t-lottery" ${state.lotteryThisTurn ? 'disabled' : ''}>
              ${pxIcon('ticket', 20)}
              <b>买张彩票</b>
              <small>${state.lotteryThisTurn ? '本季已买' : '¥20 碰运气'}</small>
            </button>
            <button class="ticket-btn" id="t-emo" ${state.emoBuyThisTurn ? 'disabled' : ''}>
              ${pxIcon('gift', 20)}
              <b>情绪买单</b>
              <small>${state.emoBuyThisTurn ? '本季已用' : '花钱回心态'}</small>
            </button>
          </div>
        </div>
      ` : ''}

      <!-- 木格旧物收藏盒 -->
      <div class="wood-box">
        <div class="wood-head">
          <span>木格旧物盒</span>
          <small>已收藏 ${state.items.length} 件</small>
        </div>
        <div class="wood-grid">
          ${keepsakes.map(k => k.filled ? `
            <div class="wood-cell filled">
              ${pxIcon(k.ico, 26)}
              <span class="w-nm">${k.name}</span>
              <span class="w-tag">${k.tag}</span>
            </div>
          ` : `
            <div class="wood-cell">
              <span style="opacity:.35">${pxIcon('dream', 20)}</span>
              <span class="w-empty">${k.name}</span>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `;
}

function renderSocialTab(budget) {
  const statList = [
    { lb: '学识', val: state.stats.knowledge, color: '#4a7fc1' },
    { lb: '专业', val: state.stats.pro, color: '#c9683a' },
    { lb: '表达', val: state.stats.expr, color: '#d05d80' },
    { lb: '自理理财', val: state.stats.selfCare, color: '#469062' }
  ];

  const people = [
    {
      ico: 'avatarParents', name: '父母', role: '一直牵挂着你',
      val: state.relations.parents.intimacy, help: state.relations.parents.intimacy >= 60, alt: false
    },
    {
      ico: 'avatarFriend', name: '同桌小周', role: state.age <= 18 ? '课间死党' : '半生挚友',
      val: state.relations.friend.intimacy, help: state.relations.friend.intimacy >= 60, alt: true
    }
  ];
  if (state.relations.partner) {
    people.push({
      ico: 'avatarPartner',
      name: state.relations.partner.name,
      role: state.relations.partner.married ? '已婚合账' : '热恋中',
      val: state.relations.partner.intimacy,
      help: state.relations.partner.intimacy >= 60,
      alt: true
    });
  }
  if (state.child) {
    people.push({
      ico: 'avatarKid',
      name: `孩子 (${state.age - state.child.bornAge}岁)`,
      role: '亲子档案',
      val: state.child.bond,
      kid: state.child,
      alt: false
    });
  }

  const rallyStops = [20, 40, 60, 80, 100];
  const dreamPct = Math.min(100, state.dreamSkill);

  return `
    <div class="tab-page">
      <!-- 四维能力成长手账 -->
      <div class="stat-ledger">
        <div class="sec-head-row">
          <span class="sec-title">${pxIcon('study', 17)} 四维成长档案</span>
          <span class="tag">${state.age >= state.gradAge && !state.retired ? `职级 L${state.jobLevel} · 项目 ${state.projectCount}` : `阶段：${getSubStage(state.age).name}`}</span>
        </div>
        <div class="stat-bars">
          ${statList.map(st => `
            <div class="stat-row">
              <span class="s-lb">${st.lb}</span>
              <div class="stat-track">
                <i style="width:${Math.min(100, st.val)}%;background:${st.color};"></i>
                <span class="tick" style="left:30%"></span>
                <span class="tick" style="left:60%"></span>
                <span class="tick" style="left:85%"></span>
              </div>
              <span class="s-val">${st.val}</span>
            </div>
          `).join('')}
        </div>
        ${state.age >= state.gradAge && !state.retired && state.jobLevel < 5 ? `
          <div style="margin-top:10px;display:flex;justify-content:center;">
            <button class="pill-btn primary" id="t-promo">${pxIcon('sprint', 14)} 申请晋升 L${state.jobLevel + 1}（需专业≥${PROMO_REQ[state.jobLevel + 1]}）</button>
          </div>
        ` : ''}
      </div>

      <!-- 千禧同学录 · 亲友头像卡 -->
      <div class="yearbook-sec">
        <div class="sec-head-row">
          <span class="sec-title">${pxIcon('heart', 17)} 亲友同学录</span>
          <span class="tag">亲密 ≥60 可求助</span>
        </div>
        <div class="yearbook-grid">
          ${people.map(p => `
            <div class="yb-card ${p.alt ? 'alt' : ''}">
              <div class="yb-top">
                <div class="yb-avatar">${pxIcon(p.ico, 22)}</div>
                <div class="yb-meta">
                  <div class="yb-name">${p.name}</div>
                  <div class="yb-role">${p.role}</div>
                </div>
              </div>
              <div class="yb-bar-row">
                <div class="yb-bar"><i style="width:${Math.min(100, p.val)}%;"></i></div>
                <span class="yb-score">${p.val}</span>
              </div>
              ${p.kid ? `
                <div class="yb-kid-stats">
                  <span class="yb-kid-chip">学业 ${p.kid.study}</span>
                  <span class="yb-kid-chip">心态 ${p.kid.mood}</span>
                </div>
              ` : p.help ? `<span class="yb-help-tag">★ 可互相帮衬</span>` : ''}
            </div>
          `).join('')}
        </div>
        <div class="pill-actions">
          ${state.age >= 19 && !state.relations.partner ? `<button class="pill-btn primary" id="t-love">${pxIcon('heart', 14)} 结识伴侣</button>` : ''}
          ${state.relations.partner && !state.relations.partner.married ? `<button class="pill-btn primary" id="t-marry">${pxIcon('heart', 14)} 谈婚论嫁</button>` : ''}
          ${state.relations.partner?.married && !state.child && !state.choseDink ? `<button class="pill-btn soft" id="t-kid">${pxIcon('baby', 14)} 生娃 / 丁克抉择</button>` : ''}
          ${budget.babyLock && state.relations.parents.intimacy >= 60 ? `<button class="pill-btn soft" id="t-help">${pxIcon('parents', 14)} 请父母代班(释1格)</button>` : ''}
        </div>
      </div>

      <!-- 梦想打卡条 -->
      <div class="dream-rally">
        <div class="sec-head-row">
          <span class="sec-title">${pxIcon('dream', 17)} 梦想打卡条</span>
          <span class="tag ${state.dreamCompleted ? 'up' : ''}">专长 ${state.dreamSkill}${state.dreamCompleted ? ' · 已圆梦' : '/100'}</span>
        </div>
        <div class="rally-track">
          <div class="rally-line"><i style="width:${dreamPct}%"></i></div>
          ${rallyStops.map(pt => `
            <div class="rally-stop ${state.dreamSkill >= pt ? 'lit' : ''}">
              <div class="rally-dot">${state.dreamSkill >= pt ? '★' : pt}</div>
              <small>${pt === 100 ? '圆梦' : pt + '分'}</small>
            </div>
          `).join('')}
        </div>
        <div class="dream-tags">
          ${state.activeDreams.length
            ? state.activeDreams.map(d => `<span class="tag up">${d.name}</span>`).join('')
            : `<span style="font-size:11.5px;color:var(--muted);">暂未锁定方向（18 岁后最多聚焦 1–2 条主攻）</span>`}
        </div>
        <button class="pill-btn soft" id="t-dream">${pxIcon('dream', 14)} 查看 / 选定五梦想线</button>
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
  bind('#btn-open-drawer', () => { drawerOpen = true; moreMenuOpen = false; render(); });
  bind('#drawer-mask', () => { drawerOpen = false; moreMenuOpen = false; render(); });
  bind('#v5-close', () => { drawerOpen = false; moreMenuOpen = false; render(); });
  bind('#toast-close', () => { toastMsg = ''; render(); });
  bind('#hud-era', openEraNewspaper);
  bind('#btn-news', openEraNewspaper);
  bind('#hud-cash', () => {
    if (state.totalTurns >= 1 || state.age > 6) {
      activeTab = 'assets'; drawerOpen = false; moreMenuOpen = false; render();
    }
  });
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

  // V5 方案 A：爽快型单点贴纸直接入槽 + 上方实时预览
  appEl.querySelectorAll('[data-sticker]').forEach(b => {
    b.onclick = () => {
      const id = b.dataset.sticker;
      const act = actions.find(x => x.id === id);
      moreMenuOpen = false;
      inspectedId = id;
      if (!act) return render();
      if (act.disabled) {
        showToast(`「${act.name}」本年次数已用完`);
        return;
      }
      if (draft.length < budget.available) {
        draft.push(id);
      }
      render();
    };
  });
  appEl.querySelectorAll('[data-rm]').forEach(s => {
    s.onclick = () => {
      const idx = Number(s.dataset.rm);
      const removed = draft[idx];
      draft.splice(idx, 1);
      moreMenuOpen = false;
      if (removed) inspectedId = removed;
      render();
    };
  });
  bind('#insp-replace', () => {
    if (inspectedId && draft.length >= budget.available) {
      draft[draft.length - 1] = inspectedId;
      moreMenuOpen = false;
      render();
    }
  });

  const doSmartFill = () => {
    draft = buildSmartDraft(state, actions, budget);
    inspectedId = draft[draft.length - 1] || null;
    moreMenuOpen = false;
    showToast('已按当前目标帮你排满，点上方 ✕ 可随时替换');
  };
  const doReuse = () => {
    const valid = new Set(actions.filter(a => !a.disabled).map(a => a.id));
    draft = state.lastDraft.filter(id => valid.has(id)).slice(0, budget.available);
    inspectedId = draft[draft.length - 1] || null;
    moreMenuOpen = false;
    render();
  };

  bind('#v5-smart', doSmartFill);
  bind('#v5-smart-menu', doSmartFill);
  bind('#v5-reuse', doReuse);
  bind('#v5-reuse-menu', doReuse);
  bind('#v5-more-toggle', (e) => { e.stopPropagation(); moreMenuOpen = !moreMenuOpen; render(); });
  bind('#v5-clear', () => { draft = []; moreMenuOpen = false; render(); });
  bind('#v5-tpl', () => {
    moreMenuOpen = false;
    if (state.templates.balance.length) {
      const valid = new Set(actions.filter(a => !a.disabled).map(a => a.id));
      draft = state.templates.balance.filter(id => valid.has(id)).slice(0, budget.available);
      inspectedId = draft[draft.length - 1] || null;
      showToast('已载入自定义模板');
    } else if (draft.length) {
      state.templates.balance = [...draft];
      showToast('已保存当前方案为自定义模板');
    } else {
      showToast('请先排入至少 1 项再存模板');
    }
  });

  // 执行本回合（丝滑收起抽屉 -> 主角微跳 -> 2秒飘字浮条）
  bind('#v5-exec', () => {
    const res = executeTurn(state, draft);
    draft = [];
    inspectedId = null;
    moreMenuOpen = false;
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
      triggerFloatPops(res.summary);
      render();
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
        state = saved; draft = []; inspectedId = null; moreMenuOpen = false; activeTab = 'home';
        showToast(`已从人生树回到 ${a} 岁分叉点！`);
      }
    };
  });
}

// ===== 千禧年出生扉页（序幕开局页：性别分流 + 出身抽签券 + 天赋三选一）=====
function renderIntro() {
  const previewSp = sprites[pickedGender]?.[0] || '';
  appEl.innerHTML = `
    <div class="phone-stage-outer">
      <div class="phone-frame">
        <div class="wx-topbar-safe"><div class="wx-capsule"><span>•••</span><span>|</span><span>◉</span></div></div>
        <div class="tab-page intro-page">
          <!-- 千禧手账封面卡 -->
          <div class="intro-cover">
            <div class="intro-tape l"></div>
            <div class="intro-tape r"></div>
            <span class="intro-stamp">千禧记忆档案 · NO.1998</span>
            <h2>《这辈子 2.0》</h2>
            <div class="intro-sub">每一岁，都是人生相册里的一张胶片</div>
            <div class="intro-portrait">
              ${previewSp ? `<img src="${previewSp}" alt="主角预览" />` : ''}
            </div>
            <div class="gender-seg">
              <button class="gender-opt ${pickedGender==='male'?'active':''}" id="g-m">${pxIcon('yoyo', 14)} 男主角 · 悠悠球</button>
              <button class="gender-opt ${pickedGender==='female'?'active':''}" id="g-f">${pxIcon('doll', 14)} 女主角 · 芭比娃娃</button>
            </div>
          </div>

          <!-- 出身抽签券 -->
          <div class="origin-ticket">
            <div class="origin-hd">
              <div class="origin-title">
                ${pxIcon('passbook', 16)}
                <span>出生家境</span>
                <span class="origin-badge">${pickedOrigin.name}</span>
              </div>
              ${!unlockedSelfPick
                ? `<button class="pill-btn soft" id="btn-reroll" style="height:26px;padding:0 9px;font-size:11px;" ${rerollUsed?'disabled':''}>${rerollUsed?'已重抽':'免费重抽'}</button>`
                : `<span class="tag up">已解锁自选</span>`}
            </div>
            ${unlockedSelfPick ? `
              <div style="display:flex;gap:5px;flex-wrap:wrap;margin-bottom:8px;">
                ${ORIGINS.map(o => `<button class="pill-btn ${pickedOrigin.id===o.id?'primary':''}" style="height:26px;padding:0 9px;font-size:11px;" data-po="${o.id}">${o.name}</button>`).join('')}
              </div>
            ` : ''}
            <div class="origin-stats">
              <div class="origin-kv"><span>家庭家底</span><b>约 ¥${fmtMoney(pickedOrigin.familyAsset)}</b></div>
              <div class="origin-kv"><span>首付支援</span><b>¥${fmtMoney(pickedOrigin.downpaySupport)}</b></div>
            </div>
            <div class="origin-traits">
              <div class="ot-line"><span class="ot-dot pos">＋</span><span>${pickedOrigin.buff}</span></div>
              <div class="ot-line"><span class="ot-dot neg">!</span><span>${pickedOrigin.debuff}</span></div>
            </div>
          </div>

          <!-- 天赋三选一 -->
          <div class="origin-ticket">
            <div class="sec-head-row" style="margin-bottom:7px;">
              <span class="sec-title">${pxIcon('spark', 15)} 挑选初始天赋</span>
              <span style="font-size:11px;color:var(--muted);">三选一</span>
            </div>
            <div class="talent-list">
              ${pickedOrigin.talents.map(t => `
                <button class="talent-opt ${pickedTalent===t.id?'active':''}" data-t="${t.id}">
                  <span class="talent-radio"></span>
                  <div>
                    <b>${t.name}</b>
                    <small>${t.desc}</small>
                  </div>
                </button>
              `).join('')}
            </div>
          </div>

          <div class="intro-cta-wrap">
            <button class="cta-main" id="btn-start">6 岁正式起步 →</button>
          </div>
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
    activeTab = 'home'; drawerOpen = false; draft = []; inspectedId = null; moreMenuOpen = false;
    render();
    showToast('6 岁开学啦！点下方「安排新学期」开始你的第一季');
  };
}

// ===== 专属「人审剧情手账阅读器」（舒展行距 + 高属性/高羁绊金框选项）=====
function showApprovedEventV3(ev, next) {
  const cleanTitle = ev.title.replace(/\[.*?\]\s*/, '');
  const chapterLabel = ev.priority === 'P0' ? '人生重要节点'
    : ev.priority === 'P1' ? '珍藏记忆定格'
    : '生活烟火切片';

  const splitChoiceLabel = raw => {
    const m = raw.match(/^(.*?)[（(]([^）)]+)[）)]$/);
    return m ? { main: m[1].trim(), sub: m[2].trim() } : { main: raw, sub: '' };
  };

  showV3Capture({
    storyMode: true,
    badge: chapterLabel,
    title: cleanTitle,
    photoCaption: cleanTitle,
    bodyHtml: `
      <div class="story-paper">${ev.summary}</div>
      <div class="story-choices">
        ${ev.choices.map((c, idx) => {
          const isSpecial = Boolean(c.reqAny || c.reqRelation);
          let ok = true;
          if (c.reqAny) ok = Object.entries(c.reqAny).some(([k, v]) => state.stats[k] >= v);
          if (c.reqRelation) ok = (state.relations.partner?.intimacy >= c.reqRelation) || (state.child?.bond >= c.reqRelation);
          const { main, sub } = splitChoiceLabel(c.label);
          const cls = isSpecial ? (ok ? 'gold-choice' : 'locked-choice') : '';
          const badgeHtml = isSpecial
            ? (ok
              ? `<span class="gold-badge">★ ${c.reqRelation ? '羁绊解锁' : '高属性解锁'}</span>`
              : `<span class="lock-badge">${pxIcon('lock', 11)} 未达条件</span>`)
            : '';
          return `
            <button class="story-choice ${cls}" data-ci="${idx}" ${ok ? '' : 'disabled'}>
              <div class="sc-top">
                <span class="sc-main">${main}</span>
                ${badgeHtml}
              </div>
              ${sub ? `<div class="sc-sub">${sub}</div>` : ''}
            </button>
          `;
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

// 独立「📰 时代简报」手账剪报弹窗（彻底移出拍立得白边）
function openEraNewspaper() {
  const era = getCurrentEra(state);
  const stamp = getDateStamp(state.age, state.subTurn);
  const houseWord = era.houseTrend === 'hot' ? '强势上涨（早买房吃满增值）' : era.houseTrend === 'up' ? '温和回暖' : era.houseTrend === 'down' ? '回调横盘（慎追高）' : '整体平稳';
  const goldWord = era.goldTrend === 'hot' ? '避险大涨（囤金黄金窗口）' : era.goldTrend === 'up' ? '稳步走高' : '区间震荡';
  mountOverlay(`<div class="sheet-modal"><div class="sheet-box">
    <div class="newspaper-box">
      <div class="newspaper-head">
        <b style="font-size:16px;">📰 时代简报 · ${era.name}</b>
        <span style="font-family:monospace;font-size:12px;color:var(--muted);">${stamp}</span>
      </div>
      <p style="font-size:13px;margin:0 0 10px;line-height:1.6;">${getNextYearHint(state)}</p>
      <div class="grid-2">
        <div class="kv"><span>楼市行情</span><b>${houseWord.slice(0,4)}</b></div>
        <div class="kv"><span>黄金走势</span><b>${goldWord.slice(0,4)}</b></div>
      </div>
      <div style="font-size:12px;color:var(--muted);margin-top:8px;line-height:1.5;">
        · 楼市：${houseWord}<br/>
        · 黄金（当前 ${state.goldPrice} 元/克）：${goldWord}<br/>
        · 理财年化参考：${(era.finRate * 100).toFixed(1)}%
      </div>
    </div>
    <button class="btn primary" id="n-ok" style="width:100%;">收起简报</button>
  </div></div>`, host => { host.querySelector('#n-ok').onclick = clearOverlay; });
}

// ===== 终章「可分享复古人生纪念册海报」=====
function renderMemorial() {
  localStorage.setItem('zhebeizi_cleared', '1');
  unlockedSelfPick = true;
  const ev = evaluateEnding(state);
  const stageIdx = getSubStageIndex(state.age);
  const bgKey = getBgKey(state.age);
  const spUrl = sprites[state.gender]?.[stageIdx] || '';
  const birthYear = 1992;
  const endYear = birthYear + state.age;
  const grades = [
    { lb: '安身立命', g: ev.scores.career.g, val: ev.scores.career.val },
    { lb: '爱与羁绊', g: ev.scores.love.g, val: ev.scores.love.val },
    { lb: '赤子之心', g: ev.scores.dream.g, val: ev.scores.dream.val },
    { lb: '善始善终', g: ev.scores.health.g, val: ev.scores.health.val }
  ];

  appEl.innerHTML = `
    <div class="phone-stage-outer">
      <div class="phone-frame">
        <div class="wx-topbar-safe"><div class="wx-capsule"><span>•••</span><span>|</span><span>◉</span></div></div>
        <div class="tab-page" style="padding:52px 14px 20px;">
          <!-- 复古 35mm 可分享人生纪念册海报 -->
          <div class="poster-card" id="memorial-poster">
            <div class="poster-film">${'<i></i>'.repeat(14)}</div>
            <div class="poster-inner">
              <div class="poster-top-meta">
                <span>《这辈子 2.0》人生纪念册</span>
                <span>${birthYear} — ${endYear} · ${state.age}岁</span>
              </div>

              <div class="poster-hero">
                <div class="poster-photo">
                  <div class="poster-photo-in">
                    <img class="bg" src="./assets/bg/${bgKey}.jpg" />
                    ${spUrl ? `<img class="sp" src="${spUrl}" />` : ''}
                  </div>
                </div>
                <div class="poster-title-col">
                  <span class="poster-seal">终章定格</span>
                  <h2>${ev.title}</h2>
                  <div class="poster-reason">${state.endReason}</div>
                </div>
              </div>

              <div class="poster-arc">
                <span>出身 ${state.origin.name} · ${state.gender === 'female' ? '女主线' : '男主线'}</span>
                <b style="color:var(--green);">净资产 ¥${fmtMoney(ev.netWorth)}</b>
              </div>

              <div class="poster-grades">
                ${grades.map(x => `
                  <div class="pg-cell">
                    <span>${x.lb}</span>
                    <div class="pg-grade ${x.g}">${x.g}</div>
                    <small>${x.val}分</small>
                  </div>
                `).join('')}
              </div>

              <div class="poster-chains">
                ${ev.darkChains.map(c => `
                  <div class="chain-badge ${c.ok ? 'lit' : ''}">
                    <span>${c.ok ? '★' : '○'}</span>
                    <span>${c.name}</span>
                  </div>
                `).join('')}
              </div>

              <div class="poster-foot-note">
                <span>相册留影 ${state.albumPhotos.length} 张 · 旧物 ${state.items.length} 件</span>
                <span>长按截屏即可分享给好友</span>
              </div>
            </div>
            <div class="poster-film">${'<i></i>'.repeat(14)}</div>
          </div>

          <!-- 分享 & 人生树回溯 & 开启新一生 -->
          <div class="deed-card">
            <div class="sec-head-row">
              <span class="sec-title">${pxIcon('film', 16)} 珍藏与人生树回溯</span>
              <button class="pill-btn soft" id="btn-share-poster" style="height:28px;font-size:11px;">${pxIcon('share', 13)} 复制战绩文案</button>
            </div>
            <div class="pill-actions" style="margin-bottom:12px;">
              ${[18, 30, 50].map(a => `<button class="pill-btn" data-rb="${a}" ${state.branches[a] ? '' : 'disabled'}>回到 ${a} 岁</button>`).join('')}
            </div>
            <div class="poster-actions">
              <button class="cta-main" id="btn-restart" style="max-width:250px;width:78%;">开启新的一生（自选出身）</button>
            </div>
          </div>
        </div>
        ${toastMsg ? `<div class="toast-ribbon" id="toast-close">${toastMsg}</div>` : ''}
      </div>
    </div>
  `;

  const tc = appEl.querySelector('#toast-close');
  if (tc) tc.onclick = () => { toastMsg = ''; renderMemorial(); };

  appEl.querySelector('#btn-share-poster').onclick = () => {
    const text = `我在《这辈子 2.0》活到 ${state.age} 岁，达成结局「${ev.title}」（出身${state.origin.name} → 净资产 ¥${fmtMoney(ev.netWorth)}），四维评级：${grades.map(x => `${x.lb}${x.g}`).join(' / ')}`;
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).catch(() => {});
    }
    showToast('复古战绩文案已复制，可直接截图上方海报分享！');
  };

  appEl.querySelectorAll('[data-rb]').forEach(b => {
    b.onclick = () => {
      const a = Number(b.dataset.rb);
      const saved = JSON.parse(state.branches[a]);
      saved.branches = state.branches; saved.ended = false;
      state = saved; draft = []; inspectedId = null; moreMenuOpen = false; activeTab = 'home'; render();
    };
  });
  appEl.querySelector('#btn-restart').onclick = () => {
    state = null; rerollUsed = false; pickedOrigin = rollOrigin(); pickedTalent = pickedOrigin.talents[0].id; renderIntro();
  };
}

initSpritesAndRender();
