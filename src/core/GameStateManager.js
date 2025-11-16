// src/core/GameStateManager.js

/**
 * Game State Machine
 * Manages transitions between different game states
 */

export const GameState = {
    LOADING: 'LOADING',
    INTRO_CUTSCENE: 'INTRO_CUTSCENE',
    GAMEPLAY: 'GAMEPLAY',
    OUTRO_CUTSCENE: 'OUTRO_CUTSCENE',
    MISSION_COMPLETE: 'MISSION_COMPLETE',
    PAUSED: 'PAUSED'
};

export class GameStateManager {
    constructor() {
        this.currentState = GameState.LOADING;
        this.previousState = null;
        
        // Game data
        this.gameData = {
            totalZombies: 10,
            zombiesKilled: 0,
            shotsFired: 0,
            shotsHit: 0,
            gameStartTime: 0,
            gameEndTime: 0,
            score: 0
        };
        
        // State callbacks
        this.stateCallbacks = {
            onEnter: new Map(),
            onExit: new Map(),
            onUpdate: new Map()
        };
        
        console.log('🎮 GameStateManager initialized');
    }
    
    /**
     * Register callback for state enter
     */
    onStateEnter(state, callback) {
        this.stateCallbacks.onEnter.set(state, callback);
    }
    
    /**
     * Register callback for state exit
     */
    onStateExit(state, callback) {
        this.stateCallbacks.onExit.set(state, callback);
    }
    
    /**
     * Register callback for state update
     */
    onStateUpdate(state, callback) {
        this.stateCallbacks.onUpdate.set(state, callback);
    }
    
    /**
     * Transition to new state
     */
    setState(newState) {
        if (this.currentState === newState) {
            console.warn(`⚠️ Already in state: ${newState}`);
            return;
        }
        
        console.log(`🔄 State transition: ${this.currentState} → ${newState}`);
        
        // Exit current state
        this.exitState(this.currentState);
        
        // Store previous state
        this.previousState = this.currentState;
        
        // Change state
        this.currentState = newState;
        
        // Enter new state
        this.enterState(newState);
    }
    
    /**
     * Enter state logic
     */
    enterState(state) {
        console.log(`▶️ Entering state: ${state}`);
        
        switch(state) {
            case GameState.LOADING:
                // Asset loading happens here
                break;
                
            case GameState.INTRO_CUTSCENE:
                // Start intro cutscene
                break;
                
            case GameState.GAMEPLAY:
                // Start gameplay
                this.gameData.gameStartTime = Date.now();
                this.gameData.zombiesKilled = 0;
                this.gameData.shotsFired = 0;
                this.gameData.shotsHit = 0;
                this.gameData.score = 0;
                break;
                
            case GameState.OUTRO_CUTSCENE:
                // Start outro cutscene
                break;
                
            case GameState.MISSION_COMPLETE:
                // Show results
                this.gameData.gameEndTime = Date.now();
                this.calculateFinalScore();
                break;
                
            case GameState.PAUSED:
                // Pause game
                break;
        }
        
        // Call registered callback
        const callback = this.stateCallbacks.onEnter.get(state);
        if (callback) callback();
    }
    
    /**
     * Exit state logic
     */
    exitState(state) {
        console.log(`⏸️ Exiting state: ${state}`);
        
        // Call registered callback
        const callback = this.stateCallbacks.onExit.get(state);
        if (callback) callback();
    }
    
    /**
     * Update current state
     */
    update(deltaTime) {
        // Call update callback for current state
        const callback = this.stateCallbacks.onUpdate.get(this.currentState);
        if (callback) callback(deltaTime);
    }
    
    /**
     * Get current state
     */
    getState() {
        return this.currentState;
    }
    
    /**
     * Check if in specific state
     */
    isState(state) {
        return this.currentState === state;
    }
    
    /**
     * Record shot fired
     */
    recordShot(hit = false) {
        if (!this.isState(GameState.GAMEPLAY)) return;
        
        this.gameData.shotsFired++;
        if (hit) {
            this.gameData.shotsHit++;
        }
    }
    
    /**
     * Record zombie killed
     */
    recordZombieKill() {
        if (!this.isState(GameState.GAMEPLAY)) return;
        
        this.gameData.zombiesKilled++;
        this.gameData.score += 100; // Base points per zombie
        
        console.log(`💀 Zombie killed: ${this.gameData.zombiesKilled}/${this.gameData.totalZombies}`);
        
        // Check if wave complete
        if (this.gameData.zombiesKilled >= this.gameData.totalZombies) {
            console.log('🎉 All zombies eliminated!');
            this.setState(GameState.OUTRO_CUTSCENE);
        }
    }
    
    /**
     * Get accuracy percentage
     */
    getAccuracy() {
        if (this.gameData.shotsFired === 0) return 0;
        return Math.round((this.gameData.shotsHit / this.gameData.shotsFired) * 100);
    }
    
    /**
     * Get game duration in seconds
     */
    getGameDuration() {
        const duration = this.gameData.gameEndTime - this.gameData.gameStartTime;
        return Math.round(duration / 1000);
    }
    
    /**
     * Calculate final score
     */
    calculateFinalScore() {
        let finalScore = this.gameData.score;
        
        // Accuracy bonus
        const accuracy = this.getAccuracy();
        if (accuracy >= 80) finalScore += 500;
        else if (accuracy >= 60) finalScore += 300;
        else if (accuracy >= 40) finalScore += 100;
        
        // Time bonus (faster = better)
        const duration = this.getGameDuration();
        if (duration < 60) finalScore += 500;
        else if (duration < 90) finalScore += 300;
        else if (duration < 120) finalScore += 100;
        
        this.gameData.score = finalScore;
        
        console.log('📊 Final Score:', finalScore);
        console.log('  Zombies Killed:', this.gameData.zombiesKilled);
        console.log('  Accuracy:', accuracy + '%');
        console.log('  Time:', duration + 's');
        
        return finalScore;
    }
    
    /**
     * Get rank based on score
     */
    getRank() {
        const score = this.gameData.score;
        if (score >= 2000) return 'S';
        if (score >= 1500) return 'A';
        if (score >= 1000) return 'B';
        if (score >= 500) return 'C';
        return 'D';
    }
    
    /**
     * Reset game data for new game
     */
    reset() {
        this.gameData = {
            totalZombies: 10,
            zombiesKilled: 0,
            shotsFired: 0,
            shotsHit: 0,
            gameStartTime: 0,
            gameEndTime: 0,
            score: 0
        };
        console.log('🔄 Game data reset');
    }
    
    /**
     * Pause game
     */
    pause() {
        if (this.currentState === GameState.GAMEPLAY) {
            this.setState(GameState.PAUSED);
        }
    }
    
    /**
     * Resume game
     */
    resume() {
        if (this.currentState === GameState.PAUSED) {
            this.setState(this.previousState);
        }
    }
}