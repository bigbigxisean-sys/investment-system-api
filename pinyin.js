// Simple Chinese character to pinyin mapping for common name characters
// Generated from common Chinese surname and given name characters
const MAP = {
  '王': 'wang', '李': 'li', '张': 'zhang', '刘': 'liu', '陈': 'chen',
  '杨': 'yang', '黄': 'huang', '赵': 'zhao', '周': 'zhou', '吴': 'wu',
  '徐': 'xu', '孙': 'sun', '马': 'ma', '胡': 'hu', '朱': 'zhu',
  '郭': 'guo', '何': 'he', '林': 'lin', '罗': 'luo', '高': 'gao',
  '梁': 'liang', '郑': 'zheng', '谢': 'xie', '宋': 'song', '唐': 'tang',
  '韩': 'han', '曹': 'cao', '许': 'xu', '邓': 'deng', '冯': 'feng',
  '萧': 'xiao', '程': 'cheng', '蔡': 'cai', '彭': 'peng', '潘': 'pan',
  '袁': 'yuan', '于': 'yu', '董': 'dong', '余': 'yu', '苏': 'su',
  '叶': 'ye', '吕': 'lv', '魏': 'wei', '蒋': 'jiang', '田': 'tian',
  '杜': 'du', '丁': 'ding', '沈': 'shen', '任': 'ren', '姚': 'yao',
  '卢': 'lu', '傅': 'fu', '钟': 'zhong', '崔': 'cui', '廖': 'liao',
  '谭': 'tan', '汪': 'wang', '范': 'fan', '金': 'jin', '石': 'shi',
  '方': 'fang', '白': 'bai', '邹': 'zou', '熊': 'xiong', '孟': 'meng',
  '秦': 'qin', '邱': 'qiu', '侯': 'hou', '江': 'jiang', '尹': 'yin',
  '薛': 'xue', '闫': 'yan', '段': 'duan', '雷': 'lei', '龙': 'long',
  '贺': 'he', '龚': 'gong', '万': 'wan', '顾': 'gu', '邵': 'shao',
  '钱': 'qian', '汤': 'tang', '武': 'wu', '康': 'kang', '赖': 'lai',
  '毛': 'mao', '文': 'wen', '戴': 'dai', '欧': 'ou',
  // Given name characters
  '明': 'ming', '华': 'hua', '强': 'qiang', '伟': 'wei', '芳': 'fang',
  '娜': 'na', '敏': 'min', '静': 'jing', '丽': 'li', '军': 'jun',
  '杰': 'jie', '磊': 'lei', '涛': 'tao', '勇': 'yong', '斌': 'bin',
  '平': 'ping', '刚': 'gang', '玲': 'ling', '娟': 'juan', '艳': 'yan',
  '霞': 'xia', '燕': 'yan', '红': 'hong', '梅': 'mei', '琳': 'lin',
  '超': 'chao', '飞': 'fei', '浩': 'hao', '鹏': 'peng', '宇': 'yu',
  '鑫': 'xin', '磊': 'lei', '峰': 'feng', '辉': 'hui', '洋': 'yang',
  '波': 'bo', '毅': 'yi', '俊': 'jun', '健': 'jian', '宁': 'ning',
  '婷': 'ting', '雪': 'xue', '晴': 'qing', '倩': 'qian', '瑶': 'yao',
  '博': 'bo', '智': 'zhi', '德': 'de', '志': 'zhi', '正': 'zheng',
  '晓': 'xiao', '小': 'xiao', '大': 'da', '国': 'guo', '建': 'jian',
  '立': 'li', '文': 'wen', '海': 'hai', '庆': 'qing', '新': 'xin',
  '学': 'xue', '佳': 'jia', '秀': 'xiu', '兰': 'lan', '凤': 'feng',
  '云': 'yun', '龙': 'long', '中': 'zhong', '安': 'an', '生': 'sheng',
  '元': 'yuan', '琴': 'qin', '莲': 'lian', '桂': 'gui', '爱': 'ai',
  '翠': 'cui', '银': 'yin', '英': 'ying', '春': 'chun', '全': 'quan',
  '少': 'shao', '淑': 'shu', '菊': 'ju', '茂': 'mao', '水': 'shui',
  '福': 'fu', '先': 'xian', '义': 'yi', '礼': 'li', '思': 'si',
  '凡': 'fan', '帆': 'fan', '刚': 'gang', '钊': 'zhao', '凯': 'kai',
  '翔': 'xiang', '铭': 'ming', '锐': 'rui', '镇': 'zhen', '朋': 'peng',
  '永': 'yong', '忠': 'zhong', '和': 'he', '顺': 'shun', '喜': 'xi',
  '荣': 'rong', '富': 'fu', '贵': 'gui', '盛': 'sheng',
  // 晓婷, 戴胜兰, 王习 - already in mapping
  '习': 'xi', '胜': 'sheng',
  // Additional
  '子': 'zi', '恒': 'heng', '哲': 'zhe', '远': 'yuan', '希': 'xi',
  '光': 'guang', '成': 'cheng', '东': 'dong', '南': 'nan', '西': 'xi',
  '北': 'bei', '家': 'jia', '世': 'shi', '长': 'chang',
  '向': 'xiang', '丹': 'dan', '萌': 'meng', '琪': 'qi', '璇': 'xuan',
  '亮': 'liang', '乐': 'le',
  '树': 'shu', '焕': 'huan', '炳': 'bing', '火': 'huo',
  '三': 'san', '四': 'si', '五': 'wu', '六': 'liu', '七': 'qi',
  '八': 'ba', '九': 'jiu', '十': 'shi', '百': 'bai', '千': 'qian',
  '阳': 'yang', '阴': 'yin', '日': 'ri', '月': 'yue', '星': 'xing',
  '天': 'tian', '地': 'di', '人': 'ren', '山': 'shan', '水': 'shui',
};

// Fallback: if character not in map, use the character itself
function charToPinyin(ch) {
  return MAP[ch] || ch;
}

// Convert Chinese name to pinyin username
// Examples: "张三" → "zhangsan", "欧阳小明" → "ouyangxiaoming"
// If there are duplicates, append number: "zhangsan1", "zhangsan2"
function nameToPinyin(name) {
  if (!name) return '';
  let pinyin = '';
  for (const ch of name.trim()) {
    pinyin += charToPinyin(ch);
  }
  return pinyin.toLowerCase().replace(/[^a-z0-9]/g, '');
}

module.exports = { nameToPinyin, charToPinyin };
