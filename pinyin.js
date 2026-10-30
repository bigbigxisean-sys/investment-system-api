// 汉字转拼音用户名
// 主引擎: pinyin-pro (覆盖数万汉字, 自动处理多音字/复姓/罕见字, 无需手工维护字典)
// OVERRIDE 表: 极少数希望强制指定拼音时使用 (默认空)
const { pinyin } = require('pinyin-pro');

const OVERRIDE = {};

const cache = new Map();

// Convert Chinese name to a lowercase pinyin username fragment
// Examples: "张三" → "zhangsan", "欧阳小明" → "ouyangxiaoming"
function nameToPinyin(name) {
  if (!name) return '';
  const key = name.trim();
  if (cache.has(key)) return cache.get(key);

  let result;
  if (OVERRIDE[key]) {
    result = OVERRIDE[key];
  } else {
    try {
      result = pinyin(key, { type: 'array', toneType: 'none' }).join('');
    } catch (e) {
      result = '';
    }
  }
  result = result.toLowerCase().replace(/[^a-z0-9]/g, '');
  cache.set(key, result);
  return result;
}

// Single-char conversion (kept for compatibility)
function charToPinyin(ch) {
  try {
    return pinyin(ch, { toneType: 'none' });
  } catch (e) {
    return ch;
  }
}

module.exports = { nameToPinyin, charToPinyin };

