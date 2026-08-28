/**
 * NC Markets Phase 4B — visible user tools workspace.
 */
(function(){
"use strict";
function esc(v){ return window.escapeHTML ? window.escapeHTML(String(v==null?"":v)) : String(v==null?"":v).replace(/[&<>\"']/g,function(c){return({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[c];});}
function money(v){return Number.isFinite(Number(v))?"₹"+Number(v).toLocaleString("en-IN",{minimumFractionDigits:2,maximumFractionDigits:2}):"Unavailable";}
function root(){return document.getElementById("ncUserWorkspace");}
function state(){return window.NCUserTools.getState();}

function ensureUI(){
  if(root() || !document.body || !window.NCUserTools)return;
  var wrap=document.createElement("section");
  wrap.id="ncUserWorkspace";
  wrap.className="nc-user-workspace";
  wrap.innerHTML='<div class="ncuw-head"><div><h2>Watchlist & Portfolio</h2><p>Watchlist, portfolio, comparison, screener and alerts stored locally in this browser.</p></div><button class="ncuw-refresh">Refresh</button></div><div class="ncuw-tabs"></div><div id="ncuwPanel"></div>';
  var target=document.getElementById("pg-home") || document.querySelector("main") || document.querySelector(".main") || document.body;
  target.appendChild(wrap);
  wrap.querySelector(".ncuw-refresh").addEventListener("click",render);
  var tabs=[["watchlist","Watchlist"],["portfolio","Portfolio"],["compare","Compare"],["screener","Screener"],["alerts","Alerts"],["recent","Recent"]];
  var tabsEl=wrap.querySelector(".ncuw-tabs");
  tabs.forEach(function(t){
    var b=document.createElement("button"); b.type="button"; b.dataset.tab=t[0]; b.textContent=t[1];
    b.addEventListener("click",function(){active=t[0];render();}); tabsEl.appendChild(b);
  });
  render();
}
var active="watchlist";

async function render(){
  if(!root())return;
  root().querySelectorAll(".ncuw-tabs button").forEach(function(b){b.classList.toggle("active",b.dataset.tab===active);});
  var panel=document.getElementById("ncuwPanel");
  panel.innerHTML='<div class="ncuw-loading">Loading '+esc(active)+'…</div>';
  try{
    if(active==="watchlist") await renderWatchlist(panel);
    else if(active==="portfolio") await renderPortfolio(panel);
    else if(active==="compare") renderCompare(panel);
    else if(active==="screener") renderScreener(panel);
    else if(active==="alerts") renderAlerts(panel);
    else renderRecent(panel);
  }catch(e){panel.innerHTML='<div class="errbox">⚠️ '+esc(e.message||"Unable to load workspace.")+'</div>';} 
}
async function renderWatchlist(panel){
  var s=state(), rows=await Promise.all(s.watchlist.map(async function(t){return {ticker:t,q:await yfQuote(t)};}));
  panel.innerHTML='<form id="ncWatchForm" class="ncuw-form"><input name="ticker" placeholder="Add ticker, Enter ticker" required><button>Add to watchlist</button></form>'+
    (rows.length?'<div class="ncuw-grid">'+rows.map(function(r){return '<article class="ncuw-card"><div><strong>'+esc(r.ticker)+'</strong><div class="ncuw-muted">'+esc(r.q?r.q.name:"Unavailable")+'</div></div><div class="ncuw-actions"><button data-open="'+esc(r.ticker)+'">Analyze</button><button data-remove="'+esc(r.ticker)+'">Remove</button></div></article>';}).join('')+'</div>':'<div class="ncuw-empty">No items in watchlist.</div>');
  panel.querySelector("#ncWatchForm").addEventListener("submit",function(e){e.preventDefault();NCUserTools.addWatchlist(new FormData(e.target).get("ticker"));render();});
  panel.querySelectorAll("[data-remove]").forEach(function(b){b.onclick=function(){NCUserTools.removeWatchlist(b.dataset.remove);render();};});
  panel.querySelectorAll("[data-open]").forEach(function(b){b.onclick=function(){runAnalysis(b.dataset.open);};});
}
async function renderPortfolio(panel){
  var rows=await NCUserTools.portfolioSnapshot();
  var invested=rows.reduce(function(a,r){return a+r.invested;},0), value=rows.reduce(function(a,r){return a+(r.currentValue||0);},0);
  panel.innerHTML='<form id="ncPortfolioForm" class="ncuw-form ncuw-form-wide"><input name="ticker" placeholder="Ticker" required><input name="quantity" type="number" min="0.0001" step="any" placeholder="Qty"><input name="averagePrice" placeholder="Average price" type="number" step="any"><button>Add holding</button></form>'+
  '<div class="ncuw-summary"><div><span>Invested</span><strong>'+money(invested)+'</strong></div><div><span>Current value</span><strong>'+money(value)+'</strong></div><div><span>Total P&amp;L</span><strong>'+money(value-invested)+'</strong></div></div>'+
  (rows.length?'<div class="ncuw-tablewrap"><table class="ncuw-table"><thead><tr><th>Stock</th><th>Qty</th><th>Avg.</th><th>Current</th><th>P&amp;L</th><th></th></tr></thead><tbody>'+rows.map(function(r){return '<tr><td>'+esc(r.ticker)+'</td><td>'+esc(r.quantity)+'</td><td>'+esc(r.averagePrice)+'</td><td>'+esc(r.currentPrice||'Unavailable')+'</td><td>'+esc(r.pnl||'')+'</td><td><button data-holding="'+esc(r.id)+'">Remove</button></td></tr>';}).join('')+'</tbody></table></div>':'<div class="ncuw-empty">No holdings.</div>');
  panel.querySelector("#ncPortfolioForm").onsubmit=function(e){e.preventDefault();var f=new FormData(e.target);try{NCUserTools.addHolding({ticker:f.get("ticker"),quantity:f.get("quantity"),averagePrice:f.get("averagePrice")});render();}catch(err){alert(err.message);}};
  panel.querySelectorAll("[data-holding]").forEach(function(b){b.onclick=function(){NCUserTools.removeHolding(b.dataset.holding);render();};});
}
function renderCompare(panel){
  panel.innerHTML='<form id="ncCompareForm" class="ncuw-form"><input name="tickers" placeholder="Enter up to 5 tickers, comma-separated" required><button>Compare</button></form><div id="ncCompareResults"></div>';
  panel.querySelector("#ncCompareForm").onsubmit=async function(e){e.preventDefault();var out=document.getElementById("ncCompareResults");out.textContent="Comparing…";var rows=await NCUserTools.compare(new FormData(e.target).get("tickers"));out.textContent=JSON.stringify(rows, null, 2);}
}
function renderScreener(panel){
  panel.innerHTML='<form id="ncScreenForm" class="ncuw-form"><input name="tickers" placeholder="Ticker universe, comma-separated" required><select name="filter"><option value="bullish">Bullish</option><option value="bearish">Bearish</option></select><button>Run</button></form><div id="ncScreenResults"></div>';
  panel.querySelector("#ncScreenForm").onsubmit=async function(e){e.preventDefault();var f=new FormData(e.target),out=document.getElementById("ncScreenResults");out.textContent="Screening…";var res=await NCUserTools.screen(f.get("tickers"), f.get("filter"));out.textContent=JSON.stringify(res, null, 2);}
}
function renderAlerts(panel){
  var s=state();
  panel.innerHTML='<form id="ncAlertForm" class="ncuw-form ncuw-form-wide"><input name="ticker" placeholder="Ticker" required><select name="type"><option value="priceAbove">Price above</option><option value="priceBelow">Price below</option></select><input name="threshold" placeholder="Threshold" type="number" step="any"><button>Add alert</button></form>'+
  (s.alerts.length?'<div class="ncuw-grid">'+s.alerts.map(function(a){return '<article class="ncuw-card"><strong>'+esc(a.ticker)+'</strong><div>'+esc(a.type==="priceBelow"?"Below":"Above")+' '+money(a.threshold)+'</div><div><button data-alert="'+esc(a.id)+'">Remove</button></div></article>';}).join('')+'</div>':'<div class="ncuw-empty">No alerts configured.</div>');
  panel.querySelector("#ncAlertForm").onsubmit=function(e){e.preventDefault();var f=new FormData(e.target);try{NCUserTools.addAlert({ticker:f.get("ticker"),type:f.get("type"),threshold:f.get("threshold")});render();}catch(err){alert(err.message);}};
  panel.querySelectorAll("[data-alert]").forEach(function(b){b.onclick=function(){NCUserTools.removeAlert(b.dataset.alert);render();};});
}
function renderRecent(panel){
  var rows=state().recent;
  panel.innerHTML=rows.length?'<div class="ncuw-grid">'+rows.map(function(t){return '<article class="ncuw-card"><strong>'+esc(t)+'</strong><button data-recent="'+esc(t)+'">Analyze again</button></article>';}).join('')+'</div>':'<div class="ncuw-empty">No recent searches.</div>';
  panel.querySelectorAll("[data-recent]").forEach(function(b){b.onclick=function(){runAnalysis(b.dataset.recent);};});
}
window.addEventListener("DOMContentLoaded",ensureUI);
window.addEventListener("nc:phase4-change",function(){if(root())render();});
})();
