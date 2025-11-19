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
        spawnPoints: [
            { x: 6.75, y: 0.00, z: 10.49, type: 'walker' },
            { x: 6.75, y: 0.00, z: 11.49, type: 'walker' },
            { x: 6.75, y: 0.00, z: 12.49, type: 'walker' }
        ]
    },
    {
        name: "2",
        position: { x: 11.96, y: 1, z: -2.74 },
        lookAt: { x: 11.85, y: 1, z: -7.08 },
        spawnPoints: [
            { x: 11.85, y: 0, z: -7.08, type: 'walker' }
        ]
    },
    {
        name: "3",
        position: { x: 2.54, y: 1, z: 3.49 },
        lookAt: { x: 0.64, y: 1, z: 6.74 },
        spawnPoints: [
            { x: 3.00, y: 0, z: 6.61, type: 'walker' },
            { x: 0.72, y: 0, z: 6.82, type: 'walker' },
            { x: -0.95, y: 0, z: 6.91, type: 'walker' },
            { x: -2.39, y: 0, z: 6.46, type: 'walker' }
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
