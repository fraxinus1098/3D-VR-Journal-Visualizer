import * as THREE from 'three';
import { VRButton } from 'three/examples/jsm/webxr/VRButton.js';
import DataLoader from './utils/data-loader.js';
import EntryPanel from './components/EntryPanel.js';
import VRController from './controllers/VRController.js';
import DesktopControls from './controllers/DesktopControls.js';
import Minimap from './ui/Minimap.js';
import EmotionLegend from './ui/EmotionLegend.js';
import Notifications from './ui/Notifications.js';
import OrbVisualizer from './visualizers/OrbVisualizer.js';
import InteractionManager from './utils/InteractionManager.js';
import AudioSystem from './utils/AudioSystem.js';
import AudioControls from './ui/AudioControls.js';

/**
 * Main class for the WebXR application
 */
class WarholJournalViz {
  constructor() {
    // Core THREE.js components
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    
    // Controllers and interaction
    this.vrController = null;
    this.desktopControls = null;
    this.interactionManager = null;
    
    // Visualizers and UI components
    this.orbVisualizer = null;
    this.minimap = null;
    this.emotionLegend = null;
    this.entryPanel = null;
    this.notifications = null;
    this.audioControls = null;
    
    // Audio system
    this.audioSystem = null;
    this.audioInitialized = false;
    
    // Data management
    this.dataLoader = new DataLoader();
    this.journalEntries = [];
    
    // Initialize the application
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
    this.camera.position.set(0, 1.6, 3);     // Initial position at eye level
    
    // Create a renderer
    this.renderer = new THREE.WebGLRenderer({ 
      antialias: true,                       // Enable antialiasing
      alpha: true                            // Enable transparency
    });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.xr.enabled = true;         // Enable WebXR
    
    // Append the renderer's canvas to the DOM
    document.getElementById('app').appendChild(this.renderer.domElement);
    
    // Add VR button
    document.getElementById('app').appendChild(VRButton.createButton(this.renderer));
    
    // Set up notifications
    this.notifications = new Notifications();
    
    // Create audio system
    this.audioSystem = new AudioSystem();
    
    // Create audio controls (will be shown later)
    this.audioControls = new AudioControls(this.camera, this.scene, this.audioSystem);
    
    // Create orb visualizer
    this.orbVisualizer = new OrbVisualizer(this.scene);
    
    // Set up interaction manager
    this.interactionManager = new InteractionManager({
      visualizer: this.orbVisualizer,
      getInteractiveObjects: () => this.getInteractiveObjects(),
      onSelect: this.handleSelection.bind(this),
      onDeselect: this.handleDeselection.bind(this)
    });
    
    // Set up VR controllers
    this.vrController = new VRController(this.scene, this.renderer, this.camera, {
      onSelect: (object) => this.interactionManager.handleSelection(object),
      onRayIntersection: (controller, intersection, object) => {
        // Check for audio controls interaction
        if (this.audioControls && this.audioControls.visible) {
          const audioInteraction = this.audioControls.handleInteraction(intersection);
          if (audioInteraction) {
            return;
          }
        }
        
        if (this.entryPanel) {
          const interaction = this.entryPanel.checkInteraction(intersection);
          if (interaction) {
            this.handlePanelInteraction(interaction);
            return;
          }
        }
        this.interactionManager.handleHover(object);
      },
      getInteractiveObjects: () => this.getInteractiveObjects()
    });
    
    // Set up desktop controls
    this.desktopControls = new DesktopControls(this.camera, this.renderer.domElement, {
      onSelect: (intersection) => {
        // Check for audio controls interaction
        if (this.audioControls && this.audioControls.visible && intersection) {
          const audioInteraction = this.audioControls.handleInteraction(intersection);
          if (audioInteraction) {
            return;
          }
        }
        
        if (intersection && this.entryPanel) {
          const interaction = this.entryPanel.checkInteraction(intersection);
          if (interaction) {
            this.handlePanelInteraction(interaction);
            return;
          }
        }
        if (intersection) {
          this.interactionManager.handleSelection(intersection.object);
        } else {
          this.interactionManager.deselectObject();
        }
      },
      onHover: (intersection) => {
        // Check for audio controls interaction
        if (this.audioControls && this.audioControls.visible && intersection) {
          const audioObjects = [
            this.audioControls.muteButton,
            this.audioControls.sliderBackground,
            this.audioControls.sliderHandle
          ];
          
          if (intersection.object && audioObjects.includes(intersection.object)) {
            this.renderer.domElement.style.cursor = 'pointer';
            return;
          }
        }
        
        if (intersection && this.entryPanel) {
          const interaction = this.entryPanel.checkInteraction(intersection);
          if (interaction) {
            // Update cursor based on interaction type
            this.renderer.domElement.style.cursor = 'pointer';
            return;
          }
        }
        if (intersection) {
          this.interactionManager.handleHover(intersection.object);
          this.renderer.domElement.style.cursor = 'pointer';
        } else {
          this.interactionManager.handleHover(null);
          this.renderer.domElement.style.cursor = 'grab';
        }
      },
      getRaycaster: () => this.interactionManager.raycaster,
      getInteractiveObjects: () => this.getInteractiveObjects()
    });
    
    // Add basic lighting
    this.addLighting();
    
    // Add a simple test cube to confirm the scene is working
    this.addTestCube();
    
    // Initialize empty entry panel
    this.entryPanel = new EntryPanel({
      camera: this.camera,
      scene: this.scene
    });
    
    // Load data and create visualization
    this.loadData();
    
    // Set up event listeners
    window.addEventListener('resize', this.onWindowResize.bind(this));
    
    // Add audio initialization listener
    document.addEventListener('click', this.initAudioOnInteraction.bind(this), { once: true });
    document.addEventListener('keydown', this.initAudioOnInteraction.bind(this), { once: true });
    
    // Add keyboard controls for audio
    document.addEventListener('keydown', this.handleKeyboardShortcuts.bind(this));
    
    // Start the animation loop using the built-in WebXR animation loop
    this.renderer.setAnimationLoop(this.animate.bind(this));
  }
  
  /**
   * Initialize audio after first user interaction (required by browsers)
   */
  async initAudioOnInteraction() {
    if (this.audioInitialized) return;
    
    try {
      console.log('Initializing audio system after user interaction');
      await this.audioSystem.init();
      
      // Resume AudioContext if suspended
      if (this.audioSystem.audioContext.state === 'suspended') {
        console.log('AudioContext suspended - attempting to resume');
        await this.audioSystem.audioContext.resume();
      }
      
      // Calculate emotion centers first
      if (this.journalEntries && this.journalEntries.length > 0) {
        console.log('Calculating emotion centers for audio');
        this.audioSystem.calculateEmotionCenters(this.journalEntries);
      } else {
        console.warn('No journal entries available for emotion center calculation');
      }
      
      // Start playing all emotion sounds (initially at zero volume)
      console.log('Starting audio playback');
      this.audioSystem.playAllEmotionSounds();
      
      // Force an immediate audio mix update
      const cameraPosition = new THREE.Vector3();
      this.camera.getWorldPosition(cameraPosition);
      this.audioSystem.updateAudioMix(cameraPosition);
      
      // Show brief notification
      this.notifications.show('Audio system initialized. Press "A" to toggle audio controls.');
      
      // Show audio controls briefly
      if (this.audioControls) {
        this.audioControls.show();
        
        // Auto-hide after 5 seconds
        setTimeout(() => {
          this.audioControls.hide();
        }, 5000);
      }
      
      this.audioInitialized = true;
      
      // Add click handler for browsers that require click to start audio
      document.addEventListener('click', () => {
        if (this.audioSystem && this.audioSystem.audioContext.state === 'suspended') {
          console.log('Resuming suspended AudioContext after click');
          this.audioSystem.audioContext.resume().then(() => {
            console.log('AudioContext resumed successfully');
            this.audioSystem.playAllEmotionSounds();
          });
        }
      }, { once: true });
      
    } catch (error) {
      console.error('Failed to initialize audio:', error);
      this.notifications.show('Failed to initialize audio. Press "R" to retry.');
    }
  }
  
  /**
   * Handle keyboard shortcuts
   * @param {KeyboardEvent} event - The keyboard event
   */
  handleKeyboardShortcuts(event) {
    // 'A' key to toggle audio controls
    if (event.key.toLowerCase() === 'a') {
      if (this.audioControls) {
        this.audioControls.toggle();
      }
    }
    
    // 'M' key to toggle mute
    if (event.key.toLowerCase() === 'm') {
      if (this.audioSystem && this.audioInitialized) {
        const muted = this.audioSystem.toggleMute();
        this.notifications.show(`Audio ${muted ? 'muted' : 'unmuted'}`);
        
        if (this.audioControls) {
          this.audioControls.updateSpeakerIcon();
        }
      }
    }
    
    // 'R' key to retry audio initialization
    if (event.key.toLowerCase() === 'r' && !this.audioInitialized) {
      this.initAudioOnInteraction();
    }
    
    // 'D' key to toggle debug visualization
    if (event.key.toLowerCase() === 'd') {
      this.addAudioDebugElements();
      this.notifications.show('Added audio debug elements');
    }
    
    // '1-8' keys to play individual emotion sounds at max volume for testing
    if (this.audioSystem && this.audioInitialized && event.key >= '1' && event.key <= '8') {
      const index = parseInt(event.key) - 1;
      const emotions = ['joy', 'trust', 'fear', 'surprise', 'sadness', 'disgust', 'anger', 'anticipation'];
      
      if (index >= 0 && index < emotions.length) {
        const emotion = emotions[index];
        
        // Set all volumes to zero except the selected one
        Object.keys(this.audioSystem.emotionSounds).forEach(e => {
          if (this.audioSystem.emotionSounds[e] && this.audioSystem.emotionSounds[e].gain) {
            this.audioSystem.emotionSounds[e].gain.gain.value = (e === emotion) ? 0.8 : 0;
          }
        });
        
        this.notifications.show(`Playing only ${emotion} sound`);
      }
    }
    
    // '0' key to reset audio mix to distance-based
    if (this.audioSystem && this.audioInitialized && event.key === '0') {
      // Reset to normal distance-based mixing
      const cameraPosition = new THREE.Vector3();
      this.camera.getWorldPosition(cameraPosition);
      this.audioSystem.updateAudioMix(cameraPosition);
      this.notifications.show('Reset to normal audio mixing');
    }
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
    const geometry = new THREE.BoxGeometry(0.5, 0.5, 0.5);
    const material = new THREE.MeshStandardMaterial({ 
      color: 0x00ff00,
      emissive: 0x003300,
      emissiveIntensity: 0.5,
      metalness: 0.3,
      roughness: 0.7
    });
    this.testCube = new THREE.Mesh(geometry, material);
    this.testCube.position.set(0, 1.6, -2); // Position in front of the camera
    this.testCube.userData.interactive = true;
    this.testCube.userData.type = 'test-cube';
    this.scene.add(this.testCube);
  }
  
  onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    
    // Update minimap if it exists
    if (this.minimap) {
      this.minimap.onWindowResize();
    }
  }
  
  animate() {
    // Update VR controller
    if (this.vrController) {
      this.vrController.update();
    }
    
    // Update desktop controls
    if (this.desktopControls) {
      // Tell desktop controls if we're in VR mode
      this.desktopControls.setVRStatus(this.renderer.xr.isPresenting);
      this.desktopControls.update();
    }
    
    // Update orb visualizer
    if (this.orbVisualizer) {
      this.orbVisualizer.update();
    }
    
    // Update minimap
    if (this.minimap) {
      this.minimap.update();
    }
    
    // Update emotion legend position
    if (this.emotionLegend) {
      this.emotionLegend.updatePosition();
    }
    
    // Update entry panel position
    if (this.entryPanel) {
      this.entryPanel.updatePosition();
    }
    
    // Update audio controls position
    if (this.audioControls && this.audioControls.visible) {
      this.audioControls.updatePosition();
    }
    
    // Update audio mix based on camera position
    if (this.audioSystem && this.audioInitialized) {
      const cameraPosition = new THREE.Vector3();
      this.camera.getWorldPosition(cameraPosition);
      this.audioSystem.updateAudioMix(cameraPosition);
    }
    
    // Render the scene
    this.renderer.render(this.scene, this.camera);
  }
  
  /**
   * Get a list of all interactive objects in the scene
   * @returns {Array} Array of interactive objects
   */
  getInteractiveObjects() {
    const interactiveObjects = [];
    
    // Check the test cube if it exists
    if (this.testCube && this.testCube.userData.interactive) {
      interactiveObjects.push(this.testCube);
    }
    
    // Get orb objects
    if (this.orbVisualizer) {
      interactiveObjects.push(...this.orbVisualizer.getInteractiveObjects());
    }
    
    // Add panel interactive elements
    if (this.entryPanel) {
      if (this.entryPanel.closeButton) {
        interactiveObjects.push(this.entryPanel.closeButton);
      }
      if (this.entryPanel.scrollUpButton) {
        interactiveObjects.push(this.entryPanel.scrollUpButton);
      }
      if (this.entryPanel.scrollDownButton) {
        interactiveObjects.push(this.entryPanel.scrollDownButton);
      }
    }
    
    // Add audio control interactive elements
    if (this.audioControls && this.audioControls.visible) {
      if (this.audioControls.muteButton) {
        interactiveObjects.push(this.audioControls.muteButton);
      }
      if (this.audioControls.sliderBackground) {
        interactiveObjects.push(this.audioControls.sliderBackground);
      }
      if (this.audioControls.sliderHandle) {
        interactiveObjects.push(this.audioControls.sliderHandle);
      }
    }
    
    return interactiveObjects;
  }
  
  /**
   * Handle panel interaction (close, scroll)
   * @param {string} interaction - The interaction type
   */
  handlePanelInteraction(interaction) {
    if (!this.entryPanel) return;
    
    switch (interaction) {
      case 'close':
        this.entryPanel.hide();
        break;
      case 'scroll-up':
        this.entryPanel.scroll('up');
        break;
      case 'scroll-down':
        this.entryPanel.scroll('down');
        break;
    }
  }
  
  /**
   * Handle selection of an object
   * @param {Object} selectedObj - The selected object
   */
  handleSelection(selectedObj) {
    if (!selectedObj) return;
    
    // Play selection sound
    if (this.audioSystem && this.audioInitialized) {
      this.audioSystem.playSelectSound();
    }
    
    if (selectedObj.userData.type === 'journal-entry') {
      // Highlight related entries
      if (this.orbVisualizer) {
        this.orbVisualizer.highlightRelatedEntries(selectedObj);
      }
      
      // Display the entry panel
      if (this.entryPanel) {
        this.entryPanel.showEntry(selectedObj.userData.entry);
      }
      
      // Show brief notification
      const date = selectedObj.userData.entry.date ? 
                  new Date(selectedObj.userData.entry.date).toLocaleDateString() : 'Unknown date';
      this.notifications.show(`Selected: ${date}`);
    } else if (selectedObj.userData.type === 'test-cube') {
      console.log('Selected test cube');
      this.notifications.show('Test cube selected!');
    }
  }
  
  /**
   * Handle deselection of an object
   * @param {Object} deselectedObj - The deselected object
   */
  handleDeselection(deselectedObj) {
    // Clean up related entry highlighting
    if (this.orbVisualizer) {
      this.orbVisualizer.cleanupRelatedEntries();
    }
    
    // Hide the entry panel
    if (this.entryPanel) {
      this.entryPanel.hide();
    }
  }
  
  /**
   * Load journal data and create visualization
   */
  async loadData() {
    try {
      document.getElementById('loading').style.display = 'block';
      document.getElementById('loading-text').textContent = 'Loading journal data...';
      
      // First try to load the full dataset
      try {
        console.log('Attempting to load the complete dataset...');
        const data = await this.dataLoader.loadData('/data/warhol_final.json');
        this.journalEntries = data.entries;
        console.log(`Successfully loaded ${this.journalEntries.length} entries`);
      } catch (mainDataError) {
        console.error('Error loading complete dataset:', mainDataError);
        
        // Fall back to the sample dataset
        document.getElementById('loading-text').textContent = 'Loading sample dataset instead...';
        console.log('Falling back to sample dataset...');
        
        try {
          const sampleData = await this.dataLoader.loadData('/data/sample.json');
          this.journalEntries = sampleData.entries;
          console.log(`Successfully loaded ${this.journalEntries.length} sample entries`);
          
          // Show a notification that we're using sample data
          this.notifications.show('Using sample dataset - full dataset could not be loaded.');
        } catch (sampleDataError) {
          console.error('Error loading sample dataset:', sampleDataError);
          throw new Error('Failed to load both main and sample datasets');
        }
      }
      
      // Create visualization once data is loaded
      this.createVisualization();
      
      document.getElementById('loading').style.display = 'none';
    } catch (error) {
      console.error('Error loading data:', error);
      document.getElementById('loading-text').textContent = 'Error loading data. Please refresh and try again.';
      
      // Create a more detailed error message
      const errorDetails = document.createElement('div');
      errorDetails.style.fontSize = '14px';
      errorDetails.style.marginTop = '10px';
      errorDetails.style.maxWidth = '80%';
      errorDetails.textContent = `Technical details: ${error.message}`;
      document.getElementById('loading').appendChild(errorDetails);
      
      // Add a reload button
      const reloadButton = document.createElement('button');
      reloadButton.textContent = 'Reload Page';
      reloadButton.style.marginTop = '20px';
      reloadButton.style.padding = '10px 20px';
      reloadButton.style.fontSize = '16px';
      reloadButton.style.cursor = 'pointer';
      reloadButton.addEventListener('click', () => window.location.reload());
      document.getElementById('loading').appendChild(reloadButton);
    }
  }
  
  /**
   * Create the 3D visualization of journal entries
   */
  createVisualization() {
    if (!this.journalEntries || this.journalEntries.length === 0) {
      console.warn('No journal entries to visualize');
      return;
    }
    
    // Create orbs with the visualizer
    const orbStats = this.orbVisualizer.createOrbs(this.journalEntries);
    
    // Position camera based on orb statistics
    if (orbStats.avgPosition) {
      const { x, y, z } = orbStats.avgPosition;
      this.camera.position.set(x, y + 1.6, z + 5); // Position camera near the center with some offset
      this.camera.lookAt(x, y, z);
      console.log(`Positioned camera at: ${x.toFixed(2)}, ${(y + 1.6).toFixed(2)}, ${(z + 5).toFixed(2)}`);
    }
    
    // Set up minimap with proper Y range
    this.minimap = new Minimap(this.camera, this.scene, {
      yRangeMin: orbStats.yRange.min - 2,
      yRangeMax: orbStats.yRange.max + 2
    });
    
    // Add data points to minimap
    this.journalEntries.forEach(entry => {
      const emotionColor = this.orbVisualizer.blendEmotionColors(entry.emotions);
      this.minimap.addPoint(
        entry.coordinates.x,
        entry.coordinates.z,
        {
          y: entry.coordinates.y,
          color: emotionColor,
          showHeight: true
        }
      );
    });
    
    // Set up emotion legend
    this.emotionLegend = new EmotionLegend(this.camera, this.scene);
    
    // Set up audio emotion centers if audio system is available 
    // NOTE: This is now done in initAudioOnInteraction to ensure proper initialization order
    
    // Hide test cube if it exists
    if (this.testCube) {
      this.testCube.visible = false;
    }
    
    // Add some debug elements for testing audio
    this.addAudioDebugElements();
  }
  
  /**
   * Add debug elements to help with audio testing
   */
  addAudioDebugElements() {
    // Add emotion center spheres to visualize audio positions
    if (this.audioSystem && Object.keys(this.audioSystem.emotionCenters).length > 0) {
      const emotionColors = {
        'joy': 0xFFFF00, // Yellow
        'trust': 0x00FF00, // Green
        'fear': 0xFF00FF, // Magenta
        'surprise': 0x00FFFF, // Cyan
        'sadness': 0x0000FF, // Blue
        'disgust': 0xFF00AA, // Pink
        'anger': 0xFF0000, // Red
        'anticipation': 0xFF8800 // Orange
      };
      
      Object.entries(this.audioSystem.emotionCenters).forEach(([emotion, position]) => {
        const geometry = new THREE.SphereGeometry(0.5, 16, 16);
        const material = new THREE.MeshBasicMaterial({ 
          color: emotionColors[emotion] || 0xFFFFFF,
          transparent: true,
          opacity: 0.5,
          wireframe: true
        });
        
        const sphere = new THREE.Mesh(geometry, material);
        sphere.position.copy(position);
        
        // Add text label
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 128;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '24px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(emotion, 128, 64);
        
        const texture = new THREE.CanvasTexture(canvas);
        const labelGeometry = new THREE.PlaneGeometry(2, 1);
        const labelMaterial = new THREE.MeshBasicMaterial({ 
          map: texture, 
          transparent: true,
          depthTest: false,
          side: THREE.DoubleSide
        });
        
        const label = new THREE.Mesh(labelGeometry, labelMaterial);
        label.position.set(0, 1.0, 0);
        
        sphere.add(label);
        this.scene.add(sphere);
        
        console.log(`Added debug marker for ${emotion} at ${position.x.toFixed(2)}, ${position.y.toFixed(2)}, ${position.z.toFixed(2)}`);
      });
    }
  }
}

// Initialize the application when the DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new WarholJournalViz();
}); 