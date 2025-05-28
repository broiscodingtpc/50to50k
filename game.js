// Game variables
let canvas, ctx;
let player;
let platforms = [];
let score = 0;
let isGameRunning = false;
let currentNickname = '';
let gameSpeed = 1;
let combo = 0;
let maxCombo = 0;
let particles = [];
let powerUps = [];
let isInvincible = false;
let invincibilityTimer = null;
let difficultyLevel = 1;
let platformSpawnTimer = 0;
let lastPlatformY = 0;
let gameTime = 0;
let isPaused = false;
let cameraY = 0;
let highestY = 0;
let moveLeft = false;
let moveRight = false;
let lastPlatformJumped = null;
let platformJumpCount = 0;
let activeTouches = new Set();
let minPlatformDistance = 50;
let maxPlatformDistance = 150;
let platformBuffer = 5;
let lastFrameTime = 0;
let frameCount = 0;
let fps = 60;
let frameTime = 1000 / fps;
let accumulator = 0;

// Leaderboard data
let leaderboard = JSON.parse(localStorage.getItem('fomoJumperLeaderboard')) || [];

// Player object
const playerObj = {
    x: 0,
    y: 0,
    width: 30,
    height: 30,
    velocityY: 0,
    velocityX: 0,
    jumping: false,
    color: '#2196F3',
    maxSpeed: 8,
    acceleration: 0.5,
    friction: 0.85
};

// Platform object
class Platform {
    constructor(x, y, width, height, color, type = 'normal') {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.color = color;
        this.type = type;
        this.bounce = 0;
        this.id = Math.random().toString(36).substr(2, 9); // Unique ID for each platform
    }

    draw() {
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.width, this.height);
        
        // Draw platform effects
        if (this.type === 'bouncy') {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.beginPath();
            ctx.arc(this.x + this.width/2, this.y + this.height/2, 5, 0, Math.PI * 2);
            ctx.fill();
        }
    }
}

// Particle effect
class Particle {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.size = Math.random() * 3 + 2;
        this.speedX = Math.random() * 6 - 3;
        this.speedY = Math.random() * 6 - 3;
        this.life = 1;
    }

    update() {
        this.x += this.speedX;
        this.y += this.speedY;
        this.life -= 0.02;
    }

    draw() {
        ctx.globalAlpha = this.life;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
    }
}

// Power-up object
class PowerUp {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.width = 20;
        this.height = 20;
        this.type = type;
        this.color = type === 'invincibility' ? '#FFD700' : '#FF69B4';
    }

    draw() {
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x + this.width/2, this.y + this.height/2, 10, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw sparkle effect
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.beginPath();
        ctx.moveTo(this.x + this.width/2, this.y);
        ctx.lineTo(this.x + this.width/2, this.y + this.height);
        ctx.moveTo(this.x, this.y + this.height/2);
        ctx.lineTo(this.x + this.width, this.y + this.height/2);
        ctx.stroke();
    }
}

// Make functions globally accessible
window.jump = function() {
    console.log('Jump function called');
    if (!player.jumping) {
        console.log('Player jumping');
        player.velocityY = -15;
        player.jumping = true;
        createParticles(player.x + player.width/2, player.y, '#2196F3');
    }
};

window.startGame = function() {
    console.log('Starting game...');
    
    if (isGameRunning) {
        console.log('Game is already running');
        return;
    }
    
    currentNickname = localStorage.getItem('fomoJumperNickname');
    if (!currentNickname) {
        console.log('No nickname found, showing modal');
        showNicknameModal();
        return;
    }
    
    initGame();
    isGameRunning = true;
    score = 0;
    document.getElementById('gameScore').textContent = score;
    
    console.log('Starting game loop');
    requestAnimationFrame(gameLoop);
};

// Initialize game
function initGame() {
    console.log('Initializing game...');
    
    canvas = document.getElementById('gameCanvas');
    if (!canvas) {
        console.error('Canvas element not found!');
        return;
    }
    
    ctx = canvas.getContext('2d');
    if (!ctx) {
        console.error('Could not get canvas context!');
        return;
    }
    
    // Set canvas size
    canvas.width = 400;
    canvas.height = 600;
    
    // Initialize player
    player = {
        x: canvas.width / 2 - 15,
        y: canvas.height - 100,
        width: 30,
        height: 30,
        velocityY: 0,
        velocityX: 0,
        jumping: false,
        color: '#2196F3',
        maxSpeed: 8,
        acceleration: 0.5,
        friction: 0.85
    };
    
    // Reset game variables
    gameSpeed = 1;
    combo = 0;
    maxCombo = 0;
    particles = [];
    powerUps = [];
    isInvincible = false;
    difficultyLevel = 1;
    platformSpawnTimer = 0;
    lastPlatformY = 0;
    gameTime = 0;
    isPaused = false;
    cameraY = 0;
    highestY = 0;
    moveLeft = false;
    moveRight = false;
    lastPlatformJumped = null;
    platformJumpCount = 0;
    lastFrameTime = performance.now();
    frameCount = 0;
    
    // Create initial platforms
    createInitialPlatforms();
    
    // Update leaderboard display
    updateLeaderboardDisplay();
    
    // Add event listeners
    addEventListeners();
    
    // Draw initial state
    drawGame();
    
    console.log('Game initialized successfully');
}

// Add event listeners
function addEventListeners() {
    console.log('Adding event listeners...');
    
    // Add keyboard controls
    document.addEventListener('keydown', function(e) {
        console.log('Key pressed:', e.code);
        if (isPaused) return;
        
        switch(e.code) {
            case 'Space':
            case 'ArrowUp':
                if (!player.jumping) {
                    console.log('Jumping with key');
                    player.velocityY = -15;
                    player.jumping = true;
                    createParticles(player.x + player.width/2, player.y, '#2196F3');
                }
                break;
            case 'ArrowLeft':
                moveLeft = true;
                moveRight = false;
                break;
            case 'ArrowRight':
                moveRight = true;
                moveLeft = false;
                break;
            case 'KeyP':
                togglePause();
                break;
        }
    });
    
    document.addEventListener('keyup', function(e) {
        console.log('Key released:', e.code);
        switch(e.code) {
            case 'ArrowLeft':
                moveLeft = false;
                break;
            case 'ArrowRight':
                moveRight = false;
                break;
        }
    });
    
    // Add touch controls
    canvas.addEventListener('touchstart', function(e) {
        e.preventDefault();
        const touch = e.touches[0];
        const touchX = touch.clientX - canvas.offsetLeft;
        const touchId = touch.identifier;
        
        console.log('Touch start:', touchX);
        activeTouches.add(touchId);
        
        if (touchX < canvas.width / 2) {
            moveLeft = true;
            moveRight = false;
        } else {
            moveLeft = false;
            moveRight = true;
        }
        
        if (!player.jumping) {
            console.log('Jumping with touch');
            player.velocityY = -15;
            player.jumping = true;
            createParticles(player.x + player.width/2, player.y, '#2196F3');
        }
    });
    
    canvas.addEventListener('touchmove', function(e) {
        e.preventDefault();
        for (let touch of e.touches) {
            const touchX = touch.clientX - canvas.offsetLeft;
            
            if (touchX < canvas.width / 2) {
                moveLeft = true;
                moveRight = false;
            } else {
                moveLeft = false;
                moveRight = true;
            }
        }
    });
    
    canvas.addEventListener('touchend', function(e) {
        e.preventDefault();
        for (let touch of e.changedTouches) {
            activeTouches.delete(touch.identifier);
        }
        
        if (activeTouches.size === 0) {
            moveLeft = false;
            moveRight = false;
        }
    });
    
    // Pause game on window blur
    window.addEventListener('blur', function() {
        if (isGameRunning) togglePause();
    });
    
    console.log('Event listeners added successfully');
}

// Create initial platforms
function createInitialPlatforms() {
    platforms = [];
    // Add starting platform
    platforms.push(new Platform(canvas.width / 2 - 50, canvas.height - 50, 100, 20, '#4CAF50'));
    lastPlatformY = canvas.height - 50;
    
    // Add initial platforms
    for (let i = 0; i < 15; i++) {
        spawnNewPlatform();
    }
}

// Spawn new platform
function spawnNewPlatform() {
    const minWidth = Math.max(40, 100 - (difficultyLevel * 5));
    const maxWidth = Math.max(60, 120 - (difficultyLevel * 5));
    const width = Math.random() * (maxWidth - minWidth) + minWidth;
    
    // Calculăm poziția X pentru a evita platformele să fie prea aproape de margini
    const minX = 20;
    const maxX = canvas.width - width - 20;
    const x = Math.random() * (maxX - minX) + minX;
    
    // Calculăm distanța Y bazată pe dificultate
    const distance = Math.random() * (maxPlatformDistance - minPlatformDistance) + minPlatformDistance;
    const y = lastPlatformY - distance;
    
    // Verificăm dacă platforma este în afara ecranului
    if (y < cameraY - canvas.height) {
        return;
    }
    
    const type = Math.random() > 0.9 ? 'bouncy' : 'normal';
    const color = type === 'bouncy' ? '#FFD700' : (Math.random() > 0.2 ? '#4CAF50' : '#f44336');
    
    platforms.push(new Platform(x, y, width, 20, color, type));
    lastPlatformY = y;
}

// Update camera position
function updateCamera() {
    if (player.y < highestY) {
        highestY = player.y;
        score += Math.floor((highestY - player.y) / 100);
    }
    
    // Smooth camera movement
    const targetCameraY = player.y - canvas.height * 0.7;
    cameraY += (targetCameraY - cameraY) * 0.1;
}

// Update difficulty
function updateDifficulty() {
    gameTime += 1/60; // Assuming 60 FPS
    difficultyLevel = 1 + Math.floor(gameTime / 30); // Increase difficulty every 30 seconds
    
    // Update game speed
    gameSpeed = 1 + (difficultyLevel * 0.2);
    
    // Update player max speed
    player.maxSpeed = 8 + (difficultyLevel * 0.5);
    
    // Update platform distances based on difficulty
    minPlatformDistance = Math.max(30, 50 - (difficultyLevel * 2));
    maxPlatformDistance = Math.max(80, 150 - (difficultyLevel * 3));
}

// Create particles
function createParticles(x, y, color) {
    for (let i = 0; i < 10; i++) {
        particles.push(new Particle(x, y, color));
    }
}

// Spawn power-up
function spawnPowerUp() {
    if (Math.random() < 0.1) {
        const x = Math.random() * (canvas.width - 20);
        const y = Math.random() * (canvas.height - 100);
        const type = Math.random() > 0.5 ? 'invincibility' : 'doublePoints';
        powerUps.push(new PowerUp(x, y, type));
    }
}

// Show nickname modal
function showNicknameModal() {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'flex';
    
    modal.innerHTML = `
        <div class="modal-content">
            <h3>Enter Your Telegram Handle</h3>
            <input type="text" id="nicknameInput" placeholder="@your_handle" maxlength="20">
            <button class="btn" onclick="saveNickname()">
                <i class="fas fa-save"></i> Save & Play
            </button>
        </div>
    `;
    
    document.body.appendChild(modal);
}

// Save nickname
function saveNickname() {
    const nicknameInput = document.getElementById('nicknameInput');
    const nickname = nicknameInput.value.trim();
    
    if (nickname) {
        localStorage.setItem('fomoJumperNickname', nickname);
        currentNickname = nickname;
        document.querySelector('.modal').remove();
        startGame();
    }
}

// Update leaderboard display
function updateLeaderboardDisplay() {
    const leaderboardList = document.getElementById('leaderboardList');
    leaderboardList.innerHTML = '';
    
    // Sort leaderboard by score
    const sortedLeaderboard = [...leaderboard].sort((a, b) => b.score - a.score);
    
    // Display only the highest score
    if (sortedLeaderboard.length > 0) {
        const highestScore = sortedLeaderboard[0];
        const item = document.createElement('div');
        item.className = 'leaderboard-item';
        item.innerHTML = `
            <span class="leaderboard-rank">🏆</span>
            <span class="leaderboard-name">${highestScore.nickname}</span>
            <span class="leaderboard-score">${highestScore.score}</span>
            <span class="leaderboard-combo">${highestScore.maxCombo}x</span>
        `;
        leaderboardList.appendChild(item);
    }
}

// Save score to leaderboard
function saveScore() {
    if (score > 0) {
        leaderboard.push({
            nickname: currentNickname,
            score: score,
            maxCombo: maxCombo,
            date: new Date().toISOString()
        });
        
        // Keep only top 100 scores
        leaderboard.sort((a, b) => b.score - a.score);
        leaderboard = leaderboard.slice(0, 100);
        
        // Save to localStorage
        localStorage.setItem('fomoJumperLeaderboard', JSON.stringify(leaderboard));
        
        // Update display
        updateLeaderboardDisplay();
    }
}

// Game update loop
function gameLoop(timestamp) {
    if (!isGameRunning) {
        console.log('Game loop stopped - game not running');
        return;
    }
    
    // Calculate delta time
    const deltaTime = timestamp - lastFrameTime;
    lastFrameTime = timestamp;
    
    if (isPaused) {
        requestAnimationFrame(gameLoop);
        return;
    }
    
    // Accumulate time
    accumulator += deltaTime;
    
    // Update game state at fixed intervals
    while (accumulator >= frameTime) {
        updateGameState();
        accumulator -= frameTime;
    }
    
    // Draw game
    drawGame();
    
    // Update score display
    document.getElementById('gameScore').textContent = score;
    
    // Request next frame
    requestAnimationFrame(gameLoop);
}

// Update game state
function updateGameState() {
    updateDifficulty();
    
    // Apply gravity with fixed time step
    player.velocityY += 0.5 * gameSpeed;
    player.y += player.velocityY;
    
    // Handle horizontal movement with fixed time step
    if (moveLeft) {
        player.velocityX = Math.max(player.velocityX - player.acceleration, -player.maxSpeed);
    } else if (moveRight) {
        player.velocityX = Math.min(player.velocityX + player.acceleration, player.maxSpeed);
    } else {
        player.velocityX *= player.friction;
        if (Math.abs(player.velocityX) < 0.1) {
            player.velocityX = 0;
        }
    }
    
    player.x += player.velocityX;
    
    // Keep player in bounds
    if (player.x < 0) {
        player.x = 0;
        player.velocityX = 0;
    }
    if (player.x + player.width > canvas.width) {
        player.x = canvas.width - player.width;
        player.velocityX = 0;
    }
    
    // Update camera with smooth movement
    updateCamera();
    
    // Spawn new platforms
    platformSpawnTimer++;
    if (platformSpawnTimer > 30 / gameSpeed) {
        spawnNewPlatform();
        platformSpawnTimer = 0;
    }
    
    // Check and add new platforms if needed
    if (platforms.length < platformBuffer || 
        (platforms[platforms.length - 1].y > cameraY - canvas.height)) {
        spawnNewPlatform();
    }
    
    // Remove platforms that are too low
    platforms = platforms.filter(platform => platform.y < cameraY + canvas.height + 100);
    
    // Update particles
    particles = particles.filter(particle => {
        particle.update();
        return particle.life > 0;
    });
    
    // Check collisions
    checkCollisions();
    
    // Check if player fell off
    if (player.y > cameraY + canvas.height) {
        gameOver();
        return;
    }
}

// Check collisions
function checkCollisions() {
    let collision = false;
    
    // Check platform collisions
    for (let platform of platforms) {
        if (player.velocityY > 0 && 
            player.y + player.height > platform.y && 
            player.y + player.height < platform.y + platform.height + 10 &&
            player.x + player.width > platform.x && 
            player.x < platform.x + platform.width) {
            
            collision = true;
            player.jumping = false;
            
            // Check if this is the same platform as last jump
            if (lastPlatformJumped === platform.id) {
                platformJumpCount++;
                if (platformJumpCount > 2) {
                    gameOver();
                    return;
                }
            } else {
                lastPlatformJumped = platform.id;
                platformJumpCount = 1;
            }
            
            if (platform.type === 'bouncy') {
                player.velocityY = -20 * gameSpeed;
                createParticles(player.x + player.width/2, player.y + player.height, '#FFD700');
                combo++;
            } else {
                player.velocityY = -15 * gameSpeed;
                if (platform.color === '#f44336' && !isInvincible) {
                    gameOver();
                    return;
                } else if (platform.color === '#4CAF50') {
                    combo++;
                    score += combo * difficultyLevel;
                    createParticles(player.x + player.width/2, player.y + player.height, '#4CAF50');
                }
            }
            
            player.y = platform.y - player.height;
            maxCombo = Math.max(maxCombo, combo);
            break;
        }
    }
    
    if (!collision) {
        player.jumping = true;
    }
    
    // Check power-up collisions
    powerUps = powerUps.filter(powerUp => {
        if (player.x < powerUp.x + powerUp.width &&
            player.x + player.width > powerUp.x &&
            player.y < powerUp.y + powerUp.height &&
            player.y + player.height > powerUp.y) {
            
            if (powerUp.type === 'invincibility') {
                activateInvincibility();
            } else {
                gameSpeed *= 1.2;
            }
            
            createParticles(powerUp.x + powerUp.width/2, powerUp.y + powerUp.height/2, powerUp.color);
            return false;
        }
        return true;
    });
    
    // Spawn new power-ups
    if (Math.random() < 0.01) {
        spawnPowerUp();
    }
}

// Activate invincibility
function activateInvincibility() {
    isInvincible = true;
    player.color = '#FFD700';
    
    if (invincibilityTimer) clearTimeout(invincibilityTimer);
    invincibilityTimer = setTimeout(() => {
        isInvincible = false;
        player.color = '#2196F3';
    }, 5000);
}

// Draw game elements
function drawGame() {
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Save context
    ctx.save();
    
    // Translate canvas based on camera position
    ctx.translate(0, -cameraY);
    
    // Draw background
    ctx.fillStyle = '#2a2a2a';
    ctx.fillRect(0, cameraY, canvas.width, canvas.height);
    
    // Draw platforms
    platforms.forEach(platform => platform.draw());
    
    // Draw power-ups
    powerUps.forEach(powerUp => powerUp.draw());
    
    // Draw player
    ctx.fillStyle = player.color;
    ctx.fillRect(player.x, player.y, player.width, player.height);
    
    // Draw particles
    particles.forEach(particle => particle.draw());
    
    // Restore context
    ctx.restore();
    
    // Draw UI elements (not affected by camera)
    // Draw combo counter
    if (combo > 1) {
        ctx.fillStyle = '#FFD700';
        ctx.font = '20px Arial';
        ctx.fillText(`Combo: ${combo}x`, 10, 30);
    }
    
    // Draw difficulty level
    ctx.fillStyle = 'white';
    ctx.font = '16px Arial';
    ctx.fillText(`Level: ${difficultyLevel}`, 10, 60);
    
    // Draw game speed
    ctx.fillText(`Speed: ${gameSpeed.toFixed(1)}x`, 10, 90);
    
    // Draw height
    ctx.fillText(`Height: ${Math.floor(-highestY)}m`, 10, 120);
    
    // Draw platform jumps remaining
    if (lastPlatformJumped) {
        const jumpsLeft = 3 - platformJumpCount;
        ctx.fillText(`Jumps left: ${jumpsLeft}`, 10, 150);
    }
}

// Toggle pause
function togglePause() {
    isPaused = !isPaused;
    if (isPaused) {
        // Draw pause overlay
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = 'white';
        ctx.font = '30px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('PAUSED', canvas.width/2, canvas.height/2);
        ctx.font = '20px Arial';
        ctx.fillText('Press P to continue', canvas.width/2, canvas.height/2 + 40);
    }
}

// Game over
function gameOver() {
    console.log('Game over');
    isGameRunning = false;
    
    // Save score and show game over message
    saveScore();
    alert(`Game Over!\nScore: ${score}\nMax Combo: ${maxCombo}x`);
}

// Initialize game when page loads
window.addEventListener('load', function() {
    console.log('Page loaded, initializing game...');
    initGame();
}); 