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
      console.log(`Attempting to load data from: ${url}`);
      
      // Add a timeout for fetch operations
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout
      
      const response = await fetch(url, { 
        signal: controller.signal,
        headers: {
          'Accept': 'application/json'
        }
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`Failed to load data: ${response.status} ${response.statusText}`);
      }
      
      console.log('Response received, starting JSON parsing...');
      
      // For very large files, we can use the streaming approach
      // but for now we'll try with the standard JSON parsing
      try {
        const data = await response.json();
        this.data = data;
        
        console.log(`Successfully loaded ${data.entries?.length || 0} journal entries`);
        
        // Basic validation to ensure the data structure is correct
        if (!data.entries || !Array.isArray(data.entries)) {
          throw new Error('Invalid data format: missing entries array');
        }
        
        // Check if entries have necessary properties
        if (data.entries.length > 0) {
          const firstEntry = data.entries[0];
          if (!firstEntry.id || !firstEntry.coordinates) {
            console.warn('Entry data may be incomplete - missing required fields');
          }
        }
        
        return this.data;
      } catch (parseError) {
        console.error('JSON parsing error:', parseError);
        
        // Try loading a smaller sample file as fallback
        console.log('Attempting to load sample data instead...');
        const sampleUrl = url.replace('warhol_final.json', 'sample.json');
        const sampleResponse = await fetch(sampleUrl);
        if (sampleResponse.ok) {
          const sampleData = await sampleResponse.json();
          this.data = sampleData;
          console.log(`Loaded ${sampleData.entries?.length || 0} sample entries as fallback`);
          return this.data;
        } else {
          throw new Error('Could not load main data or sample data');
        }
      }
    } catch (error) {
      console.error('Error loading journal data:', error);
      
      if (error.name === 'AbortError') {
        console.error('Request timed out. The file might be too large.');
      }
      
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