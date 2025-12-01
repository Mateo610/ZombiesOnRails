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
        // Fog settings - extended range for exploration (start at 10, full fog at 200)
        // This allows viewing much further while still having atmospheric fog
        this.scene.fog = new THREE.Fog(0x1a1a2e, 10, 200);
        
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
            2000  // Increased far plane to match extended fog distance
        );
        // Set camera to initial position immediately to prevent glitch
        this.camera.position.set(0, 1.6, 5);
        this.camera.lookAt(0, 1.5, 0);
        
        // Clock
        this.clock = new THREE.Clock();
        
        // Lighting setup
        this.setupLighting();
        
        // Controls - Enhanced orbit controls for better navigation
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        
        // Rotation settings
        this.controls.rotateSpeed = 1.0;
        this.controls.autoRotate = false;
        
        // Zoom settings - no limits for free exploration
        this.controls.zoomSpeed = 1.2;
        this.controls.minDistance = 0.1; // Very close
        // Remove maxDistance constraint entirely - set to a very large number
        // Infinity causes issues, so use a very large number instead
        this.controls.maxDistance = 10000; // Allow movement anywhere in the scene
        
        // Pan settings - much faster panning for better exploration
        this.controls.panSpeed = 3.0; // Increased for faster movement past boundaries
        this.controls.enablePan = true;
        
        // Keyboard panning
        this.controls.enableKeys = true;
        this.controls.keyPanSpeed = 10.0; // Faster keyboard panning
        
        // Rotation limits (prevent camera flipping)
        this.controls.minPolarAngle = 0; // Allow looking straight up
        this.controls.maxPolarAngle = Math.PI; // Allow looking straight down
        
        // Screen space panning (better for scene exploration)
        this.controls.screenSpacePanning = true;
        this.controls.keyPanSpeed = 7.0; // Keyboard pan speed
        
        this.isFreeCamera = false;
        this.controls.enabled = this.isFreeCamera;
        
        // Scene objects
        this.ground = null;
        // Axes helper removed for production (was used for debugging)
        // this.axesHelper = new THREE.AxesHelper(5);
        // this.scene.add(this.axesHelper);
        
        // Window resize handler (will be set up with renderManager reference in main.js)
        this.resizeHandler = null;
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
    
    setupResizeHandler(renderManager) {
        // Remove existing listener if any (to prevent duplicates)
        if (this.resizeHandler) {
            window.removeEventListener('resize', this.resizeHandler);
        }
        
        this.resizeHandler = () => {
            const width = window.innerWidth;
            const height = window.innerHeight;
            
            // Update camera aspect ratio
            this.camera.aspect = width / height;
            this.camera.updateProjectionMatrix();
            
            // Update renderer size
            this.renderer.setSize(width, height);
            
            // Update composer size if post-processing is enabled
            if (renderManager) {
                renderManager.handleResize();
            }
            
            // OrbitControls automatically handle resize - no manual update needed
        };
        
        window.addEventListener('resize', this.resizeHandler);
    }
    
    toggleFreeCamera() {
        this.isFreeCamera = !this.isFreeCamera;
        this.controls.enabled = this.isFreeCamera;
        return this.isFreeCamera;
    }
    
    toggleAxesHelper() {
        // Axes helper removed for production
        // this.axesHelper.visible = !this.axesHelper.visible;
    }
    
    setGround(groundMesh) {
        if (this.ground) {
            this.scene.remove(this.ground);
            if (this.ground.geometry) this.ground.geometry.dispose();
            if (this.ground.material) this.ground.material.dispose();
        }
        this.ground = groundMesh;
        if (groundMesh) {
            groundMesh.name = 'ground';
            this.scene.add(groundMesh);
        }
    }
    
    getGround() {
        return this.ground || this.scene.getObjectByName('ground');
    }
    
    render() {
        this.renderer.render(this.scene, this.camera);
    }
}

