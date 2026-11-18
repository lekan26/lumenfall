export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.stars = [];
    for (let i = 0; i < 150; i++) {
      this.stars.push({
        x: Math.random() * 1280,
        y: Math.random() * 720,
        size: Math.random() * 1.5 + 0.5,
        alpha: Math.random() * 0.7 + 0.3
      });
    }
  }

  resize() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    this.canvas.width = 1280;
    this.canvas.height = 720;
    this.canvas.style.width = width + 'px';
    this.canvas.style.height = height + 'px';
  }

  clear() {
    this.ctx.fillStyle = '#0b0e14';
    this.ctx.fillRect(0, 0, 1280, 720);
  }

  drawStarfield() {
    const ctx = this.ctx;
    ctx.save();
    this.stars.forEach(s => {
      ctx.fillStyle = `rgba(100, 255, 218, ${s.alpha})`;
      ctx.fillRect(s.x, s.y, s.size, s.size);
    });

    // Grid lines for hollow arena aesthetic
    ctx.strokeStyle = 'rgba(106, 27, 154, 0.15)';
    ctx.lineWidth = 1;
    const gridSize = 80;
    for (let x = 0; x <= 1280; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 720);
      ctx.stroke();
    }
    for (let y = 0; y <= 720; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(1280, y);
      ctx.stroke();
    }
    ctx.restore();
  }

  drawWorld(world) {
    const ctx = this.ctx;
    ctx.save();

    // Screen shake
    if (world.screenShake > 0) {
      const offsetX = (Math.random() - 0.5) * world.screenShake * 20;
      const offsetY = (Math.random() - 0.5) * world.screenShake * 20;
      ctx.translate(offsetX, offsetY);
    }

    this.drawStarfield();

    // Shards
    world.shards.forEach(s => {
      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.fillStyle = '#64ffda';
      ctx.shadowColor = '#64ffda';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.moveTo(0, -s.radius);
      ctx.lineTo(s.radius, 0);
      ctx.lineTo(0, s.radius);
      ctx.lineTo(-s.radius, 0);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    });

    // Particles
    world.particles.forEach(p => {
      ctx.save();
      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.life / p.maxLife;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    // Enemies
    world.enemies.forEach(e => {
      ctx.save();
      ctx.translate(e.x, e.y);
      if (e.flashTimer > 0) {
        ctx.fillStyle = '#ffffff';
      } else if (e.isElite) {
        ctx.fillStyle = '#ffeb3b';
      } else {
        ctx.fillStyle = e.type === 'skitter' ? '#00e5ff' : e.type === 'spitter' ? '#ff4081' : e.type === 'brute' ? '#7b1fa2' : '#9c27b0';
      }

      ctx.shadowColor = e.isElite ? '#ffeb3b' : '#ab47bc';
      ctx.shadowBlur = e.isElite ? 12 : 6;

      ctx.beginPath();
      if (e.type === 'skitter') {
        ctx.moveTo(0, -e.radius);
        ctx.lineTo(e.radius, e.radius);
        ctx.lineTo(-e.radius, e.radius);
      } else if (e.type === 'spitter') {
        ctx.arc(0, 0, e.radius, 0, Math.PI * 2);
      } else if (e.type === 'brute') {
        ctx.rect(-e.radius, -e.radius, e.radius * 2, e.radius * 2);
      } else {
        ctx.arc(0, 0, e.radius, 0, Math.PI * 2);
      }
      ctx.fill();

      if (e.isElite) {
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
      ctx.restore();
    });

    // Boss
    if (world.boss && world.boss.active) {
      const b = world.boss;
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.fillStyle = b.flashTimer > 0 ? '#ffffff' : '#e040fb';
      ctx.shadowColor = '#e040fb';
      ctx.shadowBlur = 20;
      ctx.beginPath();
      ctx.arc(0, 0, b.radius, 0, Math.PI * 2);
      ctx.fill();

      // Crown / inner core
      ctx.fillStyle = '#ffeb3b';
      ctx.beginPath();
      ctx.arc(0, 0, b.radius * 0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Enemy Projectiles
    world.enemyProjectiles.forEach(p => {
      ctx.save();
      ctx.fillStyle = '#ff4081';
      ctx.shadowColor = '#ff4081';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    // Player Trail
    world.player.trail.forEach(t => {
      ctx.save();
      ctx.fillStyle = 'rgba(255, 235, 59, ' + (t.life / 0.3 * 0.4) + ')';
      ctx.beginPath();
      ctx.arc(t.x, t.y, world.player.radius * 0.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    // Player
    const p = world.player;
    ctx.save();
    ctx.translate(p.x, p.y);
    if (p.invulnTimer > 0 && Math.floor(p.invulnTimer * 20) % 2 === 0) {
      ctx.globalAlpha = 0.5;
    }
    ctx.fillStyle = '#ffeb3b';
    ctx.shadowColor = '#ffeb3b';
    ctx.shadowBlur = 15;
    ctx.beginPath();
    ctx.arc(0, 0, p.radius, 0, Math.PI * 2);
    ctx.fill();

    // Inner bright core
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(0, 0, p.radius * 0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Bolts
    world.bolts.forEach(b => {
      ctx.save();
      ctx.fillStyle = '#ffeb3b';
      ctx.shadowColor = '#ffeb3b';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    // Floating text
    world.floatingTexts.forEach(ft => {
      ctx.save();
      ctx.font = 'bold 16px monospace';
      ctx.fillStyle = ft.color;
      ctx.globalAlpha = ft.life / ft.maxLife;
      ctx.textAlign = 'center';
      ctx.fillText(ft.text, ft.x, ft.y);
      ctx.restore();
    });

    ctx.restore();
    this.drawHUD(world);
  }

  drawHUD(world) {
    const ctx = this.ctx;
    ctx.save();

    // Health Bar
    ctx.fillStyle = 'rgba(20, 24, 33, 0.8)';
    ctx.fillRect(30, 25, 220, 20);
    const hpRatio = Math.max(0, world.player.health / world.player.maxHealth);
    ctx.fillStyle = '#ff5252';
    ctx.fillRect(30, 25, 220 * hpRatio, 20);
    ctx.strokeStyle = '#64ffda';
    ctx.lineWidth = 2;
    ctx.strokeRect(30, 25, 220, 20);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`HP: ${Math.round(world.player.health)} / ${world.player.maxHealth}`, 40, 40);

    // XP Bar
    ctx.fillStyle = 'rgba(20, 24, 33, 0.8)';
    ctx.fillRect(270, 25, 740, 14);
    const xpRatio = Math.min(1, world.player.xp / world.player.nextXp);
    ctx.fillStyle = '#64ffda';
    ctx.fillRect(270, 25, 740 * xpRatio, 14);
    ctx.strokeStyle = '#ffeb3b';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(270, 25, 740, 14);

    ctx.fillStyle = '#0b0e14';
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`LEVEL ${world.player.level} (XP: ${world.player.xp} / ${world.player.nextXp})`, 640, 37);

    // Stats top right: Time, Kills, Shards
    ctx.textAlign = 'right';
    ctx.font = 'bold 16px monospace';
    ctx.fillStyle = '#ffeb3b';
    const mins = Math.floor(world.time / 60).toString().padStart(2, '0');
    const secs = Math.floor(world.time % 60).toString().padStart(2, '0');
    ctx.fillText(`TIME: ${mins}:${secs}`, 1250, 40);
    ctx.fillStyle = '#ab47bc';
    ctx.fillText(`KILLS: ${world.kills}`, 1250, 65);
    ctx.fillStyle = '#64ffda';
    ctx.fillText(`SHARDS: ${world.totalShardsCollected}`, 1250, 90);

    // Flare charges (bottom center)
    ctx.textAlign = 'center';
    ctx.font = 'bold 14px monospace';
    ctx.fillStyle = '#64ffda';
    let flareText = `FLARE BURST: `;
    for (let i = 0; i < world.player.maxFlareCharges; i++) {
      flareText += i < world.player.flareCharges ? '● ' : '○ ';
    }
    if (world.player.flareCooldown > 0) {
      flareText += `(${world.player.flareCooldown.toFixed(1)}s)`;
    }
    ctx.fillText(flareText, 640, 690);

    // Boss Health Bar if Boss exists
    if (world.boss && world.boss.active) {
      ctx.fillStyle = 'rgba(20, 24, 33, 0.9)';
      ctx.fillRect(340, 65, 600, 24);
      const bossRatio = Math.max(0, world.boss.hp / world.boss.maxHp);
      ctx.fillStyle = '#e040fb';
      ctx.fillRect(340, 65, 600 * bossRatio, 24);
      ctx.strokeStyle = '#ffeb3b';
      ctx.lineWidth = 2;
      ctx.strokeRect(340, 65, 600, 24);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 14px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`VOID MATRIARCH - HP: ${Math.max(0, Math.round(world.boss.hp))} / ${world.boss.maxHp}`, 640, 82);
    }

    ctx.restore();
  }

  drawTitleScreen(bestTime) {
    const ctx = this.ctx;
    this.clear();
    this.drawStarfield();

    ctx.save();
    ctx.textAlign = 'center';
    ctx.shadowColor = '#ffeb3b';
    ctx.shadowBlur = 25;

    ctx.fillStyle = '#ffeb3b';
    ctx.font = 'bold 64px monospace';
    ctx.fillText('LUMENFALL', 640, 220);

    ctx.shadowBlur = 10;
    ctx.fillStyle = '#64ffda';
    ctx.font = '20px monospace';
    ctx.fillText('Survive the Hollow, gather lumen shards, and defeat the Void Matriarch', 640, 280);

    ctx.fillStyle = '#ffffff';
    ctx.font = '16px monospace';
    ctx.fillText('CONTROLS: WASD / Arrow Keys to Move | Mouse to Aim | Auto-Fire', 640, 350);
    ctx.fillText('Space or Click: Flare Burst Nova | P / Esc: Pause | M: Mute', 640, 385);

    const mins = Math.floor(bestTime / 60).toString().padStart(2, '0');
    const secs = Math.floor(bestTime % 60).toString().padStart(2, '0');
    ctx.fillStyle = '#ffeb3b';
    ctx.fillText(`BEST SURVIVAL TIME: ${mins}:${secs}`, 640, 440);

    // Start Button
    ctx.fillStyle = '#64ffda';
    ctx.shadowColor = '#64ffda';
    ctx.shadowBlur = 15;
    ctx.fillRect(520, 500, 240, 60);

    ctx.fillStyle = '#0b0e14';
    ctx.font = 'bold 24px monospace';
    ctx.fillText('START GAME', 640, 538);

    ctx.restore();
  }

  drawPauseScreen() {
    const ctx = this.ctx;
    ctx.fillStyle = 'rgba(11, 14, 20, 0.85)';
    ctx.fillRect(0, 0, 1280, 720);

    ctx.save();
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffeb3b';
    ctx.font = 'bold 48px monospace';
    ctx.shadowColor = '#ffeb3b';
    ctx.shadowBlur = 15;
    ctx.fillText('PAUSED', 640, 300);

    ctx.fillStyle = '#ffffff';
    ctx.font = '20px monospace';
    ctx.fillText('Press P or Esc to Resume', 640, 380);
    ctx.restore();
  }

  drawLevelUpScreen(cards) {
    const ctx = this.ctx;
    ctx.fillStyle = 'rgba(11, 14, 20, 0.9)';
    ctx.fillRect(0, 0, 1280, 720);

    ctx.save();
    ctx.textAlign = 'center';
    ctx.fillStyle = '#64ffda';
    ctx.font = 'bold 40px monospace';
    ctx.shadowColor = '#64ffda';
    ctx.shadowBlur = 20;
    ctx.fillText('CHOOSE AN UPGRADE', 640, 140);

    ctx.font = '16px monospace';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('Click a card or press 1, 2, or 3', 640, 180);

    const cardWidth = 320;
    const cardHeight = 360;
    const spacing = 40;
    const totalWidth = 3 * cardWidth + 2 * spacing;
    const startX = (1280 - totalWidth) / 2;

    cards.forEach((card, i) => {
      const cx = startX + i * (cardWidth + spacing);
      const cy = 230;

      ctx.fillStyle = 'rgba(20, 24, 33, 0.95)';
      ctx.shadowColor = '#ffeb3b';
      ctx.shadowBlur = 10;
      ctx.fillRect(cx, cy, cardWidth, cardHeight);
      ctx.strokeStyle = '#ffeb3b';
      ctx.lineWidth = 2;
      ctx.strokeRect(cx, cy, cardWidth, cardHeight);

      ctx.fillStyle = '#ffeb3b';
      ctx.font = 'bold 22px monospace';
      ctx.fillText(`[${i + 1}]`, cx + cardWidth / 2, cy + 50);

      ctx.fillStyle = '#64ffda';
      ctx.font = 'bold 20px monospace';
      ctx.fillText(card.name, cx + cardWidth / 2, cy + 120);

      ctx.fillStyle = '#ffffff';
      ctx.font = '16px monospace';
      // Word wrap description
      ctx.fillText(card.desc, cx + cardWidth / 2, cy + 200);

      ctx.fillStyle = 'rgba(100, 255, 218, 0.2)';
      ctx.fillRect(cx + 40, cy + 280, cardWidth - 80, 45);
      ctx.fillStyle = '#64ffda';
      ctx.font = 'bold 16px monospace';
      ctx.fillText('CHOOSE', cx + cardWidth / 2, cy + 308);
    });

    ctx.restore();
  }

  drawEndScreen(world, isVictory) {
    const ctx = this.ctx;
    this.clear();
    this.drawStarfield();

    ctx.save();
    ctx.textAlign = 'center';
    ctx.shadowColor = isVictory ? '#64ffda' : '#ff5252';
    ctx.shadowBlur = 25;

    ctx.fillStyle = isVictory ? '#64ffda' : '#ff5252';
    ctx.font = 'bold 56px monospace';
    ctx.fillText(isVictory ? 'VICTORY!' : 'GAME OVER', 640, 180);

    ctx.shadowBlur = 10;
    ctx.fillStyle = '#ffffff';
    ctx.font = '22px monospace';
    const mins = Math.floor(world.time / 60).toString().padStart(2, '0');
    const secs = Math.floor(world.time % 60).toString().padStart(2, '0');

    ctx.fillText(`Survival Time: ${mins}:${secs}`, 640, 270);
    ctx.fillText(`Level Reached: ${world.player.level}`, 640, 315);
    ctx.fillText(`Enemies Defeated: ${world.kills}`, 640, 360);
    ctx.fillText(`Shards Collected: ${world.totalShardsCollected}`, 640, 405);

    // Play Again Button
    ctx.fillStyle = '#ffeb3b';
    ctx.shadowColor = '#ffeb3b';
    ctx.shadowBlur = 15;
    ctx.fillRect(520, 480, 240, 60);

    ctx.fillStyle = '#0b0e14';
    ctx.font = 'bold 24px monospace';
    ctx.fillText('PLAY AGAIN', 640, 518);

    ctx.restore();
  }
}
