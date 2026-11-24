// 《这辈子 2.0》Sprint 5 静态配置与数值表
// 含 7 档具象化千禧家庭身世（12% / 16%×5 / 8% = 100%）与 750 分制全国卷大学录取线
// 红线声明：本文件仅含系统机制标签与结构化配置，严禁包含任何 AI 生成的剧情对话正文与系统表情符号。

export const ORIGINS = [
  {
    id: 'poor', name: '乡村务农家', prob: 0.12, cityTier: 3, familyAsset: 50000,
    pocketMoney: 20, eduLimit: 1, downpaySupport: 0, studyAbroadFund: 0,
    initStats: { knowledge: 15, numLogic: 20, expr: 18, selfCare: 35, mood: 75, health: 80 },
    offsets: { knowledge: -5, numLogic: 0, expr: -2, selfCare: 15, mood: 5, health: 0 },
    buff: '早当家（做家务与假期兼职收入 +50%）',
    debuff: '家里指望你（成年后每年寄回年薪 8%，至少 6,000 元）',
    remitRate: 0.08, remitMin: 6000, fatigueLimit: 20, intimacyMult: 1.0,
    talents: [
      { id: 't_early', name: '懂事早熟', desc: '自理 +5，心态受压衰减减半' },
      { id: 't_grit', name: '苦读破局', desc: '数理 +3，日常免费自习更专注' },
      { id: 't_koi', name: '锦鲤附体（稀有）', desc: '彩票头奖概率 ×10，偶尔捡到小运气' }
    ]
  },
  {
    id: 'working', name: '工厂工人家', prob: 0.16, cityTier: 3, familyAsset: 400000,
    pocketMoney: 50, eduLimit: 2, downpaySupport: 100000, studyAbroadFund: 100000,
    initStats: { knowledge: 20, numLogic: 20, expr: 20, selfCare: 22, mood: 72, health: 80 },
    offsets: { knowledge: 0, numLogic: 0, expr: 0, selfCare: 2, mood: 2, health: 0 },
    buff: '大院韧性（心态 <30 时学习与工作惩罚减半）',
    debuff: '白手起家（无额外捷径，靠双手稳扎稳打进阶）',
    remitRate: 0, remitMin: 0, fatigueLimit: 20, intimacyMult: 1.0,
    talents: [
      { id: 't_steady', name: '稳扎稳打', desc: '每年年末心态额外 +2' },
      { id: 't_social', name: '邻里人缘', desc: '表达 +6，初始同桌亲密 +8' },
      { id: 't_health', name: '体格结实', desc: '健康初始 +6，运动回血额外 +1' }
    ]
  },
  {
    id: 'teacher', name: '书香教职工', prob: 0.16, cityTier: 2, familyAsset: 650000,
    pocketMoney: 45, eduLimit: 3, downpaySupport: 150000, studyAbroadFund: 200000,
    initStats: { knowledge: 28, numLogic: 24, expr: 24, selfCare: 18, mood: 68, health: 80 },
    offsets: { knowledge: 8, numLogic: 4, expr: 4, selfCare: -2, mood: -2, health: 0 },
    buff: '家学渊源（专项补习费半价 ¥60，自习偶获父母点拨专项 +1）',
    debuff: '严师家风（小升初/中高考未达重点线时心态额外 -6）',
    remitRate: 0, remitMin: 0, fatigueLimit: 20, intimacyMult: 1.0,
    talents: [
      { id: 't_shelf', name: '书柜寻宝', desc: '学识 +3，语文古诗文专项起步 +6' },
      { id: 't_mathfam', name: '解题家传', desc: '数理 +3，数学解题专项起步 +6' },
      { id: 't_chalk', name: '粉笔字工整', desc: '表达 +5，心态初始 +4' }
    ]
  },
  {
    id: 'merchant', name: '街坊个体户', prob: 0.16, cityTier: 2, familyAsset: 1200000,
    pocketMoney: 150, eduLimit: 3, downpaySupport: 350000, studyAbroadFund: 300000,
    initStats: { knowledge: 17, numLogic: 23, expr: 26, selfCare: 30, mood: 74, health: 80 },
    offsets: { knowledge: -3, numLogic: 3, expr: 6, selfCare: 10, mood: 4, health: 0 },
    buff: '市井算盘（小卖部 9 折、看房议价占优，黄金买卖免手续费）',
    debuff: '放养生长（父母忙于看店，未主动陪伴时亲密衰减略快）',
    remitRate: 0, remitMin: 0, fatigueLimit: 20, intimacyMult: 1.0,
    talents: [
      { id: 't_shopkid', name: '档口小掌柜', desc: '自理理财 +6，6 岁起步零花钱 +300' },
      { id: 't_street', name: '街头社交王', desc: '表达 +6，初始同桌亲密 +8' },
      { id: 't_cashflow', name: '活钱生钱', desc: '数理 +4，假期兼职与副业收入 +15%' }
    ]
  },
  {
    id: 'welloff', name: '机关双职工', prob: 0.16, cityTier: 2, familyAsset: 1600000,
    pocketMoney: 100, eduLimit: 3, downpaySupport: 300000, studyAbroadFund: 500000,
    initStats: { knowledge: 24, numLogic: 22, expr: 24, selfCare: 20, mood: 70, health: 80 },
    offsets: { knowledge: 4, numLogic: 2, expr: 4, selfCare: 0, mood: 0, health: 0 },
    buff: '稳妥托底（大考发挥波动更稳，长尾体制赛道起薪 +8%）',
    debuff: '懂事的期待（大考失利心态额外 -5）',
    remitRate: 0, remitMin: 0, fatigueLimit: 20, intimacyMult: 1.0,
    talents: [
      { id: 't_book', name: '书香熏陶', desc: '学识 +4，童年补习心态消耗 -1' },
      { id: 't_saver', name: '压岁钱管家', desc: '自理理财 +6，6 岁起步零花钱 +500' },
      { id: 't_dream', name: '少年火种', desc: '开局解锁梦想专长起步 +8' }
    ]
  },
  {
    id: 'middle', name: '都市白领家', prob: 0.16, cityTier: 1, familyAsset: 5000000,
    pocketMoney: 300, eduLimit: 6, downpaySupport: 800000, studyAbroadFund: 1500000,
    initStats: { knowledge: 26, numLogic: 27, expr: 28, selfCare: 15, mood: 70, health: 80 },
    offsets: { knowledge: 6, numLogic: 7, expr: 8, selfCare: -5, mood: 0, health: 0 },
    buff: '开阔眼界（梦想专长起步加成，海外留学语言门槛 -5）',
    debuff: '温室效应（抗压阈值更脆，疲劳 ≥15 即扣健康）',
    remitRate: 0, remitMin: 0, fatigueLimit: 15, intimacyMult: 1.0,
    talents: [
      { id: 't_vision', name: '国际视野', desc: '表达 +6，留学语言门槛再 -5' },
      { id: 't_tutor', name: '名师启蒙', desc: '学识 +2，付费补习与项目课费用减半' },
      { id: 't_art', name: '兴趣班达人', desc: '梦想专长初始 +12，心态 +4' }
    ]
  },
  {
    id: 'rich', name: '家族企业家', prob: 0.08, cityTier: 1, familyAsset: 20000000,
    pocketMoney: 1000, eduLimit: 99, downpaySupport: 3000000, studyAbroadFund: 5000000,
    initStats: { knowledge: 25, numLogic: 22, expr: 32, selfCare: 10, mood: 65, health: 80 },
    offsets: { knowledge: 5, numLogic: 2, expr: 12, selfCare: -10, mood: -5, health: 0 },
    buff: '含金汤匙（可全款安家或直通海外名校，创业资金充沛）',
    debuff: '守业之难（疲劳 ≥15 扣健康，挚友/伴侣亲密增速 -20%）',
    remitRate: 0, remitMin: 0, fatigueLimit: 15, intimacyMult: 0.8,
    talents: [
      { id: 't_biz', name: '商业嗅觉', desc: '自理理财 +10，黄金交易免手续费' },
      { id: 't_rebel', name: '独立清醒', desc: '抵消自理短板，自理 +10，数理 +3' },
      { id: 't_koi2', name: '天选之子', desc: '心态 +8，彩票头奖概率 ×10' }
    ]
  }
];

export const CITIES = {
  1: { tier: 1, name: '一线城市（京/沪/广/深）', salaryCoef: 1.0, rentYr: 26400, livingYr: 28800, spouseBaseYr: 108000, commuteLock: 2, extraSlot: 0, houses: [
    { id: 'h1_norm', tier: '普通', price: 500000, grid: 4, label: '一线远郊普通房 (50万 · 4×4网格)' },
    { id: 'h1_mid', tier: '中产', price: 2200000, grid: 6, label: '一线中产改善房 (220万 · 6×6网格)' },
    { id: 'h1_lux', tier: '富豪', price: 5500000, grid: 8, label: '一线核心大平层 (550万 · 8×8网格)' }
  ]},
  2: { tier: 2, name: '二线城市（成/武/杭等）', salaryCoef: 0.8, rentYr: 18000, livingYr: 24000, spouseBaseYr: 72000, commuteLock: 1, extraSlot: 0, houses: [
    { id: 'h2_norm', tier: '普通', price: 400000, grid: 4, label: '二线普通刚需房 (40万 · 4×4网格)' },
    { id: 'h2_mid', tier: '中产', price: 1400000, grid: 6, label: '二线中产学区房 (140万 · 6×6网格)' },
    { id: 'h2_lux', tier: '富豪', price: 3000000, grid: 8, label: '二线滨江大平层 (300万 · 8×8网格)' }
  ]},
  3: { tier: 3, name: '三线城市（地级市/老家）', salaryCoef: 0.6, rentYr: 12000, livingYr: 18000, spouseBaseYr: 54000, commuteLock: 0, extraSlot: 1, houses: [
    { id: 'h3_norm', tier: '普通', price: 300000, grid: 4, label: '三线安居普通房 (30万 · 4×4网格)' },
    { id: 'h3_mid', tier: '中产', price: 900000, grid: 6, label: '三线中产改善房 (90万 · 6×6网格)' },
    { id: 'h3_lux', tier: '富豪', price: 1800000, grid: 8, label: '三线品质大宅 (180万 · 8×8网格)' }
  ]}
};

export const TRACKS = [
  { id: 'burst', name: '高爆发·青春饭型（互联网/金融/销售）', coef: 1.30, capAge: 39, replaceRate: 0.40, layoffRisk: '高（35–42岁 L3以下高危）' },
  { id: 'steady', name: '稳健·大众白领型（工程师/企业/运营）', coef: 1.00, capAge: 45, replaceRate: 0.50, layoffRisk: '中' },
  { id: 'longtail', name: '长尾·越老越吃香型（医生/律师/体制）', coef: 0.90, capAge: 55, replaceRate: 0.65, layoffRisk: '极低（50–65岁可高薪返聘）' }
];

// 750分制全国卷标准四档高校与海外留学线
export const UNIVERSITIES = [
  { id: 'u1', tier: 1, name: '京华大学 / 燕园大学', minScore: 680, sprintScore: 668, baseSalary: 13000, years: 4, note: '第一档顶尖学府（裸分 ≥680，或有冲刺经历特招 ≥668）' },
  { id: 'u2', tier: 2, name: '沪江交大 / 申江 / 钱塘 / 南粤', minScore: 620, baseSalary: 10000, years: 4, note: '第二档 985 名校（需高考分 ≥620，含临床医学本硕博）' },
  { id: 'u3', tier: 3, name: '北上广深普通本科（申城理工/鹏城大学等）', minScore: 500, baseSalary: 7000, years: 4, note: '第三档主流一本/本科（需高考分 ≥500）' },
  { id: 'u4', tier: 4, name: '专科职业院校（3年制早1年工作）', minScore: 0, baseSalary: 5500, years: 3, note: '第四档高职专科，早入职场或专升本逆袭' },
  { id: 'ab1', tier: 3, name: '普通出国留学（澳/英本科 3年）', minScore: 420, cost: 1000000, minExpr: 50, baseSalary: 7500, years: 3, abroad: true, note: '全程 100 万，高考分 ≥420、表达 ≥50' },
  { id: 'ab2', tier: 2, name: '英国名校留学（罗素集团 3年）', minScore: 560, cost: 1500000, minExpr: 60, baseSalary: 10000, years: 3, abroad: true, note: '全程 150 万，高考分 ≥560、表达 ≥60' },
  { id: 'ab3', tier: 1, name: '美国名校留学（Top 30 本科 4年）', minScore: 610, cost: 2600000, minExpr: 70, baseSalary: 12000, years: 4, abroad: true, note: '全程 260 万，高考分 ≥610、表达 ≥70' }
];

export const DREAMS = [
  { id: 'd_esport', name: '01 电竞职业', desc: 'v1.4 已审主线接口：少年反应与战队试训' },
  { id: 'd_hurdle', name: '02 奥运跨栏', desc: 'v1.4 已审主线接口：田径体能与赛场冲刺' },
  { id: 'd_tsinghua', name: '03 清北学术', desc: 'v1.4 已审主线接口：竞赛特招与科研攀登' },
  { id: 'd_singer', name: '11 原创歌手', desc: 'v1.4 已审主线接口：词曲创作与舞台发声' },
  { id: 'd_surgeon', name: '08 外科医生', desc: 'v1.4 已审主线接口：医途规培与无影灯下' }
];

export const SPOUSE_BACKGROUNDS = [
  { id: 'sp_norm', name: '普通背景伴侣', incomeMult: 0.8, desc: '温柔踏实，现实阻力低，情绪陪伴价值高' },
  { id: 'sp_mid', name: '中产背景伴侣', incomeMult: 1.0, desc: '稳定双薪搭档，各项均衡' },
  { id: 'sp_high', name: '高薪背景伴侣', incomeMult: 1.4, desc: '大幅缓解房贷，但工作同样忙碌需经营感情' }
];

export const ERA_TIMELINE = [
  { start: 6, end: 18, name: '童年平稳期', houseGrowth: 0.02, goldBase: 720, finRate: 0.030, hint: '物价平稳，打好学识与数理底子。', houseTrend: 'flat', goldTrend: 'flat' },
  { start: 19, end: 26, name: '新经济红利期', houseGrowth: 0.04, goldBase: 750, finRate: 0.030, hint: '科技与新经济扩招，高爆发赛道起薪溢价 +10%；楼市温和回暖。', houseTrend: 'up', goldTrend: 'flat' },
  { start: 27, end: 34, name: '房产黄金周期', houseGrowth: 0.08, goldBase: 790, finRate: 0.025, hint: '楼市进入强势上行周期，海归起薪溢价收窄；早买房享资产增值。', houseTrend: 'hot', goldTrend: 'up' },
  { start: 35, end: 42, name: '内卷与裁员潮', houseGrowth: 0.00, goldBase: 980, finRate: 0.020, hint: '大厂降本增效，高爆发赛道 35+ 裁员风险飙升；避险资金涌入黄金！', houseTrend: 'down', goldTrend: 'hot' },
  { start: 43, end: 50, name: 'AI 与新科技转型期', houseGrowth: 0.01, goldBase: 1020, finRate: 0.020, hint: '学 AI 工具与管理课享转型红利（数理高更占优）；黄金高位震荡可落袋。', houseTrend: 'flat', goldTrend: 'flat' },
  { start: 51, end: 60, name: '低利率与银发前夜', houseGrowth: 0.01, goldBase: 980, finRate: 0.015, hint: '存款利率走低；长尾赛道迎来高薪返聘窗口，盘点退休金与收租资产。', houseTrend: 'flat', goldTrend: 'up' },
  { start: 61, end: 70, name: '银发消费温和期', houseGrowth: 0.01, goldBase: 1060, finRate: 0.015, hint: '银发旅游与康养活跃，同时老年理财诈骗高发，学识与数理是最强防线。', houseTrend: 'flat', goldTrend: 'up' },
  { start: 71, end: 90, name: '晚年稳态与传承期', houseGrowth: 0.00, goldBase: 1100, finRate: 0.015, hint: '健康成为头号稀缺资源；稳守现金流，享受隔代陪伴与人生回望。', houseTrend: 'flat', goldTrend: 'flat' }
];

export const SUB_STAGES = [
  { id: 's1', min: 6, max: 12, macro: 'child', name: '快乐童年', theme: '玩耍 · 友情 · 家庭 · 启蒙' },
  { id: 's2', min: 13, max: 18, macro: 'child', name: '青春校园', theme: '青春期 · 分科 · 大考 · 梦想' },
  { id: 's3', min: 19, max: 25, macro: 'adult', name: '初入社会', theme: '大学 · 求职 · 租房 · 探索' },
  { id: 's4', min: 26, max: 35, macro: 'adult', name: '人生选择', theme: '事业 · 爱情 · 住房 · 婚育' },
  { id: 's5', min: 36, max: 50, macro: 'adult', name: '中年攻坚', theme: '瓶颈 · 育儿传承 · 自我重塑' },
  { id: 's6', min: 51, max: 65, macro: 'elder', name: '人生转场', theme: '退休准备 · 父母养老 · 重新出发' },
  { id: 's7', min: 66, max: 90, macro: 'elder', name: '晚年生活', theme: '健康 · 陪伴 · 旅行 · 传承' }
];

export const PROMO_REQ = [0, 0, 30, 50, 65, 80]; // 升至 L2/L3/L4/L5 所需专业值
export const LEVEL_MULT = [0, 1.0, 1.3, 1.7, 2.2, 3.0];

// 极简系统节点标签（仅用于灰盒占位验证 1.5 接口门禁与双性别分流，非 AI 剧情正文）
export const APPROVED_SYSTEM_ANCHORS = [
  { id: 'ev_redpacket_6', review_status: 'APPROVED', gender: 'any', priority: 'P1', age: 6, subTurn: 1, title: '[v1.4 已审挂接槽] 6 岁过年红包', summary: '接入 v1.4 已审 6 岁红包正文。选项回流：童年零花钱与早期财商留痕。',
    choices: [
      { label: '自己悄悄攒起来 (+500 零花钱，自理 +2)', effects: { cash: 500, selfCare: 2, exp: 'exp_redpacket_save' } },
      { label: '交给爸妈保管，买点零食分享 (+200 零花钱，父母亲密 +5，心态 +3)', effects: { cash: 200, mood: 3, parentInt: 5, exp: 'exp_redpacket_share' } }
    ]
  },
  { id: 'ev_yoyo_8_m', review_status: 'APPROVED', gender: 'male', priority: 'P1', age: 8, subTurn: 2, title: '[男主线 · 已审挂接槽] 8 岁心爱的红色悠悠球', summary: '接入 v1.4 已审 8 岁悠悠球正文。保留旧物可在中年「蜗居到大宅·空间拼图」上墙激活永久居家 Buff！',
    choices: [
      { label: '花 80 元买下并珍藏（获得童年旧物「8岁悠悠球」，心态 +5）', effects: { cash: -80, mood: 5, item: '8岁悠悠球', exp: 'exp_childhood_toy' } },
      { label: '忍痛省下零花钱（自理 +3，心态 -2）', effects: { selfCare: 3, mood: -2 } }
    ]
  },
  { id: 'ev_doll_8_f', review_status: 'APPROVED', gender: 'female', priority: 'P1', age: 8, subTurn: 2, title: '[女主线 · 差异化人审槽] 8 岁橱窗里的复古芭比娃娃', summary: '双性别体验分流节点：保留「8 岁芭比娃娃」在中年小家上墙与暗线「初心留痕」中等价点亮！',
    choices: [
      { label: '花 80 元买下并珍藏（获得童年旧物「8岁芭比娃娃」，心态 +5）', effects: { cash: -80, mood: 5, item: '8岁芭比娃娃', exp: 'exp_childhood_toy' } },
      { label: '忍痛省下零花钱（自理 +3，心态 -2）', effects: { selfCare: 3, mood: -2 } }
    ]
  },
  { id: 'ev_mid_scam_64', review_status: 'APPROVED', gender: 'any', priority: 'P2', age: 64, subTurn: 2, title: '[系统机制节点] 社区免费领鸡蛋与“高息养老理财”', summary: '检验「学识/数理/理财」与「高亲密子女」双护城河。',
    choices: [
      { label: '用学识与数理常识当场识破（需学识≥55 或数理≥55 或自理≥55，心态 +4）', reqAny: { knowledge: 55, numLogic: 55, selfCare: 55 }, effects: { mood: 4, exp: 'exp_anti_scam' } },
      { label: '打电话问问孩子/老伴意见（子女或伴侣亲密≥60 可成功拦截，亲密 +3）', reqRelation: 60, effects: { mood: 3, exp: 'exp_anti_scam' } },
      { label: '贪图高息投 8 万元进去（大概率踩坑亏掉 6 万，心态 -8）', effects: { cash: -60000, mood: -8 } }
    ]
  }
];
