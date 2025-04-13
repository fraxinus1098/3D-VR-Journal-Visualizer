import * as THREE from 'three';

/**
 * Creates and manages a minimap for navigation
 */
export default class Minimap {
  constructor(camera, scene, options = {}) {
    this.camera = camera; // Main camera to track
    this.mainScene = scene; // Main scene reference
    
    // Configuration options with defaults
    this.options = Object.assign({
      size: 200, // Size in pixels
      viewSize: 50, // Size of the orthographic view
      position: { bottom: '20px', right: '20px' }, // CSS position
      backgroundColor: 0x000022, // Dark blue background
      gridColor: 0x555555,
      subgridColor: 0x222222,
      markerColor: 0xff0000, // Red marker for player
      showCoordinates: true, // Show coordinate display
      yRangeMin: -10, // Min Y range for elevation scale
      yRangeMax: 30 // Max Y range for elevation scale
    }, options);
    
    // Minimap scene and camera
    this.minimapScene = null;
    this.minimapCamera = null;
    this.minimapRenderer = null;
    this.playerMarker = null;
    this.elevationLine = null;
    
    // Visibility flag
    this.visible = true;
    
    this.init();
  }
  
  init() {
    // Create minimap scene
    this.minimapScene = new THREE.Scene();
    this.minimapScene.background = new THREE.Color(this.options.backgroundColor);
    
    // Create orthographic camera for top-down view
    const aspect = window.innerWidth / window.innerHeight;
    this.minimapCamera = new THREE.OrthographicCamera(
      -this.options.viewSize * aspect / 4, this.options.viewSize * aspect / 4,
      this.options.viewSize / 4, -this.options.viewSize / 4,
      0.1, 1000
    );
    this.minimapCamera.position.set(0, 50, 0);
    this.minimapCamera.lookAt(0, 0, 0);
    this.minimapCamera.rotation.z = Math.PI; // Proper orientation
    
    // Create minimap renderer
    this.minimapRenderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true
    });
    this.minimapRenderer.setSize(this.options.size, this.options.size);
    
    // Style the minimap canvas
    this.minimapRenderer.domElement.style.position = 'absolute';
    this.minimapRenderer.domElement.style.bottom = this.options.position.bottom;
    this.minimapRenderer.domElement.style.right = this.options.position.right;
    this.minimapRenderer.domElement.style.borderRadius = '100px';
    this.minimapRenderer.domElement.style.border = '2px solid white';
    
    // Add to DOM
    document.getElementById('app').appendChild(this.minimapRenderer.domElement);
    
    // Create elevation gauge for 3D navigation
    this.setupElevationGauge();
    
    // Create player marker for minimap
    const markerGeometry = new THREE.ConeGeometry(0.8, 2, 4);
    const markerMaterial = new THREE.MeshBasicMaterial({ color: this.options.markerColor });
    this.playerMarker = new THREE.Mesh(markerGeometry, markerMaterial);
    this.playerMarker.rotation.x = Math.PI / 2;
    this.minimapScene.add(this.playerMarker);
    
    // Add a vertical line from the player marker to indicate elevation
    const lineMaterial = new THREE.LineBasicMaterial({ 
      color: this.options.markerColor, 
      transparent: true, 
      opacity: 0.7 
    });
    const lineGeometry = new THREE.BufferGeometry();
    const linePositions = new Float32Array(6); // 2 points * 3 coordinates
    lineGeometry.setAttribute('position', new THREE.BufferAttribute(linePositions, 3));
    this.elevationLine = new THREE.Line(lineGeometry, lineMaterial);
    this.minimapScene.add(this.elevationLine);
    
    // Add grid to help with spatial orientation
    const gridHelper = new THREE.GridHelper(100, 10, this.options.gridColor, this.options.subgridColor);
    gridHelper.rotation.x = Math.PI / 2; // Make it visible from top-down view
    this.minimapScene.add(gridHelper);
    
    // Add cardinal direction indicators
    this.addCardinalDirections();
    
    // Add ambient light to minimap scene
    const light = new THREE.AmbientLight(0xffffff, 1);
    this.minimapScene.add(light);
    
    // Add stats display for current position
    if (this.options.showCoordinates) {
      this.setupCoordinateDisplay();
    }
    
    // Handle window resize
    window.addEventListener('resize', this.onWindowResize.bind(this));
  }
  
  /**
   * Add minimap point for data visualization
   */
  addPoint(x, z, options = {}) {
    const {
      y = 0,
      color = 0xffffff,
      size = 0.2,
      showHeight = true,
      opacity = 1
    } = options;
    
    // Create dot with elevation pillar
    const dotGeometry = new THREE.SphereGeometry(size, 8, 8);
    const dotMaterial = new THREE.MeshBasicMaterial({ 
      color: color,
      transparent: opacity < 1,
      opacity: opacity
    });
    const dot = new THREE.Mesh(dotGeometry, dotMaterial);
    
    // Position the dot at the X,Z coordinates but at ground level
    dot.position.set(x, 0, z);
    this.minimapScene.add(dot);
    
    // Add vertical line to indicate height if requested
    if (showHeight && Math.abs(y) > 1) {
      const lineMaterial = new THREE.LineBasicMaterial({ 
        color: color,
        transparent: true,
        opacity: 0.3 + (opacity * 0.3)
      });
      
      const lineGeometry = new THREE.BufferGeometry();
      const lineHeight = Math.max(0.1, Math.abs(y) * 0.1); // Scale height for visibility
      const scaled_y = y > 0 ? lineHeight : -lineHeight;
      
      const vertices = new Float32Array([
        x, 0, z, // ground point
        x, scaled_y, z  // elevated point
      ]);
      
      lineGeometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
      const line = new THREE.Line(lineGeometry, lineMaterial);
      this.minimapScene.add(line);
      
      return { dot, line };
    }
    
    return { dot };
  }
  
  /**
   * Set up the elevation gauge to show Y-axis position
   */
  setupElevationGauge() {
    // Create a vertical gauge container
    const gaugeContainer = document.createElement('div');
    gaugeContainer.style.position = 'absolute';
    gaugeContainer.style.top = '20px';
    gaugeContainer.style.right = '20px';
    gaugeContainer.style.width = '20px';
    gaugeContainer.style.height = '200px';
    gaugeContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    gaugeContainer.style.borderRadius = '10px';
    gaugeContainer.style.border = '1px solid white';
    
    // Create the elevation indicator
    this.elevationIndicator = document.createElement('div');
    this.elevationIndicator.style.position = 'absolute';
    this.elevationIndicator.style.width = '16px';
    this.elevationIndicator.style.height = '10px';
    this.elevationIndicator.style.backgroundColor = 'red';
    this.elevationIndicator.style.borderRadius = '5px';
    this.elevationIndicator.style.left = '2px';
    this.elevationIndicator.style.bottom = '2px'; // Will be updated based on camera y position
    
    // Add labels for top and bottom
    const topLabel = document.createElement('div');
    topLabel.style.position = 'absolute';
    topLabel.style.top = '-20px';
    topLabel.style.width = '100%';
    topLabel.style.textAlign = 'center';
    topLabel.style.color = 'white';
    topLabel.style.fontSize = '12px';
    topLabel.textContent = 'Top';
    
    const bottomLabel = document.createElement('div');
    bottomLabel.style.position = 'absolute';
    bottomLabel.style.bottom = '-20px';
    bottomLabel.style.width = '100%';
    bottomLabel.style.textAlign = 'center';
    bottomLabel.style.color = 'white';
    bottomLabel.style.fontSize = '12px';
    bottomLabel.textContent = 'Bottom';
    
    // Add to DOM
    gaugeContainer.appendChild(this.elevationIndicator);
    gaugeContainer.appendChild(topLabel);
    gaugeContainer.appendChild(bottomLabel);
    document.getElementById('app').appendChild(gaugeContainer);
    
    // Store for later use
    this.elevationGauge = gaugeContainer;
  }
  
  /**
   * Add cardinal direction indicators to the minimap
   */
  addCardinalDirections() {
    const distance = 22; // Distance from center
    const size = 1.5;
    
    // Create text geometry for N, S, E, W
    const directions = [
      { text: 'N', position: new THREE.Vector3(0, 0, -distance) },
      { text: 'S', position: new THREE.Vector3(0, 0, distance) },
      { text: 'E', position: new THREE.Vector3(distance, 0, 0) },
      { text: 'W', position: new THREE.Vector3(-distance, 0, 0) }
    ];
    
    // Add direction markers using simple boxes
    directions.forEach(dir => {
      const markerGeometry = new THREE.BoxGeometry(size, size, size);
      const markerMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
      const marker = new THREE.Mesh(markerGeometry, markerMaterial);
      marker.position.copy(dir.position);
      this.minimapScene.add(marker);
      
      // Add dot above for better visibility
      const dotGeometry = new THREE.SphereGeometry(size/3, 8, 8);
      const dotMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
      const dot = new THREE.Mesh(dotGeometry, dotMaterial);
      dot.position.set(dir.position.x, dir.position.y + 2, dir.position.z);
      this.minimapScene.add(dot);
    });
  }
  
  /**
   * Set up coordinate display for debugging and navigation
   */
  setupCoordinateDisplay() {
    this.coordDisplay = document.createElement('div');
    this.coordDisplay.style.position = 'absolute';
    this.coordDisplay.style.bottom = '225px';
    this.coordDisplay.style.right = '20px';
    this.coordDisplay.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    this.coordDisplay.style.color = 'white';
    this.coordDisplay.style.padding = '5px';
    this.coordDisplay.style.borderRadius = '5px';
    this.coordDisplay.style.fontSize = '12px';
    this.coordDisplay.style.fontFamily = 'monospace';
    document.getElementById('app').appendChild(this.coordDisplay);
  }
  
  /**
   * Handle window resize events
   */
  onWindowResize() {
    const aspect = window.innerWidth / window.innerHeight;
    this.minimapCamera.left = -this.options.viewSize * aspect / 4;
    this.minimapCamera.right = this.options.viewSize * aspect / 4;
    this.minimapCamera.top = this.options.viewSize / 4;
    this.minimapCamera.bottom = -this.options.viewSize / 4;
    this.minimapCamera.updateProjectionMatrix();
  }
  
  /**
   * Update the minimap view
   */
  update() {
    // Skip update if not visible or components aren't available
    if (!this.visible || !this.minimapRenderer || !this.playerMarker) return;
    
    // Update player marker position from camera
    this.playerMarker.position.x = this.camera.position.x;
    this.playerMarker.position.z = this.camera.position.z;
    
    // Update player marker rotation from camera
    const direction = new THREE.Vector3();
    this.camera.getWorldDirection(direction);
    this.playerMarker.rotation.y = Math.atan2(direction.x, direction.z);
    
    // Update elevation line
    if (this.elevationLine) {
      const positions = this.elevationLine.geometry.attributes.position.array;
      positions[0] = this.camera.position.x; // x1
      positions[1] = 0;                      // y1 (ground level)
      positions[2] = this.camera.position.z; // z1
      positions[3] = this.camera.position.x; // x2
      positions[4] = 0;                      // y2 (will be updated with scaled height)
      positions[5] = this.camera.position.z; // z2
      
      // Scale the height for better visibility
      const heightScale = 0.2; // adjust as needed for visibility
      positions[4] = this.camera.position.y * heightScale;
      
      this.elevationLine.geometry.attributes.position.needsUpdate = true;
    }
    
    // Update elevation gauge
    if (this.elevationIndicator) {
      // Calculate position percentage in the y range
      const yRange = this.options.yRangeMax - this.options.yRangeMin;
      const yPercentage = (this.camera.position.y - this.options.yRangeMin) / yRange;
      // Clamp between 0 and 1
      const clampedPercentage = Math.max(0, Math.min(1, yPercentage));
      // Calculate position in pixels (account for indicator height)
      const gaugeHeight = 200 - 10; // container height minus indicator height
      const pixelPosition = clampedPercentage * gaugeHeight;
      // Update indicator position
      this.elevationIndicator.style.bottom = `${pixelPosition}px`;
    }
    
    // Update coordinate display
    if (this.coordDisplay) {
      this.coordDisplay.textContent = `X: ${this.camera.position.x.toFixed(1)} | Y: ${this.camera.position.y.toFixed(1)} | Z: ${this.camera.position.z.toFixed(1)}`;
    }
    
    // Update minimap camera position
    this.minimapCamera.position.x = this.camera.position.x;
    this.minimapCamera.position.z = this.camera.position.z;
    
    try {
      // Render minimap safely
      this.minimapRenderer.render(this.minimapScene, this.minimapCamera);
    } catch (error) {
      console.error('Error rendering minimap:', error);
    }
  }
  
  /**
   * Clean up resources when no longer needed
   */
  dispose() {
    // Remove DOM elements
    if (this.minimapRenderer && this.minimapRenderer.domElement.parentNode) {
      this.minimapRenderer.domElement.parentNode.removeChild(this.minimapRenderer.domElement);
    }
    
    if (this.elevationGauge && this.elevationGauge.parentNode) {
      this.elevationGauge.parentNode.removeChild(this.elevationGauge);
    }
    
    if (this.coordDisplay && this.coordDisplay.parentNode) {
      this.coordDisplay.parentNode.removeChild(this.coordDisplay);
    }
    
    // Dispose of THREE.js resources
    this.minimapRenderer.dispose();
    
    // Remove event listeners
    window.removeEventListener('resize', this.onWindowResize.bind(this));
  }

  /**
   * Show the minimap
   */
  show() {
    if (!this.visible) {
      // Only do something if it's not already visible
      if (this.minimapRenderer) {
        this.minimapRenderer.domElement.style.display = 'block';
      }
      if (this.elevationGauge && this.elevationGauge.parentNode) {
        this.elevationGauge.style.display = 'block';
      }
      if (this.coordDisplay && this.coordDisplay.parentNode) {
        this.coordDisplay.style.display = 'block';
      }
      this.visible = true;
      console.log('Minimap: show');
    }
  }

  /**
   * Hide the minimap
   */
  hide() {
    if (this.visible) {
      // Only do something if it's currently visible
      if (this.minimapRenderer) {
        this.minimapRenderer.domElement.style.display = 'none';
      }
      if (this.elevationGauge && this.elevationGauge.parentNode) {
        this.elevationGauge.style.display = 'none';
      }
      if (this.coordDisplay && this.coordDisplay.parentNode) {
        this.coordDisplay.style.display = 'none';
      }
      this.visible = false;
      console.log('Minimap: hide');
    }
  }

  /**
   * Toggle minimap visibility
   */
  toggle() {
    if (this.visible) {
      this.hide();
    } else {
      this.show();
    }
    return this.visible;
  }
} 