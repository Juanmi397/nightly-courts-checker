import { chromium } from "playwright";

/**
 * Pages to check
 */
const SITES = [
  { key: "PadelLK",       url: "https://www.padellk.ie/Booking/Grid.aspx" },
  { key: "ProjectPadel",  url: "https://projectpadel.ie/Booking/Grid.aspx" },
];

/**
 * MatchPoint draws the grid with JS after ~15–20s.
 * We wait a bit, then count cells by CSS class.
 * If your venue changes class names, tweak FREE/BUSY below.
 */
const WAIT_MS = 16000;
const SEL = {
  TABLE: ".gridTable",
  FREE:  ".gridTable .free", // green cells
  BUSY:  ".gridTable .busy", // red cells
};

async function run() {
  const browser = await chromium.launch();
  const out = [];
  for (const site of SITES) {
    const page = await browser.newPage();
    await page.goto(site.url, { waitUntil: "domcontentloaded" });
    try {
      await page.waitForSelector(SEL.TABLE, { timeout: 30000 });
    } catch (err) {
      console.error("Grid table not found, saving screenshot…");
      await page.screenshot({ path: `debug-${site.key}.png`, fullPage: true });
      throw err;
    }


    const free = await page.$$eval(SEL.FREE, els => els.length);
    const busy = await page.$$eval(SEL.BUSY, els => els.length);
    const total = free + busy;
    const pct = total > 0 ? (((busy) / total) * 100).toFixed(1) : "0.0";

    out.push({ key: site.key, free, busy, total, pct });

    await page.close();
  }
  await browser.close();
  return out;
}

// When run from the command line (GitHub Action), print 2 clean lines
// Example:
// PadelLK free=2 busy=26 total=28 pct=92.9
// ProjectPadel free=1 busy=23 total=24 pct=95.8
if (import.meta.url === `file://${process.argv[1]}`) {
  run()
    .then(results => {
      for (const r of results) {
        console.log(`${r.key} free=${r.free} busy=${r.busy} total=${r.total} pct=${r.pct}`);
      }
    })
    .catch(err => {
      console.error(err);
      process.exit(1);
    });
}

// (If you ever need to import this file from another JS file)
export { run };
