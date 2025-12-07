/**
 * Zombie Sound Configuration
 * Maps zombie types and animations to their corresponding sound files
 */

export const ZOMBIE_SOUND_MAP = {
    walker: {
        attack: '/sounds/zombies/walker_attack.wav',
        move: {
            walk: '/sounds/zombies/zombie_step.wav' // Generic step, no walker_steps.wav available
        },
        groan: '/sounds/zombies/walker_groan.wav'
    },
    runner: {
        attack: '/sounds/zombies/runner_attack.wav',
        move: {
            run: '/sounds/zombies/runner_steps.wav'
        },
        groan: '/sounds/zombies/walker_groan.wav' // Fallback, no runner_groan.wav
    },
    crawler: {
        attack: '/sounds/zombies/crawler_attack.wav',
        move: {
            walk: '/sounds/zombies/crawler_steps.wav',
            'Armature|run': '/sounds/zombies/crawler_steps.wav' // Crawler uses Armature|run animation
        },
        groan: null // Crawler does not groan
    },
    tank: {
        attack: '/sounds/zombies/walker_attack.wav', // Uses walker model
        move: {
            walk: '/sounds/zombies/zombie_step.wav'
        },
        groan: '/sounds/zombies/walker_groan.wav'
    },
    reaper: {
        attack: '/sounds/zombies/reaper_attack.wav',
        move: {
            'Armature|run': '/sounds/zombies/runner_steps.wav'
        },
        groan: '/sounds/zombies/reaper_groan.wav'
    }
};

