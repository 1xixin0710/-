/* 视图：学习看板 / 章节精讲 */
(function(){
'use strict';
var BD = window.BD;

/* ================= 学习看板 ================= */
BD.route('/', function(el){
  var st = BD.store.get(), s = BD.stats.overall(), acc = BD.stats.byChapterAccuracy();
  var daysLeft = '';
  if(st.plan.examDate){
    var d = BD.daysBetween(BD.today(), st.plan.examDate);
    daysLeft = d >= 0 ? '距考试还有 <b>'+d+'</b> 天' : '考试日期已过';
  }
  var html = ''
  + '<div class="page-head"><h1>大数据分析原理与实践 · 课程助教</h1>'
  + '<div class="sub">面向商学院同学的一站式学习台 · 共 '+(BD.chapters||[]).length+' 章 · '+(BD.questions||[]).length+' 道题 · '+(BD.glossary||[]).length+' 个术语 · '+(BD.cases||[]).length+' 个商业案例</div></div>';

  if(!BD.store.persistent){
    html += '<div class="note warn" style="margin-bottom:16px">当前浏览器的本地存储不可用，学习记录在关闭页面后不会保留。建议通过本地服务器访问，或改用 Chrome / Edge 打开。</div>';
  }

  html += '<div class="grid g4">'
    + statCard('已完成章节内容', s.secRead+'<small>/'+s.secTotal+'</small>', '占全书 '+s.secPct+'%')
    + statCard('已答题目', s.answered+'<small>/'+s.qTotal+'</small>', '正确率 '+(s.answered? s.acc+'%' : '—'))
    + statCard('错题待复习', String(s.wrong), s.wrong? '建议优先清理' : '暂时没有错题')
    + statCard('连续学习', s.streak+'<small>天</small>', daysLeft || '设定考试日期可倒排计划')
    + '</div>';

  html += '<div class="card" style="margin-top:16px"><div class="sect-title">总体进度</div>'
    + BD.bar(s.progress)
    + '<div class="small muted" style="margin-top:8px">进度按「章节内容完成 40% + 答题完成 60%」加权计算。当前 '+s.progress+'%。</div></div>';

  html += '<div class="grid g2" style="margin-top:16px">';
  html += '<div class="card"><div class="sect-title">继续学习</div>'
    + '<div class="kv"><dt>下一站</dt><dd>'+nextStep()+'</dd></div>'
    + '<div class="btn-row" style="margin-top:14px">'
    + '<a class="btn primary" href="#/chapters">进入章节精讲</a>'
    + '<a class="btn" href="#/practice">随堂练习</a>'
    + '<a class="btn" href="#/mindmap">看思维导图</a>'
    + '</div></div>';

  var weak = Object.keys(acc).map(function(k){ return {id:k, v:acc[k]}; })
    .filter(function(x){ return x.v.answered >= 3; })
    .sort(function(a,b){ return a.v.acc - b.v.acc; }).slice(0,4);
  html += '<div class="card"><div class="sect-title">薄弱章节</div>';
  if(!weak.length){
    html += '<div class="muted small">还没有足够的答题记录。答完每章至少 3 道题后，这里会显示正确率最低的章节。</div>';
  } else {
    weak.forEach(function(x){
      var ch = BD.chById[x.id];
      html += '<div class="kp-row"><div class="kp-term">第'+ch.no+'章 '+BD.esc(ch.title.slice(0,8))+'</div>'
        + '<div class="kp-def" style="display:flex;align-items:center;gap:10px">'
        + '<div style="flex:1">'+BD.bar(x.v.acc, true)+'</div>'
        + '<span class="mono" style="color:var(--red);font-weight:700">'+x.v.acc+'%</span>'
        + '<a class="small" href="#/practice?ch='+ch.id+'">去练</a></div></div>';
    });
  }
  html += '</div></div>';

  html += '<div class="card" style="margin-top:16px"><div class="sect-title">全书章节进度</div>';
  (BD.chapters||[]).forEach(function(ch){
    var c = BD.stats.chapter(ch.id);
    html += '<div class="kp-row" style="cursor:pointer" onclick="location.hash=\'#/chapter/'+ch.id+'\'">'
      + '<div class="kp-term">第'+ch.no+'章</div>'
      + '<div class="kp-def"><div style="margin-bottom:4px">'+BD.esc(ch.title)+'</div>'
      + '<div style="display:flex;align-items:center;gap:12px"><div style="flex:1">'+BD.bar(c.pct, true)+'</div>'
      + '<span class="small muted" style="white-space:nowrap">内容 '+c.pct+'% · 题 '+c.answered+'/'+c.qTotal+'</span></div></div></div>';
  });
  html += '</div>';

  el.innerHTML = html;
});

function statCard(lab, val, foot){
  return '<div class="stat"><div class="lab">'+BD.esc(lab)+'</div><div class="val">'+val+'</div>'
    + '<div class="small muted">'+BD.esc(foot)+'</div></div>';
}
function nextStep(){
  var st = BD.store.get();
  for(var i=0;i<(BD.chapters||[]).length;i++){
    var ch = BD.chapters[i], c = BD.stats.chapter(ch.id);
    if(c.pct < 100) return '第'+ch.no+'章《'+BD.esc(ch.title)+'》尚未读完（已完成 '+c.pct+'%）';
  }
  var s = BD.stats.overall();
  if(s.answered < s.qTotal) return '章节内容已全部读完，还剩 '+(s.qTotal-s.answered)+' 道题没做';
  if(s.wrong) return '错题本还有 '+s.wrong+' 道题待复习';
  return '全部完成，可以去算法实验室动手跑一遍模型，或复习商业案例。';
}

/* ================= 章节列表 ================= */
BD.route('/chapters', function(el){
  var html = '<div class="page-head"><h1>章节精讲</h1><div class="sub">按教材知识体系组织，每章含学习目标、核心概念、重点难点与商业视角解读</div></div><div class="ch-list">';
  (BD.chapters||[]).forEach(function(ch){
    var c = BD.stats.chapter(ch.id);
    html += '<div class="ch-card" onclick="location.hash=\'#/chapter/'+ch.id+'\'">'
      + '<div class="ch-no">'+ch.no+'</div>'
      + '<div class="ch-body"><h3>'+BD.esc(ch.title)+'</h3><p>'+BD.esc(ch.intro)+'</p>'
      + '<div class="ch-meta">'+(ch.tags||[]).map(function(t){ return '<span class="chip tone-a">'+BD.esc(t)+'</span>'; }).join('')
      + '<span>题目 '+c.answered+'/'+c.qTotal+(c.answered? ' · 正确率 '+c.acc+'%' : '')+'</span></div></div>'
      + '<div class="ch-side"><div class="pct">'+c.pct+'%</div>'+BD.bar(c.pct, true)+'</div></div>';
  });
  html += '</div>';
  el.innerHTML = html;
});

/* ================= 章节详情 ================= */
BD.route('/chapter/:id', function(el, p){
  var ch = BD.chById[p.id];
  if(!ch){ el.innerHTML = '<div class="empty"><div class="big">?</div><p>未找到该章节</p></div>'; return; }
  var st = BD.store.get(), c = BD.stats.chapter(ch.id);
  var idx = BD.chapters.indexOf(ch);
  var prev = BD.chapters[idx-1], next = BD.chapters[idx+1];

  var html = '<div class="crumb"><a href="#/chapters">章节精讲</a> / 第'+ch.no+'章</div>'
    + '<div class="page-head"><h1>第'+ch.no+'章　'+BD.esc(ch.title)+'</h1>'
    + '<div class="sub">'+BD.esc(ch.intro)+'</div></div>';

  html += '<div class="card"><div class="btn-row" style="justify-content:space-between">'
    + '<div class="chips">'+(ch.tags||[]).map(function(t){ return '<span class="chip tone-a">'+BD.esc(t)+'</span>'; }).join('')+'</div>'
    + '<div class="btn-row">'
    + '<button class="btn sm" id="readAll">全部标记已读</button>'
    + '<a class="btn sm" href="#/practice?ch='+ch.id+'">做本章练习</a>'
    + '<a class="btn sm" href="#/mindmap">看导图</a>'
    + '</div></div>'
    + '<div style="margin-top:12px;display:flex;align-items:center;gap:12px">'
    + '<div style="flex:1">'+BD.bar(c.pct)+'</div><span class="small muted">内容完成 '+c.read+'/'+c.total+'</span></div></div>';

  html += '<div class="card"><div class="sect-title">学习目标</div><ul style="margin:0;padding-left:20px">';
  (ch.goals||[]).forEach(function(g){ html += '<li style="margin-bottom:6px">'+BD.esc(g)+'</li>'; });
  html += '</ul></div>';

  html += '<div class="card"><div class="sect-title">核心内容</div>';
  ch.sections.forEach(function(s, i){
    var done = !!st.readSections[ch.id+':'+i];
    html += '<div class="sec" data-sec="'+i+'">'
      + '<h4 style="display:flex;align-items:center;gap:9px">'
      + '<input type="checkbox" class="secread" data-i="'+i+'" '+(done?'checked':'')+' style="accent-color:var(--accent);cursor:pointer;width:15px;height:15px">'
      + '<span>'+BD.esc(s.h)+'</span></h4>';
    (s.ps||[]).forEach(function(t){ html += '<p style="font-size:13.5px;color:var(--ink2);margin-bottom:9px">'+BD.esc(t)+'</p>'; });
    if(s.list && s.list.length){
      html += '<ul>';
      s.list.forEach(function(t){ html += '<li>'+t+'</li>'; });
      html += '</ul>';
    }
    html += '</div>';
  });
  html += '</div>';

  html += '<div class="grid g2" style="margin-top:16px">';
  html += '<div class="card"><div class="sect-title">核心概念</div>';
  (ch.key||[]).forEach(function(k){
    html += '<div class="kp-row"><div class="kp-term">'+BD.esc(k.t)+'</div><div class="kp-def">'+BD.esc(k.d)+'</div></div>';
  });
  html += '</div>';
  html += '<div class="card"><div class="sect-title">易错点</div>';
  (ch.pitfalls||[]).forEach(function(t){
    html += '<div class="note bad" style="margin-bottom:9px">'+BD.esc(t)+'</div>';
  });
  html += '</div></div>';

  html += '<div class="card" style="margin-top:16px"><div class="sect-title">商学视角</div>'
    + '<div class="note">'+BD.esc(ch.business)+'</div>'
    + '<div class="sect-title" style="margin-top:18px">常用工具</div><div class="chips">'
    + (ch.tools||[]).map(function(t){ return '<span class="chip">'+BD.esc(t)+'</span>'; }).join('') + '</div></div>';

  html += '<div class="card" style="margin-top:16px"><div class="sect-title">本章知识结构</div>'
    + '<div id="chMini" class="mm-wrap" style="border:0;box-shadow:none"><div class="mm-canvas" style="height:380px"></div></div></div>';

  html += '<div class="chapter-nav">'
    + (prev? '<a class="btn" href="#/chapter/'+prev.id+'">← 第'+prev.no+'章 '+BD.esc(prev.title.slice(0,10))+'</a>' : '<span></span>')
    + (next? '<a class="btn" href="#/chapter/'+next.id+'">第'+next.no+'章 '+BD.esc(next.title.slice(0,10))+' →</a>' : '<span></span>')
    + '</div>';

  el.innerHTML = html;

  el.querySelectorAll('.secread').forEach(function(cb){
    cb.onchange = function(){
      var i = this.getAttribute('data-i');
      BD.store.set(function(s){ if(this.checked) s.readSections[ch.id+':'+i]=true; else delete s.readSections[ch.id+':'+i]; }.bind(this));
      var c2 = BD.stats.chapter(ch.id);
      el.querySelector('.bar > i').style.width = c2.pct+'%';
      BD.renderChrome();
    };
  });
  var ra = document.getElementById('readAll');
  if(ra) ra.onclick = function(){
    BD.store.set(function(s){ ch.sections.forEach(function(_, i){ s.readSections[ch.id+':'+i] = true; }); });
    BD.go('/chapter/'+ch.id); BD.toast('已标记本章全部内容为已读','ok');
  };

  var tree = { t: '第'+ch.no+'章 '+ch.title, c: ch.sections.map(function(s){
    var children = (s.list || []).map(function(item){
      var text = item.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
      return { t: text.length > 26 ? text.slice(0, 26) + '…' : text };
    }).filter(function(item){ return item.t; });
    if(!children.length){
      children = (s.ps || []).map(function(item){
        var text = item.replace(/\s+/g, ' ').trim();
        return { t: text.length > 26 ? text.slice(0, 26) + '…' : text };
      }).filter(function(item){ return item.t; });
    }
    return { t: s.h.replace(/^[一二三四五六七八九十]+、/,''), c: children };
  })};
  if(BD.renderMindmap) BD.renderMindmap(el.querySelector('#chMini .mm-canvas'), tree, {height:380, collapsedDepth:1, maxScale:1.2});
});
})();