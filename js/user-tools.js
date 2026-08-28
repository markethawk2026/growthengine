/**
 * NC User Tools Manager — LocalStorage Workspace & Portfolio Engine
 */
(function(global) {
  "use strict";

  var WATCHLIST_KEY = 'growth_engine_watchlist';
  var PORTFOLIO_KEY = 'growth_engine_portfolio';
  var COMPARE_KEY = 'growth_engine_compare';
  var ALERTS_KEY = 'growth_engine_alerts';
  var RECENT_KEY = 'growth_engine_recent';

  function UserToolsManager() {
    this.watchlist = this.load(WATCHLIST_KEY, []);
    this.portfolio = this.load(PORTFOLIO_KEY, []);
    this.compareList = this.load(COMPARE_KEY, []);
    this.alerts = this.load(ALERTS_KEY, []);
    this.recentSearches = this.load(RECENT_KEY, []);
  }

  UserToolsManager.prototype.load = function(key, fallback) {
    try {
      var saved = localStorage.getItem(key);
      return saved ? JSON.parse(saved) : fallback;
    } catch (e) {
      console.error('Error loading localStorage key "' + key + '":', e);
      return fallback;
    }
  };

  UserToolsManager.prototype.save = function(key, data) {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
      console.error('Error saving localStorage key "' + key + '":', e);
    }
  };

  // Watchlist
  UserToolsManager.prototype.getWatchlist = function() {
    return this.watchlist;
  };

  UserToolsManager.prototype.addToWatchlist = async function(symbol) {
    if (!symbol) return;
    var sym = symbol.toUpperCase().trim();
    if (this.watchlist.some(function(item) {
      return (typeof item === 'string' ? item : item.symbol) === sym;
    })) return;

    try {
      var fetchQuote = global.yfQuote || (window.yfQuote ? window.yfQuote : null);
      var quote = fetchQuote ? await fetchQuote(sym) : null;
      this.watchlist.push({
        symbol: sym,
        addedAt: new Date().toISOString(),
        price: quote ? (quote.price || quote.raw || 0) : 0,
        change: quote ? (quote.change || 0) : 0,
        changePercent: quote ? (quote.changePercent || quote.changePct || 0) : 0,
        dayLow: quote ? (quote.dayLow || 0) : 0,
        dayHigh: quote ? (quote.dayHigh || 0) : 0
      });
    } catch (e) {
      this.watchlist.push({
        symbol: sym,
        addedAt: new Date().toISOString(),
        price: 0,
        change: 0,
        changePercent: 0
      });
    }
    this.save(WATCHLIST_KEY, this.watchlist);
  };

  UserToolsManager.prototype.removeFromWatchlist = function(symbol) {
    var sym = symbol.toUpperCase().trim();
    this.watchlist = this.watchlist.filter(function(item) {
      var s = typeof item === 'string' ? item : item.symbol;
      return s !== sym;
    });
    this.save(WATCHLIST_KEY, this.watchlist);
  };

  // Portfolio
  UserToolsManager.prototype.getPortfolio = function() {
    return this.portfolio;
  };

  UserToolsManager.prototype.setPortfolioHolding = async function(symbol, quantity, buyPrice) {
    if (!symbol || isNaN(quantity) || isNaN(buyPrice)) return;
    var sym = symbol.toUpperCase().trim();
    var index = this.portfolio.findIndex(function(item) { return item.symbol === sym; });

    var currentPrice = Number(buyPrice);
    try {
      var fetchQuote = global.yfQuote || (window.yfQuote ? window.yfQuote : null);
      var quote = fetchQuote ? await fetchQuote(sym) : null;
      if (quote && (quote.price || quote.raw)) {
        currentPrice = Number(quote.price || quote.raw);
      }
    } catch (e) {}

    var qty = Number(quantity);
    var bp = Number(buyPrice);

    var holding = {
      symbol: sym,
      ticker: sym,
      quantity: qty,
      buyPrice: bp,
      averagePrice: bp,
      currentPrice: currentPrice,
      totalInvested: qty * bp,
      invested: qty * bp,
      currentValue: qty * currentPrice,
      unrealizedPnL: (currentPrice - bp) * qty,
      pnl: (currentPrice - bp) * qty,
      unrealizedPnLPercent: ((currentPrice - bp) / bp) * 100,
      pnlPct: ((currentPrice - bp) / bp) * 100,
      updatedAt: new Date().toISOString()
    };

    if (index >= 0) {
      this.portfolio[index] = holding;
    } else {
      this.portfolio.push(holding);
    }
    this.save(PORTFOLIO_KEY, this.portfolio);
  };

  UserToolsManager.prototype.removePortfolioHolding = function(symbol) {
    var sym = symbol.toUpperCase().trim();
    this.portfolio = this.portfolio.filter(function(item) { return item.symbol !== sym && item.id !== sym; });
    this.save(PORTFOLIO_KEY, this.portfolio);
  };

  UserToolsManager.prototype.getPortfolioMetrics = function() {
    var totalInvested = 0;
    var currentValue = 0;

    this.portfolio.forEach(function(item) {
      totalInvested += item.totalInvested || item.invested || 0;
      currentValue += item.currentValue || (item.quantity * (item.currentPrice || item.buyPrice));
    });

    var totalPnL = currentValue - totalInvested;
    var pnlPercent = totalInvested > 0 ? (totalPnL / totalInvested) * 100 : 0;
    var estimatedAnnualDividend = currentValue * 0.012;

    var hhi = 0;
    if (currentValue > 0) {
      this.portfolio.forEach(function(item) {
        var val = item.currentValue || (item.quantity * (item.currentPrice || item.buyPrice));
        var weight = val / currentValue;
        hhi += weight * weight;
      });
    }
    var divScore = currentValue > 0 ? Math.round(Math.max(0, Math.min(100, (1 - hhi) * 125))) : 0;

    var concentrationLevel = 'Unhedged Concentration';
    if (divScore > 75) concentrationLevel = 'Highly Diversified';
    else if (divScore > 45) concentrationLevel = 'Moderately Diversified';
    else if (divScore > 20) concentrationLevel = 'Concentrated Allocation';

    return {
      totalInvested: totalInvested,
      currentValue: currentValue,
      totalPnL: totalPnL,
      pnlPercent: pnlPercent,
      estimatedAnnualDividend: estimatedAnnualDividend,
      diversificationScore: divScore,
      portfolioConcentration: concentrationLevel
    };
  };

  // Compare
  UserToolsManager.prototype.getCompareList = function() {
    return this.compareList;
  };

  UserToolsManager.prototype.addToCompare = function(symbol) {
    if (!symbol) return;
    var sym = symbol.toUpperCase().trim();
    if (this.compareList.includes(sym)) return;
    if (this.compareList.length >= 5) this.compareList.shift();
    this.compareList.push(sym);
    this.save(COMPARE_KEY, this.compareList);
  };

  UserToolsManager.prototype.removeFromCompare = function(symbol) {
    var sym = symbol.toUpperCase().trim();
    this.compareList = this.compareList.filter(function(s) { return s !== sym; });
    this.save(COMPARE_KEY, this.compareList);
  };

  UserToolsManager.prototype.compare = async function(symbols) {
    var targets = (symbols && symbols.length > 0) ? symbols : this.compareList;
    var fetchQuote = global.yfQuote || (window.yfQuote ? window.yfQuote : null);

    var results = await Promise.all(targets.map(async function(sym) {
      try {
        var quote = fetchQuote ? await fetchQuote(sym) : null;
        if (!quote) return { ticker: sym, symbol: sym, error: true };

        var price = quote.price || quote.raw || 0;
        var pe = quote.peRatio || 22;
        var mCapRaw = quote.marketCap || 0;
        var mCapDisplay = quote.mktCap || quote.marketCapFormatted || (global.formatMarketCap ? global.formatMarketCap(mCapRaw) : 'Unavailable');

        var healthRating = 'Strong';
        if (pe > 40) healthRating = 'Fair / High Multiple';
        else if (pe > 25) healthRating = 'Solid Balance Sheet';
        else if (pe > 0) healthRating = 'Undervalued / Strong Assets';
        else healthRating = 'Speculative / Distressed';

        var changePct = quote.changePercent != null ? quote.changePercent : (quote.changePct != null ? quote.changePct : 0);

        var volatility = 'Moderate';
        if (Math.abs(changePct) > 3) volatility = 'High Volatility';
        else if (Math.abs(changePct) < 1) volatility = 'Low Volatility / Defensive';

        var growth = 'Bullish Expansion';
        if (changePct > 1.5) growth = 'Strong Outperformer';
        else if (changePct < -1.5) growth = 'Under Pressure';

        var fairValue = price && pe > 0 ? (price * (22 / Math.max(pe, 5))) : (price * 1.15);
        var marginOfSafety = price && fairValue > 0 ? (((fairValue - price) / fairValue) * 100) : 0;

        return {
          ticker: sym,
          symbol: sym,
          name: quote.name || sym,
          price: price,
          change: quote.change || 0,
          changePercent: changePct,
          changePct: changePct,
          peRatio: pe,
          marketCap: mCapRaw,
          mktCap: mCapDisplay,
          marketCapFormatted: mCapDisplay,
          balanceSheetHealth: healthRating,
          volatilityRisk: volatility,
          riskLevel: volatility,
          futureGrowthOutlook: growth,
          futureOutlook: growth,
          intrinsicFairValue: fairValue,
          marginOfSafetyPercent: marginOfSafety,
          technicalScore: Math.min(100, Math.max(10, Math.round(changePct * 10 + 55)))
        };
      } catch (e) {
        return { ticker: sym, symbol: sym, error: true };
      }
    }));
    return results;
  };

  // Alerts
  UserToolsManager.prototype.getAlerts = function() {
    return this.alerts;
  };

  UserToolsManager.prototype.addAlert = function(symbol, condition, targetPrice) {
    var sym = symbol.toUpperCase().trim();
    var cond = String(condition).toUpperCase();
    var newAlert = {
      id: Date.now().toString(),
      ticker: sym,
      symbol: sym,
      condition: cond === 'PRICEBELOW' || cond === 'BELOW' ? 'BELOW' : 'ABOVE',
      type: cond === 'PRICEBELOW' || cond === 'BELOW' ? 'priceBelow' : 'priceAbove',
      threshold: Number(targetPrice),
      targetPrice: Number(targetPrice),
      createdAt: new Date().toISOString(),
      triggered: false
    };
    this.alerts.push(newAlert);
    this.save(ALERTS_KEY, this.alerts);
  };

  UserToolsManager.prototype.removeAlert = function(id) {
    this.alerts = this.alerts.filter(function(a) { return a.id !== id; });
    this.save(ALERTS_KEY, this.alerts);
  };

  // Recent
  UserToolsManager.prototype.getRecentSearches = function() {
    return this.recentSearches;
  };

  UserToolsManager.prototype.addRecentSearch = function(symbol) {
    if (!symbol) return;
    var sym = symbol.toUpperCase().trim();
    this.recentSearches = this.recentSearches.filter(function(s) { return s !== sym; });
    this.recentSearches.unshift(sym);
    if (this.recentSearches.length > 10) this.recentSearches.pop();
    this.save(RECENT_KEY, this.recentSearches);
  };

  UserToolsManager.prototype.exportPortfolioCSV = function() {
    if (this.portfolio.length === 0) return '';
    var headers = ['Symbol', 'Quantity', 'AvgBuyPrice', 'CurrentPrice', 'CurrentValue', 'UnrealizedPnL'];
    var rows = this.portfolio.map(function(p) {
      return [
        p.symbol,
        p.quantity,
        p.buyPrice || p.averagePrice,
        p.currentPrice || p.buyPrice,
        p.currentValue || (p.quantity * p.buyPrice),
        p.unrealizedPnL || p.pnl || 0
      ];
    });
    return [headers.join(','), ...rows.map(function(r) { return r.join(','); })].join('\n');
  };

  var userTools = new UserToolsManager();

  global.userTools = userTools;
  global.NCUserTools = {
    getState: function() {
      return {
        watchlist: userTools.getWatchlist().map(function(i) { return typeof i === 'string' ? i : i.symbol; }),
        portfolio: userTools.getPortfolio(),
        compare: userTools.getCompareList(),
        alerts: userTools.getAlerts(),
        recent: userTools.getRecentSearches()
      };
    },
    portfolioSnapshot: async function() {
      return userTools.getPortfolio().map(function(p) {
        return {
          id: p.symbol,
          ticker: p.symbol,
          name: p.symbol + " Corp",
          quantity: p.quantity,
          averagePrice: p.buyPrice || p.averagePrice,
          currentPrice: p.currentPrice,
          invested: p.totalInvested || p.invested,
          currentValue: p.currentValue,
          pnl: p.unrealizedPnL || p.pnl,
          pnlPct: p.unrealizedPnLPercent || p.pnlPct
        };
      });
    },
    addWatchlist: function(sym) { userTools.addToWatchlist(sym); },
    removeWatchlist: function(sym) { userTools.removeFromWatchlist(sym); },
    addHolding: function(h) { userTools.setPortfolioHolding(h.ticker || h.symbol, h.quantity, h.averagePrice || h.buyPrice); },
    removeHolding: function(sym) { userTools.removePortfolioHolding(sym); },
    compare: function(list) { return userTools.compare(list); },
    screen: async function(list, filterType) {
      var results = await userTools.compare(list);
      return results.map(function(r) {
        return {
          ticker: r.symbol,
          name: r.name || (r.symbol + " Corp"),
          price: r.price,
          technicalScore: r.technicalScore || 60,
          rsi: 50 + (r.changePercent || 0) * 2,
          futureOutlook: r.futureGrowthOutlook || 'Neutral'
        };
      });
    },
    addAlert: function(a) { userTools.addAlert(a.ticker || a.symbol, a.type || a.condition, a.threshold || a.targetPrice); },
    removeAlert: function(id) { userTools.removeAlert(id); }
  };

})(typeof window !== 'undefined' ? window : global);
