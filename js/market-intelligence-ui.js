/**
 * NC Markets Phase 5 — Market Intelligence UI
 */
(function(){
"use strict";
function esc(v){return window.escapeHTML?window.escapeHTML(String(v==null?"":v)):String(v==null?"":v).replace(/[&<>\"']/g,function(c){return({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"})[c];});}
function pct(v){return v===null||v===undefined?"—":(v>0?"+":"")+Number(v).toFixed(2)+"%";}
function ensure(){
  if(document.getElementById("ncMarketIntel")||!window.NCMarketIntelligence)return;
  var sec=document.createElement("section"); sec.id="ncMarketIntel"; sec.className="nc-mi";
  sec.innerHTML='<div class="nc-mi-head"><div><h2>📊 Market Movers & Trends</h2><p>Real-time top gainers, losers, active stocks, and sector trends.</p></div><button id="ncMiRefresh">↻ Refresh</button></div><div id="ncMiBody"><div class="nc-mi-loading">Loading market trends…</div></div>';
  var anchor=document.getElementById("ncUserWorkspace");
  // Prefer mounting inside the Home page so Market Intelligence appears only on Home; fall back to main/body
  var target=document.getElementById("pg-home") || document.querySelector("main") || document.querySelector(".main") || document.body;
  if(anchor&&anchor.parentNode)anchor.parentNode.insertBefore(sec,anchor.nextSibling); else target.appendChild(sec);
  sec.addEventListener("click", function(e) {
    var item = e.target.closest("[data-mi-ticker]");
    if (item && typeof window.runAnalysis === "function") {
      window.runAnalysis(item.getAttribute("data-mi-ticker"));
    }
  });
  document.getElementById("ncMiRefresh").onclick=render; render();
}
async function render(){
  var body=document.getElementById("ncMiBody"); if(!body)return;
  body.innerHTML='<div class="nc-mi-loading">Refreshing market intelligence…</div>';
  var currentUniverse=NCMarketIntelligence.getUniverse?NCMarketIntelligence.getUniverse():[];
  if(!currentUniverse.length){
    body.innerHTML='<div class="nc-mi-empty">No companies are preloaded. Add stocks to your watchlist, portfolio, or recent analyses to build Market Intelligence dynamically.</div>';
    return;
  }
  try{
    var results=await Promise.all([NCMarketIntelligence.breadth(),NCMarketIntelligence.leaders(),NCMarketIntelligence.sectorPerformance()]);
    var b=results[0], l=results[1], s=results[2];
    body.innerHTML=
      '<div class="nc-mi-note">Tracked user universe: '+b.universe.map(esc).join(", ")+'</div>'+
      '<div class="nc-mi-summary"><div><span>Advances</span><strong>'+b.advances+'</strong></div><div><span>Declines</span><strong>'+b.declines+'</strong></div><div><span>Unchanged</span><strong>'+b.unchanged+'</strong></div><div><span>A/D ratio</span><strong>'+(b.ratio===null?"—":b.ratio)+'</strong></div></div>'+
      '<div class="mover-tabs-wrapper" style="display:flex; gap:8px; margin: 12px 0;"><button class="mover-tab active" data-mover="gainers" onclick="window.switchMoverTab(\'gainers\')">📈 Daily Gainers</button><button class="mover-tab" data-mover="losers" onclick="window.switchMoverTab(\'losers\')">📉 Daily Losers</button><button class="mover-tab" data-mover="active" onclick="window.switchMoverTab(\'active\')">🔥 Most Active</button></div>'+
      '<div id="moverTabContent">'+cards(l.gainers)+'</div>'+
      '<section class="nc-mi-block" style="margin-top:20px;"><h3>Equity Sectors</h3><div class="nc-mi-sector">'+s.map(function(x){return '<div class="sector-card-gf"><strong>'+esc(x.sector)+'</strong><span class="'+(x.changePct>=0?"up":"down")+'">'+pct(x.changePct)+'</span><small>'+x.members+' available constituent(s)</small></div>';}).join("")+'</div><div class="nc-mi-note">Sector performance derived dynamically from constituents in user workspace.</div></section>';

    window.MOVER_DATA_CACHE = l;
  }catch(e){body.innerHTML='<div class="errbox">⚠️ Market intelligence unavailable: '+esc(e.message||"Unknown error")+'</div>';} 
}
function cards(rows){return '<div class="nc-mi-list">'+(rows.length?rows.map(function(r){return '<div data-mi-ticker="'+esc(r.ticker)+'" style="cursor:pointer"><strong>'+esc(r.ticker)+'</strong><span>'+esc(r.name||"")+'</span><b class="'+(r.changePct>=0?"up":"down")+'">'+pct(r.changePct)+'</b></div>';}).join(""):'<div class="nc-mi-empty">No rows available.</div>')+'</div>';}

window.switchMoverTab = function(type) {
  var tabs = document.querySelectorAll(".mover-tab");
  tabs.forEach(function(t) {
    if (t.getAttribute("data-mover") === type) {
      t.classList.add("active");
    } else {
      t.classList.remove("active");
    }
  });
  var content = document.getElementById("moverTabContent");
  if (!content || !window.MOVER_DATA_CACHE) return;
  var rows = [];
  if (type === "gainers") rows = window.MOVER_DATA_CACHE.gainers || [];
  else if (type === "losers") rows = window.MOVER_DATA_CACHE.losers || [];
  else if (type === "active") rows = window.MOVER_DATA_CACHE.volumeLeaders || [];
  content.innerHTML = cards(rows);
};

window.addEventListener("DOMContentLoaded",ensure);
})();
