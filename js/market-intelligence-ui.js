/**
 * NC Markets Phase 5 — Market Intelligence UI
 */
(function(){
"use strict";
function esc(v){return window.escapeHTML?window.escapeHTML(String(v==null?"":v)):String(v==null?"":v).replace(/[&<>"']/g,function(c){return({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[c];});}
function pct(v){return v===null||v===undefined?"—":(v>0?"+":"")+Number(v).toFixed(2)+"%";}
function ensure(){
  if(document.getElementById("ncMarketIntel")||!window.NCMarketIntelligence)return;
  var sec=document.createElement("section"); sec.id="ncMarketIntel"; sec.className="nc-mi";
  sec.innerHTML='<div class="nc-mi-head"><div><h2>Market Intelligence</h2><p>Market breadth, leaders, sector performance and enhanced news using an explicitly disclosed ticker universe.</p></div><button id="ncMiRefresh">Refresh intelligence</button></div><div id="ncMiBody"><div class="nc-mi-loading">Loading market intelligence…</div></div>';
  var anchor=document.getElementById("ncUserWorkspace"), target=document.querySelector("main")||document.querySelector(".main")||document.body;
  if(anchor&&anchor.parentNode)anchor.parentNode.insertBefore(sec,anchor.nextSibling); else target.appendChild(sec);
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
    var results=await Promise.all([NCMarketIntelligence.breadth(),NCMarketIntelligence.leaders(),NCMarketIntelligence.sectorPerformance(),NCMarketIntelligence.enhancedNews("Indian stock market")]);
    var b=results[0], l=results[1], s=results[2], n=results[3].slice(0,8);
    body.innerHTML=
      '<div class="nc-mi-note">Breadth universe: '+b.universe.map(esc).join(", ")+'</div>'+
      '<div class="nc-mi-summary"><div><span>Advances</span><strong>'+b.advances+'</strong></div><div><span>Declines</span><strong>'+b.declines+'</strong></div><div><span>Unchanged</span><strong>'+b.unchanged+'</strong></div><div><span>A/D ratio</span><strong>'+(b.ratio===null?"—":b.ratio)+'</strong></div></div>'+
      '<div class="nc-mi-columns"><section><h3>Top gainers</h3>'+cards(l.gainers)+'</section><section><h3>Top losers</h3>'+cards(l.losers)+'</section></div>'+
      '<section class="nc-mi-block"><h3>Sector performance</h3><div class="nc-mi-sector">'+s.map(function(x){return '<div><strong>'+esc(x.sector)+'</strong><span class="'+(x.changePct>=0?"up":"down")+'">'+pct(x.changePct)+'</span><small>'+x.members+' available constituent(s)</small></div>';}).join("")+'</div><div class="nc-mi-note">Sector figures are simple averages of the disclosed constituent subset, not official sector-index returns.</div></section>'+
      '<section class="nc-mi-block"><h3>Enhanced financial news</h3><div class="nc-mi-news">'+(n.length?n.map(function(a){return '<article><div><strong>'+esc(a.headline)+'</strong><small>'+esc(a.source||"Unknown source")+' • Estimated sentiment: '+esc(a.estimatedSentiment)+'</small></div></article>';}).join(""):'<div class="nc-mi-empty">News unavailable.</div>')+'</div><div class="nc-mi-note">Sentiment is an estimated keyword-based classification, not a factual certainty.</div></section>';
  }catch(e){body.innerHTML='<div class="errbox">⚠️ Market intelligence unavailable: '+esc(e.message||"Unknown error")+'</div>';}
}
function cards(rows){return '<div class="nc-mi-list">'+(rows.length?rows.map(function(r){return '<div><strong>'+esc(r.ticker)+'</strong><span>'+esc(r.name||"")+'</span><b class="'+(r.changePct>=0?"up":"down")+'">'+pct(r.changePct)+'</b></div>';}).join(""):'<div class="nc-mi-empty">Unavailable</div>')+'</div>';}
window.addEventListener("DOMContentLoaded",ensure);
})();
