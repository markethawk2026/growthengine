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

var PROXIES = [
  "https://corsproxy.io/?url=",
  "https://api.allorigins.win/raw?url=",
  "https://thingproxy.freeboard.io/fetch/"
];

function fresh(ts, t) { return ts && (Date.now() - ts) < t; }
function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

/**
 * Proxy fetch for CORS bypass - kept for API access
 */
async function proxyFetch(url, timeoutMs = 5000) {
  let lastError = null;

  for (var i = 0; i < PROXIES.length; i++) {
    try {
      var targetUrl = PROXIES[i] + encodeURIComponent(url);
      var result = await window.RequestManager.request(targetUrl, {
        timeout: timeoutMs,
        retries: 1,
        ttl: window.TTL.s,
        cacheKey: "proxy::" + url,
        allowStaleOnError: true
      });
      return result.data;
    } catch (e) {
      lastError = e;
      console.warn("Proxy channel " + i + " failed; trying the next available source.", e.code || e.message);
    }
  }
  throw lastError || new Error("All available proxy pathways failed.");
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

  var sym = ticker;
  if (!sym.startsWith("^") && !sym.includes(".") && !sym.includes("=") && !sym.includes("-")) {
    sym = sym + ".NS";
  }

  try {
    var chartUrl = YF_QUOTE + sym + "?interval=1d&range=1mo";
    var cJson = await proxyFetch(chartUrl);
    var cResult = cJson.chart && cJson.chart.result && cJson.chart.result[0];
    if (!cResult) return null;

    var m = cResult.meta;
    var price = m.regularMarketPrice;
    
    var quoteSeries = cResult.indicators.quote[0] || {};
    var rawCloses = quoteSeries.close || [];
    var rawHighs = quoteSeries.high || [];
    var rawLows = quoteSeries.low || [];
    var rawVolumes = quoteSeries.volume || [];
    var cleanCloses = [];
    var cleanHighs = [];
    var cleanLows = [];
    var cleanVolumes = [];
    rawCloses.forEach(function(close, idx) {
      if (close !== null && close !== undefined && Number.isFinite(Number(close))) {
        cleanCloses.push(Number(close));
        cleanHighs.push(Number.isFinite(Number(rawHighs[idx])) ? Number(rawHighs[idx]) : Number(close));
        cleanLows.push(Number.isFinite(Number(rawLows[idx])) ? Number(rawLows[idx]) : Number(close));
        cleanVolumes.push(Number.isFinite(Number(rawVolumes[idx])) ? Number(rawVolumes[idx]) : 0);
      }
    });

    if(!cleanCloses.length) cleanCloses = [price, price];

    var prevClose = m.previousClose || m.chartPreviousClose || price;
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

    var d = {
      price:    "₹" + price.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      raw:      price,
      change:   (chg >= 0 ? "+" : "") + chg.toFixed(2),
      changePct:(chg >= 0 ? "+" : "") + chgPct.toFixed(2) + "%",
      high:     "₹" + (m.regularMarketDayHigh || price).toFixed(2),
      low:      "₹" + (m.regularMarketDayLow || price).toFixed(2),
      volume:   vFmt(m.regularMarketVolume || 0),
      mktCap:   cFmt(m.marketCap || 0),
      up:       chg >= 0,
      name:     m.longName || m.shortName || ticker,
      closes:   cleanCloses,
      highs:    cleanHighs,
      lows:     cleanLows,
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

async function yfSearch(q) {
  try {
    var url = YF_SEARCH + encodeURIComponent(q) + "&quotesCount=10&newsCount=0&enableFuzzyQuery=true&region=IN";
    var j = await proxyFetch(url);
    return (j.quotes || []).filter(function(r){
      return r.quoteType === "EQUITY" && (r.exchange === "NSI" || r.exchange === "BOM" || r.symbol.endsWith(".NS") || r.symbol.endsWith(".BO"));
    }).slice(0, 8);
  } catch(e) { return []; }
}

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
          var title = item.title ? item.title.trim() : "";
          if (title && !seenTitles.has(title.toLowerCase())) {
            seenTitles.add(title.toLowerCase());
            
            var summaryClean = item.description 
              ? item.description.replace(/<[^>]*>/g, '').trim() 
              : "";

            masterArticles.push({
              id: "wire_" + Math.random().toString(36).substr(2, 9),
              headline: escapeHTML(title),
              source: escapeHTML(source.name.toUpperCase()),
              time: new Date().toLocaleTimeString(),
              summary: escapeHTML(summaryClean)
            });
          }
        });
      }
    } catch (err) {
      console.warn("Skipped feed channel: " + source.name);
    }
  });

  await Promise.allSettled(fetchPromises);

  if (queryStr && queryStr !== "NSE INDIA" && queryStr !== "NSE") {
    var filtered = masterArticles.filter(function(art) {
      return art.headline.toUpperCase().includes(queryStr) || art.summary.toUpperCase().includes(queryStr);
    });
    if (filtered.length > 0) {
      masterArticles = filtered.concat(masterArticles.filter(art => !filtered.includes(art)));
    }
  }

  if (masterArticles.length === 0) {
    console.log("No news articles available for " + queryStr);
  }

  return masterArticles.slice(0, 30);
}


function parseDynamicMoverItem(sym, q) {
  var pct = parseFloat(q.changePct) || 0;
  var vol = parseInt(String(q.volume).replace(/,/g, '')) || 0;
  var assignedSector = "OTHER";

  if (window.NSE_SECTOR_REGISTRY) {
    Object.keys(window.NSE_SECTOR_REGISTRY).forEach(function(sec) {
      if (window.NSE_SECTOR_REGISTRY[sec] && window.NSE_SECTOR_REGISTRY[sec].includes(sym)) {
        assignedSector = sec.toUpperCase().trim();
      }
    });
  }

  return {
    ticker:       sym,
    name:         escapeHTML(q.name || (sym + " Corp")),
    price:        q.price || "₹0.00",
    rawPrice:     q.raw || 0,
    changePct:    q.changePct || "0.00%",
    rawChangePct: pct,
    volume:       q.volume || "0",
    rawVolume:    vol,
    up:           pct >= 0,
    sector:       assignedSector
  };
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

function calcMACD(closes) {
  var details = calcMACDDetails(closes);
  return details ? details.macd : null;
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
  try {
    var cleanUrl = POLL_AI + encodeURIComponent(prompt) + "?wrap=false";
    var managed = await window.RequestManager.request(cleanUrl, {
      timeout: 15000,
      retries: 1,
      ttl: 0,
      responseType: "text",
      cacheKey: "ai::" + cleanUrl,
      allowStaleOnError: false
    });
    return managed.data || "";
  } catch(e) {}
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
