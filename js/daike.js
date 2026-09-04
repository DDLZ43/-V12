// ==================== 代课通知工具 · 核心逻辑 ====================

var accumPool = {};         // 累积池：key = 课程串
var accumList = {};         // 教师集合（用于显示教师名单）
var currentTeacher = '';    // 当前查询的教师
var currentWK = {};         // 当前教师的星期节次结构
var selectAllState = false;
var allTeachersArr = [];

var DAYS = ["星期一","星期二","星期三","星期四","星期五"];
var PERIODS_NUM = [1,2,3,4,5,6];

// 数据已由 data-loader.js 异步加载，等数据就绪后再初始化
__whenDataReady__(function(){
  initTeacherSuggest();
    initTool();
  // 请假开始与结束默认均为今天
  var __sd = document.getElementById('startDate');
  var __ed = document.getElementById('endDate');
  if (__sd) __sd.value = todayStr();
  if (__ed) __ed.value = todayStr();
});

function todayStr(){
  var d = new Date();
  var m = ('0'+(d.getMonth()+1)).slice(-2);
  var day = ('0'+d.getDate()).slice(-2);
  return d.getFullYear()+'-'+m+'-'+day;
}

/* 把 yyyy-m-d（可能带前导零）转成 yyyy/m/d 斜杠格式（无前导零），用于通知 */
function fmtDateSlash(dateStr){
  if (!dateStr) return '';
  var p = dateStr.split('-');
  return parseInt(p[0])+'/'+parseInt(p[1])+'/'+parseInt(p[2]);
}

/* ==================== 教师搜索 ==================== */

/* 增强版姓名匹配：
   支持两种完整匹配方式：
   1. 输入完整姓名（如"王丽君"）→ 与教师姓名完全一致
   2. 输入姓名每个字的首字母（如"wlj"）→ 与教师姓名首字母串完全一致
   仅做完整匹配，不包含子串/模糊匹配。 */
function __dkInitials(name){
  var py = (typeof window !== 'undefined' && window.PY_MAP) ? window.PY_MAP : {};
  var out = '', str = String(name || '');
  var inParen = false;
  for (var i = 0; i < str.length; i++) {
    var ch = str.charAt(i);
    if (ch === '(' || ch === '（') { inParen = true; continue; }
    if (ch === ')' || ch === '）') { inParen = false; continue; }
    if (inParen) continue;          // 括号内文字（补充说明）不参与首字母
    if (py[ch]) out += py[ch];
  }
  return out;
}
/* 匹配规则（只支持两种，均为完整匹配）：
   1. 输入完整姓名（中文）：如"王丽君"，须与教师姓名完全一致
   2. 输入姓名每个字的首字母：如"wlj"匹配"王丽君"（须输入完整的姓氏+每个字的首字母）*/
function __dkMatchName(name, kwRaw){
  var kw = String(kwRaw || '').trim();
  if (!kw) return true;
  // 纯字母 → 与"姓名每个字的首字母"完全相等
  if (/^[a-zA-Z]+$/.test(kw)) {
    var initials = __dkInitials(name).toLowerCase();
    return initials === kw.toLowerCase();
  }
  // 中文 → 与完整姓名完全一致
  return String(name || '') === kw;
}

function initTeacherSuggest(){
  var names = new Set();
  var keep = getAllTeachers();
  for (var i=0;i<keep.length;i++) names.add(keep[i]);
  if (typeof contactsData !== 'undefined') {
    for (var j=0;j<contactsData.length;j++) names.add(contactsData[j].name);
  }
  allTeachersArr = Array.from(names).sort(function(a,b){ return a.localeCompare(b,'zh-CN'); });

  var input = document.getElementById('teacherInput');
  var suggest = document.getElementById('teacherSuggest');
  var activeIndex = -1;

  input.addEventListener('input', function(){
    var val = this.value.trim();
    activeIndex = -1;
    if (!val) { suggest.classList.remove('show'); return; }
    // 支持：中文子串、拼音首字母（连续子串或子序列），自动跳过括号等字符
    var filtered = allTeachersArr.filter(function(t){ return __dkMatchName(t, val); });
    if (filtered.length===0) {
      suggest.innerHTML = '<li class="no-match">无匹配教师</li>';
    } else {
      var lis = '';
      var vLower = val.toLowerCase();
      for (var i=0;i<filtered.length;i++){
        var t = filtered[i];
        var tLower = t.toLowerCase();
        var idx = tLower.indexOf(vLower);
        if (idx < 0) {
          // 首字母匹配时无中文子串可高亮，直接显示全名
          lis += '<li data-name="'+t+'">'+t+'</li>';
        } else {
          var before = t.slice(0, idx);
          var match = t.slice(idx, idx + val.length);
          var after = t.slice(idx + val.length);
          lis += '<li data-name="'+t+'">'+before+'<span class="hl">'+match+'</span>'+after+'</li>';
        }
      }
      suggest.innerHTML = lis;
    }
    suggest.classList.add('show');
  });

  suggest.addEventListener('click', function(e){
    var li = e.target.closest('li');
    if (!li || li.classList.contains('no-match')) return;
    input.value = li.getAttribute('data-name');
    suggest.classList.remove('show');
    doQuery();
  });

  input.addEventListener('keydown', function(e){
    var items = suggest.querySelectorAll('li:not(.no-match)');
    if (e.key==='Enter'){
      e.preventDefault();
      if (input.value.trim()) { suggest.classList.remove('show'); doQuery(); }
    } else if (e.key==='Escape') {
      suggest.classList.remove('show');
    } else if (e.key==='ArrowDown' && items.length){
      e.preventDefault();
      activeIndex = (activeIndex+1)%items.length;
      updateActive(items);
    } else if (e.key==='ArrowUp' && items.length){
      e.preventDefault();
      activeIndex = (activeIndex-1+items.length)%items.length;
      updateActive(items);
    }
  });

  document.addEventListener('click', function(e){
    if (!e.target.closest('.input-wrap')) suggest.classList.remove('show');
  });

  // 输入框失焦：若联想只剩唯一匹配则自动查询（无需手动点「查询课程」）
  input.addEventListener('blur', function(){
    setTimeout(function(){
      if (!suggest.classList.contains('show')) return;      // 已被下拉点击「点选」处理掉
      var v = String(input.value || '').trim();
      if (!v) { suggest.classList.remove('show'); return; }
      var cands = allTeachersArr.filter(function(t){ return __dkMatchName(t, v); });
      if (cands.length === 1) {
        input.value = cands[0];
        suggest.classList.remove('show');
        doQuery();
      } else if (cands.length === 0) {
        suggest.classList.remove('show');
      }
    }, 200);
  });
}

function updateActive(items){
  for (var i=0;i<items.length;i++){
    if (i===activeIndex){ items[i].classList.add('active'); }
    else { items[i].classList.remove('active'); }
  }
}

/* ==================== 查询教师课表 ==================== */
// 从 scheduleData 提取该教师任教的所有班级节次
function getTeacherCourses(name){
  var ts = {};
  var total = 0;
  for (var cls in scheduleData){
    for (var d=0; d<DAYS.length; d++){
      var day = DAYS[d];
      if (!ts[day]) ts[day] = {};
      for (var p=0;p<PERIODS_NUM.length;p++){
        var num = PERIODS_NUM[p];
        var l = scheduleData[cls][day] ? scheduleData[cls][day][num] : null;
        if (l && l.teacher === name){
          // 记录该班该节
          ts[day][num] = { class:cls };
          total++;
        }
      }
    }
  }
  return { schedule: ts, total: total };
}

function doQuery(){
  var nm = document.getElementById('teacherInput').value.trim();
  if (!nm) { alert('请输入教师姓名'); return; }
  currentTeacher = nm;
  selectAllState = false;

  var res = getTeacherCourses(nm);
  if (res.total===0){ alert('未找到该教师课表'); renderEmpty(); return; }

  renderWeekGroups(res.schedule);
  updateAccumBar();
  resetSelectAllBtn();
}

function renderEmpty(){
  currentWK = {};
  document.getElementById('scheduleArea').innerHTML = '<p class="no-result" style="padding:24px;color:#999">未找到该教师课表信息</p>';
}

/* 渲染星期节次选择区 */
function renderWeekGroups(schedule){
  currentWK = schedule;
  var area = document.getElementById('scheduleArea');
  var html = '';
  for (var d=0; d<DAYS.length; d++){
    var day = DAYS[d];
    var lessons = schedule[day] || {};
    var nums = Object.keys(lessons).map(Number).sort(function(a,b){return a-b;});
    if (nums.length===0) continue;
    html += '<div class="week-group" data-day="'+day+'">';
    html += '<div class="week-head" onclick="toggleWeek(this)">'+
            '<span class="week-name">'+day+'</span>'+
            '<span class="week-count">'+nums.length+'节</span>'+
            '<span class="day-select-btn" id="dsbtn_'+day+'" onclick="event.stopPropagation();toggleDay(\''+day+'\')">☑ 全选本天</span></div>';
    html += '<div class="week-body">';
    for (var i=0;i<nums.length;i++){
      var num = nums[i];
      var cls = lessons[num].class;
      var isBZ = teacherIsHeadTeacher(currentTeacher);
      var courseKey = num+'|'+cls+'|'+currentTeacher+'|'+(isBZ?1:0)+'|'+day;
      var checked = accumPool[courseKey] ? 'checked' : '';
      html += '<label class="period-row" data-key="'+courseKey+'">'+
              '<input type="checkbox" data-key="'+courseKey+'" '+checked+'>'+
              '<span class="period-info"><span class="cls">'+cls+'班</span> · 第'+num+'节'+
              (isBZ?'<span class="bz">代班主任</span>':'')+'</span></label>';
    }
    html += '</div></div>';
  }
  area.innerHTML = html;

  // 绑定复选框事件（委托）
  area.querySelectorAll('input[type=checkbox]').forEach(function(cb){
    cb.addEventListener('change', function(){
      var key = this.getAttribute('data-key');
      onCourseToggle(key, this.checked);
      // 同步该行高亮
      this.closest('.period-row').classList.toggle('selected', this.checked);
      // 同步所在天的全选按钮与全局全选按钮
      refreshDayBtns();
    });
    // 初始化高亮
    if (cb.checked) cb.closest('.period-row').classList.add('selected');
  });
  refreshDayBtns();
}

/* 班主任判定：某教师在任一班级的实际班主任（该班星期一第1节由ta授课），返回全局布尔 */
function teacherIsHeadTeacher(name){
  for (var cls in scheduleData){
    var mon = scheduleData[cls]['星期一'];
    if (mon && mon[1] && mon[1].teacher === name) return true;
  }
  return false;
}

function toggleWeek(el){
  var body = el.nextElementSibling;
  body.classList.toggle('open');
}

/* 某一天（星期）全选/取消全选 */
function toggleDay(day){
  var group = document.querySelector('.week-group[data-day="'+day+'"]');
  if (!group) return;
  var cbs = group.querySelectorAll('input[type=checkbox]');
  if (cbs.length===0) return;
  var allChecked = true;
  cbs.forEach(function(cb){ if(!cb.checked) allChecked=false; });
  var target = !allChecked;
  cbs.forEach(function(cb){
    cb.checked = target;
    cb.closest('.period-row').classList.toggle('selected', target);
    onCourseToggle(cb.getAttribute('data-key'), target);
  });
  var btn = document.getElementById('dsbtn_'+day);
  if (btn){
    if (target){ btn.textContent='☒ 取消本天'; btn.style.background='#FF4D4F'; btn.style.color='#fff'; }
    else { btn.textContent='☑ 全选本天'; btn.style.background='#3FA7D4'; btn.style.color='#fff'; }
  }
  resetSelectAllBtn();
}

/* 根据勾选状态刷新所有"全选本天"按钮的文案 */
function refreshDayBtns(){
  document.querySelectorAll('.week-group').forEach(function(group){
    var day = group.getAttribute('data-day');
    var cbs = group.querySelectorAll('input[type=checkbox]');
    var allChecked = cbs.length>0;
    cbs.forEach(function(cb){ if(!cb.checked) allChecked=false; });
    var btn = document.getElementById('dsbtn_'+day);
    if (!btn) return;
    if (allChecked){ btn.textContent='☒ 取消本天'; btn.style.background='#FF4D4F'; btn.style.color='#fff'; }
    else { btn.textContent='☑ 全选本天'; btn.style.background='#3FA7D4'; btn.style.color='#fff'; }
  });
}

/* ==================== 累积池 ==================== */
// 勾选节次仅作界面标记，不写入累积池；
// 累积统一在点击"生成记录"时才进行（见 doGenerateRecord）
function onCourseToggle(key, checked){
  updateAccumBar();
}

/* 累积池状态栏：显示累积的教师和课程数 */
function updateAccumBar(){
  var bar = document.getElementById('accumBar');
  var keys = Object.keys(accumPool);
  if (keys.length===0){
    bar.style.display='none';
    bar.innerHTML='';
    return;
  }
  // 收集教师
  var teachers = {};
  var count = {};
  keys.forEach(function(k){
    var p = k.split('|');
    teachers[p[2]] = true;
    var g = p[1].charAt(0); // 年级
    if (!count[g]) count[g] = 0;
    count[g]++;
  });
  var teacherList = Object.keys(teachers).join(',');
  var allCount = keys.length;
  bar.style.display='block';
  bar.innerHTML = '<strong>累积待生成：</strong>'+allCount+'节课 · 教师：'+teacherList+
    '<br><span class="bar-btn" onclick="clearAccum()">清空累积</span>';
}

function clearAccum(){
  accumPool = {};
  // 清空界面勾选
  document.querySelectorAll('#scheduleArea input[type=checkbox]').forEach(function(cb){
    cb.checked = false;
    cb.closest('.period-row').classList.remove('selected');
  });
  updateAccumBar();
  resetSelectAllBtn();
  refreshDayBtns();
}

/* ==================== 全选 ==================== */
function initTool(){
  var bq = document.getElementById('btnQuery');
  if (bq) bq.addEventListener('click', doQuery);
  document.getElementById('btnSelectAll').addEventListener('click', toggleSelectAll);
  document.getElementById('btnRecord').addEventListener('click', doGenerateRecord);
  document.getElementById('btnExport').addEventListener('click', doExportExcel);
  document.getElementById('btnClearAll').addEventListener('click', function(){
    if (confirm('确定清空所有累积？')) clearAccum();
  });
  document.getElementById('btnCopy').addEventListener('click', copyNotif);
  var segBtn = document.getElementById('btnSegCopy');
  if (segBtn) segBtn.addEventListener('click', segCopyPanel);
}

function toggleSelectAll(){
  if (!currentTeacher || Object.keys(currentWK).length===0){ alert('请先查询教师'); return; }
  var cbs = document.querySelectorAll('#scheduleArea input[type=checkbox]');
  if (cbs.length===0) return;
  // 判断是否已全选
  var allChecked = true;
  cbs.forEach(function(cb){ if(!cb.checked) allChecked=false; });
  var target = !allChecked; // 全选变为true，取消变为false
  cbs.forEach(function(cb){
    cb.checked = target;
    cb.closest('.period-row').classList.toggle('selected', target);
    onCourseToggle(cb.getAttribute('data-key'), target);
  });
  var btn = document.getElementById('btnSelectAll');
  if (target){
    btn.textContent = '☒ 取消全选';
    btn.style.background = '#FF4D4F';
  } else {
    btn.textContent = '☑ 全选';
    btn.style.background = '#52c41a';
  }
  // 同步各星期的"全选本天"按钮状态（勾选/未勾选）
  refreshDayBtns();
}

function resetSelectAllBtn(){
  var btn = document.getElementById('btnSelectAll');
  btn.textContent = '☑ 全选';
  btn.style.background = '#52c41a';
}

function showToast(msg){
  var t = document.getElementById('dkToast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(window.__dkToastTimer);
  window.__dkToastTimer = setTimeout(function(){ t.classList.remove('show'); }, 1600);
}

/* ==================== 生成记录（加入累积，不导出）========================= */
function doGenerateRecord(){
  // 取当前界面勾选的课程
  var cbs = document.querySelectorAll('#scheduleArea input[type=checkbox]:checked');
  if (cbs.length===0){ alert('请先勾选课程'); return; }

  // 请假事由必填
  var leaveReasonInput = null;
  var reason = '';
  var __leaveReasonEl = document.getElementById('leaveReason');
  if (__leaveReasonEl) {
    reason = String(__leaveReasonEl.value || '').trim();
    leaveReasonInput = __leaveReasonEl;
  }
  if (!reason) { alert('请先选择请假事由'); return; }

  var count = 0;
  cbs.forEach(function(cb){
    var k = cb.getAttribute('data-key');
    // 累积到累积池（key 追加请假事由为第6段）
    var fullKey = k + '|' + reason;
    if (!accumPool[fullKey]){ accumPool[fullKey] = true; count++; }
    cb.checked = false;
    cb.closest('.period-row').classList.remove('selected');
  });
  updateAccumBar();
  resetSelectAllBtn();
    refreshDayBtns();

    showToast('已新增 ' + count + ' 条（累计 ' + Object.keys(accumPool).length + ' 条）');
}

/* ==================== 导出Excel（累积池全部记录一键导出） ==================== */
function doExportExcel(){
  var keys = Object.keys(accumPool);
  if (keys.length===0){ alert('累积池为空，请先勾选课程并生成记录'); return; }

  // 基准日 = 请假日期框所选（YYYY-MM-DD），手动拆分以避开 '-' 的 UTC 解析偏差
  var ddRaw = document.getElementById('startDate').value || todayStr();
  var dp = ddRaw.split('-');
  var baseDate = new Date(parseInt(dp[0],10), (parseInt(dp[1],10)-1), parseInt(dp[2],10)); // 本地基准日
  var baseIdx = baseDate.getDay();                 // 0=周日..6=周六

  // 星期中文 → JS getDay() 数值（周一=1..周五=5）
  var WK = {'星期天':0,'星期日':0,'星期一':1,'星期二':2,'星期三':3,'星期四':4,'星期五':5,'星期六':6};

  var rows = [];
  var today = fmtDateSlash(todayStr());
  keys.forEach(function(k){
    var p = k.split('|');
    var num = parseInt(p[0]);
    var cls = p[1];
    var teacher = p[2];
    var wk = p[4];
    var reason = p[5] || '';                       // 第6段：请假事由 → D列

    // 方案A：该行 A 列真实日期 = 基准日 + (本行星期几到基准日星期几的差值)
    var wkIdx = (typeof WK[wk] === 'number') ? WK[wk] : baseIdx;
    var off = wkIdx - baseIdx;
    var ad = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate() + off);
    var dateA = ad.getFullYear() + '/' + (ad.getMonth()+1) + '/' + ad.getDate(); // 斜杠、不带零

    rows.push([dateA, wk, teacher, reason, cls, periodName(num), '', today, 1, (num===1?0.5:'')]);
    //          A     B   C       D       E    F             G   H     I  J
  });
  exportExcel(rows);
}

function periodName(num){
  if (num===98 || num==='98') return '午休';
  return '第'+num+'节';
}

/* 用 SheetJS 导出 xlsx，列结构与 VBA 一致（数据从第一行写起，无表头） */
function exportExcel(rows){
  var data = rows;
  var ws = XLSX.utils.aoa_to_sheet(data);
  // 设置列宽
  ws['!cols'] = [{wch:12},{wch:8},{wch:14},{wch:5},{wch:8},{wch:10},{wch:5},{wch:12},{wch:5},{wch:5}];
  var wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '生成记录');
  var fn = '代课记录_'+todayStr().replace(/-/g,'')+'.xlsx';
  XLSX.writeFile(wb, fn);
}

/* ==================== 生成通知（一键复制） ==================== */
function buildNotif(filterGrade){
  // 若累积池为空
  if (Object.keys(accumPool).length===0){ alert('累积池为空，请先勾选课程并生成记录'); return ''; }
  filterGrade = filterGrade || '';
  // 通知头部时间段：开始时间 至 结束时间（斜杠不带零，默认未填=今天）
  var __s = document.getElementById('startDate').value || todayStr();
  var __e = document.getElementById('endDate').value || todayStr();
  var __mmd = function(s){ var p=(s||'').split('-'); return p.length>=3 ? (parseInt(p[1],10)+'/'+parseInt(p[2],10)) : ''; };
  var dd = __mmd(__s) + ' 至 ' + __mmd(__e);
  // 按年级分组
  var groups = {};   // 年级 -> {lines:[], teachers:{}}
  var keys = Object.keys(accumPool);
  keys.forEach(function(k){
    var p = k.split('|');
    var num = parseInt(p[0]);
    var cls = p[1];
    var teacher = p[2];
    var isBZ = parseInt(p[3]);
    var wk = p[4];
    var grade = cls.charAt(0);
    if (filterGrade && grade !== filterGrade) return;
    if (!groups[grade]) groups[grade] = { lines:{}, reasons:{}, reasonOrder:[] };
    var g = groups[grade];
    // 按请假事由收集该年级请假教师（同事由合并得一组）
    var rs = (p[5] || '').trim();
    if (rs) {
      if (!g.reasons[rs]) { g.reasons[rs] = {}; g.reasonOrder.push(rs); }
      g.reasons[rs][teacher] = true;
    }
    var lineKey = wk+'|'+cls;
    if (!g.lines[lineKey]) g.lines[lineKey] = { week:wk, cls:cls, periods:[], bz:isBZ };
    g.lines[lineKey].periods.push(num);
  });

  // 构建每年级文本
  var gradeOrder = {'一':1,'二':2,'三':3,'四':4,'五':5,'六':6};
  var gradeKeys = Object.keys(groups).sort(function(a,b){ return (gradeOrder[a]||0)-(gradeOrder[b]||0); });

  var notif = '';
  gradeKeys.forEach(function(gk){
    var g = groups[gk];
    // —— 标题：每年级一段 ——
    notif += '【'+gk+'年级  代课通知】\n';
    // —— 请假区：按请假事由分组；首行带「请假教师：」前缀，后续行用全角空格占位对齐姓名 ——
    var LEAD = '请假：';
        var pad = '     ';   // 手机微信实测：5 个英文半角空格即可与“请假：”前缀对齐姓名首字

    g.reasonOrder.forEach(function(rs, idx){
      var names = Object.keys(g.reasons[rs]).join('、');
      notif += (idx===0 ? LEAD : pad) + names + '（' + rs + ' ' + dd + '）\n';
    });
    // 请假区与节次区之间空一行
    notif += '\n';
    // 排列课程：先按星期（周一~周五），同星期内按班号升序
    var lines = Object.keys(g.lines);
    var dayOrder = {'星期一':1,'星期二':2,'星期三':3,'星期四':4,'星期五':5};
    function clsNum(cls){ var m = String(cls||'').match(/\d+/); return m ? parseInt(m[0],10) : 0; }
    lines.sort(function(a,b){
      var la = g.lines[a], lb = g.lines[b];
      var da = dayOrder[la.week]||0, db = dayOrder[lb.week]||0;
      if (da!==db) return da-db;              // 先按星期
      return clsNum(la.cls) - clsNum(lb.cls); // 同星期按班号升序
    });
    var lastWeek = '';                        // 每年级独立重置，防止跨年级串扰
    lines.forEach(function(lk){
      var l = g.lines[lk];
      var per = mergePeriods(l.periods);
      // 相同星期只显示第一个，后续相同星期用空格占位：中文星期名每字按 2 个半角空格宽度计
      // （如"星期二"=3字 → 6空格），让班级列在常见字体下大致垂直对齐
      var weekText = l.week;
      if (l.week === lastWeek) {
        var spaces = '';
        for (var sp = 0; sp < l.week.length * 2; sp++) spaces += ' ';
        weekText = spaces;                     // 每字 2 空格占位
      }
      lastWeek = l.week;
            var line = weekText+' '+l.cls+' '+per;
      if (l.bz) line += '  代班主任';
      notif += line+'\n';
    });
    notif += '\n辛苦年级主任转发至组内。\n\n';
  });
  return notif.trim();
}

function mergePeriods(periods){
  var arr = periods.slice().sort(function(a,b){return a-b;});
  // 合并连续数字，如 3,4 -> "第3、4节"
  var out = [];
  var i=0;
  while(i<arr.length){
    var start = arr[i], end = arr[i];
    while(i+1<arr.length && arr[i+1]===end+1){ end=arr[i+1]; i++; }
    if (start===end || start===98){
      if (start===98) out.push('午休');
      else out.push('第'+start+'节');
    } else {
      out.push('第'+start+'、'+end+'节');
    }
    i++;
  }
  return out.join('、');
}

function showNotif(){
  var text = buildNotif();
  if (!text) return;
  var box = document.getElementById('notifPreview');
  box.style.display='block';
  box.textContent = text;
}

function copyNotif(){
  if (Object.keys(accumPool).length===0){ alert('请先勾选并生成记录'); return; }
  var text = buildNotif();
  if (!text) return;

  // 优先：在“点击”这个同步手势里直接执行 execCommand 复制，手机上成功率最高
  var ok = false;
  try { ok = tryExecCopy(text); } catch(e){ ok = false; }
  if (ok){
    showNotif();
    showCopyHint();
    return;
  }

  // 备选：Clipboard API（桌面 HTTPS 环境友好）
  if (navigator.clipboard && navigator.clipboard.writeText){
    navigator.clipboard.writeText(text).then(function(){
      showNotif();
      showCopyHint();
    }).catch(function(){
      manualCopyPanel(text);
    });
    return;
  }

  // 最终兜底：弹出可“长按→复制”的大面板，保底可用
  manualCopyPanel(text);
}

function tryExecCopy(text){
  var ta = document.createElement('textarea');
  ta.value = text;
  ta.setAttribute('readonly', 'readonly');
  ta.contentEditable = false;
  ta.style.position = 'fixed';
  ta.style.top = '-9999px';
  ta.style.left = '-9999px';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.focus();
  ta.select();
  if (typeof ta.setSelectionRange === 'function'){
    ta.setSelectionRange(0, text.length);
  }
  var ok = false;
  try { ok = document.execCommand('copy'); } catch(e){ ok = false; }
  document.body.removeChild(ta);
  return ok;
}

function manualCopyPanel(text){
  var old = document.getElementById('dkManualMask');
  if (old && old.parentNode) old.parentNode.removeChild(old);

  var o = document.createElement('div');
  o.id = 'dkManualMask';
  o.style.cssText = 'position:fixed;left:0;right:0;top:0;bottom:0;background:rgba(0,0,0,0.45);z-index:9998;display:flex;align-items:center;justify-content:center;padding:16px;box-sizing:border-box;';
  o.innerHTML =
    '<div style="background:#fff;border-radius:12px;max-width:520px;width:100%;padding:16px;box-sizing:border-box;font-family:sans-serif">' +
      '<div style="font-size:15px;font-weight:700;color:#333;margin-bottom:10px">复制到微信</div>' +
      '<p style="font-size:13px;color:#888;margin:0 0 8px">页面没能自动复制成功。请长按（按住约1秒）下面文字，弹出菜单点「复制」，再去微信粘贴：</p>' +
      '<textarea id="dkManualText" readonly style="width:100%;height:160px;box-sizing:border-box;border:1px solid #ccc;border-radius:8px;padding:8px;font-size:13px;background:#fafafa"></textarea>' +
      '<div style="text-align:right;margin-top:10px">' +
        '<button id="dkManualClose" style="border:none;background:#3FA7D4;color:#fff;padding:9px 18px;border-radius:8px;font-size:14px;cursor:pointer">关闭</button>' +
      '</div>' +
    '</div>';
  document.body.appendChild(o);

  var tb = o.querySelector('#dkManualText');
  tb.value = text;
  var cbtn = o.querySelector('#dkManualClose');
  cbtn.addEventListener('click', function(){ document.body.removeChild(o); });
  o.addEventListener('click', function(e){ if (e.target === o) document.body.removeChild(o); });
  tb.focus();
  tb.select();
  if (typeof tb.setSelectionRange === 'function'){
    tb.setSelectionRange(0, text.length);
  }
}

function showCopyHint(){
  showToast('已复制，请去微信粘贴');
}

/* ===== 分段复制：按年级切到各自小段（含请假教师），逐年级复制发送 ===== */
function segCopyPanel(){
  if (Object.keys(accumPool).length===0){ alert('请先勾选并生成记录'); return; }
  var gOrder = ['一','二','三','四','五','六'];
  var present = {};
  Object.keys(accumPool).forEach(function(k){
    present[k.split('|')[1].charAt(0)] = true;
  });
  var grades = gOrder.filter(function(g){ return !!present[g]; });
  if (grades.length===0) return;

  // 遮罩
  var oldm = document.getElementById('dkSegMask');
  if (oldm && oldm.parentNode) oldm.parentNode.removeChild(oldm);
  var o = document.createElement('div');
  o.id = 'dkSegMask';
  o.style.cssText = 'position:fixed;left:0;right:0;top:0;bottom:0;background:rgba(0,0,0,0.5);z-index:9997;display:flex;align-items:center;justify-content:center;padding:16px;box-sizing:border-box;';

    function chipBtn(g, label){
    return '<button type="button" class="seg-chip" data-g="'+g+'" style="border:none;padding:11px 18px;font-size:16px;border-radius:22px;margin:3px 3px;font-weight:600;line-height:1;cursor:pointer;-webkit-tap-highlight-color:transparent;background:#eef4fb;color:#333">'+label+'</button>';
  }
  var chips = [ chipBtn('', '全部') ];
  grades.forEach(function(g){ chips.push(chipBtn(g, g+'年级')); });

  o.innerHTML =
    '<div style="background:#fff;border-radius:14px;max-width:640px;width:100%;padding:16px;box-sizing:border-box;max-height:90vh;display:flex;flex-direction:column">' +
      '<div style="display:flex;align-items:center;justify-content:space-between">' +
        '<div style="font-size:15px;font-weight:700;color:#333">发送到微信 · 按年级分段</div>' +
        '<button id="dkSegClose" type="button" style="border:none;background:#eee;color:#666;border-radius:50%;width:26px;height:26px;font-size:13px;cursor:pointer">✕</button>' +
      '</div>' +
      '<p style="font-size:12px;color:#999;margin:6px 0 8px">点某个年级，只显示那一段（内含请假教师）；再点下方按钮复制该段。选“全部”则看整份。</p>' +
      '<div id="dkSegChips" style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px">'+ chips.join('') +'</div>' +
      '<textarea id="dkSegText" readonly style="flex:1;min-height:180px;width:100%;box-sizing:border-box;border:1px solid #ddd;border-radius:8px;padding:8px;font-size:13px;background:#fafafa"></textarea>' +
      '<div style="display:flex;justify-content:flex-end;margin-top:10px">' +
        '<button id="dkSegCopy" type="button" style="border:none;background:#3FA7D4;color:#fff;padding:10px 18px;border-radius:8px;font-size:14px;cursor:pointer">复制这一段</button>' +
      '</div>' +
    '</div>';
  document.body.appendChild(o);

  var ta = o.querySelector('#dkSegText');
  var state = { grade: '' };

  function applyText(){
    var txt = state.grade ? (buildNotif(state.grade) || '') : (buildNotif() || '');
    ta.value = txt;
    ta.scrollTop = 0;
    highlightChips();
  }
  function highlightChips(){
    o.querySelectorAll('.seg-chip').forEach(function(c){
      var active = (c.getAttribute('data-g')||'') === state.grade;
      if (active){ c.style.background='#3FA7D4'; c.style.color='#fff'; }
      else { c.style.background='#eef4fb'; c.style.color='#333'; }
    });
  }

  o.querySelector('#dkSegChips').addEventListener('click', function(e){
    var b = e.target.closest('.seg-chip');
    if (!b) return;
    state.grade = b.getAttribute('data-g') || '';
    applyText();
  });

  o.querySelector('#dkSegCopy').addEventListener('click', function(){
    var txt = ta.value;
    if (!txt){ alert('暂无内容'); return; }
    var ok = false;
    try { ok = tryExecCopy(txt); } catch(e){ ok = false; }
    if (ok){
      showToast('已复制该年级段，请去微信粘贴');
      return;
    }
    if (navigator.clipboard && navigator.clipboard.writeText){
      navigator.clipboard.writeText(txt).then(function(){
        showToast('已复制该年级段，请去微信粘贴');
      }).catch(function(){ manualCopyPanel(txt); });
      return;
    }
    manualCopyPanel(txt);
  });

  o.querySelector('#dkSegClose').addEventListener('click', function(){ document.body.removeChild(o); });
  o.addEventListener('click', function(e){ if (e.target === o) document.body.removeChild(o); });

  buildNotif(); // 空跑校验用
  applyText();
}
