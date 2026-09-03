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
    .bar {
      width: 100% !important;
      flex-shrink: 0 !important;
      box-sizing: border-box !important;
    }
    .tabs {
      width: 100% !important;
      flex-shrink: 0 !important;
      box-sizing: border-box !important;
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
