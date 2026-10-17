/* Isolated, real-browser acceptance. Never runs against production or a user database. */
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");
const os = require("node:os");
const { randomBytes } = require("node:crypto");
const { spawn, spawnSync } = require("node:child_process");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");

async function main() {
  const frontend = path.resolve(__dirname, "..");
  const backend = path.resolve(frontend, "../backend");
  const temp = await fs.mkdtemp(path.join(os.tmpdir(), "amajia-outcomes-test-"));
  const output = process.env.UI_TEST_OUTPUT || temp;
  await fs.mkdir(output, {recursive: true});
  const learnerCode = randomBytes(18).toString("hex");
  const adminCode = randomBytes(18).toString("hex");
  const env = {...process.env, APP_ENV: "test", DATABASE_URL: `sqlite:///${temp}/test.db`, LEARNER_INVITE_CODE: learnerCode, ADMIN_INVITE_CODE: adminCode, AI_API_KEY: "", DASHSCOPE_API_KEY: "", AI_EMBEDDING_MODEL: "", API_SERVER_BASE: "http://127.0.0.1:8763", NEXT_BUILD_DIR: ".next-outcomes-preview"};
  const base = "http://127.0.0.1:3023";
  for (const url of [base, env.API_SERVER_BASE]) {
    try { await fetch(url); throw new Error(`Test port already in use: ${url}`); }
    catch (error) { if (error.message.startsWith("Test port")) throw error; }
  }
  const python = path.join(backend, ".venv/bin/python");
  const apiServer = spawn(python, ["-m", "uvicorn", "app.main:app", "--port", "8763"], {cwd: backend, env, stdio: "ignore"});
  const webServer = spawn(process.execPath, ["node_modules/next/dist/bin/next", "dev", "--port", "3023"], {cwd: frontend, env, stdio: "ignore"});
  let browser;
  try {
    async function wait(url) {
      for (let i = 0; i < 90; i++) {
        if (apiServer.exitCode !== null || webServer.exitCode !== null) throw new Error("Isolated server exited before ready");
        try { if ((await fetch(url)).ok) return; } catch {}
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
      throw new Error(`Server did not become ready: ${url}`);
    }
    await wait(env.API_SERVER_BASE + "/health");
    await wait(base + "/welcome");
    console.log("Isolated servers ready");
    browser = await chromium.launch({headless: true, channel: "chrome"});
    const context = await browser.newContext({viewport: {width: 390, height: 844}});
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (error) => { errors.push(error.message); console.error("Browser runtime:", error.message); });
    page.on("console", (message) => { if (message.type() === "error") console.error("Browser console:", message.text().slice(0, 500)); });
    page.on("requestfailed", (request) => console.error("Failed request:", new URL(request.url()).pathname, request.failure()?.errorText));
    await page.goto(base + "/welcome");
    await page.waitForLoadState("networkidle");
    await page.getByLabel("怎么称呼你").fill("闭环验收");
    await page.getByLabel("邀请码", {exact: true}).fill(learnerCode);
    await page.getByRole("checkbox").check();
    console.log("Login controls", await page.evaluate(() => ({nameLength: document.querySelector("#display-name")?.value.length, codeLength: document.querySelector("#invitation-code")?.value.length, consent: document.querySelector("input[type=checkbox]")?.checked})));
    await page.getByRole("button", {name: "进入阿嬷学院"}).click();
    await page.waitForURL("**/basic");
    console.log("Browser login passed");
    await context.request.put(base + "/backend/api/v1/auth/learning-mode", {data: {preferred_mode: "coach"}});
    await page.goto(base + "/coach");
    await page.getByRole("button", {name: "开始第一门课"}).click();
    await page.getByRole("button", {name: "听懂了，继续", exact: true}).waitFor();
    await page.getByRole("button", {name: "听懂了，继续", exact: true}).click();
    await page.reload();
    await page.getByRole("button", {name: "接着上次学习", exact: true}).click();
    for (let i = 0; i < 12; i++) {
      const button = page.getByRole("button", {name: "听懂了，继续", exact: true});
      await Promise.race([button.waitFor(), page.getByRole("radiogroup").waitFor()]);
      if (await page.getByRole("radiogroup").isVisible()) break;
      await button.click();
      await page.waitForFunction(() => !document.body.textContent.includes("正在保存…"));
    }
    await page.getByRole("radiogroup").waitFor();
    const answerResult = spawnSync(python, ["-c", "from app.db import SessionLocal; from app.models import LearningSession, CourseVersion; from sqlalchemy import select; s=SessionLocal(); row=s.scalar(select(LearningSession).order_by(LearningSession.id)); print(s.get(CourseVersion,row.course_version_id).quiz['correct_answer'])"], {cwd: backend, env, encoding: "utf8"});
    assert.equal(answerResult.status, 0);
    const answer = answerResult.stdout.trim();
    await page.locator("#coach-question").fill("选" + answer.toUpperCase());
    await page.getByRole("button", {name: "发送问题"}).click();
    await page.getByRole("heading", {name: "换你说说，会怎么做？"}).waitFor();
    console.log("Course and conversational answer passed");
    const field = page.getByLabel("我的做法（20—1200字）");
    const response = "我先与客户确认任务范围，按课程顺序处理，遇到不确定的操作先停下求助，最后检查结果并交接。".repeat(5);
    await page.getByRole("button", {name: "用下面对话框回答"}).click();
    await page.getByRole("button", {name: "先问问题"}).click();
    await page.getByLabel("写下家政问题").waitFor();
    await page.getByRole("button", {name: "用下面对话框回答"}).click();
    await page.getByLabel("描述我的做法").fill(response);
    await page.getByRole("button", {name: "填入我的做法"}).click();
    await page.getByText("已填入做法，还没有提交。看一遍，再交给教练。").waitFor();
    assert.equal(await field.inputValue(), response);
    const beforeSubmit = await (await context.request.get(base + "/backend/api/v1/learning/outcomes")).json();
    assert.equal(beforeSubmit.tasks[0].attempt, null);
    await page.route("**/backend/api/v1/learning/sessions/*/practice", async (route) => {
      if (route.request().method() === "POST") { await route.fulfill({status: 503, contentType: "application/json", body: JSON.stringify({error: {message: "模拟网络故障，请重试"}})}); }
      else await route.continue();
    });
    await page.getByRole("button", {name: "交给教练看看"}).click();
    await page.getByText("模拟网络故障，请重试").waitFor();
    assert.equal(await field.inputValue(), response);
    await page.unroute("**/backend/api/v1/learning/sessions/*/practice");
    await page.getByRole("button", {name: "交给教练看看"}).click();
    await page.getByRole("heading", {name: "已收到，等待教练复核"}).waitFor();
    assert.equal(new URL(page.url()).pathname, "/coach");
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({path: path.join(output, "专业版-复述提交-390.png"), fullPage: true});
    const adminContext = await browser.newContext({viewport: {width: 1280, height: 900}});
    const logged = await adminContext.request.post(base + "/backend/api/v1/auth/invite-login", {data: {invitation_code: adminCode, display_name: "复核教练", consent_accepted: true, consent_version: "2026-10-17-v2"}});
    assert.ok(logged.ok());
    const adminPage = await adminContext.newPage();
    adminPage.on("pageerror", (error) => errors.push(error.message));
    await adminPage.goto(base + "/admin/practice");
    await adminPage.getByLabel("给学员的具体建议").fill("请补充：你会怎样向客户报告已经完成的工作和暂未完成的项目？");
    await adminPage.getByRole("button", {name: "请学员补充"}).click();
    await adminPage.getByRole("heading", {name: "暂时没有待复核的复述"}).waitFor();
    await page.evaluate(() => window.dispatchEvent(new Event("focus")));
    await field.waitFor();
    await page.getByRole("button", {name: "看看下一步"}).click();
    await page.getByText("教练有新建议", {exact: true}).waitFor();
    await page.getByRole("button", {name: "补充我的做法"}).click();
    await field.waitFor();
    await field.fill(response + "我会逐项向客户说明已完成和未完成的项目，请客户核对。");
    await page.getByRole("button", {name: "交给教练看看"}).click();
    await page.getByRole("heading", {name: "已收到，等待教练复核"}).waitFor();
    await adminPage.getByRole("button", {name: "刷新", exact: true}).click();
    await adminPage.getByLabel("给学员的具体建议").waitFor();
    for (const label of ["能说清操作顺序", "能说清停止和求助边界", "能说清检查和交接"]) await adminPage.getByLabel(label).check();
    await adminPage.getByLabel("给学员的具体建议").fill("顺序、安全和交接已经说清楚。实际操作还需要线下教练核验。");
    await adminPage.screenshot({path: path.join(output, "教练复核-1280.png"), fullPage: true});
    await adminPage.getByRole("button", {name: "确认线上复述"}).click();
    await adminPage.getByRole("heading", {name: "暂时没有待复核的复述"}).waitFor();
    await page.getByRole("button", {name: "刷新复核结果"}).click();
    await page.getByRole("heading", {name: "这次复述已由教练确认"}).waitFor();
    await page.getByRole("button", {name: "看看下一步"}).click();
    await page.getByRole("button", {name: "开始下一门课"}).waitFor();
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({path: path.join(output, "专业版-下一步-390.png"), fullPage: true});
    await page.goto(base + "/records");
    await page.getByRole("heading", {name: "从听懂，到说得清"}).waitFor();
    for (const width of [375, 768, 1280]) {
      await page.setViewportSize({width, height: 900});
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `Overflow at ${width}`);
    }
    const state = await (await context.request.get(base + "/backend/api/v1/learning/outcomes")).json();
    assert.equal(state.teachback_reviewed, 1);
    assert.equal(state.practical_verified, false);
    // Create the remaining learning evidence through public APIs on the isolated DB.
    // Correct answers are test-fixture data, never returned by the learner API.
    const fixtures = spawnSync(python, ["-c", "import json; from app.db import SessionLocal; from app.models import CourseVersion; from app.seed import COURSE_META; from sqlalchemy import select; s=SessionLocal(); print(json.dumps({v.course_id:v.quiz['correct_answer'] for v in s.scalars(select(CourseVersion)) if v.course_id in COURSE_META}))"], {cwd: backend, env, encoding: "utf8"});
    assert.equal(fixtures.status, 0);
    async function post(endpoint, data) {
      const result = await context.request.post(base + "/backend/api/v1" + endpoint, {data});
      assert.ok(result.ok(), `${endpoint}: ${result.status()}`);
      return result.json();
    }
    for (const [courseId, correct] of Object.entries(JSON.parse(fixtures.stdout))) {
      let session = (await post("/coach/turns", {action: "start_or_resume", course_id: courseId})).session;
      if (session.status === "completed") continue;
      while (session.status !== "checking") session = (await post("/coach/turns", {action: "continue", session_id: session.id, expected_step: session.current_step})).session;
      session = (await post("/coach/turns", {action: "submit_check", session_id: session.id, answer: correct, expected_quiz_attempts: 0})).session;
      await post(`/learning/sessions/${session.id}/practice`, {response_text: response, idempotency_key: randomBytes(16).toString("hex"), expected_attempt_no: 0});
    }
    await page.goto(base + "/coach");
    await page.getByRole("button", {name: "开始或继续学后回顾"}).click();
    const choices = page.locator(".outcome-reflection .coach-answer-options button");
    await choices.first().click();
    await page.getByText("已回顾 1/", {exact: false}).waitFor();
    await page.reload();
    await page.getByRole("button", {name: "开始或继续学后回顾"}).click();
    await page.getByText("已回顾 1/", {exact: false}).waitFor();
    for (let i = 1; i < 12; i++) {
      const saved = page.waitForResponse((r) => r.request().method() === "PUT" && r.url().includes("/answers"));
      await choices.first().click();
      assert.ok((await saved).ok());
      if (i < 11) await page.getByText(`已回顾 ${i + 1}/`, {exact: false}).waitFor();
    }
    await page.getByRole("heading", {name: "学后回顾已保存"}).waitFor();
    await page.getByRole("button", {name: /· 问老师/}).first().click();
    assert.ok((await page.locator("#coach-question").inputValue()).includes("还不太明白"));
    assert.equal(new URL(page.url()).pathname, "/coach");
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({path: path.join(output, "专业版-学后回顾-1280.png"), fullPage: true});
    assert.deepEqual(errors, []);
    console.log(JSON.stringify({passed: true, scenarios: ["login", "resume", "answer by text", "composer draft does not submit", "cancel draft mode", "503 retains input", "submit", "feedback on return", "feedback priority on home", "resubmit", "human review", "next course in chat", "shared records", "responsive widths", "post-review resume and submit in chat", "weak-point question stays in chat"], screenshots: output}));
  } finally {
    if (browser) await browser.close();
    apiServer.kill("SIGTERM"); webServer.kill("SIGTERM");
  }
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
