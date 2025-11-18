import * as THREE from 'three';

/**
 * Scene Configuration
 * Defines camera positions, look-at points, and spawn points for each scene
 */

export const CAMERA_SCENES = [
    {
        name: "Warehouse Exterior",
        position: { x: 16.44, y: 1, z: -1.37 },
        lookAt: { x: 0, y: 1, z: -3 },
        spawnPoints: [
            { x: -3, y: 0, z: -5, type: 'walker' },
            { x: -1, y: 0, z: -7, type: 'runner' },
            { x: -2, y: 0, z: -6, type: 'crawler' },
            { x: 0, y: 0, z: -10, type: 'walker' },
            { x: 2, y: 0, z: -6, type: 'runner' },
            { x: 4, y: 0, z: -8, type: 'tank' },
            { x: 1, y: 0, z: -4, type: 'crawler' }
        ]
    },
    {
        name: "Warehouse Interior",
        position: { x: 0, y: 1.6, z: 0 },
        lookAt: { x: 0, y: 1.5, z: -10 },
        spawnPoints: [
            { x: -2, y: 0, z: -8, type: 'runner' },
            { x: 2, y: 0, z: -12, type: 'walker' },
            { x: 0, y: 0, z: -15, type: 'tank' },
            { x: -3, y: 0, z: -10, type: 'crawler' },
            { x: 3, y: 0, z: -8, type: 'runner' },
            { x: -1, y: 0, z: -14, type: 'walker' },
            { x: 1, y: 0, z: -16, type: 'tank' }
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
