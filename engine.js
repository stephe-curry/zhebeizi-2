// 《这辈子 2.0》第 3 步纯策略灰盒原型 - 核心五维整数引擎、命运海克斯 2.0、排程 Combo 与双层周期流转
import {
  ORIGINS, CITIES, TRACKS, UNIVERSITIES, DREAMS, SPOUSE_BACKGROUNDS,
  ERA_TIMELINE, SUB_STAGES, PROMO_REQ, LEVEL_MULT, APPROVED_SYSTEM_ANCHORS
} from './data.js?v=s70';
import {
  HEX_NODES, HEX_CARD_MAP, hasHex, getHexInstance, getBondTier
} from './hextech.js?v=s70';
import {
  SEASONAL_MAP, detectCombos, rollSeasonalOfferIds
} from './combos.js?v=s70';
import {
  getMilestoneEventForTurn, rollMidTurnRandomEvent
} from './events.js?v=s70';
import {
  advancePetYear
} from './lifeFeatures.js?v=s70';
import { ensureRomanceState, checkPartnerBreakupOnTurnEnd } from './romanceSystem.js?v=s70';
import { ensureWishbookState } from './wishbook.js?v=s70';
import {
  ensureDreamState, getDreamScheduleActions, executeDreamAction,
  rollDreamLifecycleEvent, applyDreamAnnualPassives, syncLegacyDreamFields
} from './dreams.js?v=s70';
import { rollStageArcadeMoment } from './arcadeGames.js?v=s70';
import {
  SUBJECT_META, ensureExamState, syncVisibleAcademicStats, getStageTextbookCap,
  pickRecommendedSubject, applySubjectStudyStep, simulateSubjectStudyStep,
  applyDirectAcademicAction, makeStudentSnapshotFromState, advanceChildSubTurnCursor, applyParentTutorToChild
} from './examSystem.js?v=s70';

export function clamp(v, min = 0, max = 100) {
  return Math.max(min, Math.min(max, Math.round(v)));
}

export function ensureSprint1State(s) {
  if (!s) return s;
  // P1-17：更深残缺旧档全量防御补齐，杜绝 TypeError
  if (!s.stats || typeof s.stats !== 'object') {
    s.stats = { knowledge: 20, numLogic: 20, pro: 0, expr: 20, selfCare: 20, health: 80, mood: 70, fatigue: 0 };
  }
  if (!s.floors || typeof s.floors !== 'object') s.floors = { knowledge: 0, numLogic: 0, pro: 0, expr: 0, selfCare: 0 };
  if (!s.usedThisYear || typeof s.usedThisYear !== 'object') s.usedThisYear = {};
  if (!s.unusedYears || typeof s.unusedYears !== 'object') s.unusedYears = { knowledge: 0, numLogic: 0, pro: 0, expr: 0, selfCare: 0 };
  if (!s.relations || typeof s.relations !== 'object') s.relations = { parents: { intimacy: 70, missedTurns: 0 }, friend: { name: '同桌小周', intimacy: 55, missedTurns: 0 }, partner: null };
  if (!s.relations.parents) s.relations.parents = { intimacy: 70, missedTurns: 0 };
  if (!s.relations.friend) s.relations.friend = { name: '同桌小周', intimacy: 55, missedTurns: 0 };
  if (!s.templates || typeof s.templates !== 'object') s.templates = { balance: [] };
  if (!Array.isArray(s.templates.balance)) s.templates.balance = [];
  if (!s.branches || typeof s.branches !== 'object') s.branches = {};
  if (!Array.isArray(s.albumPhotos)) s.albumPhotos = [];
  if (!Array.isArray(s.experiences)) s.experiences = [];
  if (!Array.isArray(s.items)) s.items = [];
  if (!Array.isArray(s.triggeredEvents)) s.triggeredEvents = [];
  if (!Array.isArray(s.lastDraft)) s.lastDraft = [];
  if (!Array.isArray(s.pendingMandatory)) s.pendingMandatory = [];
  if (!Array.isArray(s.hexCards)) s.hexCards = [];
  if (!Array.isArray(s.hexTriggeredAges)) s.hexTriggeredAges = [];
  if (typeof s.hexRerollTickets !== 'number') s.hexRerollTickets = 0;
  if (!Array.isArray(s.discoveredCombos)) s.discoveredCombos = [];
  if (typeof s.comboCountTotal !== 'number') s.comboCountTotal = 0;
  if (typeof s.hexComboRewardTier !== 'number') s.hexComboRewardTier = 0;
  if (typeof s.gaokaoHexBonus !== 'number') s.gaokaoHexBonus = 0;
  if (typeof s.gaokaoQualifierBonus !== 'number') s.gaokaoQualifierBonus = 0;
  if (typeof s.bonusSeasonalId === 'undefined') s.bonusSeasonalId = null;
  if (!s.seasonOffer) s.seasonOffer = null;
  // Sprint 2 字段兼容
  if (typeof s.pet === 'undefined') s.pet = null;
  if (typeof s.stageHotspot === 'undefined') s.stageHotspot = null;
  if (typeof s.tuckUnlocked !== 'boolean') s.tuckUnlocked = s.age >= 7;
  if (!Array.isArray(s.snackCards)) s.snackCards = [];
  if (typeof s.dupSnackCards !== 'number') s.dupSnackCards = 0;
  if (!Array.isArray(s.claimedCardMilestones)) s.claimedCardMilestones = [];
  if (typeof s.tuckGiftThisTurn !== 'boolean') s.tuckGiftThisTurn = false;
  if (typeof s.houseListings === 'undefined') s.houseListings = null;
  if (!Array.isArray(s.eventFlags)) s.eventFlags = [];
  if (!Array.isArray(s.statusBuffs)) s.statusBuffs = [];
  // Sprint 2.5：四阶追梦 + 行情历史折线 + 海克斯引导标记
  if (!Array.isArray(s.goldHistory)) s.goldHistory = [700, 710, s.goldPrice || 720];
  if (!Array.isArray(s.houseIdxHistory)) s.houseIdxHistory = [98, 100, 102];
  if (typeof s.goldAvgCost !== 'number') s.goldAvgCost = s.goldPrice || 720;
  if (typeof s.hexGuideShown !== 'boolean') s.hexGuideShown = false;
  // Sprint 3：街角游艺厅评级记录、首通 S 重随券记录与每季防刷限额
  if (!s.arcadeBestGrades || typeof s.arcadeBestGrades !== 'object') s.arcadeBestGrades = {};
  if (!Array.isArray(s.arcadeFirstS)) s.arcadeFirstS = [];
  if (!Array.isArray(s.seenArcadeMoments)) s.seenArcadeMoments = [];
  if (typeof s.arcadePlayedThisTurn !== 'boolean') s.arcadePlayedThisTurn = false;
  ensureDreamState(s);
  ensureExamState(s);
  ensureRomanceState(s);
  ensureWishbookState(s);

  // P1-21：历史旧档缺失强制决策队列自动重建
  const pushMand = (k) => { if (!s.pendingMandatory.includes(k)) s.pendingMandatory.push(k); };
  if (!s.sportsDayDone && (s.age > 14 || (s.age === 14 && s.subTurn >= 3))) {
    pushMand('sports_day');
  }
  const gkAge = s.gaokaoNextAge || 18;
  const gkSub = s.gaokaoNextSubTurn || 2;
  const pastGk = s.age > gkAge || (s.age === gkAge && s.subTurn > gkSub);
  if (!s.gaokaoDone && pastGk) {
    pushMand('gaokao');
  }
  if (!s.track && s.gaokaoDone && s.age >= (s.gradAge || 22)) {
    pushMand('grad');
  }
  if (!s.schoolTier && (s.age > 15 || (s.age === 15 && s.subTurn >= 3)) && s.age <= 18) {
    pushMand('event_ms_zhongkao_15');
  }
  return s;
}

export function getEffectiveFatigueLimit(state) {
  let lim = state.origin.fatigueLimit;
  if (hasHex(state, 'hx_sleep_2')) lim += 5;
  if (getBondTier(state, 'zen') >= 2) lim += 2;
  return lim;
}

export function getPendingHextechAge(state) {
  ensureSprint1State(state);
  if (!HEX_NODES.includes(state.age)) return null;
  if (state.hexTriggeredAges.includes(state.age)) return null;
  // 22 岁等毕业择城弹窗选完城市与职业曲线后再弹，确保 22 岁专属卡感知你的择城
  if (state.age === 22 && state.age === state.gradAge && !state.track) return null;
  return state.age;
}

export function getSeasonalOfferForTurn(state) {
  ensureSprint1State(state);
  const key = `${state.age}-${state.subTurn}`;
  if (!state.seasonOffer || state.seasonOffer.key !== key) {
    const extra = (getBondTier(state, 'luck') >= 2 ? 1 : 0) + (hasHex(state, 'hx_arcade_pro') ? 1 : 0);
    const ids = rollSeasonalOfferIds(state, extra);
    if (state.bonusSeasonalId && SEASONAL_MAP[state.bonusSeasonalId] && !ids.includes(state.bonusSeasonalId)) {
      ids.push(state.bonusSeasonalId);
      state.bonusSeasonalId = null;
    }
    state.seasonOffer = { key, ids };
  }
  return state.seasonOffer.ids.map(id => SEASONAL_MAP[id]).filter(Boolean);
}

export function monthlyPmt(loan, rate = 0.03, years = 20) {
  if (loan <= 0) return 0;
  const r = rate / 12;
  const n = years * 12;
  return Math.round((loan * r) / (1 - Math.pow(1 + r, -n)));
}

export function getSubStage(age) {
  return SUB_STAGES.find(s => age >= s.min && age <= s.max) || SUB_STAGES[SUB_STAGES.length - 1];
}

export function getSubStageIndex(age) {
  const idx = SUB_STAGES.findIndex(s => age >= s.min && age <= s.max);
  return idx >= 0 ? idx : SUB_STAGES.length - 1;
}

export function getDateStamp(age, subTurn) {
  const year = 1992 + age; // 6岁=1998, 8岁=2000千禧年!
  const month = String(Math.min(12, subTurn * 3)).padStart(2, '0');
  return `${year}.${month}`;
}

export function getMacroParams(age) {
  if (age <= 18) return { macro: 'child', subTurns: 3, yearSlots: 12, baseSlots: 4 };
  if (age <= 50) return { macro: 'adult', subTurns: 4, yearSlots: 20, baseSlots: 5 };
  return { macro: 'elder', subTurns: 3, yearSlots: 12, baseSlots: 4 };
}

export function createInitialState(originId, talentId, gender = 'male') {
  const origin = ORIGINS.find(o => o.id === originId) || ORIGINS[1];
  const talent = origin.talents.find(t => t.id === talentId) || origin.talents[0];
  const ini = origin.initStats || { knowledge: 20, numLogic: 20, expr: 20, selfCare: 20, mood: 70, health: 80 };
  const initKnow = clamp(
    ini.knowledge
    + (talent.id === 't_book' ? 4 : 0)
    + (talent.id === 't_tutor' ? 2 : 0)
    + (talent.id === 't_shelf' ? 3 : 0)
  );
  const initNum = clamp(
    ini.numLogic
    + (talent.id === 't_grit' ? 3 : 0)
    + (talent.id === 't_mathfam' ? 3 : 0)
    + (talent.id === 't_cashflow' ? 4 : 0)
    + (talent.id === 't_rebel' ? 3 : 0)
  );
  const s = {
    gender,
    age: 6,
    subTurn: 1,
    totalTurns: 0,
    origin,
    talent,
    cityTier: origin.cityTier,
    // 五维核心（全面整数化）
    cash: origin.pocketMoney * 6 + (talent.id === 't_saver' ? 500 : 0) + (talent.id === 't_shopkid' ? 300 : 0),
    debt: 0,
    goldGrams: 0,
    house: null, // { id, tier, name, value, basePrice, loan, pmtMo, grid, buffActive, layout }
    hasCar: false,
    // 五项核心可见能力（学识 / 数理 / 专业 / 表达 / 自理理财）与保底里程碑
    stats: {
      knowledge: initKnow,
      numLogic: initNum,
      pro: 0,
      expr: clamp(ini.expr + (talent.id === 't_social' || talent.id === 't_vision' || talent.id === 't_street' ? 6 : 0) + (talent.id === 't_chalk' ? 5 : 0)),
      selfCare: clamp(ini.selfCare + (talent.id === 't_early' ? 5 : 0) + (talent.id === 't_saver' || talent.id === 't_shopkid' ? 6 : 0) + (talent.id === 't_biz' || talent.id === 't_rebel' ? 10 : 0)),
      health: clamp(ini.health + (talent.id === 't_health' ? 6 : 0)),
      mood: clamp(ini.mood + (talent.id === 't_art' || talent.id === 't_chalk' ? 4 : 0) + (talent.id === 't_koi2' ? 8 : 0)),
      fatigue: 0
    },
    statsRaw: { knowledge: initKnow, numLogic: initNum },
    halfProgress: { knowledge: 0, numLogic: 0, pro: 0, expr: 0, selfCare: 0, dream: 0 },
    floors: { knowledge: 0, numLogic: 0, pro: 0, expr: 0, selfCare: 0 },
    unusedYears: { knowledge: 0, numLogic: 0, pro: 0, expr: 0, selfCare: 0 },
    usedThisYear: { knowledge: false, numLogic: false, pro: false, expr: false, selfCare: false },
    // 教育与职业
    gaokaoDone: false,
    university: null,
    gradAge: 22,
    track: null,
    jobLevel: 1,
    yearsInLevel: 0,
    workYearsTotal: 0,
    last5Salaries: [],
    pensionMo: 0,
    retired: false,
    rehireActive: false,
    aiSkillLearned: false,
    projectCount: 0,
    // 梦想
    activeDreams: [], // 18岁后最多聚焦 2 条
    dreamSkill: talent.id === 't_dream' ? 8 : (talent.id === 't_art' ? 12 : (origin.id === 'middle' ? 6 : 0)),
    dreamCompleted: false,
    // 关系网
    relations: {
      parents: { name: '父母', intimacy: 65, missedTurns: 0, helpedThisYear: false },
      friend: { name: '同桌小周', intimacy: 35 + (talent.id === 't_social' || talent.id === 't_street' ? 8 : 0), missedTurns: 0, helpedThisYear: false },
      partner: null // { name, bgId, incomeMult, intimacy, married, missedTurns }
    },
    child: null, // { bornAge, tierCost, study, mood, bond }
    choseDink: false,
    elderCircle: false,
    elderCircleProgress: 0,
    worldTrips: 0,
    // 时代与行情（含 ±1-2 年微扰）
    eraShift: Math.floor(Math.random() * 3) - 1,
    goldPrice: 720,
    // 当年/当回合计数器
    tutoredThisYear: 0,
    overtimeThisYear: 0,
    emoBuyThisYear: 0,
    emoBuyThisTurn: false,
    lotteryThisTurn: false,
    pubStreak: 0,
    flipGameThisYear: 0,
    // 留痕、旧物、相册照片墙与分叉点
    items: [],
    experiences: [],
    traits: [origin.buff, talent.name],
    triggeredEvents: [],
    albumPhotos: [
      { age: 6, stamp: '1998.09', title: '背起书包 · 人生正式起步', stageIdx: 0, bg: 'child' }
    ],
    lastDraft: [],
    templates: {
      grind: [],
      balance: [],
      chill: []
    },
    branches: {}, // { 18: snapshot, 30: snapshot, 50: snapshot }
    logs: [],
    // 终局控制
    extendedTo90: false,
    ended: false,
    endReason: '',
    // 父母资助剩余额度
    parentSupportLeft: origin.downpaySupport,
    studyAbroadLeft: origin.studyAbroadFund,
    parentReservePenalty: 0,
    // Sprint 1：命运海克斯 2.0 + 排程 Combo + 季节限定贴纸
    hexCards: [],
    hexTriggeredAges: [],
    hexRerollTickets: 0,
    discoveredCombos: [],
    comboCountTotal: 0,
    hexComboRewardTier: 0,
    gaokaoHexBonus: 0,
    bonusSeasonalId: null,
    seasonOffer: null,
    // Sprint 2：养宠物 + 舞台闪光彩蛋 + 童年小卖部 + 实景看房 + 随机事件状态/伏笔
    pet: null,
    stageHotspot: null,
    tuckUnlocked: false,
    snackCards: [],
    tuckGiftThisTurn: false,
    houseListings: null,
    eventFlags: [],
    statusBuffs: []
  };
  updateMilestones(s);
  ensureSprint1State(s);
  return s;
}

export function getCurrentEra(state) {
  const shiftedAge = Math.max(6, Math.min(90, state.age + state.eraShift));
  return ERA_TIMELINE.find(e => shiftedAge >= e.start && shiftedAge <= e.end) || ERA_TIMELINE[ERA_TIMELINE.length - 1];
}

export function getNextYearHint(state) {
  const cur = getCurrentEra(state);
  const nextAge = Math.max(6, Math.min(90, state.age + 1 + state.eraShift));
  const nxt = ERA_TIMELINE.find(e => nextAge >= e.start && nextAge <= e.end) || cur;
  if (nxt.name !== cur.name) {
    return `【明年时代转向预警】即将进入「${nxt.name}」：${nxt.hint}`;
  }
  return `当前时代「${cur.name}」：${cur.hint}`;
}

export function getCurrentMonthlySalary(state) {
  if (state.age < state.gradAge || !state.university || !state.track || state.retired) return 0;
  ensureSprint1State(state);
  const city = CITIES[state.cityTier];
  const era = getCurrentEra(state);
  const lvlMult = LEVEL_MULT[state.jobLevel] || 1.0;
  const effectiveYears = state.age > state.track.capAge
    ? Math.max(0, state.yearsInLevel - (state.age - state.track.capAge))
    : state.yearsInLevel;
  const tenureBonus = Math.min(0.21, effectiveYears * 0.03);
  let mult = 1.0;
  if (state.track.id === 'burst' && era.name === '新经济红利期') mult += 0.10;
  if (state.track.id === 'longtail' && state.origin.id === 'welloff') mult += 0.08;
  if ((state.track.id === 'burst' || state.track.id === 'steady') && (state.stats.numLogic || 0) >= 75) mult += 0.05;
  if (state.stats.knowledge >= 75) mult += 0.04;
  if (state.university.abroad && era.name === '房产黄金周期') mult -= 0.08; // 海归贬值信号
  if (state.aiSkillLearned && state.age >= 43) mult += ((state.stats.numLogic || 0) >= 70 ? 0.14 : 0.10);
  // 海克斯乘区严格走加法汇总，防止连乘通胀
  if (hasHex(state, 'hx_shop_3')) mult += 0.22;
  if (hasHex(state, 'hx_ai_pioneer')) mult += 0.15;
  if (hasHex(state, 'hx_surgeon_blade')) mult += 0.20;
  if (hasHex(state, 'hx_tsinghua_link')) mult += 0.12;
  if (state.dreams?.d_surgeon?.outcome === 'success') mult += 0.15;
  if (hasHex(state, 'hx_duo_referral')) {
    let vipCount = 0;
    if (state.relations.parents.intimacy >= 70) vipCount++;
    if (state.relations.friend.intimacy >= 70) vipCount++;
    if (state.relations.partner && state.relations.partner.intimacy >= 70) vipCount++;
    mult += vipCount * 0.06;
  }
  if (getBondTier(state, 'dream') >= 4) {
    mult += Math.min(0.18, Math.floor((state.dreamSkill || 0) / 5) * 0.01);
  }
  return Math.round(state.university.baseSalary * city.salaryCoef * state.track.coef * (lvlMult + tenureBonus) * Math.max(0.5, mult));
}

export function getTurnSlotBudget(state) {
  ensureSprint1State(state);
  const mp = getMacroParams(state.age);
  let slots = mp.baseSlots;
  const city = CITIES[state.cityTier];
  // 三线城市慢生活：每年第 2 子回合额外 +1 格
  if (state.age >= state.gradAge && city.extraSlot && state.subTurn === 2) slots += 1;
  // 海克斯时间槽增益（全生单季硬上限 7 格）
  if (hasHex(state, 'hx_time_master') && state.subTurn === 2) slots += 1;
  if (hasHex(state, 'hx_minimalist') && (state.subTurn === 1 || state.subTurn === 3)) slots += 1;
  // 在职住普通远郊房：一线第1/3子回合各锁1格，二线第1子回合锁1格；买代步车或购入地铁口房型直接抵消通勤锁格！
  let commuteLocked = 0;
  if (state.house && state.house.tier === '普通' && state.house.trait !== 'no_commute' && !state.hasCar && !state.retired && state.age >= state.gradAge) {
    if (city.commuteLock === 2 && (state.subTurn === 1 || state.subTurn === 3)) commuteLocked = 1;
    if (city.commuteLock === 1 && state.subTurn === 1) commuteLocked = 1;
  }
  const healthThresh = getBondTier(state, 'zen') >= 2 ? 20 : 30;
  let healthPenalty = state.stats.health < healthThresh ? 1 : 0;
  // 0-3 岁育儿刚性占 1 格（可通过请父母代班即时释放）
  let babyLock = (state.child && state.age - state.child.bornAge <= 3 && !state.relations.parents.helpedThisYear) ? 1 : 0;
  const available = Math.min(7, Math.max(2, slots - commuteLocked - healthPenalty - babyLock));
  return { base: slots, commuteLocked, healthPenalty, babyLock, available };
}

export function trainStat(state, key, extra = 0, opts = {}) {
  ensureSprint1State(state);
  const isLowMood = state.stats.mood < 30;
  const cur = key === 'dream' ? state.dreamSkill : state.stats[key];
  const scholarTier = getBondTier(state, 'scholar');
  let gain = 0;
  if (cur < 60) gain = 2;
  else if (cur < 85) gain = 1;
  else if (scholarTier >= 4) {
    // 内卷 4 羁绊：突破 85 免双倍蓄力
    gain = 1;
  } else {
    state.halfProgress[key] = (state.halfProgress[key] || 0) + 1;
    if (state.halfProgress[key] >= 2) {
      gain = 1;
      state.halfProgress[key] = 0;
    }
  }
  // 付费补习规则：能力 <85 时额外 +1
  if (extra > 0 && cur < 85) gain += extra;
  // 海克斯单项加成 & Sprint 2 动态状态 Buff 加成 & P1-14 清北和解永久特质同步生效
  const hasBuff = id => (state.statusBuffs || []).some(b => b.id === id);
  if ((key === 'knowledge' || key === 'pro') && state.dreams?.d_tsinghua?.outcome === 'pivot') gain += 1;
  if (key === 'knowledge' && (hasBuff('bf_hot_study') || hasBuff('bf_key_class') || hasBuff('bf_key_high') || hasBuff('bf_sprint'))) gain += 1;
  if (key === 'pro' && hasBuff('bf_work_star')) gain += 1;
  if (key === 'selfCare' && hasHex(state, 'hx_shop_1')) gain += 1;
  if (key === 'expr' && (hasHex(state, 'hx_social_bull') || hasHex(state, 'hx_pop_1'))) gain += 1;
  if (key === 'dream' && hasHex(state, 'hx_dream_spark')) gain += 1;
  if (key === 'dream' && getBondTier(state, 'dream') >= 2) gain = Math.max(gain + 1, Math.round(gain * 1.5));
  if (opts.solo && hasHex(state, 'hx_solo_genius') && gain > 0) gain = Math.max(gain + 1, Math.round(gain * 1.5));
  if (opts.doubleFlow && gain > 0) gain *= 2;
  // 错题复盘本暴击
  const errBook = getHexInstance(state, 'hx_errbook');
  if (errBook && errBook.stacks > 0 && (key === 'knowledge' || key === 'pro') && gain > 0 && Math.random() < errBook.stacks * 0.06) {
    gain *= 2;
  }
  // 心态 <30 训练收益减半（工薪韧性 & 内卷 2 羁绊可豁免）
  const exemptMood = state.origin.id === 'working' || (scholarTier >= 2 && (key === 'knowledge' || key === 'pro'));
  if (isLowMood && !exemptMood && gain > 1) {
    gain = Math.floor(gain / 2);
  }
  if (key === 'dream') {
    state.dreamSkill = clamp(state.dreamSkill + gain);
  } else {
    state.stats[key] = clamp(state.stats[key] + gain);
    state.usedThisYear[key] = true;
    state.unusedYears[key] = 0;
  }
  return gain;
}

export function updateMilestones(state) {
  for (const k of ['knowledge', 'numLogic', 'pro', 'expr', 'selfCare']) {
    const v = state.stats[k] || 0;
    if (v >= 85) state.floors[k] = Math.max(state.floors[k] || 0, 65);
    else if (v >= 60) state.floors[k] = Math.max(state.floors[k] || 0, 45);
    else if (v >= 30) state.floors[k] = Math.max(state.floors[k] || 0, 20);
  }
}

function statChip(state, key, label, extra = 0, solo = false) {
  ensureSprint1State(state);
  const cur = key === 'dream' ? state.dreamSkill : state.stats[key];
  const scholarTier = getBondTier(state, 'scholar');
  let g = cur < 60 ? 2 : (cur < 85 ? 1 : (scholarTier >= 4 ? 1 : 0));
  if (extra > 0 && cur < 85) g += extra;
  const hasBuff = id => (state.statusBuffs || []).some(b => b.id === id);
  if (key === 'knowledge' && (hasBuff('bf_hot_study') || hasBuff('bf_key_class') || hasBuff('bf_key_high') || hasBuff('bf_sprint'))) g += 1;
  if (key === 'pro' && (hasBuff('bf_work_star') || state.dreams?.d_tsinghua?.outcome === 'pivot')) g += 1;
  if (key === 'selfCare' && hasHex(state, 'hx_shop_1')) g += 1;
  if (key === 'expr' && (hasHex(state, 'hx_social_bull') || hasHex(state, 'hx_pop_1'))) g += 1;
  if (solo && hasHex(state, 'hx_solo_genius') && g > 0) g = Math.max(g + 1, Math.round(g * 1.5));
  const exemptMood = state.origin.id === 'working' || (scholarTier >= 2 && (key === 'knowledge' || key === 'pro'));
  if (state.stats.mood < 30 && !exemptMood && g > 1) g = Math.floor(g / 2);
  if (cur >= 85 && scholarTier < 4) {
    return (state.halfProgress[key] || 0) >= 1
      ? { t: `${label} +1`, k: 'pos' }
      : { t: `${label} 高阶蓄力`, k: 'neu' };
  }
  return { t: `${label} +${g}`, k: 'pos' };
}

export function getAvailableActions(state) {
  ensureSprint1State(state);
  const actions = [];
  const isChild = state.age <= 18;
  const isUni = state.age >= 19 && state.age < state.gradAge;
  const isAdult = state.age >= state.gradAge && state.age <= 50;
  const isElder = state.age >= 51;
  const isWorking = state.age >= state.gradAge && !state.retired;

  const cashMult = 1
    + (hasHex(state, 'hx_shop_1') && isChild ? 0.5 : 0)
    + (hasHex(state, 'hx_shop_2') ? 0.6 : 0)
    + (hasHex(state, 'hx_tuck_king') && isChild ? 0.5 : 0)
    + (state.talent?.id === 't_cashflow' ? 0.15 : 0);

  // 1. 成长与学习（Sprint 6 直白化：拆成「文科阅读（涨学识）」与「数理解题（涨数理）」+「课外补习（文理双提）」）
  if (isChild) {
    const snap = makeStudentSnapshotFromState(state);
    const simLit = simulateSubjectStudyStep(snap, 'chn', { solo: true });
    const simNum = simulateSubjectStudyStep(snap, 'math', { solo: true });
    actions.push({
      id: 'study_lit', cat: '1.成长与学习', name: '文科阅读（涨学识）', costCash: 0,
      chips: simLit.capped
        ? [{ t: `学识本阶已满(${simLit.D})`, k: 'gold' }]
        : [{ t: `学识 +${Math.max(1, Math.round(simLit.dLit))}`, k: 'pos' }, { t: '心态 -1', k: 'neg' }]
    });
    actions.push({
      id: 'study_num', cat: '1.成长与学习', name: '数理解题（涨数理）', costCash: 0,
      chips: simNum.capped
        ? [{ t: `数理本阶已满(${simNum.D})`, k: 'gold' }]
        : [{ t: `数理 +${Math.max(1, Math.round(simNum.dNum))}`, k: 'pos' }, { t: '心态 -1', k: 'neg' }]
    });
    const canTutor = state.tutoredThisYear < state.origin.eduLimit;
    const halfTutor = state.talent.id === 't_tutor' || state.origin.id === 'teacher';
    const tutorFee = halfTutor ? 60 : 120;
    const tutorMood = state.talent.id === 't_book' ? 1 : 2;
    const eduLimTxt = state.origin.eduLimit >= 99 ? '不限' : `${state.tutoredThisYear}/${state.origin.eduLimit}`;
    actions.push({
      id: 'study_tutor', cat: '1.成长与学习', name: `课外补习 (${eduLimTxt})`, costCash: tutorFee, disabled: !canTutor,
      chips: [{ t: '学识/数理双提', k: 'gold' }, { t: `心态 -${tutorMood}`, k: 'neg' }]
    });
    if (state.age >= 15 && state.schoolTier !== 'vocational') {
      actions.push({
        id: 'gaokao_sprint', cat: '1.成长与学习', name: '考前冲刺刷卷', costCash: 0,
        chips: [{ t: '文理全提', k: 'pos' }, { t: '冲刺经历', k: 'gold' }, { t: '疲劳 +2', k: 'neg' }]
      });
    }
  } else if (isUni) {
    actions.push({
      id: 'uni_study', cat: '1.成长与学习', name: '泡图书馆修学分', costCash: 0,
      chips: [statChip(state, 'pro', '专业', 0, true), { t: '学识 +1', k: 'pos' }, { t: '疲劳 +1', k: 'neu' }]
    });
    actions.push({
      id: 'uni_intern', cat: '1.成长与学习', name: '大厂实习与项目', costCash: 0,
      chips: [statChip(state, 'pro', '专业', 0), { t: '项目 +1', k: 'gold' }, { t: `补贴 +¥${Math.round(800 * cashMult)}`, k: 'pos' }, { t: '疲劳 +2', k: 'neu' }]
    });
  } else if (isAdult) {
    actions.push({
      id: 'pro_self', cat: '1.成长与学习', name: '专业自学', costCash: 0,
      chips: [statChip(state, 'pro', '专业', 0, true), { t: '心态 -1', k: 'neg' }, { t: '疲劳 +1', k: 'neu' }]
    });
    actions.push({
      id: 'pro_course', cat: '1.成长与学习', name: '导师项目课 / 新工具', costCash: 500,
      chips: [statChip(state, 'pro', '专业', hasHex(state, 'hx_ai_pioneer') ? 2 : 1), { t: `项目 +${hasHex(state, 'hx_ai_pioneer') ? 2 : 1}`, k: 'gold' }, { t: '心态 -2', k: 'neg' }]
    });
  } else {
    actions.push({
      id: 'elder_uni', cat: '1.成长与学习', name: '老年大学 / 防骗课', costCash: 200,
      chips: [statChip(state, 'knowledge', '学识', 0, true), { t: '心态 +2', k: 'pos' }, { t: '防骗', k: 'gold' }]
    });
  }

  // 2. 职业与搞钱
  if (isChild) {
    const pay = Math.round((state.origin.id === 'poor' ? 150 : 100) * cashMult);
    actions.push({
      id: 'chores', cat: '2.职业与搞钱', name: state.age <= 12 ? '做家务换零花' : '假期兼职', costCash: 0,
      chips: [{ t: `现金 +¥${pay}`, k: 'pos' }, statChip(state, 'selfCare', '自理', 0, true), { t: '疲劳 +1', k: 'neu' }]
    });
  } else if (isUni) {
    const ptPay = Math.round(1400 * cashMult);
    actions.push({
      id: 'uni_parttime', cat: '2.职业与搞钱', name: '大学生家教兼职', costCash: 0,
      chips: [{ t: `现金 +¥${ptPay.toLocaleString()}`, k: 'pos' }, statChip(state, 'expr', '表达'), { t: '疲劳 +2', k: 'neu' }]
    });
  } else if (isWorking) {
    const otPay = Math.round((state.overtimeThisYear < 4 ? 3000 : 1800) * (state.cityTier === 1 ? 1.2 : 1.0) * cashMult);
    actions.push({
      id: 'overtime', cat: '2.职业与搞钱', name: `加班 / 副业 (${state.overtimeThisYear}/8)`, costCash: 0, disabled: state.overtimeThisYear >= 8,
      chips: [{ t: `现金 +¥${otPay}`, k: 'pos' }, { t: '健康 -1', k: 'neg' }, { t: `疲劳 +${state.cityTier === 1 ? 4 : 3}`, k: 'neg' }]
    });
  } else if (isElder && state.retired && (state.track?.id === 'longtail' || state.jobLevel >= 4)) {
    const rhPay = Math.round(6000 * cashMult);
    actions.push({
      id: 'rehire_work', cat: '2.职业与搞钱', name: '专家返聘顾问', costCash: 0,
      chips: [{ t: `现金 +¥${rhPay.toLocaleString()}`, k: 'pos' }, { t: '疲劳 +2', k: 'neu' }]
    });
  }

  // 3. 情感与社交
  const soloBlocked = hasHex(state, 'hx_solo_genius');
  actions.push({
    id: 'accompany_parents', cat: '3.情感与社交', name: '陪伴父母', costCash: 0,
    chips: [{ t: '亲密 +4', k: 'pos' }, { t: '心态 +2', k: 'pos' }, { t: '共同经历', k: 'gold' }]
  });
  actions.push({
    id: 'accompany_friend', cat: '3.情感与社交', name: isChild ? '和同桌玩耍' : '约老友重聚', costCash: isChild ? 0 : 200,
    disabled: !isChild && soloBlocked,
    disabledReason: !isChild && soloBlocked ? '受「独处奇才」约束' : '',
    chips: [{ t: '亲密 +4', k: 'pos' }, statChip(state, 'expr', '表达'), { t: '心态 +2', k: 'pos' }]
  });
  if (state.age >= 19 && state.relations.partner) {
    actions.push({
      id: 'date_partner', cat: '3.情感与社交', name: state.relations.partner.married ? '夫妻约会' : '恋爱约会', costCash: 300,
      chips: [{ t: '伴侣好感度 +5', k: 'pos' }, { t: '心态 +3', k: 'pos' }]
    });
  }
  if (isElder) {
    actions.push({
      id: 'square_dance', cat: '3.情感与社交', name: '跳广场舞建圈', costCash: 0,
      chips: [{ t: '健康 +2', k: 'pos' }, { t: '心态 +2', k: 'pos' }, { t: '抗孤独', k: 'gold' }]
    });
  }

  // 4. 家庭与育儿（P1-07：0-5岁仅保留高质量陪娃，满 6 岁入学后才开放辅导功课）
  if (state.child && (state.age - state.child.bornAge) <= 18) {
    const kidAge = state.age - state.child.bornAge;
    if (kidAge >= 6) {
      const kf = state.tutorKidFocus || 'balanced';
      const kfLb = kf === 'lit' ? '补文科' : kf === 'num' ? '补理科' : '全科';
      const pBoost = (kf === 'lit' && state.stats.knowledge >= 70) || (kf === 'num' && state.stats.numLogic >= 70);
      actions.push({
        id: 'tutor_kid', cat: '4.家庭与育儿', name: `辅导孩子功课 (${kfLb})`, costCash: 0,
        chips: [{ t: pBoost ? '高学历点拨 ×1.35' : '娃分科提升', k: pBoost ? 'gold' : 'pos' }, { t: '心态 -2', k: 'neg' }, { t: '疲劳 +2', k: 'neu' }]
      });
    }
    actions.push({
      id: 'play_kid', cat: '4.家庭与育儿', name: '高质量陪娃', costCash: 100,
      chips: [{ t: '亲子羁绊 +4', k: 'pos' }, { t: '娃心态 +4', k: 'pos' }]
    });
  }

  // 5. 四阶自然追梦专属贴纸（偶遇点亮哪颗火种，才长出哪张具体贴纸！）
  const dreamActions = getDreamScheduleActions(state);
  for (const da of dreamActions) actions.push(da);

  // 6. 身心与生活
  const exH = (state.talent.id === 't_health' ? 3 : 2) * (hasHex(state, 'hx_sleep_2') ? 2 : 1);
  actions.push({
    id: 'exercise', cat: '6.身心与生活', name: isElder ? '太极 / 散步' : '体育锻炼', costCash: 0,
    chips: [{ t: `健康 +${exH}`, k: 'pos' }, { t: '疲劳 -2', k: 'pos' }]
  });
  actions.push({
    id: 'rest', cat: '6.身心与生活', name: '完整休息放空', costCash: 0,
    chips: [{ t: `心态 +${hasHex(state, 'hx_duo_warmzen') ? 5 : 3}`, k: 'pos' }, { t: `疲劳 -${state.house?.buffActive ? 5 : 4}`, k: 'pos' }]
  });
  if (state.age >= 26 && state.age <= 55) {
    actions.push({
      id: 'pub_drink', cat: '6.身心与生活', name: '去小酒馆微醺', costCash: 300,
      disabled: soloBlocked,
      disabledReason: soloBlocked ? '受「社恐天才」棱彩约束' : '',
      chips: [{ t: '心态 +6', k: 'pos' }, { t: '疲劳 -3', k: 'pos' }, { t: `健康 -${state.pubStreak >= 1 ? 2 : 1}`, k: 'neg' }]
    });
  }
  if (isElder && state.age >= 60) {
    const tripCost = hasHex(state, 'hx_duo_warmzen') ? 38000 : 50000;
    actions.push({
      id: 'world_trip', cat: '6.身心与生活', name: '环游世界一站', costCash: tripCost,
      chips: [{ t: '心态 +8', k: 'pos' }, { t: '圆梦进度 +1', k: 'gold' }]
    });
  }

  // 财富 2 羁绊：所有收费行动享 9 折
  const wealthDisc = getBondTier(state, 'wealth') >= 2 ? 0.9 : 1.0;
  if (wealthDisc < 1.0) {
    for (const a of actions) {
      if (a.costCash > 0) a.costCash = Math.round(a.costCash * wealthDisc);
    }
  }

  // 7. 本季限定金边贴纸（每季刷新，暑假大幅换盘！）
  const seasonalList = getSeasonalOfferForTurn(state);
  for (const s of seasonalList) {
    actions.push({
      ...s,
      costCash: s.costCash > 0 ? Math.round(s.costCash * wealthDisc) : 0
    });
  }

  return actions;
}

export function previewDraft(state, draftIds) {
  ensureSprint1State(state);
  const all = getAvailableActions(state);
  const isChild = state.age <= 18;
  const cashMult = 1
    + (hasHex(state, 'hx_shop_1') && isChild ? 0.5 : 0)
    + (hasHex(state, 'hx_shop_2') ? 0.6 : 0)
    + (hasHex(state, 'hx_tuck_king') && isChild ? 0.5 : 0);
  const natRec = (getBondTier(state, 'zen') >= 2 ? 4 : 2) + (hasHex(state, 'hx_sleep_1') ? 1 : 0);
  let cash = 0, health = 0, mood = 0, fatigue = -natRec;
  let hasWorkStudy = false, hasRestEx = false;
  const seenInDraft = {};

  for (const id of draftIds) {
    const a = all.find(x => x.id === id);
    if (!a) continue;
    const isFlowDup = hasHex(state, 'hx_flow_engine') && (seenInDraft[id] || 0) >= 1;
    seenInDraft[id] = (seenInDraft[id] || 0) + 1;
    cash -= a.costCash;
    if (['study_lit', 'study_num', 'study_self', 'study_tutor', 'gaokao_sprint', 'uni_study', 'uni_intern', 'pro_self', 'pro_course', 'overtime'].includes(id)) hasWorkStudy = true;
    if (['rest', 'exercise', 'square_dance'].includes(id)) hasRestEx = true;

    if (a.seasonal && a.effects) {
      const ef = a.effects;
      if (ef.cash) cash += Math.round(ef.cash * (hasHex(state, 'hx_tuck_king') && isChild ? 1.5 : 1));
      if (ef.health) health += ef.health;
      if (ef.mood) mood += ef.mood;
      if (ef.fatigue) fatigue += ef.fatigue;
      continue;
    }
    if (a.isDreamAction) {
      mood += (hasHex(state, 'hx_dream_spark') ? 2 : 1);
      if (a.dreamId === 'd_hurdle') health += (hasHex(state, 'hx_hurdle_wind') ? 2 : 1);
      if (getBondTier(state, 'dream') < 2) fatigue += 1;
      if (isFlowDup) fatigue += 2;
      continue;
    }
    if (id === 'study_lit' || id === 'study_num' || id === 'study_self' || id === 'pro_self') { if (!isFlowDup) mood -= 1; fatigue += 1; }
    if (id === 'uni_study') { fatigue += 1; }
    if (id === 'uni_intern') { cash += Math.round(800 * cashMult * (isFlowDup ? 2 : 1)); fatigue += 2; }
    if (id === 'uni_parttime') { cash += Math.round(1400 * cashMult * (isFlowDup ? 2 : 1)); fatigue += 2; }
    if (id === 'study_tutor' || id === 'pro_course') { if (!isFlowDup) mood -= 2; fatigue += 1; }
    if (id === 'gaokao_sprint') { if (!isFlowDup) mood -= 2; fatigue += 2; }
    if (id === 'elder_uni') { mood += 2; }
    if (id === 'chores') { cash += Math.round((state.origin.id === 'poor' ? 150 : 100) * cashMult); fatigue += 1; }
    if (id === 'overtime') {
      cash += Math.round((state.overtimeThisYear < 4 ? 3000 : 1800) * (state.cityTier === 1 ? 1.2 : 1.0) * cashMult);
      health -= 1; if (!isFlowDup) mood -= 2; fatigue += (state.cityTier === 1 ? 4 : 3);
    }
    if (id === 'rehire_work') { cash += Math.round(6000 * cashMult); fatigue += 2; }
    if (id === 'accompany_parents' || id === 'accompany_friend' || id === 'play_kid') { mood += 2; }
    if (id === 'date_partner') { mood += 3; }
    if (id === 'square_dance') { health += 2; mood += 2; fatigue -= 1; }
    if (id === 'tutor_kid') { if (!isFlowDup) mood -= 2; fatigue += 2; }
    if (id === 'train_dream') { mood += (hasHex(state, 'hx_dream_spark') ? 2 : 1); if (getBondTier(state, 'dream') < 2) fatigue += 1; }
    if (id === 'exercise') { health += (state.talent.id === 't_health' ? 3 : 2) * (hasHex(state, 'hx_sleep_2') ? 2 : 1); mood += (hasHex(state, 'hx_sleep_2') ? 3 : 1); fatigue -= 2; }
    if (id === 'rest') { mood += (hasHex(state, 'hx_duo_warmzen') ? 5 : 3); health += (hasHex(state, 'hx_sleep_1') ? 1 : 0) + (hasHex(state, 'hx_duo_warmzen') ? 2 : 0); fatigue -= (state.house?.buffActive ? 5 : 4); }
    if (id === 'pub_drink') { mood += 6; fatigue -= 3; health -= (state.pubStreak >= 1 ? 2 : 1); }
    if (id === 'world_trip') { mood += 8; fatigue += 1; }
    if (isFlowDup) fatigue += 2;
  }

  // 排程 Combo 预览叠加（严格校验阶段）
  const combos = detectCombos(draftIds, state);
  const cbMult = hasHex(state, 'hx_time_master') ? 2 : 1;
  for (const cb of combos) {
    if (cb.bonus.cash) cash += cb.bonus.cash * cbMult;
    if (cb.bonus.health) health += cb.bonus.health * cbMult;
    if (cb.bonus.mood) mood += cb.bonus.mood * cbMult;
    if (cb.bonus.fatigue) fatigue += cb.bonus.fatigue * cbMult;
  }
  if (hasHex(state, 'hx_work_rest') && hasWorkStudy && hasRestEx) { fatigue -= 1; mood += 2; }
  if (hasHex(state, 'hx_slow_life') && state.age >= state.gradAge) mood += 2;
  if (getBondTier(state, 'luck') >= 4) mood += 2;

  const fatigueLimit = getEffectiveFatigueLimit(state);
  const endFatigue = clamp(state.stats.fatigue + fatigue);
  if (endFatigue >= fatigueLimit) health -= 1;
  if (state.age >= 60 && !state.elderCircle && !(state.relations.partner?.married)) mood -= 1;
  return { cash, health, mood, endFatigue, fatigueLimit, fatigueWarn: endFatigue >= fatigueLimit, combos };
}

export function executeTurn(state, draftIds) {
  ensureSprint1State(state);
  const all = getAvailableActions(state);
  const summary = [];
  const stepBeats = [];
  let wentPub = false;
  let accompaniedPartner = false;
  let accompaniedParents = false;
  let accompaniedFriend = false;
  let hasWorkStudy = false;
  let hasRestEx = false;
  let chillCount = 0;

  const isChild = state.age <= 18;
  const cashMult = 1
    + (hasHex(state, 'hx_shop_1') && isChild ? 0.5 : 0)
    + (hasHex(state, 'hx_shop_2') ? 0.6 : 0)
    + (hasHex(state, 'hx_tuck_king') && isChild ? 0.5 : 0);
  const intMult = state.origin.intimacyMult
    * (1 + (getBondTier(state, 'warmth') >= 2 ? 0.30 : 0) + (hasHex(state, 'hx_social_bull') ? 0.35 : 0) + (hasHex(state, 'hx_pop_2') ? 0.50 : 0) + (hasHex(state, 'hx_pop_3') ? 1.0 : 0));
  const winterCard = getHexInstance(state, 'hx_winter_study');
  const winterActive = Boolean(winterCard && !winterCard.done && winterCard.turnsLeft > 0);
  const seenInDraft = {};

  const addPiggyStack = () => {
    const pb = getHexInstance(state, 'hx_piggybank');
    if (pb && pb.stacks < 15) pb.stacks++;
  };
  const addErrStack = () => {
    const eb = getHexInstance(state, 'hx_errbook');
    if (eb && eb.stacks < 10) eb.stacks++;
  };

  const executedIds = [];
  for (const id of draftIds) {
    const a = all.find(x => x.id === id);
    if (!a) continue;
    const isFlowDup = hasHex(state, 'hx_flow_engine') && (seenInDraft[id] || 0) >= 1;
    seenInDraft[id] = (seenInDraft[id] || 0) + 1;

    // P1-06 / P1-05：补习额度与余额逐格校验，超额/缺钱不扣费且不计入连携
    if (id === 'study_tutor' && (state.tutoredThisYear >= state.origin.eduLimit || state.cash < a.costCash)) {
      continue;
    }
    if (id === 'overtime' && state.overtimeThisYear >= 8) {
      continue;
    }
    executedIds.push(id);
    if (a.costCash > 0) state.cash -= a.costCash;
    if (['study_lit', 'study_num', 'study_self', 'study_tutor', 'gaokao_sprint', 'pro_self', 'pro_course', 'overtime'].includes(id)) hasWorkStudy = true;
    if (['rest', 'exercise', 'square_dance'].includes(id)) { hasRestEx = true; chillCount++; }

    let beatText = a.name;
    let beatKind = 'pos';

    // 季节限定金边贴纸处理
    if (a.seasonal && a.effects) {
      const ef = a.effects;
      const parts = [];
      if (ef.cash) {
        const earn = Math.round(ef.cash * (hasHex(state, 'hx_tuck_king') && isChild ? 1.5 : 1));
        state.cash += earn;
        addPiggyStack();
        parts.push(`现金 +¥${earn.toLocaleString()}`);
        beatKind = 'gold';
      }
      if (ef.luckyCash) {
        const [lo, hi] = ef.luckyCash;
        const luckBoost = (getBondTier(state, 'luck') >= 2 ? 1.25 : 1) * (hasHex(state, 'hx_tuck_king') && isChild ? 1.5 : 1) * (hasHex(state, 'hx_arcade_pro') ? 1.4 : 1);
        const raw = lo + Math.floor(Math.random() * (hi - lo + 1));
        const earn = Math.round(raw * luckBoost);
        state.cash += earn;
        addPiggyStack();
        parts.push(`收获 +¥${earn.toLocaleString()}`);
        beatKind = 'gold';
      }
      if (ef.knowledge) {
        if (state.age <= 18 && state.statsRaw) {
          state.statsRaw.knowledge = Math.min(getStageTextbookCap(state.age), state.statsRaw.knowledge + ef.knowledge);
          syncVisibleAcademicStats(state);
        } else {
          state.stats.knowledge = clamp(state.stats.knowledge + ef.knowledge);
        }
        state.usedThisYear.knowledge = true;
        parts.push(`学识 +${ef.knowledge}`);
      }
      if (ef.pro) { state.stats.pro = clamp(state.stats.pro + ef.pro); state.usedThisYear.pro = true; parts.push(`专业 +${ef.pro}`); }
      if (ef.expr) { state.stats.expr = clamp(state.stats.expr + ef.expr); state.usedThisYear.expr = true; parts.push(`表达 +${ef.expr}`); }
      if (ef.selfCare) { state.stats.selfCare = clamp(state.stats.selfCare + ef.selfCare); state.usedThisYear.selfCare = true; parts.push(`自理 +${ef.selfCare}`); }
      if (ef.dream) { state.dreamSkill = clamp(state.dreamSkill + ef.dream); parts.push(`梦想 +${ef.dream}`); beatKind = 'gold'; }
      if (ef.project) { state.projectCount += ef.project; parts.push(`项目 +${ef.project}`); beatKind = 'gold'; }
      if (ef.aiSkill) { state.aiSkillLearned = true; }
      if (ef.health) { state.stats.health = clamp(state.stats.health + ef.health); parts.push(`健康 +${ef.health}`); }
      if (ef.mood) {
        const dm = winterActive && ef.mood > 0 ? Math.max(1, Math.floor(ef.mood / 2)) : ef.mood;
        state.stats.mood = clamp(state.stats.mood + dm);
        parts.push(`心态 ${dm > 0 ? '+' : ''}${dm}`);
      }
      if (ef.fatigue) state.stats.fatigue = clamp(state.stats.fatigue + ef.fatigue);
      if (ef.friendInt) {
        accompaniedFriend = true;
        state.relations.friend.intimacy = clamp(state.relations.friend.intimacy + Math.round(ef.friendInt * intMult));
        state.relations.friend.missedTurns = 0;
        parts.push(`同桌/老友 +${Math.round(ef.friendInt * intMult)}`);
      }
      if (ef.parentInt) {
        accompaniedParents = true;
        state.relations.parents.intimacy = clamp(state.relations.parents.intimacy + Math.round(ef.parentInt * intMult));
        state.relations.parents.missedTurns = 0;
      }
      if (ef.elderCircle) {
        state.elderCircleProgress += ef.elderCircle;
        if (state.elderCircleProgress >= 3) state.elderCircle = true;
      }
      if (['sea_teambuild', 'sea_fishing_trip', 'sea_sunset_tour'].includes(id)) {
        ensureWishbookState(state);
        const stampKey = `${id}_${state.age}`;
        if (!state.travelStamps.includes(stampKey)) state.travelStamps.push(stampKey);
      }
      beatText = parts.slice(0, 2).join(' · ') || `${a.name}完成`;
      summary.push(`${a.name}：${parts.join('，')}`);
      stepBeats.push({ id, name: a.name, text: beatText, kind: beatKind, isSeasonal: true });
      continue;
    }

    switch (id) {
      case 'study_lit': {
        const res = applyDirectAcademicAction(state, 'lit', { solo: true, doubleFlow: isFlowDup });
        if (!isFlowDup) state.stats.mood = clamp(state.stats.mood - 1);
        state.stats.fatigue = clamp(state.stats.fatigue + 1 + (isFlowDup ? 2 : 0));
        beatText = res.capped ? `学识本阶已满` : `学识 +${Math.max(1, Math.round(res.dLit))}${isFlowDup ? ' (心流)' : ''}`;
        summary.push(`文科阅读：${beatText}`);
        break;
      }
      case 'study_num': {
        const res = applyDirectAcademicAction(state, 'num', { solo: true, doubleFlow: isFlowDup });
        if (!isFlowDup) state.stats.mood = clamp(state.stats.mood - 1);
        state.stats.fatigue = clamp(state.stats.fatigue + 1 + (isFlowDup ? 2 : 0));
        beatText = res.capped ? `数理本阶已满` : `数理 +${Math.max(1, Math.round(res.dNum))}${isFlowDup ? ' (心流)' : ''}`;
        summary.push(`数理解题：${beatText}`);
        break;
      }
      case 'study_self': {
        const res = applySubjectStudyStep(state, state.selectedSubject, { solo: true, doubleFlow: isFlowDup });
        if (!isFlowDup) state.stats.mood = clamp(state.stats.mood - 1);
        state.stats.fatigue = clamp(state.stats.fatigue + 1 + (isFlowDup ? 2 : 0));
        beatText = res.capped ? `${res.meta.label}本册已吃透` : `${res.meta.label} +${Math.round(res.dS)}${isFlowDup ? ' (心流)' : ''}`;
        summary.push(`自习·${res.meta.label}：${beatText}`);
        break;
      }
      case 'study_tutor': {
        if (state.tutoredThisYear < state.origin.eduLimit) {
          applyDirectAcademicAction(state, 'tutor', { paid: true, doubleFlow: isFlowDup });
          state.tutoredThisYear++;
          if (!isFlowDup) state.stats.mood = clamp(state.stats.mood - (state.talent.id === 't_book' ? 1 : 2));
          state.stats.fatigue = clamp(state.stats.fatigue + 1 + (isFlowDup ? 2 : 0));
          beatText = '学识/数理双提';
          summary.push('课外补习：学识与数理同步提升');
        }
        break;
      }
      case 'gaokao_sprint': {
        applyDirectAcademicAction(state, 'sprint', { solo: true, sprint: true, doubleFlow: isFlowDup });
        if (!isFlowDup) state.stats.mood = clamp(state.stats.mood - 2);
        state.stats.fatigue = clamp(state.stats.fatigue + 2 + (isFlowDup ? 2 : 0));
        if (!state.experiences.includes('exp_gaokao_sprint')) state.experiences.push('exp_gaokao_sprint');
        beatText = '文理全提 · 冲刺';
        beatKind = 'gold';
        summary.push('考前冲刺刷卷：学识与数理双提，留存冲刺经历');
        break;
      }
      case 'uni_study': {
        hasWorkStudy = true;
        const gp = trainStat(state, 'pro', 0, { solo: true, doubleFlow: isFlowDup });
        state.stats.knowledge = clamp(state.stats.knowledge + 1);
        state.usedThisYear.knowledge = true;
        state.stats.fatigue = clamp(state.stats.fatigue + 1 + (isFlowDup ? 2 : 0));
        beatText = `专业 +${gp} · 学识 +1`;
        summary.push(`泡图书馆修学分：专业 +${gp}，学识 +1`);
        break;
      }
      case 'uni_intern': {
        hasWorkStudy = true;
        const gp = trainStat(state, 'pro', 0, { doubleFlow: isFlowDup });
        state.projectCount += 1;
        const pay = Math.round(800 * cashMult * (isFlowDup ? 2 : 1));
        state.cash += pay;
        addPiggyStack();
        state.stats.fatigue = clamp(state.stats.fatigue + 2 + (isFlowDup ? 2 : 0));
        beatText = `专业 +${gp} · 补贴 +¥${pay}`;
        beatKind = 'gold';
        summary.push(`大厂实习项目：专业 +${gp}，项目 +1，补贴 +¥${pay}`);
        break;
      }
      case 'uni_parttime': {
        const pay = Math.round(1400 * cashMult * (isFlowDup ? 2 : 1));
        state.cash += pay;
        addPiggyStack();
        const ge = trainStat(state, 'expr', 0);
        state.stats.fatigue = clamp(state.stats.fatigue + 2 + (isFlowDup ? 2 : 0));
        beatText = `现金 +¥${pay} · 表达 +${ge}`;
        beatKind = 'gold';
        summary.push(`大学生家教兼职：现金 +¥${pay}，表达 +${ge}`);
        break;
      }
      case 'pro_self': {
        const g = trainStat(state, 'pro', 0, { solo: true, doubleFlow: isFlowDup });
        if (!isFlowDup) state.stats.mood = clamp(state.stats.mood - 1);
        state.stats.fatigue = clamp(state.stats.fatigue + 1 + (isFlowDup ? 2 : 0));
        beatText = `专业 +${g}${isFlowDup ? ' (翻倍)' : ''}`;
        summary.push(`专业自学：${beatText}`);
        break;
      }
      case 'pro_course': {
        const g = trainStat(state, 'pro', hasHex(state, 'hx_ai_pioneer') ? 2 : 1, { doubleFlow: isFlowDup });
        state.projectCount += hasHex(state, 'hx_ai_pioneer') ? 2 : 1;
        if (state.age >= 35) state.aiSkillLearned = true;
        if (!isFlowDup) state.stats.mood = clamp(state.stats.mood - 2);
        state.stats.fatigue = clamp(state.stats.fatigue + 1 + (isFlowDup ? 2 : 0));
        beatText = `专业 +${g} · 项目+${hasHex(state, 'hx_ai_pioneer') ? 2 : 1}`;
        beatKind = 'gold';
        summary.push(`导师项目课：专业 +${g}，项目经历提升`);
        break;
      }
      case 'elder_uni': {
        const g1 = trainStat(state, 'knowledge', 0, { solo: true, doubleFlow: isFlowDup });
        const g2 = trainStat(state, 'selfCare', 0, { solo: true });
        state.stats.mood = clamp(state.stats.mood + 2);
        beatText = `学识 +${g1} · 自理 +${g2}`;
        summary.push(`老年大学：学识 +${g1}，自理 +${g2}`);
        break;
      }
      case 'chores': {
        const pay = Math.round((state.origin.id === 'poor' ? 150 : 100) * cashMult * (isFlowDup ? 2 : 1));
        state.cash += pay;
        addPiggyStack();
        const g = trainStat(state, 'selfCare', 0, { solo: true });
        state.stats.fatigue = clamp(state.stats.fatigue + 1 + (isFlowDup ? 2 : 0));
        beatText = `现金 +¥${pay} · 自理+${g}`;
        beatKind = 'gold';
        summary.push(`家务/兼职：现金 +${pay}，自理 +${g}`);
        break;
      }
      case 'overtime': {
        if (state.overtimeThisYear < 8) {
          const pay = Math.round((state.overtimeThisYear < 4 ? 3000 : 1800) * (state.cityTier === 1 ? 1.2 : 1.0) * cashMult * (isFlowDup ? 2 : 1));
          state.cash += pay;
          addPiggyStack();
          state.overtimeThisYear++;
          state.stats.health = clamp(state.stats.health - 1);
          if (!isFlowDup) state.stats.mood = clamp(state.stats.mood - 2);
          state.stats.fatigue = clamp(state.stats.fatigue + (state.cityTier === 1 ? 4 : 3) + (isFlowDup ? 2 : 0));
          beatText = `现金 +¥${pay.toLocaleString()}`;
          beatKind = 'gold';
          summary.push(`加班副业：现金 +${pay}`);
        }
        break;
      }
      case 'rehire_work': {
        const pay = Math.round(6000 * cashMult * (isFlowDup ? 2 : 1));
        state.cash += pay;
        addPiggyStack();
        state.stats.fatigue = clamp(state.stats.fatigue + 2 + (isFlowDup ? 2 : 0));
        beatText = `现金 +¥${pay.toLocaleString()}`;
        beatKind = 'gold';
        summary.push(`专家返聘：现金 +${pay.toLocaleString()}`);
        break;
      }
      case 'accompany_parents': {
        accompaniedParents = true;
        const inc = Math.round(4 * intMult);
        state.relations.parents.intimacy = clamp(state.relations.parents.intimacy + inc);
        state.relations.parents.missedTurns = 0;
        const dm = winterActive ? 1 : (hasHex(state, 'hx_duo_warmzen') ? 4 : 2);
        state.stats.mood = clamp(state.stats.mood + dm);
        if (hasHex(state, 'hx_duo_warmzen')) state.stats.health = clamp(state.stats.health + 2);
        if (!state.experiences.includes('exp_care_parents')) state.experiences.push('exp_care_parents');
        beatText = `父母亲密 +${inc} · 心态+${dm}`;
        summary.push(`陪伴父母：亲密 +${inc}，心态 +${dm}`);
        break;
      }
      case 'accompany_friend': {
        accompaniedFriend = true;
        const marbleBonus = state.items.includes('玻璃弹珠罐') && state.age <= 18 ? 1 : 0;
        const inc = Math.round((4 + marbleBonus + (hasHex(state, 'hx_pop_1') ? 2 : 0)) * intMult);
        state.relations.friend.intimacy = clamp(state.relations.friend.intimacy + inc);
        state.relations.friend.missedTurns = 0;
        const ge = trainStat(state, 'expr', 0);
        const dm = winterActive ? 1 : (hasHex(state, 'hx_duo_warmzen') ? 4 : 2);
        state.stats.mood = clamp(state.stats.mood + dm);
        if (!state.experiences.includes('exp_desk_mate') && state.age <= 18) state.experiences.push('exp_desk_mate');
        beatText = `亲密 +${inc} · 表达+${ge}`;
        summary.push(`老友互动：亲密 +${inc}，表达 +${ge}`);
        break;
      }
      case 'date_partner': {
        if (state.relations.partner) {
          accompaniedPartner = true;
          const inc = Math.round(5 * intMult);
          state.relations.partner.intimacy = clamp(state.relations.partner.intimacy + inc);
          state.relations.partner.missedTurns = 0;
          const dm = winterActive ? 1 : (hasHex(state, 'hx_duo_warmzen') ? 5 : 3);
          state.stats.mood = clamp(state.stats.mood + dm);
          if (!state.experiences.includes('exp_love_bond')) state.experiences.push('exp_love_bond');
          beatText = `伴侣好感度 +${inc} · 心态+${dm}`;
          summary.push(`伴侣约会：好感度 +${inc}，心态 +${dm}`);
        }
        break;
      }
      case 'square_dance': {
        state.stats.health = clamp(state.stats.health + 2);
        state.stats.mood = clamp(state.stats.mood + 2);
        state.stats.fatigue = clamp(state.stats.fatigue - 1);
        state.elderCircleProgress += hasHex(state, 'hx_anti_scam_pro') ? 2 : 1;
        if (state.elderCircleProgress >= 3 && !state.elderCircle) {
          state.elderCircle = true;
          beatText = '建成老年社交圈！';
          beatKind = 'gold';
          summary.push('建成「活跃老年社交圈」（成功抵消退休孤独衰减！）');
        } else {
          beatText = '健康 +2 · 心态 +2';
          summary.push('广场舞社团：健康 +2，心态 +2');
        }
        break;
      }
      case 'tutor_kid': {
        if (state.child) {
          const kres = applyParentTutorToChild(state, state.tutorKidFocus, isFlowDup);
          if (!isFlowDup) state.stats.mood = clamp(state.stats.mood - 2);
          state.stats.fatigue = clamp(state.stats.fatigue + 2 + (isFlowDup ? 2 : 0));
          beatText = `${kres?.tag || '辅导功课'} · 稳步提分`;
          summary.push(`辅导孩子功课（${kres?.tag || '全科'}）：孩子分科熟练度提升`);
        }
        break;
      }
      case 'play_kid': {
        if (state.child) {
          state.child.mood = clamp(state.child.mood + 4);
          state.child.bond = clamp(state.child.bond + 4);
          state.stats.mood = clamp(state.stats.mood + 2);
          beatText = '亲子羁绊 +4 · 心态+2';
          summary.push('高质量陪娃：孩子心态 +4，亲子羁绊 +4');
        }
        break;
      }
      case 'dr_esport':
      case 'dr_hurdle':
      case 'dr_tsinghua':
      case 'dr_singer':
      case 'dr_surgeon': {
        const dres = executeDreamAction(state, id, { solo: true, doubleFlow: isFlowDup });
        if (dres) {
          beatText = dres.beatText;
          beatKind = 'gold';
          summary.push(dres.summary);
        }
        break;
      }
      case 'exercise': {
        const h = (state.talent.id === 't_health' ? 3 : 2) * (hasHex(state, 'hx_sleep_2') ? 2 : 1);
        const dm = (hasHex(state, 'hx_sleep_2') ? 3 : 1) + (state.items.includes('旋风四驱车') ? 1 : 0);
        state.stats.health = clamp(state.stats.health + h);
        state.stats.mood = clamp(state.stats.mood + dm);
        state.stats.fatigue = clamp(state.stats.fatigue - 2);
        beatText = `健康 +${h} · 疲劳 -2`;
        summary.push(`运动锻炼：健康 +${h}，疲劳 -2`);
        // 松弛 4 羁绊：25% 触发顿悟
        if (getBondTier(state, 'zen') >= 4 && Math.random() < 0.25) {
          const ks = ['knowledge', 'pro', 'expr', 'selfCare'];
          const rk = ks[Math.floor(Math.random() * ks.length)];
          state.stats[rk] = clamp(state.stats[rk] + 2);
          summary.push('【松弛顿悟】运动中灵光一现，随机能力 +2');
        }
        break;
      }
      case 'rest': {
        const f = state.house?.buffActive ? 5 : 4;
        const houseRestMood = state.house?.trait === 'luxury' ? 2 : (state.house?.trait === 'terrace' ? 1 : 0);
        const baseM = (hasHex(state, 'hx_duo_warmzen') ? 5 : 3) + houseRestMood;
        const dm = winterActive ? Math.max(1, Math.floor(baseM / 2)) : baseM;
        const dh = (hasHex(state, 'hx_sleep_1') ? 1 : 0) + (hasHex(state, 'hx_duo_warmzen') ? 2 : 0);
        state.stats.mood = clamp(state.stats.mood + dm);
        if (dh > 0) state.stats.health = clamp(state.stats.health + dh);
        state.stats.fatigue = clamp(state.stats.fatigue - f);
        beatText = `心态 +${dm} · 疲劳 -${f}`;
        summary.push(`完整休息：心态 +${dm}，疲劳 -${f}`);
        if ((hasHex(state, 'hx_slow_life') && Math.random() < 0.30) || (getBondTier(state, 'zen') >= 4 && Math.random() < 0.25)) {
          const ks = ['knowledge', 'expr', 'selfCare'];
          const rk = ks[Math.floor(Math.random() * ks.length)];
          state.stats[rk] = clamp(state.stats[rk] + 2);
          beatText += ' · 灵光+2';
          summary.push('【松弛顿悟】放空时灵光一现，能力 +2');
        }
        break;
      }
      case 'pub_drink': {
        wentPub = true;
        const hLoss = state.pubStreak >= 1 ? 2 : 1;
        state.stats.mood = clamp(state.stats.mood + 6);
        state.stats.fatigue = clamp(state.stats.fatigue - 3);
        state.stats.health = clamp(state.stats.health - hLoss);
        beatText = `心态 +6 · 健康 -${hLoss}`;
        summary.push(`小酒馆微醺：心态 +6，疲劳 -3，健康 -${hLoss}`);
        break;
      }
      case 'world_trip': {
        state.worldTrips++;
        state.stats.mood = clamp(state.stats.mood + 8);
        state.stats.fatigue = clamp(state.stats.fatigue + 1);
        if (!state.experiences.includes('exp_world_trip')) state.experiences.push('exp_world_trip');
        if (hasHex(state, 'hx_sleep_3')) {
          state.cash += 50000;
          summary.push('【百岁不老松】旅行游记爆火，稿费入账 +¥5 万！');
        }
        beatText = `环游第 ${state.worldTrips} 站！`;
        beatKind = 'gold';
        summary.push(`环游世界第 ${state.worldTrips} 站完成！心态 +8`);
        break;
      }
    }
    stepBeats.push({ id, name: a.name, text: beatText, kind: beatKind, isSeasonal: false });
  }

  // ===== 排程 Combo 连携结算（P1-05：仅基于实际成功执行的 executedIds 判定）=====
  const combosTriggered = detectCombos(executedIds, state);
  const newlyDiscoveredCombos = [];
  let rerollTicketsEarned = 0;
  const cbMult = hasHex(state, 'hx_time_master') ? 2 : 1;

  for (const cb of combosTriggered) {
    state.comboCountTotal++;
    const b = cb.bonus;
    const capD = state.age <= 18 ? getStageTextbookCap(state.age, state.subTurn) : 100;
    if (b.cash) state.cash += b.cash * cbMult;
    if (b.knowledge) {
      if (state.age <= 18) {
        const sel = state.selectedSubject || 'chn';
        if (sel === 'math' || sel === 'sci') {
          state.statsRaw.numLogic = Math.min(capD, state.statsRaw.numLogic + b.knowledge * cbMult);
        } else {
          state.statsRaw.knowledge = Math.min(capD, state.statsRaw.knowledge + b.knowledge * cbMult);
        }
        state.subjects[sel] = Math.min(capD, (state.subjects[sel] || 20) + 1.5 * cbMult);
        syncVisibleAcademicStats(state);
      } else {
        state.stats.knowledge = clamp(state.stats.knowledge + b.knowledge * cbMult);
      }
    }
    if (b.pro) state.stats.pro = clamp(state.stats.pro + b.pro * cbMult);
    if (b.expr) state.stats.expr = clamp(state.stats.expr + b.expr * cbMult);
    if (b.selfCare) state.stats.selfCare = clamp(state.stats.selfCare + b.selfCare * cbMult);
    if (b.dream) {
      if (b.dreamId && state.dreams?.[b.dreamId]) {
        state.dreams[b.dreamId].xp = clamp(state.dreams[b.dreamId].xp + b.dream * cbMult);
        syncLegacyDreamFields(state);
      } else {
        state.dreamSkill = clamp(state.dreamSkill + b.dream * cbMult);
      }
    }
    if (b.addSongChance && state.dreams?.d_singer && Math.random() < b.addSongChance) {
      state.dreams.d_singer.songsCount = Math.min(10, (state.dreams.d_singer.songsCount || 0) + 1);
    }
    if (b.health) state.stats.health = clamp(state.stats.health + b.health * cbMult);
    if (b.mood) state.stats.mood = clamp(state.stats.mood + b.mood * cbMult);
    if (state.items.includes('贴纸手账本')) state.stats.mood = clamp(state.stats.mood + 1);
    if (b.fatigue) state.stats.fatigue = clamp(state.stats.fatigue + b.fatigue * cbMult);
    if (b.friendInt) state.relations.friend.intimacy = clamp(state.relations.friend.intimacy + b.friendInt * cbMult);
    if (b.parentInt) state.relations.parents.intimacy = clamp(state.relations.parents.intimacy + b.parentInt * cbMult);
    if (b.partnerInt && state.relations.partner) state.relations.partner.intimacy = clamp(state.relations.partner.intimacy + b.partnerInt * cbMult);
    if (b.kidBond && state.child) state.child.bond = clamp(state.child.bond + b.kidBond * cbMult);
    if (b.kidStudy && state.child) applyParentTutorToChild(state, state.tutorKidFocus, false);
    if (b.kidMood && state.child) state.child.mood = clamp(state.child.mood + b.kidMood * cbMult);
    if (b.project) state.projectCount += b.project * cbMult;
    if (b.elderCircle) {
      state.elderCircleProgress += b.elderCircle * cbMult;
      if (state.elderCircleProgress >= 3) state.elderCircle = true;
    }
    if (b.mainStudy) {
      if (state.age <= 18) {
        const sel = state.selectedSubject || 'chn';
        state.statsRaw.knowledge = Math.min(capD, state.statsRaw.knowledge + 1 * cbMult);
        state.statsRaw.numLogic = Math.min(capD, state.statsRaw.numLogic + 1 * cbMult);
        state.subjects[sel] = Math.min(capD, (state.subjects[sel] || 20) + 2.0 * cbMult);
        syncVisibleAcademicStats(state);
      } else {
        state.stats.pro = clamp(state.stats.pro + b.mainStudy * cbMult);
      }
    }
    summary.push(`【连携 · ${cb.name}】${cbMult > 1 ? '×2 ' : ''}${cb.desc}`);

    if (!state.discoveredCombos.includes(cb.id)) {
      state.discoveredCombos.push(cb.id);
      newlyDiscoveredCombos.push(cb);
    }
    const cBook = getHexInstance(state, 'hx_combo_book');
    if (cBook) {
      cBook.stacks++;
      if (cBook.stacks >= 4) {
        cBook.stacks = 0;
        state.stats.mood = clamp(state.stats.mood + 3);
        const extraIds = rollSeasonalOfferIds(state, 1);
        state.bonusSeasonalId = extraIds[0] || null;
        summary.push('【搭配手账本】集满 4 次！心态 +3，下季多送 1 张限定金边贴纸');
      }
    }
  }
  const newTier = Math.floor(state.discoveredCombos.length / 3);
  if (newTier > state.hexComboRewardTier) {
    rerollTicketsEarned = newTier - state.hexComboRewardTier;
    state.hexRerollTickets += rerollTicketsEarned;
    state.hexComboRewardTier = newTier;
    summary.push(`解锁 ${state.discoveredCombos.length} 条连携图鉴，获赠命运重随券 +${rerollTicketsEarned}`);
  }

  // 同步《百万单曲版税》叠层展示
  const royInst = getHexInstance(state, 'hx_singer_royalty');
  if (royInst && state.dreams?.d_singer) {
    royInst.stacks = Math.min(10, state.dreams.d_singer.songsCount || 0);
  }

  // ===== 回合末海克斯被动 / 成长 / 延迟结算 =====
  const hexTriggers = [];
  if (hasHex(state, 'hx_work_rest') && hasWorkStudy && hasRestEx) {
    state.stats.fatigue = clamp(state.stats.fatigue - 1);
    state.stats.mood = clamp(state.stats.mood + 2);
    hexTriggers.push('【劳逸结合】疲劳 -1，心态 +2');
  }
  if (hasHex(state, 'hx_shop_2')) {
    const div = state.age <= 18 ? 600 : 2400;
    state.cash += div;
    hexTriggers.push(`【校园代购王】副业分红 +¥${div.toLocaleString()}`);
  }
  const coll = getHexInstance(state, 'hx_collector');
  if (coll) {
    coll.stacks = Math.min(5, Math.floor(state.albumPhotos.length / 2) + state.items.length);
    if (coll.stacks > 0) {
      state.stats.mood = clamp(state.stats.mood + coll.stacks);
      hexTriggers.push(`【旧物收藏家】心态 +${coll.stacks}`);
    }
  }
  if (hasHex(state, 'hx_duo_chill') && chillCount >= 2) {
    const ks = ['knowledge', 'expr', 'selfCare'];
    const rk = ks[Math.floor(Math.random() * ks.length)];
    state.stats[rk] = clamp(state.stats[rk] + 2);
    const tip = state.age <= 18 ? 150 : 2500;
    state.cash += tip;
    state.stats.mood = clamp(state.stats.mood + 2);
    hexTriggers.push(`【松弛有好运】能力 +2、意外外快 +¥${tip}`);
  }
  if (hasHex(state, 'hx_koi_god')) {
    const lucky = Math.random() < 0.15 ? (state.age <= 18 ? 500 : 8000) : (state.age <= 18 ? 80 : 600);
    state.cash += lucky;
    hexTriggers.push(`【天选锦鲤】本季好运红包 +¥${lucky}`);
  }
  if (winterActive) {
    winterCard.turnsLeft--;
    if (winterCard.turnsLeft <= 0) {
      winterCard.done = true;
      state.stats.knowledge = clamp(state.stats.knowledge + 10);
      state.gaokaoHexBonus += 2;
      hexTriggers.push('【寒窗苦读】期满兑现！学识 +10，高考 +2 分');
    }
  }
  if (getBondTier(state, 'luck') >= 4) {
    state.stats.mood = clamp(state.stats.mood + 2);
  }
  for (const ht of hexTriggers) summary.push(ht);

  state.pubStreak = wentPub ? state.pubStreak + 1 : 0;
  state.lastDraft = [...draftIds];
  state.totalTurns = (state.totalTurns || 0) + 1;

  // 子回合自然结算
  const natRec = (getBondTier(state, 'zen') >= 2 ? 4 : 2) + (hasHex(state, 'hx_sleep_1') ? 1 : 0);
  const fatigueLimit = getEffectiveFatigueLimit(state);
  state.stats.fatigue = clamp(state.stats.fatigue - natRec);
  if (state.stats.fatigue >= fatigueLimit) {
    state.stats.health = clamp(state.stats.health - 1);
    addErrStack();
    summary.push(`【透支预警】疲劳 ≥${fatigueLimit}，健康额外 -1`);
  }
  if (state.stats.mood < 30) addErrStack();

  if (state.age >= 60 && !state.elderCircle && !(state.relations.partner?.married) && !(state.pet?.alive)) {
    state.stats.mood = clamp(state.stats.mood - 1);
    summary.push('【退休孤独】无伴侣且未建老年圈，心态 -1');
  }

  if (Array.isArray(state.statusBuffs) && state.statusBuffs.length) {
    const kept = [];
    for (const bf of state.statusBuffs) {
      if (bf.id === 'bf_cold') state.stats.fatigue = clamp(state.stats.fatigue + 1);
      if (bf.id === 'bf_fit' || bf.id === 'bf_elder_glow') state.stats.health = clamp(state.stats.health + 1);
      if (bf.id === 'bf_leader') state.stats.mood = clamp(state.stats.mood + 1);
      bf.turns--;
      if (bf.turns > 0) kept.push(bf);
    }
    state.statusBuffs = kept;
  }

  if (state.age >= state.gradAge && (state.cityTier === 3 || hasHex(state, 'hx_slow_life'))) {
    state.stats.mood = clamp(state.stats.mood + (hasHex(state, 'hx_slow_life') ? 2 : 1));
  }
  const immuneDecay = getBondTier(state, 'warmth') >= 2 || hasHex(state, 'hx_pop_3');
  if (!immuneDecay) {
    // P1-08：未婚伴侣冷落统一由 checkPartnerBreakupOnTurnEnd 维护计数，避免双重递增清零；已婚伴侣仅轻度衰减
    if (state.relations.partner?.married && !accompaniedPartner) {
      state.relations.partner.missedTurns++;
      if (state.relations.partner.missedTurns >= 2) {
        state.relations.partner.intimacy = clamp(state.relations.partner.intimacy - 2);
        state.relations.partner.missedTurns = 0;
      }
    }
    if (!accompaniedParents) {
      state.relations.parents.missedTurns++;
      const parentNeed = (state.origin.id === 'merchant' && state.age <= 18) ? 2 : 3;
      if (state.relations.parents.missedTurns >= parentNeed) {
        state.relations.parents.intimacy = clamp(state.relations.parents.intimacy - 2);
        state.relations.parents.missedTurns = 0;
      }
    }
  }

  // 推进子女代际考学 38 季游标（复用同一套分科区间算分引擎）
  const mpForChild = getMacroParams(state.age);
  const childExamEvents = advanceChildSubTurnCursor(state, state.subTurn, mpForChild.subTurns);
  for (const cev of childExamEvents) {
    summary.push(cev.line);
    if (cev.kind === 'gk') {
      state.albumPhotos.push({
        age: state.age,
        stamp: getDateStamp(state.age, state.subTurn),
        title: `孩子高考 ${cev.rep.finalScore}分 · ${cev.rep.admitted}`,
        stageIdx: getSubStageIndex(state.age),
        bg: 'adult'
      });
    }
  }

  updateMilestones(state);

  // 优先级事件仲裁：系统节点 > 加密大节点 > 四阶自然追梦节点 > 35–55% 半路生活插曲
  let triggeredEvent = null;
  let midTurnEvent = null;
  for (const ev of APPROVED_SYSTEM_ANCHORS) {
    if (ev.review_status !== 'APPROVED') continue;
    if (ev.gender && ev.gender !== 'any' && ev.gender !== state.gender) continue;
    if (state.triggeredEvents.includes(ev.id)) continue;
    if (ev.age === state.age && ev.subTurn === state.subTurn) {
      triggeredEvent = ev;
      state.triggeredEvents.push(ev.id);
      break;
    }
  }
  if (!triggeredEvent) {
    triggeredEvent = getMilestoneEventForTurn(state);
  }
  const gkTargetAge = state.gaokaoNextAge || 18;
  const gkTargetSub = state.gaokaoNextSubTurn || 2;
  const willGaokao = (state.age === gkTargetAge && state.subTurn === gkTargetSub && !state.gaokaoDone);
  let arcadeMoment = null;
  if (!triggeredEvent && !willGaokao) {
    // 追梦生命周期优先 -> 其次到龄到季自动跳出当期小游戏奇遇卡 -> 再次普通随机生活插曲
    const dreamEv = rollDreamLifecycleEvent(state, draftIds);
    if (dreamEv) {
      midTurnEvent = dreamEv;
    } else {
      arcadeMoment = rollStageArcadeMoment(state, draftIds);
      if (!arcadeMoment) {
        midTurnEvent = rollMidTurnRandomEvent(state, draftIds);
      }
    }
  }

  // 检查提前谢幕
  if (state.stats.health <= 0) {
    state.ended = true;
    state.endReason = `${state.age} 岁因健康归零提前谢幕`;
    return { summary, stepBeats, combosTriggered, newlyDiscoveredCombos, rerollTicketsEarned, hexTriggers, triggeredEvent: null, midTurnEvent: null, arcadeMoment: null, yearEndReport: null, needGaokao: false };
  }

  // 推进子回合或进入年末决算
  ensureRomanceState(state);
  ensureWishbookState(state);
  const partnerBreakupEvent = checkPartnerBreakupOnTurnEnd(state, Boolean(state.romance?.chattedThisTurn || accompaniedPartner));
  if (state.romance) state.romance.chattedThisTurn = false;

  const mp = getMacroParams(state.age);
  state.emoBuyThisTurn = false;
  state.lotteryThisTurn = false;
  state.tuckGiftThisTurn = false;
  state.arcadePlayedThisTurn = false;
  if (state.pet) state.pet.pettedThisTurn = 0;

  // 14 岁初二秋季（第 2 季）固定触发校运会三轮晋级赛
  const needSportsDay = state.age === 14 && state.subTurn === 2 && !state.sportsDayDone;
  // 18 岁第 2 子回合末触发高考节点
  const needGaokao = willGaokao;

  // P0-04 / P0-02：持久化待完成强制决策队列（含小升初/中考放榜录取、校运会、高考、毕业择城），确保刷新后读档必能恢复
  if (!Array.isArray(state.pendingMandatory)) state.pendingMandatory = [];
  if (triggeredEvent && (triggeredEvent.id === 'ms_grad_12' || triggeredEvent.id === 'ms_zhongkao_15')) {
    const evKey = `event_${triggeredEvent.id}`;
    if (!state.pendingMandatory.includes(evKey)) state.pendingMandatory.push(evKey);
  }
  if (needSportsDay && !state.pendingMandatory.includes('sports_day')) state.pendingMandatory.push('sports_day');
  if (needGaokao && !state.pendingMandatory.includes('gaokao')) state.pendingMandatory.push('gaokao');

  let yearEndReport = null;
  if (state.subTurn < mp.subTurns) {
    state.subTurn++;
  } else {
    yearEndReport = runYearEnd(state);
  }
  if (state.age === state.gradAge && state.subTurn === 1 && !state.track && !state.pendingMandatory.includes('grad')) {
    state.pendingMandatory.push('grad');
  }
  return { summary, stepBeats, combosTriggered, newlyDiscoveredCombos, rerollTicketsEarned, hexTriggers, triggeredEvent, midTurnEvent, arcadeMoment, yearEndReport, needGaokao, needSportsDay, partnerBreakupEvent };
}

export function runYearEnd(state) {
  ensureSprint1State(state);
  const era = getCurrentEra(state);
  const city = CITIES[state.cityTier];
  const lines = [];
  const wealthTier = getBondTier(state, 'wealth');
  const pb = getHexInstance(state, 'hx_piggybank');

  // 1. 理财与资产年化（整合财富羁绊与成长卡利率加成）
  if (state.cash > 0) {
    const extraRate = (wealthTier >= 2 ? 0.015 : 0) + (pb ? pb.stacks * 0.001 : 0);
    const finGain = Math.round(state.cash * (era.finRate + extraRate));
    state.cash += finGain;
    if (finGain > 0) lines.push(`存款理财收益：+${finGain.toLocaleString()} 元`);
    if (wealthTier >= 4) {
      const div4 = Math.round(state.cash * 0.04);
      if (div4 > 0) { state.cash += div4; lines.push(`【财富 4 羁绊】年末复利分红：+${div4.toLocaleString()} 元`); }
    }
    if (hasHex(state, 'hx_shop_3')) {
      const div3 = Math.round(state.cash * 0.05);
      if (div3 > 0) { state.cash += div3; lines.push(`【商业版图教父】资本分红：+${div3.toLocaleString()} 元`); }
    }
  }
  // 黄金报价随时代平滑波动（±3%微扰 + 顺风翻盘客放大牛市）+ 记录走势折线
  const jitter = 1 + (Math.random() * 0.06 - 0.03);
  const goldWindBoost = (hasHex(state, 'hx_wind_pig') && era.goldTrend === 'hot') ? 1.04 : 1.0;
  state.goldPrice = Math.round((state.goldPrice * 0.4 + era.goldBase * 0.6) * jitter * goldWindBoost);
  state.goldHistory.push(state.goldPrice);
  if (state.goldHistory.length > 6) state.goldHistory.shift();

  let hGrowthForIdx = era.houseGrowth + (Math.random() * 0.02 - 0.01);
  const prevIdx = state.houseIdxHistory[state.houseIdxHistory.length - 1] || 100;
  state.houseIdxHistory.push(Math.max(60, Math.round(prevIdx * (1 + hGrowthForIdx))));
  if (state.houseIdxHistory.length > 6) state.houseIdxHistory.shift();

  if (state.house) {
    let hGrowth = era.houseGrowth;
    if (hGrowth > 0 && (hasHex(state, 'hx_wind_pig') || wealthTier >= 4)) hGrowth += 0.04;
    const hJitter = hGrowth + (Math.random() * 0.03 - 0.015);
    const oldVal = state.house.value;
    state.house.value = Math.max(200000, Math.round(state.house.value * (1 + hJitter)));
    const diff = state.house.value - oldVal;
    lines.push(`房产估值变动：${diff >= 0 ? '+' : ''}${diff.toLocaleString()} 元 (现值 ${Math.round(state.house.value/10000)} 万)`);
  }

  // 2. 年度收入（工资/伴侣/退休金/海克斯睡后收入/追梦版税与津贴）
  let yearInc = 0;
  if (state.age >= state.gradAge && state.age < 60 && state.university && state.track) {
    const salMo = getCurrentMonthlySalary(state);
    yearInc += salMo * 12;
    state.yearsInLevel++;
    state.workYearsTotal++;
    if (state.age >= 55) state.last5Salaries.push(salMo);
    lines.push(`本年工资入账：+${(salMo * 12).toLocaleString()} 元 (月薪 ${salMo.toLocaleString()})`);
    if (state.origin.remitRate > 0) {
      const remit = Math.max(state.origin.remitMin, Math.round(salMo * 12 * state.origin.remitRate));
      state.cash -= remit;
      lines.push(`寒门反哺家用：-${remit.toLocaleString()} 元`);
    }
    const surgeonSafe = state.dreams?.d_surgeon?.outcome === 'success';
    if (state.track.id === 'burst' && state.age >= 35 && state.age <= 42 && state.jobLevel < 4 && !hasHex(state, 'hx_ai_pioneer') && !surgeonSafe && Math.random() < 0.16) {
      if (hasHex(state, 'hx_patron') && Math.random() < 0.65) {
        lines.push('【贵人提携】遭遇大厂优化前夕，贵人及时内推无缝衔接，免去全部损失！');
      } else {
        let cut = Math.round(salMo * 3);
        if (hasHex(state, 'hx_wind_pig')) cut = Math.round(cut * 1.3);
        if (hasHex(state, 'hx_pop_3') || getBondTier(state, 'warmth') >= 4) cut = Math.round(cut * 0.5);
        state.cash -= cut;
        state.stats.mood = clamp(state.stats.mood - 6);
        const eb = getHexInstance(state, 'hx_errbook');
        if (eb && eb.stacks < 10) eb.stacks++;
        lines.push(`【时代冲击】遭遇大厂优化过渡，损失 ${cut.toLocaleString()} 元，心态 -6`);
      }
    }
  } else if (state.age >= 60) {
    if (!state.retired) {
      state.retired = true;
      const avg5 = state.last5Salaries.length
        ? Math.round(state.last5Salaries.reduce((a, b) => a + b, 0) / state.last5Salaries.length)
        : 8000;
      const yrCoef = Math.max(0.5, 1 - Math.max(0, Math.floor((35 - state.workYearsTotal) / 5)) * 0.1);
      const penBoost = hasHex(state, 'hx_anti_scam_pro') ? 1.15 : 1.0;
      state.pensionMo = Math.max(2500, Math.round(avg5 * (state.track?.replaceRate || 0.5) * yrCoef * penBoost));
      lines.push(`【60 岁正式退休】核定月度退休金：${state.pensionMo.toLocaleString()} 元/月`);
    }
    yearInc += state.pensionMo * 12;
    lines.push(`本年退休金入账：+${(state.pensionMo * 12).toLocaleString()} 元`);
  }

  // 双重融合【知识变副业】：睡后版权分红
  if (hasHex(state, 'hx_duo_ip')) {
    const ipDiv = Math.floor((state.stats.knowledge + state.stats.pro) / 20) * 12000;
    if (ipDiv > 0) {
      yearInc += ipDiv;
      lines.push(`【知识变副业】版权与咨询分红：+${ipDiv.toLocaleString()} 元`);
    }
  }

  // 四阶追梦与专属海克斯（如《百万单曲版税》）年度现金回流
  yearInc += applyDreamAnnualPassives(state, lines);

  // 伴侣合账收入
  if (state.relations.partner?.married) {
    const spBase = city.spouseBaseYr * state.relations.partner.incomeMult;
    const spGrowth = 1 + Math.min(0.35, Math.max(0, state.age - 25) * 0.015);
    const spInc = state.age < 60 ? Math.round(spBase * spGrowth) : Math.round(spBase * 1.3 * 0.5);
    yearInc += spInc;
    lines.push(`伴侣合账收入：+${spInc.toLocaleString()} 元`);
  }

  // 3. 年度刚性支出
  let yearExp = 0;
  const t1Bet = getHexInstance(state, 'hx_tier1_bet');
  const medFree = hasHex(state, 'hx_surgeon_blade');
  const medHalf = state.dreams?.d_surgeon?.outcome === 'pivot';

  if (state.age >= state.gradAge) {
    const married = Boolean(state.relations.partner?.married);
    const baseLiving = Math.round(city.livingYr * (married ? 1.8 : 1.0));
    const lifestyle = hasHex(state, 'hx_minimalist') ? 0 : Math.round(yearInc * 0.18);
    yearExp += baseLiving + lifestyle;
    lines.push(`年度家庭生活开销：-${(baseLiving + lifestyle).toLocaleString()} 元${hasHex(state, 'hx_minimalist') ? ' (极简省下18%)' : ''}`);

    if (!state.house) {
      const rentMult = (t1Bet && !t1Bet.done && t1Bet.yearsLeft > 0) ? 1.5 : 1.0;
      const rent = Math.round(city.rentYr * rentMult);
      yearExp += rent;
      lines.push(`年度房租支出：-${rent.toLocaleString()} 元${rentMult > 1 ? ' (留大城压力期)' : ''}`);
    } else {
      if (state.house.loan > 0) {
        if (typeof state.house.loanMonthsLeft !== 'number') state.house.loanMonthsLeft = 240;
        let yrPaid = 0;
        for (let m = 0; m < 12 && state.house.loan > 0; m++) {
          const mInt = state.house.loan * (0.03 / 12);
          state.house.loanMonthsLeft = Math.max(0, state.house.loanMonthsLeft - 1);
          // P1-09：第 240 期按实际本息精确收尾清零，杜绝残余尾款
          if (state.house.loanMonthsLeft === 0) {
            yrPaid += state.house.loan + mInt;
            state.house.loan = 0;
          } else {
            const pay = Math.min(state.house.loan + mInt, state.house.pmtMo);
            const prin = Math.max(0, pay - mInt);
            state.house.loan = Math.max(0, Math.round((state.house.loan - prin) * 100) / 100);
            yrPaid += pay;
          }
        }
        if (state.house.loan < 5) { state.house.loan = 0; state.house.loanMonthsLeft = 0; }
        const pmtYr = Math.round(yrPaid);
        yearExp += pmtYr;
        lines.push(`年度房贷还本付息：-${pmtYr.toLocaleString()} 元 (余贷 ${Math.round(state.house.loan/10000)} 万)`);
      }
      const maint = Math.round(state.house.basePrice * 0.005);
      yearExp += maint;
    }

    if (state.hasCar) {
      yearExp += 6000;
    }

    if (state.child && state.age - state.child.bornAge < 22) {
      const cCost = (state.age - state.child.bornAge < 18) ? state.child.tierCost : Math.round(state.child.tierCost * 0.5);
      yearExp += cCost;
      lines.push(`子女养育/大学开销：-${cCost.toLocaleString()} 元`);
    }
    if (state.age >= 50 && state.age <= 65 && !medFree) {
      let pCare = state.cityTier === 3 ? 9000 : 18000;
      if (medHalf) pCare = Math.round(pCare * 0.5);
      yearExp += pCare;
      lines.push(`高龄父母医疗照护：-${pCare.toLocaleString()} 元`);
    }
    if (state.age >= 61 && !medFree) {
      let med = state.age < 72 ? 12000 : 24000;
      if (medHalf) med = Math.round(med * 0.5);
      yearExp += med;
      lines.push(`老年康养与体检：-${med.toLocaleString()} 元`);
    }
  } else if (state.age <= 18) {
    const allowance = Math.round(state.origin.pocketMoney * 12 * (hasHex(state, 'hx_tuck_king') ? 1.5 : 1));
    state.cash += allowance;
    lines.push(`年度零花钱：+${allowance} 元`);
  } else {
    // 19–21 岁大学求学期家庭基础生活费补贴
    const uniAllow = Math.round(Math.max(1200, state.origin.pocketMoney * 16));
    state.cash += uniAllow;
    lines.push(`大学学年生活费结余：+${uniAllow.toLocaleString()} 元`);
  }

  state.cash += (yearInc - yearExp);

  // 延迟收菜海克斯结算
  const tenYr = getHexInstance(state, 'hx_ten_years');
  if (tenYr && !tenYr.done) {
    if (tenYr.yearsLeft > 0) {
      const lock = Math.max(0, Math.round(state.cash * 0.20));
      state.cash -= lock;
      tenYr.savedCash = (tenYr.savedCash || 0) + lock;
      tenYr.yearsLeft--;
      lines.push(`【三年定投翻倍】年末定存 ¥${lock.toLocaleString()}（已存 ¥${tenYr.savedCash.toLocaleString()}，剩 ${tenYr.yearsLeft} 年返还）`);
      if (tenYr.yearsLeft <= 0) {
        const payout = Math.round(Math.max(10000, tenYr.savedCash) * 2.2);
        state.cash += payout;
        state.hexRerollTickets++;
        tenYr.done = true;
        lines.push(`【三年定投翻倍】期满返还 2.2 倍本息 +¥${payout.toLocaleString()}，另赠重随券 +1！`);
      }
    }
  }
  if (t1Bet && !t1Bet.done && state.age >= state.gradAge) {
    t1Bet.yearsLeft--;
    if (t1Bet.yearsLeft <= 0) {
      t1Bet.done = true;
      if (state.cityTier === 1) {
        state.jobLevel = Math.min(5, state.jobLevel + 1);
        state.cash += 60000;
        lines.push(`【留在大城赌一把】扛满 3 年！直升 L${state.jobLevel} 并获奖金 +¥6 万！`);
      } else {
        lines.push('【留在大城赌一把】因中途离开一线城市，未能兑现升职奖金。');
      }
    }
  }

  // P1-12：宠物年度口粮与成长先于欠款清算，避免现金被二次扣成负数
  const petRep = advancePetYear(state);
  if (petRep) {
    if (petRep.line) lines.push(petRep.line);
    if (petRep.died) {
      state.albumPhotos.push({
        age: state.age,
        stamp: getDateStamp(state.age, 3),
        title: `告别${petRep.petName} · 珍藏${petRep.keepsake}`,
        stageIdx: getSubStageIndex(state.age),
        bg: state.age <= 18 ? 'child' : state.age <= 50 ? 'adult' : 'elder'
      });
    }
  }

  if (state.cash < 0) {
    state.debt += Math.abs(state.cash);
    state.cash = 0;
    lines.push(`【现金不足】转为应付欠款，当前欠款 ${state.debt.toLocaleString()} 元（不触发结束，可卖金/加班补救）`);
  } else if (state.debt > 0 && state.cash > 0) {
    const payDebt = Math.min(state.debt, state.cash);
    state.debt -= payDebt;
    state.cash -= payDebt;
    lines.push(`自动偿还欠款：-${payDebt.toLocaleString()} 元`);
  }

  if (state.child && state.house?.trait === 'school' && state.age - state.child.bornAge <= 18) {
    state.child.study = clamp(state.child.study + 3);
    lines.push('【学区房加成】孩子年度学业额外 +3');
  }

  // 衰老损耗（跨栏和解转身底子可额外减缓 1 点衰老）
  let aging = state.age <= 18 ? 0 : (state.age <= 50 ? 2 : (state.age <= 70 ? 3 : 5));
  if (aging > 0 && state.dreams?.d_hurdle?.outcome === 'pivot') aging = Math.max(1, aging - 1);
  if (aging > 0 && (getBondTier(state, 'zen') >= 4 || (hasHex(state, 'hx_sleep_3') && state.age >= 50))) {
    aging = Math.max(1, Math.floor(aging / 2));
  }
  if (aging > 0) {
    state.stats.health = clamp(state.stats.health - aging);
    lines.push(`自然衰老：健康 -${aging}`);
  }
  if (state.talent.id === 't_steady') state.stats.mood = clamp(state.stats.mood + 2);
  if (hasHex(state, 'hx_pop_2')) {
    state.relations.parents.intimacy = clamp(state.relations.parents.intimacy + 2);
    state.relations.friend.intimacy = clamp(state.relations.friend.intimacy + 2);
    if (state.relations.partner) state.relations.partner.intimacy = clamp(state.relations.partner.intimacy + 2);
    lines.push('【社团人气王】全员亲密自动 +2');
  }

  // 学生阶段不扣累计学业记录；19 岁成年后才开启生疏保护规则
  if (state.age >= 19) {
    for (const k of ['knowledge', 'numLogic', 'pro', 'expr', 'selfCare']) {
      if (!state.usedThisYear[k]) {
        state.unusedYears[k] = (state.unusedYears[k] || 0) + 1;
        if (state.unusedYears[k] >= 2 && state.stats[k] > (state.floors[k] || 0)) {
          state.stats[k]--;
          if (k === 'knowledge' || k === 'numLogic') state.statsRaw[k] = state.stats[k];
        }
      }
      state.usedThisYear[k] = false;
    }
  } else {
    for (const k of ['knowledge', 'numLogic', 'pro', 'expr', 'selfCare']) {
      state.usedThisYear[k] = false;
    }
  }

  // 5. 推进年龄与重置年度计数
  const finishedAge = state.age;
  state.age++;
  state.subTurn = 1;
  state.tutoredThisYear = 0;
  state.overtimeThisYear = 0;
  state.emoBuyThisYear = 0;
  state.flipGameThisYear = 0;
  state.relations.parents.helpedThisYear = false;

  // 6. P1-07：在完成年切换与年度计数清零后再拍 18/30/50 岁分支快照，恢复后状态与实时新年完全一致
  if ([18, 30, 50].includes(finishedAge)) {
    const snapBranch = { ...state, branches: {} };
    state.branches[finishedAge] = JSON.stringify(snapBranch);
    lines.push(`【人生树分叉点】已自动保存 ${finishedAge} 岁存档，可随时回溯重走！`);
  }

  const extendHealthReq = hasHex(state, 'hx_sleep_3') ? 45 : 60;
  if (state.stats.health <= 0) {
    state.ended = true;
    state.endReason = `${finishedAge} 岁健康归零提前谢幕`;
  } else if (finishedAge === 80 && !state.extendedTo90) {
    if (state.stats.health < extendHealthReq) {
      state.ended = true;
      state.endReason = '80 岁走完标准人生终章';
    }
  } else if (finishedAge >= 90) {
    state.ended = true;
    state.endReason = '90 岁高寿圆满谢幕';
  }

  return { age: finishedAge, lines, canExtend: (finishedAge === 80 && state.stats.health >= extendHealthReq && !state.extendedTo90) };
}

export function getNetWorth(state) {
  const houseNet = state.house ? Math.round(state.house.value - state.house.loan) : 0;
  const goldVal = Math.round((state.goldGrams || 0) * (state.goldPrice || 0));
  // P1-10：三年定投未到期冻结本金计入净资产，兑付后自动转入现金不重复计算
  const tenYr = getHexInstance(state, 'hx_ten_years');
  const lockedCash = (tenYr && !tenYr.done && tenYr.savedCash > 0) ? Math.round(tenYr.savedCash) : 0;
  return Math.round((state.cash || 0) + lockedCash + houseNet + goldVal - (state.debt || 0));
}

// 供「家与账」红绿收支天平实时预估本年现金流（进账 vs 刚性账单）
export function estimateAnnualCashflow(state) {
  ensureSprint1State(state);
  const city = CITIES[state.cityTier];
  const era = getCurrentEra(state);
  const wealthTier = getBondTier(state, 'wealth');
  const pb = getHexInstance(state, 'hx_piggybank');

  if (state.age <= 18) {
    const allow = Math.round(state.origin.pocketMoney * 12 * (hasHex(state, 'hx_tuck_king') ? 1.5 : 1));
    return { annualIn: allow, annualOut: 180, netAnnual: allow - 180 };
  }
  if (state.age < state.gradAge) {
    const uniAllow = Math.round(Math.max(1200, state.origin.pocketMoney * 16));
    return { annualIn: uniAllow, annualOut: 600, netAnnual: uniAllow - 600 };
  }

  let inc = 0;
  const salMo = getCurrentMonthlySalary(state);
  if (state.age < 60) inc += salMo * 12;
  else inc += (state.pensionMo || 3000) * 12;

  if (state.relations.partner?.married) {
    const spBase = city.spouseBaseYr * state.relations.partner.incomeMult;
    const spGrowth = 1 + Math.min(0.35, Math.max(0, state.age - 25) * 0.015);
    inc += state.age < 60 ? Math.round(spBase * spGrowth) : Math.round(spBase * 1.3 * 0.5);
  }
  if (hasHex(state, 'hx_duo_ip')) {
    inc += Math.floor((state.stats.knowledge + state.stats.pro) / 20) * 12000;
  }
  if (hasHex(state, 'hx_singer_royalty') && state.dreams?.d_singer?.songsCount > 0) {
    inc += Math.min(10, state.dreams.d_singer.songsCount) * 6000;
  }
  if (state.cash > 0) {
    inc += Math.round(state.cash * (era.finRate + (wealthTier >= 2 ? 0.015 : 0) + (pb ? pb.stacks * 0.001 : 0)));
  }

  let exp = 0;
  const married = Boolean(state.relations.partner?.married);
  const baseLiving = Math.round(city.livingYr * (married ? 1.8 : 1.0));
  const lifestyle = hasHex(state, 'hx_minimalist') ? 0 : Math.round(inc * 0.18);
  exp += baseLiving + lifestyle;
  if (state.origin.remitRate > 0 && state.age < 60) {
    exp += Math.max(state.origin.remitMin, Math.round(salMo * 12 * state.origin.remitRate));
  }
  if (!state.house) {
    const t1Bet = getHexInstance(state, 'hx_tier1_bet');
    const rentMult = (t1Bet && !t1Bet.done && t1Bet.yearsLeft > 0) ? 1.5 : 1.0;
    exp += Math.round(city.rentYr * rentMult);
  } else {
    if (state.house.loan > 0) exp += state.house.pmtMo * 12;
    exp += Math.round(state.house.basePrice * 0.005);
  }
  if (state.hasCar) exp += 6000;
  if (state.child && state.age - state.child.bornAge < 22) {
    exp += (state.age - state.child.bornAge < 18) ? state.child.tierCost : Math.round(state.child.tierCost * 0.5);
  }
  const medFree = hasHex(state, 'hx_surgeon_blade');
  if (state.age >= 50 && state.age <= 65 && !medFree) exp += (state.cityTier === 3 ? 9000 : 18000);
  if (state.age >= 61 && !medFree) exp += (state.age < 72 ? 12000 : 24000);

  return { annualIn: inc, annualOut: exp, netAnnual: inc - exp };
}

export function evaluateEnding(state) {
  const nw = getNetWorth(state);
  const originBase = state.origin?.familyAsset || 400000;
  const leapBonus = nw > originBase * 2 ? 25 : (nw > originBase ? 15 : 5);
  const careerScore = clamp(30 + leapBonus + (state.jobLevel * 8) + (state.house ? (state.house.tier === '富豪' ? 25 : state.house.tier === '中产' ? 18 : 10) : 0) + (nw >= 5000000 ? 15 : nw >= 2000000 ? 10 : 0));

  let loveScore = 25 + Math.round(state.relations.parents.intimacy * 0.25) + Math.round(state.relations.friend.intimacy * 0.30);
  if (state.relations.partner) loveScore += Math.round(state.relations.partner.intimacy * 0.35);
  else if (state.choseDink || state.elderCircle) loveScore += 22;
  if (state.child) loveScore += Math.round(state.child.bond * 0.25);
  else loveScore += (state.experiences.length * 3);
  loveScore = clamp(loveScore);

  const hasPivot = state.dreams && Object.values(state.dreams).some(d => d.outcome === 'pivot');
  const dreamBonus = state.dreamCompleted ? 35 : (hasPivot ? 24 : Math.round(state.dreamSkill * 0.3));
  const dreamScore = clamp(30 + dreamBonus + (state.worldTrips * 12) + (state.house?.buffActive ? 15 : 0));

  // 4. 善始善终
  const healthScore = clamp(25 + (state.age >= 80 ? 30 : Math.round(state.age * 0.3)) + Math.round(state.stats.mood * 0.25) + (state.elderCircle ? 12 : 0) + (state.experiences.includes('exp_anti_scam') ? 10 : 0));

  const grade = v => v >= 85 ? 'S' : v >= 70 ? 'A' : v >= 55 ? 'B' : 'C';

  // 暗线 4 条因果链（双性别旧物等价：8岁悠悠球 / 8岁芭比娃娃）
  const hasToy = state.items.includes('8岁悠悠球') || state.items.includes('8岁芭比娃娃');
  const darkChains = [
    { name: state.gender === 'female' ? '初心留痕（8岁芭比娃娃上墙）' : '初心留痕（8岁悠悠球上墙）', ok: hasToy && Boolean(state.house?.buffActive) },
    { name: '半生挚友（同桌亲密≥60）', ok: state.relations.friend.intimacy >= 60 },
    { name: '梦想回响（通关v1.4梦想）', ok: state.dreamCompleted },
    { name: '晚年圆满（无孤独+心愿之旅）', ok: (state.elderCircle || Boolean(state.relations.partner?.married)) && state.worldTrips >= 1 }
  ];
  const allS = [careerScore, loveScore, dreamScore, healthScore].every(v => v >= 85);
  const allDark = darkChains.every(c => c.ok);

  let title = '【岁月留痕】平凡余生';
  if (allS && allDark) title = '【全满贯】无憾此生';
  else if ((state.origin.id === 'poor' || state.origin.id === 'working') && (state.university?.tier <= 2 || state.house?.tier === '中产' || state.house?.tier === '富豪')) title = '【逆袭传奇】走出村子的第一人';
  else if (state.dreamCompleted) title = '【梦想至上】赤子不老';
  else if (!state.relations.partner && !state.child && careerScore >= 75 && healthScore >= 75) title = '【自由行者】我即山海';
  else if (nw >= 8000000 && (loveScore < 70 || healthScore < 70)) title = '【时代弄潮儿】黄金与砖瓦';
  else if (loveScore >= 80 && healthScore >= 80) title = '【烟火圆满】人间值得';

  return {
    title,
    scores: {
      career: { val: careerScore, g: grade(careerScore) },
      love: { val: loveScore, g: grade(loveScore) },
      dream: { val: dreamScore, g: grade(dreamScore) },
      health: { val: healthScore, g: grade(healthScore) }
    },
    darkChains,
    netWorth: nw
  };
}
