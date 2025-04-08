import * as THREE from 'three';

// Main class for the WebXR application
class WarholJournalViz {
  constructor() {
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.init();
  }

  init() {
    // Create a scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x000011); // Dark blue background
    
    // Create a camera
    this.camera = new THREE.PerspectiveCamera(
      75,                                    // Field of view
      window.innerWidth / window.innerHeight, // Aspect ratio
      0.1,                                   // Near clipping plane
      1000                                   // Far clipping plane
    );
    this.camera.position.set(0, 1.6, 3);     // Position camera at eye level
    
    // Create a renderer
    this.renderer = new THREE.WebGLRenderer({ 
      antialias: true,                       // Enable antialiasing
      alpha: true                            // Enable transparency
    });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    
    // Append the renderer's canvas to the DOM
    document.getElementById('app').appendChild(this.renderer.domElement);
    
    // Add basic lighting
    this.addLighting();
    
    // Add a simple test cube to confirm the scene is working
    this.addTestCube();
    
    // Set up event listeners
    window.addEventListener('resize', this.onWindowResize.bind(this));
    
    // Hide loading screen
    document.getElementById('loading').style.display = 'none';
    
    // Start the animation loop
    this.animate();
  }
  
  addLighting() {
    // Add ambient light for general illumination
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(ambientLight);
    
    // Add directional light for shadows and highlights
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(0, 10, 10);
    this.scene.add(directionalLight);
  }
  
  addTestCube() {
    // Create a simple cube to verify the scene is working
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshStandardMaterial({ 
      color: 0x00aaff,
      emissive: 0x003366,
      emissiveIntensity: 0.5,
      metalness: 0.3,
      roughness: 0.7
    });
    const cube = new THREE.Mesh(geometry, material);
    cube.position.set(0, 1.6, -3); // Position in front of the camera
    this.scene.add(cube);
    
    // Store reference to animate it
    this.testCube = cube;
  }
  
  onWindowResize() {
    // Update camera aspect ratio and renderer size when window is resized
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }
  
  animate() {
    // Animation loop
    requestAnimationFrame(this.animate.bind(this));
    
    // Animate test cube
    if (this.testCube) {
      this.testCube.rotation.x += 0.01;
      this.testCube.rotation.y += 0.01;
    }
    
    // Render the scene
    this.renderer.render(this.scene, this.camera);
  }
}

// Initialize the application when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new WarholJournalViz();
}); 