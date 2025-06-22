import logger from './logger';

// Save debouncer utility to prevent infinite loops
class SaveDebouncer {
  private static instance: SaveDebouncer;
  private saveTimeouts: Map<string, NodeJS.Timeout> = new Map();
  private savingFlags: Map<string, boolean> = new Map();
  private readonly defaultDelay = 300; // ms

  static getInstance(): SaveDebouncer {
    if (!SaveDebouncer.instance) {
      SaveDebouncer.instance = new SaveDebouncer();
    }
    return SaveDebouncer.instance;
  }

  // Debounced save function
  debouncedSave<T>(
    key: string,
    saveFunction: () => T,
    delay: number = this.defaultDelay
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      // Prevent recursive saves
      if (this.savingFlags.get(key)) {
        logger.debug(`SaveDebouncer: Save already in progress for ${key}, skipping`);
        resolve(false as T);
        return;
      }

      // Clear existing timeout
      const existingTimeout = this.saveTimeouts.get(key);
      if (existingTimeout) {
        clearTimeout(existingTimeout);
      }

      // Create new debounced save
      const timeout = setTimeout(async () => {
        try {
          this.savingFlags.set(key, true);
          logger.debug(`SaveDebouncer: Executing save for ${key}`);
          
          const result = await saveFunction();
          resolve(result);
        } catch (error) {
          logger.error(`SaveDebouncer: Error during save for ${key}`, { error });
          reject(error);
        } finally {
          this.savingFlags.set(key, false);
          this.saveTimeouts.delete(key);
        }
      }, delay);

      this.saveTimeouts.set(key, timeout);
    });
  }

  // Check if currently saving
  isSaving(key: string): boolean {
    return this.savingFlags.get(key) || false;
  }

  // Cancel pending save
  cancelSave(key: string): void {
    const timeout = this.saveTimeouts.get(key);
    if (timeout) {
      clearTimeout(timeout);
      this.saveTimeouts.delete(key);
      logger.debug(`SaveDebouncer: Cancelled save for ${key}`);
    }
  }

  // Clear all saves for cleanup
  clearAll(): void {
    this.saveTimeouts.forEach((timeout) => clearTimeout(timeout));
    this.saveTimeouts.clear();
    this.savingFlags.clear();
    logger.debug('SaveDebouncer: Cleared all pending saves');
  }

  // Get stats for debugging
  getStats() {
    return {
      pendingSaves: this.saveTimeouts.size,
      activeSaves: Array.from(this.savingFlags.entries()).filter(([_, saving]) => saving).length,
      totalRegistered: this.savingFlags.size
    };
  }
}

// Export singleton instance
export const saveDebouncer = SaveDebouncer.getInstance();

// Export convenience functions
export const debouncedSave = <T>(
  key: string,
  saveFunction: () => T,
  delay?: number
): Promise<T> => {
  return saveDebouncer.debouncedSave(key, saveFunction, delay);
};

export const isSaving = (key: string): boolean => {
  return saveDebouncer.isSaving(key);
};

export const cancelSave = (key: string): void => {
  return saveDebouncer.cancelSave(key);
}; 