// 《这辈子 2.0》Sprint 6 —— 顶部双属性阶段进度条 + 大白话「人生心愿册」系统
// 严格遵循零系统 Emoji 规范；界面标签写「爱情姻缘」，不写“不强制”字样。
import { pxIcon } from './icons.js?v=s70';

export function getHudDualProgressBars(state) {
  const age = state.age || 6;
  const stats = state.stats || {};
  const lit = Math.round(stats.knowledge || 0);
  const num = Math.round(stats.numLogic ?? stats.knowledge ?? 0);
  const pro = Math.round(stats.pro || 0);
  const expr = Math.round(stats.expr || 0);
  const care = Math.round(stats.selfCare || 0);

  if (age <= 12) {
    return [
      { key: 'knowledge', label: '学识', ico: 'study', cur: lit, max: 60, fill: '#2563eb', bg: '#dbeafe', txt: '#1d4ed8' },
      { key: 'numLogic',  label: '数理', ico: 'bulb',  cur: num, max: 60, fill: '#d97706', bg: '#fef3c7', txt: '#b45309' }
    ];
  }
  if (age <= 15) {
    return [
      { key: 'knowledge', label: '学识', ico: 'study', cur: lit, max: 75, fill: '#2563eb', bg: '#dbeafe', txt: '#1d4ed8' },
      { key: 'numLogic',  label: '数理', ico: 'bulb',  cur: num, max: 75, fill: '#d97706', bg: '#fef3c7', txt: '#b45309' }
    ];
  }
  if (age <= 18) {
    return [
      { key: 'knowledge', label: '学识', ico: 'study', cur: lit, max: 100, fill: '#2563eb', bg: '#dbeafe', txt: '#1d4ed8' },
      { key: 'numLogic',  label: '数理', ico: 'bulb',  cur: num, max: 100, fill: '#d97706', bg: '#fef3c7', txt: '#b45309' }
    ];
  }
  if (age < (state.gradAge || 22)) {
    return [
      { key: 'pro',  label: '专业', ico: 'pro',  cur: pro,  max: 50, fill: '#16a34a', bg: '#dcfce7', txt: '#15803d' },
      { key: 'expr', label: '表达', ico: 'expr', cur: expr, max: 50, fill: '#db2777', bg: '#fce7f3', txt: '#be185d' }
    ];
  }
  if (age <= 50) {
    const proTarget = pro >= 65 ? 80 : 65;
    return [
      { key: 'pro',      label: '专业', ico: 'pro',      cur: pro,  max: proTarget, fill: '#16a34a', bg: '#dcfce7', txt: '#15803d' },
      { key: 'selfCare', label: '自理', ico: 'selfCare', cur: care, max: 60,        fill: '#4f46e5', bg: '#e0e7ff', txt: '#4338ca' }
    ];
  }
  const bestRel = Math.max(
    state.relations?.friend?.intimacy || 0,
    state.relations?.partner?.intimacy || 0,
    state.relations?.parents?.intimacy || 0,
    state.elderCircle ? 80 : 0
  );
  return [
    { key: 'social',   label: '亲友', ico: 'heart',    cur: Math.round(bestRel), max: 80, fill: '#e11d48', bg: '#ffe4e6', txt: '#be123c' },
    { key: 'selfCare', label: '自理', ico: 'selfCare', cur: care,                max: 70, fill: '#4f46e5', bg: '#e0e7ff', txt: '#4338ca' }
  ];
}

export function ensureWishbookState(state) {
  if (!state) return state;
  if (!Array.isArray(state.stampedWishes)) state.stampedWishes = [];
  if (!Array.isArray(state.travelStamps)) state.travelStamps = [];
  return state;
}

const CHILD_TREASURES_5 = [
  '旋风四驱车', '贴纸手账本', '口袋漫画书', '玻璃弹珠罐'
];

function countChildTreasures(state) {
  const items = state.items || [];
  let cnt = 0;
  // P1-16：兼容 8岁悠悠球/红色悠悠球 与 8岁芭比娃娃/复古芭比娃娃 两套名称
  if (items.includes('8岁悠悠球') || items.includes('红色悠悠球') || items.includes('8岁芭比娃娃') || items.includes('复古芭比娃娃')) cnt++;
  for (const name of CHILD_TREASURES_5) {
    if (items.includes(name)) cnt++;
  }
  return cnt;
}

export function computeWishbookData(state, getNetWorthFn) {
  ensureWishbookState(state);
  const nw = typeof getNetWorthFn === 'function' ? getNetWorthFn(state) : (state.cash || 0);
  const nwWan = Math.max(0, Math.round(nw / 10000));
  const cardsCnt = (state.snackCards || []).length;
  const treasureCnt = countChildTreasures(state);
  const travelCnt = Math.min(5, (state.travelStamps || []).length + (state.worldTrips || 0));
  const friendInt = Math.round(state.relations?.friend?.intimacy || 0);
  const partnerInt = Math.round(state.relations?.partner?.intimacy || 0);
  const married = Boolean(state.relations?.partner?.married);
  const hsLoved = Boolean(state.romance?.hsDatedOnce);
  // P1-10：重点高中章严格看实际录取 schoolTier === 'key_high'，绝不因分数达 560 选职校而误盖章
  const zkPassed = state.schoolTier === 'key_high' || state.stampedWishes.includes('m_zk');
  const gkPassed = Boolean(state.university && state.university.tier <= 3);
  const jobGood = Boolean(state.age >= (state.gradAge || 22) && (state.jobLevel >= 2 || (state.stats?.pro || 0) >= 45));
  const hasHouse = Boolean(state.house);
  const worldDone = (state.worldTrips || 0) >= 1;

  // 财富三阶（100万 / 500万 / 1000万）：已盖章记录持久化，资产回落不熄灭已得印章，每档统一发 1 张券（共 3 张）
  const w100 = nw >= 1000000 || state.stampedWishes.includes('w_nw_100');
  const w500 = nw >= 5000000 || state.stampedWishes.includes('w_nw_500');
  const w1000 = nw >= 10000000 || state.stampedWishes.includes('w_nw_1000');
  const nextWealthTarget = !w100 ? 100 : !w500 ? 500 : 1000;
  const wealthPct = Math.min(100, Math.round((nwWan / nextWealthTarget) * 100));

  const categories = [
    {
      key: 'collect',
      label: '探索收集',
      items: [
        {
          id: 'w_cards_12',
          title: '水浒集卡王',
          how: '在小卖部拆干脆面或课间跟同桌拍卡，集齐全部 12 张英雄卡',
          curText: `已集齐 ${cardsCnt} / 12 张`,
          pct: Math.min(100, Math.round((cardsCnt / 12) * 100)),
          done: cardsCnt >= 12,
          rewardText: '零花 ¥600 + 重随券×1',
          grant: (s) => { s.cash += 600; s.hexRerollTickets = (s.hexRerollTickets || 0) + 1; }
        },
        {
          id: 'w_child_box_5',
          title: '童年百宝箱',
          how: '把心愿玩具（悠悠球/芭比）、四驱车、漫画书、弹珠罐、手账本收进旧物盒',
          curText: `已珍藏 ${treasureCnt} / 5 件`,
          pct: Math.min(100, Math.round((treasureCnt / 5) * 100)),
          done: treasureCnt >= 5,
          rewardText: '心态 +6 + 重随券×1',
          grant: (s) => { s.stats.mood = Math.min(100, (s.stats.mood || 70) + 6); s.hexRerollTickets = (s.hexRerollTickets || 0) + 1; }
        },
        {
          id: 'w_travel_5',
          title: '山海车票夹',
          how: '一生中去过 5 个不同远方旅行或环游世界打卡盖章',
          curText: `已打卡 ${travelCnt} / 5 站`,
          pct: Math.min(100, Math.round((travelCnt / 5) * 100)),
          done: travelCnt >= 5,
          rewardText: '心态 +8 + 重随券×1',
          grant: (s) => { s.stats.mood = Math.min(100, (s.stats.mood || 70) + 8); s.hexRerollTickets = (s.hexRerollTickets || 0) + 1; }
        }
      ]
    },
    {
      key: 'wealth',
      label: '搞钱事业',
      items: [
        {
          id: 'w_wealth_tier',
          title: '小金库三连跳（100万 / 500万 / 1000万）',
          how: '现金、存款、黄金与房产净值合计突破三档阶梯即自动盖章领奖',
          curText: w1000 ? `净资产 ${nwWan}万（三阶全满）` : `当前 ${nwWan}万 / 下一档 ${nextWealthTarget}万`,
          pct: w1000 ? 100 : wealthPct,
          done: w1000,
          badges: [
            { txt: w100 ? '100万 已盖章' : '100万 待达成', on: w100 },
            { txt: w500 ? '500万 已盖章' : w100 ? '500万 进行中' : '500万 待解锁', on: w500 },
            { txt: w1000 ? '1000万 已盖章' : w500 ? '1000万 进行中' : '1000万 待解锁', on: w1000 }
          ],
          rewardText: '每过一档送重随券×1',
          subMilestones: [
            { id: 'w_nw_100', done: nw >= 1000000, grant: (s) => { s.hexRerollTickets = (s.hexRerollTickets || 0) + 1; } },
            { id: 'w_nw_500', done: nw >= 5000000, grant: (s) => { s.hexRerollTickets = (s.hexRerollTickets || 0) + 1; s.stats.mood = Math.min(100, s.stats.mood + 5); } },
            { id: 'w_nw_1000', done: nw >= 10000000, grant: (s) => { s.hexRerollTickets = (s.hexRerollTickets || 0) + 1; s.stats.mood = Math.min(100, s.stats.mood + 8); } }
          ]
        },
        {
          id: 'w_job_l4',
          title: '职场独当一面',
          how: '积累专业能力与项目经历，在所选行业一路晋升至 L4 职级',
          curText: `当前职级 L${state.jobLevel || 1} / 目标 L4`,
          pct: Math.min(100, Math.round(((state.jobLevel || 1) / 4) * 100)),
          done: (state.jobLevel || 1) >= 4,
          rewardText: '现金 ¥2万 + 重随券×1',
          grant: (s) => { s.cash += 20000; s.hexRerollTickets = (s.hexRerollTickets || 0) + 1; }
        }
      ]
    },
    {
      key: 'friend',
      label: '友情羁绊',
      items: [
        {
          id: 'w_best_friend',
          title: '过命的死党',
          how: '常约同桌或发小玩耍叙旧，把好友亲密度提升到 80 点以上',
          curText: `好友亲密 ${friendInt} / 80`,
          pct: Math.min(100, Math.round((friendInt / 80) * 100)),
          done: friendInt >= 80,
          rewardText: '心态 +5 + 重随券×1',
          grant: (s) => { s.stats.mood = Math.min(100, s.stats.mood + 5); s.hexRerollTickets = (s.hexRerollTickets || 0) + 1; }
        },
        {
          id: 'w_half_life_friend',
          title: '半生老同学',
          how: '走到 50 岁时，年少时的发小依然没有走散（亲密度保持 60 以上）',
          curText: state.age >= 50 ? `50岁亲密 ${friendInt} / 60` : `当前 ${state.age}岁 · 亲密 ${friendInt}`,
          pct: state.age >= 50 ? Math.min(100, Math.round((friendInt / 60) * 100)) : Math.min(90, Math.round((state.age / 50) * 90)),
          done: state.age >= 50 && friendInt >= 60,
          rewardText: '心态 +8 + 重随券×1',
          grant: (s) => { s.stats.mood = Math.min(100, s.stats.mood + 8); s.hexRerollTickets = (s.hexRerollTickets || 0) + 1; }
        }
      ]
    },
    {
      key: 'love',
      label: '爱情姻缘',
      items: [
        {
          id: 'w_hs_love',
          title: '青春白月光',
          how: '中学时期在同学录里聊出高好感度并勇敢表白，谈一场校园初恋',
          curText: hsLoved ? '已盖章 · 难忘校园初恋' : '未达成 0 / 1',
          pct: hsLoved ? 100 : 0,
          done: hsLoved,
          rewardText: '心态 +8 + 重随券×1',
          grant: (s) => { s.stats.mood = Math.min(100, s.stats.mood + 8); s.hexRerollTickets = (s.hexRerollTickets || 0) + 1; }
        },
        {
          id: 'w_gold_marriage',
          title: '白首不相离',
          how: '与相爱伴侣携手成家，并细心经营把伴侣好感度维持到 85 以上',
          curText: married ? `伴侣好感度 ${partnerInt} / 85` : '尚未成家 0 / 1',
          pct: married ? Math.min(100, Math.round((partnerInt / 85) * 100)) : 0,
          done: married && partnerInt >= 85,
          rewardText: '心态 +10 + 重随券×1',
          grant: (s) => { s.stats.mood = Math.min(100, s.stats.mood + 10); s.hexRerollTickets = (s.hexRerollTickets || 0) + 1; }
        }
      ]
    },
    {
      key: 'main',
      label: '五大主线',
      items: [
        {
          id: 'm_zk',
          title: '15岁中考 · 考进重点高中',
          how: '初中提升学识与数理，中考放榜达到重点高中录取线',
          curText: zkPassed ? '已达成' : state.age <= 15 ? `学识 ${Math.round(state.stats.knowledge)} / 75` : '已走过此阶段',
          pct: zkPassed ? 100 : Math.min(99, Math.round(((state.stats.knowledge + (state.stats.numLogic || 20)) / 150) * 100)),
          done: zkPassed,
          rewardText: '重随券×1',
          grant: (s) => { s.hexRerollTickets = (s.hexRerollTickets || 0) + 1; }
        },
        {
          id: 'm_gk',
          title: '18岁高考 · 考上理想大学',
          how: '高中阶段稳步冲刺学识与数理，18 岁夏参加高考录取本科以上',
          curText: gkPassed ? `已录取 ${state.university.name}` : state.age <= 18 ? `学识 ${Math.round(state.stats.knowledge)} / 100` : '已走过此阶段',
          pct: gkPassed ? 100 : Math.min(99, Math.round(((state.stats.knowledge + (state.stats.numLogic || 20)) / 180) * 100)),
          done: gkPassed,
          rewardText: '重随券×1',
          grant: (s) => { s.hexRerollTickets = (s.hexRerollTickets || 0) + 1; }
        },
        {
          id: 'm_job',
          title: '毕业找份好工作',
          how: '大学期提升专业与表达，毕业顺利入职并站稳脚跟',
          curText: jobGood ? `已站稳 L${state.jobLevel}` : `专业 ${Math.round(state.stats.pro)} / 50`,
          pct: jobGood ? 100 : Math.min(99, Math.round((state.stats.pro / 50) * 100)),
          done: jobGood,
          rewardText: '现金 ¥5,000',
          grant: (s) => { s.cash += 5000; }
        },
        {
          id: 'm_house',
          title: '中年买套好房安家',
          how: '攒够首付在「家与账 -> 周末看房」买下属于自己的小家',
          curText: hasHouse ? `已安家 · ${state.house.name}` : `当前存款 ${Math.round((state.cash || 0) / 10000)}万`,
          pct: hasHouse ? 100 : Math.min(95, Math.round(((state.cash || 0) / 150000) * 100)),
          done: hasHouse,
          rewardText: '心态 +6 + 重随券×1',
          grant: (s) => { s.stats.mood = Math.min(100, s.stats.mood + 6); s.hexRerollTickets = (s.hexRerollTickets || 0) + 1; }
        },
        {
          id: 'm_world',
          title: '晚年环球旅游',
          how: '60 岁后保持健康并留出 ¥5万 旅费，安排「环游世界」出发',
          curText: worldDone ? `已环游 ${state.worldTrips} 站` : `60岁后解锁`,
          pct: worldDone ? 100 : (state.age >= 60 ? Math.min(95, Math.round(((state.cash || 0) / 50000) * 100)) : 0),
          done: worldDone,
          rewardText: '人生圆满金印章',
          grant: (s) => { s.stats.mood = Math.min(100, s.stats.mood + 10); }
        }
      ]
    }
  ];

  // 自动检查并盖章发奖
  const newlyStamped = [];
  for (const cat of categories) {
    for (const item of cat.items) {
      if (item.subMilestones) {
        for (const sm of item.subMilestones) {
          if (sm.done && !state.stampedWishes.includes(sm.id)) {
            state.stampedWishes.push(sm.id);
            if (sm.grant) sm.grant(state);
            newlyStamped.push(item.title);
          }
        }
      } else if (item.done && !state.stampedWishes.includes(item.id)) {
        state.stampedWishes.push(item.id);
        if (item.grant) item.grant(state);
        newlyStamped.push(item.title);
      }
    }
  }

  return { categories, totalStamped: state.stampedWishes.length, newlyStamped };
}

export function openWishbookModal(state, getNetWorthFn, mountOverlay, clearOverlay, onChanged) {
  let activeCat = 'collect';
  const renderModal = () => {
    const data = computeWishbookData(state, getNetWorthFn);
    const cat = data.categories.find(c => c.key === activeCat) || data.categories[0];

    const html = `
      <div class="modal-mask" id="wish-mask">
        <div class="modal-sheet wishbook-sheet">
          <div class="wb-head">
            <div>
              <div class="wb-title">${pxIcon('pin', 16)} 人生心愿册</div>
              <div class="wb-sub">自动记录进度，达成即盖红泥章领奖</div>
            </div>
            <span class="wb-cnt">已盖章 ${data.totalStamped}</span>
          </div>

          <div class="wb-tabs">
            ${data.categories.map(c => `
              <button class="wb-tab ${c.key === activeCat ? 'active' : ''}" data-wb-cat="${c.key}">${c.label}</button>
            `).join('')}
          </div>

          <div class="wb-list">
            ${cat.items.map(it => `
              <div class="wb-card ${it.done ? 'done' : ''}">
                <div class="wb-c-top">
                  <span class="wb-c-title">${it.title}</span>
                  <span class="wb-c-cur ${it.done ? 'ok' : ''}">${it.curText}</span>
                </div>
                <div class="wb-c-how">做法：${it.how}</div>
                ${it.badges ? `
                  <div class="wb-tiers">
                    ${it.badges.map(b => `<span class="wb-tier ${b.on ? 'on' : ''}">${b.txt}</span>`).join('')}
                  </div>
                ` : ''}
                <div class="wb-c-foot">
                  <div class="wb-bar"><i style="width:${it.pct}%;background:${it.done ? '#22c55e' : '#c9683a'}"></i></div>
                  <span class="wb-rew">奖励：${it.rewardText}</span>
                </div>
              </div>
            `).join('')}
          </div>

          <button class="btn-go" id="wb-close" style="margin-top:10px;width:100%;">收起心愿册</button>
        </div>
      </div>
    `;

    mountOverlay(html, (root) => {
      root.querySelectorAll('[data-wb-cat]').forEach(btn => {
        btn.onclick = () => {
          activeCat = btn.dataset.wbCat;
          renderModal();
        };
      });
      const close = () => {
        clearOverlay();
        if (onChanged) onChanged();
      };
      root.querySelector('#wb-close').onclick = close;
      root.querySelector('#wish-mask').onclick = (e) => {
        if (e.target.id === 'wish-mask') close();
      };
    });
  };
  renderModal();
}
