// check.js
import { chromium } from "playwright";

const SITES = [
  { key: "PadelLK", url: "https://www.padellk.ie/Booking/Grid.aspx" },
  { key: "ProjectPadel", url: "https://projectpadel.ie/Booking/Grid.aspx" }
];

const SEL = {
  GRID: "svg#tablaReserva",
  FREE: "rect.buttonHora[habilitado='true']",
  BUSY: "rect.evento"
};

function isPeak(siteKey, hour, day) {
  const isWeekend = (day === 0 || day === 6);
  if (siteKey === "PadelLK") {
    if (isWeekend) return true;
    return (hour >= 16 && hour <= 22);
  }
  if (siteKey === "ProjectPadel") {
    if (isWeekend) return (hour >= 10 && hour <= 22);
    return (hour >= 16 && hour <= 22);
  }
  return false;
}

export async function run() {
  const browser = await chromium.launch({ headless: true });
  const out = [];

  for (const site of SITES) {
    const page = await browser.newPage();
    await page.goto(site.url, { waitUntil: "domcontentloaded" });

    await page.waitForSelector(SEL.GRID, { timeout: 30000 });

    await page.screenshot({ path: `snapshot-${site.key}.png`, fullPage: true });

    const slots = await page.$$eval("rect.buttonHora, rect.evento", els =>
      els.map(el => ({
        busy: el.classList.contains("evento"),
        time: el.getAttribute("time") || el.getAttribute("datahora") || ""
      }))
    );

    const now = new Date();
    let free = 0, busy = 0, peakFree = 0, peakBusy = 0, offFree = 0, offBusy = 0;
    for (const slot of slots) {
      if (!slot.time) continue;
      const [h] = slot.time.split(":").map(Number);
      const inPeak = (h >= 0 && h <= 23) ? isPeak(site.key, h, now.getDay()) : false;
      if (slot.busy) {
        busy++;
        inPeak ? peakBusy++ : offBusy++;
      } else {
        free++;
        inPeak ? peakFree++ : offFree++;
      }
    }

    const total = free + busy;
    const pct = total > 0 ? ((busy / total) * 100).toFixed(1) : "0.0";
    const peakTotal = peakFree + peakBusy;
    const offTotal = offFree + offBusy;
    const pctPeak = peakTotal > 0 ? ((peakBusy / peakTotal) * 100).toFixed(1) : "0.0";
    const pctOff = offTotal > 0 ? ((offBusy / offTotal) * 100).toFixed(1) : "0.0";

    // print as key=value line
    out.push(
      `${site.key} free=${free} busy=${busy} total=${total} pct=${pct} ` +
      `peak_busy=${peakBusy} peak_total=${peakTotal} peak_pct=${pctPeak} ` +
      `off_busy=${offBusy} off_total=${offTotal} off_pct=${pctOff}`
    );

    await page.close();
  }

  await browser.close();
  console.log(out.join("\n"));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  run();
}
