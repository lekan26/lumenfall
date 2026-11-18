import { CONFIG } from './config.js';

export class UpgradeManager {
  constructor() {
    this.levels = {};
    CONFIG.UPGRADES.forEach(u => {
      this.levels[u.id] = 0;
    });
  }

  getLevel(id) {
    return this.levels[id] || 0;
  }

  isMaxed(id) {
    const cfg = CONFIG.UPGRADES.find(u => u.id === id);
    return cfg ? this.levels[id] >= cfg.max : true;
  }

  getAvailableUpgrades() {
    const available = CONFIG.UPGRADES.filter(u => !this.isMaxed(u.id));
    // Shuffle and pick up to 3
    for (let i = available.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [available[i], available[j]] = [available[j], available[i]];
    }
    return available.slice(0, 3);
  }

  applyUpgrade(id, player) {
    if (this.isMaxed(id)) return;
    this.levels[id] = (this.levels[id] || 0) + 1;

    switch (id) {
      case 'swift':
        player.speed = CONFIG.PLAYER.speed * (1 + 0.12 * this.levels['swift']);
        break;
      case 'magnet':
        player.magnetRadius = CONFIG.MAGNET.baseRadius * (1 + 0.40 * this.levels['magnet']);
        break;
      case 'flare':
        player.maxFlareCharges = CONFIG.FLARE.maxCharges + this.levels['flare'];
        player.flareCharges = player.maxFlareCharges;
        break;
      case 'vital':
        player.maxHealth = CONFIG.PLAYER.maxHealth + 25 * this.levels['vital'];
        player.health = Math.min(player.maxHealth, player.health + 25);
        break;
      default:
        break;
    }
  }

  getStatBonuses() {
    return {
      extraBolts: this.getLevel('split'),
      fireIntervalMult: Math.pow(0.80, this.getLevel('rapid')), // 20% faster per level
      damageMult: 1 + 0.30 * this.getLevel('heavy'), // 30% more damage per level
      wisps: this.getLevel('wisp'),
      chainCount: this.getLevel('chain'),
      damageReduction: 1 - 0.15 * this.getLevel('thick'), // 15% less damage taken per level
    };
  }
}
