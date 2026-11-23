// 《这辈子 2.0》第 3 步纯策略灰盒原型 - 核心五维整数引擎与双层周期流转
import {
  ORIGINS, CITIES, TRACKS, UNIVERSITIES, DREAMS, SPOUSE_BACKGROUNDS,
  ERA_TIMELINE, SUB_STAGES, PROMO_REQ, LEVEL_MULT, APPROVED_SYSTEM_ANCHORS
} from './data.js';

export function clamp(v, min = 0, max = 100) {
  return Math.max(min, Math.min(max, Math.round(v)));
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
  const s = {
    gender,
    age: 6,
    subTurn: 1,
    totalTurns: 0,
    origin,
    talent,
    cityTier: origin.cityTier,
    // 五维核心（全面整数化）
    cash: origin.pocketMoney * 6 + (talent.id === 't_saver' ? 500 : 0),
    debt: 0,
    goldGrams: 0,
    house: null, // { id, tier, name, value, basePrice, loan, pmtMo, grid, buffActive, layout }
    hasCar: false,
    // 能力与保底里程碑
    stats: {
      knowledge: clamp(20 + origin.offsets.knowledge + (talent.id === 't_book' ? 6 : 0) + (talent.id === 't_tutor' ? 8 : 0)),
      pro: 0,
      expr: clamp(20 + origin.offsets.expr + (talent.id === 't_social' || talent.id === 't_vision' ? 6 : 0)),
      selfCare: clamp(20 + origin.offsets.selfCare + (talent.id === 't_saver' ? 6 : 0) + (talent.id === 't_biz' || talent.id === 't_rebel' ? 10 : 0)),
      health: clamp(80 + origin.offsets.health + (talent.id === 't_health' ? 6 : 0)),
      mood: clamp(70 + origin.offsets.mood + (talent.id === 't_art' ? 4 : 0) + (talent.id === 't_koi2' ? 8 : 0)),
      fatigue: 0
    },
    halfProgress: { knowledge: 0, pro: 0, expr: 0, selfCare: 0, dream: 0 },
    floors: { knowledge: 0, pro: 0, expr: 0, selfCare: 0 },
    unusedYears: { knowledge: 0, pro: 0, expr: 0, selfCare: 0 },
    usedThisYear: { knowledge: false, pro: false, expr: false, selfCare: false },
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
    dreamSkill: talent.id === 't_dream' ? 8 : (talent.id === 't_art' ? 12 : 0),
    dreamCompleted: false,
    // 关系网
    relations: {
      parents: { name: '父母', intimacy: 65, missedTurns: 0, helpedThisYear: false },
      friend: { name: '同桌小周', intimacy: 35 + (talent.id === 't_social' ? 8 : 0), missedTurns: 0, helpedThisYear: false },
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
    parentReservePenalty: 0
  };
  updateMilestones(s);
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
  const city = CITIES[state.cityTier];
  const era = getCurrentEra(state);
  const lvlMult = LEVEL_MULT[state.jobLevel] || 1.0;
  const effectiveYears = state.age > state.track.capAge
    ? Math.max(0, state.yearsInLevel - (state.age - state.track.capAge))
    : state.yearsInLevel;
  const tenureBonus = Math.min(0.21, effectiveYears * 0.03);
  let mult = 1.0;
  if (state.track.id === 'burst' && era.name === '新经济红利期') mult *= 1.10;
  if (state.university.abroad && era.name === '房产黄金周期') mult *= 0.92; // 海归贬值信号
  if (state.aiSkillLearned && state.age >= 43) mult *= 1.10;
  return Math.round(state.university.baseSalary * city.salaryCoef * state.track.coef * (lvlMult + tenureBonus) * mult);
}

export function getTurnSlotBudget(state) {
  const mp = getMacroParams(state.age);
  let slots = mp.baseSlots;
  const city = CITIES[state.cityTier];
  // 三线城市慢生活：每年第 2 子回合额外 +1 格
  if (state.age >= state.gradAge && city.extraSlot && state.subTurn === 2) slots += 1;
  // 在职住普通远郊房：一线第1/3子回合各锁1格，二线第1子回合锁1格，退休自动解除
  let commuteLocked = 0;
  if (state.house && state.house.tier === '普通' && !state.retired && state.age >= state.gradAge) {
    if (city.commuteLock === 2 && (state.subTurn === 1 || state.subTurn === 3)) commuteLocked = 1;
    if (city.commuteLock === 1 && state.subTurn === 1) commuteLocked = 1;
  }
  let healthPenalty = state.stats.health < 30 ? 1 : 0;
  // 0-3 岁育儿刚性占 1 格（可通过请父母代班即时释放）
  let babyLock = (state.child && state.age - state.child.bornAge <= 3 && !state.relations.parents.helpedThisYear) ? 1 : 0;
  const available = Math.max(2, slots - commuteLocked - healthPenalty - babyLock);
  return { base: slots, commuteLocked, healthPenalty, babyLock, available };
}

export function trainStat(state, key, extra = 0) {
  const isLowMood = state.stats.mood < 30;
  const cur = key === 'dream' ? state.dreamSkill : state.stats[key];
  let gain = 0;
  if (cur < 60) gain = 2;
  else if (cur < 85) gain = 1;
  else {
    state.halfProgress[key] = (state.halfProgress[key] || 0) + 1;
    if (state.halfProgress[key] >= 2) {
      gain = 1;
      state.halfProgress[key] = 0;
    }
  }
  // 付费补习规则：能力 <85 时额外 +1
  if (extra > 0 && cur < 85) gain += extra;
  // 心态 <30 训练收益减半（工薪韧性可豁免减半）
  if (isLowMood && state.origin.id !== 'working' && gain > 1) {
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
  for (const k of ['knowledge', 'pro', 'expr', 'selfCare']) {
    const v = state.stats[k];
    if (v >= 85) state.floors[k] = Math.max(state.floors[k], 65);
    else if (v >= 60) state.floors[k] = Math.max(state.floors[k], 45);
    else if (v >= 30) state.floors[k] = Math.max(state.floors[k], 20);
  }
}

function expectedGainText(state, key, label, extra = 0) {
  const cur = key === 'dream' ? state.dreamSkill : state.stats[key];
  let g = cur < 60 ? 2 : (cur < 85 ? 1 : 0);
  if (extra > 0 && cur < 85) g += extra;
  if (state.stats.mood < 30 && state.origin.id !== 'working' && g > 1) g = Math.floor(g / 2);
  if (cur >= 85) {
    return (state.halfProgress[key] || 0) >= 1 ? `${label} +1（冲刺突破）` : `${label} 高阶积累（再练1次+1）`;
  }
  return `${label} +${g}`;
}

export function getAvailableActions(state) {
  const actions = [];
  const isChild = state.age <= 18;
  const isAdult = state.age >= 19 && state.age <= 50;
  const isElder = state.age >= 51;
  const isWorking = state.age >= state.gradAge && !state.retired;

  // 1. 成长与学习（全部动态计算精确大白话，杜绝 <85 等策划黑话）
  if (isChild) {
    actions.push({ id: 'study_self', cat: '1.成长与学习', name: '课业自习', costCash: 0, preview: `${expectedGainText(state, 'knowledge', '学识')} · 心态 -1 · 疲劳 +1` });
    const canTutor = state.tutoredThisYear < state.origin.eduLimit;
    const tutorFee = state.talent.id === 't_tutor' ? 250 : 500;
    const tutorMood = state.talent.id === 't_book' ? 1 : 2;
    const tutorTip = state.stats.knowledge < 85
      ? `${expectedGainText(state, 'knowledge', '学识', 1)}（名师提速） · 心态 -${tutorMood} · 疲劳 +1`
      : `学识已达高阶，补习无额外提速 · 心态 -${tutorMood}`;
    actions.push({ id: 'study_tutor', cat: '1.成长与学习', name: `付费补习 (本年 ${state.tutoredThisYear}/${state.origin.eduLimit})`, costCash: tutorFee, disabled: !canTutor, preview: tutorTip });
    if (state.age >= 15) {
      actions.push({ id: 'gaokao_sprint', cat: '1.成长与学习', name: '考前冲刺', costCash: 0, preview: `${expectedGainText(state, 'knowledge', '学识', 1)} · 留存高考冲刺经历 · 疲劳 +2` });
    }
  } else if (isAdult) {
    actions.push({ id: 'pro_self', cat: '1.成长与学习', name: '专业自学', costCash: 0, preview: `${expectedGainText(state, 'pro', '专业')} · 心态 -1 · 疲劳 +1` });
    actions.push({ id: 'pro_course', cat: '1.成长与学习', name: '导师项目课 / 学AI', costCash: 500, preview: `${expectedGainText(state, 'pro', '专业', 1)} · 攒1条晋升项目经历` });
  } else {
    actions.push({ id: 'elder_uni', cat: '1.成长与学习', name: '老年大学 / 防骗课', costCash: 200, preview: `${expectedGainText(state, 'knowledge', '学识')} · 心态 +2 · 提升防骗力` });
  }

  // 2. 职业与搞钱
  if (isChild) {
    const pay = state.origin.id === 'poor' ? 150 : 100;
    actions.push({ id: 'chores', cat: '2.职业与搞钱', name: state.age <= 12 ? '帮做家务换零花' : '假期兼职/二手课本', costCash: 0, preview: `零花钱 +${pay}元 · ${expectedGainText(state, 'selfCare', '自理')} · 疲劳 +1` });
  } else if (isWorking) {
    const otPay = Math.round((state.overtimeThisYear < 4 ? 3000 : 1800) * (state.cityTier === 1 ? 1.2 : 1.0));
    actions.push({ id: 'overtime', cat: '2.职业与搞钱', name: `加班/接副业 (本年 ${state.overtimeThisYear}/8)`, costCash: 0, disabled: state.overtimeThisYear >= 8, preview: `现金 +${otPay}元 · 健康 -1 · 心态 -2 · 疲劳 +${state.cityTier === 1 ? 4 : 3}` });
  } else if (isElder && state.retired && (state.track?.id === 'longtail' || state.jobLevel >= 4)) {
    actions.push({ id: 'rehire_work', cat: '2.职业与搞钱', name: '专家返聘/顾问', costCash: 0, preview: '现金 +6,000元 · 疲劳 +2 · 发挥余热' });
  }

  // 3. 情感与社交
  actions.push({ id: 'accompany_parents', cat: '3.情感与社交', name: '陪伴父母', costCash: 0, preview: '父母亲密 +4 · 心态 +2 · 攒共同经历' });
  actions.push({ id: 'accompany_friend', cat: '3.情感与社交', name: isChild ? '和同桌死党玩耍' : '约老友重聚', costCash: isChild ? 0 : 200, preview: `旧友亲密 +4 · ${expectedGainText(state, 'expr', '表达')} · 心态 +2` });
  if (state.age >= 19 && state.relations.partner) {
    actions.push({ id: 'date_partner', cat: '3.情感与社交', name: state.relations.partner.married ? '夫妻约会保温' : '恋爱深度约会', costCash: 300, preview: '伴侣亲密 +5 · 心态 +3 · 攒共同经历' });
  }
  if (isElder) {
    actions.push({ id: 'square_dance', cat: '3.情感与社交', name: '跳广场舞 / 建老年圈', costCash: 0, preview: '健康 +2 · 心态 +2 · 抵消退休孤独' });
  }

  // 4. 家庭与育儿
  if (state.child && state.age - state.child.bornAge <= 18) {
    actions.push({ id: 'tutor_kid', cat: '4.家庭与育儿', name: '辅导孩子作业', costCash: 0, preview: '孩子学业 +4 · 自身心态 -2 · 疲劳 +2' });
    actions.push({ id: 'play_kid', cat: '4.家庭与育儿', name: '高质量陪娃', costCash: 100, preview: '孩子心态 +4 · 亲子羁绊 +4 · 心态 +2' });
  }

  // 5. 梦想专精
  actions.push({ id: 'train_dream', cat: '5.梦想专精', name: state.activeDreams.length ? `追梦训练 (${state.activeDreams[0].name})` : '少年梦想启蒙', costCash: isChild ? 0 : 300, preview: `${expectedGainText(state, 'dream', '梦想专长')} · 心态 +1 · 疲劳 +1` });

  // 6. 身心与生活
  actions.push({ id: 'exercise', cat: '6.身心与生活', name: isElder ? '太极/八段锦/散步' : '体育锻炼/夜跑', costCash: 0, preview: `健康 +${state.talent.id === 't_health' ? 3 : 2} · 心态 +1 · 疲劳 -2` });
  actions.push({ id: 'rest', cat: '6.身心与生活', name: '完整休息放空', costCash: 0, preview: `心态 +3 · 疲劳 -${state.house?.buffActive ? 5 : 4}` });
  if (state.age >= 26 && state.age <= 55) {
    actions.push({ id: 'pub_drink', cat: '6.身心与生活', name: '去小酒馆喝酒减压', costCash: 300, preview: `心态 +6 · 疲劳 -3 · 健康 -${state.pubStreak >= 1 ? 2 : 1}` });
  }
  if (isElder && state.age >= 60) {
    actions.push({ id: 'world_trip', cat: '6.身心与生活', name: '环游世界一站', costCash: 80000, preview: '花 8 万圆梦旅行 · 心态 +8 · 暗线进度 +1' });
  }
  return actions;
}

export function previewDraft(state, draftIds) {
  const all = getAvailableActions(state);
  let cash = 0, health = 0, mood = 0, fatigue = -2; // 每回合自然恢复 -2
  for (const id of draftIds) {
    const a = all.find(x => x.id === id);
    if (!a) continue;
    cash -= a.costCash;
    if (id === 'study_self' || id === 'pro_self') { mood -= 1; fatigue += 1; }
    if (id === 'study_tutor' || id === 'pro_course') { mood -= 2; fatigue += 1; }
    if (id === 'gaokao_sprint') { mood -= 2; fatigue += 2; }
    if (id === 'elder_uni') { mood += 2; }
    if (id === 'chores') { cash += (state.origin.id === 'poor' ? 150 : 100); fatigue += 1; }
    if (id === 'overtime') {
      cash += Math.round((state.overtimeThisYear < 4 ? 3000 : 1800) * (state.cityTier === 1 ? 1.2 : 1.0));
      health -= 1; mood -= 2; fatigue += (state.cityTier === 1 ? 4 : 3);
    }
    if (id === 'rehire_work') { cash += 6000; fatigue += 2; }
    if (id === 'accompany_parents' || id === 'accompany_friend' || id === 'play_kid') { mood += 2; }
    if (id === 'date_partner') { mood += 3; }
    if (id === 'square_dance') { health += 2; mood += 2; fatigue -= 1; }
    if (id === 'tutor_kid') { mood -= 2; fatigue += 2; }
    if (id === 'train_dream') { mood += 1; fatigue += 1; }
    if (id === 'exercise') { health += (state.talent.id === 't_health' ? 3 : 2); mood += 1; fatigue -= 2; }
    if (id === 'rest') { mood += 3; fatigue -= (state.house?.buffActive ? 5 : 4); }
    if (id === 'pub_drink') { mood += 6; fatigue -= 3; health -= (state.pubStreak >= 1 ? 2 : 1); }
    if (id === 'world_trip') { mood += 8; fatigue += 1; }
  }
  const endFatigue = clamp(state.stats.fatigue + fatigue);
  if (endFatigue >= state.origin.fatigueLimit) health -= 1;
  if (state.age >= 60 && !state.elderCircle && !(state.relations.partner?.married)) mood -= 1;
  return { cash, health, mood, endFatigue, fatigueWarn: endFatigue >= state.origin.fatigueLimit };
}

export function executeTurn(state, draftIds) {
  const all = getAvailableActions(state);
  const summary = [];
  let wentPub = false;
  let accompaniedPartner = false;
  let accompaniedParents = false;
  let accompaniedFriend = false;

  for (const id of draftIds) {
    const a = all.find(x => x.id === id);
    if (!a) continue;
    if (a.costCash > 0) state.cash -= a.costCash;
    switch (id) {
      case 'study_self': {
        const g = trainStat(state, 'knowledge', 0);
        state.stats.mood = clamp(state.stats.mood - 1);
        state.stats.fatigue = clamp(state.stats.fatigue + 1);
        summary.push(`课业自习：学识 +${g}`);
        break;
      }
      case 'study_tutor': {
        if (state.tutoredThisYear < state.origin.eduLimit) {
          const g = trainStat(state, 'knowledge', 1);
          state.tutoredThisYear++;
          state.stats.mood = clamp(state.stats.mood - (state.talent.id === 't_book' ? 1 : 2));
          state.stats.fatigue = clamp(state.stats.fatigue + 1);
          summary.push(`付费补习：学识 +${g}`);
        }
        break;
      }
      case 'gaokao_sprint': {
        const g = trainStat(state, 'knowledge', 1);
        state.stats.mood = clamp(state.stats.mood - 2);
        state.stats.fatigue = clamp(state.stats.fatigue + 2);
        if (!state.experiences.includes('exp_gaokao_sprint')) state.experiences.push('exp_gaokao_sprint');
        summary.push(`考前冲刺：学识 +${g}，留存冲刺经历`);
        break;
      }
      case 'pro_self': {
        const g = trainStat(state, 'pro', 0);
        state.stats.mood = clamp(state.stats.mood - 1);
        state.stats.fatigue = clamp(state.stats.fatigue + 1);
        summary.push(`专业自学：专业 +${g}`);
        break;
      }
      case 'pro_course': {
        const g = trainStat(state, 'pro', 1);
        state.projectCount++;
        if (state.age >= 35) state.aiSkillLearned = true;
        state.stats.mood = clamp(state.stats.mood - 2);
        state.stats.fatigue = clamp(state.stats.fatigue + 1);
        summary.push(`项目课/学AI：专业 +${g}，项目经历 +1`);
        break;
      }
      case 'elder_uni': {
        const g1 = trainStat(state, 'knowledge', 0);
        const g2 = trainStat(state, 'selfCare', 0);
        state.stats.mood = clamp(state.stats.mood + 2);
        summary.push(`老年大学：学识 +${g1}，自理 +${g2}`);
        break;
      }
      case 'chores': {
        const pay = state.origin.id === 'poor' ? 150 : 100;
        state.cash += pay;
        const g = trainStat(state, 'selfCare', 0);
        state.stats.fatigue = clamp(state.stats.fatigue + 1);
        summary.push(`家务/兼职：现金 +${pay}，自理 +${g}`);
        break;
      }
      case 'overtime': {
        if (state.overtimeThisYear < 8) {
          const pay = Math.round((state.overtimeThisYear < 4 ? 3000 : 1800) * (state.cityTier === 1 ? 1.2 : 1.0));
          state.cash += pay;
          state.overtimeThisYear++;
          state.stats.health = clamp(state.stats.health - 1);
          state.stats.mood = clamp(state.stats.mood - 2);
          state.stats.fatigue = clamp(state.stats.fatigue + (state.cityTier === 1 ? 4 : 3));
          summary.push(`加班副业：现金 +${pay}`);
        }
        break;
      }
      case 'rehire_work': {
        state.cash += 6000;
        state.stats.fatigue = clamp(state.stats.fatigue + 2);
        summary.push('专家返聘：现金 +6,000');
        break;
      }
      case 'accompany_parents': {
        accompaniedParents = true;
        state.relations.parents.intimacy = clamp(state.relations.parents.intimacy + Math.round(4 * state.origin.intimacyMult));
        state.relations.parents.missedTurns = 0;
        state.stats.mood = clamp(state.stats.mood + 2);
        if (!state.experiences.includes('exp_care_parents')) state.experiences.push('exp_care_parents');
        summary.push('陪伴父母：亲密 +4，心态 +2');
        break;
      }
      case 'accompany_friend': {
        accompaniedFriend = true;
        state.relations.friend.intimacy = clamp(state.relations.friend.intimacy + Math.round(4 * state.origin.intimacyMult));
        state.relations.friend.missedTurns = 0;
        trainStat(state, 'expr', 0);
        state.stats.mood = clamp(state.stats.mood + 2);
        if (!state.experiences.includes('exp_desk_mate') && state.age <= 18) state.experiences.push('exp_desk_mate');
        summary.push('老友互动：亲密 +4，表达提升');
        break;
      }
      case 'date_partner': {
        if (state.relations.partner) {
          accompaniedPartner = true;
          state.relations.partner.intimacy = clamp(state.relations.partner.intimacy + Math.round(5 * state.origin.intimacyMult));
          state.relations.partner.missedTurns = 0;
          state.stats.mood = clamp(state.stats.mood + 3);
          if (!state.experiences.includes('exp_love_bond')) state.experiences.push('exp_love_bond');
          summary.push('伴侣约会：亲密 +5，心态 +3');
        }
        break;
      }
      case 'square_dance': {
        state.stats.health = clamp(state.stats.health + 2);
        state.stats.mood = clamp(state.stats.mood + 2);
        state.stats.fatigue = clamp(state.stats.fatigue - 1);
        state.elderCircleProgress++;
        if (state.elderCircleProgress >= 3 && !state.elderCircle) {
          state.elderCircle = true;
          summary.push('建成「活跃老年社交圈」（成功抵消退休孤独衰减！）');
        } else {
          summary.push('广场舞社团：健康 +2，心态 +2');
        }
        break;
      }
      case 'tutor_kid': {
        if (state.child) {
          state.child.study = clamp(state.child.study + 4);
          state.stats.mood = clamp(state.stats.mood - 2);
          state.stats.fatigue = clamp(state.stats.fatigue + 2);
          summary.push('辅导作业：孩子学业 +4（血压略升，心态 -2）');
        }
        break;
      }
      case 'play_kid': {
        if (state.child) {
          state.child.mood = clamp(state.child.mood + 4);
          state.child.bond = clamp(state.child.bond + 4);
          state.stats.mood = clamp(state.stats.mood + 2);
          summary.push('高质量陪娃：孩子心态 +4，亲子羁绊 +4');
        }
        break;
      }
      case 'train_dream': {
        const g = trainStat(state, 'dream', 0);
        state.stats.mood = clamp(state.stats.mood + 1);
        state.stats.fatigue = clamp(state.stats.fatigue + 1);
        if (state.dreamSkill >= 75 && !state.dreamCompleted && state.age >= 22) {
          state.dreamCompleted = true;
          state.experiences.push('exp_dream_complete');
          summary.push(`【梦想里程碑达成】专长达到 ${state.dreamSkill}，通关 v1.4 已审梦想终章！`);
        } else {
          summary.push(`追梦训练：专长 +${g} (当前 ${state.dreamSkill})`);
        }
        break;
      }
      case 'exercise': {
        const h = state.talent.id === 't_health' ? 3 : 2;
        state.stats.health = clamp(state.stats.health + h);
        state.stats.mood = clamp(state.stats.mood + 1);
        state.stats.fatigue = clamp(state.stats.fatigue - 2);
        summary.push(`运动锻炼：健康 +${h}，疲劳 -2`);
        break;
      }
      case 'rest': {
        const f = state.house?.buffActive ? 5 : 4;
        state.stats.mood = clamp(state.stats.mood + 3);
        state.stats.fatigue = clamp(state.stats.fatigue - f);
        summary.push(`完整休息：心态 +3，疲劳 -${f}`);
        break;
      }
      case 'pub_drink': {
        wentPub = true;
        const hLoss = state.pubStreak >= 1 ? 2 : 1;
        state.stats.mood = clamp(state.stats.mood + 6);
        state.stats.fatigue = clamp(state.stats.fatigue - 3);
        state.stats.health = clamp(state.stats.health - hLoss);
        summary.push(`小酒馆微醺：心态 +6，疲劳 -3，健康 -${hLoss}`);
        break;
      }
      case 'world_trip': {
        state.worldTrips++;
        state.stats.mood = clamp(state.stats.mood + 8);
        state.stats.fatigue = clamp(state.stats.fatigue + 1);
        if (!state.experiences.includes('exp_world_trip')) state.experiences.push('exp_world_trip');
        summary.push(`环游世界第 ${state.worldTrips} 站完成！心态 +8`);
        break;
      }
    }
  }

  state.pubStreak = wentPub ? state.pubStreak + 1 : 0;
  state.lastDraft = [...draftIds];
  state.totalTurns = (state.totalTurns || 0) + 1;

  // 子回合自然结算（全面整数化）
  state.stats.fatigue = clamp(state.stats.fatigue - 2);
  if (state.stats.fatigue >= state.origin.fatigueLimit) {
    state.stats.health = clamp(state.stats.health - 1);
    summary.push(`【透支预警】疲劳 ≥${state.origin.fatigueLimit}，健康额外 -1`);
  }
  // 60 岁退休孤独衰减
  if (state.age >= 60 && !state.elderCircle && !(state.relations.partner?.married)) {
    state.stats.mood = clamp(state.stats.mood - 1);
    summary.push('【退休孤独】无伴侣且未建老年圈，心态 -1');
  }
  // 三线城市慢生活心态红利
  if (state.age >= state.gradAge && state.cityTier === 3) {
    state.stats.mood = clamp(state.stats.mood + 1);
  }
  // 关系自然疏远
  if (state.relations.partner) {
    if (!accompaniedPartner) {
      state.relations.partner.missedTurns++;
      if (state.relations.partner.missedTurns >= 2) {
        state.relations.partner.intimacy = clamp(state.relations.partner.intimacy - 2);
        state.relations.partner.missedTurns = 0;
      }
    }
  }
  if (!accompaniedParents) {
    state.relations.parents.missedTurns++;
    if (state.relations.parents.missedTurns >= 3) {
      state.relations.parents.intimacy = clamp(state.relations.parents.intimacy - 2);
      state.relations.parents.missedTurns = 0;
    }
  }

  updateMilestones(state);

  // 检查 1.5 硬门禁已审事件（仅 APPROVED + gender 分流校验）
  let triggeredEvent = null;
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

  // 检查提前谢幕
  if (state.stats.health <= 0) {
    state.ended = true;
    state.endReason = `${state.age} 岁因健康归零提前谢幕`;
    return { summary, triggeredEvent: null, yearEndReport: null };
  }

  // 推进子回合或进入年末决算
  const mp = getMacroParams(state.age);
  state.emoBuyThisTurn = false;
  state.lotteryThisTurn = false;

  // 18 岁第 2 子回合末触发高考节点
  const needGaokao = (state.age === 18 && state.subTurn === 2 && !state.gaokaoDone);

  let yearEndReport = null;
  if (state.subTurn < mp.subTurns) {
    state.subTurn++;
  } else {
    yearEndReport = runYearEnd(state);
  }
  return { summary, triggeredEvent, yearEndReport, needGaokao };
}

export function runYearEnd(state) {
  const era = getCurrentEra(state);
  const city = CITIES[state.cityTier];
  const lines = [];

  // 1. 理财与资产年化
  if (state.cash > 0) {
    const finGain = Math.round(state.cash * era.finRate);
    state.cash += finGain;
    if (finGain > 0) lines.push(`存款理财收益：+${finGain.toLocaleString()} 元`);
  }
  // 黄金报价随时代平滑波动（±3%微扰）
  const jitter = 1 + (Math.random() * 0.06 - 0.03);
  state.goldPrice = Math.round((state.goldPrice * 0.4 + era.goldBase * 0.6) * jitter);

  if (state.house) {
    const hJitter = era.houseGrowth + (Math.random() * 0.03 - 0.015);
    const oldVal = state.house.value;
    state.house.value = Math.max(200000, Math.round(state.house.value * (1 + hJitter)));
    const diff = state.house.value - oldVal;
    lines.push(`房产估值变动：${diff >= 0 ? '+' : ''}${diff.toLocaleString()} 元 (现值 ${Math.round(state.house.value/10000)} 万)`);
  }

  // 2. 年度收入（工资/伴侣/退休金）
  let yearInc = 0;
  if (state.age >= state.gradAge && state.age < 60 && state.university && state.track) {
    const salMo = getCurrentMonthlySalary(state);
    yearInc += salMo * 12;
    state.yearsInLevel++;
    state.workYearsTotal++;
    if (state.age >= 55) state.last5Salaries.push(salMo);
    lines.push(`本年工资入账：+${(salMo * 12).toLocaleString()} 元 (月薪 ${salMo.toLocaleString()})`);
    // 寒门打钱义务
    if (state.origin.remitRate > 0) {
      const remit = Math.max(state.origin.remitMin, Math.round(salMo * 12 * state.origin.remitRate));
      state.cash -= remit;
      lines.push(`寒门反哺家用：-${remit.toLocaleString()} 元`);
    }
    // 35-42 岁爆发赛道裁员检定（L3 以下高危）
    if (state.track.id === 'burst' && state.age >= 35 && state.age <= 42 && state.jobLevel < 4 && Math.random() < 0.16) {
      const cut = Math.round(salMo * 3);
      state.cash -= cut;
      state.stats.mood = clamp(state.stats.mood - 6);
      lines.push(`【时代冲击】遭遇大厂优化过渡，损失约 3 个月薪资 (-${cut.toLocaleString()} 元)，心态 -6`);
    }
  } else if (state.age >= 60) {
    if (!state.retired) {
      state.retired = true;
      const avg5 = state.last5Salaries.length
        ? Math.round(state.last5Salaries.reduce((a, b) => a + b, 0) / state.last5Salaries.length)
        : 8000;
      const yrCoef = Math.max(0.5, 1 - Math.max(0, Math.floor((35 - state.workYearsTotal) / 5)) * 0.1);
      state.pensionMo = Math.max(2500, Math.round(avg5 * (state.track?.replaceRate || 0.5) * yrCoef));
      lines.push(`【60 岁正式退休】核定月度退休金：${state.pensionMo.toLocaleString()} 元/月`);
    }
    yearInc += state.pensionMo * 12;
    lines.push(`本年退休金入账：+${(state.pensionMo * 12).toLocaleString()} 元`);
  }

  // 伴侣合账收入（3 档背景独立定额）
  if (state.relations.partner?.married) {
    const spBase = city.spouseBaseYr * state.relations.partner.incomeMult;
    const spGrowth = 1 + Math.min(0.35, Math.max(0, state.age - 25) * 0.015);
    const spInc = state.age < 60 ? Math.round(spBase * spGrowth) : Math.round(spBase * 1.3 * 0.5);
    yearInc += spInc;
    lines.push(`伴侣合账收入：+${spInc.toLocaleString()} 元`);
  }

  // 3. 年度刚性支出（19 岁起独立承担）
  let yearExp = 0;
  if (state.age >= state.gradAge) {
    const married = Boolean(state.relations.partner?.married);
    const baseLiving = Math.round(city.livingYr * (married ? 1.8 : 1.0));
    const lifestyle = Math.round(yearInc * 0.18); // 前台藏锋：并入年度生活费
    yearExp += baseLiving + lifestyle;
    lines.push(`年度家庭生活开销：-${(baseLiving + lifestyle).toLocaleString()} 元`);

    if (!state.house) {
      yearExp += city.rentYr;
      lines.push(`年度房租支出：-${city.rentYr.toLocaleString()} 元`);
    } else {
      if (state.house.loan > 0) {
        const interest = Math.round(state.house.loan * 0.03);
        const pmtYr = state.house.pmtMo * 12;
        const principal = Math.min(state.house.loan, Math.max(0, pmtYr - interest));
        state.house.loan -= principal;
        yearExp += (interest + principal);
        lines.push(`年度房贷还本付息：-${(interest + principal).toLocaleString()} 元 (余贷 ${Math.round(state.house.loan/10000)} 万)`);
      }
      const maint = Math.round(state.house.basePrice * 0.005);
      yearExp += maint;
    }

    if (state.child && state.age - state.child.bornAge < 22) {
      const cCost = (state.age - state.child.bornAge < 18) ? state.child.tierCost : Math.round(state.child.tierCost * 0.5);
      yearExp += cCost;
      lines.push(`子女养育/大学开销：-${cCost.toLocaleString()} 元`);
    }
    if (state.age >= 50 && state.age <= 65) {
      const pCare = state.cityTier === 3 ? 9000 : 18000;
      yearExp += pCare;
      lines.push(`高龄父母医疗照护：-${pCare.toLocaleString()} 元`);
    }
    if (state.age >= 61) {
      const med = state.age < 72 ? 12000 : 24000;
      yearExp += med;
      lines.push(`老年康养与体检：-${med.toLocaleString()} 元`);
    }
  } else if (state.age <= 18) {
    const allowance = state.origin.pocketMoney * 12;
    state.cash += allowance;
    lines.push(`年度零花钱：+${allowance} 元`);
  }

  // 结算现金与欠款（欠款不暴毙）
  state.cash += (yearInc - yearExp);
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

  // 4. 年末衰老与能力生疏（全面整数化）
  const aging = state.age <= 18 ? 0 : (state.age <= 50 ? 2 : (state.age <= 70 ? 3 : 5));
  if (aging > 0) {
    state.stats.health = clamp(state.stats.health - aging);
    lines.push(`自然衰老：健康 -${aging}`);
  }
  if (state.talent.id === 't_steady') state.stats.mood = clamp(state.stats.mood + 2);

  for (const k of ['knowledge', 'pro', 'expr', 'selfCare']) {
    if (!state.usedThisYear[k]) {
      state.unusedYears[k]++;
      if (state.unusedYears[k] >= 2 && state.stats[k] > state.floors[k]) {
        state.stats[k]--;
      }
    }
    state.usedThisYear[k] = false;
  }

  // 5. 人生树分叉自动存档（18 / 30 / 50 岁）
  if ([18, 30, 50].includes(state.age)) {
    state.branches[state.age] = JSON.stringify({ ...state, branches: {} });
    lines.push(`【人生树分叉点】已自动保存 ${state.age} 岁存档，可随时回溯重走！`);
  }

  // 6. 推进年龄与终章判定
  const finishedAge = state.age;
  state.age++;
  state.subTurn = 1;
  state.tutoredThisYear = 0;
  state.overtimeThisYear = 0;
  state.emoBuyThisYear = 0;
  state.flipGameThisYear = 0;
  state.relations.parents.helpedThisYear = false;

  if (state.stats.health <= 0) {
    state.ended = true;
    state.endReason = `${finishedAge} 岁健康归零提前谢幕`;
  } else if (finishedAge === 80 && !state.extendedTo90) {
    if (state.stats.health < 60) {
      state.ended = true;
      state.endReason = '80 岁走完标准人生终章';
    }
  } else if (finishedAge >= 90) {
    state.ended = true;
    state.endReason = '90 岁高寿圆满谢幕';
  }

  return { age: finishedAge, lines, canExtend: (finishedAge === 80 && state.stats.health >= 60 && !state.extendedTo90) };
}

export function getNetWorth(state) {
  const houseNet = state.house ? (state.house.value - state.house.loan) : 0;
  const goldVal = Math.round(state.goldGrams * state.goldPrice);
  return state.cash + houseNet + goldVal - state.debt;
}

export function evaluateEnding(state) {
  const nw = getNetWorth(state);
  // 1. 安身立命（含出身相对跃迁分）
  const originBase = { poor: 50000, working: 400000, welloff: 1500000, middle: 5000000, rich: 20000000 }[state.origin.id];
  const leapBonus = nw > originBase * 2 ? 25 : (nw > originBase ? 15 : 5);
  const careerScore = clamp(30 + leapBonus + (state.jobLevel * 8) + (state.house ? (state.house.tier === '富豪' ? 25 : state.house.tier === '中产' ? 18 : 10) : 0) + (nw >= 5000000 ? 15 : nw >= 2000000 ? 10 : 0));

  // 2. 爱与羁绊（尊重多元：婚育与丁克/独身均可拿 S）
  let loveScore = 25 + Math.round(state.relations.parents.intimacy * 0.25) + Math.round(state.relations.friend.intimacy * 0.30);
  if (state.relations.partner) loveScore += Math.round(state.relations.partner.intimacy * 0.35);
  else if (state.choseDink || state.elderCircle) loveScore += 22; // 独立/社交路线独立加分
  if (state.child) loveScore += Math.round(state.child.bond * 0.25);
  else loveScore += (state.experiences.length * 3);
  loveScore = clamp(loveScore);

  // 3. 赤子之心
  const dreamScore = clamp(30 + (state.dreamCompleted ? 35 : Math.round(state.dreamSkill * 0.3)) + (state.worldTrips * 12) + (state.house?.buffActive ? 15 : 0));

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
