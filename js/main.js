/**
 * NC Markets - UI Navigation, State Routing & Dual-Axis Visualization Layer
 */

var activeTF = "both", isLight = false, activeTickerNode = "NIFTY50";

function isUp(v){ return !String(v || "0").trim().startsWith("-"); }
function fmtVol(v){ if(!v) return "—"; if(v > 10000000) return (v / 10000000).toFixed(1) + "Cr"; if(v > 100000) return (v / 100000).toFixed(1) + "L"; return String(v); }
function fmtCap(v){ if(!v) return "—"; if(v > 1e12) return "₹" + (v / 1e12).toFixed(1) + "T"; if(v > 1e9) return "₹" + (v / 1e9).toFixed(0) + "B"; return "₹" + (v / 1e7).toFixed(0) + "Cr"; }
function timeAgo(ts){ var m = Math.floor((Date.now() - ts) / 60000); if(m < 60) return m + "m ago"; if(m < 1440) return Math.floor(m / 60) + "h ago"; return Math.floor(m / 1440) + "d ago"; }
function tSty(t){ if(t === "Bullish" || t === "BUY" || t === "Strong Buy") return { c: "#22c55e", bg: "#052016", b: "#22c55e" }; if(t === "Bearish" || t === "SELL" || t === "Strong Sell") return { c: "#ef4444", bg: "#1a0505", b: "#ef4444" }; return { c: "#94a3b8", bg: "#0f1525", b: "#1c2a45" }; }
function ring(conf){ var cc = conf > 65 ? "#22c55e" : conf > 40 ? "#f59e0b" : "#ef4444"; var c = 2 * Math.PI * 33; return '<svg width="84" height="84" viewBox="0 0 84 84"><circle cx="42" cy="42" r="33" fill="none" stroke="#1e293b" stroke-width="2"/><circle cx="42" cy="42" r="33" fill="none" stroke="' + cc + '" stroke-width="2" stroke-dasharray="' + (c * conf / 100) + ' ' + c + '" stroke-linecap="round" transform="rotate(-90 42 42)"/><text x="42" y="50" text-anchor="middle" fill="' + cc + '" font-size="24" font-weight="800" font-family="monospace">' + conf + '%</text></svg>'; }
function rls(arr){ if(!Array.isArray(arr)) return ""; return arr.map(function(r){ return '<div class="rsn">' + escapeHTML(r) + '</div>'; }).join(""); }
function skels(h, n){ return Array(n).fill('<div class="skel" style="height:' + h + 'px;margin-bottom:8px"></div>').join(""); }
function ldng(msg){ return '<div style="text-align:center;padding:40px 20px"><div class="spnr"></div><div style="font-size:13px;color:#64748b">' + escapeHTML(msg) + '</div></div>'; }

function drawNativeChart(closes, volumes, up) {
  if (!closes || closes.length < 2) return '';
  var w = 500, h = 140;
  var minP = Math.min(...closes), maxP = Math.max(...closes);
  var rngP = maxP - minP || 1;
  minP -= (rngP * 0.08);
  maxP += (rngP * 0.08);
  rngP = maxP - minP;
  var coordinates = closes.map((p, i) => {
    var x = (i / (closes.length - 1)) * w;
    var y = h - ((p - minP) / rngP) * (h - 40) - 20;
    return { x: x, y: y };
  });
  var pricePts = coordinates.map(pt => pt.x.toFixed(1) + ',' + pt.y.toFixed(1)).join(' ');
  var areaPathData = `M 0,${h} L ` + pricePts + ` L ${w},${h} Z`;
  var color = up ? "#22c55e" : "#ef4444";
  var gradId = "grad_" + Math.random().toString(36).substr(2, 5);
  var currentLatestPrice = closes[closes.length - 1] || 0;
  var currentY = h - ((currentLatestPrice - minP) / rngP) * (h - 40) - 20;
  var priceBadgeHTML = currentLatestPrice > 0 ? `<span style="background: rgba(56,189,248,0.02); padding: 2px 8px; border-radius: 4px; border: 1px solid rgba(56,189,248,0.12); font-size: 9.5px; color: ${color}; font-weight: 800; font-family: monospace;">₹${currentLatestPrice.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>` : '';
  return `<div id="chart-card-wrapper" style="margin: 14px 0; background: #0b0f19; border: 1px solid #1e293b; border-radius: 12px; padding: 14px 16px; box-shadow: inset 0 2px 4px rgba(0,0,0,0.2); width: 100%"><div style="font-size: 10px; color: #64748b; margin-bottom: 12px; font-weight: 700; letter-spacing: 0.8px; text-transform: uppercase; display: flex; justify-content: space-between; align-items: center;"><span style="display: flex; align-items: center; gap: 6px;"><span style="width: 6px; height: 6px; background: ${color}; border-radius: 50%; display: inline-block;"></span>Intraday Technical Waveform</span><div style="display: flex; align-items: center; gap: 6px;">${priceBadgeHTML}<span style="background: #111827; padding: 2px 6px; border-radius: 4px; border: 1px solid #1e293b; font-size: 9px; color: #94a3b8;">CHART DATA</span></div></div><div style="height: 130px; width: 100%; position: relative; overflow: visible;"><svg viewBox="0 0 500 140" preserveAspectRatio="none" style="width: 100%; height: 100%; overflow: visible; display: block;"><defs><linearGradient id="${gradId}" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="${color}" stop-opacity="0.15"/><stop offset="100%" stop-color="${color}" stop-opacity="0.00"/></linearGradient></defs><path d="${areaPathData}" fill="url(#${gradId})" /><polyline points="${pricePts}" fill="none" stroke="${color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" /><circle cx="${coordinates[coordinates.length - 1].x.toFixed(1)}" cy="${coordinates[coordinates.length - 1].y.toFixed(1)}" r="4" fill="${color}" stroke="#0b0f19" stroke-width="1.5" /></svg><div style="position: absolute; left: 4px; top: -4px; font-size: 9px; color: #475569; font-weight: 700;">H: ₹${maxP.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</div><div style="position: absolute; left: 4px; bottom: 4px; font-size: 9px; color: #475569; font-weight: 700;">L: ₹${minP.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</div></div></div>`;
}

function switchTab(name){
  document.querySelectorAll(".tab").forEach(function(t){ t.classList.toggle("active", t.getAttribute("data-tab") === name); });
  document.querySelectorAll(".page").forEach(function(p){ p.classList.toggle("show", p.id === "pg-" + name); });
  if(name === "global") loadGlobal(); 
  if(name === "calendar") loadCal();
  if(name === "nextday" && window.activeTickerNode) { var ndInput = document.getElementById("ndIn"); if(ndInput) { ndInput.value = window.activeTickerNode; runNextDay(window.activeTickerNode); } }
  if(name === "term" && window.activeTickerNode) { var tmInput = document.getElementById("tmIn"); if(tmInput) { tmInput.value = window.activeTickerNode; runOutlook(window.activeTickerNode); } }
}
document.querySelectorAll(".tab").forEach(function(t){ t.addEventListener("click", function(){ switchTab(t.getAttribute("data-tab")); }); });

var siEl = document.getElementById("si"), ddEl = document.getElementById("dd");
var ddTmr = null;
if (siEl) {
  siEl.addEventListener("input", function(){
    clearTimeout(ddTmr); var q = siEl.value.trim(); if(q.length < 1){ ddEl.classList.remove("open"); return; }
    ddTmr = setTimeout(function(){ doSearch(q); }, 300);
  });
}

async function doSearch(q) {
  if (!ddEl) return;
  ddEl.innerHTML = '<div style="padding:12px 14px;font-size:12px;color:#475569">🔍 Searching...</div>';
  ddEl.classList.add("open"); 
  var res = await yfSearch(q);
  if (!res.length) { ddEl.innerHTML = '<div style="padding:12px 14px;font-size:12px;color:#475569">No matches.</div>'; return; }
  ddEl.innerHTML = res.map(function(r){
    var sym = r.symbol.replace(".NS", "").replace(".BO", "");
    return '<div class="ddr" data-t="' + escapeHTML(sym) + '"><span class="ddr-t">' + escapeHTML(sym) + '</span><span class="ddr-n">' + escapeHTML(r.longname || r.shortname || sym) + '</span></div>';
  }).join("");
}
if (ddEl) {
  ddEl.addEventListener("click", function(e){ var r = e.target.closest(".ddr"); if(r){ ddEl.classList.remove("open"); siEl.value = r.getAttribute("data-t"); runAnalysis(r.getAttribute("data-t")); } });
}
document.addEventListener("click", function(e){ if(ddEl && !e.target.closest(".sw")) ddEl.classList.remove("open"); });

window.ACTIVE_NEWS_POOL = [];

window.viewArticleDetail = function(id) {
  if (!window.ACTIVE_NEWS_POOL || !window.ACTIVE_NEWS_POOL.length) return;
  var target = window.ACTIVE_NEWS_POOL.find(function(a) { return a.id === id; });
  var detailPane = document.getElementById("newsDetailPanel");
  if (!target || !detailPane) return;
  window.ACTIVE_NEWS_POOL.forEach(function(art) {
    var el = document.getElementById("card_" + art.id);
    if (el) { el.style.borderColor = "#1e293b"; el.style.background = "#111827"; }
  });
  var activeCard = document.getElementById("card_" + id);
  if (activeCard) { activeCard.style.borderColor = "#38bdf8"; activeCard.style.background = "rgba(56, 189, 248, 0.03)"; }
  detailPane.innerHTML = `<div style="display: flex; flex-direction: column; gap: 12px; justify-content: flex-start; height: 100%; text-align: left;"><div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #1e293b; padding-bottom: 8px; width: 100%;"><span style="background: rgba(56,189,248,0.08); color: #38bdf8; font-size: 10px; font-weight: 800; padding: 2px 8px; border-radius: 4px; border: 1px solid rgba(56,189,248,0.15); text-transform: uppercase;">${target.source || "FEED"}</span><span style="color: #64748b; font-size: 11px; font-weight: 500;">${target.time || "Just now"}</span></div><h4 style="color: #ffffff; font-size: 14.5px; font-weight: 700; line-height: 1.4; margin: 0;">${target.headline}</h4><div style="background: #0b0f19; border: 1px solid #1e293b; border-radius: 6px; padding: 12px; margin-top: 4px;"><span style="color: #64748b; font-size: 9.5px; font-weight: 700; text-transform: uppercase; display: block; margin-bottom: 6px; letter-spacing: 0.5px;">Summary</span><p style="color: #94a3b8; font-size: 12.5px; line-height: 1.5; margin: 0; font-weight: 400;">${target.summary}</p></div></div>`;
};

async function loadNews(targetTicker) {
  var container = document.getElementById("newsBody");
  if (!container) return;
  container.innerHTML = `<div style="display:flex; flex-direction:column; align-items:center; justify-content:center; padding:48px; gap:12px; width:100%;"><div style="width:26px; height:26px; border:3px solid rgba(56,189,248,0.1); border-top-color:#38bdf8; border-radius:50%; animation:newsSpin 0.7s linear infinite;"></div><span style="color:#64748b; font-size:11px; font-weight:600; letter-spacing:0.8px; text-transform:uppercase;">Loading News...</span></div>`;
  try {
    var ticker = (typeof targetTicker === "string") ? targetTicker.trim() : "";
    if (!ticker) { var searchBox = document.getElementById("si"); if (searchBox && searchBox.value) ticker = String(searchBox.value).trim(); }
    var queryTag = (ticker && ticker.length > 0) ? ticker.toUpperCase().replace("^", "") : "NSE INDIA";
    var articles = [];
    if (typeof yfNews === "function") { try { articles = await yfNews(queryTag); } catch(apiErr) { console.warn("News API error", apiErr); } }
    window.ACTIVE_NEWS_POOL = Array.isArray(articles) ? articles : [];
    var layoutHtml = `<div style="display: flex; flex-wrap: wrap; gap: 16px; width: 100%; min-height: 360px; background: #0b0f19; border-radius: 12px; padding: 2px;"><div id="newsSidebar" style="flex: 1 1 300px; display: flex; flex-direction: column; gap: 8px; max-height: 480px; overflow-y: auto; padding-right: 8px;">`;
    window.ACTIVE_NEWS_POOL.forEach(function(article) {
      layoutHtml += `<div id="card_${article.id}" onclick="window.viewArticleDetail('${article.id}')" style="background: #111827; border: 1px solid #1e293b; padding: 12px; border-radius: 8px; cursor: pointer; transition: all 0.2s;" onmouseover="this.style.borderColor='#38bdf8'" onmouseout="this.style.borderColor='#1e293b'"><div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; gap: 8px;"><span style="color: #38bdf8; font-size: 11px; font-weight: 700; text-transform: uppercase;">${article.source}</span><span style="color: #64748b; font-size: 10px; font-weight: 500;">${article.time}</span></div><p style="color: #f1f5f9; font-size: 12.5px; font-weight: 600; line-height: 1.4; margin: 0; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">${article.headline}</p></div>`;
    });
    layoutHtml += `</div><div id="newsDetailPanel" style="flex: 1.3 1 380px; padding: 16px; display: flex; flex-direction: column; justify-content: center; background: #111827; border-radius: 8px; border: 1px solid #1e293b;"></div></div>`;
    container.innerHTML = layoutHtml;
    if (window.ACTIVE_NEWS_POOL.length > 0) window.viewArticleDetail(window.ACTIVE_NEWS_POOL[0].id);
  } catch (Error) {
    container.innerHTML = `<div style="color:#94a3b8; padding:24px; text-align:center;">News unavailable.</div>`;
  }
}

function isIndianMarketOpen() {
  var istDate = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
  var currentDay = istDate.getDay(); 
  if (currentDay === 0 || currentDay === 6) return false;
  var hour = istDate.getHours();
  var minute = istDate.getMinutes();
  var totalMinutesPassed = (hour * 60) + minute;
  var marketOpeningMinutes = (9 * 60) + 15;
  var marketClosingMinutes = (15 * 60) + 30;
  return totalMinutesPassed >= marketOpeningMinutes && totalMinutesPassed <= marketClosingMinutes;
}

async function loadIdx() {
  var timestamp = Date.now();
  var niftyUrl = `https://query1.finance.yahoo.com/v8/finance/chart/^NSEI?interval=1d&range=1d&_=${timestamp}`;
  var sensexUrl = `https://query1.finance.yahoo.com/v8/finance/chart/^BSESN?interval=1d&range=1d&_=${timestamp}`;
  async function fetchMarketChart(targetUrl) {
    var proxyCircuits = [
      (url) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
      (url) => `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`
    ];
    for (var proxy of proxyCircuits) {
      try {
        var managed = await window.RequestManager.request(proxy(targetUrl), {
          timeout: 7000,
          retries: 1,
          ttl: window.TTL.s,
          cacheKey: "market-chart::" + targetUrl,
          allowStaleOnError: true
        });
        var json = managed.data;
        if (json && json.contents) { json = JSON.parse(json.contents); }
        if (json && json.chart && json.chart.result && json.chart.result[0]) {
          var meta = json.chart.result[0].meta;
          var price = parseFloat(meta.regularMarketPrice);
          var prevClose = parseFloat(meta.chartPreviousClose);
          if (!isNaN(price) && !isNaN(prevClose)) {
            var change = ((price - prevClose) / prevClose) * 100;
            return { price: price, changePct: (change >= 0 ? "+" : "") + change.toFixed(2) + "%", up: change >= 0 };
          }
        }
      } catch (e) { console.debug("Proxy shift"); }
    }
    return null;
  }
  var niftyData = await fetchMarketChart(niftyUrl);
  var sensexData = await fetchMarketChart(sensexUrl);
  if (niftyData) { window.LIVE_NIFTY_PRICE = niftyData.price; window.LIVE_NIFTY_CHG = niftyData.changePct; window.LIVE_NIFTY_UP = niftyData.up; }
  if (sensexData) { window.LIVE_SENSEX_PRICE = sensexData.price; window.LIVE_SENSEX_CHG = sensexData.changePct; window.LIVE_SENSEX_UP = sensexData.up; }
  if (!window.LIVE_NIFTY_PRICE) window.LIVE_NIFTY_PRICE = 22000;
  if (!window.LIVE_SENSEX_PRICE) window.LIVE_SENSEX_PRICE = 72000;
  if (!window.LIVE_NIFTY_CHG) window.LIVE_NIFTY_CHG = "+0.00%";
  if (!window.LIVE_SENSEX_CHG) window.LIVE_SENSEX_CHG = "+0.00%";
  forceRenderIndexUI();
}

function forceRenderIndexUI() {
  if (!window.LIVE_NIFTY_PRICE || !window.LIVE_SENSEX_PRICE) return;
  var nColor = window.LIVE_NIFTY_UP ? "#00b06a" : "#ff3b30";
  var sColor = window.LIVE_SENSEX_UP ? "#00b06a" : "#ff3b30";
  var nArrow = window.LIVE_NIFTY_UP ? "▲" : "▼";
  var sArrow = window.LIVE_SENSEX_UP ? "▲" : "▼";
  var generatedHTML = `<div class="gc" style="flex:1; background:#0b0f19; padding:12px; border-radius:6px; border:1px solid #1e293b; text-align:left;"><div class="gcl" style="font-size:10px; color:#64748b; font-weight:700; text-transform:uppercase;">NIFTY 50</div><div class="gcv" style="color:${nColor}; font-family:monospace; font-size:16px; font-weight:800; margin-top:2px;">${window.LIVE_NIFTY_PRICE.toLocaleString("en-IN", {minimumFractionDigits:2,maximumFractionDigits:2})}</div><div class="gcs" style="color:${nColor}; font-size:11px; font-weight:600; margin-top:2px;">${nArrow} ${window.LIVE_NIFTY_CHG}</div></div><div class="gc" style="flex:1; background:#0b0f19; padding:12px; border-radius:6px; border:1px solid #1e293b; text-align:left;"><div class="gcl" style="font-size:10px; color:#64748b; font-weight:700; text-transform:uppercase;">SENSEX</div><div class="gcv" style="color:${sColor}; font-family:monospace; font-size:16px; font-weight:800; margin-top:2px;">${window.LIVE_SENSEX_PRICE.toLocaleString("en-IN", {minimumFractionDigits:2,maximumFractionDigits:2})}</div><div class="gcs" style="color:${sColor}; font-size:11px; font-weight:600; margin-top:2px;">${sArrow} ${window.LIVE_SENSEX_CHG}</div></div>`;
  var explicitWrapper = document.getElementById("idxCards");
  if (explicitWrapper) { explicitWrapper.innerHTML = generatedHTML; return; }
}

async function runAnalysis(ticker){
  ticker = ticker.toUpperCase().trim();
  try {
    if (window.NCUserTools && typeof window.NCUserTools.addRecent === "function") {
      window.NCUserTools.addRecent(ticker);
    }
  } catch (integrationError) {
    console.warn("Recent-search integration skipped:", integrationError);
  }
  if(siEl) siEl.value = ticker;
  window.activeTickerNode = ticker;
  switchTab("analysis");
  var body = document.getElementById("aBody");
  if(window.CACHE.analysis[ticker] && fresh(window.CACHE.analysis[ticker].ts, window.TTL.m)) { renderAnalysis(window.CACHE.analysis[ticker].d); return; }
  if (body) body.innerHTML = ldng("Analyzing " + ticker + "...");
  var pData = await yfQuote(ticker);
  if(!pData) { if (body) body.innerHTML = '<div class="errbox">⚠️ Ticker unavailable</div>'; return; }
  var closes = pData.closes;
  var volumes = pData.volumes;
  var news = await yfNews(ticker);
  var rsi = calcRSI(closes, 14);
  var macdDetails = calcMACDDetails(closes);
  var macd = macdDetails ? macdDetails.macd : null;
  var ema20 = calcEMA(closes, 20);
  var ema50 = calcEMA(closes, 50);
  var ema200 = calcEMA(closes, 200);
  var vwap = calcVWAP(closes, volumes);
  var atr = calcATR(pData.highs, pData.lows, closes, 14);
  var sr = calcSR(closes);
  var scoreDetails = buildTechnicalScore(closes, {
    rsi: rsi, macdDetails: macdDetails, ema20: ema20, ema50: ema50, ema200: ema200
  });
  var calculatedHealth = scoreDetails.score === null ? 50 : scoreDetails.score;
  var healthVerdict = calculatedHealth > 75 ? "Strong Buy" : calculatedHealth > 50 ? "Buy" : calculatedHealth > 35 ? "Hold" : "Sell";
  var healthColor = calculatedHealth > 75 ? "#22c55e" : calculatedHealth > 50 ? "#00b06a" : calculatedHealth > 35 ? "#f59e0b" : "#ef4444";
  var prompt = "Evaluate " + ticker + " NSE stock. Return JSON: {\"trend\":\"Bullish/Bearish/Neutral\",\"confidence\":75,\"summary\":\"brief analysis\"}";
  var aiTxt = await freeAI(prompt);
  var ai = pj(aiTxt) || {};
  var d = {
    ticker: ticker,
    company: escapeHTML(pData.name),
    price: pData.price,
    changePct: pData.changePct,
    up: pData.up,
    mktCap: fmtCap(pData.raw * 1000000),
    closes: closes,
    volumes: volumes,
    rsi: rsi,
    macd: macd,
    macdDetails: macdDetails,
    ema20: ema20,
    ema50: ema50,
    ema200: ema200,
    vwap: vwap,
    atr: atr,
    signalBreakdown: scoreDetails.signals,
    support: sr.sup === null ? "—" : "₹" + sr.sup.toFixed(2),
    resistance: sr.res === null ? "—" : "₹" + sr.res.toFixed(2),
    news: news.slice(0, 4),
    healthScore: calculatedHealth,
    healthVerdict: healthVerdict,
    healthColor: healthColor,
    trend: ai.trend || healthVerdict,
    confidence: ai.confidence || calculatedHealth,
    tradeDirection: ai.tradeDirection || (calculatedHealth > 50 ? "BUY" : "WAIT"),
    entry: "₹" + pData.raw.toFixed(2),
    stopLoss: sr.sup === null ? "—" : "₹" + sr.sup.toFixed(2),
    target1: sr.res === null ? "—" : "₹" + sr.res.toFixed(2),
    riskLevel: "Medium",
    summary: ai.summary || "Technical setup established.",
    dataSource: pData.dataSource,
    dataStatus: pData.dataStatus
  };
  window.CACHE.analysis[ticker] = { d: d, ts: Date.now() };
  window.LIVE_CHART_POOL.closes = [...closes];
  renderAnalysis(d);
}

function renderAnalysis(d){
  var pc = d.up ? "#22c55e" : "#ef4444";
  var t = tSty(d.trend);
  var chartHTML = drawNativeChart(window.LIVE_CHART_POOL.closes.length ? window.LIVE_CHART_POOL.closes : d.closes, d.volumes, d.up);
  var nHTML = d.news.map(n => `<div class="nc"><div class="nc-head">${escapeHTML(n.headline)}</div><div class="nc-meta"><span>${escapeHTML(n.source)}</span>·<span>${n.time}</span></div></div>`).join("");
  var aBodyEl = document.getElementById("aBody");
  if (!aBodyEl) return;
  window.CURRENT_ACTIVE_ANALYSIS_DATA = d;
  aBodyEl.innerHTML = `
    <button class="bbtn" onclick="switchTab('home')">← Back</button>
    <div class="acrd">
      <div class="ahdr">
        <div>
          <div class="anm">${escapeHTML(d.company)}</div>
          <div class="asb">${d.ticker} · India</div>
          <div class="atgs"><span class="atg" style="color:${t.c};border-color:${t.b};background:${t.bg}">${d.trend}</span></div>
        </div>
        <div class="apr" style="margin-left:auto;text-align:right;">
          <div class="bprc" style="color:${pc}">${d.price}</div>
          <div class="bchg" style="color:${pc}">${d.changePct}</div>
        </div>
      </div>
      <div style="margin-top:10px; background:#111625; padding:10px; border-radius:10px; border:1px dashed #1c2a45; display:flex; justify-content:space-between; align-items:center;">
        <div><span style="font-size:11px; color:#64748b; font-weight:600;">TECHNICAL SCORE:</span><div style="font-size:15px; font-weight:800; color:${d.healthColor}">${d.healthScore}% — ${d.healthVerdict}</div></div>
        <div style="height:6px; width:120px; background:#1c2a45; border-radius:3px; overflow:hidden;"><div style="height:100%; width:${d.healthScore}%; background:${d.healthColor}"></div></div>
      </div>
    </div>
    ${chartHTML}
    <div class="g4">
      <div class="gc"><div class="gcl">Support</div><div class="gcv" style="color:#22c55e">${d.support}</div></div>
      <div class="gc"><div class="gcl">Resistance</div><div class="gcv" style="color:#ef4444">${d.resistance}</div></div>
      <div class="gc"><div class="gcl">RSI (14)</div><div class="gcv" style="color:#f59e0b">${d.rsi}</div></div>
      <div class="gc"><div class="gcl">MACD</div><div class="gcv" style="color:#3b82f6">${d.macd}</div></div>
    </div>
    <div class="sec">
      <div class="stitle">Advanced Indicators</div>
      <div class="g4">
        <div class="gc"><div class="gcl">VWAP</div><div class="gcv">${d.vwap !== null ? "₹" + d.vwap.toFixed(2) : "Unavailable"}</div></div>
        <div class="gc"><div class="gcl">ATR (14)</div><div class="gcv">${d.atr !== null ? "₹" + d.atr.toFixed(2) : "Unavailable"}</div></div>
        <div class="gc"><div class="gcl">EMA 20 / 50</div><div class="gcv">${d.ema20 !== null && d.ema50 !== null ? d.ema20.toFixed(2) + " / " + d.ema50.toFixed(2) : "Unavailable"}</div></div>
        <div class="gc"><div class="gcl">EMA 200</div><div class="gcv">${d.ema200 !== null ? d.ema200.toFixed(2) : "Insufficient history"}</div></div>
      </div>
    </div>
    <div class="sec">
      <div class="stitle">Transparent Signal Breakdown</div>
      ${(d.signalBreakdown || []).map(function(s) {
        return `<div style="padding:9px 0;border-bottom:1px solid #1e293b;display:flex;justify-content:space-between;gap:16px;"><div><strong>${escapeHTML(s.name)}</strong><div style="font-size:11px;color:#94a3b8;margin-top:3px;">${escapeHTML(s.explanation)}</div></div><div style="font-family:monospace;font-weight:800;">${s.contribution.toFixed(1)} / ${s.weight}</div></div>`;
      }).join("") || '<div class="errbox">Insufficient historical data for a transparent score breakdown.</div>'}
      <div style="font-size:11px;color:#64748b;margin-top:10px;">The technical score is deterministic and calculated only from available market indicators; no random financial values are used.</div>
    </div>
    <div class="sec">
      <div class="stitle">AI Evaluation</div>
      <div class="pr">
        <span class="pb2" style="color:${t.c};background:${t.bg};border-color:${t.b}">${d.tradeDirection}</span>
        <div style="font-size:11px;color:#94a3b8;">Confidence: <strong>${d.confidence}%</strong></div>
      </div>
      <div class="asum">💡 ${escapeHTML(d.summary)}</div>
    </div>
    ${nHTML ? `<div class="sec"><div class="stitle">News</div>${nHTML}</div>` : ''}
  `;
}

async function runNextDay(ticker){
  ticker = ticker.toUpperCase().trim();
  var body = document.getElementById("ndBody");
  if (body) body.innerHTML = ldng("Calculating next-session technical outlook...");
  var p = await yfQuote(ticker);
  if(!p) { if(body) body.innerHTML = '<div class="errbox">⚠️ Market data unavailable for this ticker.</div>'; return; }

  var rsi = calcRSI(p.closes, 14);
  var macdDetails = calcMACDDetails(p.closes);
  var ema20 = calcEMA(p.closes, 20);
  var ema50 = calcEMA(p.closes, 50);
  var ema200 = calcEMA(p.closes, 200);
  var scoreDetails = buildTechnicalScore(p.closes, { rsi:rsi, macdDetails:macdDetails, ema20:ema20, ema50:ema50, ema200:ema200 });
  var score = scoreDetails.score === null ? 50 : scoreDetails.score;
  var trend = score >= 60 ? "Bullish" : score <= 40 ? "Bearish" : "Neutral";
  var confidence = Math.min(90, Math.max(50, Math.round(50 + Math.abs(score - 50) * 0.8)));
  renderND({
    ticker:ticker, price:p.price, trend:trend, confidence:confidence,
    technicalScore:score, signals:scoreDetails.signals,
    dataSource:p.dataSource, dataStatus:p.dataStatus
  });
}

function renderND(d) {
  var accentColor = d.trend.toLowerCase().includes("bull") ? "#00b06a" : "#ff3b30";
  var accentBg = d.trend.toLowerCase().includes("bull") ? "rgba(0,176,106,0.12)" : "rgba(255,59,48,0.12)";
  var arrow = d.trend.toLowerCase().includes("bull") ? "▲" : "▼";
  var body = document.getElementById("ndBody");
  if (!body) return;
  body.innerHTML = `<div class="sec" style="background:#0b0f19; border-radius:12px; padding:24px; border:1px solid #1e293b;"><div style="display:flex; justify-content:space-between; margin-bottom:16px;"><div><div style="font-size:20px; font-weight:800; color:${accentColor}; margin-bottom:4px;">${escapeHTML(d.ticker)}</div></div><div style="text-align:right;"><div style="font-size:18px; font-weight:800; color:${accentColor};">${arrow} ${escapeHTML(d.trend)}</div><div style="font-size:11px; color:#64748b;">Model confidence: ${d.confidence}%</div></div></div>
    <div style="font-size:12px;color:#94a3b8;margin-bottom:12px;">Technical score: <strong>${d.technicalScore}/100</strong> • ${escapeHTML(d.dataSource || "Market source")} • ${escapeHTML(d.dataStatus || "DELAYED")}</div>
    ${(d.signals || []).map(function(s){ return `<div style="padding:8px 0;border-top:1px solid #1e293b;"><strong>${escapeHTML(s.name)}</strong>: ${escapeHTML(s.explanation)}</div>`; }).join("")}
    <div style="font-size:11px;color:#64748b;margin-top:14px;">Probabilistic technical outlook only; not a guarantee of future price direction.</div>
  </div>`;
}

async function runOutlook(ticker){
  ticker = ticker.toUpperCase().trim();
  var body = document.getElementById("tmBody");
  if (body) body.innerHTML = ldng("Building scenario-based outlook...");
  var p = await yfQuote(ticker);
  if(!p) { if(body) body.innerHTML = '<div class="errbox">⚠️ Market data unavailable for this ticker.</div>'; return; }

  var price = Number(p.raw);
  var atr = calcATR(p.highs, p.lows, p.closes, 14);
  var sr = calcSR(p.closes);
  var riskUnit = atr || (price * 0.03);
  var scenarios = [
    { name:"Bull case", target:price + 2*riskUnit, condition:"Momentum remains constructive and resistance is cleared.", color:"#22c55e" },
    { name:"Base case", target:price, condition:"Price consolidates around the current trend without a decisive breakout.", color:"#f59e0b" },
    { name:"Bear case", target:Math.max(0, price - 2*riskUnit), condition:"Support fails and downside momentum expands.", color:"#ef4444" }
  ];
  var scenarioHTML = scenarios.map(function(s){
    return `<div class="gc"><div class="gcl">${s.name}</div><div class="gcv" style="color:${s.color}">₹${s.target.toFixed(2)}</div><div style="font-size:11px;color:#94a3b8;margin-top:6px;">${escapeHTML(s.condition)}</div></div>`;
  }).join("");
  body.innerHTML = `<div class="sec" style="background:#0b0f19;padding:24px;border-radius:12px;border:1px solid #1e293b;">
    <h3 style="margin:0 0 12px;">${escapeHTML(ticker)} Scenario Outlook</h3>
    <div class="g4">${scenarioHTML}</div>
    <div style="font-size:12px;color:#94a3b8;margin-top:14px;">ATR (14): ${atr !== null ? "₹"+atr.toFixed(2) : "Unavailable"} • Support: ${sr.sup !== null ? "₹"+sr.sup.toFixed(2) : "Unavailable"} • Resistance: ${sr.res !== null ? "₹"+sr.res.toFixed(2) : "Unavailable"}</div>
    <div style="font-size:11px;color:#64748b;margin-top:10px;">Scenarios are deterministic technical ranges based on current price and volatility, not guaranteed forecasts.</div>
  </div>`;
}

async function loadGlobal(force){
  if(!force && window.CACHE.global && fresh(window.CACHE.gTs, window.TTL.s)) { renderGlobal(window.CACHE.global); return; }
  var gBodyEl = document.getElementById("gBody");
  if (gBodyEl) gBodyEl.innerHTML = skels(80, 2);
  try {
    var symbols = ["^NSEI", "^BSESN", "^GSPC"];
    var results = await Promise.all(symbols.map(s => yfQuote(s)));
    window.CACHE.global = results;
    window.CACHE.gTs = Date.now();
    renderGlobal(results);
  } catch(e) { if (gBodyEl) gBodyEl.innerHTML = '<div class="errbox">⚠️ Global data unavailable</div>'; }
}

function renderGlobal(arr){
  var h = '<div class="ggrid">';
  arr.forEach(function(p){ if(!p) return; var c = p.up ? "#22c55e" : "#ef4444"; h += '<div class="gcrd"><div class="gnm">' + escapeHTML(p.name) + '</div><div class="gvl" style="color:' + c + '">' + p.raw.toLocaleString("en-IN", { maximumFractionDigits: 2 }) + '</div></div>'; });
  var gBodyEl = document.getElementById("gBody");
  if (gBodyEl) gBodyEl.innerHTML = h + '</div>';
}
var btnGlobalEl = document.getElementById("btnGlobal");
if (btnGlobalEl) { btnGlobalEl.addEventListener("click", function(){ loadGlobal(true); }); }

async function loadCal(force){
  if(!force && window.CACHE.cal && fresh(window.CACHE.cTs, window.TTL.l)) { renderCal(window.CACHE.cal); return; }
  var calBodyEl = document.getElementById("calBody");
  if (calBodyEl) calBodyEl.innerHTML = skels(56, 3);
  try {
    var aiTxt = await freeAI("List 3 Indian corporate events. JSON: [{\"date\":\"DD MMM\",\"company\":\"Name\"}]");
    var arr = pja(aiTxt) || [];
    window.CACHE.cal = arr;
    window.CACHE.cTs = Date.now();
    renderCal(arr);
  } catch(e) { if (calBodyEl) calBodyEl.innerHTML = '<div class="errbox">⚠️ Calendar unavailable</div>'; }
}

function renderCal(arr){
  var h = '<div class="clst">';
  arr.forEach(function(e){ h += '<div class="citem"><div class="cdt">' + escapeHTML(e.date) + '</div><div style="flex:1;"><div style="font-size:13px;font-weight:700;">' + escapeHTML(e.company) + '</div></div></div>'; });
  var calBodyEl = document.getElementById("calBody");
  if (calBodyEl) calBodyEl.innerHTML = h + '</div>';
}
var btnCalEl = document.getElementById("btnCal");
if (btnCalEl) { btnCalEl.addEventListener("click", function(){ loadCal(true); }); }

var chatSendEl = document.getElementById("chatSend");
if (chatSendEl) chatSendEl.addEventListener("click", sendChat);
var chatInEl = document.getElementById("chatIn");
if (chatInEl) { chatInEl.addEventListener("keydown", function(e){ if(e.key === "Enter") sendChat(); }); }

async function sendChat(){
  var inp = document.getElementById("chatIn");
  var q = inp.value.trim();
  if(!q) return;
  inp.value = "";
  var msgs = document.getElementById("chatMsgs");
  if (msgs) msgs.innerHTML += '<div class="cm cmu">' + escapeHTML(q) + '</div>';
  var tid = "m" + Date.now();
  if (msgs) msgs.innerHTML += '<div class="cm cmai" id="' + tid + '"><span class="mspn"></span> Processing...</div>';
  if (msgs) msgs.scrollTop = msgs.scrollHeight;
  var prompt = "You are NC AI, financial co-pilot. " + q;
  var txt = await freeAI(prompt);
  var stylizedText = txt ? txt.replace(/\n/g, "<br>") : "No response.";
  var targetMsgEl = document.getElementById(tid);
  if (targetMsgEl) targetMsgEl.innerHTML = sanitizeHTML(stylizedText);
  if (msgs) msgs.scrollTop = msgs.scrollHeight;
}

async function bootDashboard() {
  try { await loadIdx(); } catch(e) {}
  await new Promise(r => setTimeout(r, 300));
  try { await loadNews(); } catch(e) {}
}

if (window.RefreshScheduler) {
  window.RefreshScheduler.register("master-exchange-orchestrator", async function () {
    if (!isIndianMarketOpen()) { forceRenderIndexUI(); return; }
    forceRenderIndexUI();

    var tasks = [];
    if (!window.LAST_IDX_REFRESH_TS || Date.now() - window.LAST_IDX_REFRESH_TS > 15000) {
      window.LAST_IDX_REFRESH_TS = Date.now();
      tasks.push(loadIdx());
    }
    if (!window.LAST_NEWS_REFRESH_TS || Date.now() - window.LAST_NEWS_REFRESH_TS > 240000) {
      window.LAST_NEWS_REFRESH_TS = Date.now();
      tasks.push(loadNews());
    }
    if (tasks.length) await Promise.allSettled(tasks);
  }, 2000, { pauseWhenHidden: true });
}

function initThemeSwitcher() {
  var themeBtn = document.getElementById("themeBtn") || document.querySelector(".themeToggle");
  if (!themeBtn) return;
  themeBtn.addEventListener("click", function() {
    isLight = !isLight;
    document.body.classList.toggle("light", isLight);
    themeBtn.innerText = isLight ? "☀️" : "🌙";
  });
}

document.addEventListener("DOMContentLoaded", initThemeSwitcher);
bootDashboard();
