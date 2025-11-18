/**
 * SoundManager
 * Handles loading and playing weapon sounds
 */

class SoundManager {
    constructor() {
        this.sounds = {};
        this.loadSounds();
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
}

// Export singleton instance
export const soundManager = new SoundManager();

