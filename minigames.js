// 《这辈子 2.0》第 3 步纯策略灰盒原型 - P0 小游戏「黄金铁三角」（每款支持一键自动结算保底）

// 1. 童年 P0：课间望风·翻卡博弈（Push-Your-Luck）
export function openFlipCardGame(container, state, onFinish) {
  const deck = [
    { type: 'reward', label: '零花钱 +60', cash: 60, mood: 1 },
    { type: 'reward', label: '零花钱 +100', cash: 100, mood: 1 },
    { type: 'reward', label: '稀有卡片 (心态+2)', cash: 30, mood: 2 },
    { type: 'reward', label: '学霸笔记 (学识+1)', cash: 0, mood: 1, know: 1 },
    { type: 'reward', label: '小卖部金卡 (+150)', cash: 150, mood: 2 },
    { type: 'reward', label: '零食分享 (心态+2)', cash: 20, mood: 2 },
    { type: 'reward', label: '弹珠大胜 (+80)', cash: 80, mood: 1 },
    { type: 'trap', label: '班主任巡逻！' },
    { type: 'trap', label: '班主任巡逻！' }
  ].sort(() => Math.random() - 0.5);

  let lookoutShield = state.relations.friend.intimacy >= 45 ? 1 : 0;
  let flipped = new Array(9).fill(false);
  let pot = { cash: 0, mood: 0, know: 0, count: 0 };
  let over = false;
  let msg = lookoutShield
    ? '同桌小周亲密达标，获得 1 次「咳嗽望风」免抓护盾！点击翻牌，随时可见好就收。'
    : '翻开课桌下的 9 张牌，避开 2 张「班主任巡逻」，随时可见好就收！';

  function render() {
    container.innerHTML = `
      <div class="mg-box">
        <div class="mg-head">
          <h3>童年 P0｜课间望风 · 翻卡博弈</h3>
          <button class="btn ghost" id="mg-skip">一键自动结算（保底心态+2）</button>
        </div>
        <p class="mg-tip">${msg}</p>
        <div class="mg-stats">当前战利品：现金 +${pot.cash} 元｜心态 +${pot.mood}｜学识 +${pot.know}｜望风护盾：${lookoutShield}</div>
        <div class="flip-grid">
          ${deck.map((c, i) => `
            <button class="flip-card ${flipped[i] ? (c.type === 'trap' ? 'trap' : 'open') : ''}" data-i="${i}" ${flipped[i] || over ? 'disabled' : ''}>
              ${flipped[i] ? c.label : '❓'}
            </button>
          `).join('')}
        </div>
        <div class="mg-actions">
          <button class="btn primary" id="mg-cashout" ${pot.count === 0 && !over ? 'disabled' : ''}>
            ${over ? '结束并返回工作台' : `见好就收（带走 +${pot.cash} 元 / 心态 +${pot.mood}）`}
          </button>
        </div>
      </div>
    `;
    container.querySelector('#mg-skip').onclick = () => onFinish({ cash: 50, mood: 2, know: 0, note: '自动结算：获得基础课间放松收益' });
    container.querySelector('#mg-cashout').onclick = () => onFinish({ ...pot, note: over ? '课间翻卡收尾' : '见好就收，满载而归！' });
    container.querySelectorAll('.flip-card').forEach(btn => {
      btn.onclick = () => {
        const i = Number(btn.dataset.i);
        flipped[i] = true;
        const c = deck[i];
        if (c.type === 'trap') {
          if (lookoutShield > 0) {
            lookoutShield--;
            msg = '惊险！同桌小周咳嗽望风，帮你挡住了一次班主任巡逻！建议见好就收。';
          } else {
            over = true;
            pot = { cash: 0, mood: -1, know: 0, count: 0 };
            msg = '被班主任抓包没收！本局战利品清零（心态 -1）。';
          }
        } else {
          pot.count++;
          pot.cash += c.cash || 0;
          pot.mood += c.mood || 0;
          pot.know += c.know || 0;
          msg = `翻到「${c.label}」！可以见好就收，也可以继续赌下一张。`;
        }
        render();
      };
    });
  }
  render();
}

// 2. 中年 P0：蜗居到大宅·空间拼图布置（Unpacking × 背包乱斗邻接协同）
export function openHomePuzzleGame(container, state, onFinish) {
  const N = state.house ? state.house.grid : 4;
  const grid = Array.from({ length: N }, () => Array(N).fill(null));
  const toyName = state.items.includes('8岁芭比娃娃') ? '8岁芭比娃娃' : (state.items.includes('8岁悠悠球') ? '8岁悠悠球' : null);
  const items = [
    { id: 'bed', name: '双人床', icon: '🛏️', placed: false, tip: '生活核心' },
    { id: 'desk', name: '书桌', icon: '💻', placed: false, tip: '紧挨第1行「窗户」效率 +3' },
    { id: 'sofa', name: '客厅沙发', icon: '🛋️', placed: false, tip: '提升居家舒适度' },
    { id: 'shelf', name: toyName ? `旧物架(含${toyName})` : '家庭展示架', icon: toyName === '8岁芭比娃娃' ? '🎎' : '🪀', placed: false, tip: '摆放即激活永久居家 Buff（休息疲劳额外-1）' },
    { id: 'crib', name: '婴儿床', icon: '🍼', placed: false, tip: '紧挨双人床 +3 舒适；紧挨书桌吵闹 -3！' }
  ];
  let selected = items[0].id;

  function calcScore() {
    let score = 0;
    let notes = [];
    const pos = {};
    for (let r = 0; r < N; r++) {
      for (let c = 0; c < N; c++) {
        if (grid[r][c]) { pos[grid[r][c]] = [r, c]; score += 2; }
      }
    }
    const isAdj = (a, b) => a && b && (Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) === 1);
    if (pos.desk && pos.desk[0] === 0) { score += 3; notes.push('✅ 书桌靠窗采光极佳 (+3)'); }
    if (pos.crib && isAdj(pos.crib, pos.bed)) { score += 3; notes.push('✅ 婴儿床紧挨双人床，夜间好照护 (+3)'); }
    if (pos.crib && isAdj(pos.crib, pos.desk)) { score -= 3; notes.push('⚠️ 婴儿床紧挨书桌，吵闹互扰 (-3)'); }
    if (pos.shelf) { score += 4; notes.push(`✨ ${toyName ? toyName + '上墙' : '展示架落位'}：激活永久居家 Buff (+4)`); }
    return { score, notes, hasShelf: Boolean(pos.shelf) };
  }

  function render() {
    const res = calcScore();
    container.innerHTML = `
      <div class="mg-box">
        <div class="mg-head">
          <h3>中年 P0｜蜗居到大宅 · 空间拼图 (${N}×${N} ${state.house?.tier || '出租屋'})</h3>
          <button class="btn ghost" id="mg-skip">一键自动布置（保底激活居家 Buff）</button>
        </div>
        <p class="mg-tip">第 1 行为 <b>☀️ 采光窗边</b>。先选右侧家具，再点网格摆放（点击已摆格子可收回）。</p>
        <div class="puzzle-wrap">
          <div class="puzzle-grid" style="grid-template-columns: repeat(${N}, 1fr)">
            ${grid.map((row, r) => row.map((cell, c) => {
              const it = items.find(x => x.id === cell);
              return `<button class="p-cell ${r === 0 ? 'window-row' : ''} ${it ? 'filled' : ''}" data-r="${r}" data-c="${c}">
                ${it ? `<span>${it.icon}</span><small>${it.name.slice(0,3)}</small>` : (r === 0 ? '<small>窗边</small>' : '')}
              </button>`;
            }).join('')).join('')}
          </div>
          <div class="puzzle-side">
            <div class="mg-stats">当前舒适协同分：<b>${res.score}</b>（≥10 激活完美居家 Buff）</div>
            <div class="item-list">
              ${items.map(it => `
                <button class="item-btn ${selected === it.id ? 'active' : ''} ${it.placed ? 'placed' : ''}" data-id="${it.id}">
                  ${it.icon} ${it.name} <small>${it.tip}</small>
                </button>
              `).join('')}
            </div>
            <ul class="synergy-list">${res.notes.map(n => `<li>${n}</li>`).join('') || '<li>摆放家具查看空间协同加成…</li>'}</ul>
          </div>
        </div>
        <div class="mg-actions">
          <button class="btn primary" id="mg-done">完成搬家入驻（激活居家 Buff：${res.score >= 10 || res.hasShelf ? '是' : '差一点'}）</button>
        </div>
      </div>
    `;
    container.querySelector('#mg-skip').onclick = () => onFinish({ buffActive: true, mood: 3, note: '自动布置完成，激活永久居家 Buff' });
    container.querySelector('#mg-done').onclick = () => onFinish({ buffActive: res.score >= 10 || res.hasShelf, mood: res.score >= 12 ? 6 : 3, score: res.score, note: `新家舒适分 ${res.score}，入驻成功！` });
    container.querySelectorAll('.item-btn').forEach(b => { b.onclick = () => { selected = b.dataset.id; render(); }; });
    container.querySelectorAll('.p-cell').forEach(b => {
      b.onclick = () => {
        const r = Number(b.dataset.r), c = Number(b.dataset.c);
        if (grid[r][c]) {
          const old = items.find(x => x.id === grid[r][c]);
          if (old) old.placed = false;
          grid[r][c] = null;
        } else if (selected) {
          const it = items.find(x => x.id === selected);
          if (it && !it.placed) {
            grid[r][c] = it.id;
            it.placed = true;
            const nextUnplaced = items.find(x => !x.placed);
            selected = nextUnplaced ? nextUnplaced.id : null;
          }
        }
        render();
      };
    });
  }
  render();
}

// 3. 老年 P0：公园石桌·人情残局五子棋（9×9 短残局 + 赢面子/让孙辈人情抉择）
export function openGomokuGame(container, state, onFinish) {
  const N = 9;
  // 0空 1黑(玩家) 2白(老友/孙辈) —— 预设经典 1 分钟残局，黑方有活三冲四杀棋机会
  const board = Array.from({ length: N }, () => Array(N).fill(0));
  [[4,3,1],[4,4,1],[4,5,1],[3,4,1],[5,5,1],[3,3,2],[3,5,2],[5,3,2],[5,4,2],[4,2,2]].forEach(([r,c,v]) => { board[r][c] = v; });
  let over = false;
  let msg = '【公园石桌残局】你执黑棋（●），老友/孙辈执白棋（○）。既可连成五子赢面子，也可点下方「故意卖破绽让棋」换人情与防骗情报！';

  function checkWin(r, c, p) {
    const dirs = [[1,0],[0,1],[1,1],[1,-1]];
    for (const [dr, dc] of dirs) {
      let cnt = 1;
      for (const s of [1, -1]) {
        let nr = r + dr * s, nc = c + dc * s;
        while (nr >= 0 && nr < N && nc >= 0 && nc < N && board[nr][nc] === p) { cnt++; nr += dr * s; nc += dc * s; }
      }
      if (cnt >= 5) return true;
    }
    return false;
  }

  function aiMove() {
    // 简易防堵/进攻：优先堵黑棋四连或随便下在中心附近
    let best = null;
    for (let r = 0; r < N; r++) {
      for (let c = 0; c < N; c++) {
        if (board[r][c] !== 0) continue;
        board[r][c] = 2;
        if (checkWin(r, c, 2)) { return [r, c]; }
        board[r][c] = 1;
        if (checkWin(r, c, 1)) { board[r][c] = 0; best = [r, c]; }
        board[r][c] = 0;
        if (!best && Math.abs(r - 4) + Math.abs(c - 4) <= 3) best = [r, c];
      }
    }
    if (best) board[best[0]][best[1]] = 2;
    return best;
  }

  function render() {
    container.innerHTML = `
      <div class="mg-box">
        <div class="mg-head">
          <h3>老年 P0｜公园石桌 · 人情残局五子棋</h3>
          <button class="btn ghost" id="mg-skip">一键自动对弈（保底心态+2）</button>
        </div>
        <p class="mg-tip">${msg}</p>
        <div class="gomoku-board">
          ${board.map((row, r) => row.map((v, c) => `
            <button class="g-cell" data-r="${r}" data-c="${c}" ${v !== 0 || over ? 'disabled' : ''}>
              ${v === 1 ? '<span class="stone black"></span>' : v === 2 ? '<span class="stone white"></span>' : ''}
            </button>
          `).join('')).join('')}
        </div>
        <div class="mg-actions">
          <button class="btn secondary" id="mg-letwin">故意卖个破绽让对方赢（亲密 +6 / 套出防骗情报）</button>
          ${over ? '<button class="btn primary" id="mg-close">收棋返回工作台</button>' : ''}
        </div>
      </div>
    `;
    container.querySelector('#mg-skip').onclick = () => onFinish({ mood: 2, intimacy: 2, antiScam: false, note: '公园切磋一局，心态 +2' });
    container.querySelector('#mg-letwin').onclick = () => onFinish({ mood: 3, intimacy: 6, antiScam: true, note: '你笑眯眯让了一步，对方开心坏了，顺口提醒你避开社区理财骗局！' });
    const closeBtn = container.querySelector('#mg-close');
    if (closeBtn) closeBtn.onclick = () => onFinish({ mood: 4, intimacy: 3, antiScam: false, note: '精彩绝杀赢了面子！心态 +4，老友亲密 +3' });

    container.querySelectorAll('.g-cell').forEach(b => {
      b.onclick = () => {
        const r = Number(b.dataset.r), c = Number(b.dataset.c);
        board[r][c] = 1;
        if (checkWin(r, c, 1)) {
          over = true;
          msg = '漂亮！五子连珠漂亮绝杀！赢得公园石桌一片喝彩（心态 +4）。';
        } else {
          const mv = aiMove();
          if (mv && checkWin(mv[0], mv[1], 2)) {
            over = true;
            msg = '对方趁机反杀一局，两人相视一笑，相约明天再来（心态 +2，亲密 +4）。';
          }
        }
        render();
      };
    });
  }
  render();
}
