// 《这辈子 2.0》Sprint 5 —— 学生时期「学识 + 数理」双主轴分科成长、38季教材深度继承、
// 离散三角区间算分引擎、二分反向达标路标与子女代际考学复用系统
// 严格遵循纯中文零表情符号规范。

import { getBondTier, hasHex } from './hextech.js?v=s51';

export const SUBJECT_META = {
  chn:  { id: 'chn',  label: '语文', fullName: '语文·古诗文与阅读写作', short: '语文阅读', axis: 'knowledge', unlockAge: 6, ico: 'study' },
  math: { id: 'math', label: '数学', fullName: '数学·几何与函数解题',   short: '数学解题', axis: 'numLogic',  unlockAge: 6, ico: 'bulb' },
  eng:  { id: 'eng',  label: '英语', fullName: '英语·磁带听力与词汇',   short: '英语听说', axis: 'both',      unlockAge: 6, ico: 'news' },
  sci:  { id: 'sci',  label: '理综', fullName: '理综·物化生实验推算',   short: '理综推算', axis: 'numLogic',  unlockAge: 12, unlockSub: 3, ico: 'bulb' },
  art:  { id: 'art',  label: '文综', fullName: '文综·政史地材料研读',   short: '文综研读', axis: 'knowledge', unlockAge: 12, unlockSub: 3, ico: 'study' }
};

export function clampVal(v, min = 0, max = 100) {
  return Math.max(min, Math.min(max, v));
}

// 确定性哈希伪随机数（0..1），确保同一存档种子与考试届次落盘结果恒定，防刷档重抽
export function seededUnit(seedStr) {
  let h = 2166136261 >>> 0;
  const s = String(seedStr);
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  h ^= h >>> 16;
  h = Math.imul(h, 2246822507) >>> 0;
  h ^= h >>> 13;
  return (h >>> 0) / 4294967296;
}

export function seededInt(seedStr, min, max) {
  if (max <= min) return min;
  const u = seededUnit(seedStr);
  return min + Math.floor(u * (max - min + 1));
}

// 三阶当期教材深度上限 D（小学 62 -> 初中 80 -> 高中 100）
export function getStageTextbookCap(age, subTurn = 1) {
  if (age < 12 || (age === 12 && subTurn <= 2)) return 62;
  if (age < 15 || (age === 15 && subTurn <= 2)) return 80;
  return 100;
}

export function getStudentStageKey(age, subTurn = 1) {
  if (age < 12 || (age === 12 && subTurn <= 2)) return 'p6';
  if (age < 15 || (age === 15 && subTurn <= 2)) return 'zk';
  if (age < 18 || (age === 18 && subTurn <= 2)) return 'gk';
  return 'adult';
}

export function getSelectableSubjects(state) {
  const stg = getStudentStageKey(state.age, state.subTurn);
  if (stg === 'p6') return ['chn', 'math', 'eng'];
  if (stg === 'zk') return ['chn', 'math', 'eng', 'sci', 'art'];
  if (stg === 'gk') {
    const trk = state.examTrack || 'sci';
    return ['chn', 'math', 'eng', trk];
  }
  return ['chn', 'math', 'eng'];
}

export function ensureExamState(s) {
  if (!s || !s.stats) return s;
  if (typeof s.stats.numLogic !== 'number') {
    const baseNum = s.origin?.initStats?.numLogic ?? 20;
    s.stats.numLogic = Math.round(clampVal(s.age > 6 ? (s.stats.knowledge || baseNum) : baseNum));
  }
  if (!s.statsRaw || typeof s.statsRaw !== 'object') {
    s.statsRaw = {
      knowledge: s.stats.knowledge,
      numLogic: s.stats.numLogic
    };
  } else {
    if (typeof s.statsRaw.knowledge !== 'number') s.statsRaw.knowledge = s.stats.knowledge;
    if (typeof s.statsRaw.numLogic !== 'number') s.statsRaw.numLogic = s.stats.numLogic;
  }

  if (!s.subjects || typeof s.subjects !== 'object') {
    const chnBoost = s.talent?.id === 't_shelf' ? 6 : 0;
    const mathBoost = s.talent?.id === 't_mathfam' ? 6 : 0;
    s.subjects = {
      chn: 20 + chnBoost,
      math: 20 + mathBoost,
      eng: 20 + (s.talent?.id === 't_vision' ? 4 : 0),
      art: 20,
      sci: 20
    };
  }
  for (const k of ['chn', 'math', 'eng', 'art', 'sci']) {
    if (typeof s.subjects[k] !== 'number') s.subjects[k] = 20;
  }

  if (!s.examSeed) {
    s.examSeed = Math.floor(100000 + Math.random() * 899999);
  }
  if (!s.examTrack) {
    // 默认按更高的一侧预置，初三放榜与高中可自由切换
    s.examTrack = (s.statsRaw.numLogic >= s.statsRaw.knowledge) ? 'sci' : 'art';
  }
  if (!s.schoolTier) s.schoolTier = 'normal';
  if (!s.examHistory || typeof s.examHistory !== 'object') s.examHistory = {};
  if (!s.selectedSubject || !getSelectableSubjects(s).includes(s.selectedSubject)) {
    s.selectedSubject = pickRecommendedSubject(s);
  }
  if (!s.tutorKidFocus) s.tutorKidFocus = 'balanced';
  if (s.floors && typeof s.floors.numLogic !== 'number') s.floors.numLogic = 0;
  if (s.unusedYears && typeof s.unusedYears.numLogic !== 'number') s.unusedYears.numLogic = 0;
  if (s.usedThisYear && typeof s.usedThisYear.numLogic !== 'boolean') s.usedThisYear.numLogic = false;
  if (s.halfProgress && typeof s.halfProgress.numLogic !== 'number') s.halfProgress.numLogic = 0;

  if (s.child) ensureChildExamProfile(s);
  return s;
}

export function syncVisibleAcademicStats(s) {
  if (!s?.statsRaw) return;
  s.stats.knowledge = Math.round(clampVal(s.statsRaw.knowledge, 0, 100));
  s.stats.numLogic = Math.round(clampVal(s.statsRaw.numLogic, 0, 100));
}

// 自动挑选当前短板或本学段未满上限的科目
export function pickRecommendedSubject(s) {
  const avail = getSelectableSubjects(s);
  const D = getStageTextbookCap(s.age, s.subTurn);
  let best = avail[0];
  let minScore = 999;
  for (const k of avail) {
    const X = computeCompositeX(k, s.statsRaw?.knowledge ?? s.stats.knowledge, s.statsRaw?.numLogic ?? s.stats.numLogic, s.subjects?.[k] ?? 20);
    const cappedPenalty = (s.subjects?.[k] ?? 20) >= D - 0.05 ? 200 : 0;
    if (X + cappedPenalty < minScore) {
      minScore = X + cappedPenalty;
      best = k;
    }
  }
  return best;
}

// 100% 镜像对称的 70% 主轴 + 30% 单科专项合成公式
export function computeCompositeX(subjKey, lit, num, subjVal) {
  if (subjKey === 'chn' || subjKey === 'art') return 0.70 * lit + 0.30 * subjVal;
  if (subjKey === 'math' || subjKey === 'sci') return 0.70 * num + 0.30 * subjVal;
  return 0.35 * lit + 0.35 * num + 0.30 * subjVal; // 英语：35% 学识 + 35% 数理 + 30% 英语专项
}

// 计算单格选科学习后的真实增量（供正式结算与排程试排预览共用）
export function simulateSubjectStudyStep(snap, subjKey, opts = {}) {
  const D = getStageTextbookCap(snap.age, snap.subTurn);
  const isLowMood = snap.mood < 30;
  const exemptMood = snap.originId === 'working' || snap.scholarTier >= 2;
  const e = (isLowMood && !exemptMood) ? 0.5 : 1.0;
  const cSchool = (snap.schoolTier === 'key_mid' || snap.schoolTier === 'key_high') ? 1.12 : 1.0;
  const flowMult = opts.doubleFlow ? 1.8 : 1.0;
  const soloBoost = opts.solo && snap.hasSoloHex ? 1.2 : 1.0;
  const buffBoost = snap.hasStudyBuff ? 1.08 : 1.0;

  let lit = snap.lit;
  let num = snap.num;
  const oldLit = lit, oldNum = num;
  const oldS = snap.subjects[subjKey] ?? 20;

  const gainP = (v) => (v < 65 ? 2.0 : 1.4) * e * flowMult * soloBoost;
  if (subjKey === 'chn' || subjKey === 'art') {
    lit = Math.min(D, lit + gainP(lit));
  } else if (subjKey === 'math' || subjKey === 'sci') {
    num = Math.min(D, num + gainP(num));
  } else {
    lit = Math.min(D, lit + gainP(lit) * 0.5);
    num = Math.min(D, num + gainP(num) * 0.5);
  }

  const paidB = (opts.paid && oldS < 85) ? 1.2 : 0;
  const sprintB = opts.sprint ? 0.8 : 0;
  const teacherB = (!opts.paid && snap.originId === 'teacher' && opts.teacherLucky) ? 1.0 : 0;
  const newS = Math.min(D, oldS + (4.5 + paidB + sprintB + teacherB) * e * cSchool * buffBoost * flowMult);

  return {
    lit,
    num,
    newS,
    dLit: +(lit - oldLit).toFixed(1),
    dNum: +(num - oldNum).toFixed(1),
    dS: +(newS - oldS).toFixed(1),
    capped: (lit - oldLit < 0.05) && (num - oldNum < 0.05) && (newS - oldS < 0.05),
    D
  };
}

export function makeStudentSnapshotFromState(s) {
  ensureExamState(s);
  const scholarTier = getBondTier(s, 'scholar');
  const hasBuff = id => (s.statusBuffs || []).some(b => b.id === id);
  return {
    studentId: 'player',
    examSeed: s.examSeed,
    age: s.age,
    subTurn: s.subTurn,
    originId: s.origin?.id || 'working',
    lit: s.statsRaw.knowledge,
    num: s.statsRaw.numLogic,
    subjects: { ...s.subjects },
    health: s.stats.health,
    mood: s.stats.mood,
    fatigue: s.stats.fatigue,
    fatigueLimit: s.origin?.fatigueLimit || 20,
    examTrack: s.examTrack || 'sci',
    schoolTier: s.schoolTier || 'normal',
    scholarTier,
    hasSoloHex: hasHex(s, 'hx_solo_genius'),
    hasStudyBuff: hasBuff('bf_hot_study') || hasBuff('bf_key_class') || hasBuff('bf_key_high') || hasBuff('bf_sprint'),
    hexExamBonus: (s.gaokaoHexBonus || 0) + (hasHex(s, 'hx_tsinghua_link') ? 6 : 0)
  };
}

// 正式执行 1 格学生期分科学习
export function applySubjectStudyStep(state, subjKey, opts = {}) {
  ensureExamState(state);
  const avail = getSelectableSubjects(state);
  const sk = avail.includes(subjKey) ? subjKey : pickRecommendedSubject(state);
  const snap = makeStudentSnapshotFromState(state);
  const teacherLucky = seededUnit(`${state.examSeed}-${state.age}-${state.subTurn}-${sk}-${state.totalTurns}`) < 0.28;
  const res = simulateSubjectStudyStep(snap, sk, { ...opts, teacherLucky });

  state.statsRaw.knowledge = res.lit;
  state.statsRaw.numLogic = res.num;
  state.subjects[sk] = res.newS;
  syncVisibleAcademicStats(state);

  if (res.dLit > 0) { state.usedThisYear.knowledge = true; state.unusedYears.knowledge = 0; }
  if (res.dNum > 0) { state.usedThisYear.numLogic = true; state.unusedYears.numLogic = 0; }

  // 若本科目已达本学段教材上限 D，自动帮玩家将下一次焦点切到未满科目
  if (state.subjects[sk] >= res.D - 0.1) {
    state.selectedSubject = pickRecommendedSubject(state);
  }
  return { subjKey: sk, meta: SUBJECT_META[sk], ...res };
}

// ============================================================================
// 核心算分引擎：单科熟练度 -> 随机分数区间 [L, U] 与离散三角分布抽样 Y = L + I + J
// ============================================================================
export function calcSubjectScoreInterval(subjKey, snap, D, fullP) {
  const SVal = snap.subjects[subjKey] ?? 20;
  const X = computeCompositeX(subjKey, snap.lit, snap.num, SVal);
  const overFat = snap.fatigue >= (snap.fatigueLimit || 20);
  const mood = snap.mood;

  const mDrop = mood >= 60 ? 0 : (mood >= 30 ? 0.025 : 0.08);
  const delta = mDrop + (overFat ? 0.04 : 0);
  const steadyOriginTrim = snap.originId === 'welloff' ? -0.003 : 0;
  const w = Math.max(0.011, 0.015 + steadyOriginTrim + (mood < 60 ? 0.012 : 0) + (mood < 30 ? 0.020 : 0) + (overFat ? 0.015 : 0));

  const isLang = subjKey === 'chn' || subjKey === 'eng';
  const b = isLang ? 0.24 : 0.20;
  const a = isLang ? 0.70 : 0.77;
  const cap = isLang ? Math.max(1, fullP - (fullP >= 150 ? 4 : 2)) : Math.max(1, fullP - (fullP >= 150 ? 2 : 1));

  const mu = b + a * clampVal(X / D, 0, 1) - delta;
  const h = Math.max(1.5, fullP * w);
  const L = Math.max(0, Math.min(cap, Math.ceil(fullP * mu - h)));
  const U = Math.max(L, Math.min(cap, Math.floor(fullP * mu + h)));
  return { subjKey, label: SUBJECT_META[subjKey]?.label || subjKey, full: fullP, X: +X.toFixed(1), S: +SVal.toFixed(1), L, U };
}

export function calcPeScoreInterval(snap) {
  const overFat = snap.fatigue >= (snap.fatigueLimit || 20);
  const delta = (snap.mood < 30 ? 0.02 : 0) + (overFat ? 0.04 : 0);
  const mu = 0.36 + 0.64 * clampVal(snap.health / 82, 0, 1) - delta;
  const L = Math.max(0, Math.min(50, Math.ceil(50 * mu - 1.5)));
  const U = Math.max(L, Math.min(50, Math.floor(50 * mu + 1.5)));
  return { subjKey: 'pe', label: '体育', full: 50, X: snap.health, S: snap.health, L, U };
}

function sampleTriangular(seedPrefix, L, U) {
  const n = Math.max(0, U - L);
  if (n === 0) return L;
  const a = Math.floor(n / 2);
  const I = seededInt(`${seedPrefix}-I`, 0, a);
  const J = seededInt(`${seedPrefix}-J`, 0, n - a);
  return L + I + J;
}

// 评估整张考卷（小升初 p6: 300分 / 中考 zk: 660分 / 高考 gk: 750分）
export function evaluateExamPaper(snap, examType = 'gk', attemptIdx = 0) {
  const rows = [];
  if (examType === 'p6') {
    rows.push(calcSubjectScoreInterval('chn', snap, 62, 100));
    rows.push(calcSubjectScoreInterval('math', snap, 62, 100));
    rows.push(calcSubjectScoreInterval('eng', snap, 62, 100));
  } else if (examType === 'zk') {
    rows.push(calcSubjectScoreInterval('chn', snap, 80, 150));
    rows.push(calcSubjectScoreInterval('math', snap, 80, 150));
    rows.push(calcSubjectScoreInterval('eng', snap, 80, 150));
    // 文理合卷 160 分（政史地 80 + 物化生 80 镜像对称合并展示，也可分列）
    const artHalf = calcSubjectScoreInterval('art', snap, 80, 80);
    const sciHalf = calcSubjectScoreInterval('sci', snap, 80, 80);
    rows.push({
      subjKey: 'zk_comp',
      label: '文理合卷',
      full: 160,
      X: +((artHalf.X + sciHalf.X) / 2).toFixed(1),
      S: +((artHalf.S + sciHalf.S) / 2).toFixed(1),
      L: artHalf.L + sciHalf.L,
      U: artHalf.U + sciHalf.U
    });
    rows.push(calcPeScoreInterval(snap));
  } else {
    const trk = snap.examTrack || 'sci';
    rows.push(calcSubjectScoreInterval('chn', snap, 100, 150));
    rows.push(calcSubjectScoreInterval('math', snap, 100, 150));
    rows.push(calcSubjectScoreInterval('eng', snap, 100, 150));
    const comp = calcSubjectScoreInterval(trk, snap, 100, 300);
    comp.label = trk === 'sci' ? '理科综合' : '文科综合';
    rows.push(comp);
  }

  let sumL = 0, sumU = 0, sumY = 0;
  for (const r of rows) {
    const seedKey = `${snap.examSeed}-${snap.studentId || 'p'}-${examType}-${attemptIdx}-${r.subjKey}`;
    r.score = sampleTriangular(seedKey, r.L, r.U);
    sumL += r.L;
    sumU += r.U;
    sumY += r.score;
  }

  // 高考专属海克斯保底加分（寒窗苦读 / 清北脉络，封顶不超 738）
  const extraBonus = examType === 'gk' ? Math.min(12, snap.hexExamBonus || 0) : 0;
  const fullTotal = examType === 'p6' ? 300 : examType === 'zk' ? 660 : 750;
  const capTotal = fullTotal - 8;

  return {
    examType,
    fullTotal,
    track: snap.examTrack || 'sci',
    rows,
    minTotal: Math.min(capTotal, sumL + extraBonus),
    maxTotal: Math.min(capTotal, sumU + extraBonus),
    finalScore: Math.min(capTotal, sumY + extraBonus),
    extraBonus
  };
}

// 一次性落盘获取考试结果（防重复抽签）
export function rollOrGetExamResult(state, examType) {
  ensureExamState(state);
  if (state.examHistory[examType]) return state.examHistory[examType];
  const snap = makeStudentSnapshotFromState(state);
  const res = evaluateExamPaper(snap, examType, 0);
  state.examHistory[examType] = res;
  return res;
}

// 后台二分反解「稳达标（区间下沿 G >= target）」所需的均衡指标 x
export function solveSteadyTargetX(snap, examType, targetScore) {
  const D = examType === 'p6' ? 62 : examType === 'zk' ? 80 : 100;
  let lo = 20, hi = D, ans = D;
  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    const testSnap = {
      ...snap,
      lit: mid,
      num: mid,
      subjects: { chn: mid, math: mid, eng: mid, art: mid, sci: mid }
    };
    const ev = evaluateExamPaper(testSnap, examType, 0);
    if (ev.minTotal >= targetScore) {
      ans = mid;
      hi = mid - 1;
    } else {
      lo = mid + 1;
    }
  }
  return { reqX: ans, D };
}

// 计算学生阶段考学路标 + 排程草稿实时区间跳变预览 + 再练 1 格个性化建议
export function getStudentExamPreview(state, draftIds = []) {
  ensureExamState(state);
  const stg = getStudentStageKey(state.age, state.subTurn);
  if (stg === 'adult') return null;

  const baseSnap = makeStudentSnapshotFromState(state);
  const simSnap = {
    ...baseSnap,
    subjects: { ...baseSnap.subjects }
  };

  // 将当前排程草稿里的学习/运动/休息逐格预演到考场快照
  const curSubj = state.selectedSubject || pickRecommendedSubject(state);
  for (const id of draftIds) {
    if (id === 'study_self') {
      const r = simulateSubjectStudyStep(simSnap, curSubj, { solo: true });
      simSnap.lit = r.lit; simSnap.num = r.num; simSnap.subjects[curSubj] = r.newS;
      simSnap.mood = clampVal(simSnap.mood - 1, 0, 100);
      simSnap.fatigue = clampVal(simSnap.fatigue + 1, 0, 100);
    } else if (id === 'study_tutor') {
      const r = simulateSubjectStudyStep(simSnap, curSubj, { paid: true });
      simSnap.lit = r.lit; simSnap.num = r.num; simSnap.subjects[curSubj] = r.newS;
      simSnap.mood = clampVal(simSnap.mood - 2, 0, 100);
      simSnap.fatigue = clampVal(simSnap.fatigue + 1, 0, 100);
    } else if (id === 'gaokao_sprint') {
      const r = simulateSubjectStudyStep(simSnap, curSubj, { solo: true, sprint: true });
      simSnap.lit = r.lit; simSnap.num = r.num; simSnap.subjects[curSubj] = r.newS;
      simSnap.mood = clampVal(simSnap.mood - 2, 0, 100);
      simSnap.fatigue = clampVal(simSnap.fatigue + 2, 0, 100);
    } else if (id === 'rest') {
      simSnap.mood = clampVal(simSnap.mood + 3, 0, 100);
      simSnap.fatigue = clampVal(simSnap.fatigue - 4, 0, 100);
    } else if (id === 'exercise') {
      simSnap.health = clampVal(simSnap.health + 2, 0, 100);
      simSnap.fatigue = clampVal(simSnap.fatigue - 2, 0, 100);
    }
  }

  const curPaper = evaluateExamPaper(baseSnap, stg, 0);
  const draftPaper = draftIds.length ? evaluateExamPaper(simSnap, stg, 0) : curPaper;

  let goalTitle = '';
  let targetScore = 256;
  if (stg === 'p6') {
    goalTitle = '12岁小升初·重点初中线';
    targetScore = 256;
  } else if (stg === 'zk') {
    const aimingKey = draftPaper.maxTotal >= 505;
    goalTitle = aimingKey ? '15岁中考·省重点线' : '15岁中考·普通高中线';
    targetScore = aimingKey ? 580 : 460;
  } else {
    const hasSprint = state.experiences.includes('exp_gaokao_sprint');
    if (draftPaper.maxTotal >= 625) {
      goalTitle = hasSprint ? '18岁高考·清北特招线' : '18岁高考·清北裸分线';
      targetScore = hasSprint ? 668 : 680;
    } else if (draftPaper.maxTotal >= 520) {
      goalTitle = '18岁高考·985名校线';
      targetScore = 620;
    } else {
      goalTitle = '18岁高考·普通本科线';
      targetScore = 500;
    }
  }

  const { reqX, D } = solveSteadyTargetX(simSnap, stg, targetScore);
  const G = draftPaper.minTotal;
  const V = draftPaper.maxTotal;
  const statusTag = G >= targetScore
    ? '稳达标'
    : V >= targetScore
      ? `冲刺区(下沿差${targetScore - G}分)`
      : `差${targetScore - V}分进冲刺区`;

  // 试排 1 格最优免费自习看看区间跳到多少
  const nextSubj = curSubj;
  const oneMoreSnap = { ...simSnap, subjects: { ...simSnap.subjects } };
  const stepOne = simulateSubjectStudyStep(oneMoreSnap, nextSubj, { solo: true });
  oneMoreSnap.lit = stepOne.lit;
  oneMoreSnap.num = stepOne.num;
  oneMoreSnap.subjects[nextSubj] = stepOne.newS;
  const nextPaper = evaluateExamPaper(oneMoreSnap, stg, 0);

  const avgX = Math.round(draftPaper.rows.filter(r => r.subjKey !== 'pe').reduce((a, b) => a + b.X, 0) / Math.max(1, draftPaper.rows.filter(r => r.subjKey !== 'pe').length));
  const pct = Math.min(100, Math.round((G / targetScore) * 100));

  return {
    stg,
    goalTitle,
    targetScore,
    reqX,
    D,
    avgX,
    curRange: [curPaper.minTotal, curPaper.maxTotal],
    draftRange: [G, V],
    nextSlotHint: stepOne.capped
      ? `${SUBJECT_META[nextSubj].label}本册已满(${D})，建议换科或去运动玩耍`
      : `再排1格${SUBJECT_META[nextSubj].label} → 预计 ${nextPaper.minTotal}~${nextPaper.maxTotal}分`,
    statusTag,
    pct,
    paper: draftPaper
  };
}

// ============================================================================
// 全生命周期（6–90岁）「下一关里程碑路标」统一生成器
// ============================================================================
export function getLifeStageCompass(state, draftIds = [], PROMO_REQ = [0, 0, 30, 50, 65, 80]) {
  ensureExamState(state);
  const toy = state.gender === 'female' ? '芭比娃娃' : '红色悠悠球';

  // 6–7岁：先提示 7 岁红花奖状与 8 岁心愿玩具
  if (state.age === 6 || (state.age === 7 && state.subTurn <= 2)) {
    const k = state.stats.knowledge;
    return {
      kicker: '下一关 · 7岁期末红花奖状',
      main: `需学识 ≥26（当前 ${k}/26 · 8岁买${toy}需留¥80）`,
      badge: k >= 26 ? '稳拿奖状' : `差 ${26 - k} 点`,
      pct: Math.min(100, Math.round((k / 26) * 100))
    };
  }
  if (state.age === 8 && state.subTurn === 1) {
    const c = Math.max(0, Math.round(state.cash));
    return {
      kicker: `下一关 · 8岁珍藏${toy}`,
      main: `本年第2季需现金 ≥¥80（当前 ¥${c}/80）`,
      badge: c >= 80 ? '已攒够' : `差 ¥${80 - c}`,
      pct: Math.min(100, Math.round((c / 80) * 100))
    };
  }
  if ((state.age === 8 && state.subTurn >= 2) || (state.age === 9 && state.subTurn === 1)) {
    const ex = state.stats.expr;
    return {
      kicker: '下一关 · 9岁竞选班长演讲',
      main: `需表达 ≥28（当前表达 ${ex}/28 · 找同桌玩可涨表达）`,
      badge: ex >= 28 ? '稳当选' : `差 ${28 - ex} 点`,
      pct: Math.min(100, Math.round((ex / 28) * 100))
    };
  }

  // 9岁第2季 – 18岁第2季：全程接入分科考学区间预测路标！
  if (state.age < 18 || (state.age === 18 && state.subTurn <= 2 && !state.gaokaoDone)) {
    const ep = getStudentExamPreview(state, draftIds);
    if (ep) {
      return {
        kicker: `下一关 · ${ep.goalTitle} (${ep.targetScore}分)`,
        main: `预计 ${ep.draftRange[0]}~${ep.draftRange[1]}分 · 建议实力 ${ep.avgX}/${ep.reqX}`,
        subHint: ep.nextSlotHint,
        badge: ep.statusTag,
        pct: ep.pct,
        examPreview: ep
      };
    }
  }

  // 大学期（18岁第3季 – gradAge）
  if (state.age < state.gradAge) {
    const p = state.stats.pro;
    const pj = state.projectCount;
    return {
      kicker: `下一关 · ${state.gradAge}岁毕业择城与晋升储备`,
      main: `升 L2 需专业 ≥30 + 项目 ≥1（当前专 ${p}/30 · 项 ${pj}/1）`,
      badge: (p >= 30 && pj >= 1) ? '起步达标' : '大学蓄力',
      pct: Math.min(100, Math.round(((Math.min(30, p) / 30) * 0.7 + Math.min(1, pj) * 0.3) * 100))
    };
  }

  // 青中年职场与买房（gradAge – 50岁）
  if (state.age <= 50) {
    const nextL = Math.min(5, (state.jobLevel || 1) + 1);
    const reqPro = PROMO_REQ[nextL] || 80;
    const reqPj = Math.max(1, nextL - 1);
    if (!state.house && state.age <= 34) {
      const total = Math.max(0, state.cash + (state.parentSupportLeft || 0));
      const need = state.cityTier === 1 ? 150000 : state.cityTier === 2 ? 120000 : 90000;
      return {
        kicker: '下一关 · 安家首付 & 职场晋升',
        main: `首付进度 ¥${Math.round(total / 10000)}万/${Math.round(need / 10000)}万 · L${nextL} 专业 ${state.stats.pro}/${reqPro}`,
        badge: total >= need ? '可看房上车' : `L${state.jobLevel}在职`,
        pct: Math.min(100, Math.round((total / need) * 100))
      };
    }
    if (state.age >= 34 && state.age <= 42 && state.track?.id === 'burst' && state.jobLevel < 4 && !state.aiSkillLearned) {
      return {
        kicker: '下一关 · 35–42岁行业裁员潮防线',
        main: `升上 L4（专业 ${state.stats.pro}/65·项目 ${state.projectCount}/3）或修导师新工具课避险`,
        badge: state.stats.pro >= 65 && state.projectCount >= 3 ? '可升L4免疫' : '抓紧加固',
        pct: Math.min(100, Math.round((state.stats.pro / 65) * 100))
      };
    }
    if (state.child && (state.age - state.child.bornAge) >= 6 && (state.age - state.child.bornAge) <= 18) {
      const kidAge = state.age - state.child.bornAge;
      const kp = getChildExamPreviewSummary(state);
      if (kp) {
        return {
          kicker: `下一关 · 孩子(${kidAge}岁)${kp.examLabel} & 自身L${nextL}`,
          main: `娃预计 ${kp.range[0]}~${kp.range[1]}分（${kp.tierLabel}）· 专 ${state.stats.pro}/${reqPro}`,
          badge: `方针:${kp.policyName}`,
          pct: Math.min(100, Math.round((state.stats.pro / reqPro) * 100))
        };
      }
    }
    if (state.jobLevel < 5) {
      return {
        kicker: `下一关 · 冲击职级 L${nextL}（薪资 ×${[0,1,1.3,1.7,2.2,3.0][nextL]}）`,
        main: `需专业 ≥${reqPro} 且项目 ≥${reqPj}（当前专业 ${state.stats.pro}/${reqPro} · 项目 ${state.projectCount}/${reqPj}）`,
        badge: (state.stats.pro >= reqPro && state.projectCount >= reqPj) ? '可去申请晋升!' : '稳步积累',
        pct: Math.min(100, Math.round((state.stats.pro / reqPro) * 100))
      };
    }
  }

  // 51–60岁：退休筹备与防骗前瞻
  if (state.age <= 60) {
    const antiOk = state.stats.knowledge >= 55 || state.stats.numLogic >= 55 || state.stats.selfCare >= 55;
    return {
      kicker: '下一关 · 60岁正式退休 & 64岁防骗线',
      main: `防骗需学识/数理/自理任一 ≥55（当前最高 ${Math.max(state.stats.knowledge, state.stats.numLogic, state.stats.selfCare)}/55）`,
      badge: antiOk ? '防骗稳固' : '建议上老年大学',
      pct: Math.min(100, Math.round((Math.max(state.stats.knowledge, state.stats.numLogic, state.stats.selfCare) / 55) * 100))
    };
  }

  // 61–90岁：晚年抗孤独与 80 岁健康延寿门槛
  if (!state.elderCircle && !(state.relations.partner?.married) && !(state.pet?.alive)) {
    return {
      kicker: '下一关 · 建成活跃老年社交圈（免孤独扣心态）',
      main: `排入「跳广场舞建圈」累计 3 次（当前 ${state.elderCircleProgress || 0}/3）`,
      badge: `进度 ${state.elderCircleProgress || 0}/3`,
      pct: Math.min(100, Math.round(((state.elderCircleProgress || 0) / 3) * 100))
    };
  }
  const reqH = hasHex(state, 'hx_sleep_3') ? 45 : 60;
  return {
    kicker: state.age <= 80 ? `下一关 · 80岁高寿延寿线（需健康 ≥${reqH}）` : '金色加时章 · 冲刺 90 岁圆满终章',
    main: `当前健康 ${state.stats.health}/${reqH} · 环游世界 ${state.worldTrips}/1 站`,
    badge: state.stats.health >= reqH ? '延寿达标' : `健康差 ${reqH - state.stats.health}`,
    pct: Math.min(100, Math.round((state.stats.health / reqH) * 100))
  };
}

// ============================================================================
// 子女代际考学复用引擎（数值独立随机生成，100% 复用同一套 38 季分科与区间算分函数！）
// ============================================================================
export const CHILD_POLICIES = {
  academic: { id: 'academic', name: '学业优先', desc: '约55%精力投入分科学习，全力冲刺重点高中与985/清北' },
  balanced: { id: 'balanced', name: '均衡成长', desc: '约42%精力学习，兼顾身心健康与快乐童年，稳冲一本/985' },
  dream:    { id: 'dream',    name: '特长快乐', desc: '约30%精力保基础文化课，留足空间培养兴趣与高心态' }
};

export function ensureChildExamProfile(state) {
  if (!state?.child) return null;
  const c = state.child;
  if (c.examProfile) return c.examProfile;
  const seed = `${state.examSeed || 12345}-child-${c.bornAge}`;
  // 独立随机抽取孩子的文理天赋初值（17–26 之间，绝不复制父母数值）
  const initLit = 17 + seededInt(`${seed}-lit`, 0, 9);
  const initNum = 17 + seededInt(`${seed}-num`, 0, 9);
  c.examProfile = {
    studentId: `child_${c.bornAge}`,
    examSeed: seededInt(`${seed}-es`, 100000, 999999),
    lit: initLit,
    num: initNum,
    subjects: {
      chn: 20 + seededInt(`${seed}-chn`, 0, 4),
      math: 20 + seededInt(`${seed}-math`, 0, 4),
      eng: 20 + seededInt(`${seed}-eng`, 0, 4),
      art: 20,
      sci: 20
    },
    health: 84,
    mood: 76,
    fatigue: 0,
    policy: c.tierCost >= 100000 ? 'academic' : c.tierCost >= 50000 ? 'balanced' : 'balanced',
    examTrack: initNum >= initLit ? 'sci' : 'art',
    schoolTier: 'normal',
    cursorByAge: {}, // { [kidAge]: completedChildSubTurns (0..3) }
    reports: {}      // { p6, zk, gk }
  };
  return c.examProfile;
}

function makeChildSnap(state, kidAge, kidSub) {
  const ep = ensureChildExamProfile(state);
  const hasSchoolHouse = state.house?.trait === 'school';
  return {
    studentId: ep.studentId,
    examSeed: ep.examSeed,
    age: kidAge,
    subTurn: kidSub,
    originId: 'working',
    lit: ep.lit,
    num: ep.num,
    subjects: ep.subjects,
    health: ep.health,
    mood: state.child.mood ?? ep.mood,
    fatigue: ep.fatigue,
    fatigueLimit: 20,
    examTrack: ep.examTrack,
    schoolTier: ep.schoolTier,
    scholarTier: 0,
    hasSoloHex: false,
    hasStudyBuff: Boolean(hasSchoolHouse), // 学区房直接为孩子激活课堂吸收加成！
    hexExamBonus: 0
  };
}

// 家长每过 1 个子回合，按 floor(3k / N) 游标推进孩子 6–18 岁的 38 个学生子季
export function advanceChildSubTurnCursor(state, parentSubTurn, parentSubTurnsTotal) {
  if (!state?.child) return [];
  const kidAge = state.age - state.child.bornAge;
  if (kidAge < 6 || kidAge > 18) return [];
  const ep = ensureChildExamProfile(state);
  const doneBefore = ep.cursorByAge[kidAge] || 0;
  const targetDone = Math.min(3, Math.floor((3 * parentSubTurn) / Math.max(1, parentSubTurnsTotal)));
  const eventsOut = [];

  const studySlotsMap = { academic: 2.35, balanced: 1.75, dream: 1.25 };
  const paidBudgetPerSub = state.child.tierCost >= 100000 ? 2 : state.child.tierCost >= 50000 ? 1 : 0;

  for (let sub = doneBefore + 1; sub <= targetDone; sub++) {
    ep.cursorByAge[kidAge] = sub;
    if (kidAge === 18 && sub === 3) continue; // 18岁第3季已考完

    // 根据年度策略分配本子季 4 格
    const quota = studySlotsMap[ep.policy] || 1.75;
    const baseStudyCnt = Math.floor(quota) + (seededUnit(`${ep.examSeed}-${kidAge}-${sub}-q`) < (quota % 1) ? 1 : 0);
    let paidLeft = paidBudgetPerSub;

    for (let slot = 0; slot < 4; slot++) {
      const curMood = state.child.mood ?? ep.mood;
      if (slot < baseStudyCnt && curMood >= 30 && ep.fatigue < 18) {
        const fakeStateForPick = {
          age: kidAge, subTurn: sub, examTrack: ep.examTrack,
          statsRaw: { knowledge: ep.lit, numLogic: ep.num },
          stats: { knowledge: ep.lit, numLogic: ep.num },
          subjects: ep.subjects
        };
        const sk = pickRecommendedSubject(fakeStateForPick);
        const snap = makeChildSnap(state, kidAge, sub);
        const usePaid = paidLeft > 0 && ep.subjects[sk] < 85;
        if (usePaid) paidLeft--;
        const r = simulateSubjectStudyStep(snap, sk, { paid: usePaid });
        ep.lit = r.lit;
        ep.num = r.num;
        ep.subjects[sk] = r.newS;
        ep.fatigue = clampVal(ep.fatigue + 1, 0, 100);
        state.child.mood = clampVal((state.child.mood ?? 75) - 1, 20, 100);
      } else {
        // 休息与运动生活格
        ep.health = clampVal(ep.health + 1, 40, 100);
        ep.fatigue = clampVal(ep.fatigue - 3, 0, 100);
        state.child.mood = clampVal((state.child.mood ?? 75) + 2, 20, 100);
      }
    }
    ep.fatigue = clampVal(ep.fatigue - 2, 0, 100);
    state.child.study = Math.round((ep.lit + ep.num) / 2);

    // 检定孩子三大升学节点（12岁第2季小升初、15岁第2季中考、18岁第2季高考）
    if (kidAge === 12 && sub === 2 && !ep.reports.p6) {
      const rep = evaluateExamPaper(makeChildSnap(state, 12, 2), 'p6', 0);
      rep.admitted = rep.finalScore >= 256 ? '重点初中实验班' : '片区普通初中';
      if (rep.finalScore >= 256) ep.schoolTier = 'key_mid';
      ep.reports.p6 = rep;
      eventsOut.push({ kind: 'p6', kidAge, rep, line: `【孩子小升初放榜】总分 ${rep.finalScore}/300 分，升入${rep.admitted}！` });
    }
    if (kidAge === 15 && sub === 2 && !ep.reports.zk) {
      const rep = evaluateExamPaper(makeChildSnap(state, 15, 2), 'zk', 0);
      rep.admitted = rep.finalScore >= 580 ? '省重点高中' : rep.finalScore >= 460 ? '市普通高中' : '艺体特长高中';
      ep.schoolTier = rep.finalScore >= 580 ? 'key_high' : 'normal';
      ep.examTrack = ep.num >= ep.lit ? 'sci' : 'art';
      ep.reports.zk = rep;
      eventsOut.push({ kind: 'zk', kidAge, rep, line: `【孩子15岁中考成绩单】考出 ${rep.finalScore}/660 分，录取【${rep.admitted}】（高中选${ep.examTrack === 'sci' ? '理科' : '文科'}）！` });
    }
    if (kidAge === 18 && sub === 2 && !ep.reports.gk) {
      const rep = evaluateExamPaper(makeChildSnap(state, 18, 2), 'gk', 0);
      rep.admitted = rep.finalScore >= 680 ? '京华/燕园大学' : rep.finalScore >= 620 ? '985重点名校' : rep.finalScore >= 500 ? '主流一本大学' : '高等职业院校';
      ep.reports.gk = rep;
      state.child.universityName = rep.admitted;
      eventsOut.push({ kind: 'gk', kidAge, rep, line: `【孩子18岁高考金榜】考出 ${rep.finalScore}/750 分，正式被【${rep.admitted}】录取！` });
    }
  }
  return eventsOut;
}

// 父母排程「辅导孩子功课」：按父母自身的学识/数理水平给孩子对应方向真实加分！
export function applyParentTutorToChild(state, focus = 'balanced', isFlowDup = false) {
  if (!state?.child) return null;
  const kidAge = state.age - state.child.bornAge;
  const ep = ensureChildExamProfile(state);
  const D = getStageTextbookCap(Math.max(6, Math.min(18, kidAge)), 2);
  const mult = isFlowDup ? 1.8 : 1.0;

  // 父母自身学识/数理 ≥70 提供高学历父母点拨加成（1.35x）！
  const parentLitBoost = state.stats.knowledge >= 75 ? 1.35 : (state.stats.knowledge >= 55 ? 1.15 : 1.0);
  const parentNumBoost = state.stats.numLogic >= 75 ? 1.35 : (state.stats.numLogic >= 55 ? 1.15 : 1.0);

  const actFocus = focus || state.tutorKidFocus || 'balanced';
  if (actFocus === 'lit') {
    ep.lit = Math.min(D, ep.lit + 2.4 * parentLitBoost * mult);
    ep.subjects.chn = Math.min(D, ep.subjects.chn + 4.2 * parentLitBoost * mult);
    ep.subjects.eng = Math.min(D, ep.subjects.eng + 2.8 * parentLitBoost * mult);
    if (kidAge >= 12) ep.subjects.art = Math.min(D, ep.subjects.art + 4.0 * parentLitBoost * mult);
  } else if (actFocus === 'num') {
    ep.num = Math.min(D, ep.num + 2.4 * parentNumBoost * mult);
    ep.subjects.math = Math.min(D, ep.subjects.math + 4.2 * parentNumBoost * mult);
    ep.subjects.eng = Math.min(D, ep.subjects.eng + 2.2 * parentNumBoost * mult);
    if (kidAge >= 12) ep.subjects.sci = Math.min(D, ep.subjects.sci + 4.0 * parentNumBoost * mult);
  } else {
    ep.lit = Math.min(D, ep.lit + 1.5 * parentLitBoost * mult);
    ep.num = Math.min(D, ep.num + 1.5 * parentNumBoost * mult);
    for (const k of ['chn', 'math', 'eng']) {
      ep.subjects[k] = Math.min(D, ep.subjects[k] + 3.0 * ((parentLitBoost + parentNumBoost) / 2) * mult);
    }
  }
  state.child.study = Math.round((ep.lit + ep.num) / 2);
  const tag = actFocus === 'lit' ? '辅导文科' : actFocus === 'num' ? '辅导理科' : '全科辅导';
  return { tag, studyVal: state.child.study };
}

export function getChildExamPreviewSummary(state) {
  if (!state?.child) return null;
  const kidAge = state.age - state.child.bornAge;
  if (kidAge < 6 || kidAge > 18) return null;
  const ep = ensureChildExamProfile(state);
  const stg = kidAge <= 12 ? 'p6' : kidAge <= 15 ? 'zk' : 'gk';
  const paper = evaluateExamPaper(makeChildSnap(state, kidAge, 2), stg, 0);
  const mid = Math.round((paper.minTotal + paper.maxTotal) / 2);
  let examLabel = '小升初';
  let tierLabel = mid >= 256 ? '重点初中苗子' : '稳步成长';
  if (stg === 'zk') {
    examLabel = '中考(660)';
    tierLabel = mid >= 580 ? '稳冲省重点' : mid >= 460 ? '普高稳健' : '特长路线';
  } else if (stg === 'gk') {
    examLabel = '高考(750)';
    tierLabel = mid >= 680 ? '清北苗子' : mid >= 620 ? '985名校线' : mid >= 500 ? '一本稳健' : '专科蓄力';
  }
  return {
    kidAge,
    stg,
    examLabel,
    range: [paper.minTotal, paper.maxTotal],
    tierLabel,
    policy: ep.policy,
    policyName: CHILD_POLICIES[ep.policy]?.name || '均衡成长',
    lit: Math.round(ep.lit),
    num: Math.round(ep.num),
    track: ep.examTrack,
    reports: ep.reports
  };
}
