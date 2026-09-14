const fs = require("fs");
const path = require("path");
const assert = require("assert");

function runTest() {
  const htmlPath = path.join(__dirname, "..", "index.html");
  const htmlContent = fs.readFileSync(htmlPath, "utf8");

  // 1. Static HTML ARIA assertions
  assert.ok(
    htmlContent.includes('id="marketChips" role="tablist" aria-label="Market region summary filter"'),
    "marketChips container must have role=tablist and aria-label"
  );
  assert.ok(
    htmlContent.includes('class="mchip active" role="tab" aria-selected="true" data-region="india"'),
    "India chip must initially have role=tab and aria-selected=true"
  );
  assert.ok(
    htmlContent.includes('class="mchip" role="tab" aria-selected="false" data-region="us"'),
    "US chip must initially have role=tab and aria-selected=false"
  );

  // 2. Dynamic JS behavior test using DOM simulation
  const jsPath = path.join(__dirname, "..", "js", "main.js");
  const jsContent = fs.readFileSync(jsPath, "utf8");

  // Mock DOM elements
  const listeners = {};
  const announcedMessages = [];

  const createChip = (region, active, ariaSelected, text) => {
    const chipAttrs = {
      "data-region": region,
      "aria-selected": ariaSelected,
      "class": active ? "mchip active" : "mchip"
    };
    return {
      getAttribute: (attr) => chipAttrs[attr],
      setAttribute: (attr, val) => { chipAttrs[attr] = String(val); },
      classList: {
        add: (cls) => {
          if (!chipAttrs["class"].includes(cls)) chipAttrs["class"] += " " + cls;
        },
        remove: (cls) => {
          chipAttrs["class"] = chipAttrs["class"].replace(cls, "").trim();
        }
      },
      textContent: text,
      closest: function(sel) { return sel === ".mchip" ? this : null; }
    };
  };

  const indiaChip = createChip("india", true, "true", "🇮🇳 India");
  const usChip = createChip("us", false, "false", "🇺🇸 US");
  const allChips = [indiaChip, usChip];

  const chipContainer = {
    addEventListener: (evt, fn) => { listeners[evt] = fn; },
    querySelectorAll: (sel) => sel === ".mchip" ? allChips : []
  };

  const globalScope = {
    document: {
      getElementById: (id) => id === "marketChips" ? chipContainer : null,
      querySelectorAll: () => [],
      addEventListener: () => {}
    },
    window: {
      activeMarketRegion: "india",
      NCProductPolish: {
        announce: (msg) => { announcedMessages.push(msg); }
      }
    },
    forceRenderIndexUI: () => {},
    yfQuote: async () => null,
    fetchRegionData: async () => {},
    escapeHTML: (str) => str
  };

  // Run initMarketChips in scope
  const vm = require("vm");
  const ctx = vm.createContext(globalScope);
  vm.runInContext(jsContent, ctx);

  // Trigger click on US chip
  assert.ok(listeners["click"], "initMarketChips must register a click listener on marketChips");
  listeners["click"]({
    target: usChip
  });

  assert.strictEqual(usChip.getAttribute("aria-selected"), "true", "US chip aria-selected should be updated to 'true'");
  assert.strictEqual(indiaChip.getAttribute("aria-selected"), "false", "India chip aria-selected should be updated to 'false'");
  assert.strictEqual(globalScope.window.activeMarketRegion, "us", "activeMarketRegion should be updated to 'us'");
  assert.ok(
    announcedMessages.some(m => m.includes("Showing 🇺🇸 US market summary")),
    "Screen reader announcement should be triggered for US chip"
  );

  console.log("PASS Market chips ARIA accessibility check");
}

try {
  runTest();
} catch (e) {
  console.error("FAIL Market chips ARIA test:\n", e.stack || e.message);
  process.exit(1);
}
