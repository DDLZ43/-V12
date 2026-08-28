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

      // ---- 拼音首字母：用于按姓名首字母搜索（大小写均可） ----
      // key = 单个汉字，value = 该汉字拼音首字母（大写）
      window.PY_MAP = {
        '敖':'A','裕':'Y','华':'H','包':'B','昌':'C','明':'M','生':'S','蔡':'C','冀':'J','湘':'X',
        '吉':'J','燕':'Y','曹':'C','丽':'L','琴':'Q','陈':'C','芳':'F','海':'H','兰':'L','辉':'H',
        '全':'Q','刚':'G','自':'Z','崔':'C','艳':'Y','戴':'D','玲':'L','业':'Y','金':'J','刘':'L',
        '邓':'D','晓':'X','杰':'J','凌':'L','志':'Z','淑':'S','娟':'J','凤':'F','姣':'J','小':'X',
        '菊':'J','雪':'X','莹':'Y','芝':'Z','杜':'D','君':'J','符':'F','安':'A','静':'J','汕':'S',
        '付':'F','群':'Q','高':'G','龚':'G','琼':'Q','郭':'G','元':'Y','翠':'C','侯':'H','平':'P',
        '花':'H','胡':'H','云':'Y','廖':'L','梁':'L','开':'K','喜':'X','柏':'B','英':'Y','贵':'G',
        '妹':'M','美':'M','霞':'X','清':'Q','玉':'Y','秀':'X','梅':'M','松':'S','莲':'L','糜':'M',
        '绍':'S','文':'W','莫':'M','洪':'H','毛':'M','智':'Z','慧':'H','彭':'P','建':'J','纲':'G',
        '健':'J','瞿':'Q','薇':'W','石':'S','梦':'M','虹':'H','亚':'Y','宋':'S','春':'C','二':'E',
        '好':'H','黄':'H','丹':'D','覃':'T','波':'B','飞':'F','吴':'W','立':'L','向':'X','婵':'C',
        '璇':'X','军':'J','前':'Q','延':'Y','秦':'Q','仁':'R','谢':'X','晔':'Y','颖':'Y','徐':'X',
        '庭':'T','婷':'T','芬':'F','许':'X','濒':'B','心':'X','杨':'Y','啊':'A','大':'D','捷':'J',
        '霖':'L','拥':'Y','珍':'Z','遵':'Z','张':'Z','龙':'L','卫':'W','娇':'J','先':'X','红':'H',
        '银':'Y','引':'Y','周':'Z','国':'G','林':'L','朱':'Z','亭':'T','邹':'Z','灵':'L','桃':'T',
        '蒋':'J','孝':'X','康':'K','复':'F','重':'Z','旷':'K','李':'L','成':'C','莉':'L','德':'D',
        '兴':'X','容':'R','敏':'M','晶':'J','黎':'L','胜':'S','双':'S','耀':'Y','宏':'H','佳':'J',
        '琪':'Q','爱':'A','诗':'S','罗':'L','宗':'Z','勋':'X','琦':'Q','孙':'S','蓉':'R','紫':'Z',
        '微':'W','良':'L','谭':'T','蕊':'R','必':'B','碧':'B','姿':'Z','唐':'T','娜':'N','田':'T',
        '鑫':'X','倩':'Q','颜':'Y','院':'Y','王':'W','利':'L','萍':'P','雨':'Y','坤':'K','玫':'M',
        '枝':'Z','忠':'Z','启':'Q','青':'Q','世':'S','有':'Y','树':'S','涛':'T','忻':'X','洁':'J',
        '雅':'Y','起':'Q','姚':'Y','水':'S','印':'Y','富':'F','靖':'J','章':'Z','帆':'F','寒':'H',
        '名':'M','茜':'Q','钰':'Y','霏':'F','礼':'L','赞':'Z','瑞':'R',
        '茹':'R',        '蓉':'R','静':'J','超':'C','进':'J','勇':'Y','军':'J','伟':'W','强':'Q','萍':'P','婕':'J',
        '语':'Y','活':'H','姜':'J','桂':'G','阿':'A','蛟':'J'
      };
      // 返回一个姓名的拼音首字母串（大写），如 "敖裕华" -> "AYH"
      window.getPinyinInitials = function(str) {
        if (!str) return '';
        var s = String(str);
        var out = '';
        for (var i = 0; i < s.length; i++) {
          var ch = s.charAt(i);
          if (PY_MAP[ch]) out += PY_MAP[ch];
          else { out += ch.toUpperCase(); }
        }
        return out.toUpperCase();
      };
      // 判断姓名是否匹配关键字（支持：中文、拼音首字母、大小写前后均可）
      window.matchName = function(name, keyword) {
        if (!keyword) return true;
        var k = String(keyword).trim().toLowerCase();
        if (!k) return true;
        var nm = String(name || '').toLowerCase();
        if (nm.indexOf(k) !== -1) return true;
        // 纯英文/拼音首字母匹配
        if (/^[a-z]+$/.test(k)) {
          var initials = getPinyinInitials(name).toLowerCase();
          if (initials.indexOf(k) !== -1) return true;
        }
        return false;
      };

      window.searchContacts = function(keyword) {
        if (!keyword) return contactList;
        var lower = keyword.toLowerCase();
        var isAlpha = /^[a-zA-Z]+$/.test(keyword);
        if (isAlpha) {
          return contactList.filter(function(c) {
            return c && c.name && matchName(c.name, keyword);
          });
        }
        // 中文关键字：匹配名字子串
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
