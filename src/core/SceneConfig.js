import * as THREE from 'three';

/**
 * Scene Configuration
 * Defines camera positions, look-at points, and spawn points for each scene
 */

export const CAMERA_SCENES = [
    {
        name: "1",
        position: { x: 16.44, y: 1, z: -1.37 },
        lookAt: { x: 8.71, y: 1, z: 3.17 },
        transitionDuration: 3000, // Optional: duration in ms for rail movement transition
        spawnPoints: [
            { x: 6.75, y: 0.00, z: 10.49, type: 'runner' },
            { x: 6.75, y: 0.00, z: 11.49, type: 'walker' },
            { x: 6.75, y: 0.00, z: 12.49, type: 'walker' }
        ]
    },
    {
        name: "2",
        position: { x: 11.96, y: 1, z: -2.74 },
        lookAt: { x: 11.85, y: 1, z: -7.08 },
        transitionDuration: 3000, // Optional: duration in ms for rail movement transition
        spawnPoints: [
            { x: 11.85, y: 0, z: -7.08, type: 'walker' }
        ]
    },
    {
        name: "3",
        position: { x: 2.54, y: 1, z: 3.49 }, // Fixed: y was 1, changed to 1.6 to match player height
        lookAt: { x: 0.64, y: 1.5, z: 6.74 },
        transitionDuration: 3000, // Optional: duration in ms for rail movement transition
        spawnPoints: [
            { x: 3.00, y: 0, z: 6.61, type: 'walker' },
            { x: 0.72, y: 0, z: 6.82, type: 'walker' },
            { x: -0.95, y: 0, z: 6.91, type: 'walker' },
            { x: -2.39, y: 0, z: 6.46, type: 'walker' }
        ]
    },
    {
        name: "Turn Around",
        position: { x: 2.54, y: 1, z: 3.49 }, // Turn around location
        lookAt: { x: 2.26, y: 1.0, z: -5.23 }, // Rotated 270 degrees to the right (another 90 degrees from 180)
        transitionDuration: 1000,
        spawnPoints: [
            // TODO: Add spawn points for turn around scene
        ]
    },
    {
        name: "Mid Street",
        position: { x: -6.18, y: 1.01, z: 3.77 },
        lookAt: { x: -6.18, y: 1.00, z: 3.88 },
        transitionDuration: 3000,
        spawnPoints: [
            // Zombie spawn point - path to player to be determined
            { x: -0.38, y: 0.00, z: 14.45, type: 'walker' }
        ]
    },
    {
        name: "Front of Door Pivot",
        position: { x: -7.79, y: 0.99, z: 6.17 },
        lookAt: { x: -7.88, y: 0.99, z: 6.14 },
        transitionDuration: 3000,
        spawnPoints: [
            // Final exterior location before interior - look at pivot (minimal movement)
            // No zombies - this is transition point to interior
        ]
    },
    {
        name: "Warehouse Interior",
        position: { x: 0.95, y: 0.28, z: 1.02 },
        lookAt: { x: -3.41, y: 1.10, z: -7.94 },
        transitionDuration: 3000, // Optional: duration in ms for rail movement transition
        spawnPoints: [
            // No zombies for now
        ]
    },
    {
        name: "Warehouse Interior - Final",
        position: { x: 0.13, y: 0.29, z: 0.22 },
        lookAt: { x: -9.40, y: 0.43, z: -2.82 },
        transitionDuration: 3000, // Optional: duration in ms for rail movement transition
        spawnPoints: [
            // Final boss wave - multiple zombies from different directions
            { x: -5.0, y: 0.0, z: -3.0, type: 'runner' },
            { x: -7.0, y: 0.0, z: -2.0, type: 'runner' },
            { x: -6.0, y: 0.0, z: -5.0, type: 'walker' },
            { x: -8.0, y: 0.0, z: -4.0, type: 'walker' },
            { x: -4.0, y: 0.0, z: -4.0, type: 'walker' },
            { x: -9.0, y: 0.0, z: -3.0, type: 'runner' }
        ]
    }
];

// Fixed positions per scene for spawning power-ups
export const POWERUP_SPAWN_POSITIONS = [
    // Scene 0 - Warehouse Exterior
    [
        new THREE.Vector3(-2, 1, -6),
        new THREE.Vector3(2, 1, -8)
    ],
    // Scene 1 - Warehouse Interior
    [
        new THREE.Vector3(-12, 1, -6),
        new THREE.Vector3(-14, 1, -9)
    ]
];

// Fixed positions per scene for spawning ammo pickups
// Format: { x, y, z, weaponType: 'pistol' | 'shotgun' | 'rifle' }
export const AMMO_PICKUP_SPAWN_POSITIONS = [
    // Scene 0 - Warehouse Exterior (Scene 1)
    [
        { x: 8.0, y: 1.0, z: 4.0, weaponType: 'pistol' },
        { x: 10.0, y: 1.0, z: 2.0, weaponType: 'shotgun' }
    ],
    // Scene 1 - Scene 2
    [
        { x: 12.0, y: 1.0, z: -5.0, weaponType: 'rifle' }
    ],
    // Scene 2 - Scene 3
    [
        { x: 1.0, y: 1.0, z: 7.0, weaponType: 'pistol' },
        { x: -1.0, y: 1.0, z: 7.0, weaponType: 'shotgun' }
    ],
    // Scene 3 - Turn Around
    [],
    // Scene 4 - Mid Street
    [
        { x: -4.0, y: 1.0, z: 8.0, weaponType: 'rifle' }
    ],
    // Scene 5 - Front of Door Pivot
    [],
    // Scene 6 - Warehouse Interior
    [
        { x: -2.0, y: 0.5, z: -5.0, weaponType: 'pistol' },
        { x: -4.0, y: 0.5, z: -6.0, weaponType: 'shotgun' }
    ],
    // Scene 7 - Warehouse Interior Final
    [
        { x: -6.0, y: 0.5, z: -3.0, weaponType: 'rifle' },
        { x: -7.0, y: 0.5, z: -4.0, weaponType: 'pistol' }
    ]
];
