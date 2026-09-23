/**
 * NC Markets — Investor Toolkit Workspace UI
 */
(function(){
"use strict";

function esc(v){ return window.escapeHTML ? window.escapeHTML(String(v==null?"":v)) : String(v==null?"":v).replace(/[&<>\"']/g,function(c){return({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[c];}); }
function money(v){ return Number.isFinite(Number(v)) ? "₹"+Number(v).toLocaleString("en-IN",{minimumFractionDigits:2,maximumFractionDigits:2}) : "—"; }
function pct(v){ if(!Number.isFinite(Number(v))) return "—"; var n=Number(v); return (n>=0?"+":"")+n.toFixed(2)+"%"; }
function col(v){ return Number(v)>=0?"#22c55e":"#ef4444"; }
function root(){ return document.getElementById("ncUserWorkspace"); }
function state(){ return window.NCUserTools.getState(); }

var active = "watchlist";

function ensureUI(){
  if(root() || !document.body || !window.NCUserTools) return;
  var wrap = document.createElement("section");
  wrap.id = "ncUserWorkspace";
  wrap.className = "nc-user-workspace";
  wrap.innerHTML = buildShell();
  var pg = document.getElementById("pg-home") || document.body;
  var homeGrid = pg.querySelector(".home-grid");
  if (homeGrid) pg.insertBefore(wrap, homeGrid);
  else pg.appendChild(wrap);
  bindShell(wrap);
  render();
}

function buildShell(){
  return `
    <div class="toolkit-header">
      <div>
        <div class="toolkit-title">Investor Toolkit</div>
        <div class="toolkit-sub">Watchlist · Portfolio · Screener · Alerts — stored locally in this browser</div>
      </div>
      <div class="toolkit-actions">
        <button id="btnExportCSV" class="tk-btn tk-btn-blue">Export</button>
        <button id="btnBackupJSON" class="tk-btn tk-btn-green">Backup</button>
        <button id="btnRestoreJSON" class="tk-btn tk-btn-amber">Restore</button>
        <button id="btnRefreshWorkspace" class="tk-btn">↻</button>
      </div>
    </div>
    <div class="toolkit-tabs" id="toolkitTabs"></div>
    <div id="ncuwPanel"></div>
  `;
}

function bindShell(wrap){
  var tabs = [
    ["watchlist","Watchlist"],
    ["portfolio","Portfolio"],
    ["compare","Compare"],
    ["screener","Screener"],
    ["alerts","Alerts"],
    ["recent","Recent"],
    ["calculator","Calculator"]
  ];
  var tabsEl = wrap.querySelector("#toolkitTabs");
  tabs.forEach(function(t){
    var b = document.createElement("button");
    b.type = "button"; b.dataset.tab = t[0]; b.innerHTML = t[1];
    b.addEventListener("click", function(){ active = t[0]; render(); });
    tabsEl.appendChild(b);
  });

  wrap.querySelector("#btnRefreshWorkspace").addEventListener("click", render);
  wrap.querySelector("#btnExportCSV").addEventListener("click", function(){
    var s = state();
    if(active === "portfolio"){
      NCUserTools.portfolioSnapshot().then(function(rows){ NCUserTools.exportToCSV(rows,"portfolio.csv"); });
    } else {
      NCUserTools.exportToCSV(s.watchlist.map(function(t){ return {ticker:t}; }), "watchlist.csv");
    }
  });
  wrap.querySelector("#btnBackupJSON").addEventListener("click", function(){
    var blob = new Blob([NCUserTools.backupWorkspace()], {type:"application/json"});
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = "nc-markets-workspace.json";
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  });
  wrap.querySelector("#btnRestoreJSON").addEventListener("click", function(){
    var inp = document.createElement("input"); inp.type = "file"; inp.accept = ".json";
    inp.onchange = function(e){
      var reader = new FileReader();
      reader.onload = function(ev){
        try{ NCUserTools.restoreWorkspace(ev.target.result); alert("Workspace restored!"); render(); }
        catch(err){ alert(err.message); }
      };
      reader.readAsText(e.target.files[0]);
    };
    inp.click();
  });
}

async function render(){
  if(!root()) return;
  root().querySelectorAll(".toolkit-tabs button").forEach(function(b){ b.classList.toggle("active", b.dataset.tab === active); });
  var panel = document.getElementById("ncuwPanel");
  panel.innerHTML = '<div style="padding:24px;text-align:center;color:#64748b;font-size:12px;">Loading…</div>';
  try{
    if(active === "watchlist") await renderWatchlist(panel);
    else if(active === "portfolio") await renderPortfolio(panel);
    else if(active === "compare") renderCompare(panel);
    else if(active === "screener") renderScreener(panel);
    else if(active === "alerts") renderAlerts(panel);
    else if(active === "calculator") renderCalculator(panel);
    else renderRecent(panel);
  } catch(e){
    panel.innerHTML = '<div class="errbox">⚠️ ' + esc(e.message || "Error loading workspace.") + '</div>';
  }
}

/* ─── WATCHLIST ─── */
async function renderWatchlist(panel){
  var s = state();
  var rows = await Promise.all(s.watchlist.map(async function(t){
    var q = await yfQuote(t);
    if (q && t.indexOf("^") !== 0) {
      try { var f = await yfFundamentals(t); if (f && f.marketCap) q.mktCap = f.marketCap; } catch(e){}
    }
    return {ticker:t, q: q};
  }));
  panel.innerHTML =
    '<form id="ncWatchForm" class="tk-add-form">'
    + '<input name="ticker" placeholder="Enter NSE / BSE ticker symbol" required class="tk-input"/>'
    + '<button class="tk-btn tk-btn-blue">+ Add</button>'
    + '</form>'
    + (rows.length
      ? '<div class="tk-card-grid">' + rows.map(function(r){ return watchCard(r); }).join("") + '</div>'
      : '<div class="tk-empty">No stocks in your watchlist. Add one above.</div>');
  panel.querySelector("#ncWatchForm").addEventListener("submit", function(e){
    e.preventDefault(); NCUserTools.addWatchlist(new FormData(e.target).get("ticker")); render();
  });
  panel.querySelectorAll("[data-remove]").forEach(function(b){ b.onclick = function(){ NCUserTools.removeWatchlist(b.dataset.remove); render(); }; });
  panel.querySelectorAll("[data-open]").forEach(function(b){ b.onclick = function(){ runAnalysis(b.dataset.open); }; });
}

function watchCard(r){
  var q = r.q;
  var up = q && q.up;
  var clr = q ? (up ? "#22c55e" : "#ef4444") : "#64748b";
  var arrow = q ? (up ? "▲" : "▼") : "";
  return '<div class="tk-stock-card">'
    + '<div class="tk-sc-top">'
    + '<div><div class="tk-sc-ticker">' + esc(r.ticker) + '</div><div class="tk-sc-name">' + esc(q ? q.name : "Unavailable") + '</div></div>'
    + '<div style="text-align:right;">'
    + '<div style="font-size:16px;font-weight:800;color:' + clr + ';">' + (q ? esc(q.price) : "—") + '</div>'
    + (q ? '<div style="font-size:11px;color:' + clr + ';font-weight:600;">' + arrow + ' ' + esc(q.changePct) + '</div>' : '')
    + '</div>'
    + '</div>'
    + (q ? '<div class="tk-sc-meta">'
      + '<span>Vol: ' + esc(q.volume) + '</span>'
      + '<span>Cap: ' + esc(q.mktCap) + '</span>'
      + '</div>' : '')
    + '<div class="tk-sc-actions">'
    + '<button data-open="' + esc(r.ticker) + '" class="tk-btn tk-btn-blue" style="flex:1;">Analyze</button>'
    + '<button data-remove="' + esc(r.ticker) + '" class="tk-btn tk-btn-danger">Remove</button>'
    + '</div>'
    + '</div>';
}

/* ─── PORTFOLIO ─── */
async function renderPortfolio(panel){
  var rows = await NCUserTools.portfolioSnapshot();
  var invested = rows.reduce(function(a,r){ return a + r.invested; }, 0);
  var value = rows.reduce(function(a,r){ return a + (r.currentValue||0); }, 0);
  var pnlTot = value - invested;
  var pnlPctTot = invested > 0 ? ((pnlTot/invested)*100) : 0;

  panel.innerHTML =
    '<form id="ncPortfolioForm" class="tk-add-form" style="flex-wrap:wrap;">'
    + '<input name="ticker" placeholder="Ticker" required class="tk-input" style="min-width:100px;flex:1;"/>'
    + '<input name="quantity" type="number" min="0.0001" step="any" placeholder="Qty" class="tk-input" style="max-width:90px;"/>'
    + '<input name="averagePrice" type="number" step="any" placeholder="Avg Price ₹" class="tk-input" style="max-width:110px;"/>'
    + '<button class="tk-btn tk-btn-blue">+ Add</button>'
    + '</form>'
    + '<div class="tk-port-summary">'
    + summaryTile("Invested", money(invested), "#94a3b8")
    + summaryTile("Current Value", money(value), "#38bdf8")
    + summaryTile("Total P&L", money(pnlTot), col(pnlTot), pct(pnlPctTot))
    + '</div>'
    + (rows.length
      ? '<div class="tk-table-wrap"><table class="tk-table"><thead><tr>'
        + '<th>Stock</th><th>Qty</th><th>Avg Price</th><th>Current</th><th>Invested</th><th>Value</th><th>P&L</th><th>P&L %</th><th></th>'
        + '</tr></thead><tbody>'
        + rows.map(function(r){
            var pnlColor = r.pnl !== null ? col(r.pnl) : "#64748b";
            return '<tr>'
              + '<td style="font-weight:700;color:#e2e8f4;">' + esc(r.ticker) + '</td>'
              + '<td>' + esc(r.quantity) + '</td>'
              + '<td>' + money(r.averagePrice) + '</td>'
              + '<td style="font-weight:600;">' + (r.currentPrice ? money(r.currentPrice) : '—') + '</td>'
              + '<td>' + money(r.invested) + '</td>'
              + '<td>' + (r.currentValue ? money(r.currentValue) : '—') + '</td>'
              + '<td style="font-weight:700;color:' + pnlColor + ';">' + (r.pnl !== null ? money(r.pnl) : '—') + '</td>'
              + '<td style="font-weight:700;color:' + pnlColor + ';">' + (r.pnlPct !== null ? pct(r.pnlPct) : '—') + '</td>'
              + '<td><button data-holding="' + esc(r.id) + '" class="tk-btn tk-btn-danger" style="padding:4px 8px;font-size:10px;">✕</button></td>'
              + '</tr>';
          }).join("")
        + '</tbody></table></div>'
      : '<div class="tk-empty">No holdings added yet. Add your first position above.</div>');

  panel.querySelector("#ncPortfolioForm").onsubmit = function(e){
    e.preventDefault();
    var f = new FormData(e.target);
    try{ NCUserTools.addHolding({ticker:f.get("ticker"),quantity:f.get("quantity"),averagePrice:f.get("averagePrice")}); render(); }
    catch(err){ alert(err.message); }
  };
  panel.querySelectorAll("[data-holding]").forEach(function(b){ b.onclick = function(){ NCUserTools.removeHolding(b.dataset.holding); render(); }; });
}

function summaryTile(label, val, color, sub){
  return '<div class="tk-summary-tile">'
    + '<div class="tk-st-label">' + label + '</div>'
    + '<div class="tk-st-val" style="color:' + color + ';">' + val + '</div>'
    + (sub ? '<div class="tk-st-sub" style="color:' + color + ';">' + esc(sub) + '</div>' : '')
    + '</div>';
}

/* ─── COMPARE ─── */
function renderCompare(panel){
  panel.innerHTML =
    '<form id="ncCompareForm" class="tk-add-form">'
    + '<input name="tickers" placeholder="Up to 5 NSE tickers, comma-separated" required class="tk-input" style="flex:1;"/>'
    + '<button class="tk-btn tk-btn-blue">Compare</button>'
    + '</form>'
    + '<div id="ncCompareResults"></div>';
  panel.querySelector("#ncCompareForm").onsubmit = async function(e){
    e.preventDefault();
    var out = document.getElementById("ncCompareResults");
    out.innerHTML = '<div style="padding:20px;text-align:center;color:#64748b;">Fetching data…</div>';
    var rows = await NCUserTools.compare(new FormData(e.target).get("tickers"));
    if(!rows || !rows.length){ out.innerHTML = '<div class="tk-empty">No results.</div>'; return; }
    var fields = [
      {key:"price", label:"Price", fmt:function(v){ return v ? "₹"+Number(v).toLocaleString("en-IN",{minimumFractionDigits:2}) : "—"; }},
      {key:"changePct", label:"Change", fmt:function(v){ return v||"—"; }, color:function(r){ return r.changePct && !r.changePct.startsWith("-") ? "#22c55e" : "#ef4444"; }},
      {key:"rsi", label:"RSI (14)", fmt:function(v){ return v!==null?v:"—"; }, color:function(r){ return r.rsi<30?"#22c55e":r.rsi>70?"#ef4444":"#f59e0b"; }},
      {key:"macd", label:"MACD", fmt:function(v){ return v!==null?v.toFixed(2):"—"; }, color:function(r){ return r.macd>0?"#22c55e":"#ef4444"; }},
      {key:"emaTrend", label:"EMA Trend", fmt:function(v){ return v||"—"; }, color:function(r){ return r.emaTrend==="Bullish"?"#22c55e":r.emaTrend==="Bearish"?"#ef4444":"#64748b"; }},
      {key:"technicalScore", label:"Tech Score", fmt:function(v){ return v!==null?v+"%":"—"; }, color:function(r){ return r.technicalScore>65?"#22c55e":r.technicalScore>40?"#f59e0b":"#ef4444"; }}
    ];
    var html = '<div class="tk-compare-wrap"><table class="tk-table tk-compare-table"><thead><tr><th>Metric</th>'
      + rows.map(function(r){ return '<th style="color:#60a5fa;">' + esc(r.ticker) + (r.error?' <span style="color:#ef4444;font-size:9px;">ERR</span>':'') + '</th>'; }).join("")
      + '</tr></thead><tbody>'
      + fields.map(function(f){
          return '<tr><td style="color:#94a3b8;font-weight:600;">' + f.label + '</td>'
            + rows.map(function(r){
                var val = r.error ? "N/A" : f.fmt(r[f.key]);
                var c = (f.color && !r.error) ? f.color(r) : "";
                return '<td style="font-weight:700;' + (c?"color:"+c+";":"") + '">' + esc(String(val)) + '</td>';
              }).join("")
            + '</tr>';
        }).join("")
      + '</tbody></table></div>';
    out.innerHTML = html;
  };
}

/* ─── SCREENER ─── */
function renderScreener(panel){
  panel.innerHTML =
    '<form id="ncScreenForm" class="tk-add-form" style="flex-wrap:wrap;">'
    + '<input name="tickers" placeholder="Ticker universe, comma-separated" required class="tk-input" style="flex:1;"/>'
    + '<select name="filter" class="tk-select">'
    + '<option value="bullish">Bullish (Score ≥ 60)</option>'
    + '<option value="bearish">Bearish (Score ≤ 40)</option>'
    + '<option value="oversold">Oversold (RSI &lt; 30)</option>'
    + '<option value="overbought">Overbought (RSI &gt; 70)</option>'
    + '</select>'
    + '<button class="tk-btn tk-btn-blue">Run Screener</button>'
    + '</form>'
    + '<div id="ncScreenResults"></div>';
  panel.querySelector("#ncScreenForm").onsubmit = async function(e){
    e.preventDefault();
    var f = new FormData(e.target), out = document.getElementById("ncScreenResults");
    out.innerHTML = '<div style="padding:20px;text-align:center;color:#64748b;">Screening…</div>';
    var res = await NCUserTools.screen(f.get("tickers"), f.get("filter"));
    if(!res || !res.length){ out.innerHTML = '<div class="tk-empty">No stocks matched the filter.</div>'; return; }
    out.innerHTML = '<div class="tk-card-grid">'
      + res.map(function(r){
          var sc = r.technicalScore;
          var scColor = sc > 65 ? "#22c55e" : sc > 40 ? "#f59e0b" : "#ef4444";
          return '<div class="tk-stock-card" onclick="runAnalysis(\'' + esc(r.ticker) + '\')" style="cursor:pointer;">'
            + '<div class="tk-sc-top">'
            + '<div><div class="tk-sc-ticker">' + esc(r.ticker) + '</div><div class="tk-sc-name">Score: <strong style="color:' + scColor + ';">' + (sc!==null?sc:"—") + '%</strong></div></div>'
            + '<div style="text-align:right;"><div style="font-size:15px;font-weight:800;color:#f1f5f9;">₹' + (r.price ? Number(r.price).toLocaleString("en-IN",{minimumFractionDigits:2}) : "—") + '</div>'
            + '<div style="font-size:11px;color:' + (r.changePct&&!r.changePct.startsWith("-")?"#22c55e":"#ef4444") + ';font-weight:600;">' + esc(r.changePct||"") + '</div>'
            + '</div></div>'
            + '<div class="tk-sc-meta"><span>RSI: ' + (r.rsi!==null?r.rsi:"—") + '</span><span>EMA: ' + esc(r.emaTrend||"—") + '</span></div>'
            + '</div>';
        }).join("")
      + '</div>';
  };
}

/* ─── ALERTS ─── */
function renderAlerts(panel){
  var s = state();
  panel.innerHTML =
    '<form id="ncAlertForm" class="tk-add-form" style="flex-wrap:wrap;">'
    + '<input name="ticker" placeholder="Ticker" required class="tk-input" style="max-width:120px;"/>'
    + '<select name="type" class="tk-select"><option value="priceAbove">Price above</option><option value="priceBelow">Price below</option></select>'
    + '<input name="threshold" placeholder="₹ Threshold" type="number" step="any" class="tk-input" style="max-width:130px;"/>'
    + '<button class="tk-btn tk-btn-blue">+ Add Alert</button>'
    + '</form>'
    + (s.alerts.length
      ? '<div class="tk-card-grid">'
        + s.alerts.map(function(a){
            var typeLabel = a.type === "priceBelow" ? "↓ Below" : "↑ Above";
            var typeColor = a.type === "priceBelow" ? "#ef4444" : "#22c55e";
            return '<div class="tk-stock-card">'
              + '<div class="tk-sc-top"><div><div class="tk-sc-ticker">' + esc(a.ticker) + '</div><div class="tk-sc-name" style="margin-top:4px;"><span style="color:' + typeColor + ';font-weight:700;">' + typeLabel + '</span> ' + money(a.threshold) + '</div></div>'
              + (a.triggered ? '<span style="font-size:9px;background:rgba(34,197,94,0.12);color:#22c55e;border:1px solid #166534;padding:2px 6px;border-radius:6px;">TRIGGERED</span>' : '<span style="font-size:9px;color:#64748b;">WATCHING</span>')
              + '</div>'
              + '<div class="tk-sc-actions"><button data-alert="' + esc(a.id) + '" class="tk-btn tk-btn-danger" style="width:100%;">Remove Alert</button></div>'
              + '</div>';
          }).join("")
        + '</div>'
      : '<div class="tk-empty">No alerts set. Add a price alert above.</div>');
  panel.querySelector("#ncAlertForm").onsubmit = function(e){
    e.preventDefault();
    var f = new FormData(e.target);
    try{ NCUserTools.addAlert({ticker:f.get("ticker"),type:f.get("type"),threshold:f.get("threshold")}); render(); }
    catch(err){ alert(err.message); }
  };
  panel.querySelectorAll("[data-alert]").forEach(function(b){ b.onclick = function(){ NCUserTools.removeAlert(b.dataset.alert); render(); }; });
}

/* ─── CALCULATOR ─── */
function renderCalculator(panel) {
  panel.innerHTML = `
    <div style="max-width:520px;">
      <div style="display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap;" id="calcModeTabs">
        <button onclick="calcSetMode('sip')" id="calcTab_sip" class="tk-btn tk-btn-amber" style="font-size:12px;">SIP</button>
        <button onclick="calcSetMode('lumpsum')" id="calcTab_lumpsum" class="tk-btn" style="font-size:12px;">Lumpsum</button>
        <button onclick="calcSetMode('emi')" id="calcTab_emi" class="tk-btn" style="font-size:12px;">EMI / Loan</button>
      </div>
      <div id="calcBody"></div>
    </div>
  `;
  window.calcSetMode = function(mode) {
    ['sip','lumpsum','emi'].forEach(function(m) {
      var btn = document.getElementById('calcTab_' + m);
      if (btn) { btn.className = m === mode ? 'tk-btn tk-btn-amber' : 'tk-btn'; }
    });
    var body = document.getElementById('calcBody');
    if (!body) return;
    function fmtINR(n) { return '₹' + Math.round(n).toLocaleString('en-IN'); }
    if (mode === 'sip') {
      body.innerHTML = `
        <div class="gc" style="padding:16px 18px;">
          <div style="font-size:10px;font-weight:700;color:#6b7fa8;text-transform:uppercase;letter-spacing:0.6px;margin-bottom:14px;">SIP Calculator</div>
          <label style="font-size:11px;color:#8fafd4;display:block;margin-bottom:4px;">Monthly Investment (₹)</label>
          <input id="sipAmt" type="number" class="tk-input" value="5000" min="100" style="margin-bottom:10px;width:100%;">
          <label style="font-size:11px;color:#8fafd4;display:block;margin-bottom:4px;">Expected Annual Return (%)</label>
          <input id="sipRate" type="number" class="tk-input" value="12" min="1" max="50" style="margin-bottom:10px;width:100%;">
          <label style="font-size:11px;color:#8fafd4;display:block;margin-bottom:4px;">Duration (Years)</label>
          <input id="sipYrs" type="number" class="tk-input" value="10" min="1" max="40" style="margin-bottom:14px;width:100%;">
          <button onclick="window.runCalc('sip')" class="tk-btn tk-btn-blue" style="width:100%;font-size:12px;padding:8px;">Calculate</button>
          <div id="calcResult" style="margin-top:14px;"></div>
        </div>`;
    } else if (mode === 'lumpsum') {
      body.innerHTML = `
        <div class="gc" style="padding:16px 18px;">
          <div style="font-size:10px;font-weight:700;color:#6b7fa8;text-transform:uppercase;letter-spacing:0.6px;margin-bottom:14px;">Lumpsum Calculator</div>
          <label style="font-size:11px;color:#8fafd4;display:block;margin-bottom:4px;">Investment Amount (₹)</label>
          <input id="lsAmt" type="number" class="tk-input" value="100000" min="1000" style="margin-bottom:10px;width:100%;">
          <label style="font-size:11px;color:#8fafd4;display:block;margin-bottom:4px;">Expected Annual Return (%)</label>
          <input id="lsRate" type="number" class="tk-input" value="12" min="1" max="50" style="margin-bottom:10px;width:100%;">
          <label style="font-size:11px;color:#8fafd4;display:block;margin-bottom:4px;">Duration (Years)</label>
          <input id="lsYrs" type="number" class="tk-input" value="10" min="1" max="40" style="margin-bottom:14px;width:100%;">
          <button onclick="window.runCalc('lumpsum')" class="tk-btn tk-btn-blue" style="width:100%;font-size:12px;padding:8px;">Calculate</button>
          <div id="calcResult" style="margin-top:14px;"></div>
        </div>`;
    } else {
      body.innerHTML = `
        <div class="gc" style="padding:16px 18px;">
          <div style="font-size:10px;font-weight:700;color:#6b7fa8;text-transform:uppercase;letter-spacing:0.6px;margin-bottom:14px;">EMI / Loan Calculator</div>
          <label style="font-size:11px;color:#8fafd4;display:block;margin-bottom:4px;">Loan Amount (₹)</label>
          <input id="emiAmt" type="number" class="tk-input" value="1000000" min="10000" style="margin-bottom:10px;width:100%;">
          <label style="font-size:11px;color:#8fafd4;display:block;margin-bottom:4px;">Annual Interest Rate (%)</label>
          <input id="emiRate" type="number" class="tk-input" value="9" min="1" max="36" style="margin-bottom:10px;width:100%;">
          <label style="font-size:11px;color:#8fafd4;display:block;margin-bottom:4px;">Tenure (Years)</label>
          <input id="emiYrs" type="number" class="tk-input" value="20" min="1" max="30" style="margin-bottom:14px;width:100%;">
          <button onclick="window.runCalc('emi')" class="tk-btn tk-btn-blue" style="width:100%;font-size:12px;padding:8px;">Calculate</button>
          <div id="calcResult" style="margin-top:14px;"></div>
        </div>`;
    }
  };
  window.runCalc = function(mode) {
    var result = document.getElementById('calcResult');
    if (!result) return;
    function fmtINR(n) { return '₹' + Math.round(n).toLocaleString('en-IN'); }
    function row(label, val, color) {
      return '<div style="display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px solid #1e293b;">'
        + '<span style="font-size:12px;color:#6b7fa8;">' + label + '</span>'
        + '<span style="font-size:13px;font-weight:800;color:' + (color || '#eef3fc') + ';">' + val + '</span></div>';
    }
    if (mode === 'sip') {
      var P = parseFloat(document.getElementById('sipAmt').value) || 0;
      var r = (parseFloat(document.getElementById('sipRate').value) || 12) / 100 / 12;
      var n = (parseFloat(document.getElementById('sipYrs').value) || 10) * 12;
      var fv = r > 0 ? P * (Math.pow(1 + r, n) - 1) / r * (1 + r) : P * n;
      var invested = P * n;
      var gain = fv - invested;
      result.innerHTML = row('Total Invested', fmtINR(invested), '#8fafd4')
        + row('Wealth Gain', fmtINR(gain), '#22c55e')
        + row('Maturity Value', fmtINR(fv), '#f59e0b');
    } else if (mode === 'lumpsum') {
      var P = parseFloat(document.getElementById('lsAmt').value) || 0;
      var r = (parseFloat(document.getElementById('lsRate').value) || 12) / 100;
      var n = parseFloat(document.getElementById('lsYrs').value) || 10;
      var fv = P * Math.pow(1 + r, n);
      var gain = fv - P;
      result.innerHTML = row('Principal Invested', fmtINR(P), '#8fafd4')
        + row('Wealth Gain', fmtINR(gain), '#22c55e')
        + row('Maturity Value', fmtINR(fv), '#f59e0b');
    } else {
      var P = parseFloat(document.getElementById('emiAmt').value) || 0;
      var r = (parseFloat(document.getElementById('emiRate').value) || 9) / 100 / 12;
      var n = (parseFloat(document.getElementById('emiYrs').value) || 20) * 12;
      var emi = r > 0 ? P * r * Math.pow(1 + r, n) / (Math.pow(1 + r, n) - 1) : P / n;
      var total = emi * n;
      var interest = total - P;
      result.innerHTML = row('Monthly EMI', fmtINR(emi), '#f59e0b')
        + row('Total Interest', fmtINR(interest), '#ef4444')
        + row('Total Payment', fmtINR(total), '#8fafd4');
    }
  };
  window.calcSetMode('sip');
}

/* ─── RECENT ─── */
function renderRecent(panel){
  var rows = state().recent;
  if(!rows.length){ panel.innerHTML = '<div class="tk-empty">No recent searches yet.</div>'; return; }
  panel.innerHTML = '<div style="display:flex;flex-wrap:wrap;gap:8px;padding:4px 0;">'
    + rows.map(function(t){
        return '<div onclick="runAnalysis(\'' + esc(t) + '\')" style="background:linear-gradient(135deg,#0f1828,#0b1220);border:1px solid #1e3358;border-radius:8px;padding:7px 14px;font-size:12px;font-weight:700;cursor:pointer;color:#60a5fa;transition:all 0.15s;" onmouseover="this.style.borderColor=\'#3b82f6\';this.style.background=\'rgba(59,130,246,0.1)\'" onmouseout="this.style.borderColor=\'#1e3358\';this.style.background=\'linear-gradient(135deg,#0f1828,#0b1220)\'">' + esc(t) + '</div>';
      }).join("")
    + '</div>';
}

window.addEventListener("DOMContentLoaded", ensureUI);
window.addEventListener("nc:phase4-change", function(){ if(root()) render(); });
})();
