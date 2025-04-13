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
import PerformanceOptimizer from './utils/PerformanceOptimizer.js';
import PerformanceMonitor from './ui/PerformanceMonitor.js';

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
    
    // Performance optimization
    this.performanceOptimizer = null;
    this.performanceMonitor = null;
    
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
    
    // Create performance monitor
    this.performanceMonitor = new PerformanceMonitor({
      updateInterval: 1000,
      avgSamples: 30,
      showPanel: true
    });
    
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
      this.notifications.show('Audio system initialized. Press "T" to toggle audio controls, "I" to mute/unmute.');
      
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
   * @param {KeyboardEvent} event - Keyboard event
   */
  handleKeyboardShortcuts(event) {
    // Skip if inside a text input
    if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
      return;
    }
    
    switch(event.key.toLowerCase()) {
      // Toggle audio controls with 't' key (t for tune/audio)
      case 't':
        if (this.audioControls) {
          this.audioControls.visible ? this.audioControls.hide() : this.audioControls.show();
          if (this.audioControls.visible) {
            this.notifications.show('Audio controls visible. Press T to hide.');
          }
        }
        break;
      
      // Toggle minimap with 'm' key
      case 'm':
        if (this.minimap) {
          try {
            // Add extra error handling when toggling minimap
            const isVisible = this.minimap.toggle();
            this.notifications.show(isVisible ? 'Minimap visible' : 'Minimap hidden');
            
            // Force a single render update to properly show/hide minimap
            this.renderer.render(this.scene, this.camera);
          } catch (error) {
            console.error('Error toggling minimap:', error);
            this.notifications.show('Error toggling minimap');
          }
        }
        break;
      
      // Toggle emotion legend with 'e' key
      case 'e':
        if (this.emotionLegend) {
          try {
            // Add extra error handling when toggling emotion legend
            const isVisible = this.emotionLegend.toggle();
            this.notifications.show(isVisible ? 'Emotion legend visible' : 'Emotion legend hidden');
            
            // Force a single render update to properly show/hide
            this.renderer.render(this.scene, this.camera);
          } catch (error) {
            console.error('Error toggling emotion legend:', error);
            this.notifications.show('Error toggling emotion legend');
          }
        }
        break;
      
      // Toggle performance optimizations with 'p' key
      case 'p':
        if (this.performanceOptimizer) {
          if (this.performanceOptimizer.isEnabled) {
            this.performanceOptimizer.disable();
            this.notifications.show('Performance optimizations disabled. Press P to enable.');
          } else {
            this.performanceOptimizer.enable();
            this.notifications.show('Performance optimizations enabled. Press P to disable.');
          }
        }
        break;
      
      // Toggle performance monitor with 'f' key
      case 'f':
        if (this.performanceMonitor) {
          this.performanceMonitor.toggle();
          this.notifications.show('Performance monitor toggled.');
        }
        break;
      
      // Toggle audio mute with 'i' key (instead of space)
      case 'i':
        if (this.audioSystem) {
          this.audioSystem.toggleMute();
          if (this.audioControls) {
            this.audioControls.updateMuteButton();
          }
          this.notifications.show(this.audioSystem.muted ? 'Audio muted' : 'Audio unmuted');
        }
        break;
    }
  }
  
  addLighting() {
    // Ambient light for base illumination
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
    this.scene.add(ambientLight);
    
    // Directional light for shadows and highlights
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.7);
    directionalLight.position.set(1, 1, 1).normalize();
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
  
  animate(timestamp) {
    // Start performance monitoring for this frame
    if (this.performanceMonitor) {
      this.performanceMonitor.begin();
    }
    
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
    
    // Get camera position for audio and other position-based features
    const cameraPosition = new THREE.Vector3();
    this.camera.getWorldPosition(cameraPosition);
    
    // Update audio system
    if (this.audioSystem && this.audioSystem.audioContext && this.audioSystem.audioContext.state === 'running') {
      this.audioSystem.updateAudioMix(cameraPosition);
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
    
    // Update performance optimizer
    if (this.performanceOptimizer) {
      this.performanceOptimizer.update();
    }
    
    // Render the scene
    this.renderer.render(this.scene, this.camera);
    
    // End performance monitoring for this frame
    if (this.performanceMonitor && this.performanceOptimizer) {
      this.performanceMonitor.end(
        this.performanceOptimizer.visibleCount,
        this.performanceOptimizer.culledCount,
        this.performanceOptimizer.isEnabled
      );
    }
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
    if (!selectedObj) {
      console.log('handleSelection called with null object');
      return;
    }
    
    console.log('Selected object:', selectedObj.uuid, 'Type:', selectedObj.userData?.type);
    
    // First, completely disable performance optimization if it's enabled
    if (this.performanceOptimizer && this.performanceOptimizer.isEnabled) {
      console.log('Temporarily disabling performance optimization for selection');
      this.performanceOptimizer.temporarilyDisable();
      
      // Force a render cycle to ensure all objects are properly restored
      this.renderer.render(this.scene, this.camera);
    }
    
    // Play selection sound
    if (this.audioSystem && this.audioInitialized) {
      this.audioSystem.playSelectSound();
    }
    
    if (selectedObj.userData && selectedObj.userData.type === 'journal-entry') {
      console.log('Journal entry selected:', selectedObj.userData.entry?.id);
      
      // Ensure we have valid entry data
      if (!selectedObj.userData.entry) {
        console.warn('Selected orb has no entry data');
        this.notifications.show('Error: Selected orb has no entry data');
        return;
      }
      
      try {
        // Explicitly mark the object as selected (for the performance optimizer)
        selectedObj.userData.selected = true;
        
        // Highlight related entries
        if (this.orbVisualizer) {
          this.orbVisualizer.highlightRelatedEntries(selectedObj);
        }
        
        // Use a timeout to ensure rendering has fully completed before showing the panel
        setTimeout(() => {
          try {
            // Display the entry panel with error handling
            if (this.entryPanel) {
              const entry = selectedObj.userData.entry;
              // Validate entry data before showing
              if (!entry.text) {
                console.warn('Entry is missing text content:', entry);
                this.notifications.show('Error: Entry is missing text content');
                return;
              }
              
              // Clone the entry data to avoid any reference issues
              const entryCopy = this.cloneEntryData(entry);
              this.entryPanel.showEntry(entryCopy);
            }
            
            // Show brief notification
            const date = selectedObj.userData.entry.date ? 
                        new Date(selectedObj.userData.entry.date).toLocaleDateString() : 'Unknown date';
            this.notifications.show(`Selected: ${date}`);
          } catch (error) {
            console.error('Error displaying entry panel:', error);
            this.notifications.show('Error displaying entry. Try another one.');
            
            // Cleanup in case of error
            if (this.entryPanel && this.entryPanel.isVisible()) {
              this.entryPanel.hide();
            }
          }
        }, 50); // Small timeout to ensure state is fully updated
        
      } catch (error) {
        console.error('Error in entry selection handling:', error);
        this.notifications.show('Error selecting entry. Please try another one.');
      }
    } else if (selectedObj.userData && selectedObj.userData.type === 'test-cube') {
      console.log('Selected test cube');
      this.notifications.show('Test cube selected!');
    } else {
      console.log('Selected object with unknown type:', selectedObj.userData?.type);
    }
  }
  
  /**
   * Create a safe clone of entry data to avoid reference issues
   * @param {Object} entry - The original entry data
   * @returns {Object} A clone of the entry
   */
  cloneEntryData(entry) {
    try {
      const cloned = {
        id: entry.id,
        date: entry.date,
        text: entry.text,
        location: entry.location,
        topics: Array.isArray(entry.topics) ? [...entry.topics] : [],
        emotions: entry.emotions ? {...entry.emotions} : {},
        entities: {}
      };
      
      // Clone entities if they exist
      if (entry.entities) {
        cloned.entities = {};
        if (Array.isArray(entry.entities.people)) cloned.entities.people = [...entry.entities.people];
        if (Array.isArray(entry.entities.places)) cloned.entities.places = [...entry.entities.places];
      }
      
      // Copy coordinates but don't include in panel display
      if (entry.coordinates) {
        cloned.coordinates = {...entry.coordinates};
      }
      
      // Copy related entries array but don't include in panel display
      if (Array.isArray(entry.relatedEntries)) {
        cloned.relatedEntries = [...entry.relatedEntries];
      }
      
      return cloned;
    } catch (error) {
      console.error('Error cloning entry data:', error);
      // Return the original if cloning fails
      return entry;
    }
  }
  
  /**
   * Handle deselection of an object
   * @param {Object} deselectedObj - The deselected object
   */
  handleDeselection(deselectedObj) {
    // Clear selected flag if present
    if (deselectedObj && deselectedObj.userData) {
      deselectedObj.userData.selected = false;
    }
    
    // Clean up related entry highlighting
    if (this.orbVisualizer) {
      this.orbVisualizer.cleanupRelatedEntries();
    }
    
    // Hide the entry panel
    if (this.entryPanel) {
      this.entryPanel.hide();
    }
    
    // Resume performance optimizations if they were temporarily disabled
    if (this.performanceOptimizer && this.performanceOptimizer.temporarilyDisabled) {
      // Use a timeout to ensure all cleanup is complete
      setTimeout(() => {
        console.log('Resuming performance optimizations after deselection');
        this.performanceOptimizer.resumeOptimizations();
      }, 100);
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
    
    // Create minimap with proper Y range
    this.minimap = new Minimap(this.camera, this.scene, {
      yRangeMin: orbStats.yRange ? orbStats.yRange.min - 2 : -10,
      yRangeMax: orbStats.yRange ? orbStats.yRange.max + 2 : 30
    });
    console.log('Minimap created');
    
    // Add data points to minimap
    if (this.minimap && this.journalEntries) {
      this.journalEntries.forEach(entry => {
        if (entry.coordinates) {
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
        }
      });
    }
    
    // Create emotion legend
    this.emotionLegend = new EmotionLegend(this.camera, this.scene, {
      colorMap: this.orbVisualizer.emotionColorsRGB
    });
    console.log('Emotion legend created');
    
    // Set up audio emotion centers if audio system is available 
    if (this.audioSystem && this.audioSystem.audioContext) {
      this.audioSystem.calculateEmotionCenters(this.journalEntries);
    }
    
    // Hide test cube if it exists
    if (this.testCube) {
      this.testCube.visible = false;
    }
    
    // Add some debug elements for testing audio
    this.addAudioDebugElements();
    
    // Initialize performance optimizer
    this.initPerformanceOptimizer();
    
    // Show welcome notification
    this.notifications.show('Warhol Journal Visualization loaded. Click/press to select entries.');
  }
  
  /**
   * Initialize the performance optimizer
   */
  initPerformanceOptimizer() {
    // Create performance optimizer
    this.performanceOptimizer = new PerformanceOptimizer({
      cullingDistance: 20,
      updateFrequency: 5,
      lodDistances: [5, 10, 20],
      lodDetailLevels: [16, 12, 8, 4],
      lodMaterialSimplify: true,
      debug: false
    });
    
    // Get all orbs to optimize
    const orbsToOptimize = [];
    if (this.orbVisualizer) {
      // Add all orbs from orbVisualizer
      this.orbVisualizer.orbObjects.forEach((orb) => {
        orbsToOptimize.push(orb);
      });
    }
    
    // Initialize with orbs and camera
    this.performanceOptimizer.init(orbsToOptimize, this.camera);
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
  
  /**
   * Clean up and dispose resources when application is closed
   */
  dispose() {
    // Dispose visualizer resources
    if (this.orbVisualizer) {
      this.orbVisualizer.dispose();
    }
    
    // Dispose UI components
    if (this.minimap) this.minimap.dispose();
    if (this.emotionLegend) this.emotionLegend.dispose();
    if (this.entryPanel) this.entryPanel.dispose();
    if (this.notifications) this.notifications.dispose();
    if (this.audioControls) this.audioControls.dispose();
    if (this.performanceMonitor) this.performanceMonitor.dispose();
    
    // Dispose controllers
    if (this.vrController) this.vrController.dispose();
    if (this.desktopControls) this.desktopControls.dispose();
    
    // Dispose interaction manager
    if (this.interactionManager) this.interactionManager.dispose();
    
    // Dispose audio system
    if (this.audioSystem) this.audioSystem.dispose();
    
    // Dispose performance optimizer
    if (this.performanceOptimizer) {
      this.performanceOptimizer.dispose();
    }
    
    // Stop animation loop
    this.renderer.setAnimationLoop(null);
    
    // Remove event listeners
    window.removeEventListener('resize', this.onWindowResize.bind(this));
    
    // Dispose scene and renderer
    this.scene.traverse(object => {
      if (object.geometry) object.geometry.dispose();
      if (object.material) {
        if (Array.isArray(object.material)) {
          object.material.forEach(material => material.dispose());
        } else {
          object.material.dispose();
        }
      }
    });
    
    this.renderer.dispose();
  }
}

// Initialize the application when the DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new WarholJournalViz();
}); 