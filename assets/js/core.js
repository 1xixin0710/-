/* 核心：状态、存储、路由、工具、搜索 */
(function(){
'use strict';
var BD = window.BD = window.BD || {};

/* ---------- 存储（localStorage，失败则退化为内存） ---------- */
var KEY = 'bd-ta-v1';
var mem = null;
var canLS = (function(){
  try { var k='__t'; localStorage.setItem(k,'1'); localStorage.removeItem(k); return true; } catch(e){ return false; }
})();
var DEFAULTS = {
  readChapters:{}, readSections:{}, answers:{}, wrong:{}, marked:{},
  cards:{}, qa:[], plan:{ examDate:'', hoursPerWeek:'6', done:{} },
  streak:{ last:'', days:0 }, totalDays:0
};
function load(){
  if(mem) return mem;
  var raw = null;
  if(canLS){ try{ raw = localStorage.getItem(KEY); }catch(e){} }
  var st = {};
  for(var k in DEFAULTS){ st[k] = JSON.parse(JSON.stringify(DEFAULTS[k])); }
  if(raw){ try{ var p = JSON.parse(raw); for(var j in p){ if(p[j]!==undefined) st[j]=p[j]; } }catch(e){} }
  mem = st; return mem;
}
function save(){
  if(!canLS) return;
  try{ localStorage.setItem(KEY, JSON.stringify(load())); }catch(e){}
}
BD.store = {
  get: load,
  set: function(fn){ var s=load(); fn(s); save(); },
  reset: function(){ mem = JSON.parse(JSON.stringify(DEFAULTS)); save(); },
  persistent: canLS
};

/* ---------- 索引 ---------- */
BD.chById = {};
(BD.chapters||[]).forEach(function(c){ BD.chById[c.id] = c; });
BD.qById = {};
(BD.questions||[]).forEach(function(q){ BD.qById[q.id] = q; });

/* ---------- 工具 ---------- */
BD.esc = function(s){
  return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
};
BD.hash = function(s){ var h=0,i; s=String(s); for(i=0;i<s.length;i++){ h=((h<<5)-h+s.charCodeAt(i))|0; } return Math.abs(h); };
BD.today = function(){ var d=new Date(); return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); };
BD.daysBetween = function(a,b){
  if(!a||!b) return 0;
  return Math.round((new Date(b+'T00:00:00') - new Date(a+'T00:00:00'))/86400000);
};
BD.slug = function(s){ return String(s).replace(/[^\u4e00-\u9fa5a-zA-Z0-9]+/g,'-'); };

BD.toast = function(msg, kind){
  var t = document.getElementById('toast');
  if(!t) return;
  t.textContent = msg;
  t.className = 'toast on' + (kind? ' '+kind : '');
  clearTimeout(BD._tt);
  BD._tt = setTimeout(function(){ t.className = 'toast' + (kind? ' '+kind : ''); }, 1900);
};
BD.modal = function(html, title){
  var m = document.getElementById('modal'), s = document.getElementById('scrim'), b = document.getElementById('modalBox');
  b.innerHTML = '<div class="modal-head"><h3>'+BD.esc(title||'')+'</h3><button class="x-btn" id="modalX">&times;</button></div>' + html;
  m.hidden = false; setTimeout(function(){ s.classList.add('on'); }, 10);
  document.getElementById('modalX').onclick = BD.closeModal;
  s.onclick = BD.closeModal;
};
BD.closeModal = function(){
  var m = document.getElementById('modal'), s = document.getElementById('scrim');
  if(!m) return;
  m.hidden = true; s.classList.remove('on'); s.onclick = null;
};
document.addEventListener('keydown', function(e){ if(e.key==='Escape') BD.closeModal(); });

/* ---------- 进度与统计 ---------- */
BD.stats = {
  chapter: function(id){
    var st = BD.store.get(), ch = BD.chById[id];
    if(!ch) return {read:0, total:1, pct:0, answered:0, qTotal:0, correct:0, acc:0};
    var total = ch.sections.length;
    var read = 0;
    ch.sections.forEach(function(_,i){ if(st.readSections[id+':'+i]) read++; });
    var qs = (BD.questions||[]).filter(function(q){ return q.ch===id; });
    var answered = 0, correct = 0;
    qs.forEach(function(q){ var a = st.answers[q.id]; if(a){ answered++; if(a.ok) correct++; } });
    return {
      read:read, total:total, pct: total? Math.round(read/total*100):0,
      answered:answered, qTotal:qs.length, correct:correct,
      acc: answered? Math.round(correct/answered*100):0
    };
  },
  overall: function(){
    var st = BD.store.get(), secTotal=0, secRead=0, qs = BD.questions||[], ans=0, ok=0;
    (BD.chapters||[]).forEach(function(ch){
      secTotal += ch.sections.length;
      ch.sections.forEach(function(_,i){ if(st.readSections[ch.id+':'+i]) secRead++; });
    });
    qs.forEach(function(q){ var a=st.answers[q.id]; if(a){ ans++; if(a.ok) ok++; } });
    var wrongN = Object.keys(st.wrong).length;
    var cardN = Object.keys(st.cards).length, cardTotal = (BD.glossary||[]).length;
    return {
      secRead:secRead, secTotal:secTotal, secPct: secTotal? Math.round(secRead/secTotal*100):0,
      answered:ans, qTotal:qs.length, correct:ok,
      acc: ans? Math.round(ok/ans*100):0,
      wrong:wrongN, cardMastered:cardN, cardTotal:cardTotal,
      streak: st.streak.days||0,
      progress: Math.round((secRead/secTotal*0.4 + ans/qs.length*0.6)*100) || 0
    };
  },
  byChapterAccuracy: function(){
    var st = BD.store.get(), out = {};
    (BD.chapters||[]).forEach(function(ch){
      var qs = (BD.questions||[]).filter(function(q){ return q.ch===ch.id; });
      var a=0, ok=0;
      qs.forEach(function(q){ var x = st.answers[q.id]; if(x){ a++; if(x.ok) ok++; } });
      out[ch.id] = { answered:a, total:qs.length, acc: a? Math.round(ok/a*100):null };
    });
    return out;
  }
};

/* ---------- 答题记录 ---------- */
BD.record = function(q, ok, sel){
  BD.store.set(function(st){
    st.answers[q.id] = { ok:!!ok, sel:sel||[], ts:Date.now() };
    if(ok){
      if(st.wrong[q.id]){
        st.wrong[q.id].fixed = (st.wrong[q.id].fixed||0)+1;
        if(st.wrong[q.id].fixed >= 1) delete st.wrong[q.id];
      }
    } else {
      var w = st.wrong[q.id] || { count:0, fixed:0, ts:0 };
      w.count++; w.ts = Date.now(); st.wrong[q.id] = w;
    }
    var t = BD.today();
    if(st.streak.last !== t){
      st.streak.days = (BD.daysBetween(st.streak.last, t) === 1) ? (st.streak.days||0)+1 : 1;
      st.streak.last = t;
      st.totalDays = (st.totalDays||0)+1;
    }
  });
  BD.renderChrome();
};

/* ---------- 判分 ---------- */
BD.norm = function(s){
  return String(s==null?'':s).trim().toLowerCase()
    .replace(/[\s，。；、,.;:：！？!?"'（）()【】\[\]]/g,'');
};
BD.gradeBlank = function(q, val){
  var v = BD.norm(val);
  if(!v) return false;
  var alts = Array.isArray(q.a)? q.a : [q.a];
  for(var i=0;i<alts.length;i++){
    if(BD.norm(alts[i]) === v) return true;
  }
  return false;
};
BD.sameSet = function(a,b){
  if(a.length !== b.length) return false;
  var x = a.slice().sort().join(','), y = b.slice().sort().join(',');
  return x === y;
};

/* ---------- 路由 ---------- */
BD.routes = [];
BD.route = function(pattern, handler){ BD.routes.push({p:pattern.split('/').filter(Boolean), h:handler}); };
BD.go = function(path){ if(location.hash.slice(1) === path) BD.resolve(); else location.hash = path; };
BD.resolve = function(){
  var path = location.hash.replace(/^#/,'') || '/';
  var parts = path.split('/').filter(Boolean);
  for(var i=0;i<BD.routes.length;i++){
    var r = BD.routes[i];
    if(r.p.length !== parts.length) continue;
    var params = {}, ok = true;
    for(var j=0;j<r.p.length;j++){
      if(r.p[j].charAt(0) === ':') params[r.p[j].slice(1)] = decodeURIComponent(parts[j]);
      else if(r.p[j] !== parts[j]){ ok = false; break; }
    }
    if(ok){ BD.currentRoute = path; BD.render(r.h, params); return; }
  }
  BD.go('/');
};
BD.render = function(handler, params){
  var view = document.getElementById('view');
  view.innerHTML = '';
  try{ handler(view, params||{}); }
  catch(err){ view.innerHTML = '<div class="empty"><div class="big">!</div><p>页面渲染出错：'+BD.esc(err.message)+'</p></div>'; }
  window.scrollTo(0,0);
  BD.renderChrome();
};

/* ---------- 导航渲染 ---------- */
BD.navDef = [
  {group:'学', items:[
    {label:'学习看板', path:'/', ico:'◎'},
    {label:'知识思维导图', path:'/mindmap', ico:'⌘'},
    {label:'章节精讲', path:'/chapters', ico:'▤', badge:function(){ return (BD.chapters||[]).length; }},
    {label:'概念速记卡', path:'/cards', ico:'❐'},
    {label:'公式速查', path:'/formulas', ico:'∑'}
  ]},
  {group:'练', items:[
    {label:'随堂练习', path:'/practice', ico:'✎', badge:function(){ return (BD.questions||[]).length; }},
    {label:'模拟考试', path:'/exam', ico:'⏱'},
    {label:'错题本', path:'/wrong', ico:'⚑', badge:function(){ return Object.keys(BD.store.get().wrong).length || ''; }},
    {label:'学习进度', path:'/progress', ico:'▦'}
  ]},
  {group:'用', items:[
    {label:'商业案例库', path:'/cases', ico:'◆', badge:function(){ return (BD.cases||[]).length; }},
    {label:'算法实验室', path:'/lab', ico:'⚗'},
    {label:'学习计划', path:'/plan', ico:'▧'}
  ]},
  {group:'找', items:[
    {label:'答疑板', path:'/qa', ico:'✉'}
  ]}
];
BD.renderNav = function(){
  var nav = document.getElementById('nav');
  if(!nav) return;
  var cur = location.hash.replace(/^#/,'') || '/';
  var html = '';
  BD.navDef.forEach(function(g){
    html += '<div class="nav-group">'+BD.esc(g.group)+'</div>';
    g.items.forEach(function(it){
      var active = (it.path === '/' ? (cur==='/'||cur==='') : cur.indexOf(it.path)===0);
      var b = it.badge? it.badge() : '';
      html += '<a class="nav-item'+(active?' active':'')+'" href="#'+it.path+'">'
        + '<span class="ico">'+it.ico+'</span><span>'+BD.esc(it.label)+'</span>'
        + (b? '<span class="badge">'+b+'</span>' : '') + '</a>';
    });
  });
  nav.innerHTML = html;
};
BD.renderChrome = function(){
  BD.renderNav();
  var s = BD.stats.overall();
  var pill = document.getElementById('progressPill');
  if(pill) pill.textContent = '学习进度 ' + s.progress + '%';
  var st = document.getElementById('sideStreak');
  if(st) st.innerHTML = '连续学习 <b>'+(s.streak||0)+'</b> 天 · 已答 <b>'+s.answered+'</b>/'+s.qTotal+' 题';
};

/* ---------- 进度条组件 ---------- */
BD.bar = function(pct, thin){
  return '<div class="bar'+(thin?' thin':'')+'"><i style="width:'+Math.max(0,Math.min(100,pct||0))+'%"></i></div>';
};

/* ---------- 全局搜索 ---------- */
BD.searchIndex = null;
BD.buildIndex = function(){
  if(BD.searchIndex) return BD.searchIndex;
  var idx = [];
  (BD.chapters||[]).forEach(function(ch){
    idx.push({type:'章节', title:'第'+ch.no+'章 '+ch.title, sub:ch.intro, hash:'#/chapter/'+ch.id, key:(ch.title+' '+ch.intro+' '+(ch.tags||[]).join(' '))});
    ch.sections.forEach(function(s,i){
      var txt = (s.ps||[]).join(' ')+' '+(s.list||[]).join(' ');
      idx.push({type:'章节', title:'第'+ch.no+'章 · '+s.h, sub:txt.slice(0,90), hash:'#/chapter/'+ch.id, key:s.h+' '+txt});
    });
    (ch.key||[]).forEach(function(k){
      idx.push({type:'要点', title:k.t, sub:k.d, hash:'#/chapter/'+ch.id, key:k.t+' '+k.d});
    });
  });
  (BD.questions||[]).forEach(function(q){
    idx.push({type:'题目', title:q.q.slice(0,60), sub:'知识点：'+q.kp+'（第'+((BD.chById[q.ch]||{}).no||'综')+'章）', hash:'#/practice?q='+q.id, key:q.q+' '+q.kp+' '+(q.o||[]).join(' ')});
  });
  (BD.glossary||[]).forEach(function(g){
    idx.push({type:'术语', title:g.t+(g.en? ' · '+g.en : ''), sub:g.d, hash:'#/cards?t='+encodeURIComponent(g.t), key:g.t+' '+g.en+' '+g.d+' '+g.memo});
  });
  (BD.cases||[]).forEach(function(c){
    idx.push({type:'案例', title:c.title, sub:c.scene.slice(0,90), hash:'#/case/'+c.id, key:c.title+' '+c.ind+' '+c.scene+' '+(c.takeaways||[]).join(' ')});
  });
  (BD.formulas||[]).forEach(function(f){
    idx.push({type:'公式', title:f.nm, sub:f.cat+' · '+f.note, hash:'#/formulas?f='+encodeURIComponent(f.nm), key:f.nm+' '+f.cat+' '+f.note});
  });
  BD.searchIndex = idx;
  return idx;
};
BD.search = function(q){
  var qq = String(q||'').trim().toLowerCase();
  if(!qq) return [];
  var idx = BD.buildIndex(), out = [];
  for(var i=0;i<idx.length;i++){
    var it = idx[i], key = (it.key||'').toLowerCase(), pos = key.indexOf(qq);
    if(pos >= 0){
      var score = it.title.toLowerCase().indexOf(qq) >= 0 ? 0 : 1;
      out.push({it:it, score:score});
    }
  }
  out.sort(function(a,b){ return a.score - b.score; });
  return out.slice(0,24).map(function(x){ return x.it; });
};
})();