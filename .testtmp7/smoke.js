const { chromium } = require("playwright");
(async () => {
  const browser = await chromium.launch({ args: ["--no-sandbox"] });
  const page = await (await browser.newContext({ viewport: { width: 400, height: 800 } })).newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
  page.on("console", (m) => { if (m.type() === "error") errors.push("console: " + m.text()); });

  await page.goto("http://localhost:8123/index.html");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForSelector("#btn-go-game");

  await page.click("#btn-go-game");
  await page.click('.mode-tile[data-mode="type"]');
  await page.click("#btn-start-game");
  await page.waitForSelector("#type-input:focus");
  const src = await page.locator("#play-flag").getAttribute("src");
  console.log("FIRST_TASK_FLAG", src);

  await page.click("#btn-go-stats").catch(() => {}); // not visible from play, just sanity no crash
  await page.waitForTimeout(50);
  console.log("STILL_ON_PLAY_AFTER_STRAY_CLICK", await page.locator("#screen-play.active").count());

  console.log("ERRORS", JSON.stringify(errors));
  await browser.close();
})();
