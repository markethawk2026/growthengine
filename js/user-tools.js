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
function cleanTicker(v){return String(v||"").trim().toUpperCase().replace(/[^A-Z0-9.^=_-]/g,"").slice(0,24);}
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
    var q=await yfQuote(h.ticker); var current=q&&Number(q.raw);
    var invested=h.quantity*h.averagePrice, value=Number.isFinite(current)?h.quantity*current:null;
    return Object.assign({},h,{currentPrice:current,invested:invested,currentValue:value,pnl:value===null?null:value-invested,pnlPct:value===null||!invested?null:((value-invested)/invested)*100});
  }));
  return rows;
}
async function compare(tickers){
  var list=Array.from(new Set((tickers||[]).map(cleanTicker).filter(Boolean))).slice(0,5);
  return Promise.all(list.map(async function(t){
    var q=await yfQuote(t); if(!q)return {ticker:t,error:"Unavailable"};
    var rsi=calcRSI(q.closes,14), md=calcMACDDetails(q.closes), e20=calcEMA(q.closes,20), e50=calcEMA(q.closes,50), e200=calcEMA(q.closes,200);
    var score=buildTechnicalScore(q.closes,{rsi:rsi,macdDetails:md,ema20:e20,ema50:e50,ema200:e200});
    return {ticker:t,price:q.raw,changePct:q.changePct,rsi:rsi,macd:md?md.macd:null,emaTrend:e20!==null&&e50!==null?(e20>e50?"Bullish":"Bearish"):"Unavailable",technicalScore:score.score,dataStatus:q.dataStatus};
  }));
}
async function screen(tickers,filter){
  var rows=await compare(tickers);
  return rows.filter(function(r){
    if(r.error)return false;
    if(filter==="bullish")return r.technicalScore>=60;
    if(filter==="bearish")return r.technicalScore<=40;
    if(filter==="oversold")return r.rsi!==null&&r.rsi<30;
    if(filter==="overbought")return r.rsi!==null&&r.rsi>70;
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

window.NCUserTools={getState:getState,addWatchlist:addWatchlist,removeWatchlist:removeWatchlist,addRecent:addRecent,addHolding:addHolding,removeHolding:removeHolding,setPreference:setPreference,addAlert:addAlert,removeAlert:removeAlert,portfolioSnapshot:portfolioSnapshot,compare:compare,screen:screen,checkAlerts:checkAlerts};
})();
