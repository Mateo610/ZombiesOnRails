/**
 * SoundManager
 * Handles loading and playing weapon sounds and background music
 */

class SoundManager {
    constructor() {
        this.sounds = {};
        this.mainTheme = null;
        this.bossTheme = null;
        this.alternativeTheme = null; // The 115 KSHERWOODOPS track
        this.currentMusic = null;
        this.currentMusicType = 'main'; // 'main', 'boss', or 'alternative'
        this.isMusicPlaying = false;
        this.musicEnabled = true;
        this.loadSounds();
        this.loadMusic();
    }

    /**
     * Load all weapon sounds
     */
    loadSounds() {
        const weapons = ['pistol', 'shotgun', 'ak47']; // ak47 is used for rifle
        
        weapons.forEach(weapon => {
            this.sounds[weapon] = {
                shot: new Audio(`/sounds/${weapon}/${weapon}_shot.wav`),
                reload: new Audio(`/sounds/${weapon}/${weapon}_reload.wav`)
            };
            
            // Preload sounds
            this.sounds[weapon].shot.preload = 'auto';
            this.sounds[weapon].reload.preload = 'auto';
            
            // Set volume
            this.sounds[weapon].shot.volume = 0.7;
            this.sounds[weapon].reload.volume = 0.7;
        });
    }

    /**
     * Play shot sound for a weapon
     * Creates a new Audio instance to allow overlapping sounds
     * @param {string} weaponId - 'pistol', 'shotgun', or 'rifle'
     */
    playShot(weaponId) {
        // Map rifle to ak47
        const soundKey = weaponId === 'rifle' ? 'ak47' : weaponId;
        
        if (!this.sounds[soundKey] || !this.sounds[soundKey].shot) {
            console.warn(`Shot sound not found for weapon: ${weaponId}`);
            return;
        }

        // Create a new Audio instance to allow overlapping sounds
        const audio = new Audio(this.sounds[soundKey].shot.src);
        audio.volume = this.sounds[soundKey].shot.volume;
        audio.play().catch(err => {
            console.warn('Failed to play shot sound:', err);
        });
    }

    /**
     * Play reload sound for a weapon
     * @param {string} weaponId - 'pistol', 'shotgun', or 'rifle'
     */
    playReload(weaponId) {
        // Map rifle to ak47
        const soundKey = weaponId === 'rifle' ? 'ak47' : weaponId;
        
        if (!this.sounds[soundKey] || !this.sounds[soundKey].reload) {
            console.warn(`Reload sound not found for weapon: ${weaponId}`);
            return;
        }

        // Reset and play reload sound
        const audio = this.sounds[soundKey].reload;
        audio.currentTime = 0;
        audio.play().catch(err => {
            console.warn('Failed to play reload sound:', err);
        });
    }

    /**
     * Load background music tracks
     */
    loadMusic() {
        try {
            // Load main theme (plays throughout the game)
            this.mainTheme = new Audio('/sounds/music/boss fight/main theme/The House of the Dead OST - Chapter 1_ Tragedy - Arcade Ver. (Actual Hardware) [9QPdinsbpjU].mp3');
            this.mainTheme.preload = 'auto';
            this.mainTheme.loop = true;
            this.mainTheme.volume = 0.4;
            
            // Load boss fight theme (plays at final location)
            this.bossTheme = new Audio('/sounds/music/boss fight/The House of the Dead OST - Boss Theme - Arcade Ver. (Actual Hardware).mp3');
            this.bossTheme.preload = 'auto';
            this.bossTheme.loop = true;
            this.bossTheme.volume = 0.4;
            
            // Load alternative theme (115 KSHERWOODOPS track)
            this.alternativeTheme = new Audio('/sounds/music/115/115  [OFFICIAL] - KSHERWOODOPS - INSTRUMENTAL - (Kino Der Toten Song).mp3');
            this.alternativeTheme.preload = 'auto';
            this.alternativeTheme.loop = true;
            this.alternativeTheme.volume = 0.4;
            
            // Add error handling for alternative theme
            this.alternativeTheme.addEventListener('error', (e) => {
                console.error('❌ Failed to load alternative theme:', e);
            });
            this.alternativeTheme.addEventListener('canplaythrough', () => {
                console.log('✅ Alternative theme (KSHERWOODOPS) loaded successfully');
            });
            
            // Set current music to main theme by default
            this.currentMusic = this.mainTheme;
            this.currentMusicType = 'main';
            
            console.log('✅ Background music tracks loaded');
        } catch (error) {
            console.warn('⚠️ Failed to load background music:', error);
        }
    }

    /**
     * Play background music
     * @param {string} type - 'main' or 'boss' (defaults to current type)
     */
    playMusic(type = null) {
        if (!this.musicEnabled) {
            return; // Music is disabled
        }

        const musicType = type || this.currentMusicType;
        
        // Stop current music if playing
        if (this.isMusicPlaying && this.currentMusic) {
            this.currentMusic.pause();
            this.currentMusic.currentTime = 0;
        }

        // Switch to requested music type
        if (musicType === 'boss' && this.bossTheme) {
            this.currentMusic = this.bossTheme;
            this.currentMusicType = 'boss';
        } else if (musicType === 'alternative' && this.alternativeTheme) {
            this.currentMusic = this.alternativeTheme;
            this.currentMusicType = 'alternative';
        } else if (musicType === 'main' && this.mainTheme) {
            this.currentMusic = this.mainTheme;
            this.currentMusicType = 'main';
        } else {
            console.warn(`⚠️ Music type "${musicType}" not found or not loaded`);
            return;
        }

        if (!this.currentMusic) {
            console.warn(`⚠️ Music not loaded for type: ${musicType}`);
            console.warn('Available themes:', {
                main: !!this.mainTheme,
                boss: !!this.bossTheme,
                alternative: !!this.alternativeTheme
            });
            return;
        }

        this.currentMusic.play().then(() => {
            this.isMusicPlaying = true;
            const musicName = musicType === 'boss' ? 'Boss' : musicType === 'alternative' ? 'Alternative (KSHERWOODOPS)' : 'Main';
            console.log(`🎵 ${musicName} theme music started`);
        }).catch(err => {
            console.warn('⚠️ Failed to play music (may require user interaction):', err);
            // Music will start on first user interaction
        });
    }

    /**
     * Stop background music
     */
    stopMusic() {
        if (this.currentMusic && this.isMusicPlaying) {
            this.currentMusic.pause();
            this.currentMusic.currentTime = 0;
            this.isMusicPlaying = false;
            console.log('🔇 Background music stopped');
        }
    }

    /**
     * Enable or disable music
     * @param {boolean} enabled - Whether music should be enabled
     */
    setMusicEnabled(enabled) {
        this.musicEnabled = enabled;
        if (enabled) {
            this.playMusic();
        } else {
            this.stopMusic();
        }
    }

    /**
     * Switch to boss fight music
     */
    playBossMusic() {
        this.playMusic('boss');
    }

    /**
     * Switch to main theme music
     */
    playMainMusic() {
        this.playMusic('main');
    }

    /**
     * Switch to alternative theme music
     */
    playAlternativeMusic() {
        this.playMusic('alternative');
    }

    /**
     * Set music volume
     * @param {number} volume - Volume between 0.0 and 1.0
     */
    setMusicVolume(volume) {
        const vol = Math.max(0, Math.min(1, volume));
        if (this.mainTheme) {
            this.mainTheme.volume = vol;
        }
        if (this.bossTheme) {
            this.bossTheme.volume = vol;
        }
        if (this.alternativeTheme) {
            this.alternativeTheme.volume = vol;
        }
    }

    /**
     * Get current music type
     * @returns {string} 'main' or 'boss'
     */
    getCurrentMusicType() {
        return this.currentMusicType;
    }
}

// Export singleton instance
export const soundManager = new SoundManager();

