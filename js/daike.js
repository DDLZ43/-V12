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
  document.getElementById('leaveDate').value = todayStr();
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
   1. 中文/原样子串匹配（"王"匹配"王丽君"）
   2. 拼音首字母连续子串（"wlj"匹配"王丽君"）
   3. 拼音首字母子序列（"zhx"匹配"张艳红（小）"，"g"匹配"周国林"）
   会自动跳过姓名里的括号等非汉字字符，避免污染首字母串。 */
function __dkInitials(name){
  var py = (typeof window !== 'undefined' && window.PY_MAP) ? window.PY_MAP : {};
  var out = '', str = String(name || '');
  for (var i = 0; i < str.length; i++) {
    var ch = str.charAt(i);
    if (py[ch]) out += py[ch];
  }
  return out;
}
function __dkMatchName(name, kwRaw){
  var kw = String(kwRaw || '').trim();
  if (!kw) return true;
  var kwL = kw.toLowerCase();
  var nmL = String(name || '').toLowerCase();
  // 中文 / 原样子串
  if (nmL.indexOf(kwL) !== -1) return true;
  // 拼音首字母
  var initials = __dkInitials(name).toLowerCase();
  if (!initials) return false;
  // 连续子串
  if (initials.indexOf(kwL) !== -1) return true;
  // 子序列（按顺序逐字匹配）
  var pos = 0;
  for (var j = 0; j < kwL.length; j++) {
    pos = initials.indexOf(kwL.charAt(j), pos);
    if (pos === -1) return false;
    pos++;
  }
  return kwL.length > 0;
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
  document.getElementById('btnQuery').addEventListener('click', doQuery);
  document.getElementById('btnSelectAll').addEventListener('click', toggleSelectAll);
  document.getElementById('btnRecord').addEventListener('click', doGenerateRecord);
  document.getElementById('btnExport').addEventListener('click', doExportExcel);
  document.getElementById('btnClearAll').addEventListener('click', function(){
    if (confirm('确定清空所有累积？')) clearAccum();
  });
  document.getElementById('btnCopy').addEventListener('click', copyNotif);
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

/* ==================== 生成记录（加入累积，不导出）========================= */
function doGenerateRecord(){
  // 取当前界面勾选的课程
  var cbs = document.querySelectorAll('#scheduleArea input[type=checkbox]:checked');
  if (cbs.length===0){ alert('请先勾选课程'); return; }

  var count = 0;
  cbs.forEach(function(cb){
    var k = cb.getAttribute('data-key');
    // 累积到累积池
    if (!accumPool[k]){ accumPool[k] = true; count++; }
    cb.checked = false;
    cb.closest('.period-row').classList.remove('selected');
  });
  updateAccumBar();
  resetSelectAllBtn();
  refreshDayBtns();
  alert('已生成记录并加入累积，新增 '+count+' 条（累计 '+Object.keys(accumPool).length+' 条）。');
}

/* ==================== 导出Excel（累积池全部记录一键导出） ==================== */
function doExportExcel(){
  var keys = Object.keys(accumPool);
  if (keys.length===0){ alert('累积池为空，请先勾选课程并生成记录'); return; }

  var rows = [];
  var dd = document.getElementById('leaveDate').value || todayStr();
  var today = todayStr();
  keys.forEach(function(k){
    var p = k.split('|');
    var num = parseInt(p[0]);
    var cls = p[1];
    var teacher = p[2];
    var wk = p[4];
    rows.push([dd, wk, teacher, '', cls, periodName(num), '', today, 1, (num===1?0.5:'')]);
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
function buildNotif(){
  // 若累积池为空
  if (Object.keys(accumPool).length===0){ alert('累积池为空，请先勾选课程并生成记录'); return ''; }
  var dd = fmtDateSlash(document.getElementById('leaveDate').value || todayStr());
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
    if (!groups[grade]) groups[grade] = { lines:{}, teachers:{} };
    var g = groups[grade];
    var lineKey = wk+'|'+cls;
    if (!g.lines[lineKey]) g.lines[lineKey] = { week:wk, cls:cls, periods:[], bz:isBZ };
    g.lines[lineKey].periods.push(num);
    g.teachers[teacher]=true;
  });

  // 构建每年级文本
  var gradeOrder = {'一':1,'二':2,'三':3,'四':4,'五':5,'六':6};
  var gradeKeys = Object.keys(groups).sort(function(a,b){ return (gradeOrder[a]||0)-(gradeOrder[b]||0); });

  var notif = '';
  gradeKeys.forEach(function(gk){
    var g = groups[gk];
    var teachers = Object.keys(g.teachers).join(',');
    notif += '【'+gk+'年级  代课通知  '+dd+'  请假教师：'+teachers+' 】\n\n';
    // 排列课程（按星期）
    var lines = Object.keys(g.lines);
    var dayOrder = {'星期一':1,'星期二':2,'星期三':3,'星期四':4,'星期五':5};
    lines.sort(function(a,b){
      var da = g.lines[a].week, db = g.lines[b].week;
      var ga = gradeOrder[g.lines[a].cls.charAt(0)]||0, gb = gradeOrder[g.lines[b].cls.charAt(0)]||0;
      if (ga!==gb) return ga-gb;
      return (dayOrder[da]||0)-(dayOrder[db]||0);
    });
    lines.forEach(function(lk){
      var l = g.lines[lk];
      var per = mergePeriods(l.periods);
      var line = l.week+' '+l.cls+'班 '+per;
      if (l.bz) line += '  代班主任';
      notif += line+'\n';
    });
    notif += '\n辛苦转发通知至年级组内。\n\n';
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

  var done = function(){ showCopyHint(); };

  // 方案1：Async Clipboard API（需 HTTPS 安全上下文）
  if (navigator.clipboard && navigator.clipboard.writeText){
    navigator.clipboard.writeText(text).then(done).catch(function(){
      legacyCopy(text, done);
    });
    showNotif();
    return;
  }

  // 方案2：兼容移动端（iOS/安卓）的 execCommand 复制
  legacyCopy(text, done);
  showNotif();
}

function legacyCopy(text, done){
  try {
    var ta = document.createElement('textarea');
    // 移动端（尤其 iOS Safari）需要 readonly + contentEditable + 定位固定，隐藏滚动跳位
    ta.value = text;
    ta.setAttribute('readonly', 'readonly');
    ta.contentEditable = true;
    ta.style.position = 'fixed';
    ta.style.top = '-9999px';
    ta.style.left = '-9999px';
    ta.style.opacity = '0';
    document.body.appendChild(ta);

    var selection = window.getSelection && window.getSelection();
    var oldRange = selection && selection.rangeCount > 0 ? selection.getRangeAt(0) : null;

    ta.focus();
    ta.select();
    // iOS 需要 setSelectionRange 扩展全选
    if (typeof ta.setSelectionRange === 'function'){
      ta.setSelectionRange(0, text.length);
    }

    var ok = false;
    try { ok = document.execCommand('copy'); } catch(e){ ok = false; }

    // 恢复之前的选区，避免破坏页面
    if (selection && oldRange){
      selection.removeAllRanges();
      selection.addRange(oldRange);
    }
    document.body.removeChild(ta);

    if (ok) { done(); return; }
  } catch(e){}

  // execCommand 失败的回退：弹窗让用户手动复制
  showManualCopy(text);
}

function showManualCopy(text){
  try {
    var textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', 'readonly');
    textarea.style.position = 'fixed';
    textarea.style.top = '0';
    textarea.style.left = '0';
    textarea.style.width = '100%';
    textarea.style.height = '120px';
    textarea.style.zIndex = '9999';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    if (typeof textarea.setSelectionRange === 'function'){
      textarea.setSelectionRange(0, text.length);
    }
    alert('未能自动复制，已把内容填入上方输入框，请手动长按复制后粘贴到微信。');
  } catch(e){
    // 最后兜底：直接在通知框显示，供用户手动复制
    var box = document.getElementById('notifPreview');
    if (box){
      box.style.display = 'block';
      box.textContent = text;
    }
    alert('已生成通知，请长按上方通知内容手动复制。');
  }
}

function showCopyHint(){
  var h = document.getElementById('copyHint');
  h.style.display = 'inline';
  setTimeout(function(){ h.style.display='none'; }, 3000);
}
