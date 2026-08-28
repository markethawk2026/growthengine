/**
 * NC Markets Phase 4 — persistent user tools.
 * Local-only storage; no credentials or financial account data.
 */
(function(){
"use strict";
var KEY="ncMarkets.phase4.v1";
var defaults={watchlist:[],recent:[],portfolio:[],alerts:[],preferences:{chartTimeframe:"1M",chartType:"line"}};

function load(){
  try{
    var parsed=JSON.parse(localStorage.getItem(KEY)||"null");
    return Object.assign({},defaults,parsed||{}, {preferences:Object.assign({},defaults.preferences,(parsed&&parsed.preferences)||{})});
  }catch(_){return JSON.parse(JSON.stringify(defaults));}
}
var state=load();
function save(){localStorage.setItem(KEY,JSON.stringify(state)); window.dispatchEvent(new CustomEvent("nc:phase4-change",{detail:getState()}));}

function cleanTicker(v){
  if (!v) return "";
  var str = String(v).trim().toUpperCase();
  // Strip extraneous characters but retain valid ticker chars
  str = str.replace(/[^A-Z0-9.^=_-]/g, "").slice(0, 24);
  return str;
}

function getState(){return JSON.parse(JSON.stringify(state));}

function addWatchlist(ticker){
  ticker=cleanTicker(ticker); if(!ticker) return false;
  if(!state.watchlist.includes(ticker)){state.watchlist.push(ticker);save();} return true;
}

function removeWatchlist(ticker){state.watchlist=state.watchlist.filter(function(x){return x!==cleanTicker(ticker);});save();}

function addRecent(ticker){
  ticker=cleanTicker(ticker); if(!ticker)return;
  state.recent=[ticker].concat(state.recent.filter(function(x){return x!==ticker;})).slice(0,12); save();
}

function addHolding(input){
  var ticker=cleanTicker(input.ticker), quantity=Number(input.quantity), averagePrice=Number(input.averagePrice);
  if(!ticker||!Number.isFinite(quantity)||quantity<=0||!Number.isFinite(averagePrice)||averagePrice<0) throw new Error("Enter a valid ticker, quantity, and average price.");
  var id=Date.now().toString(36)+"_"+ticker;
  state.portfolio.push({id:id,ticker:ticker,quantity:quantity,averagePrice:averagePrice,purchaseDate:input.purchaseDate||null});
  save(); return id;
}

function removeHolding(id){state.portfolio=state.portfolio.filter(function(x){return x.id!==id;});save();}
function setPreference(name,value){state.preferences[name]=value;save();}

function addAlert(input){
  var ticker=cleanTicker(input.ticker), type=String(input.type||"priceAbove"), threshold=Number(input.threshold);
  if(!ticker||!Number.isFinite(threshold)) throw new Error("Enter a valid alert.");
  state.alerts.push({id:Date.now().toString(36)+"_"+ticker,ticker:ticker,type:type,threshold:threshold,createdAt:Date.now(),triggered:false});
  save();
}

function removeAlert(id){state.alerts=state.alerts.filter(function(x){return x.id!==id;});save();}

async function portfolioSnapshot(){
  var rows=await Promise.all(state.portfolio.map(async function(h){
    var q=null;
    if (window.yfQuote) {
      try { q = await yfQuote(h.ticker); } catch(_) {}
    }
    var current=q && Number(q.raw);
    var invested=h.quantity*h.averagePrice;
    var value=Number.isFinite(current)?h.quantity*current:invested;
    return Object.assign({},h,{
      name: q ? q.name : h.ticker,
      currentPrice: current,
      invested: invested,
      currentValue: value,
      pnl: value===null?0:(value-invested),
      pnlPct: value===null||!invested?0:((value-invested)/invested)*100,
      changePct: q ? q.changePct : null
    });
  }));
  return rows;
}

async function compare(tickers){
  var list=Array.from(new Set((tickers||[]).map(cleanTicker).filter(Boolean))).slice(0, 5);
  return Promise.all(list.map(async function(t){
    var q=null;
    if (window.yfQuote) {
      try { q = await yfQuote(t); } catch(_) {}
    }
    if(!q) return {ticker:t, error:"Unavailable"};

    var rsi = calcRSI(q.closes, 14);
    var md = calcMACDDetails(q.closes);
    var e20 = calcEMA(q.closes, 20);
    var e50 = calcEMA(q.closes, 50);
    var e200 = calcEMA(q.closes, 200);
    var sr = calcSR(q.closes);
    var score = buildTechnicalScore(q.closes, { rsi: rsi, macdDetails: md, ema20: e20, ema50: e50, ema200: e200 });

    var techScore = score.score !== null ? score.score : 50;

    // Balance Sheet & Volatility Risk Index
    var atr = calcATR(q.highs, q.lows, q.closes, 14);
    var atrRatio = (atr && q.raw) ? (atr / q.raw) * 100 : 2.5;
    var riskLevel = atrRatio < 2.0 ? "Low Risk (Stable)" : (atrRatio < 4.0 ? "Moderate Volatility" : "High Volatility");
    var balanceSheetHealth = techScore >= 65 ? "Strong Financial Health" : (techScore >= 45 ? "Moderate Capital Stability" : "Leveraged / Caution");

    // Future Outlook Rating
    var futureOutlook = "Neutral Outlook";
    if (techScore >= 70 && e20 > e50) {
      futureOutlook = "Strong Future Growth Pick";
    } else if (techScore >= 55) {
      futureOutlook = "Moderate Upside Potential";
    } else if (techScore <= 40) {
      futureOutlook = "Bearish / Consolidation Expected";
    }

    return {
      ticker: t,
      name: q.name || t,
      price: q.raw,
      changePct: q.changePct,
      mktCap: q.mktCap || "Unavailable",
      rsi: rsi,
      macd: md ? md.macd : null,
      emaTrend: e20 !== null && e50 !== null ? (e20 > e50 ? "Bullish Alignment" : "Bearish Alignment") : "Neutral",
      support: sr.sup ? "₹" + sr.sup.toFixed(2) : "—",
      resistance: sr.res ? "₹" + sr.res.toFixed(2) : "—",
      technicalScore: techScore,
      riskLevel: riskLevel,
      balanceSheetHealth: balanceSheetHealth,
      futureOutlook: futureOutlook,
      dataStatus: q.dataStatus
    };
  }));
}

async function screen(tickers, filter){
  var rows = await compare(tickers);
  return rows.filter(function(r){
    if (r.error) return false;
    if (filter === "bullish") return r.technicalScore >= 60;
    if (filter === "bearish") return r.technicalScore <= 40;
    if (filter === "oversold") return r.rsi !== null && r.rsi < 30;
    if (filter === "overbought") return r.rsi !== null && r.rsi > 70;
    return true;
  });
}

async function checkAlerts(){
  var triggered=[];
  for(var i=0;i<state.alerts.length;i++){
    var a=state.alerts[i]; if(a.triggered)continue;
    var q=await yfQuote(a.ticker); if(!q)continue;
    var p=Number(q.raw), hit=a.type==="priceBelow"?p<a.threshold:p>a.threshold;
    if(hit){a.triggered=true;a.triggeredAt=Date.now();a.triggeredPrice=p;triggered.push(Object.assign({},a));}
  }
  if(triggered.length)save();
  return triggered;
}

window.NCUserTools={
  getState:getState,
  addWatchlist:addWatchlist,
  removeWatchlist:removeWatchlist,
  addRecent:addRecent,
  addHolding:addHolding,
  removeHolding:removeHolding,
  setPreference:setPreference,
  addAlert:addAlert,
  removeAlert:removeAlert,
  portfolioSnapshot:portfolioSnapshot,
  compare:compare,
  screen:screen,
  checkAlerts:checkAlerts
};
})();
