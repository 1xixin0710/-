/* 算法交互实验室（二）：Apriori / 信息增益 / PageRank */
(function(){
'use strict';
var BD = window.BD;

/* ================= 5. Apriori 关联规则 ================= */
BD.labs.push({
  id:'apriori', name:'Apriori 关联规则挖掘', tag:'关联规则',
  desc:'输入交易数据，实时计算支持度、置信度与提升度。',
  render:function(box){
    box.innerHTML = '<div class="lab-ctrl">'
      + '<div class="field" style="grid-column:1/-1"><label>交易数据（每行一笔交易，商品用逗号分隔）</label>'
      + '<textarea id="apTx" style="min-height:120px">牛奶,面包,尿布\n啤酒,面包,尿布\n牛奶,尿布\n牛奶,面包,啤酒\n啤酒,尿布\n牛奶,面包,尿布,啤酒\n面包,尿布\n牛奶,面包</textarea></div>'
      + '<div class="field"><label>最小支持度计数</label><input type="range" id="apS" min="1" max="6" value="3"><span class="v" id="apSV">3</span></div>'
      + '<div class="field"><label>最小置信度</label><input type="range" id="apC" min="10" max="100" step="5" value="60"><span class="v" id="apCV">60%</span></div>'
      + '</div>'
      + '<div id="apOut"></div>';
    function run(){
      var lines = document.getElementById('apTx').value.split('\n').map(function(l){
        return l.split(/[,，、\s]+/).filter(Boolean);
      }).filter(function(l){ return l.length; });
      var n = lines.length;
      var minSup = Number(document.getElementById('apS').value);
      var minConf = Number(document.getElementById('apC').value)/100;
      if(n < 2){ document.getElementById('apOut').innerHTML = '<div class="note bad">至少需要 2 笔交易</div>'; return; }

      var sup = {};
      function countSets(sets){
        sets.forEach(function(s){
          var key = s.slice().sort().join('|');
          sup[key] = (sup[key]||0) + 1;
        });
      }
      // 1项集
      var items = {};
      lines.forEach(function(l){ l.forEach(function(it){ items[it] = (items[it]||0)+1; }); });
      var L1 = Object.keys(items).filter(function(k){ return items[k] >= minSup; });
      L1.forEach(function(k){ sup[k] = items[k]; });
      // 2项集
      var L2 = [], c2 = {};
      for(var i=0;i<L1.length;i++) for(var j=i+1;j<L1.length;j++){
        var a = L1[i], b = L1[j], c = 0;
        lines.forEach(function(l){ if(l.indexOf(a) >= 0 && l.indexOf(b) >= 0) c++; });
        if(c >= minSup){ var k2 = [a,b].sort().join('|'); sup[k2] = c; L2.push([a,b]); }
      }
      // 3项集
      var L3 = [];
      for(var x=0;x<L2.length;x++) for(var y=x+1;y<L2.length;y++){
        var u = L2[x].concat(L2[y]).filter(function(v,i,arr){ return arr.indexOf(v)===i; });
        if(u.length !== 3) continue;
        var key3 = u.slice().sort().join('|');
        if(sup[key3] !== undefined) continue;
        var cc = 0;
        lines.forEach(function(l){ if(u.every(function(it){ return l.indexOf(it) >= 0; })) cc++; });
        if(cc >= minSup){ sup[key3] = cc; L3.push(u); }
      }

      var html = '<div class="grid g2">';
      html += '<div class="card" style="border:0;box-shadow:none;padding:0"><div class="sect-title">频繁项集（最小支持度计数 ' + minSup + '）</div>'
        + '<table class="tbl"><tr><th>项集</th><th>支持度计数</th><th>支持度</th></tr>';
      function row(set, c){
        return '<tr><td>' + set.join(' , ') + '</td><td class="num">' + c + '</td><td class="num">' + (c/n*100).toFixed(1) + '%</td></tr>';
      }
      L1.forEach(function(k){ html += row([k], sup[k]); });
      L2.forEach(function(s){ html += row(s, sup[s.slice().sort().join('|')]); });
      L3.forEach(function(s){ html += row(s, sup[s.slice().sort().join('|')]); });
      if(!L1.length) html += '<tr><td colspan="3" class="muted">支持度阈值过高，没有频繁项集</td></tr>';
      html += '</table></div>';

      // 规则
      var rules = [];
      function emit(from, to){
        var fs = from.slice().sort().join('|'), ts = to.slice().sort().join('|');
        var both = from.concat(to).slice().sort().join('|');
        var sBoth = sup[both], sFrom = sup[fs];
        if(!sBoth || !sFrom) return;
        var sTo = sup[ts] || 0;
        var conf = sBoth / sFrom;
        if(conf < minConf) return;
        var lift = sTo? conf / (sTo/n) : 0;
        rules.push({x:from, y:to, sup:sBoth/n, conf:conf, lift:lift, sBoth:sBoth, sFrom:sFrom, sTo:sTo});
      }
      L2.forEach(function(s){
        emit([s[0]],[s[1]]); emit([s[1]],[s[0]]);
      });
      L3.forEach(function(s){
        for(var i=0;i<3;i++){
          var x = [s[i]], y = s.filter(function(_, j){ return j !== i; });
          emit(x, y); emit(y, x);
        }
      });
      rules.sort(function(a,b){ return b.lift - a.lift; });

      html += '<div class="card" style="border:0;box-shadow:none;padding:0"><div class="sect-title">关联规则（最小置信度 ' + (minConf*100).toFixed(0) + '%）</div>'
        + '<table class="tbl"><tr><th>规则</th><th>支持度</th><th>置信度</th><th>提升度</th></tr>';
      if(!rules.length) html += '<tr><td colspan="4" class="muted">没有满足条件的规则，试试降低置信度阈值</td></tr>';
      rules.slice(0,14).forEach(function(r){
        var cls = r.lift > 1.2 ? ' class="hl"' : '';
        html += '<tr' + cls + '><td>' + r.x.join('+') + ' → ' + r.y.join('+') + '</td>'
          + '<td class="num">' + (r.sup*100).toFixed(1) + '%</td>'
          + '<td class="num">' + (r.conf*100).toFixed(1) + '%</td>'
          + '<td class="num" style="color:' + (r.lift>1 ? 'var(--green)' : 'var(--red)') + '">' + r.lift.toFixed(2) + '</td></tr>';
      });
      html += '</table>';
      if(rules.length){
        var best = rules[0];
        html += '<div class="note ok" style="margin-top:12px"><b>最强规则：</b>' + best.x.join('+') + ' → ' + best.y.join('+')
          + '　支持度 ' + (best.sup*100).toFixed(1) + '%　置信度 ' + (best.conf*100).toFixed(1) + '%　提升度 ' + best.lift.toFixed(2)
          + '。提升度大于 1 说明前件对后件有正向促进作用。</div>';
      }
      html += '</div></div>';
      html += '<div class="note" style="margin-top:14px"><b>算法说明：</b>共 ' + n + ' 笔交易。'
        + 'Apriori 先生成 1 项频繁集，再两两连接生成 2 项候选集并验证，重复直到无法生成新的频繁项集。'
        + '剪枝依据是「频繁项集的所有子集必然频繁」。高亮行表示提升度大于 1.2 的强规则。</div>';
      document.getElementById('apOut').innerHTML = html;
    }
    document.getElementById('apTx').oninput = run;
    document.getElementById('apS').oninput = function(){ document.getElementById('apSV').textContent = this.value; run(); };
    document.getElementById('apC').oninput = function(){ document.getElementById('apCV').textContent = this.value + '%'; run(); };
    run();
  }
});

/* ================= 6. 信息增益与决策树划分 ================= */
BD.labs.push({
  id:'infogain', name:'信息熵与信息增益', tag:'分类',
  desc:'手工计算各属性的熵与信息增益，理解决策树如何选择划分属性。',
  render:function(box){
    box.innerHTML = '<div class="lab-ctrl">'
      + '<div class="field" style="grid-column:1/-1"><label>数据集（首行为表头，最后一列为类别标签，逗号分隔）</label>'
      + '<textarea id="igData" style="min-height:130px">天气,温度,湿度,是否打球\n晴,高,高,否\n晴,高,高,否\n阴,高,高,是\n雨,中,高,是\n雨,低,正常,是\n雨,低,正常,否\n阴,低,正常,是\n晴,中,高,否\n晴,低,正常,是\n雨,中,正常,是\n晴,中,正常,是\n阴,中,高,是\n阴,高,正常,是\n雨,中,高,否</textarea></div>'
      + '<div class="field"><label>划分准则</label><select id="igCrit">'
      + '<option value="gain">信息增益（ID3）</option>'
      + '<option value="ratio">增益率（C4.5）</option>'
      + '<option value="gini">基尼指数（CART）</option></select></div></div>'
      + '<div id="igOut"></div>';
    function entropy(counts, total){
      var e = 0;
      Object.keys(counts).forEach(function(k){
        var p = counts[k]/total;
        if(p > 0) e -= p * Math.log(p)/Math.LN2;
      });
      return e;
    }
    function run(){
      var lines = document.getElementById('igData').value.split('\n').map(function(l){
        return l.split(/[,，\t]+/).map(function(s){ return s.trim(); });
      }).filter(function(l){ return l.length > 1; });
      if(lines.length < 2){ document.getElementById('igOut').innerHTML = '<div class="note bad">数据不足</div>'; return; }
      var header = lines[0];
      var rows = lines.slice(1);
      var labelIdx = header.length - 1;
      var total = rows.length;
      var labelCounts = {};
      rows.forEach(function(r){ var v = r[labelIdx]; labelCounts[v] = (labelCounts[v]||0)+1; });
      var H = entropy(labelCounts, total);
      var crit = document.getElementById('igCrit').value;
      var critName = {gain:'信息增益', ratio:'增益率', gini:'基尼指数'}[crit];

      var html = '<div class="grid g2"><div>';
      html += '<div class="card" style="border:0;box-shadow:none;padding:0"><div class="sect-title">数据集概览</div>'
        + '<table class="tbl"><tr><th>样本数</th><th>属性数</th><th>类别数</th></tr>'
        + '<tr><td class="num">' + total + '</td><td class="num">' + (header.length-1) + '</td><td class="num">' + Object.keys(labelCounts).length + '</td></tr></table>'
        + '<div class="note" style="margin-top:12px"><b>类别分布：</b>'
        + Object.keys(labelCounts).map(function(k){ return k + ' ' + labelCounts[k] + ' 条（' + (labelCounts[k]/total*100).toFixed(1) + '%）'; }).join('　')
        + '<div style="margin-top:8px"><b>数据集信息熵 Ent(D) = </b><span class="mono" style="color:var(--accent);font-weight:700">' + H.toFixed(4) + '</span></div></div>';
      html += '</div>';

      var results = [];
      for(var a=0; a<header.length-1; a++){
        var groups = {};
        rows.forEach(function(r){ (groups[r[a]] = groups[r[a]] || []).push(r); });
        var keys = Object.keys(groups);
        var wEnt = 0, gain = 0, iv = 0;
        keys.forEach(function(k){
          var sub = groups[k], lc = {};
          sub.forEach(function(r){ var v = r[labelIdx]; lc[v] = (lc[v]||0)+1; });
          var e = entropy(lc, sub.length);
          wEnt += (sub.length/total) * e;
          var p = sub.length/total;
          if(p > 0) iv -= p * Math.log(p)/Math.LN2;
        });
        gain = H - wEnt;
        // 基尼
        var gini = 0;
        keys.forEach(function(k){
          var sub = groups[k], lc = {};
          sub.forEach(function(r){ var v = r[labelIdx]; lc[v] = (lc[v]||0)+1; });
          var g = 1;
          Object.keys(lc).forEach(function(v){ g -= Math.pow(lc[v]/sub.length, 2); });
          gini += (sub.length/total) * g;
        });
        results.push({
          attr: header[a], keys: keys, groups: groups, wEnt: wEnt, gain: gain,
          ratio: iv > 0 ? gain/iv : 0, iv: iv, gini: gini
        });
      }
      var metric = function(r){ return crit === 'gain' ? r.gain : crit === 'ratio' ? r.ratio : -r.gini; };
      results.sort(function(x,y){ return metric(y) - metric(x); });

      html += '<div class="card" style="border:0;box-shadow:none;padding:0"><div class="sect-title">各属性的' + critName + '对比（降序）</div>'
        + '<table class="tbl"><tr><th>属性</th><th>取值数</th><th>条件熵</th><th>信息增益</th><th>固有值</th><th>增益率</th><th>基尼指数</th></tr>';
      results.forEach(function(r, i){
        html += '<tr' + (i===0? ' class="hl"' : '') + '><td>' + r.attr + (i===0? ' ★' : '') + '</td>'
          + '<td class="num">' + r.keys.length + '</td>'
          + '<td class="num">' + r.wEnt.toFixed(4) + '</td>'
          + '<td class="num">' + r.gain.toFixed(4) + '</td>'
          + '<td class="num">' + r.iv.toFixed(4) + '</td>'
          + '<td class="num">' + r.ratio.toFixed(4) + '</td>'
          + '<td class="num">' + r.gini.toFixed(4) + '</td></tr>';
      });
      html += '</table>';
      html += '</div></div>';
      var best = results[0];
      html += '<div class="note ok"><b>结论：</b>按' + critName + '准则，最优划分属性是 <b>' + best.attr + '</b>。'
        + '其划分后的条件熵为 ' + best.wEnt.toFixed(4) + '，信息增益 ' + best.gain.toFixed(4) + '。'
        + (crit === 'gain' ? '注意信息增益偏好取值多的属性——本例中若某个属性取值数远多于其他属性，其增益容易被高估，这就是 C4.5 引入增益率的原因。' : '')
        + (crit === 'gini' ? '基尼指数不需要对数运算，CART 通过它构建二叉树，计算效率更高。' : '')
        + '</div>';
      html += '<div class="card" style="border:0;box-shadow:none;padding:0;margin-top:16px"><div class="sect-title">各属性划分明细</div>'
        + '<table class="tbl"><tr><th>属性</th><th>取值</th><th>样本数</th><th>类别分布</th><th>子集熵</th></tr>';
      results.forEach(function(r){
        r.keys.forEach(function(k, i){
          var sub = r.groups[k], lc = {};
          sub.forEach(function(row){ var v = row[labelIdx]; lc[v] = (lc[v]||0)+1; });
          html += '<tr><td>' + (i===0? r.attr : '') + '</td><td>' + k + '</td><td class="num">' + sub.length + '</td>'
            + '<td>' + Object.keys(lc).map(function(v){ return v + '×' + lc[v]; }).join(' , ') + '</td>'
            + '<td class="num">' + entropy(lc, sub.length).toFixed(4) + '</td></tr>';
        });
      });
      html += '</table></div>';
      html += '</div>';
      document.getElementById('igOut').innerHTML = html;
    }
    document.getElementById('igData').oninput = run;
    document.getElementById('igCrit').onchange = run;
    run();
  }
});

/* ================= 7. PageRank ================= */
BD.labs.push({
  id:'pagerank', name:'PageRank 迭代计算', tag:'图分析',
  desc:'观察页面权重如何在链接间流动并最终收敛。',
  render:function(box){
    box.innerHTML = '<div class="lab-ctrl">'
      + '<div class="field" style="grid-column:1/-1"><label>有向边（每行一条，格式 A→B，表示 A 链接到 B）</label>'
      + '<textarea id="prEdges">A→B\nA→C\nB→C\nC→A\nD→C</textarea></div>'
      + '<div class="field"><label>阻尼系数 d</label><input type="range" id="prD" min="50" max="99" value="85"><span class="v" id="prDV">0.85</span></div>'
      + '<div class="field"><label>迭代轮数</label><input type="range" id="prN" min="1" max="30" value="10"><span class="v" id="prNV">10</span></div>'
      + '</div><div id="prOut"></div>';
    function run(){
      var lines = document.getElementById('prEdges').value.split('\n');
      var edges = [];
      lines.forEach(function(l){
        var m = l.split(/[-=]?>|→|->|,/).map(function(s){ return s.trim(); });
        if(m.length >= 2 && m[0] && m[1]) edges.push([m[0], m[1]]);
      });
      if(!edges.length){ document.getElementById('prOut').innerHTML = '<div class="note bad">请至少输入一条边</div>'; return; }
      var nodes = [];
      edges.forEach(function(e){
        if(nodes.indexOf(e[0]) < 0) nodes.push(e[0]);
        if(nodes.indexOf(e[1]) < 0) nodes.push(e[1]);
      });
      nodes.sort();
      var N = nodes.length;
      var d = Number(document.getElementById('prD').value)/100;
      var rounds = Number(document.getElementById('prN').value);
      var out = {};
      nodes.forEach(function(n){ out[n] = edges.filter(function(e){ return e[0] === n; }).map(function(e){ return e[1]; }); });
      var pr = {}, pr2 = {};
      nodes.forEach(function(n){ pr[n] = 1/N; });
      var history = [Object.assign({}, pr)];

      for(var r=0; r<rounds; r++){
        var dangling = 0;
        nodes.forEach(function(n){ if(!out[n].length) dangling += pr[n]; });
        nodes.forEach(function(n){
          var sum = 0;
          nodes.forEach(function(m){
            if(out[m].indexOf(n) >= 0) sum += pr[m] / out[m].length;
          });
          pr2[n] = (1-d)/N + d * (sum + dangling/N);
        });
        nodes.forEach(function(n){ pr[n] = pr2[n]; });
        history.push(Object.assign({}, pr));
      }
      var sorted = nodes.slice().sort(function(a,b){ return pr[b] - pr[a]; });
      var html = '<div class="grid g2">';
      html += '<div class="card" style="border:0;box-shadow:none;padding:0"><div class="sect-title">最终 PageRank 值（迭代 ' + rounds + ' 轮，d = ' + d.toFixed(2) + '）</div>'
        + '<table class="tbl"><tr><th>排名</th><th>节点</th><th>PR 值</th><th>出链数</th><th>相对权重</th></tr>';
      sorted.forEach(function(n, i){
        var pct = pr[n]/pr[sorted[0]]*100;
        html += '<tr' + (i===0? ' class="hl"' : '') + '><td class="num">' + (i+1) + '</td><td><b>' + n + '</b></td>'
          + '<td class="num">' + pr[n].toFixed(5) + '</td><td class="num">' + out[n].length + '</td>'
          + '<td><div class="bar thin" style="width:110px"><i style="width:' + pct.toFixed(1) + '%"></i></div></td></tr>';
      });
      html += '</table><div class="note" style="margin-top:12px">所有节点的 PR 值之和恒等于 1（当前和 = '
        + nodes.reduce(function(a,n){ return a + pr[n]; }, 0).toFixed(6) + '），因此 PageRank 只能在同一个网络内部比较相对高低。</div></div>';

      html += '<div class="card" style="border:0;box-shadow:none;padding:0"><div class="sect-title">迭代收敛过程</div>'
        + '<table class="tbl"><tr><th>轮次</th>' + nodes.map(function(n){ return '<th>' + n + '</th>'; }).join('') + '</tr>';
      history.forEach(function(h, i){
        html += '<tr><td class="num">' + i + '</td>' + nodes.map(function(n){ return '<td class="num">' + h[n].toFixed(4) + '</td>'; }).join('') + '</tr>';
      });
      html += '</table></div></div>';
      html += '<div class="note ok" style="margin-top:14px"><b>解读：</b>节点 <b>' + sorted[0] + '</b> 的 PR 值最高（' + pr[sorted[0]].toFixed(5) + '）。'
        + 'PageRank 的核心思想是「被重要页面链接的页面也重要」——权重沿着链接方向流动，每个页面把自己权重的 1/出链数 分给下游页面，'
        + '同时以 (1-d) 的概率随机跳转，避免陷入无出链的悬挂节点或死循环。'
        + (nodes.some(function(n){ return !out[n].length; }) ? '本例中存在无出链的悬挂节点，其权重被均匀分摊到所有节点。' : '') + '</div>';
      document.getElementById('prOut').innerHTML = html;
    }
    document.getElementById('prEdges').oninput = run;
    document.getElementById('prD').oninput = function(){ document.getElementById('prDV').textContent = (this.value/100).toFixed(2); run(); };
    document.getElementById('prN').oninput = function(){ document.getElementById('prNV').textContent = this.value; run(); };
    run();
  }
});
})();