document.addEventListener("DOMContentLoaded", function() {
  var style = document.createElement("style");
  style.id = "nc-layout-repair";
  style.textContent = `
    html, body {
      display: flex !important;
      flex-direction: column !important;
      align-items: stretch !important;
      width: 100% !important;
      margin: 0 !important;
      padding: 0 !important;
      min-height: 100vh !important;
      overflow-x: hidden !important;
    }
    body {
      display: flex !important;
      flex-direction: column !important;
    }
    .bar {
      display: flex !important;
      flex-direction: row !important;
      align-items: center !important;
      width: 100% !important;
      flex-shrink: 0 !important;
      box-sizing: border-box !important;
    }
    .tabs {
      display: flex !important;
      flex-direction: row !important;
      width: 100% !important;
      flex-shrink: 0 !important;
      box-sizing: border-box !important;
      justify-content: flex-start !important;
    }
    .page {
      width: 100% !important;
      max-width: 860px !important;
      margin: 0 auto !important;
      flex: 1 0 auto !important;
      box-sizing: border-box !important;
    }
  `;
  document.head.appendChild(style);
});
