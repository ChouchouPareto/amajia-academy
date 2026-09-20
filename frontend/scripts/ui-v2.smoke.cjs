/* Run only against an isolated local preview; no production credentials or model calls. */
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");

(async () => {
  const base = process.env.UI_TEST_URL || "http://127.0.0.1:3018";
  if (!["127.0.0.1", "localhost"].includes(new URL(base).hostname)) throw new Error("Use a local isolated preview.");
  if (!process.env.UI_TEST_INVITE) throw new Error("Set UI_TEST_INVITE for an isolated test account.");
  const out = process.env.UI_TEST_OUTPUT || "/tmp/amajia-ui-v2-screens";
  await fs.mkdir(out, { recursive: true });
  const browser = await chromium.launch({ headless: true, channel: process.env.UI_TEST_BROWSER || "chrome" });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  async function screenshot(name) { await page.screenshot({ path: path.join(out, name + ".png"), fullPage: true }); }
  async function mode() { return (await context.request.get(base + "/backend/api/v1/auth/learning-mode")).json(); }
  try {
    await context.request.post(base + "/backend/api/v1/auth/invite-login", { data: { invitation_code: process.env.UI_TEST_INVITE, display_name: "界面验收", consent_accepted: true, consent_version: "2026-08-28-v1" } });
    await context.request.put(base + "/backend/api/v1/auth/learning-mode", { data: { preferred_mode: "basic" } });
    await context.request.post(base + "/backend/api/v1/auth/logout");
    await page.goto(base + "/");
    await page.waitForURL("**/welcome?next=*");
    await page.getByLabel("怎么称呼你").fill("界面验收");
    await page.getByLabel("邀请码", { exact: true }).fill(process.env.UI_TEST_INVITE);
    await page.getByRole("checkbox").check();
    await page.getByRole("button", { name: "进入阿嬷学院" }).click();
    await page.waitForURL("**/basic");
    await page.getByRole("link", { name: /开始测一测/ }).waitFor();
    assert.equal((await mode()).preferred_mode, "basic");
    await screenshot("基础首页-390");

    await page.getByRole("button", { name: /基础.*切换版本/ }).click();
    await page.getByRole("radio", { name: /专业版/ }).check();
    assert.equal(new URL(page.url()).pathname, "/basic");
    assert.equal((await mode()).preferred_mode, "basic");
    await screenshot("版本选择-390");
    await page.getByRole("button", { name: "取消", exact: true }).click();
    assert.equal((await mode()).preferred_mode, "basic");
    await page.getByRole("button", { name: /基础.*切换版本/ }).click();
    await page.getByRole("radio", { name: /专业版/ }).check();
    await page.getByRole("button", { name: "确认选择" }).click();
    await page.waitForURL(/\/coach/);
    await page.getByRole("button", { name: /和老师聊聊|接着上次学习|开始第一门课/ }).waitFor();
    assert.equal((await mode()).preferred_mode, "coach");
    await screenshot("专业首页-390");
    await page.goto(base + "/");
    await page.waitForURL(/\/coach/);

    // Save failure must retain the selected option and stay on the current interface.
    await page.route("**/api/v1/auth/learning-mode", (route) => route.request().method() === "PUT"
      ? route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ error: { message: "测试：保存暂时失败" } }) })
      : route.continue());
    await page.getByRole("button", { name: /专业.*切换版本/ }).click();
    await page.getByRole("radio", { name: /基础版/ }).check();
    await page.getByRole("button", { name: "确认选择" }).click();
    await page.getByRole("alert").filter({ hasText: "保存暂时失败" }).waitFor();
    assert.equal(new URL(page.url()).pathname, "/coach");
    assert.equal((await mode()).preferred_mode, "coach");
    await page.getByRole("button", { name: "取消", exact: true }).click();
    await page.unroute("**/api/v1/auth/learning-mode");

    await page.getByRole("button", { name: "打开学习菜单", exact: true }).first().click();
    await page.getByRole("dialog", { name: "学习菜单" }).waitFor();
    await page.keyboard.press("Escape");
    assert.equal(await page.getByRole("dialog", { name: "学习菜单" }).isVisible(), false);
    await page.getByText("不知道问什么？", { exact: true }).click();
    await page.getByRole("button", { name: /厨房油污/ }).click();
    assert.match(await page.locator("#coach-question").inputValue(), /厨房油污/);
    await page.waitForFunction(() => document.getElementById("coach-question") === document.activeElement);

    // The unsupported browser path is a truthful text-input fallback.
    await page.evaluate(() => { window.SpeechRecognition = undefined; window.webkitSpeechRecognition = undefined; });
    await page.locator("#coach-question").fill("");
    await page.getByRole("button", { name: "语音输入", exact: true }).click();
    await page.getByRole("status").filter({ hasText: "不能听写" }).waitFor();

    for (const width of [390, 768, 1280, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      const headings = [];
      for (const route of ["/basic", "/housekeeping", "/records", "/coach"]) {
        await page.goto(base + route);
        await page.locator("h1").first().waitFor();
        await page.waitForLoadState("networkidle");
        await page.evaluate(() => document.fonts.ready);
        const layout = await page.evaluate(() => ({
          width: window.innerWidth,
          scroll: document.documentElement.scrollWidth,
          title: document.querySelector("h1").getBoundingClientRect().top,
          align: getComputedStyle(document.querySelector("h1")).textAlign,
        }));
        assert.ok(layout.scroll <= width + 1, route + " overflows at " + width);
        assert.equal(layout.align, "left");
        if (route !== "/coach") headings.push(layout.title);
        await screenshot(route.slice(1) + "-" + width);
      }
      // Main content titles must begin at the same vertical baseline.
      assert.ok(Math.max(...headings) - Math.min(...headings) <= 2, "Title baselines differ: " + headings);
    }
    // Real controlled teaching endpoint: start/resume, then a text reply advances in-place.
    await page.goto(base + "/coach");
    await page.getByRole("button", { name: /接着上次学习|开始第一门课/ }).click();
    await page.locator(".coach-live-lesson").waitFor();
    assert.equal(new URL(page.url()).pathname, "/coach");
    await screenshot("对话学习-1440");
    const before = await page.locator(".coach-live-progress strong").textContent();
    await page.locator("#coach-question").fill("继续");
    const turnResponse = page.waitForResponse((r) => r.url().endsWith("/api/v1/coach/turns") && r.request().method() === "POST");
    await page.getByRole("button", { name: "发送问题", exact: true }).click();
    const response = await turnResponse;
    assert.equal(response.status(), 200);
    const turn = await response.json();
    assert.ok(["teaching", "checking"].includes(turn.phase));
    if (turn.phase !== "checking") {
      await page.waitForFunction((value) => document.querySelector(".coach-live-progress strong")?.textContent !== value, before);
    }
    assert.equal(new URL(page.url()).pathname, "/coach");
    await screenshot("对话已推进-1440");
    assert.deepEqual(errors, []);
    console.log(JSON.stringify({ passed: true, viewports: [390, 768, 1280, 1440], output: out }, null, 2));
  } finally { await browser.close(); }
})().catch((error) => { console.error(error); process.exitCode = 1; });
