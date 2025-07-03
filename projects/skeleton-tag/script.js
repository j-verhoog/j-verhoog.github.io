// ---------------- DOM refs ----------------
const video         = document.getElementById('video');
const canvas        = document.getElementById('overlay');
const ctx           = canvas.getContext('2d');
const startBtn      = document.getElementById('startBtn');
const resetBtn      = document.getElementById('resetBtn');
const playAgainBtn  = document.getElementById('playAgainBtn');
const speedSelect   = document.getElementById('speedSelect');
const scoreEl       = document.getElementById('score');
const sndGood       = document.getElementById('sndGood');
const sndBad        = document.getElementById('sndBad');
const sndWin        = document.getElementById('sndWin');
const victoryScreen = document.getElementById('victoryScreen');

// ---------------- ensure inline video on iOS ----------------
video.setAttribute('playsinline', '');
video.setAttribute('webkit-playsinline', '');

// ---------------- getUserMedia fallback ----------------
navigator.mediaDevices = navigator.mediaDevices || {};
if (!navigator.mediaDevices.getUserMedia) {
  navigator.mediaDevices.getUserMedia = function(constraints) {
    const legacy = navigator.webkitGetUserMedia || navigator.mozGetUserMedia;
    if (!legacy) {
      return Promise.reject(new Error('getUserMedia is not supported in this browser'));
    }
    return new Promise((resolve, reject) => {
      legacy.call(navigator, constraints, resolve, reject);
    });
  };
}

// ---------------- Speed settings ----------------
const SPEED_MULTIPLIERS = {
  slow:      0.5,
  normal:    1,
  fast:      1.5,
  superfast: 2
};

// ---------------- Game state ----------------
let model, running = false, score = 0;
let tags = [], dots = [];
const FACE_RADIUS = 6;

// ---------------- Helper classes ----------------
class Tag {
  constructor() {
    const w = canvas.width, h = canvas.height;
    const edge = Math.floor(Math.random() * 4);
    if (edge === 0) { this.x = Math.random() * w; this.y = 0; }
    if (edge === 1) { this.x = w;             this.y = Math.random() * h; }
    if (edge === 2) { this.x = Math.random() * w; this.y = h; }
    if (edge === 3) { this.x = 0;             this.y = Math.random() * h; }
    this.size  = 15;
    this.speed = 1.5;
  }
  update(tx, ty) {
    if (tx == null || ty == null) return;
    const dx   = tx - this.x;
    const dy   = ty - this.y;
    const dist = Math.hypot(dx, dy) || 1;
    const mv   = this.speed * SPEED_MULTIPLIERS[speedSelect.value];
    this.x += mv * (dx / dist);
    this.y += mv * (dy / dist);
  }
  draw() {
    ctx.fillStyle = 'red';
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, 2 * Math.PI);
    ctx.fill();
  }
}

class Dot {
  constructor() {
    this.size = 12;
    this.x = this.size + Math.random() * (canvas.width  - 2*this.size);
    this.y = this.size + Math.random() * (canvas.height - 2*this.size);
  }
  draw() {
    ctx.fillStyle = 'green';
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, 2 * Math.PI);
    ctx.fill();
  }
}

// ---------------- Camera & Model setup ----------------
async function setupCamera() {
  const stream = await navigator.mediaDevices.getUserMedia({ video: true });
  video.srcObject = stream;
  await video.play();   // now unblocked by playsinline above
  return new Promise(res => {
    if (video.readyState >= 3) res();
    else video.addEventListener('loadeddata', () => res(), { once: true });
  });
}

async function loadModel() {
  model = await blazeface.load();
}

// ---------------- Game logic ----------------
function resetGame() {
  score = 0;
  scoreEl.textContent = 'Score: 0';
  tags = Array.from({ length: 3 }, () => new Tag());
  dots = Array.from({ length: 5 }, () => new Dot());
  victoryScreen.style.display = 'none';
  const secret = document.getElementById('secretMsg');
  if (secret) secret.remove();
}

function triggerVictory() {
  running = false;
  sndWin.currentTime = 0;
  sndWin.play().catch(() => {});
  victoryScreen.style.display = 'flex';
  if (speedSelect.value === 'superfast') {
    const p = document.createElement('p');
    p.id = 'secretMsg';
    p.textContent = '🎉 Secret Unlocked: Supersonic Victory Mode! 🎉';
    p.style.fontSize = '1.2rem';
    p.style.marginTop = '1rem';
    victoryScreen.querySelector('.victory-content').appendChild(p);
  }
}

async function gameLoop() {
  if (!running) return;

  const preds = await model.estimateFaces(video, false);
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (preds.length > 0) {
    const lm = preds[0].landmarks;
    const parts = {
      rightEye: lm[0],
      leftEye:  lm[1],
      nose:     lm[2],
      rightEar: lm[4],
      leftEar:  lm[5]
    };

    Object.entries(parts).forEach(([part, [x,y]]) => {
      ctx.beginPath();
      ctx.arc(x, y, FACE_RADIUS, 0, 2 * Math.PI);
      ctx.fillStyle = part === 'nose' ? 'darkblue' : 'lightblue';
      ctx.fill();
    });

    const [nx, ny] = parts.nose;

    // tags chase nose
    tags.forEach((t,i) => {
      t.update(nx, ny);
      t.draw();
      if (Math.hypot(t.x - nx, t.y - ny) < t.size + FACE_RADIUS) {
        sndBad.currentTime = 0;
        sndBad.play().catch(() => {});
        score--;
        scoreEl.textContent = `Score: ${score}`;
        tags[i] = new Tag();
      }
    });

    // merge overlapping tags
    for (let i = 0; i < tags.length; i++) {
      for (let j = i + 1; j < tags.length; j++) {
        const dx = tags[i].x - tags[j].x;
        const dy = tags[i].y - tags[j].y;
        if (Math.hypot(dx, dy) < tags[i].size + tags[j].size) {
          tags.splice(j, 1);
          tags.push(new Tag());
          j--;
        }
      }
    }

    // collect dots
    dots.forEach((d,i) => {
      if (Math.hypot(d.x - nx, d.y - ny) < d.size + FACE_RADIUS) {
        sndGood.currentTime = 0;
        sndGood.play().catch(() => {});
        score++;
        scoreEl.textContent = `Score: ${score}`;
        dots.splice(i, 1);
        dots.push(new Dot());
        if (score >= 20) triggerVictory();
      }
    });
  }

  // draw dots every frame
  dots.forEach(d => d.draw());

  if (running) requestAnimationFrame(gameLoop);
}

// ---------------- Event wiring ----------------
startBtn.addEventListener('click', async () => {
  startBtn.disabled = true;

  // ── Prime audio on user gesture so future .play() won't be blocked ──
  [sndGood, sndBad, sndWin].forEach(a => {
    a.preload = 'auto';
    a.currentTime = 0;
    a.play()
      .then(() => a.pause())
      .catch(() => {/* ignore if already unlocked */});
  });

  await setupCamera();
  await loadModel();

  // base sizing & mobile scaling
  canvas.width  = video.videoWidth;
  canvas.height = video.videoHeight;
  const isMobile = /Mobi|Android/i.test(navigator.userAgent);
  if (isMobile) {
    const vw = window.innerWidth;
    const ar = video.videoHeight / video.videoWidth;
    const vh = vw * ar;
    [video, canvas].forEach(el => {
      el.style.width  = `${vw}px`;
      el.style.height = `${vh}px`;
    });
    const gc = document.getElementById('gameContainer');
    gc.style.width  = `${vw}px`;
    gc.style.height = `${vh}px`;
    document.body.style.overflowY = 'auto';
    canvas.width  = vw;
    canvas.height = vh;
  }

  resetGame();
  running = true;
  gameLoop();
});

resetBtn.addEventListener('click', resetGame);
playAgainBtn.addEventListener('click', () => {
  resetGame();
  running = true;
  gameLoop();
});
