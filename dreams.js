// 《这辈子 2.0》Sprint 2.5 —— 去菜单化「自然生长四阶追梦系统」与海克斯双向共鸣引擎
// 四阶生命周期：0 未撞见 -> 1 启蒙火种 -> 2 兴趣萌芽 -> 3 认真追逐 -> 4 终局四重回响（圆梦 / 惜败再战 / 体面和解 / 岁月留白）
// 严格遵循零 Emoji 与真实千禧烟火质感。

import { hasHex, getBondTier, getHexInstance } from './hextech.js?v=s60';

function clamp(v, min = 0, max = 100) {
  return Math.max(min, Math.min(max, Math.round(v)));
}

export const DREAM_CATALOG = {
  d_esport: {
    id: 'd_esport',
    name: '电竞冠军',
    short: '电竞',
    ico: 'gamepad',
    actionHobby: { id: 'dr_esport', name: '约打五人排位', short: '五排练手', wellBg: '#efe9fb' },
    actionPro:   { id: 'dr_esport', name: '青训战术合练', short: '战术合练', wellBg: '#efe9fb' },
    keepsakeHobby: '网吧五连坐纪念币',
    keepsakeWin: '职业联赛冠军奖牌',
    pivotTrait: '业余赛事解说（每年副业分红 +¥6,000）',
    winPerk: '冠军奖金与直播分红（每年 +¥36,000 · 心态 +3）',
    climaxMinAge: 18,
    climaxMaxAge: 27,
    statKey: 'selfCare'
  },
  d_hurdle: {
    id: 'd_hurdle',
    name: '奥运田径冠军',
    short: '田径奥运',
    ico: 'stopwatch',
    actionHobby: { id: 'dr_hurdle', name: '校队专项训练', short: '校队特训', wellBg: '#e4f4eb' },
    actionPro:   { id: 'dr_hurdle', name: '省队备战集训', short: '省队集训', wellBg: '#e4f4eb' },
    keepsakeHobby: '校运会冠军奖牌',
    keepsakeWin: '奥运决赛金牌',
    pivotTrait: '终身体能底子（每年衰老损耗 -1 · 健康上限稳固）',
    winPerk: '体坛津贴与代言（每年 +¥32,000 · 健康 +2）',
    climaxMinAge: 19,
    climaxMaxAge: 30,
    statKey: 'health'
  },
  d_tsinghua: {
    id: 'd_tsinghua',
    name: '清北学霸',
    short: '清北',
    ico: 'trophy',
    actionHobby: { id: 'dr_tsinghua', name: '死磕压轴难题', short: '死磕难题', wellBg: '#e6f0fb' },
    actionPro:   { id: 'dr_tsinghua', name: '清北真题攻坚', short: '清北攻坚', wellBg: '#e6f0fb' },
    keepsakeHobby: '画满辅助线的草稿本',
    keepsakeWin: '清北烫金录取通知书',
    pivotTrait: '严密数理思维（职场专业学习永久 +1）',
    winPerk: '顶尖校友科研津贴（起薪跃迁 · 每年额外 +¥28,000）',
    climaxMinAge: 18,
    climaxMaxAge: 25,
    statKey: 'knowledge'
  },
  d_singer: {
    id: 'd_singer',
    name: '万人场歌手',
    short: '原创歌手',
    ico: 'guitar',
    actionHobby: { id: 'dr_singer', name: '抱琴录小样', short: '抱琴写歌', wellBg: '#faebe2' },
    actionPro:   { id: 'dr_singer', name: '排练打磨新歌', short: '排练新歌', wellBg: '#faebe2' },
    keepsakeHobby: '《慢一点回家》小样磁带',
    keepsakeWin: '万人体育馆主舞台母带',
    pivotTrait: '独立音乐人（每首原创每年流媒体版税 +¥3,500）',
    winPerk: '万人巡演与金曲版税（每年 +¥40,000 · 心态 +3）',
    climaxMinAge: 21,
    climaxMaxAge: 38,
    statKey: 'expr'
  },
  d_surgeon: {
    id: 'd_surgeon',
    name: '外科医生',
    short: '外科医生',
    ico: 'stethoscope',
    actionHobby: { id: 'dr_surgeon', name: '翻阅解剖图谱', short: '解剖图谱', wellBg: '#e7f2f8' },
    actionPro:   { id: 'dr_surgeon', name: '临床缝合轮转', short: '临床轮转', wellBg: '#e7f2f8' },
    keepsakeHobby: '临床见习白大褂胸牌',
    keepsakeWin: '方医生赠予的听诊器',
    pivotTrait: '医学常识护航（全家医疗照护支出减半 · 健康 +1/年）',
    winPerk: '三甲外科主刀声望（每年名医津贴 +¥38,000 · 免裁员）',
    climaxMinAge: 24,
    climaxMaxAge: 38,
    statKey: 'pro'
  }
};

export const DREAM_IDS = Object.keys(DREAM_CATALOG);

export function ensureDreamState(state) {
  if (!state) return state;
  if (!state.dreams || typeof state.dreams !== 'object') {
    state.dreams = {};
  }
  const startBonus = state.talent?.id === 't_dream' ? 8 : (state.talent?.id === 't_art' ? 10 : 0);
  for (const id of DREAM_IDS) {
    if (!state.dreams[id] || typeof state.dreams[id] !== 'object') {
      state.dreams[id] = {
        id, stage: 0, outcome: null, xp: startBonus, trains: 0, retries: 0,
        songsCount: 0, songName: '《慢一点回家》', medQualified: false, qualified: false, seenSlices: []
      };
    } else {
      if (!state.dreams[id].id) state.dreams[id].id = id;
      if (typeof state.dreams[id].stage !== 'number') state.dreams[id].stage = 0;
      if (typeof state.dreams[id].xp !== 'number') state.dreams[id].xp = startBonus;
      if (typeof state.dreams[id].trains !== 'number') state.dreams[id].trains = 0;
      if (typeof state.dreams[id].retries !== 'number') state.dreams[id].retries = 0;
      if (typeof state.dreams[id].qualified !== 'boolean') state.dreams[id].qualified = false;
      if (!Array.isArray(state.dreams[id].seenSlices)) state.dreams[id].seenSlices = [];
    }
  }
  if (!state.itemStories) state.itemStories = {};
  syncLegacyDreamFields(state);
  return state;
}

export function addKeepsakeWithStory(state, name, story, buff) {
  ensureDreamState(state);
  if (!state.items.includes(name)) state.items.push(name);
  state.itemStories[name] = { story, buff, age: state.age };
}

export function syncLegacyDreamFields(state) {
  if (!state?.dreams) return;
  const list = Object.values(state.dreams);
  let maxXp = 0;
  const serious = [];
  for (const d of list) {
    if (!d || !DREAM_CATALOG[d.id]) continue;
    if (d.xp > maxXp) maxXp = d.xp;
    if (d.stage === 3 || (d.stage === 4 && d.outcome === 'success')) {
      serious.push({ id: d.id, name: DREAM_CATALOG[d.id].name });
    }
  }
  if (!serious.length) {
    for (const d of list) {
      if (!d || !DREAM_CATALOG[d.id]) continue;
      if (d.stage === 2 || d.stage === 1) {
        serious.push({ id: d.id, name: DREAM_CATALOG[d.id].name });
      }
    }
  }
  state.dreamSkill = clamp(Math.max(state.dreamSkill || 0, maxXp));
  state.activeDreams = serious.slice(0, 3);
  state.dreamCompleted = list.some(d => d.outcome === 'success');
}

export function getSeriousDreamCount(state) {
  ensureDreamState(state);
  return Object.values(state.dreams).filter(d => d.stage === 3).length;
}

export function getSeriousDreamCap(state) {
  return getBondTier(state, 'dream') >= 4 ? 5 : 2;
}

function isTsinghuaActiveAllowed(state) {
  if (state.age <= 15) return false;
  if (state.age <= 18) return state.schoolTier !== 'vocational';
  return Boolean(state.gaokaoDone && state.university && (state.university.tier <= 3 || state.upgradedToBachelor));
}

// 动态生成排程抽屉里的专属追梦贴纸（未偶遇任何火种前绝不硬塞假按钮！）
export function getDreamScheduleActions(state) {
  ensureDreamState(state);
  const out = [];
  const isChild = state.age <= 18;
  const noFatigue = getBondTier(state, 'dream') >= 2;
  const moodGain = hasHex(state, 'hx_dream_spark') ? 2 : 1;

  for (const id of DREAM_IDS) {
    const d = state.dreams[id];
    const meta = DREAM_CATALOG[id];
    if (d.stage < 1 || d.stage >= 4) continue;
    // P0-03：职校分流期严禁显示任何清北贴纸
    if (id === 'd_tsinghua' && state.age >= 16 && state.age <= 18 && state.schoolTier === 'vocational') continue;
    // P1-12：外科医途在成年后需本科及以上学历才显示临床轮转
    if (id === 'd_surgeon' && state.age >= 19 && state.gaokaoDone && state.university && state.university.tier > 2) continue;
    // 19 岁成年后：如果已经认真追逐满上限，未立志的业余兴趣自动收拢不占面板宽度
    if (!isChild && getSeriousDreamCount(state) >= getSeriousDreamCap(state) && d.stage < 3) continue;

    // P0-02：初中阶段不得展示「清北攻坚」，仅展示「钻研重点压轴题」
    const useProSpec = d.stage >= 3 && (id !== 'd_tsinghua' || isTsinghuaActiveAllowed(state));
    const rawSpec = useProSpec ? meta.actionPro : meta.actionHobby;
    const spec = (id === 'd_tsinghua' && state.age <= 15)
      ? { ...rawSpec, name: '钻研重点压轴题', short: '钻研难题' }
      : (id === 'd_hurdle' && state.olympicSport?.name)
        ? { ...rawSpec, name: `${state.olympicSport.name}${d.stage >= 3 ? '省队集训' : '校队特训'}`, short: d.stage >= 3 ? '省队集训' : '校队特训' }
        : rawSpec;
    const baseGain = d.stage < 3
      ? (d.xp < 40 ? 3 : 2)
      : (d.xp < 65 ? 3 : d.xp < 85 ? 2 : 1);
    const effGain = getBondTier(state, 'dream') >= 2 ? Math.max(baseGain + 1, Math.round(baseGain * 1.5)) : baseGain;
    const fee = isChild ? 0 : (d.stage >= 3 ? 350 : 200);
    const fatCost = noFatigue ? 0 : (d.stage >= 3 ? 2 : 1);

    const chips = [
      { t: `${meta.short} +${effGain}`, k: 'gold' },
      { t: `心态 +${moodGain}`, k: 'pos' }
    ];
    if (id === 'd_hurdle') chips.push({ t: '健康 +1', k: 'pos' });
    else if (id === 'd_tsinghua') chips.push({ t: '学识 +1', k: 'pos' });
    else if (id === 'd_singer') chips.push({ t: '表达 +1', k: 'pos' });
    else if (id === 'd_surgeon' && state.age >= 19) chips.push({ t: '专业 +1', k: 'pos' });
    if (fatCost > 0) chips.push({ t: `疲劳 +${fatCost}`, k: fatCost >= 2 ? 'neg' : 'neu' });

    out.push({
      id: spec.id,
      dreamId: id,
      cat: '5.梦想专精',
      name: spec.name,
      short: spec.short,
      ico: meta.ico,
      wellBg: spec.wellBg,
      costCash: fee,
      isDreamAction: true,
      chips
    });
  }
  return out;
}

// 执行单张专属追梦贴纸
export function executeDreamAction(state, actionId, opts = {}) {
  ensureDreamState(state);
  const id = DREAM_IDS.find(did => DREAM_CATALOG[did].actionHobby.id === actionId);
  if (!id) return null;
  const d = state.dreams[id];
  const meta = DREAM_CATALOG[id];

  let gain = d.stage < 3
    ? (d.xp < 40 ? 3 : 2)
    : (d.xp < 65 ? 3 : d.xp < 85 ? 2 : 1);
  if (hasHex(state, 'hx_dream_spark')) gain += 1;
  if (getBondTier(state, 'dream') >= 2) gain = Math.max(gain + 1, Math.round(gain * 1.5));
  if (opts.solo && hasHex(state, 'hx_solo_genius')) gain = Math.round(gain * 1.4);
  if (opts.doubleFlow) gain *= 2;

  const eb = getHexInstance(state, 'hx_errbook');
  let crit = false;
  if (eb && eb.stacks > 0 && Math.random() < eb.stacks * 0.08) {
    gain *= 2;
    crit = true;
  }

  d.xp = clamp(d.xp + gain);
  d.trains++;
  if (d.stage === 1 && d.trains >= 1) d.stage = 2;

  const dm = (hasHex(state, 'hx_dream_spark') ? 2 : 1) + (state.items.includes('旋风四驱车') ? 1 : 0);
  state.stats.mood = clamp(state.stats.mood + dm);
  if (getBondTier(state, 'dream') < 2) {
    state.stats.fatigue = clamp(state.stats.fatigue + (d.stage >= 3 ? 2 : 1));
  }
  if (opts.doubleFlow) state.stats.fatigue = clamp(state.stats.fatigue + 2);

  // 副属性真实反哺（追梦不是纯刷虚空数值，而是反哺人生能力！）
  if (id === 'd_hurdle') state.stats.health = clamp(state.stats.health + (hasHex(state, 'hx_hurdle_wind') ? 2 : 1));
  if (id === 'd_tsinghua') {
    if (state.age <= 18 && state.statsRaw) {
      const capD = state.age <= 12 ? 62 : state.age <= 15 ? 80 : 100;
      state.statsRaw.knowledge = Math.min(capD, state.statsRaw.knowledge + 1);
      state.stats.knowledge = Math.round(state.statsRaw.knowledge);
    } else {
      state.stats.knowledge = clamp(state.stats.knowledge + 1);
    }
  }
  if (id === 'd_singer') {
    state.stats.expr = clamp(state.stats.expr + 1);
    if ((d.trains === 1 || d.trains % 3 === 0) && d.songsCount < 10) d.songsCount++;
  }
  if (id === 'd_surgeon') {
    if (state.age <= 18) state.stats.knowledge = clamp(state.stats.knowledge + 1);
    else state.stats.pro = clamp(state.stats.pro + 1);
  }
  if (id === 'd_esport') state.stats.selfCare = clamp(state.stats.selfCare + (d.trains % 2 === 0 ? 1 : 0));

  syncLegacyDreamFields(state);
  return {
    dreamId: id,
    gain,
    xp: d.xp,
    crit,
    beatText: `${meta.short} +${gain}${crit ? ' 翻倍' : ''}`,
    summary: `${d.stage >= 3 ? meta.actionPro.name : meta.actionHobby.name}：${meta.short}熟练度 +${gain}（当前 ${d.xp}）`
  };
}

// ===== 核心调度：在回合结算中检测是否自然触发「偶遇启蒙 / 兴趣试炼 / 现实冲突 / 立志分水岭 / 逆境破局 / 终局大考」=====
export function rollDreamLifecycleEvent(state, draftIds = []) {
  ensureDreamState(state);

  // 优先级 A：已立志追逐（Stage 3）到达终局窗口且前置硬条件与熟练度齐备 -> 触发终局大考！
  for (const id of DREAM_IDS) {
    const d = state.dreams[id];
    const meta = DREAM_CATALOG[id];
    if (d.stage !== 3 || d.outcome === 'success') continue;
    if (id === 'd_tsinghua' && (!state.gaokaoDone || !isTsinghuaActiveAllowed(state))) continue;
    if (id === 'd_hurdle' && !d.qualified) continue;
    if (id === 'd_singer' && (d.songsCount || 0) < 3) continue;
    if (id === 'd_surgeon' && (!d.qualified || !state.university || state.university.tier > 2)) continue;

    const readyByXp = d.xp >= 68 || (state.age >= meta.climaxMaxAge - 1 && d.xp >= 52);
    const inAge = state.age >= meta.climaxMinAge && state.age <= meta.climaxMaxAge;
    const retryGapOk = !d.lastClimaxAge || state.age >= d.lastClimaxAge + 2;
    if (inAge && readyByXp && retryGapOk) {
      return buildDreamClimaxEvent(state, id);
    }
  }

  // 优先级 A.5：已立志（Stage 3）且 xp>=42 -> 触发晋级选拔（严格学段/学籍/年龄窗口门禁）
  for (const id of DREAM_IDS) {
    const d = state.dreams[id];
    const meta = DREAM_CATALOG[id];
    if (d.stage !== 3 || d.seenSlices.includes('qualifier')) continue;
    if (state.age > meta.climaxMaxAge) continue;
    if (id === 'd_tsinghua' && (!isTsinghuaActiveAllowed(state) || state.age < 17)) continue;
    if (id === 'd_surgeon' && (state.age < 21 || !state.university || state.university.tier > 2)) continue;
    if (d.xp >= 42) {
      return buildDreamQualifierEvent(state, id);
    }
  }

  // 优先级 B：认真追逐中（Stage 3）遇到现实瓶颈与高压试炼
  for (const id of DREAM_IDS) {
    const d = state.dreams[id];
    const meta = DREAM_CATALOG[id];
    if (d.stage === 3 && d.xp >= 50 && !d.seenSlices.includes('adversity')) {
      if (state.age > meta.climaxMaxAge) continue;
      if (id === 'd_tsinghua' && !isTsinghuaActiveAllowed(state)) continue;
      if (id === 'd_surgeon' && state.age < 19) continue;
      return buildDreamAdversityEvent(state, id);
    }
  }

  // 优先级 C：兴趣萌芽（Stage 2）练过足够次数且 xp>=32 -> 分水岭「要不要动真格去追？」
  for (const id of DREAM_IDS) {
    const d = state.dreams[id];
    const meta = DREAM_CATALOG[id];
    if (d.stage === 2 && d.xp >= 32 && state.age >= 14 && !d.seenSlices.includes('commit')) {
      if (state.age > meta.climaxMaxAge) continue;
      if (id === 'd_tsinghua' && !isTsinghuaActiveAllowed(state)) continue;
      if (id === 'd_surgeon' && state.age < 18) continue;
      if (state.age >= 19 && getSeriousDreamCount(state) >= getSeriousDreamCap(state)) continue;
      return buildDreamCommitEvent(state, id);
    }
  }

  // 优先级 D：兴趣阶段（Stage 2）的第一次青涩试水 / 生活时间冲突
  const draftedDreamId = DREAM_IDS.find(id => draftIds.includes(DREAM_CATALOG[id].actionHobby.id));
  if (draftedDreamId) {
    const d = state.dreams[draftedDreamId];
    if (d.stage === 2 && d.trains >= 2 && !d.seenSlices.includes('trial')) {
      return buildDreamTrialEvent(state, draftedDreamId);
    }
    if (d.stage >= 2 && d.trains >= 4 && !d.seenSlices.includes('conflict') && Math.random() < 0.65) {
      return buildDreamConflictEvent(state, draftedDreamId);
    }
  }

  // 优先级 E：日常行为倾向自然撞见「启蒙火种（Stage 0 -> 1）」！
  const sparkedCount = DREAM_IDS.filter(id => state.dreams[id].stage >= 1).length;
  // 少年期最多自然撞见 3 颗火种，成年未启蒙者仍可偶遇晚熟入口
  if (sparkedCount < 3 && state.age >= 7 && state.age <= 29) {
    // 8–9 岁保底必撞见第一颗火种，防止前十几个回合完全没遇到喜欢的事
    const pitySpark = sparkedCount === 0 && state.age >= 8;
    const baseChance = pitySpark ? 0.88 : (sparkedCount === 0 ? 0.45 : 0.24);
    if (Math.random() < baseChance) {
      const candidate = pickWeightedSparkDream(state, draftIds);
      if (candidate) return buildDreamSparkEvent(state, candidate);
    }
  }

  return null;
}

function pickWeightedSparkDream(state, draftIds) {
  const isAdult = state.age >= 19;
  const pool = [];
  for (const id of DREAM_IDS) {
    const d = state.dreams[id];
    if (d.stage > 0 || d.seenSlices.includes('spark')) continue;
    // 奥运田径冠军梦改为仅通过 14 岁初中校运会夺冠动态开启，绝不随机写死跨栏
    if (id === 'd_hurdle') continue;
    if (isAdult && state.age > 28) continue;
    let w = 1.0;
    if (id === 'd_esport' && (draftIds.includes('summer_fc') || draftIds.includes('accompany_friend') || draftIds.includes('overtime'))) w += 3.2;
    if (id === 'd_tsinghua' && (draftIds.includes('study_lit') || draftIds.includes('study_num') || draftIds.includes('study_self') || draftIds.includes('study_tutor') || state.stats.knowledge >= 34)) w += 3.0;
    if (id === 'd_singer' && (draftIds.includes('rest') || draftIds.includes('pub_drink') || draftIds.includes('summer_cicada'))) w += 3.2;
    if (id === 'd_surgeon' && (draftIds.includes('accompany_parents') || draftIds.includes('study_lit') || draftIds.includes('study_num'))) w += 2.8;
    pool.push({ id, w });
  }
  if (!pool.length) return null;
  const sum = pool.reduce((a, x) => a + x.w, 0);
  let r = Math.random() * sum;
  for (const item of pool) {
    r -= item.w;
    if (r <= 0) return item.id;
  }
  return pool[0].id;
}

// ==================== 阶段 1：偶遇启蒙切片（少年 + 成年晚熟双入口）====================
function buildDreamSparkEvent(state, id) {
  const isAdult = state.age >= 19;
  const map = {
    d_esport: isAdult ? {
      title: '下班后的那场五对五',
      summary: '合租夜里同事临时缺一个人打对抗赛，拉你顶上。最后一波团战你几乎凭本能卡住视野反打翻盘，屏幕亮光映在脸上，心跳久久没平复。',
      yes: '把账号留下来，周末跟他们约固定五排（点亮【电竞火种】，解锁专属排程贴纸）',
      no: '笑着关掉电脑早点睡，明天还要早起上班（心态 +3，疲劳 -2）'
    } : {
      title: '还差一个人',
      summary: '放学时后排的小林追出走廊喊住你，说周末五对五友谊赛临时少个人。你坐上机器打完决胜局，耳机里全队欢呼那一刻，手指还在微微发烫。',
      yes: '约好下周再一起练配合（点亮【电竞火种】，排程解锁「约打五人排位」）',
      no: '摆摆手说这次纯属凑数，背书包回家吃饭（同桌亲密 +3，心态 +2）'
    },
    d_hurdle: {
      title: `校运会冠军之后的赛场`,
      summary: `自初二校运会夺得「${state.olympicSport?.name || '田径'}」冠军后，体育老师把你的名字递到了市体校选拔名单里。`,
      yes: `报名体校校队训练（点亮【奥运田径火种】，排程解锁「校队专项训练」）`,
      no: '把这份荣耀收进旧物盒，专心回归文化课（健康 +2，心态 +2）'
    },
    d_tsinghua: isAdult ? {
      title: '另一所大学的夜自习书桌',
      summary: '图书馆闭馆音乐响起时，你偶然翻到前排学长留下的清北考研专业课真题册。那些曾以为在十八岁已经合上的门，原来在二十出头还留着一扇窗。',
      yes: '买下全套参考书立下考研逆袭心愿（点亮【清北火种】，解锁「清北真题攻坚」）',
      no: '合上书本专注把眼前的大学生活过扎实（专业 +2，心态 +2）'
    } : {
      title: '放学后没擦掉的那道题',
      summary: '值日生已经锁了后门，夕阳斜照在黑板右下角那道附加题上。你在草稿纸上添出最后一条辅助线，整道题豁然贯通的那一刻，安静的教室像亮起一束光。',
      yes: '找数学老师借竞赛讲义继续往深处钻（点亮【清北火种】，排程解锁「死磕压轴难题」）',
      no: '把工整的解法抄进笔记本开心回家（学识 +2，心态 +2）'
    },
    d_singer: isAdult ? {
      title: '天桥下的木吉他与晚风',
      summary: '加班回家路过过街天桥，听见有人抱着旧木吉他唱自己写的歌。你站在栏杆边听完，脑海里忽然浮出一段盘旋了很久的旋律。',
      yes: '周末去琴行淘一把二手木吉他录下来（点亮【原创歌手火种】，解锁「抱琴录小样」）',
      no: '往琴盒里放了二十块钱，踩着路灯慢慢走回家（心态 +4，现金 -20）'
    } : {
      title: '刚才那段旋律还挺好听',
      summary: '傍晚放学沿着河堤往家走，你随口哼出四句从未听过的调子。怕睡一觉就忘干净，跑回家翻出旧磁带录音机，对着麦克风小声哼存了下来。',
      yes: '找本空作业本专门记词曲片段（点亮【原创歌手火种】，排程解锁「抱琴录小样」）',
      no: '把磁带收进抽屉当成今天的小秘密（心态 +3）'
    },
    d_surgeon: isAdult ? {
      title: '急诊走廊尽头的白大褂',
      summary: '陪家人去医院复查的下午，普外科诊室外的方医生刚下手术台，满眼血丝却依然蹲下身用最平实的画图给老人解释病灶。那份沉甸甸的笃定让你怔住了。',
      yes: '查清成人跨考医学与规培路径，决心重走医途（点亮【外科医生火种】，解锁「翻阅解剖图谱」）',
      no: '认真记下医嘱照顾好家人饮食起居（自理 +3，父母亲密 +3）'
    } : {
      title: '门诊大厅那张手绘示意图',
      summary: '周末陪二叔去医院换药，普外科的方医生没有催促排队的长龙，而是一边利落拆纱布，一边在处方背面画图宽慰紧张的病人。你站在旁边看得入了神。',
      yes: '去书店买一本入门人体图谱翻看（点亮【外科医生火种】，排程解锁「翻阅解剖图谱」）',
      no: '帮二叔拎好药袋稳稳扶他上公交车（父母亲密 +3，自理 +2）'
    }
  };

  const cfg = map[id];
  return {
    id: `drm_spark_${id}`,
    isDreamEvent: true,
    review_status: 'APPROVED',
    title: `【偶然撞见的微光】${cfg.title}`,
    summary: cfg.summary,
    choices: [
      {
        label: cfg.yes,
        effects: { dreamSpark: id, mood: 4 }
      },
      {
        label: cfg.no,
        effects: { dreamPassSpark: id, mood: 3, health: id === 'd_hurdle' ? 2 : 0, knowledge: id === 'd_tsinghua' ? 2 : 0 }
      }
    ]
  };
}

// ==================== 阶段 2：兴趣青涩试水（带真实小挫折与纪念物）====================
function buildDreamTrialEvent(state, id) {
  if (id === 'd_singer') {
    return {
      id: `drm_trial_${id}`,
      isDreamEvent: true,
      review_status: 'APPROVED',
      title: '【兴趣试水】十个人的咖啡馆开放麦',
      summary: '你终于把哼了好几个月的旋律填完词，报名了街角咖啡馆的周末开放麦。台下只坐了十来个避雨的客人，上台前主持人问你这首原创叫什么名字：',
      choices: [
        {
          label: '叫《慢一点回家》—— 哪怕中间忘词卡了半拍也唱完全曲（写下首支代表作，获小样磁带，专长 +6）',
          effects: { dreamTrialDone: id, songTitle: '《慢一点回家》', addSong: 1, dreamXp: { id, v: 6 }, expr: 2, mood: 4, keepsake: { name: '《慢一点回家》小样磁带', story: '在只有十个人的咖啡馆开放麦唱完人生第一首原创曲，台下角落有人认真鼓了掌。', buff: '每年心态微暖 · 联动《百万单曲版税》' } }
        },
        {
          label: '叫《晚风过天桥》—— 低头盯着琴品安静弹唱完（写下首支代表作，专长 +6，心态 +3）',
          effects: { dreamTrialDone: id, songTitle: '《晚风过天桥》', addSong: 1, dreamXp: { id, v: 6 }, mood: 3, keepsake: { name: '《晚风过天桥》小样磁带', story: '手心全是汗弹完的第一首原创小样。', buff: '每年心态微暖 · 联动《百万单曲版税》' } }
        }
      ]
    };
  }

  const map = {
    d_esport: {
      title: '【兴趣试水】网吧业余五人小杯赛',
      summary: '小林拉着你凑队报了周末商圈小杯赛。连赢两轮后遇上配合老辣的半职业老队，第三局被对手运营打穿。散场后大家蹲在马路牙子喝汽水复盘到路灯亮起。',
      c1: { label: '把刚才失误的对线录像拷进U盘反复拆解（电竞 +7，自理 +2，获五连坐纪念币）', xp: 7, mood: 2, item: ['网吧五连坐纪念币', '第一次打线下五人杯赛留下的参赛牌，虽然止步四强但看清了真正的差距。', '追梦训练心态额外稳定'] },
      c2: { label: '拍拍小林肩膀约好下次赢回来（电竞 +5，同桌亲密 +5，心态 +4）', xp: 5, mood: 4, friendInt: 5 }
    },
    d_hurdle: {
      title: `【校队选拔】市青少年${state.olympicSport?.name || '田径'}邀请赛`,
      summary: `第一次代表学校走上市级田径赛场，对手个个是体校专业苗子。你在「${state.olympicSport?.name || '田径'}」项目拼进前三，教练走过来拍了拍你的肩膀。`,
      c1: { label: `接下市体校特训邀请，继续冲击更高舞台（专长 +7，健康 +2）`, xp: 7, mood: 3, item: ['市体校纪念秒表', `代表学校征战市赛「${state.olympicSport?.name || '田径'}」拿下的荣誉印记。`, '体育与奥运特训收益更稳'] },
      c2: { label: '先和队友们开心庆祝这场突破（专长 +5，心态 +5）', xp: 5, mood: 5 }
    },
    d_tsinghua: {
      title: '【兴趣试水】市级学科选拔初试',
      summary: '第一次坐进高手云集的市级选拔考场，最后一道组合数学题卡到交卷铃响只写出一半。走出考场时下起小雨，你站在屋檐下把没写完的后半截证法想通了。',
      c1: { label: '把完整证法整理进专用错题草稿本（清北 +7，学识 +3，获辅助线草稿本）', xp: 7, mood: 2, item: ['画满辅助线的草稿本', '市初试交卷后在走廊屋檐下补完的那页证明。', '学识突破瓶颈更顺畅'] },
      c2: { label: '跟同考场的尖子生交流思路互留联系方式（清北 +5，表达 +2，心态 +3）', xp: 5, mood: 3 }
    },
    d_surgeon: {
      title: '【兴趣试水】医院门诊导医志愿者',
      summary: '利用假期报名了医院门诊导医志愿服务。站了一整天腿酸得发麻，却帮好几位看不懂化验单的老人找到了诊室，傍晚还远远看见方医生朝你点了点头。',
      c1: { label: '把常见科室分诊流程记满小本子（医学 +7，自理 +2，获见习胸牌）', xp: 7, mood: 3, item: ['临床见习白大褂胸牌', '第一次做医院志愿者领到的塑料胸牌，背面写着谨记耐心二字。', '医学训练附带心态加成'] },
      c2: { label: '回家给爸妈认真讲一遍日常体检常识（医学 +5，父母亲密 +5，心态 +3）', xp: 5, mood: 3, parentInt: 5 }
    }
  };
  const cfg = map[id];
  return {
    id: `drm_trial_${id}`,
    isDreamEvent: true,
    review_status: 'APPROVED',
    title: cfg.title,
    summary: cfg.summary,
    choices: [
      {
        label: cfg.c1.label,
        effects: {
          dreamTrialDone: id,
          dreamXp: { id, v: cfg.c1.xp },
          mood: cfg.c1.mood,
          keepsake: cfg.c1.item ? { name: cfg.c1.item[0], story: cfg.c1.item[1], buff: cfg.c1.item[2] } : null
        }
      },
      {
        label: cfg.c2.label,
        effects: {
          dreamTrialDone: id,
          dreamXp: { id, v: cfg.c2.xp },
          mood: cfg.c2.mood,
          friendInt: cfg.c2.friendInt || 0,
          parentInt: cfg.c2.parentInt || 0
        }
      }
    ]
  };
}

// ==================== 现实生活时间冲突（含海克斯共鸣选项！）====================
function buildDreamConflictEvent(state, id) {
  const meta = DREAM_CATALOG[id];
  const hasWarmthHex = getBondTier(state, 'warmth') >= 2 || hasHex(state, 'hx_pop_2') || hasHex(state, 'hx_time_master');
  const choices = [];

  if (hasWarmthHex) {
    choices.push({
      label: `【海克斯共鸣 · 两全其美】小周/家人主动带着水来训练场陪你（${meta.short} +6，亲密 +5，心态 +4）`,
      isHexResonance: true,
      effects: { dreamConflictDone: id, dreamXp: { id, v: 6 }, friendInt: 5, mood: 4 }
    });
  }
  choices.push(
    {
      label: `硬着头皮改期，先去完成${meta.name}关键加练（${meta.short} +6，挚友亲密 -3，疲劳 +2）`,
      effects: { dreamConflictDone: id, dreamXp: { id, v: 6 }, friendInt: -3, fatigue: 2 }
    },
    {
      label: `守约陪小周/家人度过周末，晚上回来自己补练半小时（亲密 +5，${meta.short} +2，心态 +3）`,
      effects: { dreamConflictDone: id, dreamXp: { id, v: 2 }, friendInt: 5, mood: 3 }
    }
  );

  return {
    id: `drm_conflict_${id}`,
    isDreamEvent: true,
    review_status: 'APPROVED',
    title: `【时间撞车】周六的约定与${meta.name}加练`,
    summary: `两周前就答应了小周周六下午一起去书店/聚餐，结果临时收到${meta.name}那边难得的合练与指导名额，两边时间严严实实撞在一起。`,
    choices
  };
}

// ==================== 阶段 2 -> 3：立志追逐分水岭（现实硬门槛校验）====================
function buildDreamCommitEvent(state, id) {
  const meta = DREAM_CATALOG[id];
  // 外科医生现实硬门槛校验：若已过18岁高考且未读主流本科及以上，需要通过成人医科补考
  const medBlocked = id === 'd_surgeon' && state.gaokaoDone && (state.university?.tier || 4) > 3 && !state.dreams.d_surgeon.medQualified;

  if (medBlocked) {
    return {
      id: `drm_commit_${id}`,
      isDreamEvent: true,
      review_status: 'APPROVED',
      title: '【现实门槛】无影灯前的学历准入线',
      summary: '你想正式走上外科临床道路，但执业医师法要求必须具备全日制或成人医学本科学籍。当年高考未能进入医学本科线，现在摆在你面前的是两条路：',
      choices: [
        {
          label: '咬牙脱产备考成人医学学籍（需学识≥55 且花费 ¥6,000 学费 · 取得学籍正式立志追逐！）',
          reqAny: { knowledge: 55 },
          effects: { cash: -6000, fatigue: 3, dreamCommit: id, qualifyMed: true, dreamXp: { id, v: 6 }, photo: `${state.age}岁重修医科学籍` }
        },
        {
          label: '坦然接受现实限制，把医学知识化为守护家人的终身习惯（体面转身获永久健康护航 Buff）',
          effects: { dreamPivot: id, mood: 4, health: 3 }
        }
      ]
    };
  }

  const sportName = state.olympicSport?.name || '田径';
  const descMap = {
    d_esport: '青训营发来试训邀请函。一旦动真格投入，意味着要把大量业余时间砸进枯燥的战术复盘与高强排位里，黄金年龄只有这几年。',
    d_hurdle: `自从初二校运会夺得「${sportName}」冠军后，省体校正式向你发出集训邀请。走上专业赛道意味着告别普通人的轻松假期，你愿意去拼这趟奥运之旅吗？`,
    d_tsinghua: state.gaokaoDone
      ? '距离考研清北只剩最后两年的攻坚窗口，一旦立下志愿，每个周末都将与真题卷和专业课长伴。'
      : '你在年级排名里看到了冲击清北的微光。立下这个目标，意味着接下来每一张模考卷都要按最高标准死磕。',
    d_singer: '你攒下了几首像样的歌，独立厂牌朋友问你要不要正式做一张作品集、去挑战真正的买票专场演出。',
    d_surgeon: '进入医学专业深水区，厚如砖头的内外妇儿教材与即将到来的临床见习规培正在前方等着你。'
  };

  return {
    id: `drm_commit_${id}`,
    isDreamEvent: true,
    review_status: 'APPROVED',
    title: `【立志分水岭】要把「${meta.name}」当真去拼一把吗？`,
    summary: descMap[id] + '（立志后将解锁高阶训练，并在后续海克斯觉醒中刷出该梦想专属传说卡！）',
    choices: [
      {
        label: `动真格拼这一程！正式立志主攻【${meta.name}】（升级高阶贴纸，专长 +6，注入专属海克斯卡池）`,
        effects: { dreamCommit: id, dreamXp: { id, v: 6 }, mood: 3, photo: `${state.age}岁立志追逐${meta.name}` }
      },
      {
        label: '不必变成沉重负担，留在生活里当一辈子的纯粹热爱（体面和解，转化永久生活特质加成）',
        effects: { dreamPivot: id, mood: 6, fatigue: -2 }
      }
    ]
  };
}

// ==================== 新增阶段 3.5：晋级选拔 / 执业医考 / 千人巡演（自动拉起梦想定制小游戏！）====================
function buildDreamQualifierEvent(state, id) {
  const specs = {
    d_esport: {
      title: '【晋级选拔】青训试训名单与首发对抗赛',
      summary: '你终于收到职业俱乐部二队的线下试训通知。教练把五名试训生叫进训练室：“今天不看段位截图，直接打一场高强度集火实测，留下来的人签正式青训补贴合同。”',
      liveLabel: '坐上试训席实操迎战（22秒团战集火微操 · 通过签青训约每年 +¥1.2万津贴）',
      steadyLabel: '稳健打满视野配合体系过关（电竞 +6，签约入选青训二队）'
    },
    d_hurdle: {
      title: `【晋级选拔】省田径锦标赛 · ${state.olympicSport?.name || '田径'}资格战`,
      summary: `站上省赛赛场，只要在「${state.olympicSport?.name || '田径'}」项目顺利达标，就能拿到国家集训队入场券与省队津贴。`,
      liveLabel: `全力出战${state.olympicSport?.name || '田径'}选拔赛（达标享省队津贴 +¥1万/年）`,
      steadyLabel: `按节奏稳健完赛达标（奥运专长 +6，健康 +2，入选国家集训名单）`
    },
    d_tsinghua: {
      title: !state.gaokaoDone ? '【晋级大考】高三全市统测 · 压轴大题破壁' : '【晋级大考】清北考研初试 · 专业课压轴攻坚',
      summary: !state.gaokaoDone
        ? '高三最关键的一次全市跨校统测，最后两道综合压轴题把全考场拉开了分差。只要把六大核心题眼串通，就能彻底坐稳清北冲刺线！'
        : '坐在考研初试考场里，专业课最后一道长推导题正是你在图书馆熬夜拆解过的母题变体！',
      liveLabel: '提笔闪电连线破译六大题眼（28秒压轴题连线 · 额外奖高考 +3分 / 奖学金）',
      steadyLabel: '严密分步推导拿下基础与中档满分（清北 +6，学识 +3，锁定冲刺资格）'
    },
    d_singer: {
      title: '【晋级巡演】千人现场耳返调音与歌单第三首',
      summary: '第一次站上近千人的城市巡演舞台，开场前二十分钟耳返节拍器突发延迟，台下已经坐满了举着灯牌等待你唱新歌的听众。',
      liveLabel: '亲自校准耳返带动全场和弦共鸣（28秒舞台旋律连线 · 写成第3首歌 + 票房¥8,000）',
      steadyLabel: '摘下半边耳返靠木吉他箱体共振稳唱全场（原创曲 +1，专长 +6，票房 +¥5,000）'
    },
    d_surgeon: {
      title: '【执业准入】首次上台拉钩与国家执业医师实操考',
      summary: '在普外科跟着方医生熬过无数个天没亮的查房晨会，今天你同时迎来了第一次上手术台稳持腔镜，以及决定能否合法独立行医的国家执业医师技能大考！',
      liveLabel: '走上无影灯考核台亲手控张力缝合（稳手精度实操 · 考取执业医证 + 规培补贴¥1.5万/年）',
      steadyLabel: '严格按无菌规范与标准针距稳妥完考（考取执业医师证，医学 +6，专业 +2）'
    }
  };
  const sc = specs[id];
  return {
    id: `drm_qual_${id}`,
    isDreamEvent: true,
    review_status: 'APPROVED',
    title: sc.title,
    summary: sc.summary,
    choices: [
      {
        label: sc.liveLabel,
        isLiveArcade: true,
        effects: { launchQualifierArcade: { id }, fatigue: 1 }
      },
      {
        label: sc.steadyLabel,
        effects: { resolveDreamQualifier: { id, grade: 'B' }, fatigue: 1 }
      }
    ]
  };
}

export function settleDreamQualifier(state, id, grade = 'B') {
  ensureDreamState(state);
  const d = state.dreams[id];
  const meta = DREAM_CATALOG[id];
  if (!d) return { msg: '' };
  if (!d.seenSlices.includes('qualifier')) d.seenSlices.push('qualifier');
  d.qualified = true;

  const xpAdd = grade === 'S' ? 11 : grade === 'A' ? 9 : 6;
  d.xp = clamp(d.xp + xpAdd);
  state.stats.mood = clamp(state.stats.mood + (grade === 'S' ? 5 : 3));

  let detail = '';
  if (id === 'd_esport') {
    state.cash += 6000;
    detail = '正式签下俱乐部青训二队合同（首笔签约金 +¥6,000，每年享 ¥1.2 万青训津贴）！';
  } else if (id === 'd_hurdle') {
    state.stats.health = clamp(state.stats.health + 2);
    detail = '成功跑进国家一级运动员达标线（健康 +2，每年享 ¥1 万省队训练津贴）！';
  } else if (id === 'd_tsinghua') {
    state.stats.knowledge = clamp(state.stats.knowledge + 3);
    if (!state.gaokaoDone) {
      state.gaokaoHexBonus = (state.gaokaoHexBonus || 0) + (grade === 'S' ? 4 : 3);
      if (!state.experiences.includes('exp_gaokao_sprint')) state.experiences.push('exp_gaokao_sprint');
      detail = `统测一鸣惊人！锁定清北冲刺资格且高考总分额外 +${grade === 'S' ? 4 : 3} 分！`;
    } else {
      state.cash += 6000;
      detail = '考研初试高分过线，获学业拔尖奖学金 +¥6,000，直通清北复试终面！';
    }
  } else if (id === 'd_singer') {
    d.songsCount = Math.min(10, Math.max(3, (d.songsCount || 0) + 1));
    const boxOffice = grade === 'S' ? 9500 : 6500;
    state.cash += boxOffice;
    detail = `千人巡演圆满谢幕！凑齐 ${d.songsCount} 首代表作歌单，巡演票房分成 +¥${boxOffice.toLocaleString()}！`;
  } else if (id === 'd_surgeon') {
    state.stats.pro = clamp(state.stats.pro + 3);
    detail = '顺利考取《国家执业医师资格证》！正式排入外科值班表（每年享 ¥1.5 万规培津贴）！';
  }

  syncLegacyDreamFields(state);
  return {
    msg: `【${meta.name}晋级 · ${grade}级】专长 +${xpAdd} · ${detail}`
  };
}

// ==================== 阶段 3：逆境高压试炼（海克斯金色破局高光时刻！）====================
function buildDreamAdversityEvent(state, id) {
  const specs = {
    d_singer: {
      title: '【追梦逆境】两百人的场子只卖出七十三张票',
      summary: `人生第一场真正售票的 Livehouse 专场开演前一晚，票房后台停在 73 张，连场地保底费还差 ¥1,500，评论区还冒出第一条挑刺编曲单薄的留言。`,
      hexOk: getBondTier(state, 'warmth') >= 2 || hasHex(state, 'hx_pop_2') || hasHex(state, 'hx_singer_royalty'),
      hexLabel: '【海克斯破局 · 挚友拉横幅塞满后排】老同学与社团好友连夜转发包场，免贴场地费反赚票房分成 +¥2,400，专长 +8！',
      hexEff: { cash: 2400, dreamXp: { id, v: 8 }, addSong: 1, mood: 6 },
      hardLabel: '自掏 ¥1,500 保住完整乐队配置，对着七十三个人把每首歌唱得像万人场（现金 -1,500，专长 +7，表达 +2）',
      hardEff: { cash: -1500, dreamXp: { id, v: 7 }, expr: 2, mood: 2 },
      softLabel: '撤掉伴奏改一把木吉他清唱省成本（专长 +4，心态 -2）',
      softEff: { dreamXp: { id, v: 4 }, mood: -2 }
    },
    d_hurdle: {
      title: `【追梦考验】大赛前一周的状态调整（${state.olympicSport?.name || '田径'}）`,
      summary: `备战全国选拔赛进入最后冲刺，高强度合练后身体略感疲劳。队医建议科学减量恢复，而大赛就在七天后。`,
      hexOk: getBondTier(state, 'zen') >= 2 || hasHex(state, 'hx_sleep_2') || hasHex(state, 'hx_hurdle_wind'),
      hexLabel: `【海克斯破局 · 科学超量恢复】精准调整大赛状态，零伤病刷新个人最好成绩（专长 +8，健康 +3）！`,
      hexEff: { dreamXp: { id, v: 8 }, health: 3, mood: 5 },
      hardLabel: '咬牙咬紧最后一周高强度备战（专长 +7，健康 -7，疲劳 +3）',
      hardEff: { dreamXp: { id, v: 7 }, health: -7, fatigue: 3 },
      softLabel: '听从队医建议科学减量保住体能底子（健康 +2，专长 +3）',
      softEff: { dreamXp: { id, v: 3 }, health: 2 }
    },
    d_esport: {
      title: '【追梦逆境】替补席上的三连败复盘夜',
      summary: '刚进俱乐部二队试训就撞上版本大改，训练赛连输三场坐回冷板凳。凌晨两点的训练室只剩你屏幕还亮着。',
      hexOk: hasHex(state, 'hx_errbook') || hasHex(state, 'hx_flow_engine') || hasHex(state, 'hx_esport_clutch'),
      hexLabel: '【海克斯破局 · 逆风局视野神复盘】从失利录像里抓出对手换线规律，次日训练赛一举锁定首发（电竞 +9，心态 +5）！',
      hexEff: { dreamXp: { id, v: 9 }, mood: 5 },
      hardLabel: '通宵苦练新版本英雄池抢回首发（电竞 +7，疲劳 +5，健康 -3）',
      hardEff: { dreamXp: { id, v: 7 }, fatigue: 5, health: -3 },
      softLabel: '先给小林打个电话稳住心态按部就班练（电竞 +4，心态 +3）',
      softEff: { dreamXp: { id, v: 4 }, mood: 3 }
    },
    d_tsinghua: {
      title: '【追梦逆境】跌出前五十的那张模考卷',
      summary: '离大考越来越近，一次高难度联考理综/专业课意外崩盘，排名掉出安全线。晚自习下课后看着红叉密布的卷子，手心有些发凉。',
      hexOk: getBondTier(state, 'scholar') >= 2 || hasHex(state, 'hx_winter_study') || hasHex(state, 'hx_tsinghua_link'),
      hexLabel: '【海克斯破局 · 题海破壁顿悟】彻底免疫低气压干扰，连夜梳理出整类压轴题母模型（清北 +8，学识 +4，心态 +4）！',
      hexEff: { dreamXp: { id, v: 8 }, knowledge: 4, mood: 4 },
      hardLabel: '把整本错题撕开重做三遍死磕到底（清北 +7，学识 +2，心态 -3，疲劳 +3）',
      hardEff: { dreamXp: { id, v: 7 }, knowledge: 2, mood: -3, fatigue: 3 },
      softLabel: '去操场跑两圈把睡眠调回来稳扎稳打（清北 +4，心态 +4，疲劳 -2）',
      softEff: { dreamXp: { id, v: 4 }, mood: 4, fatigue: -2 }
    },
    d_surgeon: {
      title: '【追梦逆境】连轴三十六小时的规培急诊夜',
      summary: '住院医规培最忙的冬天，一晚上连收四台急诊清创缝合，凌晨四点写完病历靠在值班室墙边差点睡着。',
      hexOk: hasHex(state, 'hx_duo_passion') || hasHex(state, 'hx_work_rest') || hasHex(state, 'hx_surgeon_blade'),
      hexLabel: '【海克斯破局 · 无影灯下定海神针】手法稳准零差错获方医生当场点名表扬并写推荐信（医学 +9，专业 +3，心态 +4）！',
      hexEff: { dreamXp: { id, v: 9 }, pro: 3, mood: 4 },
      hardLabel: '灌杯浓茶把最后一台缝合收得严丝合缝（医学 +7，专业 +2，疲劳 +4，健康 -3）',
      hardEff: { dreamXp: { id, v: 7 }, pro: 2, fatigue: 4, health: -3 },
      softLabel: '和同组规培搭档互相顶班眯一小时恢复精力（医学 +4，专业 +1，疲劳 -1）',
      softEff: { dreamXp: { id, v: 4 }, pro: 1, fatigue: -1 }
    }
  };

  const s = specs[id];
  const choices = [];
  if (s.hexOk) {
    choices.push({
      label: s.hexLabel,
      isHexResonance: true,
      effects: { ...s.hexEff, dreamAdversityDone: id }
    });
  }
  choices.push(
    { label: s.hardLabel, effects: { ...s.hardEff, dreamAdversityDone: id } },
    { label: s.softLabel, effects: { ...s.softEff, dreamAdversityDone: id } }
  );

  return {
    id: `drm_adv_${id}`,
    isDreamEvent: true,
    review_status: 'APPROVED',
    title: s.title,
    summary: s.summary,
    choices
  };
}

// ==================== 阶段 4：终局大考与四重真实回响 ====================
function buildDreamClimaxEvent(state, id) {
  const d = state.dreams[id];
  const meta = DREAM_CATALOG[id];
  const statVal = id === 'd_hurdle' ? state.stats.health : (state.stats[meta.statKey] || 50);
  const hexBonus = (getBondTier(state, 'dream') >= 2 ? 6 : 0)
    + (hasHex(state, 'hx_esport_clutch') && id === 'd_esport' ? 10 : 0)
    + (hasHex(state, 'hx_hurdle_wind') && id === 'd_hurdle' ? 10 : 0)
    + (hasHex(state, 'hx_tsinghua_link') && id === 'd_tsinghua' ? 10 : 0)
    + (hasHex(state, 'hx_singer_royalty') && id === 'd_singer' ? 10 : 0)
    + (hasHex(state, 'hx_surgeon_blade') && id === 'd_surgeon' ? 10 : 0);

  const baseScore = Math.round(d.xp * 0.65 + statVal * 0.22 + hexBonus);

  const sceneMap = {
    d_esport: {
      title: '【终局决战】职业联赛总决赛 · 第五局决胜团',
      summary: `比分 2:2 战平，场馆聚光灯照在隔音房玻璃上（当前综合胜势评估：${baseScore}/90）。大龙坑视野全黑的最后一刻，你作为主指挥要做出决断：`,
      optA: '果断绕后开团打对手措手不及（激进搏上限 · 最高 +12 临场分）',
      optB: '稳控兵线逼对手先交关键技能（稳健保下限 · +7 临场分）',
      nearMissTxt: '水晶在差两下平A时被对方极限守住，2:3 屈居亚军。漫天金雨落在对面半场，但全场观众依然喊着你的名字。'
    },
    d_hurdle: {
      title: `【终局决战】奥运「${state.olympicSport?.name || '田径'}」总决赛之夜`,
      summary: `披挂国家队战袍站上奥运决赛最高舞台！从当年初二校运会夺冠走到今天（当前综合竞技状态：${baseScore}/90），决胜一搏就在眼前：`,
      optA: `放手一搏冲击个人极限破纪录（激进搏金 · 最高 +12 临场分，疲劳 +2）`,
      optB: `稳扎稳打发挥最高水准零失误（稳健发挥 · +7 临场分）`,
      nearMissTxt: `以微弱差距收获奥运银牌。披着国旗看向大屏幕那一刻虽有遗憾，却也交出了无愧青春的巅峰一战。`
    },
    d_tsinghua: {
      title: state.gaokaoDone ? '【终局决战】清北研究生复试终面' : '【终局决战】清北选拔终极冲线',
      summary: `走入燕园/清华园绿树掩映的考场，最后一道开放性综合大题摆在面前（当前学术积淀分：${baseScore}/90）：`,
      optA: '跳出常规套路给出独创推导解法（高上限冲刺 · 最高 +12 临场分）',
      optB: '严谨分步把每条定理推导写满卷面（稳扎稳打 · +7 临场分）',
      nearMissTxt: '总分离拟录取线只差最后两名。合上成绩单走出校门时阳光晃眼，你可以明年二战再冲一次，或带着这身真本事奔赴下一站。'
    },
    d_singer: {
      title: `【终局决战】万人体育馆主舞台 · 唱响${d.songName}`,
      summary: `从十人咖啡馆一路唱到体育馆夜空下，检票口人潮涌动，返耳里传来前奏第一个和弦（当前口碑与舞台积淀：${baseScore}/90）：`,
      optA: '关掉垫音把话筒递向全场大合唱《慢一点回家》（燃爆全场 · 最高 +12 临场分）',
      optB: '闭上眼像当年河堤散步一样纯粹唱完每一句（稳健真挚 · +7 临场分）',
      nearMissTxt: '《离一万人还差一点》——终场大屏定格在 8,920 名观众，离真正的万人满座只差最后看台一角，但台下亮起的手机灯海已经足够温柔。'
    },
    d_surgeon: {
      title: '【终局决战】三甲普外科正式留院竞聘与实操大考',
      summary: `历经漫长医学院苦读与规培夜班，终于迎来三甲医院外科正式主治编制考核（当前临床积淀：${baseScore}/90）：`,
      optA: '主刀高难度腔镜实操展示极稳缝合基本功（实力亮剑 · 最高 +12 临场分）',
      optB: '结合疑难病例复盘给出最周全围术期方案（沉稳全面 · +7 临场分）',
      nearMissTxt: '今年科室留院名额缩减，你排在候补第一位差一步入编。方医生拍拍你的白大褂说，明年春季补录还有机会。'
    }
  };

  const sc = sceneMap[id];
  const liveLabelMap = {
    d_esport: '亲自上阵决胜局微操（22秒切集火实操 · S级直加 +18 临场分）',
    d_hurdle: `亲自出战奥运${state.olympicSport?.name || '田径'}决赛（临场实操 · S级直加 +18 临场分）`,
    d_tsinghua: '亲自挑战压轴题闪电连线（28秒考场连连看 · S级直加 +18 临场分）',
    d_singer: '亲自弹唱带动万人安可（28秒旋律连线 · S级直加 +18 临场分）',
    d_surgeon: '亲自主刀腔镜稳手考核（精准张力控制 · S级直加 +18 临场分）'
  };
  return {
    id: `drm_climax_${id}_${d.retries}`,
    isDreamEvent: true,
    review_status: 'APPROVED',
    title: sc.title,
    summary: sc.summary,
    choices: [
      {
        label: liveLabelMap[id] || '亲自上阵临场实操大考（按评级稳拿 +8~+18 临场分）',
        isLiveArcade: true,
        effects: { launchClimaxArcade: { id, nearTxt: sc.nearMissTxt }, fatigue: 1 }
      },
      {
        label: sc.optA,
        effects: { resolveDreamClimax: { id, bonus: 12, nearTxt: sc.nearMissTxt }, fatigue: 2 }
      },
      {
        label: sc.optB,
        effects: { resolveDreamClimax: { id, bonus: 8, nearTxt: sc.nearMissTxt } }
      },
      {
        label: '在终场前与执念温柔和解，享受过程本身（体面转身获终身热爱特质，心态 +6）',
        effects: { dreamPivot: id, mood: 6 }
      }
    ]
  };
}

// 结算终局成败，返回结果描述与后续抉择
export function settleDreamClimax(state, id, choiceBonus, nearTxt, isDirectArcade = false) {
  ensureDreamState(state);
  const d = state.dreams[id];
  const meta = DREAM_CATALOG[id];
  d.lastClimaxAge = state.age;

  const statVal = id === 'd_hurdle' ? state.stats.health : (state.stats[meta.statKey] || 50);
  const hexBonus = (getBondTier(state, 'dream') >= 2 ? 6 : 0)
    + (hasHex(state, 'hx_esport_clutch') && id === 'd_esport' ? 10 : 0)
    + (hasHex(state, 'hx_hurdle_wind') && id === 'd_hurdle' ? 10 : 0)
    + (hasHex(state, 'hx_tsinghua_link') && id === 'd_tsinghua' ? 10 : 0)
    + (hasHex(state, 'hx_singer_royalty') && id === 'd_singer' ? 10 : 0)
    + (hasHex(state, 'hx_surgeon_blade') && id === 'd_surgeon' ? 10 : 0);
  const clutchSteady = hexBonus >= 6 || state.stats.mood >= 75;
  const effChoice = isDirectArcade
    ? choiceBonus
    : (choiceBonus >= 12 ? (clutchSteady || Math.random() < 0.58 ? 12 : 2) : choiceBonus);
  const luckRoll = Math.floor(Math.random() * 9) - 4; // -4 ~ +4
  const total = Math.round(d.xp * 0.65 + statVal * 0.22 + hexBonus + effChoice + luckRoll);

  if (total >= 90) {
    d.stage = 4;
    d.outcome = 'success';
    d.xp = 100;
    state.stats.mood = clamp(state.stats.mood + 12);
    state.cash += 50000;
    if (!state.experiences.includes('exp_dream_complete')) state.experiences.push('exp_dream_complete');
    addKeepsakeWithStory(
      state,
      meta.keepsakeWin,
      `${state.age}岁圆梦【${meta.name}】最高舞台留下的终极纪念信物。`,
      meta.winPerk
    );
    state.albumPhotos.push({
      age: state.age,
      stamp: `${1992 + state.age}.06`,
      title: `圆梦时刻 · ${meta.name}登顶！`,
      stageIdx: 3,
      bg: state.age <= 18 ? 'child' : 'adult'
    });
    syncLegacyDreamFields(state);
    return {
      won: true,
      msg: `圆梦登顶！【${meta.name}】终章达成，获信物「${meta.keepsakeWin}」与 ¥5 万奖金！`
    };
  }

  // 惜败回响：若未超过 2 次再战上限且年龄允许，保留 82% 积淀可择机再战；否则转为深情留白/体面转身
  const eb = getHexInstance(state, 'hx_errbook');
  if (eb && eb.stacks < 10) eb.stacks++;

  if (d.retries < 2 && state.age < meta.climaxMaxAge - 1) {
    d.retries++;
    d.outcome = 'near_miss';
    d.xp = Math.max(58, d.xp - 6);
    state.stats.mood = clamp(state.stats.mood - 2);
    syncLegacyDreamFields(state);
    return {
      won: false,
      canRetry: true,
      nearTxt,
      msg: `惜败回响（总评 ${total}/90）：差一步登顶！已保留积淀，2 年后可再次冲击（剩 ${3 - d.retries} 次窗口）或随时在亲友梦页选择和解转身。`
    };
  } else {
    d.stage = 4;
    d.outcome = 'pivot';
    state.stats.mood = clamp(state.stats.mood + 4);
    if (!state.traits.includes(meta.pivotTrait)) state.traits.push(meta.pivotTrait);
    syncLegacyDreamFields(state);
    return {
      won: false,
      canRetry: false,
      msg: `虽差一步登顶，但这段滚烫岁月已沉淀为终身特质「${meta.pivotTrait.split('（')[0]}」！`
    };
  }
}

export function applyGracefulPivot(state, id) {
  ensureDreamState(state);
  const d = state.dreams[id];
  const meta = DREAM_CATALOG[id];
  if (!d) return;
  d.stage = 4;
  d.outcome = 'pivot';
  state.stats.mood = clamp(state.stats.mood + 5);
  if (!state.traits.includes(meta.pivotTrait)) state.traits.push(meta.pivotTrait);
  syncLegacyDreamFields(state);
}

// 年度决算：追梦成果/转身副业/《百万单曲版税》真实反哺现金流与健康！
export function applyDreamAnnualPassives(state, lines) {
  ensureDreamState(state);
  let inc = 0;

  // 专属海克斯《百万单曲版税》：每首原创歌每年结算 ¥6,000 版税！
  const singer = state.dreams.d_singer;
  if (hasHex(state, 'hx_singer_royalty') && singer.songsCount > 0) {
    const roy = Math.min(10, singer.songsCount) * 6000;
    inc += roy;
    lines.push(`【百万单曲版税】${singer.songsCount} 首原创曲年度版税到账：+${roy.toLocaleString()} 元`);
  }

  for (const id of DREAM_IDS) {
    const d = state.dreams[id];
    const meta = DREAM_CATALOG[id];
    if (d.outcome === 'success') {
      const mapPay = { d_esport: 36000, d_hurdle: 32000, d_tsinghua: 28000, d_singer: 40000, d_surgeon: 38000 };
      const pay = mapPay[id] || 30000;
      inc += pay;
      state.stats.mood = clamp(state.stats.mood + 2);
      if (id === 'd_hurdle') state.stats.health = clamp(state.stats.health + 2);
      lines.push(`【圆梦回响 · ${meta.name}】年度分成与津贴：+${pay.toLocaleString()} 元`);
    } else if (d.stage === 3 && d.qualified && state.age >= 19) {
      // 认真追逐且通过晋级选拔/医考后，每年发放真实职业化津贴（不再纯倒贴钱！）
      const stipendMap = {
        d_esport: [12000, '【青训二队合同】俱乐部年度训练津贴'],
        d_hurdle: [10000, '【省田径集训队】年度运动员津贴'],
        d_tsinghua: [6000, '【拔尖学子助研】年度学业奖学金'],
        d_singer: [Math.max(6000, (singer.songsCount || 1) * 2800), '【独立巡演与流媒体】年度演出词曲分账'],
        d_surgeon: [15000, '【住院医规培在岗】外科夜班与规培补贴']
      };
      const st = stipendMap[id];
      if (st) {
        inc += st[0];
        lines.push(`${st[1]}：+${st[0].toLocaleString()} 元`);
      }
    } else if (d.outcome === 'pivot') {
      if (id === 'd_esport' && state.age >= 19) {
        inc += 6000;
        lines.push('【热爱延续 · 业余赛事解说】年度副业稿费：+6,000 元');
      } else if (id === 'd_singer' && singer.songsCount > 0 && state.age >= 19) {
        const sPay = singer.songsCount * 3500;
        inc += sPay;
        lines.push(`【热爱延续 · 独立音乐人】原创流媒体版税：+${sPay.toLocaleString()} 元`);
      } else if (id === 'd_hurdle') {
        state.stats.health = clamp(state.stats.health + 1);
      } else if (id === 'd_surgeon') {
        state.stats.health = clamp(state.stats.health + 1);
      }
    }
  }
  return inc;
}
