/* 算法交互实验室（一）：MapReduce / K-means / DBSCAN */
(function(){
'use strict';
var BD = window.BD;
BD.labs = [];

/* ---------- 绘图工具 ---------- */
function canvasIn(parent, w, h){
  var cv = document.createElement('canvas');
  cv.className = 'plot';
  cv.width = w; cv.height = h;
  cv.style.width = '100%';
  cv.style.maxWidth = w + 'px';
  parent.appendChild(cv);
  return cv;
}
function axes(ctx, w, h){
  ctx.clearRect(0,0,w,h);
  ctx.fillStyle = '#fdfdfe'; ctx.fillRect(0,0,w,h);
  ctx.strokeStyle = '#eef0f4'; ctx.lineWidth = 1;
  for(var x=0;x<=w;x+=w/10){ ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,h); ctx.stroke(); }
  for(var y=0;y<=h;y+=h/8){ ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(w,y); ctx.stroke(); }
  ctx.strokeStyle = '#dcdfe6';
  ctx.beginPath(); ctx.moveTo(0,h); ctx.lineTo(w,h); ctx.moveTo(0,0); ctx.lineTo(0,h); ctx.stroke();
}
var PALETTE = ['#4f46e5','#0d9488','#d97706','#dc2626','#7c3aed','#0284c7','#65a30d','#db2777'];
function toPx(pt, box){ return { x: pt[0]*box.w, y: box.h - pt[1]*box.h }; }

/* ================= 1. MapReduce 词频 ================= */
BD.labs.push({
  id:'mapreduce', name:'MapReduce 词频统计', tag:'计算框架',
  desc:'分片 → Map → Shuffle → Reduce 的完整过程可视化。',
  render:function(box){
    box.innerHTML = '<div class="lab-ctrl">'
      + '<div class="field" style="grid-column:1/-1"><label>输入文本（空格或标点分隔）</label>'
      + '<textarea id="mrText">大数据 分析 原理 大数据 实践 分析 大数据 计算 原理 实践</textarea></div>'
      + '<div class="field"><label>分片数量 Map 任务数</label><input type="range" id="mrSplit" min="1" max="4" value="3"><span class="v" id="mrSplitV">3</span></div>'
      + '</div>'
      + '<div class="stage-row"><div class="stage" id="st1"><div class="n">STEP 1</div><div class="d">输入分片 Split</div></div>'
      + '<div class="stage" id="st2"><div class="n">STEP 2</div><div class="d">Map 映射</div></div>'
      + '<div class="stage" id="st3"><div class="n">STEP 3</div><div class="d">Shuffle 分区排序</div></div>'
      + '<div class="stage" id="st4"><div class="n">STEP 4</div><div class="d">Reduce 归约</div></div></div>'
      + '<div class="btn-row"><button class="btn primary" id="mrRun">运行</button><button class="btn" id="mrStep">单步执行</button></div>'
      + '<div class="out-box" id="mrOut">点击「运行」或「单步执行」开始。</div>';
    var step = 0, data = null, timer = null;

    function parse(){
      var raw = document.getElementById('mrText').value;
      var words = raw.split(/[\s,，。;；、.!?！？:：()（）\[\]"']+/).filter(Boolean);
      var n = Number(document.getElementById('mrSplit').value);
      var splits = [];
      for(var i=0;i<n;i++) splits.push([]);
      words.forEach(function(w, i){ splits[i % n].push(w); });
      return splits;
    }
    function log(html){ document.getElementById('mrOut').innerHTML = html; }
    function clearStage(){ ['st1','st2','st3','st4'].forEach(function(s){ document.getElementById(s).classList.remove('on'); }); }

    function reset(){ step = 0; data = parse(); clearStage(); log('点击「运行」或「单步执行」开始。'); }

    function next(){
      data = data || parse();
      step++;
      if(step === 1){
        clearStage(); document.getElementById('st1').classList.add('on');
        var s = data.map(function(sp, i){ return '<span class="k">Split '+(i+1)+'</span>  '+sp.join(' '); });
        log('<span class="y">【输入分片】</span>把输入切成 '+data.length+' 片，每片由一个 Map 任务独立处理：\n\n' + s.join('\n'));
      } else if(step === 2){
        document.getElementById('st2').classList.add('on');
        var mids = data.map(function(sp, i){
          var kvs = sp.map(function(w){ return w + ' → ( ' + w + ' , 1 )'; });
          return '<span class="k">Map '+(i+1)+'</span> 输出 ' + sp.length + ' 个键值对：\n  ' + kvs.join('\n  ');
        });
        log('<span class="y">【Map 阶段】</span>每个 Map 任务把输入转成 (key, value) = (单词, 1) 的中间结果：\n\n' + mids.join('\n\n'));
      } else if(step === 3){
        document.getElementById('st3').classList.add('on');
        var all = [];
        data.forEach(function(sp){ all = all.concat(sp); });
        var groups = {};
        all.forEach(function(w){ (groups[w] = groups[w] || []).push(1); });
        var keys = Object.keys(groups).sort();
        var rows = keys.map(function(k){
          return '  <span class="g">'+k+'</span> → [ ' + groups[k].map(function(){ return '1'; }).join(', ') + ' ]   （'+groups[k].length+' 条）';
        });
        log('<span class="y">【Shuffle 阶段】</span>按 key 分区、排序、合并，把相同 key 的数据送到同一个 Reduce 任务。\n这是 MapReduce 最耗时的环节，涉及磁盘 IO 与网络传输。\n\n'
          + '分区数 = ' + keys.length + '，生成的键值对分组：\n' + rows.join('\n'));
      } else if(step === 4){
        document.getElementById('st4').classList.add('on');
        var all2 = [];
        data.forEach(function(sp){ all2 = all2.concat(sp); });
        var g2 = {};
        all2.forEach(function(w){ g2[w] = (g2[w]||0) + 1; });
        var ks = Object.keys(g2).sort(function(a,b){ return g2[b]-g2[a]; });
        var out = ks.map(function(k){ return '  <span class="g">'+k+'</span>  ' + g2[k]; });
        log('<span class="y">【Reduce 阶段】</span>对每个 key 的 value 列表求和，得到最终词频：\n\n'
          + '<span class="k">单词    频次</span>\n' + out.join('\n')
          + '\n\n共 ' + all2.length + ' 个词，' + ks.length + ' 个不重复词，最高频："' + ks[0] + '" 出现 ' + g2[ks[0]] + ' 次。');
      } else {
        step = 4;
      }
    }
    document.getElementById('mrRun').onclick = function(){
      reset();
      var btn = this; btn.disabled = true;
      timer = setInterval(function(){
        next();
        if(step >= 4){ clearInterval(timer); btn.disabled = false; }
      }, 550);
      next();
    };
    document.getElementById('mrStep').onclick = next;
    document.getElementById('mrSplit').oninput = function(){ document.getElementById('mrSplitV').textContent = this.value; reset(); };
    reset();
  }
});

/* ================= 2. K-means ================= */
BD.labs.push({
  id:'kmeans', name:'K-means 聚类', tag:'聚类',
  desc:'点击画布添加样本，观察簇中心的迭代移动过程。',
  render:function(box){
    box.innerHTML = '<div class="lab-ctrl">'
      + '<div class="field"><label>簇数量 K</label><input type="range" id="kmK" min="2" max="6" value="3"><span class="v" id="kmKV">3</span></div>'
      + '<div class="field"><label>样本点数</label><input type="range" id="kmN" min="20" max="300" value="120"><span class="v" id="kmNV">120</span></div>'
      + '</div>'
      + '<div class="btn-row" style="margin-bottom:12px">'
      + '<button class="btn primary" id="kmStep">执行一步</button>'
      + '<button class="btn" id="kmRun">自动运行</button>'
      + '<button class="btn" id="kmReset">重新生成数据</button>'
      + '<button class="btn sm" id="kmClear">清空画布</button></div>'
      + '<div id="kmCv"></div>'
      + '<div class="out-box" id="kmOut"></div>';
    var cv = canvasIn(document.getElementById('kmCv'), 640, 380);
    var ctx = cv.getContext('2d');
    var pts = [], cents = [], assign = [], iter = 0, running = null;

    function gen(){
      pts = [];
      var n = Number(document.getElementById('kmN').value);
      var k = Number(document.getElementById('kmK').value);
      var seeds = [];
      for(var i=0;i<k;i++) seeds.push([0.15 + 0.7*Math.random(), 0.15 + 0.7*Math.random()]);
      for(var j=0;j<n;j++){
        var s = seeds[j % k];
        var x = s[0] + (Math.random()-0.5)*0.22;
        var y = s[1] + (Math.random()-0.5)*0.22;
        pts.push([Math.min(0.98, Math.max(0.02, x)), Math.min(0.98, Math.max(0.02, y))]);
      }
      init();
    }
    function init(){
      var k = Number(document.getElementById('kmK').value);
      cents = [];
      for(var i=0;i<k;i++){
        var p = pts[Math.floor(Math.random()*pts.length)] || [Math.random(), Math.random()];
        cents.push([p[0] + (Math.random()-0.5)*0.05, p[1] + (Math.random()-0.5)*0.05]);
      }
      assign = pts.map(function(){ return -1; });
      iter = 0;
      draw(); report('已初始化 K=' + k + ' 个随机簇中心。点击「执行一步」开始迭代。');
      var b = document.getElementById('kmRun'); if(b) b.disabled = false;
    }
    function step(){
      var box2 = {w:cv.width, h:cv.height};
      var changed = false;
      // 分配
      pts.forEach(function(p, i){
        var best = 0, bd = Infinity;
        cents.forEach(function(c, j){
          var d = (p[0]-c[0])*(p[0]-c[0]) + (p[1]-c[1])*(p[1]-c[1]);
          if(d < bd){ bd = d; best = j; }
        });
        if(assign[i] !== best) changed = true;
        assign[i] = best;
      });
      // 更新
      var sums = cents.map(function(){ return [0,0,0]; });
      pts.forEach(function(p, i){
        var c = assign[i]; sums[c][0] += p[0]; sums[c][1] += p[1]; sums[c][2]++;
      });
      sums.forEach(function(s, j){
        if(s[2] > 0){ cents[j][0] = s[0]/s[2]; cents[j][1] = s[1]/s[2]; }
      });
      iter++;
      draw(); report();
      return changed;
    }
    function sse(){
      var s = 0;
      pts.forEach(function(p, i){
        var c = cents[assign[i]] || cents[0];
        s += (p[0]-c[0])*(p[0]-c[0]) + (p[1]-c[1])*(p[1]-c[1]);
      });
      return s / pts.length;
    }
    function draw(){
      axes(ctx, cv.width, cv.height);
      var box2 = {w:cv.width, h:cv.height};
      pts.forEach(function(p, i){
        var q = toPx(p, box2);
        ctx.beginPath(); ctx.arc(q.x, q.y, 3.4, 0, Math.PI*2);
        ctx.fillStyle = assign[i] >= 0 ? PALETTE[assign[i] % PALETTE.length] : '#b0b7c3';
        ctx.globalAlpha = 0.72; ctx.fill(); ctx.globalAlpha = 1;
      });
      cents.forEach(function(c, j){
        var q = toPx(c, box2);
        ctx.beginPath(); ctx.arc(q.x, q.y, 9, 0, Math.PI*2);
        ctx.fillStyle = PALETTE[j % PALETTE.length]; ctx.fill();
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 2.5; ctx.stroke();
        ctx.fillStyle = '#fff'; ctx.font = 'bold 10px sans-serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(String(j+1), q.x, q.y+0.5);
        ctx.textAlign = 'start'; ctx.textBaseline = 'alphabetic';
      });
    }
    function report(extra){
      var counts = cents.map(function(){ return 0; });
      assign.forEach(function(a){ if(a >= 0) counts[a]++; });
      var t = '<span class="k">第 ' + iter + ' 轮迭代</span>\n'
        + '簇规模分布： ' + counts.map(function(c, i){ return '簇'+(i+1)+'=' + c; }).join('  ') + '\n'
        + '簇内平均平方距离 SSE/n = <span class="y">' + sse().toFixed(5) + '</span>\n\n';
      t += '各簇中心坐标：\n' + cents.map(function(c, i){
        return '  簇' + (i+1) + '  ( ' + c[0].toFixed(3) + ' , ' + c[1].toFixed(3) + ' )';
      }).join('\n');
      if(extra) t += '\n\n' + extra;
      document.getElementById('kmOut').innerHTML = t;
    }
    document.getElementById('kmStep').onclick = function(){ step(); };
    document.getElementById('kmRun').onclick = function(){
      if(running){ clearInterval(running); running = null; this.textContent = '自动运行'; return; }
      this.textContent = '暂停';
      var self = this;
      running = setInterval(function(){
        var changed = step();
        if(!changed || iter > 60){ clearInterval(running); running = null; self.textContent = '自动运行';
          report('已收敛：簇分配不再变化。这是 K-means 的终止条件之一。'); }
      }, 420);
    };
    document.getElementById('kmReset').onclick = function(){ gen(); };
    document.getElementById('kmClear').onclick = function(){ pts = []; assign = []; iter = 0; draw(); report('画布已清空，点击画布可手动添加样本点。'); };
    document.getElementById('kmK').oninput = function(){
      document.getElementById('kmKV').textContent = this.value;
      var k = Number(this.value);
      while(cents.length > k) cents.pop();
      while(cents.length < k) cents.push([Math.random(), Math.random()]);
      assign = pts.map(function(){ return -1; });
      iter = 0; draw(); report('K 已改为 ' + k + '，簇中心重新初始化。');
    };
    document.getElementById('kmN').oninput = function(){ document.getElementById('kmNV').textContent = this.value; gen(); };
    cv.onclick = function(e){
      var r = cv.getBoundingClientRect();
      var x = (e.clientX - r.left) / r.width, y = 1 - (e.clientY - r.top) / r.height;
      pts.push([x, y]); assign.push(-1);
      axes(ctx, cv.width, cv.height);
      var bx = {w:cv.width, h:cv.height};
      pts.forEach(function(p, i){
        var q = toPx(p, bx);
        ctx.beginPath(); ctx.arc(q.x, q.y, 3.4, 0, Math.PI*2);
        ctx.fillStyle = assign[i] >= 0 ? PALETTE[assign[i] % PALETTE.length] : '#b0b7c3';
        ctx.globalAlpha = 0.72; ctx.fill(); ctx.globalAlpha = 1;
      });
      cents.forEach(function(c, j){
        var q = toPx(c, bx);
        ctx.beginPath(); ctx.arc(q.x, q.y, 9, 0, Math.PI*2);
        ctx.fillStyle = PALETTE[j % PALETTE.length]; ctx.fill();
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 2.5; ctx.stroke();
      });
    };
    gen();
  }
});

/* ================= 3. DBSCAN ================= */
BD.labs.push({
  id:'dbscan', name:'DBSCAN 密度聚类', tag:'聚类',
  desc:'调整 eps 与 MinPts，观察核心点、边界点与噪声点如何变化。',
  render:function(box){
    box.innerHTML = '<div class="lab-ctrl">'
      + '<div class="field"><label>邻域半径 eps</label><input type="range" id="dbE" min="2" max="20" value="7"><span class="v" id="dbEV">0.070</span></div>'
      + '<div class="field"><label>最小点数 MinPts</label><input type="range" id="dbM" min="2" max="20" value="5"><span class="v" id="dbMV">5</span></div>'
      + '<div class="field"><label>数据集形状</label><select id="dbShape">'
      + '<option value="crescent">月牙形（K-means 会失败）</option>'
      + '<option value="blobs">球形簇</option>'
      + '<option value="rings">同心环</option></select></div>'
      + '<div class="field"><label>噪声比例</label><input type="range" id="dbNoise" min="0" max="30" value="8"><span class="v" id="dbNoiseV">8%</span></div>'
      + '</div>'
      + '<div id="dbCv"></div><div class="out-box" id="dbOut"></div>';
    var cv = canvasIn(document.getElementById('dbCv'), 640, 380);
    var ctx = cv.getContext('2d');
    var pts = [];

    function gen(){
      pts = [];
      var shape = document.getElementById('dbShape').value;
      var noiseP = Number(document.getElementById('dbNoise').value)/100;
      var n = 200;
      for(var i=0;i<n;i++){
        var x, y;
        if(shape === 'crescent'){
          var t = Math.random()*Math.PI;
          if(i % 2 === 0){ x = 0.22 + 0.24*Math.cos(t); y = 0.5 + 0.24*Math.sin(t); }
          else { x = 0.55 + 0.24*Math.cos(t + Math.PI); y = 0.5 - 0.24*Math.sin(t + Math.PI); }
        } else if(shape === 'rings'){
          var r = (i % 2 === 0) ? 0.14 : 0.32, a = Math.random()*Math.PI*2;
          x = 0.5 + r*Math.cos(a); y = 0.5 + r*Math.sin(a);
        } else {
          var c = [[0.28,0.32],[0.7,0.68],[0.72,0.28]][i % 3];
          x = c[0] + (Math.random()-0.5)*0.22; y = c[1] + (Math.random()-0.5)*0.22;
        }
        x += (Math.random()-0.5)*0.03; y += (Math.random()-0.5)*0.03;
        pts.push([Math.min(0.99,Math.max(0.01,x)), Math.min(0.99,Math.max(0.01,y))]);
      }
      var nz = Math.round(n*noiseP);
      for(var j=0;j<nz;j++) pts.push([Math.random(), Math.random()]);
      run();
    }
    function run(){
      var eps = Number(document.getElementById('dbE').value)/100;
      var minPts = Number(document.getElementById('dbM').value);
      var n = pts.length;
      var nb = [];
      for(var i=0;i<n;i++){
        var list = [];
        for(var j=0;j<n;j++){
          if(i===j) continue;
          var dx = pts[i][0]-pts[j][0], dy = pts[i][1]-pts[j][1];
          if(dx*dx + dy*dy <= eps*eps) list.push(j);
        }
        nb.push(list);
      }
      var kind = new Array(n); // 1 core, 2 border, 3 noise
      for(var a=0;a<n;a++) kind[a] = (nb[a].length + 1 >= minPts) ? 1 : 0;
      var cluster = new Array(n).fill(-1);
      var cid = 0;
      for(var b=0;b<n;b++){
        if(kind[b] !== 1 || cluster[b] >= 0) continue;
        var stack = [b];
        cluster[b] = cid;
        while(stack.length){
          var cur = stack.pop();
          for(var q=0;q<nb[cur].length;q++){
            var o = nb[cur][q];
            if(cluster[o] === -1){
              cluster[o] = cid;
              if(kind[o] === 1) stack.push(o);
            }
          }
        }
        cid++;
      }
      for(var m=0;m<n;m++){ if(cluster[m] === -1 && kind[m] === 0) kind[m] = 3; else if(cluster[m] >= 0 && kind[m] === 0) kind[m] = 2; }
      draw(kind, cluster, eps*100);
      var nCore = kind.filter(function(k){ return k===1; }).length;
      var nBorder = kind.filter(function(k){ return k===2; }).length;
      var nNoise = kind.filter(function(k){ return k===3; }).length;
      var sizes = new Array(cid).fill(0);
      cluster.forEach(function(c){ if(c >= 0) sizes[c]++; });
      var big = sizes.filter(function(s){ return s >= (minPts+1); }).length;
      document.getElementById('dbOut').innerHTML =
        '<span class="k">参数</span> eps = ' + eps.toFixed(3) + '　MinPts = ' + minPts + '\n'
        + '<span class="k">结果</span> 发现簇数 = <span class="y">' + big + '</span>（含 ' + (cid-big) + ' 个过小的簇）\n\n'
        + '核心点 <span class="g">' + nCore + '</span> 个 · 边界点 <span class="p">' + nBorder + '</span> 个 · 噪声点 <span style="color:#fca5a5">' + nNoise + '</span> 个\n'
        + '簇规模： ' + sizes.map(function(s, i){ return '#'+(i+1)+'=' + s; }).filter(function(_, i){ return sizes[i] >= (minPts+1); }).join('  ') + '\n\n'
        + '<span class="y">调参提示</span>\n'
        + '· eps 过大 → 不同簇被连成一片；eps 过小 → 大量点沦为噪声。\n'
        + '· MinPts 过小 → 几乎所有点都是核心点；MinPts 过大 → 噪声点剧增。\n'
        + '· 月牙形数据请对比 K-means：DBSCAN 能找到任意形状的簇，K-means 只能找球状簇。';
    }
    function draw(kind, cluster, epsPct){
      axes(ctx, cv.width, cv.height);
      var bx = {w:cv.width, h:cv.height};
      pts.forEach(function(p, i){
        var q = toPx(p, bx);
        var isNoise = kind[i] === 3;
        ctx.beginPath();
        ctx.arc(q.x, q.y, kind[i] === 1 ? 4.2 : 3.2, 0, Math.PI*2);
        if(isNoise){ ctx.fillStyle = '#111827'; ctx.globalAlpha = 0.85; }
        else { ctx.fillStyle = cluster[i] >= 0 ? PALETTE[cluster[i] % PALETTE.length] : '#b0b7c3'; ctx.globalAlpha = 0.8; }
        ctx.fill(); ctx.globalAlpha = 1;
        if(kind[i] === 1){
          ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 1.4; ctx.stroke();
        }
      });
    }
    ['dbE','dbM','dbNoise'].forEach(function(id){
      document.getElementById(id).oninput = function(){
        if(id === 'dbE') document.getElementById('dbEV').textContent = (this.value/100).toFixed(3);
        if(id === 'dbM') document.getElementById('dbMV').textContent = this.value;
        if(id === 'dbNoise') document.getElementById('dbNoiseV').textContent = this.value + '%';
        if(id === 'dbNoise') gen(); else run();
      };
    });
    document.getElementById('dbShape').onchange = gen;
    gen();
  }
});

/* ================= 4. GMM / EM ================= */
BD.labs.push({
  id:'gmm', name:'高斯混合模型与 EM 算法', tag:'聚类',
  desc:'逐步执行 EM 的 E 步与 M 步，观察高斯成分如何拟合数据。',
  render:function(box){
    box.innerHTML = '<div class="lab-ctrl">'
      + '<div class="field"><label>成分个数 K</label><input type="range" id="gmK" min="2" max="4" value="2"><span class="v" id="gmKV">2</span></div>'
      + '<div class="field"><label>协方差类型</label><select id="gmCov">'
      + '<option value="full">full（可拟合椭球簇）</option>'
      + '<option value="diag">diag（轴对齐）</option>'
      + '<option value="spherical">spherical（等价 K-means）</option></select></div>'
      + '<div class="field"><label>数据集</label><select id="gmShape">'
      + '<option value="ellip">两个方向不同的椭球簇</option>'
      + '<option value="close">两个相互靠近的簇</option>'
      + '<option value="var">两簇密度差异大</option></select></div>'
      + '</div>'
      + '<div class="btn-row" style="margin-bottom:12px">'
      + '<button class="btn primary" id="gmStep">执行一步 EM</button>'
      + '<button class="btn" id="gmRun">自动运行</button>'
      + '<button class="btn" id="gmReset">重新初始化</button></div>'
      + '<div id="gmCv"></div><div class="out-box" id="gmOut"></div>';
    var cv = canvasIn(document.getElementById('gmCv'), 640, 380);
    var ctx = cv.getContext('2d');
    var pts = [], comps = [], iter = 0, running = null, ll = 0;

    function gen(){
      pts = [];
      var shape = document.getElementById('gmShape').value;
      var n = 240;
      for(var i=0;i<n;i++){
        var x, y;
        if(shape === 'ellip'){
          if(i % 2 === 0){ var t1 = Math.random()*Math.PI*2, r1 = Math.sqrt(Math.random())*0.11;
            x = 0.34 + r1*Math.cos(t1)*1.9; y = 0.5 + r1*Math.sin(t1)*0.6; }
          else { var t2 = Math.random()*Math.PI*2, r2 = Math.sqrt(Math.random())*0.10;
            x = 0.68 + r2*Math.cos(t2)*0.5; y = 0.46 + r2*Math.sin(t2)*1.7; }
        } else if(shape === 'close'){
          var c = (i % 2 === 0) ? [0.40,0.5] : [0.56,0.5];
          x = c[0] + (Math.random()-0.5)*0.20; y = c[1] + (Math.random()-0.5)*0.20;
        } else {
          if(i % 3 === 0){ x = 0.28 + (Math.random()-0.5)*0.14; y = 0.66 + (Math.random()-0.5)*0.14; }
          else { x = 0.66 + (Math.random()-0.5)*0.42; y = 0.36 + (Math.random()-0.5)*0.42; }
        }
        pts.push([Math.min(0.99,Math.max(0.01,x)), Math.min(0.99,Math.max(0.01,y))]);
      }
      init();
    }
    function init(){
      var k = Number(document.getElementById('gmK').value);
      comps = [];
      for(var i=0;i<k;i++){
        var p = pts[Math.floor(Math.random()*pts.length)] || [Math.random(), Math.random()];
        comps.push({ pi:1/k, mu:[p[0]+(Math.random()-0.5)*0.08, p[1]+(Math.random()-0.5)*0.08],
          s:[[0.02,0],[0,0.02]] });
      }
      iter = 0; resp = null; draw(); report('参数已随机初始化。执行 E 步计算责任度，M 步更新参数。');
    }
    var resp = null;

    function gauss(p, c){
      var d0 = p[0]-c.mu[0], d1 = p[1]-c.mu[1];
      var s = c.s, det = s[0][0]*s[1][1] - s[0][1]*s[1][0];
      if(det < 1e-12) det = 1e-12;
      var inv = [[s[1][1]/det, -s[0][1]/det], [-s[1][0]/det, s[0][0]/det]];
      var e = -(d0*(inv[0][0]*d0 + inv[0][1]*d1) + d1*(inv[1][0]*d0 + inv[1][1]*d1)) / 2;
      return Math.exp(e) / (2*Math.PI*Math.sqrt(Math.abs(det)) + 1e-300);
    }
    function estep(){
      resp = pts.map(function(p){
        var w = comps.map(function(c){ return c.pi * gauss(p, c); });
        var s = w.reduce(function(a,b){ return a+b; }, 0) || 1e-300;
        return w.map(function(v){ return v/s; });
      });
    }
    function mstep(){
      var k = comps.length, n = pts.length;
      var covType = document.getElementById('gmCov').value;
      var Nk = comps.map(function(){ return 0; });
      resp.forEach(function(r){ r.forEach(function(v, j){ Nk[j] += v; }); });
      comps.forEach(function(c, j){
        var nk = Nk[j] || 1e-9;
        c.pi = nk / n;
        var mx = 0, my = 0;
        pts.forEach(function(p, i){ mx += resp[i][j]*p[0]; my += resp[i][j]*p[1]; });
        c.mu = [mx/nk, my/nk];
        var sxx=0, syy=0, sxy=0;
        pts.forEach(function(p, i){
          var dx = p[0]-c.mu[0], dy = p[1]-c.mu[1], w = resp[i][j];
          sxx += w*dx*dx; syy += w*dy*dy; sxy += w*dx*dy;
        });
        var reg = 1e-4;
        if(covType === 'full') c.s = [[sxx/nk + reg, sxy/nk], [sxy/nk, syy/nk + reg]];
        else if(covType === 'diag') c.s = [[sxx/nk + reg, 0], [0, syy/nk + reg]];
        else { var v = (sxx + syy)/(2*nk) + reg; c.s = [[v,0],[0,v]]; }
      });
    }
    function loglik(){
      var s = 0;
      pts.forEach(function(p){
        var w = comps.map(function(c){ return c.pi * gauss(p, c); }).reduce(function(a,b){ return a+b; }, 0);
        s += Math.log(w + 1e-300);
      });
      return s;
    }
    function step(){
      estep(); mstep(); iter++;
      ll = loglik();
      draw(); report();
    }
    function draw(){
      axes(ctx, cv.width, cv.height);
      var bx = {w:cv.width, h:cv.height};
      pts.forEach(function(p, i){
        var q = toPx(p, bx);
        var j = 0, best = -1;
        if(resp && resp[i]){ resp[i].forEach(function(v, t){ if(v > best){ best = v; j = t; } }); }
        ctx.beginPath(); ctx.arc(q.x, q.y, 3.3, 0, Math.PI*2);
        ctx.fillStyle = PALETTE[j % PALETTE.length];
        ctx.globalAlpha = resp && resp[i] ? (0.25 + 0.65*best) : 0.7;
        ctx.fill(); ctx.globalAlpha = 1;
      });
      comps.forEach(function(c, j){
        var col = PALETTE[j % PALETTE.length];
        var q = toPx(c.mu, bx);
        var a = c.s[0][0], b = c.s[0][1], d = c.s[1][1];
        var tr = a + d, det = a*d - b*b;
        var l1 = tr/2 + Math.sqrt(Math.max(0, tr*tr/4 - det));
        var l2 = tr/2 - Math.sqrt(Math.max(0, tr*tr/4 - det));
        var ang = Math.abs(b) < 1e-9 ? (a >= d ? 0 : Math.PI/2) : Math.atan2(l1 - a, b);
        ctx.save();
        ctx.translate(q.x, q.y);
        ctx.rotate(-ang);
        ctx.beginPath();
        ctx.ellipse(0, 0, Math.sqrt(Math.max(l1,1e-8))*bx.w*2.45, Math.sqrt(Math.max(l2,1e-8))*bx.h*2.45, 0, 0, Math.PI*2);
        ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.setLineDash([5,4]); ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
        ctx.beginPath(); ctx.arc(q.x, q.y, 6, 0, Math.PI*2);
        ctx.fillStyle = col; ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
      });
    }
    function report(extra){
      var t = '<span class="k">第 ' + iter + ' 轮 EM</span>\n'
        + '对数似然 log L = <span class="y">' + (iter? ll.toFixed(2) : '—') + '</span>\n\n'
        + '各高斯成分参数：\n' + comps.map(function(c, i){
          return '  成分' + (i+1) + '  π = ' + c.pi.toFixed(3)
            + '　μ = ( ' + c.mu[0].toFixed(3) + ' , ' + c.mu[1].toFixed(3) + ' )'
            + '　σ² = ( ' + c.s[0][0].toFixed(4) + ' , ' + c.s[1][1].toFixed(4) + ' )';
        }).join('\n')
        + '\n\nE 步：用当前参数计算每个样本属于各成分的后验概率（责任度 γ）。\n'
        + 'M 步：用 γ 加权重新估计 π、μ、Σ。\n'
        + '点的透明度代表归属该成分的概率高低——这就是软分配，与 K-means 的硬分配不同。'
        + (covType() === 'spherical' ? '\n\n当前协方差类型为 spherical，各成分等方差各向同性，等价于 K-means 的假设。' : '')
        + (covType() === 'full' ? '\n\n当前协方差类型为 full，虚线椭圆可以对角倾斜——这是 GMM 相对 K-means 的核心优势。' : '');
      if(extra) t += '\n\n' + extra;
      document.getElementById('gmOut').innerHTML = t;
    }
    function covType(){ return document.getElementById('gmCov').value; }

    document.getElementById('gmStep').onclick = step;
    document.getElementById('gmRun').onclick = function(){
      if(running){ clearInterval(running); running = null; this.textContent = '自动运行'; return; }
      this.textContent = '暂停';
      var self = this, last = -Infinity, same = 0;
      running = setInterval(function(){
        var prev = ll; step();
        if(iter > 1 && Math.abs(ll - prev) < 0.01) same++; else same = 0;
        if(same >= 3 || iter > 80){
          clearInterval(running); running = null; self.textContent = '自动运行';
          report('已收敛：对数似然变化小于阈值。EM 算法保证似然单调不减，但只能收敛到局部最优——试试点击「重新初始化」看是否得到不同结果。');
        }
      }, 420);
    };
    document.getElementById('gmReset').onclick = init;
    document.getElementById('gmK').oninput = function(){
      document.getElementById('gmKV').textContent = this.value;
      var k = Number(this.value);
      while(comps.length > k) comps.pop();
      while(comps.length < k) comps.push({pi:1/k, mu:[Math.random(), Math.random()], s:[[0.02,0],[0,0.02]]});
      init();
    };
    document.getElementById('gmCov').onchange = init;
    document.getElementById('gmShape').onchange = gen;
    gen();
  }
});
})();