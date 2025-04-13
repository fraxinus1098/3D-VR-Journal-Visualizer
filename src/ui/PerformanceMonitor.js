import * as THREE from 'three';

/**
 * Simple performance monitor to display FPS and other metrics
 */
export default class PerformanceMonitor {
  constructor(options = {}) {
    // Configuration options with defaults
    this.options = Object.assign({
      updateInterval: 1000, // Update interval in ms
      avgSamples: 60,      // Number of samples for moving average
      showPanel: true      // Whether to show the panel
    }, options);
    
    // Performance metrics
    this.fps = 0;
    this.frameTime = 0;
    this.visibleObjects = 0;
    this.culledObjects = 0;
    
    // Frame timing
    this.lastTime = 0;
    this.frames = 0;
    this.lastUpdateTime = 0;
    
    // History for moving averages
    this.fpsHistory = [];
    this.frameTimeHistory = [];
    
    // DOM elements
    this.container = null;
    this.fpsText = null;
    this.objectsText = null;
    this.optimizationText = null;
    
    // Create panel
    this.createPanel();
    
    // Show/hide based on initial option
    if (!this.options.showPanel) {
      this.hide();
    }
  }
  
  /**
   * Create the performance panel in the DOM
   */
  createPanel() {
    // Create container
    this.container = document.createElement('div');
    this.container.className = 'performance-monitor';
    this.container.style.position = 'fixed';
    this.container.style.bottom = '10px';
    this.container.style.left = '10px';
    this.container.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    this.container.style.color = 'white';
    this.container.style.padding = '10px';
    this.container.style.borderRadius = '5px';
    this.container.style.fontFamily = 'monospace';
    this.container.style.fontSize = '12px';
    this.container.style.zIndex = '1000';
    this.container.style.pointerEvents = 'none'; // Allow clicks to pass through
    
    // FPS display
    this.fpsText = document.createElement('div');
    this.fpsText.textContent = 'FPS: --';
    this.container.appendChild(this.fpsText);
    
    // Objects count display
    this.objectsText = document.createElement('div');
    this.objectsText.textContent = 'Objects: -- / --';
    this.container.appendChild(this.objectsText);
    
    // Optimization status
    this.optimizationText = document.createElement('div');
    this.optimizationText.textContent = 'Optimizations: --';
    this.container.appendChild(this.optimizationText);
    
    // Append to DOM
    document.body.appendChild(this.container);
  }
  
  /**
   * Begin performance monitoring for a frame
   */
  begin() {
    // Get current time
    this.lastTime = performance.now();
  }
  
  /**
   * End performance monitoring for a frame
   * @param {number} visibleObjects - Number of visible objects
   * @param {number} culledObjects - Number of culled objects
   * @param {boolean} optimizationsEnabled - Whether performance optimizations are enabled
   */
  end(visibleObjects, culledObjects, optimizationsEnabled) {
    // Calculate frame time
    const now = performance.now();
    const frameTime = now - this.lastTime;
    
    // Update frame time history
    this.frameTimeHistory.push(frameTime);
    if (this.frameTimeHistory.length > this.options.avgSamples) {
      this.frameTimeHistory.shift();
    }
    
    // Calculate average frame time
    this.frameTime = this.frameTimeHistory.reduce((a, b) => a + b, 0) / this.frameTimeHistory.length;
    
    // Count frames
    this.frames++;
    
    // Update metrics at specified interval
    if (now - this.lastUpdateTime > this.options.updateInterval) {
      // Calculate FPS
      this.fps = Math.round((this.frames * 1000) / (now - this.lastUpdateTime));
      
      // Update FPS history
      this.fpsHistory.push(this.fps);
      if (this.fpsHistory.length > this.options.avgSamples) {
        this.fpsHistory.shift();
      }
      
      // Store visible/culled objects
      this.visibleObjects = visibleObjects;
      this.culledObjects = culledObjects;
      
      // Update display
      this.updateDisplay(optimizationsEnabled);
      
      // Reset counters
      this.frames = 0;
      this.lastUpdateTime = now;
    }
  }
  
  /**
   * Update the display with current metrics
   * @param {boolean} optimizationsEnabled - Whether performance optimizations are enabled
   */
  updateDisplay(optimizationsEnabled) {
    if (!this.container) return;
    
    // Calculate average FPS
    const avgFps = Math.round(
      this.fpsHistory.reduce((a, b) => a + b, 0) / this.fpsHistory.length
    );
    
    // Update FPS text with current and average
    this.fpsText.textContent = `FPS: ${this.fps} (avg: ${avgFps}) - ${Math.round(this.frameTime)}ms`;
    
    // Update objects text
    this.objectsText.textContent = `Objects: ${this.visibleObjects} visible / ${this.culledObjects} culled`;
    
    // Update optimization status
    const optStatus = optimizationsEnabled ? 'ENABLED' : 'DISABLED';
    const optColor = optimizationsEnabled ? '#8f8' : '#f88';
    this.optimizationText.innerHTML = `Optimizations: <span style="color: ${optColor}">${optStatus}</span> (Press P to toggle)`;
  }
  
  /**
   * Show the performance monitor
   */
  show() {
    if (this.container) {
      this.container.style.display = 'block';
    }
  }
  
  /**
   * Hide the performance monitor
   */
  hide() {
    if (this.container) {
      this.container.style.display = 'none';
    }
  }
  
  /**
   * Toggle visibility of the performance monitor
   */
  toggle() {
    if (this.container) {
      if (this.container.style.display === 'none') {
        this.show();
      } else {
        this.hide();
      }
    }
  }
  
  /**
   * Clean up resources
   */
  dispose() {
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
    
    this.container = null;
    this.fpsText = null;
    this.objectsText = null;
    this.optimizationText = null;
    
    this.fpsHistory = [];
    this.frameTimeHistory = [];
  }
} 