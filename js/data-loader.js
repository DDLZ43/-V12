// ==================== 数据加载器 ====================
// 说明：课表、通讯录等基础数据统一存放在 js/data.json 中，
// 课表系统、代课系统、管理后台都通过本文件加载同一份数据。
// 需要修改数据时，只需用文本编辑器修改 js/data.json 一个文件即可，
// 无需再改动任何代码。
// ====================================================

var __SCHEDULE_READY__ = false;
var __SCHEDULE_WAITERS__ = [];

// 数据加载完成后的回调。页面初始化应放在该回调里，确保数据已就绪。
function __whenDataReady__(cb) {
  if (__SCHEDULE_READY__) { cb(); }
  else { __SCHEDULE_WAITERS__.push(cb); }
}

function __loadData__() {
  fetch('js/data.json')
    .then(function(r) { return r.json(); })
    .then(function(D) {
      var schedule = D.scheduleData || {};
      var contactList = D.contactsData || [];

      // ---- 注入全局变量（与旧版 data.js 保持一致） ----
      window.scheduleData = schedule;
      window.contactsData = contactList;
      window.periods = D.periods || [1,2,3,4,5,6];
      window.days = D.days || ["星期一","星期二","星期三","星期四","星期五"];

      // 扁平化的课表记录（兼容管理后台的 SCHEDULE_DATA 逻辑）
      var flat = [];
      var teacherSetFromSchedule = {};
      for (var cls in schedule) {
        for (var d in schedule[cls]) {
          for (var p in schedule[cls][d]) {
            var it = schedule[cls][d][p];
            if (it && it.teacher) teacherSetFromSchedule[it.teacher] = true;
            flat.push({
              key: (it && it.teacher ? it.teacher : '') + d + p,
              teacher: it ? it.teacher : '',
              week: d,
              period: p,
              course: it ? it.course : '',
              className: cls
            });
          }
        }
      }
      window.SCHEDULE_DATA = flat;
      window.CONTACTS_DATA = contactList;

      // ---- 工具函数（与原 data.js 逻辑一致） ----
      window.getAllClasses = function() {
        return Object.keys(schedule).sort();
      };

      window.getAllTeachers = function() {
        var s = {};
        // 通讯录里的名字
        for (var i = 0; i < contactList.length; i++) {
          if (contactList[i] && contactList[i].name) s[contactList[i].name] = true;
        }
        // 课表里的教师
        for (var t in teacherSetFromSchedule) { s[t] = true; }
        return Object.keys(s).sort(function(a, b) { return a.localeCompare(b, 'zh-CN'); });
      };

      window.getTeacherSchedule = function(name) {
        var ts = {}, total = 0;
        var dlist = D.days || ["星期一","星期二","星期三","星期四","星期五"];
        var plist = D.periods || [1,2,3,4,5,6];
        for (var cls in schedule) {
          for (var i = 0; i < dlist.length; i++) {
            var d = dlist[i];
            if (!ts[d]) ts[d] = {};
            for (var j = 0; j < plist.length; j++) {
              var p = plist[j];
              var l = schedule[cls][d] && schedule[cls][d][p] ? schedule[cls][d][p] : null;
              if (l && l.teacher === name) {
                ts[d][p] = { course: l.course, teacher: l.teacher, room: l.room, class: cls };
                total++;
              }
            }
          }
        }
        return { schedule: ts, total: total };
      };

      window.searchContacts = function(keyword) {
        if (!keyword) return contactList;
        var lower = keyword.toLowerCase();
        return contactList.filter(function(c) {
          return c && c.name && c.name.toLowerCase().indexOf(lower) !== -1;
        });
      };

      // ---- 标记就绪并触发所有等待的回调 ----
      __SCHEDULE_READY__ = true;
      for (var k = 0; k < __SCHEDULE_WAITERS__.length; k++) {
        __SCHEDULE_WAITERS__[k]();
      }
      __SCHEDULE_WAITERS__ = [];
    })
    .catch(function(e) {
      console.error('数据加载失败（js/data.json）：', e);
    });
}

__loadData__();
