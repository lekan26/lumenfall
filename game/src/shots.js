import { World } from './world.js';

function createSeededRNG(seed) {
  let s = Number(seed) || 1;
  return function() {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

class FakeInput {
  constructor() {
    this.keys = new Set();
    this.mouseX = 640;
    this.mouseY = 360;
    this.mouseDown = false;
    this.mouseClicked = false;
  }
  isDown(code) { return this.keys.has(code); }
  isPressed(code) { return false; }
  consumeClick() {
    const c = this.mouseClicked;
    this.mouseClicked = false;
    return c;
  }
  reset() { this.mouseClicked = false; }
}

export class Autopilot {
  constructor(world, input, isBad = false) {
    this.world = world;
    this.input = input;
    this.isBad = isBad;
  }

  update(dt) {
    const p = this.world.player;
    if (this.world.levelingUp && this.world.currentCards.length > 0) {
      let bestIdx = 0;
      let bestScore = -1;
      this.world.currentCards.forEach((c, idx) => {
        let score = 0;
        if (c.id === 'heavy' || c.id === 'rapid' || c.id === 'split') score = 10;
        else if (c.id === 'vital' || c.id === 'thick' || c.id === 'swift') score = 5;
        else score = 1;
        if (score > bestScore) {
          bestScore = score;
          bestIdx = idx;
        }
      });
      this.world.chooseUpgrade(bestIdx);
      return;
    }

    let targetX = p.x;
    let targetY = p.y;

    let nearestEnemy = this.world.getNearestEnemy();
    let enemyDist = nearestEnemy ? Math.hypot(nearestEnemy.x - p.x, nearestEnemy.y - p.y) : 9999;

    let dodgeX = 0;
    let dodgeY = 0;
    if (this.world.enemyProjectiles) {
      this.world.enemyProjectiles.forEach(proj => {
        let d = Math.hypot(proj.x - p.x, proj.y - p.y);
        if (d < 150) {
          let angle = Math.atan2(p.y - proj.y, p.x - proj.x);
          dodgeX += Math.cos(angle) * (150 - d);
          dodgeY += Math.sin(angle) * (150 - d);
        }
      });
    }

    if (this.isBad) {
      if (nearestEnemy && enemyDist < 80) {
        let angle = Math.atan2(nearestEnemy.y - p.y, nearestEnemy.x - p.x);
        targetX = p.x - Math.cos(angle) * 150;
        targetY = p.y - Math.sin(angle) * 150;
      } else {
        targetX = p.x + (Math.random() - 0.5) * 20;
        targetY = p.y + (Math.random() - 0.5) * 20;
      }
    } else {
      let nearestShard = null;
      let minShardDist = Infinity;
      if (this.world.shards) {
        this.world.shards.forEach(s => {
          let d = Math.hypot(s.x - p.x, s.y - p.y);
          if (d < minShardDist) {
            minShardDist = d;
            nearestShard = s;
          }
        });
      }

      if (nearestShard && minShardDist < 350 && enemyDist > 140) {
        targetX = nearestShard.x;
        targetY = nearestShard.y;
      } else if (nearestEnemy) {
        let angleToEnemy = Math.atan2(nearestEnemy.y - p.y, nearestEnemy.x - p.x);
        if (enemyDist < 200) {
          targetX = p.x - Math.cos(angleToEnemy) * 220;
          targetY = p.y - Math.sin(angleToEnemy) * 220;
        } else {
          targetX = p.x + Math.sin(angleToEnemy) * 160;
          targetY = p.y - Math.cos(angleToEnemy) * 160;
        }
      }

      targetX += dodgeX;
      targetY += dodgeY;

      if ((enemyDist < 140 || (dodgeX !== 0 || dodgeY !== 0)) && p.flareCharges > 0 && p.flareCooldown <= 0) {
        this.input.mouseClicked = true;
      }
    }

    const dx = targetX - p.x;
    const dy = targetY - p.y;

    this.input.keys.clear();
    if (dy < -10) this.input.keys.add('KeyW');
    if (dy > 10) this.input.keys.add('KeyS');
    if (dx < -10) this.input.keys.add('KeyA');
    if (dx > 10) this.input.keys.add('KeyD');

    if (nearestEnemy) {
      this.input.mouseX = nearestEnemy.x;
      this.input.mouseY = nearestEnemy.y;
    }
  }
}

export function runShotScene(shotName, world, audio, renderer, seed = 1) {
  const origRandom = Math.random;
  Math.random = createSeededRNG(seed);

  try {
    const input = new FakeInput();
    const dt = 0.05;

    if (shotName === 'start') {
      const simTime = 5;
      for (let t = 0; t < simTime; t += dt) {
        world.update(dt, input);
      }
      renderer.clear();
      renderer.drawTitleScreen(0);
    } else if (shotName === 'play') {
      const simTime = 26;
      const auto = new Autopilot(world, input, false);
      for (let t = 0; t < simTime; t += dt) {
        auto.update(dt);
        world.update(dt, input);
      }
      renderer.clear();
      renderer.drawWorld(world);
    } else if (shotName === 'win') {
      const auto = new Autopilot(world, input, false);
      let t = 0;
      while (!world.victory && !world.gameOver && t < 600) {
        auto.update(dt);
        world.update(dt, input);
        t += dt;
      }
      renderer.clear();
      renderer.drawEndScreen(world, true);
    } else if (shotName === 'loss') {
      const auto = new Autopilot(world, input, true);
      let t = 0;
      while (!world.gameOver && t < 600) {
        auto.update(dt);
        world.update(dt, input);
        t += dt;
      }
      renderer.clear();
      renderer.drawEndScreen(world, false);
    }
  } finally {
    Math.random = origRandom;
  }

  window.__shotReady = true;
}
