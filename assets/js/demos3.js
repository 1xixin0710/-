/* 算法交互实验室（三）：ROC 与混淆矩阵 / TF-IDF / 协同过滤 */
(function(){
'use strict';
var BD = window.BD;

function canvasIn(parent, w, h){
  var cv = document.createElement('canvas');
  cv.className = 'plot'; cv.width = w; cv.height = h;
  cv.style.width = '100%'; cv.style.maxWidth = w + 'px';
  parent.appendChild(cv); return cv;
}

/* ================= 8. 混淆矩阵与 ROC ================= */
BD.labs.push({
  id:'roc', name:'混淆矩阵与 ROC 曲线', tag:'模型评估',
  desc:'调整模型区分能力与分类阈值，观察精确率、召回率与 AUC 的变化。',
  render:function(box){
    box.innerHTML = '<div class="lab-ctrl">'
      + '<div class="field"><label>样本总数</label><input type="range" id="rcN" min="100" max="2000" step="100" value="1000"><span class="v" id="rcNV">1000</span></div>'
      + '<div class="field"><label>正样本比例</label><input type="range" id="rcP" min="1" max="50" value="10"><span class="v" id="rcPV">10%</span></div>'
      + '<div class="field"><label>模型区分能力</label><input type="range" id="rcSep" min="1" max="40" value="16"><span class="v" id="rcSepV">中等</span></div>'
      + '<div class="field"><label>分类阈值</label><input type="range" id="rcTh" min="0" max="100" value="50"><span class="v" id="rcThV">0.50</span></div>'
      + '</div>'
      + '<div class="grid g2" style="align-items:start"><div id="rcCv"></div><div id="rcInfo"></div></div>'
      + '<div class="btn-row" style="margin-top:12px"><button class="btn" id="rcGen">重新生成数据</button></div>';
    var cv = canvasIn(document.getElementById('rcCv'), 400, 400);
    var ctx = cv.getContext('2d');
    var data = [], auc = 0;

    function gen(){
      var n = Number(document.getElementById('rcN').value);
      var pPos = Number(document.getElementById('rcP').value)/100;
      var sep = Number(document.getElementById('rcSep').value)/40;
      data = [];
      for(var i=0;i<n;i++){
        var y = Math.random() < pPos ? 1 : 0;
        var base = y ? 0.5 + sep*0.45 : 0.5 - sep*0.45;
        var s = base + (Math.random()+Math.random()+Math.random()-1.5)*0.28;
        s = Math.max(0, Math.min(1, s));
        data.push({y:y, s:s});
      }
      data.sort(function(a,b){ return b.s - a.s; });
      var pos = data.filter(function(d){ return d.y===1; }).length;
      var neg = data.length - pos;
      // AUC by trapezoid
      var tp = 0, fp = 0, prevTpr = 0, prevFpr = 0;
      auc = 0;
      data.forEach(function(d){
        if(d.y === 1) tp++; else fp++;
        var tpr = tp/pos, fpr = fp/neg;
        auc += (fpr - prevFpr) * (tpr + prevTpr)/2;
        prevTpr = tpr; prevFpr = fpr;
      });
      draw(); report();
    }
    function metrics(th){
      var tp=0, fp=0, fn=0, tn=0;
      data.forEach(function(d){
        var pred = d.s >= th ? 1 : 0;
        if(d.y===1 && pred===1) tp++;
        else if(d.y===0 && pred===1) fp++;
        else if(d.y===1 && pred===0) fn++;
        else tn++;
      });
      var P = tp+fp ? tp/(tp+fp) : 0;
      var R = tp+fn ? tp/(tp+fn) : 0;
      var A = (tp+tn)/data.length;
      var F = (P+R) ? 2*P*R/(P+R) : 0;
      var FPR = (fp+tn) ? fp/(fp+tn) : 0;
      return {tp:tp,fp:fp,fn:fn,tn:tn,P:P,R:R,A:A,F:F,FPR:FPR,TPR:R};
    }
    function draw(){
      var w = cv.width, h = cv.height, pad = 44;
      ctx.clearRect(0,0,w,h);
      ctx.fillStyle = '#fdfdfe'; ctx.fillRect(0,0,w,h);
      ctx.strokeStyle = '#eef0f4';
      for(var i=1;i<5;i++){
        ctx.beginPath(); ctx.moveTo(pad, pad+(h-2*pad)*i/5); ctx.lineTo(w-pad, pad+(h-2*pad)*i/5); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(pad+(w-2*pad)*i/5, pad); ctx.lineTo(pad+(w-2*pad)*i/5, h-pad); ctx.stroke();
      }
      ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.moveTo(pad, h-pad); ctx.lineTo(w-pad, h-pad); ctx.moveTo(pad, h-pad); ctx.lineTo(pad, pad); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(pad, h-pad); ctx.lineTo(w-pad, pad); ctx.setLineDash([5,4]); ctx.strokeStyle = '#cbd5e1'; ctx.stroke(); ctx.setLineDash([]);
      // 曲线
      var pos = data.filter(function(d){ return d.y===1; }).length || 1;
      var neg = data.length - pos || 1;
      var tp = 0, fp = 0;
      ctx.beginPath();
      ctx.moveTo(pad, h-pad);
      data.forEach(function(d){
        if(d.y===1) tp++; else fp++;
        ctx.lineTo(pad + (w-2*pad)*(fp/neg), h-pad - (h-2*pad)*(tp/pos));
      });
      ctx.lineTo(w-pad, h-pad);
      ctx.fillStyle = 'rgba(79,70,229,.14)'; ctx.fill();
      ctx.strokeStyle = '#4f46e5'; ctx.lineWidth = 2.2; ctx.stroke();
      // 当前阈值点
      var m = metrics(Number(document.getElementById('rcTh').value)/100);
      var x = pad + (w-2*pad)*m.FPR, y = h-pad - (h-2*pad)*m.TPR;
      ctx.beginPath(); ctx.arc(x, y, 6, 0, Math.PI*2);
      ctx.fillStyle = '#dc2626'; ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 2.2; ctx.stroke();
      // 标注
      ctx.fillStyle = '#475467'; ctx.font = '11px sans-serif';
      ctx.fillText('假正率 FPR →', w-pad-84, h-pad+30);
      ctx.save(); ctx.translate(16, pad+90); ctx.rotate(-Math.PI/2);
      ctx.fillText('真正率 TPR →', 0, 0); ctx.restore();
      ctx.fillStyle = 'rgba(79,70,229,.9)'; ctx.font = 'bold 13px sans-serif';
      ctx.fillText('AUC = ' + auc.toFixed(3), pad + 14, pad + 20);
      ctx.fillStyle = '#dc2626'; ctx.font = '11px sans-serif';
      ctx.fillText('当前阈值', x + 9, y - 8);
    }
    function report(){
      var th = Number(document.getElementById('rcTh').value)/100;
      var m = metrics(th);
      var sep = Number(document.getElementById('rcSep').value);
      var sepTxt = sep <= 10 ? '很弱（接近随机猜测）' : sep <= 20 ? '中等' : sep <= 30 ? '较强' : '很强';
      var html = '<div class="card" style="border:0;box-shadow:none;padding:0">'
        + '<div class="sect-title">混淆矩阵（阈值 ' + th.toFixed(2) + '）</div>'
        + '<table class="tbl"><tr><th></th><th>预测为正</th><th>预测为负</th><th>合计</th></tr>'
        + '<tr><td><b>实际为正</b></td><td class="num" style="background:var(--green-soft);color:var(--green);font-weight:700">TP = ' + m.tp + '</td>'
        + '<td class="num" style="background:var(--red-soft);color:var(--red);font-weight:700">FN = ' + m.fn + '</td><td class="num">' + (m.tp+m.fn) + '</td></tr>'
        + '<tr><td><b>实际为负</b></td><td class="num" style="background:var(--red-soft);color:var(--red);font-weight:700">FP = ' + m.fp + '</td>'
        + '<td class="num" style="background:var(--green-soft);color:var(--green);font-weight:700">TN = ' + m.tn + '</td><td class="num">' + (m.fp+m.tn) + '</td></tr>'
        + '<tr><td><b>合计</b></td><td class="num">' + (m.tp+m.fp) + '</td><td class="num">' + (m.fn+m.tn) + '</td><td class="num">' + data.length + '</td></tr></table>'
        + '<div class="report-grid" style="margin-top:14px">'
        + '<div class="rep"><div class="n">准确率</div><div class="v">' + (m.A*100).toFixed(1) + '<span class="small muted">%</span></div></div>'
        + '<div class="rep"><div class="n">精确率</div><div class="v" style="color:var(--accent)">' + (m.P*100).toFixed(1) + '<span class="small muted">%</span></div></div>'
        + '<div class="rep"><div class="n">召回率</div><div class="v" style="color:var(--teal)">' + (m.R*100).toFixed(1) + '<span class="small muted">%</span></div></div>'
        + '<div class="rep"><div class="n">F1 分数</div><div class="v">' + m.F.toFixed(3) + '</div></div>'
        + '</div>'
        + '<div class="note' + (m.A > 0.9 && auc < 0.7 ? ' bad' : '') + '" style="margin-top:14px">'
        + '<b>模型区分能力：</b>' + sepTxt + '，AUC = <b>' + auc.toFixed(3) + '</b>。<br>'
        + '注意准确率 ' + (m.A*100).toFixed(1) + '% 与 AUC ' + auc.toFixed(3) + ' 的对比：'
        + (m.A > 0.85 && auc < 0.72
            ? '正样本仅占 ' + (Number(document.getElementById('rcP').value)) + '%，即使模型几乎没有区分能力，准确率也显得很高——这就是「准确率陷阱」。'
            : '拖动阈值滑块可以看到精确率与召回率的此消彼长。')
        + '</div></div>';
      document.getElementById('rcInfo').innerHTML = html;
    }
    ['rcN','rcP','rcSep'].forEach(function(id){
      document.getElementById(id).oninput = function(){
        if(id === 'rcN') document.getElementById('rcNV').textContent = this.value;
        if(id === 'rcP') document.getElementById('rcPV').textContent = this.value + '%';
        if(id === 'rcSep'){
          var v = Number(this.value);
          document.getElementById('rcSepV').textContent = v<=10?'很弱':v<=20?'中等':v<=30?'较强':'很强';
        }
        gen();
      };
    });
    document.getElementById('rcTh').oninput = function(){
      document.getElementById('rcThV').textContent = (this.value/100).toFixed(2);
      draw(); report();
    };
    document.getElementById('rcGen').onclick = gen;
    gen();
  }
});

/* ================= 9. TF-IDF 与余弦相似度 ================= */
BD.labs.push({
  id:'tfidf', name:'TF-IDF 与余弦相似度', tag:'文本分析',
  desc:'手工计算词频、逆文档频率与文本相似度，理解推荐与检索的基础。',
  render:function(box){
    box.innerHTML = '<div class="lab-ctrl">'
      + '<div class="field" style="grid-column:1/-1"><label>文档一（词语之间用空格或逗号分隔）</label>'
      + '<textarea id="tfA">大数据 分析 原理 实践 数据挖掘 算法</textarea></div>'
      + '<div class="field" style="grid-column:1/-1"><label>文档二</label>'
      + '<textarea id="tfB">大数据 分析 原理 可视化 数据挖掘 商业</textarea></div>'
      + '</div><div id="tfOut"></div>';
    function run(){
      var A = document.getElementById('tfA').value.split(/[\s,，、;；]+/).filter(Boolean);
      var B = document.getElementById('tfB').value.split(/[\s,，、;；]+/).filter(Boolean);
      var docs = [A, B];
      var vocab = [];
      docs.forEach(function(d){ d.forEach(function(w){ if(vocab.indexOf(w) < 0) vocab.push(w); }); });
      if(!vocab.length){ document.getElementById('tfOut').innerHTML = '<div class="note bad">请输入文本</div>'; return; }
      var N = 2;
      var df = {};
      vocab.forEach(function(w){
        df[w] = docs.filter(function(d){ return d.indexOf(w) >= 0; }).length;
      });
      function vec(d){
        var tf = {};
        d.forEach(function(w){ tf[w] = (tf[w]||0)+1; });
        return vocab.map(function(w){
          var t = (tf[w]||0) / d.length;
          var idf = Math.log(N / (df[w] || 1)) + 1;
          return t * idf;
        });
      }
      var va = vec(A), vb = vec(B);
      function cos(x, y){
        var dot = 0, nx = 0, ny = 0;
        for(var i=0;i<x.length;i++){ dot += x[i]*y[i]; nx += x[i]*x[i]; ny += y[i]*y[i]; }
        return (nx && ny) ? dot/(Math.sqrt(nx)*Math.sqrt(ny)) : 0;
      }
      var c = cos(va, vb);
      var html = '<div class="grid g2">';
      html += '<div class="card" style="border:0;box-shadow:none;padding:0"><div class="sect-title">词项统计</div>'
        + '<table class="tbl"><tr><th>词项</th><th>文档一 TF</th><th>文档二 TF</th><th>DF</th><th>IDF</th></tr>';
      vocab.forEach(function(w, i){
        var tfA = A.filter(function(x){ return x===w; }).length / A.length;
        var tfB = B.filter(function(x){ return x===w; }).length / B.length;
        var idf = Math.log(N/(df[w]||1)) + 1;
        html += '<tr><td>' + w + '</td><td class="num">' + tfA.toFixed(3) + '</td><td class="num">' + tfB.toFixed(3) + '</td>'
          + '<td class="num">' + df[w] + '</td><td class="num">' + idf.toFixed(3) + '</td></tr>';
      });
      html += '</table><div class="note" style="margin-top:12px"><b>IDF 的作用：</b>'
        + '在两篇文档中都出现的词 IDF = 1（最小值），只在一篇中出现的词 IDF = 1.693（最大值）。'
        + '这说明 TF-IDF 会自动降低「所有文档都有的常见词」的权重，突出区分度高的词。样本只有 2 篇文档，'
        + '真实语料中 IDF 的区分能力会明显得多。</div></div>';

      html += '<div class="card" style="border:0;box-shadow:none;padding:0"><div class="sect-title">TF-IDF 向量与相似度</div>'
        + '<table class="tbl"><tr><th>词项</th><th>文档一权重</th><th>文档二权重</th></tr>';
      vocab.forEach(function(w, i){
        html += '<tr><td>' + w + '</td><td class="num">' + va[i].toFixed(4) + '</td><td class="num">' + vb[i].toFixed(4) + '</td></tr>';
      });
      html += '</table>';
      html += '<div class="report-grid" style="margin-top:14px">'
        + '<div class="rep"><div class="n">余弦相似度</div><div class="v" style="color:var(--accent)">' + c.toFixed(4) + '</div></div>'
        + '<div class="rep"><div class="n">相似度百分比</div><div class="v">' + (c*100).toFixed(1) + '<span class="small muted">%</span></div></div>'
        + '<div class="rep"><div class="n">共同词项</div><div class="v">' + vocab.filter(function(w){ return df[w]===2; }).length + '</div></div>'
        + '</div>';
      html += '<div class="note ok" style="margin-top:12px"><b>结论：</b>两篇文档的余弦相似度为 <b>' + c.toFixed(4) + '</b>，'
        + (c > 0.7 ? '相似度很高，属于同一主题。' : c > 0.4 ? '有一定相似度，主题部分重叠。' : '相似度较低，主题差异较大。')
        + '余弦相似度只关注向量的方向，不关心长度——文档长短不会影响相似度计算结果，'
        + '这正是它在文本检索与协同过滤中被广泛使用的原因。</div></div></div>';
      document.getElementById('tfOut').innerHTML = html;
    }
    document.getElementById('tfA').oninput = run;
    document.getElementById('tfB').oninput = run;
    run();
  }
});

/* ================= 10. 协同过滤推荐 ================= */
BD.labs.push({
  id:'cf', name:'协同过滤推荐', tag:'推荐系统',
  desc:'基于用户-物品评分矩阵，用皮尔逊相似度预测评分并生成 Top-N 推荐。',
  render:function(box){
    box.innerHTML = '<div class="lab-ctrl">'
      + '<div class="field" style="grid-column:1/-1"><label>用户-物品评分矩阵（每行一个用户：用户名,物品1,物品2,…，空表示未评分）</label>'
      + '<textarea id="cfM" style="min-height:140px">小明,5,,4,3,\n小红,4,5,,2,\n小刚,5,4,5,3,1\n小美,,3,4,5,2\n小强,3,,,4,3</textarea></div>'
      + '<div class="field"><label>相似度度量</label><select id="cfSim">'
      + '<option value="pearson">皮尔逊相关系数</option><option value="cosine">余弦相似度</option></select></div>'
      + '<div class="field"><label>邻居数量 K</label><input type="range" id="cfK" min="1" max="4" value="2"><span class="v" id="cfKV">2</span></div>'
      + '<div class="field"><label>为目标用户推荐</label><select id="cfU"></select></div>'
      + '</div><div id="cfOut"></div>';
    function run(){
      var lines = document.getElementById('cfM').value.split('\n').map(function(l){
        return l.split(/[,，\t]+/).map(function(s){ return s.trim(); });
      }).filter(function(l){ return l.length > 2; });
      if(lines.length < 2){ document.getElementById('cfOut').innerHTML = '<div class="note bad">至少需要 2 个用户</div>'; return; }
      var users = lines.map(function(l){ return l[0]; });
      var items = [];
      lines.forEach(function(l){
        for(var i=1;i<l.length;i++){ if(items.indexOf('物品'+i) < 0) items.push('物品'+i); }
      });
      var M = {};
      lines.forEach(function(l){
        M[l[0]] = {};
        for(var i=1;i<l.length;i++){
          var v = parseFloat(l[i]);
          if(!isNaN(v)) M[l[0]]['物品'+i] = v;
        }
      });
      var sel = document.getElementById('cfU');
      var want = sel.value;
      if(!want || users.indexOf(want) < 0) want = users[0];
      sel.innerHTML = users.map(function(u){ return '<option' + (u===want? ' selected':'') + '>' + u + '</option>'; }).join('');
      var K = Number(document.getElementById('cfK').value);
      var simMode = document.getElementById('cfSim').value;

      function common(a, b){
        var ks = Object.keys(M[a]).filter(function(k){ return M[b][k] !== undefined; });
        return ks;
      }
      function sim(a, b){
        var ks = common(a, b);
        if(ks.length < 2) return 0;
        if(simMode === 'cosine'){
          var d=0, na=0, nb=0;
          ks.forEach(function(k){ d += M[a][k]*M[b][k]; na += M[a][k]**2; nb += M[b][k]**2; });
          return (na && nb) ? d/(Math.sqrt(na)*Math.sqrt(nb)) : 0;
        }
        var ma = 0, mb = 0;
        ks.forEach(function(k){ ma += M[a][k]; mb += M[b][k]; });
        ma /= ks.length; mb /= ks.length;
        var num=0, da=0, db=0;
        ks.forEach(function(k){ num += (M[a][k]-ma)*(M[b][k]-mb); da += (M[a][k]-ma)**2; db += (M[b][k]-mb)**2; });
        return (da && db) ? num/(Math.sqrt(da)*Math.sqrt(db)) : 0;
      }
      var sims = users.filter(function(u){ return u !== want; })
        .map(function(u){ return {u:u, s:sim(want, u), n:common(want, u).length}; })
        .sort(function(a,b){ return b.s - a.s; });
      var neighbors = sims.slice(0, K);

      var preds = [];
      items.forEach(function(it){
        if(M[want][it] !== undefined) return;
        var num = 0, den = 0;
        neighbors.forEach(function(nb){
          var r = M[nb.u][it];
          if(r === undefined) return;
          var ma = 0, ks = Object.keys(M[want]);
          ma = ks.reduce(function(a,k){ return a + M[want][k]; }, 0) / Math.max(1, ks.length);
          num += nb.s * (r - ma);
          den += Math.abs(nb.s);
        });
        if(den === 0) return;
        var ma = Object.keys(M[want]).reduce(function(a,k){ return a + M[want][k]; }, 0) / Math.max(1, Object.keys(M[want]).length);
        preds.push({item:it, score: ma + num/den});
      });
      preds.sort(function(a,b){ return b.score - a.score; });

      var html = '<div class="grid g2">';
      html += '<div class="card" style="border:0;box-shadow:none;padding:0"><div class="sect-title">评分矩阵</div>'
        + '<table class="tbl"><tr><th>用户</th>' + items.map(function(i){ return '<th>' + i + '</th>'; }).join('') + '</tr>';
      users.forEach(function(u){
        html += '<tr' + (u===want? ' class="hl"':'') + '><td>' + u + (u===want? ' ★':'') + '</td>'
          + items.map(function(i){
              var v = M[u][i];
              return '<td class="num">' + (v === undefined ? '<span class="muted">—</span>' : v) + '</td>';
            }).join('') + '</tr>';
      });
      html += '</table>';
      html += '<div class="sect-title" style="margin-top:18px">相似度与共同评分项</div>'
        + '<table class="tbl"><tr><th>用户</th><th>相似度</th><th>共同评分物品数</th><th>是否入选邻居</th></tr>';
      sims.forEach(function(s){
        var isN = neighbors.some(function(n){ return n.u === s.u; });
        html += '<tr' + (isN? ' class="hl"':'') + '><td>' + s.u + '</td>'
          + '<td class="num" style="color:' + (s.s>0? 'var(--green)':'var(--red)') + '">' + s.s.toFixed(3) + '</td>'
          + '<td class="num">' + s.n + '</td><td>' + (isN? '✓ 邻居' : '—') + '</td></tr>';
      });
      html += '</table></div>';

      html += '<div class="card" style="border:0;box-shadow:none;padding:0"><div class="sect-title">为「' + want + '」生成的推荐</div>';
      if(!preds.length){
        html += '<div class="note warn">该用户没有可预测的未评分物品，或邻居都没有对这些物品评分。可以试试换个用户或调整邻居数量 K。</div>';
      } else {
        html += '<table class="tbl"><tr><th>排名</th><th>物品</th><th>预测评分</th><th>推荐强度</th></tr>';
        preds.slice(0, 5).forEach(function(p, i){
          var w = Math.max(0, Math.min(100, (p.score/5)*100));
          html += '<tr' + (i===0? ' class="hl"':'') + '><td class="num">' + (i+1) + '</td><td><b>' + p.item + '</b></td>'
            + '<td class="num">' + p.score.toFixed(3) + '</td>'
            + '<td><div class="bar thin" style="width:100px"><i style="width:' + w.toFixed(1) + '%"></i></div></td></tr>';
        });
        html += '</table>';
      }
      html += '<div class="note ok" style="margin-top:12px"><b>计算过程：</b>预测评分 = 目标用户平均分 + Σ(相似度 × (邻居评分 − 邻居平均分)) / Σ|相似度|。'
        + '本次使用 ' + (simMode === 'pearson' ? '皮尔逊相关系数' : '余弦相似度') + '，取相似度最高的 ' + neighbors.length + ' 个邻居。'
        + (simMode === 'cosine' ? '注意：余弦相似度没有减去用户均值，因此对「有人爱打高分、有人爱打低分」的评分尺度差异不敏感，可以切换成皮尔逊对比结果差异。' : '皮尔逊先减去各自均值，能消除用户评分尺度差异——这是它相比余弦相似度的重要优势。')
        + '</div></div></div>';
      document.getElementById('cfOut').innerHTML = html;
      // 绑定 select
      var sel2 = document.getElementById('cfU');
      sel2.onchange = run;
    }
    document.getElementById('cfM').oninput = run;
    document.getElementById('cfSim').onchange = run;
    document.getElementById('cfK').oninput = function(){ document.getElementById('cfKV').textContent = this.value; run(); };
    run();
  }
});
})();