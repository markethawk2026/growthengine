async function loadSectorIndices() {
  const container = document.getElementById("trendBody");
  if (!container) return;

  const sectorSymbols = [
    { sym: "^NSEBANK", name: "NIFTY BANK" },
    { sym: "^CNXIT", name: "NIFTY IT" },
    { sym: "^CNXAUTO", name: "NIFTY AUTO" },
    { sym: "^CNXPHARMA", name: "NIFTY PHARMA" }
  ];

  try {
    const parts = await Promise.all(sectorSymbols.map(async s => {
      try {
        const q = await yfQuote(s.sym);
        if (!q || !q.meta) {
          return `<div class=\"tcard\"><div class=\"gcl\">${s.name}</div><div class=\"gcv\">—</div></div>`;
        }
        const price = q.meta.regularMarketPrice || 0;
        let pct = null;
        if (q.meta.regularMarketChangePercent !== undefined) {
          pct = q.meta.regularMarketChangePercent * 100;
        } else if (q.meta.regularMarketChange !== undefined && q.meta.chartPreviousClose) {
          pct = (q.meta.regularMarketChange / q.meta.chartPreviousClose) * 100;
        } else {
          pct = 0;
        }
        const up = pct >= 0;
        const arrow = up ? "▲" : "▼";
        const pctText = (pct >= 0 ? "+" : "") + pct.toFixed(2) + "%";
        return `<div class=\"tcard ${up ? 'up' : 'down'}\" role=\"article\" aria-label=\"${s.name} ${pctText}\">` +
               `<div class=\"gcl\">${s.name}</div>` +
               `<div class=\"gcv\">${Number(price).toLocaleString('en-IN', {minimumFractionDigits:2, maximumFractionDigits:2})}</div>` +
               `<div class=\"gcs\">${arrow} ${pctText}</div>` +
               `</div>`;
      } catch (e) {
        return `<div class=\"tcard\"><div class=\"gcl\">${s.name}</div><div class=\"gcv\">—</div></div>`;
      }
    }));

    container.innerHTML = parts.join("");
  } catch (err) {
    container.innerHTML = sectorSymbols.map(s => `<div class=\"tcard\"><div class=\"gcl\">${s.name}</div><div class=\"gcv\">—</div></div>`).join("");
  }
}
