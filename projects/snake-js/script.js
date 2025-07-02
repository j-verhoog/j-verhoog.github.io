const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const grid = 20;

let count = 0;
let speed = 4;               // default “Normal”
let gameStarted = false;     
let lastScore = 0;
let wallsEnabledGame = false; // fixed setting per game

// Elements
const wallsCheckbox = document.getElementById('walls');
const speedSelect = document.getElementById('speed');
const overlay = document.getElementById('overlay');
const submitBtn = document.getElementById('submit-score');

// Snake state
const snake = { x: grid*4, y: grid*4, dx: grid, dy: 0, cells: [], maxCells: 4 };

// Apple state
const apple = { x: grid*10, y: grid*10 };
let score = 0;

// Leaderboard storage key
const leaderboardKey = 'snake_leaderboard';

// Utility
function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min)) + min;
}

// Load & render leaderboard
function loadLeaderboard() {
  return JSON.parse(localStorage.getItem(leaderboardKey)) || [];
}
function renderLeaderboard() {
  const data = loadLeaderboard();
  const tbody = document.querySelector('#leaderboard-table tbody');
  tbody.innerHTML = '';
  data.forEach(entry => {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${entry.name}</td><td>${entry.score}</td><td>${entry.speed}</td><td>${entry.walls}</td>`;
    tbody.appendChild(tr);
  });
}

// Save a new entry
function saveLeaderboardEntry(entry) {
  const data = loadLeaderboard();
  data.push(entry);
  data.sort((a, b) => b.score - a.score);
  localStorage.setItem(leaderboardKey, JSON.stringify(data));
  renderLeaderboard();
}

// Handle game over
function gameOver() {
  lastScore = score;
  const speedMap = { '8': 'Slow', '4': 'Normal', '2': 'Fast', '1': 'Superfast' };
  document.getElementById('entry-score').value = lastScore;
  document.getElementById('entry-speed').value = speedMap[speed];
  document.getElementById('entry-walls').value = wallsEnabledGame ? 'Yes' : 'No';
  submitBtn.disabled = false;
  overlay.style.display = 'flex';
  wallsCheckbox.disabled = false;  // re-enable for next game

  // reset snake & apple
  snake.x = grid*4; snake.y = grid*4; snake.cells = []; snake.maxCells = 4;
  snake.dx = grid; snake.dy = 0;
  apple.x = getRandomInt(0, canvas.width/grid) * grid;
  apple.y = getRandomInt(0, canvas.height/grid) * grid;
  score = 0;
  gameStarted = false;
}

// Main game loop
function loop() {
  requestAnimationFrame(loop);
  if (!gameStarted) return;
  if (++count < speed) return;
  count = 0;

  // move
  snake.x += snake.dx;
  snake.y += snake.dy;

  // walls or wrap
  if (wallsEnabledGame) {
    if (snake.x < 0 || snake.x >= canvas.width || snake.y < 0 || snake.y >= canvas.height) {
      gameOver();
      return;
    }
  } else {
    if (snake.x < 0) snake.x = canvas.width - grid;
    else if (snake.x >= canvas.width) snake.x = 0;
    if (snake.y < 0) snake.y = canvas.height - grid;
    else if (snake.y >= canvas.height) snake.y = 0;
  }

  // snake body update
  snake.cells.unshift({ x: snake.x, y: snake.y });
  if (snake.cells.length > snake.maxCells) snake.cells.pop();

  // clear & draw apple
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = 'red';
  ctx.fillRect(apple.x, apple.y, grid-1, grid-1);

  // draw snake & detect collisions
  for (let i = 0; i < snake.cells.length; i++) {
    const cell = snake.cells[i];
    ctx.fillStyle = 'lime';
    ctx.fillRect(cell.x, cell.y, grid-1, grid-1);

    // apple collision
    if (cell.x === apple.x && cell.y === apple.y) {
      snake.maxCells++; score++;
      apple.x = getRandomInt(0, canvas.width/grid) * grid;
      apple.y = getRandomInt(0, canvas.height/grid) * grid;
    }
    // self collision
    for (let j = i+1; j < snake.cells.length; j++) {
      if (cell.x === snake.cells[j].x && cell.y === snake.cells[j].y) {
        gameOver();
        return;
      }
    }
  }

  // draw score
  ctx.fillStyle = 'white';
  ctx.font = '20px sans-serif';
  ctx.fillText(`Score: ${score}`, 10, 24);
}

// Controls and event handlers
function setDirection(x, y) {
  if (snake.dx === 0 && x !== 0) { snake.dx = x*grid; snake.dy = 0; }
  else if (snake.dy === 0 && y !== 0) { snake.dx = 0; snake.dy = y*grid; }
}

// Prevent arrow keys from scrolling
document.addEventListener('keydown', e => {
  if (['ArrowLeft','ArrowUp','ArrowRight','ArrowDown'].includes(e.key)) {
    e.preventDefault();
    switch (e.key) {
      case 'ArrowLeft':  setDirection(-1,0); break;
      case 'ArrowUp':    setDirection(0,-1); break;
      case 'ArrowRight': setDirection(1,0); break;
      case 'ArrowDown':  setDirection(0,1); break;
    }
  }
});
    
['up','left','down','right'].forEach(dir => {
  document.getElementById(dir).addEventListener('click', () => {
    const m = { up:[0,-1], left:[-1,0], down:[0,1], right:[1,0] };
    setDirection(...m[dir]);
  });
});

// Speed selector
speedSelect.addEventListener('change', e => speed = parseInt(e.target.value,10));

// Start button
document.getElementById('start').addEventListener('click', () => {
  wallsEnabledGame = wallsCheckbox.checked;
  wallsCheckbox.disabled = true;       // lock walls choice
  overlay.style.display = 'none';
  gameStarted = true;
  submitBtn.disabled = true;
});

// Leaderboard form
document.getElementById('leaderboard-form').addEventListener('submit', e => {
  e.preventDefault();
  const name = document.getElementById('player-name').value.trim();
  if (!name) return;
  saveLeaderboardEntry({
    name,
    score: lastScore,
    speed: document.getElementById('entry-speed').value,
    walls: document.getElementById('entry-walls').value
  });
  document.getElementById('player-name').value = '';
  submitBtn.disabled = true;
});

// Init
renderLeaderboard();
requestAnimationFrame(loop);
