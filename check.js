import { chromium } from "playwright";

const SITES = [
  { key: "PadelLK",      url: "https://www.padellk.ie/Booking/Grid.aspx" },
  { key: "ProjectPadel", url: "https://projectpadel.ie/Booking/Grid.aspx" },
];

const WAIT_MS = 20000; // baseline wait for the site’s own JS
const MAX_GRID_WAIT_MS = 45000; // be generous; grid can be slow

async function checkOne(site) {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  try {
    await page.goto(site.url, { waitUntil: "domcontentloaded", timeout: 60000 });
    // Let their JS run for a bit
    await page.waitForTimeout(WAIT_MS);

    // Wait until the table exists AND has at least one free/busy cell
    await page.waitForFunction(() => {
      const table = document.querySelector(".gridTable");
      if (!table) return false;
      const cells = table.querySelectorAll(".free, .busy");
      return cells.length > 0;
    }, { timeout: MAX_GRID_WAIT_MS });

    const free = await page.$$eval(".gridTable .free", els => els.length);
    const busy = await page.$$eval(".gridTable .busy", els => els.length);
    const total = free + busy;
    const pct = total > 0 ? ((busy / total) * 100).toFixed(1) : "0.0";

    return { key: site.key, free, busy, total, pct, ok: true };
  } catch (e) {
    // Save what we saw for debugging
    try { await page.screenshot({ path: `debug-${site.key}.png`, fullPage: true }); } catch {}
    return { key: site.key, free: 0, busy: 0, total: 0, pct: "0.0", ok: false, error: String(e) };
  } finally {
    await page.close();
    await browser.close();
  }
}

async function run() {
  const results = [];
  for (const site of SITES) {
    const r = await checkOne(site);
    results.push(r);
  }
  return results;
}

// Print two clean lines that the workflow parses.
// Always prints a line per site even on failure.
if (import.meta.url === `file://${process.argv[1]}`) {
  run().then(results => {
    for (const r of results) {
      const suffix = r.ok ? "" : " ERROR=1";
      console.log(`${r.key} free=${r.free} busy=${r.busy} total=${r.total} pct=${r.pct}${suffix}`);
    }
  }).catch(err => { console.error(err); process.exit(1); });
}

export { run };
