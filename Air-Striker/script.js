
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const W = 600;
const H = 750;

canvas.width = W;
canvas.height = H;

const scoreText = document.getElementById("score");
const livesText = document.getElementById("lives");
const overlay = document.getElementById("overlay");
const startBtn = document.getElementById("startBtn");

let player, bullets, enemies, particles;
let score = 0;
let lives = 3;
let running = false;
let frame = 0;
let animationId = 0;

let keys = {
    left: false,
    right: false,
    shoot: false
};

let highScore = Number(localStorage.getItem("airHighScore")) || 0;

// ==============================
// SOUND SYSTEM
// ==============================

const bgMusic = new Audio("./background.mp3");
const shootSound = new Audio("./shoot.mp3");
const explosionSound = new Audio("./explosion.mp3");
const gameoverSound = new Audio("./gameover.mp3");

bgMusic.loop = true;

let musicEnabled = true;
let soundEnabled = true;
let masterVolume = 0.4;

function updateAudioVolume() {
    bgMusic.volume = masterVolume * 0.65;
    shootSound.volume = masterVolume;
    explosionSound.volume = masterVolume;
    gameoverSound.volume = masterVolume;
}

function playSound(name) {
    if (!soundEnabled) return;

    const sounds = {
        shoot: shootSound,
        explosion: explosionSound,
        gameover: gameoverSound
    };

    const sound = sounds[name];

    if (!sound) return;

    sound.currentTime = 0;
    sound.play().catch(error => {
        console.log("Sound playback error:", error);
    });
}

function startBackgroundMusic() {
    if (musicEnabled) {
        bgMusic.play().catch(error => {
            console.log("Music playback error:", error);
        });
    }
}

function stopBackgroundMusic() {
    bgMusic.pause();
    bgMusic.currentTime = 0;
}

// Music button
const musicBtn = document.getElementById("musicBtn");

if (musicBtn) {
    musicBtn.addEventListener("click", function() {
        musicEnabled = !musicEnabled;

        if (musicEnabled && running) {
            startBackgroundMusic();
        } else {
            bgMusic.pause();
        }

        this.textContent = musicEnabled
            ? "🔊 MUSIC ON"
            : "🔇 MUSIC OFF";
    });
}

// Sound effects button
const soundBtn = document.getElementById("soundBtn");

if (soundBtn) {
    soundBtn.addEventListener("click", function() {
        soundEnabled = !soundEnabled;

        this.textContent = soundEnabled
            ? "💥 SOUND ON"
            : "🔇 SOUND OFF";
    });
}

// Volume slider
const volumeSlider = document.getElementById("volume");

if (volumeSlider) {
    volumeSlider.addEventListener("input", function() {
        masterVolume = Number(this.value) / 100;
        updateAudioVolume();
    });
}

updateAudioVolume();

// ==============================
// BACKGROUND STARS
// ==============================

const stars = Array.from({ length: 100 }, () => ({
    x: Math.random() * W,
    y: Math.random() * H,
    speed: 1 + Math.random() * 3,
    size: Math.random() * 2 + 1
}));

// ==============================
// RESET GAME
// ==============================

function resetGame() {
    player = {
        x: W / 2 - 25,
        y: H - 100,
        width: 50,
        height: 55,
        speed: 6,
        cooldown: 0,
        invincible: 0
    };

    bullets = [];
    enemies = [];
    particles = [];

    score = 0;
    lives = 3;
    frame = 0;

    keys.left = false;
    keys.right = false;
    keys.shoot = false;

    updateStats();
}

function updateStats() {
    scoreText.textContent = score;
    livesText.textContent = lives;
}

// ==============================
// PLAYER
// ==============================

function drawPlayer() {
    ctx.save();
    ctx.translate(player.x + 25, player.y + 27);

    ctx.shadowColor = "#00eaff";
    ctx.shadowBlur = 20;
    ctx.fillStyle = "#00d9ff";

    ctx.beginPath();
    ctx.moveTo(0, -30);
    ctx.lineTo(12, 10);
    ctx.lineTo(30, 28);
    ctx.lineTo(28, 33);
    ctx.lineTo(5, 24);
    ctx.lineTo(0, 32);
    ctx.lineTo(-5, 24);
    ctx.lineTo(-28, 33);
    ctx.lineTo(-30, 28);
    ctx.lineTo(-12, 10);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "white";
    ctx.fillRect(-3, -15, 6, 17);

    ctx.restore();
}

// ==============================
// ENEMY
// ==============================

function drawEnemy(e) {
    ctx.save();
    ctx.translate(e.x + 22, e.y + 20);

    ctx.shadowColor = "red";
    ctx.shadowBlur = 15;
    ctx.fillStyle = "#ff3535";

    ctx.beginPath();
    ctx.moveTo(0, 25);
    ctx.lineTo(-12, -5);
    ctx.lineTo(-32, -20);
    ctx.lineTo(-28, -27);
    ctx.lineTo(-5, -15);
    ctx.lineTo(0, -23);
    ctx.lineTo(5, -15);
    ctx.lineTo(28, -27);
    ctx.lineTo(32, -20);
    ctx.lineTo(12, -5);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
}

// ==============================
// EXPLOSION
// ==============================

function createExplosion(x, y) {
    playSound("explosion");

    for (let i = 0; i < 18; i++) {
        particles.push({
            x, y,
            dx: (Math.random() - 0.5) * 9,
            dy: (Math.random() - 0.5) * 9,
            life: 30,
            maxLife: 30
        });
    }
}

function drawParticles() {
    particles.forEach(p => {
        ctx.globalAlpha = p.life / p.maxLife;
        ctx.fillStyle = "#ff9d24";
        ctx.fillRect(p.x, p.y, 6, 6);
    });

    ctx.globalAlpha = 1;
}

// ==============================
// SHOOTING
// ==============================

function shoot() {
    if (player.cooldown <= 0) {
        bullets.push({
            x: player.x + 22,
            y: player.y - 12,
            width: 6,
            height: 16,
            speed: 11
        });

        player.cooldown = 13;

        playSound("shoot");
    }
}

// ==============================
// ENEMY SPAWN
// ==============================

function spawnEnemy() {
    enemies.push({
        x: 10 + Math.random() * (W - 54),
        y: -50,
        width: 44,
        height: 40,
        speed: 2 + Math.random() * 1.5 + score / 400
    });
}

function isColliding(a, b) {
    return (
        a.x < b.x + b.width &&
        a.x + a.width > b.x &&
        a.y < b.y + b.height &&
        a.y + a.height > b.y
    );
}

// ==============================
// UPDATE GAME
// ==============================

function update() {
    if (!running) return;

    frame++;

    stars.forEach(s => {
        s.y += s.speed;

        if (s.y > H) {
            s.y = 0;
            s.x = Math.random() * W;
        }
    });

    if (keys.left) player.x -= player.speed;
    if (keys.right) player.x += player.speed;

    player.x = Math.max(0, Math.min(W - player.width, player.x));

    if (keys.shoot) shoot();

    if (player.cooldown > 0) player.cooldown--;
    if (player.invincible > 0) player.invincible--;

    const spawnRate = Math.max(18, 55 - Math.floor(score / 30));

    if (frame % spawnRate === 0) {
        spawnEnemy();
    }

    bullets.forEach(b => {
        b.y -= b.speed;
    });

    bullets = bullets.filter(b => b.y > -20);

    for (let i = enemies.length - 1; i >= 0; i--) {
        const e = enemies[i];

        e.y += e.speed;

        // Enemy hits player
        if (player.invincible <= 0 && isColliding(player, e)) {
            lives--;
            player.invincible = 70;

            createExplosion(e.x + 22, e.y + 20);
            enemies.splice(i, 1);
            continue;
        }

        // Enemy escapes
        if (e.y > H) {
            enemies.splice(i, 1);
            continue;
        }

        // Bullet hits enemy
        let hit = false;

        for (let j = bullets.length - 1; j >= 0; j--) {
            if (isColliding(bullets[j], e)) {
                createExplosion(e.x + 22, e.y + 20);

                bullets.splice(j, 1);
                enemies.splice(i, 1);

                score += 10;
                hit = true;
                break;
            }
        }

        if (hit) continue;
    }

    particles.forEach(p => {
        p.x += p.dx;
        p.y += p.dy;
        p.life--;
    });

    particles = particles.filter(p => p.life > 0);

    updateStats();

    if (lives <= 0) {
        gameOver();
    }
}

// ==============================
// DRAW GAME
// ==============================

function draw() {
    ctx.clearRect(0, 0, W, H);

    ctx.fillStyle = "#06152c";
    ctx.fillRect(0, 0, W, H);

    stars.forEach(s => {
        ctx.fillStyle = "white";
        ctx.globalAlpha = 0.5 + Math.random() * 0.5;
        ctx.fillRect(s.x, s.y, s.size, s.size);
    });

    ctx.globalAlpha = 1;

    if (player && (player.invincible === 0 || frame % 10 < 5)) {
        drawPlayer();
    }

    bullets.forEach(b => {
        ctx.fillStyle = "#ffe45c";
        ctx.shadowColor = "orange";
        ctx.shadowBlur = 12;
        ctx.fillRect(b.x, b.y, b.width, b.height);
    });

    ctx.shadowBlur = 0;

    enemies.forEach(drawEnemy);

    drawParticles();

    ctx.fillStyle = "white";
    ctx.font = "bold 16px Arial";
    ctx.fillText("BEST: " + highScore, 15, 28);
}

// ==============================
// GAME LOOP
// ==============================

function gameLoop() {
    update();
    draw();

    if (running) {
        animationId = requestAnimationFrame(gameLoop);
    }
}

// ==============================
// GAME OVER
// ==============================

function gameOver() {
    running = false;

    cancelAnimationFrame(animationId);

    stopBackgroundMusic();
    playSound("gameover");

    if (score > highScore) {
        highScore = score;
        localStorage.setItem("airHighScore", highScore);
    }

    document.getElementById("message").textContent = "GAME OVER!";

    document.getElementById("description").textContent =
        "Score: " + score + " | Best: " + highScore;

    startBtn.textContent = "PLAY AGAIN";
    overlay.style.display = "flex";
}

// ==============================
// START GAME
// ==============================

function startGame() {
    cancelAnimationFrame(animationId);

    resetGame();

    overlay.style.display = "none";
    running = true;

    startBackgroundMusic();

    gameLoop();
}

startBtn.addEventListener("click", startGame);

// ==============================
// KEYBOARD CONTROLS
// ==============================

document.addEventListener("keydown", e => {
    if (["ArrowLeft", "ArrowRight", " "].includes(e.key)) {
        e.preventDefault();
    }

    if (e.key === "ArrowLeft" || e.key.toLowerCase() === "a") {
        keys.left = true;
    }

    if (e.key === "ArrowRight" || e.key.toLowerCase() === "d") {
        keys.right = true;
    }

    if (e.key === " ") {
        keys.shoot = true;
    }
});

document.addEventListener("keyup", e => {
    if (e.key === "ArrowLeft" || e.key.toLowerCase() === "a") {
        keys.left = false;
    }

    if (e.key === "ArrowRight" || e.key.toLowerCase() === "d") {
        keys.right = false;
    }

    if (e.key === " ") {
        keys.shoot = false;
    }
});

// ==============================
// MOBILE CONTROLS
// ==============================

function setupButton(id, action) {
    const button = document.getElementById(id);

    if (!button) return;

    button.addEventListener("pointerdown", e => {
        e.preventDefault();
        keys[action] = true;
        button.setPointerCapture(e.pointerId);
    });

    button.addEventListener("pointerup", () => {
        keys[action] = false;
    });

    button.addEventListener("pointercancel", () => {
        keys[action] = false;
    });

    button.addEventListener("lostpointercapture", () => {
        keys[action] = false;
    });
}

setupButton("left", "left");
setupButton("right", "right");
setupButton("shoot", "shoot");

// ==============================
// INITIAL SCREEN
// ==============================

resetGame();
draw();

