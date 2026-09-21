/* 启动与全局交互 */
(function(){
'use strict';
var BD = window.BD;

function boot(){
  BD.renderNav();
  BD.renderChrome();

  window.addEventListener('hashchange', BD.resolve);

  var menu = document.getElementById('menuBtn');
  var sb = document.getElementById('sidebar');
  var scrim = document.getElementById('scrim');
  if(menu){
    menu.onclick = function(){
      sb.classList.toggle('open');
      if(sb.classList.contains('open')) scrim.classList.add('on');
      else scrim.classList.remove('on');
    };
  }
  if(scrim){
    scrim.addEventListener('click', function(){
      sb.classList.remove('open'); scrim.classList.remove('on'); BD.closeModal();
    });
    scrim.classList.remove('on');
  }
  sb.addEventListener('click', function(e){
    if(e.target.closest && e.target.closest('.nav-item') && window.innerWidth <= 900){
      sb.classList.remove('open'); scrim.classList.remove('on');
    }
  });

  var rb = document.getElementById('resetBtn');
  if(rb) rb.onclick = function(){
    BD.modal('<p>将清空全部学习记录（章节进度、答题记录、错题本、术语卡标记、答疑笔记）。此操作不可撤销。</p>'
      + '<div class="btn-row" style="margin-top:14px"><button class="btn" id="grC">取消</button>'
      + '<button class="btn primary" id="grY">确定清空</button></div>', '清空学习数据');
    document.getElementById('grC').onclick = BD.closeModal;
    document.getElementById('grY').onclick = function(){
      BD.store.reset(); BD.closeModal(); BD.toast('学习数据已清空','ok');
      BD.go('/'); BD.renderChrome();
    };
  };

  /* 全局搜索 */
  var inp = document.getElementById('globalSearch');
  var panel = document.getElementById('searchPanel');
  var hits = [], cur = -1;

  function close(){ panel.hidden = true; hits = []; cur = -1; }
  function paint(){
    if(!hits.length){ panel.innerHTML = '<div class="sr-empty">没有找到相关内容</div>'; panel.hidden = false; return; }
    panel.innerHTML = hits.map(function(h, i){
      return '<button class="sr-hit'+(i===cur?' on':'')+'" data-i="'+i+'">'
        + '<span class="t"><span class="sr-tag">'+h.type+'</span>'+BD.esc(h.title)+'</span>'
        + '<span class="s">'+BD.esc(h.sub||'')+'</span></button>';
    }).join('');
    panel.hidden = false;
    panel.querySelectorAll('.sr-hit').forEach(function(b){
      b.onclick = function(){ go(Number(this.getAttribute('data-i'))); };
      b.onmouseenter = function(){ cur = Number(this.getAttribute('data-i')); };
    });
  }
  function go(i){
    var h = hits[i];
    if(!h) return;
    close(); inp.value = '';
    BD.go(h.hash.replace(/^#/,''));
  }
  if(inp){
    inp.addEventListener('input', function(){
      var v = this.value.trim();
      if(v.length < 1){ close(); return; }
      hits = BD.search(v); cur = hits.length? 0 : -1; paint();
    });
    inp.addEventListener('keydown', function(e){
      if(panel.hidden) return;
      if(e.key === 'ArrowDown'){ e.preventDefault(); cur = Math.min(cur+1, hits.length-1); paint(); }
      else if(e.key === 'ArrowUp'){ e.preventDefault(); cur = Math.max(cur-1, 0); paint(); }
      else if(e.key === 'Enter'){ e.preventDefault(); go(cur); }
      else if(e.key === 'Escape'){ close(); this.blur(); }
    });
    inp.addEventListener('blur', function(){ setTimeout(close, 180); });
    inp.addEventListener('focus', function(){ if(this.value.trim()){ hits = BD.search(this.value.trim()); cur = 0; paint(); } });
  }
  document.addEventListener('keydown', function(e){
    if((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k'){
      e.preventDefault(); inp.focus(); inp.select();
    }
  });
  document.addEventListener('click', function(e){
    if(panel && !panel.hidden && !e.target.closest('.search-wrap')) close();
  });

  /* 首次访问引导 */
  var s = BD.store.get();
  if(!s.streak.last && !localStorage.getItem('bd-ta-seen')){
    try{ localStorage.setItem('bd-ta-seen','1'); }catch(e){}
    setTimeout(function(){
      BD.modal('<p style="font-size:14.5px">欢迎使用《大数据分析原理与实践》课程助教。建议按这个顺序开始：</p>'
        + '<ol style="padding-left:20px;color:var(--ink2);font-size:13.5px;line-height:1.9">'
        + '<li><b>先看思维导图</b>——建立全书知识框架，知道这门课一共讲什么。</li>'
        + '<li><b>进入章节精讲</b>——逐章学习，每章读完顺手做本章练习。</li>'
        + '<li><b>用算法实验室验证</b>——把抽象算法拖一拖、点一点，比背公式管用。</li>'
        + '<li><b>用案例库练表达</b>——商学院考试和答辩都爱考"结合实际场景"。</li>'
        + '<li><b>考前用模拟考试 + 错题本</b>——集中清理薄弱点。</li>'
        + '</ol>'
        + '<div class="note" style="margin-top:14px">所有学习记录只保存在你自己的浏览器里，不会上传到任何服务器。</div>'
        + '<div class="btn-row" style="margin-top:16px"><button class="btn primary" id="start1">从思维导图开始</button>'
        + '<button class="btn" id="start2">直接看章节</button></div>', '欢迎使用');
      document.getElementById('start1').onclick = function(){ BD.closeModal(); BD.go('/mindmap'); };
      document.getElementById('start2').onclick = function(){ BD.closeModal(); BD.go('/chapters'); };
    }, 500);
  }

  if(!location.hash) location.hash = '/';
  BD.resolve();
}

if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();
})();