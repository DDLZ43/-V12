const XLSX = require('./lib/xlsx.full.min.js');
const fs = require('fs');
const buf = fs.readFileSync('测试课表.xlsx');
const wb = XLSX.read(buf, { type: 'buffer' });
const ws = wb.Sheets[wb.SheetNames[0]];
const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
const out = [];

// ===== 复制 generateData() 老格式解析逻辑（含我改的合并单元格延续） =====
function looksLikePeriodRow(row) {
  if (!row) return false;
  let periodHits = 0, total = 0;
  for (let i = 0; i < row.length; i++) {
    const v = String(row[i] || '').trim();
    if (!v || v === 'nan') continue;
    total++;
    if (['1','2','3','4','5','6'].indexOf(v) !== -1) periodHits++;
  }
  return total > 2 && periodHits >= 5;
}
function isClassName(v) { return /^[一二三四五六]\d+$/.test(String(v || '').trim()); }

const weekRow = rows[0];
const colMap = [];
const secondIsPeriod = rows.length > 1 && looksLikePeriodRow(rows[1]);
const secondIsClass = rows.length > 1 && isClassName(rows[1][0]);
if (secondIsPeriod) {
  const periodRow = rows[1];
  let curWeek = '';
  for (let i = 1; i < weekRow.length; i++) {
    const wkCell = String(weekRow[i] || '').trim();
    const period = String(periodRow[i] || '').trim();
    if (['星期一','星期二','星期三','星期四','星期五'].indexOf(wkCell) !== -1) curWeek = wkCell;
    if (period === '午休' || period === 'nan' || period === '') continue;
    if (['1','2','3','4','5','6'].indexOf(period) !== -1 && curWeek) {
      colMap.push({ col: i, week: curWeek, period: parseInt(period) });
    }
  }
}
out.push('识别的数据列数量(应为30): ' + colMap.length);
out.push('列映射: ' + JSON.stringify(colMap));

// 解析
const scheduleDataLocal = {};
let rowIdx = 2;
while (rowIdx < rows.length) {
  const classRow = rows[rowIdx];
  if (!classRow || classRow.length === 0) { rowIdx++; continue; }
  const className = String(classRow[0] || '').trim();
  if (!isClassName(className)) { rowIdx++; continue; }
  if (rowIdx + 1 >= rows.length) break;
  const teacherRow = rows[rowIdx + 1];
  if (!scheduleDataLocal[className]) scheduleDataLocal[className] = {};
  for (let m = 0; m < colMap.length; m++) {
    const mapping = colMap[m];
    const col = mapping.col, week = mapping.week, period = mapping.period;
    const course = String(classRow[col] || '').trim();
    const teacher = String(teacherRow[col] || '').trim();
    if (!course || course === 'nan' || !teacher || teacher === 'nan') continue;
    if (!scheduleDataLocal[className][week]) scheduleDataLocal[className][week] = {};
    scheduleDataLocal[className][week][period] = { course: course, teacher: teacher, room: '-' };
  }
  rowIdx += 2;
}

const classCount = Object.keys(scheduleDataLocal).length;
const teacherSet = new Set();
let recordCount = 0;
for (const cls in scheduleDataLocal) for (const wk in scheduleDataLocal[cls]) for (const prd in scheduleDataLocal[cls][wk]) {
  teacherSet.add(scheduleDataLocal[cls][wk][prd].teacher); recordCount++;
}
out.push('班级数: ' + classCount);
out.push('课节记录数: ' + recordCount);
out.push('教师数(去重): ' + teacherSet.size);
// 检查邓凌志
const hasDLZ = [...teacherSet].some(n => n.includes('邓凌志'));
out.push('含邓凌志(含匹配): ' + hasDLZ);
out.push('邓凌志相关教师: ' + JSON.stringify([...teacherSet].filter(n => n.includes('邓凌志'))));
// 检查每班是否都有完整5天6节
let fullCls = 0;
for (const cls in scheduleDataLocal) {
  let cnt = 0;
  for (const wk in scheduleDataLocal[cls]) cnt += Object.keys(scheduleDataLocal[cls][wk]).length;
  if (cnt >= 28) fullCls++;
}
out.push('完整课节数>=28的班级数: ' + fullCls);
// 打印一1的结构验证
if (scheduleDataLocal['三3']) out.push('三3: ' + JSON.stringify(scheduleDataLocal['三3']));
out.push('一1: ' + JSON.stringify(scheduleDataLocal['一1']));
fs.writeFileSync('__out__.txt', out.join('\n'), 'utf8');
console.log('写入完成');
