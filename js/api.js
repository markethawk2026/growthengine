/**
 * NanduChandu Markets - Core Data Engines & Math Calculations Layer
 */

window.CACHE = { prices: {}, analysis: {}, nextday: {}, outlook: {}, news: null, nTs: 0, trend: null, tTs: 0, global: null, gTs: 0, cal: null, cTs: 0 };
window.TTL = { s: 2 * 60 * 1000, m: 5 * 60 * 1000, l: 30 * 60 * 1000 };

var YF_QUOTE  = "https://query1.finance.yahoo.com/v8/finance/chart/";
var YF_SEARCH = "https://query1.finance.yahoo.com/v1/finance/search?q=";
var YF_NEWS   = "https://query2.finance.yahoo.com/v1/finance/search?q=";
var POLL_AI   = "https://text.pollinations.ai/";

function fresh(ts, t) { return ts && (Date.now() - ts) < t; }

async function proxyFetch(url) {
  var r = await fetch("https://corsproxy.io/?" + encodeURIComponent(url));
  if (!r.ok) throw new Error("Proxy fetch failed");
  return await r.json();
}
  
async function yfQuote(ticker) {
  ticker = ticker.toUpperCase().trim();
  if (ticker === "NIFTY50" || ticker === "NIFTY 50" || ticker === "%5ENSEI") ticker = "^NSEI";
  if (ticker === "SENSEX" || ticker === "%5EBSESN") ticker = "^BSESN";
  
  if (window.CACHE.prices[ticker] && fresh(window.CACHE.prices[ticker].ts, window.TTL.s)) {
    return window.CACHE.prices[ticker].d;
  }
  
  var suffixes = [".NS", ".BO", ""];
  if (ticker.startsWith("^") || ticker.includes("=") || ticker.includes("-")) suffixes = [""];

  for (var i = 0; i < suffixes.length; i++) {
    try {
      var sym = ticker + suffixes[i];
      var url = YF_QUOTE + sym + "?interval=1d&range=1y";
      var j = await proxyFetch(url);
      var res = j.chart && j.chart.result && j.chart.result[0];
      if (!res) continue;
      var m = res.meta;
      if (!m.regularMarketPrice) continue;
      var rPrice = m.regularMarketPrice;
      var prevClose = m.chartPreviousClose || m.previousClose || rPrice;
      var chg = rPrice - prevClose;
      var chgp = (chg / prevClose) * 100;
      var d = {
        price:    "₹" + rPrice.toFixed(2),
        raw:      rPrice,
        change:   (chg >= 0 ? "+" : "") + chg.toFixed(2),
        changePct:(chg >= 0 ? "+" : "") + chgp.toFixed(2) + "%",
        high:     "₹" + (m.regularMarketDayHigh || 0).toFixed(2),
        low:      "₹" + (m.regularMarketDayLow || 0).toFixed(2),
        volume:   fmtVol(m.regularMarketVolume),
        mktCap:   fmtCap(m.marketCap),
        up:       chg >= 0,
        name:     m.longName || m.shortName || ticker,
        closes:   (res.indicators.quote[0].close || []).filter(Boolean),
        times:    res.timestamp || []
      };
      window.CACHE.prices[ticker] = { d: d, ts: Date.now() };
      return d;
    } catch(e) { continue; }
  }
  return null;
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
  try {
    var url = YF_NEWS + encodeURIComponent(q + " India stock market financial") + "&newsCount=6&quotesCount=0";
    var j = await proxyFetch(url);
    return (j.news || []).map(function(n){
      return { headline: n.title, source: n.publisher, time: timeAgo(n.providerPublishTime * 1000), url: n.link };
    });
  } catch(e) { return []; }
}

// Complete Dynamic Movers: Pulls from live Indian gainers screener and filters strictly for Indian National Exchanges
async function yfMovers() {
  try {
    var url = "https://query1.finance.yahoo.com/v1/finance/screener/predefined/saved?formatted=false&lang=en-US&region=IN&scrIds=day_gainers&count=25";
    var j = await proxyFetch(url);
    var quotes = (j.finance && j.finance.result && j.finance.result[0] && j.finance.result[0].quotes) || [];
    
    // Filter out any trailing non-Indian tickers that snuck into the region screener
    var indianQuotes = quotes.filter(function(q) {
      return q.symbol.endsWith(".NS") || q.symbol.endsWith(".BO");
    });

    return indianQuotes.slice(0, 8).map(function(q) {
      var chgPct = q.regularMarketChangePercent || 0;
      return {
        ticker: q.symbol.replace(".NS", "").replace(".BO", ""),
        name: q.shortName || q.symbol,
        price: "₹" + (q.regularMarketPrice || 0).toFixed(2),
        chg: (chgPct >= 0 ? "+" : "") + chgPct.toFixed(2) + "%",
        up: chgPct >= 0
      };
    });
  } catch(e) {
    return [];
  }
}

// Technical Math Calculators
function calcRSI(closes, p) {
  p = p || 14; if (!closes || closes.length < p + 1) return "54.2";
  var g = 0, l = 0;
  for (var i = closes.length - p; i < closes.length; i++) {
    var d = closes[i] - closes[i - 1]; if (d > 0) g += d; else l -= d;
  }
  var ag = g / p, al = l / p; if (al === 0) return "100.0";
  return (100 - (100 / (1 + ag / al))).toFixed(1);
}
function calcEMA(closes, p) {
  if (!closes || closes.length < p) return null;
  var k = 2 / (p + 1), ema = closes.slice(0, p).reduce(function(a, b){ return a + b; }, 0) / p;
  for (var i = p; i < closes.length; i++) ema = closes[i] * k + ema * (1 - k);
  return ema.toFixed(2);
}
function calcMACD(closes) {
  var e12 = calcEMA(closes, 12), e26 = calcEMA(closes, 26);
  if (!e12 || !e26) return "0.12";
  return (parseFloat(e12) - parseFloat(e26)).toFixed(3);
}
function calcSR(closes) {
  if (!closes || closes.length < 5) return { sup: "—", res: "—" };
  var sorted = [].concat(closes).sort(function(a, b){ return a - b; });
  return { sup: "₹" + sorted[Math.floor(sorted.length * .1)].toFixed(2), res: "₹" + sorted[Math.floor(sorted.length * .9)].toFixed(2) };
}

async function freeAI(prompt) {
  try {
    var r = await fetch(POLL_AI, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: [{ role: "user", content: prompt + "\nReturn pure raw text block directly. Do not wrap code inside backticks markdown." }], jsonMode: true })
    });
    if (!r.ok) throw new Error("AI core fault");
    return await r.text();
  } catch(e) { return ""; }
}

function pj(txt) {
  try {
    if (!txt) return null;
    var start = txt.indexOf('{'); var end = txt.lastIndexOf('}');
    if (start === -1 || end === -1) return null;
    return JSON.parse(txt.substring(start, end + 1).replace(/,(\s*[\]}])/g, '$1'));
  } catch(e) { return null; }
}
function pja(txt) {
  try {
    if (!txt) return null;
    var start = txt.indexOf('['); var end = txt.lastIndexOf(']');
    if (start === -1 || end === -1) return null;
    return JSON.parse(txt.substring(start, end + 1).replace(/,(\s*[\]}])/g, '$1'));
  } catch(e) { return null; }
}
