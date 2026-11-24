// 《这辈子 2.0》Sprint 2 生活陪伴与消费模块
// 包含：跨阶段养宠物系统 + 舞台闪光小彩蛋 + 童年校门口小卖部 + 成年周末实景看房手账
import { CITIES } from './data.js?v=s51';
import { hasHex, getHexInstance, getBondTier } from './hextech.js?v=s51';

function clamp(v, min = 0, max = 100) {
  return Math.max(min, Math.min(max, Math.round(v)));
}

// ===== 1. 跨阶段养宠物系统（直接住进主舞台左下角）=====
export const PET_CATALOG = {
  cat: {
    id: 'cat', species: '小橘猫', defaultName: '橘座', ico: 'petCat',
    lifespan: 15, upkeepYr: 800, keepsake: '橘座的小铃铛',
    sound: '喵呜~', desc: '软萌粘人、抗孤独一流，偶尔在窗台晒太阳叼回小惊喜'
  },
  dog: {
    id: 'dog', species: '小土狗', defaultName: '旺财', ico: 'petDog',
    lifespan: 13, upkeepYr: 1000, keepsake: '旺财的旧项圈',
    sound: '汪汪！', desc: '忠诚活泼、陪你散步锻炼，健康与亲和力加成'
  },
  hamster: {
    id: 'hamster', species: '小仓鼠', defaultName: '团子', ico: 'petHamster',
    lifespan: 5, upkeepYr: 400, keepsake: '团子的小跑轮',
    sound: '吱吱~', desc: '省心好养、半夜嘎吱蹬跑轮，超治愈小桌宠'
  }
};

export function adoptPet(state, petId) {
  const def = PET_CATALOG[petId];
  if (!def) return null;
  state.pet = {
    id: def.id,
    name: def.defaultName,
    species: def.species,
    ico: def.ico,
    adoptedAge: state.age,
    ageYears: 0,
    maxAge: def.lifespan + (hasHex(state, 'hx_duo_warmzen') ? 6 : 0),
    bond: 45,
    pettedThisTurn: 0,
    alive: true
  };
  return state.pet;
}

export function getPetLifeStage(pet) {
  if (!pet || !pet.alive) return null;
  const ratio = pet.ageYears / Math.max(1, pet.maxAge);
  if (ratio < 0.25) return { label: '幼年', scale: 0.86 };
  if (ratio < 0.78) return { label: '成年', scale: 1.0 };
  return { label: '老年', scale: 0.96 };
}

export function interactWithPet(state) {
  if (!state.pet || !state.pet.alive) return null;
  const maxPerTurn = hasHex(state, 'hx_duo_warmzen') ? 2 : 1;
  if ((state.pet.pettedThisTurn || 0) >= maxPerTurn) {
    return { blocked: true, msg: `${state.pet.name}这季已经揉够啦，正在打盹~` };
  }
  state.pet.pettedThisTurn = (state.pet.pettedThisTurn || 0) + 1;
  state.pet.bond = clamp((state.pet.bond || 45) + 5);
  const moodGain = hasHex(state, 'hx_duo_warmzen') ? 3 : 2;
  state.stats.mood = clamp(state.stats.mood + moodGain);
  let extra = '';
  if (state.pet.id === 'dog') {
    state.stats.health = clamp(state.stats.health + 1);
    extra = '，遛狗健康 +1';
  }
  // 28% 概率叼回小惊喜（人情/松弛玩家大福利）
  const surpriseRate = hasHex(state, 'hx_duo_warmzen') ? 0.45 : 0.28;
  if (Math.random() < surpriseRate) {
    const gift = state.age <= 18 ? 45 : 500;
    state.cash += gift;
    extra += `，还叼回小惊喜 +¥${gift}！`;
  }
  const def = PET_CATALOG[state.pet.id] || PET_CATALOG.cat;
  return {
    blocked: false,
    sound: def.sound,
    msg: `摸了摸${state.pet.name}（心态 +${moodGain}${extra}）`
  };
}

export function advancePetYear(state) {
  if (!state.pet || !state.pet.alive) return null;
  const def = PET_CATALOG[state.pet.id] || PET_CATALOG.cat;
  // 若后天获得温情慢旅家，动态延寿 +6 年
  const targetMax = def.lifespan + (hasHex(state, 'hx_duo_warmzen') ? 6 : 0);
  if (state.pet.maxAge < targetMax) state.pet.maxAge = targetMax;

  state.pet.ageYears = (state.pet.ageYears || 0) + 1;
  state.pet.pettedThisTurn = 0;

  // 成年独立后承担小额饲养开销
  let upkeep = 0;
  if (state.age >= state.gradAge) {
    upkeep = def.upkeepYr;
    state.cash -= upkeep;
  }

  if (state.pet.ageYears >= state.pet.maxAge) {
    state.pet.alive = false;
    if (!state.items.includes(def.keepsake)) state.items.push(def.keepsake);
    state.stats.mood = clamp(state.stats.mood - 4);
    return {
      died: true,
      upkeep,
      keepsake: def.keepsake,
      petName: state.pet.name,
      line: `【岁月相伴】${state.pet.name}陪你走过了 ${state.pet.ageYears} 年安详离开，留下了「${def.keepsake}」永存旧物盒`
    };
  }
  return { died: false, upkeep, line: upkeep > 0 ? `宠物「${state.pet.name}」年度口粮：-${upkeep} 元` : null };
}

// ===== 2. 主舞台每季“闪光小彩蛋”（轻探索正反馈）=====
const STAGE_HOTSPOTS = {
  child: [
    { id: 'hs_coin',    ico: 'coin',   label: '沙发缝硬币',   left: 20, bottom: 26, reward: { cash: 35, mood: 1 }, msg: '沙发缝里摸出一枚硬币！零花 +¥35，心态 +1' },
    { id: 'hs_comic',   ico: 'snack',  label: '桌角旧零食',   left: 78, bottom: 25, reward: { mood: 2, fatigue: -1 }, msg: '翻出半包藏起来的零食！心态 +2，疲劳 -1' },
    { id: 'hs_plane',   ico: 'plane',  label: '窗台纸飞机',   left: 76, bottom: 42, reward: { expr: 1, mood: 2 }, msg: '窗台飞来同桌折的纸飞机！表达 +1，心态 +2' },
    { id: 'hs_marble',  ico: 'marble', label: '滚落的弹珠',   left: 22, bottom: 38, reward: { selfCare: 1, mood: 2 }, msg: '柜子底下捡到闪亮玻璃珠！自理 +1，心态 +2' }
  ],
  adult: [
    { id: 'hs_box',     ico: 'box',    label: '门口快递盒',   left: 19, bottom: 26, reward: { mood: 2, cash: 300 }, msg: '拆开朋友寄来的特产/闲置回血！心态 +2，现金 +¥300' },
    { id: 'hs_plant',   ico: 'plant',  label: '缺水的绿萝',   left: 78, bottom: 36, reward: { mood: 2, health: 1 }, msg: '给阳台绿萝浇了水，满屋清香！心态 +2，健康 +1' },
    { id: 'hs_msg',     ico: 'social', label: '微信小红点',   left: 76, bottom: 25, reward: { friendInt: 2, mood: 1 }, msg: '老友发来搞笑段子互相吐槽！亲密 +2，心态 +1' }
  ],
  elder: [
    { id: 'hs_radio',   ico: 'radio',  label: '收音机评书',   left: 20, bottom: 30, reward: { mood: 3, fatigue: -1 }, msg: '听了一段经典老评书，神清气爽！心态 +3，疲劳 -1' },
    { id: 'hs_tea',     ico: 'rest',   label: '阳台暖热茶',   left: 78, bottom: 28, reward: { health: 2, mood: 2 }, msg: '晒太阳抿口热茶，岁月静好！健康 +2，心态 +2' },
    { id: 'hs_note',    ico: 'passbook',label:'抽屉旧票根',   left: 75, bottom: 40, reward: { knowledge: 1, mood: 2 }, msg: '翻出当年旧票根，心里暖洋洋！学识 +1，心态 +2' }
  ]
};

export function getOrRollStageHotspot(state) {
  const key = `${state.age}-${state.subTurn}`;
  if (state.stageHotspot && state.stageHotspot.key === key) {
    return state.stageHotspot;
  }
  const bucket = state.age <= 18 ? 'child' : state.age <= 50 ? 'adult' : 'elder';
  const pool = STAGE_HOTSPOTS[bucket];
  const pick = pool[Math.floor(Math.random() * pool.length)];
  state.stageHotspot = { key, ...pick, claimed: false };
  return state.stageHotspot;
}

export function claimStageHotspot(state) {
  const hs = getOrRollStageHotspot(state);
  if (!hs || hs.claimed) return null;
  hs.claimed = true;
  const r = hs.reward || {};
  if (r.cash) state.cash += r.cash;
  if (r.mood) state.stats.mood = clamp(state.stats.mood + r.mood);
  if (r.health) state.stats.health = clamp(state.stats.health + r.health);
  if (r.fatigue) state.stats.fatigue = clamp(state.stats.fatigue + r.fatigue);
  if (r.knowledge) state.stats.knowledge = clamp(state.stats.knowledge + r.knowledge);
  if (r.expr) state.stats.expr = clamp(state.stats.expr + r.expr);
  if (r.selfCare) state.stats.selfCare = clamp(state.stats.selfCare + r.selfCare);
  if (r.friendInt) state.relations.friend.intimacy = clamp(state.relations.friend.intimacy + r.friendInt);
  return hs;
}

// ===== 3. 童年「校门口小卖部」（6–18 岁零花钱即时快乐池）=====
export const TUCK_CARDS_12 = [
  '01 及时雨·宋江', '02 行者·武松', '03 豹子头·林冲', '04 花和尚·鲁智深',
  '05 黑旋风·李逵', '06 小李广·花荣', '07 智多星·吴用', '08 玉麒麟·卢俊义',
  '09 入云龙·公孙胜', '10 一丈青·扈三娘', '11 浪子·燕青', '12 鼓上蚤·时迁'
];

export const TUCK_GOODS = [
  { id: 'tg_4wd',    name: '旋风四驱车',   cost: 65, ico: 'car4wd', item: '旋风四驱车',   desc: '入驻旧物盒：每次运动/追梦心态额外 +1' },
  { id: 'tg_book',   name: '贴纸手账本',   cost: 45, ico: 'combo',  item: '贴纸手账本',   desc: '入驻旧物盒：每次触发排程 Combo 心态额外 +1' },
  { id: 'tg_comic',  name: '口袋漫画书',   cost: 50, ico: 'study',  item: '口袋漫画书',   desc: '入驻旧物盒：立得心态 +4，自习心情更稳' },
  { id: 'tg_marble', name: '玻璃弹珠罐',   cost: 35, ico: 'marble', item: '玻璃弹珠罐',   desc: '入驻旧物盒：和同桌玩耍亲密额外 +1' }
];

export function drawSnackCard(state) {
  const disc = getBondTier(state, 'wealth') >= 2 ? 0.9 : 1.0;
  const price = Math.round(15 * disc);
  if (state.cash < price) return { ok: false, msg: `零花钱不足 ¥${price}` };
  state.cash -= price;
  state.stats.mood = clamp(state.stats.mood + 1);
  if (!Array.isArray(state.snackCards)) state.snackCards = [];

  // 略微倾向抽未收集的新卡，降低挫败感
  const unowned = TUCK_CARDS_12.filter(c => !state.snackCards.includes(c));
  let picked;
  if (unowned.length && Math.random() < 0.65) {
    picked = unowned[Math.floor(Math.random() * unowned.length)];
  } else {
    picked = TUCK_CARDS_12[Math.floor(Math.random() * TUCK_CARDS_12.length)];
  }

  const isNew = !state.snackCards.includes(picked);
  let milestoneMsg = '';
  if (isNew) {
    state.snackCards.push(picked);
    const cnt = state.snackCards.length;
    if (cnt === 4 || cnt === 8 || cnt === 12) {
      const reward = cnt === 4 ? 120 : cnt === 8 ? 300 : 600;
      state.cash += reward;
      state.hexRerollTickets = (state.hexRerollTickets || 0) + 1;
      milestoneMsg = ` · 集齐 ${cnt}/12 张水浒卡！获现金 +¥${reward} + 命运重随券 +1！`;
    }
  } else {
    state.cash += 5; // 重复卡换零花
  }
  return {
    ok: true,
    isNew,
    card: picked,
    msg: isNew
      ? `咔嚓拆包！抽到新卡【${picked}】（${state.snackCards.length}/12）！${milestoneMsg}`
      : `抽到重复卡【${picked}】，跟同学换回 ¥5（心态 +1）`
  };
}

export function buyTuckGood(state, goodId) {
  const g = TUCK_GOODS.find(x => x.id === goodId);
  if (!g) return { ok: false, msg: '商品不存在' };
  if (state.items.includes(g.item)) return { ok: false, msg: '已经珍藏在木格旧物盒里啦' };
  const disc = getBondTier(state, 'wealth') >= 2 ? 0.9 : 1.0;
  const price = Math.round(g.cost * disc);
  if (state.cash < price) return { ok: false, msg: `零花钱不足 ¥${price}` };
  state.cash -= price;
  state.items.push(g.item);
  state.stats.mood = clamp(state.stats.mood + (g.id === 'tg_comic' ? 4 : 2));
  return { ok: true, msg: `买下「${g.name}」收进木格旧物盒！` };
}

export function buyTuckGift(state, target) {
  if (state.tuckGiftThisTurn) return { ok: false, msg: '本季已经送过小礼物啦' };
  const price = 30;
  if (state.cash < price) return { ok: false, msg: `零花钱不足 ¥${price}` };
  state.cash -= price;
  state.tuckGiftThisTurn = true;
  state.stats.mood = clamp(state.stats.mood + 2);
  if (target === 'friend') {
    state.relations.friend.intimacy = clamp(state.relations.friend.intimacy + 4);
    return { ok: true, msg: '请同桌吃了大白兔和冰棍！同桌亲密 +4，心态 +2' };
  }
  state.relations.parents.intimacy = clamp(state.relations.parents.intimacy + 4);
  return { ok: true, msg: '给爸妈带回一袋热乎板栗！父母亲密 +4，心态 +2' };
}

// ===== 4. 成年「周末实景看房手账」（动态 3 套特色房源）=====
const LISTING_TEMPLATES = [
  {
    key: 'sunpan', tierIdx: 0, badge: '急售笋盘', nameSuffix: '业主急售·笋盘刚需房',
    priceMult: 0.86, perk: '限时本季 86 折抄底！性价比之王',
    trait: 'bargain'
  },
  {
    key: 'school', tierIdx: 0, badge: '学区老破小', nameSuffix: '老破小·重点学区房',
    priceMult: 0.92, perk: '便宜 8%，若有娃每年学业额外 +3',
    trait: 'school'
  },
  {
    key: 'metro', tierIdx: 0, badge: '地铁口好房', nameSuffix: '地铁口·阳光两居',
    priceMult: 1.06, perk: '零远郊通勤烦恼！彻底免除通勤锁格',
    trait: 'no_commute'
  },
  {
    key: 'improve', tierIdx: 1, badge: '品质三居', nameSuffix: '公园旁·中产改善三居',
    priceMult: 0.98, perk: '6×6 宽敞拼图空间，全家居住舒心',
    trait: 'balanced'
  },
  {
    key: 'terrace', tierIdx: 1, badge: '顶楼露台', nameSuffix: '带露台·阳光改善房',
    priceMult: 0.91, perk: '折价 9%，适合养花养宠，居家休息心态额外 +1',
    trait: 'terrace'
  },
  {
    key: 'luxury', tierIdx: 2, badge: '核心大宅', nameSuffix: '滨江/核心·大平层',
    priceMult: 0.96, perk: '8×8 顶级空间，每次休息额外回心态 +2',
    trait: 'luxury'
  }
];

function buildListingFromTpl(city, tpl, state) {
  const baseH = city.houses[tpl.tierIdx] || city.houses[0];
  let hexDisc = 1.0;
  if (hasHex(state, 'hx_bargain_hunter')) hexDisc -= 0.12;
  if (hasHex(state, 'hx_duo_referral')) {
    let vip = 0;
    if (state.relations.parents.intimacy >= 70) vip++;
    if (state.relations.friend.intimacy >= 70) vip++;
    if (state.relations.partner && state.relations.partner.intimacy >= 70) vip++;
    hexDisc -= vip * 0.03;
  }
  hexDisc = Math.max(0.72, hexDisc);
  const price = Math.round(baseH.price * tpl.priceMult * hexDisc / 1000) * 1000;
  const pb = getHexInstance(state, 'hx_piggybank');
  const pbCut = pb ? pb.stacks * 4000 : 0;
  const dp = Math.max(10000, Math.round(price * 0.3) - pbCut);
  return {
    id: `${baseH.id}_${tpl.key}`,
    baseId: baseH.id,
    tier: baseH.tier,
    grid: baseH.grid,
    badge: tpl.badge,
    name: `${city.name.slice(0, 2)} · ${tpl.nameSuffix}`,
    perk: tpl.perk,
    trait: tpl.trait,
    price,
    dp,
    pbCut
  };
}

export function getOrRollHouseListings(state, force = false) {
  const key = `${state.age}-${state.subTurn}-${state.cityTier}`;
  if (!force && state.houseListings && state.houseListings.key === key) {
    return state.houseListings.items;
  }
  const city = CITIES[state.cityTier];
  const picks = [];
  // 必出 1 套刚需（有笋盘猎手必出急售笋盘）+ 1 套中产改善 + 1 套随机特色（含大宅或地铁口）
  const lowPool = LISTING_TEMPLATES.filter(t => t.tierIdx === 0);
  const first = hasHex(state, 'hx_bargain_hunter')
    ? lowPool[0]
    : lowPool[Math.floor(Math.random() * lowPool.length)];
  picks.push(first);

  const midPool = LISTING_TEMPLATES.filter(t => t.tierIdx === 1);
  picks.push(midPool[Math.floor(Math.random() * midPool.length)]);

  const restPool = LISTING_TEMPLATES.filter(t => !picks.includes(t));
  picks.push(restPool[Math.floor(Math.random() * restPool.length)]);

  const items = picks.map(tpl => buildListingFromTpl(city, tpl, state));
  state.houseListings = { key, items };
  return items;
}
