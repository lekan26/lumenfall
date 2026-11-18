import { CONFIG } from './config.js';
import { Player, Bolt, Enemy, Boss, EnemyProjectile, Shard, Particle, FloatingText } from './entities.js';
import { UpgradeManager } from './upgrades.js';

export class World {
  constructor(audio) {
    this.audio = audio;
    this.width = CONFIG.WIDTH;
    this.height = CONFIG.HEIGHT;
    this.reset();
  }

  reset() {
    this.player = new Player(this.width / 2, this.height / 2);
    this.upgrades = new UpgradeManager();
    this.enemies = [];
    this.bolts = [];
    this.enemyProjectiles = [];
    this.shards = [];
    this.particles = [];
    this.floatingTexts = [];
    this.boss = null;
    
    this.time = 0;
    this.kills = 0;
    this.totalShardsCollected = 0;
    this.gameOver = false;
    this.victory = false;
    this.paused = false;
    this.levelingUp = false;
    this.currentCards = [];
    this.screenShake = 0;

    this.spawnTimer = 0;
    this.mouseMoved = false;
    this.lastMouseX = 0;
    this.lastMouseY = 0;
  }

  update(dt, input) {
    if (this.paused || this.gameOver || this.victory || this.levelingUp) {
      return;
    }

    if (this.screenShake > 0) {
      this.screenShake = Math.max(0, this.screenShake - dt * 5);
    }

    this.time += dt;

    // Check mouse movement to determine aiming mode
    if (Math.abs(input.mouseX - this.lastMouseX) > 1 || Math.abs(input.mouseY - this.lastMouseY) > 1) {
      this.mouseMoved = true;
    }
    this.lastMouseX = input.mouseX;
    this.lastMouseY = input.mouseY;

    // Update player
    this.player.update(dt, input, this.width, this.height);

    // Flare Burst (Space or click with flare charge)
    if ((input.isPressed('Space') || input.consumeClick()) && this.player.flareCharges > 0 && this.player.flareCooldown <= 0) {
      if (!this.isClickingUI(input)) {
        this.player.flareCharges--;
        this.player.flareCooldown = CONFIG.FLARE.cooldown;
        this.audio.playFlare();
        this.screenShake = 0.4;

        // Flare burst particles & damage
        for (let i = 0; i < 30; i++) {
          const angle = Math.random() * Math.PI * 2;
          const speed = 100 + Math.random() * 200;
          this.particles.push(new Particle(this.player.x, this.player.y, '#64ffda', 4, Math.cos(angle) * speed, Math.sin(angle) * speed, 0.4));
        }

        const flareR = CONFIG.FLARE.radius;
        const flareD = CONFIG.FLARE.damage;

        // Damage enemies
        this.enemies.forEach(e => {
          if (Math.hypot(e.x - this.player.x, e.y - this.player.y) <= flareR + e.radius) {
            e.hp -= flareD;
            e.flashTimer = 0.15;
            this.floatingTexts.push(new FloatingText(e.x, e.y - 10, flareD, '#64ffda'));
            if (e.hp <= 0 && e.active) {
              e.active = false;
              this.onEnemyDeath(e);
            }
          }
        });

        // Damage boss if alive
        if (this.boss && this.boss.active) {
          if (Math.hypot(this.boss.x - this.player.x, this.boss.y - this.player.y) <= flareR + this.boss.radius) {
            this.boss.hp -= flareD;
            this.boss.flashTimer = 0.15;
            this.audio.playHit();
            this.floatingTexts.push(new FloatingText(this.boss.x, this.boss.y - 20, flareD, '#64ffda'));
            if (this.boss.hp <= 0) {
              this.boss.active = false;
              this.onBossDeath();
            }
          }
        }
      }
    }

    // Firing Bolts
    const bonuses = this.upgrades.getStatBonuses();
    const effectiveInterval = CONFIG.BOLT.fireInterval * bonuses.fireIntervalMult;
    this.player.fireTimer -= dt;
    if (this.player.fireTimer <= 0) {
      this.player.fireTimer = effectiveInterval;
      this.audio.playShoot();

      let targetX = input.mouseX;
      let targetY = input.mouseY;

      if (!this.mouseMoved || (targetX === 640 && targetY === 360)) {
        // Aim at nearest enemy or boss if mouse hasn't moved
        let nearest = this.getNearestEnemy();
        if (nearest) {
          targetX = nearest.x;
          targetY = nearest.y;
        }
      }

      const baseAngle = Math.atan2(targetY - this.player.y, targetX - this.player.x);
      const boltDmg = CONFIG.BOLT.damage * bonuses.damageMult;
      const extraBolts = bonuses.extraBolts;
      const totalBolts = 1 + extraBolts;

      for (let i = 0; i < totalBolts; i++) {
        let spread = (i - (totalBolts - 1) / 2) * 0.12;
        let angle = baseAngle + spread;
        let vx = Math.cos(angle) * CONFIG.BOLT.speed;
        let vy = Math.sin(angle) * CONFIG.BOLT.speed;
        this.bolts.push(new Bolt(this.player.x, this.player.y, vx, vy, boltDmg, 0, bonuses.chainCount));
      }
    }

    // Spawning enemies (stops if boss is spawned)
    if (this.time < CONFIG.ENEMIES.boss.spawnTime) {
      this.spawnTimer -= dt;
      let progress = Math.min(1, this.time / CONFIG.ENEMIES.boss.spawnTime);
      let currentInterval = 1.1 - (1.1 - 0.35) * progress;
      let batchSize = 1 + Math.floor(progress * 3);

      if (this.spawnTimer <= 0 && this.enemies.length < 70) {
        this.spawnTimer = currentInterval;
        for (let b = 0; b < batchSize; b++) {
          this.spawnRandomEnemy();
        }
      }
    } else if (!this.boss && this.time >= CONFIG.ENEMIES.boss.spawnTime) {
      // Spawn Boss
      this.boss = new Boss(this.width / 2, -100);
      this.audio.playBossSpawn();
    }

    // Update enemies
    const waveMul = Math.pow(1.06, this.time / 30);
    this.enemies.forEach(e => {
      e.update(dt, this.player.x, this.player.y, (px, py, ang, dmg) => {
        this.enemyProjectiles.push(new EnemyProjectile(px, py, ang, 240, dmg));
      });
    });

    // Update boss
    if (this.boss && this.boss.active) {
      this.boss.update(dt, this.player.x, this.player.y, (px, py, ang, dmg, isFast) => {
        this.enemyProjectiles.push(new EnemyProjectile(px, py, ang, isFast ? 300 : 240, dmg));
      }, (px, py, count) => {
        for (let i = 0; i < count; i++) {
          let ang = (i / count) * Math.PI * 2;
          this.enemies.push(new Enemy(px + Math.cos(ang) * 30, py + Math.sin(ang) * 30, 'mote', false, waveMul));
        }
      });
    }

    // Update bolts
    this.bolts.forEach(b => {
      b.update(dt);
      if (!b.active) return;

      // Check collision with boss
      if (this.boss && this.boss.active) {
        if (Math.hypot(b.x - this.boss.x, b.y - this.boss.y) <= b.radius + this.boss.radius) {
          b.active = false;
          this.boss.hp -= b.damage;
          this.boss.flashTimer = 0.1;
          this.audio.playHit();
          this.floatingTexts.push(new FloatingText(this.boss.x, this.boss.y - 20, Math.round(b.damage), '#ffeb3b'));
          if (this.boss.hp <= 0) {
            this.boss.active = false;
            this.onBossDeath();
          }
          return;
        }
      }

      // Check collision with enemies
      for (let e of this.enemies) {
        if (!e.active || b.hitEnemies.has(e)) continue;
        if (Math.hypot(b.x - e.x, b.y - e.y) <= b.radius + e.radius) {
          b.hitEnemies.add(e);
          b.active = false;
          e.hp -= b.damage;
          e.flashTimer = 0.1;
          this.audio.playHit();
          this.floatingTexts.push(new FloatingText(e.x, e.y - 10, Math.round(b.damage), '#ffeb3b'));

          if (e.hp <= 0) {
            e.active = false;
            this.onEnemyDeath(e);
          }

          // Chain Spark effect
          if (b.chain > 0) {
            let nextE = this.getNearestEnemyTo(e.x, e.y, b.hitEnemies);
            if (nextE) {
              let angle = Math.atan2(nextE.y - e.y, nextE.x - e.x);
              let vx = Math.cos(angle) * CONFIG.BOLT.speed;
              let vy = Math.sin(angle) * CONFIG.BOLT.speed;
              let chainedBolt = new Bolt(e.x, e.y, vx, vy, b.damage * 0.7, 0, b.chain - 1);
              chainedBolt.hitEnemies = new Set(b.hitEnemies);
              this.bolts.push(chainedBolt);
            }
          }
          break;
        }
      }
    });

    // Update enemy projectiles
    this.enemyProjectiles.forEach(p => {
      p.update(dt);
      if (p.active && this.player.invulnTimer <= 0) {
        if (Math.hypot(p.x - this.player.x, p.y - this.player.y) <= p.radius + this.player.radius) {
          p.active = false;
          this.damagePlayer(p.damage);
        }
      }
    });

    // Update shards (magnet pull)
    this.shards.forEach(s => {
      if (!s.active) return;
      const dist = Math.hypot(s.x - this.player.x, s.y - this.player.y);
      if (dist <= this.player.magnetRadius) {
        let angle = Math.atan2(this.player.y - s.y, this.player.x - s.x);
        let pullSpeed = 450;
        s.x += Math.cos(angle) * pullSpeed * dt;
        s.y += Math.sin(angle) * pullSpeed * dt;
      }

      if (dist <= this.player.radius + s.radius) {
        s.active = false;
        this.audio.playShard();
        this.totalShardsCollected += s.value;
        const leveledUp = this.player.addXp(s.value);
        if (leveledUp) {
          this.triggerLevelUp();
        }
      }
    });

    // Wisps orbit update
    const wispsCount = bonuses.wisps;
    if (wispsCount > 0) {
      const wispAngleBase = this.time * 3;
      for (let i = 0; i < wispsCount; i++) {
        const wAngle = wispAngleBase + (i / wispsCount) * Math.PI * 2;
        const wx = this.player.x + Math.cos(wAngle) * 50;
        const wy = this.player.y + Math.sin(wAngle) * 50;

        this.enemies.forEach(e => {
          if (e.active && Math.hypot(wx - e.x, wy - e.y) <= 15 + e.radius) {
            e.hp -= 20 * dt;
            e.flashTimer = 0.1;
            if (e.hp <= 0 && e.active) {
              e.active = false;
              this.onEnemyDeath(e);
            }
          }
        });
      }
    }

    // Player contact damage with enemies & boss
    if (this.player.invulnTimer <= 0) {
      this.enemies.forEach(e => {
        if (e.active && Math.hypot(e.x - this.player.x, e.y - this.player.y) <= e.radius + this.player.radius) {
          this.damagePlayer(e.contactDmg);
        }
      });

      if (this.boss && this.boss.active) {
        if (Math.hypot(this.boss.x - this.player.x, this.boss.y - this.player.y) <= this.boss.radius + this.player.radius) {
          this.damagePlayer(this.boss.contactDmg);
        }
      }
    }

    // Cleanup inactive entities
    this.enemies = this.enemies.filter(e => e.active);
    this.bolts = this.bolts.filter(b => b.active);
    this.enemyProjectiles = this.enemyProjectiles.filter(p => p.active);
    this.shards = this.shards.filter(s => s.active);
    this.particles.forEach(p => p.update(dt));
    this.particles = this.particles.filter(p => p.life > 0);
    this.floatingTexts.forEach(t => t.update(dt));
    this.floatingTexts = this.floatingTexts.filter(t => t.life > 0);
  }

  damagePlayer(amount) {
    const bonuses = this.upgrades.getStatBonuses();
    const finalDmg = Math.round(amount * bonuses.damageReduction);
    this.player.health -= finalDmg;
    this.player.invulnTimer = CONFIG.PLAYER.invulnTime;
    this.screenShake = 0.5;
    this.audio.playHurt();
    this.floatingTexts.push(new FloatingText(this.player.x, this.player.y - 20, `-${finalDmg}`, '#ff5252'));

    if (this.player.health <= 0) {
      this.player.health = 0;
      this.gameOver = true;
      this.audio.playDefeat();
    }
  }

  onEnemyDeath(e) {
    this.kills++;
    this.audio.playDeath();
    for (let i = 0; i < 8; i++) {
      let ang = Math.random() * Math.PI * 2;
      let spd = 50 + Math.random() * 100;
      this.particles.push(new Particle(e.x, e.y, e.isElite ? '#ffeb3b' : '#ab47bc', 3, Math.cos(ang) * spd, Math.sin(ang) * spd, 0.4));
    }
    this.shards.push(new Shard(e.x, e.y, e.shards));
  }

  onBossDeath() {
    this.victory = true;
    this.audio.playVictory();
    for (let i = 0; i < 50; i++) {
      let ang = Math.random() * Math.PI * 2;
      let spd = 100 + Math.random() * 300;
      this.particles.push(new Particle(this.boss.x, this.boss.y, '#64ffda', 5, Math.cos(ang) * spd, Math.sin(ang) * spd, 1.0));
    }
    for (let i = 0; i < 20; i++) {
      this.shards.push(new Shard(this.boss.x + (Math.random() - 0.5) * 60, this.boss.y + (Math.random() - 0.5) * 60, 5));
    }
  }

  spawnRandomEnemy() {
    let types = ['mote'];
    if (this.time >= CONFIG.ENEMIES.skitter.start) types.push('skitter');
    if (this.time >= CONFIG.ENEMIES.spitter.start) types.push('spitter');
    if (this.time >= CONFIG.ENEMIES.brute.start) types.push('brute');

    let type = types[Math.floor(Math.random() * types.length)];
    let isElite = this.time >= CONFIG.ENEMIES.eliteStart && Math.random() < 0.12;

    // Spawn around player outside screen or at edge
    let angle = Math.random() * Math.PI * 2;
    let dist = 700 + Math.random() * 200;
    let x = this.player.x + Math.cos(angle) * dist;
    let y = this.player.y + Math.sin(angle) * dist;

    x = Math.max(50, Math.min(this.width - 50, x));
    y = Math.max(50, Math.min(this.height - 50, y));

    const waveMul = Math.pow(1.06, this.time / 30);
    this.enemies.push(new Enemy(x, y, type, isElite, waveMul));
  }

  getNearestEnemy() {
    let nearest = null;
    let minDist = Infinity;
    this.enemies.forEach(e => {
      let d = Math.hypot(e.x - this.player.x, e.y - this.player.y);
      if (d < minDist) {
        minDist = d;
        nearest = e;
      }
    });
    if (this.boss && this.boss.active) {
      let d = Math.hypot(this.boss.x - this.player.x, this.boss.y - this.player.y);
      if (d < minDist) {
        nearest = this.boss;
      }
    }
    return nearest;
  }

  getNearestEnemyTo(x, y, excludeSet) {
    let nearest = null;
    let minDist = Infinity;
    this.enemies.forEach(e => {
      if (!e.active || excludeSet.has(e)) return;
      let d = Math.hypot(e.x - x, e.y - y);
      if (d < minDist) {
        minDist = d;
        nearest = e;
      }
    });
    return nearest;
  }

  triggerLevelUp() {
    this.levelingUp = true;
    this.audio.playLevelUp();
    this.currentCards = this.upgrades.getAvailableUpgrades();
  }

  chooseUpgrade(index) {
    if (!this.levelingUp || index < 0 || index >= this.currentCards.length) return;
    const card = this.currentCards[index];
    this.upgrades.applyUpgrade(card.id, this.player);
    this.levelingUp = false;
    this.currentCards = [];
  }

  isClickingUI(input) {
    // Check if click is on buttons during play (pause button, etc.)
    return false;
  }
}
