const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const heroNameEl = document.getElementById('hero-name');
const levelNameEl = document.getElementById('level-name');
const messageEl = document.getElementById('message');

const spritePaths = {
  brish: 'sprites/brish.png',
  marko: 'sprites/marko.png',
  brishCar: 'sprites/brish-car.png',
  markoCar: 'sprites/marko-car.png',
  levelSheet: 'sprites/levels-sheet.jpg',
  brishStrip: 'sprites/brish-strip.png'
};

// Animation config: frame indices into the strip (8 frames, 320px each)
const BRISH_ANIMS = {
  idle: [0],
  walk: [1, 2, 3, 2],
  jump: [4],
  fall: [5],
  punch1: [6, 7],  // mega punch
  punch2: [6]       // ground smash windup
};
const BRISH_FRAME_W = 320;
const BRISH_FRAME_H = 426;
let brishAnimFrame = 0;
let brishAnimTimer = 0;
let brishAnimState = 'idle';

const images = {};
let loaded = 0;
const totalImages = Object.keys(spritePaths).length;
const keys = {};
let currentHero = 'brish';
let currentLevel = 0;
let cameraX = 0;
let gameWon = false;
let inCar = false;
let carX = 0;
let carY = 0;
let carVx = 0;

const gravity = 0.7;

const levels = [
  {
    name: 'Lego Land',
    theme: { sky: '#dff1ff', ground: '#8ecf6d' },
    groundY: 510,
    spawn: { x: 60, y: 420 },
    carSpawn: { x: 180, y: 460 },
    goal: { x: 2800, y: 420, w: 50, h: 90 },
    platforms: [
      { x: 0, y: 510, w: 3000, h: 90, type: 'ground' },
      { x: 280, y: 420, w: 140, h: 24, type: 'lego' },
      { x: 500, y: 365, w: 120, h: 24, type: 'lego' },
      { x: 720, y: 315, w: 110, h: 24, type: 'lego' },
      { x: 950, y: 395, w: 150, h: 24, type: 'lego' },
      { x: 1250, y: 340, w: 130, h: 24, type: 'lego' },
      { x: 1550, y: 275, w: 140, h: 24, type: 'lego' },
      { x: 1800, y: 355, w: 160, h: 24, type: 'lego' },
      { x: 2100, y: 300, w: 180, h: 24, type: 'lego' },
      { x: 2450, y: 380, w: 150, h: 24, type: 'lego' }
    ],
    hazards: [
      { x: 1100, y: 510, w: 70, h: 40, type: 'spikes' },
      { x: 2000, y: 510, w: 90, h: 40, type: 'spikes' }
    ],
    enemies: [
      { x: 600, y: 470, w: 40, h: 40, dir: 1, speed: 1.1, minX: 450, maxX: 750, hp: 2, color: '#e53935' },
      { x: 1400, y: 470, w: 50, h: 45, dir: -1, speed: 0.9, minX: 1200, maxX: 1600, hp: 3, color: '#8e24aa' },
      { x: 2200, y: 470, w: 40, h: 40, dir: 1, speed: 1.3, minX: 2050, maxX: 2400, hp: 2, color: '#e53935' }
    ]
  },
  {
    name: 'Beach World',
    theme: { sky: '#87d7ff', ground: '#f5d28a' },
    groundY: 500,
    spawn: { x: 60, y: 420 },
    carSpawn: { x: 200, y: 450 },
    goal: { x: 2900, y: 405, w: 55, h: 105 },
    platforms: [
      { x: 0, y: 500, w: 650, h: 100, type: 'sand' },
      { x: 790, y: 500, w: 530, h: 100, type: 'sand' },
      { x: 1450, y: 500, w: 450, h: 100, type: 'sand' },
      { x: 2050, y: 500, w: 500, h: 100, type: 'sand' },
      { x: 2700, y: 500, w: 400, h: 100, type: 'sand' },
      { x: 300, y: 400, w: 140, h: 18, type: 'shell' },
      { x: 980, y: 360, w: 150, h: 18, type: 'shell' },
      { x: 1650, y: 330, w: 160, h: 18, type: 'shell' },
      { x: 2300, y: 370, w: 140, h: 18, type: 'shell' }
    ],
    hazards: [
      { x: 650, y: 540, w: 140, h: 60, type: 'water' },
      { x: 1320, y: 540, w: 130, h: 60, type: 'water' },
      { x: 1900, y: 540, w: 150, h: 60, type: 'water' },
      { x: 2550, y: 540, w: 150, h: 60, type: 'water' }
    ],
    enemies: [
      { x: 400, y: 455, w: 45, h: 40, dir: 1, speed: 1.15, minX: 250, maxX: 550, hp: 2, color: '#00897b' },
      { x: 1100, y: 455, w: 50, h: 45, dir: -1, speed: 0.85, minX: 850, maxX: 1250, hp: 3, color: '#f4511e' },
      { x: 1800, y: 455, w: 45, h: 40, dir: -1, speed: 1.3, minX: 1500, maxX: 1850, hp: 2, color: '#00897b' },
      { x: 2400, y: 455, w: 50, h: 45, dir: 1, speed: 1.0, minX: 2200, maxX: 2600, hp: 3, color: '#f4511e' }
    ]
  },
  {
    name: 'Mini World',
    theme: { sky: '#f4ecff', ground: '#dadada' },
    groundY: 515,
    spawn: { x: 60, y: 430 },
    carSpawn: { x: 190, y: 465 },
    goal: { x: 2900, y: 425, w: 55, h: 90 },
    platforms: [
      { x: 0, y: 515, w: 3100, h: 85, type: 'mini' },
      { x: 300, y: 430, w: 130, h: 20, type: 'mini' },
      { x: 560, y: 365, w: 130, h: 20, type: 'mini' },
      { x: 800, y: 310, w: 130, h: 20, type: 'mini' },
      { x: 1100, y: 390, w: 150, h: 20, type: 'mini' },
      { x: 1400, y: 330, w: 150, h: 20, type: 'mini' },
      { x: 1700, y: 270, w: 170, h: 20, type: 'mini' },
      { x: 2050, y: 345, w: 170, h: 20, type: 'mini' },
      { x: 2400, y: 400, w: 160, h: 20, type: 'mini' }
    ],
    hazards: [
      { x: 1000, y: 515, w: 50, h: 45, type: 'tiny-spikes' },
      { x: 1600, y: 515, w: 80, h: 45, type: 'tiny-spikes' },
      { x: 2300, y: 515, w: 60, h: 45, type: 'tiny-spikes' }
    ],
    enemies: [
      { x: 650, y: 475, w: 30, h: 30, dir: 1, speed: 1.5, minX: 500, maxX: 800, hp: 1, color: '#7b1fa2' },
      { x: 1250, y: 475, w: 35, h: 35, dir: -1, speed: 1.2, minX: 1100, maxX: 1400, hp: 2, color: '#c62828' },
      { x: 1900, y: 475, w: 30, h: 30, dir: 1, speed: 1.6, minX: 1750, maxX: 2050, hp: 1, color: '#7b1fa2' },
      { x: 2550, y: 475, w: 35, h: 35, dir: -1, speed: 1.3, minX: 2400, maxX: 2700, hp: 2, color: '#c62828' }
    ]
  }
];

const player = {
  x: 60, y: 400, w: 72, h: 120,
  vx: 0, vy: 0,
  speed: 4.2, jump: -13,
  onGround: false, facing: 1,
  cooldown1: 0, cooldown2: 0,
  attackFlash: 0
};

let projectiles = [];
let particles = [];
let enemies = [];

function loadImages() {
  Object.entries(spritePaths).forEach(([key, path]) => {
    const img = new Image();
    img.onload = () => { loaded++; };
    img.onerror = () => { loaded++; };
    img.src = path;
    images[key] = img;
  });
}

function cloneEnemies(li) {
  return levels[li].enemies.map(e => ({ ...e, alive: true }));
}

function resetLevel(li = currentLevel) {
  currentLevel = li;
  const level = levels[li];
  player.x = level.spawn.x;
  player.y = level.spawn.y;
  player.vx = 0; player.vy = 0;
  player.onGround = false;
  player.cooldown1 = 0; player.cooldown2 = 0;
  player.attackFlash = 0;
  cameraX = 0;
  projectiles = []; particles = [];
  enemies = cloneEnemies(li);
  gameWon = false;
  inCar = false;
  carX = level.carSpawn.x;
  carY = level.carSpawn.y;
  carVx = 0;
  updateUI();
}

function updateUI() {
  heroNameEl.textContent = `Hero: ${currentHero === 'brish' ? 'Brish' : 'Marko'}`;
  levelNameEl.textContent = `Level: ${levels[currentLevel].name}`;
  if (currentHero === 'brish') {
    messageEl.textContent = 'J = Mega Punch | K = Ground Smash | E = Car';
  } else {
    messageEl.textContent = 'J = Sharp Shoe Dash | K = Magic Flower | E = Car';
  }
}

function rectsOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function spawnParticles(x, y, color, count) {
  for (let i = 0; i < count; i++) {
    particles.push({
      x, y,
      vx: (Math.random() - 0.5) * 5,
      vy: (Math.random() - 0.5) * 5,
      life: 25 + Math.random() * 20,
      color
    });
  }
}

function usePower1() {
  if (player.cooldown1 > 0) return;
  if (currentHero === 'brish') {
    player.attackFlash = 10;
    const hit = { x: player.x + (player.facing > 0 ? player.w - 10 : -90), y: player.y + 20, w: 100, h: 70 };
    enemies.forEach(e => {
      if (e.alive && rectsOverlap(hit, e)) {
        e.hp -= 2; e.x += 40 * player.facing;
        spawnParticles(e.x + e.w / 2, e.y + 20, '#ff8a65', 8);
        if (e.hp <= 0) e.alive = false;
      }
    });
  } else {
    player.vx = 12 * player.facing;
    player.attackFlash = 8;
    const hit = { x: player.x + (player.facing > 0 ? player.w - 10 : -70), y: player.y + 10, w: 80, h: 90 };
    enemies.forEach(e => {
      if (e.alive && rectsOverlap(hit, e)) {
        e.hp -= 2;
        spawnParticles(e.x + e.w / 2, e.y + 20, '#ab47bc', 8);
        if (e.hp <= 0) e.alive = false;
      }
    });
  }
  player.cooldown1 = 28;
}

function usePower2() {
  if (player.cooldown2 > 0) return;
  if (currentHero === 'brish') {
    const slam = { x: player.x - 40, y: player.y + player.h - 20, w: player.w + 80, h: 35 };
    enemies.forEach(e => {
      if (e.alive && rectsOverlap(slam, e)) {
        e.hp--; spawnParticles(e.x + e.w / 2, e.y + e.h / 2, '#ffca28', 10);
        if (e.hp <= 0) e.alive = false;
      }
    });
  } else {
    projectiles.push({
      x: player.x + player.w / 2, y: player.y + 28,
      vx: 8 * player.facing, vy: 0, r: 14, life: 100
    });
    spawnParticles(player.x + player.w / 2, player.y + 28, '#7e57c2', 8);
  }
  player.cooldown2 = 42;
}

function update() {
  const level = levels[currentLevel];
  if (gameWon) return;

  if (player.cooldown1 > 0) player.cooldown1--;
  if (player.cooldown2 > 0) player.cooldown2--;
  if (player.attackFlash > 0) player.attackFlash--;

  if (inCar) {
    updateCar(level);
  } else {
    updateOnFoot(level);
  }

  // enemies
  enemies.forEach(e => {
    if (!e.alive) return;
    e.x += e.dir * e.speed;
    if (e.x < e.minX || e.x > e.maxX) e.dir *= -1;

    const target = inCar
      ? { x: carX, y: carY, w: 90, h: 50 }
      : player;

    if (rectsOverlap(target, e)) {
      if (!inCar && player.vy > 1 && player.y + player.h - 18 < e.y + 25) {
        e.hp--; player.vy = -9;
        spawnParticles(e.x + e.w / 2, e.y, '#66bb6a', 8);
        if (e.hp <= 0) e.alive = false;
      } else if (inCar && Math.abs(carVx) > 2) {
        e.hp -= 2;
        spawnParticles(e.x + e.w / 2, e.y, '#ffab40', 12);
        if (e.hp <= 0) e.alive = false;
      } else if (!inCar) {
        resetLevel(currentLevel);
      }
    }
  });

  // projectiles
  projectiles.forEach(p => {
    p.x += p.vx; p.life--;
    enemies.forEach(e => {
      if (e.alive && rectsOverlap({ x: p.x - p.r, y: p.y - p.r, w: p.r * 2, h: p.r * 2 }, e)) {
        e.hp -= 2; p.life = 0;
        spawnParticles(e.x + e.w / 2, e.y + e.h / 2, '#42a5f5', 10);
        if (e.hp <= 0) e.alive = false;
      }
    });
  });
  projectiles = projectiles.filter(p => p.life > 0 && p.x > -100 && p.x < 3500);

  // particles
  particles.forEach(p => { p.x += p.vx; p.y += p.vy; p.life--; });
  particles = particles.filter(p => p.life > 0);

  // goal
  const goalTarget = inCar ? { x: carX, y: carY, w: 90, h: 50 } : player;
  if (rectsOverlap(goalTarget, level.goal)) {
    gameWon = true;
    messageEl.textContent = `${level.name} complete! 🎉`;
  }

  // camera
  const cx = inCar ? carX : player.x;
  cameraX = Math.max(0, Math.min(cx - 300, level.goal.x - 700));

  // fall death
  if (player.y > canvas.height + 300 || (inCar && carY > canvas.height + 300)) {
    resetLevel(currentLevel);
  }
}

function updateOnFoot(level) {
  let move = 0;
  if (keys['arrowleft'] || keys['a']) move -= 1;
  if (keys['arrowright'] || keys['d']) move += 1;
  player.vx = move * player.speed;
  if (move !== 0) player.facing = move > 0 ? 1 : -1;

  player.vy += gravity;
  player.x += player.vx;
  resolvePlatforms('x', level);
  player.y += player.vy;
  player.onGround = false;
  resolvePlatforms('y', level);

  for (const h of level.hazards) {
    if (rectsOverlap(player, h)) { resetLevel(currentLevel); return; }
  }
}

function updateCar(level) {
  let accel = 0;
  if (keys['arrowleft'] || keys['a']) accel -= 0.5;
  if (keys['arrowright'] || keys['d']) accel += 0.5;
  carVx += accel;
  carVx *= 0.96; // friction
  carX += carVx;

  // keep car on ground
  let onPlatform = false;
  for (const p of level.platforms) {
    if (carX + 90 > p.x && carX < p.x + p.w && carY + 50 >= p.y - 5 && carY + 50 <= p.y + 20) {
      carY = p.y - 50;
      onPlatform = true;
    }
  }
  if (!onPlatform) carY += 4; // fall

  // sync player pos to car
  player.x = carX + 10;
  player.y = carY - 40;
  player.facing = carVx >= 0 ? 1 : -1;

  for (const h of level.hazards) {
    if (rectsOverlap({ x: carX, y: carY, w: 90, h: 50 }, h)) { resetLevel(currentLevel); return; }
  }
}

function resolvePlatforms(axis, level) {
  level.platforms.forEach(p => {
    if (!rectsOverlap(player, p)) return;
    if (axis === 'x') {
      if (player.vx > 0) player.x = p.x - player.w;
      if (player.vx < 0) player.x = p.x + p.w;
    } else {
      if (player.vy > 0) {
        player.y = p.y - player.h;
        player.vy = 0; player.onGround = true;
      } else if (player.vy < 0) {
        player.y = p.y + p.h; player.vy = 0;
      }
    }
  });
}

// ---- Drawing ----

function drawBackground(level) {
  ctx.fillStyle = level.theme.sky;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = 'rgba(255,255,255,0.6)';
  ctx.lineWidth = 3;
  for (let i = 0; i < 8; i++) {
    const x = (i * 160) - (cameraX * 0.15 % 160);
    const y = 60 + (i % 3) * 50;
    ctx.beginPath();
    ctx.arc(x, y, 26, Math.PI * 0.2, Math.PI * 1.7);
    ctx.stroke();
  }
  if (currentLevel === 0) drawLegoBack(level);
  if (currentLevel === 1) drawBeachBack(level);
  if (currentLevel === 2) drawMiniBack(level);
}

function drawLegoBack(level) {
  ctx.save(); ctx.translate(-cameraX * 0.4, 0);
  for (let i = 0; i < 10; i++) {
    const x = 120 + i * 280;
    const h = 100 + (i % 3) * 40;
    drawBrickBlock(x, level.groundY - h, 85, h, ['#ff9f43', '#ffcc66', '#ff6b6b'][i % 3]);
  }
  ctx.restore();
}

function drawBeachBack(level) {
  ctx.save(); ctx.translate(-cameraX * 0.3, 0);
  ctx.fillStyle = '#4fc3f7'; ctx.fillRect(0, 370, 3200, 80);
  ctx.fillStyle = '#29b6f6'; ctx.fillRect(0, 420, 3200, 60);
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 4;
  for (let i = 0; i < 15; i++) {
    ctx.beginPath();
    ctx.arc(50 + i * 190, 400 + (i % 2) * 16, 32, Math.PI * 0.1, Math.PI * 0.9);
    ctx.stroke();
  }
  ctx.restore();
}

function drawMiniBack(level) {
  ctx.save(); ctx.translate(-cameraX * 0.2, 0);
  ctx.strokeStyle = '#7e57c2'; ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(80, 80);
  ctx.bezierCurveTo(160, 20, 220, 140, 300, 60);
  ctx.bezierCurveTo(380, 10, 420, 120, 520, 40);
  ctx.stroke();
  for (let i = 0; i < 20; i++) {
    drawStickPerson(180 + i * 130, 440 + (i % 3) * 12, 0.6);
  }
  ctx.restore();
}

function drawBrickBlock(x, y, w, h, color) {
  ctx.fillStyle = color; ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = '#8d5a2b'; ctx.lineWidth = 3;
  ctx.strokeRect(x, y, w, h);
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  for (let r = 0; r < Math.max(1, Math.floor(h / 40)); r++) {
    for (let c = 0; c < 2; c++) {
      ctx.beginPath();
      ctx.arc(x + 22 + c * 34, y + 16 + r * 32, 6, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawStickPerson(x, y, s = 1) {
  ctx.strokeStyle = '#3e2723'; ctx.lineWidth = 2 * s;
  ctx.beginPath();
  ctx.arc(x, y - 16 * s, 5 * s, 0, Math.PI * 2);
  ctx.moveTo(x, y - 11 * s); ctx.lineTo(x, y + 10 * s);
  ctx.moveTo(x - 8 * s, y - 4 * s); ctx.lineTo(x + 8 * s, y - 1 * s);
  ctx.moveTo(x, y + 10 * s); ctx.lineTo(x - 6 * s, y + 22 * s);
  ctx.moveTo(x, y + 10 * s); ctx.lineTo(x + 6 * s, y + 22 * s);
  ctx.stroke();
}

function drawPlatforms(level) {
  level.platforms.forEach(p => {
    const x = p.x - cameraX;
    if (x + p.w < -50 || x > canvas.width + 50) return;
    const colors = {
      lego: '#ffb74d', sand: '#f4d06f', shell: '#ffe0b2',
      mini: '#d1c4e9', ground: level.theme.ground
    };
    ctx.fillStyle = colors[p.type] || level.theme.ground;
    ctx.fillRect(x, p.y, p.w, p.h);
    ctx.strokeStyle = '#8d5a2b'; ctx.lineWidth = 2;
    ctx.strokeRect(x, p.y, p.w, p.h);
  });
}

function drawHazards(level) {
  level.hazards.forEach(h => {
    const x = h.x - cameraX;
    if (h.type === 'water') {
      ctx.fillStyle = '#1e88e5'; ctx.fillRect(x, h.y, h.w, h.h);
      ctx.strokeStyle = '#e3f2fd'; ctx.lineWidth = 3;
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.arc(x + 25 + i * 35, h.y + 12, 14, Math.PI, 0);
        ctx.stroke();
      }
    } else {
      ctx.fillStyle = '#444';
      for (let i = 0; i < h.w; i += 14) {
        ctx.beginPath();
        ctx.moveTo(x + i, h.y + h.h);
        ctx.lineTo(x + i + 7, h.y);
        ctx.lineTo(x + i + 14, h.y + h.h);
        ctx.closePath(); ctx.fill();
      }
    }
  });
}

function drawGoal(level) {
  const x = level.goal.x - cameraX;
  ctx.fillStyle = '#fff8e1'; ctx.fillRect(x, level.goal.y, level.goal.w, level.goal.h);
  ctx.strokeStyle = '#8d6e63'; ctx.lineWidth = 4;
  ctx.strokeRect(x, level.goal.y, level.goal.w, level.goal.h);
  ctx.fillStyle = '#7c4dff'; ctx.fillRect(x + 8, level.goal.y + 10, 24, 18);
  ctx.fillStyle = '#2e7d32'; ctx.fillRect(x + 20, level.goal.y - 20, 6, 22);
}

function drawEnemy(e) {
  const x = e.x - cameraX;
  ctx.fillStyle = e.color;
  ctx.beginPath();
  ctx.arc(x + e.w / 2, e.y + e.h / 2, e.w / 2, 0, Math.PI * 2);
  ctx.fill();
  // angry eyes
  ctx.fillStyle = '#fff';
  ctx.fillRect(x + e.w * 0.2, e.y + e.h * 0.25, 6, 5);
  ctx.fillRect(x + e.w * 0.6, e.y + e.h * 0.25, 6, 5);
  ctx.fillStyle = '#000';
  ctx.fillRect(x + e.w * 0.25, e.y + e.h * 0.3, 3, 3);
  ctx.fillRect(x + e.w * 0.65, e.y + e.h * 0.3, 3, 3);
  // hp
  ctx.fillStyle = '#ef5350';
  for (let i = 0; i < e.hp; i++) {
    ctx.fillRect(x + i * 12, e.y - 10, 8, 6);
  }
}

function drawCar() {
  const cx = carX - cameraX;
  const img = currentHero === 'brish' ? images.brishCar : images.markoCar;
  if (img && img.complete) {
    ctx.save();
    if (carVx < -0.5) {
      ctx.translate(cx + 45, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(img, -45, carY, 90, 50);
    } else {
      ctx.drawImage(img, cx, carY, 90, 50);
    }
    ctx.restore();
  } else {
    ctx.fillStyle = '#78909c';
    ctx.fillRect(cx, carY, 90, 50);
    ctx.fillStyle = '#263238';
    ctx.beginPath();
    ctx.arc(cx + 20, carY + 50, 10, 0, Math.PI * 2);
    ctx.arc(cx + 70, carY + 50, 10, 0, Math.PI * 2);
    ctx.fill();
  }

  if (!inCar) {
    // "press E" prompt
    const dist = Math.hypot(player.x - carX, player.y - carY);
    if (dist < 120) {
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.font = 'bold 14px Arial';
      ctx.fillText('Press E', cx + 12, carY - 8);
    }
  }
}

function updateBrishAnim() {
  // Determine animation state
  let newState = 'idle';
  if (player.attackFlash > 0) {
    newState = player.cooldown1 < 20 ? 'punch1' : 'punch2';
  } else if (!player.onGround && player.vy < 0) {
    newState = 'jump';
  } else if (!player.onGround && player.vy > 0) {
    newState = 'fall';
  } else if (Math.abs(player.vx) > 0.5) {
    newState = 'walk';
  }
  if (newState !== brishAnimState) {
    brishAnimState = newState;
    brishAnimFrame = 0;
    brishAnimTimer = 0;
  }
  brishAnimTimer++;
  const anim = BRISH_ANIMS[brishAnimState] || [0];
  const speed = brishAnimState === 'walk' ? 8 : brishAnimState === 'punch1' ? 5 : 12;
  if (brishAnimTimer >= speed) {
    brishAnimTimer = 0;
    brishAnimFrame = (brishAnimFrame + 1) % anim.length;
  }
}

function drawPlayer() {
  if (inCar) return;
  const x = player.x - cameraX;

  if (player.attackFlash > 0) {
    ctx.fillStyle = currentHero === 'brish' ? 'rgba(255,138,101,0.25)' : 'rgba(171,71,188,0.22)';
    ctx.beginPath();
    ctx.arc(x + player.w / 2, player.y + player.h / 2, 72, 0, Math.PI * 2);
    ctx.fill();
  }

  // Use animated strip for Brish if loaded
  if (currentHero === 'brish' && images.brishStrip && images.brishStrip.complete && images.brishStrip.naturalWidth > 0) {
    updateBrishAnim();
    const anim = BRISH_ANIMS[brishAnimState] || [0];
    const frameIdx = anim[brishAnimFrame % anim.length];
    const sx = frameIdx * BRISH_FRAME_W;
    const sy = 0;
    const drawW = player.w;
    const drawH = player.h;

    ctx.save();
    if (player.facing < 0) {
      ctx.translate(x + drawW / 2, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(images.brishStrip, sx, sy, BRISH_FRAME_W, BRISH_FRAME_H, -drawW / 2, player.y, drawW, drawH);
    } else {
      ctx.drawImage(images.brishStrip, sx, sy, BRISH_FRAME_W, BRISH_FRAME_H, x, player.y, drawW, drawH);
    }
    ctx.restore();
  } else {
    // Fallback: static sprite
    const img = currentHero === 'brish' ? images.brish : images.marko;
    ctx.save();
    if (player.facing < 0) {
      ctx.translate(x + player.w / 2, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(img, -player.w / 2, player.y, player.w, player.h);
    } else {
      ctx.drawImage(img, x, player.y, player.w, player.h);
    }
    ctx.restore();
  }
}

function drawProjectiles() {
  projectiles.forEach(p => {
    ctx.fillStyle = '#ab47bc';
    ctx.beginPath();
    ctx.arc(p.x - cameraX, p.y, p.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ede7f6'; ctx.lineWidth = 3;
    ctx.stroke();
  });
}

function drawParticles() {
  particles.forEach(p => {
    ctx.globalAlpha = Math.max(0, p.life / 40);
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x - cameraX, p.y, 4, 4);
  });
  ctx.globalAlpha = 1;
}

function drawHud() {
  ctx.fillStyle = 'rgba(0,0,0,0.15)';
  ctx.fillRect(16, 16, 240, 90);
  ctx.fillStyle = '#fff'; ctx.font = 'bold 22px Arial';
  ctx.fillText(levels[currentLevel].name, 28, 42);
  ctx.font = '16px Arial';
  ctx.fillText((currentHero === 'brish' ? 'Brish' : 'Marko') + (inCar ? ' 🚗' : ''), 28, 66);
  ctx.fillText(`Enemies: ${enemies.filter(e => e.alive).length}`, 28, 88);
  ctx.fillText(inCar ? 'E to exit car' : '', 28, 100);

  if (gameWon) {
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#fff8e1'; ctx.font = 'bold 48px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Level Complete! 🎉', canvas.width / 2, 250);
    ctx.font = '24px Arial';
    ctx.fillText('Pick another level or press R to replay.', canvas.width / 2, 300);
    ctx.textAlign = 'left';
  }
}

function draw() {
  const level = levels[currentLevel];
  drawBackground(level);
  drawPlatforms(level);
  drawHazards(level);
  drawGoal(level);
  enemies.forEach(e => e.alive && drawEnemy(e));
  drawCar();
  drawProjectiles();
  drawPlayer();
  drawParticles();
  drawHud();
}

function loop() {
  if (loaded >= totalImages) { update(); draw(); }
  else {
    ctx.fillStyle = '#fff8ef'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#5d4037'; ctx.font = 'bold 32px Arial';
    ctx.fillText('Loading Brish & Marko...', 280, 280);
  }
  requestAnimationFrame(loop);
}

// ---- Input ----

window.addEventListener('keydown', (e) => {
  const key = e.key.toLowerCase();
  keys[key] = true;
  if ((key === 'w' || key === 'arrowup' || key === ' ') && !inCar && player.onGround && !gameWon) {
    player.vy = player.jump; player.onGround = false;
  }
  if (key === 'j' && !gameWon && !inCar) usePower1();
  if (key === 'k' && !gameWon && !inCar) usePower2();
  if (key === 'r') resetLevel(currentLevel);
  if (key === 'e' && !gameWon) {
    if (inCar) {
      inCar = false;
      player.x = carX + 100;
      player.y = carY - player.h;
      player.vy = 0;
    } else {
      const dist = Math.hypot(player.x - carX, player.y - carY);
      if (dist < 120) { inCar = true; carVx = 0; }
    }
  }
});

window.addEventListener('keyup', (e) => { keys[e.key.toLowerCase()] = false; });

document.querySelectorAll('.hero-card').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.hero-card').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    currentHero = btn.dataset.hero;
    resetLevel(currentLevel);
  });
});

document.querySelectorAll('.level-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.level-btn').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    resetLevel(Number(btn.dataset.level));
  });
});

loadImages();
resetLevel(0);
updateUI();
loop();
