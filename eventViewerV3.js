// 《这辈子 2.0》Sprint 4 —— 情境化故事阅读器 V3（去生硬数值胶囊 · 动态氛围视窗 + 角色反应框 + 心境独白 + 淡墨倾向暗章）
// 严格遵循纯中文零表情符号规范。

import { pxIcon } from './icons.js?v=s70';

// 1. 根据事件标题与正文智能识别 8 套手绘情境光影插画层（零外部大图体积，纯 SVG + CSS 动态粒子）
export function detectEventTheme(ev, state) {
  const txt = `${ev.title || ''} ${ev.summary || ''}`;
  if (/停电|蜡烛|天台|萤火|夏夜/.test(txt)) return 'blackout_candle';
  if (/除夕|过年|春晚|红包|鞭炮|团圆/.test(txt)) return 'newyear_lantern';
  if (/雨|台风|积水|屋檐|湿透/.test(txt)) return 'rainy_window';
  if (/医院|门诊|外科|急诊|手术|病房|发烧|体检|药/.test(txt)) return 'hospital_lamp';
  if (/体育馆|开放麦|巡演|舞台|总决赛|聚光灯|决赛/.test(txt)) return 'stage_spotlight';
  if (/加班|写字楼|工位|裁员|会议|汇报|方案|打卡/.test(txt)) return 'office_dusk';
  if (/考场|黑板|模考|统测|试卷|自习|图书馆|志愿|讲台|课间/.test(txt)) return 'classroom_sun';
  if (/公园|湖畔|柳|石桌|太极|散步|河堤/.test(txt)) return 'park_breeze';
  return state.age <= 18 ? 'classroom_sun' : state.age < 55 ? 'office_dusk' : 'park_breeze';
}

// 渲染顶部 40% 情境动态手绘插画视窗 + 左下角主角拍立得反应相框
export function buildEventVignetteHtml(ev, state, spUrl, stamp) {
  const theme = detectEventTheme(ev, state);
  let sceneSvg = '';
  let exprLabel = '心念微动';

  if (theme === 'blackout_candle') {
    exprLabel = '咦？停电啦';
    sceneSvg = `
      <svg class="ev3-svg" viewBox="0 0 390 190" preserveAspectRatio="xMidYMid slice">
        <defs>
          <radialGradient id="candleGlow" cx="68%" cy="56%" r="44%">
            <stop offset="0%" stop-color="#fde68a" stop-opacity="0.72"/>
            <stop offset="45%" stop-color="#f59e0b" stop-opacity="0.24"/>
            <stop offset="100%" stop-color="#0f172a" stop-opacity="0"/>
          </radialGradient>
        </defs>
        <rect width="390" height="190" fill="#161d33"/>
        <!-- 窗外深蓝夏夜星空与对面居民楼摇蒲扇剪影 -->
        <rect x="118" y="8" width="214" height="114" fill="#0f1729" stroke="#3e2c20" stroke-width="5"/>
        <rect x="252" y="28" width="66" height="90" fill="#1e293b"/>
        <rect x="262" y="42" width="18" height="16" fill="#475569"/>
        <rect x="290" y="42" width="18" height="16" fill="#fde68a" opacity="0.55"/>
        <rect x="262" y="70" width="18" height="16" fill="#334155"/>
        <!-- 星星与夏夜萤火虫 -->
        <circle cx="145" cy="28" r="1.5" fill="#fef9c3"/><circle cx="182" cy="20" r="1.2" fill="#fef9c3"/>
        <circle cx="218" cy="34" r="1.6" fill="#fef9c3"/><circle cx="164" cy="52" r="1.2" fill="#fef9c3"/>
        <circle class="ev3-firefly" cx="156" cy="84" r="2.6" fill="#bef264"/>
        <circle class="ev3-firefly d2" cx="204" cy="72" r="2.2" fill="#fde047"/>
        <circle class="ev3-firefly d3" cx="236" cy="94" r="2.4" fill="#bef264"/>
        <!-- 窗框中竖梃 -->
        <line x1="225" y1="8" x2="225" y2="122" stroke="#3e2c20" stroke-width="4"/>
        <!-- 书桌与熄灭的绿罩台灯 + 摊开的作业本 + 摇曳白蜡烛 -->
        <polygon points="84,122 366,122 390,186 60,186" fill="#6b442a" stroke="#3a2416" stroke-width="2.5"/>
        <!-- 熄灭的老式台灯 -->
        <ellipse cx="144" cy="126" rx="16" ry="5" fill="#365314" stroke="#1e293b" stroke-width="2"/>
        <path d="M144 124 Q138 92 162 84" fill="none" stroke="#475569" stroke-width="4"/>
        <polygon points="156,78 182,88 172,102 148,92" fill="#3f6212" stroke="#1e293b" stroke-width="2"/>
        <!-- 摊开的作业本与铅笔 -->
        <polygon points="172,132 256,130 266,158 164,160" fill="#fefce8" stroke="#4a3728" stroke-width="2"/>
        <line x1="216" y1="131" x2="215" y2="159" stroke="#cbd5e1" stroke-width="1.5"/>
        <line x1="180" y1="140" x2="208" y2="140" stroke="#94a3b8" stroke-width="1.5"/>
        <line x1="178" y1="147" x2="206" y2="147" stroke="#94a3b8" stroke-width="1.5"/>
        <line x1="224" y1="140" x2="250" y2="140" stroke="#94a3b8" stroke-width="1.5"/>
        <line x1="242" y1="146" x2="270" y2="160" stroke="#d97706" stroke-width="3.2" stroke-linecap="round"/>
        <!-- 白瓷碟蜡烛与暖黄光晕 -->
        <circle cx="292" cy="108" r="76" fill="url(#candleGlow)"/>
        <ellipse cx="292" cy="132" rx="18" ry="5" fill="#e2e8f0" stroke="#4a3728" stroke-width="1.8"/>
        <rect x="286" y="102" width="12" height="29" rx="2" fill="#fffbeb" stroke="#4a3728" stroke-width="1.8"/>
        <path class="ev3-flame" d="M292 84 Q299 95 292 102 Q285 95 292 84 Z" fill="#f59e0b"/>
        <circle class="ev3-flame" cx="292" cy="95" r="3.2" fill="#fef9c3"/>
      </svg>
    `;
  } else if (theme === 'rainy_window') {
    exprLabel = '窗外落雨了';
    sceneSvg = `
      <svg class="ev3-svg" viewBox="0 0 390 190" preserveAspectRatio="xMidYMid slice">
        <rect width="390" height="190" fill="#293849"/>
        <rect x="92" y="10" width="256" height="122" fill="#384e63" stroke="#4a3728" stroke-width="5"/>
        <g stroke="#bae6fd" stroke-width="1.5" opacity="0.55" class="ev3-rain">
          <line x1="128" y1="18" x2="114" y2="58"/><line x1="176" y1="26" x2="162" y2="66"/>
          <line x1="226" y1="16" x2="212" y2="56"/><line x1="278" y1="30" x2="264" y2="70"/>
          <line x1="318" y1="20" x2="304" y2="60"/><line x1="154" y1="74" x2="140" y2="114"/>
          <line x1="248" y1="72" x2="234" y2="112"/><line x1="298" y1="78" x2="284" y2="118"/>
        </g>
        <line x1="220" y1="10" x2="220" y2="132" stroke="#4a3728" stroke-width="4"/>
        <rect x="0" y="132" width="390" height="58" fill="#855a3a" stroke="#4a3728" stroke-width="2.5"/>
        <!-- 窗台热茶杯 -->
        <rect x="278" y="114" width="24" height="24" rx="4" fill="#fef3c7" stroke="#4a3728" stroke-width="2"/>
        <path d="M302 120 Q310 126 302 132" fill="none" stroke="#4a3728" stroke-width="2"/>
        <path class="ev3-flame" d="M286 108 Q289 100 286 94 M294 109 Q297 101 294 95" fill="none" stroke="#e2e8f0" stroke-width="1.6" opacity="0.7"/>
      </svg>
    `;
  } else if (theme === 'newyear_lantern') {
    exprLabel = '岁末守岁夜';
    sceneSvg = `
      <svg class="ev3-svg" viewBox="0 0 390 190" preserveAspectRatio="xMidYMid slice">
        <rect width="390" height="190" fill="#3a1618"/>
        <circle cx="280" cy="54" r="68" fill="#f59e0b" opacity="0.16"/>
        <!-- 窗外除夕烟花 -->
        <circle cx="195" cy="52" r="24" fill="none" stroke="#fde047" stroke-width="2" stroke-dasharray="3 6"/>
        <circle cx="248" cy="38" r="16" fill="none" stroke="#fca5a5" stroke-width="2" stroke-dasharray="2 5"/>
        <!-- 红灯笼 -->
        <line x1="306" y1="0" x2="306" y2="26" stroke="#fde047" stroke-width="2.5"/>
        <ellipse cx="306" cy="46" rx="24" ry="20" fill="#dc2626" stroke="#fde047" stroke-width="2"/>
        <rect x="298" y="65" width="16" height="5" fill="#f59e0b"/>
        <line x1="306" y1="70" x2="306" y2="86" stroke="#fde047" stroke-width="2"/>
        <rect x="0" y="138" width="390" height="52" fill="#7c2d12"/>
      </svg>
    `;
  } else if (theme === 'stage_spotlight') {
    exprLabel = '聚光灯亮起';
    sceneSvg = `
      <svg class="ev3-svg" viewBox="0 0 390 190" preserveAspectRatio="xMidYMid slice">
        <rect width="390" height="190" fill="#18122b"/>
        <polygon points="150,0 240,0 320,190 70,190" fill="#fde68a" opacity="0.16"/>
        <polygon points="240,0 300,0 365,190 195,190" fill="#c084fc" opacity="0.14"/>
        <circle class="ev3-firefly" cx="176" cy="64" r="2.2" fill="#fef08a"/>
        <circle class="ev3-firefly d2" cx="242" cy="82" r="2.5" fill="#e9d5ff"/>
        <circle class="ev3-firefly d3" cx="288" cy="50" r="2.0" fill="#fde68a"/>
        <rect x="0" y="146" width="390" height="44" fill="#2e1f47" stroke="#f59e0b" stroke-width="1.5"/>
      </svg>
    `;
  } else if (theme === 'hospital_lamp') {
    exprLabel = '凝神静气';
    sceneSvg = `
      <svg class="ev3-svg" viewBox="0 0 390 190" preserveAspectRatio="xMidYMid slice">
        <rect width="390" height="190" fill="#1e3545"/>
        <circle cx="246" cy="36" r="56" fill="#bae6fd" opacity="0.22"/>
        <ellipse cx="246" cy="28" rx="38" ry="12" fill="#f0f9ff" stroke="#475569" stroke-width="2.5"/>
        <rect x="136" y="56" width="214" height="84" rx="6" fill="#2b495c" stroke="#94a3b8" stroke-width="1.5"/>
        <polyline points="152,98 186,98 196,76 208,118 220,88 232,98 332,98" fill="none" stroke="#4ade80" stroke-width="2.4"/>
        <rect x="0" y="142" width="390" height="48" fill="#334155"/>
      </svg>
    `;
  } else if (theme === 'office_dusk') {
    exprLabel = '暮色灯火';
    sceneSvg = `
      <svg class="ev3-svg" viewBox="0 0 390 190" preserveAspectRatio="xMidYMid slice">
        <defs>
          <linearGradient id="duskSky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#312e81"/>
            <stop offset="60%" stop-color="#9a3412"/>
            <stop offset="100%" stop-color="#f59e0b"/>
          </linearGradient>
        </defs>
        <rect width="390" height="190" fill="url(#duskSky)"/>
        <rect x="148" y="54" width="34" height="86" fill="#1e1b4b"/><rect x="192" y="36" width="44" height="104" fill="#1e293b"/>
        <rect x="248" y="62" width="38" height="78" fill="#1e1b4b"/><rect x="296" y="46" width="46" height="94" fill="#0f172a"/>
        <rect x="202" y="50" width="8" height="6" fill="#fde68a"/><rect x="218" y="64" width="8" height="6" fill="#fde68a"/>
        <rect x="308" y="58" width="8" height="6" fill="#fde68a"/><rect x="324" y="76" width="8" height="6" fill="#38bdf8"/>
        <rect x="0" y="138" width="390" height="52" fill="#452719" stroke="#29150c" stroke-width="2"/>
        <!-- 工位笔记本电脑微光 -->
        <polygon points="214,104 278,104 284,142 208,142" fill="#cbd5e1" stroke="#334155" stroke-width="2"/>
        <polygon points="218,108 274,108 278,136 214,136" fill="#e0f2fe"/>
      </svg>
    `;
  } else if (theme === 'park_breeze') {
    exprLabel = '微风拂面';
    sceneSvg = `
      <svg class="ev3-svg" viewBox="0 0 390 190" preserveAspectRatio="xMidYMid slice">
        <rect width="390" height="190" fill="#d9f0e1"/>
        <circle cx="312" cy="40" r="24" fill="#fef08a"/>
        <ellipse cx="240" cy="148" rx="190" ry="52" fill="#86efac"/>
        <ellipse cx="140" cy="162" rx="140" ry="38" fill="#4ade80"/>
        <path d="M260 0 Q248 48 256 92 M288 0 Q276 54 284 102 M318 0 Q308 44 314 84" fill="none" stroke="#15803d" stroke-width="2.5" opacity="0.65"/>
      </svg>
    `;
  } else {
    // 默认：斜阳教室与书桌纸飞机光影
    exprLabel = '少年心事';
    sceneSvg = `
      <svg class="ev3-svg" viewBox="0 0 390 190" preserveAspectRatio="xMidYMid slice">
        <rect width="390" height="190" fill="#efe4ce"/>
        <rect x="116" y="18" width="234" height="92" rx="4" fill="#2f5241" stroke="#6b442a" stroke-width="5"/>
        <line x1="142" y1="44" x2="236" y2="44" stroke="#fefce8" stroke-width="2" opacity="0.75"/>
        <line x1="142" y1="64" x2="208" y2="64" stroke="#fde68a" stroke-width="2" opacity="0.75"/>
        <circle cx="296" cy="64" r="20" fill="none" stroke="#fefce8" stroke-width="1.6" stroke-dasharray="4 3" opacity="0.7"/>
        <polygon points="180,0 390,0 390,190 250,190" fill="#fde68a" opacity="0.22"/>
        <rect x="0" y="134" width="390" height="56" fill="#b8834e" stroke="#4a3728" stroke-width="2"/>
      </svg>
    `;
  }

  return `
    <div class="ev3-vignette">
      ${sceneSvg}
      <div class="ev3-portrait-frame">
        <div class="ev3-portrait-in">
          ${spUrl ? `<img src="${spUrl}" alt="主角反应" />` : ''}
        </div>
        <span class="ev3-portrait-mood">${exprLabel}</span>
      </div>
      <div class="ev3-stamp-pill">${stamp} · ${state.age}岁</div>
    </div>
  `;
}

// 2. 将原本带生硬数值的选项（如 "点起白蜡烛继续啃完最后两道题（学识+2，心态-1）"）转化为：
//    [左侧手绘圆章图标] + [干净主行动文案] + [温暖第一人称心境独白小字] + [右下角淡墨钢笔倾向暗章]
export function formatNarrativeChoiceV3(choice, ev) {
  const raw = choice.label || '';
  const m = raw.match(/^(.*?)[（(]([^）)]+)[）)]$/);
  const cleanMain = (m ? m[1] : raw).replace(/^【.*?】\s*/, '').trim();
  const rawSub = m ? m[2].trim() : '';
  const ef = choice.effects || {};

  // 提炼必须坦诚告知的硬性大额金钱支出（避免暗扣存款坑玩家），普通小属性加减号全部隐藏化为心境！
  let hardCostText = '';
  const cashCost = typeof ef.cash === 'number' && ef.cash <= -500 ? Math.abs(ef.cash) : 0;
  if (cashCost > 0) {
    hardCostText = `需支出 ¥${cashCost.toLocaleString()}`;
  } else if (/需.*?≥/.test(rawSub)) {
    const reqMatch = rawSub.match(/需[^，,·)）]+/);
    if (reqMatch) hardCostText = reqMatch[0];
  }

  // 智能匹配左侧圆章图标与右下角淡墨钢笔倾向暗章 + 第一人称心境小字
  let ico = 'spark';
  let stamp = '顺其自然';
  let whisper = '“跟着眼下的心意走，总会留下点什么。”';

  const fullTxt = `${cleanMain} ${rawSub}`;
  const subjStampMap = {
    chn: '文科·语文',
    math: '理科·数学',
    eng: '综合·英语',
    art: '文科·文综',
    sci: '理科·理综'
  };
  if (ef.subj && subjStampMap[ef.subj]) {
    ico = 'study';
    stamp = subjStampMap[ef.subj];
    whisper = (ef.mood || 0) < 0 || (ef.fatigue || 0) >= 2
      ? '“趁着心气还在把这门课啃透吧，虽然今晚稍微熬人一点……”'
      : '“把这门功课的底子打扎实，上了考场心里更有底气。”';
  } else if (/辅助线|函数|压轴|几何|物理|化学|实验|推导|奥数/.test(fullTxt) || (ef.numLogic || 0) >= 2) {
    ico = 'study';
    stamp = '数理精进';
    whisper = (ef.mood || 0) < 0 || (ef.fatigue || 0) >= 2
      ? '“顺着逻辑一层层推出来，哪怕费点脑筋也值了。”'
      : '“把公式背后的理儿想通透，解题一下子顺畅多了。”';
  } else if (/蜡烛|啃完|真题|刷题|复盘|错题|阅读|摘抄|作文|古诗|背单词|选拔|笔记|图书馆|备考/.test(fullTxt) || (ef.knowledge || 0) >= 2) {
    ico = /蜡烛/.test(cleanMain) ? 'lamp' : 'study';
    stamp = '学识精进';
    whisper = (ef.mood || 0) < 0 || (ef.fatigue || 0) >= 2
      ? '“趁着心气还在咬牙顶一下吧，就是今晚稍微熬人一点……”'
      : '“静下心把这道坎琢磨透，心里才觉得踏实。”';
  } else if (/天台|蒲扇|爸妈|家人|板栗|回家吃饭|体检|医嘱/.test(fullTxt) || (ef.parentInt || 0) >= 2) {
    ico = 'parents';
    stamp = '家人温情';
    whisper = '“难得放慢脚步陪陪家里人，晚风吹过来整个人都松快了。”';
  } else if (/小周|同桌|小林|朋友|约好|聚餐|横幅|电话/.test(fullTxt) || (ef.friendInt || 0) >= 2) {
    ico = 'social';
    stamp = '挚友交心';
    whisper = '“身边有人并肩说笑，再大的风浪也没那么难捱了。”';
  } else if (/伴侣|对象|婚礼|二人世界/.test(fullTxt) || (ef.partnerInt || 0) >= 2) {
    ico = 'heart';
    stamp = '相知相伴';
    whisper = '“日子是两个人一起过的，把眼前的人放在心上最重要。”';
  } else if (/跨栏|跑两圈|拉伸|减量|太极|早睡|眯一小时|休息/.test(fullTxt) || (ef.health || 0) >= 2 || (ef.fatigue || 0) < 0) {
    ico = 'exercise';
    stamp = '调养身心';
    whisper = '“身体是熬长线的本钱，先让紧绷的弦缓一缓。”';
  } else if (/吉他|唱|旋律|开放麦|乐队|歌/.test(fullTxt)) {
    ico = 'guitar';
    stamp = '舞台热爱';
    whisper = '“不管台下坐着几个人，只要前奏响起就不想留遗憾。”';
  } else if (/五排|青训|开团|首发|电竞|集火/.test(fullTxt)) {
    ico = 'gamepad';
    stamp = '赛场热血';
    whisper = '“屏幕亮起的那一刻，这股想赢的心气藏都藏不住。”';
  } else if (/白大褂|外科|缝合|分诊|腔镜|主刀/.test(fullTxt)) {
    ico = 'stethoscope';
    stamp = '医者笃行';
    whisper = '“多记准一个细节，将来站在台前就多一分底气。”';
  } else if (/和解|放下|纯粹热爱|留白/.test(fullTxt) || ef.dreamPivot) {
    ico = 'life';
    stamp = '温柔和解';
    whisper = '“不必事事执着于山顶，沿途练出的本事早已长在身上。”';
  } else if (/加班|项目|担下|方案|职场/.test(fullTxt) || (ef.pro || 0) >= 2) {
    ico = 'work';
    stamp = '职场历练';
    whisper = '“先把硬骨头啃下来，手里的真本事谁也拿不走。”';
  } else if ((ef.cash || 0) > 0) {
    ico = 'coin';
    stamp = '小有进账';
    whisper = '“落袋为安的踏实感，让手头宽裕了不少。”';
  }

  // 若是临场实操小游戏或海克斯共鸣，给出更有仪式感的心境提示
  if (choice.isLiveArcade) {
    ico = 'gamepad';
    stamp = '亲手破局';
    whisper = '“深吸一口气亲自上场，成败就看指尖这二十秒真功夫！”';
  } else if (choice.isHexResonance) {
    ico = 'hex';
    stamp = '命定回响';
    whisper = '“一路积累的命运羁绊恰好在此刻派上了大用场！”';
  }

  return {
    cleanMain,
    whisper: hardCostText ? `${whisper}（${hardCostText}）` : whisper,
    ico,
    stamp
  };
}
