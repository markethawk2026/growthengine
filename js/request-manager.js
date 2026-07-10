/**
 * NC Markets - Centralized Request Manager & Refresh Scheduler
 * Phase 2 reliability layer: timeout, retry, TTL cache, in-flight deduplication,
 * offline handling, standardized errors, and non-overlapping refresh jobs.
 */
(function () {
  "use strict";

  const memoryCache = new Map();
  const inFlight = new Map();

  class RequestError extends Error {
    constructor(message, code, details) {
      super(message);
      this.name = "RequestError";
      this.code = code || "REQUEST_FAILED";
      this.details = details || {};
    }
  }

  function stableKey(url, options) {
    const method = (options.method || "GET").toUpperCase();
    const body = typeof options.body === "string" ? options.body : "";
    return method + "::" + url + "::" + body;
  }

  function getCached(key, allowStale) {
    const entry = memoryCache.get(key);
    if (!entry) return null;
    const age = Date.now() - entry.timestamp;
    const fresh = age < entry.ttl;
    if (!fresh && !allowStale) return null;
    return { data: entry.data, fresh, age, timestamp: entry.timestamp };
  }

  function setCached(key, data, ttl) {
    if (ttl > 0) memoryCache.set(key, { data, timestamp: Date.now(), ttl });
  }

  function classifyError(error, response) {
    if (!navigator.onLine) return new RequestError("You appear to be offline.", "OFFLINE");
    if (error && error.name === "AbortError") return new RequestError("The request timed out.", "TIMEOUT");
    if (response && response.status === 429) return new RequestError("The data provider rate limit was reached.", "RATE_LIMITED", { status: 429 });
    if (response && response.status >= 500) return new RequestError("The data provider is temporarily unavailable.", "SERVER_ERROR", { status: response.status });
    if (response && response.status >= 400) return new RequestError("The request was rejected by the data provider.", "HTTP_ERROR", { status: response.status });
    return error instanceof RequestError ? error : new RequestError((error && error.message) || "Network request failed.", "NETWORK_ERROR");
  }

  function shouldRetry(error, response) {
    if (!navigator.onLine) return false;
    if (error && error.name === "AbortError") return true;
    if (response && (response.status === 429 || response.status >= 500)) return true;
    return !response && !!error;
  }

  function retryDelay(attempt, response) {
    const retryAfter = response && response.headers && response.headers.get("Retry-After");
    if (retryAfter) {
      const seconds = Number(retryAfter);
      if (Number.isFinite(seconds)) return Math.min(seconds * 1000, 30000);
    }
    const base = Math.min(500 * Math.pow(2, attempt), 8000);
    return base + Math.floor(Math.random() * 250); // network backoff jitter only; never financial data
  }

  async function request(url, options) {
    options = options || {};
    const key = options.cacheKey || stableKey(url, options);
    const ttl = Number.isFinite(options.ttl) ? options.ttl : 0;
    const retries = Number.isFinite(options.retries) ? options.retries : 2;
    const timeout = Number.isFinite(options.timeout) ? options.timeout : 8000;
    const responseType = options.responseType || "json";
    const allowStaleOnError = options.allowStaleOnError !== false;

    const cached = getCached(key, false);
    if (cached) return { data: cached.data, meta: { status: "CACHED", cached: true, stale: false, timestamp: cached.timestamp } };

    if (inFlight.has(key)) return inFlight.get(key);

    const promise = (async function () {
      let lastError = null;
      let lastResponse = null;

      for (let attempt = 0; attempt <= retries; attempt++) {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeout);
        try {
          const fetchOptions = Object.assign({}, options.fetchOptions || {}, {
            method: options.method || "GET",
            headers: options.headers,
            body: options.body,
            signal: controller.signal
          });
          const response = await fetch(url, fetchOptions);
          lastResponse = response;
          if (!response.ok) throw classifyError(null, response);

          let data;
          if (responseType === "text") data = await response.text();
          else {
            const text = await response.text();
            try { data = JSON.parse(text); }
            catch (_) { throw new RequestError("The provider returned invalid JSON.", "INVALID_RESPONSE"); }
          }

          setCached(key, data, ttl);
          return { data, meta: { status: "LIVE", cached: false, stale: false, timestamp: Date.now() } };
        } catch (error) {
          lastError = classifyError(error, lastResponse);
          if (attempt >= retries || !shouldRetry(error, lastResponse)) break;
          await new Promise(resolve => setTimeout(resolve, retryDelay(attempt, lastResponse)));
        } finally {
          clearTimeout(timer);
        }
      }

      const stale = getCached(key, true);
      if (stale && allowStaleOnError) {
        return { data: stale.data, meta: { status: "CACHED", cached: true, stale: true, timestamp: stale.timestamp, error: lastError } };
      }
      throw lastError || new RequestError("Request failed.", "REQUEST_FAILED");
    })();

    inFlight.set(key, promise);
    try { return await promise; }
    finally { inFlight.delete(key); }
  }

  const jobs = new Map();
  function registerRefreshJob(name, fn, intervalMs, options) {
    options = options || {};
    if (jobs.has(name)) clearInterval(jobs.get(name).timer);
    const job = { running: false, timer: null };
    const run = async function () {
      if (job.running || (options.pauseWhenHidden && document.hidden)) return;
      job.running = true;
      try { await fn(); }
      catch (error) { console.warn("[RefreshScheduler] " + name + " failed:", error); }
      finally { job.running = false; }
    };
    job.timer = setInterval(run, intervalMs);
    jobs.set(name, job);
    if (options.runImmediately) run();
    return job;
  }

  function removeRefreshJob(name) {
    const job = jobs.get(name);
    if (job) clearInterval(job.timer);
    jobs.delete(name);
  }

  window.RequestManager = {
    request,
    clearCache: function () { memoryCache.clear(); },
    invalidate: function (key) { memoryCache.delete(key); },
    getStats: function () { return { cacheEntries: memoryCache.size, inFlightRequests: inFlight.size }; },
    RequestError
  };

  window.RefreshScheduler = {
    register: registerRefreshJob,
    remove: removeRefreshJob,
    has: function (name) { return jobs.has(name); }
  };

  window.addEventListener("offline", function () {
    document.documentElement.setAttribute("data-network-status", "offline");
    window.dispatchEvent(new CustomEvent("nc:network-status", { detail: { online: false } }));
  });
  window.addEventListener("online", function () {
    document.documentElement.setAttribute("data-network-status", "online");
    window.dispatchEvent(new CustomEvent("nc:network-status", { detail: { online: true } }));
  });
  document.documentElement.setAttribute("data-network-status", navigator.onLine ? "online" : "offline");
})();
