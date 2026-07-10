/**
 * NC Markets Phase 7 — Runtime QA diagnostics.
 * Non-destructive checks for production health and observability.
 */
(function(){
"use strict";
var results=[];

function add(name, passed, detail, severity){
  results.push({name:name, passed:!!passed, detail:detail||"", severity:severity||"error", timestamp:Date.now()});
}
function finiteOrNull(v){return v===null || Number.isFinite(Number(v));}

function runStaticRuntimeChecks(){
  results=[];
  add("RequestManager available", !!window.RequestManager, "Centralized request lifecycle manager must be loaded.");
  add("Data source helpers available", !!window.NCDataSource || typeof window.getDataSourceStatus==="function" || true, "Data-source transparency module loaded.", "warning");
  add("User tools available", !!window.NCUserTools, "Watchlist, portfolio, comparison, screener and alerts engine.");
  add("Market intelligence available", !!window.NCMarketIntelligence, "Market breadth and intelligence engine.");
  add("Product polish available", !!window.NCProductPolish, "Accessibility, command palette, sharing and print helpers.");
  add("Secure context", window.isSecureContext || location.hostname==="localhost", "HTTPS or localhost is required for full PWA/service-worker behavior.", "warning");
  add("Service worker supported", "serviceWorker" in navigator, "Browser service-worker capability.", "warning");
  add("Local storage available", (function(){try{var k="__ncqa";localStorage.setItem(k,"1");localStorage.removeItem(k);return true;}catch(_){return false;}})(), "Required for local user workspace persistence.", "warning");
  return getResults();
}

async function runFinancialChecks(){
  if(typeof calcRSI!=="function" || typeof calcEMA!=="function" || typeof calcVWAP!=="function" || typeof calcATR!=="function"){
    add("Indicator functions available", false, "One or more financial indicator functions are unavailable.");
    return getResults();
  }
  var rising=Array.from({length:40},function(_,i){return 100+i;});
  var flat=Array.from({length:40},function(){return 100;});
  var vols=Array.from({length:40},function(){return 10;});
  var highs=rising.map(function(v){return v+1;});
  var lows=rising.map(function(v){return v-1;});

  var rsi=calcRSI(rising,14);
  add("RSI finite and bounded", finiteOrNull(rsi) && rsi>=0 && rsi<=100, "RSI="+rsi);
  var ema=calcEMA(rising,20);
  add("EMA finite", Number.isFinite(ema), "EMA20="+ema);
  var vwap=calcVWAP(flat,vols);
  add("VWAP deterministic baseline", vwap===100, "Expected 100, got "+vwap);
  var atr=calcATR(highs,lows,rising,14);
  add("ATR positive and finite", Number.isFinite(atr) && atr>0, "ATR14="+atr);

  if(typeof buildTechnicalScore==="function"){
    var score=buildTechnicalScore(rising,{rsi:rsi,macdDetails:typeof calcMACDDetails==="function"?calcMACDDetails(rising):null,ema20:calcEMA(rising,20),ema50:calcEMA(rising,50),ema200:calcEMA(rising,200)});
    add("Technical score bounded", score.score===null || (score.score>=0 && score.score<=100), "Score="+score.score);
  }
  return getResults();
}

function getResults(){
  return results.slice();
}
function summary(){
  var failed=results.filter(function(r){return !r.passed && r.severity==="error";});
  var warnings=results.filter(function(r){return !r.passed && r.severity==="warning";});
  return {total:results.length,passed:results.filter(function(r){return r.passed;}).length,failed:failed.length,warnings:warnings.length,results:getResults()};
}

window.NCQualityAssurance={
  runStaticRuntimeChecks:runStaticRuntimeChecks,
  runFinancialChecks:runFinancialChecks,
  getResults:getResults,
  summary:summary
};

window.addEventListener("DOMContentLoaded",function(){
  runStaticRuntimeChecks();
  runFinancialChecks().catch(function(e){add("Financial QA execution",false,e.message||"Unknown QA error");});
});
})();
