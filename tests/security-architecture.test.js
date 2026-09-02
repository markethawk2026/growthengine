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

// Verify sanitizeHTML behavior in js/security.js
if (typeof sandbox.sanitizeHTML !== "function") {
  console.error("FAIL sanitizeHTML is not defined in js/security.js");
  failures++;
} else {
  const sanitizeHTML = sandbox.sanitizeHTML;
  if (sanitizeHTML("<script>alert(1)</script>") !== "&lt;script&gt;alert(1)&lt;/script&gt;") {
    console.error("FAIL script tag not escaped in sanitizeHTML"); failures++;
  }
  if (sanitizeHTML("<img src=x onerror=alert(1)>") !== "&lt;img src=x onerror=alert(1)&gt;") {
    console.error("FAIL img onerror tag not escaped in sanitizeHTML"); failures++;
  }
  if (sanitizeHTML("Line 1<br>Line 2<br/>Line 3") !== "Line 1<br>Line 2<br>Line 3") {
    console.error("FAIL valid <br> tags not restored correctly in sanitizeHTML"); failures++;
  }
}

if(failures)process.exit(1);
console.log("PASS security architecture checks");
