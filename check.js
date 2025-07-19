import { chromium } from 'playwright';

const SITES = [
  { name: 'Padel LK',      url: 'https://www.padellk.ie/Booking/Grid.aspx' },
  { name: 'Project Padel', url: 'https://projectpadel.ie/Booking/Grid.aspx' },
];

// MatchPoint paints the grid after ±15 s of JavaScript.
const WAIT = 16000;
const SEL  = {
  TABLE: '.gridTable',
  FREE : '.gridTable .free',   // green cells
  BUSY : '.gridTable .busy',   // red  cells
};

export async function run() {
  const browser = await chromium.launch();
  const out = [];

  for (const site of SITES) {
    const page = await browser.newPage();
    await page.goto(site.url, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(WAIT);
    await page.waitForSelector(SEL.TABLE, { timeout: 5000 });

    const free = await page.$$eval(SEL.FREE, n => n.length);
    const busy = await page.$$eval(SEL.BUSY, n => n.length);
    out.push({ site: site.name, free, busy });
    await page.close();
  }
  await browser.close();
  return out;
}

// When the workflow runs `node check.js`:
if (import.meta.url === `file://${process.argv[1]}`) {
  run().then(r => {
    r.forEach(x => {
      const tot = x.free + x.busy;
      console.log(`${x.site}: ${x.free} free / ${tot} slots`);
    });
  });
}
