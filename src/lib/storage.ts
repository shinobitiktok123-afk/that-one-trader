
export interface StorageService {
  loadData: <T>(key: string) => T | null;
  saveData: <T>(key: string, data: T) => void;
}

// Development-only local storage service
class LocalStorageService implements StorageService {
  loadData<T>(key: string): T | null {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      console.error(`Error loading ${key} from localStorage`, e);
      return null;
    }
  }

  saveData<T>(key: string, data: T): void {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
      console.error(`Error saving ${key} to localStorage`, e);
    }
  }
}

export const storage: StorageService = new LocalStorageService();
