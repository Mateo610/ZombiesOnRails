/**
 * GameState Enum and GameData
 * Centralized game state management
 */
export const GameState = {
    LOADING: 'LOADING',
    INTRO: 'INTRO',
    GAMEPLAY: 'GAMEPLAY',
    SCENE_TRANSITION: 'SCENE_TRANSITION',
    GAME_OVER: 'GAME_OVER',
    MISSION_COMPLETE: 'MISSION_COMPLETE'
};

/**
 * Game Data - Centralized game state object
 */
export const gameData = {
    currentState: GameState.LOADING,
    currentScene: 0,
    totalScenes: 2, // Warehouse Exterior and Interior
    gameStarted: false,
    
    // Player stats
    health: 100,
    maxHealth: 100,
    
    // Combat stats
    totalZombiesKilled: 0,
    shotsFired: 0,
    shotsHit: 0,
    headshotKills: 0,
    
    // Combo system
    currentCombo: 0,
    maxCombo: 0,
    comboTimer: 0,
    comboDecayTime: 3, // seconds
    
    // Score
    score: 0,
    
    // Ammo
    currentAmmo: 12,
    maxAmmo: 12,
    reserveAmmo: 60,
    isReloading: false,
    reloadTime: 2000,
    
    // Power-ups
    doubleDamageActive: false,
    doubleDamageTimer: 0,
    slowMoActive: false,
    slowMoTimer: 0,
    
    // Time
    startTime: 0,
    currentTime: 0,
    
    // Leaderboard (localStorage)
    bestScore: 0,
    bestAccuracy: 0,
    bestTime: 0
};

