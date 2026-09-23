const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch({ args: ["--no-sandbox"] });
  const page = await (await browser.newContext({ viewport: { width: 400, height: 800 } })).newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
  page.on("console", (m) => { if (m.type() === "error") errors.push("console: " + m.text()); });

  await page.goto("http://localhost:8123/index.html");
  await page.evaluate(() => localStorage.clear());
  await page.evaluate(() => {
    localStorage.setItem("flagquiz.customStacks", JSON.stringify([{ id: "s1", name: "Normal Click Stack", codes: ["FR", "DE"] }]));
  });
  await page.goto("http://localhost:8123/index.html");
  await page.waitForSelector("#btn-go-game");

  // Setup back button (normal click)
  await page.click("#btn-go-game");
  await page.waitForSelector("#screen-setup.active");
  await page.click("#btn-setup-back");
  await page.waitForSelector("#screen-start.active");
  console.log("SETUP_BACK_NORMAL_CLICK_OK", true);

  // Wiki back button
  await page.click("#btn-go-wiki");
  await page.waitForSelector("#screen-wiki.active");
  await page.click("#btn-wiki-back");
  await page.waitForSelector("#screen-start.active");
  console.log("WIKI_BACK_NORMAL_CLICK_OK", true);

  // Editor close button (normal click)
  await page.click("#btn-go-game");
  await page.click("#btn-edit-stack");
  await page.waitForSelector("#screen-editor.active");
  await page.click("#btn-editor-close");
  await page.waitForSelector("#screen-setup.active");
  console.log("EDITOR_CLOSE_NORMAL_CLICK_OK", true);

  // Play quit button (normal click) — decline then accept
  await page.selectOption("#stack-select", { label: "Normal Click Stack" });
  await page.click('.mode-tile[data-mode="choice"]');
  await page.click("#btn-start-game");
  await page.waitForSelector(".choice-tile");

  page.once("dialog", (d) => d.dismiss());
  await page.click("#btn-play-quit");
  await page.waitForTimeout(150);
  console.log("QUIT_DECLINE_NORMAL_CLICK -> still on play:", await page.locator("#screen-play.active").count());

  page.once("dialog", (d) => d.accept());
  await page.click("#btn-play-quit");
  await page.waitForSelector("#screen-start.active");
  console.log("QUIT_ACCEPT_NORMAL_CLICK_OK", true);

  // Results back button (normal click) — play a full game first
  await page.click("#btn-go-game");
  await page.selectOption("#stack-select", { label: "Normal Click Stack" });
  await page.click('.mode-tile[data-mode="choice"]');
  await page.click("#btn-start-game");
  for (let i = 0; i < 2; i++) {
    await page.waitForSelector(".choice-tile");
    await page.locator(".choice-tile").first().click();
    await page.waitForSelector("#feedback-banner:not([hidden])");
    await page.click("#screen-play");
    await page.waitForTimeout(150);
  }
  await page.waitForSelector("#screen-results.active");
  await page.click("#btn-results-back");
  await page.waitForSelector("#screen-start.active");
  console.log("RESULTS_BACK_NORMAL_CLICK_OK", true);

  // Confirm history depth is still sane: exactly one more back press should now truly leave
  await page.goBack();
  await page.waitForTimeout(300);
  console.log("FINAL_STATE app_present=", (await page.locator("#btn-go-game").count().catch(() => 0)) === 1, " url=", page.url());

  console.log("ERRORS", JSON.stringify(errors));
  await browser.close();
})();
