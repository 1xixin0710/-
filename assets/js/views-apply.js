/* 视图：商业案例 / 算法实验室 / 学习计划 / 答疑板 */
(function(){
'use strict';
var BD = window.BD;

/* ================= 案例列表 ================= */
BD.route('/cases', function(el){
  var inds = [];
  (BD.cases||[]).forEach(function(c){ if(inds.indexOf(c.ind) < 0) inds.push(c.ind); });
  el.innerHTML = '<div class="page-head"><h1>商业案例库</h1>'
    + '<div class="sub">'+(BD.cases||[]).length+' 个真实业务场景案例，每个都包含背景、数据、方法、结论与思考题，可直接用于作业与答辩。</div></div>'
    + '<div class="chips" style="margin-bottom:18px"><span class="chip on" data-ind="">全部</span>'
    + inds.map(function(i){ return '<span class="chip" data-ind="'+BD.esc(i)+'">'+BD.esc(i)+'</span>'; }).join('') + '</div>'
    + '<div id="caseList" class="grid g3"></div>';

  function paint(ind){
    var arr = (BD.cases||[]).filter(function(c){ return !ind || c.ind === ind; });
    document.getElementById('caseList').innerHTML = arr.map(function(c){
      return '<div class="case-card" onclick="location.hash=\'#/case/'+c.id+'\'">'
        + '<span class="ind">'+BD.esc(c.ind)+' · '+BD.esc(c.tag)+'</span>'
        + '<h3>'+BD.esc(c.title)+'</h3><p>'+BD.esc(c.scene)+'</p>'
        + '<div class="chips" style="margin-top:11px">'
        + (c.ch||[]).map(function(id){
            var ch = BD.chById[id] || {no:'综'};
            return '<span class="chip tone-t">第'+ch.no+'章</span>';
          }).join('') + '</div></div>';
    }).join('');
  }
  paint('');
  el.querySelectorAll('.chip[data-ind]').forEach(function(c){
    c.onclick = function(){
      el.querySelectorAll('.chip[data-ind]').forEach(function(x){ x.classList.remove('on'); });
      this.classList.add('on'); paint(this.getAttribute('data-ind'));
    };
  });
});

/* ================= 案例详情 ================= */
BD.route('/case/:id', function(el, p){
  var c = (BD.cases||[]).filter(function(x){ return x.id === p.id; })[0];
  if(!c){ el.innerHTML = '<div class="empty"><div class="big">?</div><p>未找到该案例</p></div>'; return; }
  var steps = [
    {h:'业务背景', t:c.scene},
    {h:'数据情况', t:c.data},
    {h:'分析方法', t:c.method},
    {h:'实施结果', t:c.result}
  ];
  var html = '<div class="crumb"><a href="#/cases">商业案例库</a> / '+BD.esc(c.ind)+'</div>'
    + '<div class="page-head"><h1>'+BD.esc(c.title)+'</h1>'
    + '<div class="chips" style="margin-top:8px"><span class="chip tone-t">'+BD.esc(c.ind)+'</span><span class="chip tone-a">'+BD.esc(c.tag)+'</span>'
    + (c.ch||[]).map(function(id){
        var ch = BD.chById[id] || {no:'综合'};
        return '<span class="chip">对应第'+ch.no+'章</span>';
      }).join('') + '</div></div>';

  html += '<div class="card">';
  steps.forEach(function(s, i){
    html += '<div class="step"><div class="dot">'+(i+1)+'</div><div class="body"><h4>'+s.h+'</h4><div class="txt">'+BD.esc(s.t)+'</div></div></div>';
  });
  html += '</div>';

  html += '<div class="card" style="margin-top:16px"><div class="sect-title">关键启示</div>';
  (c.takeaways||[]).forEach(function(t, i){
    html += '<div class="note" style="margin-bottom:10px"><b>'+(i+1)+'.</b> '+BD.esc(t)+'</div>';
  });
  html += '</div>';

  html += '<div class="card" style="margin-top:16px"><div class="sect-title">思考题</div><ol style="margin:0;padding-left:20px;color:var(--ink2);font-size:13.5px">';
  (c.questions||[]).forEach(function(q){ html += '<li style="margin-bottom:7px">'+BD.esc(q)+'</li>'; });
  html += '</ol><div class="btn-row" style="margin-top:14px">'
    + '<button class="btn" id="caseNote">写下我的思考</button>'
    + '<a class="btn" href="#/qa">去答疑板讨论</a></div></div>';
  el.innerHTML = html;

  document.getElementById('caseNote').onclick = function(){
    BD.modal('<div class="field"><label>我的分析笔记（保存在本机，可在答疑板查看）</label>'
      + '<textarea id="cnTxt" class="blank-in" style="min-height:150px" placeholder="例如：这个案例用的是关联规则，但我觉得还可以补充…"></textarea></div>'
      + '<div class="btn-row" style="margin-top:14px"><button class="btn" id="cnC">取消</button>'
      + '<button class="btn primary" id="cnS">保存</button></div>', '案例笔记 · '+c.title);
    document.getElementById('cnC').onclick = BD.closeModal;
    document.getElementById('cnS').onclick = function(){
      var v = document.getElementById('cnTxt').value.trim();
      if(!v){ BD.toast('内容不能为空','no'); return; }
      BD.store.set(function(s){
        s.qa.unshift({ id:'qa'+Date.now(), q:'【案例思考】'+c.title, a:v, ts:new Date().toLocaleString('zh-CN') });
      });
      BD.closeModal(); BD.toast('笔记已保存到答疑板','ok');
    };
  };
});

/* ================= 算法实验室 ================= */
BD.route('/lab', function(el, p){
  var labs = BD.labs || [];
  var params = new URLSearchParams((location.hash.split('?')[1]||''));
  var cur = params.get('id') || '';

  if(cur){
    var lab = labs.filter(function(l){ return l.id === cur; })[0];
    if(lab){
      el.innerHTML = '<div class="crumb"><a href="#/lab">算法实验室</a> / '+BD.esc(lab.name)+'</div>'
        + '<div class="lab"><div class="lab-head"><h3>'+BD.esc(lab.name)+'</h3>'
        + '<span class="chip tone-a">'+BD.esc(lab.tag)+'</span></div>'
        + '<div class="lab-body" id="labBody"></div></div>'
        + '<div class="btn-row" style="margin-top:16px"><a class="btn" href="#/lab">← 返回实验室列表</a></div>';
      try{ lab.render(document.getElementById('labBody')); }
      catch(err){ document.getElementById('labBody').innerHTML = '<div class="note bad">演示加载出错：'+BD.esc(err.message)+'</div>'; }
      return;
    }
  }

  el.innerHTML = '<div class="page-head"><h1>算法实验室</h1>'
    + '<div class="sub">'+labs.length+' 个可交互的算法演示。拖动滑块、点击画布、修改输入，观察算法每一步的变化——这比看公式更容易真正理解。</div></div>'
    + '<div class="grid g3">' + labs.map(function(l){
        return '<div class="case-card" style="cursor:pointer" onclick="location.hash=\'#/lab?id='+l.id+'\'">'
          + '<span class="ind">'+BD.esc(l.tag)+'</span><h3>'+BD.esc(l.name)+'</h3><p>'+BD.esc(l.desc)+'</p></div>';
      }).join('') + '</div>'
    + '<div class="card" style="margin-top:18px"><div class="sect-title">使用建议</div>'
    + '<ul style="margin:0;padding-left:20px;color:var(--ink2);font-size:13.5px">'
    + '<li>先看章节精讲理解原理，再到实验室动手验证，最后做练习巩固。</li>'
    + '<li>聚类部分的三个演示（K-means、DBSCAN、GMM）建议连续对比，特别注意月牙形数据上 K-means 的失败与 DBSCAN 的成功。</li>'
    + '<li>模型评估演示里把「模型区分能力」调到最低，看看准确率还能有多高——这就是不平衡数据的陷阱。</li>'
    + '</ul></div>';
});

/* ================= 学习计划 ================= */
BD.route('/plan', function(el){
  var st = BD.store.get();
  el.innerHTML = '<div class="page-head"><h1>学习计划</h1>'
    + '<div class="sub">输入考试日期和每周可投入时间，自动倒排出复习计划。勾选完成情况会自动保存在本机。</div></div>'
    + '<div class="card"><div class="lab-ctrl">'
    + '<div class="field"><label>考试日期</label><input type="date" id="plDate" value="'+BD.esc(st.plan.examDate||'')+'"></div>'
    + '<div class="field"><label>每周可投入时长（小时）</label><input type="number" id="plHours" min="1" max="40" value="'+BD.esc(String(st.plan.hoursPerWeek||6))+'"></div>'
    + '<div class="field"><label>基础水平</label><select id="plLevel">'
    + '<option value="weak">基础较弱，需要细读教材</option>'
    + '<option value="mid" selected>中等，能看懂大部分内容</option>'
    + '<option value="good">较好，只需查漏补缺</option></select></div>'
    + '</div><div class="btn-row"><button class="btn primary" id="plGen">生成计划</button>'
    + '<button class="btn" id="plClear">清空勾选</button></div></div>'
    + '<div id="planOut" style="margin-top:18px"></div>';

  function gen(){
    var date = document.getElementById('plDate').value;
    var hours = Number(document.getElementById('plHours').value) || 6;
    var level = document.getElementById('plLevel').value;
    if(!date){ BD.toast('请先选择考试日期','no'); return; }
    var days = BD.daysBetween(BD.today(), date);
    if(days < 0){ BD.toast('考试日期已经过去了','no'); return; }
    var weeks = Math.max(1, Math.ceil(days/7));
    BD.store.set(function(s){ s.plan.examDate = date; s.plan.hoursPerWeek = String(hours); });

    var perWeek = level === 'weak' ? 1.6 : level === 'mid' ? 2.2 : 3.2;
    var items = [];
    (BD.chapters||[]).forEach(function(ch, i){
      items.push({ t:'第'+ch.no+'章 '+ch.title, ch:ch.id, w: perWeek + ch.sections.length*0.12 });
      items.push({ t:'第'+ch.no+'章 练习 + 错题整理', ch:ch.id, w: perWeek*0.7 });
    });
    items.push({ t:'全书思维导图复盘', w: perWeek });
    items.push({ t:'公式与术语集中记忆', w: perWeek });
    items.push({ t:'模拟考试 ×2 + 错题清理', w: perWeek*1.8 });
    items.push({ t:'商业案例复习与作业整理', w: perWeek });

    var totalW = items.reduce(function(a,b){ return a+b.w; }, 0);
    var perWeekItems = items.reduce(function(a,b){ return a+b.w; }, 0) / weeks;
    var buckets = [];
    for(var i=0;i<weeks;i++) buckets.push([]);
    var idx = 0, load = 0, cap = Math.max(2, Math.round(items.length / weeks) + 0.5);
    items.forEach(function(it){
      if(load + it.w > cap * 2 && idx < weeks-1){ idx++; load = 0; }
      buckets[idx].push(it); load += it.w;
    });

    var st2 = BD.store.get();
    var html = '<div class="note ok" style="margin-bottom:16px">距考试 <b>'+days+'</b> 天，共 <b>'+weeks+'</b> 个学习周，'
      + '每周约 '+hours+' 小时。计划按「章节内容 + 配套练习」成对推进，最后两周集中做模拟考试与错题清理。</div>';
    html += '<div class="plan-grid">';
    buckets.forEach(function(b, i){
      var start = new Date(Date.now() + i*7*86400000);
      var label = (start.getMonth()+1)+'/'+start.getDate()+' 起';
      html += '<div class="wk'+(i===0? ' now':'')+'"><div class="h"><b>第 '+(i+1)+' 周</b><span class="r">'+label+'</span></div>';
      if(!b.length) html += '<div class="small muted">本周为机动复习周</div>';
      b.forEach(function(it, j){
        var key = 'w'+i+'_'+j;
        var done = st2.plan.done[key];
        html += '<label class="chk"><input type="checkbox" data-k="'+key+'" '+(done?'checked':'')+'>'
          + '<span'+(done? ' style="text-decoration:line-through;color:var(--ink3)"':'')+'>'+BD.esc(it.t)+'</span></label>';
      });
      html += '</div>';
    });
    html += '</div>';
    document.getElementById('planOut').innerHTML = html;
    document.querySelectorAll('#planOut input[type=checkbox]').forEach(function(cb){
      cb.onchange = function(){
        var k = this.getAttribute('data-k'), c = this.checked;
        BD.store.set(function(s){ if(c) s.plan.done[k] = true; else delete s.plan.done[k]; });
        this.nextElementSibling.style.textDecoration = c? 'line-through' : '';
        this.nextElementSibling.style.color = c? 'var(--ink3)' : '';
      };
    });
  }
  document.getElementById('plGen').onclick = gen;
  document.getElementById('plClear').onclick = function(){
    BD.store.set(function(s){ s.plan.done = {}; });
    BD.toast('已清空勾选','ok'); gen();
  };
  if(st.plan.examDate) gen();
});

/* ================= 答疑板 ================= */
BD.route('/qa', function(el){
  function paint(){
    var st = BD.store.get();
    var html = '<div class="page-head"><h1>答疑板</h1>'
      + '<div class="sub">记录你的疑问、老师或同学的回答、以及案例分析笔记。全部保存在本机，可导出成文档带去问助教。</div></div>'
      + '<div class="card"><div class="sect-title">记录一条</div>'
      + '<div class="field" style="margin-bottom:11px"><label>问题 / 主题</label>'
      + '<input type="text" id="qaQ" placeholder="例如：为什么信息增益偏好取值多的属性？"></div>'
      + '<div class="field"><label>我的理解或答案</label>'
      + '<textarea id="qaA" class="blank-in" placeholder="写出你的思考，或者记录老师给出的解答…"></textarea></div>'
      + '<div class="btn-row" style="margin-top:12px"><button class="btn primary" id="qaAdd">保存</button>'
      + '<button class="btn" id="qaExp">导出全部（Markdown）</button></div></div>';
    if(!st.qa.length){
      html += '<div class="empty"><div class="big">✉</div><p>还没有记录。<br>遇到不懂的地方随时记在这里，考前统一复查。</p></div>';
    } else {
      html += '<div style="margin-top:16px">';
      st.qa.forEach(function(item){
        html += '<div class="qa"><div class="q">❓ '+BD.esc(item.q)+'</div>'
          + '<div class="a">'+BD.esc(item.a)+'</div>'
          + '<div class="meta"><span>'+BD.esc(item.ts||'')+'</span>'
          + '<a style="cursor:pointer;color:var(--red)" data-del="'+BD.esc(item.id)+'">删除</a></div></div>';
      });
      html += '</div>';
    }
    el.innerHTML = html;

    document.getElementById('qaAdd').onclick = function(){
      var q = document.getElementById('qaQ').value.trim();
      var a = document.getElementById('qaA').value.trim();
      if(!q){ BD.toast('请填写问题或主题','no'); return; }
      BD.store.set(function(s){ s.qa.unshift({ id:'qa'+Date.now(), q:q, a:a, ts:new Date().toLocaleString('zh-CN') }); });
      BD.toast('已保存','ok'); paint();
    };
    document.getElementById('qaExp').onclick = function(){
      var stt = BD.store.get();
      if(!stt.qa.length){ BD.toast('还没有记录可以导出','no'); return; }
      var md = '# 大数据分析课程 · 答疑与笔记\n\n导出时间：' + new Date().toLocaleString('zh-CN') + '\n\n';
      stt.qa.forEach(function(x, i){
        md += '## ' + (i+1) + '. ' + x.q + '\n\n' + x.a + '\n\n> 记录于 ' + (x.ts||'') + '\n\n';
      });
      var blob = new Blob([md], {type:'text/markdown;charset=utf-8'});
      var a2 = document.createElement('a');
      a2.href = URL.createObjectURL(blob); a2.download = '大数据课程答疑笔记.md'; a2.click();
      BD.toast('已导出 Markdown 文件','ok');
    };
    el.querySelectorAll('[data-del]').forEach(function(b){
      b.onclick = function(){
        var id = this.getAttribute('data-del');
        BD.store.set(function(s){ s.qa = s.qa.filter(function(x){ return x.id !== id; }); });
        BD.toast('已删除','ok'); paint();
      };
    });
  }
  paint();
});
})();