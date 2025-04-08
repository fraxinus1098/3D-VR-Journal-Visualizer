import * as THREE from 'three';

/**
 * AudioControls - Floating UI panel for controlling audio
 */
class AudioControls {
  constructor(camera, scene, audioSystem) {
    this.camera = camera;
    this.scene = scene;
    this.audioSystem = audioSystem;
    
    // Container group
    this.container = new THREE.Group();
    this.scene.add(this.container);
    
    // Panel state
    this.visible = false;
    this.distance = 0.4; // Distance from camera
    
    // Create UI elements
    this.createControls();
  }
  
  /**
   * Create control panel elements
   */
  createControls() {
    // Panel background
    const panelWidth = 0.15;
    const panelHeight = 0.1;
    
    const panelGeometry = new THREE.PlaneGeometry(panelWidth, panelHeight);
    const panelMaterial = new THREE.MeshBasicMaterial({
      color: 0x222222,
      transparent: true,
      opacity: 0.7,
      side: THREE.DoubleSide
    });
    
    this.panel = new THREE.Mesh(panelGeometry, panelMaterial);
    this.container.add(this.panel);
    
    // Mute button
    const muteSize = panelHeight * 0.4;
    const muteGeometry = new THREE.CircleGeometry(muteSize / 2, 32);
    const muteMaterial = new THREE.MeshBasicMaterial({
      color: 0xFFFFFF,
      transparent: true,
      opacity: 0.9,
      side: THREE.DoubleSide
    });
    
    this.muteButton = new THREE.Mesh(muteGeometry, muteMaterial);
    this.muteButton.position.set(-panelWidth * 0.3, 0, 0.001);
    this.container.add(this.muteButton);
    
    // Add volume icon to mute button
    const speakerGeometry = new THREE.PlaneGeometry(muteSize * 0.8, muteSize * 0.8);
    const speakerTexture = this.createSpeakerTexture();
    const speakerMaterial = new THREE.MeshBasicMaterial({
      map: speakerTexture,
      transparent: true,
      opacity: 1,
      side: THREE.DoubleSide
    });
    
    this.speakerIcon = new THREE.Mesh(speakerGeometry, speakerMaterial);
    this.speakerIcon.position.set(-panelWidth * 0.3, 0, 0.002);
    this.container.add(this.speakerIcon);
    
    // Volume slider background
    const sliderWidth = panelWidth * 0.5;
    const sliderHeight = panelHeight * 0.15;
    
    const sliderBgGeometry = new THREE.PlaneGeometry(sliderWidth, sliderHeight);
    const sliderBgMaterial = new THREE.MeshBasicMaterial({
      color: 0x444444,
      transparent: true,
      opacity: 0.9,
      side: THREE.DoubleSide
    });
    
    this.sliderBackground = new THREE.Mesh(sliderBgGeometry, sliderBgMaterial);
    this.sliderBackground.position.set(panelWidth * 0.1, 0, 0.001);
    this.container.add(this.sliderBackground);
    
    // Volume slider handle
    const handleWidth = sliderHeight * 1.2;
    const handleHeight = sliderHeight * 1.8;
    
    const handleGeometry = new THREE.PlaneGeometry(handleWidth, handleHeight);
    const handleMaterial = new THREE.MeshBasicMaterial({
      color: 0x88AAFF,
      transparent: true,
      opacity: 0.9,
      side: THREE.DoubleSide
    });
    
    this.sliderHandle = new THREE.Mesh(handleGeometry, handleMaterial);
    this.sliderHandle.position.set(panelWidth * 0.1, 0, 0.002);
    this.container.add(this.sliderHandle);
    
    // Set slider position
    this.updateSliderPosition(0.5); // Default volume 0.5
    
    // Mark objects as interactive
    this.muteButton.userData.interactive = true;
    this.muteButton.userData.type = 'audio-mute';
    
    this.sliderBackground.userData.interactive = true;
    this.sliderBackground.userData.type = 'audio-slider';
    
    this.sliderHandle.userData.interactive = true;
    this.sliderHandle.userData.type = 'audio-slider-handle';
    
    // Hide initially
    this.container.visible = this.visible;
  }
  
  /**
   * Create a texture for the speaker icon
   * @returns {THREE.CanvasTexture} The speaker texture
   */
  createSpeakerTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#000000';
    
    // Draw speaker icon
    ctx.beginPath();
    // Speaker box
    ctx.moveTo(15, 22);
    ctx.lineTo(25, 22);
    ctx.lineTo(25, 42);
    ctx.lineTo(15, 42);
    ctx.closePath();
    ctx.fill();
    
    // Speaker cone
    ctx.beginPath();
    ctx.moveTo(25, 22);
    ctx.lineTo(40, 12);
    ctx.lineTo(40, 52);
    ctx.lineTo(25, 42);
    ctx.closePath();
    ctx.fill();
    
    // Sound waves (if not muted)
    if (!this.audioSystem || !this.audioSystem.muted) {
      // First wave
      ctx.beginPath();
      ctx.arc(42, 32, 5, -Math.PI/3, Math.PI/3, false);
      ctx.stroke();
      
      // Second wave
      ctx.beginPath();
      ctx.arc(42, 32, 10, -Math.PI/3, Math.PI/3, false);
      ctx.stroke();
    } else {
      // X mark for muted
      ctx.beginPath();
      ctx.moveTo(45, 22);
      ctx.lineTo(55, 42);
      ctx.stroke();
      
      ctx.beginPath();
      ctx.moveTo(55, 22);
      ctx.lineTo(45, 42);
      ctx.stroke();
    }
    
    return new THREE.CanvasTexture(canvas);
  }
  
  /**
   * Update the speaker icon when mute state changes
   */
  updateSpeakerIcon() {
    if (this.speakerIcon && this.speakerIcon.material) {
      this.speakerIcon.material.map = this.createSpeakerTexture();
      this.speakerIcon.material.needsUpdate = true;
    }
  }
  
  /**
   * Update the slider position based on volume (0.0-1.0)
   * @param {number} volume - Volume value (0.0-1.0)
   */
  updateSliderPosition(volume) {
    if (!this.sliderHandle || !this.sliderBackground) return;
    
    // Get slider dimensions
    const sliderWidth = this.sliderBackground.geometry.parameters.width;
    
    // Calculate position based on volume
    const sliderMinX = this.sliderBackground.position.x - sliderWidth / 2;
    const sliderMaxX = this.sliderBackground.position.x + sliderWidth / 2;
    
    // Map volume (0-1) to slider position
    const handleX = sliderMinX + (volume * (sliderMaxX - sliderMinX));
    
    // Update handle position
    this.sliderHandle.position.x = handleX;
  }
  
  /**
   * Handle interaction with audio controls
   * @param {Object} intersection - The raycaster intersection object
   * @returns {Object|null} Interaction data if handled, null otherwise
   */
  handleInteraction(intersection) {
    if (!intersection || !intersection.object) return null;
    
    const object = intersection.object;
    
    // Check if the object is part of audio controls
    if (object === this.muteButton) {
      // Handle mute button click
      this.toggleMute();
      return { type: 'audio-mute-clicked' };
    } else if (object === this.sliderBackground || object === this.sliderHandle) {
      // Handle slider click
      const sliderWidth = this.sliderBackground.geometry.parameters.width;
      const sliderMinX = this.sliderBackground.position.x - sliderWidth / 2;
      const sliderMaxX = this.sliderBackground.position.x + sliderWidth / 2;
      
      // Calculate click position in local space
      const point = intersection.point.clone();
      this.container.worldToLocal(point);
      
      // Calculate volume from position (0.0-1.0)
      const volume = Math.max(0, Math.min(1, (point.x - sliderMinX) / (sliderMaxX - sliderMinX)));
      
      // Update slider position and set volume
      this.updateSliderPosition(volume);
      this.setVolume(volume);
      
      return { type: 'audio-volume-changed', volume };
    }
    
    return null;
  }
  
  /**
   * Toggle mute state
   */
  toggleMute() {
    if (!this.audioSystem) return;
    
    const muted = this.audioSystem.toggleMute();
    this.updateSpeakerIcon();
  }
  
  /**
   * Set volume level
   * @param {number} volume - Volume level (0.0-1.0)
   */
  setVolume(volume) {
    if (!this.audioSystem) return;
    
    this.audioSystem.setVolume(volume);
    this.updateSpeakerIcon();
  }
  
  /**
   * Show the audio controls
   */
  show() {
    this.visible = true;
    this.container.visible = true;
    this.updatePosition();
  }
  
  /**
   * Hide the audio controls
   */
  hide() {
    this.visible = false;
    this.container.visible = false;
  }
  
  /**
   * Toggle visibility of the audio controls
   */
  toggle() {
    this.visible = !this.visible;
    this.container.visible = this.visible;
    
    if (this.visible) {
      this.updatePosition();
    }
  }
  
  /**
   * Update position of the audio controls relative to the camera
   */
  updatePosition() {
    if (!this.visible || !this.camera) return;
    
    // Position below the camera's view
    const cameraPosVec = new THREE.Vector3();
    const cameraDirection = new THREE.Vector3();
    const cameraRight = new THREE.Vector3();
    const cameraUp = new THREE.Vector3();
    
    // Get camera position and orientation
    this.camera.getWorldPosition(cameraPosVec);
    this.camera.getWorldDirection(cameraDirection);
    
    // Calculate right and up vectors
    cameraRight.crossVectors(cameraDirection, this.camera.up).normalize();
    cameraUp.crossVectors(cameraRight, cameraDirection).normalize();
    
    // Position the panel in front and slightly below
    const position = new THREE.Vector3();
    position.copy(cameraPosVec);
    position.addScaledVector(cameraDirection, this.distance);
    position.addScaledVector(cameraUp, -0.15); // Place below
    
    // Update container position and rotation
    this.container.position.copy(position);
    
    // Orient toward camera
    this.container.lookAt(cameraPosVec);
  }
}

export default AudioControls; 