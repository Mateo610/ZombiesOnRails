/**
 * Scene Transition Manager
 * Handles all scene transitions including fade-to-black, rail movement, and direct jumps
 */

import * as THREE from 'three';
import { GameState, gameData } from '../core/GameState.js';
import { CAMERA_SCENES } from '../core/SceneConfig.js';

export class SceneTransitionManager {
    constructor({
        camera,
        sceneLoader,
        threeRenderer,
        zombieManager,
        powerUpManager,
        railMovementManager,
        sceneCameraManager,
        mouseLookManager,
        crosshairManager,
        soundManager,
        updateUI,
        showSceneTitle,
        setupWarehouseVisibility,
        loadWarehouseInterior,
        spawnSceneZombies,
        enableFreeLookAfterRailMovement
    }) {
        this.camera = camera;
        this.sceneLoader = sceneLoader;
        this.threeRenderer = threeRenderer;
        this.zombieManager = zombieManager;
        this.powerUpManager = powerUpManager;
        this.railMovementManager = railMovementManager;
        this.sceneCameraManager = sceneCameraManager;
        this.mouseLookManager = mouseLookManager;
        this.crosshairManager = crosshairManager;
        this.soundManager = soundManager;
        this.updateUI = updateUI;
        this.showSceneTitle = showSceneTitle;
        this.setupWarehouseVisibility = setupWarehouseVisibility;
        this.loadWarehouseInterior = loadWarehouseInterior;
        this.spawnSceneZombies = spawnSceneZombies;
        this.enableFreeLookAfterRailMovement = enableFreeLookAfterRailMovement;
        
        this.currentCameraScene = CAMERA_SCENES[0];
        this.warehouseLoaded = false;
        this._isRailMovementActive = false;
        this._wasRailMovementActive = false;
        this._transitionResetCallback = null; // Callback to reset transition flag
    }
    
    /**
     * Set callback to reset transition flag when scene setup completes
     */
    setTransitionResetCallback(callback) {
        this._transitionResetCallback = callback;
    }
    
    /**
     * Set current camera scene
     */
    setCurrentCameraScene(scene) {
        this.currentCameraScene = scene;
    }
    
    /**
     * Get current camera scene
     */
    getCurrentCameraScene() {
        return this.currentCameraScene;
    }
    
    /**
     * Set warehouse loaded flag
     */
    setWarehouseLoaded(loaded) {
        this.warehouseLoaded = loaded;
    }
    
    /**
     * Get warehouse loaded flag
     */
    isWarehouseLoaded() {
        return this.warehouseLoaded;
    }
    
    /**
     * Set rail movement active flag
     */
    setRailMovementActive(active) {
        this._isRailMovementActive = active;
    }
    
    /**
     * Get rail movement active flag
     */
    isRailMovementActive() {
        return this._isRailMovementActive;
    }
    
    /**
     * Set was rail movement active flag
     */
    setWasRailMovementActive(active) {
        this._wasRailMovementActive = active;
    }
    
    /**
     * Get was rail movement active flag
     */
    wasRailMovementActive() {
        return this._wasRailMovementActive;
    }
    
    /**
     * Fade to black and jump to interior scene
     */
    fadeToBlackAndJumpToInterior() {
        const fadeOverlay = document.getElementById('fade-transition');
        if (!fadeOverlay) {
            console.error('❌ Fade transition overlay not found!');
            return;
        }
        
        // Quick fade in black overlay
        fadeOverlay.style.transition = 'opacity 0.3s ease-in-out';
        fadeOverlay.classList.add('active');
        
        // Wait for fade in, then load warehouse and jump to Scene 7
        setTimeout(() => {
            // Load warehouse if needed
            if (!this.warehouseLoaded || !this.sceneLoader.warehouseModel) {
                this.loadWarehouseInterior(() => {
                    this.setupWarehouseVisibility();
                    this.jumpToInteriorScene();
                });
            } else {
                // Warehouse already loaded, just setup visibility
                this.setupWarehouseVisibility();
                this.jumpToInteriorScene();
            }
        }, 300); // Wait for fade in to complete
    }
    
    /**
     * Jump directly to Scene 7 (Warehouse Interior) without rail movement
     */
    jumpToInteriorScene() {
        // Stop any existing rail movement
        this.stopRailMovement();
        
        // Set to Scene 7 (Warehouse Interior)
        const SCENE_INDICES = {
            WAREHOUSE_INTERIOR: 6
        };
        
        gameData.currentScene = SCENE_INDICES.WAREHOUSE_INTERIOR;
        this.currentCameraScene = CAMERA_SCENES[SCENE_INDICES.WAREHOUSE_INTERIOR];
        
        // Set camera directly to interior position (no rail movement, no interpolation)
        this.camera.position.set(
            this.currentCameraScene.position.x,
            this.currentCameraScene.position.y,
            this.currentCameraScene.position.z
        );
        
        // Set camera look-at direction
        const lookAtPos = new THREE.Vector3(
            this.currentCameraScene.lookAt.x,
            this.currentCameraScene.lookAt.y,
            this.currentCameraScene.lookAt.z
        );
        this.camera.lookAt(lookAtPos);
        this.camera.updateMatrixWorld();
        this.camera.updateProjectionMatrix();
        
        // Clear zombies and power-ups (no spawning for interior scenes)
        this.zombieManager.clearZombies();
        this.powerUpManager.clear();
        
        // Update UI and show scene title
        this.updateUI();
        this.showSceneTitle();
        
        // Set game state back to gameplay
        gameData.currentState = GameState.GAMEPLAY;
        
        // Enable crosshair and center it
        if (this.crosshairManager) {
            this.crosshairManager.enable();
            this.crosshairManager.center(); // Reset crosshair to center at start of scene
            if (this.crosshairManager.crosshairElement) {
                this.crosshairManager.crosshairElement.style.display = 'block';
            }
        }
        
        // Enable free look after everything is set up
        this.sceneCameraManager.setSceneCamera(this.currentCameraScene);
        
        // Fade back in quickly
        const fadeOverlay = document.getElementById('fade-transition');
        if (fadeOverlay) {
            setTimeout(() => {
                fadeOverlay.classList.remove('active');
            }, 50);
        }
    }
    
    /**
     * Stop rail movement
     */
    stopRailMovement() {
        this._isRailMovementActive = false;
        this._wasRailMovementActive = false;
        if (this.railMovementManager) {
            this.railMovementManager.stop();
        }
    }
    
    /**
     * Start rail movement (called by button or manually)
     * Handles special case for Scene 6 -> Scene 7 transition
     */
    startRailMovement(SCENE_INDICES) {
        // At Scene 6, use fade-to-black transition instead of rail movement
        if (gameData.currentScene === SCENE_INDICES.FRONT_OF_DOOR_PIVOT) {
            this.onSceneCleared(SCENE_INDICES); // Triggers fade-to-black and jump to interior
            return;
        }
        
        // Set global flag before starting movement
        this._isRailMovementActive = true;
        this._wasRailMovementActive = true;
        
        // Disable free look during rail movement
        this.sceneCameraManager.disableFreeLook();
        
        // Start rail movement
        this.railMovementManager.moveToNextPath();
    }
    
    /**
     * Handle scene cleared event
     */
    onSceneCleared(SCENE_INDICES) {
        console.log(`🎯 onSceneCleared called for Scene ${gameData.currentScene + 1}`);
        
        // For Front of Door Pivot (Scene 6), fade to black and jump directly to interior
        if (gameData.currentScene === SCENE_INDICES.FRONT_OF_DOOR_PIVOT) {
            console.log('🎬 Scene 6 cleared - using fade-to-black transition to interior');
            this.stopRailMovement();
            gameData.currentState = GameState.SCENE_TRANSITION;
            this.fadeToBlackAndJumpToInterior();
            return 'interior_jump';
        }
        
        // Check if this is the last scene
        if (gameData.currentScene >= CAMERA_SCENES.length - 1) {
            console.log('🎉 Last scene cleared - mission complete!');
            // Return signal to complete mission (handled by caller)
            return 'complete';
        }
        
        // For all other scenes, use rail movement to transition automatically
        console.log(`🚂 Automatically advancing to next scene using rail movement...`);
        this.advanceToNextSceneWithRail(SCENE_INDICES);
        return 'transition';
    }
    
    /**
     * Advance to next scene using rail movement
     */
    advanceToNextSceneWithRail(SCENE_INDICES) {
        // Check if there's a next scene available
        if (gameData.currentScene >= CAMERA_SCENES.length - 1) {
            console.log('⚠️ No next scene available');
            return;
        }
        
        // Get the next scene
        const nextSceneIndex = gameData.currentScene + 1;
        
        // Skip rail movement for transition from Scene 6 to Scene 7 (uses fade-to-black instead)
        if (gameData.currentScene === SCENE_INDICES.FRONT_OF_DOOR_PIVOT && 
            nextSceneIndex === SCENE_INDICES.WAREHOUSE_INTERIOR) {
            console.log('⚠️ Skipping rail movement for Scene 6->7 transition (uses fade-to-black)');
            return;
        }
        
        // Set transition state
        gameData.currentState = GameState.SCENE_TRANSITION;
        console.log(`🎥 Advancing from Scene ${gameData.currentScene + 1} to Scene ${nextSceneIndex + 1} using rail movement...`);
        
        const nextScene = CAMERA_SCENES[nextSceneIndex];
        
        if (!nextScene) {
            console.error('❌ Next scene not found at index:', nextSceneIndex);
            gameData.currentState = GameState.GAMEPLAY;
            return;
        }
        
        console.log(`📍 Next scene: ${nextScene.name} (index ${nextSceneIndex})`);
        
        // Clear zombies and power-ups before transition
        this.zombieManager.clearZombies();
        this.powerUpManager.clear();
        
        // Show/hide appropriate scene models based on next scene
        if (nextSceneIndex >= SCENE_INDICES.INTERIOR_START) {
            // Ensure warehouse is loaded
            if (!this.warehouseLoaded || !this.sceneLoader.warehouseModel) {
                console.log('⚠️ Warehouse not loaded yet, loading now...');
                this.loadWarehouseInterior(() => {
                    this.setupWarehouseVisibility();
                    console.log('✅ Warehouse loaded, starting rail movement...');
                    this.startRailMovementToScene(nextSceneIndex);
                });
            } else {
                this.setupWarehouseVisibility();
                console.log('✅ Warehouse already loaded, starting rail movement...');
                this.startRailMovementToScene(nextSceneIndex);
            }
        } else {
            // Exterior scene - ensure factory is visible
            if (this.sceneLoader.currentSceneModel) {
                this.sceneLoader.currentSceneModel.visible = true;
            }
            if (this.sceneLoader.warehouseModel) {
                this.sceneLoader.warehouseModel.visible = false;
            }
            console.log('✅ Exterior scene setup complete, starting rail movement...');
            this.startRailMovementToScene(nextSceneIndex);
        }
    }
    
    /**
     * Start rail movement to a specific scene
     */
    startRailMovementToScene(nextSceneIndex) {
        console.log(`🚂 Starting rail movement to Scene ${nextSceneIndex + 1}...`);
        
        // Validate rail movement manager
        if (!this.railMovementManager) {
            console.error('❌ RailMovementManager not available!');
            gameData.currentState = GameState.GAMEPLAY;
            return;
        }
        
        // Disable free look during rail movement
        if (this.sceneCameraManager) {
            this.sceneCameraManager.disableFreeLook();
        }
        
        // Start rail movement
        console.log('🎬 Calling railMovementManager.moveToNextPath()...');
        const movementStarted = this.railMovementManager.moveToNextPath();
        
        // Only set flags if movement actually started
        if (movementStarted) {
            this._isRailMovementActive = true;
            this._wasRailMovementActive = true;
            console.log('✅ Rail movement started successfully');
        } else {
            console.error('❌ Rail movement failed to start - check console for details');
            // Reset state back to gameplay if movement failed
            gameData.currentState = GameState.GAMEPLAY;
            // Reset transition flag so user can try again
            if (this._transitionResetCallback) {
                this._transitionResetCallback();
            }
        }
    }
    
    /**
     * Setup path completion callback for rail movement
     */
    setupPathCompleteCallback(SCENE_INDICES) {
        this.railMovementManager.setPathCompleteCallback((sceneIndex, sceneConfig) => {
            // Get scene config from CAMERA_SCENES if not provided
            const scene = sceneConfig || CAMERA_SCENES[sceneIndex];
            if (!scene) {
                console.error(`❌ Scene config not found for index ${sceneIndex}`);
                return;
            }
            
            console.log(`🎬 Rail path completed - Scene ${sceneIndex + 1}: ${scene.name}`);
            
            // Update current scene
            gameData.currentScene = sceneIndex;
            this.currentCameraScene = scene;
            
            // Ensure warehouse is visible ONLY for interior scenes
            if (sceneIndex >= SCENE_INDICES.INTERIOR_START) {
                if (this.sceneLoader.warehouseModel) {
                    this.sceneLoader.warehouseModel.visible = true;
                    if (!this.threeRenderer.scene.children.includes(this.sceneLoader.warehouseModel)) {
                        console.log('⚠️ Warehouse model not in scene, adding...');
                        this.threeRenderer.scene.add(this.sceneLoader.warehouseModel);
                    }
                    this.sceneLoader.warehouseModel.traverse((child) => {
                        child.visible = true;
                    });
                    console.log(`✅ Warehouse model visible: ${this.sceneLoader.warehouseModel.visible}`);
                    
                    // Ensure factory exterior is hidden
                    if (this.sceneLoader.currentSceneModel) {
                        this.sceneLoader.currentSceneModel.visible = false;
                        console.log(`✅ Factory exterior hidden: ${!this.sceneLoader.currentSceneModel.visible}`);
                    }
                } else {
                    console.error(`❌ Warehouse model is null at interior scene (index ${sceneIndex})! Attempting emergency load...`);
                    this.warehouseLoaded = false;
                    this.loadWarehouseInterior(() => {
                        if (this.sceneLoader.warehouseModel) {
                            this.sceneLoader.warehouseModel.visible = true;
                            this.sceneLoader.warehouseModel.traverse((child) => {
                                child.visible = true;
                            });
                            if (this.sceneLoader.currentSceneModel) {
                                this.sceneLoader.currentSceneModel.visible = false;
                            }
                            console.log('✅ Emergency warehouse load successful');
                        } else {
                            console.error('❌ Emergency warehouse load failed!');
                        }
                    });
                }
            } else {
                // Exterior scenes - ensure factory is visible and warehouse is hidden
                if (this.sceneLoader.currentSceneModel) {
                    this.sceneLoader.currentSceneModel.visible = true;
                }
                if (this.sceneLoader.warehouseModel) {
                    this.sceneLoader.warehouseModel.visible = false;
                }
            }
            
            // Clear existing zombies and power-ups
            this.zombieManager.clearZombies();
            this.powerUpManager.clear();
            
            // Spawn zombies for the new scene
            this.spawnSceneZombies();
            this.powerUpManager.spawnScenePowerUps(gameData.currentScene);
            this.showSceneTitle();
            
            // Set state back to gameplay
            gameData.currentState = GameState.GAMEPLAY;
            if (!gameData.gameStarted) {
                gameData.gameStarted = true;
            }
            
            // Enable crosshair
            if (this.crosshairManager) {
                this.crosshairManager.enable();
                if (this.crosshairManager.crosshairElement) {
                    this.crosshairManager.crosshairElement.style.display = 'block';
                }
            }
            
            // CRITICAL: Clear rail movement flags immediately
            this._isRailMovementActive = false;
            this._wasRailMovementActive = false;
            if (this.railMovementManager) {
                this.railMovementManager.stop();
            }
            
            console.log(`✅ Scene ${sceneIndex + 1} setup complete - zombies spawned, ready for next transition`);
            
            // Reset transition flag now that scene setup is complete
            if (this._transitionResetCallback) {
                this._transitionResetCallback();
            }
            
            // Switch to boss music if entering final interior scene (Scene 8)
            if (sceneIndex === SCENE_INDICES.WAREHOUSE_INTERIOR_FINAL && this.soundManager) {
                try {
                    if (this.soundManager.musicEnabled) {
                        const currentType = this.soundManager.getCurrentMusicType();
                        if (currentType !== 'boss') {
                            console.log('🎵 Switching to boss music for final location');
                            this.soundManager.playBossMusic();
                        }
                    }
                } catch (err) {
                    console.warn('⚠️ Error switching to boss music:', err);
                }
            }
            
            // Enable free look after scene setup completes
            if (sceneIndex >= SCENE_INDICES.INTERIOR_START) {
                if (this.sceneCameraManager) {
                    this.sceneCameraManager.setInitialDirection(this.currentCameraScene);
                } else if (this.mouseLookManager) {
                    this.mouseLookManager.updateRotationFromCamera();
                    this.mouseLookManager.unlock();
                    this.mouseLookManager.enable();
                }
            } else {
                // Use requestAnimationFrame to ensure this happens after camera is fully positioned
                requestAnimationFrame(this.enableFreeLookAfterRailMovement);
            }
        });
    }
}

