// 《这辈子 2.0》Sprint 6 —— 全程非强制沉浸式爱情姻缘系统
// 包含：高中同学录（先选人 -> 二选一对话，每人精绘头像+Tag人设+6项喜好）、成年相亲角（同源精绘头像+咖啡馆二选一破冰）、
// 以及双向分手（玩家随时主动分手 + 对方因冷落/好感度<25/异地好感度<65主动提分手）。
// 严格遵循零系统 Emoji 规范；全程统一称「好感度」。

const ROMANCE_PORTRAITS = {
  loaded: false,
  hs_g1: '', hs_g2: '', hs_g3: '',
  hs_b1: '', hs_b2: '', hs_b3: '',
  ad_w1: '', ad_w2: '', ad_w3: '',
  ad_m1: '', ad_m2: '', ad_m3: ''
};

function loadImg(src) {
  return new Promise(resolve => {
    const im = new Image();
    im.crossOrigin = 'anonymous';
    im.onload = () => resolve(im);
    im.onerror = () => resolve(null);
    im.src = src;
  });
}

function floodSquarePortrait(img, colIdx) {
  const sw = Math.floor(img.width / 3);
  const sh = img.height;
  const sx = colIdx * sw;
  const c = document.createElement('canvas');
  c.width = sw; c.height = sh;
  const ctx = c.getContext('2d');
  ctx.drawImage(img, sx, 0, sw, sh, 0, 0, sw, sh);
  const imd = ctx.getImageData(0, 0, sw, sh);
  const d = imd.data;
  const vis = new Uint8Array(sw * sh);
  const stack = [];
  const isBg = (i) => d[i] > 236 && d[i + 1] > 236 && d[i + 2] > 236 && (Math.max(d[i], d[i + 1], d[i + 2]) - Math.min(d[i], d[i + 1], d[i + 2]) < 18);
  const push = (x, y) => {
    const p = y * sw + x;
    if (!vis[p] && isBg(p * 4)) { vis[p] = 1; stack.push(p); }
  };
  for (let x = 0; x < sw; x++) { push(x, 0); push(x, sh - 1); }
  for (let y = 0; y < sh; y++) { push(0, y); push(sw - 1, y); }
  while (stack.length) {
    const p = stack.pop();
    const x = p % sw, y = (p - x) / sw;
    d[p * 4 + 3] = 0;
    if (x > 0) push(x - 1, y);
    if (x < sw - 1) push(x + 1, y);
    if (y > 0) push(x, y - 1);
    if (y < sh - 1) push(x, y + 1);
  }
  let minX = sw, minY = sh, maxX = 0, maxY = 0;
  for (let y = 0; y < sh; y++) {
    for (let x = 0; x < sw; x++) {
      if (d[(y * sw + x) * 4 + 3] > 20) {
        if (x < minX) minX = x; if (y < minY) minY = y;
        if (x > maxX) maxX = x; if (y > maxY) maxY = y;
      }
    }
  }
  ctx.putImageData(imd, 0, 0);
  if (maxX <= minX || maxY <= minY) return c.toDataURL('image/png');
  const bw = maxX - minX + 1, bh = maxY - minY + 1;
  const side = Math.max(bw, bh) + 8;
  const out = document.createElement('canvas');
  out.width = side; out.height = side;
  out.getContext('2d').drawImage(c, minX, minY, bw, bh, Math.floor((side - bw) / 2), side - bh, bw, bh);
  return out.toDataURL('image/png');
}

export async function ensureRomancePortraits() {
  if (ROMANCE_PORTRAITS.loaded) return ROMANCE_PORTRAITS;
  const [hg, hb, aw, am] = await Promise.all([
    loadImg('./assets/sheets/hs_girls_sheet.jpg?v=s70'),
    loadImg('./assets/sheets/hs_boys_sheet.jpg?v=s70'),
    loadImg('./assets/sheets/adult_women_sheet.jpg?v=s70'),
    loadImg('./assets/sheets/adult_men_sheet.jpg?v=s70')
  ]);
  if (hg) { ROMANCE_PORTRAITS.hs_g1 = floodSquarePortrait(hg, 0); ROMANCE_PORTRAITS.hs_g2 = floodSquarePortrait(hg, 1); ROMANCE_PORTRAITS.hs_g3 = floodSquarePortrait(hg, 2); }
  if (hb) { ROMANCE_PORTRAITS.hs_b1 = floodSquarePortrait(hb, 0); ROMANCE_PORTRAITS.hs_b2 = floodSquarePortrait(hb, 1); ROMANCE_PORTRAITS.hs_b3 = floodSquarePortrait(hb, 2); }
  if (aw) { ROMANCE_PORTRAITS.ad_w1 = floodSquarePortrait(aw, 0); ROMANCE_PORTRAITS.ad_w2 = floodSquarePortrait(aw, 1); ROMANCE_PORTRAITS.ad_w3 = floodSquarePortrait(aw, 2); }
  if (am) { ROMANCE_PORTRAITS.ad_m1 = floodSquarePortrait(am, 0); ROMANCE_PORTRAITS.ad_m2 = floodSquarePortrait(am, 1); ROMANCE_PORTRAITS.ad_m3 = floodSquarePortrait(am, 2); }
  ROMANCE_PORTRAITS.loaded = true;
  return ROMANCE_PORTRAITS;
}

export function getCachedPortrait(key) {
  return ROMANCE_PORTRAITS[key] || '';
}

export const HS_CANDIDATES = {
  male: [
    {
      id: 'hs_g1', name: '林知夏', tag: '文艺广播少女', bg: '#fdf2f4', bgId: 'mid', incomeMult: 1.0,
      likes: ['周杰伦磁带', '校园晚风', '现代散文', '草莓牛奶', '旧书摊', '雨天听歌'],
      dislikes: '居高临下说教、炫耀吹牛',
      chats: [
        {
          scene: '放学后的广播站刚播完最后一首歌，林知夏抱着一摞旧磁带走出来，问你觉得刚才那首前奏怎么样。',
          good: { txt: '“吉他前奏一响很有画面感，我这盒B面还有首宝藏慢歌借你听。”', res: '她惊喜地接过磁带收进针织外套口袋：“明天午休广播，我偷偷放给你听。”', bonus: { expr: 1 } },
          bad:  { txt: '“太吵了没听清，听歌耽误背书，还不如多刷两套卷子。”', res: '她愣了一下，默默把磁带塞回书包：“……也是，打扰你学习了。”' }
        },
        {
          scene: '校门口老旧书摊摆出一排泛黄散文集，林知夏在窗边翻到一页夹着干枯枫叶的书签。',
          good: { txt: '买下一盒草莓牛奶递给她，轻声聊起那首写夏夜晚风的诗。', res: '她弯起眼睛接过吸管，把那枚枫叶书签夹进了你的课本里。', bonus: { mood: 2 } },
          bad:  { txt: '笑她看这些没用的闲书，夸自己只看成功学榜单。', res: '她合上书轻声说了句“道不同”，转身走向公交站。' }
        }
      ]
    },
    {
      id: 'hs_g2', name: '苏清砚', tag: '清冷年级学神', bg: '#eef5fc', bgId: 'high', incomeMult: 1.4,
      likes: ['几何压轴题', '温热纯牛奶', '安静图书馆', '薄荷糖', '工整错题本', '天文望远镜'],
      dislikes: '迟到敷衍、抄袭作弊',
      chats: [
        {
          scene: '晚自习课间走廊微凉，苏清砚对着最后一道解析几何皱眉，草稿纸画了三种辅助线。',
          good: { txt: '递上一盒温热纯牛奶，试着提出另一种对称代换思路跟她一起算。', res: '她推了推银框眼镜，眸子亮了起来：“这步很妙……周末市图书馆一起刷卷子吧。”', bonus: { knowledge: 1 } },
          bad:  { txt: '调侃她“学神也有卡壳的时候？直接翻答案抄不就行了。”', res: '她合上本子往旁让了半步，语气清淡：“没算懂的答案没有意义。”' }
        },
        {
          scene: '周末市图书馆靠窗位，苏清砚把整理得工整无比的错题笔记推到了桌沿。',
          good: { txt: '准时赴约并塞给她两颗薄荷糖，认真约好一起考去同一座城市。', res: '她耳尖微红，在笔记本扉页轻轻写下了两个并排的大学缩写。', bonus: { numLogic: 1 } },
          bad:  { txt: '迟到半小时还不停在静音阅览室小声刷手机聊天。', res: '她皱眉收拾好书包：“以后还是各自复习效率更高。”' }
        }
      ]
    },
    {
      id: 'hs_g3', name: '许星燃', tag: '元气短跑少女', bg: '#fff5eb', bgId: 'normal', incomeMult: 0.85,
      likes: ['橘子冰汽水', '热血少年漫', '校运会接力', '校门烤肠', '晴天操场', '荧光护腕'],
      dislikes: '冷暴力不回话、拐弯抹角',
      chats: [
        {
          scene: '刚训完两组弯道冲刺，许星燃坐在看台台阶上扇着风，发带还带着晶亮汗珠。',
          good: { txt: '把小卖部冰好的橘子汽水贴在她手背上，顺便聊起最新一期热血漫画。', res: '她明朗地笑出声，咕咚喝了一大口：“你太懂我了！下周一起夜跑吗？”', bonus: { health: 1 } },
          bad:  { txt: '嫌弃地说“跑得满头大汗离我远点，女孩子疯跑像什么样。”', res: '她笑容一下子收住，抓起外套转身跑开了：“不用你管！”' }
        },
        {
          scene: '放学路过校门烤肠摊，许星燃正兴奋地比划着昨天篮球赛的绝杀镜头。',
          good: { txt: '大方请她吃两根烤肠，直球夸她跑起来时整个人都在发光。', res: '她愣了一秒反倒不好意思地挠头笑：“突然这么夸我干嘛啦！”', bonus: { mood: 2 } },
          bad:  { txt: '全程冷着脸敷衍“哦、行吧”，看都不看她一眼。', res: '她摆摆手：“算了，跟你说话真没劲。”' }
        }
      ]
    }
  ],
  female: [
    {
      id: 'hs_b1', name: '陈予白', tag: '白衬衫理科学神', bg: '#eff6ff', bgId: 'high', incomeMult: 1.4,
      likes: ['天文画报', '冰镇柠檬茶', '物理竞赛题', '靠窗午睡', '钢笔字帖', '折纸飞机'],
      dislikes: '吵闹起哄、临时爽约',
      chats: [
        {
          scene: '午休阳光斜照在靠窗课桌上，陈予白刚醒，正用钢笔在一张浅蓝便签背面折纸飞机。',
          good: { txt: '放下一盒冰柠檬茶，小声问他天文画报里猎户座流星雨几点能看见。', res: '他耳廓微热，把写着最佳观测时间的纸飞机轻轻推到你桌角：“今晚十一点，别睡太早。”', bonus: { numLogic: 1 } },
          bad:  { txt: '拍他桌子起哄：“大家都说你是书呆子，折纸飞机幼不幼稚呀！”', res: '他沉默地收起钢笔和便签，转头看向窗外不再说话。' }
        },
        {
          scene: '放学自习室只剩你们两人，陈予白顺手把你的物理错题按题型归好了类。',
          good: { txt: '认真夸他钢笔字真好看，约好下周一起把压轴大题攻克下来。', res: '他嘴角扬起很浅却温柔的弧度：“有不会的随时敲我桌子。”', bonus: { knowledge: 1 } },
          bad:  { txt: '临时爽约放他鸽子，第二天还漫不经心地说忘了。', res: '他把整理好的纸收进抽屉，神色淡了下来：“没事，是我多事了。”' }
        }
      ]
    },
    {
      id: 'hs_b2', name: '陆星野', tag: '天台吉他少年', bg: '#fef7e6', bgId: 'mid', incomeMult: 1.0,
      likes: ['摇滚旧磁带', '全场篮球赛', '老冰棍', '傍晚天台', '涂鸦帆布鞋', '随身听'],
      dislikes: '打小报告、死板说教',
      chats: [
        {
          scene: '傍晚实验楼天台风很大，陆星野坐在台阶上调木吉他弦，脚边放着两根快化了的老冰棍。',
          good: { txt: '接过老冰棍坐在旁边，托腮听他弹完那段还没取名字的新旋律。', res: '他拨完最后一个和弦冲你灿烂一笑：“你是第一个听众，用你名字里的字给歌命名吧？”', bonus: { mood: 2 } },
          bad:  { txt: '板着脸说“晚自习前带吉他上天台违纪，我要去告诉教导主任。”', res: '他把吉他收回琴包，眼神冷了下来：“随你便，我走了。”' }
        },
        {
          scene: '下午篮球赛刚打完绝杀，陆星野满头大汗地跑向场边找随身听。',
          good: { txt: '递去毛巾和一盒经典摇滚磁带，夸他刚才那个三分球太帅了。', res: '他眼睛亮得像盛了晚霞：“为了你这句夸奖，下场我还投绝杀！”', bonus: { expr: 1 } },
          bad:  { txt: '数落他穿涂鸦帆布鞋不务正业，整天只知道疯玩。', res: '他收起笑意耸耸肩：“那你去找乖乖牌好了。”' }
        }
      ]
    },
    {
      id: 'hs_b3', name: '周叙言', tag: '温柔青梅班长', bg: '#f0fdf4', bgId: 'normal', incomeMult: 0.9,
      likes: ['热豆浆油条', '纪念邮票册', '本格推理书', '单车后座', '桂花糕', '童年老相册'],
      dislikes: '遇难逞强瞒着不说、乱发脾气',
      chats: [
        {
          scene: '早读前下起蒙蒙细雨，周叙言把揣在怀里还热乎的豆浆塞进你桌洞，自己左肩校服却淋湿了。',
          good: { txt: '掏出干净纸巾帮他擦干肩头雨水，把刚买的桂花糕分他一半。', res: '他弯起眼睛任由你擦着袖口：“只要你没淋着就好，放学雨大我推车送你。”', bonus: { mood: 2 } },
          bad:  { txt: '不耐烦地推开豆浆：“谁让你天天多管闲事跟着我，烦不烦啊。”', res: '他伸在半空的手僵了一下，低声说了句“抱歉”便回了自己座位。' }
        },
        {
          scene: '放学单车棚边，周叙言翻出一本夹着童年合影与纪念邮票的旧相册。',
          good: { txt: '坐上他的单车后座，坦诚跟他说起最近模考失利的烦恼。', res: '他放慢车速温柔安慰你：“以后难过别自己扛，我一直都在。”', bonus: { mood: 3 } },
          bad:  { txt: '因为自己考砸把气全撒在他身上，头也不回摔门走掉。', res: '他站在车棚下望着你的背影，轻轻叹了口气。' }
        }
      ]
    }
  ]
};

export const ADULT_CANDIDATES = {
  male: [
    {
      id: 'ad_w1', name: '沈清欢', tag: '温柔中学教师', bg: '#fdf6ee', bgId: 'normal', incomeMult: 0.85,
      job: '重点中学语文老师 · 稳定顾家',
      likes: ['手作烘焙', '周末逛公园', '民国老电影', '养多肉', '热桂花茶', '手写明信片'],
      dislikes: '大男子主义、吃饭刷手机',
      chats: [
        {
          scene: '周末街角咖啡馆相亲破冰，沈清欢笑着把菜单推过来，问你平时休假最喜欢怎么放松。',
          good: { txt: '“喜欢逛公园晒晒太阳或者看场老电影，两个人安安静静聊天就很舒服。”', res: '她眼角眉梢都柔和下来：“太巧了，我也最喜欢慢节奏的烟火日常！”' },
          bad:  { txt: '“休假当然是打通宵游戏或者应酬，家务以后肯定归女方管。”', res: '她礼貌地端起茶杯微微一笑：“看来我们对生活期待不太一样呢。”' }
        },
        {
          scene: '第二次约在植物园散步，她聊起班上调皮又可爱的学生们，问你对未来小家的想象。',
          good: { txt: '认真倾听她的日常，说起想在阳台上一起种满多肉和绿植。', res: '她轻轻笑出声：“听起来就是特别温暖的家，下次我带自制饼干给你尝。”' },
          bad:  { txt: '全程低头回群消息，敷衍地说“都行，你定吧”。', res: '她停下脚步轻声说：“你好像挺忙的，今天就先到这吧。”' }
        }
      ]
    },
    {
      id: 'ad_w2', name: '顾明微', tag: '独立空间设计师', bg: '#fef5eb', bgId: 'mid', incomeMult: 1.1,
      job: '家居空间主理设计师 · 审美在线',
      likes: ['手冲咖啡', '逛旧家具市集', '胶片摄影', '自驾看海', '爵士黑胶', '买花插瓶'],
      dislikes: '抠搜算计、缺乏主见',
      chats: [
        {
          scene: '复古咖啡馆里，顾明微一眼注意到了墙角的老式胶片机，顺口问你对生活品质的看法。',
          good: { txt: '大方买单两杯手冲，聊起旧物改造与周末开车去海边吹风的浪漫。', res: '她挑眉露出欣赏的笑：“你审美很在线嘛！加个微信，下次一起逛市集？”' },
          bad:  { txt: '掏出计算器坚持把 38 块咖啡钱精确 AA 到小数点后两位。', res: '她利落地转完账起身拿包：“谢谢款待，祝你早日遇到有缘人。”' }
        },
        {
          scene: '周末旧货市集，她挑中一盏很有年代感的黄铜台灯，转头征求你的眼光。',
          good: { txt: '赞美灯罩的暖黄光影，顺手帮她用胶片机拍下一张氛围感抓拍。', res: '她笑得特别灿烂：“这张照片洗出来记得一定送我一张！”' },
          bad:  { txt: '吐槽买二手货太浪费钱，不如去网上买 19 块 9 包邮的塑料灯。', res: '她放下台灯耸耸肩：“咱们俩频道实在对不上。”' }
        }
      ]
    },
    {
      id: 'ad_w3', name: '叶知秋', tag: '干练三甲医生', bg: '#eef3f9', bgId: 'high', incomeMult: 1.4,
      job: '三甲医院主治医师 · 独立清醒',
      likes: ['规律晨跑', '清淡粤菜', '医学纪录片', '温泉度假', '理性沟通', '整洁家居'],
      dislikes: '情绪失控、画大饼不行动',
      chats: [
        {
          scene: '刚下夜班的叶知秋换上浅灰西装赴约，语气坦诚直接，问你能否理解彼此忙碌时的边界感。',
          good: { txt: '贴心点了一壶热粥与清淡菜，表示欣赏她的专业，彼此忙时各自发光、闲时好好陪伴。', res: '她紧绷了一周的肩头松弛下来：“难得遇到这么通透又体贴的人。”' },
          bad:  { txt: '拍胸脯画大饼说“以后别当医生了，辞职在家伺候我就行。”', res: '她推了推金丝圆眼镜，干脆起身：“抱歉，我还有台手术先告辞了。”' }
        },
        {
          scene: '难得的周日清早，她约你去江边慢跑五公里后吃早茶。',
          good: { txt: '准时到场陪她稳稳跑完，聊起最近看的纪录片与家庭稳健理财规划。', res: '她眼里透出少见的信赖：“跟你待在一起，心里特别踏实。”' },
          bad:  { txt: '睡过头放了鸽子，还抱怨她作息太自律像军训。', res: '她发来一条礼貌消息：“我们节奏确实不合，祝好。”' }
        }
      ]
    }
  ],
  female: [
    {
      id: 'ad_m1', name: '陆景行', tag: '幽默大厂程序员', bg: '#eef3fa', bgId: 'high', incomeMult: 1.35,
      job: '互联网高级架构师 · 踏实暖男',
      likes: ['复古掌机', '家常下厨', '科技数码', '猫咖撸猫', '冷笑话', '自驾露营'],
      dislikes: '阴阳怪气、攀比炫富',
      chats: [
        {
          scene: '猫咖相亲局，陆景行正被一只小橘猫踩着卫衣帽子，有点腼腆却很真诚地向你介绍自己。',
          good: { txt: '笑着帮他逗开小猫，聊起小时候玩过的复古掌机与各自拿手菜。', res: '他瞬间放松下来，笑着掏出手机给你看他昨晚做的糖醋排骨：“下次做给你尝！”' },
          bad:  { txt: '上下打量他的连帽卫衣，开口就问年薪和学区房写谁名字。', res: '他挠挠头礼貌结完账：“那就不耽误你时间了，祝一切顺利。”' }
        },
        {
          scene: '周末他亲自下厨准备了一桌家常菜，略微紧张地等你评价味道。',
          good: { txt: '眼睛发亮地连夸比馆子还香，顺手帮他一起洗碗收拾厨房。', res: '他开心得像个大男孩：“只要你爱吃，以后周末菜单你随便点！”' },
          bad:  { txt: '嫌弃菜咸了油大了，全程拿他和别人家高富帅对比。', res: '他沉默地收好碗筷，眼神暗了下来。' }
        }
      ]
    },
    {
      id: 'ad_m2', name: '周明远', tag: '稳重三甲医生', bg: '#f1f5f9', bgId: 'mid', incomeMult: 1.0,
      job: '三甲医院外科医生 · 情绪极稳',
      likes: ['手写读书笔记', '羽毛球', '江边夜跑', '清茶淡饭', '守时守信', '老歌黑胶'],
      dislikes: '无理取闹、熬夜透支身体',
      chats: [
        {
          scene: '静谧茶室里，周明远提前十分钟到场温好茶杯，温和询问你平时工作压力大不大。',
          good: { txt: '坦诚分享自己的职业理想，笑着说也想养成早睡锻炼的好习惯。', res: '他温和一笑，给你续上温茶：“下周如果不忙，我带你打场羽毛球放松下。”' },
          bad:  { txt: '炫耀自己天天熬夜蹦迪喝酒，嘲笑他活得像提前退休的老干部。', res: '他礼貌点点头：“生活习惯差异太大，勉强在一起会很累。”' }
        },
        {
          scene: '打完羽毛球后微风习习，他细心递来温水叮嘱别急着喝冰饮。',
          good: { txt: '接过温水感谢他的细心，自然挽手聊起彼此对未来城市的规划。', res: '他眼底泛起温柔笑意：“遇到同频的人，真是一件幸运的事。”' },
          bad:  { txt: '因为输了一局球当场甩拍子大发脾气。', res: '他平静地拾起球拍：“先各自冷静一下吧。”' }
        }
      ]
    },
    {
      id: 'ad_m3', name: '许南风', tag: '文艺咖啡馆主理', bg: '#fbf3e8', bgId: 'normal', incomeMult: 0.85,
      job: '独立咖啡馆主理人 · 浪漫松弛',
      likes: ['精品手冲', '城市漫步', '独立乐队', '养柯基', '胶片扫街', '雨夜爵士'],
      dislikes: '功利算计、否定热爱',
      chats: [
        {
          scene: '老洋房改造的小咖啡馆里，许南风亲手拉花端来一杯拿铁，聊起辞职开店的初心。',
          good: { txt: '赞叹店里的暖木光影与豆子香气，说很佩服敢为热爱奔赴的人。', res: '他眉眼弯弯地笑起来：“这杯算我请客，以后这里永远给你留靠窗位。”' },
          bad:  { txt: '冷嘲热讽说“开小店迟早倒闭，不如老老实实进厂拧螺丝。”', res: '他礼貌收走托盘：“看来咱俩确实不是一路人。”' }
        },
        {
          scene: '雨夜打烊后，他在店里放起黑胶唱片，邀请你一起品尝新研发的桂花拿铁。',
          good: { txt: '细细品味后夸桂花香恰到好处，靠在窗边听雨聊了一整晚。', res: '他轻声说：“好久没和一个人聊到忘记时间了。”' },
          bad:  { txt: '不停催促赶紧结束，嫌弃小店太偏僻没档次。', res: '他关掉唱片机，绅士地帮你叫好车送你离开。' }
        }
      ]
    }
  ]
};

export function ensureRomanceState(state) {
  if (!state) return state;
  if (!state.romance || typeof state.romance !== 'object') {
    state.romance = {};
  }
  if (!state.romance.aff || typeof state.romance.aff !== 'object') state.romance.aff = {};
  if (!state.romance.chatIdx || typeof state.romance.chatIdx !== 'object') state.romance.chatIdx = {};
  if (typeof state.romance.chattedThisTurn !== 'boolean') state.romance.chattedThisTurn = false;
  if (typeof state.romance.hsDatedOnce !== 'boolean') state.romance.hsDatedOnce = false;
  if (typeof state.romance.warnedCold !== 'boolean') state.romance.warnedCold = false;
  if (!Array.isArray(state.romance.exHistory)) state.romance.exHistory = [];

  const g = state.gender === 'female' ? 'female' : 'male';
  const pool = [...(HS_CANDIDATES[g] || HS_CANDIDATES.male), ...(ADULT_CANDIDATES[g] || ADULT_CANDIDATES.male)];
  for (const c of pool) {
    if (typeof state.romance.aff[c.id] !== 'number') {
      state.romance.aff[c.id] = c.id.startsWith('hs_') ? 34 : 30;
    }
  }
  return state;
}

export function getCandidatePoolForAge(state) {
  const g = state.gender === 'female' ? 'female' : 'male';
  if (state.age >= 13 && state.age <= 18) {
    return { mode: 'hs', title: state.age <= 15 ? '青春同学录' : '高中同学录', list: HS_CANDIDATES[g] };
  }
  if (state.age >= 19) return { mode: 'adult', title: '相亲角与缘分', list: ADULT_CANDIDATES[g] };
  return { mode: 'locked', title: '青春尚未启封', list: [] };
}

export function findCandidateMeta(id) {
  for (const g of ['male', 'female']) {
    for (const c of HS_CANDIDATES[g]) if (c.id === id) return c;
    for (const c of ADULT_CANDIDATES[g]) if (c.id === id) return c;
  }
  return null;
}

// 确立正式恋爱关系
export function startRelationshipWith(state, cand) {
  ensureRomanceState(state);
  const curAff = Math.max(60, state.romance.aff[cand.id] || 60);
  state.relations.partner = {
    id: cand.id,
    name: cand.name,
    tag: cand.tag,
    bgId: cand.bgId || 'mid',
    incomeMult: cand.incomeMult || 1.0,
    intimacy: curAff,
    married: false,
    missedTurns: 0,
    startedAge: state.age
  };
  state.romance.aff[cand.id] = curAff;
  state.romance.warnedCold = false;
  if (state.age <= 18) state.romance.hsDatedOnce = true;
  state.stats.mood = Math.min(100, (state.stats.mood ?? 70) + 6);
}

// 玩家主动提出分手（P1-09：用 ?? 保留 0 心态下界，绝不回弹到 65）
export function playerBreakupPartner(state) {
  if (!state.relations?.partner) return null;
  const p = state.relations.partner;
  ensureRomanceState(state);
  state.romance.exHistory.push({ name: p.name, age: state.age, by: 'player' });
  state.relations.partner = null;
  state.romance.warnedCold = false;
  state.stats.mood = Math.max(0, (state.stats.mood ?? 70) - 5);
  return `你约 ${p.name} 好好聊了一次，体面地提出分手。短暂失落后（心态 -5），你重新恢复了自由单身。`;
}

// 回合末检定「别人主动和你分手」（冷落 3 季 / 好感度 < 25 / 18岁&22岁异地好感度 < 65）
export function checkPartnerBreakupOnTurnEnd(state, interactedThisTurn) {
  const p = state.relations?.partner;
  if (!p || p.married) return null;
  ensureRomanceState(state);

  if (interactedThisTurn) {
    p.missedTurns = 0;
    state.romance.warnedCold = false;
  } else {
    p.missedTurns = (p.missedTurns || 0) + 1;
  }

  // 1. 好感度跌破 25：对方直接提分手
  if (p.intimacy < 25) {
    state.romance.exHistory.push({ name: p.name, age: state.age, by: 'partner_low' });
    state.relations.partner = null;
    state.stats.mood = Math.max(0, (state.stats.mood ?? 70) - 7);
    return {
      type: 'breakup',
      title: `${p.name} 向你提出了分手`,
      body: `连续几次不愉快的摩擦让这段感情彻底凉了下去（好感度跌破 25）。${p.name} 退回了纪念小物，平静地说：“我们还是退回朋友的位置吧。”（心态 -7，已恢复单身）`
    };
  }

  // 2. 18 岁毕业季 / 22 岁择城季：好感度低于 65 时对方提和平分手
  if ((state.age === 18 && state.subTurn === 3) || (state.age === (state.gradAge || 22) && state.subTurn === 1)) {
    if (p.intimacy < 65) {
      state.romance.exHistory.push({ name: p.name, age: state.age, by: 'partner_distance' });
      state.relations.partner = null;
      state.stats.mood = Math.max(0, (state.stats.mood ?? 70) - 6);
      return {
        type: 'breakup',
        title: `毕业十字路口 · ${p.name} 提出和平分手`,
        body: `盛夏车站广播回响，彼此要奔赴不同方向，而感情还没攒够跨越异地的底气（好感度 ${p.intimacy} < 65）。${p.name} 眼眶泛红地挥了挥手：“谢谢你陪我走过这一程，以后各自保重。”（心态 -6，已恢复单身）`
      };
    }
  }

  // 3. 连续冷落：第 2 季发预警，第 3 季对方主动提分手
  if (p.missedTurns === 2 && !state.romance.warnedCold) {
    state.romance.warnedCold = true;
    return {
      type: 'warn',
      title: `${p.name} 发来消息（感情降温预警）`,
      body: `你已经连续两季没找 ${p.name} 聊天或约会了。手机屏幕亮起一条简短的消息：“最近感觉你眼里只有别的事……我们是不是越来越远了？”（下季再零互动，对方可能会提出分手）`
    };
  }
  if (p.missedTurns >= 3) {
    state.romance.exHistory.push({ name: p.name, age: state.age, by: 'partner_cold' });
    state.relations.partner = null;
    state.romance.warnedCold = false;
    state.stats.mood = Math.max(0, (state.stats.mood ?? 70) - 6);
    return {
      type: 'breakup',
      title: `长期冷落 · ${p.name} 主动提出了分手`,
      body: `连续三季没有只言片语的回应，${p.name} 终于攒够了失望，发来一段长长的告别信息后退出了你的生活。（心态 -6，已恢复单身）`
    };
  }
  return null;
}

// 打开「先选人 -> 再进入一对一二选一对话」弹窗
export async function openRomanceHubModal(state, mountOverlay, clearOverlay, onChanged, preselectId = null, opts = {}) {
  await ensureRomancePortraits();
  ensureRomanceState(state);
  const poolInfo = getCandidatePoolForAge(state);
  const bonusFreeChat = Boolean(opts && opts.bonusFreeChat);
  let bonusUsed = false;
  // P1-09：若已有校园/成年恋人，默认直达恋人对话页（即使校园恋人跨入 19+ 岁也可继续聊天！）
  let activeId = preselectId || (state.relations?.partner?.id && findCandidateMeta(state.relations.partner.id) ? state.relations.partner.id : null);
  let lastFeedback = null;

  const renderHub = () => {
    const partner = state.relations?.partner || null;
    const list = poolInfo.list;
    const hasFreeChatQuota = (bonusFreeChat && !bonusUsed) || !state.romance.chattedThisTurn;

    // Step 1: 选人列表页
    if (!activeId) {
      const html = `
        <div class="modal-mask" id="rom-mask">
          <div class="modal-sheet rom-sheet">
            <div class="wb-head">
              <div>
                <div class="wb-title">${poolInfo.title}</div>
                <div class="wb-sub">${partner ? `当前与 ${partner.name} 恋爱中 · 专一锁定` : '先选一位心仪对象，再进入一对一聊天（每季免费 1 次）'}</div>
              </div>
              <span class="wb-cnt">${hasFreeChatQuota ? (bonusFreeChat && !bonusUsed ? '偶遇免费聊 1 次' : '可免费聊 1 次') : '本季已聊'}</span>
            </div>

            <div class="rom-list">
              ${list.map(c => {
                const isPartner = partner && partner.id === c.id;
                const aff = isPartner ? partner.intimacy : (state.romance.aff[c.id] ?? 30);
                const lockedByOther = Boolean(partner && !isPartner);
                const pUrl = getCachedPortrait(c.id);
                return `
                  <div class="rom-card ${isPartner ? 'lover' : ''} ${lockedByOther ? 'dim' : ''}">
                    <div class="rom-c-top">
                      <div class="rom-ava" style="background:${c.bg};">
                        ${pUrl ? `<img src="${pUrl}" class="sd-px-img" />` : ''}
                      </div>
                      <div class="rom-meta">
                        <div class="rom-name-row">
                          <b>${c.name}</b>
                          <span class="rom-tag">${c.tag}</span>
                        </div>
                        ${c.job ? `<div class="rom-job">${c.job}</div>` : ''}
                        <div class="rom-aff-row">
                          <span>好感度 <b>${aff}</b> / 60</span>
                          <span class="rom-st">${isPartner ? (partner.married ? '已婚伴侣' : '恋爱中') : aff >= 60 ? '满60可恋爱' : '满60可表白'}</span>
                        </div>
                        <div class="wb-bar"><i style="width:${Math.min(100, Math.round((aff / 60) * 100))}%;background:#e11d48"></i></div>
                      </div>
                    </div>
                    <div class="rom-likes">
                      ${c.likes.map(lk => `<span>喜·${lk}</span>`).join('')}
                    </div>
                    <div class="rom-c-foot">
                      <span class="rom-dis">雷点：${c.dislikes}</span>
                      <button class="rom-go-btn" data-rom-pick="${c.id}" ${lockedByOther ? 'disabled' : ''}>
                        ${lockedByOther ? '已恋爱锁定' : isPartner ? '找 Ta 聊天 ›' : '选 Ta 聊天 ›'}
                      </button>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>

            <button class="btn-go" id="rom-close" style="margin-top:10px;width:100%;">返回</button>
          </div>
        </div>
      `;
      mountOverlay(html, (root) => {
        root.querySelectorAll('[data-rom-pick]').forEach(b => {
          b.onclick = () => {
            activeId = b.dataset.romPick;
            lastFeedback = null;
            renderHub();
          };
        });
        const close = () => { clearOverlay(); if (onChanged) onChanged(); };
        root.querySelector('#rom-close').onclick = close;
        root.querySelector('#rom-mask').onclick = (e) => { if (e.target.id === 'rom-mask') close(); };
      });
      return;
    }

    // Step 2: 一对一二选一对话页
    const cand = findCandidateMeta(activeId) || list[0];
    const isPartner = partner && partner.id === cand.id;
    const aff = isPartner ? partner.intimacy : (state.romance.aff[cand.id] ?? 30);
    const pUrl = getCachedPortrait(cand.id);
    const idx = (state.romance.chatIdx[cand.id] || 0) % cand.chats.length;
    const chatObj = cand.chats[idx];
    const swapOrder = (idx + state.age) % 2 === 1;
    const opt1 = swapOrder ? { ...chatObj.bad, isGood: false } : { ...chatObj.good, isGood: true };
    const opt2 = swapOrder ? { ...chatObj.good, isGood: true } : { ...chatObj.bad, isGood: false };
    const canChatNow = hasFreeChatQuota && !lastFeedback;
    const canConfess = !partner && aff >= 60;

    const html = `
      <div class="modal-mask" id="rom-mask">
        <div class="modal-sheet rom-sheet">
          <div class="wb-head">
            <button class="pill-btn soft" id="rom-back" style="height:28px;padding:0 10px;font-size:11.5px;">‹ 返回选人</button>
            <div class="wb-title">与 ${cand.name} 聊天</div>
            <span class="rom-tag">${cand.tag}</span>
          </div>

          <div class="rom-chat-hero">
            <div class="rom-ava lg" style="background:${cand.bg};">
              ${pUrl ? `<img src="${pUrl}" class="sd-px-img" />` : ''}
            </div>
            <div style="flex:1;">
              <div class="rom-aff-row">
                <span>好感度 <b>${aff}</b> / 60</span>
                <span class="rom-st">${isPartner ? (partner.married ? '已婚伴侣' : '恋爱中') : aff >= 60 ? '已达恋爱门槛' : `还差 ${60 - aff}`}</span>
              </div>
              <div class="wb-bar" style="margin:5px 0;"><i style="width:${Math.min(100, Math.round((aff / 60) * 100))}%;background:#e11d48"></i></div>
              <div class="rom-job">喜好：${cand.likes.slice(0, 4).join(' · ')}</div>
            </div>
          </div>

          <div class="rom-scene-box">
            <div class="rom-sc-lbl">${poolInfo.mode === 'hs' ? '本季校园偶遇：' : '咖啡馆约会场景：'}</div>
            <div class="rom-sc-txt">${chatObj.scene}</div>
          </div>

          ${canChatNow ? `
            <div class="rom-choices">
              <div class="rom-ch-lbl">你的回应（二选一 · 选对加好感度，选错降好感度）：</div>
              <button class="rom-ch-btn" data-rom-ans="${opt1.isGood ? '1' : '0'}">A. ${opt1.txt}</button>
              <button class="rom-ch-btn" data-rom-ans="${opt2.isGood ? '1' : '0'}">B. ${opt2.txt}</button>
            </div>
          ` : lastFeedback ? `
            <div class="rom-fb ${lastFeedback.good ? 'good' : 'bad'}">
              <b>${lastFeedback.good ? `投其所好 · 好感度 +${lastFeedback.delta}` : `踩中雷点 · 好感度 ${lastFeedback.delta}`}</b>
              <p>${lastFeedback.res}</p>
            </div>
          ` : `
            <div class="rom-fb neutral">本季免费闲聊次数已用完，下个季度可再来找 ${cand.name} 聊天（也可在排程中安排约会升温）。</div>
          `}

          <div class="rom-foot-btns">
            ${canConfess ? `<button class="btn-go love-cta" id="rom-confess" style="width:100%;">好感度满 60 · 递信表白确立恋爱！</button>` : ''}
            ${isPartner && !partner.married ? `<button class="pill-btn soft" id="rom-breakup" style="width:100%;justify-content:center;color:#b91c1c;">主动提出分手</button>` : ''}
            <button class="pill-btn soft" id="rom-done" style="width:100%;justify-content:center;">结束聊天</button>
          </div>
        </div>
      </div>
    `;

    mountOverlay(html, (root) => {
      root.querySelector('#rom-back').onclick = () => { activeId = null; lastFeedback = null; renderHub(); };
      root.querySelectorAll('[data-rom-ans]').forEach(btn => {
        btn.onclick = () => {
          const isGood = btn.dataset.romAns === '1';
          const delta = isGood ? 6 : -4;
          const nextAff = Math.max(0, Math.min(100, aff + delta));
          state.romance.aff[cand.id] = nextAff;
          if (isPartner) {
            state.relations.partner.intimacy = nextAff;
            state.relations.partner.missedTurns = 0;
            state.romance.warnedCold = false;
          }
          if (bonusFreeChat && !bonusUsed) {
            bonusUsed = true;
          } else {
            state.romance.chattedThisTurn = true;
          }
          state.romance.chatIdx[cand.id] = (state.romance.chatIdx[cand.id] || 0) + 1;
          if (isGood && chatObj.good.bonus) {
            const b = chatObj.good.bonus;
            const capD = state.age <= 12 ? 62 : state.age <= 15 ? 80 : 100;
            if (b.mood) state.stats.mood = Math.min(100, (state.stats.mood ?? 70) + b.mood);
            if (b.health) state.stats.health = Math.min(100, (state.stats.health ?? 80) + b.health);
            if (b.expr) state.stats.expr = Math.min(100, (state.stats.expr ?? 20) + b.expr);
            if (b.knowledge) {
              if (state.age <= 18 && state.statsRaw) {
                state.statsRaw.knowledge = Math.min(capD, (state.statsRaw.knowledge ?? state.stats.knowledge) + b.knowledge);
                state.stats.knowledge = Math.round(state.statsRaw.knowledge);
              } else {
                state.stats.knowledge = Math.min(capD, (state.stats.knowledge ?? 20) + b.knowledge);
              }
            }
            if (b.numLogic) {
              if (state.age <= 18 && state.statsRaw) {
                state.statsRaw.numLogic = Math.min(capD, (state.statsRaw.numLogic ?? state.stats.numLogic ?? 20) + b.numLogic);
                state.stats.numLogic = Math.round(state.statsRaw.numLogic);
              } else {
                state.stats.numLogic = Math.min(capD, (state.stats.numLogic ?? 20) + b.numLogic);
              }
            }
          }
          lastFeedback = { good: isGood, delta, res: isGood ? chatObj.good.res : chatObj.bad.res };
          renderHub();
        };
      });
      const cfBtn = root.querySelector('#rom-confess');
      if (cfBtn) {
        cfBtn.onclick = () => {
          startRelationshipWith(state, cand);
          lastFeedback = { good: true, delta: 0, res: `${cand.name} 羞涩地点头答应了你！你们正式确立了恋爱关系。` };
          renderHub();
        };
      }
      const bkBtn = root.querySelector('#rom-breakup');
      if (bkBtn) {
        bkBtn.onclick = () => {
          const msg = playerBreakupPartner(state);
          clearOverlay();
          if (onChanged) onChanged(msg);
        };
      }
      const close = () => { clearOverlay(); if (onChanged) onChanged(); };
      root.querySelector('#rom-done').onclick = close;
      root.querySelector('#rom-mask').onclick = (e) => { if (e.target.id === 'rom-mask') close(); };
    });
  };

  renderHub();
}
