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
totalScenes: 17, // 14 exterior scenes (0-13) + 1 travel scene (14) + 2 interior scenes (15-16)
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

// Ammo - stored per weapon to prevent sharing ammo between weapons
weaponAmmo: {
pistol: { current: 11, max: 11, reserve: 22 },
shotgun: { current: 6, max: 6, reserve: 12 },
rifle: { current: 24, max: 24, reserve: 48 }
},
// Legacy ammo properties (for backward compatibility, will be synced with weaponAmmo)
currentAmmo: 11,
maxAmmo: 11,
reserveAmmo: 22, // 2 clips for pistol
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
bestTime: 0,

// Difficulty setting
difficulty: 'medium', // 'easy', 'medium', 'hard'

// Development mode
godMode: false // Press 'G' to toggle god mode (no damage)
};

