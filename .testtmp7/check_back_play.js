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
    localStorage.setItem("flagquiz.customStacks", JSON.stringify([{ id: "s1", name: "Back Test Stack", codes: ["FR", "DE", "IT"] }]));
  });
  await page.goto("http://localhost:8123/index.html"); // fresh nav so localStorage sticks without a reload-added trap
  await page.waitForSelector("#btn-go-game");

  await page.click("#btn-go-game");
  await page.selectOption("#stack-select", { label: "Back Test Stack" });
  await page.click('.mode-tile[data-mode="choice"]');
  await page.click("#btn-start-game");
  await page.waitForSelector(".choice-tile");

  // ---- Decline the quit confirmation via back button: must STAY on Play ----
  page.once("dialog", (d) => {
    console.log("DIALOG_MESSAGE", d.message());
    d.dismiss();
  });
  await page.goBack();
  await page.waitForTimeout(200);
  console.log("AFTER_DECLINE -> active=", await page.locator(".screen.active").getAttribute("id"));
  console.log("CHOICE_TILES_STILL_THERE(expect 4)", await page.locator(".choice-tile").count());

  // A SECOND back press should ALSO trigger the confirm again (trap re-armed)
  page.once("dialog", (d) => d.dismiss());
  await page.goBack();
  await page.waitForTimeout(200);
  console.log("AFTER_2ND_DECLINE -> active=", await page.locator(".screen.active").getAttribute("id"));

  // ---- Now accept the quit confirmation via back button ----
  page.once("dialog", (d) => d.accept());
  await page.goBack();
  await page.waitForTimeout(200);
  console.log("AFTER_ACCEPT -> active=", await page.locator(".screen.active").getAttribute("id"));

  const sessionLog = await page.evaluate(() => JSON.parse(localStorage.getItem("flagquiz.sessionLog") || "[]"));
  console.log("SESSION_LOGGED_AFTER_BACK_QUIT(expect 1, completed:false)", JSON.stringify(sessionLog.map((s) => ({ completed: s.completed, total: s.total }))));

  // From Start now — one more back press should truly leave
  await page.goBack();
  await page.waitForTimeout(300);
  console.log("FINAL_BACK app_present=", (await page.locator("#btn-go-game").count().catch(() => 0)) === 1, " url=", page.url());

  console.log("ERRORS", JSON.stringify(errors));
  await browser.close();
})();
