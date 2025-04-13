import * as THREE from 'three';

/**
 * Manages UI state changes triggered by keyboard shortcuts.
 */
class UIManager {
  /**
   * @param {Object} options - Configuration options
   * @param {AudioControls | null} options.audioControls - Reference to AudioControls instance
   * @param {Minimap | null} options.minimap - Reference to Minimap instance
   * @param {EmotionLegend | null} options.emotionLegend - Reference to EmotionLegend instance
   * @param {PerformanceOptimizer | null} options.performanceOptimizer - Reference to PerformanceOptimizer instance
   * @param {PerformanceMonitor} options.performanceMonitor - Reference to PerformanceMonitor instance
   * @param {Notifications} options.notifications - Reference to Notifications instance
   * @param {AudioSystem} options.audioSystem - Reference to AudioSystem instance
   * @param {THREE.WebGLRenderer} options.renderer - Reference to the main renderer
   * @param {THREE.Scene} options.scene - Reference to the main scene
   * @param {THREE.Camera} options.camera - Reference to the main camera
   */
  constructor({ 
    audioControls, minimap, emotionLegend, performanceOptimizer, 
    performanceMonitor, notifications, audioSystem, renderer, scene, camera 
  }) {
    this.audioControls = audioControls;
    this.minimap = minimap;
    this.emotionLegend = emotionLegend;
    this.performanceOptimizer = performanceOptimizer;
    this.performanceMonitor = performanceMonitor;
    this.notifications = notifications;
    this.audioSystem = audioSystem;
    this.renderer = renderer; // Needed for forcing render updates on toggle
    this.scene = scene;       // Needed for forcing render updates on toggle
    this.camera = camera;     // Needed for forcing render updates on toggle
  }

  /**
   * Handle keyboard shortcuts related to UI elements.
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
            const isVisible = this.minimap.toggle();
            this.notifications.show(isVisible ? 'Minimap visible' : 'Minimap hidden');
            // Force a single render update to properly show/hide minimap
            if (this.renderer && this.scene && this.camera) {
                this.renderer.render(this.scene, this.camera);
            }
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
            const isVisible = this.emotionLegend.toggle();
            this.notifications.show(isVisible ? 'Emotion legend visible' : 'Emotion legend hidden');
            // Force a single render update to properly show/hide
            if (this.renderer && this.scene && this.camera) {
                this.renderer.render(this.scene, this.camera);
            }
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
}

export default UIManager; 