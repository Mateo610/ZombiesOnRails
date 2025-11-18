import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

/**
 * Three.js Renderer Setup
 * Manages scene, renderer, camera, lighting, and controls
 */
export class Renderer {
    constructor() {
        // Scene setup
        this.scene = new THREE.Scene();
        this.scene.fog = new THREE.Fog(0x1a1a2e, 10, 50);
        
        // Renderer setup
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.2;
        document.body.appendChild(this.renderer.domElement);
        
        // Camera setup
        this.BASE_FOV = 75;
        this.camera = new THREE.PerspectiveCamera(
            this.BASE_FOV,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );
        // Set camera to initial position immediately to prevent glitch
        this.camera.position.set(0, 1.6, 5);
        this.camera.lookAt(0, 1.5, 0);
        
        // Clock
        this.clock = new THREE.Clock();
        
        // Lighting setup
        this.setupLighting();
        
        // Controls - Enabled by default for debugging
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.minDistance = 1;
        this.controls.maxDistance = 100;
        this.controls.maxPolarAngle = Math.PI; // Allow full rotation
        this.controls.enablePan = true;
        this.isFreeCamera = true; // Start with free camera enabled
        this.controls.enabled = this.isFreeCamera;
        
        // Scene objects
        this.ground = null;
        this.axesHelper = new THREE.AxesHelper(5);
        this.axesHelper.visible = true; // Visible by default for debugging
        this.scene.add(this.axesHelper);
        
        // Window resize handler
        this.setupResizeHandler();
    }
    
    setupLighting() {
        // Increased ambient light to handle dark GLB models
        const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
        this.scene.add(ambientLight);
        
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
        directionalLight.position.set(-10, 15, -5);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        directionalLight.shadow.camera.left = -50;
        directionalLight.shadow.camera.right = 50;
        directionalLight.shadow.camera.top = 50;
        directionalLight.shadow.camera.bottom = -50;
        directionalLight.shadow.camera.near = 0.5;
        directionalLight.shadow.camera.far = 100;
        this.scene.add(directionalLight);
        
        // Additional fill lights for better visibility
        const fillLight = new THREE.DirectionalLight(0xffffff, 0.6);
        fillLight.position.set(10, 10, 10);
        this.scene.add(fillLight);
        
        const backLight = new THREE.DirectionalLight(0xaaaaaa, 0.4);
        backLight.position.set(0, 5, 10);
        this.scene.add(backLight);
    }
    
    setupResizeHandler() {
        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });
    }
    
    toggleFreeCamera() {
        this.isFreeCamera = !this.isFreeCamera;
        this.controls.enabled = this.isFreeCamera;
        return this.isFreeCamera;
    }
    
    toggleAxesHelper() {
        this.axesHelper.visible = !this.axesHelper.visible;
    }
    
    setGround(groundMesh) {
        // Only dispose of old ground if it's a standalone fallback ground (not part of a GLB model)
        // GLB model grounds are already in the scene tree, so we just store a reference
        if (this.ground && this.ground.parent === this.scene) {
            // Old ground was added directly to scene (fallback), safe to remove and dispose
            this.scene.remove(this.ground);
            if (this.ground.geometry) this.ground.geometry.dispose();
            if (this.ground.material) {
                if (Array.isArray(this.ground.material)) {
                    this.ground.material.forEach(mat => mat.dispose());
                } else {
                    this.ground.material.dispose();
                }
            }
        }
        
        this.ground = groundMesh;
        if (groundMesh) {
            groundMesh.name = 'ground';
            // Only add to scene if it's not already part of a GLB model hierarchy
            // GLB models are added to scene as complete hierarchies, so the ground is already included
            if (!groundMesh.parent) {
                this.scene.add(groundMesh);
            }
        }
    }
    
    getGround() {
        // Prefer the explicitly set ground reference
        if (this.ground) {
            return this.ground;
        }
        
        // Fallback: find a visible ground mesh (prevent getting wrong scene's ground)
        // If multiple scenes exist, we want the visible one
        const groundByName = this.scene.getObjectByName('ground');
        if (groundByName && groundByName.visible) {
            return groundByName;
        }
        
        // Last resort: search for any visible ground in the scene
        let foundGround = null;
        this.scene.traverse((child) => {
            if (child.isMesh && 
                (child.name.toLowerCase().includes('ground') || 
                 child.name.toLowerCase().includes('floor')) &&
                child.visible) {
                foundGround = child;
            }
        });
        
        return foundGround || null;
    }
    
    render() {
        this.renderer.render(this.scene, this.camera);
    }
}

