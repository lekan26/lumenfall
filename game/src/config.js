export const CONFIG = {
  WIDTH: 1280,
  HEIGHT: 720,
  PLAYER: {
    maxHealth: 60,
    speed: 230,
    radius: 14,
    invulnTime: 0.4,
  },
  BOLT: {
    damage: 12,
    speed: 520,
    fireInterval: 0.38,
    lifetime: 0.9,
    radius: 5,
  },
  FLARE: {
    damage: 40,
    radius: 190,
    cooldown: 1.5,
    maxCharges: 3,
    startCharges: 1,
  },
  MAGNET: {
    baseRadius: 70,
  },
  XP: {
    base: 6,
    increment: 4,
  },
  ENEMIES: {
    mote: { hp: 15, speed: 110, radius: 10, contact: 12, shards: 1, start: 0 },
    skitter: { hp: 10, speed: 190, radius: 8, contact: 10, shards: 1, start: 30 },
    spitter: { hp: 25, speed: 85, radius: 12, contact: 12, projDmg: 12, range: 350, interval: 2.5, shards: 2, start: 60 },
    brute: { hp: 100, speed: 70, radius: 20, contact: 22, shards: 5, start: 60 },
    eliteMultiplier: 1.5,
    eliteStart: 90,
    boss: { hp: 900, speed: 90, radius: 35, contact: 25, spawnTime: 240, shards: 50 },
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
