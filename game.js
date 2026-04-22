const canvas = document.getElementById('c');
const ctx = canvas.getContext('2d');

// -------------------------
// Basic setup
// -------------------------
const DPR = () => Math.min(window.devicePixelRatio || 1, 2);
function resize() {
  const dpr = DPR();
  canvas.width = Math.floor(window.innerWidth * dpr);
  canvas.height = Math.floor(window.innerHeight * dpr);
  canvas.style.width = window.innerWidth + 'px';
  canvas.style.height = window.innerHeight + 'px';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
window.addEventListener('resize', resize);
resize();

const TAU = Math.PI * 2;
const rand = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const dist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);

// -------------------------
// Assets
// -------------------------
const assets = {};
const assetList = {
  brishStrip: 'sprites/brish-strip.png',
  monkoStrip: 'sprites/monko-strip.png',
  brish: 'sprites/brish.png',
  monko: 'sprites/monko.png',
  brishCar: 'sprites/brish-car.png',
  monkoCar: 'sprites/monko-car.png'
};
let loadedAssets = 0;
const totalAssets = Object.keys(assetList).length;
for (const [key, src] of Object.entries(assetList)) {
  const img = new Image();
  img.onload = () => loadedAssets++;
  img.onerror = () => loadedAssets++;
  img.src = src;
  assets[key] = img;
}

// -------------------------
// Theme / content
// -------------------------
const heroes = {
  brish: {
    name: 'Brish',
    accent: '#ff8a65',
    accent2: '#ffca28',
    autoAttackLabel: 'Punch',
    powerLabel: 'Mega Slam',
    specialLabel: 'Car Charge',
    baseSpeed: 3.5,
    maxHp: 140
  },
  monko: {
    name: 'Monko',
    accent: '#ab47bc',
    accent2: '#42a5f5',
    autoAttackLabel: 'Magic Shot',
    powerLabel: 'Sharp Dash',
    specialLabel: 'Flower Burst',
    baseSpeed: 3.9,
    maxHp: 115
  }
};

const levels = [
  {
    id: 'lego',
    name: 'Lego Land',
    emoji: '🧱',
    colors: {
      bg1: '#0f172a', bg2: '#1e3a8a', grid: 'rgba(255,255,255,.06)',
      floor: '#162033', floor2: '#1f2d47', obstacle: '#ffb74d', obstacle2: '#fb8c00'
    },
    world: { w: 2200, h: 1300 },
    obstacles: [
      { x: 400, y: 220, w: 280, h: 90 }, { x: 900, y: 250, w: 120, h: 320 },
      { x: 1320, y: 180, w: 240, h: 110 }, { x: 1700, y: 650, w: 260, h: 120 },
      { x: 300, y: 860, w: 220, h: 160 }, { x: 1080, y: 840, w: 360, h: 100 }
    ]
  },
  {
    id: 'beach',
    name: 'Beach World',
    emoji: '🏖️',
    colors: {
      bg1: '#052f5f', bg2: '#0ea5e9', grid: 'rgba(255,255,255,.08)',
      floor: '#0f4c81', floor2: '#155e95', obstacle: '#f4d06f', obstacle2: '#f59e0b'
    },
    world: { w: 2300, h: 1350 },
    obstacles: [
      { x: 500, y: 300, w: 160, h: 140 }, { x: 820, y: 760, w: 300, h: 100 },
      { x: 1450, y: 300, w: 220, h: 150 }, { x: 1650, y: 900, w: 180, h: 180 },
      { x: 280, y: 1040, w: 240, h: 120 }, { x: 1110, y: 530, w: 120, h: 250 }
    ]
  },
  {
    id: 'mini',
    name: 'Mini World',
    emoji: '🔬',
    colors: {
      bg1: '#1b1035', bg2: '#4c1d95', grid: 'rgba(255,255,255,.06)',
      floor: '#24113f', floor2: '#341b58', obstacle: '#c4b5fd', obstacle2: '#8b5cf6'
    },
    world: { w: 2400, h: 1400 },
    obstacles: [
      { x: 360, y: 260, w: 220, h: 120 }, { x: 820, y: 240, w: 120, h: 360 },
      { x: 1180, y: 760, w: 300, h: 120 }, { x: 1720, y: 260, w: 220, h: 140 },
      { x: 1780, y: 920, w: 240, h: 140 }, { x: 560, y: 980, w: 260, h: 120 }
    ]
  }
];

const enemyArchetypes = [
  { type: 'blob', hp: 28, speed: 1.45, r: 18, color: '#ef4444', damage: 8 },
  { type: 'tank', hp: 55, speed: 0.95, r: 26, color: '#f59e0b', damage: 14 },
  { type: 'swift', hp: 18, speed: 2.05, r: 14, color: '#06b6d4', damage: 7 }
];

// -------------------------
// Game state
// -------------------------
const state = {
  scene: 'menu', // menu, playing, win, gameover
  selectedHero: 'brish',
  selectedLevel: 0,
  world: levels[0],
  player: null,
  enemies: [],
  projectiles: [],
  particles: [],
  camera: { x: 0, y: 0, shake: 0 },
  wave: 1,
  maxWave: 4,
  waveTimer: 0,
  score: 0,
  uiButtons: [],
  tutorialSeen: false,
  menuPulse: 0
};

// -------------------------
// Input
// -------------------------
const kb = {};
window.addEventListener('keydown', e => {
  kb[e.key.toLowerCase()] = true;
  if (state.scene === 'menu' && (e.key === 'Enter' || e.key === ' ')) startGame();
  if (state.scene === 'playing') {
    if (e.key.toLowerCase() === ' ') usePower();
    if (e.key.toLowerCase() === 'shift') useSpecial();
  }
});
window.addEventListener('keyup', e => { kb[e.key.toLowerCase()] = false; });

const pointer = {
  active: false,
  x: 0,
  y: 0,
  justPressed: false,
  justReleased: false,
  leftStickId: null,
  leftStartX: 0,
  leftStartY: 0,
  leftDX: 0,
  leftDY: 0,
  rightButtons: new Set()
};

function canvasPos(ev) {
  const rect = canvas.getBoundingClientRect();
  return { x: ev.clientX - rect.left, y: ev.clientY - rect.top };
}

function handlePress(x, y) {
  pointer.active = true;
  pointer.x = x;
  pointer.y = y;
  pointer.justPressed = true;
}
function handleRelease(x, y) {
  pointer.x = x;
  pointer.y = y;
  pointer.justReleased = true;
}
canvas.addEventListener('mousedown', e => {
  const p = canvasPos(e);
  handlePress(p.x, p.y);
});
window.addEventListener('mouseup', e => {
  const p = canvasPos(e);
  handleRelease(p.x, p.y);
  pointer.active = false;
});
window.addEventListener('mousemove', e => {
  const p = canvasPos(e);
  pointer.x = p.x; pointer.y = p.y;
});

canvas.addEventListener('touchstart', e => {
  e.preventDefault();
  const rect = canvas.getBoundingClientRect();
  for (const t of e.changedTouches) {
    const x = t.clientX - rect.left;
    const y = t.clientY - rect.top;
    if (x < rect.width * 0.5 && pointer.leftStickId === null) {
      pointer.leftStickId = t.identifier;
      pointer.leftStartX = x;
      pointer.leftStartY = y;
      pointer.leftDX = 0;
      pointer.leftDY = 0;
    } else {
      pointer.rightButtons.add(t.identifier);
      pointer.x = x; pointer.y = y; pointer.justPressed = true;
    }
  }
}, { passive: false });

canvas.addEventListener('touchmove', e => {
  e.preventDefault();
  const rect = canvas.getBoundingClientRect();
  for (const t of e.changedTouches) {
    const x = t.clientX - rect.left;
    const y = t.clientY - rect.top;
    if (t.identifier === pointer.leftStickId) {
      pointer.leftDX = x - pointer.leftStartX;
      pointer.leftDY = y - pointer.leftStartY;
    } else if (pointer.rightButtons.has(t.identifier)) {
      pointer.x = x; pointer.y = y;
    }
  }
}, { passive: false });

canvas.addEventListener('touchend', e => {
  e.preventDefault();
  const rect = canvas.getBoundingClientRect();
  for (const t of e.changedTouches) {
    const x = t.clientX - rect.left;
    const y = t.clientY - rect.top;
    if (t.identifier === pointer.leftStickId) {
      pointer.leftStickId = null;
      pointer.leftDX = 0;
      pointer.leftDY = 0;
    } else if (pointer.rightButtons.has(t.identifier)) {
      pointer.rightButtons.delete(t.identifier);
      pointer.x = x; pointer.y = y; pointer.justReleased = true;
    }
  }
}, { passive: false });

// -------------------------
// Utility
// -------------------------
function screenShake(amount) {
  state.camera.shake = Math.max(state.camera.shake, amount);
}
function burst(x, y, color, n = 8, speed = 3) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * TAU;
    const s = Math.random() * speed;
    state.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: rand(18, 36), color, size: rand(2, 6) });
  }
}
function worldToScreen(x, y) {
  return { x: x - state.camera.x, y: y - state.camera.y };
}
function pointInRect(px, py, r) {
  return px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h;
}
function circleHitsRect(cx, cy, r, rect) {
  const nx = clamp(cx, rect.x, rect.x + rect.w);
  const ny = clamp(cy, rect.y, rect.y + rect.h);
  return dist(cx, cy, nx, ny) < r;
}
function nearestEnemy(range = 99999) {
  const p = state.player;
  let best = null, bestD = range;
  for (const e of state.enemies) {
    if (e.dead) continue;
    const d = dist(p.x, p.y, e.x, e.y);
    if (d < bestD) { bestD = d; best = e; }
  }
  return best;
}

// -------------------------
// World / player init
// -------------------------
function spawnWave(wave) {
  const L = state.world;
  const count = 5 + wave * 2;
  state.enemies = [];
  for (let i = 0; i < count; i++) {
    const a = enemyArchetypes[Math.floor(Math.random() * Math.min(enemyArchetypes.length, 1 + Math.floor(wave / 2)))];
    let x, y;
    const side = Math.floor(Math.random() * 4);
    if (side === 0) { x = rand(50, L.world.w - 50); y = 40; }
    if (side === 1) { x = L.world.w - 40; y = rand(50, L.world.h - 50); }
    if (side === 2) { x = rand(50, L.world.w - 50); y = L.world.h - 40; }
    if (side === 3) { x = 40; y = rand(50, L.world.h - 50); }
    state.enemies.push({
      x, y, vx: 0, vy: 0,
      r: a.r, hp: a.hp + wave * 4, maxHp: a.hp + wave * 4,
      speed: a.speed + wave * 0.05,
      color: a.color,
      damage: a.damage,
      type: a.type,
      dead: false,
      hurt: 0,
      attackCd: 0
    });
  }
  state.waveTimer = 45;
}

function makePlayer() {
  const hero = heroes[state.selectedHero];
  return {
    hero: state.selectedHero,
    x: state.world.world.w * 0.5,
    y: state.world.world.h * 0.5,
    vx: 0,
    vy: 0,
    r: 34,
    hp: hero.maxHp,
    maxHp: hero.maxHp,
    baseSpeed: hero.baseSpeed,
    autoCd: 0,
    powerCd: 0,
    specialCd: 0,
    carTimer: 0,
    attackFlash: 0,
    dashTimer: 0,
    dashVX: 0,
    dashVY: 0,
    hurt: 0,
    facing: 1,
    animTimer: 0,
    animFrame: 0,
    animState: 'idle'
  };
}

function startGame() {
  state.scene = 'playing';
  state.world = levels[state.selectedLevel];
  state.player = makePlayer();
  state.wave = 1;
  state.score = 0;
  state.particles = [];
  state.projectiles = [];
  state.camera.x = 0;
  state.camera.y = 0;
  state.camera.shake = 0;
  spawnWave(1);
}

function returnToMenu() {
  state.scene = 'menu';
}

// -------------------------
// Player abilities
// -------------------------
function hitEnemy(enemy, dmg, knock = 0, color = '#fff') {
  enemy.hp -= dmg;
  enemy.hurt = 10;
  burst(enemy.x, enemy.y, color, 8, 3.5);
  if (knock > 0) {
    const dx = enemy.x - state.player.x;
    const dy = enemy.y - state.player.y;
    const d = Math.max(1, Math.hypot(dx, dy));
    enemy.x += (dx / d) * knock;
    enemy.y += (dy / d) * knock;
  }
  if (enemy.hp <= 0) {
    enemy.dead = true;
    state.score += 10;
    burst(enemy.x, enemy.y, color, 18, 5);
    screenShake(6);
  }
}

function usePower() {
  const p = state.player;
  if (!p || p.powerCd > 0) return;

  if (p.hero === 'brish') {
    screenShake(10);
    burst(p.x, p.y, heroes.brish.accent, 28, 6);
    for (const e of state.enemies) {
      if (e.dead) continue;
      const d = dist(p.x, p.y, e.x, e.y);
      if (d < 170) hitEnemy(e, 24, 32, heroes.brish.accent);
    }
    p.attackFlash = 12;
    p.powerCd = 180;
  } else {
    // sharp dash
    const target = getMoveVector();
    const dx = target.x || p.facing || 1;
    const dy = target.y || 0;
    const mag = Math.max(1, Math.hypot(dx, dy));
    p.dashTimer = 16;
    p.dashVX = dx / mag * 14;
    p.dashVY = dy / mag * 14;
    p.powerCd = 140;
    burst(p.x, p.y, heroes.monko.accent, 18, 4);
    screenShake(7);
  }
}

function useSpecial() {
  const p = state.player;
  if (!p || p.specialCd > 0) return;

  if (p.hero === 'brish') {
    p.carTimer = 210;
    p.specialCd = 420;
    burst(p.x, p.y, heroes.brish.accent2, 24, 4);
    screenShake(8);
  } else {
    // flower burst
    const n = 10;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU;
      state.projectiles.push({
        kind: 'orb',
        x: p.x,
        y: p.y,
        vx: Math.cos(a) * 7,
        vy: Math.sin(a) * 7,
        r: 10,
        life: 70,
        damage: 18,
        color: heroes.monko.accent2
      });
    }
    p.specialCd = 300;
    p.attackFlash = 10;
    burst(p.x, p.y, heroes.monko.accent2, 28, 5);
    screenShake(9);
  }
}

function doAutoAttack() {
  const p = state.player;
  if (!p || p.autoCd > 0) return;
  const target = nearestEnemy(p.hero === 'brish' ? 160 : 520);
  if (!target) return;

  if (p.hero === 'brish') {
    hitEnemy(target, 12, 18, heroes.brish.accent);
    p.attackFlash = 6;
    screenShake(4);
    p.autoCd = 22;
  } else {
    const dx = target.x - p.x;
    const dy = target.y - p.y;
    const d = Math.max(1, Math.hypot(dx, dy));
    state.projectiles.push({
      kind: 'orb',
      x: p.x,
      y: p.y - 8,
      vx: dx / d * 8,
      vy: dy / d * 8,
      r: 8,
      life: 70,
      damage: 10,
      color: heroes.monko.accent
    });
    p.attackFlash = 4;
    p.autoCd = 18;
  }
}

// -------------------------
// Movement / update
// -------------------------
function getMoveVector() {
  let x = 0, y = 0;
  if (kb['a'] || kb['arrowleft']) x -= 1;
  if (kb['d'] || kb['arrowright']) x += 1;
  if (kb['w'] || kb['arrowup']) y -= 1;
  if (kb['s'] || kb['arrowdown']) y += 1;

  if (pointer.leftStickId !== null) {
    const max = 60;
    x += clamp(pointer.leftDX / max, -1, 1);
    y += clamp(pointer.leftDY / max, -1, 1);
  }
  const mag = Math.hypot(x, y);
  if (mag > 1) { x /= mag; y /= mag; }
  return { x, y };
}

function collideWorldCircle(ent) {
  const L = state.world;
  ent.x = clamp(ent.x, ent.r, L.world.w - ent.r);
  ent.y = clamp(ent.y, ent.r, L.world.h - ent.r);
  for (const o of L.obstacles) {
    if (!circleHitsRect(ent.x, ent.y, ent.r, o)) continue;
    const nx = clamp(ent.x, o.x, o.x + o.w);
    const ny = clamp(ent.y, o.y, o.y + o.h);
    let dx = ent.x - nx;
    let dy = ent.y - ny;
    let d = Math.hypot(dx, dy);
    if (d === 0) { dx = 1; dy = 0; d = 1; }
    const push = ent.r - d;
    if (push > 0) {
      ent.x += (dx / d) * push;
      ent.y += (dy / d) * push;
    }
  }
}

function updatePlayer() {
  const p = state.player;
  const mv = getMoveVector();
  const speed = p.baseSpeed + (p.carTimer > 0 ? 2.6 : 0);

  if (p.dashTimer > 0) {
    p.x += p.dashVX;
    p.y += p.dashVY;
    p.dashTimer--;
    p.attackFlash = 8;
    for (const e of state.enemies) {
      if (e.dead) continue;
      if (dist(p.x, p.y, e.x, e.y) < p.r + e.r + 10) hitEnemy(e, 22, 26, heroes.monko.accent);
    }
  } else {
    p.vx += mv.x * 0.9;
    p.vy += mv.y * 0.9;
    p.vx *= 0.82;
    p.vy *= 0.82;
    p.x += p.vx * speed;
    p.y += p.vy * speed;
  }

  if (Math.abs(mv.x) > 0.1) p.facing = mv.x > 0 ? 1 : -1;
  collideWorldCircle(p);

  if (p.hero === 'brish' && p.carTimer > 0) {
    for (const e of state.enemies) {
      if (e.dead) continue;
      if (dist(p.x, p.y, e.x, e.y) < p.r + e.r + 18) hitEnemy(e, 18, 30, heroes.brish.accent2);
    }
    p.carTimer--;
  }

  if (p.autoCd > 0) p.autoCd--;
  if (p.powerCd > 0) p.powerCd--;
  if (p.specialCd > 0) p.specialCd--;
  if (p.attackFlash > 0) p.attackFlash--;
  if (p.hurt > 0) p.hurt--;

  doAutoAttack();
  updatePlayerAnim(mv);
}

function updatePlayerAnim(mv) {
  const p = state.player;
  let stateName = 'idle';
  if (p.attackFlash > 0) stateName = p.hero === 'brish' ? 'punch' : 'magic';
  else if (Math.hypot(mv.x, mv.y) > 0.15) stateName = 'walk';

  p.animTimer++;
  const speed = stateName === 'walk' ? 7 : 14;
  if (p.animTimer >= speed) {
    p.animTimer = 0;
    p.animFrame++;
  }
  p.animState = stateName;
}

function updateEnemies() {
  const p = state.player;
  for (const e of state.enemies) {
    if (e.dead) continue;
    const dx = p.x - e.x;
    const dy = p.y - e.y;
    const d = Math.max(1, Math.hypot(dx, dy));
    e.vx = dx / d * e.speed;
    e.vy = dy / d * e.speed;
    e.x += e.vx;
    e.y += e.vy;
    collideWorldCircle(e);
    if (e.attackCd > 0) e.attackCd--;
    if (e.hurt > 0) e.hurt--;

    if (d < p.r + e.r + 6 && e.attackCd <= 0) {
      p.hp -= e.damage;
      p.hurt = 12;
      e.attackCd = 30;
      burst(p.x, p.y, '#ff5252', 10, 4);
      screenShake(7);
      if (p.hp <= 0) {
        state.scene = 'gameover';
      }
    }
  }
}

function updateProjectiles() {
  for (const pr of state.projectiles) {
    pr.x += pr.vx;
    pr.y += pr.vy;
    pr.life--;
    for (const e of state.enemies) {
      if (e.dead) continue;
      if (dist(pr.x, pr.y, e.x, e.y) < pr.r + e.r) {
        hitEnemy(e, pr.damage, 16, pr.color);
        pr.life = 0;
        break;
      }
    }
  }
  state.projectiles = state.projectiles.filter(p => p.life > 0);
}

function updateParticles() {
  for (const p of state.particles) {
    p.x += p.vx;
    p.y += p.vy;
    p.vx *= 0.97;
    p.vy *= 0.97;
    p.life--;
  }
  state.particles = state.particles.filter(p => p.life > 0);
}

function updateWaves() {
  if (state.enemies.every(e => e.dead)) {
    if (state.wave < state.maxWave) {
      if (state.waveTimer <= 0) {
        state.wave++;
        spawnWave(state.wave);
      } else state.waveTimer--;
    } else if (state.scene === 'playing') {
      state.scene = 'win';
      burst(state.player.x, state.player.y, heroes[state.selectedHero].accent2, 40, 7);
    }
  }
}

function updateCamera() {
  const p = state.player;
  const sw = window.innerWidth;
  const sh = window.innerHeight;
  state.camera.x = clamp(p.x - sw / 2, 0, state.world.world.w - sw);
  state.camera.y = clamp(p.y - sh / 2, 0, state.world.world.h - sh);
  if (state.camera.shake > 0) {
    state.camera.x += rand(-state.camera.shake, state.camera.shake);
    state.camera.y += rand(-state.camera.shake, state.camera.shake);
    state.camera.shake *= 0.82;
    if (state.camera.shake < 0.4) state.camera.shake = 0;
  }
}

function update() {
  state.menuPulse += 0.03;

  if (state.scene === 'menu') {
    if (pointer.justPressed) handleMenuTap(pointer.x, pointer.y);
  } else if (state.scene === 'playing') {
    if (pointer.justPressed) handleTouchButtons(pointer.x, pointer.y);
    updatePlayer();
    updateEnemies();
    updateProjectiles();
    updateParticles();
    updateWaves();
    updateCamera();
  } else {
    if (pointer.justPressed) handleEndTap(pointer.x, pointer.y);
    updateParticles();
  }

  pointer.justPressed = false;
  pointer.justReleased = false;
}

// -------------------------
// UI hitboxes
// -------------------------
function handleMenuTap(x, y) {
  const W = window.innerWidth;
  const H = window.innerHeight;
  const heroY = H * 0.32;
  const heroW = Math.min(160, W * 0.34);
  const heroH = 180;
  const gap = 18;
  const leftX = W * 0.5 - heroW - gap / 2;
  const rightX = W * 0.5 + gap / 2;
  const hero1 = { x: leftX, y: heroY, w: heroW, h: heroH };
  const hero2 = { x: rightX, y: heroY, w: heroW, h: heroH };
  if (pointInRect(x, y, hero1)) state.selectedHero = 'brish';
  if (pointInRect(x, y, hero2)) state.selectedHero = 'monko';

  const ly = H * 0.62;
  const lw = Math.min(160, W * 0.26);
  const lh = 64;
  const total = lw * 3 + 16 * 2;
  const sx = W * 0.5 - total / 2;
  for (let i = 0; i < 3; i++) {
    const r = { x: sx + i * (lw + 16), y: ly, w: lw, h: lh };
    if (pointInRect(x, y, r)) state.selectedLevel = i;
  }

  const play = { x: W * 0.5 - 110, y: H * 0.78, w: 220, h: 68 };
  if (pointInRect(x, y, play)) startGame();
}

function getTouchButtons() {
  const W = window.innerWidth, H = window.innerHeight;
  return {
    power: { x: W - 108, y: H - 190, r: 40 },
    special: { x: W - 62, y: H - 108, r: 46 }
  };
}
function handleTouchButtons(x, y) {
  const btn = getTouchButtons();
  if (dist(x, y, btn.power.x, btn.power.y) < btn.power.r) usePower();
  if (dist(x, y, btn.special.x, btn.special.y) < btn.special.r) useSpecial();
}

function handleEndTap(x, y) {
  const W = window.innerWidth, H = window.innerHeight;
  const center = W * 0.5;
  const primary = { x: center - 110, y: H * 0.72, w: 220, h: 64 };
  const secondary = { x: center - 110, y: H * 0.82, w: 220, h: 58 };
  if (pointInRect(x, y, primary)) {
    if (state.scene === 'win') {
      state.selectedLevel = (state.selectedLevel + 1) % levels.length;
      startGame();
    } else if (state.scene === 'gameover') {
      startGame();
    }
  }
  if (pointInRect(x, y, secondary)) returnToMenu();
}

// -------------------------
// Drawing helpers
// -------------------------
function roundedRect(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawGradientBackground(colors) {
  const W = window.innerWidth, H = window.innerHeight;
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, colors.bg1);
  g.addColorStop(1, colors.bg2);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  ctx.save();
  ctx.globalAlpha = 0.25;
  ctx.strokeStyle = colors.grid;
  for (let x = -((state.camera.x * 0.25) % 60); x < W + 60; x += 60) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, H);
    ctx.stroke();
  }
  for (let y = -((state.camera.y * 0.25) % 60); y < H + 60; y += 60) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  }
  ctx.restore();
}

function drawWorld() {
  const L = state.world;
  drawGradientBackground(L.colors);
  const W = window.innerWidth, H = window.innerHeight;

  // floor panel
  ctx.fillStyle = L.colors.floor;
  ctx.fillRect(-state.camera.x, -state.camera.y, L.world.w, L.world.h);

  // subtle pattern blobs
  ctx.save();
  ctx.globalAlpha = 0.13;
  ctx.fillStyle = L.colors.floor2;
  for (let i = 0; i < 12; i++) {
    const x = ((i * 170) % L.world.w) - state.camera.x;
    const y = ((i * 240 + 80) % L.world.h) - state.camera.y;
    ctx.beginPath();
    ctx.arc(x, y, 120 + (i % 3) * 24, 0, TAU);
    ctx.fill();
  }
  ctx.restore();

  // obstacles
  for (const o of L.obstacles) {
    const s = worldToScreen(o.x, o.y);
    ctx.fillStyle = L.colors.obstacle;
    roundedRect(s.x, s.y, o.w, o.h, 22);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.14)';
    roundedRect(s.x + 6, s.y + 6, o.w - 12, 20, 12);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,.18)';
    ctx.lineWidth = 3;
    roundedRect(s.x, s.y, o.w, o.h, 22);
    ctx.stroke();
  }
}

function drawPlayerSprite() {
  const p = state.player;
  const s = worldToScreen(p.x, p.y);
  const shadowY = p.carTimer > 0 ? 26 : 18;

  // shadow
  ctx.fillStyle = 'rgba(0,0,0,.22)';
  ctx.beginPath();
  ctx.ellipse(s.x, s.y + shadowY, p.carTimer > 0 ? 42 : 26, p.carTimer > 0 ? 16 : 12, 0, 0, TAU);
  ctx.fill();

  if (p.carTimer > 0) {
    const car = p.hero === 'brish' ? assets.brishCar : assets.monkoCar;
    if (car && car.complete && car.naturalWidth) {
      ctx.save();
      if (p.facing < 0) {
        ctx.translate(s.x, 0); ctx.scale(-1, 1);
        ctx.drawImage(car, -46, s.y - 34, 92, 58);
      } else {
        ctx.drawImage(car, s.x - 46, s.y - 34, 92, 58);
      }
      ctx.restore();
    }
    return;
  }

  // attack flash
  if (p.attackFlash > 0) {
    ctx.fillStyle = (p.hero === 'brish' ? 'rgba(255,138,101,.24)' : 'rgba(171,71,188,.22)');
    ctx.beginPath();
    ctx.arc(s.x, s.y - 12, 48 + Math.sin(p.attackFlash) * 6, 0, TAU);
    ctx.fill();
  }

  const drawW = 76, drawH = 102;

  if (p.hero === 'brish' && assets.brishStrip.complete && assets.brishStrip.naturalWidth) {
    const anim = p.animState === 'walk' ? [1,2,3,2] : p.animState === 'punch' ? [6,7] : [0];
    const frame = anim[Math.floor(p.animFrame / 1) % anim.length];
    ctx.save();
    if (p.facing < 0) {
      ctx.translate(s.x, 0); ctx.scale(-1, 1);
      ctx.drawImage(assets.brishStrip, frame * 320, 0, 320, 426, -drawW / 2, s.y - 80, drawW, drawH);
    } else {
      ctx.drawImage(assets.brishStrip, frame * 320, 0, 320, 426, s.x - drawW / 2, s.y - 80, drawW, drawH);
    }
    ctx.restore();
  } else if (p.hero === 'monko' && assets.monkoStrip.complete && assets.monkoStrip.naturalWidth) {
    const anim = p.animState === 'walk' ? [1,2,3,2] : p.animState === 'magic' ? [6,7] : [0];
    const frame = anim[Math.floor(p.animFrame / 1) % anim.length];
    ctx.save();
    if (p.facing < 0) {
      ctx.translate(s.x, 0); ctx.scale(-1, 1);
      ctx.drawImage(assets.monkoStrip, frame * 320, 0, 320, 426, -drawW / 2, s.y - 80, drawW, drawH);
    } else {
      ctx.drawImage(assets.monkoStrip, frame * 320, 0, 320, 426, s.x - drawW / 2, s.y - 80, drawW, drawH);
    }
    ctx.restore();
  } else {
    const img = p.hero === 'brish' ? assets.brish : assets.monko;
    if (img && img.complete) {
      ctx.save();
      if (p.facing < 0) {
        ctx.translate(s.x, 0); ctx.scale(-1, 1);
        ctx.drawImage(img, -drawW / 2, s.y - 80, drawW, drawH);
      } else {
        ctx.drawImage(img, s.x - drawW / 2, s.y - 80, drawW, drawH);
      }
      ctx.restore();
    }
  }

  if (p.hurt > 0) {
    ctx.strokeStyle = 'rgba(255,82,82,.9)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(s.x, s.y - 12, 40, 0, TAU);
    ctx.stroke();
  }
}

function drawEnemies() {
  for (const e of state.enemies) {
    if (e.dead) continue;
    const s = worldToScreen(e.x, e.y);
    ctx.fillStyle = 'rgba(0,0,0,.22)';
    ctx.beginPath();
    ctx.ellipse(s.x, s.y + e.r * 0.85, e.r * 0.8, e.r * 0.45, 0, 0, TAU);
    ctx.fill();

    ctx.fillStyle = e.color;
    ctx.beginPath();
    ctx.arc(s.x, s.y, e.r, 0, TAU);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.25)';
    ctx.beginPath();
    ctx.arc(s.x - e.r * 0.35, s.y - e.r * 0.35, e.r * 0.35, 0, TAU);
    ctx.fill();

    // eyes
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(s.x - e.r*0.35, s.y - 4, 4, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(s.x + e.r*0.15, s.y - 4, 4, 0, TAU); ctx.fill();
    ctx.fillStyle = '#111';
    ctx.beginPath(); ctx.arc(s.x - e.r*0.28, s.y - 3, 2, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(s.x + e.r*0.22, s.y - 3, 2, 0, TAU); ctx.fill();

    if (e.hurt > 0) {
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(s.x, s.y, e.r + 4, 0, TAU);
      ctx.stroke();
    }

    // hp bar
    ctx.fillStyle = 'rgba(0,0,0,.4)';
    roundedRect(s.x - 22, s.y - e.r - 18, 44, 6, 4); ctx.fill();
    ctx.fillStyle = '#22c55e';
    roundedRect(s.x - 22, s.y - e.r - 18, 44 * (e.hp / e.maxHp), 6, 4); ctx.fill();
  }
}

function drawProjectiles() {
  for (const p of state.projectiles) {
    const s = worldToScreen(p.x, p.y);
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(s.x, s.y, p.r, 0, TAU);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.45)';
    ctx.beginPath();
    ctx.arc(s.x - 2, s.y - 2, p.r * 0.45, 0, TAU);
    ctx.fill();
  }
}

function drawParticles() {
  for (const p of state.particles) {
    const s = worldToScreen(p.x, p.y);
    ctx.globalAlpha = clamp(p.life / 30, 0, 1);
    ctx.fillStyle = p.color;
    ctx.fillRect(s.x, s.y, p.size, p.size);
  }
  ctx.globalAlpha = 1;
}

function drawHUD() {
  const p = state.player;
  const hero = heroes[p.hero];
  const W = window.innerWidth;
  const H = window.innerHeight;

  // top bars
  ctx.fillStyle = 'rgba(0,0,0,.32)';
  roundedRect(14, 14, W - 28, 74, 22); ctx.fill();

  ctx.fillStyle = '#fff';
  ctx.font = '700 20px Fredoka';
  ctx.fillText(`${levels[state.selectedLevel].emoji} ${state.world.name}`, 28, 40);
  ctx.font = '600 14px Fredoka';
  ctx.fillStyle = 'rgba(255,255,255,.8)';
  ctx.fillText(`${hero.name} • Wave ${state.wave}/${state.maxWave} • Score ${state.score}`, 28, 64);

  // hp
  const barX = 22, barY = 94, barW = W - 44;
  ctx.fillStyle = 'rgba(255,255,255,.12)';
  roundedRect(barX, barY, barW, 18, 10); ctx.fill();
  ctx.fillStyle = hero.accent;
  roundedRect(barX, barY, barW * (p.hp / p.maxHp), 18, 10); ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.font = '700 12px Fredoka';
  ctx.fillText(`${Math.max(0, Math.ceil(p.hp))}/${p.maxHp}`, barX + 8, barY + 13);

  // touch controls visual
  drawTouchUI(hero);

  // tutorial
  if (!state.tutorialSeen) {
    ctx.fillStyle = 'rgba(0,0,0,.42)';
    roundedRect(W*0.5 - 170, 126, 340, 96, 18); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = '700 18px Fredoka';
    ctx.fillText('Drag left thumb to move', W*0.5 - 128, 160);
    ctx.font = '600 15px Fredoka';
    ctx.fillText('Tap right buttons for powers', W*0.5 - 114, 186);
    ctx.fillText('Auto-attacks fire by themselves', W*0.5 - 122, 208);
  }
}

function drawTouchUI(hero) {
  const W = window.innerWidth, H = window.innerHeight;
  const leftBaseX = pointer.leftStickId !== null ? pointer.leftStartX : 88;
  const leftBaseY = pointer.leftStickId !== null ? pointer.leftStartY : H - 104;

  // joystick base
  ctx.fillStyle = 'rgba(255,255,255,.08)';
  ctx.beginPath(); ctx.arc(leftBaseX, leftBaseY, 48, 0, TAU); ctx.fill();
  const knobX = leftBaseX + clamp(pointer.leftDX, -28, 28);
  const knobY = leftBaseY + clamp(pointer.leftDY, -28, 28);
  ctx.fillStyle = 'rgba(255,255,255,.2)';
  ctx.beginPath(); ctx.arc(knobX, knobY, 26, 0, TAU); ctx.fill();

  // action buttons
  const btn = getTouchButtons();
  const powerReady = state.player.powerCd <= 0;
  const specReady = state.player.specialCd <= 0;

  ctx.fillStyle = powerReady ? hero.accent : 'rgba(255,255,255,.18)';
  ctx.beginPath(); ctx.arc(btn.power.x, btn.power.y, btn.power.r, 0, TAU); ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.font = '700 15px Fredoka';
  ctx.textAlign = 'center';
  ctx.fillText('PWR', btn.power.x, btn.power.y + 5);

  ctx.fillStyle = specReady ? hero.accent2 : 'rgba(255,255,255,.18)';
  ctx.beginPath(); ctx.arc(btn.special.x, btn.special.y, btn.special.r, 0, TAU); ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.fillText('ULT', btn.special.x, btn.special.y + 5);
  ctx.textAlign = 'left';

  // cooldown rings
  if (!powerReady) drawCooldownRing(btn.power.x, btn.power.y, btn.power.r, state.player.powerCd / (state.player.hero === 'brish' ? 180 : 140));
  if (!specReady) drawCooldownRing(btn.special.x, btn.special.y, btn.special.r, state.player.specialCd / (state.player.hero === 'brish' ? 420 : 300));
}

function drawCooldownRing(x, y, r, pct) {
  ctx.strokeStyle = 'rgba(0,0,0,.45)';
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.arc(x, y, r - 4, -Math.PI / 2, -Math.PI / 2 + TAU * pct, false);
  ctx.stroke();
}

function drawMenu() {
  const W = window.innerWidth, H = window.innerHeight;
  drawGradientBackground({ bg1: '#0b1021', bg2: '#22114d', grid: 'rgba(255,255,255,.06)' });

  // glow blobs
  ctx.save();
  ctx.globalAlpha = 0.35;
  const pulse = (Math.sin(state.menuPulse) + 1) * 0.5;
  const g1 = ctx.createRadialGradient(W*0.25, H*0.2, 20, W*0.25, H*0.2, 240 + pulse*20);
  g1.addColorStop(0, 'rgba(124,77,255,.6)'); g1.addColorStop(1, 'rgba(124,77,255,0)');
  ctx.fillStyle = g1; ctx.fillRect(0,0,W,H);
  const g2 = ctx.createRadialGradient(W*0.75, H*0.75, 20, W*0.75, H*0.75, 240 + pulse*15);
  g2.addColorStop(0, 'rgba(255,138,101,.55)'); g2.addColorStop(1, 'rgba(255,138,101,0)');
  ctx.fillStyle = g2; ctx.fillRect(0,0,W,H);
  ctx.restore();

  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.font = `700 ${Math.min(52, W*0.12)}px Fredoka`;
  ctx.fillText('Brish & Monko', W*0.5, H*0.14);
  ctx.font = `600 ${Math.min(22, W*0.05)}px Fredoka`;
  ctx.fillStyle = 'rgba(255,255,255,.78)';
  ctx.fillText('mobile action adventure', W*0.5, H*0.19);

  // hero cards
  const heroY = H * 0.32;
  const heroW = Math.min(170, W * 0.36);
  const heroH = 190;
  const gap = 18;
  const leftX = W * 0.5 - heroW - gap / 2;
  const rightX = W * 0.5 + gap / 2;
  drawHeroCard(leftX, heroY, heroW, heroH, 'brish');
  drawHeroCard(rightX, heroY, heroW, heroH, 'monko');

  // level buttons
  const ly = H * 0.62;
  const lw = Math.min(160, W * 0.26);
  const lh = 64;
  const total = lw * 3 + 16 * 2;
  const sx = W * 0.5 - total / 2;
  for (let i = 0; i < 3; i++) {
    const selected = state.selectedLevel === i;
    roundedRect(sx + i*(lw+16), ly, lw, lh, 18);
    ctx.fillStyle = selected ? 'rgba(124,77,255,.28)' : 'rgba(255,255,255,.08)';
    ctx.fill();
    ctx.strokeStyle = selected ? '#8b5cf6' : 'rgba(255,255,255,.12)';
    ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.font = '700 18px Fredoka';
    ctx.fillText(levels[i].emoji, sx + i*(lw+16) + lw/2, ly + 24);
    ctx.font = '600 14px Fredoka';
    ctx.fillText(levels[i].name, sx + i*(lw+16) + lw/2, ly + 46);
  }

  // play button
  const play = { x: W*0.5 - 110, y: H*0.78, w: 220, h: 68 };
  roundedRect(play.x, play.y, play.w, play.h, 20);
  const g = ctx.createLinearGradient(play.x, play.y, play.x, play.y + play.h);
  g.addColorStop(0, '#8b5cf6'); g.addColorStop(1, '#6d28d9');
  ctx.fillStyle = g; ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.font = '700 28px Fredoka';
  ctx.fillText('PLAY', W*0.5, play.y + 43);

  ctx.font = '600 14px Fredoka';
  ctx.fillStyle = 'rgba(255,255,255,.74)';
  ctx.fillText('Modern top-down action • auto attacks • powers • cars', W*0.5, H*0.92);
  ctx.textAlign = 'left';
}

function drawHeroCard(x, y, w, h, heroKey) {
  const hero = heroes[heroKey];
  const selected = state.selectedHero === heroKey;
  roundedRect(x, y, w, h, 24);
  ctx.fillStyle = selected ? 'rgba(124,77,255,.22)' : 'rgba(255,255,255,.08)';
  ctx.fill();
  ctx.strokeStyle = selected ? hero.accent : 'rgba(255,255,255,.14)';
  ctx.lineWidth = 3; ctx.stroke();

  const art = heroKey === 'brish' ? (assets.brishStrip.complete ? assets.brishStrip : assets.brish) : (assets.monkoStrip.complete ? assets.monkoStrip : assets.monko);
  if (art && art.complete && art.naturalWidth) {
    if (heroKey === 'brish' && assets.brishStrip.complete && assets.brishStrip.naturalWidth) {
      ctx.drawImage(assets.brishStrip, 0, 0, 320, 426, x + w/2 - 36, y + 20, 72, 96);
    } else if (heroKey === 'monko' && assets.monkoStrip.complete && assets.monkoStrip.naturalWidth) {
      ctx.drawImage(assets.monkoStrip, 0, 0, 320, 426, x + w/2 - 36, y + 20, 72, 96);
    } else {
      ctx.drawImage(art, x + w/2 - 34, y + 20, 68, 96);
    }
  }

  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.font = '700 24px Fredoka';
  ctx.fillText(hero.name, x + w/2, y + 138);
  ctx.font = '600 14px Fredoka';
  ctx.fillStyle = 'rgba(255,255,255,.8)';
  ctx.fillText(hero.powerLabel, x + w/2, y + 162);
  ctx.fillText(hero.specialLabel, x + w/2, y + 182);
  ctx.textAlign = 'left';
}

function drawEndScreen(kind) {
  drawWorld();
  drawEnemies();
  drawProjectiles();
  drawPlayerSprite();
  drawParticles();

  const W = window.innerWidth, H = window.innerHeight;
  ctx.fillStyle = 'rgba(0,0,0,.55)';
  ctx.fillRect(0, 0, W, H);

  roundedRect(W*0.5 - 180, H*0.28, 360, 250, 28);
  ctx.fillStyle = 'rgba(15,15,35,.92)';
  ctx.fill();
  ctx.strokeStyle = kind === 'win' ? '#8b5cf6' : '#ef4444';
  ctx.lineWidth = 3; ctx.stroke();

  ctx.textAlign = 'center';
  ctx.fillStyle = '#fff';
  ctx.font = '700 40px Fredoka';
  ctx.fillText(kind === 'win' ? 'Level Clear!' : 'Game Over', W*0.5, H*0.37);
  ctx.font = '600 18px Fredoka';
  ctx.fillStyle = 'rgba(255,255,255,.82)';
  ctx.fillText(kind === 'win' ? `Score ${state.score} • Next world ready` : `Score ${state.score} • Try a different hero`, W*0.5, H*0.415);

  const primary = { x: W*0.5 - 110, y: H*0.49, w: 220, h: 64 };
  const secondary = { x: W*0.5 - 110, y: H*0.58, w: 220, h: 58 };
  roundedRect(primary.x, primary.y, primary.w, primary.h, 18);
  ctx.fillStyle = kind === 'win' ? '#7c4dff' : '#ef4444';
  ctx.fill();
  roundedRect(secondary.x, secondary.y, secondary.w, secondary.h, 18);
  ctx.fillStyle = 'rgba(255,255,255,.12)';
  ctx.fill();

  ctx.fillStyle = '#fff';
  ctx.font = '700 24px Fredoka';
  ctx.fillText(kind === 'win' ? 'NEXT' : 'RETRY', W*0.5, primary.y + 40);
  ctx.font = '700 20px Fredoka';
  ctx.fillText('MENU', W*0.5, secondary.y + 37);
  ctx.textAlign = 'left';
}

// -------------------------
// Main draw
// -------------------------
function draw() {
  if (state.scene === 'menu') {
    drawMenu();
    return;
  }

  drawWorld();
  drawEnemies();
  drawProjectiles();
  drawPlayerSprite();
  drawParticles();
  drawHUD();

  if (state.scene === 'win') drawEndScreen('win');
  if (state.scene === 'gameover') drawEndScreen('gameover');
}

// -------------------------
// Loop
// -------------------------
function loop() {
  update();
  draw();
  requestAnimationFrame(loop);
}
loop();
