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
        
        <!-- Boss Health Bar (Top of Screen) -->
        <div id="boss-health-bar" style="
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            width: 600px;
            z-index: 15;
            pointer-events: none;
            display: none;
            font-family: 'Courier New', monospace;
        ">
            <div style="
                text-align: center;
                margin-bottom: 8px;
                font-size: 18px;
                color: #ff0000;
                text-shadow: 0 0 10px #ff0000, 2px 2px 4px #000;
                font-weight: bold;
                letter-spacing: 2px;
            ">GRIM REAPER</div>
            <div style="
                width: 100%;
                height: 30px;
                background: rgba(0, 0, 0, 0.9);
                border: 3px solid #ff0000;
                border-radius: 6px;
                overflow: hidden;
                box-shadow: 
                    0 0 20px rgba(255, 0, 0, 0.8),
                    inset 0 0 15px rgba(0, 0, 0, 0.5);
            ">
                <div id="boss-health-fill" style="
                    width: 100%;
                    height: 100%;
                    background: linear-gradient(90deg, #ff0000, #ff4444, #ff0000);
                    box-shadow: 0 0 15px rgba(255, 0, 0, 0.9);
                    transition: width 0.3s ease-out;
                "></div>
            </div>
            <div style="
                text-align: center;
                margin-top: 6px;
                font-size: 14px;
                color: #ffffff;
                text-shadow: 0 0 8px #ffffff, 2px 2px 4px #000;
                font-weight: bold;
            ">
                <span id="boss-health-current">3000</span> / <span id="boss-health-max">3000</span>
            </div>
        </div>
        
        <!-- HUD - Left Panel (Primary Stats) -->
        <div id="hud-left" style="
            position: fixed;
            top: 20px;
            left: 20px;
            font-family: 'Courier New', monospace;
            color: #999999;
            z-index: 10;
            pointer-events: none;
            display: none;
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
                display: none;
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
            display: none;
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
            display: none;
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
        
        <!-- Settings Gear Icon Button -->
        <button id="settings-btn" style="
            position: fixed;
            top: 20px;
            right: 20px;
            display: none;
            width: 50px;
            height: 50px;
            padding: 0;
            font-family: 'Courier New', monospace;
            font-size: 24px;
            font-weight: bold;
            color: #999999;
            background: rgba(0, 0, 0, 0.8);
            border: 2px solid #999999;
            border-radius: 50%;
            cursor: pointer;
            z-index: 100;
            text-shadow: 0 0 10px #999999, 2px 2px 4px #000;
            box-shadow: 0 0 15px rgba(153, 153, 153, 0.5), inset 0 0 10px rgba(153, 153, 153, 0.2);
            transition: all 0.3s;
            pointer-events: auto;
            display: flex;
            align-items: center;
            justify-content: center;
        " onmouseover="this.style.background='rgba(153, 153, 153, 0.3)'; this.style.boxShadow='0 0 20px rgba(153, 153, 153, 0.8), inset 0 0 15px rgba(153, 153, 153, 0.3)';" 
           onmouseout="this.style.background='rgba(0, 0, 0, 0.8)'; this.style.boxShadow='0 0 15px rgba(153, 153, 153, 0.5), inset 0 0 10px rgba(153, 153, 153, 0.2)';">
            ⚙️
        </button>
        
        <!-- Settings Menu -->
        <div id="settings-menu" style="
            position: fixed;
            top: 80px;
            right: 20px;
            width: 300px;
            background: rgba(0, 0, 0, 0.95);
            border: 2px solid rgba(153, 153, 153, 0.6);
            border-radius: 8px;
            padding: 20px;
            z-index: 101;
            pointer-events: none;
            opacity: 0;
            transform: translateY(-10px) scale(0.95);
            transition: all 0.3s ease-out;
            box-shadow: 
                0 0 30px rgba(0, 0, 0, 0.9),
                inset 0 0 20px rgba(0, 0, 0, 0.5);
            font-family: 'Courier New', monospace;
            display: none;
        ">
            <div style="
                font-size: 20px;
                color: #ffffff;
                margin-bottom: 20px;
                text-align: center;
                letter-spacing: 2px;
                text-shadow: 0 0 10px #ffffff;
            ">SETTINGS</div>
            
            <!-- Music Toggle -->
            <div style="
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 15px;
                padding: 12px;
                background: rgba(153, 153, 153, 0.1);
                border-radius: 6px;
                border: 1px solid rgba(153, 153, 153, 0.3);
            ">
                <div style="
                    font-size: 14px;
                    color: #cccccc;
                    letter-spacing: 1px;
                ">MUSIC</div>
                <label style="
                    position: relative;
                    display: inline-block;
                    width: 50px;
                    height: 26px;
                    cursor: pointer;
                ">
                    <input type="checkbox" id="music-toggle" checked style="
                        opacity: 0;
                        width: 0;
                        height: 0;
                    ">
                    <span id="music-toggle-slider" style="
                        position: absolute;
                        cursor: pointer;
                        top: 0;
                        left: 0;
                        right: 0;
                        bottom: 0;
                        background-color: rgba(153, 153, 153, 0.3);
                        transition: 0.3s;
                        border-radius: 26px;
                        border: 1px solid rgba(153, 153, 153, 0.5);
                    ">
                        <span id="music-toggle-knob" style="
                            position: absolute;
                            content: '';
                            height: 20px;
                            width: 20px;
                            left: 3px;
                            bottom: 2px;
                            background-color: #999999;
                            transition: 0.3s;
                            border-radius: 50%;
                            box-shadow: 0 0 8px rgba(153, 153, 153, 0.5);
                        "></span>
                    </span>
                </label>
            </div>
            
            <!-- Music Selection -->
            <div style="
                margin-bottom: 15px;
                padding: 12px;
                background: rgba(153, 153, 153, 0.1);
                border-radius: 6px;
                border: 1px solid rgba(153, 153, 153, 0.3);
            ">
                <div style="
                    font-size: 14px;
                    color: #cccccc;
                    letter-spacing: 1px;
                    margin-bottom: 8px;
                ">MUSIC TRACK</div>
                <select id="music-selector" style="
                    width: 100%;
                    padding: 8px;
                    font-family: 'Courier New', monospace;
                    font-size: 13px;
                    color: #ffffff;
                    background: rgba(0, 0, 0, 0.6);
                    border: 1px solid rgba(153, 153, 153, 0.5);
                    border-radius: 4px;
                    cursor: pointer;
                    outline: none;
                ">
                    <option value="main">Main Theme</option>
                    <option value="alternative">KSHERWOODOPS</option>
                    <option value="boss">Boss Fight</option>
                </select>
            </div>
            
            <!-- Music Volume Slider -->
            <div style="
                margin-bottom: 15px;
                padding: 12px;
                background: rgba(153, 153, 153, 0.1);
                border-radius: 6px;
                border: 1px solid rgba(153, 153, 153, 0.3);
            ">
                <div style="
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 8px;
                ">
                    <div style="
                        font-size: 14px;
                        color: #cccccc;
                        letter-spacing: 1px;
                    ">MUSIC VOLUME</div>
                    <div id="music-volume-value" style="
                        font-size: 13px;
                        color: #ffffff;
                        font-weight: bold;
                        min-width: 40px;
                        text-align: right;
                    ">40%</div>
                </div>
                <input type="range" id="music-volume-slider" min="0" max="100" value="40" style="
                    width: 100%;
                    height: 6px;
                    background: rgba(153, 153, 153, 0.3);
                    border-radius: 3px;
                    outline: none;
                    cursor: pointer;
                    -webkit-appearance: none;
                ">
                <style>
                    #music-volume-slider::-webkit-slider-thumb {
                        -webkit-appearance: none;
                        appearance: none;
                        width: 16px;
                        height: 16px;
                        background: #999999;
                        border-radius: 50%;
                        cursor: pointer;
                        box-shadow: 0 0 8px rgba(153, 153, 153, 0.5);
                        transition: all 0.2s;
                    }
                    #music-volume-slider::-webkit-slider-thumb:hover {
                        background: #0088ff;
                        box-shadow: 0 0 12px rgba(0, 136, 255, 0.8);
                        transform: scale(1.2);
                    }
                    #music-volume-slider::-moz-range-thumb {
                        width: 16px;
                        height: 16px;
                        background: #999999;
                        border-radius: 50%;
                        cursor: pointer;
                        border: none;
                        box-shadow: 0 0 8px rgba(153, 153, 153, 0.5);
                        transition: all 0.2s;
                    }
                    #music-volume-slider::-moz-range-thumb:hover {
                        background: #0088ff;
                        box-shadow: 0 0 12px rgba(0, 136, 255, 0.8);
                        transform: scale(1.2);
                    }
                </style>
            </div>
            
            <!-- Close Button -->
            <button id="settings-close-btn" style="
                width: 100%;
                padding: 10px;
                margin-top: 10px;
                font-family: 'Courier New', monospace;
                font-size: 14px;
                font-weight: bold;
                color: #999999;
                background: rgba(153, 153, 153, 0.1);
                border: 1px solid rgba(153, 153, 153, 0.3);
                border-radius: 4px;
                cursor: pointer;
                transition: all 0.3s;
                letter-spacing: 1px;
            " onmouseover="this.style.background='rgba(153, 153, 153, 0.2)'; this.style.borderColor='rgba(153, 153, 153, 0.5)';" 
               onmouseout="this.style.background='rgba(153, 153, 153, 0.1)'; this.style.borderColor='rgba(153, 153, 153, 0.3)';">
                CLOSE
            </button>
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
            background: linear-gradient(135deg, rgba(0, 0, 0, 0.98) 0%, rgba(40, 20, 20, 0.98) 100%);
            display: none;
            justify-content: center;
            align-items: center;
            z-index: 100;
            font-family: 'Courier New', monospace;
            overflow-y: auto;
            animation: fadeIn 0.5s ease-in;
        ">
            <div style="
                text-align: center;
                max-width: 1200px;
                width: 95%;
                padding: 20px;
            ">
                <!-- Title -->
                <div style="
                    font-size: 56px;
                    color: #ff0000;
                    text-shadow: 
                        0 0 20px #ff0000,
                        0 0 40px #ff0000,
                        0 0 60px #ff0000;
                    margin-bottom: 15px;
                    animation: pulse 1.5s infinite;
                    letter-spacing: 3px;
                ">
                    GAME OVER
                </div>
                
                <!-- Detailed Stats Breakdown -->
                <div style="
                    background: linear-gradient(135deg, rgba(0, 0, 0, 0.85) 0%, rgba(40, 20, 20, 0.85) 100%);
                    border: 3px solid rgba(153, 153, 153, 0.6);
                    border-radius: 12px;
                    padding: 20px;
                    margin-bottom: 15px;
                    box-shadow: 
                        0 0 30px rgba(0, 0, 0, 0.9),
                        0 0 15px rgba(255, 0, 0, 0.2),
                        inset 0 0 20px rgba(0, 0, 0, 0.6);
                    backdrop-filter: blur(10px);
                ">
                    <div style="
                        font-size: 24px;
                        color: #ff4444;
                        margin-bottom: 15px;
                        text-shadow: 
                            0 0 10px #ff4444,
                            0 0 20px #ff4444,
                            2px 2px 4px #000;
                        letter-spacing: 2px;
                        font-weight: bold;
                        text-align: center;
                        border-bottom: 2px solid rgba(255, 68, 68, 0.3);
                        padding-bottom: 8px;
                    ">
                        PERFORMANCE ANALYSIS
                    </div>
                    <div id="game-over-stats" style="
                        display: grid;
                        grid-template-columns: repeat(4, 1fr);
                        gap: 10px;
                    "></div>
                </div>
                
                <!-- Final Score Highlight -->
                <div style="
                    margin: 15px 0;
                    padding: 15px;
                    background: linear-gradient(135deg, rgba(255, 0, 0, 0.2) 0%, rgba(0, 0, 0, 0.6) 100%);
                    border: 3px solid rgba(255, 0, 0, 0.6);
                    border-radius: 12px;
                    box-shadow: 
                        0 0 30px rgba(255, 0, 0, 0.5),
                        inset 0 0 20px rgba(0, 0, 0, 0.5);
                    backdrop-filter: blur(10px);
                ">
                    <div style="
                        font-size: 14px;
                        color: #ff0000;
                        text-transform: uppercase;
                        letter-spacing: 2px;
                        margin-bottom: 8px;
                        opacity: 0.9;
                    ">FINAL SCORE</div>
                    <div id="game-over-score-display" style="
                        font-size: 42px;
                        color: #ff0000;
                        text-shadow: 
                            0 0 20px #ff0000,
                            0 0 40px #ff0000,
                            0 0 60px #ff0000,
                            2px 2px 6px #000;
                        font-weight: bold;
                        letter-spacing: 3px;
                        animation: scoreGlow 2s infinite;
                    "></div>
                </div>
                
                <!-- Restart Prompt -->
                <div style="
                    font-size: 18px;
                    color: #ff1493;
                    margin-top: 15px;
                    animation: blink 1.5s infinite;
                    text-shadow: 0 0 8px #ff1493;
                    letter-spacing: 1.5px;
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
            background: linear-gradient(135deg, rgba(0, 0, 0, 0.98) 0%, rgba(20, 20, 40, 0.98) 100%);
            display: none;
            justify-content: center;
            align-items: center;
            z-index: 100;
            font-family: 'Courier New', monospace;
            overflow-y: auto;
            animation: fadeIn 0.5s ease-in;
        ">
                <div style="
                text-align: center;
                max-width: 1200px;
                width: 95%;
                padding: 20px;
            ">
                <!-- Title -->
                <div style="
                    font-size: 56px;
                    color: #ffff00;
                    text-shadow: 
                        0 0 20px #ffff00,
                        0 0 40px #ffff00,
                        0 0 60px #ffff00;
                    margin-bottom: 15px;
                    animation: pulse 1.5s infinite;
                    letter-spacing: 3px;
                ">
                    MISSION COMPLETE
                </div>
                
                <!-- Rank Badge -->
                <div style="
                    margin-bottom: 20px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 15px;
                ">
                    <span style="
                        font-size: 24px; 
                        color: #666;
                        text-transform: uppercase;
                        letter-spacing: 2px;
                        font-weight: bold;
                    ">RANK</span>
                    <span id="final-rank" style="
                        font-size: 64px;
                        font-weight: bold;
                        text-shadow: 
                            0 0 20px currentColor,
                            0 0 40px currentColor,
                            2px 2px 6px #000;
                        padding: 12px 30px;
                        border: 3px solid currentColor;
                        border-radius: 12px;
                        background: linear-gradient(135deg, rgba(0, 0, 0, 0.7) 0%, rgba(20, 20, 40, 0.7) 100%);
                        box-shadow: 
                            0 0 30px currentColor,
                            inset 0 0 20px rgba(0, 0, 0, 0.5);
                        min-width: 80px;
                        display: inline-block;
                        animation: rankPulse 2s infinite;
                    ">S</span>
                </div>
                
                <!-- Detailed Stats Breakdown -->
                <div style="
                    background: linear-gradient(135deg, rgba(0, 0, 0, 0.85) 0%, rgba(20, 20, 40, 0.85) 100%);
                    border: 3px solid rgba(153, 153, 153, 0.6);
                    border-radius: 12px;
                    padding: 20px;
                    margin-bottom: 15px;
                    box-shadow: 
                        0 0 30px rgba(0, 0, 0, 0.9),
                        0 0 15px rgba(0, 136, 255, 0.2),
                        inset 0 0 20px rgba(0, 0, 0, 0.6);
                    backdrop-filter: blur(10px);
                ">
                    <div style="
                        font-size: 24px;
                        color: #00ccff;
                        margin-bottom: 15px;
                        text-shadow: 
                            0 0 10px #00ccff,
                            0 0 20px #00ccff,
                            2px 2px 4px #000;
                        letter-spacing: 2px;
                        font-weight: bold;
                        text-align: center;
                        border-bottom: 2px solid rgba(0, 204, 255, 0.3);
                        padding-bottom: 8px;
                    ">
                        PERFORMANCE ANALYSIS
                    </div>
                    <div id="final-stats" style="
                        display: grid;
                        grid-template-columns: repeat(4, 1fr);
                        gap: 10px;
                    "></div>
                </div>
                
                <!-- Final Score Highlight -->
                <div style="
                    margin: 15px 0;
                    padding: 15px;
                    background: linear-gradient(135deg, rgba(255, 255, 0, 0.2) 0%, rgba(0, 0, 0, 0.6) 100%);
                    border: 3px solid rgba(255, 255, 0, 0.6);
                    border-radius: 12px;
                    box-shadow: 
                        0 0 30px rgba(255, 255, 0, 0.5),
                        inset 0 0 20px rgba(0, 0, 0, 0.5);
                    backdrop-filter: blur(10px);
                ">
                    <div style="
                        font-size: 14px;
                        color: #ffff00;
                        text-transform: uppercase;
                        letter-spacing: 2px;
                        margin-bottom: 8px;
                        opacity: 0.9;
                    ">FINAL SCORE</div>
                    <div id="final-score-display" style="
                        font-size: 42px;
                        color: #ffff00;
                        text-shadow: 
                            0 0 20px #ffff00,
                            0 0 40px #ffff00,
                            0 0 60px #ffff00,
                            2px 2px 6px #000;
                        font-weight: bold;
                        letter-spacing: 3px;
                        animation: scoreGlow 2s infinite;
                    "></div>
                </div>
                
                <!-- Leaderboard -->
                <div style="
                    margin-top: 15px;
                    padding: 15px;
                    background: linear-gradient(135deg, rgba(0, 136, 255, 0.2) 0%, rgba(0, 0, 0, 0.6) 100%);
                    border: 3px solid rgba(0, 136, 255, 0.6);
                    border-radius: 12px;
                    box-shadow: 
                        0 0 25px rgba(0, 136, 255, 0.4),
                        inset 0 0 15px rgba(0, 0, 0, 0.5);
                    backdrop-filter: blur(10px);
                    max-height: 200px;
                    overflow-y: auto;
                ">
                    <div style="
                        font-size: 20px;
                        color: #00ccff;
                        margin-bottom: 12px;
                        text-shadow: 
                            0 0 10px #00ccff,
                            0 0 20px #00ccff,
                            2px 2px 4px #000;
                        letter-spacing: 2px;
                        font-weight: bold;
                        text-align: center;
                        border-bottom: 2px solid rgba(0, 204, 255, 0.3);
                        padding-bottom: 8px;
                    ">
                        LEADERBOARD
                    </div>
                    <div id="leaderboard" style="
                        font-size: 14px;
                        color: #fff;
                        line-height: 1.8;
                        text-align: left;
                    "></div>
                </div>
                
                <!-- Restart Prompt -->
                <div style="
                    font-size: 18px;
                    color: #ff1493;
                    margin-top: 15px;
                    animation: blink 1.5s infinite;
                    text-shadow: 0 0 8px #ff1493;
                    letter-spacing: 1.5px;
                ">
                    Press R to Restart
                </div>
            </div>
        </div>
        
        <style>
            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            @keyframes pulse {
                0%, 100% { opacity: 1; transform: scale(1); }
                50% { opacity: 0.7; transform: scale(1.05); }
            }
            @keyframes blink {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.3; }
            }
            @keyframes scoreGlow {
                0%, 100% { 
                    text-shadow: 
                        0 0 30px #ffff00,
                        0 0 60px #ffff00,
                        0 0 90px #ffff00,
                        2px 2px 8px #000;
                    transform: scale(1);
                }
                50% { 
                    text-shadow: 
                        0 0 40px #ffff00,
                        0 0 80px #ffff00,
                        0 0 120px #ffff00,
                        2px 2px 8px #000;
                    transform: scale(1.03);
                }
            }
            @keyframes rankPulse {
                0%, 100% { 
                    transform: scale(1);
                    box-shadow: 
                        0 0 40px currentColor,
                        inset 0 0 30px rgba(0, 0, 0, 0.5);
                }
                50% { 
                    transform: scale(1.05);
                    box-shadow: 
                        0 0 60px currentColor,
                        inset 0 0 40px rgba(0, 0, 0, 0.5);
                }
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
            /* Settings toggle switch styles */
            #music-toggle-slider {
                transition: background-color 0.3s, border-color 0.3s;
            }
            #music-toggle-knob {
                transition: left 0.3s, background-color 0.3s, box-shadow 0.3s;
            }
        </style>
    `;
    
    document.body.appendChild(uiContainer);
    
    // Setup settings menu functionality
    setupSettingsMenu();
    
    // Setup start screen menu
    setupStartScreen();
    
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

/**
 * Setup settings menu functionality
 */
function setupSettingsMenu() {
    const settingsBtn = document.getElementById('settings-btn');
    const settingsMenu = document.getElementById('settings-menu');
    const settingsCloseBtn = document.getElementById('settings-close-btn');
    const musicToggle = document.getElementById('music-toggle');
    const musicToggleKnob = document.getElementById('music-toggle-knob');
    const musicToggleSlider = document.getElementById('music-toggle-slider');
    
    let isMenuOpen = false;
    
    // Open/close settings menu
    function toggleSettingsMenu() {
        isMenuOpen = !isMenuOpen;
        
        if (isMenuOpen) {
            settingsMenu.style.display = 'block';
            settingsMenu.style.pointerEvents = 'auto';
            requestAnimationFrame(() => {
                settingsMenu.style.opacity = '1';
                settingsMenu.style.transform = 'translateY(0) scale(1)';
            });
        } else {
            settingsMenu.style.opacity = '0';
            settingsMenu.style.transform = 'translateY(-10px) scale(0.95)';
            setTimeout(() => {
                settingsMenu.style.display = 'none';
                settingsMenu.style.pointerEvents = 'none';
            }, 300);
        }
    }
    
    // Toggle music on/off
    function toggleMusic(enabled) {
        // Import soundManager dynamically to avoid circular dependencies
        import('../systems/SoundManager.js').then(({ soundManager }) => {
            soundManager.setMusicEnabled(enabled);
        }).catch(err => {
            console.warn('Failed to toggle music:', err);
        });
    }
    
    // Change music track
    function changeMusicTrack(trackType) {
        console.log('🎵 Changing music track to:', trackType);
        // Import soundManager dynamically to avoid circular dependencies
        import('../systems/SoundManager.js').then(({ soundManager }) => {
            console.log('🎵 SoundManager loaded, musicEnabled:', soundManager.musicEnabled);
            console.log('🎵 Available themes:', {
                main: !!soundManager.mainTheme,
                boss: !!soundManager.bossTheme,
                alternative: !!soundManager.alternativeTheme
            });
            if (soundManager.musicEnabled) {
                soundManager.playMusic(trackType);
            } else {
                console.warn('⚠️ Music is disabled, enabling it first');
                soundManager.setMusicEnabled(true);
                soundManager.playMusic(trackType);
            }
        }).catch(err => {
            console.error('❌ Failed to change music track:', err);
        });
    }
    
    // Update toggle visual state
    function updateToggleVisual(enabled) {
        if (enabled) {
            musicToggleSlider.style.backgroundColor = 'rgba(0, 136, 255, 0.5)';
            musicToggleSlider.style.borderColor = 'rgba(0, 136, 255, 0.8)';
            musicToggleKnob.style.left = 'calc(100% - 23px)';
            musicToggleKnob.style.backgroundColor = '#0088ff';
            musicToggleKnob.style.boxShadow = '0 0 12px rgba(0, 136, 255, 0.8)';
        } else {
            musicToggleSlider.style.backgroundColor = 'rgba(153, 153, 153, 0.3)';
            musicToggleSlider.style.borderColor = 'rgba(153, 153, 153, 0.5)';
            musicToggleKnob.style.left = '3px';
            musicToggleKnob.style.backgroundColor = '#999999';
            musicToggleKnob.style.boxShadow = '0 0 8px rgba(153, 153, 153, 0.5)';
        }
    }
    
    // Event listeners
    if (settingsBtn) {
        settingsBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleSettingsMenu();
        });
    }
    
    if (settingsCloseBtn) {
        settingsCloseBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleSettingsMenu();
        });
    }
    
    if (musicToggle) {
        // Initialize toggle state (music enabled by default)
        musicToggle.checked = true;
        updateToggleVisual(true);
        
        musicToggle.addEventListener('change', (e) => {
            const enabled = e.target.checked;
            updateToggleVisual(enabled);
            toggleMusic(enabled);
        });
    }
    
    // Music selector dropdown
    const musicSelector = document.getElementById('music-selector');
    if (musicSelector) {
        // Function to update selector to match current music
        function updateMusicSelector() {
            import('../systems/SoundManager.js').then(({ soundManager }) => {
                const currentType = soundManager.getCurrentMusicType();
                musicSelector.value = currentType;
            }).catch(() => {
                // Default to main if can't load
                musicSelector.value = 'main';
            });
        }
        
        // Initialize with current music type
        updateMusicSelector();
        
        // Update selector periodically to sync with automatic scene changes
        setInterval(updateMusicSelector, 1000);
        
        musicSelector.addEventListener('change', (e) => {
            const trackType = e.target.value;
            changeMusicTrack(trackType);
        });
    }
    
    // Music volume slider
    const musicVolumeSlider = document.getElementById('music-volume-slider');
    const musicVolumeValue = document.getElementById('music-volume-value');
    if (musicVolumeSlider && musicVolumeValue) {
        // Initialize volume slider with current volume
        import('../systems/SoundManager.js').then(({ soundManager }) => {
            // Get current volume (default is 0.4 = 40%)
            const currentVolume = soundManager.mainTheme ? soundManager.mainTheme.volume : 0.4;
            const volumePercent = Math.round(currentVolume * 100);
            musicVolumeSlider.value = volumePercent;
            musicVolumeValue.textContent = volumePercent + '%';
        }).catch(() => {
            // Default to 40% if can't load
            musicVolumeSlider.value = 40;
            musicVolumeValue.textContent = '40%';
        });
        
        // Update volume when slider changes
        musicVolumeSlider.addEventListener('input', (e) => {
            const volumePercent = parseInt(e.target.value);
            const volume = volumePercent / 100; // Convert to 0.0-1.0 range
            
            // Update display
            musicVolumeValue.textContent = volumePercent + '%';
            
            // Update actual music volume
            import('../systems/SoundManager.js').then(({ soundManager }) => {
                soundManager.setMusicVolume(volume);
            }).catch(err => {
                console.warn('Failed to update music volume:', err);
            });
        });
    }
    
    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
        if (isMenuOpen && settingsMenu && !settingsMenu.contains(e.target) && 
            settingsBtn && !settingsBtn.contains(e.target)) {
            toggleSettingsMenu();
        }
    });
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
    const zombiesPerWave = currentScene ? currentScene.spawnPoints.length : 0;
    const maxWaves = zombieManager ? zombieManager.getMaxWaves() : 1;
    const totalZombies = zombiesPerWave * maxWaves; // Total zombies across all waves
    const zombies = zombieManager.getZombies();
    const aliveZombies = zombies.filter(z => !z.isDead).length;
    const deadZombies = zombies.filter(z => z.isDead).length;
    
    // Boss Health Bar (Grim Reaper)
    const bossHealthBar = document.getElementById('boss-health-bar');
    const bossHealthFill = document.getElementById('boss-health-fill');
    const bossHealthCurrent = document.getElementById('boss-health-current');
    const bossHealthMax = document.getElementById('boss-health-max');
    
    if (bossHealthBar && bossHealthFill && bossHealthCurrent && bossHealthMax) {
        // Find the reaper boss (alive)
        const reaper = zombies.find(z => z.type === 'reaper' && !z.isDead);
        
        if (reaper) {
            // Show boss health bar
            bossHealthBar.style.display = 'block';
            
            // Update health values
            const currentHealth = Math.max(0, reaper.health);
            const maxHealth = reaper.config.health || 3000;
            const healthPercent = (currentHealth / maxHealth) * 100;
            
            // Update fill bar
            bossHealthFill.style.width = `${healthPercent}%`;
            
            // Update text
            bossHealthCurrent.textContent = Math.ceil(currentHealth);
            bossHealthMax.textContent = maxHealth;
        } else {
            // Hide boss health bar if reaper is dead or doesn't exist
            bossHealthBar.style.display = 'none';
        }
    }
    
    // Calculate zombies killed: count dead zombies in array
    // Note: zombies stay in array until death animations finish, so this is accurate
    const zombiesKilled = deadZombies;
    
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
    const timeFormatted = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    
    const rank = calculateRank();
    
    // Calculate headshot percentage
    const headshotPercentage = gameData.totalZombiesKilled > 0
        ? Math.round((gameData.headshotKills / gameData.totalZombiesKilled) * 100)
        : 0;
    
    // Calculate average score per zombie
    const avgScorePerZombie = gameData.totalZombiesKilled > 0
        ? Math.round(gameData.score / gameData.totalZombiesKilled)
        : 0;
    
    // Calculate shots per kill
    const shotsPerKill = gameData.totalZombiesKilled > 0
        ? (gameData.shotsFired / gameData.totalZombiesKilled).toFixed(1)
        : '0.0';
    
    // Calculate additional stats
    const shotsHit = gameData.shotsHit || 0;
    const avgTimePerKill = gameData.totalZombiesKilled > 0
        ? (gameData.currentTime / gameData.totalZombiesKilled).toFixed(1)
        : '0.0';
    const bodyShots = gameData.totalZombiesKilled - gameData.headshotKills;
    const bodyShotPercentage = gameData.totalZombiesKilled > 0
        ? Math.round((bodyShots / gameData.totalZombiesKilled) * 100)
        : 0;
    
    // Create professional stat cards
    const statsHTML = `
        <div style="
            background: linear-gradient(135deg, rgba(0, 136, 255, 0.15) 0%, rgba(0, 0, 0, 0.4) 100%);
            border: 2px solid rgba(0, 136, 255, 0.4);
            border-radius: 10px;
            padding: 15px;
            box-shadow: 
                0 0 15px rgba(0, 136, 255, 0.3),
                inset 0 0 10px rgba(0, 0, 0, 0.5);
        ">
            <div style="
                font-size: 11px;
                color: #00ccff;
                text-transform: uppercase;
                letter-spacing: 1.5px;
                margin-bottom: 6px;
                opacity: 0.8;
            ">ZOMBIES ELIMINATED</div>
            <div style="
                font-size: 32px;
                color: #fff;
                font-weight: bold;
                text-shadow: 0 0 10px rgba(255, 255, 255, 0.5);
            ">${gameData.totalZombiesKilled}</div>
        </div>
        
        <div style="
            background: linear-gradient(135deg, rgba(255, 0, 0, 0.15) 0%, rgba(0, 0, 0, 0.4) 100%);
            border: 2px solid rgba(255, 0, 0, 0.4);
            border-radius: 8px;
            padding: 10px;
            box-shadow: 
                0 0 12px rgba(255, 0, 0, 0.3),
                inset 0 0 8px rgba(0, 0, 0, 0.5);
        ">
            <div style="
                font-size: 9px;
                color: #ff4444;
                text-transform: uppercase;
                letter-spacing: 1px;
                margin-bottom: 4px;
                opacity: 0.8;
            ">HEADSHOTS</div>
            <div style="
                font-size: 26px;
                color: #ff0000;
                font-weight: bold;
                text-shadow: 0 0 8px rgba(255, 0, 0, 0.5);
            ">${gameData.headshotKills}</div>
            <div style="
                font-size: 10px;
                color: #999;
                margin-top: 3px;
            ">${headshotPercentage}%</div>
        </div>
        
        <div style="
            background: linear-gradient(135deg, rgba(0, 255, 0, 0.15) 0%, rgba(0, 0, 0, 0.4) 100%);
            border: 2px solid rgba(0, 255, 0, 0.4);
            border-radius: 8px;
            padding: 10px;
            box-shadow: 
                0 0 12px rgba(0, 255, 0, 0.3),
                inset 0 0 8px rgba(0, 0, 0, 0.5);
        ">
            <div style="
                font-size: 9px;
                color: #00ff00;
                text-transform: uppercase;
                letter-spacing: 1px;
                margin-bottom: 4px;
                opacity: 0.8;
            ">ACCURACY</div>
            <div style="
                font-size: 26px;
                color: #00ff00;
                font-weight: bold;
                text-shadow: 0 0 8px rgba(0, 255, 0, 0.5);
            ">${accuracy}%</div>
            <div style="
                font-size: 10px;
                color: #999;
                margin-top: 3px;
            ">${shotsHit}/${gameData.shotsFired}</div>
        </div>
        
        <div style="
            background: linear-gradient(135deg, rgba(255, 170, 0, 0.15) 0%, rgba(0, 0, 0, 0.4) 100%);
            border: 2px solid rgba(255, 170, 0, 0.4);
            border-radius: 8px;
            padding: 10px;
            box-shadow: 
                0 0 12px rgba(255, 170, 0, 0.3),
                inset 0 0 8px rgba(0, 0, 0, 0.5);
        ">
            <div style="
                font-size: 9px;
                color: #ffaa00;
                text-transform: uppercase;
                letter-spacing: 1px;
                margin-bottom: 4px;
                opacity: 0.8;
            ">MAX COMBO</div>
            <div style="
                font-size: 26px;
                color: #ffaa00;
                font-weight: bold;
                text-shadow: 0 0 8px rgba(255, 170, 0, 0.5);
            ">x${gameData.maxCombo}</div>
            <div style="
                font-size: 10px;
                color: #999;
                margin-top: 3px;
            ">Streak</div>
        </div>
        
        <div style="
            background: linear-gradient(135deg, rgba(0, 204, 255, 0.15) 0%, rgba(0, 0, 0, 0.4) 100%);
            border: 2px solid rgba(0, 204, 255, 0.4);
            border-radius: 8px;
            padding: 10px;
            box-shadow: 
                0 0 12px rgba(0, 204, 255, 0.3),
                inset 0 0 8px rgba(0, 0, 0, 0.5);
        ">
            <div style="
                font-size: 9px;
                color: #00ccff;
                text-transform: uppercase;
                letter-spacing: 1px;
                margin-bottom: 4px;
                opacity: 0.8;
            ">TIME</div>
            <div style="
                font-size: 26px;
                color: #00ccff;
                font-weight: bold;
                text-shadow: 0 0 8px rgba(0, 204, 255, 0.5);
            ">${timeFormatted}</div>
            <div style="
                font-size: 10px;
                color: #999;
                margin-top: 3px;
            ">${avgTimePerKill}s/kill</div>
        </div>
        
        <div style="
            background: linear-gradient(135deg, rgba(153, 153, 153, 0.15) 0%, rgba(0, 0, 0, 0.4) 100%);
            border: 2px solid rgba(153, 153, 153, 0.4);
            border-radius: 8px;
            padding: 10px;
            box-shadow: 
                0 0 12px rgba(153, 153, 153, 0.3),
                inset 0 0 8px rgba(0, 0, 0, 0.5);
        ">
            <div style="
                font-size: 9px;
                color: #999;
                text-transform: uppercase;
                letter-spacing: 1px;
                margin-bottom: 4px;
                opacity: 0.8;
            ">SHOTS FIRED</div>
            <div style="
                font-size: 26px;
                color: #fff;
                font-weight: bold;
                text-shadow: 0 0 8px rgba(255, 255, 255, 0.3);
            ">${gameData.shotsFired.toLocaleString()}</div>
            <div style="
                font-size: 10px;
                color: #999;
                margin-top: 3px;
            ">${shotsPerKill}/kill</div>
        </div>
        
        <div style="
            background: linear-gradient(135deg, rgba(153, 153, 153, 0.15) 0%, rgba(0, 0, 0, 0.4) 100%);
            border: 2px solid rgba(153, 153, 153, 0.4);
            border-radius: 8px;
            padding: 10px;
            box-shadow: 
                0 0 12px rgba(153, 153, 153, 0.3),
                inset 0 0 8px rgba(0, 0, 0, 0.5);
        ">
            <div style="
                font-size: 9px;
                color: #999;
                text-transform: uppercase;
                letter-spacing: 1px;
                margin-bottom: 4px;
                opacity: 0.8;
            ">AVG SCORE/KILL</div>
            <div style="
                font-size: 26px;
                color: #fff;
                font-weight: bold;
                text-shadow: 0 0 8px rgba(255, 255, 255, 0.3);
            ">${avgScorePerZombie.toLocaleString()}</div>
            <div style="
                font-size: 10px;
                color: #999;
                margin-top: 3px;
            ">Per zombie</div>
        </div>
        
        <div style="
            background: linear-gradient(135deg, rgba(136, 0, 255, 0.15) 0%, rgba(0, 0, 0, 0.4) 100%);
            border: 2px solid rgba(136, 0, 255, 0.4);
            border-radius: 8px;
            padding: 10px;
            box-shadow: 
                0 0 12px rgba(136, 0, 255, 0.3),
                inset 0 0 8px rgba(0, 0, 0, 0.5);
        ">
            <div style="
                font-size: 9px;
                color: #8800ff;
                text-transform: uppercase;
                letter-spacing: 1px;
                margin-bottom: 4px;
                opacity: 0.8;
            ">BODY SHOTS</div>
            <div style="
                font-size: 26px;
                color: #aa44ff;
                font-weight: bold;
                text-shadow: 0 0 8px rgba(136, 0, 255, 0.5);
            ">${bodyShots}</div>
            <div style="
                font-size: 10px;
                color: #999;
                margin-top: 3px;
            ">${bodyShotPercentage}%</div>
        </div>
    `;
    
    if (gameData.currentState === GameState.GAME_OVER) {
        document.getElementById('game-over-stats').innerHTML = statsHTML;
        
        // Update final score display for game over
        const gameOverScoreEl = document.getElementById('game-over-score-display');
        if (gameOverScoreEl) {
            gameOverScoreEl.textContent = gameData.score.toLocaleString();
        }
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
        
        // Update final score display
        const finalScoreEl = document.getElementById('final-score-display');
        if (finalScoreEl) {
            finalScoreEl.textContent = gameData.score.toLocaleString();
        }
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
    if (scores.length === 0) {
        html = `
            <div style="
                text-align: center;
                color: #666;
                font-size: 14px;
                padding: 15px;
                font-style: italic;
            ">No scores recorded yet</div>
        `;
    } else {
        scores.forEach((entry, index) => {
            const rankColors = {
                'S': '#ffff00',
                'A': '#00ff00',
                'B': '#999999',
                'C': '#ffa500',
                'D': '#ff0000'
            };
            const rankColor = rankColors[entry.rank] || '#999';
            const isTopScore = index === 0;
            
            html += `
                <div style="
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 8px 12px;
                    margin-bottom: 6px;
                    background: ${isTopScore 
                        ? 'linear-gradient(135deg, rgba(255, 255, 0, 0.15) 0%, rgba(0, 0, 0, 0.4) 100%)' 
                        : 'rgba(0, 0, 0, 0.3)'};
                    border: 2px solid ${isTopScore ? 'rgba(255, 255, 0, 0.4)' : 'rgba(153, 153, 153, 0.3)'};
                    border-radius: 8px;
                    box-shadow: ${isTopScore ? '0 0 12px rgba(255, 255, 0, 0.2)' : 'none'};
                    transition: transform 0.2s;
                ">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <div style="
                            font-size: 16px;
                            font-weight: bold;
                            color: ${isTopScore ? '#ffff00' : '#999'};
                            min-width: 25px;
                        ">#${index + 1}</div>
                        <div>
                            <div style="
                                font-size: 16px;
                                font-weight: bold;
                                color: #fff;
                                margin-bottom: 2px;
                            ">${entry.score.toLocaleString()}</div>
                            <div style="
                                font-size: 10px;
                                color: #999;
                            ">${entry.date}</div>
                        </div>
                    </div>
                    <div style="display: flex; align-items: center; gap: 15px;">
                        <div style="text-align: right;">
                            <div style="
                                font-size: 10px;
                                color: #999;
                                margin-bottom: 2px;
                            ">Rank</div>
                            <div style="
                                font-size: 18px;
                                font-weight: bold;
                                color: ${rankColor};
                                text-shadow: 0 0 8px ${rankColor};
                            ">${entry.rank}</div>
                        </div>
                        <div style="text-align: right;">
                            <div style="
                                font-size: 10px;
                                color: #999;
                                margin-bottom: 2px;
                            ">Acc</div>
                            <div style="
                                font-size: 16px;
                                font-weight: bold;
                                color: #00ff00;
                            ">${entry.accuracy}%</div>
                        </div>
                        <div style="text-align: right;">
                            <div style="
                                font-size: 10px;
                                color: #999;
                                margin-bottom: 2px;
                            ">Kills</div>
                            <div style="
                                font-size: 16px;
                                font-weight: bold;
                                color: #fff;
                            ">${entry.kills || 0}</div>
                        </div>
                    </div>
                </div>
            `;
        });
    }
    
    document.getElementById('leaderboard').innerHTML = html;
}

/**
 * Setup start screen menu functionality
 */
function setupStartScreen() {
    const playButton = document.getElementById('play-button');
    const difficultySelector = document.getElementById('difficulty-selector');
    const difficultyButtons = document.querySelectorAll('.difficulty-button');
    const confirmButton = document.getElementById('confirm-button');
    const startScreen = document.getElementById('start-screen');
    
    // Set default difficulty to medium (which is pre-selected)
    gameData.difficulty = 'medium';
    
    // Handle difficulty selection
    difficultyButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Remove selected class from all buttons
            difficultyButtons.forEach(btn => btn.classList.remove('selected'));
            // Add selected class to clicked button
            button.classList.add('selected');
            // Update gameData difficulty
            const difficulty = button.getAttribute('data-difficulty');
            gameData.difficulty = difficulty;
            console.log(`🎮 Difficulty set to: ${difficulty}`);
            
            // Show confirm button when a difficulty is selected
            if (confirmButton) {
                confirmButton.classList.add('visible');
            }
        });
    });
    
    // Handle confirm button click - start the game
    if (confirmButton) {
        // Store isStarting flag on button element so it can be reset
        confirmButton.dataset.isStarting = 'false';
        
        confirmButton.addEventListener('click', () => {
            // Prevent multiple rapid clicks
            if (confirmButton.dataset.isStarting === 'true') {
                console.log('⏳ Game start already in progress, ignoring click');
                return;
            }
            
            // Check if game is already started
            if (gameData && gameData.gameStarted) {
                console.log('⚠️ Game already started, ignoring confirm button click');
                return;
            }
            
            confirmButton.dataset.isStarting = 'true';
            console.log('🎮 Confirm button clicked, starting game...');
            
            // Disable button to prevent multiple clicks
            confirmButton.style.pointerEvents = 'none';
            confirmButton.style.opacity = '0.5';
            
            // Hide start screen
            if (startScreen) {
                startScreen.classList.add('hidden');
                setTimeout(() => {
                    startScreen.style.display = 'none';
                    // Dispose of 3D start screen scene (handled by inline script)
                    if (window.disposeStartScreenScene) {
                        window.disposeStartScreenScene();
                    }
                    // Restore main game canvas visibility
                    const mainCanvas = document.querySelector('canvas:not(#start-screen-container canvas):not(#mini-map-canvas)');
                    if (mainCanvas) {
                        mainCanvas.style.opacity = '1';
                        mainCanvas.style.visibility = 'visible';
                        mainCanvas.style.zIndex = 'auto';
                        mainCanvas.style.pointerEvents = 'auto';
                        mainCanvas.classList.add('visible');
                    }
                }, 500);
            }
            
            // Trigger game start with a small delay to ensure UI updates
            setTimeout(() => {
                if (window.startGameFromMenu) {
                    window.startGameFromMenu();
                    // Reset flag after game starts (with delay to ensure it completes)
                    setTimeout(() => {
                        confirmButton.dataset.isStarting = 'false';
                    }, 1000);
                } else {
                    console.error('❌ startGameFromMenu function not available');
                    confirmButton.dataset.isStarting = 'false';
                    confirmButton.style.pointerEvents = 'auto';
                    confirmButton.style.opacity = '1';
                }
            }, 50);
        });
    }
    
    // Handle play button click - show difficulty selector
    if (playButton) {
        playButton.addEventListener('click', () => {
            // Hide play button and show difficulty selector
            playButton.style.display = 'none';
            if (difficultySelector) {
                difficultySelector.classList.add('visible');
                // Show confirm button since medium is pre-selected
                if (confirmButton) {
                    confirmButton.classList.add('visible');
                }
            }
        });
    }
}

/**
 * Show all game UI elements
 */
export function showGameUI() {
    const hudLeft = document.getElementById('hud-left');
    const powerupIndicators = document.getElementById('powerup-indicators');
    const ammoDisplay = document.getElementById('ammo-display');
    const healthHearts = document.getElementById('health-hearts');
    const settingsBtn = document.getElementById('settings-btn');
    
    if (hudLeft) hudLeft.style.display = 'block';
    if (powerupIndicators) powerupIndicators.style.display = 'block';
    if (ammoDisplay) ammoDisplay.style.display = 'block';
    if (healthHearts) healthHearts.style.display = 'flex';
    if (settingsBtn) settingsBtn.style.display = 'block';
}


