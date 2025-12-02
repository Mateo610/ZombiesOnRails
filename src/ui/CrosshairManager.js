/**
 * CrosshairManager
 * Manages crosshair position following cursor and provides mouse position tracking
 * Keeps shooting system decoupled from UI positioning logic
 */

export class CrosshairManager {
    constructor() {
        this.crosshairElement = null;
        this.isEnabled = true;
        
        // Mouse position tracking (normalized coordinates: -1 to 1)
        this.mouseX = 0;
        this.mouseY = 0;
        
        // Mouse position tracking (screen pixels)
        this.mouseScreenX = 0;
        this.mouseScreenY = 0;
        
        // Smoothing for crosshair movement (0 = instant, 1 = very smooth)
        this.smoothingFactor = 0.15;
        this.targetX = 0;
        this.targetY = 0;
        this.currentX = 0;
        this.currentY = 0;
        
        // Mouse tracking state
        this.isMouseTracking = false;
        this.lastUpdateTime = performance.now();
        
        // Bound methods
        this.onMouseMove = this.onMouseMove.bind(this);
        this.onMouseLeave = this.onMouseLeave.bind(this);
    }
    
    /**
     * Initialize the crosshair manager
     * @param {string} crosshairId - ID of the crosshair DOM element
     */
    init(crosshairId = 'crosshair') {
        this.crosshairElement = document.getElementById(crosshairId);
        
        if (!this.crosshairElement) {
            console.warn('⚠️ CrosshairManager: Crosshair element not found:', crosshairId);
            return false;
        }
        
        // Set initial position to center
        this.currentX = window.innerWidth / 2;
        this.currentY = window.innerHeight / 2;
        this.targetX = this.currentX;
        this.targetY = this.currentY;
        
        // Update CSS to use transform instead of fixed center
        this.crosshairElement.style.top = '0px';
        this.crosshairElement.style.left = '0px';
        
        // Center the crosshair on the initial position (subtract half size)
        const crosshairOffsetX = this.currentX - 20; // Half of 40px width
        const crosshairOffsetY = this.currentY - 20; // Half of 40px height
        this.crosshairElement.style.transform = `translate(${crosshairOffsetX}px, ${crosshairOffsetY}px)`;
        
        // Add event listeners
        window.addEventListener('mousemove', this.onMouseMove);
        document.addEventListener('mouseleave', this.onMouseLeave);
        
        // Listen for mouse enter to resume tracking
        document.addEventListener('mouseenter', () => {
            this.isMouseTracking = true;
        });
        
        console.log('✅ CrosshairManager initialized');
        return true;
    }
    
    /**
     * Handle mouse move events
     * @param {MouseEvent} event - Mouse event
     */
    onMouseMove(event) {
        if (!this.isEnabled) return;
        
        this.isMouseTracking = true;
        this.lastUpdateTime = performance.now();
        
        // Store screen pixel coordinates
        this.mouseScreenX = event.clientX;
        this.mouseScreenY = event.clientY;
        
        // Calculate normalized coordinates (-1 to 1)
        // Y is inverted because screen coordinates go top to bottom
        this.mouseX = (event.clientX / window.innerWidth) * 2 - 1;
        this.mouseY = -(event.clientY / window.innerHeight) * 2 + 1;
        
        // Update target position for smooth interpolation
        this.targetX = event.clientX;
        this.targetY = event.clientY;
    }
    
    /**
     * Handle mouse leave events (mouse exits viewport)
     * @param {MouseEvent} event - Mouse event
     */
    onMouseLeave(event) {
        // Only handle if mouse actually left the document
        if (!event.relatedTarget && event.target === document) {
            this.isMouseTracking = false;
            // Optionally: keep crosshair at last position or center it
            // For now, we'll keep it at last position
        }
    }
    
    /**
     * Update crosshair position (call every frame for smooth movement)
     * @param {number} deltaTime - Time since last frame in seconds
     */
    update(deltaTime = 0.016) {
        if (!this.isEnabled || !this.crosshairElement) return;
        
        // Smooth interpolation towards target position
        const lerp = 1 - Math.pow(1 - this.smoothingFactor, deltaTime * 60);
        this.currentX += (this.targetX - this.currentX) * lerp;
        this.currentY += (this.targetY - this.currentY) * lerp;
        
        // Update crosshair position (center the crosshair on cursor)
        // Subtract half the crosshair size to center it on cursor
        const crosshairOffsetX = this.currentX - 20; // Half of 40px width
        const crosshairOffsetY = this.currentY - 20; // Half of 40px height
        this.crosshairElement.style.transform = `translate(${crosshairOffsetX}px, ${crosshairOffsetY}px)`;
    }
    
    /**
     * Get current normalized mouse position (for raycaster)
     * @returns {{x: number, y: number}} Normalized coordinates (-1 to 1)
     */
    getNormalizedMousePosition() {
        return {
            x: this.mouseX,
            y: this.mouseY
        };
    }
    
    /**
     * Get current screen mouse position
     * @returns {{x: number, y: number}} Screen pixel coordinates
     */
    getScreenMousePosition() {
        return {
            x: this.mouseScreenX,
            y: this.mouseScreenY
        };
    }
    
    /**
     * Center the crosshair (useful for reset or disabled states)
     * Immediately snaps to center position
     */
    center() {
        const centerX = window.innerWidth / 2;
        const centerY = window.innerHeight / 2;
        
        // Set both target and current position to center immediately
        this.targetX = centerX;
        this.targetY = centerY;
        this.currentX = centerX;
        this.currentY = centerY;
        this.mouseX = 0;
        this.mouseY = 0;
        this.mouseScreenX = centerX;
        this.mouseScreenY = centerY;
        
        // Immediately update the crosshair position
        if (this.crosshairElement) {
            const crosshairOffsetX = this.currentX - 20; // Half of 40px width
            const crosshairOffsetY = this.currentY - 20; // Half of 40px height
            this.crosshairElement.style.transform = `translate(${crosshairOffsetX}px, ${crosshairOffsetY}px)`;
        }
    }
    
    /**
     * Enable crosshair tracking
     */
    enable() {
        this.isEnabled = true;
    }
    
    /**
     * Disable crosshair tracking (e.g., during menus, rail movement)
     */
    disable() {
        this.isEnabled = false;
        // Optionally center when disabled
        // this.center();
    }
    
    /**
     * Clean up event listeners
     */
    dispose() {
        window.removeEventListener('mousemove', this.onMouseMove);
        document.removeEventListener('mouseleave', this.onMouseLeave);
    }
}

