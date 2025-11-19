/**
 * Rail Path Configuration
 * Defines camera paths with waypoints, timing, and enemy spawn points
 * 
 * Y coordinates normalized to y: 1.00 for ground level (except catwalk at y: 8.01)
 */

export const RAIL_PATHS = [
    {
        id: 'path_1',
        name: 'Spawn to First Position',
        waypoints: [
            // Skipped the 0.30 unit movement - going directly to meaningful position
            { x: 12.02, y: 1.00, z: 0.96 }
        ],
        duration: 6000,
        lookAt: { x: 1.17, y: 1.00, z: 6.70 }, // Courtyard
        enemySpawns: []
    },
    {
        id: 'path_2',
        name: 'First to Second Position',
        waypoints: [
            { x: 2.44, y: 1.00, z: 0.58 }
        ],
        duration: 6000,
        lookAt: { x: -7.70, y: 2.49, z: -1.03 }, // Across from courtyard
        enemySpawns: []
    },
    {
        id: 'path_3',
        name: 'Second to Third Position',
        waypoints: [
            { x: -3.33, y: 1.00, z: -0.09 }
        ],
        duration: 5000,
        lookAt: { x: -1.54, y: 1.00, z: 13.93 }, // Behind white building
        enemySpawns: []
    },
    {
        id: 'path_4',
        name: 'Third to Fourth Position',
        waypoints: [
            { x: -5.12, y: 1.00, z: 2.60 }
        ],
        duration: 4000,
        lookAt: { x: -8.80, y: 1.00, z: 13.18 }, // Door to warehouse interior
        enemySpawns: []
    },
    {
        id: 'path_5',
        name: 'Fourth to Fifth Position',
        waypoints: [
            { x: -6.96, y: 1.00, z: 8.28 }
        ],
        duration: 5000,
        lookAt: { x: 7.12, y: 4.26, z: 1.25 }, // Catwalk (balcony in front of spawn)
        enemySpawns: []
    },
    {
        id: 'path_6',
        name: 'Fifth to Sixth Position (Catwalk)',
        waypoints: [
            { x: -7.24, y: 8.01, z: 11.62 } // Catwalk level - keep original Y
        ],
        duration: 6000,
        lookAt: { x: -8.80, y: 1.00, z: 13.18 }, // Door to warehouse interior
        enemySpawns: []
    },
    {
        id: 'path_7',
        name: 'Sixth to Final Position',
        waypoints: [
            { x: -9.07, y: 1.00, z: 13.31 }
        ],
        duration: 4000,
        lookAt: { x: -8.80, y: 1.00, z: 13.18 }, // Door to warehouse interior (lock position)
        enemySpawns: []
    }
];

/**
 * Get path by ID
 * @param {string} pathId
 * @returns {Object|null}
 */
export function getPathById(pathId) {
    return RAIL_PATHS.find(path => path.id === pathId) || null;
}

/**
 * Get all paths in order
 * @returns {Array}
 */
export function getAllPaths() {
    return RAIL_PATHS;
}
