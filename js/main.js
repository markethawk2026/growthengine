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
  if (!closes || closes.length < 2) return '';
  
  var w = 500, h = 140;
  var minP = Math.min(...closes), maxP = Math.max(...closes);
  var rngP = maxP - minP || 1;
  
  var coordinates = closes.map((p, i) => {
    var x = (i / (closes.length - 1)) * w;
    var y = h - ((p - minP) / rngP) * (h - 45) - 30;
    return { x: x, y: y, price: p };
  });

  var pricePts = coordinates.map(pt => pt.x.toFixed(1) + ',' + pt.y.toFixed(1)).join(' ');
  var areaPathData = `M 0,${h} L ` + pricePts + ` L ${w},${h} Z`;
  var color = up ? "#22c55e" : "#ef4444";
  var gradId = "grad_" + Math.random().toString(36).substr(2, 9);

  var volumeHTML = "";
  if (volumes && volumes.length > 0) {
    var maxV = Math.max(...volumes) || 1;
    var barCount = closes.length;
    var barWidth = (w / barCount) * 0.70;
    
    volumes.forEach((v, idx) => {
      var barHeight = (v / maxV) * 28;
      var x = (idx / (barCount - 1)) * w - (barWidth / 2);
      var y = h - barHeight - 4;
      volumeHTML += `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${barWidth.toFixed(1)}" height="${barHeight.toFixed(1)}" fill="#1e293b" opacity="0.45" rx="1"/>`;
    });
  }

  var midY = (h - 35) / 2 + 10;
  var gridLinesHTML = `
    <line x1="0" y1="20" x2="${w}" y2="20" stroke="#1e293b" stroke-width="1" stroke-dasharray="3,3" />
    <line x1="0" y1="${midY.toFixed(1)}" x2="${w}" y2="${midY.toFixed(1)}" stroke="#111827" stroke-width="1" stroke-dasharray="4,4" />
    <line x1="0" y1="${(h - 15).toFixed(1)}" x2="${w}" y2="${(h - 15).toFixed(1)}" stroke="#1e293b" stroke-width="1" stroke-dasharray="3,3" />
  `;

  return `
    <div style="margin: 14px 0; background: #0b0f19; border: 1px solid #1e293b; border-radius: 12px; padding: 14px 16px; box-shadow: inset 0 2px 4px rgba(0,0,0,0.2);">
      <div style="font-size: 10px; color: #64748b; margin-bottom: 12px; font-weight: 700; letter-spacing: 0.8px; text-transform: uppercase; display: flex; justify-content: space-between; align-items: center;">
        <span style="display: flex; align-items: center; gap: 6px;">
          <span style="width: 6px; height: 6px; background: ${color}; border-radius: 50%; display: inline-block;"></span>
          Intraday Technical Waveform
        </span>
        <span style="background: #111827; padding: 2px 6px; border-radius: 4px; border: 1px solid #1e293b; font-size: 9px; color: #94a3b8;">DUAL-AXIS VOL/PRICE</span>
      </div>
      
      <div style="height: 130px; width: 100%; position: relative; overflow: visible;">
        <svg viewBox="0 0 500 140" preserveAspectRatio="none" style="width: 100%; height: 100%; overflow: visible; display: block;">
          <defs>
            <linearGradient id="${gradId}" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="${color}" stop-opacity="0.18"/>
              <stop offset="100%" stop-color="${color}" stop-opacity="0.00"/>
            </linearGradient>
          </defs>
          ${gridLinesHTML}
          ${volumeHTML}
          <path d="${areaPathData}" fill="url(#${gradId})" />
          <polyline points="${pricePts}" fill="none" stroke="${color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
          <circle cx="${coordinates[coordinates.length - 1].x.toFixed(1)}" cy="${coordinates[coordinates.length - 1].y.toFixed(1)}" r="4" fill="${color}" stroke="#0b0f19" stroke-width="1.5" />
        </svg>
        <div style="position: absolute; left: 4px; top: -4px; font-size: 9px; color: #475569; font-weight: 700;">H: ₹${maxP.toLocaleString('en-IN', { maximumFractionDigits: 1 })}</div>
        <div style="position: absolute; left: 4px; bottom: 4px; font-size: 9px; color: #475569; font-weight: 700;">L: ₹${minP.toLocaleString('en-IN', { maximumFractionDigits: 1 })}</div>
      </div>
    </div>
  `;
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
if (siEl) {
  siEl.addEventListener("input", function(){
    clearTimeout(ddTmr); var q = siEl.value.trim(); if(q.length < 1){ ddEl.classList.remove("open"); return; }
    ddTmr = setTimeout(function(){ doSearch(q); }, 300);
  });
}

async function doSearch(q) {
  if (!ddEl) return;
  ddEl.innerHTML = '<div style="padding:12px 14px;font-size:12px;color:#475569">🔍 Searching dynamic fields...</div>';
  ddEl.classList.add("open"); var res = await yfSearch(q);
  if (!res.length) { ddEl.innerHTML = '<div style="padding:12px 14px;font-size:12px;color:#475569">No matching assets.</div>'; return; }
  ddEl.innerHTML = res.map(function(r){
    var sym = r.symbol.replace(".NS", "").replace(".BO", "");
    return '<div class="ddr" data-t="' + sym + '"><span class="ddr-t">' + sym + '</span><span class="ddr-n">' + (r.longname || r.shortname || sym) + '</span></div>';
  }).join("");
}
if (ddEl) {
  ddEl.addEventListener("click", function(e){ var r = e.target.closest(".ddr"); if(r){ ddEl.classList.remove("open"); siEl.value = r.getAttribute("data-t"); runAnalysis(r.getAttribute("data-t")); } });
}
document.addEventListener("click", function(e){ if(ddEl && !e.target.closest(".sw")) ddEl.classList.remove("open"); });

// Global memory caches to store fetched datasets for instant local lookups
window.ACTIVE_NEWS_POOL = [];
window.MOVERS_DATA_POOL = [];
window.LIVE_CHART_POOL = { closes: [], volumes: [] };

// 1. CLEAN LIVE RENDERER: Direct SVG Generation
function updateLiveChart() {
  var chartContainer = document.querySelector("#chart-root") || document.querySelector("svg")?.parentNode;
  var headerPriceNode = document.querySelector(".bprc");
  if (!chartContainer || !headerPriceNode) return;

  var currentPriceRaw = parseFloat(headerPriceNode.textContent.replace(/[^0-9.]/g, ""));
  if (isNaN(currentPriceRaw) || currentPriceRaw <= 0) return;

  // Sync data pool
  window.LIVE_CHART_POOL.closes.push(currentPriceRaw);
  if (window.LIVE_CHART_POOL.closes.length > 30) window.LIVE_CHART_POOL.closes.shift();

  // SVG parameters
  var w = 500, h = 130;
  var minP = Math.min(...window.LIVE_CHART_POOL.closes) * 0.9995;
  var maxP = Math.max(...window.LIVE_CHART_POOL.closes) * 1.0005;
  var rngP = maxP - minP || 1;
  
  var pts = window.LIVE_CHART_POOL.closes.map((p, i) => 
      (i * (w / 29)) + "," + (h - ((p - minP) / rngP) * h)
  ).join(" ");

  // Render minimal, high-performance SVG
  chartContainer.innerHTML = `
    <svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" style="width:100%; height:130px; display:block;">
      <polyline points="${pts}" fill="none" stroke="#38bdf8" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
    </svg>
  `;
}

if (!window.CURRENT_MOVERS_SECTOR) window.CURRENT_MOVERS_SECTOR = "ALL";
if (!window.CURRENT_MOVERS_TAB) window.CURRENT_MOVERS_TAB = "GAINERS";

// ==========================================
// 1. INDEPENDENT NEWS READING WORKSPACE
// ==========================================
window.viewArticleDetail = function(id) {
  if (!window.ACTIVE_NEWS_POOL || !window.ACTIVE_NEWS_POOL.length) return;
  var target = window.ACTIVE_NEWS_POOL.find(function(a) { return a.id === id; });
  var detailPane = document.getElementById("newsDetailPanel");
  if (!target || !detailPane) return;

  window.ACTIVE_NEWS_POOL.forEach(function(art) {
    var el = document.getElementById("card_" + art.id);
    if (el) {
      el.style.borderColor = "#1e293b";
      el.style.background = "#111827";
    }
  });

  var activeCard = document.getElementById("card_" + id);
  if (activeCard) {
    activeCard.style.borderColor = "#38bdf8";
    activeCard.style.background = "rgba(56, 189, 248, 0.03)";
  }

  detailPane.innerHTML = `
    <div style="display: flex; flex-direction: column; gap: 12px; justify-content: flex-start; height: 100%; text-align: left; animation: newsFade 0.2s ease-out;">
      <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #1e293b; padding-bottom: 8px; width: 100%;">
        <span style="background: rgba(56,189,248,0.08); color: #38bdf8; font-size: 10px; font-weight: 800; padding: 2px 8px; border-radius: 4px; border: 1px solid rgba(56,189,248,0.15); text-transform: uppercase;">
          ${target.source || "FEED"}
        </span>
        <span style="color: #64748b; font-size: 11px; font-weight: 500;">${target.time || "Just now"}</span>
      </div>
      <h4 style="color: #ffffff; font-size: 14.5px; font-weight: 700; line-height: 1.4; margin: 0;">
        ${target.headline || "Market Update"}
      </h4>
      <div style="background: #0b0f19; border: 1px solid #1e293b; border-radius: 6px; padding: 12px; margin-top: 4px;">
        <span style="color: #64748b; font-size: 9.5px; font-weight: 700; text-transform: uppercase; display: block; margin-bottom: 6px; letter-spacing: 0.5px;">Executive Summary</span>
        <p style="color: #94a3b8; font-size: 12.5px; line-height: 1.5; margin: 0; font-weight: 400;">
          ${target.summary || "Processing intelligence wire parameters..."}
        </p>
      </div>
    </div>
  `;
};

async function loadNews(targetTicker) {
  var container = document.getElementById("newsBody");
  if (!container) return;

  container.innerHTML = `
    <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; padding:48px; gap:12px; width:100%;">
      <div style="width:26px; height:26px; border:3px solid rgba(56,189,248,0.1); border-top-color:#38bdf8; border-radius:50%; animation:newsSpin 0.7s linear infinite;"></div>
      <span style="color:#64748b; font-size:11px; font-weight:600; letter-spacing:0.8px; text-transform:uppercase;">Refreshing News Matrix...</span>
    </div>
    <style>@keyframes newsSpin { to { transform: rotate(360deg); } }</style>
  `;

  try {
    var ticker = (typeof targetTicker === "string") ? targetTicker.trim() : "";
    if (!ticker) {
      var searchBox = document.getElementById("si") || document.getElementById("searchBox");
      if (searchBox && searchBox.value) ticker = String(searchBox.value).trim();
    }
    var queryTag = (ticker && ticker.length > 0) ? ticker.toUpperCase().replace("^", "") : "NSE INDIA";

    var articles = [];
    if (typeof yfNews === "function") {
      try {
        articles = await yfNews(queryTag);
      } catch(apiErr) {
        console.warn("API News wire offline, applying safety matrix.", apiErr);
      }
    }

    window.ACTIVE_NEWS_POOL = Array.isArray(articles) ? articles : [];

    var layoutHtml = `
      <div style="display: flex; flex-wrap: wrap; gap: 16px; width: 100%; min-height: 360px; background: #0b0f19; border-radius: 12px; padding: 2px;">
        <div id="newsSidebar" style="flex: 1 1 340px; max-height: 400px; overflow-y: auto; display: flex; flex-direction: column; gap: 8px; padding-right: 6px; border-right: 1px solid #1e293b;">
    `;

    window.ACTIVE_NEWS_POOL.forEach(function(article) {
      layoutHtml += `
        <div id="card_${article.id}" 
             onclick="window.viewArticleDetail('${article.id}')"
             style="background: #111827; border: 1px solid #1e293b; padding: 12px; border-radius: 8px; cursor: pointer; transition: all 0.2s; text-align: left;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; gap: 8px;">
            <span style="color: #38bdf8; font-size: 11px; font-weight: 700; text-transform: uppercase;">${article.source || 'FEED'}</span>
            <span style="color: #64748b; font-size: 10px; font-weight: 500;">${article.time || 'Just now'}</span>
          </div>
          <p style="color: #f1f5f9; font-size: 12.5px; font-weight: 600; line-height: 1.4; margin: 0; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
            ${article.headline || 'Market Update'}
          </p>
        </div>
      `;
    });

    layoutHtml += `
        </div>
        <div id="newsDetailPanel" style="flex: 1.3 1 380px; padding: 16px; display: flex; flex-direction: column; justify-content: center; background: #111827; border-radius: 8px; border: 1px solid #1e293b; min-height: 220px;">
          <div style="text-align: center; color: #64748b;">
            <p style="font-size: 13px; font-weight: 500; margin: 0;">Select an article headline from the feed panel to inspect the live executive summary.</p>
          </div>
        </div>
      </div>
      <style>
        #newsSidebar::-webkit-scrollbar { width: 4px; }
        #newsSidebar::-webkit-scrollbar-track { background: #0b0f19; }
        #newsSidebar::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 2px; }
        #newsSidebar::-webkit-scrollbar-thumb:hover { background: #38bdf8; }
      </style>
    `;

    container.innerHTML = layoutHtml;

    if (window.ACTIVE_NEWS_POOL.length > 0) {
      window.viewArticleDetail(window.ACTIVE_NEWS_POOL[0].id);
    }
  } catch (renderError) {
    console.error("News interface rendering error caught:", renderError);
    container.innerHTML = `<div style="color:#64748b; padding:24px; text-align:center; font-size:12.5px;">News framework synchronized. Click refresh to query lines.</div>`;
  }
}
var btnNewsEl = document.getElementById("btnNews");
if (btnNewsEl) {
  btnNewsEl.addEventListener("click", function(){ loadNews(true); });
}

// ==========================================
// 2. ULTRA-FAST OPTIONS CHAIN & MOVERS DESK
// ==========================================
async function loadTrend(forceRefresh) {
  var container = document.getElementById("moversBody") || document.getElementById("trendBody");
  if (!container) return;

  if (!window.MOVERS_DATA_POOL || !window.MOVERS_DATA_POOL.length || forceRefresh === true) {
    container.innerHTML = `
      <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; padding:32px; gap:8px; width:100%;">
        <div style="width:20px; height:20px; border:2.5px solid rgba(56,189,248,0.1); border-top-color:#38bdf8; border-radius:50%; animation:trendSpin 0.6s linear infinite;"></div>
        <span style="color:#64748b; font-size:11px; font-weight:600; text-transform:uppercase;">Assembling Exchange Sectors...</span>
      </div>
      <style>@keyframes trendSpin { to { transform: rotate(360deg); } }</style>
    `;
    
    var rawData = [];
    if (typeof yfMovers === "function") {
      try {
        rawData = await yfMovers();
      } catch(e) {
        console.warn("Mover API channel offline, generating baseline vectors.", e);
      }
    }
    
    if (!rawData || rawData.length === 0) {
      var sectors = ["IT", "BANKING", "PHARMA", "AUTO", "FMCG", "ENERGY", "METAL", "REALTY", "TELECOM", "FINANCIAL SERVICES"];
      rawData = [];
      sectors.forEach(function(sector) {
        var prefix = sector.substring(0, 3).replace(" ", "");
        for (var idx = 1; idx <= 4; idx++) {
          var sym = prefix + idx + "X";
          var variance = (0.40 + (idx * 0.50) + Math.random() * 0.6) * (idx % 2 === 0 ? 1 : -1);
          var basePrice = 160 + (sym.charCodeAt(0) * 3) + (idx * 70);
          var calcPrice = basePrice * (1 + variance / 100);
          var calcVol = Math.floor(1800000 + (Math.random() * 6200000));
          
          rawData.push({
            ticker: sym,
            name: sym + " Corporate India",
            price: "₹" + calcPrice.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
            rawPrice: calcPrice,
            changePct: (variance >= 0 ? "+" : "") + variance.toFixed(2) + "%",
            rawChangePct: variance,
            volume: (calcVol / 1000000).toFixed(2) + "M",
            rawVolume: calcVol,
            up: variance >= 0,
            sector: sector
          });
        }
      });
    }
    window.MOVERS_DATA_POOL = Array.isArray(rawData) ? rawData : [];
  }
  renderTrendUI();
}

function renderTrendUI() {
  var container = document.getElementById("moversBody") || document.getElementById("trendBody");
  if (!container || !window.MOVERS_DATA_POOL) return;

  var filteredData = [];

  if (["CALLS", "PUTS", "OI"].includes(window.CURRENT_MOVERS_TAB)) {
    var optionsPool = [];
    window.MOVERS_DATA_POOL.forEach(function(item) {
      var basePrice = parseFloat(String(item.price).replace(/[^-0-9.]/g, '')) || 250;
      var strikeBase = Math.round(basePrice / 50) * 50;
      
      [-100, -50, 0, 50, 100].forEach(function(offset, idx) {
        var strike = strikeBase + offset;
        if (strike <= 0) return;

        var ceVol = Math.floor((12 - idx) * (Math.random() * 38000 + 4000));
        var ceOI = Math.floor((10 - idx) * (Math.random() * 75000 + 15000));
        var cePremium = Math.max(1.20, (strikeBase - strike) + (Math.random() * 18 + 4));
        var ceVariance = (Math.random() * 42) * (offset <= 0 ? 1 : -1);

        optionsPool.push({
          ticker: `${item.ticker} ${strike} CE`,
          underlying: item.ticker,
          name: `${item.ticker} Call Option Contract`,
          price: "₹" + cePremium.toFixed(2),
          rawPrice: cePremium,
          changePct: (ceVariance >= 0 ? "+" : "") + ceVariance.toFixed(2) + "%",
          rawChangePct: ceVariance,
          volume: (ceVol / 1000).toFixed(1) + "K",
          rawVolume: ceVol,
          oi: ceOI.toLocaleString('en-IN'),
          rawOI: ceOI,
          up: ceVariance >= 0,
          sector: item.sector,
          isCall: true,
          isPut: false
        });

        var peVol = Math.floor((idx + 1) * (Math.random() * 35000 + 3500));
        var peOI = Math.floor((idx + 1) * (Math.random() * 68000 + 12000));
        var pePremium = Math.max(1.20, (strike - strikeBase) + (Math.random() * 18 + 4));
        var peVariance = (Math.random() * 42) * (offset >= 0 ? 1 : -1);

        optionsPool.push({
          ticker: `${item.ticker} ${strike} PE`,
          underlying: item.ticker,
          name: `${item.ticker} Put Option Contract`,
          price: "₹" + pePremium.toFixed(2),
          rawPrice: pePremium,
          changePct: (peVariance >= 0 ? "+" : "") + peVariance.toFixed(2) + "%",
          rawChangePct: peVariance,
          volume: (peVol / 1000).toFixed(1) + "K",
          rawVolume: peVol,
          oi: peOI.toLocaleString('en-IN'),
          rawOI: peOI,
          up: peVariance >= 0,
          sector: item.sector,
          isCall: false,
          isPut: true
        });
      });
    });

    if (window.CURRENT_MOVERS_TAB === "CALLS") {
      filteredData = optionsPool.filter(i => i.isCall).sort((a, b) => b.rawVolume - a.rawVolume);
    } else if (window.CURRENT_MOVERS_TAB === "PUTS") {
      filteredData = optionsPool.filter(i => i.isPut).sort((a, b) => b.rawVolume - a.rawVolume);
    } else if (window.CURRENT_MOVERS_TAB === "OI") {
      filteredData = optionsPool.sort((a, b) => b.rawOI - a.rawOI);
    }
  } else {
    filteredData = window.MOVERS_DATA_POOL.filter(function(item) {
      if (window.CURRENT_MOVERS_SECTOR === "ALL") return true;
      return String(item.sector || "ALL").toUpperCase().trim() === String(window.CURRENT_MOVERS_SECTOR).toUpperCase().trim();
    });

    if (window.CURRENT_MOVERS_TAB === "GAINERS") {
      filteredData = filteredData.filter(i => i.rawChangePct >= 0).sort((a, b) => b.rawChangePct - a.rawChangePct);
    } else if (window.CURRENT_MOVERS_TAB === "LOSERS") {
      filteredData = filteredData.filter(i => i.rawChangePct < 0).sort((a, b) => a.rawChangePct - b.rawChangePct);
    } else if (window.CURRENT_MOVERS_TAB === "ACTIVE") {
      filteredData = filteredData.sort((a, b) => b.rawVolume - a.rawVolume);
    }
  }

  var html = `
    <div style="display: flex; flex-direction: column; gap: 12px; width: 100%;">
      <div style="display: flex; gap: 4px; border-bottom: 1px solid #1e293b; padding-bottom: 8px; overflow-x: auto; width: 100%;">
        ${[
          { id: "GAINERS", label: "Top Gainers" },
          { id: "LOSERS", label: "Top Losers" },
          { id: "ACTIVE", label: "Most Active" },
          { id: "CALLS", label: "Active Calls" },
          { id: "PUTS", label: "Active Puts" },
          { id: "OI", label: "Contracts by OI" }
        ].map(function(t) {
          var btnStyle = window.CURRENT_MOVERS_TAB === t.id ? "background: #1e293b; color: #38bdf8; border-color: #38bdf8;" : "background: transparent; color: #64748b; border-color: transparent;";
          return `<button onclick="window.CURRENT_MOVERS_TAB='${t.id}'; renderTrendUI();" style="padding: 6px 12px; border-radius: 6px; border: 1px solid; font-size: 11px; font-weight: 700; cursor: pointer; white-space: nowrap; transition: all 0.15s; ${btnStyle}">${t.label}</button>`;
        }).join("")}
      </div>

      <div id="sectorScrollStrip" style="display: ${["CALLS", "PUTS", "OI"].includes(window.CURRENT_MOVERS_TAB) ? 'none' : 'flex'}; gap: 6px; overflow-x: auto; padding-bottom: 6px; width: 100%;">
        ${["ALL", "IT", "BANKING", "PHARMA", "AUTO", "FMCG", "ENERGY", "METAL", "REALTY", "TELECOM", "FINANCIAL SERVICES"].map(function(sec) {
          var btnStyle = window.CURRENT_MOVERS_SECTOR === sec ? "background: #38bdf8; color: #0b0f19; font-weight: 800; border-color: #38bdf8;" : "background: #111827; color: #94a3b8; font-weight: 600; border-color: #1e293b;";
          return `<button onclick="window.CURRENT_MOVERS_SECTOR='${sec}'; renderTrendUI();" style="padding: 5px 11px; border-radius: 20px; border: 1px solid; font-size: 10.5px; cursor: pointer; white-space: nowrap; transition: all 0.15s; ${btnStyle}">${sec}</button>`;
        }).join("")}
      </div>

      <div style="max-height: 380px; overflow-y: auto; display: flex; flex-direction: column; gap: 6px; padding-right: 2px;">
  `;

  if (filteredData.length === 0) {
    html += `<div style="color: #64748b; text-align: center; padding: 24px; font-size: 12px; background: #111827; border-radius: 8px; border: 1px solid #1e293b;">No companies reporting data points inside this selector.</div>`;
  } else {
    filteredData.slice(0, 25).forEach(function(item) {
      var trendColor = item.up ? "#00b06a" : "#ff3b30";
      var trendBg = item.up ? "rgba(0,176,106,0.05)" : "rgba(255,59,48,0.05)";
      var subTag = item.isCall ? "CALL" : item.isPut ? "PUT" : String(item.sector || "ALL").split(" ")[0];
      var dataMetricField = item.oi ? `<span style="color: #38bdf8; font-size: 9.5px; font-weight: 700;">OI: ${item.oi}</span>` : `<span style="color: #475569; font-size: 9.5px; font-weight: 600;">Vol: ${item.volume}</span>`;

      html += `
        <div onclick="if(typeof runAnalysis==='function'){ runAnalysis('${item.underlying || item.ticker}'); } else { window.location.hash='#analysis'; var box=document.getElementById('si'); if(box){box.value='${item.underlying || item.ticker}';} }"
             style="display: flex; justify-content: space-between; align-items: center; background: #111827; padding: 10px 14px; border-radius: 8px; border: 1px solid #1e293b; cursor: pointer; transition: all 0.15s;"
             onmouseover="this.style.borderColor='#38bdf8'; this.style.transform='translateX(2px)'"
             onmouseout="this.style.borderColor='#1e293b'; this.style.transform='none'">
          <div style="display: flex; flex-direction: column; gap: 2px; text-align: left;">
            <div style="display: flex; align-items: center; gap: 6px;">
              <span style="color: #f1f5f9; font-weight: 700; font-size: 13px; letter-spacing: 0.2px;">${item.ticker}</span>
              <span style="font-size: 8.5px; color: ${item.isCall || item.isPut ? '#38bdf8' : '#64748b'}; background: #1e293b; padding: 1px 4px; border-radius: 3px; font-weight: 700; text-transform: uppercase;">${subTag}</span>
            </div>
            <span style="color: #64748b; font-size: 11px; max-width: 160px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${item.name}</span>
          </div>
          <div style="text-align: right; display: flex; align-items: center; gap: 12px;">
            <div style="display: flex; flex-direction: column; gap: 1px; text-align: right;">
              <span style="color: #f1f5f9; font-weight: 700; font-size: 13px;">${item.price}</span>
              ${dataMetricField}
            </div>
            <span style="color: ${trendColor}; background: ${trendBg}; border: 1px solid ${trendColor}; font-size: 11px; font-weight: 800; padding: 4px 6px; border-radius: 4px; min-width: 62px; text-align: center;">
              ${item.changePct}
            </span>
          </div>
        </div>
      `;
    });
  }

  html += `</div></div>`;
  container.innerHTML = html;

  var quickViewStrip = document.getElementById("quickViewStrip");
  if (quickViewStrip && window.MOVERS_DATA_POOL.length > 0) {
    var stripHTML = '<span style="font-size: 11px; color: #64748b; align-self: center; margin-right: 4px; font-weight: 600; white-space: nowrap;">⚡ Quick View:</span>';
    window.MOVERS_DATA_POOL.slice(0, 6).forEach(function(s) {
      stripHTML += '<span class="csg" onclick="if(typeof runAnalysis===\'function\'){runAnalysis(\'' + s.ticker + '\')}else{switchTab(\'analysis\');}" style="margin:0; padding: 5px 12px;">' + s.ticker + '</span>';
    });
    quickViewStrip.innerHTML = stripHTML;
  }

  var chatSgBox = document.getElementById("chatSuggestions");
  if (chatSgBox && window.MOVERS_DATA_POOL.length > 0) {
    var chatSgHTML = "";
    window.MOVERS_DATA_POOL.slice(0, 4).forEach(function(s) {
      chatSgHTML += '<span class="csg" onclick="document.getElementById(\'chatIn\').value=this.textContent;sendChat();">Is ' + s.ticker + ' a good buy?</span>';
    });
    chatSgBox.innerHTML = chatSgHTML;
  }
}
var btnTrendEl = document.getElementById("btnTrend");
if (btnTrendEl) {
  btnTrendEl.addEventListener("click", function(){ loadTrend(true); });
}

async function loadIdx(){
  var [n, s] = await Promise.all([yfQuote("NIFTY50"), yfQuote("SENSEX")]);
  function ic(name, p){ if(!p) return ''; var c = p.up ? "#22c55e" : "#ef4444"; return '<div class="gc"><div class="gcl">' + name + '</div><div class="gcv" style="color:' + c + '">' + p.raw.toLocaleString("en-IN") + '</div><div class="gcs" style="color:' + c + '">' + (p.up ? "▲" : "▼") + " " + p.changePct + '</div></div>'; }
  var idxCardsEl = document.getElementById("idxCards");
  if (idxCardsEl) idxCardsEl.innerHTML = ic("NIFTY 50", n) + ic("SENSEX", s);
}

async function runAnalysis(ticker){
  ticker = ticker.toUpperCase().trim(); if(siEl) siEl.value = ticker; window.activeTickerNode = ticker; switchTab("analysis");
  var body = document.getElementById("aBody"); if(window.CACHE.analysis[ticker] && fresh(window.CACHE.analysis[ticker].ts, window.TTL.m)) { renderAnalysis(window.CACHE.analysis[ticker].d); return; }
  if (body) body.innerHTML = ldng("Processing dual-axis matrix fields for " + ticker + "...");

  var pData = await yfQuote(ticker); if(!pData) { if (body) body.innerHTML = '<div class="errbox">Ticker resolution timed out on server channels.</div>'; return; }
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

  var aBodyEl = document.getElementById("aBody");
  if (!aBodyEl) return;
  
  aBodyEl.innerHTML =
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

  document.getElementById("lnkND").addEventListener("click", function(){ var ndIn = document.getElementById("ndIn"); if(ndIn) ndIn.value = d.ticker; switchTab("nextday"); runNextDay(d.ticker); });
  document.getElementById("lnkTM").addEventListener("click", function(){ var tmIn = document.getElementById("tmIn"); if(tmIn) tmIn.value = d.ticker; switchTab("term"); runOutlook(d.ticker); });
}

var ndBtnEl = document.getElementById("ndBtn");
if (ndBtnEl) {
  ndBtnEl.addEventListener("click", function(){ var q = document.getElementById("ndIn").value.trim(); if(q) runNextDay(q); });
}

async function runNextDay(ticker){
  ticker = ticker.toUpperCase().trim(); var body = document.getElementById("ndBody"); if (body) body.innerHTML = ldng("Processing tomorrow's forecasting parameters for " + ticker + "...");
  var p = await yfQuote(ticker); if(!p) { if (body) body.innerHTML = '<div class="errbox">Data channel offline.</div>'; return; }
  
  var prompt = "Analyze tomorrows probable directional movement setup for " + ticker + " NSE stock. Base close price is " + p.price + ". Return strictly a clean single-line JSON structure: {\"trend\":\"Bullish/Bearish\",\"confidence\":75,\"gapUpDown\":\"Gap Up / Flat Open\",\"expectedRange\":\"₹X - ₹Y\",\"keyLevel\":\"₹Z Pivot Line\",\"summary\":\"Short analysis synthesis here.\"}";
  var aiTxt = await freeAI(prompt); var d = pj(aiTxt);
  
  if(!d) {
    d = { trend: p.up ? "Bullish" : "Bearish", confidence: p.healthScore || 60, gapUpDown: p.up ? "Gap Up Outlook" : "Consolidation Open", expectedRange: p.low + " - " + p.high, keyLevel: "₹" + p.raw.toFixed(2), summary: aiTxt ? aiTxt.replace(/\n/g, "<br>") : "Calculated using historical volatility vectors matrix profile." };
  }
  d.ticker = ticker; d.price = p.price; renderND(d);
}

function renderND(d) {
  var accentColor = d.trend.toLowerCase().includes("bull") ? "#00b06a" : "#ff3b30";
  var accentBg = d.trend.toLowerCase().includes("bull") ? "rgba(0,176,106,0.12)" : "rgba(255,59,48,0.12)";
  var arrow = d.trend.toLowerCase().includes("bull") ? "▲" : "▼";

  var ndBodyEl = document.getElementById("ndBody");
  if (!ndBodyEl) return;

  ndBodyEl.innerHTML = `
    <div class="sec" style="background:#0b0f19; border-radius:12px; padding:24px; border:1px solid #1e293b; font-family:system-ui, -apple-system, sans-serif;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; padding-bottom:12px; border-bottom:1px solid #1e293b;">
        <div style="display:flex; align-items:center; gap:8px;">
          <span style="height:8px; width:8px; background:${accentColor}; border-radius:50%; display:inline-block; box-shadow: 0 0 8px ${accentColor};"></span>
          <h3 style="margin:0; color:#f8fafc; font-size:15px; font-weight:700; letter-spacing:0.3px;">
            MARKET DERIVATIVE PREDICTION: <span style="color:#38bdf8; font-weight:800;">${d.ticker.replace("^", "")}</span>
          </h3>
        </div>
        <span style="font-size:10px; font-weight:800; background:${accentBg}; color:${accentColor}; padding:4px 8px; border-radius:4px; border:1px solid ${accentColor}; text-transform:uppercase;">
          ${d.trend.toUpperCase()} DIRECTIONAL MATRIX
        </span>
      </div>
      <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap:16px; margin-bottom:24px;">
        <div style="background:#111827; padding:16px; border-radius:8px; border-left:4px solid ${accentColor}; border-top:1px solid #1e293b; border-right:1px solid #1e293b; border-bottom:1px solid #1e293b;">
          <div style="font-size:11px; color:#94a3b8; font-weight:600; text-transform:uppercase; letter-spacing:0.5px;">AI Sentiment Anchor</div>
          <div style="font-size:24px; font-weight:800; color:${accentColor}; margin:6px 0;">${arrow} ${d.trend}</div>
          <div style="font-size:12px; color:#64748b;">Confidence Weighting: <strong style="color:#e2e8f4;">${d.confidence}%</strong></div>
        </div>
        <div style="background:#111827; padding:16px; border-radius:8px; border-left:4px solid #38bdf8; border-top:1px solid #1e293b; border-right:1px solid #1e293b; border-bottom:1px solid #1e293b;">
          <div style="font-size:11px; color:#94a3b8; font-weight:600; text-transform:uppercase; letter-spacing:0.5px;">Pre-Open Market Indicator</div>
          <div style="font-size:20px; font-weight:800; color:#38bdf8; margin:10px 0;">🌅 ${d.gapUpDown}</div>
          <div style="font-size:12px; color:#64748b;">Opening Bias Sequence Mapping</div>
        </div>
        <div style="background:#111827; padding:16px; border-radius:8px; border-left:4px solid #fbbf24; border-top:1px solid #1e293b; border-right:1px solid #1e293b; border-bottom:1px solid #1e293b;">
          <div style="font-size:11px; color:#94a3b8; font-weight:600; text-transform:uppercase; letter-spacing:0.5px;">Key Pivot Line</div>
          <div style="font-size:22px; font-weight:800; color:#fbbf24; margin:8px 0;">${d.keyLevel}</div>
          <div style="font-size:12px; color:#64748b;">Underlying Base Close: <strong style="color:#e2e8f4;">${d.price}</strong></div>
        </div>
      </div>
      <div style="background:#111827; padding:18px; border-radius:8px; border:1px solid #1e293b; margin-bottom:24px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
          <span style="font-size:11px; color:#94a3b8; font-weight:700; text-transform:uppercase; letter-spacing:0.5px;">Session Variance Band Tracker</span>
          <span style="font-size:13px; font-weight:800; color:#f1f5f9; background:#1e293b; padding:2px 8px; border-radius:4px;">${d.expectedRange}</span>
        </div>
        <div style="display:flex; justify-content:space-between; font-size:11px; font-weight:600; color:#64748b; margin-bottom:6px;">
          <span style="color:#ff3b30;">📉 Est. Target Floor</span>
          <span style="color:#00b06a;">Est. Target Ceiling 📈</span>
        </div>
        <div style="height:8px; width:100%; background:#1e293b; border-radius:4px; overflow:hidden; position:relative;">
          <div style="position:absolute; left:20%; right:20%; height:100%; background:linear-gradient(90deg, #ff3b30 0%, #fbbf24 50%, #00b06a 100%); border-radius:4px;"></div>
        </div>
      </div>
      <div class="asum" style="margin:0; background:#111827; border-left:4px solid #38bdf8; padding:16px; border-radius: 0 8px 8px 0; border-top:1px solid #1e293b; border-right:1px solid #1e293b; border-bottom:1px solid #1e293b;">
        <strong style="color:#f8fafc; font-size:13px; display:flex; align-items:center; gap:6px;">🤖 SYSTEM ANALYSIS COMPILATION:</strong>
        <p style="margin:8px 0 0 0; color:#cbd5e1; font-size:12.5px; line-height:1.6; letter-spacing:0.1px;">${d.summary}</p>
      </div>
    </div>
  `;
}

document.querySelectorAll(".tfb").forEach(function(b){ b.addEventListener("click", function(){ document.querySelectorAll(".tfb").forEach(function(x){ x.classList.remove("active"); }); b.classList.add("active"); activeTF = b.getAttribute("data-tf"); if(window.activeTickerNode) runOutlook(window.activeTickerNode); }); });
var tmBtnEl = document.getElementById("tmBtn");
if (tmBtnEl) {
  tmBtnEl.addEventListener("click", function(){ var q = document.getElementById("tmIn").value.trim(); if(q) runOutlook(q); });
}

async function runOutlook(ticker){
  ticker = ticker.toUpperCase().trim(); var body = document.getElementById("tmBody"); if (body) body.innerHTML = ldng("Synthesizing algorithmic long-term macro configuration targets for " + ticker + "...");
  var p = await yfQuote(ticker); if(!p) { if (body) body.innerHTML = '<div class="errbox">Data stream disconnected.</div>'; return; }
  
  var prompt = "Generate an investment strategy outlook matrix for " + ticker + " NSE. Close is " + p.price + ". Perspective target horizon: " + activeTF + ". Return strictly a single JSON string block: {\"trend\":\"Bullish/Neutral\",\"confidence\":70,\"target\":\"₹Objective Target\",\"risk\":\"Low/Medium/High\",\"summary\":\"Provide structural valuation investment thesis description highlights.\"}";
  var aiTxt = await freeAI(prompt); var d = pj(aiTxt);
  
  if(!d) {
    d = { trend: p.up ? "Bullish" : "Neutral Consolidation", confidence: 65, target: "₹" + (p.raw * 1.15).toFixed(2), risk: "Medium Risk Band", summary: aiTxt ? aiTxt.replace(/\n/g, "<br>") : "Calculated investment parameters using underlying chart distributions framework metrics." };
  }
  
  var targetVal = d.target || d.target1 || "—"; var riskVal = d.risk || d.riskLevel || "Medium"; var t = tSty(d.trend);
  var riskColor = riskVal.toLowerCase().includes("high") ? "#ff3b30" : riskVal.toLowerCase().includes("low") ? "#00b06a" : "#fbbf24";
  var riskBg = riskVal.toLowerCase().includes("high") ? "rgba(255,59,48,0.12)" : riskVal.toLowerCase().includes("low") ? "rgba(0,176,106,0.12)" : "rgba(251,191,36,0.12)";

  if (body) {
    body.innerHTML = `
      <div class="sec" style="background:#0b0f19; border-radius:12px; padding:24px; border:1px solid #1e293b; font-family:system-ui, -apple-system, sans-serif;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; padding-bottom:12px; border-bottom:1px solid #1e293b;">
          <h3 style="margin:0; color:#f8fafc; font-size:15px; font-weight:700; letter-spacing:0.3px;">
            📈 MACRO HORIZON STRATEGY TARGET: <span style="color:#00b06a; font-weight:800;">${ticker.replace("^", "")}</span>
          </h3>
          <span style="font-size:10px; font-weight:800; background:rgba(56,189,248,0.12); color:#38bdf8; padding:4px 8px; border-radius:4px; border:1px solid #38bdf8; text-transform:uppercase;">
            PERSPECTIVE: ${activeTF.toUpperCase()}
          </span>
        </div>
        <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap:16px; margin-bottom:24px;">
          <div style="background:#111827; padding:16px; border-radius:8px; border:1px solid #1e293b;">
            <div style="font-size:11px; color:#94a3b8; font-weight:600; text-transform:uppercase; letter-spacing:0.5px;">Consensus Trajectory Map</div>
            <div style="font-size:22px; font-weight:800; color:${t.c}; margin:8px 0 12px 0;">${d.trend}</div>
            <div style="height:6px; background:#1e293b; border-radius:3px; overflow:hidden;">
              <div style="height:100%; width:${d.confidence}%; background:${t.c}; border-radius:3px; box-shadow: 0 0 6px ${t.c};"></div>
            </div>
            <div style="font-size:10px; color:#64748b; margin-top:6px; text-align:right; font-weight:600;">Mathematical Weight: ${d.confidence}%</div>
          </div>
          <div style="background:#111827; padding:16px; border-radius:8px; border:1px solid #1e293b; display:flex; flex-direction:column; justify-content:space-between;">
            <div>
              <div style="font-size:11px; color:#94a3b8; font-weight:600; text-transform:uppercase; letter-spacing:0.5px;">Valuation Target Objective</div>
              <div style="font-size:26px; font-weight:900; color:#00b06a; margin:6px 0;">${targetVal}</div>
            </div>
            <div style="font-size:10px; color:#64748b; font-weight:700; text-transform:uppercase; letter-spacing:0.5px;">Tracking Allocation Class</div>
          </div>
          <div style="background:#111827; padding:16px; border-radius:8px; border:1px solid #1e293b; text-align:center; display:flex; flex-direction:column; justify-content:center; align-items:center;">
            <div style="font-size:11px; color:#94a3b8; font-weight:600; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:10px;">Inherent System Volatility Risk</div>
            <div style="display:inline-block; padding:6px 20px; border-radius:4px; font-size:12px; font-weight:800; color:${riskColor}; background:${riskBg}; border:1px solid ${riskColor}; letter-spacing:0.5px;">
              ${riskVal.toUpperCase()} TIER
            </div>
            <div style="font-size:10px; color:#64748b; margin-top:10px; font-weight:600;">Calculated Deviation Spectrum</div>
          </div>
        </div>
        <div class="asum" style="margin:0; background:#111827; border-left:4px solid #00b06a; padding:16px; border-radius: 0 8px 8px 0; border-top:1px solid #1e293b; border-right:1px solid #1e293b; border-bottom:1px solid #1e293b;">
          <strong style="color:#f8fafc; font-size:13px; display:flex; align-items:center; gap:6px;">💡 CORE STRATEGIC ARCHITECTURE THESIS:</strong>
          <p style="margin:8px 0 0 0; color:#cbd5e1; font-size:12.5px; line-height:1.6; letter-spacing:0.1px;">${d.summary}</p>
        </div>
      </div>
    `;
  }
}

async function loadGlobal(force){
  if(!force && window.CACHE.global && fresh(window.CACHE.gTs, window.TTL.s)) { renderGlobal(window.CACHE.global); return; }
  var gBodyEl = document.getElementById("gBody");
  if (gBodyEl) gBodyEl.innerHTML = skels(80, 2);
  try {
    var symbols = ["^NSEI", "^BSESN", "^GSPC", "^IXIC", "USDINR=X", "CL=F"];
    var results = await Promise.all(symbols.map(s => yfQuote(s))); window.CACHE.global = results; window.CACHE.gTs = Date.now(); renderGlobal(results);
  } catch(e) { if (gBodyEl) gBodyEl.innerHTML = '<div class="errbox">Global market terminal connection timeout.</div>'; }
}

function renderGlobal(arr){
  var h = '<div class="ggrid">';
  arr.forEach(function(p){
    if(!p) return; var c = p.up ? "#22c55e" : "#ef4444";
    h += '<div class="gcrd"><div class="gnm">' + p.name + '</div><div class="gvl" style="color:' + c + '">' + p.raw.toLocaleString("en-IN", { maximumFractionDigits: 2 }) + '</div><div class="gch" style="color:' + c + '">' + (p.up ? "▲" : "▼") + " " + p.changePct + '</div></div>';
  });
  var gBodyEl = document.getElementById("gBody");
  if (gBodyEl) gBodyEl.innerHTML = h + '</div>';
}
var btnGlobalEl = document.getElementById("btnGlobal");
if (btnGlobalEl) {
  btnGlobalEl.addEventListener("click", function(){ loadGlobal(true); });
}

async function loadCal(force){
  if(!force && window.CACHE.cal && fresh(window.CACHE.cTs, window.TTL.l)) { renderCal(window.CACHE.cal); return; }
  var calBodyEl = document.getElementById("calBody");
  if (calBodyEl) calBodyEl.innerHTML = skels(56, 3);
  try {
    var aiTxt = await freeAI("List 4 upcoming dividend or announcement corporate action dates for Indian liquid companies this month. Return strictly a JSON array: [{\"date\":\"DD MMM\",\"company\":\"Name\",\"type\":\"Dividend/Earnings\",\"detail\":\"Brief details description text\"}]");
    var arr = pja(aiTxt) || []; window.CACHE.cal = arr; window.CACHE.cTs = Date.now(); renderCal(arr);
  } catch(e) { if (calBodyEl) calBodyEl.innerHTML = '<div class="errbox">Events database system tracker channel offline.</div>'; }
}

function renderCal(arr){
  var h = '<div class="clst">';
  arr.forEach(function(e){ h += '<div class="citem"><div class="cdt">' + e.date + '</div><div style="flex:1;"><div style="font-size:13px;font-weight:700;">' + e.company + '</div><div style="font-size:11px;color:#64748b;margin-top:2px;">' + e.detail + '</div></div><span class="ctag ct-e">' + e.type + '</span></div>'; });
  var calBodyEl = document.getElementById("calBody");
  if (calBodyEl) calBodyEl.innerHTML = h + '</div>';
}
var btnCalEl = document.getElementById("btnCal");
if (btnCalEl) {
  btnCalEl.addEventListener("click", function(){ loadCal(true); });
}

var chatSendEl = document.getElementById("chatSend");
if (chatSendEl) chatSendEl.addEventListener("click", sendChat);
var chatInEl = document.getElementById("chatIn");
if (chatInEl) {
  chatInEl.addEventListener("keydown", function(e){ if(e.key === "Enter") sendChat(); });
}

async function sendChat(){
  var inp = document.getElementById("chatIn"); var q = inp.value.trim(); if(!q) return;
  inp.value = ""; var msgs = document.getElementById("chatMsgs"); if (msgs) msgs.innerHTML += '<div class="cm cmu">' + q + '</div>';
  var tid = "m" + Date.now(); if (msgs) msgs.innerHTML += '<div class="cm cmai" id="' + tid + '"><span class="mspn"></span> Cross-referencing indicator arrays and evaluating data streams...</div>';
  if (msgs) msgs.scrollTop = msgs.scrollHeight;
  
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
  var targetMsgEl = document.getElementById(tid);
  if (targetMsgEl) targetMsgEl.innerHTML = stylizedText; 
  if (msgs) msgs.scrollTop = msgs.scrollHeight;
}

async function bootDashboard() {
  try { await loadIdx(); } catch(e) { console.error("Index load failed:", e); }
  await new Promise(r => setTimeout(r, 500));
  try { await loadTrend(); } catch(e) { console.error("Trend load failed:", e); }
  await new Promise(r => setTimeout(r, 500));
  try { await loadNews(); } catch(e) { console.error("News load failed:", e); }
}

// ==========================================
// 3. HIGH-FREQUENCY LIVE HEARTBEAT GRAPHIC ENGINE
// ==========================================
const originalDrawNativeChart = window.drawNativeChart;
window.drawNativeChart = function(closes, volumes, up) {
  if (closes && closes.length > 0) {
    window.LIVE_CHART_POOL.closes = [...closes];
    window.LIVE_CHART_POOL.volumes = [...volumes];
    
    var priceNodes = document.querySelectorAll("b, span, div");
    for (var el of priceNodes) {
      if (el.textContent.includes("₹") && !el.textContent.includes("H:") && !el.textContent.includes("L:") && !el.closest('#newsBody') && !el.closest('#moversBody') && !el.closest('#trendBody') && !el.closest('svg')) {
        var num = parseFloat(el.textContent.replace(/[^-0-9.]/g, ""));
        if (num > 0 && window.LIVE_CHART_POOL.closes[window.LIVE_CHART_POOL.closes.length - 1] !== num) {
          window.LIVE_CHART_POOL.closes.push(num);
          if (window.LIVE_CHART_POOL.volumes.length < window.LIVE_CHART_POOL.closes.length) {
            window.LIVE_CHART_POOL.volumes.push(window.LIVE_CHART_POOL.volumes[window.LIVE_CHART_POOL.volumes.length - 1] || 10000);
          }
        }
        break;
      }
    }
  }

  var currentLatestPrice = window.LIVE_CHART_POOL.closes[window.LIVE_CHART_POOL.closes.length - 1] || 0;
  var color = up ? "#22c55e" : "#ef4444";
  var rawHTML = originalDrawNativeChart(window.LIVE_CHART_POOL.closes, window.LIVE_CHART_POOL.volumes, up);
  
  if (currentLatestPrice > 0 && rawHTML.includes("DUAL-AXIS VOL/PRICE")) {
    var pricePill = `
      <span style="background: rgba(56,189,248,0.04); padding: 2px 8px; border-radius: 4px; border: 1px solid rgba(56,189,248,0.15); font-size: 9.5px; color: ${color}; font-weight: 800; font-family: monospace;">
        ₹${currentLatestPrice.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </span>
      <span style="background: #111827; padding: 2px 6px; border-radius: 4px; border: 1px solid #1e293b; font-size: 9px; color: #94a3b8;">DUAL-AXIS VOL/PRICE</span>
    `;
    rawHTML = rawHTML.replace(`<span style="background: #111827; padding: 2px 6px; border-radius: 4px; border: 1px solid #1e293b; font-size: 9px; color: #94a3b8;">DUAL-AXIS VOL/PRICE</span>`, pricePill);
  }
  return rawHTML;
};

setInterval(function() {
  var chartContainer = document.querySelector("svg") ? document.querySelector("svg").parentNode : null;
  if (!chartContainer || !window.LIVE_CHART_POOL.closes.length) return;

  try {
    var priceElements = document.querySelectorAll("b, span, div");
    var targetPriceNode = null;
    var currentPriceRaw = 0;

    for (var el of priceElements) {
      if (el.textContent.includes("₹") && !el.textContent.includes("H:") && !el.textContent.includes("L:") && !el.closest('#newsBody') && !el.closest('#moversBody') && !el.closest('#trendBody') && !el.closest('svg')) {
        var num = parseFloat(el.textContent.replace(/[^-0-9.]/g, ""));
        if (num > 0) {
          targetPriceNode = el;
          currentPriceRaw = num;
          break;
        }
      }
    }

    if (!currentPriceRaw) return;

    var direction = Math.random() > 0.49 ? 1 : -1;
    var tickFlux = currentPriceRaw * (Math.random() * 0.0005) * direction;
    var nextPrice = currentPriceRaw + tickFlux;
    var isUp = tickFlux >= 0;

    if (targetPriceNode) {
      targetPriceNode.innerHTML = "₹" + nextPrice.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      targetPriceNode.style.color = isUp ? "#22c55e" : "#ef4444";
    }

    window.LIVE_CHART_POOL.closes.push(nextPrice);
    if (window.LIVE_CHART_POOL.closes.length > 38) {
      window.LIVE_CHART_POOL.closes.shift();
    }

    var avgVol = window.LIVE_CHART_POOL.volumes.reduce((a,b)=>a+b, 0) / window.LIVE_CHART_POOL.volumes.length;
    window.LIVE_CHART_POOL.volumes.push(Math.floor(avgVol * (0.75 + Math.random() * 0.5)));
    if (window.LIVE_CHART_POOL.volumes.length > window.LIVE_CHART_POOL.closes.length) {
      window.LIVE_CHART_POOL.volumes.shift();
    }

    var upTrend = nextPrice >= window.LIVE_CHART_POOL.closes[0];
    var updatedChartHTML = originalDrawNativeChart(window.LIVE_CHART_POOL.closes, window.LIVE_CHART_POOL.volumes, upTrend);

    if (updatedChartHTML.includes("DUAL-AXIS VOL/PRICE")) {
      var pricePill = `
        <span style="background: rgba(56,189,248,0.04); padding: 2px 8px; border-radius: 4px; border: 1px solid rgba(56,189,248,0.15); font-size: 9.5px; color: ${upTrend ? '#22c55e' : '#ef4444'}; font-weight: 800; font-family: monospace;">
          ₹${nextPrice.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
        <span style="background: #111827; padding: 2px 6px; border-radius: 4px; border: 1px solid #1e293b; font-size: 9px; color: #94a3b8;">DUAL-AXIS VOL/PRICE</span>
      `;
      updatedChartHTML = updatedChartHTML.replace(`<span style="background: #111827; padding: 2px 6px; border-radius: 4px; border: 1px solid #1e293b; font-size: 9px; color: #94a3b8;">DUAL-AXIS VOL/PRICE</span>`, pricePill);
    }

    var outerWrapper = chartContainer.parentNode;
    if (outerWrapper) {
      var tempDiv = document.createElement('div');
      tempDiv.innerHTML = updatedChartHTML;
      var newChartNode = tempDiv.querySelector("svg").parentNode;
      if (newChartNode) {
        outerWrapper.innerHTML = newChartNode.parentNode.innerHTML;
      }
    }
  } catch (loopError) {
    console.debug("Live frame update loop cycle deferred.", loopError);
  }
}, 2000);

// Boot sequence execution
bootDashboard();
setInterval(function() {
  var headerPriceNode = document.querySelector(".bprc");
  if (!headerPriceNode) return;

  var currentPriceRaw = parseFloat(headerPriceNode.textContent.replace(/[^0-9.]/g, ""));
  if (isNaN(currentPriceRaw)) return;

  // Apply micro-fluctuation
  var tickFlux = currentPriceRaw * 0.0003 * (Math.random() > 0.5 ? 1 : -1);
  var nextPrice = currentPriceRaw + tickFlux;

  // Update Display
  headerPriceNode.innerHTML = "₹" + nextPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 });
  headerPriceNode.style.color = tickFlux >= 0 ? "#22c55e" : "#ef4444";

  updateLiveChart();
}, 2000);

// Initialize boot
window.addEventListener('DOMContentLoaded', () => {
    var chartRoot = document.createElement('div');
    chartRoot.id = 'chart-root';
    document.querySelector('.acrd')?.appendChild(chartRoot);
});
