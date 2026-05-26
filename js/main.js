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

// ── ENHANCEMENT: ADVANCED DUAL-AXIS SVG CHART (PRICE WAVE + VOLUME HISTOGRAM) ──
function drawNativeChart(closes, volumes, up) {
  if(!closes || closes.length < 5) return '';
  var w = 500, h = 160;
  
  // Math bounds mapping for Prices axis
  var minP = Math.min(...closes), maxP = Math.max(...closes);
  var rngP = maxP - minP || 1;
  var pricePts = closes.map((p, i) => {
    var x = (i / (closes.length - 1)) * w;
    var y = h - ((p - minP) / rngP) * (h - 45) - 30; // Leave structural padding bands
    return x.toFixed(1) + ',' + y.toFixed(1);
  }).join(' ');

  // Math bounds mapping for Volumes histogram bars along the bottom baseline
  var volumeHTML = "";
  if(volumes && volumes.length > 0) {
    var maxV = Math.max(...volumes) || 1;
    var barCount = closes.length;
    var barWidth = (w / barCount) * 0.75;
    
    volumes.forEach((v, idx) => {
      var barHeight = (v / maxV) * 25; // Map bars to peak max heights of 25px
      var x = (idx / (barCount - 1)) * w - (barWidth / 2);
      var y = h - barHeight - 5;
      volumeHTML += '<rect x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" width="' + barWidth.toFixed(1) + '" height="' + barHeight.toFixed(1) + '" fill="#1e293b" opacity="0.65"/>';
    });
  }
  
  var color = up ? "#22c55e" : "#ef4444";
  return '<div style="margin:14px 0;background:#0b0f19;border:1px solid #1c2a45;border-radius:12px;padding:12px;">' +
    '<div style="font-size:10px;color:#475569;margin-bottom:8px;font-weight:700;letter-spacing:.5px;text-transform:uppercase;display:flex;justify-content:space-between;"><span>Intraday Technical Waveform</span><span>Dual-Axis Vol/Price</span></div>' +
    '<div style="height:150px;width:100%;"><svg viewBox="0 0 500 160" style="width:100%; height:100%; overflow:visible;">' +
    volumeHTML +
    '<polyline points="' + pricePts + '" fill="none" stroke="' + color + '" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>' +
    '</svg></div></div>';
}

// Theme Config Toggle
document.getElementById("themeBtn").addEventListener("click", function(){ isLight = !isLight; document.body.classList.toggle("light", isLight); this.textContent = isLight ? "🌙" : "☀️"; });

// State Navigation Switch
function switchTab(name){
  document.querySelectorAll(".tab").forEach(function(t){ t.classList.toggle("active", t.getAttribute("data-tab") === name); });
  document.querySelectorAll(".page").forEach(function(p){ p.classList.toggle("show", p.id === "pg-" + name); });
  if(name === "global") loadGlobal();
  if(name === "calendar") loadCal();
}
document.querySelectorAll(".tab").forEach(function(t){ t.addEventListener("click", function(){ switchTab(t.getAttribute("data-tab")); }); });

// Search Suggest Engine
var siEl = document.getElementById("si"), ddEl = document.getElementById("dd");
var ddTmr = null;
siEl.addEventListener("input", function(){
  clearTimeout(ddTmr); var q = siEl.value.trim();
  if(q.length < 1){ ddEl.classList.remove("open"); return; }
  ddTmr = setTimeout(function(){ doSearch(q); }, 300);
});
async function doSearch(q) {
  ddEl.innerHTML = '<div style="padding:12px 14px;font-size:12px;color:#475569">🔍 Searching dynamic fields...</div>';
  ddEl.classList.add("open");
  var res = await yfSearch(q);
  if (!res.length) { ddEl.innerHTML = '<div style="padding:12px 14px;font-size:12px;color:#475569">No matching assets.</div>'; return; }
  ddEl.innerHTML = res.map(function(r){
    var sym = r.symbol.replace(".NS", "").replace(".BO", "");
    return '<div class="ddr" data-t="' + sym + '"><span class="ddr-t">' + sym + '</span><span class="ddr-n">' + (r.longname || r.shortname || sym) + '</span></div>';
  }).join("");
}
ddEl.addEventListener("click", function(e){ var r = e.target.closest(".ddr"); if(r){ ddEl.classList.remove("open"); siEl.value = r.getAttribute("data-t"); runAnalysis(r.getAttribute("data-t")); } });
document.addEventListener("click", function(e){ if(!e.target.closest(".sw")) ddEl.classList.remove("open"); });

// Home components streams loaders
async function loadNews(force){
  if(!force && window.CACHE.news && fresh(window.CACHE.nTs, window.TTL.s)) { renderNews(window.CACHE.news); return; }
  document.getElementById("newsBody").innerHTML = skels(56, 3);
  var news = await yfNews("NSE NIFTY India");
  window.CACHE.news = news; window.CACHE.nTs = Date.now(); renderNews(news);
}
function renderNews(arr){
  if(!arr.length) { document.getElementById("newsBody").innerHTML = '<div style="font-size:12px;padding:10px;color:#475569;">No active briefings found.</div>'; return; }
  document.getElementById("newsBody").innerHTML = arr.map(function(n){
    var h = n.headline.toLowerCase(); var b = '<span class="su">Neutral</span>';
    if(h.includes("rise") || h.includes("profit") || h.includes("surge") || h.includes("gain") || h.includes("up") || h.includes("buy")) b = '<span class="sp">🟢 Bullish</span>';
    else if(h.includes("fall") || h.includes("loss") || h.includes("slump") || h.includes("drop") || h.includes("crash")) b = '<span class="sn">🔴 Bearish</span>';
    return '<div class="nc"><div class="nc-head">' + n.headline + '</div><div class="nc-meta"><span class="nc-src">' + n.source + '</span><span class="nc-time">' + n.time + '</span>' + b + '</div></div>';
  }).join("");
}
document.getElementById("btnNews").addEventListener("click", function(){ loadNews(true); });

async function loadTrend(force){
  if(!force && window.CACHE.trend && fresh(window.CACHE.tTs, window.TTL.s)) { renderTrend(window.CACHE.trend); return; }
  document.getElementById("trendBody").innerHTML = skels(58, 4);
  var movers = await yfMovers();
  window.CACHE.trend = movers; window.CACHE.tTs = Date.now(); renderTrend(movers);
}
function renderTrend(arr){
  if(!arr.length) { document.getElementById("trendBody").innerHTML = '<div style="font-size:12px;padding:10px;color:#475569;">Trending streams currently synchronization locking.</div>'; return; }
  
  document.getElementById("trendBody").innerHTML = arr.slice(0, 8).map(function(s){
    var up = isUp(s.chg); var pc = up ? "#22c55e" : "#ef4444";
    var emoji = ["📈", "📊", "⚡", "🚀", "💎", "🔋", "🏢", "🏭"][Math.floor(Math.random() * 8)];
    return '<div class="tcard" data-t="' + s.ticker + '"><span style="font-size:18px;margin-right:4px;">' + emoji + '</span>' +
      '<div style="flex:1;min-width:0;"><div style="font-size:12px;font-weight:700;color:#e2e8f4;text-overflow:ellipsis;overflow:hidden;white-space:nowrap;">' + s.ticker + '</div><div style="font-size:10px;color:#475569;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + s.name + '</div></div>' +
      '<div style="text-align:right;"><div style="font-size:12px;font-weight:700;color:' + pc + '">' + s.price + '</div><div style="font-size:10px;color:' + pc + '">' + (up ? "▲" : "▼") + ' ' + s.chg + '</div></div></div>';
  }).join("");
  
  // Dynamic generation of view handles without hardcoded keys
  var stripHTML = '<span style="font-size: 11px; color: #64748b; align-self: center; margin-right: 4px; font-weight: 600; white-space: nowrap;">⚡ Quick View:</span>';
  arr.slice(0, 6).forEach(function(s) {
    stripHTML += '<span class="csg" onclick="runAnalysis(\'' + s.ticker + '\')" style="margin:0; padding: 5px 12px;">' + s.ticker + '</span>';
  });
  document.getElementById("quickViewStrip").innerHTML = stripHTML;

  // AI chat question templates sync automatically
  var chatSgHTML = "";
  arr.slice(0, 4).forEach(function(s) {
    chatSgHTML += '<span class="csg" onclick="document.getElementById(\'chatIn\').value=this.textContent;sendChat();">Is ' + s.ticker + ' a good buy?</span>';
  });
  var chatSgBox = document.getElementById("chatSuggestions");
  if(chatSgBox) chatSgBox.innerHTML = chatSgHTML;

  document.querySelectorAll(".tcard").forEach(function(el){ el.addEventListener("click", function(){ runAnalysis(el.getAttribute("data-t")); }); });
}
document.getElementById("btnTrend").addEventListener("click", function(){ loadTrend(true); });

async function loadIdx(){
  var [n, s] = await Promise.all([yfQuote("NIFTY50"), yfQuote("SENSEX")]);
  function ic(name, p){ if(!p) return ''; var c = p.up ? "#22c55e" : "#ef4444"; return '<div class="gc"><div class="gcl">' + name + '</div><div class="gcv" style="color:' + c + '">' + p.raw.toLocaleString("en-IN") + '</div><div class="gcs" style="color:' + c + '">' + (p.up ? "▲" : "▼") + " " + p.changePct + '</div></div>'; }
  document.getElementById("idxCards").innerHTML = ic("NIFTY 50", n) + ic("SENSEX", s);
}

// ── FULL SYSTEM TECHNICAL ANALYSIS CORE ──
async function runAnalysis(ticker){
  ticker = ticker.toUpperCase().trim(); siEl.value = ticker; window.activeTickerNode = ticker; switchTab("analysis");
  var body = document.getElementById("aBody");
  if(window.CACHE.analysis[ticker] && fresh(window.CACHE.analysis[ticker].ts, window.TTL.m)) { renderAnalysis(window.CACHE.analysis[ticker].d); return; }
  body.innerHTML = ldng("Processing dual-axis matrix nodes for " + ticker + "...");

  var pData = await yfQuote(ticker); var closes = pData ? pData.closes : []; var volumes = pData ? pData.volumes : []; var news = await yfNews(ticker);
  var rsi = calcRSI(closes, 14); var macd = calcMACD(closes);
  var ema20 = calcEMA(closes, 20); var ema50 = calcEMA(closes, 50); var ema200 = calcEMA(closes, 200); var sr = calcSR(closes);

  // ── ENHANCEMENT: Generate the Algorithmic Health Metrics instantly ──
  var calculatedHealth = calculateTechnicalScore(closes, rsi, macd, ema20, ema50);
  var healthVerdict = calculatedHealth > 75 ? "Strong Buy" : calculatedHealth > 50 ? "Buy" : calculatedHealth > 35 ? "Hold" : "Sell";
  var healthColor = tSty(healthVerdict).c;

  var prompt = "You are an expert Indian stock analyst. Provide a formal technical review structure for ticker " + ticker + " with absolute price close " + (pData ? pData.price : "N/A") + " and RSI parameter " + rsi + ". Return strictly a single JSON object (no backticks markdown wrappers): {\"trend\":\"Bullish/Bearish/Neutral\",\"confidence\":75,\"tradeDirection\":\"BUY/SELL/WAIT\",\"entry\":\"₹X\",\"stopLoss\":\"₹Y\",\"target1\":\"₹Z\",\"target2\":\"₹W\",\"rsiSignal\":\"Text\",\"macdSignal\":\"Text\",\"volumeSignal\":\"Text\",\"smaSignal\":\"Text\",\"fiiActivity\":\"Text\",\"diiActivity\":\"Text\",\"optionsOI\":\"Text\",\"probBull\":60,\"probBear\":40,\"riskLevel\":\"Low/Medium/High\",\"riskScore\":45,\"reasons\":[\"Factor 1\",\"Factor 2\",\"Factor 3\",\"Factor 4\",\"Factor 5\"],\"summary\":\"Two sentence analysis synthesis here.\"}";
  var aiTxt = await freeAI(prompt); var ai = pj(aiTxt) || {};

  var d = {
    ticker: ticker, company: pData ? pData.name : ticker, price: pData ? pData.price : "N/A", changePct: pData ? pData.changePct : "—", up: pData ? pData.up : true,
    high: pData ? pData.high : "—", low: pData ? pData.low : "—", volume: pData ? pData.volume : "—", mktCap: pData ? pData.mktCap : "—", closes: closes, volumes: volumes,
    rsi: rsi, macd: macd || "0.00", ema20: ema20 ? "₹" + ema20 : "—", ema50: ema50 ? "₹" + ema50 : "—", ema200: ema200 ? "₹" + ema200 : "—", support: sr.sup, resistance: sr.res, news: news.slice(0, 4),
    healthScore: calculatedHealth, healthVerdict: healthVerdict, healthColor: healthColor,
    trend: ai.trend || "Neutral", confidence: ai.confidence || 60, tradeDirection: ai.tradeDirection || "WAIT", entry: ai.entry || "—", stopLoss: ai.stopLoss || "—", target1: ai.target1 || "—", target2: ai.target2 || "—",
    rsiSignal: ai.rsiSignal || "Neutral Distribution Profile", macdSignal: ai.macdSignal || "Convergence Zone Tracking", volumeSignal: ai.volumeSignal || "Standard Distribution", smaSignal: ai.smaSignal || "Tracking Standard Levels",
    fiiActivity: ai.fiiActivity || "Balanced Flows", diiActivity: ai.diiActivity || "Institutional Consolidation", optionsOI: ai.optionsOI || "Neutral Build", probBull: ai.probBull || 50, probBear: ai.probBear || 50,
    riskLevel: ai.riskLevel || "Medium", riskScore: ai.riskScore || 50, reasons: ai.reasons || ["Calculated via algorithmic model mapping."], summary: ai.summary || "System generated view based on historical pricing array matrices."
  };
  window.CACHE.analysis[ticker] = { d: d, ts: Date.now() }; renderAnalysis(d);
}

function renderAnalysis(d){
  var pc = d.up ? "#22c55e" : "#ef4444"; var t = tSty(d.trend);
  var pb = d.probBull; var pbe = d.probBear; var rs = d.riskScore;
  
  // Render the enhanced Dual Axis Chart
  var chartHTML = drawNativeChart(d.closes, d.volumes, d.up);
  var nHTML = d.news.map(n => '<div class="nc"><div class="nc-head">' + n.headline + '</div><div class="nc-meta"><span>' + n.source + '</span><span>·</span><span>' + n.time + '</span></div></div>').join("");

  document.getElementById("aBody").innerHTML =
    '<button class="bbtn" onclick="switchTab(\'home\')">← Back Home</button>' +
    '<div class="acrd"><div class="ahdr"><div><div class="anm">' + d.company + '</div><div class="asb">' + d.ticker + ' · India</div>' +
    '<div class="atgs"><span class="atg" style="color:' + t.c + ';border-color:' + t.b + ';background:' + t.bg + '">' + d.trend + '</span><span class="atg">' + d.mktCap + '</span></div></div>' +
    '<div class="apr" style="margin-left:auto;text-align:right;"><div class="bprc" style="color:' + pc + '">' + d.price + '</div><div class="bchg" style="color:' + pc + '">' + d.changePct + '</div></div></div>' +
    
    // Injected Algorithmic Math health widget bar
    '<div style="margin-top:10px; background:#111625; padding:10px; border-radius:10px; border:1px dashed #1c2a45; display:flex; justify-content:space-between; align-items:center;">' +
    '<div><span style="font-size:11px; color:#64748b; font-weight:600;">ALGORITHMIC HEALTH SCORE:</span>' +
    '<div style="font-size:15px; font-weight:800; color:'+d.healthColor+'">' + d.healthScore + '% — ' + d.healthVerdict + '</div></div>' +
    '<div style="height:6px; width:120px; background:#1c2a45; border-radius:3px; overflow:hidden;"><div style="height:100%; width:'+d.healthScore+'%; background:'+d.healthColor+'"></div></div></div>' +
    '</div>' +
    
    chartHTML +
    '<div class="g4"><div class="gc"><div class="gcl">Support Support</div><div class="gcv" style="color:#22c55e">' + d.support + '</div></div><div class="gc"><div class="gcl">Resistance Resistance</div><div class="gcv" style="color:#ef4444">' + d.resistance + '</div></div><div class="gc"><div class="gcl">FII Operations</div><div class="gcv" style="font-size:11px">' + d.fiiActivity + '</div></div><div class="gc"><div class="gcl">OI Structure</div><div class="gcv" style="font-size:11px">' + d.optionsOI + '</div></div></div>' +
    '<div class="sec"><div class="stitle">Technical Indicators</div><div class="g3">' +
    '<div class="ic"><div class="icl">RSI (14)</div><div class="icv" style="color:#f59e0b">' + d.rsi + '</div><div class="icd">' + d.rsiSignal + '</div></div>' +
    '<div class="ic"><div class="icl">MACD Line</div><div class="icv" style="color:#3b82f6">' + d.macd + '</div><div class="icd">' + d.macdSignal + '</div></div>' +
    '<div class="ic"><div class="icl">Volume Multiplier</div><div class="icv" style="font-size:13px;">' + d.volume + '</div><div class="icd">' + d.volumeSignal + '</div></div></div></div>' +
    '<div class="sec"><div class="stitle">AI Predictive Analyst Evaluation Model</div><div class="pr"><div><span class="pb2" style="color:' + t.c + ';background:' + t.bg + ';border-color:' + t.b + '">' + d.tradeDirection + ' DIRECTION</span><div style="font-size:11px;color:#94a3b8;margin-top:7px;">Confidence Threshold: <strong>' + d.confidence + '%</strong> | Risk Level: <strong>' + d.riskLevel + '</strong></div></div>' + ring(d.confidence) + '</div>' +
    '<div class="pbl"><span style="color:#22c55e">🟢 Bull Projections ' + pb + '%</span><span style="color:#ef4444">Bear Projections ' + pbe + '% 🔴</span></div><div class="pbb"><div class="pb-b" style="width:' + pb + '%"></div><div class="pb-r" style="width:' + pbe + '%"></div></div>' +
    '<div class="lvls"><div class="lv lv-e"><div class="lvl">Action Entry</div><div class="lvv">' + d.entry + '</div></div><div class="lv lv-s"><div class="lvl">Stop Loss Loss</div><div class="lvv">' + d.stopLoss + '</div></div><div class="lv lv-t"><div class="lvl">Objective 1</div><div class="lvv">' + d.target1 + '</div></div></div>' +
    '<div class="asum">💡 <strong>Analysis Core Summary:</strong> ' + d.summary + '</div>' +
    (rls(d.reasons) ? '<div style="margin-top:12px;"><div class="stitle">Key Technical Parameters Matrix</div>' + rls(d.reasons) + '</div>' : '') + '</div>' +
    (nHTML ? '<div class="sec"><div class="stitle">Ticker News Context</div>' + nHTML + '</div>' : '') +
    '<div style="display:flex;gap:8px;"><button class="abtn" id="lnkND">📅 Predict Next Day</button><button class="abtn" id="lnkTM">📈 Strategy Horizon Outlook</button></div>';

  document.getElementById("lnkND").addEventListener("click", function(){ document.getElementById("ndIn").value = d.ticker; switchTab("nextday"); runNextDay(d.ticker); });
  document.getElementById("lnkTM").addEventListener("click", function(){ document.getElementById("tmIn").value = d.ticker; switchTab("term"); runOutlook(d.ticker); });
}

// ── NEXT DAY ANALYSIS ENGINE ──
document.getElementById("ndBtn").addEventListener("click", function(){ var q = document.getElementById("ndIn").value.trim(); if(q) runNextDay(q); });
async function runNextDay(ticker){
  ticker = ticker.toUpperCase().trim(); var body = document.getElementById("ndBody");
  if(window.CACHE.nextday[ticker] && fresh(window.CACHE.nextday[ticker].ts, window.TTL.m)) { renderND(window.CACHE.nextday[ticker].d); return; }
  body.innerHTML = ldng("Processing tomorrow's structural distribution map paths for " + ticker + "...");
  
  var p = await yfQuote(ticker);
  var prompt = "You are an Indian stocks specialist. Analyze tomorrow's probable directional behavior for " + ticker + " NSE. Current price is " + (p ? p.price : "N/A") + ". Return strictly a clean JSON block (no backticks markdown wrappers): {\"trend\":\"Bullish/Bearish\",\"confidence\":70,\"gapUpDown\":\"Gap Up / Gap Down / Flat Open\",\"expectedRange\":\"₹A - ₹B\",\"keyLevel\":\"₹C Pivot Point\",\"summary\":\"Provide a clear short summary statement regarding technical probabilities.\"}";
  var aiTxt = await freeAI(prompt); var d = pj(aiTxt);
  
  if(!d) { body.innerHTML = '<div class="errbox">AI engine timed out generating tomorrow\'s predictive boundaries profile. Please retry.</div>'; return; }
  d.ticker = ticker; d.price = p ? p.price : "N/A";
  window.CACHE.nextday[ticker] = { d: d, ts: Date.now() }; renderND(d);
}
function renderND(d) {
  var t = tSty(d.trend);
  document.getElementById("ndBody").innerHTML = '<div class="sec"><h3 style="margin-bottom:10px;">Tomorrow\'s Predictive Target Profile: ' + d.ticker + '</h3>' +
    '<div>Current Baseline Value Close: <strong>' + d.price + '</strong></div>' +
    '<div>Algorithmic Open Indicator: <strong style="color:#3b82f6">' + d.gapUpDown + '</strong></div>' +
    '<div>Modeled Trading Range: <strong>' + d.expectedRange + '</strong></div>' +
    '<div>Key Pivot Level: <strong style="color:#f59e0b">' + d.keyLevel + '</strong></div>' +
    '<div class="asum" style="border-left-color:' + t.c + '">🤖 <strong>Predictive Path Consensus:</strong> <span style="color:' + t.c + ';font-weight:700;">' + d.trend + ' (' + d.confidence + '%)</span><br><br>' + d.summary + '</div></div>';
}

// ── HORIZON STRATEGY STRATEGY OUTLOOK ENGINE ──
document.querySelectorAll(".tfb").forEach(function(b){ b.addEventListener("click", function(){ document.querySelectorAll(".tfb").forEach(function(x){ x.classList.remove("active"); }); b.classList.add("active"); activeTF = b.getAttribute("data-tf"); }); });
document.getElementById("tmBtn").addEventListener("click", function(){ var q = document.getElementById("tmIn").value.trim(); if(q) runOutlook(q); });
async function runOutlook(ticker){
  ticker = ticker.toUpperCase().trim(); var body = document.getElementById("tmBody"); var k = ticker + "_" + activeTF;
  if(window.CACHE.outlook[k] && fresh(window.CACHE.outlook[k].ts, window.TTL.m)) { body.innerHTML = window.CACHE.outlook[k].h; return; }
  body.innerHTML = ldng("Synthesizing algorithmic long term macro models for " + ticker + "...");
  
  var p = await yfQuote(ticker);
  var prompt = "You are an equities analyst. Generate a long-term investment matrix outlook for " + ticker + " NSE. Current price is " + (p ? p.price : "N/A") + ". Target perspective window scale: " + activeTF + ". Return strictly a clean JSON dictionary (no code block wrappers): {\"trend\":\"Bullish/Neutral/Bearish\",\"confidence\":68,\"target\":\"₹Target\",\"risk\":\"Low/Medium/High\",\"summary\":\"Provide a full investment thesis details overview here.\"}";
  var aiTxt = await freeAI(prompt); var d = pj(aiTxt);
  
  if(!d) { body.innerHTML = '<div class="errbox">Failed to compile macro configuration frames. Please try again.</div>'; return; }
  var t = tSty(d.trend);
  var html = '<div class="sec"><h3>Macro Strategy Horizon Outlook Model: ' + ticker + '</h3><br>' +
    '<div>Trajectory Map Consensus: <strong style="color:' + t.c + '">' + d.trend + ' (' + d.confidence + '% Weighting)</strong></div>' +
    '<div>Structural Valuation Target Objective: <strong>' + d.target + '</strong></div>' +
    '<div>Inherent Risk Parameters: <strong>' + d.risk + '</strong></div>' +
    '<div class="asum">💡 <strong>Investment Framework Thesis:</strong> ' + d.summary + '</div></div>';
    
  window.CACHE.outlook[k] = { h: html, ts: Date.now() }; body.innerHTML = html;
}

// ── GLOBAL TERMINAL STREAMS ──
async function loadGlobal(force){
  if(!force && window.CACHE.global && fresh(window.CACHE.gTs, window.TTL.s)) { renderGlobal(window.CACHE.global); return; }
  document.getElementById("gBody").innerHTML = skels(80, 2);
  try {
    var symbols = ["^NSEI", "^BSESN", "^GSPC", "^IXIC", "USDINR=X", "CL=F"];
    var results = await Promise.all(symbols.map(s => yfQuote(s)));
    window.CACHE.global = results; window.CACHE.gTs = Date.now(); renderGlobal(results);
  } catch(e) { document.getElementById("gBody").innerHTML = '<div class="errbox">Global market matrix pipeline timed out.</div>'; }
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

// ── EVENTS CALENDAR ──
async function loadCal(force){
  if(!force && window.CACHE.cal && fresh(window.CACHE.cTs, window.TTL.l)) { renderCal(window.CACHE.cal); return; }
  document.getElementById("calBody").innerHTML = skels(56, 3);
  try {
    var aiTxt = await freeAI("List 4 real or highly probable upcoming major corporate action events (earnings/dividends) for liquid Indian companies (e.g. Reliance, TCS, Infosys). Return strictly a clean JSON array list (no backticks markdown blocks): [{\"date\":\"DD MMM\",\"company\":\"Company Name\",\"type\":\"Earnings/Dividend\",\"detail\":\"Brief text descriptions\"}]");
    var arr = pja(aiTxt) || [];
    window.CACHE.cal = arr; window.CACHE.cTs = Date.now(); renderCal(arr);
  } catch(e) { document.getElementById("calBody").innerHTML = '<div class="errbox">Events database system channel offline.</div>'; }
}
function renderCal(arr){
  var h = '<div class="clst">';
  arr.forEach(function(e){
    h += '<div class="citem"><div class="cdt">' + e.date + '</div><div style="flex:1;"><div style="font-size:13px;font-weight:700;">' + e.company + '</div><div style="font-size:11px;color:#64748b;margin-top:2px;">' + e.detail + '</div></div><span class="ctag ct-e">' + e.type + '</span></div>';
  });
  document.getElementById("calBody").innerHTML = h + '</div>';
}
document.getElementById("btnCal").addEventListener("click", function(){ loadCal(true); });

// ── ENHANCEMENT: "GIVE-EVERYTHING" CONTEXTUALIZED AI COPIOT CO-PILOT ──
document.getElementById("chatSend").addEventListener("click", sendChat);
document.getElementById("chatIn").addEventListener("keydown", function(e){ if(e.key === "Enter") sendChat(); });
async function sendChat(){
  var inp = document.getElementById("chatIn"); var q = inp.value.trim(); if(!q) return;
  inp.value = ""; var msgs = document.getElementById("chatMsgs");
  msgs.innerHTML += '<div class="cm cmu">' + q + '</div>';
  var tid = "m" + Date.now();
  msgs.innerHTML += '<div class="cm cmai" id="' + tid + '"><span class="mspn"></span> Pulling market telemetry and cross-referencing indicators...</div>';
  msgs.scrollTop = msgs.scrollHeight;
  
  // Intelligent State Resolution fallback checks user tracking tokens
  var tokenMatch = q.toUpperCase().match(/\b([A-Z]{2,10})\b/g) || [];
  var targetLookupSymbol = tokenMatch.length > 0 ? tokenMatch[0] : window.activeTickerNode;
  
  var tickerContext = "";
  if(targetLookupSymbol) {
    var liveQuote = await yfQuote(targetLookupSymbol);
    if(liveQuote) {
      var localRSI = calcRSI(liveQuote.closes, 14);
      tickerContext = "Active Telemetry Frame Context for " + targetLookupSymbol + ": Current Price is " + liveQuote.price + ", Session Change is " + liveQuote.changePct + ", High/Low is " + liveQuote.high + "/" + liveQuote.low + ", Calculated RSI(14) is " + localRSI + ". ";
    }
  }

  var prompt = "You are NanduChandu Markets AI expert terminal assistant. " + tickerContext + "Analyze the user's inquiry regarding economic parameters. Provide a realistic financial analysis response. Give everything relevant (support lines, resistance bands, target trends, chart shapes) neatly sorted in easy-to-read bullet points. Question: " + q;
  var txt = await freeAI(prompt);
  
  // High fidelity presentation processing replacements for basic readability formatting
  var stylizedText = txt ? txt.replace(/\n/g, "<br>").replace(/\* \*\*(.*?)\*\*/g, "• <strong>$1</strong>").replace(/\* /g, "• ") : "Transmission fault encountered.";
  document.getElementById(tid).innerHTML = stylizedText;
  msgs.scrollTop = msgs.scrollHeight;
}

// ── SETUP REFRESH LOOPS ──
Promise.all([loadNews(), loadTrend(), loadIdx()]);

setInterval(function() {
  loadIdx();
  if(document.getElementById("pg-home").classList.contains("show")) {
    var timeElapsedSinceNews = Date.now() - window.CACHE.nTs;
    if(timeElapsedSinceNews >= window.TTL.m) {
      loadNews(true); loadTrend(true);
    } else {
      loadTrend(false);
    }
  }
}, 30000);
