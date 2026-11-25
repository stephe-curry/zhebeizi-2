// 《这辈子 2.0》U6 + Sprint 1：微信小程序 9:16 竖屏高保真可交互原型
// 核心架构：V4 整屏拍立得 ⇄ V5 撕纸贴纸盘(Combo+季节限定) ⇄ 1.8s过场剧场 ⇄ 命运海克斯 2.0 ⇄ V3 定格
import {
  ORIGINS, CITIES, TRACKS, UNIVERSITIES, DREAMS, SPOUSE_BACKGROUNDS, PROMO_REQ
} from './data.js?v=s70';
import {
  clamp, monthlyPmt, getSubStage, getSubStageIndex, getDateStamp, getMacroParams,
  createInitialState, ensureSprint1State, getEffectiveFatigueLimit, getPendingHextechAge,
  getCurrentEra, getNextYearHint, getCurrentMonthlySalary,
  getTurnSlotBudget, getAvailableActions, previewDraft, executeTurn, getNetWorth, evaluateEnding
} from './engine.js?v=s70';
import {
  HEX_NODES, HEX_NODE_META, HEX_BONDS, HEX_CARD_MAP, hasHex, getHexInstance,
  getHexBondCounts, getBondTier, getNewBondTriggersForCard,
  rollHextechOffer, pickSingleHextechCard, applyHextechPick
} from './hextech.js?v=s70';
import {
  SCHEDULE_COMBOS, detectCombos, getComboPartnerIds, getActionAnimSpec
} from './combos.js?v=s70';
import {
  applyEventChoiceEffects
} from './events.js?v=s70';
import {
  getPetLifeStage, interactWithPet, getOrRollStageHotspot, claimStageHotspot,
  TUCK_CARDS_12, TUCK_GOODS, drawSnackCard, buyTuckGood, buyTuckGift,
  getOrRollHouseListings
} from './lifeFeatures.js?v=s70';
import {
  applyGracefulPivot, DREAM_CATALOG, rollDreamLifecycleEvent,
  settleDreamQualifier, settleDreamClimax, addKeepsakeWithStory
} from './dreams.js?v=s70';
import {
  triggerHaptic, playComboCollisionVfx, openHextechV4Modal,
  renderNewAssetsTab, bindNewAssetsInteractions, renderDreamJournalSection
} from './vfxAndUi.js?v=s70';
import { openFlipCardGame, openHomePuzzleGame, openGomokuGame } from './minigames.js?v=s70';
import {
  rollStageArcadeMoment, openRingTossGame, openNostalgiaLinkGame, openBellDashGame,
  openWorkSliceGame, openRedPacketRainGame, openLakeFishingGame
} from './arcadeGames.js?v=s70';
import { buildEventVignetteHtml, formatNarrativeChoiceV3 } from './eventViewerV3.js?v=s70';
import { openTuckShopV2, openCardSlapModal } from './tuckShopV2.js?v=s70';
import { openRhythmMasterGame, openSpotBugGame, openSpotDiffGame } from './boutiqueGames.js?v=s70';
import {
  SUBJECT_META, getSelectableSubjects, getStageTextbookCap, getLifeStageCompass,
  getStudentExamPreview, rollOrGetExamResult, CHILD_POLICIES,
  ensureChildExamProfile, getChildExamPreviewSummary
} from './examSystem.js?v=s70';
import { loadCharacterSprites, getBubbleUrl } from './spriteLoader.js?v=s70';
import { pxIcon, chevDownIcon, lineNavIcon } from './icons.js?v=s70';
import { getHudDualProgressBars, computeWishbookData, openWishbookModal } from './wishbook.js?v=s70';
import { openSportsDayTournament } from './sportsDay.js?v=s70';
import {
  ensureRomanceState, getCandidatePoolForAge, openRomanceHubModal,
  playerBreakupPartner
} from './romanceSystem.js?v=s70';

const appEl = document.getElementById('app');

let state = null;
let sprites = { male: null, female: null };
let activeTab = 'home'; // 'home' | 'assets' | 'social' | 'album'
let memorialPreviewMode = false; // P0-05：预览纪念册仅只读，绝不结案或清档
let drawerOpen = false;
let drawerCat = 'all'; // 排程抽屉分类过滤：all | study | life | social | seasonal
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
    return { text: `平衡职级（L${s.jobLevel}）、伴侣好感度与健康，稳渡中年风浪`, pct: null, label: '' };
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
  const selSubj = SUBJECT_META[s.selectedSubject || 'chn'] || SUBJECT_META.chn;
  const kf = s.tutorKidFocus || 'balanced';
  const kfShort = kf === 'lit' ? '辅导文科' : kf === 'num' ? '辅导理科' : '辅导功课';
  const map = {
    study_lit:         { ico: 'study',    short: '文科阅读' },
    study_num:         { ico: 'bulb',     short: '数理解题' },
    study_self:        { ico: selSubj.ico || 'study', short: selSubj.short },
    study_tutor:       { ico: 'tutor',    short: '课外补习' },
    gaokao_sprint:     { ico: 'sprint',   short: '考前刷卷' },
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
    tutor_kid:         { ico: 'study',    short: kfShort },
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
    if (s.age >= 15 && s.age <= 18 && has('gaokao_sprint')) rec.gaokao_sprint = '冲刺';
    else if (s.age <= 18) {
      const litLow = (s.stats.knowledge || 0) <= (s.stats.numLogic || 0);
      if (litLow && has('study_lit')) rec.study_lit = '补短板';
      else if (has('study_num')) rec.study_num = '补短板';
    }
    else if (s.age >= 19 && s.age <= 50 && !s.house && has('pro_course')) rec.pro_course = '提薪';
    else if (s.age >= 60 && !s.elderCircle && !(s.relations.partner?.married) && has('square_dance')) rec.square_dance = '抗孤独';
    else if (s.age >= 60 && s.worldTrips < 1 && s.cash >= 50000 && has('world_trip')) rec.world_trip = '心愿';
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
    ? ['study_lit', 'study_num', 'accompany_friend', activeDreamAct, 'accompany_parents', 'exercise'].filter(Boolean)
    : s.age <= 18
      ? ['study_lit', 'study_num', 'gaokao_sprint', activeDreamAct, 'accompany_friend', 'rest'].filter(Boolean)
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
        playComboCollisionVfx(firstNew || combos[0], Boolean(firstNew), getAvailableActions(state), getActionMeta, state, res.stepBeats.map(x => x.id));
        theaterState.timer = setTimeout(() => {
          stopTheater(false);
          floatPops = [];
          render();
          onFinish();
        }, firstNew ? 1120 : 880);
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
    } else if (preset === 'eventv3') {
      const s = createInitialState('welloff', 't_book', 'male');
      s.age = 6; s.subTurn = 2; s.totalTurns = 2; s.hexTriggeredAges = [6];
      state = s;
      activeTab = 'home';
    } else if (preset === 'tuckv2') {
      const s = createInitialState('welloff', 't_book', 'male');
      s.age = 8; s.subTurn = 2; s.totalTurns = 6; s.cash = 2480;
      s.snackCards = ['01 及时雨·宋江', '02 行者·武松', '04 花和尚·鲁智深'];
      s.dupSnackCards = 2;
      s.hexTriggeredAges = [6];
      state = s;
      activeTab = 'home';
    } else if (preset === 'gamesv4') {
      const s = createInitialState('welloff', 't_book', 'male');
      s.age = 12; s.subTurn = 2; s.totalTurns = 14; s.hexTriggeredAges = [6, 12];
      state = s;
      activeTab = 'home';
    } else if (preset === 'v5home') {
      const s = createInitialState('teacher', 't_shelf', 'male');
      s.age = 8; s.subTurn = 2; s.totalTurns = 5; s.cash = 3188;
      s.stats.expr = 26; s.stats.health = 93; s.stats.mood = 100;
      s.hexTriggeredAges = [6];
      state = s;
      activeTab = 'home';
    } else if (preset === 'slapv2') {
      const s = createInitialState('merchant', 't_shopkid', 'male');
      s.age = 9; s.subTurn = 2; s.totalTurns = 8; s.cash = 1680;
      s.snackCards = ['01 及时雨·宋江', '02 行者·武松', '04 花和尚·鲁智深'];
      s.dupSnackCards = 3;
      s.hexTriggeredAges = [6];
      state = s;
      activeTab = 'home';
    } else if (preset === 'exam18') {
      const s = createInitialState('poor', 't_grit', 'male');
      s.age = 18; s.subTurn = 2; s.totalTurns = 37;
      s.stats.knowledge = 86; s.stats.numLogic = 96;
      s.statsRaw = { knowledge: 86, numLogic: 96 };
      s.subjects = { chn: 88, math: 98, eng: 86, art: 42, sci: 98 };
      s.examTrack = 'sci'; s.schoolTier = 'key_high';
      s.experiences.push('exp_gaokao_sprint');
      s.hexTriggeredAges = [6, 12, 18];
      state = s;
      activeTab = 'home';
    } else if (preset === 's7home' || preset === 's7drawer') {
      const s = createInitialState('teacher', 't_shelf', 'male');
      s.age = 16; s.subTurn = 2; s.totalTurns = 30; s.cash = 9809;
      s.stats.health = 100; s.stats.mood = 100;
      s.stats.knowledge = 88; s.stats.numLogic = 96;
      s.schoolTier = 'key_high';
      s.hexCards = [{ id: 'hx_study_1', acquiredAge: 6, stacks: 0 }, { id: 'hx_time_master', acquiredAge: 12, stacks: 0 }];
      s.hexTriggeredAges = [6, 12];
      s.lastDraft = ['study_lit', 'study_num', 'exercise', 'rest'];
      state = s;
      activeTab = 'home';
      if (preset === 's7drawer') {
        drawerOpen = true;
        draft = ['gaokao_sprint', 'chores'];
      }
    } else if (preset === 's7sports') {
      const g = params.get('g') === 'female' ? 'female' : 'male';
      const s = createInitialState('welloff', 't_book', g);
      s.age = 14; s.subTurn = 2; s.totalTurns = 24; s.hexTriggeredAges = [6, 12];
      state = s;
      activeTab = 'home';
    }
  } catch (_) {}
  render();
  if (window.location.search.includes('preset=s7sports')) {
    const p = new URLSearchParams(window.location.search);
    const evt = p.get('evt') || '';
    const rnd = Number(p.get('rnd') || 0);
    setTimeout(() => openSportsDayTournament(state, mountOverlay, clearOverlay, () => render(), evt ? { autoEventId: evt, autoRoundIdx: rnd } : {}), 120);
  } else if (window.location.search.includes('preset=arcade')) {
    const m = rollStageArcadeMoment(state, []);
    if (m) setTimeout(() => showStageArcadePopup(m), 120);
  } else if (window.location.search.includes('preset=qual')) {
    const ev = rollDreamLifecycleEvent(state, ['dr_singer']);
    if (ev) setTimeout(() => showApprovedEventV3(ev, () => render(), { isMidTurn: true }), 120);
  } else if (window.location.search.includes('preset=eventv3')) {
    setTimeout(() => showApprovedEventV3({
      id: 'ev_demo_blackout',
      title: '夏夜小区突然全楼停电',
      summary: '台灯啪地熄灭，整栋楼忽然暗下来，窗外院子里爆发出孩子们的欢呼与蝉鸣声。',
      choices: [
        { label: '点起白蜡烛，啃完最后两道题（学识 +2，心态 -1）', effects: { knowledge: 2, mood: -1 } },
        { label: '跟爸妈摇着蒲扇上天台看星星（父母亲密 +4，心态 +4，疲劳 -2）', effects: { parentInt: 4, mood: 4, fatigue: -2 } }
      ]
    }, () => render(), { isMidTurn: true }), 120);
  } else if (window.location.search.includes('preset=tuckv2')) {
    setTimeout(() => openTuckShopSheet(), 120);
  } else if (window.location.search.includes('preset=slapv2')) {
    setTimeout(() => openCardSlapModal({
      state, mountOverlay, clearOverlay, saveAutoProgress, renderMain: render, showToast, fmtMoney
    }, () => openTuckShopSheet()), 120);
  } else if (window.location.search.includes('preset=exam18')) {
    setTimeout(() => openGaokaoV3(() => render()), 120);
  } else if (window.location.search.includes('preset=gamesv4')) {
    const g = new URLSearchParams(window.location.search).get('g') || 'rhythm_master';
    setTimeout(() => launchArcadeGame(g), 120);
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
  const nextHexAge = HEX_NODES.find(a => a > state.age && !state.hexTriggeredAges.includes(a)) || null;
  const stageHs = (!drawerOpen && !theaterState) ? getOrRollStageHotspot(state) : null;
  const petStage = (state.pet && state.pet.alive) ? getPetLifeStage(state.pet) : null;
  let bodyHtml = '';
  const navTabsHtml = (cls = 'bottom-nav v5-line-nav') => `
    <nav class="${cls}">
      <button class="nav-tab ${activeTab==='home'?'active':''}" data-tab="home"><span class="ico">${lineNavIcon('home', 22)}</span><span>主页</span></button>
      <button class="nav-tab ${activeTab==='assets'?'active':''} ${unlockAssets?'':'locked'}" data-tab="assets"><span class="ico">${lineNavIcon('assets', 22)}</span><span>家与账</span></button>
      <button class="nav-tab ${activeTab==='social'?'active':''} ${unlockSocial?'':'locked'}" data-tab="social"><span class="ico">${lineNavIcon('social', 22)}</span><span>亲友梦</span></button>
      <button class="nav-tab ${activeTab==='album'?'active':''} ${unlockAlbum?'':'locked'} ${albumBounce?'bounce':''}" data-tab="album">
        <span class="ico">${lineNavIcon('album', 22)}</span><span>相册</span>
        <span class="nav-badge">${state.albumPhotos.length}</span>
      </button>
    </nav>
  `;

  if (activeTab === 'home') {
    const livePrev = drawerOpen && draft.length > 0 ? previewDraft(state, draft) : null;
    const fmtDelta = (v, label = '') => v > 0 ? `<span class="pill-delta pos">${label}+${v}</span>` : v < 0 ? `<span class="pill-delta neg">${label}-${Math.abs(v)}</span>` : '';
    const ctaText = theaterState ? '本季手账回放中…' : (draft.length > 0 ? `继续安排 (${draft.length}/${budget.available})` : getMainCtaText(state));
    const animCls = heroStageAnim ? heroStageAnim.anim : (heroHop ? 'hop' : '');
    const lightCls = heroStageAnim?.light ? `on ${heroStageAnim.light}` : '';
    const theaterBeat = theaterState ? theaterState.beats[theaterState.idx] : null;
    const compass = getLifeStageCompass(state, draft, PROMO_REQ);

    const dualBars = getHudDualProgressBars(state);
    const wishSnap = computeWishbookData(state, getNetWorth);
    const stagePrev = previewDraft(state, draft);
    const stageBubbleHtml = buildStageScheduleBubble(actions, budget, stagePrev);

    bodyHtml = `
      <div class="v5-home-wrapper ${drawerOpen ? 'drawer-open' : ''}" id="v5-home-wrap">
        <!-- L1 静息态顶部双层栏：左侧纯年龄陶土橙印章 + 右侧双行留白网格（无独立中考进度条） -->
        <div class="v5-hud-dual" id="v5-hud-dual">
          <button class="v5-age-stamp" id="hud-era" title="查看时代简报">
            <span class="vas-num">${state.age}<small>岁</small></span>
          </button>
          <div class="v5-hud-right">
            <div class="v5-hud-row1">
              <button class="v5-cell cash-cell" id="hud-cash" title="进入家与账">
                ${pxIcon('coin', 16)}
                <span class="vc-val">¥${fmtMoney(state.cash)}</span>
              </button>
              <div class="v5-cell stat-cell" id="hud-health">
                ${pxIcon('heart', 15)}
                <div class="vc-mini">
                  <span class="vc-val" style="color:${state.stats.health<30?'var(--red)':'#3a2b20'}">${state.stats.health}</span>
                  <div class="vc-bar"><i style="width:${state.stats.health}%;background:${state.stats.health<30?'var(--red)':'#5e9e6e'}"></i></div>
                </div>
              </div>
              <div class="v5-cell stat-cell" id="hud-mood">
                ${pxIcon('smile', 15)}
                <div class="vc-mini">
                  <span class="vc-val" style="color:${state.stats.mood<35?'var(--red)':'#3a2b20'}">${state.stats.mood}</span>
                  <div class="vc-bar"><i style="width:${state.stats.mood}%;background:${state.stats.mood<35?'var(--red)':'var(--accent)'}"></i></div>
                </div>
              </div>
            </div>

            <div class="v5-hud-row2">
              ${dualBars.map(b => {
                const pct = Math.min(100, Math.round((b.cur / Math.max(1, b.max)) * 100));
                return `
                  <div class="v5-axis-clean">
                    <div class="vac-top">
                      <span class="vac-nm">${pxIcon(b.ico, 13)} ${b.label}</span>
                      <b class="vac-num" style="color:${b.txt};">${b.cur}<small> /${b.max}</small></b>
                    </div>
                    <div class="vac-track">
                      <i style="width:${pct}%;background:${b.fill};"></i>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        </div>

        <!-- L1-Mini 展开排程态自动收起的 38px 单行胶囊顶栏（方案 A 定稿） -->
        <div class="v5-hud-mini" id="v5-hud-mini">
          <button class="vhm-age" id="hud-era-mini" title="查看时代简报">${state.age}岁</button>
          <button class="vhm-item" id="hud-cash-mini" title="进入家与账">${pxIcon('coin', 14)}<span>¥${fmtMoney(state.cash)}</span></button>
          <span class="vhm-sep"></span>
          <div class="vhm-item">${pxIcon('heart', 14)}<span style="color:${state.stats.health<30?'var(--red)':'#3a2b20'}">${state.stats.health}</span></div>
          <span class="vhm-sep"></span>
          <div class="vhm-item">${pxIcon('smile', 14)}<span style="color:${state.stats.mood<35?'var(--red)':'#3a2b20'}">${state.stats.mood}</span></div>
        </div>

        <!-- L2 100% 全屏通铺轻像素生活全景舞台（与悬浮撕边手账纸无缝联动） -->
        <div class="scene-stage v5-full-stage ${drawerOpen ? 'drawer-open' : ''}" id="scene-stage">
          <img class="scene-bg" src="./assets/bg/${bgKey}.jpg" />
          <div class="film-overlay"></div>
          <div class="film-lightleak"></div>
          <div class="stage-light ${lightCls}" id="stage-light"></div>
          ${!drawerOpen && !theaterState ? `
            <button class="hex-btn v5-frosted ${pendingHexAge ? 'glow' : ''}" id="btn-hex-deck">
              ${pxIcon('hex', 13)}
              <span>${pendingHexAge ? '觉醒海克斯!' : '海克斯'}</span>
              <span class="hex-cnt">${hexCount}/7${!pendingHexAge && nextHexAge ? `·${nextHexAge}岁` : ''}</span>
              ${pendingHexAge ? '<span class="hex-dot"></span>' : ''}
            </button>
            <div class="v5-top-right-pills">
              <button class="wish-btn v5-frosted" id="btn-wishbook">${pxIcon('pin', 12)} 心愿册·${wishSnap.totalStamped} ›</button>
              <button class="news-btn v5-frosted inline" id="btn-news">简报${state.age >= 18 ? '<span class="news-dot"></span>' : ''}</button>
            </div>
            ${(state.statusBuffs || []).length ? `
              <div class="buff-strip v5-buff-pos">
                ${state.statusBuffs.map(bf => `<span class="buff-pill ${bf.type === 'neg' ? 'neg' : ''}">${bf.name} ${bf.turns}季</span>`).join('')}
              </div>
            ` : ''}
          ` : ''}
          ${stageHs && !stageHs.claimed ? `
            <button class="stage-hotspot" id="btn-stage-hs" style="left:${stageHs.left}%;bottom:${Math.max(43, stageHs.bottom)}%;" title="${stageHs.label}">
              ${pxIcon(stageHs.ico, 17)}
              <span class="hs-lbl">${stageHs.label}</span>
            </button>
          ` : ''}
          ${petStage && !drawerOpen ? `
            <button class="stage-pet v5-pet-pos ${petHopSound ? 'pet-hop' : ''}" id="btn-stage-pet" title="摸一摸${state.pet.name}">
              ${petHopSound ? `<span class="pet-heart">${pxIcon('heart', 11)} ${petHopSound}</span>` : ''}
              <span class="pet-body" style="transform:scale(${petStage.scale});">${pxIcon(state.pet.ico, 38)}</span>
              <span class="pet-tag">${state.pet.name}</span>
            </button>
          ` : ''}
          <div class="hero-anchor v5-hero ${animCls}" id="hero-tap">
            ${(!drawerOpen && heroStageAnim?.bubble) ? `<div class="hero-speech">${heroStageAnim.bubble}</div>` : (!drawerOpen && bubbleUrl ? `<img class="hero-bubble" src="${bubbleUrl}" />` : '')}
            ${heroStageAnim?.prop ? `<div class="hero-prop">${pxIcon(heroStageAnim.prop, 20)}</div>` : ''}
            ${heroStageAnim?.subProp ? `<div class="hero-prop-sub">${pxIcon(heroStageAnim.subProp, 14)}</div>` : ''}
            ${spUrl ? `<img class="hero-sprite" src="${spUrl}" />` : ''}
            <div class="hero-shadow"></div>
          </div>
          <!-- 展开排程态右侧实时收益手账气泡（方案 A 定稿） -->
          ${stageBubbleHtml}
          ${comboBurstText ? `<div class="combo-burst">${pxIcon('combo', 15)} ${comboBurstText}</div>` : ''}
          ${floatPops.length ? `<div class="float-layer">${floatPops.map((p, idx) => `<div class="float-pop ${p.k}" style="animation-delay:${idx*140}ms;left:${48 + (idx%2===0?-8:8)}%;">${p.text}</div>`).join('')}</div>` : ''}
          ${theaterState ? `
            <div class="theater-bar v5-theater-pos" id="theater-skip">
              <div class="theater-dots">
                ${theaterState.beats.map((_, i) => `<i class="${i < theaterState.idx ? 'done' : i === theaterState.idx ? 'now' : ''}"></i>`).join('')}
              </div>
              <span class="theater-txt">${theaterState.comboShown ? '连携碰撞达成！' : `${theaterBeat?.name || ''} · ${theaterBeat?.text || ''}`}</span>
              <span class="theater-skip">轻点跳过 ›</span>
            </div>
          ` : `${!drawerOpen && cornerSticker ? `<button class="corner-sticker v5-corner-pos" id="corner-btn">${pxIcon(cornerSticker.ico, 14)} ${cornerSticker.label}</button>` : ''}${!drawerOpen ? `<div class="date-stamp v5-stamp-pos">${stamp}</div>` : ''}`}
        </div>

        <!-- 暖白手账纸条轻提示 -->
        ${toastMsg ? `<div class="toast-ribbon" id="toast-close">${toastMsg}</div>` : ''}

        <!-- 背景轻暗幕（展开排程时可点空白收折） -->
        <div class="drawer-backdrop ${drawerOpen ? 'open' : ''}" id="drawer-mask"></div>

        <!-- L3 同一张悬浮「手撕锯齿毛边手账纸」：折叠静息态 ⇄ 340ms 原地拉高展开排程态！ -->
        <div class="v5-journal-sheet ${drawerOpen ? 'open' : ''}" id="v5-sheet">
          <svg class="v5-torn-edge" viewBox="0 0 390 15" preserveAspectRatio="none" aria-hidden="true">
            <path d="M0,15 L0,7.2 L9,4.8 L17,8.4 L26,4.2 L35,7.9 L46,3.8 L56,8.2 L67,4.9 L78,8.6 L89,3.6 L101,7.8 L112,4.6 L124,8.5 L136,4.1 L148,7.6 L159,3.9 L171,8.1 L183,4.7 L195,8.3 L207,3.7 L219,7.9 L231,4.5 L243,8.4 L255,3.9 L267,7.7 L279,4.8 L291,8.5 L303,4.0 L315,7.8 L327,4.6 L339,8.3 L351,4.2 L363,7.9 L374,4.7 L383,8.0 L390,5.8 L390,15 Z" fill="#efe6d6"/>
            <path d="M0,15 L0,8.6 L9,6.2 L17,9.6 L26,5.6 L35,9.1 L46,5.2 L56,9.4 L67,6.3 L78,9.8 L89,5.0 L101,9.0 L112,6.0 L124,9.7 L136,5.5 L148,8.9 L159,5.3 L171,9.3 L183,6.1 L195,9.5 L207,5.1 L219,9.1 L231,5.9 L243,9.6 L255,5.3 L267,8.9 L279,6.2 L291,9.7 L303,5.4 L315,9.0 L327,6.0 L339,9.5 L351,5.6 L363,9.1 L374,6.1 L383,9.2 L390,7.2 L390,15 Z" fill="#fffdf9"/>
          </svg>
          <div class="v5-cross-tape green"></div>
          <div class="v5-cross-tape pink"></div>

          <!-- 静息折叠态内容（对齐定稿参考图：季节标题 + 下一路标提示卡 + 陶土橙大按钮 + 底栏导航） -->
          <div class="v5-rest-view">
            <div class="v5-season-row">
              <div class="season-caption">${getSeasonTitle(state)}</div>
              <div class="season-dots compact">
                ${Array.from({ length: mp.subTurns }).map((_, idx) => `<span class="s-dot ${idx + 1 < state.subTurn ? 'past' : idx + 1 === state.subTurn ? 'now' : ''}"></span>`).join('')}
              </div>
            </div>

            ${compass ? `
              <div class="v5-compass-card" id="btn-compass-home" title="查看阶段目标详情">
                <div class="vc-top">
                  <span class="vc-kicker">${(compass.kicker || '下一个路标').replace(/^下一关 · /, '下一个路标：')}</span>
                  ${compass.badge ? `<span class="vc-badge">${compass.badge}</span>` : ''}
                </div>
                <div class="vc-main">${compass.main || `${dualBars.map(b => `${b.label} ${b.cur}`).join(' / ')} 稳步提升中`}</div>
              </div>
            ` : ''}

            ${(budget.commuteLocked || budget.babyLock) ? `<div class="season-sub">${budget.commuteLocked ? '远郊通勤占1格' : ''}${budget.babyLock ? ' · 育儿照护占1格' : ''}</div>` : ''}
            <button class="cta-main v5-cta" id="btn-open-drawer" ${theaterState ? 'disabled' : ''}>${ctaText} <span class="v5-cta-pill">${budget.available} 格</span></button>

            <!-- 内嵌于手账纸底沿的极简细棕线 4 Tab 导航栏 -->
            ${navTabsHtml('v5-inline-nav')}
          </div>

          <!-- 原地向上拉高展开后的排程态内容 -->
          <div class="v5-expand-view">
            ${renderV5Drawer(actions, budget, compass)}
          </div>
        </div>
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
        ${activeTab !== 'home' ? navTabsHtml('bottom-nav v5-line-nav') : ''}
      </div>
    </div>
  `;

  bindMainEvents(actions, budget, cornerSticker);
}

function buildStageScheduleBubble(actions, budget, prev) {
  const isFull = draft.length >= budget.available;
  const inspected = actions.find(a => a.id === inspectedId) || null;
  const queuedNames = draft.map(id => {
    const a = actions.find(x => x.id === id);
    return a ? getActionMeta(a, state).short : id;
  });

  // 估算排入贴纸对当期核心属性的加成展示
  let knowGain = 0, numGain = 0, proGain = 0, exprGain = 0;
  for (const id of draft) {
    if (id === 'study_lit') knowGain += 3;
    else if (id === 'study_num') numGain += 3;
    else if (id === 'study_tutor') { knowGain += 2; numGain += 2; }
    else if (id === 'gaokao_sprint') { knowGain += 3; numGain += 3; }
    else if (id === 'uni_study') { knowGain += 2; proGain += 2; }
    else if (id === 'uni_intern' || id === 'pro_self' || id === 'pro_course') proGain += 3;
    else if (id === 'accompany_friend' || id === 'date_partner') exprGain += 2;
  }

  const deltaChips = [];
  if (knowGain > 0) deltaChips.push(`<span class="pos">学识 +${knowGain}</span>`);
  if (numGain > 0) deltaChips.push(`<span class="pos">数理 +${numGain}</span>`);
  if (proGain > 0) deltaChips.push(`<span class="pos">专业 +${proGain}</span>`);
  if (exprGain > 0 && deltaChips.length < 2) deltaChips.push(`<span class="pos">表达 +${exprGain}</span>`);
  if (prev.cash !== 0) deltaChips.push(`<span class="${prev.cash > 0 ? 'pos' : 'neg'}">${prev.cash > 0 ? '+' : '-'}¥${fmtMoney(Math.abs(prev.cash))}</span>`);
  if (prev.health !== 0 && deltaChips.length < 4) deltaChips.push(`<span class="${prev.health > 0 ? 'pos' : 'neg'}">健康 ${prev.health > 0 ? '+' : ''}${prev.health}</span>`);
  if (prev.mood !== 0 && deltaChips.length < 4) deltaChips.push(`<span class="${prev.mood > 0 ? 'pos' : 'neg'}">心态 ${prev.mood > 0 ? '+' : ''}${prev.mood}</span>`);
  const fatDelta = prev.endFatigue - state.stats.fatigue;
  if (fatDelta > 0) deltaChips.push(`<span class="neg">疲劳 +${fatDelta}</span>`);
  else if (fatDelta < 0 && draft.length > 0) deltaChips.push(`<span class="pos">疲劳 ${fatDelta}</span>`);

  const canReplace = isFull && inspected && !inspected.disabled && !draft.includes(inspected.id);
  const subLine = draft.length > 0
    ? queuedNames.join(' · ')
    : (inspected ? `查看：${inspected.name}` : '轻点下方贴纸排入本季日程');

  const bottomLine = draft.length > 0
    ? (deltaChips.join('') || '<span class="pos">稳步积累中</span>')
    : (inspected?.chips?.length
      ? inspected.chips.slice(0, 3).map(c => `<span class="${c.k === 'down' || c.k === 'warn' ? 'neg' : 'pos'}">${c.t}</span>`).join('')
      : '<span class="muted">发金光贴纸可撞出连携加成</span>');

  return `
    <div class="v5-stage-bubble" id="v5-stage-bubble">
      <div class="vsb-hd">
        <span>本季已排 <b>${draft.length} / ${budget.available}</b> 格${prev.combos.length ? ` · <em>${prev.combos[0].name}!</em>` : ''}</span>
        ${canReplace ? `<button class="vsb-rep-btn" id="insp-replace">替换末格</button>` : ''}
      </div>
      <div class="vsb-names">${subLine}</div>
      <div class="vsb-deltas">${bottomLine}</div>
    </div>
  `;
}

function matchDrawerCategory(act, catKey) {
  if (catKey === 'all') return true;
  if (catKey === 'seasonal') return Boolean(act.seasonal);
  if (act.seasonal) return false;
  const c = act.cat || '';
  if (catKey === 'study') return c.startsWith('1.') || act.isDreamAction;
  if (catKey === 'life') return c.startsWith('2.') || c.startsWith('6.');
  if (catKey === 'social') return c.startsWith('3.') || c.startsWith('4.');
  return true;
}

function renderV5Drawer(actions, budget, compass) {
  const prev = previewDraft(state, draft);
  const recMap = getRecommendedActionMap(state, actions);
  const isFirstTurn = (state.totalTurns || 0) === 0;
  const isFull = draft.length >= budget.available;
  const dualBars = getHudDualProgressBars(state);

  const slotCounts = {};
  for (const id of draft) slotCounts[id] = (slotCounts[id] || 0) + 1;

  const recFirstId = Object.keys(recMap)[0] || actions[0]?.id || null;
  let inspected = actions.find(a => a.id === inspectedId) || null;
  if (!inspected && !isFirstTurn) {
    inspected = actions.find(a => a.id === (draft[draft.length - 1] || recFirstId)) || actions[0] || null;
  }

  const hasSeasonal = actions.some(a => a.seasonal);
  const seasonalLabel = actions.find(a => a.seasonal)?.badge ? `${actions.find(a => a.seasonal).badge}限定` : '当季限定';
  const catTabs = [
    { id: 'all', lb: '全部' },
    { id: 'study', lb: state.age <= 22 ? '学业' : '成长' },
    { id: 'life', lb: '生活' },
    { id: 'social', lb: '社交' }
  ];
  if (hasSeasonal) catTabs.push({ id: 'seasonal', lb: seasonalLabel.replace(/限定限定$/, '限定') });
  if (!catTabs.some(t => t.id === drawerCat)) drawerCat = 'all';
  const visibleActions = actions.filter(a => matchDrawerCategory(a, drawerCat));

  const useReuseAsPrimary = !isFirstTurn && state.lastDraft.length > 0;
  const primaryToolHtml = useReuseAsPrimary
    ? `<button class="smart-btn" id="v5-reuse">沿用上次</button>`
    : `<button class="smart-btn" id="v5-smart">${pxIcon('spark', 13)} 帮我安排</button>`;

  const remain = Math.max(0, budget.available - draft.length);
  const goPillHtml = isFirstTurn && isFull
    ? `<span class="go-pill">点这里出发</span>`
    : remain > 0
      ? `<span class="go-pill">差 ${remain} 格</span>`
      : `<span class="go-pill">已排满</span>`;

  const subjSelectorHtml = (state.age > 18 && state.child && (state.age - state.child.bornAge) <= 18) ? `
    <div class="v5-subj-bar">
      <span class="vsb-lbl">辅导娃:</span>
      ${[
        { id: 'balanced', lb: '全科均衡' },
        { id: 'lit', lb: `补文科(学识${state.stats.knowledge})` },
        { id: 'num', lb: `补理科(数理${state.stats.numLogic})` }
      ].map(it => `<button class="vsb-pill ${(state.tutorKidFocus || 'balanced') === it.id ? 'active' : ''}" data-kid-focus="${it.id}">${it.lb}</button>`).join('')}
    </div>
  ` : '';

  const axisSubTxt = dualBars.map(b => `${b.label} ${b.cur}/${b.max}`).join(' · ');

  return `
    <div class="v5-drawer-inner">
      <div class="v5-head">
        <div class="v5-head-left">
          <div class="v5-title">本季安排 <b>${draft.length}/${budget.available}</b></div>
          <div class="v5-axis-sub">${axisSubTxt}</div>
        </div>
        <div class="v5-tools">
          ${primaryToolHtml}
          <button class="ico-btn" id="v5-more-toggle" aria-label="更多操作">···</button>
          <button class="ico-btn close-btn" id="v5-close" title="收起回主页（保留草稿）" aria-label="收起抽屉">${chevDownIcon(15)}</button>
        </div>
        ${moreMenuOpen ? `
          <div class="v5-more-menu" id="v5-more-menu">
            <button class="v5-more-item" id="v5-smart-menu">${pxIcon('spark', 13)} 智能帮我安排</button>
            <button class="v5-more-item" id="v5-reuse-menu" ${state.lastDraft.length ? '' : 'disabled'}>沿用上次排程</button>
            <button class="v5-more-item" id="v5-tpl">${state.templates.balance.length ? '载入我的模板' : '存为我的模板'}</button>
            <button class="v5-more-item danger" id="v5-clear" ${draft.length ? '' : 'disabled'}>清空当前槽位</button>
          </div>
        ` : ''}
      </div>

      <div class="v5-slots ${budget.available >= 5 ? 'five' : ''}" style="grid-template-columns: repeat(${Math.min(7, budget.available)}, 1fr);">
        ${draft.map((id, i) => {
          const a = actions.find(x => x.id === id);
          const m = a ? getActionMeta(a, state) : { short: id };
          return `<button class="stamp-slot filled" data-rm="${i}" title="点击移除">${m.short}<span class="sx">×</span></button>`;
        }).join('')}
        ${Array.from({ length: remain }).map(() => `<span class="stamp-slot">+ 空槽</span>`).join('')}
      </div>

      ${subjSelectorHtml}

      <div class="v5-cat-bar">
        <div class="v5-cat-pills">
          ${catTabs.map(t => `<button class="v5-cat-pill ${drawerCat === t.id ? 'on' : ''}" data-dcat="${t.id}">${t.lb}</button>`).join('')}
        </div>
        <button class="combo-codex-btn ${prev.combos.length ? 'lit' : ''}" id="btn-open-codex">图鉴 ${state.discoveredCombos.length}/${SCHEDULE_COMBOS.length}</button>
      </div>

      <div class="v5-cards">
        <div class="sticker-grid ${visibleActions.length > 8 ? 'compact' : ''}">
          ${(() => {
            const partnerIds = draft.length < budget.available
              ? getComboPartnerIds(draft, actions.filter(x => !x.disabled).map(x => x.id), state)
              : new Set();
            return visibleActions.map(a => {
              const m = getActionMeta(a, state);
              const cnt = slotCounts[a.id] || 0;
              const isRec = Boolean(recMap[a.id]);
              const isPartner = partnerIds.has(a.id);
              const topLeftBadge = a.seasonal ? (a.badge || '限定') : (isPartner ? '连携' : '');
              const showRightRec = isRec && !cnt;
              const isFocus = inspected && inspected.id === a.id;
              const pulseFirst = isFirstTurn && draft.length === 0 && a.id === recFirstId;
              return `
                <button class="stk ${a.seasonal ? 'seasonal' : ''} ${isRec ? 'is-rec' : ''} ${isPartner ? 'combo-partner' : ''} ${isFocus ? 'focus' : ''} ${cnt ? 'slotted' : ''} ${a.disabled ? 'is-disabled' : ''} ${pulseFirst ? 'guide-pulse' : ''}" data-sticker="${a.id}">
                  ${topLeftBadge ? `<span class="stk-rec ${a.seasonal ? 'sea-badge' : 'partner-badge'}">${topLeftBadge}</span>` : ''}
                  ${showRightRec ? `<span class="stk-rec-rt">推荐</span>` : ''}
                  ${a.costCash > 0 ? `<span class="stk-price">¥${fmtMoney(a.costCash)}</span>` : ''}
                  ${cnt > 0 ? `<span class="stk-cnt">×${cnt}</span>` : ''}
                  <div class="stk-well" style="--well-bg:${m.wellBg};">${pxIcon(m.ico, 21)}</div>
                  <span class="stk-nm">${m.short}</span>
                </button>
              `;
            }).join('');
          })()}
        </div>
      </div>

      <div class="v5-footer">
        ${prev.fatigueWarn ? `<div class="v5-warn">注意：本季安排偏满（疲劳将达 ${prev.endFatigue}/${prev.fatigueLimit}），会额外扣 1 点健康</div>` : ''}
        <button class="btn-go ${isFirstTurn && isFull ? 'ready-pulse' : ''}" id="v5-exec">开始这一季 ${goPillHtml}</button>
      </div>
    </div>
  `;
}

function renderAssetsTab() {
  return renderNewAssetsTab(state, fmtMoney);
}

function renderSocialTab(budget) {
  const statList = [
    { lb: '学识(文)', val: state.stats.knowledge, color: '#4a7fc1' },
    { lb: '数理(理)', val: state.stats.numLogic || 20, color: '#3b8760' },
    { lb: '专业(职)', val: state.stats.pro, color: '#c9683a' },
    { lb: '表达(社)', val: state.stats.expr, color: '#d05d80' },
    { lb: '自理理财', val: state.stats.selfCare, color: '#8f6b3e' }
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
    const kidAge = state.age - state.child.bornAge;
    people.push({
      ico: 'avatarKid',
      name: `孩子 (${kidAge}岁)`,
      role: state.child.universityName ? `已读 ${state.child.universityName}` : '亲子档案',
      val: state.child.bond,
      kid: state.child,
      kidAge,
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

  const kidSummary = state.child ? getChildExamPreviewSummary(state) : null;
  const kidEp = state.child ? ensureChildExamProfile(state) : null;

  return `
    <div class="tab-page">
      <!-- 五维核心能力成长手账 -->
      <div class="stat-ledger">
        <div class="sec-head-row">
          <span class="sec-title">${pxIcon('study', 17)} 五项核心能力档案</span>
          <button class="pill-btn soft" id="t-open-compass" style="height:26px;padding:0 9px;font-size:11px;">阶段过关标准 ›</button>
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
            <button class="pill-btn primary" id="t-promo">${pxIcon('sprint', 14)} 申请晋升 L${state.jobLevel + 1}（需专业≥${PROMO_REQ[state.jobLevel + 1]} · 项目≥${state.jobLevel}）</button>
          </div>
        ` : ''}
      </div>

      ${state.child && kidEp ? `
        <div class="sec-card">
          <div class="sec-head-row" style="margin-bottom:6px;">
            <span class="sec-title">${pxIcon('baby', 16)} 子女培养方针与升学成绩单</span>
            <span class="tag up">${kidSummary ? `${kidSummary.examLabel} 预计 ${kidSummary.range[0]}~${kidSummary.range[1]}分` : (state.child.universityName || '启蒙成长期')}</span>
          </div>
          <div style="display:flex;gap:6px;margin-bottom:7px;">
            ${Object.values(CHILD_POLICIES).map(pol => `
              <button class="pill-btn ${kidEp.policy === pol.id ? 'primary' : ''}" data-kid-pol="${pol.id}" style="flex:1;justify-content:center;height:30px;padding:0 6px;font-size:11.5px;">${pol.name}</button>
            `).join('')}
          </div>
          <div style="font-size:11.5px;color:var(--muted);line-height:1.45;">
            ${CHILD_POLICIES[kidEp.policy]?.desc || ''}${kidSummary ? `<br/>当前娃学识 <b>${kidSummary.lit}</b> · 娃数理 <b>${kidSummary.num}</b>（独立天赋，复用 38 季区间算分制）` : ''}
          </div>
          ${Object.keys(kidEp.reports || {}).length > 0 ? `
            <div style="margin-top:7px;padding-top:6px;border-top:1px dashed var(--border);font-size:11.5px;color:var(--ink);">
              ${kidEp.reports.p6 ? `<div>· 12岁小升初：<b>${kidEp.reports.p6.finalScore}/300分</b>（${kidEp.reports.p6.admitted}）</div>` : ''}
              ${kidEp.reports.zk ? `<div>· 15岁中考：<b>${kidEp.reports.zk.finalScore}/660分</b>（${kidEp.reports.zk.admitted}）</div>` : ''}
              ${kidEp.reports.gk ? `<div>· 18岁高考：<b>${kidEp.reports.gk.finalScore}/750分</b>（${kidEp.reports.gk.admitted}）</div>` : ''}
            </div>
          ` : ''}
        </div>
      ` : ''}

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
              ` : p.help ? `<span class="yb-help-tag">可互相帮衬</span>` : ''}
            </div>
          `).join('')}
        </div>
        <div class="pill-actions">
          ${state.age >= 13 && state.age <= 18 ? `<button class="pill-btn primary" id="t-romance-hub">${pxIcon('heart', 14)} ${state.age <= 15 ? '青春同学录' : '高中同学录'} · 聊天</button>` : ''}
          ${state.age >= 19 && !state.relations.partner ? `<button class="pill-btn primary" id="t-romance-hub">${pxIcon('heart', 14)} 相亲角与缘分</button>` : ''}
          ${state.relations.partner && state.age >= 19 ? `<button class="pill-btn soft" id="t-romance-hub">${pxIcon('heart', 14)} 找${state.relations.partner.name}聊天</button>` : ''}
          ${state.relations.partner && !state.relations.partner.married && state.age >= 22 ? `<button class="pill-btn primary" id="t-marry">${pxIcon('heart', 14)} 谈婚论嫁</button>` : ''}
          ${state.university?.tier === 4 && !state.upgradedToBachelor && state.age >= 20 ? `<button class="pill-btn primary" id="t-zsb">${pxIcon('study', 14)} 报考专升本 (需学识≥60)</button>` : ''}
          ${state.relations.partner && !state.relations.partner.married ? `<button class="pill-btn soft" id="t-breakup" style="color:#b91c1c;">主动提分手</button>` : ''}
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

  // 主页 V5 撕纸手账一镜到底物理展开 / 折回交互（340ms 丝滑过渡）
  const smoothCloseDrawer = () => {
    const wrap = appEl.querySelector('#v5-home-wrap');
    const sheet = appEl.querySelector('#v5-sheet');
    const stg = appEl.querySelector('#scene-stage');
    const mask = appEl.querySelector('#drawer-mask');
    moreMenuOpen = false;
    clearHeroStageAnimDom();
    if (sheet && sheet.classList.contains('open')) {
      wrap?.classList.remove('drawer-open');
      sheet.classList.remove('open');
      stg?.classList.remove('drawer-open');
      mask?.classList.remove('open');
      setTimeout(() => {
        drawerOpen = false;
        render();
      }, 280);
    } else {
      drawerOpen = false;
      render();
    }
  };

  bind('#btn-open-drawer', () => {
    if (theaterState) return;
    drawerOpen = false;
    moreMenuOpen = false;
    render();
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        drawerOpen = true;
        appEl.querySelector('#v5-home-wrap')?.classList.add('drawer-open');
        appEl.querySelector('#v5-sheet')?.classList.add('open');
        appEl.querySelector('#scene-stage')?.classList.add('drawer-open');
        appEl.querySelector('#drawer-mask')?.classList.add('open');
      });
    });
  });
  bind('#drawer-mask', smoothCloseDrawer);
  bind('#v5-close', smoothCloseDrawer);
  appEl.querySelectorAll('[data-dcat]').forEach(btn => {
    btn.onclick = () => {
      drawerCat = btn.dataset.dcat || 'all';
      moreMenuOpen = false;
      render();
    };
  });
  bind('#btn-compass-home', openCompassSlipModal);
  bind('#btn-compass-drawer', openCompassSlipModal);
  bind('#t-open-compass', openCompassSlipModal);

  appEl.querySelectorAll('[data-subj]').forEach(btn => {
    btn.onclick = () => {
      state.selectedSubject = btn.dataset.subj;
      inspectedId = 'study_self';
      saveAutoProgress();
      render();
    };
  });
  bind('#v5-toggle-track', () => {
    state.examTrack = state.examTrack === 'art' ? 'sci' : 'art';
    if (state.selectedSubject === 'art' || state.selectedSubject === 'sci') {
      state.selectedSubject = state.examTrack;
    }
    saveAutoProgress();
    render();
    showToast(`已切换高考综合卷为【${state.examTrack === 'art' ? '文科综合(300分)' : '理科综合(300分)'}】`);
  });
  appEl.querySelectorAll('[data-kid-focus]').forEach(btn => {
    btn.onclick = () => {
      state.tutorKidFocus = btn.dataset.kidFocus;
      inspectedId = 'tutor_kid';
      saveAutoProgress();
      render();
    };
  });
  appEl.querySelectorAll('[data-kid-pol]').forEach(btn => {
    btn.onclick = () => {
      const ep = ensureChildExamProfile(state);
      if (ep) {
        ep.policy = btn.dataset.kidPol;
        saveAutoProgress();
        render();
        showToast(`已切换孩子年度培养方针为「${CHILD_POLICIES[ep.policy]?.name || ''}」`);
      }
    };
  });
  bind('#toast-close', () => {
    if (toastTimer) { clearTimeout(toastTimer); toastTimer = null; }
    toastMsg = '';
    document.querySelectorAll('.toast-ribbon').forEach(el => el.remove());
  });
  bind('#btn-wishbook', () => openWishbookModal(state, getNetWorth, mountOverlay, clearOverlay, () => { saveAutoProgress(); render(); }));
  bind('#hud-era', openEraNewspaper);
  bind('#hud-era-mini', openEraNewspaper);
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
  const goAssetsFromHud = () => {
    if (state.totalTurns >= 1 || state.age > 6) {
      activeTab = 'assets'; drawerOpen = false; moreMenuOpen = false; render();
    }
  };
  bind('#hud-cash', goAssetsFromHud);
  bind('#hud-cash-mini', goAssetsFromHud);
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
    petHopSound = res.sound || '呼噜~';
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
      if (id === 'study_tutor') {
        const queuedTutor = draft.filter(x => x === 'study_tutor').length;
        if (state.tutoredThisYear + queuedTutor >= state.origin.eduLimit) {
          showToast(`本年补习次数已排满（上限 ${state.origin.eduLimit} 次）`);
          return;
        }
      }
      const queuedCash = draft.reduce((sum, x) => sum + ((actions.find(a => a.id === x)?.costCash) || 0), 0);
      if (act.costCash > 0 && queuedCash + act.costCash > state.cash) {
        showToast(`现金不足，当前余额 ¥${Math.round(state.cash)}，排满需 ¥${queuedCash + act.costCash}`);
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
        playComboCollisionVfx(justFormed, isFirst, actions, getActionMeta, state, draft);
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
      const prevIds = new Set(detectCombos(draft, state).map(c => c.id));
      draft[draft.length - 1] = inspectedId;
      moreMenuOpen = false;
      const justFormed = detectCombos(draft, state).find(c => !prevIds.has(c.id));
      triggerHeroActionPreview(inspectedId, 1400);
      render();
      if (justFormed) {
        playComboCollisionVfx(justFormed, !state.discoveredCombos.includes(justFormed.id), actions, getActionMeta, state, draft);
      }
    }
  });

  const doSmartFill = () => {
    const prevIds = new Set(detectCombos(draft, state).map(c => c.id));
    draft = buildSmartDraft(state, actions, budget);
    inspectedId = draft[draft.length - 1] || null;
    moreMenuOpen = false;
    const justFormed = detectCombos(draft, state).find(c => !prevIds.has(c.id));
    if (inspectedId) triggerHeroActionPreview(inspectedId, 1400);
    showToast('已按当前目标帮你排满，点上方 ✕ 可随时替换');
    if (justFormed) {
      playComboCollisionVfx(justFormed, !state.discoveredCombos.includes(justFormed.id), actions, getActionMeta, state, draft);
    }
  };
  const doReuse = () => {
    const prevIds = new Set(detectCombos(draft, state).map(c => c.id));
    const valid = new Set(actions.filter(a => !a.disabled).map(a => a.id));
    draft = state.lastDraft.filter(id => valid.has(id)).slice(0, budget.available);
    inspectedId = draft[draft.length - 1] || null;
    moreMenuOpen = false;
    const justFormed = detectCombos(draft, state).find(c => !prevIds.has(c.id));
    if (inspectedId) triggerHeroActionPreview(inspectedId, 1400);
    render();
    if (justFormed) {
      playComboCollisionVfx(justFormed, !state.discoveredCombos.includes(justFormed.id), actions, getActionMeta, state, draft);
    }
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
      const prevIds = new Set(detectCombos(draft, state).map(c => c.id));
      const valid = new Set(actions.filter(a => !a.disabled).map(a => a.id));
      draft = state.templates.balance.filter(id => valid.has(id)).slice(0, budget.available);
      inspectedId = draft[draft.length - 1] || null;
      const justFormed = detectCombos(draft, state).find(c => !prevIds.has(c.id));
      showToast('已载入自定义模板');
      if (justFormed) {
        playComboCollisionVfx(justFormed, !state.discoveredCombos.includes(justFormed.id), actions, getActionMeta, state, draft);
      }
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
    const afterCoreNodes = () => {
      if (res.needGaokao) return openGaokaoV3(() => checkPendingHextech());
      if (needGrad) return openGradV3(() => checkPendingHextech());
      if (res.yearEndReport) return showYearEndV3(res.yearEndReport, () => checkPendingHextech());
      if (!checkPendingHextech()) {
        const wbRes = computeWishbookData(state, getNetWorth);
        if (wbRes.newlyStamped.length > 0) {
          showToast(`心愿册盖章达成：【${wbRes.newlyStamped[0]}】！`);
          render();
        } else if (res.rerollTicketsEarned > 0) {
          showToast(`新解锁 ${state.discoveredCombos.length} 条连携图鉴，获命运重随券 +${res.rerollTicketsEarned}！`);
        } else if (res.newlyDiscoveredCombos?.length > 0) {
          showToast(`收录新连携图鉴：${res.newlyDiscoveredCombos.map(c => c.name).join(' · ')}`);
        } else {
          triggerFloatPops(res.summary);
          render();
        }
      }
    };

    const afterBreakupCheck = () => {
      if (res.partnerBreakupEvent) {
        const ev = res.partnerBreakupEvent;
        mountOverlay(`
          <div class="modal-mask"><div class="modal-sheet wishbook-sheet">
            <div class="wb-title" style="margin-bottom:6px;">${ev.title}</div>
            <div style="font-size:13px;line-height:1.55;color:#4a3728;margin-bottom:14px;">${ev.body}</div>
            <button class="btn-go" id="bk-ok" style="width:100%;">我明白了</button>
          </div></div>
        `, (root) => {
          root.querySelector('#bk-ok').onclick = () => { clearOverlay(); saveAutoProgress(); render(); afterCoreNodes(); };
        });
        return;
      }
      afterCoreNodes();
    };

    const afterEvents = () => {
      if (res.needSportsDay) {
        openSportsDayTournament(state, mountOverlay, clearOverlay, () => {
          clearMandatoryFlag('sports_day');
          saveAutoProgress();
          render();
          afterBreakupCheck();
        });
        return;
      }
      afterBreakupCheck();
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
  bind('#t-love', () => openRomanceHubModal(state, mountOverlay, clearOverlay, (msg) => { saveAutoProgress(); render(); if (msg) showToast(msg); }));
  bind('#t-romance-hub', () => openRomanceHubModal(state, mountOverlay, clearOverlay, (msg) => { saveAutoProgress(); render(); if (msg) showToast(msg); }));
  bind('#t-breakup', () => {
    const msg = playerBreakupPartner(state);
    saveAutoProgress();
    render();
    if (msg) showToast(msg);
  });
  bind('#t-zsb', () => {
    if ((state.stats.knowledge || 0) < 60) {
      showToast(`专升本需学识 ≥60（当前 ${state.stats.knowledge}），继续积累后再来！`);
      return;
    }
    state.upgradedToBachelor = true;
    state.university = { ...state.university, tier: 3, name: `${state.university.name} (专升本)`, baseSalary: 7000 };
    state.stats.mood = clamp(state.stats.mood + 6);
    saveAutoProgress();
    render();
    showToast('专升本上岸成功！学历升级为本科，解锁更高起薪与考研深造通道！');
  });
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
  bind('#t-memorial', () => { memorialPreviewMode = true; renderMemorial(true); });
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
              <div class="ft-name">${pickedOrigin.name}</div>
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
            <span>${pickedGender === 'female' ? '女主角' : '男主角'} · ${pickedOrigin.name}</span>
          </div>

          <div class="wiz-head">
            <h2>挑选一项初始天赋</h2>
            <p>从「${pickedOrigin.name}」专属天赋池中三选一</p>
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
    resumePendingMandatory();
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

function pulseTopHudForEffects(ef = {}) {
  setTimeout(() => {
    const ids = [];
    if (ef.cash) ids.push('#hud-cash');
    if (ef.health) ids.push('#hud-health');
    if (ef.mood || ef.parentInt || ef.friendInt || ef.partnerInt) ids.push('#hud-mood');
    if (!ids.length) ids.push('#hud-mood');
    ids.forEach(sel => {
      const el = document.querySelector(sel);
      if (el) {
        el.classList.remove('hud-pulse');
        void el.offsetWidth;
        el.classList.add('hud-pulse');
      }
    });
  }, 60);
}

// ===== 专属「人审剧情手账阅读器 V3」（动态情境视窗 + 反应相框 + 邮戳信笺 + 去数值化心境独白与淡墨暗章）=====
function showApprovedEventV3(ev, next, opts = {}) {
  const cleanTitle = ev.title.replace(/^\[.*?\]\s*|^【.*?】\s*/, '');
  const shortPostmark = ev.isDreamEvent ? '追梦切片' : opts.isMidTurn ? '半路奇遇' : '人生节点';
  const bgKey = getBgKey(state.age);
  const stageIdx = getSubStageIndex(state.age);
  const stamp = getDateStamp(state.age, state.subTurn);
  const spUrl = sprites[state.gender]?.[stageIdx] || '';

  if (!opts.isMidTurn) {
    state.albumPhotos.push({ age: state.age, stamp, title: cleanTitle, stageIdx, bg: bgKey });
  }

  mountOverlay(`
    <div class="v3-overlay ev3-root">
      ${buildEventVignetteHtml(ev, state, spUrl, stamp)}
      <div class="film-sprockets">${'<i></i>'.repeat(12)}</div>
      <div class="ev3-body">
        <div class="ev3-letter">
          <span class="ev3-tape left"></span>
          <span class="ev3-tape right"></span>
          <div class="ev3-letter-head">
            <span class="ev3-postmark"><i>${shortPostmark.slice(0, 2)}</i><i>${shortPostmark.slice(2, 4)}</i></span>
            <h3 class="ev3-title">${cleanTitle}</h3>
          </div>
          <p class="ev3-summary">${ev.summary}</p>
        </div>

        <div class="ev3-choices">
          ${ev.choices.map((c, idx) => {
            const isSpecial = Boolean(c.reqAny || c.reqRelation || typeof c.reqCustom === 'boolean');
            let ok = true;
            if (c.reqAny) ok = Object.entries(c.reqAny).some(([k, v]) => state.stats[k] >= v);
            if (c.reqRelation) ok = (state.relations.partner?.intimacy >= c.reqRelation) || (state.child?.bond >= c.reqRelation);
            if (typeof c.reqCustom === 'boolean') ok = c.reqCustom;

            const fmt = formatNarrativeChoiceV3(c, ev);
            const cls = (c.isHexResonance || c.isLiveArcade) ? 'res' : (!ok ? 'locked' : '');
            let specialTag = '';
            if (c.isLiveArcade) specialTag = `<span class="gold-badge">${pxIcon('gamepad', 11)} 临场实操</span>`;
            else if (c.isHexResonance) specialTag = `<span class="gold-badge">${pxIcon('hex', 11)} 海克斯共鸣</span>`;
            else if (isSpecial && !ok) specialTag = `<span class="lock-badge">${pxIcon('lock', 11)} 条件未满</span>`;
            else if (c.gamble) {
              const pct = Math.min(95, Math.round((c.gamble.rate + (hasHex(state, 'hx_koi_god') ? 0.25 : 0) + (getBondTier(state, 'luck') >= 4 ? 0.20 : 0)) * 100));
              specialTag = `<span class="gold-badge">${pct}% 把握</span>`;
            }

            return `
              <button class="ev3-choice-card ${cls}" data-ci="${idx}" ${ok ? '' : 'disabled'}>
                <div class="ev3-medallion">${pxIcon(fmt.ico, 22)}</div>
                <div class="ev3-c-body">
                  <div class="ev3-c-top">
                    <b class="ev3-c-main">${fmt.cleanMain}</b>
                    ${specialTag}
                  </div>
                  <div class="ev3-whisper">${fmt.whisper}</div>
                </div>
                <span class="ev3-ink-stamp">${fmt.stamp}</span>
              </button>
            `;
          }).join('')}
        </div>

        <div class="ev3-footnote">凭心意做出选择 · 岁月自会留下回响</div>
      </div>
    </div>
  `, host => {
    const finish = () => {
      clearOverlay();
      render();
    };
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
        pulseTopHudForEffects(choice.effects || {});

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
        if (res.openRomanceAfter) {
          openRomanceHubModal(state, mountOverlay, clearOverlay, (msg) => {
            saveAutoProgress();
            render();
            if (msg) showToast(msg);
            if (next) next();
          }, null, { bonusFreeChat: true });
          return;
        }
        if (res.msg) showToast(res.msg);
        if (next) next();
      };
    });
  });
}

// 点击「下一关里程碑路标」弹出的全阶段五项能力与考分预测手账便签
function openCompassSlipModal() {
  const cp = getLifeStageCompass(state, draft, PROMO_REQ);
  const ep = state.age <= 18 ? getStudentExamPreview(state, draft) : null;
  const capD = state.age <= 18 ? getStageTextbookCap(state.age, state.subTurn) : 100;

  const core5 = [
    { name: '学识 (文科主轴70%)', val: state.stats.knowledge, use: '决定语文/文综/英语底分、考研(≥70)、辅导娃文科与64岁防骗(≥55)' },
    { name: '数理 (理科主轴70%)', val: state.stats.numLogic || 20, use: '决定数学/理综/英语底分、理工职场、AI转型加成与辅导娃理科' },
    { name: '专业 (职场晋升轴)', val: state.stats.pro, use: '升 L2(≥30)/L3(≥50)/L4(≥65·抗35岁裁员)/L5(≥80)，翻倍月薪与退休金' },
    { name: '表达 (人际与留学)', val: state.stats.expr, use: '9岁选班长(≥28)、18岁海外留学语言线(50/60/70)、婚恋与社交' },
    { name: '自理理财 (生活财商)', val: state.stats.selfCare, use: '童年免闹肚子(≥30)、看房砍价、黄金避险与64岁识破骗局(≥55)' }
  ];

  const examTableHtml = ep ? `
    <div class="compass-exam-box">
      <div class="ceb-head">
        <b>当期考卷预测（本学段教材上限 D=${capD}）</b>
        <span>稳过线建议值：${ep.reqX}/${capD}</span>
      </div>
      <div class="ceb-grid">
        ${ep.paper.rows.map(r => `
          <div class="ceb-row">
            <span>${r.label} <small>(满${r.full})</small></span>
            <span>专项 ${Math.round(r.S)}</span>
            <b>${r.L}~${r.U}分</b>
          </div>
        `).join('')}
      </div>
      <div class="ceb-foot">
        当前总分预测区间：<b>${ep.draftRange[0]} ~ ${ep.draftRange[1]} / ${ep.paper.fullTotal} 分</b>（${ep.statusTag}）
      </div>
    </div>
  ` : '';

  mountOverlay(`
    <div class="sheet-modal"><div class="sheet-box" style="max-height:84%;display:flex;flex-direction:column;">
      <div class="sec-head-row" style="margin-bottom:6px;">
        <span class="sec-title">${pxIcon('pin', 16)} 阶段目标路标与五项指标说明</span>
        <span class="tag up">${state.age}岁 · 第${state.subTurn}季</span>
      </div>
      <div style="flex:1;overflow-y:auto;min-height:0;padding-right:2px;">
        <div class="mg-stats" style="background:#fdf6e2;border-color:#ecdcb3;margin-bottom:8px;">
          <b>${cp.kicker}</b><br/>
          <span>${cp.main}</span>
          ${cp.subHint ? `<div style="margin-top:3px;color:var(--accent);font-weight:700;">· ${cp.subHint}</div>` : ''}
        </div>
        ${examTableHtml}
        <div style="display:flex;flex-direction:column;gap:6px;">
          ${core5.map(it => `
            <div class="compass-stat-card">
              <div class="csc-top"><b>${it.name}</b><span class="csc-val">${it.val} / ${state.age <= 18 && (it.name.startsWith('学识') || it.name.startsWith('数理')) ? capD : 100}</span></div>
              <div class="csc-desc">${it.use}</div>
            </div>
          `).join('')}
        </div>
      </div>
      <div class="mg-actions" style="margin-top:10px;">
        <button class="btn primary" id="cp-close" style="width:100%;">明白啦 · 继续规划</button>
      </div>
    </div></div>
  `, host => {
    host.querySelector('#cp-close').onclick = clearOverlay;
  });
}

// P0-04：读档自动恢复尚未完成的强制决策节点（校运会 / 高考志愿 / 毕业择城）
function clearMandatoryFlag(key) {
  if (Array.isArray(state?.pendingMandatory)) {
    state.pendingMandatory = state.pendingMandatory.filter(k => k !== key);
  }
}
function resumePendingMandatory() {
  if (!state || !Array.isArray(state.pendingMandatory) || !state.pendingMandatory.length) return false;
  const next = state.pendingMandatory[0];
  if (next === 'sports_day' && !state.sportsDayDone) {
    openSportsDayTournament(state, mountOverlay, clearOverlay, () => {
      clearMandatoryFlag('sports_day');
      saveAutoProgress(); render(); resumePendingMandatory();
    });
    return true;
  }
  if (next === 'gaokao' && !state.gaokaoDone) {
    openGaokaoV3(() => {
      clearMandatoryFlag('gaokao');
      saveAutoProgress(); render(); resumePendingMandatory();
    });
    return true;
  }
  if (next === 'grad' && !state.track) {
    openGradV3(() => {
      clearMandatoryFlag('grad');
      saveAutoProgress(); render(); resumePendingMandatory();
    });
    return true;
  }
  clearMandatoryFlag(next);
  return resumePendingMandatory();
}

function openGaokaoV3(afterDone) {
  const gkRep = rollOrGetExamResult(state, 'gk');
  const score = gkRep.finalScore;
  // P1-04：668 特招线仅认正式冲刺经历 exp_gaokao_sprint，杜绝 XP/羁绊旁路
  const hasSprint = state.experiences.includes('exp_gaokao_sprint');
  const wantsMed = (state.dreams?.d_surgeon?.stage || 0) >= 1;
  const exprBonus = (state.origin.id === 'middle' ? 5 : 0) + (state.talent.id === 't_vision' ? 5 : 0);

  showV3Capture({
    compactViewfinder: true,
    badge: `18 岁全国高考 (${gkRep.track === 'art' ? '文科卷' : '理科卷'})`,
    title: `高考总分：${score} / 750 分 · 填报志愿`,
    photoCaption: `18岁高考 ${score}分`,
    bodyHtml: `
      <div class="gk-score-card">
        ${gkRep.rows.map(r => `
          <div class="gk-subj-cell">
            <span>${r.label}</span>
            <b>${r.score}</b>
            <small>/${r.full}</small>
          </div>
        `).join('')}
      </div>
      <p style="font-size:11.5px;color:var(--muted);margin:0 0 7px;">
        预测区间 ${gkRep.minTotal}~${gkRep.maxTotal}分 · 留学池 ¥${fmtMoney(state.studyAbroadLeft)}${hasSprint ? ' · 已享冲刺特招资格(668线)' : ''}
      </p>
      <div style="display:flex;flex-direction:column;gap:6px;">
        ${UNIVERSITIES.map(u => {
          const reqSc = (u.tier === 1 && !u.abroad && hasSprint) ? (u.sprintScore || 668) : u.minScore;
          const ok = u.abroad
            ? state.studyAbroadLeft >= u.cost && score >= u.minScore && (state.stats.expr + exprBonus) >= u.minExpr
            : score >= reqSc;
          let lackReason = `差${Math.max(1, reqSc - score)}分`;
          if (!ok && u.abroad) {
            if (score < u.minScore) lackReason = `差${u.minScore - score}分`;
            else if (state.studyAbroadLeft < u.cost) lackReason = '留学池不足';
            else if ((state.stats.expr + exprBonus) < u.minExpr) lackReason = `表达差${u.minExpr - (state.stats.expr + exprBonus)}`;
          }
          const medBadge = (wantsMed && u.tier <= 2 && !u.abroad) ? ' · 临床医学本硕博' : '';
          return `<button class="action-card" style="padding:9px 12px;" data-u="${u.id}" ${ok?'':'disabled'}>
            <div class="ac-top" style="font-size:13.5px;"><span>${u.name}${medBadge}</span><span>${ok ? '达线可报' : lackReason}</span></div>
            <div class="ac-sub" style="font-size:11.5px;">${u.note}</div>
          </button>`;
        }).join('')}
        ${!state.repeatedGaokao && score < 680 ? `
          <button class="btn secondary" id="gk-repeat" style="margin-top:3px;">不甘心 · 复读高四再战一年（心态 -8，全科保留冲高分）</button>
        ` : ''}
      </div>
    `,
    onDone: (host, finish) => {
      const repBtn = host.querySelector('#gk-repeat');
      if (repBtn) {
        repBtn.onclick = () => {
          state.repeatedGaokao = true;
          // P1-04：复读不再把年龄倒拨回 17 岁导致重复年结，保留 18 岁第 3 季高四冲刺，19 岁再考
          state.age = 18;
          state.subTurn = 3;
          state.stats.mood = clamp(state.stats.mood - 8);
          state.examSeed = (state.examSeed || 100000) + 77;
          delete state.examHistory.gk;
          clearMandatoryFlag('gaokao');
          saveAutoProgress();
          finish();
          showToast('毅然选择高四复读！继承当前全部学识、数理与四科底子再冲刺！');
        };
      }
      host.querySelectorAll('[data-u]').forEach(b => {
        b.onclick = () => {
          const u = UNIVERSITIES.find(x => x.id === b.dataset.u);
          state.university = u; state.gaokaoDone = true; state.gradAge = (state.repeatedGaokao ? 19 : 18) + u.years;
          clearMandatoryFlag('gaokao');
          if (u.abroad) {
            state.parentSupportLeft = Math.max(0, state.parentSupportLeft - u.cost);
            state.studyAbroadLeft -= u.cost;
          }
          // 追梦高考联动：985及以上取得本硕博临床医学准入学籍；第一档顶尖学府直通清北圆梦！
          if (u.tier <= 2 && !u.abroad && state.dreams?.d_surgeon) {
            state.dreams.d_surgeon.medQualified = true;
          }
          if (score < 620 && (state.origin.id === 'teacher' || state.origin.id === 'welloff')) {
            state.stats.mood = clamp(state.stats.mood - (state.origin.id === 'teacher' ? 6 : 5));
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
          showToast(`高考 ${score} 分，已被「${u.name}」录取！${extraToast}`);
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

  const overlayShell = gameId === 'rhythm_master'
    ? `<div class="sd-full-overlay rm3-full-overlay" id="mg-box"></div>`
    : `<div class="sheet-modal"><div class="sheet-box" id="mg-box"></div></div>`;
  mountOverlay(overlayShell, host => {
    const box = host.id === 'mg-box' ? host : (host.querySelector('#mg-box') || host);
    const gameFnMap = {
      ring_toss: openRingTossGame,
      nostalgia_link: openNostalgiaLinkGame,
      bell_dash: openBellDashGame,
      work_slice: openWorkSliceGame,
      red_packet_rain: openRedPacketRainGame,
      lake_fishing: openLakeFishingGame,
      rhythm_master: openRhythmMasterGame,
      spot_bug: openSpotBugGame,
      spot_diff: openSpotDiffGame
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
          const moodGain = Math.round((res.mood || 0) + (hasHex(state, 'hx_arcade_pro') ? 2 : 0));
          state.cash += cashGain;
          state.stats.mood = clamp(state.stats.mood + moodGain);
          if (res.know) state.stats.knowledge = clamp(state.stats.knowledge + Math.round(res.know));
          if (res.expr) state.stats.expr = clamp(state.stats.expr + Math.round(res.expr));
          if (res.pro) state.stats.pro = clamp(state.stats.pro + Math.round(res.pro));
          if (res.health) state.stats.health = clamp(state.stats.health + Math.round(res.health));
          if (res.fatigueDelta) state.stats.fatigue = clamp(state.stats.fatigue + Math.round(res.fatigueDelta));
          if (res.familyInt) state.relations.parents.intimacy = clamp(state.relations.parents.intimacy + Math.round(res.familyInt));
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
        if (res.hardSBonus && !state.arcadeFirstS.includes('rhythm_hard_s')) {
          state.arcadeFirstS.push('rhythm_hard_s');
          state.hexRerollTickets = (state.hexRerollTickets || 0) + 1;
          extraTail += ' · 挑战困难评S另赠重随券 +1！';
        }
        saveAutoProgress();
        clearOverlay();
        render();
        showToast(`${res.note}${keepsakeNote}${extraTail}`);
        if (opts.onAfterDone) opts.onAfterDone();
      }
    );
  });
}

// 到了对应人生阶段自动弹出的 V3 情境奇遇卡（去数值化心境样式，无需从菜单找小游戏）
function showStageArcadePopup(moment, afterDone) {
  const stageIdx = getSubStageIndex(state.age);
  const stamp = getDateStamp(state.age, state.subTurn);
  const spUrl = sprites[state.gender]?.[stageIdx] || '';

  mountOverlay(`
    <div class="v3-overlay ev3-root">
      ${buildEventVignetteHtml(moment, state, spUrl, stamp)}
      <div class="film-sprockets">${'<i></i>'.repeat(12)}</div>
      <div class="ev3-body">
        <div class="ev3-letter">
          <span class="ev3-tape left"></span>
          <span class="ev3-tape right"></span>
          <div class="ev3-letter-head">
            <span class="ev3-postmark"><i>岁月</i><i>奇遇</i></span>
            <h3 class="ev3-title">${moment.title}</h3>
          </div>
          <p class="ev3-summary">${moment.summary}</p>
        </div>

        <div class="ev3-choices">
          <button class="ev3-choice-card res" id="sa-go">
            <div class="ev3-medallion">${pxIcon('gamepad', 22)}</div>
            <div class="ev3-c-body">
              <div class="ev3-c-top">
                <b class="ev3-c-main">${moment.playLabel.split('（')[0]}</b>
                <span class="gold-badge">${pxIcon('spark', 11)} 阶段触发</span>
              </div>
              <div class="ev3-whisper">“难得撞上这么有趣的时刻，当然要上手试一把！”</div>
            </div>
            <span class="ev3-ink-stamp">亲身体验</span>
          </button>

          <button class="ev3-choice-card" id="sa-pass">
            <div class="ev3-medallion">${pxIcon('life', 22)}</div>
            <div class="ev3-c-body">
              <div class="ev3-c-top"><b class="ev3-c-main">${moment.passLabel.split('（')[0]}</b></div>
              <div class="ev3-whisper">“今天还有别的事要忙，顺其自然带过也挺舒心。”</div>
            </div>
            <span class="ev3-ink-stamp">从容度日</span>
          </button>
        </div>

        <div class="ev3-footnote">凭心意做出选择 · 岁月自会留下回响</div>
      </div>
    </div>
  `, host => {
    const finish = () => { clearOverlay(); render(); };
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
      pulseTopHudForEffects(pe);
      if (afterDone) afterDone();
    };
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

// ===== 童年「校门口小卖部 V2」（三层实景木货架 + 手撕干脆面盲袋 + 课间找小周拍水浒卡）=====
function openTuckShopSheet() {
  ensureSprint1State(state);
  openTuckShopV2({
    state,
    mountOverlay,
    clearOverlay,
    saveAutoProgress,
    renderMain: render,
    showToast,
    fmtMoney
  });
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
  const noFee = hasHex(state, 'hx_shop_3') || getBondTier(state, 'wealth') >= 4 || state.origin.id === 'merchant' || state.talent.id === 't_biz';
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
  if (p.intimacy < 60) return showToast(`谈婚论嫁需伴侣好感度 ≥60（当前 ${p.intimacy}）`);
  mountOverlay(`<div class="sheet-modal"><div class="sheet-box">
    <h3 style="margin:0 0 8px;display:flex;align-items:center;gap:6px;">${pxIcon('heart', 17)} 谈婚论嫁（开启双收入合账）</h3>
    <div style="display:flex;flex-direction:column;gap:7px;">
      <button class="action-card" data-w="30000,4" ${p.intimacy<75?'disabled':''}><div class="ac-top"><span>极简领证</span><span>-3万 (需好感度≥75)</span></div></button>
      <button class="action-card" data-w="250000,10"><div class="ac-top"><span>体面婚礼</span><span>-25万 (好感度+10)</span></div></button>
      <button class="action-card" data-w="500000,16"><div class="ac-top"><span>盛大婚礼</span><span>-50万 (好感度+16)</span></div></button>
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

// ===== 终章「可分享复古人生纪念册海报」（P0-05：预览模式绝不清档、绝不解锁通关！）=====
function renderMemorial(isPreview = false) {
  const preview = Boolean(isPreview || memorialPreviewMode) && !state.ended;
  if (!preview) {
    localStorage.setItem('zhebeizi_cleared', '1');
    unlockedSelfPick = true;
  }
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
                <span>《这辈子 2.0》人生纪念册${preview ? '（预览）' : ''}</span>
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
                  <span class="poster-seal">${preview ? '阶段预览' : '终章定格'}</span>
                  <h2>${ev.title}</h2>
                  <div class="poster-reason">${preview ? '当前人生进度实时预览（未结案）' : state.endReason}</div>
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

          <!-- 分享 & 人生树回溯 & 返回或开启新一生 -->
          <div class="deed-card">
            <div class="sec-head-row">
              <span class="sec-title">${pxIcon('film', 16)} ${preview ? '预览操作' : '珍藏与人生树回溯'}</span>
              <button class="pill-btn soft" id="btn-share-poster" style="height:28px;font-size:11px;">${pxIcon('share', 13)} 复制战绩文案</button>
            </div>
            ${preview ? `
              <div class="poster-actions" style="margin-top:8px;">
                <button class="cta-main" id="btn-back-album" style="max-width:250px;width:78%;">返回相册继续这一生</button>
              </div>
            ` : `
              <div class="pill-actions" style="margin-bottom:12px;">
                ${[18, 30, 50].map(a => `<button class="pill-btn" data-rb="${a}" ${state.branches[a] ? '' : 'disabled'}>回到 ${a} 岁</button>`).join('')}
              </div>
              <div class="poster-actions">
                <button class="cta-main" id="btn-restart" style="max-width:250px;width:78%;">开启新的一生（自选出身）</button>
              </div>
            `}
          </div>
        </div>
        ${toastMsg ? `<div class="toast-ribbon" id="toast-close">${toastMsg}</div>` : ''}
      </div>
    </div>
  `;

  const tc = appEl.querySelector('#toast-close');
  if (tc) tc.onclick = () => { toastMsg = ''; renderMemorial(preview); };

  appEl.querySelector('#btn-share-poster').onclick = () => {
    const text = `我在《这辈子 2.0》活到 ${state.age} 岁，达成结局「${ev.title}」（出身${state.origin.name} → 净资产 ¥${fmtMoney(ev.netWorth)}），四维评级：${grades.map(x => `${x.lb}${x.g}`).join(' / ')}`;
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).catch(() => {});
    }
    showToast('复古战绩文案已复制，可直接截图上方海报分享！');
  };

  if (preview) {
    appEl.querySelector('#btn-back-album').onclick = () => {
      memorialPreviewMode = false;
      activeTab = 'album';
      render();
    };
  } else {
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
}

initSpritesAndRender();
