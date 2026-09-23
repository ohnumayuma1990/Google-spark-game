import { AssetManager } from './AssetManager.js';

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const assetManager = new AssetManager();

// Game State
const state = {
  player: {
    x: 100,
    y: 260,
    vx: 0,
    vy: 0,
    width: 64,
    height: 64,
    isGrounded: true,
    facingLeft: false,
  },
  keys: {},
  lastActionMessage: 'キーを押してアクションをテストしてください',
  actionMessageTime: 0,
  effects: [], // 爆発・コイン効果アニメーション用
};

const GRAVITY = 0.5;
const JUMP_FORCE = -10;
const MOVE_SPEED = 4;
const GROUND_Y = 260;

// Key Listeners
window.addEventListener('keydown', (e) => {
  const code = e.code;
  if (!state.keys[code]) {
    state.keys[code] = true;
    handleKeyPress(code);
  }
});

window.addEventListener('keyup', (e) => {
  state.keys[e.code] = false;
});

// Key Press Actions (SE Triggers)
function handleKeyPress(code) {
  // Web Audio Context のアクティベート（ユーザー操作が必要）
  assetManager.getAudioContext();

  if (code === 'Space') {
    if (state.player.isGrounded) {
      state.player.vy = JUMP_FORCE;
      state.player.isGrounded = false;
      assetManager.playSound('jump');
      setActionMessage('SE再生: Jump (se_jump.wav)');
    }
  } else if (code === 'KeyC') {
    assetManager.playSound('coin');
    setActionMessage('SE再生: Coin (se_coin.wav)');
    addEffect('coin', state.player.x + 16, state.player.y - 20);
  } else if (code === 'KeyE') {
    assetManager.playSound('explosion');
    setActionMessage('SE再生: Explosion (se_explosion.wav)');
    addEffect('explosion', state.player.x, state.player.y);
  }
}

function setActionMessage(msg) {
  state.lastActionMessage = msg;
  state.actionMessageTime = Date.now();
}

function addEffect(type, x, y) {
  state.effects.push({
    type,
    x,
    y,
    startTime: Date.now(),
    duration: 500,
  });
}

// Update Loop
function update() {
  if (!assetManager.isLoaded()) return;

  // Move Player
  state.player.vx = 0;
  if (state.keys['ArrowLeft'] || state.keys['KeyA']) {
    state.player.vx = -MOVE_SPEED;
    state.player.facingLeft = true;
  }
  if (state.keys['ArrowRight'] || state.keys['KeyD']) {
    state.player.vx = MOVE_SPEED;
    state.player.facingLeft = false;
  }

  state.player.x += state.player.vx;

  // Keep in screen
  if (state.player.x < 0) state.player.x = 0;
  if (state.player.x > canvas.width - state.player.width) {
    state.player.x = canvas.width - state.player.width;
  }

  // Gravity & Ground Collision
  state.player.vy += GRAVITY;
  state.player.y += state.player.vy;

  if (state.player.y >= GROUND_Y) {
    state.player.y = GROUND_Y;
    state.player.vy = 0;
    state.player.isGrounded = true;
  }

  // Filter finished effects
  const now = Date.now();
  state.effects = state.effects.filter((e) => now - e.startTime < e.duration);
}

// Render Loop
function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Background Grid / Ground
  ctx.fillStyle = '#34495e';
  ctx.fillRect(0, GROUND_Y + 64, canvas.width, canvas.height - (GROUND_Y + 64));

  ctx.strokeStyle = '#455a64';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, GROUND_Y + 64);
  ctx.lineTo(canvas.width, GROUND_Y + 64);
  ctx.stroke();

  if (!assetManager.isLoaded()) {
    // Loading Screen
    ctx.fillStyle = '#ffffff';
    ctx.font = '20px sans-serif';
    ctx.textAlign = 'center';
    const progress = Math.floor(assetManager.getProgress() * 100);
    ctx.fillText(`Loading Assets... ${progress}%`, canvas.width / 2, canvas.height / 2);
    return;
  }

  // Draw Static Objects
  // Slime
  const slimeImg = assetManager.getImage('slime');
  ctx.drawImage(slimeImg, 450, GROUND_Y, 64, 64);

  // Floating Coin
  const coinImg = assetManager.getImage('coin');
  const coinYOffset = Math.sin(Date.now() / 200) * 8;
  ctx.drawImage(coinImg, 300, GROUND_Y - 50 + coinYOffset, 48, 48);

  // Draw Player
  const heroImg = assetManager.getImage('hero');
  ctx.save();
  if (state.player.facingLeft) {
    ctx.translate(state.player.x + state.player.width, state.player.y);
    ctx.scale(-1, 1);
    ctx.drawImage(heroImg, 0, 0, state.player.width, state.player.height);
  } else {
    ctx.drawImage(heroImg, state.player.x, state.player.y, state.player.width, state.player.height);
  }
  ctx.restore();

  // Draw Effects
  const now = Date.now();
  for (const fx of state.effects) {
    const elapsed = now - fx.startTime;
    const alpha = 1.0 - elapsed / fx.duration;
    ctx.save();
    ctx.globalAlpha = alpha;
    if (fx.type === 'coin') {
      ctx.fillStyle = '#f1c40f';
      ctx.font = 'bold 20px sans-serif';
      ctx.fillText('+100', fx.x, fx.y - elapsed * 0.05);
    } else if (fx.type === 'explosion') {
      ctx.fillStyle = '#e74c3c';
      ctx.beginPath();
      ctx.arc(fx.x + 32, fx.y + 32, (elapsed * 0.1) + 10, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // Draw HUD & Asset Status
  ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
  ctx.fillRect(10, 10, 320, 85);

  ctx.fillStyle = '#2ecc71';
  ctx.font = '14px monospace';
  ctx.textAlign = 'left';
  ctx.fillText(`[Asset Status] Loaded: ${assetManager.loadedAssets}/${assetManager.totalAssets}`, 20, 30);

  ctx.fillStyle = '#ecf0f1';
  ctx.fillText(`Player Pos: (${Math.floor(state.player.x)}, ${Math.floor(state.player.y)})`, 20, 50);

  ctx.fillStyle = '#f39c12';
  ctx.fillText(state.lastActionMessage, 20, 75);
}

// Game Loop
function loop() {
  update();
  render();
  requestAnimationFrame(loop);
}

// Main Initialization
async function init() {
  console.log('Initializing game and loading assets...');
  try {
    await assetManager.loadManifest('../assets/assets.json');
    console.log('All assets loaded successfully.');
  } catch (err) {
    console.error('Failed to load assets:', err);
  }
  requestAnimationFrame(loop);
}

init();
