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
    localStorage.setItem("flagquiz.customStacks", JSON.stringify([{ id: "s1", name: "Back Test Stack 2", codes: ["FR", "DE", "IT"] }]));
  });
  await page.goto("http://localhost:8123/index.html");
  await page.waitForSelector("#btn-go-game");

  await page.click("#btn-go-game");
  await page.selectOption("#stack-select", { label: "Back Test Stack 2" });
  await page.click('.mode-tile[data-mode="choice"]');
  await page.click("#btn-start-game");
  await page.waitForSelector(".choice-tile");
  await page.locator(".choice-tile").first().click();
  await page.waitForSelector("#feedback-banner:not([hidden])");
  await page.click("#screen-play"); // skip feedback
  await page.waitForTimeout(200);

  page.once("dialog", (d) => d.accept());
  await page.goBack();
  await page.waitForTimeout(200);
  console.log("AFTER_ACCEPT -> active=", await page.locator(".screen.active").getAttribute("id"));

  const sessionLog = await page.evaluate(() => JSON.parse(localStorage.getItem("flagquiz.sessionLog") || "[]"));
  console.log("SESSION_LOGGED(expect 1 entry, completed:false, total:1)", JSON.stringify(sessionLog.map((s) => ({ completed: s.completed, total: s.total }))));

  console.log("ERRORS", JSON.stringify(errors));
  await browser.close();
})();
