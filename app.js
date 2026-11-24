// 《这辈子 2.0》U6 + Sprint 1：微信小程序 9:16 竖屏高保真可交互原型
// 核心架构：V4 整屏拍立得 ⇄ V5 撕纸贴纸盘(Combo+季节限定) ⇄ 1.8s过场剧场 ⇄ 命运海克斯 2.0 ⇄ V3 定格
import {
  ORIGINS, CITIES, TRACKS, UNIVERSITIES, DREAMS, SPOUSE_BACKGROUNDS, PROMO_REQ
} from './data.js?v=s31';
import {
  clamp, monthlyPmt, getSubStage, getSubStageIndex, getDateStamp, getMacroParams,
  createInitialState, ensureSprint1State, getEffectiveFatigueLimit, getPendingHextechAge,
  getCurrentEra, getNextYearHint, getCurrentMonthlySalary,
  getTurnSlotBudget, getAvailableActions, previewDraft, executeTurn, getNetWorth, evaluateEnding
} from './engine.js?v=s31';
import {
  HEX_NODES, HEX_NODE_META, HEX_BONDS, HEX_CARD_MAP, hasHex, getHexInstance,
  getHexBondCounts, getBondTier, getNewBondTriggersForCard,
  rollHextechOffer, pickSingleHextechCard, applyHextechPick
} from './hextech.js?v=s31';
import {
  SCHEDULE_COMBOS, detectCombos, getComboPartnerIds, getActionAnimSpec
} from './combos.js?v=s31';
import {
  applyEventChoiceEffects
} from './events.js?v=s31';
import {
  getPetLifeStage, interactWithPet, getOrRollStageHotspot, claimStageHotspot,
  TUCK_CARDS_12, TUCK_GOODS, drawSnackCard, buyTuckGood, buyTuckGift,
  getOrRollHouseListings
} from './lifeFeatures.js?v=s31';
import {
  applyGracefulPivot, DREAM_CATALOG, rollDreamLifecycleEvent,
  settleDreamQualifier, settleDreamClimax, addKeepsakeWithStory
} from './dreams.js?v=s31';
import {
  triggerHaptic, playComboCollisionVfx, openHextechV4Modal,
  renderNewAssetsTab, bindNewAssetsInteractions, renderDreamJournalSection
} from './vfxAndUi.js?v=s31';
import { openFlipCardGame, openHomePuzzleGame, openGomokuGame } from './minigames.js?v=s31';
import {
  rollStageArcadeMoment, openRingTossGame, openNostalgiaLinkGame, openBellDashGame,
  openWorkSliceGame, openRedPacketRainGame, openLakeFishingGame
} from './arcadeGames.js?v=s31';
import { loadCharacterSprites, getBubbleUrl } from './spriteLoader.js?v=s31';
import { pxIcon, chevDownIcon } from './icons.js?v=s31';

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
let floatPopTimer = null;
let heroHop = false;
let albumBounce = false;
// Sprint 1 & 2：人物点击动作反馈、1.8s 连播小剧场 & 舞台萌宠状态
let heroStageAnim = null;
let heroAnimTimer = null;
let theaterState = null; // { beats, idx, combos, timer, finish }
let comboBurstText = '';
let petHopSound = '';
let petHopTimer = null;

// 序幕选型状态（0=纯封面, 1=选主角, 2=抽出身, 3=选天赋）
let introStep = 0;
let pickedGender = 'male';
let rerollUsed = false;
let pickedOrigin = rollOrigin();
let pickedTalent = pickedOrigin.talents[0].id;
let unlockedSelfPick = localStorage.getItem('zhebeizi_cleared') === '1';

const AUTO_SAVE_KEY = 'zhebeizi_autosave_v2';
function saveAutoProgress() {
  if (!state || state.ended) return;
  try {
    localStorage.setItem(AUTO_SAVE_KEY, JSON.stringify({
      savedAt: Date.now(),
      state
    }));
  } catch (e) { /* 忽略隐私模式配额报错 */ }
}
function loadAutoSave() {
  try {
    const raw = localStorage.getItem(AUTO_SAVE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const s = parsed?.state;
    if (!s || s.ended || typeof s.age !== 'number' || !s.stats) return null;
    return ensureSprint1State(s);
  } catch (e) {
    return null;
  }
}
function clearAutoSave() {
  try { localStorage.removeItem(AUTO_SAVE_KEY); } catch (e) {}
}

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
  if (s.stats.fatigue >= getEffectiveFatigueLimit(s)) return 'sweat';
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
  return s.stats.fatigue >= getEffectiveFatigueLimit(s) ? '有点透支了，注意喘口气'
    : s.stats.mood >= 75 ? '阳光正好，心里踏实'
    : s.age <= 12 ? '放学后的风很温柔'
    : s.age <= 18 ? '黑板上的倒计时又少了一天'
    : s.age <= 35 ? '在城市里慢慢扎下根'
    : s.age <= 50 ? '扛起生活，也别忘了自己'
    : '慢下来，好好享受眼前的日子';
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
  if (a.seasonal) {
    return { wellBg: '#fff2cc', slotBg: '#fce7ad', slotFg: '#8f580a', ico: a.ico || 'spark', short: a.short || a.name.slice(0, 4) };
  }
  if (a.isDreamAction) {
    return { wellBg: a.wellBg || ds.wellBg, slotBg: '#ebe2f8', slotFg: '#6f50a8', ico: a.ico || 'dream', short: a.short || a.name.slice(0, 4) };
  }
  const map = {
    study_self:        { ico: 'study',    short: '课业自习' },
    study_tutor:       { ico: 'tutor',    short: '付费补习' },
    gaokao_sprint:     { ico: 'sprint',   short: '考前冲刺' },
    uni_study:         { ico: 'study',    short: '泡馆修学' },
    uni_intern:        { ico: 'work',     short: '实习项目' },
    uni_parttime:      { ico: 'tutor',    short: '家教兼职' },
    pro_self:          { ico: 'study',    short: '专业自学' },
    pro_course:        { ico: 'bulb',     short: '导师项目' },
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
    train_dream:       { ico: 'dream',    short: '追梦专练' },
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
  if (s.stats.fatigue >= getEffectiveFatigueLimit(s) - 2 || s.stats.mood < 40) {
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

  if (s.stats.fatigue >= getEffectiveFatigueLimit(s) - 2 || s.stats.mood < 42) tryPush('rest');
  if (s.stats.health < 50) tryPush('exercise');

  const activeDreamAct = actions.find(a => a.isDreamAction && !a.disabled)?.id || null;
  const stagePriority = s.age <= 12
    ? ['chores', 'study_self', 'accompany_friend', activeDreamAct, 'accompany_parents', 'exercise'].filter(Boolean)
    : s.age <= 18
      ? ['gaokao_sprint', 'study_self', activeDreamAct, 'accompany_friend', 'rest', 'chores'].filter(Boolean)
      : s.age < s.gradAge
        ? ['uni_intern', 'uni_study', activeDreamAct, 'uni_parttime', 'accompany_friend', 'rest'].filter(Boolean)
        : s.age <= 50
          ? ['pro_course', 'pro_self', activeDreamAct, 'date_partner', 'play_kid', 'overtime', 'exercise', 'accompany_parents', 'rest'].filter(Boolean)
          : ['square_dance', 'exercise', 'elder_uni', 'accompany_friend', 'rest'];

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

function clearHeroStageAnimDom() {
  heroStageAnim = null;
  if (heroAnimTimer) { clearTimeout(heroAnimTimer); heroAnimTimer = null; }
  const anchor = document.getElementById('hero-tap');
  if (anchor) {
    anchor.className = 'hero-anchor';
    anchor.querySelectorAll('.hero-speech, .hero-prop, .hero-prop-sub').forEach(el => el.remove());
  }
  const light = document.getElementById('stage-light');
  if (light) light.className = 'stage-light';
}

function triggerHeroActionPreview(actionId, duration = 1350) {
  if (!state) return;
  if (heroAnimTimer) { clearTimeout(heroAnimTimer); heroAnimTimer = null; }
  heroStageAnim = getActionAnimSpec(actionId, state);
  if (duration > 0) {
    heroAnimTimer = setTimeout(() => {
      if (!theaterState) clearHeroStageAnimDom();
    }, duration);
  }
}

function stopTheater(invokeDone = false) {
  if (!theaterState) return;
  const st = theaterState;
  if (st.timer) clearTimeout(st.timer);
  theaterState = null;
  comboBurstText = '';
  clearHeroStageAnimDom();
  if (invokeDone && st.onFinish) st.onFinish();
}

function playTurnTheater(res, onFinish) {
  stopTheater(false);
  const beats = res.stepBeats || [];
  if (!beats.length) return onFinish();
  const combos = res.combosTriggered || [];

  theaterState = { beats, idx: 0, combos, timer: null, onFinish };

  const runBeat = (i) => {
    if (!theaterState) return;
    if (i >= beats.length) {
      if (combos.length > 0 && !theaterState.comboShown) {
        theaterState.comboShown = true;
        const names = combos.map(c => c.name).join(' · ');
        comboBurstText = names;
        heroStageAnim = { anim: 'anim-celebrate', prop: 'combo', subProp: 'spark', light: 'light-sun', bubble: '好搭配！' };
        floatPops = [{ text: names, k: 'gold' }];
        render();
        const firstNew = res.newlyDiscoveredCombos?.[0];
        playComboCollisionVfx(firstNew || combos[0], Boolean(firstNew), getAvailableActions(state), getActionMeta, state);
        theaterState.timer = setTimeout(() => {
          stopTheater(false);
          floatPops = [];
          render();
          onFinish();
        }, firstNew ? 920 : 620);
        return;
      }
      stopTheater(false);
      floatPops = [];
      render();
      onFinish();
      return;
    }

    theaterState.idx = i;
    const b = beats[i];
    heroStageAnim = getActionAnimSpec(b.id, state);
    floatPops = [{ text: b.text, k: b.kind || 'pos' }];
    render();
    theaterState.timer = setTimeout(() => runBeat(i + 1), 430);
  };

  runBeat(0);
}

function triggerFloatPops(summaryList) {
  if (floatPopTimer) clearTimeout(floatPopTimer);
  const pops = [];
  for (const line of summaryList.slice(0, 4)) {
    const k = /现金 \+|零花钱 \+|环游|梦想|连携|重随/.test(line) ? 'gold'
      : /透支|孤独|健康 -|心态 -/.test(line) ? 'neg' : 'pos';
    // 截短为极清爽的飘字短语
    const short = line.replace(/^.*?：/, '').split('，')[0].slice(0, 14);
    pops.push({ text: short, k });
  }
  if (!pops.length) pops.push({ text: '安稳度过这一季', k });
  floatPops = pops;
  floatPopTimer = setTimeout(() => {
    floatPops = [];
    floatPopTimer = null;
    // 仅清理飘字层 DOM，绝不触发整页 render() 误清已打开的关键时刻弹窗
    document.querySelectorAll('.float-layer').forEach(el => el.remove());
  }, 1650);
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
  if (floatPopTimer) { clearTimeout(floatPopTimer); floatPopTimer = null; floatPops = []; }
  if (heroAnimTimer) { clearTimeout(heroAnimTimer); heroAnimTimer = null; }
  document.querySelectorAll('.toast-ribbon, .float-layer').forEach(el => el.remove());
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
  saveAutoProgress();
}

// V3 关键时刻取景器定格弹窗（带四角合拢 + 暖白快门轻闪 + 35mm 齿孔 + 存入相册）
function showV3Capture({ title, badge, bodyHtml, photoCaption, onDone, storyMode = false, compactViewfinder = false }) {
  const bgKey = getBgKey(state.age);
  const stageIdx = getSubStageIndex(state.age);
  const stamp = getDateStamp(state.age, state.subTurn);
  const spUrl = sprites[state.gender]?.[stageIdx] || '';

  if (photoCaption) {
    state.albumPhotos.push({ age: state.age, stamp, title: photoCaption, stageIdx, bg: bgKey });
  }

  const isCompact = storyMode || compactViewfinder;
  const headHtml = storyMode
    ? `<div class="story-head-meta">
         <span class="story-chapter">${pxIcon('film', 13)} ${badge || '记忆定格'}</span>
         <span class="story-stamp-mini">${stamp} · ${state.age}岁</span>
       </div>
       <h3 class="story-title">${title}</h3>`
    : `<div class="story-head-meta">
         <span class="story-chapter">${pxIcon('film', 13)} ${badge || '关键时刻定格'}</span>
         <span class="story-stamp-mini">${stamp} · ${state.age}岁</span>
       </div>
       <h3 class="story-title">${title}</h3>`;

  mountOverlay(`
    <div class="v3-overlay">
      <div class="v3-viewfinder ${isCompact ? 'compact' : ''}">
        <img class="scene-bg" src="./assets/bg/${bgKey}.jpg" />
        <div class="film-overlay"></div>
        <div class="shutter-flash"></div>
        <div class="v3-brackets"><span class="tl"></span><span class="tr"></span><span class="bl"></span><span class="br"></span></div>
        <div class="hero-anchor" style="bottom:${isCompact ? '5%' : '8%'};">
          ${spUrl ? `<img class="hero-sprite" style="height:${isCompact ? '106px' : '142px'};" src="${spUrl}" />` : ''}
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
        setTimeout(() => {
          albumBounce = false;
          document.querySelector('.nav-tab.bounce')?.classList.remove('bounce');
        }, 460);
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
  try {
    const params = new URLSearchParams(window.location.search);
    const preset = params.get('preset');
    if (preset === 'fresh') {
      clearAutoSave();
      state = null;
      introStep = 0;
    } else if (preset === 'adult32') {
      const s = createInitialState('welloff', 't_book', 'male');
      s.age = 32; s.subTurn = 2; s.totalTurns = 48; s.gradAge = 22; s.gaokaoDone = true;
      s.university = UNIVERSITIES[1]; s.track = TRACKS[1]; s.jobLevel = 3; s.cityTier = 1;
      s.cash = 268000; s.goldGrams = 40; s.goldPrice = 865; s.goldAvgCost = 755;
      s.goldHistory = [730, 755, 780, 815, 840, 865];
      s.houseIdxHistory = [98, 103, 108, 114, 121, 128];
      s.house = { id: 'h1_mid', tier: '中产', name: '阳光改善三居', grid: 6, value: 2200000, basePrice: 2000000, loan: 1120000, pmtMo: 6150, buffActive: true };
      s.hasCar = true; s.emoBuyThisTurn = true;
      s.pet = { id: 'cat', name: '橘座', species: '小橘猫', ico: 'petCat', alive: true, ageYears: 4, bond: 82 };
      s.items = ['8岁悠悠球', '《慢一点回家》小样磁带', '橘座的小铃铛'];
      s.dreams.d_singer.stage = 3; s.dreams.d_singer.xp = 68; s.dreams.d_singer.trains = 14; s.dreams.d_singer.songsCount = 3;
      s.dreamSkill = 68;
      s.hexCards = [{ id: 'hx_singer_royalty', acquiredAge: 22, stacks: 3 }, { id: 'hx_duo_passion', acquiredAge: 30, stacks: 0 }];
      s.hexTriggeredAges = [6, 12, 18, 22, 30];
      state = s;
      activeTab = 'assets';
    } else if (preset === 'arcade') {
      const s = createInitialState('welloff', 't_book', 'male');
      s.age = 7; s.subTurn = 2; s.totalTurns = 4;
      s.hexCards = [{ id: 'hx_arcade_pro', acquiredAge: 6, stacks: 0 }];
      s.hexTriggeredAges = [6];
      state = s;
      activeTab = 'home';
    } else if (preset === 'qual') {
      const s = createInitialState('welloff', 't_art', 'female');
      s.age = 21; s.subTurn = 2; s.totalTurns = 36; s.gradAge = 22; s.gaokaoDone = true;
      s.university = UNIVERSITIES[1];
      s.dreams.d_singer.stage = 3; s.dreams.d_singer.xp = 46; s.dreams.d_singer.trains = 8; s.dreams.d_singer.songsCount = 2;
      s.hexTriggeredAges = [6, 12, 18];
      state = s;
      activeTab = 'home';
    }
  } catch (_) {}
  render();
  if (window.location.search.includes('preset=arcade')) {
    const m = rollStageArcadeMoment(state, []);
    if (m) setTimeout(() => showStageArcadePopup(m), 120);
  } else if (window.location.search.includes('preset=qual')) {
    const ev = rollDreamLifecycleEvent(state, ['dr_singer']);
    if (ev) setTimeout(() => showApprovedEventV3(ev, () => render(), { isMidTurn: true }), 120);
  }
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

  const mp = getMacroParams(state.age);
  ensureSprint1State(state);

  // 场景左下角仅浮现「当前年龄阶段唯一应景入口」（绝不弹全量游艺菜单，随岁月自然更替）
  let cornerSticker = null;
  if (!state.arcadePlayedThisTurn && tCount >= 1) {
    if (state.subTurn === mp.subTurns && [16, 26, 38, 56].includes(state.age)) {
      cornerSticker = { id: 'red_packet_rain', ico: 'packet', label: '除夕抢红包雨' };
    } else if (state.age >= 7 && state.age <= 8) {
      cornerSticker = { id: 'ring_toss', ico: 'ring', label: '校门口套圈摊' };
    } else if (state.age >= 9 && state.age <= 10) {
      cornerSticker = { id: 'flip_card', ico: 'card', label: '课间望风翻牌' };
    } else if (state.age >= 14 && state.age <= 16) {
      cornerSticker = { id: 'bell_dash', ico: 'sprint', label: '下课铃冲食堂' };
    } else if (state.age >= 23 && state.age < 45 && state.stats.fatigue >= 4) {
      cornerSticker = { id: 'work_slice', ico: 'blade', label: '切需求抢下班' };
    } else if (state.age >= 45 && state.age < 60) {
      cornerSticker = { id: 'lake_fishing', ico: 'fish', label: '公园湖畔钓鱼' };
    } else if (state.age >= 60) {
      cornerSticker = { id: 'gomoku', ico: 'chess', label: '公园石桌残局' };
    }
  }
  if (!cornerSticker) {
    if (state.age <= 18 && (state.tuckUnlocked || state.age >= 7)) {
      cornerSticker = { id: 'tuck', ico: 'shop', label: '逛校门口小卖部' };
    } else if (state.age >= 22 && !state.house && state.cash + state.parentSupportLeft >= 150000) {
      cornerSticker = { id: 'house', ico: 'home', label: '周末实景看房' };
    }
  }
  const pendingHexAge = getPendingHextechAge(state);
  const hexCount = state.hexCards.length;
  const stageHs = (!drawerOpen && !theaterState) ? getOrRollStageHotspot(state) : null;
  const petStage = (state.pet && state.pet.alive) ? getPetLifeStage(state.pet) : null;
  let bodyHtml = '';
  if (activeTab === 'home') {
    const livePrev = drawerOpen && draft.length > 0 ? previewDraft(state, draft) : null;
    const fmtDelta = (v, label = '') => v > 0 ? `<span class="pill-delta pos">${label}+${v}</span>` : v < 0 ? `<span class="pill-delta neg">${label}-${Math.abs(v)}</span>` : '';
    const ctaText = theaterState ? '本季手账回放中…' : (draft.length > 0 ? `继续安排 (${draft.length}/${budget.available})` : getMainCtaText(state));
    const animCls = heroStageAnim ? heroStageAnim.anim : (heroHop ? 'hop' : '');
    const lightCls = heroStageAnim?.light ? `on ${heroStageAnim.light}` : '';
    const theaterBeat = theaterState ? theaterState.beats[theaterState.idx] : null;
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

        <!-- L2 全屏轻像素沉浸舞台（含实时动作反馈、道具贴片、主屏萌宠、闪光彩蛋与 1.8s 连播小剧场） -->
        <div class="scene-stage ${drawerOpen ? 'drawer-open' : ''}" id="scene-stage">
          <img class="scene-bg" src="./assets/bg/${bgKey}.jpg" />
          <div class="film-overlay"></div>
          <div class="film-lightleak"></div>
          <div class="stage-light ${lightCls}" id="stage-light"></div>
          ${!drawerOpen && !theaterState ? `
            <button class="hex-btn ${pendingHexAge ? 'glow' : ''}" id="btn-hex-deck">
              ${pxIcon('hex', 15)}
              <span>${pendingHexAge ? '觉醒海克斯!' : '海克斯'}</span>
              <span class="hex-cnt">${hexCount}/7</span>
              ${pendingHexAge ? '<span class="hex-dot"></span>' : ''}
            </button>
            <button class="news-btn" id="btn-news">${pxIcon('news', 15)} 时代简报${state.age >= 18 ? '<span class="news-dot"></span>' : ''}</button>
            ${(state.statusBuffs || []).length ? `
              <div class="buff-strip">
                ${state.statusBuffs.map(bf => `<span class="buff-pill ${bf.type === 'neg' ? 'neg' : ''}">${bf.name} ${bf.turns}季</span>`).join('')}
              </div>
            ` : ''}
          ` : ''}
          ${stageHs && !stageHs.claimed ? `
            <button class="stage-hotspot" id="btn-stage-hs" style="left:${stageHs.left}%;bottom:${stageHs.bottom}%;" title="${stageHs.label}">
              ${pxIcon(stageHs.ico, 17)}
              <span class="hs-lbl">${stageHs.label}</span>
            </button>
          ` : ''}
          ${petStage && !drawerOpen ? `
            <button class="stage-pet ${petHopSound ? 'pet-hop' : ''}" id="btn-stage-pet" title="摸一摸${state.pet.name}">
              ${petHopSound ? `<span class="pet-heart">♥ ${petHopSound}</span>` : ''}
              <span class="pet-body" style="transform:scale(${petStage.scale});">${pxIcon(state.pet.ico, 38)}</span>
              <span class="pet-tag">${state.pet.name}</span>
            </button>
          ` : ''}
          <div class="hero-anchor ${animCls}" id="hero-tap">
            ${heroStageAnim?.bubble ? `<div class="hero-speech">${heroStageAnim.bubble}</div>` : (bubbleUrl ? `<img class="hero-bubble" src="${bubbleUrl}" />` : '')}
            ${heroStageAnim?.prop ? `<div class="hero-prop">${pxIcon(heroStageAnim.prop, 20)}</div>` : ''}
            ${heroStageAnim?.subProp ? `<div class="hero-prop-sub">${pxIcon(heroStageAnim.subProp, 14)}</div>` : ''}
            ${spUrl ? `<img class="hero-sprite" src="${spUrl}" />` : ''}
            <div class="hero-shadow"></div>
          </div>
          ${comboBurstText ? `<div class="combo-burst">${pxIcon('combo', 15)} ${comboBurstText}</div>` : ''}
          ${floatPops.length ? `<div class="float-layer">${floatPops.map((p, idx) => `<div class="float-pop ${p.k}" style="animation-delay:${idx*140}ms;left:${48 + (idx%2===0?-8:8)}%;">${p.text}</div>`).join('')}</div>` : ''}
          ${theaterState ? `
            <div class="theater-bar" id="theater-skip">
              <div class="theater-dots">
                ${theaterState.beats.map((_, i) => `<i class="${i < theaterState.idx ? 'done' : i === theaterState.idx ? 'now' : ''}"></i>`).join('')}
              </div>
              <span class="theater-txt">${theaterState.comboShown ? '连携碰撞达成！' : `${theaterBeat?.name || ''} · ${theaterBeat?.text || ''}`}</span>
              <span class="theater-skip">轻点跳过 ›</span>
            </div>
          ` : `${!drawerOpen && cornerSticker ? `<button class="corner-sticker" id="corner-btn">${pxIcon(cornerSticker.ico, 15)} ${cornerSticker.label}</button>` : ''}<div class="date-stamp">${stamp}</div>`}
        </div>

        <!-- L3 拍立得厚白边：单行标题 + 柔和副标题 + 季节进度点 + 唯一主按钮 -->
        <div class="polaroid-margin">
          <div class="washi-tape left"></div>
          <div class="washi-tape right"></div>
          <div class="season-caption">${getSeasonTitle(state)}</div>
          <div class="season-mood">${getSeasonMood(state)}</div>
          <div class="season-dots">
            ${Array.from({ length: mp.subTurns }).map((_, idx) => `<span class="s-dot ${idx + 1 < state.subTurn ? 'past' : idx + 1 === state.subTurn ? 'now' : ''}"></span>`).join('')}
            <span class="season-dots-label">本年第 ${state.subTurn}/${mp.subTurns} 季${state.age <= 18 && state.subTurn === 2 ? ' · 暑假限定' : ''}</span>
          </div>
          ${(budget.commuteLocked || budget.babyLock) ? `<div class="season-sub">${budget.commuteLocked ? '远郊通勤占1格' : ''}${budget.babyLock ? ' · 育儿照护占1格' : ''}</div>` : ''}
          <button class="cta-main" id="btn-open-drawer" ${theaterState ? 'disabled' : ''}>${ctaText}</button>
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
            <button class="v5-more-item" id="v5-tpl">${state.templates.balance.length ? '载入我的模板' : '存为我的模板'}</button>
            <button class="v5-more-item danger" id="v5-clear" ${draft.length ? '' : 'disabled'}>✕ 清空当前槽位</button>
          </div>
        ` : ''}
      </div>

      <div class="v5-slots ${budget.available >= 5 ? 'five' : ''}" style="grid-template-columns: repeat(${Math.min(7, budget.available)}, 1fr);">
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

      <div class="combo-live-strip ${prev.combos.length ? 'lit' : ''}">
        ${pxIcon('combo', 13)}
        <span class="cb-txt">${prev.combos.length
          ? `已激活连携：${prev.combos.map(c => c.name).join(' + ')}${hasHex(state, 'hx_time_master') ? ' (翻倍)' : ''}`
          : `发金光贴纸可与已排槽位撞出连携（每新解锁 3 条送重随券）`}</span>
        <button class="combo-codex-btn" id="btn-open-codex">图鉴 ${state.discoveredCombos.length}/${SCHEDULE_COMBOS.length}</button>
      </div>

      ${inspectorHtml}

      <div class="v5-cards">
        <div class="sticker-grid ${actions.length > 8 ? 'compact' : ''}">
          ${(() => {
            const partnerIds = draft.length < budget.available
              ? getComboPartnerIds(draft, actions.filter(x => !x.disabled).map(x => x.id), state)
              : new Set();
            return actions.map(a => {
              const m = getActionMeta(a, state);
              const cnt = slotCounts[a.id] || 0;
              const rec = recMap[a.id];
              const isPartner = partnerIds.has(a.id);
              const leftBadge = a.seasonal ? (a.badge || '限定') : (isPartner ? '可连携' : rec);
              const isFocus = inspected && inspected.id === a.id;
              const pulseFirst = isFirstTurn && draft.length === 0 && a.id === recFirstId;
              return `
                <button class="stk ${a.seasonal ? 'seasonal' : ''} ${isPartner ? 'combo-partner' : ''} ${isFocus ? 'focus' : ''} ${cnt ? 'slotted' : ''} ${a.disabled ? 'is-disabled' : ''} ${pulseFirst ? 'guide-pulse' : ''}" data-sticker="${a.id}">
                  ${leftBadge ? `<span class="stk-rec ${a.seasonal ? 'sea-badge' : isPartner ? 'partner-badge' : ''}">${leftBadge}</span>` : ''}
                  ${a.costCash > 0 ? `<span class="stk-price ${leftBadge ? 'under-rec' : ''}">¥${fmtMoney(a.costCash)}</span>` : ''}
                  ${cnt > 0 ? `<span class="stk-cnt">×${cnt}</span>` : ''}
                  <div class="stk-well" style="--well-bg:${m.wellBg};">${pxIcon(m.ico, 23)}</div>
                  <span class="stk-nm">${m.short}</span>
                </button>
              `;
            }).join('');
          })()}
        </div>
        <div class="v5-hint-line">${isFirstTurn ? '单点贴纸即排入并预览主角动作 · 点槽位 ✕ 可撤 · 右上 ∨ 收起' : '亮金边「可连携」贴纸入槽即可碰撞合成 · 右上 ∨ 收起'}</div>
      </div>

      <div class="v5-footer">
        ${prev.fatigueWarn ? `<div class="v5-warn">注意：本季安排偏满（疲劳将达 ${prev.endFatigue}/${prev.fatigueLimit}），会额外扣 1 点健康</div>` : ''}
        <button class="btn-go ${isFirstTurn && isFull ? 'ready-pulse' : ''}" id="v5-exec">开始这一季 → ${goPillHtml}</button>
      </div>
    </div>
  `;
}

function renderAssetsTab() {
  return renderNewAssetsTab(state, fmtMoney);
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
  if (state.pet && state.pet.alive) {
    const ps = getPetLifeStage(state.pet);
    people.push({
      ico: state.pet.ico,
      name: `${state.pet.name} (${ps?.label || ''}${state.pet.species})`,
      role: `相伴 ${state.pet.ageYears} 年 · 抗孤独`,
      val: state.pet.bond || 50,
      help: true,
      alt: true
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

      ${renderDreamJournalSection(state)}
    </div>
  `;
}

function renderAlbumTab() {
  return `
    <div class="tab-page">
      <div class="sec-card">
        <h4 style="display:flex;align-items:center;gap:6px;">${pxIcon('life', 16)} 人生树分叉存档（18 / 30 / 50 岁）</h4>
        <div style="display:flex;gap:6px;flex-wrap:wrap;">
          ${[18, 30, 50].map(a => `<button class="btn secondary" data-branch="${a}" ${state.branches[a] ? '' : 'disabled'}>回到 ${a} 岁</button>`).join('')}
          <button class="btn ghost" id="t-memorial">预览纪念册</button>
        </div>
      </div>

      <div class="sec-card">
        <h4 style="display:flex;align-items:center;gap:6px;">${pxIcon('film', 16)} 人生胶片相册 (${state.albumPhotos.length} 张)</h4>
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
    b.onclick = () => {
      if (theaterState) stopTheater(true);
      activeTab = b.dataset.tab; drawerOpen = false; render();
    };
  });

  const bind = (id, fn) => { const el = appEl.querySelector(id); if (el) el.onclick = fn; };

  // 主页 V4 / V5 交互
  bind('#btn-open-drawer', () => {
    if (theaterState) return;
    drawerOpen = true; moreMenuOpen = false; render();
  });
  bind('#drawer-mask', () => { drawerOpen = false; moreMenuOpen = false; clearHeroStageAnimDom(); render(); });
  bind('#v5-close', () => { drawerOpen = false; moreMenuOpen = false; clearHeroStageAnimDom(); render(); });
  bind('#toast-close', () => {
    if (toastTimer) { clearTimeout(toastTimer); toastTimer = null; }
    toastMsg = '';
    document.querySelectorAll('.toast-ribbon').forEach(el => el.remove());
  });
  bind('#hud-era', openEraNewspaper);
  bind('#btn-news', openEraNewspaper);
  bind('#btn-hex-deck', () => {
    const pending = getPendingHextechAge(state);
    if (pending) openHextechAwakenModal(pending);
    else openHexDeckModal('deck');
  });
  bind('#btn-open-codex', () => openHexDeckModal('codex'));
  bind('#theater-skip', () => stopTheater(true));
  if (theaterState) {
    bind('#scene-stage', () => stopTheater(true));
  }
  bind('#hud-cash', () => {
    if (state.totalTurns >= 1 || state.age > 6) {
      activeTab = 'assets'; drawerOpen = false; moreMenuOpen = false; render();
    }
  });
  bind('#hero-tap', () => {
    if (theaterState) { stopTheater(true); return; }
    heroHop = true;
    showToast(state.gender === 'female' ? '「一步一步走，把这一辈子过得热气腾腾。」' : '「先把手头这一季安排好，未来慢慢来。」');
    setTimeout(() => {
      heroHop = false;
      document.querySelector('#hero-tap')?.classList.remove('hop');
    }, 440);
  });

  if (cornerSticker) {
    bind('#corner-btn', () => {
      if (cornerSticker.id === 'tuck') openTuckShopSheet();
      else if (cornerSticker.id === 'house') openHouseSheet();
      else launchArcadeGame(cornerSticker.id);
    });
  }
  bind('#btn-stage-hs', () => {
    const hs = claimStageHotspot(state);
    if (!hs) return;
    saveAutoProgress();
    showToast(hs.msg);
  });
  bind('#btn-stage-pet', () => {
    const res = interactWithPet(state);
    if (!res) return;
    if (res.blocked) {
      showToast(res.msg);
      return;
    }
    petHopSound = res.sound || '♥';
    if (petHopTimer) clearTimeout(petHopTimer);
    saveAutoProgress();
    showToast(res.msg);
    petHopTimer = setTimeout(() => {
      petHopSound = '';
      petHopTimer = null;
      const el = document.getElementById('btn-stage-pet');
      if (el) {
        el.classList.remove('pet-hop');
        el.querySelectorAll('.pet-heart').forEach(h => h.remove());
      }
    }, 950);
  });

  // 单点贴纸入槽 + 若凑成新 Combo 当场触发「双卡升空蓄力物理碰撞合体」特效！
  appEl.querySelectorAll('[data-sticker]').forEach(b => {
    b.onclick = () => {
      const id = b.dataset.sticker;
      const act = actions.find(x => x.id === id);
      moreMenuOpen = false;
      inspectedId = id;
      if (!act) return render();
      if (act.disabled) {
        showToast(act.disabledReason ? `「${act.name}」${act.disabledReason}` : `「${act.name}」本年次数已用完`);
        return;
      }
      const prevIds = new Set(detectCombos(draft, state).map(c => c.id));
      if (draft.length < budget.available) {
        draft.push(id);
      }
      const afterCombos = detectCombos(draft, state);
      const justFormed = afterCombos.find(c => !prevIds.has(c.id));
      triggerHeroActionPreview(id, 1400);
      render();
      if (justFormed) {
        const isFirst = !state.discoveredCombos.includes(justFormed.id);
        playComboCollisionVfx(justFormed, isFirst, actions, getActionMeta, state);
      }
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
      triggerHeroActionPreview(inspectedId, 1400);
      render();
    }
  });

  const doSmartFill = () => {
    draft = buildSmartDraft(state, actions, budget);
    inspectedId = draft[draft.length - 1] || null;
    moreMenuOpen = false;
    if (inspectedId) triggerHeroActionPreview(inspectedId, 1400);
    showToast('已按当前目标帮你排满，点上方 ✕ 可随时替换');
  };
  const doReuse = () => {
    const valid = new Set(actions.filter(a => !a.disabled).map(a => a.id));
    draft = state.lastDraft.filter(id => valid.has(id)).slice(0, budget.available);
    inspectedId = draft[draft.length - 1] || null;
    moreMenuOpen = false;
    if (inspectedId) triggerHeroActionPreview(inspectedId, 1400);
    render();
  };

  bind('#v5-smart', doSmartFill);
  bind('#v5-smart-menu', doSmartFill);
  bind('#v5-reuse', doReuse);
  bind('#v5-reuse-menu', doReuse);
  bind('#v5-more-toggle', (e) => { e.stopPropagation(); moreMenuOpen = !moreMenuOpen; render(); });
  bind('#v5-clear', () => { draft = []; moreMenuOpen = false; clearHeroStageAnimDom(); render(); });
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

  // 执行本回合：收起抽屉 -> 播放 1.8s 手账连播小剧场（可轻点秒跳）-> 衔接大节点 / 年度决算 / 命运海克斯觉醒
  bind('#v5-exec', () => {
    const execDraft = [...draft];
    const res = executeTurn(state, execDraft);
    draft = [];
    inspectedId = null;
    moreMenuOpen = false;
    drawerOpen = false;
    clearHeroStageAnimDom();
    saveAutoProgress();

    if (state.ended) { render(); return; }

    const needGrad = state.age === state.gradAge && state.subTurn === 1 && !state.track;
    const afterEvents = () => {
      if (res.needGaokao) return openGaokaoV3(() => checkPendingHextech());
      if (needGrad) return openGradV3(() => checkPendingHextech());
      if (res.yearEndReport) return showYearEndV3(res.yearEndReport, () => checkPendingHextech());
      if (!checkPendingHextech()) {
        if (res.rerollTicketsEarned > 0) {
          showToast(`新解锁 ${state.discoveredCombos.length} 条连携图鉴，获命运重随券 +${res.rerollTicketsEarned}！`);
        } else if (res.newlyDiscoveredCombos?.length > 0) {
          showToast(`收录新连携图鉴：${res.newlyDiscoveredCombos.map(c => c.name).join(' · ')}`);
        } else {
          triggerFloatPops(res.summary);
          render();
        }
      }
    };

    const afterTheater = () => {
      if (res.triggeredEvent) {
        showApprovedEventV3(res.triggeredEvent, afterEvents, { isMidTurn: false });
      } else if (res.midTurnEvent) {
        showApprovedEventV3(res.midTurnEvent, afterEvents, { isMidTurn: true });
      } else if (res.arcadeMoment) {
        showStageArcadePopup(res.arcadeMoment, afterEvents);
      } else {
        afterEvents();
      }
    };

    playTurnTheater(res, afterTheater);
  });

  // 二级 Tab 按钮绑定（含定稿版家与账小猪摇晃/购车/多宝格点击故事 & 追梦和解转身）
  bindNewAssetsInteractions(appEl, state, saveAutoProgress, showToast, render);
  bind('#t-tuck', openTuckShopSheet);
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
  appEl.querySelectorAll('[data-pivot-dream]').forEach(btn => {
    btn.onclick = () => {
      const did = btn.dataset.pivotDream;
      const meta = DREAM_CATALOG[did];
      applyGracefulPivot(state, did);
      saveAutoProgress();
      render();
      showToast(`与执念温柔和解，已沉淀为终身特质：${meta.pivotTrait}`);
    };
  });
  bind('#t-memorial', () => { state.ended = true; state.endReason = '手动预览人生纪念册'; render(); });
  appEl.querySelectorAll('[data-branch]').forEach(b => {
    b.onclick = () => {
      const a = Number(b.dataset.branch);
      if (state.branches[a]) {
        const saved = ensureSprint1State(JSON.parse(state.branches[a]));
        saved.branches = state.branches;
        state = saved; draft = []; inspectedId = null; moreMenuOpen = false; activeTab = 'home';
        showToast(`已从人生树回到 ${a} 岁分叉点！`);
      }
    };
  });
}

// ===== 首屏 V2（方案 1：电影感纯封面 + 3 步手账翻页，全机型零滚动 + 本地自动存档续玩）=====
function renderIntro() {
  const maleSp = sprites.male?.[0] || '';
  const femaleSp = sprites.female?.[0] || '';
  const curSp = sprites[pickedGender]?.[0] || maleSp;
  const savedRun = loadAutoSave();

  let screenHtml = '';

  if (introStep === 0) {
    const savedInfo = savedRun
      ? `${savedRun.age}岁 · 第${savedRun.subTurn}季`
      : '';
    screenHtml = `
      <div class="intro-v2-screen">
        <div class="cover-stage">
          <img class="cover-bg" src="./assets/bg/child.jpg" />
          <div class="cover-veil"></div>
          <div class="cover-title-block">
            <span class="cover-kicker">${pxIcon('film', 13)} 千禧人生手账 · 6–80 岁</span>
            <div class="cover-title-halo">
              <div class="cover-logo">
                <h1>这辈子</h1>
                <span class="cover-ver">2.0</span>
              </div>
              <div class="cover-slogan">每一岁，都是人生相册里的一张胶片</div>
            </div>
          </div>
          <div class="cover-hero">
            ${curSp ? `<img class="sp" src="${curSp}" alt="主角" />` : ''}
            <div class="sh"></div>
          </div>
          <div class="date-stamp">1998.03</div>
        </div>

        <div class="cover-dock">
          <svg class="cover-torn" viewBox="0 0 390 13" preserveAspectRatio="none">
            <path d="M0,13 L0,7 Q16,2 32,7 T64,6 T96,8 T128,5 T160,8 T192,5 T224,8 T256,5 T288,7 T320,5 T352,8 T390,6 L390,13 Z" fill="#fffdf9"/>
          </svg>
          <div class="washi-tape left"></div>
          <div class="washi-tape right"></div>
          <button class="cta-main" id="btn-new-life" style="width:228px;max-width:228px;">开启这一生 →</button>
          ${savedRun ? `
            <button class="cover-continue" id="btn-continue-life">
              ${pxIcon('passbook', 13)} 继续上次人生（${savedInfo}）
            </button>
          ` : ''}
          <div class="cover-foot">纯人工审核剧情 · 双性别差异化人生线</div>
        </div>
      </div>
    `;
  } else if (introStep === 1) {
    const flavor = pickedGender === 'female'
      ? '<b>女主线预告：</b>8 岁珍藏「复古芭比娃娃」可上墙激活居家 Buff，经历职场平衡与温暖人际的专属生活切片。'
      : '<b>男主线预告：</b>8 岁珍藏「红色悠悠球」可上墙激活居家 Buff，经历安家置业与职场拼搏的专属生活切片。';
    screenHtml = `
      <div class="intro-v2-screen">
        <div class="wiz-top">
          <button class="wiz-back" id="wiz-prev">‹ 返回</button>
          <div class="wiz-prog">
            <div class="wiz-dots"><i class="on"></i><i></i><i></i></div>
            <span class="wiz-step-txt">1 / 3 · 选择主角</span>
          </div>
          <span></span>
        </div>

        <div class="wiz-body">
          <div class="wiz-head">
            <h2>你想以谁的视角出发？</h2>
            <p>双性别拥有专属童年旧物、人生处境与独立人审剧情</p>
          </div>

          <div class="gender-pair">
            <button class="g-polaroid ${pickedGender==='male'?'sel':''}" id="g-m">
              ${pickedGender==='male' ? '<span class="g-check">✓</span>' : ''}
              <div class="g-photo">${maleSp ? `<img src="${maleSp}" alt="男主角" />` : ''}</div>
              <div class="g-name">男主角</div>
              <div class="g-toy">${pxIcon('yoyo', 13)} 红色悠悠球</div>
            </button>
            <button class="g-polaroid ${pickedGender==='female'?'sel':''}" id="g-f">
              ${pickedGender==='female' ? '<span class="g-check">✓</span>' : ''}
              <div class="g-photo">${femaleSp ? `<img src="${femaleSp}" alt="女主角" />` : ''}</div>
              <div class="g-name">女主角</div>
              <div class="g-toy">${pxIcon('doll', 13)} 复古芭比娃娃</div>
            </button>
          </div>

          <div class="flavor-note">
            ${pxIcon('spark', 17)}
            <span>${flavor}</span>
          </div>
        </div>

        <div class="wiz-foot">
          <button class="cta-main" id="wiz-next" style="width:232px;max-width:232px;">下一步 · 抽取出身 →</button>
        </div>
      </div>
    `;
  } else if (introStep === 2) {
    const probPct = Math.round((pickedOrigin.prob || 0.2) * 100);
    const eduText = pickedOrigin.eduLimit >= 99 ? '不限次' : `${pickedOrigin.eduLimit} 次 / 年`;
    screenHtml = `
      <div class="intro-v2-screen">
        <div class="wiz-top">
          <button class="wiz-back" id="wiz-prev">‹ 上一步</button>
          <div class="wiz-prog">
            <div class="wiz-dots"><i class="done"></i><i class="on"></i><i></i></div>
            <span class="wiz-step-txt">2 / 3 · 出生家境</span>
          </div>
          <span></span>
        </div>

        <div class="wiz-body">
          <div class="wiz-head">
            <h2>命运抽签 · 你的起点</h2>
            <p>${unlockedSelfPick ? '已通关解锁：可自由切换任意出身' : '按现实比例随机抽取，通关任意结局后解锁自选'}</p>
          </div>

          <div class="fortune-card">
            <div class="ft-tape"></div>
            <div class="ft-head">
              <span class="ft-prob">${unlockedSelfPick ? '自由选择模式' : `已抽中 · 现实概率 ${probPct}%`}</span>
              <div class="ft-name">${pickedOrigin.name}之家</div>
            </div>

            <div class="ft-grid">
              <div class="ft-kv"><span>家庭家底</span><b>约 ¥${fmtMoney(pickedOrigin.familyAsset)}</b></div>
              <div class="ft-kv"><span>父母首付支援</span><b>¥${fmtMoney(pickedOrigin.downpaySupport)}</b></div>
              <div class="ft-kv"><span>童年起步零花</span><b>¥${pickedOrigin.pocketMoney || 50} / 月</b></div>
              <div class="ft-kv"><span>年补习上限</span><b>${eduText}</b></div>
            </div>

            <div class="ft-traits">
              <div class="ft-tr"><span class="ft-dot pos">＋</span><span>${pickedOrigin.buff}</span></div>
              <div class="ft-tr"><span class="ft-dot neg">!</span><span>${pickedOrigin.debuff}</span></div>
            </div>

            <div class="ft-reroll-row">
              ${unlockedSelfPick
                ? ORIGINS.map(o => `<button class="pill-btn ${pickedOrigin.id===o.id?'primary':''}" style="height:26px;padding:0 9px;font-size:11px;" data-po="${o.id}">${o.name}</button>`).join('')
                : `<button class="pill-btn soft" id="btn-reroll" style="height:29px;padding:0 13px;font-size:11.5px;" ${rerollUsed?'disabled':''}>${rerollUsed?'已用完重抽机会':'↻ 免费重抽一次（剩 1 次）'}</button>`}
            </div>
          </div>
        </div>

        <div class="wiz-foot">
          <button class="cta-main" id="wiz-next" style="width:236px;max-width:236px;">接受出身 · 选天赋 →</button>
        </div>
      </div>
    `;
  } else {
    screenHtml = `
      <div class="intro-v2-screen">
        <div class="wiz-top">
          <button class="wiz-back" id="wiz-prev">‹ 上一步</button>
          <div class="wiz-prog">
            <div class="wiz-dots"><i class="done"></i><i class="done"></i><i class="on"></i></div>
            <span class="wiz-step-txt">3 / 3 · 初始天赋</span>
          </div>
          <span></span>
        </div>

        <div class="wiz-body">
          <div class="build-summary">
            <span class="mini-av">${curSp ? `<img src="${curSp}" alt="头像" />` : ''}</span>
            <span>${pickedGender === 'female' ? '女主角' : '男主角'} · ${pickedOrigin.name}之家</span>
          </div>

          <div class="wiz-head">
            <h2>挑选一项初始天赋</h2>
            <p>从「${pickedOrigin.name}之家」专属天赋池中三选一</p>
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

        <div class="wiz-foot">
          <button class="cta-main" id="btn-start" style="width:224px;max-width:224px;">6 岁正式起步 →</button>
        </div>
      </div>
    `;
  }

  appEl.innerHTML = `
    <div class="phone-stage-outer">
      <div class="phone-frame">
        <div class="wx-topbar-safe"><div class="wx-capsule"><span>•••</span><span>|</span><span>◉</span></div></div>
        ${screenHtml}
      </div>
    </div>
  `;

  // 事件绑定
  const bind = (id, fn) => { const el = appEl.querySelector(id); if (el) el.onclick = fn; };
  bind('#btn-new-life', () => { introStep = 1; renderIntro(); });
  bind('#btn-continue-life', () => {
    const s = loadAutoSave();
    if (!s) return renderIntro();
    state = s;
    activeTab = 'home'; drawerOpen = false; draft = []; inspectedId = null; moreMenuOpen = false;
    render();
    showToast(`欢迎回来！已恢复 ${state.age} 岁 · 第 ${state.subTurn} 季进度`);
  });
  bind('#wiz-prev', () => { introStep = Math.max(0, introStep - 1); renderIntro(); });
  bind('#wiz-next', () => { introStep = Math.min(3, introStep + 1); renderIntro(); });
  bind('#g-m', () => { pickedGender = 'male'; renderIntro(); });
  bind('#g-f', () => { pickedGender = 'female'; renderIntro(); });
  bind('#btn-reroll', () => {
    rerollUsed = true;
    pickedOrigin = rollOrigin();
    pickedTalent = pickedOrigin.talents[0].id;
    renderIntro();
  });
  appEl.querySelectorAll('[data-po]').forEach(b => {
    b.onclick = () => {
      pickedOrigin = ORIGINS.find(o => o.id === b.dataset.po);
      pickedTalent = pickedOrigin.talents[0].id;
      renderIntro();
    };
  });
  appEl.querySelectorAll('[data-t]').forEach(b => {
    b.onclick = () => { pickedTalent = b.dataset.t; renderIntro(); };
  });
  bind('#btn-start', () => {
    clearAutoSave();
    state = createInitialState(pickedOrigin.id, pickedTalent, pickedGender);
    activeTab = 'home'; drawerOpen = false; draft = []; inspectedId = null; moreMenuOpen = false;
    saveAutoProgress();
    render();
    // 6 岁启蒙立刻触发首张「命运海克斯」三选一！
    const pending = getPendingHextechAge(state);
    if (pending) {
      openHextechAwakenModal(pending, () => {
        showToast('6 岁开学啦！点下方「安排新学期」开始你的第一季');
      });
    } else {
      showToast('6 岁开学啦！点下方「安排新学期」开始你的第一季');
    }
  });
}

// ===== Sprint 1 核心弹窗：命运海克斯 2.0 觉醒三选一（单卡独立刷新 + 羁绊预亮 + 进化/融合）=====
function checkPendingHextech(onDone) {
  const pending = getPendingHextechAge(state);
  if (!pending) return false;
  openHextechAwakenModal(pending, onDone);
  return true;
}

function openHextechAwakenModal(nodeAge, onDone) {
  ensureSprint1State(state);
  openHextechV4Modal({
    state,
    nodeAge,
    mountOverlay,
    clearOverlay,
    saveAutoProgress,
    renderMain: render,
    showToast,
    onDone
  });
}

// ===== 命运海克斯卡组 & 生活 Combo 图鉴查看器 =====
function openHexDeckModal(defaultTab = 'deck') {
  ensureSprint1State(state);
  let curTab = defaultTab;

  const renderDeck = () => {
    const bonds = getHexBondCounts(state);
    const tierLabel = t => t === 'prism' ? '棱彩' : t === 'gold' ? '黄金' : '白银';

    let inner = '';
    if (curTab === 'deck') {
      inner = `
        <div class="bond-grid">
          ${Object.values(HEX_BONDS).map(b => {
            const c = bonds[b.id] || 0;
            const cls = c >= 4 ? 'lit4' : c >= 2 ? 'lit2' : '';
            return `
              <div class="bond-box ${cls}">
                <div class="bond-box-top">
                  <span style="color:${b.color};">${pxIcon(b.ico, 13)} ${b.name}</span>
                  <span>${c}/4</span>
                </div>
                <div class="bond-box-desc">${c >= 4 ? `★4张生效：${b.t4}` : c >= 2 ? `★2张生效：${b.t2}` : `凑2张：${b.t2}`}</div>
              </div>
            `;
          }).join('')}
        </div>
        <div class="hex-slot-list">
          ${state.hexCards.map((inst) => {
            const def = HEX_CARD_MAP[inst.id];
            if (!def) return '';
            let liveTag = '';
            if (def.kind === 'scaling') liveTag = ` · 进度 ${inst.stacks}/${def.maxStacks}`;
            if (def.kind === 'delayed') {
              liveTag = inst.done ? ' · 已兑现' : (inst.turnsLeft > 0 ? ` · 剩 ${inst.turnsLeft} 季` : ` · 剩 ${inst.yearsLeft} 年`);
            }
            return `
              <div class="hex-slot-row">
                <div class="hx-ico-well" style="width:34px;height:34px;">${pxIcon(def.ico || 'hex', 19)}</div>
                <div style="flex:1;min-width:0;">
                  <div class="hx-badges">
                    <span class="hx-tier-tag ${def.tier}">${tierLabel(def.tier)}</span>
                    ${def.kindLabel ? `<span class="hx-special-tag">${def.kindLabel}</span>` : ''}
                    ${def.bonds.map(bid => `<span class="hx-bond-tag" style="background:${HEX_BONDS[bid].bg};color:${HEX_BONDS[bid].color};">${HEX_BONDS[bid].short}</span>`).join('')}
                    <span style="font-size:10px;color:var(--muted);">${inst.acquiredAge}岁${liveTag}</span>
                  </div>
                  <div style="font-size:13px;font-weight:800;color:var(--ink);">${def.name}</div>
                  <div style="font-size:11px;color:var(--muted);line-height:1.4;margin-top:2px;">${def.detail || def.desc}</div>
                </div>
              </div>
            `;
          }).join('')}
          ${HEX_NODES.filter(a => !state.hexTriggeredAges.includes(a)).map(nodeAge => `
            <div class="hex-slot-row empty">${pxIcon('hex', 15)} <span>待觉醒 · ${nodeAge} 岁节点解锁${state.age >= nodeAge ? '（可立即觉醒）' : ''}</span></div>
          `).join('')}
        </div>
      `;
    } else {
      const nextTicketRem = 3 - (state.discoveredCombos.length % 3);
      inner = `
        <div class="mg-stats" style="margin-bottom:8px;">
          已发现 <b>${state.discoveredCombos.length}/${SCHEDULE_COMBOS.length}</b> 条生活连携 · 再发现 <b>${nextTicketRem}</b> 条送重随券 +1（现有 ${state.hexRerollTickets} 张）
        </div>
        ${SCHEDULE_COMBOS.map(cb => {
          const unlocked = state.discoveredCombos.includes(cb.id);
          return `
            <div class="codex-item ${unlocked ? '' : 'locked'}">
              <div class="codex-top">
                <span>${unlocked ? `★ ${cb.name}` : '未发现连携'}</span>
                <span class="tag ${unlocked ? 'up' : ''}">${unlocked ? '已收录' : cb.stage === 'child' ? '童年' : cb.stage === 'adult' ? '青中年' : cb.stage === 'elder' ? '老年' : '全阶段'}</span>
              </div>
              <div class="codex-sub">${unlocked ? `${cb.hint} → ${cb.desc}` : `线索：${cb.hint}`}</div>
            </div>
          `;
        }).join('')}
      `;
    }

    mountOverlay(`
      <div class="sheet-modal"><div class="sheet-box" style="max-height:82%;display:flex;flex-direction:column;">
        <div class="sec-head-row" style="margin-bottom:8px;">
          <span class="sec-title">${pxIcon('hex', 17)} 命运卡组与连携图鉴</span>
          <span class="tag">${pxIcon('dice', 12)} 重随券 ×${state.hexRerollTickets}</span>
        </div>
        <div class="deck-tabs">
          <button class="deck-tab ${curTab === 'deck' ? 'active' : ''}" id="tab-deck">命运卡组 (${state.hexCards.length}/7)</button>
          <button class="deck-tab ${curTab === 'codex' ? 'active' : ''}" id="tab-codex">连携图鉴 (${state.discoveredCombos.length}/${SCHEDULE_COMBOS.length})</button>
        </div>
        <div style="flex:1;overflow-y:auto;min-height:0;padding-right:2px;">${inner}</div>
        <div class="mg-actions" style="margin-top:8px;">
          <button class="btn primary" id="deck-close" style="width:100%;">收起</button>
        </div>
      </div></div>
    `, host => {
      host.querySelector('#tab-deck').onclick = () => { curTab = 'deck'; renderDeck(); };
      host.querySelector('#tab-codex').onclick = () => { curTab = 'codex'; renderDeck(); };
      host.querySelector('#deck-close').onclick = () => { clearOverlay(); render(); };
    });
  };
  renderDeck();
}

// ===== 专属「人审剧情手账阅读器」（支持海克斯金色共鸣破局、属性检定、概率博弈）=====
function showApprovedEventV3(ev, next, opts = {}) {
  const cleanTitle = ev.title.replace(/\[.*?\]\s*/, '');
  const chapterLabel = ev.isDreamEvent
    ? '心之所向 · 追梦切片'
    : opts.isMidTurn
      ? '半路小插曲 · 随机奇遇'
      : ev.priority === 'P0' ? '人生重要节点'
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
    photoCaption: opts.isMidTurn ? null : cleanTitle,
    bodyHtml: `
      <div class="story-paper">${ev.summary}</div>
      <div class="story-choices">
        ${ev.choices.map((c, idx) => {
          const isSpecial = Boolean(c.reqAny || c.reqRelation || typeof c.reqCustom === 'boolean');
          let ok = true;
          if (c.reqAny) ok = Object.entries(c.reqAny).some(([k, v]) => state.stats[k] >= v);
          if (c.reqRelation) ok = (state.relations.partner?.intimacy >= c.reqRelation) || (state.child?.bond >= c.reqRelation);
          if (typeof c.reqCustom === 'boolean') ok = c.reqCustom;
          const { main, sub } = splitChoiceLabel(c.label);
          const cls = (c.isHexResonance || c.isLiveArcade) ? 'hex-res-choice' : isSpecial ? (ok ? 'gold-choice' : 'locked-choice') : '';
          let badgeHtml = '';
          if (c.isLiveArcade) {
            badgeHtml = `<span class="gold-badge">${pxIcon('gamepad', 11)} 临场实操</span>`;
          } else if (c.isHexResonance) {
            badgeHtml = `<span class="gold-badge">${pxIcon('hex', 11)} 海克斯共鸣</span>`;
          } else if (isSpecial) {
            badgeHtml = ok
              ? `<span class="gold-badge">★ ${c.reqRelation ? '羁绊解锁' : '条件达标'}</span>`
              : `<span class="lock-badge">${pxIcon('lock', 11)} 未达条件</span>`;
          } else if (c.gamble) {
            const pct = Math.min(95, Math.round((c.gamble.rate + (hasHex(state, 'hx_koi_god') ? 0.25 : 0) + (getBondTier(state, 'luck') >= 4 ? 0.20 : 0)) * 100));
            badgeHtml = `<span class="gold-badge">${pct}% 博弈</span>`;
          }
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
          const choice = ev.choices[Number(b.dataset.ci)];
          const res = applyEventChoiceEffects(state, choice);
          if (res.photoCaption) {
            state.albumPhotos.push({
              age: state.age,
              stamp: getDateStamp(state.age, state.subTurn),
              title: res.photoCaption,
              stageIdx: getSubStageIndex(state.age),
              bg: getBgKey(state.age)
            });
          }
          finish();
          const dreamToGame = {
            d_esport: 'work_slice',
            d_hurdle: 'bell_dash',
            d_tsinghua: 'nostalgia_link',
            d_singer: 'nostalgia_link',
            d_surgeon: 'lake_fishing'
          };
          if (res.launchQualifierArcade) {
            const { id } = res.launchQualifierArcade;
            launchArcadeGame(dreamToGame[id] || 'nostalgia_link', {
              qualifierDream: { id },
              onAfterDone: () => { if (next) next(); }
            });
            return;
          }
          if (res.launchClimaxArcade) {
            const { id, nearTxt } = res.launchClimaxArcade;
            launchArcadeGame(dreamToGame[id] || 'nostalgia_link', {
              climaxDream: { id, nearTxt },
              onAfterDone: () => { if (next) next(); }
            });
            return;
          }
          if (res.openTuckAfter) {
            openTuckShopSheet();
            return;
          }
          if (res.msg) showToast(res.msg);
          if (next) next();
        };
      });
    }
  });
}

function openGaokaoV3(afterDone) {
  const tsDream = state.dreams?.d_tsinghua;
  const tsBonus = (tsDream && tsDream.stage >= 2) ? Math.min(5, Math.floor((tsDream.xp || 0) / 12)) : 0;
  let mod = (state.gaokaoHexBonus || 0) + (hasHex(state, 'hx_tsinghua_link') ? 4 : 0) + tsBonus;
  if (state.stats.mood >= 60) mod += 2; else if (state.stats.mood < 30) mod -= 3;
  if (state.stats.fatigue >= getEffectiveFatigueLimit(state)) mod -= 2;
  if (state.experiences.includes('exp_gaokao_sprint')) mod += 1;
  if (state.origin.id === 'welloff') mod += 1;
  const score = clamp(state.stats.knowledge + mod);
  const hasSprint = state.experiences.includes('exp_gaokao_sprint')
    || getBondTier(state, 'scholar') >= 4
    || ((tsDream?.xp || 0) >= 42);
  const wantsMed = (state.dreams?.d_surgeon?.stage || 0) >= 1;

  showV3Capture({
    compactViewfinder: true,
    badge: '18 岁高考 · 人生重要节点',
    title: `高考出分：${score} 分 · 填报志愿`,
    photoCaption: `18岁高考 ${score} 分`,
    bodyHtml: `
      <p style="font-size:12px;color:var(--muted);margin:0 0 8px;">可动用留学资金：¥${fmtMoney(state.studyAbroadLeft)}${tsBonus > 0 ? ` · 清北攻坚已加成 +${tsBonus}分` : ''}</p>
      <div style="display:flex;flex-direction:column;gap:7px;">
        ${UNIVERSITIES.map(u => {
          let ok = u.abroad
            ? state.studyAbroadLeft >= u.cost && state.stats.knowledge >= u.minScore && state.stats.expr >= (u.minExpr - (state.talent.id === 't_vision' ? 10 : 0))
            : (u.tier === 1 ? score >= 90 && hasSprint : score >= u.minScore);
          const medBadge = (wantsMed && u.tier <= 3 && !u.abroad) ? ' · 含医学学籍' : '';
          return `<button class="action-card" data-u="${u.id}" ${ok?'':'disabled'}>
            <div class="ac-top"><span>${u.name}${medBadge}</span><span>${ok ? '可选' : '未达线'}</span></div>
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
          // 追梦高考联动：主流本科及以上取得临床医学准入学籍；第一档顶尖学府直通清北圆梦！
          if (u.tier <= 3 && !u.abroad && state.dreams?.d_surgeon) {
            state.dreams.d_surgeon.medQualified = true;
          }
          let extraToast = '';
          if (u.id === 'u1' && state.dreams?.d_tsinghua?.stage >= 2) {
            state.dreams.d_tsinghua.stage = 4;
            state.dreams.d_tsinghua.outcome = 'success';
            state.dreams.d_tsinghua.xp = 100;
            state.dreamCompleted = true;
            if (!state.experiences.includes('exp_dream_complete')) state.experiences.push('exp_dream_complete');
            if (!state.items.includes('清北烫金录取通知书')) state.items.push('清北烫金录取通知书');
            extraToast = ' · 圆梦清北学府，获烫金录取通知书！';
          } else if (u.id !== 'u1' && state.dreams?.d_tsinghua?.stage >= 2) {
            extraToast = ' · 大学已开启「考研逆袭清北」通道！';
          }
          finish();
          if (afterDone) afterDone();
          showToast(`已被「${u.name}」录取！${extraToast}`);
        };
      });
    }
  });
}

function openGradV3(afterDone) {
  let selCity = state.cityTier, selTrack = 'steady';
  const buildBody = () => `
    <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px;">
      ${[1,2,3].map(t => `<button class="pill-btn ${selCity===t?'primary':''}" data-c="${t}">${CITIES[t].name.slice(0,4)}</button>`).join('')}
    </div>
    <div style="display:flex;flex-direction:column;gap:6px;margin-bottom:10px;">
      ${TRACKS.map(tr => `<button class="action-card" style="${selTrack===tr.id?'border-color:var(--accent);background:var(--accent-soft);':''}" data-tr="${tr.id}">
        <div class="ac-top"><span>${tr.name.slice(0,11)}</span><span>拐点${tr.capAge}岁</span></div>
        <div class="ac-sub">退休替代率 ${Math.round(tr.replaceRate*100)}% · 裁员风险：${tr.layoffRisk}</div>
      </button>`).join('')}
    </div>
    <div style="display:flex;justify-content:center;padding-bottom:6px;">
      <button class="cta-main" id="g-go" style="width:78%;max-width:250px;">正式入职开启职场 →</button>
    </div>
  `;

  showV3Capture({
    compactViewfinder: true,
    badge: `毕业择城 · ${state.age}岁`,
    title: '选择你的奋斗城市与职业曲线',
    photoCaption: `${state.age}岁毕业初入社会`,
    bodyHtml: buildBody(),
    onDone: (host, finish) => {
      const bindGrad = () => {
        const box = host.querySelector('#v3-content');
        box.querySelectorAll('[data-c]').forEach(b => {
          b.onclick = () => { selCity = Number(b.dataset.c); box.innerHTML = buildBody(); bindGrad(); };
        });
        box.querySelectorAll('[data-tr]').forEach(b => {
          b.onclick = () => { selTrack = b.dataset.tr; box.innerHTML = buildBody(); bindGrad(); };
        });
        box.querySelector('#g-go').onclick = () => {
          state.cityTier = selCity; state.track = TRACKS.find(x => x.id === selTrack);
          finish();
          if (afterDone) afterDone();
          else showToast(`落脚${CITIES[selCity].name.slice(0,4)}，开启职场新篇章！`);
        };
      };
      bindGrad();
    }
  });
}

function showYearEndV3(rep, afterDone) {
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
      : `<div style="display:flex;justify-content:center;"><button class="cta-main" id="y-ok" style="width:74%;max-width:236px;">迈入 ${state.age} 岁 →</button></div>`}
  `;

  if (isMilestone) {
    showV3Capture({
      compactViewfinder: true,
      badge: `${rep.age} 岁里程碑 · 年度决算`,
      title: `${rep.age} 岁这一年定格入册`,
      photoCaption: `${rep.age}岁里程碑定格`,
      bodyHtml: html,
      onDone: (host, finish) => {
        if (rep.canExtend) {
          host.querySelector('#y-ext').onclick = () => { state.extendedTo90 = true; finish(); if (afterDone) afterDone(); };
          host.querySelector('#y-end').onclick = () => { state.ended = true; state.endReason = '80 岁圆满收官'; finish(); };
        } else {
          host.querySelector('#y-ok').onclick = () => { finish(); if (afterDone) afterDone(); };
        }
      }
    });
  } else {
    mountOverlay(`<div class="sheet-modal"><div class="sheet-box">
      <span class="tag">${rep.age} 岁 · 年度决算单</span>
      <h3 style="margin:8px 0;">这一年的账单与收获</h3>
      ${html}
    </div></div>`, host => {
      host.querySelector('#y-ok').onclick = () => { clearOverlay(); render(); if (afterDone) afterDone(); };
    });
  }
}

// ===== Sprint 3 街角游艺厅总览 + 统一防刷奖励结算 + 追梦终局大考临场实操 =====
function recordArcadeGrade(gameId, grade) {
  ensureSprint1State(state);
  const rankOrder = { S: 4, A: 3, B: 2, C: 1 };
  const prev = state.arcadeBestGrades[gameId];
  if (!prev || (rankOrder[grade] || 0) > (rankOrder[prev] || 0)) {
    state.arcadeBestGrades[gameId] = grade;
  }
  let firstSTicket = false;
  if (grade === 'S' && !state.arcadeFirstS.includes(gameId)) {
    state.arcadeFirstS.push(gameId);
    state.hexRerollTickets = (state.hexRerollTickets || 0) + 1;
    firstSTicket = true;
  }
  return firstSTicket;
}

function launchArcadeGame(gameId, opts = {}) {
  ensureSprint1State(state);
  if (gameId === 'flip_card') return launchFlipGame(opts.onAfterDone);
  if (gameId === 'gomoku') return launchGomokuGame(opts.onAfterDone);

  const isClimax = Boolean(opts.climaxDream);
  const isQualifier = Boolean(opts.qualifierDream);
  const isPractice = !isClimax && !isQualifier && state.arcadePlayedThisTurn;
  const boost = hasHex(state, 'hx_arcade_pro') ? 1.4 : 1.0;

  mountOverlay(`<div class="sheet-modal"><div class="sheet-box" id="mg-box"></div></div>`, host => {
    const box = host.querySelector('#mg-box');
    const gameFnMap = {
      ring_toss: openRingTossGame,
      nostalgia_link: openNostalgiaLinkGame,
      bell_dash: openBellDashGame,
      work_slice: openWorkSliceGame,
      red_packet_rain: openRedPacketRainGame,
      lake_fishing: openLakeFishingGame
    };
    const runner = gameFnMap[gameId] || openRingTossGame;
    runner(
      box,
      state,
      {
        climaxDreamId: opts.climaxDream?.id || null,
        qualifierDreamId: opts.qualifierDream?.id || null
      },
      res => {
        const grade = res.grade || 'B';
        const firstSTicket = recordArcadeGrade(gameId, grade);

        // 一次性珍稀旧物信物（套圈铁皮青蛙 / 湖畔老怀表）套中即可入驻多宝格
        let keepsakeNote = '';
        if (res.keepsake && !state.items.includes(res.keepsake.name)) {
          addKeepsakeWithStory(state, res.keepsake.name, res.keepsake.story, res.keepsake.buff);
          keepsakeNote = ` · 信物「${res.keepsake.name}」已收入多宝格！`;
        }

        // 追梦中期晋级 / 执业医考实操结算
        if (isQualifier) {
          const { id } = opts.qualifierDream;
          const qRes = settleDreamQualifier(state, id, grade);
          saveAutoProgress();
          clearOverlay();
          render();
          showToast(`${qRes.msg}${firstSTicket ? ' · 首通 S 奖重随券 +1！' : ''}`);
          if (opts.onAfterDone) opts.onAfterDone();
          return;
        }

        // 追梦终局大考临场实操模式：按 S/A/B/C 直接折算为 +18/+14/+10/+8 临场决胜分
        if (isClimax) {
          const { id, nearTxt } = opts.climaxDream;
          const liveBonus = grade === 'S' ? 18 : grade === 'A' ? 14 : grade === 'B' ? 10 : 8;
          const climaxRes = settleDreamClimax(state, id, liveBonus, nearTxt, true);
          saveAutoProgress();
          clearOverlay();
          render();
          showToast(`临场发挥 ${grade} 级 (+${liveBonus}分) · ${climaxRes.msg}${firstSTicket ? ' · 首通 S 奖重随券 +1！' : ''}`);
          if (opts.onAfterDone) opts.onAfterDone();
          return;
        }

        // 阶段自动跳出的生活小游戏结算
        let extraTail = '';
        if (!isPractice) {
          state.arcadePlayedThisTurn = true;
          if (gameId === 'ring_toss') state.flipGameThisYear++;
          const cashGain = Math.round((res.cash || 0) * boost);
          const moodGain = (res.mood || 0) + (hasHex(state, 'hx_arcade_pro') ? 2 : 0);
          state.cash += cashGain;
          state.stats.mood = clamp(state.stats.mood + moodGain);
          if (res.know) state.stats.knowledge = clamp(state.stats.knowledge + res.know);
          if (res.pro) state.stats.pro = clamp(state.stats.pro + res.pro);
          if (res.health) state.stats.health = clamp(state.stats.health + res.health);
          if (res.fatigueDelta) state.stats.fatigue = clamp(state.stats.fatigue + res.fatigueDelta);
          if (res.familyInt) state.relations.parents.intimacy = clamp(state.relations.parents.intimacy + res.familyInt);
          if (res.bonusSnackCard) {
            const unowned = TUCK_CARDS_12.filter(c => !state.snackCards.includes(c));
            if (unowned.length) {
              const pick = unowned[Math.floor(Math.random() * unowned.length)];
              state.snackCards.push(pick);
              extraTail += ` · 赠水浒卡「${pick.slice(3)}」`;
            }
          }
        }

        if (firstSTicket) extraTail += ' · 首通 S 奖命运重随券 +1！';
        saveAutoProgress();
        clearOverlay();
        render();
        showToast(`${res.note}${keepsakeNote}${extraTail}`);
        if (opts.onAfterDone) opts.onAfterDone();
      }
    );
  });
}

// 到了对应人生阶段自动弹出的拍立得生活奇遇小游戏入口卡（无需玩家去菜单里找）
function showStageArcadePopup(moment, afterDone) {
  showV3Capture({
    storyMode: true,
    badge: moment.badge,
    title: moment.title,
    photoCaption: null,
    bodyHtml: `
      <div class="story-paper">${moment.summary}</div>
      <div class="story-choices">
        <button class="story-choice hex-res-choice" id="sa-go">
          <div class="sc-top">
            <span class="sc-main">${moment.playLabel.split('（')[0]}</span>
            <span class="gold-badge">${pxIcon('gamepad', 11)} 阶段触发</span>
          </div>
          ${moment.playLabel.includes('（') ? `<div class="sc-sub">${moment.playLabel.split('（')[1].replace('）', '')}</div>` : ''}
        </button>
        <button class="story-choice" id="sa-pass">
          <div class="sc-top"><span class="sc-main">${moment.passLabel.split('（')[0]}</span></div>
          ${moment.passLabel.includes('（') ? `<div class="sc-sub">${moment.passLabel.split('（')[1].replace('）', '')}</div>` : ''}
        </button>
      </div>
    `,
    onDone: (host, finish) => {
      host.querySelector('#sa-go').onclick = () => {
        finish();
        launchArcadeGame(moment.gameId, { onAfterDone: afterDone });
      };
      host.querySelector('#sa-pass').onclick = () => {
        const pe = moment.passEff || {};
        if (pe.mood) state.stats.mood = clamp(state.stats.mood + pe.mood);
        if (pe.health) state.stats.health = clamp(state.stats.health + pe.health);
        if (pe.knowledge) state.stats.knowledge = clamp(state.stats.knowledge + pe.knowledge);
        if (pe.cash) state.cash += pe.cash;
        saveAutoProgress();
        finish();
        if (afterDone) afterDone();
      };
    }
  });
}

// ===== 重大决策与 P0 小游戏底部抽屉 =====
function launchFlipGame(onAfterDone) {
  state.flipGameThisYear++;
  const isPractice = state.arcadePlayedThisTurn;
  const boost = hasHex(state, 'hx_arcade_pro') ? 1.4 : 1.0;
  mountOverlay(`<div class="sheet-modal"><div class="sheet-box" id="mg-box"></div></div>`, host => {
    openFlipCardGame(host.querySelector('#mg-box'), state, res => {
      const grade = res.grade || ((res.count || 0) >= 4 ? 'S' : 'B');
      const firstS = recordArcadeGrade('flip_card', grade);
      if (!isPractice) {
        state.arcadePlayedThisTurn = true;
        const cashGain = Math.round((res.cash || 0) * boost);
        const moodGain = (res.mood || 0) + (hasHex(state, 'hx_arcade_pro') ? 2 : 0);
        state.cash += cashGain;
        state.stats.mood = clamp(state.stats.mood + moodGain);
        state.stats.knowledge = clamp(state.stats.knowledge + (res.know || 0));
      }
      const ticketNote = firstS ? ' · 首通 S 奖命运重随券 +1！' : '';
      saveAutoProgress();
      clearOverlay(); render();
      showToast(`翻卡博弈：${res.note}${ticketNote}`);
      if (onAfterDone) onAfterDone();
    });
  });
}

function launchHomePuzzle() {
  mountOverlay(`<div class="sheet-modal"><div class="sheet-box" id="mg-box"></div></div>`, host => {
    openHomePuzzleGame(host.querySelector('#mg-box'), state, res => {
      if (state.house) state.house.buffActive = res.buffActive;
      state.stats.mood = clamp(state.stats.mood + (res.mood || 0) + (hasHex(state, 'hx_arcade_pro') ? 2 : 0));
      let ticketNote = '';
      if ((res.score || 0) >= 14 && !state.arcadeFirstS.includes('home_puzzle')) {
        state.arcadeFirstS.push('home_puzzle');
        state.hexRerollTickets = (state.hexRerollTickets || 0) + 1;
        ticketNote = ' · 完美布局奖重随券 +1！';
      }
      saveAutoProgress();
      clearOverlay(); render();
      showToast(`空间拼图：${res.note}${ticketNote}`);
    });
  });
}

function launchGomokuGame(onAfterDone) {
  const isPractice = state.arcadePlayedThisTurn;
  mountOverlay(`<div class="sheet-modal"><div class="sheet-box" id="mg-box"></div></div>`, host => {
    openGomokuGame(host.querySelector('#mg-box'), state, res => {
      const firstS = recordArcadeGrade('gomoku', res.grade || 'B');
      if (!isPractice) {
        state.arcadePlayedThisTurn = true;
        state.stats.mood = clamp(state.stats.mood + (res.mood || 0) + (hasHex(state, 'hx_arcade_pro') ? 2 : 0));
        state.relations.friend.intimacy = clamp(state.relations.friend.intimacy + (res.intimacy || 0));
      }
      if (res.antiScam && !state.experiences.includes('exp_anti_scam')) state.experiences.push('exp_anti_scam');
      saveAutoProgress();
      clearOverlay(); render();
      showToast(`石桌五子棋：${res.note}${firstS ? ' · 首通 S 奖命运重随券 +1！' : ''}`);
      if (onAfterDone) onAfterDone();
    });
  });
}

// ===== 童年「校门口小卖部」手账弹窗 =====
function openTuckShopSheet() {
  ensureSprint1State(state);
  const disc = getBondTier(state, 'wealth') >= 2 ? 0.9 : 1.0;
  const packPrice = Math.round(15 * disc);

  const renderTuck = () => {
    const ownedCards = state.snackCards || [];
    mountOverlay(`<div class="sheet-modal"><div class="sheet-box" style="max-height:84%;display:flex;flex-direction:column;">
      <div class="sec-head-row" style="margin-bottom:6px;">
        <span class="sec-title">${pxIcon('shop', 17)} 校门口小卖部</span>
        <span class="tag up">零花 ¥${fmtMoney(state.cash)}</span>
      </div>
      <div style="flex:1;overflow-y:auto;min-height:0;">
        <div class="mg-stats" style="margin-bottom:6px;">
          <b>干脆面水浒卡 (${ownedCards.length}/12)</b> · 集齐 4/8/12 张送现金 + 命运重随券！
        </div>
        <div style="display:flex;gap:6px;margin-bottom:6px;">
          <button class="pill-btn soft" id="tk-ring" style="flex:1;">${pxIcon('ring', 14)} 门口套圈摊</button>
          <button class="pill-btn soft" id="tk-link" style="flex:1;">${pxIcon('gamepad', 14)} 零食连连看</button>
        </div>
        <button class="btn primary" id="tk-draw" style="width:100%;margin-bottom:4px;">${pxIcon('snack', 15)} 买包干脆面拆水浒卡 (-¥${packPrice} · 心态+1)</button>
        <div class="tuck-card-grid">
          ${TUCK_CARDS_12.map(c => {
            const has = ownedCards.includes(c);
            return `<div class="tuck-card-chip ${has ? 'owned' : ''}">${has ? c.slice(3) : c.slice(0, 2) + ' ???'}</div>`;
          }).join('')}
        </div>

        <div class="sec-head-row" style="margin:6px 0 2px;">
          <span class="sec-title" style="font-size:13px;">${pxIcon('gift', 15)} 怀旧小物件（入驻木格旧物盒）</span>
        </div>
        <div class="tuck-goods-grid">
          ${TUCK_GOODS.map(g => {
            const owned = state.items.includes(g.item);
            const p = Math.round(g.cost * disc);
            return `<button class="tuck-good-btn" data-tg="${g.id}" ${owned ? 'disabled' : ''}>
              <div class="tuck-good-top"><span>${pxIcon(g.ico, 14)} ${g.name}</span><span style="color:var(--accent);">${owned ? '已珍藏' : `¥${p}`}</span></div>
              <div class="tuck-good-desc">${g.desc}</div>
            </button>`;
          }).join('')}
        </div>

        <div class="sec-head-row" style="margin:6px 0 4px;">
          <span class="sec-title" style="font-size:13px;">${pxIcon('heart', 15)} 买小零食送亲友（每季限 1 次 · ¥30）</span>
        </div>
        <div style="display:flex;gap:6px;">
          <button class="pill-btn soft" id="tk-gf" style="flex:1;" ${state.tuckGiftThisTurn ? 'disabled' : ''}>请同桌吃零食 (+4亲密)</button>
          <button class="pill-btn soft" id="tk-gp" style="flex:1;" ${state.tuckGiftThisTurn ? 'disabled' : ''}>给爸妈买板栗 (+4亲密)</button>
        </div>
      </div>
      <div class="mg-actions" style="margin-top:8px;"><button class="btn ghost" id="tk-close" style="width:100%;">背上书包回家</button></div>
    </div></div>`, host => {
      host.querySelector('#tk-close').onclick = () => { clearOverlay(); render(); };
      host.querySelector('#tk-ring').onclick = () => { clearOverlay(); launchArcadeGame('ring_toss'); };
      host.querySelector('#tk-link').onclick = () => { clearOverlay(); launchArcadeGame('nostalgia_link'); };
      host.querySelector('#tk-draw').onclick = () => {
        const res = drawSnackCard(state);
        saveAutoProgress();
        renderTuck();
        showToast(res.msg);
      };
      host.querySelectorAll('[data-tg]').forEach(b => {
        b.onclick = () => {
          const res = buyTuckGood(state, b.dataset.tg);
          saveAutoProgress();
          renderTuck();
          showToast(res.msg);
        };
      });
      host.querySelector('#tk-gf').onclick = () => {
        const res = buyTuckGift(state, 'friend');
        saveAutoProgress();
        renderTuck();
        showToast(res.msg);
      };
      host.querySelector('#tk-gp').onclick = () => {
        const res = buyTuckGift(state, 'parents');
        saveAutoProgress();
        renderTuck();
        showToast(res.msg);
      };
    });
  };
  renderTuck();
}

// ===== 成年「周末实景看房手账」（动态 3 套特色房源 + 中介换批）=====
function openHouseSheet() {
  const city = CITIES[state.cityTier];
  const freeSellTax = hasHex(state, 'hx_bargain_hunter') || hasHex(state, 'hx_shop_3') || getBondTier(state, 'wealth') >= 4;

  const renderListings = (forceReroll = false) => {
    const listings = getOrRollHouseListings(state, forceReroll);
    mountOverlay(`<div class="sheet-modal"><div class="sheet-box" style="max-height:84%;display:flex;flex-direction:column;">
      <div class="sec-head-row" style="margin-bottom:6px;">
        <span class="sec-title">${pxIcon('key', 17)} 周末实景看房（${city.name.slice(0,4)}）</span>
        <span class="tag up">可用 ¥${fmtMoney(state.cash)}</span>
      </div>
      <div style="flex:1;overflow-y:auto;min-height:0;">
        ${state.house ? `<div class="mg-stats" style="margin-bottom:8px;">当前：<b>${state.house.name}</b> · 估值 ¥${fmtMoney(state.house.value)} · 余贷 ¥${fmtMoney(state.house.loan)}<br/><button class="btn secondary" id="sell-h" style="margin-top:6px;">卖出当前房 (${freeSellTax ? '海克斯免税!' : '扣2%税费'})</button></div>` : ''}
        <p class="mg-tip" style="margin:0 0 7px;">本季实景看房刷出 3 套特色房源（父母可支援首付 ¥${fmtMoney(state.parentSupportLeft)}）：</p>
        <div style="display:flex;flex-direction:column;gap:8px;">
          ${listings.map((h, i) => `
            <button class="listing-card ${h.trait === 'bargain' ? 'bargain' : ''}" data-buy-idx="${i}" ${state.house ? 'disabled' : ''}>
              <div class="listing-top">
                <span class="listing-badge">${h.badge} · ${h.grid}×${h.grid}网格</span>
                <span class="listing-price">¥${fmtMoney(h.price)}</span>
              </div>
              <div class="listing-name">${h.name}</div>
              <div class="listing-perk">★ ${h.perk}</div>
              <div class="listing-sub">首付 ¥${fmtMoney(h.dp)}${h.pbCut > 0 ? `（存钱罐直减 ¥${h.pbCut.toLocaleString()}）` : ''} · 月供 ¥${monthlyPmt(h.price - h.dp).toLocaleString()}</div>
            </button>
          `).join('')}
        </div>
      </div>
      <div class="mg-actions" style="margin-top:8px;display:flex;gap:8px;">
        ${!state.house ? `<button class="btn secondary" id="h-reroll" style="flex:1;">换一批房源 (-¥200)</button>` : ''}
        <button class="btn ghost" id="c" style="flex:${state.house ? '1' : '0 0 90px'};">收起</button>
      </div>
    </div></div>`, host => {
      host.querySelector('#c').onclick = () => { clearOverlay(); render(); };
      const rr = host.querySelector('#h-reroll');
      if (rr) rr.onclick = () => {
        if (state.cash < 200) return showToast('现金不足 ¥200 看房交通费');
        state.cash -= 200;
        saveAutoProgress();
        renderListings(true);
        showToast('中介带你又看了 3 套新房源！');
      };
      const sell = host.querySelector('#sell-h');
      if (sell) sell.onclick = () => {
        const net = Math.round(state.house.value * (freeSellTax ? 1.0 : 0.98)) - state.house.loan;
        if (state.cash + net < 0) return showToast('现金不足以补齐余贷差额');
        state.cash += net; state.house = null; clearOverlay(); render(); showToast(`卖房落袋 ¥${fmtMoney(net)}`);
      };
      host.querySelectorAll('[data-buy-idx]').forEach(b => {
        b.onclick = () => {
          const h = listings[Number(b.dataset.buyIdx)];
          const sup = Math.min(state.parentSupportLeft, Math.max(0, h.dp - state.cash));
          if (state.cash + sup < h.dp) return showToast(`资金不足，需首付 ¥${fmtMoney(h.dp)}`);
          state.parentSupportLeft -= sup; state.cash -= (h.dp - sup);
          state.house = {
            id: h.id, tier: h.tier, name: h.name, trait: h.trait,
            value: h.price, basePrice: h.price, loan: h.price - h.dp,
            pmtMo: monthlyPmt(h.price - h.dp), grid: h.grid, buffActive: false
          };
          state.albumPhotos.push({ age: state.age, stamp: getDateStamp(state.age, state.subTurn), title: `购入「${h.name}」安家`, stageIdx: getSubStageIndex(state.age), bg: getBgKey(state.age) });
          clearOverlay(); launchHomePuzzle();
        };
      });
    });
  };
  renderListings(false);
}

function openGoldSheet() {
  const noFee = hasHex(state, 'hx_shop_3') || getBondTier(state, 'wealth') >= 4;
  const buyMult = noFee ? 1.0 : 1.01;
  const sellMult = noFee ? 1.0 : 0.99;
  const hand = Math.round(state.goldPrice * 10 * buyMult);
  mountOverlay(`<div class="sheet-modal"><div class="sheet-box">
    <h3 style="margin:0 0 8px;display:flex;align-items:center;gap:6px;">${pxIcon('gold', 17)} 黄金避险 (${state.goldPrice} 元/克${noFee ? ' · 免手续费' : ''})</h3>
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
      const cost = Math.round(state.goldPrice * g * buyMult);
      if (state.cash < cost) return showToast('可用现金不足');
      const prevVal = (state.goldGrams || 0) * (state.goldAvgCost || state.goldPrice);
      state.cash -= cost;
      state.goldGrams += g;
      state.goldAvgCost = Math.round((prevVal + cost) / state.goldGrams);
      clearOverlay(); render(); showToast(`买入黄金 ${g} 克`);
    };
    host.querySelector('#gb10').onclick = () => buy(10);
    host.querySelector('#gb100').onclick = () => buy(100);
    host.querySelector('#gsall').onclick = () => {
      const earn = Math.round(state.goldGrams * state.goldPrice * sellMult);
      state.cash += earn; state.goldGrams = 0; clearOverlay(); render(); showToast(`卖出黄金落袋 ${fmtMoney(earn)}`);
    };
  });
}

function handleLottery() {
  if (state.cash < 20) return showToast('现金不足 20 元');
  state.cash -= 20; state.stats.mood = clamp(state.stats.mood + 1); state.lotteryThisTurn = true;
  const koi = ((state.talent.id === 't_koi' || state.talent.id === 't_koi2') ? 10 : 1) * (hasHex(state, 'hx_koi_god') ? 20 : 1) * (getBondTier(state, 'luck') >= 4 ? 5 : 1);
  const r = Math.random();
  if (r < (1 / 500000) * koi) { state.cash += 4000000; showToast('万中无一头奖！税后 400 万到账！'); }
  else if (r < 0.0005 * (hasHex(state, 'hx_koi_god') ? 4 : 1)) { state.cash += 3000; showToast('彩票中三等奖 3,000 元！'); }
  else if (r < 0.0055 * (getBondTier(state, 'luck') >= 2 ? 2 : 1)) { state.cash += 200; showToast('彩票中 200 元小奖！'); }
  else if (r < 0.0555 || getBondTier(state, 'luck') >= 4) { state.cash += 20; showToast('保底回本 20 元，心态 +1'); }
  else showToast('谢谢惠顾！花 20 块买了个晚上的白日梦（心态 +1）');
}

function openEmoSheet() {
  if (hasHex(state, 'hx_minimalist')) {
    return showToast('受「极简生活」约束不能用情绪消费（已为你省下 18% 杂费并多给排程格！）');
  }
  const half = state.emoBuyThisYear >= 1;
  mountOverlay(`<div class="sheet-modal"><div class="sheet-box">
    <h3 style="margin:0 0 6px;display:flex;align-items:center;gap:6px;">${pxIcon('gift', 17)} 情绪买单</h3>
    <p class="mg-tip">${half ? '提示：本年已用过一次，本次效果减半' : '用现金即时换取心态回暖与减压（每季限 1 次）'}</p>
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
        clearOverlay(); render(); showToast('奖励了自己一下，心情舒畅多了！');
      };
    });
  });
}

function handlePromo() {
  const nextL = state.jobLevel + 1;
  const effPro = state.stats.pro + (hasHex(state, 'hx_duo_passion') ? Math.floor((state.dreamSkill || 0) * 0.5) : 0);
  const exemptProj = getBondTier(state, 'scholar') >= 4;
  if (effPro < PROMO_REQ[nextL] || (!exemptProj && state.projectCount < nextL - 1)) {
    return showToast(`晋升 L${nextL} 需专业≥${PROMO_REQ[nextL]}${exemptProj ? '' : ` 且项目经历≥${nextL - 1}`}`);
  }
  state.jobLevel = nextL; state.yearsInLevel = 0; state.stats.mood = clamp(state.stats.mood + 6);
  showToast(`成功晋升至 L${nextL}！薪资台阶跃迁！`);
}

function openLoveSheet() {
  mountOverlay(`<div class="sheet-modal"><div class="sheet-box">
    <h3 style="margin:0 0 8px;display:flex;align-items:center;gap:6px;">${pxIcon('heart', 17)} 结识伴侣（3 档背景可见）</h3>
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
        clearOverlay(); render(); showToast(`开启恋爱线：${sp.name}`);
      };
    });
  });
}

function openMarrySheet() {
  const p = state.relations.partner;
  if (p.intimacy < 60) return showToast(`谈婚论嫁需伴侣亲密 ≥60（当前 ${p.intimacy}）`);
  mountOverlay(`<div class="sheet-modal"><div class="sheet-box">
    <h3 style="margin:0 0 8px;display:flex;align-items:center;gap:6px;">${pxIcon('heart', 17)} 谈婚论嫁（开启双收入合账）</h3>
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
        clearOverlay(); render(); showToast('恭喜成家！开启双收入合账');
      };
    });
  });
}

function openKidSheet() {
  mountOverlay(`<div class="sheet-modal"><div class="sheet-box">
    <h3 style="margin:0 0 8px;display:flex;align-items:center;gap:6px;">${pxIcon('baby', 17)} 生娃 / 自主丁克抉择</h3>
    <div style="display:flex;flex-direction:column;gap:7px;">
      <button class="action-card" data-k="25000"><div class="ac-top"><span>生娃 · 刚需穷养</span><span>2.5万/年</span></div></button>
      <button class="action-card" data-k="50000"><div class="ac-top"><span>生娃 · 中产常规</span><span>5万/年</span></div></button>
      <button class="action-card" data-k="100000"><div class="ac-top"><span>生娃 · 鸡娃精养</span><span>10万/年</span></div></button>
      <button class="action-card" id="k-dink"><div class="ac-top"><span>选择丁克二人世界</span><span>自由独立全满贯</span></div></button>
    </div>
    <div class="mg-actions"><button class="btn ghost" id="c">暂缓</button></div>
  </div></div>`, host => {
    host.querySelector('#c').onclick = clearOverlay;
    host.querySelector('#k-dink').onclick = () => { state.choseDink = true; clearOverlay(); render(); showToast('选择自由丁克人生！'); };
    host.querySelectorAll('[data-k]').forEach(b => {
      b.onclick = () => {
        state.child = { bornAge: state.age, tierCost: Number(b.dataset.k), study: 20, mood: 75, bond: 65 };
        state.albumPhotos.push({ age: state.age, stamp: getDateStamp(state.age, state.subTurn), title: '迎来家庭新成员', stageIdx: getSubStageIndex(state.age), bg: getBgKey(state.age) });
        clearOverlay(); render(); showToast('新生命降临！解锁孩子成长档案卡');
      };
    });
  });
}

function openCitySheet() {
  mountOverlay(`<div class="sheet-modal"><div class="sheet-box">
    <h3 style="margin:0 0 8px;display:flex;align-items:center;gap:6px;">${pxIcon('trip', 17)} 中途换城</h3>
    <div style="display:flex;flex-direction:column;gap:7px;">
      ${[1,2,3].map(t => `<button class="action-card" data-ct="${t}" ${state.cityTier===t?'disabled':''}>
        <div class="ac-top"><span>${CITIES[t].name}</span><span>×${CITIES[t].salaryCoef}</span></div>
      </button>`).join('')}
    </div>
    <div class="mg-actions"><button class="btn ghost" id="c">取消</button></div>
  </div></div>`, host => {
    host.querySelector('#c').onclick = clearOverlay;
    host.querySelectorAll('[data-ct]').forEach(b => {
      b.onclick = () => { state.cityTier = Number(b.dataset.ct); clearOverlay(); render(); showToast(`迁居至${CITIES[state.cityTier].name.slice(0,4)}`); };
    });
  });
}

// 独立「时代简报」手账剪报弹窗
function openEraNewspaper() {
  const era = getCurrentEra(state);
  const stamp = getDateStamp(state.age, state.subTurn);
  const houseWord = era.houseTrend === 'hot' ? '强势上涨（早买房吃满增值）' : era.houseTrend === 'up' ? '温和回暖' : era.houseTrend === 'down' ? '回调横盘（慎追高）' : '整体平稳';
  const goldWord = era.goldTrend === 'hot' ? '避险大涨（囤金黄金窗口）' : era.goldTrend === 'up' ? '稳步走高' : '区间震荡';
  mountOverlay(`<div class="sheet-modal"><div class="sheet-box">
    <div class="newspaper-box">
      <div class="newspaper-head">
        <b style="font-size:16px;display:flex;align-items:center;gap:6px;">${pxIcon('news', 16)} 时代简报 · ${era.name}</b>
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
      const saved = ensureSprint1State(JSON.parse(state.branches[a]));
      saved.branches = state.branches; saved.ended = false;
      state = saved; draft = []; inspectedId = null; moreMenuOpen = false; activeTab = 'home';
      saveAutoProgress();
      render();
    };
  });
  appEl.querySelector('#btn-restart').onclick = () => {
    clearAutoSave();
    state = null; introStep = 0; rerollUsed = false;
    pickedOrigin = rollOrigin(); pickedTalent = pickedOrigin.talents[0].id;
    renderIntro();
  };
  clearAutoSave();
}

initSpritesAndRender();
