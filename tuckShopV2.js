// 《这辈子 2.0》Sprint 4 —— 千禧校门口小卖部 V2（三层实景木货架 + 手撕干脆面三步真实交互 + 课间同桌拍水浒卡对决）
// 严格遵循纯中文零表情符号规范。

import { getBondTier, hasHex } from './hextech.js?v=s40';
import { TUCK_CARDS_12, TUCK_GOODS, buyTuckGood, buyTuckGift } from './lifeFeatures.js?v=s40';
import { triggerHaptic } from './vfxAndUi.js?v=s40';
import { pxIcon } from './icons.js?v=s40';

function clamp(v, min = 0, max = 100) {
  return Math.max(min, Math.min(max, Math.round(v)));
}

const NOODLE_FLAVORS = [
  { name: '香脆烧烤', c1: '#f59e0b', c2: '#b45309' },
  { name: '鲜爽海苔', c1: '#38bdf8', c2: '#0369a1' },
  { name: '川香麻辣', c1: '#ef4444', c2: '#991b1b' },
  { name: '秘制五香', c1: '#a855f7', c2: '#6b21a8' },
  { name: '浓郁番茄', c1: '#f472b6', c2: '#be185d' }
];

// 为 12 位水浒英雄绘制专属复古插画肖像 SVG（零外部图片依赖）
function renderHeroPortraitSvg(cardStr, size = 56) {
  const num = parseInt(cardStr.slice(0, 2), 10) || 1;
  const palettes = [
    ['#fef3c7', '#b45309', '#dc2626'],
    ['#dbeafe', '#1d4ed8', '#f59e0b'],
    ['#dcfce7', '#15803d', '#ca8a04'],
    ['#fce7f3', '#be185d', '#eab308']
  ];
  const [bg, armor, cape] = palettes[num % palettes.length];
  return `
    <svg width="${size}" height="${Math.round(size * 1.18)}" viewBox="0 0 48 56" aria-hidden="true">
      <rect x="2" y="2" width="44" height="52" rx="4" fill="${bg}" stroke="#4a3728" stroke-width="2"/>
      <rect x="5" y="5" width="38" height="46" rx="2" fill="none" stroke="#d97706" stroke-width="1.2"/>
      <!-- 披风与长兵器 -->
      <path d="M10 46 Q24 30 38 46 Z" fill="${cape}"/>
      <line x1="36" y1="9" x2="14" y2="48" stroke="#4a3728" stroke-width="2.4"/>
      <polygon points="36,7 41,13 34,15" fill="#94a3b8" stroke="#4a3728" stroke-width="1.2"/>
      <!-- 头盔与面庞 -->
      <path d="M16 18 Q24 9 32 18 Z" fill="${armor}" stroke="#4a3728" stroke-width="1.6"/>
      <circle cx="24" cy="12" r="2.5" fill="#dc2626"/>
      <rect x="18" y="18" width="12" height="11" rx="3" fill="#fde3c8" stroke="#4a3728" stroke-width="1.5"/>
      <rect x="20" y="21" width="2" height="2" fill="#4a3728"/>
      <rect x="26" y="21" width="2" height="2" fill="#4a3728"/>
      <path d="M20 26 Q24 28 28 26" fill="none" stroke="#4a3728" stroke-width="1.4"/>
      <!-- 战甲胸甲 -->
      <rect x="14" y="29" width="20" height="17" rx="3" fill="${armor}" stroke="#4a3728" stroke-width="1.6"/>
      <circle cx="24" cy="36" r="3" fill="#fde047" stroke="#4a3728" stroke-width="1.2"/>
    </svg>
  `;
}

// 绘制小卖部玩具实物精细插画 SVG
function renderShelfToySvg(goodId) {
  if (goodId === 'tg_4wd') {
    return `<svg width="52" height="42" viewBox="0 0 52 42"><polygon points="8,26 22,12 44,14 46,28 8,30" fill="#2563eb" stroke="#4a3728" stroke-width="2"/><polygon points="14,24 24,16 38,17 36,25" fill="#ef4444"/><rect x="38" y="8" width="9" height="5" fill="#f59e0b" stroke="#4a3728" stroke-width="1.5"/><circle cx="15" cy="30" r="6" fill="#1e293b" stroke="#4a3728" stroke-width="1.8"/><circle cx="37" cy="30" r="6" fill="#1e293b" stroke="#4a3728" stroke-width="1.8"/><circle cx="15" cy="30" r="2" fill="#fde047"/><circle cx="37" cy="30" r="2" fill="#fde047"/></svg>`;
  }
  if (goodId === 'tg_marble') {
    return `<svg width="46" height="44" viewBox="0 0 46 44"><rect x="13" y="4" width="20" height="5" rx="2" fill="#d6d3d1" stroke="#4a3728" stroke-width="1.8"/><rect x="9" y="9" width="28" height="31" rx="6" fill="#e0f2fe" fill-opacity="0.78" stroke="#4a3728" stroke-width="2"/><circle cx="17" cy="32" r="4.5" fill="#ef4444" stroke="#4a3728" stroke-width="1.2"/><circle cx="26" cy="33" r="4.5" fill="#3b82f6" stroke="#4a3728" stroke-width="1.2"/><circle cx="21" cy="24" r="4.5" fill="#22c55e" stroke="#4a3728" stroke-width="1.2"/><circle cx="29" cy="25" r="4.5" fill="#f59e0b" stroke="#4a3728" stroke-width="1.2"/><circle cx="16" cy="18" r="4" fill="#a855f7" stroke="#4a3728" stroke-width="1.2"/></svg>`;
  }
  if (goodId === 'tg_book') {
    return `<svg width="44" height="44" viewBox="0 0 44 44"><rect x="8" y="5" width="28" height="35" rx="3" fill="#fbcfe8" stroke="#4a3728" stroke-width="2"/><line x1="13" y1="5" x2="13" y2="40" stroke="#db2777" stroke-width="2"/><circle cx="24" cy="22" r="6" fill="#fde68a" stroke="#4a3728" stroke-width="1.4"/><rect x="17" y="10" width="14" height="4" rx="1" fill="#fffdf9"/></svg>`;
  }
  return `<svg width="44" height="44" viewBox="0 0 44 44"><rect x="8" y="5" width="28" height="35" rx="2" fill="#facc15" stroke="#4a3728" stroke-width="2"/><rect x="12" y="10" width="20" height="13" fill="#fffdf9" stroke="#4a3728" stroke-width="1.4"/><circle cx="19" cy="16" r="3" fill="#4a3728"/><rect x="12" y="26" width="20" height="9" fill="#bae6fd" stroke="#4a3728" stroke-width="1.4"/></svg>`;
}

export function ensureTuckV2State(state) {
  if (!Array.isArray(state.snackCards)) state.snackCards = [];
  if (typeof state.dupSnackCards !== 'number') state.dupSnackCards = 0;
}

function checkWaterMarginMilestone(state) {
  const cnt = state.snackCards.length;
  if (!Array.isArray(state.claimedCardMilestones)) state.claimedCardMilestones = [];
  if ((cnt === 4 || cnt === 8 || cnt === 12) && !state.claimedCardMilestones.includes(cnt)) {
    state.claimedCardMilestones.push(cnt);
    const reward = cnt === 4 ? 120 : cnt === 8 ? 300 : 600;
    state.cash += reward;
    state.hexRerollTickets = (state.hexRerollTickets || 0) + 1;
    return `集齐 ${cnt}/12 张水浒卡！奖零花 +¥${reward} 与命运重随券 +1！`;
  }
  return '';
}

// ==================== 1. 三层实景木货架小卖部主界面 ====================
export function openTuckShopV2(ctx) {
  const { state, mountOverlay, clearOverlay, saveAutoProgress, renderMain, showToast, fmtMoney } = ctx;
  ensureTuckV2State(state);

  const renderShelf = () => {
    const disc = getBondTier(state, 'wealth') >= 2 ? 0.9 : 1.0;
    const packPrice = Math.round(15 * disc);
    const ownedCnt = state.snackCards.length;
    const dupCnt = state.dupSnackCards || 0;
    const unownedLeft = TUCK_CARDS_12.length - ownedCnt;

    mountOverlay(`
      <div class="tuck2-overlay">
        <div class="tuck2-store">
          <!-- 红白条纹遮阳篷与木牌店招 -->
          <div class="tuck2-awning">
            <div class="tuck2-stripes">${'<i></i>'.repeat(9)}</div>
            <div class="tuck2-top-row">
              <div class="tuck2-sign">校门口小卖部</div>
              <div class="tuck2-top-right">
                <span class="tuck2-cash">零花钱 ¥${fmtMoney(state.cash)}</span>
                <button class="tuck2-binder-btn" id="t2-open-binder">
                  <span class="tb-book">水浒册</span>
                  <b>${ownedCnt}/12</b>
                  ${dupCnt > 0 ? `<em class="tb-dup">重×${dupCnt}</em>` : ''}
                </button>
              </div>
            </div>
          </div>

          <!-- 三层实景木货架主体 -->
          <div class="tuck2-wood-frame">
            <!-- 第一层：五包脆脆香干脆面盲袋盒 -->
            <div class="tuck2-shelf-tier">
              <div class="tuck2-packs-row">
                ${NOODLE_FLAVORS.map((fl, idx) => `
                  <button class="tuck2-pack" data-pick-pack="${idx}" style="--pk1:${fl.c1};--pk2:${fl.c2};">
                    <span class="pk-saw"></span>
                    <b class="pk-brand">脆脆香</b>
                    <small class="pk-flv">${fl.name}</small>
                  </button>
                `).join('')}
              </div>
              <div class="tuck2-tray-front" id="t2-grab-any">
                <span>干脆面盲袋</span>
                <b class="tuck2-grab-cta">¥${packPrice}/包 · 挑一包手撕抽水浒卡</b>
              </div>
            </div>

            <!-- 第二层：怀旧玩具四宫木格柜 -->
            <div class="tuck2-sec-plaque">怀旧玩具木格柜（入驻多宝格）</div>
            <div class="tuck2-cubbies">
              ${TUCK_GOODS.map(g => {
                const owned = state.items.includes(g.item);
                const p = Math.round(g.cost * disc);
                return `
                  <button class="tuck2-cubby ${owned ? 'owned' : ''}" data-buy-good="${g.id}" ${owned ? 'disabled' : ''}>
                    <div class="tc-box">${renderShelfToySvg(g.id)}</div>
                    <div class="tc-tag">
                      <span>${g.name}</span>
                      <b>${owned ? '已珍藏' : `¥${p}`}</b>
                    </div>
                  </button>
                `;
              }).join('')}
            </div>

            <!-- 第三层：玻璃糖果柜台 + 橘花店猫 & 课间找小周拍卡入口 -->
            <div class="tuck2-counter-row">
              <div class="tuck2-glass-case">
                <button class="tuck2-gift-item" id="t2-gift-friend" ${state.tuckGiftThisTurn ? 'disabled' : ''}>
                  <div class="tg-jar">${pxIcon('gift', 24)}</div>
                  <div class="tg-lbl"><span>请同桌大白兔</span><b>${state.tuckGiftThisTurn ? '本季已送' : '¥30 · +4亲密'}</b></div>
                </button>
                <button class="tuck2-gift-item" id="t2-gift-parents" ${state.tuckGiftThisTurn ? 'disabled' : ''}>
                  <div class="tg-jar warm">${pxIcon('snack', 24)}</div>
                  <div class="tg-lbl"><span>给爸妈热板栗</span><b>${state.tuckGiftThisTurn ? '本季已送' : '¥30 · +4亲密'}</b></div>
                </button>
              </div>

              <button class="tuck2-slap-entry ${dupCnt > 0 && unownedLeft > 0 ? 'ready' : ''}" id="t2-play-slap">
                <div class="ts-cat">${pxIcon('petCat', 26)}</div>
                <div class="ts-txt">
                  <b>拍水浒卡对决</b>
                  <small>${unownedLeft <= 0 ? '12张已全齐！' : dupCnt > 0 ? `重卡×${dupCnt} · 赢小周缺卡` : '有重卡可赢缺卡'}</small>
                </div>
              </button>
            </div>
          </div>

          <button class="tuck2-leave-btn" id="t2-leave">背上书包回家</button>
        </div>
      </div>
    `, host => {
      host.querySelector('#t2-leave').onclick = () => { clearOverlay(); renderMain(); };
      host.querySelector('#t2-open-binder').onclick = () => openBinderModal(ctx, renderShelf);

      const startPack = flavorIdx => {
        if (state.cash < packPrice) {
          showToast(`零花钱不足 ¥${packPrice}`);
          return;
        }
        state.cash -= packPrice;
        state.stats.mood = clamp(state.stats.mood + 1);
        saveAutoProgress();
        openTearNoodleModal(ctx, NOODLE_FLAVORS[flavorIdx] || NOODLE_FLAVORS[0], renderShelf);
      };

      host.querySelector('#t2-grab-any').onclick = () => startPack(Math.floor(Math.random() * NOODLE_FLAVORS.length));
      host.querySelectorAll('[data-pick-pack]').forEach(btn => {
        btn.onclick = () => startPack(Number(btn.dataset.pickPack));
      });

      host.querySelectorAll('[data-buy-good]').forEach(btn => {
        btn.onclick = () => {
          const res = buyTuckGood(state, btn.dataset.buyGood);
          saveAutoProgress();
          renderShelf();
          showToast(res.msg);
        };
      });

      host.querySelector('#t2-gift-friend').onclick = () => {
        const res = buyTuckGift(state, 'friend');
        saveAutoProgress();
        renderShelf();
        showToast(res.msg);
      };
      host.querySelector('#t2-gift-parents').onclick = () => {
        const res = buyTuckGift(state, 'parents');
        saveAutoProgress();
        renderShelf();
        showToast(res.msg);
      };

      host.querySelector('#t2-play-slap').onclick = () => {
        if (unownedLeft <= 0) {
          return showToast('恭喜！你已经集齐全部 12 张水浒英雄卡啦！');
        }
        if ((state.dupSnackCards || 0) <= 0) {
          return showToast('先拆干脆面攒下重复的水浒卡，就能拿重卡跟同桌小周拍卡赢缺卡！');
        }
        openCardSlapModal(ctx, renderShelf);
      };
    });
  };

  renderShelf();
}

// ==================== 2. 三步真实触屏手撕干脆面盲袋舞台 ====================
function rollOneWaterMarginCard(state) {
  const unowned = TUCK_CARDS_12.filter(c => !state.snackCards.includes(c));
  // 52% 概率抽新卡，48% 概率抽已拥有卡（让「重卡找小周拍洋画赢缺卡」玩法真实高频运转！）
  if (state.snackCards.length === 0 || (unowned.length > 0 && Math.random() < 0.52)) {
    return unowned[Math.floor(Math.random() * unowned.length)];
  }
  return TUCK_CARDS_12[Math.floor(Math.random() * TUCK_CARDS_12.length)];
}

export function openTearNoodleModal(ctx, flavor, onBackToShop) {
  const { state, mountOverlay, saveAutoProgress, showToast } = ctx;
  ensureTuckV2State(state);

  const rolledCard = rollOneWaterMarginCard(state);
  const isNew = !state.snackCards.includes(rolledCard);
  const isHolo = parseInt(rolledCard.slice(0, 2), 10) <= 6; // 前六位天罡名将带流光闪卡特效

  let step = 'tear'; // 'tear' | 'pull' | 'revealed'
  let tearPct = 0;
  let settled = false;
  let milestoneText = '';

  function commitCardResult() {
    if (settled) return;
    settled = true;
    if (isNew) {
      state.snackCards.push(rolledCard);
      milestoneText = checkWaterMarginMilestone(state);
    } else {
      state.dupSnackCards = (state.dupSnackCards || 0) + 1;
    }
    saveAutoProgress();
  }

  const renderStage = () => {
    const owned = state.snackCards;
    const disc = getBondTier(state, 'wealth') >= 2 ? 0.9 : 1.0;
    const nextPrice = Math.round(15 * disc);
    const unownedLeft = TUCK_CARDS_12.length - owned.length;

    mountOverlay(`
      <div class="tear-overlay">
        <div class="tear-top-pill">手撕干脆面 · 拆水浒英雄卡</div>

        <div class="tear-center-stage" id="tear-touch-zone">
          <!-- 揭晓或半露的水浒卡本体 -->
          <div class="wm-card-slot ${step === 'pull' ? 'peeking' : step === 'revealed' ? 'out flipped' : 'hidden-in-bag'}">
            <div class="wm-card-3d" id="wm-card-tap">
              <div class="wm-face wm-back">
                <div class="wm-back-frame">
                  <span>梁山泊英雄谱</span>
                  <b>水浒传</b>
                  <small>轻点或上滑揭晓</small>
                </div>
              </div>
              <div class="wm-face wm-front ${isHolo ? 'holo' : ''}">
                <div class="wm-front-tag">${isHolo ? '水浒英雄闪卡' : '水浒英雄珍藏卡'}</div>
                <div class="wm-portrait">${renderHeroPortraitSvg(rolledCard, 74)}</div>
                <div class="wm-hero-name">${rolledCard}</div>
                <div class="wm-stamp ${isNew ? 'new' : 'dup'}">${isNew ? '新收录' : '重卡+1'}</div>
              </div>
            </div>
          </div>

          <!-- 干脆面包装袋（支持封口撕裂位移与碎面渣喷溅） -->
          <div class="foil-bag ${step !== 'tear' ? 'torn' : ''} ${step === 'revealed' ? 'lowered' : ''}" style="--pk1:${flavor.c1};--pk2:${flavor.c2};">
            <div class="foil-top-strip" id="foil-strip">
              <div class="foil-saw-top"></div>
            </div>
            <div class="foil-cut-line ${step === 'tear' ? 'active' : ''}">
              <span>${step === 'tear' ? '手指沿虚线横划撕开包装袋' : ''}</span>
            </div>
            <div class="foil-body">
              <div class="foil-title">脆脆香干脆面</div>
              <div class="foil-noodle-art"></div>
              <div class="foil-flv-tag">${flavor.name}味 · 内附水浒卡</div>
            </div>
          </div>

          ${step === 'pull' ? `<div class="pull-hint-bar" id="pull-cta">上滑抽出英雄卡 · 轻点翻面</div>` : ''}
          ${milestoneText ? `<div class="tear-milestone-banner">${milestoneText}</div>` : ''}
        </div>

        <!-- 底部皮质《水浒传集换卡册》实时预览 + 下一步动作 -->
        <div class="tear-bottom-panel">
          <div class="tb-head">
            <b>水浒传集换卡册</b>
            <span>已集 ${owned.length}/12 · 重卡兜 ${state.dupSnackCards || 0} 张</span>
          </div>
          <div class="tb-open-book">
            <div class="tb-page">
              ${TUCK_CARDS_12.slice(0, 6).map((c, i) => {
                const has = owned.includes(c);
                return `<div class="tb-mini-slot ${has ? 'lit' : ''} ${step === 'revealed' && c === rolledCard ? 'just-got' : ''}">${has ? c.slice(3, 5) : i + 1}</div>`;
              }).join('')}
            </div>
            <div class="tb-page">
              ${TUCK_CARDS_12.slice(6, 12).map((c, i) => {
                const has = owned.includes(c);
                return `<div class="tb-mini-slot ${has ? 'lit' : ''} ${step === 'revealed' && c === rolledCard ? 'just-got' : ''}">${has ? c.slice(3, 5) : i + 7}</div>`;
              }).join('')}
            </div>
          </div>

          ${step === 'revealed' ? `
            <div class="tear-actions">
              ${!isNew && unownedLeft > 0 ? `<button class="btn primary" id="tr-go-slap" style="flex:1.3;">拿重卡找小周拍卡赢缺卡！</button>` : ''}
              <button class="btn secondary" id="tr-again" style="flex:1;" ${state.cash < nextPrice ? 'disabled' : ''}>再拆一包 (-¥${nextPrice})</button>
              <button class="btn ghost" id="tr-back" style="flex:0.85;">回货架</button>
            </div>
          ` : `
            <div class="tear-actions">
              <button class="btn secondary" id="tr-quick-step" style="width:100%;">
                ${step === 'tear' ? '手指横划袋口（或点此撕开）' : '上滑抽出卡片（或点此翻开）'}
              </button>
            </div>
          `}
        </div>
      </div>
    `, host => {
      const zone = host.querySelector('#tear-touch-zone');
      const strip = host.querySelector('#foil-strip');
      let startX = null, startY = null;

      const completeTear = () => {
        if (step !== 'tear') return;
        step = 'pull';
        triggerHaptic('heavy');
        renderStage();
      };

      const completePullAndFlip = () => {
        if (step === 'revealed') return;
        commitCardResult();
        step = 'revealed';
        triggerHaptic('heavy');
        renderStage();
      };

      zone.addEventListener('pointerdown', e => {
        startX = e.clientX;
        startY = e.clientY;
      });
      zone.addEventListener('pointermove', e => {
        if (startX === null) return;
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        if (step === 'tear' && Math.abs(dx) > 12) {
          tearPct = Math.min(1, Math.abs(dx) / 85);
          if (strip) {
            strip.style.transform = `translateX(${dx > 0 ? tearPct * 54 : -tearPct * 54}px) rotate(${dx > 0 ? -8 : 8}deg)`;
          }
          if (tearPct >= 0.82) {
            startX = null;
            completeTear();
          }
        } else if (step === 'pull' && dy < -32) {
          startX = null;
          completePullAndFlip();
        }
      });
      zone.addEventListener('pointerup', () => { startX = null; startY = null; });

      const cardTap = host.querySelector('#wm-card-tap');
      if (cardTap) {
        cardTap.onclick = () => {
          if (step === 'pull') completePullAndFlip();
        };
      }
      const pullCta = host.querySelector('#pull-cta');
      if (pullCta) pullCta.onclick = completePullAndFlip;

      const quickBtn = host.querySelector('#tr-quick-step');
      if (quickBtn) {
        quickBtn.onclick = () => {
          if (step === 'tear') completeTear();
          else completePullAndFlip();
        };
      }

      const slapBtn = host.querySelector('#tr-go-slap');
      if (slapBtn) slapBtn.onclick = () => openCardSlapModal(ctx, onBackToShop);

      const againBtn = host.querySelector('#tr-again');
      if (againBtn) {
        againBtn.onclick = () => {
          if (state.cash < nextPrice) return showToast('零花钱不足');
          state.cash -= nextPrice;
          state.stats.mood = clamp(state.stats.mood + 1);
          saveAutoProgress();
          openTearNoodleModal(ctx, NOODLE_FLAVORS[Math.floor(Math.random() * NOODLE_FLAVORS.length)], onBackToShop);
        };
      }

      const backBtn = host.querySelector('#tr-back');
      if (backBtn) backBtn.onclick = () => onBackToShop();
    });
  };

  renderStage();
}

// ==================== 3. 独立集换卡册翻阅弹窗 ====================
function openBinderModal(ctx, onBack) {
  const { state, mountOverlay, showToast } = ctx;
  ensureTuckV2State(state);
  const owned = state.snackCards;
  const dupCnt = state.dupSnackCards || 0;
  const unownedLeft = TUCK_CARDS_12.length - owned.length;

  mountOverlay(`
    <div class="sheet-modal"><div class="sheet-box" style="max-height:86%;display:flex;flex-direction:column;">
      <div class="sec-head-row" style="margin-bottom:6px;">
        <span class="sec-title">${pxIcon('card', 17)} 水浒传英雄集换册 (${owned.length}/12)</span>
        <span class="tag up">重卡兜 ×${dupCnt}</span>
      </div>
      <div class="mg-stats" style="margin-bottom:8px;">
        集满 4 / 8 / 12 张分别奖励 ¥120 / ¥300 / ¥600 零花钱 + 命运重随券！抽重了可找同桌小周拍卡赢缺卡。
      </div>
      <div class="binder-full-grid" style="flex:1;overflow-y:auto;min-height:0;">
        ${TUCK_CARDS_12.map(c => {
          const has = owned.includes(c);
          return `
            <div class="binder-hero-cell ${has ? 'owned' : 'locked'}">
              ${has ? renderHeroPortraitSvg(c, 48) : `<div class="bh-unk">待收集</div>`}
              <b>${has ? c.slice(3) : c.slice(0, 2) + ' 未知英雄'}</b>
            </div>
          `;
        }).join('')}
      </div>
      <div class="mg-actions" style="margin-top:8px;display:flex;gap:8px;">
        ${dupCnt > 0 && unownedLeft > 0 ? `<button class="btn primary" id="bd-slap" style="flex:1.3;">找小周拍卡赢缺卡 (重×${dupCnt})</button>` : ''}
        <button class="btn ghost" id="bd-close" style="flex:1;">返回小卖部</button>
      </div>
    </div></div>
  `, host => {
    host.querySelector('#bd-close').onclick = onBack;
    const sb = host.querySelector('#bd-slap');
    if (sb) sb.onclick = () => openCardSlapModal(ctx, onBack);
  });
}

// ==================== 4. 《课间同桌拍水浒卡（拍洋画对决）》精品物理小游戏 ====================
export function openCardSlapModal(ctx, onBack) {
  const { state, mountOverlay, saveAutoProgress, showToast } = ctx;
  ensureTuckV2State(state);

  const unowned = TUCK_CARDS_12.filter(c => !state.snackCards.includes(c));
  const stakeTarget = unowned[Math.floor(Math.random() * unowned.length)] || TUCK_CARDS_12[0];
  if (state.dupSnackCards > 0) state.dupSnackCards--;
  saveAutoProgress();

  mountOverlay(`<div class="sheet-modal"><div class="sheet-box" id="slap-host"></div></div>`, host => {
    runCardSlapCanvas(host.querySelector('#slap-host'), state, stakeTarget, res => {
      if (res.won) {
        if (!state.snackCards.includes(stakeTarget)) {
          state.snackCards.push(stakeTarget);
        }
        // 赢回自己的底注卡的同时拿走小周的缺卡！
        const mTxt = checkWaterMarginMilestone(state);
        if (!state.arcadeFirstS.includes('card_slap') && res.grade === 'S') {
          state.arcadeFirstS.push('card_slap');
          state.hexRerollTickets = (state.hexRerollTickets || 0) + 1;
        }
        state.stats.mood = clamp(state.stats.mood + 4);
        state.relations.friend.intimacy = clamp(state.relations.friend.intimacy + 2);
        saveAutoProgress();
        showToast(`拍翻成功！赢走小周的缺卡【${stakeTarget}】收入卡册！${mTxt ? ' · ' + mTxt : ''}`);
      } else {
        state.relations.friend.intimacy = clamp(state.relations.friend.intimacy + 3);
        state.stats.mood = clamp(state.stats.mood + 2);
        saveAutoProgress();
        showToast('差一点点没拍翻！小周笑嘻嘻收走重卡，同桌交情 +3');
      }
      onBack();
    });
  });
}

export function runCardSlapCanvas(container, state, targetCardStr, onFinish) {
  const W = 342, H = 228;
  let stance = 'cup'; // 'cup' 窝风弓手掌（稳） | 'chop' 斜切震桌掌（猛）
  let turnsLeft = 3; // 三拍机会内把目标缺卡拍翻即胜！
  let meter = 0.2;
  let meterDir = 1;
  let handSway = 0;
  let animState = 'aim'; // 'aim' | 'slam' | 'flip' | 'done'
  let slamT = 0;
  let flipAngle = 0;
  let willFlipWin = false;
  let dust = [];
  let statusTxt = `赌注上桌：小周押出缺卡【${targetCardStr.slice(3)}】！选好掌法抓金区拍下！`;
  let alive = true;
  let rafId = 0;

  container.innerHTML = `
    <div class="mg-box arc-box">
      <div class="mg-head">
        <h3 style="display:flex;align-items:center;gap:6px;">${pxIcon('card', 16)} 课间拍水浒卡 · 对决小周</h3>
        <button class="btn ghost" id="slap-auto">保底和局</button>
      </div>
      <div class="arc-hud">
        <span>目标缺卡：<b>${targetCardStr.slice(3)}</b></span>
        <span>剩余拍数：<b id="slap-turns">3</b>/3</span>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;">
        <button class="pill-btn primary" id="st-cup">窝风弓手掌（甜区宽·稳）</button>
        <button class="pill-btn soft" id="st-chop">斜切震桌掌（窄区·秒翻）</button>
      </div>
      <div class="arc-canvas-wrap">
        <canvas id="slap-cv"></canvas>
      </div>
      <button class="btn primary arc-hold-btn" id="slap-hit">看准右侧金色爆风区 · 落掌猛拍课桌！</button>
    </div>
  `;

  const cv = container.querySelector('#slap-cv');
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  cv.width = W * dpr; cv.height = H * dpr;
  cv.style.width = `${W}px`; cv.style.height = `${H}px`;
  const ctx = cv.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const cupBtn = container.querySelector('#st-cup');
  const chopBtn = container.querySelector('#st-chop');
  const turnsEl = container.querySelector('#slap-turns');
  const hitBtn = container.querySelector('#slap-hit');

  const syncStanceBtns = () => {
    cupBtn.className = `pill-btn ${stance === 'cup' ? 'primary' : 'soft'}`;
    chopBtn.className = `pill-btn ${stance === 'chop' ? 'primary' : 'soft'}`;
  };
  cupBtn.onclick = () => { stance = 'cup'; syncStanceBtns(); };
  chopBtn.onclick = () => { stance = 'chop'; syncStanceBtns(); };

  container.querySelector('#slap-auto').onclick = () => {
    alive = false;
    cancelAnimationFrame(rafId);
    onFinish({ won: Math.random() < 0.5, grade: 'B' });
  };

  function doSlap() {
    if (!alive || animState !== 'aim' || turnsLeft <= 0) return;
    turnsLeft--;
    turnsEl.textContent = String(turnsLeft);
    animState = 'slam';
    slamT = 0;

    // 甜区范围：窝风掌 0.62~0.90（宽28%），斜切掌 0.74~0.90（窄16%）
    const zMin = stance === 'cup' ? 0.62 : 0.74;
    const zMax = 0.90;
    const inSweet = meter >= zMin && meter <= zMax;
    const nearSweet = meter >= zMin - 0.12 && meter <= zMax + 0.06;

    if (stance === 'chop') {
      willFlipWin = inSweet ? true : (nearSweet ? Math.random() < 0.35 : false);
    } else {
      willFlipWin = inSweet ? Math.random() < 0.85 : (nearSweet ? Math.random() < 0.42 : false);
    }
    // 第三拍保底防非酋：只要进过附近甜区给高概率翻面
    if (turnsLeft === 0 && nearSweet) willFlipWin = true;

    triggerHaptic(inSweet ? 'heavy' : 'medium');
    for (let i = 0; i < 18; i++) {
      const a = (Math.PI * 2 * i) / 18;
      dust.push({ x: W / 2 - 14, y: 128, vx: Math.cos(a) * (45 + Math.random() * 60), vy: Math.sin(a) * 35 - 20, life: 0.7 });
    }
    statusTxt = inSweet ? '正中金色爆风区！猛烈掌风掀起卡片！' : (nearSweet ? '掌风擦边掀起一角…' : '哎呀漏风了，拍得手心发麻！');
  }

  hitBtn.addEventListener('pointerdown', e => { e.preventDefault(); doSlap(); });
  cv.addEventListener('pointerdown', e => { e.preventDefault(); doSlap(); });

  let lastTs = performance.now();
  function loop(now) {
    if (!alive) return;
    const dt = Math.min(0.05, (now - lastTs) / 1000);
    lastTs = now;
    handSway += dt;

    if (animState === 'aim') {
      const spd = stance === 'chop' ? 1.55 : 1.18;
      meter += meterDir * dt * spd;
      if (meter >= 1) { meter = 1; meterDir = -1; }
      if (meter <= 0.05) { meter = 0.05; meterDir = 1; }
    } else if (animState === 'slam') {
      slamT += dt * 4.2;
      if (slamT >= 1) {
        animState = 'flip';
        flipAngle = 0;
      }
    } else if (animState === 'flip') {
      const targetAngle = willFlipWin ? Math.PI : Math.PI * 0.58;
      flipAngle += dt * 7.2;
      if (flipAngle >= targetAngle) {
        flipAngle = targetAngle;
        if (willFlipWin) {
          animState = 'done';
          statusTxt = `漂亮掀翻！赢得【${targetCardStr}】！`;
          setTimeout(() => {
            if (!alive) return;
            alive = false;
            onFinish({ won: true, grade: turnsLeft >= 2 ? 'S' : 'A' });
          }, 760);
        } else if (turnsLeft > 0) {
          setTimeout(() => {
            if (!alive) return;
            animState = 'aim';
            flipAngle = 0;
            statusTxt = `小周拍空一掌轮到你！剩 ${turnsLeft} 拍机会，瞄准金区！`;
          }, 420);
          animState = 'pause';
        } else {
          animState = 'done';
          setTimeout(() => {
            if (!alive) return;
            alive = false;
            onFinish({ won: false, grade: 'C' });
          }, 680);
        }
      }
    }

    // 绘制老式木纹课桌与三八线刻痕
    ctx.fillStyle = '#b47b48';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#9a6538';
    ctx.fillRect(0, 0, W, 32);
    ctx.strokeStyle = 'rgba(74,55,40,0.22)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(24, 52); ctx.lineTo(W - 60, 52);
    ctx.moveTo(W / 2 - 18, 36); ctx.lineTo(W / 2 - 18, H - 14);
    ctx.stroke();

    ctx.fillStyle = '#fffdf8';
    ctx.font = 'bold 10.5px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(statusTxt, W / 2, 20);

    // 课桌中央叠放的两张水浒卡（底注卡 + 小周缺卡）
    const cx = W / 2 - 16, cy = 124;
    // 底注卡
    ctx.save();
    ctx.translate(cx - 10, cy + 4);
    ctx.rotate(-0.12);
    ctx.fillStyle = '#7c2d12';
    ctx.fillRect(-26, -34, 52, 68);
    ctx.strokeStyle = '#fde047';
    ctx.lineWidth = 2;
    ctx.strokeRect(-23, -31, 46, 62);
    ctx.restore();

    // 目标翻转卡（3D 纵向缩放模拟真实掀翻！）
    ctx.save();
    const liftY = animState === 'flip' ? Math.sin(Math.min(1, flipAngle / Math.PI) * Math.PI) * 42 : 0;
    const scaleX = Math.cos(flipAngle);
    const showingFront = flipAngle > Math.PI / 2;
    ctx.translate(cx + 8, cy - liftY);
    ctx.scale(Math.abs(scaleX) < 0.08 ? 0.08 : Math.abs(scaleX), 1);
    ctx.fillStyle = showingFront ? '#fef3c7' : '#991b1b';
    ctx.fillRect(-28, -36, 56, 72);
    ctx.strokeStyle = '#4a3728';
    ctx.lineWidth = 2.2;
    ctx.strokeRect(-28, -36, 56, 72);
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(-24, -32, 48, 64);
    ctx.fillStyle = showingFront ? '#7c2d12' : '#fde68a';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(showingFront ? targetCardStr.slice(3) : '水浒英雄', 0, 4);
    if (showingFront) {
      ctx.fillStyle = '#15803d';
      ctx.font = 'bold 9px sans-serif';
      ctx.fillText('正面朝上！', 0, 20);
    }
    ctx.restore();

    // 悬停或拍下的手掌投影
    const hx = cx - 44 + Math.sin(handSway * 3.2) * 8;
    const hy = animState === 'slam' ? cy + 8 : cy - 12 + Math.cos(handSway * 2.5) * 4;
    ctx.save();
    ctx.translate(hx, hy);
    ctx.scale(animState === 'slam' ? 1.12 : 1, animState === 'slam' ? 0.92 : 1);
    ctx.fillStyle = animState === 'slam' ? '#f59e0b' : 'rgba(254, 215, 170, 0.88)';
    ctx.beginPath();
    ctx.ellipse(0, 0, stance === 'cup' ? 24 : 18, stance === 'cup' ? 28 : 32, stance === 'chop' ? 0.35 : 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#4a3728';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#4a3728';
    ctx.font = 'bold 9.5px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(stance === 'cup' ? '窝风掌' : '斜切掌', 0, 4);
    ctx.restore();

    // 粉笔灰气浪粒子
    dust = dust.filter(p => p.life > 0);
    for (const p of dust) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt * 1.4;
      ctx.save();
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.fillStyle = '#fffbeb';
      ctx.beginPath(); ctx.arc(p.x, p.y, 3.2, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }

    // 右侧掌风蓄力槽与金色爆风甜区
    const bx = W - 36, by = 46, bw = 16, bh = 156;
    ctx.fillStyle = 'rgba(30, 20, 12, 0.68)';
    ctx.fillRect(bx, by, bw, bh);
    ctx.strokeStyle = '#4a3728';
    ctx.lineWidth = 2;
    ctx.strokeRect(bx, by, bw, bh);

    const zMin = stance === 'cup' ? 0.62 : 0.74;
    const zMax = 0.90;
    const zyTop = by + bh * (1 - zMax);
    const zyH = bh * (zMax - zMin);
    ctx.fillStyle = '#fde047';
    ctx.fillRect(bx + 2, zyTop, bw - 4, zyH);

    const curY = by + bh * (1 - meter);
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(bx - 4, curY - 3, bw + 8, 6);

    rafId = requestAnimationFrame(loop);
  }
  rafId = requestAnimationFrame(loop);
}
