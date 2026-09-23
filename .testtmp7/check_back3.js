const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch({ args: ["--no-sandbox"] });
  const page = await (await browser.newContext({ viewport: { width: 400, height: 800 } })).newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
  page.on("console", (m) => { if (m.type() === "error") errors.push("console: " + m.text()); });

  await page.goto("http://localhost:8123/index.html");
  await page.waitForSelector("#btn-go-game");

  // ---- Sequential independent visits: each should be protected, each lands back on Start ----
  for (const [btnId, screenId] of [["btn-go-wiki", "screen-wiki"], ["btn-go-options", "screen-options"], ["btn-go-stats", "screen-stats"]]) {
    await page.click("#" + btnId);
    await page.waitForSelector("#" + screenId + ".active");
    await page.goBack();
    await page.waitForTimeout(150);
    const active = await page.locator(".screen.active").getAttribute("id");
    console.log(`${btnId}: BACK -> active=${active}`);
  }

  // ---- Nested: Setup -> Editor -> back -> Setup -> back -> Start -> back -> LEAVES ----
  await page.click("#btn-go-game");
  await page.waitForSelector("#screen-setup.active");
  await page.click("#btn-edit-stack");
  await page.waitForSelector("#screen-editor.active");
  await page.goBack();
  await page.waitForTimeout(150);
  console.log("EDITOR_BACK_1 ->", await page.locator(".screen.active").getAttribute("id"));

  await page.goBack();
  await page.waitForTimeout(150);
  console.log("SETUP_BACK_2 ->", await page.locator(".screen.active").getAttribute("id"));

  await page.goBack();
  await page.waitForTimeout(300);
  console.log("START_BACK_3 url=", page.url(), " app_present=", (await page.locator("#btn-go-game").count().catch(() => 0)) === 1);

  console.log("ERRORS_PART1", JSON.stringify(errors));
  await browser.close();
})();
