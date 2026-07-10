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
 * Sanitize HTML by removing script tags and event handlers
 * Returns text content only, safe for display
 */
function sanitizeHTML(html) {
  if (!html || typeof html !== 'string') return '';
  
  // Create a temporary container
  const temp = document.createElement('div');
  temp.textContent = html; // Using textContent prevents HTML parsing
  return temp.innerHTML;
}

/**
 * Validate and sanitize URLs
 * Only allows http, https, and relative URLs
 */
function sanitizeURL(url) {
  if (!url || typeof url !== 'string') return '';
  
  const trimmed = url.trim().toLowerCase();
  
  // Block javascript:, data:, and other dangerous protocols
  if (trimmed.startsWith('javascript:') || 
      trimmed.startsWith('data:') || 
      trimmed.startsWith('vbscript:') ||
      trimmed.startsWith('onerror=')) {
    return '';
  }
  
  // Allow http, https, and relative URLs
  if (trimmed.startsWith('http://') || 
      trimmed.startsWith('https://') || 
      trimmed.startsWith('/')) {
    return url;
  }
  
  return '';
}

/**
 * Validate ticker symbol (alphanumeric, dash, dot)
 * Prevents injection attacks in API calls
 */
function validateTickerSymbol(ticker) {
  if (!ticker || typeof ticker !== 'string') return null;
  
  // Allow letters, numbers, dots (for .NS, .BO), dashes, and caret (for ^NSEI)
  const sanitized = ticker.trim().toUpperCase();
  if (!/^[A-Z0-9.\-^]{1,15}$/.test(sanitized)) {
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
