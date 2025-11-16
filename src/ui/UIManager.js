// src/ui/UIManager.js

/**
 * UI Manager
 * Handles all HTML UI elements and updates
 */

export class UIManager {
    constructor(gameStateManager) {
        this.gameState = gameStateManager;
        this.elements = new Map();
        
        this.init();
        console.log('🎨 UIManager initialized');
    }
    
    /**
     * Initialize all UI elements
     */
    init() {
        // Create HUD
        this.createHUD();
        
        // Create Mission Complete screen
        this.createMissionCompleteScreen();
        
        // Create Pause menu
        this.createPauseMenu();
        
        // Create Debug UI
        this.createDebugUI();
        
        // Initially hide everything except crosshair
        this.hideAllMenus();
    }
    
    /**
     * Create HUD (Heads Up Display)
     */
    createHUD() {
        const hud = document.createElement('div');
        hud.id = 'hud';
        hud.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            pointer-events: none;
            z-index: 10;
            font-family: 'Courier New', monospace;
            color: #00ffff;
            text-shadow: 0 0 10px #00ffff, 2px 2px 4px #000;
        `;
        
        hud.innerHTML = `
            <div style="padding: 20px; display: flex; justify-content: space-between;">
                <div id="hud-left">
                    <div id="zombie-counter" style="font-size: 24px; margin-bottom: 10px;">
                        ZOMBIES: <span id="zombies-killed">0</span>/<span id="zombies-total">10</span>
                    </div>
                    <div id="score-display" style="font-size: 18px;">
                        SCORE: <span id="score-value">0</span>
                    </div>
                </div>
                <div id="hud-right" style="text-align: right;">
                    <div id="accuracy-display" style="font-size: 18px;">
                        ACCURACY: <span id="accuracy-value">0</span>%
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(hud);
        this.elements.set('hud', hud);
        this.elements.set('zombies-killed', document.getElementById('zombies-killed'));
        this.elements.set('zombies-total', document.getElementById('zombies-total'));
        this.elements.set('score-value', document.getElementById('score-value'));
        this.elements.set('accuracy-value', document.getElementById('accuracy-value'));
    }
    
    /**
     * Create Mission Complete screen
     */
    createMissionCompleteScreen() {
        const screen = document.createElement('div');
        screen.id = 'mission-complete';
        screen.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.9);
            display: none;
            justify-content: center;
            align-items: center;
            z-index: 100;
            font-family: 'Courier New', monospace;
        `;
        
        screen.innerHTML = `
            <div style="text-align: center; animation: fadeIn 0.5s;">
                <div style="font-size: 72px; color: #ffff00; text-shadow: 0 0 30px #ffff00, 4px 4px 8px #000; margin-bottom: 40px; animation: pulse 1s infinite;">
                    MISSION COMPLETE
                </div>
                
                <div style="background: rgba(255, 255, 255, 0.1); padding: 40px; border: 3px solid #00ffff; box-shadow: 0 0 20px #00ffff;">
                    <div style="font-size: 48px; color: #00ffff; margin-bottom: 20px;">
                        RANK: <span id="final-rank" style="color: #ffff00;">S</span>
                    </div>
                    
                    <div style="font-size: 24px; color: #fff; line-height: 2;">
                        <div>Zombies Eliminated: <span id="final-zombies" style="color: #00ffff;">0</span></div>
                        <div>Accuracy: <span id="final-accuracy" style="color: #00ffff;">0%</span></div>
                        <div>Time: <span id="final-time" style="color: #00ffff;">0s</span></div>
                        <div style="margin-top: 20px; font-size: 32px; color: #ffff00;">
                            FINAL SCORE: <span id="final-score">0</span>
                        </div>
                    </div>
                    
                    <div style="margin-top: 40px; font-size: 20px; color: #ff1493; animation: blink 1.5s infinite;">
                        Press R to Restart
                    </div>
                </div>
            </div>
            
            <style>
                @keyframes pulse {
                    0%, 100% { opacity: 1; transform: scale(1); }
                    50% { opacity: 0.8; transform: scale(1.05); }
                }
                
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                
                @keyframes blink {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.3; }
                }
            </style>
        `;
        
        document.body.appendChild(screen);
        this.elements.set('mission-complete', screen);
        this.elements.set('final-rank', document.getElementById('final-rank'));
        this.elements.set('final-zombies', document.getElementById('final-zombies'));
        this.elements.set('final-accuracy', document.getElementById('final-accuracy'));
        this.elements.set('final-time', document.getElementById('final-time'));
        this.elements.set('final-score', document.getElementById('final-score'));
    }
    
    /**
     * Create Pause menu
     */
    createPauseMenu() {
        const menu = document.createElement('div');
        menu.id = 'pause-menu';
        menu.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            display: none;
            justify-content: center;
            align-items: center;
            z-index: 100;
            font-family: 'Courier New', monospace;
        `;
        
        menu.innerHTML = `
            <div style="text-align: center;">
                <div style="font-size: 64px; color: #00ffff; text-shadow: 0 0 20px #00ffff; margin-bottom: 40px;">
                    PAUSED
                </div>
                <div style="font-size: 24px; color: #fff; line-height: 2;">
                    <div>Press P to Resume</div>
                    <div>Press R to Restart</div>
                    <div>Press ESC to Exit</div>
                </div>
            </div>
        `;
        
        document.body.appendChild(menu);
        this.elements.set('pause-menu', menu);
    }
    
    /**
     * Create Debug UI
     */
    createDebugUI() {
        const debug = document.createElement('div');
        debug.id = 'debug-ui';
        debug.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: rgba(0, 0, 0, 0.7);
            padding: 15px;
            font-family: 'Courier New', monospace;
            font-size: 12px;
            color: #0f0;
            border: 1px solid #0f0;
            z-index: 50;
            display: none;
        `;
        
        debug.innerHTML = `
            <div style="margin-bottom: 10px; color: #0ff;">DEBUG INFO</div>
            <div id="debug-state">State: LOADING</div>
            <div id="debug-fps">FPS: 0</div>
            <div id="debug-zombies">Zombies: 0</div>
            <div id="debug-shots">Shots: 0/0</div>
            <div style="margin-top: 10px; color: #ff0;">
                <div>Z - Spawn Zombie</div>
                <div>K - Kill All Zombies</div>
                <div>G - Toggle Debug</div>
            </div>
        `;
        
        document.body.appendChild(debug);
        this.elements.set('debug-ui', debug);
        this.elements.set('debug-state', document.getElementById('debug-state'));
        this.elements.set('debug-fps', document.getElementById('debug-fps'));
        this.elements.set('debug-zombies', document.getElementById('debug-zombies'));
        this.elements.set('debug-shots', document.getElementById('debug-shots'));
    }
    
    /**
     * Update HUD
     */
    updateHUD() {
        const data = this.gameState.gameData;
        
        this.elements.get('zombies-killed').textContent = data.zombiesKilled;
        this.elements.get('zombies-total').textContent = data.totalZombies;
        this.elements.get('score-value').textContent = data.score;
        this.elements.get('accuracy-value').textContent = this.gameState.getAccuracy();
    }
    
    /**
     * Update Debug UI
     */
    updateDebug(fps, zombieCount) {
        if (!this.elements.get('debug-ui').style.display === 'block') return;
        
        const data = this.gameState.gameData;
        
        this.elements.get('debug-state').textContent = `State: ${this.gameState.currentState}`;
        this.elements.get('debug-fps').textContent = `FPS: ${fps}`;
        this.elements.get('debug-zombies').textContent = `Zombies: ${zombieCount}`;
        this.elements.get('debug-shots').textContent = `Shots: ${data.shotsHit}/${data.shotsFired}`;
    }
    
    /**
     * Show Mission Complete screen
     */
    showMissionComplete() {
        const data = this.gameState.gameData;
        
        this.elements.get('final-rank').textContent = this.gameState.getRank();
        this.elements.get('final-zombies').textContent = data.zombiesKilled;
        this.elements.get('final-accuracy').textContent = this.gameState.getAccuracy() + '%';
        this.elements.get('final-time').textContent = this.gameState.getGameDuration() + 's';
        this.elements.get('final-score').textContent = data.score;
        
        // Set rank color
        const rank = this.gameState.getRank();
        const rankColors = {
            'S': '#ffff00',
            'A': '#00ff00',
            'B': '#00ffff',
            'C': '#ffa500',
            'D': '#ff0000'
        };
        this.elements.get('final-rank').style.color = rankColors[rank] || '#fff';
        
        this.elements.get('mission-complete').style.display = 'flex';
    }
    
    /**
     * Show HUD
     */
    showHUD() {
        this.elements.get('hud').style.display = 'block';
    }
    
    /**
     * Hide HUD
     */
    hideHUD() {
        this.elements.get('hud').style.display = 'none';
    }
    
    /**
     * Show Pause menu
     */
    showPauseMenu() {
        this.elements.get('pause-menu').style.display = 'flex';
    }
    
    /**
     * Hide Pause menu
     */
    hidePauseMenu() {
        this.elements.get('pause-menu').style.display = 'none';
    }
    
    /**
     * Toggle Debug UI
     */
    toggleDebug() {
        const debug = this.elements.get('debug-ui');
        debug.style.display = debug.style.display === 'none' ? 'block' : 'none';
    }
    
    /**
     * Hide all menus
     */
    hideAllMenus() {
        this.elements.get('mission-complete').style.display = 'none';
        this.elements.get('pause-menu').style.display = 'none';
    }
    
    /**
     * Create floating damage number
     */
    createDamageNumber(position, damage, camera) {
        // Convert 3D position to screen coordinates
        const vector = position.clone();
        vector.project(camera);
        
        const x = (vector.x * 0.5 + 0.5) * window.innerWidth;
        const y = (vector.y * -0.5 + 0.5) * window.innerHeight;
        
        const damageDiv = document.createElement('div');
        damageDiv.style.cssText = `
            position: fixed;
            left: ${x}px;
            top: ${y}px;
            font-family: 'Courier New', monospace;
            font-size: 32px;
            font-weight: bold;
            color: #ff0000;
            text-shadow: 0 0 10px #ff0000, 2px 2px 4px #000;
            pointer-events: none;
            z-index: 999;
            animation: floatUp 1s ease-out forwards;
        `;
        damageDiv.textContent = `-${damage}`;
        
        // Add animation
        const style = document.createElement('style');
        style.textContent = `
            @keyframes floatUp {
                0% { opacity: 1; transform: translateY(0); }
                100% { opacity: 0; transform: translateY(-50px); }
            }
        `;
        document.head.appendChild(style);
        
        document.body.appendChild(damageDiv);
        
        // Remove after animation
        setTimeout(() => {
            damageDiv.remove();
            style.remove();
        }, 1000);
    }
    
    /**
     * Create floating text (generic)
     */
    createFloatingText(text, x, y, color = '#ffff00') {
        const textDiv = document.createElement('div');
        textDiv.style.cssText = `
            position: fixed;
            left: ${x}px;
            top: ${y}px;
            font-family: 'Courier New', monospace;
            font-size: 48px;
            font-weight: bold;
            color: ${color};
            text-shadow: 0 0 20px ${color}, 3px 3px 6px #000;
            pointer-events: none;
            z-index: 999;
            animation: floatUp 1.5s ease-out forwards;
        `;
        textDiv.textContent = text;
        
        document.body.appendChild(textDiv);
        
        setTimeout(() => textDiv.remove(), 1500);
    }
}