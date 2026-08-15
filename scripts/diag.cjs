const puppeteer = require("puppeteer-core");

const EDGE = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const BASE = process.env.BASE || "http://localhost:5173";

async function main() {
  const browser = await puppeteer.launch({
    executablePath:
      process.env.EDGE ||
      EDGE,
    headless: "new",
    args: ["--no-sandbox", "--disable-gpu", "--window-size=1280,900"],
  });
  const page = await browser.newPage();
  const errors = [];
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  page.on("pageerror", (e) => errors.push("PAGEERROR: " + e.message));

  // Log in through the UI
  await page.goto(BASE + "/login", { waitUntil: "networkidle2", timeout: 25000 });
  await page.waitForSelector("input", { timeout: 8000 });
  await page.evaluate(() => {
    const i = document.querySelector("input");
    i.value = "admin@acme.io";
    const btns = [...document.querySelectorAll("button")];
    const b = btns.find((x) => x.innerText.trim() === "Sign in");
    if (b) b.click();
  });
  await page.waitForFunction(
    () => document.body.innerText.includes("Compliance Cockpit") || document.body.innerText.includes("Something went wrong"),
    { timeout: 15000 },
  );

  for (const route of ["/", "/risks", "/controls", "/evidence", "/activity"]) {
    errors.length = 0;
    try {
      await page.goto(BASE + route, { waitUntil: "networkidle2", timeout: 25000 });
      await page.waitForFunction(
        () => document.body.innerText.length > 200 && !document.body.innerText.startsWith("Loading"),
        { timeout: 9000 },
      );
      const text = await page.evaluate(() => document.body.innerText);
      const lines = text.split("\n").filter((l) => l.trim());
      console.log(`\n=== ${route} ===`);
      console.log("HAS DATA:", text.includes("Ransomware") || text.includes("Controls Library") || text.includes("Evidence Repository") || text.includes("Activity Log"), "| lines:", lines.length);
      if (errors.length) console.log("CONSOLE ERRORS:");
      for (const e of [...new Set(errors)]) console.log("  " + e.slice(0, 400));
    } catch (err) {
      console.log(`\n=== ${route} === WAIT ERR: ${err.message.slice(0, 200)}`);
      const text = await page.evaluate(() => document.body.innerText).catch(() => "");
      console.log("TEXT:", text.split("\n").filter((l) => l.trim()).slice(0, 10).join(" | "));
      if (errors.length) {
        console.log("CONSOLE ERRORS:");
        for (const e of [...new Set(errors)]) console.log("  " + e.slice(0, 400));
      }
    }
  }

  // --- Interaction tests ---
  async function grab(tag) {
    const errs = [...new Set(errors)];
    const text = await page.evaluate(() => document.body.innerText);
    const hasErr = text.includes("Something went wrong");
    console.log(`[${tag}] errorBoundary=${hasErr} consoleErrors=${errs.length}`);
    for (const e of errs) console.log("   " + e.slice(0, 300));
    if (hasErr) {
      const i = text.indexOf("Something went wrong");
      console.log("   BOUNDARY MSG: " + text.slice(i, i + 300).replace(/\n/g, " "));
    }
  }

  errors.length = 0;
  try {
    await page.goto(BASE + "/risks", { waitUntil: "networkidle2", timeout: 25000 });
    await page.waitForSelector("tbody tr", { timeout: 9000 });
    await page.evaluate(() => document.querySelector("tbody tr").click());
    await page.waitForFunction(() => document.body.innerText.includes("Linked controls"), { timeout: 5000 });
    await grab("risk-drawer");
  } catch (e) {
    console.log("[risk-drawer] FAILED: " + e.message.slice(0, 150));
  }

  errors.length = 0;
  try {
    await page.goto(BASE + "/risks", { waitUntil: "networkidle2", timeout: 25000 });
    await page.evaluate(() => {
      const b = [...document.querySelectorAll("button")].find((x) => x.innerText.trim() === "+ New risk");
      b && b.click();
    });
    await page.waitForFunction(() => document.body.innerText.includes("Live preview"), { timeout: 5000 });
    await grab("new-risk-form");
  } catch (e) {
    console.log("[new-risk-form] FAILED: " + e.message.slice(0, 150));
  }

  errors.length = 0;
  try {
    await page.goto(BASE + "/controls", { waitUntil: "networkidle2", timeout: 25000 });
    await page.waitForFunction(() => document.body.innerText.includes("Click a health"), { timeout: 9000 });
    await page.evaluate(() => {
      const btn = [...document.querySelectorAll("button")].find((x) => x.title === "Click to change");
      btn && btn.click();
    });
    await page.waitForTimeout(2000);
    await grab("cycle-health");
  } catch (e) {
    console.log("[cycle-health] FAILED: " + e.message.slice(0, 150));
  }

  // --- SPA navigation via sidebar (reproduces user flow) ---
  await page.goto(BASE + "/", { waitUntil: "networkidle2", timeout: 25000 });
  await page.waitForFunction(() => document.body.innerText.includes("Compliance Cockpit"), { timeout: 9000 });

  const links = ["Risk Register", "Controls", "Evidence", "Activity Log", "Dashboard"];
  for (const label of links) {
    errors.length = 0;
    await page.evaluate((l) => {
      const a = [...document.querySelectorAll("a")].find((x) => x.innerText.includes(l));
      a && a.click();
    }, label);
    await new Promise((r) => setTimeout(r, 3500));
    const text = await page.evaluate(() => document.body.innerText);
    const markers = ["Risk Register", "Controls Library", "Evidence Repository", "Activity Log", "Compliance Cockpit"];
    const hit = markers.filter((m) => text.includes(m));
    const boundary = text.includes("Something went wrong");
    console.log(`[nav->${label}] renders=${hit.join("/") || "(none)"} boundary=${boundary} errors=${errors.length}`);
    for (const e of [...new Set(errors)]) console.log("   " + e.slice(0, 300));
    if (boundary) {
      const i = text.indexOf("Something went wrong");
      console.log("   MSG: " + text.slice(i, i + 250).replace(/\n/g, " "));
    }
  }

  // --- Interaction: open drawer ---
  errors.length = 0;
  try {
    await page.evaluate(() => {
      const b = [...document.querySelectorAll("a")].find((x) => x.innerText.includes("Risk Register"));
      b && b.click();
    });
    await new Promise((r) => setTimeout(r, 2500));
    await page.waitForSelector("tbody tr", { timeout: 9000 });
    await page.evaluate(() => document.querySelector("tbody tr").click());
    await page.waitForFunction(
      () => /linked controls/i.test(document.body.innerText),
      { timeout: 5000 },
    );
    await grab("risk-drawer");
  } catch (e) {
    console.log("[risk-drawer] FAILED: " + e.message.slice(0, 150));
  }

  // --- Interaction: New risk form (ScorePreview) ---
  errors.length = 0;
  try {
    await page.evaluate(() => {
      const b = [...document.querySelectorAll("button")].find((x) => x.innerText.trim() === "+ New risk");
      b && b.click();
    });
    await page.waitForFunction(() => /live preview/i.test(document.body.innerText), { timeout: 5000 });
    await grab("new-risk-form");
  } catch (e) {
    console.log("[new-risk-form] FAILED: " + e.message.slice(0, 150));
  }

  // --- Interaction: cycle control health ---
  errors.length = 0;
  try {
    await page.evaluate(() => {
      const b = [...document.querySelectorAll("a")].find((x) => x.innerText.includes("Controls"));
      b && b.click();
    });
    await new Promise((r) => setTimeout(r, 2500));
    await page.evaluate(() => {
      const btn = [...document.querySelectorAll("button")].find((x) => x.title === "Click to change");
      btn && btn.click();
    });
    await new Promise((r) => setTimeout(r, 2500));
    await grab("cycle-health");
  } catch (e) {
    console.log("[cycle-health] FAILED: " + e.message.slice(0, 150));
  }

  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});