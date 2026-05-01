const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

const startScreen = document.getElementById('start-screen');
const gameHud = document.getElementById('game-hud');
const gameOverScreen = document.getElementById('game-over-screen');
const startBtn = document.getElementById('start-btn');
const restartBtn = document.getElementById('restart-btn');
const scoreDisplay = document.getElementById('score-display');
const finalScore = document.getElementById('final-score');
const bestScore = document.getElementById('best-score');

// Game constants
let GAME_WIDTH = canvas.offsetWidth;
let GAME_HEIGHT = canvas.offsetHeight;
let GRAVITY = 0.5;
let FLAP_SPEED = -8;
let PIPE_SPEED = 3;
let PIPE_WIDTH = 60;
let PIPE_GAP = 180;
let PIPE_SPAWN_RATE = 100; // Frames

// Colors
const BIRD_COLOR = '#ff007f';
const BIRD_GLOW = '#ff007f';
const PIPE_COLOR = '#45a29e';
const PIPE_GLOW = '#66fcf1';

// Game variables
let bird;
let pipes;
let score;
let highScore = localStorage.getItem('neonBirdHighScore') || 0;
let frames;
let gameState = 'START'; // START, PLAYING, GAMEOVER
let animationId;

// Resize handling
function resizeCanvas() {
    const container = document.getElementById('game-container');
    GAME_WIDTH = container.offsetWidth;
    GAME_HEIGHT = container.offsetHeight;
    canvas.width = GAME_WIDTH;
    canvas.height = GAME_HEIGHT;
    
    // Update variables based on size
    PIPE_WIDTH = Math.max(50, GAME_WIDTH * 0.15);
    PIPE_GAP = Math.max(150, GAME_HEIGHT * 0.25);
    
    // Draw initial state if START
    if (gameState === 'START') {
        initGame();
        draw();
    }
}
window.addEventListener('resize', resizeCanvas);

class Bird {
    constructor() {
        this.x = GAME_WIDTH * 0.2;
        this.y = GAME_HEIGHT / 2;
        this.velocity = 0;
        this.radius = 12;
    }

    flap() {
        this.velocity = FLAP_SPEED;
    }

    update() {
        this.velocity += GRAVITY;
        this.y += this.velocity;
        
        // Floor collision
        if (this.y + this.radius >= GAME_HEIGHT) {
            this.y = GAME_HEIGHT - this.radius;
            gameOver();
        }
        
        // Ceiling collision
        if (this.y - this.radius <= 0) {
            this.y = this.radius;
            this.velocity = 0;
        }
    }

    draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        
        // Rotation based on velocity
        let angle = Math.min(Math.PI / 4, Math.max(-Math.PI / 4, (this.velocity * 0.1)));
        ctx.rotate(angle);
        
        // Glow effect
        ctx.shadowBlur = 15;
        ctx.shadowColor = BIRD_GLOW;
        
        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = BIRD_COLOR;
        ctx.fill();
        ctx.closePath();
        
        // Eye
        ctx.beginPath();
        ctx.arc(this.radius/2, -this.radius/4, this.radius/4, 0, Math.PI * 2);
        ctx.fillStyle = '#fff';
        ctx.fill();
        ctx.closePath();
        
        ctx.restore();
    }
}

class Pipe {
    constructor() {
        this.x = GAME_WIDTH;
        // Ensure pipe gap is within screen bounds
        let minHeight = 50;
        let maxHeight = GAME_HEIGHT - PIPE_GAP - minHeight;
        this.topHeight = Math.random() * (maxHeight - minHeight) + minHeight;
        
        this.bottomY = this.topHeight + PIPE_GAP;
        this.bottomHeight = GAME_HEIGHT - this.bottomY;
        this.passed = false;
    }

    update() {
        this.x -= PIPE_SPEED;
    }

    draw() {
        ctx.save();
        ctx.shadowBlur = 10;
        ctx.shadowColor = PIPE_GLOW;
        
        // Gradient for pipes
        let gradTop = ctx.createLinearGradient(this.x, 0, this.x + PIPE_WIDTH, 0);
        gradTop.addColorStop(0, PIPE_COLOR);
        gradTop.addColorStop(1, '#1f2833');
        
        let gradBottom = ctx.createLinearGradient(this.x, this.bottomY, this.x + PIPE_WIDTH, this.bottomY);
        gradBottom.addColorStop(0, PIPE_COLOR);
        gradBottom.addColorStop(1, '#1f2833');

        ctx.fillStyle = gradTop;
        // Top pipe
        ctx.fillRect(this.x, 0, PIPE_WIDTH, this.topHeight);
        
        ctx.fillStyle = gradBottom;
        // Bottom pipe
        ctx.fillRect(this.x, this.bottomY, PIPE_WIDTH, this.bottomHeight);
        
        // Pipe caps
        ctx.fillStyle = PIPE_GLOW;
        ctx.shadowBlur = 15;
        ctx.fillRect(this.x - 5, this.topHeight - 20, PIPE_WIDTH + 10, 20);
        ctx.fillRect(this.x - 5, this.bottomY, PIPE_WIDTH + 10, 20);
        
        ctx.restore();
    }
    
    checkCollision(bird) {
        let birdLeft = bird.x - bird.radius + 2; // slight tolerance
        let birdRight = bird.x + bird.radius - 2;
        let birdTop = bird.y - bird.radius + 2;
        let birdBottom = bird.y + bird.radius - 2;
        
        let pipeLeft = this.x;
        let pipeRight = this.x + PIPE_WIDTH;
        
        // Check horizontal overlap
        if (birdRight > pipeLeft && birdLeft < pipeRight) {
            // Check vertical overlap (hit top pipe OR hit bottom pipe)
            if (birdTop < this.topHeight || birdBottom > this.bottomY) {
                return true;
            }
        }
        return false;
    }
}

function initGame() {
    bird = new Bird();
    pipes = [];
    score = 0;
    frames = 0;
    scoreDisplay.innerText = score;
}

function update() {
    if (gameState !== 'PLAYING') return;

    bird.update();

    if (frames % PIPE_SPAWN_RATE === 0) {
        pipes.push(new Pipe());
    }

    for (let i = pipes.length - 1; i >= 0; i--) {
        let p = pipes[i];
        p.update();

        if (p.checkCollision(bird)) {
            gameOver();
        }

        // Score update
        if (p.x + PIPE_WIDTH < bird.x - bird.radius && !p.passed) {
            score++;
            scoreDisplay.innerText = score;
            p.passed = true;
        }

        // Remove off-screen pipes
        if (p.x + PIPE_WIDTH < 0) {
            pipes.splice(i, 1);
        }
    }
    
    // Increase difficulty gradually
    if (frames > 0 && frames % 500 === 0 && PIPE_SPEED < 8) {
        PIPE_SPEED += 0.5;
        PIPE_SPAWN_RATE = Math.max(60, PIPE_SPAWN_RATE - 5);
    }

    frames++;
}

function draw() {
    ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    
    // Draw pipes
    for (let p of pipes) {
        p.draw();
    }
    
    // Draw bird
    if (bird) {
        bird.draw();
    }
}

function loop() {
    update();
    draw();
    if (gameState === 'PLAYING') {
        animationId = requestAnimationFrame(loop);
    }
}

function startGame() {
    initGame();
    gameState = 'PLAYING';
    
    startScreen.classList.remove('active');
    gameOverScreen.classList.remove('active');
    gameHud.classList.add('active');
    
    // Reset speeds
    PIPE_SPEED = 3;
    PIPE_SPAWN_RATE = 100;
    
    if (animationId) cancelAnimationFrame(animationId);
    loop();
}

function gameOver() {
    gameState = 'GAMEOVER';
    cancelAnimationFrame(animationId);
    
    if (score > highScore) {
        highScore = score;
        localStorage.setItem('neonBirdHighScore', highScore);
    }
    
    finalScore.innerText = score;
    bestScore.innerText = highScore;
    
    gameHud.classList.remove('active');
    gameOverScreen.classList.add('active');
    
    // Visual shake effect
    const container = document.getElementById('game-container');
    container.style.transform = 'translate(5px, 5px)';
    setTimeout(() => container.style.transform = 'translate(-5px, -5px)', 50);
    setTimeout(() => container.style.transform = 'translate(5px, -5px)', 100);
    setTimeout(() => container.style.transform = 'translate(-5px, 5px)', 150);
    setTimeout(() => container.style.transform = 'translate(0, 0)', 200);
}

function handleInput(e) {
    if (e.type === 'keydown' && e.code !== 'Space') return;
    if (e.type === 'keydown' && e.code === 'Space') e.preventDefault(); // Prevent scrolling
    
    if (gameState === 'PLAYING') {
        bird.flap();
    }
}

// Event Listeners
startBtn.addEventListener('click', startGame);
restartBtn.addEventListener('click', startGame);

window.addEventListener('keydown', handleInput);
window.addEventListener('mousedown', handleInput);
window.addEventListener('touchstart', (e) => {
    // Avoid double firing with mousedown on some devices
    if(e.target === startBtn || e.target === restartBtn) return;
    handleInput(e);
}, {passive: false});

// Initial Setup
resizeCanvas(); // This will also call initGame and draw for the start screen
