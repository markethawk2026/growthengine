/**
 * NC Markets Phase 4B — visible user tools workspace.
 */
(function(){
"use strict";

function esc(v){
  return window.escapeHTML ? window.escapeHTML(String(v == null ? "" : v)) : String(v == null ? "" : v).replace(/[&<>"']/g, function(c){
    return ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[c];
  });
}

function money(v){
  var num = Number(v);
  return Number.isFinite(num) ? "₹" + num.toLocaleString("en-IN", {minimumFractionDigits: 2, maximumFractionDigits: 2}) : "Unavailable";
}

function formatPct(v){
  var num = Number(v);
  if (!Number.isFinite(num)) return "--";
  var sign = num > 0 ? "+" : "";
  return sign + num.toFixed(2) + "%";
}

function root(){ return document.getElementById("ncUserWorkspace"); }
function state(){ return window.NCUserTools.getState(); }

function triggerAnalysis(ticker){
  if (!ticker) return;
  var clean = String(ticker).trim().toUpperCase();
  if (window.runAnalysis) {
    window.runAnalysis(clean);
  }
  var searchInput = document.getElementById("symbolInput") || document.querySelector("input[type='search']");
  if (searchInput) {
    searchInput.value = clean;
  }
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function ensureUI(){
  if (root() || !document.body || !window.NCUserTools) return;
  var wrap = document.createElement("section");
  wrap.id = "ncUserWorkspace";
  wrap.className = "nc-user-workspace";
  wrap.innerHTML = '<div class="ncuw-head">' +
    '<div>' +
      '<div class="ncuw-kicker">PERSONAL FINANCE & TOOLKIT</div>' +
      '<h2>Watchlist & Portfolio</h2>' +
      '<p>Watchlist, portfolio, comparison, screener and price alerts stored locally in this browser.</p>' +
    '</div>' +
    '<button type="button" class="ncuw-refresh">↻ Refresh Workspace</button>' +
  '</div>' +
  '<div class="ncuw-tabs" role="tablist"></div>' +
  '<div id="ncuwPanel"></div>';

  var target = document.getElementById("pg-home") || document.querySelector("main") || document.querySelector(".main") || document.body;
  target.appendChild(wrap);

  wrap.querySelector(".ncuw-refresh").addEventListener("click", render);
  var tabs = [
    ["watchlist", "Watchlist"],
    ["portfolio", "Portfolio"],
    ["compare", "Compare"],
    ["screener", "Screener"],
    ["alerts", "Alerts"],
    ["recent", "Recent Searches"]
  ];
  var tabsEl = wrap.querySelector(".ncuw-tabs");
  tabs.forEach(function(t){
    var b = document.createElement("button");
    b.type = "button";
    b.dataset.tab = t[0];
    b.textContent = t[1];
    b.addEventListener("click", function(){
      active = t[0];
      render();
    });
    tabsEl.appendChild(b);
  });
  render();
}

var active = "watchlist";

async function render(){
  if (!root()) return;
  root().querySelectorAll(".ncuw-tabs button").forEach(function(b){
    b.classList.toggle("active", b.dataset.tab === active);
  });
  var panel = document.getElementById("ncuwPanel");
  panel.innerHTML = '<div class="ncuw-loading">Loading ' + esc(active) + ' data…</div>';
  try {
    if (active === "watchlist") await renderWatchlist(panel);
    else if (active === "portfolio") await renderPortfolio(panel);
    else if (active === "compare") await renderCompare(panel);
    else if (active === "screener") await renderScreener(panel);
    else if (active === "alerts") await renderAlerts(panel);
    else await renderRecent(panel);
  } catch(e) {
    panel.innerHTML = '<div class="errbox">⚠️ ' + esc(e.message || "Unable to load workspace.") + '</div>';
  }
}

async function renderWatchlist(panel){
  var s = state();
  var rows = await Promise.all((s.watchlist || []).map(async function(t){
    var q = null;
    if (window.yfQuote) {
      try { q = await yfQuote(t); } catch(_) {}
    }
    return { ticker: t, q: q };
  }));

  var presets = ["TCS", "RELIANCE", "INFY", "ICICIBANK", "TATAMOTORS"];
  var presetChips = '<div style="margin-top:10px; font-size:12px; color:#94a3b8;">' +
    '<span>Quick add popular stocks: </span>' +
    presets.map(function(p){
      return '<button type="button" class="ncuw-chip-btn" data-add-preset="' + esc(p) + '" style="background:#111827; border:1px solid #334155; color:#38bdf8; border-radius:6px; padding:3px 8px; margin:0 4px 4px 0; font-size:11px; cursor:pointer;">+ ' + esc(p) + '</button>';
    }).join('') +
  '</div>';

  var formHtml = '<form id="ncWatchForm" class="ncuw-form">' +
    '<input name="ticker" placeholder="Enter ticker (e.g. TCS or RELIANCE.NS)" required>' +
    '<button type="submit">Add to Watchlist</button>' +
  '</form>' + presetChips + '<div style="margin-bottom:16px;"></div>';

  var listHtml = "";
  if (rows.length) {
    listHtml = '<div class="ncuw-grid">' + rows.map(function(r){
      var name = r.q && r.q.name ? r.q.name : "NSE Listed Stock";
      var price = r.q && r.q.raw ? money(r.q.raw) : "Quote Loading…";
      var isUp = r.q && r.q.isUp;
      var change = r.q && r.q.changePct != null ? formatPct(r.q.changePct) : "";
      var changeClass = isUp ? "up" : "down";
      var changeSymbol = isUp ? "▲ " : "▼ ";

      return '<article class="ncuw-card">' +
        '<div>' +
          '<div style="display:flex; justify-content:space-between; align-items:flex-start;">' +
            '<strong>' + esc(r.ticker) + '</strong>' +
            (change ? '<span class="' + changeClass + '" style="font-weight:700; font-size:12px;">' + changeSymbol + esc(change) + '</span>' : '') +
          '</div>' +
          '<div class="ncuw-muted" style="font-size:12px; margin-top:2px;">' + esc(name) + '</div>' +
          '<div class="ncuw-price">' + esc(price) + '</div>' +
        '</div>' +
        '<div class="ncuw-actions">' +
          '<button type="button" data-open="' + esc(r.ticker) + '">Analyze</button>' +
          '<button type="button" data-remove="' + esc(r.ticker) + '" style="background:#271111; border-color:#7f1d1d; color:#fca5a5;">Remove</button>' +
        '</div>' +
      '</article>';
    }).join('') + '</div>';
  } else {
    listHtml = '<div class="ncuw-empty">' +
      '<p style="margin:0 0 8px 0; font-weight:600;">Your watchlist is currently empty.</p>' +
      '<p style="margin:0; font-size:12px;">Type a ticker above or click one of the quick add stock chips to monitor live quotes and technical signals.</p>' +
    '</div>';
  }

  panel.innerHTML = formHtml + listHtml;

  var watchForm = panel.querySelector("#ncWatchForm");
  if (watchForm) {
    watchForm.addEventListener("submit", function(e){
      e.preventDefault();
      var input = watchForm.querySelector("input[name='ticker']");
      if (input && input.value) {
        NCUserTools.addWatchlist(input.value);
        render();
      }
    });
  }

  panel.querySelectorAll("[data-add-preset]").forEach(function(b){
    b.onclick = function(){
      NCUserTools.addWatchlist(b.dataset.addPreset);
      render();
    };
  });

  panel.querySelectorAll("[data-remove]").forEach(function(b){
    b.onclick = function(){
      NCUserTools.removeWatchlist(b.dataset.remove);
      render();
    };
  });

  panel.querySelectorAll("[data-open]").forEach(function(b){
    b.onclick = function(){
      triggerAnalysis(b.dataset.open);
    };
  });
}

async function renderPortfolio(panel){
  var rows = await NCUserTools.portfolioSnapshot();
  var invested = rows.reduce(function(a,r){ return a + (r.invested || 0); }, 0);
  var value = rows.reduce(function(a,r){ return a + (r.currentValue || (r.invested || 0)); }, 0);
  var pnl = value - invested;
  var pnlPct = invested > 0 ? (pnl / invested) * 100 : 0;
  var pnlClass = pnl >= 0 ? "up" : "down";
  var pnlSign = pnl >= 0 ? "+" : "";

  var formHtml = '<form id="ncPortfolioForm" class="ncuw-form ncuw-form-wide">' +
    '<input name="ticker" placeholder="Ticker (e.g. TCS)" required>' +
    '<input name="quantity" type="number" min="0.0001" step="any" placeholder="Qty" required>' +
    '<input name="averagePrice" placeholder="Avg Buy Price (₹)" type="number" step="any" required>' +
    '<button type="submit">Add Holding</button>' +
  '</form>';

  var summaryHtml = '<div class="ncuw-summary">' +
    '<div><span>Total Invested</span><strong>' + money(invested) + '</strong></div>' +
    '<div><span>Current Portfolio Value</span><strong>' + money(value) + '</strong></div>' +
    '<div><span>Total Return (P&amp;L)</span><strong class="' + pnlClass + '">' + pnlSign + money(pnl) + ' (' + pnlSign + pnlPct.toFixed(2) + '%)</strong></div>' +
  '</div>';

  var presets = [
    { ticker: "TCS", qty: 10, price: 2342 },
    { ticker: "RELIANCE", qty: 5, price: 1250 },
    { ticker: "INFY", qty: 15, price: 1420 }
  ];

  var sampleChips = '<div style="margin-bottom:16px; font-size:12px; color:#94a3b8;">' +
    '<span>Quick add sample holding: </span>' +
    presets.map(function(p){
      return '<button type="button" class="ncuw-sample-btn" data-sample-ticker="' + esc(p.ticker) + '" data-sample-qty="' + p.qty + '" data-sample-price="' + p.price + '" style="background:#111827; border:1px solid #334155; color:#38bdf8; border-radius:6px; padding:3px 8px; margin:0 4px 4px 0; font-size:11px; cursor:pointer;">+ ' + esc(p.ticker) + ' (' + p.qty + ' @ ₹' + p.price + ')</button>';
    }).join('') +
  '</div>';

  var tableHtml = "";
  if (rows.length) {
    tableHtml = '<div class="ncuw-tablewrap"><table class="ncuw-table"><thead><tr>' +
      '<th>Stock Ticker</th><th>Quantity</th><th>Avg. Cost</th><th>Current Price</th><th>Current Value</th><th>P&amp;L</th><th>Actions</th>' +
    '</tr></thead><tbody>' +
    rows.map(function(r){
      var curr = r.currentPrice != null ? money(r.currentPrice) : "Loading…";
      var currVal = r.currentValue != null ? money(r.currentValue) : money(r.invested);
      var rowPnl = r.pnl != null ? r.pnl : 0;
      var rowPnlPct = r.pnlPct != null ? r.pnlPct : 0;
      var rClass = rowPnl >= 0 ? "up" : "down";
      var rSign = rowPnl >= 0 ? "+" : "";

      return '<tr>' +
        '<td><strong>' + esc(r.ticker) + '</strong></td>' +
        '<td>' + esc(r.quantity) + '</td>' +
        '<td>' + money(r.averagePrice) + '</td>' +
        '<td>' + esc(curr) + '</td>' +
        '<td>' + esc(currVal) + '</td>' +
        '<td class="' + rClass + '" style="font-weight:700;">' + rSign + money(rowPnl) + ' (' + rSign + rowPnlPct.toFixed(2) + '%)</td>' +
        '<td>' +
          '<button type="button" data-open="' + esc(r.ticker) + '" style="margin-right:4px;">Analyze</button>' +
          '<button type="button" data-holding="' + esc(r.id) + '" style="background:#271111; border-color:#7f1d1d; color:#fca5a5;">Remove</button>' +
        '</td>' +
      '</tr>';
    }).join('') + '</tbody></table></div>';
  } else {
    tableHtml = '<div class="ncuw-empty">' +
      '<p style="margin:0 0 8px 0; font-weight:600;">No holdings in your portfolio.</p>' +
      '<p style="margin:0; font-size:12px;">Add your bought stocks using the form above or click one of the quick sample buttons to track portfolio profit/loss live.</p>' +
    '</div>';
  }

  panel.innerHTML = formHtml + sampleChips + summaryHtml + tableHtml;

  var portForm = panel.querySelector("#ncPortfolioForm");
  if (portForm) {
    portForm.onsubmit = function(e){
      e.preventDefault();
      var f = new FormData(e.target);
      try {
        NCUserTools.addHolding({
          ticker: f.get("ticker"),
          quantity: f.get("quantity"),
          averagePrice: f.get("averagePrice")
        });
        render();
      } catch(err) {
        alert(err.message);
      }
    };
  }

  panel.querySelectorAll("[data-sample-ticker]").forEach(function(b){
    b.onclick = function(){
      try {
        NCUserTools.addHolding({
          ticker: b.dataset.sampleTicker,
          quantity: b.dataset.sampleQty,
          averagePrice: b.dataset.samplePrice
        });
        render();
      } catch(e) {
        alert(e.message);
      }
    };
  });

  panel.querySelectorAll("[data-holding]").forEach(function(b){
    b.onclick = function(){
      NCUserTools.removeHolding(b.dataset.holding);
      render();
    };
  });

  panel.querySelectorAll("[data-open]").forEach(function(b){
    b.onclick = function(){
      triggerAnalysis(b.dataset.open);
    };
  });
}

async function renderCompare(panel){
  var s = state();
  var defaultTickers = (s.watchlist && s.watchlist.length > 0) ? s.watchlist.slice(0, 5).join(", ") : "TCS, RELIANCE, INFY";

  panel.innerHTML = '<div style="margin-bottom:12px;">' +
    '<form id="ncCompareForm" class="ncuw-form">' +
      '<input name="tickers" value="' + esc(defaultTickers) + '" placeholder="Enter up to 5 tickers, comma-separated (e.g. TCS, RELIANCE, INFY)" required>' +
      '<button type="submit">Compare Metrics</button>' +
    '</form>' +
    '<div style="font-size:12px; color:#94a3b8; margin-top:-8px; margin-bottom:12px;">' +
      'Presets: ' +
      '<button type="button" class="ncuw-preset-cmp" data-preset="TCS, INFY, WIT" style="background:none; border:none; color:#38bdf8; cursor:pointer; text-decoration:underline;">IT Sector</button> | ' +
      '<button type="button" class="ncuw-preset-cmp" data-preset="ICICIBANK, SBIN, HDFCBANK" style="background:none; border:none; color:#38bdf8; cursor:pointer; text-decoration:underline;">Banking Giants</button>' +
    '</div>' +
  '</div>' +
  '<div id="ncCompareResults"></div>';

  var form = panel.querySelector("#ncCompareForm");
  var out = panel.querySelector("#ncCompareResults");

  async function executeCompare(tickersStr){
    out.innerHTML = '<div class="ncuw-loading">Comparing technical metrics for ' + esc(tickersStr) + '…</div>';
    var rawList = tickersStr.split(",").map(function(x){ return x.trim(); }).filter(Boolean);
    var rows = await NCUserTools.compare(rawList);

    if (!rows || !rows.length) {
      out.innerHTML = '<div class="ncuw-empty">No valid stock tickers provided for comparison.</div>';
      return;
    }

    out.innerHTML = '<div class="ncuw-tablewrap"><table class="ncuw-table"><thead><tr>' +
      '<th>Stock</th><th>Price</th><th>24h Change</th><th>Technical Score</th><th>RSI (14)</th><th>EMA Trend</th><th>Action</th>' +
    '</tr></thead><tbody>' +
    rows.map(function(r){
      if (r.error) {
        return '<tr><td><strong>' + esc(r.ticker) + '</strong></td><td colspan="5" class="ncuw-muted">Quote Data Unavailable</td><td><button type="button" data-open="' + esc(r.ticker) + '">Analyze</button></td></tr>';
      }
      var isUp = r.changePct != null && r.changePct >= 0;
      var cClass = isUp ? "up" : "down";
      var scoreColor = (r.technicalScore || 0) >= 60 ? "#22c55e" : ((r.technicalScore || 0) <= 40 ? "#ef4444" : "#eab308");

      return '<tr>' +
        '<td><strong>' + esc(r.ticker) + '</strong></td>' +
        '<td>' + money(r.price) + '</td>' +
        '<td class="' + cClass + '" style="font-weight:700;">' + formatPct(r.changePct) + '</td>' +
        '<td><span style="display:inline-block; padding:2px 8px; border-radius:12px; background:' + scoreColor + '22; color:' + scoreColor + '; border:1px solid ' + scoreColor + '; font-weight:800; font-size:12px;">' + (r.technicalScore || 0) + ' / 100</span></td>' +
        '<td>' + (r.rsi != null ? Number(r.rsi).toFixed(1) : "--") + '</td>' +
        '<td>' + esc(r.emaTrend || "Neutral") + '</td>' +
        '<td><button type="button" data-open="' + esc(r.ticker) + '">Analyze</button></td>' +
      '</tr>';
    }).join('') + '</tbody></table></div>';

    out.querySelectorAll("[data-open]").forEach(function(b){
      b.onclick = function(){ triggerAnalysis(b.dataset.open); };
    });
  }

  form.onsubmit = function(e){
    e.preventDefault();
    var val = form.querySelector("input[name='tickers']").value;
    executeCompare(val);
  };

  panel.querySelectorAll(".ncuw-preset-cmp").forEach(function(b){
    b.onclick = function(){
      form.querySelector("input[name='tickers']").value = b.dataset.preset;
      executeCompare(b.dataset.preset);
    };
  });

  executeCompare(defaultTickers);
}

async function renderScreener(panel){
  var s = state();
  var defaultUniverse = (s.watchlist && s.watchlist.length > 0) ? s.watchlist.join(", ") : "TCS, RELIANCE, INFY, ICICIBANK, TATAMOTORS, SBIN";

  panel.innerHTML = '<form id="ncScreenForm" class="ncuw-form">' +
    '<input name="tickers" value="' + esc(defaultUniverse) + '" placeholder="Ticker universe, comma-separated" required>' +
    '<select name="filter">' +
      '<option value="bullish">Bullish Momentum (Score ≥ 60)</option>' +
      '<option value="bearish">Bearish Outlook (Score ≤ 40)</option>' +
      '<option value="oversold">Oversold (RSI < 30)</option>' +
      '<option value="overbought">Overbought (RSI > 70)</option>' +
    '</select>' +
    '<button type="submit">Run Screener</button>' +
  '</form>' +
  '<div id="ncScreenResults"></div>';

  var form = panel.querySelector("#ncScreenForm");
  var out = panel.querySelector("#ncScreenResults");

  async function executeScreener(){
    out.innerHTML = '<div class="ncuw-loading">Screening stocks…</div>';
    var f = new FormData(form);
    var rawList = String(f.get("tickers") || "").split(",").map(function(x){ return x.trim(); }).filter(Boolean);
    var filterType = f.get("filter");

    var res = await NCUserTools.screen(rawList, filterType);

    if (!res || !res.length) {
      out.innerHTML = '<div class="ncuw-empty">No stocks matched the selected screening criteria (' + esc(filterType) + ').</div>';
      return;
    }

    out.innerHTML = '<div class="ncuw-grid">' + res.map(function(r){
      var scoreColor = (r.technicalScore || 0) >= 60 ? "#22c55e" : ((r.technicalScore || 0) <= 40 ? "#ef4444" : "#eab308");
      return '<article class="ncuw-card">' +
        '<div style="display:flex; justify-content:space-between; align-items:flex-start;">' +
          '<strong>' + esc(r.ticker) + '</strong>' +
          '<span style="padding:2px 8px; border-radius:12px; background:' + scoreColor + '22; color:' + scoreColor + '; border:1px solid ' + scoreColor + '; font-weight:800; font-size:11px;">Score: ' + (r.technicalScore || 0) + '</span>' +
        '</div>' +
        '<div class="ncuw-price" style="margin-top:6px;">' + money(r.price) + '</div>' +
        '<div class="ncuw-muted" style="font-size:12px; margin-top:4px;">' +
          'RSI: <strong>' + (r.rsi != null ? Number(r.rsi).toFixed(1) : "--") + '</strong> | Trend: <strong>' + esc(r.emaTrend || "Neutral") + '</strong>' +
        '</div>' +
        '<div class="ncuw-actions">' +
          '<button type="button" data-open="' + esc(r.ticker) + '">Analyze Stock</button>' +
        '</div>' +
      '</article>';
    }).join('') + '</div>';

    out.querySelectorAll("[data-open]").forEach(function(b){
      b.onclick = function(){ triggerAnalysis(b.dataset.open); };
    });
  }

  form.onsubmit = function(e){
    e.preventDefault();
    executeScreener();
  };

  executeScreener();
}

async function renderAlerts(panel){
  var s = state();
  var alerts = s.alerts || [];

  var formHtml = '<form id="ncAlertForm" class="ncuw-form ncuw-form-wide">' +
    '<input name="ticker" placeholder="Ticker (e.g. TCS)" required>' +
    '<select name="type">' +
      '<option value="priceAbove">Price goes above (₹)</option>' +
      '<option value="priceBelow">Price goes below (₹)</option>' +
    '</select>' +
    '<input name="threshold" placeholder="Threshold Price (₹)" type="number" step="any" required>' +
    '<button type="submit">Create Alert</button>' +
  '</form>';

  var listHtml = "";
  if (alerts.length) {
    listHtml = '<div class="ncuw-grid">' + alerts.map(function(a){
      var condLabel = a.type === "priceBelow" ? "Price Below" : "Price Above";
      var statusBadge = a.triggered ? '<span style="background:#ef444422; color:#ef4444; border:1px solid #ef4444; padding:2px 6px; border-radius:6px; font-size:10px; font-weight:800;">TRIGGERED</span>' : '<span style="background:#22c55e22; color:#22c55e; border:1px solid #22c55e; padding:2px 6px; border-radius:6px; font-size:10px; font-weight:800;">ACTIVE</span>';

      return '<article class="ncuw-card">' +
        '<div style="display:flex; justify-content:space-between; align-items:center;">' +
          '<strong>' + esc(a.ticker) + '</strong>' +
          statusBadge +
        '</div>' +
        '<div style="margin-top:8px; font-size:13px;">' +
          'Notify when ' + esc(condLabel) + ' <strong>' + money(a.threshold) + '</strong>' +
        '</div>' +
        '<div class="ncuw-actions">' +
          '<button type="button" data-alert="' + esc(a.id) + '" style="background:#271111; border-color:#7f1d1d; color:#fca5a5;">Delete Alert</button>' +
        '</div>' +
      '</article>';
    }).join('') + '</div>';
  } else {
    listHtml = '<div class="ncuw-empty">' +
      '<p style="margin:0 0 8px 0; font-weight:600;">No price alerts set.</p>' +
      '<p style="margin:0; font-size:12px;">Create custom price threshold alerts using the form above to get notified when target price levels are crossed.</p>' +
    '</div>';
  }

  panel.innerHTML = formHtml + listHtml;

  var alertForm = panel.querySelector("#ncAlertForm");
  if (alertForm) {
    alertForm.onsubmit = function(e){
      e.preventDefault();
      var f = new FormData(e.target);
      try {
        NCUserTools.addAlert({
          ticker: f.get("ticker"),
          type: f.get("type"),
          threshold: f.get("threshold")
        });
        render();
      } catch(err) {
        alert(err.message);
      }
    };
  }

  panel.querySelectorAll("[data-alert]").forEach(function(b){
    b.onclick = function(){
      NCUserTools.removeAlert(b.dataset.alert);
      render();
    };
  });
}

async function renderRecent(panel){
  var rows = state().recent || [];

  if (!rows.length) {
    panel.innerHTML = '<div class="ncuw-empty">' +
      '<p style="margin:0 0 8px 0; font-weight:600;">No recent searches found.</p>' +
      '<p style="margin:0; font-size:12px;">Search or analyze any stock ticker from the header search bar or quick view options to build your search history.</p>' +
    '</div>';
    return;
  }

  var gridHtml = '<div class="ncuw-grid">' + rows.map(function(t){
    return '<article class="ncuw-card">' +
      '<div style="font-size:16px; font-weight:800;">' + esc(t) + '</div>' +
      '<div class="ncuw-actions">' +
        '<button type="button" data-recent="' + esc(t) + '">Re-Analyze Stock</button>' +
      '</div>' +
    '</article>';
  }).join('') + '</div>';

  panel.innerHTML = gridHtml;

  panel.querySelectorAll("[data-recent]").forEach(function(b){
    b.onclick = function(){
      triggerAnalysis(b.dataset.recent);
    };
  });
}

window.addEventListener("DOMContentLoaded", ensureUI);
window.addEventListener("nc:phase4-change", function(){ if (root()) render(); });
})();
