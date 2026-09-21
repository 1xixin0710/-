/* 视图：模拟考试 / 学习进度 */
(function(){
'use strict';
var BD = window.BD;
var DIFF_NAME = {1:'基础', 2:'进阶', 3:'挑战'};

/* ================= 模拟考试 ================= */
BD.route('/exam', function(el){
  var params = new URLSearchParams((location.hash.split('?')[1]||''));
  if(params.get('go') === '1'){ startExam(el, JSON.parse(sessionStorage.getItem('bd-exam-cfg')||'{}')); return; }

  el.innerHTML = '<div class="page-head"><h1>模拟考试</h1>'
    + '<div class="sub">随机组卷、限时作答、交卷后自动评分并生成成绩报告。建议在复习完 6 个章节后开始使用。</div></div>'
    + '<div class="card"><div class="sect-title">组卷设置</div>'
    + '<div class="lab-ctrl">'
    + '<div class="field"><label>题目数量</label><select id="eN"><option value="10">10 题（小测）</option><option value="20" selected>20 题（标准）</option><option value="30">30 题（完整）</option><option value="45">45 题（模考）</option></select></div>'
    + '<div class="field"><label>考试时长</label><select id="eT"><option value="10">10 分钟</option><option value="25" selected>25 分钟</option><option value="45">45 分钟</option><option value="70">70 分钟</option></select></div>'
    + '<div class="field"><label>章节范围</label><select id="eC"><option value="">全部章节</option>'
    + (BD.chapters||[]).map(function(c){ return '<option value="'+c.id+'">第'+c.no+'章 '+BD.esc(c.title)+'</option>'; }).join('')
    + '</select></div>'
    + '<div class="field"><label>是否包含简答题</label><select id="eS"><option value="0" selected>不包含（客观题为主）</option><option value="1">包含（自评给分）</option></select></div>'
    + '</div>'
    + '<div class="note">组卷规则：优先从所选范围随机抽题，题型按单选 45%、多选 20%、判断 20%、填空 15% 的比例分配（含简答时相应调整）。交卷后主观题由你自评。</div>'
    + '<div class="btn-row" style="margin-top:16px"><button class="btn primary" id="startExam">开始考试</button>'
    + '<a class="btn" href="#/practice">先去练习</a></div></div>'
    + '<div class="card" style="margin-top:16px"><div class="sect-title">考试说明</div><ul style="margin:0;padding-left:20px;color:var(--ink2);font-size:13.5px">'
    + '<li>倒计时结束后自动交卷。</li><li>答题卡可以快速跳转到任意题目，标记的题目会显示为橙色。</li>'
    + '<li>交卷前不会显示答案与解析。</li><li>成绩与错题会自动记入学习进度和错题本。</li></ul></div>';

  document.getElementById('startExam').onclick = function(){
    var cfg = {
      n: Number(document.getElementById('eN').value),
      minutes: Number(document.getElementById('eT').value),
      ch: document.getElementById('eC').value,
      withShort: document.getElementById('eS').value === '1'
    };
    sessionStorage.setItem('bd-exam-cfg', JSON.stringify(cfg));
    location.hash = '/exam?go=1';
    BD.resolve();
  };
});

function pickQuestions(cfg){
  var pool = (BD.questions||[]).filter(function(q){
    if(q.ch === 'all') return false;
    if(cfg.ch && q.ch !== cfg.ch) return false;
    if(!cfg.withShort && q.type === 'short') return false;
    return true;
  });
  var byType = {single:[], multi:[], judge:[], blank:[], short:[]};
  pool.forEach(function(q){ (byType[q.type] || byType.single).push(q); });
  Object.keys(byType).forEach(function(k){
    byType[k].forEach(function(q){ q._r = BD.hash(q.id + Date.now()) ; });
    byType[k].sort(function(a,b){ return a._r - b._r; });
  });
  var mix = cfg.withShort
    ? [['single',0.40],['multi',0.18],['judge',0.17],['blank',0.13],['short',0.12]]
    : [['single',0.45],['multi',0.20],['judge',0.20],['blank',0.15]];
  var out = [];
  mix.forEach(function(p){
    var want = Math.round(cfg.n * p[1]);
    out = out.concat(byType[p[0]].slice(0, want));
  });
  var seen = {};
  out = out.filter(function(q){ if(seen[q.id]) return false; seen[q.id] = true; return true; });
  if(out.length < cfg.n){
    var rest = pool.filter(function(q){ return !seen[q.id]; });
    rest.sort(function(a,b){ return BD.hash(a.id) - BD.hash(b.id); });
    out = out.concat(rest.slice(0, cfg.n - out.length));
  }
  out = out.slice(0, cfg.n);
  out.sort(function(a,b){ return (BD.chById[a.ch]||{no:99}).no - (BD.chById[b.ch]||{no:99}).no || a.diff - b.diff; });
  return out;
}

function startExam(el, cfg){
  if(!cfg || !cfg.n){ BD.go('/exam'); return; }
  var qs = pickQuestions(cfg);
  if(!qs.length){ el.innerHTML = '<div class="empty"><div class="big">◍</div><p>所选范围没有可用题目</p></div>'; return; }
  var answers = {};
  var marked = {};
  var left = cfg.minutes * 60;
  var timerId = null;
  var submitted = false;

  el.innerHTML = '<div class="exam-bar">'
    + '<div><div class="small muted">剩余时间</div><div class="timer" id="tClock">--:--</div></div>'
    + '<div><div class="small muted">答题卡</div><div class="palette" id="palette"></div></div>'
    + '<div style="margin-left:auto" class="btn-row">'
    + '<span class="small muted" id="eProg"></span>'
    + '<button class="btn sm primary" id="submitExam">交卷</button></div></div>'
    + '<div id="examList"></div>';

  var list = document.getElementById('examList');
  qs.forEach(function(q, i){
    var card = BD.qcard(q, i+1, { exam:true, onAnswer: function(qq, ok, sel){
      if(submitted){ BD.record(qq, ok, sel); BD.renderChrome(); return; }
      answers[qq.id] = sel;
    }});
    var wrap = document.createElement('div');
    wrap.style.marginBottom = '16px';
    wrap.appendChild(card);
    var bar = document.createElement('div');
    bar.className = 'btn-row';
    bar.style.marginTop = '-14px';
    var mk = document.createElement('button');
    mk.className = 'btn sm';
    mk.textContent = '标记本题';
    mk.onclick = function(){
      if(marked[q.id]){ delete marked[q.id]; mk.textContent = '标记本题'; mk.classList.remove('primary'); }
      else { marked[q.id] = true; mk.textContent = '已标记'; mk.classList.add('primary'); }
      paintPalette();
    };
    bar.appendChild(mk);
    var to = document.createElement('span');
    to.className = 'small muted';
    to.textContent = '第'+((BD.chById[q.ch]||{no:'综'}).no)+'章 · '+DIFF_NAME[q.diff];
    bar.appendChild(to);
    wrap.appendChild(bar);
    list.appendChild(wrap);
    card._q = q;
  });

  function paintPalette(){
    var p = document.getElementById('palette');
    p.innerHTML = qs.map(function(q, i){
      var c = document.querySelectorAll('.qcard')[i];
      var done = c ? !!c.querySelector('.opt.sel') || (c.querySelector('.blank-in') && c.querySelector('.blank-in').value.trim()) : false;
      return '<button class="pal'+(done?' done':'')+(marked[q.id]?' mark':'')+'" data-i="'+i+'">'+(i+1)+'</button>';
    }).join('');
    p.querySelectorAll('.pal').forEach(function(b){
      b.onclick = function(){
        var card = document.querySelectorAll('.qcard')[Number(this.getAttribute('data-i'))];
        if(card) card.scrollIntoView({behavior:'smooth', block:'center'});
      };
    });
    var doneN = Object.keys(answers).length;
    document.getElementById('eProg').textContent = '已作答 ' + doneN + ' / ' + qs.length;
  }

  function tick(){
    left--;
    var m = Math.floor(left/60), s = left % 60;
    var t = document.getElementById('tClock');
    if(!t) return;
    t.textContent = (m<10?'0':'')+m + ':' + (s<10?'0':'')+s;
    t.className = 'timer' + (left <= 60? ' low' : '');
    if(left <= 0){ clearInterval(timerId); BD.toast('时间到，自动交卷','no'); doSubmit(); }
  }
  timerId = setInterval(tick, 1000);
  document.getElementById('tClock').textContent = (cfg.minutes<10?'0':'')+cfg.minutes+':00';
  paintPalette();
  document.addEventListener('click', paintPalette);

  document.getElementById('submitExam').onclick = function(){
    var unanswered = qs.length - Object.keys(answers).length;
    BD.modal('<p>你还有 <b>'+unanswered+'</b> 道题未作答（或未提交多选/填空）。确定要交卷吗？</p>'
      + '<div class="btn-row" style="margin-top:14px"><button class="btn" id="sc">继续答题</button>'
      + '<button class="btn primary" id="sy">确定交卷</button></div>', '确认交卷');
    document.getElementById('sc').onclick = BD.closeModal;
    document.getElementById('sy').onclick = function(){ BD.closeModal(); doSubmit(); };
  };

  function doSubmit(){
    if(submitted) return;
    submitted = true;
    clearInterval(timerId);
    document.removeEventListener('click', paintPalette);

    var correct = 0, wrongN = 0, byType = {}, byCh = {};
    qs.forEach(function(q, i){
      var card = document.querySelectorAll('.qcard')[i];
      if(card.forceGrade) card.forceGrade();
      var a = BD.store.get().answers[q.id];
      var ok = a? !!a.ok : false;
      if(ok) correct++; else wrongN++;
      var tn = q.type;
      byType[tn] = byType[tn] || {ok:0, n:0}; byType[tn].n++; if(ok) byType[tn].ok++;
      var cn = q.ch;
      byCh[cn] = byCh[cn] || {ok:0, n:0}; byCh[cn].n++; if(ok) byCh[cn].ok++;
    });

    var objN = qs.filter(function(q){ return q.type !== 'short'; }).length;
    var objOk = qs.filter(function(q, i){ return q.type !== 'short' && (BD.store.get().answers[q.id]||{}).ok; }).length;
    var score = Math.round(objOk / Math.max(1, objN) * 100);
    var grade = score >= 90? '优秀 · 掌握扎实' : score >= 80? '良好 · 个别知识点需巩固'
      : score >= 60? '及格 · 建议重点复习薄弱章节' : '不及格 · 请回到章节精讲重新学习';

    var html = '<div class="card"><div class="score-hero">'
      + '<div class="num" style="color:'+(score>=80?'var(--green)':score>=60?'var(--amber)':'var(--red)')+'">'+score+'</div>'
      + '<div class="grade">'+grade+'</div>'
      + '<div class="small muted" style="margin-top:8px">客观题 '+objOk+'/'+objN+' 正确 · 用时 '
      + (cfg.minutes - Math.max(0, Math.floor(left/60))) + ' 分钟左右</div>'
      + '<div class="btn-row" style="justify-content:center;margin-top:18px">'
      + '<button class="btn primary" id="again">再考一次</button>'
      + '<a class="btn" href="#/wrong">查看错题本</a>'
      + '<a class="btn" href="#/progress">看学习进度</a></div></div></div>';

    html += '<div class="card"><div class="sect-title">分题型表现</div><div class="report-grid">';
    Object.keys(byType).forEach(function(t){
      var v = byType[t], nm = {single:'单选题', multi:'多选题', judge:'判断题', blank:'填空题', short:'简答题'}[t] || t;
      var pct = v.n? Math.round(v.ok/v.n*100) : 0;
      html += '<div class="rep"><div class="n">'+nm+'</div><div class="v">'+v.ok+'<span class="small muted">/'+v.n+'</span></div>'
        + BD.bar(pct, true) + '<div class="small muted" style="margin-top:4px">正确率 '+pct+'%</div></div>';
    });
    html += '</div></div>';

    var chKeys = Object.keys(byCh).sort(function(a,b){ return (BD.chById[a]||{no:99}).no - (BD.chById[b]||{no:99}).no; });
    html += '<div class="card"><div class="sect-title">分章节表现</div><div class="report-grid">';
    chKeys.forEach(function(k){
      var v = byCh[k], ch = BD.chById[k] || {no:'综', title:'综合'};
      var pct = v.n? Math.round(v.ok/v.n*100) : 0;
      html += '<div class="rep"><div class="n">第'+ch.no+'章</div><div class="v">'+pct+'<span class="small muted">%</span></div>'
        + BD.bar(pct, true) + '<div class="small muted" style="margin-top:4px">'+v.ok+'/'+v.n+' 题</div></div>';
    });
    html += '</div></div>';

    html += '<div class="card"><div class="sect-title">逐题解析</div><div class="small muted" style="margin-bottom:12px">展开后可查看每道题的正确答案、解析与易错提示。</div><div class="btn-row" style="margin-bottom:14px"><button class="btn sm primary" id="showReview">展开逐题解析</button></div><div id="reviewBox"></div></div>';
    el.innerHTML = '<div class="page-head"><h1>考试成绩报告</h1><div class="sub">答题记录已保存，答错的题已自动加入错题本。</div></div>' + html;

    document.getElementById('again').onclick = function(){ location.hash = '/exam'; BD.resolve(); };
    var sr = document.getElementById('showReview');
    if(sr) sr.onclick = function(){
      sr.remove();
      var rb = document.getElementById('reviewBox');
      qs.forEach(function(q, i){ rb.appendChild(BD.qcard(q, i+1, {})); });
      rb.querySelectorAll('.qcard').forEach(function(c){ if(c.forceGrade) c.forceGrade(); });
    };

    if(!BD.store.persistent) BD.toast('本地存储不可用，本次成绩不会保留','no');
    else BD.toast('已记录本次考试成绩','ok');
    BD.renderChrome();
  }
}

/* ================= 学习进度 ================= */
BD.route('/progress', function(el){
  var s = BD.stats.overall();
  var acc = BD.stats.byChapterAccuracy();
  var st = BD.store.get();
  var typeStat = {};
  (BD.questions||[]).forEach(function(q){
    var a = st.answers[q.id]; if(!a) return;
    typeStat[q.type] = typeStat[q.type] || {ok:0, n:0};
    typeStat[q.type].n++; if(a.ok) typeStat[q.type].ok++;
  });
  var nm = {single:'单选题', multi:'多选题', judge:'判断题', blank:'填空题', short:'简答题'};

  var html = '<div class="page-head"><h1>学习进度</h1><div class="sub">所有数据保存在本机浏览器中，不联网、不上传。</div></div>';
  html += '<div class="grid g4">'
    + '<div class="stat"><div class="lab">内容完成度</div><div class="val">'+s.secPct+'<small>%</small></div><div class="small muted">'+s.secRead+'/'+s.secTotal+' 个小节</div></div>'
    + '<div class="stat"><div class="lab">题目完成度</div><div class="val">'+Math.round(s.answered/Math.max(1,s.qTotal)*100)+'<small>%</small></div><div class="small muted">'+s.answered+'/'+s.qTotal+' 道</div></div>'
    + '<div class="stat"><div class="lab">总体正确率</div><div class="val">'+(s.answered? s.acc+'<small>%</small>':'—')+'</div><div class="small muted">答对 '+s.correct+' 道</div></div>'
    + '<div class="stat"><div class="lab">连续学习</div><div class="val">'+s.streak+'<small>天</small></div><div class="small muted">累计活跃 '+(st.totalDays||0)+' 天</div></div>'
    + '</div>';

  html += '<div class="card" style="margin-top:16px"><div class="sect-title">章节掌握情况</div>'
    + '<div class="small muted" style="margin-bottom:12px">颜色越深表示正确率越低，需要重点复习。灰色表示还没有答题记录。</div>'
    + '<div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:10px">';
  (BD.chapters||[]).forEach(function(ch){
    var v = acc[ch.id];
    var bg = 'var(--line2)', fg = 'var(--ink3)';
    if(v.acc !== null){
      if(v.acc >= 80){ bg = 'var(--green-soft)'; fg = 'var(--green)'; }
      else if(v.acc >= 60){ bg = 'var(--amber-soft)'; fg = 'var(--amber)'; }
      else { bg = 'var(--red-soft)'; fg = 'var(--red)'; }
    }
    html += '<div style="background:'+bg+';border:1px solid var(--line);border-radius:11px;padding:11px;cursor:pointer" onclick="location.hash=\'#/practice?ch='+ch.id+'\'">'
      + '<div class="small" style="font-weight:700;color:'+fg+'">第'+ch.no+'章</div>'
      + '<div style="font-size:19px;font-weight:750;color:'+fg+';font-variant-numeric:tabular-nums">'+(v.acc===null? '—' : v.acc+'%')+'</div>'
      + '<div class="small muted">'+v.answered+'/'+v.total+' 题</div></div>';
  });
  html += '</div></div>';

  html += '<div class="grid g2" style="margin-top:16px">';
  html += '<div class="card"><div class="sect-title">分题型正确率</div>';
  if(!Object.keys(typeStat).length) html += '<div class="muted small">暂无答题记录</div>';
  Object.keys(typeStat).forEach(function(t){
    var v = typeStat[t], pct = Math.round(v.ok/v.n*100);
    html += '<div style="margin-bottom:11px"><div style="display:flex;justify-content:space-between" class="small"><span>'+(nm[t]||t)+'</span><span class="mono">'+pct+'%（'+v.ok+'/'+v.n+'）</span></div>'
      + BD.bar(pct, true) + '</div>';
  });
  html += '</div>';

  html += '<div class="card"><div class="sect-title">术语卡掌握情况</div>'
    + '<div class="report-grid">'
    + '<div class="rep"><div class="n">已掌握</div><div class="v">'+Object.keys(st.cards).filter(function(k){ return st.cards[k]==='known'; }).length+'</div></div>'
    + '<div class="rep"><div class="n">模糊</div><div class="v">'+Object.keys(st.cards).filter(function(k){ return st.cards[k]==='fuzzy'; }).length+'</div></div>'
    + '<div class="rep"><div class="n">不会</div><div class="v">'+Object.keys(st.cards).filter(function(k){ return st.cards[k]==='unknown'; }).length+'</div></div>'
    + '<div class="rep"><div class="n">未标记</div><div class="v">'+(s.cardTotal - s.cardMastered)+'</div></div>'
    + '</div><div class="btn-row" style="margin-top:14px"><a class="btn" href="#/cards">去背术语卡</a></div></div>';
  html += '</div>';

  html += '<div class="card" style="margin-top:16px"><div class="sect-title">数据管理</div>'
    + '<div class="small muted" style="margin-bottom:12px">'+(BD.store.persistent? '学习数据保存在本机浏览器的本地存储中。' : '当前浏览器本地存储不可用，数据仅保存在内存中。')+'</div>'
    + '<div class="btn-row"><button class="btn" id="expData">导出学习数据</button>'
    + '<button class="btn" id="rstData" style="color:var(--red);border-color:var(--red)">清空全部数据</button></div></div>';
  el.innerHTML = html;

  document.getElementById('expData').onclick = function(){
    var blob = new Blob([JSON.stringify(BD.store.get(), null, 2)], {type:'application/json'});
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = '大数据课程学习记录.json'; a.click();
    BD.toast('已导出学习数据','ok');
  };
  document.getElementById('rstData').onclick = function(){
    BD.modal('<p>将清空全部学习记录（章节进度、答题记录、错题本、术语卡标记、答疑笔记）。此操作不可撤销。</p>'
      + '<div class="btn-row" style="margin-top:14px"><button class="btn" id="rc">取消</button>'
      + '<button class="btn primary" id="ry">确定清空</button></div>', '清空学习数据');
    document.getElementById('rc').onclick = BD.closeModal;
    document.getElementById('ry').onclick = function(){
      BD.store.reset(); BD.closeModal(); BD.toast('学习数据已清空','ok'); BD.go('/'); BD.renderChrome();
    };
  };
});
})();
