import { CONFIG } from './config.js';

export class Player {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.maxHealth = CONFIG.PLAYER.maxHealth;
    this.health = this.maxHealth;
    this.speed = CONFIG.PLAYER.speed;
    this.radius = CONFIG.PLAYER.radius;
    this.invulnTimer = 0;
    this.trail = [];
    this.level = 1;
    this.xp = 0;
    this.nextXp = CONFIG.XP.base;
    this.flareCharges = CONFIG.FLARE.startCharges;
    this.maxFlareCharges = CONFIG.FLARE.maxCharges;
    this.flareCooldown = 0;
    this.fireTimer = 0;
    this.magnetRadius = CONFIG.MAGNET.baseRadius;
  }

  update(dt, input, worldWidth, worldHeight) {
    let dx = 0;
    let dy = 0;
    if (input.isDown('KeyW') || input.isDown('ArrowUp')) dy -= 1;
    if (input.isDown('KeyS') || input.isDown('ArrowDown')) dy += 1;
    if (input.isDown('KeyA') || input.isDown('ArrowLeft')) dx -= 1;
    if (input.isDown('KeyD') || input.isDown('ArrowRight')) dx += 1;

    if (dx !== 0 && dy !== 0) {
      dx *= 0.7071;
      dy *= 0.7071;
    }

    this.vx = dx * this.speed;
    this.vy = dy * this.speed;

    this.x += this.vx * dt;
    this.y += this.vy * dt;

    // Clamp inside arena with padding
    this.x = Math.max(this.radius, Math.min(worldWidth - this.radius, this.x));
    this.y = Math.max(this.radius, Math.min(worldHeight - this.radius, this.y));

    if (this.invulnTimer > 0) {
      this.invulnTimer -= dt;
    }
    if (this.flareCooldown > 0) {
      this.flareCooldown -= dt;
    }

    // Trail update
    this.trail.push({ x: this.x, y: this.y, life: 0.3 });
    for (let i = this.trail.length - 1; i >= 0; i--) {
      this.trail[i].life -= dt;
      if (this.trail[i].life <= 0) {
        this.trail.splice(i, 1);
      }
    }
  }

  addXp(amount) {
    this.xp += amount;
    let leveled = false;
    while (this.xp >= this.nextXp) {
      this.xp -= this.nextXp;
      this.level++;
      this.nextXp = Math.floor(CONFIG.XP.base + CONFIG.XP.increment * this.level);
      this.flareCharges = Math.min(this.maxFlareCharges, this.flareCharges + 1);
      leveled = true;
    }
    return leveled;
  }
}

export class Bolt {
  constructor(x, y, vx, vy, damage, pierce = 0, chain = 0) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.damage = damage;
    this.pierce = pierce;
    this.chain = chain;
    this.lifetime = CONFIG.BOLT.lifetime;
    this.radius = CONFIG.BOLT.radius;
    this.active = true;
    this.hitEnemies = new Set();
  }

  update(dt) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.lifetime -= dt;
    if (this.lifetime <= 0) {
      this.active = false;
    }
  }
}

export class Enemy {
  constructor(x, y, type, isElite = false, waveMultiplier = 1) {
    this.x = x;
    this.y = y;
    this.type = type;
    this.isElite = isElite;
    const cfg = CONFIG.ENEMIES[type];
    
    let hpMul = waveMultiplier * (isElite ? CONFIG.ENEMIES.eliteMultiplier : 1);
    let speedMul = (1 + (waveMultiplier - 1) * 0.6) * (isElite ? 1.2 : 1);

    this.maxHp = Math.round(cfg.hp * hpMul);
    this.hp = this.maxHp;
    this.speed = cfg.speed * speedMul;
    this.radius = cfg.radius * (isElite ? 1.3 : 1);
    this.contactDmg = Math.round(cfg.contact * (isElite ? 1.5 : 1));
    this.shards = cfg.shards * (isElite ? 4 : 1);
    
    this.vx = 0;
    this.vy = 0;
    this.flashTimer = 0;
    this.erraticAngle = Math.random() * Math.PI * 2;
    this.erraticTimer = 0;
    this.shootTimer = 0;
    this.range = cfg.range || 0;
    this.projDmg = cfg.projDmg || 0;
    this.interval = cfg.interval || 2;
    this.active = true;
  }

  update(dt, playerX, playerY, spawnProjectiles) {
    if (this.flashTimer > 0) this.flashTimer -= dt;

    const dx = playerX - this.x;
    const dy = playerY - this.y;
    const dist = Math.hypot(dx, dy);

    if (this.type === 'skitter') {
      this.erraticTimer -= dt;
      if (this.erraticTimer <= 0) {
        this.erraticTimer = 0.5 + Math.random() * 0.5;
        this.erraticAngle = Math.atan2(dy, dx) + (Math.random() - 0.5) * 1.5;
      }
      this.vx = Math.cos(this.erraticAngle) * this.speed;
      this.vy = Math.sin(this.erraticAngle) * this.speed;
    } else if (this.type === 'spitter') {
      // Keep distance around 350
      let targetDist = 350;
      let angle = Math.atan2(dy, dx);
      if (dist < targetDist - 30) {
        // move away
        this.vx = -Math.cos(angle) * this.speed;
        this.vy = -Math.sin(angle) * this.speed;
      } else if (dist > targetDist + 30) {
        // move closer
        this.vx = Math.cos(angle) * this.speed;
        this.vy = Math.sin(angle) * this.speed;
      } else {
        this.vx = 0;
        this.vy = 0;
      }

      this.shootTimer -= dt;
      if (this.shootTimer <= 0 && dist < 500) {
        this.shootTimer = this.interval;
        if (spawnProjectiles) {
          spawnProjectiles(this.x, this.y, angle, this.projDmg);
        }
      }
    } else {
      // Mote & Brute standard chaser
      if (dist > 1) {
        this.vx = (dx / dist) * this.speed;
        this.vy = (dy / dist) * this.speed;
      }
    }

    this.x += this.vx * dt;
    this.y += this.vy * dt;
  }
}

export class Boss {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    const cfg = CONFIG.ENEMIES.boss;
    this.maxHp = cfg.hp;
    this.hp = this.maxHp;
    this.speed = cfg.speed;
    this.radius = cfg.radius;
    this.contactDmg = cfg.contact;
    this.shards = cfg.shards;
    this.burstTimer = 6.0;
    this.summonTimer = 10.0;
    this.flashTimer = 0;
    this.active = true;
  }

  update(dt, playerX, playerY, spawnProjectiles, spawnMinions) {
    if (this.flashTimer > 0) this.flashTimer -= dt;

    const dx = playerX - this.x;
    const dy = playerY - this.y;
    const dist = Math.hypot(dx, dy);

    const isRaging = this.hp < this.maxHp * 0.5;
    const currentSpeed = isRaging ? this.speed * 1.35 : this.speed;

    if (dist > 1) {
      this.x += (dx / dist) * currentSpeed * dt;
      this.y += (dy / dist) * currentSpeed * dt;
    }

    const burstInterval = isRaging ? 4.0 : 6.0;
    this.burstTimer -= dt;
    if (this.burstTimer <= 0) {
      this.burstTimer = burstInterval;
      if (spawnProjectiles) {
        const count = 12;
        for (let i = 0; i < count; i++) {
          const angle = (i / count) * Math.PI * 2;
          spawnProjectiles(this.x, this.y, angle, 12, true);
        }
      }
    }

    this.summonTimer -= dt;
    if (this.summonTimer <= 0) {
      this.summonTimer = 10.0;
      if (spawnMinions) {
        spawnMinions(this.x, this.y, 3);
      }
    }
  }
}

export class EnemyProjectile {
  constructor(x, y, angle, speed = 240, damage = 8) {
    this.x = x;
    this.y = y;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.damage = damage;
    this.radius = 6;
    this.lifetime = 4.0;
    this.active = true;
  }

  update(dt) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.lifetime -= dt;
    if (this.lifetime <= 0) this.active = false;
  }
}

export class Shard {
  constructor(x, y, value = 1) {
    this.x = x;
    this.y = y;
    this.value = value;
    this.radius = 6;
    this.active = true;
  }
}

export class Particle {
  constructor(x, y, color, size, vx, vy, maxLife = 0.5) {
    this.x = x;
    this.y = y;
    this.color = color;
    this.size = size;
    this.vx = vx;
    this.vy = vy;
    this.life = maxLife;
    this.maxLife = maxLife;
  }

  update(dt) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.life -= dt;
  }
}

export class FloatingText {
  constructor(x, y, text, color) {
    this.x = x;
    this.y = y;
    this.text = text;
    this.color = color;
    this.vy = -40;
    this.life = 0.8;
    this.maxLife = 0.8;
  }

  update(dt) {
    this.y += this.vy * dt;
    this.life -= dt;
  }
}
