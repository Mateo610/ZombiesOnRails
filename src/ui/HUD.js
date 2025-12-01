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
        
        <!-- HUD - Left Panel (Primary Stats) -->
        <div id="hud-left" style="
            position: fixed;
            top: 20px;
            left: 20px;
            font-family: 'Courier New', monospace;
            color: #999999;
            z-index: 10;
            pointer-events: none;
        ">
            <!-- Player Stats Panel -->
            <div style="
                background: rgba(0, 0, 0, 0.75);
                border: 2px solid rgba(153, 153, 153, 0.5);
                border-radius: 8px;
                padding: 15px;
                box-shadow: 
                    0 0 20px rgba(0, 0, 0, 0.8),
                    inset 0 0 15px rgba(0, 0, 0, 0.5);
                margin-bottom: 15px;
            ">
                
                <!-- Mission Progress Group -->
                <div style="
                    border-top: 1px solid rgba(153, 153, 153, 0.3);
                    padding-top: 12px;
                    margin-top: 12px;
                ">
                    <!-- Overall Mission Progress Bar -->
                    <div style="margin-bottom: 12px;">
                        <div style="
                            display: flex;
                            justify-content: space-between;
                            align-items: center;
                            margin-bottom: 6px;
                        ">
                            <span style="font-size: 12px; color: #aaaaaa; letter-spacing: 1px;">MISSION PROGRESS</span>
                            <span id="mission-percentage" style="
                                font-size: 12px; 
                                color: #ffffff; 
                                font-weight: bold;
                                text-shadow: 0 0 8px #ffffff;
                            ">0%</span>
                        </div>
                        <div style="
                            width: 100%;
                            height: 8px;
                            background: rgba(0, 0, 0, 0.8);
                            border: 1px solid rgba(153, 153, 153, 0.5);
                            border-radius: 4px;
                            overflow: hidden;
                            position: relative;
                        ">
                            <div id="mission-progress-bar" style="
                                width: 0%;
                                height: 100%;
                                background: linear-gradient(90deg, #0088ff, #00aaff, #00ccff);
                                box-shadow: 0 0 10px rgba(0, 136, 255, 0.8);
                                transition: width 0.5s ease-out;
                            "></div>
                        </div>
                    </div>
                    
                    <!-- Scene Progress Indicators -->
                    <div style="margin-bottom: 10px;">
                        <div style="
                            font-size: 11px;
                            color: #aaaaaa;
                            letter-spacing: 1px;
                            margin-bottom: 6px;
                        ">SCENES:</div>
                        <div id="scene-indicators" style="
                            display: flex;
                            gap: 4px;
                            flex-wrap: wrap;
                        ">
                            <!-- Scene indicators will be dynamically generated -->
                        </div>
                    </div>
                    
                    <!-- Current Scene & Zombies -->
                    <div style="
                        border-top: 1px solid rgba(153, 153, 153, 0.2);
                        padding-top: 10px;
                        margin-top: 10px;
                    ">
                        <div style="margin-bottom: 6px; font-size: 13px; color: #aaaaaa;">
                            <span style="letter-spacing: 1px;">CURRENT SCENE:</span> 
                            <span id="scene-number" style="color: #ffffff; font-weight: bold;">1</span>/
                            <span id="total-scenes" style="color: #cccccc;">3</span>
                        </div>
                        <div style="font-size: 13px; color: #aaaaaa;">
                            <span style="letter-spacing: 1px;">ZOMBIES:</span> 
                            <span id="zombies-killed" style="color: #ffffff; font-weight: bold;">0</span>/
                            <span id="zombies-total" style="color: #cccccc;">5</span>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Score & Time Panel -->
            <div style="
                background: rgba(0, 0, 0, 0.6);
                border: 1px solid rgba(153, 153, 153, 0.3);
                border-radius: 6px;
                padding: 10px 15px;
                margin-top: 15px;
                box-shadow: inset 0 0 10px rgba(0, 0, 0, 0.5);
            ">
                <div style="margin-bottom: 6px; font-size: 13px; color: #aaaaaa;">
                    <span style="letter-spacing: 1px;">SCORE:</span> 
                    <span id="score" style="
                        color: #ffffff; 
                        font-weight: bold;
                        font-size: 16px;
                        transition: transform 0.2s ease-out, color 0.2s ease-out;
                    ">0</span>
                </div>
                <div style="margin-bottom: 6px; font-size: 13px; color: #aaaaaa;">
                    <span style="letter-spacing: 1px;">TIME:</span> 
                    <span id="time" style="color: #ffffff; font-weight: bold;">0:00</span>
                </div>
                <div style="font-size: 13px; color: #aaaaaa;">
                    <span style="letter-spacing: 1px;">ACCURACY:</span> 
                    <span id="accuracy" style="color: #ffffff; font-weight: bold;">0%</span>
                </div>
            </div>
            
            <!-- Combo Display (Below Score/Time/Accuracy) -->
            <div id="combo-display" style="
                background: rgba(0, 0, 0, 0.6);
                border: 1px solid rgba(255, 0, 0, 0.3);
                border-radius: 6px;
                padding: 10px 15px;
                margin-top: 15px;
                box-shadow: inset 0 0 10px rgba(0, 0, 0, 0.5);
                display: none;
                opacity: 0;
                transform: scale(0.8);
                transition: opacity 0.3s ease-out, transform 0.3s ease-out;
            ">
                <div id="combo-text" style="
                    font-size: 13px; 
                    color: #ff0000; 
                    text-shadow: 0 0 10px #ff0000, 2px 2px 4px #000;
                    transition: transform 0.2s ease-out;
                    margin-bottom: 6px;
                    letter-spacing: 1px;
                ">
                    <span style="letter-spacing: 1px;">HEADSHOT COMBO:</span> 
                    <span id="combo-count" style="color: #ffffff; font-weight: bold; font-size: 16px;">0</span>
                </div>
                <div style="width: 100%; height: 6px; background: rgba(0,0,0,0.8); border: 1px solid #ff0000; border-radius: 3px; overflow: hidden;">
                    <div id="combo-timer-bar" style="width: 100%; height: 100%; background: #ff0000; transition: width 0.1s ease-out; box-shadow: 0 0 8px #ff0000;"></div>
                </div>
            </div>
        </div>
            
            <!-- Power-Up Indicators Panel -->
            <div id="powerup-indicators" style="
                position: fixed;
                top: 20px;
                right: 280px;
                z-index: 10;
                pointer-events: none;
                font-family: 'Courier New', monospace;
            ">
                <div id="powerup-message" style="
                    background: rgba(255, 255, 0, 0.15);
                    border: 2px solid rgba(255, 255, 0, 0.5);
                    border-radius: 6px;
                    padding: 10px 15px;
                    font-size: 18px;
                    color: #ffff00;
                    text-shadow: 0 0 15px #ffff00, 2px 2px 4px #000;
                    display: none;
                    box-shadow: 0 0 20px rgba(255, 255, 0, 0.3);
                    margin-bottom: 10px;
                "></div>
                <div id="powerup-timers" style="
                    background: rgba(0, 0, 0, 0.6);
                    border: 1px solid rgba(153, 153, 153, 0.3);
                    border-radius: 6px;
                    padding: 8px 12px;
                    font-size: 13px;
                    color: #ffffff;
                    box-shadow: inset 0 0 10px rgba(0, 0, 0, 0.5);
                ">
                    <span id="double-damage-timer" style="display: none; margin-right: 10px;"></span>
                    <span id="slow-mo-timer" style="display: none;"></span>
                </div>
            </div>
        </div>
        
        <!-- Mini Map (Hidden - kept for JavaScript compatibility) -->
        <div id="mini-map" style="display: none;">
            <canvas id="mini-map-canvas" width="150" height="150"></canvas>
        </div>
        
        <!-- Ammo Counter (moved down to where weapon slots were) -->
        <div id="ammo-display" style="
            position: fixed;
            bottom: 40px;
            right: 40px;
            font-family: 'Courier New', monospace;
            text-align: right;
            z-index: 10;
            pointer-events: none;
            font-size: 48px;
            color: #fff;
            text-shadow: 0 0 15px #fff, 3px 3px 6px #000;
            font-weight: bold;
        ">
            <span id="current-ammo">12</span> / <span id="reserve-ammo">60</span>
        </div>
            
            <!-- Circular Reload Progress Indicator -->
            <div id="reload-indicator" style="
                margin-top: 15px;
                display: none;
                position: relative;
                width: 60px;
                height: 60px;
                margin-left: auto;
                margin-right: 0;
            ">
                <svg width="60" height="60" style="transform: rotate(-90deg);">
                    <!-- Background circle -->
                    <circle
                        cx="30"
                        cy="30"
                        r="25"
                        fill="none"
                        stroke="rgba(153, 153, 153, 0.3)"
                        stroke-width="4"
                    ></circle>
                    <!-- Progress circle -->
                    <circle
                        id="reload-progress-circle"
                        cx="30"
                        cy="30"
                        r="25"
                        fill="none"
                        stroke="#ffff00"
                        stroke-width="4"
                        stroke-linecap="round"
                        stroke-dasharray="157"
                        stroke-dashoffset="157"
                        style="
                            filter: drop-shadow(0 0 8px #ffff00);
                            transition: stroke-dashoffset 0.1s linear;
                        "
                    ></circle>
                </svg>
                <div style="
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    font-size: 12px;
                    color: #ffff00;
                    text-shadow: 0 0 8px #ffff00;
                    font-weight: bold;
                " id="reload-text">R</div>
            </div>
            
            <!-- Weapon Switch Message -->
            <div id="weapon-switch-message" style="
                position: fixed;
                bottom: 200px;
                right: 40px;
                background: rgba(0, 0, 0, 0.85);
                border: 2px solid rgba(153, 153, 153, 0.6);
                border-radius: 8px;
                padding: 12px 20px;
                font-size: 18px;
                color: #ffffff;
                text-shadow: 0 0 10px #ffffff, 2px 2px 4px #000;
                opacity: 0;
                transform: translateY(20px) scale(0.9);
                transition: all 0.3s ease-out;
                pointer-events: none;
                z-index: 15;
                box-shadow: 
                    0 0 20px rgba(0, 0, 0, 0.8),
                    inset 0 0 15px rgba(0, 0, 0, 0.5);
                display: none;
            "></div>
        </div>
        
        <!-- Health Hearts (Bottom Center) -->
        <div id="health-hearts" style="
            position: fixed;
            bottom: 40px;
            left: 50%;
            transform: translateX(-50%);
            display: flex;
            gap: 12px;
            align-items: center;
            justify-content: center;
            z-index: 10;
            pointer-events: none;
        ">
            <div class="heart" data-heart="1" style="
                width: 40px;
                height: 40px;
                color: #ff0000;
                font-size: 40px;
                text-shadow: 0 0 10px #ff0000, 2px 2px 4px #000;
                transition: opacity 0.3s ease-out, transform 0.3s ease-out;
                opacity: 1;
            ">♥</div>
            <div class="heart" data-heart="2" style="
                width: 40px;
                height: 40px;
                color: #ff0000;
                font-size: 40px;
                text-shadow: 0 0 10px #ff0000, 2px 2px 4px #000;
                transition: opacity 0.3s ease-out, transform 0.3s ease-out;
                opacity: 1;
            ">♥</div>
            <div class="heart" data-heart="3" style="
                width: 40px;
                height: 40px;
                color: #ff0000;
                font-size: 40px;
                text-shadow: 0 0 10px #ff0000, 2px 2px 4px #000;
                transition: opacity 0.3s ease-out, transform 0.3s ease-out;
                opacity: 1;
            ">♥</div>
            <div class="heart" data-heart="4" style="
                width: 40px;
                height: 40px;
                color: #ff0000;
                font-size: 40px;
                text-shadow: 0 0 10px #ff0000, 2px 2px 4px #000;
                transition: opacity 0.3s ease-out, transform 0.3s ease-out;
                opacity: 1;
            ">♥</div>
            <div class="heart" data-heart="5" style="
                width: 40px;
                height: 40px;
                color: #ff0000;
                font-size: 40px;
                text-shadow: 0 0 10px #ff0000, 2px 2px 4px #000;
                transition: opacity 0.3s ease-out, transform 0.3s ease-out;
                opacity: 1;
            ">♥</div>
        </div>
        
        <!-- Rail Movement Button -->
        <button id="rail-movement-btn" style="
            position: fixed;
            bottom: 40px;
            left: 40px;
            padding: 12px 24px;
            font-family: 'Courier New', monospace;
            font-size: 18px;
            font-weight: bold;
                    color: #999999;
            background: rgba(0, 0, 0, 0.8);
                border: 2px solid #999999;
            border-radius: 4px;
            cursor: pointer;
            z-index: 100;
            text-shadow: 0 0 10px #999999, 2px 2px 4px #000;
            box-shadow: 0 0 15px rgba(0, 136, 255, 0.5), inset 0 0 10px rgba(0, 136, 255, 0.2);
            transition: all 0.3s;
            pointer-events: auto;
        "            onmouseover="this.style.background='rgba(0, 136, 255, 0.2)'; this.style.boxShadow='0 0 20px rgba(0, 136, 255, 0.8), inset 0 0 15px rgba(0, 136, 255, 0.3)';" 
           onmouseout="this.style.background='rgba(0, 0, 0, 0.8)'; this.style.boxShadow='0 0 15px rgba(0, 136, 255, 0.5), inset 0 0 10px rgba(0, 136, 255, 0.2)';">
            🚂 NEXT LOCATION
        </button>
        
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
                <div style="font-size: 48px; color: #999999; margin-bottom: 20px;">
                    RANK: <span id="final-rank">S</span>
                </div>
                <div id="final-stats" style="font-size: 24px; color: #fff; line-height: 2; margin-bottom: 40px;"></div>
                
                <!-- Leaderboard -->
                <div style="margin-top: 40px; padding: 20px; background: rgba(0, 136, 255, 0.1); border: 2px solid #999999;">
                    <div style="font-size: 28px; color: #999999; margin-bottom: 20px;">BEST SCORES</div>
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
            @keyframes scoreIncrease {
                0% { transform: scale(1); }
                50% { transform: scale(1.2); color: #ffff00; }
                100% { transform: scale(1); }
            }
            @keyframes ammoDecrease {
                0% { transform: scale(1); }
                50% { transform: scale(1.1); }
                100% { transform: scale(1); }
            }
            @keyframes comboAppear {
                0% { opacity: 0; transform: scale(0.8) translateY(-10px); }
                100% { opacity: 1; transform: scale(1) translateY(0); }
            }
            @keyframes weaponSwitch {
                0% { transform: translateX(0) scale(1); }
                50% { transform: translateX(-5px) scale(1.05); }
                100% { transform: translateX(0) scale(1); }
            }
            @keyframes weaponSwitchSlide {
                0% { opacity: 0; transform: translateY(20px) scale(0.9); }
                50% { opacity: 1; transform: translateY(0) scale(1.05); }
                100% { opacity: 0; transform: translateY(-20px) scale(0.9); }
            }
            @keyframes heartLoss {
                0% { transform: scale(1); opacity: 1; }
                50% { transform: scale(1.5); opacity: 0.7; }
                100% { transform: scale(0); opacity: 0; }
            }
        </style>
    `;
    
    document.body.appendChild(uiContainer);
    
    // Remove weapon-name element if it exists (cleanup)
    const weaponNameEl = document.getElementById('weapon-name');
    if (weaponNameEl) weaponNameEl.remove();
    
    // Add click handler for rail movement button
    const railBtn = document.getElementById('rail-movement-btn');
    if (railBtn) {
        railBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (window.startRailMovement && typeof window.startRailMovement === 'function') {
                window.startRailMovement();
            } else {
                console.error('⚠️ startRailMovement function not available');
            }
        });
    }
}

export function updateUI() {
    // Health Hearts (5 hearts = 100 health, each heart = 20 health)
    const hearts = document.querySelectorAll('.heart');
    const healthPerHeart = gameData.maxHealth / 5; // 20 health per heart
    const fullHearts = Math.floor(gameData.health / healthPerHeart);
    const hasPartialHeart = (gameData.health % healthPerHeart) > 0;
    
    hearts.forEach((heart, index) => {
        const heartNumber = index + 1;
        const wasVisible = heart.style.opacity !== '0' && heart.style.opacity !== '';
        
        if (heartNumber <= fullHearts) {
            // Full heart - visible
            heart.style.opacity = '1';
            heart.style.transform = 'scale(1)';
            heart.style.animation = '';
        } else if (heartNumber === fullHearts + 1 && hasPartialHeart) {
            // Partial heart - show but dimmed
            heart.style.opacity = '0.5';
            heart.style.transform = 'scale(0.9)';
            heart.style.animation = '';
        } else {
            // Empty heart - hidden
            if (wasVisible) {
                // Animate heart loss
                heart.style.animation = 'heartLoss 0.4s ease-out forwards';
            } else {
                heart.style.opacity = '0';
                heart.style.transform = 'scale(0)';
                heart.style.animation = '';
            }
        }
    });
    
    // Mission Progress Indicators
    const missionProgressBar = document.getElementById('mission-progress-bar');
    const missionPercentage = document.getElementById('mission-percentage');
    const sceneIndicatorsContainer = document.getElementById('scene-indicators');
    
    // Calculate mission completion percentage
    // A scene is "complete" when we've moved past it (currentScene > sceneIndex)
    // For percentage, use: completedScenes / totalScenes * 100
    // Current scene contributes partial progress based on zombie kills
    const completedScenes = Math.max(0, gameData.currentScene);
    const currentScene = getCurrentCameraScene();
    const totalZombies = currentScene ? currentScene.spawnPoints.length : 0;
    const zombies = zombieManager.getZombies();
    const aliveZombies = zombies.filter(z => !z.isDead).length;
    const zombiesKilled = Math.max(0, totalZombies - aliveZombies);
    
    // Current scene progress (0-1) based on zombie kills
    const currentSceneProgress = totalZombies > 0 ? zombiesKilled / totalZombies : 1;
    
    // Overall mission percentage
    const totalProgress = (completedScenes + currentSceneProgress) / gameData.totalScenes;
    const percentage = Math.min(100, Math.floor(totalProgress * 100));
    
    // Update progress bar
    missionProgressBar.style.width = `${totalProgress * 100}%`;
    missionPercentage.textContent = `${percentage}%`;
    
    // Update scene indicators
    if (sceneIndicatorsContainer) {
        // Clear existing indicators
        sceneIndicatorsContainer.innerHTML = '';
        
        // Generate indicators for each scene
        for (let i = 0; i < gameData.totalScenes; i++) {
            const indicator = document.createElement('div');
            indicator.style.cssText = `
                width: 10px;
                height: 10px;
                border-radius: 50%;
                transition: all 0.3s ease-out;
                position: relative;
            `;
            
            if (i < gameData.currentScene) {
                // Completed scene - green checkmark
                indicator.style.background = '#00ff00';
                indicator.style.boxShadow = '0 0 8px #00ff00, inset 0 0 4px rgba(0,255,0,0.5)';
                indicator.title = `Scene ${i + 1} - Completed`;
                indicator.innerHTML = '✓';
                indicator.style.fontSize = '8px';
                indicator.style.color = '#000';
                indicator.style.display = 'flex';
                indicator.style.alignItems = 'center';
                indicator.style.justifyContent = 'center';
                indicator.style.fontWeight = 'bold';
            } else if (i === gameData.currentScene) {
                // Current scene - pulsing cyan/blue
                indicator.style.background = '#00ccff';
                indicator.style.boxShadow = '0 0 12px #00ccff, 0 0 20px #00ccff';
                indicator.style.animation = 'pulse 1.5s infinite';
                indicator.style.width = '12px';
                indicator.style.height = '12px';
                indicator.title = `Scene ${i + 1} - In Progress (${zombiesKilled}/${totalZombies})`;
            } else {
                // Upcoming scene - gray
                indicator.style.background = 'rgba(153, 153, 153, 0.3)';
                indicator.style.border = '1px solid rgba(153, 153, 153, 0.5)';
                indicator.title = `Scene ${i + 1} - Upcoming`;
            }
            
            sceneIndicatorsContainer.appendChild(indicator);
        }
    }
    
    // Scene
    document.getElementById('scene-number').textContent = gameData.currentScene + 1;
    document.getElementById('total-scenes').textContent = gameData.totalScenes;
    
    // Zombies
    document.getElementById('zombies-killed').textContent = zombiesKilled;
    document.getElementById('zombies-total').textContent = totalZombies;
    
    // Combo with smooth animations
    const comboDisplay = document.getElementById('combo-display');
    const comboText = document.getElementById('combo-text');
    const comboCount = document.getElementById('combo-count');
    
    if (gameData.currentCombo > 0) {
        // Show combo with smooth fade-in and scale
        if (comboDisplay.style.display === 'none' || comboDisplay.style.opacity === '0') {
            comboDisplay.style.display = 'block';
            // Trigger animation
            requestAnimationFrame(() => {
                comboDisplay.style.opacity = '1';
                comboDisplay.style.transform = 'scale(1)';
            });
        }
        
        // Update combo count with scale animation
        const oldCombo = parseInt(comboCount.textContent) || 0;
        if (gameData.currentCombo !== oldCombo) {
            comboText.style.transform = 'scale(1.2)';
            setTimeout(() => {
                comboText.style.transform = 'scale(1)';
            }, 200);
        }
        
        comboCount.textContent = gameData.currentCombo;
        const timerPercent = (gameData.comboTimer / gameData.comboDecayTime) * 100;
        document.getElementById('combo-timer-bar').style.width = timerPercent + '%';
    } else {
        // Hide combo with smooth fade-out
        if (comboDisplay.style.opacity !== '0') {
            comboDisplay.style.opacity = '0';
            comboDisplay.style.transform = 'scale(0.8)';
            setTimeout(() => {
                comboDisplay.style.display = 'none';
            }, 300);
        }
    }
    
    // Score with animation when it increases
    const scoreElement = document.getElementById('score');
    const oldScore = parseInt(scoreElement.textContent) || 0;
    if (gameData.score > oldScore) {
        // Animate score increase
        scoreElement.style.transform = 'scale(1.15)';
        scoreElement.style.color = '#ffff00';
        setTimeout(() => {
            scoreElement.style.transform = 'scale(1)';
            scoreElement.style.color = '';
        }, 300);
    }
    scoreElement.textContent = gameData.score;
    
    // Time
    const elapsed = Math.floor(gameData.currentTime);
    const minutes = Math.floor(elapsed / 60);
    const seconds = elapsed % 60;
    document.getElementById('time').textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    
    // Accuracy
    const accuracyElement = document.getElementById('accuracy');
    if (accuracyElement) {
        const accuracy = gameData.shotsFired > 0 
            ? Math.round((gameData.shotsHit / gameData.shotsFired) * 100)
            : 0;
        accuracyElement.textContent = `${accuracy}%`;
    }
    
    // Ammo with smooth color transitions
    const currentAmmoElement = document.getElementById('current-ammo');
    const reserveAmmoElement = document.getElementById('reserve-ammo');
    
    // Smooth color transition for ammo
    currentAmmoElement.style.transition = 'color 0.3s ease-out, transform 0.2s ease-out';
    reserveAmmoElement.style.transition = 'color 0.3s ease-out';
    
    const oldAmmo = parseInt(currentAmmoElement.textContent) || 0;
    
    // Animate when ammo decreases
    if (gameData.currentAmmo < oldAmmo && gameData.currentAmmo > 0) {
        currentAmmoElement.style.transform = 'scale(1.1)';
        setTimeout(() => {
            currentAmmoElement.style.transform = 'scale(1)';
        }, 150);
    }
    
    currentAmmoElement.textContent = gameData.currentAmmo;
    reserveAmmoElement.textContent = gameData.reserveAmmo;
    
    // Color-code ammo with smooth transitions
    if (gameData.currentAmmo === 0) {
        currentAmmoElement.style.color = '#ff0000';
        currentAmmoElement.style.animation = 'pulse 1s infinite';
    } else if (gameData.currentAmmo <= 3) {
        currentAmmoElement.style.color = '#ffff00';
        currentAmmoElement.style.animation = '';
    } else {
        currentAmmoElement.style.color = '#ffffff';
        currentAmmoElement.style.animation = '';
    }
    
    updateMiniMap();
}

function updateMiniMap() {
    const canvas = document.getElementById('mini-map-canvas');
    if (!canvas) return; // Exit early if canvas doesn't exist
    const ctx = canvas.getContext('2d');
    
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, 150, 150);
    
    ctx.fillStyle = '#999999';
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
            'B': '#999999',
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


