/**
 * Weapon Configuration
 * Centralized configuration for weapon models, positions, and rotations
 */

export const WEAPON_PATHS = {
    pistol: '/models/guns/pistol1.glb',
    shotgun: '/models/guns/shotgun.glb',
    rifle: '/models/guns/ak-47.glb'
};

/**
 * Weapon screen-relative positions
 * Values are in camera-local space:
 *   X: left (-) to right (+)
 *   Y: down (-) to up (+)
 *   Z: closer (-) to farther (+)
 */
export const WEAPON_POSITIONS = {
    pistol: {
        x: 0.25,   // ADJUST: Move left (-) or right (+)
        y: -0.2,  // ADJUST: Move down (-) or up (+)
        z: 0.4    // ADJUST: Move closer (-) or farther (+)
    },
    shotgun: {
        x: 0.15,   // ADJUST: Move left (-) or right (+)
        y: -0.25,  // ADJUST: Move down (-) or up (+)
        z: 0.25    // ADJUST: Move closer (-) or farther (+)
    },
    rifle: {
        x: 0.05,   // ADJUST: Move left (-) or right (+)
        y: -0.1,  // ADJUST: Move down (-) or up (+)
        z: -0.75  // ADJUST: Move closer (-) or farther (+)
    }
};

/**
 * Weapon rotation configurations
 * Rotation order: (X=pitch/roll, Y=yaw, Z=roll/pitch)
 * After Y rotation, X becomes roll axis
 */
export const WEAPON_ROTATIONS = {
    pistol: {
        x: 0,
        y: Math.PI / 2,  // 90 degrees on Y axis
        z: 0
    },
    shotgun: {
        x: -0.15,        // Roll: negative = show left side
        y: Math.PI / 2,  // Yaw: straight forward
        z: -0.05         // Pitch: slight downward angle
    },
    rifle: {
        x: 0,
        y: Math.PI / 2,  // Same as pistol - barrel points forward
        z: 0
    }
};

/**
 * Weapon scaling configuration
 */
export const WEAPON_SCALE_CONFIG = {
    targetSize: 0.4,  // Target size in units for first-person view
    minDimension: 0.3,
    maxDimension: 2.0
};

