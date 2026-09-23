/**
 * NC Markets - Data Pipelines, Indicators & Math Calculations Layer
 * Provides real market data with transparent source attribution
 */

window.CACHE = { prices: {}, analysis: {}, nextday: {}, outlook: {}, news: null, nTs: 0, trend: null, tTs: 0, global: null, gTs: 0, cal: null, cTs: 0 };
window.TTL = { s: 2 * 60 * 1000, m: 5 * 60 * 1000, l: 30 * 60 * 1000 };

var YF_QUOTE  = "https://query1.finance.yahoo.com/v8/finance/chart/";
var YF_SEARCH = "https://query1.finance.yahoo.com/v1/finance/search?q=";
var YF_NEWS   = "https://query2.finance.yahoo.com/v1/finance/search?q=";
var POLL_AI   = "https://text.pollinations.ai/";

// ┌─────────────────────────────────────────────────────────────────┐
// │  PASTE YOUR CLOUDFLARE WORKER URL BELOW (keep the ?url= at end)   │
// │  Example: "https://nc-markets.yourname.workers.dev/?url="         │
// │  Leave as "" to use only the public proxies.                     │
// └─────────────────────────────────────────────────────────────────┘
var WORKER_URL = "https://nc-markets.markethawk2026.workers.dev/?url=";

// Public fallback proxies. allorigins/codetabs accept Origin:null (work from
// file://); corsproxy.io/.org reject null origin, so they go last.
var PUBLIC_PROXIES = [
  "https://api.allorigins.win/raw?url=",
  "https://api.codetabs.com/v1/proxy?quest=",
  "https://api.allorigins.win/get?url=",   // same service, JSON-wrapped response
  "https://thingproxy.freeboard.io/fetch/",
  "https://corsproxy.io/?url=",
  "https://corsproxy.org/?url="
];

// Worker first (reliable), public proxies as fallback.
var PROXIES = WORKER_URL ? [WORKER_URL].concat(PUBLIC_PROXIES) : PUBLIC_PROXIES;

// Per-proxy health tracking — prefer proxies that worked recently
var _proxyHealth = PROXIES.map(function() { return { fails: 0, successes: 0, lastFail: 0, lastOk: 0 }; });

function _proxyOrder() {
  var now = Date.now();
  return PROXIES.map(function(_, i) {
    var h = _proxyHealth[i];
    var recentlyFailed = (now - h.lastFail) < 50000; // failed in last 50s
    var recentlyOk     = (now - h.lastOk)  < 120000; // succeeded in last 2 min
    // Lower score = try first
    var score = (recentlyFailed ? 200 : 0) - (recentlyOk ? 100 : 0) + h.fails * 3 - h.successes;
    return { i: i, score: score };
  }).sort(function(a, b) { return a.score - b.score; }).map(function(x) { return x.i; });
}

function _isValidData(data) {
  if (data === null || data === undefined) return false;
  if (typeof data === "string") {
    var t = data.trim();
    if (!t || t.startsWith("<!") || t.startsWith("<html")) return false; // HTML error page
    return true;
  }
  return typeof data === "object";
}

function fresh(ts, t) { return ts && (Date.now() - ts) < t; }
function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

// Circuit breaker: if all proxies time out, pause for 60s
var _proxyCircuitOpen = false;
var _proxyCircuitOpenTs = 0;
var _PROXY_COOLDOWN = 30000;

function isProxyBlocked() {
  return _proxyCircuitOpen && (Date.now() - _proxyCircuitOpenTs) < _PROXY_COOLDOWN;
}

async function proxyFetch(url, timeoutMs = 5000) {
  if (isProxyBlocked()) throw new Error("PROXY_UNAVAILABLE");

  var order = _proxyOrder();
  var lastError = null;
  var timeoutCount = 0;
  var perProxyTimeout = Math.min(timeoutMs, 4000);

  for (var oi = 0; oi < order.length; oi++) {
    var i = order[oi];
    try {
      var targetUrl = PROXIES[i] + encodeURIComponent(url);
      var result = await window.RequestManager.request(targetUrl, {
        timeout: perProxyTimeout,
        retries: 0,
        ttl: window.TTL.s,
        cacheKey: "proxy::" + url,
        allowStaleOnError: true
      });
      var data = result.data;
      // Unwrap allorigins /get?url= JSON envelope: { contents: "...", status: {...} }
      if (data && typeof data === "object" && typeof data.contents === "string" && data.status) {
        try { data = JSON.parse(data.contents); } catch(e) { data = data.contents; }
      }
      if (!_isValidData(data)) {
        // Proxy returned an HTML error page — treat as failure
        _proxyHealth[i].fails++;
        _proxyHealth[i].lastFail = Date.now();
        continue;
      }
      _proxyHealth[i].successes++;
      _proxyHealth[i].lastOk = Date.now();
      _proxyCircuitOpen = false;
      return data;
    } catch (e) {
      lastError = e;
      _proxyHealth[i].fails++;
      _proxyHealth[i].lastFail = Date.now();
      if (e.code === "TIMEOUT" || (e.message && e.message.includes("timeout"))) timeoutCount++;
    }
  }

  // All proxies failed with timeouts = network is blocking CORS
  if (timeoutCount >= Math.ceil(order.length / 2)) {
    _proxyCircuitOpen = true;
    _proxyCircuitOpenTs = Date.now();
  }

  throw lastError || new Error("All proxy pathways exhausted.");
}

async function yfQuote(ticker) {
  const validTicker = validateTickerSymbol(ticker);
  if (!validTicker) {
    console.error('Invalid ticker symbol:', ticker);
    return null;
  }
  
  ticker = validTicker;
  if (ticker === "NIFTY50" || ticker === "NIFTY 50" || ticker === "NIFTY") ticker = "^NSEI";
  if (ticker === "SENSEX") ticker = "^BSESN";
  
  if (window.CACHE.prices[ticker] && fresh(window.CACHE.prices[ticker].ts, window.TTL.s)) {
    return window.CACHE.prices[ticker].d;
  }

  var symCandidates = [ticker];
  if (!ticker.startsWith("^") && !ticker.includes(".") && !ticker.includes("=")) {
    symCandidates = [/^\d+$/.test(ticker) ? ticker + ".BO" : ticker + ".NS", ticker + ".BO", ticker + ".NS"];
  }

  var cResult = null;
  try {
    for (var sIdx = 0; sIdx < symCandidates.length; sIdx++) {
      var sym = symCandidates[sIdx];
      try {
        var chartUrl = YF_QUOTE + sym + "?interval=1d&range=3mo";
        var cJson = await proxyFetch(chartUrl);
        var candResult = cJson && cJson.chart && cJson.chart.result && cJson.chart.result[0];
        if (candResult && candResult.meta && candResult.meta.regularMarketPrice != null && candResult.meta.regularMarketPrice > 0) {
          cResult = candResult;
          break;
        }
      } catch (innerErr) {
        // Continue trying next symbol candidate
      }
    }

    if (!cResult || !cResult.meta) return null;

    var m = cResult.meta;
    var price = m.regularMarketPrice;
    
    var quoteSeries = cResult.indicators.quote[0] || {};
    var rawCloses = quoteSeries.close || [];
    var rawHighs = quoteSeries.high || [];
    var rawLows = quoteSeries.low || [];
    var rawVolumes = quoteSeries.volume || [];
    var rawOpens = quoteSeries.open || [];
    var cleanCloses = [], cleanHighs = [], cleanLows = [], cleanVolumes = [], cleanOpens = [];
    rawCloses.forEach(function(close, idx) {
      if (close !== null && close !== undefined && Number.isFinite(Number(close))) {
        cleanCloses.push(Number(close));
        cleanHighs.push(Number.isFinite(Number(rawHighs[idx])) ? Number(rawHighs[idx]) : Number(close));
        cleanLows.push(Number.isFinite(Number(rawLows[idx])) ? Number(rawLows[idx]) : Number(close));
        cleanVolumes.push(Number.isFinite(Number(rawVolumes[idx])) ? Number(rawVolumes[idx]) : 0);
        cleanOpens.push(Number.isFinite(Number(rawOpens[idx])) ? Number(rawOpens[idx]) : Number(close));
      }
    });

    if(!cleanCloses.length) cleanCloses = [price, price];

    var prevClose = m.chartPreviousClose || m.regularMarketPreviousClose || m.previousClose || price;
    if (cleanCloses.length >= 2) {
      if (Math.abs(cleanCloses[cleanCloses.length - 1] - price) < 0.05) {
        prevClose = cleanCloses[cleanCloses.length - 2];
      } else {
        prevClose = cleanCloses[cleanCloses.length - 1];
      }
    }

    var chg = price - prevClose;
    var chgPct = (chg / prevClose) * 100;

    var vFmt = typeof fmtVol === "function" ? fmtVol : String;
    var cFmt = typeof fmtCap === "function" ? fmtCap : String;

    var week52Hi = m.fiftyTwoWeekHigh || null;
    var week52Lo = m.fiftyTwoWeekLow || null;
    // Indices often omit regularMarketOpen — fall back to the latest candle's open
    var openPrice = m.regularMarketOpen || (cleanOpens.length ? cleanOpens[cleanOpens.length - 1] : null);
    var prevClosePrice = m.chartPreviousClose || m.regularMarketPreviousClose || null;

    var d = {
      price:    "₹" + price.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      raw:      price,
      change:   (chg >= 0 ? "+" : "") + chg.toFixed(2),
      changePct:(chg >= 0 ? "+" : "") + chgPct.toFixed(2) + "%",
      high:     "₹" + (m.regularMarketDayHigh || price).toFixed(2),
      low:      "₹" + (m.regularMarketDayLow || price).toFixed(2),
      rawHigh:  m.regularMarketDayHigh || price,
      rawLow:   m.regularMarketDayLow || price,
      volume:   vFmt(m.regularMarketVolume || 0),
      rawVolume: m.regularMarketVolume || 0,
      mktCap:   cFmt(m.marketCap || 0),
      up:       chg >= 0,
      name:     m.longName || m.shortName || ticker,
      open:     openPrice ? "₹" + openPrice.toFixed(2) : null,
      prevClose: prevClosePrice ? "₹" + prevClosePrice.toFixed(2) : null,
      week52High: week52Hi ? "₹" + week52Hi.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : null,
      week52Low:  week52Lo ? "₹" + week52Lo.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : null,
      rawWeek52High: week52Hi,
      rawWeek52Low:  week52Lo,
      rawOpen:  openPrice,
      rawPrevClose: prevClosePrice,
      closes:   cleanCloses,
      highs:    cleanHighs,
      lows:     cleanLows,
      opens:    cleanOpens,
      volumes:  cleanVolumes,
      times:    cResult.timestamp || [],
      dataSource: 'Yahoo Finance',
      dataStatus: 'DELAYED'
    };
    window.CACHE.prices[ticker] = { d: d, ts: Date.now() };
    return d;
  } catch(e) { 
    console.error("Failed to parse stock metrics for " + ticker, e);
    return null; 
  }
}

function _acResultsToQuotes(results) {
  return results.filter(function(r) { return r.type === "S"; }).slice(0, 8)
    .map(function(r) { return { symbol: r.symbol, shortname: r.name, longname: r.name, exchange: r.exch, quoteType: "EQUITY" }; });
}

async function yfSearch(q) {
  if (!q || !String(q).trim()) return [];

  // 1. Direct fetch — v6 autocomplete has Access-Control-Allow-Origin: * (no proxy needed)
  try {
    var acDirect = await Promise.race([
      fetch("https://query1.finance.yahoo.com/v6/finance/autocomplete?region=IN&lang=en&query=" + encodeURIComponent(q))
        .then(function(r) { return r.ok ? r.json() : null; }),
      new Promise(function(_, rej) { setTimeout(rej, 2500); })
    ]);
    var dr = acDirect && acDirect.ResultSet && acDirect.ResultSet.Result;
    if (Array.isArray(dr) && dr.length) return _acResultsToQuotes(dr);
  } catch(e) {}

  // 2. v1 search via proxy (returns shortname/longname)
  try {
    var url = YF_SEARCH + encodeURIComponent(q) + "&quotesCount=12&newsCount=0&enableFuzzyQuery=true";
    var j = await proxyFetch(url, 4000);
    var quotes = (j && j.quotes) ? j.quotes : [];
    if (quotes.length) {
      var filtered = quotes.filter(function(r){
        if (!r || !r.symbol) return false;
        var sym = r.symbol.toUpperCase();
        var ex = (r.exchange || "").toUpperCase();
        return r.quoteType === "EQUITY" || ex === "NSI" || ex === "BOM" || sym.endsWith(".NS") || sym.endsWith(".BO");
      });
      return (filtered.length ? filtered : quotes.slice(0, 8)).slice(0, 8);
    }
  } catch(e) {}

  // 3. v6 autocomplete via proxy (different Yahoo endpoint)
  try {
    var ac = await proxyFetch("https://query2.finance.yahoo.com/v6/finance/autocomplete?region=IN&lang=en&query=" + encodeURIComponent(q), 4000);
    var ar = ac && ac.ResultSet && ac.ResultSet.Result;
    if (Array.isArray(ar) && ar.length) return _acResultsToQuotes(ar);
  } catch(e) {}

  return [];
}

async function yfFundamentals(ticker) {
  try {
    var sym = ticker.includes('.') ? ticker : ticker + '.NS';
    var url = 'https://query1.finance.yahoo.com/v7/finance/quote?symbols=' + encodeURIComponent(sym) +
      '&fields=trailingPE,priceToBook,epsTrailingTwelveMonths,dividendYield,averageDailyVolume3Month,forwardPE,marketCap,beta';
    // v7/quote needs crumb auth (handled by the Worker) — no direct fetch, it always CORS-fails
    var j = await proxyFetch(url, 8000);
    var r = j && j.quoteResponse && j.quoteResponse.result && j.quoteResponse.result[0];
    if (!r) return {};
    var eps = r.epsTrailingTwelveMonths;
    return {
      pe:        r.trailingPE   ? r.trailingPE.toFixed(1)   : null,
      forwardPE: r.forwardPE    ? r.forwardPE.toFixed(1)    : null,
      pb:        r.priceToBook  ? r.priceToBook.toFixed(2)  : null,
      eps:       (eps != null && Number.isFinite(eps)) ? "₹" + eps.toFixed(2) : null,
      rawEps:    (eps != null && Number.isFinite(eps)) ? eps : null,
      // Yahoo returns dividendYield already as a percentage (0.49 = 0.49%)
      divYield:  (r.dividendYield != null && r.dividendYield > 0) ? r.dividendYield.toFixed(2) + "%" : null,
      avgVol3M:  r.averageDailyVolume3Month ? (typeof fmtVol === "function" ? fmtVol(r.averageDailyVolume3Month) : r.averageDailyVolume3Month) : null,
      beta:      r.beta ? r.beta.toFixed(2) : null,
      marketCap: r.marketCap ? (typeof fmtCap === "function" ? fmtCap(r.marketCap) : String(r.marketCap)) : null
    };
  } catch(e) { return {}; }
}

async function yfFinancials(ticker) {
  try {
    var sym = ticker.includes('.') ? ticker : ticker + '.NS';
    var url = 'https://query1.finance.yahoo.com/v10/finance/quoteSummary/' + encodeURIComponent(sym) +
      '?modules=majorHoldersBreakdown%2CincomeStatementHistoryQuarterly';
    var j = await proxyFetch(url, 10000);
    if (!j) return null;
    var res = j && j.quoteSummary && j.quoteSummary.result && j.quoteSummary.result[0];
    if (!res) return null;
    function fmtCr(n) {
      if (n == null || !Number.isFinite(n)) return '—';
      var cr = n / 10000000;
      if (cr >= 100000) return (cr / 100000).toFixed(1) + 'L Cr';
      if (cr >= 1000) return (cr / 1000).toFixed(1) + 'K Cr';
      return cr.toFixed(0) + ' Cr';
    }
    var mh = res.majorHoldersBreakdown || {};
    var promoterRaw = mh.insidersPercentHeld && mh.insidersPercentHeld.raw != null ? mh.insidersPercentHeld.raw * 100 : null;
    var instRaw = mh.institutionsPercentHeld && mh.institutionsPercentHeld.raw != null ? mh.institutionsPercentHeld.raw * 100 : null;
    var retailRaw = (promoterRaw != null && instRaw != null) ? Math.max(0, 100 - promoterRaw - instRaw) : null;
    var qList = (res.incomeStatementHistoryQuarterly && res.incomeStatementHistoryQuarterly.incomeStatementHistory) || [];
    var quarters = qList.slice(0, 5).map(function(q) {
      return {
        date: q.endDate && q.endDate.fmt ? q.endDate.fmt : '—',
        revenue: fmtCr(q.totalRevenue && q.totalRevenue.raw),
        profit: fmtCr(q.netIncome && q.netIncome.raw),
        profitRaw: q.netIncome && q.netIncome.raw != null ? q.netIncome.raw : null,
        eps: q.basicEps && q.basicEps.raw != null ? '₹' + q.basicEps.raw.toFixed(2) : '—'
      };
    });
    return {
      promoterPct: promoterRaw != null ? promoterRaw.toFixed(1) : null,
      instPct: instRaw != null ? instRaw.toFixed(1) : null,
      retailPct: retailRaw != null ? retailRaw.toFixed(1) : null,
      quarters: quarters
    };
  } catch(e) { return null; }
}
window.yfFinancials = yfFinancials;

async function yfNews(q) {
  var queryStr = (q && typeof q === "string") ? q.toUpperCase().trim() : "";
  var masterArticles = [];
  var seenTitles = new Set();

  var feedSources = [
    { name: "Economic Times", url: "https://economictimes.indiatimes.com/markets/rssfeeds/2146842.cms" },
    { name: "CNBC Markets", url: "https://www.cnbc.com/id/15839069/device/rss/rss.html" },
    { name: "Business Standard", url: "https://www.business-standard.com/rss/markets-106.rss" },
    { name: "NSE Corporate Info", url: "https://www.nseindia.com/static/rss-feed" }
  ];

  var fetchPromises = feedSources.map(async function(source) {
    try {
      var endpoint = "https://api.rss2json.com/v1/api.json?rss_url=" + encodeURIComponent(source.url);
      var managed = await window.RequestManager.request(endpoint, {
        timeout: 7000,
        retries: 2,
        ttl: window.TTL.m,
        cacheKey: "rss::" + source.url,
        allowStaleOnError: true
      });
      var payload = managed.data;
      
      if (payload && payload.items && payload.items.length > 0) {
        payload.items.forEach(function(item) {
          var title = _decodeEntities(item.title ? item.title.trim() : "");
          if (title && !seenTitles.has(title.toLowerCase())) {
            seenTitles.add(title.toLowerCase());

            var summaryClean = _decodeEntities(item.description
              ? item.description.replace(/<[^>]*>/g, '').trim()
              : "");

            var link = (item.link && typeof sanitizeURL === "function") ? sanitizeURL(item.link) : (item.link || "");
            var ts = item.pubDate ? Date.parse(String(item.pubDate).replace(' ', 'T') + 'Z') : 0;
            if (isNaN(ts)) ts = item.pubDate ? Date.parse(item.pubDate) : 0;
            masterArticles.push({
              id: "wire_" + Math.random().toString(36).substr(2, 9),
              headline: title,
              source: source.name.toUpperCase(),
              time: _relTime(ts),
              _ts: ts || 0,
              summary: summaryClean,
              link: link
            });
          }
        });
      }
    } catch (err) {
      // Feed unavailable — skip silently
    }
  });

  await Promise.allSettled(fetchPromises);

  // Newest first
  masterArticles.sort(function(a, b) { return (b._ts || 0) - (a._ts || 0); });

  if (queryStr && queryStr !== "NSE INDIA" && queryStr !== "NSE") {
    var filtered = masterArticles.filter(function(art) {
      return art.headline.toUpperCase().includes(queryStr) || art.summary.toUpperCase().includes(queryStr);
    });
    if (filtered.length > 0) {
      masterArticles = filtered.concat(masterArticles.filter(art => !filtered.includes(art)));
    }
  }

  return masterArticles.slice(0, 30);
}

function _decodeEntities(s) {
  if (!s) return "";
  try {
    var t = document.createElement("textarea");
    t.innerHTML = s;
    return t.value;
  } catch (e) { return s; }
}

function _relTime(ts) {
  if (!ts) return "";
  var diff = Date.now() - ts;
  if (diff < 0) diff = 0;
  var mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return mins + "m ago";
  var hrs = Math.floor(mins / 60);
  if (hrs < 24) return hrs + "h ago";
  var days = Math.floor(hrs / 24);
  if (days < 30) return days + "d ago";
  return new Date(ts).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
}



function calcRSI(closes, p) {
  p = p || 14;
  if (!Array.isArray(closes) || closes.length < p + 1) return null;
  var gains = 0, losses = 0;
  for (var i = 1; i <= p; i++) {
    var diff = closes[i] - closes[i - 1];
    if (diff >= 0) gains += diff; else losses -= diff;
  }
  var avgGain = gains / p, avgLoss = losses / p;
  for (var j = p + 1; j < closes.length; j++) {
    var change = closes[j] - closes[j - 1];
    avgGain = ((avgGain * (p - 1)) + Math.max(change, 0)) / p;
    avgLoss = ((avgLoss * (p - 1)) + Math.max(-change, 0)) / p;
  }
  if (avgLoss === 0) return 100;
  return Number((100 - (100 / (1 + avgGain / avgLoss))).toFixed(1));
}

function calcEMA(closes, p) {
  if (!Array.isArray(closes) || closes.length < p) return null;
  var k = 2 / (p + 1);
  var ema = closes.slice(0, p).reduce(function(a, b){ return a + b; }, 0) / p;
  for (var i = p; i < closes.length; i++) ema = closes[i] * k + ema * (1 - k);
  return Number(ema.toFixed(2));
}

function calcEMASeries(values, p) {
  if (!Array.isArray(values) || values.length < p) return [];
  var result = new Array(p - 1).fill(null);
  var ema = values.slice(0, p).reduce(function(a,b){ return a+b; }, 0) / p;
  result.push(ema);
  var k = 2 / (p + 1);
  for (var i = p; i < values.length; i++) {
    ema = values[i] * k + ema * (1 - k);
    result.push(ema);
  }
  return result;
}

function calcMACDDetails(closes) {
  if (!Array.isArray(closes) || closes.length < 35) return null;
  var e12 = calcEMASeries(closes, 12);
  var e26 = calcEMASeries(closes, 26);
  var macdSeries = [];
  for (var i = 25; i < closes.length; i++) macdSeries.push(e12[i] - e26[i]);
  if (macdSeries.length < 9) return null;
  var signalSeries = calcEMASeries(macdSeries, 9);
  var macd = macdSeries[macdSeries.length - 1];
  var signal = signalSeries[signalSeries.length - 1];
  return {
    macd: Number(macd.toFixed(3)),
    signal: Number(signal.toFixed(3)),
    histogram: Number((macd - signal).toFixed(3))
  };
}


function calcVWAP(closes, volumes) {
  if (!Array.isArray(closes) || !Array.isArray(volumes)) return null;
  var pv = 0, totalVolume = 0;
  for (var i = 0; i < Math.min(closes.length, volumes.length); i++) {
    var price = Number(closes[i]), volume = Number(volumes[i]);
    if (Number.isFinite(price) && Number.isFinite(volume) && volume > 0) {
      pv += price * volume;
      totalVolume += volume;
    }
  }
  return totalVolume > 0 ? Number((pv / totalVolume).toFixed(2)) : null;
}

function calcATR(highs, lows, closes, p) {
  p = p || 14;
  if (!Array.isArray(highs) || !Array.isArray(lows) || !Array.isArray(closes) || closes.length < p + 1) return null;
  var trueRanges = [];
  for (var i = 1; i < closes.length; i++) {
    trueRanges.push(Math.max(
      highs[i] - lows[i],
      Math.abs(highs[i] - closes[i - 1]),
      Math.abs(lows[i] - closes[i - 1])
    ));
  }
  if (trueRanges.length < p) return null;
  var atr = trueRanges.slice(0, p).reduce(function(a,b){ return a+b; }, 0) / p;
  for (var j = p; j < trueRanges.length; j++) atr = ((atr * (p - 1)) + trueRanges[j]) / p;
  return Number(atr.toFixed(2));
}

function calcSR(closes) {
  if (!Array.isArray(closes) || closes.length < 5) return { sup: null, res: null };
  var sorted = [].concat(closes).sort(function(a, b){ return a - b; });
  return {
    sup: Number(sorted[Math.floor(sorted.length * .1)].toFixed(2)),
    res: Number(sorted[Math.floor(sorted.length * .9)].toFixed(2))
  };
}

function buildTechnicalScore(closes, indicators) {
  var signals = [];
  var total = 0, availableWeight = 0;
  function add(name, weight, score, explanation) {
    availableWeight += weight;
    total += weight * score;
    signals.push({ name:name, weight:weight, score:score, contribution:Number((weight*score).toFixed(1)), explanation:explanation });
  }
  var rsi = indicators.rsi;
  if (rsi !== null) {
    var rsiScore = rsi < 30 ? 0.8 : rsi <= 45 ? 0.6 : rsi <= 65 ? 0.75 : rsi <= 75 ? 0.35 : 0.15;
    add("RSI (14)", 20, rsiScore, "RSI " + rsi + (rsi < 30 ? " is oversold." : rsi > 70 ? " is overbought." : " is in a neutral-to-constructive range."));
  }
  if (indicators.macdDetails) {
    var hist = indicators.macdDetails.histogram;
    add("MACD", 20, hist > 0 ? 0.8 : hist < 0 ? 0.2 : 0.5, "MACD histogram is " + hist + ".");
  }
  if (indicators.ema20 !== null && indicators.ema50 !== null) {
    add("EMA 20/50", 25, indicators.ema20 > indicators.ema50 ? 0.85 : 0.2, "EMA 20 is " + (indicators.ema20 > indicators.ema50 ? "above" : "below") + " EMA 50.");
  }
  if (indicators.ema200 !== null && closes.length) {
    add("Price vs EMA 200", 15, closes[closes.length-1] > indicators.ema200 ? 0.8 : 0.2, "Price is " + (closes[closes.length-1] > indicators.ema200 ? "above" : "below") + " EMA 200.");
  }
  if (closes.length >= 6) {
    var momentum = (closes[closes.length-1] / closes[closes.length-6]) - 1;
    add("5-session momentum", 20, momentum > 0.02 ? 0.9 : momentum > 0 ? 0.65 : momentum > -0.02 ? 0.4 : 0.1, "5-session momentum is " + (momentum*100).toFixed(2) + "%.");
  }
  var score = availableWeight ? Math.round((total / availableWeight) * 100) : null;
  return { score: score, signals: signals, availableWeight: availableWeight };
}

function calculateTechnicalScore(closes, rsi, macd, ema20, ema50) {
  return buildTechnicalScore(closes, {
    rsi: rsi, macdDetails: macd === null ? null : { histogram: Number(macd) },
    ema20: ema20, ema50: ema50, ema200: null
  }).score;
}

async function freeAI(prompt) {
  // Pollinations rate-limits rapid calls (returns empty) — retry up to 3x with backoff
  var cleanUrl = POLL_AI + encodeURIComponent(prompt) + "?wrap=false";
  for (var attempt = 0; attempt < 3; attempt++) {
    try {
      var managed = await window.RequestManager.request(cleanUrl, {
        timeout: 15000,
        retries: 0,
        ttl: 0,
        responseType: "text",
        cacheKey: "ai::" + attempt + "::" + cleanUrl,
        allowStaleOnError: false
      });
      var txt = (managed && managed.data) ? String(managed.data).trim() : "";
      if (txt.length > 5) return txt;
    } catch(e) {}
    if (attempt < 2) await new Promise(function(r){ setTimeout(r, 1200 * (attempt + 1)); });
  }
  return "";
}

function pj(txt) {
  if (!txt) return null;
  try {
    var start = txt.indexOf('{'); var end = txt.lastIndexOf('}');
    if (start !== -1 && end !== -1) {
      return JSON.parse(txt.substring(start, end + 1).replace(/,(\s*[\]}])/g, '$1'));
    }
  } catch(e) {}
  
  try {
    var obj = {};
    if (/trend["'\s:]+bullish/i.test(txt)) obj.trend = "Bullish";
    else if (/trend["'\s:]+bearish/i.test(txt)) obj.trend = "Bearish";
    else obj.trend = "Neutral";
    
    if (/direction["'\s:]+buy/i.test(txt)) obj.tradeDirection = "BUY";
    else if (/direction["'\s:]+sell/i.test(txt)) obj.tradeDirection = "SELL";
    else obj.tradeDirection = "WAIT";

    var entryM = txt.match(/(?:entry|buy\s*around|buy\s*at|level)[:\s]*₹?\s*([\d\.]+)/i); if(entryM) obj.entry = "₹" + entryM[1];
    var slM = txt.match(/(?:stop\s*loss|sl|invalidation|stop)[:\s]*₹?\s*([\d\.]+)/i); if(slM) obj.stopLoss = "₹" + slM[1];
    var t1M = txt.match(/(?:target\s*1|target|objective\s*1|objective)[:\s]*₹?\s*([\d\.]+)/i); if(t1M) obj.target1 = "₹" + t1M[1];
    var t2M = txt.match(/(?:target\s*2|objective\s*2)[:\s]*₹?\s*([\d\.]+)/i); if(t2M) obj.target2 = "₹" + t2M[1];
    var confM = txt.match(/(?:confidence)[:\s]*(\d+)/i); if(confM) obj.confidence = parseInt(confM[1]);
    var pbM = txt.match(/(?:probBull|bull\s*projection)[:\s]*(\d+)/i); if(pbM) { obj.probBull = parseInt(pbM[1]); obj.probBear = 100 - obj.probBull; }
    var riskM = txt.match(/(?:riskLevel|risk)[:\s]*['"]?(low|medium|high)/i); if(riskM) obj.riskLevel = riskM[1].charAt(0).toUpperCase() + riskM[1].slice(1);
    var scoreM = txt.match(/(?:riskScore)[:\s]*(\d+)/i); if(scoreM) obj.riskScore = parseInt(scoreM[1]);
    var sumM = txt.match(/(?:summary|thesis)[:\s]*['"]?([^"'\n}]+)/i); if(sumM) obj.summary = sumM[1].trim();

    return Object.keys(obj).length > 2 ? obj : null;
  } catch(err) { return null; }
}

function pja(txt) {
  try {
    if (!txt) return null;
    var start = txt.indexOf('['); var end = txt.lastIndexOf(']');
    if (start === -1 || end === -1) return null;
    return JSON.parse(txt.substring(start, end + 1).replace(/,(\s*[\]}])/g, '$1'));
  } catch(e) { return null; }
}
