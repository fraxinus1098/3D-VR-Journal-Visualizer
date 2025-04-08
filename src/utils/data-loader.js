/**
 * Utility for loading and processing the journal data
 */
export default class DataLoader {
  constructor() {
    this.data = null;
  }

  /**
   * Load the journal data from a JSON file
   * @param {string} url - URL to the JSON data file
   * @returns {Promise} - Promise that resolves with the processed data
   */
  async loadData(url) {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to load data: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      this.data = data;
      
      console.log(`Loaded ${data.entries?.length || 0} journal entries`);
      return this.data;
    } catch (error) {
      console.error('Error loading journal data:', error);
      throw error;
    }
  }

  /**
   * Get all loaded entries
   * @returns {Array} - Array of entry objects or empty array if not loaded
   */
  getEntries() {
    return this.data?.entries || [];
  }
} 