import * as THREE from 'three';

/**
* Scene Configuration
* Defines camera positions, look-at points, and spawn points for each scene
* 
* Based on rail-test3.html waypoints:
* - 14 total scenes (0-13)
* - Shooting scenes: 0, 1, 2, 4, 5, 7, 8, 9, 12 (waypoints 1, 2, 3, 5, 6, 8, 9, 10, 13)
* - Travel scenes: 3, 6, 10, 11, 13 (waypoints 4, 7, 11, 12, 14)
*/

export const CAMERA_SCENES = [
// Scene 0 (Waypoint 1) - SHOOTING SCENE
    {
        name: "Scene 0 - Intro",
        position: { x: 12.38, y: 1.11, z: 0.16 },
        lookAt: { x: 9.98, y: 1.29, z: -8.92 },
        type: "shooting",
        transitionDuration: 3000,
        // Spawn points from old Scene 2 (waypoint 1 shooting scene)
        spawnPoints: [
            { x: 11.4, y: 0, z: -7.08, type: 'walker' }
        ]
    },
    // Scene 1 (Waypoint 2) - SHOOTING SCENE
    {
        name: "Scene 1 - Second Encounter",
        position: { x: 9.66, y: 1.11, z: 1.38 },
        lookAt: { x: 10.78, y: 1.40, z: 11.31 },
        type: "shooting",
        transitionDuration: 3000,
        spawnPoints: [
            { x: 10.93, y: 0, z: 8.03, type: 'walker' },
            { x: 12.5, y: 0, z: 9.5, type: 'runner' },
            { x: 9.2, y: 0, z: 9.8, type: 'crawler' },
            { x: 11.3, y: 0, z: 10.5, type: 'walker' },
        ]
    },
    // Scene 2 (Waypoint 3) - TRAVEL SCENE
    {
        name: "Scene 2 - Travel",
        position: { x: 9.66, y: 1.11, z: 1.38 }, // Duplicate position for pause effect
        lookAt: { x: 0.12, y: 1.05, z: 4.41 },
        type: "travel",
        transitionDuration: 2000,
        spawnPoints: [] // No zombies in travel scenes
    },
    // Scene 3 (Waypoint 4) - TRAVEL SCENE
    {
        name: "Scene 3 - Travel",
        position: { x: 5.91, y: 1.11, z: 2.52 },
        lookAt: { x: -4.06, y: 0.99, z: 3.37 },
        type: "travel",
        transitionDuration: 2000,
        spawnPoints: [] // No zombies in travel scenes
    },
    // Scene 4 (Waypoint 5) - SHOOTING SCENE
    {
        name: "Scene 4 - Third Encounter",
        position: { x: 3.75, y: 1.11, z: 2.71 },
        lookAt: { x: -2.22, y: 0.87, z: 10.73 },
        type: "shooting",
        transitionDuration: 3000,
        // Spawn points from old Scene 3 (waypoint 5 shooting scene)
        spawnPoints: [
            { x: 2.5, y: 0, z: 6.61, type: 'walker' },
            { x: 0.72, y: 0, z: 6.82, type: 'walker' },
            { x: -0.95, y: 0, z: 6.91, type: 'walker' },
            { x: -2.39, y: 0, z: 6.46, type: 'walker' }
        ]
    },
    // Scene 5 (Waypoint 6) - SHOOTING SCENE
    {
        name: "Scene 5 - Extended Encounter",
        position: { x: 3.75, y: 1.11, z: 2.71 }, // Duplicate of WP5 for extended pause
        lookAt: { x: -5.35, y: 1.46, z: -30.90 },
        type: "shooting",
        transitionDuration: 3000,
        spawnPoints: [
            { x: 1.01, y: 0, z: -1.92, type: 'crawler' },
            { x: -0.5, y: 0, z: -2.8, type: 'crawler' },
        ]
    },
    // Scene 6 (Waypoint 7) - TRAVEL SCENE
    {
        name: "Scene 6 - Travel",
        position: { x: 3.75, y: 1.11, z: 2.71 }, // Duplicate of WP5/WP6 for pause
        lookAt: { x: -7.40, y: 1.70, z: -0.86 },
        type: "travel",
        transitionDuration: 2000,
        spawnPoints: [] // No zombies in travel scenes
    },
    // Scene 7 (Waypoint 8) - TRAVEL SCENE
    {
        name: "Scene 7 - Travel",
        position: { x: -0.65, y: 1.11, z: 0.71 },
        lookAt: { x: -7.40, y: 1.70, z: -0.86 },
        type: "travel",
        transitionDuration: 2000,
        spawnPoints: [] // No zombies in travel scenes
    },
    // Scene 8 (Waypoint 9) - SHOOTING SCENE
    {
        name: "Scene 8 - Fifth Encounter",
        position: { x: -3.01, y: 1.11, z: 0.20 },
        lookAt: { x: -7.40, y: 1.70, z: -0.86 },
        type: "shooting",
        transitionDuration: 3000,
        spawnPoints: [
            { x: -8.81, y: 0, z: -1.20, type: 'walker' },
            { x: -9.5, y: 0, z: -0.3, type: 'runner' },
            { x: -7.8, y: 0, z: -1.8, type: 'crawler' },
        ]
    },
    // Scene 9 (Waypoint 10) - SHOOTING SCENE
    {
        name: "Scene 9 - Sixth Encounter",
        position: { x: -4.18, y: 1.11, z: 1.92 },
        lookAt: { x: -7.63, y: 1.35, z: 8.58 },
        type: "shooting",
        transitionDuration: 3000,
        spawnPoints: [
            { x: -7.2, y: 0, z: 7.5, type: 'walker' },
            { x: -8.1, y: 0, z: 8.8, type: 'runner' },
            { x: -7.9, y: 0, z: 6.8, type: 'walker' },
            { x: -6.5, y: 0, z: 8.5, type: 'runner' },
            { x: -7.0, y: 0, z: 8.0, type: 'walker' }
        ]
    },
    // Scene 10 (Waypoint 11) - TRAVEL SCENE
    {
        name: "Scene 10 - Travel",
        position: { x: -4.18, y: 1.11, z: 1.92 }, // Duplicate of WP10 for pause
        lookAt: { x: -14.66, y: 1.35, z: 11.19 },
        type: "travel",
        transitionDuration: 2000,
        spawnPoints: [] // No zombies in travel scenes
    },
    // Scene 11 (Waypoint 12) - TRAVEL SCENE
    {
        name: "Scene 11 - Travel",
        position: { x: -7.16, y: 1.11, z: 4.58 },
        lookAt: { x: -12.76, y: 1.31, z: 9.65 },
        type: "travel",
        transitionDuration: 2000,
        spawnPoints: [] // No zombies in travel scenes
    },
    // Scene 12 (Waypoint 13) - LOCK SCENE (no zombies, just lock)
    {
        name: "Scene 12 - Lock Scene",
        position: { x: -7.16, y: 1.11, z: 4.58 }, // Duplicate of WP12 for pause
        lookAt: { x: -5.78, y: 1.11, z: 9.64 },
        type: "shooting", // Keep as shooting for free aim, but no zombie spawns
        transitionDuration: 3000,
        spawnPoints: [] // No zombies - just the lock
    },
    // Scene 13 (Waypoint 14) - SHOOTING SCENE (zombie after lock is shot)
    {
        name: "Scene 13 - Post-Lock Encounter",
        position: { x: -7.16, y: 1.11, z: 4.58 }, // Same position as Scene 12
        lookAt: { x: -5.78, y: 1.11, z: 9.64 },
        type: "shooting",
        transitionDuration: 3000,
        spawnPoints: [
            { x: -3.95, y: 0, z: 14.45, type: 'walker' },
            { x: -4.8, y: 0, z: 13.2, type: 'runner' },
            { x: -2.8, y: 0, z: 14.8, type: 'runner' },
        ]
    },
    // Scene 14 (Waypoint 15) - TRAVEL SCENE (back to last lookAt before interior)
    {
        name: "Scene 14 - Travel to Interior",
        position: { x: -7.16, y: 1.11, z: 4.58 }, // Same position
        lookAt: { x: -9.47, y: 1.29, z: 6.22 }, // Look at lock coordinates (last lookAt)
        type: "travel",
        transitionDuration: 2000,
        spawnPoints: [] // No zombies in travel scenes
    },
    // Scene 15 (Warehouse Interior) - Using partner's coordinates
    {
        name: "Warehouse Interior",
        position: { x: 0.95, y: 0.28, z: 1.02 },
        lookAt: { x: -3.41, y: 1.10, z: -7.94 },
        type: "shooting", // Shooting scene (even though no zombies, allows transition to Scene 16)
        transitionDuration: 3000,
        spawnPoints: [
        // No zombies for now (partner left this empty)
        ]
    },
    // Scene 16 (Warehouse Interior - Final) - Using partner's coordinates and boss fight
    {
        name: "Warehouse Interior - Final",
        position: { x: 0.13, y: 0.29, z: 0.22 },
        lookAt: { x: -9.40, y: 0.43, z: -2.82 },
        type: "shooting", // Shooting scene with boss fight
        transitionDuration: 3000,
        zombieScaleMultiplier: 0.25,
        spawnPoints: [
        // Wave 1 - multiple zombies from different directions (moved to the left)
            { x: -4.0, y: 0.0, z: -1.5, type: 'runner' },
            { x: -4.5, y: 0.0, z: -1.0, type: 'runner' },
            { x: -4.2, y: 0.0, z: -2.0, type: 'walker' },
            { x: -5.5, y: 0.0, z: -1.8, type: 'walker' },
            { x: -3.5, y: 0.0, z: -1.8, type: 'walker' },
            { x: -5.0, y: 0.0, z: -1.5, type: 'runner' }
        ],
        // Wave 2 - Grim Reaper boss (spawns after wave 1 is cleared)
        wave2SpawnPoints: [
            { x: -3.0, y: 0.0, z: -1.0, type: 'reaper' }
        ]
    }
];

// Fixed positions per scene for spawning power-ups
// Only shooting scenes have power-ups (scenes 0, 1, 4, 5, 7, 9, 12)
export const POWERUP_SPAWN_POSITIONS = [
// Scene 0 (WP1) - Shooting Scene - Intro
// Using old Scene 0 spawn points
    [
        new THREE.Vector3(-2, 1, -6),
        new THREE.Vector3(2, 1, -8)
    ],
    // Scene 1 (WP2) - Shooting Scene - Second Encounter
    [
    // TODO: Configure power-up spawn points
    ],
    // Scene 2 (WP3) - Travel Scene - No power-ups
    [],
    // Scene 3 (WP4) - Travel Scene - No power-ups
    [],
    // Scene 4 (WP5) - Shooting Scene - Third Encounter
    // Using old Scene 2 spawn points
    [
        new THREE.Vector3(-12, 1, -6),
        new THREE.Vector3(-14, 1, -9)
    ],
    // Scene 5 (WP6) - Shooting Scene - Extended Encounter
    [
    // TODO: Configure power-up spawn points
    ],
    // Scene 6 (WP7) - Travel Scene - No power-ups
    [],
    // Scene 7 (WP8) - Shooting Scene - Fifth Encounter
    [
    // TODO: Configure power-up spawn points
    ],
    // Scene 8 (WP9) - Travel Scene - No power-ups
    [],
    // Scene 9 (WP10) - Shooting Scene - Sixth Encounter
    [
    // TODO: Configure power-up spawn points
    ],
    // Scene 10 (WP11) - Travel Scene - No power-ups
    [],
    // Scene 11 (WP12) - Travel Scene - No power-ups
    [],
    // Scene 12 (WP13) - Lock Scene - No power-ups (just lock)
    [],
    // Scene 13 (WP14) - Shooting Scene - Post-Lock Encounter
    [
    // TODO: Configure power-up spawn points
    ],
    // Scene 14 (WP15) - Travel Scene - No power-ups
    [],
    // Scene 15 - Warehouse Interior (using partner's power-up positions)
    [
        new THREE.Vector3(-2, 1, -6),
        new THREE.Vector3(-4, 1, -8)
    ],
    // Scene 16 - Warehouse Interior Final (using partner's power-up positions)
    [
        new THREE.Vector3(-12, 1, -6),
        new THREE.Vector3(-14, 1, -9)
    ]
];

// Fixed positions per scene for spawning ammo pickups
// Format: { x, y, z, weaponType: 'pistol' | 'shotgun' | 'rifle' }
// Only shooting scenes have ammo pickups (scenes 0, 1, 4, 5, 7, 9, 12)
export const AMMO_PICKUP_SPAWN_POSITIONS = [
    // Scene 0 (WP1) - Shooting Scene - Intro
    // Using old Scene 0 ammo spawn points
    [
        { x: 9.0, y: 1.0, z: 3.0, weaponType: 'rifle' }
    ],
    // Scene 1 (WP2) - Shooting Scene - Second Encounter
    [
        { x: 10.5, y: 1.0, z: 6.8, weaponType: 'pistol' }
    ],
    // Scene 2 (WP3) - Travel Scene - No ammo pickups
    [],
    // Scene 3 (WP4) - Travel Scene - No ammo pickups
    [],
    // Scene 4 (WP5) - Shooting Scene - Third Encounter
    // Using old Scene 2 ammo spawn points
    [
        { x: 0.0, y: 1.0, z: 7.0, weaponType: 'shotgun' }
    ],
    // Scene 5 (WP6) - Shooting Scene - Extended Encounter
    [
        { x: 1.8, y: 1.0, z: -1.8, weaponType: 'pistol' }
    ],
    // Scene 6 (WP7) - Travel Scene - No ammo pickups
    [],
    // Scene 8 (WP9) - Shooting Scene - Fifth Encounter
    [
        { x: -5.3, y: 1.0, z: -0.7, weaponType: 'rifle' }
    ],
    // Scene 8 (WP9) - Travel Scene - No ammo pickups
    [],
    // Scene 9 (WP10) - Shooting Scene - Sixth Encounter
    [
        { x: -6.0, y: 1.0, z: 7.9, weaponType: 'shotgun' }
    ],
    // Scene 10 (WP11) - Travel Scene - No ammo pickups
    [],
    // Scene 11 (WP12) - Travel Scene - No ammo pickups
    [],
    // Scene 12 (WP13) - Lock Scene - No ammo pickups (just lock)
    [],
    // Scene 13 (WP14) - Shooting Scene - Post-Lock Encounter
    [
        { x: -6.5, y: 1.0, z: 11.5, weaponType: 'shotgun' }
    ],
    // Scene 14 (WP15) - Travel Scene - No ammo pickups
    [],
    // Scene 15 - Warehouse Interior (using partner's ammo positions)
    [
        { x: -3.0, y: 0.5, z: -5.5, weaponType: 'shotgun' }
    ],
    // Scene 16 - Warehouse Interior Final (using partner's ammo positions)
    [
        { x: -6.5, y: 0.5, z: -3.5, weaponType: 'rifle' }
    ]
];
