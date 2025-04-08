/**
 * SceneManager handles the Three.js scene, camera, renderer and basic objects
 */
import * as THREE from 'three';

export default class SceneManager {
  constructor(container) {
    this.container = container;
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    
    this.init();
  }
  
  /**
   * Initialize the Three.js scene
   */
  init() {
    // Create scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x000011);
    
    // Create camera
    this.camera = new THREE.PerspectiveCamera(
      75, 
      this.container.clientWidth / this.container.clientHeight,
      0.1,
      1000
    );
    this.camera.position.set(0, 1.6, 3); // Position at eye level
    
    // Create renderer
    this.renderer = new THREE.WebGLRenderer({ 
      antialias: true,
      alpha: true
    });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(
      this.container.clientWidth, 
      this.container.clientHeight
    );
    
    // Add render canvas to DOM
    this.container.appendChild(this.renderer.domElement);
    
    // Add basic lighting
    this.addLighting();
    
    // Set up event listeners
    window.addEventListener('resize', this.onWindowResize.bind(this));
  }
  
  /**
   * Add lighting to the scene
   */
  addLighting() {
    // Ambient light for general illumination
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(ambientLight);
    
    // Directional light for shadows and highlights
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(0, 10, 10);
    this.scene.add(directionalLight);
  }
  
  /**
   * Handle window resize
   */
  onWindowResize() {
    this.camera.aspect = this.container.clientWidth / this.container.clientHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(
      this.container.clientWidth, 
      this.container.clientHeight
    );
  }
  
  /**
   * Animation loop
   */
  animate() {
    requestAnimationFrame(this.animate.bind(this));
    this.renderer.render(this.scene, this.camera);
  }
  
  /**
   * Add a mesh to the scene
   * @param {THREE.Object3D} mesh - The mesh to add
   */
  add(mesh) {
    this.scene.add(mesh);
  }
  
  /**
   * Remove a mesh from the scene
   * @param {THREE.Object3D} mesh - The mesh to remove
   */
  remove(mesh) {
    this.scene.remove(mesh);
  }
} 