/**
 * NC Markets Phase 5 — Market Intelligence Engine
 * Uses existing quote/news APIs and RequestManager; no fabricated market values.
 */
(function(){
"use strict";

var EMPTY_UNIVERSE=[];
function dynamicUniverse(){
  try {
    var s=window.NCUserTools&&window.NCUserTools.getState?window.NCUserTools.getState():null;
    var symbols=[].concat((s&&s.watchlist)||[],(s&&s.recent)||[],((s&&s.portfolio)||[]).map(function(h){return h.ticker;}));
    return Array.from(new Set(symbols.filter(Boolean))).slice(0,50);
  } catch(_) { return []; }
}
var SECTORS={};

function pct(v){var n=parseFloat(String(v||"").replace("%",""));return Number.isFinite(n)?n:null;}
async function quoteRows(symbols){
  return Promise.all(symbols.map(async function(t){
    try{
      var q=await yfQuote(t);
      return q?{ticker:t,name:q.name,price:q.raw,changePct:pct(q.changePct),volume:Number(String(q.volume||"").replace(/[^\d.]/g,""))||null,dataStatus:q.dataStatus,dataSource:q.dataSource}:null;
    }catch(_){return null;}
  })).then(function(rows){return rows.filter(Boolean);});
}
async function breadth(symbols){
  var universe=(symbols&&symbols.length?symbols:dynamicUniverse()).slice(0,50);
  var rows=await quoteRows(universe);
  var advances=rows.filter(function(r){return r.changePct>0;}).length;
  var declines=rows.filter(function(r){return r.changePct<0;}).length;
  var unchanged=rows.length-advances-declines;
  return {universe:universe,rows:rows,advances:advances,declines:declines,unchanged:unchanged,ratio:declines?Number((advances/declines).toFixed(2)):null};
}
async function leaders(symbols){
  var b=await breadth(symbols), valid=b.rows.filter(function(r){return r.changePct!==null;});
  return {
    universe:b.universe,
    gainers:valid.slice().sort(function(a,b){return b.changePct-a.changePct;}).slice(0,5),
    losers:valid.slice().sort(function(a,b){return a.changePct-b.changePct;}).slice(0,5),
    volumeLeaders:b.rows.filter(function(r){return r.volume!==null;}).sort(function(a,b){return b.volume-a.volume;}).slice(0,5)
  };
}
async function sectorPerformance(){
  var output=[];
  for(var name in SECTORS){
    var rows=await quoteRows(SECTORS[name]);
    var changes=rows.map(function(r){return r.changePct;}).filter(function(v){return v!==null;});
    output.push({sector:name,changePct:changes.length?Number((changes.reduce(function(a,b){return a+b;},0)/changes.length).toFixed(2)):null,members:rows.length,universe:SECTORS[name]});
  }
  return output.sort(function(a,b){return (b.changePct||-999)-(a.changePct||-999);});
}
function estimateSentiment(article){
  var text=((article&&article.headline)||"")+" "+((article&&article.summary)||"");
  var positive=(text.match(/\b(gain|gains|rise|rises|surge|growth|beat|beats|profit|strong|record|upgrade|bullish)\b/gi)||[]).length;
  var negative=(text.match(/\b(fall|falls|drop|drops|loss|weak|miss|misses|downgrade|bearish|risk|slump|decline)\b/gi)||[]).length;
  return positive>negative?"Positive":negative>positive?"Negative":"Neutral";
}
async function enhancedNews(query){
  var rows=await yfNews(query||"market");
  var seen=new Set();
  return rows.filter(function(a){
    var key=String(a.headline||"").toLowerCase().replace(/\s+/g," ").trim();
    if(!key||seen.has(key))return false; seen.add(key); return true;
  }).map(function(a){return Object.assign({},a,{estimatedSentiment:estimateSentiment(a)});});
}
window.NCMarketIntelligence={getUniverse:dynamicUniverse,getUniverse:dynamicUniverse,breadth:breadth,leaders:leaders,sectorPerformance:sectorPerformance,enhancedNews:enhancedNews,estimateSentiment:estimateSentiment};
})();
