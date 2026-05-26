/**
 * nanduchandu-markets - Core UI & App Controller (Enhanced UX Version)
 */

// Application State with LocalStorage Persistence
const AppState = {
  theme: 'dark',
  activeTab: 'dashboard',
  selectedAsset: '^NSEI',
  // Load saved watchlist or fall back to defaults
  watchlist: JSON.parse(localStorage.getItem('mh-watchlist')) || ['^NSEI', '^BSESN', 'AAPL', 'MSFT', 'BTC-USD']
};

// DOM Elements Cache
const DOM = {
  body: document.body,
  themeBtn: document.getElementById('theme-toggle'),
  tabs: document.querySelectorAll('.tab'),
  pages: document.querySelectorAll('.page'),
  searchInput: document.getElementById('search-input'),
  searchDropdown: document.getElementById('search-dropdown'),
  newsContainer: document.getElementById('news-container'),
  chatMessages: document.getElementById('chat-messages'),
  chatInput: document.getElementById('chat-input'),
  sendChatBtn: document.getElementById('send-chat')
};

// Initialize Application
document.addEventListener('DOMContentLoaded', () => {
  initApp();
});

function initApp() {
  setupEventListeners();
  loadDashboardData();
  loadNewsData();
}

/**
 * Event Listeners Registration
 */
function setupEventListeners() {
  DOM.themeBtn?.addEventListener('click', toggleTheme);

  DOM.tabs.forEach(tab => {
    tab.addEventListener('click', (e) => {
      const targetPage = e.target.getAttribute('data-page');
      if (targetPage) switchTab(targetPage);
    });
  });

  DOM.searchInput?.addEventListener('input', handleSearchInput);
  
  document.addEventListener('click', (e) => {
    if (!DOM.sw?.contains(e.target)) {
      DOM.searchDropdown?.classList.remove('open');
    }
  });

  DOM.sendChatBtn?.addEventListener('click', handleChatSubmission);
  DOM.chatInput?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleChatSubmission();
  });
}

/**
 * Toggle Interface Themes
 */
function toggleTheme() {
  AppState.theme = AppState.theme === 'dark' ? 'light' : 'dark';
  if (AppState.theme === 'light') {
    DOM.body.classList.add('light');
    DOM.themeBtn.textContent = '🌙 Dark Mode';
  } else {
    DOM.body.classList.remove('light');
    DOM.themeBtn.textContent = '☀️ Light Mode';
  }
}

/**
 * Tab Page Navigation
 */
function switchTab(pageId) {
  AppState.activeTab = pageId;
  
  DOM.tabs.forEach(tab => {
    tab.classList.toggle('active', tab.getAttribute('data-page') === pageId);
  });

  DOM.pages.forEach(page => {
    page.classList.toggle('show', page.id === `${pageId}-page`);
  });

  if (pageId === 'news') loadNewsData();
  if (pageId === 'dashboard') loadDashboardData(); // Refresh data when going home
}

/**
 * Dynamic Real-Time Filtering from Live Yahoo Finance Search API
 */
async function handleSearchInput(e) {
  const query = e.target.value.trim();
  
  if (!query || query.length < 2) {
    DOM.searchDropdown?.classList.remove('open');
    return;
  }

  try {
    const liveQuotes = await fetchSymbolSuggestions(query);
    const filtered = liveQuotes.map(item => ({
      symbol: item.symbol,
      name: item.longname || item.shortname || item.exchange || "Financial Asset"
    }));

    renderSearchDropdown(filtered);
  } catch (err) {
    console.error("Live search auto-suggest dropdown error:", err);
    renderSearchDropdown([]);
  }
}

function renderSearchDropdown(items) {
  if (!DOM.searchDropdown) return;
  
  if (items.length === 0) {
    DOM.searchDropdown.innerHTML = `<div class="ddr"><span class="ddr-n">No matches found</span></div>`;
  } else {
    DOM.searchDropdown.innerHTML = items.map(item => `
      <div class="ddr" onclick="selectAsset('${item.symbol}')">
        <span class="ddr-t">${item.symbol}</span>
        <span class="ddr-n">${item.name}</span>
      </div>
    `).join('');
  }
  DOM.searchDropdown.classList.add('open');
}

window.selectAsset = function(symbol) {
  AppState.selectedAsset = symbol;
  if (DOM.searchInput) DOM.searchInput.value = symbol;
  DOM.searchDropdown?.classList.remove('open');
  
  switchTab('analysis');
  loadAssetAnalysis(symbol);
};

/**
 * Watchlist Management Engine (Add/Remove Assets)
 */
window.toggleWatchlist = function(symbol) {
  const index = AppState.watchlist.indexOf(symbol);
  if (index > -1) {
    AppState.watchlist.splice(index, 1); // Remove if exists
  } else {
    AppState.watchlist.push(symbol); // Add if new
  }
  
  // Save configuration locally
  localStorage.setItem('mh-watchlist', JSON.stringify(AppState.watchlist));
  
  // Re-render the asset profile header to update button state instantly
  loadAssetAnalysis(symbol);
};

/**
 * Populate Dashboard Components
 */
async function loadDashboardData() {
  const gridContainer = document.getElementById('watchlist-grid');
  if (!gridContainer) return;

  if (AppState.watchlist.length === 0) {
    gridContainer.innerHTML = `
      <div style="text-align:center; padding: 30px; color:#64748b; font-size:13px;">
        Your watchlist is empty. Search for an asset and click "Add to Watchlist"!
      </div>`;
    return;
  }

  gridContainer.innerHTML = '<div class="spnr"></div>';

  try {
    let html = '';
    for (const symbol of AppState.watchlist) {
      try {
        const data = await fetchYfQuote(symbol);
        const changeClass = data.regularMarketChangePercent >= 0 ? 'sp' : 'sn';
        const sign = data.regularMarketChangePercent >= 0 ? '+' : '';
        
        html += `
          <div class="tcard" onclick="selectAsset('${symbol}')">
            <div>
              <div style="font-weight:700; font-size:13px;">${symbol}</div>
              <div style="font-size:10px; color:#64748b; max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${data.shortName || ''}</div>
            </div>
            <div style="margin-left:auto; text-align:right;">
              <div style="font-size:13px; font-weight:700;">${data.regularMarketPrice?.toFixed(2)}</div>
              <span class="${changeClass}">${sign}${data.regularMarketChangePercent?.toFixed(2)}%</span>
            </div>
          </div>
        `;
      } catch (err) {
        html += `
          <div class="tcard" onclick="selectAsset('${symbol}')">
            <div><strong>${symbol}</strong></div>
            <div style="color:#ef4444; font-size:10px;">Network Timeout</div>
          </div>
        `;
      }
    }
    gridContainer.innerHTML = `<div class="tgrid">${html}</div>`;
  } catch (err) {
    gridContainer.innerHTML = '<div class="errbox">Error processing system modules.</div>';
  }
}

/**
 * Load and Render Consolidated News Feed
 */
async function loadNewsData() {
  if (!DOM.newsContainer) return;
  DOM.newsContainer.innerHTML = '<div class="spnr"></div>';

  const news = await fetchMarketNews();
  if (!news || news.length === 0) {
    DOM.newsContainer.innerHTML = '<p style="font-size:12px; color:#475569;">No recent headlines found.</p>';
    return;
  }

  DOM.newsContainer.innerHTML = news.map(item => {
    const pubDate = new Date(item.providerPublishTime * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return `
      <div class="nc">
        <div class="nc-head"><a href="${item.link}" target="_blank" style="color:inherit; text-decoration:none;">${item.title}</a></div>
        <div class="nc-meta">
          <span class="nc-src">${item.publisher}</span>
          <span class="nc-time">${pubDate}</span>
        </div>
      </div>
    `;
  }).join('');
}

/**
 * Populate Deep Analytical Structures and Metrics
 */
/**
 * Populate Deep Analytical Structures and Interactive Charts
 */
async function loadAssetAnalysis(symbol) {
  const container = document.getElementById('analysis-page');
  if (!container) return;

  container.innerHTML = '<div class="spnr" style="margin-top: 40px;"></div>';

  try {
    // Concurrent fetch for real-time metrics and timeline points
    const [quote, sparkData] = await Promise.all([
      fetchYfQuote(symbol),
      fetchYfSpark(symbol, "1d", "5m").catch(() => null) // Fallback gracefully if spark errors
    ]);
    
    const aiInsight = await fetchAISummary(symbol, quote);

    const isSaved = AppState.watchlist.includes(symbol);
    const btnText = isSaved ? '⭐ Remove Watchlist' : '➕ Add to Watchlist';
    const btnStyle = isSaved ? 'background: #1a1400; border-color: #f59e0b; color: #f59e0b;' : '';

    const changeSign = quote.regularMarketChangePercent >= 0 ? '+' : '';
    const isPositive = quote.regularMarketChangePercent >= 0;
    const changeColor = isPositive ? '#22c55e' : '#ef4444';
    
    // Core Layout Structural Shell
    container.innerHTML = `
      <div id="ticker-details-box">
        <div class="acrd">
          <div class="ahdr">
            <div>
              <div class="anm">${quote.symbol}</div>
              <div class="asb">${quote.longName || quote.shortName || ''} • ${quote.exchange}</div>
            </div>
            <div class="apr" style="margin-left: auto;">
              <div class="bprc">${quote.regularMarketPrice?.toFixed(2)}</div>
              <div class="bchg" style="color:${changeColor}">${changeSign}${quote.regularMarketChangePercent?.toFixed(2)}%</div>
            </div>
          </div>
          
          <div style="margin-top: 15px;">
            <button class="abtn" style="${btnStyle}" onclick="toggleWatchlist('${symbol}')">${btnText}</button>
          </div>

          <div class="chart-container" id="chart-card-node">
            <div class="chart-header">
              <span style="font-size: 12px; font-weight: 600;">Intraday Performance</span>
              <span class="time-pill">1D Interval (5m)</span>
            </div>
            <div class="chart-wrapper" id="chart-interactive-wrapper">
              <div class="chart-tooltip" id="chart-tracker-tooltip"></div>
              <svg class="chart-svg" id="svg-canvas-engine"></svg>
            </div>
          </div>

          <div class="asum">
            <strong>AI Operational Pulse:</strong> ${aiInsight}
          </div>
        </div>
      </div>
    `;

    // Process Spark Points if timeline layer yielded array frames
    if (sparkData && sparkData.close && sparkData.close.length > 1) {
      generateSvgSparkline(sparkData, isPositive);
    } else {
      const chartNode = document.getElementById('chart-card-node');
      if (chartNode) chartNode.innerHTML = `<div style="text-align:center; padding:20px; color:#64748b; font-size:12px;">Timeline streaming charts currently suspended for ${symbol}.</div>`;
    }

  } catch (err) {
    container.innerHTML = `<div class="errbox">Failed to generate profiling view for ${symbol}.</div>`;
  }
}

/**
 * Native Responsive SVG Chart Generator with Interactive Floating Crosshair
 */
function generateSvgSparkline(sparkData, isPositive) {
  const svg = document.getElementById('svg-canvas-engine');
  const wrapper = document.getElementById('chart-interactive-wrapper');
  const tooltip = document.getElementById('chart-tracker-tooltip');
  if (!svg || !wrapper) return;

  const prices = sparkData.close.filter(p => p !== null && p !== undefined);
  const timestamps = sparkData.timestamp.filter((_, i) => sparkData.close[i] !== null);
  if (prices.length < 2) return;

  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const priceRange = maxPrice - minPrice === 0 ? 1 : maxPrice - minPrice;

  // Track layout parameters dynamically matching responsive viewports
  const width = wrapper.clientWidth;
  const height = 220;
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`);

  // Coordinate normalizer mapping vectors to the SVG coordinates grid
  const points = prices.map((price, idx) => {
    const x = (idx / (prices.length - 1)) * width;
    const y = height - ((price - minPrice) / priceRange) * (height - 30) - 15;
    return { x, y, price, time: timestamps[idx] };
  });

  const trendClass = isPositive ? 'up' : 'down';
  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
  const areaPath = `${linePath} L ${points[points.length - 1].x.toFixed(1)} ${height} L ${points[0].x.toFixed(1)} ${height} Z`;

  // Inject structural graphics primitives, vector styles, and gradient templates
  svg.innerHTML = `
    <defs>
      <linearGradient id="grad-up" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#22c55e" stop-opacity="0.4"/>
        <stop offset="100%" stop-color="#22c55e" stop-opacity="0.0"/>
      </linearGradient>
      <linearGradient id="grad-down" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#ef4444" stop-opacity="0.4"/>
        <stop offset="100%" stop-color="#ef4444" stop-opacity="0.0"/>
      </linearGradient>
    </defs>
    <path class="chart-gradient ${trendClass}" d="${areaPath}" />
    <path class="chart-line ${trendClass}" d="${linePath}" />
    <line class="chart-hover-line" id="crosshair-y-axis" x1="0" y1="0" x2="0" y2="${height}"></line>
    <circle r="4" fill="${isPositive ? '#22c55e' : '#ef4444'}" stroke="#fff" stroke-width="1.5" id="crosshair-dot" style="display:none;"></circle>
  `;

  // Dynamic Crosshair Tracking Calculations
  const hoverLine = document.getElementById('crosshair-y-axis');
  const hoverDot = document.getElementById('crosshair-dot');

  function handleTracking(e) {
    const rect = wrapper.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;

    // Binary proximity mapping to extract closest coordinates point matching crosshair cursor X index
    let closestPt = points[0];
    let minDist = Math.abs(points[0].x - mouseX);

    for (let i = 1; i < points.length; i++) {
      const dist = Math.abs(points[i].x - mouseX);
      if (dist < minDist) {
        minDist = dist;
        closestPt = points[i];
      }
    }

    // Move elements to the tracked node coordinate position
    if (hoverLine && hoverDot && tooltip) {
      hoverLine.setAttribute('x1', closestPt.x);
      hoverLine.setAttribute('x2', closestPt.x);
      hoverLine.style.display = 'block';

      hoverDot.setAttribute('cx', closestPt.x);
      hoverDot.setAttribute('cy', closestPt.y);
      hoverDot.style.display = 'block';

      const formatTime = new Date(closestPt.time * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      tooltip.style.display = 'block';
      tooltip.style.left = `${Math.min(width - 110, Math.max(10, closestPt.x - 50))}px`;
      tooltip.innerHTML = `<strong>${closestPt.price.toFixed(2)}</strong> <span style="color:#94a3b8; margin-left:4px;">${formatTime}</span>`;
    }
  }

  function hideTracking() {
    if (hoverLine) hoverLine.style.style.display = 'none';
    if (hoverDot) hoverDot.style.display = 'none';
    if (tooltip) tooltip.style.display = 'none';
  }

  // Bind interface cursor boundaries tracking hooks
  wrapper.addEventListener('mousemove', handleTracking);
  wrapper.addEventListener('mouseleave', hideTracking);
  wrapper.addEventListener('touchstart', (e) => { if (e.touches[0]) handleTracking(e.touches[0]); }, {passthrough: true});
  wrapper.addEventListener('touchmove', (e) => { if (e.touches[0]) handleTracking(e.touches[0]); }, {passthrough: true});
  wrapper.addEventListener('touchend', hideTracking);
}

/**
 * Interactive Copilot Interface Sequence Execution
 */
async function handleChatSubmission() {
  const text = DOM.chatInput?.value.trim();
  if (!text || !DOM.chatMessages) return;

  DOM.chatMessages.innerHTML += `<div class="cm cmu">${text}</div>`;
  DOM.chatInput.value = '';
  DOM.chatMessages.scrollTop = DOM.chatMessages.scrollHeight;

  const aiTokenId = 'ai-typing-' + Date.now();
  DOM.chatMessages.innerHTML += `
    <div class="cm cmai" id="${aiTokenId}"><span class="mspn"></span> Thinking...</div>
  `;
  DOM.chatMessages.scrollTop = DOM.chatMessages.scrollHeight;

  setTimeout(() => {
    const targetElement = document.getElementById(aiTokenId);
    if (targetElement) {
      targetElement.innerHTML = `Processed inquiry regarding asset parameters. Currently tracking metrics on <strong>${AppState.selectedAsset}</strong> display standard volatility profiles. Let me know if you require specific formula levels computed.`;
    }
    DOM.chatMessages.scrollTop = DOM.chatMessages.scrollHeight;
  }, 1100);
}
