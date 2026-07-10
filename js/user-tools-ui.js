/**
 * NC Markets Phase 4B — visible user tools workspace.
 */
(function(){
"use strict";
function esc(v){ return window.escapeHTML ? window.escapeHTML(String(v==null?"":v)) : String(v==null?"":v).replace(/[&<>"']/g,function(c){return({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[c];});}
function money(v){return Number.isFinite(Number(v))?"₹"+Number(v).toLocaleString("en-IN",{minimumFractionDigits:2,maximumFractionDigits:2}):"Unavailable";}
function root(){return document.getElementById("ncUserWorkspace");}
function state(){return window.NCUserTools.getState();}

function ensureUI(){
  if(root() || !document.body || !window.NCUserTools)return;
  var wrap=document.createElement("section");
  wrap.id="ncUserWorkspace";
  wrap.className="nc-user-workspace";
  wrap.innerHTML='<div class="ncuw-head"><div><div class="ncuw-kicker">PERSONAL WORKSPACE</div><h2>NC User Tools</h2><p>Watchlist, portfolio, comparison, screener and alerts stored locally in this browser.</p></div><button class="ncuw-refresh" type="button">Refresh workspace</button></div><div class="ncuw-tabs" role="tablist"></div><div id="ncuwPanel"></div>';
  var target=document.querySelector("main")||document.querySelector(".main")||document.body;
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
    (rows.length?'<div class="ncuw-grid">'+rows.map(function(r){return '<article class="ncuw-card"><div><strong>'+esc(r.ticker)+'</strong><div class="ncuw-muted">'+esc(r.q?r.q.name:"Unavailable")+'</div></div><div class="ncuw-price">'+esc(r.q?r.q.price:"Unavailable")+'</div><div class="ncuw-muted">'+esc(r.q?r.q.changePct:"")+'</div><div class="ncuw-actions"><button data-open="'+esc(r.ticker)+'">Analyze</button><button data-remove="'+esc(r.ticker)+'">Remove</button></div></article>';}).join("")+'</div>':'<div class="ncuw-empty">Your watchlist is empty.</div>');
  panel.querySelector("#ncWatchForm").addEventListener("submit",function(e){e.preventDefault();NCUserTools.addWatchlist(new FormData(e.target).get("ticker"));render();});
  panel.querySelectorAll("[data-remove]").forEach(function(b){b.onclick=function(){NCUserTools.removeWatchlist(b.dataset.remove);render();};});
  panel.querySelectorAll("[data-open]").forEach(function(b){b.onclick=function(){runAnalysis(b.dataset.open);};});
}
async function renderPortfolio(panel){
  var rows=await NCUserTools.portfolioSnapshot();
  var invested=rows.reduce(function(a,r){return a+r.invested;},0), value=rows.reduce(function(a,r){return a+(r.currentValue||0);},0);
  panel.innerHTML='<form id="ncPortfolioForm" class="ncuw-form ncuw-form-wide"><input name="ticker" placeholder="Ticker" required><input name="quantity" type="number" min="0.0001" step="any" placeholder="Quantity" required><input name="averagePrice" type="number" min="0" step="any" placeholder="Average buy price" required><button>Add holding</button></form>'+
  '<div class="ncuw-summary"><div><span>Invested</span><strong>'+money(invested)+'</strong></div><div><span>Current value</span><strong>'+money(value)+'</strong></div><div><span>Total P&amp;L</span><strong>'+money(value-invested)+'</strong></div></div>'+
  (rows.length?'<div class="ncuw-tablewrap"><table class="ncuw-table"><thead><tr><th>Stock</th><th>Qty</th><th>Avg.</th><th>Current</th><th>P&amp;L</th><th></th></tr></thead><tbody>'+rows.map(function(r){return '<tr><td>'+esc(r.ticker)+'</td><td>'+r.quantity+'</td><td>'+money(r.averagePrice)+'</td><td>'+money(r.currentPrice)+'</td><td>'+money(r.pnl)+(r.pnlPct===null?"":" ("+r.pnlPct.toFixed(2)+"%)")+'</td><td><button data-holding="'+esc(r.id)+'">Remove</button></td></tr>';}).join("")+'</tbody></table></div>':'<div class="ncuw-empty">No portfolio holdings added yet.</div>');
  panel.querySelector("#ncPortfolioForm").onsubmit=function(e){e.preventDefault();var f=new FormData(e.target);try{NCUserTools.addHolding({ticker:f.get("ticker"),quantity:f.get("quantity"),averagePrice:f.get("averagePrice")});render();}catch(err){alert(err.message);}};
  panel.querySelectorAll("[data-holding]").forEach(function(b){b.onclick=function(){NCUserTools.removeHolding(b.dataset.holding);render();};});
}
function renderCompare(panel){
  panel.innerHTML='<form id="ncCompareForm" class="ncuw-form"><input name="tickers" placeholder="Enter up to 5 tickers, comma-separated" required><button>Compare</button></form><div id="ncCompareResults" class="ncuw-empty">Enter two to five symbols to compare.</div>';
  panel.querySelector("#ncCompareForm").onsubmit=async function(e){e.preventDefault();var out=document.getElementById("ncCompareResults");out.textContent="Comparing…";var rows=await NCUserTools.compare(String(new FormData(e.target).get("tickers")).split(","));out.className="ncuw-tablewrap";out.innerHTML='<table class="ncuw-table"><thead><tr><th>Stock</th><th>Price</th><th>Change</th><th>RSI</th><th>MACD</th><th>EMA trend</th><th>Score</th></tr></thead><tbody>'+rows.map(function(r){return '<tr><td>'+esc(r.ticker)+'</td><td>'+money(r.price)+'</td><td>'+esc(r.changePct||"—")+'</td><td>'+esc(r.rsi==null?"—":r.rsi)+'</td><td>'+esc(r.macd==null?"—":r.macd)+'</td><td>'+esc(r.emaTrend||"—")+'</td><td>'+esc(r.technicalScore==null?"—":r.technicalScore+"/100")+'</td></tr>';}).join("")+'</tbody></table>';};
}
function renderScreener(panel){
  panel.innerHTML='<form id="ncScreenForm" class="ncuw-form"><input name="tickers" placeholder="Ticker universe, comma-separated" required><select name="filter"><option value="bullish">Bullish</option><option value="bearish">Bearish</option><option value="oversold">RSI oversold</option><option value="overbought">RSI overbought</option></select><button>Run screen</button></form><div id="ncScreenResults" class="ncuw-empty">The screener only evaluates the ticker universe you provide.</div>';
  panel.querySelector("#ncScreenForm").onsubmit=async function(e){e.preventDefault();var f=new FormData(e.target),out=document.getElementById("ncScreenResults");out.textContent="Screening…";var rows=await NCUserTools.screen(String(f.get("tickers")).split(","),f.get("filter"));out.innerHTML=rows.length?'<div class="ncuw-grid">'+rows.map(function(r){return '<article class="ncuw-card"><strong>'+esc(r.ticker)+'</strong><div>'+money(r.price)+'</div><div class="ncuw-muted">RSI '+esc(r.rsi==null?"—":r.rsi)+' • Score '+esc(r.technicalScore==null?"—":r.technicalScore)+'</div></article>';}).join("")+'</div>':'<div class="ncuw-empty">No stocks matched this filter.</div>';};
}
function renderAlerts(panel){
  var s=state();
  panel.innerHTML='<form id="ncAlertForm" class="ncuw-form ncuw-form-wide"><input name="ticker" placeholder="Ticker" required><select name="type"><option value="priceAbove">Price above</option><option value="priceBelow">Price below</option></select><input name="threshold" type="number" min="0" step="any" placeholder="Target price" required><button>Add alert</button><button type="button" id="ncCheckAlerts">Check now</button></form>'+
  (s.alerts.length?'<div class="ncuw-grid">'+s.alerts.map(function(a){return '<article class="ncuw-card"><strong>'+esc(a.ticker)+'</strong><div>'+esc(a.type==="priceBelow"?"Below":"Above")+' '+money(a.threshold)+'</div><div class="ncuw-muted">'+(a.triggered?"Triggered at "+money(a.triggeredPrice):"Active")+'</div><button data-alert="'+esc(a.id)+'">Remove</button></article>';}).join("")+'</div>':'<div class="ncuw-empty">No alerts configured.</div>');
  panel.querySelector("#ncAlertForm").onsubmit=function(e){e.preventDefault();var f=new FormData(e.target);try{NCUserTools.addAlert({ticker:f.get("ticker"),type:f.get("type"),threshold:f.get("threshold")});render();}catch(err){alert(err.message);}};
  panel.querySelector("#ncCheckAlerts").onclick=async function(){var hits=await NCUserTools.checkAlerts();alert(hits.length?hits.length+" alert(s) triggered.":"No alerts triggered.");render();};
  panel.querySelectorAll("[data-alert]").forEach(function(b){b.onclick=function(){NCUserTools.removeAlert(b.dataset.alert);render();};});
}
function renderRecent(panel){
  var rows=state().recent;
  panel.innerHTML=rows.length?'<div class="ncuw-grid">'+rows.map(function(t){return '<article class="ncuw-card"><strong>'+esc(t)+'</strong><button data-recent="'+esc(t)+'">Analyze again</button></article>';}).join("")+'</div>':'<div class="ncuw-empty">No recent analyses yet.</div>';
  panel.querySelectorAll("[data-recent]").forEach(function(b){b.onclick=function(){runAnalysis(b.dataset.recent);};});
}
window.addEventListener("DOMContentLoaded",ensureUI);
window.addEventListener("nc:phase4-change",function(){if(root())render();});
})();
