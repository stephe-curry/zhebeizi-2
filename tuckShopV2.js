// 《这辈子 2.0》Sprint 4 —— 千禧校门口小卖部 V2（三层实景木货架 + 手撕干脆面三步真实交互 + 课间同桌拍水浒卡对决）
// 严格遵循纯中文零表情符号规范。

import { getBondTier, hasHex } from './hextech.js?v=s70';
import { TUCK_CARDS_12, TUCK_GOODS, buyTuckGood, buyTuckGift } from './lifeFeatures.js?v=s70';
import { triggerHaptic } from './vfxAndUi.js?v=s70';
import { pxIcon } from './icons.js?v=s70';

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
    const disc = (getBondTier(state, 'wealth') >= 2 || state.origin?.id === 'merchant') ? 0.9 : 1.0;
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
    const disc = (getBondTier(state, 'wealth') >= 2 || state.origin?.id === 'merchant') ? 0.9 : 1.0;
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

// ==================== 4. 《课间拍水浒卡 2.0》（第一人称立体双手 + 微翘迎风口 + 三掌法 + 小周四阶回合博弈） ====================
let slapAudioCtx = null;
function playDeskSlapSfx(power = 1.0, isFlip = false) {
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    if (!slapAudioCtx) slapAudioCtx = new AC();
    if (slapAudioCtx.state === 'suspended') slapAudioCtx.resume();
    const now = slapAudioCtx.currentTime;

    // 木课桌低频共鸣闷响
    const osc = slapAudioCtx.createOscillator();
    const g1 = slapAudioCtx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(115 * power, now);
    osc.frequency.exponentialRampToValueAtTime(38, now + 0.13);
    g1.gain.setValueAtTime(Math.min(0.28, 0.18 * power), now);
    g1.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
    osc.connect(g1);
    g1.connect(slapAudioCtx.destination);
    osc.start(now);
    osc.stop(now + 0.15);

    // 巴掌清脆拍击白噪脉冲
    const bufLen = Math.floor(slapAudioCtx.sampleRate * 0.065);
    const buf = slapAudioCtx.createBuffer(1, bufLen, slapAudioCtx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufLen; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufLen * 0.28));
    }
    const noise = slapAudioCtx.createBufferSource();
    const g2 = slapAudioCtx.createGain();
    noise.buffer = buf;
    g2.gain.setValueAtTime(Math.min(0.26, 0.16 * power), now);
    g2.gain.exponentialRampToValueAtTime(0.001, now + 0.065);
    noise.connect(g2);
    g2.connect(slapAudioCtx.destination);
    noise.start(now);

    if (isFlip) {
      const winOsc = slapAudioCtx.createOscillator();
      const gw = slapAudioCtx.createGain();
      winOsc.type = 'sine';
      winOsc.frequency.setValueAtTime(523, now + 0.08);
      winOsc.frequency.setValueAtTime(784, now + 0.18);
      gw.gain.setValueAtTime(0.14, now + 0.08);
      gw.gain.exponentialRampToValueAtTime(0.001, now + 0.34);
      winOsc.connect(gw);
      gw.connect(slapAudioCtx.destination);
      winOsc.start(now + 0.08);
      winOsc.stop(now + 0.35);
    }
  } catch (_) {}
}

function renderHandTechSvg(kind) {
  if (kind === 'cup') {
    return `<svg width="38" height="28" viewBox="0 0 44 32" aria-hidden="true">
      <path d="M9,22 Q16,10 31,12 L37,15 L36,24 L14,25 Z" fill="#f6cfa6" stroke="#4a3728" stroke-width="1.8"/>
      <path d="M12,17 Q20,14 28,16" fill="none" stroke="#8a5a3c" stroke-width="1.4"/>
      <rect x="33" y="13" width="8" height="12" rx="2" fill="#c9594a" stroke="#4a3728" stroke-width="1.6"/>
      <line x1="36" y1="13" x2="36" y2="25" stroke="#fff8eb" stroke-width="1.6"/>
    </svg>`;
  }
  if (kind === 'chop') {
    return `<svg width="38" height="28" viewBox="0 0 44 32" aria-hidden="true">
      <path d="M10,25 L28,7 L34,12 L18,28 Z" fill="#f6cfa6" stroke="#4a3728" stroke-width="1.8"/>
      <path d="M8,16 Q18,6 28,5" fill="none" stroke="#d97706" stroke-width="1.5" stroke-dasharray="3 2"/>
      <rect x="9" y="21" width="9" height="8" rx="2" transform="rotate(-38 13 25)" fill="#c9594a" stroke="#4a3728" stroke-width="1.5"/>
    </svg>`;
  }
  return `<svg width="38" height="28" viewBox="0 0 44 32" aria-hidden="true">
    <path d="M21,5 L14,23 L21,25 Z" fill="#f6cfa6" stroke="#4a3728" stroke-width="1.7"/>
    <path d="M23,5 L30,23 L23,25 Z" fill="#f2c091" stroke="#4a3728" stroke-width="1.7"/>
    <rect x="11" y="22" width="9" height="6" rx="1.5" fill="#c9594a" stroke="#4a3728" stroke-width="1.4"/>
    <rect x="24" y="22" width="9" height="6" rx="1.5" fill="#c9594a" stroke="#4a3728" stroke-width="1.4"/>
  </svg>`;
}

export function openCardSlapModal(ctx, onBack) {
  const { state, mountOverlay, saveAutoProgress, showToast } = ctx;
  ensureTuckV2State(state);

  const unowned = TUCK_CARDS_12.filter(c => !state.snackCards.includes(c));
  const stakeTarget = unowned[Math.floor(Math.random() * unowned.length)] || TUCK_CARDS_12[0];
  if (state.dupSnackCards > 0) state.dupSnackCards--;
  saveAutoProgress();

  const mountDuel = () => {
    mountOverlay(`<div class="sheet-modal"><div class="sheet-box slap2-sheet" id="slap-host"></div></div>`, host => {
      runCardSlapCanvas(host.querySelector('#slap-host'), state, stakeTarget, res => {
        if (res.rematch) {
          mountDuel();
          return;
        }
        if (res.won) {
          if (!state.snackCards.includes(stakeTarget)) {
            state.snackCards.push(stakeTarget);
          }
          const mTxt = checkWaterMarginMilestone(state);
          if (!state.arcadeFirstS.includes('card_slap') && res.grade === 'S') {
            state.arcadeFirstS.push('card_slap');
            state.hexRerollTickets = (state.hexRerollTickets || 0) + 1;
          }
          state.stats.mood = clamp(state.stats.mood + 5);
          state.relations.friend.intimacy = clamp(state.relations.friend.intimacy + 2);
          saveAutoProgress();
          showToast(`漂亮掀翻 180 度！赢下小周的缺卡【${stakeTarget}】收入卡册！${mTxt ? ' · ' + mTxt : ''}`);
        } else {
          state.relations.friend.intimacy = clamp(state.relations.friend.intimacy + 3);
          state.stats.mood = clamp(state.stats.mood + 2);
          saveAutoProgress();
          showToast('被小周趁翘角截胡啦！不过课间玩得痛快，同桌交情 +3');
        }
        if (onBack) onBack();
      });
    });
  };
  mountDuel();
}

const STAGE_NAMES = ['平贴桌面', '震松微翘', '悬边半立', '彻底翻面'];

export function runCardSlapCanvas(container, state, targetCardStr, onFinish) {
  const W = 346, H = 294;
  const deskCx = W / 2, deskCy = 166;

  // 0: 平贴桌面, 1: 震松微翘, 2: 悬边半立, 3: 180度彻底翻面通吃
  let cardStage = 1; // 开局带天然微翘迎风口，第一眼就有策略目标！
  let windSide = Math.random() < 0.65 ? 'right' : 'left'; // 微翘迎风口朝向
  let stance = 'cup'; // 'cup' 弓掌窝风 | 'chop' 斜切扇风 | 'quake' 合十震山
  let spirit = 60; // 满 100 可发动「合十震山」双手绝招
  let quakeCooldown = 0;
  let roundNum = 1;
  const maxRounds = 4;

  // 玩家右手掌心在桌面上的瞄准坐标（支持单指自由拖动找黄金吃风带！）
  let aimX = windSide === 'right' ? deskCx + 52 : deskCx - 52;
  let aimY = deskCy + 16;
  let dragging = false;

  // 按住蓄气缩圈状态
  let charging = false;
  let chargeRing = 1.0; // 1.0 -> 0.25 循环收缩，落在 0.36..0.66 金环区发力最猛
  let chargeDir = -1;

  // 动画状态机：'player_aim' | 'player_slam' | 'card_react' | 'rival_turn' | 'result'
  let phase = 'player_aim';
  let phaseT = 0;
  let shakeT = 0;
  let shakeAmp = 0;
  let rivalBubble = '“这把卡翘角了，看你能不能找准风口拍翻！”';
  let rivalMood = 'smug'; // 'smug' | 'nervous' | 'shock' | 'laugh'
  let rivalSlapT = 0;
  let pendingStage = cardStage;
  let flipAnimDeg = 0;
  let wonGame = false;
  let dust = [];
  let windPuffs = [];
  let floatTips = [];
  let alive = true;
  let rafId = 0;

  // 计算当前迎风口外 1–2cm 的「黄金吃风带」理想靶心坐标
  const getSweetSpot = () => ({
    x: windSide === 'right' ? deskCx + 48 : deskCx - 48,
    y: deskCy + 12
  });

  container.innerHTML = `
    <div class="slap2-box">
      <div class="slap2-header">
        <div class="slap2-title-row">
          <h3>课间拍水浒卡 · 对决小周</h3>
          <button class="btn ghost slap2-skip" id="slap-auto">保底和局</button>
        </div>
        <div class="slap2-sub-bar">
          <span>押注：重卡 vs 缺卡<b>【${targetCardStr.slice(3)}】</b></span>
          <span>卡态：<b id="slap-stage-txt">${STAGE_NAMES[cardStage]}</b></span>
        </div>
      </div>

      <div class="slap2-canvas-frame">
        <canvas id="slap2-cv"></canvas>
      </div>

      <div class="slap2-action-hint" id="slap-hint-bar">
        拖动手掌贴准金色【黄金吃风带】 · 按住蓄气缩圈至金环松手猛拍！
      </div>

      <div class="slap2-tech-grid">
        <button class="slap2-tech active" data-st="cup">
          <div class="st-art">${renderHandTechSvg('cup')}</div>
          <b>【弓掌窝风】</b>
          <small>吃风稳·甜区宽</small>
        </button>
        <button class="slap2-tech" data-st="chop">
          <div class="st-art">${renderHandTechSvg('chop')}</div>
          <b>【斜切扇风】</b>
          <small>风刃猛·破平贴</small>
        </button>
        <button class="slap2-tech" data-st="quake" id="st-quake-btn">
          <div class="st-art">${renderHandTechSvg('quake')}</div>
          <b>【合十震山】</b>
          <small id="st-quake-sub">气势 60%</small>
        </button>
      </div>
    </div>
  `;

  const cv = container.querySelector('#slap2-cv');
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  cv.width = Math.round(W * dpr);
  cv.height = Math.round(H * dpr);
  cv.style.width = `${W}px`;
  cv.style.height = `${H}px`;
  const ctx = cv.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const stageTxtEl = container.querySelector('#slap-stage-txt');
  const hintBarEl = container.querySelector('#slap-hint-bar');
  const quakeSubEl = container.querySelector('#st-quake-sub');
  const techBtns = container.querySelectorAll('.slap2-tech');

  function syncTechUi() {
    const canQuake = spirit >= 100 && quakeCooldown <= 0;
    if (stance === 'quake' && !canQuake) stance = 'cup';
    techBtns.forEach(b => {
      const k = b.dataset.st;
      b.classList.toggle('active', k === stance);
      if (k === 'quake') {
        b.classList.toggle('ready', canQuake);
        quakeSubEl.textContent = quakeCooldown > 0 ? '震麻冷却中' : (canQuake ? '满气可放!' : `气势 ${Math.min(100, spirit)}%`);
      }
    });
  }
  syncTechUi();

  techBtns.forEach(btn => {
    btn.onclick = () => {
      if (phase !== 'player_aim') return;
      const k = btn.dataset.st;
      if (k === 'quake' && (spirit < 100 || quakeCooldown > 0)) {
        floatTips.push({ x: W / 2, y: H - 55, txt: quakeCooldown > 0 ? '双手刚震麻，缓一拍再用！' : '再拍一掌攒满气势即可合十震山！', col: '#fde68a', life: 0.9 });
        return;
      }
      stance = k;
      triggerHaptic('light');
      syncTechUi();
    };
  });

  container.querySelector('#slap-auto').onclick = () => {
    alive = false;
    cancelAnimationFrame(rafId);
    onFinish({ won: true, grade: 'B' });
  };

  function toCanvasPos(e) {
    const rect = cv.getBoundingClientRect();
    const scaleX = W / Math.max(1, rect.width);
    const scaleY = H / Math.max(1, rect.height);
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  }

  function spawnSlapParticles(x, y, count = 20, power = 1) {
    for (let i = 0; i < count; i++) {
      const ang = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.3;
      const spd = (42 + Math.random() * 75) * power;
      dust.push({
        x, y,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd * 0.65 - 18,
        r: 2 + Math.random() * 2.8,
        life: 0.55 + Math.random() * 0.3
      });
    }
    windPuffs.push({ x, y, r: 10, maxR: 58 * power, life: 0.36 });
  }

  function releasePlayerSlap() {
    if (!alive || phase !== 'player_aim') return;
    charging = false;
    phase = 'player_slam';
    phaseT = 0;

    const sweet = getSweetSpot();
    const dist = Math.hypot(aimX - sweet.x, aimY - sweet.y);
    // 判定是否压死卡背正中
    const onCardCenter = Math.hypot(aimX - deskCx, aimY - deskCy) < 23;
    // 缩圈发力时机（0.34 ~ 0.68 为黄金发力环）
    const goodTiming = chargeRing >= 0.34 && chargeRing <= 0.68;
    const timingScore = goodTiming ? 1.0 : 0.65;

    let stageDelta = 0;
    let feedback = '';
    let fbCol = '#fde047';

    if (stance === 'quake') {
      spirit = 0;
      quakeCooldown = 1;
      shakeT = 0.34;
      shakeAmp = 7.5;
      stageDelta = (dist < 42 && !onCardCenter) ? 3 : 2;
      feedback = stageDelta >= 3 ? '合十震山·正中风口秒翻！！' : '双手震山·桌面狂颤掀立！！';
      playDeskSlapSfx(1.55, cardStage + stageDelta >= 3);
      triggerHaptic('heavy');
      spawnSlapParticles(deskCx, deskCy + 10, 28, 1.45);
    } else if (onCardCenter) {
      // 真实童年规则：直接砸在卡背正中，声音响但把卡死死压扁！
      stageDelta = cardStage > 0 ? -1 : 0;
      shakeT = 0.16;
      shakeAmp = 3.5;
      feedback = '砸中卡背正中！把卡压扁漏风啦！';
      fbCol = '#fca5a5';
      playDeskSlapSfx(0.95, false);
      triggerHaptic('medium');
      spawnSlapParticles(aimX, aimY, 12, 0.8);
    } else {
      const sweetRadius = stance === 'cup' ? 34 : 25;
      const inSweet = dist <= sweetRadius;
      const nearSweet = dist <= sweetRadius + 22;
      shakeT = 0.22;
      shakeAmp = stance === 'chop' ? 5.2 : 4.0;

      if (inSweet && goodTiming) {
        stageDelta = (stance === 'chop' || cardStage >= 1) ? 2 : 2;
        feedback = stance === 'chop' ? '斜切黄金风口·狂风灌底 +2阶！' : '窝风掌正中气缝·猛掀 +2阶！';
      } else if (inSweet || (nearSweet && goodTiming)) {
        stageDelta = 1;
        feedback = '掌风灌入翘角·震起卡片 +1阶！';
        fbCol = '#86efac';
      } else if (nearSweet) {
        stageDelta = cardStage === 0 ? 1 : (Math.random() < 0.65 ? 1 : 0);
        feedback = stageDelta > 0 ? '掌风擦边微翘一角！' : '离风口偏了一点点，掌风散了';
        fbCol = '#fde68a';
      } else {
        stageDelta = 0;
        feedback = '拍得太远漏风啦！拖动掌影靠近金月亮！';
        fbCol = '#fca5a5';
      }
      spirit = Math.min(100, spirit + 45);
      playDeskSlapSfx(inSweet ? 1.25 : 0.9, cardStage + stageDelta >= 3);
      triggerHaptic(inSweet ? 'heavy' : 'light');
      spawnSlapParticles(aimX, aimY, inSweet ? 22 : 12, inSweet ? 1.15 : 0.8);
    }

    if (quakeCooldown > 0 && stance !== 'quake') quakeCooldown = Math.max(0, quakeCooldown - 1);
    pendingStage = Math.max(0, Math.min(3, cardStage + stageDelta));
    floatTips.push({ x: deskCx, y: deskCy - 36, txt: feedback, col: fbCol, life: 1.05 });
    syncTechUi();
  }

  cv.addEventListener('pointerdown', e => {
    e.preventDefault();
    if (phase !== 'player_aim') return;
    const p = toCanvasPos(e);
    // 允许直接点按/拖动调整落点并同步进入抬手蓄气
    if (p.y >= 88) {
      aimX = Math.max(54, Math.min(W - 54, p.x));
      aimY = Math.max(114, Math.min(H - 42, p.y));
    }
    dragging = true;
    charging = true;
    chargeRing = 0.95;
    chargeDir = -1;
  });

  cv.addEventListener('pointermove', e => {
    if (!dragging || phase !== 'player_aim') return;
    const p = toCanvasPos(e);
    aimX = Math.max(54, Math.min(W - 54, p.x));
    aimY = Math.max(114, Math.min(H - 42, p.y));
  });

  const endPointer = () => {
    if (!dragging) return;
    dragging = false;
    if (phase === 'player_aim' && charging) {
      releasePlayerSlap();
    }
  };
  cv.addEventListener('pointerup', endPointer);
  cv.addEventListener('pointercancel', endPointer);

  // 点击提示条也可快捷自动对准并发掌（单手懒人友善）
  hintBarEl.onclick = () => {
    if (phase !== 'player_aim') return;
    const sw = getSweetSpot();
    aimX = sw.x + (Math.random() - 0.5) * 14;
    aimY = sw.y + (Math.random() - 0.5) * 10;
    chargeRing = 0.50;
    releasePlayerSlap();
  };

  function runXiaoZhouTurn() {
    phase = 'rival_turn';
    phaseT = 0;
    rivalSlapT = 0;
    if (cardStage === 2) {
      rivalMood = 'smug';
      rivalBubble = '“哈哈半立起来了！看我这巴掌能不能捡漏！”';
    } else {
      rivalMood = 'smug';
      rivalBubble = '“轮到我拍！看我的旋风巴掌！”';
    }
  }

  function resolveXiaoZhouImpact() {
    const rx = deskCx + (windSide === 'right' ? -38 : 38);
    const ry = deskCy - 8;
    shakeT = 0.18;
    shakeAmp = 3.8;
    playDeskSlapSfx(0.95, false);
    spawnSlapParticles(rx, ry, 15, 0.95);

    // 只有到了第 4 回合玩家仍未拍翻且卡处于半立时，小周才有机会截胡；前几回合小周会帮震松或拍偏制造刺激感！
    if (cardStage === 2 && roundNum >= maxRounds) {
      cardStage = 3;
      wonGame = false;
      flipAnimDeg = 180;
      rivalMood = 'laugh';
      rivalBubble = '“耶！！被我捡漏拍翻咯！”';
      stageTxtEl.textContent = '被小周截胡';
      showResultBanner(false);
      return;
    }

    if (cardStage === 0) {
      cardStage = 1;
      windSide = Math.random() < 0.5 ? 'right' : 'left';
      rivalMood = 'nervous';
      rivalBubble = '“哎呀只把卡震翘了一角，便宜你了！”';
      floatTips.push({ x: deskCx, y: deskCy - 34, txt: '小周把死卡震翘角了！快抓迎风口！', col: '#86efac', life: 1.1 });
    } else if (cardStage === 2) {
      // 小周发力过猛擦边没翻过去，换了翘角侧！
      windSide = windSide === 'right' ? 'left' : 'right';
      rivalMood = 'nervous';
      rivalBubble = '“嘶——手拍麻了居然没翻过去！你别抢啊！”';
      floatTips.push({ x: deskCx, y: deskCy - 34, txt: '小周差口气没拍翻！绝杀机会！', col: '#fde047', life: 1.1 });
    } else {
      rivalMood = 'nervous';
      rivalBubble = '“啧，拍偏漏风了，该你了！”';
    }

    roundNum++;
    stageTxtEl.textContent = STAGE_NAMES[cardStage];
    const sw = getSweetSpot();
    aimX = sw.x + (windSide === 'right' ? 12 : -12);
    aimY = sw.y + 10;
  }

  function showResultBanner(playerWon) {
    phase = 'result';
    if (playerWon) {
      hintBarEl.innerHTML = `<b style="color:#15803d;">成功拍翻【${targetCardStr.slice(3)}】！正在收入集卡册…</b>`;
      setTimeout(() => {
        if (!alive) return;
        alive = false;
        onFinish({ won: true, grade: roundNum <= 2 ? 'S' : 'A' });
      }, 1150);
    } else {
      hintBarEl.innerHTML = `
        <span>惜败被小周截胡！</span>
        <button class="pill-btn primary" id="slap-rematch" style="height:26px;padding:0 10px;font-size:11px;margin-left:6px;">不服再战一局</button>
        <button class="pill-btn soft" id="slap-accept" style="height:26px;padding:0 10px;font-size:11px;margin-left:4px;">认输涨交情</button>
      `;
      const rm = hintBarEl.querySelector('#slap-rematch');
      const ac = hintBarEl.querySelector('#slap-accept');
      if (rm) rm.onclick = (ev) => { ev.stopPropagation(); alive = false; cancelAnimationFrame(rafId); onFinish({ rematch: true }); };
      if (ac) ac.onclick = (ev) => { ev.stopPropagation(); alive = false; cancelAnimationFrame(rafId); onFinish({ won: false, grade: 'B' }); };
    }
  }

  // 绘制带条纹校服袖口的立体儿童手掌
  function drawKidHand(x, y, opts = {}) {
    const {
      isLeft = false,
      mode = 'cup', // 'rest' | 'cup' | 'chop' | 'quake_pair'
      lift = 0,
      slamSquash = 0,
      tingle = false
    } = opts;

    ctx.save();
    ctx.translate(x, y - lift * 22);
    if (slamSquash > 0) ctx.scale(1 + slamSquash * 0.14, 1 - slamSquash * 0.12);

    const skin = tingle ? '#f7b499' : '#f7cfa8';
    const skinDark = '#e3b083';
    const outline = '#4a3222';

    if (mode === 'quake_pair') {
      // 双手合十高举震山大招手型！
      for (const dir of [-1, 1]) {
        ctx.save();
        ctx.scale(dir, 1);
        ctx.fillStyle = skin;
        ctx.strokeStyle = outline;
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.moveTo(-4, -36);
        ctx.quadraticCurveTo(-22, -16, -24, 14);
        ctx.lineTo(-8, 26);
        ctx.lineTo(-2, 16);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // 红白条纹校服护腕袖口
        ctx.translate(-20, 26);
        ctx.rotate(0.32);
        ctx.fillStyle = '#c84b39';
        ctx.fillRect(-16, 0, 32, 34);
        ctx.fillStyle = '#fff8ee';
        ctx.fillRect(-16, 6, 32, 5);
        ctx.fillRect(-16, 16, 32, 5);
        ctx.strokeRect(-16, 0, 32, 34);
        ctx.restore();
      }
      ctx.restore();
      return;
    }

    if (isLeft) {
      // 左手自然扶住课桌左下沿稳住重心
      ctx.rotate(-0.14);
      ctx.fillStyle = 'rgba(45,26,12,0.22)';
      ctx.beginPath(); ctx.ellipse(4, 10, 32, 24, 0, 0, Math.PI * 2); ctx.fill();

      ctx.fillStyle = skin;
      ctx.strokeStyle = outline;
      ctx.lineWidth = 2.1;
      ctx.beginPath();
      ctx.moveTo(-26, 26);
      ctx.lineTo(-28, -4);
      ctx.quadraticCurveTo(-27, -22, -19, -22);
      ctx.quadraticCurveTo(-14, -22, -13, -6);
      ctx.lineTo(-12, -26);
      ctx.quadraticCurveTo(-6, -30, -3, -25);
      ctx.lineTo(-2, -6);
      ctx.lineTo(1, -25);
      ctx.quadraticCurveTo(8, -28, 10, -22);
      ctx.lineTo(9, -4);
      ctx.lineTo(13, -18);
      ctx.quadraticCurveTo(19, -20, 20, -13);
      ctx.lineTo(18, 6);
      ctx.lineTo(29, 0);
      ctx.quadraticCurveTo(35, 3, 31, 11);
      ctx.lineTo(16, 28);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // 左袖口
      ctx.fillStyle = '#c84b39';
      ctx.fillRect(-26, 24, 46, 42);
      ctx.fillStyle = '#fff8ee';
      ctx.fillRect(-26, 30, 46, 6);
      ctx.fillRect(-26, 42, 46, 6);
      ctx.strokeRect(-26, 24, 46, 42);
      ctx.restore();
      return;
    }

    // 右手主拍击大手（区分 窝风弓掌 vs 斜切扇风掌）
    if (mode === 'chop') ctx.rotate(-0.48);
    else ctx.rotate(0.10);

    // 桌面真实半透明掌影（随抬手蓄气距离拉开！）
    ctx.save();
    ctx.translate(-4 - lift * 6, 8 + lift * 20);
    ctx.fillStyle = `rgba(42, 24, 10, ${0.28 - lift * 0.1})`;
    ctx.beginPath();
    ctx.ellipse(0, 0, mode === 'chop' ? 20 : 30, mode === 'chop' ? 34 : 28, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.fillStyle = skin;
    ctx.strokeStyle = outline;
    ctx.lineWidth = 2.2;

    if (mode === 'chop') {
      // 侧立 45 度刀手斜切掌
      ctx.beginPath();
      ctx.moveTo(-14, 30);
      ctx.quadraticCurveTo(-22, 6, -16, -24);
      ctx.quadraticCurveTo(-10, -36, -1, -33);
      ctx.quadraticCurveTo(8, -30, 12, -16);
      ctx.quadraticCurveTo(18, 4, 15, 30);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      // 侧掌虎口弧线
      ctx.strokeStyle = skinDark;
      ctx.beginPath();
      ctx.moveTo(-8, -22); ctx.quadraticCurveTo(-4, 0, -5, 18);
      ctx.stroke();
    } else {
      // 五指微拢呈碗状的「弓掌窝风」大手
      ctx.beginPath();
      ctx.moveTo(-22, 28);
      ctx.lineTo(-33, 8);
      ctx.quadraticCurveTo(-38, 1, -31, -3);
      ctx.lineTo(-19, 5);
      ctx.lineTo(-22, -19);
      ctx.quadraticCurveTo(-19, -27, -12, -25);
      ctx.lineTo(-9, -29);
      ctx.quadraticCurveTo(-2, -33, 3, -28);
      ctx.lineTo(6, -25);
      ctx.quadraticCurveTo(13, -26, 16, -19);
      ctx.lineTo(18, -13);
      ctx.quadraticCurveTo(24, -14, 25, -6);
      ctx.lineTo(22, 28);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // 窝风弓起的手背骨节阴影弧线
      ctx.strokeStyle = '#b67d52';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(0, 2, 14, Math.PI * 1.1, Math.PI * 1.9);
      ctx.stroke();
    }

    // 蓄气缩圈光环（直接画在右手背上，直观还原参考图！）
    if (phase === 'player_aim') {
      ctx.save();
      ctx.strokeStyle = 'rgba(245, 158, 11, 0.85)';
      ctx.lineWidth = 2.2;
      ctx.beginPath(); ctx.arc(0, 4, 12, 0, Math.PI * 2); ctx.stroke();
      if (charging) {
        const rNow = 24 * chargeRing;
        const inZone = chargeRing >= 0.34 && chargeRing <= 0.68;
        ctx.strokeStyle = inZone ? '#fde047' : '#fb923c';
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(0, 4, rNow, 0, Math.PI * 2); ctx.stroke();
      }
      ctx.restore();
    }

    // 右手红白条纹校服袖口
    ctx.strokeStyle = outline;
    ctx.lineWidth = 2.1;
    ctx.fillStyle = '#c84b39';
    ctx.fillRect(-23, 25, 46, 46);
    ctx.fillStyle = '#fff8ee';
    ctx.fillRect(-23, 31, 46, 6);
    ctx.fillRect(-23, 43, 46, 6);
    ctx.strokeRect(-23, 25, 46, 46);

    ctx.restore();
  }

  let lastTs = performance.now();
  function loop(now) {
    if (!alive) return;
    const dt = Math.min(0.05, (now - lastTs) / 1000);
    lastTs = now;

    if (shakeT > 0) shakeT = Math.max(0, shakeT - dt);

    // 状态推进
    if (phase === 'player_aim' && charging) {
      chargeRing += chargeDir * dt * 1.35;
      if (chargeRing <= 0.24) { chargeRing = 0.24; chargeDir = 1; }
      if (chargeRing >= 1.0) { chargeRing = 1.0; chargeDir = -1; }
    } else if (phase === 'player_slam') {
      phaseT += dt * 6.5;
      if (phaseT >= 1) {
        cardStage = pendingStage;
        stageTxtEl.textContent = STAGE_NAMES[cardStage];
        if (cardStage >= 3) {
          wonGame = true;
          phase = 'card_react';
          phaseT = 0;
          rivalMood = 'shock';
          rivalBubble = `“哇！！一整套直接被你拍翻了！林冲归你啦！”`;
        } else {
          phase = 'card_react';
          phaseT = 0;
        }
      }
    } else if (phase === 'card_react') {
      phaseT += dt * 2.6;
      if (wonGame) {
        flipAnimDeg = Math.min(180, phaseT * 240);
        if (phaseT >= 0.85) showResultBanner(true);
      } else if (phaseT >= 0.55) {
        runXiaoZhouTurn();
      }
    } else if (phase === 'rival_turn') {
      rivalSlapT += dt * 2.2;
      if (rivalSlapT >= 0.55 && rivalSlapT - dt * 2.2 < 0.55) {
        resolveXiaoZhouImpact();
      }
      if (rivalSlapT >= 1.05 && phase === 'rival_turn') {
        phase = 'player_aim';
      }
    }

    // ========== 开始绘制 2.5D 第一人称教室课桌全景 ==========
    ctx.save();
    if (shakeT > 0) {
      ctx.translate((Math.random() - 0.5) * shakeAmp * 2, (Math.random() - 0.5) * shakeAmp * 2);
    }

    // 1. 远景教室暖墙与两侧课桌透视角
    ctx.fillStyle = '#e7d7be';
    ctx.fillRect(0, 0, W, 92);
    ctx.fillStyle = '#be8c59';
    ctx.fillRect(0, 26, 44, 66);
    ctx.fillRect(W - 44, 26, 44, 66);
    ctx.strokeStyle = '#4a3222';
    ctx.lineWidth = 1.8;
    ctx.strokeRect(0, 26, 44, 66);
    ctx.strokeRect(W - 44, 26, 44, 66);

    // 2. 课桌对面的同桌小周（蓝白校服 + 双拳撑桌 + 实时表情与对话气泡）
    const zx = 114, zy = 54;
    // 校服躯干与蓝白双道杠袖子
    ctx.fillStyle = '#4f83b8';
    ctx.beginPath();
    ctx.roundRect(zx - 38, zy - 6, 76, 46, 14);
    ctx.fill();
    ctx.strokeRect(zx - 38, zy - 6, 76, 46);
    ctx.fillStyle = '#fffdf9';
    ctx.fillRect(zx - 16, zy - 4, 32, 42);
    // 领口
    ctx.strokeStyle = '#365f8a';
    ctx.beginPath(); ctx.moveTo(zx - 12, zy - 4); ctx.lineTo(zx, zy + 8); ctx.lineTo(zx + 12, zy - 4); ctx.stroke();
    // 脑袋与短发
    ctx.fillStyle = '#fde0c2';
    ctx.strokeStyle = '#4a3222';
    ctx.beginPath(); ctx.arc(zx, zy - 20, 19, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#3b281c';
    ctx.beginPath(); ctx.arc(zx, zy - 25, 19.5, Math.PI * 0.95, Math.PI * 2.05); ctx.fill();
    // 表情眼睛与嘴巴
    ctx.fillStyle = '#3b281c';
    if (rivalMood === 'shock') {
      ctx.beginPath(); ctx.arc(zx - 6, zy - 20, 2.6, 0, Math.PI * 2); ctx.arc(zx + 6, zy - 20, 2.6, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(zx, zy - 11, 4, 0, Math.PI * 2); ctx.stroke();
    } else {
      ctx.fillRect(zx - 8, zy - 21, 3.2, 3.2);
      ctx.fillRect(zx + 5, zy - 21, 3.2, 3.2);
      ctx.beginPath();
      if (rivalMood === 'nervous') {
        ctx.moveTo(zx - 5, zy - 11); ctx.lineTo(zx + 5, zy - 12);
      } else {
        ctx.arc(zx, zy - 13, 5, 0.1, Math.PI - 0.1);
      }
      ctx.stroke();
    }
    // 小周撑在桌沿的两只小手（轮到小周拍卡时右手前伸拍下！）
    ctx.fillStyle = '#fde0c2';
    const rHandY = (phase === 'rival_turn' && rivalSlapT < 0.7)
      ? zy + 30 + Math.sin(Math.min(1, rivalSlapT / 0.55) * Math.PI) * 58
      : zy + 30;
    const rHandX = (phase === 'rival_turn' && rivalSlapT < 0.7)
      ? zx - 26 + Math.sin(Math.min(1, rivalSlapT / 0.55) * Math.PI) * 44
      : zx - 34;
    ctx.beginPath(); ctx.arc(rHandX, rHandY, 8.5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.arc(zx + 34, zy + 30, 8.5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();

    // 小周右侧漫画台词框
    ctx.fillStyle = '#fffdf8';
    ctx.strokeStyle = '#4a3222';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.roundRect(164, 14, 170, 48, 10);
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#3a281b';
    ctx.font = 'bold 10.5px sans-serif';
    ctx.textAlign = 'left';
    const bLine1 = rivalBubble.slice(0, 13);
    const bLine2 = rivalBubble.slice(13, 27);
    ctx.fillText(bLine1, 173, 34);
    if (bLine2) ctx.fillText(bLine2, 173, 50);

    // 3. 2.5D 梯形老式木纹课桌主桌面（y: 84..272 + 前沿厚木边）
    const deskGrad = ctx.createLinearGradient(0, 84, 0, 266);
    deskGrad.addColorStop(0, '#c7925b');
    deskGrad.addColorStop(1, '#a97441');
    ctx.fillStyle = deskGrad;
    ctx.fillRect(0, 84, W, 182);
    // 课桌前侧立面厚边
    ctx.fillStyle = '#7e5229';
    ctx.fillRect(0, 266, W, 28);
    ctx.strokeStyle = '#4a3222';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, 84); ctx.lineTo(W, 84);
    ctx.moveTo(0, 266); ctx.lineTo(W, 266);
    ctx.stroke();

    // 桌面木纹细痕与白色粉笔「三八线」
    ctx.strokeStyle = 'rgba(74, 48, 24, 0.22)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(18, 136); ctx.lineTo(118, 136);
    ctx.moveTo(226, 206); ctx.lineTo(328, 206);
    ctx.stroke();

    ctx.save();
    ctx.strokeStyle = 'rgba(255, 252, 245, 0.72)';
    ctx.lineWidth = 3;
    ctx.setLineDash([7, 3]);
    ctx.beginPath();
    ctx.moveTo(deskCx, 87);
    ctx.lineTo(deskCx, 263);
    ctx.stroke();
    ctx.restore();
    ctx.fillStyle = 'rgba(255, 252, 245, 0.88)';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('三八线', deskCx + 6, 102);

    // 左上桌角：复古红铁皮文具盒与半块白橡皮
    ctx.save();
    ctx.translate(42, 108);
    ctx.rotate(-0.22);
    ctx.fillStyle = '#c84b39';
    ctx.strokeStyle = '#4a3222';
    ctx.lineWidth = 1.8;
    ctx.beginPath(); ctx.roundRect(-34, -12, 68, 24, 5); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#fde68a';
    ctx.fillRect(-26, -5, 50, 4);
    ctx.fillStyle = '#60a5fa';
    ctx.fillRect(-26, 2, 42, 4);
    ctx.restore();
    ctx.fillStyle = '#f5f5f4';
    ctx.strokeStyle = '#4a3222';
    ctx.beginPath(); ctx.roundRect(14, 132, 22, 13, 3); ctx.fill(); ctx.stroke();

    // 4. 黄金吃风带（微翘迎风口外 1–2cm 发光月牙甜区 + 白色气流丝提示）
    const sweet = getSweetSpot();
    if (cardStage < 3 && !wonGame) {
      const pulse = 0.75 + 0.25 * Math.sin(now / 180);
      const userNear = Math.hypot(aimX - sweet.x, aimY - sweet.y) <= (stance === 'cup' ? 34 : 25);

      ctx.save();
      ctx.translate(sweet.x, sweet.y);
      ctx.fillStyle = userNear ? `rgba(253, 224, 71, ${0.46 * pulse})` : `rgba(251, 191, 36, ${0.28 * pulse})`;
      ctx.strokeStyle = userNear ? '#fde047' : 'rgba(253, 224, 71, 0.85)';
      ctx.lineWidth = userNear ? 2.6 : 1.8;
      ctx.beginPath();
      if (windSide === 'right') {
        ctx.arc(-16, -4, 34, -0.75, 0.95);
      } else {
        ctx.arc(16, -4, 34, Math.PI - 0.95, Math.PI + 0.75);
      }
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 0, stance === 'cup' ? 24 : 18, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#fffbeb';
      ctx.font = 'bold 9.5px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(userNear ? '最佳吃风点!' : '黄金吃风带', 0, 3);
      ctx.restore();

      // 白色迎风气流丝
      ctx.save();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.65)';
      ctx.lineWidth = 1.4;
      const dir = windSide === 'right' ? 1 : -1;
      for (let i = 0; i < 2; i++) {
        ctx.beginPath();
        ctx.moveTo(deskCx + dir * 64, deskCy - 8 + i * 11);
        ctx.quadraticCurveTo(deskCx + dir * 44, deskCy + 4 + i * 8, deskCx + dir * 24, deskCy + 12);
        ctx.stroke();
      }
      ctx.fillStyle = '#fffbeb';
      ctx.font = 'bold 9.5px sans-serif';
      ctx.textAlign = dir > 0 ? 'left' : 'right';
      ctx.fillText(cardStage === 0 ? '平贴紧实' : '微翘迎风口', deskCx + dir * 32, deskCy - 16);
      ctx.restore();
    }

    // 5. 桌中央立体双叠水浒卡（含翘角阴影、半立透视与 180 度翻面正面英雄画）
    // 底下押注卡
    ctx.save();
    ctx.translate(deskCx - 9, deskCy + 4);
    ctx.rotate(-0.07);
    ctx.fillStyle = 'rgba(30,16,6,0.34)';
    ctx.fillRect(-30, -37, 62, 78);
    ctx.fillStyle = '#784421';
    ctx.strokeStyle = '#3b2312';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.roundRect(-30, -39, 60, 76, 4); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = '#eab308';
    ctx.lineWidth = 1.2;
    ctx.strokeRect(-25, -34, 50, 66);
    ctx.restore();

    // 顶层目标缺卡（随 4 阶物理姿态变形）
    ctx.save();
    const liftPx = cardStage === 1 ? 4 : cardStage === 2 ? 14 : (wonGame ? Math.sin((flipAnimDeg / 180) * Math.PI) * 38 : 0);
    ctx.translate(deskCx + 5, deskCy - liftPx);

    // 翘角或半立底部镂空黑影（越翘阴影越深，一眼看出吃风口！）
    ctx.fillStyle = 'rgba(24, 12, 4, 0.42)';
    ctx.beginPath();
    ctx.ellipse(windSide === 'right' ? 8 : -8, 36 + liftPx * 0.5, 30, 6 + cardStage * 3, 0, 0, Math.PI * 2);
    ctx.fill();

    if (wonGame || cardStage >= 3) {
      const rad = (Math.max(110, flipAnimDeg) * Math.PI) / 180;
      const sx = Math.max(0.15, Math.abs(Math.cos(rad)));
      ctx.scale(sx, 1);
      // 翻开后的梁山英雄闪卡正面！
      ctx.fillStyle = '#fef3c7';
      ctx.strokeStyle = '#4a3222';
      ctx.lineWidth = 2.2;
      ctx.beginPath(); ctx.roundRect(-31, -40, 62, 78, 5); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = '#d97706';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(-26, -35, 52, 68);
      ctx.fillStyle = '#b91c1c';
      ctx.beginPath(); ctx.arc(0, -8, 15, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fde047';
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('梁山好汉', 0, -5);
      ctx.fillStyle = '#4a2511';
      ctx.font = 'bold 10.5px sans-serif';
      ctx.fillText(targetCardStr.slice(3), 0, 22);
    } else {
      // 背面朝上（带真实卷角微翘几何折角！）
      const tilt = cardStage === 2 ? (windSide === 'right' ? -0.22 : 0.22) : (cardStage === 1 ? (windSide === 'right' ? -0.06 : 0.06) : 0);
      ctx.rotate(tilt);
      ctx.scale(cardStage === 2 ? 0.84 : 1, 1);

      ctx.fillStyle = '#854d27';
      ctx.strokeStyle = '#3b2312';
      ctx.lineWidth = 2.1;
      ctx.beginPath(); ctx.roundRect(-31, -40, 62, 78, 4); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = '#d4a359';
      ctx.lineWidth = 1.3;
      ctx.strokeRect(-26, -35, 52, 68);
      ctx.fillStyle = '#f5deb3';
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('水浒英雄谱', 0, 3);

      // 绘制右下或左下微翘折角高光三角（还原参考图卷角细节！）
      if (cardStage >= 1) {
        const cxCorner = windSide === 'right' ? 31 : -31;
        const dir = windSide === 'right' ? -1 : 1;
        const curlSz = cardStage === 2 ? 22 : 15;
        ctx.fillStyle = '#f5ebd6';
        ctx.strokeStyle = '#4a3222';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(cxCorner, 38 - curlSz);
        ctx.quadraticCurveTo(cxCorner + dir * curlSz * 0.85, 38 - curlSz * 0.85, cxCorner + dir * curlSz, 38);
        ctx.lineTo(cxCorner, 38);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
    }
    ctx.restore();

    // 6. 掌风冲击气环与粉笔灰粒子
    windPuffs = windPuffs.filter(w => w.life > 0);
    for (const w of windPuffs) {
      w.life -= dt;
      w.r += (w.maxR - w.r) * dt * 11;
      ctx.save();
      ctx.globalAlpha = Math.max(0, w.life * 2.4);
      ctx.strokeStyle = '#fef08a';
      ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.ellipse(w.x, w.y, w.r, w.r * 0.62, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
    }

    dust = dust.filter(p => p.life > 0);
    for (const p of dust) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      ctx.save();
      ctx.globalAlpha = Math.max(0, p.life * 1.4);
      ctx.fillStyle = '#fffbeb';
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }

    // 7. 第一人称前景：玩家的真实一双立体手！
    const liftAmt = phase === 'player_aim'
      ? (charging ? 0.55 + (1 - chargeRing) * 0.45 : 0.22 + Math.sin(now / 260) * 0.06)
      : (phase === 'player_slam' ? Math.max(0, 1 - phaseT * 1.8) : 0.15);
    const squashAmt = phase === 'player_slam' && phaseT > 0.55 ? 1 : 0;

    if (stance === 'quake') {
      drawKidHand(deskCx, deskCy + 34, { mode: 'quake_pair', lift: liftAmt, slamSquash: squashAmt, tingle: quakeCooldown > 0 });
    } else {
      // 左手扶桌沿 + 右手悬于瞄准点随时下劈
      drawKidHand(68, 242, { isLeft: true, lift: 0, tingle: quakeCooldown > 0 });
      drawKidHand(aimX, aimY + 34, { isLeft: false, mode: stance, lift: liftAmt, slamSquash: squashAmt, tingle: quakeCooldown > 0 });
    }

    // 8. 飘字战况提示
    floatTips = floatTips.filter(f => f.life > 0);
    for (const f of floatTips) {
      f.y -= dt * 22;
      f.life -= dt;
      ctx.save();
      ctx.globalAlpha = Math.min(1, f.life * 1.6);
      ctx.font = 'bold 11.5px sans-serif';
      ctx.textAlign = 'center';
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgba(42,24,10,0.85)';
      ctx.strokeText(f.txt, f.x, f.y);
      ctx.fillStyle = f.col;
      ctx.fillText(f.txt, f.x, f.y);
      ctx.restore();
    }

    ctx.restore();
    rafId = requestAnimationFrame(loop);
  }
  rafId = requestAnimationFrame(loop);
}
