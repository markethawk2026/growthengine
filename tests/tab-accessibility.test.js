const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const indexHtml = fs.readFileSync(path.join(root, "index.html"), "utf8");
const mainJs = fs.readFileSync(path.join(root, "js", "main.js"), "utf8");

let failures = 0;

// Check ARIA attributes on tab buttons in index.html
const expectedTabs = ["home", "analysis", "nextday", "term", "global", "calendar", "chat"];

for (const tab of expectedTabs) {
  if (!indexHtml.includes(`id="tab-${tab}"`)) {
    console.error(`FAIL missing id="tab-${tab}" in index.html`);
    failures++;
  }
  if (!indexHtml.includes(`aria-controls="pg-${tab}"`)) {
    console.error(`FAIL missing aria-controls="pg-${tab}" in index.html`);
    failures++;
  }
  if (!indexHtml.includes(`id="pg-${tab}"`) || !indexHtml.includes(`aria-labelledby="tab-${tab}"`)) {
    console.error(`FAIL missing aria-labelledby="tab-${tab}" or id="pg-${tab}" in index.html`);
    failures++;
  }
}

// Check switchTab updates tabindex in js/main.js
if (!mainJs.includes('t.setAttribute("tabindex", isActive ? "0" : "-1")')) {
  console.error('FAIL switchTab in js/main.js does not update roving tabindex');
  failures++;
}

// Check keyboard navigation listener in js/main.js
if (!mainJs.includes('e.key === "ArrowRight"') || !mainJs.includes('e.key === "ArrowLeft"')) {
  console.error('FAIL js/main.js missing arrow key navigation handler for tabs');
  failures++;
}

if (failures) {
  process.exit(1);
}

console.log("PASS tab accessibility checks");
