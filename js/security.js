/**
 * NC Markets - Security & Sanitization Utilities
 * Prevents XSS, validates URLs, sanitizes user input and API responses
 */

/**
 * Escape HTML special characters to prevent DOM-based XSS
 */
function escapeHTML(text) {
  if (!text || typeof text !== 'string') return '';
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  };
  return text.replace(/[&<>"']/g, char => map[char]);
}

/**
 * Sanitize HTML — escapes all tags except <br>, safe for innerHTML injection.
 */
function sanitizeHTML(html) {
  if (!html || typeof html !== 'string') return '';
  return escapeHTML(html).replace(/&lt;br&gt;/g, '<br>');
}

/**
 * Validate and sanitize URLs
 * Only allows http, https, and relative URLs
 */
function sanitizeURL(url) {
  if (!url || typeof url !== 'string') return '';
  
  // Remove control characters (ASCII 0-31 and 127) and whitespace
  const sanitized = url.replace(/[\x00-\x1F\x7F]/g, '').trim();
  const lower = sanitized.toLowerCase();
  
  // Block javascript:, data:, vbscript:, and protocol-relative URLs (//)
  if (lower.startsWith('javascript:') ||
      lower.startsWith('data:') ||
      lower.startsWith('vbscript:') ||
      lower.startsWith('onerror=') ||
      lower.startsWith('//')) {
    return '';
  }
  
  // Allow http://, https://, and relative paths starting with /
  if (lower.startsWith('http://') ||
      lower.startsWith('https://') ||
      lower.startsWith('/')) {
    return sanitized;
  }
  
  return '';
}

/**
 * Validate ticker symbol (alphanumeric, dash, dot)
 * Prevents injection attacks in API calls
 */
function validateTickerSymbol(ticker) {
  if (!ticker || typeof ticker !== 'string') return null;
  
  // Allow letters, numbers, dots (.NS/.BO), dashes (BTC-USD), caret (^NSEI),
  // equals (USDINR=X, GC=F), underscore (NIFTY_IND_DEFENCE.NS index)
  const sanitized = ticker.trim().toUpperCase();
  if (!/^[A-Z0-9.\-^=_]{1,25}$/.test(sanitized)) {
    return null;
  }
  return sanitized;
}

/**
 * Create safe text node (prevents XSS via innerHTML)
 */
function createSafeTextElement(tag, text) {
  const el = document.createElement(tag);
  el.textContent = text; // textContent is safe - no HTML parsing
  return el;
}

/**
 * Safely inject HTML into a container using template strings with escaping
 * Usage: safeSetHTML(container, `<span>${escapeHTML(userInput)}</span>`)
 */
function safeSetHTML(element, html) {
  if (!element) return;
  // This is safe because the caller is responsible for escaping user content
  element.innerHTML = html;
}

/**
 * Parse and validate JSON safely
 */
function safeJSONParse(jsonString, fallback = null) {
  if (!jsonString || typeof jsonString !== 'string') return fallback;
  try {
    const parsed = JSON.parse(jsonString);
    // Ensure it's an object or array
    if (typeof parsed === 'object') return parsed;
  } catch (e) {
    console.warn('Invalid JSON:', e.message);
  }
  return fallback;
}

/**
 * Validate API response structure before using data
 */
function validateAPIResponse(response, expectedFields = []) {
  if (!response || typeof response !== 'object') return false;
  
  for (const field of expectedFields) {
    if (!(field in response)) return false;
  }
  
  return true;
}

/**
 * Sanitize financial values to prevent injection
 */
function sanitizeNumber(value) {
  if (value === null || value === undefined) return 0;
  const num = parseFloat(String(value).replace(/[^0-9.-]/g, ''));
  return isNaN(num) ? 0 : num;
}

/**
 * Sanitize a ticker symbol before injecting it into an AI prompt.
 * Returns only the validated ticker string; rejects anything that
 * could carry a prompt-injection payload.
 */
function sanitizeAIPrompt(ticker) {
  const safe = validateTickerSymbol(ticker);
  if (!safe) return 'UNKNOWN';
  // Strip any remaining non-alphanumeric-or-dot characters just in case
  return safe.replace(/[^A-Z0-9.\-^]/g, '');
}

/**
 * Validate and sanitize AI response JSON.
 * Returns null when the shape is unexpected so callers can show a fallback.
 */
function validateAIResponse(obj) {
  if (!obj || typeof obj !== 'object') return null;
  const trend = String(obj.trend || '');
  if (!['Bullish', 'Bearish', 'Neutral'].includes(trend)) return null;
  const confidence = parseInt(obj.confidence, 10);
  if (isNaN(confidence) || confidence < 0 || confidence > 100) return null;
  const summary = typeof obj.summary === 'string' ? obj.summary.slice(0, 500) : '';
  return { trend, confidence, summary };
}

/**
 * Validate localStorage data structure on load.
 * Drops individual keys that have wrong types; never crashes on corrupt data.
 */
function validateLocalStorageData(raw, defaults) {
  if (!raw || typeof raw !== 'object') return Object.assign({}, defaults);
  const out = Object.assign({}, defaults);
  for (const key of Object.keys(defaults)) {
    if (!(key in raw)) continue;
    // Arrays: keep only if array; filter string items to max 20 chars
    if (Array.isArray(defaults[key])) {
      if (!Array.isArray(raw[key])) continue;
      out[key] = raw[key].filter(v => typeof v === 'string' && v.length <= 20);
    } else if (typeof defaults[key] === 'object' && defaults[key] !== null) {
      out[key] = (typeof raw[key] === 'object' && raw[key] !== null) ? raw[key] : defaults[key];
    } else {
      out[key] = raw[key];
    }
  }
  return out;
}

/**
 * Create link with safe attributes
 */
function createSafeLink(href, text, target = '_blank') {
  const link = document.createElement('a');
  
  // Validate URL
  const safeHref = sanitizeURL(href);
  if (!safeHref) return document.createTextNode(escapeHTML(text));
  
  link.href = safeHref;
  link.textContent = text; // Safe - no HTML
  link.target = target;
  link.rel = 'noopener noreferrer'; // Prevent window.opener access
  
  return link;
}
