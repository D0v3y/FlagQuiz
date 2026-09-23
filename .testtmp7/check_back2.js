const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch({ args: ["--no-sandbox"] });
  const page = await (await browser.newContext({ viewport: { width: 400, height: 800 } })).newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
  page.on("console", (m) => { if (m.type() === "error") errors.push("console: " + m.text()); });
  page.on("framenavigated", (f) => {
    if (f === page.mainFrame()) console.log("FRAME_NAVIGATED ->", f.url());
  });

  // Single, clean load — no reload — to mirror real mobile usage exactly.
  await page.goto("http://localhost:8123/index.html");
  await page.waitForSelector("#btn-go-game");

  await page.click("#btn-go-game");
  await page.waitForSelector("#screen-setup.active");
  console.log("ON_SETUP");

  await page.goBack(); // -> should return to Start (in-app), not leave
  await page.waitForTimeout(150);
  console.log("AFTER_1_BACK: active=", await page.locator(".screen.active").getAttribute("id"), " url=", page.url());
  console.log("BTN_GO_GAME_STILL_PRESENT(expect true)", (await page.locator("#btn-go-game").count()) === 1);

  await page.goBack(); // -> should now truly leave the app page
  await page.waitForTimeout(300);
  console.log("AFTER_2ND_BACK url=", page.url());
  const stillHasApp = await page.locator("#btn-go-game").count().catch(() => 0);
  console.log("BTN_GO_GAME_PRESENT_AFTER_LEAVING(expect 0 or error)", stillHasApp);

  console.log("ERRORS", JSON.stringify(errors));
  await browser.close();
})();
