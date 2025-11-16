import * as THREE from 'three';

let gameData;
let zombieManager;
let camera;
let getCurrentCameraScene;
let GameState;

export function initHUD({
    gameDataRef,
    zombieManagerRef,
    cameraRef,
    getCurrentCameraSceneRef,
    GameStateRef
}) {
    gameData = gameDataRef;
    zombieManager = zombieManagerRef;
    camera = cameraRef;
    getCurrentCameraScene = getCurrentCameraSceneRef;
    GameState = GameStateRef;
}

export function createUI() {
    const uiContainer = document.createElement('div');
    uiContainer.id = 'game-ui';
    uiContainer.innerHTML = `
        <!-- Damage Flash -->
        <div id="damage-flash" style="
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: radial-gradient(circle, transparent 30%, rgba(255, 0, 0, 0.8) 100%);
            pointer-events: none;
            opacity: 0;
            transition: opacity 0.2s;
            z-index: 5;
        "></div>
        
        <!-- HUD -->
        <div id="hud" style="
            position: fixed;
            top: 20px;
            left: 20px;
            font-family: 'Courier New', monospace;
            color: #00ffff;
            text-shadow: 0 0 10px #00ffff, 2px 2px 4px #000;
            font-size: 18px;
            z-index: 10;
            pointer-events: none;
        ">
            <!-- Health Bar -->
            <div style="margin-bottom: 15px;">
                <div style="margin-bottom: 5px;">HEALTH</div>
                <div style="width: 200px; height: 30px; background: rgba(0,0,0,0.7); border: 2px solid #00ffff; position: relative;">
                    <div id="health-bar" style="
                        width: 100%;
                        height: 100%;
                        background: linear-gradient(90deg, #00ff00, #ffff00, #ff0000);
                        transition: width 0.3s;
                    "></div>
                    <div style="
                        position: absolute;
                        top: 50%;
                        left: 50%;
                        transform: translate(-50%, -50%);
                        color: #fff;
                        font-weight: bold;
                        text-shadow: 2px 2px 4px #000;
                    " id="health-text">100/100</div>
                </div>
            </div>
            
            <!-- Scene Progress -->
            <div style="margin-bottom: 10px;">
                SCENE: <span id="scene-number">1</span>/<span id="total-scenes">3</span>
            </div>
            
            <!-- Zombies -->
            <div style="margin-bottom: 10px;">
                ZOMBIES: <span id="zombies-killed">0</span>/<span id="zombies-total">5</span>
            </div>
            
            <!-- Combo -->
            <div id="combo-display" style="margin-bottom: 10px; display: none;">
                <div style="font-size: 24px; color: #ffff00; text-shadow: 0 0 15px #ffff00;">
                    COMBO x<span id="combo-count">0</span>
                </div>
                <div style="width: 150px; height: 5px; background: rgba(0,0,0,0.7); border: 1px solid #ffff00;">
                    <div id="combo-timer-bar" style="width: 100%; height: 100%; background: #ffff00; transition: width 0.1s;"></div>
                </div>
            </div>
            
            <!-- Score -->
            <div style="margin-bottom: 10px;">
                SCORE: <span id="score">0</span>
            </div>
            
            <!-- Time -->
            <div>
                TIME: <span id="time">0:00</span>
            </div>
            
            <!-- Power-Up Indicators -->
            <div id="powerup-indicators" style="margin-top: 10px;">
                <div id="powerup-message" style="
                    margin-top: 5px;
                    font-size: 20px;
                    color: #ffff00;
                    text-shadow: 0 0 15px #ffff00, 2px 2px 4px #000;
                    display: none;
                "></div>
                <div id="powerup-timers" style="
                    margin-top: 5px;
                    font-size: 14px;
                    color: #ffffff;
                ">
                    <span id="double-damage-timer" style="display: none; margin-right: 10px;"></span>
                    <span id="slow-mo-timer" style="display: none;"></span>
                </div>
            </div>
        </div>
        
        <!-- Mini Map -->
        <div id="mini-map" style="
            position: fixed;
            bottom: 150px;
            right: 20px;
            width: 150px;
            height: 150px;
            background: rgba(0, 0, 0, 0.8);
            border: 2px solid #00ffff;
            z-index: 10;
            pointer-events: none;
        ">
            <canvas id="mini-map-canvas" width="150" height="150"></canvas>
        </div>
        
        <!-- Ammo Display -->
        <div id="ammo-display" style="
            position: fixed;
            bottom: 40px;
            right: 40px;
            font-family: 'Courier New', monospace;
            text-align: right;
            z-index: 10;
            pointer-events: none;
        ">
            <!-- Weapon Name / Icon -->
            <div id="weapon-name" style="
                font-size: 28px;
                margin-bottom: 8px;
                letter-spacing: 2px;
                text-shadow: 0 0 12px #00ffff, 2px 2px 4px #000;
            ">
                PISTOL
            </div>
            <div style="
                font-size: 48px;
                color: #fff;
                text-shadow: 0 0 15px #fff, 3px 3px 6px #000;
                font-weight: bold;
            ">
                <span id="current-ammo">12</span> / <span id="reserve-ammo">60</span>
            </div>
            <!-- Weapon Slots -->
            <div id="weapon-slots" style="
                margin-top: 10px;
                font-size: 14px;
            ">
                <span id="weapon-slot-1" style="margin-left: 8px; padding: 4px 8px; border-radius: 3px; border: 1px solid #00ffff; background: rgba(0,255,255,0.1);">
                    1 • PISTOL
                </span>
                <span id="weapon-slot-2" style="margin-left: 8px; padding: 4px 8px; border-radius: 3px; border: 1px solid rgba(255,255,255,0.3); opacity: 0.7;">
                    2 • SHOTGUN
                </span>
                <span id="weapon-slot-3" style="margin-left: 8px; padding: 4px 8px; border-radius: 3px; border: 1px solid rgba(255,255,255,0.3); opacity: 0.7;">
                    3 • RIFLE
                </span>
            </div>
            <div id="reload-indicator" style="
                font-size: 24px;
                color: #ffff00;
                text-shadow: 0 0 10px #ffff00;
                margin-top: 10px;
                display: none;
            ">
                RELOADING...
            </div>
            
            <!-- Weapon Switch Message -->
            <div id="weapon-switch-message" style="
                margin-top: 10px;
                font-size: 20px;
                color: #ffff00;
                text-shadow: 0 0 12px #ffff00, 2px 2px 4px #000;
                opacity: 0;
                transition: opacity 0.3s;
            "></div>
        </div>
        
        <!-- Game Over Screen -->
        <div id="game-over-screen" style="
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.95);
            display: none;
            justify-content: center;
            align-items: center;
            z-index: 100;
            font-family: 'Courier New', monospace;
        ">
            <div style="text-align: center;">
                <div style="
                    font-size: 72px;
                    color: #ff0000;
                    text-shadow: 0 0 30px #ff0000;
                    margin-bottom: 40px;
                ">
                    GAME OVER
                </div>
                <div id="game-over-stats" style="font-size: 24px; color: #fff; line-height: 2;"></div>
                <div style="
                    font-size: 24px;
                    color: #ff1493;
                    margin-top: 60px;
                    animation: blink 1.5s infinite;
                ">
                    Press R to Restart
                </div>
            </div>
        </div>
        
        <!-- Mission Complete Screen -->
        <div id="mission-complete" style="
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.95);
            display: none;
            justify-content: center;
            align-items: center;
            z-index: 100;
            font-family: 'Courier New', monospace;
        ">
            <div style="text-align: center;">
                <div style="
                    font-size: 72px;
                    color: #ffff00;
                    text-shadow: 0 0 30px #ffff00;
                    margin-bottom: 40px;
                    animation: pulse 1.5s infinite;
                ">
                    MISSION COMPLETE
                </div>
                <div style="font-size: 48px; color: #00ffff; margin-bottom: 20px;">
                    RANK: <span id="final-rank">S</span>
                </div>
                <div id="final-stats" style="font-size: 24px; color: #fff; line-height: 2; margin-bottom: 40px;"></div>
                
                <!-- Leaderboard -->
                <div style="margin-top: 40px; padding: 20px; background: rgba(0, 255, 255, 0.1); border: 2px solid #00ffff;">
                    <div style="font-size: 28px; color: #00ffff; margin-bottom: 20px;">BEST SCORES</div>
                    <div id="leaderboard" style="font-size: 18px; color: #fff; line-height: 1.8;"></div>
                </div>
                
                <div style="
                    font-size: 24px;
                    color: #ff1493;
                    margin-top: 60px;
                    animation: blink 1.5s infinite;
                ">
                    Press R to Restart
                </div>
            </div>
        </div>
        
        <style>
            @keyframes pulse {
                0%, 100% { opacity: 1; transform: scale(1); }
                50% { opacity: 0.7; transform: scale(1.05); }
            }
            @keyframes blink {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.3; }
            }
        </style>
    `;
    
    document.body.appendChild(uiContainer);
}

export function updateUI() {
    // Health
    const healthPercent = (gameData.health / gameData.maxHealth) * 100;
    document.getElementById('health-bar').style.width = healthPercent + '%';
    document.getElementById('health-text').textContent = `${gameData.health}/${gameData.maxHealth}`;
    
    // Scene
    document.getElementById('scene-number').textContent = gameData.currentScene + 1;
    document.getElementById('total-scenes').textContent = gameData.totalScenes;
    
    // Zombies
    const currentScene = getCurrentCameraScene();
    const totalZombies = currentScene.spawnPoints.length;
    const zombies = zombieManager.getZombies();
    const aliveZombies = zombies.filter(z => !z.isDead).length;
    document.getElementById('zombies-killed').textContent = totalZombies - aliveZombies;
    document.getElementById('zombies-total').textContent = totalZombies;
    
    // Combo
    if (gameData.currentCombo > 0) {
        document.getElementById('combo-display').style.display = 'block';
        document.getElementById('combo-count').textContent = gameData.currentCombo;
        const timerPercent = (gameData.comboTimer / gameData.comboDecayTime) * 100;
        document.getElementById('combo-timer-bar').style.width = timerPercent + '%';
    } else {
        document.getElementById('combo-display').style.display = 'none';
    }
    
    // Score
    document.getElementById('score').textContent = gameData.score;
    
    // Time
    const elapsed = Math.floor(gameData.currentTime);
    const minutes = Math.floor(elapsed / 60);
    const seconds = elapsed % 60;
    document.getElementById('time').textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    
    // Ammo
    document.getElementById('current-ammo').textContent = gameData.currentAmmo;
    document.getElementById('reserve-ammo').textContent = gameData.reserveAmmo;
    
    const ammoElement = document.getElementById('current-ammo');
    if (gameData.currentAmmo === 0) {
        ammoElement.style.color = '#ff0000';
    } else if (gameData.currentAmmo <= 3) {
        ammoElement.style.color = '#ffff00';
    } else {
        ammoElement.style.color = '#ffffff';
    }
    
    updateMiniMap();
}

function updateMiniMap() {
    const canvas = document.getElementById('mini-map-canvas');
    const ctx = canvas.getContext('2d');
    
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, 150, 150);
    
    ctx.fillStyle = '#00ffff';
    ctx.beginPath();
    ctx.arc(75, 75, 5, 0, Math.PI * 2);
    ctx.fill();
    
    const zombies = zombieManager.getZombies();
    zombies.forEach(zombie => {
        if (zombie.isDead) return;
        
        const relX = zombie.mesh.position.x - camera.position.x;
        const relZ = zombie.mesh.position.z - camera.position.z;
        
        const mapX = 75 + (relX * 5);
        const mapZ = 75 + (relZ * 5);
        
        if (mapX >= 0 && mapX <= 150 && mapZ >= 0 && mapZ <= 150) {
            ctx.fillStyle = '#' + zombie.config.color.toString(16).padStart(6, '0');
            ctx.beginPath();
            ctx.arc(mapX, mapZ, 3, 0, Math.PI * 2);
            ctx.fill();
        }
    });
}

export function updateFinalStats() {
    const accuracy = gameData.shotsFired > 0 
        ? Math.round((gameData.shotsHit / gameData.shotsFired) * 100)
        : 0;
    
    const minutes = Math.floor(gameData.currentTime / 60);
    const seconds = Math.floor(gameData.currentTime % 60);
    
    const rank = calculateRank();
    
    const statsHTML = `
        <div>Zombies Killed: ${gameData.totalZombiesKilled}</div>
        <div>Headshots: ${gameData.headshotKills}</div>
        <div>Accuracy: ${accuracy}%</div>
        <div>Max Combo: x${gameData.maxCombo}</div>
        <div>Time: ${minutes}:${seconds.toString().padStart(2, '0')}</div>
        <div style="font-size: 32px; margin-top: 20px; color: #ffff00;">
            FINAL SCORE: ${gameData.score}
        </div>
    `;
    
    if (gameData.currentState === GameState.GAME_OVER) {
        document.getElementById('game-over-stats').innerHTML = statsHTML;
    } else {
        document.getElementById('final-stats').innerHTML = statsHTML;
        document.getElementById('final-rank').textContent = rank;
        
        const rankColors = {
            'S': '#ffff00',
            'A': '#00ff00',
            'B': '#00ffff',
            'C': '#ffa500',
            'D': '#ff0000'
        };
        document.getElementById('final-rank').style.color = rankColors[rank];
    }
    
    updateLeaderboard();
}

function calculateRank() {
    const accuracy = gameData.shotsFired > 0 
        ? (gameData.shotsHit / gameData.shotsFired) * 100
        : 0;
    
    if (gameData.score >= 3000 && accuracy >= 80 && gameData.health > 50) return 'S';
    if (gameData.score >= 2000 && accuracy >= 65) return 'A';
    if (gameData.score >= 1200 && accuracy >= 50) return 'B';
    if (gameData.score >= 600) return 'C';
    return 'D';
}

export function saveLeaderboard() {
    const accuracy = gameData.shotsFired > 0 
        ? Math.round((gameData.shotsHit / gameData.shotsFired) * 100)
        : 0;
    
    const scores = JSON.parse(localStorage.getItem('zombieRailShooterScores') || '[]');
    
    scores.push({
        score: gameData.score,
        accuracy: accuracy,
        time: Math.floor(gameData.currentTime),
        kills: gameData.totalZombiesKilled,
        headshots: gameData.headshotKills,
        rank: calculateRank(),
        date: new Date().toLocaleDateString()
    });
    
    scores.sort((a, b) => b.score - a.score);
    const topScores = scores.slice(0, 5);
    
    localStorage.setItem('zombieRailShooterScores', JSON.stringify(topScores));
    
    if (gameData.score > (gameData.bestScore || 0)) {
        gameData.bestScore = gameData.score;
        localStorage.setItem('bestScore', gameData.score);
    }
}

function updateLeaderboard() {
    const scores = JSON.parse(localStorage.getItem('zombieRailShooterScores') || '[]');
    
    let html = '';
    scores.forEach((entry, index) => {
        html += `
            <div style="margin-bottom: 10px;">
                ${index + 1}. Score: ${entry.score} | Rank: ${entry.rank} | Acc: ${entry.accuracy}% | ${entry.date}
            </div>
        `;
    });
    
    if (html === '') {
        html = '<div>No scores yet!</div>';
    }
    
    document.getElementById('leaderboard').innerHTML = html;
}


