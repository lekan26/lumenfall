export const CONFIG = {
  WIDTH: 1280,
  HEIGHT: 720,
  PLAYER: {
    maxHealth: 120,
    speed: 260,
    radius: 14,
    invulnTime: 0.8,
  },
  BOLT: {
    damage: 16,
    speed: 560,
    fireInterval: 0.32,
    lifetime: 1.0,
    radius: 5,
  },
  FLARE: {
    damage: 50,
    radius: 220,
    cooldown: 1.2,
    maxCharges: 3,
    startCharges: 2,
  },
  MAGNET: {
    baseRadius: 120,
  },
  XP: {
    base: 5,
    increment: 3,
  },
  ENEMIES: {
    mote: { hp: 12, speed: 90, radius: 10, contact: 6, shards: 1, start: 0 },
    skitter: { hp: 8, speed: 150, radius: 8, contact: 5, shards: 1, start: 30 },
    spitter: { hp: 20, speed: 70, radius: 12, contact: 6, projDmg: 6, range: 350, interval: 2.5, shards: 2, start: 60 },
    brute: { hp: 90, speed: 55, radius: 20, contact: 12, shards: 5, start: 60 },
    eliteMultiplier: 1.4,
    eliteStart: 90,
    boss: { hp: 600, speed: 80, radius: 35, contact: 15, spawnTime: 240, shards: 50 },
  },
  UPGRADES: [
    { id: 'split', name: 'Split Shot', desc: 'One extra bolt per shot', max: 4 },
    { id: 'rapid', name: 'Rapid Light', desc: '20% faster fire rate', max: 5 },
    { id: 'heavy', name: 'Heavy Lumen', desc: '30% more bolt damage', max: 5 },
    { id: 'swift', name: 'Swift Step', desc: '12% more move speed', max: 4 },
    { id: 'magnet', name: 'Magnet Heart', desc: '40% larger pickup radius', max: 5 },
    { id: 'wisp', name: 'Wisp Orbit', desc: 'Add contact orbiting wisp', max: 3 },
    { id: 'flare', name: 'Flare Charge', desc: '+1 max flare charge & refill', max: 3 },
    { id: 'vital', name: 'Vital Ember', desc: '+25 max health & heal 25', max: 4 },
    { id: 'chain', name: 'Chain Spark', desc: 'Bolts chain to nearby enemy', max: 3 },
    { id: 'thick', name: 'Thick Skin', desc: '15% less damage taken', max: 4 },
  ]
};
