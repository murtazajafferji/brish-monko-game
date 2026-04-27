const HEROES = {
  brish: {
    id: 'brish',
    name: 'Brish',
    emoji: '👑',
    color: '#ff8c42',
    tint: 'rgba(255,140,66,0.35)',
    speed: 520,
    accel: 2800,
    jump: 1020,
    radius: 54,
    mass: 1.28,
    attackReach: 105,
    attackForce: 1280,
    attackLift: 120,
    attackCd: 0.52,
    powerForce: 1900,
    powerLift: 200,
    powerCd: 2.4,
    powerName: 'Crown Cannon',
    spriteRoot: 'brish',
    aiAggro: 1.1,
  },
  monko: {
    id: 'monko',
    name: 'Monko',
    emoji: '🌸',
    color: '#7cbbff',
    tint: 'rgba(124,187,255,0.35)',
    speed: 700,
    accel: 4200,
    jump: 1260,
    radius: 44,
    mass: 0.88,
    attackReach: 86,
    attackForce: 780,
    attackLift: 320,
    attackCd: 0.34,
    powerForce: 1100,
    powerLift: 680,
    powerCd: 2.0,
    powerName: 'Bloom Burst',
    spriteRoot: 'monko',
    aiAggro: 1.3,
  },
};

const WORLDS = [
  {
    name: 'Lego Land',
    skyTop: '#5435a7',
    skyBottom: '#180f2d',
    floor: '#5b3d22',
    accent: '#f9d65d',
    bell: '#ffd44d',
    crowd: ['🧱', '🟨', '🟥', '🟦'],
    deco: 'blocks',
  },
  {
    name: 'Beach World',
    skyTop: '#4e96ff',
    skyBottom: '#ffb16d',
    floor: '#b8824f',
    accent: '#75f2ea',
    bell: '#ffe07e',
    crowd: ['🌴', '🐚', '🌊', '☀️'],
    deco: 'waves',
  },
  {
    name: 'Mini World',
    skyTop: '#93d1ff',
    skyBottom: '#493073',
    floor: '#72553f',
    accent: '#ff8dd8',
    bell: '#f5ff8f',
    crowd: ['🧸', '🧩', '🚂', '🎈'],
    deco: 'toys',
  },
];

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Screen elements
const titleScreen = document.getElementById('titleScreen');
const selectScreen = document.getElementById('selectScreen');
const hud = document.getElementById('hud');
const tapHint = document.getElementById('tapHint');
const hudLeftScore = document.getElementById('hudLeftScore');
const hudRightScore = document.getElementById('hudRightScore');
const hudTimer = document.getElementById('hudTimer');
const hudLeftName = document.getElementById('hudLeftName');
const hudRightName = document.getElementById('hudRightName');
const heroCards = [...document.querySelectorAll('.hero-card')];

const ASSETS = {};
const FRAME_KEYS = {
  idle: ['idle'],
  run: ['walk1', 'walk2', 'walk3', 'walk2'],
  jump: ['jump'],
  fall: ['fall'],
  attack: ['attack1', 'attack2'],
  power: ['attack2', 'attack1', 'jump'],
};

function loadImage(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

async function loadAssets() {
  const files = [];
  for (const hero of Object.values(HEROES)) {
    const root = hero.spriteRoot;
    for (const suffix of ['idle', 'walk1', 'walk2', 'walk3', 'jump', 'fall', 'attack1', 'attack2']) {
      files.push([`${hero.id}_${suffix}`, `images/${root}_${suffix}.png`]);
    }
  }
  files.push(['background', 'images/background_single.png']);

  const loaded = await Promise.all(files.map(async ([key, src]) => [key, await loadImage(src)]));
  loaded.forEach(([key, img]) => { ASSETS[key] = img; });
}

// Simplified input: tap left half = go left + jump + attack left
// tap right half = go right + jump + attack right
const input = {
  left: false,
  right: false,
  jumpPressed: false,
  attackPressed: false,
  powerPressed: false,
  jumpHeld: false,
  leftHeld: false,
  rightHeld: false,
  tapDir: 0, // -1 left, 1 right, 0 none
};

function handleTapStart(x) {
  if (state.phase !== 'play') return;
  const half = window.innerWidth / 2;
  if (x < half) {
    input.left = true; input.leftHeld = true;
    input.right = false; input.rightHeld = false;
    input.tapDir = -1;
  } else {
    input.right = true; input.rightHeld = true;
    input.left = false; input.leftHeld = false;
    input.tapDir = 1;
  }
  input.jumpPressed = true;
  input.jumpHeld = true;
  input.attackPressed = true;
  // Auto-use power when available
  input.powerPressed = true;
}

function handleTapEnd() {
  input.left = false; input.leftHeld = false;
  input.right = false; input.rightHeld = false;
  input.jumpHeld = false;
  input.tapDir = 0;
}

// Touch events on canvas for the simple tap system
canvas.addEventListener('touchstart', (e) => {
  if (state.phase !== 'play') return;
  e.preventDefault();
  const touch = e.changedTouches[0];
  handleTapStart(touch.clientX);
}, { passive: false });

canvas.addEventListener('touchend', (e) => {
  if (state.phase !== 'play') return;
  e.preventDefault();
  handleTapEnd();
}, { passive: false });

canvas.addEventListener('touchcancel', (e) => {
  handleTapEnd();
});

// Mouse fallback for desktop testing
canvas.addEventListener('mousedown', (e) => {
  if (state.phase !== 'play') return;
  handleTapStart(e.clientX);
});
canvas.addEventListener('mouseup', () => handleTapEnd());

// Keyboard still works for desktop
window.addEventListener('keydown', (event) => {
  const key = event.key.toLowerCase();
  if (['arrowleft', 'a'].includes(key)) { input.left = true; input.leftHeld = true; input.attackPressed = true; input.jumpPressed = true; input.jumpHeld = true; }
  if (['arrowright', 'd'].includes(key)) { input.right = true; input.rightHeld = true; input.attackPressed = true; input.jumpPressed = true; input.jumpHeld = true; }
  if (['arrowup', 'w', ' '].includes(key)) {
    if (!input.jumpHeld) input.jumpPressed = true;
    input.jumpHeld = true;
  }
  if (key === 'j') input.attackPressed = true;
  if (key === 'k') input.powerPressed = true;
  if (key === 'enter' && state.phase !== 'play') startMatch();
});

window.addEventListener('keyup', (event) => {
  const key = event.key.toLowerCase();
  if (['arrowleft', 'a'].includes(key)) { input.left = false; input.leftHeld = false; }
  if (['arrowright', 'd'].includes(key)) { input.right = false; input.rightHeld = false; }
  if (['arrowup', 'w', ' '].includes(key)) input.jumpHeld = false;
});

function resize() {
  canvas.width = Math.floor(window.innerWidth * Math.min(window.devicePixelRatio || 1, 1.5));
  canvas.height = Math.floor(window.innerHeight * Math.min(window.devicePixelRatio || 1, 1.5));
  state.w = canvas.width;
  state.h = canvas.height;
  state.floorY = state.h - Math.max(110, state.h * 0.17);
  if (state.entitiesReady) resetPositions(true);
}
window.addEventListener('resize', resize);

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function dist(ax, ay, bx, by) {
  return Math.hypot(ax - bx, ay - by);
}

class Fighter {
  constructor(side, hero, isHuman = false) {
    this.side = side;
    this.hero = hero;
    this.isHuman = isHuman;
    this.x = 0;
    this.y = 0;
    this.vx = 0;
    this.vy = 0;
    this.width = 82;
    this.height = 112;
    this.facing = side === 'left' ? 1 : -1;
    this.onGround = true;
    this.attackTimer = 0;
    this.attackCooldown = 0;
    this.powerCooldown = 0;
    this.powerFlash = 0;
    this.hitFlash = 0;
    this.anim = 'idle';
    this.animFrame = 0;
    this.animTime = 0;
    this.intent = { left: false, right: false, jump: false, attack: false, power: false };
  }

  setHero(hero) {
    this.hero = hero;
  }

  bounds() {
    return {
      left: this.x - this.width / 2,
      right: this.x + this.width / 2,
      top: this.y - this.height,
      bottom: this.y,
    };
  }

  update(dt, ball, opponent) {
    const accel = this.hero.accel;
    const maxSpeed = this.hero.speed;
    const dir = (this.intent.right ? 1 : 0) - (this.intent.left ? 1 : 0);

    if (dir !== 0) {
      this.vx += dir * accel * dt;
      this.facing = dir || this.facing;
    } else {
      this.vx = lerp(this.vx, 0, Math.min(1, dt * 9));
    }
    this.vx = clamp(this.vx, -maxSpeed, maxSpeed);

    if (this.intent.jump && this.onGround) {
      this.vy = -this.hero.jump;
      this.onGround = false;
    }

    if (!this.onGround && this.intent.jump && this.vy < -200) {
      this.vy -= 320 * dt;
    }

    this.vy += 2800 * dt;

    this.x += this.vx * dt;
    this.y += this.vy * dt;

    const minX = 72;
    const maxX = state.w - 72;
    if (this.x < minX) { this.x = minX; this.vx = 0; }
    if (this.x > maxX) { this.x = maxX; this.vx = 0; }

    if (this.y >= state.floorY) {
      this.y = state.floorY;
      this.vy = 0;
      this.onGround = true;
    }

    this.attackCooldown = Math.max(0, this.attackCooldown - dt);
    this.powerCooldown = Math.max(0, this.powerCooldown - dt);
    this.attackTimer = Math.max(0, this.attackTimer - dt);
    this.powerFlash = Math.max(0, this.powerFlash - dt);
    this.hitFlash = Math.max(0, this.hitFlash - dt);

    if (this.intent.attack && this.attackCooldown <= 0) {
      this.attackCooldown = this.hero.attackCd;
      this.attackTimer = 0.18;
      this.hitBall(ball, false);
      if (dist(this.x, this.y - 60, opponent.x, opponent.y - 60) < this.hero.attackReach + 34) {
        opponent.vx += this.facing * 180;
        opponent.vy -= 90;
        opponent.hitFlash = 0.12;
      }
      spawnBurst(this.x + this.facing * 40, this.y - 80, this.hero.color, 12, 220);
      state.cameraShake = Math.max(state.cameraShake, 4);
    }

    if (this.intent.power && this.powerCooldown <= 0) {
      this.powerCooldown = this.hero.powerCd;
      this.powerFlash = 0.34;
      this.hitBall(ball, true);
      spawnBurst(this.x + this.facing * 26, this.y - 90, this.hero.color, 24, 420);
      state.cameraShake = Math.max(state.cameraShake, 10);
      flashStatus(`${this.hero.name}: ${this.hero.powerName}!`);
    }

    this.pickAnimation();
  }

  hitBall(ball, isPower) {
    const hitX = this.x + this.facing * (this.hero.attackReach * 0.72);
    const hitY = this.y - 68;
    const range = isPower ? this.hero.attackReach + 44 : this.hero.attackReach;
    const d = dist(hitX, hitY, ball.x, ball.y);
    if (d < range + ball.r) {
      const force = isPower ? this.hero.powerForce : this.hero.attackForce;
      const lift = isPower ? this.hero.powerLift : this.hero.attackLift;
      const bonus = clamp((range + ball.r - d) / (range + ball.r), 0.2, 1);
      ball.vx += this.facing * force * bonus / ball.mass;
      ball.vy -= lift * bonus / ball.mass;
      ball.spin += this.facing * (isPower ? 24 : 12) * bonus;
      ball.lastTouch = this.side;
      ball.trailBoost = isPower ? 1.0 : 0.55;
    }
  }

  pickAnimation() {
    if (this.powerFlash > 0) this.anim = 'power';
    else if (this.attackTimer > 0) this.anim = 'attack';
    else if (!this.onGround && this.vy < 0) this.anim = 'jump';
    else if (!this.onGround) this.anim = 'fall';
    else if (Math.abs(this.vx) > 60) this.anim = 'run';
    else this.anim = 'idle';

    this.animTime += state.dt;
    const frameKeys = FRAME_KEYS[this.anim];
    const speed = this.anim === 'run' ? 0.09 : 0.12;
    if (this.animTime > speed) {
      this.animTime = 0;
      this.animFrame = (this.animFrame + 1) % frameKeys.length;
    }
  }

  draw(ctx) {
    const frameKey = FRAME_KEYS[this.anim][this.animFrame % FRAME_KEYS[this.anim].length];
    const asset = ASSETS[`${this.hero.id}_${frameKey}`];
    const spriteW = 320;
    const spriteH = 426;
    const drawH = this.height * 1.38;
    const drawW = this.width * 1.18;
    const x = this.x - drawW / 2;
    const y = this.y - drawH + 8;

    ctx.save();
    ctx.translate(this.x, 0);
    ctx.scale(this.facing === 1 ? 1 : -1, 1);
    ctx.translate(-this.x, 0);

    if (this.powerFlash > 0) {
      ctx.fillStyle = this.hero.tint;
      ctx.beginPath();
      ctx.arc(this.x, this.y - 70, 70 + this.powerFlash * 50, 0, Math.PI * 2);
      ctx.fill();
    }

    if (asset) {
      ctx.drawImage(asset, 0, 0, spriteW, spriteH, x, y, drawW, drawH);
    } else {
      ctx.fillStyle = this.hero.color;
      ctx.fillRect(this.x - 20, this.y - 80, 40, 80);
    }

    if (this.hitFlash > 0) {
      ctx.globalCompositeOperation = 'screen';
      ctx.fillStyle = 'rgba(255,255,255,0.45)';
      ctx.fillRect(x, y, drawW, drawH);
    }

    // Power-ready glow
    if (this.powerCooldown <= 0) {
      ctx.globalCompositeOperation = 'screen';
      ctx.globalAlpha = 0.18 + Math.sin(Date.now() * 0.006) * 0.08;
      ctx.fillStyle = this.hero.color;
      ctx.beginPath();
      ctx.arc(this.x, this.y - 60, 52, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    }
    ctx.restore();
  }
}

class Ball {
  constructor() {
    this.r = 24;
    this.mass = 1;
    this.reset('left');
  }

  reset(lastScored) {
    this.x = state.w / 2;
    this.y = state.floorY - 180;
    this.vx = lastScored === 'left' ? 160 : -160;
    this.vy = -120;
    this.spin = 0;
    this.rotation = 0;
    this.lastTouch = null;
    this.trailBoost = 0;
  }

  update(dt, players) {
    this.vy += 2100 * dt;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.rotation += (this.vx * 0.002 + this.spin * 0.018) * dt * 60;
    this.spin = lerp(this.spin, 0, Math.min(1, dt * 2.6));
    this.trailBoost = Math.max(0, this.trailBoost - dt * 1.8);

    if (this.y + this.r >= state.floorY) {
      this.y = state.floorY - this.r;
      if (Math.abs(this.vy) > 180) spawnDust(this.x, state.floorY, '#fff3c8', 8);
      this.vy *= -0.72;
      this.vx *= 0.985;
      this.spin += this.vx * 0.004;
      if (Math.abs(this.vy) < 40) this.vy = 0;
    }

    const wallPad = 18;
    if (this.x - this.r <= wallPad) {
      this.x = wallPad + this.r;
      this.vx = Math.abs(this.vx) * 0.92;
      this.spin *= -0.7;
    }
    if (this.x + this.r >= state.w - wallPad) {
      this.x = state.w - wallPad - this.r;
      this.vx = -Math.abs(this.vx) * 0.92;
      this.spin *= -0.7;
    }

    for (const player of players) {
      const bodyX = player.x;
      const bodyY = player.y - 72;
      const hitR = player.hero.radius;
      const d = dist(this.x, this.y, bodyX, bodyY);
      if (d < this.r + hitR) {
        const nx = (this.x - bodyX) / (d || 1);
        const ny = (this.y - bodyY) / (d || 1);
        const overlap = this.r + hitR - d;
        this.x += nx * overlap;
        this.y += ny * overlap;
        const impact = 680 / player.hero.mass;
        this.vx += nx * impact + player.vx * 0.28;
        this.vy += ny * impact + player.vy * 0.14;
        this.lastTouch = player.side;
        spawnBurst(this.x, this.y, player.hero.color, 8, 180);
      }
    }
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);
    ctx.fillStyle = '#fff8ec';
    ctx.beginPath();
    ctx.arc(0, 0, this.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#1c102a';
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,140,66,0.65)';
    ctx.beginPath();
    ctx.arc(0, 0, this.r * 0.72, -0.8, 0.6);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(124,187,255,0.65)';
    ctx.beginPath();
    ctx.arc(0, 0, this.r * 0.72, 2.2, 3.6);
    ctx.stroke();
    ctx.restore();

    if (this.trailBoost > 0) {
      ctx.save();
      ctx.globalAlpha = this.trailBoost * 0.32;
      ctx.strokeStyle = this.lastTouch === 'left' ? HEROES.brish.color : HEROES.monko.color;
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.moveTo(this.x, this.y);
      ctx.lineTo(this.x - this.vx * 0.04, this.y - this.vy * 0.04);
      ctx.stroke();
      ctx.restore();
    }
  }
}

const particles = [];

const MAX_PARTICLES = 200;

function spawnBurst(x, y, color, count, speed) {
  for (let i = 0; i < count; i += 1) {
    const a = Math.random() * Math.PI * 2;
    const s = speed * (0.25 + Math.random() * 0.75);
    if (particles.length < MAX_PARTICLES) particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0.45 + Math.random() * 0.3, age: 0, color, size: 4 + Math.random() * 6 });
  }
}

function spawnDust(x, y, color, count) {
  for (let i = 0; i < count; i += 1) {
    if (particles.length < MAX_PARTICLES) particles.push({ x, y: y - 4, vx: (Math.random() - 0.5) * 180, vy: -Math.random() * 140, life: 0.25 + Math.random() * 0.25, age: 0, color, size: 5 + Math.random() * 8 });
  }
}

function updateParticles(dt) {
  for (let i = particles.length - 1; i >= 0; i -= 1) {
    const p = particles[i];
    p.age += dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += 360 * dt;
    p.vx *= 0.985;
    if (p.age >= p.life) particles.splice(i, 1);
  }
}

function drawParticles(ctx) {
  particles.forEach((p) => {
    const alpha = 1 - p.age / p.life;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.globalAlpha = 1;
}

const state = {
  w: 0,
  h: 0,
  floorY: 0,
  entitiesReady: false,
  phase: 'menu',
  dt: 0,
  last: 0,
  roundTimer: 120,
  scoreLeft: 0,
  scoreRight: 0,
  winningScore: 999,
  worldIndex: 0,
  cameraShake: 0,
  flashTimer: 0,
  flashText: '',
  servingSide: 'left',
  scoreFreeze: 0,
  heroSelected: 'brish',
};

const player = new Fighter('left', HEROES.brish, true);
const ai = new Fighter('right', HEROES.monko, false);
const ball = new Ball();

function resetPositions(keepScore = false) {
  player.x = state.w * 0.24;
  player.y = state.floorY;
  player.vx = 0;
  player.vy = 0;
  player.onGround = true;
  player.facing = 1;
  player.attackCooldown = 0;
  player.powerCooldown = 0;
  player.attackTimer = 0;
  player.powerFlash = 0;
  ai.x = state.w * 0.76;
  ai.y = state.floorY;
  ai.vx = 0;
  ai.vy = 0;
  ai.onGround = true;
  ai.facing = -1;
  ai.attackCooldown = 0;
  ai.powerCooldown = 0;
  ai.attackTimer = 0;
  ai.powerFlash = 0;
  ball.reset(state.servingSide);
  if (!keepScore) {
    state.scoreLeft = 0;
    state.scoreRight = 0;
    state.worldIndex = 0;
    state.roundTimer = 45;
  }
  updateHUD();
}

function updateHUD() {
  hudLeftScore.textContent = state.scoreLeft;
  hudRightScore.textContent = state.scoreRight;
  hudLeftName.textContent = player.hero.name.toUpperCase();
  hudRightName.textContent = ai.hero.name.toUpperCase();
  if (state.phase === 'play') {
    const mins = Math.floor(state.roundTimer / 60);
    const secs = Math.ceil(state.roundTimer % 60);
    hudTimer.textContent = mins + ':' + secs.toString().padStart(2, '0');
  }
}

function flashStatus(text) {
  state.flashText = text;
  state.flashTimer = 1.2;
}

function cycleWorld() {
  state.worldIndex = (state.worldIndex + 1) % WORLDS.length;
  updateHUD();
}

function finishMatch() {
  state.phase = 'gameover';
  hud.style.display = 'none';
  tapHint.style.display = 'none';
  titleScreen.classList.remove('hidden');
  const winner = state.scoreLeft > state.scoreRight ? player.hero.name.toUpperCase() :
                 (state.scoreRight > state.scoreLeft ? ai.hero.name.toUpperCase() : 'DRAW');
  titleScreen.querySelector('.title-logo').textContent = winner + ' WINS!';
  titleScreen.querySelector('.title-sub').textContent = state.scoreLeft + ' - ' + state.scoreRight;
  document.getElementById('titleStart').textContent = 'TAP TO REMATCH';
}

function scorePoint(side) {
  if (side === 'left') state.scoreLeft += 1;
  else state.scoreRight += 1;
  state.servingSide = side;
  state.scoreFreeze = 1.2;
  state.cameraShake = Math.max(state.cameraShake, 18);
  flashStatus(side === 'left' ? player.hero.name + ' rang the bell!' : ai.hero.name + ' scores!');
  resetPositions(true);
  updateHUD();
}

function checkGoal() {
  const world = WORLDS[state.worldIndex % WORLDS.length];
  const bellY = state.floorY - 210;
  const leftBellX = 88;
  const rightBellX = state.w - 88;
  const bellRadius = 42;

  if (dist(ball.x, ball.y, leftBellX, bellY) < ball.r + bellRadius) {
    scorePoint('right');
    spawnBurst(leftBellX, bellY, world.bell, 30, 520);
  }
  if (dist(ball.x, ball.y, rightBellX, bellY) < ball.r + bellRadius) {
    scorePoint('left');
    spawnBurst(rightBellX, bellY, world.bell, 30, 520);
  }
}

function updateAI() {
  const heroR = ai.hero.attackReach;
  const ballOnMySide = (ai.side === 'right' && ball.x > state.w / 2) || (ai.side === 'left' && ball.x < state.w / 2);
  const dxBall = ball.x - ai.x;
  const dyBall = ball.y - (ai.y - 68);
  const distBall = Math.hypot(dxBall, dyBall);
  const ballAhead = (ai.facing === 1 && dxBall > 0) || (ai.facing === -1 && dxBall < 0);

  let targetX;
  if (ballOnMySide || distBall < 220) {
    targetX = ball.x + (ai.side === 'right' ? 40 : -40);
  } else {
    const bellX = ai.side === 'right' ? state.w - 180 : 180;
    targetX = bellX + (ball.x - bellX) * 0.3;
  }

  ai.intent.left = targetX < ai.x - 14;
  ai.intent.right = targetX > ai.x + 14;
  ai.intent.jump = false;
  ai.intent.attack = false;
  ai.intent.power = false;

  if (ball.y < ai.y - 60 && distBall < 240) ai.intent.jump = true;
  if (ball.vy < -200 && distBall < 280) ai.intent.jump = true;
  if (!ai.onGround && ball.y < ai.y - 40 && distBall < 180) ai.intent.jump = true;

  if (distBall < heroR + 30 && ballAhead) {
    ai.intent.attack = Math.random() < (0.38 * ai.hero.aiAggro);
  }
  if (distBall < heroR && Math.abs(dyBall) < 80) {
    ai.intent.attack = Math.random() < (0.5 * ai.hero.aiAggro);
  }

  if (ai.powerCooldown <= 0 && distBall < heroR + 40 && ballAhead) {
    ai.intent.power = Math.random() < (0.14 * ai.hero.aiAggro);
  }
  if (ai.powerCooldown <= 0 && state.scoreRight < state.scoreLeft && distBall < heroR + 60) {
    ai.intent.power = Math.random() < 0.2;
  }

  const ownBellX = ai.side === 'right' ? state.w - 88 : 88;
  if (Math.abs(ball.x - ownBellX) < 180 && Math.abs(ball.vx) > 300 && ((ai.side === 'right' && ball.vx > 0) || (ai.side === 'left' && ball.vx < 0))) {
    ai.intent.jump = true;
    if (distBall < heroR + 50) ai.intent.attack = true;
  }
}

function consumeInput() {
  player.intent.left = input.leftHeld || input.left;
  player.intent.right = input.rightHeld || input.right;
  player.intent.jump = input.jumpHeld || input.jumpPressed;
  player.intent.attack = input.attackPressed;
  player.intent.power = input.powerPressed;

  input.jumpPressed = false;
  input.attackPressed = false;
  input.powerPressed = false;
  input.left = input.leftHeld;
  input.right = input.rightHeld;
}

function drawBackground() {
  const world = WORLDS[state.worldIndex % WORLDS.length];
  const grad = ctx.createLinearGradient(0, 0, 0, state.h);
  grad.addColorStop(0, world.skyTop);
  grad.addColorStop(1, world.skyBottom);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, state.w, state.h);

  const bg = ASSETS.background;
  if (bg) {
    ctx.globalAlpha = 0.15;
    ctx.drawImage(bg, 0, 0, bg.width, bg.height, 0, state.floorY - state.h * 0.55, state.w, state.h * 0.6);
    ctx.globalAlpha = 1;
  }

  for (let i = 0; i < 8; i += 1) {
    const x = (i / 7) * state.w;
    const y = state.h * 0.24 + Math.sin(i * 1.9 + state.last * 0.0004) * 18;
    ctx.font = (28 + (i % 3) * 8) + 'px serif';
    ctx.globalAlpha = 0.26;
    ctx.fillText(world.crowd[i % world.crowd.length], x, y);
  }
  ctx.globalAlpha = 1;

  if (world.deco === 'blocks') {
    for (let i = 0; i < 9; i += 1) {
      const x = 30 + i * (state.w / 9);
      const y = state.floorY - 48 - (i % 2) * 16;
      ctx.fillStyle = i % 2 ? '#e55161' : '#6ea8ff';
      ctx.fillRect(x, y, 56, 30);
      ctx.fillStyle = 'rgba(255,255,255,0.24)';
      ctx.fillRect(x, y, 56, 8);
    }
  } else if (world.deco === 'waves') {
    ctx.strokeStyle = 'rgba(117,242,234,0.45)';
    ctx.lineWidth = 6;
    for (let i = 0; i < 4; i += 1) {
      ctx.beginPath();
      for (let x = 0; x <= state.w; x += 16) {
        const y = state.floorY - 26 - i * 20 + Math.sin((x * 0.018) + state.last * 0.002 + i) * 8;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  } else {
    for (let i = 0; i < 6; i += 1) {
      const x = 60 + i * (state.w / 6.5);
      const y = state.floorY - 40 - (i % 3) * 24;
      ctx.fillStyle = i % 2 ? 'rgba(255,141,216,0.33)' : 'rgba(255,255,255,0.18)';
      ctx.fillRect(x, y, 22, 22);
      ctx.beginPath();
      ctx.arc(x + 58, y + 20, 16, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.fillStyle = world.floor;
  ctx.fillRect(0, state.floorY, state.w, state.h - state.floorY);
  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  ctx.fillRect(0, state.floorY, state.w, 6);
}

function drawBell(x, side) {
  const world = WORLDS[state.worldIndex % WORLDS.length];
  const topY = state.floorY - 295;
  const bellY = state.floorY - 210;
  ctx.strokeStyle = '#f6edd8';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(x, topY);
  ctx.lineTo(x, bellY - 34);
  ctx.stroke();

  ctx.fillStyle = world.bell;
  ctx.beginPath();
  ctx.arc(x, bellY, 34, Math.PI, 0);
  ctx.lineTo(x + 30, bellY + 18);
  ctx.quadraticCurveTo(x, bellY + 40, x - 30, bellY + 18);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(28,16,42,0.4)';
  ctx.stroke();

  ctx.fillStyle = 'rgba(28,16,42,0.34)';
  ctx.beginPath();
  ctx.arc(x, bellY + 16, 8, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = side === 'left' ? 'rgba(255,124,159,0.9)' : 'rgba(124,245,170,0.9)';
  ctx.fillRect(x - 28, topY - 18, 56, 20);
  ctx.fillStyle = '#28192a';
  ctx.font = '700 12px Fredoka';
  ctx.textAlign = 'center';
  ctx.fillText(side === 'left' ? 'MONKO' : 'BRISH', x, topY - 4);
}

function drawMidline() {
  ctx.strokeStyle = 'rgba(255,255,255,0.12)';
  ctx.lineWidth = 5;
  ctx.setLineDash([18, 18]);
  ctx.beginPath();
  ctx.moveTo(state.w / 2, state.floorY - 210);
  ctx.lineTo(state.w / 2, state.floorY + 6);
  ctx.stroke();
  ctx.setLineDash([]);
}

function drawFlashText() {
  if (state.flashTimer <= 0) return;
  ctx.save();
  ctx.globalAlpha = Math.min(1, state.flashTimer * 1.6);
  ctx.fillStyle = 'rgba(18,10,27,0.68)';
  const w = Math.min(state.w - 40, 420);
  const h = 52;
  const x = state.w / 2 - w / 2;
  const y = 96;
  roundRect(ctx, x, y, w, h, 18);
  ctx.fill();
  ctx.fillStyle = '#fff8ec';
  ctx.font = '700 24px Fredoka';
  ctx.textAlign = 'center';
  ctx.fillText(state.flashText, state.w / 2, y + 33);
  ctx.restore();
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function draw() {
  ctx.save();
  if (state.cameraShake > 0) {
    const mag = state.cameraShake;
    ctx.translate((Math.random() - 0.5) * mag, (Math.random() - 0.5) * mag);
  }

  drawBackground();
  drawBell(88, 'left');
  drawBell(state.w - 88, 'right');
  drawMidline();
  ball.draw(ctx);
  player.draw(ctx);
  ai.draw(ctx);
  drawParticles(ctx);
  drawFlashText();
  ctx.restore();
}

function update(dt) {
  state.dt = dt;
  state.cameraShake = Math.max(0, state.cameraShake - dt * 36);
  state.flashTimer = Math.max(0, state.flashTimer - dt);

  if (state.phase !== 'play') return;

  if (state.scoreFreeze > 0) {
    state.scoreFreeze -= dt;
    updateParticles(dt * 0.3);
    return;
  }

  state.roundTimer -= dt;
  if (state.roundTimer <= 0) {
    state.roundTimer = 0;
    finishMatch();
    updateHUD();
    return;
  }

  consumeInput();
  updateAI();
  player.update(dt, ball, ai);
  ai.update(dt, ball, player);
  ball.update(dt, [player, ai]);
  updateParticles(dt);
  checkGoal();
  updateHUD();
}

function loop(ts) {
  if (!state.last) state.last = ts;
  const dt = Math.min(0.033, (ts - state.last) / 1000);
  state.last = ts;
  update(dt);
  draw();
  requestAnimationFrame(loop);
}

// ── Screen Flow ──

function showScreen(screenEl) {
  [titleScreen, selectScreen].forEach(function(s) { s.classList.add('hidden'); });
  if (screenEl) screenEl.classList.remove('hidden');
}

function goToTitle() {
  state.phase = 'menu';
  hud.style.display = 'none';
  tapHint.style.display = 'none';
  titleScreen.querySelector('.title-logo').textContent = 'BRISH & MONKO';
  titleScreen.querySelector('.title-sub').textContent = 'KICKBALL CLASH';
  document.getElementById('titleStart').textContent = 'TAP TO START';
  showScreen(titleScreen);
}

function goToSelect() {
  state.phase = 'select';
  showScreen(selectScreen);
}

function goToPlay() {
  showScreen(null);
  hud.style.display = '';
  tapHint.style.display = '';
  state.phase = 'play';
  state.roundTimer = 120;
  state.scoreLeft = 0;
  state.scoreRight = 0;
  state.worldIndex = 0;
  state.servingSide = 'left';
  player.setHero(HEROES[state.heroSelected]);
  ai.setHero(state.heroSelected === 'brish' ? HEROES.monko : HEROES.brish);
  resetPositions(true);
  flashStatus('FIGHT!');
}

// Animate character preview on select cards
function animatePreview(heroId, canvasId) {
  var c = document.getElementById(canvasId);
  if (!c) return;
  var pctx = c.getContext('2d');
  var frames = FRAME_KEYS.idle;
  var frameIdx = 0;
  var lastT = 0;
  function tick(ts) {
    if (!c.isConnected) return;
    if (ts - lastT > 200) {
      lastT = ts;
      frameIdx = (frameIdx + 1) % frames.length;
    }
    var key = heroId + '_' + frames[frameIdx];
    var img = ASSETS[key];
    pctx.clearRect(0, 0, c.width, c.height);
    if (img) {
      var scale = Math.min(c.width / 320, c.height / 426) * 0.9;
      var dw = 320 * scale;
      var dh = 426 * scale;
      pctx.drawImage(img, 0, 0, 320, 426, (c.width - dw) / 2, (c.height - dh) / 2, dw, dh);
    }
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

// ── Event Listeners ──

// Title screen: tap anywhere to go to character select
titleScreen.addEventListener('click', function() {
  if (state.phase === 'menu' || state.phase === 'gameover') goToSelect();
});
titleScreen.addEventListener('touchstart', function(e) {
  e.preventDefault();
  if (state.phase === 'menu' || state.phase === 'gameover') goToSelect();
}, { passive: false });

// Select screen: tap card to select, tap again to start
heroCards.forEach(function(card) {
  card.addEventListener('click', function() {
    var hero = card.dataset.hero;
    if (state.heroSelected === hero) {
      // Already selected, start game
      goToPlay();
    } else {
      state.heroSelected = hero;
      heroCards.forEach(function(c) { c.classList.remove('selected'); });
      card.classList.add('selected');
    }
  });
  card.addEventListener('touchstart', function(e) {
    e.preventDefault();
    var hero = card.dataset.hero;
    if (state.heroSelected === hero) {
      goToPlay();
    } else {
      state.heroSelected = hero;
      heroCards.forEach(function(c) { c.classList.remove('selected'); });
      card.classList.add('selected');
    }
  }, { passive: false });
});

// Keyboard enter to advance screens
window.addEventListener('keydown', function(e) {
  if (e.key === 'Enter') {
    if (state.phase === 'menu' || state.phase === 'gameover') goToSelect();
    else if (state.phase === 'select') goToPlay();
  }
});

// ── Init ──

(async function init() {
  try {
    if (screen.orientation && screen.orientation.lock) {
      screen.orientation.lock('landscape').catch(function() {});
    }
  } catch(e) {}

  await loadAssets();
  resize();

  // Start preview animations
  animatePreview('brish', 'previewBrish');
  animatePreview('monko', 'previewMonko');

  player.setHero(HEROES[state.heroSelected]);
  ai.setHero(HEROES.monko);
  resetPositions();
  state.entitiesReady = true;
  goToTitle();
  requestAnimationFrame(loop);
})();
