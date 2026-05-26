/**
 * NanduChandu Markets - Global Variables, UI Handlers & Core Orchestrator
 */

var activeTF = "both", isLight = false;
var CACHE = {news:null,nTs:0,trend:null,tTs:0,global:null,gTs:0,cal:null,cTs:0,prices:{},analysis:{},nextday:{},outlook:{}};
var TTL = {s:5*60*1000, m:20*60*1000, l:60*60*1000};

function fresh(ts,t){return ts&&(Date.now()-ts)<t;}
function isUp(v){return !String(v||"0").trim().startsWith("-");}
function fmtVol(v){if(!v)return"—";if(v>10000000)return(v/10000000).toFixed(1)+"Cr";if(v>100000)return(v/100000).toFixed(1)+"L";return String(v);}
function fmtCap(v){if(!v)return"—";if(v>1e12)return"₹"+(v/1e12).toFixed(1)+"T";if(v>1e9)return"₹"+(v/1e9).toFixed(0)+"B";return"₹"+(v/1e7).toFixed(0)+"Cr";}
function timeAgo(ts){var m=Math.floor((Date.now()-ts)/60000);if(m<60)return m+"m ago";if(m<1440)return Math.floor(m/60)+"h ago";return Math.floor(m/1440)+"d ago";}
function tSty(t){if(t==="Bullish")return{c:"#22c55e",bg:"#052016",b:"#22c55e"};if(t==="Bearish")return{c:"#ef4444",bg:"#1a0505",b:"#ef4444"};return{c:"#f59e0b",bg:"#1a1400",b:"#f59e0b"};}
function ring(conf){var cc=conf>65?"#22c55e":conf>40?"#f59e0b":"#ef4444";var c=2*Math.PI*33;return'<svg width="84" height="84" viewBox="0 0 84 84"><circle cx="42" cy="42" r="33" fill="none" stroke="#1c2a45" stroke-width="7"/><circle cx="42" cy="42" r="33" fill="none" stroke="'+cc+'" stroke-width="7" stroke-dasharray="'+c.toFixed(1)+'" stroke-dashoffset="'+(c*(1-conf/100)).toFixed(1)+'" stroke-linecap="round" transform="rotate(-90 42 42)"/><text x="42" y="39" text-anchor="middle" fill="'+cc+'" font-size="14" font-weight="700">'+conf+'%</text><text x="42" y="52" text-anchor="middle" fill="#475569" font-size="8">CONF</text></svg>';}
function rls(arr){if(!Array.isArray(arr))return"";return arr.map(function(r){return'<div class="rsn">'+r+'</div>';}).join("");}
function skels(h,n){return Array(n).fill('<div class="skel" style="height:'+h+'px;margin-bottom:8px"></div>').join("");}
function ldng(msg){return'<div style="text-align:center;padding:40px 20px"><div class="spnr"></div><div style="font-size:13px;color:#64748b">'+msg+'</div><div style="font-size:10px;color:#22c55e;margin-top:6px">🆓 100% Free · No key needed</div></div>';}

// ── NATIVE SVG INTERACTIVE CHART DRAWING LAYER ──
function drawNativeChart(closes, up) {
  if(!closes || closes.length < 5) return '';
  var w = 500, h = 150;
  var min = Math.min(...closes), max = Math.max(...closes);
  var rng = max - min || 1;
  var pts = closes.map((p, i) => {
    var x = (i / (closes.length - 1)) * w;
    var y = h - ((p - min) / rng) * (h - 30) - 15;
    return x.toFixed(1) + ',' + y.toFixed(1);
  }).join(' ');
  
  var color = up ? "#22c55e" : "#ef4444";
  return '<div style="margin: 14px 0; background:#0f1525; border:1px solid #1c2a45; border-radius:12px; padding:12px;">' +
    '<div style="font-size:11px; color:#475569; margin-bottom:8px; font-weight:600; text-transform:uppercase;">Intraday Vector Timeline (Real-Time)</div>' +
    '<div style="height:140px; width:100%;">' +
    '<svg viewBox="0 0 500 150" style="width:100%; height:100%; overflow:visible;">' +
    '<polyline points="'+pts+'" fill="none" stroke="'+color+'" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>' +
    '</svg></div></div>';
}

// ── THEME SWITCHER ──
document.getElementById("themeBtn").addEventListener("click",function(){isLight=!isLight;document.body.classList.toggle("light",isLight);this.textContent=isLight?"🌙":"☀️";});

// ── TABS NAV CORE ──
var tabVis={};
function switchTab(name){
  document.querySelectorAll(".tab").forEach(function(t){t.classList.toggle("active",t.getAttribute("data-tab")===name);});
  document.querySelectorAll(".page").forEach(function(p){p.classList.toggle("show",p.id==="pg-"+name);});
  if(!tabVis[name]){tabVis[name]=true;if(name==="global")loadGlobal();if(name==="calendar")loadCal();}
}
document.querySelectorAll(".tab").forEach(function(t){t.addEventListener("click",function(){switchTab(t.getAttribute("data-tab"));});});

// ── SEARCH Auto-complete ──
var siEl=document.getElementById("si"), ddEl=document.getElementById("dd");
var ddTmr=null;
siEl.addEventListener("input",function(){
  clearTimeout(ddTmr);
  var q=siEl.value.trim();
  if(q.length<1){ddEl.classList.remove("open");return;}
  ddTmr=setTimeout(function(){doSearch(q);},300);
});
async function doSearch(q) {
  ddEl.innerHTML='<div style="padding:12px 14px;font-size:12px;color:#475569">🔍 Searching live markers…</div>';
  ddEl.classList.add("open");
  var results = await yfSearch(q);
  if (!results.length) {ddEl.classList.remove("open");return;}
  ddEl.innerHTML = results.map(function(r){
    var sym = r.symbol.replace(".NS","").replace(".BO","");
    var exch = r.symbol.endsWith(".NS")?"NSE":"BSE";
    return'<div class="ddr" data-t="'+sym+'"><span class="ddr-t">'+sym+'</span><span class="ddr-n">'+(r.longname||r.shortname||sym)+'</span><span style="font-size:10px;color:#475569">'+exch+'</span></div>';
  }).join("");
}
ddEl.addEventListener("click",function(e){var r=e.target.closest(".ddr");if(r){ddEl.classList.remove("open");siEl.value=r.getAttribute("data-t");runAnalysis(r.getAttribute("data-t"));}});
document.addEventListener("click",function(e){if(!e.target.closest(".sw"))ddEl.classList.remove("open");});
siEl.addEventListener("keydown",function(e){if(e.key==="Enter"&&siEl.value.trim()){ddEl.classList.remove("open");runAnalysis(siEl.value.trim());}});

// ── SYSTEM HOME STREAMS ──
async function loadNews(force){
  if(!force&&CACHE.news&&fresh(CACHE.nTs,TTL.s)){renderNews(CACHE.news);return;}
  document.getElementById("newsBody").innerHTML=skels(56,3);
  try {
    var news=await yfNews("NSE BSE India stock market");
    if(!news.length)throw"fail";
    CACHE.news=news;CACHE.nTs=Date.now();renderNews(news);
  }catch(e){document.getElementById("newsBody").innerHTML='<div style="color:#475569;font-size:12px;padding:8px">Could not load headers. Tap Refresh.</div>';}
}
function renderNews(arr){
  document.getElementById("newsBody").innerHTML=arr.map(function(n){
    var h = n.headline.toLowerCase();
    var badge = '<span class="su">Neutral</span>';
    if(h.includes("rise") || h.includes("profit") || h.includes("surge") || h.includes("gain") || h.includes("up") || h.includes("buy")) badge = '<span class="sp">🟢 Bullish</span>';
    else if(h.includes("fall") || h.includes("loss") || h.includes("slump") || h.includes("drop") || h.includes("down") || h.includes("crash")) badge = '<span class="sn">🔴 Bearish</span>';
    return'<div class="nc"><div class="nc-head">'+n.headline+'</div><div class="nc-meta"><span class="nc-src">'+(n.source||"Yahoo Finance")+'</span><span class="nc-time">'+n.time+'</span>'+badge+'</div></div>';
  }).join("");
}
document.getElementById("btnNews").addEventListener("click",function(){loadNews(true);});

async function loadTrend(force){
  if(!force&&CACHE.trend&&fresh(CACHE.tTs,TTL.s)){renderTrend(CACHE.trend);return;}
  document.getElementById("trendBody").innerHTML=skels(58,4);
  try{
    var movers=await yfMovers();
    if(!movers.length)throw"fail";
    CACHE.trend=movers;CACHE.tTs=Date.now();renderTrend(movers);
  }catch(e){document.getElementById("trendBody").innerHTML='<div style="color:#475569;font-size:12px;padding:8px">Could not load movers. Tap Refresh.</div>';}
}
function renderTrend(arr){
  document.getElementById("trendBody").innerHTML=arr.slice(0,8).map(function(s){
    var up=isUp(s.chg)||s.up;var pc=up?"#22c55e":"#ef4444";
    var emoji=["⚡","💻","🏦","🚗","💊","🏗️","💰","🌿","📡","🛢️"][Math.floor(Math.random()*10)];
    return'<div class="tcard" data-t="'+s.ticker+'">'+
      '<span style="font-size:20px;flex-shrink:0">'+emoji+'</span>'+
      '<div style="flex:1;min-width:0"><div style="font-size:12px;font-weight:600;color:#e2e8f4;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+(s.name||s.ticker)+'</div>'+
      '<div style="font-size:10px;color:#475569;margin-top:1px">'+s.ticker+' · NSE</div></div>'+
      '<div style="text-align:right"><div style="font-size:13px;font-weight:700;color:'+pc+'">'+(s.price||"—")+'</div>'+
      '<div style="font-size:10px;color:'+pc+';margin-top:1px">'+(up?"▲":"▼")+" "+(s.chg||"—")+'</div></div></div>';
  }).join("");
  document.querySelectorAll(".tcard").forEach(function(el){el.addEventListener("click",function(){runAnalysis(el.getAttribute("data-t"));});});
}
document.getElementById("btnTrend").addEventListener("click",function(){loadTrend(true);});

async function loadIdx(){
  try{
    var [n,s]=await Promise.all([yfQuote("NIFTY50"),yfQuote("SENSEX")]);
    function ic(name,p){if(!p)return'<div class="gc"><div class="gcl">'+name+'</div><div class="gcv">—</div></div>';var c=p.up?"#22c55e":"#ef4444";return'<div class="gc"><div class="gcl">'+name+'</div><div class="gcv" style="color:'+c+'">'+p.raw.toLocaleString("en-IN")+'</div><div class="gcs" style="color:'+c+'">'+(p.up?"▲":"▼")+" "+p.changePct+'</div></div>';}
    document.getElementById("idxCards").innerHTML=ic("NIFTY 50",n)+ic("SENSEX",s);
  }catch(e){}
}

// ── DEEP TECHNICAL ANALYSIS PIPELINE ──
async function runAnalysis(ticker){
  ticker=ticker.toUpperCase().trim(); siEl.value=ticker; switchTab("analysis");
  var body=document.getElementById("aBody");
  if(CACHE.analysis[ticker]&&fresh(CACHE.analysis[ticker].ts,TTL.m)){renderAnalysis(CACHE.analysis[ticker].d);return;}
  body.innerHTML=ldng("Calculating real-time math telemetry for "+ticker+"…");

  var pData=await yfQuote(ticker);
  var closes=pData?pData.closes:[];
  var news=await yfNews(ticker);

  var rsi=calcRSI(closes,14);
  var macd=calcMACD(closes);
  var ema20=calcEMA(closes,20);
  var ema50=calcEMA(closes,50);
  var ema200=calcEMA(closes,200);
  var sr=calcSR(closes);

  var ctx="Asset Ticker: "+ticker+" | Price: "+(pData?pData.price:"unknown")+" | Change: "+(pData?pData.changePct:"unknown")+" | RSI: "+rsi;
  var aiPrompt="Analyze this security context and return ONLY a valid JSON structure: "+ctx+". Keys required: trend, confidence, tradeDirection, entry, stopLoss, target1, target2, rsiSignal, macdSignal, volumeSignal, smaSignal, fiiActivity, diiActivity, optionsOI, probBull, probBear, riskLevel, riskScore, reasons (array of 5 strings), summary, newsHeadline, newsSentiment, sectorMomentum";

  var aiTxt=await freeAI(aiPrompt);
  var ai=pj(aiTxt)||{};

  var d={
    ticker:ticker, company: pData?pData.name:ticker, price: pData?pData.price:"N/A", changePct:pData?pData.changePct:"—", up: pData?pData.up:true,
    high:pData?pData.high:"—", low:pData?pData.low:"—", volume:pData?pData.volume:"—", mktCap:pData?pData.mktCap:"—", closes: closes,
    rsi:rsi, macd:macd||"—", ema20:ema20?"₹"+ema20:"—", ema50:ema50?"₹"+ema50:"—", ema200:ema200?"₹"+ema200:"—", support:sr.sup, resistance:sr.res, news:news.slice(0,4),
    trend: ai.trend||"Neutral", confidence: ai.confidence||60, tradeDirection:ai.tradeDirection||"WAIT", entry: ai.entry||"—", stopLoss: ai.stopLoss||"—", target1: ai.target1||"—", target2: ai.target2||"—",
    rsiSignal: ai.rsiSignal||"—", macdSignal: ai.macdSignal||"—", volumeSignal: ai.volumeSignal||"—", smaSignal: ai.smaSignal||"—", fiiActivity: ai.fiiActivity||"—", diiActivity: ai.diiActivity||"—", optionsOI: ai.optionsOI||"—",
    probBull: ai.probBull||55, probBear: ai.probBear||45, riskLevel: ai.riskLevel||"Medium", riskScore: ai.riskScore||50, reasons: ai.reasons||["Analysis generated against intraday charts."], summary: ai.summary||"", newsHeadline: ai.newsHeadline||"", newsSentiment: ai.newsSentiment||"Neutral", sectorMomentum: ai.sectorMomentum||"—"
  };
  CACHE.analysis[ticker]={d:d,ts:Date.now()};
  renderAnalysis(d);
}

function renderAnalysis(d){
  var pc=d.up?"#22c55e":"#ef4444"; var t=tSty(d.trend);
  var rs=Math.min(100,Math.max(0,parseInt(d.riskScore)||50));
  var pb=Math.min(100,Math.max(0,parseInt(d.probBull)||55)); var pbe=100-pb;
  var rsiVal=Math.min(100,Math.max(0,parseFloat(d.rsi)||50));
  var rc=rsiVal>70?"#ef4444":rsiVal<30?"#22c55e":"#f59e0b";
  var mc=(d.macdSignal||"").toLowerCase().includes("bull")?"#22c55e":"#ef4444";
  var drc=d.tradeDirection==="BUY"?"#22c55e":d.tradeDirection==="SELL"?"#ef4444":"#f59e0b";
  
  var chartHTML = drawNativeChart(d.closes, d.up);
  var nHTML=""; d.news.forEach(function(n){nHTML+='<div class="nc"><div class="nc-head">'+n.headline+'</div><div class="nc-meta"><span class="nc-src">'+n.source+'</span><span class="nc-time">'+n.time+'</span></div></div>';});
  var al=""; if(d.newsHeadline){if(d.newsSentiment==="Positive")al='<div class="ag">AMPLIFIED: '+d.newsHeadline+'</div>';else if(d.newsSentiment==="Negative")al='<div class="ar">ALERT: '+d.newsHeadline+'</div>';}

  document.getElementById("aBody").innerHTML=
    '<button class="bbtn" onclick="switchTab(\'home\')">← Back Home</button>'+al+
    '<div class="acrd"><div class="ahdr"><div><div class="anm">'+d.company+'</div><div class="asb"><span>'+d.ticker+'</span><span>·</span><span>NSE/BSE</span></div>'+
    '<div class="atgs"><span class="atg" style="color:'+t.c+';border-color:'+t.b+';background:'+t.bg+'">'+d.trend+'</span><span class="atg">'+d.mktCap+'</span><span class="atg">'+d.sectorMomentum+'</span></div></div>'+
    '<div class="apr"><div class="bprc" style="color:'+pc+'">'+d.price+'</div><div class="bchg" style="color:'+pc+'">'+d.changePct+'</div><div style="font-size:10px;color:#475569">H: '+d.high+' | L: '+d.low+'</div></div></div></div>'+
    chartHTML+
    '<div class="g4"><div class="gc"><div class="gcl">Support Level</div><div class="gcv" style="color:#22c55e">'+d.support+'</div></div><div class="gc"><div class="gcl">Resistance Level</div><div class="gcv" style="color:#ef4444">'+d.resistance+'</div></div><div class="gc"><div class="gcl">FII / DII Position</div><div class="gcv" style="font-size:11px">'+d.fiiActivity+'</div></div><div class="gc"><div class="gcl">Options OI</div><div class="gcv" style="font-size:11px">'+d.optionsOI+'</div></div></div>'+
    '<div class="sec"><div class="shr"><span class="stitle">Technical Indicators</span></div><div class="g3">'+
    '<div class="ic"><div class="icl">RSI (14)</div><div class="icv" style="color:'+rc+'">'+d.rsi+'</div><div class="ibar"><div class="ibf" style="width:'+rsiVal+'%;background:'+rc+'"></div></div><div class="icd">'+d.rsiSignal+'</div></div>'+
    '<div class="ic"><div class="icl">MACD Signal</div><div class="icv" style="color:'+mc+'">'+d.macd+'</div><div class="ibar"><div class="ibf" style="width:60%;background:'+mc+'"></div></div><div class="icd">'+d.macdSignal+'</div></div>'+
    '<div class="ic"><div class="icl">Volume Multiplier</div><div class="icv" style="color:#3b82f6;font-size:14px">'+d.volume+'</div><div class="ibar"><div class="ibf" style="width:65%;background:#3b82f6"></div></div><div class="icd">'+d.volumeSignal+'</div></div></div>'+
    '<div class="g4" style="margin-top:8px;margin-bottom:0"><div class="gc"><div class="gcl">EMA 20</div><div class="gcv" style="font-size:12px">'+d.ema20+'</div></div><div class="gc"><div class="gcl">EMA 50</div><div class="gcv" style="font-size:12px">'+d.ema50+'</div></div><div class="gc"><div class="gcl">EMA 200</div><div class="gcv" style="font-size:12px">'+d.ema200+'</div></div><div class="gc"><div class="gcl">MA Setup</div><div class="gcv" style="font-size:11px;color:'+mc+'">'+d.smaSignal+'</div></div></div></div>'+
    '<div class="sec"><div class="shr"><span class="stitle">Predictive Analytical Guidance</span></div><div class="pr"><div><span class="pb2" style="color:'+t.c+';background:'+t.bg+';border-color:'+t.b+'">'+d.trend+'</span><div style="font-size:11px;color:#94a3b8;margin-top:6px">Trade Vector: <strong style="color:'+drc+'">'+d.tradeDirection+'</strong> | Risk Profile: <strong>'+d.riskLevel+'</strong></div></div>'+ring(d.confidence)+'</div>'+
    '<div class="pbl"><span style="color:#22c55e">🟢 Bull Projection '+pb+'%</span><span style="color:#ef4444">Bear Projection '+pbe+'% 🔴</span></div><div class="pbb"><div class="pb-b" style="width:'+pb+'%"></div><div class="pb-r" style="width:'+pbe+'%"></div></div>'+
    '<div class="lvls"><div class="lv lv-e"><div class="lvl">Entry Target</div><div class="lvv">'+d.entry+'</div></div><div class="lv lv-s"><div class="lvl">Stop Loss</div><div class="lvv">'+d.stopLoss+'</div></div><div class="lv lv-t"><div class="lvl">Objective 1</div><div class="lvv">'+d.target1+'</div></div></div>'+
    (d.target2&&d.target2!=="—"?'<div style="text-align:center;font-size:12px;color:#64748b;margin-bottom:10px">🎯 Objective 2 Target: <strong style="color:#22c55e">'+d.target2+'</strong></div>':"")+
    '<div class="rrow"><span style="font-size:11px;color:#64748b">Risk Score</span><div class="rbar"><div class="rthumb" style="left:'+rs+'%"></div></div><span style="font-size:11px;color:#64748b">'+rs+'/100</span></div>'+
    (rls(d.reasons)?'<div style="margin-top:10px"><div style="font-size:10px;color:#475569;text-transform:uppercase;">Core Factors Matrix:</div>'+rls(d.reasons)+'</div>':"")+
    (d.summary?'<div class="asum">💡 '+d.summary+'</div>':"")+'</div>'+
    (nHTML?'<div class="sec"><div class="stitle">News Context</div>'+nHTML+'</div>':"")+
    '<div style="display:flex;gap:8px;margin-bottom:12px"><button class="abtn" id="lnkND">📅 Predict Tomorrow</button><button class="abtn" id="lnkTM">📈 Strategy Outlook</button></div>';

  document.getElementById("lnkND").addEventListener("click",function(){document.getElementById("ndIn").value=d.ticker;switchTab("nextday");runNextDay(d.ticker);});
  document.getElementById("lnkTM").addEventListener("click",function(){document.getElementById("tmIn").value=d.ticker;switchTab("term");runOutlook(d.ticker);});
}

// ── NEXT DAY ENGINE ──
document.getElementById("ndBtn").addEventListener("click",function(){var q=document.getElementById("ndIn").value.trim();if(q)runNextDay(q);});
async function runNextDay(ticker){
  ticker=ticker.toUpperCase().trim(); var body=document.getElementById("ndBody");
  if(CACHE.nextday[ticker]&&fresh(CACHE.nextday[ticker].ts,TTL.m)){renderND(CACHE.nextday[ticker].d);return;}
  body.innerHTML=ldng("Processing pattern distribution maps for tomorrow's open...");
  var p=await yfQuote(ticker);
  var aiTxt=await freeAI("Expert Indian stock analyst. Predict tomorrow's setup for "+ticker+" NSE. Close was "+(p?p.price:"N/A")+". Return JSON format: {trend,confidence,gapUpDown,expectedRange,keyLevel,catalysts,entry,stopLoss,target1,riskLevel,riskScore,probBull,probBear,reasons (array of 3 strings),summary}");
  var d=pj(aiTxt)||{}; d.ticker=ticker; d.priceData=p;
  CACHE.nextday[ticker]={d:d,ts:Date.now()}; renderND(d);
}
function renderND(d){
  var t=tSty(d.trend); var pb=Math.min(100,Math.max(0,parseInt(d.probBull)||55)); var pbe=100-pb; var rs=Math.min(100,Math.max(0,parseInt(d.riskScore)||50)); var p=d.priceData;
  document.getElementById("ndBody").innerHTML=
    (p?'<div class="gc" style="margin-bottom:10px;display:flex;justify-content:space-between"><div><div class="gcl">Current Base Close</div><div class="gcv">'+p.price+'</div></div><div><div class="gcl">Session Change</div><div style="font-size:13px;font-weight:700;color:'+(p.up?"#22c55e":"#ef4444")+'">'+p.changePct+'</div></div></div>':"")+
    '<div class="sec"><div style="font-size:11px;color:#475569;text-transform:uppercase;margin-bottom:5px">Tomorrow\'s Modeled Open</div><div style="font-size:16px;font-weight:700;color:#3b82f6">'+(d.gapUpDown||"Flat Setup")+'</div><div style="font-size:11px;color:#64748b;margin-top:3px">Range Variance: '+(d.expectedRange||"—")+' | Pivot Point: '+(d.keyLevel||"—")+'</div></div>'+
    '<div class="sec"><div class="shr"><span class="stitle">Direction Prediction Matrix</span><span class="pb2" style="font-size:11px;color:'+t.c+';background:'+t.bg+';border:1px solid '+t.b+'">'+d.trend+' ('+d.confidence+'%)</span></div>'+
    '<div class="pbl"><span style="color:#22c55e">🟢 Bull '+pb+'%</span><span style="color:#ef4444">Bear '+pbe+'% 🔴</span></div><div class="pbb"><div class="pb-b" style="width:'+pb+'%"></div><div class="pb-r" style="width:'+pbe+'%"></div></div>'+
    '<div class="lvls"><div class="lv lv-e"><div class="lvl">Action Entry</div><div class="lvv">'+(d.entry||"—")+'</div></div><div class="lv lv-s"><div class="lvl">Invalidation Line</div><div class="lvv">'+(d.stopLoss||"—")+'</div></div><div class="lv lv-t"><div class="lvl">Model Target</div><div class="lvv">'+(d.target1||"—")+'</div></div></div>'+
    '<div class="rrow"><span style="font-size:11px;color:#64748b">Variance Risk</span><div class="rbar"><div class="rthumb" style="left:'+rs+'%"></div></div><span style="font-size:11px;color:#64748b">'+rs+'/100</span></div>'+
    (d.summary?'<div class="asum">💡 '+d.summary+'</div>':"")+'</div>';
}

// ── TIMELINE OUTLOOK ENGINE ──
document.querySelectorAll(".tfb").forEach(function(b){b.addEventListener("click",function(){document.querySelectorAll(".tfb").forEach(function(x){x.classList.remove("active");});b.classList.add("active");activeTF=b.getAttribute("data-tf");});});
document.getElementById("tmBtn").addEventListener("click",function(){var q=document.getElementById("tmIn").value.trim();if(q)runOutlook(q);});
async function runOutlook(ticker){
  ticker=ticker.toUpperCase().trim(); var body=document.getElementById("tmBody"); var k=ticker+"_"+activeTF;
  if(CACHE.outlook[k]&&fresh(CACHE.outlook[k].ts,TTL.m)){body.innerHTML=CACHE.outlook[k].h;return;}
  body.innerHTML=ldng("Synthesizing algorithmic strategy horizons for "+ticker+"…");
  var p=await yfQuote(ticker);
  var prompt="Indian stock analyst. Asset trend outlook for "+ticker+" NSE. Close: "+(p?p.price:"N/A")+". Active perspective scope: "+activeTF+". Return strictly valid JSON array structure containing data parameters: {trend,confidence,entry,stopLoss,target1,riskScore,summary}";
  var txt=await freeAI(prompt); var d=pj(txt);
  if(!d){body.innerHTML='<div class="errbox">Could not assemble mathematical strategy outlook models.</div>';return;}
  var html=oCard(d);
  CACHE.outlook[k]={h:html,ts:Date.now()}; body.innerHTML=html;
}
function oCard(d){
  var t=tSty(d.trend); var conf=Math.min(100,Math.max(0,parseInt(d.confidence)||65)); var rs=Math.min(100,Math.max(0,parseInt(d.riskScore)||50));
  return'<div class="sec"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px"><h4>AI Horizon Strategy Model</h4><span class="pb2" style="color:'+t.c+';background:'+t.bg+';border-color:'+t.b+'">'+d.trend+'</span></div>'+
    '<div>Confidence Weight: <strong style="color:'+t.c+'">'+conf+'%</strong></div><div class="ibar" style="margin-bottom:11px;"><div class="ibf" style="width:'+conf+'%;background:'+t.c+'"></div></div>'+
    '<div class="lvls"><div class="lv lv-e"><div class="lvl">Execution Entry</div><div class="lvv">'+(d.entry||"—")+'</div></div><div class="lv lv-s"><div class="lvl">Risk Stop</div><div class="lvv">'+(d.stopLoss||"—")+'</div></div><div class="lv lv-t"><div class="lvl">Model Target</div><div class="lvv">'+(d.target1||"—")+'</div></div></div>'+
    '<div class="rrow"><span style="font-size:11px;color:#64748b">Structural Risk</span><div class="rbar"><div class="rthumb" style="left:'+rs+'%"></div></div><span style="font-size:11px;color:#64748b">'+rs+'/100</span></div>'+
    (d.summary?'<div class="asum">💡 '+d.summary+'</div>':"")+'</div>';
}

// ── GLOBAL TERMINAL ──
async function loadGlobal(force){
  if(!force&&CACHE.global&&fresh(CACHE.gTs,TTL.s)){renderGlobal(CACHE.global);return;}
  document.getElementById("gBody").innerHTML=skels(80,3);
  try{
    var symbols=["^NSEI","^BSESN","^GSPC","^IXIC","CL=F","GC=F"];
    var results=await Promise.all(symbols.map(function(s){return yfQuote(s);}));
    CACHE.global=results; CACHE.gTs=Date.now(); renderGlobal(results);
  }catch(e){document.getElementById("gBody").innerHTML='<div class="errbox">Failed to resolve terminal quotes stream.</div>';}
}
function renderGlobal(arr){
  var h='<div class="ggrid">';
  arr.forEach(function(p){
    if(!p)return; var c=p.up?"#22c55e":"#ef4444";
    h+='<div class="gcrd"><div class="gnm">'+p.name+'</div><div class="gvl" style="color:'+c+'">'+p.raw.toLocaleString("en-IN",{maximumFractionDigits:2})+'</div><div class="gch" style="color:'+c+'">'+(p.up?"▲":"▼")+" "+p.changePct+'</div></div>';
  });
  document.getElementById("gBody").innerHTML=h+'</div>';
}
document.getElementById("btnGlobal").addEventListener("click",function(){loadGlobal(true);});

// ── CORPORATE EVENTS CALENDAR ──
async function loadCal(force){
  if(!force&&CACHE.cal&&fresh(CACHE.cTs,TTL.l)){renderCal(CACHE.cal);return;}
  document.getElementById("calBody").innerHTML=skels(56,3);
  try{
    var aiTxt=await freeAI("List 5 major upcoming NSE dividend or results announcement dates this week. Return ONLY valid JSON array layout: [{date,company,type,detail}]");
    var arr=pja(aiTxt)||[];
    CACHE.cal=arr; CACHE.cTs=Date.now(); renderCal(arr);
  }catch(e){document.getElementById("calBody").innerHTML='<div class="errbox">Events calendar tracking channel offline.</div>';}
}
function renderCal(arr){
  var h='<div class="clst">';
  arr.forEach(function(e){
    h+='<div class="citem"><div class="cdt">'+e.date+'</div><div style="flex:1;"><div style="font-size:13px;font-weight:600;">'+e.company+'</div><div style="font-size:10px;color:#64748b;margin-top:2px;">'+e.detail+'</div></div><span class="ctag ct-e">'+e.type+'</span></div>';
  });
  document.getElementById("calBody").innerHTML=h||"No macroscopic announcements discovered.";
}
document.getElementById("btnCal").addEventListener("click",function(){loadCal(true);});

// ── INTEGRATED AI CHAT ASSISTANT ──
document.getElementById("chatSend").addEventListener("click",sendChat);
document.getElementById("chatIn").addEventListener("keydown",function(e){if(e.key==="Enter")sendChat();});
async function sendChat(){
  var inp=document.getElementById("chatIn"); var q=inp.value.trim(); if(!q)return;
  inp.value=""; var msgs=document.getElementById("chatMsgs");
  msgs.innerHTML+='<div class="cm cmu">'+q+'</div>';
  var tid="m"+Date.now();
  msgs.innerHTML+='<div class="cm cmai" id="'+tid+'"><span class="mspn"></span> Analysis compiling...</div>';
  msgs.scrollTop=msgs.scrollHeight;
  var txt=await freeAI("You are NanduChandu Markets conversational expert for Indian Stocks. Answer this user request directly in 3 short bullet points: "+q);
  document.getElementById(tid).innerHTML=txt||"Data streaming failure. Please refresh and resend inquiry.";
  msgs.scrollTop=msgs.scrollHeight;
}

// ── SYSTEM STARTUP ──
Promise.all([loadNews(), loadTrend(), loadIdx()]);
setInterval(function() { loadIdx(); if(document.getElementById("pg-home").classList.contains("show")) { loadTrend(true); } }, 30000);
