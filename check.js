// check.js
import { chromium } from "playwright";

const SITES = [
  { key: "PadelLK", url: "https://www.padellk.ie/Booking/Grid.aspx" },
  { key: "ProjectPadel", url: "https://projectpadel.ie/Booking/Grid.aspx" }
];

// Selectors adapted for SVG-based booking grid
const SEL = {
  GRID: "svg#tablaReserva",                     // the whole SVG
  FREE: "rect.buttonHora[habilitado='true']",   // free slots
  BUSY: "rect.evento"                           // booked slots
};

export async function run() {
  const browser = await chromium.launch({ headless: true });
  const out = [];

  for (const site of SITES) {
    const page = await browser.newPage();
    await page.goto(site.url, { waitUntil: "domcontentloaded" });

    try {
      // Wait until the SVG grid appears
      await page.waitForSelector(SEL.GRID, { timeout: 30000 });
    } catch (err) {
      console.error(`Grid not found on ${site.key}, saving screenshot…`);
      await page.screenshot({ path: `debug-${site.key}.png`, fullPage: true });
      throw err;
    }

    // Count free and busy rectangles
    const free = await page.$$eval(SEL.FREE, els => els.length);
    const busy = await page.$$eval(SEL.BUSY, els => els.length);
    const total = free + busy;
    const pct = total > 0 ? (((busy) / total) * 100).toFixed(1) : "0.0";

    out.push(`${site.key}: ${busy} busy / ${total} slots → ${pct}% occupied`);
    await page.close();
  }

  await browser.close();

  // Print results so GitHub Actions can capture them
  console.log(out.join("\n"));
}

// Run directly if this file is executed via `node check.js`
if (import.meta.url === `file://${process.argv[1]}`) {
  run();
}
