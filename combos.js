// 《这辈子 2.0》排程 Combo 连携词典（含 5 条追梦专属连携 + 双卡碰撞演出元数据 + 配对高亮提示）+ 季节限定金边贴纸库
// 严格遵循纯中文零表情符号规范。

export const SCHEDULE_COMBOS = [
  {
    id: 'cb_desk_study', name: '并肩刷题', stage: 'child', crestIco: 'study',
    reqAnyOf: [['study_lit', 'study_num', 'study_self'], ['accompany_friend']],
    pills: ['学识 +1', '同桌 +2'],
    desc: '学识额外 +1 · 同桌亲密 +2 · 心态 +2',
    hint: '文科阅读/数理解题 + 和同桌玩耍',
    bonus: { knowledge: 1, friendInt: 2, mood: 2 }
  },
  {
    id: 'cb_sweet_kid', name: '贴心帮手', stage: 'child', crestIco: 'coin',
    req: ['chores', 'accompany_parents'],
    pills: ['零花 +¥120', '亲密 +2'],
    desc: '零花 +¥120 · 父母亲密 +2 · 心态 +2',
    hint: '做家务/兼职 + 陪伴父母',
    bonus: { cash: 120, parentInt: 2, mood: 2 }
  },
  {
    id: 'cb_golden_routine', name: '黄金作息', stage: 'any', crestIco: 'life',
    req: ['exercise', 'rest'],
    pills: ['健康 +1', '疲劳 -2'],
    desc: '健康额外 +1 · 疲劳额外 -2 · 心态 +1',
    hint: '体育锻炼/太极 + 完整休息',
    bonus: { health: 1, fatigue: -2, mood: 1 }
  },
  {
    id: 'cb_sprint_tutor', name: '名师冲刺', stage: 'child', crestIco: 'sprint',
    req: ['study_tutor', 'gaokao_sprint'],
    pills: ['学识 +2', '心态 +1'],
    desc: '学识额外 +2 · 稳固考前状态',
    hint: '付费补习 + 考前冲刺',
    bonus: { knowledge: 2, mood: 1 }
  },
  {
    id: 'cb_summer_joy', name: '盛夏记忆', stage: 'child', crestIco: 'cicada',
    reqAnyOf: [['summer_cicada', 'summer_fc', 'summer_swim', 'summer_stall'], ['accompany_friend', 'accompany_parents']],
    pills: ['心态 +4', '亲密 +2'],
    desc: '心态 +4 · 表达 +1 · 亲密 +2',
    hint: '任意暑假贴纸 + 陪父母/找同桌',
    bonus: { mood: 4, expr: 1, friendInt: 2 }
  },
  {
    id: 'cb_uni_leap', name: '知行合一', stage: 'adult', crestIco: 'bulb',
    req: ['uni_study', 'uni_intern'],
    pills: ['专业 +2', '补贴 +¥600'],
    desc: '大学专业 +2 · 实习补贴 +¥600',
    hint: '泡馆修学分 + 大厂实习项目',
    bonus: { pro: 2, cash: 600 }
  },
  {
    id: 'cb_work_leap', name: '职场跃迁', stage: 'adult', crestIco: 'work',
    req: ['pro_self', 'pro_course'],
    pills: ['专业 +2', '项目 +1'],
    desc: '专业额外 +2 · 项目沉淀 +1',
    hint: '专业自学 + 导师项目课',
    bonus: { pro: 2, project: 1 }
  },
  {
    id: 'cb_office_relief', name: '下班微醺', stage: 'adult', crestIco: 'pub',
    req: ['overtime', 'pub_drink'],
    pills: ['心态 +3', '疲劳 -2'],
    desc: '心态额外 +3 · 疲劳额外 -2',
    hint: '加班副业 + 小酒馆微醺',
    bonus: { mood: 3, fatigue: -2 }
  },
  {
    id: 'cb_warm_home', name: '烟火良宵', stage: 'adult', crestIco: 'heart',
    req: ['date_partner', 'play_kid'],
    pills: ['伴侣 +3', '亲子 +3'],
    desc: '伴侣好感度 +3 · 亲子羁绊 +3 · 心态 +3',
    hint: '伴侣约会 + 高质量陪娃',
    bonus: { partnerInt: 3, kidBond: 3, mood: 3 }
  },
  {
    id: 'cb_kid_balance', name: '恩威并施', stage: 'adult', crestIco: 'baby',
    req: ['tutor_kid', 'play_kid'],
    pills: ['娃学业 +2', '心态 +3'],
    desc: '心态 +3 · 娃学业 +2 · 娃心态 +2',
    hint: '辅导作业 + 高质量陪娃',
    bonus: { mood: 3, kidStudy: 2, kidMood: 2 }
  },
  {
    id: 'cb_park_star', name: '公园红人', stage: 'elder', crestIco: 'dance',
    req: ['square_dance', 'exercise'],
    pills: ['老年圈 +1', '健康 +2'],
    desc: '老年圈进度 +1 · 健康 +2 · 心态 +2',
    hint: '跳广场舞 + 太极散步',
    bonus: { elderCircle: 1, health: 2, mood: 2 }
  },
  {
    id: 'cb_elder_growth', name: '老友共学', stage: 'elder', crestIco: 'tutor',
    req: ['elder_uni', 'accompany_friend'],
    pills: ['学识 +2', '老友 +3'],
    desc: '学识 +2 · 老友亲密 +3 · 表达 +1',
    hint: '老年大学 + 约老友重聚',
    bonus: { knowledge: 2, friendInt: 3, expr: 1 }
  },
  {
    id: 'cb_full_grind', name: '废寝忘食', stage: 'any', crestIco: 'lamp',
    reqAnyDup: [['study_lit', 'study_num', 'study_self', 'uni_study', 'pro_self'], 3],
    pills: ['主业 +2', '疲劳 +1'],
    desc: '单季连学 3 格：学识/专业额外 +2',
    hint: '同季连排 3 次文理学习或专业学习',
    bonus: { mainStudy: 2, fatigue: 1 }
  },
  {
    id: 'cb_chill_day', name: '满血复活', stage: 'any', crestIco: 'zzz',
    reqDup: { id: 'rest', count: 2 },
    pills: ['疲劳 -3', '心态 +2'],
    desc: '疲劳额外 -3 · 健康 +1 · 心态 +2',
    hint: '同季排入 2 次完整休息',
    bonus: { fatigue: -3, health: 1, mood: 2 }
  },

  // ===== 5 条追梦专属生活碰撞 Combo =====
  {
    id: 'cb_drm_singer', name: '深夜灵感', stage: 'any', crestIco: 'guitar',
    reqAnyOf: [['dr_singer'], ['rest', 'pub_drink', 'summer_cicada']],
    pills: ['写歌 +3', '心态 +3'],
    desc: '原创专长额外 +3 · 心态 +3 · 攒新歌灵感',
    hint: '抱琴写歌/排练 + 休息放空/小酒馆',
    bonus: { dreamId: 'd_singer', dream: 3, mood: 3, addSongChance: 0.45 }
  },
  {
    id: 'cb_drm_esport', name: '双排连胜', stage: 'any', crestIco: 'gamepad',
    reqAnyOf: [['dr_esport'], ['accompany_friend', 'summer_fc']],
    pills: ['电竞 +3', '挚友 +3'],
    desc: '电竞专长额外 +3 · 同桌/老友亲密 +3',
    hint: '五排/战术合练 + 找同桌老友/打红白机',
    bonus: { dreamId: 'd_esport', dream: 3, friendInt: 3, mood: 2 }
  },
  {
    id: 'cb_drm_hurdle', name: '超量恢复', stage: 'any', crestIco: 'stopwatch',
    req: ['dr_hurdle', 'rest'],
    pills: ['奥运 +3', '疲劳 -2'],
    desc: '奥运田径专长额外 +3 · 额外消除 2 点疲劳',
    hint: '校队/省队特训 + 完整休息',
    bonus: { dreamId: 'd_hurdle', dream: 3, fatigue: -2, health: 1 }
  },
  {
    id: 'cb_drm_tsinghua', name: '融会贯通', stage: 'any', crestIco: 'trophy',
    reqAnyOf: [['dr_tsinghua'], ['study_lit', 'study_num', 'study_self', 'gaokao_sprint', 'uni_study']],
    pills: ['清北 +3', '学识 +2'],
    desc: '清北专长额外 +3 · 学识额外 +2',
    hint: '死磕难题/真题 + 文科阅读/数理解题',
    bonus: { dreamId: 'd_tsinghua', dream: 3, knowledge: 2 }
  },
  {
    id: 'cb_drm_surgeon', name: '医者仁心', stage: 'any', crestIco: 'stethoscope',
    req: ['dr_surgeon', 'accompany_parents'],
    pills: ['医学 +3', '亲密 +3'],
    desc: '医学专长额外 +3 · 父母亲密 +3 · 自理 +1',
    hint: '解剖图谱/临床轮转 + 陪伴父母',
    bonus: { dreamId: 'd_surgeon', dream: 3, parentInt: 3, selfCare: 1 }
  }
];

function isStageMatch(cbStage, age) {
  if (!cbStage || cbStage === 'any') return true;
  if (cbStage === 'child') return age <= 18;
  if (cbStage === 'adult') return age >= 19 && age <= 50;
  if (cbStage === 'elder') return age >= 51;
  return true;
}

export function detectCombos(draftIds, state = null) {
  if (!draftIds || draftIds.length < 2) return [];
  const age = state?.age ?? 25;
  const counts = {};
  for (const id of draftIds) counts[id] = (counts[id] || 0) + 1;
  const matched = [];
  for (const cb of SCHEDULE_COMBOS) {
    if (state && !isStageMatch(cb.stage, age)) continue;
    let ok = false;
    let pair = null;
    if (cb.req) {
      ok = cb.req.every(id => (counts[id] || 0) >= 1);
      if (ok) pair = [cb.req[0], cb.req[1]];
    } else if (cb.reqDup) {
      ok = (counts[cb.reqDup.id] || 0) >= cb.reqDup.count;
      if (ok) pair = [cb.reqDup.id, cb.reqDup.id];
    } else if (cb.reqAnyOf) {
      const g0 = cb.reqAnyOf[0].find(id => (counts[id] || 0) >= 1);
      const g1 = cb.reqAnyOf[1].find(id => (counts[id] || 0) >= 1);
      ok = Boolean(g0 && g1);
      if (ok) pair = [g0, g1];
    } else if (cb.reqAnyDup) {
      const [ids, need] = cb.reqAnyDup;
      const hitId = ids.find(id => (counts[id] || 0) >= need);
      ok = Boolean(hitId);
      if (ok) pair = [hitId, hitId];
    }
    if (ok) matched.push({ ...cb, pair });
  }
  return matched;
}

// 计算当前排程草稿下，再点哪张贴纸可以立刻撞出新 Combo（用于抽屉金边配对微光提示！）
export function getComboPartnerIds(draftIds, availableIds, state = null) {
  const partners = new Set();
  if (!draftIds || !draftIds.length) return partners;
  const baseCombos = new Set(detectCombos(draftIds, state).map(c => c.id));
  for (const candId of availableIds) {
    const nextCombos = detectCombos([...draftIds, candId], state);
    if (nextCombos.some(c => !baseCombos.has(c.id))) {
      partners.add(candId);
    }
  }
  return partners;
}

// ===== 2. 季节限定金边贴纸库（含暑假大变盘）=====
export const SEASONAL_STICKERS = [
  {
    id: 'summer_cicada', pool: 'summer', name: '外婆家抓蝉', short: '外婆抓蝉', ico: 'cicada',
    cat: '6.身心与生活', costCash: 0, seasonal: true, badge: '暑假',
    chips: [{ t: '心态 +5', k: 'pos' }, { t: '健康 +2', k: 'pos' }, { t: '疲劳 -2', k: 'pos' }],
    effects: { mood: 5, health: 2, fatigue: -2, parentInt: 2 }
  },
  {
    id: 'summer_fc', pool: 'summer', name: '蹭空调打红白机', short: '打红白机', ico: 'gamepad',
    cat: '3.情感与社交', costCash: 20, seasonal: true, badge: '暑假',
    chips: [{ t: '心态 +6', k: 'pos' }, { t: '同桌 +3', k: 'pos' }],
    effects: { mood: 6, friendInt: 3, dream: 1, fatigue: -1 }
  },
  {
    id: 'summer_swim', pool: 'summer', name: '暑假学游泳', short: '学游泳', ico: 'swim',
    cat: '6.身心与生活', costCash: 80, seasonal: true, badge: '暑假',
    chips: [{ t: '健康 +4', k: 'pos' }, { t: '心态 +3', k: 'pos' }, { t: '疲劳 +1', k: 'neu' }],
    effects: { health: 4, mood: 3, fatigue: 1 }
  },
  {
    id: 'summer_stall', pool: 'summer', name: '暑假摆摊卖冰棍', short: '摆摊卖冰', ico: 'coin',
    cat: '2.职业与搞钱', costCash: 0, seasonal: true, badge: '暑假',
    chips: [{ t: '现金 +¥240', k: 'pos' }, { t: '表达 +2', k: 'pos' }, { t: '自理 +2', k: 'pos' }],
    effects: { cash: 240, expr: 2, selfCare: 2, fatigue: 2 }
  },

  {
    id: 'sea_ring', pool: 'child', name: '校门口套圈儿', short: '校门套圈', ico: 'ring',
    cat: '6.身心与生活', costCash: 30, seasonal: true, badge: '限定',
    chips: [{ t: '心态 +4', k: 'pos' }, { t: '赢零花钱', k: 'gold' }],
    effects: { mood: 4, luckyCash: [60, 180] }
  },
  {
    id: 'sea_monitor', pool: 'child', name: '竞选班干部', short: '竞选班干', ico: 'trophy',
    cat: '3.情感与社交', costCash: 0, seasonal: true, badge: '限定',
    chips: [{ t: '表达 +3', k: 'pos' }, { t: '学识 +1', k: 'pos' }, { t: '疲劳 +1', k: 'neu' }],
    effects: { expr: 3, knowledge: 1, mood: 2, fatigue: 1 }
  },
  {
    id: 'sea_sports', pool: 'child', name: '校运会报名', short: '校运会', ico: 'stopwatch',
    cat: '6.身心与生活', costCash: 0, seasonal: true, badge: '限定',
    chips: [{ t: '健康 +3', k: 'pos' }, { t: '心态 +2', k: 'pos' }, { t: '疲劳 +2', k: 'neu' }],
    effects: { health: 3, dream: 2, mood: 2, fatigue: 2 }
  },
  {
    id: 'sea_bookstall', pool: 'child', name: '旧书摊淘秘籍', short: '淘旧书', ico: 'study',
    cat: '1.成长与学习', costCash: 40, seasonal: true, badge: '限定',
    chips: [{ t: '学识 +3', k: 'pos' }, { t: '心态 +2', k: 'pos' }],
    effects: { knowledge: 3, mood: 2 }
  },
  {
    id: 'sea_card_trade', pool: 'child', name: '换干脆面水浒卡', short: '换水浒卡', ico: 'card',
    cat: '3.情感与社交', costCash: 20, seasonal: true, badge: '限定',
    chips: [{ t: '同桌 +5', k: 'pos' }, { t: '心态 +4', k: 'pos' }],
    effects: { friendInt: 5, mood: 4 }
  },

  {
    id: 'sea_side_gig', pool: 'adult', name: '朋友拉接私单', short: '接私单', ico: 'coin',
    cat: '2.职业与搞钱', costCash: 0, seasonal: true, badge: '限定',
    chips: [{ t: '现金 +¥5,500', k: 'pos' }, { t: '专业 +1', k: 'pos' }, { t: '疲劳 +3', k: 'neg' }],
    effects: { cash: 5500, pro: 1, fatigue: 3, mood: -1 }
  },
  {
    id: 'sea_house_tour', pool: 'adult', name: '周末看房踩盘', short: '周末看房', ico: 'home',
    cat: '2.职业与搞钱', costCash: 100, seasonal: true, badge: '限定',
    chips: [{ t: '自理理财 +3', k: 'pos' }, { t: '心态 +2', k: 'pos' }],
    effects: { selfCare: 3, mood: 2, fatigue: 1 }
  },
  {
    id: 'sea_teambuild', pool: 'adult', name: '部门郊游团建', short: '郊游团建', ico: 'plane',
    cat: '3.情感与社交', costCash: 0, seasonal: true, badge: '限定',
    chips: [{ t: '表达 +2', k: 'pos' }, { t: '心态 +4', k: 'pos' }, { t: '疲劳 -2', k: 'pos' }],
    effects: { expr: 2, mood: 4, fatigue: -2 }
  },
  {
    id: 'sea_ai_camp', pool: 'adult', name: '周末新工具实战营', short: '实战进修', ico: 'bulb',
    cat: '1.成长与学习', costCash: 800, seasonal: true, badge: '限定',
    chips: [{ t: '专业 +3', k: 'pos' }, { t: '项目 +1', k: 'gold' }, { t: '学识 +1', k: 'pos' }],
    effects: { pro: 3, project: 1, knowledge: 1, aiSkill: true, fatigue: 2 }
  },
  {
    id: 'sea_market', pool: 'adult', name: '夜市后备箱摆摊', short: '夜市摆摊', ico: 'gift',
    cat: '2.职业与搞钱', costCash: 300, seasonal: true, badge: '限定',
    chips: [{ t: '赚 ¥3~8千', k: 'gold' }, { t: '表达 +2', k: 'pos' }],
    effects: { luckyCash: [3000, 8000], expr: 2, mood: 2, fatigue: 2 }
  },

  {
    id: 'sea_morning_mkt', pool: 'elder', name: '早市淘特价鲜果', short: '逛早市', ico: 'bag',
    cat: '6.身心与生活', costCash: 0, seasonal: true, badge: '限定',
    chips: [{ t: '省钱 +¥600', k: 'pos' }, { t: '健康 +2', k: 'pos' }, { t: '心态 +3', k: 'pos' }],
    effects: { cash: 600, health: 2, mood: 3 }
  },
  {
    id: 'sea_calligraphy', pool: 'elder', name: '社区书画联展', short: '书画联展', ico: 'study',
    cat: '3.情感与社交', costCash: 0, seasonal: true, badge: '限定',
    chips: [{ t: '心态 +5', k: 'pos' }, { t: '老年圈 +1', k: 'gold' }, { t: '表达 +2', k: 'pos' }],
    effects: { mood: 5, elderCircle: 1, expr: 2 }
  },
  {
    id: 'sea_fishing_trip', pool: 'elder', name: '湖畔垂钓一整天', short: '湖畔垂钓', ico: 'life',
    cat: '6.身心与生活', costCash: 50, seasonal: true, badge: '限定',
    chips: [{ t: '健康 +3', k: 'pos' }, { t: '心态 +5', k: 'pos' }, { t: '疲劳 -3', k: 'pos' }],
    effects: { health: 3, mood: 5, fatigue: -3, friendInt: 2 }
  },
  {
    id: 'sea_sunset_tour', pool: 'elder', name: '夕阳红近郊赏花', short: '近郊赏花', ico: 'trip',
    cat: '6.身心与生活', costCash: 600, seasonal: true, badge: '限定',
    chips: [{ t: '心态 +6', k: 'pos' }, { t: '老友 +4', k: 'pos' }, { t: '健康 +1', k: 'pos' }],
    effects: { mood: 6, friendInt: 4, health: 1 }
  }
];

export const SEASONAL_MAP = Object.fromEntries(SEASONAL_STICKERS.map(s => [s.id, s]));

export function rollSeasonalOfferIds(state, extraCount = 0) {
  const isSummer = state.age <= 18 && state.subTurn === 2;
  const poolName = isSummer ? 'summer' : (state.age <= 18 ? 'child' : state.age <= 50 ? 'adult' : 'elder');
  const pool = SEASONAL_STICKERS.filter(s => s.pool === poolName);
  const want = Math.min(pool.length, (isSummer ? 2 : 1) + extraCount);
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, want).map(s => s.id);
}

// ===== 3. 点击选项时「人物动作微动效 + 轻像素道具贴片 + 舞台灯光 + 气泡」映射表 =====
export function getActionAnimSpec(actionId, state) {
  const map = {
    study_lit:         { anim: 'anim-study',     prop: 'study',       subProp: 'bulb',  light: 'light-focus', bubble: '读进心里！' },
    study_num:         { anim: 'anim-study',     prop: 'bulb',        subProp: 'spark', light: 'light-focus', bubble: '解出来了！' },
    study_self:        { anim: 'anim-study',     prop: 'study',       subProp: 'bulb',  light: 'light-focus', bubble: '记下来！' },
    study_tutor:       { anim: 'anim-sprint',    prop: 'tutor',       subProp: 'bulb',  light: 'light-focus', bubble: '名师提点!' },
    gaokao_sprint:     { anim: 'anim-sprint',    prop: 'fire',        subProp: 'lamp',  light: 'light-night', bubble: '拼了！！' },
    uni_study:         { anim: 'anim-study',     prop: 'study',       subProp: 'lamp',  light: 'light-focus', bubble: '泡图书馆!' },
    uni_intern:        { anim: 'anim-sprint',    prop: 'work',        subProp: 'bulb',  light: 'light-focus', bubble: '攒实习经验' },
    uni_parttime:      { anim: 'anim-active',    prop: 'tutor',       subProp: 'coin',  light: 'light-sun',   bubble: '家教赚生活费' },
    pro_self:          { anim: 'anim-study',     prop: 'study',       subProp: 'bulb',  light: 'light-focus', bubble: '精进中…' },
    pro_course:        { anim: 'anim-sprint',    prop: 'bulb',        subProp: 'lamp',  light: 'light-night', bubble: '弯道超车!' },
    elder_uni:         { anim: 'anim-study',     prop: 'tutor',       subProp: 'spark', light: 'light-sun',   bubble: '活到老学到老' },
    chores:            { anim: 'anim-active',    prop: 'broom',       subProp: 'coin',  light: 'light-sun',   bubble: '赚零花！' },
    overtime:          { anim: 'anim-sprint',    prop: 'lamp',        subProp: 'coin',  light: 'light-night', bubble: '再肝一会…' },
    rehire_work:       { anim: 'anim-study',     prop: 'work',        subProp: 'coin',  light: 'light-focus', bubble: '宝刀未老!' },
    accompany_parents: { anim: 'anim-social',    prop: 'parents',     subProp: 'heart', light: 'light-bloom', bubble: '陪陪爸妈~' },
    accompany_friend:  { anim: 'anim-social',    prop: 'social',      subProp: 'spark', light: 'light-bloom', bubble: state?.age <= 18 ? '走，玩去！' : '老友干杯!' },
    date_partner:      { anim: 'anim-social',    prop: 'heart',       subProp: 'spark', light: 'light-bloom', bubble: '心动约会~' },
    square_dance:      { anim: 'anim-active',    prop: 'dance',       subProp: 'spark', light: 'light-sun',   bubble: '动起来！' },
    tutor_kid:         { anim: 'anim-frustrate', prop: 'anger',       subProp: 'study', light: 'light-focus', bubble: '这题讲过!!' },
    play_kid:          { anim: 'anim-active',    prop: 'plane',       subProp: 'heart', light: 'light-sun',   bubble: '飞高高~' },
    // 五条梦想专属微动效
    dr_esport:         { anim: 'anim-sprint',    prop: 'gamepad',     subProp: 'fire',  light: 'light-dream', bubble: '一波反打!' },
    dr_hurdle:         { anim: 'anim-active',    prop: 'stopwatch',   subProp: 'spark', light: 'light-sun',   bubble: '冲刺奥运!' },
    dr_tsinghua:       { anim: 'anim-study',     prop: 'trophy',      subProp: 'bulb',  light: 'light-focus', bubble: '解出来了!' },
    dr_singer:         { anim: 'anim-social',    prop: 'guitar',      subProp: 'spark', light: 'light-dream', bubble: '这段好听~' },
    dr_surgeon:        { anim: 'anim-study',     prop: 'stethoscope', subProp: 'heart', light: 'light-focus', bubble: '稳住手势!' },
    train_dream:       { anim: 'anim-active',    prop: 'dream',       subProp: 'spark', light: 'light-dream', bubble: '离梦更近!' },
    exercise:          { anim: 'anim-active',    prop: 'exercise',    subProp: 'spark', light: 'light-sun',   bubble: '一二三四!' },
    rest:              { anim: 'anim-chill',     prop: 'zzz',         subProp: 'rest',  light: 'light-sun',   bubble: '好舒服~' },
    pub_drink:         { anim: 'anim-tipsy',     prop: 'pub',         subProp: 'spark', light: 'light-amber', bubble: '敬生活…' },
    world_trip:        { anim: 'anim-celebrate', prop: 'trip',        subProp: 'film',  light: 'light-sun',   bubble: '去看世界!' },
    summer_cicada:     { anim: 'anim-active',    prop: 'cicada',      subProp: 'spark', light: 'light-sun',   bubble: '抓大蝉咯!' },
    summer_fc:         { anim: 'anim-sprint',    prop: 'gamepad',     subProp: 'spark', light: 'light-dream', bubble: '通关啦！' },
    summer_swim:       { anim: 'anim-active',    prop: 'swim',        subProp: 'spark', light: 'light-sun',   bubble: '清凉一夏!' },
    summer_stall:      { anim: 'anim-active',    prop: 'coin',        subProp: 'spark', light: 'light-sun',   bubble: '卖冰棍咯!' },
    sea_ring:          { anim: 'anim-active',    prop: 'ring',        subProp: 'spark', light: 'light-sun',   bubble: '套中大奖!' },
    sea_monitor:       { anim: 'anim-celebrate', prop: 'trophy',      subProp: 'spark', light: 'light-dream', bubble: '请投我一票!' },
    sea_sports:        { anim: 'anim-active',    prop: 'stopwatch',   subProp: 'fire',  light: 'light-sun',   bubble: '冲线！！' },
    sea_bookstall:     { anim: 'anim-study',     prop: 'study',       subProp: 'bulb',  light: 'light-focus', bubble: '淘到宝了!' },
    sea_card_trade:    { anim: 'anim-social',    prop: 'card',        subProp: 'spark', light: 'light-bloom', bubble: '闪卡到手!' },
    sea_side_gig:      { anim: 'anim-sprint',    prop: 'coin',        subProp: 'lamp',  light: 'light-night', bubble: '外快到手!' },
    sea_house_tour:    { anim: 'anim-active',    prop: 'home',        subProp: 'spark', light: 'light-sun',   bubble: '看看户型!' },
    sea_teambuild:     { anim: 'anim-social',    prop: 'plane',       subProp: 'spark', light: 'light-bloom', bubble: '带薪出游!' },
    sea_ai_camp:       { anim: 'anim-study',     prop: 'bulb',        subProp: 'spark', light: 'light-dream', bubble: '掌握新本领!' },
    sea_market:        { anim: 'anim-active',    prop: 'gift',        subProp: 'coin',  light: 'light-amber', bubble: '开张大吉!' },
    sea_morning_mkt:   { anim: 'anim-active',    prop: 'bag',         subProp: 'coin',  light: 'light-sun',   bubble: '满载而归!' },
    sea_calligraphy:   { anim: 'anim-study',     prop: 'study',       subProp: 'spark', light: 'light-sun',   bubble: '好字好画!' },
    sea_fishing_trip:  { anim: 'anim-chill',     prop: 'life',        subProp: 'spark', light: 'light-sun',   bubble: '大鱼上钩~' },
    sea_sunset_tour:   { anim: 'anim-celebrate', prop: 'trip',        subProp: 'heart', light: 'light-bloom', bubble: '风景正好!' }
  };
  return map[actionId] || { anim: 'anim-active', prop: 'spark', subProp: null, light: 'light-sun', bubble: '安排上！' };
}
