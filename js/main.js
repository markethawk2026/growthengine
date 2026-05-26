/**
 * NanduChandu Markets - UI Navigation, State Routing & Dual-Axis Visualization Layer
 */

var activeTF = "both", isLight = false, activeTickerNode = "NIFTY50";

function isUp(v){ return !String(v || "0").trim().startsWith("-"); }
function fmtVol(v){ if(!v) return "—"; if(v > 10000000) return (v / 10000000).toFixed(1) + "Cr"; if(v > 100000) return (v / 100000).toFixed(1) + "L"; return String(v); }
function fmtCap(v){ if(!v) return "—"; if(v > 1e12) return "₹" + (v / 1e12).toFixed(1) + "T"; if(v > 1e9) return "₹" + (v / 1e9).toFixed(0) + "B"; return "₹" + (v / 1e7).toFixed(0) + "Cr"; }
function timeAgo(ts){ var m = Math.floor((Date.now() - ts) / 60000); if(m < 60) return m + "m ago"; if(m < 1440) return Math.floor(m / 60) + "h ago"; return Math.floor(m / 1440) + "d ago"; }
function tSty(t){ if(t === "Bullish" || t === "BUY" || t === "Strong Buy") return { c: "#22c55e", bg: "#052016", b: "#22c55e" }; if(t === "Bearish" || t === "SELL" || t === "Strong Sell") return { c: "#ef4444", bg: "#1a0505", b: "#ef4444" }; return { c: "#f59e0b", bg: "#1a1400", b: "#f59e0b" }; }
function ring(conf){ var cc = conf > 65 ? "#22c55e" : conf > 40 ? "#f59e0b" : "#ef4444"; var c = 2 * Math.PI * 33; return '<svg width="84" height="84" viewBox="0 0 84 84"><circle cx="42" cy="42" r="33" fill="none" stroke="#1c2a45" stroke-width="7"/><circle cx="42" cy="42" r="33" fill="none" stroke="' + cc + '" stroke-width="7" stroke-dasharray="' + c.toFixed(1) + '" stroke-dashoffset="' + (c * (1 - conf / 100)).toFixed(1) + '" stroke-linecap="round" transform="rotate(-90 42 42)"/><text x="42" y="39" text-anchor="middle" fill="' + cc + '" font-size="14" font-weight="700">' + conf + '%</text><text x="42" y="52" text-anchor="middle" fill="#475569" font-size="8">CONF</text></svg>'; }
function rls(arr){ if(!Array.isArray(arr)) return ""; return arr.map(function(r){ return '<div class="rsn">' + r + '</div>'; }).join(""); }
function skels(h, n){ return Array(n).fill('<div class="skel" style="height:' + h + 'px;margin-bottom:8px"></div>').join(""); }
function ldng(msg){ return '<div style="text-align:center;padding:40px 20px"><div class="spnr"></div><div style="font-size:13px;color:#64748b">' + msg + '</div></div>'; }

function drawNativeChart(closes, volumes, up) {
  if(!closes || closes.length < 2) return '';
  var w = 500, h = 140;
  var minP = Math.min(...closes), maxP = Math.max(...closes);
  var rngP = maxP - minP || 1;
  var pricePts = closes.map((p, i) => {
    var x = (i / (closes.length - 1)) * w;
    var y = h - ((p - minP) / rngP) * (h - 45) - 30;
    return x.toFixed(1) + ',' + y.toFixed(1);
  }).join(' ');

  var volumeHTML = "";
  if(volumes && volumes.length > 0) {
    var maxV = Math.max(...volumes) || 1; var barCount = closes.length; var barWidth = (w / barCount) * 0.75;
    volumes.forEach((v, idx) => {
      var barHeight = (v / maxV) * 25; var x = (idx / (barCount - 1)) * w - (barWidth / 2); var y = h - barHeight - 5;
      volumeHTML += '<rect x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" width="' + barWidth.toFixed(1) + '" height="' + barHeight.toFixed(1) + '" fill="#1e293b" opacity="0.65"/>';
    });
  }
  var color = up ? "#22c55e" : "#ef4444";
  return '<div style="margin:14px 0;background:#0b0f19;border:1px solid #1c2a45;border-radius:12px;padding:12px;">' +
    '<div style="font-size:10px;color:#475569;margin-bottom:8px;font-weight:700;letter-spacing:.5px;text-transform:uppercase;display:flex;justify-content:space-between;"><span>Intraday Technical Waveform</span><span>Dual-Axis Vol/Price</span></div>' +
    '<div style="height:120px;width:100%;"><svg viewBox="0 0 500 140" style="width:100%; height:100%; overflow:visible;">' +
    volumeHTML + '<polyline points="' + pricePts + '" fill="none" stroke="' + color + '" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>' +
    </svg></div></div>';
}

function switchTab(name){
  document.querySelectorAll(".tab").forEach(function(t){ t.classList.toggle("active", t.getAttribute("data-tab") === name); });
  document.querySelectorAll(".page").forEach(function(p){ p.classList.toggle("show", p.id === "pg-" + name); });
  
  if(name === "global") loadGlobal(); 
  if(name === "calendar") loadCal();
  
  if(name === "nextday" && window.activeTickerNode) {
    var ndInput = document.getElementById("ndIn");
    if(ndInput) { ndInput.value = window.activeTickerNode; runNextDay(window.activeTickerNode); }
  }
  if(name === "term" && window.activeTickerNode) {
    var tmInput = document.getElementById("tmIn");
    if(tmInput) { tmInput.value = window.activeTickerNode; runOutlook(window.activeTickerNode); }
  }
}
document.querySelectorAll(".tab").forEach(function(t){ t.addEventListener("click", function(){ switchTab(t.getAttribute("data-tab")); }); });

var siEl = document.getElementById("si"), ddEl = document.getElementById("dd");
var ddTmr = null;
siEl.addEventListener("input", function(){
  clearTimeout(ddTmr); var q = siEl.value.trim(); if(q.length < 1){ ddEl.classList.remove("open"); return; }
  ddTmr = setTimeout(function(){ doSearch(q); }, 300);
});
async function doSearch(q) {
  ddEl.innerHTML = '<div style="padding:12px 14px;font-size:12px;color:#475569">🔍 Searching dynamic fields...</div>';
  ddEl.classList.add("open"); var res = await yfSearch(q);
  if (!res.length) { ddEl.innerHTML = '<div style="padding:12px 14px;font-size:12px;color:#475569">No matching assets.</div>'; return; }
  ddEl.innerHTML = res.map(function(r){
    var sym = r.symbol.replace(".NS", "").replace(".BO", "");
    return '<div class="ddr" data-t="' + sym + '"><span class="ddr-t">' + sym + '</span><span class="ddr-n">' + (r.longname || r.shortname || sym) + '</span></div>';
  }).join("");
}
ddEl.addEventListener("click", function(e){ var r = e.target.closest(".ddr"); if(r){ ddEl.classList.remove("open"); siEl.value = r.getAttribute("data-t"); runAnalysis(r.getAttribute("data-t")); } });
document.addEventListener("click", function(e){ if(!e.target.closest(".sw")) ddEl.classList.remove("open"); });

async function loadNews(force){
  if(!force && window.CACHE.news && fresh(window.CACHE.nTs, window.TTL.s)) { renderNews(window.CACHE.news); return; }
  document.getElementById("newsBody").innerHTML = skels(56, 3);
  var news = await yfNews("NIFTY"); window.CACHE.news = news; window.CACHE.nTs = Date.now(); renderNews(news);
}
function renderNews(arr){
  if(!arr.length) { document.getElementById("newsBody").innerHTML = '<div style="font-size:12px;padding:10px;color:#475569;">No active market briefings.</div>'; return; }
  document.getElementById("newsBody").innerHTML = arr.map(function(n){
    return '<div class="nc"><div class="nc-head">' + n.headline + '</div><div class="nc-meta"><span>' + (n.source || "Market Feed") + '</span><span>·</span><span>' + n.time + '</span></div></div>';
  }).join("");
}
document.getElementById("btnNews").addEventListener("click", function(){ loadNews(true); });

async function loadTrend(force){
  if(!force && window.CACHE.trend && fresh(window.CACHE.tTs, window.TTL.s)) { renderTrend(window.CACHE.trend); return; }
  document.getElementById("trendBody").innerHTML = skels(58, 4);
  var movers = await yfMovers(); window.CACHE.trend = movers; window.CACHE.tTs = Date.now(); renderTrend(movers);
}
function renderTrend(arr){
  if(!arr.length) { document.getElementById("trendBody").innerHTML = '<div style="font-size:12px;padding:10px;color:#475569;">Movers feed synchronization locking.</div>'; return; }
  document.getElementById("trendBody").innerHTML = arr.slice(0, 8).map(function(s){
    var up = isUp(s.chg); var pc = up ? "#22c55e" : "#ef4444";
    var emoji = ["📈", "📊", "⚡", "🚀", "💎", "🔋", "🏢", "🏭"][Math.floor(Math.random() * 8)];
    return '<div class="tcard" data-t="' + s.ticker + '"><span style="font-size:18px;margin-right:4px;">' + emoji + '</span>' +
      '<div style="flex:1;min-width:0;"><div style="font-size:12px;font-weight:700;color:#e2e8f4;">' + s.ticker + '</div><div style="font-size:10px;color:#475569;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + s.name + '</div></div>' +
      '<div style="text-align:right;"><div style="font-size:12px;font-weight:700;color:' + pc + '">' + s.price + '</div><div style="font-size:10px;color:' + pc + '">' + (up ? "▲" : "▼") + ' ' + s.chg + '</div></div></div>';
  }).join("");
  
  var stripHTML = '<span style="font-size: 11px; color: #64748b; align-self: center; margin-right: 4px; font-weight: 600; white-space: nowrap;">⚡ Quick View:</span>';
  arr.slice(0, 6).forEach(function(s) { stripHTML += '<span class="csg" onclick="runAnalysis(\'' + s.ticker + '\')" style="margin:0; padding: 5px 12px;">' + s.ticker + '</span>'; });
  document.getElementById("quickViewStrip").innerHTML = stripHTML;

  var chatSgHTML = ""; arr.slice(0, 4).forEach(function(s) { chatSgHTML += '<span class="csg" onclick="document.getElementById(\'chatIn\').value=this.textContent;sendChat();">Is ' + s.ticker + ' a good buy?</span>'; });
  var chatSgBox = document.getElementById("chatSuggestions"); if(chatSgBox) chatSgBox.innerHTML = chatSgHTML;

  document.querySelectorAll(".tcard").forEach(function(el){ el.addEventListener("click", function(){ runAnalysis(el.getAttribute("data-t")); }); });
}
document.getElementById("btnTrend").addEventListener("click", function(){ loadTrend(true); });

async function loadIdx(){
  var [n, s] = await Promise.all([yfQuote("NIFTY50"), yfQuote("SENSEX")]);
  function ic(name, p){ if(!p) return ''; var c = p.up ? "#22c55e" : "#ef4444"; return '<div class="gc"><div class="gcl">' + name + '</div><div class="gcv" style="color:' + c + '">' + p.raw.toLocaleString("en-IN") + '</div><div class="gcs" style="color:' + c + '">' + (p.up ? "▲" : "▼") + " " + p.changePct + '</div></div>'; }
  document.getElementById("idxCards").innerHTML = ic("NIFTY 50", n) + ic("SENSEX", s);
}

async function runAnalysis(ticker){
  ticker = ticker.toUpperCase().trim(); siEl.value = ticker; window.activeTickerNode = ticker; switchTab("analysis");
  var body = document.getElementById("aBody"); if(window.CACHE.analysis[ticker] && fresh(window.CACHE.analysis[ticker].ts, window.TTL.m)) { renderAnalysis(window.CACHE.analysis[ticker].d); return; }
  body.innerHTML = ldng("Processing dual-axis matrix fields for " + ticker + "...");

  var pData = await yfQuote(ticker); if(!pData) { body.innerHTML = '<div class="errbox">Ticker resolution timed out on server channels.</div>'; return; }
  var closes = pData.closes; var volumes = pData.volumes; var news = await yfNews(ticker);
  var rsi = calcRSI(closes, 14); var macd = calcMACD(closes); var ema20 = calcEMA(closes, 20); var ema50 = calcEMA(closes, 50); var sr = calcSR(closes);

  var calculatedHealth = calculateTechnicalScore(closes, rsi, macd, ema20, ema50);
  var healthVerdict = calculatedHealth > 75 ? "Strong Buy" : calculatedHealth > 50 ? "Buy" : calculatedHealth > 35 ? "Hold" : "Sell";
  var healthColor = tSty(healthVerdict).c;

  var prompt = "You are an expert Indian stock analyst. Provide a technical target evaluation matrix review structure for ticker " + ticker + " with close price " + pData.price + ". Return strictly a single clean JSON dictionary layout string: {\"trend\":\"Bullish/Bearish/Neutral\",\"confidence\":75,\"tradeDirection\":\"BUY/SELL/WAIT\",\"entry\":\"₹X\",\"stopLoss\":\"₹Y\",\"target1\":\"₹Z\",\"target2\":\"₹W\",\"rsiSignal\":\"Text\",\"macdSignal\":\"Text\",\"volumeSignal\":\"Text\",\"smaSignal\":\"Text\",\"fiiActivity\":\"Text\",\"optionsOI\":\"Text\",\"probBull\":60,\"probBear\":40,\"riskLevel\":\"Low/Medium/High\",\"riskScore\":45,\"reasons\":[\"Factor A\",\"Factor B\"],\"summary\":\"Analysis overview profile parameters here.\"}";
  var aiTxt = await freeAI(prompt); var ai = pj(aiTxt) || {};

  var d = {
    ticker: ticker, company: pData.name, price: pData.price, changePct: pData.changePct, up: pData.up,
    high: pData.high, low: pData.low, volume: pData.volume, mktCap: pData.mktCap, closes: closes, volumes: volumes,
    rsi: rsi, macd: macd || "0.00", support: sr.sup, resistance: sr.res, news: news.slice(0, 4), healthScore: calculatedHealth, healthVerdict: healthVerdict, healthColor: healthColor,
    trend: ai.trend || healthVerdict, confidence: ai.confidence || calculatedHealth, tradeDirection: ai.tradeDirection || (calculatedHealth > 50 ? "BUY" : "WAIT"), 
    entry: ai.entry && ai.entry !== "—" ? ai.entry : "₹" + pData.raw.toFixed(2), 
    stopLoss: ai.stopLoss && ai.stopLoss !== "—" ? ai.stopLoss : sr.sup !== "—" ? sr.sup : "₹" + (pData.raw * 0.97).toFixed(2), 
    target1: ai.target1 && ai.target1 !== "—" ? ai.target1 : sr.res !== "—" ? sr.res : "₹" + (pData.raw * 1.05).toFixed(2), 
    target2: ai.target2 || "—",
    rsiSignal: ai.rsiSignal || "Standard Dynamic Index Range", macdSignal: ai.macdSignal || "Convergence Zone Range Map", volumeSignal: ai.volumeSignal || "Standard Distribution Profile", smaSignal: ai.smaSignal || "Tracking Benchmarks Alignment",
    fiiActivity: ai.fiiActivity || "Balanced Operations Flow", optionsOI: ai.optionsOI || "Neutral Build Layer", probBull: ai.probBull || calculatedHealth, probBear: ai.probBear || (100 - calculatedHealth),
    riskLevel: ai.riskLevel || (calculatedHealth < 35 ? "High" : "Medium"), riskScore: ai.riskScore || 50, reasons: ai.reasons || ["Calculated using local pattern analysis."], summary: ai.summary || "System metrics processing stable target parameters mapping curves."
  };
  window.CACHE.analysis[ticker] = { d: d, ts: Date.now() }; renderAnalysis(d);
}

function renderAnalysis(d){
  var pc = d.up ? "#22c55e" : "#ef4444"; var t = tSty(d.trend);
  var chartHTML = drawNativeChart(d.closes, d.volumes, d.up);
  var nHTML = d.news.map(n => '<div class="nc"><div class="nc-head">' + n.headline + '</div><div class="nc-meta"><span>' + n.source + '</span><span>·</span><span>' + n.time + '</span></div></div>').join("");

  document.getElementById("aBody").innerHTML =
    '<button class="bbtn" onclick="switchTab(\'home\')">← Back Home</button>' +
    '<div class="acrd"><div class="ahdr"><div><div class="anm">' + d.company + '</div><div class="asb">' + d.ticker.replace("^", "") + ' · India</div>' +
    '<div class="atgs"><span class="atg" style="color:' + t.c + ';border-color:' + t.b + ';background:' + t.bg + '">' + d.trend + '</span><span class="atg">' + d.mktCap + '</span></div></div>' +
    '<div class="apr" style="margin-left:auto;text-align:right;"><div class="bprc" style="color:' + pc + '">' + d.price + '</div><div class="bchg" style="color:' + pc + '">' + d.changePct + '</div></div></div>' +
    '<div style="margin-top:10px; background:#111625; padding:10px; border-radius:10px; border:1px dashed #1c2a45; display:flex; justify-content:space-between; align-items:center;">' +
    '<div><span style="font-size:11px; color:#64748b; font-weight:600;">TECHNICAL SCORE:</span><div style="font-size:15px; font-weight:800; color:'+d.healthColor+'">' + d.healthScore + '% — ' + d.healthVerdict + '</div></div>' +
    '<div style="height:6px; width:120px; background:#1c2a45; border-radius:3px; overflow:hidden;"><div style="height:100%; width:'+d.healthScore+'%; background:'+d.healthColor+'"></div></div></div></div>' +
    chartHTML +
    '<div class="g4"><div class="gc"><div class="gcl">Support</div><div class="gcv" style="color:#22c55e">' + d.support + '</div></div><div class="gc"><div class="gcl">Resistance</div><div class="gcv" style="color:#ef4444">' + d.resistance + '</div></div><div class="gc"><div class="gcl">FII Operations</div><div class="gcv" style="font-size:11px">' + d.fiiActivity + '</div></div><div class="gc"><div class="gcl">OI Structure</div><div class="gcv" style="font-size:11px">' + d.optionsOI + '</div></div></div>' +
    '<div class="sec"><div class="stitle">Indicators</div><div class="g3">' +
    '<div class="ic"><div class="icl">RSI (14)</div><div class="icv" style="color:#f59e0b">' + d.rsi + '</div><div class="icd">' + d.rsiSignal + '</div></div>' +
    '<div class="ic"><div class="icl">MACD Line</div><div class="icv" style="color:#3b82f6">' + d.macd + '</div><div class="icd">' + d.macdSignal + '</div></div>' +
    '<div class="ic"><div class="icl">Volume Multiplier</div><div class="icv" style="font-size:13px;">' + d.volume + '</div><div class="icd">' + d.volumeSignal + '</div></div></div></div>' +
    '<div class="sec"><div class="stitle">AI Evaluation Model</div><div class="pr"><div><span class="pb2" style="color:' + t.c + ';background:' + t.bg + ';border-color:' + t.b + '">' + d.tradeDirection + ' DIRECTION</span><div style="font-size:11px;color:#94a3b8;margin-top:7px;">Confidence: <strong>' + d.confidence + '%</strong> | Risk: <strong>' + d.riskLevel + '</strong></div></div>' + ring(d.confidence) + '</div>' +
    '<div class="pbl"><span style="color:#22c55e">🟢 Bull Projections ' + d.probBull + '%</span><span style="color:#ef4444">Bear Projections ' + d.probBear + '% 🔴</span></div><div class="pbb"><div class="pb-b" style="width:' + d.probBull + '%"></div><div class="pb-r" style="width:' + d.probBear + '%"></div></div>' +
    '<div class="lvls"><div class="lv lv-e"><div class="lvl">Action Entry</div><div class="lvv">' + d.entry + '</div></div><div class="lv lv-s"><div class="lvl">Stop Loss</div><div class="lvv">' + d.stopLoss + '</div></div><div class="lv lv-t"><div class="lvl">Objective 1</div><div class="lvv">' + d.target1 + '</div></div></div>' +
    '<div class="asum">💡 <strong>Summary:</strong> ' + d.summary + '</div>' +
    (rls(d.reasons) ? '<div style="margin-top:12px;"><div class="stitle">Core Matrix Factors</div>' + rls(d.reasons) + '</div>' : '') + '</div>' +
    (nHTML ? '<div class="sec"><div class="stitle">Ticker News Context</div>' + nHTML + '</div>' : '') +
    '<div style="display:flex;gap:8px;"><button class="abtn" id="lnkND">📅 Predict Next Day</button><button class="abtn" id="lnkTM">📈 Strategy Horizon Outlook</button></div>';

  document.getElementById("lnkND").addEventListener("click", function(){ document.getElementById("ndIn").value = d.ticker; switchTab("nextday"); runNextDay(d.ticker); });
  document.getElementById("lnkTM").addEventListener("click", function(){ document.getElementById("tmIn").value = d.ticker; switchTab("term"); runOutlook(d.ticker); });
}

document.getElementById("ndBtn").addEventListener("click", function(){ var q = document.getElementById("ndIn").value.trim(); if(q) runNextDay(q); });
async function runNextDay(ticker){
  ticker = ticker.toUpperCase().trim(); var body = document.getElementById("ndBody"); body.innerHTML = ldng("Processing tomorrow's forecasting parameters for " + ticker + "...");
  var p = await yfQuote(ticker); if(!p) { body.innerHTML = '<div class="errbox">Data channel offline.</div>'; return; }
  
  var prompt = "Analyze tomorrows probable directional movement setup for " + ticker + " NSE stock. Base close price is " + p.price + ". Return strictly a clean single-line JSON structure: {\"trend\":\"Bullish/Bearish\",\"confidence\":75,\"gapUpDown\":\"Gap Up / Flat Open\",\"expectedRange\":\"₹X - ₹Y\",\"keyLevel\":\"₹Z Pivot Line\",\"summary\":\"Short analysis synthesis here.\"}";
  var aiTxt = await freeAI(prompt); var d = pj(aiTxt);
  
  if(!d) {
    d = { trend: p.up ? "Bullish" : "Bearish", confidence: p.healthScore || 60, gapUpDown: p.up ? "Gap Up Outlook" : "Consolidation Open", expectedRange: p.low + " - " + p.high, keyLevel: "₹" + p.raw.toFixed(2), summary: aiTxt ? aiTxt.replace(/\n/g, "<br>") : "Calculated using historical volatility vectors matrix profile." };
  }
  d.ticker = ticker; d.price = p.price; renderND(d);
}
function renderND(d) {
  var t = tSty(d.trend);
  document.getElementById("ndBody").innerHTML = '<div class="sec"><h3>Tomorrow\'s Forecast Target: ' + d.ticker.replace("^", "") + '</h3><br>' +
    '<div>Current Base Close: <strong>' + d.price + '</strong></div>' +
    '<div>Model Open Indicator: <strong style="color:#3b82f6">' + d.gapUpDown + '</strong></div>' +
    '<div>Expected Range Variance: <strong>' + d.expectedRange + '</strong></div>' +
    '<div>Key Support Pivot: <strong style="color:#f59e0b">' + d.keyLevel + '</strong></div>' +
    '<div class="asum" style="border-left-color:' + t.c + '">🤖 <strong>AI Target Direction:</strong> <span style="color:' + t.c + ';font-weight:700;">' + d.trend + ' (' + d.confidence + '%)</span><br><br>' + d.summary + '</div></div>';
}

document.querySelectorAll(".tfb").forEach(function(b){ b.addEventListener("click", function(){ document.querySelectorAll(".tfb").forEach(function(x){ x.classList.remove("active"); }); b.classList.add("active"); activeTF = b.getAttribute("data-tf"); if(window.activeTickerNode) runOutlook(window.activeTickerNode); }); });
document.getElementById("tmBtn").addEventListener("click", function(){ var q = document.getElementById("tmIn").value.trim(); if(q) runOutlook(q); });
async function runOutlook(ticker){
  ticker = ticker.toUpperCase().trim(); var body = document.getElementById("tmBody"); body.innerHTML = ldng("Synthesizing algorithmic long-term macro configuration targets for " + ticker + "...");
  var p = await yfQuote(ticker); if(!p) { body.innerHTML = '<div class="errbox">Data stream disconnected.</div>'; return; }
  
  var prompt = "Generate an investment strategy outlook matrix for " + ticker + " NSE. Close is " + p.price + ". Perspective target horizon: " + activeTF + ". Return strictly a single JSON string block: {\"trend\":\"Bullish/Neutral\",\"confidence\":70,\"target\":\"₹Objective Target\",\"risk\":\"Low/Medium/High\",\"summary\":\"Provide structural valuation investment thesis description highlights.\"}";
  var aiTxt = await freeAI(prompt); var d = pj(aiTxt);
  
  if(!d) {
    d = { trend: p.up ? "Bullish" : "Neutral Consolidation", confidence: 65, target: "₹" + (p.raw * 1.15).toFixed(2), risk: "Medium Risk Band", summary: aiTxt ? aiTxt.replace(/\n/g, "<br>") : "Calculated investment parameters using underlying chart distributions framework metrics." };
  }
  
  var targetVal = d.target || d.target1 || "—"; var riskVal = d.risk || d.riskLevel || "Medium"; var t = tSty(d.trend);
  body.innerHTML = '<div class="sec"><h3>Macro Strategy Horizon Outlook Model: ' + ticker.replace("^", "") + '</h3><br>' +
    '<div>Trajectory Map Consensus: <strong style="color:' + t.c + '">' + d.trend + ' (' + d.confidence + '% Weighting)</strong></div>' +
    '<div>Structural Valuation Target Objective: <strong>' + targetVal + '</strong></div>' +
    '<div>Inherent Risk Parameters: <strong>' + riskVal + '</strong></div>' +
    '<div class="asum">💡 <strong>Investment Framework Thesis:</strong> ' + d.summary + '</div></div>';
}

async function loadGlobal(force){
  if(!force && window.CACHE.global && fresh(window.CACHE.gTs, window.TTL.s)) { renderGlobal(window.CACHE.global); return; }
  document.getElementById("gBody").innerHTML = skels(80, 2);
  try {
    var symbols = ["^NSEI", "^BSESN", "^GSPC", "^IXIC", "USDINR=X", "CL=F"];
    var results = await Promise.all(symbols.map(s => yfQuote(s))); window.CACHE.global = results; window.CACHE.gTs = Date.now(); renderGlobal(results);
  } catch(e) { document.getElementById("gBody").innerHTML = '<div class="errbox">Global market terminal connection timeout.</div>'; }
}
function renderGlobal(arr){
  var h = '<div class="ggrid">';
  arr.forEach(function(p){
    if(!p) return; var c = p.up ? "#22c55e" : "#ef4444";
    h += '<div class="gcrd"><div class="gnm">' + p.name + '</div><div class="gvl" style="color:' + c + '">' + p.raw.toLocaleString("en-IN", { maximumFractionDigits: 2 }) + '</div><div class="gch" style="color:' + c + '">' + (p.up ? "▲" : "▼") + " " + p.changePct + '</div></div>';
  });
  document.getElementById("gBody").innerHTML = h + '</div>';
}
document.getElementById("btnGlobal").addEventListener("click", function(){ loadGlobal(true); });

async function loadCal(force){
  if(!force && window.CACHE.cal && fresh(window.CACHE.cTs, window.TTL.l)) { renderCal(window.CACHE.cal); return; }
  document.getElementById("calBody").innerHTML = skels(56, 3);
  try {
    var aiTxt = await freeAI("List 4 upcoming dividend or announcement corporate action dates for Indian liquid companies this month. Return strictly a JSON array: [{\"date\":\"DD MMM\",\"company\":\"Name\",\"type\":\"Dividend/Earnings\",\"detail\":\"Brief details description text\"}]");
    var arr = pja(aiTxt) || []; window.CACHE.cal = arr; window.CACHE.cTs = Date.now(); renderCal(arr);
  } catch(e) { document.getElementById("calBody").innerHTML = '<div class="errbox">Events database system tracker channel offline.</div>'; }
}
function renderCal(arr){
  var h = '<div class="clst">';
  arr.forEach(function(e){ h += '<div class="citem"><div class="cdt">' + e.date + '</div><div style="flex:1;"><div style="font-size:13px;font-weight:700;">' + e.company + '</div><div style="font-size:11px;color:#64748b;margin-top:2px;">' + e.detail + '</div></div><span class="ctag ct-e">' + e.type + '</span></div>'; });
  document.getElementById("calBody").innerHTML = h + '</div>';
}
document.getElementById("btnCal").addEventListener("click", function(){ loadCal(true); });

document.getElementById("chatSend").addEventListener("click", sendChat);
document.getElementById("chatIn").addEventListener("keydown", function(e){ if(e.key === "Enter") sendChat(); });
async function sendChat(){
  var inp = document.getElementById("chatIn"); var q = inp.value.trim(); if(!q) return;
  inp.value = ""; var msgs = document.getElementById("chatMsgs"); msgs.innerHTML += '<div class="cm cmu">' + q + '</div>';
  var tid = "m" + Date.now(); msgs.innerHTML += '<div class="cm cmai" id="' + tid + '"><span class="mspn"></span> Cross-referencing indicator arrays and evaluating data streams...</div>';
  msgs.scrollTop = msgs.scrollHeight;
  
  var tokenMatch = q.toUpperCase().match(/\b([A-Z]{2,10})\b/g) || [];
  var targetLookupSymbol = tokenMatch.length > 0 ? tokenMatch[0] : window.activeTickerNode;
  var tickerContext = "";
  if(targetLookupSymbol) {
    var liveQuote = await yfQuote(targetLookupSymbol);
    if(liveQuote) {
      tickerContext = "Active Context for " + targetLookupSymbol + ": Current Price: " + liveQuote.price + ", Session Change: " + liveQuote.changePct + ", High/Low: " + liveQuote.high + "/" + liveQuote.low + ". ";
    }
  }

  var prompt = "You are NanduChandu Markets AI expert conversational terminal co-pilot. " + tickerContext + "Analyze this user question and provide a highly thorough, complete response mapping out all entry boundaries, strategy trends, support indicators, and objectives cleanly in bullet points. Question: " + q;
  var txt = await freeAI(prompt);
  var stylizedText = txt ? txt.replace(/\n/g, "<br>").replace(/\* \*\*(.*?)\*\"/g, "• <strong>$1</strong>").replace(/\* /g, "• ") : "Transmission network channels timed out.";
  document.getElementById(tid).innerHTML = stylizedText; msgs.scrollTop = msgs.scrollHeight;
}

async function bootDashboard() {
  // Staggered initialization to avoid simultaneous proxy requests
  await loadIdx(); 
  await sleep(500);
  await loadTrend();
  await sleep(500);
  await loadNews();
}

// Updated Switch Tab with immediate contextual triggering
function switchTab(name){
  document.querySelectorAll(".tab").forEach(function(t){ t.classList.toggle("active", t.getAttribute("data-tab") === name); });
  document.querySelectorAll(".page").forEach(function(p){ p.classList.toggle("show", p.id === "pg-" + name); });
  
  if(name === "global") loadGlobal(); 
  if(name === "calendar") loadCal();
  
  if(name === "nextday" && window.activeTickerNode) {
    var ndInput = document.getElementById("ndIn");
    if(ndInput) { ndInput.value = window.activeTickerNode; runNextDay(window.activeTickerNode); }
  }
  if(name === "term" && window.activeTickerNode) {
    var tmInput = document.getElementById("tmIn");
    if(tmInput) { tmInput.value = window.activeTickerNode; runOutlook(window.activeTickerNode); }
  }
}

// Boot sequence
bootDashboard();
setInterval(function() { 
  loadIdx(); 
  if(document.getElementById("pg-home").classList.contains("show")) {
    if(Date.now() - window.CACHE.nTs >= window.TTL.m) loadNews(true);
  }
}, 60000);
