// script.js

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

// ---------------- Speed settings ----------------
const SPEED_MULTIPLIERS = {
  slow:      0.6,
  normal:    1.25,
  fast:      2,
  superfast: 3
};

// ---------------- Secret facts ----------------
const SECRET_FACTS = [
  "A day on Venus lasts longer than a year there.",
  "The first robots were described in a 1921 play by Karel Čapek.",
  "Your nose’s shape is unique, like a fingerprint."
];

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
    // spawn fully within bounds
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
  await video.play();
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
    // pick 3 random facts
    const facts = SECRET_FACTS
      .sort(() => Math.random() - 0.5)
      .slice(0, 3);
    const container = document.createElement('div');
    container.id = 'secretMsg';
    container.style.marginTop = '1rem';
    container.style.color     = '#ff0';
    container.innerHTML = `<h3>🎉 Secret Facts:</h3><ul>${facts
      .map(f => `<li>${f}</li>`)
      .join('')}</ul>`;
    victoryScreen.querySelector('.victory-content')
      .appendChild(container);
  }
}

async function gameLoop() {
  if (!running) return;

  // detect face landmarks
  const preds = await model.estimateFaces(video, false);
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (preds.length > 0) {
    const lm = preds[0].landmarks;
    // map detections
    const parts = {
      rightEye: lm[0],
      leftEye:  lm[1],
      nose:     lm[2],
      rightEar: lm[4],
      leftEar:  lm[5]
    };

    // draw landmarks
    Object.entries(parts).forEach(([part, [x,y]]) => {
      ctx.beginPath();
      ctx.arc(x, y, FACE_RADIUS, 0, 2 * Math.PI);
      ctx.fillStyle = (part === 'nose' ? 'darkblue' : 'lightblue');
      ctx.fill();
    });

    const [nx, ny] = parts.nose;

    // update & draw tags, handle nose collisions
    tags.forEach((t, i) => {
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

    // eliminate tag-tag collisions
    for (let i = 0; i < tags.length; i++) {
      for (let j = i + 1; j < tags.length; j++) {
        const dx = tags[i].x - tags[j].x;
        const dy = tags[i].y - tags[j].y;
        if (Math.hypot(dx, dy) < tags[i].size + tags[j].size) {
          // remove the j-th and spawn a replacement
          tags.splice(j, 1);
          tags.push(new Tag());
          j--;
        }
      }
    }

    // collect green dots
    dots.forEach((d, i) => {
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

  // draw green dots
  dots.forEach(d => d.draw());

  if (running) requestAnimationFrame(gameLoop);
}

// ---------------- Event wiring ----------------
startBtn.addEventListener('click', async () => {
  startBtn.disabled = true;
  await setupCamera();
  canvas.width  = video.videoWidth;
  canvas.height = video.videoHeight;
  await loadModel();
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
