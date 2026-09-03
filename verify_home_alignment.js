const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  await page.setViewportSize({ width: 1280, height: 960 });
  await page.goto('file://' + __dirname + '/index.html', { waitUntil: 'load' });
  await page.waitForTimeout(1000);

  await page.screenshot({ path: '/tmp/home_desktop.png', fullPage: true });
  console.log('Desktop screenshot saved to /tmp/home_desktop.png');

  await page.setViewportSize({ width: 375, height: 812 });
  await page.screenshot({ path: '/tmp/home_mobile.png', fullPage: true });
  console.log('Mobile screenshot saved to /tmp/home_mobile.png');

  const layoutMetrics = await page.evaluate(() => {
    const pageContainer = document.querySelector('.page');
    const sections = Array.from(document.querySelectorAll('.sec'));
    const workspace = document.querySelector('#ncUserWorkspace');

    return {
      pageWidth: pageContainer ? pageContainer.getBoundingClientRect().width : null,
      sections: sections.map(s => ({ class: s.className, width: s.getBoundingClientRect().width, left: s.getBoundingClientRect().left })),
      workspace: workspace ? { width: workspace.getBoundingClientRect().width, left: workspace.getBoundingClientRect().left } : null
    };
  });

  console.log('Layout Metrics:', JSON.stringify(layoutMetrics, null, 2));
  await browser.close();
})();
