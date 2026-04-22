const canvas = document.getElementById('c');
const ctx = canvas.getContext('2d');

function fit() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.floor(window.innerWidth * dpr);
  canvas.height = Math.floor(window.innerHeight * dpr);
  canvas.style.width = window.innerWidth + 'px';
  canvas.style.height = window.innerHeight + 'px';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
window.addEventListener('resize', fit);
fit();

const W = () => window.innerWidth;
const H = () => window.innerHeight;
const TAU = Math.PI * 2;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rand = (a, b) => a + Math.random() * (b - a);
const dist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);

const images = {};
const imageSources = {
  brishStrip: 'sprites/brish-strip.png',
  monkoStrip: 'sprites/monko-strip.png',
  brish: 'sprites/brish.png',
  monko: 'sprites/monko.png'
};
let assetsLoaded = 0;
const assetsTotal = Object.keys(imageSources).length;
for (const [k, src] of Object.entries(imageSources)) {
  const img = new Image();
  img.onload = () => assetsLoaded++;
  img.onerror = () => assetsLoaded++;
  img.src = src;
  images[k] = img;
}

const HEROES = {
  brish: {
    name: 'Brish',
    color: '#ff8a65',
    color2: '#ffca28',
    autoRange: 90,
    autoCd: 24,
    autoDamage: 12,
    specialName: 'Crown Slam'
  },
  monko: {
    name: 'Monko',
    color: '#ab47bc',
    color2: '#42a5f5',
    autoRange: 360,
    autoCd: 20,
    autoDamage: 10,
    specialName: 'Flower Burst'
  }
};

const WORLDS = [
  {
    name: 'Lego Land',
    emoji: '🧱',
    sky1: '#9dd6ff',
    sky2: '#4f8cff',
    ground: '#91d16f',
    decor1: '#ffb74d',
    decor2: '#fb8c00'
  },
  {
    name: 'Beach World',
    emoji: '🏖️',
    sky1: '#8fe8ff',
    sky2: '#0089d1',
    ground: '#f2d28f',
    decor1: '#4fc3f7',
    decor2: '#0288d1'
  },
  {
    name: 'Mini World',
    emoji: '🔬',
    sky1: '#d8c5ff',
    sky2: '#6a3dd9',
    ground: '#d9d9f6',
    decor1: '#ba68c8',
    decor2: '#7b1fa2'
  }
];

const state = {
  scene: 'menu',
  hero: 'brish',
  worldIndex: 0,
  distance: 0,
  score: 0,
  best: 0,
  speed: 6,
  baseSpeed: 6,
  enemyTimer: 0,
  obstacleTimer: 0,
  particles: [],
  projectiles: [],
  enemies: [],
  obstacles: [],
  player: null,
  menuPulse: 0,
  tutorialDismissed: false,
  pointerDown: false,
  pointerX: 0,
  pointerY: 0,
  pressX: 0,
  pressY: 0,
  swipeTriggered: false,
  justPressed: false,
  cameraShake: 0,
  ui: {}
};

function makePlayer() {
  return {
    x: W() * 0.25,
    y: H() * 0.68,
    w: 82,
    h: 110,
    vy: 0,
    onGround: true,
    holdJump: false,
    jumpBuffer: 0,
    attackCd: 0,
    specialCd: 0,
    hp: 100,
    maxHp: 100,
    animTimer: 0,
    animFrame: 0,
    animState: 'idle',
    attackFlash: 0,
    hurt: 0,
    invuln: 0
  };
}

function resetGame() {
  state.distance = 0;
  state.score = 0;
  state.speed = state.baseSpeed = 6;
  state.enemyTimer = 35;
  state.obstacleTimer = 45;
  state.particles = [];
  state.projectiles = [];
  state.enemies = [];
  state.obstacles = [];
  state.player = makePlayer();
  state.cameraShake = 0;
  state.worldIndex = 0;
  state.scene = 'playing';
}

function burst(x, y, color, count = 10, speed = 4) {
  for (let i = 0; i < count; i++) {
    const a = Math.random() * TAU;
    const s = Math.random() * speed;
    state.particles.push({
      x, y,
      vx: Math.cos(a) * s,
      vy: Math.sin(a) * s,
      life: rand(15, 35),
      color,
      size: rand(2, 5)
    });
  }
}

function shake(v) { state.cameraShake = Math.max(state.cameraShake, v); }

function groundY() { return H() * 0.74; }

function screenX(worldX) { return worldX - state.distance + W() * 0.22; }

function heroAnim(hero, player) {
  if (player.attackFlash > 0) return hero === 'brish' ? [6, 7] : [6, 7];
  if (!player.onGround) return [player.vy < 0 ? 4 : 5];
  if (state.speed > 6.6) return [1, 2, 3, 2];
  return [0];
}

function spawnEnemy() {
  const world = WORLDS[state.worldIndex];
  const type = Math.random();
  const gx = state.distance + W() + rand(140, 300);
  const gy = groundY();
  if (type < 0.65) {
    state.enemies.push({
      type: 'runner',
      x: gx,
      y: gy,
      w: 42,
      h: 42,
      hp: 20 + Math.floor(state.distance / 500),
      maxHp: 20 + Math.floor(state.distance / 500),
      color: world.decor2,
      speed: rand(1.5, 2.8) + state.distance * 0.0003,
      hurt: 0,
      dead: false,
      attackCd: 0
    });
  } else {
    state.enemies.push({
      type: 'hopper',
      x: gx,
      y: gy - rand(70, 130),
      w: 38,
      h: 38,
      hp: 14 + Math.floor(state.distance / 600),
      maxHp: 14 + Math.floor(state.distance / 600),
      color: '#ef4444',
      speed: rand(2.0, 3.2) + state.distance * 0.0004,
      hurt: 0,
      dead: false,
      attackCd: 0,
      bob: rand(0, 1000)
    });
  }
}

function spawnObstacle() {
  const world = WORLDS[state.worldIndex];
  const gx = state.distance + W() + rand(220, 420);
  const choice = Math.random();
  const diff = Math.min(1, state.distance / 8000); // difficulty 0-1
  if (choice < 0.3) {
    // single block
    state.obstacles.push({ type: 'block', x: gx, y: groundY() - 40, w: rand(40, 70 + diff * 30), h: rand(40, 80 + diff * 30), color: world.decor1 });
  } else if (choice < 0.45) {
    // gap
    state.obstacles.push({ type: 'gap', x: gx, y: groundY(), w: rand(70, 110 + diff * 40), h: 40 });
  } else if (choice < 0.6) {
    // tall wall
    state.obstacles.push({ type: 'high', x: gx, y: groundY() - 120, w: rand(36, 50), h: rand(80, 130), color: world.decor2 });
  } else if (choice < 0.75) {
    // double block staircase
    state.obstacles.push({ type: 'block', x: gx, y: groundY() - 40, w: 55, h: 50, color: world.decor1 });
    state.obstacles.push({ type: 'block', x: gx + 60, y: groundY() - 40, w: 55, h: 90, color: world.decor2 });
  } else if (choice < 0.88) {
    // low + high combo (must jump and time)
    state.obstacles.push({ type: 'block', x: gx, y: groundY() - 40, w: 70, h: 50, color: world.decor1 });
    state.obstacles.push({ type: 'high', x: gx + 130, y: groundY() - 130, w: 45, h: 100, color: world.decor2 });
  } else {
    // triple gap with platforms
    state.obstacles.push({ type: 'gap', x: gx, y: groundY(), w: 80, h: 40 });
    state.obstacles.push({ type: 'block', x: gx + 80, y: groundY() - 40, w: 50, h: 50, color: world.decor1 });
    state.obstacles.push({ type: 'gap', x: gx + 130, y: groundY(), w: 80, h: 40 });
  }
  // Sometimes spawn an enemy near the obstacle
  if (diff > 0.3 && Math.random() < 0.35) {
    spawnEnemy();
  }
}

function useSpecial() {
  const p = state.player;
  if (p.specialCd > 0) return;
  const hero = HEROES[state.hero];
  if (state.hero === 'brish') {
    p.attackFlash = 14;
    shake(10);
    burst(p.x + 20, p.y - 30, hero.color2, 26, 6);
    for (const e of state.enemies) {
      if (e.dead) continue;
      if (Math.abs(e.x - state.distance - W() * 0.22) < 220) {
        e.hp -= 30;
        e.hurt = 10;
        if (e.hp <= 0) {
          e.dead = true;
          state.score += 30;
          burst(screenX(e.x), e.y - e.h * 0.5, hero.color, 18, 5);
        }
      }
    }
    for (const o of state.obstacles) {
      if (o.type === 'block' && Math.abs(o.x - state.distance - W() * 0.22) < 180) {
        o.dead = true;
        burst(screenX(o.x), o.y - o.h * 0.5, hero.color2, 18, 5);
      }
    }
    p.specialCd = 260;
  } else {
    p.attackFlash = 12;
    shake(8);
    burst(p.x + 20, p.y - 50, hero.color2, 18, 5);
    for (let i = 0; i < 6; i++) {
      state.projectiles.push({
        x: state.distance + p.x,
        y: p.y - 56,
        vx: 9 + i * 0.6,
        vy: -2.5 + i * 0.9,
        life: 60,
        r: 9,
        damage: 16,
        color: hero.color2
      });
    }
    p.specialCd = 220;
  }
}

function autoAttack() {
  const p = state.player;
  const hero = HEROES[state.hero];
  if (p.attackCd > 0) return;

  let target = null;
  let best = Infinity;
  for (const e of state.enemies) {
    if (e.dead) continue;
    const dx = screenX(e.x) - p.x;
    const dy = e.y - p.y;
    const d = Math.hypot(dx, dy);
    if (dx > -30 && dx < hero.autoRange && d < best) {
      best = d;
      target = e;
    }
  }
  if (!target) return;

  p.attackFlash = 8;
  if (state.hero === 'brish') {
    target.hp -= hero.autoDamage;
    target.hurt = 8;
    burst(screenX(target.x), target.y - target.h * 0.5, hero.color, 10, 3.5);
    shake(4);
    if (target.hp <= 0) {
      target.dead = true;
      state.score += 12;
      burst(screenX(target.x), target.y - target.h * 0.5, hero.color2, 16, 4.5);
    }
    p.attackCd = hero.autoCd;
  } else {
    state.projectiles.push({
      x: state.distance + p.x + 10,
      y: p.y - 48,
      vx: 10,
      vy: clamp((target.y - (p.y - 48)) * 0.03, -2.2, 2.2),
      life: 70,
      r: 7,
      damage: hero.autoDamage,
      color: hero.color
    });
    p.attackCd = hero.autoCd;
  }
}

function updatePlaying() {
  const p = state.player;
  const gy = groundY();

  state.distance += state.speed;
  state.speed += 0.0008;
  state.worldIndex = Math.min(2, Math.floor(state.distance / 6000));

  // Jump physics
  if (p.onGround && state.justPressed) {
    p.vy = -13;
    p.onGround = false;
  }
  if (!p.onGround) {
    const holding = state.pointerDown && !state.swipeTriggered;
    const gravity = holding && p.vy < 0 ? 0.32 : 0.58;
    p.vy += gravity;
    p.y += p.vy;
    if (p.y >= gy) {
      p.y = gy;
      p.vy = 0;
      p.onGround = true;
    }
  } else {
    p.y = gy;
  }

  // Swipe down special
  if (state.pointerDown && !state.swipeTriggered) {
    const dy = state.pointerY - state.pressY;
    if (dy > 55) {
      state.swipeTriggered = true;
      useSpecial();
      state.tutorialDismissed = true;
    }
  }

  if (p.attackCd > 0) p.attackCd--;
  if (p.specialCd > 0) p.specialCd--;
  if (p.attackFlash > 0) p.attackFlash--;
  if (p.hurt > 0) p.hurt--;
  if (p.invuln > 0) p.invuln--;

  autoAttack();

  // Spawn
  state.enemyTimer--;
  state.obstacleTimer--;
  if (state.enemyTimer <= 0) {
    spawnEnemy();
    state.enemyTimer = Math.floor(rand(45, 80) - Math.min(30, state.distance / 350));
  }
  if (state.obstacleTimer <= 0) {
    spawnObstacle();
    state.obstacleTimer = Math.floor(rand(60, 100) - Math.min(40, state.distance / 400));
  }

  // Enemies
  for (const e of state.enemies) {
    if (e.dead) continue;
    e.x -= e.speed + state.speed * 0.2;
    if (e.type === 'hopper') {
      e.bob += 0.08;
      e.y += Math.sin(e.bob) * 1.4;
    }
    if (e.hurt > 0) e.hurt--;

    const ex = screenX(e.x);
    if (ex < -200) e.dead = true;
    if (dist(ex, e.y, p.x, p.y - 20) < (e.w * 0.5 + 26) && p.invuln <= 0) {
      p.hp -= e.type === 'tank' ? 16 : 10;
      p.hurt = 10;
      p.invuln = 26;
      burst(p.x, p.y - 40, '#ff5252', 12, 5);
      shake(8);
      e.dead = true;
      if (p.hp <= 0) {
        state.best = Math.max(state.best, Math.floor(state.distance));
        state.scene = 'gameover';
      }
    }
  }

  // Obstacles
  for (const o of state.obstacles) {
    if (o.dead) continue;
    o.x -= state.speed;
    const ox = screenX(o.x);
    if (ox < -200) o.dead = true;
    if (o.type === 'gap') {
      const playerFootX = p.x + 8;
      const gapX = ox;
      if (p.onGround && playerFootX > gapX && playerFootX < gapX + o.w) {
        p.onGround = false;
      }
    } else {
      const rx = ox;
      const ry = o.y;
      const rw = o.w;
      const rh = o.h;
      if (p.x + 20 > rx && p.x - 10 < rx + rw && p.y > ry - rh && p.y < ry + 10) {
        if (p.vy > 0 && p.y < ry - rh / 2) {
          p.y = ry - rh;
          p.vy = 0;
          p.onGround = true;
        } else if (p.invuln <= 0) {
          p.hp -= 12;
          p.hurt = 10;
          p.invuln = 30;
          burst(p.x, p.y - 40, '#ff7043', 10, 4);
          shake(7);
          if (p.hp <= 0) {
            state.best = Math.max(state.best, Math.floor(state.distance));
            state.scene = 'gameover';
          }
        }
      }
    }
  }

  // Projectiles
  for (const pr of state.projectiles) {
    pr.x += pr.vx;
    pr.y += pr.vy;
    pr.life--;
    for (const e of state.enemies) {
      if (e.dead) continue;
      const ex = screenX(e.x);
      if (dist(ex, e.y - e.h * 0.5, pr.x - state.distance + W() * 0.22, pr.y) < e.w * 0.5 + pr.r) {
        e.hp -= pr.damage;
        e.hurt = 8;
        pr.life = 0;
        burst(pr.x - state.distance + W() * 0.22, pr.y, pr.color, 10, 3.5);
        if (e.hp <= 0) {
          e.dead = true;
          state.score += 14;
          burst(ex, e.y - e.h * 0.5, pr.color, 14, 4.5);
        }
        break;
      }
    }
  }
  state.projectiles = state.projectiles.filter(pj => pj.life > 0);
  state.enemies = state.enemies.filter(e => !e.dead || screenX(e.x) > -150);
  state.obstacles = state.obstacles.filter(o => !o.dead || screenX(o.x) > -150);

  // Particles
  for (const prt of state.particles) {
    prt.x += prt.vx;
    prt.y += prt.vy;
    prt.vy += 0.08;
    prt.vx *= 0.98;
    prt.life--;
  }
  state.particles = state.particles.filter(p => p.life > 0);

  if (state.cameraShake > 0) {
    state.cameraShake *= 0.82;
    if (state.cameraShake < 0.5) state.cameraShake = 0;
  }
}

function update() {
  state.menuPulse += 0.04;
  if (state.scene === 'menu') {
    if (state.justPressed) handleMenuTap(state.pointerX, state.pointerY);
  } else if (state.scene === 'playing') {
    updatePlaying();
  } else {
    if (state.justPressed) handleEndTap(state.pointerX, state.pointerY);
    for (const prt of state.particles) {
      prt.x += prt.vx;
      prt.y += prt.vy;
      prt.life--;
    }
    state.particles = state.particles.filter(p => p.life > 0);
  }
  state.justPressed = false;
}

function drawRoundedRect(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawBackground() {
  const world = WORLDS[state.worldIndex];
  const g = ctx.createLinearGradient(0, 0, 0, H());
  g.addColorStop(0, world.sky1);
  g.addColorStop(1, world.sky2);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W(), H());

  // clouds / themed doodles
  ctx.save();
  ctx.globalAlpha = 0.23;
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 3;
  for (let i = 0; i < 6; i++) {
    const x = (i * 190 - (state.distance * 0.18) % 190);
    const y = 70 + (i % 3) * 55;
    ctx.beginPath();
    ctx.arc(x, y, 28, Math.PI * 0.2, Math.PI * 1.7);
    ctx.stroke();
  }
  ctx.restore();

  if (state.worldIndex === 0) drawLegoDecor(world);
  if (state.worldIndex === 1) drawBeachDecor(world);
  if (state.worldIndex === 2) drawMiniDecor(world);

  // ground
  ctx.fillStyle = world.ground;
  ctx.fillRect(0, groundY(), W(), H() - groundY());
  ctx.fillStyle = 'rgba(0,0,0,.08)';
  for (let i = 0; i < W(); i += 36) {
    ctx.fillRect((i - (state.distance % 36)), groundY() + 28, 18, 5);
  }
}

function drawLegoDecor(world) {
  ctx.save();
  ctx.translate(-(state.distance * 0.35) % 180, 0);
  for (let i = 0; i < 9; i++) {
    const x = 80 + i * 180;
    const h = 100 + (i % 3) * 28;
    ctx.fillStyle = i % 2 ? world.decor1 : world.decor2;
    ctx.fillRect(x, groundY() - h, 70, h);
    ctx.fillStyle = 'rgba(255,255,255,.4)';
    for (let r = 0; r < 2; r++) {
      ctx.beginPath(); ctx.arc(x + 20 + r * 25, groundY() - h + 18, 6, 0, TAU); ctx.fill();
    }
  }
  ctx.restore();
}

function drawBeachDecor(world) {
  ctx.save();
  ctx.translate(-(state.distance * 0.28) % 220, 0);
  ctx.fillStyle = world.decor1;
  ctx.fillRect(0, groundY() - 40, W() + 260, 28);
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 4;
  for (let i = 0; i < 9; i++) {
    ctx.beginPath();
    ctx.arc(i * 170 + 40, groundY() - 26, 28, Math.PI * 1.05, Math.PI * 1.95);
    ctx.stroke();
  }
  ctx.restore();
}

function drawMiniDecor(world) {
  ctx.save();
  ctx.translate(-(state.distance * 0.18) % 260, 0);
  ctx.strokeStyle = world.decor2;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(50, 96);
  ctx.bezierCurveTo(130, 40, 220, 150, 320, 82);
  ctx.bezierCurveTo(420, 30, 520, 120, 650, 52);
  ctx.stroke();
  for (let i = 0; i < 10; i++) {
    const x = 70 + i * 120;
    const y = groundY() + 10 + (i % 2) * 8;
    ctx.strokeStyle = '#3e2723';
    ctx.beginPath();
    ctx.arc(x, y - 14, 5, 0, TAU);
    ctx.moveTo(x, y - 9); ctx.lineTo(x, y + 12);
    ctx.moveTo(x - 9, y - 2); ctx.lineTo(x + 9, y - 1);
    ctx.moveTo(x, y + 12); ctx.lineTo(x - 7, y + 23);
    ctx.moveTo(x, y + 12); ctx.lineTo(x + 7, y + 23);
    ctx.stroke();
  }
  ctx.restore();
}

function drawObstacles() {
  const world = WORLDS[state.worldIndex];
  for (const o of state.obstacles) {
    const x = screenX(o.x);
    if (o.type === 'gap') {
      ctx.fillStyle = '#0b0f1a';
      ctx.fillRect(x, groundY(), o.w, H() - groundY());
      continue;
    }
    ctx.fillStyle = o.color || world.decor1;
    drawRoundedRect(x, o.y - o.h, o.w, o.h, 14);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.16)';
    drawRoundedRect(x + 4, o.y - o.h + 4, o.w - 8, 16, 10);
    ctx.fill();
  }
}

function drawEnemies() {
  for (const e of state.enemies) {
    if (e.dead) continue;
    const x = screenX(e.x);
    const y = e.y - e.h;
    ctx.fillStyle = 'rgba(0,0,0,.18)';
    ctx.beginPath();
    ctx.ellipse(x + e.w / 2, e.y + 6, e.w * 0.35, 8, 0, 0, TAU);
    ctx.fill();

    ctx.fillStyle = e.color;
    ctx.beginPath();
    ctx.arc(x + e.w / 2, y + e.h / 2, e.w / 2, 0, TAU);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.34)';
    ctx.beginPath();
    ctx.arc(x + e.w * 0.32, y + e.h * 0.28, 8, 0, TAU);
    ctx.fill();

    ctx.fillStyle = '#fff';
    ctx.fillRect(x + e.w * 0.22, y + e.h * 0.32, 6, 5);
    ctx.fillRect(x + e.w * 0.58, y + e.h * 0.32, 6, 5);
    ctx.fillStyle = '#000';
    ctx.fillRect(x + e.w * 0.25, y + e.h * 0.35, 3, 3);
    ctx.fillRect(x + e.w * 0.61, y + e.h * 0.35, 3, 3);

    ctx.fillStyle = 'rgba(0,0,0,.35)';
    drawRoundedRect(x - 4, y - 12, e.w + 8, 6, 4); ctx.fill();
    ctx.fillStyle = '#22c55e';
    drawRoundedRect(x - 4, y - 12, (e.w + 8) * (e.hp / e.maxHp), 6, 4); ctx.fill();

    if (e.hurt > 0) {
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(x + e.w / 2, y + e.h / 2, e.w / 2 + 5, 0, TAU);
      ctx.stroke();
    }
  }
}

function drawProjectiles() {
  for (const pr of state.projectiles) {
    const x = pr.x - state.distance + W() * 0.22;
    const y = pr.y;
    ctx.fillStyle = pr.color;
    ctx.beginPath();
    ctx.arc(x, y, pr.r, 0, TAU);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.4)';
    ctx.beginPath();
    ctx.arc(x - 2, y - 2, pr.r * 0.42, 0, TAU);
    ctx.fill();
  }
}

function drawParticles() {
  for (const prt of state.particles) {
    ctx.globalAlpha = clamp(prt.life / 30, 0, 1);
    ctx.fillStyle = prt.color;
    ctx.fillRect(prt.x, prt.y, prt.size, prt.size);
  }
  ctx.globalAlpha = 1;
}

function drawPlayer() {
  const p = state.player;
  let x = p.x;
  let y = p.y - p.h + 6;
  if (state.cameraShake > 0) {
    x += rand(-state.cameraShake, state.cameraShake);
    y += rand(-state.cameraShake, state.cameraShake);
  }

  ctx.fillStyle = 'rgba(0,0,0,.18)';
  ctx.beginPath();
  ctx.ellipse(x + p.w / 2, groundY() + 10, p.w * 0.3, 10, 0, 0, TAU);
  ctx.fill();

  if (p.attackFlash > 0) {
    ctx.fillStyle = state.hero === 'brish' ? 'rgba(255,138,101,.2)' : 'rgba(171,71,188,.22)';
    ctx.beginPath();
    ctx.arc(x + p.w / 2, y + p.h / 2, 48, 0, TAU);
    ctx.fill();
  }

  const anim = heroAnim(state.hero, p);
  const frame = anim[Math.floor(p.animFrame / 1) % anim.length];
  const strip = state.hero === 'brish' ? images.brishStrip : images.monkoStrip;

  if (strip && strip.complete && strip.naturalWidth) {
    ctx.save();
    ctx.drawImage(strip, frame * 320, 0, 320, 426, x, y, p.w, p.h);
    ctx.restore();
  } else {
    const fallback = state.hero === 'brish' ? images.brish : images.monko;
    if (fallback && fallback.complete) ctx.drawImage(fallback, x, y, p.w, p.h);
  }

  if (p.hurt > 0) {
    ctx.strokeStyle = 'rgba(255,82,82,.8)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(x + p.w / 2, y + p.h / 2, 42, 0, TAU);
    ctx.stroke();
  }

  p.animTimer++;
  const animSpeed = !p.onGround || state.speed > 6.5 ? 7 : 12;
  if (p.animTimer >= animSpeed) {
    p.animTimer = 0;
    p.animFrame++;
  }
}

function drawHUD() {
  const p = state.player;
  const hero = HEROES[state.hero];
  const world = WORLDS[state.worldIndex];

  ctx.fillStyle = 'rgba(0,0,0,.28)';
  drawRoundedRect(14, 14, W() - 28, 76, 20); ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.font = '700 20px Fredoka';
  ctx.fillText(`${world.emoji} ${world.name}`, 28, 38);
  ctx.font = '600 14px Fredoka';
  ctx.fillStyle = 'rgba(255,255,255,.85)';
  ctx.fillText(`${hero.name} • ${Math.floor(state.distance)}m • Score ${state.score}`, 28, 62);

  const barX = 20, barY = 98, barW = W() - 40;
  ctx.fillStyle = 'rgba(255,255,255,.12)';
  drawRoundedRect(barX, barY, barW, 16, 8); ctx.fill();
  ctx.fillStyle = hero.color;
  drawRoundedRect(barX, barY, barW * (p.hp / p.maxHp), 16, 8); ctx.fill();

  drawButtons(hero);

  if (!state.tutorialDismissed) {
    ctx.fillStyle = 'rgba(0,0,0,.4)';
    drawRoundedRect(W() * 0.5 - 175, 126, 350, 96, 18); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.font = '700 18px Fredoka';
    ctx.fillText('Hold to jump higher', W() * 0.5, 156);
    ctx.font = '600 15px Fredoka';
    ctx.fillText('Swipe down for special', W() * 0.5, 184);
    ctx.fillText('Basic attacks happen automatically', W() * 0.5, 206);
    ctx.textAlign = 'left';
  }
}

function drawButtons(hero) {
  const p = state.player;
  const power = { x: W() - 102, y: H() - 182, r: 42 };
  const ult = { x: W() - 60, y: H() - 96, r: 48 };
  state.ui.power = power;
  state.ui.ult = ult;

  ctx.fillStyle = p.attackCd <= 0 ? hero.color : 'rgba(255,255,255,.18)';
  ctx.beginPath(); ctx.arc(power.x, power.y, power.r, 0, TAU); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.font = '700 16px Fredoka';
  ctx.fillText('ATK', power.x, power.y + 5);

  ctx.fillStyle = p.specialCd <= 0 ? hero.color2 : 'rgba(255,255,255,.18)';
  ctx.beginPath(); ctx.arc(ult.x, ult.y, ult.r, 0, TAU); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.font = '700 16px Fredoka';
  ctx.fillText('ULT', ult.x, ult.y + 5);
  ctx.textAlign = 'left';

  if (p.specialCd > 0) {
    ctx.strokeStyle = 'rgba(0,0,0,.45)';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.arc(ult.x, ult.y, ult.r - 4, -Math.PI / 2, -Math.PI / 2 + TAU * (p.specialCd / (state.hero === 'brish' ? 260 : 220)), false);
    ctx.stroke();
  }
}

function drawMenu() {
  const g = ctx.createLinearGradient(0, 0, 0, H());
  g.addColorStop(0, '#120c26');
  g.addColorStop(1, '#2b174f');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W(), H());

  ctx.save();
  ctx.globalAlpha = 0.28;
  const pulse = (Math.sin(state.menuPulse) + 1) * 0.5;
  const glow1 = ctx.createRadialGradient(W()*0.25, H()*0.22, 10, W()*0.25, H()*0.22, 220 + pulse * 30);
  glow1.addColorStop(0, 'rgba(255,138,101,.8)'); glow1.addColorStop(1, 'rgba(255,138,101,0)');
  ctx.fillStyle = glow1; ctx.fillRect(0,0,W(),H());
  const glow2 = ctx.createRadialGradient(W()*0.75, H()*0.7, 10, W()*0.75, H()*0.7, 220 + pulse * 30);
  glow2.addColorStop(0, 'rgba(124,77,255,.8)'); glow2.addColorStop(1, 'rgba(124,77,255,0)');
  ctx.fillStyle = glow2; ctx.fillRect(0,0,W(),H());
  ctx.restore();

  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.font = `700 ${Math.min(54, W() * 0.12)}px Fredoka`;
  ctx.fillText('Smash & Bloom', W() * 0.5, H() * 0.14);
  ctx.font = `600 ${Math.min(20, W() * 0.05)}px Fredoka`;
  ctx.fillStyle = 'rgba(255,255,255,.8)';
  ctx.fillText('Brish & Monko endless runner', W() * 0.5, H() * 0.19);

  drawMenuHeroCard(W()*0.5 - 178, H()*0.28, 160, 196, 'brish');
  drawMenuHeroCard(W()*0.5 + 18, H()*0.28, 160, 196, 'monko');

  const total = 3 * 112 + 2 * 14;
  const startX = W() * 0.5 - total / 2;
  for (let i = 0; i < 3; i++) {
    const x = startX + i * 126;
    const y = H() * 0.61;
    drawRoundedRect(x, y, 112, 62, 16);
    ctx.fillStyle = state.worldIndex === i ? 'rgba(124,77,255,.25)' : 'rgba(255,255,255,.08)';
    ctx.fill();
    ctx.strokeStyle = state.worldIndex === i ? '#8b5cf6' : 'rgba(255,255,255,.14)';
    ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.font = '700 18px Fredoka';
    ctx.fillText(WORLDS[i].emoji, x + 56, y + 22);
    ctx.font = '600 12px Fredoka';
    ctx.fillText(WORLDS[i].name, x + 56, y + 44);
  }

  const play = { x: W()*0.5 - 118, y: H()*0.79, w: 236, h: 70 };
  state.ui.menuPlay = play;
  drawRoundedRect(play.x, play.y, play.w, play.h, 20);
  const pg = ctx.createLinearGradient(play.x, play.y, play.x, play.y + play.h);
  pg.addColorStop(0, '#8b5cf6'); pg.addColorStop(1, '#6d28d9');
  ctx.fillStyle = pg; ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.font = '700 28px Fredoka';
  ctx.fillText('PLAY', W() * 0.5, play.y + 44);

  ctx.font = '600 14px Fredoka';
  ctx.fillStyle = 'rgba(255,255,255,.75)';
  ctx.fillText('One-touch jumps • auto-combat • swipe special', W()*0.5, H()*0.92);
  ctx.textAlign = 'left';
}

function drawMenuHeroCard(x, y, w, h, heroKey) {
  const selected = state.hero === heroKey;
  const hero = HEROES[heroKey];
  drawRoundedRect(x, y, w, h, 22);
  ctx.fillStyle = selected ? 'rgba(124,77,255,.22)' : 'rgba(255,255,255,.08)';
  ctx.fill();
  ctx.strokeStyle = selected ? hero.color : 'rgba(255,255,255,.14)';
  ctx.lineWidth = 3; ctx.stroke();

  if (heroKey === 'brish' && images.brishStrip.complete && images.brishStrip.naturalWidth) {
    ctx.drawImage(images.brishStrip, 0, 0, 320, 426, x + 42, y + 12, 76, 100);
  } else if (heroKey === 'monko' && images.monkoStrip.complete && images.monkoStrip.naturalWidth) {
    ctx.drawImage(images.monkoStrip, 0, 0, 320, 426, x + 42, y + 12, 76, 100);
  }

  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.font = '700 22px Fredoka';
  ctx.fillText(hero.name, x + w / 2, y + 134);
  ctx.font = '600 14px Fredoka';
  ctx.fillStyle = 'rgba(255,255,255,.8)';
  ctx.fillText(hero.specialName, x + w / 2, y + 160);
  ctx.fillText(heroKey === 'brish' ? 'Punch brawler' : 'Magic runner', x + w / 2, y + 180);
  ctx.textAlign = 'left';
}

function drawEnd(kind) {
  drawBackground();
  drawObstacles();
  drawEnemies();
  drawProjectiles();
  drawPlayer();
  drawParticles();

  ctx.fillStyle = 'rgba(0,0,0,.55)';
  ctx.fillRect(0, 0, W(), H());

  const panel = { x: W()*0.5 - 180, y: H()*0.3, w: 360, h: 250 };
  drawRoundedRect(panel.x, panel.y, panel.w, panel.h, 26);
  ctx.fillStyle = 'rgba(16,10,26,.94)'; ctx.fill();
  ctx.strokeStyle = kind === 'win' ? '#8b5cf6' : '#ef4444';
  ctx.lineWidth = 3; ctx.stroke();

  ctx.textAlign = 'center';
  ctx.fillStyle = '#fff';
  ctx.font = '700 38px Fredoka';
  ctx.fillText(kind === 'win' ? 'Great Run!' : 'Out of Juice!', W()*0.5, H()*0.39);
  ctx.font = '600 18px Fredoka';
  ctx.fillStyle = 'rgba(255,255,255,.82)';
  ctx.fillText(`${Math.floor(state.distance)}m • Score ${state.score} • Best ${Math.max(state.best, Math.floor(state.distance))}m`, W()*0.5, H()*0.435);

  const retry = { x: W()*0.5 - 110, y: H()*0.51, w: 220, h: 64 };
  const menu = { x: W()*0.5 - 110, y: H()*0.6, w: 220, h: 56 };
  state.ui.endRetry = retry;
  state.ui.endMenu = menu;
  drawRoundedRect(retry.x, retry.y, retry.w, retry.h, 18);
  ctx.fillStyle = kind === 'win' ? '#7c4dff' : '#ef4444'; ctx.fill();
  drawRoundedRect(menu.x, menu.y, menu.w, menu.h, 18);
  ctx.fillStyle = 'rgba(255,255,255,.12)'; ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.font = '700 24px Fredoka';
  ctx.fillText(kind === 'win' ? 'KEEP GOING' : 'TRY AGAIN', W()*0.5, retry.y + 41);
  ctx.font = '700 20px Fredoka';
  ctx.fillText('MENU', W()*0.5, menu.y + 37);
  ctx.textAlign = 'left';
}

function draw() {
  if (assetsLoaded < assetsTotal) {
    ctx.fillStyle = '#140f22';
    ctx.fillRect(0, 0, W(), H());
    ctx.fillStyle = '#fff';
    ctx.font = '700 26px Fredoka';
    ctx.fillText('Loading...', W() * 0.5 - 55, H() * 0.5);
    return;
  }

  if (state.scene === 'menu') {
    drawMenu();
  } else if (state.scene === 'playing') {
    drawBackground();
    drawObstacles();
    drawEnemies();
    drawProjectiles();
    drawPlayer();
    drawParticles();
    drawHUD();
  } else if (state.scene === 'gameover') {
    drawEnd('gameover');
  }
}

function handleMenuTap(x, y) {
  if (x < W()*0.5) {
    if (y > H()*0.28 && y < H()*0.28 + 196) state.hero = x < W()*0.5 ? (x < W()*0.5 - 10 ? 'brish' : 'monko') : state.hero;
  }
  const leftCard = { x: W()*0.5 - 178, y: H()*0.28, w: 160, h: 196 };
  const rightCard = { x: W()*0.5 + 18, y: H()*0.28, w: 160, h: 196 };
  if (x >= leftCard.x && x <= leftCard.x + leftCard.w && y >= leftCard.y && y <= leftCard.y + leftCard.h) state.hero = 'brish';
  if (x >= rightCard.x && x <= rightCard.x + rightCard.w && y >= rightCard.y && y <= rightCard.y + rightCard.h) state.hero = 'monko';

  const total = 3 * 112 + 2 * 14;
  const startX = W() * 0.5 - total / 2;
  for (let i = 0; i < 3; i++) {
    const bx = startX + i * 126;
    const by = H() * 0.61;
    if (x >= bx && x <= bx + 112 && y >= by && y <= by + 62) state.worldIndex = i;
  }
  const play = state.ui.menuPlay;
  if (play && x >= play.x && x <= play.x + play.w && y >= play.y && y <= play.y + play.h) resetGame();
}

function handleEndTap(x, y) {
  const r = state.ui.endRetry, m = state.ui.endMenu;
  if (r && x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) resetGame();
  if (m && x >= m.x && x <= m.x + m.w && y >= m.y && y <= m.y + m.h) state.scene = 'menu';
}

function onPress(x, y) {
  state.pointerDown = true;
  state.pointerX = x;
  state.pointerY = y;
  state.pressX = x;
  state.pressY = y;
  state.swipeTriggered = false;
  state.justPressed = true;
  if (state.scene === 'playing' && dist(x, y, state.ui.ult?.x || 0, state.ui.ult?.y || 0) < (state.ui.ult?.r || 0)) {
    useSpecial();
    state.swipeTriggered = true;
    state.tutorialDismissed = true;
  }
}
function onMove(x, y) {
  state.pointerX = x;
  state.pointerY = y;
}
function onRelease(x, y) {
  state.pointerDown = false;
  state.pointerX = x;
  state.pointerY = y;
  state.tutorialDismissed = true;
}

function posFromMouse(ev) {
  const r = canvas.getBoundingClientRect();
  return { x: ev.clientX - r.left, y: ev.clientY - r.top };
}
canvas.addEventListener('mousedown', e => { const p = posFromMouse(e); onPress(p.x, p.y); });
window.addEventListener('mousemove', e => { const p = posFromMouse(e); onMove(p.x, p.y); });
window.addEventListener('mouseup', e => { const p = posFromMouse(e); onRelease(p.x, p.y); });
canvas.addEventListener('touchstart', e => {
  e.preventDefault();
  const t = e.changedTouches[0];
  const r = canvas.getBoundingClientRect();
  onPress(t.clientX - r.left, t.clientY - r.top);
}, { passive: false });
canvas.addEventListener('touchmove', e => {
  e.preventDefault();
  const t = e.changedTouches[0];
  const r = canvas.getBoundingClientRect();
  onMove(t.clientX - r.left, t.clientY - r.top);
}, { passive: false });
canvas.addEventListener('touchend', e => {
  e.preventDefault();
  const t = e.changedTouches[0] || e.changedTouches[0];
  const r = canvas.getBoundingClientRect();
  const x = t ? t.clientX - r.left : state.pointerX;
  const y = t ? t.clientY - r.top : state.pointerY;
  onRelease(x, y);
}, { passive: false });

window.addEventListener('keydown', e => {
  if (state.scene === 'menu' && (e.key === 'Enter' || e.key === ' ')) resetGame();
  if (state.scene === 'playing' && (e.key.toLowerCase() === 's' || e.key === 'ArrowDown' || e.key === 'Shift')) {
    useSpecial();
    state.tutorialDismissed = true;
  }
});

function tick() {
  update();
  draw();
  requestAnimationFrame(tick);
}
tick();
