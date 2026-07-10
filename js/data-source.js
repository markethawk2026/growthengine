/**
 * NC Markets - Data Source Metadata System
 * Tracks data freshness, source, and status for financial information
 */

window.DATA_SOURCES = {
  LIVE: 'LIVE',
  DELAYED: 'DELAYED',
  CACHED: 'CACHED',
  ESTIMATED: 'ESTIMATED',
  SIMULATED: 'SIMULATED',
  UNAVAILABLE: 'UNAVAILABLE'
};

/**
 * Metadata object for market data
 */
class DataSourceMetadata {
  constructor(source, status = 'LIVE') {
    this.source = source;           // e.g., "Yahoo Finance", "NSE"
    this.status = status;           // LIVE, DELAYED, CACHED, etc.
    this.timestamp = Date.now();    // When data was fetched
    this.expiresAt = null;          // When data expires (TTL)
  }

  /**
   * Get formatted timestamp string
   */
  getFormattedTime() {
    const date = new Date(this.timestamp);
    return date.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZone: 'Asia/Kolkata'
    });
  }

  /**
   * Get time ago string (e.g., "2m ago")
   */
  getTimeAgo() {
    const now = Date.now();
    const diffMs = now - this.timestamp;
    const diffS = Math.floor(diffMs / 1000);
    const diffM = Math.floor(diffS / 60);
    const diffH = Math.floor(diffM / 60);
    
    if (diffS < 60) return diffS + 's ago';
    if (diffM < 60) return diffM + 'm ago';
    if (diffH < 24) return diffH + 'h ago';
    return Math.floor(diffH / 24) + 'd ago';
  }

  /**
   * Check if data is fresh (not expired)
   */
  isFresh(ttlMs = 300000) {
    if (!this.expiresAt) return false;
    return Date.now() < this.expiresAt;
  }

  /**
   * Get complete metadata badge HTML
   * Usage: element.innerHTML = metadata.getBadgeHTML()
   */
  getBadgeHTML() {
    const colors = {
      'LIVE': '#22c55e',
      'DELAYED': '#f59e0b',
      'CACHED': '#3b82f6',
      'ESTIMATED': '#a855f7',
      'SIMULATED': '#ef4444',
      'UNAVAILABLE': '#64748b'
    };
    
    const bgColors = {
      'LIVE': 'rgba(34, 197, 94, 0.1)',
      'DELAYED': 'rgba(245, 158, 11, 0.1)',
      'CACHED': 'rgba(59, 130, 246, 0.1)',
      'ESTIMATED': 'rgba(168, 85, 247, 0.1)',
      'SIMULATED': 'rgba(239, 68, 68, 0.1)',
      'UNAVAILABLE': 'rgba(100, 116, 139, 0.1)'
    };
    
    const color = colors[this.status] || '#64748b';
    const bgColor = bgColors[this.status] || 'rgba(100, 116, 139, 0.1)';
    
    return `
      <span style="
        display: inline-block;
        background: ${bgColor};
        color: ${color};
        padding: 2px 6px;
        border-radius: 4px;
        font-size: 9px;
        font-weight: 700;
        border: 1px solid ${color}33;
        white-space: nowrap;
      ">
        ${this.source} • ${this.status} • ${this.getTimeAgo()}
      </span>
    `;
  }

  /**
   * Get simple status badge
   */
  getStatusText() {
    return `${this.source} • ${this.status} • ${this.getFormattedTime()} IST`;
  }
}

/**
 * Global data source tracker
 */
window.dataSourceTracker = {
  sources: {},
  
  /**
   * Register or update a data source
   */
  track(key, source, status = 'LIVE', ttlMs = 300000) {
    const metadata = new DataSourceMetadata(source, status);
    metadata.expiresAt = Date.now() + ttlMs;
    this.sources[key] = metadata;
    return metadata;
  },
  
  /**
   * Get metadata for a key
   */
  get(key) {
    return this.sources[key];
  },
  
  /**
   * Check if data is fresh
   */
  isFresh(key) {
    const metadata = this.sources[key];
    return metadata && metadata.isFresh();
  },
  
  /**
   * Get status badge for display
   */
  getBadge(key) {
    const metadata = this.sources[key];
    if (!metadata) return '<span style="color: #64748b; font-size: 9px;">NO DATA</span>';
    return metadata.getBadgeHTML();
  }
};
