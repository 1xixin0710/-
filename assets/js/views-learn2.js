/* 视图：思维导图 / 概念速记卡 / 公式速查 */
(function(){
'use strict';
var BD = window.BD;
var NS = 'http://www.w3.org/2000/svg';

/* ================= 思维导图渲染器 ================= */
function layoutTree(root){
  var H = 32, VGAP = 11, HGAP = 54, PAD = 26;
  var cursor = 0, maxW = {}, depthNodes = {};
  function w(t){ return Math.max(74, Math.min(300, t.length * 13.5 + 26)); }
  function walk(node, depth){
    node.depth = depth;
    node.w = w(node.t);
    maxW[depth] = Math.max(maxW[depth] || 0, node.w);
    (depthNodes[depth] = depthNodes[depth] || []).push(node);
    var kids = (!node.collapsed && node.c) ? node.c : null;
    if(!kids || !kids.length){
      node.y = cursor * (H + VGAP);
      cursor++;
    } else {
      kids.forEach(function(k){ walk(k, depth + 1); });
      node.y = (kids[0].y + kids[kids.length - 1].y) / 2;
    }
  }
  walk(root, 0);
  var xAt = {}, acc = PAD;
  Object.keys(maxW).map(Number).sort(function(a,b){ return a-b; }).forEach(function(d){
    xAt[d] = acc; acc += maxW[d] + HGAP;
  });
  var nodes = [], links = [];
  (function collect(node){
    node.x = xAt[node.depth];
    nodes.push(node);
    var kids = (!node.collapsed && node.c) ? node.c : null;
    if(kids) kids.forEach(function(k){ links.push([node, k]); collect(k); });
  })(root);
  return {nodes:nodes, links:links, width:acc + PAD, height: Math.max(cursor * (H + VGAP) + PAD, 200), H:H};
}

BD.renderMindmap = function(container, tree, opts){
  opts = opts || {};
  if(!container || !tree) return;
  var state = { collapsed: {}, vb:null, layout:null };
  if(opts.collapsedDepth != null) state.collapsedDepth = opts.collapsedDepth;

  function rebuild(){
    var root = JSON.parse(JSON.stringify(tree));
    var depthInit = state.collapsedDepth;
    (function mark(node, id, depth, ch, sec){
      node.id = id;
      if(node.ch) ch = node.ch;
      if(node.sec != null) sec = node.sec;
      node.ch = ch || null;
      node.sec = (sec == null ? null : sec);
      var hasKids = node.c && node.c.length;
      if(hasKids && (state.collapsed[id] || (depthInit != null && depth === depthInit))){
        node.collapsed = true;
        state.collapsed[id] = true;
      }
      if(node.c) node.c.forEach(function(k, i){ mark(k, id + '/' + i, depth + 1, ch, sec); });
    })(root, '0', 0, null, null);
    state.collapsedDepth = null;
    state.layout = layoutTree(root);
    state.root = root;
  }
  rebuild();

  var svg = document.createElementNS(NS,'svg');
  container.innerHTML = '';
  container.appendChild(svg);

  function apply(){
    svg.setAttribute('viewBox', state.vb.x+' '+state.vb.y+' '+state.vb.w+' '+state.vb.h);
  }

  function draw(){
    var L = state.layout, H = L.H;
    while(svg.firstChild) svg.removeChild(svg.firstChild);
    var g = document.createElementNS(NS,'g');
    svg.appendChild(g);

    L.links.forEach(function(pair){
      var a = pair[0], b = pair[1];
      var x1 = a.x + a.w, y1 = a.y + H/2, x2 = b.x, y2 = b.y + H/2;
      var mx = (x1 + x2) / 2;
      var path = document.createElementNS(NS,'path');
      path.setAttribute('class','mm-link');
      path.setAttribute('d','M'+x1+','+y1+' C'+mx+','+y1+' '+mx+','+y2+' '+x2+','+y2);
      g.appendChild(path);
    });

    L.nodes.forEach(function(n){
      var grp = document.createElementNS(NS,'g');
      grp.setAttribute('class','mm-node t' + Math.min(n.depth, 3) + (n.c && n.collapsed ? ' collapsed':''));
      var r = document.createElementNS(NS,'rect');
      r.setAttribute('class','mm-node-rect');
      r.setAttribute('x', n.x); r.setAttribute('y', n.y);
      r.setAttribute('width', n.w); r.setAttribute('height', H);
      r.setAttribute('rx', 9);
      grp.appendChild(r);
      var t = document.createElementNS(NS,'text');
      t.setAttribute('x', n.x + 13);
      t.setAttribute('y', n.y + H/2 + 1);
      var label = n.t.length > 20 ? n.t.slice(0,19) + '…' : n.t;
      t.textContent = label;
      grp.appendChild(t);
      var tip = document.createElementNS(NS,'title');
      tip.textContent = n.t;
      grp.appendChild(tip);

      function toggle(){
        if(state.collapsed[n.id]) delete state.collapsed[n.id];
        else state.collapsed[n.id] = true;
        rebuild(); draw(); fit(); centerOn(n.id);
      }

      if(n.c && n.c.length){
        var hit = document.createElementNS(NS,'rect');
        hit.setAttribute('class','mm-badge-hit');
        hit.setAttribute('x', n.x + n.w - 25);
        hit.setAttribute('y', n.y + 3);
        hit.setAttribute('width', 23);
        hit.setAttribute('height', H - 6);
        hit.setAttribute('rx', 6);
        grp.appendChild(hit);
        var b = document.createElementNS(NS,'text');
        b.setAttribute('class','mm-badge');
        b.setAttribute('x', n.x + n.w - 13);
        b.setAttribute('y', n.y + H/2 + 1);
        b.setAttribute('text-anchor','middle');
        b.textContent = n.collapsed ? '＋' : '－';
        grp.appendChild(b);
        hit.addEventListener('click', function(ev){ ev.stopPropagation(); toggle(); });
      }
      grp.style.cursor = 'pointer';
      grp.addEventListener('click', function(ev){
        ev.stopPropagation();
        if(opts.activate && n.ch){ opts.activate(n); return; }
        if(!n.c || !n.c.length) return;
        toggle();
      });
      g.appendChild(grp);
    });
  }

  function centerOn(id){
    var target = null;
    state.layout.nodes.forEach(function(n){ if(n.id === id) target = n; });
    if(!target) return;
    state.vb.x = target.x - state.vb.w * 0.2;
    state.vb.y = target.y + state.layout.H / 2 - state.vb.h / 2;
    apply();
  }

  function fit(){
    var L = state.layout;
    var box = container.getBoundingClientRect();
    var w = Math.max(box.width, 300), h = opts.height || box.height || 620;
    var s = Math.max(L.width / w, L.height / h) * 1.06;
    if(opts.maxScale) s = Math.min(s, opts.maxScale);
    state.vb = { x: 0, y: 0, w: w * s, h: h * s };
    state.vb.x = state.vb.w > L.width ? -(state.vb.w - L.width) / 2 : -12;
    state.vb.y = state.vb.h > L.height ? -(state.vb.h - L.height) / 2 : -12;
    apply();
  }

  container.addEventListener('wheel', function(e){
    e.preventDefault();
    var f = e.deltaY > 0 ? 1.12 : 0.89;
    var vb = state.vb;
    vb.w *= f; vb.h *= f;
    apply();
  }, {passive:false});

  var drag = null;
  container.addEventListener('mousedown', function(e){
    drag = {x:e.clientX, y:e.clientY, vb:{x:state.vb.x, y:state.vb.y}};
    container.classList.add('grabbing');
  });
  window.addEventListener('mousemove', function(e){
    if(!drag) return;
    var box = container.getBoundingClientRect();
    var kx = state.vb.w / box.width, ky = state.vb.h / box.height;
    state.vb.x = drag.vb.x - (e.clientX - drag.x) * kx;
    state.vb.y = drag.vb.y - (e.clientY - drag.y) * ky;
    apply();
  });
  window.addEventListener('mouseup', function(){ drag = null; container.classList.remove('grabbing'); });

  draw(); fit();
  container._mm = {
    fit:fit, state:state, svg:svg, centerOn:centerOn,
    idsAtDepth:function(depth){
      var out = [];
      (function walk(n, d){
        if(d === depth) out.push(n.id);
        if(n.c && d < depth) n.c.forEach(function(k){ walk(k, d + 1); });
      })(state.root, 0);
      return out;
    },
    relayout:function(){ rebuild(); draw(); fit(); }
  };
};

/* ================= 思维导图页 ================= */
BD.route('/mindmap', function(el){
  var html = '<div class="page-head"><h1>知识思维导图</h1>'
    + '<div class="sub">点击节点跳到对应知识点；点节点右侧 ＋/－ 展开或收起；滚轮缩放，按住拖动平移。</div></div>'
    + '<div class="mm-wrap"><div class="mm-toolbar">'
    + '<button class="btn sm primary" id="mmFit">适应窗口</button>'
    + '<button class="btn sm" id="mmExpand">全部展开</button>'
    + '<button class="btn sm" id="mmCollapse">收起到二级</button>'
    + '<button class="btn sm" id="mmPng">导出图片</button>'
    + '<button class="btn sm" id="mmTxt">导出大纲</button>'
    + '<span class="small muted" style="margin-left:auto">全书共 '+(BD.chapters||[]).length+' 章</span>'
    + '</div><div class="mm-canvas" id="mmCanvas" style="height:660px"></div>'
    + '<div class="mm-legend"><span>■ 紫色：全书主题</span><span>■ 浅蓝：知识模块</span><span>■ 白色：具体知识点</span><span>点节点跳转 · 点 ＋/－ 展开 · 悬停看全文</span></div></div>';

  html += '<div class="grid g3" style="margin-top:16px">';
  (BD.chapters||[]).forEach(function(ch){
    html += '<div class="case-card" style="cursor:pointer" onclick="location.hash=\'#/chapter/'+ch.id+'\'">'
      + '<span class="ind">第 '+ch.no+' 章</span><h3>'+BD.esc(ch.title)+'</h3>'
      + '<p>'+(ch.tags||[]).join(' · ')+'</p></div>';
  });
  html += '</div>';
  el.innerHTML = html;

  var canvas = document.getElementById('mmCanvas');
  BD.renderMindmap(canvas, BD.mindmap, {
    height:660, collapsedDepth:1, maxScale:1.2,
    activate:function(n){
      var q = [];
      if(n.sec != null) q.push('sec='+n.sec);
      q.push('from=mm');
      BD.go('/chapter/'+n.ch+'?'+q.join('&'));
    }
  });

  document.getElementById('mmFit').onclick = function(){ canvas._mm.fit(); };
  document.getElementById('mmExpand').onclick = function(){ canvas._mm.state.collapsed = {}; canvas._mm.relayout(); };
  document.getElementById('mmCollapse').onclick = function(){
    canvas._mm.state.collapsed = {};
    canvas._mm.idsAtDepth(1).forEach(function(id){ canvas._mm.state.collapsed[id] = true; });
    canvas._mm.relayout();
  };
  document.getElementById('mmTxt').onclick = function(){
    var out = '';
    (function walk(n, d){
      out += new Array(d+1).join('  ') + '- ' + n.t + '\n';
      if(n.c && !canvas._mm.state.collapsed[n.id]) n.c.forEach(function(k){ walk(k, d+1); });
    })(canvas._mm.state.root, 0);
    download('大数据分析原理与实践-知识大纲.md', out);
  };
  document.getElementById('mmPng').onclick = function(){ exportSvgPng(canvas, '大数据分析知识导图.png'); };
});

function download(name, text){
  var blob = new Blob([text], {type:'text/plain;charset=utf-8'});
  var a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = name; a.click();
  setTimeout(function(){ URL.revokeObjectURL(a.href); }, 4000);
  BD.toast('已导出：'+name, 'ok');
}

function exportSvgPng(canvas, name){
  var svg = canvas.querySelector('svg');
  if(!svg) return;
  var vb = svg.getAttribute('viewBox').split(/\s+/).map(Number);
  var clone = svg.cloneNode(true);
  clone.setAttribute('xmlns', NS);
  clone.setAttribute('width', vb[2]); clone.setAttribute('height', vb[3]);
  var style = document.createElementNS(NS,'style');
  style.textContent = 'text{font-family:"Microsoft YaHei","PingFang SC",sans-serif;font-size:12.5px;fill:#101828;dominant-baseline:middle}'
    + '.mm-node-rect{fill:#fff;stroke:#dcdfe6;stroke-width:1.6}'
    + '.mm-link{fill:none;stroke:#cfd4dd;stroke-width:1.7}'
    + '.t0 .mm-node-rect{fill:#4f46e5;stroke:#4f46e5}.t0 text{fill:#fff;font-weight:700;font-size:14px}'
    + '.t1 .mm-node-rect{fill:#eef0ff;stroke:#c7c9f7}.t1 text{fill:#3730a3;font-weight:650}'
    + '.t3 .mm-node-rect{fill:#fff;stroke:#e4e7ec}.t3 text{fill:#475467}'
    + '.mm-badge-hit{fill:transparent}'
    + '.mm-badge{font-size:11px;fill:#98a2b3}';
  clone.insertBefore(style, clone.firstChild);
  var data = new XMLSerializer().serializeToString(clone);
  var img = new Image();
  img.onload = function(){
    var cv = document.createElement('canvas');
    cv.width = Math.min(4000, vb[2] * 1.6); cv.height = Math.min(4000, vb[3] * 1.6);
    var ctx = cv.getContext('2d');
    ctx.fillStyle = '#fff'; ctx.fillRect(0,0,cv.width,cv.height);
    ctx.drawImage(img, 0, 0, cv.width, cv.height);
    var a = document.createElement('a');
    a.href = cv.toDataURL('image/png'); a.download = name; a.click();
    BD.toast('已导出图片','ok');
  };
  img.onerror = function(){ BD.toast('导出失败，可先导出大纲文本','no'); };
  var _dp = 'da' + 'ta:image/svg+xml;charset=utf-8,';
  img.src = _dp + encodeURIComponent(data);
}

/* ================= 概念速记卡 ================= */
BD.route('/cards', function(el){
  var list = (BD.glossary||[]).slice();
  var st = BD.store.get();
  var params = new URLSearchParams((location.hash.split('?')[1]||''));
  var wantTerm = params.get('t');

  var focus = 'all', idx = 0, flipped = false;
  var order = 'seq';
  if(wantTerm){
    var fi = list.findIndex(function(g){ return g.t === wantTerm; });
    if(fi >= 0) idx = fi;
  }
  function shuffle(arr){
    var a = arr.slice();
    for(var i = a.length - 1; i > 0; i--){
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = a[i]; a[i] = a[j]; a[j] = tmp;
    }
    return a;
  }

  el.innerHTML = '<div class="page-head"><h1>概念速记卡</h1>'
    + '<div class="sub">共 '+list.length+' 个核心术语。点击卡片翻面看释义，用下方按钮标记掌握程度。</div></div>'
    + '<div class="filters"><span class="small muted">筛选</span>'
    + '<select id="cardFilter">'
    + '<option value="all">全部术语</option>'
    + '<option value="unknown">未标记</option>'
    + '<option value="unknown2">标记为「不会」</option>'
    + '<option value="fuzzy">标记为「模糊」</option>'
    + '<option value="known">标记为「已掌握」</option>'
    + '</select>'
    + '<select id="cardCh"><option value="">全部章节</option>'
    + (BD.chapters||[]).map(function(c){ return '<option value="'+c.id+'">第'+c.no+'章 '+BD.esc(c.title)+'</option>'; }).join('')
    + '</select>'
    + '<span class="small muted" style="margin-left:6px">顺序</span>'
    + '<select id="cardOrder">'
    + '<option value="seq">正序</option>'
    + '<option value="rand">随机抽取</option>'
    + '</select>'
    + '<button class="btn sm" id="cardReshuffle" hidden>重新洗牌</button>'
    + '<span id="cardCount" class="small muted" style="margin-left:auto"></span></div>'
    + '<div class="fc-stage"><div class="fc" id="fc"><div class="fc-face fc-front" id="fcF"></div>'
    + '<div class="fc-face back" id="fcB"></div></div></div>'
    + '<div class="btn-row" style="justify-content:center;margin-top:18px">'
    + '<button class="btn" id="cPrev">← 上一张</button>'
    + '<button class="btn" id="cFlip">翻面</button>'
    + '<button class="btn" id="cNext">下一张 →</button></div>'
    + '<div class="btn-row" style="justify-content:center;margin-top:12px">'
    + '<button class="btn sm" id="mU" style="border-color:var(--red);color:var(--red)">不会</button>'
    + '<button class="btn sm" id="mF" style="border-color:var(--amber);color:var(--amber)">模糊</button>'
    + '<button class="btn sm" id="mK" style="border-color:var(--green);color:var(--green)">已掌握</button>'
    + '<button class="btn sm" id="mClear">清除标记</button></div>';

  var pool = list;
  function rebuildPool(keep){
    var f = document.getElementById('cardFilter').value;
    var c = document.getElementById('cardCh').value;
    var s = BD.store.get();
    pool = list.filter(function(g){
      if(c && g.ch !== c) return false;
      var m = s.cards[g.t];
      if(f === 'all') return true;
      if(f === 'unknown') return !m;
      if(f === 'unknown2') return m === 'unknown';
      return m === f;
    });
    if(order === 'rand') pool = shuffle(pool);
    if(keep){
      var at = pool.indexOf(keep);
      idx = at >= 0 ? at : 0;
    }
    if(idx >= pool.length) idx = 0;
    document.getElementById('cardCount').textContent = '当前 '+(pool.length? idx+1 : 0)+' / '+pool.length+' 张';
    paint();
  }
  function paint(){
    var f = document.getElementById('fcF'), b = document.getElementById('fcB');
    document.getElementById('fc').classList.remove('flip'); flipped = false;
    if(!pool.length){
      f.innerHTML = '<div class="term">没有符合条件的卡片</div><div class="hint">换个筛选条件试试</div>';
      b.innerHTML = '';
      return;
    }
    var g = pool[idx], s = BD.store.get();
    var ch = BD.chById[g.ch] || {no:'', title:'综合'};
    var mark = s.cards[g.t];
    var markTxt = mark === 'known' ? '<span class="chip tone-g">已掌握</span>'
      : mark === 'fuzzy' ? '<span class="chip tone-w">模糊</span>'
      : mark === 'unknown' ? '<span class="chip tone-r">不会</span>' : '<span class="chip">未标记</span>';
    f.innerHTML = '<div class="small muted" style="margin-bottom:14px">第'+ch.no+'章 · '+BD.esc(g.tag||'')+'</div>'
      + '<div class="term">'+BD.esc(g.t)+'</div>'
      + '<div class="en">'+BD.esc(g.en||'')+'</div>'
      + '<div style="margin-top:16px">'+markTxt+'</div>'
      + '<div class="hint">点击卡片翻面</div>';
    b.innerHTML = '<div class="tagline">'+BD.esc(g.en||g.tag||'')+'</div>'
      + '<div class="def">'+BD.esc(g.d)+'</div>'
      + (g.memo? '<div class="memo"><b>一句话记忆：</b>'+BD.esc(g.memo)+'</div>' : '')
      + '<div class="small" style="margin-top:14px;opacity:.65">第'+(ch.no||'-')+'章 · '+BD.esc(g.tag||'')+'</div>';
    document.getElementById('cardCount').textContent = '当前 '+(idx+1)+' / '+pool.length+' 张';
  }
  function mark(v){
    if(!pool.length) return;
    var g = pool[idx];
    BD.store.set(function(s){ if(v) s.cards[g.t]=v; else delete s.cards[g.t]; });
    BD.renderChrome();
    BD.toast(v? '已标记' : '已清除标记', 'ok');
    paint();
  }

  document.getElementById('fc').onclick = function(){ this.classList.toggle('flip'); flipped = !flipped; };
  document.getElementById('cPrev').onclick = function(){ if(pool.length){ idx = (idx - 1 + pool.length) % pool.length; paint(); } };
  document.getElementById('cNext').onclick = function(){ if(pool.length){ idx = (idx + 1) % pool.length; paint(); } };
  document.getElementById('cFlip').onclick = function(){ document.getElementById('fc').classList.toggle('flip'); };
  document.getElementById('mU').onclick = function(){ mark('unknown'); setTimeout(function(){ idx = Math.min(idx+1, pool.length-1); paint(); }, 260); };
  document.getElementById('mF').onclick = function(){ mark('fuzzy'); setTimeout(function(){ idx = Math.min(idx+1, pool.length-1); paint(); }, 260); };
  document.getElementById('mK').onclick = function(){ mark('known'); setTimeout(function(){ idx = Math.min(idx+1, pool.length-1); paint(); }, 260); };
  document.getElementById('mClear').onclick = function(){ mark(null); };
  document.getElementById('cardFilter').onchange = function(){ idx = 0; rebuildPool(); };
  document.getElementById('cardCh').onchange = function(){ idx = 0; rebuildPool(); };
  document.getElementById('cardOrder').onchange = function(){
    var cur = pool[idx];
    order = this.value;
    document.getElementById('cardReshuffle').hidden = (order !== 'rand');
    rebuildPool(cur);
    BD.toast(order === 'rand' ? '已切换为随机抽取' : '已切换为正序', 'ok');
  };
  document.getElementById('cardReshuffle').onclick = function(){
    idx = 0;
    rebuildPool();
    BD.toast('已重新洗牌', 'ok');
  };
  if(window.__cardsKeyHandler) document.removeEventListener('keydown', window.__cardsKeyHandler);
  window.__cardsKeyHandler = function onKey(e){
    if(!/^#\/cards/.test(location.hash)){ document.removeEventListener('keydown', onKey); return; }
    if(e.key === 'ArrowLeft') document.getElementById('cPrev').click();
    if(e.key === 'ArrowRight') document.getElementById('cNext').click();
    if(e.key === ' '){ e.preventDefault(); document.getElementById('cFlip').click(); }
  };
  document.addEventListener('keydown', window.__cardsKeyHandler);
  rebuildPool();
});

/* ================= 公式速查 ================= */
BD.route('/formulas', function(el){
  var cats = [];
  (BD.formulas||[]).forEach(function(f){ if(cats.indexOf(f.cat) < 0) cats.push(f.cat); });
  var params = new URLSearchParams((location.hash.split('?')[1]||''));
  var want = params.get('f') || '全部';

  el.innerHTML = '<div class="page-head"><h1>公式速查表</h1>'
    + '<div class="sub">共 '+(BD.formulas||[]).length+' 条核心公式，按主题分类。可直接用于做题与考试复习。</div></div>'
    + '<div class="chips" style="margin-bottom:18px">'
    + ['全部'].concat(cats).map(function(c){
        return '<span class="chip'+(c===want?' on':'')+'" data-cat="'+BD.esc(c)+'">'+BD.esc(c)+'</span>';
      }).join('')
    + '</div><div id="fmlList" class="grid g2"></div>';

  function paint(cat){
    var box = document.getElementById('fmlList');
    var arr = (BD.formulas||[]).filter(function(f){ return cat === '全部' || f.cat === cat; });
    box.innerHTML = arr.map(function(f){
      var ch = BD.chById[f.ch] || {};
      return '<div class="fml"><div class="nm">'+BD.esc(f.nm)
        + '<span class="small muted" style="font-weight:500;float:right">第'+(ch.no||'-')+'章</span></div>'
        + '<div class="exp">'+f.f+'</div>'
        + '<div class="vars">' + (f.v||[]).map(function(p){
            return '<div><b>'+BD.esc(p[0])+'</b>：'+BD.esc(p[1])+'</div>';
          }).join('') + '</div>'
        + '<div class="note" style="margin-top:11px;font-size:12.5px">'+BD.esc(f.note)+'</div></div>';
    }).join('');
  }
  paint(want);
  el.querySelectorAll('.chip[data-cat]').forEach(function(c){
    c.onclick = function(){
      el.querySelectorAll('.chip[data-cat]').forEach(function(x){ x.classList.remove('on'); });
      this.classList.add('on'); paint(this.getAttribute('data-cat'));
    };
  });
});
})();
