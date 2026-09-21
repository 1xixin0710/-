/* 视图：随堂练习 / 错题本；题目卡片组件 */
(function(){
'use strict';
var BD = window.BD;

var TYPE_NAME = {single:'单选题', multi:'多选题', judge:'判断题', blank:'填空题', short:'简答题'};
var DIFF_NAME = {1:'基础', 2:'进阶', 3:'挑战'};

/* ---------- 题目卡片组件 ---------- */
BD.qcard = function(q, num, opts){
  opts = opts || {};
  var box = document.createElement('div');
  box.className = 'qcard' + (opts.compact? '' : '');
  var ch = BD.chById[q.ch] || {no:'综合', title:'综合应用'};
  var sel = [];
  var answered = false;
  var examMode = !!opts.exam;

  var head = '<div class="qhead">'
    + '<span class="qidx">'+(num||'')+'</span>'
    + '<span class="chip tone-a">'+TYPE_NAME[q.type]+'</span>'
    + '<span class="chip tone-'+(q.diff===3?'r':q.diff===2?'w':'g')+'">'+DIFF_NAME[q.diff]+'</span>'
    + '<span class="small muted">第'+ch.no+'章 · '+BD.esc(q.kp)+'</span>'
    + (opts.exam? '<span class="small muted" style="margin-left:auto" id="mm'+(num)+'"></span>' : '')
    + '</div>';
  var body = '<div class="qstem">'+BD.esc(q.q)+'</div>';

  if(q.type === 'single' || q.type === 'multi' || q.type === 'judge'){
    var optsHtml = '';
    (q.o||[]).forEach(function(t, i){
      var key = q.type === 'judge' ? (i===0?'对':'错') : String.fromCharCode(65+i);
      optsHtml += '<div class="opt" data-i="'+i+'"><span class="key">'+key+'</span><span>'+BD.esc(t)+'</span></div>';
    });
    body += '<div class="opts">'+optsHtml+'</div>';
  } else if(q.type === 'blank'){
    body += '<input class="blank-in" type="text" placeholder="请输入答案">';
  } else {
    body += '<textarea class="blank-in" placeholder="请输入你的作答要点，写完后查看参考答案自评"></textarea>';
  }

  box.innerHTML = head + body + '<div class="qfoot" style="margin-top:13px"></div>';
  var foot = box.querySelector('.qfoot');

  function markOpts(){
    var right = q.a || [];
    box.querySelectorAll('.opt').forEach(function(o){
      var i = Number(o.getAttribute('data-i'));
      o.classList.add('lock');
      o.classList.remove('sel');
      if(right.indexOf(i) >= 0) o.classList.add('right');
      else if(sel.indexOf(i) >= 0) o.classList.add('wrong');
    });
  }
  function solutionHtml(ok, userAns){
    var right = (q.a||[]).map(function(i){
      if(q.type === 'judge') return i===0? '正确':'错误';
      if(q.type === 'blank' || q.type === 'short') return q.a[i] !== undefined ? q.a[i] : '';
      return String.fromCharCode(65+i)+'. '+(q.o[i]||'');
    }).filter(Boolean).join('　');
    var h = '<div class="sol">';
    if(ok !== null && ok !== undefined){
      h += '<div class="verdict '+(ok?'ok':'no')+'">'+(ok? '✓ 回答正确' : '✗ 回答错误')+'</div>';
    }
    if(q.type === 'judge') h += '<div><span class="lb">正确答案：</span>'+BD.esc((q.a||[])[0]===0?'正确':'错误')+'</div>';
    else if(q.type === 'blank') h += '<div><span class="lb">参考答案：</span>'+BD.esc((q.a||[]).join(' 或 '))+'</div>';
    else if(q.type === 'short') h += '<div><span class="lb">参考答案要点：</span><div style="margin-top:6px;white-space:pre-wrap">'+BD.esc(q.ref||'')+'</div></div>';
    else h += '<div><span class="lb">正确答案：</span>'+BD.esc(right)+'</div>';
    if(q.ex) h += '<div style="margin-top:8px"><span class="lb">解析：</span>'+BD.esc(q.ex)+'</div>';
    if(q.tip) h += '<div class="note warn" style="margin-top:9px;font-size:12.5px"><b>易错提示：</b>'+BD.esc(q.tip)+'</div>';
    h += '</div>';
    return h;
  }

  function lockAndShow(ok, userText){
    if(box.querySelector('.sol')) return;
    answered = true;
    if(q.type === 'single' || q.type === 'multi' || q.type === 'judge') markOpts();
    else box.querySelector('.blank-in').setAttribute('readonly','readonly');
    foot.insertAdjacentHTML('beforeend', solutionHtml(ok));
    foot.querySelectorAll('.btn').forEach(function(b){ b.remove(); });
    if(opts.onAnswer) opts.onAnswer(q, ok, sel);
  }

  if(q.type === 'single' || q.type === 'judge'){
    box.querySelectorAll('.opt').forEach(function(o){
      o.onclick = function(){
        if(answered) return;
        sel = [Number(o.getAttribute('data-i'))];
        box.querySelectorAll('.opt').forEach(function(x){ x.classList.remove('sel'); });
        o.classList.add('sel');
        if(!examMode){
          var ok = sel[0] === (q.a||[])[0];
          lockAndShow(ok);
        }
      };
    });
  } else if(q.type === 'multi'){
    box.querySelectorAll('.opt').forEach(function(o){
      o.onclick = function(){
        if(answered) return;
        var i = Number(o.getAttribute('data-i'));
        var p = sel.indexOf(i);
        if(p >= 0){ sel.splice(p,1); o.classList.remove('sel'); }
        else { sel.push(i); o.classList.add('sel'); }
        var sub = foot.querySelector('.submit-multi');
        if(!sub && !examMode){
          foot.insertAdjacentHTML('afterbegin', '<button class="btn sm primary submit-multi">提交答案</button>');
          foot.querySelector('.submit-multi').onclick = function(){
            if(!sel.length){ BD.toast('请至少选择一个选项','no'); return; }
            lockAndShow(BD.sameSet(sel, q.a||[]), null);
          };
        }
      };
    });
  } else {
    var getVal = function(){ return box.querySelector('.blank-in').value; };
    if(q.type === 'blank'){
      foot.insertAdjacentHTML('afterbegin', '<button class="btn sm primary do-submit">提交答案</button>');
      foot.querySelector('.do-submit').onclick = function(){
        if(!getVal().trim()){ BD.toast('请先填写答案','no'); return; }
        lockAndShow(BD.gradeBlank(q, getVal()), getVal());
      };
    } else {
      foot.insertAdjacentHTML('afterbegin', '<button class="btn sm do-submit">查看参考答案</button>');
      foot.querySelector('.do-submit').onclick = function(){
        if(!getVal().trim()){ BD.toast('建议先写出你的作答','no'); return; }
        answered = true;
        box.querySelector('.blank-in').setAttribute('readonly','readonly');
        foot.insertAdjacentHTML('beforeend', solutionHtml(null));
        foot.querySelector('.do-submit').remove();
        foot.insertAdjacentHTML('beforeend',
          '<div class="btn-row" style="margin-top:11px">'
          + '<button class="btn sm" id="sgY" style="border-color:var(--green);color:var(--green)">我答对了</button>'
          + '<button class="btn sm" id="sgN" style="border-color:var(--red);color:var(--red)">我答错了</button></div>');
        foot.querySelector('#sgY').onclick = function(){
          if(opts.onAnswer) opts.onAnswer(q, true, ['self-ok']);
          foot.querySelector('.btn-row').remove();
          BD.toast('已记录为答对','ok');
        };
        foot.querySelector('#sgN').onclick = function(){
          if(opts.onAnswer) opts.onAnswer(q, false, ['self-no']);
          foot.querySelector('.btn-row').remove();
          BD.toast('已加入错题本','no');
        };
      };
    }
  }

  box.getAnswer = function(){ return sel; };
  box.forceGrade = function(){
    if(q.type === 'blank'){ lockAndShow(BD.gradeBlank(q, box.querySelector('.blank-in').value), box.querySelector('.blank-in').value); }
    else if(q.type === 'short'){ lockAndShow(null, box.querySelector('.blank-in').value); }
    else { lockAndShow(BD.sameSet(sel, q.a||[]), null); }
  };
  return box;
};

/* ---------- 随堂练习 ---------- */
BD.route('/practice', function(el){
  var params = new URLSearchParams((location.hash.split('?')[1]||''));
  var f = {
    ch: params.get('ch') || '',
    type: '',
    diff: '',
    mode: params.get('q')? 'one' : 'all',
    one: params.get('q') || ''
  };

  el.innerHTML = '<div class="page-head"><h1>随堂练习</h1>'
    + '<div class="sub">共 '+(BD.questions||[]).length+' 道题，覆盖单选、多选、判断、填空、简答五种题型。答错自动进错题本。</div></div>'
    + '<div class="filters">'
    + '<span class="small muted">筛选</span>'
    + '<select id="fCh"><option value="">全部章节</option>'
    + (BD.chapters||[]).map(function(c){ return '<option value="'+c.id+'"'+(f.ch===c.id?' selected':'')+'>第'+c.no+'章 '+BD.esc(c.title)+'</option>'; }).join('')
    + '<option value="all">综合应用题</option></select>'
    + '<select id="fType"><option value="">全部题型</option>'
    + Object.keys(TYPE_NAME).map(function(k){ return '<option value="'+k+'">'+TYPE_NAME[k]+'</option>'; }).join('')
    + '</select>'
    + '<select id="fDiff"><option value="">全部难度</option><option value="1">基础</option><option value="2">进阶</option><option value="3">挑战</option></select>'
    + '<select id="fMode"><option value="all">全部题目</option><option value="todo">仅未做的题</option><option value="wrong">仅做错的题</option><option value="marked">仅收藏的题</option></select>'
    + '<span id="fCount" class="small muted" style="margin-left:auto"></span></div>'
    + '<div id="qlist"></div>';

  function runs(){
    var st = BD.store.get();
    var arr = (BD.questions||[]).filter(function(q){
      if(f.ch === 'all'){ if(q.ch !== 'all') return false; }
      else if(f.ch && q.ch !== f.ch) return false;
      if(f.type && q.type !== f.type) return false;
      if(f.diff && String(q.diff) !== f.diff) return false;
      var a = st.answers[q.id];
      if(f.mode === 'todo' && a) return false;
      if(f.mode === 'wrong' && !st.wrong[q.id]) return false;
      if(f.mode === 'marked' && !st.marked[q.id]) return false;
      return true;
    });
    if(f.one){
      arr = (BD.questions||[]).filter(function(q){ return q.id === f.one; });
    }
    return arr;
  }

  function paint(){
    var arr = runs();
    var box = document.getElementById('qlist');
    document.getElementById('fCount').textContent = '共 ' + arr.length + ' 道题';
    if(!arr.length){
      box.innerHTML = '<div class="empty"><div class="big">◍</div><p>没有符合条件的题目</p></div>';
      return;
    }
    box.innerHTML = '';
    arr.forEach(function(q, i){
      var st = BD.store.get();
      var prev = st.answers[q.id];
      var card = BD.qcard(q, i+1, {
        onAnswer: function(qq, ok, sel){ BD.record(qq, ok, sel); refreshMarks(); },
        compact:true
      });
      if(q.type === 'multi' && !BD.store.get().answers[q.id]) card._multi = true;
      box.appendChild(card);
      var bar = document.createElement('div');
      bar.className = 'btn-row';
      bar.style.margin = '-8px 0 18px 0';
      var mk = document.createElement('button');
      mk.className = 'btn sm';
      mk.textContent = BD.store.get().marked[q.id]? '★ 已收藏' : '☆ 收藏此题';
      mk.onclick = function(){
        BD.store.set(function(s){ if(s.marked[q.id]) delete s.marked[q.id]; else s.marked[q.id] = true; });
        mk.textContent = BD.store.get().marked[q.id]? '★ 已收藏' : '☆ 收藏此题';
      };
      bar.appendChild(mk);
      if(prev){
        var tag = document.createElement('span');
        tag.className = 'chip ' + (prev.ok? 'tone-g':'tone-r');
        tag.textContent = prev.ok? '上次答对' : '上次答错';
        bar.appendChild(tag);
      }
      box.appendChild(bar);
    });
  }
  function refreshMarks(){ BD.renderChrome(); }

  ['fCh','fType','fDiff','fMode'].forEach(function(id){
    var map = {fCh:'ch', fType:'type', fDiff:'diff', fMode:'mode'};
    document.getElementById(id).onchange = function(){ f[map[id]] = this.value; f.one = ''; paint(); };
  });
  paint();
});

/* ---------- 错题本 ---------- */
BD.route('/wrong', function(el){
  function paint(){
    var st = BD.store.get();
    var ids = Object.keys(st.wrong);
    var html = '<div class="page-head"><h1>错题本</h1>'
      + '<div class="sub">共 '+ids.length+' 道错题待复习。重新做对后会自动移出。</div></div>';
    if(!ids.length){
      html += '<div class="empty"><div class="big">✓</div><p>错题本是空的。<br>做练习时答错的题会自动收录到这里。</p>'
        + '<div class="btn-row" style="justify-content:center;margin-top:16px"><a class="btn primary" href="#/practice">去做练习</a></div></div>';
      el.innerHTML = html; return;
    }
    html += '<div class="card"><div class="btn-row" style="justify-content:space-between">'
      + '<div class="chips">' + ids.slice(0,20).map(function(id){
          var q = BD.qById[id]; if(!q) return '';
          var ch = BD.chById[q.ch] || {no:'综'};
          return '<span class="chip tone-r">第'+ch.no+'章</span>';
        }).join('') + '</div>'
      + '<button class="btn sm" id="clearAll">清空错题本</button></div></div>';
    html += '<div id="wlist" style="margin-top:16px"></div>';
    el.innerHTML = html;
    document.getElementById('clearAll').onclick = function(){
      BD.modal('<p>确定要清空错题本吗？此操作不可撤销。</p>'
        + '<div class="btn-row" style="margin-top:14px"><button class="btn" id="ccl">取消</button>'
        + '<button class="btn primary" id="ccy">确定清空</button></div>', '清空错题本');
      document.getElementById('ccl').onclick = BD.closeModal;
      document.getElementById('ccy').onclick = function(){
        BD.store.set(function(s){ s.wrong = {}; });
        BD.closeModal(); BD.toast('错题本已清空','ok'); BD.go('/wrong'); BD.renderChrome();
      };
    };
    var box = document.getElementById('wlist');
    var arr = ids.map(function(id){ return BD.qById[id]; }).filter(Boolean);
    arr.sort(function(a,b){ return (st.wrong[b.id].ts||0) - (st.wrong[a.id].ts||0); });
    arr.forEach(function(q, i){
      var w = st.wrong[q.id] || {};
      var head = document.createElement('div');
      head.className = 'small muted';
      head.style.cssText = 'margin:0 0 -12px 4px;font-size:12px';
      head.textContent = '错 ' + (w.count||1) + ' 次';
      box.appendChild(head);
      box.appendChild(BD.qcard(q, i+1, { onAnswer: function(){ BD.record.apply(null, arguments); setTimeout(paint, 700); } }));
      var sp = document.createElement('div');
      sp.style.height = '16px';
      box.appendChild(sp);
    });
  }
  paint();
});
})();