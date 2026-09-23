const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch({ args: ["--no-sandbox"] });
  const page = await (await browser.newContext({ viewport: { width: 400, height: 800 } })).newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
  page.on("console", (m) => { if (m.type() === "error") errors.push("console: " + m.text()); });

  await page.goto("http://localhost:8123/index.html");
  await page.waitForSelector("#btn-go-game");

  // ---- Mixed: in-app back button click (not browser back) should still fully disarm ----
  await page.click("#btn-go-game");
  await page.waitForSelector("#screen-setup.active");
  await page.click("#btn-setup-back"); // IN-APP button, not browser back gesture
  await page.waitForSelector("#screen-start.active");

  // Now a SINGLE browser back press should immediately leave (no leftover trap)
  await page.goBack();
  await page.waitForTimeout(300);
  console.log("AFTER_INAPP_BACK_THEN_1_BROWSER_BACK: app_present=", (await page.locator("#btn-go-game").count().catch(() => 0)) === 1, " url=", page.url());

  console.log("ERRORS_MIXED", JSON.stringify(errors));
  await browser.close();
})();
