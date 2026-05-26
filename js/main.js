/**
 * nanduchandu-markets - Core UI & App Controller
 */

// Application State
const AppState = {
  theme: 'dark',
  activeTab: 'dashboard',
  selectedAsset: '^NSEI', // Default to Nifty 50
  watchlist: ['^NSEI', '^BSESN', 'AAPL', 'MSFT', 'BTC-USD']
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
  // Theme Toggle
  DOM.themeBtn?.addEventListener('click', toggleTheme);

  // Tab Switching
  DOM.tabs.forEach(tab => {
    tab.addEventListener('click', (e) => {
      const targetPage = e.target.getAttribute('data-page');
      if (targetPage) switchTab(targetPage);
    });
  });

  // Search Auto-suggest Logic
  DOM.searchInput?.addEventListener('input', handleSearchInput);
  
  // Close search dropdown when clicking outside
  document.addEventListener('click', (e) => {
    if (!DOM.sw?.contains(e.target)) {
      DOM.searchDropdown?.classList.remove('open');
    }
  });

  // Chat Interface Trigger
  DOM.sendChatBtn?.addEventListener('click', handleChatSubmission);
  DOM.chatInput?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleChatSubmission();
  });
}

/**
 * Toggle Interface Themes (Dark / Light)
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
 * Tab Page Navigation UI Engine
 */
function switchTab(pageId) {
  AppState.activeTab = pageId;
  
  DOM.tabs.forEach(tab => {
    tab.classList.toggle('active', tab.getAttribute('data-page') === pageId);
  });

  DOM.pages.forEach(page => {
    page.classList.toggle('show', page.id === `${pageId}-page`);
  });

  // Contextual actions depending on active view
  if (pageId === 'news') loadNewsData();
}

/**
 * Dynamic Real-Time Filtering from Live Yahoo Finance Search API
 */
async function handleSearchInput(e) {
  const query = e.target.value.trim();
  
  // Wait until the user types at least 2 characters to avoid spamming the API
  if (!query || query.length < 2) {
    DOM.searchDropdown?.classList.remove('open');
    return;
  }

  try {
    // Fetch live matching companies from Yahoo Finance via our proxy layer
    const liveQuotes = await fetchSymbolSuggestions(query);

    // Map Yahoo's response keys (longname/shortname) to match our dropdown renderer
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

/**
 * Global function attached to window scope for select clicks
 */
window.selectAsset = function(symbol) {
  AppState.selectedAsset = symbol;
  if (DOM.searchInput) DOM.searchInput.value = symbol;
  DOM.searchDropdown?.classList.remove('open');
  
  // Pivot UI focus to details or recalculate variables
  switchTab('analysis');
  loadAssetAnalysis(symbol);
};

/**
 * Populate Dashboard Components
 */
async function loadDashboardData() {
  const gridContainer = document.getElementById('watchlist-grid');
  if (!gridContainer) return;

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
              <div style="font-size:10px; color:#64748b;">${data.shortName || ''}</div>
            </div>
            <div style="margin-left:auto; text-align:right;">
              <div style="font-size:13px; font-weight:700;">${data.regularMarketPrice?.toFixed(2)}</div>
              <span class="${changeClass}">${sign}${data.regularMarketChangePercent?.toFixed(2)}%</span>
            </div>
          </div>
        `;
      } catch (err) {
        // Fallback placeholder card on extraction fault
        html += `
          <div class="tcard">
            <div><strong>${symbol}</strong></div>
            <div style="color:#ef4444; font-size:10px;">Data Unavailable</div>
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
 * Populate Deep Analytical Structures and Metrics for Target Tickers
 */
async function loadAssetAnalysis(symbol) {
  const container = document.getElementById('analysis-page');
  if (!container) return;

  // Insert targeted skeletons or animations while async processes yield data
  try {
    const quote = await fetchYfQuote(symbol);
    const aiInsight = await fetchAISummary(symbol, quote);

    // Update active analytical node UI blocks
    const detailsContainer = document.getElementById('ticker-details-box');
    if (detailsContainer) {
      const changeSign = quote.regularMarketChangePercent >= 0 ? '+' : '';
      const changeColor = quote.regularMarketChangePercent >= 0 ? '#22c55e' : '#ef4444';
      
      detailsContainer.innerHTML = `
        <div class="acrd">
          <div class="ahdr">
            <div>
              <div class="anm">${quote.symbol}</div>
              <div class="asb">${quote.longName || quote.shortName || ''} • ${quote.exchange}</div>
            </div>
            <div class="apr">
              <div class="bprc">${quote.regularMarketPrice?.toFixed(2)}</div>
              <div class="bchg" style="color:${changeColor}">${changeSign}${quote.regularMarketChangePercent?.toFixed(2)}%</div>
            </div>
          </div>
          <div class="asum">
            <strong>AI Operational Pulse:</strong> ${aiInsight}
          </div>
        </div>
      `;
    }
  } catch (err) {
    console.error("Asset initialization UI sequence broken:", err);
  }
}

/**
 * Interactive Copilot Interface Sequence Execution
 */
async function handleChatSubmission() {
  const text = DOM.chatInput?.value.trim();
  if (!text || !DOM.chatMessages) return;

  // Render User Command Balloon
  DOM.chatMessages.innerHTML += `
    <div class="cm cmu">${text}</div>
  `;
  DOM.chatInput.value = '';
  DOM.chatMessages.scrollTop = DOM.chatMessages.scrollHeight;

  // Artificial AI Response Loading State
  const aiTokenId = 'ai-typing-' + Date.now();
  DOM.chatMessages.innerHTML += `
    <div class="cm cmai" id="${aiTokenId}"><span class="mspn"></span> Thinking...</div>
  `;
  DOM.chatMessages.scrollTop = DOM.chatMessages.scrollHeight;

  // Mock processing step linking current active telemetry
  setTimeout(() => {
    const targetElement = document.getElementById(aiTokenId);
    if (targetElement) {
      targetElement.innerHTML = `Processed inquiry regarding asset parameters. Currently tracking metrics on <strong>${AppState.selectedAsset}</strong> display standard volatility profiles. Let me know if you require specific formula levels computed.`;
    }
    DOM.chatMessages.scrollTop = DOM.chatMessages.scrollHeight;
  }, 1100);
}
