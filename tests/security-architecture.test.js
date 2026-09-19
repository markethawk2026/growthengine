const fs=require("fs"),path=require("path");
const root=path.join(__dirname,"..");
const jsdir=path.join(root,"js");
const files=fs.readdirSync(jsdir).filter(f=>f.endsWith(".js"));
let failures=0;
for(const f of files){
  const text=fs.readFileSync(path.join(jsdir,f),"utf8");
  if(f!=="request-manager.js" && /\bfetch\s*\(/.test(text)){console.error("FAIL direct fetch outside request-manager:",f);failures++;}
}
const appFiles=[];
function walk(d){for(const f of fs.readdirSync(d)){const p=path.join(d,f),s=fs.statSync(p);if(s.isDirectory()&&!p.includes("tests"))walk(p);else if(/\.(js|html|css)$/.test(f))appFiles.push(p);}}
walk(root);
const combined=appFiles.map(p=>fs.readFileSync(p,"utf8")).join("\n").toLowerCase();
if(combined.includes("nanduchandu")){console.error("FAIL legacy branding remains");failures++;}

// Verify output encoding in main.js for news headlines and summaries
const mainText = fs.readFileSync(path.join(jsdir, "main.js"), "utf8");
if (!mainText.includes("escapeHTML(target.headline)") || !mainText.includes("escapeHTML(target.summary)")) {
  console.error("FAIL unescaped news target insertion in main.js");
  failures++;
}
if (!mainText.includes("escapeHTML(article.headline)")) {
  console.error("FAIL unescaped news article insertion in main.js");
  failures++;
}

// Verify sanitizeURL behavior in js/security.js
const vm = require("vm");
const secCode = fs.readFileSync(path.join(jsdir, "security.js"), "utf8");
const sandbox = { document: { createElement: () => ({}) } };
vm.createContext(sandbox);
vm.runInContext(secCode, sandbox);

// Verify restoreWorkspace security and sanitization in js/user-tools.js
const userToolsCode = fs.readFileSync(path.join(jsdir, "user-tools.js"), "utf8");
const userToolsSandbox = {
  window: { dispatchEvent: () => {} },
  localStorage: { getItem: () => null, setItem: () => {} },
  CustomEvent: function CustomEvent() {}
};
vm.createContext(userToolsSandbox);
vm.runInContext(userToolsCode, userToolsSandbox);

const NCUserTools = userToolsSandbox.window.NCUserTools;
if (!NCUserTools || typeof NCUserTools.restoreWorkspace !== "function") {
  console.error("FAIL NCUserTools.restoreWorkspace is not defined in js/user-tools.js");
  failures++;
} else {
  // Test 1: Prototype pollution resistance
  const protoPayload = '{"watchlist": ["RELIANCE"], "__proto__": {"polluted": true}, "preferences": {"__proto__": {"polluted": true}}}';
  try {
    NCUserTools.restoreWorkspace(protoPayload);
    if (Object.prototype.polluted || ({}).polluted) {
      console.error("FAIL restoreWorkspace allowed Prototype Pollution");
      failures++;
    }
  } catch (e) {
    console.error("FAIL restoreWorkspace threw on valid JSON payload:", e.message);
    failures++;
  }

  // Test 2: Sanitization of tickers & malformed data
  const maliciousPayload = JSON.stringify({
    watchlist: ['<script>alert(1)</script>', 'TATA<img src=x onerror=alert(1)>STEEL', 12345],
    portfolio: [{ ticker: 'INVALID<TAG>', quantity: -10, averagePrice: 'abc' }, { ticker: 'INFY', quantity: 10, averagePrice: 1500 }],
    alerts: [{ ticker: 'TCS', type: 'invalidType', threshold: 'notanumber' }],
    preferences: { chartTimeframe: '<script>', chartType: 'line' }
  });
  NCUserTools.restoreWorkspace(maliciousPayload);
  const newState = NCUserTools.getState();
  if (newState.watchlist.some(t => t.includes('<') || t.includes('>'))) {
    console.error("FAIL restoreWorkspace did not sanitize watchlist tickers");
    failures++;
  }
  if (newState.portfolio.length !== 1 || newState.portfolio[0].ticker !== 'INFY') {
    console.error("FAIL restoreWorkspace did not filter out invalid portfolio entries");
    failures++;
  }
  if (newState.alerts.length !== 0) {
    console.error("FAIL restoreWorkspace did not filter out invalid alert thresholds");
    failures++;
  }
}

if (typeof sandbox.sanitizeURL !== "function") {
  console.error("FAIL sanitizeURL is not defined in js/security.js");
  failures++;
} else {
  const sanitizeURL = sandbox.sanitizeURL;
  if (sanitizeURL("https://example.com") !== "https://example.com") { console.error("FAIL valid https URL rejected"); failures++; }
  if (sanitizeURL("  /relative/path  ") !== "/relative/path") { console.error("FAIL relative path rejected or untrimmed"); failures++; }
  if (sanitizeURL("javascript:alert(1)") !== "") { console.error("FAIL javascript: protocol allowed"); failures++; }
  if (sanitizeURL("java\x01script:alert(1)") !== "") { console.error("FAIL obfuscated javascript: protocol allowed"); failures++; }
  if (sanitizeURL("//evil.com/xss") !== "") { console.error("FAIL protocol-relative URL allowed"); failures++; }
}

if(failures)process.exit(1);
console.log("PASS security architecture checks");
