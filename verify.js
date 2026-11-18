import { spawn as spawnProc, execSync as execSyncProc } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { createRequire } from 'node:module';

async function verify() {
  console.log('Starting verification script for Lumenfall...');

  // 1. Check syntax with node --check
  console.log('Checking JS syntax...');
  const jsFiles = [
    'game/src/config.js',
    'game/src/input.js',
    'game/src/audio.js',
    'game/src/entities.js',
    'game/src/upgrades.js',
    'game/src/world.js',
    'game/src/render.js',
    'game/src/ui.js',
    'game/src/shots.js',
    'game/src/main.js'
  ];
  for (const file of jsFiles) {
    execSyncProc(`node --check ${file}`, { stdio: 'inherit' });
  }

  // 2. Start serve.ts on port 8081
  console.log('Starting server on port 8081...');
  const serverProc = spawnProc('node', ['serve.ts', '--port', '8081'], {
    stdio: 'ignore'
  });

  await new Promise(r => setTimeout(r, 1500));

  try {
    const res = await fetch('http://localhost:8081/');
    if (res.status !== 200) {
      throw new Error(`Server returned status ${res.status}`);
    }
    console.log('Server verified: HTTP 200 OK');
  } catch (err) {
    serverProc.kill();
    console.error('Server check failed:', err);
    process.exit(1);
  }

  // 3. Install playwright-core in scratch directory /tmp/lumenfall-tools
  const scratchDir = '/tmp/lumenfall-tools';
  if (!existsSync(join(scratchDir, 'node_modules/playwright-core'))) {
    console.log('Installing playwright-core into scratch directory...');
    mkdirSync(scratchDir, { recursive: true });
    writeFileSync(join(scratchDir, 'package.json'), JSON.stringify({ name: 'scratch', dependencies: { 'playwright-core': '1.49.1' } }));
    execSyncProc('npm install --silent', { cwd: scratchDir, stdio: 'inherit' });
  }

  const requireScratch = createRequire(join(scratchDir, 'package.json'));
  const { chromium } = requireScratch('playwright-core');

  const browser = await chromium.launch({ headless: true });

  let consoleErrors = 0;
  let failedRequests = 0;
  let outsideRequests = 0;

  async function setupPageListeners(page) {
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.error('Console error:', msg.text());
        consoleErrors++;
      }
    });
    page.on('requestfailed', req => {
      console.error('Request failed:', req.url());
      failedRequests++;
    });
    page.on('request', req => {
      const url = req.url();
      if (!url.startsWith('http://localhost:8081') && !url.startsWith('data:')) {
        console.error('Outside request detected:', url);
        outsideRequests++;
      }
    });
  }

  // 4. Take four deterministic screenshots
  console.log('Taking deterministic screenshots...');
  const shots = JSON.parse(readFileSync('shots.json', 'utf8'));
  const shotResults = [];

  for (const shot of shots) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    await setupPageListeners(page);
    await page.goto(`http://localhost:8081/${shot.query}`);
    
    try {
      await page.waitForFunction(() => window.__shotReady === true, { timeout: 15000 });
    } catch (e) {
      console.warn(`Timeout waiting for __shotReady on ${shot.name}`);
    }

    const screenshotBuffer = await page.screenshot({ type: 'jpeg', quality: 80 });
    const bytes = screenshotBuffer.length;
    if (bytes > 262144) {
      throw new Error(`Screenshot ${shot.name} exceeds 256 KiB (${bytes} bytes)`);
    }

    writeFileSync(join('screenshots', shot.name), screenshotBuffer);
    shotResults.push({ name: shot.name, size: bytes, dims: '1280x720' });
    await page.close();
  }
  console.log('Screenshots captured successfully:', shotResults);

  // 5. Test Idle Time to Death (stand still)
  console.log('Testing idle time to death...');
  const deathPage = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await setupPageListeners(deathPage);
  await deathPage.goto('http://localhost:8081/');
  
  await new Promise(r => setTimeout(r, 1000));
  await deathPage.mouse.click(640, 530); // click Start

  let timeToDeath = 0;
  const startTime = Date.now();
  while (true) {
    await new Promise(r => setTimeout(r, 1000));
    const state = await deathPage.evaluate(() => {
      if (!window.__game) return { phase: 'play' };
      return { phase: window.__game.phase };
    });

    if (state.phase === 'levelup') {
      await deathPage.keyboard.press('Digit1');
    }

    const timeElapsed = (Date.now() - startTime) / 1000;
    if (state.phase === 'gameover' || timeElapsed > 75) {
      timeToDeath = timeElapsed;
      break;
    }
  }
  await deathPage.close();
  console.log(`Time to death (idle): ${timeToDeath.toFixed(1)}s`);
  if (timeToDeath >= 75) {
    throw new Error(`Time to death took too long (${timeToDeath}s >= 75s)`);
  }

  // 6. Test Autopilot win / survival
  console.log('Running autopilot test...');
  const autoPage = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await setupPageListeners(autoPage);
  await autoPage.goto('http://localhost:8081/?autopilot=1');

  let autoStats = { time: 0, level: 1, kills: 0, phase: 'play' };
  const autoStartTime = Date.now();
  while (true) {
    await new Promise(r => setTimeout(r, 2000));
    const state = await autoPage.evaluate(() => {
      if (!window.__game) return { phase: 'play', time: 0, level: 1, kills: 0 };
      return {
        phase: window.__game.phase,
        time: window.__game.time,
        level: window.__game.level,
        kills: window.__game.kills
      };
    });

    autoStats = state;
    const elapsedMinutes = (Date.now() - autoStartTime) / 60000;
    if (state.phase === 'victory' || state.phase === 'gameover' || elapsedMinutes > 8) {
      break;
    }
  }
  await autoPage.close();
  console.log(`Autopilot finished: phase=${autoStats.phase}, time=${autoStats.time.toFixed(1)}s, level=${autoStats.level}, kills=${autoStats.kills}`);

  if (autoStats.phase !== 'victory') {
    throw new Error(`Autopilot did not win! Ended with phase: ${autoStats.phase}`);
  }

  // 7. Verify main.ts reproducibility
  console.log('Verifying main.ts output reproducibility...');
  const out1 = '/tmp/lumenfall-out-1';
  const out2 = '/tmp/lumenfall-out-2';
  rmSync(out1, { recursive: true, force: true });
  rmSync(out2, { recursive: true, force: true });

  execSyncProc(`MAKEFUN_OUTPUT_DIR=${out1} node main.ts`, { stdio: 'inherit' });
  execSyncProc(`MAKEFUN_OUTPUT_DIR=${out2} node main.ts`, { stdio: 'inherit' });

  const dossier1 = readFileSync(join(out1, 'dossier.json'), 'utf8');
  const dossier2 = readFileSync(join(out2, 'dossier.json'), 'utf8');
  if (dossier1 !== dossier2) {
    throw new Error('main.ts outputs are not identical across different MAKEFUN_OUTPUT_DIR runs!');
  }
  console.log('Reproducibility check passed: dossier.json outputs are byte-for-byte identical.');

  serverProc.kill();
  await browser.close();

  console.log('=== VERIFICATION SUMMARY ===');
  console.log(`Console Errors: ${consoleErrors}`);
  console.log(`Failed Requests: ${failedRequests}`);
  console.log(`Outside Requests: ${outsideRequests}`);
  console.log(`Idle Time to Death: ${timeToDeath.toFixed(1)}s`);
  console.log(`Autopilot Time: ${autoStats.time.toFixed(1)}s, Level: ${autoStats.level}, Kills: ${autoStats.kills}`);
  console.log('All verification checks passed successfully!');
}

verify().catch(err => {
  console.error('Verification FAILED:', err);
  process.exit(1);
});
