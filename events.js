// 《这辈子 2.0》Sprint 2 庞大分阶段随机事件库 + 前期加密大节点 + 跨局防重复调度引擎
// 红线声明：本文件全部事件为结构化机制卡壳（audit_stage: 'MECHANIC_SHELL'），严格保留 review_status 硬门禁，
// 供第 4 步批量替换为人工审定文学正文；严禁包含任何 AI 自动生成的长段剧情对话。

import { SUB_STAGES, DREAMS } from './data.js?v=s60';
import { hasHex, getBondTier } from './hextech.js?v=s60';
import { adoptPet, PET_CATALOG } from './lifeFeatures.js?v=s60';
import {
  ensureDreamState, DREAM_CATALOG, addKeepsakeWithStory,
  settleDreamQualifier, settleDreamClimax, applyGracefulPivot, syncLegacyDreamFields
} from './dreams.js?v=s60';
import {
  ensureExamState, syncVisibleAcademicStats, getStageTextbookCap,
  rollOrGetExamResult, getStudentExamPreview
} from './examSystem.js?v=s60';

function clamp(v, min = 0, max = 100) {
  return Math.max(min, Math.min(max, Math.round(v)));
}
function getSubStage(age) {
  return SUB_STAGES.find(s => age >= s.min && age <= s.max) || SUB_STAGES[SUB_STAGES.length - 1];
}

const SEEN_EVENTS_KEY = 'zhebeizi_seen_events_v2';

export function loadSeenEvents() {
  try {
    const raw = localStorage.getItem(SEEN_EVENTS_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(arr) ? arr : []);
  } catch (e) {
    return new Set();
  }
}

export function markEventSeen(id) {
  try {
    const s = loadSeenEvents();
    s.add(id);
    localStorage.setItem(SEEN_EVENTS_KEY, JSON.stringify([...s].slice(-300)));
  } catch (e) {}
}

// ===== 1. 前期与中段加密大节点（彻底消灭 8–18 岁 30 回合真空带）=====
export function getMilestoneEventForTurn(state) {
  const candidates = [
    {
      id: 'ms_tuckshop_6', age: 6, subTurn: 3, priority: 'P1', review_status: 'APPROVED', audit_stage: 'MECHANIC_SHELL',
      title: '第一次独自去校门口小卖部',
      summary: '【机制节点】攒下第一笔零花钱，解锁「校门口小卖部」：可抽干脆面水浒卡、买童年旧物与送小礼物。',
      choices: [
        { label: '立刻逛一逛，花 ¥15 买包干脆面试手气（解锁小卖部，心态 +3，自理 +1）', effects: { cash: -15, mood: 3, selfCare: 1, unlockTuck: true, openTuckAfter: true } },
        { label: '先记住位置，把钱留着等 8 岁心愿旧物（解锁小卖部，自理 +2）', effects: { selfCare: 2, mood: 1, unlockTuck: true } }
      ]
    },
    {
      id: 'ms_exam_7', age: 7, subTurn: 3, priority: 'P0', review_status: 'APPROVED', audit_stage: 'MECHANIC_SHELL',
      title: '第一次期末发榜与红花奖状',
      summary: `【7 岁节点 · 当前学识 ${state.stats.knowledge} / 数理 ${state.stats.numLogic || 20}】迎来人生第一张正式成绩单（学识或数理 ≥26 可评三好学生赢奖金）。`,
      choices: [
        { label: '自信领回三好学生奖状贴满墙（需学识或数理≥26，奖金 +¥150，心态 +5）', reqAny: { knowledge: 26, numLogic: 26 }, effects: { cash: 150, mood: 5, parentInt: 4, exp: 'exp_award_7', photo: '7岁第一张奖状' } },
        { label: '拿卷子回家认真订正语文与算术错题（语文/数学扎实度提升，父母亲密 +2）', effects: { subjBoost: { chn: 3, math: 3 }, parentInt: 2, mood: -1, statusBuff: { id: 'bf_hot_study', name: '手感火热', turns: 2, type: 'pos', desc: '分科吸收效率提升' } } },
        { label: '把卷子悄悄塞进枕头下先玩两天（心态 +3，自理 -1）', effects: { mood: 3, selfCare: -1 } }
      ]
    },
    {
      id: 'ms_bike_8', age: 8, subTurn: 3, priority: 'P1', review_status: 'APPROVED', audit_stage: 'MECHANIC_SHELL',
      title: '第一次学骑二八大杠自行车',
      summary: '【人生第一次】大院里借来高大的自行车，咬牙摔几次学会就能解锁更强体能与独立感。',
      choices: [
        { label: '摔破膝盖也坚持练会放手骑（健康 +3，自理 +2，心态 +3，留影入册）', effects: { health: 3, selfCare: 2, mood: 3, fatigue: 2, exp: 'exp_bike_8', photo: '8岁学会骑自行车' } },
        { label: '让爸妈在后面扶着慢慢来（父母亲密 +4，心态 +2）', effects: { parentInt: 4, mood: 2 } }
      ]
    },
    {
      id: 'ms_monitor_9', age: 9, subTurn: 2, priority: 'P1', review_status: 'APPROVED', audit_stage: 'MECHANIC_SHELL',
      title: '学校春游与第一次班干部竞选',
      summary: `【9 岁节点 · 当前表达 ${state.stats.expr}】班里公开竞选班长与文艺委员，纯检验表达与人缘（表达 ≥28 可当选）。`,
      choices: [
        { label: '上台大方演讲竞选班长（需表达≥28，当选班长：表达 +3，心态 +4）', reqAny: { expr: 28 }, effects: { expr: 3, mood: 4, exp: 'exp_monitor_9', statusBuff: { id: 'bf_leader', name: '班干光环', turns: 4, type: 'pos', desc: '社交与学习心态更稳' } } },
        { label: '帮同桌拉票当后勤小队长（同桌亲密 +5，表达 +2，心态 +2）', effects: { friendInt: 5, expr: 2, mood: 2 } },
        { label: '专心享受春游野餐不想操心（心态 +4，疲劳 -2）', effects: { mood: 4, fatigue: -2 } }
      ]
    },
    {
      id: 'ms_pet_10', age: 10, subTurn: 1, priority: 'P0', review_status: 'APPROVED', audit_stage: 'MECHANIC_SHELL',
      title: '雨天纸箱里的小家伙 · 领养萌宠',
      summary: '【养宠开启节点】放学路过屋檐，发现一只淋湿的小流浪。领养后将直接住进你的主舞台陪伴成长并免疫晚年孤独！',
      choices: [
        { label: '领养小橘猫「橘座」（粘人抗孤独，寿命15年，心态 +5）', effects: { adoptPet: 'cat', mood: 5, photo: '10岁领养小橘猫橘座' } },
        { label: '领养小土狗「旺财」（陪跑加健康，寿命13年，健康 +3，心态 +4）', effects: { adoptPet: 'dog', health: 3, mood: 4, photo: '10岁领养小土狗旺财' } },
        { label: '带一只省心小仓鼠「团子」回家（小桌宠，寿命5年，心态 +4）', effects: { adoptPet: 'hamster', mood: 4, photo: '10岁领养小仓鼠团子' } },
        { label: '帮它找到好心邻居收养（自理 +2，父母亲密 +3，25岁仍有领养机会）', effects: { selfCare: 2, parentInt: 3 } }
      ]
    },
    {
      id: 'ms_grad_12', age: 12, subTurn: 2, priority: 'P0', review_status: 'APPROVED', audit_stage: 'MECHANIC_SHELL',
      build: () => {
        const rep = rollOrGetExamResult(state, 'p6');
        const detail = rep.rows.map(r => `${r.label}${r.score}`).join(' · ');
        const strictPenalty = (rep.finalScore < 256 && state.origin.id === 'teacher') ? -6 : (rep.finalScore < 256 && state.origin.id === 'welloff' ? -5 : 0);
        return {
          title: '小升初放榜与小学毕业成绩单',
          summary: `【小升初 300 分制成绩单：总分 ${rep.finalScore} 分（${detail}）】满 256 分可升入重点初中实验班（初中单科吸收 ×1.12，并解锁理综/文综）！`,
          choices: [
            {
              label: `升入【重点初中实验班】（需小升初≥256分，当前 ${rep.finalScore} 分 · 初中吸收×1.12）`,
              reqCustom: rep.finalScore >= 256,
              effects: { setSchoolTier: 'key_mid', mood: 5, exp: 'exp_mid_key', photo: `12岁小升初${rep.finalScore}分·重点实验班`, statusBuff: { id: 'bf_key_class', name: '重点实验班', turns: 6, type: 'pos', desc: '初中单科吸收提速' } }
            },
            {
              label: `升入【片区普通初中】并和同桌互写同学录（同桌亲密 +6，心态 ${3 + strictPenalty >= 0 ? '+' : ''}${3 + strictPenalty}）`,
              effects: { setSchoolTier: 'normal', friendInt: 6, expr: 2, mood: 3 + strictPenalty, photo: `12岁小升初${rep.finalScore}分·小学毕业照` }
            }
          ]
        };
      }
    },
    {
      id: 'ms_zhongkao_15', age: 15, subTurn: 2, priority: 'P0', review_status: 'APPROVED', audit_stage: 'MECHANIC_SHELL',
      build: () => {
        const rep = rollOrGetExamResult(state, 'zk');
        const zk = rep.finalScore;
        const detail = rep.rows.map(r => `${r.label}${r.score}`).join(' · ');
        const strictPenalty = (zk < 580 && state.origin.id === 'teacher') ? -6 : (zk < 460 && state.origin.id === 'welloff' ? -5 : 0);
        let choices;
        if (zk >= 580) {
          choices = [
            {
              label: `录取【省重点高中 · 理科实验班】（当前 ${zk} 分 · 高中吸收×1.12，高考考理综300分）`,
              effects: { setSchoolTier: 'key_high', setExamTrack: 'sci', mood: 6, gaokaoBonus: 2, exp: 'exp_high_key', photo: `15岁中考${zk}分·省重点理科`, statusBuff: { id: 'bf_key_high', name: '省重点学风', turns: 8, type: 'pos', desc: '高中专项吸收×1.12' } }
            },
            {
              label: `录取【省重点高中 · 文科实验班】（当前 ${zk} 分 · 高中吸收×1.12，高考考文综300分）`,
              effects: { setSchoolTier: 'key_high', setExamTrack: 'art', mood: 6, gaokaoBonus: 2, exp: 'exp_high_key', photo: `15岁中考${zk}分·省重点文科`, statusBuff: { id: 'bf_key_high', name: '省重点学风', turns: 8, type: 'pos', desc: '高中专项吸收×1.12' } }
            }
          ];
        } else if (zk >= 460) {
          choices = [
            {
              label: `升入【市普通高中 · 理科班】（当前 ${zk} 分 · 高考主攻数学与理综300分）`,
              effects: { setSchoolTier: 'normal', setExamTrack: 'sci', mood: 3 + strictPenalty, friendInt: 3, exp: 'exp_high_norm', photo: `15岁中考${zk}分·普高理科` }
            },
            {
              label: `升入【市普通高中 · 文科班】（当前 ${zk} 分 · 高考主攻语文与文综300分）`,
              effects: { setSchoolTier: 'normal', setExamTrack: 'art', mood: 3 + strictPenalty, friendInt: 3, exp: 'exp_high_norm', photo: `15岁中考${zk}分·普高文科` }
            },
            {
              label: '主动改走【职高 / 艺体特长班】（自理 +5，梦想专长 +12，补贴 +¥600）',
              effects: { setSchoolTier: 'vocational', selfCare: 5, dream: 12, cash: 600, mood: 4, exp: 'exp_high_voc', photo: `15岁中考${zk}分·特长路线` }
            }
          ];
        } else {
          choices = [
            {
              label: `进入【职高 / 艺体特长班】（中考 ${zk} 分未达普高线 · 自理 +6，梦想专长 +12，补贴 +¥600）`,
              effects: { setSchoolTier: 'vocational', selfCare: 6, dream: 12, cash: 600, mood: 3 + strictPenalty, exp: 'exp_high_voc', photo: `15岁中考${zk}分·职高特长` }
            }
          ];
        }
        return {
          title: '中考 660 分放榜与高中文理选科',
          summary: `【15岁中考成绩单：总分 ${zk}/660 分（${detail}）】省重点线 580 分、普通高中线 460 分；升入高中同步选定主攻理科或文科！`,
          choices
        };
      }
    },
    {
      id: 'ms_parttime_16', age: 16, subTurn: 2, priority: 'P1', review_status: 'APPROVED', audit_stage: 'MECHANIC_SHELL',
      title: '第一次暑假打工挣血汗钱',
      summary: '【16 岁独立体验】顶着盛夏太阳挣人生第一笔劳动报酬，顺手锻炼表达与自理能力。',
      choices: [
        { label: '去奶茶店/书店当暑期工（现金 +¥900，自理 +3，表达 +2，疲劳 +2）', effects: { cash: 900, selfCare: 3, expr: 2, fatigue: 2, photo: '16岁第一笔打工工资' } },
        { label: '给初中生当数学家教（需数理≥60，现金 +¥1,400，数学扎实度 +4，表达 +2）', reqAny: { numLogic: 60 }, effects: { cash: 1400, subjBoost: { math: 4 }, expr: 2, fatigue: 1, photo: '16岁数学家教第一桶金' } },
        { label: '在家里专注啃薄弱科目套卷（全科扎实度 +3，心态 -1）', effects: { subjBoost: { chn: 3, math: 3, eng: 3 }, mood: -1 } }
      ]
    },
    {
      id: 'ms_mock_17', age: 17, subTurn: 3, priority: 'P1', review_status: 'APPROVED', audit_stage: 'MECHANIC_SHELL',
      cond: () => state.schoolTier !== 'vocational',
      build: () => {
        const ep = getStudentExamPreview(state, []);
        const rowsTxt = ep ? ep.paper.rows.map(r => `${r.label}${r.L}~${r.U}`).join(' · ') : '';
        const lo = ep ? ep.curRange[0] : 500;
        const hi = ep ? ep.curRange[1] : 530;
        const tierTxt = hi >= 680 ? '冲刺清北线(680)' : hi >= 620 ? '冲刺985名校线(620)' : hi >= 500 ? '主流本科线(500)' : '专科区间(抓紧补弱)';
        return {
          title: '高考百日誓师与高三一模成绩单',
          summary: `【高三一模预估：${lo}~${hi}/750 分（${rowsTxt}）】当前处于${tierTxt}，距 18 岁高考仅剩最后 2 季！`,
          choices: [
            { label: '立下冲刺军令状猛攻弱科（全科扎实度 +3，留存冲刺特招资格，疲劳 +2）', effects: { subjBoost: { chn: 3, math: 3, eng: 3, sci: 3, art: 3 }, fatigue: 2, exp: 'exp_gaokao_sprint', statusBuff: { id: 'bf_sprint', name: '考前手感', turns: 2, type: 'pos', desc: '冲刺吸收效率提升' } } },
            { label: '稳住心态早睡早起收窄发挥波动（心态 +8，疲劳 -4，健康 +2）', effects: { mood: 8, fatigue: -4, health: 2 } }
          ]
        };
      }
    },
    {
      id: 'ms_pet_25', age: 25, subTurn: 2, priority: 'P1', review_status: 'APPROVED', audit_stage: 'MECHANIC_SHELL',
      cond: () => !state.pet || !state.pet.alive,
      title: '深夜下班路遇小流浪 · 独居养宠',
      summary: '【成年养宠补机】一个人在城市打拼，带只毛孩子回家住进主舞台，陪你对抗疲惫与孤独。',
      choices: [
        { label: '领养小橘猫「橘座」（心态 +5，抗孤独护盾）', effects: { adoptPet: 'cat', mood: 5, photo: '25岁领养小橘猫' } },
        { label: '领养小土狗「旺财」（健康 +3，心态 +4）', effects: { adoptPet: 'dog', health: 3, mood: 4, photo: '25岁领养小土狗' } },
        { label: '工作太忙先婉拒（自理 +2）', effects: { selfCare: 2 } }
      ]
    },
    {
      id: 'ms_turn35', age: 35, subTurn: 1, priority: 'P0', review_status: 'APPROVED', audit_stage: 'MECHANIC_SHELL',
      title: '35 岁职场三岔口 · 中年破局',
      summary: '【35 岁关键抉择】行业进入内卷周期，提前选定下半场破局姿态。',
      choices: [
        { label: '硬核深耕竞聘核心管理（需专业≥60，项目经历 +2，专业 +3，疲劳 +2）', reqAny: { pro: 60 }, effects: { pro: 3, project: 2, fatigue: 2, photo: '35岁职场破局' } },
        { label: '押注 AI 与新工具开辟第二曲线（现金 -¥3,000，点亮 AI 转型技能，学识 +3）', effects: { cash: -3000, aiSkill: true, knowledge: 3, mood: 2, photo: '35岁拥抱AI转型' } },
        { label: '降维保健康稳守现金流（健康 +5，心态 +5，疲劳 -4）', effects: { health: 5, mood: 5, fatigue: -4 } }
      ]
    }
  ];

  for (const ev of candidates) {
    if (ev.review_status !== 'APPROVED') continue;
    if (state.triggeredEvents.includes(ev.id)) continue;
    if (ev.age !== state.age || ev.subTurn !== state.subTurn) continue;
    if (ev.cond && !ev.cond()) continue;
    state.triggeredEvents.push(ev.id);
    if (typeof ev.build === 'function') {
      const built = ev.build();
      return { ...ev, ...built };
    }
    return ev;
  }
  return null;
}

// ===== 2. 庞大分阶段随机事件池（7 子阶段 + 8 大真实年份 + 宠物链 + 双性别 + 伏笔连锁）=====
export const RANDOM_EVENT_POOL = [
  // ---------- s1 快乐童年 (6–12 岁) ----------
  {
    id: 're_s1_lostcoin', stage: 's1', gender: 'any', actionTags: ['chores', 'accompany_friend'], review_status: 'APPROVED', audit_stage: 'MECHANIC_SHELL',
    title: '放学路上捡到五十元纸币',
    summary: '巷口地砖缝里躺着一张崭新纸币，四周无人。',
    choices: [
      { label: '交给校门口保安叔叔找失主（心态 +4，表达 +1，埋下好人缘伏笔）', effects: { mood: 4, expr: 1, setFlag: 'flag_honest_kid' } },
      { label: '悄悄收进铁皮存钱罐（现金 +¥50，自理 +1，心态 -1）', effects: { cash: 50, selfCare: 1, mood: -1 } }
    ]
  },
  {
    id: 're_s1_tvheat', stage: 's1', gender: 'any', actionTags: ['rest', 'study_lit', 'study_num', 'study_self'], review_status: 'APPROVED', audit_stage: 'MECHANIC_SHELL',
    title: '偷看动画片听见钥匙响',
    summary: '爸妈提前下班推门，电视机后盖还是滚烫的！',
    choices: [
      { label: '用湿毛巾急中生智给电视降温（65% 成功心态 +4，失败被念叨心态 -2）', gamble: { rate: 0.65, win: { mood: 4, selfCare: 2, msg: '惊险蒙混过关！心态 +4，自理 +2' }, lose: { mood: -2, msg: '被摸到温热后盖念叨了一顿，心态 -2' } } },
      { label: '大方承认先写完作业再看（父母亲密 +3，学识 +1）', effects: { parentInt: 3, knowledge: 1 } }
    ]
  },
  {
    id: 're_s1_vendor', stage: 's1', gender: 'any', actionTags: ['chores', 'accompany_parents'], review_status: 'APPROVED', audit_stage: 'MECHANIC_SHELL',
    title: '帮弄堂旧书摊大叔收摊躲雨',
    summary: '突降雷阵雨，旧书摊老板手忙脚乱盖塑料布。',
    choices: [
      { label: '冲上去搭把手搬书进屋檐（获赠旧书学识 +2，心态 +3，埋长线伏笔！）', effects: { knowledge: 2, mood: 3, fatigue: 1, setFlag: 'flag_helped_vendor' } },
      { label: '赶紧往家跑免得淋感冒（健康 +1）', effects: { health: 1 } }
    ]
  },
  {
    id: 're_s1_cold', stage: 's1', gender: 'any', actionTags: ['exercise', 'summer_swim'], review_status: 'APPROVED', audit_stage: 'MECHANIC_SHELL',
    title: '贪吃三根冰棍半夜闹肚子',
    summary: '一口气炫完小卖部打折冰棍，凌晨开始翻江倒海。',
    choices: [
      { label: '喝热水乖乖躺两天（健康 -2，获得 2 季「轻度感冒」状态，父母亲密 +2）', effects: { health: -2, parentInt: 2, statusBuff: { id: 'bf_cold', name: '肠胃小恙', turns: 2, type: 'neg', desc: '本季略感疲惫' } } },
      { label: '早有自理常识先冲红糖姜水（需自理≥30，健康无损，心态 +2）', reqAny: { selfCare: 30 }, effects: { mood: 2, selfCare: 1 } }
    ]
  },
  {
    id: 're_s1_blackboard', stage: 's1', gender: 'any', actionTags: ['study_lit', 'study_num', 'study_self', 'study_tutor'], review_status: 'APPROVED', audit_stage: 'MECHANIC_SHELL',
    title: '被数学老师叫上黑板解几何附加题',
    summary: '全班安静下来，三角板和粉笔握在手里有点冒汗。',
    choices: [
      { label: '画出辅助线写出漂亮解法（需数理≥28，数理 +2，数学扎实度 +4）', reqAny: { numLogic: 28 }, effects: { numLogic: 2, subjBoost: { math: 4 }, mood: 3, statusBuff: { id: 'bf_hot_study', name: '手感火热', turns: 2, type: 'pos', desc: '学习效率提升' } } },
      { label: '写出一半步骤请同桌小声提示（同桌亲密 +3，数学扎实度 +2）', effects: { friendInt: 3, subjBoost: { math: 2 } } }
    ]
  },
  {
    id: 're_s1_haircut_m', stage: 's1', gender: 'male', actionTags: ['accompany_parents', 'rest'], review_status: 'APPROVED', audit_stage: 'MECHANIC_SHELL',
    title: '理发店“只剪一点点”变寸头',
    summary: '【男主线切片】老理发师推子一推到底，镜子里的自己清爽得发光。',
    choices: [
      { label: '摸着光溜脑袋跟哥们哈哈大笑（心态 +3，表达 +1，同桌亲密 +2）', effects: { mood: 3, expr: 1, friendInt: 2 } },
      { label: '戴着鸭舌帽低调苦读一星期（学识 +2，心态 -1）', effects: { knowledge: 2, mood: -1 } }
    ]
  },
  {
    id: 're_s1_ribbon_f', stage: 's1', gender: 'female', actionTags: ['accompany_friend', 'accompany_parents'], review_status: 'APPROVED', audit_stage: 'MECHANIC_SHELL',
    title: '文艺汇演借到闪亮绸带发卡',
    summary: '【女主线切片】六一汇演前夕，好朋友借给你一枚亮晶晶的蝴蝶结发卡。',
    choices: [
      { label: '自信登台领舞赢得掌声（表达 +3，心态 +4，同桌亲密 +2）', effects: { expr: 3, mood: 4, friendInt: 2 } },
      { label: '买两颗奶糖回礼并相约下次（现金 -¥10，同桌亲密 +5，心态 +2）', effects: { cash: -10, friendInt: 5, mood: 2 } }
    ]
  },
  {
    id: 're_s1_marble_bet', stage: 's1', gender: 'any', actionTags: ['accompany_friend', 'sea_card_trade'], review_status: 'APPROVED', audit_stage: 'MECHANIC_SHELL',
    title: '操场土坑弹珠争霸赛',
    summary: '高年级孩子王拿出稀有“龙珠”当彩头邀战！',
    choices: [
      { label: '押 ¥20 迎战搏一把（60% 赢 ¥70 + 心态 +4，输亏 ¥20）', gamble: { rate: 0.60, win: { cash: 70, mood: 4, msg: '一杆清台赢下大彩头！+¥70，心态 +4' }, lose: { cash: -20, mood: -1, msg: '棋差一招输了弹珠，-¥20' } } },
      { label: '在旁边围观顺便帮同桌加油（同桌亲密 +3，心态 +2）', effects: { friendInt: 3, mood: 2 } }
    ]
  },
  {
    id: 're_s1_powerout', stage: 's1', gender: 'any', actionTags: ['study_lit', 'study_num', 'study_self', 'rest'], review_status: 'APPROVED', audit_stage: 'MECHANIC_SHELL',
    title: '夏夜小区突然全楼停电',
    summary: '台灯“啪”地熄灭，窗外传出整栋楼孩子们的欢呼声。',
    choices: [
      { label: '点起白蜡烛继续啃完最后两道题（学识 +2，心态 -1）', effects: { knowledge: 2, mood: -1 } },
      { label: '跟爸妈摇蒲扇上天台看星星（父母亲密 +4，心态 +4，疲劳 -2）', effects: { parentInt: 4, mood: 4, fatigue: -2 } }
    ]
  },
  {
    id: 're_s1_icepop', stage: 's1', gender: 'any', actionTags: ['chores', 'exercise'], review_status: 'APPROVED', audit_stage: 'MECHANIC_SHELL',
    title: '雪糕棍印着“再来一支”',
    summary: '舔到最后一眼看见木棍上清晰的中奖红字！',
    choices: [
      { label: '立刻再换一根分给同桌一半（同桌亲密 +4，心态 +4）', effects: { friendInt: 4, mood: 4 } },
      { label: '自己独享双倍快乐（心态 +5，疲劳 -1）', effects: { mood: 5, fatigue: -1 } }
    ]
  },

  // ---------- s2 青春校园 (13–18 岁) ----------
  {
    id: 're_s2_note', stage: 's2', gender: 'any', actionTags: ['study_lit', 'study_num', 'study_self', 'accompany_friend'], review_status: 'APPROVED', audit_stage: 'MECHANIC_SHELL',
    title: '课桌下悄悄传来的折纸条',
    summary: '自习课上，前排回手塞过来一张折成心形的草稿纸。',
    choices: [
      { label: '淡定回传一句幽默回复（表达 +2，心态 +4，同桌亲密 +3）', effects: { expr: 2, mood: 4, friendInt: 3 } },
      { label: '先收进文具盒等下课再拆（学识 +2，心态 +2）', effects: { knowledge: 2, mood: 2 } }
    ]
  },
  {
    id: 're_s2_radio', stage: 's2', gender: 'any', actionTags: ['rest', 'train_dream'], review_status: 'APPROVED', audit_stage: 'MECHANIC_SHELL',
    title: '被窝里偷偷听深夜音乐电台',
    summary: '耳机里飘出当年最火的华语金曲，窗外万籁俱寂。',
    choices: [
      { label: '听完点歌环节灵感涌现（梦想专长 +3，心态 +4，疲劳 +1）', effects: { dream: 3, mood: 4, fatigue: 1 } },
      { label: '定好闹钟准点睡觉养精神（健康 +2，疲劳 -2）', effects: { health: 2, fatigue: -2 } }
    ]
  },
  {
    id: 're_s2_contest', stage: 's2', gender: 'any', actionTags: ['study_lit', 'study_num', 'study_self', 'study_tutor', 'gaokao_sprint'], review_status: 'APPROVED', audit_stage: 'MECHANIC_SHELL',
    title: '市级学科竞赛临时补录名额',
    summary: '老师问你要不要周末去考场见见世面。',
    choices: [
      { label: '凭扎实功底斩获奖项（需学识≥55，学识 +3，奖金 +¥400，获冲刺经历）', reqAny: { knowledge: 55 }, effects: { knowledge: 3, cash: 400, mood: 4, exp: 'exp_gaokao_sprint' } },
      { label: '报名前去积累考场经验（学识 +2，疲劳 +2）', effects: { knowledge: 2, fatigue: 2 } }
    ]
  },
  {
    id: 're_s2_senior', stage: 's2', gender: 'any', actionTags: ['accompany_friend', 'train_dream'], review_status: 'APPROVED', audit_stage: 'MECHANIC_SHELL',
    title: '社团招新结识热心学长/学姐',
    summary: '对方把整理了三年的笔记和社团经验大方分享给你。',
    choices: [
      { label: '请喝两杯奶茶深聊请教（现金 -¥30，学识 +2，表达 +2，埋长线伏笔！）', effects: { cash: -30, knowledge: 2, expr: 2, setFlag: 'flag_senior_mentor' } },
      { label: '礼貌道谢借来复印笔记（学识 +2）', effects: { knowledge: 2 } }
    ]
  },
  {
    id: 're_s2_sneaker_bet', stage: 's2', gender: 'any', actionTags: ['chores', 'accompany_friend'], review_status: 'APPROVED', audit_stage: 'MECHANIC_SHELL',
    title: '帮同学代购限量漫画/球鞋',
    summary: '同学愿出跑腿费，但需要先垫付一小笔零花钱。',
    choices: [
      { label: '垫 ¥80 接单赚差价（70% 净赚 ¥180 + 自理 +2，30% 临时取消心态 -2）', gamble: { rate: 0.70, win: { cash: 180, selfCare: 2, msg: '顺利成交净赚 ¥180！自理 +2' }, lose: { cash: -40, mood: -2, msg: '对方跑单折价转卖，亏 ¥40' } } },
      { label: '稳妥起见只帮参谋不垫钱（自理 +1，同桌亲密 +2）', effects: { selfCare: 1, friendInt: 2 } }
    ]
  },
  {
    id: 're_s2_bball_m', stage: 's2', gender: 'male', actionTags: ['exercise', 'accompany_friend'], review_status: 'APPROVED', audit_stage: 'MECHANIC_SHELL',
    title: '放学水泥球场绝杀三分球',
    summary: '【男主线切片】暮色下最后 3 秒外线出手，球擦板落网全场沸腾！',
    choices: [
      { label: '跟兄弟击掌去校门口喝冰汽水（健康 +2，心态 +5，同桌亲密 +3）', effects: { health: 2, mood: 5, friendInt: 3 } },
      { label: '趁热打铁再加练半小时体能（健康 +4，疲劳 +2）', effects: { health: 4, fatigue: 2 } }
    ]
  },
  {
    id: 're_s2_diary_f', stage: 's2', gender: 'female', actionTags: ['rest', 'study_lit', 'study_num', 'study_self'], review_status: 'APPROVED', audit_stage: 'MECHANIC_SHELL',
    title: '带锁日记本写满青春秘密',
    summary: '【女主线切片】台灯下写完一整页关于未来城市的想象与心事。',
    choices: [
      { label: '把理想写进计划表给自己打气（学识 +2，梦想 +2，心态 +3）', effects: { knowledge: 2, dream: 2, mood: 3 } },
      { label: '和闺蜜分享几句悄悄话（表达 +2，同桌亲密 +4，心态 +3）', effects: { expr: 2, friendInt: 4, mood: 3 } }
    ]
  },
  {
    id: 're_s2_noodle', stage: 's2', gender: 'any', actionTags: ['gaokao_sprint', 'study_lit', 'study_num', 'study_self'], review_status: 'APPROVED', audit_stage: 'MECHANIC_SHELL',
    title: '晚自习回家桌上那碗热阳春面',
    summary: '十点半推开家门，厨房还留着一盏昏黄小灯和荷包蛋。',
    choices: [
      { label: '吃完抱抱爸妈聊两句学校趣事（父母亲密 +5，心态 +4，疲劳 -2）', effects: { parentInt: 5, mood: 4, fatigue: -2 } },
      { label: '端回书桌边吃边背单词（学识 +2，父母亲密 +2）', effects: { knowledge: 2, parentInt: 2 } }
    ]
  },

  // ---------- s3 初入社会 (19–25 岁) ----------
  {
    id: 're_s3_landlord', stage: 's3', gender: 'any', actionTags: ['pro_self', 'overtime'], review_status: 'APPROVED', audit_stage: 'MECHANIC_SHELL',
    title: '退租遇二房东扣押金套路',
    summary: '合同到期退房，二房东指着原本就有的墙皮划痕想扣 ¥2,500 押金。',
    choices: [
      { label: '亮出入住拍照留证+合同法条硬刚（需自理≥45或学识≥55，全额拿回还获赔 +¥1,000，心态 +4）', reqAny: { selfCare: 45, knowledge: 55 }, effects: { cash: 1000, mood: 4, expr: 2 } },
      { label: '拉着朋友据理力争谈回大半（表达 +2，损失 -¥800）', effects: { cash: -800, expr: 2 } },
      { label: '嫌麻烦息事宁人认栽（现金 -¥2,000，心态 -3）', effects: { cash: -2000, mood: -3 } }
    ]
  },
  {
    id: 're_s3_senior_back', stage: 's3', gender: 'any', reqFlag: 'flag_senior_mentor', review_status: 'APPROVED', audit_stage: 'MECHANIC_SHELL',
    title: '【伏笔回响】当年社团学长/学姐内推！',
    summary: '高中热心帮过你的前辈如今已是大厂骨干，主动发来面试内推和行业秘籍！',
    choices: [
      { label: '抓住机会虚心请教拿核心项目（专业 +4，项目经历 +1，现金奖金 +¥5,000）', effects: { pro: 4, project: 1, cash: 5000, mood: 5 } },
      { label: '请对方吃顿大餐维系长久人脉（现金 -¥500，表达 +4，老友亲密 +6）', effects: { cash: -500, expr: 4, friendInt: 6, mood: 4 } }
    ]
  },
  {
    id: 're_s3_firstpay', stage: 's3', gender: 'any', actionTags: ['overtime', 'pro_course'], review_status: 'APPROVED', audit_stage: 'MECHANIC_SHELL',
    title: '第一笔正式工资到账短信',
    summary: '手机“叮”地弹出一串实打实的数字，独立人生真正起航。',
    choices: [
      { label: '给爸妈各买件贴心礼物（现金 -¥1,200，父母亲密 +7，心态 +5）', effects: { cash: -1200, parentInt: 7, mood: 5 } },
      { label: '存进定期并给自己加个鸡腿（自理 +3，心态 +3）', effects: { selfCare: 3, mood: 3 } }
    ]
  },
  {
    id: 're_s3_dormtalk', stage: 's3', gender: 'any', actionTags: ['accompany_friend', 'rest'], review_status: 'APPROVED', audit_stage: 'MECHANIC_SHELL',
    title: '熄灯后的卧谈会聊到凌晨两点',
    summary: '大家聊起理想、城市和暗恋，窗外路灯照亮天花板。',
    choices: [
      { label: '敞开心扉畅谈人生蓝图（梦想 +3，表达 +2，心态 +4）', effects: { dream: 3, expr: 2, mood: 4 } },
      { label: '听大家吐槽顺便当情绪树洞（老友亲密 +5，心态 +3）', effects: { friendInt: 5, mood: 3 } }
    ]
  },
  {
    id: 're_s3_sidehustle', stage: 's3', gender: 'any', actionTags: ['pro_self', 'overtime'], review_status: 'APPROVED', audit_stage: 'MECHANIC_SHELL',
    title: '周末外包急单要不要接？',
    summary: '朋友群里甩出一个两天加急设计/代码私单，报酬诱人。',
    choices: [
      { label: '通宵接下拼一把（72% 赚 ¥4,500 + 专业 +2，28% 客户改需求崩溃心态 -3）', gamble: { rate: 0.72, win: { cash: 4500, pro: 2, fatigue: 3, msg: '顺利交付入账 ¥4,500！专业 +2' }, lose: { cash: 1000, mood: -3, fatigue: 4, msg: '甲改八版勉强结款 ¥1,000，累够呛' } } },
      { label: '保护发际线好好过周末（健康 +2，疲劳 -2，心态 +2）', effects: { health: 2, fatigue: -2, mood: 2 } }
    ]
  },
  {
    id: 're_s3_rain_subway', stage: 's3', gender: 'any', actionTags: ['overtime', 'pub_drink'], review_status: 'APPROVED', audit_stage: 'MECHANIC_SHELL',
    title: '暴雨夜末班地铁口的关东煮',
    summary: '加班淋湿鞋袜，便利店阿姨顺手多盛了一勺滚烫萝卜汤。',
    choices: [
      { label: '站在屋檐下慢慢吃完暖身（心态 +5，疲劳 -2）', effects: { mood: 5, fatigue: -2 } },
      { label: '给家人打个简短报平安电话（父母亲密 +4，心态 +3）', effects: { parentInt: 4, mood: 3 } }
    ]
  },

  // ---------- s4 人生选择 (26–35 岁) ----------
  {
    id: 're_s4_vendor_back', stage: 's4', gender: 'any', reqFlag: 'flag_helped_vendor', review_status: 'APPROVED', audit_stage: 'MECHANIC_SHELL',
    title: '【伏笔回响】当年旧书摊大叔之子做房产中介！',
    summary: '周末看房时居然撞见当年你冒雨帮过的大叔一家，对方感动得直接给你塞了内部笋盘红包！',
    choices: [
      { label: '收下这份跨越二十年的善意（现金 +¥18,000，心态 +6，获命运重随券 +1！）', effects: { cash: 18000, mood: 6, rerollTicket: 1 } }
    ]
  },
  {
    id: 're_s4_headhunt', stage: 's4', gender: 'any', actionTags: ['pro_course', 'overtime'], review_status: 'APPROVED', audit_stage: 'MECHANIC_SHELL',
    title: '猎头深夜发来高薪挖角邀约',
    summary: '一家竞品开出诱人签字费，但业务线传闻动荡。',
    choices: [
      { label: '拿 Offer 去跟现东家巧妙谈薪（需表达≥52，立得年终加薪 +¥22,000，心态 +4）', reqAny: { expr: 52 }, effects: { cash: 22000, mood: 4, pro: 2 } },
      { label: '赌一把跳槽拿签字费（65% 净赚 ¥35,000 + 项目 +1，35% 裁撤亏 ¥8,000）', gamble: { rate: 0.65, win: { cash: 35000, project: 1, msg: '新平台起飞！签字费落袋 ¥3.5 万' }, lose: { cash: -8000, mood: -4, msg: '业务收缩踩坑过渡，损失 ¥8,000' } } },
      { label: '稳字当头拒绝诱惑（心态 +2，疲劳 -1）', effects: { mood: 2, fatigue: -1 } }
    ]
  },
  {
    id: 're_s4_wedding_red', stage: 's4', gender: 'any', actionTags: ['accompany_friend', 'date_partner'], review_status: 'APPROVED', audit_stage: 'MECHANIC_SHELL',
    title: '国庆黄金周连收三张红色炸弹',
    summary: '老同学扎堆结婚，钱包和假期同时告急。',
    choices: [
      { label: '体面随礼并借机拓展老同学圈（现金 -¥3,000，老友亲密 +5，表达 +2）', effects: { cash: -3000, friendInt: 5, expr: 2 } },
      { label: '只去最铁的那场其余礼到人不到（现金 -¥1,200，心态 +2）', effects: { cash: -1200, mood: 2 } }
    ]
  },
  {
    id: 're_s4_blame', stage: 's4', gender: 'any', actionTags: ['overtime', 'pro_self'], review_status: 'APPROVED', audit_stage: 'MECHANIC_SHELL',
    title: '跨部门评审会同事当众甩锅',
    summary: 'PPT 翻到延期页，隔壁组顺手把责任推到你头上。',
    choices: [
      { label: '当场亮出邮件时间线优雅反杀（需表达≥50或专业≥55，项目 +1，心态 +5，获「职场红人」）', reqAny: { expr: 50, pro: 55 }, effects: { project: 1, mood: 5, statusBuff: { id: 'bf_work_star', name: '职场红人', turns: 3, type: 'pos', desc: '职场成长更顺畅' } } },
      { label: '会后私下沟通把事兜住（专业 +2，疲劳 +2，心态 -2）', effects: { pro: 2, fatigue: 2, mood: -2 } }
    ]
  },
  {
    id: 're_s4_carplate', stage: 's4', gender: 'any', actionTags: ['sea_house_tour', 'rest'], review_status: 'APPROVED', audit_stage: 'MECHANIC_SHELL',
    title: '新能源摇号意外中签通知',
    summary: '等了两年的购车指标突然批下来，有效期只有半年。',
    choices: [
      { label: '若存款充裕咬牙提辆代步车（需自理≥40，现金 -¥12万，心态 +8，健康 +2）', reqAny: { selfCare: 40 }, effects: { cash: -120000, mood: 8, health: 2, photo: '喜提人生第一台车' } },
      { label: '现阶段现金为王先留钱安家（自理 +2，心态 +1）', effects: { selfCare: 2, mood: 1 } }
    ]
  },
  {
    id: 're_s4_pressure_f', stage: 's4', gender: 'female', actionTags: ['pro_course', 'date_partner'], review_status: 'APPROVED', audit_stage: 'MECHANIC_SHELL',
    title: '晋升答辩被问“近期家庭规划”',
    summary: '【女主线切片】业务指标全组第一，终面却被抛来一道微妙的个人问题。',
    choices: [
      { label: '用硬核数据与清晰边界从容回应（需表达≥50，专业 +3，项目 +1，心态 +5）', reqAny: { expr: 50 }, effects: { pro: 3, project: 1, mood: 5 } },
      { label: '不卑不亢转回业务落地规划（专业 +2，表达 +2，心态 +2）', effects: { pro: 2, expr: 2, mood: 2 } }
    ]
  },
  {
    id: 're_s4_pressure_m', stage: 's4', gender: 'male', actionTags: ['overtime', 'pub_drink'], review_status: 'APPROVED', audit_stage: 'MECHANIC_SHELL',
    title: '下班在车库/楼下独自坐了十分钟',
    summary: '【男主线切片】熄火后没急着上楼，听完电台里一整首老歌。',
    choices: [
      { label: '深呼吸卸下重担回家吃热饭（心态 +5，疲劳 -3，伴侣/父母亲密 +2）', effects: { mood: 5, fatigue: -3, parentInt: 2, partnerInt: 2 } },
      { label: '顺手复盘今年财务账本做规划（自理 +3，心态 +2）', effects: { selfCare: 3, mood: 2 } }
    ]
  },

  // ---------- s5 中年攻坚 (36–50 岁) ----------
  {
    id: 're_s5_checkup', stage: 's5', gender: 'any', actionTags: ['overtime', 'pub_drink'], review_status: 'APPROVED', audit_stage: 'MECHANIC_SHELL',
    title: '年度体检报告亮起三个向上箭头',
    summary: '血脂、尿酸和颈椎齐齐报警，医生劝你别再熬夜硬扛。',
    choices: [
      { label: '立刻办健身卡规律调理（现金 -¥3,000，健康 +6，疲劳 -3，获「自律调养」）', effects: { cash: -3000, health: 6, fatigue: -3, statusBuff: { id: 'bf_fit', name: '自律调养', turns: 3, type: 'pos', desc: '身心回血增强' } } },
      { label: '保温杯泡枸杞先顶着忙完项目（健康 -2，专业 +2）', effects: { health: -2, pro: 2 } }
    ]
  },
  {
    id: 're_s5_borrow', stage: 's5', gender: 'any', actionTags: ['accompany_friend', 'overtime'], review_status: 'APPROVED', audit_stage: 'MECHANIC_SHELL',
    title: '多年不联系的老同学发微信借钱',
    summary: '寒暄两句后开口周转 ¥5 万，说年底工程款回笼连本带利还。',
    choices: [
      { label: '用理财常识识别风险并高情商婉拒（需表达≥55或自理≥55，免损且心态 +3，自理 +2）', reqAny: { expr: 55, selfCare: 55 }, effects: { mood: 3, selfCare: 2 } },
      { label: '念旧情借出一小笔救急（50% 连本带利收 ¥2.5 万，50% 失联亏 ¥2 万）', gamble: { rate: 0.50, win: { cash: 25000, friendInt: 5, msg: '对方讲信用按时还清并带谢礼！+¥2.5 万' }, lose: { cash: -20000, mood: -4, msg: '消息石沉大海，肉包子打狗 -¥2 万' } } },
      { label: '装没看见冷处理（心态 -1）', effects: { mood: -1 } }
    ]
  },
  {
    id: 're_s5_invest_friend', stage: 's5', gender: 'any', actionTags: ['pro_course', 'sea_market'], review_status: 'APPROVED', audit_stage: 'MECHANIC_SHELL',
    title: '朋友邀你入股社区轻食咖啡馆',
    summary: '启动资金 ¥4 万，选址不错但餐饮竞争惨烈。',
    choices: [
      { label: '小投 ¥4 万搏个副业管道（58% 爆火赚 ¥11 万，42% 关店亏 ¥3.5 万）', gamble: { rate: 0.58, win: { cash: 110000, mood: 6, msg: '社区小店成网红打卡地，分红入账 ¥11 万！' }, lose: { cash: -35000, mood: -3, msg: '客流不及预期止损退场，亏 ¥3.5 万' } } },
      { label: '用学识帮朋友做完选址分析后不入股（学识 +2，老友亲密 +3）', effects: { knowledge: 2, friendInt: 3 } }
    ]
  },
  {
    id: 're_s5_parent_hosp', stage: 's5', gender: 'any', actionTags: ['accompany_parents', 'overtime'], review_status: 'APPROVED', audit_stage: 'MECHANIC_SHELL',
    title: '父母小手术住院陪床一周',
    summary: '病房走廊里才真切感到，曾经为你遮风挡雨的人已经两鬓斑白。',
    choices: [
      { label: '请假亲自陪护请好护工（现金 -¥8,000，父母亲密 +8，心态 +2，疲劳 +2）', effects: { cash: -8000, parentInt: 8, mood: 2, fatigue: 2 } },
      { label: '用自理经验安排好医保报销与营养餐（需自理≥55，仅花 ¥3,000，父母亲密 +8，心态 +4）', reqAny: { selfCare: 55 }, effects: { cash: -3000, parentInt: 8, mood: 4 } }
    ]
  },

  // ---------- s6 人生转场 (51–65 岁) ----------
  {
    id: 're_s6_retire_party', stage: 's6', gender: 'any', actionTags: ['rehire_work', 'elder_uni'], review_status: 'APPROVED', audit_stage: 'MECHANIC_SHELL',
    title: '交还工牌的最后一天告别会',
    summary: '年轻同事捧来鲜花和定制相框，几十年职场画下温暖句点。',
    choices: [
      { label: '洒脱挥手开启人生第二春（心态 +7，老友亲密 +4，拍照入册）', effects: { mood: 7, friendInt: 4, photo: '职场告别 · 第二人生起步' } },
      { label: '把压箱底经验整理成册留给后辈（专业 +2，表达 +3，现金感谢金 +¥5,000）', effects: { pro: 2, expr: 3, cash: 5000, mood: 4 } }
    ]
  },
  {
    id: 're_s6_dance_turf', stage: 's6', gender: 'any', actionTags: ['square_dance', 'exercise'], review_status: 'APPROVED', audit_stage: 'MECHANIC_SHELL',
    title: '公园音响分贝之争与广场舞C位',
    summary: '太极队和广场舞队为晚上七点的音响音量争得面红耳赤。',
    choices: [
      { label: '出面调解排好错峰时间表（需表达≥55，老年圈 +2，心态 +5，表达 +2）', reqAny: { expr: 55 }, effects: { elderCircle: 2, mood: 5, expr: 2 } },
      { label: '加入大家一起跳完三首金曲（健康 +3，心态 +4，老年圈 +1）', effects: { health: 3, mood: 4, elderCircle: 1 } }
    ]
  },
  {
    id: 're_s6_health_pot', stage: 's6', gender: 'any', actionTags: ['elder_uni', 'sea_morning_mkt'], review_status: 'APPROVED', audit_stage: 'MECHANIC_SHELL',
    title: '“量子磁疗理疗床”免费体验会',
    summary: '嘴甜的销售一口一个叔叔阿姨，推销 ¥28,000 的神奇理疗床。',
    choices: [
      { label: '当场科普拆穿套路帮邻里避坑（需学识≥50，获得防骗留痕，心态 +6，老友亲密 +4）', reqAny: { knowledge: 50 }, effects: { exp: 'exp_anti_scam', mood: 6, friendInt: 4 } },
      { label: '领完免费米面油转身就走（自理 +2，心态 +2）', effects: { selfCare: 2, mood: 2 } },
      { label: '耳根一软刷卡买回家（现金 -¥28,000，心态 -4）', effects: { cash: -28000, mood: -4 } }
    ]
  },

  // ---------- s7 晚年生活 (66–90 岁) ----------
  {
    id: 're_s7_reunion40', stage: 's7', gender: 'any', actionTags: ['accompany_friend', 'world_trip'], review_status: 'APPROVED', audit_stage: 'MECHANIC_SHELL',
    title: '老同学四十周年重聚茶话会',
    summary: '当年坐在教室后排的少年们都已白发苍苍，一开口还是熟悉外号。',
    choices: [
      { label: '和同桌小周翻出旧同学录合拍新照（同桌亲密 +8，心态 +7，入册留念）', effects: { friendInt: 8, mood: 7, photo: '老同学四十周年重聚' } },
      { label: '自告奋勇请大家喝一壶好茶（现金 -¥1,500，老友亲密 +10，心态 +6）', effects: { cash: -1500, friendInt: 10, mood: 6 } }
    ]
  },
  {
    id: 're_s7_oldbankbook', stage: 's7', gender: 'any', actionTags: ['rest', 'elder_uni'], review_status: 'APPROVED', audit_stage: 'MECHANIC_SHELL',
    title: '整理旧樟木箱翻出泛黄老存单',
    summary: '抽屉夹层里居然压着一张二十年前忘了取的小额定期存单！',
    choices: [
      { label: '去银行连本带息取出来奖励自己（现金 +¥16,000，心态 +6）', effects: { cash: 16000, mood: 6 } },
      { label: '拍下照片连同故事讲给后辈听（心态 +5，现金 +¥12,000，亲密 +4）', effects: { cash: 12000, mood: 5, friendInt: 4 } }
    ]
  },
  {
    id: 're_s7_sun_bench', stage: 's7', gender: 'any', actionTags: ['exercise', 'rest'], review_status: 'APPROVED', audit_stage: 'MECHANIC_SHELL',
    title: '冬日暖阳长椅结交忘年交',
    summary: '公园里一位迷茫的年轻画家坐在旁边写生，跟你聊起人生抉择。',
    choices: [
      { label: '把走过的弯路化作温柔建议（心态 +6，健康 +2，获「精神矍铄」状态）', effects: { mood: 6, health: 2, statusBuff: { id: 'bf_elder_glow', name: '精神矍铄', turns: 3, type: 'pos', desc: '晚年身心稳健' } } }
    ]
  },

  // ---------- 8 大真实年份集体记忆切片（year = 1992 + age 当年高权重！）----------
  {
    id: 're_era_1998', eraYear: 1998, gender: 'any', review_status: 'APPROVED', audit_stage: 'MECHANIC_SHELL',
    title: '【1998 时代记忆】全家人围看电视金曲与暑期神剧',
    summary: '1998 年的电风扇嗡嗡转着，街头巷尾都在播同一首主题曲。',
    choices: [
      { label: '跟爸妈一边切西瓜一边看电视（父母亲密 +4，心态 +4）', effects: { parentInt: 4, mood: 4 } },
      { label: '趁广告间隙多背两首古诗（学识 +2，心态 +2）', effects: { knowledge: 2, mood: 2 } }
    ]
  },
  {
    id: 're_era_2000', eraYear: 2000, gender: 'any', review_status: 'APPROVED', audit_stage: 'MECHANIC_SHELL',
    title: '【2000 千禧夜】世纪交替的烟花倒计时',
    summary: '千禧年零点钟声响起，全城阳台上都是欢呼与闪光灯。',
    choices: [
      { label: '许下关于未来的第一个大心愿（梦想专长 +4，心态 +5，拍照留念）', effects: { dream: 4, mood: 5, photo: '2000千禧年烟花夜' } },
      { label: '和同桌约定十年后还要做朋友（同桌亲密 +6，心态 +4）', effects: { friendInt: 6, mood: 4 } }
    ]
  },
  {
    id: 're_era_2003', eraYear: 2003, gender: 'any', review_status: 'APPROVED', audit_stage: 'MECHANIC_SHELL',
    title: '【2003 时代记忆】停课在家的广播空中课堂',
    summary: '那个春天小区门口多了体温计，电视里放着空中课堂。',
    choices: [
      { label: '自律跟着空中课堂弯道超车（学识 +3，自理 +2）', effects: { knowledge: 3, selfCare: 2 } },
      { label: '趁机把家里的老漫画书全翻烂（心态 +5，梦想 +2）', effects: { mood: 5, dream: 2 } }
    ]
  },
  {
    id: 're_era_2008', eraYear: 2008, gender: 'any', review_status: 'APPROVED', audit_stage: 'MECHANIC_SHELL',
    title: '【2008 时代记忆】盛夏守在电视前看奥运开幕',
    summary: '2008 年八月的夜晚，全家人齐声为中国队呐喊助威！',
    choices: [
      { label: '被赛场拼搏点燃热血（健康 +3，梦想专长 +4，心态 +5，入册留念）', effects: { health: 3, dream: 4, mood: 5, photo: '2008盛夏奥运之夜' } },
      { label: '和朋友彻夜聊起奥运与未来（同桌亲密 +5，表达 +2，心态 +4）', effects: { friendInt: 5, expr: 2, mood: 4 } }
    ]
  },
  {
    id: 're_era_2012', eraYear: 2012, gender: 'any', review_status: 'APPROVED', audit_stage: 'MECHANIC_SHELL',
    title: '【2012 时代记忆】换上人生第一部触屏智能机',
    summary: '告别按键机，指尖划开移动互联网的新世界。',
    choices: [
      { label: '研究新应用抓住移动互联网风口（专业 +3，学识 +2，现金 -¥2,000）', effects: { pro: 3, knowledge: 2, cash: -2000 } },
      { label: '建起老同学微信群把大家拉回一起（老友亲密 +6，表达 +2，心态 +3）', effects: { friendInt: 6, expr: 2, mood: 3 } }
    ]
  },
  {
    id: 're_era_2016', eraYear: 2016, gender: 'any', review_status: 'APPROVED', audit_stage: 'MECHANIC_SHELL',
    title: '【2016 时代记忆】扫二维码付款与楼市喧嚣',
    summary: '出门不用带现金了，茶水间人人都在讨论房价与理财。',
    choices: [
      { label: '冷静复盘家庭现金流与买房节奏（自理理财 +4，心态 +2）', effects: { selfCare: 4, mood: 2 } },
      { label: '紧盯行业新机会主动加码技能（专业 +3，项目 +1）', effects: { pro: 3, project: 1 } }
    ]
  },
  {
    id: 're_era_2025', eraYear: 2025, gender: 'any', review_status: 'APPROVED', audit_stage: 'MECHANIC_SHELL',
    title: '【2025 时代记忆】生成式 AI 改写办公桌',
    summary: '曾经要通宵写的报表和代码，现在被 AI 助手几分钟搭出初稿。',
    choices: [
      { label: '立刻系统掌握 AI 工作流抢占先机（点亮 AI 转型技能，专业 +4，学识 +2）', effects: { aiSkill: true, pro: 4, knowledge: 2, mood: 3 } },
      { label: '顺手教爸妈防备 AI 换脸语音诈骗（父母亲密 +6，获得防骗留痕）', effects: { parentInt: 6, exp: 'exp_anti_scam', mood: 3 } }
    ]
  },

  // ---------- 宠物互动随机切片（仅在宠物存活时触发）----------
  {
    id: 're_pet_sofa', reqPet: true, gender: 'any', review_status: 'APPROVED', audit_stage: 'MECHANIC_SHELL',
    title: '【毛孩子日常】回家发现纸巾铺满一地雪',
    summary: '你的小家伙蹲在“案发现场”歪头装无辜，尾巴还轻轻摇着。',
    choices: [
      { label: '哭笑不得拍张丑照发朋友圈（心态 +4，表达 +1，疲劳 -1）', effects: { mood: 4, expr: 1, fatigue: -1 } },
      { label: '耐心收拾干净顺便训练规矩（自理 +2，心态 +2）', effects: { selfCare: 2, mood: 2 } }
    ]
  },
  {
    id: 're_pet_walk', reqPet: true, gender: 'any', review_status: 'APPROVED', audit_stage: 'MECHANIC_SHELL',
    title: '【毛孩子日常】小区院子遛弯成社交破冰王',
    summary: '毛孩子一路亲热地跟邻居打招呼，帮你瞬间熟络了半个单元楼。',
    choices: [
      { label: '顺势和热情邻居聊得火热成了熟人（表达 +3，老友亲密 +4，健康 +2）', effects: { expr: 3, friendInt: 4, health: 2, mood: 3 } }
    ]
  },
  {
    id: 're_pet_keyboard', reqPet: true, gender: 'any', review_status: 'APPROVED', audit_stage: 'MECHANIC_SHELL',
    title: '【毛孩子日常】一屁股坐上键盘/作业本',
    summary: '你正埋头苦干，它理直气壮地压住纸张发出咕噜噜的催休息声。',
    choices: [
      { label: '投降！先抱怀里吸五分钟再干活（心态 +5，疲劳 -3）', effects: { mood: 5, fatigue: -3 } },
      { label: '用小零食引开继续冲刺（现金 -¥20，学识/专业 +2）', effects: { cash: -20, mainStudy: 2 } }
    ]
  },
  {
    id: 're_pet_neighbor', reqPet: true, gender: 'any', review_status: 'APPROVED', audit_stage: 'MECHANIC_SHELL',
    title: '【毛孩子日常】宠物店老板送来试吃大礼包',
    summary: '因为你家小家伙太招人喜欢，店主白送了一袋高端罐头和玩具！',
    choices: [
      { label: '开心收下省了一笔口粮钱（现金 +¥180，心态 +4）', effects: { cash: 180, mood: 4 } }
    ]
  }
];

// ===== 3. 跨局防重复 + 上下文权重抽牌引擎（35% 半路插曲触发）=====
export function rollMidTurnRandomEvent(state, draftIds = []) {
  const stage = getSubStage(state.age).id;
  const year = 1992 + state.age;
  const hasLivingPet = Boolean(state.pet && state.pet.alive);

  // 基础触发率 35%；前 6 季新手体验保护升至 52%；奇遇 2 羁绊升至 55%
  let chance = 0.35;
  if ((state.totalTurns || 0) < 6) chance = 0.52;
  if (getBondTier(state, 'luck') >= 2) chance = Math.max(chance, 0.55);
  if (hasHex(state, 'hx_duo_chill')) chance = Math.max(chance, 0.48);

  // 真实年份事件当年强制提高到 80% 触发机会
  const hasEraDue = RANDOM_EVENT_POOL.some(ev =>
    ev.review_status === 'APPROVED' &&
    ev.eraYear === year &&
    !state.triggeredEvents.includes(ev.id)
  );
  if (hasEraDue) chance = Math.max(chance, 0.80);

  if (Math.random() > chance) return null;

  const seenSet = loadSeenEvents();
  const draftSet = new Set(draftIds);

  const eligible = RANDOM_EVENT_POOL.filter(ev => {
    if (ev.review_status !== 'APPROVED') return false;
    if (state.triggeredEvents.includes(ev.id)) return false;
    if (ev.gender && ev.gender !== 'any' && ev.gender !== state.gender) return false;
    if (ev.reqPet && !hasLivingPet) return false;
    if (ev.reqFlag && !(state.eventFlags || []).includes(ev.reqFlag)) return false;
    if (ev.eraYear && ev.eraYear !== year) return false;
    if (ev.stage && ev.stage !== stage) return false;
    return true;
  });

  if (!eligible.length) return null;

  const weighted = eligible.map(ev => {
    let w = 1.0;
    if (!seenSet.has(ev.id)) w *= 3.5; // 跨局新鲜度保护：新局优先出从未见过的事件！
    if (ev.eraYear === year) w *= 6.0;
    if (ev.reqFlag) w *= 5.0;
    if (ev.reqPet) w *= 1.8;
    if (ev.actionTags && ev.actionTags.some(t => draftSet.has(t))) w *= 2.2;
    return { ev, w };
  });

  const total = weighted.reduce((a, x) => a + x.w, 0);
  let r = Math.random() * total;
  for (const item of weighted) {
    r -= item.w;
    if (r <= 0) {
      state.triggeredEvents.push(item.ev.id);
      markEventSeen(item.ev.id);
      return item.ev;
    }
  }
  const last = weighted[weighted.length - 1].ev;
  state.triggeredEvents.push(last.id);
  markEventSeen(last.id);
  return last;
}

// ===== 4. 统一事件选项回流结算器（支持检定、赌局、状态Buff、伏笔、领养宠物、选梦想）=====
export function applyEventChoiceEffects(state, choice) {
  let msg = '';
  let ef = choice.effects || {};
  let openTuckAfter = false;
  let photoCaption = null;

  // 概率小博弈分支（联动天选锦鲤 +25% 胜率 & 奇遇4保底不亏）
  if (choice.gamble) {
    let rate = choice.gamble.rate;
    if (hasHex(state, 'hx_koi_god')) rate = Math.min(0.95, rate + 0.25);
    if (getBondTier(state, 'luck') >= 4) rate = Math.min(0.95, rate + 0.20);
    const won = Math.random() < rate;
    if (won) {
      ef = choice.gamble.win;
      msg = ef.msg || '手气爆棚，博弈成功！';
    } else if (getBondTier(state, 'luck') >= 4) {
      // 奇遇 4 羁绊：概率事件保底不亏！
      ef = { mood: 2 };
      msg = '【奇遇 4 羁绊保底】惊险化险为夷，毫发无损且心态 +2！';
    } else {
      ef = choice.gamble.lose;
      msg = ef.msg || '运气差了一点点…';
    }
  }

  ensureExamState(state);
  const capD = state.age <= 18 ? getStageTextbookCap(state.age, state.subTurn) : 100;
  if (ef.cash) state.cash += ef.cash;
  if (ef.knowledge) {
    state.statsRaw.knowledge = Math.min(capD, Math.max(0, state.statsRaw.knowledge + ef.knowledge));
    syncVisibleAcademicStats(state);
    state.usedThisYear.knowledge = true;
  }
  if (ef.numLogic) {
    state.statsRaw.numLogic = Math.min(capD, Math.max(0, state.statsRaw.numLogic + ef.numLogic));
    syncVisibleAcademicStats(state);
    state.usedThisYear.numLogic = true;
  }
  if (ef.subjBoost && state.subjects) {
    for (const [sk, dv] of Object.entries(ef.subjBoost)) {
      if (typeof state.subjects[sk] === 'number') {
        state.subjects[sk] = Math.min(capD, Math.max(0, state.subjects[sk] + dv));
      }
    }
  }
  if (ef.setSchoolTier) {
    state.schoolTier = ef.setSchoolTier;
    if (ef.setSchoolTier === 'vocational' && state.dreams?.d_tsinghua && state.dreams.d_tsinghua.stage > 0 && state.dreams.d_tsinghua.stage < 4) {
      state.dreams.d_tsinghua.pausedForVocational = true;
    }
  }
  if (ef.setExamTrack) state.examTrack = ef.setExamTrack;
  if (ef.pro) { state.stats.pro = clamp(state.stats.pro + ef.pro); state.usedThisYear.pro = true; }
  if (ef.expr) { state.stats.expr = clamp(state.stats.expr + ef.expr); state.usedThisYear.expr = true; }
  if (ef.selfCare) { state.stats.selfCare = clamp(state.stats.selfCare + ef.selfCare); state.usedThisYear.selfCare = true; }
  if (ef.mainStudy) {
    if (state.age <= 18) {
      state.statsRaw.knowledge = Math.min(capD, state.statsRaw.knowledge + ef.mainStudy);
      syncVisibleAcademicStats(state);
    } else {
      state.stats.pro = clamp(state.stats.pro + ef.mainStudy);
    }
  }
  if (ef.health) state.stats.health = clamp(state.stats.health + ef.health);
  if (ef.mood) state.stats.mood = clamp(state.stats.mood + ef.mood);
  if (ef.fatigue) state.stats.fatigue = clamp(state.stats.fatigue + ef.fatigue);
  if (ef.dream) state.dreamSkill = clamp((state.dreamSkill || 0) + ef.dream);
  if (ef.project) state.projectCount = (state.projectCount || 0) + ef.project;
  if (ef.aiSkill) state.aiSkillLearned = true;
  if (ef.gaokaoBonus) state.gaokaoHexBonus = (state.gaokaoHexBonus || 0) + ef.gaokaoBonus;
  if (ef.parentInt) state.relations.parents.intimacy = clamp(state.relations.parents.intimacy + ef.parentInt);
  if (ef.friendInt) state.relations.friend.intimacy = clamp(state.relations.friend.intimacy + ef.friendInt);
  if (ef.partnerInt && state.relations.partner) state.relations.partner.intimacy = clamp(state.relations.partner.intimacy + ef.partnerInt);
  if (ef.elderCircle) {
    state.elderCircleProgress = (state.elderCircleProgress || 0) + ef.elderCircle;
    if (state.elderCircleProgress >= 3) state.elderCircle = true;
  }
  if (ef.item && !state.items.includes(ef.item)) state.items.push(ef.item);
  if (ef.exp && !state.experiences.includes(ef.exp)) state.experiences.push(ef.exp);
  if (ef.setFlag) {
    if (!Array.isArray(state.eventFlags)) state.eventFlags = [];
    if (!state.eventFlags.includes(ef.setFlag)) state.eventFlags.push(ef.setFlag);
  }
  if (ef.statusBuff) {
    if (!Array.isArray(state.statusBuffs)) state.statusBuffs = [];
    state.statusBuffs = state.statusBuffs.filter(b => b.id !== ef.statusBuff.id);
    state.statusBuffs.push({ ...ef.statusBuff });
  }
  if (ef.rerollTicket) state.hexRerollTickets = (state.hexRerollTickets || 0) + ef.rerollTicket;
  if (ef.unlockTuck) state.tuckUnlocked = true;
  if (ef.openTuckAfter) openTuckAfter = true;
  if (ef.adoptPet) {
    adoptPet(state, ef.adoptPet);
    msg = `欢迎「${PET_CATALOG[ef.adoptPet]?.defaultName}」入住你的小家！在主页点它即可摸头互动`;
  }
  // ===== 四阶自然生长追梦系统回流结算 =====
  ensureDreamState(state);
  if (ef.dreamSpark) {
    const d = state.dreams[ef.dreamSpark];
    const meta = DREAM_CATALOG[ef.dreamSpark];
    if (d) {
      d.stage = 1;
      d.xp = clamp(Math.max(d.xp, 12));
      if (!d.seenSlices.includes('spark')) d.seenSlices.push('spark');
      syncLegacyDreamFields(state);
      msg = `已点亮【${meta.name}】启蒙火种！排程抽屉已长出专属行动「${meta.actionHobby.name}」`;
    }
  }
  if (ef.dreamPassSpark) {
    const d = state.dreams[ef.dreamPassSpark];
    if (d && !d.seenSlices.includes('spark')) d.seenSlices.push('spark');
  }
  if (ef.dreamTrialDone) {
    const d = state.dreams[ef.dreamTrialDone];
    if (d && !d.seenSlices.includes('trial')) d.seenSlices.push('trial');
  }
  if (ef.songTitle && state.dreams.d_singer) {
    state.dreams.d_singer.songName = ef.songTitle;
  }
  if (ef.addSong && state.dreams.d_singer) {
    state.dreams.d_singer.songsCount = Math.min(10, (state.dreams.d_singer.songsCount || 0) + ef.addSong);
  }
  if (ef.dreamXp) {
    const d = state.dreams[ef.dreamXp.id];
    if (d) {
      d.xp = clamp(d.xp + ef.dreamXp.v);
      syncLegacyDreamFields(state);
    }
  }
  if (ef.keepsake) {
    addKeepsakeWithStory(state, ef.keepsake.name, ef.keepsake.story, ef.keepsake.buff);
    if (!msg) msg = `旧物多宝格新增珍藏：「${ef.keepsake.name}」`;
  }
  if (ef.dreamConflictDone) {
    const d = state.dreams[ef.dreamConflictDone];
    if (d && !d.seenSlices.includes('conflict')) d.seenSlices.push('conflict');
  }
  if (ef.qualifyMed && state.dreams.d_surgeon) {
    state.dreams.d_surgeon.medQualified = true;
  }
  if (ef.dreamCommit) {
    const d = state.dreams[ef.dreamCommit];
    const meta = DREAM_CATALOG[ef.dreamCommit];
    if (d) {
      d.stage = 3;
      if (!d.seenSlices.includes('commit')) d.seenSlices.push('commit');
      syncLegacyDreamFields(state);
      msg = `正式立志追逐【${meta.name}】！后续海克斯觉醒将概率刷出专属命定卡`;
    }
  }
  if (ef.dreamAdversityDone) {
    const d = state.dreams[ef.dreamAdversityDone];
    if (d && !d.seenSlices.includes('adversity')) d.seenSlices.push('adversity');
  }
  if (ef.dreamPivot) {
    const meta = DREAM_CATALOG[ef.dreamPivot];
    applyGracefulPivot(state, ef.dreamPivot);
    msg = `与执念温柔和解，过往投入已沉淀为终身特质：${meta.pivotTrait}`;
  }
  let launchClimaxArcade = null;
  let launchQualifierArcade = null;
  if (ef.launchClimaxArcade) {
    launchClimaxArcade = ef.launchClimaxArcade;
  }
  if (ef.launchQualifierArcade) {
    launchQualifierArcade = ef.launchQualifierArcade;
  }
  if (ef.resolveDreamQualifier) {
    const res = settleDreamQualifier(state, ef.resolveDreamQualifier.id, ef.resolveDreamQualifier.grade || 'B');
    msg = res.msg;
  }
  if (ef.resolveDreamClimax) {
    const { id, bonus, nearTxt } = ef.resolveDreamClimax;
    const res = settleDreamClimax(state, id, bonus, nearTxt);
    msg = res.msg;
  }
  if (ef.photo) photoCaption = ef.photo;

  return { msg, openTuckAfter, photoCaption, launchClimaxArcade, launchQualifierArcade };
}
