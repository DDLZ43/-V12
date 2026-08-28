// ==================== 主应用逻辑 V12 ====================

// 数据已由 data-loader.js 异步加载，等数据就绪后再初始化
__whenDataReady__(function() {
    initNavTabs();
    initClassQuery();
    initTeacherQuery();
    initContacts();
    initAdmin();
});

// ==================== 顶部导航切换 ====================
function initNavTabs() {
    var navBtns = document.querySelectorAll('.nav-btn');
    var panels = document.querySelectorAll('.panel');
    for (var i = 0; i < navBtns.length; i++) {
        navBtns[i].addEventListener('click', function() {
            var targetTab = this.getAttribute('data-tab');
            if (!targetTab) return;
            for (var j = 0; j < navBtns.length; j++) {
                navBtns[j].classList.remove('active');
            }
            this.classList.add('active');
            for (var k = 0; k < panels.length; k++) {
                panels[k].classList.remove('active');
            }
            document.getElementById('panel-' + targetTab).classList.add('active');
        });
    }
}

// ==================== 班级课表查询 ====================
function initClassQuery() {
    var select = document.getElementById('class-select');
    var btn = document.getElementById('btn-class-query');
    var result = document.getElementById('class-result');
    // 直接从 scheduleData 提取班级 key，避免依赖外部函数
    var classes = [];
    for (var key in scheduleData) {
        if (scheduleData.hasOwnProperty(key)) {
            classes.push(key);
        }
    }
    // 按年级（一~六）和班级号数字排序：一1,一2...一13,二1,二2...
    var gradeOrder = { '一': 1, '二': 2, '三': 3, '四': 4, '五': 5, '六': 6 };
    classes.sort(function(a, b) {
        var gA = gradeOrder[a.charAt(0)] || 0;
        var gB = gradeOrder[b.charAt(0)] || 0;
        if (gA !== gB) return gA - gB;
        // 用正则提取数字，确保一10排在一9后面，而不是一2后面
        var mA = a.match(/\d+/);
        var mB = b.match(/\d+/);
        var nA = mA ? parseInt(mA[0], 10) : 0;
        var nB = mB ? parseInt(mB[0], 10) : 0;
        return nA - nB;
    });
    for (var i = 0; i < classes.length; i++) {
        var opt = document.createElement('option');
        opt.value = classes[i];
        opt.textContent = classes[i];
        select.appendChild(opt);
    }
    btn.addEventListener('click', function() {
        var cls = select.value;
        if (!cls) { alert('请先选择班级'); return; }
        renderClassSchedule(cls, result);
    });
}

function renderClassSchedule(className, container) {
    var data = scheduleData[className];
    if (!data) {
        container.innerHTML = '<p class="no-result">未找到该班级课表</p>';
        container.style.display = 'block';
        return;
    }
    var html = '<table class="schedule-table"><thead><tr><th class="time-col">节次</th>';
    for (var i = 0; i < days.length; i++) {
        html += '<th class="day-header">' + days[i] + '</th>';
    }
    html += '</tr></thead><tbody>';
    for (var p = 0; p < periods.length; p++) {
        var period = periods[p];
        html += '<tr><td class="time-col">' + period + '</td>';
        for (var d = 0; d < days.length; d++) {
            var day = days[d];
            var lesson = data[day] && data[day][period] ? data[day][period] : null;
            if (lesson) {
                html += '<td><div class="course-box"><div class="course-name">' + lesson.course + '</div>' +
                       '<div class="course-meta">' + lesson.teacher + '</div></div></td>';
            } else {
                html += '<td class="empty">—</td>';
            }
        }
        html += '</tr>';
    }
    html += '</tbody></table>';
    container.innerHTML = html;
    container.style.display = 'block';
}

// ==================== 教师课表查询 ====================
function initTeacherQuery() {
    var input = document.getElementById('teacher-input');
    var suggest = document.getElementById('teacher-suggest');
    var btn = document.getElementById('btn-teacher-query');
    var info = document.getElementById('teacher-info');
    var result = document.getElementById('teacher-result');

    var allNames = new Set();
    var teachers = getAllTeachers();
    for (var i = 0; i < teachers.length; i++) { allNames.add(teachers[i]); }
    if (typeof contactsData !== 'undefined') {
        for (var i = 0; i < contactsData.length; i++) { allNames.add(contactsData[i].name); }
    }
    var allTeachers = Array.from(allNames).sort(function(a, b) { return a.localeCompare(b, 'zh-CN'); });

    var activeIndex = -1;

    input.addEventListener('input', function() {
        var val = this.value.trim();
        activeIndex = -1;
        if (!val) { suggest.classList.remove('show'); return; }
        var filtered = [];
        for (var i = 0; i < allTeachers.length; i++) {
            if (allTeachers[i].toLowerCase().indexOf(val.toLowerCase()) !== -1) {
                filtered.push(allTeachers[i]);
            }
        }
        if (filtered.length === 0) {
            suggest.innerHTML = '<li class="no-match">无匹配教师</li>';
        } else {
            var lis = '';
            for (var i = 0; i < filtered.length; i++) {
                var t = filtered[i];
                var idx = t.toLowerCase().indexOf(val.toLowerCase());
                var before = t.substring(0, idx);
                var match = t.substring(idx, idx + val.length);
                var after = t.substring(idx + val.length);
                lis += '<li data-name="' + t + '">' + before + '<span class="hl">' + match + '</span>' + after + '</li>';
            }
            suggest.innerHTML = lis;
        }
        suggest.classList.add('show');
    });

    suggest.addEventListener('click', function(e) {
        var li = e.target.closest('li');
        if (!li || li.classList.contains('no-match')) return;
        var name = li.getAttribute('data-name');
        input.value = name;
        suggest.classList.remove('show');
        renderTeacherSchedule(name, info, result);
    });

    input.addEventListener('keydown', function(e) {
        var items = suggest.querySelectorAll('li:not(.no-match)');
        if (!suggest.classList.contains('show') || items.length === 0) return;
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            activeIndex = (activeIndex + 1) % items.length;
            updateActive(items);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            activeIndex = (activeIndex - 1 + items.length) % items.length;
            updateActive(items);
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (activeIndex >= 0 && items[activeIndex]) {
                var name = items[activeIndex].getAttribute('data-name');
                input.value = name;
                suggest.classList.remove('show');
                renderTeacherSchedule(name, info, result);
            } else if (input.value.trim()) {
                suggest.classList.remove('show');
                renderTeacherSchedule(input.value.trim(), info, result);
            }
        } else if (e.key === 'Escape') {
            suggest.classList.remove('show');
        }
    });

    document.addEventListener('click', function(e) {
        if (!e.target.closest('.input-wrap')) {
            suggest.classList.remove('show');
        }
    });

    btn.addEventListener('click', function() {
        var name = input.value.trim();
        if (!name) { alert('请输入教师姓名'); return; }
        suggest.classList.remove('show');
        renderTeacherSchedule(name, info, result);
    });
}

function updateActive(items) {
    for (var i = 0; i < items.length; i++) {
        if (i === activeIndex) {
            items[i].classList.add('active');
            items[i].scrollIntoView({ block: 'nearest' });
        } else {
            items[i].classList.remove('active');
        }
    }
}

function renderTeacherSchedule(name, infoEl, resultEl) {
    var result = getTeacherSchedule(name);
    if (result.total === 0) {
        infoEl.style.display = 'none';
        resultEl.innerHTML = '<p class="no-result">未找到该教师的课表信息</p>';
        resultEl.style.display = 'block';
        return;
    }
    infoEl.style.display = 'block';
    infoEl.innerHTML = '<h3>👨‍🏫 ' + name + '</h3><p>本周共 <strong>' + result.total + '</strong> 节课</p>';

    var html = '<table class="schedule-table"><thead><tr><th class="time-col">节次</th>';
    for (var i = 0; i < days.length; i++) {
        html += '<th class="day-header">' + days[i] + '</th>';
    }
    html += '</tr></thead><tbody>';
    for (var p = 0; p < periods.length; p++) {
        var period = periods[p];
        html += '<tr><td class="time-col">' + period + '</td>';
        for (var d = 0; d < days.length; d++) {
            var day = days[d];
            var lesson = result.schedule[day] && result.schedule[day][period] ? result.schedule[day][period] : null;
            if (lesson) {
                html += '<td><div class="course-box"><div class="course-name">' + lesson.course + '</div>' +
                       '<div class="course-meta">' + lesson.class + '</div></div></td>';
            } else {
                html += '<td class="empty">—</td>';
            }
        }
        html += '</tr>';
    }
    html += '</tbody></table>';
    resultEl.innerHTML = html;
    resultEl.style.display = 'block';
}

// ==================== 通讯录 ====================
function initContacts() {
    var input = document.getElementById('contact-input');
    var container = document.getElementById('contacts-result');

    if (!container) {
        console.error('通讯录容器 #contacts-result 未找到');
        return;
    }
    if (typeof contactsData === 'undefined') {
        console.error('contactsData 未定义，请检查 contacts.js 是否已加载');
        container.innerHTML = '<p class="no-result">通讯录数据加载失败</p>';
        return;
    }

    var CONTACT_PAGE_SIZE = 5; // 默认只展示前 5 条
    var contactShowAll = false;

    function render(list) {
        if (!list || list.length === 0) {
            container.innerHTML = '<p class="no-result">未找到匹配的联系人</p>';
            return;
        }

        // 未点"查看全部"时只展示前 N 条
        var shown = list;
        if (!contactShowAll && list.length > CONTACT_PAGE_SIZE) {
            shown = list.slice(0, CONTACT_PAGE_SIZE);
        }

        var html = '<div class="contacts-grid">';
        for (var i = 0; i < shown.length; i++) {
            var c = shown[i];
            var phone = c.phone || '';
            html += '<div class="contact-item">' +
                    '<span class="contact-name">' + (c.name || '') + '</span>' +
                    '<span class="contact-phone">' + 
                        (phone ? '<a href="tel:' + phone + '">' + phone + '</a>' : '') + 
                    '</span>' +
                    '</div>';
        }
        html += '</div>';

        // 未全部展示时，显示"查看全部"按钮
        if (!contactShowAll && list.length > CONTACT_PAGE_SIZE) {
            html += '<div style="text-align:center;margin-top:12px">' +
                    '<button id="btn-contacts-more" class="btn-blue" style="border:none;border-radius:8px;padding:9px 20px;font-size:14px;cursor:pointer;">查看全部 ' + list.length + ' 位教师</button>' +
                    '</div>';
        }

        container.innerHTML = html;

        var btnMore = document.getElementById('btn-contacts-more');
        if (btnMore) {
            btnMore.addEventListener('click', function() {
                contactShowAll = true;
                render(list);
            });
        }
    }

    render(contactsData);

    if (input) {
        input.addEventListener('input', function() {
            contactShowAll = false; // 每次搜索时重新只显示前几条
            render(searchContacts(this.value.trim()));
        });
    }
}

// ==================== 管理面板 ====================
function initAdmin() {
    var statClass = document.getElementById('stat-class');
    var statTeacher = document.getElementById('stat-teacher');
    var statContact = document.getElementById('stat-contact');
    if (statClass) statClass.textContent = getAllClasses().length;
    if (statTeacher) statTeacher.textContent = getAllTeachers().length;
    if (statContact && typeof contactsData !== 'undefined') statContact.textContent = contactsData.length;

    var btnExport = document.getElementById('btn-export');
    var btnImport = document.getElementById('btn-import');
    var btnClear = document.getElementById('btn-clear');

    if (btnExport) {
        btnExport.addEventListener('click', function() {
            var data = { schedule: scheduleData, contacts: contactsData, exportTime: new Date().toLocaleString() };
            var blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            var url = URL.createObjectURL(blob);
            var a = document.createElement('a');
            a.href = url;
            a.download = '课表数据_' + new Date().toISOString().slice(0, 10) + '.json';
            a.click();
            URL.revokeObjectURL(url);
        });
    }

    if (btnImport) {
        btnImport.addEventListener('click', function() {
            try {
                var data = JSON.parse(document.getElementById('import-area').value);
                if (data.schedule) {
                    for (var key in data.schedule) {
                        scheduleData[key] = data.schedule[key];
                    }
                }
                alert('数据导入成功！');
                location.reload();
            } catch (e) {
                alert('数据格式错误，请检查 JSON 格式');
            }
        });
    }

    if (btnClear) {
        btnClear.addEventListener('click', function() {
            if (confirm('确定要清除所有本地缓存数据吗？')) {
                localStorage.clear();
                alert('缓存已清除');
            }
        });
    }
}