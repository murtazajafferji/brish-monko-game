// ============================================================
// Brish & Monko Adventure — Mobile-First Platformer
// ============================================================

const $ = id => document.getElementById(id);
const canvas = $('game');
const ctx = canvas.getContext('2d');

// ---- State ----
let currentHero = 'brish';
let currentLevel = 0;
let paused = false;
let gameWon = false;
let inCar = false;
let cameraX = 0;
const keys = {};
const touches = { left:false, right:false, jump:false, pow1:false, pow2:false, car:false };
const gravity = 0.7;

// ---- Images ----
const imgSrc = {
  brish:'sprites/brish.png', monko:'sprites/monko.png',
  brishCar:'sprites/brish-car.png', monkoCar:'sprites/monko-car.png',
  brishStrip:'sprites/brish-strip.png'
};
const img = {};
let imgLoaded = 0;
const imgTotal = Object.keys(imgSrc).length;

Object.entries(imgSrc).forEach(([k,v])=>{
  const i = new Image(); i.onload = ()=>imgLoaded++; i.onerror = ()=>imgLoaded++;
  i.src = v; img[k] = i;
});

// ---- Brish animation ----
const BA = { idle:[0], walk:[1,2,3,2], jump:[4], fall:[5], punch1:[6,7], punch2:[6] };
const BFW = 320, BFH = 426;
let baFrame=0, baTimer=0, baState='idle';

// ---- Player ----
const P = {
  x:60,y:400,w:72,h:120,
  vx:0,vy:0,speed:4.2,jumpV:-13,
  onGround:false,facing:1,
  cd1:0,cd2:0,flash:0
};
let projectiles=[], particles=[], enemies=[];
let carX=0, carY=0, carVx=0;

// ---- Levels ----
const levels = [
  { name:'Lego Land', theme:{sky:'#dff1ff',ground:'#8ecf6d'}, groundY:510,
    spawn:{x:60,y:420}, carSpawn:{x:180,y:460},
    goal:{x:2800,y:420,w:50,h:90},
    platforms:[
      {x:0,y:510,w:3000,h:90,t:'ground'},
      {x:280,y:420,w:140,h:24,t:'lego'},{x:500,y:365,w:120,h:24,t:'lego'},
      {x:720,y:315,w:110,h:24,t:'lego'},{x:950,y:395,w:150,h:24,t:'lego'},
      {x:1250,y:340,w:130,h:24,t:'lego'},{x:1550,y:275,w:140,h:24,t:'lego'},
      {x:1800,y:355,w:160,h:24,t:'lego'},{x:2100,y:300,w:180,h:24,t:'lego'},
      {x:2450,y:380,w:150,h:24,t:'lego'}
    ],
    hazards:[{x:1100,y:510,w:70,h:40,t:'spikes'},{x:2000,y:510,w:90,h:40,t:'spikes'}],
    enemies:[
      {x:600,y:470,w:40,h:40,dir:1,spd:1.1,mn:450,mx:750,hp:2,col:'#e53935'},
      {x:1400,y:470,w:50,h:45,dir:-1,spd:.9,mn:1200,mx:1600,hp:3,col:'#8e24aa'},
      {x:2200,y:470,w:40,h:40,dir:1,spd:1.3,mn:2050,mx:2400,hp:2,col:'#e53935'}
    ]},
  { name:'Beach World', theme:{sky:'#87d7ff',ground:'#f5d28a'}, groundY:500,
    spawn:{x:60,y:420}, carSpawn:{x:200,y:450},
    goal:{x:2900,y:405,w:55,h:105},
    platforms:[
      {x:0,y:500,w:650,h:100,t:'sand'},{x:790,y:500,w:530,h:100,t:'sand'},
      {x:1450,y:500,w:450,h:100,t:'sand'},{x:2050,y:500,w:500,h:100,t:'sand'},
      {x:2700,y:500,w:400,h:100,t:'sand'},
      {x:300,y:400,w:140,h:18,t:'shell'},{x:980,y:360,w:150,h:18,t:'shell'},
      {x:1650,y:330,w:160,h:18,t:'shell'},{x:2300,y:370,w:140,h:18,t:'shell'}
    ],
    hazards:[
      {x:650,y:540,w:140,h:60,t:'water'},{x:1320,y:540,w:130,h:60,t:'water'},
      {x:1900,y:540,w:150,h:60,t:'water'},{x:2550,y:540,w:150,h:60,t:'water'}
    ],
    enemies:[
      {x:400,y:455,w:45,h:40,dir:1,spd:1.15,mn:250,mx:550,hp:2,col:'#00897b'},
      {x:1100,y:455,w:50,h:45,dir:-1,spd:.85,mn:850,mx:1250,hp:3,col:'#f4511e'},
      {x:1800,y:455,w:45,h:40,dir:-1,spd:1.3,mn:1500,mx:1850,hp:2,col:'#00897b'},
      {x:2400,y:455,w:50,h:45,dir:1,spd:1,mn:2200,mx:2600,hp:3,col:'#f4511e'}
    ]},
  { name:'Mini World', theme:{sky:'#f4ecff',ground:'#dadada'}, groundY:515,
    spawn:{x:60,y:430}, carSpawn:{x:190,y:465},
    goal:{x:2900,y:425,w:55,h:90},
    platforms:[
      {x:0,y:515,w:3100,h:85,t:'mini'},
      {x:300,y:430,w:130,h:20,t:'mini'},{x:560,y:365,w:130,h:20,t:'mini'},
      {x:800,y:310,w:130,h:20,t:'mini'},{x:1100,y:390,w:150,h:20,t:'mini'},
      {x:1400,y:330,w:150,h:20,t:'mini'},{x:1700,y:270,w:170,h:20,t:'mini'},
      {x:2050,y:345,w:170,h:20,t:'mini'},{x:2400,y:400,w:160,h:20,t:'mini'}
    ],
    hazards:[
      {x:1000,y:515,w:50,h:45,t:'spikes'},{x:1600,y:515,w:80,h:45,t:'spikes'},
      {x:2300,y:515,w:60,h:45,t:'spikes'}
    ],
    enemies:[
      {x:650,y:475,w:30,h:30,dir:1,spd:1.5,mn:500,mx:800,hp:1,col:'#7b1fa2'},
      {x:1250,y:475,w:35,h:35,dir:-1,spd:1.2,mn:1100,mx:1400,hp:2,col:'#c62828'},
      {x:1900,y:475,w:30,h:30,dir:1,spd:1.6,mn:1750,mx:2050,hp:1,col:'#7b1fa2'},
      {x:2550,y:475,w:35,h:35,dir:-1,spd:1.3,mn:2400,mx:2700,hp:2,col:'#c62828'}
    ]}
];

// ---- Helpers ----
function overlap(a,b){return a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y}
function burst(x,y,c,n){for(let i=0;i<n;i++)particles.push({x,y,vx:(Math.random()-.5)*5,vy:(Math.random()-.5)*5,life:25+Math.random()*20,col:c})}

function resetLevel(li){
  currentLevel=li??currentLevel;
  const L=levels[currentLevel];
  P.x=L.spawn.x;P.y=L.spawn.y;P.vx=0;P.vy=0;P.onGround=false;
  P.cd1=0;P.cd2=0;P.flash=0;
  cameraX=0;projectiles=[];particles=[];
  enemies=L.enemies.map(e=>({...e,alive:true}));
  gameWon=false;inCar=false;
  carX=L.carSpawn.x;carY=L.carSpawn.y;carVx=0;
  baFrame=0;baTimer=0;baState='idle';
  $('hud-level').textContent=L.name;
  updateHud();
}

function updateHud(){
  $('hud-enemies').textContent='👾 '+enemies.filter(e=>e.alive).length;
}

// ---- Input (merged keys + touch) ----
function left(){return keys.arrowleft||keys.a||touches.left}
function right(){return keys.arrowright||keys.d||touches.right}
function jumpPressed(){return keys.arrowup||keys.w||keys[' ']||touches.jump}

// ---- Powers ----
function pow1(){
  if(P.cd1>0||inCar)return;
  if(currentHero==='brish'){
    P.flash=10;
    const h={x:P.x+(P.facing>0?P.w-10:-90),y:P.y+20,w:100,h:70};
    enemies.forEach(e=>{if(e.alive&&overlap(h,e)){e.hp-=2;e.x+=40*P.facing;burst(e.x+e.w/2,e.y+20,'#ff8a65',8);if(e.hp<=0)e.alive=false}});
  } else {
    P.vx=12*P.facing;P.flash=8;
    const h={x:P.x+(P.facing>0?P.w-10:-70),y:P.y+10,w:80,h:90};
    enemies.forEach(e=>{if(e.alive&&overlap(h,e)){e.hp-=2;burst(e.x+e.w/2,e.y+20,'#ab47bc',8);if(e.hp<=0)e.alive=false}});
  }
  P.cd1=28;
}
function pow2(){
  if(P.cd2>0||inCar)return;
  if(currentHero==='brish'){
    const s={x:P.x-40,y:P.y+P.h-20,w:P.w+80,h:35};
    enemies.forEach(e=>{if(e.alive&&overlap(s,e)){e.hp--;burst(e.x+e.w/2,e.y+e.h/2,'#ffca28',10);if(e.hp<=0)e.alive=false}});
  } else {
    projectiles.push({x:P.x+P.w/2,y:P.y+28,vx:8*P.facing,vy:0,r:14,life:100});
    burst(P.x+P.w/2,P.y+28,'#7e57c2',8);
  }
  P.cd2=42;
}
function toggleCar(){
  if(inCar){inCar=false;P.x=carX+100;P.y=carY-P.h;P.vy=0;}
  else{const d=Math.hypot(P.x-carX,P.y-carY);if(d<120){inCar=true;carVx=0;}}
}

// ---- Update ----
function update(){
  if(paused||gameWon)return;
  const L=levels[currentLevel];
  if(P.cd1>0)P.cd1--;if(P.cd2>0)P.cd2--;if(P.flash>0)P.flash--;

  if(inCar){updateCar(L);}else{updateFoot(L);}

  // enemies
  enemies.forEach(e=>{
    if(!e.alive)return;
    e.x+=e.dir*e.spd;if(e.x<e.mn||e.x>e.mx)e.dir*=-1;
    const t=inCar?{x:carX,y:carY,w:90,h:50}:P;
    if(overlap(t,e)){
      if(!inCar&&P.vy>1&&P.y+P.h-18<e.y+25){e.hp--;P.vy=-9;burst(e.x+e.w/2,e.y,'#66bb6a',8);if(e.hp<=0)e.alive=false;}
      else if(inCar&&Math.abs(carVx)>2){e.hp-=2;burst(e.x+e.w/2,e.y,'#ffab40',12);if(e.hp<=0)e.alive=false;}
      else if(!inCar){resetLevel();return;}
    }
  });
  updateHud();

  // projectiles
  projectiles.forEach(p=>{p.x+=p.vx;p.life--;enemies.forEach(e=>{
    if(e.alive&&overlap({x:p.x-p.r,y:p.y-p.r,w:p.r*2,h:p.r*2},e)){e.hp-=2;p.life=0;burst(e.x+e.w/2,e.y+e.h/2,'#42a5f5',10);if(e.hp<=0)e.alive=false;}
  })});
  projectiles=projectiles.filter(p=>p.life>0&&p.x>-100&&p.x<3500);

  // particles
  particles.forEach(p=>{p.x+=p.vx;p.y+=p.vy;p.life--});
  particles=particles.filter(p=>p.life>0);

  // goal
  const gt=inCar?{x:carX,y:carY,w:90,h:50}:P;
  if(overlap(gt,L.goal)){gameWon=true;$('win-overlay').classList.remove('hidden');$('win-text').textContent=L.name+' Complete! 🎉';}

  const cx=inCar?carX:P.x;
  cameraX=Math.max(0,Math.min(cx-canvas.width/3,L.goal.x-canvas.width*.7));

  if(P.y>canvas.height+300){resetLevel();}
}

function updateFoot(L){
  let m=0;if(left())m-=1;if(right())m+=1;
  P.vx=m*P.speed;if(m)P.facing=m>0?1:-1;
  P.vy+=gravity;P.x+=P.vx;resolve('x',L);P.y+=P.vy;P.onGround=false;resolve('y',L);
  for(const h of L.hazards)if(overlap(P,h)){resetLevel();return;}
}

function updateCar(L){
  let a=0;if(left())a-=.5;if(right())a+=.5;
  carVx+=a;carVx*=.96;carX+=carVx;
  let on=false;
  for(const p of L.platforms)if(carX+90>p.x&&carX<p.x+p.w&&carY+50>=p.y-5&&carY+50<=p.y+20){carY=p.y-50;on=true;}
  if(!on)carY+=4;
  P.x=carX+10;P.y=carY-40;P.facing=carVx>=0?1:-1;
  for(const h of L.hazards)if(overlap({x:carX,y:carY,w:90,h:50},h)){resetLevel();return;}
}

function resolve(axis,L){
  L.platforms.forEach(p=>{
    if(!overlap(P,p))return;
    if(axis==='x'){if(P.vx>0)P.x=p.x-P.w;if(P.vx<0)P.x=p.x+p.w;}
    else{if(P.vy>0){P.y=p.y-P.h;P.vy=0;P.onGround=true;}else if(P.vy<0){P.y=p.y+p.h;P.vy=0;}}
  });
}

// ---- Draw ----
function draw(){
  const L=levels[currentLevel];
  const W=canvas.width,H=canvas.height;
  // sky
  ctx.fillStyle=L.theme.sky;ctx.fillRect(0,0,W,H);
  // clouds
  ctx.strokeStyle='rgba(255,255,255,.5)';ctx.lineWidth=3;
  for(let i=0;i<8;i++){const x=(i*160)-(cameraX*.12%160);ctx.beginPath();ctx.arc(x,50+(i%3)*40,22,Math.PI*.2,Math.PI*1.7);ctx.stroke();}
  // level-specific bg
  if(currentLevel===0)drawLegoBg(L);
  if(currentLevel===1)drawBeachBg(L);
  if(currentLevel===2)drawMiniBg(L);
  // platforms
  L.platforms.forEach(p=>{
    const x=p.x-cameraX;if(x+p.w<-50||x>W+50)return;
    const cols={lego:'#ffb74d',sand:'#f4d06f',shell:'#ffe0b2',mini:'#d1c4e9',ground:L.theme.ground};
    ctx.fillStyle=cols[p.t]||L.theme.ground;ctx.fillRect(x,p.y,p.w,p.h);
    ctx.strokeStyle='#8d5a2b';ctx.lineWidth=2;ctx.strokeRect(x,p.y,p.w,p.h);
  });
  // hazards
  L.hazards.forEach(h=>{
    const x=h.x-cameraX;
    if(h.t==='water'){ctx.fillStyle='#1e88e5';ctx.fillRect(x,h.y,h.w,h.h);}
    else{ctx.fillStyle='#444';for(let i=0;i<h.w;i+=14){ctx.beginPath();ctx.moveTo(x+i,h.y+h.h);ctx.lineTo(x+i+7,h.y);ctx.lineTo(x+i+14,h.y+h.h);ctx.closePath();ctx.fill();}}
  });
  // goal
  const gx=L.goal.x-cameraX;
  ctx.fillStyle='#fff8e1';ctx.fillRect(gx,L.goal.y,L.goal.w,L.goal.h);
  ctx.strokeStyle='#8d6e63';ctx.lineWidth=4;ctx.strokeRect(gx,L.goal.y,L.goal.w,L.goal.h);
  ctx.fillStyle='#7c4dff';ctx.fillRect(gx+8,L.goal.y+10,24,18);
  // enemies
  enemies.forEach(e=>{
    if(!e.alive)return;const x=e.x-cameraX;
    ctx.fillStyle=e.col;ctx.beginPath();ctx.arc(x+e.w/2,e.y+e.h/2,e.w/2,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#fff';ctx.fillRect(x+e.w*.2,e.y+e.h*.25,6,5);ctx.fillRect(x+e.w*.6,e.y+e.h*.25,6,5);
    ctx.fillStyle='#000';ctx.fillRect(x+e.w*.25,e.y+e.h*.3,3,3);ctx.fillRect(x+e.w*.65,e.y+e.h*.3,3,3);
    ctx.fillStyle='#ef5350';for(let i=0;i<e.hp;i++)ctx.fillRect(x+i*12,e.y-10,8,6);
  });
  // car
  drawCar();
  // projectiles
  projectiles.forEach(p=>{ctx.fillStyle='#ab47bc';ctx.beginPath();ctx.arc(p.x-cameraX,p.y,p.r,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#ede7f6';ctx.lineWidth=3;ctx.stroke()});
  // player
  if(!inCar)drawPlayer();
  // particles
  particles.forEach(p=>{ctx.globalAlpha=Math.max(0,p.life/40);ctx.fillStyle=p.col;ctx.fillRect(p.x-cameraX,p.y,4,4)});
  ctx.globalAlpha=1;
}

function drawLegoBg(L){
  ctx.save();ctx.translate(-cameraX*.4,0);
  for(let i=0;i<10;i++){const x=120+i*280,h=100+(i%3)*40;
    ctx.fillStyle=['#ff9f43','#ffcc66','#ff6b6b'][i%3];ctx.fillRect(x,L.groundY-h,85,h);
    ctx.strokeStyle='#8d5a2b';ctx.lineWidth=3;ctx.strokeRect(x,L.groundY-h,85,h);
  }ctx.restore();
}
function drawBeachBg(L){
  ctx.save();ctx.translate(-cameraX*.3,0);
  ctx.fillStyle='#4fc3f7';ctx.fillRect(0,370,3200,80);
  ctx.fillStyle='#29b6f6';ctx.fillRect(0,420,3200,60);
  ctx.strokeStyle='#fff';ctx.lineWidth=4;
  for(let i=0;i<15;i++){ctx.beginPath();ctx.arc(50+i*190,400+(i%2)*16,32,Math.PI*.1,Math.PI*.9);ctx.stroke();}
  ctx.restore();
}
function drawMiniBg(L){
  ctx.save();ctx.translate(-cameraX*.2,0);
  ctx.strokeStyle='#7e57c2';ctx.lineWidth=3;ctx.beginPath();
  ctx.moveTo(80,80);ctx.bezierCurveTo(160,20,220,140,300,60);ctx.bezierCurveTo(380,10,420,120,520,40);ctx.stroke();
  ctx.restore();
}

function drawCar(){
  const cx=carX-cameraX;
  const i=currentHero==='brish'?img.brishCar:img.monkoCar;
  if(i&&i.complete&&i.naturalWidth>0){
    ctx.save();if(carVx<-.5){ctx.translate(cx+45,0);ctx.scale(-1,1);ctx.drawImage(i,-45,carY,90,50);}
    else ctx.drawImage(i,cx,carY,90,50);ctx.restore();
  }else{ctx.fillStyle='#78909c';ctx.fillRect(cx,carY,90,50);}
  if(!inCar){const d=Math.hypot(P.x-carX,P.y-carY);
    if(d<120){ctx.fillStyle='rgba(0,0,0,.6)';ctx.font='bold 14px sans-serif';ctx.fillText('🚗 E',cx+22,carY-8);}}
}

function drawPlayer(){
  const x=P.x-cameraX;
  if(P.flash>0){ctx.fillStyle=currentHero==='brish'?'rgba(255,138,101,.25)':'rgba(171,71,188,.22)';ctx.beginPath();ctx.arc(x+P.w/2,P.y+P.h/2,72,0,Math.PI*2);ctx.fill();}
  // Brish animated
  if(currentHero==='brish'&&img.brishStrip&&img.brishStrip.complete&&img.brishStrip.naturalWidth>0){
    updateBrishAnim();
    const a=BA[baState]||[0];const fi=a[baFrame%a.length];
    ctx.save();
    if(P.facing<0){ctx.translate(x+P.w/2,0);ctx.scale(-1,1);ctx.drawImage(img.brishStrip,fi*BFW,0,BFW,BFH,-P.w/2,P.y,P.w,P.h);}
    else ctx.drawImage(img.brishStrip,fi*BFW,0,BFW,BFH,x,P.y,P.w,P.h);
    ctx.restore();
  } else {
    const i=currentHero==='brish'?img.brish:img.monko;
    if(!i||!i.complete)return;
    ctx.save();
    if(P.facing<0){ctx.translate(x+P.w/2,0);ctx.scale(-1,1);ctx.drawImage(i,-P.w/2,P.y,P.w,P.h);}
    else ctx.drawImage(i,x,P.y,P.w,P.h);
    ctx.restore();
  }
}

function updateBrishAnim(){
  let s='idle';
  if(P.flash>0)s=P.cd1<20?'punch1':'punch2';
  else if(!P.onGround&&P.vy<0)s='jump';
  else if(!P.onGround&&P.vy>0)s='fall';
  else if(Math.abs(P.vx)>.5)s='walk';
  if(s!==baState){baState=s;baFrame=0;baTimer=0;}
  baTimer++;
  const spd=s==='walk'?8:s==='punch1'?5:12;
  if(baTimer>=spd){baTimer=0;baFrame=(baFrame+1)%(BA[baState]||[0]).length;}
}

// ---- Resize ----
function resize(){
  const dpr=window.devicePixelRatio||1;
  const r=canvas.parentElement.getBoundingClientRect();
  canvas.width=r.width*dpr;canvas.height=r.height*dpr;
  ctx.setTransform(dpr,0,0,dpr,0,0);
  canvas.style.width=r.width+'px';canvas.style.height=r.height+'px';
}

// ---- Loop ----
function loop(){
  resize();
  if(imgLoaded>=imgTotal){update();draw();}
  else{ctx.fillStyle='#1a1a2e';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.fillStyle='#fff';ctx.font='bold 24px sans-serif';ctx.fillText('Loading…',canvas.width/4,canvas.height/2);}
  requestAnimationFrame(loop);
}

// ---- Keyboard ----
window.addEventListener('keydown',e=>{
  const k=e.key.toLowerCase();keys[k]=true;
  if((k==='w'||k==='arrowup'||k===' ')&&P.onGround&&!inCar&&!gameWon&&!paused){P.vy=P.jumpV;P.onGround=false;}
  if(k==='j'&&!gameWon&&!paused)pow1();
  if(k==='k'&&!gameWon&&!paused)pow2();
  if(k==='e'&&!gameWon&&!paused)toggleCar();
  if(k==='r')resetLevel();
  if(k==='escape'){paused=!paused;$('pause-overlay').classList.toggle('hidden',!paused);}
});
window.addEventListener('keyup',e=>{keys[e.key.toLowerCase()]=false});

// ---- Touch ----
function bindTouch(id,key){
  const el=$(id);if(!el)return;
  const on=()=>{touches[key]=true};const off=()=>{touches[key]=false};
  el.addEventListener('touchstart',e=>{e.preventDefault();on()},{passive:false});
  el.addEventListener('touchend',e=>{e.preventDefault();off()},{passive:false});
  el.addEventListener('touchcancel',off);
  el.addEventListener('mousedown',on);el.addEventListener('mouseup',off);el.addEventListener('mouseleave',off);
}
bindTouch('btn-left','left');bindTouch('btn-right','right');

// Jump touch — also trigger jump action
$('btn-jump')?.addEventListener('touchstart',e=>{e.preventDefault();touches.jump=true;if(P.onGround&&!inCar&&!gameWon&&!paused){P.vy=P.jumpV;P.onGround=false;}},{passive:false});
$('btn-jump')?.addEventListener('touchend',e=>{e.preventDefault();touches.jump=false},{passive:false});

$('btn-pow1')?.addEventListener('touchstart',e=>{e.preventDefault();if(!gameWon&&!paused)pow1()},{passive:false});
$('btn-pow2')?.addEventListener('touchstart',e=>{e.preventDefault();if(!gameWon&&!paused)pow2()},{passive:false});
$('btn-car')?.addEventListener('touchstart',e=>{e.preventDefault();if(!gameWon&&!paused)toggleCar()},{passive:false});

// ---- UI wiring ----
document.querySelectorAll('.hero-btn').forEach(b=>{
  b.addEventListener('click',()=>{document.querySelectorAll('.hero-btn').forEach(x=>x.classList.remove('selected'));b.classList.add('selected');currentHero=b.dataset.hero;});
});
document.querySelectorAll('.lvl-btn').forEach(b=>{
  b.addEventListener('click',()=>{document.querySelectorAll('.lvl-btn').forEach(x=>x.classList.remove('selected'));b.classList.add('selected');currentLevel=+b.dataset.level;});
});

$('play-btn').addEventListener('click',()=>{
  $('title-screen').classList.remove('active');$('game-screen').classList.add('active');
  resetLevel(currentLevel);loop();
});
$('hud-pause').addEventListener('click',()=>{paused=true;$('pause-overlay').classList.remove('hidden');});
$('resume-btn').addEventListener('click',()=>{paused=false;$('pause-overlay').classList.add('hidden');});
$('restart-btn').addEventListener('click',()=>{paused=false;$('pause-overlay').classList.add('hidden');resetLevel();});
$('menu-btn').addEventListener('click',()=>{paused=false;$('pause-overlay').classList.add('hidden');$('game-screen').classList.remove('active');$('title-screen').classList.add('active');});
$('next-btn').addEventListener('click',()=>{$('win-overlay').classList.add('hidden');resetLevel((currentLevel+1)%levels.length);});
$('replay-btn').addEventListener('click',()=>{$('win-overlay').classList.add('hidden');resetLevel();});
$('win-menu-btn').addEventListener('click',()=>{$('win-overlay').classList.add('hidden');$('game-screen').classList.remove('active');$('title-screen').classList.add('active');});
