import { World } from './world.js';
import { Enemy, Shard } from './entities.js';

export class Autopilot {
  constructor(world, input) {
    this.world = world;
    this.input = input;
  }

  update(dt) {
    const p = this.world.player;
    
    if (this.world.levelingUp && this.world.currentCards.length > 0) {
      this.world.chooseUpgrade(0);
      return;
    }

    let targetX = p.x;
    let targetY = p.y;

    let nearestShard = null;
    let minShardDist = Infinity;
    this.world.shards.forEach(s => {
      let d = Math.hypot(s.x - p.x, s.y - p.y);
      if (d < minShardDist) {
        minShardDist = d;
        nearestShard = s;
      }
    });

    let nearestEnemy = this.world.getNearestEnemy();
    let enemyDist = nearestEnemy ? Math.hypot(nearestEnemy.x - p.x, nearestEnemy.y - p.y) : 9999;

    if (nearestShard && minShardDist < 400 && enemyDist > 120) {
      targetX = nearestShard.x;
      targetY = nearestShard.y;
    } else if (nearestEnemy) {
      let angleToEnemy = Math.atan2(nearestEnemy.y - p.y, nearestEnemy.x - p.x);
      if (enemyDist < 180) {
        targetX = p.x - Math.cos(angleToEnemy) * 200;
        targetY = p.y - Math.sin(angleToEnemy) * 200;
      } else {
        targetX = p.x + Math.sin(angleToEnemy) * 150;
        targetY = p.y - Math.cos(angleToEnemy) * 150;
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

    if (enemyDist < 120 && p.flareCharges > 0 && p.flareCooldown <= 0) {
      this.input.mouseClicked = true;
    }
  }
}

export function runShotScene(shotName, world, audio, renderer) {
  if (shotName === 'start') {
    renderer.clear();
    renderer.drawTitleScreen(145);
  } else if (shotName === 'play') {
    world.time = 42;
    world.kills = 28;
    world.totalShardsCollected = 35;
    world.player.level = 4;
    world.player.xp = 15;
    world.player.nextXp = 22;
    // Add representative enemies and shards around player
    world.enemies.push(new Enemy(world.player.x + 120, world.player.y - 80, 'mote', false, 1.2));
    world.enemies.push(new Enemy(world.player.x - 150, world.player.y + 100, 'skitter', false, 1.2));
    world.enemies.push(new Enemy(world.player.x + 80, world.player.y + 160, 'brute', true, 1.2));
    world.shards.push(new Shard(world.player.x - 60, world.player.y - 50, 1));
    world.shards.push(new Shard(world.player.x + 50, world.player.y + 60, 5));

    renderer.clear();
    renderer.drawWorld(world);
  } else if (shotName === 'win') {
    world.time = 285;
    world.kills = 142;
    world.totalShardsCollected = 210;
    world.player.level = 11;
    renderer.clear();
    renderer.drawEndScreen(world, true);
  } else if (shotName === 'loss') {
    world.time = 38;
    world.kills = 12;
    world.totalShardsCollected = 14;
    world.player.level = 2;
    world.player.health = 0;
    renderer.clear();
    renderer.drawEndScreen(world, false);
  }

  window.__shotReady = true;
}
