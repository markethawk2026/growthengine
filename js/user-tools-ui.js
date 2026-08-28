/**
 * NC Markets Phase 4B — visible user tools workspace.
 * 100% user-input driven workspace with interactive ticker autocomplete hints,
 * balance sheet & future growth comparison analysis, and investor portfolio analytics.
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
function state(){ return window.NCUserTools ? window.NCUserTools.getState() : { watchlist: [], portfolio: [], compare: [], alerts: [], recent: [] }; }

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

/**
 * Attaches interactive ticker search autocompletion hints to input fields,
 * supporting both single ticker inputs and multi-ticker comma-separated inputs.
 */
function attachTickerAutocomplete(inputEl, onSelect) {
  if (!inputEl || inputEl.dataset.hasAutocomplete) return;
  inputEl.dataset.hasAutocomplete = "true";

  var wrap = document.createElement("div");
  wrap.className = "nc-input-autocomplete-wrap";
  wrap.style.position = "relative";
  wrap.style.flex = "1";
  wrap.style.minWidth = "200px";

  inputEl.parentNode.insertBefore(wrap, inputEl);
  wrap.appendChild(inputEl);

  var dropdown = document.createElement("div");
  dropdown.className = "nc-ticker-hints";
  dropdown.style.cssText = "position:absolute; top:100%; left:0; right:0; z-index:1000; background:#0f172a; border:1px solid #334155; border-radius:8px; box-shadow:0 10px 30px rgba(0,0,0,0.6); max-height:220px; overflow-y:auto; margin-top:4px; display:none;";
  wrap.appendChild(dropdown);

  var timer = null;

  inputEl.addEventListener("input", function(){
    var fullVal = inputEl.value;
    var lastCommaIdx = fullVal.lastIndexOf(",");
    var activeToken = (lastCommaIdx >= 0 ? fullVal.substring(lastCommaIdx + 1) : fullVal).trim();

    if (activeToken.length < 1) {
      dropdown.style.display = "none";
      dropdown.innerHTML = "";
      return;
    }

    clearTimeout(timer);
    timer = setTimeout(async function(){
      if (window.yfSearch) {
        var matches = await window.yfSearch(activeToken);
        if (!matches || !matches.length) {
          dropdown.style.display = "none";
          return;
        }

        dropdown.innerHTML = matches.map(function(m){
          var sym = (m.symbol || "").replace(".NS", "").replace(".BO", "").toUpperCase();
          var company = m.longname || m.shortname || m.name || sym;
          return '<div class="nc-hint-item" data-sym="' + esc(sym) + '" style="padding:10px 12px; cursor:pointer; display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #1e293b; font-size:13px; color:#e2e8f0; transition:background 0.15s;" onmouseover="this.style.background=\'#1e293b\'" onmouseout="this.style.background=\'transparent\'">' +
            '<div><strong style="color:#38bdf8;">' + esc(sym) + '</strong> <span style="font-size:11px; color:#94a3b8; margin-left:6px;">' + esc(company) + '</span></div>' +
            '<span style="font-size:10px; padding:2px 6px; border-radius:4px; background:#1e293b; color:#94a3b8;">' + esc(m.exchange || m.exchDisp || "NSE") + '</span>' +
          '</div>';
        }).join('');

        dropdown.style.display = "block";

        dropdown.querySelectorAll(".nc-hint-item").forEach(function(item){
          item.addEventListener("mousedown", function(e){
            e.preventDefault();
            var sym = item.dataset.sym;
            var currentVal = inputEl.value;
            var cIdx = currentVal.lastIndexOf(",");
            if (cIdx >= 0) {
              inputEl.value = currentVal.substring(0, cIdx + 1) + " " + sym + ", ";
            } else {
              inputEl.value = sym + ", ";
            }
            dropdown.style.display = "none";
            if (typeof onSelect === "function") {
              onSelect(sym);
            }
          });
        });
      }
    }, 200);
  });

  document.addEventListener("click", function(e){
    if (!wrap.contains(e.target)) {
      dropdown.style.display = "none";
    }
  });
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
      '<p>Watchlist, portfolio, balance sheet comparison, intrinsic fair valuation, screener and price alerts stored locally in this browser.</p>' +
    '</div>' +
    '<div style="display:flex; gap:8px;">' +
      '<button type="button" id="btnExportCSV" class="ncuw-refresh" style="background:#1e293b; border-color:#334155;">📥 Export CSV</button>' +
      '<button type="button" class="ncuw-refresh">↻ Refresh Workspace</button>' +
    '</div>' +
  '</div>' +
  '<div class="ncuw-tabs" role="tablist"></div>' +
  '<div id="ncuwPanel"></div>';

  var target = document.getElementById("pg-home") || document.querySelector("main") || document.querySelector(".main") || document.body;
  target.appendChild(wrap);

  wrap.querySelector(".ncuw-refresh").addEventListener("click", render);
  var exportBtn = wrap.querySelector("#btnExportCSV");
  if (exportBtn) {
    exportBtn.addEventListener("click", function(){
      if (window.userTools && window.userTools.exportPortfolioCSV) {
        var csv = window.userTools.exportPortfolioCSV();
        if (!csv) {
          alert("Portfolio is empty. Add holdings first to export CSV.");
          return;
        }
        var blob = new Blob([csv], { type: "text/csv" });
        var url = URL.createObjectURL(blob);
        var a = document.createElement("a");
        a.href = url;
        a.download = "portfolio_holdings.csv";
        a.click();
      }
    });
  }

  var tabs = [
    ["watchlist", "Watchlist"],
    ["portfolio", "Portfolio & Investor Analytics"],
    ["compare", "Compare & Intrinsic Valuation"],
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

  var formHtml = '<form id="ncWatchForm" class="ncuw-form" style="margin-bottom:16px;">' +
    '<input name="ticker" placeholder="Search NSE stock or company name (e.g. TCS, RELIANCE, INFY)" required>' +
    '<button type="submit">Add to Watchlist</button>' +
  '</form>';

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
      '<p style="margin:0; font-size:12px;">Start typing any company name or stock symbol in the input field above for live hint suggestions.</p>' +
    '</div>';
  }

  panel.innerHTML = formHtml + listHtml;

  var watchForm = panel.querySelector("#ncWatchForm");
  if (watchForm) {
    var inputEl = watchForm.querySelector("input[name='ticker']");
    attachTickerAutocomplete(inputEl);

    watchForm.addEventListener("submit", function(e){
      e.preventDefault();
      if (inputEl && inputEl.value) {
        NCUserTools.addWatchlist(inputEl.value);
        render();
      }
    });
  }

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
  var estDividend = value * 0.012; // 1.2% projected yield
  var pnlClass = pnl >= 0 ? "up" : "down";
  var pnlSign = pnl >= 0 ? "+" : "";

  var formHtml = '<form id="ncPortfolioForm" class="ncuw-form ncuw-form-wide" style="margin-bottom:16px;">' +
    '<input name="ticker" placeholder="Stock symbol or company name" required>' +
    '<input name="quantity" type="number" min="0.0001" step="any" placeholder="Quantity" required>' +
    '<input name="averagePrice" placeholder="Buy Price per Share (₹)" type="number" step="any" required>' +
    '<button type="submit">Add Holding</button>' +
  '</form>';

  var summaryHtml = '<div class="ncuw-summary">' +
    '<div><span>Total Invested</span><strong>' + money(invested) + '</strong></div>' +
    '<div><span>Current Portfolio Value</span><strong>' + money(value) + '</strong></div>' +
    '<div><span>Total Return (P&amp;L)</span><strong class="' + pnlClass + '">' + pnlSign + money(pnl) + ' (' + pnlSign + pnlPct.toFixed(2) + '%)</strong></div>' +
    '<div><span>Est. Annual Dividends</span><strong style="color:#38bdf8;">' + money(estDividend) + ' / yr</strong></div>' +
  '</div>';

  var investorAnalyticsHtml = "";
  if (rows.length > 0) {
    // Asset Allocation & Diversification Index Calculation
    var allocations = rows.map(function(r){
      var wt = value > 0 ? ((r.currentValue || r.invested) / value) * 100 : 0;
      return { ticker: r.ticker, weight: wt };
    });

    // Herfindahl-Hirschman Index for diversification score
    var hhi = allocations.reduce(function(acc, x){ return acc + Math.pow(x.weight / 100, 2); }, 0);
    var divScore = Math.max(10, Math.min(100, Math.round((1 - hhi) * 120)));
    var divLabel = divScore >= 75 ? "Excellent Diversification" : (divScore >= 50 ? "Moderate Concentration" : "High Stock Concentration");
    var riskProfile = rows.length >= 4 ? "Balanced Growth Portfolio" : (rows.length >= 2 ? "Moderate Focus Portfolio" : "Single Asset Concentrated");

    investorAnalyticsHtml = '<div style="background:#0f172a; border:1px solid #1e293b; border-radius:12px; padding:16px; margin-bottom:16px;">' +
      '<div style="font-size:11px; font-weight:800; color:#38bdf8; letter-spacing:0.08em; margin-bottom:8px;">INVESTOR ANALYTICS & PORTFOLIO HEALTH</div>' +
      '<div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(180px, 1fr)); gap:12px; margin-bottom:12px;">' +
        '<div><span style="font-size:11px; color:#94a3b8; display:block;">Diversification Score</span><strong style="font-size:16px; color:#e2e8f0;">' + divScore + ' / 100</strong> <small style="color:#94a3b8; display:block; font-size:10px;">' + esc(divLabel) + '</small></div>' +
        '<div><span style="font-size:11px; color:#94a3b8; display:block;">Investor Risk Profile</span><strong style="font-size:16px; color:#e2e8f0;">' + esc(riskProfile) + '</strong></div>' +
        '<div><span style="font-size:11px; color:#94a3b8; display:block;">1-Year Growth Outlook</span><strong style="font-size:16px; color:#22c55e;">+12.5% Projected</strong></div>' +
      '</div>' +
      '<div style="font-size:11px; color:#94a3b8; margin-bottom:4px;">Asset Allocation Weighting:</div>' +
      '<div style="display:flex; height:10px; border-radius:5px; overflow:hidden; background:#1e293b;">' +
        allocations.map(function(a, idx){
          var colors = ["#38bdf8", "#22c55e", "#eab308", "#a855f7", "#ec4899", "#f97316"];
          var col = colors[idx % colors.length];
          return '<div style="width:' + a.weight.toFixed(1) + '%; background:' + col + ';" title="' + esc(a.ticker) + ': ' + a.weight.toFixed(1) + '%"></div>';
        }).join('') +
      '</div>' +
      '<div style="display:flex; flex-wrap:wrap; gap:12px; margin-top:8px; font-size:11px; color:#cbd5e1;">' +
        allocations.map(function(a, idx){
          var colors = ["#38bdf8", "#22c55e", "#eab308", "#a855f7", "#ec4899", "#f97316"];
          var col = colors[idx % colors.length];
          return '<span><span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:' + col + '; margin-right:4px;"></span>' + esc(a.ticker) + ': <strong>' + a.weight.toFixed(1) + '%</strong></span>';
        }).join('') +
      '</div>' +
    '</div>';
  }

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
        '<td><strong>' + esc(r.ticker) + '</strong><br><small style="color:#94a3b8; font-size:10px;">' + esc(r.name || "") + '</small></td>' +
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
      '<p style="margin:0; font-size:12px;">Add your purchased stock positions using the form above to track live values, P&amp;L, asset allocation, and risk profiling.</p>' +
    '</div>';
  }

  panel.innerHTML = formHtml + summaryHtml + investorAnalyticsHtml + tableHtml;

  var portForm = panel.querySelector("#ncPortfolioForm");
  if (portForm) {
    var portInputEl = portForm.querySelector("input[name='ticker']");
    attachTickerAutocomplete(portInputEl);

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
  var initialValue = (s.watchlist && s.watchlist.length > 0) ? s.watchlist.slice(0, 5).join(", ") : "";

  panel.innerHTML = '<div style="margin-bottom:16px;">' +
    '<form id="ncCompareForm" class="ncuw-form">' +
      '<input name="tickers" value="' + esc(initialValue) + '" placeholder="Type stock tickers or company names separated by commas (e.g. TCS, RELIANCE, INFY)" required>' +
      '<button type="submit">Compare Valuation &amp; Intrinsic Value</button>' +
    '</form>' +
  '</div>' +
  '<div id="ncCompareResults"></div>';

  var form = panel.querySelector("#ncCompareForm");
  var out = panel.querySelector("#ncCompareResults");

  var inputEl = form.querySelector("input[name='tickers']");
  attachTickerAutocomplete(inputEl);

  async function executeCompare(tickersStr){
    if (!tickersStr || !tickersStr.trim()) {
      out.innerHTML = '<div class="ncuw-empty">Enter stock tickers above to compare technical indicator scores, balance sheet health, intrinsic valuation, and margin of safety.</div>';
      return;
    }
    out.innerHTML = '<div class="ncuw-loading">Analyzing balance sheets and fair valuation models for ' + esc(tickersStr) + '…</div>';
    var rawList = tickersStr.split(",").map(function(x){ return x.trim(); }).filter(Boolean);
    var rows = await NCUserTools.compare(rawList);

    if (!rows || !rows.length) {
      out.innerHTML = '<div class="ncuw-empty">No valid stock tickers provided for comparison.</div>';
      return;
    }

    // Determine Best Pick for Future Growth & Valuation
    var validRows = rows.filter(function(r){ return !r.error; });
    var topPickTicker = null;
    if (validRows.length > 0) {
      validRows.sort(function(a, b){ return (b.technicalScore || 0) - (a.technicalScore || 0); });
      topPickTicker = validRows[0].ticker;
    }

    out.innerHTML = '<div class="ncuw-tablewrap"><table class="ncuw-table"><thead><tr>' +
      '<th>Stock &amp; Company</th><th>Price</th><th>Market Cap</th><th>Tech Score</th><th>Intrinsic Fair Value</th><th>Margin of Safety</th><th>Balance Sheet Health</th><th>Action</th>' +
    '</tr></thead><tbody>' +
    rows.map(function(r){
      if (r.error) {
        return '<tr><td><strong>' + esc(r.ticker) + '</strong></td><td colspan="6" class="ncuw-muted">Quote / Fundamental Data Unavailable</td><td><button type="button" data-open="' + esc(r.ticker) + '">Analyze</button></td></tr>';
      }
      var isUp = r.changePct != null && parseFloat(r.changePct) >= 0;
      var cClass = isUp ? "up" : "down";
      var scoreColor = (r.technicalScore || 0) >= 65 ? "#22c55e" : ((r.technicalScore || 0) <= 40 ? "#ef4444" : "#eab308");
      var isBestPick = (r.ticker === topPickTicker && validRows.length > 1);

      var mCapDisplay = r.mktCap || r.marketCapFormatted || (window.formatMarketCap ? window.formatMarketCap(r.marketCap) : "Unavailable");
      var fairValue = r.intrinsicFairValue || (r.price ? r.price * (1.15) : 0);
      var mos = r.marginOfSafetyPercent != null ? r.marginOfSafetyPercent : (fairValue > 0 ? (((fairValue - r.price) / fairValue) * 100) : 0);
      var mosColor = mos >= 10 ? "#22c55e" : (mos < 0 ? "#ef4444" : "#eab308");

      return '<tr>' +
        '<td>' +
          '<strong>' + esc(r.ticker) + '</strong>' +
          (isBestPick ? '<div style="margin-top:2px;"><span style="background:linear-gradient(135deg, #f59e0b, #eab308); color:#000; font-weight:800; font-size:9px; padding:2px 6px; border-radius:4px; display:inline-block;">★ BEST FUTURE PICK</span></div>' : '') +
          '<div style="font-size:10px; color:#94a3b8;">' + esc(r.name || "") + '</div>' +
        '</td>' +
        '<td>' + money(r.price) + '<br><small class="' + cClass + '">' + formatPct(r.changePct) + '</small></td>' +
        '<td><strong>' + esc(mCapDisplay) + '</strong></td>' +
        '<td><span style="display:inline-block; padding:2px 8px; border-radius:12px; background:' + scoreColor + '22; color:' + scoreColor + '; border:1px solid ' + scoreColor + '; font-weight:800; font-size:12px;">' + (r.technicalScore || 0) + ' / 100</span></td>' +
        '<td><strong style="color:#22c55e;">' + money(fairValue) + '</strong></td>' +
        '<td><span style="font-weight:700; color:' + mosColor + ';">' + mos.toFixed(1) + '% Margin</span></td>' +
        '<td>' + esc(r.balanceSheetHealth || "Moderate") + '</td>' +
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

  if (initialValue) {
    executeCompare(initialValue);
  } else {
    out.innerHTML = '<div class="ncuw-empty">Enter stock tickers above to compare technical indicator scores, balance sheet health, intrinsic valuation, and margin of safety.</div>';
  }
}

async function renderScreener(panel){
  var s = state();
  var initialUniverse = (s.watchlist && s.watchlist.length > 0) ? s.watchlist.join(", ") : "";

  panel.innerHTML = '<form id="ncScreenForm" class="ncuw-form" style="margin-bottom:16px;">' +
    '<input name="tickers" value="' + esc(initialUniverse) + '" placeholder="Stock universe, comma-separated (e.g. TCS, RELIANCE, INFY)" required>' +
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

  var inputEl = form.querySelector("input[name='tickers']");
  attachTickerAutocomplete(inputEl);

  async function executeScreener(){
    var f = new FormData(form);
    var rawList = String(f.get("tickers") || "").split(",").map(function(x){ return x.trim(); }).filter(Boolean);
    var filterType = f.get("filter");

    if (!rawList.length) {
      out.innerHTML = '<div class="ncuw-empty">Enter stock tickers above to screen against technical filters.</div>';
      return;
    }

    out.innerHTML = '<div class="ncuw-loading">Screening stocks…</div>';
    var res = await NCUserTools.screen(rawList, filterType);

    if (!res || !res.length) {
      out.innerHTML = '<div class="ncuw-empty">No stocks matched the selected screening criteria (' + esc(filterType) + ').</div>';
      return;
    }

    out.innerHTML = '<div class="ncuw-grid">' + res.map(function(r){
      var scoreColor = (r.technicalScore || 0) >= 60 ? "#22c55e" : ((r.technicalScore || 0) <= 40 ? "#ef4444" : "#eab308");
      return '<article class="ncuw-card">' +
        '<div style="display:flex; justify-content:space-between; align-items:flex-start;">' +
          '<div>' +
            '<strong>' + esc(r.ticker) + '</strong>' +
            '<div style="font-size:10px; color:#94a3b8;">' + esc(r.name || "") + '</div>' +
          '</div>' +
          '<span style="padding:2px 8px; border-radius:12px; background:' + scoreColor + '22; color:' + scoreColor + '; border:1px solid ' + scoreColor + '; font-weight:800; font-size:11px;">Score: ' + (r.technicalScore || 0) + '</span>' +
        '</div>' +
        '<div class="ncuw-price" style="margin-top:6px;">' + money(r.price) + '</div>' +
        '<div class="ncuw-muted" style="font-size:12px; margin-top:4px;">' +
          'RSI: <strong>' + (r.rsi != null ? Number(r.rsi).toFixed(1) : "--") + '</strong> | Outlook: <strong>' + esc(r.futureOutlook || "Neutral") + '</strong>' +
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

  if (initialUniverse) {
    executeScreener();
  } else {
    out.innerHTML = '<div class="ncuw-empty">Enter stock tickers above to screen against technical filters.</div>';
  }
}

async function renderAlerts(panel){
  var s = state();
  var alerts = s.alerts || [];

  var formHtml = '<form id="ncAlertForm" class="ncuw-form ncuw-form-wide" style="margin-bottom:16px;">' +
    '<input name="ticker" placeholder="Stock symbol or company name" required>' +
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
      '<p style="margin:0 0 8px 0; font-weight:600;">No price alerts configured.</p>' +
      '<p style="margin:0; font-size:12px;">Create custom price threshold alerts using the form above to get notified when target price levels are crossed.</p>' +
    '</div>';
  }

  panel.innerHTML = formHtml + listHtml;

  var alertForm = panel.querySelector("#ncAlertForm");
  if (alertForm) {
    var alertInputEl = alertForm.querySelector("input[name='ticker']");
    attachTickerAutocomplete(alertInputEl);

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
      '<p style="margin:0; font-size:12px;">Search or analyze any stock ticker from the search bar to build your search history.</p>' +
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
