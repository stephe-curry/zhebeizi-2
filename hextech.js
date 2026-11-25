// 《这辈子 2.0》命运海克斯 V4 —— 7 节点人生词条构筑系统（含 5 张追梦专属命定卡 + 全卡大白话五层信息 + 详情举例）
// 严格遵循纯中文无表情符号与直白可读规范。

export const HEX_NODES = [6, 12, 18, 22, 30, 40, 55];

export const HEX_NODE_META = {
  6:  { title: '6 岁 · 童年启蒙觉醒', sub: '选一张命运卡陪伴长大，这辈子一直有效', weights: { silver: 0.78, gold: 0.22, prism: 0.00 } },
  12: { title: '12 岁 · 少年初长觉醒', sub: '青春期方向渐显，升级卡开始出现', weights: { silver: 0.50, gold: 0.50, prism: 0.00 } },
  18: { title: '18 岁 · 成人礼命运觉醒', sub: '首次解锁珍珠棱彩卡，改写人生走向', weights: { silver: 0.00, gold: 0.68, prism: 0.32 } },
  22: { title: '22 岁 · 毕业入世觉醒', sub: '步入社会，两派合一卡与追梦专属卡登场', weights: { silver: 0.00, gold: 0.70, prism: 0.30 } },
  30: { title: '30 岁 · 而立之年觉醒', sub: '事业安家定型期，高概率刷出高阶好卡', weights: { silver: 0.00, gold: 0.55, prism: 0.45 } },
  40: { title: '40 岁 · 不惑破局觉醒', sub: '稳住家庭与健康，终极升级与棱彩高发', weights: { silver: 0.00, gold: 0.38, prism: 0.62 } },
  55: { title: '55 岁 · 金色晚年觉醒', sub: '收官强化，冲刺圆满无憾的下半生', weights: { silver: 0.00, gold: 0.45, prism: 0.55 } }
};

export const HEX_BONDS = {
  scholar: {
    id: 'scholar', name: '学霸内卷', short: '内卷', ico: 'study',
    color: '#60a5fa', bg: '#e6f0fb',
    t2: '心情低落时，学习和训练不再减半',
    t4: '能力上 85 后不用双倍苦练，大考/升职少看 1 项附加条件'
  },
  wealth: {
    id: 'wealth', name: '资本财富', short: '财富', ico: 'gold',
    color: '#fbbf24', bg: '#fbf1d6',
    t2: '存款利息每年多 1.5%，花钱办事打 9 折',
    t4: '年底多拿 4% 存款分红，买卖房和黄金免手续费'
  },
  warmth: {
    id: 'warmth', name: '烟火人情', short: '人情', ico: 'heart',
    color: '#f472b6', bg: '#fbe9ef',
    t2: '和亲友感情升温快 30%，忙起来也不会疏远',
    t4: '亲友每年能帮衬 2 次，遇到裁员低谷帮你扛一半损失'
  },
  zen: {
    id: 'zen', name: '松弛养生', short: '松弛', ico: 'life',
    color: '#4ade80', bg: '#e4f4eb',
    t2: '每季自动多消 2 点疲劳，身体更能扛',
    t4: '老了健康掉得慢一半，运动休息常有意外成长'
  },
  luck: {
    id: 'luck', name: '奇遇赌徒', short: '奇遇', ico: 'spark',
    color: '#c084fc', bg: '#f5e8f7',
    t2: '每季多出 1 张限定贴纸，小游戏奖励更高',
    t4: '每季自动加心情，抽奖和奇遇稳赚不赔'
  },
  dream: {
    id: 'dream', name: '赤子追梦', short: '追梦', ico: 'dream',
    color: '#fb923c', bg: '#faebe2',
    t2: '练梦想进度快一半，而且不累人',
    t4: '成年后不限追梦数量，梦想练得越高工资也跟着涨'
  }
};

export const HEX_BOND_ORDER = ['dream', 'scholar', 'wealth', 'warmth', 'zen', 'luck'];

// 41 张完整海克斯卡（36 张经典卡全面白话化 + 5 张立志追梦专属命定卡）
export const HEX_CARDS = [
  // ===== 1. 越用越强（成长型）=====
  {
    id: 'hx_piggybank', name: '存钱罐滚雪球', tier: 'silver', kind: 'scaling', kindLabel: '越用越强', maxStacks: 15,
    bonds: ['wealth'], minAge: 6, maxAge: 22, ico: 'piggy',
    big: '首付立减', unit: '最高省 ¥6万',
    rule: '每做 1 次家务或兼职攒 1 格<br>以后买房每格少付 ¥4,000 首付',
    detail: '每次做家务、兼职、加班都会记 1 格（最多 15 格）。每格让存款年息多 0.1%，将来买房首付直接减免 ¥4,000 × 格数。',
    example: '攒满 15 格 → 买房首付直接少掏 ¥60,000',
    fit: '打算靠自己双手攒首付买房的你',
    desc: '每次家务/兼职/加班 +1 格（满 15 格），买房首付每格直减 ¥4,000。'
  },
  {
    id: 'hx_errbook', name: '错题本', tier: 'silver', kind: 'scaling', kindLabel: '越用越强', maxStacks: 10,
    bonds: ['scholar'], minAge: 6, maxAge: 30, ico: 'study',
    big: '越挫越强', unit: '',
    rule: '每吃一次亏记 1 笔<br>以后学习和练梦想更容易翻倍',
    detail: '累过头、心情跌谷底、追梦惜败或被裁员都会记 1 笔（最多 10 笔）。每笔让学习、练专业和练梦想多 8% 的机会获得双倍成长。',
    example: '记满 5 笔 → 每次学习或练梦想有 40% 机会收益翻倍',
    fit: '不怕摔跤、想靠复盘逆袭的你',
    desc: '每次受挫或惜败 +1 格，每格令学习与追梦多 8% 机会双倍成长。'
  },
  {
    id: 'hx_collector', name: '旧物收藏家', tier: 'gold', kindLabel: '越用越强', kind: 'scaling', maxStacks: 5,
    bonds: ['warmth', 'luck'], minAge: 12, maxAge: 55, ico: 'film',
    big: '每季回心情', unit: '最高 +5',
    rule: '留下的老物件和照片越多<br>每季心情自动越好',
    detail: '纪念册每满 2 张照片、或多宝格每多 1 件旧物藏品，每季自动恢复 1 点心态（最高每季自动 +5）。',
    example: '攒了 3 件旧物 + 4 张照片 → 每季啥也不干心态自动 +5',
    fit: '喜欢收集小卖部玩具、拍照留念的你',
    desc: '相册照片与旧物越多，每季自动恢复心态（最高 +5/季）。'
  },
  {
    id: 'hx_combo_book', name: '搭配手账本', tier: 'gold', kindLabel: '越用越强', kind: 'scaling', maxStacks: 4,
    bonds: ['scholar', 'luck'], minAge: 6, maxAge: 40, ico: 'combo',
    big: '白送限定卡', unit: '每凑 4 次搭配',
    rule: '排程凑出 4 次组合搭配<br>下季多送 1 张高收益金边贴纸',
    detail: '每次在排程里触发生活搭配（Combo）就记 1 格；满 4 格清空，立刻心态 +3，并在下一季额外送你 1 张平时刷不到的限定金边贴纸。',
    example: '凑满 4 次搭配 → 心态 +3，下季多一张强力金边贴纸',
    fit: '喜欢研究排程贴纸组合的你',
    desc: '每触发 4 次排程搭配，心态 +3 并额外送 1 张限定金边贴纸。'
  },

  // ===== 2. 会升级（1→2→3 阶进化链）=====
  {
    id: 'hx_shop_1', name: '小卖部算盘', tier: 'silver', kind: 'evo', kindLabel: '会升级 1/3', evoChain: 'shop', evoStage: 1,
    evoNames: ['小卖部', '代购王', '商业教父'],
    bonds: ['wealth'], minAge: 6, maxAge: 18, ico: 'coin',
    big: '零花多赚一半', unit: '',
    rule: '童年做家务兼职多拿 50% 钱<br>以后还能升级成代购王',
    detail: '18 岁前做家务、假期兼职多赚 50%，练自理每次多 +1。选了它，后面的觉醒节点高概率刷出第 2 级「校园代购王」，而且升级不占新槽位。',
    example: '兼职原本拿 ¥100 → 现在拿 ¥150，还能继续升级',
    fit: '想从小攒钱走商业路线的你',
    desc: '童年家务兼职收入 +50%，自理多 +1，后续可升级。'
  },
  {
    id: 'hx_shop_2', name: '校园代购王', tier: 'gold', kind: 'evo', kindLabel: '会升级 2/3', evoChain: 'shop', evoStage: 2, reqEvo: 'hx_shop_1',
    evoNames: ['小卖部', '代购王', '商业教父'],
    bonds: ['wealth', 'luck'], minAge: 12, maxAge: 30, ico: 'bag',
    big: '副业 +60%', unit: '每季分红',
    rule: '每季还自动到账一笔零花分红<br>30 岁后能升成商业教父',
    detail: '直接升级替换原卡。所有兼职、加班、副业收入 +60%，并且每季自动发一笔外快（学生 ¥600/季，成年 ¥2,400/季）。',
    example: '成年一年 4 季 → 光自动分红每年就白拿 ¥9,600',
    fit: '已经选了「小卖部算盘」、想越滚越富的你',
    desc: '副业行动收入 +60%，每季自动到账一笔副业分红。'
  },
  {
    id: 'hx_shop_3', name: '商业教父', tier: 'prism', kind: 'evo', kindLabel: '满级形态 3/3', evoChain: 'shop', evoStage: 3, reqEvo: 'hx_shop_2',
    evoNames: ['小卖部', '代购王', '商业教父'],
    bonds: ['wealth', 'luck'], minAge: 30, maxAge: 55, ico: 'trophy',
    big: '年薪 +22%', unit: '+ 5% 年底分红',
    rule: '工资和副业全面暴涨<br>买卖房产和黄金全免手续费',
    detail: '商业线终极形态！每月工资高出 22%，每年底手头现金额外生出 5% 投资红利，卖房免除 2% 税费，买卖黄金零差价。',
    example: '手头有 ¥100 万现金 → 年底光这卡就多送 ¥50,000',
    fit: '冲击千万净资产与大平层的你',
    desc: '工资 +22%，年底现金享 5% 分红，房产黄金免手续费。'
  },

  {
    id: 'hx_pop_1', name: '同桌好人缘', tier: 'silver', kind: 'evo', kindLabel: '会升级 1/3', evoChain: 'pop', evoStage: 1,
    evoNames: ['好人缘', '人气王', '半城挚友'],
    bonds: ['warmth'], minAge: 6, maxAge: 18, ico: 'social',
    big: '交友更快', unit: '表达 +1',
    rule: '找同桌老友玩感情升温更快<br>顺带练好口才，后续可升级',
    detail: '每次找同桌或朋友玩，亲密度额外多 +2，口才表达额外多 +1。后续觉醒可升级为「社团人气王」。',
    example: '找同桌玩 5 次 → 比别人多拿 10 点亲密和 5 点表达',
    fit: '重视友情、需要高表达走歌手或留学线的你',
    desc: '和朋友互动亲密多 +2、表达多 +1，后续可升级。'
  },
  {
    id: 'hx_pop_2', name: '社团人气王', tier: 'gold', kind: 'evo', kindLabel: '会升级 2/3', evoChain: 'pop', evoStage: 2, reqEvo: 'hx_pop_1',
    evoNames: ['好人缘', '人气王', '半城挚友'],
    bonds: ['warmth'], minAge: 18, maxAge: 40, ico: 'heart',
    big: '感情增速 +50%', unit: '',
    rule: '父母、挚友、伴侣每年自动升温<br>追梦遇冷场还有朋友捧场',
    detail: '所有亲友、伴侣亲密度涨速快一半，每年年底全员亲密度还自动 +2；追梦遇到票房或时间冲突时能解锁朋友捧场破局。',
    example: '哪怕一年忙工作没空约人，年底全员感情也只涨不跌',
    fit: '想轻松拿下高亲密婚姻与追梦人脉的你',
    desc: '全员亲密获取 +50%，每年底全员亲密自动 +2。'
  },
  {
    id: 'hx_pop_3', name: '半城皆挚友', tier: 'prism', kind: 'evo', kindLabel: '满级形态 3/3', evoChain: 'pop', evoStage: 3, reqEvo: 'hx_pop_2',
    evoNames: ['好人缘', '人气王', '半城挚友'],
    bonds: ['warmth', 'luck'], minAge: 30, maxAge: 55, ico: 'spark',
    big: '遇难有人扛', unit: '损失减半',
    rule: '身边所有人永远不会疏远<br>碰到裁员亏钱有老友出手兜底',
    detail: '人情线满级！所有关系亲密翻倍增长且永不冷淡；一旦遭遇中年裁员或意外破财，老朋友自动帮你分担一半现金损失。',
    example: '大厂裁员原本要亏 ¥60,000 → 老友帮忙过渡只亏 ¥30,000',
    fit: '走高风险赛道、想要稳稳人脉安全网的你',
    desc: '亲友永不疏远且增速翻倍，遭遇损失减免一半。'
  },

  {
    id: 'hx_sleep_1', name: '早睡好习惯', tier: 'silver', kind: 'evo', kindLabel: '会升级 1/3', evoChain: 'sleep', evoStage: 1,
    evoNames: ['早睡', '体能派', '不老松'],
    bonds: ['zen'], minAge: 6, maxAge: 18, ico: 'zzz',
    big: '休息回健康', unit: '每季少累 1 点',
    rule: '每季自然多消 1 点疲劳<br>睡懒觉还能顺手补回健康',
    detail: '每季结算自动多减 1 点疲劳，每次选「完整休息」额外恢复 1 点健康。后续可升级为「自律体能派」。',
    example: '别人休息只回心情，你休息连健康一起补回来',
    fit: '准备高强度读书或练体育、怕累垮身体的你',
    desc: '每季自然多消 1 点疲劳，休息额外回 1 点健康。'
  },
  {
    id: 'hx_sleep_2', name: '自律体能派', tier: 'gold', kind: 'evo', kindLabel: '会升级 2/3', evoChain: 'sleep', evoStage: 2, reqEvo: 'hx_sleep_1',
    evoNames: ['早睡', '体能派', '不老松'],
    bonds: ['zen'], minAge: 18, maxAge: 40, ico: 'exercise',
    big: '运动效果翻倍', unit: '',
    rule: '锻炼一次顶两次，心情也大好<br>疲劳上限放宽 5 点不怕透支',
    detail: '体育锻炼和太极加的健康直接翻倍，还多加 2 点心情；你的疲劳警戒线比别人高 5 点，加班冲刺更不容易生病。',
    example: '锻炼一次原本健康 +2 → 现在健康 +4、心情 +3',
    fit: '追逐奥运田径梦想、或者在一线城市拼命打拼的你',
    desc: '运动健康翻倍且多加心情，疲劳红线放宽 5 点。'
  },
  {
    id: 'hx_sleep_3', name: '百岁不老松', tier: 'prism', kind: 'evo', kindLabel: '满级形态 3/3', evoChain: 'sleep', evoStage: 3, reqEvo: 'hx_sleep_2',
    evoNames: ['早睡', '体能派', '不老松'],
    bonds: ['zen'], minAge: 40, maxAge: 55, ico: 'life',
    big: '环游世界赚钱', unit: '+¥5万 / 站',
    rule: '50 岁后衰老慢一半，轻松活到 90<br>每次出国旅行还能赚回 ¥5 万稿费',
    detail: '养生线满级！50 岁后自然衰老扣健康减半，80 岁延寿门槛降到健康 45 即可；退休后每次「环游世界」发游记反赚 ¥5 万稿费！',
    example: '花 ¥8 万环游世界 → 回来收 ¥5 万稿费，净花 ¥3 万玩遍全球',
    fit: '想稳拿 90 岁高寿善始善终与环游世界圆满结局的你',
    desc: '50岁后衰老减半，环游世界每站反赚 ¥5 万稿费。'
  },

  // ===== 3. 先苦后甜（延迟兑现）=====
  {
    id: 'hx_winter_study', name: '寒窗苦读', tier: 'gold', kind: 'delayed', kindLabel: '先苦后甜', delayTurns: 6,
    bonds: ['scholar'], minAge: 12, maxAge: 18, ico: 'lamp',
    big: '学识暴涨 +10', unit: '6 季后到账',
    rule: '忍耐 6 个季度少贪玩<br>期满直接加 10 点学识和高考分',
    detail: '接下来 6 个季度里，找人玩和休息加的心情减半；只要熬过这 6 季，立刻一次性暴涨 10 点学识，高考额外再加 2 分！',
    example: '15 岁选它 → 17 岁正好兑现，高考直接冲刺清北名校线',
    fit: '12 岁或 18 岁前想冲顶尖名校的你',
    desc: '忍耐 6 季娱乐心情减半，期满爆发学识 +10、高考 +2 分。'
  },
  {
    id: 'hx_ten_years', name: '三年定投翻倍', tier: 'gold', kind: 'delayed', kindLabel: '先苦后甜', delayYears: 3,
    bonds: ['wealth'], minAge: 18, maxAge: 30, ico: 'passbook',
    big: '本金变 2.2 倍', unit: '3 年后返还',
    rule: '每年底帮你强制存下两成现金<br>满 3 年连本带利翻倍拿回',
    detail: '接下来 3 年每年底自动扣存手头 20% 现金；第 3 年底一次性返还总存钱数的 2.2 倍，外送 1 张命运重随券！',
    example: '3 年一共存进 ¥15 万 → 期满直接拿回 ¥33 万 + 重随券',
    fit: '管不住手、想在 25–30 岁攒出一大笔买房首付的你',
    desc: '连存 3 年 20% 现金，期满返还 2.2 倍并送重随券。'
  },
  {
    id: 'hx_tier1_bet', name: '留在大城赌一把', tier: 'gold', kind: 'delayed', kindLabel: '先苦后甜', delayYears: 3,
    bonds: ['scholar', 'wealth'], minAge: 22, maxAge: 22, ico: 'sprint',
    big: '3 年后升职', unit: '+ ¥6 万奖金',
    rule: '条件：3 年内咬牙留在北上广深<br>这期间房租会贵一半',
    detail: '毕业前 3 年房租变成 1.5 倍；只要坚持留在一线城市不换城满 3 年，免考核直接升 1 级职位，并拿 ¥6 万安家奖金！',
    example: '22 岁选它 → 25 岁直接升职加薪，还白拿 ¥60,000 奖金',
    fit: '刚毕业选择留在一线城市闯荡的你',
    desc: '前 3 年房租贵一半，不换城满 3 年直接升 1 级并奖 ¥6 万。'
  },

  // ===== 4. 有得有失（棱彩取舍）=====
  {
    id: 'hx_minimalist', name: '极简生活', tier: 'prism', kind: 'curse', kindLabel: '有得有失',
    bonds: ['zen', 'wealth'], minAge: 18, maxAge: 40, ico: 'life',
    big: '多 1 格时间', unit: '每年省下杂费',
    rule: '每年两季多出 1 格排程自由安排<br>日常 18% 杂项花销直接清零',
    costText: '不能买车、不能用情绪买单',
    detail: '每年第 1、3 季度排程各多 1 个格子，且成年后每年扣掉年收入 18% 的隐性杂费直接免除！代价是这辈子不能买车、不能点情绪消费。',
    example: '年薪 ¥20 万 → 每年多省 ¥3.6 万，还比别人多做两件事',
    fit: '不爱乱花钱、想要大把自由时间和存款的你',
    desc: '免除 18% 生活杂费且每年多 2 格时间；代价是不能买车与情绪买单。'
  },
  {
    id: 'hx_flow_engine', name: '死磕到底', tier: 'prism', kind: 'curse', kindLabel: '有得有失',
    bonds: ['scholar', 'dream'], minAge: 18, maxAge: 40, ico: 'fire',
    big: '同款卡翻倍', unit: '第 2 张双倍收益',
    rule: '同一季连排两张一样的学习或追梦<br>第 2 张效果直接翻倍还不掉心情',
    costText: '触发时本季多加 2 点疲劳',
    detail: '同一季排进 2 张相同的行动贴纸时，第 2 张成长或收入直接翻倍且不扣心情；代价是身体多承受 2 点疲劳。',
    example: '一季连排两次练梦想 → 第二次拿双倍进度，冲刺极快',
    fit: '目标明确、想在短期内把专业或梦想冲满的你',
    desc: '同季排 2 张同款贴纸时第 2 张收益翻倍；代价是疲劳 +2。'
  },
  {
    id: 'hx_solo_genius', name: '独处奇才', tier: 'prism', kind: 'curse', kindLabel: '有得有失',
    bonds: ['scholar', 'zen'], minAge: 18, maxAge: 40, ico: 'bulb',
    big: '独处成长 +50%', unit: '',
    rule: '自己看书、练梦想、休息效果大增<br>一个人待着反而进步神速',
    costText: '成年后不能约老友、不能去小酒馆',
    detail: '所有一个人的行动（自习、专业自学、练梦想、休息）成长收益提高 50%！代价是成年后不能点「约老友重聚」和「去小酒馆」。',
    example: '练专业原本 +2 → 现在每次稳拿 +3，升职考试飞快',
    fit: '走独立独身路线或专心搞学术追梦的你',
    desc: '自习/自学/追梦成长 +50%；代价是禁用约老友与小酒馆。'
  },
  {
    id: 'hx_wind_pig', name: '顺风翻盘客', tier: 'prism', kind: 'curse', kindLabel: '有得有失',
    bonds: ['wealth', 'luck'], minAge: 22, maxAge: 40, ico: 'gold',
    big: '房子黄金多涨', unit: '牛市每年 +4%',
    rule: '行情上涨的年份资产涨得更猛<br>抓住一波风口就能身家倍增',
    costText: '若遇裁员破财，损失也会多 30%',
    detail: '在楼市或黄金上涨的时代周期里，每年额外多涨 4%！但遇到裁员或负面破财事件时，现金损失也会放大 30%。',
    example: '¥200 万的房赶上黄金周期 → 每年比别人多涨 ¥80,000',
    fit: '打算早买房或囤黄金吃时代红利的你',
    desc: '房产黄金上涨期每年多涨 4%；代价是裁员破财损失 +30%。'
  },

  // ===== 5. 两派合一（双重融合卡）=====
  {
    id: 'hx_duo_ip', name: '知识变副业', tier: 'prism', kind: 'duo', kindLabel: '两派合一', reqBonds: ['scholar', 'wealth'],
    bonds: ['scholar', 'wealth'], minAge: 22, maxAge: 55, ico: 'bulb',
    big: '每年睡后稿费', unit: '读书越多越赚',
    rule: '把肚子里的学问变成咨询和版权<br>每年底自动到账一笔外快',
    detail: '你的「学识 + 专业」总和每满 20 点，每年年底就自动收到 ¥12,000 稿费与咨询分红，不用花时间额外打工。',
    example: '学识 70 + 专业 50（共120）→ 每年底白拿 ¥72,000 分红',
    fit: '学识和专业双高、想优雅躺赚的你',
    desc: '学识与专业之和每满 20 点，每年底自动拿 ¥1.2 万分红。'
  },
  {
    id: 'hx_duo_chill', name: '松弛有好运', tier: 'prism', kind: 'duo', kindLabel: '两派合一', reqBonds: ['zen', 'luck'],
    bonds: ['zen', 'luck'], minAge: 22, maxAge: 55, ico: 'spark',
    big: '躺平涨能力', unit: '还捡零花钱',
    rule: '一季里排满两次休息或运动<br>必得灵光一现涨能力外加小横财',
    detail: '只要同一季里安排至少 2 格休息、运动或太极，回合结束必定触发好运：随机一项能力 +2、心态 +2，还白捡一笔红包外快。',
    example: '不加班纯休息两格 → 能力照样 +2，成年每次还捡 ¥2,500',
    fit: '不想苦哈哈内卷、喜欢松弛养生过日子的你',
    desc: '单季排 ≥2 格休息运动时，必涨 2 点能力并获惊喜现金。'
  },
  {
    id: 'hx_duo_referral', name: '熟人好办事', tier: 'prism', kind: 'duo', kindLabel: '两派合一', reqBonds: ['warmth', 'wealth'],
    bonds: ['warmth', 'wealth'], minAge: 22, maxAge: 55, ico: 'parents',
    big: '工资最高 +18%', unit: '买房再打折',
    rule: '关系铁的亲友越多，内推待遇越好<br>买房还能拿到内部熟人折扣',
    detail: '父母、挚友、伴侣里每有一位亲密度达到 70，你的工资就涨 6%（最高 +18%），买房总价再减 3%（最高省 9%）。',
    example: '三位亲友感情都超 70 → 工资涨 18%，买 ¥200 万的房立省 ¥18 万',
    fit: '认真经营家庭和友情、想靠人脉发家的你',
    desc: '每位亲密 ≥70 的亲友为你带来 6% 涨薪与 3% 买房折扣。'
  },
  {
    id: 'hx_duo_passion', name: '爱好变饭碗', tier: 'prism', kind: 'duo', kindLabel: '两派合一', reqBonds: ['scholar', 'dream'],
    bonds: ['scholar', 'dream'], minAge: 22, maxAge: 55, ico: 'dream',
    big: '升职更快', unit: '',
    rule: '练梦想攒下的本事<br>一半算进工作升职能力',
    detail: '申请职场升职时，你最高的梦想熟练度会折算一半加到「专业」上，还在外科等追梦逆境里直接解锁金色破局选项。',
    example: '梦想练到 60 → 申请升职时专业直接多算 +30，轻松连升两级',
    fit: '一边上班养活自己、一边认真追梦的你',
    desc: '梦想熟练度的 50% 直接折算计入职场升职专业门槛。'
  },
  {
    id: 'hx_duo_warmzen', name: '慢享人间', tier: 'prism', kind: 'duo', kindLabel: '两派合一', reqBonds: ['warmth', 'zen'],
    bonds: ['warmth', 'zen'], minAge: 22, maxAge: 55, ico: 'trip',
    big: '旅行打 7 折', unit: '陪人回健康',
    rule: '陪家人和休息每次都补回健康<br>晚年环游世界门票路费打 7 折',
    detail: '陪父母、约朋友、约伴侣以及休息时，额外多回 2 点健康和 2 点心情；60 岁后环游世界每站从 ¥8 万降到 ¥5.6 万。',
    example: '环游世界玩 3 站 → 直接省下 ¥72,000，身体还倍儿棒',
    fit: '看重家人陪伴与晚年潇洒看世界的你',
    desc: '陪亲友与休息额外回健康 +2，环游世界费用打 7 折。'
  },

  // ===== 6. 5 张追梦专属命定卡（只有对应梦想进入兴趣/追逐阶段才会刷出！）=====
  {
    id: 'hx_singer_royalty', name: '百万单曲版税', tier: 'gold', kind: 'scaling', kindLabel: '梦想专属', maxStacks: 10,
    reqDream: 'd_singer', bonds: ['dream', 'wealth'], minAge: 12, maxAge: 40, ico: 'guitar',
    big: '+¥6,000', unit: '每首歌 · 每年',
    rule: '写出的原创歌越多<br>每年到账的版税越多',
    detail: '【原创歌手专属】你每写出一首原创歌，之后每年年底都自动收到 ¥6,000 版税（最多算 10 首），并大幅提高万人场终局胜算！',
    example: '写了 4 首歌 → 每年年底自动多拿 ¥24,000，唱一辈子领一辈子',
    fit: '已经拿起吉他写歌、追逐原创歌手梦的你',
    desc: '每写出一首原创歌，每年底自动结算 ¥6,000 版税并助阵终局。'
  },
  {
    id: 'hx_esport_clutch', name: '大心脏决胜', tier: 'gold', kind: 'core', kindLabel: '梦想专属',
    reqDream: 'd_esport', bonds: ['dream', 'luck'], minAge: 12, maxAge: 30, ico: 'gamepad',
    big: '大赛胜率飙升', unit: '赢局回满状态',
    rule: '关键比赛和小游戏发挥超常<br>替补席逆风也能一眼抓破绽',
    detail: '【电竞冠军专属】电竞终局决战评估直接 +10 分，青训逆境直接解锁视野破局；所有小游戏奖金额外 +35%！',
    example: '总决赛差一口气时，这张卡直接帮你稳拿冠军奖杯',
    fit: '正在冲击职业电竞首发与冠军奖牌的你',
    desc: '电竞大赛胜算大幅提升，解锁替补破局且小游戏奖金 +35%。'
  },
  {
    id: 'hx_hurdle_wind', name: '赛场顺风耳', tier: 'gold', kind: 'core', kindLabel: '梦想专属',
    reqDream: 'd_hurdle', bonds: ['dream', 'zen'], minAge: 12, maxAge: 30, ico: 'stopwatch',
    big: '特训加健康', unit: '无伤冲刺',
    rule: '每次奥运特训多补 1 点健康上限底子<br>大赛前免疫伤病困扰',
    detail: '【奥运田径专属】每次排入校队/省队特训额外多加 1 点健康，选拔赛前免疫伤病直接破局，奥运决赛评分额外 +10！',
    example: '别人高强度训练怕伤身体，你越练身体越结实',
    fit: '在校运会夺冠后追逐奥运金牌的你',
    desc: '奥运特训额外回健康，免除选拔伤病且决赛评分 +10。'
  },
  {
    id: 'hx_surgeon_blade', name: '柳叶刀圣手', tier: 'prism', kind: 'core', kindLabel: '梦想专属',
    reqDream: 'd_surgeon', bonds: ['dream', 'scholar'], minAge: 18, maxAge: 40, ico: 'stethoscope',
    big: '名医津贴 +20%', unit: '全家免医护费',
    rule: '规培夜班不再伤身，稳过三甲留院<br>爸妈和晚年康养医药费全免',
    detail: '【外科医生专属】临床轮转不扣健康、解锁急诊夜班导师破格推荐，在职月薪高 20%，且父母医疗照护与自己晚年体检费全部免除！',
    example: '光免除父母和晚年医疗账单，下半辈子就稳省 ¥60 万以上',
    fit: '立志穿上白大褂成为外科医生的你',
    desc: '月薪 +20%，免除父母与晚年医疗开销，大幅提高留院胜算。'
  },
  {
    id: 'hx_tsinghua_link', name: '举一反三', tier: 'gold', kind: 'core', kindLabel: '梦想专属',
    reqDream: 'd_tsinghua', bonds: ['dream', 'scholar'], minAge: 12, maxAge: 30, ico: 'trophy',
    big: '大考借力加分', unit: '起薪跳一档',
    rule: '高考和清北复试额外稳加高分<br>毕业进社会底薪比同届更高',
    detail: '【清北学霸专属】18 岁高考折算分直接 +4 分，清北终局选拔/考研复试额外 +10 分，毕业后基础月薪额外提升 12%！',
    example: '高考原本 87 分差一点 → 直接推上 91 分稳进第一档名校',
    fit: '死磕压轴题、想考进清华北大的你',
    desc: '高考 +4 分，清北决战 +10 分，毕业起薪额外高 12%。'
  },

  // ===== 7. 经典长期受益卡（全面白话化）=====
  {
    id: 'hx_work_rest', name: '劳逸结合', tier: 'silver', kind: 'core', kindLabel: '长期受益',
    bonds: ['scholar', 'zen'], minAge: 6, maxAge: 30, ico: 'rest',
    big: '边学边歇不累', unit: '',
    rule: '同一季既有学习工作、又有休息运动<br>额外消疲劳还多涨 2 点心情',
    detail: '只要本季排程里同时包含「学习/工作」和「休息/运动」，回合结束自动少 1 点疲劳、多加 2 点心情。',
    example: '两格自习配一格运动 → 一点不掉心情，长期稳扎稳打',
    fit: '喜欢均衡安排每个季度的你',
    desc: '同季兼顾学习工作与休息运动时，疲劳 -1、心情 +2。'
  },
  {
    id: 'hx_time_master', name: '时间管理达人', tier: 'gold', kind: 'core', kindLabel: '长期受益',
    bonds: ['scholar', 'zen'], minAge: 12, maxAge: 40, ico: 'stopwatch',
    big: '搭配收益翻倍', unit: '盛夏多 1 格',
    rule: '每年第 2 季多出 1 格自由时间<br>所有排程组合搭配奖励全部翻倍',
    detail: '每年第 2 季（暑假/盛夏）排程上限 +1 格；并且你触发的任何排程 Combo 连携奖励统统乘以 2 倍！',
    example: '凑出搭配原本专长 +2、心情 +2 → 直接变成 +4、+4',
    fit: '爱凑排程 Combo 组合、追求高效率的你',
    desc: '每年盛夏多 1 格时间，且所有排程搭配奖励翻倍。'
  },
  {
    id: 'hx_tuck_king', name: '小卖部大亨', tier: 'silver', kind: 'core', kindLabel: '长期受益',
    bonds: ['wealth', 'luck'], minAge: 6, maxAge: 18, ico: 'ring',
    big: '立刻拿 ¥260', unit: '零花涨一半',
    rule: '当场塞给你 ¥260 零花启动金<br>童年压岁零花和限定贴纸多赚 50%',
    detail: '选完立刻到账 ¥260 零花钱，轻松买齐 8 岁心愿玩具和水浒卡；18 岁前每年零花钱和金边贴纸现金奖励全涨 50%。',
    example: '6 岁选它 → 立刻实现小卖部干脆面抽卡自由',
    fit: '童年想集齐 12 张水浒卡换重随券的你',
    desc: '立刻得 ¥260，童年零花钱与限定贴纸收入 +50%。'
  },
  {
    id: 'hx_bargain_hunter', name: '捡漏看房客', tier: 'gold', kind: 'core', kindLabel: '长期受益',
    bonds: ['wealth'], minAge: 22, maxAge: 40, ico: 'home',
    big: '买房打 88 折', unit: '卖房免税',
    rule: '买任何房子总价和首付直降 12%<br>以后换大房卖旧房免交 2% 税费',
    detail: '周末看房买房时，房源总价直接降 12%（首付和月供跟着一起降），将来以小换大卖房时免除全部手续税费。',
    example: '看中 ¥200 万改善房 → 直接省下 ¥24 万，早好几年住进新家',
    fit: '准备买房安家、从刚需一步步换大平层的你',
    desc: '买房总价直降 12%，卖房免除 2% 税费。'
  },
  {
    id: 'hx_social_bull', name: '自来熟', tier: 'silver', kind: 'core', kindLabel: '长期受益',
    bonds: ['warmth'], minAge: 6, maxAge: 30, ico: 'social',
    big: '亲密涨快 35%', unit: '口才 +1',
    rule: '跟谁打交道都特别讨喜<br>每次练口才表达额外多加 1 点',
    detail: '父母、同桌、伴侣的亲密度涨速全部提高 35%，每次锻炼表达能力额外多 +1 点。',
    example: '谈恋爱别人要约会四五次才能领证，你两次就够',
    fit: '需要快速攒满亲密度和口才的你',
    desc: '所有关系亲密获取 +35%，表达训练每次多 +1。'
  },
  {
    id: 'hx_patron', name: '贵人提携', tier: 'prism', kind: 'core', kindLabel: '长期受益',
    bonds: ['warmth'], minAge: 22, maxAge: 55, ico: 'heart',
    big: '大概率免裁员', unit: '亲友多帮 1 次',
    rule: '35 岁大厂裁员潮有贵人提前内推<br>亲密的家人朋友每年能帮衬两次',
    detail: '亲密度 ≥60 的家人朋友每年可支援/代班 2 次；35–42 岁遇到高危裁员时，有 65% 概率被贵人无缝接走，一分钱不亏！',
    example: '带娃期每年请爸妈代班 2 次，白捡两格宝贵时间',
    fit: '走高薪互联网金融赛道、又要兼顾带娃的你',
    desc: '亲友每年可帮衬 2 次，遭遇中年裁员 65% 概率无损过渡。'
  },
  {
    id: 'hx_slow_life', name: '慢活生活家', tier: 'gold', kind: 'core', kindLabel: '长期受益',
    bonds: ['zen'], minAge: 22, maxAge: 55, ico: 'life',
    big: '每季心情 +2', unit: '休息常顿悟',
    rule: '就算在大城市打拼也能稳住好心情<br>睡懒觉时经常灵光一现涨能力',
    detail: '毕业后无论在几线城市，每季自动恢复 2 点心情；每次排入「完整休息」有 30% 概率顿悟，随机一项能力 +2。',
    example: '一年 4 季自动多回 8 点心情，再高压也不容易心态崩盘',
    fit: '在大城市高压工作、想保住生活幸福感的你',
    desc: '每季自动心情 +2，完整休息 30% 概率随机能力 +2。'
  },
  {
    id: 'hx_arcade_pro', name: '街机小霸王', tier: 'silver', kind: 'core', kindLabel: '长期受益',
    bonds: ['luck'], minAge: 6, maxAge: 30, ico: 'gamepad',
    big: '小游戏多赚 40%', unit: '多刷限定卡',
    rule: '每季多刷出 1 张金边限定贴纸<br>玩所有小游戏奖励和心情更高',
    detail: '每季排程抽屉额外多给你刷 1 张限定金边贴纸，并且参与任何休闲小游戏时现金奖励 +40%、心情多 +2。',
    example: '别人每季只有 1 张限定贴纸挑，你每季有 2 张慢慢选',
    fit: '爱玩小游戏、喜欢每季新鲜限定贴纸的你',
    desc: '每季多刷 1 张限定贴纸，小游戏奖励 +40% 且心情多 +2。'
  },
  {
    id: 'hx_koi_god', name: '天选锦鲤', tier: 'prism', kind: 'core', kindLabel: '长期受益',
    bonds: ['luck', 'wealth'], minAge: 18, maxAge: 55, ico: 'ticket',
    big: '立拿 ¥5 万', unit: '每季发横财',
    rule: '当场送你一笔幸运启动金<br>每季自动捡红包，买彩票大奖率暴涨',
    detail: '成年选它当场到账 ¥50,000（18岁选到账 ¥12,000）！彩票头奖概率翻 20 倍，而且每个季度结束都会自动捡到 ¥600～¥8,000 小横财。',
    example: '光选卡到账 + 每季捡钱，十几年下来稳拿十几万外快',
    fit: '当下手头紧缺钱、或者想搏一把头奖暴富的你',
    desc: '立得一笔幸运金，每季自动捡红包且彩票中奖率暴涨。'
  },
  {
    id: 'hx_dream_spark', name: '天生热爱', tier: 'silver', kind: 'core', kindLabel: '长期受益',
    bonds: ['dream'], minAge: 6, maxAge: 18, ico: 'dream',
    big: '梦想起步 +6', unit: '越练越开心',
    rule: '任何梦想起步就比别人高一截<br>每次练梦想多涨进度还多加心情',
    detail: '所有梦想熟练度基础立刻 +6；之后每次安排追梦贴纸，熟练度额外多 +1、心情也额外多 +1。',
    example: '练 15 次梦想 → 白白多攒出 21 点熟练度，稳冲终局圆梦',
    fit: '打算认真走通一条追梦主线的你',
    desc: '梦想起步 +6，每次追梦训练额外 +1 进度、+1 心情。'
  },
  {
    id: 'hx_ai_pioneer', name: '新科技弄潮儿', tier: 'prism', kind: 'core', kindLabel: '长期受益',
    bonds: ['scholar', 'dream'], minAge: 30, maxAge: 55, ico: 'bulb',
    big: '涨薪 +15%', unit: '彻底免裁员',
    rule: '直接掌握新科技本领，不怕 35 岁危机<br>报项目进修课一次顶别人两次',
    detail: '立刻点亮 AI 与新科技技能，月薪永久高 15%，100% 免疫中年裁员潮，且上「导师项目课」拿到的项目经历直接翻倍！',
    example: '上两次项目课就攒够升 L5 总监所需的全部项目经历',
    fit: '30–40 岁想冲顶薪总监、彻底告别裁员焦虑的你',
    desc: '月薪 +15%，彻底免疫中年裁员，项目课收益翻倍。'
  },
  {
    id: 'hx_anti_scam_pro', name: '人间清醒老顽童', tier: 'gold', kind: 'core', kindLabel: '长期受益',
    bonds: ['warmth', 'zen'], minAge: 55, maxAge: 55, ico: 'trophy',
    big: '退休金 +15%', unit: '老来不踩坑',
    rule: '一眼看穿养老骗局，守住养老钱<br>跳两次广场舞就能建好老年朋友圈',
    detail: '立刻点亮防骗本领免除晚年理财被骗风险，退休后每月养老金高出 15%，且跳广场舞建社交圈的速度翻倍。',
    example: '每月退休金 ¥8,000 → 直接涨到 ¥9,200，安心跳到 90 岁',
    fit: '55 岁准备安稳退休、冲刺高分晚年结局的你',
    desc: '免除老年诈骗风险，退休金 +15%，老年社交圈进度翻倍。'
  }
];

export const HEX_CARD_MAP = Object.fromEntries(HEX_CARDS.map(c => [c.id, c]));

export function hasHex(state, id) {
  return Boolean(state?.hexCards?.some(x => x.id === id));
}

export function getHexInstance(state, id) {
  return state?.hexCards?.find(x => x.id === id) || null;
}

export function getHexBondCounts(state) {
  const counts = { scholar: 0, wealth: 0, warmth: 0, zen: 0, luck: 0, dream: 0 };
  for (const inst of (state?.hexCards || [])) {
    const def = HEX_CARD_MAP[inst.id];
    if (!def) continue;
    for (const b of def.bonds) counts[b] = (counts[b] || 0) + 1;
  }
  return counts;
}

export function getBondTier(state, bondId) {
  const c = getHexBondCounts(state)[bondId] || 0;
  return c >= 4 ? 4 : c >= 2 ? 2 : 0;
}

export function getPrismaticCount(state) {
  return (state?.hexCards || []).filter(x => HEX_CARD_MAP[x.id]?.tier === 'prism').length;
}

// 计算某张候选卡若被选中，会激活哪些新的 2/4 件羁绊（返回羁绊 ID 列表）
export function getNewBondTriggersForCard(state, card) {
  const cur = getHexBondCounts(state);
  if (card.reqEvo && hasHex(state, card.reqEvo)) {
    const prev = HEX_CARD_MAP[card.reqEvo];
    if (prev) for (const b of prev.bonds) cur[b] = Math.max(0, cur[b] - 1);
  }
  const hit = [];
  for (const b of card.bonds) {
    const before = cur[b] || 0;
    const after = before + 1;
    if ((before < 2 && after >= 2) || (before < 4 && after >= 4)) {
      hit.push({ bondId: b, count: after >= 4 ? 4 : 2, label: `${HEX_BONDS[b].short}(${after >= 4 ? 4 : 2})` });
    }
  }
  return hit;
}

export function pickSingleHextechCard(state, nodeAge, excludeIds = []) {
  const meta = HEX_NODE_META[nodeAge] || HEX_NODE_META[18];
  const owned = new Set((state.hexCards || []).map(x => x.id));
  const bonds = getHexBondCounts(state);
  const prismCapHit = getPrismaticCount(state) >= 3;

  const eligible = HEX_CARDS.filter(c => {
    if (owned.has(c.id) || excludeIds.includes(c.id)) return false;
    if (nodeAge < c.minAge || nodeAge > c.maxAge) return false;
    // 追梦专属卡前置：必须对应梦想已进入兴趣(2)或认真追逐(3)阶段！
    if (c.reqDream) {
      const dStage = state.dreams?.[c.reqDream]?.stage || 0;
      if (dStage < 2 || dStage >= 4) return false;
    }
    if (c.reqEvo && !owned.has(c.reqEvo)) return false;
    if (c.evoChain && c.evoStage === 1) {
      const hasHigher = (state.hexCards || []).some(x => HEX_CARD_MAP[x.id]?.evoChain === c.evoChain);
      if (hasHigher) return false;
    }
    if (c.reqBonds && !c.reqBonds.every(b => (bonds[b] || 0) >= 1)) return false;
    if (c.tier === 'prism' && prismCapHit && !c.reqEvo) return false;
    if (c.id === 'hx_bargain_hunter' && state.house) return false;
    if (c.id === 'hx_tier1_bet' && state.cityTier !== 1 && nodeAge === 22 && state.track) return false;
    return true;
  });

  if (!eligible.length) {
    const fallback = HEX_CARDS.filter(c => !owned.has(c.id) && !excludeIds.includes(c.id) && !c.reqEvo && !c.reqBonds && !c.reqDream);
    return fallback[Math.floor(Math.random() * fallback.length)] || null;
  }

  const weighted = eligible.map(c => {
    let w = meta.weights[c.tier] ?? 0.2;
    if (w <= 0) w = 0.03;
    if (c.reqDream) {
      const stg = state.dreams?.[c.reqDream]?.stage || 0;
      w *= stg === 3 ? 3.5 : 2.2; // 立志追逐时高概率刷出自己的命定传说卡！
    }
    if (c.reqEvo) w *= 2.8;
    if (c.reqBonds) w *= 2.4;
    if (c.bonds.some(b => (bonds[b] || 0) >= 1)) w *= 1.35;
    return { c, w };
  });

  const total = weighted.reduce((acc, x) => acc + x.w, 0);
  let r = Math.random() * total;
  for (const item of weighted) {
    r -= item.w;
    if (r <= 0) return item.c;
  }
  return weighted[weighted.length - 1].c;
}

export function rollHextechOffer(state, nodeAge) {
  const picks = [];
  const ex = [];
  for (let i = 0; i < 3; i++) {
    const c = pickSingleHextechCard(state, nodeAge, ex);
    if (c) { picks.push(c); ex.push(c.id); }
  }
  return picks;
}

export function applyHextechPick(state, cardId, nodeAge) {
  const def = HEX_CARD_MAP[cardId];
  if (!def) return null;
  if (!state.hexCards) state.hexCards = [];
  if (!state.hexTriggeredAges) state.hexTriggeredAges = [];
  if (!state.hexTriggeredAges.includes(nodeAge)) state.hexTriggeredAges.push(nodeAge);

  const inst = {
    id: def.id,
    acquiredAge: state.age,
    stacks: 0,
    turnsLeft: def.delayTurns || 0,
    yearsLeft: def.delayYears || 0,
    savedCash: 0,
    done: false
  };

  let evolvedFrom = null;
  if (def.reqEvo) {
    const idx = state.hexCards.findIndex(x => x.id === def.reqEvo);
    if (idx >= 0) {
      evolvedFrom = HEX_CARD_MAP[def.reqEvo]?.name || null;
      state.hexCards[idx] = inst;
    } else {
      state.hexCards.push(inst);
    }
  } else {
    state.hexCards.push(inst);
  }

  const notes = [];
  if (evolvedFrom) notes.push(`「${evolvedFrom}」升级为「${def.name}」`);
  if (def.id === 'hx_tuck_king') {
    state.cash += 260;
    notes.push('零花启动金 +¥260');
  } else if (def.id === 'hx_koi_god') {
    const bonus = state.age <= 18 ? 12000 : 50000;
    state.cash += bonus;
    notes.push(`幸运基金 +¥${bonus.toLocaleString()}`);
  } else if (def.id === 'hx_dream_spark') {
    state.dreamSkill = Math.min(100, (state.dreamSkill || 0) + 6);
    if (state.dreams) {
      for (const k of Object.keys(state.dreams)) {
        state.dreams[k].xp = Math.min(100, state.dreams[k].xp + 6);
      }
    }
    notes.push('全梦想起步 +6');
  } else if (def.id === 'hx_ai_pioneer') {
    state.aiSkillLearned = true;
    notes.push('已掌握新科技护城河');
  } else if (def.id === 'hx_anti_scam_pro') {
    if (!state.experiences.includes('exp_anti_scam')) state.experiences.push('exp_anti_scam');
    notes.push('已点亮防骗本领');
  }
  return { def, evolvedFrom, notes };
}
