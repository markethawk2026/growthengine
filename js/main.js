/**
 * NC Markets - UI Navigation, State Routing & Dual-Axis Visualization Layer
 */

var activeTF = "both", isLight = false, activeTickerNode = "NIFTY50";
window.LIVE_CHART_POOL = { closes: [] };

function isUp(v){ return !String(v || "0").trim().startsWith("-"); }
function fmtVol(v){ if(!v) return "—"; if(v > 10000000) return (v / 10000000).toFixed(1) + "Cr"; if(v > 100000) return (v / 100000).toFixed(1) + "L"; return String(v); }
function fmtCap(v){ if(!v) return "—"; if(v > 1e12) return "₹" + (v / 1e12).toFixed(1) + "T"; if(v > 1e9) return "₹" + (v / 1e9).toFixed(0) + "B"; return "₹" + (v / 1e7).toFixed(0) + "Cr"; }
function timeAgo(ts){ var m = Math.floor((Date.now() - ts) / 60000); if(m < 60) return m + "m ago"; if(m < 1440) return Math.floor(m / 60) + "h ago"; return Math.floor(m / 1440) + "d ago"; }
function tSty(t){ if(t === "Bullish" || t === "BUY" || t === "Strong Buy") return { c: "#22c55e", bg: "#052016", b: "#22c55e" }; if(t === "Bearish" || t === "SELL" || t === "Strong Sell") return { c: "#ef4444", bg: "#1a0505", b: "#ef4444" }; return { c: "#94a3b8", bg: "#0f1525", b: "#1c2a45" }; }
function ring(conf){ var cc = conf > 65 ? "#22c55e" : conf > 40 ? "#f59e0b" : "#ef4444"; var c = 2 * Math.PI * 33; return '<svg width="84" height="84" viewBox="0 0 84 84"><circle cx="42" cy="42" r="33" fill="none" stroke="#1e293b" stroke-width="2"/><circle cx="42" cy="42" r="33" fill="none" stroke="' + cc + '" stroke-width="2" stroke-dasharray="' + (c * conf / 100) + ' ' + c + '" stroke-linecap="round" transform="rotate(-90 42 42)"/><text x="42" y="50" text-anchor="middle" fill="' + cc + '" font-size="24" font-weight="800" font-family="monospace">' + conf + '%</text></svg>'; }
function rls(arr){ if(!Array.isArray(arr)) return ""; return arr.map(function(r){ return '<div class="rsn">' + escapeHTML(r) + '</div>'; }).join(""); }
function skels(h, n){ return Array(n).fill('<div class="skel" style="height:' + h + 'px;margin-bottom:8px"></div>').join(""); }
function ldng(msg){ return '<div style="text-align:center;padding:40px 20px"><div class="spnr"></div><div style="font-size:13px;color:#64748b">' + escapeHTML(msg) + '</div></div>'; }

// Candlestick pattern detection → Buy / Sell / Hold signal
function detectCandlePattern(opens, highs, lows, closes) {
  var n = closes.length;
  if (n < 3 || !opens || opens.length !== n) return { signal: "HOLD", pattern: "Insufficient data", color: "#f59e0b" };
  var o = opens[n-1], h = highs[n-1], l = lows[n-1], c = closes[n-1];
  var po = opens[n-2], pc = closes[n-2];
  var body = Math.abs(c - o), range = (h - l) || 1;
  var upperWick = h - Math.max(o, c), lowerWick = Math.min(o, c) - l;
  var patterns = [], bull = 0, bear = 0;

  if (pc < po && c > o && c >= po && o <= pc) { patterns.push("Bullish Engulfing"); bull += 2; }
  if (pc > po && c < o && o >= pc && c <= po) { patterns.push("Bearish Engulfing"); bear += 2; }
  if (lowerWick > body * 2 && upperWick < body && body > 0) { patterns.push("Hammer"); bull += 1.5; }
  if (upperWick > body * 2 && lowerWick < body && body > 0) { patterns.push("Shooting Star"); bear += 1.5; }
  if (body < range * 0.1) { patterns.push("Doji"); }
  if (closes[n-1] > closes[n-2] && closes[n-2] > closes[n-3]) bull += 1;
  if (closes[n-1] < closes[n-2] && closes[n-2] < closes[n-3]) bear += 1;

  var signal, color;
  if (bull - bear >= 1.5) { signal = "BUY"; color = "#22c55e"; }
  else if (bear - bull >= 1.5) { signal = "SELL"; color = "#ef4444"; }
  else { signal = "HOLD"; color = "#f59e0b"; }
  return { signal: signal, pattern: patterns.length ? patterns.join(" · ") : "No clear pattern", color: color };
}

window.ncChartHover = function(e) {
  var d = window._ncChartData; if (!d) return;
  var svg = document.getElementById('ncChartSvg'); if (!svg) return;
  var rect = svg.getBoundingClientRect();
  var xv = (e.clientX - rect.left) / rect.width * d.W;
  var plotX = xv - d.ML;
  if (plotX < 0 || plotX > d.plotW) { window.ncChartLeave(); return; }
  var idx = Math.floor(plotX / d.plotW * d.n);
  if (idx < 0) idx = 0; if (idx >= d.n) idx = d.n - 1;
  var cx = d.ML + (idx + 0.5) / d.n * d.plotW;
  var cross = document.getElementById('ncCrossV');
  if (cross) { cross.setAttribute('x1', cx); cross.setAttribute('x2', cx); cross.style.display = 'block'; }
  var tip = document.getElementById('ncChartTip'); if (!tip) return;
  var dt = d.times && d.times[idx] ? new Date(d.times[idx]*1000).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'2-digit'}) : ('#' + (idx+1));
  var up = d.closes[idx] >= d.opens[idx];
  tip.innerHTML = '<div style="font-weight:700;color:#cbd5e1;margin-bottom:2px;">' + dt + '</div>'
    + '<div style="color:#94a3b8;">O <b style="color:#e2e8f4">' + d.opens[idx].toFixed(2) + '</b>&nbsp; H <b style="color:#22c55e">' + d.highs[idx].toFixed(2) + '</b></div>'
    + '<div style="color:#94a3b8;">L <b style="color:#ef4444">' + d.lows[idx].toFixed(2) + '</b>&nbsp; C <b style="color:' + (up?'#22c55e':'#ef4444') + '">' + d.closes[idx].toFixed(2) + '</b></div>';
  tip.style.display = 'block';
  var contRect = svg.parentElement.getBoundingClientRect();
  var px = e.clientX - contRect.left;
  tip.style.left = Math.min(Math.max(px + 12, 4), contRect.width - 130) + 'px';
};
window.ncChartLeave = function() {
  var c = document.getElementById('ncCrossV'); if (c) c.style.display = 'none';
  var t = document.getElementById('ncChartTip'); if (t) t.style.display = 'none';
};

function drawCandlestickChart(opens, highs, lows, closes, volumes, up, times) {
  if (!closes || closes.length < 2) return '';
  var n = closes.length;
  var hasOHLC = opens && opens.length === n && highs && highs.length === n && lows && lows.length === n;

  var W = 640, ML = 46, MR = 12, MT = 10;
  var priceH = 168, volGap = 8, volH = 32, xAxisH = 20;
  var totalH = MT + priceH + volGap + volH + xAxisH;
  var plotW = W - ML - MR;

  var minP = Math.min.apply(null, lows && lows.length ? lows : closes);
  var maxP = Math.max.apply(null, highs && highs.length ? highs : closes);
  var rng = maxP - minP || 1;
  minP -= rng * 0.05; maxP += rng * 0.05; rng = maxP - minP;

  var maxVol = volumes && volumes.length ? Math.max.apply(null, volumes.map(function(v){ return v || 0; })) : 1;
  if (maxVol <= 0) maxVol = 1;

  var volTop = MT + priceH + volGap;
  function py(price) { return MT + priceH - ((price - minP) / rng) * priceH; }
  function vy(vol) { return volTop + volH - ((vol || 0) / maxVol) * volH; }
  function vh(vol) { return ((vol || 0) / maxVol) * volH; }

  var color = up ? "#22c55e" : "#ef4444";
  var candleW = Math.max(2, Math.min(10, Math.floor(plotW / n) - 1));
  var step = plotW / n;
  var svg = [];

  // Y-axis gridlines + price labels
  var GL = 4;
  for (var g = 0; g <= GL; g++) {
    var gp = minP + (rng * g / GL);
    var gy = py(gp);
    svg.push('<line x1="' + ML + '" y1="' + gy.toFixed(1) + '" x2="' + (W - MR) + '" y2="' + gy.toFixed(1) + '" stroke="#1e293b" stroke-width="0.5" stroke-dasharray="2 3"/>');
    svg.push('<text x="' + (ML - 4) + '" y="' + (gy + 3).toFixed(1) + '" text-anchor="end" font-size="9" fill="#64748b" font-family="monospace">' + gp.toFixed(0) + '</text>');
  }

  // X-axis date labels
  var XL = Math.min(6, n);
  for (var xl = 0; xl < XL; xl++) {
    var di = Math.round((n - 1) * xl / (XL - 1 || 1));
    var xx = ML + (di + 0.5) * step;
    var lbl = (times && times[di]) ? new Date(times[di]*1000).toLocaleDateString('en-IN',{day:'2-digit',month:'short'}) : ('#' + (di+1));
    var anchor = xl === 0 ? 'start' : (xl === XL-1 ? 'end' : 'middle');
    svg.push('<text x="' + xx.toFixed(1) + '" y="' + (totalH - 6) + '" text-anchor="' + anchor + '" font-size="8.5" fill="#64748b">' + lbl + '</text>');
  }

  // Volume bars
  for (var i = 0; i < n; i++) {
    var cxv = ML + (i + 0.5) * step;
    var vUp = hasOHLC ? (closes[i] >= opens[i]) : (i === 0 ? true : closes[i] >= closes[i-1]);
    svg.push('<rect x="' + (cxv - candleW/2).toFixed(1) + '" y="' + vy(volumes ? volumes[i] : 0).toFixed(1) + '" width="' + candleW + '" height="' + vh(volumes ? volumes[i] : 0).toFixed(1) + '" fill="' + (vUp ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.3)") + '" rx="1"/>');
  }

  if (hasOHLC) {
    for (var i = 0; i < n; i++) {
      var cx = ML + (i + 0.5) * step;
      var o = opens[i], h2 = highs[i], l2 = lows[i], c = closes[i];
      var cUp = c >= o, cColor = cUp ? "#22c55e" : "#ef4444";
      var bodyTop = py(Math.max(o, c)), bodyH = Math.max(1, py(Math.min(o, c)) - bodyTop);
      svg.push('<line x1="' + cx.toFixed(1) + '" y1="' + py(h2).toFixed(1) + '" x2="' + cx.toFixed(1) + '" y2="' + py(l2).toFixed(1) + '" stroke="' + cColor + '" stroke-width="1" opacity="0.8"/>');
      svg.push('<rect x="' + (cx - candleW/2).toFixed(1) + '" y="' + bodyTop.toFixed(1) + '" width="' + candleW + '" height="' + bodyH.toFixed(1) + '" fill="' + (cUp ? "rgba(34,197,94,0.9)" : "rgba(239,68,68,0.9)") + '" stroke="' + cColor + '" stroke-width="0.5" rx="0.5"/>');
    }
  } else {
    var pts = closes.map(function(p, i){ return (ML + (i+0.5)*step).toFixed(1) + ',' + py(p).toFixed(1); }).join(' ');
    svg.push('<polyline points="' + pts + '" fill="none" stroke="' + color + '" stroke-width="2" stroke-linejoin="round"/>');
  }

  // Crosshair (hidden until hover)
  svg.push('<line id="ncCrossV" x1="0" y1="' + MT + '" x2="0" y2="' + (volTop + volH) + '" stroke="#94a3b8" stroke-width="0.8" stroke-dasharray="3 3" style="display:none;"/>');

  // Pattern signal
  var pat = detectCandlePattern(opens, highs, lows, closes);
  var priceLbl = closes[n-1].toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  window._ncChartData = { opens: opens, highs: highs, lows: lows, closes: closes, times: times, n: n, ML: ML, plotW: plotW, W: W };

  return '<div style="margin:14px 0;background:#0b0f19;border:1px solid #1e293b;border-radius:12px;padding:14px 16px;width:100%">'
    + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;flex-wrap:wrap;gap:6px;">'
    + '<div style="font-size:10px;color:#64748b;font-weight:700;letter-spacing:0.8px;text-transform:uppercase;display:flex;align-items:center;gap:6px;">'
    + '<span style="width:6px;height:6px;background:' + color + ';border-radius:50%;display:inline-block;"></span>' + (hasOHLC ? "Candlestick Chart" : "Price Chart")
    + '</div>'
    + '<div style="display:flex;align-items:center;gap:6px;">'
    + '<span style="font-size:10px;font-weight:800;color:' + pat.color + ';background:' + pat.color + '1a;border:1px solid ' + pat.color + '55;padding:2px 9px;border-radius:5px;">' + pat.signal + '</span>'
    + '<span style="font-size:9.5px;font-weight:800;font-family:monospace;color:' + color + ';background:rgba(56,189,248,0.05);border:1px solid rgba(56,189,248,0.12);padding:2px 8px;border-radius:4px;">₹' + priceLbl + '</span>'
    + '</div></div>'
    + '<div style="position:relative;" onmousemove="ncChartHover(event)" onmouseleave="ncChartLeave()">'
    + '<svg id="ncChartSvg" viewBox="0 0 ' + W + ' ' + totalH + '" style="width:100%;height:auto;display:block;">'
    + svg.join('')
    + '</svg>'
    + '<div id="ncChartTip" style="position:absolute;top:6px;display:none;background:rgba(11,15,25,0.95);border:1px solid #334155;border-radius:6px;padding:6px 9px;font-size:10px;font-family:monospace;pointer-events:none;z-index:5;white-space:nowrap;box-shadow:0 4px 12px rgba(0,0,0,0.5);"></div>'
    + '</div>'
    + '<div style="font-size:9.5px;color:#64748b;margin-top:6px;text-align:center;">Pattern: <span style="color:#94a3b8;font-weight:600;">' + pat.pattern + '</span> · hover chart for OHLC</div>'
    + '</div>';
}

function switchTab(name){
  document.querySelectorAll(".tab").forEach(function(t){
    var isActive = t.getAttribute("data-tab") === name;
    t.classList.toggle("active", isActive);
    t.setAttribute("aria-selected", isActive ? "true" : "false");
  });
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
    // Render instant local/saved suggestions immediately on keypress
    renderInstantSuggestions(q);
    ddTmr = setTimeout(function(){ doSearch(q); }, 80);
  });
}

function renderInstantSuggestions(q) {
  if (!ddEl) return;
  var queryClean = String(q || "").trim().toUpperCase();
  var userState = window.NCUserTools ? window.NCUserTools.getState() : null;
  var workspaceItems = userState ? [].concat(userState.recent || [], userState.watchlist || []) : [];
  var saved = Array.from(new Set(workspaceItems)).filter(function(s) {
    return s.toUpperCase().includes(queryClean);
  }).slice(0, 3);

  // Match NSE symbols list (symbols only, names loaded live on selection)
  var savedSet = new Set(saved.map(function(s) { return s.toUpperCase(); }));
  var staticMatches = NSE_TICKERS.filter(function(sym) {
    return !savedSet.has(sym.toUpperCase()) && sym.toUpperCase().includes(queryClean);
  }).slice(0, 5 - saved.length);

  var rows = saved.map(function(sym) {
    var savedName = (window._tickerNameCache && window._tickerNameCache[sym]) || null;
    var savedLabel = savedName ? escapeHTML(savedName) : '★ Saved';
    return '<div class="ddr" data-t="' + escapeHTML(sym) + '"><span class="ddr-t">' + escapeHTML(sym) + '</span><span class="ddr-n">' + savedLabel + '</span></div>';
  }).concat(staticMatches.map(function(sym) {
    var cachedName = (window._tickerNameCache && window._tickerNameCache[sym]) || null;
    var nameLabel = cachedName ? escapeHTML(cachedName) : 'NSE · tap to analyse';
    return '<div class="ddr" data-t="' + escapeHTML(sym) + '"><span class="ddr-t">' + escapeHTML(sym) + '</span><span class="ddr-n">' + nameLabel + '</span></div>';
  }));

  if (rows.length > 0) {
    ddEl.innerHTML = rows.join("") + '<div style="padding:5px 14px;font-size:10px;color:#475569;border-top:1px solid rgba(255,255,255,0.06)">🔍 Searching live exchange…</div>';
    ddEl.classList.add("open");
  } else {
    ddEl.innerHTML = '<div style="padding:12px 14px;font-size:12px;color:#475569">🔍 Searching live exchange…</div>';
    ddEl.classList.add("open");
  }
}

async function doSearch(q) {
  if (!ddEl) return;
  var queryClean = String(q || "").trim();
  if (!queryClean) { ddEl.classList.remove("open"); return; }

  var res = await yfSearch(queryClean);

  if (!res || !res.length) {
    var userState = window.NCUserTools ? window.NCUserTools.getState() : null;
    var workspaceItems = userState ? [].concat(userState.recent || [], userState.watchlist || []) : [];
    var matchedWorkspace = Array.from(new Set(workspaceItems)).filter(function(item) {
      return item.toUpperCase().includes(queryClean.toUpperCase());
    });

    if (matchedWorkspace.length > 0) {
      res = matchedWorkspace.slice(0, 5).map(function(sym) {
        return { symbol: sym, longname: sym + " (Saved)", shortname: sym };
      });
    }
  }

  if (!res || !res.length) {
    // Fallback to static NSE symbol list (no hardcoded names — API will supply name on analysis)
    var staticFallback = NSE_TICKERS.filter(function(sym) {
      return sym.toUpperCase().includes(queryClean.toUpperCase());
    }).slice(0, 8);
    if (staticFallback.length) {
      res = staticFallback.map(function(sym) {
        var n = window._tickerNameCache && window._tickerNameCache[sym];
        return { symbol: sym, longname: n || null, shortname: null };
      });
    }
  }

  if (!res || !res.length) {
    ddEl.innerHTML = '<div style="padding:12px 14px;font-size:12px;color:#64748b">No results for "' + escapeHTML(queryClean) + '"</div>';
    ddEl.classList.add("open");
    return;
  }

  // Seed name cache from live search results
  window._tickerNameCache = window._tickerNameCache || {};
  res.forEach(function(r) {
    var sym = (r.symbol || '').replace(/\.(NS|BO)$/i, '').toUpperCase();
    var name = r.longname || r.shortname || r.longName || r.shortName || null;
    if (sym && name) window._tickerNameCache[sym] = name;
  });

  ddEl.innerHTML = res.map(function(r){
    var sym = (r.symbol || '').replace(/\.(NS|BO)$/i, '').toUpperCase();
    var displayName = r.longname || r.shortname || r.longName || r.shortName
      || (window._tickerNameCache && window._tickerNameCache[sym]) || null;
    var nameHtml = displayName
      ? escapeHTML(displayName)
      : '<span style="color:#475569">NSE · tap to analyse</span>';
    return '<div class="ddr" data-t="' + escapeHTML(sym) + '"><span class="ddr-t">' + escapeHTML(sym) + '</span><span class="ddr-n">' + nameHtml + '</span></div>';
  }).join("");
  ddEl.classList.add("open");
}
if (ddEl) {
  ddEl.addEventListener("click", function(e){ var r = e.target.closest(".ddr"); if(r){ ddEl.classList.remove("open"); siEl.value = r.getAttribute("data-t"); runAnalysis(r.getAttribute("data-t")); } });
}
document.addEventListener("click", function(e){ if(ddEl && !e.target.closest(".sw")) ddEl.classList.remove("open"); });

// Populated at startup from Yahoo Finance — no hardcoded symbols
var NSE_TICKERS = [];
window._tickerNameCache = {}; // sym → company name, shared across all data sources

async function _loadNSETickers() {
  try {
    // Screener gives symbols + company names in one call
    var scrUrl = "https://query2.finance.yahoo.com/v1/finance/screener/predefined/saved?count=50&scrIds=most_actives_IN";
    var j = await proxyFetch(scrUrl, 6000);
    var quotes = j && j.finance && j.finance.result && j.finance.result[0] && j.finance.result[0].quotes;
    if (Array.isArray(quotes) && quotes.length) {
      NSE_TICKERS = quotes.map(function(q) {
        var sym = String(q.symbol || '').replace(/\.(NS|BO)$/, '');
        var name = q.longName || q.shortName || null;
        if (sym && name) window._tickerNameCache[sym] = name;
        return sym;
      }).filter(function(s) { return /^[A-Z0-9.\-^&]{1,20}$/.test(s); });
      return;
    }
  } catch(e) {}
  // Fallback: trending API (symbols only, no names)
  try {
    var url = "https://query1.finance.yahoo.com/v1/finance/trending/IN?count=50&lang=en-US";
    var j2 = await proxyFetch(url, 5000);
    var q2 = j2 && j2.finance && j2.finance.result && j2.finance.result[0] && j2.finance.result[0].quotes;
    if (Array.isArray(q2) && q2.length) {
      NSE_TICKERS = q2
        .map(function(q) { return String(q.symbol || '').replace(/\.(NS|BO)$/, ''); })
        .filter(function(s) { return /^[A-Z0-9.\-^&]{1,20}$/.test(s); });
    }
  } catch(e2) {}
}

window.ACTIVE_NEWS_POOL = [];

window.viewArticleDetail = function(id) {
  if (!window.ACTIVE_NEWS_POOL || !window.ACTIVE_NEWS_POOL.length) return;
  var target = window.ACTIVE_NEWS_POOL.find(function(a) { return a.id === id; });
  var detailPane = document.getElementById("newsDetailPanel");
  if (!target || !detailPane) return;
  window.ACTIVE_NEWS_POOL.forEach(function(art) {
    var el = document.getElementById("card_" + art.id);
    if (el) { el.classList.remove("news-card-active"); }
  });
  var activeCard = document.getElementById("card_" + id);
  if (activeCard) { activeCard.classList.add("news-card-active"); }
  detailPane.innerHTML = `<div style="display: flex; flex-direction: column; gap: 12px; justify-content: flex-start; height: 100%; text-align: left;"><div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 8px; width: 100%;"><span style="background: rgba(56,189,248,0.12); color: #0284c7; font-size: 10px; font-weight: 800; padding: 2px 8px; border-radius: 4px; border: 1px solid rgba(56,189,248,0.25); text-transform: uppercase;">${escapeHTML(target.source || "FEED")}</span><span style="color: #64748b; font-size: 11px; font-weight: 500;">${escapeHTML(target.time || "Just now")}</span></div><h4 style="font-size: 14.5px; font-weight: 700; line-height: 1.4; margin: 0;">${escapeHTML(target.headline)}</h4><div class="gc" style="padding: 12px; margin-top: 4px;"><span class="gcl" style="font-size: 9.5px; font-weight: 700; text-transform: uppercase; display: block; margin-bottom: 6px; letter-spacing: 0.5px;">Summary</span><p style="font-size: 12.5px; line-height: 1.5; margin: 0; font-weight: 400;">${escapeHTML(target.summary)}</p></div></div>`;
};

async function loadNews(targetTicker) {
  var container = document.getElementById("newsBody");
  if (!container) return;
  container.innerHTML = ldng("Loading latest market news…");
  try {
    var ticker = (typeof targetTicker === "string") ? targetTicker.trim() : "";
    if (!ticker) { var searchBox = document.getElementById("si"); if (searchBox && searchBox.value) ticker = String(searchBox.value).trim(); }
    var queryTag = (ticker && ticker.length > 0) ? ticker.toUpperCase().replace("^", "") : "NSE INDIA";
    var articles = [];
    if (typeof yfNews === "function") { try { articles = await yfNews(queryTag); } catch(apiErr) { console.warn("News API error", apiErr); } }
    window.ACTIVE_NEWS_POOL = Array.isArray(articles) ? articles : [];
    if (!window.ACTIVE_NEWS_POOL.length) {
      container.innerHTML = '<div class="empty-state"><div class="empty-icon">📰</div><div class="empty-title">No news available</div><div class="empty-sub">Try again shortly — feeds may be temporarily unavailable</div></div>';
      return;
    }
    var cards = window.ACTIVE_NEWS_POOL.map(function(article) {
      var link = article.link ? escapeHTML(article.link) : "#";
      return '<a href="' + link + '" class="gc news-card" style="display:flex;flex-direction:column;text-decoration:none;padding:12px 14px;cursor:pointer;">'
        + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;gap:8px;">'
        + '<span style="color:#f59e0b;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;">' + escapeHTML(article.source) + '</span>'
        + '<span style="color:#4b6080;font-size:10px;white-space:nowrap;">' + escapeHTML(article.time) + '</span>'
        + '</div>'
        + '<p style="font-size:12.5px;font-weight:600;line-height:1.45;margin:0 0 6px;color:#d8e8f8;flex:1;">' + escapeHTML(article.headline) + '</p>'
        + (article.summary ? '<p style="font-size:11px;color:#5a7298;margin:0;line-height:1.5;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">' + escapeHTML(article.summary) + '</p>' : '')
        + '</a>';
    }).join("");
    container.innerHTML = '<div class="news-grid">' + cards + '</div>';
  } catch (_) {
    container.innerHTML = '<div style="color:#94a3b8;padding:24px;text-align:center;">News unavailable.</div>';
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
      (url) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
      (url) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`
    ];
    for (var proxy of proxyCircuits) {
      try {
        var managed = await window.RequestManager.request(proxy(targetUrl), {
          timeout: 3500,
          retries: 0,
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
  // Fetch Nifty and Sensex market charts concurrently via Promise.all to avoid sequential network RTT waterfall latency
  var indexResults = await Promise.all([
    fetchMarketChart(niftyUrl),
    fetchMarketChart(sensexUrl)
  ]);
  var niftyData = indexResults[0];
  var sensexData = indexResults[1];
  if (niftyData) { window.LIVE_NIFTY_PRICE = niftyData.price; window.LIVE_NIFTY_CHG = niftyData.changePct; window.LIVE_NIFTY_UP = niftyData.up; }
  if (sensexData) { window.LIVE_SENSEX_PRICE = sensexData.price; window.LIVE_SENSEX_CHG = sensexData.changePct; window.LIVE_SENSEX_UP = sensexData.up; }
  forceRenderIndexUI();
}

window.activeMarketRegion = "india";

window.MARKET_REGION_SYMBOLS = {
  india: [
    { ticker: "NIFTY 50", sym: "^NSEI" },
    { ticker: "SENSEX", sym: "^BSESN" },
    { ticker: "NIFTY BANK", sym: "^NSEBANK" },
    { ticker: "NIFTY IT", sym: "^CNXIT" }
  ],
  us: [
    { ticker: "S&P 500", sym: "^GSPC" },
    { ticker: "Dow Jones", sym: "^DJI" },
    { ticker: "Nasdaq", sym: "^IXIC" },
    { ticker: "Russell 2000", sym: "^RUT" }
  ],
  global: [
    { ticker: "FTSE 100", sym: "^FTSE" },
    { ticker: "DAX", sym: "^GDAXI" },
    { ticker: "Nikkei 225", sym: "^N225" },
    { ticker: "Hang Seng", sym: "^HSI" }
  ],
  crypto: [
    { ticker: "Bitcoin", sym: "BTC-USD" },
    { ticker: "Ethereum", sym: "ETH-USD" },
    { ticker: "Solana", sym: "SOL-USD" },
    { ticker: "XRP", sym: "XRP-USD" }
  ]
};

window.MARKET_SUMMARY_CACHE = {};

async function fetchRegionData(region) {
  var symbols = window.MARKET_REGION_SYMBOLS[region] || window.MARKET_REGION_SYMBOLS.india;
  var quotes = await Promise.all(symbols.map(async function(item) {
    try {
      var q = await yfQuote(item.sym);
      if (q && q.raw) {
        return {
          ticker: item.ticker,
          sym: item.sym,
          price: q.raw,
          change: q.change,
          changePct: q.changePct,
          high: q.high,
          low: q.low,
          up: q.up
        };
      }
    } catch (_) {}
    return null;
  }));

  var valid = quotes.filter(Boolean);
  if (valid.length > 0) {
    window.MARKET_SUMMARY_CACHE[region] = valid;
  }
}

async function forceRenderIndexUI() {
  var currentRegion = window.activeMarketRegion || "india";
  var wrapper = document.getElementById("idxCards");
  if (!wrapper) return;

  var cached = window.MARKET_SUMMARY_CACHE[currentRegion];
  if (!cached) {
    wrapper.innerHTML = '<div class="skel" style="height:96px"></div><div class="skel" style="height:96px"></div><div class="skel" style="height:96px"></div><div class="skel" style="height:96px"></div>';
    await fetchRegionData(currentRegion);
    cached = window.MARKET_SUMMARY_CACHE[currentRegion];
  }

  if (!cached || !cached.length) {
    var netMsg = (typeof isProxyBlocked === "function" && isProxyBlocked())
      ? '🔒 CORS proxies blocked by your network.<br><span style="font-size:11px;color:#475569;">Use a personal hotspot or home Wi-Fi for live data.</span>'
      : '📡 Market data unavailable<br><span style="font-size:11px;color:#475569;">Check your connection or refresh</span>';
    wrapper.innerHTML = '<div style="padding:20px;color:#94a3b8;font-size:12px;grid-column:1/-1;text-align:center;">' + netMsg + '</div>';
    return;
  }

  var currSymbol = currentRegion === "india" ? "₹" : (currentRegion === "us" || currentRegion === "crypto" ? "$" : "");

  function parseRawNum(str) {
    if (typeof str === "number") return str;
    return parseFloat(String(str || "0").replace(/[₹$,]/g, "")) || 0;
  }

  wrapper.innerHTML = cached.map(function(item) {
    var color = item.up ? "#22c55e" : "#ef4444";
    var borderLeft = item.up ? "#22c55e" : "#ef4444";
    var bgBadge = item.up ? "rgba(34,197,94,0.12)" : "rgba(239,68,68,0.12)";
    var borderBadge = item.up ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.3)";
    var arrow = item.up ? "▲" : "▼";

    var formattedPrice = typeof item.price === "number"
      ? item.price.toLocaleString("en-IN", {minimumFractionDigits:2, maximumFractionDigits:2})
      : escapeHTML(String(item.price));

    // Day range progress bar
    var rangeBar = "";
    if (item.high && item.low) {
      var hi = parseRawNum(item.high);
      var lo = parseRawNum(item.low);
      var cur = typeof item.price === "number" ? item.price : parseRawNum(item.price);
      var pct = (hi > lo) ? Math.max(0, Math.min(100, ((cur - lo) / (hi - lo)) * 100)) : 50;
      rangeBar = '<div style="margin-top:8px;">'
        + '<div style="display:flex;justify-content:space-between;font-size:9px;color:#475569;margin-bottom:3px;letter-spacing:0.2px;">'
        + '<span>L ' + escapeHTML(String(item.low).replace("₹","").replace("$","")) + '</span>'
        + '<span>H ' + escapeHTML(String(item.high).replace("₹","").replace("$","")) + '</span>'
        + '</div>'
        + '<div style="height:3px;background:#1c2a45;border-radius:2px;position:relative;">'
        + '<div style="position:absolute;left:0;top:0;height:100%;width:' + pct.toFixed(1) + '%;background:' + color + ';border-radius:2px;transition:width 0.5s;"></div>'
        + '<div style="position:absolute;top:-2px;width:7px;height:7px;border-radius:50%;background:' + color + ';left:calc(' + pct.toFixed(1) + '% - 3.5px);border:1.5px solid #07090f;"></div>'
        + '</div>'
        + '</div>';
    }

    return '<div class="idx-card" onclick="runAnalysis(\'' + escapeHTML(item.sym) + '\')" style="border-left:3px solid ' + borderLeft + ';">'
      + '<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:5px;">'
      + '<div style="font-size:10px;font-weight:700;text-transform:uppercase;color:#94a3b8;letter-spacing:0.6px;">' + escapeHTML(item.ticker) + '</div>'
      + '<span style="font-size:10px;font-weight:700;color:' + color + ';background:' + bgBadge + ';border:1px solid ' + borderBadge + ';padding:2px 7px;border-radius:20px;white-space:nowrap;">' + arrow + ' ' + escapeHTML(item.changePct) + '</span>'
      + '</div>'
      + '<div style="font-size:19px;font-weight:800;color:#f1f5f9;letter-spacing:-0.5px;">' + currSymbol + formattedPrice + '</div>'
      + (item.change ? '<div style="font-size:11px;color:' + color + ';margin-top:2px;font-weight:600;">' + escapeHTML(item.change) + (currentRegion === "india" ? " pts" : "") + '</div>' : '')
      + rangeBar
      + '</div>';
  }).join("");
}

function initMarketChips() {
  var chipContainer = document.getElementById("marketChips");
  if (!chipContainer) return;
  chipContainer.addEventListener("click", function(e) {
    var chip = e.target.closest(".mchip");
    if (!chip) return;
    var region = chip.getAttribute("data-region");
    if (!region) return;
    chipContainer.querySelectorAll(".mchip").forEach(c => c.classList.remove("active"));
    chip.classList.add("active");
    window.activeMarketRegion = region;
    forceRenderIndexUI();
  });
}

async function loadSectorIndices() {
  var container = document.getElementById("trendBody");
  if (!container) return;
  if (typeof isProxyBlocked === "function" && isProxyBlocked()) {
    container.innerHTML = '<div style="color:#64748b;font-size:12px;padding:8px;text-align:center;">🔒 Live data blocked by network</div>';
    return;
  }

  var sectorSymbols = [
    { sym: "^NSEBANK", name: "NIFTY BANK" },
    { sym: "^CNXIT", name: "NIFTY IT" },
    { sym: "^CNXAUTO", name: "NIFTY AUTO" },
    { sym: "^CNXPHARMA", name: "NIFTY PHARMA" }
  ];

  try {
    var quotes = await Promise.all(sectorSymbols.map(function(s) {
      return yfQuote(s.sym).then(function(q) {
        if (q) {
          q.customName = s.name;
          q.customSym = s.sym;
          return q;
        }
        return null;
      });
    }));

    var valid = quotes.filter(function(q) { return q !== null && q.raw > 0; });

    if (!valid.length) {
      container.innerHTML = sectorSymbols.map(function(s) {
        return '<div style="display:flex;align-items:center;justify-content:space-between;padding:9px 10px;margin-bottom:6px;border-radius:8px;background:#0f1525;border:1px solid #1c2a45;">'
          + '<div><div style="font-size:12px;font-weight:700;color:#e2e8f4;">' + escapeHTML(s.name) + '</div><div style="font-size:10px;color:#64748b;">Syncing…</div></div>'
          + '<div style="font-size:12px;font-weight:700;color:#475569;">—</div>'
          + '</div>';
      }).join("");
      return;
    }

    container.innerHTML = valid.map(function(q) {
      var dispName = q.customName || q.name || q.ticker;
      var cColor = q.up ? "#22c55e" : "#ef4444";
      var arrow = q.up ? "▲" : "▼";
      var bg = q.up ? "rgba(34,197,94,0.04)" : "rgba(239,68,68,0.04)";
      var bdr = q.up ? "rgba(34,197,94,0.16)" : "rgba(239,68,68,0.16)";
      return '<div onclick="runAnalysis(\'' + escapeHTML(q.customSym || q.ticker || dispName) + '\')" class="mover-row" style="background:' + bg + ';border-color:' + bdr + ';">'
        + '<div><div style="font-size:12px;font-weight:700;color:#e2e8f4;">' + escapeHTML(dispName) + '</div><div style="font-size:10px;color:#64748b;margin-top:1px;">' + escapeHTML(q.price) + '</div></div>'
        + '<div style="text-align:right;"><div style="font-size:13px;font-weight:800;color:' + cColor + ';">' + arrow + ' ' + escapeHTML(q.changePct) + '</div></div>'
        + '</div>';
    }).join("");
  } catch(e) {
    container.innerHTML = '<div style="color:#64748b;font-size:12px;padding:8px;text-align:center;">Sector data unavailable</div>';
  }
}

async function runAnalysis(ticker){
  ticker = ticker.toUpperCase().trim();
  try {
    if (window.NCUserTools && typeof window.NCUserTools.addRecent === "function") {
      window.NCUserTools.addRecent(ticker);
      loadRecentStocks();
    }
  } catch (integrationError) {
    console.warn("Recent-search integration skipped:", integrationError);
  }
  if(siEl) siEl.value = ticker;
  window.activeTickerNode = ticker;
  switchTab("analysis");
  var body = document.getElementById("aBody");
  var analysisTtl = (typeof isIndianMarketOpen === "function" && isIndianMarketOpen()) ? window.TTL.s : window.TTL.m;
  if(window.CACHE.analysis[ticker] && fresh(window.CACHE.analysis[ticker].ts, analysisTtl)) { renderAnalysis(window.CACHE.analysis[ticker].d); return; }
  if (body) body.innerHTML = ldng("Analyzing " + ticker + "...");
  var pData = await yfQuote(ticker);
  if (!pData) {
    var netHint = (typeof isProxyBlocked === "function" && isProxyBlocked())
      ? '<div style="font-size:12px;color:#64748b;margin-top:10px;">🔒 CORS proxies are blocked on this network.<br>Connect via mobile hotspot or home Wi-Fi to load live data.</div>'
      : '<div style="font-size:12px;color:#64748b;margin-top:10px;">Yahoo Finance returned no data for this ticker.<br>The symbol may be delisted, incorrect, or temporarily unavailable.</div>';
    if (body) body.innerHTML = '<div class="errbox">'
      + '⚠️ Could not load data for <strong>' + escapeHTML(ticker) + '</strong>'
      + netHint
      + '<div style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap;">'
      + '<button onclick="window.CACHE.prices[' + JSON.stringify(ticker) + ']=null; if(window.RequestManager)window.RequestManager.clearCache(); runAnalysis(' + JSON.stringify(ticker) + ')" style="background:#1c2a45;border:1px solid #2a3a5a;color:#e2e8f4;padding:6px 14px;border-radius:7px;font-size:12px;cursor:pointer;">↻ Retry</button>'
      + '<button onclick="switchTab(\'home\')" style="background:transparent;border:1px solid #334155;color:#64748b;padding:6px 14px;border-radius:7px;font-size:12px;cursor:pointer;">← Back</button>'
      + '</div>'
      + '</div>';
    return;
  }
  var closes = pData.closes;
  var volumes = pData.volumes;
  var [news, fundamentals, financials] = await Promise.all([yfNews(ticker), yfFundamentals(ticker), (typeof yfFinancials === "function" ? yfFinancials(ticker) : Promise.resolve(null))]);
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
  var calculatedHealth = scoreDetails.score; // null when insufficient history
  var healthVerdict = calculatedHealth === null ? "Insufficient Data" : calculatedHealth > 75 ? "Strong Buy" : calculatedHealth > 50 ? "Buy" : calculatedHealth > 35 ? "Hold" : "Sell";
  var healthColor = calculatedHealth === null ? "#64748b" : calculatedHealth > 75 ? "#22c55e" : calculatedHealth > 50 ? "#00b06a" : calculatedHealth > 35 ? "#f59e0b" : "#ef4444";
  var safeTicker = (typeof sanitizeAIPrompt === 'function') ? sanitizeAIPrompt(ticker) : ticker.replace(/[^A-Z0-9.\-^]/g, '');
  var prompt = "Evaluate " + safeTicker + " NSE stock. Return JSON: {\"trend\":\"Bullish/Bearish/Neutral\",\"confidence\":75,\"summary\":\"brief analysis\"}";
  // Cap the AI wait at 6s so the analysis renders fast even if the AI service is slow
  var aiTxt = await Promise.race([
    freeAI(prompt),
    new Promise(function(res){ setTimeout(function(){ res(""); }, 6000); })
  ]);
  var aiRaw = pj(aiTxt);
  var ai = (typeof validateAIResponse === 'function' && aiRaw) ? (validateAIResponse(aiRaw) || {}) : (aiRaw || {});

  var realEps = fundamentals.rawEps || null;
  var grahamVal = (realEps && realEps > 0 && window.NCUserTools) ? window.NCUserTools.calculateGrahamValue(realEps, 8.5) : null;
  var marginOfSafety = (grahamVal && window.NCUserTools) ? window.NCUserTools.calculateMarginOfSafety(pData.raw, grahamVal) : null;

  var d = {
    ticker: ticker,
    isIndex: ticker.indexOf("^") === 0,
    company: escapeHTML(pData.name),
    price: pData.price,
    change: pData.change,
    changePct: pData.changePct,
    up: pData.up,
    mktCap: fundamentals.marketCap || pData.mktCap,
    volume: pData.volume,
    rawVolume: pData.rawVolume,
    high: pData.high,
    low: pData.low,
    rawHigh: pData.rawHigh,
    rawLow: pData.rawLow,
    rawPrice: pData.raw,
    open: pData.open,
    prevClose: pData.prevClose,
    week52High: pData.week52High,
    week52Low: pData.week52Low,
    rawWeek52High: pData.rawWeek52High,
    rawWeek52Low: pData.rawWeek52Low,
    closes: closes,
    volumes: volumes,
    highs: pData.highs,
    lows: pData.lows,
    opens: pData.opens,
    times: pData.times,
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
    grahamVal: grahamVal !== null ? "₹" + grahamVal.toFixed(2) : "—",
    marginOfSafety: marginOfSafety !== null ? (marginOfSafety >= 0 ? "+" : "") + marginOfSafety.toFixed(1) + "%" : "—",
    pe: fundamentals.pe || null,
    forwardPE: fundamentals.forwardPE || null,
    pb: fundamentals.pb || null,
    eps: fundamentals.eps || null,
    divYield: fundamentals.divYield || null,
    avgVol3M: fundamentals.avgVol3M || null,
    beta: fundamentals.beta || null,
    promoterPct: financials && financials.promoterPct || null,
    instPct: financials && financials.instPct || null,
    retailPct: financials && financials.retailPct || null,
    quarters: financials && financials.quarters || [],
    news: news.slice(0, 4),
    healthScore: calculatedHealth,
    healthVerdict: healthVerdict,
    healthColor: healthColor,
    trend: ai.trend || healthVerdict,
    confidence: ai.confidence || null,
    tradeDirection: ai.tradeDirection || (calculatedHealth !== null ? (calculatedHealth > 50 ? "BUY" : "WAIT") : "WAIT"),
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
  var chartHTML = drawCandlestickChart(d.opens, d.highs, d.lows, d.closes, d.volumes, d.up, d.times);
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
      <div style="margin-top:12px;background:linear-gradient(135deg,#0a1020,#111827);padding:14px 16px;border-radius:12px;border:1px solid #1c2a45;display:flex;justify-content:space-between;align-items:center;gap:16px;">
        <div>
          <div style="font-size:10px;color:#64748b;font-weight:700;letter-spacing:0.8px;text-transform:uppercase;margin-bottom:4px;">Technical Score</div>
          <div style="font-size:22px;font-weight:900;color:${d.healthColor};line-height:1;">${d.healthScore !== null ? d.healthScore : "—"}<span style="font-size:13px;font-weight:600;opacity:0.8;">${d.healthScore !== null ? "%" : ""}</span></div>
          <div style="font-size:11px;font-weight:700;color:${d.healthColor};opacity:0.9;margin-top:2px;">${d.healthVerdict}</div>
        </div>
        <div style="flex:1;max-width:180px;">
          <div style="height:8px;background:#1c2a45;border-radius:4px;overflow:hidden;margin-bottom:6px;">
            <div style="height:100%;width:${d.healthScore !== null ? d.healthScore : 0}%;background:linear-gradient(90deg,${d.healthColor}99,${d.healthColor});border-radius:4px;transition:width 0.8s ease;"></div>
          </div>
          <div style="display:flex;justify-content:space-between;font-size:9px;color:#475569;font-weight:600;">
            <span>SELL</span><span>HOLD</span><span>BUY</span>
          </div>
        </div>
      </div>
    </div>
    ${chartHTML}
    <div class="sec" style="padding:14px 16px;background:#0b0f19;border:1px solid #1e293b;border-radius:12px;margin-bottom:12px;">
      <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;color:#64748b;margin-bottom:12px;">Stock Overview</div>
      <div class="g4" style="margin-bottom:10px;">
        <div class="gc"><div class="gcl">Open</div><div class="gcv">${d.open || "—"}</div></div>
        <div class="gc"><div class="gcl">Prev Close</div><div class="gcv">${d.prevClose || "—"}</div></div>
        <div class="gc"><div class="gcl">Day High</div><div class="gcv" style="color:#22c55e">${d.high || "—"}</div></div>
        <div class="gc"><div class="gcl">Day Low</div><div class="gcv" style="color:#ef4444">${d.low || "—"}</div></div>
      </div>
      <div class="g4" style="margin-bottom:${d.isIndex ? "12" : "10"}px;">
        <div class="gc"><div class="gcl">Volume</div><div class="gcv">${d.volume || (d.isIndex ? "N/A" : "—")}</div></div>
        <div class="gc"><div class="gcl">Avg Vol (3M)</div><div class="gcv">${d.avgVol3M || (d.isIndex ? "N/A" : "—")}</div></div>
        <div class="gc"><div class="gcl">Market Cap</div><div class="gcv" style="color:#38bdf8">${d.mktCap || (d.isIndex ? "N/A" : "—")}</div></div>
        <div class="gc"><div class="gcl">Beta</div><div class="gcv" style="color:#a78bfa">${d.beta || (d.isIndex ? "N/A" : "—")}</div></div>
      </div>
      ${d.isIndex ? "" : `
      <div class="g4" style="margin-bottom:12px;">
        <div class="gc"><div class="gcl">P/E (TTM)</div><div class="gcv" style="color:#f59e0b">${d.pe ? d.pe + "x" : "—"}</div></div>
        <div class="gc"><div class="gcl">P/B</div><div class="gcv" style="color:#f59e0b">${d.pb ? d.pb + "x" : "—"}</div></div>
        <div class="gc"><div class="gcl">EPS (TTM)</div><div class="gcv" style="color:#38bdf8">${d.eps || "—"}</div></div>
        <div class="gc"><div class="gcl">Div Yield</div><div class="gcv" style="color:#22c55e">${d.divYield || "—"}</div></div>
      </div>`}
      ${(function(){
        var hi = d.rawHigh || 0, lo = d.rawLow || 0, cur = d.rawPrice || 0;
        var dayRangeBar = (hi > lo) ? (function(){
          var pct = Math.max(0,Math.min(100,((cur-lo)/(hi-lo))*100));
          var bc = d.up ? "#22c55e" : "#ef4444";
          return '<div style="font-size:10px;color:#64748b;font-weight:600;margin-bottom:5px;text-transform:uppercase;letter-spacing:0.5px;">Day Range</div>'
            + '<div style="display:flex;justify-content:space-between;font-size:10px;color:#475569;margin-bottom:4px;"><span>' + d.low + '</span><span>' + d.high + '</span></div>'
            + '<div style="height:4px;background:#1c2a45;border-radius:2px;position:relative;margin-bottom:6px;">'
            + '<div style="position:absolute;left:0;top:0;height:100%;width:'+pct.toFixed(1)+'%;background:'+bc+';border-radius:2px;"></div>'
            + '<div style="position:absolute;top:-4px;width:12px;height:12px;border-radius:50%;background:'+bc+';left:calc('+pct.toFixed(1)+'% - 6px);border:2px solid #0b0f19;box-shadow:0 0 4px '+bc+'60;"></div>'
            + '</div>';
        })() : "";
        var wkHi = d.rawWeek52High, wkLo = d.rawWeek52Low;
        var weekRangeBar = (wkHi && wkLo && wkHi > wkLo) ? (function(){
          var pct = Math.max(0,Math.min(100,((cur-wkLo)/(wkHi-wkLo))*100));
          return '<div style="font-size:10px;color:#64748b;font-weight:600;margin-bottom:5px;text-transform:uppercase;letter-spacing:0.5px;">52-Week Range</div>'
            + '<div style="display:flex;justify-content:space-between;font-size:10px;color:#475569;margin-bottom:4px;"><span>' + d.week52Low + '</span><span>' + d.week52High + '</span></div>'
            + '<div style="height:4px;background:#1c2a45;border-radius:2px;position:relative;margin-bottom:10px;">'
            + '<div style="position:absolute;left:0;top:0;height:100%;width:'+pct.toFixed(1)+'%;background:linear-gradient(90deg,#3b82f6,#f59e0b);border-radius:2px;"></div>'
            + '<div style="position:absolute;top:-4px;width:12px;height:12px;border-radius:50%;background:#f59e0b;left:calc('+pct.toFixed(1)+'% - 6px);border:2px solid #0b0f19;box-shadow:0 0 6px #f59e0b80;"></div>'
            + '</div>';
        })() : "";
        var cmpLine = '<div style="font-size:10px;color:#64748b;text-align:center;">'
          + 'CMP <strong style="color:#f1f5f9;">' + d.price + '</strong> · Change <strong style="color:' + pc + ';">' + d.change + ' (' + d.changePct + ')</strong>'
          + '</div>';
        return dayRangeBar + weekRangeBar + cmpLine;
      })()}
    </div>
    <div class="g4">
      <div class="gc"><div class="gcl">Support</div><div class="gcv" style="color:#22c55e">${d.support}</div></div>
      <div class="gc"><div class="gcl">Resistance</div><div class="gcv" style="color:#ef4444">${d.resistance}</div></div>
      <div class="gc"><div class="gcl">RSI (14)</div><div class="gcv" style="color:#f59e0b">${d.rsi}</div></div>
      <div class="gc"><div class="gcl">MACD</div><div class="gcv" style="color:#3b82f6">${(d.macd === null || d.macd === undefined) ? "—" : d.macd}</div></div>
    </div>
    ${d.grahamVal !== "—" ? `
    <div class="sec">
      <div class="stitle" style="margin-bottom:12px;">Benjamin Graham Valuation</div>
      <div class="g2">
        <div class="gc">
          <div class="gcl">Graham Fair Value</div>
          <div class="gcv" style="color:#38bdf8">${d.grahamVal}</div>
          <div class="gcs">EPS × (8.5 + 2g), g=8.5%</div>
        </div>
        <div class="gc">
          <div class="gcl">Margin of Safety</div>
          <div class="gcv" style="color:${d.marginOfSafety.startsWith('+') ? '#22c55e' : '#ef4444'}">${d.marginOfSafety}</div>
          <div class="gcs">${d.marginOfSafety.startsWith('+') ? 'Trading below fair value' : 'Trading above fair value'}</div>
        </div>
      </div>
      <div style="font-size:10px;color:#475569;margin-top:2px;">EPS from Yahoo Finance (TTM). Formula: V = EPS × (8.5 + 2g) × 4.4 / Y. Growth rate g = 8.5% assumed. AAA bond yield Y = 7.2% (static benchmark — actual rate may differ). Results are indicative only.</div>
    </div>` : ''}
    ${(function(){
      var pros = [], cons = [];
      var pe = d.pe ? parseFloat(d.pe) : null;
      var rawEps = d.eps ? parseFloat(String(d.eps).replace(/[₹,]/g,'')) : null;
      var beta = d.beta ? parseFloat(d.beta) : null;
      var divY = d.divYield ? parseFloat(d.divYield) : null;
      var sc = d.healthScore;
      var rsiVal = d.rsi;
      var mos = d.marginOfSafety && d.marginOfSafety !== '—' ? parseFloat(d.marginOfSafety) : null;
      if (pe !== null && pe > 0 && pe < 15) pros.push('Low P/E of ' + pe.toFixed(1) + 'x — stock may be undervalued vs peers');
      if (pe !== null && pe > 40) cons.push('High P/E of ' + pe.toFixed(1) + 'x — market pricing in strong future growth');
      if (rawEps !== null && rawEps > 0) pros.push('Positive EPS of ' + d.eps + ' (TTM) — company is profitable');
      if (rawEps !== null && rawEps < 0) cons.push('Negative EPS — company reported a loss in the last 12 months');
      if (beta !== null && beta < 1) pros.push('Low beta (' + beta.toFixed(2) + ') — less volatile than the broader market');
      if (beta !== null && beta > 1.5) cons.push('High beta (' + beta.toFixed(2) + ') — significantly more volatile than the market');
      if (divY !== null && divY > 3) pros.push('Strong dividend yield of ' + divY.toFixed(2) + '% — regular income for investors');
      if (divY !== null && divY < 0.5 && rawEps !== null && rawEps > 0) cons.push('Low dividend yield (' + (divY || 0).toFixed(2) + '%) — most profits retained, not distributed');
      if (sc !== null && sc > 70) pros.push('Technical score ' + sc + '/100 — strong momentum and bullish signals');
      if (sc !== null && sc < 30) cons.push('Technical score ' + sc + '/100 — weak momentum and bearish signals');
      if (rsiVal !== null && rsiVal < 35) pros.push('RSI at ' + rsiVal.toFixed(0) + ' — oversold zone, potential reversal buying opportunity');
      if (rsiVal !== null && rsiVal > 70) cons.push('RSI at ' + rsiVal.toFixed(0) + ' — overbought zone, short-term pullback risk');
      if (d.ema200 !== null && d.rawPrice) { if (d.rawPrice > d.ema200) pros.push('Price above 200 EMA — long-term uptrend intact'); else cons.push('Price below 200 EMA — stock in long-term downtrend'); }
      if (mos !== null && mos > 20) pros.push('Margin of safety +' + mos.toFixed(1) + '% — trading well below Graham fair value');
      if (mos !== null && mos < -20) cons.push('Margin of safety ' + mos.toFixed(1) + '% — trading significantly above Graham fair value');
      if (!pros.length && !cons.length) return '';
      var rowPro = pros.map(function(p){ return '<div style="display:flex;gap:8px;padding:6px 0;border-bottom:1px solid #1e293b;"><span style="color:#22c55e;font-size:13px;flex-shrink:0;">✓</span><span style="font-size:12px;color:#9cb8d8;line-height:1.5;">' + escapeHTML(p) + '</span></div>'; }).join('');
      var rowCon = cons.map(function(c){ return '<div style="display:flex;gap:8px;padding:6px 0;border-bottom:1px solid #1e293b;"><span style="color:#ef4444;font-size:13px;flex-shrink:0;">✕</span><span style="font-size:12px;color:#9cb8d8;line-height:1.5;">' + escapeHTML(c) + '</span></div>'; }).join('');
      return '<div class="sec"><div class="stitle" style="margin-bottom:12px;">Pros & Cons</div>'
        + (pros.length ? '<div style="margin-bottom:10px;"><div style="font-size:10px;font-weight:700;color:#22c55e;text-transform:uppercase;letter-spacing:0.6px;margin-bottom:6px;">Strengths</div>' + rowPro + '</div>' : '')
        + (cons.length ? '<div><div style="font-size:10px;font-weight:700;color:#ef4444;text-transform:uppercase;letter-spacing:0.6px;margin-bottom:6px;">Concerns</div>' + rowCon + '</div>' : '')
        + '<div style="font-size:10px;color:#475569;margin-top:8px;">Auto-generated from available fundamentals and technical data. Not investment advice.</div></div>';
    })()}
    ${(function(){
      if (!d.promoterPct && !d.instPct) return '';
      function bar(pct, color, label) {
        var w = Math.min(100, Math.max(0, parseFloat(pct || 0)));
        return '<div style="margin-bottom:10px;">'
          + '<div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:4px;"><span style="color:#8fafd4;font-weight:600;">' + escapeHTML(label) + '</span><span style="color:#eef3fc;font-weight:800;">' + pct + '%</span></div>'
          + '<div style="height:6px;background:#1c2a45;border-radius:3px;overflow:hidden;"><div style="height:100%;width:' + w + '%;background:' + color + ';border-radius:3px;transition:width 0.6s;"></div></div>'
          + '</div>';
      }
      return '<div class="sec"><div class="stitle" style="margin-bottom:14px;">Shareholding Pattern</div>'
        + (d.promoterPct ? bar(d.promoterPct, 'linear-gradient(90deg,#f59e0b,#fbbf24)', 'Promoter / Insider') : '')
        + (d.instPct ? bar(d.instPct, 'linear-gradient(90deg,#3b82f6,#60a5fa)', 'FII / Institutions') : '')
        + (d.retailPct ? bar(d.retailPct, 'linear-gradient(90deg,#22c55e,#4ade80)', 'Retail / Public') : '')
        + '<div style="font-size:10px;color:#475569;margin-top:4px;">Source: Yahoo Finance. Data may be delayed by one quarter.</div></div>';
    })()}
    ${(function(){
      if (!d.quarters || !d.quarters.length) return '';
      var rows = d.quarters.map(function(q) {
        var profColor = q.profitRaw != null ? (q.profitRaw >= 0 ? '#22c55e' : '#ef4444') : '#94a3b8';
        return '<tr>'
          + '<td style="padding:8px 10px;font-size:11px;color:#6b7fa8;white-space:nowrap;">' + escapeHTML(q.date) + '</td>'
          + '<td style="padding:8px 10px;font-size:11px;color:#d8e8f8;text-align:right;">' + escapeHTML(q.revenue) + '</td>'
          + '<td style="padding:8px 10px;font-size:11px;font-weight:700;text-align:right;color:' + profColor + ';">' + escapeHTML(q.profit) + '</td>'
          + '<td style="padding:8px 10px;font-size:11px;text-align:right;color:#f59e0b;">' + escapeHTML(q.eps) + '</td>'
          + '</tr>';
      }).join('');
      return '<div class="sec"><div class="stitle" style="margin-bottom:12px;">Quarterly Results</div>'
        + '<div style="overflow-x:auto;"><table style="width:100%;border-collapse:collapse;">'
        + '<thead><tr style="border-bottom:1px solid #1e293b;">'
        + '<th style="padding:6px 10px;font-size:10px;font-weight:700;color:#475569;text-align:left;text-transform:uppercase;letter-spacing:0.5px;">Quarter</th>'
        + '<th style="padding:6px 10px;font-size:10px;font-weight:700;color:#475569;text-align:right;text-transform:uppercase;letter-spacing:0.5px;">Revenue</th>'
        + '<th style="padding:6px 10px;font-size:10px;font-weight:700;color:#475569;text-align:right;text-transform:uppercase;letter-spacing:0.5px;">Net Profit</th>'
        + '<th style="padding:6px 10px;font-size:10px;font-weight:700;color:#475569;text-align:right;text-transform:uppercase;letter-spacing:0.5px;">EPS</th>'
        + '</tr></thead><tbody>' + rows + '</tbody></table></div>'
        + '<div style="font-size:10px;color:#475569;margin-top:8px;">Figures in Indian Rupees (Crores). Source: Yahoo Finance.</div></div>';
    })()}
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
        <div style="font-size:11px;color:#94a3b8;">Confidence: <strong>${d.confidence !== null ? d.confidence + "%" : "—"}</strong></div>
      </div>
      <div class="asum">${escapeHTML(d.summary)}</div>
    </div>
    <div class="sec tsg-card">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px;">
        <div>
          <div class="stitle" style="display:flex;align-items:center;gap:8px;">Trade Setup Generator <span style="font-size:9.5px;font-weight:700;background:rgba(59,130,246,0.15);color:#60a5fa;border:1px solid rgba(59,130,246,0.3);padding:2px 8px;border-radius:4px;">UNIQUE</span></div>
          <div style="font-size:11px;color:#64748b;margin-top:3px;">Algorithmic levels · AI narrative · Built-in position sizer</div>
        </div>
        <button id="btnTradeSetup" onclick="runTradeSetup('${d.ticker}')" class="tsg-btn">Generate Plan</button>
      </div>
      <div id="tradeSetupBody"></div>
    </div>
    ${nHTML ? `<div class="sec"><div class="stitle">News</div>${nHTML}</div>` : ''}
  `;
}

// ═══════════════════════════════════════
// TRADE SETUP GENERATOR
// ═══════════════════════════════════════

function computeTradeSetup(d) {
  var price = d.rawPrice;
  if (!price || price <= 0) return { direction: "WAIT", setupType: "Insufficient Data", narrative: "Run a fresh analysis to generate trade levels." };
  var atr = d.atr;
  if (!atr) return { direction: "WAIT", setupType: "Insufficient Data", narrative: "ATR could not be computed — not enough price history. Trade levels require real volatility data." };
  var supRaw = (d.support && d.support !== "—") ? parseFloat(d.support.replace(/[₹,]/g, "")) : null;
  var resRaw = (d.resistance && d.resistance !== "—") ? parseFloat(d.resistance.replace(/[₹,]/g, "")) : null;
  var rsi = d.rsi;
  var score = d.healthScore;
  if (score === null) return { direction: "WAIT", setupType: "Insufficient Indicators", narrative: "Not enough historical data to compute a technical score. Trade levels cannot be generated." };
  var macdHist = d.macdDetails ? d.macdDetails.histogram : null;
  var ema20Above50 = d.ema20 && d.ema50 && d.ema20 > d.ema50;
  var aboveVWAP = d.vwap && price > d.vwap;

  var direction, setupType, entry, stopLoss, target1, target2, entryNote;

  if (score < 30) {
    return { direction: "AVOID", setupType: "Bearish — Stay Out", score, narrative: "Technical score is critically weak. Avoid fresh longs. Look for a reversal signal before re-entering." };
  }
  if (rsi !== null && rsi > 72 && score < 65) {
    return { direction: "WAIT", setupType: "Overbought — Wait for Pullback", score, narrative: "RSI is overbought. Wait for RSI to cool below 60 and price to pull back to EMA 20 before entering for better risk:reward." };
  }
  if (rsi !== null && rsi < 38 && (supRaw === null || price <= supRaw * 1.04)) {
    direction = "BUY"; setupType = "Oversold Reversal";
    entry = price;
    stopLoss = supRaw ? Math.min(supRaw - atr * 0.3, price - atr * 1.2) : price - atr * 1.5;
    target1 = price + atr * 2;
    target2 = resRaw || price + atr * 3.5;
    entryNote = "RSI deeply oversold — mean reversion setup with defined stop below support";
  } else if (resRaw && price >= resRaw * 0.995 && score > 65 && macdHist > 0) {
    direction = "BUY"; setupType = "Breakout Play";
    entry = resRaw * 1.006;
    stopLoss = price - atr * 1.2;
    target1 = resRaw + atr * 2;
    target2 = resRaw + atr * 3.5;
    entryNote = "Buy confirmed breakout above ₹" + resRaw.toFixed(0) + " — enter on retest or momentum candle";
  } else if (ema20Above50 && macdHist > 0 && score > 62 && aboveVWAP) {
    direction = "BUY"; setupType = "Momentum Continuation";
    entry = price;
    stopLoss = Math.max(d.ema20 - atr * 0.3, price - atr * 1.5);
    target1 = price + atr * 1.8;
    target2 = resRaw || price + atr * 3;
    entryNote = "All momentum signals aligned — EMA, MACD, VWAP all bullish";
  } else if (supRaw && price <= supRaw * 1.03 && score > 45) {
    direction = "BUY"; setupType = "Support Bounce";
    entry = price;
    stopLoss = supRaw - atr * 0.5;
    target1 = price + atr * 1.5;
    target2 = resRaw || price + atr * 2.5;
    entryNote = "Price testing strong support zone — bounce trade with tight stop";
  } else if (score > 55) {
    direction = "BUY"; setupType = "Trend Following";
    entry = price;
    stopLoss = supRaw || (price - atr * 1.5);
    target1 = price + atr * 1.5;
    target2 = resRaw || (price + atr * 2.5);
    entryNote = "Trend intact — ride with stop below recent support";
  } else {
    return { direction: "WAIT", setupType: "Mixed Signals — No Clear Edge", score, narrative: "Indicators are conflicting. RSI, MACD or EMA alignment not strong enough. Wait for a clear signal before entering." };
  }

  stopLoss = Math.max(0.01, stopLoss);
  var slDist = Math.abs(entry - stopLoss);
  var t1Dist = Math.abs(target1 - entry);
  var rr = slDist > 0 ? (t1Dist / slDist) : 0;
  return { direction, setupType, entry, stopLoss, target1, target2, rr: rr.toFixed(2), slDist, score, atr, entryNote, narrative: "" };
}

async function runTradeSetup(ticker) {
  var d = window.CURRENT_ACTIVE_ANALYSIS_DATA;
  if (!d || d.ticker !== ticker) {
    var b = document.getElementById("tradeSetupBody");
    if (b) b.innerHTML = '<div class="errbox">Run analysis first.</div>';
    return;
  }
  var btn = document.getElementById("btnTradeSetup");
  var body = document.getElementById("tradeSetupBody");
  if (btn) { btn.disabled = true; btn.textContent = "⏳ Generating..."; }
  if (body) body.innerHTML = ldng("Building trade plan...");

  var setup = computeTradeSetup(d);

  if (setup.direction !== "AVOID" && setup.direction !== "WAIT" && !setup.narrative) {
    var safeTk = (typeof sanitizeAIPrompt === 'function') ? sanitizeAIPrompt(ticker) : ticker.replace(/[^A-Z0-9.\-^]/g, '');
    var aiPrompt = "Write a sharp 2-sentence trade rationale for " + safeTk + " NSE. Setup: " + setup.setupType + ". Entry ₹" + setup.entry.toFixed(2) + ", SL ₹" + setup.stopLoss.toFixed(2) + ", T1 ₹" + setup.target1.toFixed(2) + ". RSI " + (d.rsi || "—") + ", Score " + d.healthScore + "%, Trend " + d.trend + ". Be specific, no generic disclaimers.";
    setup.narrative = await freeAI(aiPrompt) || "";
  }

  renderTradeSetup(setup);
  if (btn) { btn.disabled = false; btn.innerHTML = "↻ Regenerate"; }
}

function positionSizeSummary(shares, posValue, maxLoss, maxGainT1) {
  return '<div style="text-align:center;padding:10px 4px;"><div style="font-size:10px;color:#64748b;margin-bottom:4px;text-transform:uppercase;letter-spacing:0.5px;">Shares</div><div style="font-size:22px;font-weight:900;color:#f1f5f9;font-family:monospace;">' + shares + '</div></div>'
    + '<div style="text-align:center;padding:10px 4px;"><div style="font-size:10px;color:#64748b;margin-bottom:4px;text-transform:uppercase;letter-spacing:0.5px;">Position Value</div><div style="font-size:15px;font-weight:800;color:#38bdf8;">₹' + Math.round(posValue).toLocaleString("en-IN") + '</div></div>'
    + '<div style="text-align:center;padding:10px 4px;"><div style="font-size:10px;color:#64748b;margin-bottom:4px;text-transform:uppercase;letter-spacing:0.5px;">Max Loss</div><div style="font-size:15px;font-weight:800;color:#ef4444;">−₹' + Math.round(maxLoss).toLocaleString("en-IN") + '</div></div>'
    + '<div style="text-align:center;padding:10px 4px;"><div style="font-size:10px;color:#64748b;margin-bottom:4px;text-transform:uppercase;letter-spacing:0.5px;">Max Gain (T1)</div><div style="font-size:15px;font-weight:800;color:#22c55e;">+₹' + Math.round(maxGainT1).toLocaleString("en-IN") + '</div></div>';
}

window._activeTradeSetup = null;

window.recalcPositionSize = function(capitalVal, riskVal) {
  var setup = window._activeTradeSetup;
  if (!setup) return;
  var capital = parseFloat(capitalVal) || 100000;
  var riskPct = parseFloat(riskVal) || 2;
  var riskAmt = capital * riskPct / 100;
  var shares = setup.slDist > 0 ? Math.floor(riskAmt / setup.slDist) : 0;
  var posValue = shares * setup.entry;
  var maxLoss = shares * setup.slDist;
  var maxGainT1 = shares * Math.abs(setup.target1 - setup.entry);
  var el = document.getElementById("psSummary");
  if (el) el.innerHTML = positionSizeSummary(shares, posValue, maxLoss, maxGainT1);
};

function renderTradeSetup(setup) {
  var body = document.getElementById("tradeSetupBody");
  if (!body) return;

  if (setup.direction === "AVOID" || setup.direction === "WAIT") {
    var avoidColor = setup.direction === "AVOID" ? "#ef4444" : "#f59e0b";
    var icon = setup.direction === "AVOID" ? "🚫" : "⏳";
    body.innerHTML = '<div style="background:' + (setup.direction === "AVOID" ? "rgba(239,68,68,0.06)" : "rgba(245,158,11,0.06)") + ';border:1px solid ' + avoidColor + '30;border-radius:10px;padding:18px;margin-top:4px;text-align:center;">'
      + '<div style="font-size:16px;font-weight:800;color:' + avoidColor + ';margin-bottom:8px;">' + icon + ' ' + escapeHTML(setup.setupType) + '</div>'
      + '<div style="font-size:12px;color:#94a3b8;line-height:1.6;">' + escapeHTML(setup.narrative || "") + '</div>'
      + '</div>';
    return;
  }

  var rrNum = parseFloat(setup.rr);
  var rrColor = rrNum >= 2 ? "#22c55e" : rrNum >= 1.5 ? "#f59e0b" : "#ef4444";
  var rrLabel = rrNum >= 2 ? "Excellent" : rrNum >= 1.5 ? "Good" : "Weak";
  var t1GainPct = ((Math.abs(setup.target1 - setup.entry) / setup.entry) * 100).toFixed(1);
  var t2GainPct = ((Math.abs(setup.target2 - setup.entry) / setup.entry) * 100).toFixed(1);
  var slPct = ((setup.slDist / setup.entry) * 100).toFixed(1);

  window._activeTradeSetup = setup;

  var defaultCapital = 100000, defaultRisk = 2;
  var riskAmt = defaultCapital * defaultRisk / 100;
  var shares = setup.slDist > 0 ? Math.floor(riskAmt / setup.slDist) : 0;
  var posValue = shares * setup.entry;
  var maxLoss = shares * setup.slDist;
  var maxGainT1 = shares * Math.abs(setup.target1 - setup.entry);

  body.innerHTML = '<div style="margin-top:4px;">'

    // Setup type + R:R header
    + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;flex-wrap:wrap;gap:8px;">'
    + '<span style="background:rgba(34,197,94,0.1);color:#22c55e;border:1px solid rgba(34,197,94,0.3);padding:5px 14px;border-radius:20px;font-size:12px;font-weight:800;">' + escapeHTML(setup.setupType) + '</span>'
    + '<div style="text-align:right;">'
    + '<div style="font-size:11px;color:#64748b;">Reward : Risk</div>'
    + '<div style="font-size:24px;font-weight:900;color:' + rrColor + ';font-family:monospace;">' + setup.rr + ':1</div>'
    + '<div style="font-size:10px;color:' + rrColor + ';font-weight:700;">' + rrLabel + ' R:R</div>'
    + '</div>'
    + '</div>'

    // Entry note
    + (setup.entryNote ? '<div style="font-size:11.5px;color:#38bdf8;background:rgba(56,189,248,0.06);border:1px solid rgba(56,189,248,0.15);border-radius:8px;padding:8px 13px;margin-bottom:12px;">' + escapeHTML(setup.entryNote) + '</div>' : '')

    // 4-level grid
    + '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:10px;">'
    + '<div class="gc" style="text-align:center;border-left:3px solid #f59e0b;"><div class="gcl">Entry</div><div style="font-size:16px;font-weight:900;color:#f59e0b;font-family:monospace;">₹' + setup.entry.toFixed(2) + '</div></div>'
    + '<div class="gc" style="text-align:center;border-left:3px solid #ef4444;"><div class="gcl">Stop Loss</div><div style="font-size:16px;font-weight:900;color:#ef4444;font-family:monospace;">₹' + setup.stopLoss.toFixed(2) + '</div></div>'
    + '<div class="gc" style="text-align:center;border-left:3px solid #22c55e;"><div class="gcl">Target 1</div><div style="font-size:16px;font-weight:900;color:#22c55e;font-family:monospace;">₹' + setup.target1.toFixed(2) + '</div></div>'
    + '<div class="gc" style="text-align:center;border-left:3px solid #00d084;"><div class="gcl">Target 2</div><div style="font-size:16px;font-weight:900;color:#00d084;font-family:monospace;">₹' + setup.target2.toFixed(2) + '</div></div>'
    + '</div>'

    // Move % row
    + '<div style="display:flex;gap:16px;font-size:11px;color:#64748b;margin-bottom:12px;flex-wrap:wrap;background:#0f1525;padding:8px 12px;border-radius:8px;border:1px solid #1c2a45;">'
    + '<span>SL: <strong style="color:#ef4444;">-' + slPct + '%</strong></span>'
    + '<span>T1: <strong style="color:#22c55e;">+' + t1GainPct + '%</strong></span>'
    + '<span>T2: <strong style="color:#00d084;">+' + t2GainPct + '%</strong></span>'
    + '<span style="margin-left:auto;color:#475569;">ATR: ₹' + (setup.atr ? setup.atr.toFixed(2) : "—") + '</span>'
    + '</div>'

    // AI narrative
    + (setup.narrative ? '<div style="font-size:12px;color:#94a3b8;background:#0f1525;border:1px solid #1c2a45;border-radius:8px;padding:10px 13px;margin-bottom:14px;line-height:1.65;">📝 ' + escapeHTML(setup.narrative) + '</div>' : '')

    // Position sizer
    + '<div style="background:#0f1525;border:1px solid #1e2d4a;border-radius:10px;padding:14px;">'
    + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;flex-wrap:wrap;gap:8px;">'
    + '<div style="font-size:11px;font-weight:700;color:#60a5fa;text-transform:uppercase;letter-spacing:0.6px;">📐 Position Sizer</div>'
    + '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">'
    + '<label style="font-size:11px;color:#64748b;">Capital ₹<input type="number" id="psCapital" value="100000" min="1000" step="10000" style="width:90px;background:#07090f;border:1px solid #1c2a45;color:#f1f5f9;border-radius:6px;padding:4px 8px;font-size:12px;font-weight:700;margin-left:4px;" oninput="recalcPositionSize(this.value, document.getElementById(\'psRisk\').value)"></label>'
    + '<label style="font-size:11px;color:#64748b;">Risk %<input type="number" id="psRisk" value="2" min="0.5" max="5" step="0.5" style="width:55px;background:#07090f;border:1px solid #1c2a45;color:#f1f5f9;border-radius:6px;padding:4px 8px;font-size:12px;font-weight:700;margin-left:4px;" oninput="recalcPositionSize(document.getElementById(\'psCapital\').value, this.value)"></label>'
    + '</div>'
    + '</div>'
    + '<div id="psSummary" style="display:grid;grid-template-columns:repeat(4,1fr);gap:4px;">'
    + positionSizeSummary(shares, posValue, maxLoss, maxGainT1)
    + '</div>'
    + '</div>'

    + '<div style="font-size:10px;color:#334155;text-align:center;margin-top:10px;">All levels are algorithmic — not financial advice. Verify before trading.</div>'
    + '</div>';
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
  var atr = calcATR(p.highs, p.lows, p.closes, 14);
  var sr = calcSR(p.closes);
  var scoreDetails = buildTechnicalScore(p.closes, { rsi:rsi, macdDetails:macdDetails, ema20:ema20, ema50:ema50, ema200:ema200 });
  var score = scoreDetails.score; // null when insufficient history
  var trend = score === null ? "Insufficient Data" : score >= 60 ? "Bullish" : score <= 40 ? "Bearish" : "Neutral";
  var confidence = score !== null ? Math.min(90, Math.max(50, Math.round(50 + Math.abs(score - 50) * 0.8))) : null;
  renderND({
    ticker:ticker, price:p.price, rawPrice:p.raw, trend:trend, confidence:confidence,
    technicalScore:score, signals:scoreDetails.signals, atr:atr, sr:sr,
    dataSource:p.dataSource, dataStatus:p.dataStatus
  });
}

function renderND(d) {
  var isBull = d.trend === "Bullish", isBear = d.trend === "Bearish";
  var accentColor = isBull ? "#00b06a" : isBear ? "#ef4444" : "#f59e0b";
  var accentBg = isBull ? "rgba(0,176,106,0.12)" : isBear ? "rgba(239,68,68,0.12)" : "rgba(245,158,11,0.12)";
  var arrow = isBull ? "▲" : isBear ? "▼" : "→";
  var body = document.getElementById("ndBody");
  if (!body) return;

  var rangeHtml = "";
  if (d.atr && d.rawPrice) {
    var upper = (d.rawPrice + d.atr).toFixed(2);
    var lower = Math.max(0, d.rawPrice - d.atr).toFixed(2);
    var stopLevel = (d.sr && d.sr.sup) ? "₹" + d.sr.sup.toFixed(2) : "₹" + lower;
    var targetLevel = (d.sr && d.sr.res) ? "₹" + d.sr.res.toFixed(2) : "₹" + upper;
    rangeHtml = '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin:16px 0;">'
      + '<div class="gc"><div class="gcl">Entry CMP</div><div class="gcv" style="color:#f59e0b">' + escapeHTML(d.price) + '</div></div>'
      + '<div class="gc"><div class="gcl">ATR Range Hi</div><div class="gcv" style="color:#22c55e">₹' + upper + '</div></div>'
      + '<div class="gc"><div class="gcl">Stop Loss</div><div class="gcv" style="color:#ef4444">' + stopLevel + '</div></div>'
      + '<div class="gc"><div class="gcl">Resistance</div><div class="gcv" style="color:#3b82f6">' + targetLevel + '</div></div>'
      + '</div>'
      + '<div style="font-size:10px;color:#475569;background:#0f1525;border:1px solid #1c2a45;border-radius:8px;padding:8px 12px;margin-bottom:12px;">'
      + '📐 ATR (14): ₹' + d.atr.toFixed(2) + ' · Expected session range: ₹' + lower + ' – ₹' + upper
      + '</div>';
  }

  body.innerHTML = '<div class="sec" style="background:#0b0f19;border-radius:12px;padding:20px;border:1px solid #1e293b;">'
    + '<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px;">'
    + '<div><div style="font-size:22px;font-weight:800;color:#f1f5f9;">' + escapeHTML(d.ticker) + '</div>'
    + '<div style="font-size:12px;color:#64748b;margin-top:3px;">' + escapeHTML(d.dataSource || "Market source") + ' · ' + escapeHTML(d.dataStatus || "DELAYED") + '</div></div>'
    + '<div style="text-align:center;background:' + accentBg + ';padding:14px 20px;border-radius:10px;border:1px solid ' + accentColor + '40;">'
    + '<div style="font-size:26px;font-weight:900;color:' + accentColor + ';">' + arrow + ' ' + escapeHTML(d.trend) + '</div>'
    + '<div style="font-size:11px;color:#94a3b8;margin-top:4px;">Confidence <strong style="color:' + accentColor + ';">' + (d.confidence !== null ? d.confidence + "%" : "—") + '</strong></div>'
    + '</div></div>'
    + '<div style="margin-bottom:14px;">'
    + '<div style="display:flex;justify-content:space-between;font-size:11px;color:#64748b;margin-bottom:5px;"><span style="font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Technical Score</span><span style="font-weight:800;color:#f1f5f9;">' + (d.technicalScore !== null ? d.technicalScore + "/100" : "—") + '</span></div>'
    + '<div style="height:6px;background:#1c2a45;border-radius:3px;overflow:hidden;"><div style="height:100%;width:' + (d.technicalScore !== null ? d.technicalScore : 0) + '%;background:' + accentColor + ';border-radius:3px;transition:width 0.6s;"></div></div>'
    + '</div>'
    + rangeHtml
    + '<div style="font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.7px;margin-bottom:8px;">Signal Breakdown</div>'
    + (d.signals || []).map(function(s){
        return '<div style="padding:8px 0;border-top:1px solid #1e293b;display:flex;justify-content:space-between;align-items:flex-start;gap:16px;">'
          + '<div><strong style="color:#e2e8f4;font-size:12px;">' + escapeHTML(s.name) + '</strong><div style="font-size:11px;color:#94a3b8;margin-top:2px;">' + escapeHTML(s.explanation) + '</div></div>'
          + '<div style="font-family:monospace;font-size:12px;font-weight:700;color:#38bdf8;white-space:nowrap;">' + s.contribution.toFixed(1) + '/' + s.weight + '</div>'
          + '</div>';
      }).join("")
    + '<div style="font-size:11px;color:#64748b;margin-top:14px;padding-top:12px;border-top:1px solid #1e293b;">Probabilistic technical outlook only; not a guarantee of future price direction.</div>'
    + '</div>';
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
  var rsi = calcRSI(p.closes, 14);
  var ema20 = calcEMA(p.closes, 20);
  var ema50 = calcEMA(p.closes, 50);
  var riskUnit = atr;
  if (!riskUnit) {
    body.innerHTML = '<div class="errbox">⚠️ ATR (Average True Range) unavailable — not enough price history to generate scenario targets. Try after more trading sessions.</div>';
    return;
  }

  var momentum5d = p.closes.length >= 6 ? ((p.closes[p.closes.length-1] / p.closes[p.closes.length-6]) - 1) * 100 : 0;
  var isBullish = momentum5d > 0 && (ema20 === null || ema50 === null || ema20 > ema50) && (rsi === null || rsi < 70);

  var bullTarget = sr.res !== null ? Math.max(price + riskUnit, sr.res) : price + 2*riskUnit;
  var bearTarget = sr.sup !== null ? Math.min(price - riskUnit, sr.sup) : Math.max(0, price - 2*riskUnit);
  var baseTarget = price * (isBullish ? 1.005 : 0.995);

  var bullUpside = ((bullTarget - price) / price * 100).toFixed(1);
  var bearDownside = ((price - bearTarget) / price * 100).toFixed(1);
  var rewardRisk = (Math.abs(price - bearTarget) > 0) ? (Math.abs(bullTarget - price) / Math.abs(price - bearTarget)).toFixed(2) : "—";

  var scenarios = [
    { dot:"▲", name:"Bull Case", target:bullTarget, move:"+" + bullUpside + "%",
      timeframe:"2–4 weeks", color:"#22c55e", bgColor:"rgba(34,197,94,0.05)", borderColor:"rgba(34,197,94,0.25)",
      condition:"Momentum sustains above " + (sr.sup !== null ? "₹" + sr.sup.toFixed(0) : "support") + ". Resistance at " + (sr.res !== null ? "₹" + sr.res.toFixed(0) : "key level") + " is cleared on volume." },
    { dot:"→", name:"Base Case", target:baseTarget, move:isBullish ? "+0.5%" : "-0.5%",
      timeframe:"1–3 weeks", color:"#f59e0b", bgColor:"rgba(245,158,11,0.05)", borderColor:"rgba(245,158,11,0.25)",
      condition:"Price consolidates near current levels. Trend is intact but lacks catalyst for a breakout." },
    { dot:"▼", name:"Bear Case", target:bearTarget, move:"-" + bearDownside + "%",
      timeframe:"1–2 weeks", color:"#ef4444", bgColor:"rgba(239,68,68,0.05)", borderColor:"rgba(239,68,68,0.25)",
      condition:"Support at " + (sr.sup !== null ? "₹" + sr.sup.toFixed(0) : "key level") + " fails. Downside momentum accelerates on volume." }
  ];

  var scenarioHTML = scenarios.map(function(s){
    return '<div class="gc" style="background:' + s.bgColor + ';border:1px solid ' + s.borderColor + ';border-radius:10px;padding:14px;">'
      + '<div style="margin-bottom:8px;">'
      + '<div style="font-size:13px;font-weight:700;color:' + s.color + ';">' + s.dot + ' ' + escapeHTML(s.name) + '</div>'
      + '</div>'
      + '<div style="font-size:22px;font-weight:900;color:' + s.color + ';font-family:monospace;">₹' + s.target.toFixed(2) + '</div>'
      + '<div style="font-size:11px;font-weight:600;color:' + s.color + ';margin-top:2px;">' + escapeHTML(s.move) + ' from CMP · ' + escapeHTML(s.timeframe) + '</div>'
      + '<div style="font-size:11px;color:#94a3b8;margin-top:8px;line-height:1.5;">' + escapeHTML(s.condition) + '</div>'
      + '</div>';
  }).join("");

  body.innerHTML = '<div class="sec" style="background:#0b0f19;padding:20px;border-radius:12px;border:1px solid #1e293b;">'
    + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">'
    + '<h3 style="margin:0;font-size:18px;font-weight:800;color:#f1f5f9;">' + escapeHTML(ticker) + ' Scenario Outlook</h3>'
    + '<div style="text-align:right;">'
    + '<div style="font-size:11px;color:#64748b;">Reward : Risk</div>'
    + '<div style="font-size:18px;font-weight:800;color:#38bdf8;">' + rewardRisk + (rewardRisk !== "—" ? ' : 1' : '') + '</div>'
    + '</div>'
    + '</div>'
    + '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:14px;">' + scenarioHTML + '</div>'
    + '<div style="font-size:11px;color:#64748b;background:#0f1525;border:1px solid #1c2a45;border-radius:8px;padding:10px 12px;display:flex;flex-wrap:wrap;gap:12px;">'
    + '<span>ATR (14): ' + (atr !== null ? '<strong>₹' + atr.toFixed(2) + '</strong>' : '<strong>—</strong>') + '</span>'
    + '<span>Support: ' + (sr.sup !== null ? '<strong>₹' + sr.sup.toFixed(2) + '</strong>' : '<strong>—</strong>') + '</span>'
    + '<span>Resistance: ' + (sr.res !== null ? '<strong>₹' + sr.res.toFixed(2) + '</strong>' : '<strong>—</strong>') + '</span>'
    + '<span>RSI (14): ' + (rsi !== null ? '<strong>' + rsi + '</strong>' : '<strong>—</strong>') + '</span>'
    + '<span>5d Momentum: <strong style="color:' + (momentum5d >= 0 ? "#22c55e" : "#ef4444") + ';">' + (momentum5d >= 0 ? "+" : "") + momentum5d.toFixed(1) + '%</strong></span>'
    + '</div>'
    + '<div style="font-size:11px;color:#475569;margin-top:10px;">Scenarios are deterministic technical ranges based on current price and volatility. Not financial advice.</div>'
    + '</div>';
}

var GLOBAL_MARKET_GROUPS = [
  { label: "🇮🇳 Indian Markets", items: [
    { sym: "^NSEI", name: "NIFTY 50" },
    { sym: "^BSESN", name: "SENSEX" },
    { sym: "^NSEBANK", name: "NIFTY BANK" },
    { sym: "^CNXIT", name: "NIFTY IT" }
  ]},
  { label: "🇺🇸 US Markets", items: [
    { sym: "^GSPC", name: "S&P 500" },
    { sym: "^DJI", name: "Dow Jones" },
    { sym: "^IXIC", name: "NASDAQ" },
    { sym: "^VIX", name: "VIX (Fear Index)" }
  ]},
  { label: "🌏 Asian & European", items: [
    { sym: "^N225", name: "Nikkei 225" },
    { sym: "^HSI", name: "Hang Seng" },
    { sym: "^FTSE", name: "FTSE 100" },
    { sym: "^GDAXI", name: "DAX (Germany)" }
  ]},
  { label: "💱 Currencies vs INR", items: [
    { sym: "USDINR=X", name: "USD / INR" },
    { sym: "EURINR=X", name: "EUR / INR" },
    { sym: "GBPINR=X", name: "GBP / INR" },
    { sym: "JPYINR=X", name: "JPY / INR" }
  ]},
  { label: "🥇 Commodities", items: [
    { sym: "GC=F", name: "Gold ($/oz)" },
    { sym: "CL=F", name: "Crude Oil WTI" },
    { sym: "SI=F", name: "Silver ($/oz)" },
    { sym: "BZ=F", name: "Brent Crude" }
  ]}
];

async function loadGlobal(force){
  if(!force && window.CACHE.global && fresh(window.CACHE.gTs, window.TTL.m)) { renderGlobal(window.CACHE.global); return; }
  var gBodyEl = document.getElementById("gBody");
  if (gBodyEl) gBodyEl.innerHTML = skels(80, 5);
  try {
    var allItems = [];
    GLOBAL_MARKET_GROUPS.forEach(function(g) { g.items.forEach(function(i) { allItems.push(i); }); });
    var results = await Promise.allSettled(allItems.map(function(item) {
      return yfQuote(item.sym).then(function(q) { return { sym: item.sym, name: item.name, q: q }; });
    }));
    var resultMap = {};
    results.forEach(function(r) {
      if (r.status === "fulfilled" && r.value) resultMap[r.value.sym] = r.value;
    });
    var grouped = GLOBAL_MARKET_GROUPS.map(function(group) {
      return {
        label: group.label,
        results: group.items.map(function(item) {
          return resultMap[item.sym] || { sym: item.sym, name: item.name, q: null };
        })
      };
    });
    window.CACHE.global = grouped;
    window.CACHE.gTs = Date.now();
    renderGlobal(grouped);
  } catch(e) { if (gBodyEl) gBodyEl.innerHTML = '<div class="errbox">⚠️ Global data unavailable</div>'; }
}

function renderGlobal(grouped){
  var gBodyEl = document.getElementById("gBody");
  if (!gBodyEl) return;
  if (!grouped || !grouped.length) { gBodyEl.innerHTML = '<div class="errbox">⚠️ Global data unavailable</div>'; return; }

  var html = grouped.map(function(group) {
    var cardsHtml = group.results.map(function(item) {
      if (!item.q || !item.q.raw) {
        return '<div class="gcrd" style="opacity:0.4;pointer-events:none;">'
          + '<div class="gnm">' + escapeHTML(item.name) + '</div>'
          + '<div style="font-size:13px;color:#475569;font-weight:600;margin-top:4px;">—</div>'
          + '</div>';
      }
      var q = item.q;
      var color = q.up ? "#22c55e" : "#ef4444";
      var arrow = q.up ? "▲" : "▼";
      var isFX = item.sym.includes("=X");
      var decimals = isFX ? 4 : 2;
      var priceStr = q.raw.toLocaleString("en-IN", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
      var prefix = (item.sym.includes("=X") || item.sym.includes("=F") || item.sym.startsWith("^") || item.sym.includes("-USD")) ? "" : "";
      return '<div class="gcrd" onclick="runAnalysis(\'' + escapeHTML(item.sym) + '\')" style="cursor:pointer;border-top:2px solid ' + color + ';transition:transform 0.1s;" onmouseover="this.style.transform=\'translateY(-2px)\'" onmouseout="this.style.transform=\'\'">'
        + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">'
        + '<div class="gnm" style="font-size:11px;">' + escapeHTML(item.name) + '</div>'
        + '<span style="font-size:10px;font-weight:700;color:' + color + ';background:' + (q.up ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)") + ';padding:2px 6px;border-radius:4px;">' + arrow + ' ' + escapeHTML(q.changePct) + '</span>'
        + '</div>'
        + '<div class="gvl" style="color:' + color + ';font-size:18px;">' + priceStr + '</div>'
        + '<div style="font-size:10px;color:#64748b;margin-top:3px;">' + escapeHTML(q.change) + '</div>'
        + '</div>';
    }).join("");
    return '<div style="margin-bottom:20px;">'
      + '<div style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:8px;padding-bottom:6px;border-bottom:1px solid #1c2a45;">' + group.label + '</div>'
      + '<div class="ggrid">' + cardsHtml + '</div>'
      + '</div>';
  }).join("");

  gBodyEl.innerHTML = html;
}
var btnGlobalEl = document.getElementById("btnGlobal");
if (btnGlobalEl) { btnGlobalEl.addEventListener("click", function(){ loadGlobal(true); }); }

async function loadCal(force){
  var calBodyEl = document.getElementById("calBody");
  if (!calBodyEl) return;
  calBodyEl.innerHTML = '<div class="empty-state" style="padding:32px 20px;">'
    + '<div class="empty-title" style="margin-bottom:4px;">Corporate Events Calendar</div>'
    + '<div class="empty-sub" style="margin-top:12px;line-height:1.7;">'
    + 'NSE event data requires authentication and cannot be fetched directly from the browser.<br>'
    + 'For real, verified upcoming corporate actions — earnings, dividends, AGMs, board meetings, IPOs — use the official sources below:'
    + '</div>'
    + '<div style="margin-top:20px;display:flex;flex-direction:column;gap:10px;max-width:340px;margin-left:auto;margin-right:auto;">'
    + '<a href="https://www.nseindia.com/market-data/event-calendar" target="_blank" rel="noopener" style="display:flex;align-items:center;gap:10px;background:#0f1525;border:1px solid #1c2a45;border-radius:10px;padding:12px 16px;text-decoration:none;color:#f1f5f9;font-weight:600;font-size:13px;">'
    + '<div><div>NSE India — Event Calendar</div><div style="font-size:11px;color:#64748b;font-weight:400;margin-top:2px;">nseindia.com · Official corporate actions</div></div></a>'
    + '<a href="https://www.bseindia.com/corporates/ann.html" target="_blank" rel="noopener" style="display:flex;align-items:center;gap:10px;background:#0f1525;border:1px solid #1c2a45;border-radius:10px;padding:12px 16px;text-decoration:none;color:#f1f5f9;font-weight:600;font-size:13px;">'
    + '<div><div>BSE India — Announcements</div><div style="font-size:11px;color:#64748b;font-weight:400;margin-top:2px;">bseindia.com · Exchange filings</div></div></a>'
    + '</div>'
    + '<div style="font-size:11px;color:#475569;margin-top:24px;">Always verify event dates on official exchange websites before taking any trade.</div>'
    + '</div>';
}

function renderCal(arr){
  var calBodyEl = document.getElementById("calBody");
  if (!calBodyEl) return;
  if (!arr || !arr.length) {
    calBodyEl.innerHTML = '<div class="empty-state"><div class="empty-icon">📅</div><div class="empty-title">Calendar unavailable</div><div class="empty-sub">AI could not generate events. Try refreshing.</div></div>';
    return;
  }
  var typeStyles = {
    earnings:     { color:"#3b82f6", bg:"rgba(59,130,246,0.12)", label:"EARNINGS" },
    dividend:     { color:"#22c55e", bg:"rgba(34,197,94,0.12)", label:"DIVIDEND" },
    agm:          { color:"#f59e0b", bg:"rgba(245,158,11,0.12)", label:"AGM" },
    "board-meeting": { color:"#8b5cf6", bg:"rgba(139,92,246,0.12)", label:"BOARD MEETING" },
    ipo:          { color:"#ec4899", bg:"rgba(236,72,153,0.12)", label:"IPO" }
  };
  var h = '<div class="clst">';
  arr.forEach(function(e){
    var ts = typeStyles[e.type] || { color:"#64748b", bg:"rgba(100,116,139,0.12)", label:"EVENT" };
    var tickerHtml = e.ticker ? ' onclick="runAnalysis(\'' + escapeHTML(e.ticker) + '\')" style="cursor:pointer;"' : "";
    h += '<div class="citem"' + tickerHtml + '>'
      + '<div class="cdt">' + escapeHTML(e.date || "—") + '</div>'
      + '<div style="flex:1;min-width:0;">'
      + '<div style="font-size:13px;font-weight:700;color:#f1f5f9;">' + escapeHTML(e.company || "—") + '</div>'
      + (e.event ? '<div style="font-size:11px;color:#94a3b8;margin-top:2px;">' + escapeHTML(e.event) + '</div>' : '')
      + '</div>'
      + '<span style="font-size:9.5px;font-weight:700;color:' + ts.color + ';background:' + ts.bg + ';padding:3px 8px;border-radius:5px;white-space:nowrap;flex-shrink:0;">' + ts.label + '</span>'
      + '</div>';
  });
  calBodyEl.innerHTML = h + '</div>'
    + '<div style="font-size:10px;color:#475569;text-align:center;margin-top:8px;">AI-generated dates · Verify on NSE website before trading</div>';
}
var btnCalEl = document.getElementById("btnCal");
if (btnCalEl) { btnCalEl.addEventListener("click", function(){ loadCal(true); }); }

var chatSendEl = document.getElementById("chatSend");
if (chatSendEl) chatSendEl.addEventListener("click", sendChat);
var chatInEl = document.getElementById("chatIn");
if (chatInEl) { chatInEl.addEventListener("keydown", function(e){ if(e.key === "Enter") sendChat(); }); }

async function sendChat(){
  var inp = document.getElementById("chatIn");
  var q = inp ? inp.value.trim() : "";
  if(!q) return;
  if(inp) inp.value = "";
  var msgs = document.getElementById("chatMsgs");
  if (msgs) msgs.innerHTML += '<div class="cm cmu">' + escapeHTML(q) + '</div>';
  var tid = "m" + Date.now();
  if (msgs) msgs.innerHTML += '<div class="cm cmai" id="' + tid + '"><span class="mspn"></span> Thinking...</div>';
  if (msgs) msgs.scrollTop = msgs.scrollHeight;

  var activeTicker = window.activeTickerNode;
  var tickerContext = activeTicker ? "The user is currently analyzing " + (typeof sanitizeAIPrompt === 'function' ? sanitizeAIPrompt(activeTicker) : activeTicker) + " (NSE India). Current data: " + (function(){
    var cache = window.CACHE && window.CACHE.analysis && window.CACHE.analysis[activeTicker];
    if (!cache || !cache.d) return "no cached data.";
    var d = cache.d;
    return "Price " + d.price + ", RSI " + (d.rsi || "—") + ", Score " + d.healthScore + "%, Trend " + d.trend + ".";
  })() + " " : "";

  // Sanitize chat query: strip control chars, limit length
  var safeQ = String(q || '').replace(/[\x00-\x1F\x7F]/g, '').slice(0, 300);
  var prompt = "You are NC AI, a concise expert financial assistant for Indian stock markets (NSE/BSE). "
    + tickerContext
    + "Answer in 3–5 lines with specific insight. Avoid generic disclaimers. User asks: " + safeQ;

  var txt = await freeAI(prompt);
  var stylizedText = txt ? txt.replace(/\n/g, "<br>") : "Sorry, I could not get a response. Please try again.";
  var targetMsgEl = document.getElementById(tid);
  if (targetMsgEl) targetMsgEl.innerHTML = sanitizeHTML(stylizedText);
  if (msgs) msgs.scrollTop = msgs.scrollHeight;
}

function initChatSuggestions() {
  var container = document.getElementById("chatSuggestions");
  if (!container) return;
  var suggestions = ["What is RSI?", "Explain MACD", "Best sectors now?", "What is SIP?", "Nifty 50 outlook?", "How to read a candlestick?"];
  container.innerHTML = '<div style="display:flex;flex-wrap:wrap;gap:6px;">'
    + suggestions.map(function(s) {
        return '<button onclick="document.getElementById(\'chatIn\').value=' + JSON.stringify(s) + '; sendChat();" '
          + 'style="background:#0f1525;border:1px solid #1c2a45;border-radius:20px;padding:5px 12px;font-size:11px;font-weight:600;color:#60a5fa;cursor:pointer;white-space:nowrap;transition:border-color 0.15s;" '
          + 'onmouseover="this.style.borderColor=\'#3b82f6\'" onmouseout="this.style.borderColor=\'#1c2a45\'">'
          + escapeHTML(s) + '</button>';
      }).join("")
    + '</div>';
}

function renderMarketStatus() {
  var pill = document.getElementById("mktStatus");
  if (!pill) return;
  var open = isIndianMarketOpen();
  var ist = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
  var h = ist.getHours(), m = ist.getMinutes(), s = ist.getSeconds();
  var timeStr = (h < 10 ? "0" : "") + h + ":" + (m < 10 ? "0" : "") + m + ":" + (s < 10 ? "0" : "") + s;
  var dot = '<span style="width:6px;height:6px;border-radius:50%;display:inline-block;background:' + (open ? "#22c55e" : "#64748b") + ';' + (open ? "box-shadow:0 0 4px #22c55e;" : "") + '"></span>';
  pill.className = "mkt-status-pill " + (open ? "mkt-open" : "mkt-closed");
  pill.innerHTML = dot + (open ? " NSE OPEN" : " NSE CLOSED") + ' · <span style="font-family:monospace;letter-spacing:0.5px;">' + timeStr + ' IST</span>';
}

function renderTickerStrip(allItems) {
  var strip = document.getElementById("quickViewStrip");
  if (!strip || !allItems.length) return;
  var singleBlock = allItems.map(function(item) {
    var color = item.up ? "#22c55e" : "#ef4444";
    var arrow = item.up ? "▲" : "▼";
    var safeAnalysis = (item.sym && !item.sym.startsWith("^")) ? "runAnalysis('" + escapeHTML(item.sym) + "')" : "";
    return '<span class="ticker-item"' + (safeAnalysis ? ' onclick="' + safeAnalysis + '"' : '') + ' title="' + escapeHTML(item.name) + '">'
      + '<span class="ticker-name">' + escapeHTML(item.name) + '</span>'
      + '<span class="ticker-price" style="color:' + color + '">' + escapeHTML(item.price) + '</span>'
      + '<span class="ticker-chg" style="color:' + color + '">' + arrow + ' ' + escapeHTML(item.changePct) + '</span>'
      + '</span><span class="ticker-dot" aria-hidden="true">·</span>';
  }).join("");
  strip.innerHTML = singleBlock + singleBlock;
  var duration = Math.max(22, allItems.length * 2.4);
  strip.style.animation = "tickerScroll " + duration + "s linear infinite";
}

async function loadTickerStrip() {
  var strip = document.getElementById("quickViewStrip");
  if (!strip) return;

  // Reuse India market cache (4 indices)
  var cached = window.MARKET_SUMMARY_CACHE["india"] || [];
  var allItems = cached.map(function(item) {
    var fPrice = "₹" + Number(item.price).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return { name: item.ticker, price: fPrice, changePct: item.changePct, up: item.up, sym: item.sym };
  });

  // Merge in top stock data if already loaded
  var stockCache = window.TICKER_STOCK_CACHE || [];
  var seenSyms = new Set(allItems.map(function(i) { return i.sym; }));
  stockCache.forEach(function(s) {
    if (!seenSyms.has(s.sym)) { allItems.push(s); seenSyms.add(s.sym); }
  });

  // Fetch extra sector indices
  var extra = [
    { sym: "^CNXAUTO", name: "NIFTY AUTO" },
    { sym: "^CNXPHARMA", name: "PHARMA" }
  ].filter(function(e) { return !seenSyms.has(e.sym); });

  if (extra.length) {
    var extraRes = await Promise.allSettled(extra.map(function(e) {
      return yfQuote(e.sym).then(function(q) { return { name: e.name, sym: e.sym, q: q }; });
    }));
    extraRes.forEach(function(r) {
      if (r.status !== "fulfilled" || !r.value || !r.value.q) return;
      var d = r.value;
      allItems.push({ name: d.name, price: d.q.price, changePct: d.q.changePct, up: d.q.up, sym: d.sym });
    });
  }

  renderTickerStrip(allItems);
}

async function loadTopMovers() {
  var container = document.getElementById("topMovers");
  if (!container) return;
  if (typeof isProxyBlocked === "function" && isProxyBlocked()) {
    container.innerHTML = '<div style="color:#64748b;font-size:12px;padding:8px;text-align:center;">🔒 Live data blocked by network</div>';
    return;
  }
  // Real movers: dedicated gainers + losers screeners (2 calls)
  window._tickerNameCache = window._tickerNameCache || {};
  function mapQ(quotes) {
    return (quotes || []).map(function(q) {
      var sym = String(q.symbol || '').replace(/\.(NS|BO)$/, '');
      var price = q.regularMarketPrice, chgPct = q.regularMarketChangePercent;
      if (!sym || price == null || chgPct == null) return null;
      var name = q.longName || q.shortName || null;
      if (name) window._tickerNameCache[sym] = name;
      return {
        sym: sym,
        q: {
          price: "₹" + Number(price).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
          raw: price,
          changePct: (chgPct >= 0 ? "+" : "") + Number(chgPct).toFixed(2) + "%",
          up: chgPct >= 0,
          name: name || sym
        }
      };
    }).filter(Boolean);
  }
  function quotesOf(r) {
    return (r.status === "fulfilled" && r.value && r.value.finance && r.value.finance.result && r.value.finance.result[0] && r.value.finance.result[0].quotes) || [];
  }

  var gainers = [], losers = [];
  try {
    var base = "https://query2.finance.yahoo.com/v1/finance/screener/predefined/saved?count=10&scrIds=";
    var res = await Promise.allSettled([
      proxyFetch(base + "day_gainers_IN", 8000),
      proxyFetch(base + "day_losers_IN", 8000)
    ]);
    gainers = mapQ(quotesOf(res[0])).filter(function(i){ return i.q.up; }).slice(0, 5);
    losers  = mapQ(quotesOf(res[1])).filter(function(i){ return !i.q.up; }).slice(0, 5);
  } catch(e) {}

  if (!gainers.length && !losers.length) {
    container.innerHTML = '<div style="color:#64748b;font-size:12px;padding:8px;text-align:center;">Market data unavailable</div>';
    return;
  }

  // Ticker strip cache from movers
  var moverPool = gainers.concat(losers);
  window.TICKER_STOCK_CACHE = moverPool.map(function(i) {
    return { name: i.sym, price: i.q.price, changePct: i.q.changePct, up: i.q.up, sym: i.sym };
  });
  if (typeof renderTickerStrip === "function") {
    var cached = window.MARKET_SUMMARY_CACHE["india"] || [];
    var idxItems = cached.map(function(item) {
      var fPrice = "₹" + Number(item.price).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      return { name: item.ticker, price: fPrice, changePct: item.changePct, up: item.up, sym: item.sym };
    });
    var seenSyms = new Set(idxItems.map(function(i) { return i.sym; }));
    var merged = idxItems.concat(window.TICKER_STOCK_CACHE.filter(function(s) { return !seenSyms.has(s.sym); }));
    renderTickerStrip(merged);
  }

  var adEl = document.getElementById("advDecCount");
  if (adEl) adEl.innerHTML = '<span style="color:#22c55e;font-weight:700;">▲ ' + gainers.length + ' Gainers</span><span style="color:#475569;margin:0 6px;">|</span><span style="color:#ef4444;font-weight:700;">▼ ' + losers.length + ' Losers</span>';

  function moverRow(item, up) {
    var color = up ? "#22c55e" : "#ef4444";
    var arrow = up ? "▲" : "▼";
    var bg = up ? "rgba(34,197,94,0.05)" : "rgba(239,68,68,0.04)";
    var bdr = up ? "rgba(34,197,94,0.18)" : "rgba(239,68,68,0.18)";
    var pctVal = parseFloat(String(item.q.changePct || "0").replace(/[+%]/g,"")) || 0;
    var circuitBadge = pctVal >= 15 ? '<span style="font-size:9px;font-weight:800;background:rgba(34,197,94,0.15);color:#22c55e;border:1px solid rgba(34,197,94,0.3);padding:1px 5px;border-radius:4px;margin-left:4px;">UC</span>'
      : pctVal <= -15 ? '<span style="font-size:9px;font-weight:800;background:rgba(239,68,68,0.12);color:#ef4444;border:1px solid rgba(239,68,68,0.25);padding:1px 5px;border-radius:4px;margin-left:4px;">LC</span>' : '';
    return '<div onclick="runAnalysis(\'' + escapeHTML(item.sym) + '\')" class="mover-row" style="background:' + bg + ';border-color:' + bdr + ';">'
      + '<div style="display:flex;align-items:center;gap:8px;">'
      + '<div style="width:32px;height:32px;border-radius:8px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.07);display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:800;color:' + color + ';">' + arrow + '</div>'
      + '<div><div style="font-size:12px;font-weight:700;color:#e2e8f4;">' + escapeHTML(item.sym) + circuitBadge + '</div><div style="font-size:10px;color:#64748b;margin-top:1px;">' + escapeHTML(item.q.price) + '</div></div>'
      + '</div>'
      + '<div style="text-align:right;"><div style="font-size:12px;font-weight:800;color:' + color + ';">' + escapeHTML(item.q.changePct) + '</div></div>'
      + '</div>';
  }
  container.innerHTML = '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">'
    + '<div><div style="font-size:10px;font-weight:700;color:#22c55e;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px;display:flex;align-items:center;gap:4px;">▲ Gainers</div>'
    + (gainers.length ? gainers.map(function(i) { return moverRow(i, true); }).join("") : '<div style="color:#64748b;font-size:11px;padding:8px 0;">No data</div>')
    + '</div>'
    + '<div><div style="font-size:10px;font-weight:700;color:#ef4444;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px;display:flex;align-items:center;gap:4px;">▼ Losers</div>'
    + (losers.length ? losers.map(function(i) { return moverRow(i, false); }).join("") : '<div style="color:#64748b;font-size:11px;padding:8px 0;">No data</div>')
    + '</div>'
    + '</div>';
}

function loadRecentStocks() {
  var container = document.getElementById("recentBody");
  if (!container) return;
  var state = window.NCUserTools ? window.NCUserTools.getState() : null;
  var recent = (state && state.recent) ? state.recent.slice(0, 8) : [];
  var recentSec = document.getElementById("recentSec");
  if (!recent.length) {
    if (recentSec) recentSec.style.display = "none";
    container.innerHTML = "";
    return;
  }
  if (recentSec) recentSec.style.display = "";
  container.innerHTML = '<div style="display:flex;flex-wrap:wrap;gap:6px;">'
    + recent.map(function(sym) {
        return '<div onclick="runAnalysis(\'' + escapeHTML(sym) + '\')" style="background:linear-gradient(135deg,#0f1828,#0b1220);border:1px solid #1e3358;border-radius:8px;padding:5px 12px;font-size:12px;font-weight:700;cursor:pointer;color:#60a5fa;transition:all 0.15s;letter-spacing:0.3px;" onmouseover="this.style.borderColor=\'#3b82f6\';this.style.background=\'rgba(59,130,246,0.1)\'" onmouseout="this.style.borderColor=\'#1e3358\';this.style.background=\'linear-gradient(135deg,#0f1828,#0b1220)\'">' + escapeHTML(sym) + '</div>';
      }).join("")
    + '</div>';
}

async function bootDashboard() {
  initMarketChips();
  renderMarketStatus();
  setInterval(renderMarketStatus, 1000);
  loadRecentStocks();
  initChatSuggestions();
  _loadNSETickers(); // async, non-blocking
  // Show skeletons immediately, then fetch all data in parallel
  forceRenderIndexUI();
  Promise.allSettled([
    loadIdx(),
    loadSectorIndices(),
    loadNews(),
    loadTopMovers(),
    fetchRegionData("india").then(function() {
      forceRenderIndexUI();
      loadTickerStrip();
    })
  ]);
}

if (window.RefreshScheduler) {
  window.RefreshScheduler.register("master-exchange-orchestrator", async function () {
    if (!isIndianMarketOpen()) { forceRenderIndexUI(); return; }
    forceRenderIndexUI();

    var tasks = [];
    if (!window.LAST_IDX_REFRESH_TS || Date.now() - window.LAST_IDX_REFRESH_TS > 30000) {
      window.LAST_IDX_REFRESH_TS = Date.now();
      tasks.push(loadIdx());
    }
    if (!window.LAST_MOVERS_REFRESH_TS || Date.now() - window.LAST_MOVERS_REFRESH_TS > 60000) {
      window.LAST_MOVERS_REFRESH_TS = Date.now();
      tasks.push(loadTopMovers());
    }
    if (!window.LAST_NEWS_REFRESH_TS || Date.now() - window.LAST_NEWS_REFRESH_TS > 300000) {
      window.LAST_NEWS_REFRESH_TS = Date.now();
      tasks.push(loadNews());
    }
    if (tasks.length) await Promise.allSettled(tasks);
  }, 5000, { pauseWhenHidden: true });
}

function initThemeSwitcher() {
  var themeBtn = document.getElementById("themeBtn");
  if (!themeBtn) return;
  themeBtn.addEventListener("click", function() {
    isLight = !isLight;
    document.body.classList.toggle("light", isLight);
    themeBtn.textContent = isLight ? "☀️" : "🌙";
    var nextLabel = isLight ? "Switch to dark mode" : "Switch to light mode";
    themeBtn.setAttribute("aria-label", nextLabel);
    themeBtn.setAttribute("title", nextLabel);
  });
}

document.addEventListener("DOMContentLoaded", initThemeSwitcher);
bootDashboard();
